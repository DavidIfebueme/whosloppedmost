"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { spiralRadius } from "@/lib/spiral";
import { seededRandom, surfaceTexture } from "./SurfaceTextures";

function merge(parts: THREE.BufferGeometry[]) {
  const result = mergeGeometries(parts)!;
  parts.forEach((geometry) => geometry.dispose());
  return result;
}

function Skyline({ radius }: { readonly radius: number }) {
  const facade = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128; canvas.height = 256;
    const context = canvas.getContext("2d")!;
    const random = seededRandom(1409);
    context.fillStyle = "#52606d";
    context.fillRect(0, 0, 128, 256);
    for (let row = 0; row < 24; row++) {
      for (let column = 0; column < 8; column++) {
        const lit = random() > 0.58;
        context.fillStyle = lit ? (random() > 0.4 ? "#c5aa80" : "#8fa9b8") : "#1e303d";
        context.fillRect(column * 16 + 3, row * 10.6 + 2, 9, 6);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);
  const geometries = useMemo(() => {
    const blocks: THREE.BufferGeometry[] = [];
    const rooftops: THREE.BufferGeometry[] = [];
    const random = seededRandom(7301);
    for (let i = 0; i < 100; i++) {
      const angle = random() * Math.PI * 2;
      const distance = radius + random() * 240;
      const height = 16 + random() ** 2 * 120;
      const width = 12 + random() * 22;
      const depth = 12 + random() * 19;
      const x = Math.cos(angle) * distance, z = Math.sin(angle) * distance;
      const block = new THREE.BoxGeometry(width, height, depth);
      block.rotateY(angle * 0.3);
      block.translate(x, height / 2 - 4, z);
      blocks.push(block);
      const cap = new THREE.BoxGeometry(width * 0.72, 3 + random() * 7, depth * 0.72);
      cap.rotateY(angle * 0.3); cap.translate(x, height - 3, z); rooftops.push(cap);
      if (i % 4 === 0) {
        const antenna = new THREE.CylinderGeometry(0.15, 0.3, 10, 4);
        antenna.translate(x, height + 6, z); rooftops.push(antenna);
      }
    }
    return [merge(blocks), merge(rooftops)] as const;
  }, [radius]);
  useEffect(() => () => { facade.dispose(); geometries.forEach((g) => g.dispose()); }, [facade, geometries]);
  return <group>
    <mesh geometry={geometries[0]}><meshStandardMaterial map={facade} emissiveMap={facade} emissive="#6d8293" emissiveIntensity={0.08} color="#54677c" roughness={0.74} metalness={0.08} /></mesh>
    <mesh geometry={geometries[1]}><meshStandardMaterial color="#314355" roughness={0.88} /></mesh>
  </group>;
}

function Palms({ radius }: { readonly radius: number }) {
  const geometry = useMemo(() => {
    const trunks: THREE.BufferGeometry[] = [], fronds: THREE.BufferGeometry[] = [];
    const random = seededRandom(8603);
    for (let tree = 0; tree < 28; tree++) {
      const angle = tree / 28 * Math.PI * 2 + random() * 0.08;
      const r = radius + 30 + random() * 46;
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      const height = 13 + random() * 11;
      const lean = 1 + random() * 2;
      const crown = new THREE.Vector3(x + lean, height, z);
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, -0.5, z), new THREE.Vector3(x, height * 0.6, z), crown);
      trunks.push(new THREE.TubeGeometry(curve, 8, 0.38, 6, false));
      for (let leaf = 0; leaf < 11; leaf++) {
        const a = leaf / 11 * Math.PI * 2 + tree;
        const length = 6 + random() * 3;
        const positions: number[] = [], indices: number[] = [];
        for (let segment = 0; segment <= 10; segment++) {
          const t = segment / 10;
          const width = Math.sin(Math.PI * t) * 0.95;
          const y = height + Math.sin(t * Math.PI) * 2.5 - t * t * 2.6;
          for (const side of [-1, 1]) positions.push(crown.x + Math.cos(a) * length * t + Math.sin(a) * width * side, y - Math.abs(width) * 0.2, crown.z + Math.sin(a) * length * t - Math.cos(a) * width * side);
          if (segment < 10) { const k = segment * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
        }
        const leafGeometry = new THREE.BufferGeometry();
        leafGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        leafGeometry.setIndex(indices); leafGeometry.computeVertexNormals();
        // A UV attribute lets the leaf batches share the geometry merge format.
        leafGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(22 * 2), 2));
        fronds.push(leafGeometry);
      }
    }
    return [merge(trunks), merge(fronds)] as const;
  }, [radius]);
  useEffect(() => () => geometry.forEach((g) => g.dispose()), [geometry]);
  return <group>
    <mesh geometry={geometry[0]} castShadow><meshStandardMaterial color="#807362" roughness={0.94} /></mesh>
    <mesh geometry={geometry[1]} castShadow><meshStandardMaterial color="#3e5747" roughness={0.87} side={THREE.DoubleSide} /></mesh>
  </group>;
}

function ArenaLights({ radius }: { readonly radius: number }) {
  const geometry = useMemo(() => {
    const structure: THREE.BufferGeometry[] = [], emitters: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2;
      const x = Math.cos(angle) * (radius + 10), z = Math.sin(angle) * (radius + 10);
      const pole = new THREE.CylinderGeometry(0.22, 0.46, 24, 8);
      pole.translate(x, 12, z); structure.push(pole);
      const arm = new THREE.BoxGeometry(6, 0.25, 0.3);
      arm.rotateY(-angle); arm.translate(x, 24, z); structure.push(arm);
      for (let lamp = 0; lamp < 3; lamp++) {
        const housing = new THREE.BoxGeometry(1.6, 0.6, 1.1);
        const light = new THREE.BoxGeometry(1.3, 0.12, 0.85);
        const lx = x + Math.cos(angle) * (lamp - 1) * 1.9, lz = z - Math.sin(angle) * (lamp - 1) * 1.9;
        housing.rotateY(-angle); housing.translate(lx, 24.1, lz); structure.push(housing);
        light.rotateY(-angle); light.translate(lx, 23.74, lz); emitters.push(light);
      }
    }
    return [merge(structure), merge(emitters)] as const;
  }, [radius]);
  useEffect(() => () => geometry.forEach((g) => g.dispose()), [geometry]);
  return <group>
    <mesh geometry={geometry[0]}><meshStandardMaterial color="#5c6a73" metalness={0.7} roughness={0.45} /></mesh>
    <mesh geometry={geometry[1]}><meshBasicMaterial color={[2.8, 2.2, 1.5]} toneMapped={false} /></mesh>
  </group>;
}

export default function DuskArena({ maxDistance }: { readonly maxDistance: number }) {
  const radius = spiralRadius(maxDistance) + 15;
  const maps = useMemo(() => {
    const grass = surfaceTexture("grass"); grass.repeat.set(32, 32);
    const concrete = surfaceTexture("concrete"); concrete.repeat.set(24, 24);
    return { grass, concrete };
  }, []);
  useEffect(() => () => { maps.grass.dispose(); maps.concrete.dispose(); }, [maps]);
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
      <circleGeometry args={[radius, 128]} />
      <meshStandardMaterial map={maps.grass} color="#8b9a75" roughness={0.95} bumpMap={maps.grass} bumpScale={0.08} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]} receiveShadow>
      <ringGeometry args={[radius, radius + 22, 128]} />
      <meshStandardMaterial map={maps.concrete} color="#a4aeb0" roughness={0.6} metalness={0.08} />
    </mesh>
    <mesh position={[0, -0.5, 0]} receiveShadow><cylinderGeometry args={[radius + 22, radius + 22, 0.6, 128]} /><meshStandardMaterial color="#53636a" roughness={0.8} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><torusGeometry args={[radius + 20, 0.16, 4, 200]} /><meshBasicMaterial color="#b3c9c8" /></mesh>
    <mesh position={[0, 0.7, 0]} receiveShadow><cylinderGeometry args={[12.5, 13, 1.4, 64]} /><meshStandardMaterial color="#45565e" roughness={0.35} metalness={0.45} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.42, 0]}><torusGeometry args={[11.8, 0.14, 6, 80]} /><meshBasicMaterial color={[1.5, 0.9, 0.4]} toneMapped={false} /></mesh>
    <mesh position={[0, 7.8, 0]} castShadow><cylinderGeometry args={[3.5, 4.5, 13, 32]} /><meshStandardMaterial color="#304149" metalness={0.65} roughness={0.24} /></mesh>
    <Palms radius={radius} />
    <ArenaLights radius={radius} />
    <Skyline radius={radius + 225} />
  </group>;
}
