#!/usr/bin/env python3
"""
salvage-epub.py — Reconstruct a missing or broken OPF manifest from an EPUB's
intact NCX, then feed the repaired EPUB through PyMuPDF.

Use case: O'Reilly EPUB exports that land with a 0-byte content.opf but
intact toc.ncx and chapter xhtml files.

Usage:
  python scripts/salvage-epub.py path/to/book.epub               # one file
  python scripts/salvage-epub.py path/to/book.epub --out out.pdf # explicit output
"""

from __future__ import annotations

import argparse
import mimetypes
import shutil
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from uuid import uuid4

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF not installed. pip install PyMuPDF", file=sys.stderr)
    sys.exit(2)


NCX_NS = {"ncx": "http://www.daisy.org/z3986/2005/ncx/"}
CN_NS  = {"cn":  "urn:oasis:names:tc:opendocument:xmlns:container"}

# Minimum sane size for a nav file. Smaller = CDN Access Denied stub.
MIN_NAV_SIZE = 1024


def quiet_mupdf() -> None:
    for attr in ("mupdf_display_errors",):
        fn = getattr(fitz.TOOLS, attr, None)
        if callable(fn):
            try:
                fn(False)
            except Exception:
                pass


def find_opf_path(work: Path) -> Path:
    """Return the canonical OPF path from container.xml, whether or not the file is intact."""
    container = work / "META-INF" / "container.xml"
    if not container.exists():
        raise RuntimeError("no META-INF/container.xml")
    tree = ET.parse(container)
    rf = tree.find(".//cn:rootfile", CN_NS)
    if rf is None or not rf.get("full-path"):
        raise RuntimeError("container.xml has no rootfile")
    return work / rf.get("full-path")


def read_ncx_order(work: Path, opf_dir: Path) -> list[Path]:
    """Return ordered list of chapter xhtml files by walking the NCX navMap."""
    ncx = None
    for candidate in work.rglob("*.ncx"):
        if candidate.stat().st_size >= MIN_NAV_SIZE:
            ncx = candidate
            break
    if ncx is None:
        raise RuntimeError("no usable NCX found")

    tree = ET.parse(ncx)
    base = ncx.parent
    order: list[Path] = []
    seen: set[Path] = set()
    for np in tree.findall(".//ncx:navPoint", NCX_NS):
        content = np.find("ncx:content", NCX_NS)
        if content is None:
            continue
        src = content.get("src", "").split("#", 1)[0]
        if not src:
            continue
        target = (base / src).resolve()
        if target.exists() and target not in seen:
            order.append(target)
            seen.add(target)
    return order


def enumerate_manifest_items(work: Path, opf_dir: Path) -> list[tuple[str, Path, str]]:
    """Return (id, absolute-path, media-type) for every resource in the EPUB
    (xhtml, css, images, fonts, svg). IDs are stable and unique."""
    mimetypes.add_type("application/xhtml+xml", ".xhtml")
    mimetypes.add_type("text/css", ".css")
    out: list[tuple[str, Path, str]] = []
    used_ids: set[str] = set()

    def make_id(stem: str) -> str:
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in stem)
        base = "id_" + safe
        candidate = base
        i = 2
        while candidate in used_ids:
            candidate = f"{base}_{i}"
            i += 1
        used_ids.add(candidate)
        return candidate

    for f in sorted(work.rglob("*")):
        if not f.is_file():
            continue
        rel = f.relative_to(opf_dir) if opf_dir in f.parents or f == opf_dir else None
        if rel is None:
            continue
        name = str(rel).replace("\\", "/")
        if name.lower() in ("content.opf",) or name.startswith("META-INF/"):
            continue
        ext = f.suffix.lower()
        if ext in (".opf",):
            continue
        mt, _ = mimetypes.guess_type(f.name)
        if mt is None:
            if ext == ".xhtml":    mt = "application/xhtml+xml"
            elif ext == ".html":   mt = "text/html"
            elif ext == ".ncx":    mt = "application/x-dtbncx+xml"
            elif ext == ".css":    mt = "text/css"
            elif ext == ".svg":    mt = "image/svg+xml"
            elif ext in (".ttf", ".otf"):  mt = "application/x-font-ttf"
            else: mt = "application/octet-stream"
        out.append((make_id(f.stem), f, mt))
    return out


def build_synthetic_opf(
    out_path: Path,
    opf_dir: Path,
    manifest: list[tuple[str, Path, str]],
    spine_paths: list[Path],
    title: str,
) -> None:
    """Generate an OPF 2.0 package file pointing at the (intact) manifest
    resources with a spine ordered by the NCX."""
    path_to_id = {fp.resolve(): iid for iid, fp, _ in manifest}
    ncx_id = None
    for iid, fp, mt in manifest:
        if mt == "application/x-dtbncx+xml":
            ncx_id = iid
            break

    book_uid = f"urn:uuid:{uuid4()}"
    ns = {
        "xmlns": "http://www.idpf.org/2007/opf",
        "unique-identifier": "bookid",
        "version": "2.0",
    }

    lines: list[str] = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    attrs = " ".join(f'{k}="{v}"' for k, v in ns.items())
    lines.append(f"<package {attrs}>")

    # metadata
    lines.append('  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">')
    safe_title = (title or "Untitled").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    lines.append(f'    <dc:title>{safe_title}</dc:title>')
    lines.append('    <dc:language>en</dc:language>')
    lines.append(f'    <dc:identifier id="bookid" opf:scheme="UUID">{book_uid}</dc:identifier>')
    lines.append('  </metadata>')

    # manifest
    lines.append('  <manifest>')
    for iid, fp, mt in manifest:
        rel = fp.relative_to(opf_dir).as_posix()
        lines.append(f'    <item id="{iid}" href="{rel}" media-type="{mt}"/>')
    lines.append('  </manifest>')

    # spine
    spine_attr = f' toc="{ncx_id}"' if ncx_id else ""
    lines.append(f'  <spine{spine_attr}>')
    for sp in spine_paths:
        iid = path_to_id.get(sp.resolve())
        if iid:
            lines.append(f'    <itemref idref="{iid}"/>')
    lines.append('  </spine>')

    lines.append("</package>")
    out_path.write_text("\n".join(lines), encoding="utf-8")


def rebuild_epub_zip(work: Path, original: Path) -> Path:
    """Re-zip the repaired EPUB with mimetype stored first and uncompressed,
    per EPUB spec."""
    patched = original.with_name(original.stem + "_SALVAGED.epub")
    # Collect files, excluding any leftover debris; EPUB requires "mimetype"
    # to be the FIRST entry and stored (not deflated).
    mimetype_file = work / "mimetype"
    if not mimetype_file.exists():
        mimetype_file.write_text("application/epub+zip", encoding="ascii")
    with zipfile.ZipFile(patched, "w") as zo:
        zo.write(mimetype_file, "mimetype", compress_type=zipfile.ZIP_STORED)
        for f in sorted(work.rglob("*")):
            if not f.is_file():
                continue
            if f == mimetype_file:
                continue
            arcname = str(f.relative_to(work)).replace("\\", "/")
            zo.write(f, arcname, compress_type=zipfile.ZIP_DEFLATED)
    return patched


def salvage(epub_path: Path, pdf_out: Path | None = None, keep_patched: bool = False) -> Path:
    if pdf_out is None:
        pdf_out = epub_path.with_suffix(".pdf")

    print(f"Salvaging: {epub_path.name}")
    with tempfile.TemporaryDirectory(prefix="salvage_", ignore_cleanup_errors=True) as tmp:
        work = Path(tmp)
        with zipfile.ZipFile(epub_path) as z:
            z.extractall(work)

        opf_path = find_opf_path(work)
        opf_dir = opf_path.parent
        print(f"  OPF location: {opf_path.relative_to(work)}")
        print(f"  OPF size: {opf_path.stat().st_size} bytes  (broken = needs rebuild)")

        spine_chaps = read_ncx_order(work, opf_dir)
        print(f"  NCX spine order: {len(spine_chaps)} chapters")

        manifest = enumerate_manifest_items(work, opf_dir)
        print(f"  Manifest items: {len(manifest)} resources")

        # Title guess: stem of the EPUB filename
        title = epub_path.stem.split("-")[0].strip() or epub_path.stem

        build_synthetic_opf(opf_path, opf_dir, manifest, spine_chaps, title)
        print(f"  Wrote synthetic OPF: {opf_path.stat().st_size} bytes")

        patched_epub = rebuild_epub_zip(work, epub_path)
        print(f"  Repacked EPUB: {patched_epub.name}  ({patched_epub.stat().st_size/1024/1024:.1f} MB)")

        # Convert via PyMuPDF
        doc = fitz.open(str(patched_epub))
        pages = doc.page_count
        if pages == 0:
            doc.close()
            raise RuntimeError("salvage rebuilt the OPF but PyMuPDF still reports 0 pages")
        print(f"  PyMuPDF sees: {pages} pages — converting to PDF")
        pdf_bytes = doc.convert_to_pdf()
        doc.close()
        pdf_out.write_bytes(pdf_bytes)
        out_mb = pdf_out.stat().st_size / 1024 / 1024
        print(f"  Wrote PDF: {pdf_out.name}  ({out_mb:.1f} MB)")

        if not keep_patched:
            patched_epub.unlink(missing_ok=True)
    return pdf_out


def main() -> int:
    ap = argparse.ArgumentParser(description="Salvage an EPUB with a broken OPF by rebuilding from the intact NCX.")
    ap.add_argument("epub", help="Path to the broken .epub file")
    ap.add_argument("--out", help="Output .pdf path (default: alongside the epub)")
    ap.add_argument("--keep-patched", action="store_true", help="Keep the _SALVAGED.epub after conversion")
    args = ap.parse_args()

    quiet_mupdf()
    epub = Path(args.epub)
    if not epub.exists():
        print(f"ERROR: {epub} not found", file=sys.stderr)
        return 2
    try:
        out = salvage(epub, Path(args.out) if args.out else None, args.keep_patched)
        print(f"\nOK -> {out}")
        return 0
    except Exception as e:
        print(f"FAILED: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
