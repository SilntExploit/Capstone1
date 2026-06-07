(function () {
    'use strict';

    // ── DOM references ────────────────────────────────────────────────────────
    const objectives         = Array.from(document.querySelectorAll('[data-objective]'));
    const progressText       = document.getElementById('scenario-a-progress-text');
    const progressFill       = document.getElementById('scenario-a-progress-fill');
    const progressMetric     = document.getElementById('scenario-a-progress-metric');
    const progressNote       = document.getElementById('scenario-a-progress-note');
    const workspaceName      = document.getElementById('scenario-a-workspace-name');
    const workspaceVm        = document.getElementById('scenario-a-workspace-vm');
    const workspaceStarted   = document.getElementById('scenario-a-workspace-started');
    const workspaceStatus    = document.getElementById('scenario-a-workspace-status');
    const workspaceNote      = document.getElementById('scenario-a-workspace-note');
    const environmentCopy    = document.getElementById('scenario-a-environment-copy');
    const servicesCopy       = document.getElementById('scenario-a-services-copy');
    const riskNote           = document.getElementById('scenario-a-risk-note');
    const eventsNote         = document.getElementById('scenario-a-events-note');
    const commsBox           = document.getElementById('scenario-a-comms-box');
    const termOutput         = document.getElementById('term-output');
    const artifactsPanel     = document.getElementById('scenario-a-artifacts-panel');
    const commandInput       = document.getElementById('scenario-a-command-input');
    const executeButton      = document.getElementById('scenario-a-execute');
    const statusLine         = document.getElementById('scenario-a-status-line');
    const pidValue           = document.getElementById('scenario-a-pid-value');
    const pidNote            = document.getElementById('scenario-a-pid-note');
    const filesValue         = document.getElementById('scenario-a-files-value');
    const filesNote          = document.getElementById('scenario-a-files-note');
    const eventsBody         = document.getElementById('scenario-a-events-body');
    const startLabButton     = document.getElementById('scenario-a-start-lab');
    const stopLabButton      = document.getElementById('scenario-a-stop-lab');
    const resetLabButton     = document.getElementById('scenario-a-reset-lab');
    const resetTopButton     = document.getElementById('scenario-a-reset-top');
    const presetButtons      = Array.from(document.querySelectorAll('[data-shell-command]'));
    const processAlert       = document.getElementById('scenario-a-alert-process');
    const processAlertTitle  = document.getElementById('scenario-a-alert-process-title');
    const processAlertCopy   = document.getElementById('scenario-a-alert-process-copy');
    const processAlertButton = document.getElementById('scenario-a-alert-process-btn');
    const scriptAlert        = document.getElementById('scenario-a-alert-script');
    const scriptAlertTitle   = document.getElementById('scenario-a-alert-script-title');
    const scriptAlertCopy    = document.getElementById('scenario-a-alert-script-copy');
    const scriptAlertButton  = document.getElementById('scenario-a-alert-script-btn');
    const c2Alert            = document.getElementById('scenario-a-alert-c2');
    const c2AlertTitle       = document.getElementById('scenario-a-alert-c2-title');
    const c2AlertCopy        = document.getElementById('scenario-a-alert-c2-copy');
    const c2AlertButton      = document.getElementById('scenario-a-alert-c2-btn');

    // ── Storage keys ──────────────────────────────────────────────────────────
    const SIM_STATE_KEY = 'irsp-scenario-a-sim-state';
    const SNAPSHOT_KEY  = 'irsp-scenario-a-snapshot-captured';
    const REPORT_KEY    = 'irsp-scenario-a-report';

    // ── Module state ──────────────────────────────────────────────────────────
    let labState         = null;
    let terminalHydrated = false;
    let pollInterval     = null;
    let useSimulation    = false;

    // Disable input immediately — enabled once lab state is known
    commandInput.disabled  = true;
    executeButton.disabled = true;
    commandInput.placeholder = 'Initializing lab...';

    // ── Workspace metadata ────────────────────────────────────────────────────
    const workspaceState = (function () {
        try { return JSON.parse(localStorage.getItem('irsp-active-workspace')) || {}; } catch (_) { return {}; }
    })();

    // ── Timer ─────────────────────────────────────────────────────────────────
    startTimer('timer', 2700, { storageKey: 'irsp-scenario-a-timer' });

    // ── Simulation engine ─────────────────────────────────────────────────────
    const INITIAL_SIM_STATE = {
        running:          true,
        status:           'running',
        pid:              4821,
        process_active:   true,
        process_line:     'root  4821  89.2  3.1 /tmp/.encrypt.sh --target /data --key rsa2048',
        script_present:   true,
        network_isolated: false,
        c2_blocked:       false,
        snapshot_captured: false,
        snapshot_path:    null,
        evidence_hash:    '6df3e1e7de10d9cf938e1a04f8ef120f54f8adf78f2e44d0f8b2217f9b27ac49',
        encrypted_files:  [
            '/srv/shared/customer-ledger.xlsx.lock',
            '/srv/shared/hr-roster.csv.lock',
            '/srv/shared/april-payroll.zip.lock'
        ],
        files: [
            '/srv/shared/customer-ledger.xlsx.lock',
            '/srv/shared/hr-roster.csv.lock',
            '/srv/shared/april-payroll.zip.lock'
        ],
        recent_logs: [
            '2024-01-01T14:21:58Z execve pid=4821 exe=/bin/bash cmd=/tmp/.encrypt.sh',
            '2024-01-01T14:22:07Z outbound connection to 203.0.113.42:8443 process=bash',
            '2024-01-01T14:22:19Z rename burst detected under /srv/shared affected_files=412',
            '2024-01-01T14:22:44Z delivered message subject="Updated payroll policy" attachment=policy_update.iso'
        ]
    };

    function loadSimState() {
        try {
            const raw = localStorage.getItem(SIM_STATE_KEY);
            if (!raw) return Object.assign({}, INITIAL_SIM_STATE);
            return Object.assign({}, INITIAL_SIM_STATE, JSON.parse(raw));
        } catch (_) {
            return Object.assign({}, INITIAL_SIM_STATE);
        }
    }

    function saveSimState(state) {
        try { localStorage.setItem(SIM_STATE_KEY, JSON.stringify(state)); } catch (_) {}
    }

    function resetSimState() {
        const fresh = Object.assign({}, INITIAL_SIM_STATE, {
            running:          true,
            process_active:   true,
            script_present:   true,
            network_isolated: false,
            c2_blocked:       false,
            snapshot_captured: false,
            snapshot_path:    null
        });
        saveSimState(fresh);
        saveSnapshotCapture(false);
        return fresh;
    }

    function simExecCommand(raw, state) {
        const cmd   = String(raw || '').trim().replace(/\s+/g, ' ');
        const lower = cmd.toLowerCase();
        let output       = '';
        let ok           = true;
        let stateChanged = false;

        // ps aux | grep
        if (/^ps aux \| grep/.test(lower)) {
            if (state.process_active) {
                output = state.process_line + '\n' +
                         `root  ${state.pid + 1}  0.0  0.0 grep --color=auto encrypt`;
            } else {
                output = `root  ${state.pid + 10}  0.0  0.0 grep --color=auto encrypt`;
            }
        }
        // kill -9 <pid>
        else if (/^kill\s+-9\s+(\d+)/.test(lower)) {
            const m         = lower.match(/kill\s+-9\s+(\d+)/);
            const targetPid = parseInt(m[1], 10);
            if (state.process_active && targetPid === state.pid) {
                state.process_active = false;
                output       = '';
                stateChanged = true;
            } else {
                output = `bash: kill: (${targetPid}) - No such process`;
                ok     = false;
            }
        }
        // rm /tmp/.encrypt.sh
        else if (/^rm\s+(-f\s+)?\/tmp\/\.encrypt\.sh/.test(lower)) {
            if (state.script_present) {
                state.script_present = false;
                output       = '';
                stateChanged = true;
            } else {
                output = 'rm: cannot remove \'/tmp/.encrypt.sh\': No such file or directory';
                ok     = false;
            }
        }
        // iptables … 203.0.113.42 … DROP  (targeted C2 block)
        else if (/iptables.*output.*203\.0\.113\.42.*drop/.test(lower) || /iptables.*203\.0\.113\.42.*output.*drop/.test(lower)) {
            if (!state.c2_blocked) {
                state.c2_blocked = true;
                output       = '';
                stateChanged = true;
            } else {
                output = '# iptables: rule already exists.';
            }
        }
        // iptables -A OUTPUT -j DROP  (full container isolation — no specific dest)
        else if (/iptables.*-a output -j drop/.test(lower) && !/203\.0\.113/.test(lower)) {
            if (!state.network_isolated) {
                state.network_isolated = true;
                state.c2_blocked       = true;
                output       = '';
                stateChanged = true;
            } else {
                output = '# Blanket OUTPUT DROP already in place.';
            }
        }
        // docker network disconnect
        else if (/^docker network disconnect/.test(lower)) {
            if (!state.network_isolated) {
                state.network_isolated = true;
                state.c2_blocked       = true;
                output       = '';
                stateChanged = true;
            } else {
                output = 'Error response from daemon: container is already disconnected from the network.';
            }
        }
        // sha256sum /tmp/.encrypt.sh
        else if (/^sha256sum\s+\/tmp\/\.encrypt\.sh/.test(lower)) {
            if (state.script_present) {
                state.snapshot_captured = true;
                state.snapshot_path     = `/forensics/scenario-a-${Date.now()}.sha256`;
                output       = `${state.evidence_hash}  /tmp/.encrypt.sh`;
                stateChanged = true;
                saveSnapshotCapture(true);
            } else {
                output = 'sha256sum: /tmp/.encrypt.sh: No such file or directory';
                ok     = false;
            }
        }
        // netstat … 8443
        else if (/netstat.*8443/.test(lower)) {
            if (!state.network_isolated && !state.c2_blocked && state.process_active) {
                output = `tcp   0   0 10.77.4.23:49812   203.0.113.42:8443   ESTABLISHED ${state.pid}/bash`;
            } else if (state.network_isolated) {
                output = '(No connections — container egress is isolated)';
            } else if (state.c2_blocked) {
                output = '(No ESTABLISHED connections to 203.0.113.42)';
            } else {
                output = '';
            }
        }
        // lsof -p <pid>
        else if (/^lsof\s+-p\s+(\d+)/.test(lower)) {
            const m         = lower.match(/lsof\s+-p\s+(\d+)/);
            const targetPid = parseInt(m[1], 10);
            if (state.process_active && targetPid === state.pid) {
                output = (state.files || []).join('\n') || '(no open files)';
            } else {
                output = `lsof: no process ID ${targetPid}`;
                ok     = false;
            }
        }
        // find /srv/shared
        else if (/^find\s+\/srv\/shared/.test(lower)) {
            output = (state.files || []).join('\n') || '(no files found)';
        }
        // docker inspect
        else if (/^docker inspect/.test(lower)) {
            output = state.running ? 'running' : 'exited';
        }
        // clear
        else if (lower === 'clear') {
            termOutput.innerHTML = '';
            return { output: null, ok: true, state, stateChanged: false, clear: true };
        }
        // lab status / status
        else if (lower === 'lab status' || lower === 'status') {
            output = [
                `Lab status      : ${state.running ? 'RUNNING' : 'STOPPED'}`,
                `PID ${state.pid}          : ${state.process_active ? 'ACTIVE' : 'terminated'}`,
                `/tmp/.encrypt.sh : ${state.script_present ? 'PRESENT' : 'removed'}`,
                `C2 beacon        : ${state.c2_blocked ? 'BLOCKED' : 'OPEN (203.0.113.42:8443)'}`,
                `Network isolation: ${state.network_isolated ? 'ACTIVE' : 'inactive'}`,
                `Forensic snapshot: ${state.snapshot_captured ? state.snapshot_path : 'not captured'}`
            ].join('\n');
        }
        // help
        else if (lower === 'help') {
            output = [
                'Available commands (simulation mode):',
                '  ps aux | grep encrypt              – inspect active processes',
                '  kill -9 <pid>                      – terminate a process',
                '  rm -f /tmp/.encrypt.sh             – remove the malware script',
                '  iptables -A OUTPUT -d 203.0.113.42 -j DROP  – block C2 beacon',
                '  iptables -A OUTPUT -j DROP         – full container network isolation',
                '  sha256sum /tmp/.encrypt.sh         – export forensic artifact hash',
                '  netstat -plant | grep 8443         – inspect active C2 connections',
                '  lsof -p <pid>                      – list open files for a process',
                '  find /srv/shared                   – list encrypted files on disk',
                '  lab status                         – print current lab state summary',
                '  clear                              – clear the terminal'
            ].join('\n');
        }
        // unknown
        else {
            const base = cmd.split(' ')[0];
            output = `bash: ${base}: command not found`;
            ok     = false;
        }

        if (stateChanged) {
            saveSimState(state);
        }

        return { output, ok, state, stateChanged };
    }

    // ── Utility helpers ───────────────────────────────────────────────────────
    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function appendPromptLine(command) {
        termOutput.insertAdjacentHTML('beforeend',
            `<div class="term-line"><span class="prompt">root@container-01:~#</span> ${escapeHtml(command)}</div>`);
    }

    function appendOutputBlock(text, variant) {
        if (text === null || text === undefined) return;
        const cls = variant ? `term-line ${variant}` : 'term-line';
        String(text).split('\n').forEach(function (line) {
            termOutput.insertAdjacentHTML('beforeend',
                `<div class="${cls}">${escapeHtml(line)}</div>`);
        });
        termOutput.scrollTop = termOutput.scrollHeight;
    }

    function renderComms(messages) {
        if (!commsBox) return;
        commsBox.innerHTML = messages.map(function (item) {
            return `<div class="msg"><span class="msg-sender"${item.color ? ` style="color:${item.color};"` : ''}>${escapeHtml(item.sender)}:</span> ${escapeHtml(item.message)}</div>`;
        }).join('');
        commsBox.scrollTop = commsBox.scrollHeight;
    }

    function hasSnapshotCapture() {
        return localStorage.getItem(SNAPSHOT_KEY) === 'true';
    }

    function saveSnapshotCapture(value) {
        try { localStorage.setItem(SNAPSHOT_KEY, value ? 'true' : 'false'); } catch (_) {}
    }

    function getTimestamp() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }

    function readTimerRemainingSeconds() {
        const timer = document.getElementById('timer');
        const parts = String(timer && timer.textContent || '00:00:00').split(':').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return 0;
        return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    }

    function formatDurationFromRemaining() {
        const elapsed  = Math.max(0, 2700 - readTimerRemainingSeconds());
        const minutes  = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const seconds  = String(elapsed % 60).padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    // ── Report builder ────────────────────────────────────────────────────────
    function buildScenarioReport(state) {
        const snapshotCaptured = !!(state && (state.snapshot_captured || hasSnapshotCapture()));
        const completed = {
            entry:     true,
            isolate:   !!(state && state.network_isolated),
            kill:      !!(state && !state.process_active),
            eradicate: !!(state && !state.script_present),
            block:     !!(state && state.c2_blocked),
            restore:   snapshotCaptured
        };
        const completedCount = Object.values(completed).filter(Boolean).length;
        const score  = Math.round((completedCount / 6) * 100);
        const status = score >= 85 ? 'Passed' : score >= 60 ? 'Needs Improvement' : 'Failed';
        const strengths = [], gaps = [];

        if (completed.entry)     strengths.push('Entry vector was identified from the seeded telemetry.');
        if (completed.isolate)   strengths.push('Container-wide egress isolation was applied.');
        if (completed.kill)      strengths.push('The active encryption process was terminated.');
        if (completed.eradicate) strengths.push('The active simulator script was removed from /tmp.');
        if (completed.block)     strengths.push('The known beacon path to 203.0.113.42 was blocked.');
        if (completed.restore)   strengths.push('A forensic snapshot hash was exported before reset.');

        if (!completed.isolate)   gaps.push('Container network isolation has not been applied yet.');
        if (!completed.kill)      gaps.push('The encryption process is still active.');
        if (!completed.eradicate) gaps.push('The malicious script remains on disk.');
        if (!completed.block)     gaps.push('The known C2 route is still open.');
        if (!completed.restore)   gaps.push('A forensic snapshot has not been exported yet.');

        return {
            id:          'live-scenario-a',
            title:       'Scenario A – Ransomware',
            scenario:    'A',
            team:        (workspaceState && (workspaceState.team || workspaceState.trainee)) || 'Local Docker Analyst',
            date:        new Date().toISOString().slice(0, 10),
            duration:    formatDurationFromRemaining(),
            score,
            status,
            summary:     state && state.running
                ? 'Live Scenario A run sourced directly from the local Docker lab state.'
                : 'Most recent Scenario A lab snapshot captured from the local Docker workflow.',
            strengths:   strengths.length ? strengths : ['Scenario initialized but no containment actions have completed yet.'],
            gaps:        gaps.length ? gaps : ['No major gaps remain in the current Scenario A run.'],
            next:        completed.restore
                ? 'Review the exported snapshot and use this run as the benchmark for future containment drills.'
                : 'Capture the forensic snapshot before resetting so the reports workflow has a preserved artifact trail.',
            containment: completed.isolate ? 96 : completed.kill ? 74 : 58,
            investigation: completed.restore ? 92 : completed.eradicate ? 76 : 60,
            comms:       completed.block ? 88 : 70
        };
    }

    function persistScenarioReport(state) {
        try { localStorage.setItem(REPORT_KEY, JSON.stringify(buildScenarioReport(state))); } catch (_) {}
    }

    // ── Objectives ────────────────────────────────────────────────────────────
    function clearObjective(key) {
        const obj  = objectives.find(function (item) { return item.dataset.objective === key; });
        if (!obj) return;
        obj.classList.remove('complete');
        const icon = obj.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', 'circle');
            icon.style.color = 'var(--text-dim)';
        }
    }

    function markComplete(key) {
        const obj = objectives.find(function (item) { return item.dataset.objective === key; });
        if (!obj || obj.classList.contains('complete')) return;
        obj.classList.add('complete');
        const icon = obj.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', 'check-circle');
            icon.style.color = 'var(--accent-green)';
        }
    }

    function applyObjectiveState() {
        markComplete('entry');
        clearObjective('isolate');
        clearObjective('kill');
        clearObjective('eradicate');
        clearObjective('block');
        clearObjective('restore');

        if (labState && !labState.running) {
            const complete = objectives.filter(function (i) { return i.classList.contains('complete'); }).length;
            const percent  = Math.round((complete / objectives.length) * 100);
            progressText.textContent   = `Completion: ${percent}%`;
            progressFill.style.width   = `${percent}%`;
            progressMetric.textContent = `${percent}%`;
            progressNote.textContent   = 'Start or reset the lab to continue the scenario.';
            IRSP.refreshIcons();
            return;
        }

        if (labState) {
            if (!labState.process_active)  markComplete('kill');
            if (labState.network_isolated) markComplete('isolate');
            if (!labState.script_present)  markComplete('eradicate');
            if (labState.c2_blocked)       markComplete('block');
        }

        if (labState && labState.snapshot_captured) saveSnapshotCapture(true);
        if (hasSnapshotCapture()) markComplete('restore');

        const complete = objectives.filter(function (i) { return i.classList.contains('complete'); }).length;
        const percent  = Math.round((complete / objectives.length) * 100);
        progressText.textContent   = `Completion: ${percent}%`;
        progressFill.style.width   = `${percent}%`;
        progressMetric.textContent = `${percent}%`;
        progressNote.textContent   = percent >= 100
            ? 'All containment goals complete. Reset or restart the lab to replay the scenario.'
            : useSimulation
                ? 'Simulation mode — use the terminal or chip buttons to progress through objectives.'
                : 'The page is now reading actual state from the local Docker container.';

        IRSP.refreshIcons();
    }

    // ── UI render helpers ─────────────────────────────────────────────────────
    function setButtonState(button, enabled, text, className) {
        if (!button) return;
        button.disabled   = !enabled;
        button.textContent = text;
        button.className  = className;
    }

    function renderWorkspace() {
        workspaceName.textContent    = (workspaceState && workspaceState.workspace) || 'Ransomware Containment Workspace';
        workspaceVm.textContent      = 'Container: responsegrid-scenario-a';
        workspaceStarted.textContent = workspaceState && workspaceState.startedAt
            ? `Booted ${new Date(workspaceState.startedAt).toLocaleString()}`
            : useSimulation ? 'Simulation mode — no Docker required' : 'Awaiting local lab start';
        workspaceNote.textContent    = useSimulation
            ? 'Running in browser simulation mode — no Docker connection.'
            : 'Local Docker container running the Scenario A simulator.';
        environmentCopy.textContent  = 'Ubuntu container with a safe ransomware simulator';
        servicesCopy.textContent     = useSimulation
            ? 'Full browser-side simulation: process control, firewall rules, artifact capture.'
            : 'Real container shell, live file impact, lab logs, and artifact inspection.';
    }

    function renderStoppedState(state) {
        workspaceStatus.textContent  = 'Lab Stopped';
        workspaceStatus.className    = 'status-badge blue';
        workspaceStarted.textContent = state.status === 'not_created'
            ? 'Lab container has not been created yet.'
            : 'Container exists but is currently stopped.';
        riskNote.textContent   = 'The local lab is not running. Start or reset it to continue.';
        pidValue.textContent   = '--';
        pidNote.textContent    = 'No active simulator process.';
        filesValue.textContent = '00';
        filesNote.textContent  = 'No live container state is available while the lab is stopped.';
        eventsNote.textContent = 'Start the lab to stream container log events.';
        artifactsPanel.textContent = 'artifact=/tmp/.encrypt.sh\nstatus=lab stopped\n\nStart or reset the lab to inspect live artifacts.';
        eventsBody.innerHTML = '<tr><td colspan="4" class="surface-note">The local lab is stopped. Start or reset it to view live events.</td></tr>';

        renderComms([
            { sender: 'System',   message: 'Scenario A lab is currently stopped.' },
            { sender: 'Operator', message: 'Use Start Lab to resume or Reset Lab to recreate the container from scratch.' }
        ]);

        processAlert.className = 'alert-item info';
        processAlertTitle.textContent = 'Local lab is stopped';
        processAlertCopy.textContent  = 'Start or reset the container before attempting containment actions.';
        setButtonState(processAlertButton, false, 'Start Lab First', 'btn btn-secondary');
        processAlertButton.dataset.shellCommand = '';

        scriptAlert.className = 'alert-item info';
        scriptAlertTitle.textContent = 'Artifact cleanup unavailable';
        scriptAlertCopy.textContent  = 'The container is not running, so there is no active script state to change.';
        setButtonState(scriptAlertButton, false, 'Lab Stopped', 'btn btn-secondary');
        scriptAlertButton.dataset.shellCommand = '';

        c2Alert.className = 'alert-item info';
        c2AlertTitle.textContent = 'Network controls unavailable';
        c2AlertCopy.textContent  = 'Start the container before applying outbound containment.';
        setButtonState(c2AlertButton, false, 'Lab Stopped', 'btn btn-secondary');
        c2AlertButton.dataset.shellCommand = '';

        setButtonState(startLabButton, true,  state.status === 'not_created' ? 'Create & Start Lab' : 'Start Lab', 'chip-btn');
        setButtonState(stopLabButton,  false, 'Stop Lab',  'chip-btn');
        setButtonState(resetLabButton, true,  'Reset Lab', 'chip-btn');
        setButtonState(resetTopButton, true,  'Reset Lab', 'chip-btn');
        executeButton.disabled   = true;
        commandInput.disabled    = true;
        commandInput.placeholder = 'Start the lab to run commands...';
        applyObjectiveState();
    }

    function renderRunningState(state) {
        workspaceStatus.textContent = 'Lab Running';
        workspaceStatus.className   = 'status-badge green';
        workspaceStarted.textContent = useSimulation
            ? 'Simulation mode active'
            : `Booted ${new Date().toLocaleString()}`;

        riskNote.textContent = state.network_isolated
            ? 'Full container egress isolation is active. Continue cleanup and evidence preservation.'
            : state.process_active
                ? 'The simulator process is still active inside the local container.'
                : 'The simulator process has been stopped. Focus on cleanup and evidence.';

        pidValue.textContent = state.process_active ? String(state.pid) : '--';
        pidNote.textContent  = state.process_active
            ? `Active simulator process: ${state.process_line || '/tmp/.encrypt.sh'}`
            : 'The ransomware simulator process is no longer running.';

        const fileCount = (state.encrypted_files || []).length;
        filesValue.textContent = String(fileCount).padStart(2, '0');
        filesNote.textContent  = fileCount
            ? `${fileCount} files in /srv/shared currently carry the .lock extension.`
            : 'No encrypted files remain in /srv/shared.';

        eventsNote.textContent = useSimulation
            ? 'Simulated container lab logs for the ransomware exercise.'
            : 'Live container lab logs for the ransomware exercise.';

        artifactsPanel.textContent = [
            'artifact=/tmp/.encrypt.sh',
            `sha256=${state.evidence_hash || 'missing'}`,
            `network_isolated=${state.network_isolated ? 'true' : 'false'}`,
            `c2_status=${state.c2_blocked ? 'blocked' : 'open'}`,
            `snapshot=${state.snapshot_path || 'not exported'}`,
            '',
            'files:',
            ...(state.files || []),
            '',
            'recent logs:',
            ...(state.recent_logs || [])
        ].join('\n');

        if (Array.isArray(state.recent_logs) && state.recent_logs.length) {
            eventsBody.innerHTML = state.recent_logs.slice().reverse().map(function (line) {
                const match     = line.match(/^(\S+)\s+(.*)$/);
                const ts        = match ? match[1] : '--';
                const eventText = match ? match[2] : line;
                let displayTime = ts;
                try {
                    const d = new Date(ts);
                    if (!isNaN(d.getTime())) {
                        displayTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                    }
                } catch (_) {}
                return `<tr>
                    <td>${escapeHtml(displayTime)}</td>
                    <td>container-01</td>
                    <td>lab.log</td>
                    <td>${escapeHtml(eventText)}</td>
                </tr>`;
            }).join('');
        } else {
            eventsBody.innerHTML = '<tr><td colspan="4" class="surface-note">No lab events have been recorded yet.</td></tr>';
        }

        renderComms([
            { sender: 'System',    message: state.process_active ? 'Scenario A local lab is active and responding.' : 'The simulator process has been terminated.' },
            { sender: 'Analyst 1', message: state.process_active ? `Encryption PID ${state.pid} is active in the container.` : 'Process containment complete. Reviewing residual artifacts.' },
            { sender: 'Analyst 2', message: state.network_isolated ? 'Container-wide outbound traffic is isolated.' : state.c2_blocked ? 'Beacon path is blocked at the container firewall layer.' : 'Outbound beacon path is still open and should be contained.' },
            { sender: 'Forensics', message: state.snapshot_captured ? `Forensic snapshot exported to ${state.snapshot_path}.` : state.script_present ? 'The simulator script is still present on disk.' : 'The simulator script has been removed from /tmp/.encrypt.sh.' }
        ]);

        // SIEM alert: process
        processAlert.className = `alert-item${state.process_active ? '' : ' info'}`;
        processAlertTitle.textContent = state.process_active ? 'Unauthorized encryption process detected' : 'Encryption process terminated';
        processAlertCopy.textContent  = state.process_active
            ? `PID ${state.pid} on container-01 | ${state.process_line || 'bash /tmp/.encrypt.sh'}`
            : 'No active /tmp/.encrypt.sh process remains in the container.';
        setButtonState(processAlertButton,
            !!state.process_active,
            state.process_active ? `Kill PID ${state.pid}` : 'Process Stopped',
            state.process_active ? 'btn btn-danger' : 'btn btn-secondary');
        processAlertButton.dataset.shellCommand = state.process_active ? `kill -9 ${state.pid}` : '';

        // SIEM alert: script
        scriptAlert.className = `alert-item${state.script_present ? ' warning' : ' info'}`;
        scriptAlertTitle.textContent = state.script_present ? 'Malicious script present on disk' : 'Malicious script removed';
        scriptAlertCopy.textContent  = state.script_present
            ? `/tmp/.encrypt.sh is still present. Captured hash: ${state.evidence_hash || 'pending'}`
            : 'The simulator script has been removed from /tmp/.encrypt.sh.';
        setButtonState(scriptAlertButton,
            !!state.script_present,
            state.script_present ? 'Remove Script' : 'Script Removed',
            'btn btn-secondary');
        scriptAlertButton.dataset.shellCommand = state.script_present ? 'rm -f /tmp/.encrypt.sh' : '';

        // SIEM alert: c2 (button disabled if C2 already blocked OR network fully isolated)
        const c2Actionable = !state.network_isolated && !state.c2_blocked;
        c2Alert.className = 'alert-item info';
        c2AlertTitle.textContent = state.network_isolated
            ? 'Container network isolated'
            : state.c2_blocked ? 'Outbound beacon path blocked' : 'Outbound beacon path detected';
        c2AlertCopy.textContent = state.network_isolated
            ? 'The container now has a blanket OUTPUT drop rule, isolating it from outbound traffic.'
            : state.c2_blocked
                ? 'iptables now blocks egress to 203.0.113.42 from the container.'
                : 'Beacon attempts to 203.0.113.42:8443 are still allowed and should be blocked.';
        setButtonState(c2AlertButton,
            c2Actionable,
            state.network_isolated ? 'Network Isolated' : state.c2_blocked ? 'C2 Blocked' : 'Block C2',
            'btn btn-secondary');
        c2AlertButton.dataset.shellCommand = c2Actionable ? 'iptables -A OUTPUT -d 203.0.113.42 -j DROP' : '';

        setButtonState(startLabButton, false, 'Lab Running', 'chip-btn');
        setButtonState(stopLabButton,  true,  'Stop Lab',   'chip-btn');
        setButtonState(resetLabButton, true,  'Reset Lab',  'chip-btn');
        setButtonState(resetTopButton, true,  'Reset Lab',  'chip-btn');
        executeButton.disabled   = false;
        commandInput.disabled    = false;
        commandInput.placeholder = 'Enter command...';

        applyObjectiveState();
    }

    function updatePresetCommands() {
        const pid          = labState && labState.pid ? labState.pid : '';
        const running      = !!(labState && labState.running);
        const replacements = {
            'Inspect Process':           'ps aux | grep .encrypt.sh',
            'Kill Process':              pid ? `kill -9 ${pid}` : '',
            'Block C2':                  (labState && !labState.c2_blocked && !labState.network_isolated) ? 'iptables -A OUTPUT -d 203.0.113.42 -j DROP' : '',
            'Remove Script':             (labState && labState.script_present) ? 'rm -f /tmp/.encrypt.sh' : '',
            'Isolate Container Network': (labState && !labState.network_isolated) ? 'iptables -A OUTPUT -j DROP' : '',
            'Export Forensic Snapshot':  (labState && labState.running) ? 'sha256sum /tmp/.encrypt.sh' : ''
        };

        presetButtons.forEach(function (button) {
            const label = button.textContent.trim();

            if (label.includes('Kill Process')) {
                const icon = button.querySelector('i');
                button.innerHTML = icon ? `${icon.outerHTML} Kill Process ${pid || '--'}` : `Kill Process ${pid || '--'}`;
                button.dataset.shellCommand = pid ? `kill -9 ${pid}` : '';
            } else if (Object.prototype.hasOwnProperty.call(replacements, label)) {
                button.dataset.shellCommand = replacements[label];
            }

            if (!running) {
                if (button !== resetLabButton && button !== resetTopButton) {
                    button.disabled = true;
                }
                return;
            }

            if (button === resetLabButton || button === resetTopButton) {
                button.disabled = false;
            } else if (label === 'Inspect Process') {
                button.disabled = false;
            } else {
                button.disabled = !(button.dataset.shellCommand || '');
            }
        });

        IRSP.refreshIcons();
    }

    function renderState(state) {
        labState = state;
        persistScenarioReport(state);

        if (!state.running) {
            renderStoppedState(state);
        } else {
            renderRunningState(state);
        }

        updatePresetCommands();

        if (!terminalHydrated) {
            termOutput.innerHTML = '';
            if (state.running) {
                appendPromptLine('ps aux | grep .encrypt.sh');
                appendOutputBlock(state.process_line || '(simulator not running)', state.process_active ? '' : 'warning');
                appendPromptLine('find /srv/shared -maxdepth 1 -type f | sort');
                appendOutputBlock((state.files || []).join('\n') || '(no files present)');
            } else {
                appendPromptLine('lab status');
                appendOutputBlock('Scenario A lab is stopped. Use Start Lab or Reset Lab to continue.', 'warning');
            }
            terminalHydrated = true;
        }
    }

    // ── Fetch with timeout ────────────────────────────────────────────────────
    async function fetchWithTimeout(url, options, timeoutMs) {
        const controller = new AbortController();
        const tid = window.setTimeout(function () { controller.abort(); }, timeoutMs);
        try {
            const res = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
        } finally {
            window.clearTimeout(tid);
        }
    }

    // ── API (live Docker backend) ─────────────────────────────────────────────
    async function fetchStateFromApi() {
        const res   = await fetchWithTimeout('/api/labs/scenario-a/state', {}, 3000);
        const state = await res.json();
        renderState(state);
        statusLine.textContent = state.running
            ? `Local Docker lab synced at ${getTimestamp()}`
            : 'Local Docker lab is stopped.';
    }

    function startPolling() {
        stopPolling();
        pollInterval = window.setInterval(function () {
            if (!labState || !labState.running) return;
            fetchStateFromApi().catch(function () {});
        }, 5000);
    }

    function stopPolling() {
        if (pollInterval) {
            window.clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    // ── Simulation paths ──────────────────────────────────────────────────────
    function execInSim(trimmed) {
        const state  = loadSimState();
        const result = simExecCommand(trimmed, state);
        if (result.clear) return;
        appendOutputBlock(result.output, result.ok ? '' : 'warning');
        statusLine.textContent = result.ok
            ? `Command completed at ${getTimestamp()}`
            : `Command failed at ${getTimestamp()}`;
        commandInput.value = '';
        renderState(result.state);
    }

    function startLabInSim() {
        const state = loadSimState();
        if (!state.running) {
            state.running        = true;
            state.status         = 'running';
            state.process_active = true;
            saveSimState(state);
        }
        terminalHydrated = false;
        renderState(state);
        statusLine.textContent = `Lab started at ${getTimestamp()}`;
    }

    function stopLabInSim() {
        const state   = loadSimState();
        state.running = false;
        state.status  = 'stopped';
        saveSimState(state);
        renderState(state);
        statusLine.textContent = `Lab stopped at ${getTimestamp()}`;
    }

    function resetLabInSim() {
        const state = resetSimState();
        termOutput.innerHTML = '';
        terminalHydrated     = false;
        renderState(state);
        statusLine.textContent = `Lab reset completed at ${getTimestamp()}`;
    }

    // ── Unified operations ────────────────────────────────────────────────────
    async function executeCommand(command) {
        const trimmed = String(command || '').trim();
        if (!trimmed) return;
        if (!labState || !labState.running) return;

        appendPromptLine(trimmed);
        statusLine.textContent = 'Running command...';
        executeButton.disabled = true;

        try {
            if (useSimulation) {
                execInSim(trimmed);
            } else {
                const res     = await fetchWithTimeout('/api/labs/scenario-a/exec', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: trimmed })
                }, 8000);
                const payload = await res.json();
                if (/^sha256sum\s+\/tmp\/\.encrypt\.sh$/i.test(trimmed) && payload.ok && payload.state && payload.state.snapshot_captured) {
                    saveSnapshotCapture(true);
                }
                appendOutputBlock(payload.output || '(no output)', payload.ok ? '' : 'warning');
                renderState(payload.state);
                statusLine.textContent = payload.ok
                    ? `Command completed at ${getTimestamp()}`
                    : `Command exited with code ${payload.exit_code} at ${getTimestamp()}`;
                commandInput.value = '';
                fetchStateFromApi().catch(function () {});
            }
        } catch (error) {
            appendOutputBlock(error.message || 'Command failed.', 'warning');
            statusLine.textContent = 'Command failed. Check the current lab state.';
        } finally {
            if (labState && labState.running) {
                executeButton.disabled = false;
            }
        }
    }

    async function startLab() {
        startLabButton.disabled = true;
        statusLine.textContent  = 'Starting the local Docker lab...';

        if (useSimulation) {
            startLabInSim();
            return;
        }

        try {
            const res   = await fetchWithTimeout('/api/labs/scenario-a/start', { method: 'POST' }, 8000);
            const state = await res.json();
            terminalHydrated = false;
            renderState(state);
            statusLine.textContent = `Lab started at ${getTimestamp()}`;
        } catch (error) {
            appendOutputBlock(error.message || 'Unable to start the lab.', 'warning');
            statusLine.textContent      = 'Lab start failed.';
            startLabButton.disabled     = false;
        }
    }

    async function stopLab() {
        stopLabButton.disabled = true;
        statusLine.textContent = 'Stopping the local Docker lab...';

        if (useSimulation) {
            stopLabInSim();
            return;
        }

        try {
            const res   = await fetchWithTimeout('/api/labs/scenario-a/stop', { method: 'POST' }, 8000);
            const state = await res.json();
            renderState(state);
            statusLine.textContent = `Lab stopped at ${getTimestamp()}`;
        } catch (error) {
            appendOutputBlock(error.message || 'Unable to stop the lab.', 'warning');
            statusLine.textContent = 'Lab stop failed.';
            stopLabButton.disabled = false;
        }
    }

    async function resetLab() {
        if (resetLabButton) resetLabButton.disabled = true;
        if (resetTopButton) resetTopButton.disabled = true;
        statusLine.textContent = 'Resetting the local Docker lab...';

        if (useSimulation) {
            resetLabInSim();
            return;
        }

        try {
            const res   = await fetchWithTimeout('/api/labs/scenario-a/reset', { method: 'POST' }, 8000);
            const state = await res.json();
            saveSnapshotCapture(false);
            termOutput.innerHTML = '';
            terminalHydrated     = false;
            renderState(state);
            statusLine.textContent = `Lab reset completed at ${getTimestamp()}`;
        } catch (error) {
            appendOutputBlock(error.message || 'Unable to reset the lab.', 'warning');
            statusLine.textContent  = 'Lab reset failed.';
            if (resetLabButton) resetLabButton.disabled = false;
            if (resetTopButton) resetTopButton.disabled = false;
        }
    }

    // ── Event bindings ────────────────────────────────────────────────────────
    executeButton.addEventListener('click', function () {
        executeCommand(commandInput.value);
    });

    commandInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            executeCommand(commandInput.value);
        }
    });

    presetButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            if (button === resetLabButton || button === resetTopButton) {
                resetLab();
                return;
            }
            const command = button.dataset.shellCommand || '';
            if (!command) return;
            commandInput.value = command;
            executeCommand(command);
        });
    });

    if (startLabButton) startLabButton.addEventListener('click', startLab);
    if (stopLabButton)  stopLabButton.addEventListener('click',  stopLab);
    if (resetLabButton) resetLabButton.addEventListener('click', resetLab);
    if (resetTopButton) resetTopButton.addEventListener('click', resetLab);

    // ── Bootstrap ─────────────────────────────────────────────────────────────
    renderWorkspace();

    (async function init() {
        try {
            await fetchStateFromApi();
            useSimulation = false;
            startPolling();
        } catch (_) {
            useSimulation = true;
            const state   = loadSimState();
            renderState(state);
            renderWorkspace();
            statusLine.textContent = 'Simulation mode active — no Docker backend required. Type “help” for available commands.';
        }
    })();

})();
