# USSID 18 / USSID SP0018 — Protection of U.S. Person Information

**Bib study scope:** Section 4.

**Source on disk:** `USSID-18 Protection of US Person Information (redacted).pdf` — the NSA-released redacted public version.

## Why this matters {#why}

USSID 18 is the **compliance bible for every SIGINT operator in the U.S. military**. As a CT (and especially CTN/CTR/CWT Chief), your daily work involves collecting and processing signals that may touch U.S. person information. USSID 18 defines the legal + policy boundaries that keep SIGINT lawful.

Violating USSID 18 is a **career-ending event** and potentially a criminal one. Memorize the rules.

## Legal framework {#legal}

USSID 18 implements multiple authorities:

- **Fourth Amendment** — U.S. persons have constitutional protection against unreasonable search.
- **Executive Order 12333** — the authority for U.S. intelligence activities.
- **Foreign Intelligence Surveillance Act (FISA) of 1978** — governs electronic surveillance of foreign powers and agents, including on U.S. soil.
- **FISA Amendments Act Section 702** — foreign-targeted collection with U.S.-person touches governed separately.

## U.S. person — the critical definition {#us-person}

A **U.S. person** is:

- A **U.S. citizen** anywhere in the world.
- A **lawful permanent resident (LPR, green card holder)** anywhere.
- An **unincorporated association** with a substantial number of U.S. citizen/LPR members.
- A **corporation** incorporated in the U.S. (except if directed/controlled by a foreign government).

**Key exam trap:** A U.S. person abroad is still a U.S. person. Collection against them from overseas facilities doesn't bypass USSID 18. Nationality, not geography, determines U.S. person status.

**Non-U.S. persons** include: foreign nationals (even those in the U.S. temporarily on a visa), foreign corporations, foreign governments.

## The three core rules {#rules}

USSID 18 enforces **three baseline rules** for any contact with U.S. person information:

### 1. Minimize acquisition

- Don't collect U.S. person communications unless they fall within a specific exception.
- Selectors (phone numbers, email addresses, IPs) shouldn't target a U.S. person without appropriate authority.
- Incidental collection (a U.S. person appears on an otherwise-lawful foreign target) is permitted but must be handled per minimization.

### 2. Minimize retention

- U.S. person information not necessary for authorized mission purpose should not be retained.
- **Default retention period** is short (historically 5 years for certain categories) — beyond that requires justification.

### 3. Minimize dissemination

- Reports going outside NSA (to customers) must mask U.S. person identities unless:
  - The identity is necessary to understand the foreign intelligence.
  - A specific USP exception applies (e.g., a U.S. person suspected of being an agent of a foreign power).
  - The U.S. person consents.
- The **masking** convention is "U.S. PERSON 1," "U.S. PERSON 2," etc.
- **Unmasking** requires justification approved at designated levels.

## Section 4 scope — specific procedures {#section-4}

Section 4 of USSID 18 typically sets out the **specific procedures** for the three rules above — who can do what, what approvals are needed, what documentation is required. Key concepts:

### Authorized targeting

Collection targeting a U.S. person for intelligence purposes generally requires:

- **FISA court order** (for electronic surveillance in the U.S. or targeting U.S. persons abroad with sufficient connection).
- **EO 12333 authorities** for certain activities (with Attorney General approval in many cases).
- **Specific exceptions** for foreign agents or imminent threats (narrowly scoped).

### Selector approval

Before adding a selector to collection, the operator must ensure it's a **non-U.S. person selector** (or has specific authorization for a U.S. person target). Default assumption: if unsure, it's a U.S. person and requires authorization.

### Reporting

Reports disseminated to customers must:

- Use masked identities for U.S. persons by default.
- Include foreign intelligence value justifications.
- Have originator approval.

### Compliance training

Every SIGINT operator must complete **annual USSID 18 / minimization procedures training** to maintain certification.

## Exceptions (the narrow cases where USP info can be handled) {#exceptions}

- **Consent** — the U.S. person consented to collection.
- **Publicly available information** — already in the open.
- **Agent of a foreign power** — U.S. person actively operating on behalf of a foreign power.
- **Criminal activity (threat to life)** — U.S. person involved in/threatening specific serious crimes.
- **Counterintelligence** — U.S. person is the subject of a CI investigation.
- **Necessary to understand / assess foreign intelligence** — contextual need.

Each exception requires specific documentation and often specific approvals.

## Oversight {#oversight}

Multiple overlapping oversight structures exist:

- **NSA Inspector General (IG)** — internal NSA compliance.
- **NSA Office of the General Counsel (OGC)** — legal review.
- **NSA Compliance Office** — organizational compliance.
- **DoD IG** — external to NSA but within DoD.
- **DoJ NSD** — Justice Department National Security Division.
- **Office of the Director of National Intelligence (ODNI) Civil Liberties, Privacy, and Transparency** — IC-wide oversight.
- **Congressional intelligence committees (SSCI, HPSCI)** — legislative oversight.
- **FISA Court (FISC)** — judicial oversight of surveillance.
- **Privacy and Civil Liberties Oversight Board (PCLOB)** — independent oversight.

Every operator is personally accountable for compliance.

## Compliance violations {#violations}

Violations (called "incidents") are reportable — to the operator's supervisor → legal → OGC → IG pipeline. Types:

- **Inadvertent** — unintentional USP touch (e.g., selector unknowingly belonged to USP).
- **Intentional** — willful violation (career + criminal consequences).
- **Technical error** — system malfunction causing improper handling.

Self-reporting early minimizes consequences; failing to report amplifies them.

## Section 702 + USSID 18 intersection {#s702}

**FISA Section 702** permits targeted collection against **non-U.S. persons reasonably believed to be located outside the U.S.** — with incidental collection of U.S. persons they communicate with.

USSID 18 minimization procedures govern how any resulting U.S. person information is handled — specifically for Section 702, the minimization procedures are filed with the FISC and subject to court oversight.

## Exam-testable concepts

- What's a U.S. person? **U.S. citizen; LPR; unincorporated association mostly of USPs; U.S.-incorporated corporation (not foreign-controlled).**
- A U.S. citizen in Germany — still a U.S. person? **Yes — nationality, not location.**
- Three core rules of USSID 18? **Minimize acquisition, minimize retention, minimize dissemination.**
- What's the masking convention in reports? **"U.S. Person 1," "U.S. Person 2," etc.**
- What authority is the baseline for U.S. intelligence? **Executive Order 12333.**
- What Act governs electronic surveillance of foreign powers in the U.S.? **FISA.**
- What Section 702 allows? **Targeting non-U.S. persons reasonably believed outside the U.S.**
- What must be done if a SIGINT operator notices a compliance incident? **Report through supervisor → legal → OGC → IG.**
- How often is USSID 18 training? **Annually (minimum).**

## Cross-references

- **Executive Order 12333** — public at [intelligence.gov](https://www.intelligence.gov/publications/executive-order-12333) (PDF)
- **FISA statute** — public via [50 U.S.C. §§ 1801 et seq.](https://www.law.cornell.edu/uscode/text/50/chapter-36)
- **USSID-104** (classified, summary written) — CNE ops
- **USSID-6000** (classified, summary written) — USCYBERCOM SIGINT activities
- **[JP-2-01](#references/JP-2-01)** (on disk) — Joint Intelligence Support framework
- **CRITIC-HANDBOOK** (classified) — CRITIC reporting still subject to USSID 18 on US-person mentions
- **[SECNAVINST-5510.30C](#references/SECNAVINST-5510.30C)** (on disk) — personnel security (SIGINT billets require TS/SCI)
