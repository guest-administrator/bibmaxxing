# Bib Study Guide — Network Intrusion Detection (Northcutt, Novak) 3rd Edition

> **Bib reference:** *Network Intrusion Detection*, 3rd Edition — Stephen Northcutt, Judy Novak (New Riders, 2002, ISBN 0-7357-1265-4).
>
> **Regular-exam scope:** Chapters 12, 14; study topics on stimulus and response.
> **Substitute-exam scope:** Chapters 1, 6, 13; Snort rule anatomy; study topics on packet dissection using tcpdump.
> **Union — what this guide covers:** Ch 1 (IDS fundamentals + stimulus/response), Ch 6 (**tcpdump and packet dissection**), Ch 12 (Writing Snort rules — anatomy), Ch 13 (Intrusion-detection analysis approaches), Ch 14 (Mystery traffic and unusual scenarios).

**Posture:** Northcutt/Novak is the classic foundational IDS text. Methodology-heavy; decades-old tools (older Snort, older tcpdump) but concepts are still exam-canon. Pairs with `JCAC-PROTOCOL-ANALYSIS.md` (modern Wireshark/tcpdump detail) and `JCAC-NETWORKING.md` §30 (security devices).

---

## Ch 1 — Introduction to Network Intrusion Detection + Stimulus & Response

### Why IDS

An **Intrusion Detection System** watches network and/or host activity for signs of attack. Complementary to firewalls:

- **Firewall** — enforces an access-control policy; blocks what's disallowed.
- **IDS** — sees what's traversing and flags suspicious patterns; typically doesn't block.
- **IPS (Intrusion Prevention System)** — IDS that blocks in-line.

### Network vs Host IDS

| | NIDS | HIDS |
|---|---|---|
| Sensor location | Mirror port / SPAN / TAP / in-line | On each host |
| Visibility | Network traffic | Filesystem, logs, syscalls, processes |
| Evasion surface | Fragmentation, TTL, encryption | Local privileges, log wiping |
| Examples | Snort, Suricata, Zeek | OSSEC, Wazuh, Tripwire, auditd |

### Detection methodologies

- **Signature-based** — match known patterns. Low false-positive for known attacks; blind to novel.
- **Anomaly-based** — baseline + deviation alert. Catches novel attacks; higher false positives.
- **Stateful-protocol** — detect protocol-spec violations (bad handshake, malformed headers).
- **Heuristic** — rules plus statistics (e.g., N failed logins in M minutes).

### Stimulus and response — Northcutt's core framework

Every network interaction is a **stimulus → response** pair. IDS analysis reduces to: "what stimulus provoked this response, and does the response shape match expected behavior?"

**Normal stimulus-response pairs:**

| Stimulus | Expected response |
|---|---|
| TCP SYN to open port | SYN-ACK |
| TCP SYN to closed port | RST-ACK |
| UDP to open port | (no response — or application reply) |
| UDP to closed port | ICMP Port Unreachable (Type 3 Code 3) |
| ICMP Echo Request | Echo Reply (if allowed) |
| DNS query | DNS response (A, AAAA, etc.) |
| ARP Request | ARP Reply (from owner) |

**Anomalous pairings** are red flags:

- SYN to an "always-closed" port answered with SYN-ACK → **backdoor listener**.
- ICMP Echo Reply with no preceding Request → **covert channel** or **spoofing**.
- RST out of the blue → **RST-injection attack** (TCP reset attack).
- ARP Reply without Request → **gratuitous ARP** (could be legitimate announcement or **spoofing**).
- DNS response with no matching query in the resolver's cache → **cache poisoning**.
- TCP handshake completes then FIN immediately → **port-scan reconnaissance**.

### Key detection concepts

- **Baseline** — what normal looks like on this network, at this hour, for this protocol.
- **False positive** — alert on benign activity.
- **False negative** — miss on malicious activity.
- **Sensitivity vs specificity** — sliding scale; tune based on operational cost of each.
- **Signal-to-noise ratio** — aspirational goal: most alerts indicate real attacks.
- **Alerting vs alarming** — levels of analyst attention.

### IDS architecture

Sensor → preprocessor → detection engine → logger → analyst console:

```
Traffic ─→ Sensor (libpcap / AF_PACKET / DPDK)
         │
         ▼
       Preprocessor (reassembly, normalization, decoding)
         │
         ▼
       Detection engine (signature match / stateful / heuristic)
         │
         ▼
       Output plugins (syslog, JSON, SIEM, email, blocking)
```

---

## Ch 6 — tcpdump and Packet Dissection

tcpdump is the canonical CLI packet capturer. Northcutt's book predates Wireshark's dominance, so the text leans heavily on tcpdump literacy.

### Invocation basics

```
tcpdump -i eth0                      # capture on interface
tcpdump -i eth0 -w capture.pcap      # write to pcap
tcpdump -r capture.pcap              # read from pcap
tcpdump -c 100                       # stop after 100 packets
tcpdump -n                           # no DNS resolution (faster)
tcpdump -nn                          # also no port-name lookup
tcpdump -v / -vv / -vvv              # verbose levels
tcpdump -s 0                         # snaplen — full packet
tcpdump -X                           # hex + ASCII of packet data
tcpdump -A                           # ASCII-only (text protocols)
tcpdump -e                           # include link-layer headers
tcpdump -tttt                        # full readable timestamps
tcpdump -q                           # quiet one-line output
tcpdump -G 3600 -W 24 -w cap%H.pcap  # rotate hourly, 24 files
```

### BPF — Berkeley Packet Filter

Primitives:

| Primitive | Matches |
|---|---|
| `host <ip>` | src or dst IP |
| `src host <ip>` / `dst host <ip>` | specific direction |
| `net <cidr>` | CIDR |
| `port <n>` | src or dst port |
| `src port` / `dst port` | specific direction |
| `portrange <lo>-<hi>` | range |
| `proto tcp\|udp\|icmp\|ipv6` | protocol |
| `ether src\|dst <mac>` | MAC address |
| `vlan <id>` | VLAN-tagged |

Combinators: `and`, `or`, `not`, parentheses.

```
tcpdump -i eth0 'host 10.0.0.5 and port 443'
tcpdump -i eth0 'tcp port 22 and not src host 10.0.0.10'
tcpdump -i eth0 '(src net 10.0.0.0/24 and dst port 80) or icmp'
tcpdump -i eth0 'tcp[tcpflags] & (tcp-syn|tcp-fin) != 0'
tcpdump -i eth0 'tcp[13] = 2'        # SYN-only (13 = flags byte offset; 2 = SYN bit)
tcpdump -i eth0 'icmp[icmptype] == icmp-echo'
tcpdump -i eth0 'arp'
```

### Reading tcpdump output

Default format for a TCP packet:

```
13:45:12.123456 IP 10.0.0.5.54321 > 93.184.216.34.443: Flags [S], seq 1234567890, win 65535, options [mss 1460,sackOK,...], length 0
```

Fields:

- **Timestamp** `HH:MM:SS.microseconds`.
- **L3 protocol** — `IP` / `IP6` / `ARP` / `STP`.
- **src.port > dst.port** — arrow shows direction.
- **Flags** — `[S]` SYN, `[S.]` SYN-ACK, `[.]` ACK, `[P.]` PSH-ACK, `[F.]` FIN-ACK, `[R]` RST.
- **seq** — sequence number.
- **win** — receive window.
- **options** — MSS, SACK, timestamps, window-scale.
- **length** — payload bytes (excluding headers).

For UDP:

```
14:00:05.112233 IP 10.0.0.5.55555 > 8.8.8.8.53: 12345+ A? navy.mil. (30)
```

Fields: source/dest with ports, DNS transaction id (12345) with flags (`+` = RD), question type (A), query name, UDP payload size.

For ICMP:

```
14:01:10.445566 IP 10.0.0.5 > 8.8.8.8: ICMP echo request, id 1234, seq 1, length 64
```

### `tcpdump` for analyst patterns

```
# See who is scanning you
tcpdump -nn 'tcp[tcpflags] == tcp-syn'

# See RSTs (closed ports or tampering)
tcpdump -nn 'tcp[tcpflags] & tcp-rst != 0'

# See fragmented IP traffic
tcpdump -nn 'ip[6] & 0x20 != 0 or ip[6:2] & 0x1fff != 0'

# Capture only packets containing HTTP GET
tcpdump -A -s 0 'tcp port 80 and tcp[((tcp[12]&0xf0)>>2):4] = 0x47455420'

# Capture DNS queries only
tcpdump -nn 'udp port 53 and udp[10] & 0x80 = 0'
```

### Packet offsets cheatsheet (for BPF byte-level)

| Protocol | Useful offsets |
|---|---|
| IPv4 | `ip[0]` version+IHL; `ip[8]` TTL; `ip[9]` proto; `ip[12:4]` src IP; `ip[16:4]` dst IP |
| TCP | `tcp[0:2]` src port; `tcp[2:2]` dst port; `tcp[13]` flags byte; `((tcp[12]&0xf0)>>2)` header length |
| UDP | `udp[0:2]` src port; `udp[2:2]` dst port; `udp[4:2]` length |
| ICMP | `icmp[0]` type; `icmp[1]` code; `icmp[2:2]` checksum |

### Reassembly gotchas

- **Fragmented packets** — tcpdump shows fragments individually; offset field indicates reassembly order.
- **Truncated captures** (`-s` less than full) — upper-layer dissector may fail silently.
- **Snaplen** default was 68 historically; modern tcpdump defaults to 262144 (full).

---

## Ch 12 — Writing Snort Rules (rule anatomy)

Snort is the open-source NIDS/IPS Northcutt's book prefers. Modern Bib questions still pull from Snort rule syntax.

### Rule structure

```
action proto src_ip src_port direction dst_ip dst_port (options;)
```

Example:

```
alert tcp any any -> $HOME_NET 80 (msg:"WEB-IIS cmd.exe access"; flow:established,to_server; content:"cmd.exe"; nocase; classtype:web-application-attack; sid:1002; rev:7;)
```

### Rule header fields

| Field | Meaning |
|---|---|
| **action** | `alert`, `log`, `pass`, `drop` (IPS), `reject`, `sdrop` |
| **proto** | `tcp`, `udp`, `icmp`, `ip` |
| **src_ip** | IP / CIDR / variable (`$HOME_NET`, `$EXTERNAL_NET`) / `any` |
| **src_port** | Port / range (`1:1024`) / any |
| **direction** | `->` one-way, `<>` bidirectional |
| **dst_ip** | same syntax as src |
| **dst_port** | same |

### Common rule options

| Option | Purpose |
|---|---|
| `msg:"..."` | Alert message |
| `sid:N` | Signature ID — unique |
| `rev:N` | Revision number |
| `classtype:<name>` | Category (e.g., `trojan-activity`, `attempted-admin`) |
| `priority:N` | 1 (highest) to 4 (lowest) |
| `content:"..."` | Payload match (binary-safe, `|...|` hex) |
| `nocase` | Case-insensitive match for previous content |
| `offset:N`, `depth:N` | Match window within payload |
| `distance:N`, `within:N` | Relative positioning after previous content |
| `pcre:"/regex/"` | Perl regex match |
| `flow:<direction>,<state>` | `established`, `to_server`, `to_client`, `stateless` |
| `dsize:N` / `dsize:>N` | Payload size |
| `flags:<flags>` | TCP flags (e.g., `S` SYN only, `SA` SYN+ACK, `+` plus others allowed) |
| `itype:N`, `icode:N` | ICMP type / code |
| `reference:<system>,<id>` | External reference (CVE, Bugtraq) |

### Writing a rule — worked example

Detect inbound SYN scans to SMB port 445:

```
alert tcp $EXTERNAL_NET any -> $HOME_NET 445 (msg:"Inbound SYN to SMB"; flags:S; threshold:type both,track by_src,count 5,seconds 60; classtype:attempted-recon; sid:1000001; rev:1;)
```

Detect a specific HTTP user agent (legacy Mimikatz-style):

```
alert tcp $HOME_NET any -> $EXTERNAL_NET 80 (msg:"Suspicious UA"; flow:to_server,established; content:"User-Agent|3a 20|mimikatz"; nocase; sid:1000002; rev:1;)
```

### Rule performance tips

- **Put unique, specific `content` first** — Snort's fast-pattern matcher skips packets that don't contain the longest content.
- **Anchor with `offset` / `depth`** — narrows search window.
- **Avoid broad `pcre` without a `content` pre-filter** — slow.
- **Use `flow:established`** for stateful context — cheap and dramatically reduces false positives.
- **Use `threshold` / `suppress`** for noisy rules.

### Rule-management ecosystem

- **Sourcefire VRT / Talos rules** — commercial + community.
- **Emerging Threats Open (ET Open)** — free community.
- **Pulledpork** — rule updater.
- Modern alternatives: **Suricata** (multi-threaded, similar syntax), **Zeek** (behavior-oriented language, not signature-based).

---

## Ch 13 — Intrusion-Detection Analysis

### Analyst workflow

1. **Alert** generated by sensor.
2. **Triage** — is the alert real / actionable / already-known?
3. **Investigate** — pull full-packet PCAP, correlate with host logs, threat-intel.
4. **Escalate** — to IR / hunt / leadership as appropriate.
5. **Respond** — block, quarantine, reimage, credential rotation.
6. **Document** — case notes, IOCs, lessons learned.

### Correlation

A single alert rarely tells the full story. Join alerts with:

- **Flow records** (NetFlow / IPFIX) — 5-tuple + byte/packet counts per flow.
- **Endpoint telemetry** (EDR process tree, Sysmon events).
- **Auth logs** (Kerberos, LDAP, SSH).
- **DNS logs** (resolver history — which hosts asked for which names).
- **Threat intel** (IOC matches — C2 infra, known-bad IPs/domains/hashes).

### Triage heuristics Northcutt emphasizes

- **Direction** — inbound from Internet vs outbound from internal host (outbound often worse — something inside is compromised).
- **Frequency** — singleton vs sustained — sustained more concerning.
- **Protocol on non-standard port** — SSH on port 4443 could be benign admin or tunneling.
- **Beacon cadence** — regular intervals (300 s, 3600 s, 86400 s) suggest automated C2.
- **Entropy** — high-entropy payloads (compressed/encrypted) where cleartext expected → suspicious.

### False-positive management

- **Tuning** — suppress or tighten noisy rules.
- **Baseline whitelisting** — "this host always scans, it's our scanner" — document, not just ignore.
- **Rule revision** — write a tighter follow-up rule that covers the same attack without the false positives.

### Incident-response workflow

1. **Preparation** — tooling ready, playbooks, contacts, legal/Comms prep.
2. **Identification** — detection of an incident via alert or report.
3. **Containment** — short-term (isolate host) + long-term (network segmentation).
4. **Eradication** — remove attacker access, close vulnerabilities.
5. **Recovery** — restore services.
6. **Lessons learned** — document, update processes and detections.

---

## Ch 14 — Mystery traffic and unusual scenarios

Northcutt's analyst horror-stories chapter. The point: every analyst eventually sees something that doesn't fit any signature.

### Classic "what is this" scenarios

- **IP with Protocol = 0** (reserved) — not normal; could be a crafted packet or OS fingerprint probe.
- **TTL that doesn't match the source's expected OS** — could be spoof, proxy, or VPN egress.
- **ICMP with oversized payload** — possible covert channel (ping tunnel).
- **TCP SYN with reserved bit set** — OS fingerprinting (nmap `-O`).
- **Xmas tree packets** (FIN + URG + PSH) — stealth scan attempt.
- **TCP with SYN + FIN both set** — invalid; scanner or malformed stack.
- **Private source IP from the Internet** — RFC 1918 spoofing; drop at ingress (BCP 38).
- **Source = destination** — LAND attack (old; modern stacks immune but sensors alert).
- **Broadcast source address** — broken stack or crafted.
- **Fragments that never complete** — fragmentation-attack or DoS.
- **ARP for own IP** — gratuitous, announcing move; could also be duplicate-IP hunt or MITM setup.

### Investigative posture

- Capture everything about the event.
- Preserve a PCAP with sufficient `-s 0` coverage.
- Pull endpoint telemetry.
- Check threat-intel for IOC hits.
- Form a hypothesis; test via follow-up queries.
- Document; feed back into detection engineering.

### Mystery traffic → new signature workflow

1. Capture and analyze.
2. Identify **unique, reliable, and specific** features (a header byte sequence, a payload string, a TLS JA3).
3. Write a signature; test against normal traffic for false positives.
4. Tune thresholds.
5. Deploy + monitor.

---

## Cross-book connections

- tcpdump and display filters ↔ `JCAC-PROTOCOL-ANALYSIS.md` §3.
- Ethernet/IP/TCP header layouts ↔ `JCAC-PROTOCOL-ANALYSIS.md` §4–§6 · `BOOK-TCPIP-GUIDE.md`.
- Snort rules ↔ Snort Cookbook (Bib-listed separately on Substitute, needs-user) · `JCAC-NETWORKING.md` §30.
- Stimulus / response concept ↔ `JCAC-NETWORKING.md` §17 (ICMP) + §18 (TCP/UDP).
- Incident response ↔ `CJCSM-6510.01B.md` (Cyber Incident Handling Program) · `DJSIG.md`.

---

## Exam-testable concepts (rapid-fire)

### Ch 1 — Fundamentals

- **Two primary IDS categories?** Network-based (NIDS) and Host-based (HIDS).
- **Three detection methodologies?** Signature-based, anomaly-based, stateful-protocol.
- **What does an IPS do that an IDS doesn't?** Block in-line.
- **Firewall vs IDS?** Firewall enforces policy; IDS detects and alerts on traffic.
- **False positive?** Alert on benign activity. **False negative?** Missed malicious activity.
- **Stimulus-response example — SYN to closed port?** RST-ACK.
- **Stimulus-response example — UDP to closed port?** ICMP Port Unreachable (Type 3 Code 3).
- **ARP reply without request?** Gratuitous ARP — could be announcement or spoofing.

### Ch 6 — tcpdump

- **Flag to suppress DNS resolution?** `-n`. Also suppress port-name lookup? `-nn`.
- **Flag to write a pcap?** `-w`. Read a pcap? `-r`.
- **Flag for hex + ASCII output?** `-X`.
- **Flag to set snaplen?** `-s`.
- **BPF to capture only SYN packets?** `'tcp[tcpflags] & tcp-syn != 0'` or `'tcp[13] = 2'`.
- **BPF for ICMP only?** `'icmp'`.
- **BPF for both directions of port 443 on host 1.2.3.4?** `'host 1.2.3.4 and port 443'`.
- **TCP flag byte offset?** 13.
- **TCP flags value for SYN?** 0x02. SYN+ACK? 0x12. RST? 0x04. FIN? 0x01.
- **IP header TTL offset?** 8. Protocol offset? 9.

### Ch 12 — Snort rule anatomy

- **Rule action types?** alert, log, pass, drop (IPS), reject, sdrop.
- **What does `sid:` mean?** Signature ID — unique identifier.
- **What does `rev:` mean?** Revision number.
- **`flags:S` matches what?** SYN only (no other flags).
- **`flow:established,to_server` matches?** Established TCP conversation, packet going client→server.
- **`content:"..."` is?** Payload match (literal or `|hex|`).
- **`nocase` does?** Case-insensitive content match.
- **`pcre:` does?** Perl-compatible regex match.
- **Performance tip — longest content first?** Fast-pattern matcher uses it to skip packets.
- **Rule-management tool?** PulledPork.
- **Modern Snort alternative (multi-threaded, similar syntax)?** Suricata.

### Ch 13 — Analysis

- **Steps of IR (Northcutt / NIST)?** Preparation, Identification, Containment, Eradication, Recovery, Lessons Learned.
- **Beacon cadence suggests?** Automated C2 check-in.
- **Inbound vs outbound in alert triage?** Outbound often worse — means something inside is compromised.
- **False-positive-management approach?** Tune, whitelist, or rewrite the rule to be tighter.
- **Why NetFlow / IPFIX helpful alongside PCAP?** Cheap aggregated view across long time windows; PCAPs are large and short-lived.

### Ch 14 — Mystery Traffic

- **Packet with SYN+FIN both set?** Invalid — scanner or malformed stack.
- **Xmas-tree packet?** FIN+URG+PSH set — stealth scan.
- **Private source IP from Internet?** RFC 1918 spoofing — drop at ingress per BCP 38.
- **LAND attack?** src = dst; historical DoS; modern stacks immune.
- **Oversized ICMP payload?** Possible covert-channel / ping-tunnel.
- **TTL mismatch vs expected OS fingerprint?** Spoofing / proxy / VPN.

---

## Cross-references

- **[Network Intrusion Detection, 3rd Edition](../references/Network%20Intrusion%20Detection,%20Third%20Edition-0735712654.pdf)** — text on disk.
- **[Snort Users Manual](https://www.snort.org/documents)** — current Snort 3 documentation.
- **[Suricata documentation](https://suricata.io/documentation/)** — modern alternative.
- **[Zeek Documentation](https://docs.zeek.org/)** — behavior-oriented NSM.
- **[tcpdump man page](https://www.tcpdump.org/manpages/tcpdump.1.html)** · **[pcap-filter syntax](https://www.tcpdump.org/manpages/pcap-filter.7.html)**.
- **[Emerging Threats rules](https://rules.emergingthreatspro.com/)** — free rule feeds.
- `JCAC-PROTOCOL-ANALYSIS.md` — Wireshark-centric modern packet analysis.
- `JCAC-NETWORKING.md` §30 (Security Devices).
- `CJCSM-6510.01B.md` · `DJSIG.md` · `CFCOE-V4.1.md` — doctrine on cyber incident handling.
