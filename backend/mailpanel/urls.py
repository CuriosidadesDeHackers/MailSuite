from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('api/', include('apps.accounts.urls')),
    path('api/', include('apps.domains.urls')),
    path('api/', include('apps.mailboxes.urls')),
    path('api/', include('apps.aliases.urls')),
    path('api/', include('apps.services.urls')),
]
