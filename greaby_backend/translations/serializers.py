from rest_framework import serializers
from .models import DocumentTranslation

class DocumentTranslationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentTranslation
        fields = ('input_document', 'source_language', 'target_language')

    def validate(self, data):
        if data.get('source_language') != 'auto' and data.get('source_language') == data.get('target_language'):
            raise serializers.ValidationError("Source and target languages must be different.")
        return data

class DocumentTranslationResponseSerializer(serializers.ModelSerializer):
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