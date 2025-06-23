from django.contrib import admin
from .models import CreditPack, Purchase

@admin.register(CreditPack)
class CreditPackAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_name', 'credits_amount', 'price', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'display_name')

@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('user', 'credit_pack', 'status', 'amount_paid', 'created_at')
    list_filter = ('status', 'credit_pack')
    search_fields = ('user__email', 'razorpay_order_id', 'razorpay_payment_id')
    readonly_fields = ('created_at', 'updated_at')