/* =========================================================================
   Section-weighted readiness model.

   Bibmaxxing renders Navy advancement Bibs as section-weighted exam tracks.
   Each section ships in bib.json with a label, code, and an item count that
   doubles as the section's weight on the actual NWAE. Item counts are
   placeholders until the operator enters real numbers from their profile
   sheet (Manage > Profile sheet), which are stored locally in the IndexedDB
   settings store under `profile-sheet:<bibId>`.

   This module is pure functions over data. No DOM. Tested with light
   pseudo-fixtures from the dashboard/quiz/exam views.
   ========================================================================= */

import { isDue } from "./srs.js";

const PROFILE_KEY_PREFIX = "profile-sheet:";
const MASTERY_INTERVAL_DAYS = 21;
const FRESHNESS_HALFLIFE_DAYS = 21;

// Confidence factor: scales a question's mastery contribution toward readiness
// based on how trustworthy its source is. SRS scheduling is untouched - a
// public-adjacent card still moves through review cadence normally - but it
// counts less toward exam readiness because the underlying source is partial.
const CONFIDENCE_FACTOR = {
  "source-verified":     1.0,
  "public-adjacent":     0.8,
  "restricted-summary":  0.5,
  "remove-or-rewrite":   0.0,
};
export function confidenceFactor(value) {
  if (value == null) return 1.0;
  const f = CONFIDENCE_FACTOR[value];
  return Number.isFinite(f) ? f : 1.0;
}

export function profileSheetKey(bibId) { return PROFILE_KEY_PREFIX + bibId; }

/**
 * Merge bib.json section definitions with any local profile-sheet override.
 * Profile-sheet `sections[].itemCount` always wins when present and >= 0.
 *
 *   loadSections(bib, profileSheet?) -> [{id, name, code, itemCount, weightSource, aliases, topicTags, ...}]
 */
export function loadSections(bib, profileSheet) {
  const overrides = new Map();
  if (profileSheet && Array.isArray(profileSheet.sections)) {
    for (const s of profileSheet.sections) {
      if (s.id) overrides.set(s.id, s);
    }
  }
  const out = [];
  for (const s of (bib?.sections || [])) {
    const o = overrides.get(s.id);
    const itemCount = (o && Number.isFinite(o.itemCount) && o.itemCount >= 0)
      ? o.itemCount
      : (Number.isFinite(s.itemCount) && s.itemCount >= 0 ? s.itemCount : null);
    out.push({
      ...s,
      itemCount,
      itemCountSource: o ? "profile-sheet" : (s.weightSource || "bib.json"),
      profile: o || null,
    });
  }
  return out;
}

/**
 * Decide whether the active Bib is an exam-readiness track or a reference-only
 * track. Reference-only ("core") tracks skip exam readiness entirely.
 */
export function isExamTrack(bib) {
  const t = bib?.examType;
  return t !== "core" && t !== "reference-only";
}

/**
 * Build a quick lookup of each ref's examScope. Defaults to "regular" when
 * the ref does not declare one. Substitute-only refs are explicitly tagged.
 */
function refExamScopeMap(bib) {
  const m = new Map();
  for (const r of (bib?.references || [])) {
    m.set(r.id, r.examScope || "regular");
  }
  return m;
}

/**
 * Drop substitute-only questions when scoring the regular exam. Other exam
 * types pass through their matching scope or "both".
 *
 *   filterForExamType(questions, bib, "regular") -> questions[]
 */
export function filterForExamType(questions, bib, examType) {
  if (!examType || examType === "all" || examType === "core") return questions.slice();
  const scopeOf = refExamScopeMap(bib);
  return questions.filter((q) => {
    const scope = scopeOf.get(q.sourceRef) || "regular";
    if (examType === "regular")    return scope !== "substitute";
    if (examType === "substitute") return scope !== "regular-only";
    return true;
  });
}

/**
 * Group filtered questions by their primarySection. Questions without a
 * primarySection are placed under "_unmapped" so callers can surface them.
 */
export function questionsBySection(questions) {
  const m = new Map();
  for (const q of questions) {
    const k = q.primarySection || "_unmapped";
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(q);
  }
  return m;
}

/**
 * Per-question readiness signals derived from SRS progress.
 *   - seen:      the user has reviewed it at least once (progress row exists).
 *   - mastered:  interval >= 21 days (the dashboard's existing convention).
 *   - dueNow:    due / overdue.
 */
function questionState(q, prog) {
  if (!prog) return { seen: false, mastered: false, dueNow: false, ease: 2.5 };
  return {
    seen: true,
    mastered: (prog.interval || 0) >= MASTERY_INTERVAL_DAYS,
    dueNow: isDue(prog),
    ease: prog.ease ?? 2.5,
  };
}

/**
 * Section mastery + coverage + weight signals.
 *
 *   {
 *     id, name, code, weight, normalizedWeight,
 *     total, seen, mastered, dueNow,
 *     coverage:  seen / total,
 *     mastery:   mastered / total,
 *     gap:       1 - mastery,
 *     weightedGap: gap * weight (drives the "heaviest weak" ranking),
 *     averageEase
 *   }
 */
function buildSectionReport(section, totalWeight, questions, progressByQid) {
  let seen = 0, mastered = 0, masteredAdjusted = 0, dueNow = 0, easeSum = 0, easeN = 0;
  for (const q of questions) {
    const st = questionState(q, progressByQid.get(q.id));
    const cf = confidenceFactor(q.sourceConfidence);
    if (st.seen)     { seen++; easeSum += st.ease; easeN++; }
    if (st.mastered) { mastered++; masteredAdjusted += cf; }
    if (st.dueNow)   dueNow++;
  }
  const total = questions.length;
  const masteryRaw = total > 0 ? mastered / total : 0;
  const mastery    = total > 0 ? masteredAdjusted / total : 0;
  const coverage   = total > 0 ? seen / total : 0;
  const weight = section.itemCount ?? null;
  const normalizedWeight = (weight != null && totalWeight > 0) ? weight / totalWeight : null;
  const gap = 1 - mastery;
  // Use itemCount when present, otherwise fall back to per-section equal weight.
  const effectiveWeight = (weight != null) ? weight : 1;
  return {
    id: section.id,
    name: section.name,
    code: section.code || section.id,
    weight,
    normalizedWeight,
    effectiveWeight,
    total,
    seen,
    mastered,             // raw count of mastered questions
    masteredAdjusted,     // confidence-weighted "effective mastered" count
    dueNow,
    coverage,
    mastery,              // confidence-adjusted mastery (headline number)
    masteryRaw,           // unadjusted mastery for comparison / caveat
    gap,
    weightedGap: gap * effectiveWeight,
    averageEase: easeN > 0 ? (easeSum / easeN) : null,
    itemCountSource: section.itemCountSource,
  };
}

/**
 * Single-call readiness summary for the dashboard, quiz, and exam views.
 *
 * Inputs:
 *   bib            - active Bib record
 *   questions      - all questions for the bib (already from IDB)
 *   progress       - all progress rows for the bib (already from IDB)
 *   options:
 *     profileSheet - operator override for section item counts
 *     examType     - "regular" (default) / "substitute" / "core" / "all"
 *
 * Output shape:
 *   {
 *     examType, isExamTrack, totalWeight,
 *     sections: [SectionReport...],   // ordered to match bib.sections
 *     weighted: 0..1,                  // Σ(mastery × weight) / Σ(weight)
 *     equalWeighted: 0..1,             // simple average across sections (fallback math)
 *     coverage: 0..1,                  // (seen across all sections) / total
 *     totalQuestions,
 *     unmapped: { count, questions[] },
 *     weakHeavy: SectionReport | null  // section with the largest weighted gap
 *   }
 */
export function readinessReport(bib, questions, progress, options = {}) {
  const opts = { examType: bib?.examType || "regular", ...options };
  const sections = loadSections(bib, opts.profileSheet);
  const examScope = opts.examType;
  const filtered = filterForExamType(questions, bib, examScope);
  const bySection = questionsBySection(filtered);
  const progressByQid = (progress instanceof Map)
    ? progress
    : new Map((progress || []).map((p) => [p.questionId, p]));

  const totalWeight = sections.reduce((a, s) => a + (s.itemCount || 0), 0);
  const reports = sections.map((s) => buildSectionReport(s, totalWeight, bySection.get(s.id) || [], progressByQid));

  // Weighted readiness using itemCount (placeholder or real). When no section
  // has an itemCount, fall back to equal-weight average across sections.
  let weighted = 0;
  let equalWeighted = 0;
  let totalSeen = 0;
  let totalQuestions = 0;

  let weightedRaw = 0;
  if (totalWeight > 0) {
    let weightedScoreSum = 0;
    let weightedRawSum = 0;
    for (const r of reports) {
      const w = r.weight || 0;
      weightedScoreSum += r.mastery * w;
      weightedRawSum   += r.masteryRaw * w;
    }
    weighted = weightedScoreSum / totalWeight;
    weightedRaw = weightedRawSum / totalWeight;
  } else {
    weighted = reports.length
      ? reports.reduce((a, r) => a + r.mastery, 0) / reports.length
      : 0;
    weightedRaw = reports.length
      ? reports.reduce((a, r) => a + r.masteryRaw, 0) / reports.length
      : 0;
  }
  equalWeighted = reports.length
    ? reports.reduce((a, r) => a + r.mastery, 0) / reports.length
    : 0;

  for (const r of reports) { totalSeen += r.seen; totalQuestions += r.total; }
  const coverage = totalQuestions > 0 ? totalSeen / totalQuestions : 0;

  const unmappedQuestions = bySection.get("_unmapped") || [];
  const unmapped = { count: unmappedQuestions.length, questions: unmappedQuestions };

  // Heaviest weak section: the one with the largest weighted gap *and* at
  // least one question to drill. A section with zero questions is surfaced
  // separately (the dashboard interprets that as "coverage hole").
  let weakHeavy = null;
  let weakHeavyDrillable = null;
  for (const r of reports) {
    if (!weakHeavy || r.weightedGap > weakHeavy.weightedGap) weakHeavy = r;
    if (r.total > 0 && (!weakHeavyDrillable || r.weightedGap > weakHeavyDrillable.weightedGap)) {
      weakHeavyDrillable = r;
    }
  }

  const report = {
    examType: examScope,
    isExamTrack: isExamTrack(bib),
    totalWeight,
    sections: reports,
    weighted,          // confidence-adjusted headline
    weightedRaw,       // unadjusted comparison
    equalWeighted,
    coverage,
    totalSeen,
    totalQuestions,
    unmapped,
    weakHeavy,
    weakHeavyDrillable,
  };
  // Attach objective-level layer when the Bib declares one.
  attachObjectiveReport(report, bib, filtered, progressByQid, examScope, Date.now());
  return report;
}

/**
 * Produce a weighted question pool for a mock exam of `targetTotal` items
 * across the bib's sections. Allocates each section by its weight share, then
 * randomly samples from that section's pool. Returns the selected question IDs.
 *
 * If a section runs short on questions, the shortfall is redistributed
 * proportionally across the remaining sections so the total still hits
 * `targetTotal` when corpus allows.
 */
export function pickWeightedExamQuestions(bib, questions, targetTotal, opts = {}) {
  const examType = opts.examType || bib?.examType || "regular";
  const filtered = filterForExamType(questions, bib, examType);
  const sections = loadSections(bib, opts.profileSheet);
  const bySection = questionsBySection(filtered);
  const totalWeight = sections.reduce((a, s) => a + (s.itemCount || 0), 0);

  if (totalWeight === 0 || targetTotal <= 0) {
    const all = filtered.map((q) => q.id);
    return shuffleArray(all).slice(0, Math.max(0, targetTotal));
  }

  // First pass: ideal allocation rounded down.
  const alloc = [];
  let allocated = 0;
  for (const s of sections) {
    const pool = (bySection.get(s.id) || []).map((q) => q.id);
    const ideal = (s.itemCount || 0) / totalWeight * targetTotal;
    const want = Math.min(pool.length, Math.floor(ideal));
    allocated += want;
    alloc.push({ id: s.id, pool, want, ideal });
  }
  // Distribute the rounding remainder by largest fractional part first.
  let remainder = targetTotal - allocated;
  alloc.sort((a, b) => (b.ideal - Math.floor(b.ideal)) - (a.ideal - Math.floor(a.ideal)));
  for (const a of alloc) {
    if (remainder <= 0) break;
    const room = a.pool.length - a.want;
    if (room > 0) { a.want += 1; remainder -= 1; }
  }
  // Distribute any further shortfall across sections that still have room.
  if (remainder > 0) {
    let progress = true;
    while (remainder > 0 && progress) {
      progress = false;
      for (const a of alloc) {
        if (remainder <= 0) break;
        if (a.pool.length > a.want) { a.want += 1; remainder -= 1; progress = true; }
      }
    }
  }

  // Sample the chosen counts from each section.
  const chosen = [];
  for (const a of alloc) {
    const ids = shuffleArray(a.pool.slice()).slice(0, a.want);
    for (const id of ids) chosen.push(id);
  }
  return shuffleArray(chosen);
}

/**
 * Weighted readiness as a one-shot scalar between 0 and 1. Convenience for
 * places that only want the headline number.
 */
export function weightedReadiness(bib, questions, progress, opts) {
  return readinessReport(bib, questions, progress, opts).weighted;
}

/**
 * Load objectives[] from bib.json (returns [] when the Bib has none).
 * Adds derived fields:
 *   - section: the matching section object (or null)
 *   - sectionWeight: section.itemCount or null
 */
export function loadObjectives(bib) {
  const sectionById = new Map((bib?.sections || []).map((s) => [s.id, s]));
  const out = [];
  for (const o of (bib?.objectives || [])) {
    const section = sectionById.get(o.sectionId) || null;
    out.push({
      ...o,
      section,
      sectionWeight: section?.itemCount ?? null,
    });
  }
  return out;
}

/**
 * Group filtered questions by `primaryObjective`. Questions without a
 * primaryObjective land under `_unmapped` so callers can surface them.
 */
export function questionsByObjective(questions) {
  const m = new Map();
  for (const q of questions) {
    const k = q.primaryObjective || "_unmapped";
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(q);
  }
  return m;
}

/**
 * Per-objective readiness + priority report.
 *
 *   {
 *     id, name, sectionId, depth, examRelevance, publicSafe,
 *     total, seen, mastered, dueNow,
 *     coverage, mastery, gap,
 *     sectionWeight,       // raw itemCount on the parent section
 *     normalizedWeight,    // 0..1 of the bib's total weight
 *     evidenceConfidence,  // 0..1 — how trustworthy the gap signal is
 *     freshness,           // 0..1 — how recently questions were seen
 *     relevance,           // 0..1 — examRelevance gating for the active exam
 *     priority,            // sectionWeight × weakness × conf × freshness × relevance
 *     sourceRefs[]
 *   }
 */
function buildObjectiveReport(o, sectionTotalWeight, examType, questions, progressByQid, now) {
  let seen = 0, mastered = 0, masteredAdjusted = 0, dueNow = 0, lastReviewMs = 0;
  for (const q of questions) {
    const prog = progressByQid.get(q.id);
    if (!prog) continue;
    seen++;
    if ((prog.interval || 0) >= MASTERY_INTERVAL_DAYS) {
      mastered++;
      masteredAdjusted += confidenceFactor(q.sourceConfidence);
    }
    if (isDue(prog, now)) dueNow++;
    if (prog.lastReviewed && prog.lastReviewed > lastReviewMs) lastReviewMs = prog.lastReviewed;
  }
  const total = questions.length;
  const masteryRaw = total > 0 ? mastered / total : 0;
  const mastery    = total > 0 ? masteredAdjusted / total : 0;
  const coverage   = total > 0 ? seen / total : 0;
  const gap = 1 - mastery;
  const sectionWeight = o.sectionWeight ?? null;
  const normalizedWeight = (sectionWeight != null && sectionTotalWeight > 0)
    ? sectionWeight / sectionTotalWeight
    : (1 / Math.max(1, total > 0 ? 1 : 1)); // benign fallback

  // evidenceConfidence: Laplace-smoothed. Never-seen objectives get a baseline
  // confidence of 0.25 (so they still enter the priority race instead of
  // collapsing to zero), then ramps up to 1.0 after ~3 reviews.
  const evidenceConfidence = total > 0
    ? Math.min(1, (seen + 1) / (Math.min(total, 3) + 1))
    : 0;

  // freshness: 1 when seen today, decays toward 0 with a 21-day half-life.
  let freshness;
  if (seen === 0) {
    freshness = 1; // never-seen objectives are "fresh need" — drill them
  } else {
    const days = (now - lastReviewMs) / (24 * 60 * 60 * 1000);
    freshness = Math.pow(0.5, days / FRESHNESS_HALFLIFE_DAYS);
    if (freshness < 0.2) freshness = 0.2; // floor so stale objectives stay drillable
  }

  // relevance gate: 1 for objectives in scope for the active examType, else 0.
  const rel = o.examRelevance || "regular";
  let relevance = 1;
  if (examType === "regular" && rel !== "regular" && rel !== "core") relevance = 0;
  else if (examType === "substitute" && rel === "regular-only") relevance = 0;
  else if (examType === "core" && rel === "local-private") relevance = 0;

  // Priority: high-weight × weak × confident × fresh-need × in-scope. The
  // headline "Next best drill" picks the highest non-zero priority value.
  const priority = (sectionWeight ?? 0) > 0
    ? (sectionWeight / sectionTotalWeight) * gap * evidenceConfidence * freshness * relevance
    : gap * evidenceConfidence * freshness * relevance;

  return {
    id: o.id,
    name: o.name,
    sectionId: o.sectionId,
    depth: o.depth,
    examRelevance: rel,
    publicSafe: o.publicSafe !== false,
    sourceRefs: o.sourceRefs || [],
    total,
    seen,
    mastered,
    masteredAdjusted,
    dueNow,
    coverage,
    mastery,
    masteryRaw,
    gap,
    sectionWeight,
    normalizedWeight,
    evidenceConfidence,
    freshness,
    relevance,
    priority,
  };
}

/**
 * Append objective-level data to a readiness report. Mutates and returns the
 * same report object so callers don't have to thread it twice.
 */
function attachObjectiveReport(report, bib, filteredQuestions, progressByQid, examType, now) {
  const objectives = loadObjectives(bib);
  if (objectives.length === 0) {
    report.objectives = [];
    report.nextBestDrill = null;
    report.weakObjectivesBySection = new Map();
    return report;
  }
  const byObjective = questionsByObjective(filteredQuestions);
  const totalSectionWeight = report.totalWeight || 0;
  const objReports = objectives.map((o) =>
    buildObjectiveReport(o, totalSectionWeight, examType, byObjective.get(o.id) || [], progressByQid, now)
  );
  // weakObjectivesBySection: top weak objectives per section, ordered by priority.
  const bySection = new Map();
  for (const r of objReports) {
    if (r.relevance === 0) continue;
    if (!bySection.has(r.sectionId)) bySection.set(r.sectionId, []);
    bySection.get(r.sectionId).push(r);
  }
  for (const arr of bySection.values()) arr.sort((a, b) => b.priority - a.priority);
  const drillable = objReports.filter((r) => r.relevance > 0 && r.total > 0 && r.priority > 0);
  drillable.sort((a, b) => b.priority - a.priority);
  const nextBestDrill = drillable[0] || null;
  report.objectives = objReports;
  report.weakObjectivesBySection = bySection;
  report.nextBestDrill = nextBestDrill;
  return report;
}

/* ---------- helpers ---------- */

function shuffleArray(a) {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
