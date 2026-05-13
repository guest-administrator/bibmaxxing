#!/usr/bin/env node
// One-click deploy builder for non-technical operators.
//
// Produces an unzipped portable folder under dist/ with a double-click runner:
//   dist/bibmaxxing-portable-<version>/Run Bibmaxxing.bat
//
// The portable folder excludes redistributed PDFs/reference files by default.

import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
const VERSION = pkg.version || "0.0.0";
const DIST = path.join(ROOT, "dist");
const PORTABLE = path.join(DIST, `bibmaxxing-portable-${VERSION}`);

const TOP_LEVEL = [
  "index.html",
  "app.js",
  "app.css",
  "package.json",
  "README.md",
  "js",
  "data",
];

function npmCmd() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function run(label, command, args) {
  console.log(`\n=== ${label} ===`);
  const actualCommand = process.platform === "win32" ? "cmd.exe" : command;
  const actualArgs = process.platform === "win32" ? ["/d", "/s", "/c", command, ...args] : args;
  const result = spawnSync(actualCommand, actualArgs, {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (result.status !== 0) {
    const detail = result.error ? ` (${result.error.message})` : result.signal ? ` (signal ${result.signal})` : "";
    throw new Error(`${label} failed with exit ${result.status}${detail}`);
  }
}

function slash(p) {
  return p.split(path.sep).join("/");
}

function shouldCopy(rel) {
  const s = slash(rel);
  if (s.includes("/references/")) {
    return s.endsWith("/references/MANIFEST.json");
  }
  if (/\.(pdf|epub|mobi|azw3)$/i.test(s)) return false;
  return true;
}

async function copyTree(src, dest, rel = "") {
  if (!shouldCopy(rel)) return;
  const st = await stat(src);
  if (st.isDirectory()) {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src);
    for (const name of entries) {
      await copyTree(path.join(src, name), path.join(dest, name), path.join(rel, name));
    }
    return;
  }
  if (st.isFile()) {
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(src, dest);
  }
}

async function writePortableRunner() {
  const scriptsDir = path.join(PORTABLE, "scripts");
  await mkdir(scriptsDir, { recursive: true });
  await copyFile(path.join(ROOT, "scripts", "serve.mjs"), path.join(scriptsDir, "serve.mjs"));

  const bat = [
    "@echo off",
    "setlocal",
    "cd /d \"%~dp0\"",
    "where node >nul 2>nul",
    "if errorlevel 1 (",
    "  echo Node.js is required to run Bibmaxxing.",
    "  echo Download the LTS version from https://nodejs.org/en/download/",
    "  pause",
    "  exit /b 1",
    ")",
    "echo Starting Bibmaxxing...",
    "echo Use the Exit button in the app to close cleanly.",
    "node scripts\\serve.mjs auto --open --shutdown-token auto",
    "if errorlevel 1 pause",
    "",
  ].join("\r\n");
  await writeFile(path.join(PORTABLE, "Run Bibmaxxing.bat"), bat, "utf8");
}

async function writeReadme() {
  const text = [
    "Bibmaxxing Portable",
    "===================",
    "",
    "1. Double-click: Run Bibmaxxing.bat",
    "2. Your browser will open automatically.",
    "3. Use the Exit button in the app to close the local server cleanly.",
    "",
    "Notes:",
    "- Progress stays local in the browser's IndexedDB.",
    "- Export a backup from Manage before clearing browser data.",
    "- This portable folder excludes commercial/restricted reference PDFs.",
    "- If Windows asks what app to use, install Node.js LTS from https://nodejs.org/en/download/ and run again.",
    "",
  ].join("\r\n");
  await writeFile(path.join(PORTABLE, "README-FIRST.txt"), text, "utf8");
}

async function buildPortableFolder() {
  await rm(PORTABLE, { recursive: true, force: true });
  await mkdir(PORTABLE, { recursive: true });
  for (const item of TOP_LEVEL) {
    const src = path.join(ROOT, item);
    if (!existsSync(src)) continue;
    await copyTree(src, path.join(PORTABLE, item), item);
  }
  await writePortableRunner();
  await writeReadme();
}

try {
  console.log("Bibmaxxing one-click deploy");
  console.log(`Version: ${VERSION}`);
  run("Build Core/E5/E6", npmCmd(), ["run", "build:all"]);
  run("Test suite", npmCmd(), ["test"]);
  run("Strict data audit", npmCmd(), ["run", "audit:data:strict"]);
  run("ZIP packages", npmCmd(), ["run", "package:web:all"]);
  console.log("\n=== Portable folder ===");
  await buildPortableFolder();
  console.log(`Portable app ready: ${path.relative(ROOT, PORTABLE)}`);
  console.log(`Double-click: ${path.relative(ROOT, path.join(PORTABLE, "Run Bibmaxxing.bat"))}`);
} catch (e) {
  console.error("\nDeploy failed:", e.message);
  process.exit(1);
}
