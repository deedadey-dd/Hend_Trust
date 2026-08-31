import os
import subprocess as _sp
from pathlib import Path
import environ
from datetime import timedelta
import sentry_sdk

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize environ
env = environ.Env(
    DEBUG=(bool, False)
)

# Take environment variables from .env file
# Root of the monorepo is BASE_DIR.parent
environ.Env.read_env(os.path.join(BASE_DIR.parent, '.env'))

# Sentry Error Tracking
sentry_dsn = env('SENTRY_DSN', default='')
if sentry_dsn:
    from django.core.exceptions import DisallowedHost
    sentry_sdk.init(
        dsn=sentry_dsn,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
        ignore_errors=[DisallowedHost]
    )

SECRET_KEY = env('SECRET_KEY', default='django-insecure-replace-me-with-a-secure-key-in-production')
DEBUG = env('DEBUG')
_default_hosts = 'localhost,127.0.0.1' if not env('ALLOWED_HOSTS', default='') else env('ALLOWED_HOSTS', default='localhost,127.0.0.1')
ALLOWED_HOSTS = env('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

PAYSTACK_SECRET_KEY = env('PAYSTACK_SECRET_KEY', default='')
PAYSTACK_PUBLIC_KEY = env('PAYSTACK_PUBLIC_KEY', default='')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'corsheaders',
    'ninja_jwt',
    'ninja_extra',
    
    # Local apps
    'apps.core',
    'apps.users',
    'apps.ledger',
    'apps.links',
    'apps.escrow',
    'apps.checkout',
    'apps.delivery',
    'apps.wallet',
    'apps.notifications',
    'apps.reviews',
    'apps.developer',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'hendaxis_trust.urls'

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

WSGI_APPLICATION = 'hendaxis_trust.wsgi.application'

# Database
# SQLite for development, PostgreSQL for production
if not DEBUG and env('DATABASE_URL', default=''):
    # Production: PostgreSQL
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(default=env('DATABASE_URL'))
    }
else:
    # Development: SQLite — one database per git branch
    try:
        _branch = _sp.check_output(
            ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
            cwd=BASE_DIR,
            stderr=_sp.DEVNULL,
            text=True
        ).strip() or 'main'
    except Exception:
        _branch = 'main'

    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / f'db_{_branch}.sqlite3',
            # Always use an in-memory database for the test suite
            'TEST': {
                'NAME': ':memory:',
            },
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'static'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'users.User'

# Cache Configuration
# Django's cache is used by rate limiting and OTP storage.
# In dev/test, use LocMemCache (single-process, fast).
# In production, override CACHE_URL in .env to use Redis.
_cache_url = env('CACHE_URL', default='')
if _cache_url:
    import django_redis  # noqa: F401  # ensure django-redis is installed in prod
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': _cache_url,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            }
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'hendaxis-trust-cache',
        }
    }

# Ninja JWT Settings
NINJA_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=2),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'SIGNING_KEY': env('JWT_SECRET_KEY', default=SECRET_KEY),
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_REFRESH': 'refresh_token',
    'AUTH_COOKIE_DOMAIN': None if DEBUG else '.hendaxis.com',
    'AUTH_COOKIE_SECURE': not DEBUG,
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_PATH': '/',
    'AUTH_COOKIE_SAMESITE': 'Lax',
}

# Celery Configuration
CELERY_BROKER_URL = env('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('REDIS_URL', default='redis://localhost:6379/0')
CELERY_TIMEZONE = TIME_ZONE

CELERY_BEAT_SCHEDULE = {
    'check-expired-inspections-every-5-mins': {
        'task': 'apps.escrow.tasks.check_expired_inspections',
        'schedule': 300.0, # 5 minutes in seconds
    },
    'check-delivery-reminders-every-15-mins': {
        'task': 'apps.escrow.tasks.check_delivery_reminders',
        'schedule': 900.0, # 15 minutes
    },
    'process-auto-deliveries-every-15-mins': {
        'task': 'apps.escrow.tasks.process_auto_deliveries',
        'schedule': 900.0, # 15 minutes
    },
    'check-expired-dispatches-every-15-mins': {
        'task': 'apps.escrow.tasks.check_expired_dispatches',
        'schedule': 900.0, # 15 minutes
    },
}

# CORS Configuration
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    
    # Dynamically trust all local IP addresses for CSRF in development
    import socket
    local_ips = ['localhost', '127.0.0.1']
    try:
        local_ips.extend(socket.gethostbyname_ex(socket.gethostname())[2])
    except Exception:
        pass
    
    CSRF_TRUSTED_ORIGINS = [f'http://{ip}:5173' for ip in local_ips] + [f'https://{ip}:5173' for ip in local_ips]
else:
    CORS_ALLOWED_ORIGINS = env('CORS_ALLOWED_ORIGINS', default='http://localhost:5173').split(',')
    CSRF_TRUSTED_ORIGINS = env('CSRF_TRUSTED_ORIGINS', default='https://hendaxis.com').split(',')
CORS_ALLOW_CREDENTIALS = True

# Email Configuration
if DEBUG:
    EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
else:
    EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env('EMAIL_PORT', cast=int, default=587)
EMAIL_USE_TLS = env('EMAIL_USE_TLS', cast=bool, default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@hendaxistrust.com')

# Logging Configuration
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'django.server': {
            '()': 'django.utils.log.ServerFormatter',
            'format': '[{server_time}] {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'django.server': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'django.server',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'django.log',
            'maxBytes': 1024 * 1024 * 5,  # 5 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'] if not DEBUG else ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'level': 'INFO',
            'propagate': True,
        },
        'django.server': {
            'handlers': ['django.server'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'level': 'WARNING',
        },
    },
}

# Security Settings — applied globally
# These headers are safe and important in all environments.
SECURE_CONTENT_TYPE_NOSNIFF = True  # Prevent MIME-type sniffing
X_FRAME_OPTIONS = 'DENY'            # Clickjacking protection
SECURE_BROWSER_XSS_FILTER = True    # Legacy XSS filter header
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Production-only HTTPS / HSTS settings
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # HSTS settings
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
