const http = require('http');
const { URL } = require('url');
const { DATA_DIR, DEFAULT_LIMIT, HOST, MIME_TYPES, PORT, ROOT_DIR } = require('./config');
const { applyAction, buildSearchResponse, filterByScenario, sortByCursor, sortByTimestampDesc } = require('./domain');
const { readRequestBody, sendJson, sendText } = require('./http');
const { executeLabCommand, inspectContainerState, readContainerState, resetLab, startLab, stopLab } = require('./lab-scenario-a');
const { getDb } = require('./mongo');
const { serveStatic } = require('./static');
const { createState } = require('./state');

function readRawRequestBody(request) {
    return new Promise((resolve, reject) => {
        let rawBody = '';

        request.on('data', chunk => {
            rawBody += chunk;
        });

        request.on('end', () => {
            resolve(rawBody);
        });

        request.on('error', reject);
    });
}

function parseIncomingEvents(rawBody) {
    const trimmedBody = String(rawBody || '').trim();
    if (!trimmedBody) return [];

    try {
        const parsed = JSON.parse(trimmedBody);
        if (Array.isArray(parsed)) return parsed;
        return [parsed];
    } catch (error) {
        return trimmedBody
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => JSON.parse(line));
    }
}

function normalizeSeverity(level) {
    const normalized = String(level || '').trim().toLowerCase();
    if (!normalized) return 'info';
    if (['critical', 'high', 'medium', 'low', 'info'].includes(normalized)) {
        return normalized;
    }

    const numericLevel = Number(level);
    if (Number.isNaN(numericLevel)) return normalized;
    if (numericLevel >= 4) return 'critical';
    if (numericLevel === 3) return 'high';
    if (numericLevel === 2) return 'medium';
    return 'info';
}

function normalizeSourceType(channel, eventId, event) {
    if (channel === 'Microsoft-Windows-Sysmon/Operational') {
        if (Number(eventId) === 1) return 'sysmon:process';
        if (Number(eventId) === 3) return 'sysmon:network';
        if (Number(eventId) === 11) return 'sysmon:file';
        if (Number(eventId) === 22) return 'sysmon:dns';
        return 'sysmon:event';
    }

    if (channel === 'Microsoft-Windows-PowerShell/Operational') {
        return 'powershell:operational';
    }

    if (channel === 'Microsoft-Windows-TaskScheduler/Operational') {
        return 'windows:taskscheduler';
    }

    if (channel === 'Security') {
        return 'windows:security';
    }

    if (/task/i.test(event)) return 'windows:taskscheduler';
    return 'windows:event';
}

function pickTimestamp(event) {
    const timestamp = event.timestamp || event.TimeCreated || event.time || event.UtcTime || Date.now();
    const parsedTimestamp = new Date(timestamp);
    return Number.isNaN(parsedTimestamp.getTime()) ? new Date() : parsedTimestamp;
}

function normalizeEvent(event) {
    const channel = event.Channel || event.channel || event.SourceName || 'windows:event';
    const host = event.Computer || event.computer || event.host || 'unknown-host';
    const eventId = event.EventID || event.EventId || event.event_id || null;
    const rawEventData = event.EventData || event.event_data || {};
    const message = event.Message || event.message || rawEventData.Message || '';
    const processName = event.Image || event.ProcessName || rawEventData.Image || rawEventData.ProcessName || null;
    const parentProcess = event.ParentImage || rawEventData.ParentImage || null;
    const user = event.User || event.user || event.SubjectUserName || rawEventData.User || rawEventData.SubjectUserName || null;
    const queryName = event.QueryName || rawEventData.QueryName || null;
    const taskName = event.TaskName || rawEventData.TaskName || rawEventData.Task || null;
    const destIp = event.DestinationIp || event.dest_ip || rawEventData.DestinationIp || rawEventData.DestinationHostname || null;
    const destPort = event.DestinationPort || event.dest_port || rawEventData.DestinationPort || null;

    return {
        scenario_id: 'scenario-b',
        timestamp: pickTimestamp(event),
        host,
        sourcetype: normalizeSourceType(channel, eventId, String(message || '')),
        event_id: eventId,
        severity: normalizeSeverity(event.Level || event.level || event.LevelDisplayName),
        user,
        process_name: processName,
        parent_process: parentProcess,
        dest_ip: destIp,
        dest_port: destPort ? Number(destPort) || String(destPort) : null,
        query_name: queryName,
        task_name: taskName,
        event: typeof message === 'string' ? message : JSON.stringify(message),
        raw: event
    };
}

function pickLogTimestamp(item) {
    return item.timestamp || item.TimeCreated || item.time || item.UtcTime || item.created_at || item.raw?.timestamp || null;
}

function pickLogEvent(item) {
    const rawEventData = item.EventData || item.event_data || item.raw?.EventData || {};
    const message = item.event || item.Message || item.message || rawEventData.Message || '';
    return typeof message === 'string' ? message : JSON.stringify(message);
}

function extractXmlTag(xml, tagName) {
    const match = String(xml || '').match(new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i'));
    return match ? match[1] : null;
}

function extractXmlData(xml, fieldName) {
    const match = String(xml || '').match(new RegExp(`<Data\\s+Name=['"]${fieldName}['"]>([^<]*)</Data>`, 'i'));
    return match ? match[1] : null;
}

function extractMessageField(message, label) {
    const match = String(message || '').match(new RegExp(`${label}:\\s*([^\\r\\n]+)`, 'i'));
    return match ? match[1].trim() : null;
}

function presentValue(value) {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    if (!normalized || normalized === '-' || normalized.toLowerCase() === 'unknown-host') return null;
    return value;
}

function mapLogDocument(item, fallbackScenarioId = null) {
    const rawEventData = item.EventData || item.event_data || item.raw?.EventData || {};
    const rawSystemXml = item.System || item.raw?.System || '';
    const rawMessage = pickLogEvent(item);
    const timestamp = pickLogTimestamp(item);
    const channel = item.Channel || item.channel || item.SourceName || item.sourcetype || extractXmlTag(rawSystemXml, 'Channel');
    const eventId = item.event_id || item.EventID || item.EventId || extractXmlTag(rawSystemXml, 'EventID') || null;
    const host = presentValue(item.host) || presentValue(item.Computer) || presentValue(item.computer) || extractXmlTag(rawSystemXml, 'Computer') || 'unknown-host';
    const processName = presentValue(item.process_name)
        || presentValue(item.Image)
        || presentValue(item.ProcessName)
        || presentValue(rawEventData.Image)
        || presentValue(rawEventData.ProcessName)
        || extractXmlData(rawSystemXml, 'NewProcessName')
        || extractXmlData(rawSystemXml, 'Image')
        || extractMessageField(rawMessage, 'New Process Name')
        || extractMessageField(rawMessage, 'Image');
    const parentProcess = presentValue(item.parent_process)
        || presentValue(item.ParentImage)
        || presentValue(rawEventData.ParentImage)
        || extractXmlData(rawSystemXml, 'ParentProcessName')
        || extractXmlData(rawSystemXml, 'ParentImage')
        || extractMessageField(rawMessage, 'Creator Process Name')
        || extractMessageField(rawMessage, 'ParentImage');
    const user = presentValue(item.user)
        || presentValue(item.User)
        || presentValue(item.SubjectUserName)
        || presentValue(rawEventData.User)
        || presentValue(rawEventData.SubjectUserName)
        || extractXmlData(rawSystemXml, 'TargetUserName')
        || extractXmlData(rawSystemXml, 'SubjectUserName')
        || extractMessageField(rawMessage, 'Account Name');

    return {
        id: String(item._id),
        scenario_id: item.scenario_id || fallbackScenarioId,
        timestamp: timestamp instanceof Date ? timestamp.toISOString() : timestamp,
        host,
        sourcetype: item.sourcetype || normalizeSourceType(channel, eventId, rawMessage),
        severity: item.severity || normalizeSeverity(item.Level || item.level || item.LevelDisplayName),
        user,
        process_name: processName || null,
        parent_process: parentProcess || null,
        dest_ip: item.dest_ip || item.DestinationIp || rawEventData.DestinationIp || rawEventData.DestinationHostname || extractXmlData(rawSystemXml, 'DestinationIp') || null,
        dest_port: item.dest_port || item.DestinationPort || rawEventData.DestinationPort || extractXmlData(rawSystemXml, 'DestinationPort') || null,
        query_name: item.query_name || item.QueryName || rawEventData.QueryName || extractXmlData(rawSystemXml, 'QueryName') || null,
        task_name: item.task_name || item.TaskName || rawEventData.TaskName || rawEventData.Task || extractXmlData(rawSystemXml, 'TaskName') || null,
        event_id: eventId,
        event: rawMessage
    };
}

async function getStoredLogs({ scenarioId, limit } = {}) {
    const db = await getDb();
    const query = scenarioId === 'scenario-b'
        ? { $or: [{ scenario_id: scenarioId }, { scenario_id: { $exists: false } }, { scenario_id: null }] }
        : (scenarioId ? { scenario_id: scenarioId } : {});

    return db.collection('security_events')
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit || DEFAULT_LIMIT)
        .toArray();
}

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
            try {
                const logs = await getStoredLogs({ scenarioId, limit });
                const mappedLogs = logs.map(item => mapLogDocument(item, scenarioId));

                sendJson(response, 200, {
                    count: mappedLogs.length,
                    items: mappedLogs
                });
                return;
            } catch (error) {
                const logs = sortByTimestampDesc(filterByScenario(state.logs, scenarioId)).slice(0, limit);

                sendJson(response, 200, {
                    count: logs.length,
                    items: logs,
                    warning: 'Falling back to mock log data because MongoDB is unavailable'
                });
            }
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
            try {
                const logs = await getStoredLogs({ scenarioId, limit: 500 });
                sendJson(response, 200, buildSearchResponse(logs.map(item => mapLogDocument(item, scenarioId)), query, scenarioId));
            } catch (error) {
                sendJson(response, 200, buildSearchResponse(state.logs, query, scenarioId));
            }
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

        if (requestUrl.pathname === '/api/ingest/logs' && request.method === 'GET') {
            sendJson(response, 200, {
                status: 'ready',
                endpoint: '/api/ingest/logs',
                method: 'POST',
                message: 'Send Windows event log payloads here from Fluent Bit using HTTP POST.'
            });
            return;
        }

        if (requestUrl.pathname === '/api/ingest/logs' && request.method === 'POST') {
            try {
                const rawBody = await readRawRequestBody(request);
                const events = parseIncomingEvents(rawBody);
                const normalizedEvents = events.map(normalizeEvent);

                if (normalizedEvents.length) {
                    const db = await getDb();
                    await db.collection('security_events').insertMany(normalizedEvents, { ordered: false });
                }

                sendJson(response, 200, {
                    inserted: normalizedEvents.length
                });
            } catch (error) {
                sendJson(response, 500, {
                    error: error.message || 'Unable to ingest logs'
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
