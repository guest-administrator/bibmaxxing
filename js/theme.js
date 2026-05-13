/* =========================================================================
   Theme: light / dark / system.
   Setting persisted in the `settings` store as { key: "theme", value: ... }.
   "system" means follow `prefers-color-scheme` live.
   ========================================================================= */

import { db } from "./db.js";

let _setting = "light";
let _mql = null;

function mql() {
  if (!_mql) _mql = window.matchMedia("(prefers-color-scheme: dark)");
  return _mql;
}

function applyEffective() {
  const effective = _setting === "system"
    ? (mql().matches ? "dark" : "light")
    : _setting;
  document.documentElement.setAttribute("data-theme", effective);
}

export const theme = {

  async init() {
    const saved = await db.getSetting("theme", "system");
    _setting = saved;
    mql().addEventListener?.("change", () => {
      if (_setting === "system") applyEffective();
    });
    applyEffective();
  },

  setting() { return _setting; },

  effective() {
    return _setting === "system"
      ? (mql().matches ? "dark" : "light")
      : _setting;
  },

  async set(value) {
    if (!["light", "dark", "system"].includes(value)) {
      throw new Error(`Invalid theme: ${value}`);
    }
    _setting = value;
    await db.setSetting("theme", value);
    applyEffective();
  },

  async cycle() {
    const order = ["light", "dark", "system"];
    const next = order[(order.indexOf(_setting) + 1) % order.length];
    await this.set(next);
  },
};
