#!/usr/bin/env bash
# =============================================================================
#  convert-epubs.sh — Batch-convert every .epub in a Bib's references/ folder
#  to PDF using Calibre's ebook-convert. Idempotent (skips existing PDFs).
#
#  Usage:
#    scripts/convert-epubs.sh
#    scripts/convert-epubs.sh CWT-E7     # explicit Bib ID
#
#  Requires Calibre installed. Download:  https://calibre-ebook.com/download_windows
# =============================================================================

set -u

BIB_ID="${1:-CWT-E7}"
REF_DIR="data/bibs/${BIB_ID}/references"

# --- Locate ebook-convert ---------------------------------------------------
CONVERT=""
if command -v ebook-convert >/dev/null 2>&1; then
  CONVERT="ebook-convert"
elif [ -x "/c/Program Files/Calibre2/ebook-convert.exe" ]; then
  CONVERT="/c/Program Files/Calibre2/ebook-convert.exe"
elif [ -x "/c/Program Files (x86)/Calibre2/ebook-convert.exe" ]; then
  CONVERT="/c/Program Files (x86)/Calibre2/ebook-convert.exe"
else
  echo "ERROR: Calibre not found."
  echo "Install from: https://calibre-ebook.com/download_windows"
  echo "Then re-run:  scripts/convert-epubs.sh"
  exit 1
fi

echo "Using: $CONVERT"
echo "Bib:   $BIB_ID"
echo "Dir:   $REF_DIR"
echo ""

if [ ! -d "$REF_DIR" ]; then
  echo "ERROR: $REF_DIR does not exist. Run from project root."
  exit 1
fi

cd "$REF_DIR"

count_epub=$(ls *.epub 2>/dev/null | wc -l)
if [ "$count_epub" -eq 0 ]; then
  echo "No .epub files to convert."
  exit 0
fi

echo "Found $count_epub EPUBs. Starting batch conversion..."
echo "(This may take 30-60 min for large books. Calibre logs go to /tmp/convert-*.log)"
echo ""

ok=0
skip=0
fail=0
failures=()

for epub in *.epub; do
  pdf="${epub%.epub}.pdf"
  if [ -f "$pdf" ] && [ -s "$pdf" ]; then
    echo "SKIP  $pdf (already exists)"
    skip=$((skip + 1))
    continue
  fi

  size_mb=$(du -m "$epub" | cut -f1)
  echo ""
  echo "[$((ok + fail + 1))/$count_epub]  Converting: $epub  (${size_mb} MB)"
  log="/tmp/convert-$(echo "$epub" | tr ' /' '__').log"

  if "$CONVERT" "$epub" "$pdf" \
       --paper-size letter \
       --pdf-page-numbers \
       --pdf-default-font-size 11 \
       --pretty-print \
       >"$log" 2>&1; then
    out_size=$(du -h "$pdf" | cut -f1)
    echo "    OK   -> $pdf  ($out_size)"
    ok=$((ok + 1))
  else
    echo "    FAIL -> see $log"
    failures+=("$epub")
    fail=$((fail + 1))
    # Remove partial output if created
    [ -f "$pdf" ] && [ ! -s "$pdf" ] && rm -f "$pdf"
  fi
done

echo ""
echo "===== Summary ====="
echo "  Converted: $ok"
echo "  Skipped:   $skip (already had .pdf)"
echo "  Failed:    $fail"
if [ "$fail" -gt 0 ]; then
  echo ""
  echo "  Failed files:"
  for f in "${failures[@]}"; do echo "    - $f"; done
  echo ""
  echo "  Check logs in /tmp/convert-*.log for details."
fi
echo ""
echo "Original .epub files are preserved. Delete them manually if you want to save disk:"
echo "  rm \"$REF_DIR\"/*.epub"
