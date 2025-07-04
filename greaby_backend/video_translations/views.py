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
from .services import calculate_translation_cost
from greaby_project.storages import SourceMediaStorage
from audio_creations.tasks import send_progress_update

class VideoTranslationViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return VideoTranslation.objects.filter(user=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        return VideoTranslationResponseSerializer

    @action(detail=False, methods=['get'], url_path='calculate-cost')
    def calculate_cost(self, request, *args, **kwargs):
        duration_str = request.query_params.get('duration_seconds')
        if not duration_str:
            return Response({"detail": "Query parameter 'duration_seconds' is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            duration_seconds = float(duration_str)
            if duration_seconds <= 0:
                raise ValueError("Duration must be positive.")
        except (ValueError, TypeError):
            return Response({"detail": "Invalid 'duration_seconds'. Must be a positive number."}, status=status.HTTP_400_BAD_REQUEST)

        cost = calculate_translation_cost(duration_seconds)
        return Response({'estimated_cost': cost})

    @action(detail=False, methods=['post'], url_path='initiate-upload')
    def initiate_upload(self, request, *args, **kwargs):
        required_fields = ['title', 'filename', 'source_locale', 'target_locale']
        if not all(request.data.get(f) for f in required_fields):
            return Response({"detail": "Title, filename, source_locale, and target_locale are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        original_filename = request.data.get('filename')
        extension = original_filename.split('.')[-1] if '.' in original_filename else 'mp4'
        blob_name = f"video_translations/source/{uuid.uuid4()}.{extension}"

        translation = VideoTranslation.objects.create(
            user=request.user,
            title=request.data.get('title'),
            source_locale=request.data.get('source_locale'),
            target_locale=request.data.get('target_locale'),
            speaker_count=request.data.get('speaker_count'),
            embed_subtitles=request.data.get('embed_subtitles', True),
            source_video_file=blob_name,
            status=VideoTranslation.Status.UPLOAD_PENDING
        )

        try:
            sas_token = generate_blob_sas(
                account_name=settings.AZURE_ACCOUNT_NAME,
                container_name=SourceMediaStorage().azure_container,
                blob_name=blob_name,
                account_key=settings.AZURE_ACCOUNT_KEY,
                permission=BlobSasPermissions(write=True, create=True),
                expiry=datetime.utcnow() + timedelta(hours=1)
            )
            upload_url = f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net/{SourceMediaStorage().azure_container}/{blob_name}?{sas_token}"
        except Exception as e:
            translation.delete()
            return Response({"detail": f"Could not generate upload URL: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'translationId': translation.id,
            'uploadUrl': upload_url,
            'translationData': self.get_serializer(translation).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='finalize-upload')
    def finalize_upload(self, request, pk=None):
        try:
            translation = self.get_queryset().get(pk=pk, status=VideoTranslation.Status.UPLOAD_PENDING)
        except VideoTranslation.DoesNotExist:
            return Response({"detail": "Not found or upload already finalized."}, status=status.HTTP_404_NOT_FOUND)

        translation.status = VideoTranslation.Status.PENDING
        translation.save(update_fields=['status'])

        process_video_translation.delay(str(translation.id))
        
        send_progress_update(request.user.id, translation.id, "Queued for processing...", 'translation')

        return Response(self.get_serializer(translation).data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        super().perform_destroy(instance)

    @action(detail=False, methods=['get'], url_path='locale-options')
    def locale_options(self, request, *args, **kwargs):
        return Response(LOCALE_CHOICES)
    
    @action(detail=True, methods=['post'], url_path='retry')
    def retry_processing(self, request, pk=None):
        try:
            translation = self.get_queryset().get(pk=pk, status=VideoTranslation.Status.FAILED)
        except VideoTranslation.DoesNotExist:
            return Response({"detail": "Failed translation not found."}, status=status.HTTP_404_NOT_FOUND)

        if not translation.source_video_file:
            return Response({"detail": "Cannot retry, source file is missing."}, status=status.HTTP_400_BAD_REQUEST)

        translation.status = VideoTranslation.Status.PENDING
        translation.error_message = None
        translation.save(update_fields=['status', 'error_message'])

        process_video_translation.delay(str(translation.id))

        send_progress_update(request.user.id, translation.id, "Re-queued for processing...", 'translation')

        serializer = self.get_serializer(translation)
        return Response(serializer.data, status=status.HTTP_200_OK)