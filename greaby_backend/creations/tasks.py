import time
import requests
import json

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.core.files.base import ContentFile

from .models import VideoCreation

def refund_credits(creation_id: str, reason: str):
    """A helper function to atomically refund credits to a user."""
    try:
        with transaction.atomic():
            # Lock the row to prevent race conditions
            creation = VideoCreation.objects.select_for_update().get(id=creation_id)
            user = creation.user
            
            # Only refund if the creation is not already 'completed' and has a cost
            if creation.status != VideoCreation.Status.COMPLETED and creation.credit_cost > 0:
                user.credit_balance += creation.credit_cost
                user.save(update_fields=['credit_balance'])
                
                # Mark credits as refunded to prevent double refunds
                creation.credit_cost = 0 
                creation.error_message = f"Task failed: {reason}. Credits have been refunded."
                creation.status = VideoCreation.Status.FAILED
                creation.save(update_fields=['credit_cost', 'error_message', 'status'])
                print(f"REFUND: Refunded {creation.credit_cost} credits to {user.email} for creation {creation.id}.")
    except VideoCreation.DoesNotExist:
        print(f"ERROR: Could not find creation {creation_id} to refund credits.")
    except Exception as e:
        print(f"CRITICAL: Failed to refund credits for creation {creation_id}. Error: {e}")


@shared_task(bind=True, max_retries=3, default_retry_delay=60, acks_late=True)
def generate_video_from_prompt(self, creation_id: str):
    """
    Celery task to generate a video using Azure's async API.
    Handles polling, saving the result to cloud storage, and refunding credits on failure.
    """
    try:
        creation = VideoCreation.objects.get(id=creation_id)
        creation.status = VideoCreation.Status.PROCESSING
        creation.save(update_fields=['status'])
    except VideoCreation.DoesNotExist:
        return f"Creation with id {creation_id} not found."

    try:
        # --- 1. Prepare Request to Azure ---
        headers = {'Api-Key': settings.AZURE_OPENAI_API_KEY, 'Content-Type': 'application/json'}
        endpoint = settings.AZURE_OPENAI_ENDPOINT_URL
        api_version = "preview"
        init_url = f"{endpoint}openai/v1/video/generations/jobs?api-version={api_version}"

        # Calculate width/height from resolution and aspect ratio
        height = int(creation.resolution.replace('p', ''))
        ar_width, ar_height = map(int, creation.aspect_ratio.split(':'))
        width = int(height * (ar_width / ar_height) // 2 * 2) # Ensure width is even

        body = {
            "prompt": creation.prompt,
            "model": settings.AZURE_SORA_DEPLOYMENT_NAME,
            "height": height,
            "width": width,
            "n_seconds": creation.duration,
            "n_variants": creation.n_variants, # Using the new field
        }

        # --- 2. Initiate Generation Job ---
        job_response = requests.post(init_url, headers=headers, json=body, timeout=30)
        job_response.raise_for_status()
        job_data = job_response.json()
        job_id = job_data["id"]

        # --- 3. Poll for Job Completion ---
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

        if status == "failed":
            error_info = status_data.get("error", {"message": "Unknown Azure API error."})
            raise Exception(f"Azure generation failed: {json.dumps(error_info)}")
        
        if status != "succeeded":
            raise Exception(f"Job timed out after {max_wait_time // 60} minutes.")

        # --- 4. Download and Save the Result ---
        generation_id = status_data["generations"][0]["id"]
        video_url = f'{endpoint}openai/v1/video/generations/{generation_id}/content/video?api-version={api_version}'
        video_response = requests.get(video_url, headers=headers, timeout=60)
        video_response.raise_for_status()

        # The 'result_file.save()' method will automatically upload to Azure Blob Storage
        # because of our settings in greaby_project/settings.py.
        file_name = f'{creation.id}.mp4'
        file_content = ContentFile(video_response.content)
        creation.result_file.save(file_name, file_content, save=False)
        
        creation.status = VideoCreation.Status.COMPLETED
        creation.error_message = None
        creation.save(update_fields=['result_file', 'status', 'error_message'])
    
        return f"Successfully processed video creation {creation.id}."

    except Exception as e:
        error_message = str(e)
        print(f"ERROR during video generation for {creation_id}: {error_message}")
        # --- CRITICAL: Refund credits on any failure ---
        refund_credits(creation_id, error_message)
        # We don't retry here because the refund logic handles the final state.
        # Retrying could lead to multiple refunds.
        return f"Failed and refunded video creation {creation_id}."