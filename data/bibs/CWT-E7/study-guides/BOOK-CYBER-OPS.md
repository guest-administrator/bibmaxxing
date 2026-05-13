# Bib Study Guide — Cyber Operations: Building, Defending, and Attacking Modern Computer Networks (O'Leary)

> **Bib reference:** *Cyber Operations: Building, Defending, and Attacking Modern Computer Networks*, 2nd Edition — Mike O'Leary (Apress, 2019, ISBN 978-1-4842-4294-3).
>
> **Regular-exam scope:** Chapters 2, 5, 16.
> **Substitute-exam scope:** not listed.
> **Union — what this guide covers:** Ch 2 (Basic Offense — initial network-intrusion techniques and tools), Ch 5 (Scanning — host and service discovery), Ch 16 (Defending Networks — defender-side controls, SIEM, incident response).

**Posture:** O'Leary's book is course-style with both red-team and blue-team chapters. The Bib-scope chapters are representative offensive + defensive workflows a CWT Chief should be fluent in. Pairs with `JCAC-ACTIVE-EXPLOIT.md` (Module 14 Active Exploitation) and `BOOK-NET-INTRUSION.md` (NID analyst perspective).

---

## Ch 2 — Basic Offense

O'Leary starts by framing the **attacker methodology** at a high level: the phases of an intrusion.

### The attack lifecycle

Variations on this cycle appear in many frameworks (Cyber Kill Chain — Lockheed Martin; ATT&CK tactics — MITRE):

1. **Reconnaissance** — passive and active information gathering about the target.
2. **Weaponization** — craft an exploit payload.
3. **Delivery** — get the payload to the target (phishing, malicious site, USB drop, supply chain).
4. **Exploitation** — trigger code execution on target.
5. **Installation** — establish persistence.
6. **Command and Control (C2)** — beacon to attacker infrastructure.
7. **Actions on Objectives** — exfiltration, destruction, lateral movement.

MITRE ATT&CK aligns these as tactics with specific techniques under each.

### Basic offensive toolkit

| Tool | Purpose |
|---|---|
| **Kali Linux** | Preconfigured pentest distro |
| **Metasploit Framework** | Exploit development + delivery platform |
| **Nmap** | Host/service discovery and enumeration |
| **Burp Suite** | Web proxy + tooling |
| **Wireshark / tcpdump** | Network capture |
| **Hydra / Medusa** | Password-guessing |
| **John the Ripper / Hashcat** | Offline password cracking |
| **Responder** | LLMNR/NBT-NS poisoning for credential harvest |
| **BloodHound / SharpHound** | AD attack-path graph |
| **CrackMapExec / NetExec** | Windows lateral movement swiss-army |
| **Impacket** | Python-based Windows protocol attacks |
| **Mimikatz** | Windows credential extraction (on target) |
| **Empire / Covenant / Sliver** | Post-exploitation C2 frameworks |
| **Cobalt Strike** | Commercial C2 (widely abused by threat actors too) |

### Initial access techniques (MITRE ATT&CK TA0001)

- **Phishing** (T1566) — spearphishing attachment, link, service.
- **Exploit Public-Facing Application** (T1190) — vulnerable web app, VPN, database.
- **External Remote Services** (T1133) — RDP, SSH, Citrix.
- **Supply Chain Compromise** (T1195) — malicious dependency in software supply.
- **Valid Accounts** (T1078) — compromised credentials.
- **Drive-by Compromise** (T1189) — victim visits malicious site.
- **Replication through Removable Media** (T1091) — USB drop.
- **Hardware Additions** (T1200) — attacker-installed device.
- **Trusted Relationship** (T1199) — compromise a vendor / partner with access.

### Phishing patterns

- **Spearphishing** — targeted at specific individuals, personalized content.
- **Whaling** — targets high-value individuals (execs).
- **Smishing** — SMS-based phishing.
- **Vishing** — voice-based phishing (including deepfake-voice attacks).
- **Business Email Compromise (BEC)** — impersonation of executives / vendors for wire-transfer fraud.

Common phishing payloads:

- **HTML attachments** with credential-harvesting forms.
- **Office macros** (reduced by Microsoft blocking Internet-sourced macros by default in 2022).
- **LNK files** embedded with shell commands.
- **ISO / IMG containers** bypassing MOTW (Mark of the Web).
- **OneNote / SVG** with embedded scripts.
- **OAuth consent phishing** — victim grants malicious app OAuth tokens.

---

## Ch 5 — Scanning

Scanning is the **active reconnaissance** phase where the attacker (or authorized tester) maps the target's live hosts, open ports, and services.

### Scan types

| Type | Nmap flag | Description |
|---|---|---|
| **TCP SYN scan (stealth)** | `-sS` | Sends SYN; doesn't complete handshake — less logged historically |
| **TCP connect scan** | `-sT` | Uses OS `connect()` syscall; fully logged |
| **UDP scan** | `-sU` | Sends UDP; no response = open\|filtered; ICMP unreach = closed |
| **TCP ACK scan** | `-sA` | Maps firewall rulesets — filtered vs unfiltered |
| **FIN / NULL / Xmas** | `-sF` / `-sN` / `-sX` | Stealth variants against non-stateful filters |
| **Service/version** | `-sV` | Probe services to identify software + version |
| **OS detection** | `-O` | TCP/IP stack fingerprinting |
| **Aggressive** | `-A` | Shorthand for `-sV -sC -O --traceroute` |
| **Script scan (NSE)** | `-sC` (default) or `--script` | Run Nmap Scripting Engine scripts |

### Host discovery

```
nmap -sn 10.0.0.0/24                    # ping sweep (no port scan)
nmap -Pn target                         # skip discovery; treat as up
nmap -PS80,443 -PA22,3389 target        # SYN + ACK probes on common ports
nmap -PE target                         # ICMP echo
nmap -PP target                         # ICMP timestamp
nmap -PM target                         # ICMP netmask (rarely supported)
```

Ping-sweep via `arping` works on the same LAN and catches hosts that drop ICMP.

### Port specification

```
nmap -p 22,80,443 target                # explicit
nmap -p 1-1024 target                   # range
nmap -p- target                         # all 65535 TCP
nmap --top-ports 100 target             # most-common 100
nmap -F target                          # fast (top 100)
nmap -p U:53,T:21-25,80 target          # TCP and UDP mixed
```

### Timing templates

| Template | Flag | Speed | Use |
|---|---|---|---|
| Paranoid | `-T0` | 1 probe per 5 min | IDS evasion |
| Sneaky | `-T1` | 15 s | Stealthy |
| Polite | `-T2` | 0.4 s | Gentle |
| Normal | `-T3` | Default | General |
| Aggressive | `-T4` | Fast | LAN / lab |
| Insane | `-T5` | Fastest | CTF / unreliable |

### Output formats

```
nmap -oN scan.txt target                # normal
nmap -oX scan.xml target                # XML (parseable)
nmap -oG scan.gnmap target              # grepable
nmap -oA scan target                    # all three
```

### NSE — Nmap Scripting Engine

Scripts in `/usr/share/nmap/scripts/`. Categories: `auth`, `broadcast`, `brute`, `default`, `discovery`, `dos`, `exploit`, `external`, `fuzzer`, `intrusive`, `malware`, `safe`, `version`, `vuln`.

```
nmap --script vuln 10.0.0.10
nmap --script smb-enum-shares,smb-enum-users -p 445 target
nmap --script ssl-enum-ciphers -p 443 target
nmap --script http-title,http-headers -p 80,443 target
nmap --script dns-zone-transfer --script-args dns-zone-transfer.domain=example.com -p 53 ns.example.com
```

### Alternative scanners

| Tool | Strength |
|---|---|
| **masscan** | Internet-scale port scanning (millions of packets/sec) |
| **zmap** | Optimized for whole-Internet surveys |
| **Rustscan** | Fast front-end; hands off to Nmap for service detection |
| **unicornscan** | Stateless + asynchronous |
| **httpx / ffuf** | Web-layer enumeration |
| **enum4linux / enum4linux-ng** | SMB/NetBIOS enumeration |

### Interpretation

Nmap reports each port in one of these states:

| State | Meaning |
|---|---|
| **open** | Target application accepting connections |
| **closed** | Target responded (RST for TCP, ICMP unreach for UDP) but no service |
| **filtered** | Firewall drops probes — no response |
| **unfiltered** | Reachable but open/closed can't be determined (ACK scan) |
| **open\|filtered** | Common for UDP — no response distinguishable from "filtered" |
| **closed\|filtered** | Only with IP-ID idle scan |

### Defender detection

- **Detection signatures** — signature-based IDS rules on SYN rate per source.
- **Flow analytics** — NetFlow / IPFIX analyzer flags hosts connecting to many others.
- **Honeypots / canaries** — services that only attract attackers (Canarytokens, Thinkst Canary).
- **Rate limiting** — edge routers throttling unsolicited SYN storms.
- **uRPF / BCP 38** — drops spoofed source IPs; defeats idle-scan and spoofed-source probes.

---

## Ch 16 — Defending Networks

The defender's counterpart to the offensive chapters. Layered control and visibility.

### Defense in depth

Multiple overlapping controls so that any single failure doesn't collapse the security posture:

- **Perimeter** — firewall, IPS, NAT, edge routing.
- **Network segmentation** — VLANs, VRFs, microsegmentation.
- **Endpoint** — AV/EDR, disk encryption, host firewall.
- **Application** — WAF, RASP, SAST/DAST.
- **Identity** — MFA, conditional access, PAM.
- **Data** — encryption at rest and in transit, DLP, classification.
- **Monitoring** — SIEM, NDR, XDR, UEBA.
- **Response** — SOAR playbooks, IR team, forensics, comms.
- **Recovery** — backups, DR site, BCP.

### Firewalls

Evolution:

| Generation | Capability |
|---|---|
| **1st** | Packet filter (stateless) — L3/L4 rules |
| **2nd** | Stateful inspection — tracks connection state |
| **3rd** | Application gateway / proxy |
| **NGFW** | L7 inspection, user identity, TLS inspection, IDS integrated, threat intel |
| **UTM** | NGFW + more (URL filtering, antivirus, VPN, anti-spam) |
| **Cloud-native / SASE** | Firewall-as-a-service, zero-trust, cloud-delivered inspection |

### IDS / IPS

Covered in `BOOK-NET-INTRUSION.md` in depth. Key for O'Leary:

- Signature vs anomaly vs stateful-protocol detection.
- In-band (IPS) vs out-of-band (IDS).
- NIDS vs HIDS.
- Snort / Suricata / Zeek (open source), Cisco FTD / Check Point / Palo Alto (commercial).

### SIEM — Security Information and Event Management

Aggregates logs from network, endpoint, application, and identity sources; correlates for alerts; supports investigations.

Major platforms:

- **Splunk** — de facto enterprise choice.
- **Elastic Stack (ELK)** — open-source (Elasticsearch + Logstash + Kibana).
- **IBM QRadar** — enterprise SIEM with integrated network flows.
- **Microsoft Sentinel** — cloud-native on Azure.
- **LogRhythm / Securonix / Exabeam** — enterprise alternatives.
- **Graylog / Wazuh** — open-source.

SIEM workflow:

1. **Collection** — log shippers (Fluentd, Filebeat, Winlogbeat, Splunk Universal Forwarder, syslog).
2. **Normalization** — parse into a common schema.
3. **Enrichment** — add context (GeoIP, threat intel, asset data).
4. **Correlation** — rule-based + ML-based detection.
5. **Alerting** — feed SOC analysts via ticketing / chat.
6. **Investigation** — search, pivot, timeline.
7. **Response** — SOAR playbooks for known-bad patterns.

### SOAR — Security Orchestration, Automation, Response

Formalize response playbooks:

- **Orchestration** — integrate disparate tools (SIEM, ticketing, EDR, firewall, email gateway) via APIs.
- **Automation** — run repeatable steps without human (e.g., block IOC across firewalls + DNS + EDR).
- **Response** — enforce consistent actions across incidents.

Platforms: Splunk SOAR (Phantom), Palo Alto XSOAR (Demisto), ServiceNow SecOps, Tines, Swimlane.

### EDR / XDR

Endpoint-centric telemetry and response:

- **EDR (Endpoint Detection and Response)** — agent on each host; kernel/process/file/network telemetry; behavioral detection; response actions (kill process, quarantine host, isolate network).
- **XDR (Extended Detection and Response)** — EDR + network + cloud + email + identity correlated; unified hunting surface.

Vendors: CrowdStrike Falcon, SentinelOne, Microsoft Defender for Endpoint, Palo Alto Cortex XDR, VMware Carbon Black, Elastic Security.

### Honeypots / deception

Systems designed **only to attract attackers**:

- **Low-interaction** — emulate services (Honeyd, Cowrie SSH honeypot).
- **High-interaction** — real systems offering real services in a contained environment.
- **Canarytokens** — single-use tokens (document, URL, API key) that alert on access.
- **Thinkst Canary** — appliance/VMs looking like real infrastructure; any interaction is alert.

Advantage: very high signal, very low noise — the only people finding these are attackers or lost admins.

### Logging best practices

- Centralize logs off each host to a log server (rsyslog, journald remote, Winlogbeat).
- Immutable append-only storage for forensic integrity.
- Time-sync (NTP) everywhere — correlation depends on synchronized clocks.
- Retention policy matches compliance and IR needs (typical: 90 days hot, 12 months cold).
- Log what matters: auth success/failure, process creation (Sysmon, auditd `execve`), file access on sensitive paths, network connections, config changes.

### Network segmentation

- **Traditional VLAN segmentation** — separate LANs for HR / Finance / Guest / IoT.
- **VRF (Virtual Routing and Forwarding)** — separate routing tables per tenant.
- **Microsegmentation** — east-west firewalling at the VM / container level (VMware NSX, Illumio, Cisco ACI).
- **Zero Trust Network Access (ZTNA)** — per-request authentication + authorization, no implicit trust.
- **Software-Defined Perimeter (SDP)** — client-initiated, identity-aware tunnels.

### Vulnerability management

- **Scanners** — Nessus, Qualys, OpenVAS, Rapid7 InsightVM.
- **Cadence** — continuous authenticated scans (internal) + external surface scans.
- **Prioritization** — CVSS base score + exploitability (EPSS) + asset criticality.
- **Patch management** — WSUS, SCCM/Intune, Landscape, Ansible, Chef.
- **Metrics** — mean time to patch (MTTP), percent of critical CVEs patched within SLA.

### Incident response lifecycle

Per NIST SP 800-61:

1. **Preparation** — tooling, playbooks, legal/PR prep, staff.
2. **Detection and Analysis** — alert triage, hypothesis testing.
3. **Containment** — short-term (isolate host); long-term (network segmentation).
4. **Eradication** — remove attacker access, close vulnerabilities.
5. **Recovery** — restore services, monitor for re-entry.
6. **Post-Incident Activity** — lessons learned, update detections and processes.

### Backup and recovery

- **3-2-1 rule** — 3 copies of data, on 2 different media, 1 offsite.
- **Immutable backups** — WORM storage, object lock, tape. Defeats ransomware encryption of online backups.
- **Tested recovery** — a backup not tested is not a backup.
- **RTO (Recovery Time Objective)** — how fast must we be back up?
- **RPO (Recovery Point Objective)** — how much data loss is acceptable?

### Cyber threat intelligence

- **Strategic** — adversary goals, motivations, trends. Consumed by leadership.
- **Operational** — campaign-level TTPs, named threat groups (APT28, FIN7, Lazarus).
- **Tactical** — MITRE ATT&CK techniques, sub-techniques.
- **Technical / IOC** — IPs, domains, hashes, certs for detection.

Sources: MISP (open-source platform), commercial feeds (Mandiant, Recorded Future, CrowdStrike), ISAC (sector sharing — FS-ISAC, H-ISAC, etc.), US-CERT / CISA advisories.

---

## Cross-book connections

- Ch 2 attack lifecycle ↔ `JCAC-ACTIVE-EXPLOIT.md` §3 (Enumeration + Target Dev) · MITRE ATT&CK tactics.
- Ch 5 Nmap ↔ `JCAC-UNIX-LINUX.md` §23 (Network-based security using Nmap) · `JCAC-ACTIVE-EXPLOIT.md` §3.
- Ch 16 defensive stack ↔ `JCAC-NETWORKING.md` §30 · `CJCSI-6510.01F.md` (IA/CND enclosures) · `CJCSM-6510.01B.md` (incident handling).
- SIEM + SOAR ↔ `BOOK-NET-INTRUSION.md` Ch 13 (analyst workflow).
- EDR ↔ `JCAC-WINDOWS.md` §6 (Logging) · `BOOK-WIN-INTERNALS-1.md` (PatchGuard, kernel callbacks).

---

## Exam-testable concepts (rapid-fire)

### Ch 2 — Basic Offense

- **Phases of an intrusion (Kill Chain)?** Recon, Weaponization, Delivery, Exploitation, Installation, C2, Actions on Objectives.
- **MITRE ATT&CK Initial Access tactic ID?** TA0001.
- **Phishing of execs?** Whaling.
- **SMS-based phishing?** Smishing.
- **Voice phishing?** Vishing.
- **Spearphishing via malicious attachment MITRE ID?** T1566.001.
- **Most widely abused C2 framework (commercial)?** Cobalt Strike.
- **OpenSource C2 successor to Empire?** Sliver, Mythic, Covenant.
- **Python-based Windows protocol attack library?** Impacket.
- **AD attack-path graphing tool?** BloodHound (collector = SharpHound).

### Ch 5 — Scanning

- **Nmap SYN stealth scan flag?** `-sS`.
- **Nmap connect() scan flag?** `-sT`.
- **Nmap UDP scan flag?** `-sU`.
- **Nmap OS fingerprint flag?** `-O`.
- **Nmap service version flag?** `-sV`.
- **Nmap NSE default category?** `-sC` (default script set).
- **Output formats?** `-oN` normal, `-oX` XML, `-oG` grepable, `-oA` all.
- **Internet-scale port scanner?** masscan (or zmap).
- **Port state "filtered" means?** Firewall dropping probes — no response to determine state.
- **Why does UDP scan report "open\|filtered"?** No response means either; only closed ports reliably respond via ICMP unreachable.
- **Detection for SYN scan?** IDS rules on SYN rate + NetFlow analytics; honeypots catch targeted ones.

### Ch 16 — Defending Networks

- **Defense-in-depth layers (at least 5)?** Perimeter, network segmentation, endpoint, application, identity, data, monitoring, response, recovery.
- **NGFW adds over traditional firewall?** L7 inspection, user identity, TLS inspection, IDS integration.
- **SIEM does what?** Aggregates logs, normalizes, correlates, alerts.
- **SOAR adds over SIEM?** Orchestrates response playbooks across tools.
- **XDR vs EDR?** XDR correlates network + cloud + email + identity with EDR's endpoint telemetry.
- **Canarytoken?** Single-use tripwire that alerts on access.
- **3-2-1 backup rule?** 3 copies, 2 media, 1 offsite.
- **Immutable backup defeats?** Ransomware encryption of online backups.
- **RTO vs RPO?** Recovery Time vs Recovery Point Objectives.
- **CTI levels?** Strategic, Operational, Tactical, Technical/IOC.
- **NIST IR phases?** Preparation, Detection & Analysis, Containment, Eradication, Recovery, Post-Incident.
- **Open-source threat-intel platform?** MISP.

---

## Cross-references

- **[Cyber Operations (O'Leary), 2e](../references/Cyber%20Operations%20-%20Building,%20Defending,%20and%20Attacking%20Modern%20Computer%20Networks-9781484242940.pdf)** — text on disk.
- **[MITRE ATT&CK](https://attack.mitre.org/)** — attack tactics and techniques framework.
- **[Lockheed Martin Cyber Kill Chain](https://www.lockheedmartin.com/en-us/capabilities/cyber/cyber-kill-chain.html)**.
- **[NIST SP 800-61 Rev 2](https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final)** — Computer Security Incident Handling Guide.
- **[MISP Project](https://www.misp-project.org/)** — open-source threat-sharing platform.
- **[CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)**.
- `JCAC-ACTIVE-EXPLOIT.md` · `BOOK-NET-INTRUSION.md` · `BOOK-GRAY-HAT.md`.
- `CJCSI-6510.01F.md` · `CJCSM-6510.01B.md` · `DJSIG.md` — DoD doctrine on IA/CND and incident handling.
