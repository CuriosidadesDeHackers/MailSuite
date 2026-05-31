try:
    from .celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError:
    pass  # Celery no disponible en entorno de desarrollo
