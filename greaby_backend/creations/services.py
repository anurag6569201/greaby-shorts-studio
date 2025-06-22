# creations/services.py

from datetime import timedelta
from django.utils import timezone
from .models import Creation
from audio_creations.models import AudioCreation

def check_user_quota(user):
    """
    Checks if a user can generate a new creation based on their plan.
    Returns (can_generate: bool, message: str).
    """
    subscription = getattr(user, 'subscription', None)

    if not subscription or subscription.status != 'active':
        return False, "Your subscription is not active."
    
    plan = subscription.plan
    
    # For paid plans, check monthly quota. For free plan, it's a lifetime limit.
    if plan.name == 'free':
        period_start = None # No time window for free plan
    else:
        # In a real app with Stripe, you would use `subscription.current_period_start`
        period_start = timezone.now() - timedelta(days=30)
    
    video_query = Creation.objects.filter(user=user)
    audio_query = AudioCreation.objects.filter(user=user)

    if period_start:
        video_query = video_query.filter(created_at__gte=period_start)
        audio_query = audio_query.filter(created_at__gte=period_start)

    total_creations = video_query.count() + audio_query.count()

    if total_creations >= plan.total_creations_limit:
        msg = "You have reached your lifetime generation limit. Please upgrade." if plan.name == 'free' else "You have reached your monthly generation limit."
        return False, msg

    return True, "Quota available."