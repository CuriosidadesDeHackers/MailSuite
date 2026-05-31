from rest_framework import serializers
from .models import Domain


class DomainSerializer(serializers.ModelSerializer):
    mailbox_count = serializers.SerializerMethodField()
    alias_count = serializers.SerializerMethodField()

    class Meta:
        model = Domain
        fields = [
            'id', 'name', 'is_active', 'dkim_selector',
            'dkim_public_key', 'mx_verified', 'spf_verified',
            'dkim_verified', 'dmarc_verified', 'created_at',
            'mailbox_count', 'alias_count',
        ]
        read_only_fields = ['dkim_public_key', 'mx_verified', 'spf_verified', 'dkim_verified', 'dmarc_verified']

    def get_mailbox_count(self, obj):
        return obj.mailbox_set.count()

    def get_alias_count(self, obj):
        return obj.alias_set.count()


class DomainCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Domain
        fields = ['name', 'dkim_selector']

    def validate_name(self, value):
        import re
        pattern = r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError("Nombre de dominio inválido.")
        return value.lower()
