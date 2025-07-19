# translations/tasks.py

import requests
import logging
from celery import shared_task
from django.conf import settings
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import DocumentTranslation
from .azure_blob_service import generate_container_sas_url
from billing.models import CreditUsage

logger = logging.getLogger(__name__)

def _send_progress_update(user_id, translation_id, status_message, event='creation_progress'):
    # ... (no changes in this function)
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

# --- NEW HELPER FUNCTION (inspired by your creations app) ---
def _refund_credits(translation_id: str, reason: str):
    """Refunds credits to the user if the translation failed."""
    try:
        with transaction.atomic():
            translation = DocumentTranslation.objects.select_for_update().get(id=translation_id)
            # Only refund if it hasn't been completed and cost is positive
            if translation.status != DocumentTranslation.Status.COMPLETED and translation.credit_cost > 0:
                user = translation.user
                original_cost = translation.credit_cost
                
                user.credit_balance += original_cost
                user.save(update_fields=['credit_balance'])
                
                translation.credit_cost = 0
                translation.error_message = f"Task failed: {reason[:450]}. Credits have been refunded."
                translation.status = DocumentTranslation.Status.FAILED
                translation.save(update_fields=['credit_cost', 'error_message', 'status'])
                
                logger.info(f"REFUND: Refunded {original_cost} credits to {user.email} for translation {translation.id}.")
                # Send a final 'failed' notification after refunding
                _send_progress_update(user.id, translation.id, f"Translation failed: {reason}", event='creation_failed')
    except DocumentTranslation.DoesNotExist:
         logger.warning(f"Could not refund credits for non-existent translation {translation_id}")
    except Exception as e:
        logger.error(f"CRITICAL: Failed to refund credits for translation {translation_id}. Error: {e}", exc_info=True)


@shared_task(bind=True)
def start_document_translation_job(self, translation_id: str):
    """
    Task to initiate an Azure Document Translation batch job.
    """
    translation = DocumentTranslation.objects.get(id=translation_id)
    try:
        translation.status = DocumentTranslation.Status.PROCESSING
        translation.save(update_fields=['status'])
        _send_progress_update(translation.user.id, translation.id, "Preparing document for translation...")

        source_container = translation.input_document.storage.azure_container
        target_container = translation.translated_document.storage.azure_container
        
        source_blob_name = translation.input_document.name
        logger.info(f"Azure filter is using blob name/prefix: '{source_blob_name}' in container '{source_container}'")
        source_url = generate_container_sas_url(source_container, "rl")
        target_url = generate_container_sas_url(target_container, "wl")

        endpoint = settings.AZURE_DOC_TRANSLATION_ENDPOINT
        path = '/translator/document/batches'
        constructed_url = f"{endpoint.rstrip('/')}{path}?api-version=2024-05-01"

        headers = {
            'Ocp-Apim-Subscription-Key': settings.AZURE_DOC_TRANSLATION_KEY,
            'Content-Type': 'application/json'
        }
        
        body = {
            "inputs": [{
                "source": { "sourceUrl": source_url, "storageSource": "AzureBlob", "filter": { "prefix": source_blob_name } },
                "targets": [{ "targetUrl": target_url, "storageSource": "AzureBlob", "language": translation.target_language }]
            }]
        }

        if translation.source_language and translation.source_language != 'auto':
            body['inputs'][0]['source']['language'] = translation.source_language

        response = requests.post(constructed_url, headers=headers, json=body)
        response.raise_for_status()

        operation_location_url = response.headers.get('Operation-Location')
        if not operation_location_url:
            raise ValueError("Azure API did not return an Operation-Location header.")
        
        job_id = operation_location_url.split('/batches/')[-1].split('?')[0]

        # No transaction or CreditUsage here, just save the job_id
        translation.job_id = job_id
        translation.save(update_fields=['job_id'])

        _send_progress_update(translation.user.id, translation.id, "Translation in progress...")
        
        monitor_document_translation_job.apply_async(args=[translation_id], countdown=30)
        return f"Successfully started translation job {job_id} for {translation_id}"

    except Exception as e:
        logger.error(f"Error starting translation for {translation_id}: {e}", exc_info=True)
        error_detail = str(e.response.text) if hasattr(e, 'response') and e.response else str(e)
        # --- FIX: Call refund function on submission failure ---
        _refund_credits(translation_id, f"Job submission failed: {error_detail}")
        return f"Failed to start translation for {translation_id}"


@shared_task(bind=True, max_retries=60, default_retry_delay=60)
def monitor_document_translation_job(self, translation_id: str):
    """Monitors the status of an ongoing Azure Document Translation job."""
    try:
        translation = DocumentTranslation.objects.get(id=translation_id)
        if not translation.job_id:
            logger.warning(f"No job_id for translation {translation_id}. Aborting monitor.")
            return

        endpoint = settings.AZURE_DOC_TRANSLATION_ENDPOINT
        path = f'/translator/document/batches/{translation.job_id}'
        constructed_url = f"{endpoint.rstrip('/')}{path}?api-version=2024-05-01"
        headers = {'Ocp-Apim-Subscription-Key': settings.AZURE_DOC_TRANSLATION_KEY}
        
        response = requests.get(constructed_url, headers=headers)
        response.raise_for_status()
        
        status_data = response.json()
        job_status = status_data.get('status')
        logger.info(f"Monitoring {translation_id}: Azure job status is '{job_status}'")

        if job_status == 'Succeeded':
            with transaction.atomic():
                translation.translated_document.name = translation.input_document.name
                translation.status = DocumentTranslation.Status.COMPLETED
                translation.characters_charged = status_data.get('summary', {}).get('totalCharactersCharged', 0)
                translation.save()
                
                # --- FIX: Log credit usage only on success ---
                CreditUsage.objects.create(
                    user=translation.user,
                    usage_type=CreditUsage.UsageType.DOCUMENT_TRANSLATION,
                    credits_spent=translation.credit_cost,
                    description=f"Document: {translation.original_filename[:150]}"
                )

            _send_progress_update(translation.user.id, translation.id, "Translation complete!", event='creation_completed')
            return f"Translation {translation_id} completed."

        elif job_status in ['NotStarted', 'Running']:
            raise self.retry()

        else: # Failed, Canceled, ValidationFailed
            error_info = status_data.get('error', {'message': 'No error details.'})
            error_message = f"Azure job {job_status}: {error_info.get('message')}"
            # --- FIX: Call refund function on Azure job failure ---
            _refund_credits(translation_id, error_message)
            return f"Translation {translation_id} job failed with status: {job_status}"

    except Exception as e:
        logger.error(f"Error monitoring job for {translation_id}: {e}", exc_info=True)
        try:
            raise self.retry(exc=e)
        except self.MaxRetriesExceededError:
            logger.critical(f"Max retries exceeded for monitoring {translation_id}. Marking as failed.")
            # --- FIX: Call refund function on timeout ---
            _refund_credits(translation_id, "Monitoring timed out. Could not get final status from provider.")