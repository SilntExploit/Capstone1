(function () {
    'use strict';

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const scenarioGrid = document.getElementById('scenario-grid');
    const scenarioCards = Array.from(scenarioGrid.querySelectorAll('.scenario-card'));
    const searchInput = document.getElementById('scenario-search');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const platformFilter = document.getElementById('platform-filter');
    const resultsSummary = document.getElementById('results-summary');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const scenarioDetails = document.getElementById('scenario-details');
    const resumeLastBtn = document.getElementById('resume-last-btn');
    const modal = document.getElementById('lab-modal');
    const modalBody = document.getElementById('lab-modal-body');
    const modalSubtitle = document.getElementById('lab-modal-subtitle');
    const modalActions = document.getElementById('lab-modal-actions');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const availablePathsValue = document.getElementById('lab-available-paths');
    const availablePathsNote = document.getElementById('lab-available-paths-note');
    const advancedMetric = document.getElementById('lab-metric-advanced');
    const advancedMetricNote = document.getElementById('lab-metric-advanced-note');
    const liveMetric = document.getElementById('lab-metric-live');
    const liveMetricNote = document.getElementById('lab-metric-live-note');
    const prototypeMetric = document.getElementById('lab-metric-prototype');
    const prototypeMetricNote = document.getElementById('lab-metric-prototype-note');
    const runsBody = document.getElementById('lab-runs-body');
    const assetsList = document.getElementById('lab-assets-list');
    const readinessShell = document.getElementById('lab-readiness-shell');
    const seedSnapshot = document.getElementById('lab-seed-snapshot');
    const STORAGE_KEY = 'irsp-last-scenario';
    const WORKSPACE_STORAGE_KEY = 'irsp-active-workspace';
    const PINNED_STORAGE_KEY = 'irsp-pinned-scenarios';
    const SELECTED_STORAGE_KEY = 'irsp-selected-scenario';
    const scenarioMetrics = {
        'scenario-a': { readiness: '98%', telemetry: '27 alerts, 188 sessions', focus: 'Containment', owner: 'Blue Team Alpha', status: 'ready', alertsSeeded: 27, eventsSeeded: 42381 },
        'scenario-b': { readiness: '96%', telemetry: '19 alerts, 4 confirmed IOCs', focus: 'Investigation', owner: 'Analyst Cohort 2', status: 'ready', alertsSeeded: 19, eventsSeeded: 18422 },
        'scenario-c': { readiness: '62%', telemetry: 'voice transcript + email trail', focus: 'Awareness', owner: 'Awareness Lab', status: 'ready', alertsSeeded: 8, eventsSeeded: 920 },
        'scenario-d': { readiness: '58%', telemetry: 'traffic spikes + service health', focus: 'Availability', owner: 'Network Defense Lab', status: 'ready', alertsSeeded: 12, eventsSeeded: 5410 },
        'scenario-e': { readiness: '54%', telemetry: 'USB logs + proxy uploads', focus: 'Insider Risk', owner: 'Insider Risk PM', status: 'ready', alertsSeeded: 14, eventsSeeded: 2640 },
        'scenario-f': { readiness: '57%', telemetry: 'IAM audit trails + sign-ins', focus: 'Cloud IAM', owner: 'Cloud IAM Team', status: 'ready', alertsSeeded: 11, eventsSeeded: 3180 }
    };

    const previewData = {
        'scenario-a': {
            title: 'Scenario A: Ransomware Containment',
            subtitle: 'Advanced | 45 min | Docker/Linux',
            body: `
                <div class="alert-item" style="margin-bottom:1rem;">
                    <div class="alert-info">
                        <h4>Focus Area</h4>
                        <p>Rapid containment, malware process handling, C2 disruption, and service restoration.</p>
                    </div>
                </div>
                <div class="grid-2">
                    <div class="card" style="padding:1rem;">
                        <div class="card-title"><i data-lucide="target"></i> Objectives</div>
                        <ul class="list-clean" style="font-size:0.88rem;">
                            <li>Identify entry point</li>
                            <li>Isolate infected container</li>
                            <li>Stop encryption activity</li>
                            <li>Restore operations safely</li>
                        </ul>
                    </div>
                    <div class="card" style="padding:1rem;">
                        <div class="card-title"><i data-lucide="shield"></i> Skills Practiced</div>
                        <ul class="list-clean" style="font-size:0.88rem;">
                            <li>Incident triage</li>
                            <li>Linux investigation</li>
                            <li>Docker containment</li>
                            <li>MITRE mapping</li>
                        </ul>
                    </div>
                </div>
            `
        },
        'scenario-b': {
            title: 'Scenario B: Compromised System Investigation',
            subtitle: 'Intermediate | 30 min | Windows Server',
            body: `
                <div class="alert-item info" style="margin-bottom:1rem;">
                    <div class="alert-info">
                        <h4>Focus Area</h4>
                        <p>Evidence gathering, IOC mapping, phishing analysis, persistence review, and endpoint containment.</p>
                    </div>
                </div>
                <div class="grid-2">
                    <div class="card" style="padding:1rem;">
                        <div class="card-title"><i data-lucide="clipboard-list"></i> Objectives</div>
                        <ul class="list-clean" style="font-size:0.88rem;">
                            <li>Identify the initial vector</li>
                            <li>Build the timeline</li>
                            <li>Contain compromised host</li>
                            <li>Remove persistence</li>
                        </ul>
                    </div>
                    <div class="card" style="padding:1rem;">
                        <div class="card-title"><i data-lucide="search"></i> Skills Practiced</div>
                        <ul class="list-clean" style="font-size:0.88rem;">
                            <li>IOC analysis</li>
                            <li>Host investigation</li>
                            <li>Windows event review</li>
                            <li>Timeline construction</li>
                        </ul>
                    </div>
                </div>
            `
        },
        'scenario-c': {
            title: 'Scenario C: Vishing & Social Engineering',
            subtitle: 'Beginner | 20 min | Voice / Email',
            body: `
                <div class="alert-item info" style="margin-bottom:1rem;">
                    <div class="alert-info">
                        <h4>Focus Area</h4>
                        <p>Voice-phishing validation, help-desk escalation discipline, identity verification, and mail-rule review.</p>
                    </div>
                </div>
                <p class="surface-note">This module now opens a working scenario page with seeded transcript, identity, and mailbox telemetry.</p>
            `
        },
        'scenario-d': {
            title: 'Scenario D: DDoS Mitigation',
            subtitle: 'Intermediate | 25 min | Network Defense',
            body: `
                <div class="alert-item info" style="margin-bottom:1rem;">
                    <div class="alert-info">
                        <h4>Focus Area</h4>
                        <p>Traffic triage, service-health validation, rate-limit response, and stakeholder coordination during availability pressure.</p>
                    </div>
                </div>
                <p class="surface-note">The live module includes seeded edge, WAF, and health telemetry with response actions.</p>
            `
        },
        'scenario-e': {
            title: 'Scenario E: Insider Exfiltration Review',
            subtitle: 'Advanced | 35 min | Windows Endpoint',
            body: `
                <div class="alert-item info" style="margin-bottom:1rem;">
                    <div class="alert-info">
                        <h4>Focus Area</h4>
                        <p>Archive staging, removable media review, proxy upload correlation, and insider-risk evidence handling.</p>
                    </div>
                </div>
                <p class="surface-note">The scenario page now supports alert actions, evidence review, and log search against the seeded insider dataset.</p>
            `
        },
        'scenario-f': {
            title: 'Scenario F: Cloud IAM Privilege Escalation',
            subtitle: 'Intermediate | 28 min | Cloud / Network',
            body: `
                <div class="alert-item info" style="margin-bottom:1rem;">
                    <div class="alert-info">
                        <h4>Focus Area</h4>
                        <p>Role-assumption anomalies, policy drift, impossible travel, and cloud control-plane evidence review.</p>
                    </div>
                </div>
                <p class="surface-note">The module now opens a working cloud-IAM scenario page backed by seeded audit logs and actions.</p>
            `
        }
    };

    const launchProfiles = {
        'scenario-a': {
            title: 'Scenario A Launch',
            subtitle: 'Provision the ransomware containment workspace and analyst VM',
            icon: 'server-cog',
            workspace: 'Ransomware Containment Workspace',
            vmName: 'rg-ransomware-vm-a',
            environment: 'Linux / Docker response workspace',
            services: ['Container response shell', 'Process kill and isolation workflow', 'Artifact hashing and recovery checkpoints'],
            dataFlow: ['Loads Scenario A seeded telemetry', 'Stores user actions and lab state locally', 'Routes into the live ransomware simulation page'],
            note: 'Python processing services from the diagram are intentionally skipped here. This boot step stays in the front-end prototype.'
        },
        'scenario-b': {
            title: 'Scenario B Launch',
            subtitle: 'Load the no-VM Windows evidence pack and analyst workspace',
            icon: 'monitor-smartphone',
            workspace: 'Windows Evidence Pack Workspace',
            vmName: 'ws-finance-03_sanitized_bundle',
            environment: 'Offline Windows endpoint investigation pack',
            services: ['Log review and query shell', 'Evidence board and IOC drilldowns', 'Timeline reconstruction and analyst actions'],
            dataFlow: ['Loads Scenario B seeded telemetry', 'Stores user actions and lab state locally', 'Routes into the live compromised system investigation page'],
            note: 'This Scenario B flow no longer provisions a VM. It opens a browser-based evidence pack built from sanitized Windows endpoint telemetry.'
        },
        'scenario-c': {
            title: 'Scenario C Launch',
            subtitle: 'Provision the social-engineering review workspace and analyst VM',
            icon: 'phone-call',
            workspace: 'Social Engineering Review Workspace',
            vmName: 'rg-vishing-vm-c',
            environment: 'Voice / Email analyst workspace',
            services: ['Transcript review shell', 'Identity verification evidence board', 'Mailbox-rule triage and action logging'],
            dataFlow: ['Loads Scenario C seeded telemetry', 'Persists local workspace state for resume support', 'Routes into the live vishing scenario page'],
            note: 'This launch flow remains mock-backed, but the scenario page now works end to end with seeded actions and evidence.'
        },
        'scenario-d': {
            title: 'Scenario D Launch',
            subtitle: 'Provision the DDoS mitigation workspace and analyst VM',
            icon: 'wifi-off',
            workspace: 'Availability Defense Workspace',
            vmName: 'rg-ddos-vm-d',
            environment: 'Network defense analyst workspace',
            services: ['Edge traffic triage', 'Health and WAF correlation', 'Mitigation response logging'],
            dataFlow: ['Loads Scenario D seeded telemetry', 'Persists local workspace state for resume support', 'Routes into the live DDoS scenario page'],
            note: 'The page models response decisions and evidence flow even though no live cloud edge is being provisioned.'
        },
        'scenario-e': {
            title: 'Scenario E Launch',
            subtitle: 'Provision the insider-risk review workspace and analyst VM',
            icon: 'hard-drive-download',
            workspace: 'Insider Risk Review Workspace',
            vmName: 'rg-insider-vm-e',
            environment: 'Windows endpoint investigation workspace',
            services: ['USB and archive telemetry review', 'DLP and proxy evidence pivots', 'Containment action logging'],
            dataFlow: ['Loads Scenario E seeded telemetry', 'Persists local workspace state for resume support', 'Routes into the live insider-exfiltration scenario page'],
            note: 'This scenario remains mock-backed but now has a complete workflow inside the app.'
        },
        'scenario-f': {
            title: 'Scenario F Launch',
            subtitle: 'Provision the cloud IAM investigation workspace and analyst VM',
            icon: 'cloud-cog',
            workspace: 'Cloud IAM Investigation Workspace',
            vmName: 'rg-cloudiam-vm-f',
            environment: 'Cloud audit and identity workspace',
            services: ['CloudTrail-style log review', 'Role-assumption analysis', 'Policy-drift containment workflow'],
            dataFlow: ['Loads Scenario F seeded telemetry', 'Persists local workspace state for resume support', 'Routes into the live cloud IAM scenario page'],
            note: 'This is the right integration point for future real cloud-provider APIs or IaC execution.'
        }
    };

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function formatRunTimestamp(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    function statusBadgeMarkup(status) {
        const normalized = String(status || '').toLowerCase();

        if (normalized === 'running') return '<span class="status-badge yellow">Running</span>';
        if (normalized === 'completed') return '<span class="status-badge green">Completed</span>';
        if (normalized === 'timed_out') return '<span class="status-badge red">Timed Out</span>';
        if (normalized === 'planned') return '<span class="status-badge blue">Planned</span>';
        if (normalized === 'ready') return '<span class="status-badge green">Ready</span>';

        return '<span class="status-badge blue">Prototype</span>';
    }

    function platformFromEnvironment(environment) {
        const normalized = String(environment || '').toLowerCase();

        if (normalized.includes('linux') || normalized.includes('docker')) return 'linux';
        if (normalized.includes('windows')) return 'windows';
        if (normalized.includes('voice') || normalized.includes('email') || normalized.includes('social')) return 'social';
        return 'network';
    }

    function renderSeedSnapshotForCard(card) {
        if (!seedSnapshot || !card) return;

        const metrics = scenarioMetrics[card.dataset.scenarioId] || {};
        seedSnapshot.textContent = JSON.stringify({
            scenario_id: card.dataset.scenarioId,
            status: metrics.status || card.dataset.status,
            owner: metrics.owner || 'Prototype Owner',
            readiness: metrics.readiness || '--',
            alerts_seeded: metrics.alertsSeeded || null,
            events_seeded: metrics.eventsSeeded || null,
            focus: metrics.focus || '--',
            demo_mode: true
        }, null, 2);
    }

    function renderReadinessShellData() {
        if (!readinessShell) return;

        const rows = scenarioCards
            .slice()
            .sort((left, right) => left.dataset.scenarioId.localeCompare(right.dataset.scenarioId))
            .map(card => {
                const metrics = scenarioMetrics[card.dataset.scenarioId] || {};
                const readinessValue = String(metrics.readiness || '').replace('%', '') || '--';
                const statusValue = metrics.status || (card.dataset.status === 'available' ? 'ready' : 'prototype');
                return `${card.dataset.scenarioId} status=${statusValue} owner=${metrics.owner || 'Prototype Team'} readiness=${readinessValue}`;
            });

        // Use textContent (not innerHTML) on <pre> to avoid XSS from any scenario metadata.
        readinessShell.textContent = [
            'ResponseGridLabStatus',
            '| where scenario_id startswith "scenario-"',
            '| summarize status = take_any(status), owner = take_any(owner), readiness = max(readiness) by scenario_id',
            '| order by scenario_id asc',
            '',
            ...rows
        ].join('\n');
    }

    function renderRunsTable(items) {
        if (!runsBody || !Array.isArray(items)) return;

        runsBody.innerHTML = items.map(run => {
            const card = scenarioCards.find(item => item.dataset.scenarioId === run.scenario_id);
            return `
                <tr>
                    <td>${formatRunTimestamp(run.timestamp)}</td>
                    <td>${card ? card.dataset.title : run.scenario_id}</td>
                    <td>${run.team || '--'}</td>
                    <td>${statusBadgeMarkup(run.status)}</td>
                    <td>${run.score == null ? '--' : `${run.score}%`}</td>
                </tr>
            `;
        }).join('');
    }

    function applyScenarioApiData(items) {
        if (!Array.isArray(items) || !items.length) return;

        items.forEach(item => {
            const card = scenarioCards.find(entry => entry.dataset.scenarioId === item.id);
            if (!card) return;

            const status = item.status === 'ready' ? 'available' : 'coming-soon';
            card.dataset.status = status;
            card.dataset.difficulty = item.difficulty || card.dataset.difficulty;
            card.dataset.platform = platformFromEnvironment(item.environment) || card.dataset.platform;

            scenarioMetrics[item.id] = Object.assign({}, scenarioMetrics[item.id], {
                readiness: `${item.readiness}%`,
                telemetry: `${item.seeded_alerts} alerts, ${Number(item.seeded_events || 0).toLocaleString()} events`,
                focus: item.environment,
                owner: item.owner,
                status: item.status,
                alertsSeeded: item.seeded_alerts,
                eventsSeeded: item.seeded_events
            });

            const badge = card.querySelector('.toolbar .status-badge');
            if (badge) {
                badge.className = `status-badge ${status === 'available' ? 'green' : 'blue'}`;
                badge.textContent = status === 'available' ? 'Ready' : 'Prototype';
            }
        });

        const liveCount = scenarioCards.filter(card => card.dataset.status === 'available').length;
        const prototypeCount = scenarioCards.length - liveCount;
        const advancedCount = scenarioCards.filter(card => card.dataset.difficulty === 'advanced').length;

        availablePathsValue.textContent = String(scenarioCards.length).padStart(2, '0');
        availablePathsNote.textContent = `${liveCount} live exercises, ${prototypeCount} roadmap modules`;
        advancedMetric.textContent = String(advancedCount).padStart(2, '0');
        advancedMetricNote.textContent = `${advancedCount} advanced exercises seeded for higher-pressure response drills.`;
        liveMetric.textContent = String(liveCount).padStart(2, '0');
        liveMetricNote.textContent = `${liveCount} scenarios are launchable through the mock backend and UI flow.`;
        prototypeMetric.textContent = String(prototypeCount).padStart(2, '0');
        prototypeMetricNote.textContent = prototypeCount ? `${prototypeCount} modules remain in roadmap review.` : 'All seeded modules are launchable in the app.';

        if (assetsList) {
            assetsList.innerHTML = `
                <li><strong>docker-host-02</strong> | Ubuntu 22.04 | shared volumes mounted to \`/srv/shared\`</li>
                <li><strong>WS-FINANCE-03</strong> | Windows Server 2022 | Office macros enabled for training</li>
                <li><strong>edge-fw-01</strong> | Palo Alto traffic logs forwarded every 15 sec</li>
                <li><strong>mail-gw-01</strong> | Microsoft 365 message trace feed enabled</li>
                <li><strong>siem-lab-core</strong> | Mock backend online | synced scenarios=${items.length}</li>
            `;
        }

        renderReadinessShellData();
    }

    async function hydrateLabData() {
        if (!window.IRSPApi || !window.IRSPApi.isAvailable()) {
            return;
        }

        try {
            const [scenariosPayload, runsPayload] = await Promise.all([
                window.IRSPApi.getScenarios(),
                window.IRSPApi.getRuns({ limit: 4 })
            ]);

            applyScenarioApiData(scenariosPayload.items || []);
            renderRunsTable(runsPayload.items || []);
        } catch (error) {
            renderReadinessShellData();
        }
    }

    function getPinnedScenarioIds() {
        try {
            const raw = JSON.parse(localStorage.getItem(PINNED_STORAGE_KEY));
            return Array.isArray(raw) ? raw : [];
        } catch (error) {
            return [];
        }
    }

    function savePinnedScenarioIds(ids) {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(ids));
    }

    function isPinned(card) {
        return getPinnedScenarioIds().includes(card.dataset.scenarioId);
    }

    function applyPinState() {
        const pinnedIds = getPinnedScenarioIds();

        scenarioCards.forEach(card => {
            const pinButton = card.querySelector('.card-pin');
            const pinned = pinnedIds.includes(card.dataset.scenarioId);

            card.classList.toggle('pinned', pinned);

            if (pinButton) {
                pinButton.classList.toggle('active', pinned);
                pinButton.setAttribute('aria-pressed', pinned ? 'true' : 'false');
                pinButton.setAttribute('aria-label', pinned ? 'Unpin scenario' : 'Pin scenario');
            }
        });
    }

    function sortScenarioCards() {
        const pinnedIds = getPinnedScenarioIds();

        const sortedCards = scenarioCards.slice().sort((a, b) => {
            const aPinned = pinnedIds.includes(a.dataset.scenarioId) ? 1 : 0;
            const bPinned = pinnedIds.includes(b.dataset.scenarioId) ? 1 : 0;

            if (aPinned !== bPinned) {
                return bPinned - aPinned;
            }

            if (a.dataset.status !== b.dataset.status) {
                return a.dataset.status === 'available' ? -1 : 1;
            }

            return a.dataset.title.localeCompare(b.dataset.title);
        });

        sortedCards.forEach(card => {
            scenarioGrid.appendChild(card);
        });
    }

    function createPinButtons() {
        scenarioCards.forEach(card => {
            const toolbar = card.querySelector('.toolbar');
            if (!toolbar || toolbar.querySelector('.card-pin')) return;

            const pinButton = document.createElement('button');
            pinButton.type = 'button';
            pinButton.className = 'icon-btn card-pin';
            pinButton.innerHTML = '<i data-lucide="pin"></i>';

            pinButton.addEventListener('click', function (event) {
                event.stopPropagation();

                const pinnedIds = getPinnedScenarioIds();
                const scenarioId = card.dataset.scenarioId;
                const nextIds = pinnedIds.includes(scenarioId)
                    ? pinnedIds.filter(id => id !== scenarioId)
                    : pinnedIds.concat(scenarioId);

                savePinnedScenarioIds(nextIds);
                applyPinState();
                sortScenarioCards();
                updateSummary();
                refreshIcons();
            });

            toolbar.appendChild(pinButton);
        });
    }

    function updateSummary() {
        const visibleCards = scenarioCards.filter(card => card.style.display !== 'none');
        const count = visibleCards.length;
        const pinnedVisible = visibleCards.filter(card => card.classList.contains('pinned')).length;
        resultsSummary.textContent = `Showing ${count} scenario${count === 1 ? '' : 's'}${pinnedVisible ? ` • ${pinnedVisible} pinned` : ''}`;

        // Show empty state when no cards match the active filters.
        const emptyState = document.getElementById('scenario-empty-state');
        if (emptyState) {
            emptyState.classList.toggle('visible', count === 0);
        }
    }

    function normalize(value) {
        return (value || '').toLowerCase().trim();
    }

    function filterCards() {
        const q = normalize(searchInput.value);
        const difficulty = difficultyFilter.value;
        const platform = platformFilter.value;

        scenarioCards.forEach(card => {
            const title = normalize(card.dataset.title);
            const difficultyMatch = difficulty === 'all' || card.dataset.difficulty === difficulty;
            const platformMatch = platform === 'all' || card.dataset.platform === platform;
            const textMatch = !q || title.includes(q) || card.textContent.toLowerCase().includes(q);

            card.style.display = difficultyMatch && platformMatch && textMatch ? '' : 'none';
        });

        updateSummary();

        const selectedId = localStorage.getItem(SELECTED_STORAGE_KEY);
        const selectedCard = scenarioCards.find(card => card.dataset.scenarioId === selectedId && card.style.display !== 'none');
        if (selectedCard) {
            selectCard(selectedCard, false);
            return;
        }

        const firstVisibleCard = scenarioCards.find(card => card.style.display !== 'none');
        if (firstVisibleCard) {
            selectCard(firstVisibleCard, false);
        }
    }

    function setDetails(card) {
        const title = card.dataset.title;
        const difficulty = card.dataset.difficulty;
        const platform = card.dataset.platform;
        const status = card.dataset.status === 'available' ? 'Available Now' : 'Coming Soon';
        const isAvailable = card.dataset.status === 'available';
        const metrics = scenarioMetrics[card.dataset.scenarioId] || {};
        const isPinnedScenario = isPinned(card);
        // Null-safe access: not all scenario cards have a <p> description.
        const descEl = card.querySelector('p');
        const description = descEl ? escapeHtml(descEl.textContent) : '';
        const targetUrl = card.dataset.url || '#';

        scenarioDetails.innerHTML = `
            <h3 style="margin-bottom:0.6rem;">${escapeHtml(title)}</h3>
            <div class="detail-pills">
                <span class="status-badge ${isAvailable ? 'green' : 'blue'}">${escapeHtml(status)}</span>
                <span class="status-badge yellow" style="border-color:var(--border);color:var(--text-dim);background:rgba(51,65,85,0.2);">${escapeHtml(difficulty.charAt(0).toUpperCase() + difficulty.slice(1))}</span>
                <span class="status-badge blue" style="border-color:var(--border);color:var(--text-dim);background:rgba(51,65,85,0.2);">${escapeHtml(platform.charAt(0).toUpperCase() + platform.slice(1))}</span>
                <span class="status-badge ${isPinnedScenario ? 'yellow' : 'blue'}" style="border-color:var(--border);color:var(--text-dim);background:rgba(51,65,85,0.2);">${isPinnedScenario ? 'Pinned' : 'Previewed'}</span>
            </div>
            <p class="surface-note" style="font-size:0.92rem;margin-bottom:1rem;color:var(--text-dim);">${description}</p>
            <div class="grid-3" style="gap:0.75rem;margin-bottom:1rem;">
                <div class="metric-tile">
                    <div class="label">Readiness</div>
                    <div class="value" style="font-size:1.1rem;">${escapeHtml(metrics.readiness || '--')}</div>
                    <div class="subtext">Seeded for walkthrough</div>
                </div>
                <div class="metric-tile">
                    <div class="label">Telemetry</div>
                    <div class="value" style="font-size:0.92rem;">${escapeHtml(metrics.telemetry || '--')}</div>
                    <div class="subtext">Dummy dataset scope</div>
                </div>
                <div class="metric-tile">
                    <div class="label">Focus</div>
                    <div class="value" style="font-size:0.98rem;">${escapeHtml(metrics.focus || '--')}</div>
                    <div class="subtext">Primary analyst skill</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${isAvailable
                    // Use data-open-url instead of inline onclick to avoid XSS from dataset values.
                    ? `<button class="btn" type="button" data-open-url="${escapeHtml(targetUrl)}">Open Scenario</button>`
                    : `<button class="btn btn-secondary" type="button" disabled>Launch Unavailable</button>`
                }
                <button class="btn btn-secondary" type="button" data-preview-inline="${escapeHtml(card.dataset.scenarioId)}">View Preview</button>
            </div>
        `;

        const openBtn = scenarioDetails.querySelector('[data-open-url]');
        if (openBtn) {
            openBtn.addEventListener('click', function () {
                window.location.href = this.dataset.openUrl;
            });
        }

        const inlinePreviewButton = scenarioDetails.querySelector('[data-preview-inline]');
        if (inlinePreviewButton) {
            inlinePreviewButton.addEventListener('click', function () {
                openPreview(this.dataset.previewInline);
            });
        }

        renderSeedSnapshotForCard(card);
    }

    function selectCard(card, persist = true) {
        scenarioCards.forEach(item => item.classList.remove('selected'));
        card.classList.add('selected');
        setDetails(card);

        if (persist) {
            localStorage.setItem(SELECTED_STORAGE_KEY, card.dataset.scenarioId);
        }
    }

    function saveLastScenario(id, url, title) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, url, title }));
        updateResumeButton();
    }

    function updateResumeButton() {
        try {
            const lastScenario = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (lastScenario && lastScenario.url && lastScenario.title) {
                resumeLastBtn.style.display = 'inline-flex';
                // Build innerHTML safely — icon via data attribute, title via textContent node.
                resumeLastBtn.innerHTML = '';
                const icon = document.createElement('i');
                icon.setAttribute('data-lucide', 'history');
                icon.style.cssText = 'width:14px;display:inline;';
                const label = document.createElement('span');
                label.textContent = ' Resume ' + lastScenario.title;
                resumeLastBtn.appendChild(icon);
                resumeLastBtn.appendChild(label);
                resumeLastBtn.onclick = function () {
                    window.location.href = lastScenario.url;
                };
                refreshIcons();
            } else {
                resumeLastBtn.style.display = 'none';
            }
        } catch (error) {
            resumeLastBtn.style.display = 'none';
        }
    }

    function openModal(config) {
        // Use CSS class toggle (opacity transition) instead of display toggling.
        document.body.style.overflow = 'hidden';
        modal.classList.add('modal-open');
        modal.setAttribute('aria-hidden', 'false');

        const titleEl = document.getElementById('lab-modal-title');
        if (titleEl) {
            titleEl.innerHTML = `<i data-lucide="${escapeHtml(config.icon || 'eye')}"></i> ${escapeHtml(config.title || '')}`;
        }
        modalSubtitle.textContent = config.subtitle || '';
        modalBody.innerHTML = config.body || '';
        modalActions.innerHTML = config.actions || '';
        modalActions.style.display = config.actions ? 'flex' : 'none';
        refreshIcons();
    }

    function openPreview(id) {
        const data = previewData[id];
        if (!data) return;

        openModal({
            icon: 'eye',
            title: data.title,
            subtitle: data.subtitle,
            body: data.body
        });
    }

    function closePreview() {
        modal.classList.remove('modal-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        modalActions.innerHTML = '';
        modalActions.style.display = 'none';
    }

    function saveWorkspaceState(profile, scenarioId, url, title) {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({
            scenarioId,
            url,
            title,
            workspace: profile.workspace,
            vmName: profile.vmName,
            environment: profile.environment,
            status: 'running',
            startedAt: new Date().toISOString()
        }));
    }

    function launchScenario(card, launchButton) {
        const scenarioId = launchButton.dataset.scenarioId;
        const profile = launchProfiles[scenarioId];
        const isEvidencePack = scenarioId === 'scenario-b';
        if (!profile) {
            saveLastScenario(launchButton.dataset.scenarioId, launchButton.dataset.url, card.dataset.title);
            window.location.href = launchButton.dataset.url;
            return;
        }

        openModal({
            icon: profile.icon,
            title: profile.title,
            subtitle: profile.subtitle,
            body: `
                <div class="grid-2" style="margin-bottom:1rem;">
                    <div class="card" style="padding:1rem;">
                        <div class="card-title"><i data-lucide="${isEvidencePack ? 'folder-open-dot' : 'cpu'}"></i> ${isEvidencePack ? 'Evidence Pack' : 'VM Instance'}</div>
                        <div class="key-value-list" style="margin-top:0.75rem;">
                            <div class="key-value-item">
                                <span class="key">${isEvidencePack ? 'Pack Name' : 'VM Name'}</span>
                                <span class="value">${profile.vmName}</span>
                            </div>
                            <div class="key-value-item">
                                <span class="key">Workspace</span>
                                <span class="value">${profile.workspace}</span>
                            </div>
                            <div class="key-value-item">
                                <span class="key">Environment</span>
                                <span class="value">${profile.environment}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card" style="padding:1rem;">
                        <div class="card-title"><i data-lucide="workflow"></i> Boot Sequence</div>
                        <ul class="list-clean" style="font-size:0.88rem;margin-top:0.75rem;">
                            <li>Attach seeded scenario telemetry and run history</li>
                            <li>Prepare analyst workspace controls for ${card.dataset.title}</li>
                            <li>Preserve session state locally for resume support</li>
                        </ul>
                    </div>
                </div>
                <div class="card" style="padding:1rem;margin-bottom:1rem;">
                    <div class="card-title"><i data-lucide="app-window"></i> Workspace Services</div>
                    <ul class="list-clean" style="font-size:0.88rem;margin-top:0.75rem;">
                        ${profile.services.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                <div class="card" style="padding:1rem;">
                    <div class="card-title"><i data-lucide="database-zap"></i> Data Flow</div>
                    <ul class="list-clean" style="font-size:0.88rem;margin-top:0.75rem;">
                        ${profile.dataFlow.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                    <p class="surface-note" style="margin-top:0.85rem;">${profile.note}</p>
                </div>
            `,
            actions: `
                <button class="btn btn-secondary" type="button" id="launch-vm-cancel">Cancel</button>
                <button class="btn" type="button" id="launch-vm-confirm">
                    <i data-lucide="rocket"></i> ${isEvidencePack ? 'Load Evidence Pack' : 'Start VM'}
                </button>
            `
        });

        const cancelButton = document.getElementById('launch-vm-cancel');
        const confirmButton = document.getElementById('launch-vm-confirm');

        if (cancelButton) {
            cancelButton.addEventListener('click', closePreview);
        }

        if (confirmButton) {
            confirmButton.addEventListener('click', function () {
                confirmButton.disabled = true;
                confirmButton.innerHTML = `<i data-lucide="loader-2"></i> ${isEvidencePack ? 'Loading Workspace...' : 'Booting Workspace...'}`;
                modalSubtitle.textContent = isEvidencePack
                    ? `${profile.vmName} is loading. Preparing ${profile.workspace}.`
                    : `${profile.vmName} is starting. Preparing ${profile.workspace}.`;
                refreshIcons();

                saveLastScenario(scenarioId, launchButton.dataset.url, card.dataset.title);
                saveWorkspaceState(profile, scenarioId, launchButton.dataset.url, card.dataset.title);

                window.setTimeout(function () {
                    window.location.href = launchButton.dataset.url;
                }, 900);
            });
        }
    }

    scenarioCards.forEach(card => {
        const launchButton = card.querySelector('.launch-btn');
        const previewButton = card.querySelector('.preview-btn');

        card.addEventListener('click', function (event) {
            if (event.target.closest('button')) return;
            selectCard(card);
        });

        card.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectCard(card);
            }
        });

        if (launchButton) {
            launchButton.addEventListener('click', function (event) {
                event.stopPropagation();
                launchScenario(card, this);
            });
        }

        if (previewButton) {
            previewButton.addEventListener('click', function (event) {
                event.stopPropagation();
                openPreview(card.dataset.scenarioId);
            });
        }
    });

    searchInput.addEventListener('input', filterCards);
    difficultyFilter.addEventListener('change', filterCards);
    platformFilter.addEventListener('change', filterCards);

    clearFiltersBtn.addEventListener('click', function () {
        searchInput.value = '';
        difficultyFilter.value = 'all';
        platformFilter.value = 'all';
        filterCards();
    });

    closeModalBtn.addEventListener('click', closePreview);
    modal.addEventListener('click', function (event) {
        if (event.target === modal) closePreview();
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && modal.classList.contains('modal-open')) {
            closePreview();
        }
    });

    hydrateLabData().finally(function () {
        createPinButtons();
        applyPinState();
        sortScenarioCards();
        updateResumeButton();
        filterCards();
        const storedSelection = localStorage.getItem(SELECTED_STORAGE_KEY);
        const selectedCard = scenarioCards.find(card => card.dataset.scenarioId === storedSelection) || scenarioCards[0];
        selectCard(selectedCard, false);
        refreshIcons();
    });
})();
