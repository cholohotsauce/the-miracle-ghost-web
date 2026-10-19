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
  | "grin pop"
  | "backflip"
  | "boing"
  | "neon"
  | "fire"
  | "attitude"
  | "tornado"
  | "clone"
  | "curious"
  | "zapped"
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
  /** Moves the mouth up the face, toward the eyes, in face units */
  mouthY: number;
  /** Flames: strength, how far up the body they have climbed, soot left behind, smoke after */
  fire: number;
  fireLevel: number;
  soot: number;
  smoke: number;
  /** The groggy waking face's squinting V eyes */
  wake: number;
  /** Spinning spiral eyes after the tornado */
  dizzy: number;
  /** The clone trick's tiny ghosts: how far they have scattered (0 is packed into his shape) and how big they are (0 is gone) */
  split: number;
  minis: number;
  /** Electrocuted: black body, yellow sparks crackling around him */
  shock: number;
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
  mouthY: 0,
  fire: 0,
  fireLevel: 0,
  soot: 0,
  smoke: 0,
  wake: 0,
  dizzy: 0,
  split: 0,
  minis: 0,
  shock: 0,
};

/** Seconds each trick runs. `talk` holds until the speech bubble closes. */
export const TRICK_DURATION: Record<TrickName, number> = {
  grin: 1.8,
  spin: 1.1,
  squash: 1.2,
  "annoyed shake": 1.7,
  "grin pop": 1.5,
  backflip: 1.3,
  boing: 1.9,
  neon: 4.6,
  fire: 4.8,
  attitude: 2.3,
  tornado: 3.8,
  clone: 4.6,
  curious: 3.6,
  zapped: 4.2,
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

/**
 * Clicks 1 to 9 after entry play these in order: Aes's sequence of 2026-10-07, revised 2026-10-19.
 * Click 10 is his fed-up reaction and the speech bubble ("talk").
 * Aes removed the TV and the dance on 2026-10-19 and will pick their replacements. Until then
 * "boing" and "fire" (both built earlier) hold those two places, so the round stays ten clicks.
 */
export const TRICK_ORDER: TrickName[] = [
  "backflip",
  "attitude",
  "tornado",
  "clone",
  "boing", // Stand-in for the TV
  "neon",
  "fire", // Stand-in for the dance
  "curious",
  "zapped",
];

/** Seconds of fed-up shaking on the tenth click before the speech bubble opens */
export const TALK_LEAD = 0.9;

/** How many tiny ghosts he splits into for the clone trick */
export const MINI_COUNT = 100;

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
    case "neon": {
      // Color play: glides through the neon colors, pulsing to a beat.
      // Aes asked for it slower (2026-10-19): about half the old color speed and beat.
      const on = envelope(u, 0.35, 0.7, d);
      out.glow = on * (0.85 + 0.15 * Math.sin(u * 8));
      out.glowT = u * 1.25;
      out.rz = 0.06 * Math.sin(u * 3.5) * on;
      squashPose(out, 0.04 * Math.sin(u * 6) * on);
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
    case "attitude": {
      // Grins and leans off to one side with attitude, then straightens up
      out.grin = envelope(u, 0.2, 0.5, d);
      const lean = envelope(u - 0.15, 0.35, 0.55, d - 0.15);
      out.lid = 0.45 * lean;
      out.rz = -0.3 * lean;
      out.x = 0.3 * lean;
      out.ry = -0.3 * lean;
      out.lookX = -0.05 * lean;
      out.y = 0.06 * Math.sin(Math.PI * clamp01(u / 0.4));
      break;
    }
    case "tornado": {
      // Spins like a tornado, stretching tall, then stops and wobbles around dizzy with spiral eyes
      const spinEnd = 1.5;
      const spin = easeInOutCubic(u / spinEnd);
      out.ry = TAU * 7 * spin;
      const whirl = Math.sin(Math.PI * clamp01(u / spinEnd));
      squashPose(out, 0.16 * whirl);
      out.y += 0.25 * whirl;
      const dizzy = envelope(u - spinEnd, 0.1, 0.5, d - spinEnd);
      out.dizzy = dizzy;
      const w = u - spinEnd;
      out.rz += 0.14 * Math.sin(w * 5) * dizzy;
      out.rx = 0.1 * Math.cos(w * 5) * dizzy;
      out.x = 0.12 * Math.sin(w * 5 + 0.8) * dizzy;
      out.frown = 0.6 * dizzy;
      // Aes asked for the mouth a little higher here, closer to the eyes (2026-10-19)
      out.mouthY = 0.12 * dizzy;
      break;
    }
    case "clone": {
      // He puffs up and splits into about a hundred tiny ghosts. They burst out all over the page and hover,
      // then rush back into his shape and he is whole again (Aes, 2026-10-19).
      const burst = 0.4;
      const regroup = d - 1.15;
      const merged = d - 0.4;
      if (u < burst) {
        const puff = smooth(u / burst);
        out.sx = out.sy = out.sz = 1 + 0.12 * puff + 0.02 * Math.sin(u * 50) * puff;
        out.lid = 0.4 * puff;
      } else if (u < merged) {
        out.sx = out.sy = out.sz = 0.0001;
      } else {
        const back = u - merged;
        out.sx = out.sy = out.sz = Math.max(0.0001, smooth(back / 0.1) + spring(back, 0.18, 7, 16));
        out.grin = 0.6 * envelope(back, 0.08, 0.25, d - merged);
      }
      // The tiny ghosts take his place as he splits, and hand it back as he reappears
      out.minis = u < burst ? 0 : 1 - smooth((u - merged) / 0.1);
      out.split = u < regroup ? smooth((u - burst) / 0.55) : 1 - easeInOutCubic((u - regroup) / (merged - regroup));
      break;
    }
    case "curious": {
      // Curious (replaced the jumpscare, 2026-10-19): he floats up to the screen, tilts his head one way and then
      // the other as if studying you, then drifts back to his place
      const near = Math.min(easeInOutCubic(u / 0.9), easeInOutCubic((d - u) / 0.9));
      out.z = 2.2 * near;
      out.y = -0.15 * near;
      out.rx = -0.06 * near;
      const tiltA = envelope(u - 0.75, 0.35, 0.35, 1.05);
      const tiltB = envelope(u - 1.65, 0.35, 0.4, 1.05);
      out.rz = 0.3 * tiltA - 0.22 * tiltB;
      out.x = -0.12 * tiltA + 0.08 * tiltB;
      out.lookX = 0.03 * tiltA - 0.03 * tiltB;
      break;
    }
    case "zapped": {
      // A cartoon electric shock: goes black, sparks crackle yellow around him, shakes like mad.
      // Afterwards he looks tired and sad for a couple of seconds, then perks back up.
      const zapEnd = 1.8;
      const shock = envelope(u, 0.04, 0.25, zapEnd);
      out.shock = shock;
      out.frown = shock;
      out.grin = 0.85 * shock;
      squashPose(out, 0.14 * shock);
      out.x = 0.13 * Math.sin(u * 71) * shock;
      out.y += 0.06 * Math.sin(u * 53) * shock;
      out.rz = 0.09 * Math.sin(u * 61 + 1) * shock;
      const after = u - zapEnd + 0.2;
      out.soot = 0.6 * envelope(after, 0.15, 0.6, 1.4);
      out.smoke = 0.5 * envelope(after, 0.15, 0.5, 1.0);
      const sad = envelope(after, 0.25, 0.5, d - zapEnd + 0.2);
      out.frown = Math.max(out.frown * (1 - sad), 0.9 * sad);
      out.grin *= 1 - sad;
      out.lid = 0.55 * sad;
      out.y -= 0.18 * sad;
      out.rz += 0.06 * sad;
      squashPose(out, -0.05 * sad);
      break;
    }
    case "talk": {
      // Fed up: puffs up and shakes with a scowl. Then, as the speech bubble opens, he shrinks below it
      // and goes back to his usual smile, and keeps it.
      if (u < TALK_LEAD) {
        const e = envelope(u, 0.1, 0.25, TALK_LEAD);
        out.frown = e;
        out.lid = 0.7 * e;
        squashPose(out, spring(u, 0.18, 5, 15) * e);
        out.x = 0.1 * Math.sin(u * 45) * e;
        out.rz = 0.06 * Math.sin(u * 45 + 0.5) * e;
        break;
      }
      u -= TALK_LEAD;
      const lean = smooth(u / 0.4);
      out.rx = 0.12 * lean;
      out.y = -1.05 * lean;
      out.sx = out.sy = out.sz = 1 - 0.15 * lean;
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
      // Poked awake: eyes crack open into a squint, he sags back once, then drags himself upright
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
    // Keep the face, glow, and the vanishing tricks' scale; drop the movement
    const keepScale = name === "clone" ? out.sx : 1;
    Object.assign(out, { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sx: keepScale, sy: keepScale, sz: keepScale, lookX: 0 });
  }
  return out;
}

/** Linear blend from pose a to pose b */
export function blendPose(a: Pose, b: Pose, k: number, out: Pose): Pose {
  for (const key of Object.keys(REST) as (keyof Pose)[]) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}
