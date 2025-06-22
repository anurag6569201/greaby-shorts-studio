# backend/creations/tasks.py

import time
import requests
import json
from celery import shared_task
from django.conf import settings
from .models import Creation

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_video_from_prompt(self, creation_id: str):
    """
    Celery task to generate a video URL from Azure Sora API and save the URL.
    """
    try:
        creation = Creation.objects.get(id=creation_id)
    except Creation.DoesNotExist:
        return f"Creation with id {creation_id} not found. Task aborted."

    try:
        creation.status = Creation.Status.PROCESSING
        creation.save(update_fields=['status'])

        api_key = settings.AZURE_OPENAI_API_KEY
        headers = {'Api-Key': api_key, 'Content-Type': 'application/json'}
        api_version = "preview"
        base_endpoint = settings.AZURE_SORA_ENDPOINT_URL

        # 1. Initiate Generation Job (This part is unchanged)
        init_path = f"openai/v1/video/generations/jobs?api-version={api_version}"
        init_url = f"{base_endpoint}{init_path}"
        # ... (body construction logic is unchanged)
        height = int(creation.settings.get("resolution", "1080").replace('p', ''))
        aspect_ratio = creation.settings.get("aspectRatio", "16:9")
        ar_width, ar_height = map(int, aspect_ratio.split(':'))
        width = int(height * (ar_width / ar_height) // 2 * 2) 

        body = {
            "prompt": creation.prompt,
            "model": settings.AZURE_SORA_DEPLOYMENT_NAME,
            "height": height,
            "width": width,
            "n_seconds": int(creation.settings.get("duration", "10").replace('s', '')),
        }
        
        job_response = requests.post(init_url, headers=headers, json=body)
        job_response.raise_for_status()
        job_data = job_response.json()
        job_id = job_data["id"]
        status = job_data["status"]
        
        # 2. Poll for Job Completion (This part is unchanged)
        status_path = f"openai/v1/video/generations/jobs/{job_id}?api-version={api_version}"
        status_url = f"{base_endpoint}{status_path}"
        # ... (polling logic is unchanged)
        poll_interval = 15
        max_wait_time = 10 * 60
        elapsed_time = 0

        while status not in ["succeeded", "failed"] and elapsed_time < max_wait_time:
            time.sleep(poll_interval)
            elapsed_time += poll_interval
            response = requests.get(status_url, headers=headers)
            response.raise_for_status()
            status_data = response.json()
            status = status_data.get("status")

        if status == "failed":
            error_info = status_data.get("error", {"message": "Unknown Azure error."})
            raise Exception(f"Azure generation failed: {json.dumps(error_info)}")
        
        if status != "succeeded":
            raise Exception(f"Job timed out after {max_wait_time // 60} minutes with status: {status}")

        # --- TASK CHANGE HERE ---
        # 3. Construct and Save the Video URL (No Download)
        generation_id = status_data["generations"][0]["id"]
        
        # This is the direct, but temporary, URL to the video content on Azure.
        # Azure-provided URLs might expire, so this approach is best for immediate access.
        azure_video_path = f'openai/v1/video/generations/{generation_id}/content/video?api-version={api_version}'
        azure_full_url = f"{settings.AZURE_SORA_ENDPOINT_URL}{azure_video_path}"

        # Save the *internal* Azure URL to the database
        creation.result_url = azure_full_url # We will now call this internal_storage_url for clarity
        creation.status = Creation.Status.COMPLETED
        creation.error_message = None
        creation.save(update_fields=['result_url', 'status', 'error_message'])
    
        return f"Successfully processed creation {creation.id}. URL saved."

    except Exception as e:
        if 'creation' in locals():
            creation.status = Creation.Status.FAILED
            creation.error_message = str(e)[:1024]
            creation.save(update_fields=['status', 'error_message'])
        self.retry(exc=e)