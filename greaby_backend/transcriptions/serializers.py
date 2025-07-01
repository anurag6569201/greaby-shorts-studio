# transcriptions/serializers.py

from rest_framework import serializers
from .models import Transcription

class TranscriptionRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new transcription job.
    """
    duration_minutes = serializers.IntegerField(write_only=True, min_value=1, help_text="Estimated duration of the media in minutes.")

    class Meta:
        model = Transcription
        fields = (
            'title', 
            'source_file', 
            'source_language', 
            'enable_speaker_separation',
            'generate_insights',
            'duration_minutes'
        )

class TranscriptionResponseSerializer(serializers.ModelSerializer):
    """
    Serializer for representing a Transcription in API responses.
    """
    source_url = serializers.SerializerMethodField()
    result_url = serializers.SerializerMethodField()

    class Meta:
        model = Transcription
        fields = (
            'id', 'title', 'status', 'source_language', 'enable_speaker_separation',
            'credit_cost', 'source_url', 'result_url', 'error_message', 'created_at',
            'generate_insights', 'summary', 'keywords'
        )
        read_only_fields = fields

    def get_source_url(self, obj):
        # Source file is deleted, so it might not exist. Return None if so.
        if obj.source_file:
            try:
                return obj.source_file.url
            except Exception:
                return None
        return None

    def get_result_url(self, obj):
        if obj.result_file:
            try:
                return obj.result_file.url
            except Exception:
                return None
        return None