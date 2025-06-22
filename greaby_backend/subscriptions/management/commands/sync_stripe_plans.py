# backend/subscriptions/management/commands/sync_stripe_plans.py

import stripe
from django.core.management.base import BaseCommand
from django.conf import settings
from subscriptions.models import Plan

class Command(BaseCommand):
    help = 'Sync plans and prices from Stripe with the local database'

    def handle(self, *args, **kwargs):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.stdout.write("Starting to sync Stripe plans...")

        # --- Create or Update the 'Free' Plan ---
        try:
            free_plan, created = Plan.objects.update_or_create(
                name='free',
                defaults={
                    'display_name': 'Free',
                    'price': 0.00,
                    'stripe_price_id': 'price_free_tier', # Dummy ID
                    'video_limit': 1,
                    'max_duration': 5,
                    'allowed_resolutions': ['480p'],
                    'allowed_aspect_ratios': ['1:1'],
                    'can_remove_watermark': False,
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS("Successfully created the Free plan."))
            else:
                self.stdout.write("Free plan already exists, updated.")
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error creating free plan: {e}"))
            return

        # --- Sync Plans from Stripe ---
        try:
            products = stripe.Product.list(active=True, limit=100)
            self.stdout.write(f"Found {len(products.data)} active products in Stripe.")

            for product in products.data:
                prices = stripe.Price.list(product=product.id, active=True, limit=1)
                
                if not prices.data:
                    self.stdout.write(self.style.WARNING(f"Product '{product.name}' has no active prices. Skipping."))
                    continue
                
                price = prices.data[0]

                # --- Get features from Stripe metadata ---
                video_limit = int(product.metadata.get('video_limit', 10))
                max_duration = int(product.metadata.get('max_duration', 20))
                resolutions_str = product.metadata.get('allowed_resolutions', '480p,720p,1080p')
                ratios_str = product.metadata.get('allowed_aspect_ratios', '1:1,16:9,9:16')
                
                plan, created = Plan.objects.update_or_create(
                    stripe_price_id=price.id,
                    defaults={
                        'name': product.name.lower().replace(' ', '_'),
                        'display_name': product.name,
                        'price': price.unit_amount / 100.0,
                        'video_limit': video_limit,
                        'max_duration': max_duration,
                        'allowed_resolutions': [r.strip() for r in resolutions_str.split(',')],
                        'allowed_aspect_ratios': [r.strip() for r in ratios_str.split(',')],
                        'can_remove_watermark': product.metadata.get('can_remove_watermark', 'false').lower() == 'true',
                    }
                )

                if created:
                    self.stdout.write(self.style.SUCCESS(f"Created plan: {plan.display_name}"))
                else:
                    self.stdout.write(f"Updated plan: {plan.display_name}")
            
            self.stdout.write(self.style.SUCCESS("Stripe sync completed successfully!"))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"An error occurred during Stripe sync: {e}"))