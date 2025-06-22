# subscriptions/management/commands/sync_stripe_plans.py

import stripe
from django.core.management.base import BaseCommand
from django.conf import settings
from subscriptions.models import Plan

class Command(BaseCommand):
    help = 'Sync plans and prices from Stripe with the local database'

    def handle(self, *args, **kwargs):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.stdout.write("Starting Stripe plan sync...")

        # --- Sync the 'Free' Plan ---
        Plan.objects.update_or_create(
            name='free',
            defaults={
                'display_name': 'Free',
                'price': 0.00,
                'stripe_price_id': 'price_free_tier', # Dummy ID
                'total_creations_limit': 3,
                'max_video_duration': 5,
                'video_resolutions': ['480p'],
                'video_aspect_ratios': ['1:1'],
                'can_remove_watermark': False,
                'max_audio_characters': 500,
                'available_voices': ['alloy'],
            }
        )
        self.stdout.write(self.style.SUCCESS("Successfully created/updated the local Free plan."))

        # --- Sync Paid Plans from Stripe ---
        try:
            products = stripe.Product.list(active=True, expand=['data.default_price'])
            self.stdout.write(f"Found {len(products.data)} active products in Stripe.")

            for product in products.data:
                price = product.default_price
                if not price:
                    self.stdout.write(self.style.WARNING(f"Product '{product.name}' has no default price. Skipping."))
                    continue
                
                meta = product.metadata

                # --- Get features from Stripe metadata with sensible defaults ---
                plan, created = Plan.objects.update_or_create(
                    stripe_price_id=price.id,
                    defaults={
                        'name': product.name.lower().replace(' ', '_'),
                        'display_name': product.name,
                        'price': price.unit_amount / 100.0,
                        'total_creations_limit': int(meta.get('total_creations_limit', 10)),
                        'max_video_duration': int(meta.get('max_video_duration', 10)),
                        'video_resolutions': [r.strip() for r in meta.get('video_resolutions', '480p,720p').split(',')],
                        'video_aspect_ratios': [r.strip() for r in meta.get('video_aspect_ratios', '1:1,9:16,16:9').split(',')],
                        'can_remove_watermark': meta.get('can_remove_watermark', 'false').lower() == 'true',
                        'max_audio_characters': int(meta.get('max_audio_characters', 2000)),
                        'available_voices': [v.strip() for v in meta.get('available_voices', 'alloy,echo,fable,onyx,nova,shimmer').split(',')],
                    }
                )

                action = "Created" if created else "Updated"
                self.stdout.write(f"Successfully {action} plan: {plan.display_name}")
            
            self.stdout.write(self.style.SUCCESS("Stripe sync completed successfully!"))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"An error occurred during Stripe sync: {e}"))