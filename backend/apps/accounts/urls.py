from django.urls import path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from rest_framework import serializers, status


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active', 'date_joined', 'last_login']


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        s = AdminUserSerializer(request.user)
        return Response(s.data)


class AdminUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response(status=status.HTTP_403_FORBIDDEN)
        users = User.objects.filter(is_staff=True)
        return Response(AdminUserSerializer(users, many=True).data)

    def post(self, request):
        if not request.user.is_superuser:
            return Response(status=status.HTTP_403_FORBIDDEN)
        username = request.data.get('username')
        email = request.data.get('email', '')
        password = request.data.get('password', '')
        if not username or not password:
            return Response({'error': 'username y password son requeridos'}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'El usuario ya existe'}, status=400)
        user = User.objects.create_user(username=username, email=email, password=password, is_staff=True)
        return Response(AdminUserSerializer(user).data, status=201)


urlpatterns = [
    path('me/', MeView.as_view(), name='me'),
    path('admin-users/', AdminUsersView.as_view(), name='admin-users'),
]
