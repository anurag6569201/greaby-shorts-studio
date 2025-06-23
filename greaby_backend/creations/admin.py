# creations/admin.py

from django.contrib import admin
from .models import VideoCreation

@admin.register(VideoCreation)
class VideoCreationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'resolution', 'duration', 'credit_cost', 'created_at')
    list_filter = ('status', 'resolution', 'duration')
    search_fields = ('user__email', 'prompt')
    
    # Making fields read-only as they are set by the generation process
    readonly_fields = (
        'id', 'user', 'prompt', 'aspect_ratio', 'resolution', 'duration',
        'n_variants', 'credit_cost', 'result_file', 'error_message',
        'created_at', 'updated_at'
    )
    
    # You shouldn't be able to create or change these from the admin
    def has_add_permission(self, request):
        return False
        
    def has_change_permission(self, request, obj=None):
        return False