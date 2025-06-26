from django.db import models
from creations.models import AbstractBaseCreation
from greaby_project.storages import AudioStorage
from .voices import VOICE_CHOICES

class AudioCreation(AbstractBaseCreation):
    class ResponseFormat(models.TextChoices):
        MP3 = 'mp3', 'MP3'
        OPUS = 'opus', 'Opus'
        AAC = 'aac', 'AAC'
        FLAC = 'flac', 'FLAC'
        WAV = 'wav', 'WAV'

    title = models.CharField(max_length=255, blank=True)
    text_input = models.TextField()

    voice = models.CharField(max_length=100, choices=VOICE_CHOICES, default='en-US-JennyNeural')
    response_format = models.CharField(max_length=10, choices=ResponseFormat.choices, default=ResponseFormat.MP3)
    speed = models.FloatField(default=1.0, help_text="From 0.25 to 4.0")

    result_file = models.FileField(storage=AudioStorage(), upload_to='', blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.title and self.text_input:
            self.title = self.text_input[:60] + '...' if len(self.text_input) > 60 else self.text_input
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Audio '{self.title}' for {self.user.email} ({self.status})"