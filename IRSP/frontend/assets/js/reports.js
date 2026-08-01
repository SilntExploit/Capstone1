(function () {
    const statSessions = document.getElementById("stat-sessions");
    const statAverageScore = document.getElementById("stat-average-score");
    const summary = document.getElementById("reports-summary");
    const searchInput = document.getElementById("search-input");
    const statusFilter = document.getElementById("status-filter");
    const scopeFilter = document.getElementById("scope-filter");
    const refreshButton = document.getElementById("refresh-report-btn");
    const downloadButton = document.getElementById("download-report-btn");
    const tableBody = document.getElementById("sessions-table-body");

    let currentUser = null;
    let reportData = { sessions: [], metrics: {}, response_coverage: [] };

    function cleanLabTitle(value) {
        return String(value || "Untitled Lab").replace(/scenario/gi, "Lab");
    }

    function token() {
        return window.localStorage.getItem("irsp-access-token") || "";
    }

    function authHeaders() {
        return {
            Authorization: `Bearer ${token()}`,
            "Content-Type": "application/json",
        };
    }

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatDate(value) {
        if (!value) {
            return "-";
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return "-";
        }
        return parsed.toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    function formatPercent(value) {
        const n = Number(value) || 0;
        return `${Math.round(n)}%`;
    }

    function visibleSessions() {
        const query = searchInput.value.trim().toLowerCase();
        const statusValue = statusFilter.value;
        return reportData.sessions.filter((item) => {
            const matchesStatus = statusValue === "all" || item.status === statusValue;
            const text = `${cleanLabTitle(item.lab || item.scenario)} ${item.user_full_name} ${item.user_email} ${item.status}`.toLowerCase();
            const matchesSearch = !query || text.includes(query);
            return matchesStatus && matchesSearch;
        });
    }

    function renderMetrics() {
        statSessions.textContent = String(reportData.metrics.sessions || 0);
        statAverageScore.textContent = formatPercent(reportData.metrics.average_score || 0);
    }

    function renderSummary(items) {
        if (!items.length) {
            summary.textContent = "No sessions match the current filters.";
            return;
        }
        const best = Math.max(...items.map((item) => Number(item.scores.total) || 0));
        const avgProgress = Math.round(items.reduce((acc, item) => acc + (Number(item.progress_percent) || 0), 0) / items.length);
        summary.textContent = `${items.length} sessions shown · Best score ${Math.round(best)}% · Average progress ${avgProgress}%`;
    }

    function renderTable() {
        const items = visibleSessions();
        if (!items.length) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No sessions found.</td></tr>';
            renderSummary(items);
            return;
        }
        tableBody.innerHTML = items.map((item) => `
            <tr>
                <td>${escapeHtml(formatDate(item.completed_at || item.started_at))}</td>
                <td>${escapeHtml(item.user_full_name || item.user_email)}</td>
                <td>${escapeHtml(cleanLabTitle(item.lab || item.scenario))}</td>
                <td><span class="status-badge ${item.status === "completed" ? "green" : "yellow"}">${escapeHtml(item.status.replaceAll("_", " "))}</span></td>
                <td>${escapeHtml(formatPercent(item.scores.total))}</td>
                <td>${escapeHtml(formatPercent(item.progress_percent))}</td>
            </tr>
        `).join("");
        renderSummary(items);
    }

    function renderAll() {
        renderMetrics();
        renderTable();
    }

    async function fetchCurrentUser() {
        const response = await fetch(`${window.IRSP_CONFIG.apiBaseUrl}/auth/me/`, { headers: authHeaders() });
        if (!response.ok) {
            throw new Error("Unable to load user profile");
        }
        currentUser = await response.json();
    }

    async function fetchReports() {
        const includeProgress = scopeFilter.value === "all";
        const response = await fetch(`${window.IRSP_CONFIG.apiBaseUrl}/scenarios/sessions/reports/?include_in_progress=${includeProgress}`, {
            headers: authHeaders(),
        });
        if (!response.ok) {
            throw new Error("Unable to load report data");
        }
        reportData = await response.json();
    }

    function cleanLabName(labName) {
        return labName === "lab-a" ? "Lab A - Ransomware Containment"
            : labName === "lab-b" ? "Lab B - Endpoint Investigation"
            : labName || "Lab";
    }

    // PDF design system, shared by the individual and team reports.
    const PDF = {
        blue: [37, 99, 235],
        cyan: [6, 182, 212],
        purple: [124, 58, 237],
        dark: [15, 23, 42],
        gray: [100, 116, 139],
        lightGray: [226, 232, 240],
        paleBg: [244, 247, 251],
        green: [22, 163, 74],
        amber: [217, 119, 6],
        red: [220, 38, 38],
        white: [255, 255, 255],
        pageWidth: 210,
        pageHeight: 297,
        margin: 16,
    };

    function pdfScoreColor(score) {
        if (score >= 80) return PDF.green;
        if (score >= 55) return PDF.amber;
        return PDF.red;
    }

    function pdfNewPage(doc, state) {
        doc.addPage();
        state.page += 1;
        state.justPaginated = true;
        pdfFooter(doc, state);
        return PDF.margin + 4;
    }

    function pdfEnsureSpace(doc, state, y, needed) {
        if (y + needed > PDF.pageHeight - 24) {
            return pdfNewPage(doc, state);
        }
        return y;
    }

    function pdfHeader(doc, state, title, subtitle) {
        // Gradient-ish header band (jsPDF has no native gradients, so fade
        // brand blue into cyan across a handful of thin strips).
        const steps = 24;
        const bandHeight = 34;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const r = Math.round(PDF.blue[0] + (PDF.cyan[0] - PDF.blue[0]) * t);
            const g = Math.round(PDF.blue[1] + (PDF.cyan[1] - PDF.blue[1]) * t);
            const b = Math.round(PDF.blue[2] + (PDF.cyan[2] - PDF.blue[2]) * t);
            doc.setFillColor(r, g, b);
            doc.rect((PDF.pageWidth / steps) * i, 0, PDF.pageWidth / steps + 0.5, bandHeight, "F");
        }

        // Logo badge - a rounded shield-ish mark with "IR" mark, white on brand.
        doc.setFillColor(...PDF.white);
        doc.roundedRect(PDF.margin, 9, 15, 15, 3.5, 3.5, "F");
        doc.setTextColor(...PDF.blue);
        doc.setFontSize(11);
        doc.setFont('helvetica', "bold");
        doc.text("IR", PDF.margin + 7.5, 18.5, { align: "center" });

        doc.setTextColor(...PDF.white);
        doc.setFontSize(17);
        doc.setFont('helvetica', "bold");
        doc.text("IRSP", PDF.margin + 20, 15);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', "normal");
        doc.text("Incident Response Simulation Platform", PDF.margin + 20, 20.5);

        doc.setFontSize(13);
        doc.setFont('helvetica', "bold");
        doc.text(title, PDF.margin, 44);
        doc.setTextColor(...PDF.gray);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', "normal");
        doc.text(subtitle, PDF.margin, 50);

        doc.setDrawColor(...PDF.lightGray);
        doc.setLineWidth(0.3);
        doc.line(PDF.margin, 54, PDF.pageWidth - PDF.margin, 54);

        return 62;
    }

    function pdfFooter(doc, state) {
        doc.setDrawColor(...PDF.lightGray);
        doc.setLineWidth(0.3);
        doc.line(PDF.margin, PDF.pageHeight - 18, PDF.pageWidth - PDF.margin, PDF.pageHeight - 18);
        doc.setFontSize(7.5);
        doc.setTextColor(...PDF.gray);
        doc.setFont('helvetica', "normal");
        doc.text("IRSP - Incident Response Simulation Platform", PDF.margin, PDF.pageHeight - 12);
        doc.text(`Page ${state.page}`, PDF.pageWidth - PDF.margin, PDF.pageHeight - 12, { align: "right" });
    }

    function pdfSectionTitle(doc, x, y, text) {
        doc.setFillColor(...PDF.blue);
        doc.rect(x, y - 3.6, 1.3, 4.6, "F");
        doc.setTextColor(...PDF.dark);
        doc.setFontSize(11);
        doc.setFont('helvetica', "bold");
        doc.text(text, x + 4, y);
        return y + 7;
    }

    function pdfStatCard(doc, x, y, w, label, value, accentColor) {
        doc.setFillColor(...PDF.paleBg);
        doc.roundedRect(x, y, w, 20, 2, 2, "F");
        doc.setDrawColor(...(accentColor || PDF.lightGray));
        doc.setLineWidth(0.6);
        doc.line(x, y, x, y + 20);
        doc.setTextColor(...PDF.gray);
        doc.setFontSize(7);
        doc.setFont('helvetica', "bold");
        doc.text(label.toUpperCase(), x + 4, y + 7);
        doc.setTextColor(...PDF.dark);
        doc.setFontSize(13);
        doc.setFont('helvetica', "bold");
        doc.text(String(value), x + 4, y + 15.5);
    }

    function pdfScoreBadge(doc, x, y, score) {
        const color = pdfScoreColor(score);
        doc.setFillColor(...color);
        doc.roundedRect(x, y, 30, 20, 2.5, 2.5, "F");
        doc.setTextColor(...PDF.white);
        doc.setFontSize(14);
        doc.setFont('helvetica', "bold");
        doc.text(`${Math.round(score)}%`, x + 15, y + 13, { align: "center" });
    }

    function pdfTableHeader(doc, x, y, columns) {
        const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
        doc.setFillColor(...PDF.dark);
        doc.rect(x, y, totalWidth, 7.5, "F");
        doc.setTextColor(...PDF.white);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', "bold");
        let cx = x + 2.5;
        columns.forEach((col) => {
            doc.text(col.label.toUpperCase(), cx, y + 5.2);
            cx += col.width;
        });
        return y + 7.5;
    }

    function pdfTableRow(doc, x, y, columns, values, altShade) {
        const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
        if (altShade) {
            doc.setFillColor(...PDF.paleBg);
            doc.rect(x, y, totalWidth, 8, "F");
        }
        doc.setTextColor(...PDF.dark);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', "normal");
        let cx = x + 2.5;
        columns.forEach((col, i) => {
            const text = String(values[i] ?? "-");
            doc.text(text, cx, y + 5.4, { maxWidth: col.width - 3 });
            cx += col.width;
        });
        return y + 8;
    }

    async function downloadMyPdf() {
        summary.textContent = "Building your report...";
        let payload;
        try {
            const response = await fetch(`${window.IRSP_CONFIG.apiBaseUrl}/lab-scores/summary/?username=${encodeURIComponent(currentUser.email)}`, {
                headers: authHeaders(),
            });
            if (!response.ok) throw new Error("Unable to load your scores");
            payload = await response.json();
        } catch (error) {
            summary.textContent = "Could not build your report. Try again.";
            return;
        }

        const completions = Array.isArray(payload.completions) ? payload.completions : [];
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const state = { page: 1, justPaginated: false };

        let y = pdfHeader(doc, state, "Individual Performance Report", `${currentUser.full_name || currentUser.email} · Generated ${new Date().toLocaleString()}`);

        const cardWidth = (PDF.pageWidth - PDF.margin * 2 - 12) / 3;
        pdfStatCard(doc, PDF.margin, y, cardWidth, "Organization", currentUser.organization || "-", PDF.blue);
        pdfStatCard(doc, PDF.margin + cardWidth + 6, y, cardWidth, "Labs Completed", payload.completed_count || 0, PDF.cyan);
        pdfScoreBadge(doc, PDF.margin + (cardWidth + 6) * 2 + (cardWidth - 30), y, Number(payload.average_score) || 0);
        doc.setTextColor(...PDF.gray);
        doc.setFontSize(7);
        doc.setFont('helvetica', "bold");
        doc.text("AVERAGE SCORE", PDF.margin + (cardWidth + 6) * 2 + (cardWidth - 30), y + 26);
        y += 32;

        y = pdfSectionTitle(doc, PDF.margin, y, "Lab Results");

        if (!completions.length) {
            doc.setTextColor(...PDF.gray);
            doc.setFontSize(9.5);
            doc.setFont('helvetica', "normal");
            doc.text("No completed labs yet.", PDF.margin, y + 4);
        }

        completions.forEach((item, index) => {
            y = pdfEnsureSpace(doc, state, y, 34);
            const score = Number(item.total_score) || 0;

            doc.setFillColor(...PDF.paleBg);
            doc.roundedRect(PDF.margin, y, PDF.pageWidth - PDF.margin * 2, 28, 2, 2, "F");

            doc.setTextColor(...PDF.dark);
            doc.setFontSize(10.5);
            doc.setFont('helvetica', "bold");
            doc.text(cleanLabName(item.lab_name), PDF.margin + 5, y + 8);

            doc.setTextColor(...PDF.gray);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', "normal");
            doc.text(`Standing: ${item.standing || "-"}   |   Progress: ${item.stages_completed}/${item.total_stages} stages   |   Completed ${formatDate(item.completed_at)}`, PDF.margin + 5, y + 14.5);

            let coverage = [];
            try { coverage = JSON.parse(item.mitre_coverage || "[]"); } catch (e) { coverage = []; }
            const correct = coverage.filter((c) => c.status === "correct").length;
            if (coverage.length) {
                doc.text(`MITRE ATT&CK coverage: ${correct}/${coverage.length} techniques correctly identified`, PDF.margin + 5, y + 21);
            }

            pdfScoreBadge(doc, PDF.pageWidth - PDF.margin - 32, y + 4, score);
            y += 34;
        });

        pdfFooter(doc, state);
        doc.save(`irsp-my-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    function downloadPdf() {
        if (!currentUser) {
            return;
        }
        if (currentUser.role !== "manager") {
            downloadMyPdf();
            return;
        }

        const sessions = visibleSessions();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const state = { page: 1, justPaginated: false };

        let y = pdfHeader(doc, state, "Team Performance Report", `Prepared by ${currentUser.full_name || currentUser.email} · Generated ${new Date().toLocaleString()}`);

        const cardWidth = (PDF.pageWidth - PDF.margin * 2 - 12) / 3;
        pdfStatCard(doc, PDF.margin, y, cardWidth, "Organization", currentUser.organization || "-", PDF.blue);
        pdfStatCard(doc, PDF.margin + cardWidth + 6, y, cardWidth, "Sessions Included", sessions.length, PDF.cyan);
        pdfScoreBadge(doc, PDF.margin + (cardWidth + 6) * 2 + (cardWidth - 30), y, Number(reportData.metrics.average_score) || 0);
        doc.setTextColor(...PDF.gray);
        doc.setFontSize(7);
        doc.setFont('helvetica', "bold");
        doc.text("TEAM AVERAGE", PDF.margin + (cardWidth + 6) * 2 + (cardWidth - 30), y + 26);
        y += 32;

        y = pdfSectionTitle(doc, PDF.margin, y, "Session Summary");

        const columns = [
            { label: "Trainee", width: 44 },
            { label: "Lab", width: 46 },
            { label: "Status", width: 26 },
            { label: "Score", width: 20 },
            { label: "Progress", width: 24 },
        ];
        y = pdfEnsureSpace(doc, state, y, 20);
        y = pdfTableHeader(doc, PDF.margin, y, columns);

        if (!sessions.length) {
            doc.setTextColor(...PDF.gray);
            doc.setFontSize(9);
            doc.setFont('helvetica', "normal");
            doc.text("No sessions match the current filters.", PDF.margin + 3, y + 6);
            y += 10;
        }

        sessions.forEach((item, index) => {
            y = pdfEnsureSpace(doc, state, y, 9);
            if (state.justPaginated) {
                y = pdfTableHeader(doc, PDF.margin, y, columns);
                state.justPaginated = false;
            }
            y = pdfTableRow(doc, PDF.margin, y, columns, [
                item.user_full_name || item.user_email,
                cleanLabTitle(item.lab || item.scenario),
                item.status.replaceAll("_", " "),
                formatPercent(item.scores.total),
                formatPercent(item.progress_percent),
            ], index % 2 === 1);
        });

        pdfFooter(doc, state);
        doc.save(`irsp-team-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    async function load() {
        try {
            summary.textContent = "Loading reports.";
            await fetchCurrentUser();
            await fetchReports();
            renderAll();
            if (downloadButton) {
                downloadButton.innerHTML = currentUser && currentUser.role === "manager"
                    ? '<i data-lucide="download"></i> Download Team PDF'
                    : '<i data-lucide="download"></i> Download My PDF';
            }
            refreshIcons();
        } catch (error) {
            summary.textContent = error.message;
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Unable to load report data.</td></tr>';
        }
    }

    searchInput.addEventListener("input", renderAll);
    statusFilter.addEventListener("change", renderAll);
    scopeFilter.addEventListener("change", load);
    refreshButton.addEventListener("click", load);
    downloadButton.addEventListener("click", downloadPdf);

    let lastLoadAt = 0;
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;
        if (Date.now() - lastLoadAt < 2000) return;
        lastLoadAt = Date.now();
        load();
    });

    document.addEventListener("DOMContentLoaded", () => {
        lastLoadAt = Date.now();
        load();
    });
})();
