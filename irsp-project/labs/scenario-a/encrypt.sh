#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="/srv/shared"
LOG_FILE="/var/log/responsegrid/lab.log"
RANSOM_NOTE="${TARGET_DIR}/README_RESTORE.txt"

log_line() {
    printf '%s %s\n' "$(date -Iseconds)" "$1" >> "$LOG_FILE"
}

touch "$LOG_FILE"
log_line "simulator start pid=$$ target=${TARGET_DIR}"
echo "ResponseGrid training note: files were renamed by the safe simulator." > "$RANSOM_NOTE"

find "$TARGET_DIR" -maxdepth 1 -type f ! -name '*.lock' ! -name 'README_RESTORE.txt' | while read -r file; do
    mv "$file" "${file}.lock"
    log_line "rename file=$(basename "$file") output=$(basename "${file}.lock")"
    sleep 1
done

while true; do
    if [[ -f /tmp/.c2-blocked ]]; then
        log_line "c2 status=blocked dest=203.0.113.42:8443"
        sleep 8
        continue
    fi

    log_line "beacon dest=203.0.113.42:8443 status=attempt process=$$"
    sleep 8
done
