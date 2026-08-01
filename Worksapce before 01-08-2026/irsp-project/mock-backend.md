# ResponseGrid Mock Backend

This MVP now includes a lightweight mock backend so the product can be demoed with seeded incident-response data instead of only static UI text.

## Run

```bash
node server.js
```

Then open:

```text
http://localhost:3000
```

## API Endpoints

- `GET /api/health`
- `GET /api/scenarios`
- `GET /api/alerts?scenario=scenario-a`
- `GET /api/logs?scenario=scenario-a&limit=10`
- `GET /api/runs`
- `GET /api/search?scenario=scenario-b&q=procdump`
- `GET /api/evidence?scenario=scenario-a`
- `GET /api/live?scenario=scenario-a&cursor=0&limit=2`
- `POST /api/actions`

## Seed Data

The seeded data lives in:

- `/mock-data/scenarios.json`
- `/mock-data/alerts.json`
- `/mock-data/logs.json`
- `/mock-data/runs.json`
- `/mock-data/evidence.json`
- `/mock-data/playback.json`

The logs are structured to feel like an actual incident-response MVP:

- scenario-specific event streams
- realistic hosts, users, IPs, and MITRE technique IDs
- alert and run records that match the UI narrative
- simple search filtering for demo queries
