from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class LabCompletion(models.Model):
    """A completed lab record stored in the dedicated ``lab_scores`` database.

    This model intentionally has NO foreign key to the auth ``User`` model:
    it lives in a separate PostgreSQL database, so users are referenced by
    ``username`` (their email/identifier) rather than a cross-database FK.
    """

    username = models.CharField(max_length=150, db_index=True)
    # Identifier/name of the lab that was completed (e.g. "lab-a").
    lab_name = models.CharField(max_length=120, default="lab-a", help_text="Lab identifier/name")
    # Time taken to complete the lab, stored in whole seconds.
    time_taken = models.PositiveIntegerField(default=0, help_text="Time to complete the lab, in seconds")
    total_score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="0-100",
    )
    # --- Lab progress --------------------------------------------------------
    # How many stages the user finished out of the total available.
    stages_completed = models.PositiveIntegerField(default=0, help_text="Number of stages completed")
    total_stages = models.PositiveIntegerField(
        default=3,
        validators=[MinValueValidator(1)],
        help_text="Total number of stages in the lab",
    )
    # --- Standing ------------------------------------------------------------
    # Human-readable performance standing/grade derived from the score
    # (e.g. "Excellent", "Good", "Needs Practice").
    standing = models.CharField(max_length=120, blank=True, default="", help_text="Performance standing/grade")
    # --- MITRE ATT&CK coverage ----------------------------------------------
    # JSON string describing, per question, the MITRE technique that was
    # exercised and whether the responder got it right. Stored as text so the
    # dashboard can render a post-completion MITRE coverage review without any
    # extra tables. Example element:
    #   {"q":1,"title":"...","code":"T1071.001","name":"...","tactic":"...","status":"correct"}
    mitre_coverage = models.TextField(blank=True, default="", help_text="JSON: per-question MITRE ATT&CK coverage")
    completed_at = models.DateTimeField(default=timezone.now, help_text="When the lab was completed")
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def progress_display(self):
        """Human-friendly progress string, e.g. ``"3/3 stages"``."""
        return f"{self.stages_completed}/{self.total_stages} stages"

    @property
    def progress_percent(self):
        """Progress as a percentage of total stages."""
        if not self.total_stages:
            return 0
        return round((self.stages_completed / self.total_stages) * 100)

    class Meta:
        ordering = ["-completed_at", "-id"]
        verbose_name = "Lab Completion"
        verbose_name_plural = "Lab Completions"

    def __str__(self):
        return f"{self.username} - {self.total_score} ({self.completed_at:%Y-%m-%d %H:%M})"
