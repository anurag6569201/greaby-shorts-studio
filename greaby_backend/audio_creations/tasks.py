# audio_creations/tasks.py

import requests
from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from .models import AudioCreation

@shared_task(bind=True, max_retries=3, default_retry_delay=30, acks_late=True)
def generate_audio_from_text(self, creation_id: str):
    try:
        creation = AudioCreation.objects.get(id=creation_id)
    except AudioCreation.DoesNotExist:
        return f"AudioCreation with id {creation_id} not found."

    try:
        creation.status = AudioCreation.Status.PROCESSING
        creation.save(update_fields=['status'])

        api_key = settings.AZURE_OPENAI_API_KEY
        api_version = "2024-02-15-preview"
        
        url = (
            f"{settings.AZURE_SORA_ENDPOINT_URL}openai/deployments/"
            f"{settings.AZURE_TTS_DEPLOYMENT_NAME}/audio/speech?api-version={api_version}"
        )
        
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        
        body = {
            "model": settings.AZURE_TTS_DEPLOYMENT_NAME,
            "input": creation.text_input,
            "voice": creation.settings.get("voice", "alloy"),
            "speed": float(creation.settings.get("speed", 1.0)),
        }
        
        response = requests.post(url, headers=headers, json=body, stream=True, timeout=30)
        
        if not response.ok:
            try:
                error_details = response.json()
                error_message = error_details.get("error", {}).get("message", response.text)
            except requests.exceptions.JSONDecodeError:
                error_message = response.text
            raise Exception(f"Azure TTS API request failed with status {response.status_code}: {error_message}")

        file_name = f'{creation.id}.mp3'
        file_content = ContentFile(response.content)
        
        creation.result_file.save(file_name, file_content, save=True)
        creation.status = AudioCreation.Status.COMPLETED
        creation.error_message = None
        creation.save(update_fields=['status', 'error_message'])
    
        return f"Successfully processed audio creation {creation.id}."

    except Exception as e:
        if 'creation' in locals():
            creation.status = AudioCreation.Status.FAILED
            creation.error_message = str(e)[:1024]
            creation.save(update_fields=['status', 'error_message'])
        self.retry(exc=e)