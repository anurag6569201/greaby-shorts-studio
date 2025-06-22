import stripe
from django.conf import settings
from django.shortcuts import redirect
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Plan, Subscription
from users.models import User
from .serializers import PlanSerializer, SubscriptionSerializer

stripe.api_key = settings.STRIPE_SECRET_KEY

class PlanListView(generics.ListAPIView):
    queryset = Plan.objects.all().order_by('price')
    permission_classes = (AllowAny,)
    serializer_class = PlanSerializer

class CreateCheckoutSessionView(APIView):
    def post(self, request, *args, **kwargs):
        plan_id = request.data.get('planId')
        try:
            plan = Plan.objects.get(id=plan_id)
        except Plan.DoesNotExist:
            return Response({"error": "Plan not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            checkout_session = stripe.checkout.Session.create(
                client_reference_id=request.user.id,
                success_url=settings.FRONTEND_URL + '/dashboard?session_id={CHECKOUT_SESSION_ID}',
                cancel_url=settings.FRONTEND_URL + '/pricing',
                payment_method_types=['card'],
                mode='subscription',
                line_items=[{
                    'price': plan.stripe_price_id,
                    'quantity': 1
                }]
            )
            return Response({'sessionId': checkout_session.id, 'url': checkout_session.url})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StripeWebhookView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        payload = request.body
        sig_header = request.META['HTTP_STRIPE_SIGNATURE']
        event = None

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # Handle the checkout.session.completed event
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            user_id = session.get('client_reference_id')
            stripe_subscription_id = session.get('subscription')

            try:
                user = User.objects.get(id=user_id)
                stripe_sub = stripe.Subscription.retrieve(stripe_subscription_id)
                plan = Plan.objects.get(stripe_price_id=stripe_sub.items.data[0].price.id)
                
                Subscription.objects.update_or_create(
                    user=user,
                    defaults={
                        'plan': plan,
                        'stripe_subscription_id': stripe_subscription_id,
                        'status': stripe_sub.status,
                        'current_period_end': stripe_sub.current_period_end
                    }
                )
            except (User.DoesNotExist, Plan.DoesNotExist) as e:
                # Log this error
                print(f"Error handling webhook: {e}")

        # Handle other subscription events
        if event['type'] in ['customer.subscription.updated', 'customer.subscription.deleted']:
            subscription = event['data']['object']
            stripe_subscription_id = subscription.get('id')
            try:
                sub = Subscription.objects.get(stripe_subscription_id=stripe_subscription_id)
                sub.status = subscription.status
                if subscription.status == 'canceled' or subscription.get('cancel_at_period_end'):
                    sub.status = 'canceled'
                sub.save()
            except Subscription.DoesNotExist:
                print(f"Subscription not found for webhook: {stripe_subscription_id}")
        
        return Response(status=status.HTTP_200_OK)
    

class CreatePortalSessionView(APIView):
    permission_classes = (AllowAny,)
    def post(self, request, *args, **kwargs):
        try:
            # Retrieve the user's active subscription
            subscription = Subscription.objects.get(user=request.user)
            if not subscription.stripe_subscription_id:
                return Response(
                    {'error': 'You are on a free plan. Please upgrade to manage your subscription.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            stripe_customer_id = getattr(request.user, 'stripe_customer_id', None)
            
            if not stripe_customer_id:
                # This is a fallback. A customer should normally be created during checkout.
                stripe_sub = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
                stripe_customer_id = stripe_sub.customer
                
                # Save it to our user model for future use
                request.user.stripe_customer_id = stripe_customer_id
                request.user.save()

            # --- STEP 4: Create the Portal Session ---
            portal_session = stripe.billing_portal.Session.create(
                customer=stripe_customer_id,
                return_url=f"{settings.FRONTEND_URL}/dashboard?tab=settings",
            )
            return Response({'url': portal_session.url})

        except Subscription.DoesNotExist:
            # This case should be rare now that we create free subs on signup,
            # but it's good defensive programming.
            return Response({'error': 'No subscription found for this user.'}, status=status.HTTP_404_NOT_FOUND)
        except stripe.error.StripeError as e:
            # Handle specific Stripe errors gracefully
            return Response({'error': f"Stripe error: {e.user_message}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Catch any other unexpected errors
            return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MySubscriptionView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            subscription = Subscription.objects.get(user=request.user)
            serializer = SubscriptionSerializer(subscription)
            return Response(serializer.data)
        except Subscription.DoesNotExist:
            # Return the free plan details if no subscription exists
            free_plan = Plan.objects.get(name='free')
            # Create a dummy subscription object for serialization
            dummy_sub = {
                "id": None,
                "plan": PlanSerializer(free_plan).data,
                "status": "active",
                "current_period_end": None
            }
            return Response(dummy_sub)