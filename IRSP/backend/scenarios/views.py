import json
from datetime import timedelta
from decimal import Decimal
from random import Random

from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import User
from authentication.permissions import IsManagerOrReadOnly
from lab_scores.models import LabCompletion
from mitre.models import MitreMapping
from scoring.models import Action

from .models import Scenario, ScenarioLog, Session
from .serializers import ScenarioLogSerializer, ScenarioSerializer, SessionSerializer

ACTIVE_LAB_SLUG = "compromised-system-investigation"
LOG_TYPE_PHISHING = "message_email"
LOG_TYPE_SYSTEM = "system_security"
ACTIVE_LAB_LOG_TYPES = [
    {"value": LOG_TYPE_PHISHING, "label": "Message Email Logs"},
    {"value": LOG_TYPE_SYSTEM, "label": "System Security Logs"},
]
ACTIVE_LAB_CATEGORIES = ["Authentication", "Email", "Network", "File System"]


def random_seed_for_user(user, log_type, seed_hint=""):
    day = timezone.now().strftime("%Y%m%d")
    return f"{user.id}-{log_type}-{seed_hint or day}"


def iso_now_plus_minutes(minutes):
    return (timezone.now() + timedelta(minutes=minutes)).strftime("%Y-%m-%d %H:%M:%S")


def message_templates(rng):
    sender_domains = [
        "finance-updates.com",
        "vendor-payment-alerts.net",
        "secure-invoice-mail.co",
        "trusted-billing-services.org",
    ]
    senders = ["Accounts Payable", "Finance Operations", "Vendor Billing", "Procurement Desk"]
    users = ["finance-user", "accounts-user", "ap-specialist", "billing-ops"]
    subjects = [
        "Urgent: Outstanding Invoice Review",
        "Payment Exception Requires Action",
        "Invoice Verification Before EOD",
        "Action Required: Vendor Payment Hold",
    ]
    suspicious_urls = [
        "https://secure-invoice-review.com/verify",
        "https://payment-confirmation-portal.net/session",
        "https://vendor-docs-checker.org/update",
        "https://invoice-auth-center.co/validation",
    ]
    attachments = ["invoice_q2_review.docm", "payment_notice.xlsm", "vendor_statement.zip", "remittance_update.html"]
    chosen_domain = rng.choice(sender_domains)
    chosen_sender = rng.choice(senders)
    chosen_user = rng.choice(users)
    chosen_subject = rng.choice(subjects)
    chosen_url = rng.choice(suspicious_urls)
    chosen_attachment = rng.choice(attachments)
    source_ip = f"203.0.113.{rng.randint(11, 88)}"

    email_header_log = "\n".join(
        [
            f"[{iso_now_plus_minutes(-18)}] severity=HIGH category=Email source_ip={source_ip} event=InboundEmail sender=\"{chosen_sender} <billing@{chosen_domain}>\" recipient={chosen_user}@corp.local subject=\"{chosen_subject}\"",
            f"[{iso_now_plus_minutes(-17)}] severity=MEDIUM category=Email source_ip={source_ip} event=HeaderCheck spf=fail dkim=fail dmarc=reject",
            f"[{iso_now_plus_minutes(-16)}] severity=CRITICAL category=Email source_ip={source_ip} event=URLInspection suspicious_url={chosen_url}",
            f"[{iso_now_plus_minutes(-16)}] severity=HIGH category=Email source_ip={source_ip} event=AttachmentDetected file={chosen_attachment} mime=application/vnd.ms-word",
            f"[{iso_now_plus_minutes(-15)}] severity=HIGH category=Email source_ip={source_ip} event=DeliveryStatus delivered=true mailbox=finance",
        ]
    )

    network_log = "\n".join(
        [
            f"{iso_now_plus_minutes(-14)} severity=HIGH category=Network src=10.20.14.{rng.randint(4, 99)} dst={source_ip} dst_port=443 protocol=TLS event=OutboundConnection",
            f"{iso_now_plus_minutes(-13)} severity=CRITICAL category=Network src=10.20.14.{rng.randint(4, 99)} query=verify-invoice.{chosen_domain} type=TXT event=DNSLookup",
            f"{iso_now_plus_minutes(-12)} severity=HIGH category=Network src=10.20.14.{rng.randint(4, 99)} dst={source_ip} uri=/payload stage=download event=HTTPGet",
        ]
    )

    return [
        {
            "node_id": "root-logs",
            "parent_node_id": "",
            "name": "logs",
            "node_type": "folder",
            "folder_path": "/logs",
            "sort_order": 1,
            "log_type": LOG_TYPE_PHISHING,
        },
        {
            "node_id": "logs-email",
            "parent_node_id": "root-logs",
            "name": "email",
            "node_type": "folder",
            "folder_path": "/logs/email",
            "sort_order": 2,
            "log_type": LOG_TYPE_PHISHING,
        },
        {
            "node_id": "file-email-gateway",
            "parent_node_id": "logs-email",
            "name": "email-gateway.log",
            "node_type": "file",
            "file_type": "log",
            "folder_path": "/logs/email",
            "content": email_header_log,
            "clue_headline": "Message email indicators with suspicious sender, URL, and attachment.",
            "expected_category": "Email",
            "mitre_technique_id": "T1566",
            "sort_order": 3,
            "log_type": LOG_TYPE_PHISHING,
            "log_category": "Email",
            "severity": "critical",
            "source_ip": source_ip,
        },
        {
            "node_id": "file-phish-message",
            "parent_node_id": "logs-email",
            "name": "suspicious-email.eml",
            "node_type": "file",
            "file_type": "email",
            "folder_path": "/logs/email",
            "content": "\n".join(
                [
                    f"From: {chosen_sender} <billing@{chosen_domain}>",
                    f"To: {chosen_user}@corp.local",
                    f"Subject: {chosen_subject}",
                    f"Date: {iso_now_plus_minutes(-18)} +0000",
                    f"X-Originating-IP: [{source_ip}]",
                    f"Reply-To: support@{chosen_domain}",
                    f"Attachment: {chosen_attachment}",
                    "",
                    "Please review the attached invoice urgently and confirm payment before end of day.",
                    f"Payment portal: {chosen_url}",
                ]
            ),
            "clue_headline": "Captured message email message body and headers.",
            "expected_category": "Email",
            "mitre_technique_id": "T1566.001",
            "sort_order": 4,
            "log_type": LOG_TYPE_PHISHING,
            "log_category": "Email",
            "severity": "high",
            "source_ip": source_ip,
        },
        {
            "node_id": "logs-network",
            "parent_node_id": "root-logs",
            "name": "network",
            "node_type": "folder",
            "folder_path": "/logs/network",
            "sort_order": 5,
            "log_type": LOG_TYPE_PHISHING,
        },
        {
            "node_id": "file-network-monitor",
            "parent_node_id": "logs-network",
            "name": "network-monitor.log",
            "node_type": "file",
            "file_type": "log",
            "folder_path": "/logs/network",
            "content": network_log,
            "clue_headline": "Post-message outbound activity from endpoint indicates possible command-and-control.",
            "expected_category": "Network",
            "mitre_technique_id": "T1071",
            "sort_order": 6,
            "log_type": LOG_TYPE_PHISHING,
            "log_category": "Network",
            "severity": "high",
            "source_ip": source_ip,
        },
    ]


def system_security_templates(rng):
    compromised_host = f"WS-FINANCE-{rng.randint(10, 99)}"
    source_ip = f"10.20.14.{rng.randint(5, 250)}"
    account = rng.choice(["svc-backup", "finance-user", "ops-admin"])

    auth_log = "\n".join(
        [
            f"[{iso_now_plus_minutes(-20)}] severity=MEDIUM category=Authentication host={compromised_host} src_ip={source_ip} event=FailedLogin user=administrator",
            f"[{iso_now_plus_minutes(-19)}] severity=MEDIUM category=Authentication host={compromised_host} src_ip={source_ip} event=FailedLogin user=administrator",
            f"[{iso_now_plus_minutes(-18)}] severity=HIGH category=Authentication host={compromised_host} src_ip={source_ip} event=SuccessfulLogin user={account}",
            f"[{iso_now_plus_minutes(-16)}] severity=CRITICAL category=Authentication host={compromised_host} src_ip={source_ip} event=PrivilegeEscalation user={account} target=SYSTEM",
        ]
    )

    file_log = "\n".join(
        [
            f"{iso_now_plus_minutes(-15)} severity=HIGH category=File System host={compromised_host} event=FileCreate path=C:/ProgramData/dropper.ps1 sha256={rng.getrandbits(96):024x}",
            f"{iso_now_plus_minutes(-14)} severity=CRITICAL category=File System host={compromised_host} event=FileRead path=C:/Windows/System32/config/SAM user={account}",
            f"{iso_now_plus_minutes(-13)} severity=HIGH category=File System host={compromised_host} event=TaskCreate name=WindowsUpdate_svc command=powershell.exe",
        ]
    )

    process_log = "\n".join(
        [
            f"{iso_now_plus_minutes(-12)} severity=CRITICAL category=Authentication host={compromised_host} event=ProcessAccess source=procdump.exe target=lsass.exe",
            f"{iso_now_plus_minutes(-11)} severity=HIGH category=Network host={compromised_host} event=OutboundTLS dst=203.0.113.{rng.randint(22, 77)} dst_port=443",
            f"{iso_now_plus_minutes(-10)} severity=HIGH category=Network host={compromised_host} event=DNSQuery query=beacon-{rng.randint(1000,9999)}.malware-c2.net type=TXT",
        ]
    )

    return [
        {
            "node_id": "root-logs",
            "parent_node_id": "",
            "name": "logs",
            "node_type": "folder",
            "folder_path": "/logs",
            "sort_order": 1,
            "log_type": LOG_TYPE_SYSTEM,
        },
        {
            "node_id": "logs-auth",
            "parent_node_id": "root-logs",
            "name": "authentication",
            "node_type": "folder",
            "folder_path": "/logs/authentication",
            "sort_order": 2,
            "log_type": LOG_TYPE_SYSTEM,
        },
        {
            "node_id": "file-auth-events",
            "parent_node_id": "logs-auth",
            "name": "auth-events.log",
            "node_type": "file",
            "file_type": "log",
            "folder_path": "/logs/authentication",
            "content": auth_log,
            "clue_headline": "Multiple failed logins followed by privileged access.",
            "expected_category": "Authentication",
            "mitre_technique_id": "T1021",
            "sort_order": 3,
            "log_type": LOG_TYPE_SYSTEM,
            "log_category": "Authentication",
            "severity": "critical",
            "source_ip": source_ip,
        },
        {
            "node_id": "logs-filesystem",
            "parent_node_id": "root-logs",
            "name": "file-system",
            "node_type": "folder",
            "folder_path": "/logs/file-system",
            "sort_order": 4,
            "log_type": LOG_TYPE_SYSTEM,
        },
        {
            "node_id": "file-file-events",
            "parent_node_id": "logs-filesystem",
            "name": "file-events.log",
            "node_type": "file",
            "file_type": "log",
            "folder_path": "/logs/file-system",
            "content": file_log,
            "clue_headline": "Suspicious file creation and protected data access.",
            "expected_category": "File System",
            "mitre_technique_id": "T1053.005",
            "sort_order": 5,
            "log_type": LOG_TYPE_SYSTEM,
            "log_category": "File System",
            "severity": "high",
            "source_ip": source_ip,
        },
        {
            "node_id": "logs-network",
            "parent_node_id": "root-logs",
            "name": "network",
            "node_type": "folder",
            "folder_path": "/logs/network",
            "sort_order": 6,
            "log_type": LOG_TYPE_SYSTEM,
        },
        {
            "node_id": "file-process-network",
            "parent_node_id": "logs-network",
            "name": "process-network.log",
            "node_type": "file",
            "file_type": "log",
            "folder_path": "/logs/network",
            "content": process_log,
            "clue_headline": "Credential dumping process and suspicious outbound network traffic detected.",
            "expected_category": "Network",
            "mitre_technique_id": "T1003.001",
            "sort_order": 7,
            "log_type": LOG_TYPE_SYSTEM,
            "log_category": "Network",
            "severity": "critical",
            "source_ip": source_ip,
        },
    ]


ACTIVE_LAB_MITRE = [
    ("T1566", "Message", "Initial Access"),
    ("T1566.001", "Spearmessage Attachment", "Initial Access"),
    ("T1059.001", "PowerShell", "Execution"),
    ("T1053.005", "Scheduled Task", "Persistence"),
    ("T1003.001", "OS Credential Dumping: LSASS Memory", "Credential Access"),
    ("T1021", "Remote Services", "Lateral Movement"),
    ("T1071", "Application Layer Protocol", "Command and Control"),
    ("T1071.004", "DNS", "Command and Control"),
    ("T1041", "Exfiltration Over C2 Channel", "Exfiltration"),
]


def ensure_active_lab_seeded():
    with transaction.atomic():
        scenario, _ = Scenario.objects.get_or_create(
            slug=ACTIVE_LAB_SLUG,
            defaults={
                "title": "Lab A - Ransomware Containment",
                "description": "Investigate, contain, and document a ransomware incident inside the browser-based lab environment.",
                "difficulty": "intermediate",
                "estimated_duration_minutes": 30,
                "platform": "Linux Lab",
                "status": "published",
            },
        )
        for technique_id, technique_name, tactic in ACTIVE_LAB_MITRE:
            MitreMapping.objects.update_or_create(
                scenario=scenario,
                technique_id=technique_id,
                defaults={
                    "technique_name": technique_name,
                    "tactic": tactic,
                    "coverage_status": "covered",
                    "summary": "Archived mapped technique",
                },
            )
    return scenario


def sync_scenario_logs(scenario, nodes, log_type):
    existing_ids = set(ScenarioLog.objects.filter(scenario=scenario).values_list("node_id", flat=True))
    incoming_ids = set()
    for node in nodes:
        incoming_ids.add(node["node_id"])
        ScenarioLog.objects.update_or_create(
            scenario=scenario,
            node_id=node["node_id"],
            defaults={
                "parent_node_id": node.get("parent_node_id", ""),
                "name": node["name"],
                "node_type": node["node_type"],
                "file_type": node.get("file_type", ""),
                "folder_path": node.get("folder_path", ""),
                "content": node.get("content", ""),
                "clue_headline": node.get("clue_headline", ""),
                "expected_category": node.get("expected_category", ""),
                "mitre_technique_id": node.get("mitre_technique_id", ""),
                "sort_order": node.get("sort_order", 0),
                "log_type": node.get("log_type", log_type),
                "log_category": node.get("log_category", ""),
                "severity": node.get("severity", ""),
                "source_ip": node.get("source_ip", ""),
            },
        )
    stale_ids = existing_ids - incoming_ids
    if stale_ids:
        ScenarioLog.objects.filter(scenario=scenario, node_id__in=stale_ids).delete()


class ScenarioViewSet(viewsets.ModelViewSet):
    queryset = Scenario.objects.all()
    serializer_class = ScenarioSerializer
    permission_classes = [IsManagerOrReadOnly]


class SessionViewSet(viewsets.ModelViewSet):
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == "manager":
            return Session.objects.select_related("user", "scenario").all()
        return Session.objects.select_related("user", "scenario").filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ActiveLabLogTemplateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "log_types": ACTIVE_LAB_LOG_TYPES,
                "categories": ACTIVE_LAB_CATEGORIES,
            }
        )


class ActiveLabLogListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        scenario = ensure_active_lab_seeded()
        requested_type = request.query_params.get("log_type", LOG_TYPE_PHISHING)
        log_type = requested_type if requested_type in {LOG_TYPE_PHISHING, LOG_TYPE_SYSTEM} else LOG_TYPE_PHISHING
        seed_hint = request.query_params.get("seed", "")
        rng = Random(random_seed_for_user(request.user, log_type, seed_hint=seed_hint))
        nodes = message_templates(rng) if log_type == LOG_TYPE_PHISHING else system_security_templates(rng)
        sync_scenario_logs(scenario, nodes, log_type)
        logs = ScenarioLog.objects.filter(scenario=scenario).order_by("sort_order", "id")
        data = ScenarioLogSerializer(logs, many=True).data
        return Response(
            {
                "scenario": ScenarioSerializer(scenario).data,
                "nodes": data,
                "categories": ACTIVE_LAB_CATEGORIES,
                "active_log_type": log_type,
                "log_types": ACTIVE_LAB_LOG_TYPES,
            }
        )


class SessionDashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ensure_active_lab_seeded()
        sessions = Session.objects.select_related("scenario").filter(user=request.user, status="completed")
        results = []
        for session in sessions:
            score = getattr(session, "score", None)
            total_score = float(score.total_score) if score else 0
            results.append(
                {
                    "session_id": session.id,
                    "lab": session.scenario.title,
                    "scenario": session.scenario.title,
                    "scenario_slug": session.scenario.slug,
                    "completed_at": session.completed_at,
                    "score": total_score,
                    "mitre_coverage_percent": float(session.mitre_coverage_percent or Decimal("0")),
                    "summary_headline": session.summary_headline,
                }
            )
        avg_score = 0
        avg_coverage = 0
        if results:
            avg_score = round(sum(item["score"] for item in results) / len(results), 2)
            avg_coverage = round(sum(item["mitre_coverage_percent"] for item in results) / len(results), 2)
        return Response(
            {
                "completed_count": len(results),
                "average_score": avg_score,
                "average_mitre_coverage": avg_coverage,
                "completed_labs": sorted(results, key=lambda item: item["completed_at"] or "", reverse=True),
            }
        )


LAB_DISPLAY_NAMES = {
    "lab-a": "Lab A - Ransomware Containment",
    "lab-b": "Lab B - Endpoint Investigation",
}


class ReportsDataView(APIView):
    """Session-style report rows, sourced from LabCompletion. It has no FK
    to User (separate database, keyed by username/email), so this fetches
    each side separately and joins in Python.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_target_users(self, request):
        if request.user.role == "manager":
            return User.objects.all()
        return User.objects.filter(pk=request.user.pk)

    def get(self, request):
        include_in_progress = request.query_params.get("include_in_progress") == "true"

        users = self.get_target_users(request)
        users_by_email = {user.email: user for user in users}
        completions = LabCompletion.objects.filter(username__in=users_by_email.keys())

        session_rows = []
        for completion in completions:
            user = users_by_email.get(completion.username)
            if not user:
                continue

            try:
                coverage = json.loads(completion.mitre_coverage or "[]")
            except (ValueError, TypeError):
                coverage = []
            correct = [item for item in coverage if item.get("status") == "correct"]
            mitre_percent = round((len(correct) / len(coverage)) * 100, 2) if coverage else 0

            progress_percent = (
                round((completion.stages_completed / completion.total_stages) * 100)
                if completion.total_stages else 0
            )

            session_rows.append({
                "session_id": completion.id,
                "status": "completed",
                "lab": LAB_DISPLAY_NAMES.get(completion.lab_name, completion.lab_name),
                "scenario": LAB_DISPLAY_NAMES.get(completion.lab_name, completion.lab_name),
                "scenario_slug": completion.lab_name,
                "user_email": user.email,
                "user_full_name": user.full_name,
                "started_at": completion.completed_at,
                "completed_at": completion.completed_at,
                "elapsed_seconds": completion.time_taken,
                "progress_percent": progress_percent,
                "summary_headline": completion.standing,
                "mitre_coverage_percent": mitre_percent,
                "scores": {
                    "total": float(completion.total_score),
                    "containment": 0,
                    "investigation": 0,
                    "communication": 0,
                },
                "actions_taken": [],
                "mitre_techniques": [
                    {"technique_id": item.get("code"), "technique_name": item.get("name")}
                    for item in correct if item.get("code")
                ],
            })

        # LabCompletion rows are only ever "completed".
        if not include_in_progress:
            session_rows = [row for row in session_rows if row["status"] == "completed"]

        session_rows.sort(key=lambda item: item["completed_at"] or timezone.now(), reverse=True)

        avg_score = 0
        avg_mitre = 0
        if session_rows:
            avg_score = round(sum(item["scores"]["total"] for item in session_rows) / len(session_rows), 2)
            avg_mitre = round(sum(item["mitre_coverage_percent"] for item in session_rows) / len(session_rows), 2)

        return Response(
            {
                "metrics": {
                    "sessions": len(session_rows),
                    "average_score": avg_score,
                    "average_mitre_coverage": avg_mitre,
                },
                "sessions": session_rows,
                "mitre_coverage": [],
            }
        )


class TeamStatisticsView(APIView):
    """Team roster + leaderboard, sourced from LabCompletion. It has no FK
    to User (separate database, keyed by username/email), so this fetches
    each side separately and combines in Python.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_team_users(self, request):
        if request.user.role == "manager":
            return User.objects.all()
        return User.objects.filter(organization=request.user.organization, role="trainee")

    def get(self, request):
        users = list(self.get_team_users(request).order_by("full_name"))
        emails = [user.email for user in users]

        completions_by_email = {}
        for completion in LabCompletion.objects.filter(username__in=emails):
            completions_by_email.setdefault(completion.username, []).append(completion)

        ranking = []
        rows = []
        for user in users:
            user_completions = completions_by_email.get(user.email, [])
            sessions_completed = len(user_completions)
            average_score = (
                round(sum(float(c.total_score) for c in user_completions) / sessions_completed, 2)
                if sessions_completed else 0
            )
            # Per-lab breakdown (e.g. "lab-a: 100%, lab-b: 92%") so a score
            # isn't just one blended number - you can see which lab it's from.
            by_lab = {}
            for c in user_completions:
                by_lab.setdefault(c.lab_name, []).append(float(c.total_score))
            lab_breakdown = [
                {"lab_name": lab_name, "average_score": round(sum(scores) / len(scores), 2)}
                for lab_name, scores in sorted(by_lab.items())
            ]

            if user.role == "trainee":
                ranking.append({"user_id": user.id, "average_score": average_score})

            rows.append({
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "organization": user.organization,
                "date_joined": user.date_joined,
                "sessions_completed": sessions_completed,
                "average_score": average_score,
                "lab_breakdown": lab_breakdown,
                "rank": None,
            })

        ranking.sort(key=lambda item: item["average_score"], reverse=True)
        rank_lookup = {item["user_id"]: index + 1 for index, item in enumerate(ranking)}
        for row in rows:
            row["rank"] = rank_lookup.get(row["id"])

        my_rank = rank_lookup.get(request.user.id)
        rows.sort(key=lambda row: row["average_score"], reverse=True)
        groups_count = len({row["organization"] for row in rows if row["organization"]})
        return Response(
            {
                "viewer_role": request.user.role,
                "organization": request.user.organization,
                "members": rows,
                "team_size": len(rows),
                "my_rank": my_rank,
                "trainee_count": len(ranking),
                "groups_count": groups_count,
            }
        )