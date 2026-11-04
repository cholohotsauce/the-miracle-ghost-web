"use client";

import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import GHOST_OUTLINE from "./ghostPinShape.json";
import { CAMERA_Z, rad, stepSpin, type PinGroup, type Spin } from "./globeMath";

/**
 * The 3D globe for Ghost Sightings (Aes, 2026-10-30): grey ocean, toxic green land
 * (textures baked by scripts/bake-globe.mjs), turning very slowly on its own.
 * Drag to spin it; tap a ghost to turn its city to the front and reveal it.
 * The spin lives in refs, not React state, so dragging never re-renders the page.
 * Polish (2026-10-31): a teal glow ring around the edge, the ghosts pop up one by one after the entrance spin,
 * and the open one sends out a pink pulse.
 * Aes, 2026-11-04: the ghosts are glossy white 3D ghosts now (his reference picture), and the camera
 * no longer leans in on an open ghost, because that pulled the globe out from under its teal glow.
 */

const RADIUS = 1;
/** A 3D ghost's height on the globe, in globe radii (Aes's reference, 2026-11-04) */
const PIN_HEIGHT = 0.105;
/** How far each ghost floats out toward the camera, so the globe's curve never cuts into its body */
const PIN_LIFT = 0.25;
/** Ghosts in the same city stand side by side, this far apart, in ghost heights */
const FAN = 0.62;
/** When the ghosts start popping up, after the entrance spin starts, and the gap between them, in seconds */
const POP_START = 0.65;
const POP_STEP = 0.11;
const POP_TIME = 0.6;

const WHITE = new THREE.Color("#c9c9c9");
const PINK = new THREE.Color("#ff00ff"); // --color-neon-pink

/** Scratch objects for the frame loop */
const world = new THREE.Vector3();
const toCamera = new THREE.Vector3();
const lifted = new THREE.Vector3();

/** A point on the globe; longitude 0 faces the camera when the globe has not turned */
function onGlobe([lat, lng]: [number, number], r = RADIUS) {
  const phi = rad(lat);
  const lambda = rad(lng);
  return new THREE.Vector3(r * Math.cos(phi) * Math.sin(lambda), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lambda));
}

/** A springy pop from nothing to full size (the same overshoot as the old CSS pop) */
function popScale(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c1 = 1.70158 * 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Aes's map ghost as a puffy 3D shape: his outline (scripts/bake-ghost-pin-shape.mjs), pushed out
 * with soft rounded edges like the glossy white ghosts in his reference picture.
 * One unit tall, standing on y = 0, centered front to back.
 */
function useGhostGeometry() {
  const geometry = useMemo(() => {
    const outline = (GHOST_OUTLINE as [number, number][]).map(([x, y]) => new THREE.Vector2(x, y));
    const shape = new THREE.Shape(outline);
    const bevel = 0.11;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: 0.075,
      bevelSegments: 8,
      curveSegments: 4,
    });
    // The bevel grows the shape a little past the outline; bring it back to 1 unit tall, standing on 0
    g.computeBoundingBox();
    const box = g.boundingBox!;
    const tall = box.max.y - box.min.y;
    g.translate(-(box.max.x + box.min.x) / 2, -box.min.y, -(box.max.z + box.min.z) / 2);
    g.scale(1 / tall, 1 / tall, 1 / tall);
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/** A soft studio light for the ghosts' gloss, made in code (nothing to download). Only the ghosts use it. */
function useGlossEnvironment() {
  const gl = useThree((s) => s.gl);
  const texture = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const t = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    return t;
  }, [gl]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Earth({
  spin,
  groups,
  open,
  onPick,
  reducedMotion,
  arrived,
}: {
  spin: MutableRefObject<Spin>;
  groups: PinGroup[];
  open: number | null;
  onPick: (i: number) => void;
  reducedMotion: boolean;
  arrived: boolean;
}) {
  const [color, bump] = useTexture(["/sightings/globe-color.webp", "/sightings/globe-bump.webp"], (textures) => {
    const [map] = [textures].flat();
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8; // sharper coasts near the edge; the GPU caps it at what it can do
  });

  const globe = useRef<THREE.Group>(null);
  const cities = useRef<(THREE.Group | null)[]>([]);
  const ghosts = useRef<Record<number, THREE.Group | null>>({});
  const materials = useRef<Record<number, THREE.MeshPhysicalMaterial | null>>({});
  const hovered = useRef<number | null>(null);
  const arrivedAt = useRef<number | null>(null);
  const anchors = useMemo(() => groups.map((g) => onGlobe(g.at, RADIUS)), [groups]);
  const geometry = useGhostGeometry();
  const gloss = useGlossEnvironment();
  // Ghosts pop up west to east, the way the globe turns them into view
  const popOrder = useMemo(() => {
    const all = groups.flatMap((g) => g.items.map(({ i }) => ({ i, lng: g.at[1] })));
    const order: Record<number, number> = {};
    all.sort((a, b) => a.lng - b.lng).forEach(({ i }, n) => (order[i] = n));
    return order;
  }, [groups]);

  useFrame(({ camera, clock }, delta) => {
    const s = spin.current;
    const dt = Math.min(delta, 0.05);
    stepSpin(s, dt, reducedMotion);
    // The camera stays put when a ghost opens, so the teal glow keeps its place around the globe (Aes, 2026-11-04)
    camera.position.z = CAMERA_Z;

    const g = globe.current;
    if (!g) return;
    g.rotation.set(s.pitch, s.yaw, 0, "XYZ");
    g.updateMatrixWorld();

    if (arrived && arrivedAt.current === null) arrivedAt.current = clock.elapsedTime;
    const since = arrivedAt.current === null ? -1 : clock.elapsedTime - arrivedAt.current;

    anchors.forEach((a, n) => {
      const city = cities.current[n];
      if (!city) return;
      world.copy(a).applyMatrix4(g.matrixWorld);
      toCamera.copy(camera.position).sub(world).normalize();
      // Ghosts on the far side fade out and stop taking taps
      const facingUs = lifted.copy(world).normalize().dot(toCamera);
      const seen = Math.max(0, Math.min(1, (facingUs - 0.05) / 0.2));
      // Each ghost stands up straight toward the viewer, floated out a little along the line to the camera
      city.position.copy(world).addScaledVector(toCamera, PIN_LIFT);
      city.quaternion.copy(camera.quaternion);
      city.visible = seen > 0 && since >= 0;
      city.userData.seen = seen;

      groups[n].items.forEach(({ i }) => {
        const ghost = ghosts.current[i];
        const m = materials.current[i];
        if (!ghost || !m) return;
        const pop = reducedMotion ? 1 : popScale((since - POP_START - popOrder[i] * POP_STEP) / POP_TIME);
        const target = (open === i ? 1.2 : 1) * PIN_HEIGHT * pop;
        const k = 1 - Math.exp(-dt * 12);
        // Scale follows the pop exactly, then eases toward the open size
        const now = ghost.scale.y;
        const next = pop < 1 ? target : now + (target - now) * k;
        ghost.scale.setScalar(Math.max(next, 1e-4));
        // Hover lifts the ghost a hair, like the old pins
        const lift = hovered.current === i ? PIN_HEIGHT * 0.12 : 0;
        ghost.position.y += (lift - ghost.position.y) * k;
        // White, pink when open, faded when the piece was buffed
        m.color.lerp(open === i ? PINK : WHITE, k);
        const buffed = ghost.userData.buffed && open !== i ? 0.5 : 1;
        m.opacity = seen * buffed;
        m.transparent = m.opacity < 0.999;
        m.depthWrite = !m.transparent;
      });
    });
  });

  return (
    <>
      <group ref={globe}>
        {/* SphereGeometry starts its texture at the back; this turn lines the map up with onGlobe() */}
        <mesh rotation-y={-Math.PI / 2}>
          <sphereGeometry args={[RADIUS, 128, 96]} />
          <meshStandardMaterial map={color} bumpMap={bump} bumpScale={2.5} roughness={0.5} metalness={0.05} />
        </mesh>
        <Atmosphere />
      </group>
      {groups.map((g, n) => {
        const hasOpen = g.items.some(({ i }) => i === open);
        return (
          <group
            key={g.city}
            ref={(el) => {
              cities.current[n] = el;
            }}
            visible={false}
          >
            {g.items.map(({ s, i }, k) => (
              <group key={i} position-x={(k - (g.items.length - 1) / 2) * PIN_HEIGHT * FAN}>
                <group
                  ref={(el) => {
                    ghosts.current[i] = el;
                    if (el) el.userData.buffed = s.status === "buffed";
                  }}
                  scale={1e-4}
                >
                  <mesh
                    geometry={geometry}
                    renderOrder={2}
                    onClick={(e) => {
                      // A drag that ends on a ghost is a spin, not a pick
                      if (e.delta > 6 || (cities.current[n]?.userData.seen ?? 0) < 0.5) return;
                      e.stopPropagation();
                      onPick(i);
                    }}
                    onPointerOver={(e) => {
                      if ((cities.current[n]?.userData.seen ?? 0) < 0.5) return;
                      e.stopPropagation();
                      hovered.current = i;
                      document.body.style.cursor = "pointer";
                    }}
                    onPointerOut={() => {
                      if (hovered.current === i) hovered.current = null;
                      document.body.style.cursor = "";
                    }}
                  >
                    <meshPhysicalMaterial
                      ref={(m) => {
                        materials.current[i] = m;
                      }}
                      color={WHITE}
                      envMap={gloss}
                      envMapIntensity={0.45}
                      roughness={0.22}
                      metalness={0}
                      clearcoat={1}
                      clearcoatRoughness={0.12}
                    />
                  </mesh>
                </group>
                {/* The open ghost sends out pink rings from where it stands */}
                {open === i && <Pulse reducedMotion={reducedMotion} />}
              </group>
            ))}
            {/* The city, revealed over the selected ghost */}
            {hasOpen && (
              <Html position={[0, PIN_HEIGHT * 1.35, 0]} zIndexRange={[40, 30]} style={{ pointerEvents: "none" }}>
                <p className="pointer-events-none -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border-2 border-foreground bg-background px-3 py-1 font-mono text-xs uppercase tracking-[0.1em] text-foreground">
                  {g.city}
                </p>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
}

/** Two pink rings that spread out from the open ghost's feet and fade, again and again */
function Pulse({ reducedMotion }: { reducedMotion: boolean }) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    rings.current.forEach((r, n) => {
      if (!r) return;
      const t = reducedMotion ? 0.5 : ((clock.elapsedTime + n * 0.8) % 1.6) / 1.6;
      r.scale.set(0.4 + t * 2.6, (0.4 + t * 2.6) * 0.42, 1);
      (r.material as THREE.MeshBasicMaterial).opacity = 1 - t;
    });
  });
  return (
    <>
      {[0, 1].map((n) => (
        <mesh
          key={n}
          ref={(el) => {
            rings.current[n] = el;
          }}
          position={[0, PIN_HEIGHT * 0.04, -0.01]}
          renderOrder={1}
        >
          <ringGeometry args={[PIN_HEIGHT * 0.36, PIN_HEIGHT * 0.42, 48]} />
          <meshBasicMaterial color={PINK} transparent depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

export default function GlobeScene(props: {
  spin: MutableRefObject<Spin>;
  groups: PinGroup[];
  open: number | null;
  onPick: (i: number) => void;
  reducedMotion: boolean;
  arrived: boolean;
  onReady: () => void;
}) {
  const { onReady, ...rest } = props;
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 30, position: [0, 0, CAMERA_Z], near: 0.1, far: 20 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        // No film look: keep the green as loud as Aes's drawing
        gl.toneMapping = THREE.NoToneMapping;
      }}
    >
      {/* A soft key light from the top left, like the gloss in Aes's drawing */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[-2.5, 3, 4]} intensity={2.4} />
      <directionalLight position={[3, -1, 2]} intensity={0.35} />
      <Suspense fallback={null}>
        <Earth {...rest} />
        <Ready onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

/** Tells the page the globe has drawn, so the placeholder can fade out */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

/**
 * A thin neon teal halo around the globe's edge (a "fresnel" glow: strongest where the surface
 * turns away from the camera). It separates the globe from the white page.
 */
function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { glow: { value: new THREE.Color("#00ffff") } },
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 glow;
          varying vec3 vNormal;
          void main() {
            // Clear where the shell faces the camera, strong where it turns away at the edge:
            // a teal rim light on the globe's edge that spills a little past it onto the page
            float facing = clamp(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
            gl_FragColor = vec4(glow, pow(1.0 - facing, 3.0));
          }
        `,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh material={material} scale={1.035}>
      <sphereGeometry args={[RADIUS, 96, 64]} />
    </mesh>
  );
}
