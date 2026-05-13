# Bib Study Guide — The Architecture of Computer Hardware, Systems Software, and Networking (Englander) 5th Edition

> **Bib reference:** *The Architecture of Computer Hardware, Systems Software, & Networking: An Information Technology Approach*, 5th Edition — Irv Englander (Wiley, 2013, ISBN 978-1-118-32263-5).
>
> **Regular-exam scope:** Sections 12, 17, 18.
> **Substitute-exam scope:** Chapters 9, 18.
> **Union — what this guide covers:** Ch 9 (Input/Output), §12 (Networks and Data Communications), §17 (File Management), §18 / Ch 18 (The Internal Operating System).

**Posture:** Englander is an IT-oriented survey — higher-level than the ISA-and-registers material in `JCAC-COMP-ORG-ARCH.md`. It emphasizes **how computer systems work as systems** — I/O, networks, file management, and the OS kernel from an architectural lens. Pairs with `BOOK-OS-CONCEPTS.md` (Silberschatz at a deeper level on processes/memory) and `BOOK-TCPIP-GUIDE.md` (networking detail).

---

## Chapter 9 / Section 9 — Input/Output

### Purpose of I/O

The CPU is fast; storage and peripherals are slow. The I/O subsystem mediates the speed mismatch, provides a uniform programming interface, and keeps the CPU from stalling on device operations.

### I/O control methods

Englander's taxonomy (in speed-by-complexity order):

| Method | Mechanism | CPU involvement |
|---|---|---|
| **Programmed I/O (PIO)** | CPU polls device status register and transfers data byte-by-byte | High — busy-waits |
| **Interrupt-driven I/O** | Device raises IRQ when ready; CPU services via ISR | Lower — CPU can do other work between interrupts |
| **Direct Memory Access (DMA)** | DMA controller moves data between device and memory independently; CPU interrupted at completion | Minimal — only for setup and completion |
| **Channel I/O** | Dedicated I/O processor executes channel programs | Minimal — CPU hands off entire transfer plan |

Modern systems use a hierarchy: CPU sets up DMA via memory-mapped registers; DMA transfers bulk data; interrupts signal completion. Programmed I/O remains for slow peripherals (keyboard, low-speed serial).

### Buses

![Englander Fig 9.1 — I/O bus topology](images/arch-comp-hw/io-buses.png)
*Englander Figure 9.1 — I/O bus topologies (star, shared, point-to-point)*

A **bus** is a shared set of wires carrying address, data, and control signals.

- **Address bus** — carries the target memory address or I/O port.
- **Data bus** — carries the actual data.
- **Control bus** — read/write, interrupt, bus-grant, clock.

Bus topologies:

- **Shared (party-line)** — many devices on one bus. Legacy (ISA, PCI parallel).
- **Point-to-point** — dedicated link per device pair. Modern (PCIe, QPI/UPI, Infinity Fabric).
- **Star** — central hub arbitrates (USB).
- **Hierarchical** — fast bus for CPU-memory, slower bus for peripherals, bridged.

### Bus arbitration

Multiple devices may want the bus simultaneously:

- **Daisy-chain** — bus grant propagates through a priority chain.
- **Centralized** — single arbiter grants access.
- **Distributed** — devices negotiate via priority lines.

### I/O interfaces / standards

| Interface | Speed / purpose |
|---|---|
| **PCI / PCIe** | Expansion cards; modern PCIe uses serial lanes (x1, x4, x8, x16); Gen 4 = 16 GT/s per lane |
| **USB** | Universal peripheral; host-controlled; USB 3.2 Gen 2 = 10 Gbps |
| **SATA / SAS** | Disk interfaces; SATA 3 = 6 Gbps |
| **NVMe** | SSD protocol over PCIe; supports massive command queue |
| **Thunderbolt** | USB-C physical layer carrying PCIe + DisplayPort |
| **HDMI / DisplayPort** | Video + audio |
| **RS-232 / RS-485** | Legacy serial |
| **I²C / SPI** | Low-speed embedded (sensors, EEPROMs) |
| **Ethernet** | LAN (see §12) |

### DMA in depth

![Englander Fig 9.8 — DMA controller](images/arch-comp-hw/dma.png)
*Englander Figure 9.8 — DMA controller operation (device↔memory transfer with minimal CPU)*

The **DMA controller** is a peripheral that can read and write main memory independently of the CPU.

1. CPU configures DMA: source address, destination, length, direction, mode (single / block / burst / demand).
2. CPU signals device to start.
3. Device / DMA controller moves data.
4. DMA controller raises interrupt on completion.

Modern systems:
- Each device (NIC, GPU, NVMe) has its own DMA engine.
- **IOMMU** (Intel VT-d, AMD-Vi) provides address translation + protection for device DMA — prevents a malicious device from reading/writing arbitrary host memory.

### Memory-mapped I/O vs Port-mapped I/O

| Scheme | How it works | Used on |
|---|---|---|
| **Memory-mapped I/O (MMIO)** | Device registers appear at specific memory addresses; normal load/store instructions access them | Modern architectures, x86 and ARM both |
| **Port-mapped I/O (PIO)** | Dedicated `IN`/`OUT` instructions access a separate I/O address space | x86 legacy (keyboard controller, PIC, serial ports) |

### Interrupt handling

When an interrupt fires:

1. CPU finishes current instruction.
2. Saves context (PC, registers, flags) on stack or reserved area.
3. Looks up ISR address in **Interrupt Descriptor Table (IDT)** (or vector table on ARM).
4. Jumps to ISR, possibly switching privilege level.
5. ISR services device, acknowledges interrupt.
6. Returns via `iret` (x86) / equivalent — restores context.

**Nested interrupts** — higher-priority IRQ preempts an ISR. Complicates kernel code; managed by priority masking.

**Modern x86 interrupt delivery:** APIC (Advanced Programmable Interrupt Controller) — local APIC per core, I/O APIC per bus; **MSI / MSI-X** replace wire interrupts (device writes magic value to special address).

---

## Section 12 — Networks and Data Communications

Englander's overview-style treatment. The fine detail lives in the TCP/IP Guide and JCAC-NETWORKING; here Englander frames the concepts.

### Communication fundamentals

Every communication system has:

- **Sender** — source of the message.
- **Receiver** — destination.
- **Medium / channel** — carries the signal.
- **Protocol** — rules governing exchange.
- **Message** — the information being sent.

### Signal characteristics

- **Analog** vs **digital** signals.
- **Bandwidth** — frequency range the channel supports.
- **Throughput** — bits per second actually delivered.
- **Latency** — delay between send and receive.
- **Attenuation** — signal weakening over distance.
- **Noise** — corruption from EMI, crosstalk, thermal.
- **SNR (Signal-to-Noise Ratio)** — log-scale quality metric.
- **Shannon's theorem** — upper bound of capacity given bandwidth + SNR.

### Transmission methods

- **Serial** — one bit at a time (modern).
- **Parallel** — multiple bits simultaneously (legacy IDE, wide buses).
- **Simplex / half-duplex / full-duplex** — direction capability.
- **Synchronous / asynchronous** — clocked with data vs start/stop bits.
- **Baseband** — one signal on the medium.
- **Broadband** — multiple signals via frequency multiplexing.

### Encoding

Converting bits to signal transitions:

| Scheme | Used by |
|---|---|
| NRZ (Non-Return-to-Zero) | RS-232, simple |
| Manchester | 10 Mbps Ethernet |
| Differential Manchester | Token Ring |
| 4B/5B | 100 Mbps Ethernet |
| 8B/10B | Gigabit Ethernet, Fibre Channel, USB 3 |
| 64B/66B | 10G+ Ethernet |
| PAM-4 | 50/100/400 G Ethernet |

### Media

- **Twisted pair copper** — Cat5e/6/6a/7/8; RJ-45; 1–40 Gbps at 100 m.
- **Coaxial** — historical Ethernet (10BASE2), cable TV / DOCSIS.
- **Fiber optic** — single-mode (long haul), multi-mode (datacenter); LC/SC/ST/MPO connectors.
- **Wireless** — Wi-Fi, Bluetooth, cellular, satellite.

### Network models

- **OSI 7-layer** — conceptual (see `BOOK-TCPIP-GUIDE.md` Ch 3).
- **TCP/IP 4-layer** — operational (Link, Internet, Transport, Application).

### Network types by scope

PAN → LAN → CAN → MAN → WAN → GAN / Internet (see `JCAC-NETWORKING.md` §1).

### Network topologies

Bus, star, ring, mesh, hybrid, point-to-multipoint (see `JCAC-NETWORKING.md` §4).

### Switching

- **Circuit switching** — dedicated path per call (PSTN).
- **Packet switching** — packets independently routed (Internet).
- **Message switching** — store-and-forward whole messages (historical telegraph).

### Addressing

- **Physical address (MAC)** — 48-bit Ethernet address.
- **Logical address (IP)** — 32-bit IPv4 or 128-bit IPv6.
- **Port** — 16-bit identifier of a process endpoint.

### Protocols Englander highlights

- **HTTP / HTTPS** — web.
- **SMTP / POP3 / IMAP** — email.
- **FTP / SFTP** — file transfer.
- **DNS** — name resolution.
- **DHCP** — address configuration.
- **SSH / Telnet** — remote shell.
- **TCP / UDP** — transport.
- **IP / ICMP / IGMP** — internet layer.
- **ARP / Ethernet** — link layer.

---

## Section 17 — File Management

### What a file is (Englander's definition)

A **file** is a collection of related data stored as a named entity on a storage device. The OS is responsible for:

- Creating, deleting, opening, closing, reading, writing.
- Managing where on disk the data lives.
- Enforcing access control.
- Providing naming / directory services.

### File attributes

Typical metadata stored with a file:

- **Name** — human-readable string.
- **Type / format** — document, image, executable.
- **Location** — starting block / inode / cluster pointer.
- **Size** — bytes.
- **Protection** — read / write / execute / ACLs.
- **Time stamps** — created, last modified, last accessed.
- **Owner / group** — UNIX semantics; ACL on Windows.

### File types and representations

- **Text files** — human-readable character streams.
- **Binary files** — structured data (databases, images, executables).
- **Executable files** — PE / ELF / Mach-O (see `JCAC-COMP-ORG-ARCH.md` §1).
- **Compressed / archive files** — ZIP, TAR, GZ.
- **Document** — DOCX, PDF.
- **Media** — JPEG, PNG, MP3, MP4.

### File operations

Standard API every OS exposes:

```
open, close
read, write
seek (position within file)
truncate (resize)
stat (query attributes)
rename, link, unlink
```

### Directory structures

| Structure | Description |
|---|---|
| **Single-level** | Flat list of files — no hierarchy (legacy CP/M, embedded) |
| **Two-level** | One directory per user |
| **Tree** | Classical hierarchical (most modern OSes) |
| **Acyclic graph** | Trees plus shared subdirectories via links |
| **General graph** | Allows cycles — needs cycle-detection for traversal |

### File-system implementation concepts

- **Allocation:**
  - **Contiguous** — file occupies consecutive blocks (fast read, fragmentation).
  - **Linked** — each block points to the next (FAT; slow random access).
  - **Indexed** — index block lists all data blocks (ext inode model).
  - **Extent-based** — (start, length) runs (ext4, NTFS, XFS).
- **Free-space management:**
  - **Bitmap** — one bit per block.
  - **Linked free list** — blocks themselves chain.
- **Metadata structures:** inode (UNIX) / MFT record (NTFS) / catalog (HFS+).
- **Journaling** — append-only log of pending metadata changes for crash recovery (ext3/4, NTFS, XFS, JFS).

### Common file systems

| FS | Platform | Notes |
|---|---|---|
| **NTFS** | Windows | Journaled, ACLs, USN journal, MFT, ADS |
| **ReFS** | Windows Server | Resilient FS, checksums |
| **FAT32 / exFAT** | Cross-platform | No ACLs; exFAT supports >4 GB files |
| **ext4** | Linux | Journaled, extent-based |
| **XFS** | Linux | Journaled metadata; large-volume friendly |
| **Btrfs / ZFS** | Linux / Solaris / BSD | CoW, snapshots, checksum, integrated volume mgmt |
| **APFS** | macOS | Modern CoW |
| **HFS+** | macOS legacy | Pre-APFS |
| **CDFS / UDF** | Optical media | ISO 9660, DVD/Blu-ray |

### Access control

- **UNIX triad** — owner / group / others × rwx.
- **POSIX ACLs** — per-user / per-group extensions.
- **NTFS DACL/SACL** — per-ACE allow/deny with inheritance.
- **RBAC / capabilities** — modern alternatives.

### Protection mechanisms

- Ownership enforcement at open time.
- Permission bits / ACLs consulted.
- **Mandatory access control (SELinux / AppArmor / Windows Mandatory Integrity Control)** overrides DAC.

### Backup and recovery

- **Full backup** — every file.
- **Incremental** — files changed since last backup of any kind.
- **Differential** — files changed since last full.
- **Snapshot** — CoW-based point-in-time image (LVM, Btrfs, ZFS, VSS).
- **Replication** — continuous copy to secondary storage (rsync, DFS-R, block-level replication).

---

## Section 18 / Chapter 18 — The Internal Operating System

### OS responsibilities (Englander's framing)

- Resource management — CPU time, memory, I/O, files.
- Abstraction — hide hardware specifics behind a uniform interface.
- Protection — isolation between processes / users.
- Communication — IPC, networking.

### OS structures revisited

(Covered also in `BOOK-OS-CONCEPTS.md` Ch 2.)

- Monolithic.
- Layered.
- Microkernel.
- Modular.
- Hybrid.
- Virtual machine.

### Kernel vs user space

Two privilege domains enforced by CPU:

- **Kernel mode (Ring 0)** — privileged instructions, full memory access, hardware access.
- **User mode (Ring 3)** — restricted instruction set, only process's own VA space.

Transition mechanisms:
- **System call** — software interrupt or dedicated syscall instruction; CPU switches to kernel mode and jumps to the syscall dispatcher.
- **Hardware interrupt** — CPU switches to kernel mode, runs ISR.
- **Exception / fault** — divide-by-zero, page fault, general-protection fault; kernel handles.

### Process management recap

Processes, threads, scheduler, context switch, IPC — all covered in `BOOK-OS-CONCEPTS.md` Ch 3 + `BOOK-WIN-INTERNALS-1.md` + `JCAC-OS.md` §11–§12.

Englander's angle adds:
- **Process hierarchies** and parent/child relationships.
- **Job control** (foreground/background on UNIX).
- **Priority inversion** and **priority inheritance**.

### Memory management recap

Virtual memory, paging, working sets, thrashing — covered in depth in `BOOK-OS-CONCEPTS.md` Ch 8/9. Englander emphasizes:
- **Address translation** at the hardware/software boundary.
- **Trade-offs** in page size, replacement policy, allocation scheme.
- **Monitoring** (working-set size, page-fault rate).

### File system recap

Covered in §17 above.

### Scheduling recap

Algorithms: FCFS, SJF, priority, Round Robin, multilevel-feedback, CFS. Englander emphasizes:
- **Goals** — throughput, response time, turnaround time, fairness.
- **Preemptive vs non-preemptive.**
- **Long-term, medium-term, short-term schedulers.**

### I/O management recap

Covered in Ch 9 above.

### Network services

A modern OS bundles a **network stack** (TCP/IP + link drivers) as an integral service.

- Applications use **socket API** to send/receive.
- Kernel implements the stack, routing decisions, encryption (IPsec, TLS kernel-offload in modern kernels).
- **User-space networking** frameworks (DPDK) bypass the kernel for performance-critical workloads.

### Virtualization revisited

OS-level virtualization:
- **Containers** — Linux namespaces + cgroups; Windows Silos. Share host kernel.
- **Paravirtualization** — guest kernel cooperates with hypervisor.
- **Full virtualization** — hardware-assisted (VT-x / AMD-V).

### Security and protection

- **Authentication** — password, MFA, smartcard, biometric, token.
- **Authorization** — DAC, MAC, RBAC, ABAC, capabilities.
- **Auditing** — secure event log shipped to SIEM.
- **Cryptography in the OS** — FS encryption (BitLocker / LUKS), disk-image encryption, SSL/TLS, Kerberos.
- **Security boundaries** — process isolation, kernel-user split, VM isolation, container namespaces, IOMMU device isolation, VBS-hypervisor-enforced code integrity.

---

## Cross-book connections

- Ch 9 I/O ↔ `BOOK-WIN-INTERNALS-2.md` Ch 8 (Windows I/O Manager) · `JCAC-OS.md` §15 (Device Drivers) · `JCAC-COMP-ORG-ARCH.md` §6 (I/O architecture).
- §12 Networks ↔ `BOOK-TCPIP-GUIDE.md` Ch 3 · `JCAC-NETWORKING.md` · `JCAC-PROTOCOL-ANALYSIS.md`.
- §17 File Management ↔ `JCAC-UNIX-LINUX.md` §6–§7 · `BOOK-WIN-INTERNALS-2.md` Ch 12 (File Systems).
- §18 Internal OS ↔ `BOOK-OS-CONCEPTS.md` · `JCAC-OS.md` · `BOOK-WIN-INTERNALS-1.md`.

---

## Exam-testable concepts (rapid-fire)

### Ch 9 — I/O

- **Four I/O control methods in Englander's order?** Programmed I/O, Interrupt-driven, DMA, Channel I/O.
- **Which requires CPU least?** Channel / DMA (full transfer with minimal CPU).
- **DMA acronym?** Direct Memory Access.
- **What hardware protects host memory from rogue device DMA?** IOMMU (Intel VT-d / AMD-Vi).
- **Bus topology of PCIe?** Point-to-point (serial lanes).
- **Memory-mapped vs port-mapped I/O?** MMIO appears at memory addresses; PIO uses dedicated `IN`/`OUT` instructions on a separate address space.
- **PCIe Gen 4 lane rate?** 16 GT/s.
- **x86 interrupt controllers (modern)?** Local APIC + I/O APIC + MSI/MSI-X.
- **NVMe runs over which bus?** PCIe.
- **Table that holds interrupt handler addresses on x86?** IDT (Interrupt Descriptor Table).

### §12 — Networks

- **OSI layer count?** 7.
- **TCP/IP model layer count?** 4.
- **Circuit switching example?** Legacy PSTN voice.
- **Packet switching example?** Internet.
- **Physical-address type used by Ethernet?** 48-bit MAC.
- **Port number bit width?** 16.
- **Encoding used by Gigabit Ethernet?** 8B/10B.
- **Encoding used by 100 Mbps Ethernet?** 4B/5B.
- **Fiber types?** Single-mode (long haul, laser) vs multi-mode (short, LED/VCSEL).
- **Shannon's theorem constrains?** Maximum channel capacity given bandwidth and SNR.

### §17 — File Management

- **File-system allocation strategies?** Contiguous, linked, indexed, extent-based.
- **Free-space management techniques?** Bitmap, linked free list.
- **Which FS allocation is used by ext4?** Extent-based.
- **Which FS allocation was used by FAT?** Linked (FAT = File Allocation Table).
- **Journaled FS examples?** ext3, ext4, XFS, NTFS.
- **CoW filesystem examples?** Btrfs, ZFS, APFS.
- **Directory models?** Single-level, two-level, tree, acyclic graph, general graph.
- **Backup types?** Full, incremental, differential, snapshot.
- **POSIX ACLs extend what?** UNIX triad permissions.
- **NTFS access-control list?** DACL (Discretionary ACL) — list of ACEs.

### §18 / Ch 18 — Internal OS

- **Two CPU privilege domains?** Kernel mode (Ring 0), User mode (Ring 3).
- **Syscall transition?** User mode → kernel mode via software interrupt or dedicated instruction.
- **Scheduling goals?** Throughput, response time, turnaround time, fairness.
- **Preemptive scheduling characteristic?** Kernel can interrupt a running thread at quantum expiration.
- **Container OS-level virtualization technologies on Linux?** Namespaces + cgroups.
- **Hardware-assisted full virtualization?** Intel VT-x / AMD-V.
- **Protection models?** DAC, MAC, RBAC, ABAC, capabilities.
- **Hardware root of device-memory isolation?** IOMMU.
- **Authentication factor categories?** Something you know, have, are (plus "somewhere you are" and "something you do").
- **Three-tier authorization decision model?** Subject → action → object, filtered by policy.

---

## Cross-references

- **[The Architecture of Computer Hardware, Systems Software, and Networking (Englander), 5e](../references/The%20Architecture%20of%20Computer%20Hardware,%20Systems%20Software,%20%26%20Networking%20-%20An%20Information%20Technology%20Approach,%205th%20Edition-9781118322635.pdf)** — text on disk.
- **[Computer Organization and Design (Patterson & Hennessy)](https://www.elsevier.com/books/computer-organization-and-design/patterson/978-0-12-812275-4)** — deeper hardware-level companion.
- **[Intel 64 and IA-32 SDM Vol 1 & 3](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)** — I/O, interrupts, paging details.
- `JCAC-COMP-ORG-ARCH.md` — deeper on digital logic, x86/ARM ISAs, cache hierarchy.
- `BOOK-OS-CONCEPTS.md` — deeper on processes, memory, distributed.
- `BOOK-TCPIP-GUIDE.md` — deeper on §12 networking.
- `BOOK-WIN-INTERNALS-2.md` — deeper on §17 (file systems) and §18 (boot).
