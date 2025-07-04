# video_translations/tasks.py

import time
import requests
import json as json_lib
import uuid  # <-- Import uuid
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
    """Sends a progress update to the frontend via WebSockets."""
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
    """Gets the duration of a video file using ffmpeg."""
    try:
        probe = ffmpeg.probe(file_path)
        if 'format' not in probe or 'duration' not in probe['format']:
             raise ValueError("Could not find duration information in the video format.")
        return float(probe['format']['duration'])
    except ffmpeg.Error as e:
        logger.error(f"ffmpeg error getting duration for {file_path}: {e.stderr.decode('utf-8') if e.stderr else 'No stderr'}")
        raise ValueError("Could not read video file. It may be corrupt or an unsupported format.")

def generate_sas_url(blob_name):
    """Generates a Shared Access Signature URL for a blob."""
    sas_token = generate_blob_sas(
        account_name=settings.AZURE_ACCOUNT_NAME, container_name=SourceMediaStorage().azure_container, blob_name=blob_name,
        account_key=settings.AZURE_ACCOUNT_KEY, permission=BlobSasPermissions(read=True),
        expiry=datetime.utcnow() + timedelta(hours=24)
    )
    return f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net/{SourceMediaStorage().azure_container}/{blob_name}?{sas_token}"

def _handle_azure_failure_and_refund(translation: VideoTranslation, error_message: str):
    """Handles a job failure by refunding credits and updating the model status."""
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
    
    send_video_translation_update(translation.user.id, translation.id, f"Translation failed: {error_message[:150]}", status='failed')

@shared_task(bind=True)
def process_video_translation(self, translation_id: str):
    """Celery task to process a video translation job using Azure AI Services."""
    try:
        translation = VideoTranslation.objects.get(id=translation_id)
        user = translation.user
    except VideoTranslation.DoesNotExist:
        logger.error(f"VideoTranslation with id {translation_id} not found.")
        return

    # 1. Pre-flight checks and credit charging
    try:
        send_video_translation_update(user.id, translation.id, "Calculating cost...", status='processing')
        duration = get_video_duration(translation.source_video_file.url)
        cost = calculate_translation_cost(duration)
        
        with transaction.atomic():
            user.refresh_from_db(fields=['credit_balance'])
            if user.credit_balance < cost:
                raise ValueError(f"Insufficient credits. This video costs {cost}, but you only have {user.credit_balance}.")
            
            user.credit_balance -= cost
            user.save(update_fields=['credit_balance'])
            
            translation.credit_cost = cost
            translation.status = VideoTranslation.Status.PROCESSING
            translation.save(update_fields=['credit_cost', 'status'])
        
        send_video_translation_update(user.id, translation.id, f"Charged {cost} credits. Submitting to translation service...", status='processing')
    except Exception as e:
        logger.error(f"Pre-flight/charge failed for translation {translation.id}: {e}")
        translation.status = VideoTranslation.Status.FAILED
        translation.error_message = str(e)
        translation.save(update_fields=['status', 'error_message'])
        send_video_translation_update(user.id, translation.id, f"Processing failed: {e}", status='failed')
        return
    
    # 2. Azure API Interaction
    API_VERSION = "2024-05-20-preview" 
    base_endpoint = settings.AZURE_VIDEO_TRANSLATION_ENDPOINT.rstrip('/')
    params = {'api-version': API_VERSION}
    headers = { 'Ocp-Apim-Subscription-Key': settings.AZURE_VIDEO_TRANSLATION_KEY, 'Content-Type': 'application/json' }
    auth_headers = { 'Ocp-Apim-Subscription-Key': settings.AZURE_VIDEO_TRANSLATION_KEY }

    try:
        # --- FIX 1: Generate a NEW Azure ID for every attempt to prevent 409 Conflict ---
        translation.azure_translation_id = uuid.uuid4()
        translation.save(update_fields=['azure_translation_id'])
        azure_translation_id = str(translation.azure_translation_id)

        # STEP A: Create the main translation job container
        translation_endpoint = f"{base_endpoint}/videotranslation/translations/{azure_translation_id}"
        
        logger.info(f"Creating translation job {azure_translation_id} on Azure...")
        payload = {
            "displayName": translation.title, 
            "input": { 
                "sourceLocale": translation.source_locale,
                "targetLocale": translation.target_locale,
                "voiceKind": "PlatformVoice",
                "videoFileUrl": generate_sas_url(translation.source_video_file.name),
                "exportSubtitleInVideo": translation.embed_subtitles 
            }
        }
        if translation.speaker_count: payload['input']['speakerCount'] = translation.speaker_count
        
        response_create = requests.put(translation_endpoint, headers=headers, json=payload, params=params)
        response_create.raise_for_status()

        # STEP B: Poll the main job until it is ready (status is 'Succeeded')
        send_video_translation_update(user.id, translation.id, "Azure is preparing the job...", status='processing')
        while True:
            time.sleep(15) 
            poll_main_job_response = requests.get(translation_endpoint, headers=auth_headers, params=params)
            poll_main_job_response.raise_for_status()
            main_job_data = poll_main_job_response.json()
            main_job_status = main_job_data.get('status')
            
            if main_job_status == 'Succeeded':
                logger.info(f"Azure job container {azure_translation_id} is ready. Starting iteration.")
                break 
            elif main_job_status in ['Failed', 'Canceled']:
                error_info = main_job_data.get('error', {'message': 'Unknown error during job setup.'})
                raise Exception(f"Azure job setup failed: {error_info.get('message')}")

        # STEP C: Create an iteration to start the actual translation work
        iteration_id = "iteration-1"
        iteration_endpoint = f"{translation_endpoint}/iterations/{iteration_id}"
        
        response_iterate = requests.put(iteration_endpoint, headers=headers, json={"input": {}}, params=params)
        response_iterate.raise_for_status()
        
        # STEP D: Poll the iteration status for the final result
        send_video_translation_update(user.id, translation.id, "Translation in progress. This may take some time...", status='processing')
        while True:
            time.sleep(45) 
            poll_iteration_response = requests.get(iteration_endpoint, headers=auth_headers, params=params)
            poll_iteration_response.raise_for_status()
            status_data = poll_iteration_response.json()
            status = status_data.get('status')

            if status == 'Succeeded':
                # ... (Success handling logic remains the same)
                logger.info(f"Translation {translation.id} succeeded.")
                result_data = status_data.get('result', {})
                if not result_data: raise Exception("Azure job succeeded but returned no result object.")
                
                with transaction.atomic():
                    translation.status = VideoTranslation.Status.COMPLETED
                    translation.result_video_url = result_data.get('translatedVideoFileUrl')
                    translation.result_subtitle_url = result_data.get('targetLocaleSubtitleWebvttFileUrl')
                    translation.error_message = None
                    translation.save(update_fields=['status', 'result_video_url', 'result_subtitle_url', 'error_message'])
                    
                    CreditUsage.objects.create(user=user, usage_type=CreditUsage.UsageType.VIDEO_TRANSLATION, credits_spent=translation.credit_cost, description=f"Video Translation: {translation.title[:150]}")
                
                email_context = {'creation_type': 'Translation', 'prompt': translation.title, 'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=translations"}
                send_template_email("Your Translation is Ready!", "emails/generation_complete.html", email_context, [user.email])
                send_video_translation_update(user.id, translation.id, "Translation complete!", status='completed')
                break
            elif status in ['Failed', 'Canceled']:
                error_info = status_data.get('error', {'message': 'Unknown error from Azure.'})
                raise Exception(f"Azure translation process failed: {error_info.get('message')}")
            else:
                send_video_translation_update(user.id, translation.id, f"Azure is processing... (Status: {status})", status='processing')
    
    except Exception as e:
        # --- FIX 2: More robust error message parsing ---
        error_details = str(e) # Default to the string representation of the exception
        if isinstance(e, requests.exceptions.HTTPError) and e.response is not None:
            # Start with a safe default using the plain text of the response
            error_details = f"Azure API Error: {e.response.status_code} - {e.response.text}"
            try:
                # Attempt to parse JSON, but check if the result is a dict before using .get()
                error_json = e.response.json()
                if isinstance(error_json, dict):
                    message = error_json.get('error', {}).get('message')
                    if message:
                        error_details = f"Azure API Error: {message}"
            except json_lib.JSONDecodeError:
                # Body was not JSON, the safe default from above will be used.
                pass

        _handle_azure_failure_and_refund(translation, error_details)
        email_context = {'creation_type': 'Translation', 'prompt': translation.title, 'error': error_details, 'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=translations"}
        send_template_email("Your Translation Failed", "emails/generation_failed.html", email_context, [translation.user.email])