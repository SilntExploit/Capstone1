from rest_framework import serializers

from .models import LabCompletion


class LabCompletionSerializer(serializers.ModelSerializer):
    # Convenience read-only field: time taken formatted as "Xm Ys".
    time_taken_display = serializers.SerializerMethodField()
    progress_display = serializers.ReadOnlyField()
    progress_percent = serializers.ReadOnlyField()

    class Meta:
        model = LabCompletion
        fields = [
            "id",
            "username",
            "lab_name",
            "time_taken",
            "time_taken_display",
            "total_score",
            "stages_completed",
            "total_stages",
            "progress_display",
            "progress_percent",
            "standing",
            "mitre_coverage",
            "completed_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "time_taken_display",
            "progress_display",
            "progress_percent",
        ]

    def get_time_taken_display(self, obj):
        seconds = int(obj.time_taken or 0)
        minutes, secs = divmod(seconds, 60)
        if minutes:
            return f"{minutes}m {secs}s"
        return f"{secs}s"
