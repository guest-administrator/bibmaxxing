# data/

Static content loaded on app launch.

## Structure

```
data/
├── README.md                 (this file)
└── bibs/
    ├── index.json            # Bib registry — add one line per Bib you install
    └── <BIB-ID>/
        ├── bib.json          # reference list for this Bib
        ├── questions.json    # seed question bank for this Bib
        └── references/
            ├── MANIFEST.json # downloaded / needs-you / restricted per ref
            └── *.pdf         # downloaded public references
```

## Adding a new Bib

1. Copy an existing `<BIB-ID>/` folder (e.g. `CWT-E7/`) to a new name.
2. Edit `bib.json` to list the references on that Bib.
3. Clear or replace `questions.json` (seed questions for that Bib).
4. Add an entry to `bibs/index.json`:

```json
{ "id": "CWT-E5", "rating": "CWT", "paygrade": "E-5",
  "cycle": "Cycle 266 / Sept 2026", "path": "data/bibs/CWT-E5/" }
```

5. Reload the app. The new Bib appears in the Bib selector.

## Reference availability states

Every entry in `bib.json` carries an `availability` field:

| Value | Meaning |
|---|---|
| `public-downloaded` | PDF is in this folder; `localPath` set. |
| `public-missing`    | Public URL known but download skipped/failed. |
| `needs-user`        | Behind CAC, CUI/FOUO, or a broken link. User must provide the PDF. |
| `cui-fouo`          | Restricted by policy. No content shipped; name/number only. |
| `classified`        | Out of scope. Name/number only. |

Only public `.mil` / `.gov` sources (or clearly-public mirrors of releasable doctrine) should be downloaded here. No paywalled commercial study guides. No CUI / FOUO / classified content.
