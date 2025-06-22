# creations/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import Creation

@admin.register(Creation)
class CreationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_email', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('id', 'user__email', 'prompt')
    autocomplete_fields = ('user',)
    readonly_fields = ('id', 'created_at', 'result_url_link')
    
    fieldsets = (
        ('Core Info', {'fields': ('id', 'user', 'status')}),
        ('Request', {'fields': ('prompt', 'settings')}),
        ('Result', {'fields': ('result_url_link', 'error_message')}),
        ('Timestamps', {'fields': ('created_at',)}),
    )
    
    @admin.display(description='User Email', ordering='user__email')
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description='Result URL')
    def result_url_link(self, obj):
        if obj.result_url:
            return format_html('<a href="{0}" target="_blank">Link to Video</a>', obj.result_url)
        return "Not available"