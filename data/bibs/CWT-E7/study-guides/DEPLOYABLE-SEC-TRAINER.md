# Deployable Security Trainer

> **⚠ Reference summary.** The exact document on the Bib labeled "Deployable Security Trainer" is a specific Navy training module. Access is through the training command that owns it — typically a NIOC, Center for Information Warfare Training (CIWT), or your command's IAM. Public adjacent material: DoD Cyber Exchange and CDSE free catalog, both substantively cover the same security-awareness and IA ground.

**Bib study scope:** Section 7.
**Classification / Availability:** Navy training material — CUI / controlled distribution.

## What it likely is {#what-it-is}

"Deployable Security Trainer" on a Navy CWT Bib typically refers to one of:

- A **portable / deployable training module** used aboard ships, forward-deployed units, or remote detachments to satisfy annual information-assurance and security training requirements away from shore-side CAC workflows.
- A **training application or package** issued by a Navy training command (CIWT / NIOC-affiliated schoolhouse).
- A **cybersecurity awareness / cryptologic compliance** module specific to deployed cryptologic elements.

In all cases, its purpose is to keep deployed personnel current on IA, OPSEC, SIGINT compliance (USSID 18), and safeguarding procedures.

## Why "deployable" matters {#deployable-context}

Navy afloat and forward-deployed units face unique training constraints:

- **Intermittent connectivity** — SATCOM bandwidth is not always available for online training portals.
- **CAC / PKI access issues** — shipboard PKI infrastructure can lag; deployed crypto custodians may not have immediate access to CAC-protected training servers.
- **Training catchup cycles** — afloat personnel rotate back to shore with expired training that needs to be current to stay qualified.
- **Mission tempo** — deployed units can't always release personnel for multi-hour training during operations.

A deployable trainer is designed to run **offline**, **locally**, or on **shipboard LAN** with minimal network dependency — solving the "how does a Sailor stay current on annual training at sea?" problem.

## Common Navy mandatory training topics {#mandatory-training}

Every Navy member — especially cryptologic / IW personnel — has a rotating set of mandatory training:

| Training | Frequency | Topic |
|---|---|---|
| **DoD Cyber Awareness Challenge** | Annual | Phishing, classification, insider threat, cyber hygiene |
| **Counterintelligence Awareness** | Annual | Foreign intel services, reporting suspicious contact |
| **Information Security / OPSEC** | Annual | Classification, marking, safeguarding |
| **Sexual Assault Prevention (SAPR)** | Annual | Prevention, reporting, response |
| **Suicide Prevention / ACT** | Annual | Recognition, intervention |
| **Anti-Terrorism Level I** | Annual | Personal protective measures, threats |
| **Records Management** | Annual | Proper records handling, retention |
| **Privacy Act / PII** | Annual | Handling PII, breach reporting |
| **Unauthorized Disclosure (UD)** | Annual (IC personnel) | What constitutes UD, reporting |
| **USSID 18 refresher** | As required | SIGINT U.S. person rules (CT / IS community) |

Deployable trainers typically package several of these into one offline module so a ship's IAM / ISSM can verify training status for the crew.

## Section 7 — expected content {#section-7}

Section 7 of most deployable security training modules covers **incident reporting and escalation**: what constitutes a reportable event (classified-spill, unauthorized disclosure, cyber incident), who to notify first, what information to capture, and timelines.

Exam questions likely test:

- Who is notified first on a classified spill (the cognizant security officer / ISSO / information system security manager).
- How quickly an event must be reported (often "immediately" with specific hours-level escalation).
- What information goes into an initial incident report.
- Spillage vs compromise vs unauthorized disclosure distinctions.

## Spill, compromise, and disclosure terminology {#spillage}

Three related but distinct terms heavily tested:

| Term | Definition | Example |
|---|---|---|
| **Spillage** | Classified info on a system not authorized for that classification | SECRET email sent to NIPR account |
| **Compromise** | Unauthorized disclosure or loss of classified info — confirmed leak | Classified document found in public trash |
| **Unauthorized Disclosure (UD)** | Any communication/physical transfer of classified to an unauthorized recipient | Briefing cleared-but-not-read-in person, posting on social media |

Spillage may or may not rise to compromise depending on the downstream exposure. All three require reporting up the chain — the specific reporting path differs.

## Reporting paths {#reporting-paths}

General reporting flow for a cyber / security incident in a Navy context:

1. **Discovering member** → reports immediately to supervisor or ISSM/IAM/security manager.
2. **ISSM/IAM** → notifies command security manager and command CO/XO.
3. **Command** → reports up administrative chain **and** operational chain as required.
4. **Cyber incident:** reports via CJCSM 6510.01B — to CSSP, NCDOC, USCYBERCOM as category requires.
5. **Classified spillage/compromise:** reports via SECNAV M-5510.36 — to security manager, DON CAF, DoD CAF as applicable.
6. **USSID 18 USP violation:** reports to NSA OGC via cognizant cryptologic chain; USSID 18 compliance officer.

Knowing **which chain for which incident** is the testable point.

## Public equivalents that cover the same topics {#public-equivalents}

| Topic | Public source |
|---|---|
| Cyber awareness training | [DoD Cyber Awareness Challenge](https://public.cyber.mil/training/cyber-awareness-challenge/) |
| Classification markings / handling | [CDSE — Information Security eLearning](https://www.cdse.edu/Training/eLearning/) |
| Classified spill reporting | SECNAV M-5510.36 (on disk, the manual you have) + CDSE module "Unauthorized Disclosure" |
| U.S. person protection / SIGINT compliance | USSID 18 (public redacted, on disk) |
| Cyber incident reporting | [CJCSM 6510.01B](data/bibs/CWT-E7/references/CJCSM-6510.01B%20Cyber%20Incident%20Handling%20Program.pdf) (on disk) |
| Counterintelligence awareness | [CDSE CI Awareness](https://www.cdse.edu/Training/Counterintelligence/) |
| OPSEC | [CDSE OPSEC Awareness](https://www.cdse.edu/Training/OPSEC/) |

## Exam-testable concepts {#testable}

- What is the first action when a classified spill is discovered? **Contain the spill, notify the ISSM / cognizant security officer immediately.**
- What publication governs DoD cyber incident categorization? **CJCSM 6510.01B**.
- What USSID governs U.S. person information protection during SIGINT collection? **USSID 18**.
- What Navy program governs information security locally on a ship? **SECNAVINST/SECNAV-M 5510.36 (DON Information Security Program).**
- Difference between spillage and compromise? **Spillage = classified info on unauthorized system (may or may not be compromised). Compromise = confirmed loss/unauthorized disclosure.**
- Who does a ship's ISSM report a cyber incident to? **Upward per CJCSM 6510.01B chain; Navy CSSP / NCDOC.**
- Annual DoD cyber training all members complete? **DoD Cyber Awareness Challenge.**
- Why is "deployable" trainer needed? **Offline / shipboard-executable so deployed personnel can stay current on mandatory training without shore-side connectivity.**

## Cross-references

- **CJCSM-6510.01B** (on disk) — incident handling procedures
- **SECNAV-M-5510.36** (on disk) — DON ISP manual
- **USSID-18** (on disk redacted) — SIGINT U.S. person rules
- **[DoD Cyber Awareness Challenge](https://public.cyber.mil/training/cyber-awareness-challenge/)** — free public training
- **[CDSE Training Catalog](https://www.cdse.edu/Training/)** — free security-professional training
- **NTTP-3-13.1** — IO manual (IO fundamentals for IW community)
- **FDCD-2017** — Navy cyber defense posture (context for "why Navy cares about training")
