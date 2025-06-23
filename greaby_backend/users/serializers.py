from rest_framework import serializers
from .models import User

class RegisterUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('email', 'password', 'first_name', 'last_name')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the user's profile information.
    Includes the credit balance so the frontend can display it.
    """
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'credit_balance')
        read_only_fields = ('credit_balance',)