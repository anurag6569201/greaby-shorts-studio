from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentTranslationViewSet, FailedDocumentTranslationViewSet

router = DefaultRouter()
# The base name is 'translation' for URLs like /api/v1/translations/{id}/
router.register('', DocumentTranslationViewSet, basename='translation')

urlpatterns = [
    path('failed/', FailedDocumentTranslationViewSet.as_view({'get': 'list'}), name='failed-translation-list'),
    path('', include(router.urls)),
]