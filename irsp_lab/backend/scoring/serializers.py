from rest_framework import serializers

from .models import Action, Score


class ActionSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = Action
        fields = [
            "id",
            "session",
            "user",
            "user_email",
            "action_key",
            "action_label",
            "status",
            "payload",
            "occurred_at",
        ]
        read_only_fields = ["id", "user", "occurred_at"]


class ScoreSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = Score
        fields = [
            "id",
            "session",
            "user",
            "user_email",
            "total_score",
            "containment_score",
            "investigation_score",
            "communication_score",
            "feedback",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
