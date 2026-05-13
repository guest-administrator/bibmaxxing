#!/usr/bin/env node
// Coverage contract: every normal-exam reference should have at least one
// primary question. Substitute-only refs may stay empty until a substitute
// corpus is intentionally seeded.

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
let failed = 0;

function ok(condition, message) {
  if (!condition) {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

async function readJson(rel) {
  return JSON.parse(await readFile(path.join(ROOT, rel), "utf8"));
}

const index = await readJson("data/bibs/index.json");

for (const entry of index.bibs || []) {
  if (entry.examType === "core") continue;
  const dir = entry.path.replace(/\/$/, "");
  const bib = await readJson(path.join(dir, "bib.json"));
  const questions = await readJson(path.join(dir, "questions.json"));
  const primaryRefs = new Set(questions.map((q) => q.sourceRef).filter(Boolean));
  const missing = (bib.references || [])
    .filter((ref) => (ref.examScope || "regular") !== "substitute")
    .filter((ref) => !primaryRefs.has(ref.id))
    .map((ref) => ref.id)
    .sort();

  ok(missing.length === 0,
    `${entry.id}: regular references missing primary questions: ${missing.join(", ")}`);
}

if (failed) {
  console.error(`Reference question coverage failed: ${failed} issue(s)`);
  process.exit(1);
}

console.log("Reference question coverage OK");
