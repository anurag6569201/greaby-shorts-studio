import requests
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.core.files.base import ContentFile

from .models import AudioCreation
from greaby_project.email_utils import send_template_email

def refund_credits_audio(creation_id: str, reason: str):
    """A helper function to atomically refund credits to a user for audio."""
    try:
        with transaction.atomic():
            creation = AudioCreation.objects.select_for_update().get(id=creation_id)
            user = creation.user
            if creation.status != AudioCreation.Status.COMPLETED and creation.credit_cost > 0:
                original_cost = creation.credit_cost
                user.credit_balance += original_cost
                user.save(update_fields=['credit_balance'])
                
                creation.credit_cost = 0
                creation.error_message = f"Task failed: {reason}. Credits have been refunded."
                creation.status = AudioCreation.Status.FAILED
                creation.save(update_fields=['credit_cost', 'error_message', 'status'])
                print(f"REFUND: Refunded {original_cost} credits to {user.email} for audio creation {creation.id}.")
    except AudioCreation.DoesNotExist:
        print(f"ERROR: Could not find audio creation {creation_id} to refund credits.")
    except Exception as e:
        print(f"CRITICAL: Failed to refund credits for audio creation {creation_id}. Error: {e}")

@shared_task(bind=True, max_retries=3, default_retry_delay=30, acks_late=True)
def generate_audio_from_text(self, creation_id: str):
    """
    Celery task to generate audio using Azure's TTS API.
    Handles saving the result to cloud storage and refunding credits on failure.
    """
    try:
        creation = AudioCreation.objects.get(id=creation_id)
        creation.status = AudioCreation.Status.PROCESSING
        creation.save(update_fields=['status'])
    except AudioCreation.DoesNotExist:
        return f"AudioCreation with id {creation_id} not found."

    try:
        # --- 1. Prepare Request to Azure ---
        api_key = settings.AZURE_OPENAI_API_KEY
        api_version = "2024-05-01-preview"
        
        url = (
            f"{settings.AZURE_OPENAI_ENDPOINT_URL}openai/deployments/"
            f"{settings.AZURE_TTS_DEPLOYMENT_NAME}/audio/speech?api-version={api_version}"
        )
        
        headers = { 'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json' }
        
        body = {
            "model": settings.AZURE_TTS_DEPLOYMENT_NAME,
            "input": creation.text_input, "voice": creation.voice,
            "response_format": creation.response_format, "speed": creation.speed,
        }
        
        # --- 2. Make API call ---
        response = requests.post(url, headers=headers, json=body, stream=True, timeout=60)
        
        if not response.ok:
            try:
                error_details = response.json()
                error_message = error_details.get("error", {}).get("message", response.text)
            except requests.exceptions.JSONDecodeError:
                error_message = response.text
            raise Exception(f"Azure TTS API failed with status {response.status_code}: {error_message}")

        # --- 3. Save the Result to Cloud Storage ---
        file_name = f'{creation.id}.{creation.response_format}'
        file_content = ContentFile(response.content)
        
        creation.result_file.save(file_name, file_content, save=False)
        creation.status = AudioCreation.Status.COMPLETED
        creation.error_message = None
        creation.save(update_fields=['result_file', 'status', 'error_message'])
    
        # --- 4. Send Success Email ---
        email_context = {
            'creation_type': 'Audio', 'prompt': creation.title,
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=audio"
        }
        send_template_email("Your Audio Generation is Complete!", "emails/generation_complete.html", email_context, [creation.user.email])
        
        return f"Successfully processed audio creation {creation.id}."

    except Exception as e:
        error_message = str(e)
        print(f"ERROR during audio generation for {creation_id}: {error_message}")
        refund_credits_audio(creation_id, error_message)

        # --- Send Failure Email ---
        email_context = {
            'creation_type': 'Audio', 'prompt': creation.title, 'error': error_message,
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=audio"
        }
        send_template_email("Your Audio Generation Failed", "emails/generation_failed.html", email_context, [creation.user.email])

        return f"Failed and refunded audio creation {creation_id}."