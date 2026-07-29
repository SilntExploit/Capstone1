(function () {
    'use strict';

    const SCENARIO_ID = 'scenario-b';
    const REPORT_KEY = 'irsp-scenario-b-report';
    const DEFAULT_QUERY = 'host in ("192.168.32.130", "192.168.32.129", "DESKTOP-GRQ4G1E") or sourcetype has "sysmon" or sourcetype has "security" or sourcetype has "taskscheduler"';
    const ATTACK_CLEANUP_EXCLUSION = ' and not event has "cleanup.ps1" and not event has "Remove-Item" and not event has "Remove-ItemProperty" and not event has "Remove-LocalUser" and not event has "Disable-PSRemoting" and not event has "Set-NetFirewallProfile" and not event has "Remove-NetFirewallRule" and not event has "Set-ExecutionPolicy" and not event has "RemoteSigned"';
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
        drilldownTask: document.getElementById('scenario-b-drilldown-task'),
        drilldownProcess: document.getElementById('scenario-b-drilldown-process'),
        drilldownParent: document.getElementById('scenario-b-drilldown-parent'),
        drilldownJson: document.getElementById('scenario-b-drilldown-json'),
        drilldownFields: document.getElementById('scenario-b-drilldown-fields'),
        labProgress: document.getElementById('scenario-b-lab-progress'),
        labFeedback: document.getElementById('scenario-b-lab-feedback'),
        reportSummary: document.getElementById('scenario-b-report-summary'),
        completionStatus: document.getElementById('scenario-b-completion-status')
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
        telemetryConnected: false,
        completionReason: ''
    };

    const REMEDIATION_ACTIONS = [
        {
            id: 'collect-evidence',
            title: 'Preserve investigation evidence',
            detail: 'Review the attack events and the cleanup events before clearing artifacts so the case can be explained later.',
            validation: 'Validate with event drilldown fields, PowerShell history references, and selected raw records.',
            query: 'event has "ConsoleHost_history" or event has "PowerShell history" or event has "Get-ExecutionPolicy" or event has "Get-MpComputerStatus" or event has "Verification"'
        },
        {
            id: 'restrict-remote-admin',
            title: 'Disable remote administration paths',
            detail: 'Confirm remoting was shut down after investigation so the endpoint is not left reachable by WinRM or remote command channels.',
            validation: 'Pivot on Disable-PSRemoting, WinRM service changes, Stop-Service, and Set-Service evidence.',
            query: 'event has "Disable-PSRemoting" or event has "WinRM" or event has "Stop-Service" or event has "Set-Service"'
        },
        {
            id: 'remove-persistence',
            title: 'Remove persistence mechanisms',
            detail: 'Verify scheduled task cleanup and startup persistence removal after the suspicious on-logon or startup task activity.',
            validation: 'Pivot on task removal, scheduled task review, Task Scheduler telemetry, and startup task names.',
            query: 'event has "Unregister-ScheduledTask" or event has "schtasks" or event has "T1053" or event has "Scheduled Task" or event has "Task Scheduler" or sourcetype has "taskscheduler"'
        },
        {
            id: 'restore-protection',
            title: 'Restore endpoint protections',
            detail: 'Confirm tamper cleanup, security preference restoration, service restart, and endpoint protection status checks.',
            validation: 'Pivot on WinDefend, Get-MpComputerStatus, and endpoint protection status fields after remediation.',
            query: 'event has "WinDefend" or event has "Get-MpComputerStatus" or event has "RealTimeProtectionEnabled" or event has "AntivirusEnabled"'
        },
        {
            id: 'rotate-credentials',
            title: 'Remove unauthorized local users',
            detail: 'Validate hidden or test local users were reviewed and removed from privileged groups before closure.',
            validation: 'Pivot on local user removal, group membership cleanup, net user activity, and suspicious user names.',
            query: 'event has "Remove-LocalUser" or event has "Remove-LocalGroupMember" or event has "Get-LocalUser" or event has "net user" or event has "hiddenuser" or event has "testuser"'
        },
        {
            id: 'validate-clean-state',
            title: 'Validate clean endpoint state',
            detail: 'Confirm artifacts, registry hijacks, firewall state, remoting state, and execution policy were restored after containment.',
            validation: 'Pivot on file removal, firewall restore, registry cleanup, execution-policy restore, and final verification logs.',
            query: 'event has "Remove-Item" or event has "Remove-ItemProperty" or event has "Set-NetFirewallProfile" or event has "Remove-NetFirewallRule" or event has "Set-ExecutionPolicy" or event has "RemoteSigned"'
        }
    ];

    const LAB_STEPS = [
        {
            title: 'Confirm endpoint telemetry',
            expected: 'Endpoint logs are available and the host activity search returns events.',
            metric: function () {
                return state.telemetryConnected || state.totalMatches > 0;
            },
            feedback: 'Refresh or run Host Activity until the endpoint telemetry count is visible.'
        },
        {
            title: 'Triage high-priority alerts',
            expected: 'Pivot on multiple Scenario B alerts before deciding on containment.',
            metric: function () {
                return state.alertsPivoted >= 3;
            },
            feedback: 'Pivot on at least three alert rows to prove the investigation was alert-driven.'
        },
        {
            title: 'Build the attack timeline',
            expected: 'Use KQL-style filters to show initial access, execution, persistence, privilege escalation, defense evasion, credential access, and impact evidence.',
            metric: function () {
                return getObservedPhases().filter(function (phase) {
                    return phase !== 'Recovery / Remediation';
                }).length >= 4;
            },
            feedback: 'Use the attack-stage chips until the timeline covers at least four attack phases.'
        },
        {
            title: 'Map the incident to MITRE ATT&CK',
            expected: 'Explain the compromise with techniques such as PowerShell execution, scheduled task persistence, UAC bypass, defense evasion, credential access, staging, and impact.',
            metric: function () {
                return state.alertsPivoted >= 4 || getObservedPhases().length >= 5;
            },
            feedback: 'Pivot across more alert types so the final report has ATT&CK technique coverage.'
        },
        {
            title: 'Contain remote administration',
            expected: 'Validate remoting shutdown evidence before closing containment.',
            metric: function () {
                return state.remediations['restrict-remote-admin'] === 'validated';
            },
            feedback: 'Run the remote lockdown response action and confirm WinRM/remoting evidence.'
        },
        {
            title: 'Remove persistence and unauthorized access',
            expected: 'Validate scheduled task cleanup and unauthorized local-user cleanup.',
            metric: function () {
                return state.remediations['remove-persistence'] === 'validated'
                    && state.remediations['rotate-credentials'] === 'validated';
            },
            feedback: 'Validate both persistence removal and unauthorized local-user cleanup.'
        },
        {
            title: 'Restore protections and clean state',
            expected: 'Validate endpoint protection restore, policy restore, artifact cleanup, and final clean-state evidence.',
            metric: function () {
                return state.remediations['restore-protection'] === 'validated'
                    && state.remediations['validate-clean-state'] === 'validated';
            },
            feedback: 'Validate protection restore and clean-state checks before submitting.'
        },
        {
            title: 'Submit the incident report',
            expected: 'Submit before the timer expires and explain the score using actions, pivots, searches, timeline coverage, and time remaining.',
            metric: function () {
                return state.exerciseComplete;
            },
            feedback: 'Submit the incident once the response steps are validated.'
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

        if (/remove-item|remove-localuser|remove-localgroupmember|unregister-scheduledtask|remove-itemproperty|set-netfirewallprofile|remove-netfirewallrule|disable-psremoting|set-executionpolicy|remotesigned|windefend|get-mpcomputerstatus|get-executionpolicy/.test(haystack)) return 'Recovery / Remediation';
        if (/phish|invoice|attachment|xlsm|executionpolicy|hidden user|net user|\/add|\/active:yes/.test(haystack)) return 'Initial Access';
        if (/powershell|invoke|cmdlet|process create|process_create|downloadfile|webclient|license\.txt/.test(haystack)) return 'Execution';
        if (/scheduled task|taskscheduler|task scheduler|startup script|schtasks|t1053_005|onlogon|onstartup/.test(haystack)) return 'Persistence';
        if (/fodhelper|computerdefaults|eventvwr|mscfile|ms-settings|delegateexecute|uac|privilege/.test(haystack)) return 'Privilege Escalation';
        if (/defender|security service|tamper|disable|set-mppreference|disableioav|disablerealtime|disablescriptscanning|controlledfolderaccess/.test(haystack)) return 'Defense Evasion';
        if (/credential|password|lsass|procdump|registry|history/.test(haystack)) return 'Credential Access';
        if (/ipconfig|tasklist|systeminfo|netstat|whoami|discovery/.test(haystack)) return 'Discovery';
        if (/winrm|invoke-command|remote|rdp|ssh/.test(haystack)) return 'Lateral Movement';
        if (/compress|archive|exfil|user-agent|tls|outbound|c2|staged/.test(haystack)) return 'Collection / C2 / Exfiltration';
        if (/cpu|ransom|note|read_me|t1491|notepad|art-t1491/.test(haystack)) return 'Impact';
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
            else if (phase === 'Privilege Escalation' || phase === 'Impact' || phase === 'Recovery / Remediation') score += 12;
            else if (phase === 'Execution' || phase === 'Initial Access') score += 8;
        });

        return { score: score, phases: phases };
    }

    function getObservedPhases() {
        return Array.from(new Set(state.results.map(classifyPhase))).filter(function (phase) {
            return phase && phase !== 'Endpoint Activity';
        });
    }

    function getValidatedActionCount() {
        return Object.values(state.remediations).filter(function (status) {
            return status === 'validated';
        }).length;
    }

    function getCompletedLabSteps() {
        return LAB_STEPS.filter(function (step) {
            return step.metric();
        });
    }

    function getOpenLabSteps() {
        return LAB_STEPS.filter(function (step) {
            return !step.metric();
        });
    }

    function formatScenarioDuration() {
        return formatDuration(EXERCISE_SECONDS - state.secondsRemaining);
    }

    function reportStatus(score) {
        if (score >= 80) return 'Passed';
        if (score >= 60) return 'Needs Improvement';
        return 'Failed';
    }

    function buildScenarioReport(reason) {
        const score = calculateFinalScore();
        const completedSteps = getCompletedLabSteps();
        const openSteps = getOpenLabSteps();
        const phases = getObservedPhases();
        const validatedActions = REMEDIATION_ACTIONS.filter(function (action) {
            return state.remediations[action.id] === 'validated';
        });
        const openActions = REMEDIATION_ACTIONS.filter(function (action) {
            return state.remediations[action.id] !== 'validated';
        });
        const strengths = [];
        const gaps = [];

        if (state.telemetryConnected || state.totalMatches > 0) strengths.push('Endpoint telemetry was loaded and available for investigation.');
        if (state.alertsPivoted >= 3) strengths.push('The trainee pivoted from high-priority alerts instead of relying only on broad searches.');
        if (phases.length >= 4) strengths.push('The attack-stage timeline showed coverage across multiple incident phases.');
        if (validatedActions.length >= 4) strengths.push('Multiple blue-team response actions were validated using endpoint evidence.');
        if (state.secondsRemaining > 0) strengths.push('The incident was submitted before the scenario timer expired.');

        if (!state.telemetryConnected && !state.totalMatches) gaps.push('Endpoint telemetry was not confirmed before report submission.');
        if (state.alertsPivoted < 3) gaps.push('More alert pivots are needed to prove a complete triage path.');
        if (phases.length < 4) gaps.push('The attack timeline needs more phase coverage before the report is considered complete.');
        if (openActions.length) gaps.push('Open response actions remain: ' + openActions.map(function (action) { return action.title; }).join(', ') + '.');
        if (reason === 'timeout') gaps.push('The scenario timed out before the trainee submitted the incident.');

        return {
            id: 'live-scenario-b',
            title: 'Scenario B - Endpoint Investigation',
            scenario: 'B',
            team: 'Scenario B Trainee',
            date: new Date().toISOString().slice(0, 10),
            duration: formatScenarioDuration(),
            score: score.total,
            status: reportStatus(score.total),
            summary: 'Scenario B submitted from the live endpoint investigation lab. The report captures alert pivots, KQL-style searches, attack timeline coverage, validated response actions, and time-based scoring.',
            strengths: strengths.length ? strengths : ['The trainee started the endpoint investigation workflow.'],
            gaps: gaps.length ? gaps : ['No major gaps remain in the submitted Scenario B run.'],
            next: openSteps.length
                ? 'Re-run Scenario B and focus on: ' + openSteps.slice(0, 2).map(function (step) { return step.title; }).join(', ') + '.'
                : 'Use this run as the completed Scenario B benchmark and explain the final score using the report metrics.',
            containment: Math.min(100, 45 + (validatedActions.length * 9)),
            investigation: Math.min(100, 50 + (state.alertsPivoted * 6) + (phases.length * 4)),
            comms: Math.min(100, 60 + (completedSteps.length * 5)),
            metrics: {
                actionScore: score.actionScore,
                alertScore: score.alertScore,
                searchScore: score.searchScore,
                timelineScore: score.timelineScore,
                timeScore: score.timeScore,
                validatedActions: validatedActions.length,
                totalActions: REMEDIATION_ACTIONS.length,
                alertPivots: state.alertsPivoted,
                searchesRun: state.searchesRun,
                labStepsComplete: completedSteps.length,
                totalLabSteps: LAB_STEPS.length,
                timeRemaining: formatDuration(state.secondsRemaining),
                completionReason: reason
            },
            attackPhases: phases,
            responseActions: REMEDIATION_ACTIONS.map(function (action) {
                return {
                    title: action.title,
                    status: state.remediations[action.id] === 'validated' ? 'Validated' : 'Open',
                    validation: action.validation
                };
            }),
            labSteps: LAB_STEPS.map(function (step) {
                return {
                    title: step.title,
                    status: step.metric() ? 'Complete' : 'Open',
                    expected: step.expected,
                    feedback: step.metric() ? 'Evidence accepted for this step.' : step.feedback
                };
            }),
            feedback: {
                title: 'Latest Feedback - Scenario B',
                cards: [
                    {
                        tone: score.total >= 80 ? 'success' : 'warning',
                        heading: 'Score outcome: ' + score.total + '%',
                        body: 'Final score combines response actions, alert pivots, KQL searches, timeline evidence, and remaining time.'
                    },
                    {
                        tone: phases.length >= 4 ? 'success' : 'warning',
                        heading: 'Attack timeline coverage',
                        body: phases.length ? 'Observed phases: ' + phases.join(', ') + '.' : 'No attack phases were confirmed in the final result set.'
                    },
                    {
                        tone: validatedActions.length >= 4 ? 'success' : 'warning',
                        heading: 'Response validation',
                        body: validatedActions.length + ' of ' + REMEDIATION_ACTIONS.length + ' response actions were validated from endpoint evidence.'
                    }
                ],
                nextSteps: openSteps.length
                    ? openSteps.map(function (step) { return step.feedback; }).slice(0, 4)
                    : ['Review the completed run, explain the timeline, and use the exported report as final evidence.'],
                checklist: LAB_STEPS.map(function (step) {
                    return {
                        title: step.title,
                        note: step.metric() ? 'Completed during this run.' : step.feedback,
                        done: step.metric()
                    };
                })
            }
        };
    }

    function persistScenarioReport(reason) {
        try {
            window.localStorage.setItem(REPORT_KEY, JSON.stringify(buildScenarioReport(reason)));
        } catch (error) {
            // Reporting should never interrupt the lab flow.
        }
    }

    function renderGuidedFeedback() {
        const completed = getCompletedLabSteps();
        const percent = Math.round((completed.length / LAB_STEPS.length) * 100);
        const nextStep = LAB_STEPS.find(function (step) {
            return !step.metric();
        });
        const phases = getObservedPhases();
        const score = calculateFinalScore();

        if (els.completionStatus) {
            els.completionStatus.className = 'status-badge ' + (percent >= 100 ? 'green' : percent >= 60 ? 'yellow' : 'blue');
            els.completionStatus.textContent = percent + '% complete';
        }

        if (els.labProgress) {
            els.labProgress.innerHTML = LAB_STEPS.map(function (step, index) {
                const done = step.metric();
                return '<div class="alert-item ' + (done ? 'success' : 'info') + '">'
                    + '<div class="alert-info">'
                    + '<h4>' + (index + 1) + '. ' + escapeHtml(step.title) + '</h4>'
                    + '<p>' + escapeHtml(step.expected) + '</p>'
                    + '<p class="surface-note">' + escapeHtml(done ? 'Evidence accepted for this step.' : step.feedback) + '</p>'
                    + '</div>'
                    + '<span class="status-badge ' + (done ? 'green' : 'blue') + '">' + (done ? 'Complete' : 'Open') + '</span>'
                    + '</div>';
            }).join('');
        }

        if (els.reportSummary) {
            els.reportSummary.innerHTML = [
                ['Lab Completion', percent + '% (' + completed.length + '/' + LAB_STEPS.length + ' expected steps)'],
                ['Alert Pivots', state.alertsPivoted + ' pivot(s) completed'],
                ['KQL Searches', state.searchesRun + ' search(es) run'],
                ['Validated Response Actions', getValidatedActionCount() + '/' + REMEDIATION_ACTIONS.length],
                ['Attack Phase Coverage', phases.length ? phases.join(', ') : 'No phase coverage yet'],
                ['Report Metrics', 'Actions ' + score.actionScore + ', pivots ' + score.alertScore + ', searches ' + score.searchScore + ', timeline ' + score.timelineScore + ', time ' + score.timeScore],
                ['Current Feedback', nextStep ? nextStep.feedback : 'Lab complete. Submit or review the final score and explain the incident path.']
            ].map(function (item) {
                return '<div class="key-value-item">'
                    + '<span class="key">' + escapeHtml(item[0]) + '</span>'
                    + '<span class="value">' + escapeHtml(item[1]) + '</span>'
                    + '</div>';
            }).join('');
        }

        if (els.labFeedback) {
            els.labFeedback.textContent = nextStep
                ? 'Next expected analyst action: ' + nextStep.feedback
                : 'Completed lab outcome: the trainee proved the endpoint compromise, validated containment and remediation, and produced report metrics that explain the final score.';
        }

        if (window.IRSP && typeof window.IRSP.refreshIcons === 'function') {
            window.IRSP.refreshIcons();
        }
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
                const action = REMEDIATION_ACTIONS.find(function (item) {
                    return item.id === actionId;
                });
                state.remediations[actionId] = 'queued';
                if (actionId === 'restrict-remote-admin') {
                    if (els.containmentPosture) els.containmentPosture.textContent = 'Remote Disabled';
                    if (els.analystQuestion) els.analystQuestion.textContent = 'Which log proves remoting was disabled after containment?';
                } else if (actionId === 'restore-protection') {
                    if (els.analystQuestion) els.analystQuestion.textContent = 'Which event proves endpoint protection settings were restored?';
                } else if (actionId === 'validate-clean-state') {
                    if (els.analystQuestion) els.analystQuestion.textContent = 'Which verification event proves the endpoint is clean enough to close?';
                }
                if (action && action.query) {
                    if (els.searchInput) els.searchInput.value = action.query;
                    runSearch(action.query);
                }
                renderRemediationActions();
                renderGuidedFeedback();

                window.setTimeout(function () {
                    state.remediations[actionId] = 'validated';
                    if (actionId === 'validate-clean-state' && els.containmentPosture) {
                        els.containmentPosture.textContent = 'Validated';
                    }
                    renderRemediationActions();
                    renderExerciseStatus();
                    renderGuidedFeedback();
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

        persistScenarioReport(reason);
        updateRiskScore();
        renderRemediationActions();
        renderExerciseStatus();
        renderGuidedFeedback();
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
        renderGuidedFeedback();
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
        renderGuidedFeedback();

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

        if (key.includes('powershell') || title.includes('execution policy') || title.includes('powershell')) {
            return '(process_name has "powershell" or event has "ExecutionPolicy" or event has "Bypass" or event has "DownloadFile")' + ATTACK_CLEANUP_EXCLUSION;
        }
        if (key.includes('scheduled') || key.includes('persistence') || title.includes('scheduled task')) {
            return '(event has "T1053" or event has "OnStartup" or event has "Startup" or event has "schtasks" or event has "Scheduled Task" or event has "Task Scheduler" or sourcetype has "taskscheduler" or task_name != "") and not event has "cleanup.ps1" and not event has "Unregister-ScheduledTask" and not event has "Remove-Item" and not event has "Remove-ItemProperty"';
        }
        if (key.includes('defender') || key.includes('tamper') || title.includes('protection') || title.includes('tamper')) {
            return '(event has "Set-MpPreference" or event has "DisableRealtimeMonitoring" or event has "DisableIOAVProtection" or event has "DisableScriptScanning" or event has "ControlledFolderAccess" or event has "Tamper" or event has "Disable") and not event has "cleanup.ps1" and not event has "WinDefend" and not event has "Get-MpComputerStatus" and not event has "RealTimeProtectionEnabled" and not event has "AntivirusEnabled"';
        }
        if (key.includes('fodhelper') || title.includes('fodhelper')) {
            return '(event has "fodhelper" or event has "ms-settings" or event has "DelegateExecute" or event has "HKCU\\\\Software\\\\Classes\\\\ms-settings" or event has "Registry value set" or event has "SetValue") and not event has "cleanup.ps1" and not event has "Remove-Item" and not event has "Remove-ItemProperty"';
        }
        if (key.includes('eventvwr') || title.includes('mscfile') || title.includes('event viewer')) {
            return '(event has "eventvwr" or event has "eventvwr.msc" or event has "mscfile" or event has "HKCU\\\\Software\\\\Classes\\\\mscfile" or event has "Registry value set" or event has "SetValue") and not event has "cleanup.ps1" and not event has "Remove-Item" and not event has "Remove-ItemProperty"';
        }
        if (key.includes('hidden-user') || title.includes('local user')) {
            return 'event has "net user" or event has "/add" or event has "/active:yes"';
        }
        if (key.includes('ransom') || title.includes('ransom-note') || title.includes('ransom')) {
            return '(event has "READ_ME_NOW" or event has "notepad.exe" or event has "ransom") and not event has "cleanup.ps1" and not event has "Remove-Item" and not event has "Remove-ItemProperty"';
        }
        if (key.includes('download') || key.includes('staging') || title.includes('staged')) {
            return '(event has "DownloadFile" or event has "raw.githubusercontent.com" or event has "LICENSE.txt" or event has "T1560-data-ps.zip") and not event has "cleanup.ps1" and not event has "Remove-Item" and not event has "Remove-ItemProperty"';
        }
        if (key.includes('credential') || title.includes('credential') || title.includes('password') || title.includes('history') || title.includes('lsass')) {
            return 'event has "password" or event has "credential" or event has "registry" or event has "history" or event has "lsass"';
        }
        if (key.includes('remote') || key.includes('lateral') || title.includes('remote') || title.includes('winrm')) {
            return '(event has "WinRM" or event has "Invoke-Command" or event has "remote" or event has "RDP" or event has "SSH") and not event has "cleanup.ps1" and not event has "Disable-PSRemoting" and not event has "Stop-Service" and not event has "Set-Service"';
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
            if (els.drilldownTask) els.drilldownTask.textContent = '--';
            if (els.drilldownProcess) els.drilldownProcess.textContent = '--';
            if (els.drilldownParent) els.drilldownParent.textContent = '--';
            if (els.drilldownJson) els.drilldownJson.textContent = '{}';
            if (els.drilldownFields) els.drilldownFields.textContent = 'Select a search result.';
            return;
        }

        if (els.drilldownHost) els.drilldownHost.textContent = record.host || '--';
        if (els.drilldownSourcetype) els.drilldownSourcetype.textContent = record.sourcetype || '--';
        if (els.drilldownUser) els.drilldownUser.textContent = record.user || '--';
        if (els.drilldownEventId) els.drilldownEventId.textContent = record.event_id || '--';
        if (els.drilldownTask) els.drilldownTask.textContent = record.task_name || '--';
        if (els.drilldownProcess) els.drilldownProcess.textContent = record.process_name || '--';
        if (els.drilldownParent) els.drilldownParent.textContent = record.parent_process || '--';
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
        renderGuidedFeedback();

        if (!els.resultsBody) return;

        if (!results.length) {
            els.resultsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">No matching events found for this query.</td></tr>';
            updateDrilldown(null);
            return;
        }

        els.resultsBody.innerHTML = results.map(function (item, index) {
            return '<tr class="is-selectable-row" data-result-index="' + index + '" tabindex="0">'
                + '<td class="mono">' + escapeHtml(formatTimestamp(item.timestamp)) + '</td>'
                + '<td class="mono">' + escapeHtml(item.host) + '</td>'
                + '<td>' + escapeHtml(item.sourcetype) + '</td>'
                + '<td class="mono">' + escapeHtml(item.event_id || '--') + '</td>'
                + '<td class="mono">' + escapeHtml(item.event || '--') + '</td>'
                + '</tr>';
        }).join('');

        Array.from(els.resultsBody.querySelectorAll('[data-result-index]')).forEach(function (row) {
            row.addEventListener('click', function () {
                Array.from(els.resultsBody.querySelectorAll('[data-result-index]')).forEach(function (otherRow) {
                    otherRow.classList.remove('selected');
                });
                row.classList.add('selected');
                updateDrilldown(results[Number(row.dataset.resultIndex)]);
            });
            row.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    row.click();
                }
            });
        });

        const firstRow = els.resultsBody.querySelector('[data-result-index="0"]');
        if (firstRow) firstRow.classList.add('selected');
        updateDrilldown(results[0]);
    }

    function renderAlerts(alerts) {
        state.alerts = alerts;
        updateRiskScore();
        renderGuidedFeedback();

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
                    renderGuidedFeedback();
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
            state.telemetryConnected = count > 0;
            renderGuidedFeedback();
        } catch (error) {
            if (els.sourceStatus) els.sourceStatus.textContent = 'Telemetry unavailable';
            if (els.consoleSourceStatus) els.consoleSourceStatus.textContent = 'Telemetry unavailable';
            state.telemetryConnected = false;
            renderGuidedFeedback();
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
            renderGuidedFeedback();
        } catch (error) {
            if (els.searchStatus) els.searchStatus.textContent = 'Search unavailable. Check the local telemetry service.';
            if (els.resultsBody) {
                els.resultsBody.innerHTML = '<tr><td colspan="5" class="surface-note" style="padding:0.75rem;">Search failed for this query.</td></tr>';
            }
            renderGuidedFeedback();
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
    renderGuidedFeedback();
    hydrateAlerts();
    hydrateEventCount();
    runSearch(DEFAULT_QUERY);
})();
