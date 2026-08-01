/**
 * IRSP Live Lab (Ransomware Incident Response)
 * app.js
 *
 *  - Incident ticket start screen + 45s connection interstitial
 *  - 3-stage investigation (Evidence / Containment / Recovery), 13 questions
 *  - No hardcoded answer table: each question validated by its own rule
 *  - Decision-point bonus + first-attempt accuracy bonus
 *  - MITRE ATT&CK review shown ONLY on the post-completion screen
 *  - Robust score persistence to /api/lab-scores/ (sendBeacon + fetch)
 *  - VM iframe focus / kiosk management (Guacamole keyboard fix)
 */

'use strict';

/* ══════════════════════════════════════════
   MITRE MAP (shown only after completion)
══════════════════════════════════════════ */
const QUESTION_TITLES = {
    1: 'Capture the active network connection',
    2: 'Trace how the attacker got in',
    3: 'Extract details from the ransom note',
    4: 'Establish the attack timeline',
    5: 'Determine the scope of damage',
    6: 'Stop the malicious process',
    7: "Block communication to the attacker's server",
    8: 'Find all persistence mechanisms',
    9: 'Remove all persistence mechanisms',
    10: 'Verify the backup is safe to use',
    11: 'Restore the affected file',
    12: 'Lock the compromised account',
    13: 'Complete the Incident Report'
};

const QUESTION_MITRE = {
    1:  { id: 'T1071.001', name: 'Application Layer Protocol', tactic: 'Command and Control',
          hint: 'Re-read network_snapshot.txt carefully. Look for the "Peer Address" column showing an external IP and port.' },
    2:  { id: 'T1110.001', name: 'Brute Force: Password Guessing', tactic: 'Initial Access',
          hint: 'Count the "Failed password" lines from a single IP, then find the "Accepted password" line that follows.' },
    3:  { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact',
          hint: 'Open RANSOM_NOTE.html and look for the email address, wallet address, and amount requested.' },
    4:  { id: 'T1070.006', name: 'Indicator Removal: Timestomp', tactic: 'Defense Evasion',
          hint: 'Run grep on /var/log/syslog specifically. The process name to search for is sysupdate.' },
    5:  { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact',
          hint: 'find should look for files with the .locked extension under /home/irspuser. Use wc -l to count.' },
    6:  { id: 'T1059.004', name: 'Command and Scripting Interpreter: Unix Shell', tactic: 'Execution',
          hint: 'Run the full command. If pgrep returns nothing, the process is gone and PROCESS STOPPED appears.' },
    7:  { id: 'T1071', name: 'Application Layer Protocol (Blocked)', tactic: 'Containment',
          hint: 'Run both iptables commands, then the verification command. Paste the output line containing the IP.' },
    8:  { id: 'T1053.003', name: 'Scheduled Task/Job: Cron (+ multiple persistence)', tactic: 'Persistence',
          hint: 'Run all four checks. The attacker planted more than one persistence mechanism — list all you find.' },
    9:  { id: 'T1070', name: 'Indicator Removal (Remediation)', tactic: 'Remediation',
          hint: 'Run all four removal commands, then crontab -l 2>&1. Success shows "no crontab for the user".' },
    10: { id: null, name: 'Backup Integrity Verification', tactic: 'Recovery',
          hint: 'Run stat on the backup file and compare its Modify timestamp to the syslog timestamp from Q4.' },
    11: { id: null, name: 'File Recovery', tactic: 'Recovery',
          hint: 'Linux paths are case-sensitive. Ensure Documents has a capital D. Run ls to confirm.' },
    12: { id: 'T1078', name: 'Valid Accounts (Remediation)', tactic: 'Containment',
          hint: 'Run sudo passwd -l irspuser, then sudo passwd -S irspuser. The second field shows the lock status.' },
    13: { id: 'Multiple', name: 'Incident Documentation', tactic: 'All Phases',
          hint: 'Each field should reference your earlier findings. Return to the relevant question if unsure.' }
};

/* ══════════════════════════════════════════
   SCORING MODEL
   Q1–Q12 : 5 pts each                = 60
   Q13    : 6 fields × 2.5            = 15
   ───────────────────────────────────────────
   Base                              = 75
   + Decision-point bonus            =  5
   + First-attempt accuracy bonus    = 20
   ───────────────────────────────────────────
   MAX                               = 100
   Wrong attempts incur a persistent −2 penalty.
══════════════════════════════════════════ */
const MAX_SCORE       = 100;
const COUNTDOWN_SECS  = 45 * 60;
const WRONG_PENALTY   = 2;
const DECISION_BONUS  = 5;
const ACCURACY_BONUS  = 20;
const STAGE_QUESTIONS = { 1: [1, 2, 3, 4, 5], 2: [6, 7, 8, 9], 3: [10, 11, 12, 13] };

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let earnedPoints  = 0;
let penaltyPoints = 0;
let accuracyBonus = 0;
let decisionScored = false;

let remainingSecs = COUNTDOWN_SECS;
let elapsedSecs   = 0;
let labStarted    = false;
let labSubmitted  = false;
let hasIntentionalExit = false;
let cachedUsername = 'anonymous';
let timerInterval  = null;

const answered = {};
const attempts = {};
for (let i = 1; i <= 13; i++) { answered[i] = false; attempts[i] = 0; }

// Q13 per-field tracking
const q13Field = [false, false, false, false, false, false];
let q13Submitted = false;

function liveScore()  { return Math.max(0, earnedPoints - penaltyPoints); }
function finalScore() { return Math.max(0, Math.min(MAX_SCORE, earnedPoints - penaltyPoints + accuracyBonus)); }

/* ══════════════════════════════════════════
   DOM REFERENCES
══════════════════════════════════════════ */
const timerEl   = () => document.getElementById('global-timer');
const scoreEl   = () => document.getElementById('score-display');
const overlayEl = () => document.getElementById('countdown-overlay');
const vmFrame   = () => document.getElementById('vm-frame');
const vmPanel   = () => document.querySelector('.vm-panel');
const taskPanel = () => document.querySelector('.task-panel');

/* ══════════════════════════════════════════
   INITIALISATION
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    // Guacamole URL from shared config, if present.
    try {
        if (window.IRSP_CONFIG && window.IRSP_CONFIG.guacamoleLabUrl) {
            const f = vmFrame();
            if (f) f.src = window.IRSP_CONFIG.guacamoleLabUrl;
            const u = document.getElementById('vm-url');
            if (u) u.textContent = window.IRSP_CONFIG.guacamoleLabUrl;
        }
    } catch (e) { /* ignore */ }

    // Responder name / assignee from cached login.
    resolveUsername().then((u) => {
        cachedUsername = u;
        const nm = (u && u !== 'anonymous') ? u : 'Responder';
        const rn = document.getElementById('responder-name');
        const ta = document.getElementById('ticket-assignee');
        if (rn) rn.textContent = nm;
        if (ta) ta.textContent = nm;
    }).catch(() => {});

    const tt = document.getElementById('ticket-time');
    if (tt) tt.textContent = new Date().toLocaleString();

    const beginBtn = document.getElementById('btn-begin');
    if (beginBtn) beginBtn.addEventListener('click', beginInvestigation);

    const endBtn = document.getElementById('end-lab-btn');
    if (endBtn) endBtn.addEventListener('click', handleEndLab);

    const closeBtn = document.getElementById('close-lab-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeLab);
});

/* ══════════════════════════════════════════
   START FLOW: ticket → interstitial → lab
══════════════════════════════════════════ */
function beginInvestigation() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('interstitial-screen').classList.remove('hidden');

    let t = 45;
    const timerSpan = document.getElementById('loader-timer');
    const statusEl  = document.getElementById('loader-status');
    const bar       = document.getElementById('progress-bar');
    const statuses  = [
        'Connecting to affected workstation...',
        'Establishing read-only evidence session...',
        'Loading system state...',
        'Environment ready — beginning investigation.'
    ];

    const intv = setInterval(() => {
        t--;
        if (timerSpan) timerSpan.textContent = t;
        if (bar) bar.style.width = ((45 - t) / 45 * 100) + '%';
        if (t === 35 && statusEl) statusEl.textContent = statuses[1];
        if (t === 20 && statusEl) statusEl.textContent = statuses[2];
        if (t === 5  && statusEl) statusEl.textContent = statuses[3];

        if (t <= 0) {
            clearInterval(intv);
            document.getElementById('interstitial-screen').classList.add('hidden');
            document.getElementById('main-layout').classList.remove('hidden');
            startLab();
        }
    }, 1000);
}

function startLab() {
    labStarted = true;
    focusVM();
    setTimeout(focusVM, 200);
    startTimer();
}

/* ══════════════════════════════════════════
   TIMER
══════════════════════════════════════════ */
function startTimer() {
    timerInterval = setInterval(() => {
        if (remainingSecs <= 0) return;
        remainingSecs--;
        elapsedSecs++;

        const m = String(Math.floor(remainingSecs / 60)).padStart(2, '0');
        const s = String(remainingSecs % 60).padStart(2, '0');
        if (timerEl()) timerEl().textContent = `${m}:${s}`;
        if (remainingSecs <= 300 && timerEl()) timerEl().classList.add('warning');

        if (remainingSecs === 0) {
            clearInterval(timerInterval);
            if (timerEl()) timerEl().textContent = '00:00';
            if (overlayEl()) overlayEl().classList.add('show');
            hasIntentionalExit = true;
            window.removeEventListener('beforeunload', beforeUnloadHandler);
            persistCompletion({ completed: false });
        }
    }, 1000);
}

/* ══════════════════════════════════════════
   SCORING HELPERS
══════════════════════════════════════════ */
function refreshScore() {
    if (scoreEl()) scoreEl().textContent = liveScore();
}

function award(q, pts) {
    if (!answered[q]) {
        answered[q] = true;
        earnedPoints += pts;
        refreshScore();
    }
}

function penalise(q) {
    if (!answered[q]) {
        penaltyPoints += WRONG_PENALTY;
        refreshScore();
    }
}

function showFeedback(q, ok, extra) {
    const fb = document.getElementById(`q${q}-feedback`);
    if (!fb) return;
    if (ok) {
        fb.innerHTML = '✅ Correct.' + (extra ? ' ' + extra : '');
        fb.className = 'feedback correct';
        const card = document.getElementById(`q${q}`);
        if (card) card.classList.add('answered');
    } else {
        fb.innerHTML = '❌ Incorrect. Penalty applied.' + (extra ? ' ' + extra : '');
        fb.className = 'feedback incorrect';
    }
}

/* ══════════════════════════════════════════
   STAGE UNLOCKS
══════════════════════════════════════════ */
function checkStageUnlocks() {
    if ([1, 2, 3, 4, 5].every((q) => answered[q])) {
        const gw = document.getElementById('decision-gateway');
        if (gw && !gw.classList.contains('decision-submitted')) gw.classList.remove('hidden');
    }
    if ([6, 7, 8, 9].every((q) => answered[q])) {
        document.getElementById('stage3-container').classList.remove('hidden');
        const p = document.getElementById('pill-3');
        if (p) { p.classList.add('active'); p.classList.remove('locked'); }
    }
}

/* ══════════════════════════════════════════
   ANSWER CHECKING (per-question rules)
══════════════════════════════════════════ */
function checkAnswer(q) {
    if (answered[q]) return;
    attempts[q]++;
    let ok = false, extra = '';
    const v = (id) => (document.getElementById(id).value || '').trim();

    switch (q) {
        case 1:  ok = v('q1-input') === '203.0.113.47:4444'; break;
        case 2:  ok = v('q2-input') === '7'; break;
        case 3: {
            const a = v('q3a-input').toLowerCase();
            const b = v('q3b-input');
            const c = v('q3c-input').toLowerCase();
            const aOk = a === 'decrypt@evil.onion';
            const bOk = b.toLowerCase() === '1a1zp1ep5qgefi2dmptftl5slmv7divfna';
            const cOk = c.includes('0.5') && c.includes('bitcoin');
            ok = aOk && bOk && cOk;
            if (!ok) {
                const m = [];
                if (!aOk) m.push('email');
                if (!bOk) m.push('wallet');
                if (!cOk) m.push('amount');
                extra = 'Check: ' + m.join(', ') + '.';
            }
            break;
        }
        case 4:  ok = /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(v('q4-input')); break;
        case 5:  ok = /^\d+$/.test(v('q5-input')) && parseInt(v('q5-input'), 10) > 0; break;
        case 6:  ok = v('q6-input').toLowerCase().includes('stopped'); break;
        case 7:  ok = /203\.0\.113\.47/.test(v('q7-input')); break;
        case 8: {
            const s = v('q8-input').toLowerCase();
            ok = s.includes('crontab') && s.includes('bashrc') &&
                 (s.includes('authorized') || s.includes('ssh'));
            break;
        }
        case 9:  ok = v('q9-input').toLowerCase().includes('no crontab for'); break;
        case 10: ok = v('q10-input').toLowerCase() === 'before'; break;
        case 11: {
            const s = v('q11-input');
            ok = s.includes('/home/irspuser/Documents/report.txt') || s.includes('~/Documents/report.txt');
            break;
        }
        case 12: {
            const s = v('q12-input').toLowerCase();
            ok = s === 'l' || s === 'lk' || s === 'locked';
            break;
        }
    }

    if (ok) { award(q, 5); showFeedback(q, true, extra); }
    else    { penalise(q); showFeedback(q, false, extra); }

    checkStageUnlocks();
}

/* ══════════════════════════════════════════
   DECISION POINT
══════════════════════════════════════════ */
function submitDecision() {
    const val = (document.getElementById('decision-input').value || '').trim().toLowerCase();
    const gw  = document.getElementById('decision-gateway');
    const fb  = document.getElementById('decision-feedback');

    const noPay  = val.includes('not pay') || val.includes('do not pay') || val.includes('no pay') || val.includes("don't pay");
    const reason = val.includes('backup') || val.includes('restore') || val.includes('evidence') ||
                   val.includes('law') || val.includes('sanction') || val.includes('guarantee') || val.includes('decrypt');

    if (noPay && reason && !decisionScored) {
        decisionScored = true;
        earnedPoints += DECISION_BONUS;
        refreshScore();
        if (fb) { fb.innerHTML = '✅ Strong recommendation — documented. Stage 2 unlocked.'; fb.className = 'feedback correct'; }
    } else if (fb) {
        fb.innerHTML = '📝 Recorded. In a real incident, always reference recovery options in your reasoning. Stage 2 unlocked.';
        fb.className = 'feedback text-neutral';
    }

    if (gw) gw.classList.add('decision-submitted');
    document.getElementById('stage2-container').classList.remove('hidden');
    const p = document.getElementById('pill-2');
    if (p) { p.classList.add('active'); p.classList.remove('locked'); }
}

/* ══════════════════════════════════════════
   Q13 — INCIDENT REPORT (6 independent fields)
══════════════════════════════════════════ */
function submitReport() {
    attempts[13]++;
    q13Submitted = true;

    const f = (id) => (document.getElementById(id).value || '').trim();
    const f1 = f('q13_1');
    const f2 = f('q13_2');
    const f3 = f('q13_3');
    const f4 = f('q13_4');
    const f5 = f('q13_5').toLowerCase();
    const f6 = f('q13_6').toLowerCase();

    const checks = [
        /\d{4}-\d{2}-\d{2}/.test(f1) || /\d{2}:\d{2}:\d{2}/.test(f1),
        f2.includes('203.0.113.47'),
        /^\d+$/.test(f3) || /\d+/.test(f3),
        f4.includes('decrypt@evil.onion'),
        f5.includes('crontab') && f5.includes('bashrc') && (f5.includes('authorized') || f5.includes('ssh')),
        (f6.includes('not pay') || f6.includes('do not pay') || f6.includes('no pay')) &&
            (f6.includes('backup') || f6.includes('evidence') || f6.includes('restore') ||
             f6.includes('law') || f6.includes('sanction') || f6.includes('decrypt') || f6.includes('guarantee'))
    ];

    let newlyCorrect = 0, anyWrong = false;
    for (let i = 0; i < 6; i++) {
        const badge = document.getElementById(`fb-13-${i + 1}`);
        if (checks[i]) {
            if (badge) badge.textContent = '✅';
            if (!q13Field[i]) { q13Field[i] = true; newlyCorrect++; }
        } else {
            if (badge) badge.textContent = '❌';
            anyWrong = true;
        }
    }

    if (newlyCorrect > 0) { earnedPoints += newlyCorrect * 2.5; refreshScore(); }
    if (anyWrong) {
        penaltyPoints += WRONG_PENALTY;
        refreshScore();
    } else {
        answered[13] = true;
        const card = document.getElementById('q13');
        if (card) card.classList.add('answered');
    }

    revealFinishButton();
}

/* After the report is submitted at least once, offer to finish & view results. */
function revealFinishButton() {
    if (document.getElementById('btn-finish')) return;
    const card = document.getElementById('q13');
    if (!card) return;
    const btn = document.createElement('button');
    btn.id = 'btn-finish';
    btn.className = 'btn-primary btn-finish';
    btn.textContent = 'Finish Investigation & View Results';
    btn.addEventListener('click', finishLab);
    card.appendChild(btn);
}

/* ══════════════════════════════════════════
   FINISH → completion screen + MITRE review
══════════════════════════════════════════ */
function finishLab() {
    if (timerInterval) clearInterval(timerInterval);

    // First-attempt accuracy bonus: every question correct on exactly one try.
    let perfect = true;
    for (let i = 1; i <= 13; i++) {
        if (!answered[i] || attempts[i] !== 1) { perfect = false; break; }
    }
    accuracyBonus = perfect ? ACCURACY_BONUS : 0;

    // Populate summary
    document.getElementById('final-score').textContent = finalScore();
    document.getElementById('final-standing').textContent = standingLabel(finalScore());
    const m = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
    const s = String(elapsedSecs % 60).padStart(2, '0');
    document.getElementById('final-time').textContent = `${m}:${s}`;
    document.getElementById('final-stages').textContent = `${countStagesCompleted()}/3`;

    renderMitreReview();

    hasIntentionalExit = true;
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    document.getElementById('main-layout').classList.add('hidden');
    document.getElementById('completion-screen').classList.remove('hidden');

    // Persist a completed record.
    persistCompletion({ completed: true });
    const ss = document.getElementById('save-status');
    if (ss) ss.textContent = 'Your results have been saved to the dashboard.';
}

function renderMitreReview() {
    const content  = document.getElementById('mitre-content');
    const coverage = document.getElementById('mitre-coverage');
    content.innerHTML = '';
    coverage.innerHTML = '';
    const tactics = new Set();
    let missedHTML = '';

    for (let i = 1; i <= 13; i++) {
        const title = QUESTION_TITLES[i];
        const mit   = QUESTION_MITRE[i];
        const label = mit.id ? `${mit.id}: ${mit.name}` : mit.name;
        const tried = attempts[i] > 0 || (i === 13 && q13Submitted);
        const right = answered[i];

        if (tried && right) {
            tactics.add(mit.tactic);
            content.innerHTML += `
                <div class="mitre-item ok">
                    <div class="row1"><span>Q${i}: ${title}</span><span class="ok-tag">✅ Correct</span></div>
                    <div class="method">Methodology: ${label}</div>
                </div>`;
        } else if (tried && !right) {
            tactics.add(mit.tactic);
            content.innerHTML += `
                <div class="mitre-item bad">
                    <div class="row1"><span>Q${i}: ${title}</span><span class="bad-tag">❌ Incorrect</span></div>
                    <div class="method">Methodology: ${label}</div>
                    <div class="hint">💡 Review: ${mit.hint}</div>
                </div>`;
        } else {
            missedHTML += `
                <div class="mitre-item miss">
                    <div class="row1"><span>Q${i}: ${title}</span><span>— Not Attempted</span></div>
                    <div class="method">Methodology missed: ${label}</div>
                </div>`;
        }
    }

    if (missedHTML) {
        content.innerHTML += `<h3 class="missed-head">Techniques you did not investigate</h3>` + missedHTML;
    }

    if (tactics.size === 0) {
        coverage.innerHTML = '<span class="no-tactics">No tactics investigated.</span>';
    } else {
        tactics.forEach((t) => { coverage.innerHTML += `<span class="tactic-pill">${t}</span>`; });
    }
}

/* ══════════════════════════════════════════
   STANDINGS + STAGE COUNT
══════════════════════════════════════════ */
function standingLabel(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 55) return 'Good';
    if (score >= 30) return 'Needs Practice';
    return 'Needs More Training';
}

function countStagesCompleted() {
    let done = 0;
    Object.keys(STAGE_QUESTIONS).forEach((stage) => {
        if (STAGE_QUESTIONS[stage].every((q) => answered[q])) done++;
    });
    return done;
}

/* ══════════════════════════════════════════
   PERSISTENCE  (matches LabCompletion model)
══════════════════════════════════════════ */
function apiBase() {
    try { return window.localStorage.getItem('irsp-api-base') || '/api'; }
    catch (e) { return '/api'; }
}

function accessToken() {
    try { return window.localStorage.getItem('irsp-access-token') || ''; }
    catch (e) { return ''; }
}

async function resolveUsername() {
    try {
        const cached = window.localStorage.getItem('irsp-current-user');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.email) return parsed.email;
        }
    } catch (e) { /* ignore */ }

    const token = accessToken();
    if (token) {
        try {
            const res = await fetch(`${apiBase()}/auth/me/`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const me = await res.json();
                if (me && me.email) return me.email;
            }
        } catch (e) { /* ignore */ }
    }
    return 'anonymous';
}

function resolveStanding(completed) {
    if (!completed) return 'Incomplete';
    return standingLabel(finalScore());
}

/* Per-question MITRE ATT&CK coverage, persisted so the dashboard can show a
   post-completion review page. Status is correct / incorrect / not_attempted. */
function buildMitreCoverage() {
    const out = [];
    for (let i = 1; i <= 13; i++) {
        const mit = QUESTION_MITRE[i] || {};
        const tried = attempts[i] > 0 || (i === 13 && q13Submitted);
        let status = 'not_attempted';
        if (answered[i]) status = 'correct';
        else if (tried) status = 'incorrect';
        out.push({
            q: i,
            title: QUESTION_TITLES[i] || `Q${i}`,
            code: mit.id || null,
            name: mit.name || '',
            tactic: mit.tactic || '',
            status: status
        });
    }
    return out;
}

function buildCompletionPayload(completed) {
    return {
        username: cachedUsername || 'anonymous',
        lab_name: 'lab-a',
        total_score: completed ? finalScore() : liveScore(),
        time_taken: elapsedSecs,
        stages_completed: countStagesCompleted(),
        total_stages: 3,
        standing: resolveStanding(completed),
        mitre_coverage: JSON.stringify(buildMitreCoverage())
    };
}

function persistCompletion(opts) {
    opts = opts || {};
    if (labSubmitted) return;
    labSubmitted = true;

    const payload = buildCompletionPayload(!!opts.completed);
    const url     = `${apiBase()}/lab-scores/`;
    const body    = JSON.stringify(payload);
    const token   = accessToken();

    // navigator.sendBeacon() cannot carry an Authorization header, so it
    // can't be used now that /api/lab-scores/ requires authentication.
    // fetch(..., {keepalive:true}) is well-supported in modern browsers and
    // reliably completes past page unload while still sending the token.
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        fetch(url, { method: 'POST', headers, body, keepalive: true })
            .then((res) => console.log('[IRSP] Lab record save status:', res.status))
            .catch((err) => console.warn('[IRSP] Could not save record:', err));
    } catch (e) {
        console.warn('[IRSP] Persist failed:', e);
    }
}

/* ══════════════════════════════════════════
   EXIT PATHS
══════════════════════════════════════════ */
function handleEndLab() {
    const ok = window.confirm('End the lab now? Your current progress and score will be saved to the dashboard.');
    if (!ok) return;
    hasIntentionalExit = true;
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    persistCompletion({ completed: false });
    window.location.href = '../pages/labs.html';
}

function closeLab() {
    const btn  = document.getElementById('close-lab-btn');
    const note = document.getElementById('close-lab-note');
    if (btn) btn.disabled = true;
    hasIntentionalExit = true;
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    persistCompletion({ completed: true }); // no-op if already saved
    if (note) note.textContent = 'Closing the lab…';
    setTimeout(() => {
        window.close();
        setTimeout(() => { if (!window.closed) window.location.href = '../pages/labs.html'; }, 400);
    }, 300);
}

function beforeUnloadHandler(e) {
    if (hasIntentionalExit) return;
    e.preventDefault();
    e.returnValue = 'Are you sure you want to leave? Your lab progress may be lost.';
    return e.returnValue;
}
window.addEventListener('beforeunload', beforeUnloadHandler);
window.addEventListener('pagehide', () => { persistCompletion({ completed: false }); });

/* ══════════════════════════════════════════
   VM FOCUS MANAGEMENT — "focus follows the cursor"

   The Guacamole VM is a CROSS-ORIGIN iframe. The reliable, non-fighting way
   to keep BOTH sides typeable is to route the keyboard based on WHERE THE
   MOUSE IS:

     • Mouse over the VM panel      → focus the VM iframe → terminal typing.
     • Mouse over the task panel     → release the VM. If the pointer is over
       an answer box we focus that box directly, so you can start typing
       immediately without an extra click.

   Because mouseenter/mouseleave on the two panels fire exactly at the border
   between them (the iframe swallows inner mouse events, but the panel border
   crossing is always detected), this gives a smooth "whatever I'm hovering is
   what my keyboard talks to" behaviour and never leaves either side dead.
══════════════════════════════════════════ */
function isTypingTarget(el) {
    return !!(el && el.closest && el.closest('input, textarea, [contenteditable="true"]'));
}
function isOverlayBlocking() {
    return !!(overlayEl() && overlayEl().classList.contains('show'));
}
function focusVM() {
    const f = vmFrame();
    if (!f || isOverlayBlocking() || !labStarted) return;
    try { if (f.contentWindow) f.contentWindow.focus(); } catch (e) { /* cross-origin */ }
    f.focus();
}
/* Release the keyboard from the VM so page inputs can receive keystrokes. */
function releaseVM() {
    const f = vmFrame();
    if (f) { try { f.blur(); } catch (e) { /* ignore */ } }
    if (document.activeElement === vmFrame()) {
        try { window.focus(); } catch (e) { /* ignore */ }
    }
}

window.addEventListener('load', () => {
    const vp = vmPanel();
    const tp = taskPanel();

    // ── Mouse over the VM → keyboard goes to the VM ──
    if (vp) {
        vp.addEventListener('mouseenter', () => {
            if (!labStarted || isOverlayBlocking()) return;
            if (vp.matches(':hover')) focusVM();
        });
        // A direct click on the VM is also an explicit "type here".
        vp.addEventListener('mousedown', (e) => {
            if (e.target.closest('#countdown-overlay')) return;
            setTimeout(focusVM, 0);
        });
    }

    // ── Mouse over the task panel → keyboard goes to the page/inputs ──
    if (tp) {
        tp.addEventListener('mouseenter', () => {
            if (!labStarted) return;
            releaseVM();
        });
        // Hovering directly over an input focuses it, so you can type at once.
        tp.addEventListener('mousemove', (e) => {
            if (!labStarted) return;
            const field = e.target.closest('input, textarea');
            if (field && document.activeElement !== field && !field.disabled) {
                // Only auto-focus if the user is not mid-selection elsewhere.
                if (!isTypingTarget(document.activeElement) ||
                    !tp.contains(document.activeElement)) {
                    field.focus({ preventScroll: true });
                }
            }
        });
        // The VM iframe re-focuses itself after (re)loading; if the pointer is
        // over the task panel at that moment, take the keyboard back.
        const f = vmFrame();
        if (f) f.addEventListener('load', () => {
            setTimeout(() => { if (tp.matches(':hover')) releaseVM(); }, 60);
        });
    }
});

document.addEventListener('contextmenu', (e) => e.preventDefault());
