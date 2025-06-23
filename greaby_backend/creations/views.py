from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.response import Response

from .models import VideoCreation
from .serializers import VideoCreationRequestSerializer, VideoCreationResponseSerializer
from .tasks import generate_video_from_prompt
from .services import calculate_video_cost

class VideoCreationViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for listing, creating, and retrieving Video Creations.
    """
    
    def get_queryset(self):
        """Ensure users can only access their own creations."""
        return VideoCreation.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for creating vs. displaying."""
        if self.action == 'create':
            return VideoCreationRequestSerializer
        return VideoCreationResponseSerializer

    def create(self, request, *args, **kwargs):
        """
        Handles the creation of a new video generation task.
        This is the primary endpoint for SPENDING credits.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        
        # 1. Calculate the credit cost for this specific request
        cost = calculate_video_cost(
            resolution=validated_data['resolution'],
            duration=validated_data['duration'],
            n_variants=validated_data['n_variants']
        )
        
        user = request.user
        
        # 2. Check if the user has enough credits
        if user.credit_balance < cost:
            return Response(
                {"detail": f"Insufficient credits. This action costs {cost}, but you only have {user.credit_balance}."},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
            
        # 3. Use a transaction to deduct credits and create the object
        # This ensures the operation is atomic: both succeed or both fail.
        try:
            with transaction.atomic():
                # Deduct credits from the user's balance
                user.credit_balance -= cost
                user.save(update_fields=['credit_balance'])
                
                # Create the VideoCreation object, saving the cost
                creation = VideoCreation.objects.create(
                    user=user,
                    credit_cost=cost,
                    **validated_data
                )
        except Exception as e:
            # This should rarely happen, but it's a safeguard.
            print(f"ERROR: Transaction failed during video creation for user {user.email}: {e}")
            return Response({"detail": "An unexpected error occurred. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 4. Dispatch the background task
        generate_video_from_prompt.delay(str(creation.id))
        
        # 5. Return the newly created object's data
        response_serializer = VideoCreationResponseSerializer(creation, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

    # The default 'list' and 'retrieve' actions provided by ModelViewSet work perfectly here.
    # We do not allow 'update' or 'destroy' for these records to maintain a clear history.
    http_method_names = ['get', 'post', 'head', 'options']