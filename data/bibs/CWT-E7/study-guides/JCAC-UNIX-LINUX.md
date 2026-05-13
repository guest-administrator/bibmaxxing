# JCAC Student Guide — UNIX/Linux

> **Realigned to JCAC Module 8 (UNIX/Linux, v2020-01R2) TOC.** Matches the 25-section course structure from the physical Student Guide (photos IMG_3672–IMG_3674).

**Module 8 scope:** Linux Fundamentals → File Permissions → Linux Architecture → Boot Process → OS Internals → File System Structure → FS Operations → Variables → Shell Scripts → Functions → Login/Non-Login Shells → Auth/Authz → Networking Services → NFS → Name Resolution → Samba → Apache → Security Packages → HIDS → File Integrity → Tripwire → IPtables → Nmap → Banners/TCP Wrappers → Logs and Auditing.

**Posture:** Depth-first. Each section gives you enough to answer exam questions *and* to operate in the field — commands, config paths, daemon names, ports, attack surface, hardening notes. This is the *admin / defender* view; offensive tradecraft lives in `JCAC-ACTIVE-EXPLOIT.md`.

---

## 1. Linux Fundamentals

Linux is a Unix-like kernel plus a userland. "Linux" loosely refers to the whole OS (kernel + GNU coreutils + libc + shells + package management); pedantically only the kernel. A **distribution** (distro) bundles the kernel with a curated userland, init system, package manager, and release cadence.

### Distro families

| Family | Representatives | Package manager | Init |
|---|---|---|---|
| **Debian** | Debian, Ubuntu, Kali, Mint | `dpkg` + `apt` | systemd (modern) |
| **Red Hat / Fedora** | RHEL, CentOS/Rocky/Alma, Fedora | `rpm` + `yum`/`dnf` | systemd |
| **SUSE** | SLES, openSUSE | `rpm` + `zypper` | systemd |
| **Arch** | Arch, Manjaro | `pacman` | systemd |
| **Gentoo** | Gentoo | `portage` / `emerge` | OpenRC or systemd |
| **Alpine** | Alpine Linux | `apk` | OpenRC / BusyBox init |
| **Embedded** | Yocto, Buildroot | custom | BusyBox |

The Bib-relevant families for Navy/DoD systems: **RHEL** (hardened baseline for servers) and **Ubuntu/Debian** (general purpose). Kali is tooling.

### Filesystem Hierarchy Standard (FHS)

| Path | Purpose |
|---|---|
| `/` | Root of the filesystem |
| `/bin` | Essential user binaries (merged with `/usr/bin` on modern distros) |
| `/sbin` | Essential system binaries (root use) |
| `/etc` | System configuration files (text) |
| `/home` | User home directories |
| `/root` | Root user's home |
| `/var` | Variable data (logs, mail, spool, cache) |
| `/var/log` | **System logs** (critical) |
| `/var/spool` | Print/mail/cron queues |
| `/var/lib` | Persistent service state (databases, package DB) |
| `/tmp` | Temporary files (world-writable, sticky) |
| `/usr` | User programs, docs, libraries (read-mostly) |
| `/usr/bin`, `/usr/sbin` | Non-essential binaries |
| `/usr/local` | Locally-installed programs (not from package manager) |
| `/usr/share` | Architecture-independent data (docs, man, locale) |
| `/proc` | Virtual filesystem: running kernel + process info |
| `/sys` | Virtual filesystem: kernel + device model |
| `/dev` | Device files (`/dev/null`, `/dev/sda`, `/dev/tty`, `/dev/urandom`) |
| `/lib`, `/lib64` | Shared libraries for `/bin` and `/sbin` |
| `/opt` | Optional 3rd-party software (self-contained) |
| `/mnt`, `/media` | Mount points (temporary, removable) |
| `/boot` | Kernel + bootloader files |
| `/run` | Runtime state (replaces `/var/run`) |
| `/srv` | Service-specific data (web, FTP roots) |

### Shells

| Shell | Notes |
|---|---|
| `sh` | POSIX baseline; often a link to `dash` or `bash --posix` |
| `bash` | GNU Bourne Again Shell — default on most Linux desktops |
| `dash` | Debian Almquist Shell — fast, POSIX-only; Debian's `/bin/sh` |
| `zsh` | Extended Bourne-family; default on macOS; popular interactive |
| `ksh` | Korn Shell — AT&T; still on AIX/Solaris |
| `csh` / `tcsh` | C-shell family; interactive on BSDs |
| `fish` | Friendly Interactive Shell; not POSIX |

The Bib expects **bash fluency**. Other shells appear only when answering "what shell is on this distro by default."

### Processes and signals

- **PID 1** (`init` on SysV, `systemd` on modern) is the first userspace process; orphaned children reparent to it.
- Every process has PID, PPID, UID, EUID, GID, EGID, session ID, process group ID.
- Common signals you must know:

| # | Name | Catch? | Purpose |
|---|---|---|---|
| 1 | SIGHUP | yes | Hangup / reload config |
| 2 | SIGINT | yes | Keyboard interrupt (Ctrl-C) |
| 3 | SIGQUIT | yes | Quit with core dump |
| 9 | SIGKILL | **no** | Force-kill, uncatchable |
| 11 | SIGSEGV | yes | Segmentation fault |
| 15 | SIGTERM | yes | Graceful termination (default `kill`) |
| 17 | SIGCHLD | yes | Child status changed |
| 18 | SIGCONT | yes | Resume stopped process |
| 19 | SIGSTOP | **no** | Pause process, uncatchable |
| 20 | SIGTSTP | yes | Terminal stop (Ctrl-Z) |

`kill -l` lists all signals on the current system. `kill -9 <pid>` = SIGKILL. `kill -HUP <pid>` = signal 1. Process groups: `kill -TERM -<pgid>` signals the whole group.

### The Unix philosophy

Small tools that do one thing well, text streams as the universal interface, composition via pipes. Practical implication: `cat file | sort | uniq -c | sort -rn | head` is idiomatic Linux; a monolithic GUI tool is not.

---

## 2. File Permissions — Syntax, Setting, SUID/SGID and Security

### The permission triad

Every file has three permission triads: **owner / group / others**, each with three bits **r (4) / w (2) / x (1)**.

- `rwxr-xr--` = 754 = owner rwx, group r-x, others r--.
- `rw-------` = 600 = owner only read/write.
- `rwxrwxrwx` = 777 = world-writable executable (almost always wrong).

On a directory: **r** = list entries, **w** = create/delete entries, **x** = traverse (cd into).

### chmod syntax

```bash
# Numeric (octal)
chmod 755 script.sh            # rwxr-xr-x
chmod 640 /etc/shadow          # rw-r----- (root:shadow)

# Symbolic
chmod u+x script.sh            # add execute for user/owner
chmod g-w,o-rwx secret.txt     # remove group write, all others
chmod a+r public.html          # all (u+g+o) read
chmod u=rwx,g=rx,o= file       # set exact bits
chmod -R g+rX dir/             # recursive; X = x only if dir or already-executable file
```

### Ownership — chown, chgrp

```bash
chown alice file.txt
chown alice:dev file.txt       # owner + group
chown -R alice:dev /srv/app
chgrp dev file.txt
```

Only root can give away ownership. A user *can* change group to any group they belong to.

### Special bits — SUID, SGID, sticky

| Bit | Octal | File | Directory |
|---|---|---|---|
| **SUID** | 4000 | Exec runs as file owner (EUID=owner) | No effect |
| **SGID** | 2000 | Exec runs as file group (EGID=group) | New files inherit dir's group |
| **Sticky** | 1000 | (legacy: swap) | Only owner/root can delete/rename contents |

Display: `ls -l` shows `s` in the exec slot for SUID/SGID, `t` in others-exec slot for sticky.

- `/usr/bin/passwd` is SUID root so any user can update `/etc/shadow`.
- `/tmp` is `drwxrwxrwt` (sticky) so users can't `rm` each other's temp files.
- Enumeration: `find / -perm -4000 -type f 2>/dev/null` finds SUID binaries.

**Attack surface view:** a misconfigured SUID binary is a classic privilege-escalation vector. See `JCAC-ACTIVE-EXPLOIT.md` §16 for the exploit side. The defender's job: know what's SUID by default on a hardened baseline, and alert on deltas.

### umask

The default-permission mask subtracted from 666 (files) or 777 (dirs) at creation time.

- `umask 022` → new files 644, new dirs 755 (default).
- `umask 027` → new files 640, new dirs 750 (group-readable only).
- `umask 077` → new files 600, new dirs 700 (private).

Set in `/etc/profile`, `/etc/login.defs` (UMASK), or per-shell in `~/.bashrc`.

### ACLs — getfacl / setfacl

POSIX ACLs extend the triad with per-user and per-group entries.

```bash
setfacl -m u:bob:rwx file.txt         # give bob rwx
setfacl -m g:auditors:r-- file.txt    # give group auditors read
setfacl -d -m g:dev:rwx shared/       # default ACL for new files in shared/
setfacl -x u:bob file.txt             # remove bob's ACL entry
getfacl file.txt                      # view
```

A `+` at the end of a `ls -l` permission string (`-rw-r--r--+`) indicates ACLs are present.

Requires filesystem support (ext4/XFS/Btrfs all support). Mounted with `acl` option on older distros.

### Extended attributes — chattr / lsattr

Inode-level flags on ext filesystems:

| Flag | Meaning |
|---|---|
| `i` | Immutable — cannot be modified, deleted, renamed, linked (even by root) |
| `a` | Append-only — cannot be overwritten or truncated (logs) |
| `d` | No dump |
| `s` | Secure delete (zero blocks on unlink) — ext filesystems often no-op this |
| `u` | Undeletable |

```bash
chattr +i /etc/resolv.conf            # freeze critical config
chattr +a /var/log/auth.log           # log append-only
lsattr /etc/
```

Immutable-on-config is a hardening technique that also blocks attackers from modifying configs after compromise — until they run `chattr -i` (requires CAP_LINUX_IMMUTABLE).

---

## 3. Linux Architecture

Two privilege rings on x86-64: **ring 0 (kernel mode)** and **ring 3 (user mode)**. The CPU enforces — user-mode code cannot execute privileged instructions or access kernel memory directly.

### User-mode components

| Component | What |
|---|---|
| **Processes** | Isolated virtual address spaces; scheduled by kernel |
| **Threads** | Multiple execution contexts sharing an address space |
| **Window manager** | X11 (legacy) / Wayland (modern) + desktop environment (GNOME, KDE, XFCE) — absent on server builds |
| **GNU C library (glibc)** | Userspace libc; wraps syscalls, provides POSIX API |
| **Shell** | Interactive command interpreter (bash, zsh…) |
| **Core utilities** | GNU coreutils: `ls`, `cp`, `mv`, `cat`, `grep`, `sed`, `awk`, `find`, etc. |
| **Applications** | Everything else: editors, compilers, services in user-mode (nginx worker procs, sshd), etc. |

### Kernel-mode components

| Subsystem | Responsibility |
|---|---|
| **System Call Interface (SCI)** | Transition point from user to kernel — traps via `syscall` (x86-64) / `svc` (ARM) instruction |
| **Process Management** | Task creation (`clone`/`fork`), scheduling (CFS/EEVDF), signal delivery |
| **Memory Management** | Virtual-memory, paging, swapping, OOM killer, slab allocator |
| **Virtual File System (VFS)** | Uniform interface above filesystem drivers (ext4, XFS, Btrfs, NFS, procfs) |
| **Network Subsystem** | Socket API, TCP/IP stack, netfilter, routing, qdisc |
| **Architecture-dependent code** | Per-arch boot, interrupt handling, context switch (`arch/x86`, `arch/arm64`) |
| **Device drivers** | Hardware-specific modules (block, char, network, USB, GPU) |

### Hardware boundary

CPU, RAM, disks, NICs, USB, GPU — accessed exclusively through kernel drivers. Userspace can memory-map device memory only via explicit driver support (`/dev/uioN`, `/dev/mem` if permitted).

### How a syscall happens

1. Userspace loads syscall number into register (`%rax` on x86-64) and args into the ABI-specified registers.
2. Executes `syscall` instruction — CPU switches to ring 0 at the address in `MSR_LSTAR`.
3. Kernel SCI dispatches to the handler (`sys_read`, `sys_open`, `sys_execve`, …) based on the syscall number.
4. Handler runs in kernel mode with elevated privileges, then returns via `sysret` back to ring 3.

`strace ls` shows the syscalls userspace makes. `ltrace` shows library calls.

---

## 4. Linux Boot Process

Seven stages: **BIOS/UEFI → Bootloader (MBR/GPT) → GRUB → Kernel → initramfs → init/systemd → Runlevel/target**.

### BIOS (legacy) vs UEFI (modern)

| | BIOS | UEFI |
|---|---|---|
| Firmware | 16-bit real mode legacy | 32/64-bit protected mode |
| Partition table | MBR (4 primary, 2 TiB limit) | GPT (128 partitions, EB-scale) |
| Bootloader | MBR 446-byte stub | EFI executable in ESP (`/boot/efi`) |
| Secure Boot | No | Yes (signed bootloader + kernel) |
| PXE boot | Yes | Yes (HTTP/HTTPS possible) |

### MBR (Master Boot Record)

First 512 bytes of a BIOS-booted disk:

- Bytes 0–445: boot code (stage 1 bootloader).
- Bytes 446–509: 4 partition table entries, 16 bytes each.
- Bytes 510–511: signature `0x55 0xAA`.

GRUB stage 1.5 lives in the post-MBR gap (sectors 1–62) on BIOS+MBR systems.

### GRUB (GRand Unified Bootloader)

Modern Linux uses **GRUB 2**. Stages:

- **Stage 1** — 446 bytes in MBR, loads stage 1.5.
- **Stage 1.5** — filesystem driver so stage 2 can be read from `/boot/grub/`.
- **Stage 2** — full bootloader, presents menu, loads kernel + initramfs.

Config: `/etc/default/grub` (high-level) and `/etc/grub.d/` (modular snippets) → regenerate `/boot/grub/grub.cfg` with `grub-mkconfig -o /boot/grub/grub.cfg` (or `update-grub` on Debian).

Boot-time edit (`e` key) can append parameters — including `init=/bin/bash` for a root shell. **Password-protect GRUB** on any machine where physical access is untrusted: `grub-mkpasswd-pbkdf2` → `set superusers="root"` + `password_pbkdf2 root <hash>` in `/etc/grub.d/40_custom`.

### Kernel and initramfs

- Kernel image: `/boot/vmlinuz-<version>` (compressed; `kexec` can chain-load).
- initramfs: `/boot/initrd.img-<version>` or `/boot/initramfs-<version>.img` — a cpio archive containing a minimal root filesystem (busybox, kernel modules, udev rules, crypto unlock) loaded by GRUB.
- Kernel mounts initramfs as `/`, runs `/init`, which loads drivers (including FS driver for the real root), then pivots to the real root and execs the next-stage init.

### init vs systemd

**SysV init** (traditional, still present on some embedded distros):
- PID 1 reads `/etc/inittab` to determine default runlevel.
- Runlevels 0–6: `0`=halt, `1`=single-user, `2`=multi-user (Debian default), `3`=multi-user + network (RHEL default), `4`=unused, `5`=GUI, `6`=reboot.
- `/etc/rc<N>.d/` contains symlinks to `/etc/init.d/` scripts; `S*` start scripts run on entry, `K*` kill scripts on exit.
- `chkconfig` (RHEL) / `update-rc.d` (Debian) manages those links.

**systemd** (default on Ubuntu, Debian, RHEL, Fedora, SUSE, Arch):
- PID 1 is `systemd`; parallelizes service startup.
- Units: `.service`, `.target`, `.socket`, `.timer`, `.mount`, `.path`, `.device`, `.swap`, `.slice`, `.scope`.
- Targets replace runlevels: `multi-user.target` (≈3), `graphical.target` (≈5), `rescue.target` (≈1).
- `systemctl list-units`, `systemctl status foo`, `systemctl enable foo`, `systemctl start foo`.
- Unit files: `/lib/systemd/system/` (distro-shipped) and `/etc/systemd/system/` (local override).
- Logs via `journalctl` (structured binary journal, not plain-text syslog).

### Securing SysV

- Disable unneeded services: `chkconfig <svc> off` (RHEL), `update-rc.d -f <svc> remove` (Debian).
- Remove or lock down the S-scripts in `/etc/rc<N>.d/`.
- Audit `/etc/inittab` for spawned gettys and custom entries.
- Protect the single-user mode: `sulogin` enforced in inittab; root password required.

### Securing systemd

- `systemctl mask <svc>` — stronger than `disable`; creates a symlink to `/dev/null` so the unit can't be accidentally started.
- Unit hardening directives:
  - `ProtectSystem=full|strict`
  - `ProtectHome=true|read-only`
  - `PrivateTmp=true`
  - `NoNewPrivileges=true`
  - `CapabilityBoundingSet=` (drop capabilities)
  - `SystemCallFilter=` (seccomp)
  - `User=` / `Group=` (don't run as root)
  - `ReadOnlyPaths=` / `ReadWritePaths=`
- `systemd-analyze security <unit>` scores hardening.

---

## 5. OS Internals

### Syscalls — the kernel API

Syscalls fall into categories:

| Category | Examples |
|---|---|
| **Process control** | `fork`, `execve`, `wait`, `exit`, `clone`, `kill`, `getpid` |
| **File operations** | `open`, `read`, `write`, `close`, `lseek`, `stat`, `unlink`, `rename` |
| **Device operations** | `ioctl`, `read`/`write` on device files |
| **Information maintenance** | `time`, `getuid`, `gethostname`, `uname`, `sysinfo` |
| **Communication** | `pipe`, `socket`, `bind`, `listen`, `accept`, `send`, `recv`, `shmget`, `msgget`, `semget` |
| **Memory** | `mmap`, `munmap`, `brk`, `mprotect`, `madvise` |

Full list: `man 2 syscalls` (~400 syscalls on x86-64 Linux).

### Examining syscalls

```bash
strace ls -la /tmp                     # trace every syscall
strace -c curl example.com             # summary histogram
strace -e trace=network curl example.com
strace -p <pid>                        # attach to running process
strace -f -o log.txt ./app             # follow forks, to file
ltrace ./app                           # library calls, not syscalls
```

`/proc/<pid>/syscall` shows the currently-executing syscall for a process.

### Loadable Kernel Modules (LKMs)

Kernel code that can be loaded/unloaded at runtime. Location: `/lib/modules/$(uname -r)/`.

```bash
lsmod                                  # loaded modules
modinfo e1000                          # info on a module
insmod /path/to/mod.ko                 # load (raw; no deps)
rmmod e1000                            # unload
modprobe e1000                         # load with dependency resolution
modprobe -r e1000                      # unload with dep tracking
depmod -a                              # regenerate modules.dep after adding modules
```

Config: `/etc/modprobe.d/*.conf` (blacklists, options), `/etc/modules` or `/etc/modules-load.d/*.conf` (load at boot).

**Security:** `modprobe.blacklist=<mod>` on kernel cmdline, or `blacklist <mod>` in `/etc/modprobe.d/blacklist.conf`, prevents auto-load. `kernel.modules_disabled=1` (sysctl) locks further module loading after boot. Signed modules (`CONFIG_MODULE_SIG_FORCE=y`) reject unsigned code.

### sysctl — kernel tunables

Read/write `/proc/sys/` via `sysctl`.

```bash
sysctl -a                              # list all
sysctl net.ipv4.ip_forward             # read
sysctl -w net.ipv4.ip_forward=1        # write (runtime)
```

Persistent: `/etc/sysctl.conf` or `/etc/sysctl.d/*.conf`. Examples of hardening tunables:

- `kernel.dmesg_restrict=1` — non-root can't read kernel ring buffer.
- `kernel.kptr_restrict=2` — hide kernel pointers from `/proc`.
- `net.ipv4.tcp_syncookies=1` — SYN flood mitigation.
- `net.ipv4.conf.all.rp_filter=1` — reverse-path filter (anti-spoof).
- `fs.suid_dumpable=0` — SUID core dumps disabled.
- `kernel.yama.ptrace_scope=1` — restrict `ptrace` to parent processes.

### ulimit — per-process resource limits

```bash
ulimit -a                              # all current limits
ulimit -n 4096                         # max open files
ulimit -u 1024                         # max processes
ulimit -c unlimited                    # max core file size
```

Persistent per-user: `/etc/security/limits.conf`.

### Process states

| State | Meaning |
|---|---|
| **R** | Running or runnable |
| **S** | Sleeping (interruptible) |
| **D** | Uninterruptible sleep (usually disk I/O — cannot be killed until I/O completes) |
| **Z** | Zombie — terminated but parent hasn't reaped via `wait()` |
| **T** | Stopped (via SIGSTOP/SIGTSTP) or traced |
| **X** | Dead (transient) |

View: `ps aux`, `ps -eo pid,stat,cmd`, `top`, `htop`, `/proc/<pid>/status` (field `State:`).

### Process interruption

- Catchable signals handled via `signal()` / `sigaction()`.
- Uncatchable: **SIGKILL (9)** and **SIGSTOP (19)** — the kernel enforces; no handler possible.
- A process in state **D** (uninterruptible) ignores even SIGKILL until it leaves D state.

---

## 6. File System Structure (ext family internals)

The **ext2/3/4** family (plus conceptually XFS/Btrfs/ZFS) organizes a partition into block groups.

![Filesystem architecture — layered view from user down to storage](images/arch-comp-hw/filesystem-arch.png)
*Englander — filesystem stack: user space → VFS → FS driver (ext4 / XFS / ...) → block layer → device. Each layer presents a narrower, more physical abstraction of the data than the one above it.*

### Disk layout — ext4

```
+-----------------+
|   Boot block    |   reserved for bootloader (first 1024 bytes)
+-----------------+
|  Block group 0  |
+-----------------+
|  Block group 1  |
+-----------------+
|        ...      |
+-----------------+
|  Block group N  |
+-----------------+
```

Each **block group** contains:

| Section | Purpose |
|---|---|
| **Superblock** (primary in group 0, backups in specific groups) | Filesystem metadata: total inodes, total blocks, block size, mount count, last check, magic, UUID |
| **Group Descriptor Table (GDT)** | One entry per block group; points to each group's bitmaps and inode table |
| **Block bitmap** | 1 bit per data block in this group: 0=free, 1=allocated |
| **Inode bitmap** | 1 bit per inode in this group: 0=free, 1=allocated |
| **Inode table** | Fixed array of inode structures for this group |
| **Data blocks** | Actual file contents |

### Inode structure

An inode is a fixed-size metadata record (typically 256 bytes on ext4). Fields:

| Field | Content |
|---|---|
| `i_mode` | File type + permissions |
| `i_uid`, `i_gid` | Owner / group |
| `i_size` | File size in bytes |
| `i_atime`, `i_mtime`, `i_ctime`, `i_crtime` | Access, modify, change, creation times |
| `i_links_count` | Hard-link count |
| `i_blocks` | Number of 512-byte sectors allocated |
| `i_block[15]` | 12 direct, 1 single-indirect, 1 double-indirect, 1 triple-indirect pointers (ext2/3). ext4 uses **extents** — (start_block, length) pairs — via an htree header. |

The inode does **not** contain the filename. Directory entries map `name → inode number`.

### Directory entry

A directory is a special file whose contents are records of `(inode, name_length, name)`. Entries are looked up linearly (ext2/3) or via htree (ext4 with `dir_index`).

### Hard links vs soft links

| | Hard link | Soft (symbolic) link |
|---|---|---|
| Created with | `ln target newname` | `ln -s target newname` |
| Inode | Same as target | Own inode, contents = path string |
| Cross-filesystem? | No | Yes |
| Points to | Inode | Path (can dangle if target deleted) |
| Directory? | No (disallowed) | Yes |
| Increments link count | Yes | No |

### Filesystem types

| FS | Notes |
|---|---|
| **ext2** | No journal; historical, still on `/boot` and embedded |
| **ext3** | ext2 + journal (ordered by default) |
| **ext4** | ext3 + extents + larger limits + delayed alloc + metadata checksums |
| **XFS** | 64-bit, high-performance, default on RHEL 7+ |
| **Btrfs** | CoW, snapshots, subvolumes, RAID; default on SLES/openSUSE |
| **ZFS** | CoW, snapshots, checksums, integrated volume mgr; license-incompatible with GPL, ships as DKMS |
| **tmpfs** | RAM-backed; used for `/tmp`, `/run`, `/dev/shm` |
| **squashfs** | Read-only compressed; live CDs, containers |
| **overlayfs** | Union FS; Docker, containers, live systems |
| **FAT32 / exFAT / NTFS** | Windows interop; FUSE driver for NTFS-3G |

### Journaling modes (ext3/4)

- **data=writeback** — metadata journaled, data unordered (fastest, weakest).
- **data=ordered** — metadata journaled; data written before metadata (default, balanced).
- **data=journal** — both metadata *and* data journaled (slowest, safest).

Set via `mount -o data=ordered` or in `/etc/fstab`.

---

## 7. Operations on File Systems / Directory Structure

### Mounting

```bash
mount /dev/sdb1 /mnt/backup
mount -t ext4 -o ro,noatime /dev/sdb1 /mnt/backup
mount -a                               # mount all entries in /etc/fstab
umount /mnt/backup
umount -l /mnt/backup                  # lazy; detach when last user closes
findmnt                                # tree of mounts (modern)
mount                                  # legacy flat list
```

### `/etc/fstab` format

```
# <device>              <mount>        <fs>   <options>              <dump> <pass>
UUID=<uuid>             /              ext4   defaults               0      1
UUID=<uuid>             /boot          ext4   defaults               0      2
UUID=<uuid>             /home          ext4   nodev,nosuid           0      2
UUID=<uuid>             swap           swap   sw                     0      0
tmpfs                   /tmp           tmpfs  nodev,nosuid,size=2G   0      0
//server/share          /mnt/smb       cifs   credentials=/etc/cifs,_netdev 0 0
```

**Security-relevant options:**

- `nosuid` — ignore SUID/SGID bits on this mount (harden `/home`, `/tmp`, removable).
- `nodev` — ignore device files (harden non-`/dev` mounts).
- `noexec` — prevent execution of binaries from this mount (harden `/tmp`, `/var`).
- `ro` — read-only mount.
- `nodiratime`, `noatime` — performance.

### Disk devices

| Path | What |
|---|---|
| `/dev/sda`, `/dev/sdb` | SATA / SCSI / USB disks; partitions `/dev/sda1`, `/dev/sda2` |
| `/dev/nvme0n1`, `/dev/nvme0n1p1` | NVMe drives; `n` = namespace, `p` = partition |
| `/dev/vda` | virtio paravirtualized disk (KVM/QEMU) |
| `/dev/xvda` | Xen paravirtualized disk |
| `/dev/mapper/<name>` | LVM logical volumes and dm-crypt |
| `/dev/disk/by-uuid/<uuid>` | Stable UUID symlinks |
| `/dev/disk/by-label/<label>` | Filesystem label symlinks |
| `/dev/disk/by-id/*` | Manufacturer-stable IDs |

### File types

`ls -l` first character identifies:

| Char | Type | Created by |
|---|---|---|
| `-` | Regular file | `touch`, `cp`, editor |
| `d` | Directory | `mkdir` |
| `l` | Symbolic link | `ln -s` |
| `b` | Block device | `mknod b` |
| `c` | Character device | `mknod c` |
| `p` | FIFO (named pipe) | `mkfifo` |
| `s` | Socket | `socket()` syscall |

### Inspection utilities

```bash
stat file.txt                          # inode details, all three timestamps, link count, bytes
file /bin/ls                           # heuristic type (ELF 64-bit LSB pie executable …)
lsof                                   # list open files (and sockets — "everything is a file")
lsof -i :22                            # who's listening on :22
lsof -p <pid>                          # files a process has open
lsblk                                  # block device tree
lsblk -f                               # with filesystem info
blkid /dev/sda1                        # UUID, LABEL, TYPE
df -hT                                 # mounted filesystems, human, with type
du -sh /var/log/*                      # directory sizes
mount | column -t                      # readable mount table
```

---

## 8. Variables — Shell and Environment

### Shell variables vs environment variables

- **Shell variable** — lives in the current shell only; child processes don't see it.
- **Environment variable** — exported; inherited by child processes via `execve`.

```bash
FOO=bar                                # shell variable
echo $FOO                              # bar
bash -c 'echo $FOO'                    # empty — child didn't inherit

export FOO                             # now environment
bash -c 'echo $FOO'                    # bar

export BAZ=qux                         # declare + export in one step
```

### Inspection and manipulation

```bash
env                                    # list all environment variables
set                                    # list all shell variables + functions (huge)
printenv                               # like env
printenv PATH                          # specific variable
unset FOO                              # remove
readonly FOO                           # make immutable in this shell
declare -r FOO=bar                     # same
```

### Standard environment variables

| Variable | Purpose |
|---|---|
| `PATH` | Colon-separated directories searched for executables |
| `HOME` | Current user's home directory |
| `USER`, `LOGNAME` | Login name |
| `SHELL` | Login shell |
| `PWD`, `OLDPWD` | Current and previous directory |
| `TERM` | Terminal type (xterm-256color, vt100…) |
| `LANG`, `LC_ALL` | Locale |
| `PS1`, `PS2` | Primary / continuation prompt |
| `IFS` | Internal Field Separator (word-split char, default space/tab/newline) |
| `EDITOR`, `VISUAL` | Default editor for crontab, git, visudo |
| `TMPDIR` | Temp directory override |
| `LD_LIBRARY_PATH` | Extra dynamic-linker search paths (security-sensitive) |
| `LD_PRELOAD` | Preload libraries (security-sensitive; ignored for SUID) |
| `UID`, `EUID` | Real / effective UID |
| `$$`, `$!`, `$?` | Current PID, last backgrounded PID, last exit status |

### Inheritance across fork/exec

`fork()` creates a new process with a copy of the parent's environment. `execve()` replaces the program but preserves (or replaces) the environment. Meaning: any env var exported before launching a program is visible to that program.

Security implication: an attacker setting `LD_PRELOAD` can hijack library calls — but the dynamic linker **ignores** `LD_PRELOAD` for SUID binaries to prevent trivial root escalation.

### Per-shell configuration files

Where to export vars so they stick (by shell/login type):

- System-wide: `/etc/environment` (simple `KEY=value` lines), `/etc/profile`, `/etc/profile.d/*.sh`, `/etc/bash.bashrc`.
- User interactive login: `~/.bash_profile` → `~/.bashrc`.
- User interactive non-login: `~/.bashrc`.
- User non-interactive (scripts): neither — pass via `env` or shebang.

---

## 9. Creating Simple Shell Scripts

### Shebang and robust defaults

```bash
#!/usr/bin/env bash
set -euo pipefail
# -e : exit on any error
# -u : error on undefined variable
# -o pipefail : failure of any pipeline component propagates
IFS=$'\n\t'
```

### Script skeleton

```bash
#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_NAME="${0##*/}"
readonly LOG_FILE="/var/log/${SCRIPT_NAME%.sh}.log"

log() { printf '[%s] %s\n' "$(date +%FT%T)" "$*" | tee -a "$LOG_FILE" >&2; }
die() { log "FATAL: $*"; exit 1; }

main() {
    log "$SCRIPT_NAME starting"
    [[ $# -ge 1 ]] || die "usage: $SCRIPT_NAME <target>"
    local target="$1"
    [[ -r "$target" ]] || die "cannot read $target"
    log "processing $target"
    # work here
    log "done"
}

main "$@"
```

### Conditionals

```bash
if [[ -f /etc/hostname ]]; then
    echo "file exists"
elif [[ -d /etc/hostname ]]; then
    echo "it's a directory"
else
    echo "neither"
fi

# Single-line ternary-ish
[[ -f "$f" ]] && echo yes || echo no

# case
case "$1" in
    start)   start_service ;;
    stop)    stop_service ;;
    restart) stop_service; start_service ;;
    *)       echo "usage: $0 {start|stop|restart}"; exit 1 ;;
esac
```

### Test flags

| Flag | Meaning |
|---|---|
| `-e` | Path exists |
| `-f` | Regular file |
| `-d` | Directory |
| `-L` | Symbolic link |
| `-r` / `-w` / `-x` | Readable / writable / executable |
| `-s` | Non-empty |
| `-z` / `-n` | String empty / non-empty |
| `-eq -ne -lt -le -gt -ge` | Numeric comparisons |
| `=` / `!=` | String comparisons |
| `=~` | Regex (bash `[[ ]]`) |

### Loops

```bash
# for with glob
for f in /var/log/*.log; do
    echo "Size of $f: $(du -h "$f" | cut -f1)"
done

# for with seq / brace
for i in {1..10}; do echo "$i"; done

# C-style
for ((i=0; i<10; i++)); do echo "$i"; done

# while
while read -r line; do
    echo "Line: $line"
done < input.txt

# until
until systemctl is-active -q foo; do sleep 1; done
```

### Command substitution, arithmetic, process substitution

```bash
now=$(date +%FT%T)                     # command substitution
(( sum = 2 + 3 ))                      # arithmetic context
result=$((2 ** 10))                    # arithmetic expansion
diff <(sort file1) <(sort file2)       # process substitution
```

### Pipes and redirection

```bash
cmd > out.txt                          # stdout → file (truncate)
cmd >> out.txt                         # stdout → file (append)
cmd 2> err.txt                         # stderr → file
cmd &> both.txt                        # both stdout and stderr
cmd > out 2>&1                         # both via redirect (older idiom)
cmd < input.txt                        # stdin ← file
cmd1 | cmd2                            # pipe stdout to next stdin
cmd1 |& cmd2                           # pipe both stdout and stderr
cmd <<< "literal"                      # here-string
cmd <<EOF                              # here-doc
line 1
line 2
EOF
```

### Traps

```bash
TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT           # cleanup on any exit
trap 'echo interrupted; exit 130' INT  # catch Ctrl-C
```

---

## 10. Functions within a Shell Script

*(The Module 8 TOC reads "Functions within a PS Script" — a transcription slip in the physical Student Guide; in context it means shell-script functions. Treat accordingly.)*

### Function syntax

```bash
# Form 1 (POSIX)
greet() {
    echo "Hello, $1"
}

# Form 2 (bash keyword)
function greet {
    echo "Hello, $1"
}

greet "world"                          # "Hello, world"
```

### Local variables

```bash
counter() {
    local count=0                      # does NOT leak into parent scope
    for ((i=0; i<"$1"; i++)); do
        ((count++))
    done
    echo "$count"
}
total=$(counter 5)                     # total=5
```

Without `local`, a variable assigned inside a function persists in the caller's scope — a common source of bugs.

### Positional parameters inside a function

`$1 $2 … $N`, `$#`, `$@`, `$*` refer to the **function's** arguments, not the script's. The script's args are still reachable via `${BASH_ARGV[@]}` or saved at script start.

### return vs exit

| | `return` | `exit` |
|---|---|---|
| Scope | From function | From entire script |
| Value | 0–255 (exit-status convention) | 0–255 |
| Use | `return 1` to signal function failure | `exit 0` / `exit 1` to end script |

```bash
check_root() {
    [[ $EUID -eq 0 ]] && return 0
    echo "must be root" >&2
    return 1
}
check_root || exit 1
```

### Sourcing — function libraries

```bash
# lib/common.sh
log() { printf '[%s] %s\n' "$(date +%FT%T)" "$*" >&2; }
die() { log "FATAL: $*"; exit 1; }

# script.sh
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib/common.sh"
log "starting"
```

`source file` and `. file` are equivalent. Reads the file **into the current shell** — no subshell, no fork, variables and functions persist.

### Return values vs echoed output

Shell functions return an exit status (0–255), not data. To return data, `echo` / `printf` and capture:

```bash
greeting() { echo "Hello, $1"; }
msg=$(greeting "world")                # captures stdout
```

Or use a global / nameref:

```bash
greet_into() {
    local -n outvar="$1"
    outvar="Hello, $2"
}
greet_into msg "world"                 # msg="Hello, world"
```

---

## 11. Login and Non-Login Shells

### The four shell categories

| | Interactive | Non-interactive |
|---|---|---|
| **Login** | SSH into a host; `login` at a TTY | `bash --login script.sh`; rare |
| **Non-login** | `bash` in a terminal emulator under an existing session; subshell in a script | `bash script.sh`; any shell in a pipeline |

### Startup file order

**Login interactive** — reads in order:
1. `/etc/profile`
2. `/etc/profile.d/*.sh`
3. First existing of: `~/.bash_profile`, `~/.bash_login`, `~/.profile`
4. On exit: `~/.bash_logout`

**Non-login interactive**:
1. `/etc/bash.bashrc` (Debian) or `/etc/bashrc` (RHEL)
2. `~/.bashrc`

**Non-interactive**:
- Only the file named by `$BASH_ENV` (if set); typically nothing.

Idiomatic pattern: put real config in `~/.bashrc`, have `~/.bash_profile` simply `source ~/.bashrc` so behavior matches across login types.

### SSH suite (OpenSSH)

Server: `sshd` reads `/etc/ssh/sshd_config`.

Key directives:

| Directive | Hardening value |
|---|---|
| `Port` | 22 (default) — changing adds obscurity only |
| `PermitRootLogin` | `no` or `prohibit-password` |
| `PasswordAuthentication` | `no` (force keys) |
| `PubkeyAuthentication` | `yes` |
| `PermitEmptyPasswords` | `no` |
| `ChallengeResponseAuthentication` | `no` |
| `AllowUsers` / `AllowGroups` | Explicit allowlist |
| `MaxAuthTries` | 3–4 |
| `X11Forwarding` | `no` unless needed |
| `AllowTcpForwarding` | `no` on bastions |
| `ClientAliveInterval`, `ClientAliveCountMax` | Idle disconnect |
| `Banner` | Legal warning banner file |
| `LogLevel` | `VERBOSE` |

Client: `~/.ssh/config` per-host options. Keys in `~/.ssh/authorized_keys` on the server. `ssh-keygen -t ed25519` for modern keys (RSA 2048+ still acceptable).

### Restricted shell — rbash

`rbash` (or `bash -r`) restricts the user from:
- `cd` out of $HOME.
- Modifying `$PATH`, `$SHELL`, `$BASH_ENV`, `$ENV`.
- Running commands with `/` in the path.
- Redirecting with `>`, `>>`.

Set `/etc/passwd` shell to `/bin/rbash` and provide a curated `$PATH` pointing at an allowlist of binaries.

Escape surface is large — any editor with shell-out (`vi` → `:!`) breaks the jail.

### Disabling shell access

- **`/sbin/nologin`** — prints a polite message and exits non-zero. Replace the user's shell in `/etc/passwd` to allow the account to receive mail / hold files but not log in.
- **`/bin/false`** — silent, exits 1.
- **Account lock:** `passwd -l <user>` (prepends `!` to shadow hash) or `usermod -L`.
- **Expiry:** `chage -E 2020-01-01 <user>` (date in the past).

---

## 12. Authentication and Authorization

### `/etc/passwd` — user accounts

Format: `username:x:UID:GID:GECOS:home:shell`

```
root:x:0:0:root:/root:/bin/bash
alice:x:1001:1001:Alice Developer,,,:/home/alice:/bin/bash
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
```

Fields:
1. Username.
2. Password placeholder (`x` = look in `/etc/shadow`; `*` or `!` = locked; empty = no password, *never acceptable*).
3. UID (0 = root; 1–999 system; 1000+ humans on modern distros).
4. Primary GID.
5. GECOS (comma-separated user info).
6. Home directory.
7. Login shell.

### `/etc/shadow` — password hashes

Readable only by root (`640 root:shadow` or `400 root:root`).

Format: `username:hash:last_change:min:max:warn:inactive:expire:reserved`

```
root:$6$salt$hash...:19567:0:99999:7:::
alice:$y$j9T$salt$hash:19567:0:60:7:14::
```

Hash column encodes the algorithm:

| Prefix | Algorithm | Notes |
|---|---|---|
| (just hash) | DES-based crypt(3) | Legacy; 13-char; broken |
| `$1$` | MD5 | Broken, don't use |
| `$2a$`, `$2b$`, `$2y$` | bcrypt | Good; 60 chars |
| `$5$` | SHA-256 | Acceptable |
| `$6$` | SHA-512 | Default on many distros |
| `$y$` | yescrypt | Modern default on Debian 11+, Fedora 35+ |
| `$argon2i$`, `$argon2id$` | Argon2 | Not default in shadow but supported by libxcrypt |

`!` or `*` as the whole hash = account locked. Empty string = no password required (*never*).

Date fields are days since 1970-01-01.

### `/etc/group` and `/etc/gshadow`

`/etc/group`: `groupname:x:GID:member1,member2,...`

```
wheel:x:10:alice
sudo:x:27:alice,bob
docker:x:999:alice
```

Group membership grants users the group's access, including SUID/SGID bits. Membership in `wheel` (RHEL), `sudo` (Debian/Ubuntu), `docker`, `adm`, `disk` are all high-value for privilege.

### User management commands

```bash
useradd -m -s /bin/bash -G sudo alice  # create with home dir, shell, extra group
usermod -aG docker alice               # add to supplementary group (append!)
usermod -s /sbin/nologin svcacct       # change shell
usermod -L alice                       # lock (equivalent to passwd -l)
usermod -U alice                       # unlock
userdel -r alice                       # delete user + home + mail spool
passwd alice                           # change/reset password
chage -l alice                         # show aging info
chage -E 2026-12-31 alice              # expire on date
chage -M 60 -W 7 alice                 # max 60 days, warn at 7
id alice                               # UID, GID, groups
groups alice                           # group list
getent passwd alice                    # NSS lookup (includes LDAP/NIS)
```

Never edit `/etc/passwd`, `/etc/shadow`, `/etc/group` directly — use `vipw`, `vipw -s`, `vigr` which take the right locks.

### PAM — Pluggable Authentication Modules

Authentication is delegated by services (login, sshd, sudo, cron, …) to PAM. Each service has a config file in `/etc/pam.d/<service>`; stacks of modules run in order.

Four stack types:

- **auth** — verify identity.
- **account** — is this account allowed? (expiry, time, host)
- **password** — change credentials.
- **session** — set up / tear down session (logging, env, ulimits, mounting /home).

Control flags per line: `required`, `requisite`, `sufficient`, `optional`, `[…]` (modern explicit form).

Example `/etc/pam.d/sshd` snippet:

```
auth       required     pam_unix.so
auth       required     pam_google_authenticator.so   # 2FA
account    required     pam_nologin.so
session    required     pam_limits.so
```

Common modules: `pam_unix` (shadow), `pam_faillock`/`pam_tally2` (lockout), `pam_cracklib`/`pam_pwquality` (strength), `pam_limits` (ulimits), `pam_access` (per-user/host), `pam_sss` (SSSD → LDAP/AD), `pam_google_authenticator` (TOTP), `pam_u2f` (hardware key).

### sudo

Runs a command as another user (root by default) after password auth.

Config: `/etc/sudoers` and `/etc/sudoers.d/*` — always edit with `visudo` (syntax check + lock).

```
# who  where=(as_whom) [tags:] what
root    ALL=(ALL:ALL) ALL
%sudo   ALL=(ALL:ALL) ALL
alice   ALL=(root) NOPASSWD: /usr/bin/systemctl restart nginx
bob     webhosts=(www-data) /usr/bin/apachectl
```

Aliases: `User_Alias`, `Runas_Alias`, `Host_Alias`, `Cmnd_Alias` for readable rules.

Common tags: `NOPASSWD`, `SETENV`, `!LOG_INPUT`.

Logs: `/var/log/auth.log` (Debian) or `/var/log/secure` (RHEL). `sudo -l` shows what the current user is allowed to run.

**Defender view:** `NOPASSWD` entries are privilege-escalation landmines. `ALL` in the command column with any wildcard is a trap. Sudoers with `!requiretty`, overly broad `Defaults env_keep`, or editors in the allowed list (`vi`, `less`, `more`, `man`) are classic escape routes.

---

## 13. Networking Services Administration

### Interface configuration

**Modern distros (Netplan / NetworkManager):**

Netplan (Ubuntu 18.04+):

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp0s3:
      addresses: [10.0.2.15/24]
      gateway4: 10.0.2.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

Apply: `netplan apply` (or `netplan try` for rollback-on-timeout).

NetworkManager (RHEL/Fedora desktops, some Ubuntu): `nmcli`, `nmtui`.

```bash
nmcli device status
nmcli connection show
nmcli connection modify "Wired connection 1" ipv4.method manual ipv4.addresses 10.0.2.15/24
nmcli connection up "Wired connection 1"
```

**Legacy (Debian `/etc/network/interfaces`):**

```
auto enp0s3
iface enp0s3 inet static
    address 10.0.2.15
    netmask 255.255.255.0
    gateway 10.0.2.1
    dns-nameservers 1.1.1.1 8.8.8.8
```

Apply: `ifup enp0s3` / `ifdown enp0s3`.

**Legacy (RHEL `/etc/sysconfig/network-scripts/ifcfg-<iface>`):**

```
DEVICE=enp0s3
BOOTPROTO=static
IPADDR=10.0.2.15
NETMASK=255.255.255.0
GATEWAY=10.0.2.1
ONBOOT=yes
```

### Runtime inspection — `ip` (modern) and legacy equivalents

```bash
ip addr                                # interfaces + IPs (was `ifconfig`)
ip -br addr                            # brief table view
ip route                               # routing table (was `route -n`)
ip neigh                               # ARP cache (was `arp -n`)
ip link                                # interface state
ip -s link show enp0s3                 # stats
ip addr add 10.0.2.100/24 dev enp0s3   # add address
ip route add default via 10.0.2.1
ethtool enp0s3                         # speed/duplex/offload
```

### Socket and connection state

```bash
ss -tlnp                               # listening TCP, numeric, with process (replaces netstat)
ss -tunap                              # all TCP+UDP, established, numeric, with process
ss -s                                  # summary counts
netstat -rn                            # routing table (legacy)
netstat -tlnp                          # listening, legacy
lsof -i :443                           # who's bound to port 443
```

### Service control (systemd)

```bash
systemctl start nginx
systemctl stop nginx
systemctl restart nginx
systemctl reload nginx                 # SIGHUP-equivalent; no drop
systemctl enable nginx                 # autostart on boot
systemctl disable nginx
systemctl status nginx
systemctl is-active nginx
systemctl is-enabled nginx
systemctl list-units --type=service --state=running
systemctl list-unit-files --type=service
systemctl daemon-reload                # after editing unit files
```

Legacy wrappers: `service nginx status`, `chkconfig nginx on`, `/etc/init.d/nginx start` still work on systemd via compat shims.

---

## 14. Network File System (NFS)

Sun's RPC-based file-sharing protocol. Ubiquitous for Unix-to-Unix shares; SMB/CIFS is the Windows analog.

### Versions

| Version | Notes |
|---|---|
| **NFSv2** | 32-bit sizes; stateless; obsolete |
| **NFSv3** | 64-bit sizes; still widely deployed; needs portmap/mountd/nlm |
| **NFSv4** | Stateful; single port 2049; integrates locking + mounting; Kerberos-friendly |
| **NFSv4.1 / 4.2** | Parallel NFS (pNFS), server-side copy, labeled NFS |

### Server configuration

`/etc/exports` lists exported directories and client restrictions:

```
/srv/nfs/share   10.0.0.0/24(rw,sync,no_subtree_check,root_squash)
/srv/nfs/ro      *(ro,sync,no_subtree_check,all_squash,anonuid=65534)
/srv/nfs/krb     *(rw,sec=krb5p,sync)
```

Key options:

| Option | Meaning |
|---|---|
| `ro` / `rw` | Read-only / read-write |
| `sync` | Don't reply until writes committed |
| `async` | Faster; risks data loss on crash |
| `root_squash` | Remote root → `nobody` (default, keep it) |
| `no_root_squash` | Remote root stays root — **dangerous** |
| `all_squash` | All UIDs → `nobody` |
| `anonuid` / `anongid` | UID/GID used for squashed requests |
| `sec=sys` | UID-based (default, trust the client's claim — a lie) |
| `sec=krb5` / `krb5i` / `krb5p` | Kerberos auth / integrity / privacy |

Apply changes: `exportfs -ra`.

Server daemons: `rpc.nfsd`, `rpc.mountd`, `rpc.statd` (NLM for v3 locking), `rpcbind` (portmap). All bundled in `nfs-kernel-server` (Debian) or `nfs-utils` (RHEL).

### Client

```bash
showmount -e server.example.com        # list server's exports (v3-style)
mount -t nfs server:/srv/nfs/share /mnt/nfs
mount -t nfs4 -o sec=krb5 server:/share /mnt/nfs
```

In `/etc/fstab`:

```
server:/srv/nfs/share  /mnt/nfs  nfs  defaults,_netdev,soft,intr  0  0
```

`autofs` mounts NFS on-demand to reduce hang risk if server unreachable.

### Ports

| Port | Service | Versions |
|---|---|---|
| **2049/tcp+udp** | NFS | v3, v4 |
| **111/tcp+udp** | rpcbind (portmap) | v3 |
| **20048** | mountd | v3 |
| **4045** | lockd | v3 |
| **32765-32769** | rpc.statd ephemeral | v3 |

NFSv4 needs only 2049 — firewall-friendly. NFSv3 needs the whole RPC constellation.

### Security posture

- `sec=sys` is a *declaration*, not authentication: the client tells the server "I am UID 1000 in group 1000" and the server believes it. Anyone with root on any client can impersonate anyone.
- `no_root_squash` + `sec=sys` = remote root escalation vector.
- Use `sec=krb5p` for confidentiality, or carry NFS inside an IPsec/VPN tunnel.
- `/etc/exports` is read by root only; confirm readability (`600`).

---

## 15. Name Resolution — Hostname Lookup, BIND, LDAP

### Hostname resolution order — `/etc/nsswitch.conf`

When a Linux host resolves a name like `server.navy.mil`, the order is controlled by `/etc/nsswitch.conf`:

```
hosts: files mdns4_minimal [NOTFOUND=return] dns
```

Try `files` (i.e., `/etc/hosts`) first; stop on NOTFOUND for mdns; fall through to `dns`. Other sources: `myhostname`, `nis`, `ldap`, `wins`.

**Files that matter:**

| File | Purpose |
|---|---|
| `/etc/hosts` | Static host→IP mappings (overrides DNS) |
| `/etc/resolv.conf` | DNS nameserver IPs + search domains |
| `/etc/nsswitch.conf` | Lookup order/sources for hosts, passwd, group, services, etc. |
| `/etc/hostname` | Local machine hostname |
| `/etc/hosts.allow`, `/etc/hosts.deny` | TCP wrappers (legacy access control) |
| `/etc/resolv.conf` (symlink to `/run/systemd/resolve/stub-resolv.conf`) | On systemd-resolved systems |

**Common attack surface:** an attacker with `/etc/hosts` write can redirect a hostname resolution without touching DNS. `/etc/resolv.conf` hijack is a classic foothold.

### Local-resolution utilities

```bash
getent hosts example.com               # NSS-respecting lookup
nslookup example.com                   # deprecated but still present
host example.com                       # simple DNS lookup
dig example.com                        # verbose DNS
dig +trace example.com                 # recursive walk from roots
dig @8.8.8.8 example.com MX            # specific server, MX record
dig AXFR @ns1.example.com example.com  # zone transfer attempt
```

### BIND — the Internet's DNS server

ISC BIND (`named`) is the de facto authoritative/recursive DNS server.

**Config:** `/etc/bind/named.conf` (Debian) or `/etc/named.conf` (RHEL), with zone files in `/var/cache/bind/` or `/var/named/`.

Minimal forwarding recursor:

```
options {
    directory "/var/cache/bind";
    recursion yes;
    allow-recursion { 10.0.0.0/24; };
    forwarders { 1.1.1.1; 8.8.8.8; };
    dnssec-validation auto;
    listen-on { any; };
};
```

Authoritative zone:

```
zone "navy.mil" {
    type master;
    file "/etc/bind/zones/navy.mil.db";
    allow-transfer { 10.0.0.2; };    # secondaries
};
```

**Zone file**:

```
$TTL 86400
@       IN  SOA   ns1.navy.mil. admin.navy.mil. (
                        2026042301  ; serial YYYYMMDDNN
                        3600        ; refresh
                        1800        ; retry
                        604800      ; expire
                        86400 )     ; minimum
        IN  NS    ns1.navy.mil.
        IN  NS    ns2.navy.mil.
        IN  MX 10 mail.navy.mil.
ns1     IN  A     10.0.0.1
ns2     IN  A     10.0.0.2
www     IN  A     10.0.0.10
mail    IN  A     10.0.0.20
web     IN  CNAME www
```

### DNS record types

| Type | Purpose |
|---|---|
| **A** | IPv4 address |
| **AAAA** | IPv6 address |
| **CNAME** | Alias to another name |
| **MX** | Mail exchange (with priority) |
| **NS** | Authoritative nameserver for a zone |
| **PTR** | Reverse (IP → name) in `in-addr.arpa` / `ip6.arpa` |
| **SOA** | Zone start of authority (serial, refresh, retry, expire, minimum) |
| **TXT** | Free text — SPF, DKIM, verification tokens |
| **SRV** | Service location (LDAP, Kerberos, SIP) |
| **CAA** | Authorized CAs for a domain |

### DNSSEC

Signed zones prove authenticity. Records: `DNSKEY`, `RRSIG`, `DS`, `NSEC` / `NSEC3`. `dig +dnssec` requests DNSSEC data; `AD` flag in response = authenticated.

### LDAP

Lightweight Directory Access Protocol — hierarchical directory service used for user auth, address books, machine inventory. Ports **389** (clear or StartTLS) and **636** (LDAPS).

**Data model:**

- **DN (Distinguished Name)** — unique path: `uid=alice,ou=Users,dc=navy,dc=mil`.
- **RDN (Relative Distinguished Name)** — leaf component: `uid=alice`.
- **Base DN** — root of the tree: `dc=navy,dc=mil`.
- **Attributes** — typed key/value: `cn` (common name), `sn` (surname), `mail`, `uid`, `objectClass`.
- **Schema** — classes (e.g., `inetOrgPerson`, `posixAccount`) define required/allowed attributes.

**Search from the shell:**

```bash
ldapsearch -x -H ldap://ldap.example.com \
    -D "cn=admin,dc=example,dc=com" -W \
    -b "ou=Users,dc=example,dc=com" \
    "(uid=alice)"
```

`-x` simple bind (password); `-Y GSSAPI` Kerberos; `-ZZ` force StartTLS.

Implementations: **OpenLDAP** (`slapd`), **389 Directory Server** (Red Hat), **Microsoft Active Directory** (LDAP-compatible, Windows).

Linux clients use LDAP via NSS + PAM: `nslcd` + `libnss-ldap` + `pam_ldap`, or modern SSSD (`/etc/sssd/sssd.conf`).

---

## 16. Samba

Samba implements the SMB/CIFS protocol on Unix, allowing Linux hosts to act as Windows-compatible file/print servers and to join Active Directory.

### Core daemons

- `smbd` — SMB file/print service on **TCP 445** (and legacy 139).
- `nmbd` — NetBIOS name service on **UDP 137**, datagram on 138.
- `winbindd` — domain-membership helper (resolves AD users/groups via `libnss_winbind`).

### `/etc/samba/smb.conf`

INI-style file. Special section `[global]` plus one section per share.

```ini
[global]
    workgroup = NAVY
    server string = %h server
    security = user
    map to guest = bad user
    log file = /var/log/samba/log.%m
    max log size = 1000
    server role = standalone server
    obey pam restrictions = yes
    passwd program = /usr/bin/passwd %u
    pam password change = yes
    usershare allow guests = no

[public]
    path = /srv/samba/public
    browseable = yes
    read only = yes
    guest ok = yes

[team]
    path = /srv/samba/team
    valid users = @developers
    read only = no
    create mask = 0660
    directory mask = 0770
```

### Security modes

| `security =` value | Meaning |
|---|---|
| `user` | Client must log in with a valid Samba username/password (default, modern) |
| `domain` | Member server in an NT4 or AD domain; auth to DC |
| `ads` | Active Directory member using Kerberos |
| `server` | Passthrough to another SMB server (deprecated) |
| `share` | Per-share auth (legacy; removed) |

### User management (`user` mode)

Samba maintains its own password database (`/var/lib/samba/private/passdb.tdb` or similar):

```bash
smbpasswd -a alice                     # add Samba user (must already exist in /etc/passwd)
smbpasswd alice                        # change password
smbpasswd -d alice                     # disable
pdbedit -L                             # list Samba users
```

### Joining AD

```bash
# Configure Kerberos (/etc/krb5.conf) and smb.conf with realm info, then:
net ads join -U Administrator
net ads testjoin
```

After join, `winbind` fetches domain users/groups; `wbinfo -u` / `wbinfo -g` verify.

### Client-side

```bash
smbclient -L //server -U alice         # list shares
smbclient //server/share -U alice      # interactive FTP-like session
mount -t cifs //server/share /mnt/smb -o username=alice,uid=1000
```

With a credentials file (mode 600):

```
# /etc/cifs-creds
username=alice
password=...
domain=NAVY
```

Mount: `mount -t cifs //server/share /mnt/smb -o credentials=/etc/cifs-creds,_netdev`.

### Hardening notes

- Disable SMBv1: `server min protocol = SMB2_10` in `[global]`.
- Enforce signing: `server signing = mandatory`.
- Log connections and authentication failures to `/var/log/samba/`.
- Null sessions off (default in modern Samba).

---

## 17. Apache Web Server

Apache HTTP Server (`httpd` on RHEL, `apache2` on Debian) is a modular web server. The Bib cares about config structure and headers, not tuning.

### Installation paths

| Distro | Main config | Sites dir | Modules dir |
|---|---|---|---|
| **Debian/Ubuntu** | `/etc/apache2/apache2.conf` | `/etc/apache2/sites-available/` + `sites-enabled/` | `/etc/apache2/mods-available/` + `mods-enabled/` |
| **RHEL/CentOS** | `/etc/httpd/conf/httpd.conf` | `/etc/httpd/conf.d/` | `/etc/httpd/modules/` |

Debian uses symlink-based enable/disable: `a2ensite`, `a2dissite`, `a2enmod`, `a2dismod`.

### Config directive categories

1. **Global environment directives** — server-wide runtime parameters.
2. **Main server directives** — defaults applied when no virtual host matches.
3. **Container directives** — scoped blocks that restrict directives to paths, URLs, file patterns, virtual hosts.

### Global env directives (examples)

```apache
ServerRoot "/etc/apache2"
PidFile ${APACHE_PID_FILE}
Timeout 60
KeepAlive On
MaxKeepAliveRequests 100
KeepAliveTimeout 5
User www-data
Group www-data
Listen 80
Listen 443
```

### Main server directives

```apache
ServerAdmin webmaster@example.com
ServerName www.example.com
DocumentRoot /var/www/html
DirectoryIndex index.html index.php
HostnameLookups Off
```

### Container directives

| Container | Scope |
|---|---|
| `<Directory "/path">` | Filesystem path |
| `<Files "pattern">` | Filename pattern |
| `<FilesMatch "regex">` | Regex on filenames |
| `<Location "/url-path">` | URL path |
| `<LocationMatch "regex">` | Regex URL path |
| `<VirtualHost ip:port>` | One of many virtual hosts on this server |
| `<IfModule mod>` | Only if module loaded |
| `<If "expr">` | Runtime expression |

Example virtual host:

```apache
<VirtualHost *:443>
    ServerName secure.example.com
    DocumentRoot /var/www/secure

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/secure.crt
    SSLCertificateKeyFile /etc/ssl/private/secure.key

    <Directory /var/www/secure>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/secure-error.log
    CustomLog ${APACHE_LOG_DIR}/secure-access.log combined
</VirtualHost>
```

### Log directives

- `ErrorLog /var/log/apache2/error.log` — errors; level via `LogLevel warn`.
- `CustomLog /var/log/apache2/access.log combined` — requests; `combined` = common + Referer + User-Agent.

Standard log formats:

```
common    "%h %l %u %t \"%r\" %>s %O"
combined  "%h %l %u %t \"%r\" %>s %O \"%{Referer}i\" \"%{User-Agent}i\""
```

### HTTP headers worth knowing

**Request:**

| Header | Meaning |
|---|---|
| `Host` | Hostname from URL (mandatory in HTTP/1.1) |
| `User-Agent` | Client identification |
| `Accept` | MIME types the client wants |
| `Accept-Encoding` | Compression support (gzip, br) |
| `Authorization` | Credentials (Basic, Bearer, Digest) |
| `Cookie` | Client session state |
| `Referer` | Page that linked here (misspelled in RFC) |
| `X-Forwarded-For` | Client IP through proxies |

**Response:**

| Header | Meaning |
|---|---|
| `Server` | Server software identification (disable for OPSEC) |
| `Content-Type` | MIME type of body |
| `Content-Length` | Body size in bytes |
| `Set-Cookie` | Assign session cookie |
| `Location` | Redirect target (3xx) |
| `Strict-Transport-Security` | Enforce HTTPS |
| `Content-Security-Policy` | CSP restrictions |
| `X-Frame-Options` | Clickjacking protection |
| `X-Content-Type-Options: nosniff` | Prevent MIME sniffing |

### Security modules

- `mod_ssl` — TLS termination.
- `mod_rewrite` — URL manipulation.
- `mod_security` — ModSecurity WAF.
- `mod_headers` — inject/strip security headers.
- `mod_evasive` — simple DoS mitigation.

Disable server banner:

```apache
ServerTokens Prod
ServerSignature Off
```

---

## 18. Security Packages and Patches

### Package managers

| Distro | Low-level | High-level | Query |
|---|---|---|---|
| **Debian/Ubuntu** | `dpkg` | `apt`, `apt-get` | `dpkg -l`, `apt list --installed`, `apt show` |
| **RHEL/Fedora** | `rpm` | `yum` (RHEL 7) / `dnf` (RHEL 8+, Fedora) | `rpm -qa`, `dnf list installed`, `dnf info` |
| **SUSE** | `rpm` | `zypper` | `zypper se -i`, `zypper info` |
| **Arch** | — | `pacman` | `pacman -Q`, `pacman -Qi` |
| **Alpine** | — | `apk` | `apk info`, `apk list --installed` |

### apt (Debian/Ubuntu)

```bash
apt update                             # refresh package indexes
apt upgrade                            # upgrade installed packages (no removals)
apt full-upgrade                       # allow removals (smarter deps)
apt install nginx
apt remove nginx                       # keep config
apt purge nginx                        # remove config too
apt autoremove                         # drop unused deps
apt list --upgradable                  # what's pending
apt-cache policy nginx                 # installed/candidate versions + repo
apt-mark hold linux-image-generic      # pin current version
```

Sources: `/etc/apt/sources.list` and `/etc/apt/sources.list.d/*.list`. Signing keys: `/etc/apt/trusted.gpg.d/` (modern) and the deprecated `apt-key`.

### dnf / yum (RHEL family)

```bash
dnf check-update                       # list available updates
dnf update                             # apply all
dnf update --security                  # security-only
dnf info nginx
dnf install nginx
dnf remove nginx
dnf history                            # transaction log
dnf history undo <id>                  # rollback a transaction
dnf updateinfo list security           # advisory-tagged updates
```

Repositories: `/etc/yum.repos.d/*.repo`. GPG keys: `/etc/pki/rpm-gpg/`.

### Signature verification

Every legit repository is GPG-signed. The package tool verifies the signature on the release metadata (and transitively the packages). Disabling signature checks (`[rpm] gpgcheck=0` or apt's `[trusted=yes]`) is a common, terrible hardening regression.

### Unattended / automatic updates

- Debian: `unattended-upgrades` package, `/etc/apt/apt.conf.d/50unattended-upgrades`. Enables daily security updates, optional reboot.
- RHEL: `dnf-automatic`, `/etc/dnf/automatic.conf` (`apply_updates = yes`), systemd timer `dnf-automatic.timer`.

### CVE tracking

- `apt list --upgradable` shows pending packages; `apt changelog <pkg>` shows upstream changelogs mentioning CVEs.
- `dnf updateinfo list cves` maps advisory → CVE.
- USN (Ubuntu Security Notices), DSA (Debian Security Advisories), RHSA (Red Hat Security Advisories) are the per-distro channels.
- `openscap` / `oscap-ssg` runs automated CVE + config checks against SCAP content (DISA STIG, CIS, USGCB).

---

## 19. Host-based Intrusion Detection System (HIDS)

### HIDS vs NIDS

- **NIDS** — network sensor; sees packets crossing a segment; no host-internal visibility. Examples: Snort, Suricata, Zeek.
- **HIDS** — software on the host; sees filesystem, logs, processes, syscalls; no cross-host view. Examples: OSSEC/Wazuh, AIDE, Samhain, Tripwire, auditd.

A mature SOC deploys **both** and correlates in SIEM.

### HIDS categories

1. **Log-watching** — parse and alert on syslog/auth/app logs. (OSSEC/Wazuh, fail2ban.)
2. **File-integrity monitoring (FIM)** — baseline hashes + perms; alert on change. (AIDE, Tripwire, Samhain, Wazuh FIM module.)
3. **Rootkit detection** — signature and heuristic checks for known rootkits. (rkhunter, chkrootkit.)
4. **Syscall/behavior** — kernel audit rules; anomaly detection. (auditd, Linux Audit Framework, OSSEC event rules, Falco.)
5. **Antivirus** — signature scanning for malware. (ClamAV.)

### OSSEC / Wazuh

OSSEC was the reference open-source HIDS; Wazuh is the modern actively-maintained fork with an Elastic-based backend.

- Agent on every host → manager.
- Performs log collection, FIM, rootcheck, active response.
- Rules in XML; decoders parse logs into fields; rules match fields to severities.
- Integrates with OpenSCAP, VirusTotal, MITRE ATT&CK mapping.

### Samhain

Centralized FIM with tamper-resistance:
- Database integrity-signed.
- Can run stealthed (binary disguised).
- Remote log transport encrypted.

### AIDE (covered in §20)

Filesystem baseline + periodic check; simpler than OSSEC; stateless.

### Deployment posture

- Baseline taken **immediately after install + hardening**, before exposing to network.
- Baseline stored **off-host** (read-only media, remote vault) so an attacker with root can't rewrite it.
- Alerts shipped to an **independent log sink** (SIEM, syslog server) so a host compromise doesn't silence its own alerts.

### HIDS vs EDR

EDR (CrowdStrike, SentinelOne, Defender for Endpoint) is the commercial successor concept: kernel-level telemetry, behavior analytics, cloud-backed intel, remote response. HIDS is the open-source, policy-driven ancestor; still relevant for air-gapped and Navy system baselines.

---

## 20. File Integrity Checking

### AIDE — Advanced Intrusion Detection Environment

Canonical open-source FIM for Linux.

**Config:** `/etc/aide/aide.conf` (Debian) or `/etc/aide.conf` (RHEL) — selects which paths to watch and which attributes to compare.

**Rule syntax:**

```
# Attribute groups (pre-defined): p=perms, i=inode, n=links, u=uid, g=gid,
# s=size, b=blockcount, m=mtime, a=atime, c=ctime, S=size-grows,
# acl=ACL, xattrs=extended attrs, md5/sha1/sha256/sha512=hash

Binlib = p+i+n+u+g+s+b+m+c+md5+sha256
Logs   = p+n+u+g+S
Data   = p+n+u+g+s+sha256

/bin       Binlib
/sbin      Binlib
/usr/bin   Binlib
/usr/sbin  Binlib
/etc       Binlib
/var/log   Logs
!/var/log/wtmp
!/var/log/btmp
!/var/log/journal
```

**Workflow:**

```bash
aide --init                            # build baseline DB (output: aide.db.new)
mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
aide --check                           # compare current vs baseline
aide --update                          # re-baseline and produce diff
```

**Baseline storage:** write `aide.db` to read-only media (CD, enforced immutable FS, or copy to a remote read-only NFS export). If an attacker can rewrite the database, every check from then on is a lie.

**Scheduling:** daily cron or systemd timer that runs `aide --check` and ships the diff to SIEM.

### rkhunter

Rootkit Hunter — signature + heuristic checks.

```bash
rkhunter --propupd                     # baseline file properties
rkhunter --check                       # scan
rkhunter --update                      # refresh signature database
```

Looks for: known rootkit files, suspicious kernel modules, hidden processes, backdoor ports, suspicious strings in binaries, modified system binaries.

### chkrootkit

Older, simpler scanner in shell + C binaries.

```bash
chkrootkit                             # run all checks
chkrootkit -l                          # list available tests
```

Checks for known LKM rootkit signs, suspicious lastlog entries, promiscuous interfaces, deleted-log tampering.

### Hash algorithms used

| Algorithm | Notes |
|---|---|
| **MD5** | Broken for collision; acceptable for change-detection if attacker can't forge |
| **SHA-1** | Broken for collision (2017); avoid for new baselines |
| **SHA-256** | Modern default; good enough |
| **SHA-512** | More bits; slower; overkill for FIM |
| **Whirlpool / RIPEMD** | Offered by AIDE for variety |

### Baseline → Check → Report workflow

1. **Install + harden** the system.
2. **Baseline** with FIM tool.
3. **Store baseline off-host** (or make it immutable: `chattr +i /var/lib/aide/aide.db`).
4. **Schedule** daily (or hourly for high-value hosts) checks.
5. **Ship diffs** to SIEM.
6. **Review** — a diff is not alone evidence of compromise (pkg updates, legit admin changes) but any *unexpected* diff warrants investigation.
7. **Re-baseline** after approved changes (patch cycles, deployments).

---

## 21. Tripwire

Commercial + open-source file-integrity tool older than AIDE; still on many JCAC-era baselines.

### Files and keys

| File | Purpose |
|---|---|
| `twcfg.txt` → `tw.cfg` (encrypted) | Tripwire runtime config (paths, keys, policies) |
| `twpol.txt` → `tw.pol` (encrypted) | Policy: what to watch, with what property masks |
| `site.key` | Site key — encrypts config and policy |
| `local.key` | Local key — signs the DB and reports |
| `/var/lib/tripwire/<host>.twd` | Integrity database |
| `/var/lib/tripwire/report/*.twr` | Encrypted reports |

Config and policy are **plain-text .txt** files edited by admin, then encrypted via `twadmin` using keys set at install.

### Property masks — syntax

Per-object rules specify attributes to check; `+` include, `-` exclude:

| Code | Attribute |
|---|---|
| `a` | Access timestamp (`atime`) |
| `b` | Blocks allocated |
| `c` | Inode-change time (`ctime`) |
| `d` | Device number of disk |
| `g` | Group ID |
| `i` | Inode number |
| `l` | Growing flag (append-only, don't flag size-grows) |
| `m` | Modify time (`mtime`) |
| `n` | Number of hard links |
| `p` | Permissions |
| `r` | Device number (for character/block devices) |
| `s` | File size |
| `t` | File type |
| `u` | User ID |
| `C` | CRC-32 |
| `H` | Haval |
| `M` | MD5 |
| `S` | SHA-1 |

Pre-defined masks (varies by platform):

- `ReadOnly` = `+pinugtsdbmCM-rlacSH` (everything except atime/growing/size-changes)
- `Dynamic` = `+pinugtd-rsacmblCMSH` (for log-like files that change size but should keep owner/perms)
- `Growing` = `+pinugtdl-rsacmbCMSH` (logs — `l` flag means "expected to grow; don't alert on size-increase")
- `Device` = `+pugsdr-intlbamcCMSH` (character/block devices)
- `IgnoreAll` = `-pinugtsdrbamcCMSH` (everything off)

### Policy-file excerpt

```
(
    rulename = "Critical system binaries",
    severity = $(SIG_HI)
)
{
    /bin       -> $(ReadOnly);
    /sbin      -> $(ReadOnly);
    /usr/bin   -> $(ReadOnly);
    /usr/sbin  -> $(ReadOnly);
}

(
    rulename = "Logs (append-only)",
    severity = $(SIG_MED)
)
{
    /var/log   -> $(Growing);
}
```

### Workflow

```bash
# First-time setup
twadmin --create-cfgfile --site-keyfile site.key twcfg.txt
twadmin --create-polfile --site-keyfile site.key twpol.txt
tripwire --init                        # build baseline DB
```

Then routine:

```bash
tripwire --check                       # integrity check against DB
tripwire --update --twrfile /var/lib/tripwire/report/<host>-<date>.twr
twprint --print-report --twrfile /var/lib/tripwire/report/<host>-<date>.twr
twprint --print-dbfile | less
```

Passphrases for `site.key` and `local.key` are required for policy edits and DB updates respectively — standard dual-control.

### Comparison to AIDE

| Feature | Tripwire | AIDE |
|---|---|---|
| Encrypted DB and reports | Yes (site/local keys) | No (relies on offline storage) |
| Policy syntax | Custom DSL with severities | Simpler attribute groups |
| Commercial support | Yes (Tripwire Inc.) | No |
| Active open-source dev | Limited | Moderate |
| Typical deployment | Legacy / compliance-driven | Modern / general |

---

## 22. Security Posture — IPtables

`iptables` is the userspace frontend for the netfilter packet filter. On modern kernels it's being replaced by `nftables` but remains the exam-relevant interface.

### Tables

| Table | Purpose |
|---|---|
| **filter** | Packet accept/drop (default table) |
| **nat** | NAT/PAT (SNAT, DNAT, MASQUERADE) |
| **mangle** | Packet header modification (TTL, TOS, mark) |
| **raw** | Connection-tracking exemptions (`NOTRACK`) |
| **security** | SELinux mark interactions |

### Chains (per-table)

Each table has a subset of built-in chains:

| Chain | Traversal point |
|---|---|
| **PREROUTING** | Just after packet arrives, before routing decision |
| **INPUT** | Packets destined for this host |
| **FORWARD** | Packets routed through this host |
| **OUTPUT** | Packets generated by this host |
| **POSTROUTING** | Just before packet leaves, after routing decision |

Packet flow, simplified:

```
  NIC in → PREROUTING (raw→mangle→nat) → routing decision
     → INPUT (mangle→filter) → local process
     → FORWARD (mangle→filter) → POSTROUTING (mangle→nat) → NIC out

  local process → OUTPUT (raw→mangle→nat→filter) → POSTROUTING → NIC out
```

### Targets

Terminating:

| Target | Effect |
|---|---|
| **ACCEPT** | Allow packet to continue |
| **DROP** | Silently discard |
| **REJECT** | Drop and send ICMP reject (or TCP RST) |
| **RETURN** | Return from a user-defined chain to caller |

Non-terminating:

| Target | Effect |
|---|---|
| **LOG** | Kernel-log with prefix; packet continues |
| **NFLOG** | User-space log via `ulogd` |
| **MASQUERADE** | SNAT with outbound interface's address (dial-up/DHCP) |
| **SNAT --to-source a.b.c.d** | Static source NAT |
| **DNAT --to-destination a.b.c.d** | Static destination NAT |
| **REDIRECT --to-ports 8080** | DNAT to local port |
| **MARK --set-mark 1** | Set netfilter mark for routing/qdisc |

### Simple rule-set — hardened baseline

```bash
# Reset
iptables -F; iptables -X; iptables -t nat -F; iptables -t nat -X

# Default-deny
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Loopback
iptables -A INPUT -i lo -j ACCEPT

# Stateful allow for replies to outbound connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# ICMP
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 5/s -j ACCEPT

# SSH (rate-limit new connections)
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m limit --limit 3/min --limit-burst 3 -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# HTTPS
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Log drops (rate-limited)
iptables -A INPUT -m limit --limit 5/min -j LOG --log-prefix "iptables-drop: "
```

### Persistence

Rules live only in the running kernel; save them to disk:

```bash
# Debian/Ubuntu (iptables-persistent package)
iptables-save > /etc/iptables/rules.v4
ip6tables-save > /etc/iptables/rules.v6

# RHEL 7
service iptables save     # → /etc/sysconfig/iptables

# Modern: use firewalld (RHEL) or ufw (Ubuntu) as a wrapper over iptables/nftables
```

### Useful inspection

```bash
iptables -L -v -n --line-numbers            # filter table with counters
iptables -t nat -L -v -n                    # NAT rules
iptables -S                                 # iptables-save-style output
conntrack -L                                # connection tracking table (conntrack-tools)
```

### nftables

Replacement with a unified syntax across IPv4/IPv6/ARP/bridge:

```
nft add table inet filter
nft add chain inet filter input { type filter hook input priority 0 \; policy drop \; }
nft add rule inet filter input ct state established,related accept
nft add rule inet filter input iifname lo accept
nft add rule inet filter input tcp dport 22 accept
```

`iptables` commands are auto-translated to nftables via `iptables-nft` on modern distros.

---

## 23. Network-based Security using Nmap

Nmap is the default network-scanning tool for both attackers and defenders. In a defender role it's used to **baseline** your own attack surface and **detect** rogue services.

### Scan types

| Flag | Scan |
|---|---|
| `-sS` | TCP SYN (half-open); needs root |
| `-sT` | TCP connect() — uses OS syscall; no root needed; louder |
| `-sU` | UDP — slow; ICMP unreachable = closed |
| `-sA` | TCP ACK — maps firewall rulesets (filtered vs unfiltered) |
| `-sN` / `-sF` / `-sX` | Null / FIN / Xmas — against non-stateful filters |
| `-sV` | Service-version probes |
| `-sC` | Default script category (`--script=default`) |
| `-O` | OS fingerprinting |
| `-A` | Aggressive: `-sV -sC -O --traceroute` |
| `-Pn` | Skip host discovery (treat all as up) |
| `-sn` | Ping sweep only (discovery, no port scan) |

### Host discovery

```bash
nmap -sn 10.0.0.0/24                   # ping sweep
nmap -PS80,443 -PA22,3389 10.0.0.0/24  # SYN+ACK probes on common ports
nmap -PE 10.0.0.0/24                   # ICMP echo
nmap -PP 10.0.0.0/24                   # ICMP timestamp
nmap -PM 10.0.0.0/24                   # ICMP netmask
```

### Port specification

```bash
nmap -p 22,80,443 target               # explicit ports
nmap -p 1-1024 target                  # range
nmap -p- target                        # all 65535 TCP ports
nmap --top-ports 100 target            # most-common 100
nmap -F target                         # fast (top 100)
```

### Output formats

```bash
nmap -oN scan.txt target               # normal
nmap -oX scan.xml target               # XML (parseable)
nmap -oG scan.gnmap target             # grepable
nmap -oA scan target                   # all three (.nmap / .xml / .gnmap)
```

### NSE — Nmap Scripting Engine

Scripts live in `/usr/share/nmap/scripts/`. Categories: `auth`, `broadcast`, `brute`, `default`, `discovery`, `dos`, `exploit`, `external`, `fuzzer`, `intrusive`, `malware`, `safe`, `version`, `vuln`.

```bash
nmap --script vuln 10.0.0.10
nmap --script smb-enum-shares,smb-enum-users -p 445 10.0.0.10
nmap --script ssl-enum-ciphers -p 443 target
nmap --script http-title,http-headers -p 80,443 target
```

### Timing templates

| Template | Speed | Use |
|---|---|---|
| `-T0` (paranoid) | 1 probe per 5 min | IDS-evading |
| `-T1` (sneaky) | 15s between probes | Stealthy |
| `-T2` (polite) | 0.4s; low bw | Gentle |
| `-T3` (normal) | Default | General |
| `-T4` (aggressive) | Fast | Lab, known-LAN |
| `-T5` (insane) | Fastest; unreliable | CTF |

### Defender workflow

1. **Baseline scan** of each subnet from a management host: `nmap -sS -sV -O -oA baseline-$(date +%F) 10.0.0.0/24`.
2. **Diff** against previous baseline (`ndiff` ships with nmap): `ndiff baseline-2026-04-01.xml baseline-2026-04-23.xml`.
3. **Alert** on new open ports, new hosts, changed OS fingerprints.
4. **Investigate** unexpected services — rogue devices, unintended service startup, compromised host listening on a backdoor port.

---

## 24. Identifying Hardware and Software — Banners and TCP Wrappers

### Service banners

A **banner** is the text a service sends at connection time identifying product and version — historically for humans, practically for attackers fingerprinting.

**Telnet banner** — the login prompt plus OS info, typically from `/etc/issue.net`:

```
Ubuntu 22.04.3 LTS
server.navy.mil login:
```

Disable: empty `/etc/issue.net`, or `sshd_config` / telnetd-config to suppress.

**SSH banner** — pre-authentication banner:

```
SSH-2.0-OpenSSH_9.0p1 Ubuntu-1ubuntu8.5
```

The version string comes from `sshd` binary itself (not easily changeable without rebuild). Additional legal banner via `sshd_config` → `Banner /etc/issue.net`.

`DebianBanner no` in `sshd_config` hides the `Ubuntu-…` suffix (OpenSSH ≥ 6.3 on Debian/Ubuntu).

**Sendmail / SMTP banner** — on connection to port 25:

```
220 server.navy.mil ESMTP Sendmail 8.17.1/8.17.1; Mon, 23 Apr 2026 12:00:00 -0500
```

Configurable in `sendmail.cf` `SmtpGreetingMessage` or Postfix `smtpd_banner`.

### Banner-grabbing

A defender needs to know what an attacker sees:

```bash
echo "" | nc target 22                 # SSH banner
echo "QUIT" | nc target 25             # SMTP banner
curl -I http://target                  # HTTP Server header
nmap -sV -p 22,25,80,443 target        # nmap service detection
```

### Banner hardening

- Remove version strings from banners (`ServerTokens Prod` for Apache; `server_tokens off` for nginx; Postfix `smtpd_banner = $myhostname ESMTP`).
- Present a **legal warning banner** pre-auth on interactive services — DoD-required wording (see DoDM 5205.02, DoDI 8500.01).
- Log failed connections / banner probes to SIEM.

### TCP Wrappers — `hosts.allow` / `hosts.deny`

Legacy access-control layer via `libwrap`. Services linked against libwrap (sshd historically, xinetd-started services, rpcbind, vsftpd) consult these files before accepting.

`/etc/hosts.allow` — matches first, allow.
`/etc/hosts.deny` — matches second, deny.

```
# /etc/hosts.allow
sshd:   10.0.0.0/24, 192.168.1.50
ALL:    LOCAL

# /etc/hosts.deny
ALL:    ALL
```

Syntax: `<daemon>: <client>[: <option>]`. Clients can be IPs, CIDR, hostnames, patterns (`.example.com`, `192.168.`), wildcards (`ALL`, `LOCAL`, `KNOWN`, `UNKNOWN`, `PARANOID`).

Modern systems have mostly moved away from libwrap (OpenSSH ≥ 6.7 dropped support). Replaced by `Match` / `AllowUsers` / `AllowGroups` in `sshd_config`, firewalld/iptables zones, and native service ACLs. Still appears on exams and on RHEL 6-era hardened baselines.

### Local hardware/software identification (defender's inventory)

```bash
# OS and release
uname -a
cat /etc/os-release
lsb_release -a

# Hardware
lscpu
lsmem
lspci
lsusb
lshw -short
dmidecode -t system
cat /proc/cpuinfo /proc/meminfo

# Block devices
lsblk -f
fdisk -l

# Network interfaces
ip -br link
ethtool enp0s3

# Installed packages (for software inventory)
dpkg -l            # Debian
rpm -qa            # RHEL

# Running services
systemctl list-units --type=service --state=running
ss -tlnp
```

These feed a **Configuration Management Database (CMDB)** or asset inventory — prerequisite for vuln management and compliance.

---

## 25. Logs and Auditing

### Console logins — wtmp / btmp / utmp

Binary log files (not text):

| File | Records | Read with |
|---|---|---|
| `/var/log/wtmp` | All login/logout history | `last` |
| `/var/log/btmp` | Failed login attempts | `lastb` |
| `/var/run/utmp` | Currently logged-in users | `who`, `w` |

```bash
last                                   # full history
last -n 20                             # most recent 20
last alice                             # for one user
last -x                                # include system events (reboot, shutdown)
lastb                                  # failed attempts (requires root)
who                                    # current users
w                                      # current users + what they're running
lastlog                                # last-login time per account (/var/log/lastlog)
```

Attackers often truncate or clean these files; AIDE/Tripwire should watch them for *unexpected* shrinkage (logs normally grow).

### /var/log key files

| File | Content |
|---|---|
| `/var/log/messages` (RHEL) / `/var/log/syslog` (Debian) | General system messages |
| `/var/log/auth.log` (Debian) / `/var/log/secure` (RHEL) | Authentication, sudo, su |
| `/var/log/kern.log` | Kernel messages |
| `/var/log/dmesg` | Boot-time kernel messages (also `dmesg` command) |
| `/var/log/boot.log` | Service-start output at boot |
| `/var/log/cron` | Cron job execution (RHEL) |
| `/var/log/mail.log` / `/var/log/maillog` | Mail (Postfix/Sendmail) |
| `/var/log/httpd/*` or `/var/log/apache2/*` | Apache access/error |
| `/var/log/audit/audit.log` | auditd events |
| `/var/log/faillog` | Failed logins per account (legacy) |
| `/var/log/wtmp`, `btmp`, `lastlog` | Binary login records |
| `/var/log/journal/` | systemd binary journal (if persistent) |

### rsyslog — the classic syslog daemon

Modern replacement for `sysklogd`. Config: `/etc/rsyslog.conf` and `/etc/rsyslog.d/*.conf`.

**Facility.severity → action** format:

```
auth,authpriv.*          /var/log/auth.log
*.*;auth,authpriv.none   -/var/log/syslog     # '-' = async write
cron.*                   /var/log/cron.log
kern.*                   -/var/log/kern.log
mail.*                   -/var/log/mail.log
*.emerg                  :omusrmsg:*          # broadcast to all logged-in users

# Remote forwarding
*.* @logserver.navy.mil:514            # UDP
*.* @@logserver.navy.mil:6514          # TCP (use with TLS for real deployments)
```

### Facilities and severities

| Facility | Source |
|---|---|
| `kern` | Kernel |
| `user` | User-level |
| `mail` | Mail system |
| `daemon` | System daemons |
| `auth`, `authpriv` | Authentication / security |
| `syslog` | Syslog itself |
| `lpr` | Printer |
| `news`, `uucp` | Usenet / UUCP (historical) |
| `cron` | Cron |
| `local0 … local7` | Reserved for local use |

| Severity | # | Meaning |
|---|---|---|
| `emerg` | 0 | System unusable |
| `alert` | 1 | Action required immediately |
| `crit` | 2 | Critical |
| `err` | 3 | Error |
| `warning` | 4 | Warning |
| `notice` | 5 | Normal but significant |
| `info` | 6 | Informational |
| `debug` | 7 | Debug |

### Remote forwarding

- UDP 514 — lossy, clear-text. Default for quick setup.
- TCP 6514 — reliable, clear-text.
- TCP 6514 + TLS — reliable, encrypted. Configured via rsyslog `gtls` output driver.

Send logs to a dedicated log host so a compromised source can't rewrite its own history.

### systemd-journald

Default logging target on systemd distros. Binary journal with indexing and structured fields.

```bash
journalctl                             # all logs
journalctl -b                          # current boot
journalctl -b -1                       # previous boot
journalctl -u nginx                    # specific unit
journalctl -f                          # follow (tail -f equivalent)
journalctl -p err                      # severity err+
journalctl -S "2026-04-23 08:00"       # since
journalctl --since "1 hour ago"
journalctl _PID=1234                   # by PID (structured field)
```

**Persistent journal:** `mkdir -p /var/log/journal` and systemd starts persisting automatically (default on Debian/Ubuntu when the dir exists).

### auditd — Linux Audit Framework

Kernel-level audit subsystem. Rules loaded by `auditctl` or `/etc/audit/rules.d/*.rules` → `/etc/audit/audit.rules`.

**Rule syntax:**

```
# Watch a file
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k priv
-w /etc/sudoers.d/ -p wa -k priv

# Syscall rule
-a always,exit -F arch=b64 -S execve -F uid=1000 -k useractivity
-a always,exit -F arch=b64 -S connect -F auid>=1000 -F auid!=-1 -k netconnect

# Lock rules until reboot
-e 2
```

- `-w <path>` watch; `-p wa` on write/attr changes; `-k <key>` tag for filtering.
- `-a always,exit -F arch=b64 -S <syscall>` match syscall at exit on 64-bit.
- `-e 2` makes the rules immutable until reboot — prevents runtime tampering.

**Querying:**

```bash
ausearch -k identity                   # events tagged 'identity'
ausearch -ts today -k priv             # sudoers changes today
ausearch -ui 1000                      # by UID
aureport                               # summary reports
aureport -au                           # authentication
aureport -l                            # login
```

### Logrotate

`logrotate` rotates, compresses, and prunes log files to prevent disk exhaustion. Config: `/etc/logrotate.conf` and `/etc/logrotate.d/*`.

```
/var/log/nginx/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx >/dev/null 2>&1 || true
    endscript
}
```

### What gets logged on a compromise (what a defender looks for)

- **Failed logins** — `auth.log` / `btmp`. Spikes indicate brute-force.
- **Successful login from new source** — `auth.log`. Compare to user's normal origin.
- **Successful sudo** — `auth.log`. Watch for `root` escalation by non-admins.
- **New user/group creation** — `auth.log`, auditd `-w /etc/passwd -p wa`.
- **Cron changes** — `/etc/cron*`, `/var/spool/cron/`. Auditd watch.
- **Service enable/start** — systemd journal.
- **SSH keys added** — watch `~/.ssh/authorized_keys` for every user; auditd.
- **Setuid binary created** — auditd on `chmod` syscall.
- **Kernel module loaded** — `kern.log` / `dmesg`; auditd `-w /sbin/insmod`.
- **Log wipe / truncation** — wtmp/btmp shrink; AIDE/Tripwire flag.

---

## Cross-cutting: Privilege escalation surface (defender view)

The admin's job is to understand the landmines so they can be removed before an attacker finds them. (The exploit-side lives in `JCAC-ACTIVE-EXPLOIT.md` §16 — do not reimplement here.)

### Common misconfigurations

- **SUID binaries with shell-out** — `find / -perm -4000 -type f 2>/dev/null` and cross-check against a hardened baseline (GTFOBins is the attacker's reference list).
- **sudoers `NOPASSWD` with shell-capable commands** — `sudo -l` as each user; audit for editors, interpreters, archive tools, network tools.
- **World-writable system directories** — `find / -type d -perm -0002 ! -perm -1000 2>/dev/null` (world-writable, not sticky).
- **Weak file permissions on sensitive files** — `/etc/shadow` readable; `/etc/sudoers` writable by non-root.
- **Cron with writable scripts** — `/etc/cron.*`, `/var/spool/cron/`; a user-writable script run by root is a foothold.
- **PATH hijack** — any program executed by root with a PATH containing user-writable dirs (e.g., `.` or `/tmp`).
- **Capabilities misuse** — `getcap -r / 2>/dev/null`. `cap_setuid`, `cap_sys_admin`, `cap_dac_read_search` on non-root binaries are priv-esc primitives.
- **Docker group membership** — member of `docker` group can mount `/` from host into a container as root. Effectively `= wheel`.
- **Polkit / pkexec old versions** — PwnKit (CVE-2021-4034) universal pre-patch.

### Hardening posture

- Baseline SUID list; alert on deltas (AIDE rule on `/bin`, `/sbin`, `/usr/*`).
- `sudoers` minimal and audited; no wildcards in `Cmnd_Alias`.
- `umask 027` for system users; private home dirs (`chmod 700 /home/*`).
- Disable core dumps for SUID: `fs.suid_dumpable=0`, `ulimit -c 0` default.
- Enable `kernel.yama.ptrace_scope=1` or `2`.
- Mount `/tmp`, `/var/tmp`, `/dev/shm`, `/home` with `nosuid,nodev,noexec` where compatible.

---

## Cross-cutting: Rootkits and kernel-level persistence

What attackers do to persist; what defenders look for.

### Userland rootkits

- Replace stock binaries (`ls`, `ps`, `netstat`, `find`, `ss`) with versions that hide the attacker's files/processes/sockets.
- Detection: hash-baseline (AIDE/Tripwire), `rkhunter`, `chkrootkit`, compare with known-good from package manager (`rpm -Vf`, `debsums`).

### Library preloading

- `/etc/ld.so.preload` — system-wide preload of shared libs into every dynamically-linked binary. A rootkit library here intercepts any libc call (`readdir`, `fopen`, `getpwnam`) to hide artifacts.
- `LD_PRELOAD` env var — per-process; ignored for SUID. Less persistent; more localized.
- Detection: `/etc/ld.so.preload` should typically not exist; its presence is a strong signal.

### LKM rootkits

- Kernel modules that hook syscalls or VFS to hide files, processes, sockets, module list itself.
- Classic techniques: overwriting function pointers in the syscall table; hooking VFS `readdir` to filter directory listings; splicing into `/proc` to hide PIDs.
- Detection: `lsmod` (rootkits may unlink themselves from the module list — look for holes in `/sys/module/`), kernel log anomalies, memory-forensics tools (Volatility) on captured RAM.

### Bootkit / firmware

- UEFI implants persist below the OS. Out of scope for most Linux host HIDS — requires TPM-measured boot, Secure Boot enforcement, firmware attestation.

### Defender controls

- Signed kernel modules (`CONFIG_MODULE_SIG_FORCE=y`).
- `kernel.modules_disabled=1` after boot (disables any further LKM loads).
- Secure Boot + IMA/EVM for measured boot of userspace.
- Periodic memory forensics on high-value hosts.

---

## Cross-cutting: Log tampering resistance

Default logs are editable by root. Real compromise investigations require logs that survive root.

### Techniques

- **Remote forwarding** — rsyslog over TCP+TLS to an independent log server. Compromise of host A can't rewrite logs on host B.
- **Append-only attribute** — `chattr +a /var/log/secure`. Even root must drop `CAP_LINUX_IMMUTABLE` to remove. Requires kernel support.
- **Immutable auditd rules** — `-e 2` in `audit.rules` prevents runtime rule tampering; rules can only change via reboot + config edit.
- **Systemd journal FSS** — Forward Secure Sealing. Journal sealed periodically with a key; later tampering detectable. `journalctl --setup-keys` creates the verification key.
- **Dedicated log host** — read-only for the source hosts; admins log into the log host via separate credentials.
- **SIEM aggregation** — Splunk, Elastic, Sentinel; timestamped ingestion; audit trail.

### What to watch for

- Gaps in `/var/log/wtmp` (`last` output with a long silent window).
- Shrinking log files (hourly size check via SIEM).
- Missing cron entries (`/var/log/cron` silent for a window in which a known job should have run).
- `rsyslog` / `journald` service restarts outside patch windows.
- `auditctl -l` returning fewer rules than the baseline.

---

## Exam-testable concepts (rapid-fire)

- **SUID binary runs as whose effective UID?** The file's owner.
- **Octal for read + execute?** 5.
- **Default location of failed-login log?** `/var/log/btmp`, read with `lastb`.
- **File controlling hostname resolution order?** `/etc/nsswitch.conf`.
- **Signal 9?** SIGKILL (uncatchable).
- **Signal 19?** SIGSTOP (uncatchable).
- **PID of init?** 1.
- **`/proc/self/maps` shows?** The current process's memory map (virtual address regions and their file backings).
- **Sticky bit on `/tmp` means?** Only the file owner (or root) can delete files, even if others have write on the dir.
- **Syscall that creates a new process?** `fork()` (followed by `execve()` for a new program image).
- **Ring 0 vs ring 3?** Kernel mode vs user mode on x86.
- **Boot stage order, BIOS systems?** BIOS → MBR → GRUB → Kernel → initramfs → init/systemd → target/runlevel.
- **systemd unit that replaces SysV runlevel 3?** `multi-user.target`.
- **Hash prefix `$6$` means?** SHA-512 crypt.
- **NFS default port?** 2049/tcp+udp.
- **Samba SMB port?** 445/tcp; legacy 139/tcp.
- **BIND authoritative record types for a zone's root?** SOA, NS, plus A/AAAA for the zone apex.
- **LDAP ports?** 389 (StartTLS), 636 (LDAPS).
- **IPtables default chain for incoming-to-host packets?** INPUT (filter table).
- **IPtables default chain for SNAT on outbound?** POSTROUTING (nat table).
- **Nmap flag for SYN stealth scan?** `-sS`.
- **AIDE config file?** `/etc/aide/aide.conf` (Debian) or `/etc/aide.conf`.
- **Tripwire policy file (plaintext)?** `twpol.txt`.
- **Property mask flag meaning "ignore file-size growth"?** `l` (growing) in Tripwire.
- **Which `/etc/exports` option is dangerous?** `no_root_squash`.
- **File holding DNS nameserver IPs?** `/etc/resolv.conf`.
- **`lastb` reads?** `/var/log/btmp`.
- **`who` reads?** `/var/run/utmp`.
- **Default RHEL firewall frontend (modern)?** `firewalld` (wraps nftables).
- **Default cipher for modern `/etc/shadow` on Debian 11+?** yescrypt (`$y$`).
- **Apache log format that includes Referer and User-Agent?** `combined`.
- **How do you set SUID with `chmod`?** `chmod u+s file` or numeric `4xxx` (e.g., `4755`).
- **`chattr +i` means?** Immutable — cannot modify or delete, even as root.
- **Which command loads a kernel module with dependency resolution?** `modprobe` (not `insmod`).
- **What is `/etc/hosts.allow` used for?** TCP wrappers access control (legacy).
- **What directive limits a PAM module's effect on stack failure?** Control flag (`required`, `requisite`, `sufficient`, `optional`).
- **Rootkit file that hooks every dynamically-linked program systemwide?** A library referenced by `/etc/ld.so.preload`.
- **auditd rule flag that locks rules until reboot?** `-e 2`.
- **Modern systemd log query tool?** `journalctl`.

---

## Cross-references

- **[Operating System Concepts (Silberschatz)](../references/Operating%20System%20Concepts,%209th%20Edition-9781118063330.pdf)** (on disk) — OS internals textbook
- **[The Linux Command Line (free)](https://linuxcommand.org/tlcl.php)** — full-text free book by William Shotts
- **[MIT 6.828 — OS Engineering](https://pdos.csail.mit.edu/6.828/)** — kernel internals course
- **[Linux Kernel Documentation](https://www.kernel.org/doc/html/latest/)** — upstream kernel docs
- **[BIND 9 Administrator Reference Manual](https://bind9.readthedocs.io/en/latest/)** — ISC
- **[Samba Wiki](https://wiki.samba.org/)** — official
- **[Apache HTTP Server Documentation](https://httpd.apache.org/docs/current/)** — official
- **[Nmap Reference Guide](https://nmap.org/book/man.html)** — Fyodor's canonical reference
- **[AIDE Manual](https://aide.github.io/)** — official
- **[Tripwire Open Source on GitHub](https://github.com/Tripwire/tripwire-open-source)** — source + docs
- **[Linux Audit Documentation (Red Hat)](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/security_hardening/auditing-the-system_security-hardening)** — auditd practical guide
- **[STIG — Red Hat Enterprise Linux 8](https://public.cyber.mil/stigs/)** — DISA hardening baseline; directly applicable
- **JCAC-OS** — general OS concepts sibling module
- **JCAC-WINDOWS** — Windows Module 7 parallel
- **JCAC-ACTIVE-EXPLOIT** §16 — UNIX privilege escalation and sudo/SUID exploit side
