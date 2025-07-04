# src/transcriptions/tasks.py

import time
import requests
import json
import logging
from datetime import datetime, timedelta

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.core.files.base import ContentFile
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from greaby_project.email_utils import send_template_email
from .models import Transcription
from billing.models import CreditUsage

logger = logging.getLogger(__name__)

def send_progress_update(user_id, creation_id, status, message):
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{user_id}',
            {
                'type': 'send_notification',
                'message': {
                    'event': 'creation_progress',
                    'creation_type': 'transcription',
                    'creation_id': str(creation_id),
                    'status': status,
                    'message': message,
                }
            }
        )
    except Exception as e:
        logger.error(f"Failed to send progress update for transcription {creation_id}: {e}")

def _handle_failure_and_refund(transcription: Transcription, reason: str):
    logger.error(f"Handling failure for transcription {transcription.id}. Reason: {reason}")
    try:
        with transaction.atomic():
            transcription.refresh_from_db()
            user = transcription.user
            user.refresh_from_db()

            if transcription.credit_cost > 0:
                user.credit_balance += transcription.credit_cost
                user.save(update_fields=['credit_balance'])
                logger.info(f"Refunded {transcription.credit_cost} credits to {user.email} for transcription {transcription.id}")

            transcription.error_message = f"Task failed: {reason}"
            transcription.status = Transcription.Status.FAILED
            transcription.save(update_fields=['error_message', 'status'])
            
            send_progress_update(user.id, transcription.id, 'failed', f"Job failed and credits were refunded. Error: {reason[:100]}")
            
    except Exception as e:
        logger.critical(f"CRITICAL: Failed to refund credits for transcription {transcription.id}. Error: {e}")

def get_blob_sas_url(container_name: str, blob_name: str, permission: BlobSasPermissions) -> str:
    sas_token = generate_blob_sas(
        account_name=settings.AZURE_ACCOUNT_NAME,
        container_name=container_name,
        blob_name=blob_name,
        account_key=settings.AZURE_ACCOUNT_KEY,
        permission=permission,
        expiry=datetime.utcnow() + timedelta(hours=24)
    )
    return f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net/{container_name}/{blob_name}?{sas_token}"

@shared_task(bind=True)
def process_transcription_job(self, creation_id: str):
    try:
        with transaction.atomic():
            creation = Transcription.objects.select_for_update().get(id=creation_id)
        user = creation.user
    except Transcription.DoesNotExist:
        logger.error(f"Transcription with id {creation_id} not found.")
        return

    try:
        with transaction.atomic():
            user.refresh_from_db()
            if user.credit_balance < creation.credit_cost:
                raise ValueError("Insufficient credits at time of processing.")
            
            user.credit_balance -= creation.credit_cost
            user.save(update_fields=['credit_balance'])

            creation.status = Transcription.Status.PROCESSING
            creation.save(update_fields=['status'])
        
        send_progress_update(user.id, creation.id, 'processing', f"Charged {creation.credit_cost} credits. Preparing job...")
    except Exception as e:
        error_message = str(e)
        logger.error(f"Charge failed for transcription {creation_id}: {error_message}")
        creation.status = Transcription.Status.FAILED
        creation.error_message = f"Failed during credit charge: {error_message}"
        creation.save(update_fields=['status', 'error_message'])
        send_progress_update(user.id, creation.id, 'failed', f"Credit charge failed: {error_message}")
        return

    try:
        endpoint = settings.AZURE_SPEECH_ENDPOINT
        api_version = "v3.2"
        job_url = f"{endpoint}speechtotext/{api_version}/transcriptions"
        headers = {'Ocp-Apim-Subscription-Key': settings.AZURE_SPEECH_KEY, 'Content-Type': 'application/json'}
        source_file_url = get_blob_sas_url('greaby-source-media', creation.source_file.name, permission=BlobSasPermissions(read=True))
        
        properties = {"wordLevelTimestampsEnabled": True, "punctuationMode": "DictatedAndAutomatic", "profanityFilterMode": "Masked"}
        if creation.enable_speaker_separation:
            properties["diarizationEnabled"] = True
            properties["diarization"] = {"speakers": {"minCount": 1, "maxCount": 10}}
            
        payload = {"contentUrls": [source_file_url], "locale": creation.source_language, "displayName": f"Transcription for {creation.id}", "properties": properties}
        
        send_progress_update(creation.user.id, creation.id, 'processing', "Submitting job to Azure...")
        response = requests.post(job_url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        transcription_status_url = response.headers['Location']
        
        send_progress_update(creation.user.id, creation.id, 'processing', "Processing media (this may take a few minutes)...")
        status = ""
        while status not in ["Succeeded", "Failed"]:
            time.sleep(30)
            status_response = requests.get(transcription_status_url, headers=headers, timeout=20)
            status_response.raise_for_status()
            status_data = status_response.json()
            status = status_data.get("status")

        if status == "Failed":
            error_details = status_data.get("properties", {}).get("error", {})
            raise Exception(f"Azure transcription failed: {error_details.get('message', 'Unknown error')}")

        send_progress_update(creation.user.id, creation.id, 'processing', "Finalizing and saving results...")
        files_url = f"{transcription_status_url}/files"
        files_response = requests.get(files_url, headers=headers, timeout=20)
        files_response.raise_for_status()
        result_file_url = next((f['links']['contentUrl'] for f in files_response.json().get('values', []) if f.get('kind') == 'Transcription'), None)
        
        if not result_file_url:
            raise Exception("Transcription job succeeded but no result file was found.")
            
        result_content_response = requests.get(result_file_url, timeout=60)
        result_content_response.raise_for_status()
        
        with transaction.atomic():
            result_blob_name = f'transcriptions/{creation.id}.json'
            creation.result_file.save(result_blob_name, ContentFile(result_content_response.content), save=False)
            
            creation.status = Transcription.Status.COMPLETED
            creation.error_message = None

            # --- FIX: REMOVED THE DELETION OF THE SOURCE FILE ---
            # if creation.source_file:
            #     creation.source_file.delete(save=False)

            # We are no longer updating `source_file`, so remove it from update_fields
            creation.save(update_fields=['result_file', 'status', 'error_message'])
            # --- END FIX ---
            
            CreditUsage.objects.create(
                user=user,
                usage_type=CreditUsage.UsageType.SUBTITLE,
                credits_spent=creation.credit_cost,
                description=f"Transcription: {creation.title[:100]}"
            )
        
        send_progress_update(user.id, creation.id, 'completed', "Your transcription is ready!")
        email_context = {'creation_type': 'Transcription', 'prompt': creation.title, 'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=transcription"}
        send_template_email("Your Transcription is Ready!", "emails/generation_complete.html", email_context, [user.email])

    except Exception as e:
        error_message = str(e)
        _handle_failure_and_refund(creation, error_message)
        email_context = {'creation_type': 'Transcription', 'prompt': creation.title, 'error': error_message, 'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=transcription"}
        send_template_email("Your Transcription Failed", "emails/generation_failed.html", email_context, [creation.user.email])