from datetime import datetime, timedelta, timezone

from django.core.management.base import BaseCommand

from lab_b.models import LabBAlert, LabBLogEvent
from lab_b.seed_data import ALERTS, LOGS

BASE_TIME = datetime(2026, 6, 16, 8, 40, 0, tzinfo=timezone.utc)


class Command(BaseCommand):
    help = "Seed Lab B (Endpoint Investigation) alerts and telemetry. Idempotent."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing Lab B alerts/logs before reseeding.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            LabBAlert.objects.all().delete()
            LabBLogEvent.objects.all().delete()

        if not LabBAlert.objects.exists():
            LabBAlert.objects.bulk_create(
                [
                    LabBAlert(
                        alert_key=alert_key,
                        scenario_id="scenario-b",
                        timestamp=BASE_TIME + timedelta(minutes=offset),
                        severity=severity,
                        risk_score=risk_score,
                        host=host,
                        title=title,
                        status=status,
                        technique_id=technique_id,
                    )
                    for offset, alert_key, severity, risk_score, host, title, status, technique_id in ALERTS
                ]
            )
            self.stdout.write(self.style.SUCCESS(f"Seeded {len(ALERTS)} Lab B alerts."))
        else:
            self.stdout.write("Lab B alerts already seeded, skipping.")

        if not LabBLogEvent.objects.exists():
            LabBLogEvent.objects.bulk_create(
                [
                    LabBLogEvent(
                        scenario_id="scenario-b",
                        timestamp=BASE_TIME + timedelta(minutes=offset),
                        host=host,
                        sourcetype=sourcetype,
                        severity=severity,
                        user=user,
                        process_name=process_name,
                        parent_process=parent_process,
                        dest_ip=dest_ip,
                        dest_port=dest_port,
                        query_name=query_name,
                        task_name=task_name,
                        technique_id=technique_id,
                        event_id=event_id,
                        event=event_text,
                    )
                    for offset, host, sourcetype, severity, user, process_name, parent_process,
                        dest_ip, dest_port, query_name, task_name, technique_id, event_id, event_text
                    in LOGS
                ]
            )
            self.stdout.write(self.style.SUCCESS(f"Seeded {len(LOGS)} Lab B log events."))
        else:
            self.stdout.write("Lab B log events already seeded, skipping.")
