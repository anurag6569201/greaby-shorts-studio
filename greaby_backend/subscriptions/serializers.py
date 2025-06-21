from rest_framework import serializers
from .models import Plan

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = (
            'id', 'display_name', 'price', 'video_limit', 
            'can_remove_watermark', 'all_resolutions', 'can_upload_audio'
        )