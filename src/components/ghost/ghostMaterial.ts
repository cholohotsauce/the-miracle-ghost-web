import * as THREE from "three";
import { EYES, FACE_RECT } from "./modelBake";

/**
 * Aes's ghost as matte grey clay on a white page, like the render in his prototype video.
 * The face is his own polypainted linework, projected from the front (see modelBake.ts).
 * On top of the clay: a grin, a frown, lowered lids, blinks, and a neon glow for the "neon" trick.
 * Colors are passed as sRGB triples and written out as-is.
 */

/**
 * The painted smile on miracle-ghost-face.png, in model XY. Measured from the face map:
 * a circular arc whose ends sit on y = top and whose lowest point is at x = 0.
 * Re-measure if Aes sends a new sculpt with a different face.
 */
const MOUTH = { top: 0.1485, cy: 0.3537, r: 0.3528, halfW: 0.287 };

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

  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec2 vShape;
  varying float vDepth;
  varying float vFront;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec2 faceUv(vec2 p) {
    return (p - uFaceRect.xy) / uFaceRect.zw;
  }

  // One painted eye, squashed toward its center while blinking, cut from the top by the lid
  float eyeInk(vec2 f, vec4 eye) {
    vec2 q = f - eye.xy;
    if (abs(q.x) > eye.z * 4.0) return 0.0;
    float lidEdge = eye.w * (1.0 - 1.4 * uLid);
    float lid = 1.0 - smoothstep(lidEdge - 0.01, lidEdge + 0.01, q.y);
    return texture2D(uFaceMap, faceUv(eye.xy + vec2(q.x, q.y / uBlink))).r * lid;
  }

  // The smile: widens and deepens into an open grin, or flips into a frown
  float mouthInk(vec2 f) {
    float top = uMouth.x;
    vec2 p = f;
    p.x /= 1.0 + 0.3 * uGrin;
    p.y = top + (p.y - top) / (1.0 + 0.45 * uGrin);

    float lowest = uMouth.y - uMouth.z;
    vec2 flipped = vec2(p.x, top + lowest - p.y);
    // A quick crossfade, so the smile and frown never sit on the face together for long
    float flip = smoothstep(0.3, 0.7, uFrown);
    float line = mix(texture2D(uFaceMap, faceUv(p)).g, texture2D(uFaceMap, faceUv(flipped)).g, flip);

    // Open mouth: the area between the arc and the line joining its ends
    float inside = 1.0 - smoothstep(uMouth.z - 0.008, uMouth.z, length(p - vec2(0.0, uMouth.y)));
    float below = 1.0 - smoothstep(top - 0.006, top + 0.002, p.y);
    float open = inside * below * smoothstep(0.15, 0.6, uGrin) * (1.0 - flip);
    return max(line, open);
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

    // Face: Aes's painted eyes and smile, in ink
    if (vFront > 0.01) {
      vec2 f = vShape - uLook;
      float ink = max(mouthInk(f), max(eyeInk(f, uEyeL), eyeInk(f, uEyeR))) * vFront;
      vec3 inkColor = mix(vec3(0.05), vec3(1.0), uGlow * 0.9);
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
  uFaceMap: { value: THREE.Texture };
  uFaceRect: { value: THREE.Vector4 };
  uEyeL: { value: THREE.Vector4 };
  uEyeR: { value: THREE.Vector4 };
  uMouth: { value: THREE.Vector4 };
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

/** "#22f5d6" -> sRGB triple in 0..1 */
export function hexToVec3(hex: string, out = new THREE.Vector3()) {
  const v = parseInt(hex.replace("#", ""), 16);
  return out.set(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
}
