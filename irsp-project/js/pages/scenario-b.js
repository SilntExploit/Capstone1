(function () {
    'use strict';

    const DATA_URL = 'mock-data/scenario-b-investigation.json';
    const STATE_KEY = 'irsp-scenario-b-state';
    const REPORT_KEY = 'irsp-scenario-b-report';

    const workspaceState = safeWorkspaceState();
    startTimer('timer', 1800, { storageKey: 'irsp-scenario-b-timer' });

    const subtitle = document.getElementById('scenario-b-subtitle');
    const workspaceName = document.getElementById('scenario-b-workspace-name');
    const workspaceVm = document.getElementById('scenario-b-workspace-vm');
    const workspaceStarted = document.getElementById('scenario-b-workspace-started');
    const workspaceStatus = document.getElementById('scenario-b-workspace-status');
    const workspaceNote = document.getElementById('scenario-b-workspace-note');
    const environmentCopy = document.getElementById('scenario-b-environment-copy');
    const servicesCopy = document.getElementById('scenario-b-services-copy');

    const iocCount = document.getElementById('scenario-b-ioc-count');
    const iocNote = document.getElementById('scenario-b-ioc-note');
    const completionValue = document.getElementById('scenario-b-completion-value');
    const completionNote = document.getElementById('scenario-b-completion-note');
    const targetValue = document.getElementById('scenario-b-target-value');
    const targetNote = document.getElementById('scenario-b-target-note');

    const alertsContainer = document.getElementById('scenario-b-alerts');
    const evidenceBody = document.getElementById('scenario-b-evidence-body');
    const timelineList = document.getElementById('scenario-b-timeline-list');
    const logsBody = document.getElementById('scenario-b-logs-body');
    const commsBox = document.getElementById('scenario-b-comms-box');

    const queryInput = document.getElementById('scenario-b-query-input');
    const runQueryButton = document.getElementById('scenario-b-run-query');
    const searchPanel = document.getElementById('scenario-b-search-panel');
    const rawPanel = document.getElementById('scenario-b-raw-panel');
    const timelinePanel = document.getElementById('scenario-b-timeline-panel');
    const queryStatus = document.getElementById('scenario-b-query-status');
    const queryButtons = Array.from(document.querySelectorAll('[data-scenario-b-query]'));
    const queryShellCard = runQueryButton ? runQueryButton.closest('.card') : null;

    const detailIndicator = document.getElementById('scenario-b-detail-indicator');
    const detailType = document.getElementById('scenario-b-detail-type');
    const detailSeverity = document.getElementById('scenario-b-detail-severity');
    const detailStatus = document.getElementById('scenario-b-detail-status');
    const detailSummary = document.getElementById('scenario-b-detail-summary');
    const detailJson = document.getElementById('scenario-b-detail-json');
    const detailNote = document.getElementById('scenario-b-detail-note-panel');
    const evidenceNote = document.getElementById('scenario-b-evidence-note');

    const progressText = document.getElementById('scenario-b-progress-text');
    const progressFill = document.getElementById('scenario-b-progress-fill');
    const objectiveNodes = Array.from(document.querySelectorAll('[data-objective]'));

    const containButton = document.getElementById('scenario-b-action-contain');
    const queryButton = document.getElementById('scenario-b-action-query');
    const removeButton = document.getElementById('scenario-b-action-remove');
    const resetButton = document.getElementById('scenario-b-action-reset');

    let dataset = null;
    let investigationState = safeReadState();

    function safeWorkspaceState() {
        try {
            return JSON.parse(localStorage.getItem('irsp-active-workspace')) || {};
        } catch (error) {
            return {};
        }
    }

    function safeReadState() {
        try {
            return JSON.parse(localStorage.getItem(STATE_KEY)) || {
                viewedEvidence: [],
                activeQueryId: 'credential-dumping',
                initialVectorConfirmed: false,
                timelineBuilt: false,
                hostContained: false,
                persistenceRemoved: false
            };
        } catch (error) {
            return {
                viewedEvidence: [],
                activeQueryId: 'credential-dumping',
                initialVectorConfirmed: false,
                timelineBuilt: false,
                hostContained: false,
                persistenceRemoved: false
            };
        }
    }

    function persistState() {
        localStorage.setItem(STATE_KEY, JSON.stringify(investigationState));
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatWorkspaceStart(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Evidence pack loaded locally';
        return `Loaded ${date.toLocaleString()}`;
    }

    function severityBadgeClass(severity) {
        return severity === 'Critical' ? 'red' : severity === 'High' ? 'yellow' : 'blue';
    }

    function actionButtonClass(type, completed) {
        if (completed) return 'btn btn-secondary';
        return type === 'contain' ? 'btn btn-danger' : 'btn btn-secondary';
    }

    function markObjective(key, complete) {
        const node = objectiveNodes.find(function (item) {
            return item.dataset.objective === key;
        });
        if (!node) return;

        node.classList.toggle('complete', complete);
        const icon = node.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', complete ? 'check-circle' : 'circle');
            icon.style.color = complete ? 'var(--accent-green)' : 'var(--text-dim)';
        }
    }

    function buildReport() {
        const evidenceCount = Array.isArray(dataset.evidence) ? dataset.evidence.length : 0;
        const mappedAll = evidenceCount > 0 && investigationState.viewedEvidence.length >= evidenceCount;
        const completionMap = {
            entry: investigationState.initialVectorConfirmed,
            map: mappedAll,
            timeline: investigationState.timelineBuilt,
            contain: investigationState.hostContained,
            remove: investigationState.persistenceRemoved
        };
        const completedCount = Object.values(completionMap).filter(Boolean).length;
        const score = Math.round((completedCount / 5) * 100);
        const status = score >= 85 ? 'Passed' : score >= 60 ? 'Needs Improvement' : 'Failed';
        const strengths = [];
        const gaps = [];

        if (completionMap.entry) strengths.push('Initial access was tied back to the phishing document and PowerShell launcher.');
        if (completionMap.map) strengths.push('All seeded IOCs were reviewed and mapped on the evidence board.');
        if (completionMap.timeline) strengths.push('The compromise timeline was reconstructed from sanitized endpoint telemetry.');
        if (completionMap.contain) strengths.push('Host containment was executed without requiring a live VM.');
        if (completionMap.remove) strengths.push('The persistence mechanism was identified and removed from the case workflow.');

        if (!completionMap.entry) gaps.push('Initial access still needs confirmation from the email and PowerShell artifacts.');
        if (!completionMap.map) gaps.push('Not all indicators have been reviewed in the evidence board.');
        if (!completionMap.timeline) gaps.push('The full incident timeline has not been assembled yet.');
        if (!completionMap.contain) gaps.push('The compromised endpoint has not been logically contained yet.');
        if (!completionMap.remove) gaps.push('Scheduled task persistence is still active in the run state.');

        return {
            id: 'live-scenario-b',
            title: 'Scenario B – Compromised Host',
            scenario: 'B',
            team: (workspaceState && (workspaceState.team || workspaceState.trainee)) || 'Local Investigation Analyst',
            date: new Date().toISOString().slice(0, 10),
            duration: currentDuration(),
            score,
            status,
            summary: 'Live Scenario B report generated from the local Windows evidence pack workflow.',
            strengths: strengths.length ? strengths : ['The evidence pack is loaded, but no major investigation objectives are complete yet.'],
            gaps: gaps.length ? gaps : ['No major investigation gaps remain in the current run.'],
            next: completionMap.remove
                ? 'Export the report and reuse this run as the benchmark no-VM endpoint investigation flow.'
                : 'Finish containment and persistence removal before exporting the final report.',
            containment: completionMap.contain ? 92 : 58,
            investigation: completionMap.timeline ? 94 : completionMap.entry ? 78 : 56,
            comms: completionMap.map ? 86 : 70,
            feedback: {
                title: `Latest Feedback – Scenario B (${new Date().toLocaleDateString()})`,
                positives: [
                    completionMap.entry ? 'Initial access was quickly tied to the phishing document and PowerShell child process.' : 'The entry chain still needs clearer validation from the phishing artifact.',
                    completionMap.timeline ? 'Timeline reconstruction was coherent and followed the host compromise sequence cleanly.' : 'Timeline work needs one more correlation pass across the host and proxy artifacts.'
                ],
                improvements: [
                    completionMap.contain ? 'Containment was applied cleanly without losing the evidence pack context.' : 'Contain the compromised host earlier once the credential dumping event is confirmed.',
                    completionMap.remove ? 'Persistence removal sequencing is now aligned with the evidence trail.' : 'Remove the WindowsUpdate_svc persistence item after preserving the scheduled task evidence.'
                ],
                checklist: [
                    { title: 'Validate phishing-to-PowerShell chain', note: 'Confirm the initial access path from email to execution.', done: completionMap.entry },
                    { title: 'Review all seeded IOCs', note: 'Map every indicator in the evidence board.', done: completionMap.map },
                    { title: 'Contain the compromised endpoint', note: 'Perform logical host isolation from the evidence pack workflow.', done: completionMap.contain }
                ],
                nextSteps: [
                    'Practice the same run using only the raw logs panel before opening the summarized query view.',
                    'Capture the timeline first, then move into containment and persistence removal.',
                    'Use the selected evidence panel as the basis for stakeholder updates and report writeups.'
                ]
            }
        };
    }

    function persistReport() {
        localStorage.setItem(REPORT_KEY, JSON.stringify(buildReport()));
    }

    function resetScenario() {
        localStorage.removeItem(STATE_KEY);
        localStorage.removeItem(REPORT_KEY);
        localStorage.removeItem('irsp-scenario-b-evidence');
        localStorage.removeItem('irsp-scenario-b-timer');
        window.location.reload();
    }

    function currentDuration() {
        const timer = document.getElementById('timer');
        const parts = String(timer && timer.textContent || '00:00:00').split(':').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return '--:--';
        const elapsed = Math.max(0, 1800 - ((parts[0] * 3600) + (parts[1] * 60) + parts[2]));
        const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const seconds = String(elapsed % 60).padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    function renderWorkspace() {
        if (subtitle) subtitle.textContent = dataset.meta.subtitle;
        if (workspaceNote) workspaceNote.textContent = dataset.meta.workspace_note;
        if (environmentCopy) environmentCopy.textContent = dataset.meta.environment_copy;
        if (servicesCopy) servicesCopy.textContent = dataset.meta.services_copy;
        if (targetValue) targetValue.textContent = dataset.meta.target_value;
        if (targetNote) targetNote.textContent = dataset.meta.target_note;
        if (iocNote) iocNote.textContent = dataset.meta.ioc_note;

        if (workspaceName) {
            workspaceName.textContent = (workspaceState && workspaceState.workspace) || 'Windows Evidence Pack Workspace';
        }
        if (workspaceVm) {
            workspaceVm.textContent = 'Evidence Pack: ws-finance-03_sanitized_bundle';
        }
        if (workspaceStarted) {
            workspaceStarted.textContent = workspaceState && workspaceState.startedAt
                ? formatWorkspaceStart(workspaceState.startedAt)
                : 'Evidence pack loaded locally';
        }
        if (workspaceStatus) {
            workspaceStatus.textContent = 'Pack Loaded';
            workspaceStatus.className = 'status-badge green';
        }
    }

    function renderAlerts() {
        alertsContainer.innerHTML = dataset.alerts.map(function (alert) {
            const completed = (alert.action_type === 'contain' && investigationState.hostContained)
                || (alert.action_type === 'remove_persistence' && investigationState.persistenceRemoved)
                || (alert.action_type === 'investigate' && investigationState.initialVectorConfirmed);

            const label = completed
                ? (alert.action_type === 'contain' ? 'Contained' : alert.action_type === 'remove_persistence' ? 'Reviewed' : 'Investigated')
                : alert.action;

            const levelClass = alert.level === 'critical' ? '' : alert.level;

            return `
                <div class="alert-item ${levelClass}">
                    <div class="alert-info">
                        <h4>${escapeHtml(alert.title)}</h4>
                        <p>${escapeHtml(alert.description)}</p>
                    </div>
                    <button class="${actionButtonClass(alert.action_type, completed)}" type="button" data-alert-action="${escapeHtml(alert.action_type)}" ${completed ? 'disabled' : ''}>${escapeHtml(label)}</button>
                </div>
            `;
        }).join('');

        Array.from(alertsContainer.querySelectorAll('[data-alert-action]')).forEach(function (button) {
            button.addEventListener('click', function () {
                applyAction(button.dataset.alertAction);
            });
        });
    }

    function renderEvidence() {
        evidenceBody.innerHTML = dataset.evidence.map(function (item) {
            return `
                <tr data-record-id="${escapeHtml(item.record_id)}" data-indicator="${escapeHtml(item.indicator)}" data-type="${escapeHtml(item.type)}" data-severity="${escapeHtml(item.severity)}" data-status="${escapeHtml(item.status)}" data-summary="${escapeHtml(item.summary)}" data-json="${escapeHtml(item.json)}" data-note="${escapeHtml(item.note)}" tabindex="0">
                    <td>${escapeHtml(item.indicator)}</td>
                    <td>${escapeHtml(item.type)}</td>
                    <td><span class="status-badge ${severityBadgeClass(item.severity)}">${escapeHtml(item.severity)}</span></td>
                    <td>${escapeHtml(item.status)}</td>
                </tr>
            `;
        }).join('');

        initRecordExplorer({
            rowsSelector: '#scenario-b-evidence-board tbody tr',
            storageKey: 'irsp-scenario-b-evidence',
            onSelect(row) {
                detailIndicator.textContent = row.dataset.indicator || '--';
                detailType.textContent = row.dataset.type || '--';
                detailSeverity.textContent = row.dataset.severity || '--';
                detailStatus.textContent = row.dataset.status || '--';
                detailSummary.textContent = row.dataset.summary || '';
                detailJson.textContent = row.dataset.json || '';
                detailNote.textContent = row.dataset.note || '';
                detailSeverity.style.color = row.dataset.severity === 'Critical' ? 'var(--accent-red)' : 'var(--accent-yellow)';

                if (!investigationState.viewedEvidence.includes(row.dataset.recordId)) {
                    investigationState.viewedEvidence.push(row.dataset.recordId);
                }
                if (row.dataset.recordId === 'ioc-file') {
                    investigationState.initialVectorConfirmed = true;
                }
                evidenceNote.textContent = `${row.dataset.indicator} selected for deeper review.`;
                persistState();
                renderDerivedState();
            }
        });
    }

    function renderTimeline() {
        timelineList.innerHTML = dataset.timeline.map(function (item) {
            return `
                <div class="timeline-item">
                    <span class="time">${escapeHtml(item.time)}</span>
                    <p class="desc">${escapeHtml(item.desc)}</p>
                </div>
            `;
        }).join('');
    }

    function renderLogs() {
        logsBody.innerHTML = dataset.logs.map(function (item) {
            return `
                <tr>
                    <td>${escapeHtml(item.time)}</td>
                    <td>${escapeHtml(item.host)}</td>
                    <td>${escapeHtml(item.sourcetype)}</td>
                    <td>${escapeHtml(item.event)}</td>
                </tr>
            `;
        }).join('');
    }

    function renderComms() {
        const messages = dataset.comms.base.slice();

        if (investigationState.hostContained) {
            messages.push({ sender: 'IR Lead', message: 'Host isolation applied logically inside the evidence-pack workflow.' });
        }
        if (investigationState.persistenceRemoved) {
            messages.push({ sender: 'Forensics', message: 'WindowsUpdate_svc has been marked removed after evidence review.' });
        }
        if (investigationState.timelineBuilt) {
            messages.push({ sender: 'SOC', message: 'Timeline is complete from email delivery through persistence.' });
        }

        commsBox.innerHTML = messages.map(function (item) {
            return `<div class="msg"><span class="msg-sender">${escapeHtml(item.sender)}:</span> ${escapeHtml(item.message)}</div>`;
        }).join('');
    }

    function renderQuery(queryId) {
        const profile = dataset.queries.find(function (item) {
            return item.id === queryId;
        }) || dataset.queries[0];

        investigationState.activeQueryId = profile.id;
        if (profile.id === 'initial-access') {
            investigationState.initialVectorConfirmed = true;
        }
        if (profile.id === 'credential-dumping') {
            investigationState.timelineBuilt = true;
        }

        queryInput.value = profile.query;
        searchPanel.textContent = profile.search;
        rawPanel.textContent = profile.raw;
        timelinePanel.textContent = profile.timeline;
        queryStatus.textContent = profile.status;

        queryButtons.forEach(function (button, index) {
            const linkedProfile = dataset.queries[index];
            const isActive = linkedProfile && linkedProfile.id === profile.id;
            button.classList.toggle('active', isActive);
            if (linkedProfile) {
                button.textContent = linkedProfile.label;
                button.dataset.queryId = linkedProfile.id;
            }
        });

        persistState();
        renderDerivedState();
    }

    function tokenizeQuery(query) {
        return String(query || '')
            .toLowerCase()
            .split(/[^a-z0-9_.-]+/i)
            .map(function (token) {
                return token.trim();
            })
            .filter(function (token) {
                return token.length >= 2;
            });
    }

    function scoreText(text, tokens) {
        const haystack = String(text || '').toLowerCase();
        return tokens.reduce(function (score, token) {
            return score + (haystack.includes(token) ? 1 : 0);
        }, 0);
    }

    function buildAdhocQueryResult(query) {
        const tokens = tokenizeQuery(query);
        if (!tokens.length) {
            return null;
        }

        const matchedLogs = dataset.logs.filter(function (item) {
            const text = `${item.time} ${item.host} ${item.sourcetype} ${item.event}`;
            return scoreText(text, tokens) > 0;
        });

        const matchedEvidence = dataset.evidence.filter(function (item) {
            const text = `${item.indicator} ${item.type} ${item.status} ${item.summary} ${item.note}`;
            return scoreText(text, tokens) > 0;
        });

        const matchedTimeline = dataset.timeline.filter(function (item) {
            return scoreText(`${item.time} ${item.desc}`, tokens) > 0;
        });

        const combined = matchedLogs.length + matchedEvidence.length + matchedTimeline.length;
        if (!combined) {
            return {
                search: `ResponseGridLogs\n| search ${query}\n\nNo matching evidence was found in the local Scenario B pack for that query.`,
                raw: 'No matching raw records found.',
                timeline: 'No matching timeline checkpoints found.',
                status: `Query executed at ${IRSP.getTimestamp()}. No matches were found for: ${query}`
            };
        }

        const searchLines = matchedLogs.slice(0, 6).map(function (item) {
            return `${item.time} ${item.host} ${item.sourcetype} ${item.event}`;
        });
        const rawLines = matchedEvidence.slice(0, 4).map(function (item) {
            return `${item.indicator} | ${item.type} | ${item.status} | ${item.summary}`;
        });
        const timelineLines = matchedTimeline.slice(0, 5).map(function (item) {
            return `${item.time} ${item.desc}`;
        });

        if (!investigationState.timelineBuilt && matchedLogs.some(function (item) {
            return /procdump|powershell|schtasks/i.test(item.event);
        })) {
            investigationState.timelineBuilt = true;
        }

        if (!investigationState.initialVectorConfirmed && matchedEvidence.some(function (item) {
            return item.record_id === 'ioc-file';
        })) {
            investigationState.initialVectorConfirmed = true;
        }

        persistState();
        renderDerivedState();

        return {
            search: `ResponseGridLogs\n| search ${query}\n\n${searchLines.join('\n') || 'No matching log lines.'}`,
            raw: rawLines.join('\n') || 'No matching evidence records.',
            timeline: timelineLines.join('\n') || 'No matching timeline checkpoints.',
            status: `Query executed at ${IRSP.getTimestamp()}. Found ${combined} matching record${combined === 1 ? '' : 's'} for: ${query}`
        };
    }

    function focusQueryShell(message) {
        if (message) {
            queryStatus.textContent = message;
        }

        if (queryShellCard) {
            queryShellCard.style.outline = '2px solid var(--accent-blue)';
            queryShellCard.style.outlineOffset = '0';
            queryShellCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

            window.setTimeout(function () {
                queryShellCard.style.outline = '';
                queryShellCard.style.outlineOffset = '';
            }, 1400);
        }
    }

    function nextQuickQueryId() {
        if (!dataset || !Array.isArray(dataset.queries) || !dataset.queries.length) {
            return 'credential-dumping';
        }

        if (!investigationState.initialVectorConfirmed) {
            return 'initial-access';
        }

        if (!investigationState.timelineBuilt) {
            return 'credential-dumping';
        }

        if (!investigationState.persistenceRemoved) {
            return 'persistence';
        }

        const currentIndex = dataset.queries.findIndex(function (item) {
            return item.id === investigationState.activeQueryId;
        });
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % dataset.queries.length : 0;
        return dataset.queries[nextIndex].id;
    }

    function renderDerivedState() {
        const evidenceCount = dataset.evidence.length;
        const mappedAll = investigationState.viewedEvidence.length >= evidenceCount;
        const completionMap = {
            entry: investigationState.initialVectorConfirmed,
            map: mappedAll,
            timeline: investigationState.timelineBuilt,
            contain: investigationState.hostContained,
            remove: investigationState.persistenceRemoved
        };
        const completedCount = Object.values(completionMap).filter(Boolean).length;
        const percent = Math.round((completedCount / 5) * 100);

        markObjective('entry', completionMap.entry);
        markObjective('map', completionMap.map);
        markObjective('timeline', completionMap.timeline);
        markObjective('contain', completionMap.contain);
        markObjective('remove', completionMap.remove);

        completionValue.textContent = `${percent}%`;
        completionNote.textContent = completionMap.remove
            ? 'Endpoint compromise chain is documented, contained, and remediated from the evidence pack.'
            : 'Work through evidence mapping, timeline correlation, host containment, and persistence removal.';
        progressText.textContent = `Completion: ${percent}%`;
        progressFill.style.width = `${percent}%`;
        iocCount.textContent = String(dataset.evidence.length).padStart(2, '0');

        containButton.disabled = completionMap.contain;
        containButton.textContent = completionMap.contain ? 'Host Isolated' : 'Isolate WS-FINANCE-03';
        removeButton.disabled = completionMap.remove;
        removeButton.textContent = completionMap.remove ? 'Scheduled Task Removed' : 'Remove Scheduled Task';

        persistReport();
        IRSP.refreshIcons();
    }

    function applyAction(action) {
        if (action === 'investigate') {
            renderQuery('initial-access');
            return;
        }

        if (action === 'contain') {
            investigationState.hostContained = true;
        }

        if (action === 'remove_persistence') {
            investigationState.persistenceRemoved = true;
            investigationState.timelineBuilt = true;
        }

        persistState();
        renderAlerts();
        renderComms();
        renderDerivedState();
    }

    async function loadData() {
        dataset = await IRSP.fetchJSON(DATA_URL);
        renderWorkspace();
        renderAlerts();
        renderEvidence();
        renderTimeline();
        renderLogs();
        renderComms();
        renderQuery(investigationState.activeQueryId || 'credential-dumping');
        renderDerivedState();
    }

    runQueryButton.addEventListener('click', function () {
        const query = queryInput.value.trim();
        const match = dataset.queries.find(function (item) {
            return item.query === query;
        });

        if (match) {
            renderQuery(match.id);
            focusQueryShell(`Preset query executed at ${IRSP.getTimestamp()}: ${match.label}`);
            return;
        }

        const adHoc = buildAdhocQueryResult(query);
        if (!adHoc) {
            focusQueryShell('Enter a keyword like powershell, lsass, invoice, schtasks, or 203.0.113.42.');
            return;
        }

        searchPanel.textContent = adHoc.search;
        rawPanel.textContent = adHoc.raw;
        timelinePanel.textContent = adHoc.timeline;
        queryStatus.textContent = adHoc.status;
        queryButtons.forEach(function (button) {
            button.classList.remove('active');
        });
        focusQueryShell(adHoc.status);
    });

    queryInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            runQueryButton.click();
        }
    });

    queryButtons.forEach(function (button, index) {
        button.addEventListener('click', function () {
            const profile = dataset.queries[index];
            if (!profile) return;
            renderQuery(profile.id);
        });
    });

    containButton.addEventListener('click', function () {
        applyAction('contain');
        renderAlerts();
        renderComms();
    });

    queryButton.addEventListener('click', function () {
        const nextId = nextQuickQueryId();
        renderQuery(nextId);

        const labelMap = {
            'initial-access': 'Query shell pivoted to initial access evidence.',
            'credential-dumping': 'Query shell pivoted to credential dumping correlation.',
            'persistence': 'Query shell pivoted to persistence review.'
        };

        focusQueryShell(labelMap[nextId] || 'Query shell updated.');
    });

    removeButton.addEventListener('click', function () {
        applyAction('remove_persistence');
        renderAlerts();
        renderComms();
    });

    resetButton.addEventListener('click', function () {
        resetScenario();
    });

    loadData().catch(function (error) {
        queryStatus.textContent = error.message || 'Unable to load the Windows evidence pack.';
    });
})();
