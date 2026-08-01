/* Lab MITRE ATT&CK review page logic.
   Fetches a single lab completion by id, parses its stored per-question MITRE
   coverage JSON, and renders it grouped by outcome. Read-only. */
(function () {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const body    = document.getElementById("review-body");
    const meta    = document.getElementById("review-meta");
    const pills    = document.getElementById("coverage-pills");
    const titleEl = document.getElementById("review-title");
    const barEl   = document.getElementById("coverage-bar");
    const legendEl= document.getElementById("coverage-legend");

    function apiBase() {
        return (window.IRSP_CONFIG && window.IRSP_CONFIG.apiBaseUrl) || "/api";
    }

    function authHeaders() {
        const headers = { "Content-Type": "application/json" };
        try {
            const t = window.localStorage.getItem("irsp-access-token");
            if (t) headers.Authorization = `Bearer ${t}`;
        } catch (e) { /* ignore */ }
        return headers;
    }

    function esc(value) {
        return String(value == null ? "" : value)
            .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    }

    function fmtDate(value) {
        if (!value) return "-";
        const d = new Date(value);
        return isNaN(d.getTime()) ? esc(value) : d.toLocaleString([], {
            year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
        });
    }

    function fmtDuration(seconds) {
        const total = Math.max(0, Math.round(Number(seconds) || 0));
        const m = Math.floor(total / 60), s = total % 60;
        return m ? `${m}m ${s}s` : `${s}s`;
    }

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    function render(item) {
        titleEl.textContent = `${item.lab_name || "Lab"} — ${item.username || "responder"}`;
        meta.innerHTML =
            `<span class="pill"><i data-lucide="calendar-check"></i> Completed: <strong>${fmtDate(item.completed_at)}</strong></span>` +
            `<span class="pill"><i data-lucide="target"></i> Score: <strong>${esc(Math.round(item.total_score))} / 100</strong></span>` +
            `<span class="pill"><i data-lucide="award"></i> Standing: <strong>${esc(item.standing || "-")}</strong></span>` +
            `<span class="pill"><i data-lucide="timer"></i> Time: <strong>${esc(item.time_taken_display || fmtDuration(item.time_taken))}</strong></span>`;

        let coverage = [];
        try { coverage = JSON.parse(item.mitre_coverage || "[]"); } catch (e) { coverage = []; }

        if (!Array.isArray(coverage) || !coverage.length) {
            pills.innerHTML = '<span class="tactic-pill empty">No coverage recorded</span>';
            barEl.style.display = "none";
            legendEl.style.display = "none";
            body.innerHTML = '<div class="review-empty">No MITRE ATT&CK data was recorded for this lab attempt.<br>' +
                '(Completions saved before this feature was added will not have coverage data.)</div>';
            refreshIcons();
            return;
        }

        const tactics = new Set();
        let nOk = 0, nBad = 0, nMiss = 0;
        let okBad = "";
        let missed = "";

        coverage.forEach((c) => {
            const label = c.code
                ? `<span class="code">${esc(c.code)}</span> — ${esc(c.name)}`
                : esc(c.name || "—");
            const tactic = c.tactic ? ` &middot; Tactic: <strong>${esc(c.tactic)}</strong>` : "";

            if (c.status === "correct") {
                nOk++; if (c.tactic) tactics.add(c.tactic);
                okBad += `<div class="mitre-item ok"><div class="row1">` +
                    `<span class="q-title">Q${esc(c.q)}: ${esc(c.title)}</span>` +
                    `<span class="status-badge green"><i data-lucide="check-circle"></i> Correct</span></div>` +
                    `<div class="method">Technique: ${label}${tactic}</div></div>`;
            } else if (c.status === "incorrect") {
                nBad++; if (c.tactic) tactics.add(c.tactic);
                okBad += `<div class="mitre-item bad"><div class="row1">` +
                    `<span class="q-title">Q${esc(c.q)}: ${esc(c.title)}</span>` +
                    `<span class="status-badge yellow"><i data-lucide="alert-triangle"></i> Attempted</span></div>` +
                    `<div class="method">Technique: ${label}${tactic}</div></div>`;
            } else {
                nMiss++;
                missed += `<div class="mitre-item miss"><div class="row1">` +
                    `<span class="q-title">Q${esc(c.q)}: ${esc(c.title)}</span>` +
                    `<span class="status-badge"><i data-lucide="minus-circle"></i> Not attempted</span></div>` +
                    `<div class="method">Technique missed: ${label}${tactic}</div></div>`;
            }
        });

        // Tactic summary pills
        pills.innerHTML = tactics.size
            ? Array.from(tactics).map((t) => `<span class="tactic-pill"><i data-lucide="crosshair"></i> ${esc(t)}</span>`).join("")
            : '<span class="tactic-pill empty">No tactics investigated</span>';

        // Coverage bar
        const total = coverage.length || 1;
        barEl.style.display = "flex";
        legendEl.style.display = "flex";
        barEl.innerHTML =
            `<span class="seg-ok" style="width:${(nOk / total) * 100}%"></span>` +
            `<span class="seg-bad" style="width:${(nBad / total) * 100}%"></span>` +
            `<span class="seg-miss" style="width:${(nMiss / total) * 100}%"></span>`;
        legendEl.innerHTML =
            `<span><i class="dot-ok"></i>Correct (${nOk})</span>` +
            `<span><i class="dot-bad"></i>Attempted (${nBad})</span>` +
            `<span><i class="dot-miss"></i>Not attempted (${nMiss})</span>`;

        body.innerHTML =
            `<div class="mitre-list">${okBad || '<div class="review-empty">No techniques were investigated.</div>'}</div>` +
            (missed
                ? `<h3 class="section-heading"><i data-lucide="search-x"></i> Techniques not investigated</h3>` +
                  `<div class="mitre-list">${missed}</div>`
                : "");
        refreshIcons();
    }

    async function load() {
        if (!id) {
            body.innerHTML = '<div class="review-error">No lab id provided. Return to the dashboard and click a lab score.</div>';
            return;
        }
        try {
            const res = await fetch(`${apiBase()}/lab-scores/${encodeURIComponent(id)}/`, { headers: authHeaders() });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const item = await res.json();
            render(item);
        } catch (e) {
            body.innerHTML = `<div class="review-error">Could not load this lab review (${esc(e.message)}). ` +
                `Make sure you are logged in and the backend is running.</div>`;
            refreshIcons();
        }
    }

    document.addEventListener("DOMContentLoaded", load);
})();
