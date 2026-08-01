(function () {
    'use strict';

    startTimer('timer', 2700);

    const objectives = Array.from(document.querySelectorAll('[data-objective]'));
    const progressText = document.getElementById('scenario-a-progress-text');
    const progressFill = document.getElementById('scenario-a-progress-fill');

    function markComplete(key) {
        const objective = objectives.find(item => item.dataset.objective === key);
        if (!objective || objective.classList.contains('complete')) return;

        objective.classList.add('complete');

        const icon = objective.querySelector('svg') || objective.querySelector('i');
        if (icon && icon.tagName.toLowerCase() === 'svg') {
            icon.outerHTML = '<i data-lucide="check-circle" style="color:var(--accent-green);"></i>';
        } else if (icon) {
            icon.setAttribute('data-lucide', 'check-circle');
            icon.style.color = 'var(--accent-green)';
        }

        IRSP.refreshIcons();
        renderProgress();
    }

    function renderProgress() {
        const complete = objectives.filter(item => item.classList.contains('complete')).length;
        const percent = Math.round((complete / objectives.length) * 100);
        progressText.textContent = `Completion: ${percent}%`;
        progressFill.style.width = `${percent}%`;
    }

    initCommandShell({
        outputId: 'term-output',
        inputId: 'scenario-a-command-input',
        buttonId: 'scenario-a-execute',
        statusId: 'scenario-a-status-line',
        presetSelector: '[data-shell-command]',
        prompt: 'root@container-01:~#',
        commands: {
            'ps aux | grep encrypt': {
                output: 'root  4821  89.2  3.1 /tmp/.encrypt.sh --target /data --key rsa2048',
                variant: 'error',
                status: 'Encryption process remains active.'
            },
            'kill -9 4821': {
                output: 'SIGKILL sent to PID 4821\nprocess state=terminated\nencryption writes halted on /srv/shared',
                status: 'Containment action succeeded. PID 4821 terminated.',
                afterExecute() {
                    markComplete('kill');
                }
            },
            'iptables -a output -d 203.0.113.42 -j drop': {
                output: 'rule appended\nDROP all -- 0.0.0.0/0 203.0.113.42',
                status: 'Egress block applied for the active C2 destination.',
                afterExecute() {
                    markComplete('block');
                }
            },
            'rm /tmp/.encrypt.sh': {
                output: 'removed \'/tmp/.encrypt.sh\'\nartifact quarantined to forensic bundle fs-2026-03-24-4821',
                status: 'Malware script removed from the container filesystem.',
                afterExecute() {
                    markComplete('eradicate');
                }
            },
            'docker network disconnect bridge container-01': {
                output: 'container-01 disconnected from bridge\nfallback management path retained for response team',
                status: 'Container network isolation confirmed.',
                afterExecute() {
                    markComplete('isolate');
                }
            },
            'sha256sum /tmp/.encrypt.sh': {
                output: '6df3e1e7de10d9cf938e1a04f8ef120f54f8adf78f2e44d0f8b2217f9b27ac49  /tmp/.encrypt.sh',
                status: 'Forensic hash captured for the malicious artifact.'
            }
        },
        resolveCommand(command, normalized) {
            if (normalized.includes('backup')) {
                return {
                    output: 'restore point verified\nlast clean snapshot: 2026-03-24 13:58 UTC',
                    status: 'Recovery checkpoint validated.',
                    afterExecute() {
                        markComplete('restore');
                    }
                };
            }

            return {
                output: `command not in seed dataset: ${command}\nreview seeded commands or continue analyst note taking`,
                variant: 'warning',
                status: 'No seeded response available for that command.'
            };
        }
    });

    renderProgress();
})();
