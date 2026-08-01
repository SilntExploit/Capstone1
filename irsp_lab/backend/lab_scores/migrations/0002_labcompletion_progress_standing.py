# Generated for combined_lab_app integration: adds lab progress & standing fields.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("lab_scores", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="labcompletion",
            name="lab_name",
            field=models.CharField(
                default="lab-a", help_text="Lab identifier/name", max_length=120
            ),
        ),
        migrations.AddField(
            model_name="labcompletion",
            name="stages_completed",
            field=models.PositiveIntegerField(
                default=0, help_text="Number of stages completed"
            ),
        ),
        migrations.AddField(
            model_name="labcompletion",
            name="total_stages",
            field=models.PositiveIntegerField(
                default=3, help_text="Total number of stages in the lab"
            ),
        ),
        migrations.AddField(
            model_name="labcompletion",
            name="standing",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Performance standing/grade",
                max_length=120,
            ),
        ),
    ]
