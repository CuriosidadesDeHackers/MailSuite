from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from .models import Alias
from .serializers import AliasSerializer


class AliasViewSet(viewsets.ModelViewSet):
    queryset = Alias.objects.select_related('domain').all()
    serializer_class = AliasSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        domain_id = self.request.query_params.get('domain')
        if domain_id:
            qs = qs.filter(domain_id=domain_id)
        return qs

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        alias = self.get_object()
        alias.is_active = not alias.is_active
        alias.save(update_fields=['is_active'])
        return Response({'is_active': alias.is_active})
