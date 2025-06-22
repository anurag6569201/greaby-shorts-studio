# subscriptions/urls.py

from django.urls import path
from .views import (
    PlanListView, 
    CreateCheckoutSessionView, 
    StripeWebhookView, 
    CreatePortalSessionView, 
    MySubscriptionView
)

urlpatterns = [
    path('plans/', PlanListView.as_view(), name='plan-list'),
    path('my-subscription/', MySubscriptionView.as_view(), name='my-subscription'),
    path('create-checkout-session/', CreateCheckoutSessionView.as_view(), name='create-checkout'),
    path('create-portal-session/', CreatePortalSessionView.as_view(), name='create-portal-session'),
    path('stripe-webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
]