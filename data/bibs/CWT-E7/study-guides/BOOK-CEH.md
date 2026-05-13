# Bib Study Guide — CEH v11 Certified Ethical Hacker Study Guide

> **Bib reference:** *CEH v11 Certified Ethical Hacker Study Guide* — Ric Messier (Sybex/Wiley, 2021, ISBN 978-1-119-80030-9 eText / 978-1-119-80028-6 print).
>
> **Regular-exam scope:** Chapters **7** and **13**.
> **Substitute-exam scope:** same chapters.
> **Important correction:** Per the Wiley table of contents, **Chapter 7 = System Hacking**, **Chapter 13 = Cryptography**. Earlier breadcrumbs that suggested Ch 13 was IDS / IPS / firewalls / honeypots tracked a different CEH edition; CEH v11 explicitly puts cryptography in Ch 13.

**Posture:** v11 is the strict edition match (the Bib's `editionMatch: "strict"`). EC-Council's v12 / v13 cover materially different objectives, so don't substitute newer Messier editions for content review. This guide cross-walks the v11 Ch 7 + Ch 13 scope onto authoritative free sources: **MITRE ATT&CK** for the system-hacking tactics, **NIST cryptographic publications** (FIPS + SP 800 series) for the cryptography, and the **IETF RFC** library for the protocol-side topics (X.509, OpenPGP, S/MIME).

Pairs with `BOOK-HACKER-TECH.md` (Hacker Techniques Ch 7 — same MITRE mapping), `BOOK-GRAY-HAT.md` (offensive technique depth), and `JCAC-WINDOWS.md` / `JCAC-UNIX-LINUX.md` (the platform internals system-hacking abuses).

---

## Chapter 7 — System Hacking

CEH frames "system hacking" as the post-recon, pre-objective stage where the attacker turns initial access into operating-system-level control. The vocabulary maps directly onto MITRE ATT&CK Enterprise tactics; the chapter walks each in order.

### The CEH v11 system-hacking phases (and the ATT&CK tactic each maps to)

1. **Gaining access** — Initial Access (TA0001) and Execution (TA0002).
2. **Escalating privileges** — Privilege Escalation (TA0004).
3. **Executing applications** — Execution (TA0002).
4. **Hiding files** — Defense Evasion (TA0005).
5. **Covering tracks** — Defense Evasion (TA0005), specifically Indicator Removal.

Real engagements also explicitly cover **Credential Access (TA0006)** and **Persistence (TA0003)** as part of this phase, even though CEH treats persistence as a separate concept. Study them together.

### 7.1 Password attacks (the chapter's largest block)

Password attacks fall into a small number of categories. Know each category, an example tool, and the corresponding ATT&CK technique.

| Attack | What it does | Example tool | ATT&CK |
|---|---|---|---|
| Online active | Submit guesses to a live authentication service (SSH, RDP, web login) | Hydra, Medusa, ncrack | T1110 (Brute Force) |
| Online passive | Sniff credentials off the wire | Wireshark + protocol-specific decoders | T1040 (Network Sniffing), T1557 (AitM) |
| Offline | Crack hashes obtained out-of-band (memory dump, /etc/shadow, NTDS.dit, SAM) | hashcat, John the Ripper | T1110.002 (Brute Force: Password Cracking) |
| Default-credential | Try vendor defaults | Built-in dictionaries | T1078.001 (Valid Accounts: Default Accounts) |
| Pass-the-hash | Authenticate with the hash, not the password | Mimikatz, impacket | T1550.002 (Use Alternate Authentication Material: Pass-the-Hash) |
| Pass-the-ticket | Authenticate with a Kerberos TGT/TGS | Rubeus, mimikatz | T1550.003 (Pass-the-Ticket) |
| Kerberoasting | Request service tickets, crack offline | Rubeus, impacket | T1558.003 (Kerberoasting) |
| AS-REP roasting | Request preauth-disabled AS-REPs, crack offline | Rubeus, impacket | T1558.004 (AS-REP Roasting) |
| Credential dumping | Pull creds from LSASS, SAM, registry, browser stores | mimikatz, secretsdump | T1003 (OS Credential Dumping) |

**Hash families to recognize:**
- **LM** — legacy Windows; broken since the 1990s; disabled by default on modern systems.
- **NT (NTLM)** — Windows password hash. MD4 of UTF-16-LE password. No salt → rainbow-table-vulnerable; pass-the-hash works because Windows accepts the NT hash as the credential.
- **Kerberos AES-128 / AES-256** — modern Windows / AD.
- **/etc/shadow** entries — sha256crypt / sha512crypt / bcrypt / yescrypt, salted, with cost factor; format `$id$rounds$salt$hash`.
- **bcrypt** — `$2a$cost$22-char-salt22-char-hash...`.

### 7.2 Privilege escalation

**Windows (TA0004):**
- **Token impersonation / theft** — `SeImpersonatePrivilege`, named-pipe impersonation, JuicyPotato / RoguePotato / PrintSpoofer family. ATT&CK T1134.
- **UAC bypass** — auto-elevating COM objects, environment-variable hijacks, registry-keyed handlers (fodhelper, computerdefaults, sdclt). T1548.002.
- **Unquoted service paths** with writable directories on the path. T1574.009.
- **Weak service permissions** (writable binary or configuration). T1543.003.
- **Insecure registry permissions** on service `ImagePath` keys. T1574.011.
- **Always-Install-Elevated** policy — `HKLM`/`HKCU` `Software\Policies\Microsoft\Windows\Installer\AlwaysInstallElevated = 1` → installer runs as SYSTEM. T1548.

**Linux (TA0004):**
- **SUID/SGID binaries** — find them with `find / -perm -4000`. GTFOBins lists exploitable shells per binary.
- **Sudo misconfiguration** — `NOPASSWD` on cmds with shell escapes, `sudoedit` quirks, CVE-2021-3156 (Baron Samedit).
- **Capabilities** — `getcap -r /` to enumerate; `cap_dac_read_search`, `cap_setuid` are direct paths.
- **Kernel exploits** — `dirtycow`, `dirtypipe`, `pwnkit (CVE-2021-4034)`, `OverlayFS`, `nf_tables`. T1068.
- **Writable cron** or **PATH abuse** on root-run scripts. T1053 / T1574.

Authoritative public reference: **MITRE ATT&CK Privilege Escalation (TA0004)** at `https://attack.mitre.org/tactics/TA0004/`. Every technique on that page has detection guidance, which CEH expects you to know in addition to the technique itself.

### 7.3 Credential access

The ATT&CK Credential Access tactic (TA0006) covers what CEH calls "password attacks" + everything that lives in memory or files:

- **LSASS dumping** — `procdump -ma lsass.exe`, `comsvcs.dll MiniDump`, Mimikatz `sekurlsa::*`. T1003.001.
- **SAM / SYSTEM hive theft** — reg save, shadow copy, raw NTFS read with `samdump2`. T1003.002.
- **NTDS.dit theft** — domain controller; `ntdsutil`, `vssadmin`, secretsdump. T1003.003.
- **DCSync** — replicate password hashes from a domain controller via the Directory Replication Service (DRS). Requires elevated DC privileges. T1003.006.
- **Browser credential stores** — Chrome's Login Data + Local State, Firefox's logins.json + key4.db, Edge IE creds in Credential Manager. T1555.003.

### 7.4 Defense evasion: hiding files and covering tracks

The CEH "hiding files" section covers:
- **NTFS alternate data streams** — `type secret.txt > legit.txt:hidden.txt`. Streams visible with `dir /R`. T1564.004.
- **File / extension obfuscation** — RTLO (right-to-left override) characters, double extensions. T1036.
- **Steganography** — payload hidden inside a carrier file (image, audio). T1027.003.
- **Rootkit-level hiding** — kernel hooks of `NtQueryDirectoryFile` (Windows) or `getdents` (Linux). T1014.

"Covering tracks":
- **Windows event log clearing** — `wevtutil cl Security`, PowerShell `Clear-EventLog`. T1070.001.
- **Linux** — `wtmp / utmp / btmp` editing, history-file truncation, `unset HISTFILE`. T1070.002, T1070.003.
- **Timestomping** — `touch -r`, `SetFileTime` Win32 API. T1070.006.

Authoritative public reference: **MITRE ATT&CK Defense Evasion (TA0005)** + **Indicator Removal (T1070)**.

### 7.5 Persistence (CEH covers as part of system hacking, ATT&CK splits as TA0003)

- **Windows Registry Run keys** — `HKCU/HKLM\Software\Microsoft\Windows\CurrentVersion\Run`. T1547.001.
- **Scheduled tasks** — `schtasks /create`, persistent on user logon or interval. T1053.005.
- **Services** — create or replace a service binary. T1543.003.
- **WMI event subscriptions** — `__EventFilter` + `CommandLineEventConsumer`. T1546.003.
- **DLL search-order hijack** — drop a DLL with a name a legitimate program loads. T1574.001.
- **Linux cron / systemd-timer / .bashrc / .profile** — T1053.003, T1546.004.
- **SSH authorized_keys append** — silent backdoor on any account whose home is writable. T1098.004.

### 7.6 Authoritative free sources for Chapter 7

| Source | URL | What it gives |
|---|---|---|
| MITRE ATT&CK Privilege Escalation (TA0004) | https://attack.mitre.org/tactics/TA0004/ | Authoritative technique list w/ detection mappings |
| MITRE ATT&CK Credential Access (TA0006) | https://attack.mitre.org/tactics/TA0006/ | Same, for cred-access |
| MITRE ATT&CK Persistence (TA0003) | https://attack.mitre.org/tactics/TA0003/ | Same, for persistence |
| MITRE ATT&CK Defense Evasion (TA0005) | https://attack.mitre.org/tactics/TA0005/ | Same, for evasion / covering tracks |
| NIST SP 800-115 — Technical Guide to Information Security Testing and Assessment | https://csrc.nist.gov/pubs/sp/800/115/final | The pen-test methodology CEH borrows from |
| NIST SP 800-61 Rev.2 — Incident Handling Guide | https://csrc.nist.gov/pubs/sp/800/61/r2/final | The defender's side of the same activity |

---

## Chapter 13 — Cryptography

CEH v11 Ch 13 is a survey of practical cryptography for an analyst: the algorithms, what they're for, the standards bodies that define them, and the failure modes. The Wiley TOC covers symmetric ciphers, asymmetric ciphers, hashing, message-authentication codes, digital signatures, public-key infrastructure, message-format crypto (PGP/S/MIME), and storage encryption.

### 13.1 What cryptography provides

Five primitive services:
- **Confidentiality** — only the intended party can read.
- **Integrity** — message has not been altered.
- **Authentication** — sender is who they claim to be.
- **Non-repudiation** — sender cannot later deny sending.
- **Key establishment** — two parties agree on a shared secret over a public channel.

Each primitive maps to specific algorithms; mixing them up (e.g. claiming a hash provides confidentiality) is a common CEH trap.

### 13.2 Symmetric ciphers

One shared key. Fast; suitable for bulk data. Two structural families: **block** and **stream**.

**Block ciphers:**
- **AES (FIPS 197)** — Rijndael with 128-bit block, 128/192/256-bit key. The current standard. Modes:
  - **ECB** — no IV, identical plaintext blocks → identical ciphertext blocks. **Insecure** for anything beyond a single random block. (The CEH "ECB penguin" image.)
  - **CBC** — chains blocks via XOR with previous ciphertext + IV. Requires padding; vulnerable to padding-oracle attacks if integrity not separately protected.
  - **CTR** — turns the block cipher into a stream cipher by encrypting a counter. No padding needed.
  - **GCM** — CTR mode + GHASH authenticator → **authenticated encryption with associated data (AEAD)**. The modern recommendation. Defined in NIST SP 800-38D.
- **3DES (Triple-DES)** — EDE3, 168-bit key effective 112-bit security. Deprecated; NIST disallowed for new use after 2023.
- **Blowfish / Twofish / Serpent** — historical competitors; not in modern standards.

**Stream ciphers:**
- **ChaCha20** — RFC 7539 / RFC 8439. Used with Poly1305 as the AEAD in TLS 1.3.
- **RC4** — historical (used in old WEP/WPA-TKIP, SSL); broken; removed from all modern standards.

Authoritative free reference: **FIPS 197 (AES)** at `https://www.nist.gov/publications/advanced-encryption-standard-aes`. The standard itself is short (51 pages) and tells you the algorithm.

### 13.3 Asymmetric ciphers

Two keys: a **public key** that can be shared, and a **private key** that must not be. Algorithms:

- **RSA** — key sizes 2048 / 3072 / 4096 bits today. Used for key transport (encrypt a symmetric session key with the recipient's public key) and signatures (sign a hash with the private key). Slow vs symmetric.
- **Diffie-Hellman (DH)** — key agreement only, not encryption. Two parties derive a shared secret over a public channel. Variants: ephemeral (DHE) for forward secrecy; static DH (rare).
- **Elliptic Curve (ECC)** — same primitive operations on elliptic curves over a finite field; same security level at far smaller key sizes (a 256-bit ECC key ≈ a 3072-bit RSA key in classical-attack security). Named curves: P-256 / P-384 / P-521 (NIST), Curve25519 (Bernstein).
- **ECDH / ECDHE** — Diffie-Hellman on elliptic curves.
- **ECDSA** — DSA signature scheme on elliptic curves.
- **EdDSA / Ed25519** — modern signature scheme using twisted-Edwards curves.

Authoritative references:
- **NIST SP 800-56A Rev.3** — Recommendations for Pair-Wise Key Establishment via Discrete-Log Cryptography (DH and ECDH). `https://csrc.nist.gov/pubs/sp/800/56/a/r3/final`
- **NIST FIPS 186-5** — Digital Signature Standard (DSS) — ECDSA, EdDSA, RSA signatures. `https://csrc.nist.gov/pubs/fips/186-5/final`

### 13.4 Hashes and message-authentication codes

**Cryptographic hash properties:**
- **Pre-image resistance** — given h, hard to find m with H(m) = h.
- **Second-pre-image resistance** — given m1, hard to find m2 ≠ m1 with H(m1) = H(m2).
- **Collision resistance** — hard to find any m1 ≠ m2 with H(m1) = H(m2).

**FIPS-blessed algorithms (FIPS 180-4 — Secure Hash Standard):**
- **SHA-1** — broken (Google SHAttered 2017). Avoid for any new use.
- **SHA-2 family** — SHA-224 / SHA-256 / SHA-384 / SHA-512 (and SHA-512/224, SHA-512/256). Current production standard.
- **SHA-3 family** — Keccak-based; FIPS 202. SHA3-224 / -256 / -384 / -512 plus SHAKE-128 / SHAKE-256 (extendable-output).

**Non-FIPS, still widely seen:** MD5 (broken for collisions, fine for non-security checksums), CRC-32 (not cryptographic; integrity-only).

**MACs (Message Authentication Codes)** — symmetric integrity + authenticity:
- **HMAC** — hash-based MAC; HMAC-SHA-256 most common today (FIPS 198-1).
- **CMAC** — block-cipher-based MAC (NIST SP 800-38B).
- **Poly1305** — used with ChaCha20 in TLS 1.3.
- **GMAC** — the authentication half of GCM.

A MAC requires a shared secret; a **digital signature** does not — the verifier uses a public key. That's the operational difference CEH tests.

Authoritative reference: **NIST FIPS 180-4 (SHA Standard)** at `https://csrc.nist.gov/pubs/fips/180-4/upd1/final`.

### 13.5 Key management

The full lifecycle: generation → distribution → storage → use → archival → destruction. Failures here defeat the cryptography below them.

Authoritative reference: **NIST SP 800-57 Part 1 Rev.5** — Recommendation for Key Management. `https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final`

Key concepts CEH will ask about:
- **Cryptoperiod** — the time a key may be in use. Symmetric data-encryption keys typically have one- to three-year cryptoperiods; key-encryption keys (KEKs) live longer.
- **Key wrapping** — encrypt a key with another key for storage / transport (AES-KW per NIST SP 800-38F).
- **Key derivation** — produce a working key from a master secret (HKDF, PBKDF2, scrypt, Argon2). PBKDF2 for password-based key derivation in Wi-Fi WPA2.
- **Key escrow** — third party holds the key for recovery; legally fraught and operationally risky.
- **Forward secrecy** — even if a long-term key is later compromised, past sessions remain unreadable. Requires ephemeral DH/ECDH for every session.

**NIST SP 800-175B Rev.1** — Guidelines for Using Cryptographic Standards in the Federal Government: Cryptographic Mechanisms — is the survey doc that maps every primitive to its FIPS / SP citation. `https://csrc.nist.gov/pubs/sp/800/175/b/final`

### 13.6 Public Key Infrastructure (PKI)

PKI binds a **public key** to an **identity** via a **certificate** signed by a **Certificate Authority (CA)**.

The certificate format is **X.509 v3** (RFC 5280). Key fields:
- Subject — the identity (Distinguished Name; for web certs, Subject Alternative Name now carries the DNS names).
- Issuer — the CA that signed it.
- Subject public key + algorithm.
- Validity period (Not Before / Not After).
- Serial number.
- Signature (issuer's signature over the certificate).
- Extensions — Key Usage, Extended Key Usage, Basic Constraints (CA / path length), CRL Distribution Points, Authority Information Access (OCSP responder), Subject Alternative Names.

PKI components:
- **Root CA** — self-signed; trust anchor. Compromise = catastrophic.
- **Intermediate CA** — signed by a root; issues end-entity certs.
- **Registration Authority (RA)** — verifies identity before the CA issues.
- **Certificate Revocation List (CRL)** — list of revoked serials, published periodically.
- **OCSP** — online revocation check; faster than CRL.
- **CT logs (Certificate Transparency, RFC 6962)** — append-only public logs of issued web certs.

Authoritative reference: **RFC 5280** — Internet X.509 PKI Certificate and CRL Profile. `https://www.rfc-editor.org/rfc/rfc5280`

### 13.7 Message-format crypto

Two big families layered on top of the primitives:

**OpenPGP (RFC 9580, latest as of 2024 — was RFC 4880):**
- Web-of-trust model (vs PKI's hierarchical CAs).
- Used by GnuPG, ProtonMail, signed Linux package repositories.
- Format: armored ASCII (`-----BEGIN PGP MESSAGE-----`) or binary.
- Operations: encrypt (hybrid: random session key + recipient public key), sign, detach-sign, encrypt-and-sign.
- `https://www.rfc-editor.org/rfc/rfc9580`

**S/MIME (RFC 8551):**
- X.509 certificate-based; integrates with corporate PKI.
- Used by Outlook, Apple Mail, Thunderbird for signed/encrypted enterprise email.
- MIME content types `application/pkcs7-mime`, `application/pkcs7-signature`.
- `https://www.rfc-editor.org/rfc/rfc8551`

### 13.8 Storage encryption

CEH covers the operational forms; NIST SP 800-111 provides the methodology.

- **Full-disk encryption (FDE)** — BitLocker (Windows), FileVault (macOS), LUKS (Linux). Decrypts at boot via a key derived from a passphrase + optional TPM-sealed key.
- **Self-encrypting drive (SED)** — disk firmware encrypts; OS sees plaintext. Standard: TCG Opal.
- **Volume / container encryption** — VeraCrypt, encrypted dmg/sparseimage on macOS.
- **File-level encryption** — Windows EFS, Linux fscrypt, eCryptfs.
- **Database column / TDE** — application-managed key, DB transparently encrypts data at rest.

Authoritative reference: **NIST SP 800-111** — Guide to Storage Encryption Technologies for End User Devices. `https://csrc.nist.gov/pubs/sp/800/111/final`

### 13.9 Common cryptography failure modes (CEH will quiz on these)

- **ECB mode on structured data** — patterns visible in ciphertext.
- **Reusing a stream-cipher / CTR nonce** — XOR the two ciphertexts → XOR of plaintexts.
- **Reusing a DSA / ECDSA k value** — single nonce reuse reveals the private key (Sony PS3 case).
- **No integrity** — encrypted-only without a MAC/AEAD allows bit-flipping and padding-oracle attacks.
- **MD5 / SHA-1 for security** — collisions are practical; use SHA-2 / SHA-3.
- **Key stored alongside ciphertext** — defeats encryption at rest.
- **Implementation timing side channels** — variable-time comparison of HMACs, table-based AES, RSA without blinding.

---

## Mapped to Bib study topics

| Bib (CEH v11) | Ch | Where the answer lives |
|---|---|---|
| System hacking phases | 7 | The five-phase list mapping each to an ATT&CK tactic |
| Password attacks | 7 | The seven-row attack table (online active / passive / offline / pass-the-X / Kerberoasting / cred dumping) |
| Windows privilege escalation | 7 | Token impersonation, UAC bypass, unquoted service paths, AlwaysInstallElevated |
| Linux privilege escalation | 7 | SUID, sudo, capabilities, kernel exploits, cron / PATH |
| Hiding files | 7 | ADS, RTLO, stego, rootkit-level hiding |
| Covering tracks | 7 | Windows log clear, Linux history, timestomping |
| Persistence | 7 | Run keys, scheduled tasks, services, WMI, DLL hijack, SSH authorized_keys |
| Symmetric ciphers | 13 | AES + modes (ECB/CBC/CTR/GCM); FIPS 197 |
| Asymmetric ciphers | 13 | RSA / DH / ECC / ECDSA / EdDSA; SP 800-56A; FIPS 186-5 |
| Hashes | 13 | SHA-2 / SHA-3; FIPS 180-4; FIPS 202 |
| MACs and signatures | 13 | HMAC, CMAC, Poly1305; digital signatures vs MACs |
| Key management | 13 | SP 800-57 Pt 1; cryptoperiods, KEKs, KDFs, forward secrecy |
| PKI / X.509 | 13 | RFC 5280; CA hierarchy, CRL/OCSP, CT logs |
| OpenPGP | 13 | RFC 9580 |
| S/MIME | 13 | RFC 8551 |
| Storage encryption | 13 | SP 800-111; BitLocker / FileVault / LUKS, SEDs, TDE |

---

## Common exam-style question stems (open-source framing)

- "An attacker uses a hash retrieved from LSASS to authenticate to another host without ever knowing the password. This is..." — **Pass-the-hash (T1550.002)**.
- "Which Windows privilege allows a service-running process to impersonate any token presented to it?" — **SeImpersonatePrivilege**.
- "A Linux binary owned by root has the SUID bit set. Where would you look first?" — **GTFOBins** for that binary; `find / -perm -4000` to enumerate.
- "Which AES mode is appropriate for general-purpose authenticated encryption?" — **GCM** (or CCM where AAD is not needed).
- "Which key-length pair gives roughly equivalent security: ECC and RSA?" — **256-bit ECC ≈ 3072-bit RSA**.
- "Which hash algorithm should be avoided for new systems?" — **MD5 and SHA-1** (collisions).
- "What service does a CRL provide?" — **Revocation status** for certificates issued by a CA.
- "An attacker writes a malicious DLL into a directory the application searches before the system directory. Which technique?" — **DLL search-order hijack (T1574.001)**.
- "After dumping LSASS, the attacker uses Mimikatz to extract NT hashes. Which ATT&CK technique?" — **T1003.001 (OS Credential Dumping: LSASS Memory)**.
- "What property does a digital signature provide that a MAC does not?" — **Non-repudiation** (public-key, not shared-secret).

---

## How to actually study this on the boat

1. Pull the **Wiley v11 PDF** from the on-disk copy. Read Chapter 7 cover-to-cover, taking notes per the five-phase outline above.
2. Open MITRE ATT&CK in another tab and walk every technique referenced in Chapter 7. The detection-engineering side is the most testable.
3. Read Chapter 13 cover-to-cover. For every algorithm named, open the relevant NIST publication's abstract page and skim the introduction.
4. Memorize the algorithm-to-purpose table: AES → bulk symmetric; SHA-2 → hash; RSA → sig + key transport; ECDH → key agreement; HMAC → MAC; X.509 → certificate format.
5. Build a one-page cheat sheet keyed by FIPS / SP / RFC number. CEH questions often cite by number.

---

## Free / adjacent sources (canonical)

### Chapter 7 — System Hacking
- **MITRE ATT&CK Privilege Escalation (TA0004)** — `https://attack.mitre.org/tactics/TA0004/`
- **MITRE ATT&CK Credential Access (TA0006)** — `https://attack.mitre.org/tactics/TA0006/`
- **MITRE ATT&CK Persistence (TA0003)** — `https://attack.mitre.org/tactics/TA0003/`
- **MITRE ATT&CK Defense Evasion (TA0005)** — `https://attack.mitre.org/tactics/TA0005/`
- **NIST SP 800-115** Technical Guide to Information Security Testing and Assessment — `https://csrc.nist.gov/pubs/sp/800/115/final`

### Chapter 13 — Cryptography
- **NIST FIPS 197** (AES) — `https://www.nist.gov/publications/advanced-encryption-standard-aes`
- **NIST FIPS 180-4** (Secure Hash Standard) — `https://csrc.nist.gov/pubs/fips/180-4/upd1/final`
- **NIST FIPS 186-5** (Digital Signature Standard) — `https://csrc.nist.gov/pubs/fips/186-5/final`
- **NIST SP 800-175B Rev.1** (Cryptographic Mechanisms — the survey) — `https://csrc.nist.gov/pubs/sp/800/175/b/final`
- **NIST SP 800-57 Part 1 Rev.5** (Key Management Recommendation) — `https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final`
- **NIST SP 800-56A Rev.3** (Pair-Wise Key Establishment, DH/ECDH) — `https://csrc.nist.gov/pubs/sp/800/56/a/r3/final`
- **NIST SP 800-111** (Storage Encryption Technologies) — `https://csrc.nist.gov/pubs/sp/800/111/final`
- **RFC 5280** (Internet X.509 PKI / CRL Profile) — `https://www.rfc-editor.org/rfc/rfc5280`
- **RFC 9580** (OpenPGP, current edition) — `https://www.rfc-editor.org/rfc/rfc9580`
- **RFC 8551** (S/MIME Message Specification v4) — `https://www.rfc-editor.org/rfc/rfc8551`

---

## Cross-references

- `BOOK-HACKER-TECH.md` — same MITRE mapping; the Chapter 7 enumeration / system-hacking material overlaps directly.
- `BOOK-GRAY-HAT.md` — offensive technique depth for what CEH only surveys.
- `JCAC-WINDOWS.md` — Windows internals that priv-esc abuses (SIDs, tokens, privileges, integrity levels).
- `JCAC-UNIX-LINUX.md` — Linux internals for SUID, sudo, PATH, capabilities.
- `BOOK-ART-MEM-FORENSICS.md` — defender side of credential-dumping detection.
- `JP-3-12.md` — joint cyber doctrine framing for offensive vs defensive operations.
