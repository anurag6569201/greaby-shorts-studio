# translations/views.py

from django.db import transaction
from rest_framework import viewsets, status, parsers
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet
from PyPDF2 import PdfReader
from docx import Document as DocxDocument
from pptx import Presentation
import io
import logging

from .models import DocumentTranslation
from .serializers import DocumentTranslationRequestSerializer, DocumentTranslationResponseSerializer
from .tasks import start_document_translation_job
from .services import calculate_document_page_based_cost, calculate_document_char_based_cost
from users.models import User

class DocumentTranslationViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    parser_classes = (parsers.MultiPartParser, parsers.FormParser)

    def get_queryset(self):
        base_queryset = DocumentTranslation.objects.filter(user=self.request.user).select_related('user')
        if self.action == 'list':
            return base_queryset.exclude(status=DocumentTranslation.Status.FAILED).order_by('-created_at')
        return base_queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentTranslationRequestSerializer
        return DocumentTranslationResponseSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        uploaded_file = request.FILES['input_document']
        
        # --- SERVER-SIDE VALIDATION ---
        MAX_FILE_SIZE_MB = 25
        if uploaded_file.size > MAX_FILE_SIZE_MB * 1024 * 1024:
            return Response({"detail": f"File size cannot exceed {MAX_FILE_SIZE_MB}MB."}, status=status.HTTP_400_BAD_REQUEST)
        
        file_content = uploaded_file.read()
        uploaded_file.seek(0)
        file_stream = io.BytesIO(file_content)

        cost = 0
        content_type = uploaded_file.content_type
        
        # Page-based types
        if content_type == 'application/pdf' or content_type == 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            page_count = 0
            try:
                if content_type == 'application/pdf':
                    reader = PdfReader(file_stream)
                    page_count = len(reader.pages)
                else: # PPTX
                    prs = Presentation(file_stream)
                    page_count = len(prs.slides)
                
                if page_count > 20:
                    return Response({"detail": f"Files with more than 20 pages/slides are not supported."}, status=status.HTTP_400_BAD_REQUEST)
                cost = calculate_document_page_based_cost(page_count)

            except Exception:
                return Response({"detail": "Could not process the uploaded file. It may be corrupted."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Character-based types
        elif content_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or content_type == 'text/plain':
            char_count = 0
            try:
                if content_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    doc = DocxDocument(file_stream)
                    char_count = sum(len(p.text) for p in doc.paragraphs)
                else: # TXT
                    char_count = len(file_content.decode('utf-8', errors='ignore'))
                
                if char_count > 8000:
                    return Response({"detail": "Files with more than 8,000 characters are not supported for this file type."}, status=status.HTTP_400_BAD_REQUEST)
                cost = calculate_document_char_based_cost(char_count)

            except Exception:
                return Response({"detail": "Could not read the characters from the uploaded file."}, status=status.HTTP_400_BAD_REQUEST)
        
        else:
            return Response({"detail": "Unsupported file type."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Lock the user row to prevent race conditions
                user = User.objects.select_for_update().get(id=request.user.id)
                
                if user.credit_balance < cost:
                    return Response({"detail": f"Insufficient credits. This action costs {cost}, but you only have {user.credit_balance}."}, status=status.HTTP_402_PAYMENT_REQUIRED)
                
                user.credit_balance -= cost
                user.save(update_fields=['credit_balance'])
                translation = serializer.save(user=user, credit_cost=cost, status=DocumentTranslation.Status.PENDING, original_filename=uploaded_file.name, content_type=uploaded_file.content_type)
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error in document translation creation: {e}", exc_info=True)
            return Response({"detail": "An unexpected error occurred during setup. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        start_document_translation_job.delay(str(translation.id))
        response_serializer = DocumentTranslationResponseSerializer(translation, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

    def perform_destroy(self, instance):
        if instance.input_document:
            instance.input_document.delete(save=False)
        if instance.translated_document:
            instance.translated_document.delete(save=False)
        super().perform_destroy(instance)
        
class FailedDocumentTranslationViewSet(ReadOnlyModelViewSet):
    serializer_class = DocumentTranslationResponseSerializer
    def get_queryset(self):
        return DocumentTranslation.objects.filter(
            user=self.request.user, 
            status=DocumentTranslation.Status.FAILED
        ).order_by('-created_at')