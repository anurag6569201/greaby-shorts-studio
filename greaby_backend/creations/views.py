# backend/creations/views.py
import jwt
from rest_framework import generics, status
from rest_framework.response import Response
from .models import Creation
from .serializers import CreationRequestSerializer, CreationResponseSerializer
from .services import check_user_quota
from .tasks import generate_video_from_prompt
from subscriptions.models import Subscription, Plan
from django.http import StreamingHttpResponse, HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import requests
from django.conf import settings
from rest_framework.permissions import AllowAny
from users.models import User

class VideoGenerationView(generics.CreateAPIView):
    serializer_class = CreationRequestSerializer

    def create(self, request, *args, **kwargs):
        # 1. Check general video count quota
        can_generate, message = check_user_quota(request.user)
        if not can_generate:
            return Response({"detail": message}, status=status.HTTP_402_PAYMENT_REQUIRED)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 2. Enforce plan-specific feature limits
        try:
            # Get user's subscription or default to the free plan
            subscription = Subscription.objects.get(user=request.user, status='active')
            plan = subscription.plan
        except Subscription.DoesNotExist:
            plan = Plan.objects.get(name='free')

        settings = serializer.validated_data.get('settings', {})
        duration = int(settings.get('duration', '5s').replace('s', ''))
        resolution = settings.get('resolution', '480p')
        aspect_ratio = settings.get('aspectRatio', '1:1')

        if duration > plan.max_duration:
            return Response(
                {"detail": f"Your '{plan.display_name}' plan allows a maximum duration of {plan.max_duration}s."},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        if resolution not in plan.allowed_resolutions:
            return Response(
                {"detail": f"The resolution '{resolution}' is not available on your plan. Allowed: {', '.join(plan.allowed_resolutions)}."},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        if aspect_ratio not in plan.allowed_aspect_ratios:
            return Response(
                {"detail": f"The aspect ratio '{aspect_ratio}' is not available on your plan. Allowed: {', '.join(plan.allowed_aspect_ratios)}."},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        # 3. If all checks pass, create the object and queue the task
        creation = serializer.save(user=request.user)
        generate_video_from_prompt.delay(str(creation.id))
        
        response_serializer = CreationResponseSerializer(creation)
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
    

@api_view(['GET', 'HEAD']) # Allow HEAD requests
@permission_classes([AllowAny])
def creation_content_proxy(request, id):
    """
    A hardened, range-aware proxy to stream video content from Azure.
    This view correctly handles HEAD requests for metadata and GET requests
    with HTTP Range headers for video seeking and resumable downloads.
    """
    token = request.query_params.get('token')
    if not token:
        return HttpResponse('Authentication token missing.', status=403)

    try:
        # --- Token Validation ---
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get('creation_id') != str(id):
            raise jwt.InvalidTokenError("Token-URL mismatch.")
        if not User.objects.filter(id=payload.get('user_id')).exists():
            raise jwt.InvalidTokenError("User not found.")

        creation = Creation.objects.get(id=id)
        if not creation.result_url:
            return HttpResponse("File not found for this creation.", status=404)

        # --- Azure Request Setup ---
        azure_url = creation.result_url
        azure_headers = {'Api-Key': settings.AZURE_OPENAI_API_KEY}
        range_header = request.headers.get('Range', '')
        if range_header:
            azure_headers['Range'] = range_header

        # --- Handle Request Method ---
        if request.method == 'HEAD':
            # Browser sends a HEAD request to get content length and type
            with requests.head(azure_url, headers=azure_headers) as r:
                r.raise_for_status()
                response = HttpResponse(status=r.status_code)
                for key, value in r.headers.items():
                    if key.lower() in ['content-type', 'content-length', 'accept-ranges', 'content-range']:
                        response[key] = value
                return response

        # For GET requests
        r = requests.get(azure_url, headers=azure_headers, stream=True)
        r.raise_for_status()

        # --- Construct Response ---
        content_type = r.headers.get('Content-Type', 'video/mp4')
        status_code = r.status_code

        # For range requests, status code is 206
        response = StreamingHttpResponse(r.iter_content(chunk_size=8192), status=status_code, content_type=content_type)
        
        # Copy necessary headers from Azure's response to our response
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
        status = e.response.status_code if e.response is not None else 502
        return HttpResponse(f"Failed to fetch video from storage.", status=status)
    except Exception:
        # Log the error for debugging
        return HttpResponse("An internal server error occurred.", status=500)