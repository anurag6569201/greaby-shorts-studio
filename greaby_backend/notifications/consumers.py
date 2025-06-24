import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.room_group_name = f'user_{self.user.id}'
        
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        print(f"WebSocket connected for user: {self.user.email}")

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        print(f"WebSocket disconnected for user: {getattr(self.user, 'email', 'anonymous')}")

    # This method is called from the backend (e.g., Celery tasks)
    # It receives the event from the channel layer and sends it down the WebSocket
    async def send_notification(self, event):
        message = event['message']
        await self.send(text_data=json.dumps(message))