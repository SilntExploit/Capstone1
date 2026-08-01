from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="LabBAlert",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("alert_key", models.SlugField(max_length=80, unique=True)),
                ("scenario_id", models.CharField(db_index=True, default="scenario-b", max_length=40)),
                ("timestamp", models.DateTimeField()),
                (
                    "severity",
                    models.CharField(
                        choices=[("critical", "Critical"), ("high", "High"), ("medium", "Medium"), ("low", "Low")],
                        default="medium",
                        max_length=20,
                    ),
                ),
                ("risk_score", models.PositiveSmallIntegerField(default=50)),
                ("host", models.CharField(blank=True, max_length=120)),
                ("title", models.CharField(max_length=255)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("new", "New"),
                            ("investigating", "Investigating"),
                            ("acknowledged", "Acknowledged"),
                            ("contained", "Contained"),
                            ("escalated", "Escalated"),
                        ],
                        default="new",
                        max_length=20,
                    ),
                ),
                ("technique_id", models.CharField(blank=True, max_length=30)),
            ],
            options={
                "ordering": ["-timestamp"],
            },
        ),
        migrations.CreateModel(
            name="LabBLogEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("scenario_id", models.CharField(db_index=True, default="scenario-b", max_length=40)),
                ("timestamp", models.DateTimeField(db_index=True)),
                ("host", models.CharField(max_length=120)),
                ("sourcetype", models.CharField(max_length=80)),
                ("severity", models.CharField(default="info", max_length=20)),
                ("event_id", models.CharField(blank=True, max_length=20)),
                ("user", models.CharField(blank=True, max_length=120)),
                ("process_name", models.CharField(blank=True, max_length=255)),
                ("parent_process", models.CharField(blank=True, max_length=255)),
                ("dest_ip", models.CharField(blank=True, max_length=64)),
                ("dest_port", models.CharField(blank=True, max_length=16)),
                ("query_name", models.CharField(blank=True, max_length=255)),
                ("task_name", models.CharField(blank=True, max_length=255)),
                ("technique_id", models.CharField(blank=True, max_length=30)),
                ("event", models.TextField(blank=True)),
            ],
            options={
                "ordering": ["-timestamp"],
            },
        ),
    ]
