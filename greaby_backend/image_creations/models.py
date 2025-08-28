from django.db import models
from creations.models import AbstractBaseCreation
from greaby_project.storages import ImageSourceStorage

class ImageCreation(AbstractBaseCreation):
    class Operation(models.TextChoices):
        GENERATE = 'generate', 'Generate'
        EDIT = 'edit', 'Edit'

    class Size(models.TextChoices):
        SQUARE = '1024x1024', 'Square'
        LANDSCAPE = '1792x1024', 'Landscape'
        PORTRAIT = '1024x1792', 'Portrait'

    class Quality(models.TextChoices):
        STANDARD = 'standard', 'Standard'
        HD = 'hd', 'HD'

    class Style(models.TextChoices):
        VIVID = 'vivid', 'Vivid'
        NATURAL = 'natural', 'Natural'

    prompt = models.TextField()
    operation = models.CharField(max_length=10, choices=Operation.choices)
    n = models.PositiveSmallIntegerField(default=1)
    size = models.CharField(max_length=10, choices=Size.choices, default=Size.SQUARE)
    quality = models.CharField(max_length=10, choices=Quality.choices, default=Quality.STANDARD)
    style = models.CharField(max_length=10, choices=Style.choices, default=Style.VIVID)

    # Used only for the 'edit' operation
    source_image = models.FileField(storage=ImageSourceStorage(), upload_to='', blank=True, null=True)
    result_file = models.FileField(storage=ImageSourceStorage(), upload_to='', blank=True, null=True)

    # NEW: Add properties to easily access URLs in the serializer
    @property
    def result_url(self):
        return self.result_file.url if self.result_file else None

    @property
    def source_image_url(self):
        return self.source_image.url if self.source_image else None

    def __str__(self):
        return f"Image '{self.operation}' for {self.user.email} ({self.status})"