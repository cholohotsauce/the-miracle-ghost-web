"use client";

import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Sighting } from "@/content/shows";
import { CAMERA_Z, CAMERA_Z_OPEN, rad, stepSpin, type PinGroup, type Spin } from "./globeMath";

/**
 * The 3D globe for Ghost Sightings (Aes, 2026-10-30): grey ocean, toxic green land
 * (textures baked by scripts/bake-globe.mjs), turning very slowly on its own.
 * Drag to spin it; tap a ghost to turn its city to the front and reveal it.
 * The spin lives in refs, not React state, so dragging never re-renders the page.
 * Polish (2026-10-31): a teal glow ring around the edge, the camera leans in on an open ghost,
 * the ghosts pop up one by one after the entrance spin, and the open one sends out a pink pulse.
 */

const RADIUS = 1;
const PIN = { width: 30, height: 34 };
/** Ghosts in the same city sit side by side, this far apart, in pin widths */
const FAN = 0.6;
/** When the ghosts start popping up, after the entrance spin starts, and the gap between them */
const POP_START_MS = 650;
const POP_STEP_MS = 110;

/** Scratch vectors for the frame loop */
const world = new THREE.Vector3();
const toCamera = new THREE.Vector3();

/** A point on the globe; longitude 0 faces the camera when the globe has not turned */
function onGlobe([lat, lng]: [number, number], r = RADIUS) {
  const phi = rad(lat);
  const lambda = rad(lng);
  return new THREE.Vector3(r * Math.cos(phi) * Math.sin(lambda), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lambda));
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
  const pins = useRef<(HTMLDivElement | null)[]>([]);
  const anchors = useMemo(() => groups.map((g) => onGlobe(g.at, RADIUS * 1.005)), [groups]);
  // Ghosts pop up west to east, the way the globe turns them into view
  const popOrder = useMemo(() => {
    const all = groups.flatMap((g) => g.items.map(({ i }) => ({ i, lng: g.at[1] })));
    const order: Record<number, number> = {};
    all.sort((a, b) => a.lng - b.lng).forEach(({ i }, n) => (order[i] = n));
    return order;
  }, [groups]);

  useFrame(({ camera }, delta) => {
    const s = spin.current;
    const dt = Math.min(delta, 0.05);
    stepSpin(s, dt, reducedMotion);

    // Lean in a little toward an open ghost, and back out when it closes
    const z = open === null ? CAMERA_Z : CAMERA_Z_OPEN;
    camera.position.z += (z - camera.position.z) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 3));

    const g = globe.current;
    if (!g) return;
    g.rotation.set(s.pitch, s.yaw, 0, "XYZ");
    g.updateMatrixWorld();

    // Ghosts on the far side fade out and stop taking taps
    anchors.forEach((a, n) => {
      const el = pins.current[n];
      if (!el) return;
      world.copy(a).applyMatrix4(g.matrixWorld);
      toCamera.copy(camera.position).sub(world).normalize();
      const facingUs = world.normalize().dot(toCamera);
      const seen = Math.max(0, Math.min(1, (facingUs - 0.05) / 0.2));
      el.style.opacity = String(seen);
      el.style.pointerEvents = seen > 0.5 ? "auto" : "none";
      el.style.visibility = seen === 0 ? "hidden" : "visible";
    });
  });

  return (
    <group ref={globe}>
      {/* SphereGeometry starts its texture at the back; this turn lines the map up with onGlobe() */}
      <mesh rotation-y={-Math.PI / 2}>
        <sphereGeometry args={[RADIUS, 128, 96]} />
        <meshStandardMaterial map={color} bumpMap={bump} bumpScale={2.5} roughness={0.5} metalness={0.05} />
      </mesh>
      <Atmosphere />
      {groups.map((g, n) => {
        const hasOpen = g.items.some(({ i }) => i === open);
        return (
        // The city with the open ghost sits above every other pin, so its label is never covered
        <Html key={g.city} position={anchors[n]} zIndexRange={hasOpen ? [40, 30] : [20, 0]} style={{ pointerEvents: "none" }}>
          <div
            ref={(el) => {
              pins.current[n] = el;
            }}
            className="relative"
            style={{ transform: `translate(-50%, -100%)` }}
          >
            <div className="flex items-end" style={{ gap: PIN.width * (FAN - 1) }}>
              {g.items.map(({ s, i }) => (
                <GhostPin
                  key={i}
                  s={s}
                  open={open === i}
                  onPick={() => onPick(i)}
                  pop={arrived && !reducedMotion ? POP_START_MS + popOrder[i] * POP_STEP_MS : null}
                  hidden={!arrived}
                />
              ))}
            </div>
            {/* The city, revealed over the selected ghost */}
            {hasOpen && (
              <p className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-foreground bg-background px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground">
                {g.city}
              </p>
            )}
          </div>
        </Html>
        );
      })}
    </group>
  );
}

/**
 * Aes's ghost pin, the same art as the flat map had: a body mask that takes the pin's color
 * (scripts/bake-globe.mjs), and his black outline on top (scripts/make-icons.mjs). White, pink when open, faded when buffed.
 */
function GhostPin({
  s,
  open,
  onPick,
  pop,
  hidden,
}: {
  s: Sighting;
  open: boolean;
  onPick: () => void;
  /** Delay before this ghost pops up, in ms; null to just be there */
  pop: number | null;
  /** Before the entrance, the ghosts wait out of sight */
  hidden: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={`${s.name}, ${s.city}`}
      aria-pressed={open}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      className={`group relative block shrink-0 cursor-pointer outline-none transition-transform duration-300 hover:-translate-y-1 ${
        pop !== null ? "ghost-pin-pop" : ""
      }`}
      style={{
        width: PIN.width,
        height: PIN.height,
        transform: open ? "scale(1.2)" : undefined,
        transformOrigin: "50% 100%",
        animationDelay: pop !== null ? `${pop}ms` : undefined,
        visibility: hidden ? "hidden" : undefined,
      }}
    >
      {/* The open ghost sends out a pink ping from where it stands */}
      {open && (
        <>
          <span aria-hidden className="ghost-pin-pulse" />
          <span aria-hidden className="ghost-pin-pulse [animation-delay:0.8s]" />
        </>
      )}
      <span
        aria-hidden
        className={`absolute inset-0 transition-colors group-focus-visible:bg-[var(--color-neon-pink)] ${
          open ? "bg-[var(--color-neon-pink)]" : "bg-background"
        }`}
        style={{
          maskImage: "url(/sightings/ghost-pin-mask.png)",
          WebkitMaskImage: "url(/sightings/ghost-pin-mask.png)",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny outline drawn over the mask */}
      <img
        src="/sightings/ghost-pin-ink.png"
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full select-none"
        style={{ opacity: s.status === "buffed" && !open ? 0.45 : 1 }}
      />
    </button>
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
