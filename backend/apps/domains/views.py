from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.conf import settings
from .models import Domain
from .serializers import DomainSerializer, DomainCreateSerializer
from .dkim_utils import generate_dkim_keypair
from .dns_checker import check_mx, check_spf, check_dkim, check_dmarc, get_server_ip, build_dns_checklist


class DomainViewSet(viewsets.ModelViewSet):
    queryset = Domain.objects.all()
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.action == 'create':
            return DomainCreateSerializer
        return DomainSerializer

    def perform_create(self, serializer):
        domain = serializer.save(created_by=self.request.user)
        # Auto-generate DKIM keypair on creation
        try:
            keys = generate_dkim_keypair(domain.name, domain.dkim_selector)
            domain.dkim_private_key = keys['private_key']
            domain.dkim_public_key = keys['public_key']
            domain.save(update_fields=['dkim_private_key', 'dkim_public_key'])
        except Exception as e:
            # DKIM generation may fail outside Linux; log and continue
            pass

    @action(detail=True, methods=['post'])
    def verify_dns(self, request, pk=None):
        domain = self.get_object()
        server_ip = get_server_ip()

        domain.mx_verified = check_mx(domain.name, f'mail.{domain.name}')
        domain.spf_verified = check_spf(domain.name)
        domain.dkim_verified = check_dkim(domain.name, domain.dkim_selector)
        domain.dmarc_verified = check_dmarc(domain.name)
        domain.save(update_fields=['mx_verified', 'spf_verified', 'dkim_verified', 'dmarc_verified'])

        return Response({
            'mx': domain.mx_verified,
            'spf': domain.spf_verified,
            'dkim': domain.dkim_verified,
            'dmarc': domain.dmarc_verified,
        })

    @action(detail=True, methods=['get'])
    def dns_checklist(self, request, pk=None):
        domain = self.get_object()
        server_ip = get_server_ip() or request.META.get('SERVER_NAME', 'YOUR_VPS_IP')
        checklist = build_dns_checklist(domain.name, server_ip, domain.dkim_selector, domain.dkim_public_key)
        return Response(checklist)

    @action(detail=True, methods=['post'])
    def regenerate_dkim(self, request, pk=None):
        domain = self.get_object()
        try:
            keys = generate_dkim_keypair(domain.name, domain.dkim_selector)
            domain.dkim_private_key = keys['private_key']
            domain.dkim_public_key = keys['public_key']
            domain.dkim_verified = False
            domain.save(update_fields=['dkim_private_key', 'dkim_public_key', 'dkim_verified'])
            return Response({'public_key': domain.dkim_public_key})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
