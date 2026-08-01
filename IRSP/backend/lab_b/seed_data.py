# Lab B (Endpoint Investigation) seed data: one coherent attack story on
# DESKTOP-GRQ4G1E (192.168.32.129) with lateral movement to WS-FINANCE-03
# (192.168.32.130) - phishing -> macro execution -> staged download ->
# scheduled-task persistence -> UAC bypass -> defense evasion -> credential
# access -> discovery -> lateral movement -> collection/C2 -> ransomware
# impact -> containment/remediation.
#
# Every event matches a keyword pattern backend/lab_b/assessment.py's
# questions expect, so filtering on an alert's real evidence always returns
# relevant matches.

PRIMARY_HOST = "DESKTOP-GRQ4G1E"
PRIMARY_IP = "192.168.32.129"
LATERAL_HOST_IP = "192.168.32.130"  # WS-FINANCE-03

# (offset_minutes_from_base, alert_key, severity, risk_score, host, title, status, technique_id)
ALERTS = [
    (0, "powershell-execution-policy", "high", 87, PRIMARY_HOST,
     "PowerShell execution policy bypass observed on endpoint", "new", "T1059.001"),
    (6, "scheduled-task-persistence", "critical", 92, PRIMARY_HOST,
     "Suspicious scheduled task registered with OnLogon trigger", "new", "T1053.005"),
    (12, "fodhelper-uac-bypass", "critical", 90, PRIMARY_HOST,
     "UAC bypass via fodhelper.exe registry hijack", "new", "T1548.002"),
    (16, "defender-tamper-attempt", "high", 81, PRIMARY_HOST,
     "Windows Defender tamper attempt via Set-MpPreference", "new", "T1562.001"),
    (20, "credential-history-access", "high", 78, PRIMARY_HOST,
     "PowerShell history and credential artifacts accessed", "new", "T1552.001"),
    (24, "hidden-user-created", "high", 83, PRIMARY_HOST,
     "Hidden local administrator account created", "escalated", "T1136.001"),
    (28, "remote-winrm-lateral", "critical", 95, LATERAL_HOST_IP,
     "WinRM lateral movement to WS-FINANCE-03", "escalated", "T1021.006"),
    (33, "staged-payload-download", "medium", 62, PRIMARY_HOST,
     "Staged payload downloaded from external repository", "new", "T1105"),
    (37, "collection-staging", "high", 84, PRIMARY_HOST,
     "Finance documents archived ahead of outbound transfer", "new", "T1560.001"),
    (41, "ransom-note-dropped", "critical", 98, PRIMARY_HOST,
     "Ransom note dropped and opened on endpoint", "escalated", "T1491.001"),
]

# (offset_minutes, host, sourcetype, severity, user, process_name, parent_process,
#  dest_ip, dest_port, query_name, task_name, technique_id, event_id, event_text)
LOGS = [
    # --- Initial Access -----------------------------------------------
    (0, PRIMARY_HOST, "mail:gateway", "medium", "jsmith", "", "", "", "", "", "", "T1566.001", "",
     'Phishing email delivered attachment=invoice_Q3.xlsm subject="Overdue Invoice - Please Review" '
     'sender=billing@corp-updates.net recipient=jsmith@irsp.local'),
    (1, PRIMARY_HOST, "sysmon:process", "medium", "jsmith", "EXCEL.EXE", "explorer.exe", "", "", "", "", "T1566.001", "1",
     'Process Create: EXCEL.EXE opened PhishingAttachment.xlsm and enabled macro content'),

    # --- Execution -------------------------------------------------------
    (2, PRIMARY_HOST, "sysmon:process", "high", "jsmith", "powershell.exe", "EXCEL.EXE", "", "", "", "", "T1059.001", "1",
     'Process Create: powershell.exe -NoProfile -ExecutionPolicy Bypass -File invoice_macro.ps1'),
    (3, PRIMARY_HOST, "powershell:operational", "high", "jsmith", "powershell.exe", "", "", "", "", "", "T1059.001", "4104",
     'ScriptBlock logged: Invoke-WebRequest using WebClient.DownloadFile to fetch staged payload'),
    (3, PRIMARY_IP, "sysmon:network", "high", "jsmith", "powershell.exe", "", "140.82.112.3", "443", "", "", "T1105", "3",
     'Network connection detected: powershell.exe from 192.168.32.129 to 140.82.112.3:443 '
     '(raw.githubusercontent.com) downloading T1560-data-ps.zip, referencing LICENSE.txt'),

    # --- Persistence -------------------------------------------------------
    (6, PRIMARY_HOST, "windows:taskscheduler", "critical", "SYSTEM", "schtasks.exe", "powershell.exe", "", "", "", "WindowsUpdate_svc", "T1053.005", "106",
     'schtasks /create /tn WindowsUpdate_svc /sc onlogon /rl highest - Scheduled Task registered (T1053_005)'),
    (7, PRIMARY_HOST, "windows:taskscheduler", "medium", "SYSTEM", "", "", "", "", "", "WindowsUpdate_svc", "T1053.005", "200",
     'Task Scheduler: task "WindowsUpdate_svc" started on OnStartup trigger'),

    # --- Privilege Escalation ----------------------------------------------
    (9, PRIMARY_HOST, "sysmon:registry", "critical", "jsmith", "fodhelper.exe", "explorer.exe", "", "", "", "", "T1548.002", "13",
     'Registry value set HKCU\\Software\\Classes\\ms-settings\\shell\\open\\command (DelegateExecute) '
     'then fodhelper.exe launched for UAC bypass'),
    (10, PRIMARY_HOST, "sysmon:registry", "high", "jsmith", "eventvwr.exe", "explorer.exe", "", "", "", "", "T1548.002", "13",
     'eventvwr.msc launched then mscfile handler hijacked via HKCU\\Software\\Classes\\mscfile - Registry value set (SetValue)'),

    # --- Defense Evasion ----------------------------------------------
    (16, PRIMARY_HOST, "powershell:operational", "high", "SYSTEM", "powershell.exe", "", "", "", "", "", "T1562.001", "4104",
     'Set-MpPreference -DisableRealtimeMonitoring $true -DisableIOAVProtection $true -DisableScriptScanning $true '
     '- Defender tamper attempt'),
    (17, PRIMARY_HOST, "powershell:operational", "high", "SYSTEM", "powershell.exe", "", "", "", "", "", "T1562.001", "4104",
     'Set-MpPreference -DisableRealtimeMonitoring $true and ControlledFolderAccess disabled - security service tamper'),

    # --- Credential Access ----------------------------------------------
    (20, PRIMARY_HOST, "powershell:operational", "high", "jsmith", "powershell.exe", "", "", "", "", "", "T1552.001", "4104",
     'Get-Content ConsoleHost_history.txt reviewed for stored PowerShell history and password references'),
    (21, PRIMARY_HOST, "sysmon:process", "critical", "SYSTEM", "procdump.exe", "powershell.exe", "", "", "", "", "T1003.001", "1",
     'Process Create: procdump.exe -ma lsass.exe lsass_dump.dmp - credential dumping attempt against LSASS registry'),

    # --- Discovery ----------------------------------------------
    (23, PRIMARY_HOST, "sysmon:process", "low", "jsmith", "whoami.exe", "powershell.exe", "", "", "", "", "T1033", "1",
     'Process Create: whoami /all - CommandLine executed for account discovery'),
    (23, PRIMARY_HOST, "sysmon:process", "low", "jsmith", "cmd.exe", "powershell.exe", "", "", "", "", "T1016", "1",
     'Process Create: ipconfig /all && systeminfo && netstat -ano && tasklist - Network connection detected during host discovery'),

    # --- Hidden local user (Initial-Access-classified persistence of access) --
    (24, PRIMARY_HOST, "windows:security", "critical", "SYSTEM", "net.exe", "cmd.exe", "", "", "", "", "T1136.001", "4720",
     'net user hiddenuser P@ssw0rd123 /add /active:yes then added to local Administrators group'),

    # --- Lateral Movement ----------------------------------------------
    (28, PRIMARY_HOST, "windows:security", "critical", "hiddenuser", "wsmprovhost.exe", "svchost.exe", "", "", "", "", "T1021.006", "4624",
     'Invoke-Command -ComputerName 192.168.32.130 -ScriptBlock {whoami} over WinRM using stolen credentials'),
    (29, LATERAL_HOST_IP, "windows:security", "high", "hiddenuser", "", "", "", "", "", "", "T1021.006", "4624",
     'WinRM remote session established from DESKTOP-GRQ4G1E; whoami executed on WS-FINANCE-03'),

    # --- Collection / C2 / Exfiltration ----------------------------------
    (33, PRIMARY_HOST, "sysmon:file", "high", "hiddenuser", "powershell.exe", "", "", "", "", "", "T1560.001", "11",
     'File created: Compress-Archive staged finance documents into archive.zip ahead of outbound transfer'),
    (34, PRIMARY_IP, "sysmon:network", "critical", "hiddenuser", "powershell.exe", "", "203.0.113.77", "443", "", "", "T1071.001", "3",
     'Outbound TLS connection with unusual user-agent to 203.0.113.77:443 - staged C2 beacon, bytes_out=982341'),

    # --- Impact ----------------------------------------------
    (41, PRIMARY_HOST, "sysmon:process", "critical", "hiddenuser", "notepad.exe", "explorer.exe", "", "", "", "", "T1491.001", "1",
     'Process Create: notepad.exe opened READ_ME_NOW.txt - ransom note dropped on Desktop (T1491)'),

    # --- Artifact staging (for the "Artifact Cleanup" chip) --------------
    (42, PRIMARY_HOST, "sysmon:file", "low", "hiddenuser", "", "", "", "", "", "", "", "11",
     'File created TargetFilename=C:\\Users\\jsmith\\AppData\\Local\\Temp\\PhishingAttachment.xlsm staged for cleanup'),

    # --- Recovery / Remediation (analyst response actions) ---------------
    (50, PRIMARY_HOST, "powershell:operational", "low", "analyst", "powershell.exe", "", "", "", "", "", "", "4104",
     'Get-ExecutionPolicy returns RemoteSigned; ConsoleHost_history exported for the case file - Verification complete'),
    (51, PRIMARY_HOST, "powershell:operational", "low", "analyst", "powershell.exe", "", "", "", "", "", "", "4104",
     'Disable-PSRemoting -Force; Stop-Service WinRM; Set-Service WinRM -StartupType Disabled - remote administration locked down'),
    (52, PRIMARY_HOST, "windows:taskscheduler", "low", "analyst", "", "", "", "", "", "WindowsUpdate_svc", "T1053.005", "141",
     'Unregister-ScheduledTask -TaskName WindowsUpdate_svc -Confirm:$false - persistence removed'),
    (53, PRIMARY_HOST, "powershell:operational", "low", "analyst", "powershell.exe", "", "", "", "", "", "", "4104",
     'Get-LocalUser hiddenuser reviewed then Remove-LocalGroupMember -Group Administrators -Member hiddenuser; '
     'Remove-LocalUser -Name hiddenuser - unauthorized account removed'),
    (54, PRIMARY_HOST, "powershell:operational", "low", "analyst", "powershell.exe", "", "", "", "", "", "", "4104",
     'Get-MpComputerStatus confirms RealTimeProtectionEnabled=True AntivirusEnabled=True and WinDefend service Running '
     '- protections restored'),
    (55, PRIMARY_HOST, "powershell:operational", "low", "analyst", "powershell.exe", "", "", "", "", "", "", "4104",
     'Remove-Item staged payload files; Remove-ItemProperty HKCU:\\Software\\Classes\\ms-settings\\shell\\open\\command; '
     'Set-NetFirewallProfile -Enabled True; Remove-NetFirewallRule -DisplayName C2-Allow; '
     'Set-ExecutionPolicy RemoteSigned -Force - endpoint restored to clean state'),
]
