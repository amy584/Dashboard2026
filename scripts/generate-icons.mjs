// Generates simple brand placeholder PWA icons (solid navy with a brass dot).
// Pure Node PNG encoder — no native deps. Run: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NAVY = [0x1f, 0x2a, 0x44];
const BRASS = [0xc6, 0xa2, 0x6b];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makePng(size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.22;
  // Raw image: each row prefixed with filter byte 0.
  const rowLen = size * 4 + 1;
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0;
    for (let x = 0; x < size; x++) {
      const inDot = (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
      const [rr, gg, bb] = inDot ? BRASS : NAVY;
      const o = y * rowLen + 1 + x * 4;
      raw[o] = rr;
      raw[o + 1] = gg;
      raw[o + 2] = bb;
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../public/icons");
mkdirSync(outDir, { recursive: true });

const targets = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["icon-maskable-512.png", 512],
  ["badge-72.png", 72],
];
for (const [name, size] of targets) {
  writeFileSync(resolve(outDir, name), makePng(size));
  console.log("wrote", name);
}
