# audio_creations/models.py

import uuid
from django.db import models
from django.conf import settings

class AudioCreation(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='audio_creations'
    )
    # NEW: Add a user-editable title
    title = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    text_input = models.TextField()
    settings = models.JSONField(default=dict, help_text="Stores voice, speed, etc.")

    result_file = models.FileField(upload_to='audio_generations/', blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Automatically generate a title from the text input if it's empty
        if not self.title and self.text_input:
            self.title = self.text_input[:60] + '...' if len(self.text_input) > 60 else self.text_input
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Audio '{self.title}' for {self.user.email} ({self.status})"