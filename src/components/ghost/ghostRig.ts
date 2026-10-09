import * as THREE from "three";
import { createFireMaterial, createGhostMaterial, createHaloMaterial, hexToVec3 } from "./ghostMaterial";
import { HALO_RECT } from "./modelBake";
import {
  blendPose,
  CLONE_GAP,
  poseAt,
  REST,
  SWARM_COUNT,
  TRICK_DURATION,
  TRICK_NEXT,
  type Pose,
  type TrickName,
} from "./tricks";
import type { GhostState } from "./types";

export const HALO_SIZE = {
  width: HALO_RECT.maxX - HALO_RECT.minX,
  height: HALO_RECT.maxY - HALO_RECT.minY,
  centerY: (HALO_RECT.maxY + HALO_RECT.minY) / 2,
};

/** The plane behind the ghost that carries the fire trick's flames: room above his head for them to rise */
export const FIRE_PLANE = { minX: -2.4, minY: -1.9, width: 4.8, height: 5.2, z: -0.75 };

/** The neon trick cycles through the brand accents */
const NEON = ["#39ff14", "#ff00ff", "#00ffff", "#ffe600", "#8a2bff", "#ff5e00"].map((hex) => hexToVec3(hex));
const ZAP = hexToVec3("#ffe600");
const NEON_STEP = 0.9;

/** After entry the ghost drops a little and shrinks, making room for the menu */
const ENTERED = { y: -0.3, scale: 0.92 };

/**
 * Where each tiny ghost in the swarm hovers, spread evenly over an oval around him (a sunflower pattern),
 * in world units from his center
 */
const SWARM_SPOTS = Array.from({ length: SWARM_COUNT }, (_, i) => {
  const r = Math.sqrt((i + 0.5) / SWARM_COUNT);
  const a = i * 2.39996;
  return { x: 1.5 * r * Math.cos(a), y: 0.15 + 1.6 * r * Math.sin(a) };
});
const SWARM_SIZE = 0.24;

/** How long a new trick takes to blend in from wherever the last one left off */
const BLEND_IN = 0.18;

/** Owns the ghost's materials and plays its tricks each frame. The loaded textures belong to the GLTF cache. */
export class GhostRig {
  readonly body: ReturnType<typeof createGhostMaterial>;
  readonly halo: ReturnType<typeof createHaloMaterial>;
  readonly fire: ReturnType<typeof createFireMaterial>;
  /** The clone's own copy of the body material, so it can look the other way */
  readonly cloneBody: ReturnType<typeof createGhostMaterial>;

  private trick: { name: TrickName | null; seq: number; start: number } = { name: null, seq: 0, start: 0 };
  private from: Pose = { ...REST };
  private target: Pose = { ...REST };
  private pose: Pose = { ...REST };
  private enter = 0;
  private blink = { next: 2.5, t: -1 };
  private glowColor = new THREE.Vector3();

  constructor(initial: GhostState, faceMap: THREE.Texture, haloMap: THREE.Texture) {
    this.body = createGhostMaterial(faceMap);
    this.halo = createHaloMaterial(haloMap);
    this.cloneBody = createGhostMaterial(faceMap);
    this.fire = createFireMaterial(
      haloMap,
      new THREE.Vector4(HALO_RECT.minX, HALO_RECT.minY, HALO_SIZE.width, HALO_SIZE.height),
      new THREE.Vector4(FIRE_PLANE.minX, FIRE_PLANE.minY, FIRE_PLANE.width, FIRE_PLANE.height),
    );
    this.trick.seq = initial.trick.seq;
    this.enter = initial.entered ? 1 : 0;
  }

  update(
    c: GhostState,
    t: number,
    dt: number,
    group: THREE.Object3D | null,
    clone: THREE.Object3D | null = null,
    swarm: THREE.Object3D | null = null,
  ) {
    const step = Math.min(dt, 1 / 20);
    const { body, halo } = this;

    // A new trick, or a null one that ends the current trick, starts from the current pose so nothing snaps.
    // A trick that runs out lands on REST; spins and flips end a full turn round, which looks the same.
    if (c.trick.seq !== this.trick.seq) {
      this.from = { ...this.pose };
      this.trick = { name: c.trick.name, seq: c.trick.seq, start: t };
    }
    // Some tricks roll into another (waking up turns grumpy)
    const ended = this.trick.name;
    const next = ended && TRICK_NEXT[ended];
    if (next && t - this.trick.start >= TRICK_DURATION[ended]) {
      this.from = { ...this.pose };
      this.trick = { name: next, seq: this.trick.seq, start: t };
    }
    const u = t - this.trick.start;
    const name = this.trick.name;
    if (name && u < TRICK_DURATION[name]) poseAt(name, u, c.reducedMotion, this.target);
    else Object.assign(this.target, REST);
    const k = THREE.MathUtils.smoothstep(u / BLEND_IN, 0, 1);
    const p = blendPose(this.from, this.target, k, this.pose);

    this.enter += ((c.entered ? 1 : 0) - this.enter) * (1 - Math.exp(-step * 3));
    if (group) {
      const s = 1 + (ENTERED.scale - 1) * this.enter;
      group.position.set(p.x, p.y + ENTERED.y * this.enter, p.z);
      group.rotation.set(p.rx, p.ry, p.rz);
      group.scale.set(p.sx * s, p.sy * s, p.sz * s);
    }

    // Blink every few seconds
    const b = this.blink;
    let blinkScale = 1;
    if (!c.reducedMotion) {
      if (b.t < 0 && t > b.next) b.t = 0;
      if (b.t >= 0) {
        b.t += step;
        const bk = b.t / 0.16;
        blinkScale = bk < 1 ? Math.max(0.08, Math.abs(1 - bk * 2)) : 1;
        if (bk >= 1) {
          b.t = -1;
          b.next = t + 2.2 + Math.random() * 3.5;
        }
      }
    }

    // The face turns toward the cursor or tilt
    const look = body.uniforms.uLook.value;
    const lookK = 1 - Math.exp(-step * 6);
    look.x += (c.tilt.x * 0.07 + p.lookX - look.x) * lookK;
    look.y += (c.tilt.y * 0.05 - look.y) * lookK;

    // Neon glides from accent to accent
    const cycle = p.glowT / NEON_STEP;
    const i = Math.floor(cycle);
    this.glowColor
      .copy(NEON[i % NEON.length])
      .lerp(NEON[(i + 1) % NEON.length], THREE.MathUtils.smoothstep(cycle - i, 0.6, 1));

    const uni = body.uniforms;
    uni.uTime.value = t;
    uni.uMotion.value = c.reducedMotion ? 0 : 1;
    uni.uGrin.value = p.grin;
    uni.uFrown.value = p.frown;
    uni.uLid.value = p.lid;
    uni.uBlink.value = Math.max(blinkScale * (1 - p.lid * 0.3), 0.08);
    uni.uGlow.value = p.glow;
    uni.uGlowColor.value.copy(this.glowColor);
    uni.uShades.value = p.shades;
    uni.uTooth.value = p.tooth;
    uni.uGlint.value = p.glint;
    uni.uFire.value = p.fire;
    uni.uFireLevel.value = p.fireLevel;
    uni.uSoot.value = p.soot;
    uni.uWake.value = p.wake;
    uni.uBrow.value = p.brow;
    uni.uDizzy.value = p.dizzy;
    uni.uShock.value = p.shock;
    uni.uTv.value = p.tv;
    uni.uCrt.value = p.crt;
    // The halo glows in the neon colors, or yellow while he is being zapped
    halo.uniforms.uColor.value.copy(p.shock > p.glow ? ZAP : this.glowColor);
    halo.uniforms.uStrength.value = Math.max(p.glow, p.shock) * 0.75;

    const fire = this.fire.uniforms;
    fire.uTime.value = t;
    fire.uFire.value = p.fire;
    fire.uLevel.value = p.fireLevel;
    fire.uSmoke.value = p.smoke;
    fire.uZap.value = p.shock;
    this.fire.material.visible = p.fire > 0.001 || p.smoke > 0.001 || p.shock > 0.001;

    // The clone rides inside the ghost's group: offset so the two end up mirrored either side of center,
    // turned to face each other, with the same face except it looks the other way
    if (clone) {
      clone.visible = p.clone > 0.001;
      if (clone.visible) {
        const parentScale = group ? group.scale.x : 1;
        clone.position.x = (2 * CLONE_GAP * p.clone) / Math.max(parentScale, 0.0001);
        clone.rotation.y = -0.8 * p.cloneLook;
        clone.scale.setScalar(Math.max(p.cloneScale, 0.0001));
        const cu = this.cloneBody.uniforms as Record<string, { value: unknown }>;
        for (const [key, u] of Object.entries(uni as Record<string, { value: unknown }>)) {
          const v = u.value;
          if (typeof v === "number" || v instanceof THREE.Texture) cu[key].value = v;
          else (cu[key].value as THREE.Vector2 | THREE.Vector3 | THREE.Vector4).copy(v as never);
        }
        this.cloneBody.uniforms.uLook.value.x = look.x - 2 * p.lookX;
        // Its body sways a beat out of step with the original
        this.cloneBody.uniforms.uTime.value = t + 0.37;
      }
    }

    // The swarm sits outside the ghost's group so it stays put while he shrinks away.
    // Each tiny ghost flies out to its spot and bobs there; they all share his face.
    if (swarm) {
      swarm.visible = p.swarm > 0.02;
      if (swarm.visible) {
        swarm.position.set(0, ENTERED.y * this.enter, 0);
        swarm.children.forEach((mini, i) => {
          const spot = SWARM_SPOTS[i];
          if (!spot) return;
          const bob = c.reducedMotion ? 0 : 0.06 * Math.sin(t * 2.2 + i * 1.7);
          mini.position.set(spot.x * p.swarm, spot.y * p.swarm + bob, 0.1 * Math.sin(i));
          mini.rotation.z = c.reducedMotion ? 0 : 0.18 * Math.sin(t * 3 + i);
          mini.scale.setScalar(SWARM_SIZE * Math.min(1, p.swarm * 3));
        });
      }
    }
  }

  dispose() {
    this.body.material.dispose();
    this.halo.material.dispose();
    this.fire.material.dispose();
    this.cloneBody.material.dispose();
  }
}
