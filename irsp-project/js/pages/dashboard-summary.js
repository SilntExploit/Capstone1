(function () {
    'use strict';

    const REPORT_KEYS = ['irsp-scenario-a-report', 'irsp-scenario-b-report'];
    const TOTAL_SCENARIOS = 2;
    const els = {
        total: document.getElementById('stat-total'),
        completion: document.getElementById('stat-completion'),
        average: document.getElementById('stat-avg-score'),
        subtitle: document.getElementById('progress-subtitle'),
        heading: document.getElementById('progress-heading'),
        description: document.getElementById('progress-desc'),
        latest: document.getElementById('pill-latest'),
        averageTime: document.getElementById('pill-avgtime'),
        standing: document.getElementById('pill-standing'),
        progress: document.getElementById('pill-progress'),
        arc: document.getElementById('donut-arc'),
        donutLabel: document.getElementById('donut-label'),
        rows: document.getElementById('runs-tbody'),
        refresh: document.getElementById('refresh-btn')
    };

    function reportTime(report) {
        const parsed = Date.parse(report.completedAt || report.timestamp || report.date || '');
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function readReports() {
        return REPORT_KEYS.map(function (key) {
            try {
                return JSON.parse(window.localStorage.getItem(key) || 'null');
            } catch (error) {
                return null;
            }
        }).filter(Boolean).sort(function (left, right) {
            return reportTime(right) - reportTime(left);
        });
    }

    function scoreOf(report) {
        const score = Number(report.score);
        return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDate(report) {
        const timestamp = reportTime(report);
        if (!timestamp) return report.date || 'Just completed';
        return new Date(timestamp).toLocaleString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function durationSeconds(value) {
        const text = String(value || '');
        const minutes = Number((text.match(/(\d+)\s*m/) || [0, 0])[1]);
        const seconds = Number((text.match(/(\d+)\s*s/) || [0, 0])[1]);
        return (minutes * 60) + seconds;
    }

    function averageDuration(reports) {
        const durations = reports.map(function (report) {
            return durationSeconds(report.duration);
        }).filter(Boolean);
        if (!durations.length) return '--';
        const average = Math.round(durations.reduce(function (sum, seconds) {
            return sum + seconds;
        }, 0) / durations.length);
        const minutes = Math.floor(average / 60);
        return (minutes ? minutes + 'm ' : '') + (average % 60) + 's';
    }

    function setDonut(percent) {
        const circumference = 2 * Math.PI * 50;
        els.arc.style.strokeDasharray = circumference;
        els.arc.style.strokeDashoffset = circumference * (1 - percent / 100);
        els.donutLabel.textContent = percent + '%';
    }

    function scoreClass(score) {
        if (score === 0) return 'score-pill zero';
        if (score < 60) return 'score-pill low';
        return 'score-pill';
    }

    function renderRows(reports) {
        if (!reports.length) {
            els.rows.innerHTML = '<tr><td colspan="7">No completed labs yet. Finish a scenario to populate the dashboard.</td></tr>';
            return;
        }

        els.rows.innerHTML = reports.map(function (report) {
            const score = scoreOf(report);
            const metrics = report.metrics || {};
            const complete = Number(metrics.labStepsComplete || 0);
            const total = Number(metrics.totalLabSteps || 0);
            const progress = total ? complete + '/' + total + ' steps' : 'Completed';
            return '<tr>'
                + '<td>' + escapeHtml(formatDate(report)) + '</td>'
                + '<td>' + escapeHtml(report.team || 'Trainee') + '</td>'
                + '<td>' + escapeHtml(report.title || report.scenario || 'Scenario') + '</td>'
                + '<td>' + escapeHtml(report.duration || '--') + '</td>'
                + '<td>' + escapeHtml(progress) + '</td>'
                + '<td><span class="' + scoreClass(score) + '">' + score + '%</span></td>'
                + '<td>' + escapeHtml(report.status || 'Completed') + '</td>'
                + '</tr>';
        }).join('');
    }

    function render() {
        const reports = readReports();
        const completed = reports.length;
        const completion = Math.round((completed / TOTAL_SCENARIOS) * 100);
        const average = completed
            ? Math.round(reports.reduce(function (sum, report) {
                return sum + scoreOf(report);
            }, 0) / completed)
            : 0;
        const latest = reports[0];

        els.total.textContent = completed;
        els.completion.textContent = completion + '%';
        els.average.textContent = average + '%';
        els.subtitle.textContent = 'Total completed labs: ' + completed
            + '. Labs completion: ' + completion + '%. Average score: ' + average + '%.';
        els.heading.textContent = completed + ' completed lab' + (completed === 1 ? '' : 's');
        els.description.textContent = latest
            ? 'Latest completion: ' + (latest.title || 'Scenario') + ' with a score of ' + scoreOf(latest) + '%.'
            : 'Complete Scenario A or Scenario B to begin tracking progress.';
        els.latest.textContent = 'Latest: ' + (latest ? formatDate(latest) : '--');
        els.averageTime.textContent = 'Avg Time: ' + averageDuration(reports);
        els.standing.textContent = 'Standing: ' + (latest ? (latest.status || 'Completed') : '--');
        els.progress.textContent = 'Progress: ' + completed + '/' + TOTAL_SCENARIOS + ' scenarios';
        renderRows(reports);
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                setDonut(average);
            });
        });
    }

    els.refresh.addEventListener('click', render);
    window.addEventListener('storage', render);
    window.addEventListener('pageshow', render);
    render();
})();
