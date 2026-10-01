"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function GhostMesh() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Target position based on mouse pointer (normalized -1 to +1)
    // Scale the movement so the ghost travels across the viewport
    const targetX = state.pointer.x * 4;
    const targetY = state.pointer.y * 3;
    
    // Lerp position for smooth tracking
    groupRef.current.position.lerp(
      new THREE.Vector3(targetX, targetY, 0),
      3 * delta // Spring stiffness / lerp factor
    );

    // Calculate slight rotation toward the pointer
    const targetRotationX = -state.pointer.y * 0.3;
    const targetRotationY = state.pointer.x * 0.5;

    // Lerp rotation for smooth tilting
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotationX,
      3 * delta
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotationY,
      3 * delta
    );
  });

  return (
    <group ref={groupRef}>
      <Float
        speed={2.5} // Animation speed
        rotationIntensity={0.6} // XYZ rotation intensity
        floatIntensity={1.5} // Up/down float intensity
      >
        {/* Chromatic offsets: neon pink and electric teal ghosts behind the ink wireframe */}
        <mesh position={[-0.06, 0.04, -0.1]}>
          <capsuleGeometry args={[0.8, 1.2, 8, 20]} />
          <meshBasicMaterial color="#ff00ff" wireframe transparent opacity={0.55} />
        </mesh>
        <mesh position={[0.06, -0.04, -0.1]}>
          <capsuleGeometry args={[0.8, 1.2, 8, 20]} />
          <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.7} />
        </mesh>
        <mesh>
          <capsuleGeometry args={[0.8, 1.2, 8, 20]} />
          <meshBasicMaterial color="#0a0a0a" wireframe />
        </mesh>
      </Float>
    </group>
  );
}

export default function GhostHero() {
  return (
    // pan-y keeps vertical swipes scrolling the page on phones; horizontal drags still steer the ghost
    <div className="absolute inset-0 z-0 w-full h-full bg-transparent touch-pan-y">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        className="w-full h-full"
      >
        <GhostMesh />
      </Canvas>
    </div>
  );
}
