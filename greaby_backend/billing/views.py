import razorpay
import json
from django.conf import settings
from django.db import transaction

from rest_framework import generics, status, views
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import CreditPack, Purchase
from .serializers import CreditPackSerializer, PurchaseRequestSerializer, PurchaseHistorySerializer
from users.models import User
import time

# Initialize Razorpay client
client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

class CreditPackListView(generics.ListAPIView):
    """
    Lists all active credit packs available for purchase.
    """
    queryset = CreditPack.objects.filter(is_active=True)
    permission_classes = [AllowAny]
    serializer_class = CreditPackSerializer

class CreatePurchaseOrderView(views.APIView):
    """
    Creates a Razorpay order when a user wants to buy a credit pack.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        request_serializer = PurchaseRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        
        credit_pack = request_serializer.validated_data['credit_pack_id']
        user = request.user
        amount_in_paise = int(credit_pack.price * 100) # Razorpay expects amount in paise

        try:
            timestamp = int(time.time())
            short_user_id = str(user.id).split('-')[0] # Takes the first 8 chars of the UUID
            short_pack_id = str(credit_pack.id).split('-')[0] # Takes the first 8 chars of the UUID
            receipt_id = f"gby_{timestamp}_{short_user_id}"
            # 1. Create Razorpay Order
            order_data = {
                "amount": amount_in_paise,
                "currency": "INR", # Change if you support other currencies
                "receipt": receipt_id,
                "notes": {
                    "user_id": str(user.id),
                    "credit_pack_id": str(credit_pack.id),
                }
            }
            razorpay_order = client.order.create(data=order_data)
            print(razorpay_order)
            # 2. Create local Purchase record in 'pending' state
            Purchase.objects.create(
                user=user,
                credit_pack=credit_pack,
                razorpay_order_id=razorpay_order['id'],
                status=Purchase.Status.PENDING,
                credits_purchased=credit_pack.credits_amount,
                amount_paid=credit_pack.price
            )

            # 3. Return order details to frontend to open Razorpay modal
            response_data = {
                "razorpay_order_id": razorpay_order['id'],
                "razorpay_key_id": settings.RAZORPAY_KEY_ID,
                "amount": razorpay_order['amount'],
                "currency": razorpay_order['currency'],
                "user_name": f"{user.first_name} {user.last_name}",
                "user_email": user.email,
            }
            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"ERROR: Razorpay order creation failed for user {user.email}: {e}")
            return Response({'error': 'Failed to create payment order.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RazorpayWebhookView(views.APIView):
    """
    Handles incoming webhooks from Razorpay to confirm payments.
    This is the most critical part of the payment flow.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        # 1. Verify webhook signature for security
        razorpay_signature = request.headers.get('X-Razorpay-Signature')
        try:
            client.utility.verify_webhook_signature(
                request.body.decode('utf-8'),
                razorpay_signature,
                settings.RAZORPAY_WEBHOOK_SECRET
            )
        except razorpay.errors.SignatureVerificationError:
            print("WEBHOOK ERROR: Invalid Razorpay signature.")
            return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

        payload = json.loads(request.body)
        event = payload.get('event')

        # 2. Handle the 'payment.captured' event
        if event == 'payment.captured':
            payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
            print(payment_entity)
            if not payment_entity:
                return Response(status=status.HTTP_200_OK)

            razorpay_order_id = payment_entity.get('order_id')
            razorpay_payment_id = payment_entity.get('id')

            try:
                # Use a transaction to ensure atomicity
                with transaction.atomic():
                    # Find the corresponding 'pending' purchase
                    purchase = Purchase.objects.select_for_update().get(
                        razorpay_order_id=razorpay_order_id,
                        status=Purchase.Status.PENDING
                    )
                    
                    # Update purchase record
                    purchase.status = Purchase.Status.COMPLETED
                    purchase.razorpay_payment_id = razorpay_payment_id
                    purchase.razorpay_signature = razorpay_signature
                    purchase.save()
                    
                    # Grant credits to the user
                    user = purchase.user
                    user.credit_balance += purchase.credits_purchased
                    user.save(update_fields=['credit_balance'])
                    
                    print(f"SUCCESS: Granted {purchase.credits_purchased} credits to {user.email}.")

            except Purchase.DoesNotExist:
                # This can happen if a webhook is for an old/already processed order.
                # It's safe to ignore.
                print(f"WEBHOOK INFO: Received webhook for already processed or non-existent order {razorpay_order_id}.")
            except Exception as e:
                print(f"WEBHOOK CRITICAL ERROR processing order {razorpay_order_id}: {e}")
                # Potentially send an alert to admin here
                return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(status=status.HTTP_200_OK)
    

class PurchaseHistoryListView(generics.ListAPIView):
    """
    Lists all completed purchases for the currently authenticated user.
    """
    serializer_class = PurchaseHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Return only completed purchases for the current user, ordered by most recent first.
        return Purchase.objects.filter(
            user=self.request.user, 
            status=Purchase.Status.COMPLETED
        ).order_by('-created_at')