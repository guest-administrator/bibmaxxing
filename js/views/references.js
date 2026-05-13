/* =========================================================================
   References view — canonical Bib coverage map.
     #references           — list view with filters + search + coverage summary
     #references/<refId>   — detail view with notes editor
   ========================================================================= */

import { db } from "../db.js";
import { mdRender } from "../markdown.js";

const AVAIL_LABELS = {
  "public-downloaded": { label: "Downloaded",        badge: "ok"      },
  "public-online":     { label: "Public online",     badge: "ok"      },
  "public-missing":    { label: "Public - missing",  badge: "missing" },
  "needs-user":        { label: "Needs you",         badge: "warn"    },
  "cui-fouo":          { label: "CUI / FOUO",        badge: "locked"  },
  "classified":        { label: "Classified",        badge: "locked"  },
  "restricted":        { label: "Restricted",        badge: "locked"  },
  "missing":           { label: "Missing",           badge: "missing" },
};

// Cache HEAD-checked guide availability so filters don't re-fetch on each apply.
// Bib-scoped: switching Bibs must never reuse another Bib's results.
const guideAvailCache = new Map(); // Map<bibId, Map<refId, boolean>>

export async function render(mount, ctx) {
  const { el, clear, bibs, toast, params } = ctx;
  clear(mount);

  const active = bibs.active();
  if (!active) {
    mount.appendChild(el("p", { class: "empty-state muted", text: "No Bib active." }));
    return;
  }
  const bibId = active.id;

  const [refs, questions, notes] = await Promise.all([
    bibs.refs(bibId),
    db.getAllByIndex("questions", "byBib", IDBKeyRange.only(bibId)),
    db.getAllByIndex("notes", "byBib", IDBKeyRange.only(bibId)),
  ]);
  const qByRef = groupByRef(questions);
  const notesByRef = new Map(notes.map((n) => [n.refId, n]));

  // Probe guides up-front (parallel HEAD requests) so filter toggles are instant.
  // Per-Bib cache: ensures switching Bibs cannot reuse another Bib's results.
  let bibGuideCache = guideAvailCache.get(bibId);
  if (!bibGuideCache) {
    bibGuideCache = new Map();
    await Promise.all(refs.map(async (r) => {
      const path = bibs.guidePath(bibId, r.id);
      try {
        const res = await fetch(path, { method: "HEAD" });
        bibGuideCache.set(r.id, res.ok);
      } catch {
        bibGuideCache.set(r.id, false);
      }
    }));
    guideAvailCache.set(bibId, bibGuideCache);
  }

  if (params[0]) {
    return renderDetail(params[0]);
  }

  renderList();

  function renderList() {
    clear(mount);
    mount.appendChild(el("h2", { text: `References - ${active.rating} ${active.paygrade}` }));
    mount.appendChild(el("p", { class: "muted", style: "margin-top:-6px;",
      text: `Cycle ${active.cycle}. Canonical Bib coverage map: every reference, with study scope, availability, card count, guide status, and your notes. Search and filter to find weak coverage fast.` }));

    // Coverage summary chips
    const counts = computeCounts(refs, qByRef, notesByRef, bibGuideCache);
    const summary = el("div", { class: "setup-summary", style: "margin: 6px 0 14px;" });
    summary.appendChild(metric(el, "Total", counts.total));
    summary.appendChild(metric(el, "With cards", counts.withCards));
    summary.appendChild(metric(el, "With guide", counts.withGuide));
    summary.appendChild(metric(el, "Downloaded", counts.downloaded));
    summary.appendChild(metric(el, "Needs user", counts.needsUser));
    summary.appendChild(metric(el, "Restricted", counts.restricted));
    mount.appendChild(summary);

    // Top control bar: search + status select
    const search = el("input", {
      type: "search",
      "aria-label": "Search references",
      placeholder: "Search title, ID, study scope, type, or status...",
      style: "flex: 1 1 280px; min-width: 200px; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font-family: inherit; font-size: inherit;"
    });
    const availSel = el("select", { "aria-label": "Filter by status" });
    availSel.appendChild(el("option", { value: "", text: "All statuses" }));
    for (const k of Object.keys(AVAIL_LABELS)) {
      availSel.appendChild(el("option", { value: k, text: AVAIL_LABELS[k].label }));
    }
    const bar = el("div", { class: "row", style: "gap: 8px; margin-bottom: 10px;" }, search, availSel);
    mount.appendChild(bar);

    // Filter chip row — coverage shortcuts
    const filters = {
      hasCards: false,
      noCards: false,
      hasNotes: false,
      hasGuide: false,
      noGuide: false,
      needsUser: false,
      restricted: false,
      downloaded: false,
    };
    const chipRow = el("div", { class: "chip-row", style: "margin-bottom: 14px;" });
    const chipDefs = [
      { key: "hasCards",   label: "Has cards" },
      { key: "noCards",    label: "No cards yet" },
      { key: "hasGuide",   label: "Has study guide" },
      { key: "noGuide",    label: "Guide missing" },
      { key: "hasNotes",   label: "Has notes" },
      { key: "downloaded", label: "Downloaded" },
      { key: "needsUser",  label: "Needs user" },
      { key: "restricted", label: "Restricted" },
    ];
    for (const d of chipDefs) {
      const c = el("button", { class: "chip chip-action", type: "button", "aria-pressed": "false", text: d.label });
      c.addEventListener("click", () => {
        filters[d.key] = !filters[d.key];
        c.classList.toggle("is-selected", filters[d.key]);
        c.setAttribute("aria-pressed", filters[d.key] ? "true" : "false");
        apply();
      });
      chipRow.appendChild(c);
    }
    mount.appendChild(chipRow);

    const resultsLabel = el("div", { class: "muted", style: "font-size: 0.85em; margin-bottom: 6px;", "aria-live": "polite" });
    mount.appendChild(resultsLabel);

    const list = el("div", { class: "ref-list" });
    mount.appendChild(list);

    function apply() {
      const q = search.value.trim().toLowerCase();
      const a = availSel.value;
      while (list.firstChild) list.removeChild(list.firstChild);
      let shown = 0;
      for (const r of refs) {
        const cardCount = qByRef.get(r.id)?.length || 0;
        const hasGuide = !!bibGuideCache.get(r.id);
        const hasNotes = notesByRef.has(r.id);

        if (q && !matchesSearch(r, q, cardCount, hasGuide, hasNotes)) continue;
        if (a && r.availability !== a) continue;
        if (filters.hasCards && cardCount === 0) continue;
        if (filters.noCards && cardCount > 0) continue;
        if (filters.hasNotes && !hasNotes) continue;
        if (filters.hasGuide && !hasGuide) continue;
        if (filters.noGuide && hasGuide) continue;
        if (filters.downloaded && r.availability !== "public-downloaded" && r.availability !== "public-online") continue;
        if (filters.needsUser && r.availability !== "needs-user") continue;
        if (filters.restricted && !["cui-fouo", "classified", "restricted"].includes(r.availability)) continue;
        list.appendChild(renderRow(r, cardCount, hasGuide, hasNotes));
        shown++;
      }
      resultsLabel.textContent = `Showing ${shown} of ${refs.length} references`;
      if (shown === 0) list.appendChild(el("p", { class: "muted", text: "No references match. Clear filters or broaden the search." }));
    }

    search.addEventListener("input", apply);
    availSel.addEventListener("change", apply);
    apply();
  }

  function matchesSearch(r, q, cardCount, hasGuide, hasNotes) {
    const haystack = [
      r.id,
      r.title || "",
      r.type || "",
      r.studyTopics || "",
      r.availability || "",
      AVAIL_LABELS[r.availability]?.label || "",
      cardCount > 0 ? "has cards" : "no cards",
      hasGuide ? "has guide" : "no guide",
      hasNotes ? "notes" : "",
    ].join(" ").toLowerCase();
    return haystack.includes(q);
  }

  function renderRow(r, cardCount, hasGuide, hasNotes) {
    const avail = AVAIL_LABELS[r.availability] || { label: r.availability || "unknown", badge: "" };

    const row = el("div", { class: "ref-row", role: "link", tabindex: "0",
                            "aria-label": `${r.id}, ${r.title || r.id}, ${avail.label}, ${cardCount} questions, ${hasGuide ? "study guide ready" : "no study guide"}` },
      el("div", { class: "id mono", text: r.id }),
      el("div", {},
        el("div", { class: "title", text: r.title || r.id }),
        el("div", { class: "muted", style: "font-size:0.85em", text: [r.type, avail.label].filter(Boolean).join(" / ") }),
        r.studyTopics ? el("div", { class: "study-scope", text: "Scope: " + r.studyTopics }) : null,
      ),
      el("div", { class: "badges" },
        el("span", { class: "badge " + avail.badge, text: avail.label }),
        r.editionMatch === "strict" ? el("span", { class: "badge warn", text: "strict ed." }) : null,
        Array.isArray(r.alternatives) && r.alternatives.length ? el("span", { class: "badge ok", text: `${r.alternatives.length} free alt${r.alternatives.length === 1 ? "" : "s"}` }) : null,
        cardCount ? el("span", { class: "badge", text: `${cardCount} Q${cardCount === 1 ? "" : "s"}` }) : el("span", { class: "badge warn", text: "no cards" }),
        hasGuide ? el("span", { class: "badge ok", text: "guide" }) : el("span", { class: "badge", text: "no guide" }),
        hasNotes ? el("span", { class: "badge", text: "notes" }) : null,
      ),
    );
    const go = () => { location.hash = `#references/${encodeURIComponent(r.id)}`; };
    row.addEventListener("click", go);
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
    });
    return row;
  }

  /* ---------- Detail view ---------- */

  async function renderDetail(refId) {
    const r = refs.find((x) => x.id === decodeURIComponent(refId));
    if (!r) {
      mount.appendChild(el("p", { class: "empty-state muted", text: "Reference not found in this Bib." }));
      return;
    }
    clear(mount);

    const back = el("button", { class: "btn btn-ghost btn-sm", text: "Back to all references" });
    back.addEventListener("click", () => { location.hash = "#references"; });
    mount.appendChild(back);

    mount.appendChild(el("h2", { style: "margin-top:10px", text: r.title || r.id }));
    mount.appendChild(el("div", { class: "muted", text: [r.id, r.type, (AVAIL_LABELS[r.availability]?.label || r.availability)].filter(Boolean).join(" / ") }));
    if (r.isbn) mount.appendChild(el("div", { class: "muted mono", style: "font-size:0.9em;", text: "ISBN " + r.isbn }));

    if (r.studyTopics) {
      mount.appendChild(el("div", { class: "study-scope-box" },
        el("div", { class: "label", text: "Study scope from the Bib" }),
        el("div", { class: "scope-text", text: r.studyTopics }),
      ));
    }

    if (r.editionMatch === "strict") {
      mount.appendChild(el("div", { class: "edition-warn" },
        el("strong", { text: "Match this edition exactly." }),
        el("span", { text: " Cert objectives changed between editions - newer versions cover different material than what the Bib tests." }),
      ));
    }

    if (r.note) {
      mount.appendChild(el("p", { class: "muted", style: "margin:6px 0 0; font-style:italic;", text: r.note }));
    }

    if (Array.isArray(r.alternatives) && r.alternatives.length) {
      const box = el("div", { class: "alternatives-box" });
      box.appendChild(el("h3", { text: "Free / adjacent sources covering the same study scope" }));
      box.appendChild(el("p", { class: "muted", style: "margin:0 0 8px;", text: "Use these when the Bib-listed source isn't obtainable. They're free, authoritative, and cover the specific study topics the Bib calls out." }));
      const ul = el("div", { class: "alt-list" });
      for (const a of r.alternatives) {
        const row = el("div", { class: "alt-item" },
          el("div", { class: "alt-coverage", text: "Covers: " + a.coverage }),
          (() => {
            const link = el("a", { href: a.url, target: "_blank", rel: "noopener", class: "alt-title" });
            link.textContent = a.title;
            return link;
          })(),
          a.kind ? el("span", { class: "alt-kind chip", text: a.kind }) : null,
          a.note ? el("div", { class: "muted", style: "font-size:0.88em; margin-top:2px;", text: a.note }) : null,
        );
        ul.appendChild(row);
      }
      box.appendChild(ul);
      mount.appendChild(box);
    }

    const actionRow = el("div", { class: "row", style: "margin:14px 0; gap: 8px;" });
    const hasGuide = !!bibGuideCache.get(r.id);
    if (hasGuide) {
      actionRow.appendChild(el("a", { class: "btn", href: `#guide/${encodeURIComponent(r.id)}`, text: "Study guide" }));
    } else {
      actionRow.appendChild(el("span", { class: "muted", text: "(no study guide written yet for this ref)" }));
    }
    if ((qByRef.get(r.id)?.length || 0) > 0) {
      actionRow.appendChild(el("a", { class: "btn btn-ghost", href: `#flashcards/ref:${encodeURIComponent(r.id)}`, text: "Drill flashcards" }));
      actionRow.appendChild(el("a", { class: "btn btn-ghost", href: `#quiz/ref:${encodeURIComponent(r.id)}`, text: "Quiz" }));
    }
    if (r.availability === "public-downloaded" && r.localPath) {
      const href = encodeURI(bibs.referencePath(bibId, r.localPath));
      actionRow.appendChild(el("a", { class: "btn btn-ghost", href, target: "_blank", rel: "noopener", text: "Open PDF" }));
    } else if (r.sourceUrl) {
      actionRow.appendChild(el("a", { class: "btn btn-ghost", href: r.sourceUrl, target: "_blank", rel: "noopener", text: "Open source URL" }));
    }
    mount.appendChild(actionRow);

    // Restriction / source-needed banner
    if (r.availability === "needs-user") {
      mount.appendChild(el("div", { class: "banner", role: "note" },
        el("strong", { text: "Needs user supply." }),
        el("span", { text: "  This reference cannot be redistributed with Bibmaxxing. Acquire the PDF (CAC site / library / publisher) and drop it at the localPath in this Bib's references/ folder." }),
      ));
    } else if (r.availability === "cui-fouo" || r.availability === "classified" || r.availability === "restricted") {
      mount.appendChild(el("div", { class: "banner", role: "note" },
        el("strong", { text: "Restricted content." }),
        el("span", { text: "  Obtain through official channels. The file is not shipped with the app. The study guide and questions reflect only the Bib's stated scope, not the source text." }),
      ));
    }

    /* Notes editor with live preview toggle + debounced save */

    const notesRow = notesByRef.get(r.id);
    const textarea = el("textarea", { class: "notes-editor", placeholder: "Your markdown notes for this reference...", "aria-label": "Notes for this reference" });
    textarea.value = notesRow?.markdown || "";

    const preview = el("div", { class: "notes-preview" });
    function repaintPreview() {
      while (preview.firstChild) preview.removeChild(preview.firstChild);
      preview.appendChild(mdRender(textarea.value));
    }
    repaintPreview();

    let showPreview = false;
    const toggleBtn = el("button", { class: "btn btn-ghost btn-sm", text: "Preview", "aria-pressed": "false" });
    toggleBtn.addEventListener("click", () => {
      showPreview = !showPreview;
      textarea.classList.toggle("hidden", showPreview);
      preview.classList.toggle("hidden", !showPreview);
      toggleBtn.textContent = showPreview ? "Edit" : "Preview";
      toggleBtn.setAttribute("aria-pressed", showPreview ? "true" : "false");
      if (showPreview) repaintPreview();
    });
    preview.classList.add("hidden");

    let saveTimer = null;
    textarea.addEventListener("input", () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        await db.put("notes", {
          bibId, refId: r.id,
          markdown: textarea.value,
          lastEdited: Date.now(),
        });
      }, 500);
    });

    mount.appendChild(el("h3", { text: "Your notes" }));
    mount.appendChild(el("div", { class: "row", style: "margin-bottom:8px;" }, toggleBtn));
    mount.appendChild(textarea);
    mount.appendChild(preview);

    const linked = (qByRef.get(r.id) || []);
    mount.appendChild(el("h3", { style: "margin-top:22px", text: `Linked questions (${linked.length})` }));
    if (linked.length === 0) {
      mount.appendChild(el("p", { class: "muted", text: "No questions reference this entry yet." }));
    } else {
      const list = el("div", { class: "ref-list" });
      for (const q of linked) {
        const row = el("div", { class: "ref-row", style: "grid-template-columns: 1fr auto;" },
          el("div", {},
            el("div", { text: q.stem }),
            el("div", { class: "muted", style: "font-size:0.85em",
              text: "Answer: " + q.choices[q.answer] + (q.topics?.length ? "  /  " + q.topics.join(", ") : "") }),
          ),
          (() => { const b = el("button", { class: "btn btn-ghost btn-sm", text: "Edit" });
                   b.addEventListener("click", (ev) => { ev.stopPropagation(); location.hash = `#add/edit/${encodeURIComponent(q.id)}`; });
                   return b; })(),
        );
        list.appendChild(row);
      }
      mount.appendChild(list);
    }

    const addBtn = el("button", { class: "btn", style: "margin-top:14px", text: "+ Add question for this reference" });
    addBtn.addEventListener("click", () => { location.hash = `#add/for/${encodeURIComponent(r.id)}`; });
    mount.appendChild(addBtn);
  }
}

function metric(el, label, value) {
  return el("span", {}, el("span", { class: "k", text: label + ": " }), el("span", { class: "v", text: String(value) }));
}

function computeCounts(refs, qByRef, notesByRef, guideAvail) {
  const c = { total: refs.length, withCards: 0, withGuide: 0, withNotes: 0, downloaded: 0, needsUser: 0, restricted: 0 };
  for (const r of refs) {
    if ((qByRef.get(r.id)?.length || 0) > 0) c.withCards++;
    if (guideAvail?.get(r.id)) c.withGuide++;
    if (notesByRef.has(r.id)) c.withNotes++;
    if (r.availability === "public-downloaded" || r.availability === "public-online") c.downloaded++;
    if (r.availability === "needs-user") c.needsUser++;
    if (r.availability === "cui-fouo" || r.availability === "classified" || r.availability === "restricted") c.restricted++;
  }
  return c;
}

function groupByRef(questions) {
  const map = new Map();
  for (const q of questions) {
    const refs = new Set();
    if (q.sourceRef) refs.add(q.sourceRef);
    for (const r of (q.refs || [])) refs.add(r);
    for (const r of refs) {
      if (!map.has(r)) map.set(r, []);
      map.get(r).push(q);
    }
  }
  return map;
}
