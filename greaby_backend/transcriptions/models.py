from django.db import models
from creations.models import AbstractBaseCreation
from greaby_project.storages import SourceMediaStorage, TranscriptionResultStorage

LANGUAGE_CHOICES = [
    ('en-US', 'English (United States)'),
    ('hi-IN', 'Hindi (India)'),
    ('es-ES', 'Spanish (Spain)'),
    ('fr-FR', 'French (France)'),
    ('de-DE', 'German (Germany)'),
    ('it-IT', 'Italian (Italy)'),
    ('ja-JP', 'Japanese (Japan)'),
    ('ko-KR', 'Korean (Korea)'),
    ('pt-BR', 'Portuguese (Brazil)'),
    ('ru-RU', 'Russian (Russia)'),
    ('zh-CN', 'Chinese (Mandarin, Simplified)'),
]

class Transcription(AbstractBaseCreation):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    title = models.CharField(max_length=255)
    
    source_file = models.FileField(
        storage=SourceMediaStorage(), 
        upload_to='',
        blank=True,
        null=True,
        help_text="The source file is automatically deleted after a successful transcription."
    )
    
    result_file = models.FileField(storage=TranscriptionResultStorage(), upload_to='', blank=True, null=True)
    
    source_language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default='en-US')
    enable_speaker_separation = models.BooleanField(default=False)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )

    def __str__(self):
        return f"Transcription '{self.title}' for {self.user.email} ({self.status})"