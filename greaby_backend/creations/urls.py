from django.urls import path
from .views import VideoGenerationView, CreationHistoryView, CreationDetailView, creation_content_proxy

urlpatterns = [
    path('generate/video/', VideoGenerationView.as_view(), name='generate-video'),
    path('history/', CreationHistoryView.as_view(), name='creation-history'),
    path('<uuid:id>/', CreationDetailView.as_view(), name='creation-detail'),
    path('content/<uuid:id>/', creation_content_proxy, name='creation-content'),
]