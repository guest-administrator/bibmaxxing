#!/usr/bin/env node
// Narrow UI contract checks for the CWT track polish surfaced in smoke review.
//
// This is intentionally static: the project has no DOM test harness, and these
// assertions guard the copy/CTA contracts that were easy to regress.

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

const settings = await read("js/views/settings.js");
const dashboard = await read("js/views/dashboard.js");

ok(settings.includes("Profile sheet required (provisional)"),
  "Manage > Data health must label unset E5 weights as profile-sheet-required/provisional");
ok(settings.includes("Unset sourceConfidence means source-verified"),
  "Manage > Data health must explain that raw '(unset)' sourceConfidence is not a defect");

ok(dashboard.includes("Start core drill"),
  "Core dashboard must offer a drill CTA instead of a mock-exam CTA");
ok(dashboard.includes("if (onExamTrack)"),
  "Dashboard readiness actions must branch on exam-track status");
ok(!dashboard.includes("actions.appendChild(examBtn);\n  if (onExamTrack"),
  "Dashboard must not append New mock exam before checking onExamTrack");

if (failed) {
  console.error(`UI polish contract failed: ${failed} issue(s)`);
  process.exit(1);
}

console.log("UI polish contract OK");
