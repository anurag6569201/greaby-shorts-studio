# video_translations/models.py
import uuid
from django.db import models
from creations.models import AbstractBaseCreation
from greaby_project.storages import SourceMediaStorage
from .locales import LOCALE_CHOICES

class VideoTranslation(AbstractBaseCreation):
    class VoiceKind(models.TextChoices):
        PLATFORM = 'PlatformVoice', 'Platform Voice'
        PERSONAL = 'PersonalVoice', 'Personal Voice (Not Supported)'

    # Override the default status to start with UPLOAD_PENDING
    status = models.CharField(max_length=20, choices=AbstractBaseCreation.Status.choices, default=AbstractBaseCreation.Status.UPLOAD_PENDING)
    
    title = models.CharField(max_length=255)
    
    source_video_file = models.FileField(storage=SourceMediaStorage(), upload_to='video_translations/source/')
    source_locale = models.CharField(max_length=10, choices=LOCALE_CHOICES)
    
    target_locale = models.CharField(max_length=10, choices=LOCALE_CHOICES)
    voice_kind = models.CharField(max_length=20, choices=VoiceKind.choices, default=VoiceKind.PLATFORM)
    speaker_count = models.PositiveIntegerField(null=True, blank=True, help_text="Optional: Number of speakers in the video.")
    
    embed_subtitles = models.BooleanField(default=True, help_text="Embed subtitles into the translated video.")
    adjust_video_speed = models.BooleanField(default=False, help_text="Adjust video speed for better audio sync.")
    use_ocr_correction = models.BooleanField(default=False, help_text="Use existing subtitles in video to improve accuracy.")

    azure_translation_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    result_video_url = models.URLField(max_length=1024, blank=True, null=True)
    result_subtitle_url = models.URLField(max_length=1024, blank=True, null=True)

    def __str__(self):
        return f"Video Translation '{self.title}' for {self.user.email} ({self.status})"