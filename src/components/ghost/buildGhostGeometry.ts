import * as THREE from "three";
import { GHOST_BOUNDS, ghostSdf, ghostSdfGradient } from "./silhouette";

// How far the silhouette puffs out toward the viewer. The back is a little flatter.
const FRONT_PUFF = 0.95;
const BACK_PUFF = 0.7;

/**
 * Inflates the 2D silhouette into a soft, pillowy mesh, like an airbrushed blob.
 * A dense grid is laid over the silhouette. Grid points outside are snapped onto the
 * outline; inside, a height field is found by solving a Poisson equation (the shape of
 * a membrane blown up from behind), and z = sqrt(height) rounds the edges into the seam.
 * Unlike raw distance-to-edge, the solution has no creases along the shape's spine.
 */
export function buildGhostGeometry(step = 0.012): THREE.BufferGeometry {
  const { minX, maxX, minY, maxY } = GHOST_BOUNDS;
  const cols = Math.ceil((maxX - minX) / step) + 1;
  const rows = Math.ceil((maxY - minY) / step) + 1;
  const count = cols * rows;

  const flat = new Float32Array(count * 2);
  const grad = new Float32Array(count * 2);
  const inside = new Uint8Array(count);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      let x = minX + c * step;
      let y = minY + r * step;
      let d = ghostSdf(x, y);
      inside[i] = d < 0 ? 1 : 0;

      if (d >= 0) {
        // A few Newton steps put outside points onto the outline itself
        for (let k = 0; k < 4 && Math.abs(d) > 1e-5; k++) {
          const [gx, gy] = ghostSdfGradient(x, y);
          x -= gx * d;
          y -= gy * d;
          d = ghostSdf(x, y);
        }
      }

      const [gx, gy] = ghostSdfGradient(x, y);
      flat[i * 2] = x;
      flat[i * 2 + 1] = y;
      grad[i * 2] = gx;
      grad[i * 2 + 1] = gy;
    }
  }

  // Solve laplacian(h) = -2 inside, h = 0 outside, by over-relaxed Gauss-Seidel.
  // For a strip of half-width w this gives sqrt(h) = w at the middle, so thin drips stay thin.
  const h = new Float32Array(count);
  const rhs = 2 * step * step;
  const omega = 1.94;
  for (let iter = 0; iter < 500; iter++) {
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const i = r * cols + c;
        if (!inside[i]) continue;
        const avg = (h[i - 1] + h[i + 1] + h[i - cols] + h[i + cols] + rhs) * 0.25;
        h[i] += omega * (avg - h[i]);
      }
    }
  }

  // Front and back share the same grid; the back copy starts at offset `count`
  const positions = new Float32Array(count * 2 * 3);
  const normals = new Float32Array(count * 2 * 3);
  const shape = new Float32Array(count * 2 * 2);
  const depthAttr = new Float32Array(count * 2);
  const front = new Float32Array(count * 2);
  const n = new THREE.Vector3();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const x = flat[i * 2];
      const y = flat[i * 2 + 1];
      const s = Math.sqrt(Math.max(h[i], 0));

      // Height-field slope; on the outline itself, the outward edge direction
      let hx = 0;
      let hy = 0;
      if (inside[i] && c > 0 && c < cols - 1 && r > 0 && r < rows - 1) {
        hx = (h[i + 1] - h[i - 1]) / (2 * step);
        hy = (h[i + cols] - h[i - cols]) / (2 * step);
      }
      const outward = !inside[i] || Math.hypot(hx, hy) < 1e-6;

      for (let side = 0; side < 2; side++) {
        const j = i + side * count;
        const puff = side === 0 ? FRONT_PUFF : BACK_PUFF;
        const sign = side === 0 ? 1 : -1;

        positions[j * 3] = x;
        positions[j * 3 + 1] = y;
        positions[j * 3 + 2] = sign * puff * s;

        // Normal of z = puff * sqrt(h), scaled by sqrt(h) so it stays finite at the rim
        if (outward) n.set(grad[i * 2], grad[i * 2 + 1], 0);
        else n.set((-puff * hx) / 2, (-puff * hy) / 2, sign * s);
        n.normalize();
        normals[j * 3] = n.x;
        normals[j * 3 + 1] = n.y;
        normals[j * 3 + 2] = n.z;

        shape[j * 2] = x;
        shape[j * 2 + 1] = y;
        depthAttr[j] = s;
        front[j] = side === 0 ? 1 : 0;
      }
    }
  }

  const indices: number[] = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      for (const [p, q, t] of [
        [a, b, e],
        [a, e, d],
      ]) {
        // Triangles wholly outside the silhouette collapse onto the outline; drop them
        if (!inside[p] && !inside[q] && !inside[t]) continue;
        indices.push(p, q, t);
        indices.push(p + count, t + count, q + count);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("aShape", new THREE.BufferAttribute(shape, 2));
  geometry.setAttribute("aDepth", new THREE.BufferAttribute(depthAttr, 1));
  geometry.setAttribute("aFront", new THREE.BufferAttribute(front, 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

/** A soft glow texture shaped exactly like the silhouette, for the halo behind the ghost. */
export function buildHaloTexture(size = 256, margin = 1): THREE.DataTexture {
  const { minX, maxX, minY, maxY } = GHOST_BOUNDS;
  const w = maxX - minX + margin * 2;
  const h = maxY - minY + margin * 2;
  const width = size;
  const height = Math.round((size * h) / w);
  const data = new Uint8Array(width * height * 4);

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const x = minX - margin + (w * (i + 0.5)) / width;
      const y = minY - margin + (h * (j + 0.5)) / height;
      const d = Math.max(ghostSdf(x, y), 0);
      // Fade to nothing before the texture's border so the plane's edge never shows
      const edge = Math.min(i, width - 1 - i, j, height - 1 - j) / (width * 0.12);
      const glow = (0.55 * Math.exp(-d * 7) + 0.3 * Math.exp(-d * 2.2)) * Math.min(edge, 1);
      const k = (j * width + i) * 4;
      data[k] = data[k + 1] = data[k + 2] = 255;
      data[k + 3] = Math.round(Math.min(glow, 1) * 255);
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export const HALO_SIZE = (margin = 1) => ({
  width: GHOST_BOUNDS.maxX - GHOST_BOUNDS.minX + margin * 2,
  height: GHOST_BOUNDS.maxY - GHOST_BOUNDS.minY + margin * 2,
  centerY: (GHOST_BOUNDS.maxY + GHOST_BOUNDS.minY) / 2,
});

/** A falling droplet: a lathe teardrop with its point up. */
export function buildDropletGeometry(): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const steps = 24;
  for (let k = 0; k <= steps; k++) {
    const t = (k / steps) * Math.PI;
    const x = Math.sin(t) * Math.pow(Math.sin(t / 2), 1.6) * 0.6;
    const y = Math.cos(t);
    points.push(new THREE.Vector2(Math.max(x, 1e-4), y));
  }
  // Lathe expects the profile from bottom to top
  const geometry = new THREE.LatheGeometry(points.reverse(), 24);
  geometry.computeVertexNormals();
  return geometry;
}
