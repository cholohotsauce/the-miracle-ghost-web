// Bakes Aes's ghost (the 3D artist's GLB: a front-projected face texture on an off-white body) into the files the site loads:
//   public/models/miracle-ghost.glb    decimated, meshopt-compressed mesh with a _DEPTH attribute
//   public/models/miracle-ghost-face.png  the painted face, seen from the front (R = eyes, G = mouth ink, B = white teeth)
//   public/models/miracle-ghost-halo.png  soft glow around the silhouette
//   src/components/ghost/modelBake.ts    where those maps sit in model space, the face landmarks, and drip tips
//
// Usage: node scripts/bake-ghost-model.mjs "<path to .glb>" [targetTriangles]

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const [srcPath, targetArg] = process.argv.slice(2);
if (!srcPath || !/\.glb$/i.test(srcPath)) {
  console.error('Usage: node scripts/bake-ghost-model.mjs "<path to .glb>" [targetTriangles]');
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
// Texture darker than this counts as face linework
const INK_THRESHOLD = 0.5;
// Texture brighter than this counts as the white of the teeth (the body is about 0.91)
const TEETH_THRESHOLD = 0.955;

// ---------- GLB: one mesh, any number of primitives, the face texture on one of them ----------

async function parseGlb(file) {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const doc = await io.read(file);
  const pos = [];
  const uv = [];
  const idx = [];
  let image;
  // Primitives often share one vertex list; read each list once
  const bases = new Map();
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const p = prim.getAttribute("POSITION");
      const t = prim.getAttribute("TEXCOORD_0");
      let base = bases.get(p);
      if (base === undefined) {
        base = pos.length / 3;
        bases.set(p, base);
        for (let i = 0; i < p.getCount(); i++) {
          pos.push(...p.getElement(i, []));
          uv.push(...(t ? t.getElement(i, []) : [-1, -1]));
        }
      }
      const indices = prim.getIndices();
      const count = indices ? indices.getCount() : p.getCount();
      for (let i = 0; i < count; i++) idx.push(base + (indices ? indices.getScalar(i) : i));
      image ??= prim.getMaterial()?.getBaseColorTexture()?.getImage();
    }
  }
  if (!image) throw new Error("No base color texture: the face must be painted into the GLB's texture");
  const { pos: welded, idx: weldedIdx, uv: weldedUv } = weld(new Float32Array(pos), new Uint32Array(idx), new Float32Array(uv));
  return { pos: welded, idx: weldedIdx, uv: weldedUv, texture: decodePng(Buffer.from(image)) };
}

/** Merge vertices stored more than once at the same spot (seams between primitives) so decimation sees one closed surface. */
function weld(pos, idx, uv) {
  const map = new Map();
  const remap = new Uint32Array(pos.length / 3);
  const outPos = [];
  const outUv = [];
  for (let i = 0; i < remap.length; i++) {
    const key = `${pos[i * 3]},${pos[i * 3 + 1]},${pos[i * 3 + 2]}`;
    let j = map.get(key);
    if (j === undefined) {
      j = outPos.length / 3;
      map.set(key, j);
      outPos.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      outUv.push(uv[i * 2], uv[i * 2 + 1]);
    } else if (outUv[j * 2] < 0) {
      outUv[j * 2] = uv[i * 2];
      outUv[j * 2 + 1] = uv[i * 2 + 1];
    }
    remap[i] = j;
  }
  return { pos: new Float32Array(outPos), idx: idx.map((i) => remap[i]), uv: new Float32Array(outUv) };
}

/** Minimal PNG reader: 8-bit gray, gray+alpha, RGB or RGBA, not interlaced. Returns luminance in 0..1. */
function decodePng(buf) {
  let w = 0;
  let h = 0;
  let type = 0;
  const data = [];
  for (let o = 8; o < buf.length; ) {
    const len = buf.readUInt32BE(o);
    const kind = buf.toString("ascii", o + 4, o + 8);
    const body = buf.subarray(o + 8, o + 8 + len);
    if (kind === "IHDR") {
      w = body.readUInt32BE(0);
      h = body.readUInt32BE(4);
      type = body[9];
      if (body[8] !== 8 || body[12] !== 0) throw new Error("Face texture must be an 8-bit, non-interlaced PNG");
    } else if (kind === "IDAT") data.push(body);
    o += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[type];
  if (!channels) throw new Error(`Unsupported PNG color type ${type}`);
  const raw = zlib.inflateSync(Buffer.concat(data));
  const stride = w * channels;
  const px = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? px[y * stride + x - channels] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? px[(y - 1) * stride + x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[y * stride + x] = v & 255;
    }
  }
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const k = i * channels;
    lum[i] =
      channels < 3 ? px[k] / 255 : (0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2]) / 255;
  }
  return { w, h, lum };
}

/** Centers the model and scales it to MODEL_HEIGHT. glTF is +Y up with the ghost facing +Z, toward the viewer. */
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

console.log("Reading", srcPath);
const src = await parseGlb(srcPath);
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

// 3. Face: look at the painted texture from the front, find the ink, then render it at high resolution, eyes and mouth apart

/** The face texture as seen from the front inside rect: ink (dark linework) and teeth (bright white) per pixel. */
function lookAtFace(rect, w, h) {
  const uvAt = (c) => (a, b, d, w0, w1, w2) => {
    // Untextured triangles show no face
    if (src.uv[a * 2] < 0 || src.uv[b * 2] < 0 || src.uv[d * 2] < 0) return -1;
    return w0 * src.uv[a * 2 + c] + w1 * src.uv[b * 2 + c] + w2 * src.uv[d * 2 + c];
  };
  const { out: u, covered } = rasterFront(src.pos, src.idx, rect, w, h, uvAt(0));
  const { out: v } = rasterFront(src.pos, src.idx, rect, w, h, uvAt(1));
  const { w: tw, h: th, lum } = src.texture;
  const ink = new Float32Array(w * h);
  const teeth = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) {
    if (!covered[k] || u[k] < 0 || v[k] < 0) continue;
    const l = bilinear(lum, tw, th, u[k] * tw, v[k] * th);
    ink[k] = smoothstep(INK_THRESHOLD + 0.25, INK_THRESHOLD - 0.25, l);
    teeth[k] = smoothstep(TEETH_THRESHOLD - 0.02, TEETH_THRESHOLD + 0.02, l);
  }
  return { ink, teeth };
}
function smoothstep(e0, e1, x) {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

let inkMin = [Infinity, Infinity];
let inkMax = [-Infinity, -Infinity];
{
  const { ink: coarse } = lookAtFace(mapRect, DEPTH_RES, DEPTH_RES);
  for (let k = 0; k < coarse.length; k++) {
    if (coarse[k] < 0.3) continue;
    const x = mapRect.minX + ((k % DEPTH_RES) + 0.5) * pxSize;
    const y = mapRect.maxY - (Math.floor(k / DEPTH_RES) + 0.5) * pxSize;
    inkMin = [Math.min(inkMin[0], x), Math.min(inkMin[1], y)];
    inkMax = [Math.max(inkMax[0], x), Math.max(inkMax[1], y)];
  }
}
if (!Number.isFinite(inkMin[0])) throw new Error("No dark linework found in the face texture");
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
const { ink, teeth } = lookAtFace(faceRect, FACE_RES, FACE_RES);

// The two most upright marks are the eyes; everything else is the mouth
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
if (eyes.length < 2) throw new Error("Could not find two eyes in the face texture");
const eyeIds = new Set(eyes.map((e) => e.id));
const mouthMarks = marks.filter((b) => !eyeIds.has(b.id));
if (!mouthMarks.length) throw new Error("Could not find the mouth in the face texture");
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
    if (ink[k] > 0) face[k * 4 + (eyeIds.has(fringeLabel(k)) ? 0 : 1)] = Math.round(ink[k] * 255);
    face[k * 4 + 2] = Math.round(teeth[k] * 255);
    if (ink[k] > 0 || teeth[k] > 0) face[k * 4 + 3] = 255;
  }
  writePng(path.join(OUT_DIR, "miracle-ghost-face.png"), FACE_RES, FACE_RES, face);
}
const pxToFace = (px, py) => [
  faceRect.minX + ((px + 0.5) / FACE_RES) * faceSpan,
  faceRect.maxY - ((py + 0.5) / FACE_RES) * faceSpan,
];

// Each eye's box, and the two ends of its stroke
const rowCenter = (id, py) => {
  let sum = 0;
  let n = 0;
  for (let px = 0; px < FACE_RES; px++) {
    if (label[py * FACE_RES + px] === id) {
      sum += px;
      n++;
    }
  }
  return pxToFace(sum / n, py);
};
const eyeBoxes = eyes.map((e) => {
  const [x0, y1] = pxToFace(e.minX, e.minY);
  const [x1, y0] = pxToFace(e.maxX, e.maxY);
  return {
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    halfW: (x1 - x0) / 2,
    halfH: (y1 - y0) / 2,
    top: rowCenter(e.id, e.minY),
    bottom: rowCenter(e.id, e.maxY),
  };
});

// The mouth's outline, and the tooth just right of the middle, which turns gold
const mouthBox = mouthMarks.reduce((m, b) => ({
  minX: Math.min(m.minX, b.minX),
  maxX: Math.max(m.maxX, b.maxX),
  minY: Math.min(m.minY, b.minY),
  maxY: Math.max(m.maxY, b.maxY),
}));
const isTooth = (px, py) => teeth[py * FACE_RES + px] > 0.5;
const midPx = Math.round((mouthBox.minX + mouthBox.maxX) / 2);
// The lowest point of the upper lip, beside the line down the middle
const nearMid = (py) => [-8, -6, -4, 4, 6, 8].some((dx) => isTooth(midPx + dx, py));
let lipPx = mouthBox.minY;
while (lipPx < mouthBox.maxY && !nearMid(lipPx)) lipPx++;
const panelRow = Math.round(lipPx + 0.2 * (mouthBox.maxY - lipPx));
const panels = [];
for (let px = mouthBox.minX; px <= mouthBox.maxX; px++) {
  if (!isTooth(px, panelRow)) continue;
  const start = px;
  while (px <= mouthBox.maxX && isTooth(px, panelRow)) px++;
  panels.push([start, px - 1]);
}
const goldPanel = panels.find(([x0]) => x0 >= midPx - 3);
if (!goldPanel) throw new Error("Could not find the painted teeth");
const goldMidPx = Math.round((goldPanel[0] + goldPanel[1]) / 2);
let goldTopPx = mouthBox.minY;
while (goldTopPx < mouthBox.maxY && !isTooth(goldMidPx, goldTopPx)) goldTopPx++;
let goldBottomPx = mouthBox.maxY;
while (goldBottomPx > goldTopPx && !isTooth(goldMidPx, goldBottomPx)) goldBottomPx--;
const [mouthMinX, mouthTop] = pxToFace(mouthBox.minX, mouthBox.minY);
const [mouthMaxX, mouthBottom] = pxToFace(mouthBox.maxX, mouthBox.maxY);
const mouth = { top: mouthTop, bottom: mouthBottom, cx: (mouthMinX + mouthMaxX) / 2, halfW: (mouthMaxX - mouthMinX) / 2 };
const goldTooth = {
  minX: pxToFace(goldPanel[0], 0)[0],
  maxX: pxToFace(goldPanel[1], 0)[0],
  top: pxToFace(0, goldTopPx)[1],
  bottom: pxToFace(0, goldBottomPx)[1],
};

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
  `// Generated by scripts/bake-ghost-model.mjs from Aes's ghost GLB. Do not edit by hand.

export const MODEL_URL = "/models/miracle-ghost.glb";
export const FACE_MAP_URL = "/models/miracle-ghost-face.png";
export const HALO_MAP_URL = "/models/miracle-ghost-halo.png";

/** Model-space size after centering, in world units */
export const MODEL_SIZE = { x: ${round(size[0], 3)}, y: ${round(size[1], 3)}, z: ${round(size[2], 3)} };

/** Where the front-projected face map sits in model XY */
export const FACE_RECT = ${rect(faceRect)};

/** Each painted eye in model XY, left then right: its box (for blinking) and the two ends of its stroke */
export const EYES = [
${eyeBoxes.map((e) => `  { cx: ${round(e.cx)}, cy: ${round(e.cy)}, halfW: ${round(e.halfW)}, halfH: ${round(e.halfH)}, top: [${e.top.map((v) => round(v)).join(", ")}], bottom: [${e.bottom.map((v) => round(v)).join(", ")}] },`).join("\n")}
] as const;

/** The painted grin in model XY: its corners reach y = top, its point y = bottom */
export const MOUTH = { top: ${round(mouth.top)}, bottom: ${round(mouth.bottom)}, cx: ${round(mouth.cx)}, halfW: ${round(mouth.halfW)} };

/** The painted tooth just right of the middle, which turns gold */
export const GOLD_TOOTH = ${rect({ minX: goldTooth.minX, maxX: goldTooth.maxX, minY: goldTooth.bottom, maxY: goldTooth.top })};

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
console.log("  mouth", JSON.stringify(mouth), "gold tooth", JSON.stringify(goldTooth), "teeth panels", panels.length);
