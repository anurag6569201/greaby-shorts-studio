from django.urls import path
from .views import (
    CreditPackListView, 
    CreatePurchaseOrderView, 
    RazorpayWebhookView, 
    PurchaseHistoryListView,
    UnifiedHistoryView # Import the new view
)

urlpatterns = [
    path('credit-packs/', CreditPackListView.as_view(), name='credit-pack-list'),
    path('purchase/', CreatePurchaseOrderView.as_view(), name='create-purchase-order'),
    path('webhook/', RazorpayWebhookView.as_view(), name='razorpay-webhook'),
    
    # The new unified endpoint
    path('usage/', UnifiedHistoryView.as_view(), name='unified-history-list'),

    # Optional: Keep the old one for now or deprecate it
    path('history/', PurchaseHistoryListView.as_view(), name='purchase-history-list'),
]