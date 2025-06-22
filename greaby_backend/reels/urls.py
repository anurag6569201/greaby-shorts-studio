# reels/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReelViewSet

router = DefaultRouter()
router.register('', ReelViewSet, basename='reel')

urlpatterns = [
    path('', include(router.urls)),
]