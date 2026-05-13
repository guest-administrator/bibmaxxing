#!/usr/bin/env node
// Operator overrides for sourceSection assignments that the matcher could not
// confidently place. Each override pairs a question id with a manually-chosen
// guide heading slug + a confidence tier ("high"|"medium").
//
// Idempotent: re-running is a no-op once entries match.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const Q_PATH = path.join("data", "bibs", "CWT-E7", "questions.json");

const OVERRIDES = [
  // BOOK-GRAY-HAT has no exact "root cause analysis" or "disclosure" heading;
  // these are the closest defensible matches in the on-disk guide.
  {
    id: "cwt-e7-vulnres-007",
    sourceSection: "intro-to-fuzzing-deliverables",
    sourceSectionConfidence: "medium",
    reason: "BOOK-GRAY-HAT lacks a dedicated 'Root cause analysis' heading; deliverables of fuzz testing include RCA outputs.",
  },
  {
    id: "cwt-e7-vulnres-008",
    sourceSection: "defender-side",
    sourceSectionConfidence: "medium",
    reason: "BOOK-GRAY-HAT lacks a dedicated 'Coordinated disclosure' heading; defender-side context is closest match for CVE/CNA discussion.",
  },
  // Round-2 close-out: placeholder guides now carry public-safe sub-headings
  // that exactly match these three question topics. Bump to "medium" - the
  // anchor matches but the underlying source is still public-adjacent rather
  // than canonical CUI text.
  {
    id: "cwt-e7-deconflict-001",
    sourceSection: "deconfliction-purpose",
    sourceSectionConfidence: "medium",
    reason: "Public-safe 'Cyberspace deconfliction purpose' H3 added to USCC-INST-3000.14A guide; matches the question's 'deconfliction is required to...' framing.",
  },
  {
    id: "cwt-e7-ncdoc-001",
    sourceSection: "ncdoc-mission",
    sourceSectionConfidence: "medium",
    reason: "Public-safe 'NCDOC mission context' H2 added to NCDOC-TF1020-NRT-RFS guide; matches the question's 'NCDOC primarily executes which mission' framing.",
  },
  {
    id: "cwt-e7-ncdoc-002",
    sourceSection: "ncdoc-mission",
    sourceSectionConfidence: "medium",
    reason: "Public-safe 'NCDOC mission context' H2 added to NCDOC-TF1020-NRT-RFS guide; matches the question's NCDOC operational-chain framing.",
  },
];

async function main() {
  const qs = JSON.parse(await readFile(Q_PATH, "utf8"));
  const byId = new Map(qs.map((q) => [q.id, q]));
  let touched = 0;
  for (const o of OVERRIDES) {
    const q = byId.get(o.id);
    if (!q) { console.warn("override-source-sections: skip missing id", o.id); continue; }
    if (q.sourceSection !== o.sourceSection) { q.sourceSection = o.sourceSection; touched++; }
    if (q.sourceSectionConfidence !== o.sourceSectionConfidence) { q.sourceSectionConfidence = o.sourceSectionConfidence; touched++; }
  }
  await writeFile(Q_PATH, JSON.stringify(qs, null, 2) + "\n", "utf8");
  console.log(`override-source-sections: applied ${OVERRIDES.length} override(s); ${touched} field(s) changed.`);
}

main().catch((e) => { console.error("override-source-sections fatal:", e); process.exit(1); });
