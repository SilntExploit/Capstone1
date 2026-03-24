(function () {
    'use strict';

    const scenarioId = 'scenario-a';
    const alertsBody = document.getElementById('dashboard-alerts-body');
    const alertsMetric = document.getElementById('dashboard-metric-alerts');
    const alertsMetricNote = document.getElementById('dashboard-metric-alerts-note');
    const eventsMetric = document.getElementById('dashboard-metric-events');
    const eventsMetricNote = document.getElementById('dashboard-metric-events-note');
    const progressMetric = document.getElementById('dashboard-metric-progress');
    const progressMetricNote = document.getElementById('dashboard-metric-progress-note');
    const analystsMetric = document.getElementById('dashboard-metric-analysts');
    const analystsMetricNote = document.getElementById('dashboard-metric-analysts-note');
    const connectionStatus = document.getElementById('dashboard-connection-status');
    const evidenceLocker = document.getElementById('dashboard-evidence-locker');
    const evidenceCount = document.getElementById('dashboard-evidence-count');
    const liveFeed = document.getElementById('live-activity-feed');
    const liveStatus = document.getElementById('dashboard-live-status');

    let liveCursor = 0;
    const seenPlaybackIds = new Set();

    function severityMeta(value) {
        const normalized = String(value || '').toLowerCase();

        if (normalized === 'critical') {
            return { badgeClass: 'red', rowClass: 'critical', label: 'Critical', score: 91 };
        }

        if (normalized === 'high') {
            return { badgeClass: 'yellow', rowClass: 'high', label: 'High', score: 82 };
        }

        return { badgeClass: 'blue', rowClass: 'medium', label: 'Medium', score: 72 };
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString();
    }

    function formatClock(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;

        return date.toISOString().split('T')[1].replace('Z', '');
    }

    function mapLogToRecord(log) {
        const event = String(log.event || '').toLowerCase();
        const sourcetype = String(log.sourcetype || '').toLowerCase();
        let recordId = log.id;

        if (event.includes('chmod +x') || event.includes('/tmp/.encrypt.sh')) {
            recordId = 'evt-encrypt';
        } else if (event.includes('rename burst')) {
            recordId = 'evt-rename';
        } else if (sourcetype.includes('okta')) {
            recordId = 'evt-okta';
        } else if (event.includes('203.0.113.42') || String(log.dest_ip || '').includes('203.0.113.42')) {
            recordId = 'evt-c2';
        } else if (sourcetype.includes('sysmon:process') || event.includes('svc-backup') || event.includes('sshd')) {
            recordId = 'evt-ssh';
        } else if (sourcetype.includes('o365')) {
            recordId = 'evt-mail';
        } else if (sourcetype.includes('falco')) {
            recordId = 'evt-falco';
        }

        const severity = severityMeta(log.severity);

        return Object.assign({}, log, {
            record_id: recordId,
            risk_score: severity.score
        });
    }

    function hydrateAlertQueue(items) {
        if (!alertsBody || !Array.isArray(items)) return;

        const rows = Array.from(alertsBody.querySelectorAll('tr'));

        items.forEach(function (item, index) {
            const row = rows[index];
            if (!row) return;

            const meta = severityMeta(item.severity);
            row.className = `queue-row ${meta.rowClass}`;
            row.dataset.serverAlertId = item.id || '';
            if (item.alert_key) {
                row.dataset.alertId = item.alert_key;
            }

            row.cells[0].innerHTML = `<span class="status-badge ${meta.badgeClass}">${meta.label}</span>`;
            row.cells[1].textContent = item.title || 'Untitled alert';
            row.cells[2].textContent = item.user ? `${item.host} / ${item.user}` : (item.host || '--');
            row.cells[2].className = 'mono';
            row.cells[3].textContent = item.technique_id || '--';
        });

        const criticalCount = items.filter(item => item.severity === 'critical').length;
        const highCount = items.filter(item => item.severity === 'high').length;
        alertsMetric.textContent = String(items.length).padStart(2, '0');
        alertsMetricNote.textContent = `${criticalCount} critical • ${highCount} high from mock backend`;
    }

    function renderEvidence(items) {
        if (!evidenceLocker || !Array.isArray(items)) return;

        evidenceLocker.innerHTML = items.slice(0, 5).map(function (item) {
            return `
                <li>
                    <span class="stamp">${formatClock(item.collected_at)}</span>
                    ${item.title} ${item.source ? `from ${item.source}.` : ''}
                </li>
            `;
        }).join('');

        evidenceCount.textContent = `${items.length} artifact${items.length === 1 ? '' : 's'} collected`;
    }

    async function refreshEvidence() {
        if (!window.IRSPApi || !window.IRSPApi.isAvailable()) return;

        try {
            const payload = await window.IRSPApi.getEvidence({ scenario: scenarioId, limit: 5 });
            renderEvidence(payload.items || []);
        } catch (error) {
            evidenceCount.textContent = 'Evidence feed offline';
        }
    }

    function prependLiveFeedItem(item) {
        if (!liveFeed || !item || seenPlaybackIds.has(item.id)) return;

        seenPlaybackIds.add(item.id);

        const entry = document.createElement('li');
        entry.innerHTML = `
            <span class="stamp">${formatClock(item.timestamp)}</span>
            ${item.message}
        `;
        liveFeed.prepend(entry);

        while (liveFeed.children.length > 6) {
            liveFeed.removeChild(liveFeed.lastElementChild);
        }
    }

    function appendTimelinePlayback(item) {
        const timeline = document.getElementById('incident-timeline');
        if (!timeline || !item) return;

        const entry = document.createElement('div');
        entry.className = 'timeline-item';
        entry.innerHTML = `
            <span class="time">${formatClock(item.timestamp)}</span>
            <p class="desc">${item.message}</p>
        `;
        timeline.appendChild(entry);
    }

    function appendChatPlayback(item) {
        const comms = document.getElementById('team-comms');
        if (!comms || !item) return;

        const entry = document.createElement('div');
        entry.className = 'msg';
        entry.innerHTML = `<span class="msg-sender">${item.source || 'System'}:</span> ${item.message}`;
        comms.appendChild(entry);
        comms.scrollTop = comms.scrollHeight;
    }

    async function pollLivePlayback() {
        if (!window.IRSPApi || !window.IRSPApi.isAvailable()) return;

        try {
            const payload = await window.IRSPApi.getLive({
                scenario: scenarioId,
                cursor: liveCursor,
                limit: 2
            });
            const items = payload.items || [];

            items.forEach(function (item) {
                prependLiveFeedItem(item);

                if (item.type === 'timeline') {
                    appendTimelinePlayback(item);
                }

                if (item.type === 'chat') {
                    appendChatPlayback(item);
                }
            });

            if (items.length) {
                liveCursor = payload.next_cursor || liveCursor;
                liveStatus.textContent = `${items.length} new live update${items.length === 1 ? '' : 's'} received at ${IRSP.getTimestamp()}`;
            } else {
                liveStatus.textContent = `Listening for playback at ${IRSP.getTimestamp()}`;
            }

            if (items.some(item => item.type === 'evidence')) {
                refreshEvidence();
            }
        } catch (error) {
            liveStatus.textContent = 'Playback feed unavailable';
        }
    }

    async function hydrateDashboard() {
        if (!window.IRSPApi || !window.IRSPApi.isAvailable()) {
            return;
        }

        try {
            const [alertsPayload, searchPayload, evidencePayload] = await Promise.all([
                window.IRSPApi.getAlerts({ scenario: scenarioId, limit: 5 }),
                window.IRSPApi.search({ scenario: scenarioId, q: '' }),
                window.IRSPApi.getEvidence({ scenario: scenarioId, limit: 5 })
            ]);

            const alerts = Array.isArray(alertsPayload.items) ? alertsPayload.items : [];
            const searchResults = Array.isArray(searchPayload.results) ? searchPayload.results : [];

            hydrateAlertQueue(alerts);
            renderEvidence(evidencePayload.items || []);
            eventsMetric.textContent = formatNumber(searchPayload.total_matches || searchResults.length);
            eventsMetricNote.textContent = `Seeded backend events for ${scenarioId} are now active`;
            progressMetric.textContent = '40%';
            progressMetricNote.textContent = `Live mock API synced at ${IRSP.getTimestamp()}`;
            analystsMetric.textContent = '04';
            analystsMetricNote.textContent = `4 analysts mapped to ${scenarioId}`;
            connectionStatus.textContent = 'Mock API connected • live data mode';
        } catch (error) {
            connectionStatus.textContent = 'Mock API offline • using embedded seed data';
        }
    }

    startTimer('timer', 1455, { storageKey: 'irsp-dashboard-timer' });

    hydrateDashboard().finally(function () {
        initDashboard({
            timelineId: 'incident-timeline',
            commsId: 'team-comms',
            inputId: 'team-message-input',
            progressFillId: 'progress-fill',
            progressTextId: 'progress-text',
            searchResultsBodyId: 'dashboard-results-body',
            storageKey: 'irsp-dashboard-state',
            actionProvider: async function (payload) {
                await window.IRSPApi.postAction({
                    scenario_id: scenarioId,
                    alert_key: payload.alertId,
                    action: payload.action,
                    alert_id: payload.serverAlertId
                });

                await refreshEvidence();
                await pollLivePlayback();
            },
            searchProvider: async function (query) {
                const payload = await window.IRSPApi.search({
                    scenario: scenarioId,
                    q: query
                });

                return {
                    query: query,
                    scenario_id: payload.scenario_id,
                    total_matches: payload.total_matches,
                    severity_breakdown: payload.severity_breakdown,
                    results: (payload.results || []).map(mapLogToRecord)
                };
            }
        });

        pollLivePlayback();
        window.setInterval(pollLivePlayback, 8000);
    });
})();
