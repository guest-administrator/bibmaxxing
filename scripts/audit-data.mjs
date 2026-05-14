#!/usr/bin/env node
// Bibmaxxing data audit. Runs against every installed Bib.
// Errors:   data-contract violations that will break the app or IndexedDB.
// Warnings: coverage gaps and drift that the operator should know about.
//
// Exit codes: 0 = clean, 1 = errors, 2 = warnings only (when --strict).
//
// Usage:
//   node scripts/audit-data.mjs
//   node scripts/audit-data.mjs --bib CWT-E7
//   node scripts/audit-data.mjs --strict
//   node scripts/audit-data.mjs --json
//
// Validates per Bib:
//   - questions.json: unique IDs, valid answer index, sourceRef in bib.json,
//     every refs[] item in bib.json, choices array sane, stem present.
//   - bib.json: distinct ref IDs, required fields, availability vocabulary,
//     localPath present when availability is `public-downloaded`.
//   - study-guides/<refId>.md: warn refs without a guide; warn orphan guides.
//   - references/MANIFEST.json: warn counts that drift from reality.
//   - cross-Bib question ID collisions across all installed Bibs.

import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const args = parseArgs(process.argv.slice(2));
const PUBLIC_SOURCE_EXPORT = existsSync(path.join(ROOT, "GITHUB-UPLOAD-MANIFEST.json"));

const findings = { errors: [], warnings: [], info: [] };
const summary = { bibs: 0, refs: 0, questions: 0, guides: 0 };

const KNOWN_AVAILABILITY = new Set([
  "public-downloaded",
  "public-online",
  "needs-user",
  "cui-fouo",
  "classified",
  "restricted",
  "missing",
]);

async function main() {
  if (PUBLIC_SOURCE_EXPORT) {
    info("public-source-export",
      "GITHUB-UPLOAD-MANIFEST.json detected; local reference PDFs are expected to be absent and are audited as informational only");
  }

  const indexPath = path.join(ROOT, "data", "bibs", "index.json");
  if (!existsSync(indexPath)) {
    error("no-bib-index", `data/bibs/index.json not found`, { indexPath });
    return report();
  }
  const index = await readJson(indexPath);
  if (!Array.isArray(index?.bibs)) {
    error("bad-bib-index", `data/bibs/index.json has no "bibs" array`);
    return report();
  }

  const allQuestionIds = new Map(); // id -> [bibId,...]
  const entryById = new Map((index.bibs || []).map((entry) => [entry.id, entry]));
  for (const entry of index.bibs) {
    if (args.bib && entry.id !== args.bib) continue;
    summary.bibs++;
    await auditBib(entry, allQuestionIds, entryById);
  }

  // Cross-Bib collision check: IndexedDB stores all questions in one store
  // keyed by id, so duplicate ids across Bibs would clobber each other.
  for (const [id, bibIds] of allQuestionIds) {
    if (bibIds.length > 1) {
      error("cross-bib-id-collision",
        `question id "${id}" appears in multiple Bibs: ${bibIds.join(", ")}`,
        { id, bibIds });
    }
  }

  report();
}

async function auditBib(entry, allQuestionIds, entryById) {
  const bibDir = path.join(ROOT, entry.path.replace(/\//g, path.sep));
  const contentEntry = entry.contentBaseBib ? entryById.get(entry.contentBaseBib) : null;
  const contentDir = path.join(ROOT, (entry.contentBasePath || contentEntry?.path || entry.path).replace(/\//g, path.sep));
  const contentBibId = entry.contentBaseBib || entry.id;
  const usesSharedContent = path.resolve(contentDir) !== path.resolve(bibDir);
  const bibId = entry.id;

  const bibPath = path.join(bibDir, "bib.json");
  const questionsPath = path.join(bibDir, "questions.json");

  if (!existsSync(bibPath)) {
    error("missing-bib-json", `bib.json missing for ${bibId}`, { bibPath });
    return;
  }
  if (!existsSync(questionsPath)) {
    error("missing-questions-json", `questions.json missing for ${bibId}`, { questionsPath });
    return;
  }

  const bib = await readJson(bibPath);
  const questions = await readJson(questionsPath);

  await auditBibJson(bibId, bib, contentDir);
  await auditQuestions(bibId, questions, bib, allQuestionIds);
  await auditStudyGuides(bibId, bib, contentDir, { shared: usesSharedContent });
  await auditStudyGuideAssets(bibId, bib, contentDir, { assetBibId: contentBibId });
  await auditGuideAnchors(bibId, bib, contentDir, questions);
  await auditManifest(bibId, bibDir, bib);
  await auditSectionDensity(bibId, bib, questions);
}

async function auditBibJson(bibId, bib, bibDir) {
  if (!Array.isArray(bib?.references)) {
    error("bad-bib-json", `${bibId}: bib.json has no "references" array`);
    return;
  }
  // ----- sections[] validation (optional but checked when present) -----
  if (bib.sections !== undefined) {
    if (!Array.isArray(bib.sections)) {
      error("bib-sections-not-array", `${bibId}: bib.json sections must be an array if present`);
    } else {
      const sids = new Set();
      let totalItems = 0;
      let anyItemCount = false;
      for (const s of bib.sections) {
        if (!s.id)   error("section-missing-id", `${bibId}: section missing id`, { section: s });
        if (!s.name) warn("section-missing-name", `${bibId}: section ${s.id || "?"} missing name`);
        if (s.id) {
          if (sids.has(s.id)) error("section-duplicate-id", `${bibId}: duplicate section id "${s.id}"`);
          sids.add(s.id);
        }
        if (s.itemCount != null) {
          anyItemCount = true;
          if (!Number.isFinite(s.itemCount) || s.itemCount < 0) {
            error("section-bad-itemcount",
              `${bibId}/${s.id || "?"}: itemCount must be a non-negative number; got ${JSON.stringify(s.itemCount)}`);
          } else {
            totalItems += s.itemCount;
          }
        }
      }
      if (anyItemCount && totalItems === 0) {
        warn("section-zero-total-itemcount", `${bibId}: sections declared itemCount but total is zero`);
      }
      // Surface track / examType so the audit log records what's active.
      info("bib-track", `${bibId}: track=${bib.track || "(unset)"}, examType=${bib.examType || "(unset)"}, sections=${bib.sections.length}, itemCountTotal=${anyItemCount ? totalItems : "(unset)"}`);
    }
  }

  // ----- objectives[] validation (optional but checked when present) -----
  if (bib.objectives !== undefined) {
    if (!Array.isArray(bib.objectives)) {
      error("bib-objectives-not-array", `${bibId}: bib.json objectives must be an array if present`);
    } else {
      const oids = new Set();
      const sectionIds = new Set((bib.sections || []).map((s) => s.id));
      const refIds = new Set((bib.references || []).map((r) => r.id));
      const knownDepth = new Set(["foundation", "intermediate", "advanced", "chief"]);
      const knownRelevance = new Set(["regular", "substitute", "core", "local-private"]);
      for (const o of bib.objectives) {
        if (!o.id) { error("objective-missing-id", `${bibId}: objective missing id`, { objective: o }); continue; }
        if (oids.has(o.id)) error("objective-duplicate-id", `${bibId}: duplicate objective id "${o.id}"`);
        oids.add(o.id);
        if (!o.name) warn("objective-missing-name", `${bibId}/${o.id}: missing name`);
        if (!o.sectionId) {
          error("objective-missing-section", `${bibId}/${o.id}: missing sectionId`);
        } else if (sectionIds.size && !sectionIds.has(o.sectionId)) {
          error("objective-bad-section", `${bibId}/${o.id}: sectionId "${o.sectionId}" not in sections[]`);
        }
        if (o.depth && !knownDepth.has(o.depth)) {
          warn("objective-unknown-depth", `${bibId}/${o.id}: unknown depth "${o.depth}"`);
        }
        if (o.examRelevance && !knownRelevance.has(o.examRelevance)) {
          warn("objective-unknown-relevance", `${bibId}/${o.id}: unknown examRelevance "${o.examRelevance}"`);
        }
        if (Array.isArray(o.sourceRefs)) {
          for (const r of o.sourceRefs) {
            if (!refIds.has(r)) {
              error("objective-bad-source-ref",
                `${bibId}/${o.id}: sourceRefs item "${r}" not in bib.json references`);
            }
          }
        }
      }

      // Sections-without-objectives.
      const sectionsWithObjectives = new Set(bib.objectives.map((o) => o.sectionId));
      for (const s of (bib.sections || [])) {
        if (!sectionsWithObjectives.has(s.id)) {
          warn("section-no-objectives", `${bibId}/${s.id}: section has no objectives`);
        }
        if (Array.isArray(s.objectiveIds)) {
          for (const oid of s.objectiveIds) {
            if (!oids.has(oid)) {
              error("section-bad-objective-id", `${bibId}/${s.id}: objectiveIds entry "${oid}" not in objectives[]`);
            }
          }
        }
      }
      info("bib-objectives", `${bibId}: objectives=${bib.objectives.length}, sections=${sectionIds.size}, sourceRefs total unique=${[...new Set(bib.objectives.flatMap((o) => o.sourceRefs || []))].length}`);
    }
  }
  summary.refs += bib.references.length;
  const seen = new Set();
  let publicExportMissingLocalPaths = 0;
  for (const ref of bib.references) {
    if (!ref.id) {
      error("ref-missing-id", `${bibId}: reference entry missing "id"`, { ref });
      continue;
    }
    if (seen.has(ref.id)) {
      error("ref-duplicate-id", `${bibId}: duplicate reference id "${ref.id}"`, { id: ref.id });
    }
    seen.add(ref.id);
    if (!ref.title) warn("ref-missing-title", `${bibId}/${ref.id}: missing title`);
    if (!ref.availability) {
      warn("ref-missing-availability", `${bibId}/${ref.id}: missing "availability"`);
    } else if (!KNOWN_AVAILABILITY.has(ref.availability)) {
      warn("ref-unknown-availability",
        `${bibId}/${ref.id}: unknown availability "${ref.availability}"`,
        { availability: ref.availability });
    }
    if (ref.availability === "public-downloaded") {
      if (!ref.localPath) {
        warn("ref-public-no-localpath",
          `${bibId}/${ref.id}: public-downloaded ref has no localPath`);
      } else {
        const abs = path.join(bibDir, ref.localPath.replace(/\//g, path.sep));
        if (!existsSync(abs)) {
          if (PUBLIC_SOURCE_EXPORT) {
            publicExportMissingLocalPaths++;
          } else {
            warn("ref-localpath-missing",
              `${bibId}/${ref.id}: localPath does not exist on disk: ${ref.localPath}`,
              { localPath: ref.localPath });
          }
        }
      }
    }
  }
  if (publicExportMissingLocalPaths) {
    info("ref-localpath-excluded",
      `${bibId}: ${publicExportMissingLocalPaths} local reference file(s) intentionally absent from public source export`);
  }
}

async function auditQuestions(bibId, questions, bib, allQuestionIds) {
  if (!Array.isArray(questions)) {
    error("bad-questions-json", `${bibId}: questions.json is not an array`);
    return;
  }
  summary.questions += questions.length;

  const refIds = new Set((bib.references || []).map((r) => r.id));
  const sectionIds = new Set((bib.sections || []).map((s) => s.id));
  const objectiveIds = new Set((bib.objectives || []).map((o) => o.id));
  const objectiveById = new Map((bib.objectives || []).map((o) => [o.id, o]));
  const refExamScope = new Map((bib.references || []).map((r) => [r.id, r.examScope || "regular"]));
  const seen = new Set();
  let unmappedSection = 0;
  let regularQuestionsWithoutSection = 0;
  let unmappedObjective = 0;
  let regularQuestionsWithoutObjective = 0;
  const objectiveQuestionCounts = new Map();
  const VALID_CONFIDENCE = new Set(["source-verified", "public-adjacent", "restricted-summary", "remove-or-rewrite"]);
  const confidenceCounts = { "source-verified": 0, "public-adjacent": 0, "restricted-summary": 0, "remove-or-rewrite": 0, "(unset)": 0 };
  const VALID_SS_CONFIDENCE = new Set(["exact", "high", "medium", "low", "manual-needed"]);
  const ssConfidenceCounts = { exact: 0, high: 0, medium: 0, low: 0, "manual-needed": 0, "(unset)": 0 };
  const ssLowOrManual = [];
  // Quality-audit aggregates
  const stemExact = new Map();        // stem -> [ids]
  const stemNormalized = new Map();   // normalized stem -> [ids]
  const answerByPosition = [0, 0, 0, 0];
  const regularQuestionsWithoutSourceSection = [];
  const missingExplanation = [];
  const shortExplanation = [];        // explanation < 40 chars
  const compositeRebalanced = [];     // composite-answer question that got rebalanced
  const COMPOSITE_QUALITY_RE = /\b(?:all of the above|none of the above|both of the above|both [a-d] and [a-d]\b|[a-d] and [a-d] only\b|[a-d], [a-d],? and [a-d]\b)/i;

  for (const [idx, q] of questions.entries()) {
    const where = `${bibId} q#${idx}${q?.id ? ` (${q.id})` : ""}`;

    if (!q?.id) {
      error("q-missing-id", `${where}: question missing "id"`);
      continue;
    }
    if (seen.has(q.id)) {
      error("q-duplicate-id", `${bibId}: duplicate question id "${q.id}"`, { id: q.id });
    } else {
      seen.add(q.id);
      const list = allQuestionIds.get(q.id) || [];
      list.push(bibId);
      allQuestionIds.set(q.id, list);
    }

    if (typeof q.stem !== "string" || !q.stem.trim()) {
      error("q-missing-stem", `${where}: missing stem`);
    }
    if (!Array.isArray(q.choices) || q.choices.length < 2) {
      error("q-bad-choices", `${where}: choices must be an array of length >= 2`);
    }
    if (typeof q.answer !== "number" || !Number.isInteger(q.answer)) {
      error("q-bad-answer-type", `${where}: answer must be an integer`);
    } else if (Array.isArray(q.choices)) {
      if (q.answer < 0 || q.answer >= q.choices.length) {
        error("q-answer-out-of-range",
          `${where}: answer ${q.answer} out of range for ${q.choices.length} choices`);
      }
    }

    if (!q.sourceRef) {
      warn("q-missing-source-ref", `${where}: missing sourceRef`);
    } else if (!refIds.has(q.sourceRef)) {
      error("q-source-ref-not-in-bib",
        `${where}: sourceRef "${q.sourceRef}" not in bib.json references`,
        { sourceRef: q.sourceRef });
    }

    if (Array.isArray(q.refs)) {
      for (const r of q.refs) {
        if (!refIds.has(r)) {
          error("q-ref-not-in-bib",
            `${where}: refs item "${r}" not in bib.json references`,
            { ref: r });
        }
      }
    } else if (q.refs !== undefined) {
      error("q-refs-not-array", `${where}: refs must be an array if present`);
    }

    // ----- Quality checks (warnings only; data-contract errors stay above) -----
    if (typeof q.stem === "string" && q.stem.trim()) {
      const exact = q.stem.trim();
      if (!stemExact.has(exact)) stemExact.set(exact, []);
      stemExact.get(exact).push(q.id);
      const norm = exact.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
      if (!stemNormalized.has(norm)) stemNormalized.set(norm, []);
      stemNormalized.get(norm).push(q.id);
    }
    if (typeof q.explanation !== "string" || !q.explanation.trim()) {
      missingExplanation.push(q.id);
    } else if (q.explanation.trim().length < 40) {
      shortExplanation.push({ id: q.id, length: q.explanation.trim().length });
    }
    if (Array.isArray(q.choices) && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length) {
      if (q.answer < 4) answerByPosition[q.answer]++;
    }
    // Composite-answer rebalance detection: any "all/none/both/etc." text in
    // the choices, but the question doesn't carry `rebalanceLocked: true` and
    // a swap moved a non-composite text to the originally-composite slot.
    // For audit purposes the simpler heuristic: flag any composite-text
    // question whose answer choice text DOES NOT match the composite phrase.
    if (Array.isArray(q.choices) && q.choices.some((c) => typeof c === "string" && COMPOSITE_QUALITY_RE.test(c))) {
      const chosen = q.choices[q.answer];
      if (typeof chosen === "string" && !COMPOSITE_QUALITY_RE.test(chosen) && q.rebalanceLocked !== true) {
        compositeRebalanced.push(q.id);
      }
    }

    // ----- sourceConfidence enum + count -----
    if (q.sourceConfidence != null) {
      if (!VALID_CONFIDENCE.has(q.sourceConfidence)) {
        error("q-bad-source-confidence",
          `${where}: sourceConfidence "${q.sourceConfidence}" not one of ` +
          `${[...VALID_CONFIDENCE].join(" | ")}`,
          { sourceConfidence: q.sourceConfidence });
      } else {
        confidenceCounts[q.sourceConfidence]++;
      }
    } else {
      confidenceCounts["(unset)"]++;
    }

    // ----- sourceSectionConfidence enum + count -----
    if (q.sourceSectionConfidence != null) {
      if (!VALID_SS_CONFIDENCE.has(q.sourceSectionConfidence)) {
        error("q-bad-source-section-confidence",
          `${where}: sourceSectionConfidence "${q.sourceSectionConfidence}" not one of ` +
          `${[...VALID_SS_CONFIDENCE].join(" | ")}`,
          { sourceSectionConfidence: q.sourceSectionConfidence });
      } else {
        ssConfidenceCounts[q.sourceSectionConfidence]++;
        if (q.sourceSectionConfidence === "low" || q.sourceSectionConfidence === "manual-needed") {
          ssLowOrManual.push({ id: q.id, sourceRef: q.sourceRef, sourceSection: q.sourceSection, tier: q.sourceSectionConfidence });
        }
      }
    } else {
      ssConfidenceCounts["(unset)"]++;
    }

    // ----- section assignment (only audited when bib declares sections) -----
    if (sectionIds.size > 0) {
      const scope = q.sourceRef ? (refExamScope.get(q.sourceRef) || "regular") : "regular";
      if (q.primarySection == null) {
        unmappedSection++;
        if (scope !== "substitute") regularQuestionsWithoutSection++;
      } else if (!sectionIds.has(q.primarySection)) {
        error("q-bad-primary-section",
          `${where}: primarySection "${q.primarySection}" not in bib.json sections`,
          { primarySection: q.primarySection });
      }
      if (Array.isArray(q.sectionTags)) {
        for (const t of q.sectionTags) {
          if (!sectionIds.has(t)) {
            warn("q-bad-section-tag",
              `${where}: sectionTags item "${t}" not in bib.json sections`,
              { tag: t });
          }
        }
      }
    }

    // ----- objective assignment (only audited when bib declares objectives) -----
    if (objectiveIds.size > 0) {
      const scope = q.sourceRef ? (refExamScope.get(q.sourceRef) || "regular") : "regular";
      if (q.primaryObjective == null) {
        unmappedObjective++;
        if (scope !== "substitute") regularQuestionsWithoutObjective++;
      } else if (!objectiveIds.has(q.primaryObjective)) {
        error("q-bad-primary-objective",
          `${where}: primaryObjective "${q.primaryObjective}" not in bib.json objectives`,
          { primaryObjective: q.primaryObjective });
      } else {
        objectiveQuestionCounts.set(q.primaryObjective, (objectiveQuestionCounts.get(q.primaryObjective) || 0) + 1);
      }
      if (Array.isArray(q.objectiveTags)) {
        for (const t of q.objectiveTags) {
          if (!objectiveIds.has(t)) {
            warn("q-bad-objective-tag",
              `${where}: objectiveTags item "${t}" not in bib.json objectives`,
              { tag: t });
          }
        }
      }
      // Section consistency: q.primarySection should match objective.sectionId.
      if (q.primaryObjective && q.primarySection && objectiveById.has(q.primaryObjective)) {
        const expectedSection = objectiveById.get(q.primaryObjective).sectionId;
        if (expectedSection && q.primarySection !== expectedSection) {
          warn("q-section-objective-mismatch",
            `${where}: primarySection "${q.primarySection}" differs from primaryObjective's sectionId "${expectedSection}"`,
            { primarySection: q.primarySection, primaryObjective: q.primaryObjective, expectedSection });
        }
      }
    }

    // Missing sourceSection on regular-exam questions (after section block
    // so we already know `scope` for this question).
    {
      const scope = q.sourceRef ? (refExamScope.get(q.sourceRef) || "regular") : "regular";
      if (scope !== "substitute" && (typeof q.sourceSection !== "string" || !q.sourceSection.trim())) {
        regularQuestionsWithoutSourceSection.push(q.id);
      }
    }
  }

  // ----- Aggregate quality findings -----
  const duplicateExact = [...stemExact.entries()].filter(([, ids]) => ids.length > 1);
  const duplicateNormalized = [...stemNormalized.entries()].filter(([, ids]) => ids.length > 1);
  if (duplicateExact.length) {
    warn("q-duplicate-stem-exact",
      `${bibId}: ${duplicateExact.length} duplicate exact stem group(s)`,
      { groups: duplicateExact.map(([stem, ids]) => ({ stem: stem.slice(0, 80), ids })) });
  }
  // Only flag normalized duplicates that are NOT also exact duplicates (those
  // are already covered above; including them would double-report).
  const exactKeys = new Set(duplicateExact.map(([s]) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()));
  const normOnly = duplicateNormalized.filter(([k]) => !exactKeys.has(k));
  if (normOnly.length) {
    warn("q-duplicate-stem-normalized",
      `${bibId}: ${normOnly.length} normalized-duplicate stem group(s) (case/punctuation collisions)`,
      { groups: normOnly.map(([stem, ids]) => ({ stem: stem.slice(0, 80), ids })) });
  }
  if (missingExplanation.length) {
    warn("q-missing-explanation",
      `${bibId}: ${missingExplanation.length} question(s) without explanation`,
      { ids: missingExplanation });
  }
  if (shortExplanation.length) {
    warn("q-short-explanation",
      `${bibId}: ${shortExplanation.length} question(s) with explanation under 40 chars`,
      { sample: shortExplanation.slice(0, 8) });
  }
  if (regularQuestionsWithoutSourceSection.length) {
    warn("q-regular-no-source-section",
      `${bibId}: ${regularQuestionsWithoutSourceSection.length} regular-exam question(s) without sourceSection (View source cannot anchor)`,
      { sample: regularQuestionsWithoutSourceSection.slice(0, 12) });
  }
  if (compositeRebalanced.length) {
    warn("q-composite-likely-rebalanced",
      `${bibId}: ${compositeRebalanced.length} question(s) with composite-answer text but the answer index points at a non-composite choice (set rebalanceLocked: true on the question)`,
      { ids: compositeRebalanced });
  }

  // Answer-distribution tolerance (18% .. 32%).
  const ansTotal = answerByPosition.reduce((s, x) => s + x, 0);
  if (ansTotal > 0) {
    const outliers = [];
    for (let i = 0; i < 4; i++) {
      const pct = (answerByPosition[i] / ansTotal) * 100;
      if (pct < 18 || pct > 32) outliers.push({ letter: String.fromCharCode(65 + i), count: answerByPosition[i], pct: pct.toFixed(1) + "%" });
    }
    if (outliers.length) {
      warn("q-answer-distribution-outlier",
        `${bibId}: answer position outside 18-32% tolerance for ${outliers.length} slot(s)`,
        { outliers });
    } else {
      info("q-answer-distribution-ok", `${bibId}: answer positions within 18-32% tolerance (` +
        ["A","B","C","D"].map((l, i) => `${l}:${(answerByPosition[i]/ansTotal*100).toFixed(1)}%`).join(", ") +
        ")");
    }
  }
  if (sectionIds.size > 0) {
    if (regularQuestionsWithoutSection > 0) {
      warn("regular-questions-without-section",
        `${bibId}: ${regularQuestionsWithoutSection} regular-exam question(s) have no primarySection - readiness math will skip them`,
        { count: regularQuestionsWithoutSection });
    }
    if (unmappedSection > 0 && unmappedSection !== regularQuestionsWithoutSection) {
      info("substitute-questions-without-section",
        `${bibId}: ${unmappedSection - regularQuestionsWithoutSection} substitute-only question(s) lack primarySection (informational; substitute scope is excluded from regular readiness anyway)`);
    }
  }
  if (objectiveIds.size > 0) {
    if (regularQuestionsWithoutObjective > 0) {
      warn("regular-questions-without-objective",
        `${bibId}: ${regularQuestionsWithoutObjective} regular-exam question(s) have no primaryObjective - re-run scripts/map-objectives.mjs`,
        { count: regularQuestionsWithoutObjective });
    }
    if (unmappedObjective > 0 && unmappedObjective !== regularQuestionsWithoutObjective) {
      info("substitute-questions-without-objective",
        `${bibId}: ${unmappedObjective - regularQuestionsWithoutObjective} substitute-only question(s) lack primaryObjective (informational)`);
    }
    // Surface objectives with zero primary-questions.
    const emptyByRelevance = { regular: [], substitute: [], other: [] };
    for (const o of (bib.objectives || [])) {
      const n = objectiveQuestionCounts.get(o.id) || 0;
      if (n === 0) {
        const rel = o.examRelevance || "regular";
        if (rel === "regular") emptyByRelevance.regular.push(o.id);
        else if (rel === "substitute") emptyByRelevance.substitute.push(o.id);
        else emptyByRelevance.other.push(`${o.id} (${rel})`);
      }
    }
    if (emptyByRelevance.regular.length) {
      warn("objectives-no-primary-questions-regular",
        `${bibId}: ${emptyByRelevance.regular.length} regular objective(s) have zero primary questions (coverage hole)`,
        { ids: emptyByRelevance.regular });
    }
    if (emptyByRelevance.substitute.length) {
      info("objectives-no-primary-questions-substitute",
        `${bibId}: ${emptyByRelevance.substitute.length} substitute-only objective(s) have zero primary questions (expected; substitute corpus not seeded)`,
        { ids: emptyByRelevance.substitute });
    }
    if (emptyByRelevance.other.length) {
      info("objectives-no-primary-questions-other",
        `${bibId}: ${emptyByRelevance.other.length} objective(s) with non-standard relevance have zero primary questions`,
        { ids: emptyByRelevance.other });
    }
  }
  const confSummary = Object.entries(confidenceCounts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}: ${n}`)
    .join(" | ");
  info("source-confidence", `${bibId}: ${confSummary}`);

  const ssSummary = Object.entries(ssConfidenceCounts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}: ${n}`)
    .join(" | ");
  info("source-section-confidence", `${bibId}: ${ssSummary}`);
  if (ssLowOrManual.length) {
    warn("q-source-section-low-confidence",
      `${bibId}: ${ssLowOrManual.length} question(s) carry low/manual-needed sourceSectionConfidence - operator review recommended`,
      { sample: ssLowOrManual.slice(0, 12) });
  }
}

async function auditStudyGuides(bibId, bib, bibDir, opts = {}) {
  const guidesDir = path.join(bibDir, "study-guides");
  if (!existsSync(guidesDir)) {
    info("no-study-guides-dir", `${bibId}: no study-guides directory`, { guidesDir });
    return;
  }
  const guideFiles = (await readdir(guidesDir)).filter((f) => f.endsWith(".md"));
  if (!opts.shared) summary.guides += guideFiles.length;
  const guideSet = new Set(guideFiles.map((f) => f.replace(/\.md$/, "")));
  const refIds = new Set((bib.references || []).map((r) => r.id));

  for (const refId of refIds) {
    if (!guideSet.has(refId)) {
      warn("ref-without-guide", `${bibId}/${refId}: no study-guides/${refId}.md`);
    }
  }
  for (const g of guideSet) {
    if (!opts.shared && !refIds.has(g)) {
      warn("guide-without-ref",
        `${bibId}: study-guides/${g}.md has no matching ref in bib.json`,
        { guide: g });
    }
  }
}

// Manifest summary keys are camelCase; canonical availability is kebab-case.
// Map known summary keys back to canonical availability for drift detection.
const MANIFEST_KEY_TO_AVAILABILITY = {
  publicDownloaded: "public-downloaded",
  publicOnline: "public-online",
  needsUser: "needs-user",
  cuiFouo: "cui-fouo",
  classified: "classified",
  restricted: "restricted",
  missing: "missing",
};

async function auditStudyGuideAssets(bibId, bib, bibDir, opts = {}) {
  const guidesDir = path.join(bibDir, "study-guides");
  if (!existsSync(guidesDir)) return;
  const assetBibId = opts.assetBibId || bibId;

  const UNSAFE = /^(?:javascript|vbscript|data|file):/i;
  const IMAGE_RE = /!\[[^\]]*\]\(([^)]+)\)/g;
  const LINK_RE  = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;

  const stats = { imagesChecked: 0, localDocLinksChecked: 0, externalLinks: 0,
                  imagesMissing: [], localLinksMissing: [], unsafe: [] };

  const guideFiles = (await readdir(guidesDir)).filter((f) => f.endsWith(".md"));
  for (const f of guideFiles) {
    const abs = path.join(guidesDir, f);
    const src = await readFile(abs, "utf8");
    scan(src, "image", IMAGE_RE);
    scan(src, "link",  LINK_RE);

    function scan(text, kind, re) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        const url = m[1].trim();
        if (UNSAFE.test(url) || url.startsWith("//")) {
          stats.unsafe.push({ guide: f, kind, url });
          error("guide-unsafe-asset", `${bibId}/${f}: unsafe ${kind} URL "${url}"`, { guide: f, kind, url });
          continue;
        }
        if (/^https?:\/\//i.test(url) || url.startsWith("mailto:")) {
          if (kind === "link") stats.externalLinks++;
          continue;
        }
        if (url.startsWith("#")) continue;

        let local = null;
        if (url.startsWith("data/bibs/")) {
          local = url;
        } else if (url.startsWith("images/")) {
          local = `data/bibs/${assetBibId}/study-guides/${url}`;
        } else if (url.startsWith("references/")) {
          local = `data/bibs/${assetBibId}/${url}`;
        } else if (url.startsWith("/")) {
          local = url.replace(/^\/+/, "");
        }

        if (!local) continue;
        const decoded = local.split("/").map(decodeURIComponentSafe).join(path.sep);
        const onDisk = path.join(ROOT, decoded);
        if (kind === "image") {
          stats.imagesChecked++;
          if (!existsSync(onDisk)) {
            stats.imagesMissing.push({ guide: f, url, resolved: local });
            warn("guide-image-missing", `${bibId}/${f}: image not found on disk: ${local}`, { guide: f, url, resolved: local });
          }
        } else {
          stats.localDocLinksChecked++;
          if (!existsSync(onDisk)) {
            stats.localLinksMissing.push({ guide: f, url, resolved: local });
            if (PUBLIC_SOURCE_EXPORT && local.includes("/references/")) {
              continue;
            }
            warn("guide-doc-link-missing", `${bibId}/${f}: linked file not found on disk: ${local}`, { guide: f, url, resolved: local });
          }
        }
      }
    }
  }

  info("guide-asset-report",
    `${bibId}: scanned ${guideFiles.length} guide(s); ` +
    `images checked=${stats.imagesChecked} (missing ${stats.imagesMissing.length}); ` +
    `local doc links checked=${stats.localDocLinksChecked} (missing ${stats.localLinksMissing.length}); ` +
    `external http(s) links=${stats.externalLinks}; ` +
    `unsafe schemes=${stats.unsafe.length}`);
}

function decodeURIComponentSafe(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

// Mirrors js/markdown.js::slugify. Kept in sync by hand; if the renderer
// changes, this audit will start over- or under-reporting until updated.
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/**
 * Verify each question's `sourceSection` resolves to a real heading slug in
 * its sourceRef's study guide. View source on a question is only useful when
 * the anchor lands near actual content.
 */
async function auditGuideAnchors(bibId, bib, bibDir, questions) {
  const guidesDir = path.join(bibDir, "study-guides");
  if (!existsSync(guidesDir)) return;
  const slugCache = new Map(); // refId -> Set<slug> | null (file missing)
  let checked = 0, missing = [], orphanRef = [];
  const HEADING_RE = /^(#{1,6})\s+(.+?)(?:\s*\{#([\w\-:.]+)\})?\s*$/;
  async function loadSlugs(refId) {
    if (slugCache.has(refId)) return slugCache.get(refId);
    const p = path.join(guidesDir, `${refId}.md`);
    if (!existsSync(p)) { slugCache.set(refId, null); return null; }
    const src = await readFile(p, "utf8");
    const slugs = new Set();
    for (const line of src.split(/\r?\n/)) {
      const m = HEADING_RE.exec(line);
      if (!m) continue;
      slugs.add(m[3] || slugify(m[2]));
    }
    slugCache.set(refId, slugs);
    return slugs;
  }

  for (const q of questions) {
    if (!q.sourceRef || !q.sourceSection) continue;
    const slugs = await loadSlugs(q.sourceRef);
    if (slugs == null) {
      orphanRef.push({ id: q.id, sourceRef: q.sourceRef });
      continue;
    }
    checked++;
    if (!slugs.has(q.sourceSection)) {
      missing.push({ id: q.id, sourceRef: q.sourceRef, sourceSection: q.sourceSection });
    }
  }

  if (missing.length) {
    warn("q-source-section-no-anchor",
      `${bibId}: ${missing.length} question(s) point at a sourceSection slug that has no matching guide heading - "View source" will land at the top of the guide`,
      { sample: missing.slice(0, 12) });
  }
  if (orphanRef.length) {
    info("q-source-section-no-guide",
      `${bibId}: ${orphanRef.length} question(s) reference a sourceRef with no on-disk study guide (anchor not checkable)`,
      { sample: orphanRef.slice(0, 8) });
  }
  info("q-source-section-anchors-ok", `${bibId}: ${checked - missing.length}/${checked} sourceSection anchors resolve to real headings`);
}

async function auditSectionDensity(bibId, bib, questions) {
  if (!Array.isArray(bib.sections) || bib.sections.length === 0) return;
  const refExamScope = new Map((bib.references || []).map((r) => [r.id, r.examScope || "regular"]));
  const counts = new Map();
  for (const q of questions) {
    if (!q.primarySection) continue;
    const scope = q.sourceRef ? (refExamScope.get(q.sourceRef) || "regular") : "regular";
    if (scope === "substitute") continue;
    counts.set(q.primarySection, (counts.get(q.primarySection) || 0) + 1);
  }
  const rows = [];
  for (const s of bib.sections) {
    const n = counts.get(s.id) || 0;
    const ic = Number.isFinite(s.itemCount) ? s.itemCount : null;
    const ratio = (ic && ic > 0) ? (n / ic) : null;
    rows.push({ id: s.id, code: s.code || s.id, itemCount: ic, primaryCount: n, ratio });
  }
  for (const r of rows) {
    if (r.itemCount && r.primaryCount < r.itemCount) {
      warn("section-density-below-1",
        `${bibId}/${r.code}: ${r.primaryCount} primary questions vs itemCount ${r.itemCount} (ratio ${r.ratio?.toFixed(2)}x) - consider authoring more`,
        { ...r });
    }
  }
  const summary = rows.map((r) => `${r.code}: ${r.primaryCount}/${r.itemCount ?? "?"} (${r.ratio == null ? "?" : r.ratio.toFixed(2) + "x"})`).join(" | ");
  info("section-density", `${bibId}: ${summary}`);
}

async function auditManifest(bibId, bibDir, bib) {
  const manifestPath = path.join(bibDir, "references", "MANIFEST.json");
  if (!existsSync(manifestPath)) {
    info("no-manifest", `${bibId}: no references/MANIFEST.json`);
    return;
  }
  const manifest = await readJson(manifestPath);
  const summary_ = manifest.summary || {};
  const byAvail = {};
  for (const r of bib.references || []) {
    if (!r.availability) continue;
    byAvail[r.availability] = (byAvail[r.availability] || 0) + 1;
  }
  const totalRefs = (bib.references || []).length;
  for (const key of Object.keys(summary_)) {
    const claimed = Number(summary_[key]);
    if (!Number.isFinite(claimed)) continue;
    if (key === "total") {
      if (claimed !== totalRefs) {
        warn("manifest-total-drift",
          `${bibId}: MANIFEST.summary.total=${claimed} but bib.json has ${totalRefs} references`,
          { claimed, actual: totalRefs });
      }
      continue;
    }
    const canonical = MANIFEST_KEY_TO_AVAILABILITY[key];
    if (!canonical) {
      // Manifest-specific bucket (e.g. corrupted, publicMissing) — informational, not an availability drift.
      info("manifest-extra-key",
        `${bibId}: MANIFEST.summary.${key}=${claimed} (no matching availability enum; informational only)`);
      continue;
    }
    const actual = byAvail[canonical] || 0;
    if (claimed !== actual) {
      warn("manifest-count-drift",
        `${bibId}: MANIFEST.summary.${key}=${claimed} but ${actual} refs have availability="${canonical}"`,
        { key, canonical, claimed, actual });
    }
  }
}

function parseArgs(argv) {
  const out = { json: false, strict: false, bib: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--strict") out.strict = true;
    else if (a === "--bib") out.bib = argv[++i];
    else if (a === "-h" || a === "--help") {
      console.log("Usage: node scripts/audit-data.mjs [--bib <id>] [--strict] [--json]");
      process.exit(0);
    }
  }
  return out;
}

async function readJson(p) {
  const txt = await readFile(p, "utf8");
  try {
    return JSON.parse(txt);
  } catch (e) {
    error("json-parse-error", `failed to parse ${p}: ${e.message}`, { path: p });
    return {};
  }
}

function error(code, message, detail) { findings.errors.push({ code, message, detail }); }
function warn(code, message, detail)  { findings.warnings.push({ code, message, detail }); }
function info(code, message, detail)  { findings.info.push({ code, message, detail }); }

function report() {
  if (args.json) {
    console.log(JSON.stringify({ summary, findings }, null, 2));
  } else {
    const lines = [];
    lines.push("=== Bibmaxxing data audit ===");
    lines.push(`bibs=${summary.bibs} refs=${summary.refs} questions=${summary.questions} guides=${summary.guides}`);
    lines.push("");
    if (findings.errors.length) {
      lines.push(`ERRORS (${findings.errors.length}):`);
      for (const f of findings.errors) lines.push(`  [${f.code}] ${f.message}`);
      lines.push("");
    }
    if (findings.warnings.length) {
      lines.push(`WARNINGS (${findings.warnings.length}):`);
      for (const f of findings.warnings) lines.push(`  [${f.code}] ${f.message}`);
      lines.push("");
    }
    if (findings.info.length) {
      lines.push(`INFO (${findings.info.length}):`);
      for (const f of findings.info) lines.push(`  [${f.code}] ${f.message}`);
      lines.push("");
    }
    if (!findings.errors.length && !findings.warnings.length) {
      lines.push("Clean. No errors, no warnings.");
    }
    console.log(lines.join("\n"));
  }
  if (findings.errors.length) process.exit(1);
  if (args.strict && findings.warnings.length) process.exit(2);
  process.exit(0);
}

main().catch((e) => {
  console.error("audit-data: fatal:", e);
  process.exit(1);
});
