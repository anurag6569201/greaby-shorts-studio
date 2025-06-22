# backend/creations/serializers.py

import jwt
import time
from datetime import timedelta
from django.conf import settings
from rest_framework import serializers
from django.urls import reverse
from .models import Creation

class CreationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Creation
        fields = ('prompt', 'settings')

class CreationResponseSerializer(serializers.ModelSerializer):
    content_url = serializers.SerializerMethodField()

    class Meta:
        model = Creation
        fields = (
            'id', 'status', 'prompt', 'settings',
            'content_url',
            'error_message', 'created_at'
        )
        read_only_fields = fields

    def get_content_url(self, obj):
        """
        If the creation is complete, generate a short-lived, signed URL
        to our secure proxy endpoint.
        """
        if obj.status == 'completed' and obj.result_url:
            # The token proves the user had access when this API call was made.
            # It's valid for 1 hour.
            expiration = int(time.time()) + 3600  # 1 hour from now
            payload = {
                'creation_id': str(obj.id),
                'user_id': str(self.context['request'].user.id),
                'exp': expiration
            }
            # Sign the token with our Django SECRET_KEY
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
            
            # Get the base URL path
            base_url = reverse('creation-content', kwargs={'id': obj.id})
            
            # Construct the full, absolute URL with the token
            signed_url = f"{base_url}?token={token}"
            
            return self.context['request'].build_absolute_uri(signed_url)
        return None