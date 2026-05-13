#!/usr/bin/env node
// Assigns `primaryObjective` and `objectiveTags[]` to every question in a Bib.
// Idempotent. Honors `objectiveLocked: true` on a question (skip).
//
// Heuristic:
//   1. REF_TO_OBJECTIVE: hand-curated sourceRef -> primary objective id.
//   2. Fallback for missing sourceRef: scan refs[] in order; use first match.
//   3. objectiveTags[]: union of (primary) ∪ (every objective whose sourceRefs[]
//      contains either q.sourceRef or any q.refs[] entry). Auto-derived from
//      bib.json so cross-objective coverage stays accurate when refs move.
//
// Usage:
//   node scripts/map-objectives.mjs                # default bib (CWT-E7)
//   node scripts/map-objectives.mjs --bib CWT-E7
//   node scripts/map-objectives.mjs --dry-run

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const args = parseArgs(process.argv.slice(2));

// Single canonical objective per source ref. When a ref's scope spans multiple
// objectives (e.g. BOOK-CEH covers system-hacking AND cryptography), pick the
// most-tested / most-frequent objective on the Bib's exam scope as primary.
// All other objectives that list this ref in sourceRefs[] are surfaced through
// objectiveTags[] automatically below.
const REF_TO_OBJECTIVE = {
  // ---- Offensive Cyber Operations ----
  "BOOK-ADV-TRADECRAFT":           "obj-oco-offensive-tradecraft",
  "BOOK-CEH":                      "obj-oco-system-hacking",
  "BOOK-CYBER-OPS":                "obj-oco-attack-techniques",
  "BOOK-GOOGLE-HACKING":           "obj-oco-recon-enum",
  "BOOK-GRAY-HAT":                 "obj-oco-system-hacking",
  "BOOK-HACKER-TECH":              "obj-oco-system-hacking",
  "BOOK-RTFM":                     "obj-oco-attack-techniques",
  "JCAC-ACTIVE-EXPLOIT":           "obj-oco-recon-enum",
  "OPTASK-CYBERSPACE-OPS":         "obj-oco-deconfliction-rfs",
  "USCC-INST-3000.14A":            "obj-oco-deconfliction-rfs",
  "USCYBERCOM-GENADMIN-22-0120":   "obj-oco-deconfliction-rfs",
  "USSID-104":                     "obj-oco-deconfliction-rfs",

  // ---- System Fundamentals ----
  "BOOK-ARCH-COMP-HW":             "obj-sys-architecture",
  "BOOK-ASM-PROG":                 "obj-sys-architecture",
  "BOOK-AUTO-BORING-PY":           "obj-sys-programming",
  "BOOK-CCNA":                     "obj-sys-networking",
  "BOOK-CPP-HTP":                  "obj-sys-programming",
  "BOOK-CWNA":                     "obj-sys-networking",
  "BOOK-OS-CONCEPTS":              "obj-sys-os-internals",
  "BOOK-TCPIP-GUIDE":              "obj-sys-networking",
  "BOOK-WIN-CLI-PC":               "obj-sys-admin-cli",
  "BOOK-WIN-INTERNALS-1":          "obj-sys-os-internals",
  "BOOK-WIN-INTERNALS-2":          "obj-sys-os-internals",
  "JCAC-COMP-ORG-ARCH":            "obj-sys-architecture",
  "JCAC-NETWORKING":               "obj-sys-networking",
  "JCAC-OS":                       "obj-sys-os-internals",
  "JCAC-PROG-FUND":                "obj-sys-programming",
  "JCAC-PROG-SCRIPT":              "obj-sys-programming",
  "JCAC-PROTOCOL-ANALYSIS":        "obj-sys-protocol-analysis",
  "JCAC-UNIX-LINUX":               "obj-sys-os-internals",
  "JCAC-WINDOWS":                  "obj-sys-os-internals",

  // ---- Defensive Cyber Operations ----
  "BOOK-ART-MEM-FORENSICS":        "obj-dco-memory-forensics",
  "BOOK-BTFM":                     "obj-dco-network-intrusion",
  "BOOK-NET-INTRUSION":            "obj-dco-network-intrusion",
  "BOOK-PRACTICAL-MEM":            "obj-dco-memory-forensics",
  "CFCOE-V4.1":                    "obj-dco-defensive-teams",
  "CJCSI-6510.01F":                "obj-dco-incident-handling",
  "CJCSM-6510.01B":                "obj-dco-incident-handling",
  "CPT-ORG-3-33.4":                "obj-dco-defensive-teams",
  "DCO-CTF-MSG-2011":              "obj-dco-defensive-teams",
  "FDCD-2017":                     "obj-dco-defensive-teams",
  "JCAC-FORENSIC-MAL":             "obj-dco-memory-forensics",
  "NCDOC-TF1020-NRT-RFS":          "obj-dco-defensive-teams",
  "NWP-3-12":                      "obj-dco-navy-cyberspace-ops",

  // ---- Research and Development ----
  "BOOK-REVERSE-ENG":              "obj-rnd-reverse-engineering",

  // ---- Cyber Planning ----
  "CJCSI-3121.01B":                "obj-plan-roe",
  "CJCSI-3370.01B":                "obj-plan-targeting",
  "JP-2-01":                       "obj-plan-intel-support",
  "JP-3-0":                        "obj-plan-joint-planning",
  "JP-3-09":                       "obj-plan-fires-cnt",
  "JP-3-12":                       "obj-plan-joint-cyber-doctrine",
  "JP-3-13":                       "obj-plan-joint-cyber-doctrine",
  "JP-3-25":                       "obj-plan-fires-cnt",
  "JP-3-60":                       "obj-plan-targeting",
  "JP-5-0":                        "obj-plan-joint-planning",
  "NTTP-3-13.1":                   "obj-plan-naval-info-ops",
  "NTTP-3-13.2":                   "obj-plan-naval-info-ops",
  "NWP-5-01":                      "obj-plan-naval-planning",

  // ---- Security and Administration ----
  "BOOK-CISSP":                    "obj-sec-cert-fundamentals",
  "BOOK-SEC-PLUS-401":             "obj-sec-cert-fundamentals",
  "BOOK-SEC-PLUS-601":             "obj-sec-cert-fundamentals",
  "CRITIC-HANDBOOK":               "obj-sec-classified-reporting",
  "DEPLOYABLE-SEC-TRAINER":        "obj-sec-security-training",
  "DJSIG":                         "obj-sec-info-security",
  "DODM-5105.21-V1":               "obj-sec-sci-admin",
  "SECNAVINST-5510.30C":           "obj-sec-personnel-security",
  "SECNAVINST-5510.36B":           "obj-sec-info-security",
  "USSID-109":                     "obj-sec-sigint-compliance-substitute",
  "USSID-18":                      "obj-sec-sigint-compliance",
  "USSID-201":                     "obj-sec-sigint-compliance-substitute",
  "USSID-6000":                    "obj-sec-sigint-compliance",
};

async function main() {
  const bibDir = path.join(ROOT, "data", "bibs", args.bib);
  const bibPath = path.join(bibDir, "bib.json");
  const qPath = path.join(bibDir, "questions.json");

  const bib = JSON.parse(await readFile(bibPath, "utf8"));
  if (!Array.isArray(bib.objectives) || bib.objectives.length === 0) {
    console.error(`map-objectives: ${args.bib} has no objectives[] in bib.json. Add them before running this mapper.`);
    process.exit(1);
  }
  const objIds = new Set(bib.objectives.map((o) => o.id));

  // Build refId -> Set<objectiveId> from bib.json. This is the source of truth
  // for sectionTags / objectiveTags cross-references.
  const refToObjectives = new Map();
  for (const o of bib.objectives) {
    for (const r of (o.sourceRefs || [])) {
      if (!refToObjectives.has(r)) refToObjectives.set(r, new Set());
      refToObjectives.get(r).add(o.id);
    }
  }

  // Sanity-check the canonical primary map against bib.json.
  for (const [r, objId] of Object.entries(REF_TO_OBJECTIVE)) {
    if (!objIds.has(objId)) {
      console.error(`map-objectives: REF_TO_OBJECTIVE points "${r}" -> "${objId}" but that objective is not in bib.json`);
      process.exit(1);
    }
  }

  const questions = JSON.parse(await readFile(qPath, "utf8"));

  const stats = {
    total: questions.length,
    mappedBySourceRef: 0,
    mappedByRefsFirst: 0,
    locked: 0,
    unchanged: 0,
    changed: 0,
    unmapped: [],
  };

  for (const q of questions) {
    if (q.objectiveLocked === true) {
      stats.locked++;
      stats.unchanged++;
      continue;
    }

    let primary = null;
    if (q.sourceRef && REF_TO_OBJECTIVE[q.sourceRef]) {
      primary = REF_TO_OBJECTIVE[q.sourceRef];
      stats.mappedBySourceRef++;
    } else if (Array.isArray(q.refs)) {
      for (const r of q.refs) {
        if (REF_TO_OBJECTIVE[r]) { primary = REF_TO_OBJECTIVE[r]; stats.mappedByRefsFirst++; break; }
      }
    }

    if (!primary) {
      stats.unmapped.push({ id: q.id, sourceRef: q.sourceRef, refs: q.refs });
      continue;
    }
    if (!objIds.has(primary)) {
      stats.unmapped.push({ id: q.id, reason: "objective-not-in-bib", proposed: primary });
      continue;
    }

    // objectiveTags[]: every objective whose sourceRefs[] contains sourceRef or
    // any refs[] entry. Always includes `primary`.
    const tags = new Set([primary]);
    const candidates = new Set();
    if (q.sourceRef) candidates.add(q.sourceRef);
    for (const r of (q.refs || [])) candidates.add(r);
    for (const r of candidates) {
      const objs = refToObjectives.get(r);
      if (!objs) continue;
      for (const id of objs) tags.add(id);
    }

    const newTags = Array.from(tags).sort();
    const oldPrimary = q.primaryObjective;
    const oldTags = Array.isArray(q.objectiveTags) ? [...q.objectiveTags].sort() : null;
    if (oldPrimary === primary && oldTags && oldTags.length === newTags.length && oldTags.every((v, i) => v === newTags[i])) {
      stats.unchanged++;
    } else {
      q.primaryObjective = primary;
      q.objectiveTags = newTags;
      stats.changed++;
    }
  }

  if (!args.dryRun) {
    await writeFile(qPath, JSON.stringify(questions, null, 2) + "\n", "utf8");
  }

  console.log("=== map-objectives ===");
  console.log(`bib: ${args.bib}`);
  console.log(`questions total:        ${stats.total}`);
  console.log(`mapped via sourceRef:   ${stats.mappedBySourceRef}`);
  console.log(`mapped via refs[0..]:   ${stats.mappedByRefsFirst}`);
  console.log(`already locked:         ${stats.locked}`);
  console.log(`unchanged:              ${stats.unchanged}`);
  console.log(`changed:                ${stats.changed}${args.dryRun ? " (dry-run)" : ""}`);
  console.log(`unmapped:               ${stats.unmapped.length}`);
  if (stats.unmapped.length) {
    for (const u of stats.unmapped.slice(0, 25)) console.log("  -", JSON.stringify(u));
    if (stats.unmapped.length > 25) console.log(`  ... and ${stats.unmapped.length - 25} more`);
    process.exit(2);
  }

  // Coverage report: which objectives have questions, which don't.
  const counts = new Map();
  for (const o of bib.objectives) counts.set(o.id, 0);
  for (const q of questions) {
    if (q.primaryObjective) counts.set(q.primaryObjective, (counts.get(q.primaryObjective) || 0) + 1);
  }
  const empty = [...counts.entries()].filter(([, n]) => n === 0).map(([id]) => id);
  if (empty.length) {
    console.log("\nObjectives with zero questions (coverage holes):");
    for (const id of empty) console.log("  -", id);
  } else {
    console.log("\nEvery objective has at least one question.");
  }
}

function parseArgs(argv) {
  const out = { bib: "CWT-E7", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--bib") out.bib = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "-h" || a === "--help") {
      console.log("Usage: node scripts/map-objectives.mjs [--bib <id>] [--dry-run]");
      process.exit(0);
    }
  }
  return out;
}

main().catch((e) => { console.error("map-objectives fatal:", e); process.exit(1); });
