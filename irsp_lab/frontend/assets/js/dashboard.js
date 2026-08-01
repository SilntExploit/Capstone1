(function () {
    const completedCount = document.getElementById("completed-count");
    const completionRate = document.getElementById("completion-rate");
    const averageScore = document.getElementById("average-score");

    // Completion is the average of each lab's stage-completion percent;
    // an unstarted lab counts as 0%.
    const ALL_LABS = ["lab-a", "lab-b"];

    // Best attempt per lab (else 0%), averaged across ALL_LABS.
    function computeCompletionRate(completions) {
        const bestByLab = {};
        completions.forEach((item) => {
            const labName = item.lab_name;
            if (!labName || !item.total_stages) return;
            const pct = (Number(item.stages_completed) / Number(item.total_stages)) * 100;
            if (!(labName in bestByLab) || pct > bestByLab[labName]) {
                bestByLab[labName] = pct;
            }
        });
        const perLabPercents = ALL_LABS.map((lab) => bestByLab[lab] || 0);
        return Math.round(perLabPercents.reduce((sum, pct) => sum + pct, 0) / perLabPercents.length);
    }
    const latestDate = document.getElementById("latest-date");
    const avgTime = document.getElementById("avg-time");
    const latestStanding = document.getElementById("latest-standing");
    const latestProgress = document.getElementById("latest-progress");
    const summary = document.getElementById("dashboard-summary");
    const recentBody = document.getElementById("recent-labs-body");
    const refreshButton = document.getElementById("refresh-dashboard-btn");
    const ring = document.querySelector(".progress-ring");
    const ringValue = document.getElementById("score-ring-value");
    const performanceTitle = document.getElementById("performance-title");
    const performanceCopy = document.getElementById("performance-copy");

    function token() {
        return window.localStorage.getItem("irsp-access-token") || "";
    }

    function authHeaders() {
        const headers = { "Content-Type": "application/json" };
        const t = token();
        // Only send Authorization when a real token exists. A malformed
        // "Bearer " header would otherwise trigger a 401 even on open endpoints.
        if (t) {
            headers.Authorization = `Bearer ${t}`;
        }
        return headers;
    }

    function apiBase() {
        return (window.IRSP_CONFIG && window.IRSP_CONFIG.apiBaseUrl) || "/api";
    }

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatPercent(value) {
        const n = Number(value) || 0;
        return `${Math.round(n)}%`;
    }

    function formatDate(value) {
        if (!value) {
            return "-";
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return "-";
        }
        return parsed.toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function formatDuration(seconds) {
        const total = Math.max(0, Math.round(Number(seconds) || 0));
        const minutes = Math.floor(total / 60);
        const secs = total % 60;
        if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        }
        return `${secs}s`;
    }

    function setRing(percent) {
        const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
        const degrees = Math.round((safePercent / 100) * 360);
        ring.style.setProperty("--ring-deg", `${degrees}deg`);
        ringValue.textContent = formatPercent(safePercent);
    }

    function renderRecentLabs(completions) {
        if (!completions.length) {
            recentBody.innerHTML = '<tr class="empty-row"><td colspan="7">No completed labs found.</td></tr>';
            return;
        }

        recentBody.innerHTML = completions.slice(0, 8).map((item) => {
            const progress = item.progress_display
                || (item.stages_completed != null && item.total_stages != null
                    ? `${item.stages_completed}/${item.total_stages} stages`
                    : "-");
            const standing = item.standing || "-";
            const labName = item.lab_name || "-";
            const reviewUrl = `lab-review.html?id=${encodeURIComponent(item.id)}`;
            return `
            <tr class="lab-result-row" data-id="${escapeHtml(String(item.id))}" title="Click to view MITRE ATT&CK coverage">
                <td>${escapeHtml(formatDate(item.completed_at))}</td>
                <td>${escapeHtml(item.username)}</td>
                <td>${escapeHtml(labName)}</td>
                <td>${escapeHtml(item.time_taken_display || formatDuration(item.time_taken))}</td>
                <td>${escapeHtml(progress)}</td>
                <td><a class="status-badge green score-pill score-link" href="${reviewUrl}">${escapeHtml(formatPercent(item.total_score))}</a></td>
                <td>${escapeHtml(standing)}</td>
            </tr>`;
        }).join("");

        // Whole row is clickable → open the MITRE coverage review page.
        recentBody.querySelectorAll(".lab-result-row").forEach((row) => {
            row.style.cursor = "pointer";
            row.addEventListener("click", (e) => {
                if (e.target.closest("a")) return; // let the score link handle itself
                const id = row.getAttribute("data-id");
                if (id) window.location.href = `lab-review.html?id=${encodeURIComponent(id)}`;
            });
        });
    }

    function render(data) {
        const completions = Array.isArray(data.completions) ? data.completions : [];
        const completed = Number(data.completed_count) || completions.length;
        const avgScore = Number(data.average_score) || 0;
        const completionPct = computeCompletionRate(completions);
        const latest = completions[0] || null;

        completedCount.textContent = String(completed);
        completionRate.textContent = `${completionPct}%`;
        averageScore.textContent = formatPercent(avgScore);
        latestDate.textContent = latest ? formatDate(latest.completed_at) : "-";
        avgTime.textContent = completed ? formatDuration(data.average_time_taken) : "-";
        if (latestStanding) {
            latestStanding.textContent = latest ? (latest.standing || data.latest_standing || "-") : "-";
        }
        if (latestProgress) {
            latestProgress.textContent = latest
                ? (latest.progress_display || data.latest_progress
                    || `${latest.stages_completed}/${latest.total_stages} stages`)
                : "-";
        }
        setRing(avgScore);

        if (completed > 0) {
            performanceTitle.textContent = `${completed} completed lab${completed === 1 ? "" : "s"}`;
            performanceCopy.textContent = `Latest completion by ${latest.username} with a score of ${formatPercent(latest.total_score)} in ${formatDuration(latest.time_taken)}.`;
            summary.textContent = `Total completed labs: ${completed}. Labs completion: ${completionPct}%. Average score: ${formatPercent(avgScore)}.`;
        } else {
            performanceTitle.textContent = "No completed labs yet";
            performanceCopy.textContent = "Complete a lab and submit a score to see your dashboard update.";
            summary.textContent = "No completed lab records were found for this user.";
        }

        renderRecentLabs(completions);
        refreshIcons();
    }

    async function loadDashboard() {
        try {
            summary.textContent = "Loading dashboard data.";
            recentBody.innerHTML = '<tr class="empty-row"><td colspan="7">Loading completed labs...</td></tr>';

            // Identify the current user so we can scope lab scores to them.
            let username = "";
            try {
                const meResponse = await fetch(`${apiBase()}/auth/me/`, { headers: authHeaders() });
                if (meResponse.ok) {
                    const me = await meResponse.json();
                    username = me.email || "";
                }
            } catch (profileError) {
                // Non-fatal: fall back to showing all lab scores.
            }

            const query = username ? `?username=${encodeURIComponent(username)}` : "";
            const response = await fetch(`${apiBase()}/lab-scores/summary/${query}`, {
                headers: authHeaders(),
            });
            if (!response.ok) {
                throw new Error("Unable to load lab scores. Check that you are logged in and the backend is running.");
            }
            const data = await response.json();
            render(data);
        } catch (error) {
            summary.textContent = error.message;
            completedCount.textContent = "0";
            completionRate.textContent = "0%";
            averageScore.textContent = "0%";
            latestDate.textContent = "-";
            avgTime.textContent = "-";
            if (latestStanding) latestStanding.textContent = "-";
            if (latestProgress) latestProgress.textContent = "-";
            setRing(0);
            recentBody.innerHTML = '<tr class="empty-row"><td colspan="7">Unable to load dashboard data.</td></tr>';
            refreshIcons();
        }
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", loadDashboard);
    }

    // Labs launch in a separate kiosk popup window, so the Dashboard tab
    // stays open in the background the whole time - without this, it would
    // keep showing stale numbers after a lab is completed elsewhere until
    // manually reloaded.
    let lastLoadAt = 0;
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;
        if (Date.now() - lastLoadAt < 2000) return; // avoid refetching on rapid tab-switching
        lastLoadAt = Date.now();
        loadDashboard();
    });

    document.addEventListener("DOMContentLoaded", () => {
        lastLoadAt = Date.now();
        loadDashboard();
    });
})();
