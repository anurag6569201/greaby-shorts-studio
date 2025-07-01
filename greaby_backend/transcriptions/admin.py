# transcriptions/admin.py

from django.contrib import admin
from .models import Transcription

@admin.register(Transcription)
class TranscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'user', 'status', 'source_language', 'enable_speaker_separation', 'credit_cost', 'created_at')
    list_filter = ('status', 'source_language', 'enable_speaker_separation')
    search_fields = ('user__email', 'title')
    
    readonly_fields = (
        'id', 'user', 'credit_cost', 'status', 'source_file', 
        'result_file', 'error_message', 'created_at', 'updated_at',
    )
    
    fieldsets = (
        ('Job Info', {'fields': ('id', 'title', 'user', 'status', 'error_message')}),
        ('Configuration', {'fields': ('source_language', 'enable_speaker_separation', 'credit_cost')}),
        ('Files', {'fields': ('source_file', 'result_file')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')})
    )