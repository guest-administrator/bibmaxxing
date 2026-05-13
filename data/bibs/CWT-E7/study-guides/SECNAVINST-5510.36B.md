# SECNAVINST 5510.36B / SECNAV M-5510.36 — DON Information Security Program

**Bib study scope:** Chapter 2 (of SECNAV M-5510.36 Manual — the chapters live in the manual, not the short instruction).

**Source on disk:** `SECNAV M-5510.36 DON Information Security Program Manual.pdf` (the full manual with Chapter 2). The instruction 5510.36B is a thin policy wrapper that points at this manual.

## Why this reference matters {#why}

This is the Navy's information-security bible — the one that governs **how classified and controlled unclassified information is classified, marked, handled, transmitted, stored, reproduced, destroyed, and decontrolled**. Every Chief managing classified material lives inside this document.

Exam emphasis per the Bib is **Chapter 2**, which typically covers **classification and marking** in the manual's structure.

## The authority hierarchy {#hierarchy}

```
EO 13526 (Classified National Security Information)
     │
     ▼
32 CFR Part 2001 (ISOO Implementing Directive)
     │
     ▼
DoDM 5200.01 Vol 1–4 (DoD Information Security Program)
     │
     ▼
SECNAVINST 5510.36B + SECNAV M-5510.36 (Navy implementation)
     │
     ▼
Command's local SOP
```

The Information Security Oversight Office (**ISOO**, within NARA) is the executive-branch overseer of classification.

## The three classification levels {#levels}

Under **Executive Order 13526**:

| Level | Damage test | Marking | Classification authority |
|---|---|---|---|
| **Confidential** | Damage to national security | (C) | OCA delegation |
| **Secret** | Serious damage | (S) | OCA delegation |
| **Top Secret** | Exceptionally grave damage | (TS) | OCA delegation |

**Anything else you might see is not a U.S. classification level:**
- "For Official Use Only" (FOUO) — this is legacy **Controlled Unclassified Information (CUI)** terminology. CUI is unclassified but controlled.
- "Restricted" — NATO/allied category. Not a U.S. level.
- "Sensitive" — informal; not a formal level.

## Original vs derivative classification {#orig-derivative}

### Original Classification Authority (OCA)

Only specific officials can ORIGINALLY classify information. They are designated in writing by the President or their SECNAV-delegated authority. Navy OCAs are positions (typically flag/SES), not persons.

The OCA's decision is recorded via **classification guidance** (a written Security Classification Guide, SCG) that becomes the authority for everyone else who classifies downstream.

### Derivative classification

**Anyone creating new documents from already-classified sources is a derivative classifier.** They don't make original decisions; they transcribe the classification of source material onto their new product.

Requirements:

- **Training before derivative classification** — must be completed before anyone is authorized to derivatively classify, and biennially (every 2 years).
- **Source list** — every derivatively classified document must identify the source(s) it drew from.
- **"Classified By"** line — identifies the derivative classifier.
- **"Derived From"** line — points at the source (typically an SCG).

## Marking requirements (Chapter 2 core content) {#marking}

Per **ISOO Marking Booklet** (public at NARA) and SECNAV M-5510.36 Chapter 2:

### Portion marking

Every portion (paragraph, sub-paragraph, figure, table, title) must be marked with its classification level in parentheses:

- `(U)` Unclassified
- `(C)` Confidential
- `(S)` Secret
- `(TS)` Top Secret
- `(S//NF)` Secret, NOFORN
- `(TS//SI)` Top Secret, SI (Special Intelligence compartment)
- `(TS//SI//NF)` Top Secret SI NOFORN

### Banner marking (top and bottom of every page)

**The document's overall classification is the HIGHEST classification of any portion inside** — *never* lower, often adorned with additional control markings.

Banner format:
```
TOP SECRET//SI//NOFORN
```

- `//` separates the classification from SCI compartments and from dissemination controls.

### Classification block (first page)

The classification block identifies:

- **"Classified by:"** — original classifier's position, or derivative classifier's name.
- **"Derived from:"** (derivative) — source or SCG.
- **"Reason:"** (original only) — reason for classification under EO 13526 §1.4.
- **"Declassify on:"** — specific date, event, or duration (max 25 years unless exempted).

## Dissemination and handling controls (Chapter 2 side-content) {#controls}

These **add to** the classification level:

| Marking | Meaning |
|---|---|
| **NOFORN (NF)** | Not releasable to foreign nationals |
| **REL TO** | Releasable to specific listed countries (e.g., `REL TO USA, FVEY`) |
| **ORCON** | Originator controls dissemination (permission required to reshare) |
| **PROPIN** | Proprietary information |
| **SI** | Special Intelligence (SIGINT compartment) |
| **TK** | Talent Keyhole (imagery) |
| **HCS** | HUMINT Control System |
| **G / GAMMA** | Subset of SI (very tightly compartmented) |

**Legacy caveats no longer used** (exam traps): "FOUO" and "Limited Distribution" — CUI replaced FOUO in 2020 for federal use.

## CUI — Controlled Unclassified Information {#cui}

**EO 13556 (2010)** established the CUI program to replace the patchwork of FOUO, SBU, LES, Law Enforcement Sensitive, etc. NARA runs the CUI Registry.

- **CUI Basic** — controls per the CUI Registry category (e.g., CUI//SP-PRVCY for privacy data).
- **CUI Specified** — stricter handling required by specific law/regulation.

Marking format: `CUI` banner at top/bottom plus portion markings like `(CUI)` and category tags. DoD's CUI implementation is in **DoDI 5200.48**.

## Safeguarding classified information {#safeguarding}

Key standards:

- **Storage** — classified kept in an **approved GSA-approved security container** (safe) or SCIF/vault for TS/SCI.
- **Working papers** — drafts are classified from creation; must be protected at the highest level of any content inside.
- **Transmission** — strict media/channel rules:
  - Confidential: U.S. First Class mail (double-wrapped), DCS (Defense Courier Service), or approved courier.
  - Secret: U.S. Registered Mail (double-wrapped), DCS, approved courier.
  - TS: **DCS or approved courier only** — no mail.
- **Reproduction** — only on approved equipment; counts, serialization, chain of custody.
- **Destruction** — NSA-approved shredders (cross-cut, particle size in the 1mm × 5mm range for most levels), pulverizers, burn bags processed through a burn facility.
- **SF-700** Security Container Information — tracks combos and authorized openers.
- **SF-701** Activity Security Checklist — end-of-day checklist.
- **SF-702** Security Container Check Sheet — every-open/close log.
- **SF-703 / SF-704 / SF-705** — TS / Secret / Confidential cover sheets.
- **SF-706 / SF-707** — TS/TS-SCI and Secret media labels.

## Unauthorized disclosure (spills) {#spills}

A **classified spill** is any transmission of classified to an unauthorized recipient or system. Immediate actions:

1. **Contain** — stop further spread. Do NOT "delete" from email (that spreads it to admin logs/backups).
2. **Notify** — the Security Manager / ISSM immediately.
3. **Document** — what information, what systems, who has seen it, timeline.
4. **Clean** — the security team coordinates system cleanup (often requires re-imaging or bit-wipe of affected storage).
5. **Report up** — via established channels (DON CIO, ISOO if required).

## Declassification and downgrading {#declassification}

- **Scheduled declassification** — automatic on the "Declassify on" date in the classification block (max 25 years unless specifically exempted per EO 13526 §1.5(a)).
- **Automatic declassification** — 25 years from creation for most records, unless exempted by the President.
- **Mandatory declassification review (MDR)** — any member of the public can request review of a specific document for declassification.
- **Systematic review** — agencies periodically review classified holdings.
- **Downgrading** — moving from higher to lower level (e.g., S → C) when damage estimate changes.

## Exam-testable concepts

- What EO classifies national security information? **EO 13526.**
- What's the damage test for Secret? **Serious damage to national security.**
- Max duration an OCA can set for "Declassify on"? **25 years** (with specific exemptions for longer).
- Who can originally classify information? **Only an OCA** (position-based, not person-based).
- How often must derivative-classification training occur? **Biennially (every 2 years).**
- What is the overall classification of a document? **Highest of any portion inside.**
- `NOFORN` means what? **Not releasable to foreign nationals.**
- What form is the end-of-day security checklist? **SF-701.**
- What form is the security container check log? **SF-702.**
- What EO established CUI? **EO 13556 (2010).**
- Where is the CUI Registry? **NARA (ISOO).**
- What replaced FOUO in federal use? **CUI.**

## Cross-references

- **[SECNAVINST-5510.30C](#references/SECNAVINST-5510.30C)** — Personnel Security sibling (access to the classified info this doc protects)
- **[DODM-5105.21-V1](#references/DODM-5105.21-V1)** — SCI administrative security (higher level than this doc covers)
- **EO 13526** — public at [archives.gov/isoo](https://www.archives.gov/isoo/policy-documents/cnsi-eo.html)
- **DoDM 5200.01 Vol 1–4** — DoD-wide parent
- **DoDI 5200.48** — DoD CUI implementation
- **ISOO Marking Booklet** (public, canonical) — [archives.gov](https://www.archives.gov/isoo/training/marking-booklet.pdf)
