# greaby_project/asgi.py

import os
from django.core.asgi import get_asgi_application

# --- Call get_asgi_application() FIRST ---
# This initializes Django's settings and app registry.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'greaby_project.settings')
django_asgi_app = get_asgi_application()

# --- NOW, import Channels and your routing ---
from channels.routing import ProtocolTypeRouter, URLRouter
from notifications.middleware import TokenAuthMiddleware
import notifications.routing

application = ProtocolTypeRouter({
    # Use the application object we created earlier
    "http": django_asgi_app,
    
    "websocket": TokenAuthMiddleware(
        URLRouter(
            notifications.routing.websocket_urlpatterns
        )
    ),
})