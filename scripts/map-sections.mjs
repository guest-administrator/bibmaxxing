#!/usr/bin/env node
// Assigns `primarySection` and `sectionTags[]` to every question in a Bib.
// Idempotent: re-running rewrites the same values; existing user overrides
// (questions whose section was manually edited) are NOT touched if the
// frontmatter `sectionLocked: true` is present on a question.
//
// Heuristic:
//   1. Look up the question's sourceRef in REF_TO_SECTION (authoritative).
//   2. Fall back to refs[0] if sourceRef has no entry.
//   3. Fall back to topic-based scan over the active Bib's section topicTags.
//   4. If nothing matches: leave primarySection unset; report at end.
//
// Usage:
//   node scripts/map-sections.mjs                   # default bib (CWT-E7)
//   node scripts/map-sections.mjs --bib CWT-E7
//   node scripts/map-sections.mjs --dry-run         # show what would change

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const args = parseArgs(process.argv.slice(2));

// Canonical section assignment by sourceRef. Maintained by hand; review on
// each bib.json change. The audit script flags any unmapped refs.
const REF_TO_SECTION = {
  // ---- Offensive Cyber Operations ----
  "BOOK-ADV-TRADECRAFT":           "offensive-cyber-ops",
  "BOOK-CEH":                      "offensive-cyber-ops",
  "BOOK-CYBER-OPS":                "offensive-cyber-ops",
  "BOOK-GOOGLE-HACKING":           "offensive-cyber-ops",
  "BOOK-GRAY-HAT":                 "offensive-cyber-ops",
  "BOOK-HACKER-TECH":              "offensive-cyber-ops",
  "BOOK-RTFM":                     "offensive-cyber-ops",
  "JCAC-ACTIVE-EXPLOIT":           "offensive-cyber-ops",
  "OPTASK-CYBERSPACE-OPS":         "offensive-cyber-ops",
  "USCC-INST-3000.14A":            "offensive-cyber-ops",
  "USCYBERCOM-GENADMIN-22-0120":   "offensive-cyber-ops",
  "USSID-104":                     "offensive-cyber-ops",

  // ---- System Fundamentals and Evaluations ----
  "BOOK-ARCH-COMP-HW":             "system-fundamentals",
  "BOOK-ASM-PROG":                 "system-fundamentals",
  "BOOK-AUTO-BORING-PY":           "system-fundamentals",
  "BOOK-CCNA":                     "system-fundamentals",
  "BOOK-CPP-HTP":                  "system-fundamentals",
  "BOOK-CWNA":                     "system-fundamentals",
  "BOOK-OS-CONCEPTS":              "system-fundamentals",
  "BOOK-TCPIP-GUIDE":              "system-fundamentals",
  "BOOK-WIN-CLI-PC":               "system-fundamentals",
  "BOOK-WIN-INTERNALS-1":          "system-fundamentals",
  "BOOK-WIN-INTERNALS-2":          "system-fundamentals",
  "JCAC-COMP-ORG-ARCH":            "system-fundamentals",
  "JCAC-NETWORKING":               "system-fundamentals",
  "JCAC-OS":                       "system-fundamentals",
  "JCAC-PROG-FUND":                "system-fundamentals",
  "JCAC-PROG-SCRIPT":              "system-fundamentals",
  "JCAC-PROTOCOL-ANALYSIS":        "system-fundamentals",
  "JCAC-UNIX-LINUX":               "system-fundamentals",
  "JCAC-WINDOWS":                  "system-fundamentals",

  // ---- Defensive Cyber Operations ----
  "BOOK-ART-MEM-FORENSICS":        "defensive-cyber-ops",
  "BOOK-BTFM":                     "defensive-cyber-ops",
  "BOOK-NET-INTRUSION":            "defensive-cyber-ops",
  "BOOK-PRACTICAL-MEM":            "defensive-cyber-ops",
  "CFCOE-V4.1":                    "defensive-cyber-ops",
  "CJCSI-6510.01F":                "defensive-cyber-ops",
  "CJCSM-6510.01B":                "defensive-cyber-ops",
  "CPT-ORG-3-33.4":                "defensive-cyber-ops",
  "DCO-CTF-MSG-2011":              "defensive-cyber-ops",
  "FDCD-2017":                     "defensive-cyber-ops",
  "JCAC-FORENSIC-MAL":             "defensive-cyber-ops",
  "NCDOC-TF1020-NRT-RFS":          "defensive-cyber-ops",
  "NWP-3-12":                      "defensive-cyber-ops",

  // ---- Research and Development ----
  "BOOK-REVERSE-ENG":              "research-development",

  // ---- Cyber Planning ----
  "CJCSI-3121.01B":                "cyber-planning",
  "CJCSI-3370.01B":                "cyber-planning",
  "JP-2-01":                       "cyber-planning",
  "JP-3-0":                        "cyber-planning",
  "JP-3-09":                       "cyber-planning",
  "JP-3-12":                       "cyber-planning",
  "JP-3-13":                       "cyber-planning",
  "JP-3-25":                       "cyber-planning",
  "JP-3-60":                       "cyber-planning",
  "JP-5-0":                        "cyber-planning",
  "NTTP-3-13.1":                   "cyber-planning",
  "NTTP-3-13.2":                   "cyber-planning",
  "NWP-5-01":                      "cyber-planning",

  // ---- Security and Administration ----
  "BOOK-CISSP":                    "security-administration",
  "BOOK-SEC-PLUS-401":             "security-administration",
  "BOOK-SEC-PLUS-601":             "security-administration",
  "CRITIC-HANDBOOK":               "security-administration",
  "DEPLOYABLE-SEC-TRAINER":        "security-administration",
  "DJSIG":                         "security-administration",
  "DODM-5105.21-V1":               "security-administration",
  "SECNAVINST-5510.30C":           "security-administration",
  "SECNAVINST-5510.36B":           "security-administration",
  "USSID-109":                     "security-administration",
  "USSID-18":                      "security-administration",
  "USSID-201":                     "security-administration",
  "USSID-6000":                    "security-administration",
};

async function main() {
  const bibDir = path.join(ROOT, "data", "bibs", args.bib);
  const bibPath = path.join(bibDir, "bib.json");
  const qPath = path.join(bibDir, "questions.json");

  const bib = JSON.parse(await readFile(bibPath, "utf8"));
  const questions = JSON.parse(await readFile(qPath, "utf8"));

  if (!Array.isArray(bib.sections)) {
    console.error(`map-sections: ${args.bib} has no sections[] in bib.json. Run the section-metadata patch first.`);
    process.exit(1);
  }

  const sectionIds = new Set(bib.sections.map((s) => s.id));
  const topicIndex = new Map(); // topic -> section id
  for (const s of bib.sections) for (const t of s.topicTags || []) topicIndex.set(t, s.id);

  const stats = {
    total: questions.length,
    mappedBySourceRef: 0,
    mappedByRefsFirst: 0,
    mappedByTopic: 0,
    locked: 0,
    unchanged: 0,
    changed: 0,
    unmapped: [],
  };

  for (const q of questions) {
    if (q.sectionLocked === true) {
      stats.locked++;
      stats.unchanged++;
      continue;
    }

    let primary = null;
    if (q.sourceRef && REF_TO_SECTION[q.sourceRef]) {
      primary = REF_TO_SECTION[q.sourceRef];
      stats.mappedBySourceRef++;
    } else if (Array.isArray(q.refs)) {
      for (const r of q.refs) {
        if (REF_TO_SECTION[r]) { primary = REF_TO_SECTION[r]; stats.mappedByRefsFirst++; break; }
      }
    }

    if (!primary && Array.isArray(q.topics)) {
      for (const t of q.topics) {
        if (topicIndex.has(t)) { primary = topicIndex.get(t); stats.mappedByTopic++; break; }
      }
    }

    if (!primary) {
      stats.unmapped.push({ id: q.id, sourceRef: q.sourceRef, refs: q.refs, topics: q.topics });
      continue;
    }
    if (!sectionIds.has(primary)) {
      stats.unmapped.push({ id: q.id, reason: "section-not-in-bib", proposed: primary });
      continue;
    }

    // sectionTags[]: union of primary plus any other sections suggested by
    // refs[] entries (cross-section coverage) and matching topic tags.
    const tags = new Set([primary]);
    for (const r of (q.refs || [])) {
      const s = REF_TO_SECTION[r];
      if (s && sectionIds.has(s)) tags.add(s);
    }
    for (const t of (q.topics || [])) {
      const s = topicIndex.get(t);
      if (s) tags.add(s);
    }

    const newTags = Array.from(tags).sort();
    const oldPrimary = q.primarySection;
    const oldTags = Array.isArray(q.sectionTags) ? [...q.sectionTags].sort() : null;

    if (oldPrimary === primary && oldTags && oldTags.length === newTags.length && oldTags.every((v, i) => v === newTags[i])) {
      stats.unchanged++;
    } else {
      q.primarySection = primary;
      q.sectionTags = newTags;
      stats.changed++;
    }
  }

  if (!args.dryRun) {
    await writeFile(qPath, JSON.stringify(questions, null, 2) + "\n", "utf8");
  }

  console.log("=== map-sections ===");
  console.log(`bib: ${args.bib}`);
  console.log(`questions total:        ${stats.total}`);
  console.log(`mapped via sourceRef:   ${stats.mappedBySourceRef}`);
  console.log(`mapped via refs[0..]:   ${stats.mappedByRefsFirst}`);
  console.log(`mapped via topic fall:  ${stats.mappedByTopic}`);
  console.log(`already locked:         ${stats.locked}`);
  console.log(`unchanged:              ${stats.unchanged}`);
  console.log(`changed:                ${stats.changed}${args.dryRun ? " (dry-run)" : ""}`);
  console.log(`unmapped:               ${stats.unmapped.length}`);
  if (stats.unmapped.length) {
    for (const u of stats.unmapped.slice(0, 25)) console.log("  -", JSON.stringify(u));
    if (stats.unmapped.length > 25) console.log(`  ... and ${stats.unmapped.length - 25} more`);
    process.exit(2);
  }
}

function parseArgs(argv) {
  const out = { bib: "CWT-E7", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--bib") out.bib = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "-h" || a === "--help") {
      console.log("Usage: node scripts/map-sections.mjs [--bib <id>] [--dry-run]");
      process.exit(0);
    }
  }
  return out;
}

main().catch((e) => { console.error("map-sections fatal:", e); process.exit(1); });
