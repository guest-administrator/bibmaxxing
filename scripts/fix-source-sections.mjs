#!/usr/bin/env node
// Remap each question's `sourceSection` to a real heading slug in its
// sourceRef's study guide. Dry-run by default; pass --write to apply.
//
// Confidence tiers:
//   exact          - already matched
//   high           - top >= 0.50 AND margin >= 0.15
//   medium         - top >= 0.30
//   low            - top >= 0.10
//   manual-needed  - top <  0.10

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const Q_PATH    = path.join("data", "bibs", args.bib, "questions.json");
const GUIDE_DIR = path.join("data", "bibs", args.bib, "study-guides");

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

const STOPWORDS = new Set([
  "a","an","and","are","as","at","be","by","for","from","has","have","in","is","it","its","of",
  "on","or","that","the","this","these","those","to","was","were","will","with","what","which",
  "when","where","who","why","how","not","do","does","did","but","can","could","should","may",
  "might","must","s","t","just","also","than","into","over","under","more","most","some","any",
  "such","other","only","own","same","so","up","down","out","because","while","each","both",
  "i","you","they","we","he","she","my","your","their","our","question","stem","study","source",
  "topic","topics","note","ref","refs","ll","re","ve","cwt","navy","exam","bib","bibliography",
  "us","united","states","department","defense","cyberspace","cyber","ops","operations",
]);

function tokens(text) {
  const out = new Set();
  const cleaned = String(text || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ");
  for (const tok of cleaned.split(/\s+/)) {
    if (tok.length >= 2 && !STOPWORDS.has(tok)) out.add(tok);
  }
  return out;
}

function setIntersection(a, b) {
  let n = 0;
  for (const v of a) if (b.has(v)) n++;
  return n;
}

function slugTextTokens(slug) {
  return tokens((slug || "").replace(/-/g, " "));
}

function scoreHeading(qTokens, oldSlugTokens, heading) {
  const hTokens = tokens(heading.text);
  const overlap = setIntersection(qTokens, hTokens);
  const denom = Math.max(hTokens.size, 3);
  let score = overlap / denom;
  for (const t of oldSlugTokens) {
    if (heading.slug.includes(t)) score += 0.15;
  }
  score += Math.min(0.05, heading.level * 0.01);
  return { score, overlap };
}

function tierFor(top, margin) {
  if (top >= 0.50 && margin >= 0.15) return "high";
  if (top >= 0.30) return "medium";
  if (top >= 0.10) return "low";
  return "manual-needed";
}

async function loadHeadings(refId) {
  const p = path.join(GUIDE_DIR, refId + ".md");
  if (!existsSync(p)) return null;
  const src = await readFile(p, "utf8");
  const out = [];
  for (const line of src.split(/\r?\n/)) {
    const m = /^(#{1,6})\s+(.+?)(?:\s*\{#([\w\-:.]+)\})?\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2];
    const slug = m[3] || slugify(text);
    if (!slug) continue;
    out.push({ level, text, slug });
  }
  return out;
}

async function main() {
  const qs = JSON.parse(await readFile(Q_PATH, "utf8"));
  const guideCache = new Map();
  async function headings(refId) {
    if (!guideCache.has(refId)) guideCache.set(refId, await loadHeadings(refId));
    return guideCache.get(refId);
  }

  const stats = { exact: 0, high: 0, medium: 0, low: 0, "manual-needed": 0, skipped_no_guide: 0, no_change: 0 };
  const lowReport = [];
  let touched = 0;

  for (const q of qs) {
    if (!q.sourceRef) continue;
    const heads = await headings(q.sourceRef);
    if (!heads || heads.length === 0) { stats.skipped_no_guide++; continue; }
    const slugSet = new Set(heads.map((h) => h.slug));

    const oldSlug = (typeof q.sourceSection === "string") ? q.sourceSection.trim() : "";
    if (oldSlug && slugSet.has(oldSlug)) {
      if (q.sourceSectionConfidence !== "exact") {
        q.sourceSectionConfidence = "exact";
        touched++;
      }
      stats.exact++;
      continue;
    }

    const qText = [
      q.stem || "",
      q.explanation || "",
      Array.isArray(q.topics) ? q.topics.join(" ") : "",
      q.sourceNote || "",
      (oldSlug || "").replace(/-/g, " "),
    ].join(" ");
    const qTokens = tokens(qText);
    const oldSlugTokens = slugTextTokens(oldSlug);

    let best = null, second = null;
    for (const h of heads) {
      if (h.level === 1) continue;
      const sc = scoreHeading(qTokens, oldSlugTokens, h);
      if (!best || sc.score > best.score) { second = best; best = { ...sc, h }; }
      else if (!second || sc.score > second.score) { second = { ...sc, h }; }
    }
    if (!best) { stats.skipped_no_guide++; continue; }

    const top = best.score;
    const margin = top - (second?.score || 0);
    const tier = tierFor(top, margin);
    const newSlug = best.h.slug;

    if (oldSlug === newSlug) { stats.no_change++; continue; }

    q.sourceSection = newSlug;
    q.sourceSectionConfidence = tier;
    stats[tier]++;
    touched++;
    if (tier === "low" || tier === "manual-needed") {
      lowReport.push({
        id: q.id,
        sourceRef: q.sourceRef,
        oldSourceSection: oldSlug || null,
        newSourceSection: newSlug,
        confidence: tier,
        topScore: Number(top.toFixed(3)),
        runnerUpScore: Number((second?.score || 0).toFixed(3)),
        chosenHeading: best.h.text,
        reason: tier === "manual-needed"
          ? "no clear token overlap; default to top candidate"
          : "low token overlap; review recommended",
      });
    }
  }

  if (args.write) {
    await writeFile(Q_PATH, JSON.stringify(qs, null, 2) + "\n", "utf8");
  }

  console.log(`=== fix-source-sections (${args.bib}${args.write ? "" : ", DRY-RUN"}) ===`);
  console.log(`total questions:          ${qs.length}`);
  console.log(`already exact:            ${stats.exact}`);
  console.log(`high confidence:          ${stats.high}`);
  console.log(`medium confidence:        ${stats.medium}`);
  console.log(`low confidence:           ${stats.low}`);
  console.log(`manual-needed:            ${stats["manual-needed"]}`);
  console.log(`no-change (same slug):    ${stats.no_change}`);
  console.log(`skipped (no guide on disk): ${stats.skipped_no_guide}`);
  console.log(`rows touched:             ${touched}${args.write ? "" : " (would touch)"}`);
  if (lowReport.length) {
    console.log("\nLow / manual-needed mappings (review):");
    for (const r of lowReport.slice(0, 30)) {
      console.log(`  - ${r.id}  ref=${r.sourceRef}  old=${r.oldSourceSection || "(missing)"}  new=${r.newSourceSection}  ${r.confidence} (top ${r.topScore}, runner ${r.runnerUpScore})  -> "${r.chosenHeading}"`);
    }
    if (lowReport.length > 30) console.log(`  ... and ${lowReport.length - 30} more`);
  }
}

function parseArgs(argv) {
  const out = { bib: "CWT-E7", write: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--bib") out.bib = argv[++i];
    else if (a === "--write") out.write = true;
    else if (a === "-h" || a === "--help") {
      console.log("Usage: node scripts/fix-source-sections.mjs [--bib <id>] [--write]");
      process.exit(0);
    }
  }
  return out;
}

main().catch((e) => { console.error("fix-source-sections fatal:", e); process.exit(1); });
