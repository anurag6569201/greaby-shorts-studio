from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.response import Response

from .models import VideoCreation
from billing.models import CreditUsage
from .serializers import VideoCreationRequestSerializer, VideoCreationResponseSerializer
from .tasks import generate_video_from_prompt
from .services import calculate_video_cost

class VideoCreationViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return VideoCreation.objects.filter(user=self.request.user,status=VideoCreation.Status.COMPLETED)

    def get_serializer_class(self):
        if self.action == 'create':
            return VideoCreationRequestSerializer
        return VideoCreationResponseSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        
        cost = calculate_video_cost(
            resolution=validated_data['resolution'],
            duration=validated_data['duration'],
            n_variants=validated_data['n_variants']
        )
        
        user = request.user
        
        if user.credit_balance < cost:
            return Response(
                {"detail": f"Insufficient credits. This action costs {cost}, but you only have {user.credit_balance}."},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
            
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
                
                # --- NEW: Log this transaction ---
                CreditUsage.objects.create(
                    user=user,
                    usage_type=CreditUsage.UsageType.VIDEO,
                    credits_spent=cost,
                    description=f"Prompt: {validated_data['prompt'][:100]}..."
                )

        except Exception as e:
            print(f"ERROR: Transaction failed during video creation for user {user.email}: {e}")
            return Response({"detail": "An unexpected error occurred. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        generate_video_from_prompt.delay(str(creation.id))
        
        response_serializer = VideoCreationResponseSerializer(creation, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)