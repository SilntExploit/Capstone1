import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scenarios', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='mitre_coverage_percent',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name='session',
            name='progress_percent',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='session',
            name='scenario_state',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='session',
            name='summary_headline',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AlterField(
            model_name='session',
            name='status',
            field=models.CharField(choices=[('in_progress', 'In Progress'), ('paused', 'Paused'), ('completed', 'Completed'), ('abandoned', 'Abandoned')], default='in_progress', max_length=20),
        ),
        migrations.CreateModel(
            name='ScenarioLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('node_id', models.CharField(max_length=120)),
                ('parent_node_id', models.CharField(blank=True, max_length=120)),
                ('name', models.CharField(max_length=180)),
                ('node_type', models.CharField(max_length=20)),
                ('file_type', models.CharField(blank=True, max_length=50)),
                ('folder_path', models.CharField(blank=True, max_length=300)),
                ('content', models.TextField(blank=True)),
                ('clue_headline', models.CharField(blank=True, max_length=255)),
                ('expected_category', models.CharField(blank=True, max_length=80)),
                ('mitre_technique_id', models.CharField(blank=True, max_length=30)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('scenario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='scenarios.scenario')),
            ],
            options={
                'ordering': ['sort_order', 'id'],
                'unique_together': {('scenario', 'node_id')},
            },
        ),
    ]