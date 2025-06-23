from django.contrib import admin
from .models import CreditPack, Purchase

@admin.register(CreditPack)
class CreditPackAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_name', 'credits_amount', 'price', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'display_name')
    ordering = ('price',)

@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'credit_pack', 'status', 'amount_paid', 'created_at')
    list_filter = ('status', 'credit_pack__name')
    search_fields = ('user__email', 'razorpay_order_id', 'razorpay_payment_id')
    
    # Let's make some fields editable in the admin for debugging
    readonly_fields = (
        'id', 'user', 'credit_pack', 'razorpay_order_id', 
        'razorpay_payment_id', 'razorpay_signature', 
        'credits_purchased', 'amount_paid', 'created_at', 'updated_at'
    )

    # We only want to see the status as a field, not necessarily make it readonly
    # Django automatically makes fields in readonly_fields not editable.
    # To make 'status' editable, we must remove it from readonly_fields.
    
    # CORRECTED readonly_fields:
    readonly_fields = (
        'id', 'user', 'credit_pack','status', 'razorpay_order_id', 
        'razorpay_payment_id', 'razorpay_signature', 
        'credits_purchased', 'amount_paid', 'created_at', 'updated_at'
    )
    
    # Let's organize the admin detail view
    fieldsets = (
        ('Purchase Info', {
            'fields': ('id', 'user', 'credit_pack', 'status')
        }),
        ('Payment Details', {
            'fields': ('amount_paid', 'credits_purchased', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    # You can't add purchases manually, they come from Razorpay.
    def has_add_permission(self, request):
        return False
        
    # We should not delete purchase history.
    def has_delete_permission(self, request, obj=None):
        return False