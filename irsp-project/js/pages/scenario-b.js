(function () {
    'use strict';

    const SCENARIO_ID = 'scenario-b';
    const DEFAULT_QUERY = 'host in ("192.168.32.130", "192.168.32.129", "DESKTOP-GRQ4G1E") or sourcetype has "sysmon" or sourcetype has "security" or sourcetype has "taskscheduler"';

    const els = {
        searchInput: document.getElementById('scenario-b-search-input'),
        runSearch: document.getElementById('scenario-b-run-search'),
        refreshLogs: document.getElementById('scenario-b-refresh-logs'),
        searchStatus: document.getElementById('scenario-b-search-status'),
        sourceStatus: document.getElementById('scenario-b-source-status'),
        resultsNote: document.getElementById('scenario-b-results-note'),
        resultsBody: document.getElementById('scenario-b-results-body'),
        alertsBody: document.getElementById('scenario-b-alerts-body'),
        searchPanel: document.getElementById('scenario-b-search-panel-search'),
        statsPanel: document.getElementById('scenario-b-search-panel-stats'),
        rawPanel: document.getElementById('scenario-b-search-panel-raw'),
        metricAlerts: document.getElementById('scenario-b-metric-alerts'),
        metricAlertsNote: document.getElementById('scenario-b-metric-alerts-note'),
        metricEvents: document.getElementById('scenario-b-metric-events'),
        metricEventsNote: document.getElementById('scenario-b-metric-events-note'),
        metricResults: document.getElementById('scenario-b-metric-results'),
        metricResultsNote: document.getElementById('scenario-b-metric-results-note'),
        notableCount: document.getElementById('scenario-b-notable-count'),
        escalatedCount: document.getElementById('scenario-b-escalated-count'),
        logCount: document.getElementById('scenario-b-log-count'),
        drilldownHost: document.getElementById('scenario-b-drilldown-host'),
        drilldownSourcetype: document.getElementById('scenario-b-drilldown-sourcetype'),
        drilldownUser: document.getElementById('scenario-b-drilldown-user'),
        drilldownEventId: document.getElementById('scenario-b-drilldown-event-id'),
        drilldownJson: document.getElementById('scenario-b-drilldown-json'),
        drilldownFields: document.getElementById('scenario-b-drilldown-fields')
    };

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString();
    }

    function formatTimestamp(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value || '--';

        return date.toISOString().split('T')[1].replace('Z', '');
    }

    function severityMeta(value) {
        const normalized = String(value || '').toLowerCase();
        if (normalized === 'critical') return { badge: 'red', row: 'critical', label: 'Critical' };
        if (normalized === 'high') return { badge: 'yellow', row: 'high', label: 'High' };
        if (normalized === 'medium') return { badge: 'blue', row: 'medium', label: 'Medium' };
        return { badge: 'blue', row: 'medium', label: normalized ? normalized[0].toUpperCase() + normalized.slice(1) : 'Info' };
    }

    function normalizeLog(item) {
        return {
            id: item.id || item._id || '',
            timestamp: item.timestamp || item.time || item.TimeCreated || '',
            host: item.host || item.Computer || item.computer || 'unknown-host',
            sourcetype: item.sourcetype || item.channel || item.Channel || 'windows:event',
            severity: item.severity || item.LevelDisplayName || item.level || 'info',
            event_id: item.event_id || item.EventID || item.EventId || '',
            user: item.user || item.User || item.SubjectUserName || '',
            process_name: item.process_name || item.ProcessName || item.Image || '',
            parent_process: item.parent_process || item.ParentImage || '',
            dest_ip: item.dest_ip || item.DestinationIp || '',
            dest_port: item.dest_port || item.DestinationPort || '',
            query_name: item.query_name || item.QueryName || '',
            task_name: item.task_name || item.TaskName || '',
            event: item.event || item.Message || item.message || ''
        };
    }

    function fieldsText(record) {
        return Object.entries(record)
            .filter(function ([, value]) {
                return value !== null && value !== undefined && value !== '';
            })
            .map(function ([key, value]) {
                return key + ': ' + value;
            })
            .join('\n');
    }

    function alertQuery(alert) {
        const key = String(alert.alert_key || '').toLowerCase();
        const title = String(alert.title || '').toLowerCase();

        if (key.includes('credential') || title.includes('credential') || title.includes('lsass')) {
            return 'event has "credential" or event has "lsass" or event has "procdump" or process_name has "procdump"';
        }
        if (key.includes('persistence') || title.includes('scheduled task')) {
            return 'sourcetype has "taskscheduler" or event has "scheduled task" or task_name != ""';
        }
        if (key.includes('c2') || title.includes('tls') || title.includes('outbound')) {
            return 'event has "tls" or event has "user-agent" or event has "exfil" or dest_ip != ""';
        }

        return alert.host ? 'host == "' + alert.host + '"' : DEFAULT_QUERY;
    }

    function setBusy(isBusy) {
        [els.runSearch, els.refreshLogs].forEach(function (button) {
            if (button) button.disabled = isBusy;
        });
    }

    function updateDrilldown(record) {
        if (!record) return;

        if (els.drilldownHost) els.drilldownHost.textContent = record.host || '--';
        if (els.drilldownSourcetype) els.drilldownSourcetype.textContent = record.sourcetype || '--';
        if (els.drilldownUser) els.drilldownUser.textContent = record.user || '--';
        if (els.drilldownEventId) els.drilldownEventId.textContent = record.event_id || '--';
        if (els.drilldownJson) els.drilldownJson.textContent = JSON.stringify(record, null, 2);
        if (els.drilldownFields) els.drilldownFields.textContent = fieldsText(record);
    }

    function renderResults(payload, query) {
        const results = Array.isArray(payload.results) ? payload.results.map(normalizeLog) : [];

        if (els.metricResults) els.metricResults.textContent = formatNumber(payload.total_matches || results.length);
        if (els.metricResultsNote) els.metricResultsNote.textContent = 'Matches for current KQL pivot';
        if (els.resultsNote) els.resultsNote.textContent = results.length + ' of ' + formatNumber(payload.total_matches || results.length) + ' events shown';

        if (els.searchPanel) {
            els.searchPanel.textContent = 'ResponseGridLogs\n| where ' + query + '\n\n'
                + (results.length
                    ? results.map(function (item) {
                        return formatTimestamp(item.timestamp) + ' ' + item.host + ' ' + item.sourcetype + ' ' + item.event;
                    }).join('\n')
                    : 'No matching events found.');
        }

        if (els.statsPanel) {
            const severityLines = Object.entries(payload.severity_breakdown || {})
                .map(function ([severity, count]) {
                    return severity + ' ' + count;
                })
                .join('\n');

            els.statsPanel.textContent = 'query=' + query
                + '\nscenario=' + (payload.scenario_id || SCENARIO_ID)
                + '\nresults=' + formatNumber(payload.total_matches || results.length)
                + '\n\n' + (severityLines || 'no severity breakdown available');
        }

        if (els.rawPanel) {
            els.rawPanel.textContent = results.map(function (item) {
                return JSON.stringify(item);
            }).join('\n') || 'No raw events available for this query.';
        }

        if (!els.resultsBody) return;

        if (!results.length) {
            els.resultsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">No matching events found for this query.</td></tr>';
            updateDrilldown(null);
            return;
        }

        els.resultsBody.innerHTML = results.map(function (item, index) {
            return '<tr data-result-index="' + index + '" tabindex="0">'
                + '<td class="mono">' + escapeHtml(formatTimestamp(item.timestamp)) + '</td>'
                + '<td class="mono">' + escapeHtml(item.host) + '</td>'
                + '<td>' + escapeHtml(item.sourcetype) + '</td>'
                + '<td class="mono">' + escapeHtml(item.event_id || '--') + '</td>'
                + '<td class="mono">' + escapeHtml(item.event || '--') + '</td>'
                + '</tr>';
        }).join('');

        Array.from(els.resultsBody.querySelectorAll('[data-result-index]')).forEach(function (row) {
            row.addEventListener('click', function () {
                updateDrilldown(results[Number(row.dataset.resultIndex)]);
            });
            row.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    row.click();
                }
            });
        });

        updateDrilldown(results[0]);
    }

    function renderAlerts(alerts) {
        if (!els.alertsBody) return;

        if (!alerts.length) {
            els.alertsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">No Scenario B alerts are currently queued.</td></tr>';
            return;
        }

        els.alertsBody.innerHTML = alerts.map(function (alert, index) {
            const meta = severityMeta(alert.severity);
            return '<tr class="queue-row ' + meta.row + '">'
                + '<td><span class="status-badge ' + meta.badge + '">' + escapeHtml(meta.label) + '</span></td>'
                + '<td>' + escapeHtml(alert.title || 'Untitled alert') + '</td>'
                + '<td class="mono">' + escapeHtml(alert.host || '--') + '</td>'
                + '<td>' + escapeHtml(alert.technique_id || '--') + '</td>'
                + '<td><button class="btn btn-secondary" type="button" data-alert-index="' + index + '">Pivot</button></td>'
                + '</tr>';
        }).join('');

        Array.from(els.alertsBody.querySelectorAll('[data-alert-index]')).forEach(function (button) {
            button.addEventListener('click', function () {
                const alert = alerts[Number(button.dataset.alertIndex)];
                const query = alertQuery(alert);
                if (els.searchInput) els.searchInput.value = query;
                runSearch(query);
            });
        });
    }

    async function hydrateAlerts() {
        try {
            const payload = await window.IRSPApi.getAlerts({ scenario: SCENARIO_ID, limit: 10 });
            const alerts = Array.isArray(payload.items) ? payload.items : [];
            const highPriority = alerts.filter(function (item) {
                return ['critical', 'high'].includes(String(item.severity || '').toLowerCase());
            });
            const escalated = alerts.filter(function (item) {
                return String(item.status || '').toLowerCase() === 'escalated';
            });

            renderAlerts(alerts);

            if (els.metricAlerts) els.metricAlerts.textContent = String(highPriority.length).padStart(2, '0');
            if (els.metricAlertsNote) els.metricAlertsNote.textContent = alerts.length + ' alert' + (alerts.length === 1 ? '' : 's') + ' in Scenario B queue';
            if (els.notableCount) els.notableCount.textContent = highPriority.length + ' Notable';
            if (els.escalatedCount) els.escalatedCount.textContent = escalated.length + ' Escalated';
        } catch (error) {
            if (els.alertsBody) {
                els.alertsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">Scenario B alerts are unavailable.</td></tr>';
            }
        }
    }

    async function hydrateEventCount() {
        try {
            const payload = await window.IRSPApi.search({ scenario: SCENARIO_ID, q: '' });
            const count = payload.total_matches || (payload.results || []).length;
            if (els.metricEvents) els.metricEvents.textContent = formatNumber(count);
            if (els.logCount) els.logCount.textContent = formatNumber(count);
            if (els.metricEventsNote) els.metricEventsNote.textContent = 'Events available for Scenario B';
            if (els.sourceStatus) els.sourceStatus.textContent = 'Live telemetry connected';
        } catch (error) {
            if (els.sourceStatus) els.sourceStatus.textContent = 'Telemetry unavailable';
        }
    }

    async function runSearch(queryValue) {
        const query = String(queryValue || (els.searchInput && els.searchInput.value) || DEFAULT_QUERY).trim();
        if (!query) return;

        setBusy(true);
        if (els.searchStatus) els.searchStatus.textContent = 'Running Scenario B search...';

        try {
            const payload = await window.IRSPApi.search({ scenario: SCENARIO_ID, q: query });
            renderResults(payload, query);
            if (els.searchStatus) {
                els.searchStatus.textContent = 'Search completed at ' + IRSP.getTimestamp() + ' with ' + formatNumber(payload.total_matches || 0) + ' matched events.';
            }
        } catch (error) {
            if (els.searchStatus) els.searchStatus.textContent = 'Search unavailable. Check the local telemetry service.';
            if (els.resultsBody) {
                els.resultsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">Search failed for this query.</td></tr>';
            }
        } finally {
            setBusy(false);
            if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') {
                window.IRSP.refreshIcons();
            }
        }
    }

    function bindControls() {
        if (els.runSearch) {
            els.runSearch.addEventListener('click', function () {
                runSearch();
            });
        }

        if (els.refreshLogs) {
            els.refreshLogs.addEventListener('click', function () {
                hydrateAlerts();
                hydrateEventCount();
                runSearch();
            });
        }

        if (els.searchInput) {
            els.searchInput.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    runSearch();
                }
            });
        }

        Array.from(document.querySelectorAll('[data-scenario-b-query]')).forEach(function (button) {
            button.addEventListener('click', function () {
                Array.from(document.querySelectorAll('[data-scenario-b-query]')).forEach(function (item) {
                    item.classList.remove('active');
                });
                button.classList.add('active');
                if (els.searchInput) els.searchInput.value = button.dataset.scenarioBQuery || '';
                runSearch(button.dataset.scenarioBQuery || '');
            });
        });
    }

    bindControls();
    hydrateAlerts();
    hydrateEventCount();
    runSearch(DEFAULT_QUERY);
})();
