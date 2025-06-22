# reels/serializers.py

from rest_framework import serializers
from .models import Reel
from creations.serializers import CreationResponseSerializer as VideoCreationSerializer
from audio_creations.serializers import AudioCreationResponseSerializer as AudioCreationSerializer

class ReelCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new reel. Takes the IDs of the source assets."""
    video_creation_id = serializers.UUIDField(write_only=True)
    audio_creation_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Reel
        fields = ('title', 'video_creation_id', 'audio_creation_id')

class ReelUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a reel's title."""
    class Meta:
        model = Reel
        fields = ('title',)

class ReelResponseSerializer(serializers.ModelSerializer):
    """Serializer for representing a Reel in API responses."""
    # Nest the full serializer for source assets to provide rich data to frontend
    video_creation = VideoCreationSerializer(read_only=True)
    audio_creation = AudioCreationSerializer(read_only=True)
    result_url = serializers.SerializerMethodField()

    class Meta:
        model = Reel
        fields = (
            'id', 'title', 'status', 'video_creation', 'audio_creation',
            'result_url', 'error_message', 'created_at'
        )
    
    def get_result_url(self, obj):
        request = self.context.get('request')
        if obj.result_file and request:
            return request.build_absolute_uri(obj.result_file.url)
        return None