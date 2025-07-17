import time
import requests
import json
import logging
from celery import shared_task
from django.conf import settings
from django.db import transaction
from azure.storage.blob import BlobClient
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from greaby_project.email_utils import send_template_email
from .models import VideoCreation
from billing.models import CreditUsage

# Use the proper Django logger
logger = logging.getLogger(__name__)

def send_progress_update(user_id, creation_id, status_message, creation_type='video'):
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{user_id}',
            {
                'type': 'send_notification',
                'message': {
                    'event': 'creation_progress',
                    'creation_id': str(creation_id),
                    'creation_type': creation_type,
                    'status_message': status_message,
                }
            }
        )
        logger.info(f"PROGRESS for {creation_id}: {status_message}")
    except Exception as e:
        logger.error(f"Failed to send progress update: {e}")

def refund_credits(creation_id: str, reason: str):
    try:
        with transaction.atomic():
            creation = VideoCreation.objects.select_for_update().get(id=creation_id)
            user = creation.user
            if creation.status != VideoCreation.Status.COMPLETED and creation.credit_cost > 0:
                original_cost = creation.credit_cost
                user.credit_balance += original_cost
                user.save(update_fields=['credit_balance'])
                
                creation.credit_cost = 0 
                creation.error_message = f"Task failed: {reason}. Credits have been refunded."
                creation.status = VideoCreation.Status.FAILED
                creation.save(update_fields=['credit_cost', 'error_message', 'status'])
                logger.info(f"REFUND: Refunded {original_cost} credits to {user.email} for creation {creation.id}.")
    except Exception as e:
        logger.error(f"CRITICAL: Failed to refund credits for creation {creation.id}. Error: {e}")

@shared_task(bind=True, max_retries=3, default_retry_delay=60, acks_late=True)
def generate_video_from_prompt(self, creation_id: str):
    creation = None
    try:
        creation = VideoCreation.objects.get(id=creation_id)
        creation.status = VideoCreation.Status.PROCESSING
        creation.save(update_fields=['status'])
        send_progress_update(creation.user.id, creation.id, "Queued: Preparing AI request...")
    except VideoCreation.DoesNotExist:
        return f"Creation with id {creation_id} not found."

    try:
        send_progress_update(creation.user.id, creation.id, "Step 1/4: Contacting AI model...")
        headers = {'Api-Key': settings.AZURE_OPENAI_API_KEY, 'Content-Type': 'application/json'}
        endpoint = settings.AZURE_OPENAI_ENDPOINT_URL
        api_version = "preview"
        init_url = f"{endpoint}openai/v1/video/generations/jobs?api-version={api_version}"
        height = int(creation.resolution.replace('p', ''))
        ar_width, ar_height = map(int, creation.aspect_ratio.split(':'))
        width = int(height * (ar_width / ar_height) // 2 * 2)
        body = {
            "prompt": creation.prompt, "model": settings.AZURE_SORA_DEPLOYMENT_NAME,
            "height": height, "width": width,
            "n_seconds": creation.duration, "n_variants": creation.n_variants,
        }
        
        job_response = requests.post(init_url, headers=headers, json=body, timeout=30)
        job_response.raise_for_status()
        job_id = job_response.json()["id"]

        send_progress_update(creation.user.id, creation.id, "Step 2/4: AI is generating your video...")
        status_url = f"{endpoint}openai/v1/video/generations/jobs/{job_id}?api-version={api_version}"
        
        status = "processing"
        status_data = {}
        max_wait_time = 30 * 60 
        elapsed_time = 0
        while status not in ["succeeded", "failed"] and elapsed_time < max_wait_time:
            time.sleep(15)
            elapsed_time += 15
            status_response = requests.get(status_url, headers=headers, timeout=20)
            status_response.raise_for_status()
            status_data = status_response.json()
            status = status_data.get("status")
        
        if status != "succeeded":
            # FIX: Definitive error parsing and logging.
            user_facing_error = "The AI service failed to process the request. Please try again later."
            
            # CRITICAL: Log the raw Azure response for debugging.
            logger.warning(f"RAW AZURE FAILURE for {creation.id}: {json.dumps(status_data, indent=2)}")

            error_data = status_data.get("error")
            if error_data:
                raw_message = error_data.get("message", "").lower()
                inner_error = error_data.get("innererror")
                
                # Check 1: Specific inner error code (most reliable).
                if inner_error and inner_error.get("code") == "ContentFilter":
                    user_facing_error = "Your prompt was rejected by the content safety filter. Please try rephrasing your request to be more general."
                # Check 2: Keywords in the main message (heuristic).
                elif "content" in raw_message and ("filter" in raw_message or "safety" in raw_message):
                     user_facing_error = "Your prompt was rejected by the content safety filter. Please rephrase your request to be more general."
                # Check 3: Use the Azure message if it exists.
                elif error_data.get("message"):
                    user_facing_error = error_data.get("message")

            if elapsed_time >= max_wait_time:
                 user_facing_error = f"The generation timed out after {max_wait_time // 60} minutes. The AI service may be under heavy load. Please try again later."
            
            raise Exception(user_facing_error)

        send_progress_update(creation.user.id, creation.id, "Step 3/4: Streaming file to your library...")
        
        generation_id = status_data["generations"][0]["id"]
        source_video_url = f'{endpoint}openai/v1/video/generations/{generation_id}/content/video?api-version={api_version}'
        target_blob_name = f'{creation.id}.mp4'

        blob_client = BlobClient(
            account_url=f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net",
            container_name='greaby-videos',
            blob_name=target_blob_name,
            credential=settings.AZURE_ACCOUNT_KEY
        )
        
        ai_headers = {'Api-Key': settings.AZURE_OPENAI_API_KEY}
        with requests.get(source_video_url, headers=ai_headers, stream=True, timeout=600) as response:
            response.raise_for_status()
            blob_client.upload_blob(response.iter_content(chunk_size=4 * 1024 * 1024), overwrite=True)

        logger.info(f"Successfully streamed video to blob storage: {target_blob_name}")
        
        send_progress_update(creation.user.id, creation.id, "Step 4/4: Finalizing...")
        
        with transaction.atomic():
            creation.result_file.name = target_blob_name
            creation.status = VideoCreation.Status.COMPLETED
            creation.error_message = None
            creation.save(update_fields=['result_file', 'status', 'error_message'])
            
            CreditUsage.objects.create(
                user=creation.user,
                usage_type=CreditUsage.UsageType.VIDEO,
                credits_spent=creation.credit_cost,
                description=f"Prompt: {creation.prompt[:100]}..."
            )
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{creation.user.id}',
            {'type': 'send_notification', 'message': {'event': 'creation_completed', 'creation_type': 'video', 'creation_id': str(creation.id)}}
        )
        if creation.duration >= 10:
            email_context = {
                'creation_type': 'Video', 'prompt': creation.prompt,
                'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=video"
            }
            send_template_email("Your Video Generation is Complete!", "emails/generation_complete.html", email_context, [creation.user.email])
        
        return f"Successfully processed video creation {creation.id}."

    except Exception as e:
        error_message = str(e)
        logger.error(f"ERROR during video generation for {creation.id}: {error_message}")
        if creation:
            refund_credits(creation_id, error_message)
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'user_{creation.user.id}',
                {'type': 'send_notification', 'message': {'event': 'creation_failed', 'creation_type': 'video', 'creation_id': str(creation.id)}}
            )
            email_context = {
                'creation_type': 'Video', 'prompt': creation.prompt, 'error': error_message,
                'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=video"
            }
            send_template_email("Your Video Generation Failed", "emails/generation_failed.html", email_context, [creation.user.email])
        
        return f"Failed and refunded video creation {creation.id}."