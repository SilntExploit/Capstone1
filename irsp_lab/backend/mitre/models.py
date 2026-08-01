from django.db import models

from scenarios.models import Scenario


class MitreMapping(models.Model):
    COVERAGE_CHOICES = (
        ("covered", "Covered"),
        ("critical", "Critical"),
        ("planned", "Planned"),
    )

    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="mitre_mappings")
    technique_id = models.CharField(max_length=30)
    technique_name = models.CharField(max_length=180)
    tactic = models.CharField(max_length=120)
    coverage_status = models.CharField(max_length=20, choices=COVERAGE_CHOICES, default="covered")
    summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("scenario", "technique_id")
        ordering = ["technique_id"]

    def __str__(self):
        return f"{self.technique_id} - {self.scenario.title}"
