#!/usr/bin/env node
// Adds a `sourceConfidence` field to every question whose `source` is
// "seed-estimated". This is additive metadata; existing schema is untouched
// and readiness math still ignores it (see report for the deliberate
// follow-up to gate readiness by confidence).
//
// Classification policy (all 29 rows reviewed):
//   - public-adjacent      : written from public doctrine that PARALLELS the
//                            CUI/FOUO source (NWP-3-12 -> JP-3-12; CFCOE/CPT
//                            -> JP-3-12 Ch 3; OPTASK -> JP-3-12 + USCC public
//                            structure; deconfliction msgs -> JP-3-12).
//   - restricted-summary   : the underlying source is classified; the question
//                            only summarises the directive's name + adjacent
//                            public framework. USSID-104 / USSID-6000 / CRITIC.
//   - source-verified      : the question is corroborated against a verified
//                            primary source. (None of the 29 qualify - they
//                            are all classification-dependent.)
//   - remove-or-rewrite    : the question makes claims that cannot be
//                            substantiated even from public adjacent material.
//                            (None of the 29 hit this bar; all are written
//                            from defensible public scaffolding.)
//
// The mapping is by sourceRef. Operators can re-run the script after adding
// new seed-estimated rows; the script is idempotent.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const Q_PATH = path.join("data", "bibs", "CWT-E7", "questions.json");

const REF_TO_CONFIDENCE = {
  "USCC-INST-3000.14A":           "public-adjacent",
  "OPTASK-CYBERSPACE-OPS":        "public-adjacent",
  "DEPLOYABLE-SEC-TRAINER":       "public-adjacent",
  "NCDOC-TF1020-NRT-RFS":         "public-adjacent",
  "CFCOE-V4.1":                   "public-adjacent",
  "FDCD-2017":                    "public-adjacent",
  "DCO-CTF-MSG-2011":             "public-adjacent",
  "USCYBERCOM-GENADMIN-22-0120":  "public-adjacent",
  "USSID-104":                    "restricted-summary",
  "USSID-6000":                   "restricted-summary",
  "NWP-3-12":                     "public-adjacent",
  "NTTP-3-13.1":                  "public-adjacent",
  "NTTP-3-13.2":                  "public-adjacent",
  "CRITIC-HANDBOOK":              "restricted-summary",
  "CPT-ORG-3-33.4":               "public-adjacent",
};

async function main() {
  const qs = JSON.parse(await readFile(Q_PATH, "utf8"));
  const buckets = { "public-adjacent": [], "restricted-summary": [], "source-verified": [], "remove-or-rewrite": [], unclassified: [] };
  let touched = 0;
  for (const q of qs) {
    if (q.source !== "seed-estimated") continue;
    const cls = REF_TO_CONFIDENCE[q.sourceRef] || null;
    if (!cls) { buckets.unclassified.push(q.id); continue; }
    if (q.sourceConfidence !== cls) { q.sourceConfidence = cls; touched++; }
    buckets[cls].push(q.id);
  }
  await writeFile(Q_PATH, JSON.stringify(qs, null, 2) + "\n", "utf8");
  console.log(`classify-seed-estimated: tagged ${touched} question(s).`);
  for (const [k, arr] of Object.entries(buckets)) {
    if (arr.length === 0) continue;
    console.log(`  ${k.padEnd(20)}: ${arr.length}`);
  }
}

main().catch((e) => { console.error("classify-seed-estimated fatal:", e); process.exit(1); });
