from rest_framework import serializers
from .models import Mailbox
import re


class MailboxSerializer(serializers.ModelSerializer):
    email = serializers.ReadOnlyField()
    domain_name = serializers.ReadOnlyField(source='domain.name')
    maildir_path = serializers.ReadOnlyField()

    class Meta:
        model = Mailbox
        fields = [
            'id', 'domain', 'domain_name', 'local_part', 'email',
            'quota_mb', 'is_active', 'created_at', 'last_login', 'maildir_path',
        ]
        read_only_fields = ['password_hash', 'last_login']


class MailboxCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=12)

    class Meta:
        model = Mailbox
        fields = ['domain', 'local_part', 'password', 'quota_mb']

    def validate_local_part(self, value):
        if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9._%+\-]{0,62}$', value):
            raise serializers.ValidationError("Nombre de usuario inválido.")
        return value.lower()

    def create(self, validated_data):
        password = validated_data.pop('password')
        mailbox = Mailbox(**validated_data)
        mailbox.set_password(password)
        mailbox.save()
        return mailbox


class PasswordChangeSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=12)

    def validate_password(self, value):
        if value.isdigit():
            raise serializers.ValidationError("La contraseña no puede ser solo números.")
        return value
