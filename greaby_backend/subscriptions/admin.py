# subscriptions/admin.py

from django.contrib import admin
from .models import Plan, Subscription

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'name', 'price', 'total_creations_limit', 'max_video_duration', 'max_audio_characters')
    search_fields = ('display_name', 'name', 'stripe_price_id')
    readonly_fields = ('stripe_price_id', 'name')
    
    fieldsets = (
        ('Core Details', {'fields': ('display_name', 'name', 'price', 'stripe_price_id')}),
        ('Quotas', {'fields': ('total_creations_limit',)}),
        ('Video Features', {'fields': ('max_video_duration', 'video_resolutions', 'video_aspect_ratios', 'can_remove_watermark')}),
        ('Audio Features', {'fields': ('max_audio_characters', 'available_voices')}),
    )

    def has_add_permission(self, request):
        # Enforce using the sync command to manage plans
        return False

    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user_email', 'plan_name', 'status', 'current_period_end')
    list_filter = ('status', 'plan__name')
    search_fields = ('user__email', 'stripe_subscription_id')
    autocomplete_fields = ('user',)
    readonly_fields = ('id', 'stripe_subscription_id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Subscription Info', {'fields': ('id', 'user', 'plan', 'status')}),
        ('Stripe Details', {'fields': ('stripe_subscription_id', 'current_period_start', 'current_period_end')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )

    @admin.display(description='User Email', ordering='user__email')
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description='Plan', ordering='plan__name')
    def plan_name(self, obj):
        return obj.plan.display_name if obj.plan else "No Plan"