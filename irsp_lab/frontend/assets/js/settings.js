(function () {
    const STORAGE_KEY = "irsp-preferences";

    const elements = {
        displayName: document.getElementById("display-name"),
        email: document.getElementById("email"),
        organization: document.getElementById("organization"),
        role: document.getElementById("role"),
        themeMode: document.getElementById("theme-mode"),
        themeCaption: document.getElementById("theme-toggle-caption"),
        saveButton: document.getElementById("save-settings-btn"),
        resetButton: document.getElementById("reset-settings-btn"),
        status: document.getElementById("settings-status"),
    };

    const defaults = {
        theme: "light",
    };

    function token() {
        return window.localStorage.getItem("irsp-access-token") || "";
    }

    function authHeaders() {
        return {
            Authorization: `Bearer ${token()}`,
        };
    }

    function setStatus(message, isError) {
        elements.status.textContent = message;
        elements.status.style.color = isError ? "var(--red)" : "var(--muted)";
    }

    function loadPreferences() {
        try {
            const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
            return { ...defaults, ...parsed };
        } catch (error) {
            return { ...defaults };
        }
    }

    function applyPreferences(prefs) {
        const theme = prefs.theme === "dark" ? "dark" : "light";
        elements.themeMode.dataset.theme = theme;
        elements.themeMode.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
        if (elements.themeCaption) {
            elements.themeCaption.textContent = theme === "dark" ? "Dark mode" : "Light mode";
        }
        if (window.IRSP && typeof window.IRSP.applyTheme === "function") {
            window.IRSP.applyTheme(theme);
        }
    }

    function collectPreferences() {
        return {
            theme: elements.themeMode.dataset.theme === "dark" ? "dark" : "light",
        };
    }

    async function loadUserProfile() {
        const response = await fetch(`${window.IRSP_CONFIG.apiBaseUrl}/auth/me/`, { headers: authHeaders() });
        if (!response.ok) {
            throw new Error("Unable to load user profile");
        }
        const user = await response.json();
        elements.displayName.value = user.full_name || "";
        elements.email.value = user.email || "";
        elements.organization.value = user.organization || "";
        elements.role.value = user.role || "";
    }

    function savePreferences() {
        const prefs = collectPreferences();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        applyPreferences(prefs);
        setStatus("Settings saved.", false);
    }

    function resetPreferences() {
        window.localStorage.removeItem(STORAGE_KEY);
        applyPreferences({ ...defaults });
        setStatus("Settings reset to defaults.", false);
    }

    async function init() {
        try {
            applyPreferences(loadPreferences());
            await loadUserProfile();
            setStatus("Settings ready.", false);
        } catch (error) {
            setStatus(error.message, true);
        }
    }

    elements.saveButton.addEventListener("click", savePreferences);
    elements.resetButton.addEventListener("click", resetPreferences);
    elements.themeMode.addEventListener("click", () => {
        const next = elements.themeMode.dataset.theme === "dark" ? "light" : "dark";
        applyPreferences({ theme: next });
    });

    document.addEventListener("DOMContentLoaded", init);
})();
