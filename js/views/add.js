/* =========================================================================
   Add / Edit question form.
   #add                    — new question
   #add/edit/<qid>         — edit existing (user or seed; seed gets cloned)
   #add/for/<refId>        — new question, preselect that reference
   ========================================================================= */

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

  let editing = null;
  let prefilledRef = null;
  if (params[0] === "edit" && params[1]) {
    const q = await db.get("questions", decodeURIComponent(params[1]));
    if (q) editing = q;
  } else if (params[0] === "for" && params[1]) {
    prefilledRef = decodeURIComponent(params[1]);
  }

  const state = editing ? cloneSeedIfNeeded(editing) : newBlank(bibId, prefilledRef);

  mount.appendChild(el("h2", { text: editing ? "Edit question" : "Add question" }));
  if (editing && editing.source !== "user") {
    mount.appendChild(el("p", { class: "muted",
      text: "Note: this is a seed question. Saving creates a user-authored copy and marks the seed as overridden locally. Re-seeds won't resurrect it." }));
  }

  if (prefilledRef) {
    const r = refs.find((x) => x.id === prefilledRef);
    if (r && r.studyTopics) {
      mount.appendChild(el("div", { class: "study-scope-box" },
        el("div", { class: "label", text: `Bib study scope — ${r.id}` }),
        el("div", { class: "scope-text", text: r.studyTopics }),
      ));
    }
  }

  const form = el("div", { class: "card" });
  mount.appendChild(form);

  /* Stem */
  form.appendChild(field("Question stem", (() => {
    const ta = el("textarea", { rows: "3" });
    ta.value = state.stem;
    ta.addEventListener("input", () => { state.stem = ta.value; });
    return ta;
  })()));

  /* 4 choices */
  const choicesField = el("div", { class: "form-field" });
  choicesField.appendChild(el("label", { text: "Choices (pick the correct one)" }));
  for (let i = 0; i < 4; i++) {
    const row = el("div", { class: "choice-row" });
    const radio = el("input", { type: "radio", name: "correct", value: String(i) });
    if (state.answer === i) radio.checked = true;
    radio.addEventListener("change", () => { state.answer = i; });
    const input = el("input", { type: "text" });
    input.value = state.choices[i] || "";
    input.addEventListener("input", () => { state.choices[i] = input.value; });
    input.placeholder = `Choice ${String.fromCharCode(65 + i)}`;
    row.appendChild(radio);
    row.appendChild(input);
    choicesField.appendChild(row);
  }
  form.appendChild(choicesField);

  /* Explanation */
  form.appendChild(field("Explanation (optional)", (() => {
    const ta = el("textarea", { rows: "2" });
    ta.value = state.explanation || "";
    ta.addEventListener("input", () => { state.explanation = ta.value; });
    return ta;
  })()));

  /* Refs multi-select */
  const refsField = el("div", { class: "form-field" });
  refsField.appendChild(el("label", { text: "Linked references" }));
  const refsBox = el("div", { style: "max-height:160px; overflow-y:auto; border:1px solid var(--border); border-radius:3px; padding:6px 10px; background:var(--surface);" });
  if (refs.length === 0) refsBox.appendChild(el("p", { class: "muted", text: "No references in this Bib yet." }));
  for (const r of refs) {
    const lbl = el("label", { style: "display:flex; gap:6px; align-items:center; font-weight:normal; text-transform:none; padding:2px 0;" });
    const cb = el("input", { type: "checkbox", value: r.id });
    if ((state.refs || []).includes(r.id)) cb.checked = true;
    cb.addEventListener("change", () => {
      const set = new Set(state.refs || []);
      if (cb.checked) set.add(r.id); else set.delete(r.id);
      state.refs = Array.from(set);
    });
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(`${r.id} — ${r.title || ""}`));
    refsBox.appendChild(lbl);
  }
  refsField.appendChild(refsBox);
  form.appendChild(refsField);

  /* Topics */
  form.appendChild(field("Topics (comma-separated tags)", (() => {
    const inp = el("input", { type: "text", placeholder: "e.g. advancement, SIGINT, admin" });
    inp.value = (state.topics || []).join(", ");
    inp.addEventListener("input", () => {
      state.topics = inp.value.split(",").map((s) => s.trim()).filter(Boolean);
    });
    return inp;
  })()));

  /* Difficulty */
  form.appendChild(field("Difficulty (1 easy – 3 hard)", (() => {
    const sel = el("select");
    for (const n of [1, 2, 3]) {
      const opt = el("option", { value: String(n), text: `${n} ${["easy","medium","hard"][n-1]}` });
      if ((state.difficulty || 2) === n) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener("change", () => { state.difficulty = Number(sel.value); });
    return sel;
  })()));

  /* Action bar */
  const bar = el("div", { class: "row", style: "margin-top:14px;" });
  const saveBtn = el("button", { class: "btn", text: editing ? "Save changes" : "Save question" });
  saveBtn.addEventListener("click", async () => {
    const errors = validate(state);
    if (errors.length) { toast("Fix: " + errors.join("; "), "error"); return; }
    const record = {
      id: state.id,
      bibId,
      stem: state.stem.trim(),
      choices: state.choices.map((c) => (c || "").trim()),
      answer: state.answer,
      explanation: (state.explanation || "").trim() || undefined,
      refs: state.refs || [],
      topics: state.topics || [],
      difficulty: state.difficulty || 2,
      source: "user",
    };
    await db.put("questions", record);

    if (editing && editing.source !== "user") {
      await db.put("questions", { ...editing, overriddenBy: record.id });
    }

    toast(editing ? "Question updated" : "Question added");
    location.hash = "#dashboard";
  });
  bar.appendChild(saveBtn);

  const cancelBtn = el("button", { class: "btn btn-ghost", text: "Cancel" });
  cancelBtn.addEventListener("click", () => { location.hash = "#dashboard"; });
  bar.appendChild(cancelBtn);

  if (editing && editing.source === "user") {
    const del = el("button", { class: "btn btn-danger", style: "margin-left:auto", text: "Delete" });
    del.addEventListener("click", async () => {
      if (!confirm("Delete this question? Your progress stats for it will remain but the card will disappear from reviews.")) return;
      await db.delete("questions", editing.id);
      toast("Question deleted");
      location.hash = "#dashboard";
    });
    bar.appendChild(del);
  }
  form.appendChild(bar);
}

function field(labelText, control) {
  const wrap = document.createElement("div");
  wrap.className = "form-field";
  const lbl = document.createElement("label");
  lbl.textContent = labelText;
  wrap.appendChild(lbl);
  wrap.appendChild(control);
  return wrap;
}

function newBlank(bibId, prefilledRef) {
  return {
    id: newId(bibId),
    stem: "",
    choices: ["", "", "", ""],
    answer: 0,
    explanation: "",
    refs: prefilledRef ? [prefilledRef] : [],
    topics: [],
    difficulty: 2,
    source: "user",
  };
}

function cloneSeedIfNeeded(q) {
  // For editing: if the row is a seed row, clone it (keep its ID; on save,
  // the original seed row is marked overriddenBy pointing at the new user row.
  // We generate a new user ID for the clone to avoid overwriting the seed.
  if (q.source === "user") return { ...q, refs: q.refs?.slice() || [], topics: q.topics?.slice() || [], choices: q.choices.slice() };
  return {
    ...q,
    id: q.id + "-u" + Math.random().toString(36).slice(2, 6),
    choices: q.choices.slice(),
    refs: q.refs?.slice() || [],
    topics: q.topics?.slice() || [],
    source: "user",
  };
}

function newId(bibId) {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${bibId.toLowerCase()}-u-${Date.now().toString(36)}-${suffix}`;
}

function validate(s) {
  const errs = [];
  if (!s.stem.trim()) errs.push("stem empty");
  const filled = s.choices.filter((c) => (c || "").trim()).length;
  if (filled < 4) errs.push("need 4 choices");
  if (s.answer < 0 || s.answer > 3) errs.push("pick correct answer");
  if (!s.choices[s.answer]?.trim()) errs.push("correct choice is empty");
  return errs;
}
