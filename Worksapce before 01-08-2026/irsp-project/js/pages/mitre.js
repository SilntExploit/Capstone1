(function () {
    'use strict';

    const techniqueDetails = {
        "T1598": {
            name: "Phishing for Information",
            tactic: "Reconnaissance",
            status: "Planned Coverage",
            scenarios: ["Planned Scenarios"],
            summary: "Pre-access phishing activity intended to gather information from targets before deeper intrusion activity.",
            training: "Use this as the research and social-engineering lead-in for Scenario C.",
            official: "Official ATT&CK reconnaissance tactic alignment."
        },
        "T1566": {
            name: "Phishing",
            tactic: "Initial Access",
            status: "Critical",
            scenarios: ["Scenario B", "Scenario C"],
            summary: "Adversaries may send phishing content to gain access through user interaction, malicious attachments, links, or third-party services.",
            training: "Map to suspicious email intake, attachment handling, user reporting, and gateway review workflows.",
            official: "Official technique: T1566"
        },
        "T1566.001": {
            name: "Spearphishing Attachment",
            tactic: "Initial Access",
            status: "Covered",
            scenarios: ["Scenario B"],
            summary: "A targeted email delivers a malicious attachment which leads to execution after the user opens it.",
            training: "Fits the phish-invoice.docm style path already reflected in Scenario B.",
            official: "Official sub-technique: T1566.001"
        },
        "T1566.004": {
            name: "Spearphishing Voice",
            tactic: "Initial Access",
            status: "Planned Coverage",
            scenarios: ["Scenario C"],
            summary: "Voice-based phishing where the adversary impersonates a trusted person or role to influence the victim.",
            training: "Use this for executive-impersonation and help-desk escalation drills.",
            official: "Official sub-technique: T1566.004"
        },
        "T1059": {
            name: "Command and Scripting Interpreter",
            tactic: "Execution",
            status: "Covered",
            scenarios: ["Scenario A", "Scenario B"],
            summary: "Script-based execution is central to both the ransomware path and the Windows dropper path.",
            training: "Use command evidence, script names, and shell activity as learner-visible artifacts.",
            official: "Scenario-aligned ATT&CK execution mapping."
        },
        "T1059.001": {
            name: "PowerShell",
            tactic: "Execution",
            status: "Covered",
            scenarios: ["Scenario B"],
            summary: "PowerShell execution is a clean fit for the macro-to-dropper sequence in the Windows investigation scenario.",
            training: "Pair with macro execution, child-process creation, and suspicious outbound activity.",
            official: "Scenario-aligned ATT&CK execution mapping."
        },
        "T1053": {
            name: "Scheduled Task/Job",
            tactic: "Persistence",
            status: "Covered",
            scenarios: ["Scenario B"],
            summary: "A recurring or persistent job can be used to maintain adversary access after initial compromise.",
            training: "Use as the umbrella persistence concept on the matrix.",
            official: "Scenario-aligned ATT&CK persistence mapping."
        },
        "T1053.005": {
            name: "Scheduled Task",
            tactic: "Persistence",
            status: "Covered",
            scenarios: ["Scenario B"],
            summary: "A scheduled task can be created to maintain persistence or re-trigger adversary actions.",
            training: "Maps directly to the WindowsUpdate_svc persistence clue in Scenario B.",
            official: "Scenario-aligned ATT&CK persistence mapping."
        },
        "T1003.001": {
            name: "OS Credential Dumping: LSASS Memory",
            tactic: "Credential Access",
            status: "Critical",
            scenarios: ["Scenario B"],
            summary: "Credential material stored in LSASS process memory may be accessed and harvested for later use.",
            training: "Connect this to procdump.exe evidence, privilege context, and follow-on lateral movement risk.",
            official: "Official sub-technique: T1003.001"
        },
        "T1110": {
            name: "Brute Force",
            tactic: "Credential Access",
            status: "Covered",
            scenarios: ["Scenario A"],
            summary: "Repeated attempts are used to guess passwords or otherwise obtain access when credentials are unknown.",
            training: "Fits the repeated failed SSH login trail shown in the ransomware scenario.",
            official: "Official technique: T1110"
        },
        "T1082": {
            name: "System Information Discovery",
            tactic: "Discovery",
            status: "Covered",
            scenarios: ["Scenario A", "Scenario B"],
            summary: "Host-level information gathering often appears early in hands-on investigation and adversary activity.",
            training: "Use as a discovery placeholder for environment awareness tasks.",
            official: "Scenario-aligned ATT&CK discovery mapping."
        },
        "T1016": {
            name: "System Network Configuration Discovery",
            tactic: "Discovery",
            status: "Covered",
            scenarios: ["Scenario A", "Scenario B"],
            summary: "Network settings, interfaces, routes, and related host network configuration may be enumerated.",
            training: "Useful for lab subnet, host pathing, and suspicious outbound route analysis.",
            official: "Scenario-aligned ATT&CK discovery mapping."
        },
        "T1046": {
            name: "Network Service Discovery",
            tactic: "Discovery",
            status: "Covered",
            scenarios: ["Scenario A", "Scenario B"],
            summary: "Services accessible on local or remote systems may be identified to support follow-on actions.",
            training: "Good fit for service review and pivot-risk analysis.",
            official: "Scenario-aligned ATT&CK discovery mapping."
        },
        "T1021": {
            name: "Remote Services",
            tactic: "Lateral Movement",
            status: "Covered",
            scenarios: ["Scenario A", "Scenario B"],
            summary: "Valid accounts may be used to log in to services that accept remote connections, including SSH and RDP.",
            training: "Use as the parent technique for movement between systems or into remote services.",
            official: "Official technique: T1021"
        },
        "T1021.001": {
            name: "Remote Desktop Protocol",
            tactic: "Lateral Movement",
            status: "Hands-on Practiced",
            scenarios: ["Scenario B"],
            summary: "RDP can be used to expand access when enabled and reachable with valid credentials.",
            training: "Useful for Windows-host compromise progression and privilege-use review.",
            official: "Official sub-technique: T1021.001"
        },
        "T1021.004": {
            name: "SSH",
            tactic: "Lateral Movement",
            status: "Hands-on Practiced",
            scenarios: ["Scenario A"],
            summary: "SSH access can be used with valid credentials to log in to remote machines and perform actions.",
            training: "Maps well to the stolen-credential and failed-SSH storyline in Scenario A.",
            official: "Official sub-technique: T1021.004"
        },
        "T1071": {
            name: "Application Layer Protocol",
            tactic: "Command and Control",
            status: "Critical",
            scenarios: ["Scenario A", "Scenario B"],
            summary: "Adversaries may use application-layer protocols such as web traffic or DNS for command-and-control communications.",
            training: "Good anchor for outbound traffic anomalies and disguised C2 behavior.",
            official: "Official technique: T1071"
        },
        "T1071.001": {
            name: "Web Protocols",
            tactic: "Command and Control",
            status: "Covered",
            scenarios: ["Scenario A"],
            summary: "Web protocols can blend malicious traffic into normal HTTP or HTTPS communication patterns.",
            training: "Fits the TLS-encrypted outbound traffic clue in the ransomware scenario.",
            official: "Official sub-technique: T1071.001"
        },
        "T1071.004": {
            name: "DNS",
            tactic: "Command and Control",
            status: "Covered",
            scenarios: ["Scenario B"],
            summary: "DNS can be used as an application-layer protocol for command-and-control communications.",
            training: "Maps directly to the suspicious outbound DNS queries in Scenario B.",
            official: "Official sub-technique: T1071.004"
        },
        "T1041": {
            name: "Exfiltration Over C2 Channel",
            tactic: "Exfiltration",
            status: "Planned Coverage",
            scenarios: ["Planned Scenarios"],
            summary: "Data may be exfiltrated across the same channel already used for command and control.",
            training: "Good next-step addition for ransomware or double-extortion coverage.",
            official: "Planned ATT&CK-aligned mapping."
        },
        "T1486": {
            name: "Data Encrypted for Impact",
            tactic: "Impact",
            status: "Critical",
            scenarios: ["Scenario A"],
            summary: "Data is encrypted to interrupt availability, often as part of ransomware activity.",
            training: "This is the core impact technique for the ransomware containment scenario.",
            official: "Official technique: T1486"
        },
        "T1489": {
            name: "Service Stop",
            tactic: "Impact",
            status: "Covered",
            scenarios: ["Scenario A"],
            summary: "Services may be stopped or disabled to reduce availability or support broader damaging activity.",
            training: "Good fit for ransomware preparation, backup disruption, and response interference discussion.",
            official: "Official technique: T1489"
        },
        "T1498": {
            name: "Network Denial of Service",
            tactic: "Impact",
            status: "Planned Coverage",
            scenarios: ["Scenario D"],
            summary: "Availability-focused disruption belongs naturally in the future DDoS scenario path.",
            training: "Use as the impact anchor for the planned network-defense module.",
            official: "Planned ATT&CK-aligned mapping."
        }
    };

    const scenarioFilter = document.getElementById('scenario-filter');
    const coverageFilter = document.getElementById('coverage-filter');
    const matrixSummary = document.getElementById('matrix-summary');
    const detailPanel = document.getElementById('technique-detail-panel');
    const techniqueCells = Array.from(document.querySelectorAll('.technique-cell'));

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function updateMatrixView() {
        const scenarioValue = scenarioFilter.value;
        const coverageValue = coverageFilter.value;
        let visibleCount = 0;

        techniqueCells.forEach(cell => {
            const scenarios = (cell.dataset.scenarios || '').split(',');
            const status = cell.dataset.status || '';
            let show = true;

            if (scenarioValue === 'scenario-a') show = scenarios.includes('scenario-a');
            if (scenarioValue === 'scenario-b') show = scenarios.includes('scenario-b');
            if (scenarioValue === 'planned') show = scenarios.includes('planned');

            if (coverageValue === 'critical') show = show && status === 'critical';
            if (coverageValue === 'covered') show = show && (status === 'covered' || status === 'trained' || status === 'critical');
            if (coverageValue === 'planned') show = show && status === 'planned';

            cell.style.opacity = show ? '1' : '0.22';
            cell.style.pointerEvents = show ? 'auto' : 'none';

            if (show) visibleCount++;
        });

        matrixSummary.textContent = `${visibleCount} mapped technique cells currently highlighted.`;
    }

    function showTechniqueDetails(id) {
        const item = techniqueDetails[id];
        if (!item) return;

        detailPanel.innerHTML = `
            <h3 style="margin-bottom:0.35rem;">${id} — ${item.name}</h3>
            <div class="detail-meta">
                <span>${item.tactic}</span>
                <span>${item.status}</span>
                <span>${item.official}</span>
            </div>
            <p style="margin-bottom:0.8rem;color:var(--text-main);">${item.summary}</p>
            <div style="margin-bottom:0.75rem;">
                <div style="font-weight:600;font-size:0.9rem;margin-bottom:0.35rem;">Scenario Alignment</div>
                <div class="technique-list">
                    ${item.scenarios.map(s => `<span class="technique-chip">${s}</span>`).join('')}
                </div>
            </div>
            <div>
                <div style="font-weight:600;font-size:0.9rem;margin-bottom:0.35rem;">Training Use</div>
                <p class="muted-note" style="line-height:1.5;">${item.training}</p>
            </div>
        `;
    }

    techniqueCells.forEach(cell => {
        cell.addEventListener('click', function () {
            showTechniqueDetails(this.dataset.techniqueId);
        });
    });

    scenarioFilter.addEventListener('change', updateMatrixView);
    coverageFilter.addEventListener('change', updateMatrixView);

    updateMatrixView();
    showTechniqueDetails('T1486');
    refreshIcons();
})();
