from django.urls import path
from .views import CreditPackListView, CreatePurchaseOrderView, RazorpayWebhookView, PurchaseHistoryListView

urlpatterns = [
    path('credit-packs/', CreditPackListView.as_view(), name='credit-pack-list'),
    path('purchase/', CreatePurchaseOrderView.as_view(), name='create-purchase-order'),
    path('webhook/', RazorpayWebhookView.as_view(), name='razorpay-webhook'),
    path('history/', PurchaseHistoryListView.as_view(), name='purchase-history-list'),
]