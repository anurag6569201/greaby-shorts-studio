import time
import requests
import uuid
import json as json_lib
from celery import shared_task
from django.conf import settings
from django.db import transaction
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta
import logging
import ffmpeg

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from billing.models import CreditUsage
from greaby_project.storages import SourceMediaStorage
from .models import VideoTranslation
from .services import calculate_translation_cost
from greaby_project.email_utils import send_template_email

logger = logging.getLogger(__name__)

def send_video_translation_update(user_id, translation_id, message, status):
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
                    'message': message,
                    'status': status,
                }
            }
        )
    except Exception as e:
        logger.error(f"Failed to send websocket update for translation {translation_id}: {e}")

def get_video_duration(file_path):
    try:
        probe = ffmpeg.probe(file_path)
        if 'format' not in probe or 'duration' not in probe['format']:
             raise ValueError("Could not find duration information in the video format.")
        return float(probe['format']['duration'])
    except ffmpeg._run.Error as e:
        logger.error(f"ffmpeg error getting duration for {file_path}: {e.stderr.decode('utf-8') if e.stderr else 'No stderr'}")
        raise ValueError(f"Could not read video file to determine duration. It may be corrupt or an unsupported format.")

def generate_sas_url(blob_name):
    return f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net/{SourceMediaStorage().azure_container}/{blob_name}?{generate_blob_sas(account_name=settings.AZURE_ACCOUNT_NAME, container_name=SourceMediaStorage().azure_container, blob_name=blob_name, account_key=settings.AZURE_ACCOUNT_KEY, permission=BlobSasPermissions(read=True), expiry=datetime.utcnow() + timedelta(hours=24))}"

def _handle_azure_failure_and_refund(translation: VideoTranslation, error_message: str):
    logger.error(f"Handling failure for translation {translation.id}. Refunding credits. Error: {error_message}")
    with transaction.atomic():
        translation.refresh_from_db()
        user = translation.user
        user.refresh_from_db()
        
        if translation.credit_cost and translation.credit_cost > 0:
            user.credit_balance += translation.credit_cost
            user.save(update_fields=['credit_balance'])
            logger.info(f"Refunded {translation.credit_cost} credits to {user.email} for translation {translation.id}.")
        
        translation.status = VideoTranslation.Status.FAILED
        translation.error_message = error_message
        translation.save(update_fields=['status', 'error_message'])
    
    send_video_translation_update(translation.user.id, translation.id, "Translation failed and credits were refunded.", status='failed')

@shared_task(bind=True)
def process_video_translation(self, translation_id: str):
    try:
        with transaction.atomic():
            translation = VideoTranslation.objects.select_for_update().get(id=translation_id)
        user = translation.user
    except VideoTranslation.DoesNotExist:
        logger.error(f"VideoTranslation with id {translation_id} not found.")
        return

    try:
        cost = translation.credit_cost or calculate_translation_cost(get_video_duration(translation.source_video_file.url))
        
        with transaction.atomic():
            user.refresh_from_db()
            if user.credit_balance < cost:
                raise ValueError(f"Insufficient credits. This video costs {cost}, but you only have {user.credit_balance}.")
            
            if not translation.credit_cost:
                user.credit_balance -= cost
                user.save(update_fields=['credit_balance'])
                translation.credit_cost = cost
                logger.info(f"Charged {user.email} {cost} credits for translation {translation.id}. Balance is now {user.credit_balance}.")

            translation.status = VideoTranslation.Status.PROCESSING
            translation.save(update_fields=['credit_cost', 'status'])
        
        send_video_translation_update(user.id, translation.id, f"Charged {cost} credits. Submitting to translation service...", status='processing')
    except Exception as e:
        logger.error(f"Pre-flight/charge failed for translation {translation.id}: {e}")
        translation.status = VideoTranslation.Status.FAILED
        translation.error_message = str(e)
        translation.save(update_fields=['status', 'error_message'])
        send_video_translation_update(user.id, translation.id, f"Processing failed: {e}", status='failed')
        return f"Failed pre-flight for translation {translation.id}."
    
    API_VERSION = "2024-05-20-preview" 
    base_endpoint = settings.AZURE_VIDEO_TRANSLATION_ENDPOINT.rstrip('/')
    azure_translation_id = str(translation.azure_translation_id)
    params = {'api-version': API_VERSION}
    headers = { 'Ocp-Apim-Subscription-Key': settings.AZURE_VIDEO_TRANSLATION_KEY, 'Content-Type': 'application/json' }

    try:
        translation_endpoint = f"{base_endpoint}/videotranslation/translations/{azure_translation_id}"
        check_response = requests.get(translation_endpoint, headers=headers, params=params)

        if check_response.status_code == 404:
            logger.info(f"Translation object {azure_translation_id} not found on Azure. Creating now...")
            payload = {"displayName": translation.title, "input": { "sourceLocale": translation.source_locale, "targetLocale": translation.target_locale, "voiceKind": translation.voice_kind, "videoFileUrl": generate_sas_url(translation.source_video_file.name), "exportSubtitleInVideo": translation.embed_subtitles }}
            if translation.speaker_count: payload['input']['speakerCount'] = translation.speaker_count
            headers['Operation-Id'] = f"create-{azure_translation_id}"
            response_create = requests.put(translation_endpoint, headers=headers, json=payload, params=params)
            response_create.raise_for_status()
        elif check_response.status_code != 200:
            check_response.raise_for_status()

        send_video_translation_update(user.id, translation.id, "Azure is preparing the translation job...", status='processing')
        timeout_seconds = 300
        start_time = time.time()
        while time.time() - start_time < timeout_seconds:
            poll_translation_response = requests.get(translation_endpoint, headers=headers, params=params)
            poll_translation_response.raise_for_status()
            translation_status_data = poll_translation_response.json()
            translation_status = translation_status_data.get('status')
            
            if translation_status == 'Succeeded':
                logger.info(f"Translation object {azure_translation_id} is ready. Proceeding to start iteration.")
                break 
            if translation_status in ['Failed', 'Canceled']:
                error_info = translation_status_data.get('error', {'message': 'Unknown error during job preparation.'})
                raise Exception(f"Azure job preparation failed: {error_info.get('message')}")
            
            time.sleep(15)
        else:
            raise Exception(f"Timed out after {timeout_seconds}s waiting for Azure job to be ready.")

        iteration_id = "iteration-1"
        iteration_endpoint = f"{translation_endpoint}/iterations/{iteration_id}"
        headers['Operation-Id'] = f"start-iter1-{azure_translation_id}"
        
        response_iterate = requests.put(iteration_endpoint, headers=headers, json={"input": {}}, params=params)
        if response_iterate.status_code == 409:
            logger.warning(f"Iteration {iteration_id} already exists for {azure_translation_id}. Proceeding to poll status.")
        else:
            response_iterate.raise_for_status()
        
        send_video_translation_update(user.id, translation.id, "Translation process started. This may take some time...", status='processing')

        while True:
            time.sleep(45) 
            poll_response = requests.get(iteration_endpoint, headers={'Ocp-Apim-Subscription-Key': settings.AZURE_VIDEO_TRANSLATION_KEY}, params=params)
            poll_response.raise_for_status()
            status_data = poll_response.json()
            status = status_data.get('status')

            if status == 'Succeeded':
                logger.info(f"Translation {translation.id} succeeded.")
                result_data = status_data.get('result', {})
                if not result_data: raise Exception("Azure job succeeded but returned no result object.")
                
                with transaction.atomic():
                    translation.status = VideoTranslation.Status.COMPLETED
                    translation.result_video_url = result_data.get('translatedVideoFileUrl')
                    translation.result_subtitle_url = result_data.get('targetLocaleSubtitleWebvttFileUrl')
                    translation.save(update_fields=['status', 'result_video_url', 'result_subtitle_url'])

                    CreditUsage.objects.create(
                        user=user,
                        usage_type=CreditUsage.UsageType.VIDEO,
                        credits_spent=translation.credit_cost,
                        description=f"Video Translation: {translation.title[:150]}"
                    )
                
                email_context = {'creation_type': 'Translation', 'prompt': translation.title, 'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=Video Dub"}
                send_template_email("Your Translation is Ready!", "emails/generation_complete.html", email_context, [translation.user.email])
                send_video_translation_update(user.id, translation.id, "Translation complete!", status='completed')
                break
            elif status in ['Failed', 'Canceled']:
                error_info = status_data.get('error', {'message': 'Unknown error from Azure.'})
                raise Exception(f"Azure translation process failed: {error_info.get('message')}")
            else:
                send_video_translation_update(user.id, translation.id, f"Azure is processing... (Status: {status})", status='processing')
    
    except Exception as e:
        error_details = str(e)
        if isinstance(e, requests.exceptions.HTTPError):
            try:
                error_json = e.response.json()
                error_details = f"{str(e)} - Details: {error_json}"
            except json_lib.JSONDecodeError:
                error_details = f"{str(e)} - Details: {e.response.text}"

        _handle_azure_failure_and_refund(translation, error_details)
        email_context = {'creation_type': 'Translation', 'prompt': translation.title, 'error': error_details, 'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=Video Dub"}
        send_template_email("Your Translation Failed", "emails/generation_failed.html", email_context, [translation.user.email])
        return f"Failed Azure process for {translation.id}."