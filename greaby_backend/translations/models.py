# translations/models.py

import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from creations.models import AbstractBaseCreation
from greaby_project.storages import InputDocumentStorage, TranslatedDocumentStorage
from .languages import SUPPORTED_LANGUAGES, SOURCE_LANGUAGE_CHOICES


class DocumentTranslation(AbstractBaseCreation):
    """
    Represents a single document translation task and its result.
    Inherits common fields (user, status, cost, etc.) from AbstractBaseCreation.
    """
    # --- UPDATED: Use the new comprehensive language lists ---
    source_language = models.CharField(max_length=10, choices=SOURCE_LANGUAGE_CHOICES)
    target_language = models.CharField(max_length=10, choices=SUPPORTED_LANGUAGES)

    # Stores the user-uploaded file in the 'input' container
    input_document = models.FileField(storage=InputDocumentStorage(), upload_to='')

    # Stores the translated file from Azure in the 'output' container
    translated_document = models.FileField(storage=TranslatedDocumentStorage(), upload_to='', blank=True, null=True)
    original_filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    # Specific to document translation
    characters_charged = models.PositiveIntegerField(default=0, blank=True, null=True)

    def __str__(self):
        return f"Doc translation for {self.user.email} from {self.source_language} to {self.target_language} ({self.status})"

    def clean(self):
        if self.source_language == self.target_language:
            raise ValidationError('Source and target languages cannot be the same.')