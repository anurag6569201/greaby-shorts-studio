# reels/admin.py

from django.contrib import admin
from .models import Reel

@admin.register(Reel)
class ReelAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'title', 'status', 'subtitle_status', 'created_at')
    list_filter = ('status', 'subtitle_status')
    search_fields = ('user__email', 'title')

    readonly_fields = (
        'id', 'user', 'video_creation', 'audio_creation', 'result_file', 
        'error_message', 'subtitle_file', 'subtitle_error_message',
        'created_at', 'updated_at'
    )
    
    # Reels are created via the API, not the admin.
    def has_add_permission(self, request):
        return False

    # Allow changing the title
    def has_change_permission(self, request, obj=None):
        return True