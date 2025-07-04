# video_translations/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VideoTranslationViewSet

router = DefaultRouter()
router.register('', VideoTranslationViewSet, basename='translation')

urlpatterns = [
    path('', include(router.urls)),
]