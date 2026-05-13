# USSID 104 — Computer Network Exploitation Operations and Activities

> **🔒 Classified (typically TS//SI).** No public version exists; the name and number are the only publicly-releasable information. This summary covers adjacent public doctrine and what the Bib scope implies.

**Bib study scope:** CNE operations.
**Classification / Availability:** Classified SIGINT directive. Access only on appropriate classified networks via official channels.

## What USSIDs are {#what-ussids-are}

**USSIDs** (United States Signals Intelligence Directives) are NSA/CSS directives governing the U.S. SIGINT system. The directives are sequentially numbered:

- **USSID SP0018 / USSID 18** — Protection of U.S. person information (has a publicly-released redacted version; you have it).
- **USSID 100-series** — typically cover specific SIGINT tradecraft and mission areas.
- **USSID 6000-series** — typically cover USCYBERCOM SIGINT activities.

**USSID 104** specifically governs **Computer Network Exploitation (CNE) operations and activities** — intelligence collection conducted in and through computer networks.

## The CNA / CND / CNE trichotomy {#cna-cnd-cne}

Historic DoD doctrine divided computer-network operations into three mutually exclusive activities. Though modern JP 3-12 has replaced this vocabulary, the distinctions remain operationally relevant and heavily tested on the exam:

| Term | Full | Purpose | Modern equivalent (JP 3-12) |
|---|---|---|---|
| **CNA** | Computer Network Attack | Create effects (deny/degrade/disrupt/destroy) on adversary networks | **OCO** (Offensive Cyberspace Ops) / Cyberspace Attack action |
| **CND** | Computer Network Defense | Protect friendly networks | **DCO** (Defensive Cyberspace Ops) / DODIN Ops |
| **CNE** | Computer Network Exploitation | Collect intelligence from networks | **Cyberspace ISR** + **Cyberspace OPE** |

Know the overlap: a single technical action (e.g., implanting code on a foreign server) could fall under any of the three depending on purpose:

- If the purpose is **collection** → CNE / Cyberspace ISR.
- If the purpose is **pre-positioning for future effects** → CNE / Cyberspace OPE.
- If the purpose is **producing an effect now** → CNA / Cyberspace Attack.
- If the purpose is **stopping an adversary from producing an effect on us** → CND-RA / DCO-RA.

Same action, different authority path, different review, different approvals.

## CNE as a public concept {#cne-public}

You can't study USSID 104 content, but CNE as a doctrinal activity is publicly described:

- **CNE** = intelligence gathering via computer networks — collection, not effects. Distinct from CNA (Computer Network Attack) and CND (Computer Network Defense).
- Under JP 3-12 / modern doctrine, CNE maps to "**Cyberspace ISR**" and "**Cyberspace Operational Preparation of the Environment (OPE)**" — the intelligence and pre-positioning cyberspace actions.
- NSA executes CNE under its SIGINT authority (EO 12333, Title 50 USC).
- USCYBERCOM executes cyberspace ISR under DoD/Title 10 authority.
- The **dual-hat** of DIRNSA / Cdr USCYBERCOM exists partly to coordinate Title 10 / Title 50 distinctions in CNE.

## Cyberspace ISR vs Cyberspace OPE (the modern equivalents) {#isr-ope}

JP 3-12 Chapter II defines three **cyberspace actions** that describe the technical activity:

- **Cyberspace ISR** — intelligence collection conducted in and through cyberspace. Supports any mission area.
- **Cyberspace OPE (Operational Preparation of the Environment)** — shaping activities to gain access, develop understanding, or pre-position capabilities. Distinct from ISR because OPE may involve actively affecting the target (e.g., implanting a dormant capability) even though the primary effect has not yet occurred.
- **Cyberspace Attack** — creating the intended denial, degradation, disruption, or destruction effect on the target.

CNE (in the legacy vocabulary) typically covers both cyberspace ISR and OPE. The key functional distinction:

- **ISR** = pure collection; no effect on target beyond minimal footprint required to collect.
- **OPE** = active shaping (implants, access creation, pre-positioned capabilities); still not producing the final effect, but actively modifying target posture to enable future effects.

## USP protection applies to CNE too {#usp-cne}

USSID 18 rules apply to any SIGINT activity — including CNE. If a CNE operation incidentally collects U.S. person information (e.g., emails to/from a U.S. person on a foreign target's mailbox), the minimization rules kick in:

- Minimize acquisition (don't deliberately collect USP).
- Minimize retention (purge USP data not needed for foreign intelligence).
- Minimize dissemination (mask USP identities in reports unless exception applies).

Violation through a CNE operation is no less of a USSID 18 violation than a voice-intercept USP touch.

## Oversight of CNE {#oversight}

Same multi-layer oversight as other SIGINT:

- **NSA IG, NSA OGC, NSA Compliance** — internal.
- **DoD IG** — external to NSA but within DoD.
- **DoJ NSD** — Justice Department National Security Division.
- **ODNI CLPT** — IC-wide civil liberties / privacy office.
- **FISC** — judicial oversight of relevant collection.
- **SSCI / HPSCI** — congressional intel oversight.
- **PCLOB** — independent privacy board.

Every CNE operator is personally accountable for USSID 18 compliance.

## What the Bib likely tests (from public SIGINT doctrine) {#testable}

- What agency governs USSIDs? **NSA / CSS.**
- What does CNE stand for? **Computer Network Exploitation.**
- CNE is distinct from CNA (attack) and CND (defense) — what is CNE's primary purpose? **Intelligence collection in/through networks.**
- Under what executive order does NSA conduct SIGINT, including CNE? **EO 12333.**
- In modern DoD cyberspace doctrine, CNE-like activities map to which cyberspace action types? **Cyberspace ISR + Cyberspace OPE.**
- What is the difference between cyberspace ISR and OPE? **ISR is passive collection; OPE actively shapes the target (implants, access creation) to enable future effects.**
- Do USSID 18 minimization rules apply to CNE? **Yes — same three rules (minimize acquisition, retention, dissemination) apply to CNE just as to any other SIGINT activity.**
- What is the classification of USSID 104? **Classified — typically TS//SI.**

## How to study this ref

- Don't try to find USSID 104 on the public internet — it is classified.
- On a classified workstation at your command (if you have access), USSIDs are typically on the appropriate classified share.
- For exam purposes, study the public CNE framework via JP 3-12 (on disk) Chapter II and USSID 18 (public, on disk) for the SIGINT-authorities context.

## Cross-references

- **USSID-18** (public redacted, on disk as `USSID-18 Protection of US Person Information (redacted).pdf`) — U.S. person protections apply to USSID 104 collection
- **USSID-6000** (classified, summary written) — USCYBERCOM SIGINT activities
- **[JP-3-12 Chapter II](data/bibs/CWT-E7/references/JP-3-12%20Joint%20Cyberspace%20Operations.pdf)** — cyberspace actions (ISR, OPE, attack) — public framework for CNE analog
- **EO 12333** (public) — foundational IC activities authority
- **JP-2-01** — Joint Intelligence Support (how SIGINT feeds joint forces)
- **JCAC-ACTIVE-EXPLOIT** — the technical tradecraft underlying CNE operations
