import json

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from lab_scores.models import LabCompletion

User = get_user_model()

TEAM_ORG = "Team 22"

# Lab A's 13 questions, transcribed from frontend/lab/app.js.
LAB_A_QUESTIONS = [
    (1, "Capture the active network connection", "T1071.001", "Application Layer Protocol", "Command and Control"),
    (2, "Trace how the attacker got in", "T1110.001", "Brute Force: Password Guessing", "Initial Access"),
    (3, "Extract details from the ransom note", "T1486", "Data Encrypted for Impact", "Impact"),
    (4, "Establish the attack timeline", "T1070.006", "Indicator Removal: Timestomp", "Defense Evasion"),
    (5, "Determine the scope of damage", "T1486", "Data Encrypted for Impact", "Impact"),
    (6, "Stop the malicious process", "T1059.004", "Command and Scripting Interpreter: Unix Shell", "Execution"),
    (7, "Block communication to the attacker's server", "T1071", "Application Layer Protocol (Blocked)", "Containment"),
    (8, "Find all persistence mechanisms", "T1053.003", "Scheduled Task/Job: Cron (+ multiple persistence)", "Persistence"),
    (9, "Remove all persistence mechanisms", "T1070", "Indicator Removal (Remediation)", "Remediation"),
    (10, "Verify the backup is safe to use", None, "Backup Integrity Verification", "Recovery"),
    (11, "Restore the affected file", None, "File Recovery", "Recovery"),
    (12, "Lock the compromised account", "T1078", "Valid Accounts (Remediation)", "Containment"),
    (13, "Complete the Incident Report", "Multiple", "Incident Documentation", "All Phases"),
]

# Lab B's 10 alerts, transcribed from backend/lab_b/seed_data.py.
LAB_B_ALERTS = [
    (1, "PowerShell execution policy bypass observed on endpoint", "T1059.001", "PowerShell", "Execution"),
    (2, "Suspicious scheduled task registered with OnLogon trigger", "T1053.005", "Scheduled Task", "Persistence"),
    (3, "UAC bypass via fodhelper.exe registry hijack", "T1548.002", "Bypass User Access Control", "Privilege Escalation"),
    (4, "Windows Defender tamper attempt via Set-MpPreference", "T1562.001", "Disable or Modify Tools", "Defense Evasion"),
    (5, "PowerShell history and credential artifacts accessed", "T1552.001", "Credentials In Files", "Credential Access"),
    (6, "Hidden local administrator account created", "T1136.001", "Local Account", "Persistence"),
    (7, "WinRM lateral movement to WS-FINANCE-03", "T1021.006", "Windows Remote Management", "Lateral Movement"),
    (8, "Staged payload downloaded from external repository", "T1105", "Ingress Tool Transfer", "Command and Control"),
    (9, "Finance documents archived ahead of outbound transfer", "T1560.001", "Archive Collected Data", "Collection"),
    (10, "Ransom note dropped and opened on endpoint", "T1491.001", "Internal Defacement", "Impact"),
]

# username = "<firstname>@irsp.com", password = "<firstname>@123".
DEMO_PEOPLE = [
    {"email": "eapen@irsp.com", "password": "eapen@123", "full_name": "Eapen Benny"},
    {"email": "raghav@irsp.com", "password": "raghav@123", "full_name": "Raghav Dewett"},
    {"email": "sher@irsp.com", "password": "sher@123", "full_name": "Sher Muhammad Khan"},
    {"email": "yuvraj@irsp.com", "password": "yuvraj@123", "full_name": "Yuvraj Sandhu"},
]

# Everyone who should show up together on the Team page.
TEAM_EMAILS = [p["email"] for p in DEMO_PEOPLE] + ["trainee@irsp.local", "manager@irsp.local"]


def _perfect_coverage(rows):
    return json.dumps([
        {"q": q, "title": title, "code": code, "name": name, "tactic": tactic, "status": "correct"}
        for (q, title, code, name, tactic) in rows
    ])


def _partial_coverage(rows, correct_qs):
    return json.dumps([
        {
            "q": q, "title": title, "code": code, "name": name, "tactic": tactic,
            "status": "correct" if q in correct_qs else "not_attempted",
        }
        for (q, title, code, name, tactic) in rows
    ])


class Command(BaseCommand):
    help = "Seed the named demo accounts, group them into one team, and seed their lab completions. Idempotent."

    def handle(self, *args, **options):
        for person in DEMO_PEOPLE:
            if User.objects.filter(email=person["email"]).exists():
                self.stdout.write(f"Demo account already exists: {person['email']}")
                continue
            User.objects.create_user(
                email=person["email"],
                password=person["password"],
                role="trainee",
                full_name=person["full_name"],
                is_active=True,
                is_staff=False,
            )
            self.stdout.write(self.style.SUCCESS(f"Created demo account: {person['email']}"))

        # update() is a no-op for any email that doesn't exist.
        updated = User.objects.filter(email__in=TEAM_EMAILS).update(organization=TEAM_ORG)
        self.stdout.write(f"Grouped {updated} account(s) into '{TEAM_ORG}'.")

        target_completions = [
            ("eapen@irsp.com", "lab-a", 2700 - 1200, 3, 3, 100, _perfect_coverage(LAB_A_QUESTIONS)),
            ("sher@irsp.com", "lab-b", 1800 - 900, 5, 5, 100, _perfect_coverage(LAB_B_ALERTS)),
            ("yuvraj@irsp.com", "lab-b", 1800 - 780, 5, 5, 100, _perfect_coverage(LAB_B_ALERTS)),
            # Trainee gets a realistic, imperfect run - not 100%.
            ("trainee@irsp.local", "lab-a", 2700 - 640, 2, 3, 72, _partial_coverage(LAB_A_QUESTIONS, {1, 2, 3, 4, 6, 7, 8, 9, 12})),
            ("trainee@irsp.local", "lab-b", 1800 - 420, 4, 5, 65, _partial_coverage(LAB_B_ALERTS, {1, 2, 4, 6, 7, 8})),
        ]

        already_seeded = all(
            LabCompletion.objects.filter(username=username, lab_name=lab_name, total_score=score).exists()
            for username, lab_name, _time, _sc, _ts, score, _cov in target_completions
        )

        if already_seeded:
            self.stdout.write("Demo completions already seeded, skipping.")
            return

        # Idempotent: the check above skips this once seeded.
        deleted_count, _ = LabCompletion.objects.all().delete()
        if deleted_count:
            self.stdout.write(f"Cleared {deleted_count} pre-existing lab completion record(s).")

        now = timezone.now()
        for username, lab_name, time_taken, stages_completed, total_stages, score, coverage in target_completions:
            standing = "Excellent" if score >= 80 else "Good" if score >= 55 else "Needs Practice"
            LabCompletion.objects.create(
                username=username,
                lab_name=lab_name,
                time_taken=time_taken,
                total_score=score,
                stages_completed=stages_completed,
                total_stages=total_stages,
                standing=standing,
                mitre_coverage=coverage,
                completed_at=now,
            )
            self.stdout.write(self.style.SUCCESS(f"Seeded {lab_name} {score}/100 for {username}"))
