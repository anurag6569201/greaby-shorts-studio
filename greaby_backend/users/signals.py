from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from greaby_project.email_utils import send_template_email
import logging

logger = logging.getLogger(__name__)

# Define the starting credit amount in one place
NEW_USER_CREDIT_GRANT = 5.00

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def grant_credits_to_new_user(sender, instance, created, **kwargs):
    """
    When a new user is created, automatically grant them a starting
    credit balance to encourage them to try the platform.
    """
    if created:
        instance.credit_balance = NEW_USER_CREDIT_GRANT
        instance.save(update_fields=['credit_balance'])
        logger.info(f"Granted {NEW_USER_CREDIT_GRANT} starting credits to new user: {instance.email}")

        # Send welcome email
        context = {
            'first_name': instance.first_name,
            'free_credits': NEW_USER_CREDIT_GRANT,
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard"
        }
        send_template_email(
            subject="Welcome to Greaby! Here are your free credits.",
            template_name="emails/welcome.html",
            context=context,
            recipient_list=[instance.email]
        )