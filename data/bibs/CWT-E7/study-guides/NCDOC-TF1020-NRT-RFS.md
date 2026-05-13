# NCDOC TF 1020 Navy Red Team (NRT) Request for Support Expectations Message

> **⚠ Reference summary.** NCDOC-internal message traffic. CUI / controlled. Public adjacent: NIST SP 800-115 (pen test methodology), MITRE ATT&CK adversary emulation.

**Bib study scope:** Section 3.
**Classification / Availability:** CUI — NCDOC / TENTH Fleet distribution.

## NCDOC mission context {#ncdoc-mission}

**NCDOC (Navy Cyber Defense Operations Command)** is the Navy's primary defensive-cyberspace operations command — a 24/7 watch organization standing up the Navy's enterprise DCO mission.

Public-adjacent framing (from open Navy and DoD doctrine, not from this restricted message):

- **Mission:** continuous monitoring of Navy networks, defensive-cyberspace operations (DCO-IDM in particular), incident handling, and coordination with USCYBERCOM and JFHQ-DODIN on Navy equities.
- **Operational chain:** NCDOC operates under **FLTCYBERCOM / TENTH Fleet**, the Navy component of USCYBERCOM. Tasking flows through C10F.
- **DCO posture:** NCDOC executes day-to-day defensive operations on Navy blue space — the DoD-owned Navy network — and coordinates with CPTs for mission-prioritized hunts.
- **Red-team construct:** within NCDOC, **Task Force 1020** is the Navy Red Team that performs authorized adversary emulation against Navy commands on request.

This context — NCDOC's mission and chain of command — is what most exam questions about NCDOC are testing. The CUI message itself focuses on TF 1020 RFS mechanics; the questions usually want the wrapper mission first.

## What this is

This message sets the **expectations and procedures for units requesting Navy Red Team (NRT) support** from NCDOC (Navy Cyber Defense Operations Command). **Task Force 1020** is NCDOC's red-team construct; it is used by Navy commands who want an adversarial assessment of their cyber defenses.

"Red team" = authorized adversary emulation, performed to expose defense gaps. NCDOC's NRT does this on Navy networks under legal authorization.

## Red team vs blue team vs purple team {#team-colors}

Cybersecurity tradition uses color-coded team names to distinguish functions:

| Team | Role |
|---|---|
| **Red team** | Authorized adversary emulation — finds vulnerabilities by attacking |
| **Blue team** | Defenders — detects and responds to red team and real adversaries |
| **Purple team** | Collaborative red+blue exercise — red attacks while blue watches/learns |
| **White team** | Exercise control — sets rules, scores engagement, adjudicates |
| **Green team** | Reliability / availability focus (less common in DoD) |
| **Yellow team** | Builders — developers who harden systems based on red/blue findings |

NRT primarily operates as a red team; in many engagements it runs as a purple-team exercise so the defended command's blue team learns in real time.

## What NRT does (from public red-team literature) {#nrt-methodology}

A Navy Red Team engagement typically follows the **NIST SP 800-115** penetration testing model plus **MITRE ATT&CK** adversary emulation:

1. **Scoping** — define targets, rules of engagement (ROE), authorization, boundary agreements.
2. **Reconnaissance** — passive and active information gathering about the target.
3. **Initial access** — exploit to gain footing (phishing, external service exploitation, etc.).
4. **Execution / persistence / privilege escalation** — maintain and expand access.
5. **Lateral movement / collection** — simulate adversary operational objectives.
6. **Command and control / exfiltration** — emulate data theft or mission impact.
7. **Reporting** — detailed write-up to the defended command with findings and remediation.

## MITRE ATT&CK mapping {#attack-mapping}

Modern red teams organize findings against the MITRE ATT&CK matrix — a taxonomy of adversary techniques observed in real-world attacks. Key tactics (columns in the matrix):

- **Reconnaissance** — pre-attack information gathering.
- **Resource Development** — preparing infrastructure.
- **Initial Access** — phishing, exploitation, valid accounts.
- **Execution** — running adversary code.
- **Persistence** — maintaining footing.
- **Privilege Escalation** — getting to higher-privilege context.
- **Defense Evasion** — avoiding detection.
- **Credential Access** — stealing credentials.
- **Discovery** — mapping the environment.
- **Lateral Movement** — moving between hosts.
- **Collection** — gathering target data.
- **Command and Control (C2)** — communicating with attacker infrastructure.
- **Exfiltration** — removing data.
- **Impact** — destruction, denial, manipulation.

Each tactic contains specific techniques (T-numbers, e.g., T1566 Phishing). NRT engagement reports typically list observed techniques mapped against ATT&CK so the defended command can address gaps in relevant detection.

## Authorization framework for red teaming {#authorization}

NRT operates under explicit authorization:

- **CFAA (Computer Fraud and Abuse Act, 18 U.S.C. §1030)** — defines unauthorized access to computers; red team must have written authorization to avoid CFAA liability.
- **DoD Authority** — within DoD, red team activity is authorized under service-component authorities; NCDOC operates under FLTCYBERCOM authority on Navy networks.
- **Rules of Engagement (ROE)** — documented boundaries: what's in scope, what's not, what techniques are allowed, what's explicitly forbidden (e.g., physical destruction, mission-critical system disruption).
- **Get-out-of-jail-free letter** — the written authorization the red team carries; usually signed by the defended command's CO and the NCDOC authority.

## Section 3 — expected content {#section-3}

Section 3 of most SOP messages covers either:
- **Request submission procedures** — what info the requesting command must provide, authorities required, funding/tasking mechanics.
- **Engagement expectations** — what NRT will and will not do, timeline, scope controls, reporting deliverables.

## Typical NRT engagement deliverables {#deliverables}

- **Scoping document / ROE** — signed at engagement kickoff.
- **Weekly status updates** — during engagement window.
- **Out-brief** — final briefing to defended command leadership.
- **Technical report** — detailed findings with severity, exploitability, remediation.
- **Executive summary** — leadership-level narrative.
- **Evidence package** — screenshots, command logs, artifacts for each finding.
- **Hotwash** — lessons-learned session between red team and blue team.
- **Tracking** — findings entered into POA&M system for remediation follow-through.

## Relationship to CPTs and other assessments {#relationships}

NRT is one of several assessment types a Navy command may encounter:

| Assessment | Purpose | Lead |
|---|---|---|
| **NRT engagement** | Adversarial find-vulns | NCDOC TF 1020 |
| **CRI (Cyber Readiness Inspection)** | Formal compliance + posture assessment | NCDOC |
| **CPT assessment** | Pre-mission posture baseline before CPT protects | Cyber Protection Team |
| **CND/IAM audit** | Compliance check (STIG, patch, etc.) | Service or command |
| **Joint Mission Assurance** | Mission-impact-focused assessment | USCYBERCOM / service |

These assessments are complementary, not duplicative — a command may experience multiple during a readiness cycle.

## Exam-testable concepts {#testable}

- What does NRT stand for? **Navy Red Team.**
- Who owns NRT in the Navy? **NCDOC** (under FLTCYBERCOM / TENTH Fleet).
- What is Task Force 1020? **NCDOC's red-team task force construct.**
- What document frames penetration testing methodology that NRT follows? **NIST SP 800-115.**
- What framework emulates adversary TTPs? **MITRE ATT&CK.**
- Who in a Navy command typically initiates an NRT engagement? **The command cyber security officer / IAM with command authority approval.**
- What U.S. statute defines unauthorized computer access? **CFAA — Computer Fraud and Abuse Act (18 U.S.C. §1030).**
- What document authorizes a red team engagement? **Written authorization / ROE signed by the defended command's authority.**
- Red team vs blue team? **Red attacks; blue defends.**
- What is a purple team? **Collaborative engagement where red attacks and blue watches/learns in real time.**
- What is an NRT scoping document? **Formal agreement defining targets, ROE, authorities, timeline — signed at engagement kickoff.**

## Cross-references

- **[NIST SP 800-115](https://csrc.nist.gov/pubs/sp/800/115/final)** — public pen-test methodology
- **[MITRE ATT&CK](https://attack.mitre.org/matrices/enterprise/)** — adversary TTP framework
- **FDCD-2017** — Fleet Design for Cyber Defense (parent Navy cyber defense posture)
- **CPT-ORG-3-33.4** — CPT threat-emulation element (CPTs do similar assessments, typically pre-mission)
- **CJCSM-6510.01B** — incident handling (NRT findings inform incident reporting baselines)
- **JCAC-ACTIVE-EXPLOIT** — the tradecraft NRT operators use
- **18 U.S.C. §1030 (CFAA)** — statutory framework red teaming operates within
