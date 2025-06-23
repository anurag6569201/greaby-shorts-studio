import os
from pathlib import Path
from decouple import config
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool) # Changed default to False for production safety
ALLOWED_HOSTS = ['*'] # In production, you MUST change this to your domain, e.g., ['api.greaby.com']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'storages', # For cloud storage

    # Local apps
    'users.apps.UsersConfig',
    'billing.apps.BillingConfig', # NEW: For handling credits and payments
    'creations.apps.CreationsConfig',         
    'audio_creations.apps.AudioCreationsConfig',
    'reels.apps.ReelsConfig',
]
# REMOVED: 'subscriptions.apps.SubscriptionsConfig' is no longer needed.

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    "whitenoise.middleware.WhiteNoiseMiddleware",
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'greaby_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'greaby_project.wsgi.application'

# Database
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL'),
        conn_max_age=600,
        engine='django.db.backends.postgresql'
    )
}

# Authentication
AUTH_USER_MODEL = 'users.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated']
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# --- CORS (Cross-Origin Resource Sharing) ---
# IMPORTANT: In production, change this to your frontend's domain
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # "https://www.your-frontend-app.com", # Add your production frontend URL here
]
CORS_ALLOW_CREDENTIALS = True
# REMOVED: CORS_ALLOW_ALL_ORIGINS = True. This is a security risk.

# --- Celery Configuration ---
CELERY_BROKER_URL = config('CELERY_BROKER_URL')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_ACKS_LATE = True # For task robustness
CELERY_TASK_TRACK_STARTED = True

# --- Azure AI Settings ---
AZURE_OPENAI_ENDPOINT_URL = config('AZURE_OPENAI_ENDPOINT_URL')
AZURE_SORA_DEPLOYMENT_NAME = config('AZURE_SORA_DEPLOYMENT_NAME', default='sora')
AZURE_TTS_DEPLOYMENT_NAME = config('AZURE_TTS_DEPLOYMENT_NAME', default='gpt-4o-mini-tts')
AZURE_OPENAI_API_KEY = config('AZURE_OPENAI_API_KEY')

# --- Razorpay Settings ---
RAZORPAY_KEY_ID = config('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = config('RAZORPAY_KEY_SECRET')
RAZORPAY_WEBHOOK_SECRET = config('RAZORPAY_WEBHOOK_SECRET')

# --- Static and Media Files ---
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# --- Cloud Storage Configuration (Azure Blob Storage) ---
# This is the single most important change for a production app.
# All generated files (videos, audios, reels, subtitles) will be stored here.
DEFAULT_FILE_STORAGE = 'storages.backends.azure_storage.AzureStorage'
AZURE_ACCOUNT_NAME = config('AZURE_ACCOUNT_NAME')
AZURE_ACCOUNT_KEY = config('AZURE_ACCOUNT_KEY')
AZURE_CONTAINER = config('AZURE_CONTAINER')
AZURE_URL_EXPIRATION_SECS = 3600 # URLs to private files will expire in 1 hour
AZURE_OVERWRITE_FILES = True # Avoids issues with duplicate file names

MEDIA_URL = f'https://{AZURE_ACCOUNT_NAME}.blob.core.windows.net/{AZURE_CONTAINER}/'
MEDIA_ROOT = '' # No longer needed as files are not stored locally

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'