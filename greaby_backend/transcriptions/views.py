# transcriptions/views.py

from django.db import transaction
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
import logging

from .models import Transcription
from billing.models import CreditUsage
from .serializers import TranscriptionRequestSerializer, TranscriptionResponseSerializer
from .tasks import process_transcription_job
from .services import calculate_transcription_cost
from .format_converter import to_plain_text, to_srt
from users.models import User

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'results': data
        })

class TranscriptionViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    parser_classes = (MultiPartParser, FormParser)
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Transcription.objects.filter(user=self.request.user).select_related('user').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return TranscriptionRequestSerializer
        return TranscriptionResponseSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        
        duration_minutes = validated_data.pop('duration_minutes')
        
        cost = calculate_transcription_cost(
            duration_minutes=duration_minutes,
            enable_speaker_separation=validated_data.get('enable_speaker_separation', False)
        )
        
        try:
            with transaction.atomic():
                # Lock the user row to prevent race conditions
                user = User.objects.select_for_update().get(id=request.user.id)
                
                if user.credit_balance < cost:
                    return Response(
                        {"detail": f"Insufficient credits. This action costs {cost}, but you only have {user.credit_balance}."},
                        status=status.HTTP_402_PAYMENT_REQUIRED
                    )
                
                user.credit_balance -= cost
                user.save(update_fields=['credit_balance'])
                
                creation = Transcription.objects.create(
                    user=user,
                    credit_cost=cost,
                    **validated_data
                )

                CreditUsage.objects.create(
                    user=user,
                    usage_type=CreditUsage.UsageType.TRANSCRIPTION,
                    credits_spent=cost,
                    description=f"Transcription: {creation.title[:100]}"
                )
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error in transcription creation: {e}", exc_info=True)
            return Response({"detail": "An unexpected error occurred. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        process_transcription_job.delay(str(creation.id))
        
        response_serializer = TranscriptionResponseSerializer(creation, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

    def perform_destroy(self, instance):
        if instance.source_file:
            instance.source_file.delete(save=False)
        if instance.result_file:
            instance.result_file.delete(save=False)
        super().perform_destroy(instance)

class DownloadTranscriptionView(APIView):
    def get(self, request, pk, *args, **kwargs):
        try:
            transcription = Transcription.objects.get(pk=pk, user=request.user)
        except Transcription.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if transcription.status != Transcription.Status.COMPLETED or not transcription.result_file:
            return Response({"detail": "Transcription is not complete or result file is missing."}, status=status.HTTP_404_NOT_FOUND)

        output_format = request.query_params.get('format', 'txt').lower()

        try:
            # Check file size first
            if transcription.result_file.size > 10 * 1024 * 1024:  # 10MB limit
                return Response({"detail": "File too large to download."}, status=status.HTTP_400_BAD_REQUEST)
            
            with transcription.result_file.open('r') as f:
                json_content = f.read().decode('utf-8')
        except Exception as e:
            logger.error(f"Error reading transcription file {pk}: {e}", exc_info=True)
            return Response({"detail": "Could not read result file."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if output_format == 'srt':
            content = to_srt(json_content)
            content_type = 'text/srt'
            filename = f'{transcription.title}.srt'
        elif output_format == 'json':
            content = json_content
            content_type = 'application/json'
            filename = f'{transcription.title}.json'
        else:
            content = to_plain_text(json_content)
            content_type = 'text/plain'
            filename = f'{transcription.title}.txt'
        
        response = HttpResponse(content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response