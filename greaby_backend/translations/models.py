# translations/models.py

import uuid
import os # <-- Import the os module
from django.db import models
from django.core.exceptions import ValidationError # <-- Import ValidationError
from creations.models import AbstractBaseCreation
from greaby_project.storages import InputDocumentStorage, TranslatedDocumentStorage
from .languages import SUPPORTED_LANGUAGES, SOURCE_LANGUAGE_CHOICES

# --- NEW HELPER FUNCTION ---
def get_document_upload_path(instance, filename):
    """
    Generates a unique upload path for each document translation instance.
    Example: <uuid>/original_filename.pdf
    This prevents filename collisions in the blob storage.
    """
    return os.path.join(str(instance.id), filename)

class DocumentTranslation(AbstractBaseCreation):
    """
    Represents a single document translation task and its result.
    Inherits common fields (user, status, cost, etc.) from AbstractBaseCreation.
    """
    source_language = models.CharField(max_length=10, choices=SOURCE_LANGUAGE_CHOICES)
    target_language = models.CharField(max_length=10, choices=SUPPORTED_LANGUAGES)

    # --- UPDATED FILE FIELDS ---
    # Use the new function to ensure unique paths for every upload.
    input_document = models.FileField(storage=InputDocumentStorage(), upload_to=get_document_upload_path)
    translated_document = models.FileField(storage=TranslatedDocumentStorage(), upload_to=get_document_upload_path, blank=True, null=True)
    
    original_filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    characters_charged = models.PositiveIntegerField(default=0, blank=True, null=True)

    # Stores the job ID from the Azure Document Translation API
    job_id = models.CharField(max_length=100, blank=True, null=True, help_text="Azure batch translation job ID")

    def __str__(self):
        return f"Doc translation for {self.user.email} from {self.source_language} to {self.target_language} ({self.status})"

    def clean(self):
        # Allow 'auto' as a source language
        if self.source_language != 'auto' and self.source_language == self.target_language:
            raise ValidationError('Source and target languages cannot be the same.')