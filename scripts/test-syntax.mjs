#!/usr/bin/env node
// Runs `node --check` over every .js/.mjs in the project (excluding dev/build dirs).
// Uses spawnSync with an args array — no shell, no injection surface.

import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const SKIP = new Set([
  "node_modules", "dist", ".git", ".claude", ".codex",
  "_screenshots", "bibmaxxing-py", "__pycache__",
]);

const root = process.cwd();
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) walk(p);
    else if (s.isFile() && (extname(p) === ".js" || extname(p) === ".mjs")) files.push(p);
  }
}
walk(root);

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (r.status !== 0) {
    failed++;
    console.error(`SYNTAX ERROR: ${f}`);
    if (r.stderr) console.error(r.stderr);
  }
}

if (failed) {
  console.error(`\n${failed}/${files.length} file(s) failed node --check.`);
  process.exit(1);
}
console.log(`node --check: ${files.length} file(s) OK`);
