# transcriptions/models.py

from django.db import models
from creations.models import AbstractBaseCreation
from greaby_project.storages import SourceMediaStorage, TranscriptionResultStorage

# A selection of supported languages by Azure Speech-to-Text.
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
    title = models.CharField(max_length=255)
    
    source_file = models.FileField(
        storage=SourceMediaStorage(), 
        upload_to='',
        blank=True,
        null=True,
        help_text="The source file is automatically deleted after a successful transcription."
    )
    
    result_file = models.FileField(storage=TranscriptionResultStorage(), upload_to='', blank=True, null=True)
    
    # Transcription Parameters
    source_language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default='en-US')
    enable_speaker_separation = models.BooleanField(default=False, help_text="Enable speaker separation (diarization).")

    # AI-Powered Insights
    generate_insights = models.BooleanField(default=False, help_text="If true, generate a summary and keywords.")
    summary = models.TextField(blank=True, null=True, help_text="AI-generated summary of the transcription.")
    keywords = models.JSONField(blank=True, null=True, help_text="AI-generated list of keywords and topics.")

    def __str__(self):
        return f"Transcription '{self.title}' for {self.user.email} ({self.status})"