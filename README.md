# Bibmaxxing

Local-first web app for drilling Navy enlisted advancement Bibliography (Bib) references. No accounts, no cloud, no telemetry. Built to be **Bib-interchangeable** so additional ratings or paygrades drop in as self-contained folders.

The current installed Bibs are **CWT E-5**, **CWT E-6**, **CWT E-7 Cycle 270 / January 2026**, and **CWT Core**.

---

## Quick start

Three ways to run, in order of preference:

0. **Portable one-click package**
   Double-click `Deploy Bibmaxxing.bat`, then open `dist/bibmaxxing-portable-0.1.0` and double-click `Run Bibmaxxing.bat`. Use the **Exit** button in the app to close the local server cleanly.

1. **Node (recommended, no network needed)**
   ```
   npm run serve
   ```
   Opens at `http://localhost:8080/`. No `npm install` needed - there are zero runtime dependencies.

2. **`serve.bat`** (Windows convenience launcher)
   Double-click `serve.bat`. It tries `node scripts/serve.mjs` first, then `py -m http.server`, then `python -m http.server`, then `npx serve` as a last resort.

3. **Any static server**
   ```
   python -m http.server 8080
   ```
   Open `http://localhost:8080/` in any modern browser.

> Opening `index.html` directly via `file://` will not work - Chrome blocks `fetch()` on local files so the seed corpus cannot load. Always run via a static server.

If you don't have Node or Python yet:
- Node: <https://nodejs.org/en/download/>
- Python: <https://www.python.org/downloads/windows/>

---

## GitHub upload folder

To prepare a clean repository source tree:

```
npm run github:folder
```

Upload the contents of `dist/bibmaxxing-github-upload-0.1.0/` to GitHub. The builder excludes local reference PDFs, non-redistributable reference files, `dist/`, local agent/session folders, and `bibmaxxing-py/`. The folder includes its own `.gitignore`, `GITHUB-UPLOAD-README.md`, and `GITHUB-UPLOAD-MANIFEST.json`.

---

## What's inside

- **Today** dashboard - due/new cards, resumable sessions, readiness panel, coverage map, setup health, **section-readiness panel** with per-section bars and heaviest-weak callout.
- **Drill** - SM-2 spaced repetition flashcards with keyboard rating (1/2/3/4), subject picker, weak-area mode, drill-by-reference, **drill-by-section**.
- **Quiz** - untimed multiple-choice drill with instant feedback, filterable by section / reference / topic / weak areas. Results group misses by reference with per-group remediation actions.
- **Exam** - timed mock exam (200Q / 100Q / 50Q) with **section-weighted question selection** that mirrors the NWAE's actual item counts, question grid, answered / unanswered / flagged counts, keyboard navigation, flag-for-review, rock-solid resume across tab close.
- **Library** - study guides written from the actual source material (one per reference).
- **References** - canonical Bib coverage map with search across title/ID/scope/type/availability, status chips, and per-reference detail view with notes editor.
- **Manage** - theme, active Bib, **profile-sheet input** (per-section item counts + correct counts + percentile), add/edit questions, backup/restore, packaging, install new Bib, data integrity, reset.

All progress and notes live in IndexedDB. Export JSON for backup.

### Tracks and section model

Each Bib is bound to a **track**: `cwt-e5`, `cwt-e6`, `cwt-e7`, or `cwt-core`. The first three are exam-readiness tracks; **CWT Core** is a reusable CWT skill bank kept separate from advancement-exam scoring.

Installed tracks:

| Bib | Track | Purpose | Questions | Notes |
|---|---|---|---:|---|
| `CWT-E5` | `cwt-e5` | Core-derived E-5 regular-exam readiness | 488 | No bundled item counts; enter a profile sheet for real weighting |
| `CWT-E6` | `cwt-e6` | Core-derived E-6 regular-exam readiness | 488 | Uses the operator-supplied E-6 section-count example until a profile sheet is entered |
| `CWT-E7` | `cwt-e7` | Cycle 270 / January 2026 regular-exam readiness | 541 | Section-weighted exam model with provisional item counts |
| `CWT-CORE` | `cwt-core` | Public-safe reusable CWT skill development | 488 | Extracted from public-safe E7 objectives; no exam item counts |

`CWT-CORE`, `CWT-E5`, and `CWT-E6` each have their own `bib.json` and `questions.json`, but they reuse the `CWT-E7` study-guide/reference assets through `contentBaseBib: "CWT-E7"`. That keeps the shared CWT bank DRY: one set of guides, multiple study lenses.

Every exam-readiness Bib declares **sections** in `bib.json`. Each section carries a name, code, item count (which doubles as the weight), and topic tags. CWT-E7 ships with the six CWT NWAE sections:

| Code | Section | Initial item count* |
|---|---|---:|
| OCO | Offensive Cyber Operations | 34 |
| SYS | System Fundamentals and Evaluations | 59 |
| DCO | Defensive Cyber Operations | 33 |
| R&D | Research and Development | 24 |
| PLAN | Cyber Planning | 15 |
| SEC | Security and Administration | 10 |

\* Initial CWT-E6 and CWT-E7 item counts come from the operator's CWT E-6 example. `CWT-E5` ships with no item counts. Replace any provisional/default counts via **Manage > Profile sheet** with your actual NWAE profile-sheet values for accurate weighted readiness.

> **Section weights are provisional and vary by paygrade, cycle, and year.** The Navy Enlisted Advancement Worldwide Exam (NWAE) re-balances section item counts each cycle, and counts differ across E-5 / E-6 / E-7 in the same rating. The numbers above are a starting point. When the cycle is announced and the profile sheet is in hand, enter the real numbers in **Manage > Profile sheet** so weighted readiness reflects your actual exam. The dashboard prints a "Section weights are provisional" caveat next to weighted readiness whenever any section is still on the operator/example default rather than a profile-sheet number.

Every question in the seed corpus is tagged with a `primarySection` (and zero-or-more `sectionTags[]` for cross-section coverage) by `scripts/map-sections.mjs`. Re-run that script after any `bib.json` reference edits.

### Objectives - the study layer

Sections drive **exam weight**; objectives drive **study and remediation**. Every section breaks down into 2-8 **objectives** that map upward to one section and downward to one-or-more source refs:

```
Track  ->  Section  ->  Objective  ->  Source refs  ->  Questions  ->  User performance
```

CWT-E7 ships with **34 objectives** across the 6 sections. CWT Core currently extracts **26 public-safe objectives** from that set. `CWT-E5` and `CWT-E6` reuse those 26 public-safe objectives as regular-exam study objectives. Each objective declares:
- `sectionId` (parent section)
- `sourceRefs[]` (one or more bib refs)
- `depth`: `foundation` | `intermediate` | `advanced` | `chief`
- `examRelevance`: `regular` | `substitute` | `core` | `local-private`
- `publicSafe`: false when source refs are CUI/FOUO or classified (UI hides those from public packaging)
- `coreObjective: true` marks objectives that are CWT-Core-extractable - reusable when E5/E6/E7 share the Core knowledge bank
- `topicTags[]` for cross-section heuristics

CWT Core v1 intentionally excludes CUI/FOUO, classified, restricted-summary, public-adjacent, and substitute-only content. `CWT-E5` and `CWT-E6` inherit that public-safe bank, so they are useful immediately for general CWT exam preparation but should be personalized with real section weights when available.

Run `node scripts/map-objectives.mjs` after any `bib.json` ref edits to refresh each question's `primaryObjective` and `objectiveTags[]`. The audit script reports any unmapped questions, empty objectives (no primary questions), and sections without objectives.

### Weighted readiness math

The dashboard's section-readiness panel computes:

- **Section mastery** = `mastered / total` per section, where "mastered" means the SM-2 interval is at least 21 days.
- **Weighted exam readiness** = `sum(section_mastery * section_item_count) / sum(section_item_count)`. Falls back to equal-weight averaging if no section has an item count.
- **Heaviest weak section** = the section with the largest `(1 - mastery) * item_count`. Surfaced as a one-click drill action.

The objective layer adds the **drill-priority formula**:

```
priority = sectionWeight * objectiveWeakness * evidenceConfidence * freshness * examRelevance
```

- `sectionWeight` = the parent section's normalized item-count share (0..1).
- `objectiveWeakness` = `1 - mastery`.
- `evidenceConfidence` = `min(1, seen / min(total, 3))` - low when only one or two questions have been reviewed, full when at least 3.
- `freshness` = exponential decay on the most-recent review (21-day half-life), floored at 0.2 so chronic gaps stay drillable.
- `examRelevance` = 1 when the objective is in scope for the active exam, 0 otherwise (regular exam excludes substitute objectives; core mode excludes local-private).

The objective with the highest priority is surfaced as **Next best drill** on the dashboard. Each section bar also shows up to two top-priority weak objectives inline with a Drill / Quiz action button per row.

Substitute-only references (currently `NWP-5-01`, `USSID-109`, `USSID-201`) are tagged `examScope: "substitute"` in `bib.json`. They are **excluded from regular-exam readiness math** by `js/sections.js::filterForExamType`. The two objectives bound to those refs (`obj-plan-naval-planning`, `obj-sec-sigint-compliance-substitute`) are also tagged `examRelevance: "substitute"` and surface as informational coverage gaps only.

Section-weighted mock exam generation uses `pickWeightedExamQuestions()` - each section gets question slots proportional to its item count, with leftover allocation distributed by largest fractional remainder.

### Profile sheet

After taking the actual NWAE you'll receive a profile sheet showing per-section item counts, correct counts, and a standing. Open **Manage > Profile sheet** to enter those numbers; they're stored in IndexedDB's `settings` store under the key `profile-sheet:<bibId>` and override `bib.json`'s default item counts for the weighted-readiness math. Backups include profile sheets automatically.

---

## npm scripts

| Script | What it does |
| --- | --- |
| `npm run serve` | Local static server (Node, stdlib only). Default port 8080; pass a number to change. |
| `npm run build:core` | Regenerates `CWT-CORE` from the public-safe CWT-E7 objective/question bank. |
| `npm run build:tracks` | Regenerates `CWT-E5` and `CWT-E6` from `CWT-CORE`. |
| `npm run build:all` | Regenerates Core, then E5/E6. |
| `npm run deploy` | One-command release path: build, test, strict-audit, package ZIPs, and create `dist/bibmaxxing-portable-<version>/Run Bibmaxxing.bat`. |
| `npm run github:folder` | Builds `dist/bibmaxxing-github-upload-<version>/`, a clean public-safe source folder for GitHub upload. Excludes PDFs, local reference files, build output, agent folders, and the Python fork. |
| `npm run audit:data` | Validates `bib.json`, `questions.json`, study guides, and `MANIFEST.json` for every installed Bib. Reports duplicate IDs, broken refs, missing guides, and manifest drift. |
| `npm run audit:data:strict` | Same as above but exits non-zero on warnings. |
| `npm run test:core` | Verifies the CWT Core extraction contract: no E4, public-safe core objectives, unique question IDs, and no restricted refs. |
| `npm run test:tracks` | Verifies the E5/E6 Core-derived track contract: no E4, safe Core reuse, E6 section counts, and E5 profile-sheet-required weights. |
| `npm run test:coverage` | Verifies every regular-exam reference has at least one primary question. Substitute-only refs are exempt. |
| `npm run test:ui` | Static UI-copy contract for the CWT track polish points. |
| `npm run test:deploy` | Static deploy contract for one-click deploy, portable launch, and in-app Exit wiring. |
| `npm run test:github-upload` | Verifies the GitHub upload folder contract and confirms it contains no PDFs or local reference files. |
| `npm run test:srs` | Node port of the SM-2 unit tests. Runs from the live `js/srs.js`. |
| `npm run test:syntax` | `node --check` over every `.js` / `.mjs` in the repo (excluding dev/build paths). |
| `npm test` | Runs syntax, SRS, Core contract, track contract, UI contract, ref coverage, and data audit together. |
| `npm run package:web` | Builds the **app-only** ZIP under `dist/` with a manifest. No PDFs, no data. |
| `npm run package:web -- --type data` | Builds the public **data pack** (bib.json, questions.json, study guides, MANIFEST.json). PDFs only included for refs marked `redistributable: true`. |
| `npm run package:web -- --type bundle` | App + data combined. |
| `npm run package:web:all` | Builds all three packages. |
| `npm run clean` | Removes `dist/`. |

---

## Backup and restore

- **Manage -> Export backup** writes a single JSON file containing every IndexedDB store: progress, notes, sessions, exam attempts, settings, user-authored questions.
- **Manage -> Import backup** validates the file (rejects anything that isn't a Bibmaxxing backup) and merges it.
- Backup shape: `{ schemaVersion, exportedAt, stores }` - stable across versions.

The backup is your personal study data only. It does NOT include the app or the Bib content; those come from disk.

---

## Packaging

Three package types live under `dist/`. Every archive ships with a `*.manifest.json` describing app version, generated date, package type, included Bibs and counts, **excludedReferences** (with reason per file), and **SHA-256 checksums** for every included file.

| Type | Contents | When to use |
| --- | --- | --- |
| `app` | Source app (`index.html`, `app.js`, `app.css`, `js/`, `scripts/`, `tests/`, `README.md`, `serve.bat`, `package.json`). No data, no PDFs. ~100 KiB. | Public redistribution, embedding in another project, archiving. |
| `data` | `bib.json`, `questions.json`, study guides, `MANIFEST.json`. Reference PDFs included **only** for refs with `redistributable: true`. | Sharing a Bib data pack between Sailors. |
| `bundle` | App + data combined. | Personal portable copy with your reference set. |

### Legal / public content boundaries

Bibmaxxing **never** redistributes commercial, CUI/FOUO, or classified content by default. The packager's posture:

- A reference PDF is included in `data` / `bundle` packs **only** when its `bib.json` entry has `redistributable: true`.
- Everything else is recorded in `excludedReferences[]` with a reason - `not-flagged-redistributable`, `restricted-classified`, `restricted-cui-fouo`, `restricted`, `localPath-missing`, or `not-redistributable`.
- The manifest also carries a top-level `redistribution` field: `"redistributable"` for app, data, and clean bundles; `"local-only"` for bundles that opted into local references.

Read the manifest before sharing any archive.

### `--include-local-references` (operator-only)

For personal use only - e.g. assembling a portable bundle with all your locally-acquired reference PDFs to study offline on another machine.

- Valid **only** with `--type bundle`. Refused for `--type data` and `--type all`.
- Includes non-classified `localPath` files into the bundle even when they aren't flagged `redistributable: true`.
- **Excludes** anything with `availability: classified | cui-fouo | restricted`.
- Stamps the manifest with `redistribution: "local-only"` and lists everything pulled in under `includedLocalReferences[]`.
- The old `--include-restricted` flag has been removed; the packager refuses it with a hard error pointing at this replacement.

Example:
```
npm run package:web -- --type bundle --include-local-references
```

### User-supplied reference pack

References marked `availability: "needs-user"` (commercial books, CAC-gated PDFs, etc.) live locally on your machine only. Drop the PDF at the `localPath` declared in `bib.json`, and the References view + study guides will see it immediately.

---

## Add a new Bib

1. Create `data/bibs/<YOUR-BIB>/`:
   ```
   data/bibs/CWT-E5/
     bib.json             # canonical reference list - see CWT-E7 as template
     questions.json       # seed question corpus
     study-guides/        # one <refId>.md per reference, optional
     references/
       MANIFEST.json      # acquisition state, restricted/needs-user notes
       *.pdf              # downloaded references (local only by default)
   ```
2. Add one entry to `data/bibs/index.json`:
   ```json
   { "id": "CWT-E5", "rating": "CWT", "paygrade": "E-5",
     "cycle": "Cycle 266 / Sept 2026", "path": "data/bibs/CWT-E5/" }
   ```
3. Reload the app. The Bib selector picks it up.

Your progress is scoped per-Bib, so switching never damages your other Bibs.

---

## Cycle freshness

The Setup Health panel on the dashboard and the Manage page surface a warning when the installed Bib lags the latest known cycle for that paygrade. Bibs are NOT auto-fetched - the operator installs the latest data pack manually.

For the current cycle calendar, see the Navy COOL Bibs portal: <https://www.cool.osd.mil/usn/bibs/>.

---

## Reset local data

**Manage -> Reset local data** wipes every IndexedDB store and auto-downloads a backup first. Seeds will reload from disk on next view.

---

## Architecture notes (for contributors)

- Static SPA. Hash-based routing. No runtime build step, no bundler.
- Each view exports `render(mount, ctx)` and optionally returns a cleanup function the router calls on navigation.
- IndexedDB stores: `questions`, `progress`, `notes`, `sessions`, `examAttempts`, `settings`. Schema versioned via `js/db.js`.
- `bib.json.references[]` is the canonical reference source for the web UI. `MANIFEST.json` is a curated summary; if the two drift, `npm run audit:data` flags it.
- SM-2 SRS lives in `js/srs.js` - pure functions, tested from Node and a browser HTML harness.
- Packaging is stdlib-only Node (`scripts/lib/zip.mjs`). No npm dependencies are required to run, test, audit, or package the app.

---

## Acceptance smoke tests

1. First run with no data: dashboard shows the first-run band; seed question count matches `data/bibs/CWT-E7/questions.json`.
2. Rate a few flashcards; reload - Today panel "due" count updates.
3. Start a mock exam, answer some, close the tab, reopen - Resume strip shows exact state.
4. Switch Bib in the nav - dashboard rehydrates for the new Bib; old Bib untouched on switch-back.
5. `npm run audit:data` exits 0 with no errors; warnings mean the corpus needs curation.
6. `npm test` reports syntax, SRS, Core contract, track contract, and data audit success.
7. `npm run package:web` writes `dist/bibmaxxing-app-<version>.zip` and a matching manifest. The manifest shows 0 PDFs in `checksums[]`.
