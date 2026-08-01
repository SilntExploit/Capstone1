from django.contrib import admin

from .models import LabBAlert, LabBLogEvent


@admin.register(LabBAlert)
class LabBAlertAdmin(admin.ModelAdmin):
    list_display = ("alert_key", "scenario_id", "severity", "status", "host", "timestamp")
    list_filter = ("severity", "status", "scenario_id")
    search_fields = ("alert_key", "title", "host")


@admin.register(LabBLogEvent)
class LabBLogEventAdmin(admin.ModelAdmin):
    list_display = ("host", "sourcetype", "severity", "timestamp", "scenario_id")
    list_filter = ("sourcetype", "severity", "scenario_id")
    search_fields = ("host", "event", "process_name")
