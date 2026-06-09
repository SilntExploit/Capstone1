(function () {
    'use strict';

    const DATA_URL = 'mock-data/scenario-b-investigation.json';
    const STATE_KEY = 'irsp-scenario-b-state';
    const REPORT_KEY = 'irsp-scenario-b-report';

    // Embedded fallback ensures the page works without a local server (file://)
    const FALLBACK_DATA = {
        meta: {
            subtitle: 'Sanitized Windows endpoint exports drive this exercise. No VM is required: trainees investigate a downloaded evidence pack built from realistic Sysmon, PowerShell, Security, Task Scheduler, proxy, and DNS telemetry.',
            workspace_note: 'Evidence-pack workflow using sanitized Windows Server and workstation exports instead of a live VM.',
            environment_copy: 'Offline Windows endpoint evidence pack',
            services_copy: 'Query shell, IOC evidence board, timeline review, host logs, and local run scoring.',
            target_value: 'LSASS',
            target_note: 'Credential dumping via procdump.exe remains the clearest escalation clue in the case file.',
            ioc_note: 'Four seeded indicators came from sanitized host, email, DNS, and proxy exports.'
        },
        alerts: [
            { id: 'dns-alert', level: 'warning', title: 'Suspicious outbound DNS queries', description: 'WS-FINANCE-03 queried dns-tunnel.malware.io 1,200 times per minute.', action: 'Investigate', action_type: 'investigate' },
            { id: 'lsass-alert', level: 'critical', title: 'Credential dump detected (LSASS)', description: 'procdump.exe accessed lsass.exe on WS-FINANCE-03 with memory-read permissions.', action: 'Contain', action_type: 'contain' },
            { id: 'task-alert', level: 'info', title: 'New scheduled task created', description: 'WindowsUpdate_svc was registered with SYSTEM privileges and an AtLogon trigger.', action: 'Review', action_type: 'remove_persistence' }
        ],
        queries: [
            {
                id: 'credential-dumping', label: 'Credential Dumping',
                query: 'host == "WS-FINANCE-03" and ("procdump.exe" or "dns-tunnel.malware.io")',
                search: 'ResponseGridLogs\n| where host == "WS-FINANCE-03" and ("procdump.exe" or "dns-tunnel.malware.io")\n| summarize earliest = min(timestamp), latest = max(timestamp) by host, process_name, parent_process, user, dest_domain, task_name\n\n09:14:25 powershell.exe WINWORD.EXE finance-user dns-tunnel.malware.io -\n09:31:42 procdump.exe cmd.exe finance-user - -\n09:45:14 schtasks.exe cmd.exe SYSTEM - WindowsUpdate_svc\n\ncorrelation: phishing > PowerShell > LSASS dump > scheduled task persistence',
                raw: '09:31:42 WS-FINANCE-03 sysmon:process Image=C:\\Tools\\procdump.exe TargetImage=C:\\Windows\\System32\\lsass.exe GrantedAccess=0x1010\n09:45:14 WS-FINANCE-03 windows:taskscheduler TaskName=WindowsUpdate_svc Author=SYSTEM Trigger=AtLogon\n09:18:11 proxy-01 web:proxy dest_ip=203.0.113.42 sni=update-win365.net action=allowed',
                timeline: '09:12 phishing email delivered\n09:14 macro execution and PowerShell launcher\n09:18 outbound C2 established\n09:31 LSASS access observed\n09:45 scheduled task persistence registered',
                status: 'Correlation view loaded for the active investigation chain.'
            },
            {
                id: 'initial-access', label: 'Initial Access',
                query: 'host == "WS-FINANCE-03" and ("phish-invoice.docm" or "powershell.exe")',
                search: 'ResponseGridLogs\n| where host == "WS-FINANCE-03" and ("phish-invoice.docm" or "powershell.exe")\n| project timestamp, process_name, parent_process, user, file_name, command_line\n\n09:14:22 WINWORD.EXE explorer.exe finance-user phish-invoice.docm macro enabled\n09:14:25 powershell.exe WINWORD.EXE finance-user - encoded command executed\n\nlaunch chain confirms phishing-led initial access.',
                raw: '09:14:25 WS-FINANCE-03 powershell:operational ParentImage=WINWORD.EXE CommandLine=powershell.exe -enc SQBFAFgA...\n09:12:03 mail-gw-01 o365:message_trace sender=billing@invoice-sync.net subject="Invoice review" attachment=phish-invoice.docm',
                timeline: '09:12 email delivered\n09:14 document opened\n09:14 macro launched PowerShell',
                status: 'Initial access query completed. Document-to-PowerShell chain confirmed.'
            },
            {
                id: 'persistence', label: 'Persistence',
                query: 'host == "WS-FINANCE-03" and ("WindowsUpdate_svc" or "schtasks.exe")',
                search: 'ResponseGridLogs\n| where host == "WS-FINANCE-03" and ("WindowsUpdate_svc" or "schtasks.exe")\n| project timestamp, process_name, parent_process, user, task_name, trigger\n\n09:45:14 schtasks.exe cmd.exe SYSTEM WindowsUpdate_svc AtLogon\n09:45:17 taskeng.exe services.exe SYSTEM WindowsUpdate_svc Registered\n\npersistence is active at user logon with SYSTEM privileges.',
                raw: '09:45:14 WS-FINANCE-03 windows:taskscheduler TaskName=WindowsUpdate_svc Trigger=AtLogon Author=SYSTEM\n09:45:18 WS-FINANCE-03 security EventID=4698 TaskName=WindowsUpdate_svc SubjectUserName=SYSTEM',
                timeline: '09:31 credential access\n09:45 scheduled task created\n09:46 persistence checkpoint reached',
                status: 'Persistence query completed. Scheduled task remains the active foothold.'
            }
        ],
        evidence: [
            { record_id: 'ioc-domain', indicator: 'dns-tunnel.malware.io', type: 'Domain', severity: 'Critical', status: 'Confirmed IOC', summary: 'High-volume DNS tunneling aligned with beaconing from the compromised workstation.', json: '{\n  "indicator": "dns-tunnel.malware.io",\n  "type": "domain",\n  "host": "WS-FINANCE-03",\n  "query_volume_per_min": 1200,\n  "first_seen": "2026-03-24T09:18:02Z",\n  "classification": "dns-tunneling",\n  "confidence": "high"\n}', note: 'Pivot to proxy and DNS telemetry. This IOC is the strongest command-and-control signal in the run.' },
            { record_id: 'ioc-ip', indicator: '203.0.113.42', type: 'IP Address', severity: 'Critical', status: 'C2 Server', summary: 'Outbound TLS sessions from the workstation and proxy tier resolve to the active attacker node.', json: '{\n  "indicator": "203.0.113.42",\n  "type": "ip",\n  "dest_port": 443,\n  "sni": "update-win365.net",\n  "host": "WS-FINANCE-03",\n  "first_seen": "2026-03-24T09:18:05Z",\n  "classification": "c2",\n  "confidence": "high"\n}', note: 'Use this IOC for network block simulation and for validating proxy-enforced containment.' },
            { record_id: 'ioc-tool', indicator: 'procdump.exe', type: 'Tool', severity: 'High', status: 'Under Review', summary: 'Credential dumping utility executed against LSASS with memory-read permissions.', json: '{\n  "indicator": "procdump.exe",\n  "type": "tool",\n  "host": "WS-FINANCE-03",\n  "target_process": "lsass.exe",\n  "parent_process": "cmd.exe",\n  "user": "finance-user",\n  "classification": "credential_dumping",\n  "confidence": "medium-high"\n}', note: 'This artifact should drive both the credential-access finding and the host containment recommendation.' },
            { record_id: 'ioc-file', indicator: 'phish-invoice.docm', type: 'File', severity: 'High', status: 'Initial Vector', summary: 'Macro-enabled document delivered through phishing and linked to the first PowerShell execution.', json: '{\n  "indicator": "phish-invoice.docm",\n  "type": "file",\n  "sender": "billing@invoice-sync.net",\n  "recipient": "finance-user@corp.local",\n  "macro_enabled": true,\n  "child_process": "powershell.exe",\n  "classification": "initial_access",\n  "confidence": "high"\n}', note: 'Keep this selected during stakeholder demos to show clear mapping from phishing artifact to host compromise.' }
        ],
        timeline: [
            { time: '09:12:00', desc: 'Phishing email received by finance-user@corp.local with a macro-enabled attachment.' },
            { time: '09:14:22', desc: 'User opens phish-invoice.docm and the macro launches a PowerShell dropper.' },
            { time: '09:18:05', desc: 'Reverse shell established from WS-FINANCE-03 to 203.0.113.42:443.' },
            { time: '09:31:40', desc: 'Credentials dumped from lsass.exe using procdump.exe.' },
            { time: '09:45:12', desc: 'Persistence established via scheduled task WindowsUpdate_svc.' }
        ],
        logs: [
            { time: '09:12:03', host: 'mail-gw-01', sourcetype: 'o365:message_trace', event: 'Message delivered from billing@invoice-sync.net with attachment phish-invoice.docm' },
            { time: '09:14:25', host: 'WS-FINANCE-03', sourcetype: 'powershell:operational', event: 'Encoded command executed from WINWORD.EXE child process' },
            { time: '09:18:11', host: 'proxy-01', sourcetype: 'web:proxy', event: 'TLS session established to 203.0.113.42 SNI=update-win365.net' },
            { time: '09:31:42', host: 'WS-FINANCE-03', sourcetype: 'sysmon:process', event: 'procdump.exe opened lsass.exe with PROCESS_VM_READ access' },
            { time: '09:45:14', host: 'WS-FINANCE-03', sourcetype: 'windows:taskscheduler', event: 'Task registration name=WindowsUpdate_svc author=SYSTEM trigger=AtLogon' }
        ],
        comms: {
            base: [
                { sender: 'System', message: 'Scenario B loaded from a sanitized Windows endpoint evidence pack.' },
                { sender: 'IR Lead', message: 'Start with the email and PowerShell chain to lock down initial access.' },
                { sender: 'Forensics', message: 'LSASS access is confirmed. Preserve that evidence before cleanup.' },
                { sender: 'SOC', message: 'The suspicious domain appears in both DNS and proxy exports.' }
            ]
        }
    };

    const workspaceState = safeWorkspaceState();
    startTimer('timer', 1800, { storageKey: 'irsp-scenario-b-timer' });

    const subtitle = document.getElementById('scenario-b-subtitle');
    const workspaceName = document.getElementById('scenario-b-workspace-name');
    const workspaceVm = document.getElementById('scenario-b-workspace-vm');
    const workspaceStarted = document.getElementById('scenario-b-workspace-started');
    const workspaceStatus = document.getElementById('scenario-b-workspace-status');
    const workspaceNote = document.getElementById('scenario-b-workspace-note');
    const environmentCopy = document.getElementById('scenario-b-environment-copy');
    const servicesCopy = document.getElementById('scenario-b-services-copy');

    const iocCount = document.getElementById('scenario-b-ioc-count');
    const iocNote = document.getElementById('scenario-b-ioc-note');
    const completionValue = document.getElementById('scenario-b-completion-value');
    const completionNote = document.getElementById('scenario-b-completion-note');
    const targetValue = document.getElementById('scenario-b-target-value');
    const targetNote = document.getElementById('scenario-b-target-note');

    const alertsContainer = document.getElementById('scenario-b-alerts');
    const evidenceBody = document.getElementById('scenario-b-evidence-body');
    const timelineList = document.getElementById('scenario-b-timeline-list');
    const logsBody = document.getElementById('scenario-b-logs-body');
    const commsBox = document.getElementById('scenario-b-comms-box');
    const commsInput = document.getElementById('scenario-b-comms-input');

    const queryInput = document.getElementById('scenario-b-query-input');
    const runQueryButton = document.getElementById('scenario-b-run-query');
    const searchPanel = document.getElementById('scenario-b-search-panel');
    const rawPanel = document.getElementById('scenario-b-raw-panel');
    const timelinePanel = document.getElementById('scenario-b-timeline-panel');
    const queryStatus = document.getElementById('scenario-b-query-status');
    const queryButtons = Array.from(document.querySelectorAll('[data-scenario-b-query]'));
    const queryShellCard = runQueryButton ? runQueryButton.closest('.card') : null;

    const detailIndicator = document.getElementById('scenario-b-detail-indicator');
    const detailType = document.getElementById('scenario-b-detail-type');
    const detailSeverity = document.getElementById('scenario-b-detail-severity');
    const detailStatus = document.getElementById('scenario-b-detail-status');
    const detailSummary = document.getElementById('scenario-b-detail-summary');
    const detailJson = document.getElementById('scenario-b-detail-json');
    const detailNote = document.getElementById('scenario-b-detail-note-panel');
    const evidenceNote = document.getElementById('scenario-b-evidence-note');

    const progressText = document.getElementById('scenario-b-progress-text');
    const progressFill = document.getElementById('scenario-b-progress-fill');
    const objectiveNodes = Array.from(document.querySelectorAll('[data-objective]'));

    const containButton = document.getElementById('scenario-b-action-contain');
    const queryButton = document.getElementById('scenario-b-action-query');
    const removeButton = document.getElementById('scenario-b-action-remove');
    const resetButton = document.getElementById('scenario-b-action-reset');

    let dataset = null;
    let investigationState = safeReadState();

    function safeWorkspaceState() {
        try {
            return JSON.parse(localStorage.getItem('irsp-active-workspace')) || {};
        } catch (error) {
            return {};
        }
    }

    function safeReadState() {
        try {
            return JSON.parse(localStorage.getItem(STATE_KEY)) || defaultState();
        } catch (error) {
            return defaultState();
        }
    }

    function defaultState() {
        return {
            viewedEvidence: [],
            activeQueryId: 'credential-dumping',
            initialVectorConfirmed: false,
            timelineBuilt: false,
            hostContained: false,
            persistenceRemoved: false
        };
    }

    function persistState() {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify(investigationState));
        } catch (e) { /* storage unavailable */ }
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatWorkspaceStart(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Evidence pack loaded locally';
        return 'Loaded ' + date.toLocaleString();
    }

    function severityBadgeClass(severity) {
        return severity === 'Critical' ? 'red' : severity === 'High' ? 'yellow' : 'blue';
    }

    function actionButtonClass(type, completed) {
        if (completed) return 'btn btn-secondary';
        return type === 'contain' ? 'btn btn-danger' : 'btn btn-secondary';
    }

    function markObjective(key, complete) {
        const node = objectiveNodes.find(function (item) {
            return item.dataset.objective === key;
        });
        if (!node) return;

        node.classList.toggle('complete', complete);
        const icon = node.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', complete ? 'check-circle' : 'circle');
            icon.style.color = complete ? 'var(--accent-green)' : 'var(--text-dim)';
        }
    }

    function buildReport() {
        if (!dataset) return null;

        const evidenceCount = Array.isArray(dataset.evidence) ? dataset.evidence.length : 0;
        const mappedAll = evidenceCount > 0 && investigationState.viewedEvidence.length >= evidenceCount;
        const completionMap = {
            entry: investigationState.initialVectorConfirmed,
            map: mappedAll,
            timeline: investigationState.timelineBuilt,
            contain: investigationState.hostContained,
            remove: investigationState.persistenceRemoved
        };
        const completedCount = Object.values(completionMap).filter(Boolean).length;
        const score = Math.round((completedCount / 5) * 100);
        const status = score >= 85 ? 'Passed' : score >= 60 ? 'Needs Improvement' : 'Failed';
        const strengths = [];
        const gaps = [];

        if (completionMap.entry) strengths.push('Initial access was tied back to the phishing document and PowerShell launcher.');
        if (completionMap.map) strengths.push('All seeded IOCs were reviewed and mapped on the evidence board.');
        if (completionMap.timeline) strengths.push('The compromise timeline was reconstructed from sanitized endpoint telemetry.');
        if (completionMap.contain) strengths.push('Host containment was executed without requiring a live VM.');
        if (completionMap.remove) strengths.push('The persistence mechanism was identified and removed from the case workflow.');

        if (!completionMap.entry) gaps.push('Initial access still needs confirmation from the email and PowerShell artifacts.');
        if (!completionMap.map) gaps.push('Not all indicators have been reviewed in the evidence board.');
        if (!completionMap.timeline) gaps.push('The full incident timeline has not been assembled yet.');
        if (!completionMap.contain) gaps.push('The compromised endpoint has not been logically contained yet.');
        if (!completionMap.remove) gaps.push('Scheduled task persistence is still active in the run state.');

        return {
            id: 'live-scenario-b',
            title: 'Scenario B – Compromised Host',
            scenario: 'B',
            team: (workspaceState && (workspaceState.team || workspaceState.trainee)) || 'Local Investigation Analyst',
            date: new Date().toISOString().slice(0, 10),
            duration: currentDuration(),
            score,
            status,
            summary: 'Live Scenario B report generated from the local Windows evidence pack workflow.',
            strengths: strengths.length ? strengths : ['The evidence pack is loaded, but no major investigation objectives are complete yet.'],
            gaps: gaps.length ? gaps : ['No major investigation gaps remain in the current run.'],
            next: completionMap.remove
                ? 'Export the report and reuse this run as the benchmark no-VM endpoint investigation flow.'
                : 'Finish containment and persistence removal before exporting the final report.',
            containment: completionMap.contain ? 92 : 58,
            investigation: completionMap.timeline ? 94 : completionMap.entry ? 78 : 56,
            comms: completionMap.map ? 86 : 70,
            feedback: {
                title: 'Latest Feedback – Scenario B (' + new Date().toLocaleDateString() + ')',
                positives: [
                    completionMap.entry
                        ? 'Initial access was quickly tied to the phishing document and PowerShell child process.'
                        : 'The entry chain still needs clearer validation from the phishing artifact.',
                    completionMap.timeline
                        ? 'Timeline reconstruction was coherent and followed the host compromise sequence cleanly.'
                        : 'Timeline work needs one more correlation pass across the host and proxy artifacts.'
                ],
                improvements: [
                    completionMap.contain
                        ? 'Containment was applied cleanly without losing the evidence pack context.'
                        : 'Contain the compromised host earlier once the credential dumping event is confirmed.',
                    completionMap.remove
                        ? 'Persistence removal sequencing is now aligned with the evidence trail.'
                        : 'Remove the WindowsUpdate_svc persistence item after preserving the scheduled task evidence.'
                ],
                checklist: [
                    { title: 'Validate phishing-to-PowerShell chain', note: 'Confirm the initial access path from email to execution.', done: completionMap.entry },
                    { title: 'Review all seeded IOCs', note: 'Map every indicator in the evidence board.', done: completionMap.map },
                    { title: 'Contain the compromised endpoint', note: 'Perform logical host isolation from the evidence pack workflow.', done: completionMap.contain }
                ],
                nextSteps: [
                    'Practice the same run using only the raw logs panel before opening the summarized query view.',
                    'Capture the timeline first, then move into containment and persistence removal.',
                    'Use the selected evidence panel as the basis for stakeholder updates and report writeups.'
                ]
            }
        };
    }

    function persistReport() {
        try {
            const report = buildReport();
            if (report) {
                localStorage.setItem(REPORT_KEY, JSON.stringify(report));
            }
        } catch (e) { /* storage unavailable */ }
    }

    function resetScenario() {
        try {
            localStorage.removeItem(STATE_KEY);
            localStorage.removeItem(REPORT_KEY);
            localStorage.removeItem('irsp-scenario-b-evidence');
            localStorage.removeItem('irsp-scenario-b-timer');
        } catch (e) { /* storage unavailable */ }
        window.location.reload();
    }

    function currentDuration() {
        const timer = document.getElementById('timer');
        const parts = String(timer && timer.textContent || '00:00:00').split(':').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return '--:--';
        const elapsed = Math.max(0, 1800 - ((parts[0] * 3600) + (parts[1] * 60) + parts[2]));
        const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const seconds = String(elapsed % 60).padStart(2, '0');
        return minutes + ':' + seconds;
    }

    function renderWorkspace() {
        if (!dataset) return;
        if (subtitle) subtitle.textContent = dataset.meta.subtitle;
        if (workspaceNote) workspaceNote.textContent = dataset.meta.workspace_note;
        if (environmentCopy) environmentCopy.textContent = dataset.meta.environment_copy;
        if (servicesCopy) servicesCopy.textContent = dataset.meta.services_copy;
        if (targetValue) targetValue.textContent = dataset.meta.target_value;
        if (targetNote) targetNote.textContent = dataset.meta.target_note;
        if (iocNote) iocNote.textContent = dataset.meta.ioc_note;

        if (workspaceName) {
            workspaceName.textContent = (workspaceState && workspaceState.workspace) || 'Windows Evidence Pack Workspace';
        }
        if (workspaceVm) {
            workspaceVm.textContent = 'Evidence Pack: ws-finance-03_sanitized_bundle';
        }
        if (workspaceStarted) {
            workspaceStarted.textContent = workspaceState && workspaceState.startedAt
                ? formatWorkspaceStart(workspaceState.startedAt)
                : 'Evidence pack loaded locally';
        }
        if (workspaceStatus) {
            workspaceStatus.textContent = 'Pack Loaded';
            workspaceStatus.className = 'status-badge green';
        }
    }

    function renderAlerts() {
        if (!dataset || !alertsContainer) return;

        alertsContainer.innerHTML = dataset.alerts.map(function (alert) {
            const completed = (alert.action_type === 'contain' && investigationState.hostContained)
                || (alert.action_type === 'remove_persistence' && investigationState.persistenceRemoved)
                || (alert.action_type === 'investigate' && investigationState.initialVectorConfirmed);

            const label = completed
                ? (alert.action_type === 'contain' ? 'Contained' : alert.action_type === 'remove_persistence' ? 'Reviewed' : 'Investigated')
                : alert.action;

            // 'critical' has no extra class (the default alert-item border is red); other levels use their name
            const levelClass = alert.level !== 'critical' ? alert.level : '';

            return '<div class="alert-item' + (levelClass ? ' ' + levelClass : '') + '">'
                + '<div class="alert-info">'
                + '<h4>' + escapeHtml(alert.title) + '</h4>'
                + '<p>' + escapeHtml(alert.description) + '</p>'
                + '</div>'
                + '<button class="' + actionButtonClass(alert.action_type, completed) + '" type="button" data-alert-action="' + escapeHtml(alert.action_type) + '"' + (completed ? ' disabled' : '') + '>' + escapeHtml(label) + '</button>'
                + '</div>';
        }).join('');

        Array.from(alertsContainer.querySelectorAll('[data-alert-action]')).forEach(function (button) {
            button.addEventListener('click', function () {
                applyAction(button.dataset.alertAction);
            });
        });
    }

    function renderEvidence() {
        if (!dataset || !evidenceBody) return;

        evidenceBody.innerHTML = dataset.evidence.map(function (item) {
            return '<tr data-record-id="' + escapeHtml(item.record_id) + '"'
                + ' data-indicator="' + escapeHtml(item.indicator) + '"'
                + ' data-type="' + escapeHtml(item.type) + '"'
                + ' data-severity="' + escapeHtml(item.severity) + '"'
                + ' data-status="' + escapeHtml(item.status) + '"'
                + ' data-summary="' + escapeHtml(item.summary) + '"'
                + ' data-json="' + escapeHtml(item.json) + '"'
                + ' data-note="' + escapeHtml(item.note) + '"'
                + ' tabindex="0">'
                + '<td>' + escapeHtml(item.indicator) + '</td>'
                + '<td>' + escapeHtml(item.type) + '</td>'
                + '<td><span class="status-badge ' + severityBadgeClass(item.severity) + '">' + escapeHtml(item.severity) + '</span></td>'
                + '<td>' + escapeHtml(item.status) + '</td>'
                + '</tr>';
        }).join('');

        initRecordExplorer({
            rowsSelector: '#scenario-b-evidence-board tbody tr',
            storageKey: 'irsp-scenario-b-evidence',
            onSelect: function (row) {
                if (detailIndicator) detailIndicator.textContent = row.dataset.indicator || '--';
                if (detailType) detailType.textContent = row.dataset.type || '--';
                if (detailSeverity) {
                    detailSeverity.textContent = row.dataset.severity || '--';
                    detailSeverity.style.color = row.dataset.severity === 'Critical' ? 'var(--accent-red)' : 'var(--accent-yellow)';
                }
                if (detailStatus) detailStatus.textContent = row.dataset.status || '--';
                if (detailSummary) detailSummary.textContent = row.dataset.summary || '';
                if (detailJson) detailJson.textContent = row.dataset.json || '';
                if (detailNote) detailNote.textContent = row.dataset.note || '';

                if (!investigationState.viewedEvidence.includes(row.dataset.recordId)) {
                    investigationState.viewedEvidence.push(row.dataset.recordId);
                }
                if (row.dataset.recordId === 'ioc-file') {
                    investigationState.initialVectorConfirmed = true;
                }
                if (evidenceNote) evidenceNote.textContent = row.dataset.indicator + ' selected for deeper review.';
                persistState();
                renderDerivedState();
            }
        });
    }

    function renderTimeline() {
        if (!dataset || !timelineList) return;

        timelineList.innerHTML = dataset.timeline.map(function (item) {
            return '<div class="timeline-item">'
                + '<span class="time">' + escapeHtml(item.time) + '</span>'
                + '<p class="desc">' + escapeHtml(item.desc) + '</p>'
                + '</div>';
        }).join('');
    }

    function renderLogs() {
        if (!dataset || !logsBody) return;

        logsBody.innerHTML = dataset.logs.map(function (item) {
            return '<tr>'
                + '<td>' + escapeHtml(item.time) + '</td>'
                + '<td>' + escapeHtml(item.host) + '</td>'
                + '<td>' + escapeHtml(item.sourcetype) + '</td>'
                + '<td>' + escapeHtml(item.event) + '</td>'
                + '</tr>';
        }).join('');
    }

    function renderComms() {
        if (!dataset || !commsBox) return;

        const messages = dataset.comms.base.slice();

        if (investigationState.hostContained) {
            messages.push({ sender: 'IR Lead', message: 'Host isolation applied logically inside the evidence-pack workflow.' });
        }
        if (investigationState.persistenceRemoved) {
            messages.push({ sender: 'Forensics', message: 'WindowsUpdate_svc has been marked removed after evidence review.' });
        }
        if (investigationState.timelineBuilt) {
            messages.push({ sender: 'SOC', message: 'Timeline is complete from email delivery through persistence.' });
        }

        commsBox.innerHTML = messages.map(function (item) {
            return '<div class="msg"><span class="msg-sender">' + escapeHtml(item.sender) + ':</span> ' + escapeHtml(item.message) + '</div>';
        }).join('');

        commsBox.scrollTop = commsBox.scrollHeight;
    }

    function renderQuery(queryId) {
        if (!dataset || !Array.isArray(dataset.queries) || !dataset.queries.length) return;

        const profile = dataset.queries.find(function (item) {
            return item.id === queryId;
        }) || dataset.queries[0];

        investigationState.activeQueryId = profile.id;
        if (profile.id === 'initial-access') {
            investigationState.initialVectorConfirmed = true;
        }
        if (profile.id === 'credential-dumping') {
            investigationState.timelineBuilt = true;
        }

        if (queryInput) queryInput.value = profile.query;
        if (searchPanel) searchPanel.textContent = profile.search;
        if (rawPanel) rawPanel.textContent = profile.raw;
        if (timelinePanel) timelinePanel.textContent = profile.timeline;
        if (queryStatus) queryStatus.textContent = profile.status;

        queryButtons.forEach(function (button, index) {
            const linkedProfile = dataset.queries[index];
            const isActive = linkedProfile && linkedProfile.id === profile.id;
            button.classList.toggle('active', isActive);
            if (linkedProfile) {
                button.textContent = linkedProfile.label;
                button.dataset.queryId = linkedProfile.id;
            }
        });

        persistState();
        renderDerivedState();
    }

    function tokenizeQuery(query) {
        return String(query || '')
            .toLowerCase()
            .split(/[^a-z0-9_.-]+/i)
            .map(function (token) { return token.trim(); })
            .filter(function (token) { return token.length >= 2; });
    }

    function scoreText(text, tokens) {
        const haystack = String(text || '').toLowerCase();
        return tokens.reduce(function (score, token) {
            return score + (haystack.includes(token) ? 1 : 0);
        }, 0);
    }

    function buildAdhocQueryResult(query) {
        if (!dataset) return null;

        const tokens = tokenizeQuery(query);
        if (!tokens.length) return null;

        const matchedLogs = dataset.logs.filter(function (item) {
            return scoreText(item.time + ' ' + item.host + ' ' + item.sourcetype + ' ' + item.event, tokens) > 0;
        });

        const matchedEvidence = dataset.evidence.filter(function (item) {
            return scoreText(item.indicator + ' ' + item.type + ' ' + item.status + ' ' + item.summary + ' ' + item.note, tokens) > 0;
        });

        const matchedTimeline = dataset.timeline.filter(function (item) {
            return scoreText(item.time + ' ' + item.desc, tokens) > 0;
        });

        const combined = matchedLogs.length + matchedEvidence.length + matchedTimeline.length;

        if (!combined) {
            return {
                search: 'ResponseGridLogs\n| search ' + query + '\n\nNo matching evidence was found in the local Scenario B pack for that query.',
                raw: 'No matching raw records found.',
                timeline: 'No matching timeline checkpoints found.',
                status: 'Query executed at ' + IRSP.getTimestamp() + '. No matches were found for: ' + query
            };
        }

        const searchLines = matchedLogs.slice(0, 6).map(function (item) {
            return item.time + ' ' + item.host + ' ' + item.sourcetype + ' ' + item.event;
        });
        const rawLines = matchedEvidence.slice(0, 4).map(function (item) {
            return item.indicator + ' | ' + item.type + ' | ' + item.status + ' | ' + item.summary;
        });
        const timelineLines = matchedTimeline.slice(0, 5).map(function (item) {
            return item.time + ' ' + item.desc;
        });

        if (!investigationState.timelineBuilt && matchedLogs.some(function (item) {
            return /procdump|powershell|schtasks/i.test(item.event);
        })) {
            investigationState.timelineBuilt = true;
        }

        if (!investigationState.initialVectorConfirmed && matchedEvidence.some(function (item) {
            return item.record_id === 'ioc-file';
        })) {
            investigationState.initialVectorConfirmed = true;
        }

        persistState();
        renderDerivedState();

        return {
            search: 'ResponseGridLogs\n| search ' + query + '\n\n' + (searchLines.join('\n') || 'No matching log lines.'),
            raw: rawLines.join('\n') || 'No matching evidence records.',
            timeline: timelineLines.join('\n') || 'No matching timeline checkpoints.',
            status: 'Query executed at ' + IRSP.getTimestamp() + '. Found ' + combined + ' matching record' + (combined === 1 ? '' : 's') + ' for: ' + query
        };
    }

    function focusQueryShell(message) {
        if (message && queryStatus) {
            queryStatus.textContent = message;
        }

        if (queryShellCard) {
            queryShellCard.style.outline = '2px solid var(--accent-blue)';
            queryShellCard.style.outlineOffset = '0';
            queryShellCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

            window.setTimeout(function () {
                queryShellCard.style.outline = '';
                queryShellCard.style.outlineOffset = '';
            }, 1400);
        }
    }

    function nextQuickQueryId() {
        if (!dataset || !Array.isArray(dataset.queries) || !dataset.queries.length) {
            return 'credential-dumping';
        }
        if (!investigationState.initialVectorConfirmed) return 'initial-access';
        if (!investigationState.timelineBuilt) return 'credential-dumping';
        if (!investigationState.persistenceRemoved) return 'persistence';

        const currentIndex = dataset.queries.findIndex(function (item) {
            return item.id === investigationState.activeQueryId;
        });
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % dataset.queries.length : 0;
        return dataset.queries[nextIndex].id;
    }

    function renderDerivedState() {
        if (!dataset) return;

        const evidenceCount = dataset.evidence.length;
        const mappedAll = investigationState.viewedEvidence.length >= evidenceCount;
        const completionMap = {
            entry: investigationState.initialVectorConfirmed,
            map: mappedAll,
            timeline: investigationState.timelineBuilt,
            contain: investigationState.hostContained,
            remove: investigationState.persistenceRemoved
        };
        const completedCount = Object.values(completionMap).filter(Boolean).length;
        const percent = Math.round((completedCount / 5) * 100);

        markObjective('entry', completionMap.entry);
        markObjective('map', completionMap.map);
        markObjective('timeline', completionMap.timeline);
        markObjective('contain', completionMap.contain);
        markObjective('remove', completionMap.remove);

        if (completionValue) completionValue.textContent = percent + '%';
        if (completionNote) {
            completionNote.textContent = completionMap.remove
                ? 'Endpoint compromise chain is documented, contained, and remediated from the evidence pack.'
                : 'Work through evidence mapping, timeline correlation, host containment, and persistence removal.';
        }
        if (progressText) progressText.textContent = 'Completion: ' + percent + '%';
        if (progressFill) progressFill.style.width = percent + '%';
        if (iocCount) iocCount.textContent = String(dataset.evidence.length).padStart(2, '0');

        // Use innerHTML to preserve lucide icon elements inside the buttons
        if (containButton) {
            containButton.disabled = completionMap.contain;
            containButton.innerHTML = completionMap.contain
                ? '<i data-lucide="shield-check"></i> Host Isolated'
                : '<i data-lucide="plug-zap"></i> Isolate WS-FINANCE-03';
        }
        if (removeButton) {
            removeButton.disabled = completionMap.remove;
            removeButton.innerHTML = completionMap.remove
                ? '<i data-lucide="check-circle"></i> Scheduled Task Removed'
                : '<i data-lucide="trash-2"></i> Remove Scheduled Task';
        }

        persistReport();
        IRSP.refreshIcons();
    }

    function applyAction(action) {
        if (!dataset) return;

        if (action === 'investigate') {
            renderQuery('initial-access');
            return;
        }

        if (action === 'contain') {
            investigationState.hostContained = true;
        }

        if (action === 'remove_persistence') {
            investigationState.persistenceRemoved = true;
            investigationState.timelineBuilt = true;
        }

        persistState();
        renderAlerts();
        renderComms();
        renderDerivedState();
    }

    // Bind comms input: append user messages and simulate a system reply
    if (commsInput && commsBox) {
        commsInput.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter') return;
            const value = commsInput.value.trim();
            if (!value) return;

            const userMsg = document.createElement('div');
            userMsg.className = 'msg';
            userMsg.innerHTML = '<span class="msg-sender">You:</span> ' + escapeHtml(value);
            commsBox.appendChild(userMsg);
            commsBox.scrollTop = commsBox.scrollHeight;
            commsInput.value = '';

            window.setTimeout(function () {
                const sysMsg = document.createElement('div');
                sysMsg.className = 'msg';
                sysMsg.innerHTML = '<span class="msg-sender">System:</span> Message logged to the incident channel.';
                commsBox.appendChild(sysMsg);
                commsBox.scrollTop = commsBox.scrollHeight;
            }, 300);
        });
    }

    async function loadData() {
        try {
            dataset = await IRSP.fetchJSON(DATA_URL);
        } catch (error) {
            // Fall back to embedded data so all event handlers remain functional
            dataset = FALLBACK_DATA;
            if (queryStatus) {
                queryStatus.textContent = 'Evidence pack loaded from local cache.';
            }
        }

        renderWorkspace();
        renderAlerts();
        renderEvidence();
        renderTimeline();
        renderLogs();
        renderComms();
        renderQuery(investigationState.activeQueryId || 'credential-dumping');
        renderDerivedState();
    }

    if (runQueryButton) {
        runQueryButton.addEventListener('click', function () {
            if (!dataset) return;

            const query = queryInput ? queryInput.value.trim() : '';
            const match = dataset.queries.find(function (item) {
                return item.query === query;
            });

            if (match) {
                renderQuery(match.id);
                focusQueryShell('Preset query executed at ' + IRSP.getTimestamp() + ': ' + match.label);
                return;
            }

            const adHoc = buildAdhocQueryResult(query);
            if (!adHoc) {
                focusQueryShell('Enter a keyword like powershell, lsass, invoice, schtasks, or 203.0.113.42.');
                return;
            }

            if (searchPanel) searchPanel.textContent = adHoc.search;
            if (rawPanel) rawPanel.textContent = adHoc.raw;
            if (timelinePanel) timelinePanel.textContent = adHoc.timeline;
            if (queryStatus) queryStatus.textContent = adHoc.status;
            queryButtons.forEach(function (button) { button.classList.remove('active'); });
            focusQueryShell(adHoc.status);
        });
    }

    if (queryInput) {
        queryInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (runQueryButton) runQueryButton.click();
            }
        });
    }

    queryButtons.forEach(function (button, index) {
        button.addEventListener('click', function () {
            if (!dataset || !dataset.queries) return;
            const profile = dataset.queries[index];
            if (!profile) return;
            renderQuery(profile.id);
        });
    });

    if (containButton) {
        containButton.addEventListener('click', function () {
            applyAction('contain');
            renderAlerts();
            renderComms();
        });
    }

    if (queryButton) {
        queryButton.addEventListener('click', function () {
            const nextId = nextQuickQueryId();
            renderQuery(nextId);

            const labelMap = {
                'initial-access': 'Query shell pivoted to initial access evidence.',
                'credential-dumping': 'Query shell pivoted to credential dumping correlation.',
                'persistence': 'Query shell pivoted to persistence review.'
            };

            focusQueryShell(labelMap[nextId] || 'Query shell updated.');
        });
    }

    if (removeButton) {
        removeButton.addEventListener('click', function () {
            applyAction('remove_persistence');
            renderAlerts();
            renderComms();
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', function () {
            resetScenario();
        });
    }

    loadData();
})();
