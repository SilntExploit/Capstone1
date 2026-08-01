from django.conf import settings
from django.db import models


class Scenario(models.Model):
    DIFFICULTY_CHOICES = (
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    )

    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("published", "Published"),
        ("archived", "Archived"),
    )

    title = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    estimated_duration_minutes = models.PositiveIntegerField()
    platform = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title


class Session(models.Model):
    STATUS_CHOICES = (
        ("in_progress", "In Progress"),
        ("paused", "Paused"),
        ("completed", "Completed"),
        ("abandoned", "Abandoned"),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sessions")
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="sessions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="in_progress")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    elapsed_seconds = models.PositiveIntegerField(default=0)
    progress_percent = models.PositiveIntegerField(default=0)
    summary_headline = models.CharField(max_length=255, blank=True)
    mitre_coverage_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    scenario_state = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.user.email} - {self.scenario.title}"


class ScenarioLog(models.Model):
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="logs")
    node_id = models.CharField(max_length=120)
    parent_node_id = models.CharField(max_length=120, blank=True)
    name = models.CharField(max_length=180)
    node_type = models.CharField(max_length=20)
    file_type = models.CharField(max_length=50, blank=True)
    folder_path = models.CharField(max_length=300, blank=True)
    content = models.TextField(blank=True)
    clue_headline = models.CharField(max_length=255, blank=True)
    expected_category = models.CharField(max_length=80, blank=True)
    mitre_technique_id = models.CharField(max_length=30, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    log_type = models.CharField(max_length=40, default="system_security")
    log_category = models.CharField(max_length=40, blank=True)
    severity = models.CharField(max_length=20, blank=True)
    source_ip = models.GenericIPAddressField(blank=True, null=True)

    class Meta:
        ordering = ["sort_order", "id"]
        unique_together = ("scenario", "node_id")

    def __str__(self):
        return f"{self.scenario.slug}:{self.node_id}"
