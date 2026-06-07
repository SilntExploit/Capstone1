(function () {
    'use strict';

    // Map from display label → scenario filter value for chip click-through
    var SCENARIO_FILTER_MAP = {
        'Scenario A': 'scenario-a',
        'Scenario B': 'scenario-b',
        'Scenario C': 'planned',
        'Scenario D': 'planned',
        'Planned Scenarios': 'planned'
    };

    // Status → badge CSS class
    var STATUS_BADGE_CLASS = {
        'Critical': 'badge-critical',
        'Covered': 'badge-covered',
        'Hands-on Practiced': 'badge-trained',
        'Planned Coverage': 'badge-planned'
    };

    var techniqueDetails = {
        "T1598": {
            name: "Phishing for Information",
            tactic: "Reconnaissance",
            status: "Planned Coverage",
            scenarios: ["Planned Scenarios"],
            summary: "Pre-access phishing activity intended to gather information from targets before deeper intrusion activity.",
            training: "Use this as the research and social-engineering lead-in for Scenario C."
        },
        "T1566": {
            name: "Phishing",
            tactic: "Initial Access",
            status: "Critical",
            scenarios: ["Scenario B", "Planned Scenarios"],
            summary: "Adversaries may send phishing content to gain access through user interaction, malicious attachments, links, or third-party services.",
            training: "Map to suspicious email intake, attachment handling, user reporting, and gateway review workflows."
        },
        "T1566.001": {
            name: "Spearphishing Attachment",
            tactic: "Initial Access",
            status: "Covered",
            scenarios: ["Scenario B"],
            summary: "A targeted email delivers a malicious attachment which leads to execution after the user opens it.",
            training: "Fits the phish-invoice.docm style path already reflected in Scenario B."
        },
        "T1566.004": {
            name: "Spearphishing Voice",
            tactic: "Initial Access",
            status: "Planned Coverage",
            scenarios: ["Planned Scenarios"],
            summary: "Voice-based phishing where the adversary impersonates a trusted person or role to influence the victim.",
            training: "Use this for executive-impersonation and help-desk escalation drills."
        },
        "T1059": {
            name: "Command and Scripting Interpreter",
            tactic: "Execution",
            status: "Covered",
            scenarios: ["Scenario A", "Scenario B"],
            summary: "Script-based execution is central to both the ransomware path and the Windows dropper path.",
            training: "Use command evidence, script names, and shell activity as learner-visible artifacts."
        },
        "T1059.001": {
            name: "PowerShell",
            tactic: "Execution",
            status: "Covered",
            scenarios: ["Scenario B"],
            summary: "PowerShell execution is a clean fit for the macro-to-dropper sequence in the Windows investigation scenario.",
            training: "Pair with macro execution, child-process creation, and suspicious outbound activity."
        },
        "T1204": {
            name: "User Execution",
            tactic: "Execution",
            status: "Covered",
            scenarios: ["Scenario B"],
            summary: "An adversary may rely upon specific actions by a user to facilitate access, such as opening a malicious file attachment delivered via phishing.",
            training: "Maps directly to the macro-enabled document opened in Scenario B — the user opens phish-invoice.docm and triggers the initial PowerShell dropper chain."
        },
        "T1053": {
            name: "Scheduled Task/Job",
            tactic: "Persistence",
            status: "Covered",
            scenarios: ["Scenario B"],
            summary: "A recurring or persistent job can be used to maintain adversary access after initial compromise.",
            training: "Use as the umbrella persistence concept on the matrix."
        },
        "T1053.005": {
            name: "Scheduled Task",
            tactic: "Persistence",
            status: "Covered",
            scenarios: ["Scenario B"],
            summary: "A scheduled task can be created to maintain persistence or re-trigger adversary actions.",
            training: "Maps directly to the WindowsUpdate_svc persistence clue in Scenario B."
        },
        "T1003.001": {
            name: "OS Credential Dumping: LSASS Memory",
            tactic: "Credential Access",
            status: "Critical",
            scenarios: ["Scenario B"],
            summary: "Credential material stored in LSASS process memory may be accessed and harvested for later use.",
            training: "Connect this to procdump.exe evidence, privilege context, and follow-on lateral movement risk."
        },
        "T1110": {
            name: "Brute Force",
            tactic: "Credential Access",
            status: "Covered",
            scenarios: ["Scenario A"],
            summary: "Repeated attempts are used to guess passwords or otherwise obtain access when credentials are unknown.",
            training: "Fits the repeated failed SSH login trail shown in the ransomware scenario."
        },
        "T1082": {
            name: "System Information Discovery",
            tactic: "Discovery",
            status: "Covered",
            scenarios: ["Scenario A", "Scenario B"],
            summary: "Host-level information gathering often appears early in hands-on investigation and adversary activity.",
            training: "Use as a discovery placeholder for environment awareness tasks."
        },
        "T1016": {
            name: "System Network Configuration Discovery",
            tactic: "Discovery",
            status: "Covered",
            scenarios: ["Scenario A", "Scenario B"],
            summary: "Network settings, interfaces, routes, and related host network configuration may be enumerated.",
            training: "Useful for lab subnet, host pathing, and suspicious outbound route analysis."
        },
        "T1046": {
            name: "Network Service Discovery",
            tactic: "Discovery",
            status: "Covered",
            scenarios: ["Scenario A", "Scenario B"],
            summary: "Services accessible on local or remote systems may be identified to support follow-on actions.",
            training: "Good fit for service review and pivot-risk analysis."
        },
        "T1021": {
            name: "Remote Services",
            tactic: "Lateral Movement",
            status: "Covered",
            scenarios: ["Scenario A", "Scenario B"],
            summary: "Valid accounts may be used to log in to services that accept remote connections, including SSH and RDP.",
            training: "Use as the parent technique for movement between systems or into remote services."
        },
        "T1021.001": {
            name: "Remote Desktop Protocol",
            tactic: "Lateral Movement",
            status: "Hands-on Practiced",
            scenarios: ["Scenario B"],
            summary: "RDP can be used to expand access when enabled and reachable with valid credentials.",
            training: "Useful for Windows-host compromise progression and privilege-use review."
        },
        "T1021.004": {
            name: "SSH",
            tactic: "Lateral Movement",
            status: "Hands-on Practiced",
            scenarios: ["Scenario A"],
            summary: "SSH access can be used with valid credentials to log in to remote machines and perform actions.",
            training: "Maps well to the stolen-credential and failed-SSH storyline in Scenario A."
        },
        "T1071": {
            name: "Application Layer Protocol",
            tactic: "Command and Control",
            status: "Critical",
            scenarios: ["Scenario A", "Scenario B"],
            summary: "Adversaries may use application-layer protocols such as web traffic or DNS for command-and-control communications.",
            training: "Good anchor for outbound traffic anomalies and disguised C2 behavior."
        },
        "T1071.001": {
            name: "Web Protocols",
            tactic: "Command and Control",
            status: "Covered",
            scenarios: ["Scenario A"],
            summary: "Web protocols can blend malicious traffic into normal HTTP or HTTPS communication patterns.",
            training: "Fits the TLS-encrypted outbound traffic clue in the ransomware scenario."
        },
        "T1071.004": {
            name: "DNS",
            tactic: "Command and Control",
            status: "Covered",
            scenarios: ["Scenario B"],
            summary: "DNS can be used as an application-layer protocol for command-and-control communications.",
            training: "Maps directly to the suspicious outbound DNS queries in Scenario B."
        },
        "T1041": {
            name: "Exfiltration Over C2 Channel",
            tactic: "Exfiltration",
            status: "Planned Coverage",
            scenarios: ["Planned Scenarios"],
            summary: "Data may be exfiltrated across the same channel already used for command and control.",
            training: "Good next-step addition for ransomware or double-extortion coverage."
        },
        "T1486": {
            name: "Data Encrypted for Impact",
            tactic: "Impact",
            status: "Critical",
            scenarios: ["Scenario A"],
            summary: "Data is encrypted to interrupt availability, often as part of ransomware activity.",
            training: "This is the core impact technique for the ransomware containment scenario."
        },
        "T1489": {
            name: "Service Stop",
            tactic: "Impact",
            status: "Covered",
            scenarios: ["Scenario A"],
            summary: "Services may be stopped or disabled to reduce availability or support broader damaging activity.",
            training: "Good fit for ransomware preparation, backup disruption, and response interference discussion."
        },
        "T1498": {
            name: "Network Denial of Service",
            tactic: "Impact",
            status: "Planned Coverage",
            scenarios: ["Planned Scenarios"],
            summary: "Availability-focused disruption belongs naturally in the future DDoS scenario path.",
            training: "Use as the impact anchor for the planned network-defense module."
        }
    };

    var scenarioFilter    = document.getElementById('scenario-filter');
    var coverageFilter    = document.getElementById('coverage-filter');
    var matrixSummary     = document.getElementById('matrix-summary');
    var detailPanel       = document.getElementById('technique-detail-panel');
    var techniqueCells    = Array.from(document.querySelectorAll('.technique-cell'));
    var emptyCells        = Array.from(document.querySelectorAll('.matrix-cell.empty'));

    // Stat tile elements
    var statVisible  = document.getElementById('stat-visible');
    var statCritical = document.getElementById('stat-critical');
    var statCovered  = document.getElementById('stat-covered');
    var statPlanned  = document.getElementById('stat-planned');

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function updateStatTiles(counts) {
        if (statVisible)  statVisible.textContent  = counts.visible;
        if (statCritical) statCritical.textContent = counts.critical;
        if (statCovered)  statCovered.textContent  = counts.covered + counts.trained;
        if (statPlanned)  statPlanned.textContent  = counts.planned;
    }

    function updateMatrixView() {
        var scenarioValue = scenarioFilter.value;
        var coverageValue = coverageFilter.value;
        var isFiltered    = scenarioValue !== 'all' || coverageValue !== 'all';
        var counts = { visible: 0, critical: 0, covered: 0, trained: 0, planned: 0 };

        techniqueCells.forEach(function (cell) {
            var scenarios = (cell.dataset.scenarios || '').split(',');
            var status    = cell.dataset.status || '';
            var show      = true;

            if (scenarioValue === 'scenario-a') show = scenarios.includes('scenario-a');
            if (scenarioValue === 'scenario-b') show = scenarios.includes('scenario-b');
            if (scenarioValue === 'planned')    show = scenarios.includes('planned');

            if (coverageValue === 'critical') show = show && status === 'critical';
            if (coverageValue === 'covered')  show = show && (status === 'covered' || status === 'trained' || status === 'critical');
            if (coverageValue === 'planned')  show = show && status === 'planned';

            cell.style.opacity       = show ? '1' : '0.18';
            cell.style.pointerEvents = show ? 'auto' : 'none';

            if (show) {
                counts.visible++;
                if (status === 'critical') counts.critical++;
                else if (status === 'covered') counts.covered++;
                else if (status === 'trained') counts.trained++;
                else if (status === 'planned') counts.planned++;
            }
        });

        // Dim empty cells when any filter is active so they don't clutter the filtered view
        emptyCells.forEach(function (cell) {
            cell.style.opacity = isFiltered ? '0.15' : '1';
        });

        var filterLabel = scenarioValue !== 'all'
            ? scenarioFilter.options[scenarioFilter.selectedIndex].text
            : (coverageValue !== 'all' ? coverageFilter.options[coverageFilter.selectedIndex].text : null);

        matrixSummary.textContent = filterLabel
            ? counts.visible + ' technique' + (counts.visible !== 1 ? 's' : '') + ' match “' + filterLabel + '”.'
            : counts.visible + ' techniques mapped across all scenarios.';

        updateStatTiles(counts);
    }

    function showTechniqueDetails(id) {
        var item = techniqueDetails[id];

        if (!item) {
            detailPanel.innerHTML =
                '<h3 style="margin-bottom:0.65rem;">' + id + ' — Details Pending</h3>' +
                '<p class="muted-note">No detailed mapping has been added for this technique yet. ' +
                'Select another highlighted cell to view its scenario alignment and training notes.</p>';
            return;
        }

        var badgeClass = STATUS_BADGE_CLASS[item.status] || '';

        var chipsHtml = item.scenarios.map(function (s) {
            var filterVal = SCENARIO_FILTER_MAP[s] || 'all';
            return '<span class="technique-chip" data-scenario-filter="' + filterVal + '" ' +
                   'title="Click to filter matrix to ' + s + '">' + s + '</span>';
        }).join('');

        detailPanel.innerHTML =
            '<h3 style="margin-bottom:0.35rem;">' + id + ' — ' + item.name + '</h3>' +
            '<div class="detail-meta">' +
                '<span>' + item.tactic + '</span>' +
                '<span class="' + badgeClass + '">' + item.status + '</span>' +
            '</div>' +
            '<p style="margin-bottom:0.8rem;color:var(--text-main);">' + item.summary + '</p>' +
            '<div style="margin-bottom:0.75rem;">' +
                '<div class="chip-label">Scenario Alignment</div>' +
                '<div class="technique-list">' + chipsHtml + '</div>' +
            '</div>' +
            '<div>' +
                '<div class="chip-label">Training Use</div>' +
                '<p class="muted-note" style="line-height:1.5;">' + item.training + '</p>' +
            '</div>';

        // Scenario chips → update the scenario filter and re-render matrix
        detailPanel.querySelectorAll('.technique-chip[data-scenario-filter]').forEach(function (chip) {
            chip.addEventListener('click', function () {
                var val = chip.dataset.scenarioFilter;
                if (scenarioFilter.value !== val) {
                    scenarioFilter.value = val;
                    updateMatrixView();
                }
            });
        });
    }

    // Matrix cell click — highlight selected cell and show details
    techniqueCells.forEach(function (cell) {
        cell.addEventListener('click', function () {
            techniqueCells.forEach(function (c) { c.classList.remove('active-selection'); });
            cell.classList.add('active-selection');
            showTechniqueDetails(cell.dataset.techniqueId);
        });
    });

    // Sidebar scenario-tag chips → show technique details on click
    document.querySelectorAll('.scenario-tag[data-technique-id]').forEach(function (tag) {
        tag.addEventListener('click', function () {
            showTechniqueDetails(tag.dataset.techniqueId);
            // Scroll detail panel into view on mobile
            var panel = document.getElementById('technique-detail-panel');
            if (panel) {
                panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    });

    scenarioFilter.addEventListener('change', updateMatrixView);
    coverageFilter.addEventListener('change', updateMatrixView);

    // Initial render
    updateMatrixView();
    showTechniqueDetails('T1486');
    refreshIcons();
})();
