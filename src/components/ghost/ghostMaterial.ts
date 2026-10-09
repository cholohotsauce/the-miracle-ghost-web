import * as THREE from "three";
import { EYES, FACE_RECT } from "./modelBake";

/**
 * Aes's ghost as matte grey clay on a white page, like the render in his prototype video.
 * The face is his own polypainted linework, projected from the front (see modelBake.ts).
 * On top of the clay: a grin, a frown, lowered lids, blinks, and a neon glow for the "neon" trick,
 * plus the extras a few tricks paint on: sunglasses, a gold tooth, flames and soot, a groggy waking face, worried brows,
 * spiral dizzy eyes, an electric shock, and TV static with an old-TV switch-off.
 * Colors are passed as sRGB triples and written out as-is.
 */

/**
 * The painted smile on miracle-ghost-face.png, in model XY. Measured from the face map:
 * a circular arc whose ends sit on y = top and whose lowest point is at x = 0.
 * Re-measure if Aes sends a new sculpt with a different face.
 */
const MOUTH = { top: 0.1485, cy: 0.3537, r: 0.3528, halfW: 0.287 };

/** Where the sunglasses come to rest on the face, in model Y */
const SHADES_Y = 0.5;

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

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vViewPos = mv.xyz;
    vNormal = normalize(normalMatrix * normal);
    vShape = position.xy;
    vDepth = _depth;
    // The front shell, where the face is painted
    vFront = step(0.0, position.z) * smoothstep(0.05, 0.35, normal.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uGrin;
  uniform float uFrown;
  uniform float uLid;
  uniform float uBlink;
  uniform float uGlow;
  uniform vec3 uGlowColor;
  uniform vec2 uLook;
  uniform sampler2D uFaceMap;
  uniform vec4 uFaceRect;
  uniform vec4 uEyeL;
  uniform vec4 uEyeR;
  uniform vec4 uMouth;
  uniform float uShades;
  uniform float uTooth;
  uniform float uGlint;
  uniform float uFire;
  uniform float uFireLevel;
  uniform float uSoot;
  uniform float uWake;
  uniform float uBrow;
  uniform float uDizzy;
  uniform float uShock;
  uniform float uTv;
  uniform float uCrt;
  uniform float uTime;
  uniform float uShadesY;

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

  float sdRoundBox(vec2 p, vec2 halfSize, float r) {
    vec2 d = abs(p) - halfSize + r;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
  }

  float stroke(float d, float halfWidth) {
    return 1.0 - smoothstep(halfWidth - 0.004, halfWidth + 0.002, d);
  }

  vec2 faceUv(vec2 p) {
    return (p - uFaceRect.xy) / uFaceRect.zw;
  }

  // One painted eye, squashed toward its center while blinking, cut from the top by the lid
  float eyeInk(vec2 f, vec4 eye) {
    vec2 q = f - eye.xy;
    if (abs(q.x) > eye.z * 4.0) return 0.0;
    // Dizzy: spiral eyes take their place
    if (uDizzy > 0.5) return 0.0;
    // Behind the sunglasses: the lenses wipe the eyes away as they slide down
    if (uShades > 0.0 && (f.y > mix(1.75, uShadesY, uShades) - 0.1 || uShades > 0.85)) return 0.0;
    float lidEdge = eye.w * (1.0 - 1.4 * uLid);
    float lid = 1.0 - smoothstep(lidEdge - 0.01, lidEdge + 0.01, q.y);
    float open = texture2D(uFaceMap, faceUv(eye.xy + vec2(q.x, q.y / uBlink))).r * lid;

    // Asleep (lid past 1): a small closed-eye curve where the eye was
    float closed = smoothstep(1.0, 1.12, uLid);
    if (closed > 0.0) {
      float halfW = 0.075;
      float curve = -eye.w * 0.55 + 5.3 * q.x * q.x;
      float stroke = 1.0 - smoothstep(0.008, 0.013, abs(q.y - curve));
      float ends = 1.0 - smoothstep(halfW - 0.006, halfW, abs(q.x));
      open = max(open, closed * stroke * ends);
    }
    return open;
  }

  // The face point f in the smile's own space, undoing the grin's stretch
  vec2 mouthSpace(vec2 f) {
    float top = uMouth.x;
    return vec2(f.x / (1.0 + 0.3 * uGrin), top + (f.y - top) / (1.0 + 0.45 * uGrin));
  }

  // The area between the smile's arc and the line joining its ends
  float mouthHole(vec2 p) {
    float inside = 1.0 - smoothstep(uMouth.z - 0.008, uMouth.z, length(p - vec2(0.0, uMouth.y)));
    float below = 1.0 - smoothstep(uMouth.x - 0.006, uMouth.x + 0.002, p.y);
    return inside * below;
  }

  // The smile: widens and deepens into an open grin, or flips into a frown (open, it is a scream)
  float mouthInk(vec2 f) {
    float top = uMouth.x;
    vec2 p = mouthSpace(f);

    float lowest = uMouth.y - uMouth.z;
    vec2 flipped = vec2(p.x, top + lowest - p.y);
    // A quick crossfade, so the smile and frown never sit on the face together for long
    float flip = smoothstep(0.3, 0.7, uFrown);
    float line = mix(texture2D(uFaceMap, faceUv(p)).g, texture2D(uFaceMap, faceUv(flipped)).g, flip);

    float open = mix(mouthHole(p), mouthHole(flipped), flip) * smoothstep(0.15, 0.6, uGrin);
    return max(line, open);
  }

  // One gold tooth hanging from the top of the open grin, off to one side. Returns (shade, mask).
  vec2 goldTooth(vec2 f) {
    vec2 p = mouthSpace(f);
    vec2 q = p - vec2(0.085, uMouth.x - 0.05);
    float d = sdRoundBox(q, vec2(0.042, 0.05), 0.018);
    float mask = (1.0 - smoothstep(-0.002, 0.004, d)) * mouthHole(p) * smoothstep(0.3, 0.7, uGrin) * uTooth;
    // A bright band across the tooth that slides down as it catches the light
    float band = smoothstep(0.03, 0.0, abs(q.y - 0.03 + 0.1 * uGlint));
    float shade = 0.75 + 0.35 * (q.y / 0.05) + 0.6 * band;
    return vec2(shade, mask);
  }

  // A four-point star where the tooth catches the light
  float sparkle(vec2 f) {
    vec2 p = vec2(0.085 * (1.0 + 0.3 * uGrin), uMouth.x - 0.03 * (1.0 + 0.45 * uGrin));
    vec2 q = (f - p) / max(uGlint, 0.001);
    float arms = exp(-abs(q.x) * 90.0) * exp(-abs(q.y) * 9.0) + exp(-abs(q.y) * 90.0) * exp(-abs(q.x) * 9.0);
    vec2 r = mat2(0.7071, -0.7071, 0.7071, 0.7071) * q;
    arms += 0.5 * (exp(-abs(r.x) * 120.0) * exp(-abs(r.y) * 20.0) + exp(-abs(r.y) * 120.0) * exp(-abs(r.x) * 20.0));
    float core = exp(-dot(q, q) * 900.0);
    return clamp((arms + core) * uGlint, 0.0, 1.0);
  }

  // Black sunglasses that slide down from the top of the head. Returns (rgb, mask).
  vec4 sunglasses(vec2 f) {
    float y = mix(1.75, uShadesY, uShades);
    vec2 q = f - vec2(0.0, y);
    if (abs(q.y) > 0.2 || abs(q.x) > 0.42) return vec4(0.0);
    // Wayfarer-ish lenses: a little wider at the top
    vec2 l = vec2(abs(q.x) - 0.2, q.y);
    l.x *= 1.0 - 0.9 * l.y;
    float lens = sdRoundBox(l, vec2(0.155, 0.1), 0.05);
    float bridge = sdRoundBox(q - vec2(0.0, 0.055), vec2(0.07, 0.02), 0.01);
    float d = min(lens, bridge);
    float mask = 1.0 - smoothstep(-0.002, 0.004, d);
    // A glare stripe across each lens, plus a sweep when the tooth flashes
    float glare = smoothstep(0.022, 0.0, abs(l.x + 0.7 * l.y + 0.06)) * step(lens, -0.012);
    float sweep = smoothstep(0.04, 0.0, abs(q.x + 0.8 * q.y - mix(-0.5, 0.5, uGlint))) * step(lens, -0.012) * uGlint;
    vec3 col = vec3(0.035) + vec3(0.06) * smoothstep(-0.1, 0.1, q.y);
    col += 0.55 * glare + 0.6 * sweep;
    return vec4(col, mask * smoothstep(0.0, 0.05, uShades));
  }

  // Cartoon dizzy eyes: a spinning spiral over each eye
  float dizzyInk(vec2 f, vec2 eyeR) {
    if (uDizzy <= 0.0) return 0.0;
    vec2 q = vec2(abs(f.x) - abs(eyeR.x), f.y - 0.62);
    float r = length(q);
    float radius = 0.14;
    if (r > radius + 0.02) return 0.0;
    // Spin opposite ways in each eye
    float a = atan(q.y, q.x) * sign(f.x) + uTime * 9.0;
    float turns = r / 0.038 - a / 6.2832;
    float line = (0.5 - abs(fract(turns) - 0.5)) * 0.038;
    return stroke(line, 0.01) * (1.0 - smoothstep(radius - 0.01, radius, r)) * smoothstep(0.3, 0.6, uDizzy);
  }

  // The groggy waking face, from Aes's sketch: squinting V eyes
  float wakeInk(vec2 f, vec2 eyeR) {
    if (uWake <= 0.0) return 0.0;
    vec2 m = vec2(abs(f.x), f.y);
    vec2 eye = vec2(abs(eyeR.x), eyeR.y);
    float bottom = 0.17;
    // A second stroke from the bottom of each eye, angled outward, makes the V
    float v = sdSegment(m, vec2(eye.x, bottom), vec2(eye.x + 0.13 * uWake, bottom + 0.34));
    return stroke(v, 0.017) * smoothstep(0.0, 0.4, uWake);
  }

  // Worried brows, inner ends high and sloping down and out: waking up, and sad after the zap
  float browInk(vec2 f) {
    if (uBrow <= 0.0) return 0.0;
    vec2 m = vec2(abs(f.x), f.y);
    float lift = 0.07 * uBrow;
    vec2 a = vec2(0.06, 1.03 + lift);
    vec2 b = vec2(0.19, 0.95 + lift);
    vec2 c = vec2(0.31, 0.92 + lift);
    float brow = min(sdSegment(m, a, b), sdSegment(m, b, c));
    return stroke(brow, 0.016) * smoothstep(0.0, 0.4, uBrow);
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
      float ink = max(mouthInk(f), max(eyeInk(f, uEyeL), eyeInk(f, uEyeR)));
      ink = max(ink, max(max(wakeInk(f, uEyeR.xy), browInk(f)), dizzyInk(f, uEyeR.xy))) * vFront;
      // Under TV static the face fades into the snow
      ink *= 1.0 - 0.75 * uTv;
      // Ink turns white on a glowing or blacked-out body
      vec3 inkColor = mix(vec3(0.05), vec3(1.0), max(uGlow * 0.9, uShock));
      color = mix(color, inkColor, ink);

      if (uTooth > 0.0) {
        vec2 tooth = goldTooth(f);
        vec3 gold = vec3(1.0, 0.76, 0.2) * tooth.x;
        color = mix(color, gold, tooth.y * vFront);
      }
      if (uShades > 0.0) {
        vec4 glasses = sunglasses(f);
        color = mix(color, glasses.rgb, glasses.a * vFront);
      }
      if (uGlint > 0.0) color = mix(color, vec3(1.0, 0.97, 0.85), sparkle(f) * vFront);
    }

    // TV static: black and white snow in chunky pixels that changes every frame, scanlines, and a rolling bar.
    // At the switch-off (uCrt) he collapses into a hard black line and dot, which reads on the white page.
    if (uTv > 0.0) {
      float frame = floor(uTime * 30.0);
      vec2 px = floor(gl_FragCoord.xy / 2.0);
      float snow = hash(px + vec2(frame * 13.1, frame * 7.7));
      float scan = 0.82 + 0.18 * step(0.5, fract(gl_FragCoord.y / 4.0));
      float bar = smoothstep(0.0, 0.25, abs(fract(gl_FragCoord.y / 260.0 - uTime * 0.9) - 0.5));
      vec3 tv = vec3(snow) * scan * (0.75 + 0.25 * bar);
      color = mix(color, tv, uTv * 0.85);
    }
    if (uCrt > 0.0) color = mix(color, vec3(0.03), uCrt);

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
  uFaceMap: { value: THREE.Texture };
  uFaceRect: { value: THREE.Vector4 };
  uEyeL: { value: THREE.Vector4 };
  uEyeR: { value: THREE.Vector4 };
  uMouth: { value: THREE.Vector4 };
  uShades: { value: number };
  uTooth: { value: number };
  uGlint: { value: number };
  uFire: { value: number };
  uFireLevel: { value: number };
  uSoot: { value: number };
  uWake: { value: number };
  uBrow: { value: number };
  uDizzy: { value: number };
  uShock: { value: number };
  uTv: { value: number };
  uCrt: { value: number };
  uShadesY: { value: number };
};

export function createGhostMaterial(faceMap: THREE.Texture) {
  const eye = (i: number) => new THREE.Vector4(EYES[i].cx, EYES[i].cy, EYES[i].halfW, EYES[i].halfH);
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
    uFaceMap: { value: faceMap },
    uFaceRect: {
      value: new THREE.Vector4(
        FACE_RECT.minX,
        FACE_RECT.minY,
        FACE_RECT.maxX - FACE_RECT.minX,
        FACE_RECT.maxY - FACE_RECT.minY,
      ),
    },
    uEyeL: { value: eye(0) },
    uEyeR: { value: eye(1) },
    uMouth: { value: new THREE.Vector4(MOUTH.top, MOUTH.cy, MOUTH.r, MOUTH.halfW) },
    uShades: { value: 0 },
    uTooth: { value: 0 },
    uGlint: { value: 0 },
    uFire: { value: 0 },
    uFireLevel: { value: 0 },
    uSoot: { value: 0 },
    uWake: { value: 0 },
    uBrow: { value: 0 },
    uDizzy: { value: 0 },
    uShock: { value: 0 },
    uTv: { value: 0 },
    uCrt: { value: 0 },
    uShadesY: { value: SHADES_Y },
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
