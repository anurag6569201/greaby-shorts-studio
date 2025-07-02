# video_translations/views.py

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta
from django.conf import settings
import uuid


from .models import VideoTranslation
from .serializers import VideoTranslationResponseSerializer
from .tasks import process_video_translation
from .locales import LOCALE_CHOICES
from greaby_project.storages import SourceMediaStorage
from audio_creations.tasks import send_progress_update

class VideoTranslationViewSet(viewsets.ModelViewSet):
    """
    Manages Video Translations using a secure direct-to-cloud upload flow.
    """
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        # Users should only see their own translations
        return VideoTranslation.objects.filter(user=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        return VideoTranslationResponseSerializer

    @action(detail=False, methods=['post'], url_path='initiate-upload')
    def initiate_upload(self, request, *args, **kwargs):
        """
        STEP 1: Client requests permission to upload a file.
        - Validates input metadata (title, locales, etc.).
        - Creates a `VideoTranslation` record with 'upload_pending' status.
        - Generates a write-only SAS URL for a unique blob in Azure.
        - Returns the `translationId` and the `uploadUrl` to the client.
        """
        # Validate required metadata from the client
        required_fields = ['title', 'filename', 'source_locale', 'target_locale']
        if not all(request.data.get(f) for f in required_fields):
            return Response({"detail": "Title, filename, source_locale, and target_locale are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create a unique path for the blob in cloud storage
        original_filename = request.data.get('filename')
        extension = original_filename.split('.')[-1] if '.' in original_filename else 'mp4'
        blob_name = f"video_translations/source/{uuid.uuid4()}.{extension}"

        # Create the database record to track this translation
        translation = VideoTranslation.objects.create(
            user=request.user,
            title=request.data.get('title'),
            source_locale=request.data.get('source_locale'),
            target_locale=request.data.get('target_locale'),
            speaker_count=request.data.get('speaker_count'),
            embed_subtitles=request.data.get('embed_subtitles', True),
            source_video_file=blob_name, # Store the blob path, not the actual file
            status=VideoTranslation.Status.UPLOAD_PENDING
        )

        # Generate a secure, short-lived Shared Access Signature (SAS) URL
        try:
            sas_token = generate_blob_sas(
                account_name=settings.AZURE_ACCOUNT_NAME,
                container_name=SourceMediaStorage().azure_container,
                blob_name=blob_name,
                account_key=settings.AZURE_ACCOUNT_KEY,
                permission=BlobSasPermissions(write=True, create=True),
                expiry=datetime.utcnow() + timedelta(hours=1) # URL is valid for 1 hour
            )
            upload_url = f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net/{SourceMediaStorage().azure_container}/{blob_name}?{sas_token}"
        except Exception as e:
            # Clean up the created DB record if SAS generation fails
            translation.delete()
            return Response({"detail": f"Could not generate upload URL: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Return the necessary info for the client to perform the direct upload
        return Response({
            'translationId': translation.id,
            'uploadUrl': upload_url,
            'translationData': self.get_serializer(translation).data # Send the full object for optimistic UI update
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='finalize-upload')
    def finalize_upload(self, request, pk=None):
        """
        STEP 2: Client confirms the direct upload to Azure is complete.
        - Finds the 'upload_pending' record.
        - Changes status to 'pending'.
        - Triggers the background Celery task to start the actual translation process.
        """
        try:
            translation = self.get_queryset().get(pk=pk, status=VideoTranslation.Status.UPLOAD_PENDING)
        except VideoTranslation.DoesNotExist:
            return Response({"detail": "Not found or upload already finalized."}, status=status.HTTP_404_NOT_FOUND)

        # TODO (Optional but recommended): Add a check here to verify the blob exists
        # in Azure storage before proceeding.

        translation.status = VideoTranslation.Status.PENDING
        translation.save(update_fields=['status'])

        # Hand off to Celery for the heavy lifting (cost calculation, Azure job, polling)
        process_video_translation.delay(str(translation.id))
        
        # Notify user via WebSocket that processing has officially started
        from audio_creations.tasks import send_progress_update
        send_progress_update(request.user.id, translation.id, "Queued for processing...", 'translation')

        return Response(self.get_serializer(translation).data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        """
        When a translation is deleted, also delete the source and result files from cloud storage.
        """
        # The default FileField behavior should handle deleting source_video_file.
        # If result files were also FileFields, they would be handled too.
        # Since they are URLs, we would need custom logic to delete them if required.
        super().perform_destroy(instance)

    @action(detail=False, methods=['get'], url_path='locale-options')
    def locale_options(self, request, *args, **kwargs):
        return Response(LOCALE_CHOICES)
    
    @action(detail=True, methods=['post'], url_path='retry')
    def retry_processing(self, request, pk=None):
        """
        Allows a user to retry a failed translation job.
        This should only be available for jobs that failed AFTER a successful upload.
        """
        try:
            # Find the specific translation, ensuring it belongs to the user and has failed.
            translation = self.get_queryset().get(pk=pk, status=VideoTranslation.Status.FAILED)
        except VideoTranslation.DoesNotExist:
            return Response({"detail": "Failed translation not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check if the failure was due to a missing file (which is not retryable this way)
        if not translation.source_video_file:
            return Response({"detail": "Cannot retry, source file is missing."}, status=status.HTTP_400_BAD_REQUEST)

        # Reset the status and error message for a fresh start
        translation.status = VideoTranslation.Status.PENDING
        translation.error_message = None
        translation.save(update_fields=['status', 'error_message'])

        # Re-queue the Celery task for processing
        process_video_translation.delay(str(translation.id))

        # Notify the user that the retry has been queued
        send_progress_update(request.user.id, translation.id, "Re-queued for processing...", 'translation')

        # Return the updated object so the frontend can display the new 'pending' status
        serializer = self.get_serializer(translation)
        return Response(serializer.data, status=status.HTTP_200_OK)