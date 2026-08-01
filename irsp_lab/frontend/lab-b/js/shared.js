/* ============================================
   IRSP – Incident Response Simulation Platform
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
            document.documentElement.style.colorScheme = appearance.darkMode === false ? 'light' : 'dark';
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
            // The IRSP backend requires a JWT bearer token on /api/ routes.
            // Lab A/dashboard/labs pages store it under this key after login.
            const doFetch = () => {
                const token = window.localStorage.getItem('irsp-access-token') || '';
                const headers = Object.assign({}, options.headers || {});
                if (token && !headers.Authorization) {
                    headers.Authorization = `Bearer ${token}`;
                }
                return fetch(url, Object.assign({}, options, { headers }));
            };

            let response = await doFetch();

            // If the access token expired mid-session, try a silent refresh
            // once using the stored refresh token, then retry the request,
            // rather than leaving the trainee stuck with failing requests
            // for the rest of the lab.
            if (response.status === 401) {
                const refreshed = await IRSP.refreshAccessToken();
                if (refreshed) {
                    response = await doFetch();
                }
            }

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            return response.json();
        },

        async refreshAccessToken() {
            const refreshToken = window.localStorage.getItem('irsp-refresh-token') || '';
            if (!refreshToken) return false;
            try {
                const response = await fetch('/api/auth/token/refresh/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh: refreshToken })
                });
                if (!response.ok) return false;
                const data = await response.json();
                if (!data || !data.access) return false;
                window.localStorage.setItem('irsp-access-token', data.access);
                return true;
            } catch (error) {
                return false;
            }
        }
    };

    window.IRSP = IRSP;

    document.addEventListener('DOMContentLoaded', () => {
        IRSP.init();
    });
})();
