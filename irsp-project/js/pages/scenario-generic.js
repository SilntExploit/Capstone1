(function () {
    'use strict';

    const SCENARIOS = {
        'scenario-c': {
            title: 'Scenario C: Vishing and Social Engineering',
            subtitle: 'Validate the caller, verify identity workflows, review mailbox abuse, and contain account takeover indicators without trusting urgency.',
            badgeClass: 'yellow',
            badgeLabel: 'Awareness Active',
            owner: 'Awareness Lab',
            environment: 'Voice / Email analyst workspace',
            workspace: 'Social Engineering Review Workspace',
            vmName: 'rg-vishing-vm-c',
            services: 'Transcript review shell, identity verification pivots, and mailbox-rule triage.',
            timerSeconds: 1200,
            chips: [
                'caller',
                'forwardTo',
                'password reset',
                'exec-finance'
            ],
            objectives: [
                { id: 'verify-caller', label: 'Verify the caller identity and escalation story', complete: alerts => hasStatus(alerts, 'vishing-call', ['investigating', 'acknowledged', 'contained']) },
                { id: 'review-mailbox', label: 'Review mailbox forwarding behavior', complete: alerts => hasStatus(alerts, 'mailbox-rule', ['investigating', 'acknowledged', 'contained']) },
                { id: 'contain-account', label: 'Contain the affected executive account', complete: alerts => hasStatus(alerts, 'credential-reset', ['contained']) },
                { id: 'capture-evidence', label: 'Collect transcript and identity evidence', complete: (alerts, evidence) => evidence.length >= 2 }
            ]
        },
        'scenario-d': {
            title: 'Scenario D: DDoS Mitigation',
            subtitle: 'Triage availability impact, validate edge telemetry, and coordinate mitigation actions that restore service without dropping critical evidence.',
            badgeClass: 'red',
            badgeLabel: 'Mitigation Active',
            owner: 'Network Defense Lab',
            environment: 'Network defense analyst workspace',
            workspace: 'Availability Defense Workspace',
            vmName: 'rg-ddos-vm-d',
            services: 'Edge flow analysis, WAF review, health validation, and mitigation logging.',
            timerSeconds: 1500,
            chips: [
                'requests_per_second',
                'error_rate',
                'rate limit',
                'baseline geography'
            ],
            objectives: [
                { id: 'assess-traffic', label: 'Assess edge saturation and source patterns', complete: alerts => hasStatus(alerts, 'edge-traffic', ['investigating', 'acknowledged', 'contained']) },
                { id: 'check-health', label: 'Validate health-check impact across services', complete: alerts => hasStatus(alerts, 'health-degrade', ['investigating', 'acknowledged', 'contained']) },
                { id: 'apply-mitigation', label: 'Apply containment at edge controls', complete: alerts => hasStatus(alerts, 'edge-traffic', ['contained']) || hasStatus(alerts, 'geo-spike', ['contained']) },
                { id: 'preserve-evidence', label: 'Preserve traffic and mitigation evidence', complete: (alerts, evidence) => evidence.length >= 2 }
            ]
        },
        'scenario-e': {
            title: 'Scenario E: Insider Exfiltration Review',
            subtitle: 'Correlate removable media, archive staging, and cloud upload activity to determine intent and stop ongoing data loss.',
            badgeClass: 'red',
            badgeLabel: 'Exfiltration Active',
            owner: 'Insider Risk PM',
            environment: 'Windows endpoint investigation workspace',
            workspace: 'Insider Risk Review Workspace',
            vmName: 'rg-insider-vm-e',
            services: 'USB telemetry review, DLP pivots, proxy upload analysis, and evidence collection.',
            timerSeconds: 2100,
            chips: [
                'USB storage',
                '7z.exe',
                'upload=842MB',
                'payroll-q2.7z'
            ],
            objectives: [
                { id: 'review-media', label: 'Review removable-media activity', complete: alerts => hasStatus(alerts, 'usb-copy', ['investigating', 'acknowledged', 'contained']) },
                { id: 'trace-archive', label: 'Trace archive staging and compression', complete: alerts => hasStatus(alerts, 'archive-staging', ['investigating', 'acknowledged', 'contained']) },
                { id: 'contain-upload', label: 'Contain outbound upload behavior', complete: alerts => hasStatus(alerts, 'cloud-upload', ['contained']) },
                { id: 'document-case', label: 'Document insider-risk evidence trail', complete: (alerts, evidence) => evidence.length >= 2 }
            ]
        },
        'scenario-f': {
            title: 'Scenario F: Cloud IAM Privilege Escalation',
            subtitle: 'Investigate suspicious sign-ins, role assumption, and policy drift across cloud audit logs, then contain the privileged path.',
            badgeClass: 'yellow',
            badgeLabel: 'CloudSec Active',
            owner: 'Cloud IAM Team',
            environment: 'Cloud audit and identity workspace',
            workspace: 'Cloud IAM Investigation Workspace',
            vmName: 'rg-cloudiam-vm-f',
            services: 'CloudTrail-style audit review, role-chain analysis, and policy-drift containment.',
            timerSeconds: 1680,
            chips: [
                'AssumeRole',
                'AdministratorAccess',
                'impossible travel',
                'drift'
            ],
            objectives: [
                { id: 'validate-signin', label: 'Validate suspicious sign-in context', complete: alerts => hasStatus(alerts, 'impossible-travel', ['investigating', 'acknowledged', 'contained']) },
                { id: 'trace-role-chain', label: 'Trace the role-assumption chain', complete: alerts => hasStatus(alerts, 'assume-role', ['investigating', 'acknowledged', 'contained']) },
                { id: 'revoke-privilege', label: 'Contain privileged policy drift', complete: alerts => hasStatus(alerts, 'policy-change', ['contained']) },
                { id: 'preserve-audit', label: 'Preserve audit evidence for follow-up', complete: (alerts, evidence) => evidence.length >= 2 }
            ]
        }
    };

    const els = {
        title: document.getElementById('generic-title'),
        subtitle: document.getElementById('generic-subtitle'),
        owner: document.getElementById('generic-owner'),
        environment: document.getElementById('generic-environment'),
        riskBadge: document.getElementById('generic-risk-badge'),
        workspaceName: document.getElementById('generic-workspace-name'),
        workspaceVm: document.getElementById('generic-workspace-vm'),
        workspaceEnvironment: document.getElementById('generic-workspace-environment'),
        workspaceStarted: document.getElementById('generic-workspace-started'),
        workspaceStatus: document.getElementById('generic-workspace-status'),
        services: document.getElementById('generic-services'),
        alertCount: document.getElementById('generic-alert-count'),
        alertNote: document.getElementById('generic-alert-note'),
        progress: document.getElementById('generic-progress'),
        progressNote: document.getElementById('generic-progress-note'),
        progressFill: document.getElementById('generic-progress-fill'),
        evidenceCount: document.getElementById('generic-evidence-count'),
        evidenceNote: document.getElementById('generic-evidence-note'),
        alertsBody: document.getElementById('generic-alerts-body'),
        alertStatus: document.getElementById('generic-alert-status'),
        queryInput: document.getElementById('generic-query-input'),
        queryStatus: document.getElementById('generic-query-status'),
        queryChips: document.getElementById('generic-query-chips'),
        resultsBody: document.getElementById('generic-results-body'),
        objectives: document.getElementById('generic-objectives'),
        objectiveStatus: document.getElementById('generic-objective-status'),
        evidenceList: document.getElementById('generic-evidence-list'),
        evidenceStatus: document.getElementById('generic-evidence-status'),
        liveFeed: document.getElementById('generic-live-feed'),
        liveStatus: document.getElementById('generic-live-status'),
        workspaceNote: document.getElementById('generic-workspace-note')
    };

    const scenarioId = resolveScenarioId();
    const config = SCENARIOS[scenarioId];

    if (!config) {
        window.location.replace('active-lab.html');
        return;
    }

    let alerts = [];
    let evidence = [];
    let logs = [];
    let playback = [];

    document.title = `ResponseGrid - ${config.title}`;
    hydrateStaticCopy();
    startTimer('timer', config.timerSeconds, { storageKey: `irsp-${scenarioId}-timer` });
    bindQueryControls();
    hydrateScenario();

    function resolveScenarioId() {
        const params = new URLSearchParams(window.location.search);
        const queryScenario = params.get('scenario');
        if (SCENARIOS[queryScenario]) return queryScenario;

        try {
            const workspace = JSON.parse(localStorage.getItem('irsp-active-workspace')) || {};
            if (SCENARIOS[workspace.scenarioId]) return workspace.scenarioId;
        } catch (error) {
            return 'scenario-c';
        }

        return 'scenario-c';
    }

    function safeWorkspaceState() {
        try {
            return JSON.parse(localStorage.getItem('irsp-active-workspace')) || {};
        } catch (error) {
            return {};
        }
    }

    function formatDateTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Booted from the Launch Bay';
        return date.toLocaleString([], {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '--';
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    function severityBadge(severity) {
        const normalized = String(severity || '').toLowerCase();
        if (normalized === 'critical') return 'red';
        if (normalized === 'high') return 'yellow';
        return 'blue';
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function hasStatus(items, alertKey, statuses) {
        return items.some(item => item.alert_key === alertKey && statuses.includes(item.status));
    }

    function hydrateStaticCopy() {
        const workspaceState = safeWorkspaceState();
        const isCurrentWorkspace = workspaceState.scenarioId === scenarioId;

        els.title.textContent = config.title;
        els.subtitle.textContent = config.subtitle;
        els.owner.textContent = config.owner;
        els.environment.textContent = config.environment;
        els.riskBadge.textContent = config.badgeLabel;
        els.riskBadge.className = `status-badge ${config.badgeClass}`;
        els.workspaceName.textContent = isCurrentWorkspace ? (workspaceState.workspace || config.workspace) : config.workspace;
        els.workspaceVm.textContent = `VM: ${isCurrentWorkspace ? (workspaceState.vmName || config.vmName) : config.vmName}`;
        els.workspaceEnvironment.textContent = isCurrentWorkspace ? (workspaceState.environment || config.environment) : config.environment;
        els.workspaceStarted.textContent = isCurrentWorkspace ? formatDateTime(workspaceState.startedAt) : 'Booted from the Launch Bay';
        els.workspaceStatus.textContent = isCurrentWorkspace ? 'VM Running' : 'VM Ready';
        els.services.textContent = config.services;
        els.workspaceNote.textContent = `Launch flow is wired through the app and backed by seeded ${scenarioId} telemetry.`;
        els.queryInput.value = config.chips[0] || '';

        els.queryChips.innerHTML = config.chips.map(function (chip, index) {
            return `<button class="chip-btn${index === 0 ? ' active' : ''}" type="button" data-query="${escapeHtml(chip)}">${escapeHtml(chip)}</button>`;
        }).join('');

        Array.from(els.queryChips.querySelectorAll('[data-query]')).forEach(function (button) {
            button.addEventListener('click', function () {
                Array.from(els.queryChips.querySelectorAll('.chip-btn')).forEach(node => node.classList.remove('active'));
                button.classList.add('active');
                els.queryInput.value = button.dataset.query || '';
                runSearch();
            });
        });
    }

    function bindQueryControls() {
        document.getElementById('generic-run-query').addEventListener('click', runSearch);
        els.queryInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                runSearch();
            }
        });
    }

    async function hydrateScenario() {
        if (!window.IRSPApi || !window.IRSPApi.isAvailable()) {
            els.alertStatus.textContent = 'API unavailable';
            return;
        }

        try {
            const [alertsPayload, logsPayload, evidencePayload, livePayload] = await Promise.all([
                window.IRSPApi.getAlerts({ scenario: scenarioId, limit: 10 }),
                window.IRSPApi.getLogs({ scenario: scenarioId, limit: 12 }),
                window.IRSPApi.getEvidence({ scenario: scenarioId, limit: 8 }),
                window.IRSPApi.getLive({ scenario: scenarioId, cursor: 0, limit: 6 })
            ]);

            alerts = alertsPayload.items || [];
            logs = logsPayload.items || [];
            evidence = evidencePayload.items || [];
            playback = livePayload.items || [];

            renderAlerts();
            renderResults(logs);
            renderEvidence();
            renderPlayback();
            renderObjectives();
        } catch (error) {
            els.alertStatus.textContent = 'Unable to load scenario telemetry';
            els.queryStatus.textContent = 'Search is unavailable because the mock API could not be reached.';
            els.evidenceStatus.textContent = 'Evidence unavailable';
            els.liveStatus.textContent = 'Playback unavailable';
        }
    }

    function renderAlerts() {
        els.alertCount.textContent = String(alerts.length).padStart(2, '0');
        els.alertNote.textContent = alerts.length ? `${alerts.filter(item => item.severity === 'critical').length} critical alerts require attention.` : 'No active alerts for this scenario.';
        els.alertStatus.textContent = `Loaded ${alerts.length} alert${alerts.length === 1 ? '' : 's'} at ${window.IRSP.getTimestamp()}`;

        if (!alerts.length) {
            els.alertsBody.innerHTML = '<tr><td colspan="4" class="surface-note">No seeded alerts available.</td></tr>';
            return;
        }

        els.alertsBody.innerHTML = alerts.map(function (item) {
            return `
                <tr>
                    <td>${escapeHtml(formatTime(item.timestamp))}</td>
                    <td>${escapeHtml(item.host)}</td>
                    <td>
                        <div style="font-weight:600;">${escapeHtml(item.title)}</div>
                        <div class="surface-note">${escapeHtml(item.technique_id || item.status)}</div>
                    </td>
                    <td>
                        <div class="action-stack" style="gap:0.4rem;">
                            <span class="status-badge ${severityBadge(item.severity)}">${escapeHtml(item.status || item.severity)}</span>
                            <div class="command-chips" style="margin-top:0.4rem;">
                                <button class="chip-btn" type="button" data-action="investigate" data-alert-key="${escapeHtml(item.alert_key)}">Investigate</button>
                                <button class="chip-btn" type="button" data-action="acknowledge" data-alert-key="${escapeHtml(item.alert_key)}">Acknowledge</button>
                                <button class="chip-btn" type="button" data-action="contain" data-alert-key="${escapeHtml(item.alert_key)}">Contain</button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        Array.from(els.alertsBody.querySelectorAll('[data-action]')).forEach(function (button) {
            button.addEventListener('click', function () {
                postAction(button.dataset.alertKey, button.dataset.action);
            });
        });
    }

    async function postAction(alertKey, action) {
        try {
            await window.IRSPApi.postAction({
                scenario_id: scenarioId,
                alert_key: alertKey,
                action
            });
            els.alertStatus.textContent = `${action} action synced at ${window.IRSP.getTimestamp()}`;
            await hydrateScenario();
        } catch (error) {
            els.alertStatus.textContent = `Action failed at ${window.IRSP.getTimestamp()}`;
        }
    }

    async function runSearch() {
        try {
            const query = els.queryInput.value.trim();
            const payload = await window.IRSPApi.search({
                scenario: scenarioId,
                q: query
            });
            const results = payload.results || [];
            renderResults(results);
            els.queryStatus.textContent = `Search completed at ${window.IRSP.getTimestamp()} with ${payload.total_matches || results.length} result${results.length === 1 ? '' : 's'}.`;
        } catch (error) {
            els.queryStatus.textContent = 'Search failed because the mock API is unavailable.';
        }
    }

    function renderResults(items) {
        if (!items.length) {
            els.resultsBody.innerHTML = '<tr><td colspan="4" class="surface-note">No results match the current query.</td></tr>';
            return;
        }

        els.resultsBody.innerHTML = items.map(function (item) {
            return `
                <tr>
                    <td>${escapeHtml(formatTime(item.timestamp))}</td>
                    <td>${escapeHtml(item.host)}</td>
                    <td>${escapeHtml(item.sourcetype)}</td>
                    <td>${escapeHtml(item.event)}</td>
                </tr>
            `;
        }).join('');
    }

    function renderEvidence() {
        els.evidenceCount.textContent = String(evidence.length).padStart(2, '0');
        els.evidenceNote.textContent = evidence.length ? `Evidence locker updated through ${formatTime(evidence[0].collected_at)}.` : 'No evidence has been collected yet.';
        els.evidenceStatus.textContent = `${evidence.length} item${evidence.length === 1 ? '' : 's'} in the locker`;

        if (!evidence.length) {
            els.evidenceList.innerHTML = '<div class="surface-note">No evidence items available.</div>';
            return;
        }

        els.evidenceList.innerHTML = evidence.map(function (item) {
            return `
                <div class="alert-item">
                    <div class="alert-indicator ${severityBadge(item.severity)}"></div>
                    <div class="alert-info">
                        <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                            <h4>${escapeHtml(item.title)}</h4>
                            <span class="status-badge ${severityBadge(item.severity)}">${escapeHtml(item.type)}</span>
                        </div>
                        <p>${escapeHtml(item.summary)}</p>
                        <div class="surface-note">Source: ${escapeHtml(item.source)} • Collected: ${escapeHtml(formatTime(item.collected_at))}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderPlayback() {
        els.liveStatus.textContent = playback.length ? `${playback.length} update${playback.length === 1 ? '' : 's'} loaded from playback.` : 'No playback updates yet.';

        if (!playback.length) {
            els.liveFeed.innerHTML = '<div class="surface-note">No live updates available.</div>';
            return;
        }

        els.liveFeed.innerHTML = playback.map(function (item) {
            return `
                <div class="timeline-item">
                    <span class="time">${escapeHtml(formatTime(item.timestamp))}</span>
                    <p class="desc"><strong>${escapeHtml(item.source)}:</strong> ${escapeHtml(item.message)}</p>
                </div>
            `;
        }).join('');
    }

    function renderObjectives() {
        const completed = config.objectives.filter(function (item) {
            return item.complete(alerts, evidence);
        });
        const percent = Math.round((completed.length / config.objectives.length) * 100);

        els.progress.textContent = `${percent}%`;
        els.progressFill.style.width = `${percent}%`;
        els.progressNote.textContent = `${completed.length} of ${config.objectives.length} response goals completed.`;
        els.objectiveStatus.textContent = percent === 100 ? 'Scenario objectives complete. Continue reviewing evidence and playback for the full story.' : 'Advance alerts and evidence collection to complete more objectives.';

        els.objectives.innerHTML = config.objectives.map(function (item) {
            const isComplete = completed.includes(item);
            return `
                <li class="objective-item${isComplete ? ' complete' : ''}">
                    <i data-lucide="${isComplete ? 'check-circle' : 'circle'}" style="color:${isComplete ? 'var(--accent-green)' : 'var(--text-dim)'};"></i>
                    ${escapeHtml(item.label)}
                </li>
            `;
        }).join('');

        window.IRSP.refreshIcons();
    }
})();
