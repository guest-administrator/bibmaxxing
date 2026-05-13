# Bib Study Guide — Hacker Techniques, Tools, and Incident Handling (Solomon, Oriyano) 2nd Edition

> **Bib reference:** *Hacker Techniques, Tools, and Incident Handling*, 2nd Edition — Sean-Philip Oriyano (Jones & Bartlett, 2013, ISBN 978-1-284-03171-3).
>
> **Regular-exam scope:** Chapter 7.
> **Substitute-exam scope:** Chapter 7 — "Enumeration and Computer System Hacking."
> **Union — what this guide covers:** Ch 7 — the book's full treatment of enumeration and system-hacking techniques: banner grabbing, share enumeration, user/group enumeration, SNMP enumeration, password attacks, privilege escalation, covering tracks.

**Posture:** This book is an entry-level certification text (CEH-adjacent). Ch 7 walks the attacker's **enumeration → exploitation → post-exploitation** workflow. This guide is tight — it follows Oriyano's chapter structure and adds the defender-visibility signals that map each attacker action to a detection opportunity. Pairs with `JCAC-ACTIVE-EXPLOIT.md` (Module 14 hands-on equivalent), `BOOK-CYBER-OPS.md` Ch 5 (scanning), and `BOOK-GRAY-HAT.md` (deeper offensive).

---

## Enumeration — what it is

Recon has two phases:

- **Scanning** — identify live hosts and open ports (`nmap`).
- **Enumeration** — query those services to extract **useful intel**: usernames, group memberships, shares, version strings, configuration details.

Enumeration is **active** and **noisy** — connections are established, traffic is logged. Defenders see enumeration in auth logs and firewall counters.

### Goals of enumeration

1. **Usernames** — input for password attacks.
2. **Groups / role assignments** — prioritize targets (admins, service accounts).
3. **Shares** — file repositories; sometimes contain credentials, sensitive docs.
4. **Services and versions** — map to known CVEs.
5. **Patch levels** — which KBs are missing on Windows; which package versions on Linux.
6. **Policy info** — password lockout policy, password-age policy.
7. **Trust relationships** — domains, forest trusts, cross-org federation.

### Enumeration vs scanning — a concrete example

Scanning says: "10.0.0.5 has TCP 445 open."

Enumeration against that port says: "10.0.0.5 is SERVER01, running Windows Server 2019, in domain CORP, with shares NETLOGON, SYSVOL, HR-Share, and these 15 local users."

---

## Banner grabbing

The simplest enumeration — connect to a service and read what it volunteers.

### Telnet-to-port trick

```
$ nc target 22
SSH-2.0-OpenSSH_8.4p1 Debian-5+deb11u1

$ nc target 25
220 mail.example.com ESMTP Postfix (Ubuntu)

$ nc target 80
<enter>
HTTP/1.1 400 Bad Request
Server: nginx/1.20.1
```

### Nmap version scan

```
nmap -sV -p 22,25,80,443,3306 target
```

Output identifies service and version:

```
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.4p1 Debian 5+deb11u1 (protocol 2.0)
25/tcp   open  smtp    Postfix smtpd
80/tcp   open  http    nginx 1.20.1
443/tcp  open  ssl/https nginx 1.20.1
3306/tcp open  mysql   MySQL 8.0.23
```

### HTTP-specific

```
curl -I https://target/
```

Server response headers reveal:

- `Server: Apache/2.4.41` — software + version.
- `X-Powered-By: PHP/7.4.3` — backend language.
- `Set-Cookie: PHPSESSID=...` — session framework.
- `X-AspNet-Version: 4.0.30319` — .NET version.
- Non-standard custom headers often leak internal hostnames.

### Defender hardening

- Strip / change banners: `ServerTokens Prod` / `ServerSignature Off` on Apache; `server_tokens off` on nginx; `smtpd_banner = $myhostname ESMTP` on Postfix.
- For SSH on Debian/Ubuntu add `DebianBanner no` to hide the patch suffix.
- Understand that **hiding banners is obscurity, not security**; don't rely on it.

---

## SMB / NetBIOS / Windows enumeration

### Ports

- **UDP 137** — NetBIOS Name Service.
- **UDP 138** — NetBIOS Datagram.
- **TCP 139** — NetBIOS Session (legacy SMBv1).
- **TCP 445** — SMB direct (modern).

### Tools

```
# Windows
net view \\target                        # shares
net view /domain:CORP                    # domain hosts
nbtstat -A 10.0.0.5                      # NetBIOS name table
```

```
# Linux
smbclient -L //target -U ''              # null session (legacy)
smbclient -L //target -U alice
rpcclient -U "" -N target                # null connection
enum4linux-ng target
nmblookup -A target
smbmap -H target -u alice -p Password1
```

### `rpcclient` inside

```
rpcclient> srvinfo                       # server OS, version
rpcclient> enumdomusers                  # domain users
rpcclient> enumdomgroups                 # groups
rpcclient> queryuser <rid>               # user details
rpcclient> lookupnames <name>            # name → SID
rpcclient> lookupsids <sid>              # SID → name
rpcclient> querydominfo                  # domain policy (password length, lockout)
rpcclient> enumprinters
rpcclient> netsharegetinfo <share>
```

### Null session

Historically, SMB allowed anonymous connections that could enumerate shares, users, and groups:

```
net use \\target\IPC$ "" /user:""
```

Modern Windows Server disables null sessions by default (`RestrictAnonymous=2`, `RestrictAnonymousSAM=1`). Legacy boxes still allow them.

### Detection

- Windows Security Event **4624 Type 3** — network logons (normal for file servers; anomalous patterns = scanning).
- Event **4672** — special-privileges assigned (elevated SMB session).
- Event **5140** — share accessed.
- **Sysmon Event ID 3** — network connection; correlate scanning source.
- **BloodHound** telemetry — legitimate AD enumerators leave similar fingerprints; tuning required.

### SMB vulnerabilities historically in Ch 7 scope

- **EternalBlue (MS17-010 / CVE-2017-0144)** — SMBv1 remote code execution. Metasploit module `exploit/windows/smb/ms17_010_eternalblue`.
- **MS08-067** — Server service RPC vulnerability; `exploit/windows/smb/ms08_067_netapi`.
- **SMBGhost (CVE-2020-0796)** — SMBv3 compression bug.

Defender: **disable SMBv1** everywhere, keep current patch level, block SMB at the perimeter (inbound), enforce SMB signing and encryption.

---

## SNMP enumeration

### Ports and versions

- **UDP 161** — agent receives Get/GetNext/Set.
- **UDP 162** — manager receives traps.

| Version | Security |
|---|---|
| **v1** | Community string (cleartext); often `public` / `private` defaults |
| **v2c** | Same security as v1; bigger counters |
| **v3** | USM — auth (HMAC-MD5 or SHA) + privacy (DES/AES) |

### Tools

```
snmpwalk -v2c -c public target
snmpget  -v2c -c public target 1.3.6.1.2.1.1.1.0
snmpcheck -v 2c -c public target
onesixtyone -c community-list.txt -i targets.txt
braa  -c public -r target:1.3.6.1.2.1.1.1.0
nmap -sU -p 161 --script snmp-brute,snmp-sysdescr,snmp-interfaces,snmp-processes,snmp-win32-software target
```

### What SNMP leaks

OIDs that commonly reveal interesting data:

| OID | Name | Reveals |
|---|---|---|
| `1.3.6.1.2.1.1.1.0` | sysDescr | OS and version string |
| `1.3.6.1.2.1.1.4.0` | sysContact | Admin contact |
| `1.3.6.1.2.1.1.5.0` | sysName | Hostname |
| `1.3.6.1.2.1.1.6.0` | sysLocation | Physical location |
| `1.3.6.1.2.1.2.2.1.*` | ifTable | Interfaces, MACs, IPs |
| `1.3.6.1.2.1.4.20.1.*` | ipAddrTable | All IP addresses |
| `1.3.6.1.2.1.4.22.1.*` | ipNetToMediaTable | ARP cache (IP → MAC) |
| `1.3.6.1.4.1.77.1.2.25` | (Windows LanMan users) | Usernames |
| `1.3.6.1.2.1.25.4.2.1.*` | hrSWRunName | Running processes |
| `1.3.6.1.2.1.25.6.3.1.2.*` | hrSWInstalledName | Installed software |

### Defender

- Disable SNMP if unused.
- SNMPv3 only with strong auth+priv.
- Restrict access with ACL / management VLAN.
- Never leave `public` / `private` defaults.
- Monitor SNMP traffic from unexpected sources.

---

## LDAP enumeration

### Anonymous binds

```
ldapsearch -x -H ldap://target -b "DC=corp,DC=example,DC=com"
```

Pre-hardened Active Directory allows anonymous read of many attributes. Modern defaults restrict to authenticated users.

### Authenticated enumeration

```
ldapsearch -x -H ldap://target \
  -D "CN=alice,CN=Users,DC=corp,DC=example,DC=com" \
  -W -b "DC=corp,DC=example,DC=com" "(objectClass=user)" sAMAccountName memberOf
```

### Key AD attributes to pull

- `sAMAccountName` — login name.
- `userPrincipalName` — `alice@corp.example.com`.
- `memberOf` — group memberships.
- `servicePrincipalName (SPN)` — tracks service accounts (Kerberoasting target).
- `userAccountControl` — flags (enabled, disabled, pwd-never-expires).
- `adminCount` — historically 1 for protected accounts (Domain Admins).
- `description` — admins sometimes put passwords here. Seriously.
- `pwdLastSet` — stale passwords.

### BloodHound workflow

Collect with **SharpHound** (AD ingestor) → JSON → import into BloodHound → graph shows shortest path from "me" to "Domain Admins."

Collection methods include querying LDAP, SMB, and SAMR. Noisy — defender sees a flurry of LDAP+SMB queries.

### Defender

- Disable anonymous LDAP binds (already default modern).
- Enable LDAP signing / channel binding.
- Audit directory access (AD advanced audit policy).
- Honeytokens — fake high-value accounts that shouldn't ever be queried.

---

## DNS enumeration

### Queries

```
nslookup -type=ns example.com           # name servers
nslookup -type=mx example.com           # mail servers
dig axfr @ns1.example.com example.com   # zone transfer (if allowed)
dig +short TXT example.com              # SPF/DKIM/verification
```

### Zone transfer

Authorized only for configured secondaries; a misconfigured server answering AXFR to the world leaks the entire zone.

### Subdomain enumeration

- **DNS brute force** — `amass`, `subfinder`, `assetfinder`, `dnsrecon`, `fierce`.
- **CT (Certificate Transparency) logs** — `crt.sh`, `censys`, `shodan`. Every TLS cert reveals its domains.
- **Search engine dorks** — `site:example.com -www`.

### Defender

- Disable AXFR from public (`allow-transfer { none; };`).
- Monitor for AXFR attempts.
- Keep CT-visible names aligned with the public footprint you're willing to reveal.

---

## Service-specific enumeration (selected)

| Service | Port | Tools |
|---|---|---|
| **FTP** | 21 | `ftp target`, `nmap --script ftp-anon` |
| **SSH** | 22 | Banner (`nc`), `ssh-audit`, `nmap --script ssh-*` |
| **Telnet** | 23 | Banner |
| **SMTP** | 25 | `smtp-user-enum`, `VRFY` / `EXPN` commands |
| **DNS** | 53 | `dig`, `dnsrecon` |
| **TFTP** | 69 | `tftp target`, `nmap --script tftp-enum` |
| **HTTP / HTTPS** | 80/443 | Headers, robots.txt, `gobuster`, `nikto` |
| **POP3 / IMAP** | 110/143 | Banner + VRFY-style checks |
| **SNMP** | 161 | `snmpwalk` |
| **LDAP** | 389 | `ldapsearch` |
| **SMB** | 445 | `smbclient`, `enum4linux`, `rpcclient` |
| **MSSQL** | 1433 | `impacket-mssqlclient`, `nmap --script ms-sql-*` |
| **Oracle** | 1521 | `odat`, `nmap --script oracle-*` |
| **MySQL** | 3306 | `mysql`, `nmap --script mysql-*` |
| **RDP** | 3389 | `rdesktop`, `nmap --script rdp-*` (screenshot via Eyewitness) |
| **VNC** | 5900 | `vncviewer`, `nmap --script vnc-*` |
| **Redis** | 6379 | `redis-cli` (often unauth) |
| **Elasticsearch** | 9200 | `curl`, `nmap --script http-elastic-*` |
| **Kerberos** | 88 | `kerbrute`, SPN queries |

---

## System hacking (post-enumeration)

Once the attacker has **a username + evidence of target's services**, they try to **authenticate**.

### Password attacks

**Online attacks** — try passwords against a running service:

- **Dictionary attack** — common words / leaked-password lists.
- **Brute force** — try every permutation (rare; slow).
- **Hybrid** — dictionary + rules (prepend, append, substitute).
- **Password spraying** — one common password against many accounts (evades per-account lockout).
- **Credential stuffing** — reuse breached credentials from other sites.

**Tools:** Hydra, Medusa, Patator, Ncrack, CrackMapExec (for SMB/LDAP/RDP).

**Offline attacks** — crack hashes after acquiring them:

- **John the Ripper** — classic.
- **Hashcat** — GPU-accelerated; multi-hash.
- **rainbow tables** — pre-computed hash→password lookups (defeated by salt).

**Common hash formats:**

- `NTLM` (Windows) — unsalted MD4 of UTF-16 password. Rainbow-table-able.
- `NTLMv2 challenge-response` — network auth; requires capture + offline crack.
- `/etc/shadow` formats: `$1$` MD5, `$5$` SHA-256, `$6$` SHA-512, `$y$` yescrypt.
- `bcrypt` (`$2a$`, `$2b$`) — adaptive, slow by design.
- `Kerberos AS-REP` — **AS-REP roastable** accounts (pre-auth disabled).
- `Kerberos TGS` — **Kerberoastable** service accounts (SPNs).

### Password-policy defeat

- **Password spray** — "Summer2026!" against every user.
- **Timing** — spread attempts across lockout window (15 min typical).
- **Lockout enumeration** — some configs tell you which accounts exist vs don't; attacker enumerates valid usernames through Kerberos or SMB errors.

### Privilege escalation

**Windows:**

- **Weak service permissions** — service runs as SYSTEM but binary is writable by Users.
- **Unquoted service paths** — space in path + no quotes → Windows checks intermediate paths first.
- **DLL hijacking** — app loads a DLL from current directory.
- **Token impersonation** — SeImpersonatePrivilege → Potato-family (Rotten/Juicy/PrintSpoofer).
- **Stored credentials** — `cmdkey /list`, unattend.xml, Group Policy Preferences `cpassword`.
- **UAC bypass** — autoElevate COM objects (fodhelper, eventvwr); patched on modern builds.
- **AlwaysInstallElevated** — registry key letting any user install MSI as SYSTEM.

Tooling: `PowerUp.ps1`, `winPEAS`, `Seatbelt`, `Sharpshares`.

**Linux:**

- **SUID abuse** — GTFOBins-listed SUID binaries.
- **Sudo misconfig** — overly-broad `NOPASSWD` entries with shell-escapable commands.
- **Cron with writable scripts** — root-owned cron runs a script writable by the attacker.
- **PATH hijack** — root command invokes a program by name without full path; attacker places trojan in a PATH dir they control.
- **Capabilities** — `getcap -r /` — misused capabilities (`cap_setuid`, `cap_dac_read_search`).
- **Kernel exploits** — Dirty Pipe (CVE-2022-0847), PwnKit (CVE-2021-4034), Dirty COW (CVE-2016-5195).

Tooling: `linPEAS`, `LinEnum.sh`, `linux-exploit-suggester`.

### Covering tracks

**Linux:**

- Clear bash history: `history -c`, `echo "" > ~/.bash_histfile`, `export HISTFILE=/dev/null`.
- Alter timestamps: `touch -t YYYYMMDDhhmm file`.
- Remove specific wtmp/utmp entries (tools like `zapper`, `clearlog`).
- Delete or truncate specific logs: `/var/log/auth.log`, `/var/log/wtmp`.
- Remove cron-job evidence.

**Windows:**

- Clear event logs: `wevtutil cl Security`, `wevtutil cl System`.
- Meterpreter's `clearev` command.
- Individual log events are hard to surgically delete without leaving audit trail.

### Defender's anti-anti-forensics

- **Remote log forwarding** — logs shipped in real time to a server the attacker can't reach.
- **Append-only logs** — `chattr +a` (Linux); Windows Event Forwarder → hardened collector.
- **SIEM retention** — 1-year hot, multi-year cold.
- **Immutable audit tokens** — Thinkst Canarytokens on sensitive files.

---

## Defender playbook for enumeration detection

- **Account-lockout threshold** — blocks single-account brute force.
- **Anomalous-volume alert** — one source hitting many auth endpoints in a short window.
- **Honey accounts** — fake accounts that should never log in; any auth = alert.
- **LDAP query-rate alerts** — large enumeration triggers.
- **SMB share-access anomalies** — large-scale share enumeration via Responder or BloodHound.
- **DNS AXFR attempts** — alert on any AXFR from non-allow-listed source.
- **SNMP traffic from unexpected source** — management VLAN only.

---

## Cross-book connections

- Enumeration phase ↔ `BOOK-CYBER-OPS.md` Ch 5 (Scanning) · `JCAC-ACTIVE-EXPLOIT.md` §3 (Enumeration & Analysis).
- SMB/NetBIOS specifics ↔ `JCAC-WINDOWS.md` §13 (Windows Networking Protocols).
- Kerberos enumeration ↔ `JCAC-WINDOWS.md` §17 (Active Directory Fundamentals) · `BOOK-WIN-INTERNALS-1.md` security.
- Password cracking ↔ `JCAC-ACTIVE-EXPLOIT.md` §7 (UNIX/Linux Credential Harvesting).
- Covering tracks ↔ `JCAC-ACTIVE-EXPLOIT.md` §8 (UNIX/Linux) + §20 (Windows).

---

## Exam-testable concepts (rapid-fire)

- **Two recon phases?** Scanning, Enumeration.
- **SMB direct port?** TCP 445. NetBIOS Session? TCP 139. NetBIOS Name Service? UDP 137.
- **Tool to enumerate SMB null sessions on Linux?** `rpcclient` or `enum4linux[-ng]`.
- **Windows registry key that restricts anonymous SAM enumeration?** `RestrictAnonymousSAM`.
- **SNMPv1/v2c default community strings?** `public` (read) and `private` (read-write).
- **SNMPv3 adds which security features?** Authentication (HMAC-MD5/SHA) + Privacy (DES/AES).
- **OID `1.3.6.1.2.1.1.1.0` reveals?** sysDescr — OS and version.
- **LDAP tool on Linux?** `ldapsearch`.
- **SharpHound collects into?** BloodHound JSON for attack-path graphing.
- **DNS record for mail routing?** MX.
- **DNS zone transfer query type?** AXFR.
- **MS17-010 is?** EternalBlue — SMBv1 remote code execution.
- **Password spraying?** One common password against many accounts (evades per-account lockout).
- **Kerberos AS-REP roasting targets?** Accounts with pre-authentication disabled.
- **Kerberoasting targets?** Service accounts with SPNs — TGS-REP hashes are offline-crackable.
- **Offline password-cracking tool (CPU)?** John the Ripper. (GPU?) Hashcat.
- **Windows privesc — unquoted service paths abuse what?** Spaces in path cause Windows to try intermediate tokens as executables.
- **Windows privesc — `SeImpersonatePrivilege` enables?** Potato family (Rotten/Juicy/PrintSpoofer).
- **Linux privesc reference list?** GTFOBins.
- **Clearing Linux bash history?** `history -c` + `> ~/.bash_history` + `unset HISTFILE` (and ideally `export HISTSIZE=0`).
- **Clearing a Windows event log?** `wevtutil cl <log>`.
- **Defender control that makes log wiping less useful?** Remote log forwarding to a separate protected log server.

---

## Cross-references

- **[Hacker Techniques, Tools, and Incident Handling, 2e](../references/Hacker%20Techniques,%20Tools,%20and%20Incident%20Handling,%202nd%20Edition-9781284031713.pdf)** — text on disk (verify PDF integrity — EPUB was corrupted per MANIFEST).
- **[LOLBAS](https://lolbas-project.github.io/)** · **[GTFOBins](https://gtfobins.github.io/)**.
- **[MITRE ATT&CK — Discovery (TA0007)](https://attack.mitre.org/tactics/TA0007/)** · **[Credential Access (TA0006)](https://attack.mitre.org/tactics/TA0006/)** · **[Privilege Escalation (TA0004)](https://attack.mitre.org/tactics/TA0004/)**.
- **[BloodHound](https://bloodhound.readthedocs.io/)**.
- `JCAC-ACTIVE-EXPLOIT.md` · `JCAC-WINDOWS.md` · `JCAC-UNIX-LINUX.md` · `BOOK-CYBER-OPS.md` · `BOOK-GRAY-HAT.md`.
