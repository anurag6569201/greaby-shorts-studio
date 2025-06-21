import uuid
from django.db import models
from django.conf import settings

class Creation(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='creations')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    prompt = models.TextField()
    settings = models.JSONField(default=dict, help_text="Stores aspectRatio, resolution, duration etc.")
    
    result_file = models.FileField(upload_to='creations/videos/', blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Video for {self.user.email} ({self.status})"