# subscriptions/admin.py

from django.contrib import admin
from .models import Plan, Subscription

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    """
    Admin interface for subscription Plans.
    """
    list_display = (
        'display_name',
        'name',
        'price',
        'video_limit',
        'can_remove_watermark',
        'allowed_resolutions'
    )
    search_fields = ('display_name', 'name', 'stripe_price_id')
    readonly_fields = ('stripe_price_id',) # This should be managed by Stripe and the sync command

    # Prevent adding/deleting plans directly in admin to enforce using the sync command
    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    """
    Admin interface for user Subscriptions.
    """
    list_display = ('user_email', 'plan_name', 'status', 'current_period_end')
    list_filter = ('status', 'plan__name')
    search_fields = ('user__email', 'stripe_subscription_id')
    autocomplete_fields = ('user',) # Provides a nice search widget for the user field
    readonly_fields = ('id', 'stripe_subscription_id')
    
    # Add 'created_at' and 'updated_at' to the model if you don't have them yet
    # class Subscription(models.Model):
    #   ...
    #   created_at = models.DateTimeField(auto_now_add=True)
    #   updated_at = models.DateTimeField(auto_now=True)
    
    fieldsets = (
        ('Subscription Info', {
            'fields': ('id', 'user', 'plan', 'status')
        }),
        ('Stripe Details', {
            'fields': ('stripe_subscription_id', 'current_period_end')
        })
    )

    # Custom methods to display related model fields
    @admin.display(description='User Email', ordering='user__email')
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description='Plan', ordering='plan__name')
    def plan_name(self, obj):
        if obj.plan:
            return obj.plan.display_name
        return "No Plan"