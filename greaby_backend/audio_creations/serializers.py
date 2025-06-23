from rest_framework import serializers
from .models import AudioCreation

class AudioCreationRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for requesting a new audio generation.
    """
    class Meta:
        model = AudioCreation
        fields = ('title', 'text_input', 'voice', 'response_format', 'speed')
        extra_kwargs = {
            'title': {'required': False},
            'speed': {'required': False} # Use default if not provided
        }
    
    def validate_speed(self, value):
        if not (0.25 <= value <= 4.0):
            raise serializers.ValidationError("Speed must be between 0.25 and 4.0.")
        return value

class AudioCreationUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for only updating the title of an existing audio creation.
    """
    class Meta:
        model = AudioCreation
        fields = ('title',)

class AudioCreationResponseSerializer(serializers.ModelSerializer):
    """
    Serializer for representing an AudioCreation in API responses.
    Provides a secure, expiring URL to the result file.
    """
    result_url = serializers.SerializerMethodField()

    class Meta:
        model = AudioCreation
        fields = (
            'id', 'title', 'status', 'text_input', 'voice', 'response_format', 
            'speed', 'credit_cost', 'result_url', 'error_message', 'created_at'
        )
        read_only_fields = fields

    def get_result_url(self, obj):
        """
        Generate a temporary, secure URL if the file exists.
        """
        if obj.result_file:
            return obj.result_file.url
        return None