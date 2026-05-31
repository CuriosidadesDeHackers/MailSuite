import subprocess
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser


MANAGED_SERVICES = ['postfix', 'dovecot', 'rspamd', 'nginx', 'opendkim', 'fail2ban']


def get_service_status(service: str) -> dict:
    try:
        result = subprocess.run(
            ['systemctl', 'is-active', service],
            capture_output=True, text=True, timeout=5
        )
        active = result.stdout.strip() == 'active'
        return {'name': service, 'active': active, 'status': result.stdout.strip()}
    except Exception as e:
        return {'name': service, 'active': False, 'status': 'error', 'error': str(e)}


class ServiceStatusView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        statuses = [get_service_status(s) for s in MANAGED_SERVICES]
        return Response(statuses)


class ServiceControlView(APIView):
    permission_classes = [IsAdminUser]

    ALLOWED_ACTIONS = ['start', 'stop', 'restart', 'reload']

    def post(self, request, service, action):
        if service not in MANAGED_SERVICES:
            return Response({'error': 'Servicio no permitido'}, status=400)
        if action not in self.ALLOWED_ACTIONS:
            return Response({'error': 'Acción no permitida'}, status=400)
        try:
            result = subprocess.run(
                ['systemctl', action, service],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode == 0:
                return Response({'status': 'ok', 'service': service, 'action': action})
            return Response({'error': result.stderr}, status=500)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class MailLogView(APIView):
    permission_classes = [IsAdminUser]

    LOG_SOURCES = {
        'postfix': '/var/log/mail.log',
        'rspamd': '/var/log/rspamd/rspamd.log',
        'dovecot': '/var/log/dovecot.log',
    }

    def get(self, request):
        source = request.query_params.get('source', 'postfix')
        lines = int(request.query_params.get('lines', 100))
        lines = min(lines, 500)  # Cap at 500 lines

        log_path = self.LOG_SOURCES.get(source)
        if not log_path:
            return Response({'error': 'Fuente de log no válida'}, status=400)

        try:
            result = subprocess.run(
                ['tail', f'-{lines}', log_path],
                capture_output=True, text=True, timeout=5
            )
            return Response({
                'source': source,
                'lines': result.stdout.splitlines(),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class DashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.domains.models import Domain
        from apps.mailboxes.models import Mailbox
        from apps.aliases.models import Alias

        services = [get_service_status(s) for s in MANAGED_SERVICES]
        all_up = all(s['active'] for s in services)

        return Response({
            'domains': Domain.objects.filter(is_active=True).count(),
            'mailboxes': Mailbox.objects.filter(is_active=True).count(),
            'aliases': Alias.objects.filter(is_active=True).count(),
            'services_ok': all_up,
            'services': services,
        })
