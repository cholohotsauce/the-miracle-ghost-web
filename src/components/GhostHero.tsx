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
        <mesh>
          <capsuleGeometry args={[0.8, 1.2, 32, 32]} />
          <meshStandardMaterial 
            color="#111111"
            emissive="#39ff14"
            emissiveIntensity={1.2}
            roughness={0.4}
            metalness={0.9}
            wireframe={true} // Adding wireframe to make it look a bit more "underground/tech"
          />
        </mesh>
      </Float>
    </group>
  );
}

export default function GhostHero() {
  return (
    <div className="absolute inset-0 z-0 w-full h-full bg-transparent">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <GhostMesh />
      </Canvas>
    </div>
  );
}
