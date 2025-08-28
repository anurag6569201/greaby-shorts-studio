# image_creations/serializers.py

from rest_framework import serializers
from .models import ImageCreation

class ImageGenerationRequestSerializer(serializers.Serializer):
    prompt = serializers.CharField(trim_whitespace=True, min_length=1)
    n = serializers.IntegerField(min_value=1, max_value=1, default=1)
    size = serializers.ChoiceField(choices=ImageCreation.Size.choices, default=ImageCreation.Size.SQUARE)
    quality = serializers.ChoiceField(choices=ImageCreation.Quality.choices, default=ImageCreation.Quality.STANDARD)
    style = serializers.ChoiceField(choices=ImageCreation.Style.choices, default=ImageCreation.Style.VIVID)

class ImageEditRequestSerializer(serializers.Serializer):
    image = serializers.ImageField()
    prompt = serializers.CharField(trim_whitespace=True, min_length=1)
    n = serializers.IntegerField(min_value=1, max_value=1, default=1)
    size = serializers.ChoiceField(choices=ImageCreation.Size.choices, default=ImageCreation.Size.SQUARE)


class ImageCreationResponseSerializer(serializers.ModelSerializer):
    result_url = serializers.SerializerMethodField()
    source_image_url = serializers.CharField(read_only=True)

    class Meta:
        model = ImageCreation
        fields = (
            'id', 'prompt', 'operation', 'n', 'size', 'quality', 'style',
            'status', 'result_url','source_image_url', 'credit_cost', 'error_message', 'created_at'
        )
        read_only_fields = fields

    def get_result_url(self, obj):
        if obj.result_file:
            return obj.result_file.url
        return None