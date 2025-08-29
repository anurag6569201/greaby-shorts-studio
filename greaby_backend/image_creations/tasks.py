import requests
import logging
import base64
import json
from io import BytesIO
import google.generativeai as genai
from django.conf import settings
from celery import shared_task
from django.db import transaction
from django.core.files.base import ContentFile
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import ImageCreation
from billing.models import CreditUsage

logger = logging.getLogger(__name__)

# --- send_progress_update and refund_credits_image are unchanged ---
def send_progress_update(user_id, creation_id, status_message, creation_type='image'):
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
    except Exception as e:
        logger.error(f"Failed to send progress update for image {creation_id}: {e}")

def refund_credits_image(creation_id: str, reason_details: dict):
    try:
        with transaction.atomic():
            creation = ImageCreation.objects.select_for_update().get(id=creation_id)
            if creation.status != ImageCreation.Status.COMPLETED and creation.credit_cost > 0:
                user = creation.user
                user.credit_balance += creation.credit_cost
                user.save(update_fields=['credit_balance'])
                
                error_message = reason_details.get('error', {}).get('message', "Task failed and credits have been refunded.")
                
                creation.credit_cost = 0
                creation.error_message = error_message
                creation.status = ImageCreation.Status.FAILED
                creation.save(update_fields=['credit_cost', 'error_message', 'status'])
    except Exception as e:
        logger.critical(f"CRITICAL: Failed to refund credits for image creation {creation_id}. Error: {e}")


# --- Helper function for processing Gemini's response ---
def _process_gemini_response(response, creation_id) -> str:
    """Downloads image from Gemini's file_uri and returns a b64 string."""
    if not response.parts:
        raise Exception("Gemini API returned no content parts.")

    file_data = response.parts[0].file_data
    if not file_data or not file_data.file_uri:
        raise Exception("Gemini API response did not contain a valid file URI.")
    
    image_uri = file_data.file_uri
    logger.info(f"Gemini returned image URI for creation {creation_id}: {image_uri}")

    image_response = requests.get(image_uri)
    image_response.raise_for_status()

    image_content_bytes = image_response.content
    b64_string = base64.b64encode(image_content_bytes).decode('utf-8')
    return b64_string

# --- NEW: Gemini function for GENERATE operation ---
def _execute_gemini_generate(creation: ImageCreation) -> str:
    """Executes an image GENERATE request using Gemini API."""
    logger.info(f"--- [GEMINI GENERATE START] Creation ID: {creation.id} ---")
    try:
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        model = genai.GenerativeModel('models/gemini-2.0-flash-preview-image-generation')
        
        # For generate, we only send the prompt
        response = model.generate_content([creation.prompt])
        
        return _process_gemini_response(response, creation.id)
    except Exception as e:
        logger.error(f"--- [GEMINI GENERATE API ERROR] for creation {creation.id}: {str(e)} ---")
        raise e

# --- Gemini function for EDIT operation ---
def _execute_gemini_edit(creation: ImageCreation) -> str:
    """Executes an image EDIT request using Gemini API."""
    logger.info(f"--- [GEMINI EDIT START] Creation ID: {creation.id} ---")
    try:
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        model = genai.GenerativeModel('models/gemini-2.5-flash-image-preview')
        
        image_bytes = creation.source_image.read()
        image_part = {"mime_type": "image/png", "data": image_bytes} 

        # For edit, we send the prompt AND the image
        response = model.generate_content([creation.prompt, image_part])

        return _process_gemini_response(response, creation.id)
    except Exception as e:
        logger.error(f"--- [GEMINI EDIT API ERROR] for creation {creation.id}: {str(e)} ---")
        raise e


@shared_task(bind=True)
def process_image_creation(self, creation_id: str):
    creation = None
    try:
        creation = ImageCreation.objects.get(id=creation_id)
        creation.status = ImageCreation.Status.PROCESSING
        creation.save(update_fields=['status'])
        send_progress_update(creation.user.id, creation.id, "Queued: Preparing request...")
    except ImageCreation.DoesNotExist:
        logger.error(f"ImageCreation with id {creation_id} not found.")
        return

    try:
        b64_string = None
        
        # --- NEW LOGIC BRANCH: Handles all 4 scenarios ---
        if creation.provider == ImageCreation.Provider.NANO_BANANA:
            send_progress_update(creation.user.id, creation.id, "Contacting Nano Banana service...")
            if creation.operation == ImageCreation.Operation.GENERATE:
                b64_string = _execute_gemini_generate(creation)
            else: # EDIT
                b64_string = _execute_gemini_edit(creation)
        
        else: # Default to Kontext Pro (Azure OpenAI)
            send_progress_update(creation.user.id, creation.id, "Contacting Kontext Pro service...")
            endpoint = settings.AZURE_OPENAI_ENDPOINT_URL
            api_key = settings.AZURE_OPENAI_API_KEY
            deployment = "FLUX.1-Kontext-pro"
            api_version = "2025-04-01-preview"
            base_path = f'openai/deployments/{deployment}/images'
            params = f'?api-version={api_version}'
            auth_headers = {'Authorization': f'Bearer {api_key}'}

            if creation.operation == ImageCreation.Operation.GENERATE:
                url = f"{endpoint}{base_path}/generations{params}"
                headers = {**auth_headers, 'Content-Type': 'application/json'}
                body = {
                    "prompt": creation.prompt, "n": creation.n, "size": creation.size,
                    "response_format": "b64_json", "model": deployment
                }
                response = requests.post(url, headers=headers, json=body)
            else: # EDIT
                url = f"{endpoint}{base_path}/edits{params}"
                files = {"image": (creation.source_image.name, creation.source_image.open('rb'), 'image/png')}
                data = {"prompt": creation.prompt, "n": creation.n, "size": creation.size, "model": deployment}
                response = requests.post(url, headers=auth_headers, data=data, files=files)

            if not response.ok:
                error_details = response.json()
                raise Exception(error_details)
            
            response_data = response.json()
            b64_string = response_data['data'][0]['b64_json']

        # --- COMMON LOGIC FOR SAVING THE RESULT ---
        send_progress_update(creation.user.id, creation.id, "Processing and saving result...")

        if not b64_string:
            raise Exception({"error": {"message": "Image generation failed to return data."}})

        image_data = base64.b64decode(b64_string)
        file_name = f'{creation.id}.png'
        file_content = ContentFile(image_data, name=file_name)

        with transaction.atomic():
            creation.result_file.save(file_name, file_content, save=False)
            creation.status = ImageCreation.Status.COMPLETED
            creation.error_message = None
            creation.save(update_fields=['result_file', 'status', 'error_message'])
            CreditUsage.objects.create(
                user=creation.user,
                usage_type=CreditUsage.UsageType.IMAGE,
                credits_spent=creation.credit_cost,
                description=f"Image {creation.get_provider_display()}: {creation.prompt[:100]}"
            )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{creation.user.id}',
            {'type': 'send_notification', 'message': {'event': 'creation_completed', 'creation_type': 'image', 'creation_id': str(creation.id)}}
        )

    except Exception as e:
        error_details_dict = e.args[0] if isinstance(e.args[0], dict) else {"error": {"message": str(e)}}
        logger.error(f"ERROR during image creation for {creation.id}: {str(e)}")
        if creation:
            refund_credits_image(creation.id, error_details_dict)
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'user_{creation.user.id}',
                {'type': 'send_notification', 'message': {'event': 'creation_failed', 'creation_type': 'image', 'creation_id': str(creation.id)}}
            )