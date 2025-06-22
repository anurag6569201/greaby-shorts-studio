# subscriptions/models.py

import uuid
from django.db import models
from django.conf import settings

class Plan(models.Model):
    # Core Details
    name = models.CharField(max_length=50, unique=True, help_text="Internal name, e.g., 'free', 'creator', 'pro'")
    display_name = models.CharField(max_length=100, help_text="Customer-facing name, e.g., 'Creator Plan'")
    price = models.DecimalField(max_digits=7, decimal_places=2)
    stripe_price_id = models.CharField(max_length=100, unique=True)

    # Combined Quota
    total_creations_limit = models.IntegerField(default=1, help_text="Monthly or lifetime total creations limit (video + audio)")

    # Video-Specific Features
    max_video_duration = models.IntegerField(default=5, help_text="Maximum video duration in seconds")
    video_resolutions = models.JSONField(
        default=list,
        help_text="List of allowed resolutions, e.g., ['480p']"
    )
    video_aspect_ratios = models.JSONField(
        default=list,
        help_text="List of allowed aspect ratios, e.g., ['1:1']"
    )
    can_remove_watermark = models.BooleanField(default=False)

    # Audio-Specific Features
    max_audio_characters = models.IntegerField(default=500, help_text="Maximum character limit for TTS input")
    available_voices = models.JSONField(
        default=list,
        help_text="List of allowed voice models, e.g., ['alloy', 'echo']"
    )

    def __str__(self):
        return self.display_name

class Subscription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        CANCELED = 'canceled', 'Canceled'
        INCOMPLETE = 'incomplete', 'Incomplete'
        PAST_DUE = 'past_due', 'Past Due'
        TRIALING = 'trialing', 'Trialing'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True)
    stripe_subscription_id = models.CharField(max_length=100, unique=True, blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INCOMPLETE)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        plan_name = self.plan.display_name if self.plan else 'No Plan'
        return f"{self.user.email} - {plan_name} ({self.status})"