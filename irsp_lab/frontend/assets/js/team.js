(function () {
    const subtitle = document.getElementById("team-subtitle");
    const teamSize = document.getElementById("team-size");
    const myRank = document.getElementById("my-rank");
    const myGroup = document.getElementById("my-group");
    const tableBody = document.getElementById("team-table-body");

    const AVATAR_COLORS = ["#2563eb", "#0891b2", "#7c3aed", "#db2777", "#16a34a", "#ea580c", "#0f766e"];

    function token() {
        return window.localStorage.getItem("irsp-access-token") || "";
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function authHeaders() {
        return {
            Authorization: `Bearer ${token()}`,
        };
    }

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    function labBreakdownText(breakdown) {
        if (!Array.isArray(breakdown) || !breakdown.length) return "";
        const labels = { "lab-a": "Lab A", "lab-b": "Lab B" };
        return breakdown
            .map((item) => `${labels[item.lab_name] || item.lab_name}: ${Math.round(item.average_score)}%`)
            .join(" &middot; ");
    }

    function initials(name) {
        const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "?";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function colorFor(name) {
        let hash = 0;
        const str = String(name || "");
        for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
        return AVATAR_COLORS[hash % AVATAR_COLORS.length];
    }

    function avatarHtml(name) {
        const label = name || "?";
        return `<div class="team-avatar" style="background:${colorFor(label)}" title="${escapeHtml(label)}">${escapeHtml(initials(label))}</div>`;
    }

    function renderRows(members) {
        if (!members.length) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="7">No team members found.</td></tr>';
            return;
        }
        tableBody.innerHTML = members.map((member) => {
            const name = member.full_name || member.email;
            const breakdown = labBreakdownText(member.lab_breakdown);
            const rankText = member.rank ? `#${member.rank}` : "-";
            return `
                <tr>
                    <td>${avatarHtml(name)}</td>
                    <td>${escapeHtml(name)}</td>
                    <td>${escapeHtml(member.role || "-")}</td>
                    <td>${escapeHtml(String(member.sessions_completed || 0))}</td>
                    <td>${escapeHtml(`${Math.round(Number(member.average_score) || 0)}%`)}${breakdown ? `<br><span style="font-size:.76rem;color:var(--muted);font-weight:600;">${breakdown}</span>` : ""}</td>
                    <td>${escapeHtml(rankText)}</td>
                    <td>${member.organization ? `<span class="pill">${escapeHtml(member.organization)}</span>` : "-"}</td>
                </tr>
            `;
        }).join("");
    }

    async function loadTeam() {
        try {
            subtitle.textContent = "Loading team statistics.";
            const response = await fetch(`${window.IRSP_CONFIG.apiBaseUrl}/scenarios/sessions/team-statistics/`, { headers: authHeaders() });
            if (!response.ok) {
                throw new Error("Failed to load team statistics");
            }
            const payload = await response.json();
            teamSize.textContent = String(payload.team_size || 0);
            myRank.textContent = payload.my_rank ? `#${payload.my_rank}` : "-";
            myGroup.textContent = payload.organization || "-";
            subtitle.textContent = payload.viewer_role === "manager"
                ? "Every group's performance overview"
                : "Your group's performance overview";
            renderRows(Array.isArray(payload.members) ? payload.members : []);
            refreshIcons();
        } catch (error) {
            subtitle.textContent = error.message;
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="7">Unable to load team data.</td></tr>';
        }
    }

    let lastLoadAt = 0;
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;
        if (Date.now() - lastLoadAt < 2000) return;
        lastLoadAt = Date.now();
        loadTeam();
    });

    document.addEventListener("DOMContentLoaded", () => {
        lastLoadAt = Date.now();
        loadTeam();
    });
})();
