#!/usr/bin/env node
// Contract test for the CWT Core extraction.
//
// Core is a reference-only track: it reuses public-safe CWT knowledge from the
// exam corpus without contributing to E5/E6/E7 weighted readiness.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
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
const bibs = index.bibs || [];

ok(!tracks.some((t) => /e-?4/i.test(`${t.id} ${t.label || ""} ${t.paygrade || ""}`)),
  "index must not define a CWT E-4 track");
ok(tracks.some((t) => t.id === "cwt-core" && t.examType === "core" && t.scope === "reference-only"),
  "index must define the cwt-core reference-only track");

const coreEntry = bibs.find((b) => b.id === "CWT-CORE");
ok(coreEntry, "index must include a CWT-CORE Bib entry");
ok(coreEntry?.track === "cwt-core", "CWT-CORE must use track cwt-core");
ok(coreEntry?.examType === "core", "CWT-CORE entry must be examType core");
ok(coreEntry?.contentBaseBib === "CWT-E7", "CWT-CORE must declare CWT-E7 as its contentBaseBib");

const coreDir = coreEntry?.path?.replace(/\/$/, "") || "data/bibs/CWT-CORE";
ok(existsSync(path.join(ROOT, coreDir, "bib.json")), "CWT-CORE bib.json must exist");
ok(existsSync(path.join(ROOT, coreDir, "questions.json")), "CWT-CORE questions.json must exist");

if (existsSync(path.join(ROOT, coreDir, "bib.json")) && existsSync(path.join(ROOT, coreDir, "questions.json"))) {
  const coreBib = await readJson(path.join(coreDir, "bib.json"));
  const coreQuestions = await readJson(path.join(coreDir, "questions.json"));
  const e7Questions = await readJson("data/bibs/CWT-E7/questions.json");

  ok(coreBib.track === "cwt-core", "CWT-CORE bib.json track must be cwt-core");
  ok(coreBib.examType === "core", "CWT-CORE bib.json examType must be core");
  ok(coreBib.contentBaseBib === "CWT-E7", "CWT-CORE bib.json must keep contentBaseBib");
  ok(Array.isArray(coreBib.sections) && coreBib.sections.length > 0, "CWT-CORE must keep section/domain labels");
  ok(coreBib.sections.every((s) => s.itemCount == null), "CWT-CORE sections must not carry exam item counts");
  ok(Array.isArray(coreBib.objectives) && coreBib.objectives.length >= 20, "CWT-CORE must expose public-safe objectives");
  ok(coreBib.objectives.every((o) => o.coreObjective === true && o.publicSafe === true && o.examRelevance === "core"),
    "CWT-CORE objectives must be public-safe core objectives");

  const objectiveIds = new Set(coreBib.objectives.map((o) => o.id));
  const refIds = new Set(coreBib.references.map((r) => r.id));
  const restrictedAvail = new Set(["cui-fouo", "classified", "restricted"]);
  ok(coreBib.references.every((r) => !restrictedAvail.has(r.availability)),
    "CWT-CORE must not include restricted/classified/CUI references");

  ok(coreQuestions.length >= 400, "CWT-CORE should carry a substantial reusable question bank");
  ok(coreQuestions.every((q) => q.id.startsWith("cwt-core-")), "CWT-CORE question ids must be namespaced");
  ok(coreQuestions.every((q) => q.sourceBibId === "CWT-E7" && q.sourceQuestionId),
    "CWT-CORE questions must retain sourceBibId/sourceQuestionId provenance");
  ok(coreQuestions.every((q) => objectiveIds.has(q.primaryObjective)),
    "every CWT-CORE question primaryObjective must exist in core objectives");
  ok(coreQuestions.every((q) => refIds.has(q.sourceRef) && (q.refs || []).every((r) => refIds.has(r))),
    "every CWT-CORE question ref/sourceRef must exist in core references");
  ok(coreQuestions.every((q) => q.sourceConfidence == null || q.sourceConfidence === "source-verified"),
    "CWT-CORE v1 must not include public-adjacent or restricted-summary questions");

  const e7Ids = new Set(e7Questions.map((q) => q.id));
  ok(coreQuestions.every((q) => !e7Ids.has(q.id)), "CWT-CORE question ids must not collide with CWT-E7");
}

if (failed) {
  console.error(`CWT Core contract failed: ${failed} issue(s)`);
  process.exit(1);
}

console.log("CWT Core contract OK");
