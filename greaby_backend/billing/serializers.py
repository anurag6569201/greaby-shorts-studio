from rest_framework import serializers
from .models import CreditPack, Purchase, CreditUsage

class CreditPackSerializer(serializers.ModelSerializer):
    """
    Serializes CreditPacks for listing on the pricing page.
    """
    class Meta:
        model = CreditPack
        fields = ('id', 'name', 'display_name', 'credits_amount', 'price')
        read_only_fields = fields


class PurchaseRequestSerializer(serializers.Serializer):
    """
    Validates the incoming request to purchase a credit pack.
    """
    credit_pack_id = serializers.UUIDField(required=True)

    def validate_credit_pack_id(self, value):
        """Check that the credit pack exists and is active."""
        try:
            pack = CreditPack.objects.get(id=value, is_active=True)
        except CreditPack.DoesNotExist:
            raise serializers.ValidationError("This credit pack is not available for purchase.")
        return pack
    

class PurchaseHistorySerializer(serializers.ModelSerializer):
    """
    Serializes a user's purchase history for display.
    """
    credit_pack_name = serializers.CharField(source='credit_pack.name', read_only=True)

    class Meta:
        model = Purchase
        fields = (
            'id',
            'status',
            'credit_pack_name',
            'credits_purchased',
            'amount_paid',
            'created_at',
        )
        read_only_fields = fields
        
        
class UnifiedHistorySerializer(serializers.Serializer):
    """
    A generic serializer for displaying both purchases (credits) and usages (debits).
    This is not tied to a model but defines the structure of our combined data.
    """
    id = serializers.CharField(read_only=True)
    type = serializers.CharField(read_only=True) # 'credit' or 'debit'
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    description = serializers.CharField(read_only=True)
    details = serializers.CharField(read_only=True)
    date = serializers.DateTimeField(read_only=True)