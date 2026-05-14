#!/usr/bin/env node
// Builds a public-safe source folder that can be uploaded directly to GitHub.
//
// Output:
//   dist/bibmaxxing-github-upload-<version>/
//   dist/bibmaxxing-github-upload-<version>.zip
//
// This is deliberately separate from package-web.mjs:
// - package-web creates redistributable app/data/bundle archives for users.
// - this script creates a clean source tree for a GitHub repository.

import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";

import { createZip } from "./lib/zip.mjs";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
const VERSION = pkg.version || "0.0.0";
const OUT = path.join(DIST, `bibmaxxing-github-upload-${VERSION}`);
const ZIP_PATH = `${OUT}.zip`;

const TOP_LEVEL = [
  "index.html",
  "app.js",
  "app.css",
  "package.json",
  "README.md",
  "serve.bat",
  "Deploy Bibmaxxing.bat",
  "js",
  "scripts",
  "data",
  "docs",
  "tests",
];

const SKIP_NAMES = new Set([
  ".git",
  ".claude",
  ".codex",
  ".superpowers",
  "node_modules",
  "dist",
  "_screenshots",
  "__pycache__",
  ".DS_Store",
  "Thumbs.db",
]);

const BLOCKED_EXTENSIONS = new Set([
  ".pdf",
  ".epub",
  ".mobi",
  ".azw3",
]);

function slash(p) {
  return p.split(path.sep).join("/");
}

function shouldCopy(rel) {
  const s = slash(rel);
  const name = path.basename(s);
  if (!s || SKIP_NAMES.has(name)) return true;
  if (s.split("/").some((part) => SKIP_NAMES.has(part))) return false;
  if (BLOCKED_EXTENSIONS.has(path.extname(s).toLowerCase())) return false;
  if (s.includes("/references/")) return s.endsWith("/references/MANIFEST.json");
  return true;
}

async function copyTree(src, dest, rel = "") {
  if (!shouldCopy(rel)) return;
  const st = await stat(src);
  if (st.isSymbolicLink?.()) return;
  if (st.isDirectory()) {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_NAMES.has(entry.name)) continue;
      await copyTree(path.join(src, entry.name), path.join(dest, entry.name), path.join(rel, entry.name));
    }
    return;
  }
  if (st.isFile()) {
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(src, dest);
  }
}

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_NAMES.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, out);
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

async function cleanOutputDir() {
  await mkdir(OUT, { recursive: true });
  const entries = await readdir(OUT, { withFileTypes: true });
  for (const entry of entries) {
    // Preserve a Git worktree when the generated folder has already been
    // pushed. Windows also refuses to remove OUT when an operator's shell is
    // currently inside it, so clean contents instead of deleting OUT itself.
    if (entry.name === ".git") continue;
    await rm(path.join(OUT, entry.name), { recursive: true, force: true });
  }
}

async function writeGitignore() {
  const text = [
    "# Local/runtime output",
    "dist/",
    "node_modules/",
    "*.log",
    "",
    "# Operator-local reference material. Do not commit commercial/restricted PDFs.",
    "*.pdf",
    "*.epub",
    "*.mobi",
    "*.azw3",
    "data/bibs/**/references/*",
    "!data/bibs/**/references/MANIFEST.json",
    "",
    "# Local agent/session folders",
    ".claude/",
    ".codex/",
    ".superpowers/",
    "_screenshots/",
    "",
    "# OS/editor noise",
    ".DS_Store",
    "Thumbs.db",
    "",
  ].join("\n");
  await writeFile(path.join(OUT, ".gitignore"), text, "utf8");
}

async function writeUploadReadme() {
  const text = [
    "# Bibmaxxing GitHub Upload Folder",
    "",
    "This folder is the public-safe source tree for Bibmaxxing.",
    "",
    "## Upload",
    "",
    "1. Create a new GitHub repository.",
    "2. Upload the contents of this folder, not the parent `dist/` folder.",
    "3. Keep local reference PDFs out of the repository. This folder includes only `references/MANIFEST.json` files.",
    "",
    "## Run after cloning",
    "",
    "```sh",
    "npm run serve",
    "```",
    "",
    "No `npm install` is required; the web app and scripts use Node's standard library.",
    "",
    "## One-click Windows deploy",
    "",
    "Double-click `Deploy Bibmaxxing.bat` to build, test, package, and create `dist/bibmaxxing-portable-<version>/Run Bibmaxxing.bat`.",
    "",
    "The portable runner opens the app in a browser. Use the in-app **Exit** button to close the local server.",
    "",
  ].join("\n");
  await writeFile(path.join(OUT, "GITHUB-UPLOAD-README.md"), text, "utf8");
}

async function writeManifest(files) {
  const entries = [];
  for (const abs of files) {
    const rel = slash(path.relative(OUT, abs));
    const data = await readFile(abs);
    entries.push({
      path: rel,
      bytes: data.length,
      sha256: createHash("sha256").update(data).digest("hex"),
    });
  }

  const manifest = {
    appVersion: VERSION,
    generatedAt: new Date().toISOString(),
    packageType: "github-upload-source",
    redistribution: "redistributable",
    counts: {
      files: entries.length + 1,
      bytes: entries.reduce((sum, item) => sum + item.bytes, 0),
      pdfs: entries.filter((item) => /\.pdf$/i.test(item.path)).length,
    },
    excluded: {
      directories: ["dist", "node_modules", ".claude", ".codex", ".superpowers", "_screenshots", "bibmaxxing-py"],
      extensions: [...BLOCKED_EXTENSIONS],
      referenceFiles: "data/bibs/**/references/* except references/MANIFEST.json",
    },
    checksums: entries,
    note: "Upload the contents of this folder to GitHub. Local reference PDFs are intentionally excluded.",
  };
  await writeFile(path.join(OUT, "GITHUB-UPLOAD-MANIFEST.json"), JSON.stringify(manifest, null, 2), "utf8");
}

async function zipFolder() {
  const zip = createZip();
  const files = await walk(OUT);
  for (const abs of files) {
    const rel = slash(path.relative(OUT, abs));
    const data = await readFile(abs);
    const ext = path.extname(rel).toLowerCase();
    zip.add(rel, data, { store: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".zip"].includes(ext) });
  }
  await zip.write(ZIP_PATH);
  return files.length;
}

async function main() {
  await mkdir(DIST, { recursive: true });
  await rm(ZIP_PATH, { force: true });
  await cleanOutputDir();

  for (const item of TOP_LEVEL) {
    const src = path.join(ROOT, item);
    if (!existsSync(src)) continue;
    await copyTree(src, path.join(OUT, item), item);
  }

  await writeGitignore();
  await writeUploadReadme();
  await writeManifest(await walk(OUT));
  const fileCount = await zipFolder();
  const zipSize = (await stat(ZIP_PATH)).size;

  console.log("GitHub upload folder ready");
  console.log(`Folder: ${path.relative(ROOT, OUT)}`);
  console.log(`ZIP: ${path.relative(ROOT, ZIP_PATH)} (${(zipSize / 1024).toFixed(1)} KiB, ${fileCount} files)`);
  console.log("Reference PDFs: excluded");
}

main().catch((e) => {
  console.error("build-github-upload: fatal:", e);
  process.exit(1);
});
