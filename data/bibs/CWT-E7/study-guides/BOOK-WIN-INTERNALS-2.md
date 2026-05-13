# Bib Study Guide — Windows Internals, Part 2 (6th Edition)

> **Bib reference:** *Windows Internals, Part 2*, 6th Edition — Mark Russinovich, David Solomon, Alex Ionescu (Microsoft Press, 2012, ISBN 978-0-7356-6587-3).
>
> **Regular-exam scope:** Chapters 8, 13.
> **Substitute-exam scope:** not listed.
> **Union — what this guide covers:** Ch 8 (**I/O System**) and Ch 13 (**Startup and Shutdown**). Nearby 6e chapters (9 Storage, 10 Memory, 11 Cache Manager, 12 File Systems, 14 Crash Dump Analysis) are cross-referenced where directly relevant.

**Posture:** Part 2 covers the "storage side" of Windows kernel internals. The Bib-scope chapters are the **I/O model** and the **boot/shutdown sequence** — two of the most frequently-tested and operationally-useful topics for a Chief. Pairs with `BOOK-WIN-INTERNALS-1.md` (processes/threads/memory/security) and `JCAC-WINDOWS.md` §9–§12 (boot, services, file system).

---

## Chapter 8 — I/O System

### The I/O Manager

The **I/O Manager** is the kernel component that coordinates all device I/O. Its responsibilities:

1. Provide a **uniform interface** (IRPs) for drivers.
2. Route I/O requests through a **driver stack**.
3. Maintain **file objects** (handles to open files/devices).
4. Support **synchronous and asynchronous** I/O.
5. Buffer data between user mode and device.
6. Participate in **Plug and Play** and **Power Management**.

### I/O Request Packet (IRP)

Every I/O operation is represented by an **IRP** — a kernel structure the I/O Manager builds when a user-mode `ReadFile` / `WriteFile` / `DeviceIoControl` arrives.

An IRP contains:

- The **major function** (IRP_MJ_READ, IRP_MJ_WRITE, IRP_MJ_CREATE, IRP_MJ_CLOSE, IRP_MJ_DEVICE_CONTROL, IRP_MJ_CLEANUP, IRP_MJ_PNP, IRP_MJ_POWER, IRP_MJ_QUERY_INFORMATION, IRP_MJ_SET_INFORMATION, etc.).
- An **I/O stack location** for each layer of the driver stack (one per driver).
- Pointers to user buffers (and buffer-handling mode: **Buffered I/O** / **Direct I/O** / **Neither**).
- **Cancel routine** pointer.
- **Completion routines** (post-processing for each stack level).
- Status block (final NTSTATUS + information — bytes transferred, etc.).

### Driver stack

Devices are accessed through a **stack of drivers**:

```
User mode:  ReadFile("\\.\C:\file.txt")
             │
             ▼  (via NtReadFile)
Kernel mode: I/O Manager
             │
             ▼  (IRP routed to topmost driver)
    +------------------+
    │   Filter driver  │  (antivirus, encryption, compression)
    +------------------+
    │   File system    │  (NTFS, ReFS, FAT, exFAT)
    +------------------+
    │ Volume Manager   │
    +------------------+
    │ Disk class (disk.sys) │
    +------------------+
    │  Storport / Port │
    +------------------+
    │   Miniport       │  (vendor-specific storage driver)
    +------------------+
                 │
                 ▼
               Hardware
```

Each layer examines the IRP in its I/O stack location, passes it down or completes it. On completion, the IRP travels back up the stack with status.

### Driver types

| Type | Purpose |
|---|---|
| **Bus driver** | Drives a bus (PCI, USB host, ACPI) |
| **Function driver** | Drives the device's primary function |
| **Filter driver** | Intercepts IRPs above or below a function driver |
| **Class driver** | Manages a class of similar devices (`disk.sys`, `usbhub.sys`, `kbdclass.sys`) |
| **Port driver** | Connects class driver to miniport |
| **Miniport driver** | Hardware-specific driver plugged into a port driver |
| **File system driver** | Interprets file-system on-disk structure (NTFS, FAT, ReFS, CDFS, UDF) |
| **File system filter** | Above file system (Defender, BitLocker, FRS) |

### I/O buffer strategies

- **Buffered I/O** — I/O Manager allocates a system buffer, copies user data in/out. Safe; adds a memcpy.
- **Direct I/O** — MDL (Memory Descriptor List) is built describing user buffer pages; I/O Manager locks the pages in memory. Zero-copy. Used for bulk data.
- **Neither** — driver uses the buffer address directly; must validate everything (ProbeForRead / ProbeForWrite). Risky; only for privileged paths.

### Synchronous vs asynchronous I/O

- **Synchronous (default)** — `ReadFile` blocks until complete.
- **Overlapped (async)** — pass an `OVERLAPPED` struct; `ReadFile` returns `ERROR_IO_PENDING`; completion signaled via:
  - Event in `OVERLAPPED`.
  - APC callback.
  - **I/O Completion Port (IOCP)** — the high-scalability pattern for servers.

### I/O Completion Port

Thread pool waits on the IOCP; kernel queues completion packets when I/Os finish. A small number of worker threads can service thousands of in-flight I/Os. IIS, SQL Server, .NET ThreadPool all use IOCPs.

### Fast I/O

Fast path bypasses the IRP when possible (cached reads/writes entirely from the cache manager). File-system driver exposes a `FAST_IO_DISPATCH` table; I/O Manager calls it in preference to IRP path for cached ops.

### Cancellation

Threads and processes terminating force in-flight I/Os to cancel. Drivers register a **cancel routine**; IRP cancellation flag set; driver completes with `STATUS_CANCELLED`.

### Plug and Play (PnP)

The **PnP Manager** orchestrates device enumeration, driver loading, resource assignment:

- Bus drivers enumerate child devices → PnP Manager queries vendor/product IDs.
- PnP Manager consults the **driver store** (`%WinDir%\System32\DriverStore`) to find a matching INF/driver package.
- Loads the driver, builds the device stack.
- Assigns resources (memory ranges, I/O ports, interrupts).
- Notifies user-mode subscribers (UMPnPMgr service, WMI, Device Manager).

### Power management

Devices transition between power states:

- **D0** — fully on.
- **D1, D2** — intermediate low-power states (device-specific).
- **D3 Hot** — off but connected to power.
- **D3 Cold** — power-removed.

System power states:

- **S0** — working.
- **S1–S3** — sleep states (S3 = "Suspend to RAM").
- **S4** — hibernate ("Suspend to Disk" — RAM written to `hiberfil.sys`).
- **S5** — soft off.

Power Manager broadcasts transition notifications; drivers must save/restore state.

### Drivers and security

- **Driver signing** — mandatory on 64-bit Windows. Unsigned drivers won't load (unless testing mode via `bcdedit /set testsigning on`).
- **HVCI** (Hypervisor-protected Code Integrity) — with VBS, driver signature verification runs in secure world; kernel cannot tamper with policy.
- **BYOVD** — Bring Your Own Vulnerable Driver. Attacker loads a legitimately-signed-but-vulnerable driver, exploits its IOCTL to get kernel RW. Mitigated by Microsoft's **VulnDriver blocklist** pushed via WU.
- **Driver isolation (modern)** — some classes (printer drivers, v4 driver model) run in user mode by default.

---

## Chapter 13 — Startup and Shutdown

### The Windows boot process (post-firmware)

Once UEFI/BIOS finishes POST and hands off to the OS loader, the sequence is:

1. **BIOS/UEFI POST.**
   - UEFI: measures boot components into the TPM if enabled.
   - Loads the **Windows Boot Manager** (`bootmgfw.efi` on UEFI; `bootmgr` on BIOS/MBR).

2. **Windows Boot Manager (`bootmgr` / `bootmgfw.efi`).**
   - Reads **BCD** (Boot Configuration Data, `\Boot\BCD` on UEFI partition).
   - Displays boot menu if multi-boot.
   - Selects an OS loader (for current Windows, `winload.efi` or `winload.exe`).

3. **Windows OS Loader (`winload.efi` / `winload.exe`).**
   - Loads the kernel (`ntoskrnl.exe`), HAL (`hal.dll`), core drivers (boot-start drivers — class `SERVICE_BOOT_START`).
   - Applies early kernel patches / CI policy.
   - Transfers control to `ntoskrnl!KiSystemStartup`.

4. **Kernel initialization Phase 0.**
   - Processor initialization (GDT, IDT, MMU, CPU feature probing).
   - Initialize Memory Manager, Object Manager, Security Reference Monitor.
   - Start the boot-time process (the **Idle process**).

5. **Kernel initialization Phase 1.**
   - Initialize HAL fully.
   - Start the **Scheduler**, **I/O Manager**, **Cache Manager**, **Configuration Manager**.
   - Load system drivers (`SERVICE_SYSTEM_START`).
   - Initialize **PnP Manager**; enumerate devices.
   - Mount system volume.
   - Load the registry hives from `%SystemRoot%\System32\Config\`.
   - Start the **Session Manager (`smss.exe`)**.

6. **Smss.exe.**
   - Creates paging file.
   - Initializes environment subsystems.
   - Launches `csrss.exe` and `wininit.exe` in session 0.
   - Subsequent sessions: launches `csrss.exe` and `winlogon.exe` per session.

7. **Wininit.exe (session 0 only).**
   - Creates `services.exe` (SCM).
   - Creates `lsass.exe`.
   - Creates `lsm.exe` (Local Session Manager, pre-Win8) / moved into other components in later versions.

8. **Services.exe (Service Control Manager).**
   - Reads `HKLM\SYSTEM\CurrentControlSet\Services`.
   - Starts services with `SERVICE_AUTO_START` unless dependencies missing.
   - Continues starting services as their dependencies become available.

9. **Winlogon.exe (interactive session).**
   - Starts `LogonUI.exe` for the login screen.
   - On successful login, launches `userinit.exe` → `explorer.exe` → user's shell.

### Boot Configuration Data (BCD)

Replaces the old `boot.ini` from pre-Vista. BCD is a registry hive mounted at boot. Tools:

```
bcdedit                       # list boot entries
bcdedit /enum                 # detailed
bcdedit /set {current} bootstatuspolicy ignoreallfailures
bcdedit /set {default} nx AlwaysOn
bcdedit /set {default} testsigning on       # allow unsigned drivers (disable Secure Boot first)
bcdedit /set {default} debug on             # enable kernel debugger
```

Key BCD identifiers:

- `{bootmgr}` — Windows Boot Manager.
- `{current}` — current OS.
- `{default}` — default OS.
- `{globalsettings}` — globals.

### Secure Boot and measured boot

- **Secure Boot** (UEFI feature) — verifies every EFI executable signed by a key in the platform's DB; fails boot on unsigned. Prevents pre-OS rootkits.
- **Measured Boot** — each stage hashes the next and extends into TPM PCRs. Values can be attested remotely or used as BitLocker unsealing predicate.
- **ELAM (Early Launch Antimalware)** — antivirus driver starts before other boot-start drivers; can veto malicious ones.
- **Trusted Boot** — Windows-specific chain from boot manager → loader → kernel verification.

### BitLocker unlock during boot

If BitLocker protects the OS volume, `winload` unseals the encryption key from TPM (PCR values must match) + optional PIN / USB key. Fails early if tampering detected.

### Service start types

| Type | Value | When started |
|---|---|---|
| `SERVICE_BOOT_START` | 0 | Loaded by OS loader (earliest — disk, volume, file-system drivers) |
| `SERVICE_SYSTEM_START` | 1 | Loaded by kernel during initialization (video, display class) |
| `SERVICE_AUTO_START` | 2 | Started by SCM after boot completes |
| `SERVICE_DEMAND_START` | 3 | Started on explicit request |
| `SERVICE_DISABLED` | 4 | Never started |

Plus modern **delayed auto-start** (reduces boot-time contention).

### Critical services

Some services marked critical — their failure causes the entire OS to crash / auto-recover:

- Certain boot-start drivers.
- Services with `FailureActions` configured to "restart the computer."

### Safe mode

A reduced-driver-set boot option:

- **Safe Mode** — minimal drivers (disk, keyboard, mouse, VGA, file-system, input), no network.
- **Safe Mode with Networking** — same + network drivers.
- **Safe Mode with Command Prompt** — same as Safe Mode but shell is `cmd.exe` instead of `explorer.exe`.

Entry: `bcdedit /set {current} safeboot minimal` + reboot; or hold Shift + Restart → Advanced Options → Startup Settings → F4/F5/F6.

### Shutdown sequence

1. `ExitWindowsEx()` API from user-mode.
2. Broadcast `WM_QUERYENDSESSION` to all top-level windows — apps can request delay.
3. `WM_ENDSESSION` on confirmed shutdown — apps save state and close.
4. SCM sends `SERVICE_CONTROL_SHUTDOWN` to all services.
5. Session manager terminates.
6. Kernel flushes Cache Manager dirty pages.
7. Registry hives committed.
8. Drivers receive `IRP_MJ_SHUTDOWN`.
9. HAL-initiated power-off or restart.

### Fast startup (Windows 8+)

On shutdown, Windows hibernates the kernel session + services (saves to `hiberfil.sys`) while terminating user sessions. Next boot reloads the hibernated state — faster than a clean boot. Can be confusing: "shut down" doesn't fully flush state. `shutdown /s /t 0` on some systems bypasses; `shutdown /s /hybrid` does the fast variant; `shutdown /r` always does a full restart.

### Crash handling (bugcheck / BSOD)

- Kernel detects a critical fault (unhandled exception in kernel mode, stop-code trigger).
- `KeBugCheckEx` logs the stop code (e.g., `IRQL_NOT_LESS_OR_EQUAL`, `KERNEL_SECURITY_CHECK_FAILURE`).
- Writes **minidump** (`C:\Windows\Minidump\*.dmp`, ~few hundred KB) or **kernel dump** (`C:\Windows\MEMORY.DMP`) or **full dump** (depending on settings).
- Displays BSOD (or green screen on insider builds).
- Restarts (default) or hangs with blue screen.

Configured via System Properties → Advanced → Startup and Recovery → "Write debugging information."

Analyze dumps with WinDbg:

```
!analyze -v
!thread
kb                  # backtrace
lm                  # loaded modules
```

### Hibernation (`hiberfil.sys`)

- Triggered by `shutdown /h` or idle-timeout policy.
- Kernel dumps RAM contents + processor state to `%SystemDrive%\hiberfil.sys`.
- On resume, loader reads `hiberfil.sys`, restores RAM, resumes from saved PC.
- Size of file = physical RAM (configurable with `powercfg /h /size`).
- Wakeup protected: tamper with `hiberfil.sys` and resume fails.

---

## Cross-book connections

- I/O Manager + IRPs ↔ `JCAC-UNIX-LINUX.md` §7 (operations on file systems) for cross-OS contrast.
- Driver signing and BYOVD ↔ `BOOK-WIN-INTERNALS-1.md` (Security) + `JCAC-WINDOWS.md` §8 (Architecture).
- Boot process ↔ `JCAC-WINDOWS.md` §9 (Boot Process) + `BOOK-OS-CONCEPTS.md` Ch 2 (booting / bootstrap).
- BCD ↔ `JCAC-WINDOWS.md` §9.
- Services ↔ `JCAC-WINDOWS.md` §10 (Services).
- BitLocker / Secure Boot / VBS ↔ `BOOK-WIN-INTERNALS-1.md` Security section.
- Crash dump analysis ↔ Ch 14 of this book (not Bib-scoped but cross-referenced).

---

## Exam-testable concepts (rapid-fire)

### I/O System (Ch 8)

- **Name of the kernel structure representing an in-flight I/O?** IRP (I/O Request Packet).
- **What's an I/O stack location?** One entry per driver in the driver stack; each layer consults its own location.
- **IRP major functions to recognize?** `IRP_MJ_READ`, `IRP_MJ_WRITE`, `IRP_MJ_CREATE`, `IRP_MJ_CLOSE`, `IRP_MJ_DEVICE_CONTROL`, `IRP_MJ_PNP`, `IRP_MJ_POWER`.
- **Three user-buffer strategies?** Buffered I/O, Direct I/O, Neither.
- **Direct I/O uses what to describe the user buffer?** MDL (Memory Descriptor List).
- **What is the I/O Completion Port used for?** High-scalability async I/O — worker threads wait for completions from many devices/sockets.
- **Fast I/O path bypasses the IRP when?** Cached reads/writes can be served entirely from the cache manager.
- **Driver types?** Bus, Function, Filter, Class, Port, Miniport, File-system, File-system filter.
- **Antivirus typically inserts what kind of driver?** File-system filter driver.
- **PnP Manager reads driver packages from where?** Driver Store (`%WinDir%\System32\DriverStore`).
- **Device power states?** D0 (on), D1/D2, D3 Hot, D3 Cold.
- **System power states?** S0 working, S1–S3 sleep (S3 Suspend to RAM), S4 hibernate, S5 soft-off.
- **Driver signing enforcement bypass?** `bcdedit /set testsigning on` — requires Secure Boot off.
- **BYOVD stands for?** Bring Your Own Vulnerable Driver.
- **Microsoft's response to BYOVD?** VulnDriver blocklist pushed via Windows Update; HVCI under VBS provides stronger protection.

### Startup and Shutdown (Ch 13)

- **UEFI loads which Windows component?** Windows Boot Manager (`bootmgfw.efi`).
- **Windows Boot Manager's config store?** BCD (Boot Configuration Data).
- **Tool to edit BCD?** `bcdedit`.
- **OS Loader name?** `winload.exe` (BIOS) / `winload.efi` (UEFI).
- **Kernel filename?** `ntoskrnl.exe`.
- **First user-mode process?** `smss.exe` (Session Manager).
- **Which process launches services?** `services.exe` (SCM).
- **Which process hosts authentication?** `lsass.exe`.
- **Interactive logon UI process?** `winlogon.exe` → `LogonUI.exe`.
- **User's shell parent chain?** `winlogon → userinit → explorer`.
- **Secure Boot validates what?** That every EFI executable in the boot path is signed by a key in the platform DB.
- **Measured boot extends values into?** TPM PCRs.
- **ELAM purpose?** Antimalware driver starts before other boot-start drivers; can veto malicious ones.
- **BitLocker unseals the key from?** TPM — verifies PCR values.
- **Service-start type loaded by OS loader?** BOOT_START.
- **Service-start type loaded by kernel init?** SYSTEM_START.
- **Service-start type for "auto after boot"?** AUTO_START.
- **Safe Mode loads only?** Disk, keyboard, mouse, video, file-system, input drivers (no networking).
- **Fast Startup (Windows 8+) hibernates what?** Kernel session + services (not user sessions).
- **File where hibernation saves RAM?** `hiberfil.sys`.
- **Paging file name?** `pagefile.sys`.
- **Crash dump types?** Minidump, kernel dump, full dump.
- **WinDbg command for first-pass bugcheck analysis?** `!analyze -v`.

---

## Cross-references

- **[Windows Internals Part 2, 6e](../references/Windows%C2%AE%20Internals,%20Sixth%20Edition,%20Part%202-9780735677265.pdf)** — text on disk.
- **[Windows Internals Part 1, 7e](../references/Windows%20Internals,%20Part%201%20-%20System%20architecture,%20processes,%20threads,%20memory%20management,%20and%20more,%20Seventh%20Edition-9780133986471.pdf)** — `BOOK-WIN-INTERNALS-1.md`.
- **[Microsoft Learn — Windows Internals](https://learn.microsoft.com/en-us/sysinternals/resources/windows-internals)** — canonical learning path.
- **[WinDbg documentation](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/)** — kernel debugger reference.
- **[Microsoft Driver Development Kit (WDK)](https://learn.microsoft.com/en-us/windows-hardware/drivers/)** — driver model, IRPs, callbacks.
- `JCAC-WINDOWS.md` — Module 7 (Boot Process §9, Services §10, File System §12).
- `BOOK-OS-CONCEPTS.md` — general OS boot and I/O concepts.
