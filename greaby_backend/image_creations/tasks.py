# image_creations/tasks.py

import requests
import logging
import base64
import json
from io import BytesIO
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.core.files.base import ContentFile
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import ImageCreation
from billing.models import CreditUsage

logger = logging.getLogger(__name__)

# NEW: Progress update function for images
def send_progress_update(user_id, creation_id, status_message, creation_type='image'):
    """Sends a progress update to the user via WebSocket."""
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
    # ... (this function remains unchanged)
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


@shared_task(bind=True)
def process_image_creation(self, creation_id: str):
    creation = None # Initialize creation to None
    try:
        creation = ImageCreation.objects.get(id=creation_id)
        creation.status = ImageCreation.Status.PROCESSING
        creation.save(update_fields=['status'])
        # NEW: Send initial progress update
        send_progress_update(creation.user.id, creation.id, "Queued: Preparing request...")

    except ImageCreation.DoesNotExist:
        logger.error(f"ImageCreation with id {creation_id} not found.")
        return

    try:
        endpoint = settings.AZURE_OPENAI_ENDPOINT_URL
        api_key = settings.AZURE_OPENAI_API_KEY
        deployment = "FLUX.1-Kontext-pro"
        api_version = "2025-04-01-preview"

        base_path = f'openai/deployments/{deployment}/images'
        params = f'?api-version={api_version}'
        auth_headers = {'Authorization': f'Bearer {api_key}'}

        if creation.operation == ImageCreation.Operation.GENERATE:
            # NEW: Send update before API call
            send_progress_update(creation.user.id, creation.id, "Step 1/2: Contacting generation service...")
            url = f"{endpoint}{base_path}/generations{params}"
            headers = {**auth_headers, 'Content-Type': 'application/json'}
            body = {
                "prompt": creation.prompt,
                "n": creation.n,
                "size": creation.size,
                "response_format": "b64_json",
                "model": deployment
            }
            logger.info("--- [IMAGE GENERATE DEBUG] ---")
            logger.info(f"Request URL: {url}")
            logger.info(f"Request Body: {json.dumps(body, indent=2)}")
            response = requests.post(url, headers=headers, json=body)
        
        else: # EDIT operation
            # NEW: Send update before API call
            send_progress_update(creation.user.id, creation.id, "Step 1/2: Contacting edit service...")
            url = f"{endpoint}{base_path}/edits{params}"
            files = {"image": (creation.source_image.name, creation.source_image.open('rb'), 'image/png')}
            data = {
                "prompt": creation.prompt,
                "n": creation.n,
                "size": creation.size,
                "model": deployment
            }
            logger.info("--- [IMAGE EDIT DEBUG] ---")
            logger.info(f"Request URL: {url}")
            response = requests.post(url, headers=auth_headers, data=data, files=files)

        if not response.ok:
            logger.error(f"--- [AZURE API ERROR] ---")
            logger.error(f"Status Code: {response.status_code}")
            try:
                error_details = response.json()
                logger.error(f"Error Body: {json.dumps(error_details, indent=2)}")
                raise Exception(error_details)
            except (json.JSONDecodeError, Exception) as e:
                error_details_dict = e.args[0] if isinstance(e.args[0], dict) else {"error": {"message": str(e)}}
                logger.error(f"ERROR during image creation for {creation.id}: {json.dumps(error_details_dict)}")
                refund_credits_image(creation.id, error_details_dict)
            
            response.raise_for_status()

        response_data = response.json()
        
        # NEW: Send update after successful API call
        send_progress_update(creation.user.id, creation.id, "Step 2/2: Processing and saving result...")

        b64_string = response_data['data'][0]['b64_json']
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
                description=f"Image {creation.operation}: {creation.prompt[:100]}"
            )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{creation.user.id}',
            {'type': 'send_notification', 'message': {'event': 'creation_completed', 'creation_type': 'image', 'creation_id': str(creation.id)}}
        )

    except Exception as e:
        error_details_dict = e.args[0] if isinstance(e.args[0], dict) else {"error": {"message": str(e)}}
        logger.error(f"ERROR during image creation for {creation.id}: {str(e)}")
        # Check if creation object exists before trying to refund
        if creation:
            refund_credits_image(creation.id, error_details_dict)
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'user_{creation.user.id}',
                {'type': 'send_notification', 'message': {'event': 'creation_failed', 'creation_type': 'image', 'creation_id': str(creation.id)}}
            )