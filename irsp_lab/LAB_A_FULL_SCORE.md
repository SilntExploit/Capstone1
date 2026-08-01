# Lab A - Ransomware Containment: Getting Full Marks

**Instructor/answer-key content - don't share with trainees.**

45 minutes, 13 questions across 3 stages, plus one decision point. Most answers are checked server-side; the correct values below are not present in the browser. Q4 and Q5 are planted fresh per session, so they're validated by format rather than an exact value.

## Scoring (100 max)

| Component | Points |
|---|---|
| Q1-Q12 | 5 pts each = 60, awarded on first **correct** submission |
| Q13 (Incident Report, 6 fields) | 2.5 pts each = 15 |
| Decision-point bonus | +5 |
| First-attempt accuracy bonus | +20 (**only** if every one of Q1-13 was answered correctly on the first try) |
| Wrong-attempt penalty | -2 per wrong attempt, everywhere, permanent |

To hit exactly 100: every question right on the first try (75 + 20 = 95), plus the decision point (+5). Any wrong attempt, on any question, costs 2 points and permanently forfeits the +20 bonus.

## Stage 1 - Evidence (Q1-5)

- **Q1 - Active network connection:** `203.0.113.47:4444`. "Peer Address" column in `network_snapshot.txt`.
- **Q2 - How the attacker got in:** `7` failed logins from one IP, then the accepted one. Count `Failed password` lines, confirm with `Accepted password`.
- **Q3 - Ransom note (3 fields):** email `decrypt@evil.onion`, wallet `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`, amount `0.5 Bitcoin`. All in `RANSOM_NOTE.html`.
- **Q4 - Attack timeline:** planted per session. `grep 'sysupdate' /var/log/syslog | head -3`, copy the first timestamp exactly.
- **Q5 - Scope of damage:** planted per session. `find /home/irspuser -name "*.locked" | wc -l`.
- **Decision point** (after Stage 1): recommend **not paying**, with a reason (backup / restore / evidence / law / sanctions / no guarantee / decrypt). Needs both a "don't pay" phrase and a reason keyword.

## Stage 2 - Containment (Q6-9)

- **Q6 - Stop the malicious process:** kill it, `pgrep` returns nothing → `PROCESS STOPPED`.
- **Q7 - Block the attacker's C2:** both `iptables` block commands, then verify - answer is the verification line containing `203.0.113.47`.
- **Q8 - Find all persistence:** must name all three - `crontab`, `bashrc`, `authorized_keys` (or `ssh`).
- **Q9 - Remove all persistence:** after removal, `crontab -l 2>&1` should say `no crontab for`.

## Stage 3 - Recovery & Reporting (Q10-13)

- **Q10 - Backup integrity:** compare the backup's `stat` Modify timestamp to the Q4 syslog timestamp - backup predates the attack, answer `BEFORE`.
- **Q11 - Restore the file:** `/home/irspuser/Documents/report.txt` (case-sensitive, capital `D`).
- **Q12 - Lock the account:** `sudo passwd -l irspuser`, then `sudo passwd -S irspuser` should show `L`.
- **Q13 - Incident report (6 fields, 2.5 pts each):** each references an earlier finding - (1) a timestamp, (2) contains `203.0.113.47`, (3) a number, (4) contains `decrypt@evil.onion`, (5) mentions crontab/bashrc/authorized_keys/ssh, (6) mentions not paying + a reason.

## Notes

- Q4 and Q5 are planted fresh per session; everything else is fixed - checks are pattern-based, not exact-string, so read them from the live environment rather than memorizing a number.
- The in-lab hint ("?" on each question) is drawn from this same logic.
- Stage sequencing (Evidence -> Containment -> Recovery) is enforced client-side only - a later stage's container can be revealed out of order through browser dev tools.
