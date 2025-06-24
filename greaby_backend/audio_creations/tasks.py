import requests
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.core.files.base import ContentFile
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import AudioCreation
from greaby_project.email_utils import send_template_email

# --- We can use the same helper function, just need to import it ---
# (It's better to move this to a shared location like `notifications/utils.py`
# but for now, we can redefine it here for simplicity and to be self-contained)

def send_progress_update(user_id, creation_id, status_message, creation_type='audio'):
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
                    'creation_type': creation_type,
                    'status_message': status_message,
                }
            }
        )
        print(f"PROGRESS for {creation_id}: {status_message}")
    except Exception as e:
        print(f"Failed to send progress update: {e}")


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
    except Exception as e:
        print(f"CRITICAL: Failed to refund credits for audio creation {creation.id}. Error: {e}")

@shared_task(bind=True, max_retries=3, default_retry_delay=30, acks_late=True)
def generate_audio_from_text(self, creation_id: str):
    creation = None
    try:
        creation = AudioCreation.objects.get(id=creation_id)
        creation.status = AudioCreation.Status.PROCESSING
        creation.save(update_fields=['status'])
        send_progress_update(creation.user.id, creation.id, "Queued: Preparing AI request...")
    except AudioCreation.DoesNotExist:
        return f"AudioCreation with id {creation_id} not found."

    try:
        # --- 1. Prepare Request to Azure ---
        send_progress_update(creation.user.id, creation.id, "Step 1/3: Contacting AI model...")
        api_key = settings.AZURE_OPENAI_API_KEY
        api_version = "2024-05-01-preview"
        url = ( f"{settings.AZURE_OPENAI_ENDPOINT_URL}openai/deployments/"
                f"{settings.AZURE_TTS_DEPLOYMENT_NAME}/audio/speech?api-version={api_version}" )
        headers = { 'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json' }
        body = {
            "model": settings.AZURE_TTS_DEPLOYMENT_NAME, "input": creation.text_input, "voice": creation.voice,
            "response_format": creation.response_format, "speed": creation.speed,
        }
        
        # --- 2. Make API call ---
        send_progress_update(creation.user.id, creation.id, "Step 2/3: AI is generating your audio...")
        response = requests.post(url, headers=headers, json=body, stream=True, timeout=60)
        
        if not response.ok:
            try:
                error_message = response.json().get("error", {}).get("message", response.text)
            except requests.exceptions.JSONDecodeError:
                error_message = response.text
            raise Exception(f"Azure TTS API failed: {error_message}")

        # --- 3. Save the Result to Cloud Storage ---
        send_progress_update(creation.user.id, creation.id, "Step 3/3: Finalizing...")
        file_name = f'{creation.id}.{creation.response_format}'
        file_content = ContentFile(response.content)
        creation.result_file.save(file_name, file_content, save=False)
        creation.status = AudioCreation.Status.COMPLETED
        creation.error_message = None
        creation.save(update_fields=['result_file', 'status', 'error_message'])
    
        # --- Send Final 'Completed' Notification ---
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{creation.user.id}',
            {'type': 'send_notification', 'message': {'event': 'creation_completed', 'creation_type': 'audio', 'creation_id': str(creation.id)}}
        )

        email_context = {
            'creation_type': 'Audio', 'prompt': creation.title,
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=audio"
        }
        send_template_email("Your Audio Generation is Complete!", "emails/generation_complete.html", email_context, [creation.user.email])
        
        return f"Successfully processed audio creation {creation.id}."

    except Exception as e:
        error_message = str(e)
        print(f"ERROR during audio generation for {creation_id}: {error_message}")
        if creation:
            refund_credits_audio(creation_id, error_message)
            # --- Send Final 'Failed' Notification ---
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'user_{creation.user.id}',
                {'type': 'send_notification', 'message': {'event': 'creation_failed', 'creation_type': 'audio', 'creation_id': str(creation.id)}}
            )
            email_context = {
                'creation_type': 'Audio', 'prompt': creation.title, 'error': error_message,
                'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=audio"
            }
            send_template_email("Your Audio Generation Failed", "emails/generation_failed.html", email_context, [creation.user.email])
        
        return f"Failed and refunded audio creation {creation_id}."