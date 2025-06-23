# audio_creations/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import AudioCreation

admin.site.register(AudioCreation)
