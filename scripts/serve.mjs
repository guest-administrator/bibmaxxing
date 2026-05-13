#!/usr/bin/env node
// Bibmaxxing local static server. Node stdlib only.
// Default port: 8080. Override with: node scripts/serve.mjs 9000  (or PORT env).
// Refuses to serve outside the project root; serves index.html for "/".

import http from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { stat, readFile } from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const args = parseArgs(process.argv.slice(2));
const PORT = args.port === "auto" ? 0 : Number(args.port || process.env.PORT || 8080);
const shutdownToken = args.shutdownToken === "auto"
  ? randomBytes(18).toString("hex")
  : (args.shutdownToken || "");

if (!existsSync(path.join(ROOT, "index.html"))) {
  console.error("serve.mjs: index.html not found in", ROOT);
  console.error("Run from the Bibmaxxing project root.");
  process.exit(1);
}
if (!existsSync(path.join(ROOT, "data", "bibs", "index.json"))) {
  console.error("serve.mjs: data/bibs/index.json missing. Bib registry not installed.");
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm":  "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".mjs":  "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md":   "text/markdown; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".pdf":  "application/pdf",
  ".ico":  "image/x-icon",
  ".txt":  "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function mime(p) {
  const ext = path.extname(p).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

function safeJoin(root, urlPath) {
  // Decode, strip query/hash, normalize, then refuse anything that escapes root.
  let p = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  if (p === "/" || p === "") p = "/index.html";
  // Block trivial traversal early.
  if (p.includes("\0")) return null;
  const joined = path.resolve(root, "." + p);
  if (!joined.startsWith(root + path.sep) && joined !== root) return null;
  return joined;
}

function parseArgs(argv) {
  const out = {
    port: null,
    open: false,
    shutdownToken: process.env.BIBMAXXING_SHUTDOWN_TOKEN || "",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--open") out.open = true;
    else if (a === "--shutdown-token") out.shutdownToken = argv[++i] || "";
    else if (a === "-h" || a === "--help") {
      console.log("Usage: node scripts/serve.mjs [port|auto] [--open] [--shutdown-token <token|auto>]");
      process.exit(0);
    } else if (!out.port) {
      out.port = a;
    }
  }
  return out;
}

function openBrowser(url) {
  let cmd;
  let cmdArgs;
  if (process.platform === "win32") {
    cmd = "cmd";
    cmdArgs = ["/c", "start", "", url];
  } else if (process.platform === "darwin") {
    cmd = "open";
    cmdArgs = [url];
  } else {
    cmd = "xdg-open";
    cmdArgs = [url];
  }
  try {
    const child = spawn(cmd, cmdArgs, { detached: true, stdio: "ignore" });
    child.unref();
  } catch (e) {
    console.error("serve.mjs: could not open browser automatically:", e.message);
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || "/", "http://localhost");
    if (reqUrl.pathname === "/__bibmaxxing/health") {
      sendJson(res, 200, { ok: true, shutdownEnabled: !!shutdownToken });
      return;
    }
    if (reqUrl.pathname === "/__bibmaxxing/shutdown") {
      const token = reqUrl.searchParams.get("token") || "";
      if (!shutdownToken || token !== shutdownToken) {
        sendJson(res, 403, { ok: false, error: "shutdown disabled or token mismatch" });
        return;
      }
      sendJson(res, 200, { ok: true, message: "Bibmaxxing server is shutting down" });
      setTimeout(() => server.close(() => process.exit(0)), 50);
      return;
    }

    const filePath = safeJoin(ROOT, req.url || "/");
    if (!filePath) {
      res.writeHead(400, { "content-type": "text/plain" });
      res.end("bad request");
      return;
    }
    let target = filePath;
    let st;
    try { st = await stat(target); } catch { st = null; }
    if (st?.isDirectory()) {
      target = path.join(target, "index.html");
      try { st = await stat(target); } catch { st = null; }
    }
    if (!st || !st.isFile()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("404 not found");
      return;
    }
    res.writeHead(200, {
      "content-type": mime(target),
      "content-length": st.size,
      "cache-control": "no-store",
    });
    createReadStream(target).pipe(res);
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("500 server error");
    console.error("serve.mjs:", e);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const actualPort = server.address().port;
  const url = shutdownToken
    ? `http://localhost:${actualPort}/?exitToken=${encodeURIComponent(shutdownToken)}#/dashboard`
    : `http://localhost:${actualPort}/`;
  console.log("Bibmaxxing static server");
  console.log(`  root:    ${ROOT}`);
  console.log(`  url:     ${url}`);
  console.log(shutdownToken ? "  stop:    use Exit in the app, close this window, or press Ctrl+C" : "  stop:    Ctrl+C");
  if (args.open) openBrowser(url);
});

process.on("SIGINT",  () => { console.log("\nstopping..."); server.close(() => process.exit(0)); });
process.on("SIGTERM", () => { server.close(() => process.exit(0)); });
