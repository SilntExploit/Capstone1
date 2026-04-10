#!/usr/bin/env bash
set -euo pipefail

mkdir -p /srv/shared /var/log/responsegrid
rm -rf /srv/shared/*
cp -R /opt/responsegrid/seed/. /srv/shared/

cp /opt/responsegrid/encrypt.sh /tmp/.encrypt.sh
chmod 755 /tmp/.encrypt.sh
rm -f /tmp/.c2-blocked /tmp/.containment-marker /tmp/.restore-marker

echo "$(date -Iseconds) seeded scenario-a workspace" >> /var/log/responsegrid/lab.log

bash /tmp/.encrypt.sh > /var/log/responsegrid/encrypt.stdout.log 2>&1 &

exec tail -f /var/log/responsegrid/lab.log /var/log/responsegrid/encrypt.stdout.log
