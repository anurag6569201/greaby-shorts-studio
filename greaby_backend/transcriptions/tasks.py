# transcriptions/tasks.py

import time
import requests
import json
import logging
from datetime import datetime, timedelta

from celery import shared_task
from django.conf import settings
from django.db import transaction
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from greaby_project.email_utils import send_template_email
from .models import Transcription
from .format_converter import to_plain_text

logger = logging.getLogger(__name__)

def send_progress_update(user_id, creation_id, status_message):
    """Sends a progress update over WebSocket."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{user_id}',
            {
                'type': 'send_notification',
                'message': {
                    'event': 'creation_progress',
                    'creation_id': str(creation_id),
                    'creation_type': 'transcription',
                    'status_message': status_message,
                }
            }
        )
    except Exception as e:
        logger.error(f"Failed to send progress update for transcription {creation_id}: {e}")

def refund_credits_transcription(creation_id: str, reason: str):
    """Atomically refunds credits to a user for a failed transcription."""
    try:
        with transaction.atomic():
            creation = Transcription.objects.select_for_update().get(id=creation_id)
            user = creation.user
            if creation.status != Transcription.Status.COMPLETED and creation.credit_cost > 0:
                user.credit_balance += creation.credit_cost
                user.save(update_fields=['credit_balance'])
                
                creation.credit_cost = 0
                creation.error_message = f"Task failed: {reason}. Credits refunded."
                creation.status = Transcription.Status.FAILED
                creation.save(update_fields=['credit_cost', 'error_message', 'status'])
    except Exception as e:
        logger.critical(f"CRITICAL: Failed to refund credits for transcription {creation_id}. Error: {e}")

def get_blob_sas_url(container_name: str, blob_name: str, permission: str) -> str:
    """Generates a SAS URL for a specific blob."""
    sas_token = generate_blob_sas(
        account_name=settings.AZURE_ACCOUNT_NAME,
        container_name=container_name,
        blob_name=blob_name,
        account_key=settings.AZURE_ACCOUNT_KEY,
        permission=permission,
        expiry=datetime.utcnow() + timedelta(hours=24)
    )
    return f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net/{container_name}/{blob_name}?{sas_token}"

def generate_ai_insights(full_text: str) -> dict:
    """
    Calls Azure OpenAI's text-generation model to get a summary and keywords.
    """
    try:
        endpoint = f"{settings.AZURE_OPENAI_ENDPOINT_URL}openai/deployments/gpt-4/chat/completions?api-version=2023-07-01-preview"
        headers = {
            'Content-Type': 'application/json',
            'api-key': settings.AZURE_OPENAI_API_KEY
        }
        
        system_prompt = (
            "You are an expert content analyst. Your task is to analyze the following transcript and provide a concise summary "
            "and a list of 10-15 relevant keywords or topics. Format your response strictly as a JSON object with two keys: "
            "'summary' (a string) and 'keywords' (an array of strings)."
        )
        
        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is the transcript:\n\n{full_text}"}
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": 800,
            "temperature": 0.3,
        }

        response = requests.post(endpoint, headers=headers, json=payload, timeout=90)
        response.raise_for_status()
        
        result = response.json()
        insights_json = json.loads(result['choices'][0]['message']['content'])
        
        if 'summary' in insights_json and 'keywords' in insights_json:
            return insights_json
        else:
            raise ValueError("AI response did not contain 'summary' and 'keywords' keys.")

    except Exception as e:
        logger.error(f"Failed to generate AI insights: {e}")
        return None

@shared_task(bind=True)
def process_transcription_job(self, creation_id: str):
    """
    Celery task to perform batch transcription using Azure Speech REST API v3.2.
    """
    try:
        creation = Transcription.objects.get(id=creation_id)
        creation.status = Transcription.Status.PROCESSING
        creation.save(update_fields=['status'])
        send_progress_update(creation.user.id, creation.id, "Queued: Preparing transcription job...")
    except Transcription.DoesNotExist:
        logger.error(f"Transcription with id {creation_id} not found.")
        return

    try:
        send_progress_update(creation.user.id, creation.id, "Step 1/5: Authenticating with Azure Speech...")
        endpoint = settings.AZURE_SPEECH_ENDPOINT
        api_version = "v3.2"
        job_url = f"{endpoint}speechtotext/{api_version}/transcriptions"
        headers = {
            'Ocp-Apim-Subscription-Key': settings.AZURE_SPEECH_KEY,
            'Content-Type': 'application/json'
        }

        source_file_url = get_blob_sas_url('greaby-source-media', creation.source_file.name, permission=BlobSasPermissions(read=True))
        
        properties = { "wordLevelTimestampsEnabled": True, "punctuationMode": "DictatedAndAutomatic", "profanityFilterMode": "Masked" }
        if creation.enable_speaker_separation:
            properties["diarizationEnabled"] = True
            properties["diarization"] = {"speakers": {"minCount": 1, "maxCount": 10}}

        payload = { "contentUrls": [source_file_url], "locale": creation.source_language, "displayName": f"Transcription for {creation.id}", "properties": properties }
        
        send_progress_update(creation.user.id, creation.id, "Step 2/5: Submitting job to Azure...")
        response = requests.post(job_url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        transcription_status_url = response.headers['Location']
        
        send_progress_update(creation.user.id, creation.id, "Step 3/5: Processing media (this may take time)...")
        status = ""
        while status not in ["Succeeded", "Failed"]:
            time.sleep(30)
            status_response = requests.get(transcription_status_url, headers=headers, timeout=20)
            status_response.raise_for_status()
            status_data = status_response.json()
            status = status_data.get("status")
            logger.info(f"Transcription {creation_id} status: {status}")

        if status == "Failed":
            error_details = status_data.get("properties", {}).get("error", {})
            raise Exception(f"Azure transcription failed: {error_details.get('message', 'Unknown error')}")

        send_progress_update(creation.user.id, creation.id, "Step 4/5: Finalizing transcription...")
        files_url = f"{transcription_status_url}/files"
        files_response = requests.get(files_url, headers=headers, timeout=20)
        files_response.raise_for_status()
        
        result_file_url = None
        for file_data in files_response.json().get('values', []):
            if file_data.get('kind') == 'Transcription':
                result_file_url = file_data['links']['contentUrl']
                break
        
        if not result_file_url:
            raise Exception("Transcription job succeeded but no result file was found.")
            
        result_content_response = requests.get(result_file_url, timeout=60)
        result_content_response.raise_for_status()
        result_json_content = result_content_response.content
        
        result_blob_name = f'{creation.id}.json'
        creation.result_file.save(result_blob_name, result_json_content, save=False)
        creation.status = Transcription.Status.COMPLETED
        creation.error_message = None

        if creation.generate_insights:
            send_progress_update(creation.user.id, creation.id, "Step 5/5: Generating AI Insights...")
            plain_text = to_plain_text(result_json_content.decode('utf-8'))
            
            if len(plain_text) > 100:
                insights = generate_ai_insights(plain_text)
                if insights:
                    creation.summary = insights.get('summary')
                    creation.keywords = insights.get('keywords')
            else:
                logger.warning(f"Skipping AI insights for transcription {creation.id} due to short text length.")

        if creation.source_file:
            logger.info(f"Deleting source file {creation.source_file.name} for transcription {creation.id}")
            creation.source_file.delete(save=False)

        update_fields_list = ['result_file', 'status', 'error_message', 'source_file', 'summary', 'keywords']
        creation.save(update_fields=update_fields_list)
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{creation.user.id}',
            {'type': 'send_notification', 'message': {'event': 'creation_completed', 'creation_type': 'transcription', 'creation_id': str(creation.id)}}
        )
        email_context = { 'creation_type': 'Transcription', 'prompt': creation.title, 'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=transcription" }
        send_template_email("Your Transcription is Ready!", "emails/generation_complete.html", email_context, [creation.user.email])

    except Exception as e:
        error_message = str(e)
        logger.error(f"ERROR during transcription for {creation_id}: {error_message}")
        if 'creation' in locals() and creation:
            refund_credits_transcription(creation_id, error_message)
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'user_{creation.user.id}',
                {'type': 'send_notification', 'message': {'event': 'creation_failed', 'creation_type': 'transcription', 'creation_id': str(creation.id)}}
            )
            email_context = { 'creation_type': 'Transcription', 'prompt': creation.title, 'error': error_message, 'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=transcription" }
            send_template_email("Your Transcription Failed", "emails/generation_failed.html", email_context, [creation.user.email])