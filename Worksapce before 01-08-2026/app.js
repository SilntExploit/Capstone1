/**
 * ResponseGrid – IRSP Live Lab
 * app.js
 *
 * Handles:
 *  - Countdown timer (45 min)
 *  - Answer checking with fuzzy matching
 *  - Stage unlocking & scoring
 *  - Time bonuses & penalties
 *  - Final score display
 *  - VM iframe focus management (keyboard fix)
 */

'use strict';

/* ══════════════════════════════════════════
   CONFIGURATION
   Update ANSWERS to match your VM setup
══════════════════════════════════════════ */
const ANSWERS = {
    1:  'decrypt@evil.onion',
    2:  '.locked',
    3:  '4',
    4:  'sysupdate',
    5:  '',
    6:  'status: active',
    7:  '',
    8:  '@reboot /tmp/sysupdate',
    9:  '/var/backups/user',
    10: '',
    11: 'cp /var/backups/user/report.txt ~/documents/report.txt',
    12: 'no crontab for',
    13: 'slartibartfast'
};

const PTS_PER_Q        = 7;          // 13 Qs × 7 = 91 base pts
const COUNTDOWN_SECS   = 30 * 60;
const TIME_BONUS_TIERS = [            // max 3 pts/stage × 3 = 9 → total 100
    { maxSecs: 300,      pts: 3 },
    { maxSecs: 600,      pts: 1 },
    { maxSecs: Infinity, pts: 0  }
];
const WRONG_PENALTY    = 2;
const STAGE_QUESTIONS  = { 1: [1,2,3,4], 2: [5,6,7,8], 3: [9,10,11,12,13] };

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let totalScore    = 0;
let remainingSecs = COUNTDOWN_SECS;
let elapsedSecs   = 0;
let stageStartSec = 0;
let currentStage  = 1;

const stageScores = { 1: 0, 2: 0, 3: 0 };
const stageTimes  = { 1: null, 2: null, 3: null };
const answered    = {};
const attempts    = {};

/* ══════════════════════════════════════════
   DOM REFERENCES
══════════════════════════════════════════ */
const timerEl   = document.getElementById('global-timer');
const scoreEl   = document.getElementById('score-display');
const overlayEl = document.getElementById('countdown-overlay');
const vmFrame   = document.getElementById('vm-frame');
const vmPanel   = document.querySelector('.vm-panel');
const taskPanel = document.querySelector('.task-panel');

/* ══════════════════════════════════════════
   VM FOCUS + KIOSK / LOCKDOWN MODE
══════════════════════════════════════════ */
const endLabBtn = document.getElementById('end-lab-btn');
let isTypingInTaskInput = false;
let hasIntentionalExit = false;

function isTypingTarget(el) {
    return !!(el && el.closest && el.closest('input, textarea, [contenteditable="true"]'));
}

function isOverlayBlocking() {
    return !!(overlayEl && overlayEl.classList.contains('show'));
}

function focusVM() {
    if (!vmFrame || isOverlayBlocking()) return;

    try {
        if (vmFrame.contentWindow) vmFrame.contentWindow.focus();
    } catch (e) {
        /* Cross-origin iframe fallback */
    }

    vmFrame.focus();
}

function autoRouteFocusToVM() {
    if (isTypingInTaskInput || isOverlayBlocking()) return;
    focusVM();
}

async function requestKioskFullscreen() {
    if (hasIntentionalExit || isOverlayBlocking()) return;
    if (document.fullscreenElement) return;

    try {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    } catch (e) {
        /* Browser may require a user gesture; we retry on next interaction. */
    }
}

function handleEndLab() {
    const shouldEnd = window.confirm('Are you sure you want to end the lab? Your progress will be lost.');
    if (!shouldEnd) return;

    hasIntentionalExit = true;
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    window.location.href = 'scenario-a.html';
}

function shouldBlockShortcut(e) {
    const key = (e.key || '').toLowerCase();
    const ctrlOrMeta = e.ctrlKey || e.metaKey;

    if (ctrlOrMeta && (key === 'w' || key === 't' || key === 'n')) return true;
    if (e.altKey && key === 'f4') return true;
    if (key === 'f5') return true;
    return false;
}

function beforeUnloadHandler(e) {
    if (hasIntentionalExit) return;

    e.preventDefault();
    e.returnValue = 'Are you sure you want to leave? Your lab progress may be lost.';
    return e.returnValue;
}

/* Auto-focus VM + fullscreen attempts on initial load */
window.addEventListener('load', () => {
    focusVM();
    setTimeout(focusVM, 150);
    setTimeout(requestKioskFullscreen, 120);
    setTimeout(requestKioskFullscreen, 500);
});

if (vmFrame) {
    vmFrame.addEventListener('load', () => {
        setTimeout(autoRouteFocusToVM, 50);
    });

    vmFrame.addEventListener('click', () => {
        focusVM();
    });
}

if (vmPanel) {
    vmPanel.addEventListener('click', (e) => {
        if (e.target.closest('#countdown-overlay')) return;
        autoRouteFocusToVM();
    });
}

if (taskPanel) {
    taskPanel.addEventListener('focusin', (e) => {
        if (isTypingTarget(e.target)) {
            isTypingInTaskInput = true;
        }
    });

    taskPanel.addEventListener('focusout', () => {
        const activeEl = document.activeElement;
        isTypingInTaskInput = isTypingTarget(activeEl);

        if (!isTypingInTaskInput) {
            setTimeout(autoRouteFocusToVM, 30);
        }
    });
}

if (endLabBtn) {
    endLabBtn.addEventListener('click', handleEndLab);
}

window.addEventListener('beforeunload', beforeUnloadHandler);

/* Re-enter fullscreen if user exits it. */
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && !hasIntentionalExit) {
        setTimeout(requestKioskFullscreen, 80);
    }
});

/* Retry fullscreen after any first user interaction if initial attempt was denied. */
document.addEventListener('pointerdown', () => {
    requestKioskFullscreen();
}, { passive: true });

/* Disable right-click context menu. */
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

/* Block kiosk escape/creation shortcuts + keep VM focus routed when not typing. */
document.addEventListener('keydown', (e) => {
    if (shouldBlockShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }

    if (isTypingTarget(e.target)) return;
    autoRouteFocusToVM();
}, true);

/* General clicks outside typing fields should route focus to VM */
document.addEventListener('click', (e) => {
    if (isTypingTarget(e.target)) return;
    if (taskPanel && taskPanel.contains(e.target) && !e.target.closest('.q-submit')) return;
    autoRouteFocusToVM();
}, true);

/* Ensure question controls are interactable unless question is already answered. */
document.querySelectorAll('.q-card').forEach((card) => {
    const isAnswered = card.classList.contains('answered');

    card.querySelectorAll('.q-input').forEach((input) => {
        input.disabled = isAnswered;
        input.readOnly = false;
    });

    card.querySelectorAll('.q-submit').forEach((btn) => {
        btn.disabled = isAnswered;
    });
});

/* ══════════════════════════════════════════
   VM VISIBILITY CHECK
   Warns if the iframe is not fully visible
══════════════════════════════════════════ */
function checkVMVisibility() {
    if (!vmFrame) return;
    const rect = vmFrame.getBoundingClientRect();
    const fullyVisible = (
        rect.top    >= 0 &&
        rect.left   >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right  <= window.innerWidth  &&
        rect.width  > 100 &&
        rect.height > 100
    );
    const indicator = document.getElementById('vm-status-indicator');
    if (indicator) {
        indicator.textContent  = fullyVisible ? '🟢 VM Visible' : '🔴 VM Hidden';
        indicator.style.color  = fullyVisible ? '#4db6ac' : '#f06292';
    }
}

window.addEventListener('resize', checkVMVisibility);
/* Run once after layout settles */
setTimeout(checkVMVisibility, 800);

/* ══════════════════════════════════════════
   COUNTDOWN TIMER
══════════════════════════════════════════ */
const timerInterval = setInterval(() => {
    if (remainingSecs <= 0) return;

    remainingSecs--;
    elapsedSecs++;

    const mins = String(Math.floor(remainingSecs / 60)).padStart(2, '0');
    const secs = String(remainingSecs % 60).padStart(2, '0');
    timerEl.textContent = `${mins}:${secs}`;

    if (remainingSecs <= 300) timerEl.classList.add('warning');

    if (remainingSecs === 0) {
        timerEl.textContent = '00:00';
        clearInterval(timerInterval);
        hasIntentionalExit = true;
        window.close();
    }
}, 1000);

/* ══════════════════════════════════════════
   ANSWER VALIDATION
══════════════════════════════════════════ */
function isCorrect(qNum, raw) {
    switch (qNum) {
        case 5:  return /^\d+$/.test(raw);
        case 7:  return /\d{4}-\d{2}-\d{2}/.test(raw);
        case 10: return /^[a-f0-9]{32}$/.test(raw);
        default: {
            const expected = ANSWERS[qNum].toLowerCase();
            return raw.includes(expected) || expected.includes(raw);
        }
    }
}

/* ══════════════════════════════════════════
   CHECK ANSWER (called from HTML onclick)
══════════════════════════════════════════ */
function checkAnswer(qNum) {
    if (answered[qNum]) return;

    const inputEl    = document.getElementById(`q${qNum}-input`);
    const feedbackEl = document.getElementById(`q${qNum}-feedback`);
    const cardEl     = document.getElementById(`q${qNum}`);
    const raw        = inputEl.value.trim().toLowerCase();

    if (!raw) {
        feedbackEl.textContent = '⚠️ Please enter an answer.';
        feedbackEl.className   = 'q-feedback err';
        return;
    }

    attempts[qNum] = (attempts[qNum] || 0) + 1;

    if (isCorrect(qNum, raw)) {
        answered[qNum] = true;
        cardEl.classList.add('answered');
        cardEl.classList.remove('wrong');
        inputEl.disabled = true;
        cardEl.querySelector('.q-submit').disabled = true;

        totalScore += PTS_PER_Q;
        stageScores[currentStage] += PTS_PER_Q;
        updateScoreDisplay();

        feedbackEl.textContent = `✅ Correct! +${PTS_PER_Q} points`;
        feedbackEl.className   = 'q-feedback ok';

        checkStageComplete();
    } else {
        cardEl.classList.add('wrong');
        totalScore = Math.max(0, totalScore - WRONG_PENALTY);
        updateScoreDisplay();

        feedbackEl.textContent = `❌ Incorrect. −${WRONG_PENALTY} pts penalty. Try again.`;
        feedbackEl.className   = 'q-feedback err';
    }
}

/* ══════════════════════════════════════════
   STAGE COMPLETION
══════════════════════════════════════════ */
function checkStageComplete() {
    const stage  = currentStage;
    const qs     = STAGE_QUESTIONS[stage];
    const allDone = qs.every(q => answered[q]);
    if (!allDone) return;

    const stageSecs = elapsedSecs - stageStartSec;
    stageTimes[stage] = stageSecs;

    const bonus = TIME_BONUS_TIERS.find(t => stageSecs < t.maxSecs)?.pts ?? 0;
    if (bonus > 0) {
        totalScore += bonus;
        stageScores[stage] += bonus;
        updateScoreDisplay();
    }

    document.getElementById(`stage-${stage}-complete`).style.display = 'block';
    document.getElementById(`pill-${stage}`).className = 'stage-pill complete';

    if (stage < 3) {
        currentStage++;
        stageStartSec = elapsedSecs;

        const nextBlock = document.getElementById(`stage-${currentStage}-block`);
        nextBlock.classList.remove('locked-block');
        document.getElementById(`pill-${currentStage}`).className = 'stage-pill active';

        setTimeout(() => {
            nextBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
    } else {
        showFinalScore();
    }
}

/* ══════════════════════════════════════════
   SCORE DISPLAY
══════════════════════════════════════════ */
function updateScoreDisplay() {
    scoreEl.textContent = totalScore;
}

/* ══════════════════════════════════════════
   FINAL SCORE
══════════════════════════════════════════ */
function showFinalScore() {
    clearInterval(timerInterval);

    const panel = document.getElementById('final-panel');
    panel.style.display = 'block';
    document.getElementById('final-score-num').textContent = totalScore;

    let grade;
    if      (totalScore >= 80) grade = '🥇 Excellent — Ready for real IR work!';
    else if (totalScore >= 55) grade = '🥈 Good — Solid understanding of IR.';
    else if (totalScore >= 30) grade = '🥉 Needs Practice — Review the stages.';
    else                       grade = '❌ Needs More Training — Keep studying!';

    document.getElementById('final-grade').textContent = grade;

    const fmt = s => s !== null ? `${Math.floor(s / 60)}m ${s % 60}s` : 'N/A';
    document.getElementById('final-breakdown').innerHTML =
        `Stage 1 (Detection):    ${stageScores[1]} pts &nbsp;|&nbsp; Time: ${fmt(stageTimes[1])}<br>` +
        `Stage 2 (Containment):  ${stageScores[2]} pts &nbsp;|&nbsp; Time: ${fmt(stageTimes[2])}<br>` +
        `Stage 3 (Recovery):     ${stageScores[3]} pts &nbsp;|&nbsp; Time: ${fmt(stageTimes[3])}<br>` +
        `<strong>Total Time: ${fmt(elapsedSecs)} &nbsp;|&nbsp; Final Score: ${totalScore} / 100</strong>`;

    setTimeout(() => {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);

    /* ── Dashboard Export ── */
    exportResultsToDashboard(grade);
}

/* ══════════════════════════════════════════
   DASHBOARD INTEGRATION
   Saves lab results so an external dashboard
   can retrieve them via localStorage, sessionStorage,
   the global window object, or postMessage.
══════════════════════════════════════════ */
function buildResultsPayload(grade) {
    const fmt = s => s !== null ? `${Math.floor(s / 60)}m ${s % 60}s` : 'N/A';
    return {
        labId:          'irsp-scenario-a',
        labTitle:       'ResponseGrid IRSP Live Lab — Scenario A',
        completedAt:    new Date().toISOString(),
        totalScore:     totalScore,
        maxScore:       100,
        grade:          grade,
        completed:      true,
        totalTimeElapsed: elapsedSecs,
        totalTimeFormatted: fmt(elapsedSecs),
        stages: {
            1: { name: 'Detection',    score: stageScores[1], maxScore: 31, time: stageTimes[1], timeFormatted: fmt(stageTimes[1]) },
            2: { name: 'Containment',  score: stageScores[2], maxScore: 31, time: stageTimes[2], timeFormatted: fmt(stageTimes[2]) },
            3: { name: 'Recovery',     score: stageScores[3], maxScore: 38, time: stageTimes[3], timeFormatted: fmt(stageTimes[3]) }
        },
        questionResults: Object.keys(ANSWERS).reduce((acc, qNum) => {
            acc[qNum] = { answered: !!answered[qNum], attempts: attempts[qNum] || 0 };
            return acc;
        }, {})
    };
}

function exportResultsToDashboard(grade) {
    const payload = buildResultsPayload(grade);

    /* 1. localStorage — persists across tabs & browser restarts */
    try { localStorage.setItem('responsegrid_lab_result', JSON.stringify(payload)); } catch (e) { /* private mode */ }

    /* 2. sessionStorage — available to same-tab / same-origin pages */
    try { sessionStorage.setItem('responsegrid_lab_result', JSON.stringify(payload)); } catch (e) { /* private mode */ }

    /* 3. Global JS object — readable by any in-page script or parent frame */
    window.__RESPONSEGRID_LAB_RESULT__ = payload;

    /* 4. postMessage to parent/opener — useful when lab runs inside an iframe or popup */
    try {
        if (window.opener) window.opener.postMessage({ type: 'responsegrid_lab_complete', payload }, '*');
        if (window.parent !== window) window.parent.postMessage({ type: 'responsegrid_lab_complete', payload }, '*');
    } catch (e) { /* cross-origin restriction */ }

    console.log('[ResponseGrid] Lab results exported for dashboard integration.', payload);
}
