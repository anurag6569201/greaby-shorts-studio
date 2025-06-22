# audio_creations/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import AudioCreation

@admin.register(AudioCreation)
class AudioCreationAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'user_email', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('id', 'title', 'user__email', 'text_input')
    autocomplete_fields = ('user',)
    readonly_fields = ('id', 'created_at', 'audio_player')
    
    fieldsets = (
        ('Core Info', {'fields': ('id', 'user', 'title', 'status')}),
        ('Request', {'fields': ('text_input', 'settings')}),
        ('Result', {'fields': ('audio_player', 'error_message')}),
        ('Timestamps', {'fields': ('created_at',)}),
    )
    
    @admin.display(description='User Email', ordering='user__email')
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description='Audio Player')
    def audio_player(self, obj):
        if obj.result_file:
            return format_html('<audio controls><source src="{0}" type="audio/mpeg">Your browser does not support the audio element.</audio>', obj.result_file.url)
        return "No audio file generated."