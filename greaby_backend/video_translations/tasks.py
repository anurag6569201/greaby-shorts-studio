# video_translations/tasks.py
# FINAL VERSION: This version handles 409 Conflict errors by first checking if a translation
# object already exists on Azure before attempting to create it. This makes retries robust.

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

from greaby_project.storages import SourceMediaStorage
from .models import VideoTranslation
from .services import calculate_translation_cost

logger = logging.getLogger(__name__)


def _send_video_translation_update(user_id, translation_id, message, status):
    """Sends a structured progress update over WebSockets for video translation."""
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
    """Gets video duration in seconds using ffprobe."""
    try:
        probe = ffmpeg.probe(file_path)
        if 'format' not in probe or 'duration' not in probe['format']:
             raise ValueError("Could not find duration information in the video format.")
        return float(probe['format']['duration'])
    except ffmpeg._run.Error as e:
        logger.error(f"ffmpeg error getting duration for {file_path}: {e.stderr.decode('utf-8') if e.stderr else 'No stderr'}")
        raise ValueError(f"Could not read video file to determine duration. It may be corrupt or an unsupported format.")


def generate_sas_url(blob_name):
    """Generates a SAS URL for a blob in Azure Storage."""
    return f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net/{SourceMediaStorage().azure_container}/{blob_name}?{generate_blob_sas(account_name=settings.AZURE_ACCOUNT_NAME, container_name=SourceMediaStorage().azure_container, blob_name=blob_name, account_key=settings.AZURE_ACCOUNT_KEY, permission=BlobSasPermissions(read=True), expiry=datetime.utcnow() + timedelta(hours=24))}"


def _handle_azure_failure_and_refund(translation: VideoTranslation, error_message: str):
    """Atomically refunds credits and marks the translation as failed."""
    logger.error(f"Handling failure for translation {translation.id}. Refunding credits. Error: {error_message}")
    with transaction.atomic():
        user = translation.user
        user.refresh_from_db()
        if translation.credit_cost and translation.credit_cost > 0:
            user.credit_balance += translation.credit_cost
            user.save(update_fields=['credit_balance'])
            logger.info(f"Refunded {translation.credit_cost} credits to {user.email} for translation {translation.id}.")
        translation.status = VideoTranslation.Status.FAILED
        translation.error_message = error_message
        translation.save(update_fields=['status', 'error_message'])
    
    _send_video_translation_update(translation.user.id, translation.id, "Translation failed.", status='failed')


@shared_task(bind=True)
def process_video_translation(self, translation_id: str):
    try:
        translation = VideoTranslation.objects.get(id=translation_id)
        user = translation.user
    except VideoTranslation.DoesNotExist:
        logger.error(f"VideoTranslation with id {translation_id} not found.")
        return

    # 1. Pre-flight Checks
    try:
        _send_video_translation_update(user.id, translation.id, "Analyzing video...", status='analyzing')
        duration = get_video_duration(translation.source_video_file.url)
        cost = calculate_translation_cost(duration)
        with transaction.atomic():
            user.refresh_from_db()
            if user.credit_balance < cost:
                raise ValueError(f"Insufficient credits. This video costs {cost}, but you only have {user.credit_balance}.")
            user.credit_balance -= cost
            user.save(update_fields=['credit_balance'])
            translation.credit_cost = cost
            translation.status = VideoTranslation.Status.PROCESSING
            translation.save(update_fields=['credit_cost', 'status'])
        _send_video_translation_update(user.id, translation.id, f"Charged {cost} credits. Submitting to translation service...", status='processing')
    except Exception as e:
        logger.error(f"Pre-flight/charge failed for translation {translation.id}: {e}")
        translation.status = VideoTranslation.Status.FAILED
        translation.error_message = str(e)
        translation.save(update_fields=['status', 'error_message'])
        _send_video_translation_update(user.id, translation.id, "Processing failed before submission.", status='failed')
        return f"Failed pre-flight for translation {translation.id}."
    
    # 3. Submit to Azure
    API_VERSION = "2024-05-20-preview" 
    base_endpoint = settings.AZURE_VIDEO_TRANSLATION_ENDPOINT.rstrip('/')
    azure_translation_id = str(translation.azure_translation_id)
    params = {'api-version': API_VERSION}
    headers = { 'Ocp-Apim-Subscription-Key': settings.AZURE_VIDEO_TRANSLATION_KEY, 'Content-Type': 'application/json' }

    try:
        translation_endpoint = f"{base_endpoint}/videotranslation/translations/{azure_translation_id}"
        
        # Check if the translation object already exists before trying to create it (handles retries)
        check_response = requests.get(translation_endpoint, headers=headers, params=params)

        if check_response.status_code == 404:
            # Resource does not exist, so we create it.
            logger.info(f"Translation object {azure_translation_id} not found on Azure. Creating now...")
            payload = {
                "displayName": translation.title,
                "description": f"Translation for user {user.email}",
                "input": {
                    "sourceLocale": translation.source_locale,
                    "targetLocale": translation.target_locale,
                    "voiceKind": translation.voice_kind,
                    "videoFileUrl": generate_sas_url(translation.source_video_file.name),
                    "exportSubtitleInVideo": translation.embed_subtitles,
                }
            }
            if translation.speaker_count:
                payload['input']['speakerCount'] = translation.speaker_count
            
            headers['Operation-Id'] = f"create-{azure_translation_id}"
            response_create = requests.put(translation_endpoint, headers=headers, json=payload, params=params)
            response_create.raise_for_status()
        elif check_response.status_code == 200:
            # Resource already exists, we can skip creating it.
            logger.info(f"Translation object {azure_translation_id} already exists on Azure. Skipping creation.")
        else:
            # Another unexpected error occurred during the check.
            check_response.raise_for_status()

        # At this point, the translation object is guaranteed to exist. Now create the iteration.
        iteration_id = "iteration-1"
        iteration_endpoint = f"{base_endpoint}/videotranslation/translations/{azure_translation_id}/iterations/{iteration_id}"
        headers['Operation-Id'] = f"start-iter1-{azure_translation_id}"
        
        iteration_payload = {"input": {}}
        response_iterate = requests.put(iteration_endpoint, headers=headers, json=iteration_payload, params=params)
        
        # A 409 Conflict on iteration creation means it's already running, which is okay on retry.
        if response_iterate.status_code == 409:
            logger.warning(f"Iteration {iteration_id} already exists. Proceeding to poll status.")
        else:
            response_iterate.raise_for_status()
        
        _send_video_translation_update(user.id, translation.id, "Job submitted. Awaiting processing from Azure...", status='processing')

    except requests.exceptions.HTTPError as e:
        try:
            error_details = e.response.json()
        except json_lib.JSONDecodeError:
            error_details = e.response.text
        full_error_message = f"{str(e)} - Details: {error_details}"
        _handle_azure_failure_and_refund(translation, full_error_message)
        return f"Failed Azure submission for {translation.id}."
    except Exception as e:
        _handle_azure_failure_and_refund(translation, str(e))
        return f"Failed Azure submission for {translation.id}."

    # 4. Poll for Result
    iteration_status_url = iteration_endpoint 
    poll_headers = {'Ocp-Apim-Subscription-Key': settings.AZURE_VIDEO_TRANSLATION_KEY}
    
    while True:
        try:
            time.sleep(45) 
            poll_response = requests.get(iteration_status_url, headers=poll_headers, params=params)
            poll_response.raise_for_status()
            status_data = poll_response.json()
            status = status_data.get('status')

            if status == 'Succeeded':
                logger.info(f"Translation {translation.id} succeeded.")
                result_data = status_data.get('result', {})
                if not result_data: 
                    raise Exception("Azure job succeeded but returned no result object.")
                translation.status = VideoTranslation.Status.COMPLETED
                translation.result_video_url = result_data.get('translatedVideoFileUrl')
                translation.result_subtitle_url = result_data.get('targetLocaleSubtitleWebvttFileUrl')
                translation.save(update_fields=['status', 'result_video_url', 'result_subtitle_url'])
                _send_video_translation_update(user.id, translation.id, "Translation complete!", status='completed')
                break
            elif status in ['Failed', 'Canceled']:
                error_info = status_data.get('error', {'message': 'Unknown error from Azure.'})
                raise Exception(f"Azure job failed: {error_info.get('message')}")
            else:
                _send_video_translation_update(user.id, translation.id, f"Azure is processing... (Status: {status})", status='processing')
        except requests.exceptions.HTTPError as e:
            try:
                error_details = e.response.json()
            except json_lib.JSONDecodeError:
                error_details = e.response.text
            full_error_message = f"Polling failed: {str(e)} - Details: {error_details}"
            _handle_azure_failure_and_refund(translation, full_error_message)
            return f"Polling failed for {translation.id}."
        except Exception as e:
            _handle_azure_failure_and_refund(translation, f"Polling failed with general error: {str(e)}")
            return f"Polling failed for {translation.id}."