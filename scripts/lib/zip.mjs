// Minimal ZIP writer. PKZIP, deflate, no dependencies, no encryption, no ZIP64.
// Suitable for app/data packages under ~2 GiB per archive.
//
// Usage:
//   import { createZip } from "./lib/zip.mjs";
//   const z = createZip();
//   z.add("path/in/zip.txt", Buffer.from("..."));
//   await z.write("out.zip");
//
// Format references: PKWare APPNOTE 6.3.x sections 4.3.7, 4.3.12, 4.3.16.

import { open } from "node:fs/promises";
import { deflateRaw } from "node:zlib";
import { promisify } from "node:util";

const deflateRawAsync = promisify(deflateRaw);

const SIG_LOCAL  = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD   = 0x06054b50;
const VERSION = 20;       // 2.0 — deflate
const METHOD_DEFLATE = 8;
const METHOD_STORE = 0;

// CRC-32 (IEEE polynomial 0xEDB88320), reflected, table-based.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosTime(date) {
  const t = ((date.getHours() & 0x1F) << 11) |
            ((date.getMinutes() & 0x3F) << 5) |
            ((Math.floor(date.getSeconds() / 2)) & 0x1F);
  return t & 0xFFFF;
}
function dosDate(date) {
  const y = Math.max(1980, date.getFullYear()) - 1980;
  const d = ((y & 0x7F) << 9) |
            (((date.getMonth() + 1) & 0x0F) << 5) |
            (date.getDate() & 0x1F);
  return d & 0xFFFF;
}

export function createZip() {
  const entries = [];
  return {
    add(name, data, opts = {}) {
      if (typeof data === "string") data = Buffer.from(data, "utf8");
      if (!Buffer.isBuffer(data)) throw new TypeError("data must be Buffer or string");
      entries.push({
        name: name.replace(/\\/g, "/"),
        data,
        mtime: opts.mtime instanceof Date ? opts.mtime : new Date(),
        store: !!opts.store,
      });
    },
    count() { return entries.length; },
    async write(outPath) {
      const fh = await open(outPath, "w");
      try {
        const central = [];
        let offset = 0;

        for (const e of entries) {
          const crc = crc32(e.data);
          const stored = e.store
            ? { method: METHOD_STORE, buf: e.data }
            : { method: METHOD_DEFLATE, buf: await deflateRawAsync(e.data) };
          // Skip deflate if it actually got larger (common for tiny files).
          if (!e.store && stored.buf.length >= e.data.length) {
            stored.method = METHOD_STORE;
            stored.buf = e.data;
          }
          const nameBuf = Buffer.from(e.name, "utf8");
          const time = dosTime(e.mtime);
          const date = dosDate(e.mtime);

          const local = Buffer.alloc(30);
          local.writeUInt32LE(SIG_LOCAL, 0);
          local.writeUInt16LE(VERSION, 4);
          local.writeUInt16LE(0, 6);                 // gp flags
          local.writeUInt16LE(stored.method, 8);
          local.writeUInt16LE(time, 10);
          local.writeUInt16LE(date, 12);
          local.writeUInt32LE(crc, 14);
          local.writeUInt32LE(stored.buf.length, 18); // compressed
          local.writeUInt32LE(e.data.length, 22);     // uncompressed
          local.writeUInt16LE(nameBuf.length, 26);
          local.writeUInt16LE(0, 28);                 // extra

          await fh.write(local);
          await fh.write(nameBuf);
          await fh.write(stored.buf);

          central.push({
            crc,
            method: stored.method,
            compSize: stored.buf.length,
            uncompSize: e.data.length,
            nameBuf,
            time,
            date,
            offset,
          });
          offset += local.length + nameBuf.length + stored.buf.length;
        }

        const cdStart = offset;
        let cdSize = 0;
        for (const c of central) {
          const h = Buffer.alloc(46);
          h.writeUInt32LE(SIG_CENTRAL, 0);
          h.writeUInt16LE(VERSION, 4);  // made by
          h.writeUInt16LE(VERSION, 6);  // needed
          h.writeUInt16LE(0, 8);
          h.writeUInt16LE(c.method, 10);
          h.writeUInt16LE(c.time, 12);
          h.writeUInt16LE(c.date, 14);
          h.writeUInt32LE(c.crc, 16);
          h.writeUInt32LE(c.compSize, 20);
          h.writeUInt32LE(c.uncompSize, 24);
          h.writeUInt16LE(c.nameBuf.length, 28);
          h.writeUInt16LE(0, 30);  // extra
          h.writeUInt16LE(0, 32);  // comment
          h.writeUInt16LE(0, 34);  // disk no
          h.writeUInt16LE(0, 36);  // internal attrs
          h.writeUInt32LE(0, 38);  // external attrs
          h.writeUInt32LE(c.offset, 42);
          await fh.write(h);
          await fh.write(c.nameBuf);
          cdSize += h.length + c.nameBuf.length;
        }

        const eocd = Buffer.alloc(22);
        eocd.writeUInt32LE(SIG_EOCD, 0);
        eocd.writeUInt16LE(0, 4);                    // disk
        eocd.writeUInt16LE(0, 6);                    // disk w/ CD
        eocd.writeUInt16LE(central.length, 8);
        eocd.writeUInt16LE(central.length, 10);
        eocd.writeUInt32LE(cdSize, 12);
        eocd.writeUInt32LE(cdStart, 16);
        eocd.writeUInt16LE(0, 20);                   // comment len
        await fh.write(eocd);
      } finally {
        await fh.close();
      }
    },
  };
}
