/**
 * The ghost's tricks, all done in code because Aes's model has no animation clips.
 * Each trick is a pose over time, layered on top of the idle float and the cursor follow.
 * To add a trick: add a name, a caption, a duration, and a case in `poseAt`, then list it in TRICK_ORDER.
 */

export type TrickName =
  | "grin"
  | "spin"
  | "squash"
  | "annoyed shake"
  | "peek"
  | "grin pop"
  | "backflip"
  | "boing"
  | "boo"
  | "neon"
  | "fire"
  | "shades"
  | "talk"
  // Idle moods: they play when nobody touches the ghost for a while
  | "bored"
  | "yawn"
  | "sleep"
  | "waking"
  | "grumpy";

/** Offsets from the resting ghost. Rotations in radians, scales as multipliers, face values 0..1. */
export type Pose = {
  x: number;
  y: number;
  /** Toward the camera */
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
  /** Open, wide smile */
  grin: number;
  /** Smile flipped into a frown */
  frown: number;
  /** Eyelids lowered from the top. 1 is half shut; about 1.15 leaves only a short closed-eye stub. */
  lid: number;
  /** Neon glow strength; `glowT` drives the color cycle */
  glow: number;
  glowT: number;
  /** Extra gaze offset, in face units */
  lookX: number;
  /** A third eye on the forehead, opening sideways (0 is a shut slit) */
  third: number;
  /** Sunglasses sliding down onto the face */
  shades: number;
  /** The gold tooth in the open mouth, and its sparkle */
  tooth: number;
  glint: number;
  /** Flames: strength, how far up the body they have climbed, soot left behind, smoke after */
  fire: number;
  fireLevel: number;
  soot: number;
  smoke: number;
  /** The groggy waking face: squinting V eyes and worried, raised brows */
  wake: number;
};

export const REST: Readonly<Pose> = {
  x: 0,
  y: 0,
  z: 0,
  rx: 0,
  ry: 0,
  rz: 0,
  sx: 1,
  sy: 1,
  sz: 1,
  grin: 0,
  frown: 0,
  lid: 0,
  glow: 0,
  glowT: 0,
  lookX: 0,
  third: 0,
  shades: 0,
  tooth: 0,
  glint: 0,
  fire: 0,
  fireLevel: 0,
  soot: 0,
  smoke: 0,
  wake: 0,
};

/** Seconds each trick runs. `talk` holds until the speech bubble closes. */
export const TRICK_DURATION: Record<TrickName, number> = {
  grin: 1.8,
  spin: 1.1,
  squash: 1.2,
  "annoyed shake": 1.7,
  peek: 2.6,
  "grin pop": 1.5,
  backflip: 1.3,
  boing: 1.9,
  boo: 2.0,
  neon: 3.8,
  fire: 4.8,
  shades: 3.8,
  talk: Infinity,
  bored: 9,
  yawn: 2.6,
  sleep: Infinity,
  waking: 2.2,
  grumpy: 1.9,
};

/** Tricks that roll straight into another when they finish */
export const TRICK_NEXT: Partial<Record<TrickName, TrickName>> = {
  waking: "grumpy",
};

/** Clicks 1 to 9 after entry play these in order. Click 10 is the speech bubble. */
export const TRICK_ORDER: TrickName[] = [
  "spin",
  "annoyed shake",
  "peek",
  "shades",
  "backflip",
  "boing",
  "boo",
  "fire",
  "neon",
];

/** The tenth click */
export const CLICKS_PER_CYCLE = TRICK_ORDER.length + 1;

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = (v: number) => {
  const t = clamp01(v);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
/** Rises over `rise` seconds, holds, then falls over the last `fall` seconds of `total` */
const envelope = (u: number, rise: number, fall: number, total: number) =>
  Math.min(smooth(u / rise), smooth((total - u) / fall));
/** A spring let go from `amount`, settling to 0 */
const spring = (u: number, amount: number, decay: number, freq: number) =>
  amount * Math.exp(-decay * u) * Math.cos(freq * u);

/** Squash that keeps the hem planted: s < 0 flattens, s > 0 stretches. The ghost is about 3 units tall. */
function squashPose(p: Pose, s: number) {
  p.sy = 1 + s;
  p.sx = p.sz = 1 - s * 0.55;
  p.y += 1.5 * s;
}

/** The pose `u` seconds into a trick. Writes into `out` and returns it. */
export function poseAt(name: TrickName, u: number, reducedMotion: boolean, out: Pose): Pose {
  Object.assign(out, REST);
  const d = TRICK_DURATION[name];

  switch (name) {
    case "grin": {
      // The welcome: a big grin and a small happy hop
      out.grin = envelope(u, 0.25, 0.6, d);
      out.lid = 0.35 * out.grin;
      const pop = spring(u, 0.12, 4, 11);
      out.sx = out.sy = out.sz = 1 + pop;
      out.y = 0.2 * Math.sin(Math.PI * clamp01(u / 0.6));
      break;
    }
    case "spin": {
      const p = u / d;
      out.ry = TAU * easeInOutCubic(p);
      out.y = 0.3 * Math.sin(Math.PI * clamp01(p));
      break;
    }
    case "squash":
      squashPose(out, spring(u, -0.32, 4, 13));
      out.grin = 0.4 * envelope(u, 0.1, 0.4, d);
      break;
    case "annoyed shake": {
      const e = envelope(u, 0.15, 0.4, d);
      out.frown = e;
      out.lid = 0.55 * e;
      const shake = Math.exp(-1.6 * u) * clamp01((1.3 - u) * 4);
      out.x = 0.14 * Math.sin(38 * u) * shake;
      out.rz = 0.08 * Math.sin(38 * u + 0.6) * shake;
      break;
    }
    case "peek": {
      // Ducks off to the left edge, peeks back at you, then slides home
      const away = Math.min(easeInOutCubic(u / 0.5), easeInOutCubic((d - u) / 0.6));
      out.x = -1.55 * away;
      out.rz = 0.42 * away;
      out.ry = 0.45 * away;
      out.lookX = 0.09 * away;
      out.grin = 0.5 * smooth((u - 0.9) / 0.3) * away;
      break;
    }
    case "grin pop": {
      out.grin = envelope(u, 0.12, 0.45, d);
      out.lid = 0.4 * out.grin;
      const pop = spring(u, 0.28, 3.5, 12);
      out.sx = out.sy = out.sz = 1 + Math.max(pop, -0.12);
      break;
    }
    case "backflip": {
      const p = u / 1.05;
      out.rx = -TAU * easeInOutCubic(p);
      out.y = 1.0 * Math.sin(Math.PI * clamp01(p));
      if (u > 1.05) squashPose(out, spring(u - 1.05, -0.12, 9, 18));
      break;
    }
    case "boing": {
      // Three hops, each lower, landing with a squash
      const hop = Math.abs(Math.sin(5.4 * u));
      const fade = Math.exp(-1.3 * u) * clamp01((d - u) * 3);
      squashPose(out, (0.06 * hop - 0.14 * (1 - hop)) * fade);
      out.y += 0.75 * hop * fade;
      out.grin = 0.6 * envelope(u, 0.2, 0.4, d);
      break;
    }
    case "boo": {
      // Vanishes, then pops back bigger with its mouth wide open
      const shrink = 1 - smooth(u / 0.28);
      const back = u < 0.9 ? 0 : 1 + spring(u - 0.9, 0.35, 4.5, 13);
      const scale = u < 0.9 ? shrink : back;
      out.sx = out.sy = out.sz = Math.max(scale, 0.0001);
      out.rz = u < 0.9 ? 1.6 * smooth(u / 0.28) : 0;
      out.grin = u < 0.9 ? 0 : envelope(u - 0.9, 0.08, 0.4, d - 0.9);
      break;
    }
    case "neon": {
      out.glow = envelope(u, 0.3, 0.7, d);
      out.glowT = u;
      out.rz = 0.05 * Math.sin(u * 5) * out.glow;
      // Once the colors are going, a third eye splits open on his forehead, blinks once, and shuts again
      const blinkAt = 2.2;
      const blink = 1 - Math.max(0, Math.sin(Math.PI * clamp01((u - blinkAt) / 0.22)));
      out.third = envelope(u - 0.6, 0.45, 0.5, d - 1.0) * blink;
      break;
    }
    case "fire": {
      // Catches fire from the hem up, panics and runs on the spot, goes out in a puff of smoke, sooty and dazed
      const doused = 3.3;
      out.fire = envelope(u, 0.3, 0.35, doused);
      out.fireLevel = smooth(u / 1.1);
      out.soot = smooth((u - 1.8) / 1.2) * (1 - smooth((u - 3.9) / 0.9));
      out.smoke = u > doused - 0.4 ? envelope(u - (doused - 0.4), 0.25, 1.0, d - doused + 0.4) : 0;
      const panic = envelope(u, 0.35, 0.3, doused);
      out.frown = panic;
      out.grin = panic * (0.75 + 0.25 * Math.sin(u * 24));
      out.y = 0.2 * Math.abs(Math.sin(u * 11)) * panic;
      out.x = 0.16 * Math.sin(u * 5.5) * panic;
      out.rz = -0.07 * Math.sin(u * 5.5) * panic;
      out.ry = 0.25 * Math.sin(u * 5.5) * panic;
      // Out: a dazed squash and half-shut eyes
      const dazed = envelope(u - doused, 0.15, 0.6, d - doused);
      squashPose(out, -0.1 * dazed);
      out.lid = 0.65 * dazed;
      break;
    }
    case "shades": {
      // Sunglasses slide down, he leans right up to the glass, flashes a gold tooth, and backs off
      out.shades = envelope(u, 0.45, 0.45, d);
      const near = Math.min(easeInOutCubic((u - 0.35) / 0.75), easeInOutCubic((d - 0.35 - u) / 0.75));
      out.z = 3.4 * near;
      out.y = -0.5 * near;
      out.rz = 0.1 * near;
      out.grin = smooth((u - 1.0) / 0.25) * smooth((d - 0.55 - u) / 0.3);
      out.lid = 0.3 * out.grin;
      out.tooth = out.grin;
      out.glint = Math.max(0, Math.sin(Math.PI * clamp01((u - 1.45) / 0.55)));
      break;
    }
    case "talk": {
      // Shrinks below the speech bubble and leans in, eyes half shut, mouth flapping while it barks the question
      const lean = smooth(u / 0.4);
      out.rx = 0.12 * lean;
      out.y = -1.05 * lean;
      out.sx = out.sy = out.sz = 1 - 0.15 * lean;
      out.lid = 0.5 * lean;
      const talking = clamp01((1.8 - u) * 2);
      out.grin = (0.35 + 0.35 * Math.sin(u * 17)) * talking * lean;
      out.frown = lean * (1 - talking);
      break;
    }
    case "bored": {
      // Looks one way, then the other, sighs and sags a little
      const e = envelope(u, 0.8, 1.2, d);
      out.lid = 0.6 * e;
      out.lookX = 0.07 * Math.sin(u * 0.9) * e;
      out.ry = 0.22 * Math.sin(u * 0.9) * e;
      const sigh = Math.max(0, Math.sin(Math.PI * clamp01((u - 4.5) / 1.6)));
      squashPose(out, -0.06 * sigh * e);
      out.y -= 0.12 * e;
      out.rz = 0.04 * Math.sin(u * 0.6) * e;
      break;
    }
    case "yawn": {
      // Stretches tall with the mouth wide open, then slumps
      const open = envelope(u, 0.7, 0.9, d);
      squashPose(out, 0.12 * open - 0.05 * smooth((u - 1.9) / 0.7));
      out.grin = open;
      out.lid = 0.6 + 0.6 * open;
      out.rx = -0.12 * open;
      out.y -= 0.12;
      break;
    }
    case "sleep": {
      // Eyes shut, slow breathing, head nodding to one side
      const settle = smooth(u / 1.2);
      const breath = Math.sin(u * 1.7);
      out.lid = 1.15 * settle;
      out.y = -0.4 * settle + 0.03 * breath;
      out.rz = 0.1 * settle + 0.015 * breath;
      out.rx = 0.08 * settle;
      squashPose(out, 0.02 * breath * settle);
      break;
    }
    case "waking": {
      // Poked awake: eyes crack open into a squint, brows go up, he sags back once, then drags himself upright
      const e = envelope(u, 0.35, 0.45, d);
      out.wake = e;
      const sag = Math.max(0, Math.sin(Math.PI * clamp01((u - 0.8) / 0.7)));
      out.lid = 1.15 - 0.65 * smooth(u / 0.6) + 0.3 * sag;
      const up = smooth(u / 1.8);
      out.y = -0.4 * (1 - up) - 0.08 * sag;
      out.rz = 0.1 * (1 - up);
      out.rx = 0.08 * (1 - up);
      squashPose(out, 0.06 * Math.sin(Math.PI * clamp01((u - 1.2) / 0.9)));
      break;
    }
    case "grumpy": {
      // Woken up: a jolt, a frown, and a grumble
      const e = envelope(u, 0.1, 0.5, d);
      out.frown = e;
      out.lid = 0.7 * e;
      const jolt = spring(u, 0.22, 6, 16);
      squashPose(out, Math.max(jolt, -0.1));
      const grumble = Math.exp(-1.8 * u) * clamp01((1.4 - u) * 3);
      out.rz = 0.06 * Math.sin(26 * u) * grumble;
      break;
    }
  }

  if (reducedMotion) {
    // Keep the face, glow, and the boo's vanish; drop the movement
    const keepScale = name === "boo" ? out.sx : 1;
    Object.assign(out, { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sx: keepScale, sy: keepScale, sz: keepScale, lookX: 0 });
  }
  return out;
}

/** Linear blend from pose a to pose b */
export function blendPose(a: Pose, b: Pose, k: number, out: Pose): Pose {
  for (const key of Object.keys(REST) as (keyof Pose)[]) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}
