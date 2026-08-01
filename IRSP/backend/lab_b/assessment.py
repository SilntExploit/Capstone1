# Lab B assessment content: per-alert questions, timeline order, and
# response-plan options. Correct answers are never sent to the client - GET
# endpoints strip them; only the check endpoints compare server-side.

ALERT_QUESTIONS = {
    "powershell-execution-policy": {
        "question": "How did the attacker's PowerShell session get past the endpoint's execution policy restrictions?",
        "options": [
            {"id": "a", "text": "It ran as a scheduled task with SYSTEM privileges"},
            {"id": "b", "text": "It used the -ExecutionPolicy Bypass flag directly"},
            {"id": "c", "text": "It disabled Windows Defender first, then ran normally"},
            {"id": "d", "text": "It used a code-signed certificate to appear trusted"},
        ],
        "correct": "b",
    },
    "scheduled-task-persistence": {
        "question": "What is the name of the scheduled task the attacker registered for persistence?",
        "options": [
            {"id": "a", "text": "SysMaintenance"},
            {"id": "b", "text": "svc_updater"},
            {"id": "c", "text": "WindowsUpdate_svc"},
            {"id": "d", "text": "BackupService"},
        ],
        "correct": "c",
    },
    "fodhelper-uac-bypass": {
        "question": "Which built-in Windows executable did the attacker abuse to bypass UAC?",
        "options": [
            {"id": "a", "text": "eventvwr.exe"},
            {"id": "b", "text": "fodhelper.exe"},
            {"id": "c", "text": "mmc.exe"},
            {"id": "d", "text": "taskmgr.exe"},
        ],
        "correct": "b",
    },
    "defender-tamper-attempt": {
        "question": "Which Windows Defender protection did the attacker specifically disable?",
        "options": [
            {"id": "a", "text": "Firewall"},
            {"id": "b", "text": "Real-time monitoring"},
            {"id": "c", "text": "Automatic updates"},
            {"id": "d", "text": "BitLocker encryption"},
        ],
        "correct": "b",
    },
    "credential-history-access": {
        "question": "Beyond reviewing PowerShell history, what tool did the attacker run to attempt credential theft?",
        "options": [
            {"id": "a", "text": "mimikatz.exe"},
            {"id": "b", "text": "procdump.exe, targeting lsass.exe"},
            {"id": "c", "text": "net.exe"},
            {"id": "d", "text": "reg.exe"},
        ],
        "correct": "b",
    },
    "hidden-user-created": {
        "question": "What username did the attacker give the hidden local administrator account?",
        "options": [
            {"id": "a", "text": "admin_backup"},
            {"id": "b", "text": "svc_updater"},
            {"id": "c", "text": "hiddenuser"},
            {"id": "d", "text": "guest2"},
        ],
        "correct": "c",
    },
    "remote-winrm-lateral": {
        "question": "Which protocol did the attacker use to move laterally to WS-FINANCE-03?",
        "options": [
            {"id": "a", "text": "RDP"},
            {"id": "b", "text": "SSH"},
            {"id": "c", "text": "WinRM"},
            {"id": "d", "text": "SMB"},
        ],
        "correct": "c",
    },
    "staged-payload-download": {
        "question": "Where did the attacker's PowerShell session download the staged payload from?",
        "options": [
            {"id": "a", "text": "An internal file server"},
            {"id": "b", "text": "raw.githubusercontent.com"},
            {"id": "c", "text": "A USB drive"},
            {"id": "d", "text": "An email attachment"},
        ],
        "correct": "b",
    },
    "collection-staging": {
        "question": "What port did the attacker's C2 beacon use after archiving the finance documents?",
        "options": [
            {"id": "a", "text": "22"},
            {"id": "b", "text": "80"},
            {"id": "c", "text": "443"},
            {"id": "d", "text": "3389"},
        ],
        "correct": "c",
    },
    "ransom-note-dropped": {
        "question": "What application did the attacker use to open the ransom note?",
        "options": [
            {"id": "a", "text": "Microsoft Word"},
            {"id": "b", "text": "notepad.exe"},
            {"id": "c", "text": "A web browser"},
            {"id": "d", "text": "Adobe Reader"},
        ],
        "correct": "b",
    },
}

# 8 key events, shuffled for the trainee to reorder. "order" is the ground
# truth and is stripped before the list reaches the client.
TIMELINE_EVENTS = [
    {"id": "t1", "order": 1, "summary": "Phishing email delivered with a malicious invoice attachment"},
    {"id": "t2", "order": 2, "summary": "PowerShell launched with execution policy bypassed via the attachment's macro"},
    {"id": "t3", "order": 3, "summary": "Scheduled task \"WindowsUpdate_svc\" created for persistence"},
    {"id": "t4", "order": 4, "summary": "UAC bypassed via a fodhelper.exe registry hijack"},
    {"id": "t5", "order": 5, "summary": "Windows Defender real-time protection disabled"},
    {"id": "t6", "order": 6, "summary": "Hidden local administrator account \"hiddenuser\" created"},
    {"id": "t7", "order": 7, "summary": "Lateral movement to WS-FINANCE-03 over WinRM"},
    {"id": "t8", "order": 8, "summary": "Ransom note dropped and opened on the desktop"},
]

# 6 correct actions + 4 wrong ones. Each wrong choice sounds reasonable in
# general - it's only wrong given the specific facts in this incident.
RESPONSE_OPTIONS = [
    {"id": "restrict-remote-admin", "label": "Disable remote administration (WinRM) access", "correct": True},
    {"id": "remove-persistence", "label": "Remove the malicious scheduled task", "correct": True},
    {"id": "restore-protection", "label": "Restore Windows Defender real-time protection", "correct": True},
    {"id": "rotate-credentials", "label": "Remove the unauthorized hidden user account", "correct": True},
    {"id": "collect-evidence", "label": "Preserve PowerShell history and event logs as evidence", "correct": True},
    {"id": "validate-clean-state", "label": "Clean up remaining artifacts, registry hijacks, and firewall rules", "correct": True},
    {"id": "reset-domain-admin", "label": "Reset the domain administrator credentials", "correct": False},
    {"id": "isolate-finance-host", "label": "Isolate WS-FINANCE-03 from the network", "correct": False},
    {"id": "restore-from-backup", "label": "Restore the endpoint from a pre-incident backup image", "correct": False},
    {"id": "reset-all-domain-users", "label": "Force a password reset for every domain user account", "correct": False},
]


def public_alert_question(alert_key):
    """Question + options only - never the correct answer."""
    entry = ALERT_QUESTIONS.get(alert_key)
    if not entry:
        return None
    return {"question": entry["question"], "options": entry["options"]}


def check_alert_answer(alert_key, choice_id):
    entry = ALERT_QUESTIONS.get(alert_key)
    if not entry:
        return None
    return entry["correct"] == choice_id


def public_timeline_events():
    """id + summary only - never the true order."""
    return [{"id": e["id"], "summary": e["summary"]} for e in TIMELINE_EVENTS]


def check_timeline_order(ordered_ids):
    true_order = {e["id"]: e["order"] for e in TIMELINE_EVENTS}
    correct_positions = 0
    for position, event_id in enumerate(ordered_ids, start=1):
        if true_order.get(event_id) == position:
            correct_positions += 1
    return correct_positions, len(TIMELINE_EVENTS)


def public_response_options():
    """id + label only - never which ones are correct."""
    return [{"id": o["id"], "label": o["label"]} for o in RESPONSE_OPTIONS]


def check_response_selection(selected_ids):
    correct_ids = {o["id"] for o in RESPONSE_OPTIONS if o["correct"]}
    selected = set(selected_ids)
    correct_selected = len(selected & correct_ids)
    wrong_selected = len(selected - correct_ids)
    missed = len(correct_ids - selected)
    return {
        "correct_selected": correct_selected,
        "wrong_selected": wrong_selected,
        "missed": missed,
        "total_correct": len(correct_ids),
    }
