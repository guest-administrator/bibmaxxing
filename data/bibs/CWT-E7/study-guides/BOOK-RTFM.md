# Bib Study Guide — Red Team Field Manual v2 (Clark, Downer)

> **Bib reference:** *Red Team Field Manual v2* — Ben Clark, Nick Downer (self-published, 2022). Called out simply as "Red Team Field Manual" or "Red Team Field Manual Ver. 2" on the Bib.
>
> **Regular-exam scope:** Section **Windows**.
> **Substitute-exam scope:** Study topics on **tradecraft concerns** and **Linux system enumeration**.
> **Union — what this guide covers:** RTFM's Windows enumeration + post-exploit recipes, Linux enumeration recipes, and the "tradecraft concerns" (OPSEC, artifact minimization) that frame every RTFM recipe.

**Posture:** RTFM is a pocket reference — short command snippets with one-line explanations. This study guide consolidates the snippets into exam-relevant topic clusters and adds the defender-visibility notes RTFM doesn't always spell out. Pairs with `BOOK-BTFM.md` (defender companion) and `JCAC-ACTIVE-EXPLOIT.md`.

---

## Tradecraft concerns (the framing lens)

Every RTFM command should be read with these in mind:

1. **Artifacts** — what does this leave on disk, in memory, in logs?
2. **Authentication trail** — what SID / user token does this run as? What does it show in 4624/4625?
3. **Network footprint** — what packets leave the box? Are they distinguishable from normal traffic?
4. **Attribution** — does this use TOR, a VPN, an attacker-controlled residential proxy, or the engagement redirector?
5. **Reversibility** — can the target administrator undo / detect this easily?
6. **Escalation** — does this require elevation? Can we survive without UAC consent?
7. **Stability** — will this crash the target or trip a safety feature?

### Baseline tradecraft rules

- **Minimize writes to disk** — prefer in-memory execution; avoid dropping binaries.
- **Clean up temp files** — if you must write, remove after.
- **Live off the land** — see `BOOK-ADV-TRADECRAFT.md` LOLBAS/GTFOBins.
- **Match expected paths** — `C:\Windows\Temp\` is less suspicious than `C:\Users\Public\pwn\`.
- **Timestamp hygiene** — touch files to match neighbors when possible.
- **Log discipline** — avoid clearing logs wholesale (creates alerts); surgical edits are hard.
- **Cadence discipline** — jitter C2 beacons ±20%.
- **Environment recon first** — know the monitoring before acting.

---

## Windows — enumeration recipes (RTFM Windows section)

### System info

```
systeminfo                               # build, hotfixes, domain, boot time
hostname                                 # computer name
whoami /all                              # user, groups, privileges, SID
whoami /priv                             # just privileges
wmic os get Caption,Version,BuildNumber,OSArchitecture
wmic qfe list brief                      # installed patches
Get-ComputerInfo                         # PowerShell — comprehensive
Get-HotFix
ver
```

### Users and groups

```
net user                                 # local users
net user Administrator                   # details of Administrator
net localgroup                           # local groups
net localgroup administrators            # members of local Administrators
net accounts                             # password / lockout policy
net user /domain                         # domain users (if domain-joined)
net group "Domain Admins" /domain        # Domain Admins
net group "Enterprise Admins" /domain
wmic useraccount get name,sid,disabled
Get-LocalUser
Get-LocalGroupMember administrators
```

### Processes, services, scheduled tasks

```
tasklist                                 # processes
tasklist /v                              # verbose (user, window title)
tasklist /svc                            # services per process
tasklist /m                              # DLLs per process

sc query                                 # services
sc qc <name>                             # service config (path, startup, account)
sc queryex type= service state= all      # all services, full info
wmic service get name,displayname,startname,pathname,startmode,state

schtasks /query /fo LIST /v              # scheduled tasks
Get-ScheduledTask | Where-Object State -EQ Running
```

### Network state

```
ipconfig /all
route print
arp -a
netstat -anob                            # with -b shows owning process
netstat -r                               # routes
ping -n 2 10.0.0.1
nslookup target
tracert -d target
Get-NetIPConfiguration
Get-NetTCPConnection -State Listen
Get-DnsClientCache
```

### Shares and files

```
net share                                # local shares
net use                                  # current SMB connections
net view                                 # nearby hosts (if browsing works)
net view \\server                        # shares on a remote
net view /domain:CORP                    # domain hosts

dir /b /s c:\                            # recursive listing
where /r c:\ *.kdbx                      # find password DBs
findstr /si "password" *.txt *.xml *.ini *.config

# PowerShell recursive with filter
Get-ChildItem -Path c:\ -Include *.kdbx -Recurse -ErrorAction SilentlyContinue
```

### Registry

```
reg query HKLM\Software\Microsoft\Windows\CurrentVersion\Run
reg query HKCU\Software\Microsoft\Windows\CurrentVersion\Run
reg query HKLM\System\CurrentControlSet\Control\Lsa
reg query "HKLM\System\CurrentControlSet\Services" /s | findstr "ImagePath"

# Unattended install files (sometimes contain credentials)
dir /b /s c:\unattend.xml c:\Windows\Panther\unattend.xml c:\Windows\Panther\Unattend\unattended.xml
```

### Windows version / patch gaps

```
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
wmic qfe list full /format:table
Get-HotFix
```

Cross-reference missing KBs against Microsoft's CVE index to find local privesc opportunities.

### AD enumeration (domain-joined)

```
nltest /dsgetdc:<domain>                 # find a DC
nltest /domain_trusts                    # trusted domains
nltest /domain_trusts /all_trusts

# With RSAT / Domain-joined PowerShell
Get-ADDomain
Get-ADForest
Get-ADUser -Filter *
Get-ADGroup -Filter *
Get-ADGroupMember "Domain Admins"
Get-ADComputer -Filter *
Get-ADUser -Filter { ServicePrincipalName -like "*" } -Properties ServicePrincipalName  # SPNs → Kerberoast targets
Get-ADUser -Filter { DoesNotRequirePreAuth -eq $true } -Properties DoesNotRequirePreAuth  # AS-REP roastable
```

### Credentials (on the box)

```
cmdkey /list                             # stored credentials

# Saved browser logins — usually in DPAPI-protected files per-user
dir /s /b "%AppData%\Microsoft\Credentials"

# Unattended install / deployment files
type c:\Windows\Panther\Unattend.xml
type c:\Windows\Panther\Unattended.xml
type c:\Windows\sysprep.inf
type c:\Windows\sysprep\sysprep.xml
type "c:\Users\Public\autounattend.xml"

# Group Policy Preferences — historical cpassword
findstr /s /i cpassword \\<domain>\sysvol\*.xml
```

### Remote execution primitives

```
# PowerShell Remoting
Enter-PSSession -ComputerName target
Invoke-Command -ComputerName target -ScriptBlock { whoami }

# wmic
wmic /node:target process call create "cmd /c whoami"

# schtasks (remote)
schtasks /create /tn "x" /tr "cmd /c whoami" /sc once /st 23:59 /s target /u admin /p pw

# SMB + service (psexec-style)
sc \\target create x binPath= "cmd /c whoami > C:\x.txt"
sc \\target start x

# WinRM
winrs -r:target cmd /c whoami
```

### Defender signals (Windows)

- **4624 Type 3** network logons — correlate source IP.
- **4672** — special privileges assigned (indicates admin or equivalent).
- **4688** — process creation (if enabled; also Sysmon ID 1).
- **Sysmon ID 3** — network connection.
- **Security-Mitigations log** — various mitigation actions.
- **WMI activity log** — WMI use.

---

## Linux — enumeration recipes (RTFM "Linux system enumeration")

### System info

```
uname -a
cat /etc/os-release
cat /etc/issue
hostname
whoami; id
lsb_release -a                            # (Debian/Ubuntu)
uptime
date
```

### Users and groups

```
cat /etc/passwd                           # all users + shells
cat /etc/shadow                           # hashes (root only)
cat /etc/group
getent passwd
w                                         # currently-logged-in users
last -n 20                                # recent logins
lastlog                                    # per-user last-login
who
```

### Processes, services, scheduled jobs

```
ps auxf                                   # full tree
ps -ef
top / htop
systemctl list-units --type=service --state=running
service --status-all                      # legacy SysV

# Cron
cat /etc/crontab
ls -la /etc/cron.*
crontab -l                                # current user
cat /var/spool/cron/*                     # all user crontabs (root)

# systemd timers
systemctl list-timers
```

### Network

```
ip addr
ip route
ip neigh                                  # ARP cache
ss -tulnp                                 # listening TCP+UDP with process (modern)
netstat -tulnp                            # legacy
netstat -r
resolvectl status                         # DNS config (systemd-resolved)
cat /etc/resolv.conf
cat /etc/hosts
cat /etc/nsswitch.conf
iptables -L -v -n; iptables -t nat -L -v -n
nft list ruleset                          # nftables
```

### Files and searches

```
ls -la
find / -perm -4000 -type f 2>/dev/null    # SUID binaries
find / -perm -2000 -type f 2>/dev/null    # SGID binaries
find / -type f -writable ! -path "/proc/*" 2>/dev/null | grep -v /sys/
find / -name "id_rsa" 2>/dev/null
find /home -name ".bash_history" 2>/dev/null
find / -name ".env" -type f 2>/dev/null
find / -name "*.kdbx" 2>/dev/null

grep -r "password" /etc/ 2>/dev/null | grep -v Binary
grep -r "BEGIN .* PRIVATE KEY" / 2>/dev/null | head

# World-writable paths
find / -perm -0002 -type d 2>/dev/null

# Recently-modified
find / -newermt "2026-04-20" -type f 2>/dev/null
```

### SUID / capabilities / sudo

```
find / -perm -4000 -type f 2>/dev/null    # SUID list
sudo -l                                   # what can I run as sudo?
getcap -r / 2>/dev/null                   # Linux capabilities on binaries
```

Compare SUID list against GTFOBins catalog for easy wins. Unusual `sudo -l` entries (wildcards, specific editors, NOPASSWD) are privesc hooks.

### Kernel / userland versions (for exploit targeting)

```
uname -r                                  # kernel version
cat /proc/version
dpkg -l | head                            # (Debian) installed packages
rpm -qa | head                            # (RHEL)
cat /etc/apt/sources.list
cat /etc/yum.repos.d/*.repo
```

### History and environment

```
cat ~/.bash_history
cat ~/.zsh_history
cat ~/.ssh/authorized_keys                # who else can SSH as us
cat ~/.ssh/known_hosts                    # where we've SSHed to
env                                       # environment variables
cat /etc/environment
cat /proc/self/environ
```

### Container / virt detection

```
ls -la /.dockerenv                        # Docker container
cat /proc/1/cgroup                        # shows container runtime
systemd-detect-virt                       # full VM/container enumeration
dmesg | grep -i hyper-v
dmesg | grep -i xen
dmesg | grep -i vmware
```

### Automated enumeration tools

- **linPEAS** (`linpeas.sh`) — bundles hundreds of checks with color-coded severity.
- **LinEnum.sh** — legacy but still useful.
- **linux-exploit-suggester** — maps kernel version to known exploits.
- **pspy** — process snooper without root (catches cron/service activity).

### Defender signals (Linux)

- **auditd rules** on `/etc/passwd`, `/etc/shadow`, `/etc/sudoers` — `-w /etc/passwd -p wa -k identity`.
- **Log gaps** in `/var/log/auth.log` — attacker tampering.
- **Process anomalies** — parent-child tree divergence.
- **Unexpected SUID** — baseline + delta.
- **`/etc/ld.so.preload` existence** — strong indicator of user-mode rootkit.
- **Kernel module additions** — `lsmod` diff + `/sys/module/`.
- **FIM tools** — AIDE, Tripwire, OSSEC.

---

## Windows post-exploit recipes (RTFM Windows)

### Mimikatz high-level (concept)

Mimikatz reads credential material from LSASS memory. On a Windows host:

- **sekurlsa::logonpasswords** — dump credentials (NT hashes, Kerberos tickets, sometimes plaintext).
- **lsadump::sam** — SAM database (local user hashes).
- **lsadump::secrets** — LSA secrets (service account credentials).
- **lsadump::dcsync /domain:CORP /user:krbtgt** — replicate a domain principal's hash (requires DS-Replication-Get-Changes-All).
- **kerberos::golden** — forge a Golden Ticket given `krbtgt` hash.
- **kerberos::ptt <ticket.kirbi>** — pass the ticket into current session.
- **token::elevate** — impersonate SYSTEM if SeImpersonatePrivilege held.

Defender: **Credential Guard** (VBS) moves LSASS secrets to LSAISO — Mimikatz reads fail; **LSASS Protected Process Light** restricts handles; AV signatures catch the Mimikatz binary (but in-memory variants evade).

### Remote command execution options

| Method | Requires | Notes |
|---|---|---|
| PsExec | Admin on target, 445 open | Creates a temp service; noisy |
| WMI (wmic / Invoke-WmiMethod) | Admin, 135+ephemeral | Quieter than PsExec |
| PowerShell Remoting | 5985/5986, WinRM enabled | Modern preferred |
| Scheduled Task | Admin, task can exec | Persistence bonus |
| Service Create | Admin, 445 | Leaves service artifact |
| DCOM lateral | Admin + DCOM object | Exotic (MMC20.Application, ExcelDDE) |
| WinRS | 5985 open | Simpler than PS remoting |
| RDP | 3389 + credentials | Creates full session |
| SMB share + schtasks | 445 + admin | Layered approach |

### Password hash extraction paths

- `reg save HKLM\SAM sam.save` + `reg save HKLM\SYSTEM system.save` → offline `secretsdump.py` (Impacket).
- Volume Shadow Copy + copy NTDS.DIT → `secretsdump.py -ntds ntds.dit system.hive`.
- Direct LSASS dump (procdump / rundll32 comsvcs.dll) — AV/EDR heavily flagging nowadays.

---

## Common tradecraft concerns by action

| Action | Concern | Mitigation |
|---|---|---|
| Scanning from implant host | Source correlation to C2 | Route through redirector; use operator's CIDR, not target-owned |
| Dropping a tool binary to disk | AV hash/signature match | Prefer in-memory; use LOLBins |
| Running a privileged process | 4688 / Sysmon 1 + command-line logging | Use living-off-the-land; avoid PowerShell if Script Block Logging active |
| Creating a service | 7045 / 4697 | Use existing service modification instead of new service |
| Dumping LSASS | Sysmon 10 / Defender flagging | Credential Guard blocks anyway on modern; use Kerberos tickets instead |
| Kerberos ticket requests at odd times | 4769 volume | Stagger requests; use already-issued TGS |
| DNS tunneling | DNS anomaly detection | Use rare TXT record volumes; stagger queries |
| Large outbound exfil | NetFlow alarms | Chunk, encrypt, send during business hours; abuse trusted CDNs |

---

## Cross-book connections

- Windows recipes ↔ `JCAC-WINDOWS.md` · `BOOK-WIN-INTERNALS-1.md` · `BOOK-ADV-TRADECRAFT.md`.
- Linux enumeration ↔ `JCAC-UNIX-LINUX.md` · GTFOBins.
- Tradecraft concerns ↔ `BOOK-ADV-TRADECRAFT.md` Ch 4 (blending in).
- Defender signals ↔ `BOOK-BTFM.md` · `BOOK-NET-INTRUSION.md` · `JCAC-WINDOWS.md` §6 logging.

---

## Exam-testable concepts (rapid-fire)

### Windows enumeration

- **Command to see local users?** `net user`.
- **Command to see domain users?** `net user /domain`.
- **Command to enumerate Domain Admins?** `net group "Domain Admins" /domain`.
- **Command to see processes with owning user?** `tasklist /v`.
- **Command to see services with binary paths?** `sc qc <name>` (specific) or `wmic service get ...` (all).
- **Command to see listening ports with processes?** `netstat -anob`.
- **Command to see stored credentials?** `cmdkey /list`.
- **Search for password strings in files?** `findstr /si "password" *.txt *.xml *.ini *.config`.
- **File to check for domain Group Policy Preferences cpassword?** `\\<domain>\SYSVOL\*.xml` → findstr `cpassword`.
- **Command to find a DC?** `nltest /dsgetdc:<domain>`.
- **PowerShell to see scheduled tasks?** `Get-ScheduledTask`.

### Linux enumeration

- **Kernel version?** `uname -r`.
- **OS release info?** `/etc/os-release`.
- **Currently-logged-in users?** `who` or `w`.
- **Recent logins?** `last`.
- **All SUID binaries?** `find / -perm -4000 -type f 2>/dev/null`.
- **Capabilities on binaries?** `getcap -r / 2>/dev/null`.
- **What can I run with sudo?** `sudo -l`.
- **Listening sockets with processes?** `ss -tulnp` (or `netstat -tulnp`).
- **DNS client config?** `/etc/resolv.conf` + `/etc/nsswitch.conf`.
- **Writable dirs systemwide?** `find / -perm -0002 -type d 2>/dev/null`.
- **Container detection one-liner?** `systemd-detect-virt`.
- **User bash history?** `cat ~/.bash_history`.
- **Automated enumeration tool bundle?** linPEAS (or LinEnum).

### Tradecraft

- **Noisiest remote-exec method?** PsExec (creates temp service, large event-log footprint).
- **Quietest Windows remote-exec?** WMI or PowerShell Remoting with JEA constraints.
- **Credential-dump primary target process?** lsass.exe.
- **Modern mitigation against LSASS dumping?** Credential Guard (VBS) + LSASS-as-PPL.
- **Why avoid wholesale log clearing?** It triggers its own alerts (event 1102 on Windows; gaps in remote-forwarded logs).
- **Beacon jitter purpose?** Evade periodicity-based detection.
- **Living-off-the-land rationale?** Blend with legitimate admin tooling; avoid AV/signature hits on custom binaries.

---

## Cross-references

- **[Red Team Field Manual v2](../references/RTFM%20Red%20Team%20Field%20Manual%20v2%20--%20Ben%20Clark%20%26%20Nick%20Downer.pdf)** — text on disk.
- **[LOLBAS](https://lolbas-project.github.io/)** · **[GTFOBins](https://gtfobins.github.io/)**.
- **[PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings)**.
- **[Impacket](https://github.com/fortra/impacket)** · **[CrackMapExec / NetExec](https://github.com/Pennyw0rth/NetExec)**.
- **[linPEAS / winPEAS](https://github.com/carlospolop/PEASS-ng)**.
- **[MITRE ATT&CK](https://attack.mitre.org/)**.
- `BOOK-BTFM.md` — defender companion.
- `BOOK-ADV-TRADECRAFT.md` · `JCAC-ACTIVE-EXPLOIT.md` · `JCAC-WINDOWS.md` · `JCAC-UNIX-LINUX.md`.
