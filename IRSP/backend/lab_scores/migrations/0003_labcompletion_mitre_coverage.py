# Adds per-question MITRE ATT&CK coverage storage for the post-completion review.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("lab_scores", "0002_labcompletion_progress_standing"),
    ]

    operations = [
        migrations.AddField(
            model_name="labcompletion",
            name="mitre_coverage",
            field=models.TextField(
                blank=True,
                default="",
                help_text="JSON: per-question MITRE ATT&CK coverage",
            ),
        ),
    ]
