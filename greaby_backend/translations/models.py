# translations/models.py

import uuid
from django.db import models
from creations.models import AbstractBaseCreation
from greaby_project.storages import InputDocumentStorage, TranslatedDocumentStorage
from .languages import SUPPORTED_LANGUAGES, SOURCE_LANGUAGE_CHOICES

class DocumentTranslation(AbstractBaseCreation):
    """
    Represents a single document translation task and its result.
    Inherits common fields (user, status, cost, etc.) from AbstractBaseCreation.
    """
    source_language = models.CharField(max_length=10, choices=SOURCE_LANGUAGE_CHOICES)
    target_language = models.CharField(max_length=10, choices=SUPPORTED_LANGUAGES)

    input_document = models.FileField(storage=InputDocumentStorage(), upload_to='')
    translated_document = models.FileField(storage=TranslatedDocumentStorage(), upload_to='', blank=True, null=True)
    
    original_filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    characters_charged = models.PositiveIntegerField(default=0, blank=True, null=True)

    # --- NEW FIELD ---
    # Stores the job ID from the Azure Document Translation API
    job_id = models.CharField(max_length=100, blank=True, null=True, help_text="Azure batch translation job ID")

    def __str__(self):
        return f"Doc translation for {self.user.email} from {self.source_language} to {self.target_language} ({self.status})"

    def clean(self):
        # Allow 'auto' as a source language
        if self.source_language != 'auto' and self.source_language == self.target_language:
            raise ValidationError('Source and target languages cannot be the same.')