"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { DRIP_TIPS, GhostRig } from "./ghostRig";
import type { GhostControls } from "./types";

/**
 * Stand-in for the artist's .glb ghost, built from his silhouette at runtime.
 * It reads the same GhostControls a future GLB ghost would, so the swap is local to GhostStage.
 */
export default function ProceduralGhost({ controls, onPoke }: { controls: GhostControls; onPoke: () => void }) {
  const [rig] = useState(() => new GhostRig(controls.current));
  const squashGroup = useRef<THREE.Group>(null);
  const drops = useRef<(THREE.Mesh | null)[]>([]);

  useEffect(
    () => () => {
      rig.dispose();
      document.body.style.cursor = "";
    },
    [rig],
  );

  useFrame((state, dt) => {
    rig.update(controls.current, state.clock.elapsedTime, dt, squashGroup.current, drops.current);
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onPoke();
  };

  return (
    <group ref={squashGroup}>
      <mesh position={[0, rig.haloSize.centerY, -0.7]} material={rig.halo.material} renderOrder={-1}>
        <planeGeometry args={[rig.haloSize.width, rig.haloSize.height]} />
      </mesh>
      <mesh
        geometry={rig.geometry}
        material={rig.body.material}
        onClick={handleClick}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      />
      {DRIP_TIPS.map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            drops.current[i] = m;
          }}
          geometry={rig.dropGeometry}
          material={rig.drop.material}
          visible={false}
        />
      ))}
    </group>
  );
}
