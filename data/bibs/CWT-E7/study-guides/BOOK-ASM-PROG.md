# Bib Study Guide — Mastering Assembly Programming

> **Bib reference:** *Mastering Assembly Programming* — Alexey Lyashko (Packt, 2017, ISBN 978-1-78712-007-5).
>
> **Regular-exam scope:** Study topics on **general-purpose registers**, **OS interface**, **processor registers**.
> **Substitute-exam scope:** same study topics.
> **Union — what this guide covers:** the x86-64 register file, FLAGS, the stack and calling conventions, how user-mode talks to the kernel (the OS interface), and why register-level reasoning is the foundation for reverse engineering.

**Posture:** The on-disk PDF is a corrupt export. This guide is written against the canonical free sources — the **Intel 64 and IA-32 Software Developer Manual (SDM) Volume 1**, the **OpenSecurityTraining2 Arch1001 x86-64 Assembly** course, **Agner Fog's optimization manuals**, and **Reverse Engineering for Beginners** (Yurichev). Pairs with `JCAC-COMP-ORG-ARCH.md` (digital logic, registers from the JCAC angle), `BOOK-ARCH-COMP-HW.md` (hardware perspective), and `BOOK-REVERSE-ENG.md` (where this material lands in real RE work).

---

## Why register-level reasoning matters

A reverse engineer reads disassembly, not source. Disassembly is operations on **registers**, **memory addressed via registers**, and a small set of **status flags**. If you cannot name every register, what it holds across function boundaries, and what each flag means, you cannot follow a binary. The Bib's three study topics — general-purpose registers, processor registers, and OS interface — are the minimum vocabulary.

The same vocabulary is also what tells you whether a question on the exam about "the EAX register" wants the lower 32 bits of RAX, or the legacy 32-bit register on a 32-bit system. Read every register question in 64-bit context unless the question explicitly says otherwise.

---

## x86-64 architectural overview (one page)

x86-64 (also called AMD64 / Intel 64) is a 64-bit extension of the 32-bit x86 ISA. Key changes from 32-bit:

- 16 general-purpose registers (was 8). All 64 bits wide.
- 64-bit virtual addresses (canonical-form, currently 48-bit or 57-bit implemented).
- New calling conventions (System V on Linux/BSD/macOS; Microsoft x64 on Windows) that pass arguments in registers, not on the stack.
- New instruction prefixes (REX) to encode the new registers and 64-bit operand sizes.
- Removal of most legacy modes when running in long mode (no segmentation effective, no 16-bit task switching).

x86-64 still runs 32-bit code via **compatibility mode** (32-bit user-mode code under a 64-bit OS). Real-mode and v86 mode are gone in long mode.

The Bib leans on the **Intel** vocabulary. AMD's names track Intel's where it matters — the differences are mostly in vendor-specific MSRs and feature flags, not the registers a programmer or RE sees day-to-day.

---

## General-purpose registers (GPRs)

x86-64 has **16 named GPRs**, each 64 bits wide. Each register has overlapping aliases that select the low 32, low 16, low 8, or (for the legacy 8) high-8 bits. The aliases are not separate registers — writing the 32-bit alias also writes the upper 32 bits as zero (a deliberate quirk for performance and code density).

| 64-bit | Low 32 | Low 16 | Low 8 | (Legacy) High 8 | Conventional purpose |
|---|---|---|---|---|---|
| RAX | EAX | AX | AL | AH | Accumulator; function return value (SysV / MS x64); syscall number (Linux) |
| RBX | EBX | BX | BL | BH | Base; callee-saved |
| RCX | ECX | CX | CL | CH | Counter; arg4 (SysV) / arg1 (MS x64) |
| RDX | EDX | DX | DL | DH | Data; arg3 (SysV) / arg2 (MS x64); high half of MUL/DIV |
| RSI | ESI | SI | SIL | — | Source index; arg2 (SysV) |
| RDI | EDI | DI | DIL | — | Destination index; arg1 (SysV) |
| RBP | EBP | BP | BPL | — | Base / frame pointer; callee-saved |
| RSP | ESP | SP | SPL | — | Stack pointer (architectural — do not clobber) |
| R8  | R8D | R8W | R8B | — | arg5 (SysV) / arg3 (MS x64) |
| R9  | R9D | R9W | R9B | — | arg6 (SysV) / arg4 (MS x64) |
| R10 | R10D | R10W | R10B | — | scratch; static chain on SysV; syscall clobbers (used internally) |
| R11 | R11D | R11W | R11B | — | scratch; syscall clobbers RFLAGS-equivalent on SYSCALL |
| R12 | R12D | R12W | R12B | — | callee-saved |
| R13 | R13D | R13W | R13B | — | callee-saved |
| R14 | R14D | R14W | R14B | — | callee-saved |
| R15 | R15D | R15W | R15B | — | callee-saved |

Two rules worth memorizing cold:

1. **Writing a 32-bit alias zero-extends to 64 bits.** `mov eax, 1` sets RAX = 1. `mov ax, 1` does *not* clear the upper 48 bits — only 32-bit writes zero-extend.
2. **The high-8 aliases (AH, BH, CH, DH) are legacy and cannot be encoded together with the new R8–R15 family in the same instruction.** This is a REX-prefix encoding constraint, not a programmer rule, but it shows up when reading optimized compiler output.

### Programmer-visible vs architectural use

- **Programmer-visible:** RAX–R15 are all available to any code at any privilege.
- **Architectural reservation:** RSP is the stack pointer — pop / push / call / ret all assume it. Clobbering RSP off the stack frame is how stack-pivot exploits work.
- **Frame pointer (RBP):** by convention only; modern compilers often omit it (`-fomit-frame-pointer`) and use RSP-relative addressing.

### Reading a disassembly fragment

```
sub  rsp, 0x20             ; prologue: allocate 32 bytes of local space
mov  [rsp+0x18], rcx       ; save arg1 (rcx, MS x64) to local slot
xor  eax, eax              ; zero RAX (idiomatic clear)
call qword ptr [rip+0x...] ; call via RIP-relative pointer
mov  ecx, eax              ; copy 32-bit return to ECX (zero-extends to RCX)
add  rsp, 0x20             ; epilogue: deallocate
ret
```

Every line touches a register. If you cannot name what each line does to each register, you cannot follow the function. Practice on `objdump -d -M intel`, IDA, Ghidra, or x86-64 godbolt output.

---

## Processor registers beyond the GPRs

The Bib's "processor registers" topic covers the non-GPR register file. The Intel SDM Vol 1 lays them out by class.

### Instruction pointer
- **RIP** — 64-bit instruction pointer. Not addressable directly; modified by control-flow instructions (CALL, JMP, JCC, RET) and by RIP-relative addressing modes that the x86-64 ISA added for position-independent code.

### FLAGS / RFLAGS

A 64-bit status register. Only the lower 32 bits are populated; the top 32 are reserved-zero. Bits 0–31 hold individual flag bits set/cleared by arithmetic, logic, and control instructions.

**Status bits (set by arithmetic / logic):**

| Bit | Name | Set when |
|---:|---|---|
| 0 | CF — Carry | Unsigned overflow / borrow out of MSB |
| 2 | PF — Parity | Low byte of result has even number of 1 bits |
| 4 | AF — Auxiliary Carry | Carry from bit 3 (used by BCD instructions) |
| 6 | ZF — Zero | Result is zero |
| 7 | SF — Sign | MSB of result is 1 (interpreted as negative) |
| 11 | OF — Overflow | Signed overflow |

**System bits (set by mode / control):**

| Bit | Name | Meaning |
|---:|---|---|
| 8 | TF — Trap | Single-step trap (debugger uses this) |
| 9 | IF — Interrupt enable | If clear, maskable IRQs are disabled |
| 10 | DF — Direction | If set, string instructions (MOVS, LODS, STOS) decrement |
| 12-13 | IOPL | I/O privilege level (legacy) |
| 14 | NT — Nested Task | Legacy task-switch flag |
| 16 | RF — Resume | Resume after a debug-trap |
| 17 | VM — Virtual-8086 | Legacy v86 mode (not relevant in long mode) |
| 18 | AC — Alignment Check | If set, raises #AC on misaligned memory access in CPL=3 (used by SMAP enforcement) |
| 21 | ID — ID flag | If software can toggle this, CPUID is supported (always true on modern CPUs) |

**Conditional branches (JCC) test these flags.** "JE" / "JZ" = jump if ZF=1. "JNE" / "JNZ" = jump if ZF=0. "JG" (signed) = jump if ZF=0 AND SF=OF. The signed vs unsigned conditional family is the most common point of confusion when reading disassembly.

### Segment registers (legacy + system use)
- CS, DS, ES, SS, FS, GS — six segment registers, each holding a 16-bit segment selector.
- In long mode, CS/DS/ES/SS are effectively zero-based (segmentation flattened).
- **FS and GS** carry a hidden 64-bit base address that the OS uses for thread-local storage. On Linux, **FS** holds the TLS base (`__thread` variables); on Windows, **GS** holds the **Thread Information Block (TIB)** / **Thread Environment Block (TEB)**. Windows malware reads `gs:[0x60]` to reach the **Process Environment Block (PEB)** for PEB-walking the loaded-module list.

### Control registers (CR0–CR8)
Mode + paging + feature control. Examples worth recognizing:
- **CR0** — bit 0 (PE) protected mode; bit 31 (PG) paging.
- **CR2** — last faulting linear address (#PF handler reads it).
- **CR3** — base of the page-table hierarchy for the current process.
- **CR4** — extension-feature toggles: PAE, PSE, OSXSAVE, SMEP, SMAP, FSGSBASE, UMIP, etc. SMEP and SMAP are the kernel-protection bits that defeat ret2usr-style exploits.
- **CR8** (long mode only) — task priority register.

### Debug registers (DR0–DR7)
Four hardware breakpoint address registers (DR0–DR3) + status (DR6) + control (DR7). Used by debuggers and by some anti-debug techniques (malware checks DR0–DR3 for nonzero and bails).

### MSRs (Model-Specific Registers)
A large per-vendor / per-family register file read/written via RDMSR / WRMSR (privileged). Notable ones for RE:
- **IA32_EFER** — long-mode enable, NX enable.
- **IA32_LSTAR** — entry point for the SYSCALL fast syscall path (kernel installs its syscall handler address here).
- **IA32_SYSENTER_CS / EIP / ESP** — legacy SYSENTER fast-syscall trio (used on 32-bit / WoW64).

### MMX / SSE / AVX / AVX-512 (vector + FP)
- **XMM0–XMM15** — 128-bit (SSE).
- **YMM0–YMM15** — 256-bit (AVX). Lower 128 bits alias the XMM register of the same number.
- **ZMM0–ZMM31** — 512-bit (AVX-512). Lower 256 bits alias YMM.
- **MXCSR** — control/status register for SSE.
- Calling conventions pass floating-point arguments in XMM0–XMM7 (SysV) or XMM0–XMM3 (MS x64).

The Bib is unlikely to test AVX-512 internals at the E-7 level, but recognizing XMM/YMM in disassembly matters when reading compiled C++ code that vectorizes loops.

---

## The stack and calling conventions

The stack lives in process memory at high addresses and grows toward low addresses. RSP points at the top (lowest occupied address).

### Two conventions to know cold

**System V AMD64 ABI (Linux, BSD, macOS):**
- Integer/pointer args: RDI, RSI, RDX, RCX, R8, R9 (in that order).
- Floating-point args: XMM0–XMM7.
- Additional args spill onto the stack right-to-left.
- Return value: RAX (and RDX for 128-bit returns); XMM0 for FP.
- **Callee-saved:** RBX, RBP, R12–R15 (and RSP).
- **Caller-saved:** RAX, RCX, RDX, RSI, RDI, R8–R11.
- 128-byte **red zone** below RSP that leaf functions may use without adjusting RSP.

**Microsoft x64 calling convention (Windows):**
- Integer/pointer args: RCX, RDX, R8, R9.
- Floating-point args: XMM0–XMM3 (positionally aligned with the integer slot they replace).
- 32 bytes of **shadow space** reserved by the caller above the return address (callees may spill the first four register args there).
- Return value: RAX.
- **Callee-saved:** RBX, RBP, RDI, RSI, R12–R15, XMM6–XMM15.
- **Caller-saved:** RAX, RCX, RDX, R8–R11, XMM0–XMM5.
- No red zone.

The vendor difference shows up in disassembly. When you see `mov rcx, ...; mov rdx, ...; call ...` at the start of a call site, you're on Windows. When you see `mov rdi, ...; mov rsi, ...; call ...`, you're on Linux/BSD.

### Function prologue / epilogue (typical)

```
push rbp             ; save caller's frame pointer
mov  rbp, rsp        ; establish our frame pointer
sub  rsp, 0x30       ; reserve 48 bytes of local space
...
mov  rsp, rbp        ; tear down locals
pop  rbp             ; restore caller's frame pointer
ret                  ; pop return address into RIP
```

Modern compilers often drop the explicit frame pointer; you'll see only `sub rsp, N` / `add rsp, N`. Reading `.eh_frame` (DWARF unwind info) or PDB info recovers the frame structure when the prologue doesn't make it obvious.

### Call / ret mechanics

- `call rel32`: push RIP, jump to target.
- `ret`: pop return address into RIP. (`ret imm16` also adds `imm16` to RSP — used by stdcall callees to clean their own arg space, mostly on 32-bit Windows.)
- The CPU has a small **return address stack predictor** that pairs each CALL with a future RET. Stack pivots, ROP, and JOP all defeat this predictor and cause measurable performance and branch-misprediction signal.

---

## The OS interface (the syscall path)

The Bib's "OS interface" study topic covers how user-mode requests services from the kernel. Two paths matter on x86-64.

### Linux: SYSCALL / SYSRET

```
mov  rax, <syscall number>     ; e.g. 0 = read, 1 = write, 60 = exit
mov  rdi, <arg1>               ; syscall arg1
mov  rsi, <arg2>               ; syscall arg2
mov  rdx, <arg3>               ; syscall arg3
mov  r10, <arg4>               ; arg4 (not RCX — see below)
mov  r8,  <arg5>               ; arg5
mov  r9,  <arg6>               ; arg6
syscall                        ; trap to kernel
; on return:
;   RAX = result (negative on error in -errno form)
;   RCX = saved RIP (clobbered)
;   R11 = saved RFLAGS (clobbered)
```

Note the **RCX/R10 swap**. The user-space calling convention uses RCX as arg4, but the SYSCALL instruction itself uses RCX to save the user-space RIP. The kernel ABI therefore uses R10 in place of RCX for syscalls. This is the single most common source of confusion when reading Linux syscall stubs.

Authoritative Linux syscall tables:
- 64-bit table: `arch/x86/entry/syscalls/syscall_64.tbl` in the Linux source.
- man-page index: `man 2 syscalls`.

### Windows: SYSCALL via ntdll stubs

On Windows the syscall ABI is **undocumented and version-specific** — Microsoft reserves the right to renumber and change semantics at any point. Programs almost never issue SYSCALL directly; they call **ntdll.dll** wrappers (`NtCreateFile`, `NtAllocateVirtualMemory`, etc.), which in turn execute the SYSCALL using a syscall number that's looked up in the loaded ntdll image.

A typical ntdll stub:

```
NtCreateFile:
    mov  r10, rcx        ; save user-space RCX into R10 (same RCX/R10 quirk)
    mov  eax, 0x55       ; syscall number — varies by Windows version!
    syscall              ; trap
    ret
```

Malware that does **direct syscalls** (Hell's Gate, Halo's Gate, etc.) does this to bypass user-mode hooks installed by EDR products into ntdll. Recognizing a hand-written syscall stub is part of the RE process.

### Older paths

- **INT 0x80** — legacy Linux syscall entry. Still works on 64-bit kernels for 32-bit compat code but uses the 32-bit syscall numbering (different table). Tiny shellcode often still uses this.
- **SYSENTER / SYSEXIT** — Intel's earlier fast-syscall pair, used on 32-bit Windows. The fields are loaded from IA32_SYSENTER_CS / EIP / ESP MSRs.

---

## Memory model and the address space

A user-mode process on x86-64 sees a flat 64-bit address space (canonical-form: low half is user, high half is kernel). The OS divides this into:

- **Code (`.text`)** — RX, usually loaded RIP-relative.
- **Read-only data (`.rodata`)** — R, string literals and const tables.
- **Initialized data (`.data`)** — RW, global vars.
- **BSS (`.bss`)** — RW, zero-initialized at load.
- **Heap** — RW, grown via syscalls (brk/mmap on Linux; VirtualAlloc on Windows).
- **Stack(s)** — RW, one per thread, grows down.
- **Shared libraries** — mapped read-only-shared with copy-on-write data segments.

A reverse engineer reads the section table (`readelf -S`, `objdump -h`, IDA segments) before anything else. The section the function lives in tells you the permissions you can assume.

### NX / DEP

Modern OSes mark the stack and heap non-executable. The **NX bit** in page-table entries is what enforces it. Bypassing NX requires either:
- A writable + executable mapping (rare on hardened systems — W^X is the standard).
- ROP/JOP — chain existing executable gadgets instead of injecting shellcode.

The instruction-level question "which register holds the page-fault address" — **CR2** — comes from this layer.

---

## Mapped to Bib study topics

| Bib topic | Where the answer lives |
|---|---|
| **General-purpose registers** | The 16-GPR table above. Know names, sizes, aliases, callee-saved vs caller-saved per ABI, and the zero-extension rule. |
| **Processor registers** | RFLAGS bits + segment / FS-GS / CRn / DRn / MSR families. Know what each register class is for and recognize the named ones in disassembly. |
| **OS interface** | SYSCALL semantics (RAX = syscall number, R10 instead of RCX for arg4), RCX / R11 clobbers, ntdll wrappers on Windows, INT 0x80 on legacy Linux. |

---

## Common exam-style question stems (open-source framing)

- "Which register holds the syscall number on Linux x86-64?" — **RAX**.
- "On x86-64 System V, which register holds the first integer argument?" — **RDI**.
- "On Microsoft x64, which register holds the first integer argument?" — **RCX**.
- "Which RFLAGS bit is set after `sub eax, eax`?" — **ZF** (result is zero); CF cleared; PF set; SF cleared; OF cleared.
- "On a `jge` (jump if greater-or-equal, signed), which flags are tested?" — **SF == OF**.
- "Which control register holds the page-table base?" — **CR3**.
- "Which control register holds the faulting linear address on #PF?" — **CR2**.
- "Which segment register's hidden base addresses the Thread Environment Block on Windows x64?" — **GS** (`gs:[0x30]` on 64-bit Windows is the TEB; `gs:[0x60]` is the PEB).
- "What does `mov eax, ...` do to the upper 32 bits of RAX?" — clears them (zero-extends).
- "Why does the Linux SYSCALL ABI use R10 in place of RCX for arg4?" — SYSCALL itself overwrites RCX with the user-space RIP.

---

## How to actually study this on the boat

1. Open the Intel SDM Vol 1 (basic architecture). Read Chapters 3 (basic execution environment) and 5 (instruction set summary) — about 100 pages total.
2. Work the OST2 Arch1001 labs. Plan ~20 hours; you'll write small assembly programs and trace them in a debugger.
3. Compile a C function on godbolt with `-O0` then `-O2`. Read the disassembly side by side until you can predict what optimization will do.
4. Read Yurichev's "Reverse Engineering for Beginners" Part 1 — calling-convention examples are exhaustive.
5. Skim Agner Fog's "Optimizing Assembly" Chapter 2 for the register-allocation perspective.

---

## Free / adjacent sources (canonical)

- **Intel 64 and IA-32 SDM Vol 1 (Basic Architecture)** — Intel's own specification. Free PDF. Cover everything in this guide and much more. `https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html`
- **OpenSecurityTraining2 Arch1001: x86-64 Assembly** — free hands-on course. `https://p.ost2.fyi/`
- **OpenSecurityTraining2 Arch2001: x86-64 OS Internals** — follow-on covering the OS-interface scope.
- **Agner Fog — Optimizing Software in Assembly** — `https://www.agner.org/optimize/`
- **Dennis Yurichev — Reverse Engineering for Beginners (`beginners.re`)** — 942-page CC BY-SA textbook. Calling-convention chapters are required reading.
- **AMD64 Architecture Programmer's Manual Vol 2 (System Programming)** — the AMD counterpart to the Intel SDM; same material, different vendor view.

---

## Cross-references

- `JCAC-COMP-ORG-ARCH.md` — digital logic, register fundamentals from the JCAC angle.
- `BOOK-ARCH-COMP-HW.md` — hardware perspective on registers and the memory hierarchy.
- `BOOK-REVERSE-ENG.md` — where every concept above shows up in real RE practice.
- `JCAC-WINDOWS.md` — Windows process / memory protection layer.
- `BOOK-WIN-INTERNALS-1.md` (where it exists in your Bib) — process and thread anatomy in Windows.
