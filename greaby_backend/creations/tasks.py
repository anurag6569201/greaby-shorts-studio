import time
import requests
import json
from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from azure.identity import DefaultAzureCredential
from .models import Creation

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_video_from_prompt(self, creation_id: str):
    """Celery task to generate video using Azure Sora API."""
    try:
        creation = Creation.objects.get(id=creation_id)
        creation.status = Creation.Status.PROCESSING
        creation.save(update_fields=['status'])

        credential = DefaultAzureCredential()
        token = credential.get_token("https://cognitiveservices.azure.com/.default")
        headers = {'Authorization': f'Bearer {token.token}', 'Content-Type': 'application/json'}

        # 1. Initiate Generation Job
        api_version = "preview"
        init_url = f"{settings.AZURE_SORA_ENDPOINT_URL}openai/v1/video/generations/jobs?api-version={api_version}"
        body = {
            "prompt": creation.prompt,
            "model": settings.AZURE_SORA_DEPLOYMENT_NAME,
            "height": creation.settings.get("resolution", "1080").replace('p', ''),
            "width": "1080" if creation.settings.get("aspectRatio") == "1:1" else "1920",
            "n_seconds": str(creation.settings.get("duration", "10")).replace('s', ''),
        }
        
        job_response = requests.post(init_url, headers=headers, json=body)
        job_response.raise_for_status()
        
        job_data = job_response.json()
        job_id = job_data["id"]
        status = job_data["status"]
        
        # 2. Poll for Job Completion
        status_url = f"{settings.AZURE_SORA_ENDPOINT_URL}openai/v1/video/generations/jobs/{job_id}?api-version={api_version}"
        while status not in ["succeeded", "failed"]:
            time.sleep(15)
            response = requests.get(status_url, headers=headers)
            response.raise_for_status()
            status = response.json().get("status")

        if status == "failed":
            error_info = response.json().get("error", {"message": "Unknown Azure error."})
            raise Exception(f"Azure generation failed: {json.dumps(error_info)}")

        # 3. Download and Save the Video
        generation_id = response.json()["generations"][0]["id"]
        video_url = f'{settings.AZURE_SORA_ENDPOINT_URL}openai/v1/video/generations/{generation_id}/content/video?api-version={api_version}'
        video_response = requests.get(video_url, headers=headers, stream=True)
        video_response.raise_for_status()
        
        file_name = f'{creation.id}.mp4'
        creation.result_file.save(file_name, ContentFile(video_response.content))
        creation.status = Creation.Status.COMPLETED
        creation.save(update_fields=['result_file', 'status'])

    except Exception as e:
        if 'creation' in locals():
            creation.status = Creation.Status.FAILED
            creation.error_message = str(e)[:1024] # Truncate error if too long
            creation.save(update_fields=['status', 'error_message'])
        self.retry(exc=e)