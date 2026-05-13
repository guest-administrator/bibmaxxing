/* =========================================================================
   Bibmaxxing — entry + router. Keeps state out of the DOM; each view gets a
   mount element and a context object, renders itself, and returns a cleanup
   hook that the router calls on navigation.
   ========================================================================= */

import { db, savedEvents } from "./js/db.js";
import { bibs } from "./js/bibs.js";
import { theme } from "./js/theme.js";

const VIEWS = {
  dashboard:  () => import("./js/views/dashboard.js"),
  flashcards: () => import("./js/views/flashcards.js"),
  quiz:       () => import("./js/views/quiz.js"),
  exam:       () => import("./js/views/exam.js"),
  references: () => import("./js/views/references.js"),
  guide:      () => import("./js/views/guide.js"),
  add:        () => import("./js/views/add.js"),
  settings:   () => import("./js/views/settings.js"),
};

const mount = document.getElementById("view");
const savedEl = document.getElementById("savedIndicator");
const mainNav = document.getElementById("mainNav");
const navToggle = document.getElementById("navToggle");
const bibBtn = document.getElementById("bibSelector");
const bibLabel = document.getElementById("bibSelectorLabel");
const bibDropdown = document.getElementById("bibDropdown");
const themeBtn = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeToggleIcon");
const exitAppBtn = document.getElementById("exitAppBtn");
const toastEl = document.getElementById("toast");

let activeCleanup = null;
let examLocked = false;

/* ---------- Small DOM helpers ---------- */

function el(tag, props = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class")     n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k === "html") throw new Error("html prop disallowed — build nodes");
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children) {
    if (c == null || c === false) continue;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return n;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export { el, clear };

/* ---------- Saved indicator + toast ---------- */

let lastSavedAt = 0;

savedEvents.addEventListener("saved", () => {
  lastSavedAt = Date.now();
  savedEl.textContent = "Last saved: just now";
  savedEl.classList.add("flash");
  setTimeout(() => savedEl.classList.remove("flash"), 600);
});

savedEvents.addEventListener("save-error", (e) => {
  toast(`Save failed: ${e.detail?.message || "unknown"}`, "error");
});

setInterval(() => {
  if (!lastSavedAt) return;
  const age = Math.round((Date.now() - lastSavedAt) / 1000);
  if (age < 2) return;
  if (age < 60)       savedEl.textContent = `Last saved: ${age}s ago`;
  else if (age < 3600) savedEl.textContent = `Last saved: ${Math.round(age/60)}m ago`;
  else                 savedEl.textContent = `Last saved: ${Math.round(age/3600)}h ago`;
}, 1000);

export function toast(msg, kind) {
  toastEl.textContent = msg;
  toastEl.className = "toast" + (kind === "error" ? " error" : "");
  toastEl.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toastEl.hidden = true; }, 3200);
}
window.toast = toast;

/* ---------- Exam lock ---------- */

export function setExamLock(locked) {
  examLocked = !!locked;
  mainNav.querySelectorAll("a").forEach((a) => {
    if (a.dataset.nav === "exam") return;
    if (locked) a.setAttribute("aria-disabled", "true");
    else        a.removeAttribute("aria-disabled");
  });
}

/* ---------- Bib selector dropdown ---------- */

function renderBibDropdown() {
  clear(bibDropdown);
  const list = bibs.list();
  const activeId = bibs.activeId();
  if (!list.length) {
    bibDropdown.appendChild(el("li", { class: "muted", text: "No Bibs installed" }));
  }
  for (const b of list) {
    const li = el("li", {
      role: "option",
      class: b.id === activeId ? "active" : "",
      text: `${b.rating} ${b.paygrade} · ${b.cycle}`,
    });
    li.addEventListener("click", async () => {
      closeBibDropdown();
      if (b.id === bibs.activeId()) return;
      await bibs.setActive(b.id);
      updateBibLabel();
      rerender();
    });
    bibDropdown.appendChild(li);
  }
  const add = el("li", { class: "add-bib", text: "+ Install a new Bib…" });
  add.addEventListener("click", () => {
    closeBibDropdown();
    location.hash = "#settings";
  });
  bibDropdown.appendChild(add);
}

function updateBibLabel() {
  const active = bibs.active();
  bibLabel.textContent = active
    ? `${active.rating} ${active.paygrade} · ${active.cycle}`
    : "No Bib";
}

function openBibDropdown() {
  renderBibDropdown();
  bibDropdown.hidden = false;
  bibBtn.setAttribute("aria-expanded", "true");
}
function closeBibDropdown() {
  bibDropdown.hidden = true;
  bibBtn.setAttribute("aria-expanded", "false");
}
bibBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (bibDropdown.hidden) openBibDropdown();
  else closeBibDropdown();
});
document.addEventListener("click", (e) => {
  if (!bibDropdown.hidden && !bibDropdown.contains(e.target)) closeBibDropdown();
});

/* ---------- Theme toggle ---------- */

function updateThemeIcon() {
  if (themeIcon) themeIcon.textContent = theme.effective() === "dark" ? "D" : "L";
  themeBtn.title = `Theme: ${theme.setting()} (click to cycle)`;
  themeBtn.setAttribute("aria-label", `Theme: ${theme.setting()}. Click to cycle.`);
}
themeBtn.addEventListener("click", async () => {
  await theme.cycle();
  updateThemeIcon();
});

/* ---------- Nav toggle (mobile) ---------- */

function setNavOpen(open) {
  mainNav.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
}
navToggle.addEventListener("click", () => {
  setNavOpen(!mainNav.classList.contains("is-open"));
});
mainNav.addEventListener("click", (e) => {
  if (e.target.matches("a[href]")) setNavOpen(false);
});
window.addEventListener("resize", () => {
  if (window.innerWidth > 760 && mainNav.classList.contains("is-open")) setNavOpen(false);
});

/* ---------- Router ---------- */

function setLoading(node) {
  clear(node);
  node.appendChild(el("div", { class: "loading", text: "Loading…" }));
}

function renderFatal(node, heading, detail, extra) {
  clear(node);
  const box = el("div", { class: "empty-state" },
    el("h3", { text: heading }),
    el("p", { class: "muted", text: detail }),
  );
  if (extra) box.appendChild(extra);
  node.appendChild(box);
}

async function navigate() {
  if (examLocked) {
    const target = (location.hash || "#dashboard").replace(/^#/, "").split("/")[0];
    if (target !== "exam") {
      location.hash = "#exam";
      return;
    }
  }

  const raw = (location.hash || "#dashboard").replace(/^#/, "");
  const [name, ...rest] = raw.split("/");
  const route = VIEWS[name] ? name : "dashboard";

  mainNav.querySelectorAll("a").forEach((a) => {
    const isActive = a.dataset.nav === route ||
      (route === "add" && a.dataset.nav === "settings");
    a.classList.toggle("active", isActive);
    if (isActive) a.setAttribute("aria-current", "page");
    else          a.removeAttribute("aria-current");
  });

  try {
    if (typeof activeCleanup === "function") {
      try { await activeCleanup(); } catch {}
    }
    activeCleanup = null;

    setLoading(mount);
    const module = await VIEWS[route]();
    const ctx = { route, params: rest, bibs, db, toast, setExamLock, el, clear };
    const result = await module.render(mount, ctx);
    activeCleanup = typeof result === "function" ? result : null;
  } catch (err) {
    console.error(err);
    const back = el("button", { class: "btn", text: "Back to Dashboard" });
    back.addEventListener("click", () => { location.hash = "#dashboard"; });
    renderFatal(mount, "Something broke loading this view", String(err?.message || err), back);
  }
}

function rerender() { navigate(); }

window.addEventListener("hashchange", navigate);

/* ---------- Portable launcher exit ---------- */

function initExitAppButton() {
  const params = new URLSearchParams(location.search);
  const incomingToken = params.get("exitToken");
  if (incomingToken) {
    sessionStorage.setItem("bibmaxxingExitToken", incomingToken);
    history.replaceState(null, "", location.pathname + (location.hash || "#dashboard"));
  }
  const token = sessionStorage.getItem("bibmaxxingExitToken");
  if (!exitAppBtn || !token) return;
  exitAppBtn.hidden = false;
  exitAppBtn.addEventListener("click", async () => {
    exitAppBtn.disabled = true;
    try {
      await fetch(`/__bibmaxxing/shutdown?token=${encodeURIComponent(token)}`, { method: "POST" });
    } catch {
      // The fetch may race the server closing; still render the local exit state.
    }
    clear(mount);
    mount.appendChild(el("div", { class: "empty-state" },
      el("h3", { text: "Bibmaxxing is closed" }),
      el("p", { class: "muted", text: "The local server has been asked to stop. You can close this browser tab." }),
    ));
    toast("Bibmaxxing closed");
    setTimeout(() => { try { window.close(); } catch {} }, 250);
  });
}

/* ---------- Startup ---------- */

async function init() {
  try {
    initExitAppButton();
    await db.open();
    await theme.init();
    updateThemeIcon();
    await bibs.init();
    updateBibLabel();

    if (!location.hash) location.hash = "#dashboard";
    await navigate();
  } catch (err) {
    console.error("Startup failed:", err);
    const hint = el("p", { class: "muted" },
      "If you opened ",
      el("code", { text: "index.html" }),
      " directly via ",
      el("code", { text: "file://" }),
      ", run ",
      el("code", { text: "serve.bat" }),
      " and open ",
      el("code", { text: "http://localhost:8080/" }),
      " instead — the browser blocks ",
      el("code", { text: "fetch" }),
      " on ",
      el("code", { text: "file://" }),
      ".",
    );
    renderFatal(mount, "Bibmaxxing couldn't start", String(err?.message || err), hint);
  }
}

document.addEventListener("DOMContentLoaded", init);
