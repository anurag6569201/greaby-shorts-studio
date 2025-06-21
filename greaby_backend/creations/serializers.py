from rest_framework import serializers
from .models import Creation

class CreationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Creation
        fields = ('prompt', 'settings')

class CreationResponseSerializer(serializers.ModelSerializer):
    result_url = serializers.SerializerMethodField()

    class Meta:
        model = Creation
        fields = ('id', 'status', 'prompt', 'settings', 'result_url', 'error_message', 'created_at')
        read_only_fields = fields

    def get_result_url(self, obj):
        if obj.result_file:
            return obj.result_file.url
        return None