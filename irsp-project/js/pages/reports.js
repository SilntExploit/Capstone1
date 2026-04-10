(function () {
    'use strict';

    const LIVE_REPORT_KEYS = ['irsp-scenario-a-report', 'irsp-scenario-b-report'];
    let rows = [];

    const searchInput = document.getElementById('history-search');
    const scenarioFilter = document.getElementById('scenario-filter');
    const statusFilter = document.getElementById('status-filter');
    const filterSummary = document.getElementById('filter-summary');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const reportDetailPanel = document.getElementById('report-detail-panel');
    const refreshMetricsBtn = document.getElementById('refresh-metrics-btn');
    const exportReportBtn = document.getElementById('export-report-btn');
    const copySummaryBtn = document.getElementById('copy-summary-btn');

    const statSims = document.getElementById('stat-sims');
    const statResponse = document.getElementById('stat-response');
    const statScore = document.getElementById('stat-score');

    const containmentBar = document.getElementById('containment-bar');
    const investigationBar = document.getElementById('investigation-bar');
    const commsBar = document.getElementById('comms-bar');

    const containmentText = document.getElementById('snapshot-containment');
    const investigationText = document.getElementById('snapshot-investigation');
    const commsText = document.getElementById('snapshot-comms');

    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackCards = document.getElementById('feedback-cards');
    const feedbackNextSteps = document.getElementById('feedback-next-steps');
    const feedbackChecklist = document.getElementById('feedback-checklist');
    const printSheet = document.getElementById('print-report-sheet');
    const printTitle = document.getElementById('print-report-title');
    const printMeta = document.getElementById('print-report-meta');
    const printBody = document.getElementById('print-report-body');

    const detailData = {
        r1: {
            title: 'Scenario A – Ransomware',
            summary: 'Strong overall containment execution with clear coordination and quick entry-point recognition.',
            strengths: ['Fast entry-point identification', 'Good containment discipline', 'Strong team communication'],
            gaps: ['C2 block timing could be faster', 'Forensic snapshot was missed'],
            next: 'Repeat Scenario A with emphasis on earlier outbound traffic disruption and evidence preservation.',
            containment: 89,
            investigation: 83,
            comms: 91,
            feedback: {
                title: 'Latest Feedback – Scenario A',
                cards: [
                    { tone: 'success', heading: 'Strength: Rapid identification', body: 'Entry point was identified within three minutes, well ahead of the internal benchmark pace.' },
                    { tone: 'success', heading: 'Strength: Team communication', body: 'Incident channel usage remained consistent during containment and supported synchronized decision-making.' },
                    { tone: 'warning', heading: 'Improvement: Delayed C2 block', body: 'C2 traffic was blocked later than ideal. Earlier disruption would have reduced scenario impact.' },
                    { tone: 'info', heading: 'Gap: Missing forensic snapshot', body: 'Evidence preservation should move earlier in the workflow before cleanup actions start.' }
                ],
                nextSteps: [
                    'Review the containment workflow before moving to eradication actions.',
                    'Practice snapshot and preservation procedures inside the sandbox.',
                    'Rehearse outbound blocking and credential review steps for faster response timing.'
                ],
                checklist: [
                    { title: 'Document evidence before cleanup', note: 'Preserve useful incident artifacts', done: true },
                    { title: 'Validate containment before recovery', note: 'Reduce repeat-compromise risk', done: true },
                    { title: 'Speed up outbound traffic response', note: 'Improve command-and-control disruption timing', done: false }
                ]
            }
        },
        r2: {
            title: 'Scenario B – Compromised Host',
            summary: 'Solid investigation flow with good host-focused analysis, though timing and evidence mapping can improve.',
            strengths: ['Good IOC review', 'Correct host focus', 'Reasonable overall completion'],
            gaps: ['Timeline building was slower than target', 'Persistence removal sequence needs refinement'],
            next: 'Re-run Scenario B and focus on persistence review plus faster timeline assembly.',
            containment: 74,
            investigation: 80,
            comms: 78,
            feedback: {
                title: 'Latest Feedback – Scenario B',
                cards: [
                    { tone: 'success', heading: 'Strength: Host-focused triage', body: 'The investigation stayed anchored to the compromised host and its strongest evidence sources.' },
                    { tone: 'success', heading: 'Strength: IOC validation', body: 'Core indicators were mapped cleanly across domain, IP, tool, and phishing artifacts.' },
                    { tone: 'warning', heading: 'Improvement: Timeline pacing', body: 'The host timeline took longer than target once credential dumping evidence appeared.' },
                    { tone: 'info', heading: 'Gap: Persistence removal sequence', body: 'The scheduled task foothold should be documented and cleared more decisively after containment.' }
                ],
                nextSteps: [
                    'Run the same case starting from raw logs only before opening the summarized query panel.',
                    'Practice building the attack chain from email delivery to persistence in one pass.',
                    'Tighten the sequence between host containment and persistence removal.'
                ],
                checklist: [
                    { title: 'Confirm initial access chain', note: 'Map email, document, and PowerShell execution together', done: true },
                    { title: 'Contain the compromised host', note: 'Reduce exposure after credential dumping is confirmed', done: false },
                    { title: 'Remove persistence cleanly', note: 'Resolve the scheduled task after evidence review', done: false }
                ]
            }
        },
        r3: {
            title: 'Scenario A – Ransomware',
            summary: 'The run showed understanding of the scenario flow, but containment decisions were delayed.',
            strengths: ['Scenario familiarity', 'Basic investigation path followed'],
            gaps: ['Containment lag', 'Recovery steps started too early', 'Scoring consistency needs improvement'],
            next: 'Practice incident sequencing: detect, contain, preserve, eradicate, then recover.',
            containment: 66,
            investigation: 59,
            comms: 68
        },
        r4: {
            title: 'Scenario B – Compromised Host',
            summary: 'Best recent run with strong balance between analysis speed and action quality.',
            strengths: ['Fast triage', 'High score', 'Clear host containment decisions'],
            gaps: ['Minor room for better evidence labeling'],
            next: 'Use this run as the benchmark pattern for future intermediate investigations.',
            containment: 93,
            investigation: 89,
            comms: 90
        },
        r5: {
            title: 'Scenario A – Ransomware',
            summary: 'This run struggled with containment timing and recovery readiness under pressure.',
            strengths: ['Basic detection awareness'],
            gaps: ['Late containment', 'Low score', 'Insufficient eradication planning'],
            next: 'Reinforce core containment drills before retaking the advanced scenario.',
            containment: 54,
            investigation: 51,
            comms: 63
        }
    };

    function collectRows() {
        rows = Array.from(document.querySelectorAll('.report-row'));
    }

    function readJSON(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || 'null');
        } catch (error) {
            return null;
        }
    }

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function statusBadgeClass(status) {
        return status === 'Passed' ? 'green' : status === 'Failed' ? 'red' : 'yellow';
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function upsertLiveReportRow(report) {
        const tableBody = document.getElementById('history-table-body');
        if (!tableBody || !report) return;

        const existing = document.querySelector(`[data-report-id="${report.id}"]`);
        const row = existing || document.createElement('tr');

        row.className = 'report-row';
        row.tabIndex = 0;
        row.dataset.reportId = report.id;
        row.dataset.scenario = report.scenario;
        row.dataset.status = report.status;
        row.dataset.date = report.date;
        row.dataset.team = report.team;
        row.dataset.duration = report.duration;
        row.dataset.score = String(report.score);
        row.dataset.title = report.title;
        row.innerHTML = `
            <td>${escapeHtml(report.date)}</td>
            <td>${escapeHtml(report.scenario)} – ${escapeHtml(report.title.split('–')[1] ? report.title.split('–')[1].trim() : report.title)}</td>
            <td>${escapeHtml(report.team)}</td>
            <td>${escapeHtml(report.duration)}</td>
            <td>${escapeHtml(report.score)}%</td>
            <td><span class="status-badge ${statusBadgeClass(report.status)}">${escapeHtml(report.status)}</span></td>
        `;

        if (!existing) {
            tableBody.insertBefore(row, tableBody.firstChild);
        }

        detailData[report.id] = {
            title: report.title,
            summary: report.summary,
            strengths: report.strengths,
            gaps: report.gaps,
            next: report.next,
            containment: report.containment,
            investigation: report.investigation,
            comms: report.comms,
            feedback: report.feedback || null
        };
    }

    function hydrateLiveReports() {
        LIVE_REPORT_KEYS.map(readJSON).filter(Boolean).forEach(upsertLiveReportRow);
        collectRows();
    }

    function updateSummary() {
        const visibleRows = rows.filter(function (row) {
            return row.style.display !== 'none';
        }).length;
        filterSummary.textContent = `Showing ${visibleRows} result${visibleRows === 1 ? '' : 's'}`;
    }

    function filterRows() {
        const query = searchInput.value.trim().toLowerCase();
        const scenario = scenarioFilter.value;
        const status = statusFilter.value;

        rows.forEach(function (row) {
            const title = (row.dataset.title || '').toLowerCase();
            const team = (row.dataset.team || '').toLowerCase();
            const rowScenario = row.dataset.scenario;
            const rowStatus = (row.dataset.status || '').toLowerCase();
            const matchesQuery = !query || title.includes(query) || team.includes(query) || row.dataset.date.includes(query);
            const matchesScenario = scenario === 'all' || rowScenario === scenario;
            const matchesStatus = status === 'all' || rowStatus === status;
            row.style.display = matchesQuery && matchesScenario && matchesStatus ? '' : 'none';
        });

        updateSummary();
    }

    function setSnapshotValues(item, score) {
        const numeric = Number(score) || 0;
        const containment = item && typeof item.containment === 'number' ? item.containment : Math.min(95, numeric + 4);
        const investigation = item && typeof item.investigation === 'number' ? item.investigation : Math.max(45, numeric - 2);
        const comms = item && typeof item.comms === 'number' ? item.comms : Math.min(98, numeric + 8);

        containmentBar.style.width = containment + '%';
        investigationBar.style.width = investigation + '%';
        commsBar.style.width = comms + '%';

        containmentText.textContent = containment + '%';
        investigationText.textContent = investigation + '%';
        commsText.textContent = comms + '%';
    }

    function fallbackFeedback(item) {
        return {
            title: `Latest Feedback – ${item.title}`,
            cards: [
                { tone: 'success', heading: 'Strength', body: item.strengths[0] || 'The run shows a usable baseline for future iterations.' },
                { tone: 'warning', heading: 'Improvement', body: item.gaps[0] || 'Keep tightening execution quality across the workflow.' }
            ],
            nextSteps: [item.next],
            checklist: [
                { title: 'Rehearse the core workflow', note: 'Repeat the scenario using the same sequence with cleaner pacing.', done: false },
                { title: 'Review the largest gap', note: item.gaps[0] || 'Focus on the most visible improvement area.', done: false }
            ]
        };
    }

    function renderFeedback(item) {
        const feedback = item.feedback || fallbackFeedback(item);
        feedbackTitle.innerHTML = `<i data-lucide="message-circle"></i> ${escapeHtml(feedback.title)}`;
        feedbackCards.innerHTML = feedback.cards.map(function (card) {
            const toneClass = card.tone === 'success' ? 'success' : card.tone === 'warning' ? 'warning' : 'info';
            return `
                <div class="alert-item ${toneClass}">
                    <div class="alert-info">
                        <h4>${escapeHtml(card.heading)}</h4>
                        <p>${escapeHtml(card.body)}</p>
                    </div>
                </div>
            `;
        }).join('');

        feedbackNextSteps.innerHTML = feedback.nextSteps.map(function (step) {
            return `<li>${escapeHtml(step)}</li>`;
        }).join('');

        feedbackChecklist.innerHTML = feedback.checklist.map(function (item) {
            return `
                <div class="toggle-row">
                    <div>
                        <div style="font-weight:600;font-size:0.92rem;">${escapeHtml(item.title)}</div>
                        <div class="surface-note">${escapeHtml(item.note)}</div>
                    </div>
                    <div class="toggle${item.done ? ' on' : ''}" data-static-toggle="true"></div>
                </div>
            `;
        }).join('');

        refreshIcons();
    }

    function renderReportDetail(row) {
        const item = detailData[row.dataset.reportId];
        if (!item) return;

        rows.forEach(function (current) {
            current.style.outline = '';
        });
        row.style.outline = '2px solid var(--accent-blue)';
        row.style.outlineOffset = '-2px';

        reportDetailPanel.innerHTML = `
            <h3 style="margin-bottom:0.5rem;">${escapeHtml(item.title)}</h3>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:0.85rem;">
                <span class="status-badge blue" style="border-color:var(--border);color:var(--text-main);background:rgba(51,65,85,0.35);">${escapeHtml(row.dataset.date)}</span>
                <span class="status-badge blue" style="border-color:var(--border);color:var(--text-main);background:rgba(51,65,85,0.35);">${escapeHtml(row.dataset.team)}</span>
                <span class="status-badge blue" style="border-color:var(--border);color:var(--text-main);background:rgba(51,65,85,0.35);">Duration: ${escapeHtml(row.dataset.duration)}</span>
                <span class="status-badge ${statusBadgeClass(row.dataset.status)}">${escapeHtml(row.dataset.score)}%</span>
            </div>
            <p style="color:var(--text-dim);font-size:0.92rem;margin-bottom:1rem;">${escapeHtml(item.summary)}</p>
            <div style="margin-bottom:1rem;">
                <div style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem;">Strengths</div>
                <ul class="list-clean" style="font-size:0.88rem;">
                    ${item.strengths.map(function (entry) { return `<li>${escapeHtml(entry)}</li>`; }).join('')}
                </ul>
            </div>
            <div style="margin-bottom:1rem;">
                <div style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem;">Improvement Areas</div>
                <ul class="list-clean" style="font-size:0.88rem;">
                    ${item.gaps.map(function (entry) { return `<li>${escapeHtml(entry)}</li>`; }).join('')}
                </ul>
            </div>
            <div>
                <div style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem;">Recommended Follow-up</div>
                <p style="font-size:0.88rem;color:var(--text-dim);">${escapeHtml(item.next)}</p>
            </div>
        `;

        setSnapshotValues(item, row.dataset.score);
        renderFeedback(item);
        renderPrintSheet(row, item);
    }

    function renderPrintSheet(row, item) {
        if (!printSheet || !printBody || !row || !item) return;

        printSheet.hidden = false;
        printTitle.textContent = item.title;
        printMeta.textContent = `${row.dataset.date} | ${row.dataset.team} | Duration ${row.dataset.duration} | Score ${row.dataset.score}% | ${row.dataset.status}`;
        printBody.innerHTML = `
            <div class="card" style="margin-bottom:1rem;">
                <div class="card-title">Executive Summary</div>
                <p class="surface-note" style="font-size:1rem;line-height:1.7;">${escapeHtml(item.summary)}</p>
            </div>
            <div class="grid-2-1" style="margin-bottom:1rem;">
                <div class="card">
                    <div class="card-title">Performance Snapshot</div>
                    <div class="key-value-list">
                        <div class="key-value-item">
                            <span class="key">Containment</span>
                            <span class="value">${escapeHtml(item.containment || '--')}%</span>
                        </div>
                        <div class="key-value-item">
                            <span class="key">Investigation</span>
                            <span class="value">${escapeHtml(item.investigation || '--')}%</span>
                        </div>
                        <div class="key-value-item">
                            <span class="key">Communication</span>
                            <span class="value">${escapeHtml(item.comms || '--')}%</span>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-title">Recommended Follow-up</div>
                    <p class="surface-note" style="font-size:1rem;line-height:1.7;">${escapeHtml(item.next)}</p>
                </div>
            </div>
            <div class="grid-2" style="margin-bottom:1rem;">
                <div class="card">
                    <div class="card-title">Strengths</div>
                    <ul class="list-clean" style="font-size:0.95rem;line-height:1.8;">
                        ${item.strengths.map(function (entry) { return `<li>${escapeHtml(entry)}</li>`; }).join('')}
                    </ul>
                </div>
                <div class="card">
                    <div class="card-title">Improvement Areas</div>
                    <ul class="list-clean" style="font-size:0.95rem;line-height:1.8;">
                        ${item.gaps.map(function (entry) { return `<li>${escapeHtml(entry)}</li>`; }).join('')}
                    </ul>
                </div>
            </div>
            <div class="card">
                <div class="card-title">Coaching Summary</div>
                <ul class="list-clean" style="font-size:0.95rem;line-height:1.8;">
                    ${fallbackFeedback(item).nextSteps.map(function (entry) { return `<li>${escapeHtml(entry)}</li>`; }).join('')}
                </ul>
            </div>
        `;
    }

    function teardownPrintMode() {
        document.body.classList.remove('print-report-mode');
        if (printSheet) {
            printSheet.hidden = true;
        }
    }

    function attachRowHandlers(row) {
        if (!row || row.dataset.bound === 'true') return;
        row.dataset.bound = 'true';

        row.addEventListener('click', function () {
            renderReportDetail(this);
        });

        row.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                renderReportDetail(this);
            }
        });
    }

    searchInput.addEventListener('input', filterRows);
    scenarioFilter.addEventListener('change', filterRows);
    statusFilter.addEventListener('change', filterRows);

    clearFiltersBtn.addEventListener('click', function () {
        searchInput.value = '';
        scenarioFilter.value = 'all';
        statusFilter.value = 'all';
        filterRows();
    });

    refreshMetricsBtn.addEventListener('click', function () {
        hydrateLiveReports();
        rows.forEach(attachRowHandlers);
        filterRows();

        const visibleRows = rows.filter(function (row) {
            return row.style.display !== 'none';
        });

        if (!visibleRows.length) {
            statSims.textContent = '0';
            statResponse.textContent = '--:--';
            statScore.textContent = '--';
            return;
        }

        const totalScore = visibleRows.reduce(function (sum, row) {
            return sum + Number(row.dataset.score || 0);
        }, 0);
        const avgScore = Math.round(totalScore / visibleRows.length);

        statSims.textContent = String(visibleRows.length);
        statScore.textContent = avgScore + '%';

        const avgDurationSeconds = Math.round(visibleRows.reduce(function (sum, row) {
            const parts = (row.dataset.duration || '0:00').split(':').map(Number);
            return sum + ((parts[0] || 0) * 60) + (parts[1] || 0);
        }, 0) / visibleRows.length);

        const minutes = String(Math.floor(avgDurationSeconds / 60)).padStart(2, '0');
        const seconds = String(avgDurationSeconds % 60).padStart(2, '0');
        statResponse.textContent = `${minutes}:${seconds}`;
        filterSummary.textContent = `Metrics refreshed for ${visibleRows.length} result${visibleRows.length === 1 ? '' : 's'}`;
    });

    exportReportBtn.addEventListener('click', function () {
        const activeRow = rows.find(function (row) {
            return row.style.outline;
        });
        const reportName = activeRow ? activeRow.dataset.title : 'ResponseGrid Report Summary';
        if (activeRow) {
            const activeItem = detailData[activeRow.dataset.reportId];
            renderPrintSheet(activeRow, activeItem);
        }
        document.body.classList.add('print-report-mode');
        window.print();
        window.setTimeout(teardownPrintMode, 250);
        this.blur();
        filterSummary.textContent = `${reportName} ready for export or print`;
    });

    copySummaryBtn.addEventListener('click', async function () {
        const panelText = reportDetailPanel.innerText.trim();
        if (!panelText || panelText.includes('Select a simulation result')) {
            return;
        }

        try {
            await navigator.clipboard.writeText(panelText);
            this.textContent = 'Summary Copied';
            setTimeout(() => {
                this.textContent = 'Copy Summary';
            }, 1600);
        } catch (error) {
            this.textContent = 'Copy Unavailable';
            setTimeout(() => {
                this.textContent = 'Copy Summary';
            }, 1600);
        }
    });

    hydrateLiveReports();
    collectRows();
    rows.forEach(attachRowHandlers);
    filterRows();
    if (rows.length) {
        renderReportDetail(rows[0]);
    }
    window.addEventListener('afterprint', teardownPrintMode);
    refreshIcons();
})();
