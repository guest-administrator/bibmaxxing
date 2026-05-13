# Bib Study Guide — CompTIA Security+ Study Guide SY0-401 (6th Edition, Dulaney)

> **Bib reference:** *CompTIA Security+ Study Guide: SY0-401*, Sixth Edition — Emmett Dulaney, Chuck Easttom (Sybex, 2014, ISBN 978-1-118-87507-0).
>
> **Regular-exam scope:** Study topics on **designing a secure network**, **protecting data through fault tolerance**, and **working with wireless systems**.
> **Substitute-exam scope:** Chapter 3.
> **Union — what this guide covers:** Ch 3 (Network Security — corresponds to the "designing a secure network" topic), the fault-tolerance / availability content, and wireless-security content.

**Posture:** Sec+ SY0-401 is entry-level certification material, but exam items for CWT E-7 still pull from it. This guide condenses the three Bib-scope topics. Pairs with `BOOK-CISSP.md` Ch 4 (same territory, deeper), `BOOK-CWNA.md` Ch 1 (wireless), and `BOOK-CCNA.md` (enterprise networking).

---

## Designing a Secure Network

### Principles

- **Defense in depth** — layered controls.
- **Least privilege** — grant minimum needed.
- **Separation of duties** — split critical operations.
- **Fail secure vs fail open** — decide per control which failure mode is acceptable.
- **Minimize attack surface** — disable unused services, close unused ports.
- **Secure defaults** — ship with restrictive config, let admins relax if they accept risk.
- **Economy of mechanism** — simpler is more auditable.
- **Complete mediation** — every access request is checked.

### Network zones

- **Internet (untrusted)** — all external traffic begins here.
- **DMZ (screened subnet)** — public-facing services (web, mail relay, reverse proxies).
- **Internal / LAN (trusted)** — corporate workstations and servers.
- **High-security zone** — sensitive servers (financial, PII, source-control, domain controllers).
- **Management network** — out-of-band access to devices (admin only).
- **Guest network** — visitor Wi-Fi, isolated from internal.
- **IoT / OT network** — operational technology segregated.

Traffic between zones is filtered by firewalls. Between zones of different trust level, **both directions** require explicit rule.

### Firewall placement patterns

- **Single firewall with three interfaces** — external, DMZ, internal. Simple but DMZ compromise → same firewall between attacker and internal.
- **Back-to-back firewalls (two firewalls, sandwich DMZ)** — different vendors ideally so a single CVE doesn't blow both. More expensive.
- **Stateful NGFW at the edge** + **micro-segmentation firewalls** inside.

### Network Access Control (NAC)

Authenticate devices before granting network access. Flavors:

- **802.1X + RADIUS** — wired switchports and Wi-Fi.
- **Captive portal** — web-based (guest networks).
- **Posture check** — host health (patch level, AV state) before admitting.

### IDS / IPS / WAF

- **IDS (Intrusion Detection System)** — out-of-band; detect and alert.
- **IPS (Intrusion Prevention System)** — in-line; detect and block.
- **WAF (Web Application Firewall)** — L7, specifically for web apps; ModSecurity, AWS WAF, Cloudflare.

### Network segmentation tools

- **VLAN** — L2 segmentation (see `BOOK-CCNA.md` Ch 12).
- **VRF** — L3 routing-table separation.
- **Micro-segmentation** — VMware NSX, Illumio, Cisco ACI.
- **SDN (Software-Defined Networking)** — programmatic control plane.
- **Service mesh** — mTLS + policy between microservices (Istio, Linkerd).

### Remote access architecture

- **VPN (IPsec / SSL)** — tunnel back to enterprise.
- **RAS / dial-in** — historical.
- **ZTNA (Zero Trust Network Access)** — per-request authn/authz; no implicit trust by network location.
- **PAM (Privileged Access Management)** — CyberArk, BeyondTrust; vault + session recording.
- **Jump host / bastion** — forced-routing chokepoint.

### Secure protocols replacing insecure

| Insecure | Secure replacement |
|---|---|
| Telnet | SSH |
| FTP | SFTP (SSH), FTPS (TLS) |
| HTTP | HTTPS |
| SMTP (clear) | SMTPS / STARTTLS |
| POP3 / IMAP | POP3S / IMAPS |
| LDAP (clear) | LDAPS / LDAP+StartTLS |
| SNMPv1/v2c | SNMPv3 (auth + priv) |
| rlogin / rsh | SSH |
| TFTP | SFTP or HTTPS |

### Port security on switches

```
switchport port-security
switchport port-security maximum 2
switchport port-security mac-address sticky
switchport port-security violation shutdown
```

Modes: **protect** (drop), **restrict** (drop + log), **shutdown** (err-disable).

### DHCP snooping + DAI + IPSG

- **DHCP snooping** — only trusted ports can send DHCP offers; binding table of legitimate IP↔MAC↔port.
- **Dynamic ARP Inspection (DAI)** — validates ARP against snooping table.
- **IP Source Guard (IPSG)** — only packets with IP in snooping table allowed.

### Common threats to mitigate

- **DoS / DDoS** — upstream scrubbing, rate limiting, Anycast, BGP blackhole.
- **Spoofing** — uRPF, BCP 38.
- **MITM** — TLS everywhere, 802.1X, DAI.
- **Rogue DHCP** — snooping.
- **Rogue APs** — WIDS/WIPS.
- **Unpatched services** — vuln mgmt, patch management.
- **Insider abuse** — DLP, UEBA, PAM.

---

## Protecting Data Through Fault Tolerance

### Availability concepts

- **CIA triad** — Confidentiality, Integrity, **Availability**.
- **Five nines** = 99.999% uptime = ~5.26 min/year.
- **SLAs** — contractual availability targets.
- **MTBF** (Mean Time Between Failures) — expected lifetime between failures.
- **MTTR** (Mean Time To Repair) — expected restoration time.
- **Availability** = MTBF / (MTBF + MTTR).

### Redundancy

| Level | Technique |
|---|---|
| **Component** | Dual PSUs, bonded NICs, teamed links |
| **Server** | Clustering, load-balancing, active-passive failover |
| **Data** | RAID, replication, backups |
| **Site** | DR site, active-active, geo-dispersed |
| **ISP** | Multiple carriers with BGP |
| **Power** | UPS + generator + separate grid feeds |

### RAID levels (for exam)

| Level | Minimum disks | Fault tolerance | Usable capacity | Read perf | Write perf |
|---|---|---|---|---|---|
| **RAID 0** (striping) | 2 | 0 — no tolerance | 100% | High | High |
| **RAID 1** (mirroring) | 2 | 1 per pair | 50% | Good | Moderate |
| **RAID 5** (striping + distributed parity) | 3 | 1 | (N−1)/N | Good | Slower (parity) |
| **RAID 6** (striping + double parity) | 4 | 2 | (N−2)/N | Good | Slowest |
| **RAID 10 (1+0)** (mirrored pairs, striped) | 4 | 1 per mirror | 50% | Very high | Very high |
| **RAID 50 / 60** | 6+ | Per-group | Varies | High | Good |

**RAID is not backup** — protects against drive failure, not accidental deletion, corruption, or ransomware. Need separate backups.

### Backup types

| Type | What gets backed up | Restore chain |
|---|---|---|
| **Full** | Everything | Just the full |
| **Incremental** | Changes since last backup of any kind | Full + every incremental |
| **Differential** | Changes since last full | Full + latest differential |
| **Synthetic full** | Reconstructed from base + incrementals | Just the synthetic |

### Backup storage media

- **Disk (NAS / SAN)** — fast, flexible, online. Costs more per TB.
- **Tape (LTO)** — slow access but massive capacity, cheap, air-gappable.
- **Object storage (S3, Azure Blob)** — cloud, durable, lifecycle rules.
- **Optical (M-DISC, Blu-ray)** — archival read-only.

### Backup discipline

- **3-2-1 rule** — 3 copies, 2 different media, 1 offsite.
- **Immutable backup** — WORM (Write Once Read Many); object-lock or tape retention. Defeats ransomware that encrypts online backups.
- **Test restores** — a backup not tested is not a backup.
- **RTO vs RPO** — Recovery Time Objective vs Recovery Point Objective.

### High availability techniques

- **Load balancer** — L4 or L7; active-active backend pool.
- **Cluster** — tightly-coupled; shared or replicated state.
- **Heartbeat networks** — dedicated link for cluster nodes to detect peer liveness.
- **VRRP / HSRP / GLBP** — gateway redundancy protocols.
- **Anycast** — same IP advertised from multiple locations; routing picks nearest.
- **DNS round-robin** — multiple A records for the same name.
- **Multi-site replication** — sync (same data, performance cost) or async (lag, but higher throughput).

### Site recovery tiers

| Type | Equipment | Data | Recovery time |
|---|---|---|---|
| **Hot site** | Fully equipped + live | Current | Immediate / minutes |
| **Warm site** | Equipped but not live | Recent | Hours |
| **Cold site** | Space + power only | None | Days |
| **Cloud DR** | Infrastructure-on-demand | Replicated | Minutes to hours |
| **Mobile / reciprocal** | Shared via agreements | Varies | Varies |

### BCP / DR process

1. **BIA (Business Impact Analysis)** — identify critical processes + RTO/RPO/MTD.
2. **Risk assessment** — threats + likelihood + impact.
3. **Strategy** — continuity + recovery strategy per process.
4. **Plan document** — runbooks, contact lists, authorization.
5. **Test** — tabletop, structured walk-through, simulation, parallel, full interruption.
6. **Maintain** — annual review; update after org changes.

### Power redundancy

- **UPS (Uninterruptible Power Supply)** — battery bridging utility outage.
- **Generator** — longer outages; diesel typical.
- **ATS (Automatic Transfer Switch)** — cuts over utility ↔ generator.
- **Redundant PSUs** — in each server, each on different circuit.
- **Dual grid feeds / substations** — for data centers.

### Environmental controls

- **HVAC** — temperature (18–27 °C typical data-center range; ASHRAE A1 allowable 15–32°C).
- **Humidity** — 40–60% RH prevents both ESD and corrosion.
- **Fire suppression** — FM-200, Inergen (inert gases); Class C rated for electrical.
- **Water leak detection** — under raised floors.
- **Smoke detection** — VESDA (very-early smoke detection apparatus).

---

## Working with Wireless Systems

### Wi-Fi standards (summary)

Covered in `BOOK-CWNA.md` Ch 1. Key summary for Sec+:

| Amendment | Branding | Band | Max PHY rate |
|---|---|---|---|
| 802.11b | — | 2.4 | 11 Mbps |
| 802.11g | — | 2.4 | 54 Mbps |
| 802.11n | Wi-Fi 4 | 2.4 + 5 | 600 Mbps |
| 802.11ac | Wi-Fi 5 | 5 | ~6.9 Gbps |
| 802.11ax | Wi-Fi 6 / 6E | 2.4 + 5 + 6 | ~9.6 Gbps |
| 802.11be | Wi-Fi 7 | 2.4 + 5 + 6 | ~46 Gbps |

### Security standards

| Protocol | Crypto | Status |
|---|---|---|
| **WEP** | RC4 + short IV + CRC-32 | **Broken** (crack in seconds) |
| **WPA (TKIP)** | RC4 + TKIP rekey | Legacy / broken |
| **WPA2 Personal** | AES-CCMP + PSK | Acceptable with strong PSK |
| **WPA2 Enterprise** | AES-CCMP + 802.1X/EAP | Enterprise standard |
| **WPA3 Personal** | SAE (Dragonfly) | Current best |
| **WPA3 Enterprise** | Enhanced 802.1X + 192-bit suite | Current best |

### 802.1X / EAP methods

- **EAP-TLS** — mutual certificates. Strongest. Requires PKI.
- **EAP-TTLS** — server cert + tunneled MSCHAPv2 for client. No client cert.
- **PEAP** — server cert + tunneled MSCHAPv2. Common in Windows AD environments.
- **EAP-FAST** — Cisco's credential-based replacement for LEAP.
- **EAP-PWD / EAP-pwd** — password-based with Dragonfly (related to WPA3 SAE).
- **EAP-SIM / EAP-AKA** — cellular SIM integration.

### Wireless attacks

- **WEP cracking** — `aircrack-ng`; IV collisions.
- **WPA/2 PSK capture + offline dictionary** — capture 4-way handshake with `airodump-ng` + deauth to force reconnect; crack with `hashcat`.
- **PMKID attack** — skip handshake capture; PMKID in first frame.
- **Evil Twin** — rogue AP with same SSID.
- **KARMA** — rogue AP replies to any probe request.
- **Deauth flood** — force reconnects (driven by 802.11w PMF absence).
- **KRACK (2017)** — WPA2 4-way handshake replay vulnerability.
- **WPS PIN brute-force / Pixie Dust** — WPS weakness.

### Wireless defenses

- Use WPA3 Enterprise / WPA2 Enterprise with EAP-TLS.
- Disable WEP, WPA-TKIP, WPS.
- 802.11w (PMF — Protected Management Frames) to defeat deauth attacks.
- Guest SSID on isolated VLAN.
- WIDS/WIPS for rogue AP + evil twin detection.
- Strong PSK (20+ chars random) if PSK must be used.
- Change default admin credentials on APs.
- Firmware updates.
- Hide SSID — marginal benefit; not a real control.
- MAC filtering — marginal; MACs trivially spoofable.

### Bluetooth attacks

- **Bluejacking** — send unsolicited messages (annoying, not RCE).
- **Bluesnarfing** — theft of data over Bluetooth.
- **Bluebugging** — remote control of phone.
- **Pairing weaknesses** — simple-PIN modes are crackable offline.
- **BlueBorne (2017)** — RCE via Bluetooth stack.

### Rogue access points

A rogue AP is any unauthorized 802.11 access point on the network, typically:
- An employee-installed consumer router on an ethernet jack (well-meaning or shadow IT).
- An attacker-controlled AP plugged in during physical access.
- A soft-AP running on a compromised host.

Detection: WIDS, port-security + 802.1X on wired ports, wired / wireless correlation.

### Wireless monitoring

- **WIDS (Wireless IDS)** — passive monitoring for policy violations.
- **WIPS (Wireless IPS)** — active countermeasures (send deauths to rogue clients, etc.).
- **Surveys** — site-survey tools (Ekahau, AirMagnet) for coverage and interference baseline.

---

## Cross-book connections

- Network segmentation ↔ `BOOK-CCNA.md` Ch 12 · `JCAC-NETWORKING.md` §28.
- VPN ↔ `JCAC-NETWORKING.md` §28 · `BOOK-CISSP.md` Ch 4.
- Fault tolerance (RAID, backup) ↔ `BOOK-ARCH-COMP-HW.md` §17 · `JCAC-OS.md` §9 (File Systems).
- Wireless ↔ `BOOK-CWNA.md` Ch 1 · `JCAC-NETWORKING.md` §5.
- BCP / DR ↔ `BOOK-CISSP.md` Ch 7.

---

## Exam-testable concepts (rapid-fire)

### Secure network design

- **CIA triad?** Confidentiality, Integrity, Availability.
- **DMZ purpose?** Host public-facing services between external untrusted and internal trusted zones.
- **Defense in depth?** Layered controls.
- **Least privilege?** Minimum rights needed to perform duties.
- **Port security violation modes?** Protect, Restrict, Shutdown.
- **DHCP snooping prevents?** Rogue DHCP servers.
- **Dynamic ARP Inspection prevents?** ARP spoofing (uses DHCP snooping table).
- **NAC authenticates at?** L2 port access (802.1X + RADIUS).
- **WAF operates at?** L7 (web application layer).
- **Stateful firewall tracks?** Connection state (allows return traffic).

### Fault tolerance

- **RAID 0 tolerates?** Zero failures (pure striping).
- **RAID 1 is?** Mirroring — 50% usable, 1 disk can fail.
- **RAID 5 minimum disks?** 3. Tolerates 1 disk failure.
- **RAID 6 minimum disks?** 4. Tolerates 2 disk failures.
- **RAID 10 usable capacity?** 50%. Combines mirroring + striping.
- **RAID is not a replacement for?** Backups.
- **3-2-1 backup rule?** 3 copies, 2 media, 1 offsite.
- **Incremental vs differential?** Incremental = since last backup of any kind; Differential = since last full.
- **RTO vs RPO?** Recovery Time vs Recovery Point.
- **Hot site?** Fully equipped and current; immediate failover.
- **Cold site?** Space and power only.
- **VRRP / HSRP / GLBP purpose?** Gateway redundancy.
- **UPS provides?** Short-term battery bridging for power outage.
- **Fire suppression class for electrical?** Class C (and clean agents like FM-200 for data centers).

### Wireless

- **Broken wireless standard?** WEP.
- **Current best personal Wi-Fi standard?** WPA3.
- **Strongest EAP method?** EAP-TLS (mutual certificates).
- **WPS vulnerability?** PIN brute-force (Pixie Dust).
- **Deauth-attack defense?** 802.11w PMF (Protected Management Frames).
- **Rogue AP detection?** WIDS (or WIPS for active response).
- **Evil Twin?** Rogue AP with same SSID as legitimate.
- **KARMA attack?** Rogue AP responding to any probe request with any SSID.
- **Bluejacking vs Bluesnarfing?** Jacking sends unsolicited messages; snarfing steals data.
- **BlueBorne?** 2017 Bluetooth stack RCE vulnerability.
- **WPA2 4-way handshake attack?** KRACK.

---

## Cross-references

- **[CompTIA Security+ Study Guide SY0-401, 6e](../references/CompTIA%20Security%2B%20Study%20Guide%20SY0-401%206th%20Ed%20%28Dulaney%29.pdf)** — text on disk.
- **[CompTIA Security+ SY0-701 exam objectives](https://www.comptia.org/certifications/security)** — current revision (SY0-401 is retired in current cycle; Bib still references).
- **[NIST SP 800-34 Rev 1](https://csrc.nist.gov/publications/detail/sp/800-34/rev-1/final)** — Contingency Planning.
- **[NIST SP 800-53 Rev 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)** — Security and Privacy Controls.
- `BOOK-CISSP.md` · `BOOK-CWNA.md` · `BOOK-CCNA.md` · `BOOK-CYBER-OPS.md`.
