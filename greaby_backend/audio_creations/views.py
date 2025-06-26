# audio_creations/views.py

from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination # <--- ADD THIS IMPORT

from .models import AudioCreation
from .serializers import (
    AudioCreationRequestSerializer, 
    AudioCreationResponseSerializer,
    AudioCreationUpdateSerializer
)
from .tasks import generate_audio_from_text
from .services import calculate_audio_cost
from .voices import VOICE_CHOICES
from .costs import VOICE_MULTIPLIERS, DEFAULT_VOICE_MULTIPLIER


# Define a standard pagination class
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 9  # Number of items per page
    page_size_query_param = 'page_size'
    max_page_size = 50


class AudioCreationViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    pagination_class = StandardResultsSetPagination  # <--- ADD THIS LINE

    def get_queryset(self):
        # Order by creation date to ensure consistent pagination
        return AudioCreation.objects.filter(
            user=self.request.user,
            status=AudioCreation.Status.COMPLETED
        ).order_by('-created_at') # <--- ADD .order_by()

    def get_serializer_class(self):
        if self.action == 'create':
            return AudioCreationRequestSerializer
        if self.action in ['update', 'partial_update']:
            return AudioCreationUpdateSerializer
        return AudioCreationResponseSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        
        cost = calculate_audio_cost(
            text_input=validated_data['text_input'],
            response_format=validated_data['response_format'],
            voice=validated_data['voice']
        )
        
        user = request.user
        
        if user.credit_balance < cost:
            return Response(
                {"detail": f"Insufficient credits. This action costs {cost}, but you only have {user.credit_balance}."},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
            
        try:
            with transaction.atomic():
                user.credit_balance -= cost
                user.save(update_fields=['credit_balance'])
                
                creation = AudioCreation.objects.create(
                    user=user,
                    credit_cost=cost,
                    **validated_data
                )
        except Exception as e:
            return Response({"detail": "An unexpected error occurred. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        generate_audio_from_text.delay(str(creation.id))
        
        response_serializer = AudioCreationResponseSerializer(creation, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['get'], url_path='voice-options')
    def voice_options(self, request, *args, **kwargs):
        data = []
        for voice_id, display_name in VOICE_CHOICES:
            multiplier = VOICE_MULTIPLIERS.get(voice_id, DEFAULT_VOICE_MULTIPLIER)
            
            data.append({
                'id': voice_id,
                'name': display_name,
                'multiplier': float(multiplier)
            })
            
        return Response(data)