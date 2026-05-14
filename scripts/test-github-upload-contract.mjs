#!/usr/bin/env node
// Contract for the clean GitHub upload folder.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const VERSION = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8")).version || "0.0.0";
const PUBLIC_SOURCE_EXPORT = existsSync(path.join(ROOT, "GITHUB-UPLOAD-MANIFEST.json"));
const OUT = PUBLIC_SOURCE_EXPORT ? ROOT : path.join(ROOT, "dist", `bibmaxxing-github-upload-${VERSION}`);
let failed = 0;

function ok(condition, message) {
  if (!condition) {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
ok(pkg.scripts?.["github:folder"] === "node scripts/build-github-upload.mjs",
  "package.json must expose npm run github:folder");
ok(existsSync(path.join(ROOT, "scripts", "build-github-upload.mjs")),
  "scripts/build-github-upload.mjs must exist");

if (!PUBLIC_SOURCE_EXPORT && existsSync(path.join(ROOT, "scripts", "build-github-upload.mjs"))) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "build-github-upload.mjs")], {
    cwd: ROOT,
    stdio: "inherit",
  });
  ok(result.status === 0, `github upload builder must exit 0, got ${result.status}`);
}

ok(existsSync(OUT), "GitHub upload folder must exist after builder runs");

if (existsSync(OUT)) {
  const files = await walk(OUT);
  const rels = files.map((p) => path.relative(OUT, p).replace(/\\/g, "/"));
  const pdfs = rels.filter((p) => /\.pdf$/i.test(p));
  const distFiles = rels.filter((p) => p === "dist" || p.startsWith("dist/"));
  const gitFiles = rels.filter((p) => p === ".git" || p.startsWith(".git/"));
  const localAgentFiles = rels.filter((p) => p.startsWith(".claude/") || p.startsWith(".superpowers/") || p.startsWith("_screenshots/"));
  const pyForkFiles = rels.filter((p) => p.startsWith("bibmaxxing-py/"));
  const referenceFiles = rels.filter((p) => p.includes("/references/") && !p.endsWith("/references/MANIFEST.json"));

  ok(rels.includes("index.html"), "GitHub folder must include index.html");
  ok(rels.includes("package.json"), "GitHub folder must include package.json");
  ok(rels.includes("README.md"), "GitHub folder must include README.md");
  ok(rels.includes(".gitignore"), "GitHub folder must include .gitignore");
  ok(rels.includes("GITHUB-UPLOAD-README.md"), "GitHub folder must include upload instructions");
  ok(rels.includes("scripts/deploy.mjs"), "GitHub folder must include deploy script");
  ok(rels.includes("scripts/serve.mjs"), "GitHub folder must include local server");
  ok(rels.includes("data/bibs/index.json"), "GitHub folder must include Bib registry");
  ok(pdfs.length === 0, `GitHub folder must not include PDFs: ${pdfs.slice(0, 5).join(", ")}`);
  ok(referenceFiles.length === 0, `GitHub folder must not include local reference files: ${referenceFiles.slice(0, 5).join(", ")}`);
  ok(distFiles.length === 0, "GitHub folder must not recursively include dist/");
  ok(gitFiles.length === 0, "GitHub folder ZIP/manifest walk must not include .git/");
  ok(localAgentFiles.length === 0, "GitHub folder must not include local agent/session folders");
  ok(pyForkFiles.length === 0, "GitHub folder must not include bibmaxxing-py/");

  if (!PUBLIC_SOURCE_EXPORT) {
    const zipPath = `${OUT}.zip`;
    ok(existsSync(zipPath), "GitHub upload ZIP must exist next to the folder");
    if (existsSync(zipPath)) {
      const z = await stat(zipPath);
      ok(z.size > 0, "GitHub upload ZIP must be non-empty");
    }
  }
}

if (failed) {
  console.error(`GitHub upload contract failed: ${failed} issue(s)`);
  process.exit(1);
}

console.log("GitHub upload contract OK");
