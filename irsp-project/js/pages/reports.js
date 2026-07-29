(function () {
    'use strict';

    const LIVE_REPORT_KEYS = ['irsp-scenario-a-report', 'irsp-scenario-b-report'];
    let rows = [];
    let activeReportRow = null;

    const searchInput       = document.getElementById('history-search');
    const scenarioFilter    = document.getElementById('scenario-filter');
    const statusFilter      = document.getElementById('status-filter');
    const filterSummary     = document.getElementById('filter-summary');
    const clearFiltersBtn   = document.getElementById('clear-filters-btn');
    const reportDetailPanel = document.getElementById('report-detail-panel');
    const refreshMetricsBtn = document.getElementById('refresh-metrics-btn');
    const exportReportBtn   = document.getElementById('export-report-btn');
    const copySummaryBtn    = document.getElementById('copy-summary-btn');
    const historyTableBody  = document.getElementById('history-table-body');

    const statSims          = document.getElementById('stat-sims');
    const statResponse      = document.getElementById('stat-response');
    const statScore         = document.getElementById('stat-score');

    const containmentBar    = document.getElementById('containment-bar');
    const investigationBar  = document.getElementById('investigation-bar');
    const commsBar          = document.getElementById('comms-bar');
    const containmentText   = document.getElementById('snapshot-containment');
    const investigationText = document.getElementById('snapshot-investigation');
    const commsText         = document.getElementById('snapshot-comms');

    const feedbackTitle     = document.getElementById('feedback-title');
    const feedbackCards     = document.getElementById('feedback-cards');
    const feedbackNextSteps = document.getElementById('feedback-next-steps');
    const feedbackChecklist = document.getElementById('feedback-checklist');
    const printSheet        = document.getElementById('print-report-sheet');
    const printTitle        = document.getElementById('print-report-title');
    const printMeta         = document.getElementById('print-report-meta');
    const printBody         = document.getElementById('print-report-body');

    // Comparison tab — IDs added to reports.html
    const compAvgValue   = document.getElementById('comp-avg-value');
    const compAvgBar     = document.getElementById('comp-avg-bar');
    const compBestValue  = document.getElementById('comp-best-value');
    const compBestBar    = document.getElementById('comp-best-bar');
    const compImprovValue = document.getElementById('comp-impr-value');
    const compImprovBar  = document.getElementById('comp-impr-bar');

    const detailData = {
        r1: {
            title: 'Scenario A – Ransomware',
            summary: 'Strong overall containment execution with clear coordination and quick entry-point recognition.',
            strengths: ['Fast entry-point identification', 'Good containment discipline', 'Strong team communication'],
            gaps: ['C2 block timing could be faster', 'Forensic snapshot was missed'],
            next: 'Repeat Scenario A with emphasis on earlier outbound traffic disruption and evidence preservation.',
            containment: 89, investigation: 83, comms: 91,
            feedback: {
                title: 'Latest Feedback – Scenario A',
                cards: [
                    { tone: 'success', heading: 'Strength: Rapid identification', body: 'Entry point was identified within three minutes, well ahead of the internal benchmark pace.' },
                    { tone: 'success', heading: 'Strength: Team communication', body: 'Incident channel usage remained consistent during containment and supported synchronized decision-making.' },
                    { tone: 'warning', heading: 'Improvement: Delayed C2 block', body: 'C2 traffic was blocked later than ideal. Earlier disruption would have reduced scenario impact.' },
                    { tone: 'info',    heading: 'Gap: Missing forensic snapshot', body: 'Evidence preservation should move earlier in the workflow before cleanup actions start.' }
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
            containment: 74, investigation: 80, comms: 78,
            feedback: {
                title: 'Latest Feedback – Scenario B',
                cards: [
                    { tone: 'success', heading: 'Strength: Host-focused triage', body: 'The investigation stayed anchored to the compromised host and its strongest evidence sources.' },
                    { tone: 'success', heading: 'Strength: IOC validation', body: 'Core indicators were mapped cleanly across domain, IP, tool, and phishing artifacts.' },
                    { tone: 'warning', heading: 'Improvement: Timeline pacing', body: 'The host timeline took longer than target once credential dumping evidence appeared.' },
                    { tone: 'info',    heading: 'Gap: Persistence removal sequence', body: 'The scheduled task foothold should be documented and cleared more decisively after containment.' }
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
            containment: 66, investigation: 59, comms: 68
        },
        r4: {
            title: 'Scenario B – Compromised Host',
            summary: 'Best recent run with strong balance between analysis speed and action quality.',
            strengths: ['Fast triage', 'High score', 'Clear host containment decisions'],
            gaps: ['Minor room for better evidence labeling'],
            next: 'Use this run as the benchmark pattern for future intermediate investigations.',
            containment: 93, investigation: 89, comms: 90
        },
        r5: {
            title: 'Scenario A – Ransomware',
            summary: 'This run struggled with containment timing and recovery readiness under pressure.',
            strengths: ['Basic detection awareness'],
            gaps: ['Late containment', 'Low score', 'Insufficient eradication planning'],
            next: 'Reinforce core containment drills before retaking the advanced scenario.',
            containment: 54, investigation: 51, comms: 63
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────────────

    function collectRows() {
        rows = Array.from(document.querySelectorAll('.report-row'));
    }

    function readJSON(key) {
        try { return JSON.parse(localStorage.getItem(key) || 'null'); }
        catch (_) { return null; }
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
        return String(value != null ? value : '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getVisibleRows() {
        return rows.filter(function (r) { return r.style.display !== 'none'; });
    }

    // ── Metric strip ──────────────────────────────────────────────────────────

    function updateMetricStrip() {
        var visible = getVisibleRows();
        if (!visible.length) {
            statSims.textContent      = '0';
            statResponse.textContent  = '--:--';
            statScore.textContent     = '--';
            return;
        }

        statSims.textContent = String(visible.length);

        var scores   = visible.map(function (r) { return Number(r.dataset.score || 0); });
        var avgScore = Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length);
        statScore.textContent = avgScore + '%';

        var avgDurSec = Math.round(visible.reduce(function (sum, r) {
            var parts = (r.dataset.duration || '0:00').split(':').map(Number);
            return sum + ((parts[0] || 0) * 60) + (parts[1] || 0);
        }, 0) / visible.length);
        var mins = String(Math.floor(avgDurSec / 60)).padStart(2, '0');
        var secs = String(avgDurSec % 60).padStart(2, '0');
        statResponse.textContent = mins + ':' + secs;
    }

    // ── Comparison tab ────────────────────────────────────────────────────────

    function updateComparisonTab() {
        if (!compAvgValue) return; // IDs not present, skip
        var visible = getVisibleRows();
        if (!visible.length) return;

        var scores    = visible.map(function (r) { return Number(r.dataset.score || 0); });
        var avg       = Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length);
        var best      = Math.max.apply(null, scores);
        var improvement = Math.max(0, 100 - avg);

        compAvgValue.textContent   = avg + '%';
        if (compAvgBar)    compAvgBar.style.width    = avg + '%';
        compBestValue.textContent  = best + '%';
        if (compBestBar)   compBestBar.style.width   = best + '%';
        compImprovValue.textContent = improvement + '%';
        if (compImprovBar) compImprovBar.style.width = improvement + '%';
    }

    // ── Empty-state row ───────────────────────────────────────────────────────

    function updateEmptyState() {
        if (!historyTableBody) return;
        var existing = historyTableBody.querySelector('.empty-state-row');
        if (existing) existing.remove();
        if (!getVisibleRows().length) {
            var tr = document.createElement('tr');
            tr.className = 'empty-state-row';
            tr.innerHTML = '<td colspan="6" class="surface-note" style="padding:1rem 0.9rem;text-align:center;">No results match the current filters.</td>';
            historyTableBody.appendChild(tr);
        }
    }

    // ── Filter summary ────────────────────────────────────────────────────────

    function updateSummary() {
        var count = getVisibleRows().length;
        filterSummary.textContent = 'Showing ' + count + ' result' + (count === 1 ? '' : 's');
    }

    // ── Detail-panel reset ────────────────────────────────────────────────────

    function resetDetailPanel() {
        activeReportRow = null;
        rows.forEach(function (r) { r.style.outline = ''; });
        if (reportDetailPanel) {
            reportDetailPanel.innerHTML =
                '<h3 style="margin-bottom:0.75rem;">No matching records</h3>' +
                '<p class="surface-note" style="font-size:0.9rem;">Adjust the filters to see simulation results.</p>';
        }
    }

    // ── Live-report hydration ─────────────────────────────────────────────────

    function enrichScenarioAReport(report) {
        if (!report || String(report.scenario).toUpperCase() !== 'A') return report;

        var legacy = readJSON('responsegrid_lab_result') || {};
        var stages = legacy.stages || {};
        var questionResults = legacy.questionResults || {};
        var stageDefinitions = [
            { id: 1, title: 'Detection and scoping', maxScore: 31 },
            { id: 2, title: 'Containment', maxScore: 31 },
            { id: 3, title: 'Recovery', maxScore: 38 }
        ];

        function stageData(id) {
            return stages[id] || stages[String(id)] || {};
        }

        function stageScore(id) {
            return Number(stageData(id).score || 0);
        }

        function stagePercent(id, maxScore) {
            return Math.max(0, Math.min(100, Math.round((stageScore(id) / maxScore) * 100)));
        }

        var investigation = stagePercent(1, 31);
        var containment = stagePercent(2, 31);
        var recovery = stagePercent(3, 38);
        var answeredCount = Object.keys(questionResults).filter(function (key) {
            return questionResults[key] && questionResults[key].answered;
        }).length;
        var totalQuestions = Object.keys(questionResults).length || 13;
        var completedStages = stageDefinitions.filter(function (stage) {
            return stageScore(stage.id) > 0 && stageData(stage.id).time != null;
        }).length;
        var strengths = [];
        var gaps = [];

        if (investigation >= 60) strengths.push('Detection and scoping evidence was identified successfully.');
        if (containment >= 60) strengths.push('Containment actions demonstrated a usable incident response sequence.');
        if (recovery >= 60) strengths.push('Recovery tasks showed effective restoration and validation work.');
        if (answeredCount > 0) strengths.push(answeredCount + ' of ' + totalQuestions + ' investigation questions were answered correctly.');
        if (!strengths.length) strengths.push('The Scenario A run was launched and its result was captured for review.');

        if (investigation < 60) gaps.push('Complete more detection and scoping tasks before ending the lab.');
        if (containment < 60) gaps.push('Validate process termination, isolation, and persistence-removal evidence.');
        if (recovery < 60) gaps.push('Finish backup validation, restoration, and recovery verification tasks.');
        if (answeredCount < totalQuestions) gaps.push((totalQuestions - answeredCount) + ' investigation question' + (totalQuestions - answeredCount === 1 ? ' remains' : 's remain') + ' incomplete.');

        var next = completedStages === 3
            ? 'Review the completed evidence and repeat Scenario A to improve speed and score consistency.'
            : 'Resume Scenario A and complete the remaining ' + (3 - completedStages) + ' stage' + (3 - completedStages === 1 ? '' : 's') + ', starting with ' + gaps[0].toLowerCase();

        var enriched = Object.assign({}, report, {
            summary: 'Scenario A assessed ransomware detection, host scoping, containment, persistence removal, backup validation, and recovery across a timed Linux incident response exercise.',
            containment: containment,
            investigation: investigation,
            comms: recovery,
            strengths: strengths,
            gaps: gaps,
            next: next,
            metrics: Object.assign({}, report.metrics || {}, {
                labStepsComplete: completedStages,
                totalLabSteps: 3,
                questionsAnswered: answeredCount,
                totalQuestions: totalQuestions,
                detectionScore: stageScore(1),
                containmentScore: stageScore(2),
                recoveryScore: stageScore(3)
            }),
            labSteps: stageDefinitions.map(function (stage) {
                var score = stageScore(stage.id);
                var complete = score > 0 && stageData(stage.id).time != null;
                return {
                    title: stage.title,
                    status: complete ? 'Complete' : 'Open',
                    feedback: complete
                        ? stage.title + ' evidence was recorded with ' + score + ' of ' + stage.maxScore + ' available points.'
                        : 'Complete the ' + stage.title.toLowerCase() + ' tasks and submit the required evidence.'
                };
            }),
            feedback: {
                title: 'Latest Feedback - Scenario A',
                cards: [
                    {
                        tone: investigation >= 60 ? 'success' : 'warning',
                        heading: 'Detection and investigation: ' + investigation + '%',
                        body: investigation >= 60 ? 'The run captured useful ransomware identification and scope evidence.' : 'More detection and scoping evidence is needed before containment.'
                    },
                    {
                        tone: containment >= 60 ? 'success' : 'warning',
                        heading: 'Containment execution: ' + containment + '%',
                        body: containment >= 60 ? 'Containment tasks were completed with usable response evidence.' : 'Isolation and persistence-removal steps need additional validation.'
                    },
                    {
                        tone: recovery >= 60 ? 'success' : 'warning',
                        heading: 'Recovery readiness: ' + recovery + '%',
                        body: recovery >= 60 ? 'Recovery and restoration tasks were completed successfully.' : 'Backup restoration and recovery verification remain incomplete.'
                    }
                ],
                nextSteps: gaps.length ? gaps : [next],
                checklist: stageDefinitions.map(function (stage) {
                    var complete = stageScore(stage.id) > 0 && stageData(stage.id).time != null;
                    return {
                        title: stage.title,
                        note: complete ? 'Evidence recorded for this stage.' : 'This stage still needs evidence.',
                        done: complete
                    };
                })
            }
        });

        try {
            localStorage.setItem('irsp-scenario-a-report', JSON.stringify(enriched));
        } catch (_) {
            // The in-memory enriched report still renders if storage is unavailable.
        }

        return enriched;
    }

    function upsertLiveReportRow(report) {
        if (!historyTableBody || !report) return;
        report = enrichScenarioAReport(report);

        var existing = document.querySelector('[data-report-id="' + report.id + '"]');
        var row      = existing || document.createElement('tr');

        row.className        = 'report-row';
        row.tabIndex         = 0;
        row.dataset.reportId = report.id;
        row.dataset.scenario = report.scenario;
        row.dataset.status   = report.status;
        row.dataset.date     = report.date;
        row.dataset.team     = report.team;
        row.dataset.duration = report.duration;
        row.dataset.score    = String(report.score);
        row.dataset.title    = report.title;

        // Robust title label: try en-dash first, then hyphen
        var titleParts = report.title.split('–');
        var label = titleParts.length > 1 ? titleParts[1].trim() : report.title.split('-').slice(1).join('-').trim() || report.title;

        row.innerHTML =
            '<td>'  + escapeHtml(report.date)     + '</td>' +
            '<td>'  + escapeHtml(report.scenario)  + ' – ' + escapeHtml(label) + '</td>' +
            '<td>'  + escapeHtml(report.team)      + '</td>' +
            '<td>'  + escapeHtml(report.duration)  + '</td>' +
            '<td>'  + escapeHtml(String(report.score)) + '%</td>' +
            '<td><span class="status-badge ' + statusBadgeClass(report.status) + '">' + escapeHtml(report.status) + '</span></td>';

        if (!existing) {
            historyTableBody.insertBefore(row, historyTableBody.firstChild);
        }

        detailData[report.id] = {
            title:       report.title,
            scenario:    report.scenario,
            summary:     report.summary     || '',
            strengths:   Array.isArray(report.strengths) ? report.strengths : [],
            gaps:        Array.isArray(report.gaps)      ? report.gaps      : [],
            next:        report.next        || '',
            containment: report.containment,
            investigation: report.investigation,
            comms:       report.comms,
            feedback:    report.feedback || null,
            metrics:     report.metrics || null,
            attackPhases: Array.isArray(report.attackPhases) ? report.attackPhases : [],
            responseActions: Array.isArray(report.responseActions) ? report.responseActions : [],
            labSteps: Array.isArray(report.labSteps) ? report.labSteps : []
        };
    }

    function hydrateLiveReports() {
        LIVE_REPORT_KEYS.map(readJSON).filter(Boolean).forEach(upsertLiveReportRow);
        collectRows();
    }

    // ── Filtering ─────────────────────────────────────────────────────────────

    function filterRows() {
        var query    = searchInput.value.trim().toLowerCase();
        var scenario = scenarioFilter.value;
        var status   = statusFilter.value;

        rows.forEach(function (row) {
            var title       = (row.dataset.title || '').toLowerCase();
            var team        = (row.dataset.team  || '').toLowerCase();
            var rowScenario = row.dataset.scenario;
            var rowStatus   = (row.dataset.status || '').toLowerCase();

            var matchesQuery    = !query || title.includes(query) || team.includes(query) || (row.dataset.date || '').includes(query);
            var matchesScenario = scenario === 'all' || rowScenario === scenario;
            var matchesStatus   = status   === 'all' || rowStatus   === status;

            row.style.display = (matchesQuery && matchesScenario && matchesStatus) ? '' : 'none';
        });

        updateSummary();
        updateMetricStrip();
        updateComparisonTab();
        updateEmptyState();

        // Keep detail panel in sync with visibility changes
        if (activeReportRow && activeReportRow.style.display === 'none') {
            var firstVisible = getVisibleRows()[0];
            if (firstVisible) {
                renderReportDetail(firstVisible);
            } else {
                resetDetailPanel();
            }
        } else if (!activeReportRow) {
            var first = getVisibleRows()[0];
            if (first) renderReportDetail(first);
        }
    }

    // ── Performance snapshot ──────────────────────────────────────────────────

    function setSnapshotValues(item, score) {
        var numeric     = Number(score) || 0;
        var containment = (item && typeof item.containment  === 'number') ? item.containment  : Math.min(95, numeric + 4);
        var investigation = (item && typeof item.investigation === 'number') ? item.investigation : Math.max(45, numeric - 2);
        var comms       = (item && typeof item.comms        === 'number') ? item.comms        : Math.min(98, numeric + 8);

        containmentBar.style.width   = containment   + '%';
        investigationBar.style.width = investigation + '%';
        commsBar.style.width         = comms         + '%';
        containmentText.textContent  = containment   + '%';
        investigationText.textContent = investigation + '%';
        commsText.textContent        = comms         + '%';
    }

    // ── Feedback helpers ──────────────────────────────────────────────────────

    function fallbackFeedback(item) {
        return {
            title: 'Latest Feedback – ' + item.title,
            cards: [
                { tone: 'success', heading: 'Strength',    body: (item.strengths && item.strengths[0]) || 'The run shows a usable baseline for future iterations.' },
                { tone: 'warning', heading: 'Improvement', body: (item.gaps      && item.gaps[0])      || 'Keep tightening execution quality across the workflow.'  }
            ],
            nextSteps: [item.next || 'Review the scenario and attempt a second run.'],
            checklist: [
                { title: 'Rehearse the core workflow', note: 'Repeat the scenario using the same sequence with cleaner pacing.',     done: false },
                { title: 'Review the largest gap',     note: (item.gaps && item.gaps[0]) || 'Focus on the most visible improvement area.', done: false }
            ]
        };
    }

    // Re-apply ARIA to toggles rendered into dynamic HTML (IRSP.initGenericToggles
    // only runs once at DOMContentLoaded and misses later-injected elements).
    function bindRenderedToggles(container) {
        container.querySelectorAll('.toggle:not([data-irsp-bound])').forEach(function (toggle) {
            toggle.dataset.irspBound = 'true';
            toggle.setAttribute('role', 'switch');
            toggle.setAttribute('tabindex', '0');
            toggle.setAttribute('aria-checked', toggle.classList.contains('on') ? 'true' : 'false');
            if (toggle.dataset.staticToggle !== 'true') {
                toggle.addEventListener('click', function () {
                    this.classList.toggle('on');
                    this.setAttribute('aria-checked', this.classList.contains('on') ? 'true' : 'false');
                });
                toggle.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.classList.toggle('on');
                        this.setAttribute('aria-checked', this.classList.contains('on') ? 'true' : 'false');
                    }
                });
            }
        });
    }

    function renderFeedback(item) {
        var feedback = item.feedback || fallbackFeedback(item);

        feedbackTitle.innerHTML = '<i data-lucide="message-circle"></i> ' + escapeHtml(feedback.title);

        feedbackCards.innerHTML = feedback.cards.map(function (card) {
            var cls = card.tone === 'success' ? 'success' : card.tone === 'warning' ? 'warning' : 'info';
            return '<div class="alert-item ' + cls + '"><div class="alert-info"><h4>' +
                escapeHtml(card.heading) + '</h4><p>' + escapeHtml(card.body) + '</p></div></div>';
        }).join('');

        feedbackNextSteps.innerHTML = feedback.nextSteps.map(function (step) {
            return '<li>' + escapeHtml(step) + '</li>';
        }).join('');

        feedbackChecklist.innerHTML = feedback.checklist.map(function (c) {
            return '<div class="toggle-row"><div>' +
                '<div style="font-weight:600;font-size:0.92rem;">' + escapeHtml(c.title) + '</div>' +
                '<div class="surface-note">' + escapeHtml(c.note) + '</div></div>' +
                '<div class="toggle' + (c.done ? ' on' : '') + '" data-static-toggle="true"></div></div>';
        }).join('');

        bindRenderedToggles(feedbackChecklist);
        refreshIcons();
    }

    // ── Report detail panel ───────────────────────────────────────────────────

    function renderScenarioBDetailSections(item) {
        var sections = '';

        if (String(item.scenario).toUpperCase() === 'A' && item.metrics) {
            return '<div style="margin-bottom:1rem;">' +
                '<div style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem;">Scenario A Report Metrics</div>' +
                '<div class="key-value-list">' +
                    '<div class="key-value-item"><span class="key">Stage Scores</span><span class="value">Detection ' + escapeHtml(item.metrics.detectionScore || 0) + '/31, containment ' + escapeHtml(item.metrics.containmentScore || 0) + '/31, recovery ' + escapeHtml(item.metrics.recoveryScore || 0) + '/38</span></div>' +
                    '<div class="key-value-item"><span class="key">Questions Answered</span><span class="value">' + escapeHtml(item.metrics.questionsAnswered || 0) + '/' + escapeHtml(item.metrics.totalQuestions || 13) + '</span></div>' +
                    '<div class="key-value-item"><span class="key">Stages Completed</span><span class="value">' + escapeHtml(item.metrics.labStepsComplete || 0) + '/' + escapeHtml(item.metrics.totalLabSteps || 3) + '</span></div>' +
                    '<div class="key-value-item"><span class="key">Completion</span><span class="value">' + escapeHtml(item.metrics.completionReason === 'completed' ? 'Completed' : 'Ended Early') + '</span></div>' +
                '</div>' +
            '</div>';
        }

        if (item.metrics) {
            sections +=
                '<div style="margin-bottom:1rem;">' +
                    '<div style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem;">Scenario B Report Metrics</div>' +
                    '<div class="key-value-list">' +
                        '<div class="key-value-item"><span class="key">Score Breakdown</span><span class="value">Actions ' + escapeHtml(item.metrics.actionScore) + ', pivots ' + escapeHtml(item.metrics.alertScore) + ', searches ' + escapeHtml(item.metrics.searchScore) + ', timeline ' + escapeHtml(item.metrics.timelineScore) + ', time ' + escapeHtml(item.metrics.timeScore) + '</span></div>' +
                        '<div class="key-value-item"><span class="key">Validated Actions</span><span class="value">' + escapeHtml(item.metrics.validatedActions) + '/' + escapeHtml(item.metrics.totalActions) + '</span></div>' +
                        '<div class="key-value-item"><span class="key">Alert Pivots / Searches</span><span class="value">' + escapeHtml(item.metrics.alertPivots) + ' pivots / ' + escapeHtml(item.metrics.searchesRun) + ' searches</span></div>' +
                        '<div class="key-value-item"><span class="key">Time Remaining</span><span class="value">' + escapeHtml(item.metrics.timeRemaining || '--') + '</span></div>' +
                    '</div>' +
                '</div>';
        }

        if (item.attackPhases && item.attackPhases.length) {
            sections +=
                '<div style="margin-bottom:1rem;">' +
                    '<div style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem;">Attack Stage Timeline Coverage</div>' +
                    '<p style="font-size:0.88rem;color:var(--text-dim);">' + escapeHtml(item.attackPhases.join(', ')) + '</p>' +
                '</div>';
        }

        if (item.responseActions && item.responseActions.length) {
            sections +=
                '<div style="margin-bottom:1rem;">' +
                    '<div style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem;">Response Action Validation</div>' +
                    '<ul class="list-clean" style="font-size:0.88rem;">' +
                        item.responseActions.map(function (action) {
                            return '<li>' + escapeHtml(action.status) + ': ' + escapeHtml(action.title) + '</li>';
                        }).join('') +
                    '</ul>' +
                '</div>';
        }

        return sections;
    }

    function renderScenarioBPrintSections(item) {
        var sections = '';

        if (String(item.scenario).toUpperCase() === 'A' && item.metrics) {
            sections +=
                '<div class="card" style="margin-bottom:1rem;"><div class="card-title">Scenario A Report Metrics</div>' +
                    '<div class="key-value-list">' +
                        '<div class="key-value-item"><span class="key">Stage Scores</span><span class="value">Detection ' + escapeHtml(item.metrics.detectionScore || 0) + '/31, containment ' + escapeHtml(item.metrics.containmentScore || 0) + '/31, recovery ' + escapeHtml(item.metrics.recoveryScore || 0) + '/38</span></div>' +
                        '<div class="key-value-item"><span class="key">Questions Answered</span><span class="value">' + escapeHtml(item.metrics.questionsAnswered || 0) + '/' + escapeHtml(item.metrics.totalQuestions || 13) + '</span></div>' +
                        '<div class="key-value-item"><span class="key">Stages Completed</span><span class="value">' + escapeHtml(item.metrics.labStepsComplete || 0) + '/' + escapeHtml(item.metrics.totalLabSteps || 3) + '</span></div>' +
                        '<div class="key-value-item"><span class="key">Completion</span><span class="value">' + escapeHtml(item.metrics.completionReason === 'completed' ? 'Completed' : 'Ended Early') + '</span></div>' +
                    '</div></div>';

            if (item.labSteps && item.labSteps.length) {
                sections +=
                    '<div class="card" style="margin-bottom:1rem;"><div class="card-title">Scenario A Stage Outcomes</div>' +
                        '<ul class="list-clean" style="font-size:0.95rem;line-height:1.8;">' +
                            item.labSteps.map(function (step) {
                                return '<li><strong>' + escapeHtml(step.status) + ':</strong> ' + escapeHtml(step.title) + ' - ' + escapeHtml(step.feedback) + '</li>';
                            }).join('') +
                        '</ul></div>';
            }

            return sections;
        }

        if (item.metrics) {
            sections +=
                '<div class="card" style="margin-bottom:1rem;"><div class="card-title">Scenario B Report Metrics</div>' +
                    '<div class="key-value-list">' +
                        '<div class="key-value-item"><span class="key">Score Breakdown</span><span class="value">Actions ' + escapeHtml(item.metrics.actionScore) + ', alert pivots ' + escapeHtml(item.metrics.alertScore) + ', KQL searches ' + escapeHtml(item.metrics.searchScore) + ', timeline ' + escapeHtml(item.metrics.timelineScore) + ', time ' + escapeHtml(item.metrics.timeScore) + '</span></div>' +
                        '<div class="key-value-item"><span class="key">Lab Completion</span><span class="value">' + escapeHtml(item.metrics.labStepsComplete) + '/' + escapeHtml(item.metrics.totalLabSteps) + ' expected steps</span></div>' +
                        '<div class="key-value-item"><span class="key">Validated Response Actions</span><span class="value">' + escapeHtml(item.metrics.validatedActions) + '/' + escapeHtml(item.metrics.totalActions) + '</span></div>' +
                        '<div class="key-value-item"><span class="key">Time Remaining</span><span class="value">' + escapeHtml(item.metrics.timeRemaining || '--') + '</span></div>' +
                    '</div></div>';
        }

        if (item.attackPhases && item.attackPhases.length) {
            sections +=
                '<div class="card" style="margin-bottom:1rem;"><div class="card-title">Attack Stage Timeline Coverage</div>' +
                    '<p class="surface-note" style="font-size:1rem;line-height:1.7;">' + escapeHtml(item.attackPhases.join(', ')) + '</p></div>';
        }

        if (item.responseActions && item.responseActions.length) {
            sections +=
                '<div class="card" style="margin-bottom:1rem;"><div class="card-title">Response Action Validation</div>' +
                    '<ul class="list-clean" style="font-size:0.95rem;line-height:1.8;">' +
                        item.responseActions.map(function (action) {
                            return '<li><strong>' + escapeHtml(action.status) + ':</strong> ' + escapeHtml(action.title) + ' - ' + escapeHtml(action.validation) + '</li>';
                        }).join('') +
                    '</ul></div>';
        }

        if (item.labSteps && item.labSteps.length) {
            sections +=
                '<div class="card" style="margin-bottom:1rem;"><div class="card-title">Expected Lab Step Outcomes</div>' +
                    '<ul class="list-clean" style="font-size:0.95rem;line-height:1.8;">' +
                        item.labSteps.map(function (step) {
                            return '<li><strong>' + escapeHtml(step.status) + ':</strong> ' + escapeHtml(step.title) + ' - ' + escapeHtml(step.feedback) + '</li>';
                        }).join('') +
                    '</ul></div>';
        }

        return sections;
    }

    function renderReportDetail(row) {
        var item = detailData[row.dataset.reportId];
        if (!item) return;

        activeReportRow = row;
        rows.forEach(function (r) { r.style.outline = ''; });
        row.style.outline       = '2px solid var(--accent-blue)';
        row.style.outlineOffset = '-2px';

        reportDetailPanel.innerHTML =
            '<h3 style="margin-bottom:0.5rem;">' + escapeHtml(item.title) + '</h3>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:0.85rem;">' +
                '<span class="status-badge blue" style="border-color:var(--border);color:var(--text-main);background:rgba(51,65,85,0.35);">' + escapeHtml(row.dataset.date)     + '</span>' +
                '<span class="status-badge blue" style="border-color:var(--border);color:var(--text-main);background:rgba(51,65,85,0.35);">' + escapeHtml(row.dataset.team)     + '</span>' +
                '<span class="status-badge blue" style="border-color:var(--border);color:var(--text-main);background:rgba(51,65,85,0.35);">Duration: ' + escapeHtml(row.dataset.duration) + '</span>' +
                '<span class="status-badge ' + statusBadgeClass(row.dataset.status) + '">' + escapeHtml(row.dataset.score) + '%</span>' +
            '</div>' +
            '<p style="color:var(--text-dim);font-size:0.92rem;margin-bottom:1rem;">' + escapeHtml(item.summary) + '</p>' +
            '<div style="margin-bottom:1rem;">' +
                '<div style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem;">Strengths</div>' +
                '<ul class="list-clean" style="font-size:0.88rem;">' +
                    (item.strengths || []).map(function (e) { return '<li>' + escapeHtml(e) + '</li>'; }).join('') +
                '</ul></div>' +
            '<div style="margin-bottom:1rem;">' +
                '<div style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem;">Improvement Areas</div>' +
                '<ul class="list-clean" style="font-size:0.88rem;">' +
                    (item.gaps || []).map(function (e) { return '<li>' + escapeHtml(e) + '</li>'; }).join('') +
                '</ul></div>' +
            renderScenarioBDetailSections(item) +
            '<div>' +
                '<div style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem;">Recommended Follow-up</div>' +
                '<p style="font-size:0.88rem;color:var(--text-dim);">' + escapeHtml(item.next || '') + '</p>' +
            '</div>';

        setSnapshotValues(item, row.dataset.score);
        renderFeedback(item);
        renderPrintSheet(row, item);
    }

    // ── Print sheet ───────────────────────────────────────────────────────────

    function renderPrintSheet(row, item) {
        if (!printSheet || !printBody || !row || !item) return;

        printSheet.hidden = false;
        printTitle.textContent = item.title;
        printMeta.textContent  =
            row.dataset.date + ' | ' + row.dataset.team + ' | Duration ' +
            row.dataset.duration + ' | Score ' + row.dataset.score + '% | ' + row.dataset.status;

        // Use the report's own feedback steps when available (not always the generic fallback)
        var feedbackData  = item.feedback || fallbackFeedback(item);
        var containmentVal  = item.containment  != null ? item.containment  : '--';
        var investigationVal = item.investigation != null ? item.investigation : '--';
        var commsVal        = item.comms         != null ? item.comms         : '--';

        printBody.innerHTML =
            '<div class="card" style="margin-bottom:1rem;">' +
                '<div class="card-title">Executive Summary</div>' +
                '<p class="surface-note" style="font-size:1rem;line-height:1.7;">' + escapeHtml(item.summary) + '</p>' +
            '</div>' +
            '<div class="grid-2-1" style="margin-bottom:1rem;">' +
                '<div class="card"><div class="card-title">Performance Snapshot</div>' +
                    '<div class="key-value-list">' +
                        '<div class="key-value-item"><span class="key">Containment</span><span class="value">'  + escapeHtml(String(containmentVal))   + '%</span></div>' +
                        '<div class="key-value-item"><span class="key">Investigation</span><span class="value">' + escapeHtml(String(investigationVal)) + '%</span></div>' +
                        '<div class="key-value-item"><span class="key">Communication</span><span class="value">' + escapeHtml(String(commsVal))         + '%</span></div>' +
                    '</div></div>' +
                '<div class="card"><div class="card-title">Recommended Follow-up</div>' +
                    '<p class="surface-note" style="font-size:1rem;line-height:1.7;">' + escapeHtml(item.next || '') + '</p></div>' +
            '</div>' +
            '<div class="grid-2" style="margin-bottom:1rem;">' +
                '<div class="card"><div class="card-title">Strengths</div>' +
                    '<ul class="list-clean" style="font-size:0.95rem;line-height:1.8;">' +
                        (item.strengths || []).map(function (e) { return '<li>' + escapeHtml(e) + '</li>'; }).join('') +
                    '</ul></div>' +
                '<div class="card"><div class="card-title">Improvement Areas</div>' +
                    '<ul class="list-clean" style="font-size:0.95rem;line-height:1.8;">' +
                        (item.gaps || []).map(function (e) { return '<li>' + escapeHtml(e) + '</li>'; }).join('') +
                    '</ul></div>' +
            '</div>' +
            '<div class="card"><div class="card-title">Coaching Summary</div>' +
                '<ul class="list-clean" style="font-size:0.95rem;line-height:1.8;">' +
                    feedbackData.nextSteps.map(function (e) { return '<li>' + escapeHtml(e) + '</li>'; }).join('') +
                '</ul></div>' +
            renderScenarioBPrintSections(item);
    }

    function teardownPrintMode() {
        document.body.classList.remove('print-report-mode');
        if (printSheet) printSheet.hidden = true;
    }

    // ── Row binding ───────────────────────────────────────────────────────────

    function attachRowHandlers(row) {
        if (!row || row.dataset.bound === 'true') return;
        row.dataset.bound = 'true';

        row.addEventListener('click', function () { renderReportDetail(this); });
        row.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                renderReportDetail(this);
            }
        });
    }

    // ── Button handlers ───────────────────────────────────────────────────────

    searchInput.addEventListener('input', filterRows);
    scenarioFilter.addEventListener('change', filterRows);
    statusFilter.addEventListener('change', filterRows);

    clearFiltersBtn.addEventListener('click', function () {
        searchInput.value   = '';
        scenarioFilter.value = 'all';
        statusFilter.value   = 'all';
        filterRows();
    });

    refreshMetricsBtn.addEventListener('click', function () {
        hydrateLiveReports();
        rows.forEach(attachRowHandlers);
        filterRows();
        var count = getVisibleRows().length;
        filterSummary.textContent = 'Metrics refreshed for ' + count + ' result' + (count === 1 ? '' : 's');
    });

    exportReportBtn.addEventListener('click', function () {
        if (!activeReportRow) {
            filterSummary.textContent = 'Select a report row before exporting.';
            window.setTimeout(updateSummary, 2200);
            return;
        }
        var activeItem = detailData[activeReportRow.dataset.reportId];
        renderPrintSheet(activeReportRow, activeItem);
        document.body.classList.add('print-report-mode');
        window.print();
        window.setTimeout(teardownPrintMode, 250);
        this.blur();
        filterSummary.textContent = (activeReportRow.dataset.title || 'Report') + ' ready for export or print';
    });

    copySummaryBtn.addEventListener('click', async function () {
        var panelText = reportDetailPanel ? reportDetailPanel.innerText.trim() : '';
        var noSelection =
            !panelText ||
            panelText.includes('Select a simulation result') ||
            panelText.includes('No matching records');

        if (noSelection) {
            this.textContent = 'No Report Selected';
            window.setTimeout(() => { this.textContent = 'Copy Summary'; }, 1600);
            return;
        }

        try {
            await navigator.clipboard.writeText(panelText);
            this.textContent = 'Summary Copied';
        } catch (_) {
            // Clipboard API unavailable (e.g. non-HTTPS or denied)
            this.textContent = 'Copy Unavailable';
        }
        window.setTimeout(() => { this.textContent = 'Copy Summary'; }, 1600);
    });

    // ── Init ──────────────────────────────────────────────────────────────────

    hydrateLiveReports();
    collectRows();
    rows.forEach(attachRowHandlers);
    filterRows(); // computes stats, empty state, and auto-selects first row
    window.addEventListener('afterprint', teardownPrintMode);
    refreshIcons();
})();
