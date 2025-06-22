# audio_creations/urls.py

from django.urls import path
from .views import AudioGenerationView, AudioHistoryView, AudioDetailView

urlpatterns = [
    # List all audios and create a new one
    path('', AudioHistoryView.as_view(), name='audio-list'),
    path('generate/', AudioGenerationView.as_view(), name='generate-audio'),
    
    # Retrieve, Update, or Delete a specific audio by its ID
    path('<uuid:id>/', AudioDetailView.as_view(), name='audio-detail'),
]