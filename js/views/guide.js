/* =========================================================================
   Study Guide view.
     #guide                    — index of guides for the active Bib
     #guide/<refId>            — load data/bibs/<bibId>/study-guides/<refId>.md
     #guide/<refId>/<anchor>   — same + scroll to the section anchor
   Guides are markdown on disk (shipped with the Bib). Highly verbose by spec.
   ========================================================================= */

import { mdRender, slugify } from "../markdown.js";
import { db } from "../db.js";

export async function render(mount, ctx) {
  const { el, clear, bibs, toast, params } = ctx;
  clear(mount);

  const active = bibs.active();
  if (!active) {
    mount.appendChild(el("p", { class: "empty-state muted", text: "No Bib active." }));
    return;
  }
  const bibId = active.id;
  const refs = await bibs.refs(bibId);

  const refId = params[0] ? decodeURIComponent(params[0]) : null;
  const anchor = params[1] ? decodeURIComponent(params[1]) : null;

  if (!refId) return renderIndex();

  return await renderGuide(refId, anchor);

  /* ---------- Index of guides (mirrors reference coverage) ---------- */

  async function renderIndex() {
    mount.appendChild(el("h2", { text: `Library - ${active.rating} ${active.paygrade}` }));
    mount.appendChild(el("p", { class: "muted", text: "Verbose, readable study guides for each Bib reference. Every question in the app links back to one of these sections. Use the search and chips to find what to study next." }));

    const [questions, notes] = await Promise.all([
      db.getAllByIndex("questions", "byBib", IDBKeyRange.only(bibId)),
      db.getAllByIndex("notes", "byBib", IDBKeyRange.only(bibId)),
    ]);
    const cardCountByRef = new Map();
    for (const q of questions) {
      const ids = new Set();
      if (q.sourceRef) ids.add(q.sourceRef);
      for (const r of (q.refs || [])) ids.add(r);
      for (const id of ids) cardCountByRef.set(id, (cardCountByRef.get(id) || 0) + 1);
    }
    const notesByRef = new Map(notes.map((n) => [n.refId, n]));

    const guideAvail = new Map();
    await Promise.all(refs.map(async (r) => {
      const path = bibs.guidePath(bibId, r.id);
      try {
        const res = await fetch(path, { method: "HEAD" });
        guideAvail.set(r.id, res.ok);
      } catch {
        guideAvail.set(r.id, false);
      }
    }));

    const available = refs.filter((r) => guideAvail.get(r.id));
    const missing = refs.filter((r) => !guideAvail.get(r.id));

    // Coverage chips
    const summary = el("div", { class: "setup-summary", style: "margin: 6px 0 12px;" },
      el("span", {}, el("span", { class: "k", text: "Available: " }), el("span", { class: "v", text: String(available.length) })),
      el("span", {}, el("span", { class: "k", text: "Not yet written: " }), el("span", { class: "v", text: String(missing.length) })),
      el("span", {}, el("span", { class: "k", text: "Total refs: " }), el("span", { class: "v", text: String(refs.length) })),
    );
    mount.appendChild(summary);

    // Filter + search bar
    const search = el("input", { type: "search", "aria-label": "Search guides",
      placeholder: "Search title, ID, or scope...",
      style: "flex: 1 1 280px; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font-family: inherit; font-size: inherit;" });
    const showMissing = el("label", { style: "font-size: 0.9em; display: inline-flex; align-items: center; gap: 6px; text-transform: none;" });
    const cb = el("input", { type: "checkbox", checked: true });
    showMissing.appendChild(cb);
    showMissing.appendChild(document.createTextNode("Show guides that aren't written yet"));
    const bar = el("div", { class: "row", style: "gap: 12px; margin-bottom: 10px;" }, search, showMissing);
    mount.appendChild(bar);

    const list = el("div");
    mount.appendChild(list);

    function apply() {
      while (list.firstChild) list.removeChild(list.firstChild);
      const q = search.value.trim().toLowerCase();
      const matches = (r) => !q || [r.id, r.title || "", r.studyTopics || ""].join(" ").toLowerCase().includes(q);

      const avail = available.filter(matches);
      if (avail.length) {
        list.appendChild(el("h3", { text: `Ready to read (${avail.length})` }));
        const lst = el("div", { class: "ref-list" });
        for (const r of sortByTitle(avail)) lst.appendChild(renderGuideRow(r, true));
        list.appendChild(lst);
      }
      if (cb.checked) {
        const miss = missing.filter(matches);
        if (miss.length) {
          list.appendChild(el("h3", { style: "margin-top:22px", text: `Not yet written (${miss.length})` }));
          list.appendChild(el("p", { class: "muted", style: "font-size:0.9em; margin-top:-6px;",
            text: "These references still need a study guide. Per the 4-phase pipeline, each guide is written from the actual source material or a verified free alternative - not generated from general knowledge." }));
          const lst = el("div", { class: "ref-list" });
          for (const r of sortByTitle(miss)) lst.appendChild(renderGuideRow(r, false));
          list.appendChild(lst);
        }
      }
      if (!list.firstChild) list.appendChild(el("p", { class: "muted", text: "No guides match. Clear the search or include the not-yet-written set." }));
    }
    search.addEventListener("input", apply);
    cb.addEventListener("change", apply);
    apply();

    function renderGuideRow(r, ready) {
      const cardCount = cardCountByRef.get(r.id) || 0;
      const hasNotes = notesByRef.has(r.id);
      const row = el("div", { class: "ref-row", style: ready ? "" : "opacity: 0.7;",
                              role: "link", tabindex: ready ? "0" : "-1",
                              "aria-label": `${r.id}, ${r.title || r.id}, ${ready ? "guide ready" : "guide not written"}, ${cardCount} questions` },
        el("div", { class: "id mono", text: r.id }),
        el("div", {},
          el("div", { class: "title", text: r.title || r.id }),
          r.studyTopics ? el("div", { class: "study-scope", text: "Scope: " + r.studyTopics }) : null,
        ),
        el("div", { class: "badges" },
          ready ? el("span", { class: "badge ok", text: "guide ready" }) : el("span", { class: "badge", text: "not written" }),
          cardCount ? el("span", { class: "badge", text: `${cardCount} Q${cardCount === 1 ? "" : "s"}` }) : el("span", { class: "badge warn", text: "no cards" }),
          hasNotes ? el("span", { class: "badge", text: "notes" }) : null,
        ),
      );
      if (ready) {
        const go = () => { location.hash = `#guide/${encodeURIComponent(r.id)}`; };
        row.addEventListener("click", go);
        row.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
        });
      }
      return row;
    }
  }

  /* ---------- Single-guide view ---------- */

  async function renderGuide(refId, anchor) {
    const ref = refs.find((r) => r.id === refId);
    if (!ref) {
      mount.appendChild(el("div", { class: "empty-state" },
        el("h3", { text: `Reference not found: ${refId}` }),
        (() => { const b = el("button", { class: "btn btn-ghost", text: "Back to guide index" });
                 b.addEventListener("click", () => { location.hash = "#guide"; });
                 return b; })(),
      ));
      return;
    }

    const path = bibs.guidePath(bibId, refId);
    let md = null;
    try {
      const res = await fetch(path);
      if (res.ok) md = await res.text();
    } catch {}

    const back = el("button", { class: "btn btn-ghost btn-sm", text: "← Guide index" });
    back.addEventListener("click", () => { location.hash = "#guide"; });
    mount.appendChild(back);

    if (!md) {
      mount.appendChild(el("h2", { style: "margin-top:12px", text: ref.title || refId }));
      mount.appendChild(el("div", { class: "muted", text: [refId, ref.type].filter(Boolean).join(" · ") }));
      if (ref.studyTopics) {
        mount.appendChild(el("div", { class: "study-scope-box" },
          el("div", { class: "label", text: "Bib study scope" }),
          el("div", { class: "scope-text", text: ref.studyTopics }),
        ));
      }
      mount.appendChild(el("div", { class: "empty-state" },
        el("h3", { text: "No study guide yet for this reference" }),
        el("p", { class: "muted", text: `Expected at ${path}. Ask Claude to build it: "Build a highly verbose study guide for ${refId} following the 4-phase pipeline."` }),
      ));
      return;
    }

    // Split view: main content + sticky TOC sidebar
    const shell = el("div", { class: "guide-shell" });
    const main  = el("article", { class: "guide-main" });
    const aside = el("aside", { class: "guide-toc" });
    shell.appendChild(main);
    shell.appendChild(aside);
    mount.appendChild(shell);

    // Header (ref info + scope)
    main.appendChild(el("h2", { text: ref.title || refId }));
    main.appendChild(el("div", { class: "muted", text: [refId, ref.type].filter(Boolean).join(" · ") }));
    if (ref.studyTopics) {
      main.appendChild(el("div", { class: "study-scope-box" },
        el("div", { class: "label", text: "Bib study scope" }),
        el("div", { class: "scope-text", text: ref.studyTopics }),
      ));
    }

    // Drill-this action row — sticky at the top while reading the guide
    const drillRow = el("div", { class: "guide-drill-sticky", role: "toolbar", "aria-label": "Drill actions for this reference" });
    drillRow.appendChild(el("span", { class: "muted", style: "font-size:0.82em; margin-right:6px;", text: "On this ref:" }));
    const flashBtn = el("button", { class: "btn btn-sm", text: "Drill flashcards" });
    flashBtn.addEventListener("click", () => {
      location.hash = `#flashcards/ref:${encodeURIComponent(refId)}`;
    });
    const quizBtn = el("button", { class: "btn btn-ghost btn-sm", text: "Quiz" });
    quizBtn.addEventListener("click", () => {
      location.hash = `#quiz/ref:${encodeURIComponent(refId)}`;
    });
    const refBtn = el("a", { class: "btn btn-ghost btn-sm", href: `#references/${encodeURIComponent(refId)}`, text: "Reference detail" });
    drillRow.appendChild(flashBtn);
    drillRow.appendChild(quizBtn);
    drillRow.appendChild(refBtn);
    main.appendChild(drillRow);

    // Rendered markdown. The bibId context lets the renderer resolve
    // `images/...` and `references/...` paths into the content-base Bib.
    const body = el("div", { class: "guide-body" });
    body.appendChild(mdRender(md, { bibId: bibs.contentBaseBibId(bibId) }));
    main.appendChild(body);

    // Build TOC from the headings we just rendered
    const headings = body.querySelectorAll("h2, h3");
    if (headings.length) {
      aside.appendChild(el("div", { class: "label", text: "Contents" }));
      const ul = el("ul");
      for (const h of headings) {
        const level = h.tagName === "H2" ? "l2" : "l3";
        const li = el("li", { class: level });
        const a = document.createElement("a");
        a.href = `#guide/${encodeURIComponent(refId)}/${encodeURIComponent(h.id)}`;
        a.textContent = h.textContent;
        a.addEventListener("click", (e) => {
          e.preventDefault();
          location.hash = a.getAttribute("href");
          h.scrollIntoView({ behavior: "smooth", block: "start" });
          flashHighlight(h);
        });
        li.appendChild(a);
        ul.appendChild(li);
      }
      aside.appendChild(ul);
    }

    // Jump to anchor if present
    if (anchor) {
      const target = body.querySelector("#" + CSS.escape(anchor)) || body.querySelector("[id='" + anchor + "']");
      if (target) {
        requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: "auto", block: "start" });
          flashHighlight(target);
        });
      }
    }
  }
}

function sortByTitle(list) {
  return list.slice().sort((a, b) => (a.title || a.id).localeCompare(b.title || b.id));
}

function flashHighlight(el) {
  el.classList.add("guide-flash");
  setTimeout(() => el.classList.remove("guide-flash"), 1800);
}

/* Helper to build a source-link from a question record — exported so
   flashcards/quiz/exam views can render a consistent "View source →" button. */
export function sourceHref(q) {
  const ref = q.sourceRef || (Array.isArray(q.refs) && q.refs[0]);
  if (!ref) return null;
  const section = q.sourceSection ? "/" + encodeURIComponent(q.sourceSection) : "";
  return `#guide/${encodeURIComponent(ref)}${section}`;
}

export function renderSourceLink(el, q) {
  const href = sourceHref(q);
  if (!href) return null;
  const a = document.createElement("a");
  a.className = "btn btn-ghost btn-sm source-link";
  a.href = href;
  a.textContent = "View source →";
  a.title = "Jump to the study-guide section this question came from";
  return a;
}
