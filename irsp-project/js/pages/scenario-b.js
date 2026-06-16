(function () {
    'use strict';

    const SCENARIO_ID = 'scenario-b';
    const DEFAULT_QUERY = 'host in ("192.168.32.130", "192.168.32.129", "DESKTOP-GRQ4G1E") or sourcetype has "sysmon" or sourcetype has "security" or sourcetype has "taskscheduler"';
    const EXERCISE_SECONDS = 10 * 60;

    const els = {
        timer: document.getElementById('scenario-b-timer'),
        exerciseStatus: document.getElementById('scenario-b-exercise-status'),
        startExercise: document.getElementById('scenario-b-start-exercise'),
        submitExercise: document.getElementById('scenario-b-submit-exercise'),
        finalScore: document.getElementById('scenario-b-final-score'),
        scoreBreakdown: document.getElementById('scenario-b-score-breakdown'),
        searchInput: document.getElementById('scenario-b-search-input'),
        runSearch: document.getElementById('scenario-b-run-search'),
        refreshLogs: document.getElementById('scenario-b-refresh-logs'),
        searchStatus: document.getElementById('scenario-b-search-status'),
        sourceStatus: document.getElementById('scenario-b-source-status'),
        resultsNote: document.getElementById('scenario-b-results-note'),
        resultsBody: document.getElementById('scenario-b-results-body'),
        alertsBody: document.getElementById('scenario-b-alerts-body'),
        searchPanel: document.getElementById('scenario-b-search-panel-search'),
        statsPanel: document.getElementById('scenario-b-search-panel-stats'),
        rawPanel: document.getElementById('scenario-b-search-panel-raw'),
        metricAlerts: document.getElementById('scenario-b-metric-alerts'),
        metricAlertsNote: document.getElementById('scenario-b-metric-alerts-note'),
        metricEvents: document.getElementById('scenario-b-metric-events'),
        metricEventsNote: document.getElementById('scenario-b-metric-events-note'),
        metricResults: document.getElementById('scenario-b-metric-results'),
        metricResultsNote: document.getElementById('scenario-b-metric-results-note'),
        notableCount: document.getElementById('scenario-b-notable-count'),
        escalatedCount: document.getElementById('scenario-b-escalated-count'),
        logCount: document.getElementById('scenario-b-log-count'),
        consoleSourceStatus: document.getElementById('scenario-b-console-source-status'),
        investigationPhase: document.getElementById('scenario-b-investigation-phase'),
        containmentPosture: document.getElementById('scenario-b-containment-posture'),
        analystQuestion: document.getElementById('scenario-b-analyst-question'),
        riskScore: document.getElementById('scenario-b-risk-score'),
        riskLabel: document.getElementById('scenario-b-risk-label'),
        riskNote: document.getElementById('scenario-b-risk-note'),
        riskFill: document.getElementById('scenario-b-risk-fill'),
        riskEvidence: document.getElementById('scenario-b-risk-evidence'),
        riskDecision: document.getElementById('scenario-b-risk-decision'),
        timeline: document.getElementById('scenario-b-timeline'),
        timelineNote: document.getElementById('scenario-b-timeline-note'),
        remediationActions: document.getElementById('scenario-b-remediation-actions'),
        drilldownHost: document.getElementById('scenario-b-drilldown-host'),
        drilldownSourcetype: document.getElementById('scenario-b-drilldown-sourcetype'),
        drilldownUser: document.getElementById('scenario-b-drilldown-user'),
        drilldownEventId: document.getElementById('scenario-b-drilldown-event-id'),
        drilldownJson: document.getElementById('scenario-b-drilldown-json'),
        drilldownFields: document.getElementById('scenario-b-drilldown-fields')
    };

    const state = {
        alerts: [],
        results: [],
        totalMatches: 0,
        query: DEFAULT_QUERY,
        remediations: {},
        exerciseStarted: false,
        exerciseComplete: false,
        secondsRemaining: EXERCISE_SECONDS,
        timerId: null,
        searchesRun: 0,
        alertsPivoted: 0,
        completionReason: ''
    };

    const REMEDIATION_ACTIONS = [
        {
            id: 'collect-evidence',
            title: 'Collect endpoint evidence',
            detail: 'Preserve event trail, selected raw fields, process activity, users, network connections, and alert pivots.',
            validation: 'Validate with the current KQL result set and event drilldown fields.'
        },
        {
            id: 'restrict-remote-admin',
            title: 'Restrict remote administration',
            detail: 'Treat RDP, SSH, WinRM, and remote command paths as containment controls until the incident is understood.',
            validation: 'Pivot on remote access, WinRM, Invoke-Command, RDP, SSH, and destination connection events.'
        },
        {
            id: 'remove-persistence',
            title: 'Remove persistence mechanism',
            detail: 'Queue review of scheduled tasks, startup scripts, and task modifications tied to the suspicious host.',
            validation: 'Search for Task Scheduler events and confirm no matching task activity remains after cleanup.'
        },
        {
            id: 'restore-protection',
            title: 'Restore endpoint protections',
            detail: 'Confirm security services are enabled and any tamper-style activity has stopped.',
            validation: 'Pivot on Defender, security service, tamper, and protection-state events.'
        },
        {
            id: 'rotate-credentials',
            title: 'Rotate exposed credentials',
            detail: 'Prioritize accounts seen in credential access, registry, history, LSASS, or password-search telemetry.',
            validation: 'Search credential access terms and verify no repeated access attempts after rotation.'
        },
        {
            id: 'validate-clean-state',
            title: 'Validate clean state',
            detail: 'Run final broad host activity search across both endpoints and compare against the attack timeline.',
            validation: 'Use Host Activity plus alert pivots to prove suspicious activity has gone quiet.'
        }
    ];

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString();
    }

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

    function badgeClassForScore(score) {
        if (score >= 75) return { badge: 'red', label: 'Critical', decision: 'Contain endpoint access, preserve evidence, and validate remediation.' };
        if (score >= 50) return { badge: 'yellow', label: 'High', decision: 'Escalate to containment planning and pivot across both endpoints.' };
        if (score >= 25) return { badge: 'blue', label: 'Medium', decision: 'Continue triage and confirm whether activity is benign or malicious.' };
        return { badge: 'blue', label: 'Low', decision: 'Monitor telemetry and keep the baseline visible.' };
    }

    function classifyPhase(record) {
        const haystack = [
            record.event,
            record.process_name,
            record.parent_process,
            record.sourcetype,
            record.task_name,
            record.query_name
        ].join(' ').toLowerCase();

        if (/phish|invoice|executionpolicy|hidden user/.test(haystack)) return 'Initial Access';
        if (/powershell|invoke|cmdlet|process create|process_create/.test(haystack)) return 'Execution';
        if (/scheduled task|taskscheduler|task scheduler|startup script/.test(haystack)) return 'Persistence';
        if (/fodhelper|computerdefaults|uac|privilege/.test(haystack)) return 'Privilege Escalation';
        if (/defender|security service|tamper|disable/.test(haystack)) return 'Defense Evasion';
        if (/credential|password|lsass|procdump|registry|history/.test(haystack)) return 'Credential Access';
        if (/ipconfig|tasklist|systeminfo|netstat|whoami|discovery/.test(haystack)) return 'Discovery';
        if (/winrm|invoke-command|remote|rdp|ssh/.test(haystack)) return 'Lateral Movement';
        if (/compress|archive|exfil|user-agent|tls|outbound|c2/.test(haystack)) return 'Collection / C2 / Exfiltration';
        if (/cpu|ransom|note|impact/.test(haystack)) return 'Impact';
        return 'Endpoint Activity';
    }

    function scoreFromAlerts(alerts) {
        return alerts.reduce(function (total, alert) {
            const severity = String(alert.severity || '').toLowerCase();
            if (severity === 'critical') return total + 35;
            if (severity === 'high') return total + 25;
            if (severity === 'medium') return total + 15;
            return total + 5;
        }, 0);
    }

    function scoreFromResults(results) {
        const phases = new Set();
        let score = Math.min(results.length, 20);

        results.forEach(function (record) {
            const phase = classifyPhase(record);
            phases.add(phase);
            if (phase === 'Credential Access') score += 20;
            else if (phase === 'Persistence' || phase === 'Lateral Movement') score += 16;
            else if (phase === 'Defense Evasion' || phase === 'Collection / C2 / Exfiltration') score += 14;
            else if (phase === 'Privilege Escalation' || phase === 'Impact') score += 12;
            else if (phase === 'Execution' || phase === 'Initial Access') score += 8;
        });

        return { score: score, phases: phases };
    }

    function updateRiskScore() {
        const resultScore = scoreFromResults(state.results);
        const alertScore = scoreFromAlerts(state.alerts);
        const score = Math.min(100, Math.round(alertScore + resultScore.score));
        const meta = badgeClassForScore(score);

        if (els.riskScore) els.riskScore.textContent = state.exerciseComplete ? score + '/100' : 'Hidden';
        if (els.riskLabel) {
            els.riskLabel.className = 'status-badge ' + meta.badge;
            els.riskLabel.textContent = state.exerciseComplete ? meta.label : 'Active';
        }
        if (els.riskFill) els.riskFill.style.width = score + '%';
        if (els.riskNote) {
            els.riskNote.textContent = state.exerciseComplete
                ? 'Score combines ' + state.alerts.length + ' alert(s), '
                    + formatNumber(state.totalMatches || state.results.length) + ' matched event(s), and phase coverage from the active query.'
                : 'Pressure is building from alerts and telemetry, but the trainee score stays locked until the scenario ends.';
        }
        if (els.riskEvidence) {
            const phases = Array.from(resultScore.phases).filter(function (phase) {
                return phase !== 'Endpoint Activity';
            });
            els.riskEvidence.textContent = phases.length ? phases.join(', ') : 'No attack-chain phase detected in the current result set.';
        }
        if (els.riskDecision) els.riskDecision.textContent = meta.decision;
        if (els.investigationPhase) {
            els.investigationPhase.className = 'status-badge ' + meta.badge;
            els.investigationPhase.textContent = score >= 50 ? 'Containment Review' : 'Triage';
        }
    }

    function summarizeEvent(record) {
        const phase = classifyPhase(record);
        const host = record.host || 'unknown-host';
        const event = record.event || record.process_name || record.task_name || 'Endpoint event';
        return phase + ' on ' + host + ': ' + event;
    }

    function renderTimeline() {
        if (!els.timeline) return;

        const sorted = state.results.slice().sort(function (a, b) {
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        }).slice(0, 8);

        if (els.timelineNote) {
            els.timelineNote.textContent = sorted.length
                ? sorted.length + ' timeline event(s) from the active result set.'
                : 'Run a KQL search to build the incident sequence.';
        }

        if (!sorted.length) {
            els.timeline.innerHTML = '<div class="timeline-item"><div class="time">Waiting</div><div class="desc">Run a KQL search to build the incident sequence.</div></div>';
            return;
        }

        els.timeline.innerHTML = sorted.map(function (record) {
            return '<div class="timeline-item">'
                + '<div class="time">' + escapeHtml(formatTimestamp(record.timestamp)) + ' | ' + escapeHtml(classifyPhase(record)) + '</div>'
                + '<div class="desc">' + escapeHtml(summarizeEvent(record)) + '</div>'
                + '</div>';
        }).join('');
    }

    function renderRemediationActions() {
        if (!els.remediationActions) return;

        els.remediationActions.innerHTML = REMEDIATION_ACTIONS.map(function (action) {
            const status = state.remediations[action.id] || 'recommended';
            const badge = status === 'validated' ? 'green' : status === 'queued' ? 'yellow' : 'blue';
            const label = status === 'validated' ? 'Validated' : status === 'queued' ? 'Queued' : 'Recommended';
            const disabled = status === 'validated' || !state.exerciseStarted || state.exerciseComplete ? ' disabled' : '';

            return '<div class="alert-item info" data-remediation-id="' + escapeHtml(action.id) + '">'
                + '<div class="alert-info">'
                + '<h4>' + escapeHtml(action.title) + '</h4>'
                + '<p>' + escapeHtml(action.detail) + '</p>'
                + '<p class="surface-note">' + escapeHtml(action.validation) + '</p>'
                + '</div>'
                + '<div class="action-stack">'
                + '<span class="status-badge ' + badge + '">' + label + '</span>'
                + '<button class="btn btn-secondary" type="button" data-remediation-button="' + escapeHtml(action.id) + '"' + disabled + '>'
                + '<i data-lucide="check-circle-2"></i> Validate</button>'
                + '</div>'
                + '</div>';
        }).join('');

        Array.from(els.remediationActions.querySelectorAll('[data-remediation-button]')).forEach(function (button) {
            button.addEventListener('click', function () {
                if (!state.exerciseStarted || state.exerciseComplete) return;

                const actionId = button.dataset.remediationButton;
                state.remediations[actionId] = 'queued';
                if (actionId === 'restrict-remote-admin') {
                    if (els.containmentPosture) els.containmentPosture.textContent = 'Remote Restricted';
                    if (els.analystQuestion) els.analystQuestion.textContent = 'Did remote access activity stop after containment was queued?';
                }
                renderRemediationActions();

                window.setTimeout(function () {
                    state.remediations[actionId] = 'validated';
                    if (actionId === 'validate-clean-state' && els.containmentPosture) {
                        els.containmentPosture.textContent = 'Validated';
                    }
                    renderRemediationActions();
                    renderExerciseStatus();
                    if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') {
                        window.IRSP.refreshIcons();
                    }
                }, 450);
            });
        });

        if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') {
            window.IRSP.refreshIcons();
        }
    }

    function calculateFinalScore() {
        const validatedCount = Object.values(state.remediations).filter(function (status) {
            return status === 'validated';
        }).length;
        const actionScore = Math.min(45, validatedCount * 8);
        const alertScore = Math.min(20, state.alertsPivoted * 7);
        const searchScore = Math.min(15, state.searchesRun * 3);
        const timelineScore = state.results.length ? 10 : 0;
        const timeScore = Math.min(10, Math.ceil((state.secondsRemaining / EXERCISE_SECONDS) * 10));
        const total = Math.min(100, actionScore + alertScore + searchScore + timelineScore + timeScore);

        return {
            total: total,
            actionScore: actionScore,
            alertScore: alertScore,
            searchScore: searchScore,
            timelineScore: timelineScore,
            timeScore: timeScore,
            validatedCount: validatedCount
        };
    }

    function renderExerciseStatus() {
        if (els.timer) els.timer.textContent = formatDuration(state.secondsRemaining);

        if (els.submitExercise) {
            els.submitExercise.disabled = !state.exerciseStarted || state.exerciseComplete;
        }
        if (els.startExercise) {
            els.startExercise.disabled = state.exerciseStarted && !state.exerciseComplete;
            els.startExercise.innerHTML = state.exerciseComplete
                ? '<i data-lucide="rotate-ccw"></i> Restart Scenario'
                : '<i data-lucide="timer"></i> Start Scenario';
        }

        if (els.exerciseStatus) {
            if (state.exerciseComplete) {
                els.exerciseStatus.textContent = state.completionReason === 'timeout'
                    ? 'Time expired: score revealed'
                    : 'Submitted: score revealed';
            } else if (state.exerciseStarted) {
                els.exerciseStatus.textContent = 'Clock running: investigate and contain';
            } else {
                els.exerciseStatus.textContent = 'Ready to begin';
            }
        }

        if (!state.exerciseComplete && els.finalScore) {
            els.finalScore.textContent = 'Locked until submission';
        }
        if (!state.exerciseComplete && els.scoreBreakdown) {
            els.scoreBreakdown.textContent = state.exerciseStarted
                ? 'Work the queue, run pivots, validate response actions, and submit before the timer expires.'
                : 'Start the scenario to begin assessment.';
        }

        if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') {
            window.IRSP.refreshIcons();
        }
    }

    function finalizeExercise(reason) {
        if (state.exerciseComplete) return;

        state.exerciseComplete = true;
        state.completionReason = reason;
        window.clearInterval(state.timerId);

        const score = calculateFinalScore();
        if (els.finalScore) els.finalScore.textContent = score.total + '/100';
        if (els.scoreBreakdown) {
            els.scoreBreakdown.textContent = 'Actions ' + score.actionScore
                + ', alert pivots ' + score.alertScore
                + ', KQL searches ' + score.searchScore
                + ', timeline ' + score.timelineScore
                + ', time bonus ' + score.timeScore
                + '. Ended by ' + reason + '.';
        }
        if (els.containmentPosture && score.validatedCount >= 4) {
            els.containmentPosture.textContent = 'Contained';
        }

        updateRiskScore();
        renderRemediationActions();
        renderExerciseStatus();
    }

    function resetExercise() {
        window.clearInterval(state.timerId);
        state.exerciseStarted = false;
        state.exerciseComplete = false;
        state.secondsRemaining = EXERCISE_SECONDS;
        state.timerId = null;
        state.searchesRun = 0;
        state.alertsPivoted = 0;
        state.completionReason = '';
        state.remediations = {};

        if (els.containmentPosture) els.containmentPosture.textContent = 'Monitoring';
        if (els.analystQuestion) els.analystQuestion.textContent = 'Which endpoint event created the first confirmed compromise signal?';
        renderExerciseStatus();
        renderRemediationActions();
        updateRiskScore();
    }

    function startExercise() {
        if (state.exerciseComplete) {
            resetExercise();
        }

        if (state.exerciseStarted) return;

        state.exerciseStarted = true;
        state.exerciseComplete = false;
        state.secondsRemaining = EXERCISE_SECONDS;
        renderExerciseStatus();
        renderRemediationActions();

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
            .filter(function ([, value]) {
                return value !== null && value !== undefined && value !== '';
            })
            .map(function ([key, value]) {
                return key + ': ' + value;
            })
            .join('\n');
    }

    function alertQuery(alert) {
        const key = String(alert.alert_key || '').toLowerCase();
        const title = String(alert.title || '').toLowerCase();

        if (key.includes('credential') || title.includes('credential') || title.includes('lsass')) {
            return 'event has "credential" or event has "lsass" or event has "procdump" or process_name has "procdump"';
        }
        if (key.includes('persistence') || title.includes('scheduled task')) {
            return 'sourcetype has "taskscheduler" or event has "scheduled task" or task_name != ""';
        }
        if (key.includes('c2') || title.includes('tls') || title.includes('outbound')) {
            return 'event has "tls" or event has "user-agent" or event has "exfil" or dest_ip != ""';
        }

        return alert.host ? 'host == "' + alert.host + '"' : DEFAULT_QUERY;
    }

    function setBusy(isBusy) {
        [els.runSearch, els.refreshLogs].forEach(function (button) {
            if (button) button.disabled = isBusy;
        });
    }

    function updateDrilldown(record) {
        if (!record) {
            if (els.drilldownHost) els.drilldownHost.textContent = '--';
            if (els.drilldownSourcetype) els.drilldownSourcetype.textContent = '--';
            if (els.drilldownUser) els.drilldownUser.textContent = '--';
            if (els.drilldownEventId) els.drilldownEventId.textContent = '--';
            if (els.drilldownJson) els.drilldownJson.textContent = '{}';
            if (els.drilldownFields) els.drilldownFields.textContent = 'Select a search result.';
            return;
        }

        if (els.drilldownHost) els.drilldownHost.textContent = record.host || '--';
        if (els.drilldownSourcetype) els.drilldownSourcetype.textContent = record.sourcetype || '--';
        if (els.drilldownUser) els.drilldownUser.textContent = record.user || '--';
        if (els.drilldownEventId) els.drilldownEventId.textContent = record.event_id || '--';
        if (els.drilldownJson) els.drilldownJson.textContent = JSON.stringify(record, null, 2);
        if (els.drilldownFields) els.drilldownFields.textContent = fieldsText(record);
    }

    function renderResults(payload, query) {
        const results = Array.isArray(payload.results) ? payload.results.map(normalizeLog) : [];
        state.results = results;
        state.totalMatches = payload.total_matches || results.length;
        state.query = query;

        if (els.metricResults) els.metricResults.textContent = formatNumber(state.totalMatches);
        if (els.metricResultsNote) els.metricResultsNote.textContent = 'Matches for current KQL pivot';
        if (els.resultsNote) els.resultsNote.textContent = results.length + ' of ' + formatNumber(state.totalMatches) + ' events shown';

        if (els.searchPanel) {
            els.searchPanel.textContent = 'ResponseGridLogs\n| where ' + query + '\n\n'
                + (results.length
                    ? results.map(function (item) {
                        return formatTimestamp(item.timestamp) + ' ' + item.host + ' ' + item.sourcetype + ' ' + item.event;
                    }).join('\n')
                    : 'No matching events found.');
        }

        if (els.statsPanel) {
            const severityLines = Object.entries(payload.severity_breakdown || {})
                .map(function ([severity, count]) {
                    return severity + ' ' + count;
                })
                .join('\n');

            els.statsPanel.textContent = 'query=' + query
                + '\nscenario=' + (payload.scenario_id || SCENARIO_ID)
                + '\nresults=' + formatNumber(payload.total_matches || results.length)
                + '\n\n' + (severityLines || 'no severity breakdown available');
        }

        if (els.rawPanel) {
            els.rawPanel.textContent = results.map(function (item) {
                return JSON.stringify(item);
            }).join('\n') || 'No raw events available for this query.';
        }

        renderTimeline();
        updateRiskScore();

        if (!els.resultsBody) return;

        if (!results.length) {
            els.resultsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">No matching events found for this query.</td></tr>';
            updateDrilldown(null);
            return;
        }

        els.resultsBody.innerHTML = results.map(function (item, index) {
            return '<tr data-result-index="' + index + '" tabindex="0">'
                + '<td class="mono">' + escapeHtml(formatTimestamp(item.timestamp)) + '</td>'
                + '<td class="mono">' + escapeHtml(item.host) + '</td>'
                + '<td>' + escapeHtml(item.sourcetype) + '</td>'
                + '<td class="mono">' + escapeHtml(item.event_id || '--') + '</td>'
                + '<td class="mono">' + escapeHtml(item.event || '--') + '</td>'
                + '</tr>';
        }).join('');

        Array.from(els.resultsBody.querySelectorAll('[data-result-index]')).forEach(function (row) {
            row.addEventListener('click', function () {
                updateDrilldown(results[Number(row.dataset.resultIndex)]);
            });
            row.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    row.click();
                }
            });
        });

        updateDrilldown(results[0]);
    }

    function renderAlerts(alerts) {
        state.alerts = alerts;
        updateRiskScore();

        if (!els.alertsBody) return;

        if (!alerts.length) {
            els.alertsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">No Scenario B alerts are currently queued.</td></tr>';
            return;
        }

        els.alertsBody.innerHTML = alerts.map(function (alert, index) {
            const meta = severityMeta(alert.severity);
            return '<tr class="queue-row ' + meta.row + '">'
                + '<td><span class="status-badge ' + meta.badge + '">' + escapeHtml(meta.label) + '</span></td>'
                + '<td>' + escapeHtml(alert.title || 'Untitled alert') + '</td>'
                + '<td class="mono">' + escapeHtml(alert.host || '--') + '</td>'
                + '<td>' + escapeHtml(alert.technique_id || '--') + '</td>'
                + '<td><button class="btn btn-secondary" type="button" data-alert-index="' + index + '">Pivot</button></td>'
                + '</tr>';
        }).join('');

        Array.from(els.alertsBody.querySelectorAll('[data-alert-index]')).forEach(function (button) {
            button.addEventListener('click', function () {
                const alert = alerts[Number(button.dataset.alertIndex)];
                const query = alertQuery(alert);
                if (state.exerciseStarted && !state.exerciseComplete) {
                    state.alertsPivoted += 1;
                    renderExerciseStatus();
                }
                if (els.searchInput) els.searchInput.value = query;
                runSearch(query);
            });
        });
    }

    async function hydrateAlerts() {
        try {
            const payload = await window.IRSPApi.getAlerts({ scenario: SCENARIO_ID, limit: 10 });
            const alerts = Array.isArray(payload.items) ? payload.items : [];
            const highPriority = alerts.filter(function (item) {
                return ['critical', 'high'].includes(String(item.severity || '').toLowerCase());
            });
            const escalated = alerts.filter(function (item) {
                return String(item.status || '').toLowerCase() === 'escalated';
            });

            renderAlerts(alerts);

            if (els.metricAlerts) els.metricAlerts.textContent = String(highPriority.length).padStart(2, '0');
            if (els.metricAlertsNote) els.metricAlertsNote.textContent = alerts.length + ' alert' + (alerts.length === 1 ? '' : 's') + ' in Scenario B queue';
            if (els.notableCount) els.notableCount.textContent = highPriority.length + ' Notable';
            if (els.escalatedCount) els.escalatedCount.textContent = escalated.length + ' Escalated';
        } catch (error) {
            if (els.alertsBody) {
                els.alertsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">Scenario B alerts are unavailable.</td></tr>';
            }
        }
    }

    async function hydrateEventCount() {
        try {
            const payload = await window.IRSPApi.search({ scenario: SCENARIO_ID, q: '' });
            const count = payload.total_matches || (payload.results || []).length;
            if (els.metricEvents) els.metricEvents.textContent = formatNumber(count);
            if (els.logCount) els.logCount.textContent = formatNumber(count);
            if (els.metricEventsNote) els.metricEventsNote.textContent = 'Events available for Scenario B';
            if (els.sourceStatus) els.sourceStatus.textContent = 'Live telemetry connected';
            if (els.consoleSourceStatus) els.consoleSourceStatus.textContent = 'Live telemetry connected';
        } catch (error) {
            if (els.sourceStatus) els.sourceStatus.textContent = 'Telemetry unavailable';
            if (els.consoleSourceStatus) els.consoleSourceStatus.textContent = 'Telemetry unavailable';
        }
    }

    async function runSearch(queryValue) {
        const query = String(queryValue || (els.searchInput && els.searchInput.value) || DEFAULT_QUERY).trim();
        if (!query) return;

        setBusy(true);
        if (els.searchStatus) els.searchStatus.textContent = 'Running Scenario B search...';

        try {
            if (state.exerciseStarted && !state.exerciseComplete) {
                state.searchesRun += 1;
            }
            const payload = await window.IRSPApi.search({ scenario: SCENARIO_ID, q: query });
            renderResults(payload, query);
            if (els.searchStatus) {
                els.searchStatus.textContent = 'Search completed at ' + IRSP.getTimestamp() + ' with ' + formatNumber(payload.total_matches || 0) + ' matched events.';
            }
        } catch (error) {
            if (els.searchStatus) els.searchStatus.textContent = 'Search unavailable. Check the local telemetry service.';
            if (els.resultsBody) {
                els.resultsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">Search failed for this query.</td></tr>';
            }
        } finally {
            setBusy(false);
            if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') {
                window.IRSP.refreshIcons();
            }
        }
    }

    function bindControls() {
        if (els.runSearch) {
            els.runSearch.addEventListener('click', function () {
                runSearch();
            });
        }

        if (els.startExercise) {
            els.startExercise.addEventListener('click', function () {
                startExercise();
            });
        }

        if (els.submitExercise) {
            els.submitExercise.addEventListener('click', function () {
                finalizeExercise('submission');
            });
        }

        if (els.refreshLogs) {
            els.refreshLogs.addEventListener('click', function () {
                hydrateAlerts();
                hydrateEventCount();
                runSearch();
            });
        }

        if (els.searchInput) {
            els.searchInput.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    runSearch();
                }
            });
        }

        Array.from(document.querySelectorAll('[data-scenario-b-query]')).forEach(function (button) {
            button.addEventListener('click', function () {
                Array.from(document.querySelectorAll('[data-scenario-b-query]')).forEach(function (item) {
                    item.classList.remove('active');
                });
                button.classList.add('active');
                if (els.searchInput) els.searchInput.value = button.dataset.scenarioBQuery || '';
                runSearch(button.dataset.scenarioBQuery || '');
            });
        });
    }

    bindControls();
    renderExerciseStatus();
    renderRemediationActions();
    renderTimeline();
    updateRiskScore();
    hydrateAlerts();
    hydrateEventCount();
    runSearch(DEFAULT_QUERY);
})();
