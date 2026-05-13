#!/usr/bin/env node
// Bibmaxxing web packager.
// Produces one or more portable ZIPs in dist/ with a package manifest
// describing app version, Bib cycle, counts, excluded references, and SHA-256
// checksums for every included file.
//
// Package types:
//   app     - source app only (no data, no PDFs). Public-safe to redistribute.
//   data    - data pack: bib.json, questions.json, study guides + images,
//             MANIFEST.json. Includes a reference PDF only when its bib.json
//             entry has `redistributable: true`. Otherwise PDFs are excluded
//             with a reason recorded in the package manifest.
//   bundle  - app + data combined. NOT for redistribution unless every ref
//             is `redistributable: true`. Local-only references can be added
//             with --include-local-references (bundle type only).
//
// Usage:
//   node scripts/package-web.mjs                            # `app` pack
//   node scripts/package-web.mjs --type app|data|bundle|all
//   node scripts/package-web.mjs --type bundle --include-local-references
//   node scripts/package-web.mjs --out dist
//
// Legal posture: default builds NEVER redistribute commercial or restricted
// content. Every excluded reference is recorded in the manifest with a reason.
// `--include-local-references` is operator-only — it bundles non-classified
// `localPath` files for personal use and stamps the manifest with
// `redistribution: "local-only"`. It is refused for `--type data`.

import { readFile, readdir, stat, mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";

import { createZip } from "./lib/zip.mjs";

const ROOT = process.cwd();
const args = parseArgs(process.argv.slice(2));

const APP_FILES = [
  "index.html",
  "app.js",
  "app.css",
  "README.md",
  "serve.bat",
  "package.json",
];
const APP_DIRS = ["js", "scripts", "tests"];

const DATA_BASE = path.join("data", "bibs");

const SKIP_NAMES = new Set([".git", ".claude", ".codex", "node_modules",
                            "dist", "_screenshots", "__pycache__", ".DS_Store",
                            "Thumbs.db"]);

async function main() {
  const outDir = path.resolve(ROOT, args.out);
  await mkdir(outDir, { recursive: true });

  const types = args.type === "all" ? ["app", "data", "bundle"] : [args.type];

  const appVersion = await readAppVersion();
  const generatedAt = new Date().toISOString();
  const bibs = await collectBibsMeta();

  for (const type of types) {
    console.log(`\nBuilding ${type} package...`);
    const { manifest, zipName } = await buildPackage({
      type, appVersion, generatedAt, bibs, outDir,
    });
    const manifestPath = path.join(outDir, `${zipName.replace(/\.zip$/, "")}.manifest.json`);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`  Manifest: ${path.relative(ROOT, manifestPath)}`);
    if (manifest.excludedReferences?.length) {
      console.log(`  Excluded ${manifest.excludedReferences.length} reference(s); see manifest.`);
    }
  }
}

async function buildPackage({ type, appVersion, generatedAt, bibs, outDir }) {
  // Refuse the local-references opt-in on anything but a bundle build —
  // that flag exists only for personal-use bundles, never for redistributable
  // data packs.
  if (args.includeLocalReferences && type !== "bundle") {
    console.error(
      `package-web: --include-local-references is only valid with --type bundle, ` +
      `not --type ${type}. Data packs must remain redistribution-safe.`
    );
    process.exit(2);
  }

  const zip = createZip();
  const checksums = [];
  const excludedReferences = [];
  const includedLocalReferences = [];
  const counts = { files: 0, bytes: 0, refs: 0, questions: 0, guides: 0, images: 0 };

  if (type === "app" || type === "bundle") {
    for (const rel of APP_FILES) {
      if (existsSync(path.join(ROOT, rel))) await addFile(zip, ROOT, rel, checksums, counts);
    }
    for (const dir of APP_DIRS) {
      await addDir(zip, ROOT, dir, checksums, counts);
    }
  }

  if (type === "data" || type === "bundle") {
    // Always include the bib registry.
    const registry = path.join(DATA_BASE, "index.json");
    if (existsSync(path.join(ROOT, registry))) await addFile(zip, ROOT, registry, checksums, counts);
    // README in data/ if present.
    const dataReadme = path.join("data", "README.md");
    if (existsSync(path.join(ROOT, dataReadme))) await addFile(zip, ROOT, dataReadme, checksums, counts);

    for (const b of bibs) {
      await addBibData(zip, b, { checksums, counts, excludedReferences, includedLocalReferences });
    }
  }

  const packageType = type;
  const zipName = `bibmaxxing-${packageType}-${appVersion}.zip`;
  const zipPath = path.join(outDir, zipName);

  // Determine redistribution posture.
  // - app: safe to redistribute (no data, no PDFs).
  // - data: safe — only refs flagged `redistributable: true` ship; default zero.
  // - bundle: safe IFF no local references were forced in via the opt-in flag.
  let redistribution;
  if (type === "app") redistribution = "redistributable";
  else if (type === "data") redistribution = "redistributable";
  else if (type === "bundle" && includedLocalReferences.length > 0) redistribution = "local-only";
  else redistribution = "redistributable";

  const note =
    type === "app"
      ? "App-only package: no Bib data and no reference PDFs. Safe to redistribute."
      : redistribution === "local-only"
        ? "LOCAL-ONLY package. Includes non-classified local reference files for the operator's personal use. Do not redistribute. Review includedLocalReferences[] before sharing with anyone."
        : "Data/bundle package. Reference PDFs are included only when bib.json marks the ref `redistributable: true`. Review excludedReferences[] before sharing.";

  // The embedded manifest counts itself as one file, so callers see a count
  // that matches what they actually find inside the ZIP. The embedded manifest
  // is not listed in checksums[] because its checksum would be self-referential.
  const manifestSelfEntry = "package-manifest.json";
  counts.files += 1;

  // First pass: manifest meant for embedding inside the ZIP. zipSize/zipPath are
  // unknown at this point (chicken-and-egg with the ZIP wrapping the manifest),
  // so we leave them null and explain the convention in `note`.
  const embeddedManifest = {
    appVersion,
    generatedAt,
    packageType,
    redistribution,
    bibs,
    counts,
    excludedReferences,
    ...(includedLocalReferences.length ? { includedLocalReferences } : {}),
    checksums,
    manifestEntry: manifestSelfEntry,
    manifestSelfChecksum: null,
    zipSize: null,
    zipPath: null,
    note,
  };
  const manifestBuf = Buffer.from(JSON.stringify(embeddedManifest, null, 2), "utf8");
  zip.add(manifestSelfEntry, manifestBuf);

  await zip.write(zipPath);
  const st = await stat(zipPath);
  console.log(`  -> ${path.relative(ROOT, zipPath)} (${formatBytes(st.size)}, ${counts.files} files; redistribution=${redistribution})`);

  // External manifest is identical to the embedded one PLUS final zip metadata
  // and the checksum of the embedded manifest blob itself.
  const externalManifest = {
    ...embeddedManifest,
    manifestSelfChecksum: createHash("sha256").update(manifestBuf).digest("hex"),
    zipSize: st.size,
    zipPath: path.relative(ROOT, zipPath).split(path.sep).join("/"),
  };

  return { manifest: externalManifest, zipName };
}

async function addBibData(zip, bibMeta, ctx) {
  const bibDir = bibMeta.path; // e.g. "data/bibs/CWT-E7"
  const absBibDir = path.join(ROOT, bibDir);
  const contentBibDir = (bibMeta.contentBasePath || bibDir).replace(/\/$/, "");
  const absContentBibDir = path.join(ROOT, contentBibDir);

  // Core data files.
  for (const rel of ["bib.json", "questions.json", "BIB-SCOPE.md"]) {
    const p = path.join(bibDir, rel);
    if (existsSync(path.join(ROOT, p))) await addFile(zip, ROOT, p, ctx.checksums, ctx.counts);
  }

  // Study guides: top-level .md files.
  const guidesDir = path.join(bibDir, "study-guides");
  if (existsSync(path.join(ROOT, guidesDir))) {
    const entries = await readdir(path.join(ROOT, guidesDir), { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && !SKIP_NAMES.has(e.name)) {
        const p = path.join(guidesDir, e.name);
        await addFile(zip, ROOT, p, ctx.checksums, ctx.counts);
        if (e.name.endsWith(".md")) ctx.counts.guides++;
      }
    }
  }

  // Study-guide images. Canonical path is `study-guides/images/`. Older Bibs
  // may have used `study-guides/img/` — include both if present so packages
  // never silently drop diagrams referenced from a guide's markdown.
  for (const imgRel of ["images", "img"]) {
    const imgDir = path.join(bibDir, "study-guides", imgRel);
    if (existsSync(path.join(ROOT, imgDir))) {
      const before = ctx.counts.files;
      await addDir(zip, ROOT, imgDir, ctx.checksums, ctx.counts);
      ctx.counts.images += (ctx.counts.files - before);
    }
  }

  // References directory: ship the curated MANIFEST.json but never blanket-ship
  // PDFs. Inspect bib.json to gate each reference file individually below.
  const refsDir = path.join(bibDir, "references");
  if (existsSync(path.join(ROOT, refsDir))) {
    const manifestFile = path.join(refsDir, "MANIFEST.json");
    if (existsSync(path.join(ROOT, manifestFile))) await addFile(zip, ROOT, manifestFile, ctx.checksums, ctx.counts);
  }

  const bib = JSON.parse(await readFile(path.join(absBibDir, "bib.json"), "utf8"));
  const refs = bib.references || [];
  ctx.counts.refs += refs.length;
  const qFile = path.join(absBibDir, "questions.json");
  if (existsSync(qFile)) {
    const qs = JSON.parse(await readFile(qFile, "utf8"));
    if (Array.isArray(qs)) ctx.counts.questions += qs.length;
  }

  for (const ref of refs) {
    const lp = ref.localPath;
    if (!lp) continue;
    const inside = path.join(contentBibDir, lp).split(path.sep).join("/");
    const onDisk = path.join(absContentBibDir, lp);
    if (!existsSync(onDisk)) {
      ctx.excludedReferences.push({ bibId: bibMeta.id, id: ref.id, reason: "localPath-missing", localPath: lp });
      continue;
    }
    // Public redistribution gate. The default is conservative: include only
    // refs explicitly flagged `redistributable: true` in bib.json.
    const isRedistributable = ref.redistributable === true;
    // Operator-only opt-in: bundle non-classified local reference files for
    // personal use. Never crosses to data packs — gated above in buildPackage.
    const isLocalOptIn = !isRedistributable &&
                         args.includeLocalReferences &&
                         ref.availability !== "classified" &&
                         ref.availability !== "cui-fouo" &&
                         ref.availability !== "restricted";

    if (!isRedistributable && !isLocalOptIn) {
      ctx.excludedReferences.push({
        bibId: bibMeta.id,
        id: ref.id,
        reason:
          ref.availability === "classified" ? "restricted-classified"
          : ref.availability === "cui-fouo" ? "restricted-cui-fouo"
          : ref.availability === "restricted" ? "restricted"
          : ref.redistributable === undefined ? "not-flagged-redistributable"
          : "not-redistributable",
        availability: ref.availability,
        localPath: lp,
      });
      continue;
    }

    await addFile(zip, ROOT, inside, ctx.checksums, ctx.counts);
    if (isLocalOptIn) {
      ctx.includedLocalReferences.push({
        bibId: bibMeta.id,
        id: ref.id,
        availability: ref.availability,
        localPath: lp,
        reason: "operator-bundled-via-include-local-references",
      });
    }
  }
}

async function addDir(zip, root, relDir, checksums, counts) {
  const abs = path.join(root, relDir);
  if (!existsSync(abs)) return;
  const entries = await readdir(abs, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_NAMES.has(e.name)) continue;
    const rel = path.join(relDir, e.name);
    if (e.isDirectory()) await addDir(zip, root, rel, checksums, counts);
    else if (e.isFile()) await addFile(zip, root, rel, checksums, counts);
  }
}

async function addFile(zip, root, rel, checksums, counts) {
  const abs = path.join(root, rel);
  const data = await readFile(abs);
  const hash = createHash("sha256").update(data).digest("hex");
  const name = rel.split(path.sep).join("/");
  // Skip PDFs and other large binary types when storing in deflate would just waste time;
  // signal `store` for files already compressed.
  const ext = path.extname(name).toLowerCase();
  const precompressed = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".zip", ".gz", ".woff", ".woff2"]);
  zip.add(name, data, { store: precompressed.has(ext) });
  checksums.push({ path: name, sha256: hash, bytes: data.length });
  counts.files++;
  counts.bytes += data.length;
}

async function readAppVersion() {
  const pkgPath = path.join(ROOT, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
      if (pkg.version) return String(pkg.version);
    } catch { /* fallthrough */ }
  }
  return "0.0.0";
}

async function collectBibsMeta() {
  const idx = path.join(ROOT, DATA_BASE, "index.json");
  if (!existsSync(idx)) return [];
  const reg = JSON.parse(await readFile(idx, "utf8"));
  const out = [];
  for (const entry of reg.bibs || []) {
    const bibDir = entry.path.replace(/\/$/, "");
    const bibJson = path.join(ROOT, bibDir, "bib.json");
    let referenceCount = 0;
    let questionCount = 0;
    if (existsSync(bibJson)) {
      const bib = JSON.parse(await readFile(bibJson, "utf8"));
      referenceCount = (bib.references || []).length;
    }
    const qJson = path.join(ROOT, bibDir, "questions.json");
    if (existsSync(qJson)) {
      try {
        const qs = JSON.parse(await readFile(qJson, "utf8"));
        if (Array.isArray(qs)) questionCount = qs.length;
      } catch { /* leave 0 */ }
    }
    out.push({
      id: entry.id,
      rating: entry.rating,
      paygrade: entry.paygrade,
      cycle: entry.cycle,
      path: bibDir,
      track: entry.track,
      examType: entry.examType,
      ...(entry.contentBaseBib ? { contentBaseBib: entry.contentBaseBib } : {}),
      ...(entry.contentBasePath ? { contentBasePath: entry.contentBasePath.replace(/\/$/, "") } : {}),
      referenceCount,
      questionCount,
    });
  }
  return out;
}

function parseArgs(argv) {
  const out = { type: "app", out: "dist", includeLocalReferences: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--type") out.type = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--include-local-references") out.includeLocalReferences = true;
    else if (a === "--include-restricted") {
      // Old flag name — refuse loudly rather than silently doing something
      // weaker than the operator expects.
      console.error(
        "package-web: --include-restricted has been removed. " +
        "Use --include-local-references (bundle type only). " +
        "The new flag only bundles non-classified local reference files for personal use " +
        "and stamps the manifest with redistribution=local-only."
      );
      process.exit(2);
    }
    else if (a === "-h" || a === "--help") {
      console.log([
        "Usage: node scripts/package-web.mjs [options]",
        "",
        "  --type app|data|bundle|all   Package type (default: app).",
        "  --out <dir>                  Output directory (default: dist).",
        "  --include-local-references   Bundle non-classified local reference",
        "                               files for personal use. Bundle type only;",
        "                               refused for --type data. Stamps the",
        "                               manifest with redistribution=local-only.",
        "",
        "Default builds NEVER redistribute commercial or restricted content.",
        "A reference PDF is included in `data`/`bundle` builds only when its",
        "bib.json entry has `redistributable: true`. Review the manifest's",
        "excludedReferences[] before sharing any archive.",
      ].join("\n"));
      process.exit(0);
    }
  }
  const valid = new Set(["app", "data", "bundle", "all"]);
  if (!valid.has(out.type)) {
    console.error(`unknown --type "${out.type}". valid: ${[...valid].join(", ")}`);
    process.exit(2);
  }
  // The `all` build cannot honor --include-local-references because it also
  // builds a `data` pack, which must stay redistribution-safe.
  if (out.includeLocalReferences && out.type === "all") {
    console.error(
      "package-web: --include-local-references cannot be combined with --type all " +
      "because the `all` build includes a data pack, which must stay redistribution-safe. " +
      "Build the bundle separately: --type bundle --include-local-references."
    );
    process.exit(2);
  }
  return out;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MiB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
}

main().catch((e) => {
  console.error("package-web: fatal:", e);
  process.exit(1);
});
