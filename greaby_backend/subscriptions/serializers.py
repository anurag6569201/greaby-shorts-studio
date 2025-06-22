# backend/subscriptions/serializers.py

from rest_framework import serializers
from .models import Plan, Subscription

class PlanSerializer(serializers.ModelSerializer):
    """
    Serializes Plan details to be displayed on a pricing page or similar.
    Exposes all feature flags and limits for the frontend to use.
    """
    class Meta:
        model = Plan
        fields = (
            'id',
            'display_name',
            'price',
            'video_limit',
            'max_duration',
            'allowed_resolutions',
            'allowed_aspect_ratios',
            'can_remove_watermark',
        )
        read_only_fields = fields


class SubscriptionSerializer(serializers.ModelSerializer):
    """
    Serializes a user's specific subscription.
    It includes the nested details of their current plan, so the frontend
    has all the necessary information about their capabilities.
    """
    plan = PlanSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = (
            'id',
            'plan',
            'status',
            'current_period_end'
        )
        read_only_fields = fields