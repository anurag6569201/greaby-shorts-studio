from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AudioCreationViewSet

router = DefaultRouter()
router.register('', AudioCreationViewSet, basename='audio')

urlpatterns = [
    path('', include(router.urls)),
]