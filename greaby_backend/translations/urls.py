from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentTranslationViewSet, FailedDocumentTranslationViewSet

router = DefaultRouter()
router.register('', DocumentTranslationViewSet, basename='translation')

urlpatterns = [
    path('failed/', FailedDocumentTranslationViewSet.as_view({'get': 'list'}), name='failed-translation-list'),
    path('', include(router.urls)),
]