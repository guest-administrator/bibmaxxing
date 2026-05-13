# Bib Study Guide — Operating System Concepts (Silberschatz, Galvin, Gagne) 9th Edition

> **Bib reference:** *Operating System Concepts*, 9th Edition (ISBN 978-1-118-06333-0). Wiley, 2013.
>
> **Regular-exam scope:** Chapter 3 (Processes), Chapter 8 (Main Memory).
> **Substitute-exam scope:** Chapters 2, 3, 17 + study topics on memory management, system components.
> **Union — what this guide covers:** Ch 2 (OS Structures + System Components), Ch 3 (Processes), Ch 8 (Main Memory), Ch 9 highlights (Virtual Memory — "memory management" study topic), Ch 17 (Distributed Systems).

**Posture:** This guide tracks the Silberschatz text chapter-by-chapter for the Bib scope. It pairs with `JCAC-OS.md` (which covers OS at a general conceptual level from the JCAC Module 5 TOC) — overlap is intentional; the exam draws from both, sometimes on the same concept with different phrasing. When a topic appears in both, this guide anchors to the Silberschatz vocabulary and definitions.

---

## How this book fits in the Bib

- On both the Regular and Substitute Bib.
- Three JCAC guides already cite it in their cross-references: `JCAC-OS.md`, `JCAC-UNIX-LINUX.md`, `JCAC-WINDOWS.md`.
- Chief-level takeaway: memorize the **definitions** as Silberschatz writes them (the SMEs who wrote the exam items almost certainly pulled distractors from adjacent Silberschatz definitions).

---

## Chapter 2 — Operating-System Structures + System Components

### OS services

Silberschatz lists services in two groups:

**Helpful for the user:**

| Service | Purpose |
|---|---|
| **User interface** | CLI, GUI, batch |
| **Program execution** | Load into memory, run, terminate, return status |
| **I/O operations** | Mediated by the kernel (user processes can't directly drive hardware) |
| **File-system manipulation** | Create, delete, read, write, search, permissions |
| **Communications** | Shared memory, message passing — across processes, across machines |
| **Error detection** | CPU / memory / devices / user programs; consistent recovery |

**Helpful for the system:**

| Service | Purpose |
|---|---|
| **Resource allocation** | CPU cycles, memory, file storage, I/O devices |
| **Accounting** | Tracks per-user / per-process resource usage |
| **Protection and security** | Control of access; authentication of users |

### System components (the classic Silberschatz decomposition)

A modern OS has these major components:

1. **Process management** — creating / deleting processes, scheduling, IPC, synchronization, deadlock handling.
2. **Memory management** — allocating and freeing memory; virtual-memory mapping; keeping track of what's in RAM vs swap.
3. **File-system management** — creating / deleting files and directories; primitives for manipulation; mapping to physical storage; backup.
4. **Mass-storage management** — disk scheduling, free-space management, storage allocation.
5. **I/O system management** — a general device-driver interface; a buffer-cache/ spool system; specific drivers.
6. **Protection & security** — access control; authentication; audit.
7. **Kernel data structures** — lists, trees, hash tables, bitmaps used inside the kernel.
8. **Computing environments** — traditional, client-server, peer-to-peer, virtualized, cloud, mobile.

**Exam anchor:** when the exam asks "what is a primary OS service," answer from this list in Silberschatz's framing.

### System calls

User programs request OS services through **system calls**. Key patterns:

- **Six categories**: process control, file manipulation, device manipulation, information maintenance, communications, protection.
- **Parameter passing**: three standard methods — pass in registers; pass a block's address (table of args); push on the stack.
- **API vs system call**: the API (POSIX, Win32) is the programmer-visible wrapper; behind it sit the actual kernel entry points (which differ across Linux/Windows/macOS).

### OS structure alternatives (Silberschatz's taxonomy)

| Structure | Characteristics | Examples |
|---|---|---|
| **Simple / monolithic (unstructured)** | No separation; everything together | MS-DOS, early UNIX |
| **Layered** | Each layer uses only lower layers | THE, OS/2 (historical) |
| **Microkernel** | Minimal kernel + user-space services | Mach, MINIX, QNX, seL4 |
| **Modular** | Monolithic core + loadable modules | Modern Linux, Solaris |
| **Hybrid** | Mix of approaches (often microkernel-inspired but monolithic) | macOS (XNU), Windows NT family |

### Booting and system generation (Silberschatz's definitions)

- **System generation (SYSGEN)** — tailoring an OS build for specific hardware (largely historical; modern OSes auto-detect).
- **System boot** — firmware → bootloader → kernel load → kernel init → user-space init.
- **Bootstrap program** — small code in ROM/firmware; locates the kernel on disk and loads it.

### Virtual machines (Ch 16 overlap relevant to system-components scope)

An OS can present itself to guests as if it were hardware. Benefits the Bib cares about:
- Isolation between guests.
- Ability to run different OSes simultaneously.
- Foundation for cloud IaaS.

Types: Type-1 (bare-metal — ESXi, Xen, Hyper-V); Type-2 (hosted — VMware Workstation, VirtualBox, QEMU+KVM's user model).

---

## Chapter 3 — Processes

### Process concept

A **process** is a program in execution. Silberschatz's fine-grained distinction:

- **Program** — passive entity (file on disk).
- **Process** — active entity (running instance, with allocated resources).

A process includes:
- **Text section** — the program's code.
- **Data section** — initialized global variables.
- **Heap** — dynamically-allocated memory during run-time.
- **Stack** — temporary data (function parameters, return addresses, local variables).
- **Current activity** — program counter, register contents.

### Process states (Silberschatz's 5-state model)

![Silberschatz Fig 3.1 — Diagram of process states](images/os-concepts/ch3-process-state.jpeg)
*Figure 3.1 — Five-state process diagram (Silberschatz, Galvin, Gagne, OS Concepts 9e)*

| State | Meaning |
|---|---|
| **New** | Process is being created |
| **Running** | Instructions are being executed |
| **Waiting** | Waiting for an event (I/O completion, signal) |
| **Ready** | Waiting to be assigned to a processor |
| **Terminated** | Finished execution |

Transitions:

- New → Ready (admission).
- Ready → Running (scheduler dispatch).
- Running → Waiting (I/O or event wait).
- Running → Ready (interrupt / time-slice expired).
- Waiting → Ready (I/O or event completion).
- Running → Terminated (exit).

### Process Control Block (PCB)

![Silberschatz Fig 3.2 — PCB structure](images/os-concepts/ch3-pcb.jpeg)
*Figure 3.2 — Process Control Block contents (Silberschatz 9e)*

The kernel's per-process data structure. Contents:

| Field | Purpose |
|---|---|
| **Process state** | New, ready, running, waiting, terminated |
| **Program counter** | Next instruction address |
| **CPU registers** | Accumulator, index, general-purpose, condition codes, stack pointer |
| **CPU scheduling information** | Priority, scheduling queue pointers, scheduling parameters |
| **Memory-management information** | Base/limit registers, page/segment tables |
| **Accounting information** | CPU time used, clock time elapsed, time limits, account numbers, process IDs |
| **I/O status information** | List of I/O devices allocated, list of open files |

### Process scheduling queues

Silberschatz's three queues:

- **Job queue** — all processes in the system.
- **Ready queue** — processes in main memory, ready and waiting to execute.
- **Device queues** — processes waiting for a specific I/O device.

Movement through queues managed by:

- **Long-term scheduler (job scheduler)** — selects processes from mass storage to load into memory. Controls the degree of multiprogramming. Invoked infrequently (seconds/minutes).
- **Short-term scheduler (CPU scheduler)** — selects a ready-queue process to execute next. Invoked frequently (milliseconds).
- **Medium-term scheduler** — swaps processes in and out of memory (swapping). Used to balance multiprogramming level.

### Context switch

![Silberschatz Fig 3.3 — Diagram showing CPU switch from process to process](images/os-concepts/ch3-cpu-switch.jpeg)
*Figure 3.3 — CPU context-switch sequence (Silberschatz 9e)*

Saving the state of the current process + loading the saved state of the next process. **Pure overhead** — the system does no useful work during a switch.

Cost depends on hardware support (register count, existence of multiple register sets). Modern CPUs optimize via partial TLB tagging (PCIDs on x86, ASIDs on ARM).

### Process creation

A parent process creates a child process via `fork` (UNIX) or `CreateProcess` (Windows).

UNIX:
- `fork` — creates a new process as a copy of the parent.
- The `exec` family of syscalls — replaces the child process's image with a new program file (`execve`, `execvp`, `execl`, and siblings; the family name comes from "execute").
- Classic pattern: a `fork` in the parent followed by an `execve` in the child.

Windows `CreateProcess` takes the program-image argument directly and does both steps in one call — more parameters than the UNIX pair.

**Resource sharing options:**
1. Parent and child share all resources.
2. Child shares a subset of parent's resources.
3. Parent and child share no resources.

**Execution options:**
1. Parent and child execute concurrently.
2. Parent waits until child has terminated.

### Process termination

- `exit` system call returns status to parent.
- Parent can terminate child via `abort` (UNIX: `kill`).
- **Orphan** — parent terminates but children continue; UNIX reparents to init (PID 1).
- **Zombie** — child terminates; parent has not yet called `wait` to collect exit status. PCB still in kernel.
- **Cascading termination** — some OSes kill all descendants when a process terminates.

### Inter-process communication (IPC)

Two fundamental models:

**Shared memory:**
- A region of memory shared by two or more cooperating processes.
- Fast — in-kernel-mediated setup only.
- Requires explicit synchronization (semaphores, mutexes).
- POSIX: `shm_open`, `mmap`. SysV: `shmget`, `shmat`.

**Message passing:**
- Processes send/receive discrete messages through OS.
- Easier to implement correctly; slower (syscall per message).
- **Direct vs indirect** — message addressed to specific process ID, vs via a named mailbox/port.
- **Synchronous (blocking) vs asynchronous (non-blocking)** send and receive.
- **Fixed-size vs variable-size** messages.

### Client-server IPC examples

- **Sockets** — pair of endpoints (IP + port). Work within a host (loopback, UNIX domain) or across a network.
- **Remote Procedure Calls (RPCs)** — structured request/response with stub generation. Examples: Sun RPC, DCE RPC, gRPC.
- **Pipes** — ordinary pipes (unidirectional, parent-child), named pipes/FIFOs (full-duplex, any processes).

### Cooperating processes

Must solve:
1. **Information sharing** — multiple users / processes working on shared data.
2. **Computation speedup** — divide a task across cores/machines.
3. **Modularity** — split a system into modular components.
4. **Convenience** — parallel user activities.

Classic textbook problem: **Producer-Consumer** — producer generates items, consumer consumes them, shared bounded buffer. Illustrates synchronization needs.

---

## Chapter 8 — Main Memory + "Memory management" study topic (Ch 9 highlights)

### Background

The CPU can only directly execute instructions in **main memory (RAM)** and its **registers**. Every program must be loaded into memory to run.

Typical memory access patterns:
1. Fetch instruction from memory.
2. Decode and possibly fetch operands from memory.
3. Execute.
4. Store result (possibly back to memory).

**Cache** layers bridge CPU-memory speed gap (covered in Silberschatz Ch 1 storage hierarchy; Bib doesn't directly call it out here but context for memory-management performance).

### Basic hardware

| Register | Purpose |
|---|---|
| **Base register** | Smallest legal physical address for a process |
| **Limit register** | Range of legal addresses |

Hardware checks every memory access against (base ≤ addr < base+limit); violation → trap to OS (segmentation fault).

### Address binding

A program goes through phases before execution; instructions can bind to memory addresses at different times:

| Phase | Binding |
|---|---|
| **Compile time** | If memory location is known in advance, absolute code can be generated (embedded systems, MS-DOS `.COM`). |
| **Load time** | Compiler generates **relocatable code**; final binding deferred to load. |
| **Execution time** | Binding deferred until run time; process can be moved (modern OSes — needs hardware support). |

### Logical vs physical address space

- **Logical address** — generated by CPU (what the program sees).
- **Physical address** — seen by the memory unit.

Compile-time and load-time binding: logical = physical. Execution-time binding: they differ.

**Memory Management Unit (MMU)** — hardware that maps logical to physical. Simplest MMU: adds a **relocation register** to every logical address.

### Dynamic loading and linking

**Dynamic loading** — a routine is not loaded until called. Saves memory when large parts of program aren't used (error handlers etc.).

**Dynamic linking** — linking postponed until execution time. A **stub** locates the library routine, loads it if necessary, replaces itself with the routine's address.

- **Shared libraries** — single physical library used by many processes; on Linux `.so` files, on Windows `.dll`.
- Advantage: memory saving + library upgrades without relinking programs.

### Swapping

A process can be temporarily swapped out of memory to a **backing store** (fast disk), then swapped back later.

- **Context-switch time** dominated by swap time for large processes.
- Modern systems use variants (paging) instead of full-process swapping.
- **Roll out / roll in** — swap out lower-priority process to bring in higher-priority; swap back when done.

### Contiguous memory allocation

Simple schemes before paging:

**Memory protection (base + limit register).**

**Memory allocation:**

- **Single partition** — OS in one section, single process in the rest (MS-DOS).
- **Multiple partition (variable-size)** — OS tracks free holes and allocates on request.

Dynamic-storage-allocation problem — three strategies:

| Strategy | How it picks a hole |
|---|---|
| **First-fit** | First hole large enough |
| **Best-fit** | Smallest hole large enough — leaves smallest leftover |
| **Worst-fit** | Largest hole — leaves largest leftover |

First-fit and best-fit typically outperform worst-fit in both time and storage utilization. First-fit is generally the fastest.

### Fragmentation

- **External fragmentation** — total free memory is sufficient, but it's not contiguous.
- **Internal fragmentation** — memory inside a partition is unused (allocated but not used).

Solutions:
- **Compaction** — shuffle memory contents to consolidate free space (only works with execution-time binding).
- **Paging / segmentation** — allow non-contiguous allocation.

### Paging

![Silberschatz Fig 8.9 — Paging model](images/os-concepts/ch8-paging.jpeg)
*Figure 8.9 — Paging model of logical → physical memory (Silberschatz 9e)*

The dominant modern approach. Physical memory divided into fixed-size **frames**; logical memory into same-size **pages**.

- To run an n-page process, find n free frames; load program from backing store.
- **Page table** maps pages → frames.
- Page size a power of 2 — typically **4 KB** on x86 and ARM.
- Logical address = **page number | page offset**.

**Implementation:**

- Page table kept in main memory.
- **Page-table base register (PTBR)** points to start of the page table; CR3 on x86.
- Every memory reference is now two accesses (fetch page table entry, then data).
- **TLB (Translation Lookaside Buffer)** — associative-memory cache of recent translations; turns the double access back into approximately one access.
- **TLB miss** → page-table walk (slow; hardware or software-managed depending on arch).
- **Effective access time** = hit_ratio × (TLB_time + mem_time) + (1 − hit_ratio) × (TLB_time + 2 × mem_time).

### Memory protection with paging

Each page-table entry has **protection bits** (read / write / execute / valid-invalid). Attempting a protected access traps to the OS.

A **valid-invalid bit** marks pages that are legitimately part of this process's address space vs. not. Paired with **page-table length register (PTLR)** to bound the table.

### Hierarchical / multi-level page tables

A 32-bit address space with 4 KB pages → 2^20 page-table entries per process = 4 MB page table. Too big to keep resident.

**Two-level paging** — page the page table itself.

- Logical address = (outer page index | inner page index | offset).
- On x86-64: **four-level** paging (PML4 → PDPT → PD → PT).
- On x86-64 5-level (Ice Lake+): **five-level** paging for 57-bit addresses.

### Hashed and inverted page tables

**Hashed page table** — hash on page number; chain for collisions. Good for large sparse address spaces.

**Inverted page table** — one entry per **frame** (not per page). Saves space; adds search cost. Used on PowerPC, IA-64.

### Shared pages

Multiple processes can share code pages (re-entrant / read-only) mapped to the same frame. Savings for shell, editor, libc — one physical copy per machine instead of one per process.

### Segmentation

An older model: logical address = (segment number, offset). **Segment table** maps (base, limit) per segment.

Most modern OSes use **paging** as primary, with segmentation disabled or trivialized (flat memory model on x86-64 — CS/DS/SS all have zero base and 2^64 limit).

### Virtual memory (Ch 9 — "memory management" study topic overlap)

![Silberschatz Fig 9.1 — Virtual memory](images/os-concepts/ch9-virtual-memory.jpeg)
*Figure 9.1 — Virtual memory larger than physical memory (Silberschatz 9e)*

Technique allowing execution of processes that are **not completely in memory**. Key benefits:
1. Programs can be larger than physical memory.
2. More processes can be kept in memory simultaneously (higher degree of multiprogramming).
3. Less I/O needed to load / swap processes.

**Demand paging:**
- Pages loaded only when needed (on page fault).
- Pure demand paging — never bring a page into memory until required.
- Kernel's **page-fault handler** checks if reference is legal (via PCB's memory map), finds the page on backing store, chooses a free frame or victim, reads page in, restarts the instruction.

**Copy-on-Write (CoW):**
- `fork` no longer copies every page; parent and child share pages read-only until one writes.
- Write triggers a fault → kernel copies the page before completing the write.
- Common optimization in Linux, Windows, macOS.

**Page replacement** — when no free frame, must choose a victim:

| Algorithm | Logic |
|---|---|
| **FIFO** | Oldest page in memory evicted |
| **Optimal** | Evict page not used for longest time in future (theoretical baseline) |
| **LRU (Least Recently Used)** | Evict page not used for longest time in past |
| **LRU approximations** | Reference bit (additional-reference-bit algorithm); Second-chance / clock |
| **Counting-based** | LFU (Least Frequently Used); MFU (Most Frequently Used) |

**Frame allocation schemes:**
- **Fixed allocation** — equal vs proportional.
- **Priority allocation** — proportional to priority.
- **Global vs local replacement** — whether a process can steal frames from other processes.

**Thrashing** — process spends more time paging than executing. Fix: reduce degree of multiprogramming; use **working-set model** (WSS — pages actively used in the last Δ references) to size frame allocation.

**Page size trade-offs:**
- Larger page — less page-table overhead, fewer faults per iteration, but more internal fragmentation and longer I/O per fault.
- Smaller page — finer granularity, less IF, but bigger page table and TLB pressure.
- Typical modern choices: 4 KB baseline; 2 MB/1 GB hugepages for specialized workloads.

### Kernel memory allocation

User-space gets variable-size allocations from the page-level allocator.
Kernel typically needs fixed-size allocations for kernel structures; custom allocators:

- **Buddy system** — physical memory in power-of-2 chunks; split and coalesce. Linux buddy allocator.
- **Slab allocator** — caches of object-sized chunks for frequently-allocated structures (e.g., task_struct). Minimizes fragmentation, amortizes initialization.

---

## Chapter 17 — Distributed Systems

### Motivation

![Silberschatz Fig 17.1 — A distributed system](images/os-concepts/ch17-distributed.jpeg)
*Figure 17.1 — Distributed system architecture (Silberschatz 9e)*

A **distributed system** is a collection of loosely coupled nodes interconnected by a communication network.

Advantages the Bib focuses on:

1. **Resource sharing** — files, printers, compute cycles, data.
2. **Computation speedup** — work divided among nodes; load sharing.
3. **Reliability** — failures in one node don't take down the whole system (with replication).
4. **Communication** — message passing between geographically-separated users.

### Types of distributed systems

| Type | Characteristics |
|---|---|
| **Client-server** | Server offers a service; clients consume |
| **Peer-to-peer** | Every node is both client and server |
| **Clustered** | Closely-coupled group of computers acting as one system |

### Network structure

Distributed systems depend on the underlying network:

- **LAN (Local Area Network)** — small geographic area, high bandwidth.
- **WAN (Wide Area Network)** — wide geographic area, longer latencies.
- **Topologies** — star, ring, mesh, hybrid (see `JCAC-NETWORKING.md` §4).
- **Communication strategies** — circuit switching vs packet switching.
- **Communication protocols** — layered OSI / TCP-IP stack.
- **Addressing** — naming (DNS) and routing.

### Naming and transparency

- **Naming** — mapping logical names to physical network addresses.
- **Transparency** — hide the fact that resources are remote:
  - Location transparency — name doesn't reveal location.
  - Migration transparency — resource can move without renaming.
  - Access transparency — local and remote look the same programmatically.

### Remote file systems

**NFS (Network File System)** — Sun's protocol, classic remote FS:
- Mount remote directory as a local mount point.
- **Stateless server** (v3) — operations carry all needed state; simplifies crash recovery.
- **Stateful server** (v4) — opens, locks are maintained; better semantics for apps.
- RPC-based.

**AFS (Andrew File System)** — scalable distributed FS with aggressive client-side caching and **session semantics**.

**Session semantics vs UNIX semantics**:
- UNIX semantics — writes instantly visible to other processes reading the file.
- Session semantics — writes visible only after close; concurrent writes are allowed and the last close wins.

### Distributed coordination

**Mutual exclusion** across nodes:

- **Centralized algorithm** — one coordinator node grants access; simple but single-point-of-failure.
- **Distributed algorithm (Ricart-Agrawala)** — multicast request, wait for replies. 2(n−1) messages per critical-section entry.
- **Token-passing** — token circulates the ring; holder enters CS.
- Tradeoffs: centralized fewer messages but SPOF; distributed more resilient but chatty.

**Atomicity** and distributed transactions:

- **Two-phase commit (2PC)** — coordinator sends PREPARE to all participants; waits for all to vote COMMIT or ABORT; on unanimous COMMIT, sends COMMIT; otherwise ABORT.
- **Blocking** — coordinator failure can leave participants stuck.
- **Three-phase commit (3PC)** — adds PRE-COMMIT phase; non-blocking under single-site failure.

**Concurrency control**:
- **Locking protocols** — 2PL (two-phase locking) applied across distributed participants.
- **Timestamp ordering** — each transaction gets a globally-unique timestamp; orders conflicting accesses.

### Deadlock handling (distributed context)

- **Prevention** — ordered resource acquisition across sites (expensive).
- **Avoidance** — requires advance knowledge of resource requests (rare).
- **Detection** — build a global wait-for graph; detect cycles. Centralized vs distributed detection algorithms.

### Election algorithms

When a coordinator fails, a new one must be selected:

- **Bully algorithm** — highest-numbered process wins; sends "I'm the leader" messages.
- **Ring algorithm** — election message travels ring; each node appends its ID; highest wins.

### Reaching agreement

Classical problems:

- **Byzantine Generals** — reach consensus with possibly-faulty (lying) nodes. Needs ≥ 3t+1 nodes to tolerate t faults.
- **Practical Byzantine Fault Tolerance (PBFT)** — implementable BFT consensus.
- **Paxos / Raft** (mentioned in 10e, implied in 9e) — crash-fault-tolerant consensus; foundation of modern distributed coordination (etcd, ZooKeeper, Chubby).

### Communication with faults

**Reliable delivery over unreliable networks:**
- Sequence numbers + acknowledgments + retransmission (TCP model).
- Timeouts chosen larger than worst-case RTT.

**Network partition (split-brain)** — one half of the system can't see the other. CAP theorem: in the presence of a partition (P), systems must choose Consistency (C) or Availability (A).

---

## Cross-book connections

Where Silberschatz's content maps against sibling Bib references:

- Ch 2 system components ↔ `JCAC-OS.md` §1 (Overview of OSes) + §10 (Kernel designs).
- Ch 3 processes ↔ `JCAC-OS.md` §11 (Process internals) + `JCAC-COMP-ORG-ARCH.md` Appendix D (calling conventions, stack frame).
- Ch 3 IPC ↔ `JCAC-OS.md` §11 (IPC table) + `JCAC-UNIX-LINUX.md` §13 (networking services, UNIX domain sockets).
- Ch 8 memory management ↔ `JCAC-OS.md` §14 (memory management) + `JCAC-COMP-ORG-ARCH.md` §14 (memory architecture).
- Ch 9 virtual memory ↔ `JCAC-WINDOWS.md` §8 (Windows architecture — user mode / kernel mode / HAL).
- Ch 17 distributed systems ↔ `JCAC-NETWORKING.md` §1 (fundamentals) + §29 (cloud computing).

---

## Exam-testable concepts (rapid-fire)

### From Ch 2 — OS Structures / System Components

- **How many OS services does Silberschatz list as "helpful for the user"?** 6 — UI, program execution, I/O, file-system, communications, error detection.
- **How many "helpful for the system"?** 3 — resource allocation, accounting, protection/security.
- **System call categories?** 6 — process control, file manipulation, device manipulation, information maintenance, communications, protection.
- **Parameter-passing methods for system calls?** Registers, memory block whose address is in a register, stack.
- **OS structure types in Silberschatz?** Simple/monolithic, layered, microkernel, modular, hybrid.
- **Linux kernel architecture?** Monolithic with loadable modules.
- **Bootstrap program is stored where?** ROM / firmware (unchangeable by user code).

### From Ch 3 — Processes

- **What's the difference between a program and a process?** Program is passive (file); process is active (running instance with resources).
- **Sections of a process in memory?** Text, data, heap, stack (plus current activity — PC + registers).
- **Five process states?** New, ready, running, waiting, terminated.
- **What does a PCB contain?** State, program counter, registers, scheduling info, memory-management info, accounting info, I/O status.
- **What does the long-term scheduler control?** Degree of multiprogramming.
- **What does the short-term scheduler control?** Which ready-queue process runs next.
- **What does the medium-term scheduler do?** Swapping — moves processes between memory and backing store.
- **What's a context switch?** Save current process state, load next process state — pure overhead.
- **UNIX `fork` returns what to the parent?** Child's PID. To the child? 0.
- **Zombie process?** Terminated, but parent has not yet called `wait` to collect status; PCB still present.
- **Orphan process?** Parent terminated; child still running. On UNIX, reparented to init.
- **Two IPC models?** Shared memory, message passing.
- **Message-passing design choices?** Direct vs indirect; blocking vs non-blocking; fixed vs variable size.
- **`CreateProcess` on Windows differs from `fork` + `execve` how?** Takes the program-image argument directly; no separate create-then-replace sequence.

### From Ch 8 — Main Memory

- **What enforces memory protection with base/limit registers?** CPU hardware (MMU); violations trap to OS.
- **Three address-binding times?** Compile time, load time, execution time.
- **Which binding allows process relocation at run time?** Execution-time binding.
- **What's the MMU's job?** Maps logical addresses to physical.
- **Dynamic loading vs dynamic linking?** Loading = routine loaded on call; linking = library resolution deferred to runtime.
- **Swapping's biggest cost?** I/O time for the entire process image.
- **Best-fit vs first-fit vs worst-fit?** Best-fit picks smallest hole; first-fit picks first large-enough hole; worst-fit picks largest hole.
- **Which allocation strategy usually wins on speed?** First-fit.
- **External fragmentation?** Enough total free memory, but not contiguous.
- **Internal fragmentation?** Allocated memory inside a partition is unused.
- **Compaction solves which fragmentation?** External.
- **Paging logical-address format?** Page number + page offset.
- **Standard x86 page size?** 4 KB.
- **What's in the page table?** Mapping from page number to frame number (plus protection bits, valid bit).
- **What's a TLB?** Cache of recent page-to-frame translations.
- **What happens on a TLB miss?** Page-table walk — hardware or software, arch-dependent.
- **Two-level paging needed because?** Full single-level page table too large for large address spaces.
- **Shared pages typically hold what?** Re-entrant (read-only) code — shells, libraries, editors.

### From Ch 9 / "memory management" study topic

- **Demand paging loads pages when?** On first reference (page fault).
- **Who handles a page fault?** OS page-fault handler — checks legality, finds page on backing store, allocates frame, reads page, restarts instruction.
- **Copy-on-Write optimizes what?** `fork` — parent and child initially share pages read-only; copy on first write.
- **FIFO replacement?** Evicts the oldest page in memory.
- **LRU replacement?** Evicts the page not used for the longest time in the past.
- **Optimal replacement?** Evicts the page not used for the longest time in the future — theoretical baseline, unimplementable in practice.
- **Belady's anomaly?** FIFO can produce more page faults with more frames — counterintuitive pathology.
- **Working set?** Pages actively used in the last Δ references — a measure of a process's memory demand.
- **Thrashing?** Process spends more time paging than executing.
- **Fix for thrashing?** Reduce degree of multiprogramming; use working-set model for allocation.
- **Buddy allocator?** Kernel memory allocator working in power-of-2 chunks.
- **Slab allocator?** Kernel allocator caching object-sized chunks for frequently-allocated structures.

### From Ch 17 — Distributed Systems

- **Distributed system advantages?** Resource sharing, computation speedup, reliability, communication.
- **Three distributed-system types?** Client-server, peer-to-peer, clustered.
- **NFS statelessness?** v3 stateless; v4 stateful.
- **Session semantics vs UNIX semantics?** Session = changes visible at close (AFS). UNIX = changes visible immediately.
- **Two-phase commit phases?** Prepare (vote) and Commit (execute).
- **2PC's failure mode?** Blocking — coordinator failure can leave participants stuck.
- **Bully algorithm does what?** Elects a new coordinator — highest-numbered process wins.
- **Byzantine Generals minimum?** 3t+1 nodes tolerate t faulty (lying) nodes.
- **CAP theorem under partition?** Choose Consistency or Availability.
- **Why are timeouts longer than worst-case RTT?** To avoid spurious retransmissions / false-timeout leader elections on slow networks.

---

## Cross-references

- **[Operating System Concepts (Silberschatz), 9e](../references/Operating%20System%20Concepts,%209th%20Edition-9781118063330.pdf)** — the text on disk.
- **[OS: Three Easy Pieces](https://pages.cs.wisc.edu/~remzi/OSTEP/)** — free alternative textbook; useful for reinforcing Silberschatz chapters with different phrasing.
- **[MIT 6.828 Operating System Engineering](https://pdos.csail.mit.edu/6.828/)** — free course materials; labs map closely to Silberschatz Ch 3, 8, 9.
- `JCAC-OS.md` — JCAC Module 5 parallel coverage.
- `JCAC-UNIX-LINUX.md` — Linux-specific process/memory/FS implementation.
- `JCAC-WINDOWS.md` — Windows-specific process/memory/FS implementation.
- `JCAC-COMP-ORG-ARCH.md` — hardware layer beneath the OS (stack frames, memory hierarchy, TLB).
- `BOOK-WIN-INTERNALS-1.md` — Windows Internals deep dive (processes, threads, jobs).
- `BOOK-TCPIP-GUIDE.md` — networking foundation Ch 17 distributed systems build on.
