from rest_framework.routers import DefaultRouter
from .views import MailboxViewSet

router = DefaultRouter()
router.register(r'mailboxes', MailboxViewSet, basename='mailbox')

urlpatterns = router.urls
