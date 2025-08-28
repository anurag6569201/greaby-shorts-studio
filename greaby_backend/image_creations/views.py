from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import ImageCreation
from .serializers import (
    ImageGenerationRequestSerializer,
    ImageEditRequestSerializer,
    ImageCreationResponseSerializer
)
from .tasks import process_image_creation
from .services import calculate_image_cost

class ImageCreationViewSet(viewsets.ModelViewSet): 
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    serializer_class = ImageCreationResponseSerializer

    def get_queryset(self):
        base_queryset = ImageCreation.objects.filter(user=self.request.user)
        if self.action == 'list':
            return base_queryset.exclude(status=ImageCreation.Status.FAILED).order_by('-created_at')
        return base_queryset

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request, *args, **kwargs):
        serializer = ImageGenerationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        cost = calculate_image_cost(n=data['n'], size=data['size'], quality=data['quality'])
        user = request.user

        if user.credit_balance < cost:
            return Response({"detail": "Insufficient credits."}, status=status.HTTP_402_PAYMENT_REQUIRED)

        try:
            with transaction.atomic():
                user.credit_balance -= cost
                user.save(update_fields=['credit_balance'])
                
                creation = ImageCreation.objects.create(
                    user=user,
                    credit_cost=cost,
                    operation=ImageCreation.Operation.GENERATE,
                    **data
                )
        except Exception as e:
            return Response({"detail": "An error occurred during transaction."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        process_image_creation.delay(str(creation.id))
        response_serializer = self.get_serializer(creation)
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['post'], url_path='edit', parser_classes=[MultiPartParser, FormParser])
    def edit(self, request, *args, **kwargs):
        # ... (no changes here)
        serializer = ImageEditRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        cost = calculate_image_cost(n=data['n'], size=data['size'], quality='standard') 
        user = request.user

        if user.credit_balance < cost:
            return Response({"detail": "Insufficient credits."}, status=status.HTTP_402_PAYMENT_REQUIRED)

        try:
            with transaction.atomic():
                user.credit_balance -= cost
                user.save(update_fields=['credit_balance'])
                
                creation = ImageCreation.objects.create(
                    user=user,
                    credit_cost=cost,
                    operation=ImageCreation.Operation.EDIT,
                    prompt=data['prompt'],
                    n=data['n'],
                    size=data['size'],
                    source_image=data['image']
                )
        except Exception as e:
            return Response({"detail": "An error occurred during transaction."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        process_image_creation.delay(str(creation.id))
        response_serializer = self.get_serializer(creation)
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

class FailedImageCreationViewSet(ReadOnlyModelViewSet):
    serializer_class = ImageCreationResponseSerializer

    def get_queryset(self):
        return ImageCreation.objects.filter(
            user=self.request.user, 
            status=ImageCreation.Status.FAILED
        ).order_by('-created_at')