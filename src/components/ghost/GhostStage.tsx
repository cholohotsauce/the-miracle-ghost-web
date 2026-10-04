"use client";

import { Suspense, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import MiracleGhost from "./MiracleGhost";
import type { GhostControls } from "./types";

import { FOV, FRAME_HEIGHT, FRAME_WIDTH, LOOK_Y } from "./framing";

/** Pulls the camera back on narrow screens so the whole ghost always fits. */
function FitCamera() {
  const { camera, size } = useThree();
  const aspect = size.width / Math.max(size.height, 1);
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const distance = Math.max(FRAME_HEIGHT / (2 * tan), FRAME_WIDTH / aspect / (2 * tan));
  camera.position.set(0, LOOK_Y, distance);
  camera.lookAt(0, LOOK_Y, 0);
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
    g.rotation.y += (tilt.x * 0.4 * reach - g.rotation.y) * k;
    g.rotation.x += (-tilt.y * 0.2 * reach - g.rotation.x) * k;
    g.position.x += (tilt.x * 0.18 * reach - g.position.x) * k;
    g.position.y += (tilt.y * 0.08 * reach - g.position.y) * k;
  });
  return <group ref={group}>{children}</group>;
}

type Props = {
  controls: GhostControls;
  reducedMotion: boolean;
  onPoke: () => void;
  /** Called once the model has drawn its first frame, so a still poster can fade away */
  onReady?: () => void;
  fallback?: ReactNode;
  /** Device-pixel-ratio range; the mini ghost uses a lower one to stay cheap */
  dpr?: [number, number];
  className?: string;
};

/** A transparent stage: the white page shows through around Aes's ghost. */
export default function GhostStage({
  controls,
  reducedMotion,
  onPoke,
  onReady,
  fallback,
  dpr = [1, 2],
  className = "!absolute inset-0",
}: Props) {
  return (
    <Canvas
      dpr={dpr}
      camera={{ fov: FOV, position: [0, 0, 10] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      fallback={fallback}
      className={className}
    >
      <FitCamera />
      <Follow controls={controls}>
        <Float
          enabled={!reducedMotion}
          speed={1.5}
          rotationIntensity={0.2}
          floatIntensity={0.55}
          floatingRange={[-0.08, 0.08]}
        >
          <Suspense fallback={null}>
            <MiracleGhost controls={controls} onPoke={onPoke} onReady={onReady} />
          </Suspense>
        </Float>
      </Follow>
    </Canvas>
  );
}
