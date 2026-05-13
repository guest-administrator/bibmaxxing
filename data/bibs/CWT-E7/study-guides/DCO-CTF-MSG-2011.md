# DCO CTF Message 131422Z JAN 11

> **⚠ Reference summary.** The 2011 message establishing the Defensive Cyberspace Operations Task Force. Not publicly released. Public adjacent: JP 3-12 Chapter II (DCO mission type) and National Security Archive FOIA docs on USCYBERCOM history.

**Bib study scope:** Study Defensive Cyberspace Operations.
**Classification / Availability:** CUI / controlled — USCYBERCOM message traffic from January 2011.

## What this message is {#what-it-is}

This is the **founding message** (dated 13 January 2011, DTG 131422Z JAN 11) that established the **DCO Task Force** construct within early USCYBERCOM. The message codified how DoD organizes reactive defensive cyberspace operations during a cyber incident — before the Cyber Mission Force was formalized in 2013.

Its importance on the Bib is **historical and doctrinal**: it's an anchor point in the DoD DCO doctrine lineage. The Bib study scope is explicit — "Study Defensive Cyberspace Operations" — meaning the Navy exam uses this message as a pointer to the DCO body of knowledge.

## The DTG notation {#dtg}

The reference name `131422Z JAN 11` is a **Date-Time Group (DTG)** in standard military format:

| Piece | Meaning |
|---|---|
| `13` | Day of month |
| `14` | Hour (24-hour) |
| `22` | Minute |
| `Z` | Zulu time (UTC) |
| `JAN` | Month |
| `11` | Year (2011) |

So "DCO CTF Message 131422Z JAN 11" translates to: message issued at 14:22 UTC on 13 January 2011. Knowing DTG decoding is a basic Navy MC/IT/CT expectation — worth reviewing.

## Historical context (2011) {#history}

The 2011 message came at a foundational moment in DoD cyber:

- **USCYBERCOM** had stood up in 2010 as a sub-unified combatant command under USSTRATCOM.
- **Cyber Mission Force (CMF)** had not yet been formally structured (that came in 2013 with the decision to build 133 CMF teams).
- Early USCYBERCOM used **task forces (TFs)** and **joint task forces (JTFs)** as operational constructs for specific missions — the DCO TF was one such construct.
- **Operation BUCKSHOT YANKEE** (2008 agent.btz incident) had demonstrated DoD needed dedicated DCO forces with clear authorities.
- The 2010 Stuxnet disclosure had publicized that nation-state cyber effects were real and DoD needed defensive counterparts.

The DCO TF message essentially codified how DoD would organize defensive reactions — forces, authorities, reporting — and became doctrinal scaffolding until the CMF matured.

## DCO fundamentals you're being tested on {#dco-fundamentals}

From JP 3-12 Chapter II (public, on disk), the DCO framework:

**Defensive Cyberspace Operations (DCO)** — missions to preserve the ability to use friendly cyberspace capabilities and protect data, networks, and cyberspace-enabled devices by **defeating specific threats** that have breached or are attempting to breach DODIN security.

### Two sub-categories

| Sub-type | Full | Where executed | Authority |
|---|---|---|---|
| **DCO-IDM** | Internal Defensive Measures | Inside friendly cyberspace (DoD-owned / blue space) | Routine operational — CPT / NCDOC level |
| **DCO-RA** | Response Actions | Outside friendly cyberspace (gray / red space) | Elevated — typically SECDEF/POTUS |

### DCO-IDM examples

- Isolating an infected subnet from the rest of the enclave.
- Resetting compromised credentials on DoD Active Directory.
- Blocking a malicious IP at the enclave firewall.
- Killing a malicious process on a DoD endpoint.
- Deploying new IDS signatures to network sensors.
- Hunt missions on DoD networks (CPT on-mission work).

### DCO-RA examples

- Disabling an adversary C2 server being used to attack DoD (outside DoD networks).
- Pre-emptively neutralizing a staged attack infrastructure.
- Redirecting an adversary implant away from DoD systems via the adversary's own C2 channel.

DCO-RA is effectively "defensive OCO" — using OCO-like tradecraft to neutralize an active or imminent threat. Because the effect occurs outside friendly cyberspace, it raises the same sovereignty / international-law issues as OCO and requires elevated approval.

## DCO vs DODIN Operations {#dco-vs-dodin}

Critical distinction heavily tested:

| Mission | Posture | Trigger | Forces | Example |
|---|---|---|---|---|
| **DODIN Ops** | Proactive baseline | Routine / continuous | DoD IT / NCDOC / service network ops | Patch management, STIG compliance, log monitoring, firewall rule baseline |
| **DCO-IDM** | Reactive inside | Known threat inside blue space | CPT / NCDOC hunt | Isolate subnet where active malware is detected |
| **DCO-RA** | Reactive outside | Imminent / ongoing attack from red space | CMT-style with SECDEF approval | Disable adversary C2 server |
| **OCO** | Offensive | Operational / strategic objective | CMT | Disable adversary radar grid during kinetic op |

The **DODIN Ops → DCO-IDM** threshold is crossed when a specific threat is identified (not generic hygiene). The **DCO-IDM → DCO-RA** threshold is crossed when the response crosses out of friendly cyberspace.

## Blue / gray / red cyberspace {#cyberspace-coloring}

Doctrinal cyberspace terrain is color-coded:

- **Blue cyberspace** — DoD-owned or -operated networks; friendly.
- **Gray cyberspace** — neutral or uncontested cyberspace (internet infrastructure, allied, commercial). No clear ownership by adversary or friend.
- **Red cyberspace** — adversary-controlled networks.

DCO-IDM is blue-only. DCO-RA crosses into gray/red. OCO is gray/red by definition.

## How this flows to NCDOC and afloat units {#navy-flow}

For Navy:

- **NCDOC** executes the bulk of Navy DCO-IDM — hunt, incident response, threat-specific actions on Navy networks.
- **Navy CPTs** provide surge DCO-IDM on specific missions or commands.
- **Afloat ITs / CTNs** execute local DCO-IDM at the platform level, reaching back to NCDOC.
- **DCO-RA** on Navy missions would be requested via an **RFS to USCYBERCOM** and executed by USCC-controlled CMF or national forces.

A Navy CWT E-7 is unlikely to personally execute DCO-RA — but is expected to know the concept, the authority barrier, and how a DCO-RA requirement escalates.

## Incident reporting relationship {#incident-reporting}

DCO activity is tightly coupled to incident reporting (CJCSM 6510.01B):

- Detected incident triggers DCO-IDM response (contain, eradicate, recover).
- Incident category (CAT 1 through CAT 7) drives reporting timelines.
- Significant incidents may trigger RFS for CPT support.
- CAT 1 root-level intrusions typically see the full DCO response lifecycle from detection through post-incident analysis.

## Exam-testable concepts {#testable}

- What is the DTG format for the DCO CTF message? **131422Z JAN 11 = 14:22 Zulu, 13 January 2011.**
- What two sub-types does DCO have? **DCO-IDM and DCO-RA.**
- Memory aid for the difference? **IDM = Inside DoD cyberspace; RA = Reaching out beyond.**
- What Navy organization typically executes DCO-IDM on Navy networks? **NCDOC + Navy CPTs.**
- What authority is needed for DCO-RA? **SECDEF/POTUS-level approval (effects in adversary space).**
- What's the difference between DCO and DODIN Operations? **DODIN Ops is routine/proactive network security; DCO is threat-driven reactive defense.**
- What are blue, gray, and red cyberspace? **Blue = friendly/DoD; Gray = neutral/internet; Red = adversary.**
- When did USCYBERCOM stand up? **2010 as sub-unified under USSTRATCOM; elevated to full unified combatant command May 2018.**
- What operation in 2008 demonstrated DoD's need for DCO forces? **Operation BUCKSHOT YANKEE (agent.btz response).**
- Is hunt on DoD networks DCO-IDM or DODIN Ops? **DCO-IDM — hunt is threat-driven reactive work on blue space.**

## Cross-references

- **[JP-3-12 Chapter II](data/bibs/CWT-E7/references/JP-3-12%20Joint%20Cyberspace%20Operations.pdf)** (public, on disk) — authoritative DCO framework
- **NWP-3-12** (restricted, summary written) — Navy implementation
- **CPT-ORG-3-33.4** (restricted, summary written) — CPT DCO execution
- **CJCSM-6510.01B** (public, on disk) — Cyber Incident Handling Program (DCO incident response)
- **FDCD-2017** (restricted, summary written) — Navy fleet design for cyber defense
- **OPTASK-CYBERSPACE-OPS** — standing tasking that implements DCO doctrine operationally
- **USCYBERCOM-GENADMIN-22-0120** — RFS SOP (how a supported command requests DCO support beyond organic)
