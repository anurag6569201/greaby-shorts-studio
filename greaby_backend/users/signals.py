from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

# Define the starting credit amount in one place
NEW_USER_CREDIT_GRANT = 10.00

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def grant_credits_to_new_user(sender, instance, created, **kwargs):
    """
    When a new user is created, automatically grant them a starting
    credit balance to encourage them to try the platform.
    """
    if created:
        instance.credit_balance = NEW_USER_CREDIT_GRANT
        instance.save(update_fields=['credit_balance'])
        print(f"Granted {NEW_USER_CREDIT_GRANT} starting credits to new user: {instance.email}")