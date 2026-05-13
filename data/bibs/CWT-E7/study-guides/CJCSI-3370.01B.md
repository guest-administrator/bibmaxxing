# CJCSI 3370.01 — Target Development Standards

**Bib study scope:** Enclosure D.

**Source on disk:** `CJCSI-3370.01 Target Development Standards.pdf` (FAS mirror; revision may differ from Bib's B — C is current as of Aug 2018 — framework is consistent across revisions).

## Why this matters {#why}

Joint targeting (JP 3-60) defines the **cycle**; CJCSI 3370.01 defines the **standards** — the data elements, formats, review processes, and intelligence products required to move a target through that cycle. If JP 3-60 is the "what," CJCSI 3370.01 is the "how to do it right."

For cyber operators, cyberspace targets go through this same target-development process with cyber-specific considerations.

## The target-development hierarchy {#hierarchy}

Targets progress through development stages, each with increasing rigor:

1. **Target candidate** — proposed for consideration.
2. **Validated target** — meets criteria, appears on target lists.
3. **Prioritized target** — ranked on JIPTL (Joint Integrated Prioritized Target List) against commander's objectives.
4. **Approved for engagement** — matched with a capability, CDE complete, legal review done.
5. **Engaged target** — action taken.
6. **Assessed target** — post-engagement evaluation.

Each stage has specific data requirements and approvals.

## Target validation criteria {#validation}

A target must demonstrate:

- **Military value** — contributes to adversary capability being countered.
- **Linkage** — ties to the commander's objectives.
- **Legal** — satisfies LOAC (distinction, proportionality, necessity, humanity).
- **Not on No-Strike List** — not protected by law, policy, or specific prohibitions.
- **Feasible** — can actually be engaged with available capabilities.

Validation is **documented** — a target folder includes the validation rationale, legal review, CDE, and intel support.

## Target folders + data elements {#folders}

The **Target Folder** is the authoritative record for a target. Its contents typically include:

- **Basic Target Identification (BTI)** — name, BE (Basic Encyclopedia) number, coordinates, imagery.
- **Target description** — physical, functional, signature.
- **Target System Analysis (TSA)** — how the target fits into the adversary system.
- **Linkage** — how this target supports commander's objectives.
- **Expected effects** — kinetic damage, functional degradation, behavioral change.
- **Collateral concerns** — civilian population, protected structures, dual-use.
- **Legal review** — JAG determination of LOAC compliance.
- **Intel estimates** — confidence levels, ISR coverage.
- **Engagement history** — prior engagements and assessments.

Data standards ensure folders are **interoperable across CCMDs, components, and national partners**. A target developed for CENTCOM should be readable by PACOM with the same data structure.

## Enclosure D — expected content {#enclosure-d}

Enclosures in CJCSI 3370.01 typically cover specific data standards. **Enclosure D likely covers one of:**

- **Target system analysis methodology** — how to decompose adversary systems, identify critical nodes, map dependencies.
- **Cyberspace target development** — specifically how cyber targets are developed (unique considerations: network topology, authentication systems, dependencies, collateral cyber effects).
- **Target data management** — the Modernized Integrated Database (MIDB) entries, NGA Common Operational Picture tie-ins.

The exam will likely test:
- What's in a target folder.
- How targets are validated.
- Cyberspace-specific development.

## Target System Analysis (TSA) {#tsa}

A rigorous method for understanding how an adversary system works:

1. **Objective of the target system** — what does it do for the adversary?
2. **Nodes** — individual entities (people, facilities, equipment, networks).
3. **Links** — relationships between nodes.
4. **Critical nodes** — without which the system fails (using graph centrality, functional dependency).
5. **Vulnerabilities** — ways to degrade critical nodes.
6. **Critical vulnerabilities** — vulnerabilities that, if exploited, achieve commander's objectives.

**Output:** a prioritized list of critical nodes with exploitation approaches.

### Cyberspace TSA differences

For cyber targets, nodes can be:

- **Physical** — servers, routers, PoPs.
- **Logical** — IP ranges, ASNs, domains, certificates.
- **Persona** — user accounts, cryptographic keys.
- **Temporal** — periods when certain capabilities are active.

And dependencies can be deeply nested (DNS → ICANN → root servers; network access → ISP peering; authentication → CA → root CA).

## Collateral damage estimation for targets {#cde}

CDE is a required deliverable:

- **CDE Level 1-5** — progressively more detailed estimates.
- **Methodology** — JTF CDE methodology; Navy uses similar processes.
- **Review** — approved at level appropriate to estimated risk.

For cyberspace: **Collateral Effects Estimate** (CEE) — considers effect propagation, dual-use systems, intel loss, attribution risk.

## Approval authorities {#approvals}

Target approval cascades based on:

- **Risk level** (CDE).
- **Political sensitivity**.
- **ROE authority**.
- **Target category** (leadership vs infrastructure, for example).

Approvals range from **component commander** (routine) to **CCDR** (operational) to **SECDEF** (high-CDE or sensitive) to **POTUS** (strategic / precedent-setting).

Cyberspace OCO engagements typically require SECDEF/POTUS-level approval per JP 3-12.

## Target lists revisited (from JP 3-60) {#lists}

- **JTL** — Joint Target List, all validated targets.
- **JIPTL** — Joint Integrated Prioritized Target List.
- **RTL** — Restricted Target List.
- **NSL** — No-Strike List.
- **Time-Sensitive Targets** — separate fast-track process.

## Exam-testable concepts

- What does CJCSI 3370.01 provide? **Target development standards — data elements, formats, review processes.**
- What's a Target Folder? **The authoritative record for a target, including validation, legal review, CDE, intel.**
- What's TSA? **Target System Analysis — decomposing adversary systems into nodes/links to find critical vulnerabilities.**
- What's a BE number? **Basic Encyclopedia number — unique target identifier in joint targeting databases.**
- What's the difference between a critical node and a critical vulnerability? **Critical node = essential to system function; critical vulnerability = exploitable weakness that, if exploited, achieves commander's objective.**
- Who typically approves high-CDE targets? **SECDEF or POTUS depending on category and CDE level.**
- For cyberspace targets, nodes can be what beyond physical? **Logical (IP/domain/cert) and cyber-persona (account, key).**

## Cross-references

- **[JP-3-60](#references/JP-3-60)** (on disk) — Joint Targeting (the cycle CJCSI 3370.01 standardizes)
- **[JP-3-12](#references/JP-3-12)** (on disk) — Cyberspace Operations (cyber targeting)
- **[CJCSI-3121.01B](#references/CJCSI-3121.01B)** (on disk) — SROE (targeting must comply with ROE)
- **[JP-5-0](#references/JP-5-0)** (on disk) — Joint Planning (targets tie to commander's objectives from MA)
- **DoD Law of War Manual** — LOAC framework underlying target validation
