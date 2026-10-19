import * as THREE from "three";
import { FACES, IDLE_FACE, type FaceName } from "./faces";
import { createFireMaterial, createGhostMaterial, createHaloMaterial, faceUniform, hexToVec3 } from "./ghostMaterial";
import { HALO_RECT } from "./modelBake";
import {
  blendPose,
  MINI_COUNT,
  poseAt,
  REST,
  TRICK_DURATION,
  TRICK_FACE,
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

/** The tiny ghosts' size, as a fraction of his (the mini model is the same height as the full one) */
const MINI_SIZE = 0.15;
/** How late the last tiny ghost leaves and comes back, as a fraction of the flight */
const MINI_STAGGER = 0.35;

/**
 * Each tiny ghost of the clone trick. They spread evenly (a sunflower pattern) over an oval the size of his body,
 * so together they make up his shape, and fly straight out from there to the same angle on an oval that fills the page.
 */
const MINIS = Array.from({ length: MINI_COUNT }, (_, i) => {
  const r = Math.sqrt((i + 0.5) / MINI_COUNT);
  const a = i * 2.39996;
  // A fixed pseudo-random number per ghost, so every run looks the same
  const rand = (k: number) => {
    const v = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return {
    home: { x: 1.0 * r * Math.cos(a), y: 0.05 + 1.3 * r * Math.sin(a) },
    out: { r: 0.12 + 0.88 * Math.sqrt(rand(1)), a: a + (rand(2) - 0.5) * 0.4 },
    delay: rand(3) * MINI_STAGGER,
    size: 0.85 + 0.3 * rand(4),
    phase: rand(5) * Math.PI * 2,
  };
});

/** How long a new trick takes to blend in from wherever the last one left off */
const BLEND_IN = 0.18;
/** Seconds for one face to fade into the next */
const FACE_FADE = 0.16;

/** Owns the ghost's materials and plays its tricks each frame. The loaded textures belong to the GLTF cache. */
export class GhostRig {
  readonly body: ReturnType<typeof createGhostMaterial>;
  readonly halo: ReturnType<typeof createHaloMaterial>;
  readonly fire: ReturnType<typeof createFireMaterial>;

  private trick: { name: TrickName | null; seq: number; start: number } = { name: null, seq: 0, start: 0 };
  private from: Pose = { ...REST };
  private target: Pose = { ...REST };
  private pose: Pose = { ...REST };
  private enter = 0;
  private blink = { next: 2.5, t: -1 };
  private glowColor = new THREE.Vector3();
  private dummy = new THREE.Object3D();
  /** The face in slot A, the one fading in over it in slot B, and how far that fade has got */
  private face: { a: FaceName; b: FaceName; mix: number } = { a: IDLE_FACE, b: IDLE_FACE, mix: 0 };
  private faceMaps: Record<FaceName, THREE.Texture>;
  private faceUniforms = Object.fromEntries(
    Object.entries(FACES).map(([name, face]) => [name, faceUniform(face)]),
  ) as Record<FaceName, ReturnType<typeof faceUniform>>;

  constructor(
    initial: GhostState,
    faceMaps: Record<FaceName, THREE.Texture>,
    haloMap: THREE.Texture,
    finish: { silver: boolean } = { silver: false },
  ) {
    this.faceMaps = faceMaps;
    this.body = createGhostMaterial(faceMaps[IDLE_FACE]);
    this.body.uniforms.uSilver.value = finish.silver ? 1 : 0;
    this.halo = createHaloMaterial(haloMap);
    this.fire = createFireMaterial(
      haloMap,
      new THREE.Vector4(HALO_RECT.minX, HALO_RECT.minY, HALO_SIZE.width, HALO_SIZE.height),
      new THREE.Vector4(FIRE_PLANE.minX, FIRE_PLANE.minY, FIRE_PLANE.width, FIRE_PLANE.height),
    );
    this.trick.seq = initial.trick.seq;
    this.enter = initial.entered ? 1 : 0;
  }

  /**
   * `minis` is the clone trick's instanced tiny ghosts, and `view` is half the visible width and height
   * at the ghost's depth, so they can spread over the whole page on any screen
   */
  update(
    c: GhostState,
    t: number,
    dt: number,
    group: THREE.Object3D | null,
    minis: THREE.InstancedMesh | null = null,
    view = { halfW: 2, halfH: 2.9, centerY: 0 },
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
    const playing = name && u < TRICK_DURATION[name] ? name : null;
    if (playing) poseAt(playing, u, c.reducedMotion, this.target);
    else Object.assign(this.target, REST);
    this.fadeFace(playing ? TRICK_FACE[playing] : IDLE_FACE, step);
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
    uni.uMouthY.value = p.mouthY;
    uni.uBlink.value = Math.max(blinkScale * (1 - p.lid * 0.3), 0.08);
    uni.uGlow.value = p.glow;
    uni.uGlowColor.value.copy(this.glowColor);
    uni.uFire.value = p.fire;
    uni.uFireLevel.value = p.fireLevel;
    uni.uSoot.value = p.soot;
    uni.uWake.value = p.wake;
    uni.uDizzy.value = p.dizzy;
    uni.uShock.value = p.shock;
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

    // The clone trick's tiny ghosts sit outside the ghost's group so they stay put while he shrinks away.
    // Each one bursts out from its spot in his shape to its spot on the page, a little after or before the others,
    // bobs and flutters there, then flies home. They all share his face.
    if (minis) {
      minis.visible = p.minis > 0.001;
      if (minis.visible) {
        const s = 1 + (ENTERED.scale - 1) * this.enter;
        const homeY = ENTERED.y * this.enter;
        const rx = Math.min(view.halfW * 0.85, 6);
        // Clear of the menu at the top and the patience bar at the bottom
        const ry = view.halfH * 0.66;
        const d = this.dummy;
        MINIS.forEach((m, i) => {
          const k = THREE.MathUtils.clamp(p.split * (1 + MINI_STAGGER) - m.delay, 0, 1);
          const fly = k * k * (3 - 2 * k) + 0.12 * Math.sin(Math.PI * k);
          const still = c.reducedMotion ? 0 : 1;
          const tx = rx * m.out.r * Math.cos(m.out.a) + 0.08 * Math.sin(t * 1.3 + m.phase) * still;
          const ty = view.centerY + ry * m.out.r * Math.sin(m.out.a) + 0.07 * Math.sin(t * 2.2 + m.phase) * still;
          const hx = m.home.x * s;
          const hy = m.home.y * s + homeY;
          d.position.set(hx + (tx - hx) * fly, hy + (ty - hy) * fly, 0.3 * Math.sin(m.phase) * fly);
          d.rotation.set(0, 0.35 * Math.sin(t * 1.7 + m.phase) * fly * still, 0.2 * Math.sin(t * 3 + m.phase) * still);
          d.scale.setScalar(Math.max(MINI_SIZE * s * m.size * p.minis, 0.0001));
          d.updateMatrix();
          minis.setMatrixAt(i, d.matrix);
        });
        minis.instanceMatrix.needsUpdate = true;
      }
    }
  }

  /** Fades toward the face `want`, through the two face slots */
  private fadeFace(want: FaceName, step: number) {
    const f = this.face;
    const rate = step / FACE_FADE;
    if (want === f.a) f.mix = Math.max(0, f.mix - rate);
    else {
      if (want !== f.b) {
        // A third face: whichever of the two shows more becomes the one it fades from
        if (f.mix > 0.5) {
          f.a = f.b;
          f.mix = 1 - f.mix;
        }
        f.b = want;
      }
      f.mix = Math.min(1, f.mix + rate);
    }
    if (f.mix >= 1) {
      f.a = f.b;
      f.mix = 0;
    }
    const uni = this.body.uniforms;
    uni.uFaceMapA.value = this.faceMaps[f.a];
    uni.uFaceA.value = this.faceUniforms[f.a];
    uni.uFaceMapB.value = this.faceMaps[f.b];
    uni.uFaceB.value = this.faceUniforms[f.b];
    uni.uFaceMix.value = f.mix;
  }

  dispose() {
    this.body.material.dispose();
    this.halo.material.dispose();
    this.fire.material.dispose();
  }
}
