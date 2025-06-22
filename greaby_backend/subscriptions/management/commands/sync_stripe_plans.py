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

        # --- Define and sync the local 'Free' Plan ---
        Plan.objects.update_or_create(
            name='free',
            defaults={
                'display_name': 'Free',
                'price': 0.00,
                'stripe_price_id': 'price_free_tier',
                'total_creations_limit': 1,
                'max_video_duration': 10,
                'video_resolutions': ['480p'],
                'video_aspect_ratios': ['1:1'],
                'can_remove_watermark': False,
                'max_audio_characters': 500,
                'available_voices': ['alloy', 'nova'],
            }
        )
        self.stdout.write(self.style.SUCCESS("Successfully created/updated the local Free plan."))

        # --- Sync Paid Plans from Stripe ---
        try:
            products = stripe.Product.list(active=True, expand=['data.default_price'])
            self.stdout.write(f"Found {len(products.data)} active products in Stripe.")

            for product in products.data:
                if product.name.lower() == 'free':
                    self.stdout.write(self.style.NOTICE(f"Skipping product named '{product.name}' as it's managed locally."))
                    continue
                    
                price = product.default_price
                if not price:
                    self.stdout.write(self.style.WARNING(f"Product '{product.name}' has no default price. Skipping."))
                    continue
                
                meta = product.metadata
                
                # --- THIS IS THE CRITICAL FIX ---
                # We use the generated 'name' as the unique key for lookup.
                # This ensures that even if you replace a product in Stripe with the
                # same name but a different ID, it will UPDATE the existing local plan
                # instead of trying to create a new one and causing a name collision.
                plan_name_slug = product.name.lower().replace(' ', '_')

                plan_defaults = {
                    'display_name': product.name,
                    'price': price.unit_amount / 100.0,
                    'stripe_price_id': price.id, # The price ID is now just an attribute to be updated
                    'total_creations_limit': int(meta['total_creations_limit']),
                    'max_video_duration': int(meta['max_video_duration']),
                    'video_resolutions': [r.strip() for r in meta['video_resolutions'].split(',')],
                    'video_aspect_ratios': [r.strip() for r in meta['video_aspect_ratios'].split(',')],
                    'can_remove_watermark': meta['can_remove_watermark'].lower() == 'true',
                    'max_audio_characters': int(meta['max_audio_characters']),
                    'available_voices': [v.strip() for v in meta['available_voices'].split(',')],
                }
                
                # The first argument to update_or_create is the lookup kwargs.
                plan, created = Plan.objects.update_or_create(
                    name=plan_name_slug,
                    defaults=plan_defaults
                )

                action = "Created" if created else "Updated"
                self.stdout.write(f"Successfully {action} plan from Stripe: {plan.display_name}")
            
            self.stdout.write(self.style.SUCCESS("Stripe sync completed successfully!"))

        except stripe.error.StripeError as e:
            self.stderr.write(self.style.ERROR(f"A Stripe API error occurred: {e}"))
        except KeyError as e:
            self.stderr.write(self.style.ERROR(f"Metadata key missing: {e}. Please ensure all required metadata fields are set on your Stripe products."))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"An unexpected error occurred: {e}"))