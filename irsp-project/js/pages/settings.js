(function () {
    'use strict';

    const STORAGE_KEY = 'irsp-settings-v2';
    const DEFAULTS = {
        profile: {
            displayName: 'Jordan Davis',
            email: 'jordan@corp.local',
            role: 'IR Lead',
            organization: 'ResponseGrid Training Lab'
        },
        appearance: {
            darkMode: false,
            compactSidebar: false,
            showTimer: true
        },
        environment: {
            defaultOS: 'Ubuntu 22.04 LTS',
            maxContainers: 4,
            ramLimit: '1 GB',
            autoDestroy: true,
            labSubnet: '192.168.100.0/24',
            dnsServer: '192.168.100.1',
            internetAccess: false,
            logRetention: '30 days'
        },
        notifications: {
            emailAlerts: true,
            inAppAlerts: true,
            teamActivity: false,
            weeklySummary: true
        },
        security: {
            twoFactor: false,
            sessionTimeout: true,
            auditLogging: true
        }
    };

    const els = {
        displayName: document.getElementById('display-name'),
        email: document.getElementById('email'),
        role: document.getElementById('role'),
        organization: document.getElementById('organization'),
        defaultOS: document.getElementById('default-os'),
        maxContainers: document.getElementById('max-containers'),
        ramLimit: document.getElementById('ram-limit'),
        labSubnet: document.getElementById('lab-subnet'),
        dnsServer: document.getElementById('dns-server'),
        logRetention: document.getElementById('log-retention'),
        currentPassword: document.getElementById('current-password'),
        newPassword: document.getElementById('new-password'),
        confirmPassword: document.getElementById('confirm-password'),
        saveBtn: document.getElementById('save-settings-btn'),
        resetBtn: document.getElementById('reset-settings-btn'),
        updatePasswordBtn: document.getElementById('update-password-btn'),
        statusCard: document.getElementById('settings-status-card'),
        statusText: document.getElementById('settings-status-text')
    };

    const toggleMap = {
        darkMode: document.querySelector('[data-setting="darkMode"]'),
        compactSidebar: document.querySelector('[data-setting="compactSidebar"]'),
        showTimer: document.querySelector('[data-setting="showTimer"]'),
        autoDestroy: document.querySelector('[data-setting="autoDestroy"]'),
        internetAccess: document.querySelector('[data-setting="internetAccess"]'),
        emailAlerts: document.querySelector('[data-setting="emailAlerts"]'),
        inAppAlerts: document.querySelector('[data-setting="inAppAlerts"]'),
        teamActivity: document.querySelector('[data-setting="teamActivity"]'),
        weeklySummary: document.querySelector('[data-setting="weeklySummary"]'),
        twoFactor: document.querySelector('[data-setting="twoFactor"]'),
        sessionTimeout: document.querySelector('[data-setting="sessionTimeout"]'),
        auditLogging: document.querySelector('[data-setting="auditLogging"]')
    };

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function showStatus(message, type) {
        els.statusCard.style.display = 'block';
        els.statusText.textContent = message;
        els.statusText.style.color =
            type === 'error' ? 'var(--accent-red)' :
                type === 'success' ? 'var(--accent-green)' :
                    'var(--text-dim)';
    }

    function setToggleState(toggle, enabled) {
        toggle.classList.toggle('on', !!enabled);
        toggle.setAttribute('aria-checked', enabled ? 'true' : 'false');
    }

    function getToggleState(toggle) {
        return toggle.classList.contains('on');
    }

    function mergeSettings(base, incoming) {
        return {
            profile: { ...base.profile, ...(incoming.profile || {}) },
            appearance: { ...base.appearance, ...(incoming.appearance || {}) },
            environment: { ...base.environment, ...(incoming.environment || {}) },
            notifications: { ...base.notifications, ...(incoming.notifications || {}) },
            security: { ...base.security, ...(incoming.security || {}) }
        };
    }

    function loadSavedSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return saved ? mergeSettings(DEFAULTS, saved) : structuredClone(DEFAULTS);
        } catch (error) {
            return structuredClone(DEFAULTS);
        }
    }

    function applySettings(settings) {
        els.displayName.value = settings.profile.displayName;
        els.email.value = settings.profile.email;
        els.role.value = settings.profile.role;
        els.organization.value = settings.profile.organization;

        els.defaultOS.value = settings.environment.defaultOS;
        els.maxContainers.value = settings.environment.maxContainers;
        els.ramLimit.value = settings.environment.ramLimit;
        els.labSubnet.value = settings.environment.labSubnet;
        els.dnsServer.value = settings.environment.dnsServer;
        els.logRetention.value = settings.environment.logRetention;

        setToggleState(toggleMap.darkMode, settings.appearance.darkMode);
        setToggleState(toggleMap.compactSidebar, settings.appearance.compactSidebar);
        setToggleState(toggleMap.showTimer, settings.appearance.showTimer);
        setToggleState(toggleMap.autoDestroy, settings.environment.autoDestroy);
        setToggleState(toggleMap.internetAccess, settings.environment.internetAccess);
        setToggleState(toggleMap.emailAlerts, settings.notifications.emailAlerts);
        setToggleState(toggleMap.inAppAlerts, settings.notifications.inAppAlerts);
        setToggleState(toggleMap.teamActivity, settings.notifications.teamActivity);
        setToggleState(toggleMap.weeklySummary, settings.notifications.weeklySummary);
        setToggleState(toggleMap.twoFactor, settings.security.twoFactor);
        setToggleState(toggleMap.sessionTimeout, settings.security.sessionTimeout);
        setToggleState(toggleMap.auditLogging, settings.security.auditLogging);

        applyAppearance(settings);
    }

    function collectSettings() {
        return {
            profile: {
                displayName: els.displayName.value.trim(),
                email: els.email.value.trim(),
                role: els.role.value,
                organization: els.organization.value.trim()
            },
            appearance: {
                darkMode: getToggleState(toggleMap.darkMode),
                compactSidebar: getToggleState(toggleMap.compactSidebar),
                showTimer: getToggleState(toggleMap.showTimer)
            },
            environment: {
                defaultOS: els.defaultOS.value,
                maxContainers: Number(els.maxContainers.value),
                ramLimit: els.ramLimit.value,
                autoDestroy: getToggleState(toggleMap.autoDestroy),
                labSubnet: els.labSubnet.value.trim(),
                dnsServer: els.dnsServer.value.trim(),
                internetAccess: getToggleState(toggleMap.internetAccess),
                logRetention: els.logRetention.value
            },
            notifications: {
                emailAlerts: getToggleState(toggleMap.emailAlerts),
                inAppAlerts: getToggleState(toggleMap.inAppAlerts),
                teamActivity: getToggleState(toggleMap.teamActivity),
                weeklySummary: getToggleState(toggleMap.weeklySummary)
            },
            security: {
                twoFactor: getToggleState(toggleMap.twoFactor),
                sessionTimeout: getToggleState(toggleMap.sessionTimeout),
                auditLogging: getToggleState(toggleMap.auditLogging)
            }
        };
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.endsWith('.local');
    }

    function validateIPv4(value) {
        const parts = value.split('.');
        if (parts.length !== 4) return false;
        return parts.every(part => {
            if (!/^\d+$/.test(part)) return false;
            const n = Number(part);
            return n >= 0 && n <= 255;
        });
    }

    function validateSubnet(value) {
        const parts = value.split('/');
        if (parts.length !== 2) return false;
        const prefix = Number(parts[1]);
        return validateIPv4(parts[0]) && Number.isInteger(prefix) && prefix >= 0 && prefix <= 32;
    }

    function validateSettings(settings) {
        if (!settings.profile.displayName) {
            return 'Display name is required.';
        }
        if (!settings.profile.organization) {
            return 'Organization is required.';
        }
        if (!validateEmail(settings.profile.email)) {
            return 'Enter a valid email address.';
        }
        if (!Number.isInteger(settings.environment.maxContainers) || settings.environment.maxContainers < 1 || settings.environment.maxContainers > 12) {
            return 'Max containers must be between 1 and 12.';
        }
        if (!validateSubnet(settings.environment.labSubnet)) {
            return 'Lab subnet must look like 192.168.100.0/24.';
        }
        if (!validateIPv4(settings.environment.dnsServer)) {
            return 'DNS server must be a valid IPv4 address.';
        }
        return '';
    }

    function applyAppearance(settings) {
        if (window.IRSP && typeof window.IRSP.applyAppearanceSettings === 'function') {
            window.IRSP.applyAppearanceSettings(settings);
        }
    }

    function saveSettings() {
        const settings = collectSettings();
        const validationError = validateSettings(settings);

        if (validationError) {
            showStatus(validationError, 'error');
            return;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        applyAppearance(settings);
        showStatus('Settings saved successfully.', 'success');
    }

    function resetSettings() {
        localStorage.removeItem(STORAGE_KEY);
        applySettings(structuredClone(DEFAULTS));
        els.currentPassword.value = '';
        els.newPassword.value = '';
        els.confirmPassword.value = '';
        showStatus('Settings reset to defaults.', 'success');
    }

    function updatePassword() {
        const currentPassword = els.currentPassword.value.trim();
        const newPassword = els.newPassword.value.trim();
        const confirmPassword = els.confirmPassword.value.trim();

        if (!currentPassword || !newPassword || !confirmPassword) {
            showStatus('Fill in all password fields.', 'error');
            return;
        }

        if (newPassword.length < 8) {
            showStatus('New password must be at least 8 characters.', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showStatus('New password and confirmation do not match.', 'error');
            return;
        }

        els.currentPassword.value = '';
        els.newPassword.value = '';
        els.confirmPassword.value = '';
        showStatus('Password updated successfully.', 'success');
    }

    els.saveBtn.addEventListener('click', saveSettings);
    els.resetBtn.addEventListener('click', resetSettings);
    els.updatePasswordBtn.addEventListener('click', updatePassword);

    const liveAppearanceFields = [
        toggleMap.compactSidebar,
        toggleMap.showTimer,
        toggleMap.darkMode
    ];

    liveAppearanceFields.forEach(field => {
        field.addEventListener('click', function () {
            setTimeout(() => applyAppearance(collectSettings()), 0);
        });
        field.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                setTimeout(() => applyAppearance(collectSettings()), 0);
            }
        });
    });

    applySettings(loadSavedSettings());
    refreshIcons();
})();
