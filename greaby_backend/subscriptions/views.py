# subscriptions/views.py

import stripe
from datetime import datetime
from django.conf import settings
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import Plan, Subscription
from users.models import User
from .serializers import PlanSerializer, SubscriptionSerializer

stripe.api_key = settings.STRIPE_SECRET_KEY

class PlanListView(generics.ListAPIView):
    """
    Provides a list of all active, priced plans for the pricing page.
    It excludes the 'free' plan, which is handled implicitly.
    """
    queryset = Plan.objects.filter(price__gt=0).order_by('price')
    permission_classes = [AllowAny]
    serializer_class = PlanSerializer

class CreateCheckoutSessionView(APIView):
    """
    Creates a Stripe Checkout session for a user to subscribe to a new plan.
    """
    def post(self, request, *args, **kwargs):
        plan_id = request.data.get('planId')
        try:
            plan = Plan.objects.get(id=plan_id)
        except Plan.DoesNotExist:
            return Response({"error": "Plan not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            checkout_session = stripe.checkout.Session.create(
                client_reference_id=request.user.id,
                customer=request.user.stripe_customer_id, # Pre-fill customer if they exist
                success_url=settings.FRONTEND_URL + '/dashboard?session_id={CHECKOUT_SESSION_ID}',
                cancel_url=settings.FRONTEND_URL + '/pricing',
                payment_method_types=['card'],
                mode='subscription',
                line_items=[{
                    'price': plan.stripe_price_id,
                    'quantity': 1,
                }]
            )
            return Response({'sessionId': checkout_session.id, 'url': checkout_session.url})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StripeWebhookView(APIView):
    """
    Handles incoming webhooks from Stripe to create and update subscriptions.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        payload = request.body
        sig_header = request.headers.get('Stripe-Signature')
        
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            return Response({'error': f'Invalid webhook signature: {e}'}, status=status.HTTP_400_BAD_REQUEST)

        event_handlers = {
            'checkout.session.completed': self.handle_checkout_session,
            'customer.subscription.updated': self.handle_subscription_update,
            'customer.subscription.deleted': self.handle_subscription_update,
        }

        handler = event_handlers.get(event['type'])
        if handler:
            handler(event['data']['object'])

        return Response(status=status.HTTP_200_OK)

    def handle_checkout_session(self, session):
        user_id = session.get('client_reference_id')
        stripe_customer_id = session.get('customer')
        stripe_subscription_id = session.get('subscription')

        if not all([user_id, stripe_customer_id, stripe_subscription_id]):
            print(f"Webhook Error: Missing data in checkout session {session.get('id')}")
            return

        try:
            user = User.objects.get(id=user_id)
            if not user.stripe_customer_id:
                user.stripe_customer_id = stripe_customer_id
                user.save()

            stripe_sub = stripe.Subscription.retrieve(stripe_subscription_id)
            price_id = stripe_sub.items.data[0].price.id
            plan = Plan.objects.get(stripe_price_id=price_id)

            Subscription.objects.update_or_create(
                user=user,
                defaults={
                    'plan': plan,
                    'stripe_subscription_id': stripe_subscription_id,
                    'status': stripe_sub.status,
                    'current_period_start': datetime.fromtimestamp(stripe_sub.current_period_start),
                    'current_period_end': datetime.fromtimestamp(stripe_sub.current_period_end),
                }
            )
        except (User.DoesNotExist, Plan.DoesNotExist) as e:
            print(f"Webhook Error: Could not find User or Plan. {e}")
        except Exception as e:
            print(f"Webhook Error in handle_checkout_session: {e}")

    def handle_subscription_update(self, subscription_data):
        stripe_subscription_id = subscription_data.get('id')
        try:
            local_subscription = Subscription.objects.get(stripe_subscription_id=stripe_subscription_id)
            
            local_subscription.status = subscription_data.status
            local_subscription.current_period_start = datetime.fromtimestamp(subscription_data.current_period_start)
            local_subscription.current_period_end = datetime.fromtimestamp(subscription_data.current_period_end)

            # Ensure the plan is correct if it was changed in Stripe
            new_price_id = subscription_data.items.data[0].price.id
            if local_subscription.plan.stripe_price_id != new_price_id:
                local_subscription.plan = Plan.objects.get(stripe_price_id=new_price_id)

            local_subscription.save()
        except (Subscription.DoesNotExist, Plan.DoesNotExist) as e:
            print(f"Webhook Update Error: Could not find Subscription or Plan. {e}")
        except Exception as e:
            print(f"Webhook Error in handle_subscription_update: {e}")

class CreatePortalSessionView(APIView):
    """
    Creates a Stripe Billing Portal session for a user to manage their subscription.
    """
    def post(self, request, *args, **kwargs):
        try:
            subscription = Subscription.objects.get(user=request.user)
            if not subscription.stripe_subscription_id:
                return Response(
                    {'error': 'Free plan users cannot manage subscriptions.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            portal_session = stripe.billing_portal.Session.create(
                customer=request.user.stripe_customer_id,
                return_url=f"{settings.FRONTEND_URL}/dashboard?tab=settings",
            )
            return Response({'url': portal_session.url})
        except Subscription.DoesNotExist:
            return Response({'error': 'No subscription found for this user.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MySubscriptionView(generics.RetrieveAPIView):
    """
    Retrieves the currently authenticated user's subscription details.
    """
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # We can be sure a subscription exists due to the post_save signal on User creation
        return Subscription.objects.get(user=self.request.user)