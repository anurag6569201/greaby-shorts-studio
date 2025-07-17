import time
import requests
import logging
import ffmpeg
import json
from celery import shared_task
from celery.exceptions import Retry
from django.conf import settings
from django.db import transaction
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from billing.models import CreditUsage
from greaby_project.storages import SourceMediaStorage
from .models import VideoTranslation
from .services import calculate_translation_cost
from greaby_project.email_utils import send_template_email

logger = logging.getLogger(__name__)

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def send_video_translation_update(user_id, translation_id, message, status):
    """Sends real-time updates to the frontend via WebSockets."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{user_id}',
            {
                'type': 'send_notification',
                'message': {
                    'event': 'translation_progress',
                    'creation_type': 'translation',
                    'creation_id': str(translation_id),
                    'status_message': message,
                    'status': status,
                }
            }
        )
    except Exception as e:
        logger.error(f"Failed to send websocket update for translation {translation_id}: {e}")

def get_video_duration(file_path):
    """Gets video duration using ffmpeg-python in a safe way."""
    try:
        probe = ffmpeg.probe(file_path, v="error")
        return float(probe['format']['duration'])
    except ffmpeg.Error as e:
        logger.error(f"ffmpeg error getting duration for {file_path}: {e.stderr.decode('utf-8') if e.stderr else 'No stderr'}")
        raise ValueError("Could not read video file. It may be corrupt or unsupported.")
    except (KeyError, IndexError):
        raise ValueError("Could not find duration information in the video format.")

def generate_sas_url(blob_name):
    """Generates a read-access SAS URL for an Azure blob for a limited time."""
    storage = SourceMediaStorage()
    return f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net/{storage.azure_container}/{blob_name}?{generate_blob_sas(account_name=settings.AZURE_ACCOUNT_NAME, container_name=storage.azure_container, blob_name=blob_name, account_key=settings.AZURE_ACCOUNT_KEY, permission=BlobSasPermissions(read=True), expiry=datetime.utcnow() + timedelta(hours=24))}"

def _handle_failure_and_refund(translation_id: str, error_message: str):
    """Centralized function to handle failures, refund credits, and notify the user."""
    logger.error(f"Handling failure for translation {translation_id}. Error: {error_message}")
    try:
        with transaction.atomic():
            translation = VideoTranslation.objects.select_for_update().get(id=translation_id)
            if translation.status == VideoTranslation.Status.FAILED:
                return
            user = translation.user
            if translation.credit_cost and translation.credit_cost > 0:
                user.credit_balance += translation.credit_cost
                user.save(update_fields=['credit_balance'])
                logger.info(f"Refunded {translation.credit_cost} credits to {user.email} for translation {translation.id}.")
            translation.status = VideoTranslation.Status.FAILED
            translation.error_message = error_message
            translation.credit_cost = None
            translation.save(update_fields=['status', 'error_message', 'credit_cost'])
        send_video_translation_update(user.id, str(translation.id), "Failed", 'failed')
        email_context = {
            'creation_type': 'Translation', 'prompt': translation.title, 'error': error_message, 
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=Video Dub"
        }
        send_template_email("Your Translation Failed", "emails/generation_failed.html", email_context, [user.email])
    except VideoTranslation.DoesNotExist:
        logger.error(f"Could not find translation {translation_id} to handle failure.")
    except Exception as e:
        logger.critical(f"CRITICAL: An error occurred within the failure handler for {translation_id}. DB may be inconsistent. Error: {e}")

# ==============================================================================
# CELERY TASKS
# ==============================================================================

@shared_task(bind=True, acks_late=True, max_retries=240, default_retry_delay=60)
def check_azure_translation_status(self, translation_id: str):
    """Polls Azure for the status of a translation job. Retries itself until a final state is reached."""
    logger.info(f"Checking iteration status for translation {translation_id}. Attempt {self.request.retries + 1}.")
    try:
        translation = VideoTranslation.objects.get(id=translation_id, status=VideoTranslation.Status.PROCESSING)
    except VideoTranslation.DoesNotExist:
        logger.warning(f"Polling task stopped: Translation {translation_id} not found or no longer 'processing'.")
        return

    API_VERSION = "2024-05-20-preview"
    base_endpoint = settings.AZURE_VIDEO_TRANSLATION_ENDPOINT.rstrip('/')
    azure_translation_id = str(translation.azure_translation_id)
    iteration_id = "iteration-1"
    iteration_endpoint = f"{base_endpoint}/videotranslation/translations/{azure_translation_id}/iterations/{iteration_id}"
    headers = {'Ocp-Apim-Subscription-Key': settings.AZURE_VIDEO_TRANSLATION_KEY}
    params = {'api-version': API_VERSION}

    try:
        poll_response = requests.get(iteration_endpoint, headers=headers, params=params, timeout=30)
        poll_response.raise_for_status()
        status_data = poll_response.json()
        azure_status = status_data.get('status')

        if azure_status == 'Succeeded':
            logger.info(f"Translation {translation.id} SUCCEEDED on Azure.")
            result_data = status_data.get('result', {})
            if not result_data or not result_data.get('translatedVideoFileUrl'):
                raise Exception("Azure job succeeded but returned an invalid result object.")
            with transaction.atomic():
                translation.status = VideoTranslation.Status.COMPLETED
                translation.result_video_url = result_data.get('translatedVideoFileUrl')
                translation.result_subtitle_url = result_data.get('targetLocaleSubtitleWebvttFileUrl')
                translation.save(update_fields=['status', 'result_video_url', 'result_subtitle_url'])
                CreditUsage.objects.create(
                    user=translation.user, usage_type=CreditUsage.UsageType.VIDEO_TRANSLATION,
                    credits_spent=translation.credit_cost, description=f"Video Translation: {translation.title[:150]}"
                )
            send_video_translation_update(translation.user.id, str(translation.id), "Completed", 'completed')
            email_context = {'creation_type': 'Translation', 'prompt': translation.title, 'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=Video Dub"}
            send_template_email("Your Translation is Ready!", "emails/generation_complete.html", email_context, [translation.user.email])
        
        elif azure_status in ['Failed', 'Canceled']:
            error_info = status_data.get('error', {'message': 'Unknown error from Azure.'})
            error_message = f"Azure process failed: {error_info.get('message')}"
            _handle_failure_and_refund(translation_id, error_message)

        else:
            logger.info(f"Iteration for translation {translation.id} is still processing (Azure Status: {azure_status}). Re-queuing check.")
            send_video_translation_update(translation.user.id, str(translation.id), f"Translating... ({azure_status})", 'processing')
            self.retry(countdown=60)
    except requests.exceptions.RequestException as e:
        logger.warning(f"Network error polling iteration for {translation.id}: {e}. Retrying task.")
        self.retry(exc=e)

@shared_task(bind=True, acks_late=True, max_retries=3, default_retry_delay=20)
def process_video_translation(self, translation_id: str):
    """
    Initiates the translation: charges credits, validates the job config with Azure,
    then starts the iteration and hands off to the poller task.
    """
    try:
        with transaction.atomic():
            translation = VideoTranslation.objects.select_for_update().get(id=translation_id)
            user = translation.user
            if translation.status not in [VideoTranslation.Status.PENDING, VideoTranslation.Status.FAILED]:
                logger.warning(f"Skipping initiation for {translation.id}; status is '{translation.status}'.")
                return
            if not translation.credit_cost:
                send_video_translation_update(user.id, translation_id, "Preparing...", 'processing')
                cost = calculate_translation_cost(get_video_duration(translation.source_video_file.url))
                if user.credit_balance < cost:
                    raise ValueError(f"Insufficient credits. Required: {cost}, Balance: {user.credit_balance}.")
                user.credit_balance -= cost
                user.save(update_fields=['credit_balance'])
                translation.credit_cost = cost
            translation.status = VideoTranslation.Status.PROCESSING
            translation.error_message = None
            translation.save(update_fields=['credit_cost', 'status', 'error_message'])
        send_video_translation_update(user.id, translation_id, f"Submitting to provider...", 'processing')
    except Exception as e:
        logger.error(f"Pre-flight/charge failed for translation {translation.id}: {e}")
        _handle_failure_and_refund(translation_id, str(e))
        return

    # --- Azure Job Submission Logic ---
    API_VERSION = "2024-05-20-preview"
    base_endpoint = settings.AZURE_VIDEO_TRANSLATION_ENDPOINT.rstrip('/')
    azure_translation_id = str(translation.azure_translation_id)
    params = {'api-version': API_VERSION}
    headers = { 'Ocp-Apim-Subscription-Key': settings.AZURE_VIDEO_TRANSLATION_KEY, 'Content-Type': 'application/json' }
    
    try:
        # --- Step 1: Create or verify the main translation object ---
        translation_endpoint = f"{base_endpoint}/videotranslation/translations/{azure_translation_id}"
        sas_url = generate_sas_url(translation.source_video_file.name)
        translation_input = {
            "sourceLocale": translation.source_locale, "targetLocale": translation.target_locale,
            "voiceKind": translation.voice_kind, "videoFileUrl": sas_url,
            "exportSubtitleInVideo": translation.embed_subtitles,
            "enableVideoSpeedAdjustment": translation.adjust_video_speed,
            "enableOcrCorrectionFromSubtitle": translation.use_ocr_correction,
        }
        if translation.speaker_count is not None:
            translation_input['speakerCount'] = translation.speaker_count
        payload = {"displayName": translation.title, "input": translation_input}
        
        headers['Operation-Id'] = f"create-{azure_translation_id}-{int(time.time())}"
        create_response = requests.put(translation_endpoint, headers=headers, json=payload, params=params, timeout=30)
        
        if create_response.status_code == 409:
            logger.warning(f"Translation object {azure_translation_id} already exists (409). Proceeding.")
        elif create_response.status_code not in [200, 201]:
            create_response.raise_for_status()

        # --- Step 2: Poll the TRANSLATION object until its configuration is validated and ready ---
        send_video_translation_update(user.id, translation_id, "Validating configuration...", 'processing')
        timeout_seconds = 300
        start_time = time.time()
        is_ready = False
        while time.time() - start_time < timeout_seconds:
            logger.info(f"Polling translation object {azure_translation_id} for 'Succeeded' status...")
            get_response = requests.get(translation_endpoint, headers={'Ocp-Apim-Subscription-Key': settings.AZURE_VIDEO_TRANSLATION_KEY}, params=params)
            get_response.raise_for_status()
            translation_data = get_response.json()
            translation_status = translation_data.get('status')
            
            logger.info(f"  Translation object status is: {translation_status}")
            if translation_status == 'Succeeded':
                logger.info(f"Translation object {azure_translation_id} is ready. Proceeding to create iteration.")
                is_ready = True
                break
            if translation_status == 'Failed':
                error_info = translation_data.get('error', {'message': 'Unknown error during job preparation.'})
                raise Exception(f"Azure job configuration failed: {error_info.get('message')}")
            time.sleep(15)
        
        if not is_ready:
            raise Exception(f"Timed out after {timeout_seconds}s waiting for Azure translation object to become ready.")

        # --- Step 3: Start the actual translation iteration ---
        iteration_id = "iteration-1"
        iteration_endpoint = f"{translation_endpoint}/iterations/{iteration_id}"
        iteration_payload = {"input": {}, "description": f"First iteration for {translation.title}"}
        headers['Operation-Id'] = f"start-iter1-{azure_translation_id}-{int(time.time())}"
        iterate_response = requests.put(iteration_endpoint, headers=headers, json=iteration_payload, params=params, timeout=30)
        
        if iterate_response.status_code not in [200, 201, 202, 409]:
            iterate_response.raise_for_status()
        
        send_video_translation_update(user.id, translation_id, "Starting translation...", 'processing')
        
        # --- Step 4: Hand off to the final poller task ---
        check_azure_translation_status.apply_async(args=[translation_id], countdown=15)

    except Exception as e:
        error_details = str(e)
        if isinstance(e, requests.exceptions.HTTPError) and e.response:
            try:
                error_details = f"{str(e)} - Details: {json.dumps(e.response.json())}"
            except json.JSONDecodeError:
                error_details = f"{str(e)} - Details: {e.response.text}"
        
        logger.error(f"Failed to submit job to Azure for {translation.id}: {error_details}")
        _handle_failure_and_refund(translation_id, f"Failed to communicate with Azure: {error_details}")