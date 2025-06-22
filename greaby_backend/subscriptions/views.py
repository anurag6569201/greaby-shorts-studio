# subscriptions/views.py

import stripe
from datetime import timedelta
from django.utils import timezone # Import timezone
from django.conf import settings
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import Plan, Subscription
from users.models import User
from .serializers import PlanSerializer, SubscriptionSerializer

stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeWebhookView(APIView):
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
            'customer.subscription.created': self.handle_subscription_event,
            'customer.subscription.updated': self.handle_subscription_event,
            'customer.subscription.deleted': self.handle_subscription_event,
        }

        handler = event_handlers.get(event['type'])
        if handler:
            print(f"--> Stripe Webhook Received: {event['type']}")
            handler(event['data']['object'])
        else:
            print(f"--> Unhandled Stripe Webhook Event: {event['type']}")

        return Response(status=status.HTTP_200_OK)

    def handle_checkout_session(self, session):
        user_id = session.get('client_reference_id')
        stripe_customer_id = session.get('customer')
        stripe_subscription_id = session.get('subscription')

        if not user_id: return
        try:
            user = User.objects.get(id=user_id)
            if stripe_customer_id and not user.stripe_customer_id:
                user.stripe_customer_id = stripe_customer_id
                user.save()
            if stripe_subscription_id:
                Subscription.objects.update_or_create(user=user, defaults={'stripe_subscription_id': stripe_subscription_id})
                print(f"SUCCESS (checkout.session): Linked User {user.email} to Sub ID {stripe_subscription_id}")
        except User.DoesNotExist:
            print(f"Webhook Error: User with ID {user_id} not found.")
        except Exception as e:
            print(f"Webhook Error in handle_checkout_session: {e}")

    def handle_subscription_event(self, subscription_data):
        stripe_subscription_id = subscription_data.get('id')
        stripe_customer_id = subscription_data.get('customer')

        try:
            user = User.objects.get(stripe_customer_id=stripe_customer_id)
            local_subscription, created = Subscription.objects.get_or_create(
                user=user,
                defaults={'stripe_subscription_id': stripe_subscription_id}
            )
            
            price_id = subscription_data['items']['data'][0]['price']['id']
            new_plan = Plan.objects.get(stripe_price_id=price_id)
            
            # --- THIS IS THE NEW, ROBUST LOGIC ---
            
            # Check if this is an upgrade from the free plan
            is_upgrade_from_free = local_subscription.plan.name == 'free' and new_plan.price > 0

            # Store the current status from the webhook
            new_status = subscription_data.get('status')

            # Update the local subscription object
            local_subscription.stripe_subscription_id = stripe_subscription_id
            local_subscription.plan = new_plan
            local_subscription.status = new_status
            
            if is_upgrade_from_free:
                # This is the first payment. We set the billing cycle dates ourselves.
                print(f"Upgrade detected for {user.email}. Setting billing cycle start date to now.")
                local_subscription.current_period_start = timezone.now()
                # Assuming all paid plans are monthly for this calculation
                local_subscription.current_period_end = timezone.now() + timedelta(days=30) 
            else:
                # This is a renewal or other update. Trust the dates from Stripe.
                start_timestamp = subscription_data.get('current_period_start')
                end_timestamp = subscription_data.get('current_period_end')
                local_subscription.current_period_start = datetime.fromtimestamp(start_timestamp) if start_timestamp else local_subscription.current_period_start
                local_subscription.current_period_end = datetime.fromtimestamp(end_timestamp) if end_timestamp else local_subscription.current_period_end
                
            local_subscription.save()

            print(f"SUCCESS (subscription event): Synced subscription {stripe_subscription_id} for user {local_subscription.user.email} to plan '{new_plan.name}' with status '{new_status}'.")

        except User.DoesNotExist:
            print(f"CRITICAL Webhook Error: Could not find User with Stripe Customer ID {stripe_customer_id}")
        except Plan.DoesNotExist:
             print(f"Webhook Error: Plan with Stripe Price ID {price_id} not found in the database.")
        except Exception as e:
            print(f"Webhook Error in handle_subscription_event: {e}")

# ... (The rest of the file: PlanListView, CreateCheckoutSessionView, etc., is correct and can remain as is) ...
class PlanListView(generics.ListAPIView):
    queryset = Plan.objects.all().order_by('price')
    permission_classes = [AllowAny]
    serializer_class = PlanSerializer

class CreateCheckoutSessionView(APIView):
    def post(self, request, *args, **kwargs):
        plan_id = request.data.get('planId')
        try:
            plan = Plan.objects.get(id=plan_id)
            if plan.price <= 0:
                return Response({"error": "Cannot create checkout for a free plan."}, status=status.HTTP_400_BAD_REQUEST)
        except Plan.DoesNotExist:
            return Response({"error": "Plan not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            if not request.user.stripe_customer_id:
                customer = stripe.Customer.create(
                    email=request.user.email,
                    name=f"{request.user.first_name} {request.user.last_name}",
                    metadata={'user_id': str(request.user.id)}
                )
                request.user.stripe_customer_id = customer.id
                request.user.save()

            checkout_session = stripe.checkout.Session.create(
                client_reference_id=str(request.user.id),
                customer=request.user.stripe_customer_id,
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
            print(f"Error creating checkout session: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CreatePortalSessionView(APIView):
    def post(self, request, *args, **kwargs):
        try:
            subscription = Subscription.objects.get(user=request.user)
            if not subscription.stripe_subscription_id or subscription.plan.price <= 0:
                return Response({'error': 'Not a paid subscription.'}, status=status.HTTP_400_BAD_REQUEST)
            
            portal_session = stripe.billing_portal.Session.create(
                customer=request.user.stripe_customer_id,
                return_url=f"{settings.FRONTEND_URL}/dashboard?tab=settings",
            )
            return Response({'url': portal_session.url})
        except Subscription.DoesNotExist:
            return Response({'error': 'No subscription found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MySubscriptionView(generics.RetrieveAPIView):
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]
    def get_object(self):
        return Subscription.objects.get(user=self.request.user)