# DJSIG / JDCSISSS — DoDIIS / Joint Security Implementation Guide

**Bib study scope:** Sections 1, 2.

**Source on disk:** `DJSIG JDCSISSS DoD Joint Security Implementation Guide.pdf`.

## What this document is {#what-it-is}

DJSIG (Department of Defense Intelligence Information System Joint Security Implementation Guide) — also known as **JDCSISSS** (Joint DoDIIS/Cryptologic SCI Information Systems Security Standards) — is the implementation-level guide for **securing SCI information systems** across DoD.

Where DODM 5105.21 Vol 1 covers SCI admin security (spaces, people, paper), DJSIG covers **the information systems** that process, store, and transmit SCI. It's the practical handbook for SCI IT.

## The DoDIIS ecosystem {#dodiis}

**DoDIIS** is the DoD Intelligence Information System — the family of SCI networks, systems, and services supporting the DoD intelligence community. Key members:

- **JWICS** (Joint Worldwide Intelligence Communications System) — the TS//SCI global network.
- **NSA's NSANet** — internal to NSA; interconnects with JWICS at defined boundaries.
- **DIA's DIA Information System**.
- **Service-specific SCI networks** — ONI, NIOC, etc.
- **Cross-domain services** — controlled data transfer between SCI and lower networks.

DJSIG provides security standards that every system in this ecosystem must meet.

## Sections 1 and 2 — likely content {#sections-1-2}

Based on JDCSISSS Rev 2 (public via FAS) structure, these opening sections typically cover:

### Section 1 — Purpose, Scope, Authority

- **Purpose** — establishes SCI IS security standards for DoDIIS.
- **Scope** — covers DoD SCI information systems, cross-domain systems, and tangentially related systems touching SCI.
- **Applicability** — all DoD components processing SCI.
- **Authority** — derives from DCID 6/3 / IC directives, DoDM 5105.21, and OSD policy.

### Section 2 — Roles and Responsibilities

- **Information System Security Manager (ISSM)** — organization-level responsibility for SCI IS security.
- **Information System Security Officer (ISSO)** — system-level responsibility; day-to-day security of a specific SCI system.
- **Authorizing Official (AO)** — grants ATO for SCI systems (typically senior flag/SES level).
- **User responsibilities** — read-on, compliance, reporting incidents.
- **System owner** — business/operational owner of the system.

## The risk management framework for SCI {#rmf-sci}

SCI systems follow the **Risk Management Framework** (NIST SP 800-37) with IC-specific overlays. The 7-step RMF as applied to SCI:

1. **Prepare** — organizational readiness, privacy/security roles.
2. **Categorize** — SCI systems are automatically **High** impact (confidentiality), typically High on integrity, and per-mission on availability.
3. **Select** — controls from NIST SP 800-53 baseline + IC / DoD overlays.
4. **Implement** — build controls in.
5. **Assess** — independent assessor validates.
6. **Authorize** — AO grants ATO (Authority To Operate) or denies.
7. **Monitor** — continuous monitoring (ISCM).

## Key control categories for SCI systems {#controls}

### Access control

- **Two-factor authentication** — smart card + PIN is standard.
- **Need-to-know enforcement** — role-based access + compartment-based access.
- **Privileged user monitoring** — admins are separately audited.
- **Account lifecycle** — create/review/disable with clear authority.

### Audit

- **Continuous audit logging** of all user actions.
- **Audit reduction** — automated analysis of logs for anomalies.
- **Retention** — typically 7 years for SCI audit logs.

### Media protection

- **No removable media** unless specifically authorized (USB, CD, DVD typically banned or tightly controlled).
- **Approved media** — must be labeled at appropriate classification + compartment + dissemination.
- **Destruction** — NSA-approved methods (physical destruction standard; wiping generally insufficient).

### Configuration management

- **Baseline configurations** — STIG-compliant.
- **Change control** — formal board process.
- **Scanning** — SCAP / ACAS scans against the baseline.

### Incident response

- Tied to CJCSM 6510.01B (you have it on disk); SCI spills and compromises are CAT-categorized.

### Cross-domain

- **Cross-Domain Solutions (CDS)** — specialized gateways moving data between SCI and lower networks with strict validation. Require specific accreditation.

## Marking requirements on SCI IT {#marking}

- **System-level banners** — every user sees the system's classification on login.
- **File-level markings** — documents carry portion markings + banner markings (same rules as SECNAV M-5510.36 plus compartment markings).
- **Email** — subject-line markings per IC standards.
- **Screens** — classification visible when in use; blanked when unattended.

## Connection to other security frameworks {#connections}

DJSIG interoperates with:

- **DODM 5105.21 Vol 1** — SCI admin security (the companion manual).
- **DoDM 5200.01** — DoD Information Security Program.
- **DoDI 8500.01 / 8510.01** — DoD cybersecurity policy + RMF implementation.
- **ICD 503** — IC risk management framework (IC parallel to DoD RMF).
- **CJCSI 6510.01F** — IA and CND (public, on disk).

## Exam-testable concepts

- What does DJSIG govern? **SCI information systems security across DoD.**
- What's the SCI-network-level equivalent of SIPRNET's scope? **JWICS (TS//SCI).**
- Who holds command-level responsibility for an SCI system's security? **ISSM (Information System Security Manager).**
- Who day-to-day operates SCI system security? **ISSO (Information System Security Officer).**
- Who grants ATO? **AO (Authorizing Official).**
- What's the default confidentiality impact level for an SCI system? **High.**
- What manual governs the admin security side of SCI (space/people)? **DODM 5105.21 Vol 1.**
- What IC directive parallels DoD RMF for IC systems? **ICD 503.**
- Can you use a USB stick on a JWICS terminal? **No, unless specifically authorized for that system — removable media is tightly controlled.**
- What's a CDS? **Cross-Domain Solution — specialized gateway between different classification domains.**

## Cross-references

- **[DODM-5105.21-V1](#references/DODM-5105.21-V1)** (on disk) — SCI admin security companion
- **[SECNAVINST-5510.36B](#references/SECNAVINST-5510.36B)** (on disk) — baseline info security (below SCI)
- **[SECNAVINST-5510.30C](#references/SECNAVINST-5510.30C)** (on disk) — personnel security (the people who access these systems)
- **[CJCSI-6510.01F](#references/CJCSI-6510.01F)** (on disk) — IA/CND framework
- **[CJCSM-6510.01B](#references/CJCSM-6510.01B)** (on disk) — incident handling (SCI incidents ride this framework)
- **ICD 503** — IC risk management — [dni.gov](https://www.dni.gov/files/documents/ICD/ICD_503.pdf)
- **ICD 705** — SCIF standards — [dni.gov](https://www.dni.gov/files/documents/ICD/ICD_705.pdf)
- **NIST SP 800-53 Rev.5** — controls catalog
- **NIST SP 800-37 Rev.2** — RMF
