# creations/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import Creation

@admin.register(Creation)
class CreationAdmin(admin.ModelAdmin):
    """
    Admin interface for video Creations.
    """
    list_display = ('id', 'user_email', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('id', 'user__email', 'prompt')
    autocomplete_fields = ('user',)
    readonly_fields = ('id', 'created_at')
    
    # Custom method to display the user's email
    @admin.display(description='User Email', ordering='user__email')
    def user_email(self, obj):
        return obj.user.email
