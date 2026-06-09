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
            chips: ['caller', 'forwardTo', 'password reset', 'exec-finance'],
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
            chips: ['requests_per_second', 'error_rate', 'rate limit', 'baseline geography'],
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
            chips: ['USB storage', '7z.exe', 'upload=842MB', 'payroll-q2.7z'],
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
            chips: ['AssumeRole', 'AdministratorAccess', 'impossible travel', 'drift'],
            objectives: [
                { id: 'validate-signin', label: 'Validate suspicious sign-in context', complete: alerts => hasStatus(alerts, 'impossible-travel', ['investigating', 'acknowledged', 'contained']) },
                { id: 'trace-role-chain', label: 'Trace the role-assumption chain', complete: alerts => hasStatus(alerts, 'assume-role', ['investigating', 'acknowledged', 'contained']) },
                { id: 'revoke-privilege', label: 'Contain privileged policy drift', complete: alerts => hasStatus(alerts, 'policy-change', ['contained']) },
                { id: 'preserve-audit', label: 'Preserve audit evidence for follow-up', complete: (alerts, evidence) => evidence.length >= 2 }
            ]
        }
    };

    // Fix #1 — Rich seeded fallback data for all four scenarios.
    // Used whenever the API is unavailable (static file / offline mode).
    const SEED_DATA = (function () {
        const t = ts => new Date(Date.now() - ts * 1000).toISOString();
        return {
            'scenario-c': {
                alerts: [
                    { alert_key: 'vishing-call', title: 'Vishing Call to Finance Desk', host: 'pbx-01', timestamp: t(900), severity: 'high', status: 'new', technique_id: 'T1566.004' },
                    { alert_key: 'mailbox-rule', title: 'Suspicious Mailbox Forwarding Rule Created', host: 'mail-gw-01', timestamp: t(600), severity: 'critical', status: 'new', technique_id: 'T1114.003' },
                    { alert_key: 'credential-reset', title: 'Forced Credential Reset — exec.finance', host: 'idp-01', timestamp: t(300), severity: 'high', status: 'new', technique_id: 'T1078' }
                ],
                logs: [
                    { timestamp: t(1200), host: 'pbx-01', sourcetype: 'voice:gateway', event: 'Inbound call to x4482 claiming IT Helpdesk. Duration=4m12s caller_id=+18552300914' },
                    { timestamp: t(900), host: 'mail-gw-01', sourcetype: 'o365:message_trace', event: 'exec.finance@corp.local inbox rule created forwardTo=collectmail.net' },
                    { timestamp: t(750), host: 'idp-01', sourcetype: 'okta:system', event: 'Password reset triggered for exec.finance@corp.local from ip=192.168.99.12' },
                    { timestamp: t(600), host: 'mail-gw-01', sourcetype: 'o365:message_trace', event: 'Forwarding active exec.finance@corp.local to collectmail.net last_item=payroll-q2.pdf' },
                    { timestamp: t(450), host: 'idp-01', sourcetype: 'okta:system', event: 'MFA challenge bypassed for exec.finance via social-engineering vector ip=192.168.99.12' },
                    { timestamp: t(300), host: 'idp-01', sourcetype: 'okta:system', event: 'Session token issued for exec.finance@corp.local ip=192.168.99.12 device=unknown' }
                ],
                evidence: [
                    { title: 'Vishing Call Transcript', type: 'Voice Log', summary: 'Caller impersonated IT Helpdesk requesting immediate credential reset for exec.finance. Duration 4m12s.', source: 'pbx-01', collected_at: t(800), severity: 'high' },
                    { title: 'Mailbox Forwarding Rule Export', type: 'Email Config', summary: 'Forwarding rule to collectmail.net created four minutes after the call — all inbound email redirected.', source: 'mail-gw-01', collected_at: t(550), severity: 'critical' },
                    { title: 'Identity Audit Log', type: 'Auth Log', summary: 'Okta log shows password reset and MFA bypass correlated within the call window. Token issued to unknown device.', source: 'idp-01', collected_at: t(400), severity: 'high' }
                ],
                playback: [
                    { timestamp: t(1200), source: 'PBX Alarm', message: 'Inbound call to finance desk — external caller claiming to be IT Helpdesk.' },
                    { timestamp: t(900), source: 'O365 Audit', message: 'Inbox forwarding rule created for exec.finance — destination is an external domain.' },
                    { timestamp: t(750), source: 'Okta IDP', message: 'Password reset request initiated with no prior change ticket on record.' },
                    { timestamp: t(450), source: 'SOC Alert', message: 'MFA bypass confirmed. Account considered compromised. Escalating to IR.' }
                ]
            },
            'scenario-d': {
                alerts: [
                    { alert_key: 'edge-traffic', title: 'Edge Saturation — 1.8M req/min', host: 'edge-fw-01', timestamp: t(1200), severity: 'critical', status: 'new', technique_id: 'T1498' },
                    { alert_key: 'health-degrade', title: 'API Health Check Failures (76%)', host: 'api-gw-01', timestamp: t(900), severity: 'critical', status: 'new', technique_id: 'T1499' },
                    { alert_key: 'geo-spike', title: 'Anomalous Traffic Spike — CN/RU/BR', host: 'edge-fw-02', timestamp: t(600), severity: 'high', status: 'new', technique_id: 'T1498.002' }
                ],
                logs: [
                    { timestamp: t(1500), host: 'edge-fw-01', sourcetype: 'pan:traffic', event: 'requests_per_second=28450 baseline=380 delta=+7389% src_country=CN,RU,BR' },
                    { timestamp: t(1200), host: 'waf-01', sourcetype: 'waf:event', event: 'rate_limit triggered /api/v2/checkout error_rate=0.78 threshold=0.05' },
                    { timestamp: t(900), host: 'api-gw-01', sourcetype: 'health:check', event: 'health_check FAILED instances=6/8 latency_p99=8200ms' },
                    { timestamp: t(600), host: 'edge-fw-02', sourcetype: 'pan:traffic', event: 'geo_block applied CN=482k RU=215k BR=98k reqs blocked in last 5m' },
                    { timestamp: t(300), host: 'edge-fw-01', sourcetype: 'pan:traffic', event: 'requests_per_second=4812 after rate_limit baseline=380 delta=+1166%' }
                ],
                evidence: [
                    { title: 'Edge Traffic Baseline vs Attack', type: 'Flow Analysis', summary: '1.8M req/min vs 380 baseline. 94% of sources are CN/RU/BR ASNs with no legitimate user pattern.', source: 'edge-fw-01', collected_at: t(1100), severity: 'critical' },
                    { title: 'WAF Rate Limit Trigger Log', type: 'WAF Config', summary: 'WAF auto-engaged on checkout endpoint. Error rate peaked at 78% before mitigation activated.', source: 'waf-01', collected_at: t(800), severity: 'high' },
                    { title: 'Health Check Degradation Record', type: 'Availability Log', summary: '6 of 8 API instances failed health checks during the peak attack window. P99 latency 8.2s.', source: 'api-gw-01', collected_at: t(700), severity: 'critical' }
                ],
                playback: [
                    { timestamp: t(1500), source: 'Edge Monitor', message: 'Requests/sec crosses 10× baseline — volumetric DDoS signature matched.' },
                    { timestamp: t(1200), source: 'WAF', message: 'Rate limiting applied to /api/v2/checkout. Blocking activated at 28k req/s.' },
                    { timestamp: t(900), source: 'Health Check', message: 'API service degradation confirmed — 76% failure rate on health probes.' },
                    { timestamp: t(300), source: 'Network Ops', message: 'Geo-block activated for CN/RU/BR ASNs. Traffic normalizing toward baseline.' }
                ]
            },
            'scenario-e': {
                alerts: [
                    { alert_key: 'usb-copy', title: 'USB Mass Storage Write — 842 MB', host: 'ws-finance-08', timestamp: t(1800), severity: 'critical', status: 'new', technique_id: 'T1052.001' },
                    { alert_key: 'archive-staging', title: '7z.exe Archive Created — payroll-q2.7z', host: 'ws-finance-08', timestamp: t(1500), severity: 'high', status: 'new', technique_id: 'T1560.001' },
                    { alert_key: 'cloud-upload', title: 'Anomalous Cloud Upload — 842 MB to mega.io', host: 'ws-finance-08', timestamp: t(1200), severity: 'critical', status: 'new', technique_id: 'T1567' }
                ],
                logs: [
                    { timestamp: t(2100), host: 'ws-finance-08', sourcetype: 'dlp:agent', event: 'USB storage inserted VID_0781&PID_5583 user=jsmith 11:42:07' },
                    { timestamp: t(1800), host: 'ws-finance-08', sourcetype: 'sysmon:process', event: '7z.exe a payroll-q2.7z C:\\Finance\\payroll\\ -p{REDACTED} bytes_written=882342912' },
                    { timestamp: t(1500), host: 'ws-finance-08', sourcetype: 'dlp:agent', event: 'File copy to USB payroll-q2.7z bytes=882342912 upload=842MB device=SanDisk' },
                    { timestamp: t(1200), host: 'proxy-01', sourcetype: 'web:proxy', event: 'POST https://mega.io/upload user=jsmith bytes_uploaded=882342912 duration=194s' },
                    { timestamp: t(900), host: 'ws-finance-08', sourcetype: 'dlp:agent', event: 'USB device removed total_transferred=842MB session_end=12:16:38' }
                ],
                evidence: [
                    { title: 'USB DLP Transfer Log', type: 'DLP Alert', summary: 'SanDisk device inserted and 842 MB written in a single session. Payload includes payroll-q2.7z.', source: 'dlp-agent', collected_at: t(1700), severity: 'critical' },
                    { title: '7z.exe Archive Artifact', type: 'Process Log', summary: 'Password-protected archive created from C:\\Finance\\payroll\\ — classic pre-exfiltration staging pattern.', source: 'sysmon:process', collected_at: t(1400), severity: 'high' },
                    { title: 'Cloud Upload Proxy Record', type: 'Proxy Log', summary: '842 MB uploaded to mega.io under jsmith credentials in 194 seconds — corroborates USB transfer volume.', source: 'proxy-01', collected_at: t(1100), severity: 'critical' }
                ],
                playback: [
                    { timestamp: t(2100), source: 'DLP Agent', message: 'USB storage device inserted on ws-finance-08 by jsmith.' },
                    { timestamp: t(1800), source: 'Sysmon', message: '7z.exe staged a password-protected archive from the payroll directory.' },
                    { timestamp: t(1500), source: 'DLP Agent', message: '842 MB copied to USB. Filename: payroll-q2.7z. Exfiltration threshold exceeded.' },
                    { timestamp: t(1200), source: 'Proxy', message: 'Cloud upload to mega.io from jsmith — 842 MB over 194 seconds.' }
                ]
            },
            'scenario-f': {
                alerts: [
                    { alert_key: 'impossible-travel', title: 'Impossible Travel — US to SG in 11 min', host: 'cloud-idp-01', timestamp: t(1500), severity: 'critical', status: 'new', technique_id: 'T1078.004' },
                    { alert_key: 'assume-role', title: 'AssumeRole — AdminRole (unapproved)', host: 'cloud-trail-01', timestamp: t(1200), severity: 'critical', status: 'new', technique_id: 'T1548' },
                    { alert_key: 'policy-change', title: 'IAM Policy Attached — AdministratorAccess', host: 'cloud-trail-01', timestamp: t(900), severity: 'critical', status: 'new', technique_id: 'T1484.001' }
                ],
                logs: [
                    { timestamp: t(1800), host: 'cloud-idp-01', sourcetype: 'cloudtrail:signin', event: 'ConsoleLogin user=devops-svc ip=203.0.113.14 region=us-east-1 outcome=Success' },
                    { timestamp: t(1500), host: 'cloud-idp-01', sourcetype: 'cloudtrail:signin', event: 'ConsoleLogin user=devops-svc ip=119.75.216.11 region=ap-southeast-1 outcome=Success delta=11min impossible_travel=true' },
                    { timestamp: t(1200), host: 'cloud-trail-01', sourcetype: 'cloudtrail:iam', event: 'AssumeRole user=devops-svc target=arn:aws:iam::123456789:role/AdminRole first_occurrence=true' },
                    { timestamp: t(900), host: 'cloud-trail-01', sourcetype: 'cloudtrail:iam', event: 'AttachUserPolicy user=devops-svc policy=arn:aws:iam::aws:policy/AdministratorAccess actor=AdminRole' },
                    { timestamp: t(600), host: 'cloud-trail-01', sourcetype: 'cloudtrail:iam', event: 'CreateAccessKey user=devops-svc key_id=AKIA0123456789EXAMPLE actor=AdminRole' }
                ],
                evidence: [
                    { title: 'Impossible Travel Sign-In Pair', type: 'Auth Log', summary: 'Same IAM user authenticated from US-East and Singapore 11 minutes apart — physically impossible travel.', source: 'cloud-idp-01', collected_at: t(1400), severity: 'critical' },
                    { title: 'AssumeRole CloudTrail Record', type: 'Audit Log', summary: 'devops-svc assumed AdminRole with no prior occurrence in baseline — unapproved role chain.', source: 'cloud-trail-01', collected_at: t(1100), severity: 'critical' },
                    { title: 'IAM Policy Attachment Record', type: 'Config Change', summary: 'AdministratorAccess attached to devops-svc by the assumed AdminRole — privilege drift confirmed.', source: 'cloud-trail-01', collected_at: t(800), severity: 'critical' }
                ],
                playback: [
                    { timestamp: t(1800), source: 'CloudTrail', message: 'devops-svc signs in from US East (Virginia) — baseline region.' },
                    { timestamp: t(1500), source: 'IAM Guard', message: 'Impossible travel alert — same user authenticated from Singapore 11 minutes later.' },
                    { timestamp: t(1200), source: 'CloudTrail', message: 'Role assumption chain traced: devops-svc → AdminRole with AdministratorAccess policy.' },
                    { timestamp: t(900), source: 'SOC Alert', message: 'Policy drift confirmed. Access key created under AdminRole. Containment required immediately.' }
                ]
            }
        };
    }());

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

    // Fix #9 — URL param is always evaluated first; localStorage error no longer shadows it.
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

    // Fix #2 — Local alert-state map persisted to localStorage.
    let alertStates = loadAlertStates();

    document.title = `ResponseGrid - ${config.title}`;
    hydrateStaticCopy();
    startTimer('timer', config.timerSeconds, { storageKey: `irsp-${scenarioId}-timer` });
    bindQueryControls();
    hydrateScenario();

    // Fix #9 — resolveScenarioId: URL param evaluated first, localStorage only as fallback,
    // parse errors handled without swallowing a valid URL param result.
    function resolveScenarioId() {
        const params = new URLSearchParams(window.location.search);
        const queryScenario = params.get('scenario');
        if (SCENARIOS[queryScenario]) return queryScenario;

        try {
            const workspace = JSON.parse(localStorage.getItem('irsp-active-workspace')) || {};
            if (SCENARIOS[workspace.scenarioId]) return workspace.scenarioId;
        } catch (_) { /* storage corrupt — fall through to default */ }

        return 'scenario-c';
    }

    function loadAlertStates() {
        try {
            return JSON.parse(localStorage.getItem(`irsp-${scenarioId}-alert-states`)) || {};
        } catch (_) {
            return {};
        }
    }

    function saveAlertStates() {
        try {
            localStorage.setItem(`irsp-${scenarioId}-alert-states`, JSON.stringify(alertStates));
        } catch (_) { /* storage full or unavailable — silently skip */ }
    }

    function safeWorkspaceState() {
        try {
            return JSON.parse(localStorage.getItem('irsp-active-workspace')) || {};
        } catch (_) {
            return {};
        }
    }

    function formatDateTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Booted from the Launch Bay';
        return date.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    function formatTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '--';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }

    function severityBadge(severity) {
        const n = String(severity || '').toLowerCase();
        if (n === 'critical') return 'red';
        if (n === 'high') return 'yellow';
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
        const ws = safeWorkspaceState();
        const isCurrent = ws.scenarioId === scenarioId;

        els.title.textContent = config.title;
        els.subtitle.textContent = config.subtitle;
        els.owner.textContent = config.owner;
        els.environment.textContent = config.environment;
        els.riskBadge.textContent = config.badgeLabel;
        els.riskBadge.className = `status-badge ${config.badgeClass}`;
        els.workspaceName.textContent = isCurrent ? (ws.workspace || config.workspace) : config.workspace;
        els.workspaceVm.textContent = `VM: ${isCurrent ? (ws.vmName || config.vmName) : config.vmName}`;
        els.workspaceEnvironment.textContent = isCurrent ? (ws.environment || config.environment) : config.environment;
        els.workspaceStarted.textContent = isCurrent ? formatDateTime(ws.startedAt) : 'Booted from the Launch Bay';
        els.workspaceStatus.textContent = isCurrent ? 'VM Running' : 'VM Ready';
        els.services.textContent = config.services;
        els.workspaceNote.textContent = `Launch flow is wired through the app and backed by seeded ${scenarioId} telemetry.`;
        els.queryInput.value = config.chips[0] || '';

        els.queryChips.innerHTML = config.chips.map(function (chip, i) {
            return `<button class="chip-btn${i === 0 ? ' active' : ''}" type="button" data-query="${escapeHtml(chip)}">${escapeHtml(chip)}</button>`;
        }).join('');

        Array.from(els.queryChips.querySelectorAll('[data-query]')).forEach(function (btn) {
            btn.addEventListener('click', function () {
                Array.from(els.queryChips.querySelectorAll('.chip-btn')).forEach(n => n.classList.remove('active'));
                btn.classList.add('active');
                els.queryInput.value = btn.dataset.query || '';
                runSearch();
            });
        });
    }

    function bindQueryControls() {
        document.getElementById('generic-run-query').addEventListener('click', runSearch);
        els.queryInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
        });
    }

    // Fix #3 — Tries API first; on any failure or unavailability falls back to SEED_DATA.
    // Applies persisted alertStates overlay before first render.
    // Fix #6 — Auto-runs the initial chip query after data is ready.
    async function hydrateScenario() {
        let fromSeed = false;

        try {
            if (!window.IRSPApi || !window.IRSPApi.isAvailable()) {
                throw new Error('API unavailable');
            }

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

        } catch (_) {
            const seed = SEED_DATA[scenarioId] || {};
            alerts = (seed.alerts || []).map(a => Object.assign({}, a));
            logs = seed.logs || [];
            evidence = seed.evidence || [];
            playback = seed.playback || [];
            fromSeed = true;
        }

        // Fix #3 — Apply persisted alert-state overlay so re-renders reflect prior actions.
        alerts = alerts.map(function (a) {
            return alertStates[a.alert_key]
                ? Object.assign({}, a, { status: alertStates[a.alert_key] })
                : a;
        });

        renderAlerts();
        renderResults(logs);
        renderEvidence();
        renderPlayback();
        renderObjectives();

        if (fromSeed) {
            const ts = window.IRSP ? window.IRSP.getTimestamp() : '--';
            els.alertStatus.textContent = `Loaded ${alerts.length} seeded alert${alerts.length === 1 ? '' : 's'} at ${ts} (offline mode)`;
            els.evidenceStatus.textContent = `${evidence.length} item${evidence.length === 1 ? '' : 's'} in the locker (seeded)`;
            els.liveStatus.textContent = `${playback.length} update${playback.length === 1 ? '' : 's'} from seeded playback`;
        }

        // Fix #6 — Populate Search table immediately with the pre-selected chip query.
        runSearch();
    }

    // Fix #5 — Applies alertStates overlay before generating HTML so button labels and
    // disabled state survive every re-render without needing an API round-trip.
    function renderAlerts() {
        const ts = window.IRSP ? window.IRSP.getTimestamp() : '--';
        els.alertCount.textContent = String(alerts.length).padStart(2, '0');
        els.alertNote.textContent = alerts.length
            ? `${alerts.filter(a => a.severity === 'critical').length} critical alert${alerts.filter(a => a.severity === 'critical').length === 1 ? '' : 's'} require attention.`
            : 'No active alerts for this scenario.';

        if (!alerts.length) {
            els.alertsBody.innerHTML = '<tr><td colspan="4" class="surface-note">No seeded alerts available.</td></tr>';
            els.alertStatus.textContent = `Alert queue empty at ${ts}`;
            return;
        }

        const actionedStatuses = new Set(['investigating', 'acknowledged', 'contained']);
        const actionLabels = { investigate: 'Investigated', acknowledge: 'Acknowledged', contain: 'Contained' };

        els.alertsBody.innerHTML = alerts.map(function (item) {
            const savedStatus = alertStates[item.alert_key];
            const displayStatus = savedStatus || item.status || item.severity;
            const isActioned = actionedStatuses.has(String(savedStatus).toLowerCase());

            const actionBtns = isActioned
                ? `<button class="chip-btn" type="button" disabled style="opacity:0.55;cursor:not-allowed;">${actionLabels[savedStatus] || escapeHtml(savedStatus)}</button>`
                : `<button class="chip-btn" type="button" data-action="investigate" data-alert-key="${escapeHtml(item.alert_key)}">Investigate</button>
                   <button class="chip-btn" type="button" data-action="acknowledge" data-alert-key="${escapeHtml(item.alert_key)}">Acknowledge</button>
                   <button class="chip-btn" type="button" data-action="contain" data-alert-key="${escapeHtml(item.alert_key)}">Contain</button>`;

            return `
                <tr style="${isActioned ? 'opacity:0.72;' : ''}">
                    <td>${escapeHtml(formatTime(item.timestamp))}</td>
                    <td>${escapeHtml(item.host)}</td>
                    <td>
                        <div style="font-weight:600;">${escapeHtml(item.title)}</div>
                        <div class="surface-note">${escapeHtml(item.technique_id || item.status)}</div>
                    </td>
                    <td>
                        <div class="action-stack" style="gap:0.4rem;">
                            <span class="status-badge ${severityBadge(item.severity)}">${escapeHtml(displayStatus)}</span>
                            <div class="command-chips" style="margin-top:0.4rem;">${actionBtns}</div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        Array.from(els.alertsBody.querySelectorAll('[data-action]')).forEach(function (btn) {
            btn.addEventListener('click', function () {
                postAction(btn.dataset.alertKey, btn.dataset.action);
            });
        });

        els.alertStatus.textContent = `Loaded ${alerts.length} alert${alerts.length === 1 ? '' : 's'} at ${ts}`;
    }

    // Fix #4 — Mutates local state immediately and re-renders without waiting for the API.
    // API POST is attempted as a non-blocking fire-and-forget.
    async function postAction(alertKey, action) {
        const statusMap = { investigate: 'investigating', acknowledge: 'acknowledged', contain: 'contained' };
        const newStatus = statusMap[action] || action;

        alertStates[alertKey] = newStatus;
        saveAlertStates();

        const target = alerts.find(a => a.alert_key === alertKey);
        if (target) target.status = newStatus;

        renderAlerts();
        renderObjectives();

        const ts = window.IRSP ? window.IRSP.getTimestamp() : '--';
        els.alertStatus.textContent = `${action.charAt(0).toUpperCase() + action.slice(1)} applied at ${ts}`;

        if (window.IRSPApi && window.IRSPApi.isAvailable()) {
            try {
                await window.IRSPApi.postAction({ scenario_id: scenarioId, alert_key: alertKey, action });
            } catch (_) { /* non-critical — local state is already updated */ }
        }
    }

    // Fix #7 — Tries the API, falls back to localSearch() when unavailable.
    async function runSearch() {
        const query = els.queryInput.value.trim();
        const ts = window.IRSP ? window.IRSP.getTimestamp() : '--';

        if (window.IRSPApi && window.IRSPApi.isAvailable()) {
            try {
                const payload = await window.IRSPApi.search({ scenario: scenarioId, q: query });
                const results = payload.results || [];
                renderResults(results);
                els.queryStatus.textContent = `Search completed at ${ts} — ${payload.total_matches || results.length} result${results.length === 1 ? '' : 's'}.`;
                return;
            } catch (_) { /* fall through to local search */ }
        }

        const results = localSearch(query);
        renderResults(results);
        els.queryStatus.textContent = query
            ? `Found ${results.length} result${results.length === 1 ? '' : 's'} for "${escapeHtml(query)}" from seeded telemetry at ${ts}.`
            : `Showing all ${results.length} seeded log entries at ${ts}.`;
    }

    // Fix #7 — Local search filters the in-memory logs array against host, sourcetype, and event.
    function localSearch(query) {
        if (!query) return logs;
        const q = query.toLowerCase();
        return logs.filter(function (item) {
            return String(item.host || '').toLowerCase().includes(q) ||
                   String(item.sourcetype || '').toLowerCase().includes(q) ||
                   String(item.event || '').toLowerCase().includes(q);
        });
    }

    function renderResults(items) {
        if (!items || !items.length) {
            els.resultsBody.innerHTML = '<tr><td colspan="4" class="surface-note" style="padding:0.75rem;">No results match the current query.</td></tr>';
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

    // Fix #5 — Removed the unstyled .alert-indicator div that was breaking the flex layout.
    // Border-left color is now driven by an inline style on the .alert-item element itself.
    function renderEvidence() {
        els.evidenceCount.textContent = String(evidence.length).padStart(2, '0');
        els.evidenceNote.textContent = evidence.length
            ? `Evidence locker updated through ${formatTime(evidence[0].collected_at)}.`
            : 'No evidence has been collected yet.';
        els.evidenceStatus.textContent = `${evidence.length} item${evidence.length === 1 ? '' : 's'} in the locker`;

        if (!evidence.length) {
            els.evidenceList.innerHTML = '<div class="surface-note">No evidence items available.</div>';
            return;
        }

        const borderColor = { red: 'var(--accent-red)', yellow: 'var(--accent-yellow)', blue: 'var(--accent-blue)', green: 'var(--accent-green)' };

        els.evidenceList.innerHTML = evidence.map(function (item) {
            const badge = severityBadge(item.severity);
            const border = borderColor[badge] || 'var(--accent-red)';
            return `
                <div class="alert-item" style="border-left-color:${border};">
                    <div class="alert-info" style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:flex-start;">
                            <h4>${escapeHtml(item.title)}</h4>
                            <span class="status-badge ${badge}">${escapeHtml(item.type)}</span>
                        </div>
                        <p>${escapeHtml(item.summary)}</p>
                        <div class="surface-note">Source: ${escapeHtml(item.source)} &bull; Collected: ${escapeHtml(formatTime(item.collected_at))}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderPlayback() {
        els.liveStatus.textContent = playback.length
            ? `${playback.length} update${playback.length === 1 ? '' : 's'} loaded from playback.`
            : 'No playback updates yet.';

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

    // Fix #10 — Guards icon refresh with a direct lucide check instead of relying solely
    // on window.IRSP.refreshIcons, which may not yet be initialised on first synchronous render.
    function renderObjectives() {
        const completed = config.objectives.filter(obj => obj.complete(alerts, evidence));
        const percent = config.objectives.length
            ? Math.round((completed.length / config.objectives.length) * 100)
            : 0;

        els.progress.textContent = `${percent}%`;
        els.progressFill.style.width = `${percent}%`;
        els.progressNote.textContent = `${completed.length} of ${config.objectives.length} response goals completed.`;
        els.objectiveStatus.textContent = percent === 100
            ? 'Scenario objectives complete. Continue reviewing evidence and playback for the full story.'
            : 'Advance alerts and evidence collection to complete more objectives.';

        els.objectives.innerHTML = config.objectives.map(function (item) {
            const done = completed.includes(item);
            return `
                <li class="objective-item${done ? ' complete' : ''}">
                    <i data-lucide="${done ? 'check-circle' : 'circle'}" style="color:${done ? 'var(--accent-green)' : 'var(--text-dim)'};"></i>
                    ${escapeHtml(item.label)}
                </li>
            `;
        }).join('');

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        } else if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') {
            window.IRSP.refreshIcons();
        }
    }
})();
