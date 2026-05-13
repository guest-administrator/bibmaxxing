# Bib Study Guide — Windows Command-Line Administrator's Pocket Consultant (2nd Edition)

> **Bib reference:** *Windows Command-Line Administrator's Pocket Consultant*, 2nd Edition — William R. Stanek (Microsoft Press, 2008, ISBN 978-0-7356-2262-3).
>
> **Regular-exam scope:** Appendix A.
> **Substitute-exam scope:** Appendix A.
> **Union — what this guide covers:** Stanek's Appendix A — the quick-reference table of core Windows command-line utilities, with brief syntax and common-use examples.

**Posture:** Appendix A is a command compendium. This guide organizes the commands by administrative task so you can recognize what each does on the exam and in the field. Pairs with `JCAC-WINDOWS.md` Module 7 (primarily §5 PowerShell, §10 Services, §20 Account Management) and `BOOK-RTFM.md` Windows recipes.

---

## Legacy CMD vs PowerShell

Stanek's book predates PowerShell's dominance and focuses on **cmd.exe** and the classic Win2003/XP-era commands. Most of these commands:

- Still ship with Windows 10/11.
- Remain the fastest path on restricted hosts.
- Are recognized by threat actors and defenders alike (LOLBin catalog).

Modern admin defaults to PowerShell, but the exam still references the cmd-era tools.

---

## System information

| Command | Purpose |
|---|---|
| `systeminfo` | OS version, build, domain, installed hotfixes, boot time, BIOS info |
| `hostname` | Computer name |
| `ver` | Short kernel version |
| `whoami` | Current user (add `/all`, `/groups`, `/priv`, `/upn`) |
| `wmic os get Caption,Version,BuildNumber,OSArchitecture` | Verbose OS info via WMIC |
| `wmic qfe list brief` | Installed patches |
| `driverquery` | Installed device drivers |
| `tasklist /v` | Processes with user and window title |
| `pushd` / `popd` | Directory stack |
| `set` | Environment variables (add `=value` to set) |
| `echo %ENVVAR%` | Print an env var |
| `doskey /history` | Command history in current session |

---

## Users, groups, and policy

| Command | Purpose |
|---|---|
| `net user` | List local users |
| `net user alice` | Details for user Alice |
| `net user alice Password1 /add` | Create local user |
| `net user alice /active:no` | Disable account |
| `net user alice /delete` | Remove account |
| `net user alice * /domain` | Change domain-user password interactively |
| `net localgroup` | List local groups |
| `net localgroup administrators alice /add` | Add user to local Administrators |
| `net accounts` | Password and lockout policy (local) |
| `net accounts /domain` | Same for domain |
| `net group "Domain Admins" /domain` | Domain group members |
| `gpresult /h report.html` | HTML Resultant Set of Policy report |
| `gpresult /r` | Brief RSoP |
| `gpupdate /force` | Re-apply Group Policy immediately |
| `rsop.msc` | RSoP graphical MMC |
| `secedit /export /cfg baseline.inf` | Export local security policy |
| `secedit /analyze /db db.sdb /cfg baseline.inf /log out.log` | Compare local to baseline |
| `auditpol /get /category:*` | Advanced audit policy |

---

## Services

| Command | Purpose |
|---|---|
| `sc query` | List services (running) |
| `sc queryex type= service state= all` | All services with PIDs |
| `sc qc <svc>` | Show service config (binary path, startup type, account) |
| `sc start <svc>` / `sc stop <svc>` | Start / stop |
| `sc create <name> binPath= "<path>" start= auto` | Create a service |
| `sc delete <svc>` | Remove service |
| `sc config <svc> start= disabled` | Disable |
| `net start` / `net stop` | Alternative; `net start <svc>` |
| `wmic service where "name='spooler'" get *` | Full WMI details |
| `wmic service where "startmode='Auto'" get name,startname` | List all auto services and their run accounts |
| `tasklist /svc` | Map services to hosting processes |

Remote variant: `sc \\target query` (requires admin + 445).

---

## Scheduled tasks

| Command | Purpose |
|---|---|
| `schtasks /query /fo LIST /v` | All tasks, verbose |
| `schtasks /create /tn "Updater" /tr "C:\scripts\u.bat" /sc daily /st 03:00` | Create daily task |
| `schtasks /create /tn "Updater" /tr cmd.exe /sc onlogon /ru SYSTEM` | Run at logon as SYSTEM |
| `schtasks /delete /tn "Updater" /f` | Delete |
| `schtasks /run /tn "Updater"` | Run now |
| `at 23:00 /interactive cmd` | Legacy `at` (removed on Win8+) |

---

## Processes

| Command | Purpose |
|---|---|
| `tasklist` | Basic process list |
| `tasklist /v` | With user + window title |
| `tasklist /m` | DLLs per process |
| `tasklist /svc` | Services hosted per process |
| `taskkill /IM notepad.exe /F` | Kill by image name |
| `taskkill /PID 1234 /F` | Kill by PID |
| `wmic process get name,pid,parentprocessid,commandline` | Process tree info |
| `wmic process where "name='notepad.exe'" call terminate` | WMIC kill |
| `wmic process call create "cmd /c whoami > c:\x.txt"` | Start a process via WMI (admin only) |

---

## File system

| Command | Purpose |
|---|---|
| `dir /a` | List all files incl. hidden |
| `dir /b /s c:\data\*.pdf` | Recursive, bare filenames |
| `where /r c:\ *.kdbx` | Search for filenames (faster than dir /s) |
| `copy / xcopy / robocopy` | Copy files; robocopy for robust resume/network |
| `robocopy src dst /MIR /Z /R:2 /W:5` | Mirror tree, restartable |
| `move` | Move / rename |
| `del / erase` | Delete |
| `rd /s /q dir` | Remove directory recursively |
| `attrib +h +r file` | Set file attributes |
| `icacls file /grant alice:F` | Grant full control to Alice |
| `icacls file /remove alice` | Remove Alice's ACE |
| `icacls file /inheritance:d` | Disable ACL inheritance |
| `takeown /f file /r /d y` | Take ownership |
| `cacls` | Legacy ACL tool (superseded by icacls) |
| `findstr /si "password" *.txt *.xml *.config` | Grep-equivalent |
| `find "error" log.txt` | Simpler substring match |
| `fsutil file layout path` | File metadata (NTFS) |
| `compact /c /s file` | NTFS compression |
| `cipher /w:c:\temp` | Zero unallocated space |

---

## Disk and storage

| Command | Purpose |
|---|---|
| `diskpart` | Interactive disk / partition management |
| `chkdsk /f /r c:` | Check/fix filesystem (requires reboot for system volume) |
| `fsutil volume diskfree c:` | Free space |
| `fsutil fsinfo drives` | List drives |
| `vssadmin list shadows` | Volume Shadow Copies |
| `vssadmin list writers` | VSS writers |
| `defrag c: /a` | Defragment (analyze) |
| `format d: /fs:ntfs /q` | Format |
| `mountvol` | Mount a volume at a drive letter or folder |
| `label d: NewName` | Change volume label |

---

## Network

| Command | Purpose |
|---|---|
| `ipconfig /all` | All interface info including DNS servers and DHCP |
| `ipconfig /release`, `ipconfig /renew`, `ipconfig /flushdns`, `ipconfig /displaydns` | DHCP and DNS cache ops |
| `getmac` | MAC addresses of local NICs |
| `route print` | Routing table |
| `route add 10.1.0.0 mask 255.255.0.0 10.0.0.1` | Add a static route |
| `arp -a` | ARP cache |
| `arp -s 10.0.0.5 aa-bb-cc-dd-ee-ff` | Static ARP (use rarely) |
| `netstat -anob` | Connections with owning process |
| `netstat -r` | Routing table (alt) |
| `ping target` | ICMP Echo |
| `tracert -d target` | Traceroute (no DNS) |
| `pathping target` | Combined ping + tracert showing per-hop loss |
| `nslookup target` | DNS query |
| `telnet target 80` | Test TCP connectivity (client not installed by default) |
| `nbtstat -A 10.0.0.5` | NetBIOS name table for a host |
| `nbtstat -c` | Local NetBIOS name cache |
| `net view \\server` | List shares on a remote |
| `net use Z: \\server\share` | Map drive |
| `net use` | List current mappings |
| `net share` | Local shares |
| `netsh` | Network shell — deep configuration of firewall / WLAN / DHCP / RAS |
| `netsh advfirewall set allprofiles state on` | Enable firewall |
| `netsh advfirewall firewall add rule name="Block80" dir=in action=block protocol=TCP localport=80` | Add firewall rule |
| `netsh wlan show profiles` | Saved Wi-Fi profiles |
| `netsh wlan show profile name="SSID" key=clear` | Reveal saved Wi-Fi password |
| `netsh interface portproxy add v4tov4 listenport=8080 connectaddress=10.0.0.5 connectport=80` | Port forward |

---

## Registry

| Command | Purpose |
|---|---|
| `reg query HKLM\Software\Microsoft\Windows\CurrentVersion\Run` | Query |
| `reg query <key> /v <value>` | Query specific value |
| `reg query <key> /s` | Recursive |
| `reg add <key> /v <value> /t REG_SZ /d "data" /f` | Add/modify value |
| `reg delete <key> /v <value> /f` | Remove value |
| `reg save <key> out.hive` | Save hive to file |
| `reg export <key> out.reg` | Export to text .reg |
| `reg import in.reg` | Import |

Common hive roots: `HKLM` (HKEY_LOCAL_MACHINE), `HKCU` (HKEY_CURRENT_USER), `HKU` (HKEY_USERS), `HKCR` (HKEY_CLASSES_ROOT), `HKCC` (HKEY_CURRENT_CONFIG).

---

## Event logs

| Command | Purpose |
|---|---|
| `wevtutil el` | List logs |
| `wevtutil qe Security /c:10 /rd:true /f:text` | Last 10 Security events reverse-time |
| `wevtutil epl Security Security.evtx` | Export log |
| `wevtutil cl Security` | Clear Security log (generates 1102 alert) |
| `eventvwr.msc` | GUI Event Viewer |
| `Get-WinEvent -LogName Security -MaxEvents 50` | PowerShell querying (modern) |
| `Get-EventLog Security -Newest 50` | Legacy cmdlet |

---

## Scripts and shell

| Command | Purpose |
|---|---|
| `cmd /c "command"` | Run and exit |
| `cmd /k "command"` | Run and keep shell open |
| `start program` | Launch in new window |
| `timeout /t 10` | Pause 10 s |
| `choice /c YN /m "Continue?"` | Interactive prompt |
| `if %errorlevel% neq 0 goto fail` | Conditional |
| `for /f "tokens=1,2" %a in (file.txt) do echo %a %b` | Parse file |
| `setlocal / endlocal` | Scope environment changes |
| `powershell -nop -w hidden -c "..."` | Launch PowerShell from cmd |
| `powershell -ep bypass -file script.ps1` | Run a script bypassing execution policy |

### Batch-file conventions

```bat
@echo off
setlocal enableextensions enabledelayedexpansion

if "%~1"=="" (
    echo usage: %~nx0 ^<arg^>
    exit /b 1
)

for /f "usebackq tokens=*" %%L in ("input.txt") do (
    echo Line: %%L
)

endlocal
exit /b 0
```

---

## Remote administration

| Command | Purpose |
|---|---|
| `psexec \\target -u user -p pass cmd.exe` | Sysinternals remote cmd (requires SMB + admin) |
| `winrs -r:target cmd` | Windows Remote Shell (WinRM must be enabled) |
| `wmic /node:target os get Caption` | Remote WMI query |
| `wmic /node:target process call create "cmd /c whoami"` | Remote process spawn via WMI |
| `sc \\target query` | Remote service query |
| `reg query \\target\HKLM\...` | Remote registry query (requires Remote Registry service) |
| `schtasks /s target /query` | Remote task enumeration |

For modern ops, **PowerShell Remoting** (`Enter-PSSession`, `Invoke-Command`) is the preferred tool.

---

## User account and profile

| Command | Purpose |
|---|---|
| `logoff` | Log off current session |
| `shutdown /s /t 0` | Immediate shutdown |
| `shutdown /r /t 60 /c "reboot in 1 min"` | Scheduled restart with comment |
| `shutdown /a` | Abort pending shutdown |
| `query session` / `qwinsta` | List user sessions (RDP/local) |
| `query user` / `quser` | Active users on this machine |
| `logoff 2` | Log off session ID 2 |
| `rundll32 user32.dll,LockWorkStation` | Lock screen |
| `runas /user:DOMAIN\alice "cmd.exe"` | Run as another user |

---

## Cross-references

- **[Windows Command-Line Administrator's Pocket Consultant, 2e](../references/Windows%C2%AE%20Command-Line%20Administrators%20Pocket%20Consultant,%20Second%20Edition-9780735622623.pdf)** — text on disk.
- **[Microsoft Docs — Windows Commands](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands)** — current full reference.
- **[Sysinternals Suite](https://learn.microsoft.com/en-us/sysinternals/)** — PsExec, PsList, PsService, Autoruns.
- `JCAC-WINDOWS.md` — Module 7 Windows coverage.
- `BOOK-WIN-INTERNALS-1.md` · `BOOK-WIN-INTERNALS-2.md`.
- `BOOK-RTFM.md` — attacker-oriented Windows recipes.

---

## Exam-testable concepts (rapid-fire)

- **Command to list local users?** `net user`.
- **Command to list local groups?** `net localgroup`.
- **Command to list password/lockout policy?** `net accounts`.
- **Command to see running services?** `sc query` or `net start` (without args).
- **Command to see service config?** `sc qc <name>`.
- **Command to kill a process by PID?** `taskkill /PID <pid> /F`.
- **Command to query Security event log (CLI)?** `wevtutil qe Security ...`.
- **Event ID generated when Security log is cleared?** 1102.
- **Command to view routing table?** `route print`.
- **Command to clear DNS cache?** `ipconfig /flushdns`.
- **Command to reveal saved Wi-Fi password?** `netsh wlan show profile name="SSID" key=clear`.
- **Command to export a registry subkey?** `reg export <key> file.reg`.
- **Command to create a scheduled task at logon as SYSTEM?** `schtasks /create /tn name /tr cmd /sc onlogon /ru SYSTEM`.
- **Command to create a service with auto-start?** `sc create <n> binPath= "<path>" start= auto`.
- **WMI CLI tool name?** wmic.
- **Remote WMI command to create a process?** `wmic /node:target process call create "<cmd>"`.
- **Modern recommended remote-admin protocol?** WinRM / PowerShell Remoting (5985 HTTP / 5986 HTTPS).
- **Bypass PowerShell execution policy?** `powershell -ep bypass -file script.ps1`.
- **Command to lock the workstation?** `rundll32 user32.dll,LockWorkStation`.
