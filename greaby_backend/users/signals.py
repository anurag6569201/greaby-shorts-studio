# users/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from subscriptions.models import Plan, Subscription

# This decorator registers the function to listen for the post_save signal
# from the User model (defined in settings.AUTH_USER_MODEL).
@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_free_subscription_for_new_user(sender, instance, created, **kwargs):
    """
    When a new user is created, automatically create a free subscription for them.
    """
    # The 'created' boolean is True only on the first save (i.e., user creation).
    if created:
        try:
            # Find the 'free' plan that we created with our management command.
            free_plan = Plan.objects.get(name='free')
            
            # Create the Subscription object for the new user.
            Subscription.objects.create(
                user=instance,
                plan=free_plan,
                status='active' # The free plan is always active
            )
        except Plan.DoesNotExist:
            # This is a critical configuration error. The free plan MUST exist.
            # In a real production system, you would log this error prominently.
            print("CRITICAL ERROR: 'free' plan not found in the database. Cannot create subscription for new user.")