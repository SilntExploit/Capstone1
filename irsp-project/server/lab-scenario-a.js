const path = require('path');
const { execFile } = require('child_process');
const { ROOT_DIR } = require('./config');

const LAB_IMAGE = 'responsegrid-scenario-a-lab:local';
const LAB_CONTAINER = 'responsegrid-scenario-a';
const LAB_DIR = path.join(ROOT_DIR, 'labs', 'scenario-a');
const MAX_COMMAND_LENGTH = 240;

function runCommand(file, args, options = {}) {
    return new Promise((resolve, reject) => {
        execFile(file, args, {
            cwd: options.cwd || ROOT_DIR,
            timeout: options.timeout || 120000,
            maxBuffer: 1024 * 1024
        }, (error, stdout, stderr) => {
            const result = {
                code: error && typeof error.code === 'number' ? error.code : 0,
                stdout: String(stdout || ''),
                stderr: String(stderr || '')
            };

            if (error && !options.allowFailure) {
                error.result = result;
                reject(error);
                return;
            }

            resolve(result);
        });
    });
}

function docker(args, options = {}) {
    return runCommand('docker', args, options);
}

async function imageExists() {
    try {
        await docker(['image', 'inspect', LAB_IMAGE]);
        return true;
    } catch (error) {
        return false;
    }
}

async function containerExists() {
    try {
        await docker(['container', 'inspect', LAB_CONTAINER]);
        return true;
    } catch (error) {
        return false;
    }
}

async function isContainerRunning() {
    try {
        const result = await docker(['container', 'inspect', LAB_CONTAINER, '--format', '{{.State.Running}}']);
        return result.stdout.trim() === 'true';
    } catch (error) {
        return false;
    }
}

async function buildImage() {
    await docker(['build', '-t', LAB_IMAGE, '.'], {
        cwd: LAB_DIR,
        timeout: 10 * 60 * 1000
    });
}

async function recreateContainer() {
    if (await containerExists()) {
        await docker(['rm', '-f', LAB_CONTAINER], { allowFailure: true });
    }

    await docker([
        'run',
        '-d',
        '--name',
        LAB_CONTAINER,
        '--hostname',
        'container-01',
        '--cap-add=NET_ADMIN',
        LAB_IMAGE
    ], {
        timeout: 120000
    });
}

async function ensureLab() {
    if (!(await imageExists())) {
        await buildImage();
    }

    if (!(await isContainerRunning())) {
        await recreateContainer();
        await runCommand('sleep', ['2'], { timeout: 4000 });
    }
}

async function inspectContainerState() {
    const exists = await containerExists();
    const running = exists ? await isContainerRunning() : false;

    if (!exists) {
        return {
            running: false,
            container_name: LAB_CONTAINER,
            image: LAB_IMAGE,
            pid: null,
            process_active: false,
            process_line: '',
            script_present: false,
            c2_blocked: false,
            network_isolated: false,
            files: [],
            encrypted_files: [],
            evidence_hash: '',
            snapshot_captured: false,
            snapshot_path: '',
            ransom_note: '',
            recent_logs: [],
            status: 'not_created'
        };
    }

    if (!running) {
        return {
            running: false,
            container_name: LAB_CONTAINER,
            image: LAB_IMAGE,
            pid: null,
            process_active: false,
            process_line: '',
            script_present: false,
            c2_blocked: false,
            network_isolated: false,
            files: [],
            encrypted_files: [],
            evidence_hash: '',
            snapshot_captured: false,
            snapshot_path: '',
            ransom_note: '',
            recent_logs: [],
            status: 'stopped'
        };
    }

    return readContainerState();
}

async function execInContainer(command, options = {}) {
    return docker(['exec', LAB_CONTAINER, 'bash', '-lc', command], {
        allowFailure: options.allowFailure !== false,
        timeout: options.timeout || 120000
    });
}

function normalizeLines(value) {
    return String(value || '')
        .split('\n')
        .map(line => line.trimEnd())
        .filter(Boolean);
}

function summarizeExecution(result) {
    const chunks = [];
    if (result.stdout.trim()) chunks.push(result.stdout.trim());
    if (result.stderr.trim()) chunks.push(result.stderr.trim());
    if (!chunks.length) chunks.push('(no output)');
    return chunks.join('\n');
}

function validateCommand(command) {
    const trimmed = String(command || '').trim();

    if (!trimmed) {
        return 'Command is required.';
    }

    if (trimmed.length > MAX_COMMAND_LENGTH) {
        return `Command must be ${MAX_COMMAND_LENGTH} characters or fewer.`;
    }

    if (/[\r\n\0]/.test(trimmed)) {
        return 'Multiline commands are not supported.';
    }

    return '';
}

async function readContainerState() {
    const [pidResult, processResult, scriptResult, c2Result, networkResult, filesResult, logResult, hashResult, snapshotResult, noteResult] = await Promise.all([
        execInContainer("ps -eo pid=,args= | awk '$1 != 1 && $2 == \"bash\" && $3 == \"/tmp/.encrypt.sh\" { print $1; exit }'", { allowFailure: true }),
        execInContainer("ps -eo pid=,%cpu=,%mem=,args= | awk '$1 != 1 && $4 == \"bash\" && $5 == \"/tmp/.encrypt.sh\" { print $0; exit }'", { allowFailure: true }),
        execInContainer("if [ -f /tmp/.encrypt.sh ]; then stat -c 'present %a %U %s' /tmp/.encrypt.sh; else echo missing; fi"),
        execInContainer("if iptables -S OUTPUT 2>/dev/null | grep -q '203.0.113.42'; then echo blocked; else echo open; fi"),
        execInContainer("if iptables -S OUTPUT 2>/dev/null | grep -q -- '-A OUTPUT -j DROP'; then echo isolated; else echo connected; fi"),
        execInContainer("find /srv/shared -maxdepth 1 -type f | sort", { allowFailure: true }),
        execInContainer("tail -n 12 /var/log/responsegrid/lab.log", { allowFailure: true }),
        execInContainer("if [ -f /tmp/.encrypt.sh ]; then sha256sum /tmp/.encrypt.sh | awk '{print $1}'; fi", { allowFailure: true }),
        execInContainer("if [ -f /var/log/responsegrid/forensic-snapshot.txt ]; then echo /var/log/responsegrid/forensic-snapshot.txt; fi", { allowFailure: true }),
        execInContainer("if [ -f /srv/shared/README_RESTORE.txt ]; then cat /srv/shared/README_RESTORE.txt; fi", { allowFailure: true })
    ]);

    const files = normalizeLines(filesResult.stdout);
    const encryptedFiles = files.filter(item => item.endsWith('.lock'));
    const pid = pidResult.stdout.trim();
    const processLine = processResult.stdout.trim();

    return {
        running: true,
        container_name: LAB_CONTAINER,
        image: LAB_IMAGE,
        pid: processLine ? pid : null,
        process_active: !!processLine,
        process_line: processLine || '',
        script_present: !scriptResult.stdout.trim().startsWith('missing'),
        c2_blocked: c2Result.stdout.trim() === 'blocked',
        network_isolated: networkResult.stdout.trim() === 'isolated',
        files,
        encrypted_files: encryptedFiles,
        evidence_hash: hashResult.stdout.trim() || '',
        snapshot_captured: !!snapshotResult.stdout.trim(),
        snapshot_path: snapshotResult.stdout.trim() || '',
        ransom_note: noteResult.stdout.trim() || '',
        recent_logs: normalizeLines(logResult.stdout)
    };
}

async function startLab() {
    await ensureLab();
    return readContainerState();
}

async function stopLab() {
    if (await isContainerRunning()) {
        await docker(['stop', LAB_CONTAINER], {
            timeout: 120000
        });
    }

    return inspectContainerState();
}

async function resetLab() {
    await recreateContainer();
    await runCommand('sleep', ['2'], { timeout: 4000 });
    return readContainerState();
}

async function executeLabCommand(command) {
    const validationError = validateCommand(command);
    if (validationError) {
        return {
            statusCode: 400,
            payload: { error: validationError }
        };
    }

    if (!(await isContainerRunning())) {
        return {
            statusCode: 409,
            payload: {
                error: 'Scenario A lab is not running. Start or reset the lab first.'
            }
        };
    }

    const trimmed = String(command).trim();
    let effectiveCommand = trimmed;
    let syntheticOutput = '';

    if (/^iptables\s+-A\s+OUTPUT\s+-d\s+203\.0\.113\.42\s+-j\s+DROP$/i.test(trimmed)) {
        effectiveCommand = 'touch /tmp/.c2-blocked && iptables -A OUTPUT -d 203.0.113.42 -j DROP';
        syntheticOutput = 'rule appended\nDROP all -- 0.0.0.0/0 203.0.113.42\nbeacon path marked as blocked';
    }

    if (/^iptables\s+-A\s+OUTPUT\s+-j\s+DROP$/i.test(trimmed)) {
        effectiveCommand = 'iptables -C OUTPUT -j DROP 2>/dev/null || iptables -A OUTPUT -j DROP';
        syntheticOutput = 'rule appended\nDROP all -- 0.0.0.0/0 0.0.0.0/0\ncontainer network isolation enabled';
    }

    if (/^rm\s+-f\s+\/tmp\/\.encrypt\.sh$/i.test(trimmed) || /^rm\s+\/tmp\/\.encrypt\.sh$/i.test(trimmed)) {
        syntheticOutput = "removed '/tmp/.encrypt.sh'\nartifact quarantined to forensic bundle fs-local-scenario-a";
    }

    if (/^kill\s+-9\s+\d+$/i.test(trimmed)) {
        const pid = trimmed.split(/\s+/).pop();
        syntheticOutput = `SIGKILL sent to PID ${pid}\nprocess state=terminated`;
    }

    if (/^sha256sum\s+\/tmp\/\.encrypt\.sh$/i.test(trimmed)) {
        effectiveCommand = "mkdir -p /var/log/responsegrid && if [ -f /tmp/.encrypt.sh ]; then sha256sum /tmp/.encrypt.sh | tee /var/log/responsegrid/forensic-snapshot.txt; else echo 'artifact missing: /tmp/.encrypt.sh'; echo 'reset the lab to capture a fresh forensic snapshot'; fi";
    }

    const result = await execInContainer(effectiveCommand, { allowFailure: true });
    const state = await readContainerState();
    let output = summarizeExecution(result);

    if (syntheticOutput && output === '(no output)') {
        output = syntheticOutput;
    } else if (/^kill\s+-9\s+\d+$/i.test(trimmed) && result.code === 0 && state.process_active === false) {
        output = `${syntheticOutput}\ncontainment confirmed in local Docker lab`;
    } else if (/^rm\s+-f?\s*\/tmp\/\.encrypt\.sh$/i.test(trimmed) && result.code === 0 && state.script_present === false) {
        output = `${syntheticOutput}\nscript no longer present on disk`;
    } else if (/^iptables\s+-A\s+OUTPUT\s+-d\s+203\.0\.113\.42\s+-j\s+DROP$/i.test(trimmed) && result.code === 0 && state.c2_blocked) {
        output = syntheticOutput;
    } else if (/^iptables\s+-A\s+OUTPUT\s+-j\s+DROP$/i.test(trimmed) && result.code === 0 && state.network_isolated) {
        output = syntheticOutput;
    } else if (/^sha256sum\s+\/tmp\/\.encrypt\.sh$/i.test(trimmed) && result.code === 0 && state.evidence_hash) {
        output = `${state.evidence_hash}  /tmp/.encrypt.sh\nsnapshot saved to ${state.snapshot_path || '/var/log/responsegrid/forensic-snapshot.txt'}`;
    }

    return {
        statusCode: 200,
        payload: {
            ok: result.code === 0,
            command: trimmed,
            effective_command: effectiveCommand,
            exit_code: result.code,
            output,
            state
        }
    };
}

module.exports = {
    executeLabCommand,
    inspectContainerState,
    readContainerState,
    resetLab,
    stopLab,
    startLab
};
