import uuid
from django.db import models
from django.conf import settings

class Plan(models.Model):
    name = models.CharField(max_length=50, unique=True, help_text="e.g., free, creator, pro")
    display_name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=7, decimal_places=2)
    stripe_price_id = models.CharField(max_length=100, unique=True)
    video_limit = models.IntegerField(default=1)
    can_remove_watermark = models.BooleanField(default=False)
    all_resolutions = models.BooleanField(default=False)
    can_upload_audio = models.BooleanField(default=False)

    def __str__(self):
        return self.display_name

class Subscription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        CANCELED = 'canceled', 'Canceled'
        INCOMPLETE = 'incomplete', 'Incomplete'
        PAST_DUE = 'past_due', 'Past Due'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True)
    stripe_subscription_id = models.CharField(max_length=100, unique=True, blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INCOMPLETE)
    current_period_end = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.email} - {self.plan.name if self.plan else 'No Plan'}"