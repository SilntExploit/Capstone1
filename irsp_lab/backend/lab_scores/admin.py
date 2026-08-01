from django.contrib import admin

from .models import LabCompletion


@admin.register(LabCompletion)
class LabCompletionAdmin(admin.ModelAdmin):
    list_display = (
        "username",
        "lab_name",
        "total_score",
        "standing",
        "progress_display",
        "time_taken",
        "completed_at",
    )
    search_fields = ("username", "lab_name", "standing")
    list_filter = ("completed_at", "lab_name", "standing")
