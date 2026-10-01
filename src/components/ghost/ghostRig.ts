import * as THREE from "three";
import { buildDropletGeometry, buildGhostGeometry, buildHaloTexture, HALO_SIZE } from "./buildGhostGeometry";
import { createGhostMaterial, createHaloMaterial, hexToVec3 } from "./ghostMaterial";
import { DRIP_TIPS } from "./silhouette";
import type { GhostState } from "./types";

const DROP_PERIOD = 3.4;
const HALO_MARGIN = 1.1;

/** Owns the ghost's GPU resources and advances its animation each frame. */
export class GhostRig {
  readonly geometry = buildGhostGeometry();
  readonly dropGeometry = buildDropletGeometry();
  readonly body = createGhostMaterial(true);
  readonly drop = createGhostMaterial(false);
  readonly halo = createHaloMaterial(buildHaloTexture(256, HALO_MARGIN));
  readonly haloSize = HALO_SIZE(HALO_MARGIN);

  private color = new THREE.Vector3(1, 1, 1);
  private target = new THREE.Vector3();
  private squash = { x: 0, v: 0 };
  private blink = { next: 2.5, t: -1 };
  private pulse = 0;
  private lastPoke = 0;

  constructor(initial: GhostState) {
    hexToVec3(initial.color, this.color);
    this.lastPoke = initial.pokes;
  }

  update(c: GhostState, t: number, dt: number, squashGroup: THREE.Object3D | null, drops: (THREE.Mesh | null)[]) {
    const step = Math.min(dt, 1 / 20);
    const { body, drop, halo } = this;

    // Wake ramps up over about a second and a half; sleeping fades faster
    const wake = body.uniforms.uWake.value;
    const wakeNext = wake + ((c.awake ? 1 : 0) - wake) * (1 - Math.exp(-step * (c.awake ? 2.2 : 4)));

    hexToVec3(c.color, this.target);
    this.color.lerp(this.target, 1 - Math.exp(-step * 5));

    // A poke squashes the ghost on a spring and sends a pulse of light through it
    if (c.pokes !== this.lastPoke) {
      this.lastPoke = c.pokes;
      this.squash.v += 7;
      this.pulse = 1;
    }
    const s = this.squash;
    s.v += (-s.x * 160 - s.v * 9) * step;
    s.x += s.v * step;
    this.pulse *= Math.exp(-step * 3);
    squashGroup?.scale.set(1 + s.x * 0.08, 1 - s.x * 0.1, 1 + s.x * 0.05);

    // Blink every few seconds while awake
    const b = this.blink;
    let blinkScale = 1;
    if (c.awake && !c.reducedMotion) {
      if (b.t < 0 && t > b.next) b.t = 0;
      if (b.t >= 0) {
        b.t += step;
        const k = b.t / 0.16;
        blinkScale = k < 1 ? Math.max(0.08, Math.abs(1 - k * 2)) : 1;
        if (k >= 1) {
          b.t = -1;
          b.next = t + 2.2 + Math.random() * 3.5;
        }
      }
    }

    // The face turns toward the cursor or tilt
    const look = body.uniforms.uLook.value;
    const lookK = 1 - Math.exp(-step * 6);
    look.x += (c.tilt.x * 0.07 - look.x) * lookK;
    look.y += (c.tilt.y * 0.05 - look.y) * lookK;

    const motion = c.reducedMotion ? 0 : 1;
    for (const u of [body.uniforms, drop.uniforms]) {
      u.uTime.value = t;
      u.uMotion.value = motion;
      u.uWake.value = wakeNext;
      u.uPulse.value = this.pulse;
      u.uColor.value.copy(this.color);
    }
    body.uniforms.uBlink.value = blinkScale;
    halo.uniforms.uColor.value.copy(this.color);
    halo.uniforms.uStrength.value = wakeNext * (0.85 + this.pulse * 0.6);

    // Droplets bead at the drip tips, then let go and fall
    DRIP_TIPS.forEach(([x, y], i) => {
      const mesh = drops[i];
      if (!mesh) return;
      const phase = ((t + i * 1.7) / DROP_PERIOD) % 1;
      let scale: number;
      let dy: number;
      if (phase < 0.45) {
        scale = THREE.MathUtils.smoothstep(phase / 0.45, 0, 1);
        dy = -0.03 * scale;
      } else {
        const fall = (phase - 0.45) * DROP_PERIOD;
        scale = 1 - THREE.MathUtils.smoothstep(fall, 0.55, 0.95);
        dy = -0.09 - 1.6 * fall * fall;
      }
      const visible = wakeNext > 0.5 && motion > 0 ? scale : 0;
      mesh.visible = visible > 0.001;
      mesh.position.set(x, y - 0.06 + dy, 0);
      mesh.scale.set(0.075 * visible, 0.11 * visible * (phase < 0.45 ? 1 : 1.15), 0.075 * visible);
    });
  }

  dispose() {
    this.geometry.dispose();
    this.dropGeometry.dispose();
    this.body.material.dispose();
    this.drop.material.dispose();
    this.halo.uniforms.uMap.value.dispose();
    this.halo.material.dispose();
  }
}

export { DRIP_TIPS };
