#!/usr/bin/env node
// Build CWT E5/E6 regular exam tracks from the CWT Core bank.
//
// The generated tracks reuse public-safe Core questions/objectives/references
// and point study-guide/reference links back at the CWT-E7 content base.
// E6 carries the operator-supplied section-count example. E5 deliberately
// ships without item counts so the app asks for profile-sheet weights instead
// of inventing official exam data.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const CORE_BIB_ID = "CWT-CORE";
const CONTENT_BASE_BIB_ID = "CWT-E7";
const coreDir = path.join(ROOT, "data", "bibs", CORE_BIB_ID);

const TRACKS = [
  {
    id: "CWT-E5",
    track: "cwt-e5",
    paygrade: "E-5",
    cycle: "Profile sheet required / Core-derived v1",
    questionPrefix: "cwt-e5-",
    weightSource: "profile-sheet-required",
    sectionCounts: null,
    sectionWeightNote:
      "No official CWT E-5 section counts are bundled. Enter your profile-sheet values in Manage to personalize weighted readiness.",
    note:
      "Core-derived CWT E-5 regular-exam track. Uses the public-safe CWT Core bank; section weights remain unset until the operator enters profile-sheet values.",
  },
  {
    id: "CWT-E6",
    track: "cwt-e6",
    paygrade: "E-6",
    cycle: "Operator E-6 section example / Core-derived v1",
    questionPrefix: "cwt-e6-",
    weightSource: "operator-supplied-e6-example",
    sectionCounts: {
      "offensive-cyber-ops": 34,
      "system-fundamentals": 59,
      "defensive-cyber-ops": 33,
      "research-development": 24,
      "cyber-planning": 15,
      "security-administration": 10,
    },
    sectionWeightNote:
      "Section item counts use the operator-supplied E-6 example. They are not asserted as the live cycle; enter your profile-sheet values in Manage when available.",
    note:
      "Core-derived CWT E-6 regular-exam track. Uses the public-safe CWT Core bank plus the operator-supplied section-count example for weighted readiness.",
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function trackQuestionId(sourceId, prefix) {
  if (sourceId.startsWith("cwt-core-")) return sourceId.replace(/^cwt-core-/, prefix);
  return `${prefix}${sourceId}`;
}

function buildSections(coreBib, spec) {
  return (coreBib.sections || []).map((section) => {
    const next = clone(section);
    next.weightSource = spec.weightSource;
    if (spec.sectionCounts) {
      next.itemCount = spec.sectionCounts[next.id] ?? null;
    } else {
      delete next.itemCount;
    }
    return next;
  });
}

function buildObjectives(coreBib) {
  return (coreBib.objectives || []).map((objective) => {
    const next = clone(objective);
    next.examRelevance = "regular";
    next.sourceCoreObjectiveId = objective.id;
    next.sourceCoreBibId = CORE_BIB_ID;
    return next;
  });
}

function buildReferences(coreBib) {
  return (coreBib.references || []).map((ref) => {
    const next = clone(ref);
    next.trackIncluded = true;
    next.sourceCoreBibId = CORE_BIB_ID;
    return next;
  });
}

function buildQuestions(coreQuestions, spec) {
  return coreQuestions.map((question) => {
    const next = clone(question);
    next.id = trackQuestionId(question.id, spec.questionPrefix);
    next.sourceBibId = CORE_BIB_ID;
    next.sourceQuestionId = question.id;
    next.originBibId = question.sourceBibId || null;
    next.originQuestionId = question.sourceQuestionId || null;
    next.coreDerived = true;
    delete next.coreTrack;
    return next;
  });
}

const coreBib = JSON.parse(await readFile(path.join(coreDir, "bib.json"), "utf8"));
const coreQuestions = JSON.parse(await readFile(path.join(coreDir, "questions.json"), "utf8"));

for (const spec of TRACKS) {
  const outDir = path.join(ROOT, "data", "bibs", spec.id);
  const generatedAt = new Date().toISOString();
  const sections = buildSections(coreBib, spec);
  const bib = {
    id: spec.id,
    track: spec.track,
    rating: "CWT",
    paygrade: spec.paygrade,
    cycle: spec.cycle,
    examType: "regular",
    scope: "exam-readiness-provisional",
    sourceBibId: CORE_BIB_ID,
    coreBaseBib: CORE_BIB_ID,
    contentBaseBib: CONTENT_BASE_BIB_ID,
    contentBasePath: `data/bibs/${CONTENT_BASE_BIB_ID}/`,
    generatedFrom: {
      bibId: CORE_BIB_ID,
      generatedAt,
      rule: "public-safe CWT Core refs/objectives/questions; no substitute-only or local-private content",
    },
    note: spec.note,
    examTypeNote:
      "Regular-exam track derived from CWT Core. Substitute-only and local-private material are not included.",
    sectionsNote:
      "Sections are the official exam-weight layer when real item counts are available. Objectives remain the study/remediation layer.",
    sectionWeightNote: spec.sectionWeightNote,
    references: buildReferences(coreBib),
    sections,
    objectives: buildObjectives(coreBib),
  };
  const questions = buildQuestions(coreQuestions, spec);

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "bib.json"), JSON.stringify(bib, null, 2) + "\n", "utf8");
  await writeFile(path.join(outDir, "questions.json"), JSON.stringify(questions, null, 2) + "\n", "utf8");
  const itemTotal = sections.reduce((sum, s) => sum + (Number.isFinite(s.itemCount) ? s.itemCount : 0), 0);
  console.log(`Built ${spec.id}: ${bib.references.length} refs, ${bib.objectives.length} objectives, ${questions.length} questions, itemCountTotal=${itemTotal || "unset"}`);
}
