import * as THREE from "three";

/**
 * The airbrushed-glow look of Rommel's panels, as a shader:
 * - asleep: a near-black body whose lobe tops catch a little light, with only the face glowing
 * - awake: a bright rim, a deeper core, a soft heart-light, faint colored veins, and spray-paint grain
 * Colors are passed as sRGB triples and written out as-is.
 */

const vertexShader = /* glsl */ `
  attribute vec2 aShape;
  attribute float aDepth;
  attribute float aFront;

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
    float sway = sin(uTime * 1.1 + p.y * 2.0) * 0.022 * uMotion;
    p.x += sway * smoothstep(1.6, -1.5, p.y);
    float hem = smoothstep(-0.55, -1.45, p.y);
    p.y -= hem * (0.5 + 0.5 * sin(uTime * 1.6 + p.x * 4.0)) * 0.07 * uMotion;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vViewPos = mv.xyz;
    vNormal = normalize(normalMatrix * normal);
    vShape = aShape;
    vDepth = aDepth;
    vFront = aFront;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uWake;
  uniform float uFace;
  uniform float uBlink;
  uniform float uPulse;
  uniform vec2 uLook;
  uniform vec3 uColor;

  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec2 vShape;
  varying float vDepth;
  varying float vFront;

  // 2D simplex noise (Ashima Arts, MIT)
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  // Lower arc of a circle, spanning +-halfAngle around straight down
  float sdSmile(vec2 p, vec2 c, float r, float halfAngle) {
    vec2 q = p - c;
    float a = atan(q.x, -q.y);
    if (abs(a) < halfAngle) return abs(length(q) - r);
    vec2 e = c + r * vec2(sin(halfAngle) * sign(q.x), -cos(halfAngle));
    return length(p - e);
  }

  void main() {
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(-vViewPos);
    float ndv = clamp(dot(n, v), 0.0, 1.0);
    float rim = pow(1.0 - ndv, 2.2);
    float top = pow(max(dot(n, normalize(vec3(-0.15, 0.95, 0.35))), 0.0), 5.0);
    float grain = hash(floor(gl_FragCoord.xy)) - 0.5;

    // Dormant: like the black panel, the body barely separates from the dark
    vec3 asleep = vec3(0.02, 0.022, 0.03) + vec3(0.11, 0.12, 0.15) * top + vec3(0.025) * rim;

    // Awake: glowing rim and lobe tops, a deeper core
    float core = smoothstep(0.05, 0.5, vDepth);
    vec3 deep = uColor * 0.16 + vec3(0.015, 0.02, 0.05);
    float edge = 1.0 - smoothstep(0.0, 0.2, vDepth);
    vec3 lit = deep + uColor * (rim * 1.1 + edge * 0.45 + top * 0.35 + (1.0 - core) * 0.3);
    lit += uColor * 0.5 * uPulse;

    // Heart-light at the chest
    float heart = exp(-length(vShape - vec2(0.0, -0.05)) * 5.5) * vFront * uFace;
    lit += mix(uColor, vec3(1.0), 0.6) * heart * 0.9;

    // Short veins drifting inside, warm and cool like the luminous panel
    vec2 vp = vShape * 3.4 + vec2(0.0, uTime * 0.04);
    float vein = 1.0 - smoothstep(0.0, 0.03, abs(snoise(vp)));
    float veinMask = smoothstep(0.35, 0.7, snoise(vShape * 2.3 + vec2(3.1, -uTime * 0.03)));
    float hue = snoise(vShape * 1.3 + 7.0);
    vec3 veinColor = hue > 0.0 ? vec3(1.0, 0.35, 0.3) : vec3(0.35, 0.75, 1.0);
    lit += veinColor * vein * veinMask * 0.55 * uFace * core;

    vec3 color = mix(asleep, lit, uWake);
    color += grain * mix(0.015, 0.05, uWake);

    // Face: two long vertical eyes and a smile that glow even while the ghost sleeps
    if (uFace > 0.5 && vFront > 0.5) {
      vec2 f = vShape - uLook;
      float eyeHalf = 0.21 * uBlink;
      float eyeL = sdSegment(f, vec2(-0.16, 0.86 - eyeHalf), vec2(-0.16, 0.86 + eyeHalf));
      float eyeR = sdSegment(f, vec2(0.16, 0.86 - eyeHalf), vec2(0.16, 0.86 + eyeHalf));
      float smile = sdSmile(f, vec2(0.0, 0.78), 0.24, 0.95);
      float d = min(min(eyeL, eyeR), smile);
      float w = 0.016;
      float aa = fwidth(d);
      float line = 1.0 - smoothstep(w - aa, w + aa, d);
      float halo = exp(-d * 22.0);
      vec3 faceColor = vec3(1.0);
      color = mix(color, faceColor, line * mix(0.85, 1.0, uWake));
      color += faceColor * halo * mix(0.18, 0.45, uWake) * (1.0 - line);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export type GhostUniforms = {
  uTime: { value: number };
  uMotion: { value: number };
  uWake: { value: number };
  uFace: { value: number };
  uBlink: { value: number };
  uPulse: { value: number };
  uLook: { value: THREE.Vector2 };
  uColor: { value: THREE.Vector3 };
};

export function createGhostMaterial(withFace: boolean) {
  const uniforms: GhostUniforms = {
    uTime: { value: 0 },
    uMotion: { value: 1 },
    uWake: { value: 0 },
    uFace: { value: withFace ? 1 : 0 },
    uBlink: { value: 1 },
    uPulse: { value: 0 },
    uLook: { value: new THREE.Vector2() },
    uColor: { value: new THREE.Vector3(1, 1, 1) },
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
    float a = texture2D(uMap, vUv).a;
    // Dither so the faint outer glow doesn't band on 8-bit screens
    float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
    gl_FragColor = vec4(uColor * a * uStrength + dither, 1.0);
  }
`;

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
    blending: THREE.AdditiveBlending,
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
