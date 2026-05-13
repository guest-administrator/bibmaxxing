# Bib Study Guide — Blue Team Field Manual (BTFM)

> **Bib reference:** *Blue Team Field Manual (BTFM)* — Alan J. White, Ben Clark (self-published, 2017).
>
> **Regular-exam scope:** Chapter **Malware Analysis**.
> **Substitute-exam scope:** not listed.
> **Union — what this guide covers:** BTFM's Malware Analysis chapter — static analysis fundamentals, dynamic analysis / sandboxing, memory-image analysis, file-identification tooling, YARA, and the incident-response hooks around malware findings.

**Posture:** BTFM mirrors RTFM's pocket-reference style for the defender. The Malware Analysis chapter is the defender's playbook for triaging a suspect file or captured sample. Pairs with `BOOK-ART-MEM-FORENSICS.md` (memory-side), `JCAC-FORENSIC-MAL.md` (JCAC equivalent), and `BOOK-NET-INTRUSION.md` (network-side signal).

---

## Goals of malware analysis

A defender gets a suspicious file — via email, endpoint quarantine, captured memory-dump, DFIR investigation — and needs to answer:

1. **Is it malicious?** (vs a false positive)
2. **What does it do?** (classification — ransomware, infostealer, backdoor, RAT, dropper, loader, cryptominer, wiper)
3. **How does it spread / persist?** (worm, via email, via vulnerable service)
4. **What are the Indicators of Compromise (IOCs)?** (hashes, network IOCs, registry paths, dropped files)
5. **Is my organization already affected?** (hunt for IOCs historically)
6. **Who likely deployed it?** (attribution — attacker tooling, language artifacts)

Three approaches — each with trade-offs:

| Approach | Description | Trade-off |
|---|---|---|
| **Static** | Analyze without running | Safe; many obfuscation techniques hide behavior |
| **Dynamic** | Run and observe | Sees behavior; risk of spread; sandbox evasion |
| **Hybrid / symbolic** | Combine static + runtime instrumentation | Best results; tool complexity |

---

## File identification — first-pass triage

Before deep analysis, identify **what you have**.

### Basic commands

```
file suspect.bin
sha256sum suspect.bin
md5sum suspect.bin                        # legacy — for VT lookups
ssdeep suspect.bin                        # fuzzy hash (similarity)
imphash (via pefile)                      # import hash — groups samples by imported API set

exiftool suspect.bin                      # metadata
strings -a suspect.bin | less              # ASCII strings
strings -el suspect.bin | less             # Unicode (UTF-16LE) strings
hexdump -C suspect.bin | head

# Quick PE inspection
pefile --dump suspect.exe
objdump -f suspect.exe                    # MZ + PE header summary
readelf -h suspect.elf                    # ELF header
```

### File-type magic bytes (quick visual check)

| Format | Magic | Hex |
|---|---|---|
| PE / MZ (Windows exe/dll) | `MZ` | `4D 5A` |
| ELF (Linux) | `ELF` with leading 0x7F | `7F 45 4C 46` |
| Mach-O 32-bit | — | `FE ED FA CE` |
| Mach-O 64-bit | — | `FE ED FA CF` |
| Fat Mach-O | `CAFEBABE` | `CA FE BA BE` |
| ZIP / JAR / DOCX / XLSX | `PK..` | `50 4B 03 04` |
| JPEG | `FF D8 FF` |
| PNG | `PNG` | `89 50 4E 47 0D 0A 1A 0A` |
| GZIP | `1F 8B 08` |
| PDF | `%PDF` | `25 50 44 46` |
| OneNote | `E4 52 5C 7B` |
| MSI | `D0 CF 11 E0 A1 B1 1A E1` |
| ISO | `CD001` at offset 0x8001 |
| Office 97 (doc, xls) | `D0 CF 11 E0` |

---

## Static analysis

### Strings

The quickest win. Run `strings` and look for:

- **URLs** and **domain names** — C2 infrastructure candidates.
- **IP addresses** (IPv4 and IPv6).
- **File paths** — dropped-file locations; embedded path reveals OS target.
- **Registry paths** — persistence hint.
- **API calls** — e.g., `VirtualAlloc`, `WriteProcessMemory`, `CreateRemoteThread` = classic injection.
- **Command-line patterns** — `cmd /c`, `powershell -enc`, `schtasks /create`.
- **Mutex names** — malware often creates a named mutex to avoid re-infecting.
- **User-Agent strings** — hardcoded UA suggests custom HTTP client.
- **Error messages** — in compiler/toolchain language that hints at origin.
- **Debug symbols / PDB paths** — sometimes left in; `C:\Users\malware_author\project\Release\main.pdb`.

### PE / ELF header and sections

```
pefile --dump-all suspect.exe | less
# Or
peframe suspect.exe
# Or IDA / Ghidra

readelf -a suspect.elf
```

Interesting observations:

- **Imphash** (hash of import names) — groups families that use the same API set. Lookup on VT to find related samples.
- **Compile timestamp** — often faked but sometimes real.
- **Sections with unusual names** (non-standard like `.UPX0`, `.aspack`, `.enigma`) — packer indicator.
- **High-entropy sections** — packed or encrypted content (entropy close to 8.0).
- **Missing `.idata` or tiny import tables** — code resolves APIs at runtime (`GetProcAddress` + `LoadLibrary`) — evasion technique.
- **TLS callbacks** — executed before main; sneaky place to hide code.
- **Overlays** — data appended after the PE — often encrypted next-stage payload.

### Imports signaling malicious intent

| Import | Suggests |
|---|---|
| `VirtualAlloc`, `WriteProcessMemory`, `CreateRemoteThread` | Process injection |
| `NtUnmapViewOfSection` + process-create | Process hollowing |
| `CryptEncrypt`, `CryptDecrypt`, `BCryptEncrypt` | Ransomware / config decryption |
| `UrlDownloadToFile`, `InternetOpenUrlA`, `WinHttpSendRequest` | Staged download |
| `WSAStartup`, `socket`, `connect` | Custom networking |
| `RegSetValueEx` + Run-key constants | Persistence |
| `CreateService` | Service-based persistence |
| `OpenSCManager` | Service manipulation |
| `SeDebugPrivilege` via `AdjustTokenPrivileges` | LSASS access intent |
| `CryptoAPI` + RSA | C2 comms encrypted |
| `NtCreateUserProcess` | Process creation via direct syscall (evades hooks) |

### Packers and protectors

Obfuscation wrappers that compress/encrypt and unpack at runtime:

- **UPX** — open-source; `upx -d` unpacks.
- **Themida** — commercial; heavy anti-debugging.
- **ASPack / ASProtect** — legacy commercial.
- **VMProtect** — virtualizes instructions.
- **Custom packers** — written per-family.

Detection: `die` (Detect-It-Easy), `PEiD`, `PackerID`, `detect-pe`.

### YARA rules

Define patterns to classify binaries. Structure:

```
rule Example_Malware_Family {
    meta:
        author = "analyst"
        date = "2026-04-23"
        description = "Example family variant"
        hash = "sha256:..."
    strings:
        $mutex = "Global\\ExampleMutex_v3"
        $ua = "Mozilla/5.0 (ExampleBot)"
        $code1 = { 48 31 c0 48 89 c7 48 83 ec ?? }
        $code2 = "VirtualAlloc" ascii wide
    condition:
        uint16(0) == 0x5A4D                       // PE magic
        and filesize < 2MB
        and any of ($code*)
        and ($mutex or $ua)
}
```

Tools: `yara`, `yarGen` (auto-generate from samples), `loki` (YARA-based scanner), Volatility's `yarascan` (memory).

Rule sources: YARA-Rules project, Florian Roth's Signature-Base, Elastic Protections, vendor blogs.

### Disassembly / decompilation

- **Ghidra** — NSA open-source; solid decompiler.
- **IDA Pro** — commercial gold standard; Hex-Rays decompiler.
- **Binary Ninja** — modern commercial.
- **radare2 / Cutter** — open-source.
- **objdump** — quick disassembly for small samples.

Pivot points in a disassembler:

- **main / entry point** — trace execution.
- **WinMain** for Windows GUI apps.
- **DllMain** for DLLs — runs on `LoadLibrary`.
- **String cross-references** — click a string, see where it's used.
- **API-call cross-references** — "who calls `CreateRemoteThread`?"
- **Function boundaries** — identify the wrapper that does injection, decryption, etc.

---

## Dynamic analysis

### Sandbox isolation

Never run unknown malware on a host you care about.

- **Dedicated VM** — no network to prod, snapshot before, revert after.
- **No shared folders** — avoid host escape.
- **Disable clipboard / guest additions** — some malware uses these to detect sandboxing.
- **Realistic environment** — malware often checks for sandbox artifacts; VMs with "user" activity in the filesystem look more genuine.
- **Network simulation** — INetSim / FakeDNS / fakedns / inetsim fools the malware into thinking it has Internet.

### Core dynamic-analysis tools (Windows)

| Tool | Purpose |
|---|---|
| **Process Monitor (ProcMon)** | File / registry / process / network activity |
| **Process Explorer** | Process tree, handles, DLLs, properties |
| **Autoruns** | Persistence mechanisms enumeration |
| **Wireshark / tcpdump** | Network capture |
| **RegShot** | Snapshot registry before/after |
| **Fiddler / Burp** | HTTP(S) proxy for C2 traffic decryption (with MITM cert) |
| **Noriben** | ProcMon wrapper scripted for malware triage |
| **Cuckoo / CAPE** | Full-auto sandbox — extracts memory, network, dropped files, YARA matches |
| **Any.Run / Hybrid Analysis / VirusTotal** | Public sandboxes (beware sensitive samples) |

### Linux dynamic tools

| Tool | Purpose |
|---|---|
| **strace** | Syscall trace |
| **ltrace** | Library-call trace |
| **bpftrace / perf** | Deeper kernel-level tracing |
| **gdb** | Interactive debug |
| **Volatility + LiME** | Memory capture + analysis |
| **inotifywait** | File-system activity |
| **tcpdump** | Packet capture |

### Behavioral IOCs to extract

- **Files written** — locations, names, sizes, MIME types.
- **Files deleted** — self-deletion after stage 1.
- **Registry keys written** — persistence and config.
- **Mutexes / named events / pipes created** — family fingerprints.
- **Services created / modified**.
- **Scheduled tasks**.
- **Network connections** — DNS queries, HTTP(S) beacons, raw TCP/UDP to specific ports.
- **Process creations** — fresh children, especially spawned via WMI / WMIC.
- **DLLs loaded** — especially unusual paths.
- **Command lines** — obfuscated PowerShell, encoded Base64.

### Anti-analysis tricks malware uses (recognize them)

- **Anti-VM detection** — check for VMware registry keys, QEMU `SMBIOS`, Virtualization bit in CPUID.
- **Anti-debugger** — `IsDebuggerPresent`, `CheckRemoteDebuggerPresent`, manual PEB flag checks, timing measurements.
- **Anti-sandbox** — detect fast-forwarded time, low RAM, missing user profiles.
- **Sleep** — `Sleep(600000)` to wait out the sandbox's analysis window.
- **Environment check** — refuse to execute unless specific registry key or file exists.
- **User-activity detection** — require mouse movement, recent documents present.

### Manual unpacking technique (high-level)

1. Run in debugger with breakpoint at common unpacker-exit points (`VirtualAlloc` return → RWX region, then `jmp` into it).
2. When target `jmp`s into unpacked code, dump the memory region.
3. Rebuild PE headers with `Scylla` / `ImpREC` / `OllyDumpEx`.
4. Run PE fixups (imports, relocations).
5. Re-analyze the reconstructed image statically.

---

## Memory-image analysis

Covered in `BOOK-ART-MEM-FORENSICS.md`. BTFM emphasizes:

- **Capture RAM early** — volatile state dies at power-off.
- **Tools:** WinPmem, DumpIt, LiME, Volatility / Rekall.
- **Volatility plugins** useful for malware triage:
  - `pslist` / `psscan` / `pstree`
  - `malfind` — injected-code detection
  - `ldrmodules` — unlinked DLL detection
  - `netscan` — network connections
  - `handles` — open handles per process
  - `hivelist` + `printkey` — registry state
  - `cmdline` — command-line per process
  - `yarascan` — rule-based memory scanning

---

## IOC management and hunting

### IOC types

- **Hashes** — MD5 (legacy), SHA1, SHA256, ssdeep, imphash, authentihash.
- **Network** — IP, domain, URL, User-Agent, JA3/JA3S (TLS fingerprint), HTTP headers.
- **File** — filename patterns, mutex names, service names, scheduled-task names, registry values.
- **Behavior** — command-line patterns, parent-child process chains.

### Sharing formats

- **STIX** (Structured Threat Information Expression) — standard schema.
- **TAXII** — transport protocol for STIX.
- **OpenIOC** — Mandiant's legacy format.
- **MISP** — open-source sharing platform with many interchange formats.
- **SIGMA** — generic SIEM detection language (translates to Splunk, Elastic, Sentinel, etc.).
- **YARA** — file/memory detection.

### Hunting workflow

1. **Receive** IOCs from intel feed, incident, or analysis.
2. **Enrich** — add context (family, campaign, actor).
3. **Scope search** across SIEM, EDR, DNS, proxy, mail, backups.
4. **Validate hits** — reduce false positives.
5. **Respond** — isolate affected, rotate credentials, patch vulnerabilities.
6. **Write detections** — turn IOCs into signatures for sustained protection.
7. **Feed back** to intel platform.

### IOC lifespan

- **Hashes** — high-fidelity but easily rotated. Decay fast.
- **Domains** — last days to months; DGA makes this worse.
- **IPs** — similar to domains; cloud-hosted C2 churns.
- **TTPs / Behaviors** — MITRE ATT&CK techniques — decay slowly; higher-value detections. ("Pyramid of Pain": harder for attackers to change → more valuable to you.)

---

## Response workflow around a malware finding

1. **Contain** — isolate infected host (quarantine via EDR, disable network port, or shut down VM).
2. **Preserve** — take memory + disk images before remediation.
3. **Analyze** — triage the sample, extract IOCs.
4. **Hunt** — search environment for the same IOCs + related TTPs.
5. **Eradicate** — remove malware, close entry vector, rotate credentials used on compromised hosts, patch vuln.
6. **Recover** — reimage or verify clean; restore from backup if integrity uncertain.
7. **Improve** — update detections, document lessons learned, notify peers via MISP/ISAC/US-CERT.

---

## Cross-book connections

- Static / dynamic analysis ↔ `JCAC-FORENSIC-MAL.md` (JCAC forensic methodology).
- Memory analysis ↔ `BOOK-ART-MEM-FORENSICS.md`.
- IOC hunting ↔ `BOOK-CYBER-OPS.md` Ch 16 (defending networks, SIEM).
- Reverse-engineering tools ↔ `BOOK-GRAY-HAT.md` Ch 3.
- Incident workflow ↔ `CJCSM-6510.01B.md` · `DJSIG.md` · `NIST-SP-800-61`.

---

## Exam-testable concepts (rapid-fire)

- **Three types of malware analysis?** Static, Dynamic, Hybrid.
- **Magic bytes for Windows PE?** `MZ` (`4D 5A`).
- **Magic bytes for ELF?** `7F 45 4C 46`.
- **Magic bytes for ZIP (and modern Office docs)?** `PK..` (`50 4B 03 04`).
- **Fuzzy hash for file similarity?** ssdeep (or TLSH).
- **Hash that fingerprints a PE's import table?** imphash.
- **Open-source reversing suite from NSA?** Ghidra.
- **Linux syscall tracer?** strace.
- **Linux library-call tracer?** ltrace.
- **Windows file / reg / net monitor from Sysinternals?** Process Monitor (ProcMon).
- **Common Windows packer (open source)?** UPX.
- **Pattern-matching language for files / memory?** YARA.
- **Memory-forensics framework?** Volatility.
- **Volatility plugin to detect code injection?** malfind.
- **Common anti-debug API?** `IsDebuggerPresent`.
- **Common anti-VM technique?** CPUID hypervisor bit / VMware registry keys.
- **Mutex purpose in malware?** Single-instance check (avoid re-infecting).
- **MITRE's general-purpose SIEM detection language?** Sigma.
- **Sharing standard for IOCs?** STIX (over TAXII).
- **Open-source threat-intel platform?** MISP.
- **Pyramid of Pain: hardest-to-change for attackers?** TTPs / behaviors.
- **First step when finding a malware infection?** Contain (isolate).
- **Preserve what before eradication?** Memory and disk images.

---

## Cross-references

- **[Blue Team Field Manual](../references/Blue%20Team%20Field%20Manual%20%28BTFM%29.pdf)** — text on disk.
- **[Practical Malware Analysis](https://nostarch.com/malware)** — Sikorski / Honig, industry-standard deep dive.
- **[MITRE ATT&CK](https://attack.mitre.org/)** · **[Sigma rules](https://github.com/SigmaHQ/sigma)**.
- **[MISP Project](https://www.misp-project.org/)** · **[STIX / TAXII](https://oasis-open.github.io/cti-documentation/)**.
- **[YARA Documentation](https://yara.readthedocs.io/)**.
- **[Cuckoo / CAPE Sandbox](https://capev2.readthedocs.io/)**.
- **[VirusTotal](https://www.virustotal.com/)** · **[Hybrid Analysis](https://hybrid-analysis.com/)** · **[ANY.RUN](https://any.run/)**.
- `BOOK-ART-MEM-FORENSICS.md` · `BOOK-NET-INTRUSION.md` · `BOOK-RTFM.md` · `JCAC-FORENSIC-MAL.md`.
