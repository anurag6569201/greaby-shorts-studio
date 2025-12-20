import os
from pathlib import Path
from decouple import config
import dj_database_url
import ssl

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'storages',
    'users.apps.UsersConfig',
    'billing.apps.BillingConfig',
    'creations.apps.CreationsConfig',
    'audio_creations.apps.AudioCreationsConfig',
    'reels.apps.ReelsConfig',
    'transcriptions.apps.TranscriptionsConfig',
    'video_translations.apps.VideoTranslationsConfig',
    'translations.apps.TranslationsConfig',
    'image_creations.apps.ImageCreationsConfig',
    
    'channels',
    'notifications.apps.NotificationsConfig',
]

ASGI_APPLICATION = 'greaby_project.asgi.application'

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
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
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

DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL'),
        conn_max_age=600,
        engine='django.db.backends.postgresql'
    )
}

AUTH_USER_MODEL = 'users.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_PAGINATION_CLASS': 'greaby_project.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 10
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://greaby.cloud",
    "https://greaby.vercel.app",
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://greaby.cloud",
    "https://greaby.vercel.app",
    'https://greaby.azurewebsites.net',
]

CSRF_COOKIE_SECURE = True  # Only for HTTPS
CSRF_COOKIE_SAMESITE = 'None'  # Needed for cross-site frontend/backend

CELERY_BROKER_URL = config('CELERY_BROKER_URL')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_ACKS_LATE = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TIMEZONE = 'Asia/Kolkata'  # or UTC based on your app
CELERY_ENABLE_UTC = True
CELERY_TASK_DEFAULT_RETRY_DELAY = 60  # seconds
CELERY_TASK_MAX_RETRIES = 3
# Celery Redis SSL Options (only needed if using rediss://)
if CELERY_BROKER_URL and CELERY_BROKER_URL.startswith("rediss://"):
    BROKER_USE_SSL = {
        'ssl_cert_reqs': ssl.CERT_NONE  # or CERT_REQUIRED in production with certs
    }

if CELERY_RESULT_BACKEND and CELERY_RESULT_BACKEND.startswith("rediss://"):
    REDIS_BACKEND_USE_SSL = {
        'ssl_cert_reqs': ssl.CERT_NONE
    }
else:
    BROKER_USE_SSL = None
    REDIS_BACKEND_USE_SSL = None
    
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [CELERY_BROKER_URL], 
        },
    },
}


AZURE_OPENAI_ENDPOINT_URL = config('AZURE_OPENAI_ENDPOINT_URL')
AZURE_SORA_DEPLOYMENT_NAME = config('AZURE_SORA_DEPLOYMENT_NAME', default='sora')
AZURE_OPENAI_API_KEY = config('AZURE_OPENAI_API_KEY')
AZURE_SPEECH_KEY = config('AZURE_SPEECH_KEY')
AZURE_SPEECH_ENDPOINT = config('AZURE_SPEECH_ENDPOINT')

AZURE_VIDEO_TRANSLATION_ENDPOINT = config('AZURE_SPEECH_ENDPOINT')
AZURE_VIDEO_TRANSLATION_KEY = config('AZURE_SPEECH_KEY')

AZURE_TRANSLATOR_ENDPOINT = config("AZURE_TRANSLATOR_ENDPOINT")
AZURE_TRANSLATOR_KEY = config("AZURE_TRANSLATOR_KEY")
AZURE_TRANSLATOR_API_VERSION = "2023-11-01-preview" 

AZURE_INPUT_DOCUMENT_CONTAINER = "greaby-documents-input"
AZURE_TRANSLATED_DOCUMENT_CONTAINER = "greaby-documents-output"

# --- LINE TO LOAD THE NEW VARIABLE ---
AZURE_OPENAI_COMPLETIONS_DEPLOYMENT_NAME = config('AZURE_OPENAI_COMPLETIONS_DEPLOYMENT_NAME')

RAZORPAY_KEY_ID = config('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = config('RAZORPAY_KEY_SECRET')
RAZORPAY_WEBHOOK_SECRET = config('RAZORPAY_WEBHOOK_SECRET')

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_FILE_STORAGE = 'storages.backends.azure_storage.AzureStorage'
AZURE_ACCOUNT_NAME = config('AZURE_ACCOUNT_NAME')
AZURE_ACCOUNT_KEY = config('AZURE_ACCOUNT_KEY')
AZURE_URL_EXPIRATION_SECS = 3600
AZURE_OVERWRITE_FILES = True
AZURE_CONNECTION_TIMEOUT_SECS = 600

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

FRONTEND_URL = config('FRONTEND_URL', default='https://greaby.cloud')

EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='Greaby AI <noreply@greaby.cloud>')


GOOGLE_API_KEY = config('GOOGLE_API_KEY')

# AZURE DOCUMENT TRANSLATION & STORAGE SETTINGS
AZURE_DOC_TRANSLATION_ENDPOINT = config("AZURE_OPENAI_ENDPOINT_URL")
AZURE_DOC_TRANSLATION_KEY = config("AZURE_OPENAI_API_KEY")
AZURE_STORAGE_CONNECTION_STRING = config("YOUR_AZURE_STORAGE_CONNECTION_STRING")
AZURE_STORAGE_INPUT_CONTAINER = "testing-source-docs"
AZURE_STORAGE_OUTPUT_CONTAINER = "testing-target-docs"