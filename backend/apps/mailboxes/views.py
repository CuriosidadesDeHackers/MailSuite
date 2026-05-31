import os
import shutil
from pathlib import Path
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.conf import settings
from .models import Mailbox
from .serializers import MailboxSerializer, MailboxCreateSerializer, PasswordChangeSerializer


class MailboxViewSet(viewsets.ModelViewSet):
    queryset = Mailbox.objects.select_related('domain').all()
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.action == 'create':
            return MailboxCreateSerializer
        return MailboxSerializer

    def perform_create(self, serializer):
        mailbox = serializer.save()
        self._create_maildir(mailbox)

    def perform_destroy(self, instance):
        self._backup_and_remove_maildir(instance)
        instance.delete()

    def _create_maildir(self, mailbox: Mailbox):
        path = Path(mailbox.maildir_path)
        for subdir in ['', 'cur', 'new', 'tmp']:
            (path / subdir).mkdir(parents=True, exist_ok=True)
        # Set ownership to vmail user (UID 5000 typically)
        try:
            os.system(f"chown -R vmail:vmail {path}")
        except Exception:
            pass

    def _backup_and_remove_maildir(self, mailbox: Mailbox):
        path = Path(mailbox.maildir_path)
        if path.exists():
            backup_path = path.parent / f".deleted_{mailbox.local_part}_{mailbox.id}"
            shutil.move(str(path), str(backup_path))

    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        mailbox = self.get_object()
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mailbox.set_password(serializer.validated_data['password'])
        mailbox.save(update_fields=['password_hash'])
        return Response({'status': 'Contraseña actualizada'})

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        mailbox = self.get_object()
        mailbox.is_active = not mailbox.is_active
        mailbox.save(update_fields=['is_active'])
        return Response({'is_active': mailbox.is_active})

    @action(detail=True, methods=['get'])
    def usage(self, request, pk=None):
        mailbox = self.get_object()
        path = Path(mailbox.maildir_path)
        usage_mb = 0
        if path.exists():
            total = sum(f.stat().st_size for f in path.rglob('*') if f.is_file())
            usage_mb = round(total / (1024 * 1024), 2)
        return Response({
            'email': mailbox.email,
            'quota_mb': mailbox.quota_mb,
            'used_mb': usage_mb,
            'percent': round((usage_mb / mailbox.quota_mb) * 100, 1) if mailbox.quota_mb else 0,
        })
