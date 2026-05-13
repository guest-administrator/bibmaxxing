#!/usr/bin/env python3
"""Wire the 3 newly-converted books into bib.json as public-downloaded."""

import json
from pathlib import Path

BIB = Path("data/bibs/CWT-E7/bib.json")
REFS = Path("data/bibs/CWT-E7/references")

WIRED = {
    "BOOK-HACKER-TECH":   "Hacker Techniques, Tools, and Incident Handling, 2nd Edition-9781284031713.pdf",
    "BOOK-ASM-PROG":      "Mastering Assembly Programming-9781787287488.pdf",
    "BOOK-REVERSE-ENG":   "Mastering Reverse Engineering-9781788838849.pdf",
}

with open(BIB, encoding="utf-8") as f:
    data = json.load(f)

wired = 0
for ref in data["references"]:
    rid = ref["id"]
    if rid in WIRED:
        fname = WIRED[rid]
        fp = REFS / fname
        if fp.exists() and fp.stat().st_size > 1024:
            ref["availability"] = "public-downloaded"
            ref["localPath"] = f"references/{fname}"
            ref.pop("note", None)  # clear the "corrupted EPUB" note since it's now fixed
            wired += 1
            print(f"  + {rid:<22}  -> {fname}")
        else:
            print(f"  ! {rid:<22}  file missing at {fp}")

with open(BIB, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")

print(f"\nWired {wired} / {len(WIRED)} books as public-downloaded.")

# Summary
from collections import Counter
c = Counter(r.get("availability") for r in data["references"])
print("\nAvailability totals:")
for k, v in sorted(c.items(), key=lambda x: -x[1]):
    print(f"  {k:<20} {v}")
