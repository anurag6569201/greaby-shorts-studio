from django.db import models
from creations.models import AbstractBaseCreation
from greaby_project.storages import AudioStorage 

class AudioCreation(AbstractBaseCreation):
    """
    Represents a single Text-to-Speech (TTS) generation task and its result.
    Inherits common fields from AbstractBaseCreation.
    """
    class Voice(models.TextChoices):
        ALLOY = 'alloy', 'Alloy'
        ASH = 'ash', 'Ash'
        BALLAD = 'ballad', 'Ballad'
        CORAL = 'coral', 'Coral'
        ECHO = 'echo', 'Echo'
        FABLE = 'fable', 'Fable'
        ONYX = 'onyx', 'Onyx'
        NOVA = 'nova', 'Nova'
        SAGE = 'sage', 'Sage'
        SHIMMER = 'shimmer', 'Shimmer'
        VERSE = 'verse', 'Verse'

    class ResponseFormat(models.TextChoices):
        MP3 = 'mp3', 'MP3'
        OPUS = 'opus', 'Opus'
        AAC = 'aac', 'AAC'
        FLAC = 'flac', 'FLAC'
        WAV = 'wav', 'WAV'
        PCM = 'pcm', 'PCM'

    # The user-editable title for organizational purposes
    title = models.CharField(max_length=255, blank=True)
    text_input = models.TextField()

    # --- Detailed generation parameters ---
    voice = models.CharField(max_length=20, choices=Voice.choices, default=Voice.ALLOY)
    response_format = models.CharField(max_length=10, choices=ResponseFormat.choices, default=ResponseFormat.MP3)
    speed = models.FloatField(default=1.0, help_text="From 0.25 to 4.0")

    # Override the upload_to path for the result_file from the base class
    result_file = models.FileField(storage=AudioStorage(), upload_to='', blank=True, null=True)

    def save(self, *args, **kwargs):
        # Automatically generate a title from the text input if it's empty
        if not self.title and self.text_input:
            self.title = self.text_input[:60] + '...' if len(self.text_input) > 60 else self.text_input
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Audio '{self.title}' for {self.user.email} ({self.status})"