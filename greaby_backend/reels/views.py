from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Reel
from creations.models import VideoCreation
from audio_creations.models import AudioCreation
from .serializers import ReelCreateSerializer, ReelResponseSerializer, ReelUpdateSerializer
from .tasks import combine_video_and_audio, generate_subtitles_for_reel
from .costs import SUBTITLE_GENERATION_COST

class ReelViewSet(viewsets.ModelViewSet):
    
    def get_queryset(self):
        return Reel.objects.filter(user=self.request.user,status=Reel.Status.COMPLETED).select_related(
            'video_creation', 'audio_creation'
        )

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
        
        try:
            video = VideoCreation.objects.get(id=video_id, user=request.user, status=VideoCreation.Status.COMPLETED)
            audio = AudioCreation.objects.get(id=audio_id, user=request.user, status=AudioCreation.Status.COMPLETED)
            if not video.result_file or not audio.result_file:
                raise ValueError("Source asset is marked as complete but is missing the result file.")

        except (VideoCreation.DoesNotExist, AudioCreation.DoesNotExist):
            return Response(
                {"detail": "One or more source assets not found, not complete, or do not belong to you."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except ValueError as e:
            print(f"Reel creation validation failed for user {request.user.email}: {e}")
            return Response(
                {"detail": "A source asset is corrupted or missing its file. Please try regenerating it."},
                status=status.HTTP_400_BAD_REQUEST
            )

        reel = Reel.objects.create(
            user=request.user,
            title=serializer.validated_data.get('title'),
            video_creation=video,
            audio_creation=audio
        )
        combine_video_and_audio.delay(str(reel.id))

        response_serializer = ReelResponseSerializer(reel)
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['post'], url_path='generate-subtitles')
    def generate_subtitles(self, request, pk=None):
        reel = self.get_object()

        if reel.status != Reel.Status.COMPLETED:
            return Response({"detail": "Reel combination must be complete first."}, status=status.HTTP_400_BAD_REQUEST)
        if reel.subtitle_status == Reel.SubtitleStatus.PENDING:
            return Response({"detail": "Subtitle generation is already in progress."}, status=status.HTTP_409_CONFLICT)
        if not reel.audio_creation or not reel.audio_creation.text_input:
            return Response({"detail": "Source audio or its text script is missing."}, status=status.HTTP_400_BAD_REQUEST)
            
        subtitle_cost = SUBTITLE_GENERATION_COST
        user = request.user
        if user.credit_balance < subtitle_cost:
            return Response({"detail": f"Insufficient credits. This action costs {subtitle_cost} credits."}, status=status.HTTP_402_PAYMENT_REQUIRED)
        
        with transaction.atomic():
            user.credit_balance -= subtitle_cost
            user.save(update_fields=['credit_balance'])
            reel.subtitle_status = Reel.SubtitleStatus.PENDING
            reel.save(update_fields=['subtitle_status'])

        generate_subtitles_for_reel.delay(str(reel.id))
        
        return Response(ReelResponseSerializer(reel).data, status=status.HTTP_202_ACCEPTED)
        
    def perform_destroy(self, instance):
        if instance.result_file: instance.result_file.delete(save=False)
        if instance.subtitle_file: instance.subtitle_file.delete(save=False)
        instance.delete()