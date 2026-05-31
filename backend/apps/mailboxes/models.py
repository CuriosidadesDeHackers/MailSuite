from django.db import models
from apps.domains.models import Domain
import hashlib
import os


class Mailbox(models.Model):
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE)
    local_part = models.CharField(max_length=64)
    password_hash = models.CharField(max_length=255)
    quota_mb = models.PositiveIntegerField(default=1024)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('domain', 'local_part')]
        ordering = ['domain__name', 'local_part']

    def __str__(self):
        return f"{self.local_part}@{self.domain.name}"

    @property
    def email(self):
        return f"{self.local_part}@{self.domain.name}"

    @property
    def maildir_path(self):
        from django.conf import settings
        return f"{settings.MAIL_VHOST_DIR}/{self.domain.name}/{self.local_part}/"

    def set_password(self, raw_password: str):
        """Hash password using SHA512-CRYPT compatible with Dovecot."""
        import subprocess
        result = subprocess.run(
            ['doveadm', 'pw', '-s', 'SHA512-CRYPT', '-p', raw_password],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            self.password_hash = result.stdout.strip()
        else:
            # Fallback: use passlib if doveadm not available
            from passlib.hash import sha512_crypt
            self.password_hash = '{SHA512-CRYPT}' + sha512_crypt.hash(raw_password)
