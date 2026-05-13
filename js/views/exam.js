/* =========================================================================
   Timed Mock Exam view.
   Wall-clock timer (endAtMs persisted; remaining = endAtMs - Date.now()).
   Writes on every: answer, flag, nav, plus a tick every 5 seconds.
   During active exam, router nav to other modes is locked via setExamLock.
   ========================================================================= */

import { db } from "../db.js";
import { shuffled, shuffledSeeded, hashSeed } from "../lib/shuffle.js";
import { formatHMS } from "../lib/time.js";
import { sourceHref } from "./guide.js";
import { pickWeightedExamQuestions, filterForExamType, isExamTrack } from "../sections.js";
import { renderProvenance } from "./lib/provenance.js";

const EXAM_PRESETS = [
  { length: 200, minutes: 180, label: "Full (200Q · 3 hr)" },
  { length: 100, minutes:  90, label: "Half (100Q · 90 min)" },
  { length:  50, minutes:  45, label: "Mini (50Q · 45 min)" },
];

const TICK_SAVE_MS = 5000;
const TICK_RENDER_MS = 500;

export async function render(mount, ctx) {
  const { el, clear, bibs, toast, params, setExamLock } = ctx;
  clear(mount);

  const active = bibs.active();
  if (!active) {
    mount.appendChild(el("p", { class: "empty-state muted", text: "No Bib active." }));
    return;
  }
  const bibId = active.id;

  const [questions, bibData, profileSheet] = await Promise.all([
    db.getAllByIndex("questions", "byBib", IDBKeyRange.only(bibId)),
    bibs.bibData(bibId),
    bibs.profileSheet(bibId),
  ]);
  const qById = new Map(questions.map((q) => [q.id, q]));
  const sectionsAvailable = isExamTrack(bibData) && Array.isArray(bibData?.sections) && bibData.sections.length > 0;
  const examType = bibData?.examType || "regular";
  const eligibleQuestions = filterForExamType(questions, bibData, examType);

  if (questions.length === 0) {
    mount.appendChild(el("div", { class: "empty-state" },
      el("h3", { text: "No questions in this Bib yet" })));
    return;
  }

  /* Resume check */
  let session = null;
  if (params[0] === "resume" && params[1]) {
    session = await db.get("sessions", Number(params[1]));
    if (!session || !session.inProgress || session.type !== "exam" || session.bibId !== bibId) session = null;
  }
  if (!session) {
    const liveRows = await db.getAllByIndex("sessions", "byInProgress", IDBKeyRange.only([bibId, 1]));
    session = liveRows.filter((s) => s.type === "exam")
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null;
  }

  let detachKey = null;
  if (session) {
    await runActive(session);
  } else {
    renderSetup();
  }

  return async () => {
    setExamLock(false);
    if (detachKey) { try { detachKey(); } catch {} detachKey = null; }
    if (session && session.inProgress) {
      session.updatedAt = Date.now();
      try { await db.put("sessions", session); } catch {}
    }
  };

  /* ---------- Setup ---------- */

  function renderSetup() {
    clear(mount);
    setExamLock(false);
    const box = el("div", { class: "card" });
    box.appendChild(el("h2", { text: "Timed Mock Exam" }));
    box.appendChild(el("p", { class: "muted",
      text: "Simulates Navy enlisted advancement pacing (~54 sec / question). Once started, the top nav locks until you Submit or run out of time. Closing the tab is safe - progress auto-saves on every answer, every flag, every navigation, and every 5 seconds. Keyboard: 1-4 picks a choice, F flags, Left/Right moves between questions." }));

    let chosen = EXAM_PRESETS[2];
    // If the default would be disabled (not enough eligible questions), pick the largest available
    const pool = eligibleQuestions.length;
    if (pool < chosen.length) {
      chosen = [...EXAM_PRESETS].reverse().find((p) => pool >= p.length) || EXAM_PRESETS[2];
    }
    const row = el("div", { class: "row" });
    for (const p of EXAM_PRESETS) {
      const b = el("button", { class: "btn btn-ghost", text: p.label });
      b.disabled = pool < p.length;
      if (b.disabled) b.title = `Need ${p.length} questions; only ${pool} eligible (${examType} exam).`;
      b.addEventListener("click", () => {
        if (b.disabled) return;
        chosen = p;
        row.querySelectorAll("button").forEach((x) => x.classList.remove("is-selected"));
        b.classList.add("is-selected");
      });
      if (p === chosen && !b.disabled) b.classList.add("is-selected");
      row.appendChild(b);
    }
    box.appendChild(el("div", { class: "form-field" },
      el("label", { text: "Length + time" }),
      row));

    const timerField = el("div", { class: "form-field" });
    const timerLbl = el("label", {});
    const cb = el("input", { type: "checkbox", checked: true });
    cb.style.marginRight = "6px";
    timerLbl.appendChild(cb);
    timerLbl.appendChild(document.createTextNode("Show countdown timer"));
    timerField.appendChild(timerLbl);
    box.appendChild(timerField);

    // Section-weighted question selection (default ON when the bib declares sections).
    const weightedField = el("div", { class: "form-field" });
    const weightedLbl = el("label", {});
    const weightedCb = el("input", { type: "checkbox", checked: sectionsAvailable });
    weightedCb.disabled = !sectionsAvailable;
    weightedCb.style.marginRight = "6px";
    weightedLbl.appendChild(weightedCb);
    weightedLbl.appendChild(document.createTextNode(
      sectionsAvailable
        ? "Section-weighted question selection (matches the exam's section item counts)"
        : "Section-weighted selection (unavailable - bib.json has no sections[])"));
    weightedField.appendChild(weightedLbl);
    box.appendChild(weightedField);

    if (sectionsAvailable && examType === "regular") {
      const eligibleCount = eligibleQuestions.length;
      const subsExcluded = questions.length - eligibleCount;
      box.appendChild(el("p", { class: "muted", style: "font-size:0.85em; margin-top: -6px;",
        text: subsExcluded > 0
          ? `Pool: ${eligibleCount} regular-exam questions (${subsExcluded} substitute-only excluded).`
          : `Pool: ${eligibleCount} regular-exam questions.` }));
    }

    const startBtn = el("button", { class: "btn btn-lg", text: "Start exam" });
    startBtn.addEventListener("click", async () => {
      const pool = eligibleQuestions;
      if (pool.length < chosen.length) { toast(`Not enough questions for ${chosen.length}-Q exam (pool: ${pool.length})`); return; }
      const qids = weightedCb.checked && sectionsAvailable
        ? pickWeightedExamQuestions(bibData, questions, chosen.length, { examType, profileSheet })
        : shuffled(pool.map((q) => q.id)).slice(0, chosen.length);
      if (qids.length < chosen.length) toast(`Built a ${qids.length}-Q exam (corpus shortfall); starting anyway.`);
      const choiceOrders = {};
      const seedBase = Date.now();
      for (const qid of qids) choiceOrders[qid] = shuffledSeeded([0, 1, 2, 3], hashSeed(qid + "|" + seedBase));

      const now = Date.now();
      const newSession = {
        type: "exam",
        bibId,
        startedAt: now,
        updatedAt: now,
        inProgress: 1,
        state: {
          questionIds: qids,
          choiceOrders,
          answers: {},
          flags: {},
          currentIndex: 0,
          endAtMs: now + chosen.minutes * 60 * 1000,
          length: chosen.length,
          examMinutes: chosen.minutes,
          timerVisible: cb.checked,
        },
      };
      newSession.id = await db.put("sessions", newSession);
      session = newSession;
      await runActive(session);
    });
    box.appendChild(startBtn);
    mount.appendChild(box);
  }

  /* ---------- Active exam ---------- */

  async function runActive(s) {
    clear(mount);
    setExamLock(true);

    const shell = el("div", { class: "exam-shell" });
    const main = el("div");
    const side = el("div", { class: "exam-side" });
    shell.appendChild(main);
    shell.appendChild(side);
    mount.appendChild(shell);

    const timerEl = el("div", { class: "timer", role: "timer", "aria-live": "off" });
    side.appendChild(timerEl);

    const countsEl = el("div", { class: "exam-legend", "aria-live": "polite" });
    side.appendChild(countsEl);

    const gridEl = el("div", { class: "exam-grid", role: "grid", "aria-label": "Question grid" });
    side.appendChild(gridEl);

    const legend = el("div", { class: "exam-legend", style: "margin-top:4px;" });
    legend.appendChild(el("span", { class: "pill ok", text: "answered" }));
    legend.appendChild(el("span", { class: "pill warn", text: "flagged" }));
    legend.appendChild(el("span", { class: "pill", text: "unanswered" }));
    side.appendChild(legend);

    const submitBtn = el("button", { class: "btn btn-danger", style: "width:100%; margin-top:8px;", text: "Submit exam" });
    submitBtn.addEventListener("click", () => {
      const answered = Object.keys(s.state.answers).length;
      const total = s.state.questionIds.length;
      if (answered < total && !confirm(`Submit now? ${total - answered} question(s) unanswered.`)) return;
      finish("submitted");
    });
    side.appendChild(submitBtn);

    renderGrid();

    const qArea = el("div");
    main.appendChild(qArea);
    renderCurrent();

    const onKey = async (ev) => {
      if (!s.inProgress) return;
      const t = ev.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const idx = s.state.currentIndex;
      const qid = s.state.questionIds[idx];
      const q = qById.get(qid);
      if (!q) return;
      const order = s.state.choiceOrders[qid] || [0, 1, 2, 3];
      if (ev.key >= "1" && ev.key <= "4") {
        const pos = Number(ev.key) - 1;
        if (pos < order.length) {
          ev.preventDefault();
          s.state.answers[qid] = order[pos];
          s.updatedAt = Date.now();
          await db.put("sessions", s);
          renderCurrent();
          renderGrid();
        }
        return;
      }
      if (ev.key === "f" || ev.key === "F") {
        ev.preventDefault();
        s.state.flags[qid] = !s.state.flags[qid];
        if (!s.state.flags[qid]) delete s.state.flags[qid];
        s.updatedAt = Date.now();
        await db.put("sessions", s);
        renderCurrent();
        renderGrid();
        return;
      }
      if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        await go(idx - 1);
        return;
      }
      if (ev.key === "ArrowRight") {
        ev.preventDefault();
        await go(idx + 1);
        return;
      }
    };
    document.addEventListener("keydown", onKey);
    detachKey = () => document.removeEventListener("keydown", onKey);

    let saveTickHandle = setInterval(async () => {
      if (!s.inProgress) return;
      s.updatedAt = Date.now();
      try { await db.put("sessions", s); } catch {}
    }, TICK_SAVE_MS);

    let renderTickHandle = setInterval(() => {
      const remSec = Math.max(0, Math.round((s.state.endAtMs - Date.now()) / 1000));
      timerEl.textContent = formatHMS(remSec);
      timerEl.classList.toggle("warn", remSec <= 600);
      if (!s.state.timerVisible) timerEl.textContent = "—:—";
      if (remSec <= 0) {
        finish("timeout");
      }
    }, TICK_RENDER_MS);

    const origCleanup = () => {
      clearInterval(saveTickHandle);
      clearInterval(renderTickHandle);
      document.removeEventListener("keydown", onKey);
    };
    const prevReturn = this;
    (runActive).cleanup = origCleanup;

    async function finish(reason) {
      clearInterval(saveTickHandle);
      clearInterval(renderTickHandle);
      document.removeEventListener("keydown", onKey);

      s.inProgress = 0;
      s.endedAt = Date.now();
      s.updatedAt = Date.now();
      s.state.endReason = reason;
      await db.put("sessions", s);

      const ans = s.state.answers || {};
      const questionIds = s.state.questionIds;
      let correct = 0;
      const missed = [];
      for (const qid of questionIds) {
        const q = qById.get(qid);
        if (!q) continue;
        const chosen = ans[qid];
        if (chosen === q.answer) correct++;
        else missed.push({ qid, chosen });
      }
      const total = questionIds.length;
      const percent = total ? Math.round((correct / total) * 100) : 0;

      const attempt = {
        bibId,
        sessionId: s.id,
        startedAt: s.startedAt,
        completedAt: Date.now(),
        durationSec: Math.round((Date.now() - s.startedAt) / 1000),
        total,
        correct,
        percent,
        endReason: reason,
      };
      await db.put("examAttempts", attempt);

      setExamLock(false);
      renderResults({ s, correct, total, percent, missed, reason });
    }

    function renderGrid() {
      while (gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);
      const total = s.state.questionIds.length;
      let answered = 0, flagged = 0;
      for (let i = 0; i < total; i++) {
        const qid = s.state.questionIds[i];
        const btn = el("button", { type: "button" });
        btn.textContent = String(i + 1);
        const isAnswered = s.state.answers[qid] != null;
        const isFlagged  = !!s.state.flags[qid];
        if (i === s.state.currentIndex) btn.classList.add("current");
        if (isAnswered) { btn.classList.add("answered"); answered++; }
        if (isFlagged)  { btn.classList.add("flagged"); flagged++; }
        const stateBits = [
          isAnswered ? "answered" : "unanswered",
          isFlagged ? "flagged" : "",
          i === s.state.currentIndex ? "current" : "",
        ].filter(Boolean).join(", ");
        btn.setAttribute("aria-label", `Question ${i + 1} of ${total}, ${stateBits}`);
        btn.addEventListener("click", async () => {
          s.state.currentIndex = i;
          s.updatedAt = Date.now();
          await db.put("sessions", s);
          renderCurrent();
          renderGrid();
        });
        gridEl.appendChild(btn);
      }
      // Counts pill row above the grid
      while (countsEl.firstChild) countsEl.removeChild(countsEl.firstChild);
      countsEl.appendChild(el("span", { class: "pill ok", text: `${answered}/${total} answered` }));
      countsEl.appendChild(el("span", { class: "pill", text: `${total - answered} unanswered` }));
      if (flagged) countsEl.appendChild(el("span", { class: "pill warn", text: `${flagged} flagged` }));
    }

    function renderCurrent() {
      while (qArea.firstChild) qArea.removeChild(qArea.firstChild);
      const idx = s.state.currentIndex;
      const qid = s.state.questionIds[idx];
      const q = qById.get(qid);
      if (!q) {
        qArea.appendChild(el("p", { class: "muted", text: "Question not found." }));
        return;
      }

      qArea.appendChild(el("div", { class: "muted",
        text: `Question ${idx + 1} of ${s.state.questionIds.length}` }));

      const card = el("div", { class: "qcard" });
      card.appendChild(el("div", { class: "stem", text: q.stem }));

      const order = s.state.choiceOrders[qid] || [0, 1, 2, 3];
      const ul = el("ul", { class: "choices" });
      for (const i of order) {
        const li = el("li", { class: "choice", "data-idx": String(i), text: q.choices[i] });
        if (s.state.answers[qid] === i) li.classList.add("selected");
        li.addEventListener("click", async () => {
          s.state.answers[qid] = i;
          s.updatedAt = Date.now();
          await db.put("sessions", s);
          renderCurrent();
          renderGrid();
        });
        ul.appendChild(li);
      }
      card.appendChild(ul);

      const bar = el("div", { class: "exam-bar" });
      const prevBtn = el("button", { class: "btn btn-ghost", text: "← Prev" });
      prevBtn.disabled = idx === 0;
      prevBtn.addEventListener("click", async () => { await go(idx - 1); });

      const flagBtn = el("button", { class: "btn btn-ghost",
        text: s.state.flags[qid] ? "★ Flagged" : "☆ Flag for review" });
      flagBtn.addEventListener("click", async () => {
        s.state.flags[qid] = !s.state.flags[qid];
        if (!s.state.flags[qid]) delete s.state.flags[qid];
        s.updatedAt = Date.now();
        await db.put("sessions", s);
        renderCurrent();
        renderGrid();
      });

      const nextBtn = el("button", { class: "btn", text: "Next →" });
      nextBtn.disabled = idx >= s.state.questionIds.length - 1;
      nextBtn.addEventListener("click", async () => { await go(idx + 1); });

      bar.appendChild(prevBtn);
      bar.appendChild(flagBtn);
      bar.appendChild(nextBtn);
      card.appendChild(bar);

      qArea.appendChild(card);
    }

    async function go(i) {
      s.state.currentIndex = Math.max(0, Math.min(s.state.questionIds.length - 1, i));
      s.updatedAt = Date.now();
      await db.put("sessions", s);
      renderCurrent();
      renderGrid();
    }

    function renderResults({ s, correct, total, percent, missed, reason }) {
      clear(mount);

      // Letter grade
      const letter = percent >= 90 ? "A" : percent >= 80 ? "B" : percent >= 70 ? "C" : percent >= 60 ? "D" : "F";
      const passed = percent >= 70;

      // Header card with score
      const header = el("div", { class: "card", style: "margin-bottom: 18px;" });
      header.appendChild(el("h2", { text: reason === "timeout" ? "Time's up" : "Exam complete" }));
      const metricRow = el("div", { class: "row", style: "align-items:baseline; gap:18px;" });
      const metric = el("div", { class: "card-metric", style: "margin: 0;" });
      metric.appendChild(document.createTextNode(String(correct)));
      metric.appendChild(el("span", { class: "sub", text: ` / ${total}` }));
      metricRow.appendChild(metric);
      metricRow.appendChild(el("div", {
        style: `font-size: 2.2em; font-weight: 700; color: var(--${passed ? "success" : "danger"});`,
        text: `${percent}%`
      }));
      metricRow.appendChild(el("div", {
        style: `font-size: 2.6em; font-weight: 800; color: var(--${passed ? "success" : "danger"});`,
        text: letter
      }));
      header.appendChild(metricRow);
      header.appendChild(el("div", { class: "muted", style: "margin-top: 6px;",
        text: `Duration: ${formatHMS(Math.round((Date.now() - s.startedAt) / 1000))}  ·  Missed: ${missed.length}  ·  ${reason === "timeout" ? "Submitted at time-out" : "Submitted by you"}` }));

      const actionRow = el("div", { class: "row", style: "margin-top: 12px; gap: 8px; flex-wrap: wrap;" });
      const back = el("button", { class: "btn btn-ghost", text: "Back to dashboard" });
      back.addEventListener("click", () => { location.hash = "#dashboard"; });
      actionRow.appendChild(back);

      const newExam = el("button", { class: "btn btn-ghost", text: "Take another mock exam" });
      newExam.addEventListener("click", () => {
        // Force a re-render even when hash already equals #exam
        if (location.hash === "#exam") { location.hash = "#dashboard"; setTimeout(() => { location.hash = "#exam"; }, 0); }
        else { location.hash = "#exam"; }
      });
      actionRow.appendChild(newExam);

      if (missed.length) {
        const sendBtn = el("button", { class: "btn", text: `Send ${missed.length} missed into flashcard review` });
        sendBtn.addEventListener("click", async () => {
          const { initCard, review, RATE } = await import("../srs.js");
          for (const m of missed) {
            const prev = await db.get("progress", [bibId, m.qid]) || initCard();
            const next = review(prev, RATE.AGAIN, Date.now());
            next.bibId = bibId;
            next.questionId = m.qid;
            await db.put("progress", next);
          }
          toast(`${missed.length} questions queued for review`);
          sendBtn.disabled = true;
          sendBtn.textContent = `${missed.length} queued ✓`;
        });
        actionRow.appendChild(sendBtn);
      }
      header.appendChild(actionRow);
      mount.appendChild(header);

      // Missed-by-reference summary (above per-question review)
      if (missed.length) {
        mount.appendChild(el("h3", { style: "margin-top: 12px;", text: `Misses by reference (${missed.length})` }));
        mount.appendChild(el("p", { class: "muted", style: "font-size:0.9em; margin-top:-4px;",
          text: "Per-reference breakdown of what you missed. Use these actions to drill, quiz, or read the study guide for each weak reference." }));
        const groupContainer = el("div", { style: "margin-top: 8px;" });
        const groups = new Map();
        for (const m of missed) {
          const q = qById.get(m.qid);
          if (!q) continue;
          const ref = q.sourceRef || (q.refs && q.refs[0]) || "(unfiled)";
          if (!groups.has(ref)) groups.set(ref, []);
          groups.get(ref).push({ m, q });
        }
        const ordered = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
        for (const [ref, items] of ordered) {
          const det = el("details", { class: "miss-group" });
          det.open = items.length === ordered[0]?.[1].length;
          const sum = el("summary");
          sum.appendChild(el("span", {}, el("strong", { text: ref }), el("span", { class: "muted", style: "margin-left:6px", text: `- ${items.length} miss${items.length === 1 ? "" : "es"}` })));
          det.appendChild(sum);
          const actions = el("div", { class: "miss-actions" });
          if (ref !== "(unfiled)") {
            actions.appendChild(el("a", { class: "btn btn-sm", href: `#flashcards/ref:${encodeURIComponent(ref)}`, text: "Drill this ref" }));
            actions.appendChild(el("a", { class: "btn btn-ghost btn-sm", href: `#quiz/ref:${encodeURIComponent(ref)}`, text: "Quiz this ref" }));
            actions.appendChild(el("a", { class: "btn btn-ghost btn-sm", href: `#guide/${encodeURIComponent(ref)}`, text: "Study guide" }));
          }
          det.appendChild(actions);
          const list = el("div", { class: "miss-list" });
          for (const { m, q } of items) {
            list.appendChild(el("div", {},
              el("div", { style: "font-size:0.95em;", text: q.stem }),
              el("div", { class: "muted", style: "font-size:0.85em" },
                "Your answer: ", el("strong", { text: m.chosen == null ? "(unanswered)" : q.choices[m.chosen] }),
                " - Correct: ", el("strong", { text: q.choices[q.answer] })),
            ));
          }
          det.appendChild(list);
          groupContainer.appendChild(det);
        }
        mount.appendChild(groupContainer);
      }

      // Filter toggle
      const reviewHead = el("div", { class: "row", style: "align-items: baseline; margin-bottom: 10px; margin-top: 20px;" });
      reviewHead.appendChild(el("h3", { style: "margin: 0;", text: "Question review" }));
      const showAllBtn = el("button", { class: "btn btn-sm is-selected", text: `All (${total})` });
      const showMissedBtn = el("button", { class: "btn btn-ghost btn-sm", text: `Missed only (${missed.length})` });
      reviewHead.appendChild(showAllBtn);
      reviewHead.appendChild(showMissedBtn);
      mount.appendChild(reviewHead);

      const list = el("div", { class: "review-list" });
      mount.appendChild(list);

      const ans = s.state.answers || {};
      const questionIds = s.state.questionIds;

      function paint(filterMode) {
        while (list.firstChild) list.removeChild(list.firstChild);
        let shown = 0;
        for (let i = 0; i < questionIds.length; i++) {
          const qid = questionIds[i];
          const q = qById.get(qid);
          if (!q) continue;
          const chosen = ans[qid];
          const isCorrect = chosen === q.answer;
          if (filterMode === "missed" && isCorrect) continue;
          shown++;

          const item = el("div", { class: `review-item ${isCorrect ? "is-correct" : "is-wrong"}` });

          // Header bar with Q number and result badge
          const head = el("div", { class: "review-head" });
          head.appendChild(el("span", { class: "qnum", text: `Q${i + 1}` }));
          head.appendChild(el("span", { class: `result-badge ${isCorrect ? "ok" : "bad"}`,
            text: isCorrect ? "✓ Correct" : (chosen == null ? "○ Unanswered" : "✗ Wrong") }));
          item.appendChild(head);

          // Stem
          item.appendChild(el("div", { class: "stem", text: q.stem }));

          // Choices with highlighting
          const ul = el("ul", { class: "choices" });
          for (let ci = 0; ci < q.choices.length; ci++) {
            const choiceEl = el("li", { class: "choice locked" });
            const isUserChoice = (chosen === ci);
            const isCorrectAnswer = (ci === q.answer);

            if (isCorrectAnswer) choiceEl.classList.add("correct");
            if (isUserChoice && !isCorrectAnswer) choiceEl.classList.add("wrong");
            if (isUserChoice) choiceEl.classList.add("selected");

            // Marker icon
            const marker = el("span", { class: "choice-marker",
              text: isCorrectAnswer ? "✓" : (isUserChoice ? "✗" : " ") });
            const text = el("span", { class: "choice-text", text: q.choices[ci] });
            const tag = isUserChoice
              ? el("span", { class: "choice-tag", text: isCorrectAnswer ? "your answer" : "your answer" })
              : isCorrectAnswer
                ? el("span", { class: "choice-tag", text: "correct" })
                : null;
            choiceEl.appendChild(marker);
            choiceEl.appendChild(text);
            if (tag) choiceEl.appendChild(tag);
            ul.appendChild(choiceEl);
          }
          item.appendChild(ul);

          // Explanation
          if (q.explanation) {
            item.appendChild(el("div", { class: "explanation muted", text: q.explanation }));
          }
          // Source link
          const sh = sourceHref(q);
          if (sh) {
            const a = document.createElement("a");
            a.className = "btn btn-ghost btn-sm source-link";
            a.href = sh;
            a.textContent = "View source ->";
            item.appendChild(a);
          }
          const prov = renderProvenance(q, bibData);
          if (prov) item.appendChild(prov);
          list.appendChild(item);
        }
        if (shown === 0) {
          list.appendChild(el("p", { class: "muted", text: "Nothing to show." }));
        }
      }

      showAllBtn.addEventListener("click", () => {
        showAllBtn.classList.add("is-selected");
        showAllBtn.classList.remove("btn-ghost");
        showMissedBtn.classList.remove("is-selected");
        showMissedBtn.classList.add("btn-ghost");
        paint("all");
      });
      showMissedBtn.addEventListener("click", () => {
        showMissedBtn.classList.add("is-selected");
        showMissedBtn.classList.remove("btn-ghost");
        showAllBtn.classList.remove("is-selected");
        showAllBtn.classList.add("btn-ghost");
        paint("missed");
      });
      paint("all");
    }
  }
}
