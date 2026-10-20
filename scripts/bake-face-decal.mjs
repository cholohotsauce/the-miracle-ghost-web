// Bakes one of the 3D artist's extra ghost faces (Lilmad, Swag, Sleepy) into a face map the site can swap in.
// Each face comes as an OBJ (the same body as every other ghost) whose face is a decal texture projected flat
// from the front, so only the texture and that projection matter here; the mesh stays the one in miracle-ghost.glb.
//
// Writes:
//   public/models/miracle-ghost-face-<name>.png    the face seen from the front (R = eyes, G = mouth ink, B = white teeth)
//   src/components/ghost/faceBakes/<name>.json     where that map sits in model XY, and its eye and mouth landmarks,
//                                                  and any painted blush on its cheeks
//
// Usage: node scripts/bake-face-decal.mjs <name> "<path to .obj>" "<path to texture .png>"
// Then add the face to src/components/ghost/faces.ts and give it tricks in TRICK_FACE (tricks.ts).

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import sharp from "sharp";

const [name, objPath, texPath] = process.argv.slice(2);
if (!name || !objPath || !texPath) {
  console.error('Usage: node scripts/bake-face-decal.mjs <name> "<path to .obj>" "<path to texture .png>"');
  process.exit(1);
}
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
// Same as scripts/bake-ghost-model.mjs, so the faces line up with the baked body
const MODEL_HEIGHT = 3.0;
const FACE_RES = 1024;
const INK_THRESHOLD = 0.5;
const TEETH_THRESHOLD = 0.955;
const PAD = 0.12;

// 1. The projection: fit u and v as straight-line functions of the centered, scaled model X and Y
const pos = [];
const uv = [];
for await (const line of readline.createInterface({ input: fs.createReadStream(objPath) })) {
  if (line.startsWith("v ")) pos.push(line.split(/\s+/).slice(1, 4).map(Number));
  else if (line.startsWith("vt ")) uv.push(line.split(/\s+/).slice(1, 3).map(Number));
}
if (pos.length !== uv.length) throw new Error("Expected one texture coordinate per vertex, as the artist's decal OBJs have");
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (const p of pos) {
  for (let a = 0; a < 3; a++) {
    min[a] = Math.min(min[a], p[a]);
    max[a] = Math.max(max[a], p[a]);
  }
}
const scale = MODEL_HEIGHT / (max[1] - min[1]);
const model = (p, a) => (p[a] - (min[a] + max[a]) / 2) * scale;

/** Least squares t = k * x + c over all vertices */
function fit(a, c) {
  let sx = 0;
  let st = 0;
  let sxx = 0;
  let sxt = 0;
  const n = pos.length;
  for (let i = 0; i < n; i++) {
    const x = model(pos[i], a);
    const t = uv[i][c];
    sx += x;
    st += t;
    sxx += x * x;
    sxt += x * t;
  }
  const k = (n * sxt - sx * st) / (n * sxx - sx * sx);
  const off = (st - k * sx) / n;
  let err = 0;
  for (let i = 0; i < n; i++) err = Math.max(err, Math.abs(k * model(pos[i], a) + off - uv[i][c]));
  if (err > 1e-3) throw new Error(`The decal is not a flat front projection (error ${err})`);
  return { k, off };
}
const U = fit(0, 0);
const V = fit(1, 1);

// 2. The texture's luminance, and where its linework is
const { data: lum, info } = await sharp(texPath).greyscale().raw().toBuffer({ resolveWithObject: true });
const TW = info.width;
const TH = info.height;
/** Model XY of a texture pixel's center (texture rows run top down, v runs bottom up) */
const toModel = (px, py) => [((px + 0.5) / TW - U.off) / U.k, (1 - (py + 0.5) / TH - V.off) / V.k];
let inkMin = [Infinity, Infinity];
let inkMax = [-Infinity, -Infinity];
for (let py = 0; py < TH; py++) {
  for (let px = 0; px < TW; px++) {
    if (lum[py * TW + px] / 255 >= INK_THRESHOLD) continue;
    const [x, y] = toModel(px, py);
    inkMin = [Math.min(inkMin[0], x), Math.min(inkMin[1], y)];
    inkMax = [Math.max(inkMax[0], x), Math.max(inkMax[1], y)];
  }
}
const span = Math.max(inkMax[0] - inkMin[0], inkMax[1] - inkMin[1]) + PAD * 2;
const cx = (inkMin[0] + inkMax[0]) / 2;
const cy = (inkMin[1] + inkMax[1]) / 2;
const rect = { minX: cx - span / 2, maxX: cx + span / 2, minY: cy - span / 2, maxY: cy + span / 2 };

// 3. Resample the face square at FACE_RES, bilinear in the texture
const sample = (u, v) => {
  const x = Math.min(Math.max(u * TW - 0.5, 0), TW - 1.001);
  const y = Math.min(Math.max((1 - v) * TH - 0.5, 0), TH - 1.001);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const g = (xx, yy) => lum[yy * TW + xx] / 255;
  return (g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx) * (1 - ty) + (g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx) * ty;
};
const smoothstep = (e0, e1, x) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};
const pxToFace = (px, py) => [rect.minX + ((px + 0.5) / FACE_RES) * span, rect.maxY - ((py + 0.5) / FACE_RES) * span];
const ink = new Float32Array(FACE_RES * FACE_RES);
const teeth = new Float32Array(FACE_RES * FACE_RES);
for (let py = 0; py < FACE_RES; py++) {
  for (let px = 0; px < FACE_RES; px++) {
    const [x, y] = pxToFace(px, py);
    const l = sample(U.k * x + U.off, V.k * y + V.off);
    ink[py * FACE_RES + px] = smoothstep(INK_THRESHOLD + 0.25, INK_THRESHOLD - 0.25, l);
    teeth[py * FACE_RES + px] = smoothstep(TEETH_THRESHOLD - 0.02, TEETH_THRESHOLD + 0.02, l);
  }
}

// 4. Split the marks: the biggest mark in the lower half is the mouth; marks that start above it are the eyes
// (or, on Swag, the eyes and brows in one piece); anything else (cheek curls) goes with the mouth
const label = new Int32Array(FACE_RES * FACE_RES).fill(-1);
const marks = [];
for (let start = 0; start < label.length; start++) {
  if (ink[start] <= 0.15 || label[start] >= 0) continue;
  const m = { id: marks.length, count: 0, minX: FACE_RES, maxX: 0, minY: FACE_RES, maxY: 0 };
  const stack = [start];
  label[start] = m.id;
  while (stack.length) {
    const k = stack.pop();
    const x = k % FACE_RES;
    const y = (k - x) / FACE_RES;
    m.count++;
    m.minX = Math.min(m.minX, x);
    m.maxX = Math.max(m.maxX, x);
    m.minY = Math.min(m.minY, y);
    m.maxY = Math.max(m.maxY, y);
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= FACE_RES || ny >= FACE_RES) continue;
      const nk = ny * FACE_RES + nx;
      if (ink[nk] > 0.15 && label[nk] < 0) {
        label[nk] = m.id;
        stack.push(nk);
      }
    }
  }
  marks.push(m);
}
const real = marks.filter((m) => m.count > 20);
const inkTop = Math.min(...real.map((m) => m.minY));
const inkBottom = Math.max(...real.map((m) => m.maxY));
const mouthMark = real
  .filter((m) => (m.minY + m.maxY) / 2 > (inkTop + inkBottom) / 2)
  .sort((a, b) => b.count - a.count)[0];
if (!mouthMark) throw new Error("Could not find the mouth");
const eyeIds = new Set(real.filter((m) => m.minY < mouthMark.minY && m !== mouthMark).map((m) => m.id));
if (!eyeIds.size) throw new Error("Could not find the eyes");
const isEye = (k) => {
  if (label[k] >= 0) return eyeIds.has(label[k]);
  // Antialiased fringe pixels follow their nearest labelled neighbour
  const x = k % FACE_RES;
  const y = (k - x) / FACE_RES;
  for (let r = 1; r <= 3; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= FACE_RES || ny >= FACE_RES) continue;
        const l = label[ny * FACE_RES + nx];
        if (l >= 0) return eyeIds.has(l);
      }
    }
  }
  return false;
};
const rgba = new Uint8Array(FACE_RES * FACE_RES * 4);
for (let k = 0; k < FACE_RES * FACE_RES; k++) {
  if (ink[k] > 0) rgba[k * 4 + (isEye(k) ? 0 : 1)] = Math.round(ink[k] * 255);
  rgba[k * 4 + 2] = Math.round(teeth[k] * 255);
  if (ink[k] > 0 || teeth[k] > 0) rgba[k * 4 + 3] = 255;
}
const mapFile = `miracle-ghost-face-${name}.png`;
await sharp(Buffer.from(rgba), { raw: { width: FACE_RES, height: FACE_RES, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(ROOT, "public/models", mapFile));

// 5. Landmarks. Each eye is the eye ink on its side of the face's middle: its box and the two ends of its stroke.
const midPx = Math.round(((cx - rect.minX) / span) * FACE_RES);
const round = (v) => Number(v.toFixed(4));
const eyes = [
  [0, midPx],
  [midPx, FACE_RES],
].map(([x0, x1]) => {
  let box = { minX: FACE_RES, maxX: 0, minY: FACE_RES, maxY: 0 };
  for (let y = 0; y < FACE_RES; y++) {
    for (let x = x0; x < x1; x++) {
      if (!eyeIds.has(label[y * FACE_RES + x])) continue;
      box = { minX: Math.min(box.minX, x), maxX: Math.max(box.maxX, x), minY: Math.min(box.minY, y), maxY: Math.max(box.maxY, y) };
    }
  }
  const rowCenter = (y) => {
    let sum = 0;
    let n = 0;
    for (let x = x0; x < x1; x++) {
      if (eyeIds.has(label[y * FACE_RES + x])) {
        sum += x;
        n++;
      }
    }
    return pxToFace(sum / n, y).map(round);
  };
  const [left, top] = pxToFace(box.minX, box.minY);
  const [right, bottom] = pxToFace(box.maxX, box.maxY);
  return {
    cx: round((left + right) / 2),
    cy: round((top + bottom) / 2),
    halfW: round((right - left) / 2),
    halfH: round((top - bottom) / 2),
    top: rowCenter(box.minY),
    bottom: rowCenter(box.maxY),
  };
});
const mouthMarks = real.filter((m) => !eyeIds.has(m.id));
const [mLeft, mTop] = pxToFace(Math.min(...mouthMarks.map((m) => m.minX)), Math.min(...mouthMarks.map((m) => m.minY)));
const [mRight, mBottom] = pxToFace(Math.max(...mouthMarks.map((m) => m.maxX)), Math.max(...mouthMarks.map((m) => m.maxY)));
// 6. Painted blush (Sleepy's pink cheeks): soft colored spots the grey map can't hold, so they become landmarks
// the shader paints itself. Blush is where red runs well ahead of green; the body grey has them about equal.
const { data: rgb } = await sharp(texPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const redness = (k) => rgb[k * 3] - rgb[k * 3 + 1];
let peak = 0;
for (let k = 0; k < TW * TH; k++) peak = Math.max(peak, redness(k));
let cheeks;
if (peak > 40) {
  const sides = [-1, 1].map(() => ({ half: { min: [Infinity, Infinity], max: [-Infinity, -Infinity] }, faint: { min: [Infinity, Infinity], max: [-Infinity, -Infinity] }, color: [0, 0, 0], n: 0 }));
  const grow = (b, p) => {
    b.min = [Math.min(b.min[0], p[0]), Math.min(b.min[1], p[1])];
    b.max = [Math.max(b.max[0], p[0]), Math.max(b.max[1], p[1])];
  };
  for (let py = 0; py < TH; py++) {
    for (let px = 0; px < TW; px++) {
      const k = py * TW + px;
      const w = redness(k) / peak;
      if (w < 0.08) continue;
      const p = toModel(px, py);
      const s = sides[p[0] < cx ? 0 : 1];
      grow(s.faint, p);
      if (w >= 0.5) grow(s.half, p);
      if (w >= 0.9) {
        for (let c = 0; c < 3; c++) s.color[c] += rgb[k * 3 + c];
        s.n++;
      }
    }
  }
  if (sides.every((s) => s.n > 0)) {
    // Each cheek: its center, the half size of its solid core, and how far the blur runs past the core (as a fraction)
    const spots = sides.map(({ half, faint }) => {
      const r = [(half.max[0] - half.min[0]) / 2, (half.max[1] - half.min[1]) / 2];
      return {
        cx: round((half.min[0] + half.max[0]) / 2),
        cy: round((half.min[1] + half.max[1]) / 2),
        rx: round(r[0]),
        ry: round(r[1]),
        blur: round(((faint.max[0] - faint.min[0]) / 2 / r[0] - 1) / 2),
      };
    });
    const n = sides[0].n + sides[1].n;
    const color = [0, 1, 2].map((c) => round((sides[0].color[c] + sides[1].color[c]) / n / 255));
    cheeks = { color, spots };
  }
}

const bake = {
  map: `/models/${mapFile}`,
  rect: { minX: round(rect.minX), maxX: round(rect.maxX), minY: round(rect.minY), maxY: round(rect.maxY) },
  eyes,
  mouth: { top: round(mTop), bottom: round(mBottom), cx: round((mLeft + mRight) / 2), halfW: round((mRight - mLeft) / 2) },
  ...(cheeks && { cheeks }),
};
fs.mkdirSync(path.join(ROOT, "src/components/ghost/faceBakes"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "src/components/ghost/faceBakes", `${name}.json`), JSON.stringify(bake, null, 2) + "\n");
console.log(name, JSON.stringify(bake));
