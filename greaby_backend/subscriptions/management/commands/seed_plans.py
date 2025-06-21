from django.core.management.base import BaseCommand
from subscriptions.models import Plan

PLANS = [
    {
        "name": "free", "display_name": "Free", "price": 0.00,
        "stripe_price_id": "price_free_dummy", "video_limit": 1,
        "can_remove_watermark": False, "all_resolutions": False, "can_upload_audio": False
    },
    {
        "name": "creator", "display_name": "Creator", "price": 499.00,
        "stripe_price_id": "price_creator_dummy", "video_limit": 30,
        "can_remove_watermark": True, "all_resolutions": False, "can_upload_audio": False
    },
    {
        "name": "pro", "display_name": "Pro", "price": 1499.00,
        "stripe_price_id": "price_pro_dummy", "video_limit": 100,
        "can_remove_watermark": True, "all_resolutions": True, "can_upload_audio": True
    }
]

class Command(BaseCommand):
    help = 'Seeds the database with initial subscription plans.'

    def handle(self, *args, **kwargs):
        for plan_data in PLANS:
            Plan.objects.update_or_create(name=plan_data['name'], defaults=plan_data)
        self.stdout.write(self.style.SUCCESS('Successfully seeded subscription plans.'))