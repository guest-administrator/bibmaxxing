# CJCSI 6510.01F — Information Assurance (IA) and Support to CND

**Bib study scope:** Enclosures A, C.

**Source on disk:** `CJCSI-6510.01F Information Assurance and CND.pdf`.

## What this instruction is {#what-it-is}

CJCSI 6510.01F (9 Feb 2011) assigns joint-level **policy and responsibilities for Information Assurance (IA) and support to Computer Network Defense (CND)** across DoD. It defines the defense-in-depth framework, roles, and processes that underpin DoD's cyber defense posture. It's the policy umbrella under which CJCSM 6510.01B (incident handling) and DoD Manual 8530.01 (cybersecurity activities) operate.

Historical context: "IA" and "CND" are older terms that evolved into "cybersecurity" and "DCO/DODIN Ops" post-2013. The instruction's framework still applies even though the vocabulary has updated.

## Defense-in-depth (DiD) — Enclosure A core content {#defense-in-depth}

Defense-in-Depth is the foundational strategy of CJCSI 6510.01F. It recognizes that no single control stops every threat — protection must be **layered** across **people, technology, and operations**.

### The three DiD dimensions

| Dimension | What it covers |
|---|---|
| **People** | Training, awareness, accountability, insider-threat programs, security clearances |
| **Technology** | Boundary protection, endpoint protection, authentication, encryption, monitoring, IDS/IPS |
| **Operations** | Security policy, incident response, vulnerability management, change management, continuous monitoring |

Each attack on a DoD system should have to defeat multiple layers to succeed. One layer's failure doesn't compromise the whole.

### Example layered DiD on a DoD network

```
External ── Internet
    │
    ▼
[Perimeter firewall / IPS]      ← Layer 1: boundary
    │
    ▼
[DMZ: proxy, email gateway]      ← Layer 2: screened services
    │
    ▼
[Internal firewall / NAC]         ← Layer 3: segmentation
    │
    ▼
[Host-based firewall + EDR]      ← Layer 4: endpoint
    │
    ▼
[OS security: ACLs, audit]        ← Layer 5: platform
    │
    ▼
[App auth, encryption at rest]    ← Layer 6: application
    │
    ▼
[Data classification + DLP]       ← Layer 7: data
```

Defeat one layer, the attacker still faces the next. This is the CJCSI 6510.01F posture.

## The CIA triad + extensions {#cia-triad}

IA objectives per CJCSI 6510.01F (and universal in cybersecurity):

- **Confidentiality** — only authorized people/systems read the info.
- **Integrity** — info is accurate and unaltered.
- **Availability** — authorized users can access when needed.

**Extended** (the CIA-NI "pentagon" some doctrines use):

- **Non-repudiation** — you can prove who did what.
- **Authentication** — the identity of a person/system is verified.

## Enclosure A scope — IA policy framework {#enclosure-a}

Enclosure A is the core policy section. It typically covers:

- **IA policy requirements** for DoD Information Systems (DoD ISs).
- **Certification and Accreditation (C&A)** requirements — superseded by the **RMF (Risk Management Framework)** post-2014 (DoDI 8510.01 transition).
- **Defense-in-depth** as the default strategy.
- **Continuous monitoring** requirements.
- **Vulnerability management** responsibilities.

### RMF — what C&A became

Though the instruction pre-dates RMF, you'll see RMF on the exam:

**RMF 7-step process** (NIST SP 800-37 Rev.2):

1. **Prepare** — organizational context, risk tolerance.
2. **Categorize** — classify the system (impact level: low/moderate/high for C/I/A).
3. **Select** — pick security controls from NIST SP 800-53 + DoD overlays.
4. **Implement** — build the controls in.
5. **Assess** — test the controls.
6. **Authorize** — Authorizing Official (AO) grants Authority to Operate (ATO).
7. **Monitor** — continuous monitoring to maintain authorization.

## Enclosure C scope — CND support {#enclosure-c}

Enclosure C covers how DoD forces support **Computer Network Defense**. Key elements:

- **CND services** — monitoring, detection, response on behalf of DoD networks.
- **CND-RA (Response Actions)** — now called DCO-RA under modern doctrine.
- **Coordination** — how DoD components coordinate CND with USCYBERCOM (then CYBERCOM, newer since 2018 as unified command).
- **Reporting** — what CND data flows up.

## Key roles and responsibilities {#roles}

| Entity | Role |
|---|---|
| **CJCS** | Joint policy oversight |
| **DoD CIO** | DoD-wide cybersecurity policy |
| **CCMDs** | Operational cybersecurity for their AOR |
| **Services** | Man/train/equip service cyber components |
| **USCYBERCOM** | Operational cyber force (elevated from sub-unified to unified 2018) |
| **DISA** | DODIN service provider, defensive operations |
| **Agency/component CIOs** | Implementation in their enclave |

## Continuous monitoring (ConMon) {#conmon}

CJCSI 6510.01F requires continuous monitoring — replacing periodic "snapshot" assessments. NIST SP 800-137 defines the ISCM (Information Security Continuous Monitoring) framework.

Key ConMon data types:

- **Asset inventory** — what's on the network (all the time).
- **Configuration compliance** — STIG/SCAP compliance scanning.
- **Vulnerability scanning** — ACAS (Assured Compliance Assessment Solution) / Nessus.
- **Patch status** — how current each host is.
- **Authentication events** — logon/logoff across the enterprise.
- **Privileged user actions** — audit trails for admins.

## STIGs — Security Technical Implementation Guides {#stigs}

DISA publishes **STIGs** — hardening guidance for nearly every DoD-approved OS, application, network device. CJCSI 6510.01F implementation requires STIG compliance on all DoD ISs.

STIGs are the concrete checklist. ACAS / SCC (SCAP Content Checker) scan against them automatically. Non-compliance → plan of action & milestones (POA&M) to remediate.

## The "boundary" concept {#boundary}

A key CJCSI 6510.01F term: every DoD IS has a defined **authorization boundary** — the scope of what's authorized to operate under a specific ATO. Outside the boundary = not authorized.

Connecting two boundaries requires formal **interconnection agreements** (ISAs, MOUs) and an **Information Security Policy (ISP)** update.

## Exam-testable concepts

- What strategy is the baseline for CJCSI 6510.01F? **Defense-in-depth.**
- Three dimensions of defense-in-depth? **People, Technology, Operations.**
- What's the CIA triad? **Confidentiality, Integrity, Availability.**
- What replaced C&A (Certification and Accreditation)? **RMF (Risk Management Framework).**
- How many steps in the RMF? **7 (Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor).**
- Who grants an ATO? **Authorizing Official (AO).**
- What's a STIG? **Security Technical Implementation Guide — DISA-published hardening checklist.**
- What tool scans DoD systems for STIG compliance? **ACAS** (Assured Compliance Assessment Solution) / SCC.
- What's a POA&M? **Plan of Action and Milestones — tracks remediation of identified security deficiencies.**

## Cross-references

- **[CJCSM-6510.01B](#references/CJCSM-6510.01B)** (on disk) — incident handling manual (the implementation of Enclosure C CND parts)
- **[DoDM 8530.01](https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/dodm/853001p.PDF)** — modern implementation (already annotated as adjacent)
- **[NIST SP 800-53 Rev.5](https://csrc.nist.gov/pubs/sp/800/53/r5/final)** — security controls
- **[NIST SP 800-37 Rev.2](https://csrc.nist.gov/pubs/sp/800/37/r2/final)** — Risk Management Framework
- **[NIST SP 800-137](https://csrc.nist.gov/publications/detail/sp/800-137/final)** — ISCM / Continuous Monitoring
- **DISA STIGs** — [public.cyber.mil/stigs/](https://public.cyber.mil/stigs/)
- **[SECNAVINST-5510.36B](#references/SECNAVINST-5510.36B)** — info security program (info classification side)
- **[JP-3-12](#references/JP-3-12)** — cyberspace ops (broader framework)
