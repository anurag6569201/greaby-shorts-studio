# creations/tasks.py

import time
import requests
import json
from celery import shared_task
from django.conf import settings
from .models import Creation

@shared_task(bind=True, max_retries=3, default_retry_delay=60, acks_late=True)
def generate_video_from_prompt(self, creation_id: str):
    try:
        creation = Creation.objects.get(id=creation_id)
    except Creation.DoesNotExist:
        return f"Creation with id {creation_id} not found."

    try:
        creation.status = Creation.Status.PROCESSING
        creation.save(update_fields=['status'])

        headers = {'Api-Key': settings.AZURE_OPENAI_API_KEY, 'Content-Type': 'application/json'}
        api_version = "preview"
        base_endpoint = settings.AZURE_SORA_ENDPOINT_URL

        # 1. Initiate Generation Job
        init_path = f"openai/v1/video/generations/jobs?api-version={api_version}"
        init_url = f"{base_endpoint}{init_path}"
        
        height = int(creation.settings.get("resolution", "480").replace('p', ''))
        aspect_ratio = creation.settings.get("aspectRatio", "1:1")
        ar_width, ar_height = map(int, aspect_ratio.split(':'))
        width = int(height * (ar_width / ar_height) // 2 * 2) # Ensure width is even

        body = {
            "prompt": creation.prompt,
            "model": settings.AZURE_SORA_DEPLOYMENT_NAME,
            "height": height,
            "width": width,
            "n_seconds": int(creation.settings.get("duration", "5s").replace('s', '')),
        }
        
        job_response = requests.post(init_url, headers=headers, json=body, timeout=20)
        job_response.raise_for_status()
        job_data = job_response.json()
        job_id = job_data["id"]
        
        # 2. Poll for Job Completion
        status_url = f"{base_endpoint}openai/v1/video/generations/jobs/{job_id}?api-version={api_version}"
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

        # 3. Construct and Save the Video URL
        generation_id = status_data["generations"][0]["id"]
        azure_video_path = f'openai/v1/video/generations/{generation_id}/content/video?api-version={api_version}'
        azure_full_url = f"{settings.AZURE_SORA_ENDPOINT_URL}{azure_video_path}"

        creation.result_url = azure_full_url
        creation.status = Creation.Status.COMPLETED
        creation.error_message = None
        creation.save(update_fields=['result_url', 'status', 'error_message'])
    
        return f"Successfully processed video creation {creation.id}."

    except Exception as e:
        if 'creation' in locals():
            creation.status = Creation.Status.FAILED
            creation.error_message = str(e)[:1024] # Truncate error message
            creation.save(update_fields=['status', 'error_message'])
        # Retry with exponential backoff
        self.retry(exc=e)