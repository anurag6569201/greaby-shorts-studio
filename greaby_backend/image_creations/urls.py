from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ImageCreationViewSet,FailedImageCreationViewSet

router = DefaultRouter()
router.register('', ImageCreationViewSet, basename='image')

urlpatterns = [
    path('failed/', FailedImageCreationViewSet.as_view({'get': 'list'}), name='failed-image-list'),
    path('', include(router.urls)),
]