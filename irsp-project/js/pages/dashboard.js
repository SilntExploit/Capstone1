(function () {
    'use strict';

    const LAST_SCENARIO_KEY = 'irsp-last-scenario';
    const DEFAULT_SCENARIO_ID = 'scenario-b';

    const SCENARIO_SUMMARIES = {
        'scenario-a': {
            id: 'scenario-a',
            name: 'Scenario A',
            title: 'Scenario A: IRSP Linux Lab',
            url: 'eapen-scenario-a/lab_a.html',
            summary: 'Scenario A is Eapen\'s browser-based Linux VM lab with a Guacamole session, staged IR questions, timer, and final score.',
            mode: 'Live VM',
            modeNote: 'The trainee opens the Guacamole VM wrapper and completes detection, containment, and recovery stages.',
            primaryLabel: 'Workspace',
            primaryTarget: 'IRSP Linux VM',
            primaryNote: 'Browser-accessible Guacamole lab desktop.',
            secondaryLabel: 'Environment',
            secondaryTarget: 'Linux / Docker',
            secondaryNote: 'Containment and response workspace.',
            alertsLabel: 'Scenario A Alerts',
            page: 'Scenario A IRSP Linux Lab',
            evaluation: 'Score comes from staged answers, time bonuses, and completion before timeout.',
            actionText: 'Resume Scenario A',
            actionIcon: 'terminal'
        },
        'scenario-b': {
            id: 'scenario-b',
            name: 'Scenario B',
            title: 'Scenario B: Endpoint Investigation',
            url: 'scenario-b.html',
            summary: 'Scenario B is the timed trainee endpoint investigation exercise with alerts, telemetry pivots, response actions, and hidden scoring.',
            mode: 'Timed',
            modeNote: 'Score is hidden until submit or timeout.',
            primaryLabel: 'Primary Endpoint',
            primaryTarget: '192.168.32.130',
            primaryNote: 'Initial triage and execution focus.',
            secondaryLabel: 'Secondary Endpoint',
            secondaryTarget: '192.168.32.129',
            secondaryNote: 'Lateral movement validation target.',
            alertsLabel: 'Scenario B Alerts',
            page: 'Scenario B Endpoint Investigation',
            evaluation: 'Hidden score revealed on submit or timeout.',
            actionText: 'Resume Scenario B',
            actionIcon: 'shield-alert'
        }
    };

    const els = {
        recentLabName: document.getElementById('dashboard-recent-lab-name'),
        alertsBody: document.getElementById('dashboard-alerts-body'),
        metricAlerts: document.getElementById('dashboard-metric-alerts'),
        metricAlertsNote: document.getElementById('dashboard-metric-alerts-note'),
        metricEvents: document.getElementById('dashboard-metric-events'),
        metricEventsNote: document.getElementById('dashboard-metric-events-note'),
        connectionStatus: document.getElementById('dashboard-connection-status'),
        progressNote: document.getElementById('dashboard-progress-note'),
        progressFill: document.getElementById('dashboard-progress-fill'),
        lastRun: document.getElementById('dashboard-last-run'),
        recentLabSummary: document.getElementById('dashboard-recent-lab-summary'),
        resumeLab: document.getElementById('dashboard-resume-lab'),
        exerciseMode: document.getElementById('dashboard-exercise-mode'),
        exerciseModeNote: document.getElementById('dashboard-exercise-mode-note'),
        primaryLabel: document.getElementById('dashboard-primary-label'),
        primaryTarget: document.getElementById('dashboard-primary-target'),
        primaryNote: document.getElementById('dashboard-primary-note'),
        secondaryLabel: document.getElementById('dashboard-secondary-label'),
        secondaryTarget: document.getElementById('dashboard-secondary-target'),
        secondaryNote: document.getElementById('dashboard-secondary-note'),
        alertsLabel: document.getElementById('dashboard-alerts-label'),
        alertsTitleText: document.getElementById('dashboard-alerts-title-text'),
        eventsLabel: document.getElementById('dashboard-events-label'),
        primaryPage: document.getElementById('dashboard-primary-page'),
        modeValue: document.getElementById('dashboard-mode-value'),
        evaluationValue: document.getElementById('dashboard-evaluation-value'),
        primaryAction: document.getElementById('dashboard-primary-action')
    };

    function readLastScenario() {
        try {
            const parsed = JSON.parse(localStorage.getItem(LAST_SCENARIO_KEY) || 'null');
            if (parsed && SCENARIO_SUMMARIES[parsed.id]) {
                return Object.assign({}, SCENARIO_SUMMARIES[parsed.id], {
                    title: parsed.title || SCENARIO_SUMMARIES[parsed.id].title,
                    url: parsed.url || SCENARIO_SUMMARIES[parsed.id].url
                });
            }
        } catch (error) {
            return SCENARIO_SUMMARIES[DEFAULT_SCENARIO_ID];
        }

        return SCENARIO_SUMMARIES[DEFAULT_SCENARIO_ID];
    }

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

    function severityMeta(value) {
        const severity = String(value || '').toLowerCase();
        if (severity === 'critical') return { badge: 'red', label: 'Critical' };
        if (severity === 'high') return { badge: 'yellow', label: 'High' };
        if (severity === 'medium') return { badge: 'blue', label: 'Medium' };
        return { badge: 'blue', label: 'Info' };
    }

    function renderShellAction(link, scenario) {
        if (!link) return;

        link.href = scenario.url;
        link.innerHTML = '<i data-lucide="' + escapeHtml(scenario.actionIcon) + '"></i> ' + escapeHtml(scenario.actionText);
    }

    function renderScenarioSummary(scenario) {
        if (els.recentLabName) els.recentLabName.textContent = scenario.name;
        if (els.lastRun) els.lastRun.textContent = scenario.title + ' ready';
        if (els.recentLabSummary) els.recentLabSummary.textContent = scenario.summary;
        renderShellAction(els.resumeLab, scenario);
        renderShellAction(els.primaryAction, scenario);

        if (els.exerciseMode) els.exerciseMode.textContent = scenario.mode;
        if (els.exerciseModeNote) els.exerciseModeNote.textContent = scenario.modeNote;
        if (els.primaryLabel) els.primaryLabel.textContent = scenario.primaryLabel;
        if (els.primaryTarget) els.primaryTarget.textContent = scenario.primaryTarget;
        if (els.primaryNote) els.primaryNote.textContent = scenario.primaryNote;
        if (els.secondaryLabel) els.secondaryLabel.textContent = scenario.secondaryLabel;
        if (els.secondaryTarget) els.secondaryTarget.textContent = scenario.secondaryTarget;
        if (els.secondaryNote) els.secondaryNote.textContent = scenario.secondaryNote;
        if (els.alertsLabel) els.alertsLabel.textContent = scenario.alertsLabel;
        if (els.alertsTitleText) els.alertsTitleText.textContent = 'Recent ' + scenario.name + ' Alerts';
        if (els.eventsLabel) els.eventsLabel.textContent = scenario.name + ' Telemetry';
        if (els.primaryPage) els.primaryPage.textContent = scenario.page;
        if (els.modeValue) els.modeValue.textContent = scenario.mode + ' trainee exercise';
        if (els.evaluationValue) els.evaluationValue.textContent = scenario.evaluation;
    }

    function renderAlerts(alerts, scenario) {
        if (!els.alertsBody) return;

        if (!alerts.length) {
            els.alertsBody.innerHTML = '<tr><td colspan="4" class="surface-note" style="padding:0.75rem;">No '
                + escapeHtml(scenario.name) + ' alerts are currently queued.</td></tr>';
            return;
        }

        els.alertsBody.innerHTML = alerts.slice(0, 5).map(function (alert) {
            const meta = severityMeta(alert.severity);
            return '<tr>'
                + '<td><span class="status-badge ' + meta.badge + '">' + escapeHtml(meta.label) + '</span></td>'
                + '<td>' + escapeHtml(alert.title || 'Untitled alert') + '</td>'
                + '<td class="mono">' + escapeHtml(alert.host || '--') + '</td>'
                + '<td>' + escapeHtml(alert.technique_id || '--') + '</td>'
                + '</tr>';
        }).join('');
    }

    function renderOfflineState(scenario) {
        if (els.metricAlerts) els.metricAlerts.textContent = '--';
        if (els.metricAlertsNote) els.metricAlertsNote.textContent = 'Alert summary unavailable';
        if (els.metricEvents) els.metricEvents.textContent = '--';
        if (els.metricEventsNote) els.metricEventsNote.textContent = 'Telemetry summary unavailable';
        if (els.connectionStatus) els.connectionStatus.textContent = 'Telemetry service unavailable';
        if (els.progressNote) els.progressNote.textContent = 'Start the local server, then refresh this page.';
        if (els.progressFill) els.progressFill.style.width = '35%';
        if (els.alertsBody) {
            els.alertsBody.innerHTML = '<tr><td colspan="4" class="surface-note" style="padding:0.75rem;">'
                + escapeHtml(scenario.name) + ' summary is unavailable.</td></tr>';
        }
    }

    async function hydrateHomeSummary() {
        const scenario = readLastScenario();
        renderScenarioSummary(scenario);

        if (!window.IRSPApi || !window.IRSPApi.isAvailable()) {
            renderOfflineState(scenario);
            return;
        }

        try {
            const [alertsPayload, searchPayload] = await Promise.all([
                window.IRSPApi.getAlerts({ scenario: scenario.id, limit: 5 }),
                window.IRSPApi.search({ scenario: scenario.id, q: '' })
            ]);

            const alerts = Array.isArray(alertsPayload.items) ? alertsPayload.items : [];
            const highPriority = alerts.filter(function (alert) {
                return ['critical', 'high'].includes(String(alert.severity || '').toLowerCase());
            });
            const eventCount = searchPayload.total_matches || (searchPayload.results || []).length;

            renderAlerts(alerts, scenario);

            if (els.metricAlerts) els.metricAlerts.textContent = String(highPriority.length).padStart(2, '0');
            if (els.metricAlertsNote) {
                els.metricAlertsNote.textContent = alerts.length + ' ' + scenario.name + ' alert'
                    + (alerts.length === 1 ? '' : 's') + ' loaded';
            }
            if (els.metricEvents) els.metricEvents.textContent = formatNumber(eventCount);
            if (els.metricEventsNote) els.metricEventsNote.textContent = 'Telemetry ready for ' + scenario.name;
            if (els.connectionStatus) els.connectionStatus.textContent = scenario.name + ' telemetry connected';
            if (els.progressNote) els.progressNote.textContent = 'Home summary is ready. Open ' + scenario.name + ' to continue the most recent lab.';
            if (els.progressFill) els.progressFill.style.width = '100%';
            if (els.lastRun) els.lastRun.textContent = scenario.name + ' summary synced at ' + IRSP.getTimestamp();
        } catch (error) {
            renderOfflineState(scenario);
        } finally {
            if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') {
                window.IRSP.refreshIcons();
            }
        }
    }

    hydrateHomeSummary();
})();
