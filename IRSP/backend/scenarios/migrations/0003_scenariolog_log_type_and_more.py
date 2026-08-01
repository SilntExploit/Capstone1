from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scenarios", "0002_session_mitre_coverage_percent_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenariolog",
            name="log_category",
            field=models.CharField(blank=True, max_length=40),
        ),
        migrations.AddField(
            model_name="scenariolog",
            name="log_type",
            field=models.CharField(default="system_security", max_length=40),
        ),
        migrations.AddField(
            model_name="scenariolog",
            name="severity",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="scenariolog",
            name="source_ip",
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
    ]
