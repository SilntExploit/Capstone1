from django.db import models


class LabBAlert(models.Model):
    """A triage-queue alert for the Scenario B endpoint investigation lab.

    Mirrors the shape the frontend (js/pages/scenario-b.js) expects from
    GET /api/alerts?scenario=scenario-b: alert_key drives the "Pivot" button
    query (see lab_b.querylang / views.alert_pivot_query for the mapping).
    """

    SEVERITY_CHOICES = (
        ("critical", "Critical"),
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
    )

    STATUS_CHOICES = (
        ("new", "New"),
        ("investigating", "Investigating"),
        ("acknowledged", "Acknowledged"),
        ("contained", "Contained"),
        ("escalated", "Escalated"),
    )

    alert_key = models.SlugField(max_length=80, unique=True)
    scenario_id = models.CharField(max_length=40, default="scenario-b", db_index=True)
    timestamp = models.DateTimeField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="medium")
    risk_score = models.PositiveSmallIntegerField(default=50)
    host = models.CharField(max_length=120, blank=True)
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    technique_id = models.CharField(max_length=30, blank=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.alert_key} ({self.scenario_id})"


class LabBLogEvent(models.Model):
    """A single endpoint telemetry record for Scenario B.

    Field names intentionally mirror the Windows-event-ish shape the
    frontend's normalizeLog()/classifyPhase() helpers already understand
    (host, sourcetype, severity, event, process_name, parent_process, ...).
    """

    scenario_id = models.CharField(max_length=40, default="scenario-b", db_index=True)
    timestamp = models.DateTimeField(db_index=True)
    host = models.CharField(max_length=120)
    sourcetype = models.CharField(max_length=80)
    severity = models.CharField(max_length=20, default="info")
    event_id = models.CharField(max_length=20, blank=True)
    user = models.CharField(max_length=120, blank=True)
    process_name = models.CharField(max_length=255, blank=True)
    parent_process = models.CharField(max_length=255, blank=True)
    dest_ip = models.CharField(max_length=64, blank=True)
    dest_port = models.CharField(max_length=16, blank=True)
    query_name = models.CharField(max_length=255, blank=True)
    task_name = models.CharField(max_length=255, blank=True)
    technique_id = models.CharField(max_length=30, blank=True)
    event = models.TextField(blank=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.host} {self.sourcetype} @ {self.timestamp}"
