from django.db import models
from apps.domains.models import Domain


class Alias(models.Model):
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE)
    local_part = models.CharField(max_length=64)
    destinations = models.TextField(help_text="Comma-separated list of destination email addresses")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('domain', 'local_part')]
        ordering = ['domain__name', 'local_part']

    def __str__(self):
        return f"{self.local_part}@{self.domain.name} -> {self.destinations}"

    @property
    def email(self):
        return f"{self.local_part}@{self.domain.name}"

    @property
    def destination_list(self):
        return [d.strip() for d in self.destinations.split(',') if d.strip()]
