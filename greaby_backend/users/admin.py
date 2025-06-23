# users/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom User admin to display relevant fields.
    """
    # Fields to display in the main list view
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'credit_balance', 'date_joined')
    
    # Fields to link to from the list view to the detail view
    list_display_links = ('email',)
    
    # Fields available for filtering
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups')
    
    # Fields available for searching
    search_fields = ('email', 'first_name', 'last_name')
    
    # Order of fields in the detail view
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'credit_balance')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    # Fields to display when adding a new user
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password', 'password2'), # Assuming you have a form with password confirmation
        }),
    )
    
    ordering = ('-date_joined',)