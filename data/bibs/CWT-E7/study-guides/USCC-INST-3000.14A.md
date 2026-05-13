# USCC INST 3000.14 (Rev A) — Technical Deconfliction of Cyberspace Operations

> **⚠ Reference summary.** USCYBERCOM internal instruction — CUI, not publicly released. Public adjacent: JP 3-12 Chapter IV, JP 3-60 Joint Targeting, DoD Cyberspace Operations open-source discussion.

**Bib study scope:** Enclosures 2, 3.
**Classification / Availability:** CUI — USCYBERCOM distribution to service components.

## What this document is {#what-it-is}

USCYBERCOM Instruction 3000.14A establishes the **technical deconfliction process** for U.S. cyberspace operations — the procedures by which USCYBERCOM ensures that friendly cyber operations (executed by different U.S. actors) don't collide with or compromise each other.

### Cyberspace deconfliction purpose {#deconfliction-purpose}

Deconfliction is required to keep friendly cyber operations from interfering with one another's equities. Specifically:

- Multiple U.S. entities may be operating in the same target infrastructure (USCYBERCOM, intel agencies, FBI, other CCMDs).
- A single operation can burn an access another actor depends on.
- Effects from one action can propagate to systems other operations need to remain untouched.
- Coalition partners may have separate accesses to deconflict against.
- Cyberspace is **globally interconnected**, so the same target system may be of interest to multiple missions (e.g., a hacked router in a neutral country may be SIGINT target for NSA and attack target for USCYBERCOM).

The driving idea is **access preservation**: in cyberspace, friendly operations frequently depend on accesses other friendly operations could destroy. Deconfliction exists to sequence those operations so the dependency chain stays intact.

## Why cyberspace is different from other domains {#cyber-vs-kinetic}

In kinetic domains, deconfliction is usually geographic — don't drop a bomb on your own troops. In cyberspace, deconfliction is **logical and temporal** — don't run an operation on a target system during the same window that another operation requires that system intact.

| Deconfliction dimension | Kinetic | Cyber |
|---|---|---|
| **Geographic** | Primary concern (FSCL, RFA, NFA) | Minimal — cyber has no geography |
| **Temporal** | Secondary (ATO windows) | Primary — multiple ops may sequence on same target |
| **Capability overlap** | Rare | Common — same exploit/implant may be in use by multiple actors |
| **Access preservation** | N/A | Critical — losing access is often catastrophic |
| **Attribution** | Not usually a conflict dimension | High — one op blowing cover affects others |

This is why USCYBERCOM owns the deconfliction process — cyberspace needs a single global integrator.

## The deconfliction process (publicly inferable framework) {#process}

From JP 3-12 Chapter IV (public) and open-source discussion of USCYBERCOM's deconfliction role:

1. **Pre-mission review** — planners submit proposed cyberspace actions for deconfliction review before execution.
2. **Registration with USCYBERCOM J3** — USCYBERCOM maintains visibility into all DoD cyberspace activity touching a target set.
3. **Cross-agency coordination** — USCYBERCOM liaises with NSA (for intel equities), FBI (for domestic investigations), CIA (for CNE equities), and coalition partners.
4. **Conflict resolution** — when two planned actions conflict, USCYBERCOM arbitrates priority (typically favoring the operation with higher national-level approval or more time-critical equity).
5. **Go/no-go decision** — deconfliction outcome feeds the final execution approval.
6. **Post-execution reporting** — executing unit reports what actually happened so the deconfliction picture stays accurate.

## Who deconflicts with whom {#cross-agency}

USCYBERCOM arbitrates across several categories of equity holder:

| Equity holder | What they might have on target | Typical equity |
|---|---|---|
| **NSA / CSS** | SIGINT access, CNE implants, collection operations | Intel — access preservation |
| **CIA** | HUMINT or CNE tradecraft on target | Intel — access preservation |
| **FBI** | Ongoing domestic investigation touching target infra | Law enforcement — investigation integrity |
| **Other CCMD** | Operational plan requires target remain intact | Operational — future effect window |
| **Coalition partner** | Partner nation access / operation | Alliance — partner equities |
| **DHS / CISA** | Defensive visibility on critical infrastructure | Homeland security |

The core philosophy: **no U.S. cyber operation kicks off until the equity-holders with overlapping interests have been coordinated or deconflicted.**

## Enclosures 2 and 3 — expected content {#enclosures}

Enclosures in USCYBERCOM instructions typically hold:

- **Enclosure 2: Roles and responsibilities of participants** — who submits for deconfliction, who reviews, who arbitrates, reporting chains.
- **Enclosure 3: Deconfliction submission format / timeline** — format of the request, required fields, minimum review timeline before execution.

Exam questions likely test:
- Who is responsible for submitting cyber actions for deconfliction? (Service component / CMF team or staff)
- Who adjudicates conflicts? (USCYBERCOM)
- Minimum timeline between submission and execution?
- How long before execution must deconfliction be complete?

## Where this fits in the planning cycle {#planning-cycle}

Deconfliction touches the joint planning process at specific points:

1. **Mission Analysis (JPP Step 2)** — initial identification of potential deconfliction needs based on target geography and likely equities.
2. **COA Development / Analysis (JPP Steps 3–4)** — formal deconfliction submission; conflicts identified and resolved.
3. **Plan Approval** — deconfliction resolution confirmed before approval.
4. **Pre-execution (F2T2EA → Engage)** — final technical check just before fires.
5. **Execution** — go/no-go triggered by deconfliction status.
6. **Assessment** — deconfliction accuracy reviewed for lessons.

A CWT E-7 assigned to a cyber planning cell needs to know **when** to submit for deconfliction — too late risks the mission, too early wastes analytic cycles on plans that may change.

## Navy implications {#navy}

For Navy:
- JFHQ-C Navy / C10F serves as the intermediary when Navy CMF teams need USCYBERCOM deconfliction.
- A Navy CMT planning a cyber fire against a maritime-relevant target flows the deconfliction request up through C10F → USCYBERCOM J3.
- Afloat-originated DCO-IDM does **not** typically require USCYBERCOM deconfliction (it's on blue space — DoD own networks). DCO-RA or any action against gray/red space does require deconfliction.
- NCDOC hunt operations on Navy networks are internally coordinated; deconfliction is typically only triggered if the hunt starts interacting with non-Navy systems.

## Exam-testable concepts {#testable}

- Which CCMD owns the cyberspace deconfliction process? **USCYBERCOM**.
- Why is deconfliction in cyberspace especially important? **Multiple U.S. actors may occupy the same target infrastructure; actions can destroy accesses others depend on.**
- At what stage of operational planning does deconfliction happen? **Before execution** (during COA analysis / approval phases of JPP).
- What agencies typically have equities to deconflict against in cyber ops? **NSA, CIA, FBI, DHS/CISA, other CCMDs, coalition partners.**
- What Navy entity typically relays deconfliction requests up to USCYBERCOM? **JFHQ-C Navy / C10F.**
- Does DCO-IDM on blue space typically need USCYBERCOM deconfliction? **No — it's on DoD networks and internal to the service.**
- Does DCO-RA or OCO need deconfliction? **Yes — because it touches gray/red space where other U.S. actors may have equities.**
- What is the primary difference between kinetic and cyber deconfliction? **Kinetic is geographic; cyber is logical/temporal (access preservation is the driving concern).**

## Cross-references

- **[JP-3-12 Chapter IV](data/bibs/CWT-E7/references/JP-3-12%20Joint%20Cyberspace%20Operations.pdf)** (public, on disk) — planning, execution, assessment including deconfliction discussion
- **[JP-3-60 Joint Targeting](data/bibs/CWT-E7/references/JP-3-60%20Joint%20Targeting.pdf)** (public, on disk) — joint targeting cycle
- **OPTASK-CYBERSPACE-OPS** — Navy-wide tasking (references this instruction)
- **USCYBERCOM-GENADMIN-22-0120** — SOP for USCYBERCOM support requests
- **USSID-6000** — USCYBERCOM / CMF SIGINT activities (Title 10/50 seam in deconfliction)
- **CFCOE-V4.1** — Navy CMF CONOPs (how Navy teams participate in deconfliction)
