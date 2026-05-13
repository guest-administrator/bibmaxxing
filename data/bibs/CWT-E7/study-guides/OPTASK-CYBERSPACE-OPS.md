# Navy-wide OPTASK Cyberspace Operations

> **⚠ Reference summary.** OPTASKs are operational tasking messages — not publicly released. Public adjacent: JP 3-12 Chapters II and IV.

**Bib study scope:** Offensive cyber operations.
**Classification / Availability:** CUI / controlled message traffic — issued by USFLTCYBERCOM.

## What an OPTASK is {#what-an-optask-is}

An **OPTASK** (Operational Tasking) is a standing Navy message that tells subordinate commands "here's the standing tasking for a specific mission area." OPTASKs are updated periodically, distributed by message traffic (naval message format), and remain in force until rescinded or superseded.

**OPTASK Cyberspace Operations** is the standing Navy tasking for cyberspace operations — it specifies how Navy units are tasked for DODIN Operations, DCO, and OCO, who has what authority, how requests for cyber effects flow, and what reports are required.

OPTASKs exist for most warfare areas — OPTASK AAW (Anti-Air Warfare), OPTASK STRIKE, OPTASK ASW, OPTASK ISR, OPTASK COMMS, OPTASK CYBER, etc. Each is the standing playbook for that area across a fleet or the entire Navy. A deployed strike group's watch-floor binders include the current OPTASK for every mission area they touch.

## Why the Bib scope highlights offensive cyber {#oco-emphasis}

Per the Bib, Chapter/scope emphasis is on **offensive cyber operations (OCO)**. This reflects the OPTASK's role as the tasking document for when Navy forces support USCYBERCOM-directed OCO. Key facts (from JP 3-12 public doctrine):

- **OCO authority** flows top-down: SECDEF/POTUS → USCYBERCOM → service cyber components → Navy CMTs.
- Navy platforms may contribute to OCO as part of USCYBERCOM-directed operations, but Navy does NOT self-direct OCO.
- **Target approval** for OCO goes through the joint targeting cycle (JP 3-60) with additional cyber-specific legal and policy review.
- **Deconfliction** with intelligence equities, coalition partners, and other U.S. cyber actors is required before OCO execution — see USCC INST 3000.14A.

## OCO authority cascade (public doctrine summary) {#oco-authority}

Understand the chain:

1. **POTUS / SECDEF** — national authority for significant OCO; a "significant" cyber effect or a cyber effect with strategic consequences typically needs POTUS approval per NSPM-13 (classified), JP 3-12, and public executive-order direction.
2. **USCYBERCOM (Commander)** — approved target list, authorities, execution direction. Commander USCYBERCOM is dual-hatted as DIRNSA.
3. **JFHQ-Cyber** — joint force headquarters aligned to geographic CCMDs (JFHQ-Cyber-INDOPACOM, JFHQ-Cyber-EUCOM, etc.). Translates USCYBERCOM direction to specific CMF teams.
4. **Service cyber component (FLTCYBERCOM for Navy)** — service-component level; provides forces and service-specific direction.
5. **Navy CMT / CST** — executes tasked OCO mission under the above authorities.

## OCO vs DCO-RA distinction {#oco-vs-dcora}

Both OCO and DCO-RA (Defensive Cyberspace Operations - Response Actions) can look technically identical to outside observers — both can reach into adversary-controlled cyberspace and produce disruptive effects. The distinction is in **framing and trigger**:

- **OCO**: proactive, offensive mission to achieve commander's objectives; can be planned over months; authorized up front.
- **DCO-RA**: reactive, defensive mission to stop or pre-empt an imminent cyber attack against friendly systems; authorized when the threat materializes.

Because both can require the same authorities at the same levels (SECDEF/POTUS), the OPTASK Cyberspace Operations message defines how a Navy unit escalates either type of request.

## OPTASK formatting (public procedural knowledge) {#optask-format}

OPTASKs follow the Navy message format (Naval Messaging / AUTODIN / DMS / DMS replacements):

- **PRECEDENCE** — ROUTINE, PRIORITY, IMMEDIATE, FLASH, FLASH OVERRIDE.
- **DTG (Date-Time Group)** — when issued (e.g., `221430Z APR 26`).
- **Originator / FM** — issuing command (COMFLTCYBERCOM for this OPTASK).
- **Action addressees / TO** — recipients required to act.
- **Info addressees / INFO** — recipients to be kept aware.
- **SUBJ line** — e.g., "NAVY-WIDE OPTASK CYBERSPACE OPERATIONS"
- **REF block (A, B, C…)** — references to governing instructions (JP 3-12, NWP 3-12, CJCSI 6510.01F, etc.).
- **POC block** — who to call for questions, with name/rank/phone/email.
- **Body paragraphs** — numbered tasking paragraphs. Typical top-level sections:
  1. Situation / background
  2. Mission / standing tasking
  3. Execution (tasks by unit type / by warfare commander)
  4. Coordinating instructions (RFS flow, reporting requirements)
  5. Service support / admin
  6. Command and signal

Updates are issued via **AMPN** (amplification) or **NOTAL** (not-to-all) amendment messages; the current version is always whatever was most recently promulgated. A complete reissue (rather than amendment) triggers a full rebuild of the standing tasking.

## Standing tasking typical content {#standing-content}

A Navy-wide OPTASK Cyberspace Operations generally covers:

### Authorities and roles
- Who holds what cyber authority at each echelon.
- Who can task what (Fleet Cdr, CSG Cdr, IWC, NCDOC, individual unit).

### Reporting requirements
- What cyber events must be reported up, how quickly, to whom.
- Ties into CJCSM 6510.01B incident categories — Navy-specific reporting goes through NCDOC and FLTCYBERCOM.
- Periodic status reporting (daily SITREP, weekly summary, monthly assessment).

### Request for support (RFS) procedures
- How a Navy unit requests CPT/CMT support.
- How a Navy IWC requests cyber effects from USCYBERCOM.
- Ties to USCYBERCOM-GENADMIN 22-0120 (RFS SOP).

### Deconfliction procedures
- Navy-specific instructions for deconflicting cyber actions with other Navy units and joint partners.
- Ties to USCC INST 3000.14A (Technical Deconfliction).

### Protective posture adjustments
- How Navy units adjust defensive cyber posture in response to theater threat levels (INFOCON-type guidance if still current doctrine, or successor frameworks).

### Classified annexes
- Specific target lists, approved effects, specific authorities may be in classified annexes accessible only at appropriate levels.

## How an OCO request flows from a Navy unit (example) {#rfs-flow}

Hypothetical: a carrier strike group's IWC identifies an adversary C2 node that, if disrupted, would degrade adversary anti-ship targeting. The request path:

1. **IWC targeting board** approves the request and escalates to **CSG Cdr (CWC)**.
2. **CSG Cdr** forwards to **numbered fleet (e.g., 7th Fleet)** with concurrence.
3. **Numbered fleet** coordinates with **FLTCYBERCOM / C10F** for cyber feasibility and authorities.
4. **FLTCYBERCOM** packages the request and forwards to **USCYBERCOM / JFHQ-Cyber-INDOPACOM**.
5. **USCYBERCOM** performs joint deconfliction, legal review, target validation, capability match.
6. **USCYBERCOM** seeks **SECDEF/POTUS approval** if required by target category and effect.
7. **Approved tasking** cascades back down: USCYBERCOM → service component → executing CMT.
8. **Execution and BDA** reported back up the same chain; results documented in the target folder (per CJCSI 3370.01B).

Timeline for a deliberate request: days to weeks. For a time-sensitive request: can be expedited through crisis-action channels, but approval authorities remain the same.

## Reporting requirements (typical) {#reporting}

The OPTASK typically requires these reports on OCO activity:

- **CONSTAT / OPSTAT** (connection/operational status) — unit cyber posture reports.
- **CYBERSITREP / CYBER SITREP** — daily situational report from subordinate units up to FLTCYBERCOM.
- **OPREP-3 NAVY BLUE / PINNACLE / OPREP-3 NAVY UNIT SITREP** — serious incident reporting.
- **After-Action Reports (AARs)** — post-mission analysis.
- **OPSEC / counterintelligence reporting** — follow-up on any USP touch, equity breach, or attribution concern.

## Exam-testable concepts

- What authority level approves OCO? **SECDEF or POTUS** (depending on target and effect).
- Who is the supported CCMD for an OCO action? **USCYBERCOM** (or a geographic CCMD with USCYBERCOM supporting).
- Can a Navy commander self-direct OCO? **No — OCO requires higher approval and USCYBERCOM direction.**
- What publication deconflicts Navy OCO from other cyber actors? **USCC INST 3000.14A** (Technical Deconfliction of Cyberspace Operations).
- What is an OPTASK? **Operational Tasking message — a standing Navy message that tells subordinate commands the standing tasking for a mission area until rescinded or superseded.**
- What's the difference between OCO and DCO-RA? **OCO is proactive offensive; DCO-RA is reactive defensive. Both can require the same authority levels.**
- Where in an OPTASK do you find the references it implements? **REF block** (near the top, after subject).
- Name the Navy report types that carry cyber situational information. **CYBER SITREP, OPREP-3 NAVY BLUE, OPSTAT, AAR.**

## Cross-references

- **[JP-3-12 Chapter II](data/bibs/CWT-E7/references/JP-3-12%20Joint%20Cyberspace%20Operations.pdf)** — mission areas (OCO, DCO, DODIN)
- **JP-3-12 Chapter IV** — planning, execution, assessment (public)
- **NWP-3-12** — Navy implementation (restricted, summary written)
- **USCC-INST-3000.14A** — Technical deconfliction (restricted, summary below)
- **USCYBERCOM-GENADMIN-22-0120** — SOP for RFS to USCYBERCOM
- **CJCSI-3121.01B** — SROE (governs cyber self-defense and response)
- **CJCSI-3370.01B** — target development standards (targets feeding OCO)
- **JP-3-60** — joint targeting cycle (OCO targets go through this cycle)
- **CJCSM-6510.01B** — cyber incident handling (reporting framework OPTASK incorporates)
