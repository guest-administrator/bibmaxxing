#!/usr/bin/env python3
"""Wire the 3 newly-public FOIA'd refs + 1 adjacent (NWP 3-13)."""

import json
import shutil
from pathlib import Path

BIB = Path("data/bibs/CWT-E7/bib.json")
REFS = Path("data/bibs/CWT-E7/references")

WIRE = [
    ("CJCSI-3121.01B",
     "CJCSI 3121.01B.pdf",
     "CJCSI-3121.01B SROE SRUF.pdf",
     "Local file is the FOIA-released public version (DoD 20-F-1436). Some original portions remain redacted; unclassified enclosures are substantively intact and cover the SROE/SRUF framework."),
    ("CJCSI-3370.01B",
     "cjcsi3370_01.pdf",
     "CJCSI-3370.01 Target Development Standards.pdf",
     "FAS mirror copy. Revision may differ from the Bib's 'B' (current is C, Aug 2018); framework and standards are consistent across revisions."),
    ("DJSIG",
     "DoD-JDCSISSS.pdf",
     "DJSIG JDCSISSS DoD Joint Security Implementation Guide.pdf",
     "Marked U//FOUO (unclassified, for-official-use). Public Intelligence and FAS both archive public copies."),
]

# NWP 3-13 isn't its own Bib entry — it's adjacent material for NTTP-3-13.1/.2.
# Keep it in references/ with a clean name; already referenced via alternatives URLs.
ADJACENT_RENAMES = [
    ("NWP 3-13_Information Operations_FEB2014.pdf",
     "NWP-3-13 Navy Information Operations (Feb 2014).pdf",
     "Public parent doctrine for the restricted NTTP-3-13.1 and NTTP-3-13.2. Covers most IO framework content."),
]


def safe_rename(src, dst):
    if not src.exists():
        return dst if dst.exists() else None
    if dst.exists():
        return dst
    shutil.move(str(src), str(dst))
    return dst


def main():
    d = json.loads(BIB.read_text(encoding="utf-8"))
    bib_by_id = {r["id"]: r for r in d["references"]}

    wired = 0
    for rid, old, new, note in WIRE:
        src, dst = REFS / old, REFS / new
        final = safe_rename(src, dst)
        if not final or not final.exists() or final.stat().st_size < 1024:
            print(f"  ! {rid}: missing {old}")
            continue
        ref = bib_by_id.get(rid)
        if ref:
            ref["availability"] = "public-downloaded"
            ref["localPath"] = f"references/{final.name}"
            if note:
                ref["note"] = note
            wired += 1
            print(f"  + {rid:<22} -> {final.name}")

    # Rename adjacent and register in bonusFilesOnDisk
    bonus = d.get("bonusFilesOnDisk", [])
    for old, new, note in ADJACENT_RENAMES:
        src, dst = REFS / old, REFS / new
        final = safe_rename(src, dst)
        if final and final.exists():
            entry = {"file": final.name, "note": note}
            # De-dupe by filename
            bonus = [b for b in bonus if b.get("file") != final.name]
            bonus.append(entry)
            print(f"  + adjacent: {final.name}")
    d["bonusFilesOnDisk"] = bonus

    BIB.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    from collections import Counter
    c = Counter(r.get("availability") for r in d["references"])
    print("\nAvailability:")
    for k, v in sorted(c.items(), key=lambda x: -x[1]):
        print(f"  {k:<20} {v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
