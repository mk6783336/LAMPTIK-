#!/usr/bin/env node
/**
 * Package `extension/` into `public/downloads/lamptik-chrome-extension.zip`.
 *
 * Chrome's "Load unpacked" wants a directory, but the website hands normal
 * visitors a single file, so the same tree is shipped as a ZIP. This is a
 * dependency-free ZIP writer (deflate via node:zlib, CRC32 from the spec):
 * pulling `archiver`/`adm-zip` in for one build step would add megabytes of
 * transitive dependencies to a project that has none.
 *
 * Determinism matters — the ZIP is committed so production can serve it, and
 * a fresh mtime on every run would churn the file in git for no reason.
 */
import { deflateRawSync } from "node:zlib";
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SOURCE = join(ROOT, "extension");
const OUT_DIR = join(ROOT, "public", "downloads");
const OUT_FILE = join(OUT_DIR, "lamptik-chrome-extension.zip");
/** Fixed timestamp (2026-01-01T00:00:00Z) keeps the archive reproducible. */
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Every file under `extension/`, depth-first, sorted for a stable archive. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });

const files = walk(SOURCE).map((full) => ({
  name: relative(SOURCE, full).split(sep).join("/"),
  data: readFileSync(full),
}));

if (files.length === 0) {
  throw new Error("extension/ is empty — nothing to package.");
}

const localParts = [];
const centralParts = [];
let offset = 0;

for (const file of files) {
  const name = Buffer.from(file.name, "utf8");
  const crc = crc32(file.data);
  const deflated = deflateRawSync(file.data, { level: 9 });
  // Store when deflate does not actually help (tiny PNGs, mostly).
  const stored = deflated.length >= file.data.length;
  const payload = stored ? file.data : deflated;
  const method = stored ? 0 : 8;

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0, 6); // flags
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(DOS_TIME, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(payload.length, 18);
  local.writeUInt32LE(file.data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28); // extra length

  localParts.push(local, name, payload);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6); // version needed
  central.writeUInt16LE(0, 8); // flags
  central.writeUInt16LE(method, 10);
  central.writeUInt16LE(DOS_TIME, 12);
  central.writeUInt16LE(DOS_DATE, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(payload.length, 20);
  central.writeUInt32LE(file.data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt16LE(0, 30); // extra
  central.writeUInt16LE(0, 32); // comment
  central.writeUInt16LE(0, 34); // disk
  central.writeUInt16LE(0, 36); // internal attrs
  central.writeUInt32LE(0, 38); // external attrs
  central.writeUInt32LE(offset, 42);

  centralParts.push(central, name);
  offset += local.length + name.length + payload.length;
}

const centralDir = Buffer.concat(centralParts);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralDir.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

const archive = Buffer.concat([...localParts, centralDir, end]);
writeFileSync(OUT_FILE, archive);

const kb = (archive.length / 1024).toFixed(1);
console.log(`packaged ${files.length} files → ${relative(ROOT, OUT_FILE)} (${kb} KB)`);
for (const file of files) console.log(`  ${file.name}`);
