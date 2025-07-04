
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TranscriptionViewSet, DownloadTranscriptionView

router = DefaultRouter()
router.register('', TranscriptionViewSet, basename='transcription')

urlpatterns = [
    path('<uuid:pk>/download', DownloadTranscriptionView.as_view(), name='transcription-download'),
    path('', include(router.urls)),
]