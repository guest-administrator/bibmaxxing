/* =========================================================================
   Practice Quiz view — untimed MCQ drill with instant feedback.
   Setup → Loop → Results. Resume picks up at the exact question.
   ========================================================================= */

import { db } from "../db.js";
import { shuffled, shuffledSeeded, hashSeed } from "../lib/shuffle.js";
import { topicLabel } from "../lib/topic-labels.js";
import { initCard, review, RATE } from "../srs.js";
import { sourceHref } from "./guide.js";
import { renderProvenance } from "./lib/provenance.js";

export async function render(mount, ctx) {
  const { el, clear, bibs, toast, params } = ctx;
  clear(mount);

  const active = bibs.active();
  if (!active) {
    mount.appendChild(el("p", { class: "empty-state muted", text: "No Bib active." }));
    return;
  }
  const bibId = active.id;

  const [questions, progress, bibRefs, bibSections, bibObjectives, bibData] = await Promise.all([
    db.getAllByIndex("questions", "byBib", IDBKeyRange.only(bibId)),
    db.getAllByIndex("progress", "byBib", IDBKeyRange.only(bibId)),
    bibs.refs(bibId),
    bibs.sections(bibId),
    bibs.objectives(bibId),
    bibs.bibData(bibId),
  ]);
  const progById = new Map(progress.map((p) => [p.questionId, p]));
  const qById = new Map(questions.map((q) => [q.id, q]));

  if (questions.length === 0) {
    mount.appendChild(el("div", { class: "empty-state" },
      el("h3", { text: "No questions in this Bib" })));
    return;
  }

  // Resume check: if URL hash is #quiz/resume/<id>
  let session = null;
  if (params[0] === "resume" && params[1]) {
    session = await db.get("sessions", Number(params[1]));
    if (session && session.inProgress && session.type === "quiz" && session.bibId === bibId) {
      runLoop(session);
      return cleanupOf(session);
    }
  }
  // Otherwise look for any in-progress quiz
  const liveRows = await db.getAllByIndex("sessions", "byInProgress", IDBKeyRange.only([bibId, 1]));
  const live = liveRows.filter((s) => s.type === "quiz")
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (live) {
    renderResumePrompt(live);
    return cleanupOf(live);
  }

  renderSetup();
  return null;

  /* ---------- Setup ---------- */

  function renderSetup() {
    clear(mount);
    const box = el("div", { class: "card" });
    box.appendChild(el("h2", { text: "Practice Quiz" }));
    box.appendChild(el("p", { class: "muted", text: "Untimed multiple-choice drill with instant feedback. Picks an even mix of topic + reference coverage based on your filter." }));

    const topics = Array.from(new Set(questions.flatMap((q) => q.topics || []))).sort();

    let chosenLength = 10;
    let chosenFilter = { kind: "all" };

    // Pre-select filter from URL params: #quiz/weak | #quiz/topic:foo | #quiz/ref:BAR | #quiz/section:<id>
    let preselectValue = "all";
    if (params && params[0]) {
      const p = decodeURIComponent(params[0]);
      if (p === "weak") {
        chosenFilter = { kind: "weak" };
        preselectValue = "weak";
      } else if (p.startsWith("topic:")) {
        chosenFilter = { kind: "topic", value: p.slice(6) };
        preselectValue = p;
      } else if (p.startsWith("ref:")) {
        chosenFilter = { kind: "ref", value: p.slice(4) };
        preselectValue = p;
      } else if (p.startsWith("section:")) {
        chosenFilter = { kind: "section", value: p.slice(8) };
        preselectValue = p;
      } else if (p.startsWith("objective:")) {
        chosenFilter = { kind: "objective", value: p.slice(10) };
        preselectValue = p;
      }
    }

    const lenField = el("div", { class: "form-field" });
    lenField.appendChild(el("label", { text: "Length" }));
    const lenRow = el("div", { class: "row" });
    for (const n of [10, 25, 50]) {
      const b = el("button", { class: "btn btn-ghost btn-sm", text: `${n} questions` });
      b.dataset.len = String(n);
      b.addEventListener("click", () => {
        chosenLength = n;
        lenRow.querySelectorAll("button").forEach((x) => x.classList.remove("is-selected"));
        b.classList.add("is-selected");
      });
      if (n === chosenLength) b.classList.add("is-selected");
      lenRow.appendChild(b);
    }
    lenField.appendChild(lenRow);
    box.appendChild(lenField);

    const filField = el("div", { class: "form-field" });
    filField.appendChild(el("label", { text: "Filter" }));
    const sel = el("select");
    sel.appendChild(el("option", { value: "all", text: "All topics" }));
    sel.appendChild(el("option", { value: "weak", text: "Weak areas (lowest ease)" }));
    for (const s of bibSections) sel.appendChild(el("option", { value: `section:${s.id}`, text: `Section: ${s.name}` }));
    for (const o of bibObjectives) sel.appendChild(el("option", { value: `objective:${o.id}`, text: `Objective: ${o.name}` }));
    for (const t of topics) sel.appendChild(el("option", { value: `topic:${t}`, text: topicLabel(t) }));
    for (const r of bibRefs) sel.appendChild(el("option", { value: `ref:${r.id}`, text: `Ref: ${r.id}` }));
    sel.addEventListener("change", () => {
      const v = sel.value;
      if (v === "all") chosenFilter = { kind: "all" };
      else if (v === "weak") chosenFilter = { kind: "weak" };
      else if (v.startsWith("topic:")) chosenFilter = { kind: "topic", value: v.slice(6) };
      else if (v.startsWith("ref:")) chosenFilter = { kind: "ref", value: v.slice(4) };
      else if (v.startsWith("section:")) chosenFilter = { kind: "section", value: v.slice(8) };
      else if (v.startsWith("objective:")) chosenFilter = { kind: "objective", value: v.slice(10) };
    });
    sel.value = preselectValue;
    filField.appendChild(sel);
    box.appendChild(filField);

    // Live summary banner — reflects current selections so the operator
    // sees what they're about to start without scanning the form.
    const summary = el("div", { class: "setup-summary", role: "status", "aria-live": "polite" });
    box.appendChild(summary);
    function repaintSummary() {
      while (summary.firstChild) summary.removeChild(summary.firstChild);
      const pool = filterQuestions(questions, progById, chosenFilter);
      const target = Math.min(chosenLength, pool.length);
      summary.appendChild(el("span", {}, el("span", { class: "k", text: "Length: " }), el("span", { class: "v", text: `${target} question${target === 1 ? "" : "s"}` })));
      summary.appendChild(el("span", {}, el("span", { class: "k", text: "Filter: " }), el("span", { class: "v", text: describeFilter(chosenFilter, bibRefs, bibSections, bibObjectives) })));
      summary.appendChild(el("span", {}, el("span", { class: "k", text: "Pool: " }), el("span", { class: "v", text: `${pool.length} matching` })));
      if (pool.length < chosenLength) {
        summary.appendChild(el("span", { class: "muted", text: ` (fewer than requested - will run ${pool.length})` }));
      }
    }
    repaintSummary();
    // Hook recompute into the existing controls without restructuring them.
    lenRow.addEventListener("click", () => setTimeout(repaintSummary, 0));
    sel.addEventListener("change", repaintSummary);

    const startBtn = el("button", { class: "btn btn-lg", text: "Start quiz" });
    startBtn.addEventListener("click", async () => {
      const pool = filterQuestions(questions, progById, chosenFilter);
      if (pool.length === 0) { toast("No questions match that filter."); return; }
      const length = Math.min(chosenLength, pool.length);
      const qids = shuffled(pool.map((q) => q.id)).slice(0, length);
      session = {
        type: "quiz",
        bibId,
        startedAt: Date.now(),
        updatedAt: Date.now(),
        inProgress: 1,
        state: {
          questionIds: qids,
          currentIndex: 0,
          answers: [],
          filter: chosenFilter,
        },
      };
      session.id = await db.put("sessions", session);
      runLoop(session);
    });
    box.appendChild(startBtn);

    mount.appendChild(box);
  }

  function renderResumePrompt(s) {
    clear(mount);
    const box = el("div", { class: "card" });
    box.appendChild(el("h2", { text: "Resume quiz?" }));
    box.appendChild(el("p", { class: "muted",
      text: `Quiz in progress: Q ${(s.state.currentIndex ?? 0) + 1} of ${s.state.questionIds.length}.` }));
    const row = el("div", { class: "row" });
    const resumeBtn = el("button", { class: "btn", text: "Resume" });
    resumeBtn.addEventListener("click", () => { session = s; runLoop(s); });
    const discardBtn = el("button", { class: "btn btn-ghost", text: "Discard and start new" });
    discardBtn.addEventListener("click", async () => {
      await db.put("sessions", { ...s, inProgress: 0, endedAt: Date.now() });
      renderSetup();
    });
    row.appendChild(resumeBtn);
    row.appendChild(discardBtn);
    box.appendChild(row);
    mount.appendChild(box);
  }

  /* ---------- Quiz loop ---------- */

  function runLoop(s) {
    let idx = s.state.currentIndex ?? 0;

    async function renderQ() {
      clear(mount);
      if (idx >= s.state.questionIds.length) {
        await finish();
        return;
      }
      const qid = s.state.questionIds[idx];
      const q = qById.get(qid);
      if (!q) { idx++; return renderQ(); }

      mount.appendChild(el("div", { class: "muted", style: "text-align:center; margin-bottom:8px;",
        text: `Question ${idx + 1} of ${s.state.questionIds.length}` }));

      const card = el("div", { class: "qcard" });
      card.appendChild(el("div", { class: "stem", text: q.stem }));

      const order = shuffledSeeded([0, 1, 2, 3], hashSeed(q.id + "|quiz|" + s.id));
      const choicesUl = el("ul", { class: "choices" });
      const choiceEls = [];
      for (const i of order) {
        const liNode = el("li", { class: "choice", "data-idx": String(i), text: q.choices[i] });
        liNode.addEventListener("click", () => onAnswer(i, liNode));
        choicesUl.appendChild(liNode);
        choiceEls.push(liNode);
      }
      card.appendChild(choicesUl);

      const nextBtn = el("button", { class: "btn", text: "Next →" });
      nextBtn.style.display = "none";
      nextBtn.addEventListener("click", async () => {
        idx++;
        s.state.currentIndex = idx;
        s.updatedAt = Date.now();
        await db.put("sessions", s);
        renderQ();
      });
      card.appendChild(nextBtn);

      const expl = el("div", { class: "explanation", style: "display:none" });
      card.appendChild(expl);

      mount.appendChild(card);

      async function onAnswer(chosenIdx, li) {
        for (const x of choiceEls) x.classList.add("locked");
        li.classList.add("selected");
        const correct = chosenIdx === q.answer;
        if (correct) li.classList.add("correct");
        else { li.classList.add("wrong"); choiceEls[q.answer]?.classList.add("correct"); }

        expl.style.display = "";
        const head = el("strong", { text: correct ? "Correct" : "Not quite" });
        expl.appendChild(head);
        if (q.explanation) expl.appendChild(el("p", { text: q.explanation }));
        if (q.refs?.length) expl.appendChild(el("div", { class: "refs muted", text: "Ref: " + q.refs.join(", ") }));
        const sh = sourceHref(q);
        if (sh) {
          const a = document.createElement("a");
          a.className = "btn btn-ghost btn-sm source-link";
          a.href = sh;
          a.textContent = "View source ->";
          a.style.marginTop = "8px";
          expl.appendChild(a);
        }
        const prov = renderProvenance(q, bibData);
        if (prov) expl.appendChild(prov);

        nextBtn.style.display = "";

        s.state.answers.push({ qid: q.id, chosen: chosenIdx, correct });
        s.updatedAt = Date.now();
        await db.put("sessions", s);
      }
    }

    async function finish() {
      s.inProgress = 0;
      s.endedAt = Date.now();
      s.updatedAt = Date.now();
      await db.put("sessions", s);

      const ans = s.state.answers;
      const correct = ans.filter((a) => a.correct).length;
      const total = ans.length;
      const pct = total ? Math.round((correct / total) * 100) : 0;

      clear(mount);
      mount.appendChild(el("h2", { text: "Quiz complete" }));
      mount.appendChild(el("p", { class: "card-metric", text: `${correct} / ${total}` },
        el("span", { class: "sub", text: ` · ${pct}%` })));

      const missed = ans.filter((a) => !a.correct);
      const topActions = el("div", { class: "row", style: "margin: 8px 0 18px; gap: 8px; flex-wrap: wrap;" });

      const backBtn = el("button", { class: "btn btn-ghost", text: "Back to dashboard" });
      backBtn.addEventListener("click", () => { location.hash = "#dashboard"; });
      topActions.appendChild(backBtn);

      const newQuiz = el("button", { class: "btn btn-ghost", text: "Take another quiz" });
      newQuiz.addEventListener("click", () => {
        if (location.hash === "#quiz") { location.hash = "#dashboard"; setTimeout(() => { location.hash = "#quiz"; }, 0); }
        else { location.hash = "#quiz"; }
      });
      topActions.appendChild(newQuiz);

      if (missed.length) {
        const againBtn = el("button", { class: "btn", text: `Queue ${missed.length} missed for flashcard review` });
        againBtn.addEventListener("click", async () => {
          for (const m of missed) {
            const prev = progById.get(m.qid) || initCard();
            const next = review(prev, RATE.AGAIN, Date.now());
            next.bibId = bibId;
            next.questionId = m.qid;
            await db.put("progress", next);
          }
          toast(`${missed.length} questions queued for flashcard review`);
          againBtn.disabled = true;
          againBtn.textContent = `${missed.length} queued`;
        });
        topActions.appendChild(againBtn);
      }
      mount.appendChild(topActions);

      if (missed.length) {
        mount.appendChild(el("h3", { text: `Missed ${missed.length} of ${total} - grouped by reference` }));
        mount.appendChild(el("p", { class: "muted", style: "font-size:0.9em; margin-top:-4px;",
          text: "Each group shows the reference and the questions you missed under it. Use the per-group actions to drill that reference or read its study guide." }));
        const groupContainer = el("div", { style: "margin-top: 10px;" });
        renderMissedByRef(groupContainer, missed, qById, ctx, bibId);
        mount.appendChild(groupContainer);
      } else {
        mount.appendChild(el("div", { class: "empty-state" },
          el("h3", { text: "Perfect score" }),
          el("p", { class: "muted", text: "Every question correct. Take another quiz for a different filter or move on to a mock exam." }),
        ));
      }
    }

    function renderMissedByRef(container, missed, qById, ctx, bibId) {
      const { el } = ctx;
      // Group: ref id -> [missed entry, q]
      const groups = new Map();
      for (const m of missed) {
        const q = qById.get(m.qid);
        if (!q) continue;
        const ref = q.sourceRef || (q.refs && q.refs[0]) || "(unfiled)";
        if (!groups.has(ref)) groups.set(ref, []);
        groups.get(ref).push({ m, q });
      }
      // Sort by group size descending.
      const ordered = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
      for (const [ref, items] of ordered) {
        const det = el("details", { class: "miss-group" });
        det.open = items.length === ordered[0]?.[1].length; // open the worst group by default
        const sum = el("summary");
        sum.appendChild(el("span", {}, el("strong", { text: ref }), el("span", { class: "muted", style: "margin-left:6px", text: `- ${items.length} miss${items.length === 1 ? "" : "es"}` })));
        det.appendChild(sum);

        const actions = el("div", { class: "miss-actions" });
        if (ref !== "(unfiled)") {
          const drillRef = el("a", { class: "btn btn-sm", href: `#flashcards/ref:${encodeURIComponent(ref)}`, text: "Drill this ref" });
          actions.appendChild(drillRef);
          const quizRef = el("a", { class: "btn btn-ghost btn-sm", href: `#quiz/ref:${encodeURIComponent(ref)}`, text: "Quiz this ref" });
          actions.appendChild(quizRef);
          const guideRef = el("a", { class: "btn btn-ghost btn-sm", href: `#guide/${encodeURIComponent(ref)}`, text: "Open study guide" });
          actions.appendChild(guideRef);
        }
        det.appendChild(actions);

        const list = el("div", { class: "miss-list" });
        for (const { m, q } of items) {
          const item = el("div", {},
            el("div", { class: "stem", style: "font-size:0.95em; margin-bottom: 2px;", text: q.stem }),
            el("div", { class: "muted", style: "font-size:0.85em" }, "Your answer: ", el("strong", { text: q.choices[m.chosen] }), " - Correct: ", el("strong", { text: q.choices[q.answer] })),
            q.explanation ? el("div", { class: "muted", style: "font-size:0.85em; margin-top:2px;", text: q.explanation }) : null,
          );
          list.appendChild(item);
        }
        det.appendChild(list);
        container.appendChild(det);
      }
    }

    renderQ();
  }

  function cleanupOf(s) {
    return async () => {
      if (s && s.inProgress) {
        s.updatedAt = Date.now();
        try { await db.put("sessions", s); } catch {}
      }
    };
  }
}

function filterQuestions(all, progById, f) {
  if (f.kind === "all") return all.slice();
  if (f.kind === "topic") return all.filter((q) => (q.topics || []).includes(f.value));
  if (f.kind === "ref") return all.filter((q) => (q.refs || []).includes(f.value) || q.sourceRef === f.value);
  if (f.kind === "section") return all.filter((q) => q.primarySection === f.value || (Array.isArray(q.sectionTags) && q.sectionTags.includes(f.value)));
  if (f.kind === "objective") return all.filter((q) => q.primaryObjective === f.value || (Array.isArray(q.objectiveTags) && q.objectiveTags.includes(f.value)));
  if (f.kind === "weak") {
    const scored = all.map((q) => ({ q, ease: (progById.get(q.id)?.ease ?? 2.5) }));
    scored.sort((a, b) => a.ease - b.ease);
    return scored.map((x) => x.q);
  }
  return all.slice();
}

function describeFilter(f, bibRefs, bibSections, bibObjectives) {
  if (!f || f.kind === "all") return "All topics";
  if (f.kind === "weak") return "Weak areas (lowest ease)";
  if (f.kind === "topic") return `Topic: ${topicLabel(f.value)}`;
  if (f.kind === "ref") {
    const r = (bibRefs || []).find((x) => x.id === f.value);
    return r ? `Reference: ${f.value} - ${r.title || ""}`.trim() : `Reference: ${f.value}`;
  }
  if (f.kind === "section") {
    const s = (bibSections || []).find((x) => x.id === f.value);
    return s ? `Section: ${s.name}` : `Section: ${f.value}`;
  }
  if (f.kind === "objective") {
    const o = (bibObjectives || []).find((x) => x.id === f.value);
    return o ? `Objective: ${o.name}` : `Objective: ${f.value}`;
  }
  return "All topics";
}
