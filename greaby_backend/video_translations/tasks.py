# video_translations/tasks.py

import time
import ffmpeg
import requests
import uuid
from celery import shared_task
from django.conf import settings
from django.db import transaction
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta
import logging

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from greaby_project.storages import SourceMediaStorage

from .models import VideoTranslation
from .services import calculate_translation_cost
from audio_creations.tasks import send_progress_update, refund_credits_audio # Re-using for notifications

logger = logging.getLogger(__name__)

def get_video_duration(file_path):
    """Gets video duration in seconds using ffprobe."""
    try:
        probe = ffmpeg.probe(file_path)
        if 'format' not in probe or 'duration' not in probe['format']:
             raise ValueError("Could not find duration information in the video format.")
        return float(probe['format']['duration'])
    except ffmpeg.error as e:
        logger.error(f"ffmpeg error getting duration for {file_path}: {e.stderr.decode('utf-8') if e.stderr else 'No stderr'}")
        raise ValueError(f"Could not read video file to determine duration. It may be corrupt or an unsupported format.")
    
def generate_sas_url(blob_name):
    """Generates a SAS URL for a blob in Azure Storage."""
    return f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net/{SourceMediaStorage().azure_container}/{blob_name}?{generate_blob_sas(account_name=settings.AZURE_ACCOUNT_NAME, container_name=SourceMediaStorage().azure_container, blob_name=blob_name, account_key=settings.AZURE_ACCOUNT_KEY, permission=BlobSasPermissions(read=True), expiry=datetime.utcnow() + timedelta(hours=24))}"


@shared_task(bind=True)
def process_video_translation(self, translation_id: str):
    try:
        translation = VideoTranslation.objects.get(id=translation_id)
        user = translation.user
    except VideoTranslation.DoesNotExist:
        logger.error(f"VideoTranslation with id {translation_id} not found.")
        return

    # 1. Pre-flight Checks and Cost Calculation
    try:
        send_progress_update(user.id, translation.id, "Analyzing video...", 'translation')
        duration = get_video_duration(translation.source_video_file.url)
        cost = calculate_translation_cost(duration)
        
        with transaction.atomic():
            user.refresh_from_db()
            if user.credit_balance < cost:
                raise ValueError(f"Insufficient credits. This video costs {cost}, but you only have {user.credit_balance}.")
            
            # 2. Charge User
            user.credit_balance -= cost
            user.save(update_fields=['credit_balance'])
            
            translation.credit_cost = cost
            translation.status = VideoTranslation.Status.PROCESSING
            translation.save(update_fields=['credit_cost', 'status'])
        
        send_progress_update(user.id, translation.id, f"Charged {cost} credits. Submitting to translation service...", 'translation')

    except Exception as e:
        logger.error(f"Pre-flight/charge failed for translation {translation.id}: {e}")
        translation.status = VideoTranslation.Status.FAILED
        translation.error_message = str(e)
        translation.save(update_fields=['status', 'error_message'])
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{user.id}',
            {'type': 'send_notification', 'message': {'event': 'creation_failed', 'creation_type': 'translation', 'creation_id': str(translation.id)}}
        )
        return f"Failed pre-flight for translation {translation.id}."
    
    # 3. Submit to Azure
    try:
        azure_job_id = str(translation.azure_translation_id)
        endpoint = f"{settings.AZURE_VIDEO_TRANSLATION_ENDPOINT}/videotranslation/translations/{azure_job_id}?api-version=2024-05-20-preview"
        
        headers = {
            'Ocp-Apim-Subscription-Key': settings.AZURE_VIDEO_TRANSLATION_KEY,
            'Operation-Id': azure_job_id, # For idempotency
            'Content-Type': 'application/json'
        }
        
        payload = {
            "displayName": translation.title,
            "input": {
                "sourceLocale": translation.source_locale,
                "targetLocale": translation.target_locale,
                "voiceKind": translation.voice_kind,
                "videoFileUrl": generate_sas_url(translation.source_video_file.name)
            }
        }
        if translation.speaker_count:
            payload['input']['speakerCount'] = translation.speaker_count
        if translation.embed_subtitles:
            payload['input']['exportSubtitleInVideo'] = True

        response = requests.put(endpoint, headers=headers, json=payload)
        response.raise_for_status()
        
        if response.status_code not in [200, 201]:
             raise Exception(f"Azure submission failed with status {response.status_code}: {response.text}")
             
        send_progress_update(user.id, translation.id, "Job submitted. Awaiting processing from Azure...", 'translation')

    except Exception as e:
        logger.error(f"Azure submission error for translation {translation.id}: {e}")
        # refund_credits_for_translation(translation.id, str(e)) # You'd need a refund function like in audio
        return f"Failed Azure submission for {translation.id}."

    # 4. Poll for Result
    status_url = response.headers.get('Operation-Location', endpoint)
    while True:
        try:
            time.sleep(60) # Poll every 60 seconds
            poll_response = requests.get(status_url, headers={'Ocp-Apim-Subscription-Key': settings.AZURE_VIDEO_TRANSLATION_KEY})
            poll_response.raise_for_status()
            status_data = poll_response.json()

            status = status_data.get('status')
            if status == 'Succeeded':
                logger.info(f"Translation {translation.id} succeeded.")
                translation.status = VideoTranslation.Status.COMPLETED
                translation.result_video_url = status_data.get('output', {}).get('videoFileUrl')
                translation.result_subtitle_url = status_data.get('output', {}).get('subtitleFileUrl')
                translation.save()
                break
            elif status in ['Failed', 'Canceled']:
                error_info = status_data.get('error', {'message': 'Unknown error from Azure.'})
                raise Exception(f"Azure job failed: {error_info.get('message')}")
            else:
                # Still running, update frontend and continue polling
                progress = status_data.get('progress', 0)
                send_progress_update(user.id, translation.id, f"Azure is processing... ({int(progress * 100)}% complete)", 'translation')

        except Exception as e:
            logger.error(f"Polling failed for translation {translation.id}: {e}")
            # refund_credits_for_translation(translation.id, str(e))
            return f"Polling failed for {translation.id}."