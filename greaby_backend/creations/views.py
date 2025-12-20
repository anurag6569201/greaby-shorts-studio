from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet
import logging

from .models import VideoCreation
from .serializers import VideoCreationRequestSerializer, VideoCreationResponseSerializer
from .tasks import generate_video_from_prompt
from .services import calculate_video_cost
from .ai_planner import VideoPlanner
from users.models import User

logger = logging.getLogger(__name__)

class VideoCreationViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        base_queryset = VideoCreation.objects.filter(user=self.request.user).select_related('user')
        if self.action == 'list':
            return base_queryset.exclude(status=VideoCreation.Status.FAILED).order_by('-created_at')
        return base_queryset

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
                
                creation = VideoCreation.objects.create(
                    user=user,
                    credit_cost=cost,
                    **validated_data
                )

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in video creation: {e}", exc_info=True)
            return Response({"detail": "An unexpected error occurred. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        generate_video_from_prompt.delay(str(creation.id))
        
        response_serializer = VideoCreationResponseSerializer(creation, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)
    
    def perform_destroy(self, instance):
        instance.result_file.delete(save=False)
        super().perform_destroy(instance)
        
class FailedVideoCreationViewSet(ReadOnlyModelViewSet):
    serializer_class = VideoCreationResponseSerializer

    def get_queryset(self):
        return VideoCreation.objects.filter(
            user=self.request.user,
            status=VideoCreation.Status.FAILED
        ).order_by('-created_at')

class VideoPlanningView(APIView):
    """
    API View to generate a detailed video plan using Azure OpenAI.
    """
    def post(self, request, *args, **kwargs):
        prompt = request.data.get('prompt')
        if not prompt:
            return Response({"detail": "Prompt is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(prompt) > 5000:
            return Response({"detail": "Prompt is too long. Maximum 5000 characters."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            planner = VideoPlanner()
            # Check if API key is configured
            if not planner.api_key:
                 return Response(
                     {"detail": "Azure OpenAI API key is not configured. Please set AZURE_OPENAI_API_KEY environment variable."}, 
                     status=status.HTTP_503_SERVICE_UNAVAILABLE
                 )

            plan = planner.generate_plan(prompt)
            
            if "error" in plan:
                logger.error(f"Video planning error: {plan.get('error')}")
                return Response(plan, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            return Response(plan, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in video planning: {e}", exc_info=True)
            return Response({"detail": "An unexpected error occurred. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)