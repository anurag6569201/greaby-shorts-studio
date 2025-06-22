# subscriptions/serializers.py

from rest_framework import serializers
from .models import Plan, Subscription

class PlanSerializer(serializers.ModelSerializer):
    """
    Serializes all public-facing details of a Plan for the pricing page.
    """
    class Meta:
        model = Plan
        fields = (
            'id',
            'name',
            'display_name',
            'price',
            'total_creations_limit',
            'max_video_duration',
            'video_resolutions',
            'video_aspect_ratios',
            'can_remove_watermark',
            'max_audio_characters',
            'available_voices',
        )
        read_only_fields = fields

class SubscriptionSerializer(serializers.ModelSerializer):
    """
    Serializes a user's subscription, nesting the full details of their plan
    so the frontend has all necessary feature flags.
    """
    plan = PlanSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = (
            'id',
            'plan',
            'status',
            'current_period_start',
            'current_period_end',
        )
        read_only_fields = fields