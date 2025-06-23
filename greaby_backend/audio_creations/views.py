from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.response import Response

from .models import AudioCreation
from .serializers import (
    AudioCreationRequestSerializer, 
    AudioCreationResponseSerializer,
    AudioCreationUpdateSerializer
)
from .tasks import generate_audio_from_text
from .services import calculate_audio_cost

class AudioCreationViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for listing, creating, retrieving, and updating Audio Creations.
    """
    
    def get_queryset(self):
        """Ensure users can only access their own creations."""
        return AudioCreation.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        """Use different serializers based on the action."""
        if self.action == 'create':
            return AudioCreationRequestSerializer
        if self.action in ['update', 'partial_update']:
            return AudioCreationUpdateSerializer
        return AudioCreationResponseSerializer

    def create(self, request, *args, **kwargs):
        """
        Handles the creation of a new audio generation task.
        This is the primary endpoint for SPENDING credits on audio.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        
        # 1. Calculate the credit cost for this specific request
        cost = calculate_audio_cost(
            text_input=validated_data['text_input'],
            response_format=validated_data['response_format']
        )
        
        user = request.user
        
        # 2. Check if the user has enough credits
        if user.credit_balance < cost:
            return Response(
                {"detail": f"Insufficient credits. This action costs {cost}, but you only have {user.credit_balance}."},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
            
        # 3. Use a transaction to deduct credits and create the object
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
            print(f"ERROR: Transaction failed during audio creation for user {user.email}: {e}")
            return Response({"detail": "An unexpected error occurred. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 4. Dispatch the background task
        generate_audio_from_text.delay(str(creation.id))
        
        # 5. Return the newly created object's data
        response_serializer = AudioCreationResponseSerializer(creation, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

    # We allow PATCH for updating the title, but not full PUT.
    # We do not allow DELETE to maintain a clear history.
    http_method_names = ['get', 'post', 'patch', 'head', 'options']