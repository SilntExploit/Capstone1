# IRSP - Incident Response Simulation Platform

A browser-based incident response training platform: login, dashboard, two hands-on labs, a team leaderboard, and PDF reporting.

## Run

```bash
docker compose down -v --remove-orphans
docker compose up --build
```

Open **http://localhost:8080**.

Generic demo accounts (on by default - see `.env.docker`):

```text
trainee@irsp.local / trainee123   - Lab A: 72/100, Lab B: 65/100
manager@irsp.local / manager123
```

Named accounts, all grouped into "Team 22":

```text
eapen@irsp.com  / eapen@123   - Lab A: 100/100
raghav@irsp.com / raghav@123  - no lab activity yet
sher@irsp.com   / sher@123    - Lab B: 100/100
yuvraj@irsp.com / yuvraj@123  - Lab B: 100/100
```

All accounts and seeded scores come from `backend/lab_scores/management/commands/seed_demo_scores.py`, which runs automatically on boot (idempotent - safe to restart without wiping real progress).

## What's here

| Path | What it is |
|---|---|
| `frontend/` | Static site: login, dashboard, labs list, team/reports/settings pages |
| `frontend/lab/` | Lab A kiosk (browser VM, Guacamole) |
| `frontend/lab-b/` | Lab B kiosk (endpoint investigation console) |
| `backend/` | Django REST API: auth, scenarios, scoring, MITRE, lab scores, and each lab's answer-check and telemetry endpoints |
| `nginx/` | Reverse proxy serving the frontend and proxying `/api/` to the backend |

Two Postgres databases: the main app DB and a separate `lab_scores` DB (see `backend/config/routers.py`).

## Lab A - Ransomware Containment (45 min)

- A real Linux VM, connected via Guacamole.
- 13 questions across 3 stages: evidence gathering, containment, recovery/reporting.
- 11 of 13 answers are checked server-side (`backend/lab_a/`). Two (timestamp, file count) are planted fresh per session with no server-side ground truth, so they're checked client-side by format.
- See `LAB_A_FULL_SCORE.md` for the answer key, `SECURITY.md` for what's covered.

## Lab B - Endpoint Investigation (30 min)

- Browser-native console, no VM.
- Three strictly gated stages, shown as a stepper - no skipping ahead:
  1. **Investigate** - work all 10 alerts, answer a question about each from the real telemetry (nothing pre-filtered).
  2. **Timeline** - drag 8 events into the order the attack happened.
  3. **Response Plan** - pick the right containment actions from a list that includes plausible wrong ones.
- Every answer is checked **server-side only** - the client never receives which choice is correct, just a verdict.
- See `LAB_B_FULL_SCORE.md` for the answer key.

## Team & Reports

- **Team** groups trainees by the `organization` field (e.g. "Team 22"). Managers see every group; trainees see their own.
- **Reports** shows session history for every account and lets any trainee download a personal PDF, or a manager download a team-wide PDF - both formatted documents (branded header, score badges, tables) via `jsPDF`.
- **Settings** exposes profile fields (read-only) and a light/dark theme toggle.
- All three pull from each account's `LabCompletion` history.

## Configuration

All settings live in `.env.docker`. Before deploying beyond your own machine:

- `DJANGO_SECRET_KEY` - already a real generated value; rotate with `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
- `SEED_DEMO_USERS` - set to `false` for a real deployment.
- `ACCESS_TOKEN_MINUTES` / `REFRESH_TOKEN_DAYS` - JWT lifetimes (Lab B's 30-minute timer matches the default access token life).
- `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` - origin allowlist. No TLS configured - put this behind HTTPS for anything beyond localhost.
- `THROTTLE_RATE_ANON` / `THROTTLE_RATE_USER` - API rate limits.

## Docs

- **`LAB_A_FULL_SCORE.md`** - instructor answer key for Lab A.
- **`LAB_B_FULL_SCORE.md`** - instructor answer key for Lab B.
- **`SECURITY.md`** - how common vulnerability classes are handled, and what's still open.

## Testing

```bash
cd backend
DJANGO_SETTINGS_MODULE=config.test_settings python manage.py test
```

Runs against local SQLite. Covers both labs' answer-check endpoints (including explicit tests that a correct answer is never present in a response), Lab B's query DSL, and the seed commands.

## Known limitations

- Stage sequencing in Lab A is enforced client-side only, by toggling a CSS class - a later stage can be revealed out of order via browser dev tools.
- Lab A's Q4/Q5 and the final aggregate score for both labs are computed and submitted by the client.
- Lab A connects to a single, fixed external VM (same machine for every session, not provisioned per trainee) - see `SECURITY.md`.
- Lab B's alerts/telemetry are static - same data every session, no per-trainee randomization.
- No password reset flow.
