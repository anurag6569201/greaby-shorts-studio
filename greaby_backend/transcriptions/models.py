# transcriptions/models.py

from django.db import models
from creations.models import AbstractBaseCreation
from greaby_project.storages import SourceMediaStorage, TranscriptionResultStorage

LANGUAGE_CHOICES = [
    # English
    ('en-US', 'English (United States)'),
    ('en-GB', 'English (United Kingdom)'),
    ('en-AU', 'English (Australia)'),
    ('en-CA', 'English (Canada)'),
    ('en-IN', 'English (India)'),

    # Spanish
    ('es-ES', 'Spanish (Spain)'),
    ('es-MX', 'Spanish (Mexico)'),
    ('es-US', 'Spanish (United States)'),

    # French
    ('fr-FR', 'French (France)'),
    ('fr-CA', 'French (Canada)'),

    # German
    ('de-DE', 'German (Germany)'),

    # Italian
    ('it-IT', 'Italian (Italy)'),

    # Portuguese
    ('pt-BR', 'Portuguese (Brazil)'),
    ('pt-PT', 'Portuguese (Portugal)'),

    # Russian
    ('ru-RU', 'Russian (Russia)'),

    # Chinese
    ('zh-CN', 'Chinese (Mandarin, Simplified)'),
    ('zh-TW', 'Chinese (Mandarin, Traditional)'),
    ('zh-HK', 'Chinese (Cantonese – Traditional, Hong Kong)'),

    # Hindi
    ('hi-IN', 'Hindi (India)'),
    ('bn-IN', 'Bengali (India)'),      
    ('gu-IN', 'Gujarati (India)'),   
    ('kn-IN', 'Kannada (India)'),      
    ('ml-IN', 'Malayalam (India)'),   
    ('mr-IN', 'Marathi (India)'),     
    ('pa-IN', 'Punjabi (India)'),     
    ('ta-IN', 'Tamil (India)'),      
    ('te-IN', 'Telugu (India)'),     
    ('ur-IN', 'Urdu (India)'),     

    # Japanese
    ('ja-JP', 'Japanese (Japan)'),

    # Korean
    ('ko-KR', 'Korean (South Korea)'),

    # Arabic
    ('ar-SA', 'Arabic (Saudi Arabia)'),
    ('ar-EG', 'Arabic (Egypt)'),
    ('ar-AE', 'Arabic (United Arab Emirates)'),

    # Dutch
    ('nl-NL', 'Dutch (Netherlands)'),

    # Danish
    ('da-DK', 'Danish (Denmark)'),

    # Finnish
    ('fi-FI', 'Finnish (Finland)'),

    # Norwegian
    ('nb-NO', 'Norwegian (Norway)'),

    # Polish
    ('pl-PL', 'Polish (Poland)'),

    # Swedish
    ('sv-SE', 'Swedish (Sweden)'),

    # Turkish
    ('tr-TR', 'Turkish (Turkey)'),

    # Thai
    ('th-TH', 'Thai (Thailand)'),

    # Czech
    ('cs-CZ', 'Czech (Czech Republic)'),

    # Greek
    ('el-GR', 'Greek (Greece)'),

    # Hebrew
    ('he-IL', 'Hebrew (Israel)'),

    # Hungarian
    ('hu-HU', 'Hungarian (Hungary)'),

    # Indonesian
    ('id-ID', 'Indonesian (Indonesia)'),

    # Malay
    ('ms-MY', 'Malay (Malaysia)'),

    # Romanian
    ('ro-RO', 'Romanian (Romania)'),

    # Slovak
    ('sk-SK', 'Slovak (Slovakia)'),

    # Ukrainian
    ('uk-UA', 'Ukrainian (Ukraine)'),

    # Vietnamese
    ('vi-VN', 'Vietnamese (Vietnam)'),
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

    def __str__(self):
        return f"Transcription '{self.title}' for {self.user.email} ({self.status})"