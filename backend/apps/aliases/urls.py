from rest_framework.routers import DefaultRouter
from .views import AliasViewSet

router = DefaultRouter()
router.register(r'aliases', AliasViewSet, basename='alias')

urlpatterns = router.urls
