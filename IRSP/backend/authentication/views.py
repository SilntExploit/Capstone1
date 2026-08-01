from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import IRSPTokenSerializer, RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(TokenObtainPairView):
    serializer_class = IRSPTokenSerializer


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self, request):
        if request.user.role == "manager":
            return User.objects.filter(organization=request.user.organization)
        return User.objects.filter(organization=request.user.organization, role="trainee")

    def get(self, request):
        users = self.get_queryset(request)
        return Response(UserSerializer(users, many=True).data)
