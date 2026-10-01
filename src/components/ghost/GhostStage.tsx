"use client";

import { useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import ProceduralGhost from "./ProceduralGhost";
import type { GhostControls } from "./types";

const PANEL_COLOR = "#060609";
const FOV = 35;
// World-space area that must stay in frame: the ghost plus room for falling drops and the controls below
const FRAME_HEIGHT = 5.1;
const FRAME_WIDTH = 3.9;

/** Pulls the camera back on narrow screens so the whole ghost always fits. */
function FitCamera() {
  const { camera, size } = useThree();
  const aspect = size.width / Math.max(size.height, 1);
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const distance = Math.max(FRAME_HEIGHT / (2 * tan), FRAME_WIDTH / aspect / (2 * tan));
  camera.position.set(0, -0.2, distance);
  camera.lookAt(0, -0.2, 0);
  return null;
}

/** Leans and drifts the ghost toward the cursor or the phone's tilt. */
function Follow({ controls, children }: { controls: GhostControls; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const { tilt, reducedMotion } = controls.current;
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 3);
    const reach = reducedMotion ? 0.4 : 1;
    g.rotation.y += (tilt.x * 0.45 * reach - g.rotation.y) * k;
    g.rotation.x += (-tilt.y * 0.22 * reach - g.rotation.x) * k;
    g.position.x += (tilt.x * 0.25 * reach - g.position.x) * k;
    g.position.y += (tilt.y * 0.12 * reach - g.position.y) * k;
  });
  return <group ref={group}>{children}</group>;
}

type Props = {
  controls: GhostControls;
  awake: boolean;
  color: string;
  reducedMotion: boolean;
  active: boolean;
  onPoke: () => void;
  fallback?: ReactNode;
};

/**
 * The dark panel the ghost lives in. Swap <ProceduralGhost> for the artist's GLB here
 * once it arrives; everything else (camera, follow, glow, particles) stays.
 */
export default function GhostStage({ controls, awake, color, reducedMotion, active, onPoke, fallback }: Props) {
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: FOV, position: [0, 0, 8] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      fallback={fallback}
      className="!absolute inset-0"
    >
      <color attach="background" args={[PANEL_COLOR]} />
      <FitCamera />
      <Follow controls={controls}>
        <Float
          enabled={!reducedMotion}
          speed={1.6}
          rotationIntensity={0.25}
          floatIntensity={0.6}
          floatingRange={[-0.08, 0.08]}
        >
          <ProceduralGhost controls={controls} onPoke={onPoke} />
        </Float>
      </Follow>
      <Sparkles
        count={awake ? 70 : 24}
        scale={[7, 5.5, 3]}
        position={[0, -0.2, -1]}
        size={awake ? 2.2 : 1.2}
        speed={reducedMotion ? 0 : 0.25}
        opacity={awake ? 0.8 : 0.35}
        color={awake ? color : "#8a90a0"}
        noise={0.6}
      />
    </Canvas>
  );
}
