# reels/models.py

import uuid
from django.db import models
from django.conf import settings
from creations.models import Creation as VideoCreation
from audio_creations.models import AudioCreation

class Reel(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reels')
    
    # User-editable title for the final reel
    title = models.CharField(max_length=255)
    
    # Link to the source assets
    video_creation = models.ForeignKey(VideoCreation, on_delete=models.SET_NULL, null=True)
    audio_creation = models.ForeignKey(AudioCreation, on_delete=models.SET_NULL, null=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # The final combined video file
    result_file = models.FileField(upload_to='reels/', blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Reel '{self.title}' for {self.user.email} ({self.status})"