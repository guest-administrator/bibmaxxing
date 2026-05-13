#!/usr/bin/env node
// Deterministic answer-position rebalancer.
//
// Goal: spread the index of correct answers roughly evenly across A/B/C/D so
// the corpus does not telegraph an "always pick B" bias.
//
// Per question:
//   1. Skip if `composite` text is detected in choices or explanation
//      (questions of the form "All of the above" / "Both A and C" /
//      "A and B only" / "A, B, and C" / "none of the above").
//   2. Skip if `rebalanceLocked: true` on the question (operator override).
//   3. Compute a deterministic target index from a hash of `q.id`:
//        target = h(id) % choices.length
//      With the same id and same choices length, the rebalancer always
//      produces the same target -> the script is idempotent.
//   4. If q.answer == target, no change.
//   5. Else swap choices[q.answer] with choices[target] and set
//      q.answer = target. Pure swap preserves the correct-answer text
//      semantically; explanations don't reference choice letters (verified by
//      grep before this script was written).
//
// Usage:
//   node scripts/rebalance-answers.mjs                 # default CWT-E7
//   node scripts/rebalance-answers.mjs --bib CWT-E7
//   node scripts/rebalance-answers.mjs --dry-run       # report only, no write
//   node scripts/rebalance-answers.mjs --report        # report before/after

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const Q_PATH = path.join("data", "bibs", args.bib, "questions.json");

// Regex: matches composite-answer phrasings in choice strings or explanations.
// Word boundaries on either side; case-insensitive. Designed to avoid false
// positives such as "Rev A" inside an explanation - we require choice-letter
// words to appear in composite phrases like "A and B" or "both A and B".
const COMPOSITE_RE = /\b(?:all of the above|none of the above|both of the above|both [a-d] and [a-d]\b|[a-d] and [a-d] only\b|[a-d], [a-d],? and [a-d]\b)/i;

function isComposite(q) {
  for (const c of (q.choices || [])) {
    if (typeof c === "string" && COMPOSITE_RE.test(c)) return true;
  }
  if (typeof q.explanation === "string" && COMPOSITE_RE.test(q.explanation)) return true;
  return false;
}

// FNV-1a 32-bit. Deterministic and stable.
function fnv1a(str) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function targetIndex(id, n) { return fnv1a(id) % n; }

function distribution(qs) {
  const c = [0, 0, 0, 0];
  for (const q of qs) {
    const n = (q.choices || []).length;
    if (n === 0) continue;
    const a = q.answer | 0;
    if (a >= 0 && a < c.length) c[a]++;
  }
  const total = c.reduce((s, x) => s + x, 0) || 1;
  return c.map((x, i) => ({
    letter: String.fromCharCode(65 + i),
    count: x,
    pct: ((x / total) * 100).toFixed(1) + "%",
  }));
}

async function main() {
  const qs = JSON.parse(await readFile(Q_PATH, "utf8"));
  const before = distribution(qs);

  let composite = 0, locked = 0, unchanged = 0, swapped = 0;
  for (const q of qs) {
    if (q.rebalanceLocked === true) { locked++; continue; }
    if (!Array.isArray(q.choices) || q.choices.length < 2) continue;
    if (isComposite(q)) { composite++; continue; }
    const n = q.choices.length;
    const t = targetIndex(q.id || "", n);
    if (t === q.answer) { unchanged++; continue; }
    // Pure swap preserves both choice strings; only positions change.
    const tmp = q.choices[t];
    q.choices[t] = q.choices[q.answer];
    q.choices[q.answer] = tmp;
    q.answer = t;
    swapped++;
  }

  const after = distribution(qs);

  console.log(`=== rebalance-answers (${args.bib}) ===`);
  console.log(`total questions:       ${qs.length}`);
  console.log(`composite (skipped):   ${composite}`);
  console.log(`rebalanceLocked:       ${locked}`);
  console.log(`already on target:     ${unchanged}`);
  console.log(`swapped:               ${swapped}${args.dryRun ? " (dry-run)" : ""}`);
  console.log("");
  console.log("Before:");
  for (const r of before) console.log(`  ${r.letter}: ${String(r.count).padStart(4)} (${r.pct})`);
  console.log("After:");
  for (const r of after)  console.log(`  ${r.letter}: ${String(r.count).padStart(4)} (${r.pct})`);

  if (!args.dryRun) {
    await writeFile(Q_PATH, JSON.stringify(qs, null, 2) + "\n", "utf8");
  }
}

function parseArgs(argv) {
  const out = { bib: "CWT-E7", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--bib") out.bib = argv[++i];
    else if (a === "--dry-run" || a === "--report") out.dryRun = true;
    else if (a === "-h" || a === "--help") {
      console.log("Usage: node scripts/rebalance-answers.mjs [--bib <id>] [--dry-run]");
      process.exit(0);
    }
  }
  return out;
}

main().catch((e) => { console.error("rebalance-answers fatal:", e); process.exit(1); });
