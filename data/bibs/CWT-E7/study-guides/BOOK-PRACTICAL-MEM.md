# Bib Study Guide — Practical Memory Forensics

> **Bib reference:** *Practical Memory Forensics* — Svetlana Ostrovskaya, Oleg Skulkin (Packt, 2022, ISBN 978-1-80107-954-9).
>
> **Regular-exam scope:** Chapters **5** and **7**.
> **Substitute-exam scope:** Chapter 9 (overlaps).
> **Union — what this guide covers:** detecting **malware in Windows memory** (Chapter 5) and **acquiring Linux memory** safely (Chapter 7).

**Posture:** The on-disk PDF is a corrupt export. This guide is written against the canonical free sources: the **Volatility Foundation framework documentation** and the **Volatility 3 source**, the **LiME Linux Memory Extractor** project, and **Microsoft AVML**. Pairs with `BOOK-ART-MEM-FORENSICS.md` (the deep-dive Windows memory-forensics text — same toolchain, broader scope) and `JCAC-FORENSIC-MAL.md` (forensic-methodology framing).

---

## Memory forensics in one paragraph

Volatile memory holds the runtime state the disk never sees: in-memory-only payloads, injected code, decrypted strings, session keys, live network connections, command-line arguments, loaded modules, and the kernel's view of who is running. Memory forensics is the discipline of capturing that state into a static image and reasoning about what was happening at capture time. The two halves of the practice are **acquisition** (turn live RAM into a forensically sound image without altering it) and **analysis** (parse the image with structured tools so the result is reproducible and defensible).

The book's Chapter 5 is the analysis half — Windows malware specifically — and Chapter 7 is the acquisition half — Linux specifically. Together they give you both ends of the same workflow on the two operating systems CWT analysts most often meet in incident response.

---

## Chapter 5 — Detecting Malware in Windows Memory

The Windows malware-detection scope leans on Volatility (the de-facto open-source framework) and a small recurring set of analytical questions. Every question maps to one or more Volatility plugins.

### The malware analysis loop (memory edition)

1. **Identify the image profile / symbol table** — Volatility 2 calls this the profile (e.g. `Win10x64_19041`); Volatility 3 uses **PDB-based symbol tables** that it downloads from Microsoft's symbol server (cached locally).
2. **Enumerate processes** — pslist, pstree, psscan. Compare results — disagreement implies hiding.
3. **Inspect process metadata** — command-line arguments, environment, parent / child lineage, integrity level, image path on disk.
4. **Inspect process memory** — loaded modules, handles, network connections, registry hives held open, injected regions.
5. **Look at the kernel** — driver list, SSDT hooks, IDT, callbacks, IRP hooks.
6. **Recover artifacts** — dump suspicious processes, scan with YARA, extract strings, regenerate a binary, hand off to static analysis.
7. **Build a timeline** — order events to produce a narrative.

### 5.1 Process enumeration — three angles

Volatility maintains three different ways to walk processes; each catches what the others miss.

| Plugin (Vol2) | Vol3 equivalent | How it finds processes |
|---|---|---|
| `pslist` | `windows.pslist` | Follows the active-process doubly-linked list rooted at `PsActiveProcessHead` |
| `pstree` | `windows.pstree` | Same data, displayed as a parent / child tree |
| `psscan` | `windows.psscan` | Scans the entire memory image for `_EPROCESS` signatures, regardless of whether they're still linked |

**Detection logic:** when `psscan` shows processes that `pslist` does not, the kernel's process list was unlinked — classic Direct Kernel Object Manipulation (DKOM) hiding. Run both, diff the PIDs.

### 5.2 Process metadata

Once you have a candidate process, you want to know what it is:

| What | Plugin (Vol2) | Vol3 |
|---|---|---|
| Image filename + on-disk path | implicit in `pslist` | `windows.pslist` |
| Command-line arguments | `cmdline` | `windows.cmdline` |
| Environment variables | `envars` | (use volshell / sym query) |
| User SID + integrity level | `getsids` | `windows.getsids` |
| Parent / child | `pstree` | `windows.pstree` |
| Times (creation, exit) | `pslist` | `windows.pslist` |

**Common malicious patterns** Chapter 5 highlights:
- A process with `svchost.exe` filename but **no parent** matching `services.exe` (legitimate svchosts always parent off services).
- `cmd.exe`, `powershell.exe`, or `mshta.exe` parented off `winword.exe` / `excel.exe` (Office macro execution).
- Image path under `%TEMP%`, `%APPDATA%`, `%PUBLIC%`, or `C:\Users\Public\` for a process running with high integrity.
- Random / disposable process names (eight hex chars, GUID-like).
- Process **created inside a service host** (`svchost.exe -k netsvcs`) but with a command line that does not list a hosted service.

### 5.3 Loaded modules and DLL injection

A Windows process loads DLLs into its address space. Malware that injects code must place that code somewhere; the where is what gives it away.

| Plugin (Vol2) | Vol3 | What it shows |
|---|---|---|
| `dlllist` | `windows.dlllist` | DLLs the loader knows about (linked into the PEB's `LDR_DATA_TABLE_ENTRY` lists) |
| `ldrmodules` | `windows.ldrmodules` | Same modules, but compared against the three independent loader lists. Anomalies (present in one, absent from another) are classic injection tells. |
| `malfind` | `windows.malfind` | Scans process memory for regions that are RWX *and* not backed by a file *and* contain executable signatures (MZ / `0xE8` / `0xE9` / VAD private + executable). Single most useful injection-detection plugin. |
| `vadinfo` / `vadtree` | `windows.vadinfo` | Walk the Virtual Address Descriptor tree — the kernel's record of every memory region a process owns. Look for private regions with `PAGE_EXECUTE_READWRITE`. |
| `hollowfind` (plugin) | community plugin | Detect **process hollowing** — when a process's main image was replaced after creation. |
| `apihooks` | community plugin | Detect inline hooks of API functions (IAT / EAT / inline). |

**The injection-detection rule of thumb:** executable memory in a private VAD that isn't backed by an image on disk is suspect. `malfind` codifies this rule.

### 5.4 Handles and tokens

| Plugin (Vol2) | Vol3 | Use |
|---|---|---|
| `handles` | `windows.handles` | Enumerate open handles per process — files, registry keys, mutants, named pipes |
| `mutantscan` | `windows.mutantscan` | Scan for mutants (mutexes) — many malware families use a hard-coded mutex name as a single-instance lock; these are excellent IOCs |
| `getsids` | `windows.getsids` | Identify the user the process runs as |
| `privileges` | `windows.privs` | Enumerate token privileges (SeDebugPrivilege presence is a strong signal) |

### 5.5 Network connections

| Plugin (Vol2) | Vol3 | Use |
|---|---|---|
| `netscan` | `windows.netscan` / `windows.netstat` | Listening sockets + active TCP/UDP connections |
| `connections` / `connscan` / `sockscan` | (legacy) | Pre-Win7 alternatives |

Beaconing C2 looks like a single process maintaining outbound TCP connections to one or two IPs. **Process-without-network-context** matters: PowerShell with an active TCP connection is unusual; svchost with an outbound connection is normal — but svchost in `%TEMP%` is not.

### 5.6 Persistence in memory

| Surface | Plugin |
|---|---|
| Services | `svcscan` / `windows.svcscan` |
| Registry hives loaded in kernel | `hivelist`, `printkey` / `windows.registry.hivelist`, `windows.registry.printkey` |
| Drivers | `modules`, `modscan`, `driverscan` / `windows.modules`, `windows.modscan`, `windows.driverscan` |
| Callbacks (notify routines) | `callbacks` (community) |
| SSDT hooks | `ssdt` (community) |
| WMI subscription | offline parsing of `OBJECTS.DATA` |

Run-key persistence shows up under the standard hive paths — walk `HKLM\Software\Microsoft\Windows\CurrentVersion\Run` and the `RunOnce` companion via `printkey -K`.

### 5.7 Credential dumping artifacts

Even after the dump, memory still carries the artifacts attackers used:

| Plugin (Vol2) | Use |
|---|---|
| `hashdump` | NT hashes from SAM (if SYSTEM hive present in image) |
| `cachedump` | Cached domain logons |
| `lsadump` | LSA secrets |
| `mimikatz` (community plugin) | Run mimikatz logic against the image directly |

A memory image acquired during a live LSASS-dumping incident often still contains the credentials the attacker reached. Confirms-the-incident evidence is in the image — useful for IR and for prosecution.

### 5.8 Timelining

| Plugin | Use |
|---|---|
| `timeliner` | Builds a timeline from in-memory artifacts (process times, handle times, registry last-write times, event log entries cached in memory) |
| `mftparser` | Reconstruct $MFT entries cached in memory |

The output is `bodyfile` format → feed to `mactime` for a chronological narrative.

### 5.9 Practical Volatility 3 walk-through (template)

```
# Identify image
vol -f mem.dmp windows.info

# Process enumeration — diff the two lists
vol -f mem.dmp windows.pslist          > pslist.txt
vol -f mem.dmp windows.psscan          > psscan.txt
diff pslist.txt psscan.txt

# Injection candidates
vol -f mem.dmp windows.malfind         > malfind.txt
vol -f mem.dmp windows.ldrmodules      > ldrmodules.txt

# Network and command line
vol -f mem.dmp windows.netscan         > netscan.txt
vol -f mem.dmp windows.cmdline         > cmdline.txt

# Persistence (services + key Run keys)
vol -f mem.dmp windows.svcscan         > svcs.txt
vol -f mem.dmp windows.registry.printkey \
    --key "Software\\Microsoft\\Windows\\CurrentVersion\\Run"

# Dump a suspect
vol -f mem.dmp windows.dumpfiles --pid <PID>
vol -f mem.dmp windows.memmap --pid <PID> --dump
```

The book walks variants of this loop; in practice every Windows memory case starts with `pslist`, `cmdline`, `malfind`, `netscan` in some order.

---

## Chapter 7 — Linux Memory Acquisition

Linux acquisition is harder than Windows because Linux has no built-in "live raw memory dump" service. The kernel deliberately hides physical memory from user-space (since Kernel 2.6.something `/dev/mem` is restricted by `STRICT_DEVMEM` and CONFIG_HARDENED_USERCOPY). To capture RAM on Linux you almost always need a **kernel module** or a **specially privileged user-space tool** that uses kernel APIs to map physical pages.

### 7.1 The acquisition decision tree

```
Is the target a virtual machine?
  Yes → snapshot the VM → use the .vmem / .qcow2 directly
  No  ↓

Do you control the kernel and can compile a module?
  Yes → LiME
  No  → AVML (works without compiling; uses kernel APIs directly)
```

Both tools produce a raw memory image that downstream tools (Volatility 3, Rekall) can parse, given a matching symbol table.

### 7.2 LiME — Linux Memory Extractor

**LiME** (`github.com/504ensicslabs/LiME`) is a loadable kernel module that, when inserted, walks the kernel's physical-memory mapping and writes the contents out via a path you specify (file, network socket).

**Build-time considerations:**

- LiME must be compiled **against the running kernel's headers** — the module's vermagic string has to match the running kernel exactly, otherwise `insmod` refuses to load. On most distros: `apt install linux-headers-$(uname -r)` then `make`.
- For incident response on a target you don't control, this means either (a) cross-compiling against the target's exact kernel beforehand, or (b) building on the target itself if the toolchain is present (it usually isn't on a hardened production box).
- A field workaround is to maintain a small library of pre-compiled LiME modules for common LTS kernels.

**Invocation:**

```
# Build on a matching kernel
make
# or specify KVER explicitly
make -C /lib/modules/$(uname -r)/build M=$(pwd) modules

# Load and acquire to a local file (raw format)
insmod ./lime-$(uname -r).ko "path=/mnt/usb/mem.lime format=lime"

# Or stream over TCP to an analysis station
insmod ./lime-$(uname -r).ko "path=tcp:4444 format=lime"
nc target 4444 > mem.lime    # on the analysis side
```

**Output formats:**
- `raw` — every page concatenated. Smallest tooling overhead; Volatility likes it.
- `padded` — pad over un-mapped physical regions with zeros to preserve absolute offsets.
- `lime` — LiME's own format: a series of `(start, end, data)` tuples for each mapped physical range. Volatility supports it directly.

**Integrity:** LiME does not modify the running kernel beyond the act of loading the module. Loading the module *is* a state change — the process list grows, the module list grows. Standard practice is to acquire **once**, **immediately**, and **note the module load in the case file**.

### 7.3 AVML — Microsoft's Azure Volatile Memory Lookup

**AVML** (`github.com/microsoft/avml`) is a statically-linked **user-space** binary that captures memory without compiling a kernel module. It works on most modern Linux distros that retain `/dev/crash`, `/proc/kcore`, or `/dev/mem` access for root.

**Why it exists:** when the target's kernel doesn't match any LiME module you have, AVML is the fallback. Common cases include surprise distros, custom kernels in cloud images, hardened build chains, or targets where you cannot install kernel headers.

**Invocation:**

```
sudo ./avml output.lime
# or compressed (saves storage on the wire)
sudo ./avml --compress output.lime.zstd
```

AVML writes the **LiME format** by default, so the downstream Volatility workflow is identical whether you used LiME or AVML to produce the image.

**Acquisition order AVML tries (per the README):**
1. `/dev/crash` — the cleanest source if `crash` is available.
2. `/proc/kcore` — ELF-formatted kernel-space view of physical memory.
3. `/dev/mem` — legacy raw physical memory device; usually blocked by `STRICT_DEVMEM`.

Each source has different completeness; `/dev/crash` is the most reliable on modern kernels.

### 7.4 Profiles and symbols — the hard part of Linux memory analysis

A memory image is just a giant byte blob. To make sense of it, the analyzer needs to know **where in that blob the kernel data structures live and how to interpret them**. On Windows, Microsoft's symbol server provides PDB files keyed by kernel build; on Linux there is no such server, and the analyst has to build the symbols themselves.

**For Volatility 2:** a **profile** is a Python file describing the offsets of every kernel structure. You build it on a machine running the **same kernel** as the target using the **dwarf2json** tool against the kernel's `vmlinux` + `System.map`:

```
# On a host with matching kernel headers + System.map
git clone https://github.com/volatilityfoundation/volatility.git
cd volatility/tools/linux
make                  # produces module.dwarf
zip Linux-$(uname -r).zip module.dwarf /boot/System.map-$(uname -r)
cp Linux-*.zip ../../volatility/plugins/overlays/linux/
```

**For Volatility 3:** the symbol table is a JSON file produced by **dwarf2json**:

```
git clone https://github.com/volatilityfoundation/dwarf2json
cd dwarf2json
go build
./dwarf2json linux --elf /boot/vmlinux-$(uname -r) \
              --system-map /boot/System.map-$(uname -r) \
              > linux-$(uname -r).json
# place under volatility3/symbols/linux/
```

**Profile mismatch is the most common reason a Linux analysis stalls.** When `vol -f image linux.psaux` reports "no suitable address space," it's almost always the symbol table.

### 7.5 Acquisition integrity

Two integrity concerns specific to memory acquisition:

1. **Observer effect** — the act of acquiring changes memory. LiME loads a module (process list +1, module list +1); AVML runs a process. The right disclosure: record the tool, the version, the command, the start and end time, and the analyst's identity. Hash the image as soon as you have it (`sha256sum`).
2. **Tool integrity** — your acquisition tool must come from a trusted source. Compile from upstream Git, hash the binary, deploy via a signed channel. Many IR teams maintain a "responder kit" USB / network share with hashes captured at build time.

A clean chain of custody starts with the SHA-256 of the image taken on the responder workstation **immediately after** the transfer, before any analysis tool touches it. Repeat the hash before every analysis session.

### 7.6 Linux-specific Volatility plugins

Once the image and symbols are in hand, the analysis loop mirrors the Windows one with Linux equivalents:

| Plugin (Vol2) | Vol3 | Use |
|---|---|---|
| `linux_pslist` | `linux.pslist` | Active task list (linked list) |
| `linux_psscan` | `linux.psscan` | Scan for `task_struct` (catches DKOM hiding) |
| `linux_psaux` | `linux.psaux` | Same as `pslist` + cmdline |
| `linux_netstat` | `linux.sockstat` | Open sockets |
| `linux_lsmod` | `linux.lsmod` | Loaded kernel modules |
| `linux_check_syscall` | `linux.check_syscall` | Detect syscall-table hooking |
| `linux_check_modules` | `linux.check_modules` | Compare visible vs hidden modules |
| `linux_hidden_modules` | community | Find unlinked modules |
| `linux_malfind` | community | Equivalent to Windows malfind |
| `linux_bash` | community | Recover bash history from in-memory `.bash_history` strings |
| `linux_arp` | `linux.arp` | ARP cache |

---

## Mapped to Bib study topics

| Bib topic | Where the answer lives |
|---|---|
| **Ch 5 — Windows malware detection in memory** | Process enumeration triple (pslist / pstree / psscan); injection detection via `malfind` / `ldrmodules`; command-line / handles / netscan / svcscan; credential dump artifacts; timelining. |
| **Ch 7 — Linux memory acquisition** | LiME (kernel module, build-time considerations) vs AVML (user-space fallback); profile / symbol-table generation via dwarf2json; acquisition integrity (observer effect, SHA-256, chain of custody). |
| **Ch 9 (Sub) — overlap** | The general "memory artifacts of interest" theme covered by Ch 5 + Ch 7. |

---

## Common exam-style question stems (open-source framing)

- "Volatility plugin most useful for detecting injected executable memory regions?" — **`malfind`** (`windows.malfind` on Vol3).
- "Difference between `pslist` and `psscan`?" — **`pslist` walks the active-process linked list; `psscan` scans for `_EPROCESS` signatures regardless of linkage. Diff → hidden processes.**
- "Which Volatility plugin reveals NT hashes from a memory image?" — **`hashdump`** (requires SYSTEM hive in the image).
- "Why might `insmod ./lime.ko` fail with `invalid module format`?" — **Module compiled against a different kernel; vermagic mismatch.**
- "Which AVML acquisition source is preferred on modern hardened kernels?" — **`/dev/crash`**.
- "What format does AVML write by default?" — **LiME format** (so Volatility can parse it without conversion).
- "Why is profile / symbol-table generation a per-kernel step on Linux?" — **The kernel ABI is not stable across builds; struct offsets change between kernels.**
- "What is the first command you run after acquiring a memory image?" — **`sha256sum image.bin`** to record integrity.
- "Which Volatility plugin detects unlinked kernel modules on Linux?" — **`linux_hidden_modules`** (or `linux.check_modules`).

---

## How to actually study this on the boat

1. Stand up a Linux VM. Install Volatility 3 via pip; clone dwarf2json and build it.
2. Acquire memory from the VM using AVML; verify Volatility 3 can parse it (`linux.pslist` returns rows).
3. Read the Volatility Foundation docs end to end. The framework's `--help` listings are exam-worthy in their own right.
4. Drop a benign in-memory payload (e.g., Python process holding a string in heap) and find it with `malfind` + `yarascan`.
5. Read the LiME README and AVML README cover to cover.

---

## Free / adjacent sources (canonical)

- **Volatility Foundation — Framework Documentation** — `https://volatilityfoundation.org/the-volatility-framework/`. The authoritative documentation set for both Vol 2 and Vol 3.
- **Volatility Foundation (home)** — `https://volatilityfoundation.org/`. Tools, training, blog with real-case write-ups.
- **Volatility 3 source + plugin reference** — `https://github.com/volatilityfoundation/volatility3`.
- **dwarf2json** — `https://github.com/volatilityfoundation/dwarf2json`. The symbol-table generator.
- **LiME — Linux Memory Extractor** — `https://github.com/504ensicslabs/LiME`. The canonical Linux kernel-module acquisition tool.
- **AVML — Microsoft's userspace acquisition tool** — `https://github.com/microsoft/avml`. The fallback when LiME isn't an option.
- **SANS DFIR Memory Forensics poster (FOR526 companion)** — `https://www.sans.org/posters/dfir-memory-forensics`. One-page quick reference.

---

## Cross-references

- `BOOK-ART-MEM-FORENSICS.md` — the comprehensive Windows memory-forensics text; this Bib's other memory-forensics book and the deeper companion to Ch 5.
- `JCAC-FORENSIC-MAL.md` — JCAC Forensic Methodology / Malware Analysis module — same vocabulary at the JCAC level.
- `BOOK-WIN-INTERNALS-1.md` — process / memory / security structures memory forensics walks.
- `JCAC-WINDOWS.md` — Windows architecture context for the Ch 5 plugins.
- `JCAC-UNIX-LINUX.md` — Linux kernel context for the Ch 7 acquisition path.
