/* =========================================================================
   Flashcards view — SM-2 driven review loop.
   Session persisted in `sessions`; ratings write progress immediately.
   ========================================================================= */

import { db } from "../db.js";
import { initCard, review, RATE, isDue, previewIntervals, DAY_MS } from "../srs.js";
import { topicLabel } from "../lib/topic-labels.js";
import { sourceHref } from "./guide.js";
import { renderProvenance } from "./lib/provenance.js";

const NEW_CARDS_PER_SESSION = 20;

const MULTI_KEY = "bibmaxxing:multiSelection";

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Parse URL params[0] into a subject filter. Returns null for "show picker". */
function parseFilter(params) {
  if (!params || !params[0]) return null;
  const p = decodeURIComponent(params[0]);
  if (p === "resume") return null;             // handled separately (resume by session id in params[1])
  if (p === "pick")   return null;             // explicit picker request (skips session resume)
  if (p === "all") return { kind: "all", label: "All cards" };
  if (p === "weak") return { kind: "weak", label: "Weak areas" };
  if (p === "new")  return { kind: "new",  label: "New cards only" };
  if (p === "due")  return { kind: "due",  label: "Due now only" };
  if (p.startsWith("topic:")) return { kind: "topic", value: p.slice(6), label: topicLabel(p.slice(6)) };
  if (p.startsWith("ref:"))   return { kind: "ref",   value: p.slice(4), label: p.slice(4) };
  if (p.startsWith("section:")) return { kind: "section", value: p.slice(8), label: `Section: ${p.slice(8)}` };
  if (p.startsWith("objective:")) return { kind: "objective", value: p.slice(10), label: `Objective: ${p.slice(10)}` };
  if (p === "multi") {
    // Selection delivered via sessionStorage to keep URL clean
    try {
      const sel = JSON.parse(sessionStorage.getItem(MULTI_KEY) || "null");
      if (sel && (sel.refs?.length || sel.topics?.length)) {
        const parts = [];
        if (sel.refs?.length)   parts.push(`${sel.refs.length} ref${sel.refs.length === 1 ? "" : "s"}`);
        if (sel.topics?.length) parts.push(`${sel.topics.length} topic${sel.topics.length === 1 ? "" : "s"}`);
        return { kind: "multi", refs: sel.refs || [], topics: sel.topics || [], label: parts.join(" + ") };
      }
    } catch {}
    return null;
  }
  return null;
}

/** True iff two parsed filters target the same subject. */
function filtersEqual(a, b) {
  if (!a || !b) return a === b;
  if (a.kind !== b.kind) return false;
  if (a.kind === "multi") {
    const ar = (a.refs || []).slice().sort();
    const br = (b.refs || []).slice().sort();
    const at = (a.topics || []).slice().sort();
    const bt = (b.topics || []).slice().sort();
    return ar.length === br.length && ar.every((v, i) => v === br[i]) &&
           at.length === bt.length && at.every((v, i) => v === bt[i]);
  }
  return a.value === b.value;
}

/** Filter the questions list down to those matching the subject filter. */
function applySubjectFilter(questions, progById, filter) {
  if (!filter || filter.kind === "all") return questions.slice();
  const now = Date.now();
  if (filter.kind === "weak") {
    return questions
      .filter((q) => progById.has(q.id))
      .map((q) => ({ q, ease: progById.get(q.id).ease ?? 2.5 }))
      .sort((a, b) => a.ease - b.ease)
      .map((x) => x.q);
  }
  if (filter.kind === "new")  return questions.filter((q) => !progById.has(q.id));
  if (filter.kind === "due")  return questions.filter((q) => {
    const p = progById.get(q.id);
    return p && isDue(p, now);
  });
  if (filter.kind === "topic") return questions.filter((q) => (q.topics || []).includes(filter.value));
  if (filter.kind === "ref")   return questions.filter((q) => q.sourceRef === filter.value || (q.refs || []).includes(filter.value));
  if (filter.kind === "section") return questions.filter((q) => q.primarySection === filter.value || (Array.isArray(q.sectionTags) && q.sectionTags.includes(filter.value)));
  if (filter.kind === "objective") return questions.filter((q) => q.primaryObjective === filter.value || (Array.isArray(q.objectiveTags) && q.objectiveTags.includes(filter.value)));
  if (filter.kind === "multi") {
    const refSet = new Set(filter.refs || []);
    const topicSet = new Set(filter.topics || []);
    return questions.filter((q) => {
      if (refSet.size && (refSet.has(q.sourceRef) || (q.refs || []).some((r) => refSet.has(r)))) return true;
      if (topicSet.size && (q.topics || []).some((t) => topicSet.has(t))) return true;
      return false;
    });
  }
  return questions.slice();
}

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
      el("h3", { text: "No cards to study" }),
      el("p", { class: "muted", text: "This Bib has no questions yet." })));
    return;
  }

  // Subject picker: shown when no filter param is present and no resumable session.
  // If the user explicitly chose a subject (params[0] is a filter), or has a resumable session, skip the picker.
  const filter = parseFilter(params);
  if (filter && filter.kind === "section") {
    const s = bibSections.find((x) => x.id === filter.value);
    if (s) filter.label = `Section: ${s.name}`;
  }
  if (filter && filter.kind === "objective") {
    const o = bibObjectives.find((x) => x.id === filter.value);
    if (o) filter.label = `Objective: ${o.name}`;
  }
  const wantsPicker = params && params[0] === "pick";
  const wantsResume = params && params[0] === "resume";
  let session = wantsPicker ? null : await findResumable(bibId);

  // If the URL specifies a filter explicitly, and a resumable session exists
  // for a different filter, retire the old session so the explicit route wins.
  // This is what makes "Drill weakest objective" actually switch subjects
  // when a session was open on another filter.
  if (session && filter && !filtersEqual(filter, session.state?.filter)) {
    session.inProgress = 0;
    session.endedAt = Date.now();
    session.updatedAt = Date.now();
    try { await db.put("sessions", session); } catch {}
    session = null;
  }

  // Show picker when:
  //   - explicit /pick route, OR
  //   - no filter chosen and no resumable session
  if (wantsPicker || (!filter && !wantsResume && !session)) {
    return renderSubjectPicker({ mount, ctx, bibId, questions, progById, bibRefs });
  }

  let queue;
  let completed = 0;

  if (session && session.state?.queue?.length) {
    queue = session.state.queue.slice(session.state.completed || 0);
    completed = session.state.completed || 0;
  } else {
    const filtered = applySubjectFilter(questions, progById, filter);
    // Multi mode: shuffle the union, no due/new prioritization
    if (filter && filter.kind === "multi") {
      queue = shuffleArray(filtered.map((q) => q.id));
    } else {
      queue = buildQueue(filtered, progById);
    }
    if (queue.length === 0) {
      renderDone(mount, ctx, { active, questions, progById, filter });
      return;
    }
    session = {
      type: "flashcards",
      bibId,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      inProgress: 1,
      state: { queue, completed: 0, filter: filter || null },
    };
    session.id = await db.put("sessions", session);
  }

  let cleanup = null;
  // Active per-card keyboard handler. Tracked in closure so we can detach it
  // deterministically before showing the next card and on view teardown.
  let cardKeyHandler = null;
  function detachCardKey() {
    if (cardKeyHandler) {
      document.removeEventListener("keydown", cardKeyHandler);
      cardKeyHandler = null;
    }
  }

  async function showNext() {
    detachCardKey();
    if (queue.length === 0) {
      await endSession();
      renderDone(mount, ctx, { active, questions, progById, filter: session?.state?.filter });
      return;
    }

    const qid = queue[0];
    const q = qById.get(qid);
    if (!q) { queue.shift(); completed++; return showNext(); }

    clear(mount);

    const prog = progById.get(qid) || initCard();
    const totalForSession = (session.state?.queue?.length) || (queue.length + completed);

    // Active subject banner — lets the user see what they're drilling and switch
    const activeFilter = session?.state?.filter;
    if (activeFilter && activeFilter.label) {
      const kindWord = ({
        ref: "Reference", topic: "Topic", multi: "Subjects",
        weak: "Mode", new: "Mode", due: "Mode", all: "Mode",
      })[activeFilter.kind] || "Subject";
      const banner = el("div", { class: "subject-banner" },
        el("span", { class: "muted", style: "font-size:0.85em;", text: kindWord + ":" }),
        el("strong", { style: "margin: 0 8px;", text: activeFilter.label }),
        (() => {
          const b = el("button", { class: "btn btn-ghost btn-sm", text: "Change subject" });
          b.addEventListener("click", async () => {
            // End the current session so the picker actually shows when we navigate.
            // Otherwise findResumable() picks it up again and we re-drill the same deck.
            if (session) {
              session.inProgress = 0;
              session.endedAt = Date.now();
              session.updatedAt = Date.now();
              try { await db.put("sessions", session); } catch {}
            }
            // Force a route change so the picker re-renders even if we're already on #flashcards.
            location.hash = "#dashboard";
            setTimeout(() => { location.hash = "#flashcards/pick"; }, 0);
          });
          return b;
        })(),
      );
      mount.appendChild(banner);
    }

    const progRow = el("div", { class: "muted", style: "text-align:center; margin-bottom:8px;",
      text: `Card ${completed + 1} of ${totalForSession}  ·  ${queue.length} remaining` });
    mount.appendChild(progRow);

    const card = el("div", { class: "qcard" });
    card.appendChild(el("div", { class: "stem", text: q.stem }));

    const revealArea = el("div");
    card.appendChild(revealArea);

    const showBtn = el("button", { class: "btn btn-lg", text: "Show answer" });
    showBtn.style.display = "block";
    showBtn.style.margin = "0 auto";
    card.appendChild(showBtn);

    mount.appendChild(card);

    let revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      showBtn.remove();
      revealArea.appendChild(renderReveal(q, prog, bibData));
      revealArea.appendChild(renderRatings(q, prog, onRate));
    }
    showBtn.addEventListener("click", reveal);

    // Keyboard shortcuts: Space/Enter reveals; 1/2/3/4 rates.
    // Handler is tracked at the render-scope level (cardKeyHandler) and
    // detached deterministically in showNext() and view cleanup.
    cardKeyHandler = (ev) => {
      const t = ev.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;

      if (!revealed) {
        if (ev.key === " " || ev.key === "Enter") {
          ev.preventDefault();
          reveal();
        }
        return;
      }
      const map = { "1": RATE.AGAIN, "2": RATE.HARD, "3": RATE.GOOD, "4": RATE.EASY };
      const rating = map[ev.key];
      if (rating !== undefined) {
        ev.preventDefault();
        detachCardKey();
        onRate(rating);
      }
    };
    document.addEventListener("keydown", cardKeyHandler);

    async function onRate(rating) {
      const nextProg = review(prog, rating, Date.now());
      nextProg.bibId = bibId;
      nextProg.questionId = q.id;
      nextProg.correctCount = (prog.correctCount || 0) + (rating >= RATE.GOOD ? 1 : 0);
      nextProg.wrongCount = (prog.wrongCount || 0) + (rating === RATE.AGAIN ? 1 : 0);
      nextProg.streak = rating === RATE.AGAIN ? 0 : (prog.streak || 0) + 1;
      await db.put("progress", nextProg);
      progById.set(q.id, nextProg);

      if (rating === RATE.AGAIN) queue.push(queue.shift());
      else { queue.shift(); completed++; }

      session.state.completed = completed;
      session.state.queue = session.state.queue || [];
      session.updatedAt = Date.now();
      await db.put("sessions", session);

      showNext();
    }
  }

  async function endSession() {
    session.inProgress = 0;
    session.endedAt = Date.now();
    session.updatedAt = Date.now();
    await db.put("sessions", session);
  }

  cleanup = async () => {
    detachCardKey();
    if (session && session.inProgress) {
      session.updatedAt = Date.now();
      await db.put("sessions", session);
    }
  };

  showNext();
  return cleanup;
}

/* --- helpers --- */

function buildQueue(questions, progById) {
  const now = Date.now();
  const due = [];
  const fresh = [];
  for (const q of questions) {
    const p = progById.get(q.id);
    if (!p) fresh.push(q);
    else if (isDue(p, now)) due.push({ q, p });
  }
  due.sort((a, b) => (a.p.nextDue || 0) - (b.p.nextDue || 0));
  fresh.sort(() => Math.random() - 0.5);
  return [
    ...due.map((x) => x.q.id),
    ...fresh.slice(0, NEW_CARDS_PER_SESSION).map((q) => q.id),
  ];
}

async function findResumable(bibId) {
  const rows = await db.getAllByIndex("sessions", "byInProgress", IDBKeyRange.only([bibId, 1]));
  return rows.filter((s) => s.type === "flashcards").sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null;
}

function renderReveal(q, progSnapshot, bibData) {
  const wrap = document.createDocumentFragment();
  const answer = document.createElement("div");
  answer.className = "explanation";
  const aHead = document.createElement("strong");
  aHead.textContent = "Answer: ";
  answer.appendChild(aHead);
  answer.appendChild(document.createTextNode(q.choices[q.answer]));
  wrap.appendChild(answer);

  if (q.explanation) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = q.explanation;
    wrap.appendChild(p);
  }
  if (q.refs?.length) {
    const r = document.createElement("div");
    r.className = "refs muted";
    r.textContent = "Ref: " + q.refs.join(", ");
    wrap.appendChild(r);
  }
  const sh = sourceHref(q);
  if (sh) {
    const btn = document.createElement("a");
    btn.className = "btn btn-ghost btn-sm source-link";
    btn.href = sh;
    btn.textContent = "View source ->";
    btn.title = "Jump to the study-guide section this card came from";
    btn.style.marginTop = "8px";
    wrap.appendChild(btn);
  }
  const prov = renderProvenance(q, bibData);
  if (prov) wrap.appendChild(prov);
  return wrap;
}

function renderRatings(q, progSnapshot, onRate) {
  const row = document.createElement("div");
  row.className = "srs-ratings";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", "Rate how well you recalled this card");
  const ivs = previewIntervals(progSnapshot);
  const defs = [
    { key: RATE.AGAIN, label: "Again", cls: "again", meaning: "Forgot it",          key1: "1" },
    { key: RATE.HARD,  label: "Hard",  cls: "hard",  meaning: "Recalled with effort", key1: "2" },
    { key: RATE.GOOD,  label: "Good",  cls: "good",  meaning: "Recalled okay",      key1: "3" },
    { key: RATE.EASY,  label: "Easy",  cls: "easy",  meaning: "Effortless",         key1: "4" },
  ];
  for (const d of defs) {
    const b = document.createElement("button");
    b.className = d.cls;
    b.type = "button";
    b.setAttribute("aria-label", `${d.label}: ${d.meaning}. Next review in ${ivs[d.key]}.`);
    b.title = `${d.label} - ${d.meaning} - next: ${ivs[d.key]} (key ${d.key1})`;
    const lab = document.createElement("span"); lab.className = "label"; lab.textContent = d.label;
    const iv  = document.createElement("span"); iv.className  = "interval"; iv.textContent  = `next: ${ivs[d.key]}`;
    const mean = document.createElement("span"); mean.className = "meaning"; mean.textContent = d.meaning;
    b.appendChild(lab); b.appendChild(iv); b.appendChild(mean);
    b.addEventListener("click", () => onRate(d.key));
    row.appendChild(b);
  }
  // Keyboard shortcut hint
  const hint = document.createElement("div");
  hint.className = "muted";
  hint.style.cssText = "font-size: 0.78em; text-align: center; margin-top: 6px;";
  hint.textContent = "Keys: 1 Again - 2 Hard - 3 Good - 4 Easy";
  const wrap = document.createDocumentFragment();
  wrap.appendChild(row);
  wrap.appendChild(hint);
  return wrap;
}

function renderDone(mount, ctx, { active, questions, progById, filter }) {
  const { el, clear } = ctx;
  clear(mount);
  const now = Date.now();
  let nextDue = Infinity;
  for (const q of questions) {
    const p = progById.get(q.id);
    if (p && p.nextDue && p.nextDue > now && p.nextDue < nextDue) nextDue = p.nextDue;
  }
  const when = nextDue !== Infinity
    ? relativeDay(nextDue - now)
    : "—";

  const heading = filter ? `Done — ${filter.label}` : "Done for today";
  mount.appendChild(el("div", { class: "empty-state" },
    el("h3", { text: heading + " ✓" }),
    el("p", { class: "muted", text: filter
      ? `Run a different subject from the picker, or come back when more are due (${when}).`
      : `Next card due ${when}.` }),
    (() => { const b = el("button", { class: "btn", text: "Pick another subject" });
             b.addEventListener("click", () => { location.hash = "#flashcards"; });
             return b; })(),
    (() => { const b = el("button", { class: "btn btn-ghost", text: "Back to dashboard" });
             b.addEventListener("click", () => { location.hash = "#dashboard"; });
             return b; })(),
  ));
}

function renderSubjectPicker({ mount, ctx, bibId, questions, progById, bibRefs }) {
  const { el } = ctx;

  // Selected sets — held in closure for the lifetime of the picker
  const selectedRefs = new Set();
  const selectedTopics = new Set();

  // Compute counts for each subject card
  const now = Date.now();
  const dueCount = questions.filter((q) => {
    const p = progById.get(q.id);
    return p && isDue(p, now);
  }).length;
  const newCount = questions.filter((q) => !progById.has(q.id)).length;
  const weakCount = questions.filter((q) => {
    const p = progById.get(q.id);
    return p && (p.ease ?? 2.5) < 2.4;
  }).length;

  // Topics + ref counts
  const topicSet = new Set();
  for (const q of questions) for (const t of q.topics || []) topicSet.add(t);
  const topics = Array.from(topicSet).sort();
  const refCounts = new Map();
  const topicCounts = new Map();
  for (const q of questions) {
    const r = q.sourceRef || (q.refs && q.refs[0]) || null;
    if (r) refCounts.set(r, (refCounts.get(r) || 0) + 1);
    for (const t of q.topics || []) topicCounts.set(t, (topicCounts.get(t) || 0) + 1);
  }
  const refsWithCards = bibRefs
    .map((r) => ({ ...r, cardCount: refCounts.get(r.id) || 0 }))
    .filter((r) => r.cardCount > 0)
    .sort((a, b) => b.cardCount - a.cardCount);

  mount.appendChild(el("h2", { text: "Pick a subject to drill" }));
  mount.appendChild(el("p", { class: "muted",
    text: "Click any reference or topic below to add it to your selection. Click again to remove. Pick the quick-start cards for an immediate single-mode session." }));

  const grid = el("div", { class: "dash-grid", style: "margin-bottom: 18px;" });

  // Quick-start cards (still single-click — these are modes, not subjects to combine)
  const quick = [
    { kind: "all", label: "All cards", count: questions.length, sub: "every question in this Bib", btn: "Study all" },
    { kind: "due", label: "Due now", count: dueCount, sub: "ready for review", btn: "Review due", disabled: dueCount === 0 },
    { kind: "new", label: "New cards", count: newCount, sub: "not yet seen", btn: "Start new" },
    { kind: "weak", label: "Weak areas", count: weakCount, sub: "lowest ease, hardest for you", btn: "Drill weak", disabled: weakCount === 0 },
  ];
  for (const q of quick) {
    const card = el("div", { class: "card" });
    card.appendChild(el("div", { class: "card-label", text: q.label }));
    const m = el("div", { class: "card-metric" });
    m.appendChild(document.createTextNode(String(q.count)));
    m.appendChild(el("span", { class: "sub", text: q.sub }));
    card.appendChild(m);
    const b = el("button", { class: "btn", text: q.btn + " →" });
    b.disabled = !!q.disabled || q.count === 0;
    b.addEventListener("click", () => { location.hash = `#flashcards/${q.kind}`; });
    card.appendChild(b);
    grid.appendChild(card);
  }
  mount.appendChild(grid);

  // -------- Selection bar (fixed-position bottom) --------
  const selBar = el("div", { class: "selection-bar", hidden: true });
  const selSummary = el("div", { class: "sel-summary" });
  const selButtons = el("div", { class: "sel-actions" });
  const clearBtn = el("button", { class: "btn btn-ghost btn-sm", text: "Clear" });
  const drillBtn = el("button", { class: "btn", text: "Drill randomized →" });
  selButtons.appendChild(clearBtn);
  selButtons.appendChild(drillBtn);
  selBar.appendChild(selSummary);
  selBar.appendChild(selButtons);
  mount.appendChild(selBar);

  function unionCardCount() {
    // Count distinct card IDs that match any selected ref or topic
    const matched = new Set();
    for (const q of questions) {
      let hit = false;
      if (selectedRefs.size) {
        if (selectedRefs.has(q.sourceRef)) hit = true;
        else if ((q.refs || []).some((r) => selectedRefs.has(r))) hit = true;
      }
      if (!hit && selectedTopics.size) {
        if ((q.topics || []).some((t) => selectedTopics.has(t))) hit = true;
      }
      if (hit) matched.add(q.id);
    }
    return matched.size;
  }

  function updateSelectionBar() {
    const total = selectedRefs.size + selectedTopics.size;
    if (total === 0) {
      selBar.hidden = true;
      return;
    }
    selBar.hidden = false;
    const cardCount = unionCardCount();
    const parts = [];
    if (selectedRefs.size)   parts.push(`${selectedRefs.size} ref${selectedRefs.size === 1 ? "" : "s"}`);
    if (selectedTopics.size) parts.push(`${selectedTopics.size} topic${selectedTopics.size === 1 ? "" : "s"}`);
    selSummary.textContent = `${parts.join(" + ")} selected · ${cardCount} card${cardCount === 1 ? "" : "s"}`;
    drillBtn.disabled = cardCount === 0;
  }

  clearBtn.addEventListener("click", () => {
    selectedRefs.clear();
    selectedTopics.clear();
    // Reset visual state on all toggles
    mount.querySelectorAll(".ref-row.is-selected").forEach((r) => r.classList.remove("is-selected"));
    mount.querySelectorAll(".chip-action.is-selected").forEach((c) => c.classList.remove("is-selected"));
    updateSelectionBar();
  });

  drillBtn.addEventListener("click", () => {
    const payload = {
      refs: Array.from(selectedRefs),
      topics: Array.from(selectedTopics),
    };
    try { sessionStorage.setItem(MULTI_KEY, JSON.stringify(payload)); } catch {}
    location.hash = "#flashcards/multi";
  });

  // -------- By reference --------
  if (refsWithCards.length) {
    mount.appendChild(el("h3", { text: "By reference" }));
    mount.appendChild(el("p", { class: "muted", style: "font-size:0.9em",
      text: "Click to toggle. Selected references appear in the bar below." }));
    const refList = el("div", { class: "ref-list" });
    for (const r of refsWithCards) {
      const row = el("div", { class: "ref-row", "data-ref-id": r.id, role: "button", "aria-pressed": "false", tabindex: "0" },
        el("div", { class: "id mono", text: r.id }),
        el("div", {},
          el("div", { class: "title", text: r.title || r.id }),
          r.studyTopics ? el("div", { class: "muted", style: "font-size:0.85em", text: "📖 " + r.studyTopics }) : null,
        ),
        el("div", { class: "badges" }, el("span", { class: "badge", text: `${r.cardCount} Qs` })),
      );
      const toggleRef = () => {
        if (selectedRefs.has(r.id)) {
          selectedRefs.delete(r.id);
          row.classList.remove("is-selected");
          row.setAttribute("aria-pressed", "false");
        } else {
          selectedRefs.add(r.id);
          row.classList.add("is-selected");
          row.setAttribute("aria-pressed", "true");
        }
        updateSelectionBar();
      };
      row.addEventListener("click", toggleRef);
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleRef(); }
      });
      refList.appendChild(row);
    }
    mount.appendChild(refList);
  }

  // -------- By topic --------
  if (topics.length) {
    mount.appendChild(el("h3", { style: "margin-top:18px", text: "By topic" }));
    mount.appendChild(el("p", { class: "muted", style: "font-size:0.9em",
      text: "Click any chip to add the topic. Click again to remove." }));
    const topicChips = el("div", { class: "chip-row", style: "margin-bottom: 90px;" }); // bottom margin reserves space for the fixed bar
    for (const t of topics) {
      const tc = topicCounts.get(t) || 0;
      const c = el("button", { class: "chip chip-action", type: "button",
        title: `Flashcards on ${topicLabel(t)} (${tc} ${tc === 1 ? "card" : "cards"})` });
      // Two-piece label: name + count badge
      const lbl = el("span", { text: topicLabel(t) });
      const cnt = el("span", { class: "chip-count", text: String(tc) });
      c.appendChild(lbl);
      c.appendChild(cnt);
      const toggleTopic = () => {
        if (selectedTopics.has(t)) {
          selectedTopics.delete(t);
          c.classList.remove("is-selected");
          c.setAttribute("aria-pressed", "false");
        } else {
          selectedTopics.add(t);
          c.classList.add("is-selected");
          c.setAttribute("aria-pressed", "true");
        }
        updateSelectionBar();
      };
      c.addEventListener("click", toggleTopic);
      topicChips.appendChild(c);
    }
    mount.appendChild(topicChips);
  }
}

function relativeDay(ms) {
  const days = Math.round(ms / DAY_MS);
  if (days <= 0) return "shortly";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
