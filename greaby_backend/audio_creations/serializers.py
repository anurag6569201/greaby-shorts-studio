# audio_creations/serializers.py

from rest_framework import serializers
from .models import AudioCreation

# --- This serializer is for CREATING new audio ---
class AudioCreationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AudioCreation
        fields = ('text_input', 'settings', 'title')
        extra_kwargs = {
            'title': {'required': False} # Title is optional on creation
        }

# --- NEW: This serializer is for UPDATING the title ---
class AudioCreationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AudioCreation
        fields = ('title',) # Only allow updating the title

# --- This serializer is for LISTING and RETRIEVING audio ---
class AudioCreationResponseSerializer(serializers.ModelSerializer):
    result_url = serializers.SerializerMethodField()

    class Meta:
        model = AudioCreation
        fields = (
            'id', 'title', 'status', 'text_input', 'settings',
            'result_url', 'error_message', 'created_at'
        )
        read_only_fields = fields

    def get_result_url(self, obj):
        request = self.context.get('request')
        if obj.result_file and request:
            return request.build_absolute_uri(obj.result_file.url)
        return None