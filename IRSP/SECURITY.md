# Security

## Broken Access Control (OWASP A01:2025)
- All API endpoints require authentication except registration and login.
- Answer-check endpoints return only a pass/fail verdict, never the correct value - covered by explicit tests.
- Team and Reports scope data by role: trainees see only their own group, managers see everyone.

## Security Misconfiguration (OWASP A02:2025)
- Real generated secret key, not a placeholder.
- CORS enforced through an explicit origin allowlist - no wildcard headers.
- Demo account seeding is gated behind an environment variable so it can be disabled for a real deployment.
- Score values are bounds-validated at the model level.

## Injection (OWASP A05:2025)
- No SQL is built from user input. Answers are checked as plain comparisons against values already held in memory, not queries built from what the trainee typed.
- Form inputs are read as values and never re-rendered as HTML.
- Every dynamic value written into the page is escaped before it reaches the DOM, and user input reaching a regex is escaped first.

## Authentication Failures (OWASP A07:2025)
- JWT-based auth with short-lived access tokens and longer-lived refresh tokens.
- Scores are saved via authenticated `fetch`, not `navigator.sendBeacon`, which can't carry an Authorization header.
- Login and registration are rate-limited.

## Unrestricted Resource Consumption (OWASP API Security Top 10, API4:2023)
- DRF throttling applies to every endpoint, with separate limits for anonymous and authenticated requests.
- Submitted field length is capped server-side; malformed input is rejected or safely ignored rather than erroring.

## Answer-checking

Fixed values - the kind that are the same for every trainee and every session - are checked server-side; the correct value is never sent to the client. A small number of values are generated fresh per session with no fixed server-side ground truth to check against; those are validated by format only (for example, confirming a submission looks like a timestamp, without knowing which exact timestamp is correct). A format check has no secret to protect, so this isn't a gap in the same sense - there's simply nothing fixed there to leak.

## Open items
- No TLS/HTTPS configured.
- No password reset flow.
- Final aggregate score is computed and submitted by the client.
- Stage/question sequencing is enforced client-side, by toggling visibility - a later stage can be revealed out of order through browser dev tools, independent of whether its answers are server-checked.
- No Subresource Integrity hash on the third-party icon library script.
