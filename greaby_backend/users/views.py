from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import RegisterUserSerializer, UserSerializer

class RegisterUserView(generics.CreateAPIView):
    """
    Handles new user registration.
    """
    permission_classes = (AllowAny,)
    serializer_class = RegisterUserSerializer

class UserProfileView(APIView):
    """
    Handles retrieving (GET) and updating (PATCH) the logged-in user's profile.
    """
    permission_classes = (IsAuthenticated,)

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