/* ============================================
   ResponseGrid – Incident Response Simulation Platform
   Shared JavaScript
   ============================================ */

(function () {
    'use strict';

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeCommand(value) {
        return String(value || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function safeReadJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch (error) {
            return fallback;
        }
    }

    function safeWriteJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    const IRSP = {
        storagePrefix: 'irsp-',
        settingsStorageKey: 'irsp-settings-v2',

        init() {
            this.enhanceNavMarkup();
            this.initShell();
            this.applyStoredAppearance();
            this.initIcons();
            this.initNavHighlight();
            this.initTabs();
            this.initShellPanels();
            this.initGenericToggles();
            this.initAutoResizeHelpers();
        },

        enhanceNavMarkup() {
            const links = document.querySelectorAll('.logo, .nav-item');

            links.forEach(link => {
                if (link.querySelector('.nav-label')) return;

                const label = document.createElement('span');
                label.className = 'nav-label';

                const textNodes = Array.from(link.childNodes).filter(node => {
                    return node.nodeType === Node.TEXT_NODE && node.textContent.trim();
                });

                const text = textNodes.map(node => node.textContent.trim()).join(' ');
                textNodes.forEach(node => node.remove());

                if (text) {
                    label.textContent = text;
                    link.appendChild(label);
                }
            });
        },

        initShell() {
            const nav = document.querySelector('nav');
            if (!nav || document.querySelector('.shell-toggle')) return;

            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'shell-toggle';
            toggle.setAttribute('aria-label', 'Open navigation');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<i data-lucide="menu"></i>';

            const scrim = document.createElement('div');
            scrim.className = 'nav-scrim';
            scrim.setAttribute('aria-hidden', 'true');

            const closeDrawer = () => {
                document.body.classList.remove('nav-open');
                toggle.setAttribute('aria-expanded', 'false');
            };

            toggle.addEventListener('click', () => {
                const next = !document.body.classList.contains('nav-open');
                document.body.classList.toggle('nav-open', next);
                toggle.setAttribute('aria-expanded', next ? 'true' : 'false');
            });

            scrim.addEventListener('click', closeDrawer);

            nav.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 960) {
                        closeDrawer();
                    }
                });
            });

            window.addEventListener('resize', () => {
                if (window.innerWidth > 960) {
                    closeDrawer();
                }
            });

            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    closeDrawer();
                }
            });

            document.body.appendChild(toggle);
            document.body.appendChild(scrim);
        },

        initIcons() {
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        },

        refreshIcons() {
            this.initIcons();
        },

        initNavHighlight() {
            const currentPath = (window.location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
            const normalizedPath = (currentPath.startsWith('scenario-') || currentPath === 'scenario-generic.html') ? 'active-lab.html' : currentPath;
            const navItems = document.querySelectorAll('.nav-item');

            navItems.forEach(item => {
                const href = (item.getAttribute('href') || '').toLowerCase();
                const isMatch = href === normalizedPath;

                item.classList.toggle('active', isMatch);

                if (isMatch) {
                    item.setAttribute('aria-current', 'page');
                } else {
                    item.removeAttribute('aria-current');
                }
            });
        },

        initTabs() {
            const tabGroups = document.querySelectorAll('.tabs');

            tabGroups.forEach(tabGroup => {
                const tabs = Array.from(tabGroup.querySelectorAll('.tab'));
                const container = tabGroup.parentElement || document;
                const tabContents = Array.from(container.querySelectorAll('.tab-content'));

                tabs.forEach(tab => {
                    tab.setAttribute('tabindex', tab.classList.contains('active') ? '0' : '-1');

                    const activate = () => {
                        const tabId = tab.dataset.tab;
                        if (!tabId) return;

                        tabs.forEach(t => {
                            t.classList.remove('active');
                            t.setAttribute('aria-selected', 'false');
                            t.setAttribute('tabindex', '-1');
                        });

                        tab.classList.add('active');
                        tab.setAttribute('aria-selected', 'true');
                        tab.setAttribute('tabindex', '0');

                        tabContents.forEach(content => {
                            const isActive = content.id === tabId;
                            content.classList.toggle('active', isActive);
                            content.toggleAttribute('hidden', !isActive);
                        });
                    };

                    tab.addEventListener('click', activate);

                    tab.addEventListener('keydown', event => {
                        const currentIndex = tabs.indexOf(tab);

                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            activate();
                            return;
                        }

                        if (event.key === 'ArrowRight') {
                            event.preventDefault();
                            tabs[(currentIndex + 1) % tabs.length].focus();
                        }

                        if (event.key === 'ArrowLeft') {
                            event.preventDefault();
                            tabs[(currentIndex - 1 + tabs.length) % tabs.length].focus();
                        }
                    });
                });

                tabContents.forEach(content => {
                    content.toggleAttribute('hidden', !content.classList.contains('active'));
                });
            });
        },

        initShellPanels() {
            const shellGroups = document.querySelectorAll('.shell-window[data-shell-group]');

            shellGroups.forEach(shellGroup => {
                if (shellGroup.dataset.irspShellBound === 'true') return;

                const tabs = Array.from(shellGroup.querySelectorAll('.shell-tab[data-shell-panel]'));
                const panels = Array.from(shellGroup.querySelectorAll('.shell-panel[data-shell-panel]'));

                if (!tabs.length || !panels.length) return;

                shellGroup.dataset.irspShellBound = 'true';

                const activate = panelName => {
                    tabs.forEach(tab => {
                        const isActive = tab.dataset.shellPanel === panelName;
                        tab.classList.toggle('active', isActive);
                        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
                        tab.setAttribute('tabindex', isActive ? '0' : '-1');
                    });

                    panels.forEach(panel => {
                        panel.toggleAttribute('hidden', panel.dataset.shellPanel !== panelName);
                    });
                };

                tabs.forEach((tab, index) => {
                    if (!tab.hasAttribute('role')) {
                        tab.setAttribute('role', 'tab');
                    }

                    tab.addEventListener('click', () => {
                        activate(tab.dataset.shellPanel);
                    });

                    tab.addEventListener('keydown', event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            activate(tab.dataset.shellPanel);
                            return;
                        }

                        if (event.key === 'ArrowRight') {
                            event.preventDefault();
                            tabs[(index + 1) % tabs.length].focus();
                        }

                        if (event.key === 'ArrowLeft') {
                            event.preventDefault();
                            tabs[(index - 1 + tabs.length) % tabs.length].focus();
                        }
                    });
                });

                const initialTab = tabs.find(tab => tab.classList.contains('active')) || tabs[0];
                if (initialTab) {
                    activate(initialTab.dataset.shellPanel);
                }
            });
        },

        initGenericToggles() {
            const toggles = document.querySelectorAll('.toggle:not([data-irsp-bound])');

            toggles.forEach(toggle => {
                toggle.dataset.irspBound = 'true';

                if (!toggle.hasAttribute('role')) {
                    toggle.setAttribute('role', 'switch');
                }

                if (!toggle.hasAttribute('tabindex')) {
                    toggle.setAttribute('tabindex', '0');
                }

                toggle.setAttribute('aria-checked', toggle.classList.contains('on') ? 'true' : 'false');

                const isStatic = toggle.dataset.staticToggle === 'true';

                const flip = () => {
                    if (isStatic) return;
                    toggle.classList.toggle('on');
                    toggle.setAttribute('aria-checked', toggle.classList.contains('on') ? 'true' : 'false');
                };

                toggle.addEventListener('click', flip);

                toggle.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        flip();
                    }
                });
            });
        },

        initAutoResizeHelpers() {
            document.querySelectorAll('.chat-box').forEach(box => {
                box.style.scrollBehavior = 'smooth';
            });
        },

        getStorageKey(key) {
            return `${this.storagePrefix}${key}`;
        },

        getSavedSettings() {
            return safeReadJSON(this.settingsStorageKey, null);
        },

        applyStoredAppearance() {
            const settings = this.getSavedSettings();
            if (settings) {
                this.applyAppearanceSettings(settings);
            }
        },

        applyAppearanceSettings(settings) {
            const appearance = settings.appearance || settings;
            if (!appearance) return;

            document.body.classList.toggle('compact-sidebar', !!appearance.compactSidebar);
            document.body.classList.toggle('hide-header-timers', appearance.showTimer === false);
            document.body.classList.toggle('dark-mode', appearance.darkMode === true);
            document.documentElement.style.colorScheme = 'light';
        },

        getTimestamp() {
            const now = new Date();
            return now.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        },

        async fetchJSON(url, options = {}) {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            return response.json();
        }
    };

    function startTimer(elementId, totalSeconds, options = {}) {
        const timerElement = document.getElementById(elementId);
        if (!timerElement) return null;

        const storageKey = options.storageKey || IRSP.getStorageKey(`timer-${elementId}`);
        const persist = options.persist !== false;
        const onComplete = typeof options.onComplete === 'function' ? options.onComplete : null;

        let initialRemaining = Number(totalSeconds) || 0;
        let state = null;

        if (persist) {
            state = safeReadJSON(storageKey, null);
        }

        if (persist && state && typeof state.endTime === 'number' && !Number.isNaN(state.endTime)) {
            initialRemaining = Math.max(0, Math.floor((state.endTime - Date.now()) / 1000));
        } else if (persist) {
            safeWriteJSON(storageKey, {
                endTime: Date.now() + initialRemaining * 1000
            });
        }

        let remaining = initialRemaining;

        function render() {
            const hours = String(Math.floor(remaining / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
            const seconds = String(remaining % 60).padStart(2, '0');
            timerElement.textContent = `${hours}:${minutes}:${seconds}`;
        }

        render();

        if (remaining <= 0) {
            if (persist) {
                localStorage.removeItem(storageKey);
            }
            if (onComplete) onComplete();
            return null;
        }

        const interval = window.setInterval(() => {
            remaining -= 1;

            if (remaining <= 0) {
                remaining = 0;
                render();
                window.clearInterval(interval);

                if (persist) {
                    localStorage.removeItem(storageKey);
                }

                if (onComplete) {
                    onComplete();
                }
                return;
            }

            render();
        }, 1000);

        return interval;
    }

    function initRecordExplorer(config = {}) {
        const rows = Array.from(document.querySelectorAll(config.rowsSelector || '[data-record-id]'));
        const storageKey = config.storageKey || null;
        const selectedClassName = config.selectedClassName || 'selected';

        if (!rows.length) {
            return null;
        }

        function persist(recordId) {
            if (!storageKey || !recordId) return;
            localStorage.setItem(storageKey, recordId);
        }

        function activateRow(row, shouldPersist = true) {
            if (!row) return;

            rows.forEach(item => {
                const isActive = item === row;
                item.classList.toggle(selectedClassName, isActive);
                item.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            if (shouldPersist) {
                persist(row.dataset.recordId);
            }

            if (typeof config.onSelect === 'function') {
                config.onSelect(row);
            }
        }

        rows.forEach(row => {
            row.classList.add('is-selectable-row');

            if (!row.hasAttribute('tabindex')) {
                row.setAttribute('tabindex', '0');
            }

            row.setAttribute('aria-selected', 'false');

            row.addEventListener('click', () => {
                activateRow(row, true);
            });

            row.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activateRow(row, true);
                }
            });
        });

        const savedRecordId = storageKey ? localStorage.getItem(storageKey) : null;
        const initialRow = rows.find(row => row.dataset.recordId === savedRecordId) || rows[0];

        if (initialRow) {
            activateRow(initialRow, false);
        }

        return {
            rows,
            activateRow
        };
    }

    function initCommandShell(config = {}) {
        const output = document.getElementById(config.outputId);
        const input = document.getElementById(config.inputId);
        const button = document.getElementById(config.buttonId);
        const statusLine = config.statusId ? document.getElementById(config.statusId) : null;
        const presetButtons = config.presetSelector
            ? Array.from(document.querySelectorAll(config.presetSelector))
            : [];
        const prompt = config.prompt || '>';
        const defaultOutput = config.defaultOutput || 'Command accepted for simulation review.';
        const commands = config.commands || {};

        if (!output || !input || !button) {
            return null;
        }

        function appendLine(content, className = '') {
            output.insertAdjacentHTML('beforeend', `<div class="term-line${className ? ` ${className}` : ''}">${content}</div>`);
        }

        function appendOutput(outputText, variant = '') {
            const lines = String(outputText || '').split('\n');
            lines.forEach(line => {
                appendLine(escapeHtml(line), variant);
            });
        }

        function resolveCommand(command) {
            const normalized = normalizeCommand(command);

            if (commands[normalized]) {
                return typeof commands[normalized] === 'function'
                    ? commands[normalized](command, normalized)
                    : commands[normalized];
            }

            if (typeof config.resolveCommand === 'function') {
                return config.resolveCommand(command, normalized);
            }

            return null;
        }

        function execute(rawCommand) {
            const command = String(rawCommand || '').trim();
            if (!command) return;

            appendLine(`<span class="prompt">${escapeHtml(prompt)}</span> ${escapeHtml(command)}`);

            const result = resolveCommand(command);
            const payload = typeof result === 'string' ? { output: result } : (result || {});

            appendOutput(payload.output || defaultOutput, payload.variant || '');

            if (typeof payload.afterExecute === 'function') {
                payload.afterExecute(command);
            }

            if (statusLine) {
                statusLine.textContent = payload.status || `Last command executed at ${IRSP.getTimestamp()}`;
            }

            output.scrollTop = output.scrollHeight;
            input.value = '';

            if (typeof config.onExecute === 'function') {
                config.onExecute(command, payload);
            }
        }

        button.addEventListener('click', () => {
            execute(input.value);
        });

        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                execute(input.value);
            }
        });

        presetButtons.forEach(buttonEl => {
            buttonEl.addEventListener('click', () => {
                const command = buttonEl.dataset.shellCommand || buttonEl.dataset.command || '';
                if (!command) return;
                input.value = command;
                execute(command);
            });
        });

        return {
            execute
        };
    }

    function initDashboard(config = {}) {
        const timeline = document.getElementById(config.timelineId || 'incident-timeline');
        const commsBox = document.getElementById(config.commsId || 'team-comms');
        const input = document.getElementById(config.inputId || 'team-message-input');
        const progressFill = document.getElementById(config.progressFillId || 'progress-fill');
        const progressText = document.getElementById(config.progressTextId || 'progress-text');
        const alerts = Array.from(document.querySelectorAll('[data-alert-id]'));
        const objectives = Array.from(document.querySelectorAll('.objective-item'));
        const mitreTags = Array.from(document.querySelectorAll('[data-mitre-tag]'));
        const searchInput = document.getElementById(config.searchInputId || 'dashboard-search-input');
        const searchRunButton = document.getElementById(config.searchRunButtonId || 'dashboard-run-search');
        const searchStatus = document.getElementById(config.searchStatusId || 'dashboard-search-status');
        const searchResultsNote = document.getElementById(config.searchResultsNoteId || 'dashboard-results-note');
        const queryPresets = Array.from(document.querySelectorAll(config.queryPresetSelector || '[data-query-preset]'));
        const searchPanel = document.getElementById(config.searchPanelId || 'dashboard-search-panel-search');
        const searchStatsPanel = document.getElementById(config.searchStatsPanelId || 'dashboard-search-panel-stats');
        const searchRawPanel = document.getElementById(config.searchRawPanelId || 'dashboard-search-panel-raw');
        const searchResultsBody = document.getElementById(config.searchResultsBodyId || 'dashboard-results-body');
        const searchResultsTable = document.getElementById(config.searchResultsTableId || 'dashboard-results-table');
        const searchResultsCard = document.getElementById(config.searchResultsCardId || 'dashboard-search-results-card');
        const drilldownHost = document.getElementById(config.drilldownHostId || 'drilldown-host');
        const drilldownSourcetype = document.getElementById(config.drilldownSourcetypeId || 'drilldown-sourcetype');
        const drilldownUser = document.getElementById(config.drilldownUserId || 'drilldown-user');
        const drilldownRisk = document.getElementById(config.drilldownRiskId || 'drilldown-risk');
        const drilldownJson = document.getElementById(config.drilldownJsonId || 'drilldown-json');
        const drilldownFields = document.getElementById(config.drilldownFieldsId || 'drilldown-fields');
        const searchProvider = typeof config.searchProvider === 'function' ? config.searchProvider : null;
        const actionProvider = typeof config.actionProvider === 'function' ? config.actionProvider : null;
        const storageKey = config.storageKey || IRSP.getStorageKey('dashboard-state');

        if (!timeline || !commsBox || !input || !progressFill || !progressText) {
            return;
        }

        const defaultState = {
            completedObjectives: ['entry'],
            handledAlerts: [],
            chatMessages: [],
            timelineItems: [],
            progress: 40,
            selectedRecordId: null,
            searchQuery: ''
        };

        const saved = safeReadJSON(storageKey, defaultState);
        const state = {
            completedObjectives: Array.isArray(saved.completedObjectives) ? saved.completedObjectives : defaultState.completedObjectives,
            handledAlerts: Array.isArray(saved.handledAlerts) ? saved.handledAlerts : defaultState.handledAlerts,
            chatMessages: Array.isArray(saved.chatMessages) ? saved.chatMessages : defaultState.chatMessages,
            timelineItems: Array.isArray(saved.timelineItems) ? saved.timelineItems : defaultState.timelineItems,
            progress: Number(saved.progress) || defaultState.progress,
            selectedRecordId: saved.selectedRecordId || defaultState.selectedRecordId,
            searchQuery: saved.searchQuery || defaultState.searchQuery
        };

        const objectiveMap = {
            encryption: 'investigation',
            c2: 'containment',
            ssh: 'access',
            privesc: 'access',
            rename: 'eradication'
        };

        const mitreMap = {
            encryption: 'impact',
            c2: 'command-and-control',
            ssh: 'credential-access',
            privesc: 'privilege-escalation',
            rename: 'impact'
        };

        const searchProfiles = [
            {
                id: 'impact',
                match: query => /encrypt|rename|impact|auditd|shared/i.test(query),
                rowId: 'evt-encrypt',
                resultsNote: '11 of 1,184 impact events shown',
                search: `ResponseGridLogs
| where host == "container-01" and (sourcetype in ("auditd", "falco", "inotify") or event has "/srv/shared")
| summarize eventCount = count(), firstSeen = min(timestamp), lastSeen = max(timestamp) by host, sourcetype
| order by eventCount desc

host=container-01 sourcetype=auditd count=412 firstSeen=14:21:58 lastSeen=14:23:55
host=container-01 sourcetype=falco count=37 firstSeen=14:22:01 lastSeen=14:24:37
host=container-01 sourcetype=inotify count=735 firstSeen=14:22:14 lastSeen=14:24:02
job runtime=0.41s events scanned=18,420 result rows=3`,
                stats: `ResponseGridLogs
| where host == "container-01" and (event has "rename" or event has "encrypt")
| summarize count() by bin(timestamp, 1m), sourcetype

14:21 auditd=88 falco=3 inotify=174
14:22 auditd=201 falco=12 inotify=388
14:23 auditd=123 falco=22 inotify=173

impact burst began at 14:22 and peaked in the shared volume.`,
                raw: `14:22:14 container-01 auditd execve pid=4821 exe=/bin/bash cmd=/tmp/.encrypt.sh --target /srv/shared
14:23:55 container-01 auditd rename burst detected under /srv/shared touched_files=412
14:24:37 container-01 falco Terminal shell in container with write access to shared volume`
            },
            {
                id: 'identity',
                match: query => /ssh|svc-backup|identity|okta|auth/i.test(query),
                rowId: 'evt-ssh',
                resultsNote: '9 of 604 authentication events shown',
                search: `ResponseGridLogs
| where host in ("docker-host-02", "idp-01") and (event has "ssh" or user == "svc-backup" or outcome == "SUCCESS")
| project timestamp, host, sourcetype, user, src_ip, outcome
| order by timestamp asc

14:20:56 docker-host-02 linux_secure root 192.168.1.45 FAILURE
14:21:43 docker-host-02 linux_secure root 192.168.1.45 FAILURE
14:23:19 idp-01 okta:system svc-backup 192.168.1.45 SUCCESS
job runtime=0.29s events scanned=6,204 result rows=3`,
                stats: `ResponseGridLogs
| where src_ip == "192.168.1.45" and (event has "ssh" or sourcetype == "okta:system")
| summarize count() by host, outcome

docker-host-02 FAILURE 47
idp-01 SUCCESS 1

single success follows a burst of failed SSH attempts from the same origin.`,
                raw: `14:23:19 idp-01 okta:system user=svc-backup factor=password outcome=SUCCESS ip=192.168.1.45
14:22:31 docker-host-02 sysmon:process parent=sshd child=/bin/bash user=svc-backup tty=pts/7`
            },
            {
                id: 'c2',
                match: query => /203\.0\.113\.42|8443|c2|traffic|beacon|pan:traffic/i.test(query),
                rowId: 'evt-c2',
                resultsNote: '8 of 982 network events shown',
                search: `ResponseGridLogs
| where dest_ip == "203.0.113.42" and dest_port == 8443
| summarize eventCount = count(), bytesOut = sum(toint(bytes_out)) by host, dest_ip, dest_port
| order by bytesOut desc

host=container-01 dest_ip=203.0.113.42 dest_port=8443 count=88 bytesOut=982341
host=edge-fw-01 dest_ip=203.0.113.42 dest_port=8443 count=88 bytesOut=982341
job runtime=0.18s events scanned=982 result rows=2`,
                stats: `ResponseGridLogs
| where dest_ip == "203.0.113.42"
| summarize bytesOut = sum(toint(bytes_out)) by bin(timestamp, 1m)

14:21 120341
14:22 452981
14:23 409019

egress volume aligns with the active encryption process window.`,
                raw: `14:23:02 edge-fw-01 pan:traffic allow tls 10.77.4.23:49812 to 203.0.113.42:8443 bytes_out=982341
14:22:58 docker-host-02 sysmon:network process=/bin/bash dest=203.0.113.42:8443 state=ESTABLISHED`
            },
            {
                id: 'phishing',
                match: query => /mail|phish|invoice|o365|policy/i.test(query),
                rowId: 'evt-mail',
                resultsNote: '4 of 121 email events shown',
                search: `ResponseGridLogs
| where sourcetype == "o365:message_trace" and sender_domain == "corp-updates.net"
| project timestamp, recipient, sender, subject, delivered, attachment

14:24:19 analyst@responsegrid.local benefits@corp-updates.net "Updated payroll policy" true policy_update.iso
14:24:20 finance@responsegrid.local benefits@corp-updates.net "Updated payroll policy" true policy_update.iso`,
                stats: `ResponseGridLogs
| where sourcetype == "o365:message_trace" and sender_domain == "corp-updates.net"
| summarize recipients = dcount(recipient), subjects = make_set(subject) by sender_domain

sender_domain=corp-updates.net recipients=2 subjects="Updated payroll policy"

email trail supports the initial access hypothesis.`,
                raw: `14:24:19 mail-gw-01 o365:message_trace subject="Updated payroll policy" sender=benefits@corp-updates.net delivered=true attachment=policy_update.iso`
            },
            {
                id: 'default',
                match: () => true,
                rowId: 'evt-ssh',
                resultsNote: '15 of 42,381 events shown',
                search: `ResponseGridLogs
| where host in ("container-01", "docker-host-02") and severity in ("high", "critical")
| summarize eventCount = count(), firstSeen = min(timestamp), lastSeen = max(timestamp) by host, sourcetype
| order by eventCount desc

host=container-01 sourcetype=auditd count=412 firstSeen=14:21:58 lastSeen=14:23:55
host=docker-host-02 sourcetype=sysmon:process count=53 firstSeen=14:18:11 lastSeen=14:22:31
host=edge-fw-01 sourcetype=pan:traffic count=88 firstSeen=14:19:44 lastSeen=14:23:02
host=mail-gw-01 sourcetype=o365:message_trace count=7 firstSeen=13:57:18 lastSeen=14:24:19
job runtime=0.48s events scanned=42,381 result rows=4`,
                stats: `ResponseGridLogs
| where host in ("container-01", "docker-host-02") and severity in ("high", "critical")
| summarize count() by sourcetype
| order by count_ desc

auditd 412
pan:traffic 88
sysmon:process 53
falco 37

highest density is concentrated on container impact telemetry.`,
                raw: `14:22:31 docker-host-02 sysmon:process parent=sshd child=/bin/bash user=svc-backup tty=pts/7
14:23:02 edge-fw-01 pan:traffic allow tls 10.77.4.23:49812 to 203.0.113.42:8443 bytes_out=982341
14:23:55 container-01 auditd rename burst detected under /srv/shared with 412 files touched`
            }
        ];

        function saveState() {
            safeWriteJSON(storageKey, state);
        }

        function markObjectiveComplete(objectiveKey) {
            if (!objectiveKey) return;
            if (!state.completedObjectives.includes(objectiveKey)) {
                state.completedObjectives.push(objectiveKey);
            }

            const item = objectives.find(obj => obj.dataset.objective === objectiveKey);
            if (!item) return;

            item.classList.add('complete');
            const currentIcon = item.querySelector('svg') ? item.querySelector('svg') : item.querySelector('i');

            if (currentIcon && currentIcon.tagName.toLowerCase() === 'svg') {
                currentIcon.outerHTML = '<i data-lucide="check-circle" style="width:16px;color:var(--accent-green);"></i>';
            } else if (currentIcon) {
                currentIcon.setAttribute('data-lucide', 'check-circle');
                currentIcon.style.color = 'var(--accent-green)';
            } else {
                item.insertAdjacentHTML('afterbegin', '<i data-lucide="check-circle" style="width:16px;color:var(--accent-green);"></i>');
            }

            IRSP.refreshIcons();
        }

        function renderObjectives() {
            objectives.forEach(item => {
                const key = item.dataset.objective;
                if (state.completedObjectives.includes(key)) {
                    markObjectiveComplete(key);
                }
            });
        }

        function updateProgress() {
            const total = objectives.length || 1;
            const complete = objectives.filter(item => item.classList.contains('complete')).length;
            const percent = Math.round((complete / total) * 100);

            state.progress = percent;
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `Overall completion: ${percent}%`;
            saveState();
        }

        function appendTimelineItem(time, description, persist = true) {
            if (!time || !description) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'timeline-item';
            wrapper.innerHTML = `
                <span class="time">${escapeHtml(time)}</span>
                <p class="desc">${escapeHtml(description)}</p>
            `;
            timeline.appendChild(wrapper);

            if (persist) {
                state.timelineItems.push({ time, description });
                saveState();
            }
        }

        function appendChatMessage(sender, message, persist = true) {
            if (!sender || !message) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'msg';
            wrapper.innerHTML = `<span class="msg-sender">${escapeHtml(sender)}:</span> ${escapeHtml(message)}`;
            commsBox.appendChild(wrapper);
            commsBox.scrollTop = commsBox.scrollHeight;

            if (persist) {
                state.chatMessages.push({ sender, message });
                saveState();
            }
        }

        function activateMitreTag(tagKey) {
            if (!tagKey) return;
            const tag = mitreTags.find(item => item.dataset.mitreTag === tagKey);
            if (tag) {
                tag.classList.add('active');
            }
        }

        function updateDrilldown(row) {
            if (!row) return;

            state.selectedRecordId = row.dataset.recordId || null;

            if (drilldownHost) {
                drilldownHost.textContent = row.dataset.host || '--';
            }

            if (drilldownSourcetype) {
                drilldownSourcetype.textContent = row.dataset.sourcetype || '--';
            }

            if (drilldownUser) {
                drilldownUser.textContent = row.dataset.user || 'unassigned';
            }

            if (drilldownRisk) {
                drilldownRisk.textContent = row.dataset.riskScore || '--';
                drilldownRisk.style.color = Number(row.dataset.riskScore) >= 80 ? 'var(--accent-red)' : 'var(--accent-yellow)';
            }

            if (drilldownJson) {
                drilldownJson.textContent = row.dataset.json || '';
            }

            if (drilldownFields) {
                drilldownFields.textContent = row.dataset.fields || '';
            }

            saveState();
        }

        function bindSearchResultRows() {
            initRecordExplorer({
                rowsSelector: config.resultRowsSelector || '[data-record-id]',
                storageKey: `${storageKey}-selected-record`,
                onSelect: updateDrilldown
            });
        }

        function renderSearchResults(payload) {
            if (!searchResultsBody || !payload || !Array.isArray(payload.results)) return;

            if (!payload.results.length) {
                searchResultsBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="surface-note" style="padding:1rem 0.9rem;">No matching events found for this query.</td>
                    </tr>
                `;
                return;
            }

            searchResultsBody.innerHTML = payload.results.map(record => {
                const jsonValue = escapeHtml(JSON.stringify(record, null, 2));
                const fieldsValue = escapeHtml(Object.entries(record).map(([key, value]) => `${key}: ${value}`).join('\n'));
                const timestamp = escapeHtml(String(record.timestamp || '').split('T')[1]?.replace('Z', '') || record.timestamp || '--');
                const host = escapeHtml(record.host || '--');
                const sourcetype = escapeHtml(record.sourcetype || '--');
                const event = escapeHtml(record.event || '--');
                const user = escapeHtml(record.user || 'unassigned');
                const riskScore = escapeHtml(String(record.risk_score || record.riskScore || 70));
                const recordId = escapeHtml(record.record_id || record.id || `record-${Math.random().toString(36).slice(2, 8)}`);

                return `
                    <tr data-record-id="${recordId}" data-host="${host}" data-sourcetype="${sourcetype}" data-user="${user}" data-risk-score="${riskScore}" data-json="${jsonValue}" data-fields="${fieldsValue}">
                        <td class="mono">${timestamp}</td>
                        <td class="mono">${host}</td>
                        <td>${sourcetype}</td>
                        <td class="mono">${event}</td>
                    </tr>
                `;
            }).join('');

            bindSearchResultRows();
            IRSP.refreshIcons();
        }

        function renderSearchPanels(payload, query) {
            const results = Array.isArray(payload.results) ? payload.results : [];

            if (searchPanel) {
                searchPanel.textContent = `${query}\n\n${results.map(result => `${result.timestamp} ${result.host} ${result.sourcetype} ${result.event}`).join('\n')}`;
            }

            if (searchStatsPanel) {
                const severityLines = Object.entries(payload.severity_breakdown || {})
                    .map(([severity, count]) => `${severity} ${count}`)
                    .join('\n');

                searchStatsPanel.textContent = `query=${query}\nscenario=${payload.scenario_id || 'all'}\nresults=${payload.total_matches || results.length}\n\n${severityLines || 'no severity breakdown available'}`;
            }

            if (searchRawPanel) {
                searchRawPanel.textContent = results.map(result => JSON.stringify(result)).join('\n');
            }
        }

        function getSearchProfile(query) {
            return searchProfiles.find(profile => profile.match(query)) || searchProfiles[searchProfiles.length - 1];
        }

        function syncActiveChip(query) {
            queryPresets.forEach(item => item.classList.remove('active'));
            const match = queryPresets.find(item => item.dataset.queryPreset === query);
            if (match) match.classList.add('active');
        }

        async function runSearch(query, shouldPersist = true) {
            if (!searchInput) return;

            const normalizedQuery = String(query || searchInput.value || '').trim();
            const profile = getSearchProfile(normalizedQuery);

            searchInput.value = normalizedQuery || searchInput.value;
            syncActiveChip(normalizedQuery);

            if (searchProvider) {
                try {
                    const payload = await searchProvider(normalizedQuery);

                    if (payload && Array.isArray(payload.results)) {
                        renderSearchResults(payload);
                        renderSearchPanels(payload, normalizedQuery);

                        if (searchResultsNote) {
                            searchResultsNote.textContent = `${payload.results.length} of ${payload.total_matches || payload.results.length} events shown`;
                        }

                        if (searchStatus) {
                            searchStatus.textContent = `Search job API completed at ${IRSP.getTimestamp()} with ${payload.total_matches || payload.results.length} matched events.`;
                        }

                        if (shouldPersist) {
                            state.searchQuery = normalizedQuery;
                            saveState();
                        }

                        const firstRow = document.querySelector(`${config.resultRowsSelector || '[data-record-id]'}`);
                        if (firstRow) {
                            updateDrilldown(firstRow);
                            firstRow.click();
                        }

                        if (searchResultsCard) {
                            searchResultsCard.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                        }

                        if (searchResultsTable) {
                            searchResultsTable.classList.add('search-flash');
                            window.setTimeout(() => {
                                searchResultsTable.classList.remove('search-flash');
                            }, 900);
                        }

                        return;
                    }
                } catch (error) {
                    if (searchStatus) {
                        searchStatus.textContent = `API unavailable at ${IRSP.getTimestamp()}. Showing local seed results.`;
                    }
                }
            }

            if (searchPanel) {
                searchPanel.textContent = profile.search;
            }

            if (searchStatsPanel) {
                searchStatsPanel.textContent = profile.stats;
            }

            if (searchRawPanel) {
                searchRawPanel.textContent = profile.raw;
            }

            if (searchResultsNote) {
                searchResultsNote.textContent = profile.resultsNote;
            }

            if (searchStatus) {
                searchStatus.textContent = `Search job ${profile.id.toUpperCase()} completed at ${IRSP.getTimestamp()} with ${profile.resultsNote.toLowerCase()}.`;
            }

            if (shouldPersist) {
                state.searchQuery = normalizedQuery;
                saveState();
            }

            const selectedRow = document.querySelector(`[data-record-id="${profile.rowId}"]`);
            if (selectedRow) {
                updateDrilldown(selectedRow);
                selectedRow.click();
            }
        }

        async function handleAlert(alertElement, action) {
            const alertId = alertElement.dataset.alertId;
            if (!alertId || state.handledAlerts.includes(alertId)) return;

            if (actionProvider) {
                try {
                    await actionProvider({
                        alertId,
                        serverAlertId: alertElement.dataset.serverAlertId || null,
                        action,
                        alertElement
                    });
                } catch (error) {
                    if (searchStatus) {
                        searchStatus.textContent = `Action sync failed at ${IRSP.getTimestamp()}. Local state was still updated.`;
                    }
                }
            }

            state.handledAlerts.push(alertId);

            const actionButton = alertElement.querySelector('button');
            if (actionButton) {
                actionButton.disabled = true;
                actionButton.textContent = action === 'acknowledge' ? 'Acknowledged' : action === 'contain' ? 'Contained' : 'Investigated';
            }

            alertElement.style.opacity = '0.76';

            const objectiveKey = objectiveMap[alertId];
            const mitreKey = mitreMap[alertId];

            markObjectiveComplete(objectiveKey);
            activateMitreTag(mitreKey);

            if (alertId === 'encryption') {
                appendTimelineItem(IRSP.getTimestamp(), 'Encryption activity investigated and malicious process confirmed.');
                appendChatMessage('IR Lead', 'Encryption process confirmed. Proceeding with containment workflow.');
                runSearch('host == "container-01" and ("encrypt" or "rename" or "/srv/shared")', true);
            }

            if (alertId === 'ssh') {
                appendTimelineItem(IRSP.getTimestamp(), 'SSH brute-force attempts reviewed and escalation path documented.');
                appendChatMessage('Analyst 2', 'Credential attack path noted. Reviewing identity exposure.');
                runSearch('src_ip == "192.168.1.45" and (event has "ssh" or user == "svc-backup" or sourcetype == "okta:system")', true);
            }

            if (alertId === 'c2') {
                appendTimelineItem(IRSP.getTimestamp(), 'Suspicious outbound C2 activity contained at perimeter controls.');
                appendChatMessage('Network', 'Outbound connection blocked. C2 disruption confirmed.');
                runSearch('dest_ip == "203.0.113.42" and dest_port == 8443', true);
            }

            if (alertId === 'privesc') {
                appendTimelineItem(IRSP.getTimestamp(), 'Privilege escalation under svc-backup confirmed via sudo on docker-host-02.');
                appendChatMessage('IR Lead', 'Escalation path confirmed. Reviewing lateral movement and access controls.');
                activateMitreTag('lateral-movement');
                runSearch('src_ip == "192.168.1.45" and (event has "ssh" or user == "svc-backup" or sourcetype == "okta:system")', true);
            }

            if (alertId === 'rename') {
                appendTimelineItem(IRSP.getTimestamp(), 'File rename storm in /srv/shared confirmed as active ransomware impact phase.');
                appendChatMessage('Forensics', 'Rename pattern consistent with ransomware encryption. Initiating eradication steps.');
                runSearch('host == "container-01" and ("encrypt" or "rename" or "/srv/shared")', true);
            }

            updateProgress();
            saveState();
        }

        function renderSavedTimeline() {
            state.timelineItems.forEach(item => {
                appendTimelineItem(item.time, item.description, false);
            });
        }

        function renderSavedChat() {
            state.chatMessages.forEach(item => {
                appendChatMessage(item.sender, item.message, false);
            });
        }

        function renderHandledAlerts() {
            alerts.forEach(alertElement => {
                const alertId = alertElement.dataset.alertId;
                if (!state.handledAlerts.includes(alertId)) return;

                const button = alertElement.querySelector('button');
                const action = button ? button.dataset.action : 'investigate';

                if (button) {
                    button.disabled = true;
                    button.textContent = action === 'acknowledge' ? 'Acknowledged' : action === 'contain' ? 'Contained' : 'Investigated';
                }

                alertElement.style.opacity = '0.76';

                markObjectiveComplete(objectiveMap[alertId]);
                activateMitreTag(mitreMap[alertId]);
            });
        }

        alerts.forEach(alertElement => {
            const button = alertElement.querySelector('button');
            if (!button) return;

            button.addEventListener('click', async () => {
                await handleAlert(alertElement, button.dataset.action || 'investigate');
            });
        });

        const containmentBtn = document.getElementById('dashboard-start-containment');
        if (containmentBtn) {
            containmentBtn.addEventListener('click', () => {
                if (containmentBtn.disabled) return;

                appendTimelineItem(IRSP.getTimestamp(), 'Containment initiated: network isolation procedure started for container-01 and docker-host-02.');
                appendChatMessage('IR Lead', 'Containment procedure started. Isolating affected hosts and blocking outbound paths.');
                markObjectiveComplete('containment');
                activateMitreTag('command-and-control');
                updateProgress();
                saveState();

                containmentBtn.disabled = true;
                containmentBtn.innerHTML = '<i data-lucide="shield-check"></i> Containment Active';
                IRSP.refreshIcons();

                if (searchStatus) {
                    searchStatus.textContent = `Containment started at ${IRSP.getTimestamp()}`;
                }
            });
        }

        bindSearchResultRows();

        if (searchRunButton && searchInput) {
            searchRunButton.addEventListener('click', () => {
                runSearch(searchInput.value, true);
            });
        }

        if (searchInput) {
            searchInput.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    runSearch(searchInput.value, true);
                }
            });
        }

        queryPresets.forEach(button => {
            button.addEventListener('click', () => {
                runSearch(button.dataset.queryPreset || '', true);
            });
        });

        input.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;

            const value = input.value.trim();
            if (!value) return;

            appendChatMessage('You', value);
            input.value = '';

            window.setTimeout(() => {
                appendChatMessage('System', 'Message logged to the incident channel.', true);
            }, 250);
        });

        renderSavedTimeline();
        renderSavedChat();
        renderObjectives();
        renderHandledAlerts();
        updateProgress();
        if (searchInput) {
            runSearch(state.searchQuery || searchInput.value, false);
        }
        IRSP.refreshIcons();
    }

    window.IRSP = IRSP;
    window.startTimer = startTimer;
    window.initRecordExplorer = initRecordExplorer;
    window.initCommandShell = initCommandShell;
    window.initDashboard = initDashboard;

    document.addEventListener('DOMContentLoaded', () => {
        IRSP.init();
    });
})();
