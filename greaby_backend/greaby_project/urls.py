from django.contrib import admin
from django.urls import path, include
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Version 1
    path('api/v1/auth/', include('users.urls')),
    path('api/v1/billing/', include('billing.urls')),
    
    # Renamed for RESTful consistency
    path('api/v1/videos/', include('creations.urls')),
    path('api/v1/audios/', include('audio_creations.urls')),
    
    path('api/v1/reels/', include('reels.urls')),
]
