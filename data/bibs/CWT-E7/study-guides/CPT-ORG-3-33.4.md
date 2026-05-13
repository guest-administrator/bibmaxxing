# Cyber Protection Team Organization, Functions, and Employment v3-33.4

> **⚠ Reference summary, not a full study guide.** This is a USCYBERCOM / service-component doctrine publication (CUI). Public adjacent: JP 3-12 Chapter III + Army FM 3-12 (public) + National Security Archive FOIA'd cyber-mission-force documents.

**Bib study scope:** Appendices A, B; Chapters 2, 3.
**Classification / Availability:** CUI — USCYBERCOM / service cyber component distribution.

## What this document is {#what-it-is}

This publication — sometimes cited as **CPT ORG**, **FM 3-33.4**, or **USCYBERCOM Publication on CPT Employment** — defines the organization, functions, and employment doctrine for **Cyber Protection Teams (CPTs)** across the Cyber Mission Force. CPTs are the DoD's quick-reaction defensive force — they deploy to defend priority DoD missions and networks against active cyber threats.

The doctrine governs CPT structure (how many personnel, what roles, what squad/element composition), mission sets (what CPTs do when deployed), and employment (how CPTs are requested, aligned, and tasked).

## The Cyber Mission Force (CMF) — CPT's context {#cmf-context}

The Cyber Mission Force is USCYBERCOM's collection of **133 teams** (the original 2013 build-out target; the current total is approximately 147 as of the 2023 force expansion), allocated across five team types:

| Team type | # Approx | Primary mission | "Inside" or "outside" friendly cyberspace |
|---|---|---|---|
| **CPT (Cyber Protection)** | ~68 | DCO-IDM (defend) | Inside |
| **CMT (Combat Mission)** | ~27 | OCO (project power) | Outside |
| **CST (Combat Support)** | ~25 | Intel + planning for CMTs | Inside/outside (supports CMT) |
| **NMT (National Mission)** | ~13 | Defend nation, strategic | Outside |
| **NST (National Support)** | ~14 | Intel + planning for NMTs | Inside/outside |

(Exact numbers shift with restructuring; what's stable is the ratio — CPTs are roughly half of the CMF because DCO has larger demand than OCO.)

CPTs are service-sourced:

- **Army CPTs** — largest share of the fleet, focused on Army networks + joint mission defense.
- **Navy CPTs** — under FLTCYBERCOM / subordinate NIOCs; protect Navy priority missions (CSG deployments, fleet-critical shore nodes, specific weapons systems during key phases).
- **Air Force CPTs** — under 16th AF; protect AF networks and supported missions.
- **Marine Corps CPTs** — under MARFORCYBER; protect MAGTF networks.
- **National CPTs** — attached to USCYBERCOM directly for DoD-wide priority missions.

## CPT structure (publicly known baseline) {#structure}

From USCYBERCOM and service public releases, a standard CPT is composed of roughly **39 personnel** organized into elements:

- **Team Lead / Deputy** — typically an O-4/O-5 officer and senior NCO (E-8/E-9).
- **Mission Protection Team (MPT) / Mission Protect Element** — the "shooters" — executes DCO-IDM actions on the defended network (analyst-operators who take live action).
- **Cyber Readiness Team (CRT) / Assess Element** — assesses the defended network's baseline posture, identifies vulnerabilities before a mission begins.
- **Discovery & Counter-Infiltration (D&CI) / Hunt Element** — hunt-focused analysts looking for adversary presence.
- **Cyber Support Team / Cyber Threat Emulation** — may be resident or reach-back; emulates adversary TTPs during assessments.
- **Host/Network Analysts, Reverse Engineers, Exploitation Analysts** — specialist roles.

Typical CPT sub-element sizes (per Army FM 3-12 public baseline and service public releases): Mission Protect around 10-12 personnel, Assess/CRT around 4-6, Hunt/D&CI around 6-8, plus enablers (forensics, reverse engineering, intel analyst) and team leadership.

## CPT sub-elements in detail {#sub-elements}

### Mission Protect / MPT

The **action element** — takes live defensive action on the defended network. Composition typically mirrors a SOC team with hardened analyst credentials:

- Senior host analyst
- Senior network analyst
- Cyber operations specialists (enlisted analysts — often CTNs for Navy CPTs)
- Supervisor / element lead

Actions: isolate compromised hosts, push firewall rules, kill malicious processes, reset credentials, deploy additional sensing, coordinate with defended-network admins for large-scale containment.

### Cyber Readiness Team / Assess Element (CRT)

The **assessment arm** — conducts pre-mission network security assessments:

- Reviews documentation, architecture, configuration.
- Benchmarks posture against STIGs, CIS controls, NIST frameworks.
- Identifies exploitable gaps before adversary finds them.
- Produces a posture baseline that the Hunt and Protect elements use.

Analogous to commercial "purple team" or penetration-testing assessment engagement, but scoped to DoD missions.

### Discovery & Counter-Infiltration / Hunt Element (D&CI)

The **adversary-discovery arm** — threat hunts on the defended network:

- Uses IoCs (indicators of compromise) from intelligence feeds.
- Hypothesis-driven hunting against suspected adversary TTPs.
- Long-dwell adversary discovery (APTs often persist for months).
- Hands off findings to MPT for containment.

### Cyber Threat Emulation / Red

The **adversary-simulation arm** — emulates real adversaries to test defenses:

- Uses known adversary TTPs (MITRE ATT&CK framework mapping).
- Runs controlled intrusion exercises with defended-commander buy-in.
- Surfaces gaps the Assess element's document review might miss.

### Enablers

- **Reverse engineers** — analyze malware samples found during missions.
- **Forensic analysts** — do DFIR-style analysis on compromised systems.
- **Intelligence analyst** — threat context; coordinates with NSA/CIA/DHS intel feeds.
- **Cyber planner** — integrates with supported commander's operations staff.

## Expected scope of the Bib's study chapters {#bib-chapters}

- **Chapter 2** typically covers **CPT organization** — squad/element composition, rank structure, mission set alignment.
- **Chapter 3** typically covers **CPT employment** — how a CPT is requested, how alignment to supported commanders works, deployment lifecycle (alert → deploy → assess → execute → redeploy).
- **Appendices A and B** typically contain organizational diagrams, reporting chains, and employment scenarios.

## CPT mission sets {#mission-sets}

CPTs do **DCO-IDM** — Internal Defensive Measures — inside friendly cyberspace. They do **NOT** do OCO and do **NOT** (routinely) do DCO-RA. Core CPT mission sets typically include:

- **Threat Emulation / Red Team-style assessment** (pre-mission, with supported commander's buy-in)
- **Hunt Missions** — proactive adversary discovery
- **Incident Response** — reactive engagement against a known or suspected intrusion
- **Digital Forensics / Malware Triage** on the defended network
- **Security Posture Assessment** — benchmark of the defended network before/after

Mission phases follow a standard lifecycle:

1. **RFS (Request for Support) / tasking** — supported commander requests CPT, or USCYBERCOM directs CPT deployment.
2. **Mission scoping** — CPT leadership and supported commander agree on scope, boundaries, rules of engagement.
3. **Pre-deployment planning** — intel review, tool preparation, credentials provisioning.
4. **On-network assessment** — CRT works first; MPT and D&CI follow.
5. **Active engagement** — if adversary presence is found or incident escalates.
6. **Reporting and closeout** — after-action report, recommended posture changes, handoff to local IT/security staff.
7. **Redeployment** — CPT rotates to next mission.

## Command relationships {#command-relationships}

- **OPCON:** USCYBERCOM (for mission employment), typically delegated to JFHQ-Cyber or the service component.
- **ADCON:** Parent service (for manning, training, equipping) — Army/Navy/AF/USMC via their respective service cyber component.
- **Supporting relationship:** to the commander owning the defended network/mission (the "supported commander" who requested the CPT).

The CPT does not take tasking directly from the supported commander on engagement actions — those flow through the CPT chain of command. The supported commander provides guidance on what mission to protect and grants access to the network; the CPT chain controls how the CPT operates on it.

## CPT rules of engagement (cyber ROE) {#cpt-roe}

CPT actions follow:

- **CJCSI 3121.01B (SROE)** for self-defense fundamentals.
- **USCYBERCOM-specific ROE / supplemental ROE** for cyber actions (often more restrictive than SROE because effects can propagate).
- **Defended network's access agreement** — CPTs operate on the defended network under a specific scope and won't reach into adjacent systems without renewed authority.
- **Attribution caution** — before defensive action that could affect adversary systems (even indirectly), USCYBERCOM's deconfliction process is invoked (USCC INST 3000.14A).

## Training and qualification {#training}

CPT members are typically Joint Cyber Analysis Course (JCAC)-qualified plus additional specialty training:

- **JCAC** — 6-month Pensacola-based foundational cyber course for enlisted/officers across services; on this Bib as JCAC-series references.
- **Service-specific qualification** — Navy's Cryptologic Warfare Officer qualification for 1810s; CTN A-school + C-schools for enlisted.
- **USCYBERCOM certification levels** — Basic (CT-1), Intermediate (CT-2), Advanced (CT-3). Specific CPT roles require specific CT levels.
- **Red team / purple team exercises** — continual internal training.

## Exam-testable concepts

- What does a CPT primarily execute? **DCO (specifically DCO-IDM)**.
- Where does a CPT operate geographically? **Inside DoD-owned cyberspace (friendly networks)**.
- Who OPCONs a CPT during a mission? **USCYBERCOM** (usually delegated through JFHQ-Cyber or a service cyber component).
- Roughly how many personnel are on a standard CPT? **~39**.
- What CPT element is typically the "action arm" for live DCO? **Mission Protection Team (MPT)**.
- What is the CPT element that does pre-mission baseline assessment? **Cyber Readiness Team (CRT)**.
- Which CPT element specifically threat-hunts for adversary presence? **Discovery & Counter-Infiltration (D&CI).**
- Is OCO a CPT mission? **No — CPTs do DCO-IDM. OCO is a CMT mission.**
- Approximately how many CPTs does the CMF have? **Around 68** (out of 133+ total CMF teams).
- What foundational course trains CMF personnel? **Joint Cyber Analysis Course (JCAC)** at Pensacola.
- What ROE document governs a CPT's self-defense? **CJCSI 3121.01B (SROE)** plus USCYBERCOM supplemental.
- What instruction governs CPT / joint cyber deconfliction? **USCC INST 3000.14A.**

## Cross-references

- **JP-3-12 Chapter III** (you have it) — public description of CMF and CPTs
- **CFCOE-V4.1** — Navy CPT employment specifics (restricted)
- **NWP-3-12** — Navy cyber doctrine (restricted)
- **[Army FM 3-12 Cyberspace Operations and EW](https://armypubs.army.mil/ProductMaps/PubForm/Details.aspx?PUB_ID=1020716)** — Army's public doctrine with parallel CPT organization details
- **[National Security Archive Cyber Mission Force FOIA docs](https://nsarchive.gwu.edu/news/cyber-vault/2019-05-03/preparing-computer-network-operations-uscybercom-documents-trace-path-operational-cyber-force)** — declassified CMF construction documents
- **CJCSI-3121.01B** — SROE (governs CPT self-defense)
- **USCC-INST-3000.14A** — joint technical deconfliction
- **CJCSM-6510.01B** — cyber incident handling (CPT reporting feeds into this framework)
- **JCAC-ACTIVE-EXPLOIT** — CPT D&CI analysts use these skills
- **JCAC-FORENSIC-MAL** — CPT forensics / reverse engineering
