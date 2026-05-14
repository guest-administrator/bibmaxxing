# Bibmaxxing Public Usability and Exportability Audit

Date: 2026-05-13

## Bottom Line

Bibmaxxing is already a capable local-first CWT advancement trainer. The web app is the stronger public-ready surface today; the Python fork is promising as a packaged desktop app but is not ready to be the general-user distribution path yet.

Primary goal should be: make the web app easy to run, hard to break, legible to a new Sailor, and cleanly portable as a static package plus optional data packs. The Python app can follow as a packaged daily-driver once its sync, Bib selection, and build story are corrected.

## Verified State

- Web app JavaScript syntax passes `node --check` for all `.js` files.
- This checkout is not a Git repository, so no branch/diff metadata is available.
- Node is available at `C:\Program Files\nodejs\node.exe`.
- `python`, `py`, `pip`, and `pyinstaller` are not on PATH in this shell.
- No `package.json` exists.
- No `bibmaxxing-py/dist/bibmaxxing.exe` exists.
- Installed Bib registry contains one Bib: `CWT-E7`, Cycle 270 / January 2026.
- Corpus counts from disk:
  - 68 Bib references
  - 461 question rows
  - 458 unique question IDs
  - 67 study-guide Markdown files
  - 114 study-guide images
  - 49 PDF files, about 919 MB

## P0 Blockers

1. Duplicate question IDs
   - `cwt-e7-ipv6-001`
   - `cwt-e7-icmp-001`
   - `cwt-e7-snmp-001`
   - Impact: web IndexedDB seeding can overwrite duplicate IDs; Python SRS progress collides across duplicate cards.

2. Invalid reference tag
   - `BOOK-ART-OF-MEM` appears in two question `refs` arrays.
   - Likely intended canonical ref: `BOOK-ART-MEM-FORENSICS`.

3. Python/web sync mismatch
   - Web backup shape: `{schemaVersion, exportedAt, stores}`.
   - Python sync shape: `{version, exportedAt, bibs: {<id>: {srs}}}`.
   - Impact: advertised web/Python import-export bridge will not round-trip current backups.

4. Python reference browser is not canonical
   - `bibmaxxing-py/src/bibmaxxing/views/references.py` reads `MANIFEST.json` summary buckets instead of full `bib.json.references`.
   - Impact: desktop app can show an incomplete reference list.

5. Distribution/legal hygiene is unresolved
   - README says no paywalled commercial study guides should ship.
   - Current reference folder contains many commercial book PDFs.
   - Action: split public app, public/government references, and user-supplied licensed references into separate packages or clearly marked data packs.

## P1 Product Direction

Recommended design direction: industrial/utilitarian training cockpit.

This should feel like an operational study console, not a marketing site. Dense but readable. High-contrast, keyboard-friendly, calm under pressure. The first screen should remain the usable dashboard, not a landing page.

Design principles:

- Make the next useful action obvious: review due, continue exam, drill weak areas, read source.
- Treat the Bib as the organizing object: every card should trace to a reference and every reference should show coverage.
- Separate learning modes clearly: Study, Drill, Quiz, Exam, Library, Manage.
- Make public-user setup boring: open, run, import/export, recover.
- Preserve local-only posture: no accounts, no cloud, no telemetry.

## P1 UI Reform

1. Rework top navigation into clearer mode groups
   - Current: flat nav list across the top.
   - Proposed: grouped navigation with Study/Drill/Exam/Library/Manage or a responsive left rail on desktop and bottom/tab bar on small screens.

2. Improve dashboard as a "today" command center
   - Add "Today" panel: due cards, new cards, weak refs, current exam/quiz resume.
   - Add coverage panel: refs with cards, refs without cards, guide readiness, restricted/source-needed status.
   - Add readiness panel: last exam score, trend, weak topics, mastered count.

3. Make onboarding public-user safe
   - Empty-state should offer a sample/deck check and clear "Run locally" instructions.
   - Settings should distinguish "Install Bib", "Backup progress", and "Export portable package".
   - Add a first-run checklist if no progress exists.

4. Improve reference/library workflows
   - Reference browser should be the canonical Bib coverage map.
   - Add filters for "has guide", "has cards", "needs source", "restricted", "downloaded".
   - Add search across title, ID, topics, and study scope.
   - From a guide, keep persistent actions: flashcards on this ref, quiz on this ref, back to reference.

5. Improve exam mode clarity
   - Setup should show selected length, time, pacing, and what is locked.
   - During exam, provide clear keyboard hints, flag legend, answered/unanswered counts, and final submit confirmation.
   - Results should show missed refs/topics and one-click remediation: "Drill missed refs".

6. Improve flashcard/quiz ergonomics
   - Show the active filter subject persistently.
   - Add visible keyboard help where it matters.
   - Allow "drill this source" from missed questions and guide sections.
   - Make SRS rating meaning clearer: Again, Hard, Good, Easy with next interval.

## P1 UX and Accessibility

1. Add global focus-visible styling for all buttons, links, inputs, selects, textareas, and custom clickable rows.
2. Ensure all touch targets are at least 44x44 px on mobile.
3. Add reduced-motion support for transitions and smooth scrolling.
4. Improve mobile navigation; current sticky top nav will get crowded with Bib selector plus seven nav links.
5. Add ARIA labels/states for the Bib dropdown, toast, modal-ish resume prompts, exam grid, and selected toggle groups.
6. Replace symbol-only or garbled glyph text where encoding has drifted.
7. Ensure color is not the only status indicator for exam grid, badges, and selected filters.
8. Add resilient long-text handling for reference titles, card choices, and guide TOC items.

## P1 Exportability / Portability

1. Add a `package.json`
   - `npm run serve`: local static server with no remote `npx serve` dependency.
   - `npm run audit:data`: validates Bib/question/reference schema.
   - `npm run test:srs`: runs SRS logic tests outside the browser where possible.
   - `npm run package:web`: creates a portable ZIP.

2. Replace `serve.bat` dependency chain
   - Current fallback can invoke `npx --yes serve`, which may need network.
   - Add a small checked-in Node static server script or document Python/Node alternatives clearly.

3. Define package types
   - App-only ZIP: source app, no large PDFs.
   - Public Bib data pack: `bib.json`, `questions.json`, study guides, public/government sources.
   - User-supplied licensed reference pack: local-only, not redistributed.

4. Add a package manifest
   - Include app version, Bib cycle, generated date, included references, excluded restricted references, file counts, and checksum list.

5. Improve backup semantics
   - "Export backup" should clearly mean progress/notes/user questions.
   - "Export portable package" should mean app/content bundle.
   - Validate import schema before merging into IndexedDB.

## P1 Data and Content Fixes

1. Fix duplicate question IDs and add an audit test to prevent recurrence.
2. Fix `BOOK-ART-OF-MEM` ref typo and add a ref-integrity test.
3. Reconcile `README.md`, `MANIFEST.json`, and actual file counts.
4. Make `bib.json` the single canonical source for references.
5. Add coverage report:
   - refs with cards
   - refs without cards
   - refs with guides
   - guides without cards
   - restricted placeholders
6. Add cycle freshness warning:
   - Current installed Bib is Cycle 270 / January 2026.
   - For future tests, user should install the current official Bib data pack.

## P2 Python Fork Fixes

1. Add `--bib <id>` CLI option and UI Bib selector; remove hard-coded `CWT-E7` assumptions.
2. Change Add Question to write user-authored cards to SQLite, not canonical `questions.json`.
3. Replace `cwt-e7-user-{seconds}` IDs with Bib-aware collision-resistant IDs.
4. Make `ReferencesView` read `bib.json.references`.
5. Implement importer/exporter for the actual web backup schema.
6. Add a tested packaging path:
   - documented Python install
   - lock file or pinned dependency set
   - generated `.exe`
   - smoke test for launch, data load, export/import

## P2 Testing Plan

1. Data integrity tests
   - unique IDs
   - valid answers
   - refs/sourceRef exist in `bib.json`
   - study-guide link targets exist
   - no stale manifest counts

2. Web smoke tests
   - startup loads active Bib
   - dashboard renders
   - flashcard review persists progress
   - quiz resume/discard works
   - exam resume/submit works
   - backup export/import round-trips

3. Accessibility checks
   - keyboard-only navigation
   - visible focus order
   - contrast
   - reduced motion
   - responsive nav at mobile widths

4. Packaging checks
   - app-only package opens offline
   - data pack install is detected
   - backup import rejects invalid JSON safely

## Recommended Implementation Order

1. P0 data fixes and tests.
2. Add `package.json`, local static server, and data audit script.
3. Rework web navigation/dashboard/reference/library UI.
4. Improve exam/quiz/flashcard remediation flows.
5. Add portable package/export workflow.
6. Bring Python fork back into contract with web backup and full Bib registry.

## Notes

The existing web app has the right bones: local-only storage, Bib interchangeability, study guides, source links, SRS, quizzes, and resumable exams. The main job is now public hardening: make the first run simple, make package boundaries explicit, make the UI calmer and clearer, and prevent corpus drift with automated checks.
