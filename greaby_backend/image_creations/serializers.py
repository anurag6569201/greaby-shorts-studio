from rest_framework import serializers
from .models import ImageCreation

class ImageGenerationRequestSerializer(serializers.Serializer):
    prompt = serializers.CharField(trim_whitespace=True, min_length=1)
    n = serializers.IntegerField(min_value=1, max_value=1, default=1)
    size = serializers.ChoiceField(choices=ImageCreation.Size.choices, default=ImageCreation.Size.SQUARE)
    quality = serializers.ChoiceField(choices=ImageCreation.Quality.choices, default=ImageCreation.Quality.STANDARD)
    style = serializers.ChoiceField(choices=ImageCreation.Style.choices, default=ImageCreation.Style.VIVID)
    provider = serializers.ChoiceField(choices=ImageCreation.Provider.choices, default=ImageCreation.Provider.KONTEXT_PRO)

class ImageEditRequestSerializer(serializers.Serializer):
    image = serializers.ListField(
        child=serializers.ImageField(), min_length=1, max_length=4
    )
    prompt = serializers.CharField(trim_whitespace=True, min_length=1)
    n = serializers.IntegerField(min_value=1, max_value=4)
    size = serializers.ChoiceField(choices=ImageCreation.Size.choices, default=ImageCreation.Size.SQUARE)
    provider = serializers.ChoiceField(choices=ImageCreation.Provider.choices)


class ImageCreationResponseSerializer(serializers.ModelSerializer):
    result_url = serializers.CharField(read_only=True)
    source_image_url = serializers.CharField(read_only=True)

    class Meta:
        model = ImageCreation
        fields = (
            'id', 'prompt', 'operation', 'n', 'size', 'quality', 'style', 'provider',
            'status', 'result_url','source_image_url', 'credit_cost', 'error_message', 'created_at'
        )
        read_only_fields = fields