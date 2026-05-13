# Bib Study Guide — CompTIA Security+ SY0-601 Cert Guide (5th Edition, Santos)

> **Bib reference:** *CompTIA Security+ SY0-601 Cert Guide*, 5th Edition — Omar Santos, Ron Taylor, Joseph Mlodzianowski (Pearson, 2021, ISBN 978-0-13-677031-2).
>
> **Regular-exam scope:** Study topics on **log files**.
> **Substitute-exam scope:** not listed.
> **Union — what this guide covers:** Log files — what to collect, where to find them on Windows and Linux, how to centralize (syslog, Windows Event Forwarding, SIEM), and how to interpret them for incident response.

**Posture:** Narrow but high-value scope. Log literacy separates a Chief who runs a SOC from one who gets run by it. Pairs with `JCAC-WINDOWS.md` §6 (Windows Logging), `JCAC-UNIX-LINUX.md` §25 (Linux Logs and Auditing), `BOOK-NET-INTRUSION.md` Ch 13 (IDS analyst workflow), and `BOOK-CYBER-OPS.md` Ch 16 (SIEM + SOAR).

---

## Why logs matter

Logs answer three investigator questions:

1. **What happened?** Which user, process, or host took which action.
2. **When?** Timestamp correlation across systems.
3. **Is it ongoing?** Post-incident monitoring.

Without logs: you're guessing. With properly-configured centralized logs: you have forensic ground truth.

---

## Log categories (Sec+ taxonomy)

Sec+ SY0-601 organizes logs into recognizable classes:

### System / OS logs

- **Windows Event Log** — channels below.
- **Linux syslog / journald** — below.
- **Kernel / driver events** — dmesg, kern.log on Linux; System log on Windows.
- **Process creation / termination** — Sysmon ID 1; auditd execve; 4688 (if enabled).

### Application logs

- **Web server** — Apache `access.log` / `error.log`; nginx equivalents; IIS W3C logs.
- **Database** — MySQL binary log, PostgreSQL WAL, SQL Server audit log.
- **Mail** — Postfix `mail.log`; Exchange message-tracking logs.
- **DNS** — BIND query log; Windows DNS debug log.
- **DHCP** — Windows DHCP audit log; `isc-dhcp-server` journal.
- **Firewall** — iptables LOG rules; ASA syslog; pfSense; Palo Alto, Check Point, Fortinet.
- **Proxy** — Squid access log; corporate web gateway.
- **VPN** — OpenVPN log; AnyConnect client logs; ASA syslog.
- **Cloud** — AWS CloudTrail, CloudWatch, VPC Flow Logs; Azure Activity Log, Entra ID sign-in logs; GCP Audit Logs.

### Security logs

- **Authentication** — Windows Security 4624 / 4625; Linux `/var/log/auth.log`; Duo MFA; Okta; Entra.
- **Authorization / privilege** — Windows 4672 (special-privileges); sudo log.
- **Object access** — Windows 5140 share access; 4663 file access; audited by policy.
- **Policy change** — Windows 4719; auditd on `/etc/sudoers`.
- **Directory service** — AD event logs.

### Network logs

- **NetFlow / IPFIX / sFlow** — flow records (5-tuple + counts).
- **Zeek (Bro)** — protocol-aware connection logs.
- **DNS query logs** — resolver-side.
- **PCAP** — full-packet capture when needed.

### Endpoint telemetry (modern / Sysmon)

- **Sysmon** — process creation with full command-line, image loads, network connections, registry events, file creates, WMI consumers.
- **EDR** (CrowdStrike, SentinelOne, Defender for Endpoint, Cortex XDR) — richer, cloud-backed.
- **auditd** — Linux kernel audit for syscalls and file-watch.
- **macOS Unified Log** — `log stream`.

### Cloud and IAM

- **AWS CloudTrail** — management-plane API activity.
- **Azure Activity Log** — ARM operations.
- **GCP Audit Logs** — Admin Activity, Data Access, System Event.
- **Entra ID sign-in logs** — interactive, non-interactive, service principal, managed identity.
- **Okta System log** — user auth, MFA events.
- **SaaS app logs** — GitHub audit, Slack audit, Salesforce event monitoring.

---

## Windows logging

### Event Log channels

| Channel | Purpose |
|---|---|
| **Application** | Application events from apps using `ReportEvent` |
| **Security** | Auth, auditing (logon, object access, policy change, privilege use) |
| **System** | Kernel, driver, service events |
| **Setup** | OS setup and rollbacks |
| **Forwarded Events** | Events received from remote hosts via WEF |

Plus **Applications and Services Logs** — hundreds of per-provider operational channels:

- `Microsoft-Windows-PowerShell/Operational`
- `Microsoft-Windows-Sysmon/Operational`
- `Microsoft-Windows-TaskScheduler/Operational`
- `Microsoft-Windows-TerminalServices-LocalSessionManager/Operational` (RDP)
- `Microsoft-Windows-WinRM/Operational`
- `Microsoft-Windows-Windows Defender/Operational`

### Key Windows Security Event IDs

| ID | Meaning |
|---|---|
| **4624** | Successful logon (incl. logon type: 2 interactive, 3 network, 4 batch, 5 service, 7 unlock, 10 RemoteInteractive/RDP, 11 cached) |
| **4625** | Failed logon |
| **4634** | Logoff |
| **4648** | Logon with explicit credentials (runas, mapped drive) |
| **4672** | Special privileges assigned to new logon (admin or equivalent) |
| **4688** | Process creation (if enabled) |
| **4689** | Process termination |
| **4697** | Service installed |
| **4698** | Scheduled task created |
| **4720** | User account created |
| **4722** | User account enabled |
| **4723** | Password change attempted |
| **4724** | Password reset attempted |
| **4725** | Account disabled |
| **4728** | Member added to security-enabled global group |
| **4732** | Member added to security-enabled local group |
| **4738** | User account changed |
| **4740** | User account locked out |
| **4768** | Kerberos TGT requested (AS-REQ) |
| **4769** | Kerberos service ticket requested (TGS-REQ) |
| **4771** | Kerberos pre-authentication failed |
| **5140** | Share accessed |
| **5145** | Share access with detailed object access |
| **5156** | Windows Filtering Platform allowed connection |
| **5157** | WFP blocked connection |
| **1102** | Security audit log cleared (generates its own event — anti-tamper signal) |

### PowerShell logging

- **Module logging** (4103) — pipeline event logs for loaded modules.
- **Script block logging** (4104) — captures decoded script content (even from `-EncodedCommand`).
- **Transcription** — per-session transcript to a protected share.

Enable via Group Policy: *Administrative Templates → Windows Components → Windows PowerShell*.

### Sysmon Event IDs (crucial for threat hunting)

| ID | Meaning |
|---|---|
| **1** | Process creation (full command-line + parent) |
| **3** | Network connection |
| **7** | Image loaded (DLL) |
| **8** | CreateRemoteThread (injection indicator) |
| **10** | ProcessAccess (who opened handle to LSASS) |
| **11** | File create |
| **12/13/14** | Registry events (add/delete, value set, key rename) |
| **15** | File stream create (ADS) |
| **17/18** | Named-pipe create / connect |
| **19/20/21** | WMI filter / consumer / binding |
| **22** | DNS query |
| **23** | File delete (logged) |
| **25** | Process tampering (hollowing indicator) |

### Viewing and querying

```
# GUI
eventvwr.msc

# CLI
wevtutil qe Security /c:20 /f:text /rd:true
wevtutil qe Security /q:"*[System[EventID=4624]]" /f:text /rd:true /c:10

# PowerShell
Get-WinEvent -LogName Security -MaxEvents 50
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624} -MaxEvents 100
Get-WinEvent -FilterXPath "*[System[EventID=4625] and EventData[Data[@Name='TargetUserName']='Administrator']]" -LogName Security

# Clear a log (generates 1102 — avoid)
wevtutil cl Security
```

### Windows Event Forwarding (WEF)

Send selected events from endpoints to a hardened collector via WinRM:

- **Source-initiated** — hosts push to collector; scales to large fleets.
- **Collector-initiated** — collector pulls from hosts; small fleets.
- **WECUtil** — configure subscriptions on the collector.
- Defender benefit: logs survive local log tampering.

---

## Linux logging

### /var/log key files

| File | Content |
|---|---|
| `/var/log/messages` (RHEL) / `/var/log/syslog` (Debian) | General system messages |
| `/var/log/auth.log` (Debian) / `/var/log/secure` (RHEL) | Authentication, sudo, su |
| `/var/log/kern.log` | Kernel messages |
| `/var/log/dmesg` | Boot-time kernel messages |
| `/var/log/boot.log` | Service-start output |
| `/var/log/cron` | Cron job execution |
| `/var/log/mail.log` | Postfix/Sendmail |
| `/var/log/wtmp` | Login history (binary — `last`) |
| `/var/log/btmp` | Failed login attempts (binary — `lastb`) |
| `/var/log/utmp` | Currently-logged-in users (`who`) |
| `/var/log/lastlog` | Last-login time per account |
| `/var/log/httpd/` or `/var/log/apache2/` | Apache logs |
| `/var/log/audit/audit.log` | auditd events |
| `/var/log/journal/` | systemd binary journal (if persistent) |

### rsyslog

Classic syslog daemon on most distros. Config: `/etc/rsyslog.conf` + `/etc/rsyslog.d/*.conf`.

**Facility.severity → action** format:

```
auth,authpriv.*          /var/log/auth.log
*.*;auth,authpriv.none   -/var/log/syslog
cron.*                   /var/log/cron.log
kern.*                   -/var/log/kern.log
mail.*                   -/var/log/mail.log

# Remote forwarding
*.* @logserver:514       # UDP
*.* @@logserver:6514     # TCP
```

### Facilities and severities

| Facility | Source |
|---|---|
| `kern` | Kernel |
| `auth` / `authpriv` | Authentication |
| `daemon` | System daemons |
| `mail` | Mail |
| `cron` | Cron |
| `user` | User-level |
| `local0`–`local7` | Reserved for local use |

| Severity | Meaning |
|---|---|
| `emerg (0)` | System unusable |
| `alert (1)` | Action required immediately |
| `crit (2)` | Critical |
| `err (3)` | Error |
| `warning (4)` | Warning |
| `notice (5)` | Normal but significant |
| `info (6)` | Informational |
| `debug (7)` | Debug |

### journalctl (systemd)

```
journalctl                         # all
journalctl -b                      # current boot
journalctl -b -1                   # previous boot
journalctl -u nginx                # specific unit
journalctl -f                      # follow (tail -f)
journalctl -p err                  # severity err+
journalctl -S "2026-04-23 08:00"   # since
journalctl --since "1 hour ago"
journalctl _PID=1234
```

Persistent journal: `mkdir -p /var/log/journal` — systemd starts persisting automatically.

### auditd

Kernel-level audit. Rules in `/etc/audit/rules.d/*.rules`:

```
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k priv
-a always,exit -F arch=b64 -S execve -F auid>=1000 -F auid!=-1 -k useractivity
-e 2                                # make rules immutable until reboot
```

Query:

```
ausearch -k identity
ausearch -ts today -k priv
ausearch -m USER_AUTH -sv no        # failed auth events
aureport                             # summaries
```

### Login-event commands

```
last                                # login history
last -n 20
last alice
last -x                             # include system events
lastb                               # failed attempts (root)
who                                 # currently logged in
w                                   # with what they're running
lastlog                             # per-account last login
```

---

## Centralization — SIEM

A **SIEM (Security Information and Event Management)** platform aggregates logs, normalizes, correlates, alerts, and supports investigation.

### Core flow

```
endpoints / network / apps
       │
       ▼  forwarders (Winlogbeat, Filebeat, Splunk UF, syslog)
     SIEM ingest
       │
       ▼  parsing + normalization to common schema
       ▼  enrichment (GeoIP, threat intel, asset context)
       ▼  correlation engine → alerts
       ▼  SOC analyst investigates; escalates as incident
       ▼  SOAR playbooks automate response
```

### SIEM platforms

- **Splunk** — enterprise default.
- **Elastic Stack (ELK)** — open-source + Elastic Security licensed layer.
- **IBM QRadar** — enterprise with integrated flow analysis.
- **Microsoft Sentinel** — cloud-native, tight M365 integration.
- **LogRhythm / Securonix / Exabeam** — UEBA-forward.
- **Graylog / Wazuh** — open-source.

### SIEM data ingestion

- **Syslog** — universal.
- **Winlogbeat / NXLog** — Windows Event Log → SIEM.
- **Filebeat** — generic file tail.
- **Journal forwarder** — systemd-journal-remote.
- **API connectors** — cloud providers (AWS CloudTrail, Azure Activity), SaaS (Okta, GitHub, Salesforce).
- **Flow records** — NetFlow / IPFIX / sFlow.

### Log normalization

Each SIEM has a common schema (CEF — Common Event Format; Elastic Common Schema / ECS; Splunk CIM — Common Information Model) to let rules query across sources uniformly.

### Correlation use-cases

- **Brute-force detection** — N failed 4625s from the same source in M minutes.
- **Impossible travel** — Entra sign-in from Japan then Texas in 10 minutes.
- **Malicious-tooling signature** — Mimikatz command-line fragment in 4688.
- **Persistence creation** — new service (4697) or scheduled task (4698) outside maintenance window.
- **Lateral movement** — 4624 Type 3 from user workstation to multiple servers.
- **Data exfiltration** — large outbound flow to new destination.

---

## Log integrity and retention

### Protecting logs

- **Ship logs off-host** in real time (rsyslog over TCP+TLS; WEF).
- **Hardened log collector** — no interactive access; minimal services.
- **Append-only** — `chattr +a` (Linux); WORM object-lock (S3 / Azure Blob).
- **Auditd immutable rules** — `-e 2` prevents attackers from disabling audit without reboot.
- **Windows — protected log channel** — security descriptor restricts which accounts can clear.
- **Time sync (NTP)** — mandatory for correlation.
- **FSS (Forward Secure Sealing)** for systemd journal — `journalctl --setup-keys`.

### Retention

- **Hot storage** (searchable) — 30–90 days typical.
- **Cold storage** (archive) — 1+ year compliance-driven.
- **Legal hold** — overrides normal retention for specific matters.
- **Regulatory minimums**:
  - HIPAA — 6 years for audit logs.
  - PCI-DSS — 1 year (3 months immediately available).
  - SOX — 7 years for financial systems.
  - GDPR — no fixed minimum but data-subject rights apply.
  - DoD per SECNAVINST / DODM — varies by classification and system type.

### Log tampering indicators

- **Gap in timestamps** where activity should exist.
- **Security log cleared (Windows 1102)** event itself.
- **Missing auditd entries** where rules should have fired.
- **wtmp / btmp shrinking** on Linux.
- **File timestamps manipulated** (timestomping) — mtime/ctime mismatch.
- **rsyslog / journald service restarts** outside maintenance.
- **New rsyslog config files** that redirect or drop specific events.

---

## Cross-book connections

- Windows logs ↔ `JCAC-WINDOWS.md` §6 · `BOOK-WIN-INTERNALS-2.md` Ch 13 (Startup events).
- Linux logs ↔ `JCAC-UNIX-LINUX.md` §25 (Logs and Auditing).
- SIEM / SOAR ↔ `BOOK-CYBER-OPS.md` Ch 16.
- IDS analyst use of logs ↔ `BOOK-NET-INTRUSION.md` Ch 13.
- Incident response use of logs ↔ `CJCSM-6510.01B.md` · `BOOK-CISSP.md` Ch 7.
- Sysmon use ↔ `BOOK-ADV-TRADECRAFT.md` (tradecraft ↔ detection).

---

## Exam-testable concepts (rapid-fire)

- **Windows Security Event ID for successful logon?** 4624.
- **Windows Security Event ID for failed logon?** 4625.
- **Logon type for RDP in 4624?** 10.
- **Logon type for Network (SMB / WinRM)?** 3.
- **Event ID for special-privileges assigned (admin)?** 4672.
- **Event ID for process creation?** 4688 (requires policy enabled) or Sysmon 1.
- **Event ID generated when Security log is cleared?** 1102.
- **Event ID for service installed?** 4697.
- **Event ID for scheduled task created?** 4698.
- **Event ID for Kerberos AS-REQ?** 4768.
- **Event ID for Kerberos TGS-REQ?** 4769.
- **Event ID for account lockout?** 4740.
- **Sysmon ID for DLL / image load?** 7.
- **Sysmon ID for DNS queries?** 22.
- **Sysmon ID for CreateRemoteThread (injection)?** 8.
- **Sysmon ID for WMI event subscription?** 19/20/21.
- **PowerShell script-block logging event?** 4104 in `Microsoft-Windows-PowerShell/Operational`.
- **Linux auth log file (Debian)?** `/var/log/auth.log`. (RHEL?) `/var/log/secure`.
- **File with failed-login records (binary)?** `/var/log/btmp`, read with `lastb`.
- **File with login history (binary)?** `/var/log/wtmp`, read with `last`.
- **Current user logged in (binary)?** `/var/run/utmp`, read with `who`.
- **rsyslog default UDP port?** 514. TCP for reliable? 6514 (often TLS).
- **systemd-journal persistence enablement?** `mkdir -p /var/log/journal`.
- **auditd rule flag that locks rules until reboot?** `-e 2`.
- **journalctl command to tail live logs?** `journalctl -f`.
- **SIEM core functions?** Aggregation, normalization, correlation, alerting, investigation.
- **Most widely-deployed enterprise SIEM?** Splunk (Microsoft Sentinel is the cloud-native leader).
- **ECS stands for?** Elastic Common Schema.
- **CEF stands for?** Common Event Format.
- **Hot vs cold storage?** Hot = searchable (30–90 days); cold = archive (1+ year).
- **HIPAA log retention?** 6 years.
- **PCI-DSS log retention?** 1 year (3 months immediately available).
- **Why ship logs to a remote server?** Survive local log tampering and host compromise.
- **FSS (systemd-journal)?** Forward Secure Sealing — detects tampering.

---

## Cross-references

- **[CompTIA Security+ SY0-601 Cert Guide, 5e](../references/CompTIA%20Security%2B%20SY0-601%20Cert%20Guide%205th%20Ed%20%28Santos%29.pdf)** — text on disk.
- **[Microsoft — Audit Policy Recommendations](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/audit-policy-recommendations)**.
- **[Sysmon Config (SwiftOnSecurity)](https://github.com/SwiftOnSecurity/sysmon-config)** — high-quality starting Sysmon config.
- **[Sigma rules](https://github.com/SigmaHQ/sigma)** — portable SIEM detection rules.
- **[Linux Audit Documentation (Red Hat)](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/security_hardening/auditing-the-system_security-hardening)**.
- **[Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/index.html)**.
- **[Splunk CIM](https://docs.splunk.com/Documentation/CIM/latest/User/Overview)**.
- `JCAC-WINDOWS.md` · `JCAC-UNIX-LINUX.md` · `BOOK-CYBER-OPS.md` · `BOOK-NET-INTRUSION.md` · `BOOK-ADV-TRADECRAFT.md`.
