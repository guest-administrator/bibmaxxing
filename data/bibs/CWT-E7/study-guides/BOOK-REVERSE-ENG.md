# Bib Study Guide — Mastering Reverse Engineering

> **Bib reference:** *Mastering Reverse Engineering* — Reginald Wong (Packt, 2018, ISBN 978-1-78883-529-9).
>
> **Regular-exam scope:** Study topics on **preparing to reverse** and **reverse engineering as a process**.
> **Substitute-exam scope:** same study topics.
> **Union — what this guide covers:** the operational discipline of reverse engineering — building the lab, triaging a sample, walking through static and dynamic analysis, capturing IOCs and notes, and not melting the analyst's machine in the process.

**Posture:** The on-disk PDF is a corrupt export. This guide is written against the canonical free sources: **MalwareUnicorn's RE101 and RE102** workshops, **Reverse Engineering for Beginners** (Yurichev), **NSA Ghidra** with the **Wrongbaud Ghidra training**, and adjacent free RE references. Pairs with `BOOK-ASM-PROG.md` (the register-level vocabulary RE depends on), `BOOK-ART-MEM-FORENSICS.md` (memory-forensics counterpart), and `JCAC-FORENSIC-MAL.md` (forensic-methodology framing).

The Bib scope is deliberately about **process** rather than any single technical trick. Treat this guide as a checklist — the right order of operations, with the right tool at each step, and the right notes coming out.

---

## What reverse engineering is

Reverse engineering (RE) of a binary is the process of recovering enough understanding of what a program does to answer a specific operational question: *Is it malicious? What does it do on the network? Does it persist? Where does it inject? What family does it belong to? What are the IOCs?*

The goal is rarely full reconstruction of the source code. It's enough fidelity, on the right slice of the program, to answer the question and move on. CWT-level RE is fast triage + targeted depth, not all-up decompilation.

---

## The four phases of an RE engagement

A workable process for any unknown binary:

1. **Triage** — what is the file, what platform, what packer/obfuscator, what is the family hypothesis?
2. **Static analysis** — read the binary without running it: strings, imports, sections, embedded resources, decompiled functions.
3. **Dynamic analysis** — run the binary in a controlled lab; observe what it does to the OS, filesystem, registry, network.
4. **Reporting** — capture IOCs, behavior summary, MITRE ATT&CK mapping, prevention/detection guidance.

Real engagements iterate between 2 and 3 as findings raise new questions.

---

## Phase 1 — Triage

The single hour at the start that frames everything after it. Spend it; do not skip it.

### 1.1 Identify the file

| Tool | What it tells you |
|---|---|
| `file sample.bin` | High-level format guess (PE32+ / ELF 64-bit / Mach-O / DLL / archive / script). Quick and lying-friendly — packers fool it. |
| `pesieve` / `peid` / `Detect-It-Easy (DiE)` | Compiler / linker / packer fingerprints; YARA-style identification of UPX, ASPack, Themida, VMProtect, .NET ConfuserEx, etc. |
| `exiftool` | Embedded metadata — author, original filename, timestamps. Often leaked. |
| `strings -e l` (UTF-16) and `strings -a` | Quick read of human-readable bytes. Look for URLs, mutex names, file paths, registry keys, error strings. |
| `pestudio`, `pe-bear`, `cffexplorer` | PE structure inspection: imports, exports, sections, resources, anomalies. |
| `readelf -a`, `objdump -d -M intel` | ELF structure inspection. |

### 1.2 Hash and check repositories

- Compute SHA-256: `sha256sum sample.bin` / `Get-FileHash`. Use SHA-256 from this point; MD5 only when an old tool demands it.
- Search public corpora **(only if the sample isn't sensitive)** — **VirusTotal**, **MalwareBazaar (abuse.ch)**, **MalShare**, **ANY.RUN**. Uploading commits the sample to those services forever, so this step is irreversible — confirm OPSEC before submitting.
- For sensitive samples, search locally only — internal sandboxes, internal threat-intel platforms. **Never upload customer-supplied or operationally sensitive samples to public services.**

### 1.3 Packer / obfuscator detection

Most production malware is packed. A 100-KB binary with only kernel32.dll imports and a single 90-KB high-entropy section is packed. Triage tells:

- **High-entropy sections** (entropy > 7.5 on a 0–8 scale) — compressed or encrypted.
- **Tiny import table** (only `LoadLibraryA` + `GetProcAddress`) — imports are resolved at runtime.
- **Section names** like `UPX0`, `UPX1`, `nsp0`, `aspack` — packer-specific signatures.
- **Unusual entry point** (in last section, far from code section) — packer stub.

**Common packers and how to unpack:**

| Packer | Unpacker / Approach |
|---|---|
| UPX | `upx -d sample.exe` (manual unpack with the same tool) |
| ASPack / FSG / MPRESS | Run to OEP and dump (x64dbg + Scylla) |
| Themida / VMProtect | Hard — virtualized obfuscation; partial via runtime tracing |
| Custom XOR shim | Find the decrypt loop in static, run dynamically, dump after decrypt |
| .NET ConfuserEx | de4dot |
| .NET Reactor / Eazfuscator | de4dot |

### 1.4 Hypothesis

After the first hour you should have a short list:
- File type and architecture.
- Suspected family or capability (downloader, dropper, RAT, ransomware, stealer, lateral-movement tool).
- Packer status.
- Known-bad indicators (hash match, string match, code-similarity match to a known family).
- One or two **questions to answer** in the rest of the analysis.

Write the hypothesis down. Update it as you go.

---

## Phase 2 — Static analysis

Static analysis reads the binary at rest. Cheap (no execution risk), fast, and produces durable artifacts. Do as much here as the obfuscation permits.

### 2.1 Strings

`strings -a sample.bin` is crude but effective. Filter for the things attackers reach for:
- URLs / domains (regex `://`).
- IPv4 / IPv6 addresses.
- Registry keys (`HKEY_`, `Software\\`).
- File paths (`C:\\`, `/etc/`, `/tmp/`, `%APPDATA%`).
- Mutex / pipe / event names (often `\\\\.\\` prefix on Windows).
- API names hidden in imports (`LoadLibrary`, `GetProcAddress`, `VirtualAlloc`, `WriteProcessMemory`, `CreateRemoteThread`).
- Configuration strings ("config", "key", "user-agent", language-specific keywords).

UTF-16 strings dominate in Windows binaries — use `strings -e l` for little-endian wide chars.

### 2.2 Imports / exports

A function's imports are the most concise behavioral summary. Pattern matches:

| Imports cluster | Likely capability |
|---|---|
| `CreateToolhelp32Snapshot`, `Process32First`, `Process32Next` | Enumerates running processes (recon, anti-VM, anti-AV) |
| `OpenProcess`, `VirtualAllocEx`, `WriteProcessMemory`, `CreateRemoteThread` | Classic remote-thread injection |
| `VirtualAlloc(PAGE_EXECUTE_READWRITE)` (private mapping) | Self-injection / shellcode loader |
| `RegOpenKeyEx`, `RegSetValueEx` on a Run key | Persistence |
| `CreateMutex` | Single-instance lock (mutex name is a strong IOC) |
| `WS2_32!socket`, `connect`, `send`, `recv` | Raw network I/O (C2 or scanning) |
| `WinHttpOpen`, `InternetOpenA`, `WinINet` | HTTP / HTTPS network I/O |
| `CryptAcquireContext`, `CryptEncrypt`, `BCrypt*` | Built-in Windows crypto API (ransomware tells) |
| `NtMapViewOfSection`, `NtUnmapViewOfSection`, `SetThreadContext`, `ResumeThread` | Process hollowing |

### 2.3 Sections and resources

Windows PE:
- `.text` — code (RX).
- `.rdata` — read-only data, strings, imports.
- `.data` — RW data, globals.
- `.rsrc` — embedded resources (icons, dialogs, manifest, often hidden payloads).
- Anomalous section names → packer or compiler-specific (`.aspack`, `.UPX1`, `.themida`).

`.rsrc` is where second-stage payloads commonly hide. Walk it with `Resource Hacker` (Windows) or `wrestool` (Linux). Look for embedded EXE / DLL / shellcode signatures (`MZ`, `\x4d\x5a`).

ELF:
- `.text` — code.
- `.rodata` — read-only data.
- `.data` / `.bss` — globals.
- `.dynsym`, `.dynstr` — dynamic symbol resolution.
- Unusual sections, large unstructured `.data` → packed.

### 2.4 Disassembly + decompilation

**The free tool: NSA Ghidra.**

Ghidra's value proposition is the **decompiler**. Reading raw assembly is slow; reading C pseudocode (even when imperfect) is fast. Workflow:

1. Open Ghidra, create a project, drag the binary into it.
2. Let auto-analysis run (the first time can take a few minutes).
3. Open the **Symbol Tree** → **Functions**. Sort by size; the largest functions are often the main behavior.
4. Open the **Function Graph** and **Decompiler** side by side.
5. Rename functions and variables as you understand them. Ghidra propagates renames.
6. Take notes in **comments** at meaningful instructions (the comments stay with the project).

**Tips for reading decompiled output:**
- Track every call to `LoadLibrary` / `GetProcAddress` — those are the runtime-resolved imports. Note the resulting function pointers.
- Recognize **API hashing**: a loop that walks `PEB->Ldr->InMemoryOrderModuleList`, calls a hash function on each export name, compares the hash to a constant. This pattern is "hashed imports" — common in shellcode.
- Recognize **string obfuscation**: strings built byte-by-byte via XOR, stack assembly (`mov byte ptr [rbp-0x10], 'C'`), or RC4-decrypted from a `.rdata` blob. Ghidra's **Script Manager** has a string-deobfuscator template.
- Recognize **anti-debug**: `IsDebuggerPresent`, `CheckRemoteDebuggerPresent`, `NtQueryInformationProcess(ProcessDebugPort)`, PEB `BeingDebugged`/`NtGlobalFlag`, time-stamp deltas (`rdtsc` before / after).

**Other tools to know exist:**
- **IDA Pro** — commercial; the historic standard. IDA Free has a decompiler now.
- **Binary Ninja** — modern commercial alternative; great IL.
- **radare2 / Cutter** — open-source CLI / GUI pair.
- **objdump** + a strong editor — works for small binaries.

### 2.5 YARA-based pivoting

YARA rules are signature-style matching over file contents. Use cases:
- Match strings + imports patterns to identify the family (`yara family.yar sample.bin`).
- Hunt across a directory for similar binaries.
- Write a rule from this sample to feed the next investigation.

**Public rule sets:**
- **YARA-Rules** (`github.com/Yara-Rules/rules`) — community rules.
- **florianroth/signature-base** — large curated repo (formerly used by Loki scanner).
- **Mandiant Capa** — runs over a binary, emits a list of capability matches (uses YARA + custom rule language internally).

---

## Phase 3 — Dynamic analysis

Run the binary in a sandbox. Static analysis tells you what the binary *can* do; dynamic tells you what it *does*.

### 3.1 The lab

The non-negotiable: **isolated**, **revertible**, **monitored**.

| Layer | Choice |
|---|---|
| Host | A separate physical machine, or a strongly-isolated VM host. Do not analyse on your daily-driver. |
| Hypervisor | VMware Workstation / Fusion / ESXi, or VirtualBox, or QEMU/KVM. Snapshots are mandatory. |
| Guest OS | Match the target — Windows 10/11 64-bit for most modern malware; specific service-pack levels if the sample needs older API surface. |
| Network | Default: isolated host-only network with a fake internet (INetSim, FakeNet-NG, Wireshark on the host-only NIC). Some samples need real internet to behave; you'll cut that over carefully and only when needed. |
| Time | Set guest time to whenever the operator expects the malware to be active (some samples behave differently before / after a hard-coded date). |
| Snapshots | Take one immediately after fresh install + tool installation. Revert before every sample. |

**Common analysis distros / configs:**
- **FlareVM** — Windows analyst distribution; one-script-install of Ghidra, x64dbg, Detect-It-Easy, Wireshark, PE-Bear, Resource Hacker, Process Hacker, Procmon, ProcessExplorer, autoruns, pestudio, FakeNet, INetSim, ApiMonitor, and more. From Mandiant / Google.
- **REMnux** — Linux analyst distribution; focused on static analysis, network artifacts, document carving (PDF / Office), and the more memorable old-school RE tools.
- **Tsurugi Linux** — DFIR distro with RE tooling.

### 3.2 Instrumentation

Run these in the guest before detonation:

| Tool | What it captures |
|---|---|
| **Procmon** (Process Monitor) | All filesystem, registry, network, process operations. Filter by process tree. |
| **Process Hacker** / **Process Explorer** | Live process tree with thread / handle / DLL detail. |
| **autoruns** | Snapshot of persistence locations before and after — diff to see what the sample added. |
| **Wireshark** (on host-only NIC) | Full packet capture. |
| **Sysmon** (with `swiftonsecurity` config) | High-fidelity Windows event log — process create, network connect, image load, DNS, registry, named pipe. |
| **FakeNet-NG** / **INetSim** | Respond to DNS / HTTP / HTTPS / TLS / SMTP / IRC with fakes so the sample reveals C2 intent without reaching real infra. |
| **API Monitor** | Hook + log API calls — useful when you want a focused view of a small set of APIs. |

### 3.3 Detonation

```
1. Revert VM to clean snapshot.
2. Start instrumentation (Procmon, Wireshark, Sysmon).
3. Take an "autoruns" snapshot (baseline).
4. Place the sample. Rename to .exe if necessary.
5. Run the sample (right-click → Run as administrator if it expects elevation).
6. Wait the appropriate observation window (1–10 minutes for most samples).
7. Take a second "autoruns" snapshot; diff.
8. Save all logs out (Procmon CSV, Sysmon evtx, pcap, autoruns diff).
9. Optionally take a **memory image** of the running VM (snapshot pauses the VM; the `.vmem` is a raw memory dump).
10. Revert.
```

### 3.4 Debugging

When dynamic observation isn't enough — you need to step through specific code paths — attach a debugger.

| Debugger | When |
|---|---|
| **x64dbg / x32dbg** | The free Windows go-to. Plugin ecosystem (Scylla for dumping, ScyllaHide for anti-anti-debug). |
| **WinDbg / WinDbg Preview** | Microsoft's official debugger. Required for kernel-mode work. |
| **gdb + GEF/pwndbg/peda** | Linux user-mode and kernel debugging (with QEMU + kgdb). |
| **Frida** | Dynamic instrumentation — hook functions in a live process from a script. Cross-platform. |
| **IDA Pro / Binary Ninja** | Their own debuggers, integrated with the disassembler. |

**Anti-debug bypass:**
- Set `BeingDebugged` and `NtGlobalFlag` in PEB to clean values.
- Hook `IsDebuggerPresent`, `CheckRemoteDebuggerPresent`, `NtQueryInformationProcess` to lie.
- Use a plugin (ScyllaHide) that does all the above at once.

### 3.5 Sandboxes (when you don't have time to detonate by hand)

| Sandbox | Notes |
|---|---|
| **CAPE Sandbox** | Open-source; Cuckoo successor; injects monitoring; extracts config from many families automatically. |
| **Cuckoo Sandbox** | Older; still functional for many use cases. |
| **ANY.RUN** | Hosted; interactive; public submissions are public. |
| **Joe Sandbox** | Commercial; deepest behavior detail. |
| **Triage** (Hatching) | Commercial; very fast; good for triage corpora. |

A sandbox report is a starting point, never the conclusion. Sandboxes miss conditional behavior (sleeps, mutex checks, environment checks, AV checks). Always sanity-check against your own dynamic analysis.

---

## Phase 4 — Reporting and IOCs

The deliverable. CWT-level RE reports usually have:

### 4.1 Summary

A two-paragraph plain-English statement of what the sample is and what it does. Lead with the verdict; then the high-confidence behaviors. Do not bury the answer.

### 4.2 IOCs

The pivot points anyone else can use to find this thing elsewhere on the network:

| IOC type | Examples |
|---|---|
| Hash | SHA-256 of the file. Add SHA-1, MD5 for legacy compatibility but lead with SHA-256. |
| Filename / path | Where it dropped itself, what it renamed to. |
| Mutex | The single-instance mutex name. |
| Registry key | Persistence locations it wrote. |
| Service name / scheduled task | The persistence vehicle. |
| Process name / parent / command line | What the running malware looks like. |
| Network — domain | C2 / download infrastructure. |
| Network — IP | Same. |
| Network — URL | Full URL with path / query, including User-Agent strings. |
| YARA rule | The rule that catches this binary (and ideally its family). |

### 4.3 ATT&CK mapping

For every observed technique, map to **MITRE ATT&CK Enterprise** (`attack.mitre.org`). The mapping helps the defenders prioritize detection coverage and tells the next analyst what kind of family this is.

### 4.4 Detection / hunting guidance

For each behavior, write a one-line detection idea:
- "Sysmon EID 1 — `CommandLine contains '/c powershell.exe -EncodedCommand'`."
- "Sysmon EID 11 — File write to `%APPDATA%\Roaming\<random>\<random>.exe`."
- "Sysmon EID 3 — Network connect from `%TEMP%\*.exe`."
- "Procmon — `RegSetValue` under `Software\Microsoft\Windows\CurrentVersion\Run` by a process under `%TEMP%`."

### 4.5 Disposition

State explicitly whether this is malicious, benign, or unknown / inconclusive. Add a confidence level. Junk analyses leave the reader to guess; good analyses lead with the answer.

---

## OPSEC for the analyst — protect yourself, not the malware

The Bib's "preparing to reverse" study topic is partly about analyst safety:

- **Never execute on the daily-driver.** No exceptions.
- **Never share a sample on a public corpus without OPSEC clearance.** VirusTotal uploads are public to the entire industry forever.
- **Handle credentials defensively.** If the sample is a stealer, it'll exfil whatever you happen to have logged in. Lab credentials only.
- **Encrypt sample storage.** Most laptops have FDE — make sure the analysis area is on the encrypted volume.
- **Air-gap the lab from production.** No shared drives, no domain join, no production credentials in the guest.
- **Track everything.** Tool versions, command lines, time stamps, hashes before / after each step.

---

## Mapped to Bib study topics

| Bib topic | Where the answer lives |
|---|---|
| **Preparing to reverse** | Phase 1 (Triage) + the OPSEC section: isolated host, revertible VM, instrumented network, recorded provenance. |
| **Reverse engineering as a process** | The four-phase loop (Triage → Static → Dynamic → Reporting) and the iteration between Phase 2 and Phase 3. |

---

## Common exam-style question stems (open-source framing)

- "First action before opening an unknown sample?" — **Compute SHA-256, document provenance, take a clean VM snapshot.**
- "Tool best suited for static analysis of an unknown PE without source code?" — **A disassembler / decompiler — Ghidra (free, NSA), IDA Pro (commercial), or Binary Ninja.**
- "Memory-region property that indicates an injected payload?" — **Private, executable, not file-backed (RWX VAD region in Windows; equivalent in Linux).**
- "Why use a separate, isolated network for dynamic analysis?" — **Contain real-world impact; capture intended C2 behavior without reaching real infrastructure.**
- "Free open-source tool for runtime instrumentation that hooks arbitrary functions?" — **Frida.**
- "What does an unpacker like UPX do?" — **Decompresses the encoded program back into its original code section at runtime, transferring control to the **original entry point (OEP)**.**
- "Why are imports useful as a behavioral summary?" — **The Windows API call surface tells you what capabilities the binary will exercise, even before you run it.**
- "What is API hashing in malware?" — **Compute hashes of API names at compile time, compare those hashes against a runtime walk of loaded modules' exports — defeats simple import-table analysis.**
- "Standard MITRE framework for describing observed behavior?" — **ATT&CK Enterprise.**
- "First public corpus to check for a hash hit (when OPSEC permits)?" — **VirusTotal; corroborate with MalwareBazaar.**

---

## How to actually study this on the boat

1. Read MalwareUnicorn RE101 cover to cover. Do the labs.
2. Read RE102 once you've finished RE101. Anti-RE techniques are the upper-division material.
3. Install Ghidra; work through the Wrongbaud Ghidra training (four sessions, ~10 hours).
4. Read Yurichev's "Reverse Engineering for Beginners" Parts 1–3 — calling conventions and basic C/C++ patterns.
5. Build a FlareVM (one script). Run the labs from MalwareUnicorn against it.
6. Submit a benign EXE you wrote to a sandbox. Read the report; compare to your own analysis.

---

## Free / adjacent sources (canonical)

- **MalwareUnicorn — Reverse Engineering 101** — Amanda Rousseau's free hands-on workshop. The single best on-ramp. `https://malwareunicorn.org/workshops/re101.html`
- **MalwareUnicorn — Reverse Engineering 102** — anti-RE techniques (VM detection, packing, obfuscation). `https://malwareunicorn.org/workshops/re102`
- **NSA Ghidra (official)** — `https://github.com/NationalSecurityAgency/ghidra`. Free SRE framework comparable to IDA Pro.
- **Wrongbaud — Introduction to Reverse Engineering with Ghidra** — practical hands-on Ghidra course. `https://wrongbaud.github.io/posts/ghidra-training/`
- **Reverse Engineering for Beginners (Yurichev, `beginners.re`)** — 942-page free textbook, CC BY-SA. Calling conventions, code patterns, data structures.
- **NSA Codebreaker Challenge** — `https://codebreaker.ltsnet.net/home`. Annual CTF; practical RE + crypto problems.
- **Practical Malware Analysis & Triage (TCM Academy / OpenSecurityTraining2)** — free options for full courses.

---

## Cross-references

- `BOOK-ASM-PROG.md` — register / calling-convention vocabulary that RE reads off the page.
- `BOOK-ART-MEM-FORENSICS.md` — the memory-forensics counterpart; once a sample injects, this is where the defender lands.
- `BOOK-PRACTICAL-MEM.md` — Linux memory acquisition paths a dynamic-analysis lab uses.
- `JCAC-FORENSIC-MAL.md` — JCAC forensic / malware-analysis methodology framing.
- `BOOK-GRAY-HAT.md` — offensive perspective on the same techniques.
- `BOOK-WIN-INTERNALS-1.md` — Windows internals that RE depends on (PEB, TEB, loader, syscalls).
