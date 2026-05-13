#!/usr/bin/env python3
"""Add `alternatives` arrays to the 5 remaining books in CWT-E7 bib.json."""

import json
from pathlib import Path

BIB = Path("data/bibs/CWT-E7/bib.json")

ALTS = {
    "BOOK-HACKER-TECH": [
        {"coverage": "System hacking tactics (priv-esc, credential access, defense evasion) — authoritative framework",
         "title": "MITRE ATT&CK Enterprise — Tactics and Techniques",
         "url": "https://attack.mitre.org/matrices/enterprise/",
         "kind": "free-framework",
         "note": "Every attack type this chapter covers (enumeration, password cracking, priv-esc, rootkits, covering tracks) maps directly to ATT&CK techniques."},
        {"coverage": "Security testing methodology (enumeration, vulnerability testing)",
         "title": "NIST SP 800-115 — Technical Guide to Information Security Testing and Assessment",
         "url": "https://csrc.nist.gov/pubs/sp/800/115/final",
         "kind": "free-pdf"},
        {"coverage": "Windows SIDs, accounts, tokens, authentication internals",
         "title": "Microsoft Learn — Windows Authentication Technical Overview",
         "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-overview",
         "kind": "free-docs"},
        {"coverage": "Incident response lifecycle (the Incident Handling half of the book)",
         "title": "NIST SP 800-61 Rev.2 — Computer Security Incident Handling Guide",
         "url": "https://csrc.nist.gov/pubs/sp/800/61/r2/final",
         "kind": "free-pdf",
         "note": "Authoritative NIST IR guide. Covers preparation, detection, containment, eradication, recovery, post-incident."}
    ],
    "BOOK-ASM-PROG": [
        {"coverage": "x86-64 general-purpose and processor registers (authoritative spec)",
         "title": "Intel 64 and IA-32 Software Developer Manual Vol 1 - Basic Architecture",
         "url": "https://cdrdv2-public.intel.com/671436/253665-sdm-vol-1.pdf",
         "kind": "free-pdf",
         "note": "Intel's own specification. Exhaustive, free, authoritative. Covers GP registers, segment registers, FPU, XMM/YMM/ZMM, and MSRs."},
        {"coverage": "x86-64 assembly hands-on course",
         "title": "OpenSecurityTraining2 — Architecture 1001: x86-64 Assembly",
         "url": "https://p.ost2.fyi/courses/course-v1:OpenSecurityTraining2+Arch1001_x86-64_Asm+2021_v1/about",
         "kind": "free-course",
         "note": "Free OST2 course. Covers registers, calling conventions, stack, control flow, and the ~20-30 instructions that cover 99% of real programs. Perfect companion to the Intel SDM."},
        {"coverage": "Follow-on — x86-64 OS internals (the OS interface study topic)",
         "title": "OpenSecurityTraining2 — Architecture 2001: x86-64 OS Internals",
         "url": "https://beta.ost2.fyi/courses/course-v1:OpenSecurityTraining2+Arch2001_x86-64_OS_Internals+2022_v1_jc/about",
         "kind": "free-course"},
        {"coverage": "Practical assembly via compiler output (read-along examples)",
         "title": "Dennis Yurichev — Reverse Engineering for Beginners (beginners.re)",
         "url": "https://beginners.re/",
         "kind": "free-pdf",
         "note": "942-page free textbook (CC BY-SA). Part 1 covers GP registers, stack, and calling conventions with compiler-output examples."},
        {"coverage": "Optimizing x86 assembly (deep register/pipeline detail)",
         "title": "Agner Fog — Optimizing Assembly Manuals",
         "url": "https://www.agner.org/optimize/",
         "kind": "free-pdf"}
    ],
    "BOOK-REVERSE-ENG": [
        {"coverage": "Reverse engineering as a process (complete free textbook)",
         "title": "Dennis Yurichev — Reverse Engineering for Beginners",
         "url": "https://beginners.re/",
         "kind": "free-pdf",
         "note": "942 pages, CC BY-SA. Step-by-step RE methodology: disassembly, data structures, calling conventions, code patterns. Covers x86/x64/ARM/MIPS."},
        {"coverage": "Malware-focused RE (preparing to reverse, triage, static/dynamic)",
         "title": "MalwareUnicorn — Reverse Engineering 101",
         "url": "https://malwareunicorn.org/workshops/re101.html",
         "kind": "free-course",
         "note": "Amanda Rousseau's free workshop: environment setup, PE anatomy, x86 assembly, triage + static + dynamic labs. Exact match for the Bib's preparing-to-reverse scope."},
        {"coverage": "Anti-RE techniques (VM evasion, packing, obfuscation)",
         "title": "MalwareUnicorn — Reverse Engineering 102",
         "url": "https://malwareunicorn.org/workshops/re102",
         "kind": "free-course"},
        {"coverage": "RE tooling (NSA-maintained, free, rivals IDA Pro)",
         "title": "NSA Ghidra (official GitHub)",
         "url": "https://github.com/NationalSecurityAgency/ghidra",
         "kind": "free-tool",
         "note": "Free SRE framework from the NSA. Ships with extensive documentation and hands-on tutorials."},
        {"coverage": "Hands-on Ghidra course (4 sessions)",
         "title": "Wrongbaud — Introduction to Reverse Engineering with Ghidra",
         "url": "https://wrongbaud.github.io/posts/ghidra-training/",
         "kind": "free-course"},
        {"coverage": "Annual free reverse engineering CTF",
         "title": "NSA Codebreaker Challenge",
         "url": "https://codebreaker.ltsnet.net/home",
         "kind": "free-challenge",
         "note": "NSA's annual free CTF — practical RE and crypto problems. Great practice for the RE process."}
    ],
    "BOOK-PRACTICAL-MEM": [
        {"coverage": "Ch 5 — Windows malware detection/analysis via memory forensics (authoritative tool docs)",
         "title": "Volatility Foundation — Framework Documentation",
         "url": "https://volatilityfoundation.org/the-volatility-framework/",
         "kind": "free-docs",
         "note": "Volatility is THE open-source memory forensics tool. Its plugin docs (pslist, malfind, cmdline, handles, dlllist, svcscan, etc.) map directly to the malware-detection-in-memory scope."},
        {"coverage": "Volatility 3 source + plugin reference",
         "title": "Volatility 3 on GitHub",
         "url": "https://github.com/volatilityfoundation/volatility3",
         "kind": "free-tool"},
        {"coverage": "Ch 7 — Linux memory acquisition (LiME kernel module)",
         "title": "LiME — Linux Memory Extractor",
         "url": "https://github.com/504ensicslabs/lime",
         "kind": "free-tool",
         "note": "The go-to open-source tool for Linux RAM acquisition. README covers the acquisition process end-to-end."},
        {"coverage": "Memory forensics quick reference (Windows/Linux/Mac)",
         "title": "SANS DFIR — Memory Forensics Poster (FOR526 companion)",
         "url": "https://www.sans.org/posters/dfir-memory-forensics",
         "kind": "free-poster"},
        {"coverage": "Curated memory-forensics resource list",
         "title": "digitalisx/awesome-memory-forensics",
         "url": "https://github.com/digitalisx/awesome-memory-forensics",
         "kind": "free-list"},
        {"coverage": "Already on your Bib — heavily overlaps PMF Ch 5 and Ch 7",
         "title": "The Art of Memory Forensics (BOOK-ART-MEM-FORENSICS on this Bib)",
         "url": "#references/BOOK-ART-MEM-FORENSICS",
         "kind": "cross-ref",
         "note": "You already have this book in-app. Its Windows malware chapters and Linux memory-analysis chapters cover nearly all the same ground as Practical Memory Forensics Ch 5 and Ch 7."}
    ],
    "BOOK-CEH": [
        {"coverage": "Ch 7 — System Hacking (priv-esc, credential access, persistence)",
         "title": "MITRE ATT&CK — Privilege Escalation (TA0004)",
         "url": "https://attack.mitre.org/tactics/TA0004/",
         "kind": "free-framework",
         "note": "CEH Ch 7 topics map 1:1 with ATT&CK tactics TA0004 (PrivEsc), TA0006 (Credential Access), TA0003 (Persistence). Every technique has a detection page."},
        {"coverage": "Ch 7 — Pen test + system testing methodology",
         "title": "NIST SP 800-115 — Technical Guide to Information Security Testing and Assessment",
         "url": "https://csrc.nist.gov/pubs/sp/800/115/final",
         "kind": "free-pdf"},
        {"coverage": "Ch 13 — IDS/IPS fundamentals (authoritative NIST guide)",
         "title": "NIST SP 800-94 Rev.1 (Draft) — Guide to Intrusion Detection and Prevention Systems",
         "url": "https://csrc.nist.gov/pubs/sp/800/94/r1/ipd",
         "kind": "free-pdf",
         "note": "Network, host, and wireless IDPS, plus evasion countermeasures. Direct match for CEH Ch 13."},
        {"coverage": "Ch 13 — IDS evasion (open-source IDS docs)",
         "title": "Snort 3 Documentation — Rule Writing and Evasion Considerations",
         "url": "https://docs.snort.org/",
         "kind": "free-docs"},
        {"coverage": "Ch 13 — Modern IDS/IPS",
         "title": "Suricata User Guide",
         "url": "https://docs.suricata.io/en/latest/",
         "kind": "free-docs"},
        {"coverage": "Ch 13 — Honeypot techniques (deception)",
         "title": "The Honeynet Project",
         "url": "https://www.honeynet.org/projects/",
         "kind": "free-project",
         "note": "Open-source honeypot projects + research. Covers T-Pot, Cowrie, Dionaea — the honeypot ecosystem CEH Ch 13 references."},
        {"coverage": "Ch 13 — Firewall fundamentals",
         "title": "NIST SP 800-41 Rev.1 — Guidelines on Firewalls and Firewall Policy",
         "url": "https://csrc.nist.gov/pubs/sp/800/41/r1/final",
         "kind": "free-pdf"},
        {"coverage": "CEH topics — free video prep",
         "title": "Professor Messer — Security Fundamentals (YouTube)",
         "url": "https://www.professormesser.com/",
         "kind": "free-video"}
    ],
}


def main() -> int:
    with open(BIB, encoding="utf-8") as f:
        data = json.load(f)

    added = 0
    for ref in data["references"]:
        rid = ref["id"]
        if rid in ALTS:
            ref["alternatives"] = ALTS[rid]
            added += 1
            print(f"  + {rid:<22}  {len(ALTS[rid])} alternatives")

    with open(BIB, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\nAlternatives added to {added} / {len(ALTS)} books\n")

    all_with_alts = [r for r in data["references"] if r.get("alternatives")]
    print(f"All books with alternatives now ({len(all_with_alts)}):")
    for r in all_with_alts:
        print(f"  - {r['id']:<22} ({len(r['alternatives'])} sources)  {r['title'][:60]}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
