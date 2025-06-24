import time
import requests
import json
from celery import shared_task
from django.conf import settings
from django.db import transaction
from azure.storage.blob import BlobClient

from greaby_project.email_utils import send_template_email
from .models import VideoCreation

def refund_credits(creation_id: str, reason: str):
    """A helper function to atomically refund credits to a user."""
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
                print(f"REFUND: Refunded {original_cost} credits to {user.email} for creation {creation.id}.")
    except VideoCreation.DoesNotExist:
        print(f"ERROR: Could not find creation {creation_id} to refund credits.")
    except Exception as e:
        print(f"CRITICAL: Failed to refund credits for creation {creation_id}. Error: {e}")


@shared_task(bind=True, max_retries=3, default_retry_delay=60, acks_late=True)
def generate_video_from_prompt(self, creation_id: str):
    """
    Celery task to generate a video and save it via a direct server-side copy.
    """
    try:
        creation = VideoCreation.objects.get(id=creation_id)
        creation.status = VideoCreation.Status.PROCESSING
        creation.save(update_fields=['status'])
    except VideoCreation.DoesNotExist:
        return f"Creation with id {creation_id} not found."

    try:
        # --- 1. Prepare Request to Azure AI ---
        headers = {'Api-Key': settings.AZURE_OPENAI_API_KEY, 'Content-Type': 'application/json'}
        endpoint = settings.AZURE_OPENAI_ENDPOINT_URL
        api_version = "preview"
        init_url = f"{endpoint}openai/v1/video/generations/jobs?api-version={api_version}"

        height = int(creation.resolution.replace('p', ''))
        ar_width, ar_height = map(int, creation.aspect_ratio.split(':'))
        width = int(height * (ar_width / ar_height) // 2 * 2)

        body = {
            "prompt": creation.prompt,
            "model": settings.AZURE_SORA_DEPLOYMENT_NAME,
            "height": height, "width": width,
            "n_seconds": creation.duration, "n_variants": creation.n_variants,
        }

        # --- 2. Initiate AI Generation Job ---
        job_response = requests.post(init_url, headers=headers, json=body, timeout=30)
        job_response.raise_for_status()
        job_data = job_response.json()
        job_id = job_data["id"]

        # --- 3. Poll for AI Job Completion ---
        status_url = f"{endpoint}openai/v1/video/generations/jobs/{job_id}?api-version={api_version}"
        status = job_data["status"]
        poll_interval = 15
        max_wait_time = 15 * 60 # 15 minutes
        elapsed_time = 0

        while status not in ["succeeded", "failed"] and elapsed_time < max_wait_time:
            time.sleep(poll_interval)
            elapsed_time += poll_interval
            status_response = requests.get(status_url, headers=headers, timeout=20)
            status_response.raise_for_status()
            status_data = status_response.json()
            status = status_data.get("status")

        if status != "succeeded":
            error_info = status_data.get("error", {"message": "Job timed out or failed."})
            raise Exception(f"Azure generation failed: {json.dumps(error_info)}")
        
        # --- 4. Start Server-Side Copy to Our Blob Storage ---
        generation_id = status_data["generations"][0]["id"]
        source_video_url = f'{endpoint}openai/v1/video/generations/{generation_id}/content/video?api-version={api_version}'
        target_blob_name = f'{creation.id}.mp4'

        blob_client = BlobClient(
            account_url=f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net",
            container_name='greaby-videos',
            blob_name=target_blob_name,
            credential=settings.AZURE_ACCOUNT_KEY
        )
        
        copy_poller = blob_client.start_copy_from_url(source_video_url)
        copy_poller.wait(timeout=300) # Wait up to 5 minutes for the copy to complete

        copy_status = blob_client.get_blob_properties().copy.status
        if copy_status != 'success':
            raise Exception(f"Azure Blob Storage server-side copy failed with status: {copy_status}")

        print(f"Successfully copied video to blob storage: {target_blob_name}")
        
        # --- 5. Update Database Record ---
        creation.result_file.name = target_blob_name
        creation.status = VideoCreation.Status.COMPLETED
        creation.error_message = None
        creation.save(update_fields=['result_file', 'status', 'error_message'])
    
        # --- 6. Send Success Email ---
        email_context = {
            'creation_type': 'Video', 'prompt': creation.prompt,
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=video"
        }
        send_template_email("Your Video Generation is Complete!", "emails/generation_complete.html", email_context, [creation.user.email])
        
        return f"Successfully processed video creation {creation.id} via server-side copy."

    except Exception as e:
        error_message = str(e)
        print(f"ERROR during video generation for {creation_id}: {error_message}")
        refund_credits(creation_id, error_message)
        
        email_context = {
            'creation_type': 'Video', 'prompt': creation.prompt, 'error': error_message,
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=video"
        }
        send_template_email("Your Video Generation Failed", "emails/generation_failed.html", email_context, [creation.user.email])
        
        return f"Failed and refunded video creation {creation_id}."