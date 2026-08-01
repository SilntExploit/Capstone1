(function () {
    'use strict';

    const SCENARIO_ID = 'scenario-b';
    const REPORT_KEY = 'irsp-scenario-b-report';
    const EXERCISE_SECONDS = 30 * 60;

    const MITRE_TECHNIQUES = {
        'T1059.001': { name: 'PowerShell', tactic: 'Execution' },
        'T1053.005': { name: 'Scheduled Task', tactic: 'Persistence' },
        'T1548.002': { name: 'Bypass User Access Control', tactic: 'Privilege Escalation' },
        'T1562.001': { name: 'Disable or Modify Tools', tactic: 'Defense Evasion' },
        'T1552.001': { name: 'Credentials In Files', tactic: 'Credential Access' },
        'T1136.001': { name: 'Local Account', tactic: 'Persistence' },
        'T1021.006': { name: 'Windows Remote Management', tactic: 'Lateral Movement' },
        'T1105': { name: 'Ingress Tool Transfer', tactic: 'Command and Control' },
        'T1560.001': { name: 'Archive Collected Data', tactic: 'Collection' },
        'T1491.001': { name: 'Internal Defacement', tactic: 'Impact' }
    };

    const els = {
        timer: document.getElementById('scenario-b-timer'),
        exerciseStatus: document.getElementById('scenario-b-exercise-status'),
        submitExercise: document.getElementById('scenario-b-submit-exercise'),

        queueCritical: document.getElementById('scenario-b-queue-critical'),
        queueHigh: document.getElementById('scenario-b-queue-high'),
        queueAlertsBody: document.getElementById('scenario-b-queue-alerts-body'),
        questionProgress: document.getElementById('scenario-b-question-progress'),

        caseBack: document.getElementById('scenario-b-case-back'),
        caseTitle: document.getElementById('scenario-b-case-title'),
        caseMeta: document.getElementById('scenario-b-case-meta'),
        casePrev: document.getElementById('scenario-b-case-prev'),
        caseNext: document.getElementById('scenario-b-case-next'),
        caseQuestion: document.getElementById('scenario-b-case-question'),
        searchInput: document.getElementById('scenario-b-search-input'),
        runSearch: document.getElementById('scenario-b-run-search'),
        searchStatus: document.getElementById('scenario-b-search-status'),
        resultsNote: document.getElementById('scenario-b-results-note'),
        resultsBody: document.getElementById('scenario-b-results-body'),
        drilldownHost: document.getElementById('scenario-b-drilldown-host'),
        drilldownSourcetype: document.getElementById('scenario-b-drilldown-sourcetype'),
        drilldownUser: document.getElementById('scenario-b-drilldown-user'),
        drilldownEventId: document.getElementById('scenario-b-drilldown-event-id'),
        drilldownTask: document.getElementById('scenario-b-drilldown-task'),
        drilldownProcess: document.getElementById('scenario-b-drilldown-process'),
        drilldownParent: document.getElementById('scenario-b-drilldown-parent'),
        drilldownEvent: document.getElementById('scenario-b-drilldown-event'),
        drilldownLineage: document.getElementById('scenario-b-drilldown-lineage'),
        drilldownJson: document.getElementById('scenario-b-drilldown-json'),
        drilldownFields: document.getElementById('scenario-b-drilldown-fields'),

        timelineList: document.getElementById('scenario-b-timeline-list'),
        timelineCheck: document.getElementById('scenario-b-timeline-check'),
        timelineFeedback: document.getElementById('scenario-b-timeline-feedback'),

        responseList: document.getElementById('scenario-b-response-list'),
        responseSubmit: document.getElementById('scenario-b-response-submit'),
        responseFeedback: document.getElementById('scenario-b-response-feedback'),

        reportScore: document.getElementById('scenario-b-report-score'),
        reportStanding: document.getElementById('scenario-b-report-standing'),
        reportBreakdown: document.getElementById('scenario-b-report-breakdown'),
        reportMitre: document.getElementById('scenario-b-report-mitre'),
        reportSteps: document.getElementById('scenario-b-report-steps'),
        reportRestart: document.getElementById('scenario-b-report-restart')
    };

    const state = {
        view: 'queue',
        alerts: [],
        activeAlertIndex: -1,
        results: [],
        totalMatches: 0,
        query: '',
        exerciseStarted: false,
        exerciseComplete: false,
        secondsRemaining: EXERCISE_SECONDS,
        timerId: null,
        pivotedAlertKeys: new Set(),

        questionResults: {},
        questionAttempted: new Set(),
        timelineIds: [],
        timelineChecked: false,
        timelineCorrect: 0,
        timelineTotal: 0,
        responseOptions: [],
        responseSelected: new Set(),
        responseChecked: false,
        responseCorrect: 0,
        responseWrong: 0,
        responseMissed: 0,
        responseTotalCorrect: 0,

        telemetryConnected: false,
        completionReason: ''
    };

    const LAB_STEPS = [
        {
            title: 'Confirm endpoint telemetry',
            expected: 'Endpoint logs are available and searches return events.',
            metric: function () { return state.telemetryConnected || state.totalMatches > 0; },
            feedback: 'Open the queue and investigate an alert to load telemetry.'
        },
        {
            title: 'Investigate every alert',
            expected: 'Open and answer the question for all 10 alerts in the queue.',
            metric: function () { return allAlertsAttempted(); },
            feedback: 'Keep working through the queue - every alert needs an answer before you can continue.'
        },
        {
            title: 'Build the attack timeline',
            expected: 'Correctly order the key events of the intrusion.',
            metric: function () { return state.timelineChecked && state.timelineCorrect === state.timelineTotal; },
            feedback: 'Open Build Timeline and drag the events into the order they actually happened.'
        },
        {
            title: 'Submit a response plan',
            expected: 'Select the correct containment/remediation actions without picking the wrong ones.',
            metric: function () { return state.responseChecked && state.responseCorrect === state.responseTotalCorrect && state.responseWrong === 0; },
            feedback: 'Open Response Plan and choose only the actions the evidence actually supports.'
        },
        {
            title: 'Submit the incident report',
            expected: 'Submit before the timer expires.',
            metric: function () { return state.exerciseComplete; },
            feedback: 'Submit once the timeline and response plan are checked.'
        }
    ];

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatNumber(value) { return Number(value || 0).toLocaleString(); }

    function formatTimestamp(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value || '--';
        return date.toISOString().split('T')[1].replace('Z', '');
    }

    function formatDuration(totalSeconds) {
        const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
        const seconds = Math.max(0, totalSeconds) % 60;
        return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }

    function severityMeta(value) {
        const normalized = String(value || '').toLowerCase();
        if (normalized === 'critical') return { badge: 'red', row: 'critical', label: 'Critical' };
        if (normalized === 'high') return { badge: 'yellow', row: 'high', label: 'High' };
        if (normalized === 'medium') return { badge: 'blue', row: 'medium', label: 'Medium' };
        return { badge: 'blue', row: 'medium', label: normalized ? normalized[0].toUpperCase() + normalized.slice(1) : 'Info' };
    }

    function getCorrectQuestionCount() {
        return Object.values(state.questionResults).filter(Boolean).length;
    }

    function allAlertsAttempted() {
        return state.alerts.length > 0 && state.questionAttempted.size >= state.alerts.length;
    }

    function apiBase() {
        try { return window.localStorage.getItem('irsp-api-base') || '/api'; }
        catch (error) { return '/api'; }
    }

    function accessToken() {
        try { return window.localStorage.getItem('irsp-access-token') || ''; }
        catch (error) { return ''; }
    }

    async function resolveUsername() {
        try {
            const cached = window.localStorage.getItem('irsp-current-user');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed && parsed.email) return parsed.email;
            }
        } catch (error) { /* ignore */ }

        const token = accessToken();
        if (token) {
            try {
                const response = await fetch(`${apiBase()}/auth/me/`, { headers: { Authorization: `Bearer ${token}` } });
                if (response.ok) {
                    const me = await response.json();
                    if (me && me.email) return me.email;
                }
            } catch (error) { /* ignore */ }
        }
        return 'anonymous';
    }

    function standingLabel(score) {
        if (score >= 80) return 'Excellent';
        if (score >= 55) return 'Good';
        if (score >= 30) return 'Needs Practice';
        return 'Needs More Training';
    }

    function reportStatus(score) {
        if (score >= 80) return 'Passed';
        if (score >= 60) return 'Needs Improvement';
        return 'Failed';
    }

    function buildMitreCoverage() {
        return state.alerts.map(function (alert, index) {
            const technique = MITRE_TECHNIQUES[alert.technique_id] || {};
            return {
                q: index + 1,
                title: alert.title || `Alert ${index + 1}`,
                code: alert.technique_id || null,
                name: technique.name || '',
                tactic: technique.tactic || '',
                status: state.questionResults[alert.alert_key] === true ? 'correct'
                    : state.questionResults[alert.alert_key] === false ? 'incorrect'
                        : 'not_attempted'
            };
        });
    }

    function calculateFinalScore() {
        const questionScore = Math.round((getCorrectQuestionCount() / 10) * 30);
        const timelineScore = state.timelineTotal
            ? Math.round((state.timelineCorrect / state.timelineTotal) * 25)
            : 0;
        const rawResponseScore = state.responseTotalCorrect
            ? Math.round((state.responseCorrect / state.responseTotalCorrect) * 35) - (state.responseWrong * 6)
            : 0;
        const responseScore = Math.max(0, Math.min(35, rawResponseScore));
        const timeScore = Math.min(10, Math.ceil((state.secondsRemaining / EXERCISE_SECONDS) * 10));
        const total = Math.min(100, questionScore + timelineScore + responseScore + timeScore);
        return { total: total, questionScore: questionScore, timelineScore: timelineScore, responseScore: responseScore, timeScore: timeScore };
    }

    function buildCompletionPayload() {
        const score = calculateFinalScore();
        return {
            username: cachedUsername || 'anonymous',
            lab_name: 'lab-b',
            total_score: score.total,
            time_taken: EXERCISE_SECONDS - state.secondsRemaining,
            stages_completed: LAB_STEPS.filter(function (s) { return s.metric(); }).length,
            total_stages: LAB_STEPS.length,
            standing: standingLabel(score.total),
            mitre_coverage: JSON.stringify(buildMitreCoverage())
        };
    }

    let cachedUsername = 'anonymous';
    let dashboardRecordSaved = false;

    function persistCompletion() {
        if (dashboardRecordSaved) return;
        dashboardRecordSaved = true;

        const payload = buildCompletionPayload();
        const url = `${apiBase()}/lab-scores/`;
        const body = JSON.stringify(payload);
        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = accessToken();
            if (token) headers.Authorization = `Bearer ${token}`;
            fetch(url, { method: 'POST', headers, body, keepalive: true })
                .then(function (response) { console.log('[IRSP] Lab B record save status:', response.status); })
                .catch(function (error) { console.warn('[IRSP] Could not save Lab B record:', error); });
        } catch (error) {
            console.warn('[IRSP] Lab B persist failed:', error);
        }
    }

    function persistScenarioReport(reason) {
        try {
            const score = calculateFinalScore();
            window.localStorage.setItem(REPORT_KEY, JSON.stringify({
                id: 'live-scenario-b', title: 'Lab B - Endpoint Investigation',
                date: new Date().toISOString().slice(0, 10), score: score.total,
                status: reportStatus(score.total), completionReason: reason
            }));
        } catch (error) { /* reporting should never interrupt the lab flow */ }
    }

    function normalizeLog(item) {
        return {
            id: item.id || item._id || '',
            timestamp: item.timestamp || item.time || item.TimeCreated || '',
            host: item.host || item.Computer || item.computer || 'unknown-host',
            sourcetype: item.sourcetype || item.channel || item.Channel || 'windows:event',
            severity: item.severity || item.LevelDisplayName || item.level || 'info',
            event_id: item.event_id || item.EventID || item.EventId || '',
            user: item.user || item.User || item.SubjectUserName || '',
            process_name: item.process_name || item.ProcessName || item.Image || '',
            parent_process: item.parent_process || item.ParentImage || '',
            dest_ip: item.dest_ip || item.DestinationIp || '',
            dest_port: item.dest_port || item.DestinationPort || '',
            query_name: item.query_name || item.QueryName || '',
            task_name: item.task_name || item.TaskName || '',
            event: item.event || item.Message || item.message || ''
        };
    }

    function fieldsText(record) {
        return Object.entries(record)
            .filter(function ([, value]) { return value !== null && value !== undefined && value !== ''; })
            .map(function ([key, value]) { return key + ': ' + value; })
            .join('\n');
    }

    function setBusy(isBusy) { if (els.runSearch) els.runSearch.disabled = isBusy; }

    function showView(name) {
        state.view = name;
        document.querySelectorAll('.lb-view').forEach(function (el) {
            el.classList.toggle('active', el.dataset.lbView === name);
        });
        renderStepper();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') window.IRSP.refreshIcons();
    }

    // The stepper is the single source of truth for "what's next" - no
    // section is reachable until the one before it is actually done, and
    // the connecting line only fills in once that's true.
    function renderStepper() {
        const investigateDone = allAlertsAttempted();
        const timelineDone = state.timelineChecked;
        const responseDone = state.responseChecked;
        const reportDone = state.exerciseComplete;

        applyStepState('investigate', 1, state.view === 'queue' || state.view === 'case', investigateDone, true);
        applyStepState('timeline', 2, state.view === 'timeline', timelineDone, investigateDone);
        applyStepState('response', 3, state.view === 'response', responseDone, timelineDone);
        applyStepState('report', 4, state.view === 'report', reportDone, responseDone);

        const doneFlags = [investigateDone, timelineDone, responseDone];
        Array.from(document.querySelectorAll('.lb-step-line')).forEach(function (line, index) {
            line.classList.toggle('is-filled', !!doneFlags[index]);
        });

        if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') window.IRSP.refreshIcons();
    }

    function applyStepState(name, number, isActive, isDone, isUnlocked) {
        const el = document.querySelector('.lb-step[data-step="' + name + '"]');
        if (!el) return;
        el.classList.toggle('is-active', isActive && !isDone);
        el.classList.toggle('is-done', isDone);
        el.classList.toggle('is-locked', !isUnlocked && !isDone);
        if ('disabled' in el) el.disabled = !isUnlocked;

        const circle = el.querySelector('.lb-step-circle');
        if (circle) {
            circle.innerHTML = isDone
                ? '<i data-lucide="check"></i>'
                : (!isUnlocked ? '<i data-lucide="lock"></i>' : String(number));
        }
    }

    function renderQueue() {
        const alerts = state.alerts;
        const critical = alerts.filter(function (a) { return String(a.severity || '').toLowerCase() === 'critical'; });
        const high = alerts.filter(function (a) { return String(a.severity || '').toLowerCase() === 'high'; });
        if (els.queueCritical) els.queueCritical.textContent = critical.length + ' Critical';
        if (els.queueHigh) els.queueHigh.textContent = high.length + ' High';

        if (els.queueAlertsBody) {
            if (!alerts.length) {
                els.queueAlertsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">No alerts are currently queued.</td></tr>';
            } else {
                els.queueAlertsBody.innerHTML = alerts.map(function (alert, index) {
                    const meta = severityMeta(alert.severity);
                    const result = state.questionResults[alert.alert_key];
                    const technique = MITRE_TECHNIQUES[alert.technique_id];
                    let statusIcon = '';
                    if (result === true) statusIcon = ' <i data-lucide="check-circle-2" class="lb-investigated-icon lb-icon-correct" title="Answered correctly"></i>';
                    else if (result === false) statusIcon = ' <i data-lucide="x-circle" class="lb-investigated-icon lb-icon-wrong" title="Answered incorrectly"></i>';

                    return '<tr class="queue-row ' + meta.row + '">'
                        + '<td><span class="status-badge ' + meta.badge + '">' + escapeHtml(meta.label) + '</span></td>'
                        + '<td>' + escapeHtml(alert.title || 'Untitled alert') + statusIcon + '</td>'
                        + '<td class="mono">' + escapeHtml(alert.host || '--') + '</td>'
                        + '<td>' + (technique ? '<span class="lb-technique-tag">' + escapeHtml(alert.technique_id) + '</span>' : '<span class="surface-note">--</span>') + '</td>'
                        + '<td><button class="btn btn-secondary" type="button" data-alert-index="' + index + '"><i data-lucide="search"></i> '
                        + (state.questionAttempted.has(alert.alert_key) ? 'Review' : 'Investigate') + '</button></td>'
                        + '</tr>';
                }).join('');
            }

            Array.from(els.queueAlertsBody.querySelectorAll('[data-alert-index]')).forEach(function (button) {
                button.addEventListener('click', function () { openCase(Number(button.dataset.alertIndex)); });
            });
        }

        const attempted = state.questionAttempted.size;
        if (els.questionProgress) {
            els.questionProgress.textContent = attempted + '/' + (state.alerts.length || 10) + ' alerts answered'
                + (allAlertsAttempted() ? ' - investigation complete, continue to Timeline above.' : '');
        }
    }

    function openCase(index) {
        const alert = state.alerts[index];
        if (!alert) return;

        state.activeAlertIndex = index;
        if (state.exerciseStarted && !state.exerciseComplete) {
            state.pivotedAlertKeys.add(alert.alert_key);
        }

        const meta = severityMeta(alert.severity);
        const technique = MITRE_TECHNIQUES[alert.technique_id];
        if (els.caseTitle) els.caseTitle.textContent = alert.title || 'Untitled alert';
        if (els.caseMeta) {
            els.caseMeta.innerHTML = '<span class="status-badge ' + meta.badge + '">' + escapeHtml(meta.label) + '</span>'
                + '<span class="mono">' + escapeHtml(alert.host || '--') + '</span>'
                + (technique ? '<span class="lb-technique-tag">' + escapeHtml(alert.technique_id) + ' &middot; ' + escapeHtml(technique.name) + '</span>' : '');
        }
        if (els.casePrev) els.casePrev.disabled = index <= 0;
        if (els.caseNext) els.caseNext.disabled = index >= state.alerts.length - 1;

        renderCaseQuestion(alert);

        if (els.searchInput) els.searchInput.value = '';
        runSearch('');

        showView('case');
    }

    function stepCase(delta) {
        const next = state.activeAlertIndex + delta;
        if (next < 0 || next >= state.alerts.length) return;
        openCase(next);
    }

    async function renderCaseQuestion(alert) {
        if (!els.caseQuestion) return;
        els.caseQuestion.innerHTML = '<div class="surface-note">Loading question...</div>';

        let payload;
        try {
            payload = await window.IRSPApi.getAlertQuestion(alert.alert_key);
        } catch (error) {
            els.caseQuestion.innerHTML = '<div class="surface-note">No question available for this alert.</div>';
            return;
        }

        const alreadyAnswered = state.questionAttempted.has(alert.alert_key);
        const result = state.questionResults[alert.alert_key];

        els.caseQuestion.innerHTML = '<div class="lb-question-card' + (alreadyAnswered ? ' is-answered' : '') + '">'
            + '<div class="lb-question-label"><i data-lucide="help-circle"></i> What does the evidence show?</div>'
            + '<div class="lb-question-text">' + escapeHtml(payload.question) + '</div>'
            + '<div class="lb-question-options">'
            + payload.options.map(function (opt) {
                return '<button class="lb-option-btn" type="button" data-choice="' + escapeHtml(opt.id) + '"' + (alreadyAnswered ? ' disabled' : '') + '>' + escapeHtml(opt.text) + '</button>';
            }).join('')
            + '</div>'
            + '<div class="lb-question-feedback" id="scenario-b-question-feedback"></div>'
            + '</div>';

        const feedbackEl = document.getElementById('scenario-b-question-feedback');
        if (alreadyAnswered && feedbackEl) {
            feedbackEl.innerHTML = result
                ? '<span class="status-badge green">Correct</span> Nice work - that matches the evidence.'
                : '<span class="status-badge red">Incorrect</span> That wasn\'t supported by this alert\'s evidence. Review the results below.';
        }

        Array.from(els.caseQuestion.querySelectorAll('[data-choice]')).forEach(function (button) {
            button.addEventListener('click', function () {
                submitQuestionAnswer(alert, button.dataset.choice);
            });
        });

        if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') window.IRSP.refreshIcons();
    }

    async function submitQuestionAnswer(alert, choiceId) {
        if (state.questionAttempted.has(alert.alert_key)) return;
        if (!state.exerciseStarted || state.exerciseComplete) return;

        let result;
        try {
            result = await window.IRSPApi.checkAlertAnswer(alert.alert_key, choiceId);
        } catch (error) {
            return;
        }

        state.questionAttempted.add(alert.alert_key);
        state.questionResults[alert.alert_key] = !!result.correct;

        renderCaseQuestion(alert);
        renderExerciseStatus();
    }

    async function runSearch(queryValue) {
        const raw = (queryValue !== undefined && queryValue !== null)
            ? queryValue
            : ((els.searchInput && els.searchInput.value) || '');
        const query = String(raw).trim();

        setBusy(true);
        if (els.searchStatus) els.searchStatus.textContent = query ? 'Filtering...' : 'Loading all telemetry...';

        try {
            const payload = await window.IRSPApi.search({ scenario: SCENARIO_ID, q: query });
            renderResults(payload, query);
            if (els.searchStatus) {
                els.searchStatus.textContent = query
                    ? 'Filtered to ' + formatNumber(payload.total_matches || 0) + ' matching event(s).'
                    : 'Showing all ' + formatNumber(payload.total_matches || 0) + ' event(s) for this endpoint.';
            }
        } catch (error) {
            if (els.searchStatus) els.searchStatus.textContent = 'Filter unavailable. Check the local telemetry service.';
            if (els.resultsBody) els.resultsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">Filter failed for this query.</td></tr>';
        } finally {
            setBusy(false);
            if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') window.IRSP.refreshIcons();
        }
    }

    function renderResults(payload, query) {
        const results = Array.isArray(payload.results) ? payload.results.map(normalizeLog) : [];
        state.results = results;
        state.totalMatches = payload.total_matches || results.length;
        state.query = query;
        state.telemetryConnected = state.telemetryConnected || results.length > 0;

        if (els.resultsNote) els.resultsNote.textContent = results.length + ' of ' + formatNumber(state.totalMatches) + ' events shown';
        if (!els.resultsBody) return;

        if (!results.length) {
            els.resultsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">No matching events found for this query.</td></tr>';
            updateDrilldown(null);
            return;
        }

        els.resultsBody.innerHTML = results.map(function (item, index) {
            const eventText = item.event || '--';
            return '<tr class="is-selectable-row" data-result-index="' + index + '" tabindex="0">'
                + '<td class="mono">' + escapeHtml(formatTimestamp(item.timestamp)) + '</td>'
                + '<td class="mono">' + escapeHtml(item.host) + '</td>'
                + '<td>' + escapeHtml(item.sourcetype) + '</td>'
                + '<td class="mono">' + escapeHtml(item.event_id || '--') + '</td>'
                + '<td class="mono lb-truncate" title="' + escapeHtml(eventText) + '">' + escapeHtml(eventText) + '</td>'
                + '</tr>';
        }).join('');

        Array.from(els.resultsBody.querySelectorAll('[data-result-index]')).forEach(function (row) {
            row.addEventListener('click', function () {
                Array.from(els.resultsBody.querySelectorAll('[data-result-index]')).forEach(function (r) { r.classList.remove('selected'); });
                row.classList.add('selected');
                updateDrilldown(results[Number(row.dataset.resultIndex)]);
            });
            row.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); row.click(); }
            });
        });

        const firstRow = els.resultsBody.querySelector('[data-result-index="0"]');
        if (firstRow) firstRow.classList.add('selected');
        updateDrilldown(results[0]);
    }

    let currentDrilldownRecord = null;

    function updateDrilldown(record) {
        if (!record) {
            if (els.drilldownHost) els.drilldownHost.textContent = '--';
            if (els.drilldownSourcetype) els.drilldownSourcetype.textContent = '--';
            if (els.drilldownUser) els.drilldownUser.textContent = '--';
            if (els.drilldownEventId) els.drilldownEventId.textContent = '--';
            if (els.drilldownTask) els.drilldownTask.textContent = '--';
            if (els.drilldownProcess) els.drilldownProcess.textContent = '--';
            if (els.drilldownParent) els.drilldownParent.textContent = '--';
            if (els.drilldownEvent) els.drilldownEvent.textContent = 'Select a row in the results table to read the full event text here.';
            if (els.drilldownJson) els.drilldownJson.textContent = '{}';
            if (els.drilldownFields) els.drilldownFields.textContent = 'Select a search result.';
            if (els.drilldownLineage) els.drilldownLineage.hidden = true;
            updatePivotFieldStates(null);
            return;
        }

        if (els.drilldownHost) els.drilldownHost.textContent = record.host || '--';
        if (els.drilldownSourcetype) els.drilldownSourcetype.textContent = record.sourcetype || '--';
        if (els.drilldownUser) els.drilldownUser.textContent = record.user || '--';
        if (els.drilldownEventId) els.drilldownEventId.textContent = record.event_id || '--';
        if (els.drilldownTask) els.drilldownTask.textContent = record.task_name || '--';
        if (els.drilldownProcess) els.drilldownProcess.textContent = record.process_name || '--';
        if (els.drilldownParent) els.drilldownParent.textContent = record.parent_process || '--';
        if (els.drilldownEvent) els.drilldownEvent.textContent = record.event || 'No event text recorded for this entry.';
        if (els.drilldownJson) els.drilldownJson.textContent = JSON.stringify(record, null, 2);
        if (els.drilldownFields) els.drilldownFields.textContent = fieldsText(record);

        if (els.drilldownLineage) {
            if (record.parent_process || record.process_name) {
                const nodes = [];
                if (record.parent_process) nodes.push('<span class="lb-lineage-node">' + escapeHtml(record.parent_process) + '</span>');
                if (record.process_name) nodes.push('<span class="lb-lineage-node lb-lineage-current">' + escapeHtml(record.process_name) + '</span>');
                els.drilldownLineage.innerHTML = '<i data-lucide="git-branch"></i> ' + nodes.join('<span class="lb-lineage-arrow">&rarr;</span>');
                els.drilldownLineage.hidden = false;
            } else {
                els.drilldownLineage.hidden = true;
            }
        }

        updatePivotFieldStates(record);
        if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') window.IRSP.refreshIcons();
    }

    function updatePivotFieldStates(record) {
        currentDrilldownRecord = record;
        document.querySelectorAll('[data-pivot-field]').forEach(function (el) {
            const field = el.getAttribute('data-pivot-field');
            const value = record ? record[field] : '';
            el.classList.toggle('lb-empty', !value);
        });
    }

    function pivotOnField(field) {
        if (!currentDrilldownRecord) return;
        const value = currentDrilldownRecord[field];
        if (!value) return;
        const query = field + ' = "' + String(value).replace(/"/g, '\\"') + '"';
        if (els.searchInput) els.searchInput.value = query;
        runSearch(query).then(function () {
            if (els.resultsBody) {
                els.resultsBody.classList.remove('lb-pulse');
                void els.resultsBody.offsetWidth;
                els.resultsBody.classList.add('lb-pulse');
            }
        });
    }

    let timelineEventsCache = null;
    let dragSourceId = null;

    async function openTimeline() {
        showView('timeline');
        if (els.timelineFeedback) els.timelineFeedback.innerHTML = '';

        if (!timelineEventsCache) {
            if (els.timelineList) els.timelineList.innerHTML = '<div class="surface-note">Loading events...</div>';
            try {
                const payload = await window.IRSPApi.getTimelineEvents();
                timelineEventsCache = payload.events || [];
                state.timelineTotal = timelineEventsCache.length;
                state.timelineIds = timelineEventsCache.map(function (e) { return e.id; });
                for (let i = state.timelineIds.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    const tmp = state.timelineIds[i];
                    state.timelineIds[i] = state.timelineIds[j];
                    state.timelineIds[j] = tmp;
                }
            } catch (error) {
                if (els.timelineList) els.timelineList.innerHTML = '<div class="surface-note">Timeline events are unavailable.</div>';
                return;
            }
        }

        renderTimelineList();
    }

    function renderTimelineList() {
        if (!els.timelineList || !timelineEventsCache) return;
        const byId = {};
        timelineEventsCache.forEach(function (e) { byId[e.id] = e; });

        els.timelineList.innerHTML = state.timelineIds.map(function (id, index) {
            const event = byId[id];
            return '<li class="lb-timeline-card" draggable="true" data-event-id="' + escapeHtml(id) + '">'
                + '<span class="lb-timeline-handle"><i data-lucide="grip-vertical"></i></span>'
                + '<span class="lb-timeline-position">' + (index + 1) + '</span>'
                + '<span class="lb-timeline-summary">' + escapeHtml(event ? event.summary : id) + '</span>'
                + '</li>';
        }).join('');

        Array.from(els.timelineList.querySelectorAll('.lb-timeline-card')).forEach(function (card) {
            card.addEventListener('dragstart', function () {
                dragSourceId = card.dataset.eventId;
                card.classList.add('is-dragging');
            });
            card.addEventListener('dragend', function () {
                card.classList.remove('is-dragging');
            });
            card.addEventListener('dragover', function (event) {
                event.preventDefault();
                card.classList.add('is-drag-over');
            });
            card.addEventListener('dragleave', function () {
                card.classList.remove('is-drag-over');
            });
            card.addEventListener('drop', function (event) {
                event.preventDefault();
                card.classList.remove('is-drag-over');
                const targetId = card.dataset.eventId;
                if (!dragSourceId || dragSourceId === targetId) return;

                const fromIndex = state.timelineIds.indexOf(dragSourceId);
                const toIndex = state.timelineIds.indexOf(targetId);
                if (fromIndex === -1 || toIndex === -1) return;

                // Swap positions directly, not shift - dragging card 8 onto
                // card 1 puts 8 exactly where 1 was and vice versa.
                state.timelineIds[fromIndex] = targetId;
                state.timelineIds[toIndex] = dragSourceId;
                renderTimelineList();
            });
        });

        if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') window.IRSP.refreshIcons();
    }

    async function checkTimeline() {
        if (!state.exerciseStarted || state.exerciseComplete) return;
        let result;
        try {
            result = await window.IRSPApi.checkTimelineOrder(state.timelineIds);
        } catch (error) {
            if (els.timelineFeedback) els.timelineFeedback.innerHTML = '<span class="status-badge red">Could not check the timeline. Try again.</span>';
            return;
        }

        state.timelineChecked = true;
        state.timelineCorrect = result.correct_positions;
        state.timelineTotal = result.total;

        const perfect = result.correct_positions === result.total;
        if (els.timelineFeedback) {
            els.timelineFeedback.innerHTML = '<div class="lb-continue-banner' + (perfect ? '' : ' is-warn') + '"><i data-lucide="' + (perfect ? 'check-circle-2' : 'info') + '"></i><span>'
                + result.correct_positions + ' / ' + result.total + ' in the correct position. '
                + (perfect ? 'That\'s the real order this attack unfolded in.' : 'Keep adjusting - drag cards to fix the order, then check again.')
                + '</span></div>';
        }
        renderExerciseStatus();
        if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') window.IRSP.refreshIcons();
    }

    async function openResponsePlan() {
        showView('response');
        if (els.responseFeedback) els.responseFeedback.innerHTML = '';

        if (!state.responseOptions.length) {
            if (els.responseList) els.responseList.innerHTML = '<div class="surface-note">Loading response options...</div>';
            try {
                const payload = await window.IRSPApi.getResponseOptions();
                state.responseOptions = payload.options || [];
                state.responseTotalCorrect = 6;
            } catch (error) {
                if (els.responseList) els.responseList.innerHTML = '<div class="surface-note">Response options are unavailable.</div>';
                return;
            }
        }
        renderResponseList();
    }

    function renderResponseList() {
        if (!els.responseList) return;
        const locked = state.responseChecked;

        els.responseList.innerHTML = state.responseOptions.map(function (option) {
            const checked = state.responseSelected.has(option.id);
            return '<label class="lb-response-option' + (checked ? ' is-checked' : '') + (locked ? ' is-locked' : '') + '">'
                + '<input type="checkbox" data-response-id="' + escapeHtml(option.id) + '"' + (checked ? ' checked' : '') + (locked ? ' disabled' : '') + '>'
                + '<span>' + escapeHtml(option.label) + '</span>'
                + '</label>';
        }).join('');

        Array.from(els.responseList.querySelectorAll('[data-response-id]')).forEach(function (checkbox) {
            checkbox.addEventListener('change', function () {
                if (checkbox.checked) state.responseSelected.add(checkbox.dataset.responseId);
                else state.responseSelected.delete(checkbox.dataset.responseId);
                renderResponseList();
            });
        });
    }

    async function submitResponsePlan() {
        if (!state.exerciseStarted || state.exerciseComplete) return;
        if (!state.responseSelected.size) return;

        let result;
        try {
            result = await window.IRSPApi.checkResponseSelection(Array.from(state.responseSelected));
        } catch (error) {
            if (els.responseFeedback) els.responseFeedback.innerHTML = '<span class="status-badge red">Could not check the response plan. Try again.</span>';
            return;
        }

        state.responseChecked = true;
        state.responseCorrect = result.correct_selected;
        state.responseWrong = result.wrong_selected;
        state.responseMissed = result.missed;
        state.responseTotalCorrect = result.total_correct;

        const perfect = result.correct_selected === result.total_correct && result.wrong_selected === 0;
        if (els.responseFeedback) {
            els.responseFeedback.innerHTML = '<div class="status-badge ' + (perfect ? 'green' : 'yellow') + '">'
                + result.correct_selected + '/' + result.total_correct + ' correct actions selected'
                + (result.wrong_selected ? ', ' + result.wrong_selected + ' incorrect action(s) selected' : '') + '</div>'
                + (perfect
                    ? '<p class="surface-note" style="margin-top:0.5rem;">That\'s the right response plan for this incident.</p>'
                    : '<p class="surface-note" style="margin-top:0.5rem;">' + (result.missed ? result.missed + ' correct action(s) were missed. ' : '') + (result.wrong_selected ? 'Some selections don\'t match what the evidence actually calls for.' : '') + '</p>')
                + '<div class="lb-continue-banner" style="margin-top:0.75rem;"><i data-lucide="check-circle-2"></i><span>Ready to close this out.</span><span class="surface-note">Click <strong>Submit Incident</strong> at the top of the page.</span></div>';
        }
        renderResponseList();
        renderExerciseStatus();
    }

    function renderReport() {
        const score = calculateFinalScore();
        const coverage = buildMitreCoverage();

        if (els.reportScore) els.reportScore.textContent = score.total;
        if (els.reportStanding) els.reportStanding.textContent = standingLabel(score.total) + ' - ' + reportStatus(score.total);

        if (els.reportBreakdown) {
            els.reportBreakdown.innerHTML = [
                ['Alert questions', score.questionScore + ' / 30 (' + getCorrectQuestionCount() + '/10 correct)'],
                ['Timeline accuracy', score.timelineScore + ' / 25 (' + state.timelineCorrect + '/' + state.timelineTotal + ' correct positions)'],
                ['Response plan', score.responseScore + ' / 35 (' + state.responseCorrect + '/' + state.responseTotalCorrect + ' correct, ' + state.responseWrong + ' wrong)'],
                ['Time remaining', score.timeScore + ' / 10']
            ].map(function (pair) {
                return '<div class="key-value-item"><span class="key">' + escapeHtml(pair[0]) + '</span><span class="value mono">' + escapeHtml(pair[1]) + '</span></div>';
            }).join('');
        }

        if (els.reportMitre) {
            els.reportMitre.innerHTML = coverage.map(function (item) {
                const cls = item.status === 'correct' ? 'is-hit' : item.status === 'incorrect' ? 'is-wrong' : '';
                const label = item.status === 'correct' ? 'Correct' : item.status === 'incorrect' ? 'Incorrect' : 'Not opened';
                const badge = item.status === 'correct' ? 'green' : item.status === 'incorrect' ? 'red' : 'blue';
                return '<div class="lb-mitre-row ' + cls + '">'
                    + '<span class="status-badge ' + badge + '">' + label + '</span>'
                    + '<span>' + escapeHtml(item.title) + '</span>'
                    + (item.code ? '<span class="lb-technique-tag">' + escapeHtml(item.code) + (item.name ? ' &middot; ' + escapeHtml(item.name) : '') + '</span>' : '<span class="surface-note">No mapped technique</span>')
                    + '</div>';
            }).join('');
        }

        if (els.reportSteps) {
            els.reportSteps.innerHTML = LAB_STEPS.map(function (step) {
                const done = step.metric();
                return '<div class="alert-item ' + (done ? 'success' : 'info') + '">'
                    + '<div class="alert-info"><h4>' + escapeHtml(step.title) + '</h4><p class="surface-note">' + escapeHtml(done ? 'Completed during this run.' : step.feedback) + '</p></div>'
                    + '<span class="status-badge ' + (done ? 'green' : 'blue') + '">' + (done ? 'Complete' : 'Open') + '</span>'
                    + '</div>';
            }).join('');
        }

        showView('report');
    }

    function renderExerciseStatus() {
        if (els.timer) els.timer.textContent = formatDuration(state.secondsRemaining);
        if (els.submitExercise) {
            const readyToSubmit = state.exerciseStarted && !state.exerciseComplete && state.timelineChecked && state.responseChecked;
            els.submitExercise.disabled = !readyToSubmit;
            els.submitExercise.title = readyToSubmit ? '' : 'Build the timeline and submit a response plan first.';
        }
        if (els.exerciseStatus) {
            if (state.exerciseComplete) els.exerciseStatus.textContent = state.completionReason === 'timeout' ? 'Time expired' : 'Submitted';
            else if (state.exerciseStarted) els.exerciseStatus.textContent = 'Clock running';
            else els.exerciseStatus.textContent = 'Ready to begin';
        }
        if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') window.IRSP.refreshIcons();
        renderQueue();
        renderStepper();
    }

    function finalizeExercise(reason) {
        if (state.exerciseComplete) return;
        state.exerciseComplete = true;
        state.completionReason = reason;
        window.clearInterval(state.timerId);

        persistScenarioReport(reason);
        persistCompletion();
        renderExerciseStatus();
        renderReport();
    }

    function resetExercise() {
        window.clearInterval(state.timerId);
        state.exerciseStarted = false;
        state.exerciseComplete = false;
        state.secondsRemaining = EXERCISE_SECONDS;
        state.timerId = null;
        state.activeAlertIndex = -1;
        state.pivotedAlertKeys = new Set();
        state.questionResults = {};
        state.questionAttempted = new Set();
        state.timelineIds = [];
        state.timelineChecked = false;
        state.timelineCorrect = 0;
        state.timelineTotal = 0;
        state.responseSelected = new Set();
        state.responseChecked = false;
        state.responseCorrect = 0;
        state.responseWrong = 0;
        state.responseMissed = 0;
        state.completionReason = '';
        dashboardRecordSaved = false;
        timelineEventsCache = null;

        renderExerciseStatus();
        showView('queue');
    }

    function startExercise() {
        if (state.exerciseComplete) resetExercise();
        if (state.exerciseStarted) return;

        state.exerciseStarted = true;
        state.exerciseComplete = false;
        state.secondsRemaining = EXERCISE_SECONDS;
        renderExerciseStatus();

        state.timerId = window.setInterval(function () {
            state.secondsRemaining -= 1;
            if (state.secondsRemaining <= 0) {
                state.secondsRemaining = 0;
                renderExerciseStatus();
                finalizeExercise('timeout');
                return;
            }
            renderExerciseStatus();
        }, 1000);
    }

    async function hydrateAlerts() {
        try {
            const payload = await window.IRSPApi.getAlerts({ scenario: SCENARIO_ID, limit: 10 });
            state.alerts = Array.isArray(payload.items) ? payload.items : [];
            renderQueue();
        } catch (error) {
            if (els.queueAlertsBody) {
                els.queueAlertsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">Alerts are unavailable.</td></tr>';
            }
        }
    }

    function bindControls() {
        document.querySelectorAll('.lb-step[data-step]').forEach(function (btn) {
            if (btn.tagName !== 'BUTTON') return; // the Report node is a plain div - never directly navigable
            btn.addEventListener('click', function () {
                const step = btn.dataset.step;
                if (btn.disabled) return;
                if (step === 'investigate') showView('queue');
                else if (step === 'timeline') openTimeline();
                else if (step === 'response') openResponsePlan();
            });
        });

        document.querySelectorAll('[data-pivot-field]').forEach(function (el) {
            el.addEventListener('click', function () {
                if (el.classList.contains('lb-empty')) return;
                pivotOnField(el.getAttribute('data-pivot-field'));
            });
        });

        if (els.runSearch) els.runSearch.addEventListener('click', function () { runSearch(); });
        if (els.searchInput) {
            els.searchInput.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') { event.preventDefault(); runSearch(); }
            });
        }
        if (els.submitExercise) els.submitExercise.addEventListener('click', function () { finalizeExercise('submission'); });

        if (els.caseBack) els.caseBack.addEventListener('click', function () { showView('queue'); });
        if (els.casePrev) els.casePrev.addEventListener('click', function () { stepCase(-1); });
        if (els.caseNext) els.caseNext.addEventListener('click', function () { stepCase(1); });

        if (els.timelineCheck) els.timelineCheck.addEventListener('click', function () { checkTimeline(); });

        if (els.responseSubmit) els.responseSubmit.addEventListener('click', function () { submitResponsePlan(); });

        if (els.reportRestart) els.reportRestart.addEventListener('click', function () { startExercise(); });
    }

    let hasIntentionalExit = false;

    function handleExitLab() {
        if (state.exerciseStarted && !state.exerciseComplete) {
            const ok = window.confirm('End the lab now? Your current progress and score will be saved to the dashboard.');
            if (!ok) return false;
            window.clearInterval(state.timerId);
            persistCompletion();
        }
        hasIntentionalExit = true;
        return true;
    }

    window.ScenarioBExit = handleExitLab;

    window.addEventListener('pagehide', function () { persistCompletion(); });
    window.addEventListener('beforeunload', function (e) {
        if (hasIntentionalExit || !state.exerciseStarted || state.exerciseComplete) return;
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your lab progress may be lost.';
        return e.returnValue;
    });

    bindControls();
    showView('queue');
    hydrateAlerts();
    resolveUsername().then(function (u) { cachedUsername = u; }).catch(function () {});
    startExercise();
})();
