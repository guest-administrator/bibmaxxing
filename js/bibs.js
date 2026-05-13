/* =========================================================================
   Bib registry + seed loader.

   On init:
     1. Fetch data/bibs/index.json.
     2. Determine active Bib (settings.activeBibId or first marked default).
     3. Fetch that Bib's bib.json for the reference list (cached in memory).
     4. If the `questions` store has no rows for that bibId, seed them from
        the Bib's questions.json. User-added rows are never touched.
   ========================================================================= */

import { db } from "./db.js";
import { profileSheetKey } from "./sections.js";

const INDEX_URL = "data/bibs/index.json";

let _registry = [];
let _tracks = [];
let _activeId = null;
let _bibDataCache = new Map();   // bibId -> bib.json object
let _initialized = false;

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function loadRegistry() {
  try {
    const j = await fetchJSON(INDEX_URL);
    _registry = Array.isArray(j.bibs) ? j.bibs : [];
    _tracks   = Array.isArray(j.tracks) ? j.tracks : [];
  } catch (e) {
    console.warn("Bib registry missing or invalid:", e.message);
    _registry = [];
    _tracks = [];
  }
}

async function loadBibData(bibId) {
  if (_bibDataCache.has(bibId)) return _bibDataCache.get(bibId);
  const entry = _registry.find((b) => b.id === bibId);
  if (!entry) throw new Error(`Unknown Bib: ${bibId}`);
  const bib = await fetchJSON(entry.path + "bib.json");
  _bibDataCache.set(bibId, bib);
  return bib;
}

function entryFor(bibId) {
  return _registry.find((b) => b.id === bibId) || null;
}

function trimSlash(p) {
  return String(p || "").replace(/\/+$/, "");
}

async function seedIfEmpty(bibId) {
  const count = await db.count("questions", "byBib", IDBKeyRange.only(bibId));
  if (count > 0) return { seeded: false, count };
  const entry = _registry.find((b) => b.id === bibId);
  if (!entry) return { seeded: false, count: 0 };
  let questions;
  try {
    questions = await fetchJSON(entry.path + "questions.json");
  } catch (e) {
    console.warn(`No seed questions for ${bibId}:`, e.message);
    return { seeded: false, count: 0 };
  }
  const normalized = (Array.isArray(questions) ? questions : []).map((q) => ({
    source: "seed",
    ...q,
    bibId,
  }));
  if (!normalized.length) return { seeded: false, count: 0 };
  await db.bulkPut("questions", normalized);
  return { seeded: true, count: normalized.length };
}

export const bibs = {

  async init() {
    await loadRegistry();
    const savedId = await db.getSetting("activeBibId");
    if (savedId && _registry.find((b) => b.id === savedId)) {
      _activeId = savedId;
    } else {
      const def = _registry.find((b) => b.default) || _registry[0];
      _activeId = def ? def.id : null;
      if (_activeId) await db.setSetting("activeBibId", _activeId);
    }
    if (_activeId) {
      try {
        await loadBibData(_activeId);
        await seedIfEmpty(_activeId);
      } catch (e) {
        console.warn(`Active Bib ${_activeId} setup failed:`, e.message);
      }
    }
    _initialized = true;
  },

  list() { return _registry.slice(); },

  active() {
    return _registry.find((b) => b.id === _activeId) || null;
  },

  activeId() { return _activeId; },

  async setActive(bibId) {
    if (!_registry.find((b) => b.id === bibId)) throw new Error(`Unknown Bib: ${bibId}`);
    _activeId = bibId;
    await db.setSetting("activeBibId", bibId);
    await loadBibData(bibId);
    await seedIfEmpty(bibId);
  },

  async bibData(bibId = _activeId) {
    if (!bibId) return null;
    return loadBibData(bibId);
  },

  async refs(bibId = _activeId) {
    const data = await this.bibData(bibId);
    return data?.references || [];
  },

  /* ----- track + section + profile-sheet helpers ----- */

  tracks() { return _tracks.slice(); },

  trackFor(bibId = _activeId) {
    const entry = entryFor(bibId);
    if (!entry) return null;
    return _tracks.find((t) => t.id === entry.track) || null;
  },

  contentBaseBibId(bibId = _activeId) {
    const entry = entryFor(bibId);
    return entry?.contentBaseBib || bibId || null;
  },

  contentBasePath(bibId = _activeId) {
    const entry = entryFor(bibId);
    if (!entry) return "";
    if (entry.contentBasePath) return trimSlash(entry.contentBasePath) + "/";
    if (entry.contentBaseBib) {
      const base = entryFor(entry.contentBaseBib);
      if (base?.path) return trimSlash(base.path) + "/";
    }
    return trimSlash(entry.path) + "/";
  },

  guidePath(bibId, refId) {
    return `${this.contentBasePath(bibId)}study-guides/${encodeURIComponent(refId)}.md`;
  },

  referencePath(bibId, localPath) {
    if (!localPath) return "";
    return this.contentBasePath(bibId) + String(localPath).replace(/^\/+/, "");
  },

  async sections(bibId = _activeId) {
    const data = await this.bibData(bibId);
    return data?.sections || [];
  },

  async objectives(bibId = _activeId) {
    const data = await this.bibData(bibId);
    return data?.objectives || [];
  },

  async profileSheet(bibId = _activeId) {
    if (!bibId) return null;
    const row = await db.getSetting(profileSheetKey(bibId));
    return row || null;
  },

  async setProfileSheet(bibId, profile) {
    if (!bibId) throw new Error("setProfileSheet: bibId required");
    const stamped = { ...profile, bibId, updatedAt: Date.now() };
    await db.setSetting(profileSheetKey(bibId), stamped);
    return stamped;
  },

  async clearProfileSheet(bibId) {
    if (!bibId) return;
    await db.setSetting(profileSheetKey(bibId), null);
  },

  async reseed(bibId = _activeId) {
    const entry = _registry.find((b) => b.id === bibId);
    if (!entry) throw new Error(`Unknown Bib: ${bibId}`);
    const fresh = await fetchJSON(entry.path + "questions.json");
    const existing = await db.getAllByIndex("questions", "byBib", IDBKeyRange.only(bibId));
    const existingById = new Map(existing.map((q) => [q.id, q]));
    let added = 0, updated = 0, skipped = 0;
    const batch = [];
    for (const q of fresh) {
      const prev = existingById.get(q.id);
      if (!prev) {
        batch.push({ source: "seed", ...q, bibId });
        added++;
      } else if (prev.source === "user" || prev.overriddenBy) {
        skipped++;
      } else {
        batch.push({ ...prev, ...q, bibId, source: prev.source || "seed" });
        updated++;
      }
    }
    if (batch.length) await db.bulkPut("questions", batch);
    return { added, updated, skipped };
  },

  initialized() { return _initialized; },
};
