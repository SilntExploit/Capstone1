const http = require('http');
const { URL } = require('url');
const { DATA_DIR, DEFAULT_LIMIT, HOST, MIME_TYPES, PORT, ROOT_DIR } = require('./config');
const { applyAction, buildSearchResponse, filterByScenario, sortByCursor, sortByTimestampDesc } = require('./domain');
const { readRequestBody, sendJson, sendText } = require('./http');
const { executeLabCommand, inspectContainerState, readContainerState, resetLab, startLab, stopLab } = require('./lab-scenario-a');
const { serveStatic } = require('./static');
const { createState } = require('./state');

function createApp() {
    const state = createState(DATA_DIR);

    async function handleApi(request, requestUrl, response) {
        const scenarioId = requestUrl.searchParams.get('scenario');
        const limit = Math.max(1, Math.min(Number(requestUrl.searchParams.get('limit')) || DEFAULT_LIMIT, 100));

        if (requestUrl.pathname === '/api/health') {
            sendJson(response, 200, {
                status: 'ok',
                service: 'responsegrid-mock-backend',
                generated_at: state.generated_at,
                port: PORT
            });
            return;
        }

        if (requestUrl.pathname === '/api/scenarios') {
            const scenarios = scenarioId
                ? state.scenarios.filter(item => item.id === scenarioId)
                : state.scenarios;

            sendJson(response, 200, {
                count: scenarios.length,
                items: scenarios
            });
            return;
        }

        if (requestUrl.pathname === '/api/alerts') {
            const alerts = sortByTimestampDesc(filterByScenario(state.alerts, scenarioId)).slice(0, limit);

            sendJson(response, 200, {
                count: alerts.length,
                items: alerts
            });
            return;
        }

        if (requestUrl.pathname === '/api/logs') {
            const logs = sortByTimestampDesc(filterByScenario(state.logs, scenarioId)).slice(0, limit);

            sendJson(response, 200, {
                count: logs.length,
                items: logs
            });
            return;
        }

        if (requestUrl.pathname === '/api/runs') {
            const runs = sortByTimestampDesc(filterByScenario(state.runs, scenarioId)).slice(0, limit);

            sendJson(response, 200, {
                count: runs.length,
                items: runs
            });
            return;
        }

        if (requestUrl.pathname === '/api/search') {
            const query = requestUrl.searchParams.get('q') || '';
            sendJson(response, 200, buildSearchResponse(state.logs, query, scenarioId));
            return;
        }

        if (requestUrl.pathname === '/api/evidence') {
            const evidence = sortByTimestampDesc(filterByScenario(state.evidence, scenarioId).map(item => {
                return Object.assign({ timestamp: item.collected_at }, item);
            })).slice(0, limit).map(item => {
                const next = Object.assign({}, item);
                delete next.timestamp;
                return next;
            });

            sendJson(response, 200, {
                count: evidence.length,
                items: evidence
            });
            return;
        }

        if (requestUrl.pathname === '/api/live') {
            const cursor = Math.max(0, Number(requestUrl.searchParams.get('cursor')) || 0);
            const items = sortByCursor(filterByScenario(state.playback, scenarioId))
                .filter(item => Number(item.cursor || 0) > cursor)
                .slice(0, limit);

            const nextCursor = items.length ? Number(items[items.length - 1].cursor || cursor) : cursor;

            sendJson(response, 200, {
                scenario_id: scenarioId || null,
                cursor,
                next_cursor: nextCursor,
                count: items.length,
                items
            });
            return;
        }

        if (requestUrl.pathname === '/api/actions' && request.method === 'POST') {
            try {
                const body = await readRequestBody(request);
                const result = applyAction(state, body);
                sendJson(response, result.statusCode, result.payload);
            } catch (error) {
                sendJson(response, 400, {
                    error: 'Invalid JSON payload'
                });
            }
            return;
        }

        if (requestUrl.pathname === '/api/labs/scenario-a/state' && request.method === 'GET') {
            try {
                sendJson(response, 200, await inspectContainerState());
            } catch (error) {
                sendJson(response, 500, {
                    error: error.message || 'Unable to read Scenario A lab state'
                });
            }
            return;
        }

        if (requestUrl.pathname === '/api/labs/scenario-a/start' && request.method === 'POST') {
            try {
                sendJson(response, 200, await startLab());
            } catch (error) {
                sendJson(response, 500, {
                    error: error.message || 'Unable to start Scenario A lab'
                });
            }
            return;
        }

        if (requestUrl.pathname === '/api/labs/scenario-a/stop' && request.method === 'POST') {
            try {
                sendJson(response, 200, await stopLab());
            } catch (error) {
                sendJson(response, 500, {
                    error: error.message || 'Unable to stop Scenario A lab'
                });
            }
            return;
        }

        if (requestUrl.pathname === '/api/labs/scenario-a/reset' && request.method === 'POST') {
            try {
                sendJson(response, 200, await resetLab());
            } catch (error) {
                sendJson(response, 500, {
                    error: error.message || 'Unable to reset Scenario A lab'
                });
            }
            return;
        }

        if (requestUrl.pathname === '/api/labs/scenario-a/exec' && request.method === 'POST') {
            try {
                const body = await readRequestBody(request);
                const result = await executeLabCommand(body.command);
                sendJson(response, result.statusCode, result.payload);
            } catch (error) {
                sendJson(response, 500, {
                    error: error.message || 'Unable to execute Scenario A lab command'
                });
            }
            return;
        }

        sendJson(response, 404, {
            error: 'Endpoint not found'
        });
    }

    const server = http.createServer((request, response) => {
        const requestUrl = new URL(request.url, `http://${request.headers.host || `localhost:${PORT}`}`);

        if (requestUrl.pathname.startsWith('/api/')) {
            handleApi(request, requestUrl, response);
            return;
        }

        serveStatic(ROOT_DIR, MIME_TYPES, requestUrl.pathname, response, sendText);
    });

    return {
        server,
        state
    };
}

function startServer() {
    const { server } = createApp();

    server.listen(PORT, HOST, () => {
        console.log(`ResponseGrid MVP server running on http://${HOST}:${PORT}`);
    });

    return server;
}

module.exports = {
    createApp,
    startServer
};
