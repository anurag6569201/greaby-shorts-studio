from django.urls import path
from .views import PlanListView, CreateCheckoutSessionView, StripeWebhookView

urlpatterns = [
    path('plans/', PlanListView.as_view(), name='plan-list'),
    path('create-checkout-session/', CreateCheckoutSessionView.as_view(), name='create-checkout'),
    path('stripe-webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
]