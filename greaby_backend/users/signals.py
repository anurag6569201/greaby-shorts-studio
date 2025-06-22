# users/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from subscriptions.models import Plan, Subscription

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_free_subscription_for_new_user(sender, instance, created, **kwargs):
    """
    When a new user is created, automatically create a free subscription for them.
    This ensures every user has a plan and quota from the moment they sign up.
    """
    if created:
        try:
            free_plan = Plan.objects.get(name='free')
            Subscription.objects.create(
                user=instance,
                plan=free_plan,
                status='active'
            )
        except Plan.DoesNotExist:
            print("CRITICAL ERROR: 'free' plan not found. Cannot create subscription for new user.")