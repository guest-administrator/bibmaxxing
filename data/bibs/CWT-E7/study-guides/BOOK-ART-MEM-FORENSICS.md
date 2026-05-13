# Bib Study Guide — The Art of Memory Forensics

> **Bib reference:** *The Art of Memory Forensics: Detecting Malware and Threats in Windows, Linux, and Mac Memory* — Michael Hale Ligh, Andrew Case, Jamie Levy, AAron Walters (Wiley, 2014, ISBN 978-1-118-82509-9).
>
> **Regular-exam scope:** Study topic on **code injection**.
> **Substitute-exam scope:** not listed.
> **Union — what this guide covers:** memory forensics fundamentals with emphasis on **code injection techniques and their detection** via memory-image analysis (Volatility, Rekall, WinDbg).

**Posture:** This book is the canonical memory-forensics text. The Bib scope is tight — just the code-injection study topic — so this guide focuses on the **categories of injection**, the **in-memory artifacts each one leaves**, and the **Volatility plugins that surface them**. Pairs with `BOOK-WIN-INTERNALS-1.md` (processes / memory / security), `BOOK-PRACTICAL-MEM.md` (companion modern text), and `JCAC-FORENSIC-MAL.md`.

---

## Memory forensics in one page

### Why analyze memory

- **Volatile state captures attacker activity** that never touches disk (in-memory-only malware, reflective DLL loads, fileless Payloads).
- **Decrypted data** lives in RAM (session keys, credentials, TLS secrets).
- **Process trees, network connections, loaded modules** all visible.
- **Kernel rootkits** that hide from user-space tools are still visible in a raw memory image.

### Acquisition

Capture a full RAM image while the target is running (or a hibernation file):

| Tool | Platform | Notes |
|---|---|---|
| **WinPmem** | Windows | Aff4/raw output |
| **FTK Imager** | Windows | Forensic-grade tool |
| **Magnet RAM Capture** | Windows | Free |
| **DumpIt** | Windows | Simple single-EXE |
| **LiME (Linux Memory Extractor)** | Linux | Kernel module |
| **avml** | Linux | Userspace, no module needed |
| **Mac** | macOS | System-specific tooling, now limited by SIP/SSV |
| **Hibernation file** | Windows | `hiberfil.sys` on system drive |
| **Pagefile** | Windows | `pagefile.sys` (partial memory) |
| **Crash dump** | Windows | BSOD or forced via `NotMyFault` |
| **VM snapshot** | Virtualized | `.vmem` files from VMware; `.vbox` for VirtualBox |

### Analysis frameworks

- **Volatility** — the de facto standard. Python-based, plugin architecture. Versions: Volatility 2 (Python 2, feature-complete for older profiles), Volatility 3 (Python 3, symbol-based).
- **Rekall** — Google's fork (now dormant).
- **MemProcFS** — mounts a memory image as a filesystem.
- **WinDbg** — Microsoft's debugger; can analyze dumps.
- **Bulk Extractor** — string / pattern carving.
- **strings + grep** — simple but surprisingly effective.

### Core Volatility plugins (Windows)

| Plugin (Vol2) | Purpose |
|---|---|
| `imageinfo` / `kdbgscan` | Suggest OS profile |
| `pslist` | Processes via active list |
| `pstree` | Process tree |
| `psscan` | Scan memory for `_EPROCESS` structures (finds hidden) |
| `dlllist` | DLLs loaded per process |
| `ldrmodules` | Detects unlinked DLLs (common injection tell) |
| `handles` | Open handles per process |
| `netscan` | Network connections |
| `connscan` / `sockscan` | Legacy network scanners |
| `cmdline` | Command line per process |
| `cmdscan` / `consoles` | Command-history in cmd.exe |
| `envars` | Environment vars per process |
| `malfind` | Scan for injected code (key plugin) |
| `hollowfind` | Detect process hollowing |
| `apihooks` | Detect inline API hooks |
| `svcscan` | Windows services |
| `hivelist` / `printkey` | Registry hives and values |
| `cachedump` / `lsadump` / `hashdump` | Credential extraction |
| `procdump` | Dump a process's PE file |
| `memdump` | Dump a process's addressable memory |
| `vadinfo` / `vadtree` | Virtual-address descriptor (VAD) tree |
| `yarascan` | YARA rule match against memory |
| `timeliner` | Build a timeline from memory artifacts |

Linux profiles have analogous plugins: `linux_pslist`, `linux_psaux`, `linux_netstat`, `linux_check_syscall`, `linux_hidden_modules`, `linux_malfind`.

---

## Code Injection (Bib-scope topic)

**Code injection** = attacker's code running inside another process's address space.

Why attackers inject:

- **Stealth** — appear to be a legitimate process (evade process-based allowlists).
- **Privilege** — inherit the target's token / handles.
- **Hook into specific APIs** — e.g., inject into a browser to steal form data.
- **Bypass AV** — AV may trust certain processes; injection lets the payload inherit that trust.
- **Survive** — target process may be long-running; attacker stays resident.

### Categories of injection

#### 1. Classic remote-thread injection (CreateRemoteThread)

Steps:

1. `OpenProcess(PROCESS_ALL_ACCESS, FALSE, targetPID)`.
2. `VirtualAllocEx` remote memory in the target.
3. `WriteProcessMemory` to place shellcode or DLL path.
4. `CreateRemoteThread(target, ..., LoadLibraryA, remoteMemory, ...)` — calls `LoadLibrary` in target context with attacker DLL path.

**Artifacts in memory:**
- An **unsigned or suspicious DLL** in `dlllist` not expected for that process.
- A **thread** whose starting address is inside that DLL.
- Sometimes the DLL is dropped to disk (classic variant); reflective-load variant avoids disk.

**Volatility detection:**
- `malfind` — finds PAGE_EXECUTE_READWRITE regions that aren't backed by a mapped image.
- `ldrmodules` — DLL present in the VAD tree but missing from one of the three loader lists (InLoadOrderModuleList, InMemoryOrderModuleList, InInitializationOrderModuleList) = unlinked DLL.

#### 2. Reflective DLL injection

The DLL is written to memory and **resolves its own imports and relocations** — never passed to `LoadLibrary`, never referenced by the loader lists, never appears on disk.

Originally by Stephen Fewer — the canonical reflective loader. Adapted in Metasploit, Cobalt Strike.

**Artifacts:**
- Region of memory marked RWX with PE header at its start.
- Not in the DLL list.
- Threads executing inside it.

**Detection:**
- `malfind` — PE header (`MZ` / `PE` magic) in a non-image-backed region.
- YARA rules targeting reflective-loader byte patterns.

#### 3. Process hollowing

1. Create a **suspended** process (legitimate binary — `svchost.exe`, `explorer.exe`).
2. `NtUnmapViewOfSection` or `ZwUnmapViewOfSection` — remove the legitimate image.
3. `VirtualAllocEx` a new region at the same base (or wherever).
4. `WriteProcessMemory` the malicious image in.
5. `SetThreadContext` to point entry at malicious image.
6. `ResumeThread`.

Result: process name and command-line look legitimate; actual image is the attacker's.

**Artifacts:**
- Image on disk disagrees with image in memory.
- Process metadata (command-line, image path) points to legitimate binary; memory contains different code.

**Detection:**
- Volatility's **`hollowfind`** plugin compares on-disk vs in-memory image for each process.

#### 4. Process doppelgänging / herpaderping

NTFS transaction API (doppelgänging) or `SetFileInformationByHandle` + rename (herpaderping) to decouple on-disk file from in-memory image after process creation has already committed to the legitimate file.

**Artifacts:**
- File on disk doesn't match image in memory.
- Kernel audit (Sysmon) may catch the transaction.

**Detection:**
- Newer Sysmon events; dedicated EDR rules. Volatility can inspect the process's image section and compare to file on disk.

#### 5. Thread hijacking (SetThreadContext injection)

1. `OpenProcess` + `OpenThread` of a target thread.
2. `SuspendThread`.
3. `VirtualAllocEx` + `WriteProcessMemory` — write shellcode.
4. `GetThreadContext` + rewrite EIP/RIP to shellcode.
5. `SetThreadContext` + `ResumeThread`.

No new thread is created — execution hijacks an existing one. Stealthier against simple "new-thread in unknown DLL" detections.

**Artifacts:**
- RWX region with shellcode.
- Thread whose RIP is in a non-image region.

**Detection:**
- `malfind` for the RWX region.
- Thread analysis (`threads` plugin) to spot threads executing in atypical regions.

#### 6. APC (Asynchronous Procedure Call) injection

Queue a user-mode APC to a thread; when the thread returns to user mode (or alertable-wait state), the APC runs attacker code. Variant **Early Bird APC** queues before the thread even starts executing legitimate code.

**Detection:**
- Volatility `apihooks`; specialized EDR telemetry.

#### 7. AtomBombing

Write shellcode into the **global atom table** (shared across processes). Use `GlobalAddAtom` / `GlobalGetAtomName` from inside the target to read it back. Queue an APC to execute.

Creative 2016-era technique. Mitigated by modern EDR process memory inspection.

#### 8. DLL hijacking / side-loading

The victim process loads attacker's DLL because the DLL-search order found the attacker's copy first:
- Application directory.
- `C:\Windows\System32`.
- `C:\Windows\System`.
- `C:\Windows`.
- Current working directory.
- `%PATH%`.

Attacker drops a DLL with the expected name in the app's directory; legitimate signed EXE loads the attacker DLL.

**Artifacts:**
- Unsigned DLL in the application directory.
- DLL loaded from unexpected path.

**Detection:**
- Autoruns flags non-system-directory DLL loads.
- EDR: image-load events with unusual DLL paths.

#### 9. PE injection (classic)

Attacker writes a malicious PE (.exe or .dll) into target's memory and calls its `DllMain` or entry point via `CreateRemoteThread`. Similar artifacts to remote-thread injection but more data is written.

#### 10. Gargoyle / floating-code techniques

Payload alternates between executable and non-executable memory — sleeps in non-executable form (defeats memory scanners looking for RX regions), briefly flips to RX via `VirtualProtect` to run, then flips back.

#### 11. Module stomping

Attacker loads a legitimate signed DLL, then overwrites its code section with attacker shellcode. From the outside, the DLL looks legitimate (signed, from system directory, properly linked).

**Detection:**
- **`ldrmodules`** + integrity check of the DLL's on-disk bytes vs in-memory code region.

#### 12. Kernel-mode injection

Kernel rootkit injects code into kernel address space or into processes via kernel primitives (e.g., `KeInsertQueueApc` from a driver). Defeats user-mode EDR.

**Detection:**
- Kernel-integrity features (PatchGuard, HVCI), signed-driver enforcement, VBS.

### Linux code injection

- **ptrace + shellcode injection** — `ptrace(PTRACE_ATTACH, pid)`; `ptrace(PTRACE_POKETEXT)` to write shellcode; `PTRACE_SETREGS` to hijack IP.
- **LD_PRELOAD** — force a shared library into a process's address space at startup. Not "injection into running process" — acts at launch.
- **`/proc/<pid>/mem`** — write-access with appropriate capability allows direct memory writes into another process.
- **Kernel-module (LKM) rootkit** — syscall table hooks, VFS hooks, process hiding.

**Detection:**
- Volatility Linux profiles: `linux_malfind`, `linux_ldrmodules`, `linux_check_syscall`, `linux_hidden_modules`, `linux_lsof`.
- Integrity monitoring: AIDE, Tripwire.
- `kernel.yama.ptrace_scope = 1` limits ptrace to parent/child (Yama LSM).

---

## Memory-forensics investigation workflow

1. **Acquire** — image RAM as early as possible to preserve volatile artifacts.
2. **Identify profile** — `imageinfo` / `kdbgscan` to determine OS/version.
3. **Baseline** — enumerate processes (`pslist` + `psscan` for diff), network (`netscan`), DLLs, services, drivers.
4. **Hunt for anomalies**:
   - `malfind` for RWX regions with PE headers or shellcode patterns.
   - `ldrmodules` for unlinked DLLs.
   - `hollowfind` for process hollowing.
   - `apihooks` for inline hooks.
   - Processes whose parent doesn't match convention (e.g., `explorer.exe` as parent of `cmd.exe` launched from a non-interactive path).
5. **Dump suspicious artifacts** — `procdump`, `memdump`, extract for static analysis.
6. **Correlate** with disk and network evidence.
7. **Write timeline** — `timeliner` plugin + filesystem metadata.

### YARA in memory

YARA rules target byte/string patterns in binaries. Volatility's `yarascan` applies them to memory:

```
yarascan -Y "meterpreter" --pid 4567
yarascan --yara-rules=rules.yara
```

Common rules: Cobalt Strike beacon signatures, Mimikatz strings, known C2 URL patterns, Metasploit meterpreter artifacts.

### Credential extraction from memory

Classic attacker & defender exercise:

- **`hashdump`** — recovers SAM hashes from the registry hive loaded in memory.
- **`cachedump`** — cached domain credentials (MSCache v1/v2 hashes).
- **`lsadump`** — LSA secrets.
- **`mimikatz` plugin** (Volatility) — extract Mimikatz-style artifacts from memory: Kerberos tickets, Wdigest, tspkg, kerberos logonpasswords, plaintext passwords (on older Windows / older patch levels).

### Rootkit detection techniques

- **Cross-view analysis** — compare active-list process enumeration against memory-scan enumeration. Hidden processes appear only in scan.
- **IDT / SSDT verification** — in memory, check that syscall table entries point into `ntoskrnl.exe` (or legitimately-loaded drivers), not into an unknown driver.
- **Hidden-module detection** — search for kernel modules not in the `PsLoadedModuleList`.
- **PFN database walk** — find pages allocated to processes that aren't in the process list.

---

## Cross-book connections

- Memory fundamentals ↔ `BOOK-OS-CONCEPTS.md` Ch 8–9 · `JCAC-OS.md` §14 · `BOOK-WIN-INTERNALS-1.md` Memory Management.
- Windows process structures ↔ `BOOK-WIN-INTERNALS-1.md` (EPROCESS, ETHREAD).
- Volatility plugin use ↔ `JCAC-FORENSIC-MAL.md`.
- Code-injection offensive side ↔ `BOOK-GRAY-HAT.md` Ch 10 (memory corruption), `JCAC-ACTIVE-EXPLOIT.md` §9 (Sustaining Access).
- MITRE mapping: T1055 Process Injection family.

---

## Exam-testable concepts (rapid-fire)

- **Canonical memory-forensics tool?** Volatility.
- **Windows memory-capture tool examples?** WinPmem, FTK Imager, Magnet RAM Capture, DumpIt.
- **Linux memory capture kernel module?** LiME. Userspace alternative? avml.
- **Plugin to find injected code?** `malfind` (Volatility).
- **Plugin to detect process hollowing?** `hollowfind`.
- **Plugin that compares VAD-listed DLLs against the three loader lists?** `ldrmodules`.
- **Plugin for hidden-process scan?** `psscan`.
- **Plugin to dump a process's PE?** `procdump`.
- **Plugin to extract credential hashes?** `hashdump`.
- **Plugin to extract LSA secrets?** `lsadump`.
- **Plugin to run YARA rules against memory?** `yarascan`.
- **Why are reflective-loaded DLLs invisible to `dlllist`?** They're never registered via `LoadLibrary`; loader lists never include them.
- **How does process hollowing evade initial detection?** Process has a legitimate name, path, and command-line; only the image in memory is different.
- **MITRE ATT&CK technique for process injection?** T1055 (with many sub-techniques — T1055.001 DLL injection, .002 PE injection, .003 Thread Execution Hijacking, .004 APC, .012 Process Hollowing, .013 Doppelgänging).
- **Linux kernel LSM that restricts ptrace?** Yama (`kernel.yama.ptrace_scope`).
- **Hibernation file name on Windows?** `hiberfil.sys`.
- **Pagefile on Windows?** `pagefile.sys`.
- **Volatility plugin for Windows network connections?** `netscan`.
- **Why inject into an existing process rather than spawn a new one?** Stealth (legitimate process name / path), inherit its token / handles, evade AV trust of attacker's binary.

---

## Cross-references

- **[The Art of Memory Forensics](../references/The%20Art%20of%20Memory%20Forensics%20-%20Detecting%20Malware%20and%20Threats%20in%20Windows,%20Linux,%20and%20Mac%20Memory-9781118824993.pdf)** — text on disk.
- **[Volatility Foundation](https://www.volatilityfoundation.org/)** · **[Volatility 3 docs](https://volatility3.readthedocs.io/)**.
- **[MITRE ATT&CK T1055 Process Injection](https://attack.mitre.org/techniques/T1055/)**.
- **[Sysinternals Sysmon](https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon)** — endpoint telemetry for correlation.
- **[YARA documentation](https://yara.readthedocs.io/)**.
- `BOOK-WIN-INTERNALS-1.md` · `BOOK-OS-CONCEPTS.md` · `JCAC-FORENSIC-MAL.md` · `BOOK-GRAY-HAT.md`.
