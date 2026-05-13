#!/usr/bin/env node
// Contract test for CWT E5/E6 tracks built from the CWT Core bank.
//
// E5/E6 are regular exam tracks, but v1 is intentionally conservative:
//   - no E4 track
//   - reuse only CWT-CORE public-safe objectives/questions/references
//   - E6 may carry the operator-supplied section-count example
//   - E5 must require a profile sheet instead of inventing official weights

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const E6_COUNTS = {
  "offensive-cyber-ops": 34,
  "system-fundamentals": 59,
  "defensive-cyber-ops": 33,
  "research-development": 24,
  "cyber-planning": 15,
  "security-administration": 10,
};

let failed = 0;

function ok(condition, message) {
  if (!condition) {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

async function readJson(rel) {
  return JSON.parse(await readFile(path.join(ROOT, rel), "utf8"));
}

const index = await readJson("data/bibs/index.json");
const tracks = index.tracks || [];
const bibEntries = index.bibs || [];

ok(!tracks.some((t) => /e-?4/i.test(`${t.id} ${t.label || ""} ${t.paygrade || ""}`)),
  "index must not define a CWT E-4 track");
ok(!bibEntries.some((b) => /e-?4/i.test(`${b.id} ${b.track || ""} ${b.paygrade || ""}`)),
  "index must not define a CWT E-4 Bib");

for (const trackId of ["cwt-e5", "cwt-e6", "cwt-e7", "cwt-core"]) {
  ok(tracks.some((t) => t.id === trackId), `index must define track ${trackId}`);
}

const coreBib = await readJson("data/bibs/CWT-CORE/bib.json");
const coreQuestions = await readJson("data/bibs/CWT-CORE/questions.json");
const coreObjectiveIds = new Set((coreBib.objectives || []).map((o) => o.id));
const coreRefIds = new Set((coreBib.references || []).map((r) => r.id));

function validateTrackEntry(id, track, paygrade) {
  const entry = bibEntries.find((b) => b.id === id);
  ok(entry, `index must include ${id}`);
  ok(entry?.track === track, `${id} entry must use track ${track}`);
  ok(entry?.paygrade === paygrade, `${id} entry must use paygrade ${paygrade}`);
  ok(entry?.examType === "regular", `${id} must be a regular exam track`);
  ok(entry?.contentBaseBib === "CWT-E7", `${id} must reuse CWT-E7 study-guide assets`);
  ok(entry?.coreBaseBib === "CWT-CORE", `${id} must declare CWT-CORE as its source bank`);
  return entry;
}

const e5Entry = validateTrackEntry("CWT-E5", "cwt-e5", "E-5");
const e6Entry = validateTrackEntry("CWT-E6", "cwt-e6", "E-6");

async function validateGeneratedTrack(entry, expected) {
  if (!entry) return;
  const dir = entry?.path?.replace(/\/$/, "") || `data/bibs/${entry?.id}`;
  ok(existsSync(path.join(ROOT, dir, "bib.json")), `${entry.id} bib.json must exist`);
  ok(existsSync(path.join(ROOT, dir, "questions.json")), `${entry.id} questions.json must exist`);
  if (!existsSync(path.join(ROOT, dir, "bib.json")) || !existsSync(path.join(ROOT, dir, "questions.json"))) return;

  const bib = await readJson(path.join(dir, "bib.json"));
  const questions = await readJson(path.join(dir, "questions.json"));
  const refIds = new Set((bib.references || []).map((r) => r.id));
  const objectiveIds = new Set((bib.objectives || []).map((o) => o.id));
  const sectionIds = new Set((bib.sections || []).map((s) => s.id));

  ok(bib.id === entry.id, `${entry.id} bib.json id must match entry`);
  ok(bib.track === expected.track, `${entry.id} bib.json track must be ${expected.track}`);
  ok(bib.paygrade === expected.paygrade, `${entry.id} bib.json paygrade must be ${expected.paygrade}`);
  ok(bib.examType === "regular", `${entry.id} bib.json examType must be regular`);
  ok(bib.contentBaseBib === "CWT-E7", `${entry.id} bib.json must keep contentBaseBib`);
  ok(bib.coreBaseBib === "CWT-CORE", `${entry.id} bib.json must keep coreBaseBib`);
  ok((bib.references || []).length === coreBib.references.length, `${entry.id} must include the full public-safe Core ref set`);
  ok((bib.objectives || []).length === coreBib.objectives.length, `${entry.id} must include the full Core objective set`);
  ok(questions.length === coreQuestions.length, `${entry.id} must include the full Core question bank`);

  ok((bib.references || []).every((r) => coreRefIds.has(r.id)), `${entry.id} refs must come from CWT-CORE`);
  ok((bib.references || []).every((r) => !["cui-fouo", "classified", "restricted"].includes(r.availability)),
    `${entry.id} must not include restricted/classified/CUI refs`);

  ok((bib.objectives || []).every((o) => coreObjectiveIds.has(o.id)), `${entry.id} objectives must come from CWT-CORE`);
  ok((bib.objectives || []).every((o) => o.examRelevance === "regular"),
    `${entry.id} objectives must be regular-exam objectives`);
  ok((bib.objectives || []).every((o) => o.coreObjective === true && o.sourceCoreObjectiveId),
    `${entry.id} objectives must retain Core provenance`);

  for (const s of bib.sections || []) {
    ok(Array.isArray(s.objectiveIds) && s.objectiveIds.length > 0, `${entry.id}/${s.id} must list objectiveIds`);
    ok((s.objectiveIds || []).every((oid) => objectiveIds.has(oid)), `${entry.id}/${s.id} objectiveIds must exist`);
    if (expected.counts) {
      ok(s.itemCount === expected.counts[s.id], `${entry.id}/${s.id} itemCount must match supplied E6 section count`);
      ok(s.weightSource === "operator-supplied-e6-example", `${entry.id}/${s.id} weightSource must mark E6 example counts`);
    } else {
      ok(s.itemCount == null, `${entry.id}/${s.id} must not invent an itemCount`);
      ok(s.weightSource === "profile-sheet-required", `${entry.id}/${s.id} must require profile-sheet weights`);
    }
  }

  ok(questions.every((q) => q.id.startsWith(expected.questionPrefix)), `${entry.id} question ids must be namespaced`);
  ok(questions.every((q) => q.sourceBibId === "CWT-CORE" && q.sourceQuestionId?.startsWith("cwt-core-")),
    `${entry.id} questions must retain CWT-CORE question provenance`);
  ok(questions.every((q) => objectiveIds.has(q.primaryObjective)), `${entry.id} primaryObjective values must exist`);
  ok(questions.every((q) => sectionIds.has(q.primarySection)), `${entry.id} primarySection values must exist`);
  ok(questions.every((q) => refIds.has(q.sourceRef) && (q.refs || []).every((r) => refIds.has(r))),
    `${entry.id} sourceRef/refs must exist in generated refs`);
  ok(questions.every((q) => q.sourceConfidence == null || q.sourceConfidence === "source-verified"),
    `${entry.id} must not include public-adjacent or restricted-summary questions`);
}

await validateGeneratedTrack(e5Entry, {
  track: "cwt-e5",
  paygrade: "E-5",
  questionPrefix: "cwt-e5-",
});
await validateGeneratedTrack(e6Entry, {
  track: "cwt-e6",
  paygrade: "E-6",
  questionPrefix: "cwt-e6-",
  counts: E6_COUNTS,
});

if (failed) {
  console.error(`CWT track buildout contract failed: ${failed} issue(s)`);
  process.exit(1);
}

console.log("CWT E5/E6 track buildout contract OK");
