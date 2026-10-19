"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { FIRE_PLANE, GhostRig, HALO_SIZE } from "./ghostRig";
import { MINI_COUNT } from "./tricks";
import { FACE_MAP_URL, HALO_MAP_URL, MODEL_URL } from "./modelBake";
import type { GhostControls } from "./types";

/** The low-poly ghost for the clone trick's hundred tiny ghosts (scripts/bake-mini-ghost.mjs) */
const MINI_MODEL_URL = "/models/miracle-ghost-mini.glb";

/**
 * The compressed file stores positions as integers with a scale on the node.
 * The shader reads model-space positions, so expand every attribute to floats and apply that scale.
 */
function toModelSpace(scene: THREE.Object3D, url: string) {
  let mesh: THREE.Mesh | undefined;
  scene.traverse((o) => {
    if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh;
  });
  if (!mesh) throw new Error(`${url} has no mesh`);
  const geometry = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(mesh.geometry.attributes)) {
    const a = attr as THREE.BufferAttribute;
    const out = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) {
      for (let c = 0; c < a.itemSize; c++) out[i * a.itemSize + c] = a.getComponent(i, c);
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
  }
  geometry.setIndex(mesh.geometry.index);
  mesh.updateWorldMatrix(true, false);
  geometry.applyMatrix4(mesh.matrixWorld);
  geometry.computeBoundingSphere();
  return geometry;
}

/** Aes's sculpted ghost, driven by the same GhostControls as the rest of the stage. */
export default function MiracleGhost({
  controls,
  onPoke,
  onReady,
}: {
  controls: GhostControls;
  onPoke: () => void;
  onReady?: () => void;
}) {
  const gltf = useGLTF(MODEL_URL, false, true);
  const miniGltf = useGLTF(MINI_MODEL_URL, false, true);
  // Both maps are data, not color, so keep them out of sRGB decoding
  const [faceMap, haloMap] = useTexture([FACE_MAP_URL, HALO_MAP_URL], (textures) => {
    for (const t of [textures].flat()) t.colorSpace = THREE.NoColorSpace;
  });

  const geometry = useMemo(() => toModelSpace(gltf.scene, MODEL_URL), [gltf]);
  const miniGeometry = useMemo(() => toModelSpace(miniGltf.scene, MINI_MODEL_URL), [miniGltf]);

  const [rig] = useState(() => new GhostRig(controls.current, faceMap, haloMap));
  const trickGroup = useRef<THREE.Group>(null);
  const minis = useRef<THREE.InstancedMesh>(null);
  const frames = useRef(0);
  const view = useRef({ halfW: 2, halfH: 2.9, centerY: 0 });

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => miniGeometry.dispose(), [miniGeometry]);
  useEffect(
    () => () => {
      rig.dispose();
      document.body.style.cursor = "";
    },
    [rig],
  );

  useFrame((state, dt) => {
    const { current: c } = controls;
    const { width, height } = state.viewport.getCurrentViewport(state.camera, [0, 0, 0]);
    view.current.halfW = width / 2;
    view.current.halfH = height / 2;
    view.current.centerY = state.camera.position.y;
    rig.update(c, state.clock.elapsedTime, dt, trickGroup.current, minis.current, view.current);
    // Two frames in, the ghost is on screen and the shaders are compiled
    if (++frames.current === 2) onReady?.();
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onPoke();
  };

  return (
    <>
      <group ref={trickGroup}>
        <mesh position={[0, HALO_SIZE.centerY, -0.9]} material={rig.halo.material} renderOrder={-1}>
          <planeGeometry args={[HALO_SIZE.width, HALO_SIZE.height]} />
        </mesh>
        <mesh
          position={[FIRE_PLANE.minX + FIRE_PLANE.width / 2, FIRE_PLANE.minY + FIRE_PLANE.height / 2, FIRE_PLANE.z]}
          material={rig.fire.material}
        >
          <planeGeometry args={[FIRE_PLANE.width, FIRE_PLANE.height]} />
        </mesh>
        <mesh
          geometry={geometry}
          material={rig.body.material}
          onClick={handleClick}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "")}
        />
      </group>
      <instancedMesh
        ref={minis}
        args={[miniGeometry, rig.body.material, MINI_COUNT]}
        visible={false}
        frustumCulled={false}
        onClick={handleClick}
      />
    </>
  );
}

useGLTF.preload(MODEL_URL, false, true);
useGLTF.preload(MINI_MODEL_URL, false, true);
