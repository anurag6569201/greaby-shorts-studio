# video_translations/serializers.py

from rest_framework import serializers
from .models import VideoTranslation

class VideoTranslationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoTranslation
        fields = (
            'title', 'source_video_file', 'source_locale', 'target_locale',
            'speaker_count', 'embed_subtitles'
        )
        extra_kwargs = {
            'speaker_count': {'required': False},
            'embed_subtitles': {'required': False},
        }

    def validate(self, data):
        if data['source_locale'] == data['target_locale']:
            raise serializers.ValidationError("Source and target languages cannot be the same.")
        return data

class VideoTranslationResponseSerializer(serializers.ModelSerializer):
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = VideoTranslation
        fields = (
            'id', 'title', 'status', 'created_at', 'error_message', 'credit_cost',
            'source_locale', 'target_locale', 'result_video_url', 'result_subtitle_url',
            'thumbnail_url'
        )
        read_only_fields = fields
    
    def get_thumbnail_url(self, obj):
        # Return None for now - can be extended to generate thumbnails from video
        return None