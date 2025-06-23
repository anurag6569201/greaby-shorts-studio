from rest_framework import serializers
from .models import VideoCreation

class VideoCreationRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for requesting a new video generation.
    Validates user input.
    """
    class Meta:
        model = VideoCreation
        fields = ('prompt', 'aspect_ratio', 'resolution', 'duration', 'n_variants')
        # All fields are required for creation.

class VideoCreationResponseSerializer(serializers.ModelSerializer):
    """
    Serializer for representing a VideoCreation in API responses.
    Provides a secure, expiring URL to the result file.
    """
    result_url = serializers.SerializerMethodField()

    class Meta:
        model = VideoCreation
        fields = (
            'id', 'status', 'prompt', 'aspect_ratio', 'resolution', 
            'duration', 'n_variants', 'credit_cost', 'result_url', 
            'error_message', 'created_at'
        )
        read_only_fields = fields

    def get_result_url(self, obj):
        """
        Generate a temporary, secure URL if the file exists.
        Our Azure Storage backend handles the creation of these signed URLs.
        """
        if obj.result_file:
            return obj.result_file.url
        return None