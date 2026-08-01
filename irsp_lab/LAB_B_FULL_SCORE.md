# Lab B - Endpoint Investigation: Getting Full Marks

**Instructor/answer-key content - don't share with trainees.**

30 minutes. Every correct answer lives only on the server and is checked there - nothing here is retrievable from the browser, including the timeline order and response-plan selections. The client gets a question/options list with the answer stripped, submits a choice, and gets back a bare `{"correct": true/false}` - nothing more.

## Scoring (100 max)

| Component | Formula | How to max it |
|---|---|---|
| Alert questions | `round(correct/10 × 30)` | Answer **all 10** alert questions correctly |
| Timeline accuracy | `round(correct_positions/8 × 25)` | Drag all **8** events into the exact real order |
| Response plan | `round(correct/6 × 35) − wrong×6`, clamped 0-35 | Select all **6** correct actions and **none** of the 4 wrong ones |
| Time remaining | `min(10, ceil(secondsRemaining/1800 × 10))` | Submit with time to spare |

Every point requires a genuinely correct answer, and wrong Response Plan picks actively subtract points rather than just not helping.

## Stage 1 - Investigate (must answer all 10 before Timeline unlocks)

Each alert has one multiple-choice question. Correct answers:

| Alert | Correct answer |
|---|---|
| PowerShell execution policy bypass | Used the `-ExecutionPolicy Bypass` flag directly |
| Suspicious scheduled task | Task name: `WindowsUpdate_svc` |
| UAC bypass via fodhelper | `fodhelper.exe` |
| Windows Defender tamper attempt | Real-time monitoring |
| PowerShell history / credential access | `procdump.exe`, targeting `lsass.exe` |
| Hidden local administrator account | Username: `hiddenuser` |
| WinRM lateral movement | WinRM |
| Staged payload download | `raw.githubusercontent.com` |
| Finance documents archived / C2 | Port `443` |
| Ransom note dropped | `notepad.exe` |

Distractor options are deliberately plausible (e.g. `eventvwr.exe` as a fodhelper distractor - both are real UAC-bypass techniques present elsewhere in the same log set), so getting these right requires actually reading the filtered telemetry, not pattern-matching on the question alone.

## Stage 2 - Timeline (unlocks after Stage 1, must check before Response Plan unlocks)

Drag the 8 events into this order (earliest first):

1. Phishing email delivered with a malicious invoice attachment
2. PowerShell launched, execution policy bypassed via the attachment's macro
3. Scheduled task `WindowsUpdate_svc` created for persistence
4. UAC bypassed via a fodhelper.exe registry hijack
5. Windows Defender real-time protection disabled
6. Hidden local administrator account `hiddenuser` created
7. Lateral movement to WS-FINANCE-03 over WinRM
8. Ransom note dropped and opened on the desktop

## Stage 3 - Response Plan (unlocks after Timeline, must submit before Submit Incident unlocks)

Correct (select all 6):
- Disable remote administration (WinRM) access
- Remove the malicious scheduled task
- Restore Windows Defender real-time protection
- Remove the unauthorized hidden user account
- Preserve PowerShell history and event logs as evidence
- Clean up remaining artifacts, registry hijacks, and firewall rules

Wrong (select none of these - each is wrong for a specific, evidence-based reason, not because it's an obviously bad idea):
- **Reset the domain administrator credentials** - the compromised account was local (`hiddenuser`), never domain.
- **Isolate WS-FINANCE-03 from the network** - that's the lateral-movement *target*; the actual origin is DESKTOP-GRQ4G1E.
- **Restore the endpoint from a pre-incident backup image** - premature; the logs already show targeted remediation underway, a full restore would destroy the evidence trail.
- **Force a password reset for every domain user account** - wrong scope; only one local account was ever involved.

## Notes

- All alert/log data is static (same for every trainee, every session).
- The filter bar accepts a small KQL-like syntax (`field has "value"`, `field = "value"`, `field in (...)`, `and`/`or`/`not`). Nothing is pre-filtered for the trainee; opening a case shows the full unfiltered log list.
- The 3 stages are strictly gated in order (shown as a stepper in the UI) - there is no way to reach Timeline without finishing Investigate, or Response Plan without finishing Timeline.
