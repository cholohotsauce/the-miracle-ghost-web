import * as THREE from "three";
import { FACES, IDLE_FACE, type Face } from "./faces";

/**
 * Aes's ghost as matte grey clay on a white page, like the render in his prototype video.
 * The face is one of Aes's painted faces seen from the front (see faces.ts). Two face slots crossfade, so he can swap
 * faces between tricks without a pop.
 * On top of the clay: a wider grin, a frown, lowered lids, blinks, and a neon glow for the "neon" trick,
 * plus the extras a few tricks paint on: flames and soot, a groggy waking face, spiral dizzy eyes, and an electric shock.
 * Aes asked for no eyebrows on any face (2026-10-19).
 * Colors are passed as sRGB triples and written out as-is.
 * `uSilver` swaps the matte clay for a brushed silver finish (Aes asked to try it, 2026-10-19).
 */

/** How far a full grin widens and lengthens the painted mouth */
const GRIN_WIDEN = 0.3;
const GRIN_LENGTHEN = 0.12;

const vertexShader = /* glsl */ `
  // Distance in from the silhouette's edge, baked per vertex
  attribute float _depth;

  uniform float uTime;
  uniform float uMotion;

  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec2 vShape;
  varying float vDepth;
  varying float vFront;

  void main() {
    vec3 p = position;

    // A slow sway up the body and a drip that stretches and relaxes at the hem
    float sway = sin(uTime * 1.1 + p.y * 2.0) * 0.018 * uMotion;
    p.x += sway * smoothstep(1.6, -1.5, p.y);
    float hem = smoothstep(-0.55, -1.45, p.y);
    p.y -= hem * (0.5 + 0.5 * sin(uTime * 1.6 + p.x * 4.0)) * 0.05 * uMotion;

    // The clone trick draws its tiny ghosts as instances of this same material
    #ifdef USE_INSTANCING
      vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    #else
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vNormal = normalize(normalMatrix * normal);
    #endif
    vViewPos = mv.xyz;
    vShape = position.xy;
    vDepth = _depth;
    // The front shell, where the face is painted
    vFront = step(0.0, position.z) * smoothstep(0.05, 0.35, normal.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  // One painted face and its landmarks (see faces.ts)
  struct Face {
    vec4 rect;
    vec4 eyeL;
    vec4 eyeR;
    // top, bottom, center x, half width
    vec4 mouth;
    // The right eye's top and bottom ends; the left eye mirrors it
    vec4 ends;
    float frownTop;
  };

  uniform float uGrin;
  uniform float uFrown;
  uniform float uLid;
  uniform float uBlink;
  uniform float uGlow;
  uniform vec3 uGlowColor;
  uniform vec2 uLook;
  uniform sampler2D uFaceMapA;
  uniform sampler2D uFaceMapB;
  uniform Face uFaceA;
  uniform Face uFaceB;
  // 0 shows face A, 1 face B
  uniform float uFaceMix;
  uniform float uMouthY;
  uniform float uSilver;
  uniform float uFire;
  uniform float uFireLevel;
  uniform float uSoot;
  uniform float uWake;
  uniform float uDizzy;
  uniform float uShock;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec2 vShape;
  varying float vDepth;
  varying float vFront;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), u.x), u.y);
  }

  float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
  }

  float stroke(float d, float halfWidth) {
    return 1.0 - smoothstep(halfWidth - 0.004, halfWidth + 0.002, d);
  }

  vec2 faceUv(vec2 p, vec4 rect) {
    return (p - rect.xy) / rect.zw;
  }

  // One painted eye, squashed toward its center while blinking, cut from the top by the lid
  float eyeInk(vec2 f, vec4 eye, sampler2D map, vec4 rect) {
    vec2 q = f - eye.xy;
    if (abs(q.x) > eye.z * 4.0) return 0.0;
    // Dizzy: spiral eyes take their place
    if (uDizzy > 0.5) return 0.0;
    float lidEdge = eye.w * (1.0 - 1.4 * uLid);
    float lid = 1.0 - smoothstep(lidEdge - 0.01, lidEdge + 0.01, q.y);
    float open = texture2D(map, faceUv(eye.xy + vec2(q.x, q.y / uBlink), rect)).r * lid;

    // Asleep (lid past 1): a small closed-eye curve where the eye was
    float closed = smoothstep(1.0, 1.12, uLid);
    if (closed > 0.0) {
      float halfW = 0.075;
      float curve = -eye.w * 0.55 + 5.3 * q.x * q.x;
      float stroke = 1.0 - smoothstep(0.008, 0.013, abs(q.y - curve));
      float ends = 1.0 - smoothstep(halfW - 0.006, halfW, abs(q.x));
      // The stub of the painted eye left under the lid fades as the closed curve takes over
      open = max(open * (1.0 - closed), closed * stroke * ends);
    }
    return open;
  }

  // The face point f in the painted mouth's own space, undoing the grin's stretch (it hangs from the corners)
  vec2 mouthSpace(vec2 f, vec4 mouth) {
    float top = mouth.x;
    return vec2(mouth.z + (f.x - mouth.z) / (1.0 + ${GRIN_WIDEN.toFixed(3)} * uGrin), top + (f.y - top) / (1.0 + ${GRIN_LENGTHEN.toFixed(3)} * uGrin));
  }

  // The mouth turned upside down for a frown, its point reaching up to frownTop
  vec2 frownSpace(vec2 p, vec4 mouth, float point) {
    float top = mouth.x;
    float bottom = mouth.y;
    return vec2(p.x, bottom + (point - p.y) * (top - bottom) / (point - bottom));
  }

  // The painted mouth: widens and lengthens with uGrin, or flips into a frown (open, it is a scream).
  // Returns (ink, white of the teeth).
  vec2 mouthInk(vec2 f, sampler2D map, Face face) {
    vec2 p = mouthSpace(f - vec2(0.0, uMouthY), face.mouth);
    // A quick crossfade, so the grin and frown never sit on the face together for long
    float flip = smoothstep(0.3, 0.7, uFrown);
    vec2 a = texture2D(map, faceUv(p, face.rect)).gb;
    vec2 b = flip > 0.0 ? texture2D(map, faceUv(frownSpace(p, face.mouth, face.frownTop), face.rect)).gb : vec2(0.0);
    return mix(a, b, flip);
  }

  // Cartoon dizzy eyes: a spinning spiral over each eye
  float dizzyInk(vec2 f, vec2 eyeR) {
    if (uDizzy <= 0.0) return 0.0;
    vec2 q = vec2(abs(f.x) - abs(eyeR.x), f.y - eyeR.y - 0.1);
    float r = length(q);
    float radius = min(0.14, abs(eyeR.x) - 0.012);
    if (r > radius + 0.02) return 0.0;
    // Spin opposite ways in each eye
    float a = atan(q.y, q.x) * sign(f.x) + uTime * 9.0;
    float turns = r / 0.038 - a / 6.2832;
    float line = (0.5 - abs(fract(turns) - 0.5)) * 0.038;
    return stroke(line, 0.01) * (1.0 - smoothstep(radius - 0.01, radius, r)) * smoothstep(0.3, 0.6, uDizzy);
  }

  // The groggy waking face: a lower lid runs out from the bottom of each eye, squeezing it into a squint
  float wakeInk(vec2 f, vec4 ends) {
    if (uWake <= 0.0) return 0.0;
    vec2 m = vec2(abs(f.x), f.y);
    vec2 bottom = ends.zw;
    float v = sdSegment(m, bottom, bottom + vec2(0.12, 0.2) * uWake);
    return stroke(v, 0.017) * smoothstep(0.0, 0.4, uWake);
  }

  // Everything one face draws at f: (ink, white of the teeth)
  vec2 faceInk(vec2 f, sampler2D map, Face face) {
    vec2 m = mouthInk(f, map, face);
    float ink = max(m.x, max(eyeInk(f, face.eyeL, map, face.rect), eyeInk(f, face.eyeR, map, face.rect)));
    ink = max(ink, max(wakeInk(f, face.ends), dizzyInk(f, face.eyeR.xy)));
    return vec2(ink, m.y);
  }

  // A soft studio seen in a metal surface: bright overhead, a dark band at the horizon, a grey floor
  float studio(vec3 r) {
    float sky = smoothstep(-0.05, 0.75, r.y);
    float band = 1.0 - smoothstep(0.0, 0.22, abs(r.y + 0.08));
    return 0.42 + 0.58 * sky - 0.3 * band;
  }

  void main() {
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(-vViewPos);
    float ndv = clamp(dot(n, v), 0.0, 1.0);

    // Matte clay: a soft key light from the upper left, sky fill, and darker creases near the edges
    vec3 key = normalize(vec3(-0.45, 0.65, 0.62));
    float wrap = clamp((dot(n, key) + 0.35) / 1.35, 0.0, 1.0);
    float sky = 0.5 + 0.5 * n.y;
    float edge = smoothstep(0.0, 0.32, vDepth);
    float fresnel = pow(1.0 - ndv, 3.0);
    float spec = pow(max(dot(reflect(-key, n), v), 0.0), 18.0);

    vec3 clay = vec3(0.70, 0.705, 0.715);
    vec3 color = clay * (0.32 + 0.62 * wrap + 0.16 * sky);
    color *= mix(0.62, 1.0, edge);
    color -= fresnel * 0.12;
    color += spec * 0.1;

    // Brushed silver: the studio reflected in the surface, a tighter highlight, and a cool tint
    if (uSilver > 0.0) {
      vec3 r = reflect(-v, n);
      float env = studio(r);
      float sheen = pow(max(dot(reflect(-key, n), v), 0.0), 60.0);
      vec3 silver = vec3(0.8, 0.815, 0.84) * (0.18 + 0.72 * env + 0.18 * wrap);
      silver *= mix(0.7, 1.0, edge);
      silver += sheen * 0.55 + spec * 0.12 + fresnel * 0.12;
      color = mix(color, silver, uSilver);
    }
    color += (hash(floor(gl_FragCoord.xy)) - 0.5) * 0.02;

    // Neon: a bright rim and lit core in the glow color
    color = mix(color, color * 0.55 + uGlowColor * (0.35 + 1.1 * pow(1.0 - ndv, 1.6)), uGlow);

    // On fire: flickering heat climbs from the hem, then soot is left behind
    if (uFire > 0.0 || uSoot > 0.0) {
      float n = noise(vShape * vec2(1.6, 1.1) + vec2(0.0, -uTime * 2.4));
      float level = mix(-1.7, 2.4, uFireLevel);
      float burn = smoothstep(level, level - 0.7, vShape.y + 0.35 * n) * uFire;
      vec3 soot = vec3(0.2, 0.19, 0.18) * (0.55 + 0.7 * wrap) * mix(0.62, 1.0, edge);
      color = mix(color, soot, uSoot * 0.75);
      // Lit from inside: hotter (yellow) low down and toward the middle, deep orange at the rim
      vec3 flame = mix(vec3(1.0, 0.5, 0.08), vec3(1.0, 0.8, 0.3), n * edge);
      flame = mix(flame, vec3(0.95, 0.25, 0.03), fresnel);
      color = mix(color, flame * (0.85 + 0.25 * wrap), burn * 0.7);
    }

    // Electrocuted: he flickers jet black, like a cartoon zap
    if (uShock > 0.0) {
      float flicker = 0.8 + 0.2 * step(0.0, sin(uTime * 70.0));
      color = mix(color, vec3(0.02) + vec3(0.9, 0.8, 0.1) * fresnel * 0.6, uShock * flicker);
    }

    // Face: Aes's painted eyes and smile, in ink, plus whatever the trick adds
    if (vFront > 0.01) {
      vec2 f = vShape - uLook;
      vec2 m = faceInk(f, uFaceMapA, uFaceA);
      if (uFaceMix > 0.0) m = mix(m, faceInk(f, uFaceMapB, uFaceB), uFaceMix);
      float ink = m.x * vFront;
      // The teeth: bright white, softly shaded, and gone on a glowing or blacked-out body so the white ink still shows
      float teeth = m.y * vFront * (1.0 - max(uGlow * 0.85, uShock));
      color = mix(color, vec3(0.97) * (0.9 + 0.1 * wrap), teeth);
      // Ink turns white on a glowing or blacked-out body
      vec3 inkColor = mix(vec3(0.05), vec3(1.0), max(uGlow * 0.9, uShock));
      color = mix(color, inkColor, ink);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export type GhostUniforms = {
  uTime: { value: number };
  uMotion: { value: number };
  uGrin: { value: number };
  uFrown: { value: number };
  uLid: { value: number };
  uBlink: { value: number };
  uGlow: { value: number };
  uGlowColor: { value: THREE.Vector3 };
  uLook: { value: THREE.Vector2 };
  uFaceMapA: { value: THREE.Texture };
  uFaceMapB: { value: THREE.Texture };
  uFaceA: { value: FaceUniform };
  uFaceB: { value: FaceUniform };
  uFaceMix: { value: number };
  uMouthY: { value: number };
  uSilver: { value: number };
  uFire: { value: number };
  uFireLevel: { value: number };
  uSoot: { value: number };
  uWake: { value: number };
  uDizzy: { value: number };
  uShock: { value: number };
};

/** A face's landmarks in the shape of the shader's Face struct */
export type FaceUniform = {
  rect: THREE.Vector4;
  eyeL: THREE.Vector4;
  eyeR: THREE.Vector4;
  mouth: THREE.Vector4;
  ends: THREE.Vector4;
  frownTop: number;
};

export function faceUniform(face: Face): FaceUniform {
  const { rect, eyes, mouth } = face;
  const eye = (i: number) => new THREE.Vector4(eyes[i].cx, eyes[i].cy, eyes[i].halfW, eyes[i].halfH);
  return {
    rect: new THREE.Vector4(rect.minX, rect.minY, rect.maxX - rect.minX, rect.maxY - rect.minY),
    eyeL: eye(0),
    eyeR: eye(1),
    mouth: new THREE.Vector4(mouth.top, mouth.bottom, mouth.cx, mouth.halfW),
    ends: new THREE.Vector4(eyes[1].top[0], eyes[1].top[1], eyes[1].bottom[0], eyes[1].bottom[1]),
    frownTop: face.frownTop,
  };
}

/** Starts on the idle face; GhostRig swaps faces in and out of the two slots. */
export function createGhostMaterial(faceMap: THREE.Texture) {
  const uniforms: GhostUniforms = {
    uTime: { value: 0 },
    uMotion: { value: 1 },
    uGrin: { value: 0 },
    uFrown: { value: 0 },
    uLid: { value: 0 },
    uBlink: { value: 1 },
    uGlow: { value: 0 },
    uGlowColor: { value: new THREE.Vector3(1, 1, 1) },
    uLook: { value: new THREE.Vector2() },
    uFaceMapA: { value: faceMap },
    uFaceMapB: { value: faceMap },
    uFaceA: { value: faceUniform(FACES[IDLE_FACE]) },
    uFaceB: { value: faceUniform(FACES[IDLE_FACE]) },
    uFaceMix: { value: 0 },
    uMouthY: { value: 0 },
    uSilver: { value: 0 },
    uFire: { value: 0 },
    uFireLevel: { value: 0 },
    uSoot: { value: 0 },
    uWake: { value: 0 },
    uDizzy: { value: 0 },
    uShock: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  });
  return { material, uniforms };
}

const haloVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const haloFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    // Fade to nothing before the plane's edges so its outline never shows on the white page
    vec2 edge = smoothstep(0.0, 0.18, vUv) * smoothstep(0.0, 0.18, 1.0 - vUv);
    float a = texture2D(uMap, vUv).a * edge.x * edge.y;
    gl_FragColor = vec4(uColor, a * uStrength);
  }
`;

/** The soft light the ghost throws on the white wall during the neon trick */
export function createHaloMaterial(map: THREE.Texture) {
  const uniforms = {
    uMap: { value: map },
    uColor: { value: new THREE.Vector3(1, 1, 1) },
    uStrength: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: haloVertex,
    fragmentShader: haloFragment,
    depthWrite: false,
    transparent: true,
  });
  return { material, uniforms };
}

const fireFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec4 uMapRect;
  uniform vec4 uPlane;
  uniform float uTime;
  uniform float uFire;
  uniform float uLevel;
  uniform float uSmoke;
  uniform float uZap;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.03 + 17.1;
      a *= 0.5;
    }
    return v;
  }
  // The ghost's soft silhouette, from the halo map
  float body(vec2 p) {
    return texture2D(uMap, (p - uMapRect.xy) / uMapRect.zw).a / 0.85;
  }

  void main() {
    vec2 p = uPlane.xy + vUv * uPlane.zw;
    vec4 outColor = vec4(0.0);

    if (uFire > 0.0) {
      // Flames: the silhouette smeared upward by scrolling noise, so tongues lick off the head and shoulders
      float n = fbm(p * vec2(2.4, 1.5) + vec2(0.0, -uTime * 2.8));
      float n2 = fbm(p * vec2(5.0, 3.0) + vec2(0.0, -uTime * 4.6));
      float rise = 0.15 + 1.25 * n * n;
      vec2 src = p - vec2((n2 - 0.5) * 0.35, rise);
      float level = mix(-1.7, 1.8, uLevel);
      float heat = body(src) * (0.55 + 0.75 * n2) * smoothstep(level, level - 0.5, src.y);
      heat *= uFire;
      float a = smoothstep(0.32, 0.6, heat);
      vec3 col = mix(vec3(0.85, 0.07, 0.02), vec3(1.0, 0.42, 0.04), smoothstep(0.45, 0.75, heat));
      col = mix(col, vec3(1.0, 0.86, 0.3), smoothstep(0.75, 1.0, heat));
      outColor = vec4(col, a);
    }

    if (uSmoke > 0.0) {
      // Grey smoke curling up off the head once the flames are out
      float drift = uTime * 0.9;
      vec2 sp = p * vec2(2.6, 1.8) + vec2(sin(p.y * 2.0 + drift) * 0.5, -drift * 1.4);
      float s = fbm(sp);
      // Light, broken-up puffs rising off the top of the head
      float plume = body(p * vec2(1.8, 1.0) - vec2(0.0, 1.0 + 0.5 * s)) * smoothstep(0.6, 1.5, p.y) * smoothstep(3.3, 2.2, p.y);
      float a = smoothstep(0.5, 0.85, plume * s * 1.5) * uSmoke * 0.4;
      outColor = vec4(mix(outColor.rgb, vec3(0.55), a), max(outColor.a, a));
    }

    if (uZap > 0.0) {
      // Electric arcs: jagged yellow lines crackling just outside his outline, jumping to a new shape 20 times a second
      float b = body(p);
      float band = smoothstep(0.05, 0.3, b) * (1.0 - smoothstep(0.6, 0.9, b));
      float tick = floor(uTime * 20.0);
      float n = noise(p * 2.6 + tick * 7.13) + 0.35 * noise(p * 9.0 - tick * 3.1);
      float line = 1.0 - smoothstep(0.02, 0.06, abs(n - 0.68));
      float a = line * band * uZap;
      vec3 col = mix(vec3(1.0, 0.85, 0.0), vec3(1.0, 1.0, 0.75), smoothstep(0.6, 1.0, line));
      outColor = vec4(mix(outColor.rgb, col, a), max(outColor.a, a));
    }

    gl_FragColor = outColor;
  }
`;

/** The flames and smoke for the "fire" trick (and the sparks for "zapped"), drawn on a plane behind the ghost so they lick out around him */
export function createFireMaterial(map: THREE.Texture, mapRect: THREE.Vector4, plane: THREE.Vector4) {
  const uniforms = {
    uMap: { value: map },
    uMapRect: { value: mapRect },
    uPlane: { value: plane },
    uTime: { value: 0 },
    uFire: { value: 0 },
    uLevel: { value: 0 },
    uSmoke: { value: 0 },
    uZap: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: haloVertex,
    fragmentShader: fireFragment,
    depthWrite: false,
    transparent: true,
  });
  return { material, uniforms };
}

/** "#22f5d6" -> sRGB triple in 0..1 */
export function hexToVec3(hex: string, out = new THREE.Vector3()) {
  const v = parseInt(hex.replace("#", ""), 16);
  return out.set(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
}
