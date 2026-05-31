from django.urls import path
from .views import ServiceStatusView, ServiceControlView, MailLogView, DashboardStatsView

urlpatterns = [
    path('services/', ServiceStatusView.as_view(), name='service-status'),
    path('services/<str:service>/<str:action>/', ServiceControlView.as_view(), name='service-control'),
    path('logs/', MailLogView.as_view(), name='mail-logs'),
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
]
