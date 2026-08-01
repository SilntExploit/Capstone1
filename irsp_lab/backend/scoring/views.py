from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from .models import Action, Score
from .serializers import ActionSerializer, ScoreSerializer


class ActionViewSet(viewsets.ModelViewSet):
    serializer_class = ActionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == "manager":
            return Action.objects.select_related("user", "session").all()
        return Action.objects.select_related("user", "session").filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ScoreViewSet(viewsets.ModelViewSet):
    serializer_class = ScoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == "manager":
            return Score.objects.select_related("user", "session").all()
        return Score.objects.select_related("user", "session").filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = serializer.validated_data["session"]
        values = {
            "total_score": serializer.validated_data["total_score"],
            "containment_score": serializer.validated_data.get("containment_score", 0),
            "investigation_score": serializer.validated_data.get("investigation_score", 0),
            "communication_score": serializer.validated_data.get("communication_score", 0),
            "feedback": serializer.validated_data.get("feedback", ""),
        }
        score, created = Score.objects.update_or_create(
            session=session,
            defaults={"user": request.user, **values},
        )
        output = self.get_serializer(score)
        return Response(output.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
