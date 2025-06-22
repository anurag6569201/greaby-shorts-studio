# users/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin interface for the custom User model.
    """
    # Fields to display in the list view
    list_display = ('id', 'email', 'first_name', 'last_name', 'is_staff', 'is_active')
    # Fields that can be searched
    search_fields = ('email', 'first_name', 'last_name')
    # Default ordering
    ordering = ('email',)
    # Filters available on the side
    list_filter = ('is_staff', 'is_active', 'is_superuser')

    # Define fieldsets for the detail/edit view
    # Note: We remove 'username' as it's not used
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    # Define fieldsets for the add user view
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password'),
        }),
    )

    # Make certain fields read-only in the detail view
    readonly_fields = ('id', 'last_login', 'date_joined')

    def save_model(self, request, obj, form, change):
        """
        Override save_model to ensure password is hashed correctly when changed in admin.
        """
        if 'password' in form.changed_data:
            obj.set_password(form.cleaned_data['password'])
        super().save_model(request, obj, form, change)