from rest_framework import serializers

from .models import Scenario, ScenarioLog, Session


class ScenarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scenario
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "difficulty",
            "estimated_duration_minutes",
            "platform",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SessionSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)
    scenario_title = serializers.CharField(source="scenario.title", read_only=True)
    scenario_slug = serializers.CharField(source="scenario.slug", read_only=True)

    class Meta:
        model = Session
        fields = [
            "id",
            "user",
            "user_email",
            "scenario",
            "scenario_title",
            "scenario_slug",
            "status",
            "started_at",
            "completed_at",
            "elapsed_seconds",
            "progress_percent",
            "summary_headline",
            "mitre_coverage_percent",
            "scenario_state",
        ]
        read_only_fields = ["id", "user", "started_at"]


class ScenarioLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScenarioLog
        fields = [
            "id",
            "scenario",
            "node_id",
            "parent_node_id",
            "name",
            "node_type",
            "file_type",
            "folder_path",
            "content",
            "clue_headline",
            "expected_category",
            "mitre_technique_id",
            "sort_order",
            "log_type",
            "log_category",
            "severity",
            "source_ip",
        ]
        read_only_fields = ["id"]
