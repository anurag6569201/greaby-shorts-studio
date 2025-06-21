from datetime import timedelta
from django.utils import timezone
from .models import Creation

def check_user_quota(user):
    """Checks if a user can generate a new video. Returns (can_generate: bool, message: str)."""
    subscription = getattr(user, 'subscription', None)
    
    if not subscription or subscription.plan.name == 'free' or subscription.status != 'active':
        # Free plan: lifetime limit
        limit = 1
        creations_count = Creation.objects.filter(user=user).count()
        if creations_count >= limit:
            return False, "Upgrade to Pro to generate more Shorts."
    else:
        # Paid plan: monthly quota
        limit = subscription.plan.video_limit
        # In a real app, use `subscription.current_period_start` from Stripe
        period_start = timezone.now() - timedelta(days=30)
        
        recent_creations_count = Creation.objects.filter(
            user=user, 
            created_at__gte=period_start
        ).count()
        
        if recent_creations_count >= limit:
            return False, "You've reached your monthly generation limit."

    return True, "Quota available."