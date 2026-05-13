# CJCSM 6510.01B — Cyber Incident Handling Program

**Bib study scope:** Enclosures B, D.

**Source on disk:** `CJCSM-6510.01B Cyber Incident Handling Program.pdf`.

## What this manual is {#what-it-is}

CJCSM 6510.01B (10 July 2012) is the **DoD-wide cyber incident handling manual**. It defines the terminology, categories, reporting timelines, and processes that the DoD uses to handle any cyber incident from detection through closure. Every DoD component — Services, CCMDs, Defense Agencies — operates under its framework.

It's the implementation manual that sits underneath **CJCSI 6510.01F** (IA/CND) and extends the **NIST SP 800-61** incident-handling lifecycle for DoD operational realities.

## Why this reference matters on the exam {#why-it-matters}

Incident handling is the single most-tested operational skill on the CWT Bib because it's the single most-performed operational skill in every cyber billet. Watch-floor operators at NCDOC, CPT members, NOSC analysts, and ship's-force ITs all execute this doctrine. The exam expects you to:

- Recite the 10 Category definitions without hesitation.
- Distinguish an **event** from an **incident**.
- Know the reporting chain from individual command up to USCYBERCOM.
- Know the NIST lifecycle phases and what happens in each.
- Know the forensic preservation hierarchy (Order of Volatility).

Incident handling is the place where CJCSI 6510.01F (policy), CJCSM 6510.01B (manual), NIST SP 800-61 (industry baseline), and operational practice converge.

## The incident-handling lifecycle {#lifecycle}

DoD uses a four-phase model aligned with NIST SP 800-61:

1. **Preparation** — organizational readiness: policy, tools, training, inventory, baselines, playbooks.
2. **Detection and Analysis** — monitor for events, detect anomalies, characterize them as incidents.
3. **Containment, Eradication, and Recovery** — limit damage, remove the threat, restore service.
4. **Post-Incident Activity** — lessons learned, process improvements, reporting closeout.

Enclosure B in CJCSM 6510.01B typically formalizes this lifecycle with DoD-specific procedures.

### Phase 1: Preparation (before anything happens)

- Policies, SOPs, playbooks for each incident type.
- Tools deployed and instrumented (SIEM, EDR, packet capture, netflow, forensic kit).
- Trained personnel (JCAC-qualified responders, CPT pipeline, CISSP/equivalent for leadership).
- Network architecture baselines — you must know normal before you can detect abnormal.
- Asset inventory — you can't defend what you don't know exists.
- Contact lists — legal, PA, command, higher HQ.
- Evidence-handling gear — write-blockers, forensic laptops, chain-of-custody forms.

### Phase 2: Detection and Analysis

- **Detection sources**: SIEM alerts, IDS/IPS, user reports, external tippers (DC3, FBI, allied partners), intel feeds.
- **Event triage**: determine whether the signal is a real incident, a false positive, or requires more investigation.
- **Scoping**: how many hosts, how much data, what users affected, how long ongoing.
- **Classification into CAT**: assign a category (see below).
- **Prioritization**: based on mission impact, adversary capability, data sensitivity.
- **Notification**: initial notifications up-chain within the reporting window.

### Phase 3: Containment, Eradication, and Recovery

- **Short-term containment**: immediate isolation (network segmentation, host quarantine, credential disable).
- **Evidence preservation**: forensic images, memory captures, log exports — done BEFORE destructive remediation. Order-of-Volatility (see forensics section).
- **Long-term containment**: rebuild strategy, temporary workarounds while preparing full remediation.
- **Eradication**: remove adversary persistence, malware, unauthorized accounts, modified files.
- **Recovery**: restore systems from known-good baseline, validate integrity, monitor for adversary return.
- **Declared clean**: formal decision point where the incident transitions out of active response.

### Phase 4: Post-Incident Activity

- **After-action review / lessons learned meeting** — usually within days of closure.
- **Improvement items** — updates to playbooks, tools, training, architecture.
- **Final report** — closes the incident record with full timeline, impact, remediation.
- **Metrics contribution** — incident fed into trend analysis for future planning.

## The Category (CAT) taxonomy — Enclosure B core content {#categories}

DoD categorizes every cyber event into one of these CAT designations. **Memorize the definitions — this is high-frequency exam territory:**

| CAT | Name | Incident or Event | Description |
|---|---|---|---|
| **CAT 0** | Exercise / Network Defense Testing | Neither | Used during exercises / authorized tests to distinguish from real incidents. |
| **CAT 1** | Root-Level Intrusion | **Incident** | Unauthorized privileged (admin/root) access obtained. |
| **CAT 2** | User-Level Intrusion | **Incident** | Unauthorized non-privileged user access obtained. |
| **CAT 3** | Unsuccessful Activity Attempt | Event | Deliberate attempt to gain access that failed. |
| **CAT 4** | Denial of Service | **Incident** | DoS attack successful or in progress. |
| **CAT 5** | Non-Compliance Activity | Event | Poor-practice activity by an insider (not malicious; e.g., using unauthorized software). |
| **CAT 6** | Reconnaissance | Event | Activity that suggests preparation for an attack (scans, probes). |
| **CAT 7** | Malicious Logic | **Incident** | Malware present — regardless of effectiveness. |
| **CAT 8** | Investigating | Event | Suspicious activity under initial analysis; re-categorized when characterized. |
| **CAT 9** | Explained Anomaly | Event | Anomaly reviewed and found to be benign. |

Exam traps to watch for:

- **Incident vs Event** — CAT 1, 2, 4, 7 are **incidents** (something bad happened). CAT 3, 5, 6, 8, 9 are **events** (observed activity that may or may not warrant response). CAT 0 is neither.
- **CAT 7 is malicious logic present**, regardless of execution. Malware on disk is CAT 7 even if it hasn't run.
- **CAT 1 and CAT 2 differ only in privilege level** obtained by the attacker.
- **CAT 3** = attempt that **didn't succeed**. If it succeeded, it becomes CAT 1, 2, or 7.
- **CAT 5** is an **insider non-compliance** (not malicious). If the insider is malicious, you're looking at CAT 1 or 2.
- **CAT 6** is **reconnaissance** (scans, probes that don't exploit). If exploitation starts, it's CAT 3 (failed) or CAT 1/2 (succeeded).
- **CAT 8** is a placeholder — every event starts at CAT 8 and gets re-categorized once you know what happened.

## Reporting timelines {#timelines}

CJCSM 6510.01B sets **reporting timelines** based on category. Generally:

- **Initial (priority) notification** to higher HQ / JFHQ-DODIN / USCYBERCOM within hours (shorter for higher categories). High-severity CATs (1, 4, 7 on priority networks) have notification windows measured in minutes.
- **Incident response plan activated** immediately for CAT 1, 2, 4, 7.
- **Periodic updates** during the incident — typically every 24 hours, more often for active/high-impact.
- **Closure report** after recovery with full timeline and lessons learned.

Specific timelines for Navy flow through NCDOC and up to USCYBERCOM J3. Failure to report on time is itself a compliance finding.

Reporting precedence on the Navy side follows OPREP-3 Navy Blue / Navy Unit SITREP rules for significant events, with cyber-specific message traffic to NCDOC + FLTCYBERCOM routine.

## Enclosure D — reporting formats and metrics {#enclosure-d}

Enclosure D typically contains the **reporting formats** and **required data elements** for cyber incident reports. Common fields:

- Incident ID / tracking number.
- Category.
- Source / target IPs and hostnames.
- Affected systems, networks, data.
- Detection method.
- Attack vector.
- Indicators of Compromise (IOCs).
- Timeline (first observation, detection, notification, containment, eradication, recovery, closure).
- Impact assessment.
- Lessons learned.

Some Enclosure D content is implementation detail (JIMS, Joint Incident Management System, or successor systems) for how reports are submitted. Navy uses NCDOC's internal systems which feed USCYBERCOM.

### Required data in an initial cyber incident report (typical)

- **Who** — reporting command, POC.
- **What** — CAT assignment and one-line description.
- **When** — initial observation DTG, detection DTG.
- **Where** — affected system(s), IP addresses, hostnames, geographic location.
- **How** — attack vector if known (e.g., "phishing link → malicious payload → credential theft").
- **So what** — mission impact (degraded capability, data loss, reputational exposure).

### Follow-on report fields

Subsequent updates add: containment actions taken, evidence preserved, external notifications made (law enforcement, intel community, allied partners), resources requested (CPT support, forensic lab services), and updated timeline.

## Roles and responsibilities across DoD {#roles}

- **USCYBERCOM** — ultimate authority; JFHQ-DODIN and JFHQ-Cyber execute.
- **JFHQ-DODIN** — operates/secures the DODIN; directs global DODIN defensive actions.
- **JFHQ-Cyber (regional: INDOPACOM, EUCOM, etc.)** — directs cyber operations in support of geographic CCMDs.
- **Service Cyber Components** — for Navy, FLTCYBERCOM / TENTH Fleet / NCDOC execute Navy-level handling.
- **CCMDs** — handle cyber incidents affecting their networks.
- **Defense Agencies** — handle incidents on their enclaves (DISA, DIA, NSA as appropriate).
- **Individual commands** — first responders; notify, contain, and report up.

### Navy-specific chain

```
Affected command → Command IA/ISSM → Regional NIOC → NCDOC → FLTCYBERCOM → USCYBERCOM
```

Details:

- **Command IA/ISSM (Information System Security Manager)** — command-level authority responsible for the command's information security; local escalation point.
- **Regional NIOC (Navy Information Operations Command)** — geographic cyber HQ (Norfolk, Hawaii, Georgia, Yokosuka, etc.).
- **NCDOC (Navy Cyber Defense Operations Command)** — Navy-wide 24/7 operational watch, DCO-IDM authority, feeds USCYBERCOM.
- **FLTCYBERCOM / C10F** — Navy's service cyber component.
- **USCYBERCOM** — joint/DoD-wide authority, coordinates with NSA (via dual-hat), DHS, FBI, intel community.

## Forensic preservation requirements {#forensics}

For any CAT 1 / 2 / 4 / 7 incident, CJCSM 6510.01B requires **forensic preservation** of evidence:

- Memory capture before shutdown (preserves volatile state).
- Disk imaging before re-imaging or destruction.
- Log preservation (system, security, application, firewall, IDS).
- Chain of custody maintenance.
- Malware sample preservation in isolated storage.

Ties directly to JCAC-FORENSIC-MAL's Order of Volatility:

1. **CPU registers / cache** — lost within microseconds.
2. **Routing table, ARP cache, process list, kernel statistics, memory** — lost on power loss or reboot.
3. **Temporary filesystem contents** — may survive short reboots.
4. **Persistent disk** — non-volatile but can be overwritten.
5. **Remote logging and monitoring data** — only as volatile as remote systems keep it.
6. **Physical configuration, network topology** — persistent but changes with operational tempo.
7. **Archival media** — most stable, may have scheduled retention.

Rule: collect in order of volatility (most volatile first) to preserve maximum evidence.

### Chain of custody

Every piece of evidence requires a documented chain of custody:

- Who collected it, when, from where.
- Each handoff: from whom, to whom, when, for what purpose.
- Integrity verification: cryptographic hash (SHA-256 at minimum) computed at collection and re-verified at each handoff.
- Storage: tamper-evident container, secure storage facility, access log.

Failure of chain of custody destroys evidentiary value for legal or administrative action.

## Integration with CPT deployment {#cpt-integration}

For incidents that exceed local/regional capacity, the affected command can request a **Cyber Protection Team (CPT)** through the RFS process (see USCYBERCOM-GENADMIN-22-0120). CPT executes DCO-IDM on the defended network.

CPT request triggers:

- Active, sophisticated adversary presence suspected or confirmed.
- Incident scope exceeds organic forensic or DCO capacity.
- Mission-critical systems affected requiring senior-analyst response.
- Cross-boundary incident touching multiple commands or services.

CPT deployment lifecycle (from CPT-ORG-3-33.4):

1. Supported commander submits RFS.
2. USCYBERCOM / JFHQ-Cyber / service component approves and schedules.
3. CPT pre-deployment planning (scope, ROE, tools, authorities).
4. On-network assessment (CRT leads).
5. Active engagement (MPT + D&CI).
6. Handoff / redeployment.

## Relationship to other frameworks {#frameworks}

CJCSM 6510.01B builds on and extends:

- **NIST SP 800-61 Rev.2 (Computer Security Incident Handling Guide)** — the civilian baseline DoD adopts and expands. The four-phase lifecycle comes from here.
- **NIST SP 800-53** — security controls referenced for preparation-phase posture.
- **NIST SP 800-86 (Guide to Integrating Forensic Techniques into IR)** — forensic handling baseline.
- **ISO/IEC 27035** — international incident management standard (DoD aligns but doesn't directly adopt).
- **FIRST (Forum of Incident Response and Security Teams)** — the international community framework; DoD participates through USCYBERCOM / DoD-CERT.

## Exam-testable concepts

- What CAT is a root-level intrusion? **CAT 1.**
- What CAT is a DoS? **CAT 4.**
- What CAT is an unsuccessful attempt? **CAT 3.**
- What CAT is malware present on a DoD system? **CAT 7** (regardless of execution).
- What CAT is used during exercises? **CAT 0.**
- What CAT is used when analysis is still ongoing? **CAT 8** (investigating).
- Four phases of incident handling? **Preparation → Detection & Analysis → Containment/Eradication/Recovery → Post-Incident Activity.**
- What NIST publication is CJCSM 6510.01B aligned with? **NIST SP 800-61 Rev.2.**
- Who's the ultimate DoD cyber incident handling authority? **USCYBERCOM.**
- First step when a CAT 1 is discovered? **Contain + notify; begin forensic preservation.**
- What's the Navy-specific path up from a command-level incident? **Command → NIOC/ISSM → NCDOC → FLTCYBERCOM → USCYBERCOM.**
- Which CATs are incidents vs events? **Incidents: 1, 2, 4, 7. Events: 3, 5, 6, 8, 9. CAT 0 is neither (exercise).**
- What is preserved first in forensic collection? **Most volatile — CPU registers/cache, memory, then disk, then archive.**
- What hashes are used for evidence integrity? **SHA-256 at minimum** (legacy MD5/SHA-1 no longer acceptable for evidentiary integrity).
- What document triggers a CPT deployment request? **RFS (Request for Support)**, per USCYBERCOM-GENADMIN-22-0120 SOP.
- Who is the command-level authority responsible for reporting a cyber incident first? **The command's IA/ISSM** (Information System Security Manager).

## Cross-references

- **[CJCSI-6510.01F](#references/CJCSI-6510.01F)** (on disk) — IA and CND parent instruction
- **[NIST SP 800-61 Rev.2](https://csrc.nist.gov/pubs/sp/800/61/r2/final)** — parent incident-handling model
- **[JP-3-12](#references/JP-3-12)** — cyberspace doctrine framework
- **NWP-3-12** (restricted, summary written) — Navy implementation
- **JCAC-FORENSIC-MAL** — forensic preservation that incident response depends on
- **CPT-ORG-3-33.4** — CPT organization (CPTs augment command-level incident response)
- **DCO-CTF-MSG-2011** (restricted) — DCO task force founding (related DCO concept)
- **USCYBERCOM-GENADMIN-22-0120** — RFS SOP (how to request CPT support)
- **NIST SP 800-86** — forensic handling baseline
