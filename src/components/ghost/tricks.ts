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
  | "boo"
  | "neon"
  | "fire"
  | "attitude"
  | "tornado"
  | "clone"
  | "swarm"
  | "tv"
  | "dance"
  | "jumpscare"
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
  /** The groggy waking face's squinting V eyes */
  wake: number;
  /** Worried, raised brows (waking up, and sad after the zap) */
  brow: number;
  /** Spinning spiral eyes after the tornado */
  dizzy: number;
  /** How far the clone has split off (0 is merged), its size, and how far the two have turned to look at each other */
  clone: number;
  cloneScale: number;
  cloneLook: number;
  /** How far the swarm of tiny ghosts has scattered (0 is gathered back into him) */
  swarm: number;
  /** TV static over his body, and the old-TV switch-off squeezing him to a line */
  tv: number;
  crt: number;
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
  shades: 0,
  tooth: 0,
  glint: 0,
  fire: 0,
  fireLevel: 0,
  soot: 0,
  smoke: 0,
  wake: 0,
  brow: 0,
  dizzy: 0,
  clone: 0,
  cloneScale: 0,
  cloneLook: 0,
  swarm: 0,
  tv: 0,
  crt: 0,
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
  boo: 2.0,
  neon: 3.8,
  fire: 4.8,
  attitude: 2.3,
  tornado: 3.8,
  clone: 4.0,
  swarm: 4.4,
  tv: 3.0,
  dance: 4.6,
  jumpscare: 2.5,
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
 * Aes is choosing between two clone tricks: "clone" (option A: a twin pops up beside him)
 * and "swarm" (option B: he pops into a swarm of tiny ghosts). This is the one the site plays;
 * adding ?clone=b to the address plays the other one, for comparing.
 */
export const CLONE_OPTION: "clone" | "swarm" = "clone";

/**
 * Clicks 1 to 9 after entry play these in order: Aes's sequence of 2026-10-07, revised 2026-10-08.
 * Click 10 is his fed-up reaction and the speech bubble ("talk").
 * "fire" is built but not in his list yet.
 */
export const TRICK_ORDER: TrickName[] = [
  "backflip",
  "attitude",
  "tornado",
  CLONE_OPTION,
  "tv",
  "neon",
  "dance",
  "jumpscare",
  "zapped",
];

/** How far apart the clone and the ghost end up, in world units */
export const CLONE_GAP = 0.95;

/** Seconds of fed-up shaking on the tenth click before the speech bubble opens */
export const TALK_LEAD = 0.9;

/** How many tiny ghosts the swarm splits into */
export const SWARM_COUNT = 14;

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
      // Color play: races through the neon colors, strobing and pulsing to a beat
      const on = envelope(u, 0.25, 0.6, d);
      out.glow = on * (0.8 + 0.2 * Math.sin(u * 19));
      out.glowT = u * 2.6;
      out.rz = 0.06 * Math.sin(u * 7) * on;
      squashPose(out, 0.05 * Math.sin(u * 12) * on);
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
      break;
    }
    case "clone": {
      // Option A: he steps aside and, with a pop, a twin appears next to him.
      // They turn and look at each other, look back out at you, then slide together and merge.
      const apart = Math.min(easeInOutCubic(u / 0.35), easeInOutCubic((d - 0.15 - u) / 0.6));
      out.clone = apart;
      out.x = -CLONE_GAP * apart;
      out.sx = out.sy = out.sz = 1 - 0.25 * apart;
      out.cloneScale = u < 0.3 ? 0 : Math.max(0, smooth((u - 0.3) / 0.1) + spring(u - 0.3, 0.35, 6, 16));
      const look = envelope(u - 0.9, 0.25, 0.25, 1.25);
      out.cloneLook = look;
      out.lookX = 0.09 * look;
      out.ry = 0.4 * look;
      out.grin = 0.5 * look;
      break;
    }
    case "swarm": {
      // Option B: he puffs up and pops into a swarm of tiny ghosts that scatter and hover,
      // then they rush back together and he pops back whole
      const burst = 0.4;
      const regroup = d - 0.9;
      if (u < burst) {
        const puff = smooth(u / burst);
        out.sx = out.sy = out.sz = 1 + 0.15 * puff + 0.02 * Math.sin(u * 50) * puff;
        out.lid = 0.4 * puff;
      } else if (u < regroup + 0.55) {
        out.sx = out.sy = out.sz = 0.0001;
      } else {
        const back = u - regroup - 0.55;
        out.sx = out.sy = out.sz = Math.max(0.0001, smooth(back / 0.12) + spring(back, 0.25, 6, 15));
        out.grin = 0.6 * envelope(back, 0.1, 0.3, d - regroup - 0.55);
      }
      const spread = u < burst ? 0 : Math.min(1, smooth((u - burst) / 0.35) + spring(u - burst, 0.12, 5, 12));
      out.swarm = u < regroup ? spread : 1 - easeInOutCubic((u - regroup) / 0.55);
      break;
    }
    case "tv": {
      // Static fuzzes over him like a lost channel, then the old-TV switch-off:
      // he squeezes into a thin line, then a dot, and he's gone. A moment later he flickers back on.
      const lineAt = 1.05;
      const offAt = 1.55;
      const onAt = 2.25;
      if (u < offAt) {
        out.tv = smooth(u / 0.2);
        const k1 = smooth((u - lineAt) / 0.2);
        const k2 = smooth((u - lineAt - 0.25) / 0.18);
        out.sy = 1 + (0.02 - 1) * k1;
        out.sx = out.sz = (1 + 0.2 * k1) * (1 - 0.97 * k2);
        out.crt = k1;
        // Glitchy sideways jumps while the signal breaks up
        out.x = 0.07 * Math.sin(Math.floor(u * 14) * 78.233) * out.tv * (1 - k1);
      } else if (u < onAt) {
        out.sx = out.sy = out.sz = 0.0001;
      } else {
        const k = u - onAt;
        out.sx = out.sz = Math.max(0.0001, smooth(k / 0.1));
        out.sy = Math.max(0.0001, smooth((k - 0.08) / 0.15));
        out.tv = 1 - smooth((k - 0.25) / 0.4);
        out.crt = 1 - smooth(k / 0.25);
      }
      break;
    }
    case "dance": {
      // Puts his sunglasses on and grooves: head rolling in a circle, body swaying side to side.
      // To finish he leans in and flashes the gold tooth.
      out.shades = envelope(u, 0.4, 0.45, d);
      const groove = envelope(u - 0.4, 0.3, 0.5, 3.0);
      const beat = TAU * 1.6;
      out.rx = 0.13 * Math.sin(beat * u) * groove;
      out.rz = 0.13 * Math.cos(beat * u) * groove;
      out.x = 0.38 * Math.sin((beat / 2) * u) * groove;
      out.y = 0.09 * Math.abs(Math.sin(beat * u)) * groove;
      out.grin = 0.45 * groove;
      const flash = envelope(u - 3.3, 0.3, 0.35, d - 3.45);
      out.z = 2.2 * flash;
      out.y -= 0.35 * flash;
      out.grin = Math.max(out.grin, flash);
      out.tooth = out.grin;
      out.lid = 0.3 * out.grin;
      out.glint = Math.max(0, Math.sin(Math.PI * clamp01((u - 3.6) / 0.5)));
      break;
    }
    case "jumpscare": {
      // Vanishes, then slams back huge and right up against the screen, mouth wide open
      const gone = 0.75;
      if (u < gone) {
        const shrink = 1 - smooth(u / 0.25);
        out.sx = out.sy = out.sz = Math.max(shrink, 0.0001);
      } else {
        const near = Math.min(1, easeInOutCubic((d - 0.15 - u) / 0.9));
        out.z = 5.2 * near;
        out.y = -0.75 * near;
        const s = 1 + 0.35 * near + spring(u - gone, 0.15, 7, 20);
        out.sx = out.sy = out.sz = s;
        out.grin = near;
        out.x = 0.03 * Math.sin(u * 60) * near;
      }
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
      out.brow = sad;
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
      // Poked awake: eyes crack open into a squint, brows go up, he sags back once, then drags himself upright
      const e = envelope(u, 0.35, 0.45, d);
      out.wake = e;
      out.brow = e;
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
    const keepScale = name === "boo" || name === "swarm" || name === "tv" ? out.sx : 1;
    Object.assign(out, { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sx: keepScale, sy: keepScale, sz: keepScale, lookX: 0 });
  }
  return out;
}

/** Linear blend from pose a to pose b */
export function blendPose(a: Pose, b: Pose, k: number, out: Pose): Pose {
  for (const key of Object.keys(REST) as (keyof Pose)[]) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}
