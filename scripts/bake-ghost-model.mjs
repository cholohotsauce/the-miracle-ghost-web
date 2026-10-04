// Bakes Aes's ZBrush ghost (.obj with polypaint) into the files the site loads:
//   public/models/miracle-ghost.glb    decimated, meshopt-compressed mesh with a _DEPTH attribute
//   public/models/miracle-ghost-face.png  his painted face, projected from the front (R = eyes, G = mouth)
//   public/models/miracle-ghost-halo.png  soft glow around the silhouette
//   src/components/ghost/modelBake.ts    where those maps sit in model space, plus drip tips
//
// Usage: node scripts/bake-ghost-model.mjs "<path to .obj>" [targetTriangles]

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const [objPath, targetArg] = process.argv.slice(2);
if (!objPath) {
  console.error('Usage: node scripts/bake-ghost-model.mjs "<path to .obj>" [targetTriangles]');
  process.exit(1);
}
const TARGET_TRIANGLES = Number(targetArg ?? 28000);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT_DIR = path.join(ROOT, "public/models");

// Same height as the procedural ghost, so camera framing and the rig's motion carry over
const MODEL_HEIGHT = 3.0;
// Square of model space the halo and depth maps cover
const MAP_HALF = 2.5;
const DEPTH_RES = 1024;
const HALO_RES = 256;
const FACE_RES = 1024;
// Polypaint darker than this counts as face linework
const INK_THRESHOLD = 0.5;

// ---------- OBJ with ZBrush polypaint (#MRGB rows hold MMRRGGBB per vertex) ----------

function parseObj(file) {
  const text = fs.readFileSync(file, "utf8");
  const pos = [];
  const lum = [];
  const idx = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("v ")) {
      const p = line.split(/\s+/);
      pos.push(+p[1], +p[2], +p[3]);
    } else if (line.startsWith("f ")) {
      const p = line.trim().split(/\s+/).slice(1).map((s) => parseInt(s, 10) - 1);
      for (let k = 1; k + 1 < p.length; k++) idx.push(p[0], p[k], p[k + 1]);
    } else if (line.startsWith("#MRGB ")) {
      const s = line.slice(6).trim();
      for (let i = 0; i + 8 <= s.length; i += 8) {
        const r = parseInt(s.slice(i + 2, i + 4), 16);
        const g = parseInt(s.slice(i + 4, i + 6), 16);
        const b = parseInt(s.slice(i + 6, i + 8), 16);
        lum.push((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255);
      }
    }
  }
  const count = pos.length / 3;
  const luminance = new Float32Array(count).fill(1);
  luminance.set(lum.slice(0, count));
  return { pos: new Float32Array(pos), lum: luminance, idx: new Uint32Array(idx) };
}

/** Centers the model and scales it to MODEL_HEIGHT. ZBrush exports +Y up and +Z toward the viewer. */
function normalize(pos) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], pos[i + a]);
      max[a] = Math.max(max[a], pos[i + a]);
    }
  }
  const scale = MODEL_HEIGHT / (max[1] - min[1]);
  const mid = min.map((m, a) => (m + max[a]) / 2);
  for (let i = 0; i < pos.length; i += 3) {
    for (let a = 0; a < 3; a++) pos[i + a] = (pos[i + a] - mid[a]) * scale;
  }
  return { scale, size: max.map((m, a) => (m - min[a]) * scale) };
}

// ---------- Front-view rasterizer ----------

/**
 * Projects triangles onto the XY plane inside rect, keeping the surface nearest the viewer.
 * Calls shade(i0, i1, i2, w0, w1, w2) for the winning triangle of each pixel.
 */
function rasterFront(pos, idx, rect, w, h, shade) {
  const zbuf = new Float32Array(w * h).fill(-Infinity);
  const out = new Float32Array(w * h);
  const covered = new Uint8Array(w * h);
  const sx = w / (rect.maxX - rect.minX);
  const sy = h / (rect.maxY - rect.minY);
  for (let t = 0; t < idx.length; t += 3) {
    const i0 = idx[t];
    const i1 = idx[t + 1];
    const i2 = idx[t + 2];
    // Pixel space, row 0 at the top
    const x0 = (pos[i0 * 3] - rect.minX) * sx;
    const y0 = (rect.maxY - pos[i0 * 3 + 1]) * sy;
    const x1 = (pos[i1 * 3] - rect.minX) * sx;
    const y1 = (rect.maxY - pos[i1 * 3 + 1]) * sy;
    const x2 = (pos[i2 * 3] - rect.minX) * sx;
    const y2 = (rect.maxY - pos[i2 * 3 + 1]) * sy;
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 1e-12) continue;
    const bx0 = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const bx1 = Math.min(w - 1, Math.ceil(Math.max(x0, x1, x2)));
    const by0 = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const by1 = Math.min(h - 1, Math.ceil(Math.max(y0, y1, y2)));
    for (let py = by0; py <= by1; py++) {
      for (let px = bx0; px <= bx1; px++) {
        const cx = px + 0.5;
        const cy = py + 0.5;
        const w0 = ((x1 - cx) * (y2 - cy) - (x2 - cx) * (y1 - cy)) / area;
        const w1 = ((x2 - cx) * (y0 - cy) - (x0 - cx) * (y2 - cy)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const k = py * w + px;
        covered[k] = 1;
        if (!shade) continue;
        const z = w0 * pos[i0 * 3 + 2] + w1 * pos[i1 * 3 + 2] + w2 * pos[i2 * 3 + 2];
        if (z <= zbuf[k]) continue;
        zbuf[k] = z;
        out[k] = shade(i0, i1, i2, w0, w1, w2);
      }
    }
  }
  return { out, covered };
}

// ---------- Exact Euclidean distance transform (Felzenszwalb & Huttenlocher) ----------

function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s;
    do {
      const p = v[k];
      s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
    } while (s <= z[k] && --k >= 0);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const p = v[k];
    d[q] = (q - p) * (q - p) + f[p];
  }
}

/** Distance in pixels from every pixel to the nearest pixel where seed is set. */
function distanceTo(seed, w, h) {
  const BIG = 1e20;
  const grid = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) grid[i] = seed[i] ? 0 : BIG;
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(d[x]);
  }
  return grid;
}

// ---------- PNG (8-bit RGBA) ----------

function writePng(file, w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

// ---------- Mesh helpers ----------

function smoothNormals(pos, idx) {
  const n = new Float32Array(pos.length);
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3];
    const ux = pos[b] - pos[a];
    const uy = pos[b + 1] - pos[a + 1];
    const uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a];
    const vy = pos[c + 1] - pos[a + 1];
    const vz = pos[c + 2] - pos[a + 2];
    // Unnormalized cross product weights each face by its area
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const i of [a, b, c]) {
      n[i] += nx;
      n[i + 1] += ny;
      n[i + 2] += nz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l;
    n[i + 1] /= l;
    n[i + 2] /= l;
  }
  return n;
}

/** Drops vertices no triangle uses and renumbers the index buffer. */
function compact(pos, idx) {
  const remap = new Int32Array(pos.length / 3).fill(-1);
  let next = 0;
  for (const i of idx) if (remap[i] < 0) remap[i] = next++;
  const outPos = new Float32Array(next * 3);
  for (let i = 0; i < remap.length; i++) {
    if (remap[i] >= 0) outPos.set(pos.subarray(i * 3, i * 3 + 3), remap[i] * 3);
  }
  return { pos: outPos, idx: Uint32Array.from(idx, (i) => remap[i]) };
}

function bilinear(grid, w, h, fx, fy) {
  const x = Math.min(Math.max(fx - 0.5, 0), w - 1.001);
  const y = Math.min(Math.max(fy - 0.5, 0), h - 1.001);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const g = (xx, yy) => grid[yy * w + xx];
  return (
    (g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx) * (1 - ty) + (g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx) * ty
  );
}

/** 4-connected components of a mask, largest first, as pixel bounding boxes. */
function components(mask, w, h) {
  const label = new Int32Array(w * h).fill(-1);
  const boxes = [];
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || label[start] >= 0) continue;
    const box = { minX: w, maxX: 0, minY: h, maxY: 0, count: 0, id: boxes.length };
    const stack = [start];
    label[start] = box.id;
    while (stack.length) {
      const k = stack.pop();
      const x = k % w;
      const y = (k - x) / w;
      box.count++;
      box.minX = Math.min(box.minX, x);
      box.maxX = Math.max(box.maxX, x);
      box.minY = Math.min(box.minY, y);
      box.maxY = Math.max(box.maxY, y);
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nk = ny * w + nx;
        if (mask[nk] && label[nk] < 0) {
          label[nk] = box.id;
          stack.push(nk);
        }
      }
    }
    boxes.push(box);
  }
  boxes.sort((a, b) => b.count - a.count);
  return { label, boxes };
}

const round = (v, d = 4) => Number(v.toFixed(d));

// ---------- Bake ----------

console.log("Reading", objPath);
const src = parseObj(objPath);
const { size } = normalize(src.pos);
console.log(`  ${src.pos.length / 3} vertices, ${src.idx.length / 3} triangles, size ${size.map((s) => s.toFixed(2))}`);

// 1. Silhouette distance field: interior depth for the glow shader, exterior falloff for the halo
const mapRect = { minX: -MAP_HALF, maxX: MAP_HALF, minY: -MAP_HALF, maxY: MAP_HALF };
const { covered: inside } = rasterFront(src.pos, src.idx, mapRect, DEPTH_RES, DEPTH_RES, null);
const outsideMask = Uint8Array.from(inside, (v) => 1 - v);
const pxSize = (2 * MAP_HALF) / DEPTH_RES;
const depthIn = distanceTo(outsideMask, DEPTH_RES, DEPTH_RES).map((d) => d * pxSize);
const distOut = distanceTo(inside, DEPTH_RES, DEPTH_RES).map((d) => d * pxSize);

// 2. Halo: same falloff as the procedural ghost's halo, faded before the texture border
{
  const halo = new Uint8Array(HALO_RES * HALO_RES * 4);
  const ratio = DEPTH_RES / HALO_RES;
  for (let j = 0; j < HALO_RES; j++) {
    for (let i = 0; i < HALO_RES; i++) {
      const d = bilinear(distOut, DEPTH_RES, DEPTH_RES, (i + 0.5) * ratio, (j + 0.5) * ratio);
      const edge = Math.min(i, HALO_RES - 1 - i, j, HALO_RES - 1 - j) / (HALO_RES * 0.12);
      const glow = (0.55 * Math.exp(-d * 7) + 0.3 * Math.exp(-d * 2.2)) * Math.min(edge, 1);
      const k = (j * HALO_RES + i) * 4;
      halo[k] = halo[k + 1] = halo[k + 2] = 255;
      halo[k + 3] = Math.round(Math.min(glow, 1) * 255);
    }
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  writePng(path.join(OUT_DIR, "miracle-ghost-halo.png"), HALO_RES, HALO_RES, halo);
}

// 3. Face: find the ink, then render it from the front at high resolution, eyes and mouth apart
let inkMin = [Infinity, Infinity];
let inkMax = [-Infinity, -Infinity];
for (let i = 0; i < src.lum.length; i++) {
  if (src.lum[i] >= INK_THRESHOLD || src.pos[i * 3 + 2] < 0) continue;
  inkMin = [Math.min(inkMin[0], src.pos[i * 3]), Math.min(inkMin[1], src.pos[i * 3 + 1])];
  inkMax = [Math.max(inkMax[0], src.pos[i * 3]), Math.max(inkMax[1], src.pos[i * 3 + 1])];
}
const pad = 0.12;
const faceSpan = Math.max(inkMax[0] - inkMin[0], inkMax[1] - inkMin[1]) + pad * 2;
const faceCx = (inkMin[0] + inkMax[0]) / 2;
const faceCy = (inkMin[1] + inkMax[1]) / 2;
const faceRect = {
  minX: faceCx - faceSpan / 2,
  maxX: faceCx + faceSpan / 2,
  minY: faceCy - faceSpan / 2,
  maxY: faceCy + faceSpan / 2,
};
const { out: ink } = rasterFront(src.pos, src.idx, faceRect, FACE_RES, FACE_RES, (a, b, c, w0, w1, w2) => {
  const l = w0 * src.lum[a] + w1 * src.lum[b] + w2 * src.lum[c];
  return smoothstep(INK_THRESHOLD + 0.25, INK_THRESHOLD - 0.25, l);
});
function smoothstep(e0, e1, x) {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

// The two tallest marks are the eyes; everything else is the mouth
const { label, boxes } = components(
  ink.map((v) => (v > 0.15 ? 1 : 0)),
  FACE_RES,
  FACE_RES,
);
const marks = boxes.filter((b) => b.count > 20);
const eyes = [...marks]
  .sort((a, b) => (b.maxY - b.minY) / (b.maxX - b.minX + 1) - (a.maxY - a.minY) / (a.maxX - a.minX + 1))
  .slice(0, 2)
  .sort((a, b) => a.minX - b.minX);
if (eyes.length < 2) throw new Error("Could not find two eyes in the polypaint");
const eyeIds = new Set(eyes.map((e) => e.id));
// Let antialiased fringe pixels follow their nearest labelled neighbour
const fringeLabel = (k) => {
  if (label[k] >= 0) return label[k];
  const x = k % FACE_RES;
  const y = (k - x) / FACE_RES;
  for (let r = 1; r <= 3; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= FACE_RES || ny >= FACE_RES) continue;
        const l = label[ny * FACE_RES + nx];
        if (l >= 0) return l;
      }
    }
  }
  return -1;
};
{
  const face = new Uint8Array(FACE_RES * FACE_RES * 4);
  for (let k = 0; k < FACE_RES * FACE_RES; k++) {
    if (ink[k] <= 0) continue;
    const v = Math.round(ink[k] * 255);
    const l = fringeLabel(k);
    face[k * 4 + (eyeIds.has(l) ? 0 : 1)] = v;
    face[k * 4 + 3] = 255;
  }
  writePng(path.join(OUT_DIR, "miracle-ghost-face.png"), FACE_RES, FACE_RES, face);
}
const pxToFace = (px, py) => [
  faceRect.minX + ((px + 0.5) / FACE_RES) * faceSpan,
  faceRect.maxY - ((py + 0.5) / FACE_RES) * faceSpan,
];
const eyeBoxes = eyes.map((e) => {
  const [x0, y1] = pxToFace(e.minX, e.minY);
  const [x1, y0] = pxToFace(e.maxX, e.maxY);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, halfW: (x1 - x0) / 2, halfH: (y1 - y0) / 2 };
});

// 4. Drip tips: the low points of the silhouette's hem, where droplets bead and fall
const dripTips = [];
{
  const bottom = new Float64Array(DEPTH_RES).fill(NaN);
  for (let x = 0; x < DEPTH_RES; x++) {
    for (let y = DEPTH_RES - 1; y >= 0; y--) {
      if (inside[y * DEPTH_RES + x]) {
        bottom[x] = y;
        break;
      }
    }
  }
  const win = Math.round(0.18 / pxSize);
  for (let x = win; x < DEPTH_RES - win; x++) {
    if (Number.isNaN(bottom[x])) continue;
    let isMax = true;
    for (let d = -win; d <= win && isMax; d++) if (bottom[x + d] > bottom[x]) isMax = false;
    // Flat tips register several times; keep the first
    if (isMax && !dripTips.some(([tx]) => Math.abs(tx - x) < win)) dripTips.push([x, bottom[x]]);
  }
}
const drips = dripTips.map(([x, y]) => [
  round(mapRect.minX + ((x + 0.5) / DEPTH_RES) * 2 * MAP_HALF, 3),
  round(mapRect.maxY - ((y + 0.5) / DEPTH_RES) * 2 * MAP_HALF, 3),
]);

// 5. Mesh: decimate, smooth normals, attach interior depth, compress
const targetIndexCount = TARGET_TRIANGLES * 3;
await MeshoptSimplifier.ready;
const [simplified, error] = MeshoptSimplifier.simplify(src.idx, src.pos, 3, targetIndexCount, 0.05, []);
const mesh = compact(src.pos, simplified);
const normals = smoothNormals(mesh.pos, mesh.idx);
const depth = new Float32Array(mesh.pos.length / 3);
for (let i = 0; i < depth.length; i++) {
  const fx = ((mesh.pos[i * 3] - mapRect.minX) / (2 * MAP_HALF)) * DEPTH_RES;
  const fy = ((mapRect.maxY - mesh.pos[i * 3 + 1]) / (2 * MAP_HALF)) * DEPTH_RES;
  depth[i] = bilinear(depthIn, DEPTH_RES, DEPTH_RES, fx, fy);
}
console.log(`  decimated to ${mesh.idx.length / 3} triangles, ${depth.length} vertices (error ${error.toExponential(2)})`);

const doc = new Document();
const buffer = doc.createBuffer();
const prim = doc
  .createPrimitive()
  .setIndices(doc.createAccessor().setType("SCALAR").setArray(mesh.idx).setBuffer(buffer))
  .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(mesh.pos).setBuffer(buffer))
  .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(normals).setBuffer(buffer))
  .setAttribute("_DEPTH", doc.createAccessor().setType("SCALAR").setArray(depth).setBuffer(buffer));
const node = doc.createNode("MiracleGhost").setMesh(doc.createMesh("MiracleGhost").addPrimitive(prim));
doc.createScene().addChild(node);
await MeshoptEncoder.ready;
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "high" }));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.encoder": MeshoptEncoder,
});
const glbPath = path.join(OUT_DIR, "miracle-ghost.glb");
await io.write(glbPath, doc);

// 6. Constants for the runtime
const rect = (r) => `{ minX: ${round(r.minX)}, maxX: ${round(r.maxX)}, minY: ${round(r.minY)}, maxY: ${round(r.maxY)} }`;
fs.writeFileSync(
  path.join(ROOT, "src/components/ghost/modelBake.ts"),
  `// Generated by scripts/bake-ghost-model.mjs from Aes's ZBrush export. Do not edit by hand.

export const MODEL_URL = "/models/miracle-ghost.glb";
export const FACE_MAP_URL = "/models/miracle-ghost-face.png";
export const HALO_MAP_URL = "/models/miracle-ghost-halo.png";

/** Model-space size after centering, in world units */
export const MODEL_SIZE = { x: ${round(size[0], 3)}, y: ${round(size[1], 3)}, z: ${round(size[2], 3)} };

/** Where the front-projected face map sits in model XY */
export const FACE_RECT = ${rect(faceRect)};

/** Each painted eye in model XY, left then right, for blinking */
export const EYES = [
${eyeBoxes.map((e) => `  { cx: ${round(e.cx)}, cy: ${round(e.cy)}, halfW: ${round(e.halfW)}, halfH: ${round(e.halfH)} },`).join("\n")}
] as const;

/** Where the halo map sits in model XY */
export const HALO_RECT = ${rect(mapRect)};

/** Low points of the hem, where droplets bead and fall */
export const MODEL_DRIP_TIPS: [number, number][] = ${JSON.stringify(drips)};
`,
);

for (const f of ["miracle-ghost.glb", "miracle-ghost-face.png", "miracle-ghost-halo.png"]) {
  console.log(`  ${f}: ${(fs.statSync(path.join(OUT_DIR, f)).size / 1024).toFixed(1)} KB`);
}
console.log("  drip tips", JSON.stringify(drips), "eyes", JSON.stringify(eyeBoxes.map((e) => [round(e.cx, 3), round(e.cy, 3)])));
