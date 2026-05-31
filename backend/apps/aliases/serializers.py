from rest_framework import serializers
from .models import Alias
import re


class AliasSerializer(serializers.ModelSerializer):
    email = serializers.ReadOnlyField()
    domain_name = serializers.ReadOnlyField(source='domain.name')
    destination_list = serializers.ReadOnlyField()

    class Meta:
        model = Alias
        fields = ['id', 'domain', 'domain_name', 'local_part', 'email', 'destinations', 'destination_list', 'is_active', 'created_at']

    def validate_local_part(self, value):
        if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9._%+\-]{0,62}$', value):
            raise serializers.ValidationError("Nombre de alias inválido.")
        return value.lower()

    def validate_destinations(self, value):
        emails = [e.strip() for e in value.split(',') if e.strip()]
        if not emails:
            raise serializers.ValidationError("Se requiere al menos un destino.")
        email_re = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
        for email in emails:
            if not email_re.match(email):
                raise serializers.ValidationError(f"Email de destino inválido: {email}")
        return ','.join(emails)
