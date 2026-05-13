#!/usr/bin/env node
// One-click deploy/launch contract.

import { existsSync } from "node:fs";
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

async function read(rel) {
  return readFile(path.join(ROOT, rel), "utf8");
}

const pkg = JSON.parse(await read("package.json"));
const app = await read("app.js");
const index = await read("index.html");
const serve = await read("scripts/serve.mjs");
const settings = await read("js/views/settings.js");

ok(pkg.scripts?.deploy === "node scripts/deploy.mjs", "package.json must expose npm run deploy");
ok(existsSync(path.join(ROOT, "Deploy Bibmaxxing.bat")), "root Deploy Bibmaxxing.bat must exist");
ok(existsSync(path.join(ROOT, "scripts", "deploy.mjs")), "scripts/deploy.mjs must exist");

ok(serve.includes("__bibmaxxing/shutdown"), "serve.mjs must expose a local shutdown endpoint");
ok(serve.includes("--shutdown-token"), "serve.mjs must support --shutdown-token");
ok(serve.includes("--open"), "serve.mjs must support --open");

ok(index.includes("exitAppBtn"), "index.html must include an Exit app button placeholder");
ok(app.includes("exitAppBtn"), "app.js must wire the Exit app button");
ok(app.includes("bibmaxxingExitToken"), "app.js must store the launcher shutdown token");
ok(app.includes("__bibmaxxing/shutdown"), "app.js must call the local shutdown endpoint");

ok(settings.includes("Deploy in one click"), "Manage packaging card must advertise one-click deploy");
ok(settings.includes("Deploy Bibmaxxing.bat"), "Manage packaging card must mention the deploy batch file");

if (failed) {
  console.error(`Deploy contract failed: ${failed} issue(s)`);
  process.exit(1);
}

console.log("Deploy contract OK");
