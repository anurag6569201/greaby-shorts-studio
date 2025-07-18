# translations/tasks.py

import requests
import logging
import uuid
import json
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.core.files.base import ContentFile
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import DocumentTranslation
from billing.models import CreditUsage

logger = logging.getLogger(__name__)

# This function can remain as is for sending WebSocket notifications
def _send_progress_update(user_id, translation_id, status_message, event='creation_progress'):
    """Sends a progress update to the user via WebSockets."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{user_id}',
            {
                'type': 'send_notification',
                'message': {
                    'event': event,
                    'creation_id': str(translation_id),
                    'creation_type': 'document',
                    'status_message': status_message,
                }
            }
        )
        logger.info(f"PROGRESS for translation {translation_id}: {status_message}")
    except Exception as e:
        logger.error(f"Failed to send progress update for translation {translation_id}: {e}")

@shared_task(bind=True)
def translate_document(self, translation_id: str):
    """
    Celery task built to STRICTLY follow the Text Translation API example.
    This version sends a HARDCODED text string, not the document content.
    """
    # --- HARDCODED CREDENTIALS AND SETTINGS ---
    # !! IMPORTANT !!
    # Replace the placeholder values below with your ACTUAL key, endpoint, and location.
    
    key = "BtYqRZti2t1hqi0EkET2SCmWKYLDxjzpIR5iLaTTFWM2Lqg3iyvKJQQJ99BGACGhslBXJ3w3AAAbACOGbKN3"     # e.g., "a1b2c3d4e5f67890a1b2c3d4e5f67890"
    # FIX: Removed the trailing slash from the endpoint URL
    endpoint = "https://greaby-doc.cognitiveservices.azure.com"
    location = "centralindia"    # e.g., "eastus"

    # --- End of Hardcoded Section ---

    # Fail fast if placeholders are not replaced
    if "YOUR_" in key or "YOUR_" in location:
        logger.critical("CRITICAL: You have not replaced the hardcoded placeholder credentials in translations/tasks.py.")
        return "Task failed: Hardcoded credentials are not set."
    
    try:
        translation = DocumentTranslation.objects.get(id=translation_id)
        _send_progress_update(translation.user.id, translation.id, "Processing translation...")
    except DocumentTranslation.DoesNotExist:
        logger.error(f"Translation with id {translation_id} not found.")
        return
        
    try:
        # 1. CONSTRUCT URL (from your example)
        path = '/translate'
        constructed_url = endpoint + path
        logger.info(f"Constructed Text Translation URL: {constructed_url}")

        # 2. DEFINE PARAMS (from your example)
        params = {
            'api-version': '3.0',
            'to': translation.target_language
        }
        if translation.source_language and translation.source_language != 'auto':
            params['from'] = translation.source_language
        
        # 3. DEFINE HEADERS (from your example)
        headers = {
            'Ocp-Apim-Subscription-Key': key,
            'Ocp-Apim-Subscription-Region': location,
            'Content-type': 'application/json',
            'X-ClientTraceId': str(uuid.uuid4())
        }

        # 4. DEFINE BODY (from your example)
        # NOTE: We are sending placeholder text because this API cannot read files.
        body = [{
            'text': 'This is a test of the Text Translation API. If you see this, the API call was successful.'
        }]
        logger.info(f"Sending hardcoded text for translation: \"{body[0]['text']}\"")
        
        # 5. MAKE THE REQUEST (from your example)
        request = requests.post(constructed_url, params=params, headers=headers, json=body)
        request.raise_for_status() # This will raise an error for bad responses (4xx or 5xx)

        # 6. PROCESS THE RESPONSE
        response_json = request.json()
        logger.info(f"Successfully received response: {response_json}")

        # --- Save the successful result ---
        # Since the result is text, not a file, we will save it for debugging.
        # We will create a simple text file with the JSON response.
        translated_text_content = json.dumps(response_json, indent=2)
        translated_filename = f"translated_text_{translation.id}.json"
        
        with transaction.atomic():
            translation.status = DocumentTranslation.Status.COMPLETED
            translation.error_message = "SUCCESS: API call was successful using the Text Translation method. The translated text is in the downloaded file."
            # Save the JSON response as a new file
            translation.translated_document.save(translated_filename, ContentFile(translated_text_content.encode('utf-8')), save=True)
            translation.save()

        _send_progress_update(translation.user.id, translation.id, "Placeholder translation complete!", event='creation_completed')
        return f"Successfully processed placeholder text translation {translation.id}"

    except Exception as e:
        logger.error(f"ERROR during text translation for {translation_id}: {e}", exc_info=True)
        # Attempt to get more detail from the error response
        error_detail = str(e)
        if hasattr(e, 'response') and e.response is not None:
             error_detail = e.response.text
             logger.error(f"Full error response from server: {error_detail}")

        # Update the model with the failure
        with transaction.atomic():
            translation.status = DocumentTranslation.Status.FAILED
            translation.error_message = f"Task failed: {error_detail[:500]}"
            translation.save()
        _send_progress_update(translation.user.id, translation.id, f"Translation failed: {error_detail}", event='creation_failed')
        return f"Failed text translation for {translation.id}"