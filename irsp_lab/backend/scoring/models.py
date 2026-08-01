from django.conf import settings
from django.db import models

from scenarios.models import Session


class Action(models.Model):
    ACTION_STATUS_CHOICES = (
        ("success", "Success"),
        ("partial", "Partial"),
        ("failed", "Failed"),
    )

    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="actions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="actions")
    action_key = models.CharField(max_length=120)
    action_label = models.CharField(max_length=160)
    status = models.CharField(max_length=20, choices=ACTION_STATUS_CHOICES, default="success")
    payload = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-occurred_at"]

    def __str__(self):
        return f"{self.user.email} - {self.action_key}"


class Score(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name="score")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="scores")
    total_score = models.DecimalField(max_digits=5, decimal_places=2)
    containment_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    investigation_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    communication_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    feedback = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.total_score}"
