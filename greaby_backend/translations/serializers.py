from rest_framework import serializers
from .models import DocumentTranslation

class DocumentTranslationRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for requesting a new document translation.
    Handles file upload and validates language selections.
    """
    class Meta:
        model = DocumentTranslation
        fields = ('input_document', 'source_language', 'target_language')

    def validate(self, data):
        """
        Check that source and target languages are not the same.
        """
        if data['source_language'] == data['target_language']:
            raise serializers.ValidationError("Source and target languages must be different.")
        return data

class DocumentTranslationResponseSerializer(serializers.ModelSerializer):
    """
    Serializer for representing a DocumentTranslation job in API responses.
    Provides secure, expiring URLs to both the input and translated documents.
    """
    input_document_url = serializers.SerializerMethodField()
    translated_document_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentTranslation
        fields = (
            'id', 'status', 'source_language', 'target_language',
            'credit_cost', 'characters_charged', 'input_document_url', 'translated_document_url',
            'error_message', 'created_at',
        )
        read_only_fields = fields

    def get_input_document_url(self, obj):
        if obj.input_document:
            return obj.input_document.url
        return None

    def get_translated_document_url(self, obj):
        if obj.translated_document:
            return obj.translated_document.url
        return None