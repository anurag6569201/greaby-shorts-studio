from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Plan
from .serializers import PlanSerializer

class PlanListView(generics.ListAPIView):
    queryset = Plan.objects.all().order_by('price')
    permission_classes = (AllowAny,)
    serializer_class = PlanSerializer

class CreateCheckoutSessionView(APIView):
    def post(self, request, *args, **kwargs):
        # DUMMY ACTION - The real implementation requires Stripe integration.
        # This view would use the Stripe library to create a checkout session
        # and return the session URL to the frontend for redirection.
        plan_id = request.data.get('planId')
        print(f"DUMMY: Creating Stripe checkout session for plan {plan_id} for user {request.user.email}")
        return Response(
            {'sessionId': f'dummy_session_id_for_{plan_id}'},
            status=status.HTTP_200_OK
        )

class StripeWebhookView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        # DUMMY ACTION - The real implementation requires verifying the Stripe
        # webhook signature and handling events like 'checkout.session.completed'.
        print("DUMMY: Received a webhook event from Stripe.")
        return Response(status=status.HTTP_200_OK)