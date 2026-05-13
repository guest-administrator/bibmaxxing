#!/usr/bin/env python3
"""Wire orphan PDFs into bib.json, rename to clean titles, delete EPUBs."""

import json
import shutil
from pathlib import Path

BIB = Path("data/bibs/CWT-E7/bib.json")
REFS = Path("data/bibs/CWT-E7/references")

# (Bib ID, current filename on disk, new clean filename)
# New filenames use: "<BIB-ID> <Short Title>.pdf"
WIRE = [
    ("CJCSI-6510.01F",    "cjcsi6510_01.pdf",
        "CJCSI-6510.01F Information Assurance and CND.pdf"),
    ("CJCSM-6510.01B",    "CJCSM 6510.01B.pdf",
        "CJCSM-6510.01B Cyber Incident Handling Program.pdf"),
    ("DODM-5105.21-V1",   "510521m_vol1.pdf",
        "DODM-5105.21 Vol 1 SCI Administrative Security Manual.pdf"),
    ("JP-2-01",           "jp2_01.pdf",
        "JP-2-01 Joint and National Intelligence Support.pdf"),
    ("JP-3-0",            "jp3_0.pdf",
        "JP-3-0 Joint Campaigns and Operations.pdf"),
    ("JP-3-09",           "jp3_09.pdf",
        "JP-3-09 Joint Fire Support.pdf"),
    ("JP-3-12",           "jp3_12.pdf",
        "JP-3-12 Joint Cyberspace Operations.pdf"),
    ("JP-3-13",           "jp3_13.pdf",
        "JP-3-13 Information Operations.pdf"),
    ("JP-3-25",           "jp3_25.pdf",
        "JP-3-25 Countering Threat Networks.pdf"),
    ("JP-3-60",           "jp3_60.pdf",
        "JP-3-60 Joint Targeting.pdf"),
    ("JP-5-0",            "jp5_0.pdf",
        "JP-5-0 Joint Planning.pdf"),
    ("USSID-18",          "USSID18.pdf",
        "USSID-18 Protection of US Person Information (redacted).pdf"),
    ("SECNAVINST-5510.36B", "5510.36.pdf",
        "SECNAV M-5510.36 DON Information Security Program Manual.pdf"),
]

# Notes to attach on wire
NOTES = {
    "SECNAVINST-5510.36B":
      "Local file is the 300+ page SECNAV M-5510.36 MANUAL (the document with Chapter 2). "
      "SECNAVINST 5510.36B is the short instruction that references this manual.",
    "USSID-18":
      "Local file is the NSA-released redacted public version. Section 4 (the Bib's study scope) "
      "is substantively intact. Full classified version is accessible only through official channels.",
}

# Bonus PDFs: (current filename, new clean filename, note)
BONUS_RENAMES = [
    ("3-12-AFDP-CYBERSPACE-OPS.pdf",
     "AFDP-3-12 Air Force Cyberspace Operations.pdf",
     "Air Force Doctrine Publication 3-12 — parallel to JP 3-12, public. Adjacent material for JP-3-12 and NWP-3-12."),
    ("doctrine_nato_cyberspace_operations_ajp_3_20_1_.pdf",
     "NATO AJP-3.20 Allied Joint Cyberspace Operations.pdf",
     "NATO Allied Joint Doctrine for Cyberspace Operations. Adjacent for JP-3-12 and NWP-3-12."),
    ("STRATEGIC_CYBERSPACE_OPERATIONS_GUIDE.pdf",
     "Army War College Strategic Cyberspace Operations Guide.pdf",
     "Army War College strategic-level summary. Adjacent for JP-3-12 and NWP-3-12."),
    ("SECNAV M-5510.30 - CHAPTER 4.pdf",
     "SECNAV M-5510.30 Chapter 4 (verify scope).pdf",
     "Chapter 4 extract of SECNAV M-5510.30 manual. NOTE: Bib scope for SECNAVINST-5510.30C is Chapter 1, not Chapter 4 — verify correct chapter was extracted."),
    ("2312asda4fdgvsd-epkrui.pdf",
     "CompTIA Security+ SY0-601 Practice Tests (Wilson).pdf",
     "Not on the Bib (Bib wants the Santos Cert Guide). Useful adjacent drill material for SY0-601 topics."),
]

# Clean up one messy book filename
BOOK_RENAMES = [
    ("cissp__isc_2_cissp_official_study_guide_7th_edition_2.pdf",
     "CISSP (ISC)2 Official Study Guide 7th Edition.pdf"),
]


def safe_rename(src: Path, dst: Path) -> Path:
    """Rename src -> dst. If dst already exists, leave src alone and return dst."""
    if not src.exists():
        return dst if dst.exists() else None
    if dst.exists():
        # Already renamed in a prior run
        return dst
    shutil.move(str(src), str(dst))
    return dst


def main() -> int:
    d = json.loads(BIB.read_text(encoding="utf-8"))

    print("=== Renaming + wiring direct Bib matches ===")
    wired = 0
    missing = []
    bib_by_id = {r["id"]: r for r in d["references"]}

    for rid, old, new in WIRE:
        src = REFS / old
        dst = REFS / new
        final = safe_rename(src, dst)
        if final is None or not final.exists() or final.stat().st_size < 1024:
            missing.append((rid, old))
            continue
        ref = bib_by_id.get(rid)
        if ref is None:
            print(f"  ? {rid}: no bib entry found; file renamed but not wired")
            continue
        ref["availability"] = "public-downloaded"
        ref["localPath"] = f"references/{final.name}"
        if rid in NOTES:
            ref["note"] = NOTES[rid]
        wired += 1
        print(f"  + {rid:<22} -> {final.name}")

    # Fix existing BOOK-CISSP localPath if we renamed the file
    print("\n=== Cleaning up book filenames ===")
    for old, new in BOOK_RENAMES:
        src = REFS / old
        dst = REFS / new
        final = safe_rename(src, dst)
        if final is None:
            continue
        print(f"  + {old}  ->  {new}")
        # Update any bib entry pointing at the old path
        for ref in d["references"]:
            lp = ref.get("localPath", "")
            if Path(lp).name == old:
                ref["localPath"] = f"references/{new}"
                print(f"    updated {ref['id']}.localPath")

    # Bonus files rename (these aren't Bib entries; just note them)
    print("\n=== Renaming bonus / adjacent files ===")
    bonus_present = []
    for old, new, note in BONUS_RENAMES:
        src = REFS / old
        dst = REFS / new
        final = safe_rename(src, dst)
        if final is None or not final.exists():
            continue
        print(f"  + {old}  ->  {new}")
        bonus_present.append({"file": new, "note": note})
    if bonus_present:
        d["bonusFilesOnDisk"] = bonus_present

    BIB.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nWired: {wired} / {len(WIRE)}")
    if missing:
        print(f"Missing on disk ({len(missing)}):")
        for rid, fn in missing:
            print(f"  - {rid}  (expected {fn})")

    # Delete EPUBs
    print("\n=== Deleting EPUBs ===")
    epubs = sorted(REFS.glob("*.epub"))
    total_bytes = sum(e.stat().st_size for e in epubs)
    for e in epubs:
        e.unlink()
    print(f"Freed: {total_bytes/1024/1024:.1f} MB across {len(epubs)} EPUBs")

    # Final summary
    from collections import Counter
    c = Counter(r.get("availability") for r in d["references"])
    print("\n=== Final availability breakdown ===")
    for k, v in sorted(c.items(), key=lambda x: -x[1]):
        print(f"  {k:<20} {v}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
