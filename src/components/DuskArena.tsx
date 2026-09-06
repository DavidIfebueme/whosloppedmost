"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { spiralRadius } from "@/lib/spiral";

function Skyline({ radius }: { readonly radius: number }) {
  const geometry = useMemo(() => {
    const blocks: THREE.BufferGeometry[] = [];
    const windows: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 42; i++) {
      const angle = i / 42 * Math.PI * 2;
      const height = 12 + ((i * 17) % 39);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const block = new THREE.BoxGeometry(9 + i % 4 * 3, height, 12);
      block.translate(0, height / 2, 0);
      block.rotateY(-angle);
      block.translate(x, 0, z);
      blocks.push(block);
      for (const level of [0.28, 0.55, 0.82]) {
        const window = new THREE.BoxGeometry(7 + i % 4 * 3, 0.55, 12.05);
        window.translate(0, height * level, 0);
        window.rotateY(-angle);
        window.translate(x, 0, z);
        windows.push(window);
      }
    }
    const result = [mergeGeometries(blocks)!, mergeGeometries(windows)!];
    [...blocks, ...windows].forEach((g) => g.dispose());
    return result;
  }, [radius]);
  useEffect(() => () => geometry.forEach((g) => g.dispose()), [geometry]);
  return <group>
    <mesh geometry={geometry[0]}><meshStandardMaterial color="#172a36" roughness={0.72} metalness={0.3} /></mesh>
    <mesh geometry={geometry[1]}><meshBasicMaterial color="#b9b7a1" /></mesh>
  </group>;
}

export default function DuskArena({ maxDistance }: { readonly maxDistance: number }) {
  const radius = spiralRadius(maxDistance) + 16;
  const fixtures = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const angle = i / 12 * Math.PI * 2;
    return { x: Math.cos(angle) * (radius + 13), z: Math.sin(angle) * (radius + 13), angle };
  }), [radius]);
  return <group>
    <mesh position={[0, -1.3, 0]} receiveShadow>
      <cylinderGeometry args={[radius, radius + 3, 2.3, 128]} />
      <meshStandardMaterial color="#263d41" roughness={0.86} />
    </mesh>
    {[radius - 1, radius + 1.5].map((r) => <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
      <torusGeometry args={[r, 0.13, 4, 180]} />
      <meshBasicMaterial color="#c9a775" />
    </mesh>)}
    <mesh position={[0, 0.7, 0]}>
      <cylinderGeometry args={[13.5, 15, 1.4, 64]} />
      <meshStandardMaterial color="#18242b" roughness={0.38} metalness={0.55} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.43, 0]}>
      <torusGeometry args={[12.8, 0.12, 6, 80]} />
      <meshBasicMaterial color="#f2be70" />
    </mesh>
    <mesh position={[0, 8, 0]}>
      <cylinderGeometry args={[2.8, 6, 14, 8]} />
      <meshStandardMaterial color="#233942" metalness={0.7} roughness={0.3} />
    </mesh>
    {fixtures.map((f, i) => <group key={i} position={[f.x, 0, f.z]} rotation={[0, -f.angle + Math.PI / 2, 0]}>
      <mesh position={[0, 14, 0]}>
        <cylinderGeometry args={[0.2, 0.45, 28, 6]} />
        <meshStandardMaterial color="#53616a" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, 28, 0]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[7, 1.2, 1.1]} />
        <meshStandardMaterial color="#d2dfdf" emissive="#ffe5b9" emissiveIntensity={2.5} />
      </mesh>
    </group>)}
    <Skyline radius={radius + 120} />
  </group>;
}
