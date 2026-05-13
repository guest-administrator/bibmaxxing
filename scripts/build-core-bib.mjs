#!/usr/bin/env node
// Build the CWT Core Bib from the clean CWT-E7 corpus.
//
// CWT Core is intentionally public-safe and reference-only. It extracts only:
//   - objectives marked coreObjective + publicSafe + regular
//   - questions whose primary objective is in that set
//   - questions whose sourceRef/refs do not touch restricted/CUI/classified refs
//
// The generated Bib keeps a contentBaseBib pointer to CWT-E7 so guide/source
// links reuse the existing study-guide and reference assets without copying.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SOURCE_BIB_ID = "CWT-E7";
const CORE_BIB_ID = "CWT-CORE";
const sourceDir = path.join(ROOT, "data", "bibs", SOURCE_BIB_ID);
const outDir = path.join(ROOT, "data", "bibs", CORE_BIB_ID);

const RESTRICTED_AVAILABILITY = new Set(["cui-fouo", "classified", "restricted"]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function coreQuestionId(sourceId) {
  if (sourceId.startsWith("cwt-e7-")) return sourceId.replace(/^cwt-e7-/, "cwt-core-");
  return `cwt-core-${sourceId}`;
}

const sourceBib = JSON.parse(await readFile(path.join(sourceDir, "bib.json"), "utf8"));
const sourceQuestions = JSON.parse(await readFile(path.join(sourceDir, "questions.json"), "utf8"));

const sourceRefsById = new Map((sourceBib.references || []).map((r) => [r.id, r]));

const coreObjectives = (sourceBib.objectives || [])
  .filter((o) => o.coreObjective === true && o.publicSafe === true && o.examRelevance === "regular")
  .map((o) => ({
    ...clone(o),
    sourceRefs: (o.sourceRefs || []).filter((id) => !RESTRICTED_AVAILABILITY.has(sourceRefsById.get(id)?.availability)),
    examRelevance: "core",
    sourceExamRelevance: o.examRelevance,
  }))
  .filter((o) => o.sourceRefs.length > 0);

const coreObjectiveIds = new Set(coreObjectives.map((o) => o.id));

function touchesRestrictedRef(q) {
  const refs = [q.sourceRef, ...(q.refs || [])].filter(Boolean);
  return refs.some((id) => RESTRICTED_AVAILABILITY.has(sourceRefsById.get(id)?.availability));
}

const coreQuestions = sourceQuestions
  .filter((q) => coreObjectiveIds.has(q.primaryObjective))
  .filter((q) => !touchesRestrictedRef(q))
  .map((q) => {
    const next = clone(q);
    next.id = coreQuestionId(q.id);
    next.sourceBibId = SOURCE_BIB_ID;
    next.sourceQuestionId = q.id;
    next.coreTrack = true;
    next.objectiveTags = (next.objectiveTags || []).filter((id) => coreObjectiveIds.has(id));
    return next;
  });

const usedRefIds = new Set();
for (const q of coreQuestions) {
  if (q.sourceRef) usedRefIds.add(q.sourceRef);
  for (const r of q.refs || []) usedRefIds.add(r);
}
for (const o of coreObjectives) {
  for (const r of o.sourceRefs || []) usedRefIds.add(r);
}

const coreRefs = (sourceBib.references || [])
  .filter((r) => usedRefIds.has(r.id))
  .map((r) => ({
    ...clone(r),
    coreIncluded: true,
    sourceBibId: SOURCE_BIB_ID,
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

const objectiveIdsBySection = new Map();
for (const o of coreObjectives) {
  if (!objectiveIdsBySection.has(o.sectionId)) objectiveIdsBySection.set(o.sectionId, []);
  objectiveIdsBySection.get(o.sectionId).push(o.id);
}

const coreSections = (sourceBib.sections || [])
  .filter((s) => objectiveIdsBySection.has(s.id))
  .map((s) => {
    const next = clone(s);
    delete next.itemCount;
    next.weightSource = "core-reference-only";
    next.objectiveIds = objectiveIdsBySection.get(s.id).slice();
    return next;
  });

const coreBib = {
  id: CORE_BIB_ID,
  track: "cwt-core",
  rating: "CWT",
  paygrade: "core",
  cycle: "Continuous core bank",
  examType: "core",
  scope: "reference-only",
  sourceBibId: SOURCE_BIB_ID,
  contentBaseBib: SOURCE_BIB_ID,
  contentBasePath: `data/bibs/${SOURCE_BIB_ID}/`,
  generatedFrom: {
    bibId: SOURCE_BIB_ID,
    generatedAt: new Date().toISOString(),
    rule: "coreObjective=true, publicSafe=true, examRelevance=regular, no restricted/CUI/classified sourceRef or refs",
  },
  note: "Reusable public-safe CWT objective/question bank. Excluded from advancement-exam weighted readiness.",
  sectionsNote: "Sections are used as CWT skill domains only. No exam item counts are carried in CWT Core.",
  objectivesNote: "Objectives were extracted from CWT-E7 public-safe coreObjective records and marked examRelevance=core.",
  references: coreRefs,
  sections: coreSections,
  objectives: coreObjectives,
};

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "bib.json"), JSON.stringify(coreBib, null, 2) + "\n", "utf8");
await writeFile(path.join(outDir, "questions.json"), JSON.stringify(coreQuestions, null, 2) + "\n", "utf8");

console.log(`Built ${CORE_BIB_ID}: ${coreRefs.length} refs, ${coreObjectives.length} objectives, ${coreQuestions.length} questions`);
