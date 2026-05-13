# Bib Study Guide — Gray Hat Hacking: The Ethical Hacker's Handbook (6th Edition)

> **Bib reference:** *Gray Hat Hacking: The Ethical Hacker's Handbook*, 6th Edition — Allen Harper, Ryan Linn, Stephen Sims, Michael Baucom, Daniel Fernandez, Huascar Tejeda, Moses Frost (McGraw Hill, 2022, ISBN 978-1-264-26895-5).
>
> **Regular-exam scope:** Chapter 21.
> **Substitute-exam scope:** Chapters 2, 3, 6, 10, 17 + study topics on **intro to fuzzing**.
> **Union — what this guide covers:** Ch 2 (Programming Survival Skills), Ch 3 (Linux exploit-dev tools / environment), Ch 6 (emerging-tech exploitation, e.g., SDR / IoT), Ch 10 (Basic Linux exploits — memory corruption fundamentals), Ch 17 (advanced fuzzing), Ch 21 (web-application exploitation / next-generation web attacks).

**Posture:** Gray Hat Hacking is an offensive-security reference. This study guide teaches the **concepts and vulnerability classes** an exam item will reference, without reproducing weaponized code. The defensive counterparts — mitigations, indicators, detection — sit alongside each offensive topic, because the CWT Chief's job is to understand both sides. Actual exploit development stays in the source text; this guide maps the terrain.

---

## Ch 2 — Programming Survival Skills

Exploit development requires comfort with three environments: **C**, **x86/x64 assembly**, and one **scripting language** (Python primary).

### C essentials for vulnerability work

- **Pointers and arrays** — understand pointer arithmetic, array decay, sizeof pitfalls.
- **Memory regions** — `.text` (code), `.rodata`, `.data`, `.bss`, heap, stack.
- **Stack frame** — saved return address, saved base pointer, locals (see `JCAC-COMP-ORG-ARCH.md` Appendix D).
- **Unsafe string functions** — `strcpy`, `strcat`, `gets`, `sprintf` (pre-C99), `scanf` with `%s` — all lack bounds checks.
- **Integer overflow** — `size_t` wrap on 32-bit, signed-unsigned conversion gotchas.
- **Format strings** — `printf(user_input)` lets an attacker read and write memory via `%n` / `%s` / `%x`.

### Assembly essentials (x86-64)

Both Intel syntax (used in GHH and MASM) and AT&T syntax (default on Linux `objdump`, `gdb`) appear in exam material.

Key registers:

- **RIP** — instruction pointer. Not directly writable; `call`, `ret`, `jmp` modify.
- **RSP** — stack pointer. Decremented on push, incremented on pop.
- **RBP** — base pointer (traditional; omitted at `-O2` with `-fomit-frame-pointer`).
- **RAX** — return value / syscall number.
- **RDI, RSI, RDX, RCX, R8, R9** — SysV AMD64 first six integer args.
- **RFLAGS** — status flags (ZF, SF, CF, OF, etc.).

Key instructions:

- Data movement: `mov`, `push`, `pop`, `lea`, `xchg`.
- Arithmetic: `add`, `sub`, `mul`, `div`, `inc`, `dec`.
- Bitwise: `and`, `or`, `xor`, `not`, `shl`, `shr`, `sar`.
- Control flow: `cmp`, `test`, `jmp`, `je`/`jne`/`jl`/`jg`/`jle`/`jge`/`ja`/`jb`, `call`, `ret`, `int`, `syscall`.

Syscall convention on Linux (SysV AMD64):

- Syscall number in `rax`.
- Args in `rdi, rsi, rdx, r10, r8, r9` (note `r10`, not `rcx`, for 4th arg — kernel uses `rcx` for the return address of `syscall`).
- `syscall` instruction enters kernel.
- Return value in `rax`; error encoded as negative value.

### Python for exploit dev

- **`struct`** — pack/unpack binary data (`struct.pack("<I", 0x41414141)`).
- **`ctypes`** — call native C functions.
- **`pwntools`** — standard exploit framework (`from pwn import *`):
  - `p32()`, `p64()`, `u32()`, `u64()` — pack/unpack.
  - `cyclic()` / `cyclic_find()` — De Bruijn patterns for offset discovery.
  - `process()` / `remote()` — launch local or remote target.
  - `p.sendline()`, `p.recvuntil()`, `p.interactive()`.
  - `context.arch` / `context.os` — set target architecture.
- **`ROPgadget`**, **`ropper`**, **`pwntools.rop`** — locate ROP gadgets in a binary.

---

## Ch 3 — Linux Exploit-Dev Tools

A disciplined exploit lab.

### Core tools

| Tool | Purpose |
|---|---|
| **gdb + pwndbg / peda / gef** | Interactive debugger with exploit-dev enhancements |
| **objdump -d** | Disassemble |
| **readelf** | ELF header / section / dynamic-section inspection |
| **nm** | Symbol table |
| **strings** | Extract printable strings |
| **ltrace / strace** | Library / syscall trace |
| **checksec** | Report binary protections (NX, ASLR/PIE, RELRO, canary, Fortify) |
| **pwntools** | Exploit scaffolding framework |
| **ROPgadget / ropper** | Gadget search |
| **one_gadget** | Locate convenient `libc` gadgets |
| **radare2 / Cutter** | Advanced disassembly / binary analysis |
| **Ghidra** | NSA-released free reverse-engineering suite |
| **IDA Pro / Binary Ninja** | Commercial REs |
| **qemu-user** | Run cross-arch binaries locally |

### Binary protections — `checksec` output

```
    Arch:     amd64-64-little
    RELRO:    Full RELRO
    Stack:    Canary found
    NX:       NX enabled
    PIE:      PIE enabled
    RPATH:    No RPATH
    RUNPATH:  No RUNPATH
    Symbols:  100
    FORTIFY:  Yes
    Fortified: 3
    Fortifiable: 5
```

Meaning:

- **NX enabled** — data pages non-executable (no straight shellcode on stack).
- **Stack canary** — random cookie between locals and saved return; function checks on exit.
- **PIE** (Position Independent Executable) — executable base randomized (combines with ASLR).
- **Full RELRO** — GOT read-only after load (no GOT overwrite).
- **FORTIFY** — compiler replaces unsafe libc calls with bounds-checked variants at known sizes.

Each protection bypasses the attacker must chain through.

### Basic gdb workflow

```
$ gdb ./vuln
(gdb) disas main
(gdb) break *main+42
(gdb) run < input.bin
(gdb) info registers
(gdb) x/32wx $rsp
(gdb) x/s $rdi
(gdb) vmmap                # pwndbg/gef
(gdb) checksec             # pwndbg
(gdb) rop --search "pop rdi; ret"
```

### ASLR and how to check

```
$ cat /proc/sys/kernel/randomize_va_space
2                   # 2 = full randomization; 0 = disabled; 1 = partial

# Temporarily disable (testing only, requires root)
$ echo 0 | sudo tee /proc/sys/kernel/randomize_va_space
```

### Memory-corruption lab (concept)

Exploit development relies on **reproducible crashes**. The workflow:

1. **Discover** — a crash (via fuzzing or manual review).
2. **Triage** — is the crash exploitable (memory corruption vs pure null deref)?
3. **Offset discovery** — use a cyclic pattern to find the precise offset where attacker input reaches the saved return address.
4. **Control** — overwrite saved return or indirect jump target with a chosen value.
5. **Redirect** — jump to controlled code.
6. **Bypass mitigations** — defeat NX (ROP), ASLR (leak), canary (leak).
7. **Payload** — achieve the attacker goal (shell, privilege escalation, data exfil).

---

## Ch 6 — SDR / IoT / Emerging Tech (likely GHH 6e Ch 6)

The 6th edition emphasizes **software-defined radio (SDR)** and **IoT** exploitation as emerging attack surfaces.

### Software-Defined Radio

SDR lets a generic radio transceiver implement any protocol via software. Hardware: HackRF One, LimeSDR, USRP, RTL-SDR (receive only, <$30).

Surface:

- **Frequency coverage** — RTL-SDR ~24 MHz–1.7 GHz receive; HackRF 1 MHz–6 GHz half-duplex TX/RX; USRP broader.
- **Targets**:
  - Wi-Fi (2.4 / 5 / 6 GHz).
  - Bluetooth.
  - Zigbee, Z-Wave, Thread (802.15.4 PANs).
  - Automotive key fobs (CAN, RF remotes).
  - Garage doors, smart locks, alarm panels.
  - Industrial control radios (LoRa, SCADA telemetry).
  - Cellular (LTE, 5G — GSM is legacy).
  - GNSS / GPS.
  - Broadcast TV / Radio.
- **Attack classes**:
  - **Passive eavesdropping** — capture and decode.
  - **Replay attacks** — record a key-fob signal, play it back.
  - **Rolling-code bypasses** — like RollJam.
  - **Fuzzing** — send malformed frames to test receiver robustness.
  - **Denial of service** — jam a band.
  - **Spoofing** — GPS spoofing drifts time or location.

Tooling: **GNU Radio**, **Universal Radio Hacker (URH)**, **inspectrum**, **gr-gsm**, **rtl_433**.

### IoT exploitation surface

- **Firmware extraction** — UART headers, JTAG/SWD, flash-chip desolder, exploit of OTA update channels.
- **Hardcoded credentials** — embedded root passwords / Wi-Fi keys in firmware.
- **Outdated software stacks** — busybox, older OpenSSL, Linux kernels years out of date.
- **Weak cryptography** — hardcoded keys, plaintext protocols, custom (broken) crypto.
- **Default accounts** — admin/admin on web UI.
- **Cloud integration** — IoT device phoning home to weakly-secured AWS/Azure endpoints.

Tools: **binwalk**, **firmwalker**, **firmadyne**, **EMBA**, **Ghidra** for firmware.

### Defender countermeasures

- **Secure boot** from immutable root of trust (ROM key).
- **Signed firmware updates** over authenticated channel.
- **Per-device credentials** (unique key per device).
- **Hardware-backed crypto** (TPM, Secure Enclave, ATECC).
- **Network segmentation** — VLAN / VRF isolation for IoT.
- **Monitoring** — network flow analytics catching anomalous IoT behavior.

---

## Ch 10 — Basic Linux Exploits (Memory-Corruption Fundamentals)

### The classic stack buffer overflow (concept)

When a function copies attacker-controlled data into a fixed-size stack buffer **without bounds checking**, the excess overwrites:

1. Local variables (immediately adjacent).
2. The saved base pointer (RBP).
3. The saved return address (RIP).
4. Arguments that were passed via stack (for the outer function).
5. Further up the stack into the caller's frame.

If the attacker controls RIP, they control where execution goes when the function returns.

Mitigations already introduced:

- **Stack canary** — value between locals and saved RBP/RIP; checked on function exit. Defeat requires leaking or guessing.
- **NX** — data pages non-executable; straight shellcode-on-stack impossible.
- **ASLR / PIE** — base addresses randomized per boot/per exec; defeat requires an info-leak.

### Return-Oriented Programming (ROP) — conceptual

Rather than inject new code (blocked by NX), the attacker chains **existing short instruction sequences ending in `ret`** — each called a **gadget**. A carefully-chosen gadget chain makes the program perform arbitrary work using only bytes it already contains.

Gadget examples (as conceptual snippets):

- `pop rdi; ret` — loads the next stack value into RDI (for the first function argument).
- `pop rsi; pop r15; ret` — loads two stack values.
- `mov qword ptr [rdi], rsi; ret` — memory write primitive.

A ROP chain typically:

1. Leaks a library base address (using a function like `puts` to print a GOT entry).
2. Computes the offset to a useful target (e.g., libc's `system` or `execve`).
3. Calls that target with attacker-controlled arguments.

Defeat of ROP: **CFI (Control Flow Integrity)**, **shadow stack (Intel CET)**, **restricted calling conventions**.

### Heap-corruption primitives

Beyond the stack, the heap's allocator metadata is a target:

- **Use-after-free (UAF)** — pointer dereferenced after `free()`; attacker re-allocates the freed chunk with controlled data.
- **Double-free** — freeing the same chunk twice corrupts allocator freelist.
- **Heap buffer overflow** — overflow into adjacent chunk's metadata.
- **Unlink-write** — classic glibc `unlink` macro gave attacker a 4-byte-write primitive; mitigated by modern glibc.
- **House of Spirit / House of Force / Tcache Poisoning** — named techniques exploiting specific glibc heap behaviors.

### Format-string vulnerability

```c
printf(user_input);             /* vulnerable — CWE-134 */
printf("%s", user_input);       /* safe */
```

- `%x` reads stack values.
- `%s` dereferences as a pointer and prints the string — useful for reading memory.
- `%n` writes the number of bytes printed so far to a pointer on the stack — memory-write primitive.

### Integer bugs

```c
unsigned short len = read_short(packet);       /* attacker-controlled */
char *buf = malloc(len + 1);                    /* overflow if len == 0xFFFF, becomes 0 */
memcpy(buf, packet_data, len);                  /* writes ~64 KB into a 0-byte allocation */
```

Classes: **overflow** (CWE-190), **underflow** (CWE-191), **signed-to-unsigned conversion** (CWE-195), **off-by-one** (CWE-193).

### Null-pointer dereference

On older Linux kernels with `mmap_min_addr = 0`, an attacker could `mmap` the zero page and then cause a kernel null-dereference to execute attacker-controlled code. Modern kernels set `mmap_min_addr = 65536`.

### Cross-build and compiler flags

```
gcc -g -O0 -fno-stack-protector -z execstack -no-pie vuln.c -o vuln
```

This disables protections for a practice lab:
- `-O0` — no optimization.
- `-fno-stack-protector` — no canary.
- `-z execstack` — stack marked executable.
- `-no-pie` — fixed base addresses (no PIE).

Production builds have **opposite** flags: `-O2 -fstack-protector-strong -D_FORTIFY_SOURCE=2 -Wl,-z,relro -Wl,-z,now -pie`.

---

## Ch 17 — Advanced Fuzzing

### What fuzzing is

**Fuzzing** is automated testing that feeds randomized/crafted inputs to a target and monitors for anomalies (crashes, hangs, memory errors, unexpected branches).

The Bib study topic is "intro to fuzzing" — defined foundations, not advanced technique.

### Fuzzer taxonomy

| Dimension | Categories |
|---|---|
| **Awareness** | Dumb (random bytes) / Smart (format-aware) |
| **Feedback** | Blackbox (no runtime info) / Whitebox (source + symbolic exec) / Greybox (coverage-guided) |
| **Mutation strategy** | Random / Grammar-based / Template-based / Generational |
| **Targets** | File parsers / Network services / Kernel syscalls / Interpreters |

### Coverage-guided greybox fuzzing (AFL, libFuzzer, Honggfuzz)

The dominant modern approach:

1. **Instrumentation** — compile target with coverage probes (`afl-gcc`, `-fsanitize=fuzzer-no-link`, etc.).
2. **Corpus** — seed inputs.
3. **Mutation** — take seeds, mutate bits/bytes/structure.
4. **Execution** — run target with mutated input; measure coverage.
5. **Retain** mutations that hit **new edges** (branches).
6. **Repeat** — millions of iterations per second.
7. **Minimize** — when a crash is found, shrink the input to the smallest reproducing case.

### Fuzzer comparison

| Fuzzer | Type | Language |
|---|---|---|
| **AFL / AFL++** | Greybox, coverage-guided | C/C++ (via afl-cc/afl-clang) |
| **libFuzzer** | In-process, coverage-guided | Clang-instrumented target |
| **Honggfuzz** | Greybox | C/C++, kernel |
| **Radamsa** | Dumb mutator | File-format agnostic |
| **Peach** | Generational, template-based | Structured protocols |
| **boofuzz** | Smart, network protocols | Python — sessions/state machines |
| **Go-fuzz** / native `testing` fuzz (Go 1.18+) | Coverage | Go |
| **Atheris** | libFuzzer wrapper | Python C-extensions |
| **ClusterFuzz / OSS-Fuzz** | Fleet orchestration | Large-scale |

### Targets for fuzzing

- **Parsers** — file format libraries (PDF, ZIP, PNG, font renderers).
- **Network services** — protocol handlers with state machines (SMB, HTTP, DNS, TLS).
- **Kernel syscalls** — syzkaller fuzzes Linux syscalls and found hundreds of CVEs.
- **Crypto implementations** — boofuzz / custom harnesses against TLS stacks.
- **Interpreters** — V8, CPython, CRuby — parsing attacker scripts.

### Sanitizers pair with fuzzers

- **AddressSanitizer (ASan)** — detects heap / stack / global buffer overflows, UAF, double-free at runtime.
- **UndefinedBehaviorSanitizer (UBSan)** — detects integer overflow, null-deref, misaligned loads.
- **ThreadSanitizer (TSan)** — data races.
- **MemorySanitizer (MSan)** — use of uninitialized memory (Clang only).
- **LeakSanitizer (LSan)** — memory leaks.

A fuzzer + sanitizer combo catches bugs that would otherwise produce silent corruption or far-delayed crashes.

### Fuzzing in CI

- **OSS-Fuzz** — Google's free continuous fuzzing service for open-source projects.
- **ClusterFuzzLite** — self-hostable GitHub Action.
- **Sourcehut Fuzz**, **CIFuzz** — alternatives.

### Intro-to-fuzzing deliverables

A small fuzzing campaign typically produces:

- **Reproducers** — minimal input files that trigger each unique crash.
- **Stack traces** with sanitizer reports.
- **Coverage report** showing which branches were reached.
- **Bug reports** filed with the project (optionally via coordinated disclosure).

### Defender side

- Build and ship with sanitizers during QA (not production — ASan adds ~2× overhead and exposes memory details).
- Run OSS-Fuzz or equivalent on your own code.
- Triage fuzz-found crashes with the same priority as security reports.
- Harden code paths most-exposed to attacker input (parsers, deserializers, URL handlers).

---

## Ch 21 — Web Application Exploits (Regular-exam scope)

Modern web attacks move beyond the 2010-era OWASP Top 10 classics into **client-side**, **SSRF**, and **supply-chain** attacks.

### Classic server-side vulnerability classes

| Class | CWE | Mechanism |
|---|---|---|
| **SQL injection** | CWE-89 | Concatenate user input into SQL |
| **Command injection** | CWE-78 | Pass user input to shell-invoking APIs |
| **XSS — Reflected** | CWE-79 | User input echoed into HTML without escaping |
| **XSS — Stored** | CWE-79 | User input stored and served to other users |
| **CSRF** | CWE-352 | Victim's browser makes authenticated request on attacker's behalf |
| **Directory traversal** | CWE-22 | `../../etc/passwd` reads files outside intended scope |
| **File upload bypass** | CWE-434 | Upload executable content to a web root |
| **Insecure deserialization** | CWE-502 | Deserialize untrusted data with a parser that runs code |
| **Broken authentication** | CWE-287 | Weak password policies, session fixation, credential stuffing |
| **Open redirect** | CWE-601 | `?redirect=evil.com` used unvalidated |

### Modern attack trends

- **SSRF (Server-Side Request Forgery, CWE-918)** — server fetches an attacker-controlled URL. Abused to reach:
  - Internal-only services (admin panels, databases).
  - Cloud instance metadata (`http://169.254.169.254/latest/meta-data/`) for credential theft.
- **XXE (XML External Entity, CWE-611)** — XML parser resolves external entity references, leaking files or making SSRF requests.
- **Prototype pollution** — JavaScript client or Node server lets an attacker set `__proto__` properties, tainting every object.
- **Deserialization gadgets** — Java (ysoserial), .NET (ysoserial.net), PHP (phar), and Python's native binary-object serializer — carefully chained class instantiations lead to RCE. Prefer JSON for untrusted data.
- **Supply chain** — malicious NPM / PyPI / RubyGems packages; compromised CI/CD pipelines.

### Client-side attacks

- **XSS** (still) — reflected, stored, DOM-based. Defenses: output encoding, CSP, trusted types.
- **Clickjacking** — transparent overlay tricks user into clicking hidden buttons. Defense: `X-Frame-Options` / CSP `frame-ancestors`.
- **CSRF** — defense: SameSite cookies, CSRF tokens, requiring re-auth for sensitive actions.
- **Cross-Origin attacks** — relaxed CORS headers let malicious sites read responses from authenticated users.
- **WebAuthn** — passkey-based auth resistant to phishing.

### API attacks

- **Broken Object Level Authorization (BOLA)** — accessing `/api/users/123` when you should only see your own records.
- **Mass assignment** — extra fields in JSON payload silently updated: `{"role": "admin"}`.
- **Rate-limit bypasses** — varying User-Agent, rotating IPs (proxies), hitting an unauthenticated counterpart endpoint.

### Authentication/authorization attacks

- **Credential stuffing** — reuse of leaked credentials from other breaches.
- **Password spraying** — one common password against many accounts (evades lockout).
- **Session fixation** — attacker pre-sets a session cookie before victim logs in.
- **JWT attacks** — none-algorithm, weak secrets, algorithm confusion (RS256 → HS256 with attacker-known public key as HMAC secret).
- **OAuth flow attacks** — redirect URI abuse, authorization-code interception, state parameter bypass.

### Tools for web app testing

- **Burp Suite** (Portswigger) — intercepting proxy, repeater, intruder, scanner.
- **OWASP ZAP** — open-source alternative.
- **sqlmap** — SQL-injection automation.
- **gobuster / ffuf / dirb** — content discovery.
- **nikto** — web server vuln scanner (noisy).
- **WPScan** — WordPress-specific.
- **Nuclei** — template-based vulnerability scanner.
- **Arjun** — parameter discovery.
- **Browser devtools** — manual inspection, Network tab, Console.

### Defender posture

- **Input validation** — allowlist expected characters/types.
- **Output encoding** — context-appropriate (HTML, attribute, JS string, URL, CSS).
- **Parameterized queries** — every DB access.
- **Least-privilege DB users** — web app user cannot `DROP`, `GRANT`, access other schemas.
- **Strong auth** — MFA, passkeys, strong password policy, lockout.
- **Session management** — secure cookies (`HttpOnly`, `Secure`, `SameSite=Lax`/`Strict`).
- **Security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- **WAF / reverse proxy** — ModSecurity, AWS WAF, Cloudflare.
- **SAST / DAST / IAST** — static, dynamic, interactive analysis in CI.
- **Security patching** — framework + dependency updates via Dependabot / Renovate.
- **Bug bounty** — HackerOne / Bugcrowd / internal VDP.

---

## Cross-book connections

- Ch 2 programming survival ↔ `BOOK-CPP-HTP.md` · `JCAC-PROG-FUND.md` · `JCAC-COMP-ORG-ARCH.md` (x86 asm).
- Ch 3 exploit tools ↔ `JCAC-ACTIVE-EXPLOIT.md` (Module 14 — Metasploit, Meterpreter).
- Ch 6 SDR / IoT ↔ cross-refs with physical-layer networking (`BOOK-TCPIP-GUIDE.md`) and wireless (`BOOK-CWNA.md`).
- Ch 10 Linux exploits ↔ `JCAC-UNIX-LINUX.md` §2 (SUID/SGID — escalation surface) · `JCAC-COMP-ORG-ARCH.md` Appendix E (memory safety, compiler protections).
- Ch 17 fuzzing ↔ `BOOK-CPP-HTP.md` Ch 17 (exceptions) · `JCAC-PROG-FUND.md` Appendix E (CWE).
- Ch 21 web exploits ↔ `JCAC-NETWORKING.md` §20 (HTTP) · `JCAC-PROG-SCRIPT.md` §9 (HTML/CGI security surface).

---

## Exam-testable concepts (rapid-fire)

### Programming survival (Ch 2)

- **Which common C functions lack bounds checks?** `strcpy`, `strcat`, `gets`, `sprintf` (pre-C99), `scanf("%s", ...)`.
- **x86-64 return value register?** RAX.
- **x86-64 first six integer argument registers (SysV)?** RDI, RSI, RDX, RCX, R8, R9.
- **Linux syscall instruction?** `syscall`.
- **Syscall number register on Linux x86-64?** RAX.
- **4th syscall argument register (note not calling convention)?** R10 (not RCX, which is clobbered by `syscall`).
- **Python module for binary packing?** `struct`.
- **Exploit framework for Python?** pwntools.
- **Pwntools pack-64-bit-little-endian function?** `p64()`.

### Linux exploit-dev tools (Ch 3)

- **Tool to report binary protections?** `checksec`.
- **Binary protection making stack non-executable?** NX / DEP.
- **Binary protection randomizing addresses?** ASLR (+ PIE for main).
- **Binary protection detecting stack overflow?** Stack canary.
- **GOT-overwrite protection?** Full RELRO.
- **Linux ASLR sysctl?** `kernel.randomize_va_space` (0, 1, 2).
- **Debugger with exploit-dev enhancements?** gdb + pwndbg / peda / gef.
- **Free NSA RE tool?** Ghidra.
- **Commercial premier RE tool?** IDA Pro (or Binary Ninja).

### SDR / IoT (Ch 6)

- **Receive-only affordable SDR?** RTL-SDR.
- **Half-duplex SDR covering MHz–GHz?** HackRF One.
- **SDR framework (GUI)?** GNU Radio.
- **Firmware-extraction tool?** binwalk.
- **Default admin credential exposure?** Hardcoded in firmware or on a label the user never changed.
- **Hardware root of trust?** Immutable boot ROM with verified keys.

### Basic Linux exploits (Ch 10)

- **Classic stack overflow overwrites what to gain control?** Saved return address.
- **ROP means?** Return-Oriented Programming — chain existing code ending in `ret`.
- **Why ROP exists?** Bypasses NX (can't run injected code) by reusing existing code.
- **CFI is?** Control-Flow Integrity — validates indirect calls/returns against a policy.
- **CET Shadow Stack protects?** Return addresses (hardware-backed second stack).
- **Use-after-free CWE?** CWE-416.
- **Double-free CWE?** CWE-415.
- **Format-string vulnerability CWE?** CWE-134.
- **Which format specifier writes memory?** `%n`.
- **Integer overflow CWE?** CWE-190.

### Fuzzing (Ch 17)

- **What is fuzzing?** Automated input generation to find anomalies.
- **Dumb fuzzer vs smart fuzzer?** Dumb = random; smart = format-aware.
- **Coverage-guided fuzzer examples?** AFL / AFL++, libFuzzer, Honggfuzz.
- **Sanitizer pairs with fuzzer for memory-safety detection?** AddressSanitizer (ASan).
- **Fuzzer for Linux syscalls?** syzkaller.
- **Google's free continuous fuzzing service?** OSS-Fuzz.
- **Fuzzer for network protocols in Python?** boofuzz.
- **Role of a fuzzer's corpus?** Seed inputs for mutation.
- **Why minimize a crashing input?** Smallest reproducer = easiest to report and fix.

### Web application exploitation (Ch 21)

- **XSS types?** Reflected, Stored, DOM-based.
- **XSS CWE?** CWE-79.
- **SQL injection CWE?** CWE-89.
- **Command injection CWE?** CWE-78.
- **CSRF CWE?** CWE-352.
- **Path traversal CWE?** CWE-22.
- **SSRF CWE?** CWE-918.
- **XXE CWE?** CWE-611.
- **Deserialization CWE?** CWE-502.
- **Defense against XSS?** Output encoding + Content Security Policy.
- **Defense against CSRF?** CSRF token + SameSite cookies.
- **Defense against SQL injection?** Parameterized queries (prepared statements).
- **HTTP header that forces HTTPS?** Strict-Transport-Security (HSTS).
- **HTTP header that blocks framing?** X-Frame-Options / CSP frame-ancestors.
- **JWT attack "none algorithm"?** Forged token asserting `alg: none` accepted by weak implementations.
- **Tool for intercepting proxy web attacks?** Burp Suite (or OWASP ZAP).
- **Tool for automated SQL injection?** sqlmap.
- **Cloud metadata endpoint most-SSRFed?** `http://169.254.169.254/latest/meta-data/` (AWS; analogous on Azure/GCP).

---

## Cross-references

- **[Gray Hat Hacking: The Ethical Hacker's Handbook, 6e](../references/Gray%20Hat%20Hacking%20-%20The%20Ethical%20Hacker%27s%20Handbook,%20Sixth%20Edition,%206th%20Edition-9781264268955.pdf)** — text on disk.
- **[AFL++ Documentation](https://aflplus.plus/)** · **[libFuzzer](https://llvm.org/docs/LibFuzzer.html)**.
- **[OWASP Top 10](https://owasp.org/www-project-top-ten/)** · **[CWE Top 25](https://cwe.mitre.org/top25/)**.
- **[pwntools documentation](https://docs.pwntools.com/)**.
- **[Ghidra](https://ghidra-sre.org/)** · **[radare2](https://rada.re/)**.
- **[PortSwigger Web Security Academy](https://portswigger.net/web-security)** — free web-app training.
- **[Ropemaker / ropper](https://github.com/sashs/Ropper)** · **[ROPgadget](https://github.com/JonathanSalwan/ROPgadget)**.
- `JCAC-ACTIVE-EXPLOIT.md` — parallel Module 14 coverage (Metasploit framework, shellcode basics).
- `JCAC-COMP-ORG-ARCH.md` Appendix E — compiler protections in depth.
- `BOOK-OS-CONCEPTS.md` — memory-management background.
