# Bib Study Guide — CISSP Official Study Guide (Stewart, Chapple, Gibson) 7th Edition

> **Bib reference:** *(ISC)² CISSP Certified Information Systems Security Professional Official Study Guide*, 7th Edition — James Michael Stewart, Mike Chapple, Darril Gibson (Sybex, 2015).
>
> **Regular-exam scope:** Chapters 4, 7.
> **Substitute-exam scope:** Chapter 4.
> **Union — what this guide covers:** Ch 4 (Communication and Network Security) and Ch 7 (Security Operations).

**Posture:** CISSP is management-oriented — the **Common Body of Knowledge** the (ISC)² expects a security leader to speak. This guide abstracts Ch 4 + Ch 7 into the operational takeaways a CWT Chief needs. Pairs with `JCAC-NETWORKING.md` (protocol depth) and `CJCSM-6510.01B.md` (DoD incident-handling alignment).

---

## Chapter 4 — Communication and Network Security

### The OSI model (CISSP emphasis)

CISSP expects fluency with the 7-layer model and where each security control lives.

| # | Layer | Purpose | Typical security controls |
|---|---|---|---|
| **7** | Application | User-facing services | WAF, API gateway, input validation, session management |
| **6** | Presentation | Encoding, encryption, compression | TLS (partial), data-format validation |
| **5** | Session | Session setup / teardown | Authentication, session tokens, idle-timeout |
| **4** | Transport | End-to-end delivery, reliability | TLS, TCP security flags, port filtering |
| **3** | Network | Logical addressing, routing | Firewall (stateful), routing filters, IPsec, ACLs, anti-spoofing |
| **2** | Data Link | Framing, MAC addressing | 802.1X, MAC filtering, port security, VLAN, MACsec |
| **1** | Physical | Bits on the medium | Locked cabinets, TEMPEST shielding, cable locks, fiber-tap detection |

### TCP/IP model

Four-layer (CISSP alternate framing): Link, Internet, Transport, Application.

### Secure protocols — know which replaces which

| Insecure | Port | Secure alternative | Port |
|---|---|---|---|
| Telnet | 23 | SSH | 22 |
| FTP | 21 | SFTP (SSH) / FTPS (TLS) | 22 / 990 |
| HTTP | 80 | HTTPS | 443 |
| SMTP | 25 | SMTPS / STARTTLS | 465 / 587 |
| POP3 | 110 | POP3S | 995 |
| IMAP | 143 | IMAPS | 993 |
| LDAP | 389 | LDAPS / StartTLS | 636 |
| SNMP v1/v2c | 161 | SNMPv3 (auth + priv) | 161 |
| DNS (clear) | 53 | DoT / DoH / DoQ | 853 / 443 / 853 (UDP) |
| rlogin / rsh | 513/514 | SSH | 22 |

### Firewalls — generations

1. **Packet filter (stateless)** — L3/L4 rules.
2. **Stateful inspection** — tracks connection state; allows return traffic.
3. **Application / proxy firewall** — full L7 proxy, deeper inspection.
4. **NGFW (Next-Gen Firewall)** — L7 + user identity + TLS inspection + IDS integration + threat-intel.
5. **UTM / SASE** — cloud-delivered, integrated.

Topologies:

- **Screened subnet (DMZ)** — two firewalls sandwiching public-facing services between external and internal zones.
- **Three-legged firewall** — single firewall with external / DMZ / internal interfaces.
- **Bastion host** — hardened single-purpose host in the DMZ.

### VLANs, VPNs, VRF

Covered in `JCAC-NETWORKING.md` §28 and `BOOK-CCNA.md` Ch 12. CISSP adds the **segmentation-as-security** framing: zones of trust separated at L2 or L3.

### VPN technologies

| Type | Use | Pros / Cons |
|---|---|---|
| **IPsec site-to-site** | Branch-to-HQ, B2B | Network-layer, transparent to apps; complex config |
| **SSL/TLS VPN** | Remote user access | Client-less via browser; integrates with SSO |
| **L2TP over IPsec** | Legacy remote access | Good interop; less common now |
| **WireGuard** | Modern VPN | Fast, simple, audited crypto |
| **PPTP** | Legacy | **Broken — do not use** |
| **GRE tunneling** | Multi-protocol IP tunnel | Unencrypted; wrap in IPsec for secrecy |

### Network attacks (CISSP taxonomy)

- **DoS / DDoS** — volumetric (flood BW), protocol (SYN flood, Smurf), application (Slowloris, HTTP flood), amplification (DNS, NTP monlist, memcached).
- **Spoofing** — IP, MAC, ARP, DNS, email From. Mitigation: uRPF, DAI, DNSSEC, SPF/DKIM/DMARC.
- **Man-in-the-Middle** — ARP spoofing on LAN, BGP hijack on WAN, rogue AP. Mitigations: encryption, cert pinning, 802.1X, IDS.
- **Session hijacking** — steal session cookies / tokens. Mitigations: HttpOnly/Secure/SameSite cookies, short TTL, bind to IP/fingerprint.
- **Packet sniffing** — capture cleartext. Mitigations: TLS, switched Ethernet (vs hubs), WPA2/3 on Wi-Fi.
- **Port scanning** — reconnaissance. Mitigations: firewall default-deny, honeypots, rate-limiting.
- **Replay attacks** — captured auth tokens re-sent. Mitigations: timestamps, nonces, sequence numbers.
- **Social engineering at the protocol level** — phishing, pretexting. Mitigations: awareness, MFA.

### Wireless security evolution

| Standard | Crypto | Status |
|---|---|---|
| **WEP** | RC4 with short IV | **Broken** |
| **WPA** | TKIP | Legacy / broken |
| **WPA2 Personal** | AES-CCMP with PSK | Acceptable if strong passphrase |
| **WPA2 Enterprise** | AES-CCMP with 802.1X / EAP | Standard for enterprise |
| **WPA3 Personal** | SAE (Dragonfly) — resistant to offline dictionary | Current best |
| **WPA3 Enterprise** | Enhanced 802.1X + 192-bit suite | Current best |

Attacks: WEP cracking (IV collisions), WPA/2 PSK capture + offline dictionary (Krack, PMKID), KARMA rogue AP, Evil Twin, KRACK (WPA2 handshake), Dragonblood (WPA3 early versions).

### Content delivery

- **CDN** — Cloudflare, Akamai, CloudFront. Offloads static content, adds DDoS protection.
- **Edge computing** — move compute closer to users.

### Remote-access architecture

- **VPN** — tunnel back to corporate.
- **ZTNA (Zero Trust Network Access)** — per-request authentication / authorization, no implicit trust zones.
- **Privileged Access Management (PAM)** — CyberArk, BeyondTrust; session recording, credential checkout.
- **Jump host / bastion** — forced-routing entry point to sensitive networks.

### Email security

- **TLS-everywhere** (STARTTLS + opportunistic TLS 1.2+).
- **SPF** — authorized senders TXT.
- **DKIM** — signed headers/body.
- **DMARC** — enforcement + reporting.
- **BIMI** — brand indicator (requires DMARC pass).
- **S/MIME, PGP** — end-to-end message encryption/signing.

### Voice security

- **SRTP** — encrypted RTP.
- **ZRTP** — key exchange without external CA.
- **SIP-TLS** — encrypted signaling.
- **SBC** — Session Border Controller; SIP-layer firewall.

### Virtualization / cloud at network layer

- **Virtual switches / distributed switches** — VMware vSwitch, NSX, Hyper-V virtual switch.
- **Microsegmentation** — east-west firewalling at VM / container granularity.
- **Cloud native** — security groups (AWS), NSGs (Azure), firewall rules (GCP); ZTNA platforms.
- **Service mesh** — Istio, Linkerd — mTLS between microservices, policy at the sidecar.

---

## Chapter 7 — Security Operations

CISSP Ch 7 is the breadth-first tour of **operational security controls**.

### Identity, access, and privileged access

- **Need-to-know** — access granted only when required for the job.
- **Least privilege** — grant minimum rights to perform the role.
- **Separation of duties** — split critical operations between people.
- **Job rotation** — rotate roles to detect fraud and prevent single-point knowledge.
- **Mandatory vacation** — forces detection of fraud / errors in someone's work.
- **Privileged access management (PAM)** — break-glass accounts, just-in-time elevation, session recording.

### Account lifecycle

1. **Provisioning** — account creation, role assignment, initial permissions.
2. **Review** — periodic recertification; remove unneeded access.
3. **Modification** — role changes (transfer, promotion).
4. **Deprovisioning** — timely disablement on termination (within hours, not weeks).

### Resource protection

- **Assets inventory** — you can't protect what you don't know you have.
- **Classification** — Public / Internal / Confidential / Secret / Top Secret (with FOUO / CUI in DoD context).
- **Data handling** — storage requirements per classification, labeling, disposal.
- **Media sanitization** — clearing (overwrite), purging (secure erase / degauss), destruction (physical). Referenced in NIST SP 800-88.
- **Data retention** — policies by category; legal hold overrides.

### Monitoring and logging

- **Log sources** — endpoints, network, apps, identity systems.
- **Centralized logging** — SIEM (Splunk, ELK, Sentinel, QRadar).
- **Log integrity** — forwarding to hardened log host; cryptographic sealing.
- **Synchronized time** — NTP everywhere for correlation.
- **Retention** — typically 90 days hot + 1 year cold (compliance-dependent).
- **Continuous monitoring** — SCAP, configuration management, vulnerability scanning.

### Incident response

NIST SP 800-61 lifecycle:

1. **Preparation** — plan, tooling, team, exercises.
2. **Detection and Analysis** — alert triage.
3. **Containment** — short-term (isolate) and long-term (architectural).
4. **Eradication** — remove attacker, close vulnerability.
5. **Recovery** — restore services, monitor.
6. **Post-Incident Activity** — lessons learned, report.

IR team roles: IR Manager, forensic lead, threat-intel analyst, communications, legal counsel, IT ops liaison.

### Digital forensics (CISSP breadth)

**Chain of custody** — preserve evidence integrity from collection through court.

Order of volatility (capture in this order — most volatile first):

1. CPU registers, cache.
2. RAM.
3. Temporary filesystem data (swap, temp).
4. Disk.
5. Remote logs.
6. Physical configuration / topology.
7. Archival media.

Tools: FTK, EnCase, Autopsy, Volatility, Wireshark, tcpdump, dd.

Legal admissibility: evidence must be **authentic, reliable, complete, believable, admissible**.

### Business Continuity and Disaster Recovery (BCP/DR)

- **BIA (Business Impact Analysis)** — identifies critical processes + RTO/RPO/MTD.
  - **RTO** — Recovery Time Objective: how fast we're back up.
  - **RPO** — Recovery Point Objective: how much data loss acceptable.
  - **MTD** — Maximum Tolerable Downtime.
- **Strategies**:
  - **Hot site** — fully-equipped, data-current, immediate failover.
  - **Warm site** — partially-equipped, needs data sync + some setup.
  - **Cold site** — space/power only; full rebuild needed.
  - **Cloud DR** — infrastructure-on-demand.
  - **Multi-site active-active** — traffic split across locations.
- **Testing types** — checklist, structured walk-through, simulation, parallel, full interruption.

### Change management

- **Change Advisory Board (CAB)** — approves significant changes.
- **RFC (Request for Change)** — documents planned change.
- **Rollback plan** — every change must have one.
- **Emergency change** — expedited path with post-hoc review.
- **Configuration management** — baseline + change log; CMDB.

### Patch management

- **Risk-based prioritization** — CVSS + exploitability + asset criticality.
- **Test before deploy** — staging, QA, subset of production.
- **Patch Tuesday** — Microsoft's monthly cadence.
- **Out-of-band patches** — emergency (actively exploited).

### Vulnerability management

- **Scanning** — authenticated vs unauthenticated; internal vs external.
- **Tools** — Nessus, Qualys, OpenVAS, Rapid7 InsightVM.
- **CVSS** — base + temporal + environmental scores.
- **EPSS** — exploit-prediction score.
- **Metrics** — MTTP (mean time to patch), percent-critical patched within SLA.

### Physical security

- **Perimeter** — fencing, bollards, CPTED (Crime Prevention Through Environmental Design).
- **Access controls** — badges, mantraps, biometrics, guards.
- **Environmental** — fire suppression (FM-200, Inergen; not water on electronics), HVAC, power (UPS + generator), cable routing.
- **Fire classes**: A (wood/paper), B (liquid), C (electrical), D (metal), K (kitchen).
- **TEMPEST** — emanations control; shielded enclosures for classified processing.

### Personnel security

- **Background checks** — pre-hire + periodic.
- **NDA / security agreements** — at hire.
- **Security training** — initial + ongoing + role-specific.
- **Phishing simulations** — track click-through, remediate via training.
- **Secure offboarding** — badge / key / access removal within SLA.

### Insider threat

- Motivators: disgruntlement, financial gain, ideology, coercion, thrill.
- Indicators: unusual access hours, policy violations, data exfiltration patterns, living-beyond-means.
- Controls: UEBA, DLP, just-in-time access, separation of duties, whistleblower channels.

### Third-party / supply-chain security

- **Vendor risk management** — due diligence, questionnaires (SIG, CAIQ), on-site audits.
- **Contractual security requirements** — BAA, DPA, SLA, data-handling clauses.
- **SBOM** — Software Bill of Materials — list of components for vulnerability tracking.
- **SolarWinds-class risk** — compromise of widely-used SaaS or library.

### Ethics (CISSP-required)

- **(ISC)² Code of Ethics** — preamble + 4 canons:
  1. Protect society, the commonwealth, and the infrastructure.
  2. Act honorably, honestly, justly, responsibly, and legally.
  3. Provide diligent and competent service to principals.
  4. Advance and protect the profession.

Violations can cost your certification.

---

## Cross-book connections

- Ch 4 networking ↔ `JCAC-NETWORKING.md` · `BOOK-TCPIP-GUIDE.md` · `BOOK-CCNA.md`.
- Ch 4 wireless ↔ `BOOK-CWNA.md` Ch 1.
- Ch 7 IR ↔ `CJCSM-6510.01B.md` (DoD Cyber Incident Handling Program) · `BOOK-CYBER-OPS.md` Ch 16.
- Ch 7 forensics ↔ `BOOK-ART-MEM-FORENSICS.md` · `JCAC-FORENSIC-MAL.md`.
- Ch 7 physical/environmental ↔ `SECNAVINST-5510.36B.md` (DON Info Security).
- Ch 7 supply chain ↔ `USCCINST-3000.14A.md` (Technical Deconfliction).

---

## Exam-testable concepts (rapid-fire)

### Ch 4 — Networking

- **OSI layer count?** 7.
- **TCP port for HTTPS?** 443. SSH? 22. RDP? 3389. SMB? 445. LDAPS? 636.
- **Broken wireless standard?** WEP.
- **Modern secure wireless?** WPA3.
- **Replaced Telnet?** SSH.
- **Replaced FTP for secure transfer?** SFTP (over SSH) or FTPS (over TLS).
- **SPF/DKIM/DMARC — what does each do?** SPF authorized senders; DKIM signed body/headers; DMARC policy + reporting aligning both with From.
- **Zero trust short name?** ZTNA (Zero Trust Network Access).
- **Session Border Controller (SBC) role?** SIP-layer firewall for VoIP.
- **Encrypted DNS options?** DoT (TCP/853), DoH (TCP/443), DoQ (UDP/853).
- **ARP spoofing mitigation on switches?** Dynamic ARP Inspection (DAI).
- **Rogue DHCP defense?** DHCP snooping.
- **DDoS type that exploits amplification?** DNS/NTP/memcached reflection.

### Ch 7 — Security Operations

- **Need-to-know differs from least privilege how?** NTK = info only relevant to job; LP = minimum permissions to perform the job.
- **Separation of duties example?** Requestor ≠ approver ≠ implementer for a change.
- **Mandatory vacation purpose?** Detect fraud / errors while the person is away.
- **NIST SP 800-61 IR phases?** Preparation, Detection & Analysis, Containment, Eradication, Recovery, Post-Incident.
- **Order of volatility first item?** CPU registers and cache.
- **RTO is?** Recovery Time Objective — max acceptable downtime.
- **RPO is?** Recovery Point Objective — max acceptable data loss.
- **MTD is?** Maximum Tolerable Downtime.
- **Hot site vs cold site?** Hot = fully equipped + data-current; Cold = space/power only.
- **BIA identifies?** Critical processes and their dependencies + RTO/RPO/MTD.
- **NIST SP 800-88 covers?** Media sanitization (clear / purge / destroy).
- **CAB role?** Change Advisory Board — approves significant changes.
- **CVSS is?** Common Vulnerability Scoring System (v3 / v4).
- **EPSS is?** Exploit Prediction Scoring System.
- **Fire class for electrical?** Class C.
- **TEMPEST addresses?** Electromagnetic emanations that could leak classified data.
- **(ISC)² Code of Ethics canon count?** 4.
- **Privileged Access Management vendor examples?** CyberArk, BeyondTrust, Delinea, HashiCorp Vault (for secrets).

---

## Cross-references

- **[CISSP Official Study Guide, 7e](../references/CISSP%20%28ISC%292%20Official%20Study%20Guide%207th%20Edition.pdf)** — text on disk.
- **[(ISC)² CISSP exam outline](https://www.isc2.org/Certifications/CISSP)** — current CBK.
- **[NIST SP 800-61 Rev 2 IR Guide](https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final)**.
- **[NIST SP 800-88 Rev 1 Media Sanitization](https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final)**.
- **[FIRST CVSS](https://www.first.org/cvss/)** · **[EPSS](https://www.first.org/epss/)**.
- **[(ISC)² Code of Ethics](https://www.isc2.org/Ethics)**.
- `JCAC-NETWORKING.md` · `BOOK-CCNA.md` · `BOOK-CYBER-OPS.md` · `BOOK-CWNA.md`.
- `CJCSM-6510.01B.md` · `SECNAVINST-5510.36B.md`.
