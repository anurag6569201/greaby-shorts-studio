import os
from pathlib import Path
from decouple import config
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = ['*']

# --- INSTALLED APPS ---
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
    'channels',
    'notifications.apps.NotificationsConfig',
]

# --- MIDDLEWARE ---
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
WSGI_APPLICATION = 'greaby_project.wsgi.application'
ASGI_APPLICATION = 'greaby_project.asgi.application'

# --- TEMPLATES ---
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

# --- DATABASES ---
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL'),
        conn_max_age=600,
        engine='django.db.backends.postgresql'
    )
}

# --- AUTHENTICATION ---
AUTH_USER_MODEL = 'users.User'
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# --- INTERNATIONALIZATION ---
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- CORS & CSRF ---
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
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = 'None'

# --- REST FRAMEWORK ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_PAGINATION_CLASS': 'greaby_project.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 10
}

# 1. Get the base URLs from your environment
broker_url = config('CELERY_BROKER_URL')
result_backend_url = config('CELERY_RESULT_BACKEND')
channel_layer_redis_url = config('CHANNEL_LAYER_REDIS_URL', default=broker_url)

# 2. Programmatically add the required SSL option if using rediss://
if broker_url.startswith('rediss'):
    broker_url = f"{broker_url}?ssl_cert_reqs=CERT_NONE"

if result_backend_url.startswith('rediss'):
    result_backend_url = f"{result_backend_url}?ssl_cert_reqs=CERT_NONE"

if channel_layer_redis_url.startswith('rediss'):
    channel_layer_redis_url = f"{channel_layer_redis_url}?ssl_cert_reqs=CERT_NONE"

# 3. Assign the processed URLs to the final settings
CELERY_BROKER_URL = broker_url
CELERY_RESULT_BACKEND = result_backend_url

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [channel_layer_redis_url],
        },
    },
}

# --- CELERY SETTINGS ---
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_ACKS_LATE = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TIMEZONE = 'Asia/Kolkata'
CELERY_ENABLE_UTC = True
CELERY_TASK_DEFAULT_RETRY_DELAY = 60
CELERY_TASK_MAX_RETRIES = 3

# --- STATIC & MEDIA FILES ---
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_FILE_STORAGE = 'storages.backends.azure_storage.AzureStorage'
AZURE_ACCOUNT_NAME = config('AZURE_ACCOUNT_NAME')
AZURE_ACCOUNT_KEY = config('AZURE_ACCOUNT_KEY')
AZURE_URL_EXPIRATION_SECS = 3600
AZURE_OVERWRITE_FILES = True
AZURE_CONNECTION_TIMEOUT_SECS = 600

# --- EXTERNAL SERVICES & API KEYS ---
AZURE_OPENAI_ENDPOINT_URL = config('AZURE_OPENAI_ENDPOINT_URL')
AZURE_SORA_DEPLOYMENT_NAME = config('AZURE_SORA_DEPLOYMENT_NAME', default='sora')
AZURE_OPENAI_API_KEY = config('AZURE_OPENAI_API_KEY')
AZURE_SPEECH_KEY = config('AZURE_SPEECH_KEY')
AZURE_SPEECH_ENDPOINT = config('AZURE_SPEECH_ENDPOINT')

RAZORPAY_KEY_ID = config('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = config('RAZORPAY_KEY_SECRET')
RAZORPAY_WEBHOOK_SECRET = config('RAZORPAY_WEBHOOK_SECRET')

FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# --- EMAIL SETTINGS ---
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='anurag6569201@gmail.com')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='ihasreqxxrrtzmrc')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='Greaby AI <noreply@greaby.cloud>')