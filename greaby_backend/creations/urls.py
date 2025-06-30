from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VideoCreationViewSet,FailedVideoCreationViewSet

router = DefaultRouter()
# The base name is 'video' for URLs like /api/v1/videos/{id}/
router.register('', VideoCreationViewSet, basename='video')

urlpatterns = [
    path('failed/', FailedVideoCreationViewSet.as_view({'get': 'list'}), name='failed-video-list'),
    path('', include(router.urls)),
]