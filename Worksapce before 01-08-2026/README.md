# ResponseGrid - Capstone 1

ResponseGrid is an incident response simulation prototype with a multi-page frontend and a lightweight Node mock backend for our capstone project.

## Run

```bash
node server.js
```

Open `http://127.0.0.1:3000`.

## Structure

- `index.html`, `dashboard.html`, `active-lab.html`, `scenario-a.html`, `scenario-b.html`, `reports.html`, `settings.html`, `team.html`, `mitre.html`: product pages
- `css/shared.css`: shared design system and shell styling
- `js/shared.js`: shared UI runtime
- `js/pages/`: page-specific frontend logic
- `js/services/api-client.js`: frontend API wrapper
- `server/`: mock backend modules
- `mock-data/`: seeded alerts, logs, scenarios, runs, evidence, and playback data

## Prototype Scope

- realistic IR simulation workflows
- seeded telemetry, alerts, evidence, and playback
- lightweight KQL-like search for demo use
- no production auth, persistence, or real data pipeline yet

## Notes

- This is an prototype, not a production SOC platform.
- The backend is intentionally simple and uses in-memory state seeded from `mock-data/`.

# Coding Conventions

Keep changes small, readable, and consistent with the current prototype.

## General

- Prefer simple HTML, CSS, and vanilla JavaScript.
- Reuse shared styles in `css/shared.css` before adding page-local styling.
- Reuse shared behavior in `js/shared.js` before adding new page logic.
- Put page-specific logic in `js/pages/`, not inline scripts.
- Put backend routing/state/query logic in `server/`, not `server.js`.

## Frontend

- Use clear IDs and data attributes for interactive elements.
- Keep product copy concise and enterprise-oriented.
- Preserve the ResponseGrid visual language and shell structure.
- Prefer progressive enhancement over complex abstractions.

## Backend

- Keep the mock API deterministic and easy to demo.
- Add new seeded data in `mock-data/` when extending scenarios.
- Keep query logic explicit and testable in `server/domain.js`.
- Avoid introducing framework dependencies unless there is a strong reason.

## Style

- Use descriptive names.
- Favor short functions with one responsibility.
- Avoid dead code and duplicated logic.
- Validate edited JS with `node --check`.
