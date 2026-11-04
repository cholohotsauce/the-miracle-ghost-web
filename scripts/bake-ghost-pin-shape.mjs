// Bakes the outline of Aes's map ghost for the 3D pins on the Ghost Sightings globe (Aes, 2026-11-04).
// It traces the white body in public/sightings/ghost-pin-body.png (scripts/make-icons.mjs) and writes
// the outline as points, so GlobeScene can extrude it into a puffy 3D ghost:
//   src/components/shows/ghostPinShape.json  [[x, y], ...], 1 unit tall, x centered on 0, y = 0 at the bottom
//
// Usage: node scripts/bake-ghost-pin-shape.mjs

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "public/sightings/ghost-pin-body.png");
const OUT = path.join(ROOT, "src/components/shows/ghostPinShape.json");
/** How far, in source pixels, the simplified outline may stray from the traced one */
const TOLERANCE = 0.45;

const { data, info } = await sharp(SRC).greyscale().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && data[y * W + x] >= 128;

// Moore-neighbor tracing: walk around the body's edge pixels, clockwise, back to the first one.
// The start is the first inside pixel on a scan from the top left.
let sx = -1;
let sy = -1;
for (let y = 0; y < H && sx < 0; y++) {
  for (let x = 0; x < W; x++) {
    if (inside(x, y)) {
      sx = x;
      sy = y;
      break;
    }
  }
}

// The 8 neighbors, clockwise from the left
const AROUND = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
const points = [[sx, sy]];
let cx = sx;
let cy = sy;
let from = 0; // we came in from the left (the scan found nothing there)
for (let guard = 0; guard < W * H; guard++) {
  let found = false;
  for (let k = 1; k <= 8; k++) {
    const d = (from + k) % 8;
    const nx = cx + AROUND[d][0];
    const ny = cy + AROUND[d][1];
    if (inside(nx, ny)) {
      // Next search starts from the neighbor just before this one, seen from the new pixel
      const back = AROUND.findIndex(([ax, ay]) => ax === cx + AROUND[(d + 7) % 8][0] - nx && ay === cy + AROUND[(d + 7) % 8][1] - ny);
      cx = nx;
      cy = ny;
      from = back;
      found = true;
      break;
    }
  }
  if (!found || (cx === sx && cy === sy)) break;
  points.push([cx, cy]);
}

// Douglas-Peucker: keep only the points the shape needs
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let worst = 0;
  let at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const d = Math.abs((b[0] - a[0]) * (a[1] - y0) - (a[0] - x0) * (b[1] - a[1])) / len;
    if (d > worst) {
      worst = d;
      at = i;
    }
  }
  if (worst <= tol) return [a, b];
  return [...simplify(pts.slice(0, at + 1), tol).slice(0, -1), ...simplify(pts.slice(at), tol)];
}

// Smooth the pixel stairs first (a small moving average around the loop), then simplify
const n = points.length;
const smooth = points.map((_, i) => {
  let ax = 0;
  let ay = 0;
  for (let k = -2; k <= 2; k++) {
    const [qx, qy] = points[(i + k + n) % n];
    ax += qx;
    ay += qy;
  }
  return [ax / 5, ay / 5];
});
// A closed loop starts and ends on the same point, so simplify it in two halves split at the point farthest away
const far = smooth.reduce((best, p, i) => (Math.hypot(p[0] - smooth[0][0], p[1] - smooth[0][1]) > Math.hypot(smooth[best][0] - smooth[0][0], smooth[best][1] - smooth[0][1]) ? i : best), 0);
const outline = [
  ...simplify(smooth.slice(0, far + 1), TOLERANCE).slice(0, -1),
  ...simplify([...smooth.slice(far), smooth[0]], TOLERANCE).slice(0, -1),
];

const ys = outline.map((p) => p[1]);
const xs = outline.map((p) => p[0]);
const top = Math.min(...ys);
const bottom = Math.max(...ys);
const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
const tall = bottom - top;
// Flip y so it points up, 1 unit tall, standing on y = 0
const shape = outline.map(([qx, qy]) => [+((qx - mid) / tall).toFixed(4), +((bottom - qy) / tall).toFixed(4)]);

fs.writeFileSync(OUT, JSON.stringify(shape) + "\n");
console.log(`wrote ${path.relative(ROOT, OUT)} (${shape.length} points from ${n})`);
