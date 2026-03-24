(function () {
    'use strict';

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
    const PINNED_STORAGE_KEY = 'irsp-pinned-scenarios';
    const SELECTED_STORAGE_KEY = 'irsp-selected-scenario';
    const scenarioMetrics = {
        'scenario-a': { readiness: '98%', telemetry: '27 alerts, 188 sessions', focus: 'Containment', owner: 'Blue Team Alpha', status: 'ready', alertsSeeded: 27, eventsSeeded: 42381 },
        'scenario-b': { readiness: '96%', telemetry: '19 alerts, 4 confirmed IOCs', focus: 'Investigation', owner: 'Analyst Cohort 2', status: 'ready', alertsSeeded: 19, eventsSeeded: 18422 },
        'scenario-c': { readiness: '62%', telemetry: 'voice transcript + email trail', focus: 'Awareness', owner: 'Awareness Lab', status: 'prototype', alertsSeeded: 8, eventsSeeded: 920 },
        'scenario-d': { readiness: '58%', telemetry: 'traffic spikes + service health', focus: 'Availability', owner: 'Network Defense Lab', status: 'prototype', alertsSeeded: 12, eventsSeeded: 5410 },
        'scenario-e': { readiness: '54%', telemetry: 'USB logs + proxy uploads', focus: 'Insider Risk', owner: 'Insider Risk PM', status: 'prototype', alertsSeeded: 14, eventsSeeded: 2640 },
        'scenario-f': { readiness: '57%', telemetry: 'IAM audit trails + sign-ins', focus: 'Cloud IAM', owner: 'Cloud IAM Team', status: 'prototype', alertsSeeded: 11, eventsSeeded: 3180 }
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
            subtitle: 'Beginner | Planned Module',
            body: `
                <div class="alert-item warning" style="margin-bottom:1rem;">
                    <div class="alert-info">
                        <h4>Status</h4>
                        <p>This scenario is not yet linked to a full lab page, but the concept is already represented in the platform roadmap.</p>
                    </div>
                </div>
                <p class="surface-note">Intended focus: executive impersonation, escalation judgment, phishing awareness, and communication handling.</p>
            `
        },
        'scenario-d': {
            title: 'Scenario D: DDoS Mitigation',
            subtitle: 'Intermediate | Planned Module',
            body: `
                <div class="alert-item warning" style="margin-bottom:1rem;">
                    <div class="alert-info">
                        <h4>Status</h4>
                        <p>This scenario is planned but does not yet have a linked page. You can still keep it visible as part of the training roadmap.</p>
                    </div>
                </div>
                <p class="surface-note">Intended focus: traffic spike analysis, service impact review, mitigation planning, and recovery coordination.</p>
            `
        },
        'scenario-e': {
            title: 'Scenario E: Insider Exfiltration Review',
            subtitle: 'Advanced | Prototype Module',
            body: `
                <div class="alert-item warning" style="margin-bottom:1rem;">
                    <div class="alert-info">
                        <h4>Prototype Focus</h4>
                        <p>Archive creation, removable media correlation, and outbound transfer review tied to insider-risk workflows.</p>
                    </div>
                </div>
                <p class="surface-note">Seeded artifacts include USB insertion logs, ZIP creation events, and proxy uploads to a personal file-sharing domain.</p>
            `
        },
        'scenario-f': {
            title: 'Scenario F: Cloud IAM Privilege Escalation',
            subtitle: 'Intermediate | Prototype Module',
            body: `
                <div class="alert-item warning" style="margin-bottom:1rem;">
                    <div class="alert-info">
                        <h4>Prototype Focus</h4>
                        <p>Role assumption anomalies, policy drift, and privileged token review across cloud control-plane logs.</p>
                    </div>
                </div>
                <p class="surface-note">Seeded artifacts include CloudTrail-style audit rows, impossible-travel sign-ins, and admin role changes outside change windows.</p>
            `
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

        readinessShell.innerHTML = `<span class="accent">search</span> index=responsegrid sourcetype=lab:status scenario_id=*
| stats latest(status) as status latest(owner) as owner latest(readiness) as readiness by scenario_id
| sort scenario_id

${rows.join('\n')}`;
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
        availablePathsNote.textContent = `${liveCount} live exercises, ${prototypeCount} prototype modules`;
        advancedMetric.textContent = String(advancedCount).padStart(2, '0');
        advancedMetricNote.textContent = `${advancedCount} advanced exercises seeded for higher-pressure response drills.`;
        liveMetric.textContent = String(liveCount).padStart(2, '0');
        liveMetricNote.textContent = `${liveCount} scenarios are launchable through the mock backend and UI flow.`;
        prototypeMetric.textContent = String(prototypeCount).padStart(2, '0');
        prototypeMetricNote.textContent = `${prototypeCount} modules remain in prototype review for roadmap demos.`;

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

        scenarioDetails.innerHTML = `
            <h3 style="margin-bottom:0.6rem;">${title}</h3>
            <div class="detail-pills">
                <span class="status-badge ${isAvailable ? 'green' : 'blue'}">${status}</span>
                <span class="status-badge yellow" style="border-color:var(--border);color:var(--text-dim);background:rgba(51,65,85,0.2);">${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
                <span class="status-badge blue" style="border-color:var(--border);color:var(--text-dim);background:rgba(51,65,85,0.2);">${platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                <span class="status-badge ${isPinnedScenario ? 'yellow' : 'blue'}" style="border-color:var(--border);color:var(--text-dim);background:rgba(51,65,85,0.2);">${isPinnedScenario ? 'Pinned' : 'Previewed'}</span>
            </div>
            <p class="surface-note" style="font-size:0.92rem;margin-bottom:1rem;color:var(--text-dim);">
                ${card.querySelector('p').textContent}
            </p>
            <div class="grid-3" style="gap:0.75rem;margin-bottom:1rem;">
                <div class="metric-tile">
                    <div class="label">Readiness</div>
                    <div class="value" style="font-size:1.1rem;">${metrics.readiness || '--'}</div>
                    <div class="subtext">Seeded for walkthrough</div>
                </div>
                <div class="metric-tile">
                    <div class="label">Telemetry</div>
                    <div class="value" style="font-size:0.92rem;">${metrics.telemetry || '--'}</div>
                    <div class="subtext">Dummy dataset scope</div>
                </div>
                <div class="metric-tile">
                    <div class="label">Focus</div>
                    <div class="value" style="font-size:0.98rem;">${metrics.focus || '--'}</div>
                    <div class="subtext">Primary analyst skill</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${isAvailable
                    ? `<button class="btn" type="button" onclick="window.location.href='${card.dataset.url}'">Open Scenario</button>`
                    : `<button class="btn btn-secondary" type="button" disabled>Launch Unavailable</button>`
                }
                <button class="btn btn-secondary" type="button" data-preview-inline="${card.dataset.scenarioId}">View Preview</button>
            </div>
        `;

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
                resumeLastBtn.innerHTML = `<i data-lucide="history" style="width:14px;display:inline;"></i> Resume ${lastScenario.title}`;
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

    function openPreview(id) {
        const data = previewData[id];
        if (!data) return;

        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        document.getElementById('lab-modal-title').innerHTML = `<i data-lucide="eye"></i> ${data.title}`;
        modalSubtitle.textContent = data.subtitle;
        modalBody.innerHTML = data.body;
        refreshIcons();
    }

    function closePreview() {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
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
                saveLastScenario(this.dataset.scenarioId, this.dataset.url, card.dataset.title);
                window.location.href = this.dataset.url;
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
        if (event.key === 'Escape' && modal.style.display === 'flex') {
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
