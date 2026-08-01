from rest_framework import serializers

from .models import MitreMapping


class MitreMappingSerializer(serializers.ModelSerializer):
    scenario_title = serializers.CharField(source="scenario.title", read_only=True)

    class Meta:
        model = MitreMapping
        fields = [
            "id",
            "scenario",
            "scenario_title",
            "technique_id",
            "technique_name",
            "tactic",
            "coverage_status",
            "summary",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
