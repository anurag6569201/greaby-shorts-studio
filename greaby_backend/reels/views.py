# reels/views.py

from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Reel, VideoCreation, AudioCreation
from .serializers import ReelCreateSerializer, ReelResponseSerializer, ReelUpdateSerializer
from .tasks import combine_video_and_audio

class ReelViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for listing, creating, retrieving, updating, and deleting Reels.
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Ensure users can only see their own reels
        return Reel.objects.filter(user=self.request.user).select_related(
            'video_creation', 'audio_creation'
        ).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return ReelCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ReelUpdateSerializer
        return ReelResponseSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        video_id = serializer.validated_data.get('video_creation_id')
        audio_id = serializer.validated_data.get('audio_creation_id')
        
        # --- Validation ---
        try:
            # Ensure the source assets exist, are completed, and belong to the user
            video = VideoCreation.objects.get(id=video_id, user=request.user, status=VideoCreation.Status.COMPLETED)
            audio = AudioCreation.objects.get(id=audio_id, user=request.user, status=AudioCreation.Status.COMPLETED)
        except (VideoCreation.DoesNotExist, AudioCreation.DoesNotExist):
            return Response(
                {"detail": "One or more source assets not found, not complete, or do not belong to you."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Create the Reel object and dispatch the task ---
        reel = Reel.objects.create(
            user=request.user,
            title=serializer.validated_data.get('title'),
            video_creation=video,
            audio_creation=audio,
            status=Reel.Status.PENDING
        )
        
        combine_video_and_audio.delay(str(reel.id))

        response_serializer = ReelResponseSerializer(reel, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

    def perform_destroy(self, instance):
        # Delete the associated file from storage
        if instance.result_file:
            instance.result_file.delete(save=False)
        instance.delete()