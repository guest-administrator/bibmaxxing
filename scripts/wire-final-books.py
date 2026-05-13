#!/usr/bin/env python3
"""Wire the 4 final drops: 3 remaining books + SECNAV M-5510.30 manual.
Renames to clean titles, wires into bib.json, deletes source EPUBs."""

import json
import shutil
from pathlib import Path

BIB = Path("data/bibs/CWT-E7/bib.json")
REFS = Path("data/bibs/CWT-E7/references")

# (Bib ID, current filename, new clean filename, optional note)
WIRE = [
    ("BOOK-CEH",
     "CEHv11.pdf",
     "CEH v11 Certified Ethical Hacker Study Guide (Messier).pdf",
     None),
    ("BOOK-SEC-PLUS-601",
     "ebin.pub_comptia-security-sy0-601-cert-guide-certification-guide-5nbsped-0136770312-9780136770312.pdf",
     "CompTIA Security+ SY0-601 Cert Guide 5th Ed (Santos).pdf",
     None),
    ("BOOK-SEC-PLUS-401",
     "ebin.pub_comptia-security-study-guide-sy0-401-6nbsped-1118875079-9781118875070.pdf",
     "CompTIA Security+ Study Guide SY0-401 6th Ed (Dulaney).pdf",
     None),
    ("SECNAVINST-5510.30C",
     "SECNAV_M-5510x30_2006.pdf",
     "SECNAV-M-5510.30 DON Personnel Security Program Manual.pdf",
     "Local file is the full SECNAV M-5510.30 manual (2006). The manual was officially canceled and subsumed by SECNAVINST 5510.30C (24 Jan 2020); content still defines the DON Personnel Security Program policy framework. Bib's 'Chapter 1' study scope lives in this manual."),
]

EPUBS_TO_DELETE = [
    "CEHv11.epub",
    "ebin.pub_comptia-security-sy0-601-cert-guide-certification-guide-5nbsped-0136770312-9780136770312.epub",
]


def safe_rename(src: Path, dst: Path) -> Path | None:
    if not src.exists():
        return dst if dst.exists() else None
    if dst.exists():
        return dst
    shutil.move(str(src), str(dst))
    return dst


def main() -> int:
    d = json.loads(BIB.read_text(encoding="utf-8"))
    bib_by_id = {r["id"]: r for r in d["references"]}

    wired = 0
    missing = []
    for rid, old, new, note in WIRE:
        src = REFS / old
        dst = REFS / new
        final = safe_rename(src, dst)
        if final is None or not final.exists() or final.stat().st_size < 1024:
            missing.append((rid, old))
            continue
        ref = bib_by_id.get(rid)
        if ref is None:
            print(f"  ? {rid}: no bib entry")
            continue
        ref["availability"] = "public-downloaded"
        ref["localPath"] = f"references/{final.name}"
        if note:
            ref["note"] = note
        wired += 1
        print(f"  + {rid:<22} -> {final.name}")

    # Drop the Chapter 4 extract from bonusFilesOnDisk (we now have the full manual)
    bonus = d.get("bonusFilesOnDisk", [])
    drop_ch4 = "SECNAV M-5510.30 Chapter 4 (verify scope).pdf"
    new_bonus = [b for b in bonus if b.get("file") != drop_ch4]
    if len(new_bonus) != len(bonus):
        d["bonusFilesOnDisk"] = new_bonus
        print(f"  - Removed '{drop_ch4}' from bonusFilesOnDisk (superseded by full manual)")
        # Also delete the file itself
        ch4_file = REFS / drop_ch4
        if ch4_file.exists():
            ch4_file.unlink()
            print(f"    deleted file: {drop_ch4}")

    BIB.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"\nWired: {wired} / {len(WIRE)}")
    if missing:
        for rid, fn in missing:
            print(f"  ! missing on disk: {rid}  (expected {fn})")

    # Delete source EPUBs
    print("\n=== Deleting source EPUBs ===")
    freed = 0
    for name in EPUBS_TO_DELETE:
        f = REFS / name
        if f.exists():
            freed += f.stat().st_size
            f.unlink()
            print(f"  - {name}")
    print(f"  Freed: {freed/1024/1024:.1f} MB")

    # Final stats
    from collections import Counter
    c = Counter(r.get("availability") for r in d["references"])
    print("\n=== Final availability ===")
    for k, v in sorted(c.items(), key=lambda x: -x[1]):
        print(f"  {k:<20} {v}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
