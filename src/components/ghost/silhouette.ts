// 2D signed distance field of the Miracle Ghost silhouette, traced from Rommel's paintings:
// a tall center lobe, two wing-like side lobes, and a dripping hem.
// Units: the ghost spans roughly x -1.4..1.4 and y -1.5..1.5. Negative = inside.

type Vec2 = [number, number];

function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

// Segment from a to b whose radius tapers from ra to rb
function taperedCapsule(px: number, py: number, a: Vec2, b: Vec2, ra: number, rb: number) {
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const t = Math.min(1, Math.max(0, ((px - a[0]) * bax + (py - a[1]) * bay) / (bax * bax + bay * bay)));
  const dx = px - (a[0] + bax * t);
  const dy = py - (a[1] + bay * t);
  return Math.hypot(dx, dy) - (ra + (rb - ra) * t);
}

export function ghostSdf(x: number, y: number): number {
  // The ghost is symmetric, so model the right half only
  const ax = Math.abs(x);

  const head = taperedCapsule(ax, y, [0, -0.2], [0, 1.08], 0.44, 0.42);
  const body = taperedCapsule(ax, y, [0, 0.05], [0, -0.45], 0.56, 0.5);
  const shoulder = taperedCapsule(ax, y, [0.25, 0.22], [0.92, 0.3], 0.28, 0.24);
  const wing = taperedCapsule(ax, y, [1.06, -0.78], [0.95, 0.5], 0.34, 0.29);

  let core = smin(head, body, 0.3);
  core = smin(core, shoulder, 0.25);
  const wingWithShoulder = smin(wing, shoulder, 0.3);
  let d = smin(core, wingWithShoulder, 0.08);

  // Drips along the hem: a long center drip and two shorter ones
  const centerDrip = taperedCapsule(ax, y, [0, -0.75], [0, -1.42], 0.22, 0.13);
  const sideDrip = taperedCapsule(ax, y, [0.4, -0.72], [0.41, -1.14], 0.17, 0.11);
  d = smin(d, centerDrip, 0.16);
  d = smin(d, sideDrip, 0.14);

  return d;
}

export function ghostSdfGradient(x: number, y: number): Vec2 {
  const e = 1e-3;
  const gx = ghostSdf(x + e, y) - ghostSdf(x - e, y);
  const gy = ghostSdf(x, y + e) - ghostSdf(x, y - e);
  const len = Math.hypot(gx, gy) || 1;
  return [gx / len, gy / len];
}

export const GHOST_BOUNDS = { minX: -1.5, maxX: 1.5, minY: -1.55, maxY: 1.6 };

// Tips of the side drips, where droplets form and fall
export const DRIP_TIPS: Vec2[] = [
  [-0.41, -1.22],
  [0.41, -1.22],
];
