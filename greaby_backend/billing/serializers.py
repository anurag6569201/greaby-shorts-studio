from rest_framework import serializers
from .models import CreditPack, Purchase

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