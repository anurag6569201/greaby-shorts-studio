from rest_framework import generics, status
from rest_framework.response import Response
from .models import Creation
from .serializers import CreationRequestSerializer, CreationResponseSerializer
from .services import check_user_quota
from .tasks import generate_video_from_prompt

class VideoGenerationView(generics.CreateAPIView):
    serializer_class = CreationRequestSerializer

    def create(self, request, *args, **kwargs):
        can_generate, message = check_user_quota(request.user)
        if not can_generate:
            return Response({"detail": message}, status=status.HTTP_402_PAYMENT_REQUIRED)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        creation = serializer.save(user=request.user)
        generate_video_from_prompt.delay(str(creation.id))
        
        response_serializer = CreationResponseSerializer(creation)
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

class CreationHistoryView(generics.ListAPIView):
    serializer_class = CreationResponseSerializer

    def get_queryset(self):
        return Creation.objects.filter(user=self.request.user).order_by('-created_at')

class CreationDetailView(generics.RetrieveAPIView):
    serializer_class = CreationResponseSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return Creation.objects.filter(user=self.request.user)