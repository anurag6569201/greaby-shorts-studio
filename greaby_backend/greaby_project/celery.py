# greaby_project/celery.py

from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'greaby_project.settings')

app = Celery('greaby_project')

app.config_from_object('django.conf:settings', namespace='CELERY')

# Add this line to apply SSL options if needed
from django.conf import settings
if getattr(settings, 'BROKER_USE_SSL', None):
    app.conf.broker_use_ssl = settings.BROKER_USE_SSL
if getattr(settings, 'REDIS_BACKEND_USE_SSL', None):
    app.conf.redis_backend_use_ssl = settings.REDIS_BACKEND_USE_SSL

app.autodiscover_tasks()
