import uuid
from django.db import models
from django.conf import settings
from greaby_project.storages import VideoStorage

# --- NEW: Abstract Base Class for all AI creations ---
class AbstractBaseCreation(models.Model):
    """
    An abstract model that provides common fields for any AI-generated content.
    Reduces code duplication between VideoCreation and AudioCreation.
    """
    class Status(models.TextChoices):
        UPLOAD_PENDING = 'upload_pending', 'Upload Pending'
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='%(class)s_creations' # Dynamically creates related_name, e.g., 'videocreation_creations'
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Cost and Error Logging
    credit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00,blank=True,null=True)
    error_message = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']


# --- RENAMED & REFACTORED: From 'Creation' to 'VideoCreation' ---
class VideoCreation(AbstractBaseCreation):
    """
    Represents a single video generation task and its result.
    """
    class AspectRatio(models.TextChoices):
        SQUARE = '1:1', '1:1 (Square)'
        LANDSCAPE = '16:9', '16:9 (Landscape)'
        PORTRAIT = '9:16', '9:16 (Portrait)'

    class Resolution(models.TextChoices):
        P480 = '480p', '480p (SD)'
        P720 = '720p', '720p (HD)'
        P1080 = '1080p', '1080p (Full HD)'

    prompt = models.TextField()
    
    # Stores the generated file in cloud storage (Azure Blob Storage)
    result_file = models.FileField(storage=VideoStorage(), upload_to='', blank=True, null=True)

    # --- Detailed generation parameters ---
    aspect_ratio = models.CharField(max_length=10, choices=AspectRatio.choices, default=AspectRatio.SQUARE)
    resolution = models.CharField(max_length=10, choices=Resolution.choices, default=Resolution.P480)
    duration = models.PositiveIntegerField(
        choices=[(5, '5s'), (10, '10s'), (15, '15s'), (20, '20s')], 
        default=5
    )
    n_variants = models.PositiveIntegerField(
        choices=[(1, '1 Video'), (2, '2 Videos')], 
        default=1
    )

    def __str__(self):
        return f"Video for {self.user.email} - '{self.prompt[:30]}...' ({self.status})"