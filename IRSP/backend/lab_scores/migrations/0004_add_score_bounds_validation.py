import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("lab_scores", "0003_labcompletion_mitre_coverage"),
    ]

    operations = [
        migrations.AlterField(
            model_name="labcompletion",
            name="total_score",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text="0-100",
                max_digits=6,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(100),
                ],
            ),
        ),
        migrations.AlterField(
            model_name="labcompletion",
            name="total_stages",
            field=models.PositiveIntegerField(
                default=3,
                help_text="Total number of stages in the lab",
                validators=[django.core.validators.MinValueValidator(1)],
            ),
        ),
    ]
