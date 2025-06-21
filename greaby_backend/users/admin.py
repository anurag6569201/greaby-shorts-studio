from django.contrib import admin
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """
    Admin interface for the custom User model.
    """
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    list_filter = ('is_staff', 'is_active')

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name')}),
        ('Permissions', {'fields': ('is_staff', 'is_active')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2')}
        ),
    )
    readonly_fields = ('id',)
    def get_readonly_fields(self, request, obj=None):
        if obj:
            return self.readonly_fields + ('email',)
        return self.readonly_fields
    def save_model(self, request, obj, form, change):
        """
        Override save_model to ensure password is hashed correctly.
        """
        if form.cleaned_data.get('password'):
            obj.set_password(form.cleaned_data['password'])
        super().save_model(request, obj, form, change)
    def has_delete_permission(self, request, obj=None):
        """
        Disable delete permission for users in the admin interface.
        """
        return False
    def has_add_permission(self, request):
        """
        Disable add permission for users in the admin interface.
        """
        return False
    def has_change_permission(self, request, obj=None):
        """
        Disable change permission for users in the admin interface.
        """
        return False
    def has_view_permission(self, request, obj=None):
        """
        Disable view permission for users in the admin interface.
        """
        return True
    def get_queryset(self, request):
        """
        Override get_queryset to ensure only active users are displayed.
        """
        qs = super().get_queryset(request)
        return qs.filter(is_active=True)
   