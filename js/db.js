/* =========================================================================
   IndexedDB wrapper for Bibmaxxing.

   Single choke point for writes (`db.persist` / `db.put` / `db.bulkPut` /
   `db.delete`). Every successful write fires a `saved` event on
   `savedEvents` so the nav "Last saved" indicator can subscribe once and
   stay accurate regardless of which view triggered the write.

   Stores (v1):
     questions       keyPath "id"
     progress        keyPath ["bibId","questionId"]
     notes           keyPath ["bibId","refId"]
     sessions        keyPath "id" autoIncrement
     examAttempts    keyPath "id" autoIncrement
     settings        keyPath "key"
   ========================================================================= */

const DB_NAME = "bibmaxxing";
const DB_VERSION = 1;

export const savedEvents = new EventTarget();

function fireSaved(detail) {
  savedEvents.dispatchEvent(new CustomEvent("saved", { detail }));
}
function fireSaveError(err) {
  savedEvents.dispatchEvent(new CustomEvent("save-error", { detail: { message: err?.message || String(err) } }));
}

let _db = null;
let _openPromise = null;

function idb() {
  if (!_db) throw new Error("DB not opened yet — call db.open() first");
  return _db;
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function awaitTx(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort    = () => reject(tx.error || new Error("transaction aborted"));
    tx.onerror    = () => reject(tx.error);
  });
}

function migrate(db, oldVersion) {
  if (oldVersion < 1) {
    const questions = db.createObjectStore("questions", { keyPath: "id" });
    questions.createIndex("byBib", "bibId", { unique: false });
    questions.createIndex("byTopic", "topics", { unique: false, multiEntry: true });
    questions.createIndex("byRef", "refs", { unique: false, multiEntry: true });

    const progress = db.createObjectStore("progress", { keyPath: ["bibId", "questionId"] });
    progress.createIndex("byBibNextDue", ["bibId", "nextDue"], { unique: false });
    progress.createIndex("byBib", "bibId", { unique: false });

    const notes = db.createObjectStore("notes", { keyPath: ["bibId", "refId"] });
    notes.createIndex("byBib", "bibId", { unique: false });

    const sessions = db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
    sessions.createIndex("byBib", "bibId", { unique: false });
    sessions.createIndex("byInProgress", ["bibId", "inProgress"], { unique: false });

    const attempts = db.createObjectStore("examAttempts", { keyPath: "id", autoIncrement: true });
    attempts.createIndex("byBib", "bibId", { unique: false });
    attempts.createIndex("byCompletedAt", ["bibId", "completedAt"], { unique: false });

    db.createObjectStore("settings", { keyPath: "key" });
  }
}

const STORES = ["questions", "progress", "notes", "sessions", "examAttempts", "settings"];

/* ---------- Public API ---------- */

export const db = {

  async open() {
    if (_db) return _db;
    if (_openPromise) return _openPromise;
    _openPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => migrate(req.result, e.oldVersion);
      req.onsuccess = () => {
        _db = req.result;
        _db.onversionchange = () => { _db.close(); _db = null; };
        resolve(_db);
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("Another tab is holding an older DB version open. Close other Bibmaxxing tabs and retry."));
    });
    return _openPromise;
  },

  close() {
    if (_db) { _db.close(); _db = null; }
    _openPromise = null;
  },

  /* --- reads --- */

  async get(store, key) {
    const tx = idb().transaction(store, "readonly");
    return promisify(tx.objectStore(store).get(key));
  },

  async getAll(store) {
    const tx = idb().transaction(store, "readonly");
    return promisify(tx.objectStore(store).getAll());
  },

  async getAllByIndex(store, indexName, range) {
    const tx = idb().transaction(store, "readonly");
    const idx = tx.objectStore(store).index(indexName);
    return promisify(idx.getAll(range));
  },

  async count(store, indexName, range) {
    const tx = idb().transaction(store, "readonly");
    const target = indexName
      ? tx.objectStore(store).index(indexName)
      : tx.objectStore(store);
    return promisify(target.count(range));
  },

  /* --- writes (each one fires `saved` on success) --- */

  async put(store, record) {
    try {
      const tx = idb().transaction(store, "readwrite");
      const req = tx.objectStore(store).put(record);
      const key = await promisify(req);
      await awaitTx(tx);
      fireSaved({ store, op: "put", count: 1 });
      return key;
    } catch (err) { fireSaveError(err); throw err; }
  },

  async bulkPut(store, records) {
    if (!records?.length) return 0;
    try {
      const tx = idb().transaction(store, "readwrite");
      const os = tx.objectStore(store);
      for (const r of records) os.put(r);
      await awaitTx(tx);
      fireSaved({ store, op: "bulkPut", count: records.length });
      return records.length;
    } catch (err) { fireSaveError(err); throw err; }
  },

  async delete(store, key) {
    try {
      const tx = idb().transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      await awaitTx(tx);
      fireSaved({ store, op: "delete", count: 1 });
    } catch (err) { fireSaveError(err); throw err; }
  },

  async clearStore(store) {
    try {
      const tx = idb().transaction(store, "readwrite");
      tx.objectStore(store).clear();
      await awaitTx(tx);
      fireSaved({ store, op: "clear", count: 0 });
    } catch (err) { fireSaveError(err); throw err; }
  },

  async clearAll() {
    for (const s of STORES) await this.clearStore(s);
  },

  /* --- settings convenience --- */

  async getSetting(key, fallback) {
    const row = await this.get("settings", key);
    return row ? row.value : fallback;
  },

  async setSetting(key, value) {
    await this.put("settings", { key, value });
  },

  /* --- backup / restore --- */

  async exportAll() {
    const out = { schemaVersion: DB_VERSION, exportedAt: new Date().toISOString(), stores: {} };
    for (const s of STORES) out.stores[s] = await this.getAll(s);
    return out;
  },

  async importAll(data) {
    if (!data?.stores) throw new Error("Invalid backup file: missing `stores` field.");
    for (const s of STORES) {
      if (Array.isArray(data.stores[s])) await this.bulkPut(s, data.stores[s]);
    }
  },

  /* --- raw transaction for callers that need atomic multi-store writes --- */

  txn(stores, mode = "readwrite") {
    return idb().transaction(stores, mode);
  },

  STORES,
};

/* Helper: convert an IDB request inside an open tx to a promise without
   waiting for tx completion. Used by callers that already hold a tx. */
export function req(r) { return promisify(r); }
