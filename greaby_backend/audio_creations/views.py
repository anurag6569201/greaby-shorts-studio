# audio_creations/views.py

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import AudioCreation
from .serializers import (
    AudioCreationRequestSerializer, 
    AudioCreationResponseSerializer,
    AudioCreationUpdateSerializer # Import the new serializer
)
from .tasks import generate_audio_from_text
from creations.services import check_user_quota

class AudioGenerationView(generics.CreateAPIView):
    """
    Handles creating a new audio generation task. (POST)
    """
    serializer_class = AudioCreationRequestSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # 1. Check overall creation quota
        can_generate, message = check_user_quota(request.user)
        if not can_generate:
            return Response({"detail": message}, status=status.HTTP_402_PAYMENT_REQUIRED)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 2. Enforce plan-specific feature limits for audio
        plan = request.user.subscription.plan
        settings_data = serializer.validated_data.get('settings', {})
        text_input = serializer.validated_data.get('text_input', '')
        voice = settings_data.get('voice', 'alloy')

        if len(text_input) > plan.max_audio_characters:
            return Response({"detail": f"Your plan allows a max of {plan.max_audio_characters} characters for audio generation."}, status=status.HTTP_402_PAYMENT_REQUIRED)
        if voice not in plan.available_voices:
            return Response({"detail": f"The voice '{voice}' is not available on your plan."}, status=status.HTTP_402_PAYMENT_REQUIRED)

        # 3. Create object and queue task
        audio_creation = serializer.save(user=request.user)
        generate_audio_from_text.delay(str(audio_creation.id))
        
        response_serializer = AudioCreationResponseSerializer(audio_creation, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

class AudioHistoryView(generics.ListAPIView):
    """
    Handles listing all audio creations for the current user. (GET)
    """
    serializer_class = AudioCreationResponseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AudioCreation.objects.filter(user=self.request.user).order_by('-created_at')

# --- NEW: View for full CRUD on a single audio object ---
class AudioDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Handles retrieving (GET), updating (PATCH), and deleting (DELETE)
    a single audio creation.
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        # Ensure users can only access their own creations
        return AudioCreation.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        # Use a different serializer for updating vs retrieving
        if self.request.method in ['PUT', 'PATCH']:
            return AudioCreationUpdateSerializer
        return AudioCreationResponseSerializer

    def perform_destroy(self, instance):
        # Also delete the associated file from storage when the object is deleted
        if instance.result_file:
            instance.result_file.delete(save=False) # save=False prevents model's save() from being called
        instance.delete()