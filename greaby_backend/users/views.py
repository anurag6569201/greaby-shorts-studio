from rest_framework import generics, status, views
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
import random
import json
import logging
from google.auth.transport import requests
from google.oauth2 import id_token
from decouple import config

from .serializers import RegisterUserSerializer, UserSerializer
from .models import User
from greaby_project.email_utils import send_template_email
from django.core.cache import cache
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

class RegisterUserView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = RegisterUserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        email = validated_data['email']
        
        if User.objects.filter(email=email).exists():
            return Response({"detail": "A user with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        
        otp = str(random.randint(100000, 999999))
        hashed_password = make_password(validated_data['password'])
        
        cache_key = f"otp_verify_{email}"
        user_data = {
            "first_name": validated_data['first_name'],
            "last_name": validated_data['last_name'],
            "email": email,
            "password": hashed_password,
            "otp": otp
        }
        cache.set(cache_key, json.dumps(user_data), timeout=600)

        context = {'first_name': user_data['first_name'], 'otp_code': otp}
        send_template_email(
            subject="Your Greaby Verification Code",
            template_name="emails/verify_otp.html",
            context=context,
            recipient_list=[email]
        )

        return Response(
            {"detail": "Verification code sent. Please check your email.", "email": email},
            status=status.HTTP_200_OK
        )

class VerifyOTPView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        otp = request.data.get('otp')

        if not email or not otp:
            return Response({"detail": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f"otp_verify_{email}"
        cached_data_str = cache.get(cache_key)

        if not cached_data_str:
            return Response({"detail": "Invalid or expired OTP. Please sign up again."}, status=status.HTTP_400_BAD_REQUEST)

        cached_data = json.loads(cached_data_str)
        
        if cached_data.get('otp') != otp:
            return Response({"detail": "Incorrect OTP."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            User.objects.create(
                first_name=cached_data['first_name'],
                last_name=cached_data['last_name'],
                email=cached_data['email'],
                password=cached_data['password'],
                is_active=True
            )
            
            cache.delete(cache_key)

            return Response({"detail": "Account successfully created. You can now log in."}, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"Error during user creation after OTP verify: {e}", exc_info=True)
            return Response({"detail": "An error occurred during account creation. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        


class GoogleOAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        id_token_str = request.data.get('id_token')
        
        if not id_token_str:
            return Response(
                {"detail": "Google ID token is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Verify the Google ID token
            # For production, you should set GOOGLE_CLIENT_ID in your environment
            GOOGLE_CLIENT_ID = config('GOOGLE_CLIENT_ID', default=None)
            
            if not GOOGLE_CLIENT_ID:
                logger.error("GOOGLE_CLIENT_ID not configured")
                return Response(
                    {"detail": "Google OAuth not configured on server."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Verify the token
            idinfo = id_token.verify_oauth2_token(
                id_token_str,
                requests.Request(),
                GOOGLE_CLIENT_ID
            )

            # Extract user information
            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')
            google_id = idinfo.get('sub')

            if not email:
                return Response(
                    {"detail": "Email not provided by Google."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if user exists
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'is_active': True,
                }
            )

            # If user already exists, update name if needed
            if not created:
                if not user.first_name and first_name:
                    user.first_name = first_name
                if not user.last_name and last_name:
                    user.last_name = last_name
                user.save()

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            return Response({
                'access': access_token,
                'refresh': refresh_token,
                'user': UserSerializer(user).data,
                'is_new_user': created
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            logger.error(f"Invalid Google token: {e}")
            return Response(
                {"detail": "Invalid Google token."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Google OAuth error: {e}", exc_info=True)
            return Response(
                {"detail": "An error occurred during Google authentication."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserProfileView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)