# reels/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import Reel

@admin.register(Reel)
class ReelAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'user_email', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('id', 'title', 'user__email')
    autocomplete_fields = ('user', 'video_creation', 'audio_creation')
    readonly_fields = ('id', 'created_at', 'reel_player')

    fieldsets = (
        ('Core Info', {'fields': ('id', 'user', 'title', 'status')}),
        ('Source Assets', {'fields': ('video_creation', 'audio_creation')}),
        ('Result', {'fields': ('reel_player', 'error_message')}),
        ('Timestamps', {'fields': ('created_at',)}),
    )

    @admin.display(description='User Email', ordering='user__email')
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description='Reel Player')
    def reel_player(self, obj):
        if obj.result_file:
            return format_html('<video width="320" height="240" controls><source src="{0}" type="video/mp4"></video>', obj.result_file.url)
        return "No reel file generated."