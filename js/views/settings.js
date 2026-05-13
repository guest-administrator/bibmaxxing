/* =========================================================================
   Manage view (formerly Settings): theme, active Bib, re-seed, install a new
   Bib, add/edit questions entry, export/import backup, reset local data,
   packaging guidance, and cycle freshness warnings.
   ========================================================================= */

import { db } from "../db.js";
import { theme } from "../theme.js";
import { profileSheetKey } from "../sections.js";

const BIB_CYCLE_INFO = {
  "CWT-E7": { latestCycle: "Cycle 270 / January 2026", latestSeen: "2026-01" },
};

export async function render(mount, ctx) {
  const { el, clear, bibs, toast } = ctx;
  clear(mount);

  mount.appendChild(el("h2", { text: "Manage" }));
  mount.appendChild(el("p", { class: "muted", style: "margin-top:-6px;",
    text: "Bib management, backup and restore, theme, packaging, and data integrity. Everything is local-only - no account, no cloud, no telemetry." }));

  /* ---------- Data Health / Trust panel ---------- */
  const active = bibs.active();
  if (active) {
    mount.appendChild(await renderDataHealthCard(el, ctx, active));
  }

  /* ---------- Active Bib + cycle freshness ---------- */
  const bibCard = el("div", { class: "card", style: "margin-bottom:14px;" });
  bibCard.appendChild(el("h3", { text: "Active Bib" }));
  if (active) {
    bibCard.appendChild(el("p", { text: `${active.rating} ${active.paygrade} - ${active.cycle}` }));
    bibCard.appendChild(el("p", { class: "muted mono", style: "font-size: 0.9em;", text: active.path }));
    const info = BIB_CYCLE_INFO[active.id];
    if (info && active.cycle !== info.latestCycle) {
      bibCard.appendChild(el("div", { class: "edition-warn" },
        el("strong", { text: "Cycle freshness warning." }),
        el("span", { text: ` Latest known cycle for this paygrade is ${info.latestCycle}. Install the latest Bib data pack before relying on these questions for the current cycle.` }),
      ));
    }
    const reseed = el("button", { class: "btn btn-ghost", text: "Refresh seed from questions.json" });
    reseed.addEventListener("click", async () => {
      reseed.disabled = true;
      try {
        const out = await bibs.reseed(active.id);
        toast(`Seed refreshed: +${out.added} added, ${out.updated} updated, ${out.skipped} user rows preserved`);
      } catch (e) {
        toast("Refresh failed: " + e.message, "error");
      } finally {
        reseed.disabled = false;
      }
    });
    bibCard.appendChild(reseed);
  } else {
    bibCard.appendChild(el("p", { class: "muted", text: "No Bib active." }));
  }
  mount.appendChild(bibCard);

  /* ---------- Add/edit questions ---------- */
  const addCard = el("div", { class: "card", style: "margin-bottom:14px;" });
  addCard.appendChild(el("h3", { text: "Add or edit a question" }));
  addCard.appendChild(el("p", { class: "muted",
    text: "Author user-only questions or override a seed question. User questions live in IndexedDB and survive seed refreshes. Backups include them." }));
  const addBtn = el("button", { class: "btn", text: "+ Add question" });
  addBtn.addEventListener("click", () => { location.hash = "#add"; });
  addCard.appendChild(addBtn);
  mount.appendChild(addCard);

  /* ---------- Profile sheet (per-section item counts + scores) ---------- */
  if (active) {
    mount.appendChild(await renderProfileSheetCard(el, ctx, active));
  }

  /* ---------- Theme ---------- */
  const themeCard = el("div", { class: "card", style: "margin-bottom:14px;" });
  themeCard.appendChild(el("h3", { text: "Theme" }));
  const themeRow = el("div", { class: "row", role: "radiogroup", "aria-label": "Theme preference" });
  for (const v of ["light", "dark", "system"]) {
    const b = el("button", {
      class: "btn " + (theme.setting() === v ? "" : "btn-ghost"),
      role: "radio",
      "aria-checked": theme.setting() === v ? "true" : "false",
      text: v,
    });
    b.addEventListener("click", async () => {
      await theme.set(v);
      render(mount, ctx);
    });
    themeRow.appendChild(b);
  }
  themeCard.appendChild(themeRow);
  themeCard.appendChild(el("p", { class: "muted", style: "margin-top:8px",
    text: `Currently applied: ${theme.effective()} (setting: ${theme.setting()})` }));
  mount.appendChild(themeCard);

  /* ---------- Backup / restore ---------- */
  const backupCard = el("div", { class: "card", style: "margin-bottom:14px;" });
  backupCard.appendChild(el("h3", { text: "Backup and restore (your progress)" }));
  backupCard.appendChild(el("p", { class: "muted",
    text: "Exports a single JSON file containing every IndexedDB store: progress, notes, sessions, exam attempts, settings, and any user-authored questions. This is your personal study data only - NOT the app or the Bib content. Recommended before clearing browser data or switching machines." }));

  const exportBtn = el("button", { class: "btn", text: "Export backup (.json)" });
  exportBtn.addEventListener("click", async () => {
    const data = await db.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bibmaxxing-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast("Backup downloaded");
  });

  const importInput = el("input", { type: "file", accept: ".json,application/json" });
  importInput.style.display = "none";
  importInput.addEventListener("change", async () => {
    const f = importInput.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const obj = JSON.parse(text);
      if (!obj || obj.schemaVersion == null || !obj.stores) {
        throw new Error("not a Bibmaxxing backup (expected schemaVersion + stores)");
      }
      await db.importAll(obj);
      toast("Backup imported");
    } catch (e) {
      toast("Import failed: " + e.message, "error");
    }
    importInput.value = "";
  });
  const importBtn = el("button", { class: "btn btn-ghost", text: "Import backup" });
  importBtn.addEventListener("click", () => importInput.click());

  backupCard.appendChild(el("div", { class: "row" }, exportBtn, importBtn, importInput));
  mount.appendChild(backupCard);

  /* ---------- Packaging / portability ---------- */
  const packCard = el("div", { class: "card", style: "margin-bottom:14px;" });
  packCard.appendChild(el("h3", { text: "Deploy in one click" }));
  packCard.appendChild(el("p", { class: "muted",
    text: "For a non-technical user, double-click Deploy Bibmaxxing.bat in the project folder. It builds Core/E5/E6, runs the full test/audit suite, builds redistributable ZIPs, then creates a portable folder with Run Bibmaxxing.bat." }));
  const pre = el("pre", { style: "background: var(--surface-2); padding: 10px 14px; border-radius: var(--radius-sm); overflow-x: auto; font-size: 0.88em;" });
  pre.textContent = [
    "# Easiest path:",
    "Deploy Bibmaxxing.bat",
    "",
    "# Command-line equivalent:",
    "npm run deploy",
    "",
    "# Output:",
    "dist/bibmaxxing-portable-<version>/Run Bibmaxxing.bat",
    "dist/bibmaxxing-*.zip + matching manifest files",
  ].join("\n");
  packCard.appendChild(pre);
  packCard.appendChild(el("p", { class: "muted", style: "font-size: 0.88em;",
    text: "The portable runner opens the app in the browser and enables an Exit button that shuts down the local server. Reference PDFs are only included when bib.json marks the entry redistributable: true; default deploy output excludes commercial and restricted PDFs." }));
  mount.appendChild(packCard);

  /* ---------- Install new Bib instructions ---------- */
  const installCard = el("div", { class: "card", style: "margin-bottom:14px;" });
  installCard.appendChild(el("h3", { text: "Install a new Bib" }));
  installCard.appendChild(el("p", { text: "To add another Bib (E-5, E-6, a different rating):" }));
  const ol = el("ol");
  ol.appendChild(el("li", {}, "Create a folder under ", el("code", { text: "data/bibs/" }), " (for example, ", el("code", { text: "CWT-E6" }), ")."));
  ol.appendChild(el("li", {}, "Drop in ", el("code", { text: "bib.json" }), ", ", el("code", { text: "questions.json" }), ", and ", el("code", { text: "references/" }), " from your data pack."));
  ol.appendChild(el("li", {}, "Add one entry to ", el("code", { text: "data/bibs/index.json" }), "."));
  ol.appendChild(el("li", {}, "Reload the app. The Bib selector picks it up automatically."));
  installCard.appendChild(ol);
  mount.appendChild(installCard);

  /* ---------- Data integrity check ---------- */
  const auditCard = el("div", { class: "card", style: "margin-bottom:14px;" });
  auditCard.appendChild(el("h3", { text: "Data integrity check" }));
  auditCard.appendChild(el("p", { class: "muted",
    text: "Run the Node-based audit from a terminal in the project root to catch duplicate IDs, broken references, missing study guides, or manifest drift before they cause silent issues at study time." }));
  const auditPre = el("pre", { style: "background: var(--surface-2); padding: 10px 14px; border-radius: var(--radius-sm); overflow-x: auto; font-size: 0.88em;" });
  auditPre.textContent = "npm run audit:data\nnpm run test:srs";
  auditCard.appendChild(auditPre);
  mount.appendChild(auditCard);

  /* ---------- Reset ---------- */
  const resetCard = el("div", { class: "card", style: "margin-bottom:14px; border-color: var(--danger);" });
  resetCard.appendChild(el("h3", { text: "Reset local data" }));
  resetCard.appendChild(el("p", { class: "muted", text: "Wipes every IndexedDB store (progress, notes, sessions, exam attempts, settings, user-authored questions). Seeds will reload from disk on next view. An auto-backup downloads before the wipe." }));
  const resetBtn = el("button", { class: "btn btn-danger", text: "Reset local data" });
  resetBtn.addEventListener("click", async () => {
    if (!confirm("Really reset? A backup file will download first.")) return;
    const data = await db.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bibmaxxing-pre-reset-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    await db.clearAll();
    toast("Local data cleared. Reloading...");
    setTimeout(() => location.reload(), 600);
  });
  resetCard.appendChild(resetBtn);
  mount.appendChild(resetCard);
}

async function renderDataHealthCard(el, ctx, active) {
  const { bibs } = ctx;
  const bibData = await bibs.bibData(active.id);
  const qs = await db.getAllByIndex("questions", "byBib", IDBKeyRange.only(active.id));
  const refs = bibData?.references || [];
  const objectives = bibData?.objectives || [];
  const sections = bibData?.sections || [];

  // Source-confidence buckets
  const sc = { "source-verified": 0, "public-adjacent": 0, "restricted-summary": 0, "remove-or-rewrite": 0, "(unset)": 0 };
  for (const q of qs) sc[q.sourceConfidence || "(unset)"] = (sc[q.sourceConfidence || "(unset)"] || 0) + 1;

  // Source-section-confidence buckets + low/manual queue
  const ssc = { exact: 0, high: 0, medium: 0, low: 0, "manual-needed": 0, "(unset)": 0 };
  const lowAnchors = [];
  let resolved = 0;
  for (const q of qs) {
    const tier = q.sourceSectionConfidence || "(unset)";
    ssc[tier] = (ssc[tier] || 0) + 1;
    if (tier === "low" || tier === "manual-needed") lowAnchors.push(q);
    if (q.sourceSection && tier !== "(unset)" && tier !== "manual-needed") resolved++;
  }

  // Provisional weights detection.
  const profileSheetRequired = bibData?.examType !== "core" && sections.some((s) =>
    (s.weightSource || "").toLowerCase() === "profile-sheet-required" || s.itemCount == null);
  const anyProvisional = bibData?.examType !== "core" && sections.some((s) => {
    const w = (s.weightSource || "").toLowerCase();
    return w === "" || w.startsWith("placeholder") || w.includes("example") || w === "profile-sheet-required";
  });

  // Profile-sheet active?
  const profile = await bibs.profileSheet(active.id);
  const profileActive = profile && Array.isArray(profile.sections) && profile.sections.some((s) => Number.isFinite(s.itemCount));

  const card = el("div", { class: "card data-health-card", style: "margin-bottom:14px;" });
  card.appendChild(el("h3", { text: "Data health" }));
  card.appendChild(el("p", { class: "muted", style: "margin-top:-4px;",
    text: "Snapshot of what the active Bib contains and where confidence is high vs provisional. Cached from loaded data; for a full check run `npm run audit:data` from the project root." }));

  const grid = el("div", { class: "health-grid" });
  grid.appendChild(healthRow(el, "Questions", String(qs.length)));
  grid.appendChild(healthRow(el, "References", String(refs.length)));
  grid.appendChild(healthRow(el, "Objectives", String(objectives.length)));
  grid.appendChild(healthRow(el, "Sections", String(sections.length)));
  grid.appendChild(healthRow(el, "Section anchors resolved", `${resolved} / ${qs.length}`));
  grid.appendChild(healthRow(el, "Low-confidence anchors", String(lowAnchors.length), lowAnchors.length > 0 ? "warn" : "ok"));
  grid.appendChild(healthRow(el, "Track", `${active.rating} ${active.paygrade} (${active.cycle})`));
  const weightLabel = bibData?.examType === "core"
    ? "Reference-only (not weighted)"
    : profileActive
      ? "Profile sheet active"
      : profileSheetRequired
        ? "Profile sheet required (provisional)"
        : anyProvisional
          ? "Provisional (operator example)"
          : "Operator-confirmed";
  grid.appendChild(healthRow(el, "Section weights", weightLabel,
    bibData?.examType === "core" || profileActive || !anyProvisional ? "ok" : "warn"));
  grid.appendChild(healthRow(el, "Profile sheet", profileActive ? "Active" : "Not set", profileActive ? "ok" : "warn"));
  grid.appendChild(healthRow(el, "Packaging posture", "Default packages: 0 PDFs (commercial/restricted excluded)"));
  card.appendChild(grid);

  // sourceConfidence breakdown
  const scLine = Object.entries(sc).filter(([, n]) => n > 0).map(([k, n]) => `${k}: ${n}`).join("  |  ");
  card.appendChild(el("div", { class: "muted", style: "font-size:0.85em; margin-top:8px;" },
    el("strong", { text: "sourceConfidence: " }), document.createTextNode(scLine)));
  card.appendChild(el("div", { class: "muted", style: "font-size:0.78em;" },
    document.createTextNode("Unset sourceConfidence means source-verified/default. Only explicit public-adjacent or restricted-summary values downweight readiness.")));
  const sscLine = Object.entries(ssc).filter(([, n]) => n > 0).map(([k, n]) => `${k}: ${n}`).join("  |  ");
  card.appendChild(el("div", { class: "muted", style: "font-size:0.85em;" },
    el("strong", { text: "sourceSectionConfidence: " }), document.createTextNode(sscLine)));

  // Low-confidence review queue
  if (lowAnchors.length > 0) {
    card.appendChild(el("h4", { style: "margin-top: 12px;", text: "Review queue: low-confidence source anchors" }));
    card.appendChild(el("p", { class: "muted", style: "font-size: 0.85em;",
      text: "These questions point at a guide heading that matched only weakly. View source still navigates, but may land near the right area rather than the exact heading." }));
    const tbl = el("table", { class: "data-health-queue" });
    const thead = el("thead", {});
    const htr = el("tr", {});
    for (const h of ["Question", "Source ref", "Anchor slug", "Confidence", "Action"]) {
      htr.appendChild(el("th", { text: h }));
    }
    thead.appendChild(htr);
    tbl.appendChild(thead);
    const tbody = el("tbody", {});
    for (const q of lowAnchors) {
      const tr = el("tr", {});
      tr.appendChild(el("td", { class: "mono", style: "font-size:0.85em;", text: q.id }));
      tr.appendChild(el("td", { class: "mono", style: "font-size:0.85em;", text: q.sourceRef || "-" }));
      tr.appendChild(el("td", { class: "mono", style: "font-size:0.85em;", text: q.sourceSection || "-" }));
      const tier = q.sourceSectionConfidence || "-";
      tr.appendChild(el("td", {},
        el("span", { class: "badge " + (tier === "manual-needed" ? "missing" : "warn"), text: tier }),
      ));
      const action = el("td", {});
      if (q.sourceRef && q.sourceSection) {
        const a = el("a", { class: "btn btn-ghost btn-sm",
          href: `#guide/${encodeURIComponent(q.sourceRef)}/${encodeURIComponent(q.sourceSection)}`,
          text: "View source" });
        action.appendChild(a);
      }
      tr.appendChild(action);
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
    card.appendChild(tbl);
  }

  return card;
}

function healthRow(el, label, value, status) {
  const row = el("div", { class: "health-row" });
  row.appendChild(el("span", { class: "label", text: label }));
  const rhs = el("span", { class: "row", style: "gap: 8px;" });
  rhs.appendChild(el("span", { text: value }));
  if (status) rhs.appendChild(el("span", { class: `pill ${status}`, text: status }));
  row.appendChild(rhs);
  return row;
}

async function renderProfileSheetCard(el, ctx, active) {
  const { toast, bibs } = ctx;
  const card = el("div", { class: "card", style: "margin-bottom:14px;" });
  card.appendChild(el("h3", { text: "Profile sheet (section item counts + scores)" }));

  const bibData = await bibs.bibData(active.id);
  const profile = await bibs.profileSheet(active.id);
  const sections = bibData?.sections || [];
  if (bibData?.examType === "core") {
    card.appendChild(el("p", { class: "muted", text: "CWT Core is reference-only. It does not use section item counts or profile-sheet weighting." }));
    return card;
  }
  if (sections.length === 0) {
    card.appendChild(el("p", { class: "muted", text: "Active Bib has no sections defined; nothing to enter here." }));
    return card;
  }

  // Active-state indicator: any section with a real itemCount means an
  // operator profile sheet is in play and weighted readiness uses real values.
  const active_ = profile && Array.isArray(profile.sections) && profile.sections.some((s) => Number.isFinite(s.itemCount));
  const statusBanner = el("div", { class: "profile-status-banner " + (active_ ? "is-active" : "is-default") });
  statusBanner.appendChild(el("strong", { text: active_ ? "Profile sheet ACTIVE." : "Profile sheet not set." }));
  statusBanner.appendChild(document.createTextNode(active_
    ? " Weighted readiness uses YOUR entered item counts for this Bib. Clear below to fall back to the bib.json defaults."
    : " Weighted readiness uses the operator's example item counts (provisional). Enter your real exam values below to personalize the score."));
  card.appendChild(statusBanner);

  card.appendChild(el("p", { class: "muted", style: "margin-top: 10px;",
    text: "Enter your actual exam profile sheet: how many items each section had, how many you got correct, and (optional) percentile / standing. Section weights vary by paygrade, cycle, and year - the example values shipped with this Bib are not the live cycle's numbers." }));
  card.appendChild(el("p", { class: "muted", style: "font-size: 0.85em;",
    text: "Storage: local-only. Lives in IndexedDB's `settings` store under `profile-sheet:" + active.id + "`. Backups (Manage > Export backup) round-trip it; no cloud/account/telemetry." }));

  const profileBySection = new Map((profile?.sections || []).map((s) => [s.id, s]));

  const grid = el("div", { class: "profile-grid", role: "table", "aria-label": "Profile sheet input" });
  const header = el("div", { class: "profile-row profile-row-head", role: "row" });
  header.appendChild(el("div", { role: "columnheader", text: "Section" }));
  header.appendChild(el("div", { role: "columnheader", text: "Items" }));
  header.appendChild(el("div", { role: "columnheader", text: "Correct" }));
  header.appendChild(el("div", { role: "columnheader", text: "Percentile" }));
  grid.appendChild(header);

  const fields = new Map();
  for (const s of sections) {
    const row = el("div", { class: "profile-row", role: "row" });
    row.appendChild(el("div", { role: "rowheader" },
      el("strong", { text: s.code || s.id }),
      el("div", { class: "muted", style: "font-size: 0.82em;", text: s.name }),
    ));
    const p = profileBySection.get(s.id) || {};
    const items = el("input", { type: "number", min: "0", step: "1", "aria-label": `${s.name} items`, value: p.itemCount != null ? String(p.itemCount) : (s.itemCount != null ? String(s.itemCount) : "") });
    const correct = el("input", { type: "number", min: "0", step: "1", "aria-label": `${s.name} correct`, value: p.correctCount != null ? String(p.correctCount) : "" });
    const pct = el("input", { type: "number", min: "0", max: "100", step: "1", "aria-label": `${s.name} percentile`, value: p.percentile != null ? String(p.percentile) : "" });
    row.appendChild(items);
    row.appendChild(correct);
    row.appendChild(pct);
    grid.appendChild(row);
    fields.set(s.id, { items, correct, pct });
  }
  card.appendChild(grid);

  const actions = el("div", { class: "row", style: "margin-top: 10px; gap: 8px;" });
  const cycleField = el("input", { type: "text", placeholder: "cycle (e.g. Cycle 270 / Jan 2026)",
                                   "aria-label": "Profile sheet cycle",
                                   style: "flex: 1 1 220px; padding: 6px 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
                                   value: profile?.cycle || active.cycle || "" });
  actions.appendChild(cycleField);

  const saveBtn = el("button", { class: "btn", text: "Save profile sheet" });
  saveBtn.addEventListener("click", async () => {
    const next = { cycle: cycleField.value.trim() || undefined, sections: [] };
    for (const [id, fset] of fields) {
      const entry = { id };
      const n = readNum(fset.items);     if (n != null) entry.itemCount = n;
      const c = readNum(fset.correct);   if (c != null) entry.correctCount = c;
      const p = readNum(fset.pct);       if (p != null) entry.percentile = p;
      if (entry.itemCount != null || entry.correctCount != null || entry.percentile != null) {
        next.sections.push(entry);
      }
    }
    await bibs.setProfileSheet(active.id, next);
    toast("Profile sheet saved");
  });
  const clearBtn = el("button", { class: "btn btn-ghost", text: "Clear" });
  clearBtn.addEventListener("click", async () => {
    if (!confirm("Clear the profile sheet for this Bib? Section item counts will fall back to bib.json defaults.")) return;
    await bibs.clearProfileSheet(active.id);
    toast("Profile sheet cleared");
    for (const f of fields.values()) {
      f.items.value = ""; f.correct.value = ""; f.pct.value = "";
    }
    cycleField.value = "";
  });
  actions.appendChild(saveBtn);
  actions.appendChild(clearBtn);
  card.appendChild(actions);

  if (profile?.updatedAt) {
    card.appendChild(el("p", { class: "muted", style: "font-size: 0.82em; margin-top: 8px;",
      text: `Last saved: ${new Date(profile.updatedAt).toLocaleString()}` }));
  }

  return card;
}

function readNum(inputEl) {
  const v = inputEl.value.trim();
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
