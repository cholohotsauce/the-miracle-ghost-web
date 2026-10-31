"use client";

import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Sighting } from "@/content/shows";
import { rad, stepSpin, type PinGroup, type Spin } from "./globeMath";

/**
 * The 3D globe for Ghost Sightings (Aes, 2026-10-30): grey ocean, toxic green land
 * (textures baked by scripts/bake-globe.mjs), turning very slowly on its own.
 * Drag to spin it; tap a ghost to turn its city to the front and reveal it.
 * The spin lives in refs, not React state, so dragging never re-renders the page.
 */

const RADIUS = 1;
const PIN = { width: 30, height: 34 };
/** Ghosts in the same city sit side by side, this far apart, in pin widths */
const FAN = 0.6;

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
}: {
  spin: MutableRefObject<Spin>;
  groups: PinGroup[];
  open: number | null;
  onPick: (i: number) => void;
  reducedMotion: boolean;
}) {
  const [color, bump] = useTexture(["/sightings/globe-color.webp", "/sightings/globe-bump.webp"], (textures) => {
    const [map] = [textures].flat();
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8; // sharper coasts near the edge; the GPU caps it at what it can do
  });

  const globe = useRef<THREE.Group>(null);
  const pins = useRef<(HTMLDivElement | null)[]>([]);
  const anchors = useMemo(() => groups.map((g) => onGlobe(g.at, RADIUS * 1.005)), [groups]);

  useFrame(({ camera }, delta) => {
    const s = spin.current;
    stepSpin(s, Math.min(delta, 0.05), reducedMotion);
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
      {groups.map((g, n) => (
        <Html key={g.city} position={anchors[n]} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div
            ref={(el) => {
              pins.current[n] = el;
            }}
            className="relative"
            style={{ transform: `translate(-50%, -100%)` }}
          >
            <div className="flex items-end" style={{ gap: PIN.width * (FAN - 1) }}>
              {g.items.map(({ s, i }) => (
                <GhostPin key={i} s={s} open={open === i} onPick={() => onPick(i)} />
              ))}
            </div>
            {/* The city, revealed over the selected ghost */}
            {g.items.some(({ i }) => i === open) && (
              <p className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-foreground bg-background px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground">
                {g.city}
              </p>
            )}
          </div>
        </Html>
      ))}
    </group>
  );
}

/**
 * Aes's ghost pin, the same art as the flat map had: a body mask that takes the pin's color
 * (scripts/bake-globe.mjs), and his black outline on top (scripts/make-icons.mjs). White, pink when open, faded when buffed.
 */
function GhostPin({ s, open, onPick }: { s: Sighting; open: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`${s.name}, ${s.city}`}
      aria-pressed={open}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      className="group relative block shrink-0 cursor-pointer outline-none transition-transform duration-300 hover:-translate-y-1"
      style={{ width: PIN.width, height: PIN.height, transform: open ? "scale(1.2)" : undefined, transformOrigin: "50% 100%" }}
    >
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
  onReady: () => void;
}) {
  const { onReady, ...rest } = props;
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 30, position: [0, 0, 4.3], near: 0.1, far: 20 }}
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
