from rest_framework import serializers

from .models import LabBAlert, LabBLogEvent


class LabBAlertSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = LabBAlert
        fields = [
            "id", "alert_key", "scenario_id", "timestamp", "severity",
            "risk_score", "host", "title", "status", "technique_id",
        ]

    def get_id(self, obj):
        return f"alt-{obj.pk}"


class LabBLogEventSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = LabBLogEvent
        fields = [
            "id", "scenario_id", "timestamp", "host", "sourcetype", "severity",
            "event_id", "user", "process_name", "parent_process", "dest_ip",
            "dest_port", "query_name", "task_name", "technique_id", "event",
        ]

    def get_id(self, obj):
        return f"evt-b-{obj.pk:03d}"
