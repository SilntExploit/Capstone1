from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import LabBAlert, LabBLogEvent
from .querylang import build_search_response

User = get_user_model()


class QueryLangTests(TestCase):
    """The search DSL is pure logic - no DB needed to test it."""

    def setUp(self):
        self.records = [
            {
                "timestamp": "2026-06-16T08:42:00Z", "host": "DESKTOP-GRQ4G1E",
                "sourcetype": "sysmon:process", "severity": "high", "user": "jsmith",
                "event": "Process Create: powershell.exe -ExecutionPolicy Bypass",
                "technique_id": "T1059.001", "process_name": "powershell.exe",
                "parent_process": "", "dest_ip": "", "dest_port": "",
                "task_name": "", "event_id": "1",
            },
            {
                "timestamp": "2026-06-16T08:46:00Z", "host": "DESKTOP-GRQ4G1E",
                "sourcetype": "windows:taskscheduler", "severity": "critical", "user": "SYSTEM",
                "event": "schtasks /create /tn WindowsUpdate_svc /sc onlogon",
                "technique_id": "T1053.005", "process_name": "schtasks.exe",
                "parent_process": "", "dest_ip": "", "dest_port": "",
                "task_name": "WindowsUpdate_svc", "event_id": "106",
            },
        ]

    def test_bare_term_matches_across_fields(self):
        matched = build_search_response(self.records, "powershell", None)
        self.assertEqual(matched["total_matches"], 1)

    def test_field_has_operator(self):
        matched = build_search_response(self.records, 'event has "schtasks"', None)
        self.assertEqual(matched["total_matches"], 1)
        self.assertEqual(matched["results"][0]["task_name"], "WindowsUpdate_svc")

    def test_host_in_operator(self):
        matched = build_search_response(self.records, 'host in ("DESKTOP-GRQ4G1E", "10.0.0.5")', None)
        self.assertEqual(matched["total_matches"], 2)

    def test_and_or_combination(self):
        matched = build_search_response(
            self.records,
            'sourcetype has "taskscheduler" or severity = "critical"',
            None,
        )
        self.assertEqual(matched["total_matches"], 1)

    def test_not_operator_excludes(self):
        matched = build_search_response(self.records, 'event has "Process" and not event has "schtasks"', None)
        self.assertEqual(matched["total_matches"], 1)

    def test_empty_query_returns_everything(self):
        matched = build_search_response(self.records, "", None)
        self.assertEqual(matched["total_matches"], len(self.records))

    def test_severity_breakdown_counts_by_severity(self):
        matched = build_search_response(self.records, "", None)
        self.assertEqual(matched["severity_breakdown"], {"high": 1, "critical": 1})

    def test_malformed_query_falls_back_to_plain_text_search_instead_of_erroring(self):
        # Unbalanced parenthesis shouldn't raise - it should degrade to a
        # plain substring search rather than 500ing the endpoint.
        matched = build_search_response(self.records, 'event has "schtasks" and (', None)
        self.assertIsInstance(matched["total_matches"], int)


class LabBEndpointAuthTests(TestCase):
    """/api/alerts and /api/search require authentication."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="trainee@example.com", password="testpass123", role="trainee",
        )

    def test_alerts_requires_authentication(self):
        response = self.client.get("/api/alerts", {"scenario": "scenario-b"})
        self.assertEqual(response.status_code, 401)

    def test_search_requires_authentication(self):
        response = self.client.get("/api/search", {"scenario": "scenario-b", "q": "powershell"})
        self.assertEqual(response.status_code, 401)

    def test_alerts_returns_seeded_data_when_authenticated(self):
        LabBAlert.objects.create(
            alert_key="test-alert", scenario_id="scenario-b",
            timestamp="2026-06-16T08:40:00Z", severity="high",
            risk_score=80, host="DESKTOP-GRQ4G1E", title="Test alert",
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/alerts", {"scenario": "scenario-b"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["items"][0]["alert_key"], "test-alert")


class SeedCommandIdempotencyTests(TestCase):
    def test_running_seed_twice_does_not_duplicate_data(self):
        from django.core.management import call_command

        call_command("seed_lab_b")
        first_alert_count = LabBAlert.objects.count()
        first_log_count = LabBLogEvent.objects.count()
        self.assertGreater(first_alert_count, 0)
        self.assertGreater(first_log_count, 0)

        call_command("seed_lab_b")
        self.assertEqual(LabBAlert.objects.count(), first_alert_count)
        self.assertEqual(LabBLogEvent.objects.count(), first_log_count)


class AssessmentContentTests(TestCase):
    """Pure content/logic checks - no DB or auth needed."""

    def test_every_alert_seeded_has_a_question(self):
        from . import assessment
        from .seed_data import ALERTS

        alert_keys = {row[1] for row in ALERTS}
        question_keys = set(assessment.ALERT_QUESTIONS.keys())
        self.assertEqual(alert_keys, question_keys)

    def test_response_options_has_six_correct_and_some_wrong(self):
        from . import assessment

        correct = [o for o in assessment.RESPONSE_OPTIONS if o["correct"]]
        wrong = [o for o in assessment.RESPONSE_OPTIONS if not o["correct"]]
        self.assertEqual(len(correct), 6)
        self.assertGreaterEqual(len(wrong), 3)

    def test_timeline_has_a_unique_total_order(self):
        from . import assessment

        orders = sorted(e["order"] for e in assessment.TIMELINE_EVENTS)
        self.assertEqual(orders, list(range(1, len(assessment.TIMELINE_EVENTS) + 1)))


class AssessmentEndpointTests(TestCase):
    """Verify the endpoints work AND never leak the correct answer."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="trainee2@example.com", password="testpass123", role="trainee")
        self.client.force_authenticate(user=self.user)

    def test_question_endpoint_requires_auth(self):
        anon = APIClient()
        response = anon.get("/api/lab-b/questions", {"alert_key": "hidden-user-created"})
        self.assertEqual(response.status_code, 401)

    def test_question_get_never_leaks_correct_answer(self):
        response = self.client.get("/api/lab-b/questions", {"alert_key": "hidden-user-created"})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("correct", response.data)
        for option in response.data["options"]:
            self.assertNotIn("correct", option)

    def test_question_check_grades_correctly(self):
        right = self.client.post("/api/lab-b/questions", {"alert_key": "hidden-user-created", "choice_id": "c"}, format="json")
        wrong = self.client.post("/api/lab-b/questions", {"alert_key": "hidden-user-created", "choice_id": "a"}, format="json")
        self.assertTrue(right.data["correct"])
        self.assertFalse(wrong.data["correct"])

    def test_timeline_get_never_leaks_order(self):
        response = self.client.get("/api/lab-b/timeline")
        self.assertEqual(response.status_code, 200)
        for event in response.data["events"]:
            self.assertNotIn("order", event)

    def test_timeline_check_grades_correctly(self):
        from . import assessment

        true_order = [e["id"] for e in sorted(assessment.TIMELINE_EVENTS, key=lambda e: e["order"])]
        response = self.client.post("/api/lab-b/timeline", {"ordered_ids": true_order}, format="json")
        self.assertEqual(response.data["correct_positions"], response.data["total"])

    def test_response_options_get_never_leaks_correct_flag(self):
        response = self.client.get("/api/lab-b/response-options")
        self.assertEqual(response.status_code, 200)
        for option in response.data["options"]:
            self.assertNotIn("correct", option)

    def test_response_options_check_grades_correctly(self):
        from . import assessment

        correct_ids = [o["id"] for o in assessment.RESPONSE_OPTIONS if o["correct"]]
        response = self.client.post("/api/lab-b/response-options", {"selected_ids": correct_ids}, format="json")
        self.assertEqual(response.data["correct_selected"], 6)
        self.assertEqual(response.data["wrong_selected"], 0)
        self.assertEqual(response.data["missed"], 0)
