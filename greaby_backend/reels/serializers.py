from rest_framework import serializers
from .models import Reel
from creations.serializers import VideoCreationResponseSerializer
from audio_creations.serializers import AudioCreationResponseSerializer

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
    # Nest the full serializer for source assets to provide rich data
    video_creation = VideoCreationResponseSerializer(read_only=True)
    audio_creation = AudioCreationResponseSerializer(read_only=True)
    
    result_url = serializers.SerializerMethodField()
    subtitle_url = serializers.SerializerMethodField()

    class Meta:
        model = Reel
        fields = (
            'id', 'title', 'status', 'video_creation', 'audio_creation',
            'result_url', 'error_message', 'created_at',
            'subtitle_status', 'subtitle_url', 'subtitle_error_message' # NEW subtitle fields
        )
        read_only_fields = fields
    
    def get_result_url(self, obj):
        if obj.result_file:
            return obj.result_file.url
        return None
    
    def get_subtitle_url(self, obj):
        if obj.subtitle_file:
            return obj.subtitle_file.url
        return None