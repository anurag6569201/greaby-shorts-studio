from rest_framework import generics, status, views
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
import random
import json

from .serializers import RegisterUserSerializer, UserSerializer
from .models import User
from greaby_project.email_utils import send_template_email
from django.core.cache import cache
from django.contrib.auth.hashers import make_password

class RegisterUserView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = RegisterUserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        email = validated_data['email']
        
        # Check if a verified user with this email already exists
        if User.objects.filter(email=email).exists():
            return Response({"detail": "A user with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate OTP and hash password
        otp = str(random.randint(100000, 999999))
        hashed_password = make_password(validated_data['password'])
        
        # --- Store user data temporarily in cache (Redis) for 10 minutes ---
        cache_key = f"otp_verify_{email}"
        user_data = {
            "first_name": validated_data['first_name'],
            "last_name": validated_data['last_name'],
            "email": email,
            "password": hashed_password,
            "otp": otp
        }
        cache.set(cache_key, json.dumps(user_data), timeout=600) # 600 seconds = 10 minutes

        # Send OTP Email
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

        # --- Retrieve data from cache ---
        cache_key = f"otp_verify_{email}"
        cached_data_str = cache.get(cache_key)

        if not cached_data_str:
            return Response({"detail": "Invalid or expired OTP. Please sign up again."}, status=status.HTTP_400_BAD_REQUEST)

        cached_data = json.loads(cached_data_str)
        
        if cached_data.get('otp') != otp:
            return Response({"detail": "Incorrect OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # --- OTP is correct, now create the user in the database ---
        try:
            user = User.objects.create(
                first_name=cached_data['first_name'],
                last_name=cached_data['last_name'],
                email=cached_data['email'],
                password=cached_data['password'], # The password is already hashed
                is_active=True # User is active immediately
            )
            
            # Grant credits
            NEW_USER_CREDIT_GRANT = 10.00
            user.credit_balance = NEW_USER_CREDIT_GRANT
            user.save(update_fields=['credit_balance'])
            print(f"Granted {NEW_USER_CREDIT_GRANT} credits to new user: {user.email}")
            
            # --- Clean up the cache ---
            cache.delete(cache_key)

            return Response({"detail": "Account successfully created. You can now log in."}, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            # Handle potential race condition where user is created in another request
            print(f"Error during user creation after OTP verify: {e}")
            return Response({"detail": "An error occurred during account creation. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        


class UserProfileView(APIView):
    """
    Handles retrieving (GET) and updating (PATCH) the logged-in user's profile.
    """
    permission_classes = (IsAuthenticated)

    def get(self, request):
        """Returns the current user's profile data, including their credit balance."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Allows the user to update their first_name and last_name."""
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)