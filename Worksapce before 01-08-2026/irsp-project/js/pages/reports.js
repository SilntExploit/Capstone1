(function () {
    'use strict';

    const rows = Array.from(document.querySelectorAll('.report-row'));
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

    const detailData = {
        r1: {
            title: 'Scenario A – Ransomware',
            summary: 'Strong overall containment execution with clear coordination and quick entry-point recognition.',
            strengths: ['Fast entry-point identification', 'Good containment discipline', 'Strong team communication'],
            gaps: ['C2 block timing could be faster', 'Forensic snapshot was missed'],
            next: 'Repeat Scenario A with emphasis on earlier outbound traffic disruption and evidence preservation.'
        },
        r2: {
            title: 'Scenario B – Compromised Host',
            summary: 'Solid investigation flow with good host-focused analysis, though timing and evidence mapping can improve.',
            strengths: ['Good IOC review', 'Correct host focus', 'Reasonable overall completion'],
            gaps: ['Timeline building was slower than target', 'Persistence removal sequence needs refinement'],
            next: 'Re-run Scenario B and focus on persistence review plus faster timeline assembly.'
        },
        r3: {
            title: 'Scenario A – Ransomware',
            summary: 'The run showed understanding of the scenario flow, but containment decisions were delayed.',
            strengths: ['Scenario familiarity', 'Basic investigation path followed'],
            gaps: ['Containment lag', 'Recovery steps started too early', 'Scoring consistency needs improvement'],
            next: 'Practice incident sequencing: detect, contain, preserve, eradicate, then recover.'
        },
        r4: {
            title: 'Scenario B – Compromised Host',
            summary: 'Best recent run with strong balance between analysis speed and action quality.',
            strengths: ['Fast triage', 'High score', 'Clear host containment decisions'],
            gaps: ['Minor room for better evidence labeling'],
            next: 'Use this run as the benchmark pattern for future intermediate investigations.'
        },
        r5: {
            title: 'Scenario A – Ransomware',
            summary: 'This run struggled with containment timing and recovery readiness under pressure.',
            strengths: ['Basic detection awareness'],
            gaps: ['Late containment', 'Low score', 'Insufficient eradication planning'],
            next: 'Reinforce core containment drills before retaking the advanced scenario.'
        }
    };

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function updateSummary() {
        const visibleRows = rows.filter(row => row.style.display !== 'none').length;
        filterSummary.textContent = `Showing ${visibleRows} result${visibleRows === 1 ? '' : 's'}`;
    }

    function filterRows() {
        const query = searchInput.value.trim().toLowerCase();
        const scenario = scenarioFilter.value;
        const status = statusFilter.value;

        rows.forEach(row => {
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

    function setSnapshotValues(score) {
        const numeric = Number(score) || 0;
        const containment = Math.min(95, numeric + 4);
        const investigation = Math.max(45, numeric - 2);
        const comms = Math.min(98, numeric + 8);

        containmentBar.style.width = containment + '%';
        investigationBar.style.width = investigation + '%';
        commsBar.style.width = comms + '%';

        containmentText.textContent = containment + '%';
        investigationText.textContent = investigation + '%';
        commsText.textContent = comms + '%';
    }

    function renderReportDetail(row) {
        const id = row.dataset.reportId;
        const item = detailData[id];
        if (!item) return;

        rows.forEach(r => {
            r.style.outline = '';
        });
        row.style.outline = '2px solid var(--accent-blue)';
        row.style.outlineOffset = '-2px';

        reportDetailPanel.innerHTML = `
            <h3 style="margin-bottom:0.5rem;">${item.title}</h3>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:0.85rem;">
                <span class="status-badge blue" style="border-color:var(--border);color:var(--text-main);background:rgba(51,65,85,0.35);">${row.dataset.date}</span>
                <span class="status-badge blue" style="border-color:var(--border);color:var(--text-main);background:rgba(51,65,85,0.35);">${row.dataset.team}</span>
                <span class="status-badge blue" style="border-color:var(--border);color:var(--text-main);background:rgba(51,65,85,0.35);">Duration: ${row.dataset.duration}</span>
                <span class="status-badge ${row.dataset.status === 'Passed' ? 'green' : row.dataset.status === 'Failed' ? 'red' : 'yellow'}">${row.dataset.score}%</span>
            </div>
            <p style="color:var(--text-dim);font-size:0.92rem;margin-bottom:1rem;">${item.summary}</p>

            <div style="margin-bottom:1rem;">
                <div style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem;">Strengths</div>
                <ul class="list-clean" style="font-size:0.88rem;">
                    ${item.strengths.map(s => `<li>${s}</li>`).join('')}
                </ul>
            </div>

            <div style="margin-bottom:1rem;">
                <div style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem;">Improvement Areas</div>
                <ul class="list-clean" style="font-size:0.88rem;">
                    ${item.gaps.map(g => `<li>${g}</li>`).join('')}
                </ul>
            </div>

            <div>
                <div style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem;">Recommended Follow-up</div>
                <p style="font-size:0.88rem;color:var(--text-dim);">${item.next}</p>
            </div>
        `;

        setSnapshotValues(row.dataset.score);
    }

    rows.forEach(row => {
        row.addEventListener('click', function () {
            renderReportDetail(this);
        });

        row.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                renderReportDetail(this);
            }
        });
    });

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
        const visibleRows = rows.filter(row => row.style.display !== 'none');
        if (!visibleRows.length) {
            statSims.textContent = '0';
            statResponse.textContent = '--:--';
            statScore.textContent = '--';
            return;
        }

        const totalScore = visibleRows.reduce((sum, row) => sum + Number(row.dataset.score || 0), 0);
        const avgScore = Math.round(totalScore / visibleRows.length);

        statSims.textContent = String(visibleRows.length);
        statScore.textContent = avgScore + '%';

        const avgDurationSeconds = Math.round(
            visibleRows.reduce((sum, row) => {
                const parts = (row.dataset.duration || '0:00').split(':').map(Number);
                return sum + ((parts[0] || 0) * 60) + (parts[1] || 0);
            }, 0) / visibleRows.length
        );

        const minutes = String(Math.floor(avgDurationSeconds / 60)).padStart(2, '0');
        const seconds = String(avgDurationSeconds % 60).padStart(2, '0');
        statResponse.textContent = `${minutes}:${seconds}`;
    });

    exportReportBtn.addEventListener('click', function () {
        const activeRow = rows.find(row => row.style.outline);
        const reportName = activeRow ? activeRow.dataset.title : 'ResponseGrid Report Summary';
        window.print();
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

    filterRows();
    renderReportDetail(rows[0]);
    refreshIcons();
})();
