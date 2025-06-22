# creations/views.py

import jwt
import requests
from django.conf import settings
from django.http import StreamingHttpResponse, HttpResponse
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Creation
from .serializers import CreationRequestSerializer, CreationResponseSerializer
from .services import check_user_quota
from .tasks import generate_video_from_prompt
from users.models import User

class VideoGenerationView(generics.CreateAPIView):
    serializer_class = CreationRequestSerializer

    def create(self, request, *args, **kwargs):
        # 1. Check overall creation quota
        can_generate, message = check_user_quota(request.user)
        if not can_generate:
            return Response({"detail": message}, status=status.HTTP_402_PAYMENT_REQUIRED)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 2. Enforce plan-specific feature limits
        plan = request.user.subscription.plan
        settings_data = serializer.validated_data.get('settings', {})
        duration = int(settings_data.get('duration', '5s').replace('s', ''))
        resolution = settings_data.get('resolution', '480p')
        aspect_ratio = settings_data.get('aspectRatio', '1:1')

        if duration > plan.max_video_duration:
            return Response({"detail": f"Your plan allows a max duration of {plan.max_video_duration}s."}, status=status.HTTP_402_PAYMENT_REQUIRED)
        if resolution not in plan.video_resolutions:
            return Response({"detail": f"Resolution '{resolution}' is not available on your plan."}, status=status.HTTP_402_PAYMENT_REQUIRED)
        if aspect_ratio not in plan.video_aspect_ratios:
            return Response({"detail": f"Aspect ratio '{aspect_ratio}' is not available on your plan."}, status=status.HTTP_402_PAYMENT_REQUIRED)

        # 3. Create object and queue task
        creation = serializer.save(user=request.user)
        generate_video_from_prompt.delay(str(creation.id))
        
        response_serializer = CreationResponseSerializer(creation, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)

class CreationHistoryView(generics.ListAPIView):
    serializer_class = CreationResponseSerializer

    def get_queryset(self):
        return Creation.objects.filter(user=self.request.user).order_by('-created_at')

class CreationDetailView(generics.RetrieveAPIView):
    serializer_class = CreationResponseSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return Creation.objects.filter(user=self.request.user)

@api_view(['GET', 'HEAD'])
@permission_classes([AllowAny])
def creation_content_proxy(request, id):
    """
    A hardened, range-aware proxy to stream video content from Azure.
    This validates a short-lived token and proxies requests to the actual
    video URL, keeping it secure.
    """
    token = request.query_params.get('token')
    if not token:
        return HttpResponse('Authentication token missing.', status=403)

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get('creation_id') != str(id):
            raise jwt.InvalidTokenError("Token-URL mismatch.")
        if not User.objects.filter(id=payload.get('user_id')).exists():
            raise jwt.InvalidTokenError("User not found.")

        creation = Creation.objects.get(id=id)
        if not creation.result_url:
            return HttpResponse("File not found.", status=404)

        azure_url = creation.result_url
        azure_headers = {'Api-Key': settings.AZURE_OPENAI_API_KEY}
        if range_header := request.headers.get('Range', ''):
            azure_headers['Range'] = range_header

        if request.method == 'HEAD':
            with requests.head(azure_url, headers=azure_headers, timeout=10) as r:
                r.raise_for_status()
                response = HttpResponse(status=r.status_code)
                for key, value in r.headers.items():
                    if key.lower() in ['content-type', 'content-length', 'accept-ranges', 'content-range']:
                        response[key] = value
                return response

        r = requests.get(azure_url, headers=azure_headers, stream=True, timeout=30)
        r.raise_for_status()

        response = StreamingHttpResponse(r.iter_content(chunk_size=8192), status=r.status_code, content_type=r.headers.get('Content-Type'))
        
        for key, value in r.headers.items():
            if key.lower() in ['content-length', 'accept-ranges', 'content-range', 'etag']:
                 response[key] = value

        if 'download' in request.GET:
            response['Content-Disposition'] = f'attachment; filename="{creation.id}.mp4"'
            
        return response

    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return HttpResponse('Authentication link is invalid or has expired.', status=403)
    except Creation.DoesNotExist:
        return HttpResponse("Creation not found.", status=404)
    except requests.exceptions.RequestException as e:
        return HttpResponse(f"Failed to fetch video from storage.", status=502)
    except Exception:
        return HttpResponse("An internal server error occurred.", status=500)