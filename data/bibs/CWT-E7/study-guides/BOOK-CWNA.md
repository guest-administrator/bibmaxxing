# Bib Study Guide — CWNA Certified Wireless Network Administrator Study Guide (6th Edition)

> **Bib reference:** *CWNA Certified Wireless Network Administrator Study Guide*, 6th Edition — David D. Coleman, David A. Westcott (Sybex, 2021, ISBN 978-1-119-73450-5).
>
> **Regular-exam scope:** Chapter 1.
> **Substitute-exam scope:** not listed.
> **Union — what this guide covers:** Ch 1 — Overview of Wireless Standards, Organizations, and Fundamentals.

**Posture:** Ch 1 is the wireless-fundamentals primer. This guide captures the standards, regulatory bodies, topologies, and core 802.11 concepts the Bib expects a Chief to recognize. Pairs with `JCAC-NETWORKING.md` §5 (network cabling / medium — wireless section) and security-adjacent `BOOK-CISSP.md` Ch 4 (wireless security).

---

## Wireless standards organizations

Understand which body owns which standard:

| Body | Scope |
|---|---|
| **IEEE (Institute of Electrical and Electronics Engineers)** | 802.11 family, 802.1X, 802.3 Ethernet |
| **Wi-Fi Alliance** | Certification of 802.11 devices; interoperability testing; Wi-Fi 4/5/6/6E/7 branding |
| **IETF** | Protocols riding on 802.11 (IPv4/v6, TCP/UDP, IPsec) |
| **ITU-R** | International radio-frequency allocation |
| **FCC** (US) | US spectrum allocation, DFS rules, ERP limits |
| **ETSI** | European equivalent |
| **ISED** (Canada), **ACMA** (Australia), **TIA** | Regional equivalents |
| **3GPP** | Cellular (LTE, 5G) — parallel wireless universe |

### IEEE 802.11 amendment timeline

| Amendment | Year | Branding | Band | Max PHY rate | Notes |
|---|---|---|---|---|---|
| 802.11 (original) | 1997 | — | 2.4 GHz | 2 Mbps | FHSS/DSSS, IR |
| 802.11a | 1999 | — | 5 GHz | 54 Mbps | OFDM |
| 802.11b | 1999 | — | 2.4 GHz | 11 Mbps | DSSS |
| 802.11g | 2003 | — | 2.4 GHz | 54 Mbps | OFDM (backward compatible with b) |
| 802.11n | 2009 | **Wi-Fi 4** | 2.4 / 5 GHz | 600 Mbps | MIMO, channel bonding |
| 802.11ac | 2013 | **Wi-Fi 5** | 5 GHz | ~6.9 Gbps | MU-MIMO downlink, wider channels, 256-QAM |
| 802.11ax | 2019 | **Wi-Fi 6** / **Wi-Fi 6E** (adds 6 GHz) | 2.4 / 5 / 6 GHz | ~9.6 Gbps | OFDMA, BSS coloring, uplink MU-MIMO |
| 802.11be | 2024 | **Wi-Fi 7** | 2.4 / 5 / 6 GHz | ~46 Gbps | 320 MHz channels, 4K-QAM, MLO |

### Non-Wi-Fi IEEE 802 wireless

- **802.15.1** — Bluetooth.
- **802.15.4** — Zigbee, Thread, 6LoWPAN, WirelessHART (low-power PAN).
- **802.16** — WiMAX (historical metropolitan broadband).
- **802.22** — Wireless Regional Area Networks (TV white space).

---

## RF fundamentals

### Frequencies and bands

- **2.4 GHz ISM** — 2.400–2.4835 GHz. 14 channels (many regions only 11). Crowded; co-exists with Bluetooth, microwave ovens, cordless phones.
- **5 GHz** — multiple UNII bands (UNII-1/2A/2C/3). More channels (25+ in many regions) but shorter range per watt. DFS required on some sub-bands (radar coexistence).
- **6 GHz** — newly-opened (FCC 2020); Wi-Fi 6E / 7. Lots of spectrum, low interference, indoor-power limits.
- **60 GHz** — 802.11ad/ay — very high throughput, very short range.

### Channels

- **Channel width** — 20 MHz default; 40/80/160/320 MHz via channel bonding.
- **2.4 GHz non-overlapping channels** (20 MHz): **1, 6, 11** (only usable set in North America).
- **5 GHz channels** — many; dependent on country regulatory rules.
- **DFS (Dynamic Frequency Selection)** — radar-coexistence requirement on UNII-2A/2C; AP must vacate a channel on radar detection.
- **TPC (Transmit Power Control)** — cooperative transmit-power reduction.

### RF physics basics

- **Wavelength = speed / frequency**. 2.4 GHz ≈ 12.5 cm; 5 GHz ≈ 6 cm.
- **Free-space path loss (FSPL)** — increases with frequency and distance; higher frequencies attenuate faster → shorter range at same power.
- **Absorption** — water, concrete, metal. Metal is a strong reflector; walls dissipate.
- **Reflection / Refraction / Diffraction / Scattering** — multipath effects.
- **Multipath** — signal reaches receiver via multiple paths with phase differences; MIMO exploits this.

### Power measurements

- **dBm** — decibels relative to 1 mW. `0 dBm = 1 mW`; `+10 dBm = 10 mW`; `+20 dBm = 100 mW`; `+30 dBm = 1000 mW = 1 W`.
- **dBi** — antenna gain relative to isotropic radiator.
- **EIRP (Effective Isotropic Radiated Power)** = Tx power (dBm) + antenna gain (dBi) − cable loss (dB).
- **Regulatory limit** on EIRP in many regions (e.g., 36 dBm / 4 W in 2.4 GHz US outdoor).

### Antennas

- **Omnidirectional** — radiates horizontally in 360°; vertical dipole is canonical.
- **Directional** — focuses beam (patch, panel, yagi, parabolic).
- **Sectoral** — directional covering a sector (e.g., 120°).
- **MIMO antennas** — multiple spatially-separated elements for spatial streams.
- **Polarization** — linear (vertical/horizontal) or circular.

---

## WLAN architecture

### Basic building blocks

- **STA (Station)** — any 802.11 device (AP or client).
- **AP (Access Point)** — infrastructure station that bridges wireless to wired.
- **BSS (Basic Service Set)** — one AP + its associated clients.
- **BSSID** — 48-bit MAC of the AP's radio; identifies the BSS.
- **SSID (Service Set Identifier)** — human-readable network name (up to 32 bytes).
- **IBSS** — Independent BSS (ad hoc, no AP).
- **ESS (Extended Service Set)** — multiple APs sharing the same SSID; clients roam between BSSs.
- **DS (Distribution System)** — the wired / logical backbone linking APs.

### Operating modes

- **Infrastructure mode** — clients associate to an AP.
- **Ad-hoc mode** — peer-to-peer (IBSS). Rare in enterprise.
- **Wireless Mesh** — APs form a self-healing topology over wireless backhaul.
- **Wi-Fi Direct** — direct peer-to-peer (printers, displays).
- **Repeater / Range Extender** — re-broadcasts signal; halves throughput on shared radio.

### Association process

A client connects to an AP through four phases:

1. **Scanning** — passive (listen for beacons) or active (probe requests + responses).
2. **Authentication** — open-system or legacy shared-key (WEP). Modern security via 802.1X/EAP happens after association.
3. **Association** — client sends Association Request; AP replies with Association Response.
4. **4-way handshake** (for WPA2/3) — negotiate pairwise keys (PTK) and group keys (GTK).

Beacons are sent ~every 102.4 ms (Beacon Interval 100 TUs, where 1 TU = 1024 μs).

### Frame types

802.11 uses three frame types:

1. **Management frames** — beacon, probe req/resp, auth, association, deauth, disassoc.
2. **Control frames** — RTS, CTS, ACK, BlockAck.
3. **Data frames** — user payload.

Frame header fields: duration, BSSID, source / destination / receiver / transmitter addresses, frame-control flags, QoS control (if QoS enabled).

### Distribution modes

- **DCF (Distributed Coordination Function)** — CSMA/CA (Carrier Sense Multiple Access with Collision Avoidance). The mandatory baseline in 802.11.
- **PCF (Point Coordination Function)** — optional contention-free polling by AP. Rarely implemented; not in 802.11n+.
- **HCF / HCCA (Hybrid Coordination Function / Controlled Channel Access)** — QoS-aware, 802.11e.

### CSMA/CA

Because wireless can't fully detect collisions (the half-duplex radio can't transmit and receive at the same time), 802.11 uses *avoidance*:

1. Listen for carrier (CCA — Clear Channel Assessment).
2. If busy, back off (random exponential backoff).
3. If clear for DIFS, transmit.
4. Receiver ACKs; sender retransmits if no ACK within SIFS window.

Optional **RTS/CTS** (Request to Send / Clear to Send) handshake before data in hidden-node scenarios.

---

## Wireless security evolution

### Security standards

| Standard | Crypto | Status |
|---|---|---|
| **WEP** | RC4 with short IV + CRC-32 | **Broken** (<60 seconds with modern tools) |
| **WPA (TKIP)** | RC4 with per-packet key + MIC (Michael) | Legacy / broken |
| **WPA2 Personal (PSK)** | AES-CCMP with PSK | Acceptable with strong PSK |
| **WPA2 Enterprise** | AES-CCMP with 802.1X / EAP | Enterprise standard |
| **WPA3 Personal** | SAE (Simultaneous Authentication of Equals / Dragonfly) | Current best |
| **WPA3 Enterprise** | Enhanced 802.1X + 192-bit crypto suite | Current best |

### 802.1X / EAP

- **802.1X** — port-based network access control. Ties authentication to connection.
- **Supplicant** — client side.
- **Authenticator** — AP (in WLAN) or switch.
- **Authentication Server** — RADIUS, which consults the identity store (AD, LDAP).
- **EAP methods** — EAP-TLS (mutual-cert; best), PEAP-MSCHAPv2 (widely deployed), EAP-TTLS, EAP-FAST, EAP-SIM (SIM cards).

### Wireless attacks

- **Eavesdropping** on open / WEP networks.
- **WEP cracking** — IV collisions; `aircrack-ng` in seconds.
- **WPA/2 PSK capture + offline dictionary** — capture 4-way handshake or PMKID, crack with hashcat.
- **Evil Twin** — rogue AP mimicking corporate SSID.
- **KARMA** — rogue AP responding to probe requests for any SSID.
- **Deauthentication flood** — send spoofed deauth frames to kick clients; force reconnection (handshake capture).
- **KRACK (2017)** — WPA2 four-way handshake replay vulnerability; patched.
- **Dragonblood (2019)** — WPA3 SAE side-channel; patched.
- **Rogue AP insertion** — attacker's AP plugged into internal wired network.
- **WPS PIN brute-force** — WPS Pixie Dust attack.

### Defender controls

- **Enterprise 802.1X / WPA2+/WPA3-Enterprise** for employee access.
- **Disable WPS.**
- **Disable PSK/Personal** on enterprise networks.
- **Guest network** on separate VLAN with Internet-only access.
- **WIDS/WIPS** — wireless IDS/IPS detecting rogue APs, deauth floods, evil twins.
- **Channel and site survey** — baseline coverage and interference.
- **Hide SSID** — not a security control (trivially bypassed by sniffing probe responses) but reduces casual discovery.
- **MAC filtering** — likewise weak (trivially spoofable).
- **Physical controls** — limit RF leakage beyond the site perimeter.

---

## Regulatory constraints

- **FCC Part 15** (US) — unlicensed band rules.
- **ETSI EN 300 328** — European 2.4 GHz rules.
- **Power limits** — vary by band and region.
- **Indoor-only channels** — 6 GHz band has indoor-only LPI and portable VLP modes in many regions.
- **DFS enforcement** — required on some 5 GHz channels; APs must vacate on radar detection within ~10 s.

### Frequencies US ISM and UNII

| Band | Frequency | Typical use |
|---|---|---|
| 2.4 GHz ISM | 2.400–2.4835 GHz | Wi-Fi, Bluetooth, microwaves, consumer |
| 5 GHz UNII-1 | 5.150–5.250 | Indoor-only (historical); now mixed |
| 5 GHz UNII-2A | 5.250–5.350 | DFS |
| 5 GHz UNII-2C | 5.470–5.725 | DFS |
| 5 GHz UNII-3 | 5.725–5.825 | No DFS |
| 6 GHz UNII-5–8 | 5.925–7.125 | Wi-Fi 6E / 7 |
| 60 GHz | 57–71 GHz | 802.11ad/ay |

---

## Cross-book connections

- Wireless standards ↔ `JCAC-NETWORKING.md` §5 (wireless medium) and §28 (virtual networking).
- Wireless security ↔ `BOOK-CISSP.md` Ch 4 (Wireless).
- 802.1X ↔ `JCAC-NETWORKING.md` §27 (AAA with RADIUS).
- Attacks ↔ `BOOK-GRAY-HAT.md` Ch 6 (SDR / wireless).

---

## Exam-testable concepts (rapid-fire)

- **Body that certifies 802.11 products?** Wi-Fi Alliance.
- **Body that publishes 802.11 standards?** IEEE.
- **Wi-Fi 6 IEEE amendment?** 802.11ax.
- **Wi-Fi 5 amendment?** 802.11ac.
- **2.4 GHz non-overlapping channels in North America?** 1, 6, 11.
- **Default 802.11 beacon interval?** 100 TUs ≈ 102.4 ms.
- **dBm for 1 mW?** 0 dBm. For 1 W? +30 dBm.
- **Antenna gain measured in?** dBi.
- **EIRP formula?** Tx power (dBm) + antenna gain (dBi) − cable loss (dB).
- **BSSID is?** 48-bit MAC of the AP radio.
- **SSID max length?** 32 bytes.
- **ESS?** Extended Service Set — multiple BSSs sharing an SSID.
- **Mandatory 802.11 channel-access method?** DCF (CSMA/CA).
- **Three 802.11 frame types?** Management, Control, Data.
- **Broken wireless encryption?** WEP.
- **Modern personal Wi-Fi security?** WPA3 Personal with SAE.
- **Enterprise Wi-Fi auth framework?** 802.1X + EAP with RADIUS.
- **Strongest EAP method?** EAP-TLS (mutual certificate authentication).
- **KRACK affected which handshake?** WPA2 4-way handshake.
- **Attack that forces reconnect to capture handshake?** Deauthentication flood.
- **Rogue AP responding to any probe?** KARMA attack.
- **WIDS function?** Detect wireless anomalies (rogue APs, deauth floods, evil twins).
- **DFS requirement applies to?** Certain 5 GHz bands coexisting with radar.
- **Newly-opened band for Wi-Fi 6E / 7?** 6 GHz.

---

## Cross-references

- **[CWNA Study Guide, 6e](../references/CWNA%20Certified%20Wireless%20Network%20Administrator%20Study%20Guide,%206th%20Edition-9781119734505.pdf)** — text on disk.
- **[CWNP](https://www.cwnp.com/)** — certification body.
- **[Wi-Fi Alliance](https://www.wi-fi.org/)** — certifications and specs.
- **[IEEE 802.11 Working Group](https://www.ieee802.org/11/)**.
- **[FCC Office of Engineering and Technology](https://www.fcc.gov/oet)** — US unlicensed rules.
- `JCAC-NETWORKING.md` · `BOOK-CISSP.md` · `BOOK-GRAY-HAT.md` · `BOOK-CCNA.md`.
