import uuid
from django.db import models
from django.conf import settings

class CreditPack(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, help_text="Customer-facing name, e.g., 'Creator Pack'")
    display_name = models.CharField(max_length=100, help_text="e.g., '100 Credits'")
    credits_amount = models.PositiveIntegerField(help_text="How many credits this pack provides.")
    price = models.DecimalField(max_digits=7, decimal_places=2, help_text="Price in USD or local currency.")
    is_active = models.BooleanField(default=True, help_text="Whether this pack is available for purchase.")
    razorpay_product_id = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['price']

    def __str__(self):
        return f"{self.display_name} ({self.credits_amount} credits for ${self.price})"

class Purchase(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='purchases')
    credit_pack = models.ForeignKey(CreditPack, on_delete=models.SET_NULL, null=True)
    razorpay_order_id = models.CharField(max_length=100, unique=True, help_text="The Order ID created in Razorpay.")
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True, help_text="The Payment ID from a successful transaction.")
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True, help_text="The signature from a successful transaction.")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    credits_purchased = models.PositiveIntegerField()
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Purchase {self.id} by {self.user.email} for {self.credits_purchased} credits"

# --- NEW MODEL: A single source of truth for all expenses ---
class CreditUsage(models.Model):
    class UsageType(models.TextChoices):
        VIDEO = 'video', 'Video Generation'
        AUDIO = 'audio', 'Audio Generation'
        SUBTITLE = 'subtitle', 'Subtitle Generation'
        VIDEO_TRANSLATION = 'translation', 'Video Translation'
        TRANSCRIPTION = 'transcription', 'Transcription Generation'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='credit_usages')
    usage_type = models.CharField(max_length=20, choices=UsageType.choices)
    credits_spent = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255) # e.g., prompt snippet or title
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.usage_type} by {self.user.email} for {self.credits_spent} credits"