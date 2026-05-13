/* =========================================================================
   Dashboard view — operational command center.

   Layout:
     Resume strip      — any in-progress flashcards / quiz / exam session.
     Today             — due + new cards + quick-drill entries.
     Readiness         — last exam, trend, weak topics, mastery.
     Coverage          — Bib references: cards/availability/coverage.
     Setup health      — local-only posture, Bib cycle, backup reminder, data.

   Empty / first-run state: first-run band + obvious next actions.
   ========================================================================= */

import { db } from "../db.js";
import { formatHMS } from "../lib/time.js";
import { topicLabel } from "../lib/topic-labels.js";
import { isDue } from "../srs.js";
import { readinessReport, isExamTrack } from "../sections.js";

const BIB_CYCLE_INFO = {
  // Cycle freshness signal — surface a warning when the installed Bib is
  // older than the latest known cycle for that paygrade.
  "CWT-E7": { latestCycle: "Cycle 270 / January 2026", latestSeen: "2026-01" },
};

export async function render(mount, ctx) {
  const { el, clear, bibs } = ctx;
  clear(mount);

  const active = bibs.active();
  if (!active) {
    mount.appendChild(el("div", { class: "first-run" },
      el("h3", { text: "No Bib installed" }),
      el("p", { text: "Bibmaxxing reads Bibs from data/bibs/<BIB-ID>/." }),
      el("ol", {},
        el("li", { text: "Drop a Bib folder under data/bibs/ (bib.json + questions.json + study-guides/)." }),
        el("li", { text: "Add an entry to data/bibs/index.json." }),
        el("li", { text: "Reload — the Bib appears in the selector at the top of the screen." }),
      ),
    ));
    return;
  }

  const bibId = active.id;

  const [questions, progress, attempts, notes, inProgress, refs, bibData, profileSheet, track] = await Promise.all([
    db.getAllByIndex("questions", "byBib", IDBKeyRange.only(bibId)),
    db.getAllByIndex("progress", "byBib", IDBKeyRange.only(bibId)),
    db.getAllByIndex("examAttempts", "byBib", IDBKeyRange.only(bibId)),
    db.getAllByIndex("notes", "byBib", IDBKeyRange.only(bibId)),
    db.getAllByIndex("sessions", "byInProgress", IDBKeyRange.only([bibId, 1])),
    bibs.refs(bibId),
    bibs.bibData(bibId),
    bibs.profileSheet(bibId),
    Promise.resolve(bibs.trackFor(bibId)),
  ]);

  const report = readinessReport(bibData, questions, progress, {
    examType: bibData?.examType || "regular",
    profileSheet,
  });
  const onExamTrack = isExamTrack(bibData);

  const now = Date.now();
  const progById = new Map(progress.map((p) => [p.questionId, p]));
  let newCount = 0;
  let dueCount = 0;
  let masteredCount = 0;
  let learningCount = 0;
  for (const q of questions) {
    const p = progById.get(q.id);
    if (!p) { newCount++; continue; }
    if (isDue(p, now)) dueCount++;
    if (p.interval >= 21) masteredCount++;
    else if (p.repetitions > 0) learningCount++;
  }
  const masteryPct = questions.length ? Math.round((masteredCount / questions.length) * 100) : 0;
  const seenPct = questions.length ? Math.round(((questions.length - newCount) / questions.length) * 100) : 0;

  const lastAttempt = attempts.length ? attempts[attempts.length - 1] : null;
  const trendPoints = attempts.slice(-10).map((a) => a.percent);

  // First-run band: no progress yet, no exams, no notes.
  if (questions.length > 0 && progress.length === 0 && attempts.length === 0 && notes.length === 0) {
    mount.appendChild(renderFirstRun(el, active, questions.length));
  }

  /* ----- Resume strip ----- */
  const live = inProgress.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (live) mount.appendChild(renderResumeBanner(el, live, ctx, async () => {
    await db.put("sessions", { ...live, inProgress: 0, endedAt: Date.now() });
    render(mount, ctx);
  }));

  /* ----- 4-panel cockpit grid ----- */
  const grid = el("div", { class: "cockpit-grid" });

  grid.appendChild(renderTodayPanel(el, {
    questions, progById, dueCount, newCount, learningCount, active, track, ctx,
  }));
  grid.appendChild(renderReadinessPanel(el, {
    attempts, lastAttempt, trendPoints, questions, progress, masteredCount, masteryPct,
    report, onExamTrack, ctx,
  }));
  grid.appendChild(renderCoveragePanel(el, {
    refs, questions, notes, ctx,
  }));
  grid.appendChild(renderHealthPanel(el, {
    active, questions, refs, notes, attempts, progress, profileSheet, ctx,
  }));

  mount.appendChild(grid);

  /* ----- Section readiness panel (skipped on core / reference-only tracks) ----- */
  if (onExamTrack && Array.isArray(bibData?.sections) && bibData.sections.length > 0) {
    mount.appendChild(renderSectionPanel(el, { report, bibData, track, ctx }));
  }

  if (questions.length === 0) {
    mount.appendChild(el("div", { class: "empty-state", style: "margin-top: 24px;" },
      el("h3", { text: "This Bib has no questions yet" }),
      el("p", { class: "muted", text: `Seed file data/bibs/${bibId}/questions.json is empty or missing. Add questions in-app via Manage, or fill the seed file and reload.` }),
      (() => { const b = el("button", { class: "btn", text: "+ Add your first question" });
               b.addEventListener("click", () => { location.hash = "#add"; });
               return b; })(),
    ));
  }
}

/* ---------- First-run band ---------- */

function renderFirstRun(el, active, qTotal) {
  const isCore = active.examType === "core" || active.track === "cwt-core";
  return el("div", { class: "first-run" },
    el("h3", { text: `Welcome to Bibmaxxing - ${active.rating} ${active.paygrade}` }),
    el("p", {},
      `Local-only study trainer. ${qTotal} questions and the full reference list are loaded. Nothing leaves your browser - no account, no cloud, no telemetry.`),
    el("p", { style: "margin-top: 6px; font-weight: 600;", text: "What you should know:" }),
    el("ul", { class: "first-run-trust" },
      el("li", {}, el("strong", { text: "Local-only progress." }), document.createTextNode(" Flashcards, quiz, and exam history live in your browser's IndexedDB. Export backups from Manage before clearing browser data.")),
      el("li", {}, el("strong", { text: "Track: " + (active.rating + " " + active.paygrade) + ", " + active.cycle + (isCore ? " (core reference)." : " (regular exam).") }), document.createTextNode(isCore ? " Core tracks build general CWT skill and do not count as advancement-exam readiness." : " Substitute-only refs are excluded from regular-exam readiness.")),
      el("li", {}, el("strong", { text: isCore ? "Reference-only scoring." : "Provisional section weights." }), document.createTextNode(isCore ? " Core skips weighted exam readiness; use objective/ref drills for general skill growth." : " The dashboard's weighted readiness uses example item counts until you enter actual exam values via Manage > Profile sheet.")),
      el("li", {}, el("strong", { text: "Default packages exclude PDFs." }), document.createTextNode(" The packager ships zero reference PDFs unless an operator flags a ref redistributable: true. Commercial and restricted material stays local.")),
      el("li", {}, el("strong", { text: "Restricted/classified placeholders" }), document.createTextNode(" (CUI/FOUO, USSID 104/109/201, CRITIC, etc.) point at the right reference - they are not a substitute for studying through official channels on JWICS/SIPR.")),
    ),
    el("p", { style: "margin-top: 10px; font-weight: 600;", text: "Suggested first hour:" }),
    el("ol", {},
      el("li", { text: "Pick a reference in the Library and read the study guide." }),
      el("li", { text: "Run a 10-Q quiz on that reference to spot weak areas." }),
      el("li", { text: "Drill the misses as flashcards. The SRS sequencer takes over from there." }),
      el("li", { text: "Export a backup from Manage before clearing browser data." }),
    ),
  );
}

/* ---------- Resume strip ---------- */

function renderResumeBanner(el, live, ctx, onDiscard) {
  const banner = el("div", { class: "banner" });
  const summary = resumeSummary(live);
  banner.appendChild(el("div", {},
    el("strong", { text: `Resume ${labelFor(live.type)}?` }),
    el("span", { text: "  " + summary }),
  ));
  const resumeBtn = el("button", { class: "btn", text: "Resume" });
  resumeBtn.addEventListener("click", () => {
    location.hash = `#${live.type}/resume/${live.id}`;
  });
  const discardBtn = el("button", { class: "btn btn-ghost btn-sm", text: "Discard" });
  discardBtn.addEventListener("click", onDiscard);
  banner.appendChild(resumeBtn);
  banner.appendChild(discardBtn);
  return banner;
}

/* ---------- Today panel ---------- */

function renderTodayPanel(el, { questions, progById, dueCount, newCount, learningCount, active, track, ctx }) {
  const panel = el("div", { class: "panel", "aria-label": "Today" });
  const head = el("div", { class: "panel-head" });
  head.appendChild(el("div", { class: "panel-title", text: "Today" }));
  const trackLabel = track?.label || `${active.rating} ${active.paygrade}`;
  head.appendChild(el("div", { class: "panel-tag", text: `Track: ${trackLabel}` }));
  panel.appendChild(head);

  const metric = el("div", { class: "panel-metric" });
  metric.appendChild(document.createTextNode(String(dueCount + newCount)));
  metric.appendChild(el("span", { class: "sub", text: "cards to study" }));
  panel.appendChild(metric);

  const list = el("ul", { class: "panel-list" });
  list.appendChild(panelRow(el, "Due now", String(dueCount)));
  list.appendChild(panelRow(el, "New",     String(newCount)));
  list.appendChild(panelRow(el, "Learning", String(learningCount)));
  panel.appendChild(list);

  const actions = el("div", { class: "panel-actions" });
  const drillBtn = el("button", { class: "btn", text: dueCount > 0 ? "Review due" : "Pick subject" });
  drillBtn.disabled = questions.length === 0;
  drillBtn.addEventListener("click", () => {
    location.hash = dueCount > 0 ? "#flashcards/due" : "#flashcards/pick";
  });
  actions.appendChild(drillBtn);

  const weakBtn = el("button", { class: "btn btn-ghost btn-sm", text: "Drill weak" });
  weakBtn.disabled = questions.length === 0;
  weakBtn.addEventListener("click", () => { location.hash = "#flashcards/weak"; });
  actions.appendChild(weakBtn);

  panel.appendChild(actions);
  return panel;
}

/* ---------- Readiness panel ---------- */

function renderReadinessPanel(el, { attempts, lastAttempt, trendPoints, questions, progress, masteredCount, masteryPct, report, onExamTrack, ctx }) {
  const panel = el("div", { class: "panel", "aria-label": "Readiness" });
  const head = el("div", { class: "panel-head" });
  head.appendChild(el("div", { class: "panel-title", text: "Readiness" }));
  head.appendChild(el("div", { class: "panel-tag", text: attempts.length ? `${attempts.length} attempt${attempts.length === 1 ? "" : "s"}` : "No exams yet" }));
  panel.appendChild(head);

  // Weighted exam-readiness headline (only when this is an exam track).
  if (onExamTrack && report) {
    const weightedPct = Math.round((report.weighted || 0) * 100);
    const rawPct      = Math.round((report.weightedRaw || 0) * 100);
    const metric = el("div", { class: "panel-metric" });
    metric.appendChild(document.createTextNode(`${weightedPct}%`));
    metric.appendChild(el("span", { class: "sub", text: "weighted readiness" }));
    panel.appendChild(metric);
    const bar = el("div", { class: "dash-bar" }, el("span", { style: `width:${weightedPct}%` }));
    panel.appendChild(bar);
    panel.appendChild(el("div", { class: "muted", style: "font-size:0.82em",
      text: report.totalWeight > 0
        ? `Weighted by section item counts (total ${report.totalWeight}). Equal-weight average: ${Math.round((report.equalWeighted || 0) * 100)}%.`
        : `Equal-weight average across ${report.sections.length} section${report.sections.length === 1 ? "" : "s"}. Enter exam item counts via Manage > Profile sheet for weighted readiness.` }));
    // Provisional-weight caveat: any section using placeholder/example/operator-entered weights.
    if (anyProvisionalWeights(report)) {
      panel.appendChild(el("div", { class: "muted provisional-weights-caveat",
                                    style: "font-size:0.78em; margin-top:2px;",
                                    "data-testid": "provisional-weights" },
        el("strong", { text: "Section weights are provisional. " }),
        document.createTextNode("Enter profile-sheet data in Manage for a personalized weighting."),
      ));
    }
    // Source-confidence caveat: when the adjusted figure visibly trails raw.
    if (Math.abs(rawPct - weightedPct) >= 1) {
      panel.appendChild(el("div", { class: "muted", style: "font-size:0.78em; margin-top:2px;",
        text: `Confidence-adjusted ${weightedPct}% vs raw mastery ${rawPct}%. Restricted-summary / public-adjacent questions weigh less in the score; see sourceConfidence per question.` }));
    }
    // "Why this score?" - one-click expansion of the headline math.
    const why = el("details", { class: "score-why" });
    why.appendChild(el("summary", { text: "Why this score?" }));
    const ul = el("ul", { class: "score-why-body" });
    ul.appendChild(el("li", {}, el("strong", { text: "Section weights" }), document.createTextNode(" drive the headline. Each section's mastery counts proportional to its NWAE item count.")));
    ul.appendChild(el("li", {}, el("strong", { text: "Objective mastery" }), document.createTextNode(" within each section drives drill priority (Next-best-drill).")));
    ul.appendChild(el("li", {}, el("strong", { text: "sourceConfidence" }), document.createTextNode(" downweights public-adjacent (x0.8) and restricted-summary (x0.5) questions so the score reflects how trustworthy each source is.")));
    ul.appendChild(el("li", {}, el("strong", { text: "Provisional weights" }), document.createTextNode(" - section item counts default to a placeholder until you enter actual exam counts via Manage > Profile sheet.")));
    ul.appendChild(el("li", {}, el("strong", { text: "SRS mastery threshold" }), document.createTextNode(" = SM-2 interval >= 21 days. Reviewing a card to Good/Easy enough times to reach that interval marks it mastered.")));
    why.appendChild(ul);
    panel.appendChild(why);
  }

  if (lastAttempt) {
    const exam = el("div", { class: "muted", style: "margin-top: 6px;" });
    exam.appendChild(el("strong", { text: "Last mock exam: " }));
    exam.appendChild(document.createTextNode(`${lastAttempt.percent}% (${lastAttempt.correct}/${lastAttempt.total})`));
    const trend = attempts.length > 1
      ? (attempts[attempts.length - 1].percent >= attempts[attempts.length - 2].percent ? "  / trending up" : "  / trending down")
      : "  / first attempt";
    exam.appendChild(document.createTextNode(trend));
    panel.appendChild(exam);
    if (trendPoints.length >= 2) panel.appendChild(renderSparkline(trendPoints));
  } else {
    panel.appendChild(el("p", { class: "muted", style: "margin-top: 4px;", text: "No mock exams yet." }));
  }

  const list = el("ul", { class: "panel-list", style: "margin-top: 6px;" });
  list.appendChild(panelRow(el, "Mastered", `${masteredCount} / ${questions.length} (${masteryPct}%)`));
  const weakTopics = topWeakTopics(questions, progress, 3);
  if (weakTopics.length) {
    list.appendChild(panelRow(el, "Weak topics", weakTopics.map(([t]) => topicLabel(t)).join(", ")));
  }
  panel.appendChild(list);

  const actions = el("div", { class: "panel-actions" });
  if (onExamTrack) {
    const examBtn = el("button", { class: "btn", text: "New mock exam" });
    examBtn.disabled = questions.length === 0;
    examBtn.addEventListener("click", () => { location.hash = "#exam"; });
    actions.appendChild(examBtn);
    if (report?.weakHeavyDrillable) {
      const w = report.weakHeavyDrillable;
      const drillBtn = el("button", { class: "btn btn-ghost btn-sm", text: `Drill heaviest weak: ${w.code}` });
      drillBtn.addEventListener("click", () => { location.hash = `#flashcards/section:${encodeURIComponent(w.id)}`; });
      actions.appendChild(drillBtn);
    } else if (weakTopics.length) {
      const weakBtn = el("button", { class: "btn btn-ghost btn-sm", text: "Quiz weak topic" });
      weakBtn.addEventListener("click", () => { location.hash = `#quiz/topic:${encodeURIComponent(weakTopics[0][0])}`; });
      actions.appendChild(weakBtn);
    }
  } else {
    const drillBtn = el("button", { class: "btn", text: "Start core drill" });
    drillBtn.disabled = questions.length === 0;
    drillBtn.addEventListener("click", () => { location.hash = "#flashcards/pick"; });
    actions.appendChild(drillBtn);
    const quizBtn = el("button", { class: "btn btn-ghost btn-sm", text: "Quiz core bank" });
    quizBtn.disabled = questions.length === 0;
    quizBtn.addEventListener("click", () => { location.hash = "#quiz"; });
    actions.appendChild(quizBtn);
  }
  panel.appendChild(actions);
  return panel;
}

function renderSectionPanel(el, { report, bibData, track, ctx }) {
  const panel = el("section", { class: "panel section-panel", "aria-label": "Section readiness", style: "margin-top: var(--space-4);" });
  const head = el("div", { class: "panel-head" });
  head.appendChild(el("div", { class: "panel-title", text: "Section readiness" }));
  const trackLabel = track?.label || `${bibData?.rating || ""} ${bibData?.paygrade || ""}`.trim();
  head.appendChild(el("div", { class: "panel-tag", text: `${trackLabel} - ${report.examType} exam - ${report.totalQuestions} q in scope` }));
  panel.appendChild(head);

  // Next-best-drill CTA — objective-level priority pick.
  if (report.nextBestDrill) {
    const nb = report.nextBestDrill;
    const sectionName = bibData?.sections?.find((s) => s.id === nb.sectionId)?.name || nb.sectionId;
    const masteryPct = Math.round(nb.mastery * 100);
    const banner = el("div", { class: "next-best-banner" });
    banner.appendChild(el("div", { class: "next-best-label", text: "Next best drill" }));
    banner.appendChild(el("div", { class: "next-best-name" },
      el("strong", { text: nb.name }),
      el("span", { class: "muted", style: "margin-left:6px;", text: `(${sectionName})` }),
    ));
    banner.appendChild(el("div", { class: "next-best-stats",
      text: `${masteryPct}% mastered  /  ${nb.seen}/${nb.total} seen  /  priority ${(nb.priority).toFixed(3)}  /  depth ${nb.depth || "?"}` }));
    const acts = el("div", { class: "next-best-actions" });
    acts.appendChild(actionButton(el, "Drill flashcards", () => { location.hash = `#flashcards/objective:${encodeURIComponent(nb.id)}`; }));
    acts.appendChild(actionButton(el, "Quiz objective", () => { location.hash = `#quiz/objective:${encodeURIComponent(nb.id)}`; }, "btn btn-ghost btn-sm"));
    banner.appendChild(acts);
    panel.appendChild(banner);
  }

  // Heaviest-weak callout (only meaningful when at least one section has data).
  const focus = report.weakHeavyDrillable || report.weakHeavy;
  if (focus) {
    const callout = el("div", { class: "section-focus" });
    const masteryPct = Math.round((focus.mastery || 0) * 100);
    const weightLine = focus.weight != null
      ? `${focus.weight} items (${Math.round((focus.normalizedWeight || 0) * 100)}% of exam weight)`
      : "weight unset";
    callout.appendChild(el("div", { class: "section-focus-label", text: "Heaviest weak section" }));
    callout.appendChild(el("div", { class: "section-focus-name" },
      el("strong", { text: focus.name }),
      el("span", { class: "muted", style: "margin-left: 6px;", text: `(${focus.code})` }),
    ));
    callout.appendChild(el("div", { class: "section-focus-stats", text: `${masteryPct}% mastered  /  ${focus.seen}/${focus.total} seen  /  ${weightLine}` }));
    const acts = el("div", { class: "section-focus-actions" });
    if (focus.total > 0) {
      acts.appendChild(actionButton(el, "Drill flashcards", () => { location.hash = `#flashcards/section:${encodeURIComponent(focus.id)}`; }));
      acts.appendChild(actionButton(el, "Quiz section", () => { location.hash = `#quiz/section:${encodeURIComponent(focus.id)}`; }, "btn btn-ghost btn-sm"));
    } else {
      acts.appendChild(el("span", { class: "muted", style: "font-size:0.85em", text: "Coverage hole: 0 questions in this section yet. Add questions or import a data pack that covers it." }));
    }
    callout.appendChild(acts);
    panel.appendChild(callout);
  }

  // Per-section bars, each with up to two weak-objective rows inline.
  const list = el("div", { class: "section-bars" });
  const weakBySection = report.weakObjectivesBySection || new Map();
  for (const s of report.sections) {
    const bar = renderSectionBar(el, s, report.totalWeight, focus);
    const weakObjs = (weakBySection.get(s.id) || []).slice(0, 2);
    if (weakObjs.length > 0) {
      const objList = el("div", { class: "objective-list" });
      for (const o of weakObjs) objList.appendChild(renderObjectiveRow(el, o, bibData));
      bar.appendChild(objList);
    }
    list.appendChild(bar);
  }
  panel.appendChild(list);

  if (report.totalWeight === 0) {
    panel.appendChild(el("p", { class: "muted", style: "font-size:0.82em; margin-top: 8px;",
      text: "Exam item counts are unset for every section, so readiness above is equal-weight. Open Manage > Profile sheet to enter your actual section item counts and switch to weighted math." }));
  } else if (report.sections.some((s) => s.itemCountSource && s.itemCountSource.startsWith("placeholder"))) {
    panel.appendChild(el("p", { class: "muted", style: "font-size:0.82em; margin-top: 8px;",
      text: "Section item counts include placeholder values from the operator example. Replace with your actual profile sheet via Manage > Profile sheet for accurate weighted readiness." }));
  }

  if (report.unmapped.count > 0) {
    panel.appendChild(el("p", { class: "muted", style: "font-size:0.82em; margin-top: 4px;",
      text: `${report.unmapped.count} question${report.unmapped.count === 1 ? "" : "s"} unmapped to any section (excluded from readiness above). Re-run scripts/map-sections.mjs after bib.json edits.` }));
  }
  return panel;
}

function renderSectionBar(el, s, totalWeight, focus) {
  const masteryPct = s.total > 0 ? Math.round(s.mastery * 100) : 0;
  const coveragePct = s.total > 0 ? Math.round(s.coverage * 100) : 0;
  const weightLabel = s.weight != null ? `${s.weight}` : "—";
  const weightPct = (totalWeight > 0 && s.weight != null) ? Math.round((s.weight / totalWeight) * 100) : null;
  const row = el("div", { class: "section-row" + (focus && focus.id === s.id ? " is-focus" : "") });
  row.appendChild(el("div", { class: "section-row-head" },
    el("span", { class: "section-row-code", text: s.code }),
    el("span", { class: "section-row-name", text: s.name }),
    el("span", { class: "section-row-weight", text: weightPct != null ? `${weightLabel} items - ${weightPct}%` : `${weightLabel} items` }),
  ));
  // Stacked bar: mastery fill (gold), then coverage fill (lighter outline).
  const bar = el("div", { class: "section-bar" });
  bar.appendChild(el("span", { class: "section-bar-coverage", style: `width: ${coveragePct}%` }));
  bar.appendChild(el("span", { class: "section-bar-mastery",  style: `width: ${masteryPct}%` }));
  row.appendChild(bar);
  row.appendChild(el("div", { class: "section-row-stats muted",
    text: s.total === 0
      ? "0 questions in corpus (coverage hole)"
      : `${masteryPct}% mastered  /  ${coveragePct}% seen  /  ${s.dueNow} due  /  ${s.total} q in scope` }));
  if (s.total > 0) {
    const acts = el("div", { class: "section-row-actions" });
    acts.appendChild(actionButton(el, "Drill", () => { location.hash = `#flashcards/section:${encodeURIComponent(s.id)}`; }, "btn btn-ghost btn-sm"));
    acts.appendChild(actionButton(el, "Quiz", () => { location.hash = `#quiz/section:${encodeURIComponent(s.id)}`; }, "btn btn-ghost btn-sm"));
    row.appendChild(acts);
  }
  return row;
}

function actionButton(el, label, onClick, cls = "btn btn-sm") {
  const b = el("button", { class: cls, text: label });
  b.addEventListener("click", onClick);
  return b;
}

/**
 * A section's item-count is provisional whenever its source is not the
 * operator's actual profile sheet AND not labelled "official" or similar.
 * placeholder-*, example-*, operator-example-* values all trip this.
 */
function anyProvisionalWeights(report) {
  if (!report || !Array.isArray(report.sections)) return false;
  for (const s of report.sections) {
    const src = (s.itemCountSource || "").toLowerCase();
    if (src === "profile-sheet") continue;     // user's real numbers
    if (src === "official" || src === "verified") continue;
    if (src === "bib.json" && !src.includes("placeholder")) continue;
    // Anything else - placeholder-*, example-*, operator-entered, unset - is provisional.
    return true;
  }
  return false;
}

function renderObjectiveRow(el, o, bibData) {
  const masteryPct = o.total > 0 ? Math.round(o.mastery * 100) : 0;
  const row = el("div", { class: "objective-row" + (o.priority > 0 ? " is-priority" : "") });
  row.appendChild(el("div", { class: "objective-row-head" },
    el("span", { class: "objective-row-name", text: o.name }),
    el("span", { class: "objective-row-meta",
      text: `${masteryPct}%  /  ${o.seen}/${o.total} seen  /  depth ${o.depth || "?"}` }),
  ));
  if (o.total > 0) {
    const acts = el("div", { class: "objective-row-actions" });
    acts.appendChild(actionButton(el, "Drill", () => { location.hash = `#flashcards/objective:${encodeURIComponent(o.id)}`; }, "btn btn-ghost btn-sm"));
    acts.appendChild(actionButton(el, "Quiz", () => { location.hash = `#quiz/objective:${encodeURIComponent(o.id)}`; }, "btn btn-ghost btn-sm"));
    row.appendChild(acts);
  } else {
    row.appendChild(el("span", { class: "muted", style: "font-size:0.8em;", text: "no questions yet (coverage hole)" }));
  }
  return row;
}

/* ---------- Coverage panel ---------- */

function renderCoveragePanel(el, { refs, questions, notes, ctx }) {
  const panel = el("div", { class: "panel", "aria-label": "Coverage" });
  const head = el("div", { class: "panel-head" });
  head.appendChild(el("div", { class: "panel-title", text: "Coverage" }));
  head.appendChild(el("div", { class: "panel-tag", text: `${refs.length} refs` }));
  panel.appendChild(head);

  // refs with at least one card pointing at them
  const refCardCount = new Map();
  for (const q of questions) {
    const set = new Set();
    if (q.sourceRef) set.add(q.sourceRef);
    for (const r of (q.refs || [])) set.add(r);
    for (const id of set) refCardCount.set(id, (refCardCount.get(id) || 0) + 1);
  }
  const refsWithCards = refs.filter((r) => (refCardCount.get(r.id) || 0) > 0).length;
  const refsWithoutCards = refs.length - refsWithCards;
  const byAvail = (refs || []).reduce((acc, r) => { acc[r.availability] = (acc[r.availability] || 0) + 1; return acc; }, {});
  const downloaded = (byAvail["public-downloaded"] || 0) + (byAvail["public-online"] || 0);
  const needsUser = byAvail["needs-user"] || 0;
  const restricted = (byAvail["cui-fouo"] || 0) + (byAvail["classified"] || 0) + (byAvail["restricted"] || 0);

  const metric = el("div", { class: "panel-metric" });
  metric.appendChild(document.createTextNode(`${refsWithCards}`));
  metric.appendChild(el("span", { class: "sub", text: `of ${refs.length} refs with cards` }));
  panel.appendChild(metric);

  const list = el("ul", { class: "panel-list" });
  list.appendChild(panelRow(el, "Downloaded / online", String(downloaded)));
  list.appendChild(panelRow(el, "Needs user supply", String(needsUser)));
  list.appendChild(panelRow(el, "Restricted (CUI/CLAS)", String(restricted)));
  list.appendChild(panelRow(el, "Your notes",           String(notes.length)));
  if (refsWithoutCards > 0) list.appendChild(panelRow(el, "No cards yet", String(refsWithoutCards)));
  panel.appendChild(list);

  const actions = el("div", { class: "panel-actions" });
  const refBtn = el("button", { class: "btn", text: "Reference map" });
  refBtn.addEventListener("click", () => { location.hash = "#references"; });
  actions.appendChild(refBtn);
  const libBtn = el("button", { class: "btn btn-ghost btn-sm", text: "Library" });
  libBtn.addEventListener("click", () => { location.hash = "#guide"; });
  actions.appendChild(libBtn);
  panel.appendChild(actions);
  return panel;
}

/* ---------- Setup health panel ---------- */

function renderHealthPanel(el, { active, questions, refs, notes, attempts, progress, ctx }) {
  const panel = el("div", { class: "panel", "aria-label": "Setup health" });
  const head = el("div", { class: "panel-head" });
  head.appendChild(el("div", { class: "panel-title", text: "Setup health" }));
  head.appendChild(pill(el, "local-only", "ok"));
  panel.appendChild(head);

  const cycleInfo = BIB_CYCLE_INFO[active.id];
  const cycleStale = cycleInfo && active.cycle && active.cycle !== cycleInfo.latestCycle;

  const rows = [
    { label: "Storage",     value: "IndexedDB (no cloud)", pill: "ok" },
    { label: "Active Bib",  value: `${active.rating} ${active.paygrade}`, pill: "ok" },
    { label: "Cycle",       value: active.cycle || "unknown",
      pill: cycleStale ? "warn" : "ok",
      hint: cycleStale ? `latest known: ${cycleInfo.latestCycle}` : null },
    { label: "Questions",   value: String(questions.length), pill: questions.length ? "ok" : "warn" },
    { label: "References",  value: String(refs.length),      pill: refs.length ? "ok" : "warn" },
    { label: "Backup",      value: lastBackupHint(progress, notes, attempts),
      pill: (progress.length + notes.length > 30) ? "warn" : "ok" },
  ];

  for (const r of rows) {
    const row = el("div", { class: "health-row" });
    row.appendChild(el("span", { class: "label", text: r.label }));
    const rhs = el("span", { class: "row", style: "gap: 8px;" });
    rhs.appendChild(el("span", { text: r.value }));
    if (r.pill) rhs.appendChild(pill(el, r.pill === "ok" ? "ok" : r.pill, r.pill));
    row.appendChild(rhs);
    panel.appendChild(row);
    if (r.hint) panel.appendChild(el("div", { class: "muted", style: "font-size:0.82em; margin: -4px 0 4px;", text: r.hint }));
  }

  if (cycleStale) {
    panel.appendChild(el("p", { class: "muted", style: "font-size:0.85em; margin-top: 4px;",
      text: "Cycle freshness: install the latest Bib data pack for this paygrade before relying on these questions for a current cycle." }));
  }

  const actions = el("div", { class: "panel-actions" });
  const backupBtn = el("button", { class: "btn btn-ghost btn-sm", text: "Export backup" });
  backupBtn.addEventListener("click", () => { location.hash = "#settings"; });
  actions.appendChild(backupBtn);
  const manageBtn = el("button", { class: "btn btn-ghost btn-sm", text: "Manage" });
  manageBtn.addEventListener("click", () => { location.hash = "#settings"; });
  actions.appendChild(manageBtn);
  panel.appendChild(actions);
  return panel;
}

/* ---------- Helpers ---------- */

function panelRow(el, k, v) {
  return el("li", {},
    el("span", { class: "k", text: k }),
    el("span", { class: "v", text: v }),
  );
}

function pill(el, text, kind) {
  return el("span", { class: `pill ${kind || ""}`, text });
}

function labelFor(type) {
  return { flashcards: "Drill", quiz: "Quiz", exam: "Mock Exam" }[type] || type;
}

function resumeSummary(session) {
  if (session.type === "exam") {
    const q = session.state?.currentIndex ?? 0;
    const total = session.state?.questionIds?.length ?? 0;
    const endAt = session.state?.endAtMs;
    const remSec = endAt ? Math.max(0, Math.round((endAt - Date.now()) / 1000)) : null;
    const rem = remSec != null ? ` - ${formatHMS(remSec)} remaining` : "";
    return `Q ${q + 1} of ${total}${rem}`;
  }
  if (session.type === "quiz") {
    const q = session.state?.currentIndex ?? 0;
    const total = session.state?.questionIds?.length ?? 0;
    return `Q ${q + 1} of ${total}`;
  }
  if (session.type === "flashcards") {
    const done = session.state?.completed ?? 0;
    return `${done} cards reviewed so far`;
  }
  return "in progress";
}

function renderSparkline(points) {
  const W = 160, H = 32, PAD = 2;
  const max = Math.max(100, ...points);
  const min = Math.min(0, ...points);
  const range = Math.max(1, max - min);
  const n = points.length;
  const step = n > 1 ? (W - 2 * PAD) / (n - 1) : 0;
  const xy = points.map((p, i) => {
    const x = PAD + i * step;
    const y = H - PAD - ((p - min) / range) * (H - 2 * PAD);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "32");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Score trend across last ${n} attempts`);
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", xy);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke-width", "2");
  line.style.stroke = "var(--gold)";
  svg.appendChild(line);
  return svg;
}

function topWeakTopics(questions, progress, n) {
  const progById = new Map(progress.map((p) => [p.questionId, p]));
  const topicEase = new Map();
  for (const q of questions) {
    const p = progById.get(q.id);
    if (!p || p.repetitions === 0) continue;
    for (const t of (q.topics || [])) {
      const cur = topicEase.get(t) || { sum: 0, n: 0 };
      cur.sum += p.ease ?? 2.5;
      cur.n += 1;
      topicEase.set(t, cur);
    }
  }
  return Array.from(topicEase.entries())
    .filter(([, v]) => v.n >= 2)
    .map(([t, v]) => [t, v.sum / v.n])
    .sort((a, b) => a[1] - b[1])
    .slice(0, n);
}

function lastBackupHint(progress, notes, attempts) {
  const records = progress.length + notes.length + attempts.length;
  if (records === 0) return "no progress yet";
  return `${records} record${records === 1 ? "" : "s"} - export to be safe`;
}
