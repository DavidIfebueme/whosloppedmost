"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { spiralRadius } from "@/lib/spiral";

function Skyline({ radius }: { readonly radius: number }) {
  const buildings = useMemo(() => Array.from({ length: 42 }, (_, i) => {
    const angle = i / 42 * Math.PI * 2;
    const height = 12 + ((i * 17) % 39);
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, angle, height };
  }), [radius]);
  return <group>{buildings.map((b, i) => <group key={i} position={[b.x, 0, b.z]} rotation={[0, -b.angle, 0]}>
    <mesh position={[0, b.height / 2, 0]}>
      <boxGeometry args={[9 + i % 4 * 3, b.height, 12]} />
      <meshStandardMaterial color={i % 3 === 0 ? "#263642" : "#17232d"} roughness={0.72} metalness={0.3} />
    </mesh>
    {[0.28, 0.55, 0.82].map((level) => <mesh key={level} position={[0, b.height * level, 6.02]}>
      <planeGeometry args={[7 + i % 4 * 3, 0.65]} />
      <meshBasicMaterial color={i % 4 === 0 ? "#efbc7e" : "#6798ac"} />
    </mesh>)}
  </group>)}</group>;
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
