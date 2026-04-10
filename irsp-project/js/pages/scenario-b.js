(function () {
    'use strict';

    const workspaceState = safeWorkspaceState();
    startTimer('timer', 1800);

    const queryInput = document.getElementById('scenario-b-query-input');
    const runQueryButton = document.getElementById('scenario-b-run-query');
    const searchPanel = document.getElementById('scenario-b-search-panel');
    const rawPanel = document.getElementById('scenario-b-raw-panel');
    const timelinePanel = document.getElementById('scenario-b-timeline-panel');
    const queryStatus = document.getElementById('scenario-b-query-status');
    const queryButtons = Array.from(document.querySelectorAll('[data-scenario-b-query]'));

    const detailIndicator = document.getElementById('scenario-b-detail-indicator');
    const detailType = document.getElementById('scenario-b-detail-type');
    const detailSeverity = document.getElementById('scenario-b-detail-severity');
    const detailStatus = document.getElementById('scenario-b-detail-status');
    const detailSummary = document.getElementById('scenario-b-detail-summary');
    const detailJson = document.getElementById('scenario-b-detail-json');
    const detailNote = document.getElementById('scenario-b-detail-note-panel');
    const evidenceNote = document.getElementById('scenario-b-evidence-note');
    const workspaceName = document.getElementById('scenario-b-workspace-name');
    const workspaceVm = document.getElementById('scenario-b-workspace-vm');
    const workspaceStarted = document.getElementById('scenario-b-workspace-started');
    const workspaceStatus = document.getElementById('scenario-b-workspace-status');

    function safeWorkspaceState() {
        try {
            return JSON.parse(localStorage.getItem('irsp-active-workspace')) || {};
        } catch (error) {
            return {};
        }
    }

    function formatWorkspaceStart(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Booted from the Launch Bay';
        return `Booted ${date.toLocaleString()}`;
    }

    function renderWorkspace() {
        if (!workspaceState || workspaceState.scenarioId !== 'scenario-b') return;
        if (workspaceName) workspaceName.textContent = workspaceState.workspace || 'Log-Based Workspace';
        if (workspaceVm) workspaceVm.textContent = `VM: ${workspaceState.vmName || 'rg-investigation-vm-b'}`;
        if (workspaceStarted) workspaceStarted.textContent = formatWorkspaceStart(workspaceState.startedAt);
        if (workspaceStatus) workspaceStatus.textContent = workspaceState.status === 'running' ? 'VM Running' : 'VM Ready';
    }

    const queryProfiles = [
        {
            id: 'initial-access',
            match: query => /phish|powershell|docm|winword/i.test(query),
            search: `ResponseGridLogs
| where host == "WS-FINANCE-03" and ("phish-invoice.docm" or "powershell.exe")
| project timestamp, process_name, parent_process, user, file_name, command_line

09:14:22 WINWORD.EXE explorer.exe finance-user phish-invoice.docm macro enabled
09:14:25 powershell.exe WINWORD.EXE finance-user - encoded command executed

launch chain confirms phishing-led initial access.`,
            raw: `09:14:25 WS-FINANCE-03 powershell:operational ParentImage=WINWORD.EXE CommandLine=powershell.exe -enc SQBFAFgA...`,
            timeline: `09:12 mail delivered
09:14 document opened
09:14 macro launched PowerShell`,
            status: 'Initial access query completed. Document-to-PowerShell chain confirmed.'
        },
        {
            id: 'persistence',
            match: query => /windowsupdate_svc|schtasks|persistence/i.test(query),
            search: `ResponseGridLogs
| where host == "WS-FINANCE-03" and ("WindowsUpdate_svc" or "schtasks.exe")
| project timestamp, process_name, parent_process, user, task_name, trigger

09:45:14 schtasks.exe cmd.exe SYSTEM WindowsUpdate_svc AtLogon
09:45:17 taskeng.exe services.exe SYSTEM WindowsUpdate_svc Registered

persistence is active at user logon with SYSTEM privileges.`,
            raw: `09:45:14 WS-FINANCE-03 windows:taskscheduler TaskName=WindowsUpdate_svc Trigger=AtLogon Author=SYSTEM`,
            timeline: `09:31 credential access
09:45 scheduled task created
09:46 persistence checkpoint reached`,
            status: 'Persistence query completed. Scheduled task remains the active foothold.'
        },
        {
            id: 'credential-dumping',
            match: () => true,
            search: `ResponseGridLogs
| where host == "WS-FINANCE-03" and ("procdump.exe" or "dns-tunnel.malware.io")
| summarize earliest = min(timestamp), latest = max(timestamp) by host, process_name, parent_process, user, dest_domain, task_name

09:14:25 powershell.exe WINWORD.EXE finance-user dns-tunnel.malware.io -
09:31:42 procdump.exe cmd.exe finance-user - -
09:45:14 schtasks.exe cmd.exe SYSTEM - WindowsUpdate_svc

correlation: phishing > PowerShell > LSASS dump > scheduled task persistence`,
            raw: `09:31:42 WS-FINANCE-03 sysmon:process Image=C:\\Tools\\procdump.exe TargetImage=C:\\Windows\\System32\\lsass.exe GrantedAccess=0x1010
09:18:11 proxy-01 web:proxy dest_ip=203.0.113.42 sni=update-win365.net action=allowed`,
            timeline: `09:12 phishing email delivered
09:14 macro execution and PowerShell launcher
09:18 outbound C2 established
09:31 LSASS access observed
09:45 scheduled task persistence registered`,
            status: 'Correlation view loaded for the active investigation chain.'
        }
    ];

    function runQuery(query) {
        const profile = queryProfiles.find(item => item.match(query)) || queryProfiles[queryProfiles.length - 1];
        queryInput.value = query;
        searchPanel.textContent = profile.search;
        rawPanel.textContent = profile.raw;
        timelinePanel.textContent = profile.timeline;
        queryStatus.textContent = profile.status;
    }

    runQueryButton.addEventListener('click', function () {
        runQuery(queryInput.value);
    });

    queryInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            runQuery(queryInput.value);
        }
    });

    queryButtons.forEach(button => {
        button.addEventListener('click', function () {
            queryButtons.forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            runQuery(button.dataset.scenarioBQuery);
        });
    });

    initRecordExplorer({
        rowsSelector: '#scenario-b-evidence-board tbody tr',
        storageKey: 'irsp-scenario-b-evidence',
        onSelect(row) {
            detailIndicator.textContent = row.dataset.indicator || '--';
            detailType.textContent = row.dataset.type || '--';
            detailSeverity.textContent = row.dataset.severity || '--';
            detailStatus.textContent = row.dataset.status || '--';
            detailSummary.textContent = row.dataset.summary || '';
            detailJson.textContent = row.dataset.json || '';
            detailNote.textContent = row.dataset.note || '';
            evidenceNote.textContent = `${row.dataset.indicator} selected for deeper review.`;
            detailSeverity.style.color = row.dataset.severity === 'Critical' ? 'var(--accent-red)' : 'var(--accent-yellow)';
        }
    });

    runQuery(queryInput.value);
    renderWorkspace();
})();
