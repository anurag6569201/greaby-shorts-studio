import uuid
from django.db import models
from django.conf import settings
from creations.models import VideoCreation
from audio_creations.models import AudioCreation
from greaby_project.storages import ReelStorage, SubtitleStorage 

class Reel(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    class SubtitleStatus(models.TextChoices):
        NONE = 'none', 'Not Generated'
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reels')
    
    # User-editable title for the final reel
    title = models.CharField(max_length=255)
    
    # Link to the source assets
    video_creation = models.ForeignKey(VideoCreation, on_delete=models.SET_NULL, null=True, related_name='reels')
    audio_creation = models.ForeignKey(AudioCreation, on_delete=models.SET_NULL, null=True, related_name='reels')
    
    # --- Reel Combination Status ---
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    result_file = models.FileField(storage=ReelStorage(), upload_to='', blank=True, null=True, help_text="The final combined video file.")
    error_message = models.TextField(blank=True, null=True)

    # --- NEW: Subtitle Generation Status ---
    subtitle_file = models.FileField(storage=SubtitleStorage(), upload_to='', blank=True, null=True, help_text="The generated .srt subtitle file.")
    subtitle_status = models.CharField(max_length=20, choices=SubtitleStatus.choices, default=SubtitleStatus.NONE)
    subtitle_error_message = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Reel '{self.title}' for {self.user.email} ({self.status})"