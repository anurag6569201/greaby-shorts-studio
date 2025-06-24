# notifications/middleware.py

# DO NOT import Django models at the top level here.
# from django.contrib.auth.models import AnonymousUser
# from users.models import User

from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
import urllib.parse

@database_sync_to_async
def get_user(token_key):
    # --- Import models INSIDE the async function ---
    from users.models import User
    from django.contrib.auth.models import AnonymousUser
    
    try:
        token = AccessToken(token_key)
        user_id = token['user_id']
        return User.objects.get(id=user_id)
    except Exception:
        return AnonymousUser()

class TokenAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # This part of the code doesn't need to change.
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = urllib.parse.parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if token:
            scope['user'] = await get_user(token)
        else:
            # Import AnonymousUser here as well for the fallback case
            from django.contrib.auth.models import AnonymousUser
            scope['user'] = AnonymousUser()
        
        return await self.inner(scope, receive, send)