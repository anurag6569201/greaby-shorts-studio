# image_creations/views.py

from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.viewsets import ReadOnlyModelViewSet
import logging

from .models import ImageCreation
from .serializers import (
    ImageGenerationRequestSerializer,
    ImageEditRequestSerializer,
    ImageCreationResponseSerializer
)
from .tasks import process_image_creation
from .services import calculate_image_cost
from users.models import User

class ImageCreationViewSet(viewsets.ModelViewSet): 
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    serializer_class = ImageCreationResponseSerializer

    def get_queryset(self):
        base_queryset = ImageCreation.objects.filter(user=self.request.user).select_related('user')
        if self.action == 'list':
            return base_queryset.exclude(status=ImageCreation.Status.FAILED).order_by('-created_at')
        return base_queryset

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request, *args, **kwargs):
        serializer = ImageGenerationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        quality = data.get('quality', ImageCreation.Quality.STANDARD)
        cost = calculate_image_cost(n=data['n'], size=data['size'], quality=quality)

        try:
            with transaction.atomic():
                # Lock the user row to prevent race conditions
                user = User.objects.select_for_update().get(id=request.user.id)
                
                if user.credit_balance < cost:
                    return Response({"detail": "Insufficient credits."}, status=status.HTTP_402_PAYMENT_REQUIRED)
                
                user.credit_balance -= cost
                user.save(update_fields=['credit_balance'])
                
                creation = ImageCreation.objects.create(
                    user=user,
                    credit_cost=cost,
                    operation=ImageCreation.Operation.GENERATE,
                    **data
                )
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error in image generation: {e}", exc_info=True)
            return Response({"detail": "An error occurred during transaction."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        process_image_creation.delay(str(creation.id))
        response_serializer = self.get_serializer(creation)
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['post'], url_path='edit', parser_classes=[MultiPartParser, FormParser])
    def edit(self, request, *args, **kwargs):
        # --- FIX IS HERE: PASS request.data DIRECTLY ---
        serializer = ImageEditRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        images = validated_data['image']
        num_images = len(images)
        provider = validated_data['provider']

        quality_for_cost = 'standard'
        
        cost_per_image = calculate_image_cost(n=1, size=validated_data['size'], quality=quality_for_cost)
        total_cost = cost_per_image * num_images

        creations = []
        try:
            with transaction.atomic():
                # Lock the user row to prevent race conditions
                user = User.objects.select_for_update().get(id=request.user.id)
                
                if user.credit_balance < total_cost:
                    return Response({"detail": "Insufficient credits."}, status=status.HTTP_402_PAYMENT_REQUIRED)
                
                user.credit_balance -= total_cost
                user.save(update_fields=['credit_balance'])
                
                for image_file in images:
                    creation = ImageCreation.objects.create(
                        user=user,
                        credit_cost=cost_per_image,
                        operation=ImageCreation.Operation.EDIT,
                        prompt=validated_data['prompt'],
                        n=1,
                        size=validated_data['size'],
                        provider=provider,
                        source_image=image_file
                    )
                    creations.append(creation)
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error in image edit: {e}", exc_info=True)
            return Response({"detail": "An error occurred during transaction."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        for creation in creations:
            process_image_creation.delay(str(creation.id))
            
        response_serializer = self.get_serializer(creations, many=True)
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

class FailedImageCreationViewSet(ReadOnlyModelViewSet):
    serializer_class = ImageCreationResponseSerializer

    def get_queryset(self):
        return ImageCreation.objects.filter(
            user=self.request.user, 
            status=ImageCreation.Status.FAILED
        ).order_by('-created_at')