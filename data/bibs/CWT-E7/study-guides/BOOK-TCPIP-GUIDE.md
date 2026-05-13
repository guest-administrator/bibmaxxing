# Bib Study Guide — The TCP/IP Guide (Kozierok)

> **Bib reference:** *The TCP/IP Guide: A Comprehensive, Illustrated Internet Protocols Reference* (Charles M. Kozierok, No Starch Press, ISBN 978-1-59327-047-6, 2005). ~1,616 pages.
>
> **Regular-exam scope:** Chapters 3, 55, 70, 73.
> **Substitute-exam scope:** Study topics on IP-related feature protocols.
> **Union — what this guide covers:** §Ch 3 (OSI Reference Model), §Ch 55-band (DNS — Name Services), §Ch 70-band (HTTP / World Wide Web), §Ch 73-band (email protocols), and the **IP-related feature protocols family** — ICMP / ARP / RARP / NDP / DHCP / IGMP / Mobile IP / IPsec.

**Posture:** Kozierok is an encyclopedic reference, not a narrative text. The chapter numbers in the Bib line up with topical sections of the Guide rather than discrete textbook chapters. This study guide tracks the **topics** Kozierok presents in those chapter bands and pairs with `JCAC-NETWORKING.md` (Module 6 + 10 conceptual coverage) + `JCAC-PROTOCOL-ANALYSIS.md` (Module 11 packet-byte detail).

> **Note on exact chapter mapping:** if your edition of the PDF has slightly different chapter numbering than the Bib expects, focus on the topical coverage below — the exam questions are drawn from the topics, not from "page-number lookups."

---

## Chapter 3 — The OSI Reference Model

### Why OSI matters for TCP/IP students

The ISO OSI model is the **conceptual scaffolding** everyone learns even though the Internet runs TCP/IP. The model lets you classify protocols, debug across layers, and communicate with other engineers using a shared vocabulary.

![Kozierok OSI layers](images/tcpip-guide/osi-layers.png)
*Kozierok Figure 3-1 — OSI Reference Model seven-layer stack*

### The seven layers

| # | Layer | Function | Data unit | Protocols (examples) |
|---|---|---|---|---|
| **7** | Application | User interface to the network; application-specific services | Data | HTTP, FTP, SMTP, DNS, SSH, LDAP, SNMP |
| **6** | Presentation | Syntax, encoding, encryption, compression | Data | TLS (partial), MIME, ASCII, JPEG |
| **5** | Session | Sessions and dialog control between endpoints | Data | NetBIOS, RPC, SIP, L2TP |
| **4** | Transport | End-to-end delivery, reliability, flow control | Segment (TCP) / Datagram (UDP) | TCP, UDP, SCTP |
| **3** | Network | Logical addressing, routing | Packet | IP, ICMP, IPsec, routing protocols |
| **2** | Data Link | Framing, physical addressing, media access | Frame | Ethernet, PPP, HDLC, ARP |
| **1** | Physical | Bits on the medium | Bit | Cables, connectors, radio, modulation |

### Mnemonics

- **Top-down:** All People Seem To Need Data Processing.
- **Bottom-up:** Please Do Not Throw Sausage Pizza Away.

### Encapsulation and decapsulation

![Kozierok data encapsulation](images/tcpip-guide/osi-encapsulation.png)
*Kozierok Figure 3-5 — Data encapsulation through OSI layers*

Each layer adds its own header (and sometimes trailer) to the data it receives from the layer above. On the receiving side, each layer strips its header and passes the payload up.

```
Application data
   + Transport header (TCP/UDP) → Segment/Datagram
      + Network header (IP) → Packet
         + Data-Link header + trailer (Ethernet) → Frame
            + Physical encoding → Bits on wire
```

### OSI versus TCP/IP model

![Kozierok OSI vs TCP/IP model](images/tcpip-guide/tcpip-vs-osi.png)
*Kozierok Figure 3-7 — OSI layers mapped to the TCP/IP model*

| OSI layer | TCP/IP layer | Notes |
|---|---|---|
| 7 Application | Application | HTTP, DNS, etc. |
| 6 Presentation | Application | |
| 5 Session | Application | |
| 4 Transport | Transport | TCP, UDP |
| 3 Network | Internet | IP, ICMP |
| 2 Data Link | Link / Network Access | Ethernet, Wi-Fi, PPP |
| 1 Physical | Link / Network Access | Cables, radios |

TCP/IP collapses OSI layers 1-2 into one (Link / Network Access) and 5-7 into one (Application).

### Service primitives and OSI terminology

OSI defines generic **service primitives** between layers: Request, Indication, Response, Confirm. Rarely seen in practice but still in exam questions.

### Connection-oriented vs connectionless service

- **Connection-oriented** — handshake → data → teardown (TCP, RFC 793; SCTP).
- **Connectionless** — just send (UDP, IP itself, Ethernet). No guaranteed delivery, no ordering.

### Protocols that span multiple layers

Some protocols straddle layers cleanly; textbooks disagree about exact placement:

- **ARP** — usually placed at L2/L3 boundary (it maps L3 IP to L2 MAC).
- **ICMP** — usually placed at L3 even though it's the "control" sidekick of IP.
- **TLS** — L5/L6 from an OSI purist's lens; practitioners treat it as "just above L4."
- **MPLS** — often called "Layer 2.5" because it sits between L2 and L3.

---

## Chapter 55 band — DNS (Name Services)

Kozierok's DNS coverage is thorough — anatomy of the protocol, all record types, message format, resolver behavior, server types, and failure modes.

### Why DNS exists

Humans remember `navy.mil` but routers route on `IP addresses`. DNS translates names to addresses (and metadata — mail handlers, service records, crypto attestations).

### Hierarchy

```
               . (root)
            /    |       \
         .mil  .com    .gov
         /
       .navy.mil
         /    \
      www   mail
```

- **Root zone** — the 13 root-server clusters (A–M), each a single anycast IP.
- **TLDs (Top-Level Domains)** — `.mil`, `.gov`, `.com`, country codes (`.uk`, `.de`).
- **Second-level domains** — `navy.mil`, `example.com`.
- **Subdomains** — `www.navy.mil`.

### Name-server roles

| Role | Purpose |
|---|---|
| **Authoritative** | Holds the definitive records for a zone |
| **Primary / Master** | The authoritative server writes are applied to |
| **Secondary / Slave** | Copy of the primary; zone-transferred periodically |
| **Recursive / Caching resolver** | Performs the whole lookup on behalf of a client; caches answers |
| **Forwarder** | Hands off queries it can't answer to another resolver (instead of going to roots) |
| **Stub resolver** | Minimal client-side resolver (OS libc) that relies on a recursive upstream |

### Resolution — recursive vs iterative

- **Recursive query** — "Give me the final answer, chase all referrals for me." Client → local resolver.
- **Iterative query** — "Give me the best answer you have; I'll chase referrals myself." Local resolver → root → TLD → authoritative.

### Message format

```
+---------------------+
|       Header        |  12 bytes (transaction ID, flags, counts)
+---------------------+
|     Question        |  one or more (normally just one)
+---------------------+
|     Answer          |  zero or more RRs
+---------------------+
|     Authority       |  zero or more RRs
+---------------------+
|     Additional      |  zero or more RRs (glue, hints)
+---------------------+
```

Header flags of note:

- **QR** — 0 = query, 1 = response.
- **Opcode** — 0 standard, 4 notify, 5 update.
- **AA** — authoritative answer flag.
- **TC** — truncated (retry over TCP).
- **RD** — recursion desired (set by client).
- **RA** — recursion available (set by server).
- **AD / CD** — DNSSEC authentication-data / checking-disabled.
- **RCODE** — 0 NOERROR, 1 FormErr, 2 ServFail, 3 NXDOMAIN, 4 NotImp, 5 Refused.

### Resource record types

| Type | Purpose |
|---|---|
| **A** | IPv4 address |
| **AAAA** | IPv6 address |
| **CNAME** | Canonical name (alias → another name) |
| **NS** | Name server for a zone |
| **MX** | Mail exchange with priority |
| **PTR** | Reverse lookup (IP → name) |
| **SOA** | Start of Authority (zone serial, refresh, retry, expire, minimum TTL) |
| **TXT** | Free text (SPF, DKIM, ownership tokens) |
| **SRV** | Service location (`_ldap._tcp.example.com` → host:port) |
| **CAA** | Authorized CAs for the zone |
| **DNSKEY / DS / RRSIG / NSEC / NSEC3** | DNSSEC |

### Transport

- **UDP/53** — default for queries/responses.
- **TCP/53** — responses >512 bytes; zone transfers (AXFR/IXFR); large DNSSEC replies; QUERY fallback when TC=1.
- **DNS over TLS (DoT)** — TCP/853.
- **DNS over HTTPS (DoH)** — TCP/443.
- **DNS over QUIC (DoQ)** — UDP/853.

### Zone transfers

- **AXFR** — full zone transfer; TCP/53.
- **IXFR** — incremental transfer (by SOA serial); TCP/53.
- **NOTIFY** — master informs slaves of updates.
- Secondaries initiate transfers per SOA refresh interval; retry timer on failure; expire timer on prolonged failure.

### Caching and TTLs

Every record carries a TTL in seconds. Resolvers cache positive answers for TTL; negative caching (RFC 2308) caches NXDOMAIN for the zone's minimum TTL (SOA `MINIMUM` field).

### Attack surface

- **Cache poisoning (Kaminsky)** — race a spoofed response into a recursive resolver's cache. Mitigation: source-port randomization, 0x20-bit encoding, DNSSEC.
- **DNS tunneling** — encode data in TXT / CNAME / long subdomain labels. C2 or exfiltration channel.
- **DDoS amplification** — spoofed source + small query + huge response (ANY, DNSKEY). Mitigation: response-rate limiting (RRL), closed resolvers.
- **Subdomain takeover** — orphaned CNAME pointing at a freed cloud resource.
- **DGA (Domain Generation Algorithm)** malware — queries pseudorandom names; most NXDOMAIN; one hits.

### DNSSEC highlights

- **DNSKEY** — zone's public key.
- **RRSIG** — signature over each RR set, by the zone's ZSK.
- **DS (Delegation Signer)** — hash of a child zone's KSK, held in the parent. Builds chain of trust up to the root KSK (signed into the DNS root).
- **NSEC / NSEC3** — authenticated denial of existence.
- `AD` flag set in response if resolver validated the chain.

---

## Chapter 70 band — HTTP and the World Wide Web

Kozierok treats WWW as a Use Case for HTTP — covering URIs, request/response syntax, headers, methods, status codes, caching, cookies, and the HTTPS transition.

### Uniform Resource Locators

```
scheme://[user:pass@]host[:port]/path[?query][#fragment]
```

Examples:

```
https://www.navy.mil/
https://www.example.com:8443/api/v1/ships?type=cruiser
ftp://user:pass@files.example.com/pub/
mailto:admin@example.com
```

### HTTP request / response

Request:

```
GET /index.html HTTP/1.1
Host: www.example.com
User-Agent: Mozilla/5.0 ...
Accept: text/html
Accept-Encoding: gzip, br

```

Response:

```
HTTP/1.1 200 OK
Date: Thu, 23 Apr 2026 12:00:00 GMT
Server: nginx
Content-Type: text/html; charset=utf-8
Content-Length: 1234

<html>...</html>
```

### HTTP methods

| Method | Purpose | Idempotent? | Safe? |
|---|---|---|---|
| **GET** | Retrieve | yes | yes |
| **HEAD** | Like GET, headers only | yes | yes |
| **POST** | Submit data; may create | no | no |
| **PUT** | Create or replace | yes | no |
| **DELETE** | Remove | yes | no |
| **PATCH** | Partial update | no | no |
| **OPTIONS** | Capabilities | yes | yes |
| **TRACE** | Diagnostic loopback | yes | yes |
| **CONNECT** | Tunnel (HTTPS through proxy) | n/a | n/a |

### Status codes

- 1xx — **Informational**: 100 Continue, 101 Switching Protocols.
- 2xx — **Success**: 200 OK, 201 Created, 204 No Content, 206 Partial Content.
- 3xx — **Redirection**: 301 Moved Permanently, 302 Found, 304 Not Modified, 307 Temp Redirect, 308 Perm Redirect.
- 4xx — **Client error**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 405 Method Not Allowed, 429 Too Many Requests.
- 5xx — **Server error**: 500 Internal, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout.

### Headers

Key request headers: `Host`, `User-Agent`, `Accept`, `Accept-Language`, `Accept-Encoding`, `Referer` (misspelled since 1996), `Cookie`, `Authorization`, `If-Modified-Since`, `If-None-Match`, `Range`.

Key response headers: `Date`, `Server`, `Content-Type`, `Content-Length`, `Content-Encoding`, `Set-Cookie`, `Location`, `Cache-Control`, `ETag`, `Last-Modified`, `Vary`, `Strict-Transport-Security` (HSTS), `Content-Security-Policy` (CSP), `X-Frame-Options`, `X-Content-Type-Options: nosniff`.

### Persistent connections

HTTP/1.0 — one request per connection (slow). HTTP/1.1 — persistent by default; `Connection: close` opts out. Enables pipelining and reuse.

### Caching

Controlled by `Cache-Control`:
- `no-store` — don't cache at all.
- `no-cache` — revalidate before use.
- `max-age=N` — cache for N seconds.
- `public` vs `private` — shared proxy caches allowed or not.
- `immutable` — won't change during freshness lifetime.

Conditional GET:
- `If-Modified-Since: <date>` + server `Last-Modified` header.
- `If-None-Match: "<etag>"` + server `ETag` header.
- Server returns 304 Not Modified if the cache is still valid.

### Cookies

`Set-Cookie` response header; client sends them back in `Cookie` request header. Attributes:

- `Name=Value`.
- `Expires=<date>` or `Max-Age=<seconds>` (session cookie if neither).
- `Domain=example.com` — which hosts receive it.
- `Path=/api` — which URL paths.
- `Secure` — HTTPS only.
- `HttpOnly` — not readable by JavaScript.
- `SameSite=Strict|Lax|None` — mitigates CSRF.

### HTTPS transition

HTTP over TLS — TCP/443. TLS handshake establishes symmetric session keys; HTTP requests then flow encrypted.

- **HTTP/2 over TLS** — binary framing, multiplexing, HPACK header compression. `Upgrade: h2c` over clear HTTP/1.1 or ALPN over TLS.
- **HTTP/3 over QUIC over UDP** — encrypted by default (QUIC has TLS 1.3 built in). Better loss recovery, faster setup.

---

## Chapter 73 band — Email Protocols (SMTP, POP3, IMAP)

### SMTP — Simple Mail Transfer Protocol

**TCP/25** for server-to-server; **TCP/587** for submission with authentication; **TCP/465** for historical SMTPS (implicit TLS).

Minimal session:

```
S: 220 mail.example.com ESMTP
C: EHLO client.example.com
S: 250-mail.example.com
   250-STARTTLS
   250-AUTH PLAIN LOGIN
   250 SIZE 52428800
C: MAIL FROM:<alice@example.com>
S: 250 OK
C: RCPT TO:<bob@other.com>
S: 250 OK
C: DATA
S: 354 End data with <CRLF>.<CRLF>
C: From: Alice <alice@example.com>
C: To: Bob <bob@other.com>
C: Subject: Test
C:
C: Hello, Bob.
C: .
S: 250 Message accepted for delivery
C: QUIT
S: 221 Bye
```

Anti-abuse mechanisms:

- **SPF (Sender Policy Framework)** — TXT records list authorized senders for a domain.
- **DKIM (DomainKeys Identified Mail)** — cryptographic signature over message headers + body; public key in TXT record.
- **DMARC** — policy aligning SPF + DKIM results with the visible From header; reporting via `rua`/`ruf` URIs.
- **BIMI (Brand Indicators for Message Identification)** — newer, adds a verified logo.

### POP3 — Post Office Protocol v3

**TCP/110** clear; **TCP/995** (POP3S).

Classic model: download every message, delete from server.

Commands: `USER`, `PASS`, `STAT`, `LIST`, `RETR n`, `DELE n`, `RSET`, `QUIT`.

### IMAP4 — Internet Message Access Protocol v4

**TCP/143** clear; **TCP/993** (IMAPS).

Modern model: messages stay on server; folders, search, partial fetch.

Tagged commands:

```
A001 LOGIN alice hunter2
A002 SELECT INBOX
A003 FETCH 1 RFC822
A004 STORE 1 +FLAGS (\Seen)
A005 LOGOUT
```

### MIME

Multi-part message body format — `Content-Type: multipart/mixed; boundary="..."`. Enables attachments, HTML bodies, inline images. Every modern mail client speaks MIME.

---

## IP-related feature protocols (substitute-exam study topic)

Kozierok's "IP-related feature protocols" cluster covers the **helper and control protocols** around IP: ARP, RARP, ICMP, IGMP, NDP, DHCP, Mobile IP, and IPsec.

### ICMP — Internet Control Message Protocol (IPv4)

Protocol 1. 8-byte minimum header.

Types:

| Type | Name | Codes |
|---|---|---|
| 0 | Echo Reply | — |
| 3 | Destination Unreachable | 0 Net, 1 Host, 3 Port, 4 Frag Needed+DF |
| 5 | Redirect | 0 Net, 1 Host |
| 8 | Echo Request | — |
| 11 | Time Exceeded | 0 TTL expired, 1 Frag reassembly |
| 12 | Parameter Problem | — |
| 13/14 | Timestamp Request/Reply | — |

Uses: **ping** (Type 8 → Type 0), **traceroute** (Type 11 TTL-exceeded chain), **PMTU discovery** (Type 3 Code 4).

### ICMPv6

Protocol 58. Merges ICMP's traditional role with **NDP** (Neighbor Discovery) and **MLD** (Multicast Listener Discovery):

| Type | Name |
|---|---|
| 1 | Destination Unreachable |
| 2 | Packet Too Big (PMTU) |
| 3 | Time Exceeded |
| 4 | Parameter Problem |
| 128 | Echo Request |
| 129 | Echo Reply |
| 133 | Router Solicitation |
| 134 | Router Advertisement |
| 135 | Neighbor Solicitation |
| 136 | Neighbor Advertisement |
| 137 | Redirect |
| 143 | MLDv2 Report |

### ARP — Address Resolution Protocol

EtherType `0x0806`. Maps IPv4 → MAC within a broadcast domain.

| Field | Bytes |
|---|---|
| Hardware type | 2 (`0x0001` Ethernet) |
| Protocol type | 2 (`0x0800` IPv4) |
| HW addr len | 1 (6) |
| Proto addr len | 1 (4) |
| Operation | 2 (1=Request, 2=Reply) |
| Sender MAC | 6 |
| Sender IP | 4 |
| Target MAC | 6 (zero in Request) |
| Target IP | 4 |

Sequence: broadcast "Who has x.x.x.x?" → target unicasts reply. Cached ~2–20 min.

### RARP — Reverse ARP

Obsolete. Asked "which IP belongs to this MAC?" Pre-DHCP bootstrap. Replaced by BOOTP → DHCP.

### NDP — Neighbor Discovery Protocol (IPv6)

ICMPv6-based; replaces ARP + ICMPv4 Router-Discovery + Redirect:

- **NS (135)** / **NA (136)** — ARP replacement.
- **RS (133)** / **RA (134)** — router/prefix discovery.
- **Redirect (137)** — router tells host of a better gateway.

### SLAAC — Stateless Address Autoconfiguration

Hosts derive their global IPv6 addresses from router-advertised prefix + interface identifier (EUI-64 or privacy-extended randomized). No DHCP needed.

### DHCP — Dynamic Host Configuration Protocol

**UDP/67** (server), **UDP/68** (client). BOOTP successor.

Four-step DORA:

1. Client broadcasts **DHCPDISCOVER**.
2. Server offers **DHCPOFFER**.
3. Client requests **DHCPREQUEST**.
4. Server acknowledges **DHCPACK** with lease.

Configuration delivered: IP, mask, default gateway, DNS servers, NTP servers, domain name, lease duration, plus vendor options.

**DHCP relay** forwards broadcasts across routers (DHCP broadcasts are link-local by default).

**DHCPv6** — UDP/546 (client), UDP/547 (server/relay). Either stateful (hands out addresses + options) or stateless (options only, addresses via SLAAC).

### IGMP — Internet Group Management Protocol

Protocol 2. Hosts register multicast-group membership with the local router.

- IGMPv1: basic membership.
- IGMPv2: leave messages.
- IGMPv3: source-specific multicast (SSM).

IPv6 equivalent: **MLD** over ICMPv6.

### Mobile IP

Allows a host to move between networks while keeping its **home address**.

- **Home agent** — router on home network; intercepts packets destined to the mobile's home address, tunnels them to the **care-of address** where the mobile currently is.
- **Foreign agent** — router on visited network that may provide care-of address.
- Triangular routing issue → **route optimization** (correspondent caches the care-of address).

### IPsec

Network-layer security. Provides authenticity, integrity, and (optionally) confidentiality. Works with IPv4 and IPv6 (native in v6).

**Two protocols:**

| Protocol | Purpose | Proto # |
|---|---|---|
| **AH** (Authentication Header) | Authentication + integrity (no confidentiality) | 51 |
| **ESP** (Encapsulating Security Payload) | Confidentiality + optional auth/integrity | 50 |

**Two modes:**

- **Transport mode** — only the payload is protected; original IP header preserved. End-to-end between hosts.
- **Tunnel mode** — entire original packet encapsulated; new outer IP header. Gateway-to-gateway VPN.

**IKE (Internet Key Exchange)** negotiates **Security Associations (SAs)**:

- **Phase 1 (IKE SA)** — authenticate peers, establish secure channel. Main Mode (identity-protected) or Aggressive Mode.
- **Phase 2 (IPSec SAs)** — negotiate AH/ESP SAs.
- **IKEv2** — simplifies, adds mobility / NAT-T, removes Aggressive Mode.

### IP fragmentation (IPv4)

Routers fragment IP packets to fit next-hop MTU:

- **Identification** — per-packet tag shared across all fragments.
- **Flags:** DF (Don't Fragment), MF (More Fragments).
- **Fragment Offset** — in 8-byte units; location within original payload.
- Receiver reassembles by matching (Src, Dst, Proto, Identification).

IPv6 only source-fragments; routers drop oversized packets and reply ICMPv6 Packet Too Big (PMTU discovery).

### IP options

IPv4 has optional trailing options (up to 40 bytes): Record Route, Source Route (Loose / Strict), Timestamp, Router Alert, Security. Largely historical — most routers drop packets with options for security reasons.

### IPv6 extension headers

IPv6 replaces options with extension headers chained via **Next Header**:

| Value | Header |
|---|---|
| 0 | Hop-by-Hop Options |
| 43 | Routing |
| 44 | Fragment |
| 50 | ESP |
| 51 | AH |
| 60 | Destination Options |
| 58 | ICMPv6 (terminates chain) |
| 59 | No next header |

### QoS / DSCP / ECN

The IPv4 ToS byte and IPv6 Traffic Class field are divided into DSCP (6 bits — Differentiated Services Code Point) + ECN (2 bits — Explicit Congestion Notification).

- DSCP: EF (Expedited Forwarding), AF (Assured Forwarding), CS (Class Selector), BE (Best Effort default 0).
- ECN: lets routers mark packets instead of dropping under congestion.

---

## Cross-book connections

- Ch 3 OSI ↔ `JCAC-NETWORKING.md` §8.
- Ch 55-band DNS ↔ `JCAC-NETWORKING.md` §20 · `JCAC-PROTOCOL-ANALYSIS.md` §7 · `JCAC-UNIX-LINUX.md` §15.
- Ch 70-band HTTP ↔ `JCAC-NETWORKING.md` §20 · `JCAC-UNIX-LINUX.md` §17 Apache.
- Ch 73-band SMTP/POP3/IMAP ↔ `JCAC-NETWORKING.md` §20.
- IP-related feature protocols ↔ `JCAC-NETWORKING.md` §11 (ARP), §17 (ICMP), §22 (NAT), §23 (IPv6), §26 (IPSec) · `JCAC-PROTOCOL-ANALYSIS.md` §5.

---

## Exam-testable concepts (rapid-fire)

### From Ch 3 — OSI

- **OSI layer count?** 7.
- **Unit at Layer 2?** Frame. Layer 3? Packet. Layer 4 TCP? Segment. UDP? Datagram.
- **Which OSI layer handles encryption (per purist view)?** 6 (Presentation). (Practical TLS sits between 4 and 5.)
- **TCP/IP collapses which OSI layers?** 5–7 into Application; 1–2 into Link/Network-Access.
- **Connection-oriented vs connectionless Layer-4 protocol?** TCP vs UDP.

### From Ch 55-band — DNS

- **Default DNS transport?** UDP/53.
- **When does DNS use TCP?** Response >512 bytes, zone transfer (AXFR/IXFR), DoT fallback.
- **Query type vs Response type?** QR bit (0 query, 1 response).
- **RCODE 3 means?** NXDOMAIN (name does not exist).
- **TC flag means?** Truncated — retry over TCP.
- **A vs AAAA record?** IPv4 vs IPv6 address.
- **MX record holds?** Mail server hostname + priority (preference).
- **PTR record purpose?** Reverse lookup — IP to name.
- **Zone authority record?** SOA.
- **DNSSEC key record?** DNSKEY. Signature? RRSIG. Chain to parent? DS.
- **Recursive vs iterative?** Recursive = "find the answer for me"; iterative = "give me best you have; I'll chase."
- **NXDOMAIN negative caching duration comes from?** SOA `MINIMUM` field (modernly MIN of MINIMUM and TTL of SOA record).
- **Anycast root servers count?** 13 logical (A–M).

### From Ch 70-band — HTTP / WWW

- **HTTP clear port?** TCP/80. Encrypted? TCP/443.
- **URL scheme for secure web?** `https`.
- **HTTP method that must be idempotent?** GET (and HEAD, PUT, DELETE, OPTIONS).
- **404 means?** Not Found.
- **503 means?** Service Unavailable.
- **301 vs 302?** Permanent vs temporary redirect.
- **HTTP/1.0 vs HTTP/1.1 connection default?** 1.0 closes; 1.1 persistent.
- **HTTP/2 feature that compresses headers?** HPACK.
- **HTTP/3 transport?** QUIC over UDP.
- **Header that forces HTTPS-only?** `Strict-Transport-Security` (HSTS).
- **Header that blocks iframe embedding?** `X-Frame-Options` or CSP `frame-ancestors`.
- **Cookie attribute preventing JavaScript read?** `HttpOnly`.
- **Cookie attribute mitigating CSRF?** `SameSite`.
- **Conditional-GET headers pair?** `If-Modified-Since`/`Last-Modified`; `If-None-Match`/`ETag`.

### From Ch 73-band — Email

- **SMTP server-to-server port?** 25.
- **SMTP submission port with auth?** 587.
- **Legacy SMTPS implicit TLS?** 465.
- **POP3 clear port?** 110. Secure (POP3S)? 995.
- **IMAP clear port?** 143. Secure (IMAPS)? 993.
- **EHLO vs HELO?** EHLO is the ESMTP extended greeting; reveals server capabilities.
- **Sender-policy TXT mechanism?** SPF.
- **Signing mechanism for email bodies/headers?** DKIM.
- **Policy aligning SPF + DKIM with From header?** DMARC.
- **Which protocol keeps mail on the server?** IMAP. Which downloads and (default) deletes? POP3.

### From IP-related feature protocols

- **ICMP Protocol number?** 1. ICMPv6? 58.
- **Ping uses which ICMP type?** 8 request, 0 reply.
- **TTL-exceeded ICMP type?** 11. Code 0 TTL in transit; code 1 frag reassembly.
- **Destination-Unreachable "Fragmentation Needed + DF" code?** 4 within Type 3.
- **ARP EtherType?** `0x0806`. ARP op 1? Request. Op 2? Reply.
- **ARP resolves?** IPv4 → MAC.
- **RARP's modern replacement?** DHCP (via BOOTP).
- **IPv6 equivalent of ARP?** NDP Neighbor Solicitation/Advertisement.
- **SLAAC lets an IPv6 host?** Auto-configure a global address from router-advertised prefix + interface ID.
- **DHCP DORA step order?** Discover, Offer, Request, Ack.
- **DHCP server port?** UDP/67. Client? UDP/68.
- **IGMP purpose?** Register multicast-group membership with local router.
- **IPv6 multicast-membership protocol?** MLD over ICMPv6.
- **IPsec AH protocol number?** 51. ESP? 50.
- **IPsec mode that keeps the original IP header?** Transport.
- **IPsec mode for gateway-to-gateway?** Tunnel.
- **IKE phase 1 establishes?** IKE SA (secure channel for phase-2 negotiation).
- **IP fragmentation in IPv6 performed by?** Source only; routers drop + signal Packet Too Big.
- **DSCP bit count in the ToS byte?** 6. ECN? 2.

---

## Cross-references

- **[The TCP/IP Guide (Kozierok)](../references/TCPIP%20Guide-9781593270476.pdf)** — text on disk.
- **[RFC 791](https://www.rfc-editor.org/rfc/rfc791)** IPv4 · **[RFC 793](https://www.rfc-editor.org/rfc/rfc793)** TCP · **[RFC 768](https://www.rfc-editor.org/rfc/rfc768)** UDP · **[RFC 792](https://www.rfc-editor.org/rfc/rfc792)** ICMP · **[RFC 826](https://www.rfc-editor.org/rfc/rfc826)** ARP.
- **[RFC 8200](https://www.rfc-editor.org/rfc/rfc8200)** IPv6 · **[RFC 4443](https://www.rfc-editor.org/rfc/rfc4443)** ICMPv6 · **[RFC 4861](https://www.rfc-editor.org/rfc/rfc4861)** NDP.
- **[RFC 1034](https://www.rfc-editor.org/rfc/rfc1034)** DNS concepts · **[RFC 1035](https://www.rfc-editor.org/rfc/rfc1035)** DNS implementation.
- **[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110)** HTTP semantics · **[RFC 9112](https://www.rfc-editor.org/rfc/rfc9112)** HTTP/1.1 messaging.
- **[RFC 5321](https://www.rfc-editor.org/rfc/rfc5321)** SMTP · **[RFC 1939](https://www.rfc-editor.org/rfc/rfc1939)** POP3 · **[RFC 9051](https://www.rfc-editor.org/rfc/rfc9051)** IMAP4rev2.
- **[RFC 2131](https://www.rfc-editor.org/rfc/rfc2131)** DHCP · **[RFC 8415](https://www.rfc-editor.org/rfc/rfc8415)** DHCPv6.
- **[RFC 4301](https://www.rfc-editor.org/rfc/rfc4301)** IPsec architecture · **[RFC 7296](https://www.rfc-editor.org/rfc/rfc7296)** IKEv2.
- `JCAC-NETWORKING.md` · `JCAC-PROTOCOL-ANALYSIS.md` · `JCAC-UNIX-LINUX.md` §15 (BIND) · `BOOK-CCNA.md` (coming — enterprise routing/switching).
