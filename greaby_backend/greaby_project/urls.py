# greaby_project/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('users.urls')),
    path('api/v1/subscriptions/', include('subscriptions.urls')),
    path('api/v1/creations/', include('creations.urls')),
    path('api/v1/audio/', include('audio_creations.urls')),
    path('api/v1/reels/', include('reels.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)