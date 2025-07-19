from django.contrib import admin
from django.urls import path, include
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Version 1
    path('api/v1/auth/', include('users.urls')),
    path('api/v1/billing/', include('billing.urls')),
    
    # Renamed for RESTful consistency
    # path('api/v1/videos/', include('creations.urls')), dismental video generation
    path('api/v1/audios/', include('audio_creations.urls')),
    
    # path('api/v1/reels/', include('reels.urls')), dismental reels generation
    
    path('api/v1/transcriptions/', include('transcriptions.urls')),
    # path('api/v1/translations/', include('video_translations.urls')), dismental video dubbing generation
    
    path('api/v1/doc-translations/', include('translations.urls')),
]
