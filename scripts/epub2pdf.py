#!/usr/bin/env python3
"""
epub2pdf.py — EPUB to PDF converter using PyMuPDF.

Requires: pip install PyMuPDF   (already installed on this system as fitz 1.27+)

No browser, no external binaries, no CDN round-trips. PyMuPDF ships with MuPDF,
which renders EPUB natively and exposes convert_to_pdf() for direct PDF output.

Usage:
  python scripts/epub2pdf.py                                # scans data/bibs/*/references/
  python scripts/epub2pdf.py data/bibs/CWT-E7/references    # specific dir
  python scripts/epub2pdf.py path/to/book.epub              # one file
  python scripts/epub2pdf.py --force                        # reconvert even if .pdf exists
  python scripts/epub2pdf.py --audit                        # report usable vs broken, no conversion
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF not installed. Run:  pip install PyMuPDF", file=sys.stderr)
    sys.exit(2)


def quiet_mupdf() -> None:
    """Silence MuPDF CSS / rendering warnings that flood stderr."""
    for attr, args in [("set_quiet", (True,)), ("mupdf_display_errors", (False,))]:
        fn = getattr(fitz.TOOLS, attr, None)
        if callable(fn):
            try:
                fn(*args)
            except Exception:
                pass


def resolve_targets(inputs: list[str]) -> list[Path]:
    targets: list[Path] = []
    if not inputs:
        root = Path("data") / "bibs"
        if root.exists():
            for refdir in root.glob("*/references"):
                targets.extend(sorted(refdir.glob("*.epub")))
    else:
        for arg in inputs:
            p = Path(arg)
            if p.is_dir():
                targets.extend(sorted(p.glob("*.epub")))
            elif p.suffix.lower() == ".epub":
                targets.append(p)
            else:
                print(f"skipping (not epub or dir): {p}", file=sys.stderr)
    return targets


def audit_one(epub: Path) -> tuple[str, str]:
    try:
        doc = fitz.open(str(epub))
        n = doc.page_count
        doc.close()
        if n == 0:
            return ("BAD", "0 pages — empty spine (corrupted O'Reilly export)")
        return ("OK", f"{n} pages")
    except Exception as e:
        return ("BAD", f"{type(e).__name__}: {str(e)[:80]}")


def convert_one(epub: Path, pdf: Path) -> tuple[int, float]:
    t0 = time.time()
    doc = fitz.open(str(epub))
    n = doc.page_count
    if n == 0:
        doc.close()
        raise RuntimeError("EPUB has 0 pages (empty spine — re-download from O'Reilly)")
    try:
        pdf_bytes = doc.convert_to_pdf()
    finally:
        doc.close()
    pdf.write_bytes(pdf_bytes)
    return n, time.time() - t0


def run_audit(targets: list[Path]) -> int:
    print(f"Auditing {len(targets)} EPUB(s):\n")
    good, bad = [], []
    for ep in targets:
        status, detail = audit_one(ep)
        size_mb = ep.stat().st_size / (1024 * 1024)
        line = f"  {status:<4} {size_mb:>6.1f} MB  {ep.name[:80]}"
        if status == "OK":
            good.append((ep, detail))
            print(f"{line}  [{detail}]")
        else:
            bad.append((ep, detail))
            print(f"{line}")
            print(f"         -> {detail}")
    print(f"\nSummary: {len(good)} usable, {len(bad)} broken")
    if bad:
        print("\nBroken EPUBs (need re-download from O'Reilly):")
        for ep, why in bad:
            print(f"  - {ep.name}")
            print(f"      {why}")
    return 0


def run_convert(targets: list[Path], force: bool) -> int:
    print(f"Converting {len(targets)} EPUB(s) with PyMuPDF\n")
    ok, skip, fail = 0, 0, 0
    results: list[tuple[Path, str, str]] = []
    total_t0 = time.time()
    for i, ep in enumerate(targets, 1):
        pdf = ep.with_suffix(".pdf")
        size_mb = ep.stat().st_size / (1024 * 1024)
        print(f"[{i}/{len(targets)}] {ep.name}  ({size_mb:.1f} MB)")
        if pdf.exists() and pdf.stat().st_size > 1024 and not force:
            print(f"    SKIP  {pdf.name} already exists (use --force to overwrite)")
            skip += 1
            results.append((ep, "SKIP", pdf.name))
            continue
        try:
            pages, dt = convert_one(ep, pdf)
        except Exception as e:
            if pdf.exists() and pdf.stat().st_size < 1024:
                pdf.unlink(missing_ok=True)
            print(f"    FAIL  {e}")
            fail += 1
            results.append((ep, "FAIL", str(e)[:120]))
            continue
        out_mb = pdf.stat().st_size / (1024 * 1024)
        print(f"    OK    {pages} pages -> {pdf.name}  ({out_mb:.1f} MB, {dt:.1f}s)")
        ok += 1
        results.append((ep, "OK", f"{pages} pages, {out_mb:.1f} MB"))
    total_dt = time.time() - total_t0
    print()
    print("===== Summary =====")
    print(f"  OK:      {ok}")
    print(f"  Skipped: {skip}")
    print(f"  Failed:  {fail}")
    print(f"  Elapsed: {total_dt/60:.1f} min")
    if fail:
        print("\nFailed items (most often a corrupted O'Reilly export — re-download from your O'Reilly library):")
        for ep, status, msg in results:
            if status == "FAIL":
                print(f"  - {ep.name}")
                print(f"      {msg}")
    return 0 if fail == 0 else 1


def main() -> int:
    ap = argparse.ArgumentParser(description="Convert EPUB(s) to PDF via PyMuPDF.")
    ap.add_argument("inputs", nargs="*",
                    help="EPUB file(s) or dir(s). Default: every data/bibs/*/references/ folder.")
    ap.add_argument("--force", action="store_true",
                    help="Re-convert even if a .pdf already exists.")
    ap.add_argument("--audit", action="store_true",
                    help="Report which EPUBs are usable without converting.")
    args = ap.parse_args()

    quiet_mupdf()

    targets = resolve_targets(args.inputs)
    if not targets:
        print("No EPUB files found.")
        return 0

    if args.audit:
        return run_audit(targets)
    return run_convert(targets, args.force)


if __name__ == "__main__":
    sys.exit(main())
