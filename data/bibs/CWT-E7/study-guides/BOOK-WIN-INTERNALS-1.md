# Bib Study Guide — Windows Internals, Part 1 (7th Edition)

> **Bib reference:** *Windows Internals, Part 1: System architecture, processes, threads, memory management, and more* — Pavel Yosifovich, Alex Ionescu, Mark Russinovich, David Solomon (Microsoft Press, 2017, ISBN 978-0-7356-8418-8).
>
> **Regular-exam scope:** Chapter 5.
> **Substitute-exam scope:** Chapter 1 (Processes, Threads, and Jobs) + study topics on security.
> **Union — what this guide covers:** the **Processes / Threads / Jobs** chapter (7e's organization: Ch 3 processes+jobs and Ch 4 threads; 6e had a single Ch 5 combining them — the Bib references "CHAPTER 5" vs "CHAPTER 1 PROCESSES, THREADS, AND JOBS" suggest cross-edition cross-referencing), **Memory Management**, and **Security** (access tokens, SIDs, integrity levels, UAC, SeDebugPrivilege and friends).

**Posture:** Windows Internals is the authoritative reference for how the Windows kernel actually works. This guide captures the Bib-scope concepts at Chief-operational depth — enough to answer exam questions and to read a Process Explorer / Process Monitor trace and understand what you're looking at. Pairs with `JCAC-WINDOWS.md` Module 7, which covers Windows from the JCAC angle with overlapping content.

---

## How this book fits in the Bib

- On both Regular and Substitute Bib.
- Part 1 covers: system architecture, processes, threads, jobs, memory management, I/O foundations, security.
- Part 2 (6e, separate Bib entry) covers: I/O System, Storage, File Systems, Cache Manager, Startup and Shutdown.
- Mark Russinovich is the primary author lineage; he built Sysinternals (Process Explorer, Process Monitor, Autoruns, PsExec) — every diagnostic tool you'll ever run on a Windows box traces back to this team.

---

## Windows system architecture (context for the scoped chapters)

### The big picture

![Windows Internals P1 — Windows architecture](images/win-internals-1/win-architecture.png)
*Windows Internals Part 1 (Yosifovich et al.) — Windows system architecture (user mode / kernel mode / HAL)*

Windows is organized in **two privilege levels** enforced by the CPU:

- **User mode (Ring 3)** — applications, services, subsystem DLLs.
- **Kernel mode (Ring 0)** — the Executive, Kernel, HAL, drivers.

The boundary is crossed via **system calls** (a subset of the `Nt*` functions exported from `ntdll.dll`).

```
User mode
 ├── System support processes (smss.exe, csrss.exe, wininit.exe, lsass.exe, winlogon.exe, services.exe)
 ├── Service processes (svchost.exe instances)
 ├── User applications (cmd.exe, explorer.exe, browser, …)
 ├── Environment subsystem DLLs (kernel32.dll, user32.dll, gdi32.dll)
 └── Subsystem DLLs (ntdll.dll — thin wrappers to Nt* syscalls)
─────────────────────────────────────────────────────────────────
Kernel mode
 ├── Hypervisor (Hyper-V if enabled) — VBS host
 ├── Windows Executive (Object Manager, I/O Manager, Memory Mgr, Security Ref Monitor, Process Mgr, PnP Mgr, Power Mgr, Config Mgr, Cache Mgr, Scheduler)
 ├── Kernel (low-level scheduling, interrupts, traps, synchronization)
 ├── HAL (Hardware Abstraction Layer — hides chipset / platform specifics)
 └── Drivers (.sys files — file system, network, display, device)
```

### Key kernel components inside `ntoskrnl.exe`

- **Object Manager** — manages kernel objects (processes, threads, files, events, mutexes, etc.) uniformly. Every object has a type, a security descriptor, a handle count, a reference count, a name (optional).
- **I/O Manager** — routes IRPs (I/O Request Packets) through driver stacks.
- **Memory Manager** — virtual memory, page tables, working sets.
- **Security Reference Monitor (SRM)** — access checks against tokens vs DACLs.
- **Process Manager** — process/thread lifecycle.
- **Plug and Play Manager** — device enumeration, driver loading.
- **Power Manager** — S-states, device power states.
- **Configuration Manager** — the Registry (kernel-mode view).
- **Cache Manager** — file-system cache.
- **Scheduler / Dispatcher** — thread selection and context switch.

### HAL

A DLL (`hal.dll`) that isolates hardware-specific code. One HAL variant per supported chipset / platform (ACPI PC, ACPI x64, ARM, Hyper-V root partition, etc.). Modern systems consolidate to very few HAL variants.

---

## Processes, Threads, and Jobs

### Process

![Windows Internals P1 — Process environment block](images/win-internals-1/process-env-block.png)
*Windows Internals Part 1 — Process environment block (PEB) structure*

A **process** is a container for an execution environment:

- A private **virtual address space** (4 TB user-mode on x64 by default).
- A list of **handles** to kernel objects (files, registry keys, threads, events, …).
- One or more **threads**.
- An **access token** describing the security context.
- An **executable image** (PE file) mapped in.
- **Environment variables**, current directory, startup info, exit code, PID.
- Accounting data (page faults, CPU cycles, I/O counts).

Every process has a kernel data structure (**EPROCESS**) maintained by the Process Manager. EPROCESS is pointed to by the handle you get from `OpenProcess`.

### Thread

![Windows Internals P1 — Thread structure](images/win-internals-1/thread-structure.png)
*Windows Internals Part 1 — ETHREAD / TEB structure*

A **thread** is the actual schedulable entity.

- One per "flow of control" — a process has at least one (the primary thread), usually many.
- Each thread has: kernel stack, user stack, TEB (Thread Environment Block), thread-local storage, context (registers + PC), priority, affinity mask, scheduling state, ID.
- Thread data structure: **ETHREAD** (in kernel) and **TEB** (in user space).
- Windows scheduler operates on threads, not processes.

### Job

A **job** groups one or more processes into a single unit for:

- Resource limits — max CPU time, max working-set size, max active processes, max process memory, priority class, affinity.
- Termination — closing the job handle (with `JOB_OBJECT_ALL_ACCESS`) kills all member processes.
- Security — processes in a job can be restricted (quotas, UI restrictions, breakaway denied).

Job uses include:
- Application containers / sandboxes (Chrome, Edge browser renderer processes use jobs).
- Task Scheduler tasks (kill the task cleanly = terminate its job).
- Windows Containers (a Silo is a jobified process tree providing namespace isolation — appears in Server Containers).

### Windows process creation (`CreateProcess`)

Windows `CreateProcess()` is the standard API. Unlike UNIX's fork+exec pair, `CreateProcess` does image loading in one call:

1. Load the PE file from disk, map it into the new address space.
2. Create the EPROCESS structure, allocate a PID.
3. Create the initial thread (ETHREAD), allocate a TID.
4. Copy the caller's environment unless a new one was supplied.
5. Notify debuggers if attached.
6. Start the thread at the PE entry point (after `ntdll` loader initialization).

The kernel-mode entry is `NtCreateUserProcess` (Windows 7+). Older `NtCreateProcess[Ex]` still exists for compat.

### Process tree on a clean Windows logon

```
 [System Idle Process]                     PID 0
 System                                    PID 4
  └─ smss.exe                              Session Manager
       └─ csrss.exe                        Client/Server Subsystem (user mode)
       └─ wininit.exe                      (session 0)
            └─ services.exe                Service Control Manager
                 └─ svchost.exe (×N)       Service host processes
            └─ lsass.exe                   Local Security Authority (LSASS)
            └─ lsaiso.exe                  LSASS Isolated (if Credential Guard)
       └─ winlogon.exe                     (session 1, user session)
            └─ dwm.exe                     Desktop Window Manager
            └─ userinit.exe → explorer.exe
                 └─ user apps
```

- **smss.exe** (Session Manager Subsystem) — first user-mode process after kernel init.
- **csrss.exe** — Win32 subsystem support, one per session.
- **wininit.exe** — session 0 initialization.
- **services.exe** — Service Control Manager (SCM).
- **lsass.exe** — hosts authentication packages (MSV1_0 NTLM, Kerberos, Negotiate).
- **winlogon.exe** — interactive logon UI.
- **svchost.exe** — shared host for services implemented as DLLs.

### Thread scheduling

Windows uses **priority-based preemptive scheduling** with 32 priority levels:

| Level | Band |
|---|---|
| 0 | Zero-page thread (special) |
| 1–15 | **Dynamic** (classic user processes — priority boosts + decays apply) |
| 16–31 | **Realtime** (reserved; requires `SeIncreaseBasePriorityPrivilege`) |

**Priority class** (process-wide, 6 levels):

| Class | Base priority |
|---|---|
| Idle | 4 |
| Below Normal | 6 |
| Normal | 8 (default) |
| Above Normal | 10 |
| High | 13 |
| Realtime | 24 |

**Thread priority** combines with class → actual base priority.

**Priority boosts** applied by the scheduler:
- I/O completion boost (disk +1, keyboard +6, sound +8).
- Foreground-window boost (quantum stretched, not priority).
- Wait-completion boost (thread wakes from wait).
- GUI thread boost on input.
- Starvation boost (CPU-starved threads briefly elevated to 15).

### Quantum

- Workstation default: 2 clock intervals × 3 (≈30 ms typical).
- Server default: 12 clock intervals (≈120 ms) — favors throughput for long-running server ops.
- Foreground app's quantum extended to give it UI responsiveness.

### Context switch

Triggered by:
- Quantum expiration.
- Higher-priority thread becomes runnable.
- Current thread blocks on I/O or synchronization primitive.
- Current thread voluntarily yields (`Sleep(0)`).

Cost: a few μs. Saves/restores registers, MMX/SSE state, FS/GS segment bases (for TEB/PEB), swaps kernel stack, possibly flushes TLB (mitigated by PCIDs in modern CPUs).

### Synchronization primitives

| Object | Purpose |
|---|---|
| **Mutex** | Exclusive ownership; thread-ID tracked; abandonment detected |
| **Semaphore** | Counted resource |
| **Event** | Signal state (auto-reset or manual-reset) |
| **Critical Section** | User-mode lightweight mutex (no kernel transition unless contended) |
| **Slim Reader-Writer Lock (SRW)** | Lightweight reader-writer, user-mode |
| **Keyed Event** | Underlying primitive for condition variables |
| **Interlocked ops** | `InterlockedIncrement`, `InterlockedCompareExchange` — atomic primitives |

All kernel synchronization objects are dispatcher objects — Waitable. `WaitForSingleObject` / `WaitForMultipleObjects` operate uniformly on any of them.

### Protected processes

Since Vista, Windows supports **Protected Processes**:

- Run at a higher integrity than the calling user; even SYSTEM can't open a handle to them with full rights.
- Used for DRM (WMP audio pipeline), and for LSASS PPL (Protected Process Light) in Windows 8.1+.
- Prevents Mimikatz from trivially opening the LSASS process to read credential cache.

Two flavors:
- **PP (Protected Process)** — fully protected.
- **PPL (Protected Process Light)** — signed with specific EKUs; can be anti-malware processes.

### Jobs and Silos

Silo is a specialized Job that creates **kernel namespaces** — a per-silo view of the registry, object namespace, network stack. Silos power Windows Server Containers (process-isolation mode).

---

## Memory Management

### Virtual address space layout

On 64-bit Windows 10/11:

| Region | Size |
|---|---|
| User address space | 128 TB (from `0x0000`00000000 to `0x00007FFF`FFFFFFFF) |
| Kernel address space | 128 TB (from `0xFFFF8000`00000000 upward) |

32-bit process on 64-bit Windows: 4 GB user VA (with `IMAGE_FILE_LARGE_ADDRESS_AWARE` flag) or 2 GB default.

### Major memory concepts

- **Page size:** 4 KB standard, 2 MB large, 1 GB huge.
- **Page tables:** x64 4-level (PML4 → PDPT → PD → PT). Pointer in CR3.
- **TLB:** with PCIDs, per-process TLB entries persist across context switches.
- **Working set:** the pages currently resident in RAM for a process.
- **Pagefile:** backing store for paged-out pages (`C:\pagefile.sys`). Can be on any volume; multiple pagefiles supported.
- **Commit vs Reserve:** `VirtualAlloc(MEM_RESERVE)` reserves an address range; `MEM_COMMIT` backs it with physical memory (or pagefile). Committed memory counts against the system commit limit.
- **System Commit Limit:** total of RAM + pagefile. Exceeding it triggers "low virtual memory" warnings and, if exhausted, allocation failures.

### Key memory APIs

```
VirtualAlloc()      reserve / commit pages
VirtualFree()       release / decommit
VirtualProtect()    change protection (RWX bits)
VirtualQuery()      inspect a region's state
HeapAlloc()         process heap allocator (RtlAllocateHeap under the covers)
```

### Memory protections

Per-page attributes (stored in page-table entries + Windows memory-manager VAD trees):

- `PAGE_NOACCESS`
- `PAGE_READONLY`
- `PAGE_READWRITE`
- `PAGE_EXECUTE`
- `PAGE_EXECUTE_READ`
- `PAGE_EXECUTE_READWRITE`
- `PAGE_WRITECOPY` (copy-on-write)
- `PAGE_EXECUTE_WRITECOPY`
- Flags: `PAGE_GUARD` (one-shot access alarm — used for stack guard), `PAGE_NOCACHE`, `PAGE_WRITECOMBINE`.

### Mitigations in the memory manager

- **ASLR** — EXE, DLL, stack, heap bases randomized per boot (system-wide) and per process.
- **DEP (NX)** — non-executable pages via CPU NX bit + Windows enforcement.
- **ForceASLR / Bottom-Up ASLR / High-Entropy ASLR** — layered improvements.
- **Control Flow Guard (CFG)** — compile-time + runtime indirect-call validation.
- **Arbitrary Code Guard (ACG)** — forbid new executable mappings; enforces W^X at process level (Edge renderer).
- **CIG (Code Integrity Guard)** — only signed images can load in the process.
- **CET Shadow Stack** — hardware return-address protection (Tiger Lake+ + Windows 11).
- **Data Execution Prevention (DEP) per-process opt-in/out** — `/NXCOMPAT` linker flag, manifest settings.

### Special memory regions

- **Process Environment Block (PEB)** — per-process user-mode structure: module list, process parameters, debug flags, heap list. Location: known offset from GS register (historically FS on 32-bit).
- **Thread Environment Block (TEB)** — per-thread: stack base/limit, thread-local storage, exception list.
- **Shared User Data** — `KUSER_SHARED_DATA` at `0x7FFE0000` — read-only page visible to all user processes; system time, tick count, system flags. Used by `GetTickCount`/`QueryPerformanceCounter` fast paths.

### Working-set management

- Windows tracks per-process **working set** (pages in RAM).
- Under memory pressure, the **Balance Set Manager** (thread in System process) trims working sets, writes dirty pages to pagefile, releases frames back to free list.
- **Standby list** — pages released from working sets but still holding valid content; cheap to reclaim if re-referenced.
- **Modified list** — dirty pages awaiting pagefile write.

### The System process

PID 4 is **System** — a kernel-mode-only process hosting kernel threads (driver threads, balance set manager, modified page writer, etc.). No user-mode code.

---

## Security

### SIDs — Security Identifiers

Every security principal (user, group, service, well-known entity) has a **SID**.

Format: `S-<revision>-<authority>-<sub-authority-1>…-<RID>`

Example: `S-1-5-21-3623811015-3361044348-30300820-1013`.

Well-known SIDs:

| SID | Who |
|---|---|
| `S-1-0-0` | Nobody |
| `S-1-1-0` | Everyone |
| `S-1-5-7` | Anonymous |
| `S-1-5-11` | Authenticated Users |
| `S-1-5-18` | LocalSystem |
| `S-1-5-19` | LocalService |
| `S-1-5-20` | NetworkService |
| `S-1-5-32-544` | BUILTIN\Administrators |
| `S-1-5-32-545` | BUILTIN\Users |

RIDs:

- **500** — Administrator (built-in).
- **501** — Guest.
- **502** — krbtgt (domain KDC).
- **512** — Domain Admins.
- **513** — Domain Users.
- **519** — Enterprise Admins.
- **1000+** — user-created accounts.

### Access tokens

When a user authenticates, **LSASS** builds a **primary token** attached to the process created by `winlogon`. All child processes inherit (and can modify) it.

Token contents:

- **User SID** — the authenticated principal.
- **Group SIDs** — all groups (direct + transitive).
- **Privileges** — see next section.
- **Integrity Level** — Low / Medium / High / System.
- **Logon SID** — unique per logon session.
- **Session ID** — TS session number.
- **Token type** — Primary (attached to process) or Impersonation (thread impersonates another user).
- **Restricting SIDs** — for restricted tokens (Chrome sandbox, App Containers).

### Privileges

Named capabilities in a token. Key ones from an attack perspective:

| Privilege | Meaning | Attack value |
|---|---|---|
| `SeDebugPrivilege` | Debug any process | Mimikatz, LSASS reading, process injection |
| `SeImpersonatePrivilege` | Impersonate a client | Potato family (Hot/Rotten/Juicy/PrintSpoofer) |
| `SeBackupPrivilege` | Read any file regardless of ACL | SAM dump, VSS |
| `SeRestorePrivilege` | Write any file regardless of ACL | Overwrite system files |
| `SeLoadDriverPrivilege` | Load a kernel driver | BYOVD |
| `SeTcbPrivilege` | Act as TCB (trusted computing base) | Equivalent of kernel |
| `SeTakeOwnershipPrivilege` | Take ownership of any object | Bypass ACL via ownership |
| `SeManageVolumePrivilege` | Volume operations | Shadow copy abuse |

Privileges are **disabled** by default in a token; code must call `AdjustTokenPrivileges` to enable them. `Disabled` doesn't mean "not there" — if present, can be enabled.

### Integrity levels

Every process and securable object has an **integrity level** (IL). A lower-IL process cannot write to a higher-IL object (DACL permitting).

| IL | Who runs here |
|---|---|
| Untrusted | IE sandbox (historical) |
| Low | Edge/IE Protected Mode, App Container |
| Medium | Standard user processes |
| Medium Plus | (rare) |
| High | Elevated admin processes |
| System | SYSTEM-owned processes |
| Protected (PP/PPL) | Protected processes |

IL enforcement is **Mandatory Integrity Control (MIC)** — orthogonal to DACLs.

### UAC — User Account Control

Admin users log on with a **split token**:

- A filtered "standard user" token (Medium IL) attached to `explorer.exe`.
- A full admin token (High IL) activated via consent prompt for elevated processes.

Elevation mechanisms:
- `ShellExecute` with "runas" verb.
- Manifest `requestedExecutionLevel` (`asInvoker`, `highestAvailable`, `requireAdministrator`).
- `CreateProcessAsUser` with an elevated token (requires primary token access).

UAC bypasses (historical): fodhelper, eventvwr, cmstp, SDCLT, ICMLuaUtil. All patched on modern Windows 10/11 but still appear on unpatched systems.

**Secure Desktop** — consent prompt runs on its own desktop (session 0 isolation) so malicious user-mode code can't fake-click the prompt.

### Impersonation

When a service accepts a client request, it can **impersonate** the client to perform actions on the client's behalf. Levels:

| Level | Capability |
|---|---|
| **Anonymous** | Server cannot identify client |
| **Identification** | Server knows who the client is; cannot act as them |
| **Impersonation** | Server can act as client on local resources |
| **Delegation** | Server can act as client on remote resources (requires constrained-delegation setup or unconstrained) |

`SeImpersonatePrivilege` lets a process create an impersonation token — the reason the "Potato" exploits work.

### Access checks

![Windows Internals P1 — Security descriptor](images/win-internals-1/security-descriptor.png)
*Windows Internals Part 1 — Security descriptor (owner, DACL, SACL)*

When code opens a handle, the SRM performs an **access check**:

1. Compare the caller's token to the object's security descriptor (DACL).
2. Walk the DACL top-to-bottom, matching ACEs.
3. **Deny ACEs** override later **allow ACEs** (why Deny is typically at the top of a DACL).
4. Accumulate granted rights; compare against requested.
5. If sufficient — return handle with those rights. Otherwise — `ACCESS_DENIED`.

**ACE types:**

- Access-Allowed / Access-Denied.
- System-Audit (logs access; drives Security event log).
- System-Alarm (historical).
- Object-Ace variants for AD (per-property ACEs).

### Credential Guard (VBS)

On Windows 10 Enterprise + Hyper-V, LSASS secrets (NTLM hashes, Kerberos keys, cached TGTs) are moved to **LSAISO** in an isolated VM running on the root Hyper-V. A compromise of the normal kernel cannot read LSAISO memory — **Pass-the-Hash-resistant**.

Prerequisites: SLAT (EPT/NPT), IOMMU, UEFI + Secure Boot, TPM 2.0, VBS enabled.

### Windows Defender Application Control (WDAC) and AppLocker

- **WDAC** — policy-driven code-integrity enforcement; kernel- and user-mode. Modern successor.
- **AppLocker** — application allowlisting based on publisher, path, hash. Policy in GPO.

Both block execution of unsigned or disallowed binaries.

### PatchGuard (Kernel Patch Protection)

On 64-bit Windows, PatchGuard periodically checks key kernel structures (SSDT, IDT, IRP tables, known callbacks) for modification. If any is hooked, PatchGuard bugchecks (BSOD) with `CRITICAL_STRUCTURE_CORRUPTION`. This blocks traditional rootkits that hook kernel structures.

Legitimate hypervisor / AV / EDR vendors use **documented callbacks** (`PsSetCreateProcessNotifyRoutine`, `ObRegisterCallbacks`, etc.) rather than patching structures.

---

## Cross-book connections

- EPROCESS/ETHREAD ↔ `JCAC-WINDOWS.md` §2 (Accounts) + §8 (Architecture) + §10 (Services).
- Access tokens and SIDs ↔ `JCAC-WINDOWS.md` §2.
- UAC + integrity levels ↔ `JCAC-WINDOWS.md` §2 + §8.
- Memory manager ↔ `BOOK-OS-CONCEPTS.md` Ch 8/9 + `JCAC-OS.md` §14.
- PatchGuard, Credential Guard ↔ `JCAC-WINDOWS.md` §4 (VBS) + §17 (AD / Kerberos).

---

## Exam-testable concepts (rapid-fire)

### Processes / Threads / Jobs

- **PID 0?** System Idle Process.
- **PID 4?** System — kernel-mode only.
- **First user-mode process after kernel init?** `smss.exe` (Session Manager Subsystem).
- **Service Control Manager executable?** `services.exe`.
- **Hosts Windows authentication packages?** `lsass.exe`.
- **Interactive logon UI?** `winlogon.exe`.
- **Kernel data structure for a process?** EPROCESS. Thread? ETHREAD.
- **User-mode per-process structure?** PEB. Per-thread? TEB.
- **How do you create a process on Windows?** `CreateProcess` (user-mode API) → `NtCreateUserProcess` (syscall).
- **Job's main use?** Group processes for resource limits, termination, or namespace isolation (Silo).
- **Process priority class count?** 6 (Idle, Below Normal, Normal, Above Normal, High, Realtime).
- **Realtime priority band?** 16–31.
- **Dynamic priority band?** 1–15.
- **Workstation default quantum?** ~30 ms. Server? ~120 ms.
- **Protected process light (PPL) primary use?** LSASS and anti-malware services on modern Windows.

### Memory Management

- **Windows x64 user VA space?** 128 TB (128 TB user / 128 TB kernel).
- **32-bit large-address-aware VA?** 4 GB (with the flag). Default? 2 GB.
- **Standard page size?** 4 KB.
- **Large pages?** 2 MB.
- **Backing store file?** `pagefile.sys`.
- **Region reserve API?** `VirtualAlloc(MEM_RESERVE)`. Commit? `MEM_COMMIT`.
- **Change memory protection?** `VirtualProtect`.
- **What's a working set?** Pages resident in RAM for a process.
- **What is standby list?** Released pages still holding valid content; quick to reclaim.
- **Copy-on-Write flag name?** `PAGE_WRITECOPY`.
- **Guard page flag?** `PAGE_GUARD`.
- **ASLR on Windows randomizes what?** EXE/DLL bases, stack, heap.
- **NX bit enforces what?** Data Execution Prevention.
- **Control Flow Guard validates?** Indirect call targets against a compile-time allowlist.
- **Arbitrary Code Guard enforces?** W^X — no new executable mappings in the process.
- **Intel CET Shadow Stack protects?** Return addresses.

### Security

- **SID prefix for NT authority?** `S-1-5`.
- **SID for LocalSystem?** `S-1-5-18`.
- **SID for Everyone?** `S-1-1-0`.
- **RID for Administrator?** 500.
- **RID for Domain Admins?** 512.
- **RID for Enterprise Admins?** 519.
- **Token types?** Primary (process) and Impersonation (thread).
- **Impersonation levels?** Anonymous, Identification, Impersonation, Delegation.
- **Privilege required for Mimikatz?** `SeDebugPrivilege`.
- **Privilege that enables Potato-family?** `SeImpersonatePrivilege`.
- **Privilege to read any file bypassing ACL?** `SeBackupPrivilege`.
- **Privilege to load a kernel driver?** `SeLoadDriverPrivilege`.
- **Integrity Level ranking low→high?** Untrusted, Low, Medium, Medium Plus, High, System, Protected.
- **UAC split token has which two ILs?** Medium (filtered) + High (elevated admin).
- **Secure Desktop prevents?** User-mode code from faking the consent prompt.
- **LSASS protection mode in modern Windows?** PPL (Protected Process Light).
- **Credential Guard isolates LSASS secrets how?** Runs LSAISO in a Hyper-V secure VM; normal kernel cannot read its memory.
- **Prerequisites for VBS / Credential Guard?** SLAT, IOMMU, UEFI + Secure Boot, TPM 2.0.
- **PatchGuard is triggered by?** Modification of key kernel structures (SSDT, IDT, callbacks). Bugchecks with `CRITICAL_STRUCTURE_CORRUPTION`.
- **How do legitimate AV/EDR hook the kernel?** Documented callbacks (`PsSetCreateProcessNotifyRoutine`, `ObRegisterCallbacks`, etc.).
- **ACE evaluation order in a DACL?** Top-to-bottom; Deny ACEs should precede Allow to take effect first.
- **Application allowlisting — policy engine names?** AppLocker (GPO) and WDAC (modern).

---

## Cross-references

- **[Windows Internals Part 1, 7e](../references/Windows%20Internals,%20Part%201%20-%20System%20architecture,%20processes,%20threads,%20memory%20management,%20and%20more,%20Seventh%20Edition-9780133986471.pdf)** — text on disk.
- **[Windows Internals Part 2, 6e](../references/Windows%C2%AE%20Internals,%20Sixth%20Edition,%20Part%202-9780735677265.pdf)** — the companion text (Part 2 study guide: `BOOK-WIN-INTERNALS-2.md`).
- **[Sysinternals suite](https://learn.microsoft.com/en-us/sysinternals/)** — Process Explorer, Process Monitor, Autoruns, PsTools.
- **[Microsoft Docs — Windows Internals learning path](https://learn.microsoft.com/en-us/sysinternals/resources/windows-internals)**.
- **[Microsoft Docs — Token Manipulation](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens)**.
- `JCAC-WINDOWS.md` — JCAC Module 7 parallel.
- `JCAC-OS.md` — general OS concepts backdrop.
- `BOOK-OS-CONCEPTS.md` — Silberschatz on processes and memory.
- `BOOK-WIN-INTERNALS-2.md` — Part 2 (I/O, Startup/Shutdown).
