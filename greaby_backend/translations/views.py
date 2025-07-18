from django.db import transaction
from rest_framework import viewsets, status, parsers
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import DocumentTranslation
from .serializers import DocumentTranslationRequestSerializer, DocumentTranslationResponseSerializer
from .tasks import translate_document
from .services import calculate_document_translation_cost

class DocumentTranslationViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    parser_classes = (parsers.MultiPartParser, parsers.FormParser) # To handle file uploads

    def get_queryset(self):
        base_queryset = DocumentTranslation.objects.filter(user=self.request.user)
        if self.action == 'list':
            # Exclude failed items from the main list view
            return base_queryset.exclude(status=DocumentTranslation.Status.FAILED).order_by('-created_at')
        return base_queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentTranslationRequestSerializer
        return DocumentTranslationResponseSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        cost = calculate_document_translation_cost()
        user = request.user
        
        if user.credit_balance < cost:
            return Response(
                {"detail": f"Insufficient credits. This action costs {cost}, but you only have {user.credit_balance}."},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        uploaded_file = request.FILES['input_document']
        
        try:
            with transaction.atomic():
                user.credit_balance -= cost
                user.save(update_fields=['credit_balance'])
                
                translation = serializer.save(
                    user=user,
                    credit_cost=cost,
                    original_filename=uploaded_file.name,
                    content_type=uploaded_file.content_type
                )
        except Exception as e:
            # This is a general catch-all; specific errors are better
            return Response({"detail": "An unexpected error occurred during setup. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Trigger the async task
        translate_document.delay(str(translation.id))
        
        response_serializer = DocumentTranslationResponseSerializer(translation, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)
    
    def perform_destroy(self, instance):
        # Delete both the input and translated files from blob storage
        if instance.input_document:
            instance.input_document.delete(save=False)
        if instance.translated_document:
            instance.translated_document.delete(save=False)
        
        super().perform_destroy(instance)
        
class FailedDocumentTranslationViewSet(ReadOnlyModelViewSet):
    """
    A separate, read-only endpoint for listing failed and refunded translations.
    """
    serializer_class = DocumentTranslationResponseSerializer

    def get_queryset(self):
        return DocumentTranslation.objects.filter(
            user=self.request.user, 
            status=DocumentTranslation.Status.FAILED
        ).order_by('-created_at')