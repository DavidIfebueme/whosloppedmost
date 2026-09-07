"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pointAt, spiralRadius } from "@/lib/spiral";

type Surface = "concrete" | "metal" | "glass" | "light" | "seat";
type Triple = readonly [number, number, number];
interface Part { surface: Surface; size: Triple; position: Triple }

/** Repeated architectural details share one draw call per surface. */
function Architecture({ parts }: { readonly parts: readonly Part[] }) {
  const batches = useMemo(() => {
    const surfaces: Surface[] = ["concrete", "metal", "glass", "light", "seat"];
    return surfaces.flatMap((surface) => {
      const pieces = parts.filter((part) => part.surface === surface).map((part) => {
        const geometry = new THREE.BoxGeometry(...part.size);
        geometry.translate(...part.position);
        return geometry;
      });
      if (pieces.length === 0) return [];
      const geometry = mergeGeometries(pieces);
      pieces.forEach((piece) => piece.dispose());
      return geometry ? [{ surface, geometry }] : [];
    });
  }, [parts]);
  useEffect(() => () => batches.forEach(({ geometry }) => geometry.dispose()), [batches]);
  return <group>{batches.map(({ surface, geometry }) => <mesh key={surface} geometry={geometry} castShadow={surface !== "light"} receiveShadow>
    {surface === "concrete" && <meshStandardMaterial color="#68716e" roughness={0.88} />}
    {surface === "metal" && <meshStandardMaterial color="#263740" roughness={0.36} metalness={0.65} />}
    {surface === "glass" && <meshPhysicalMaterial color="#315c6c" roughness={0.13} metalness={0.55} clearcoat={1} />}
    {surface === "light" && <meshStandardMaterial color="#ffe4b7" emissive="#ffc885" emissiveIntensity={1.8} roughness={0.5} />}
    {surface === "seat" && <meshStandardMaterial color="#52818a" roughness={0.55} metalness={0.12} />}
  </mesh>)}</group>;
}

function Sign({ text, position, width = 12 }: { readonly text: string; readonly position: Triple; readonly width?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#17272e";
      ctx.fillRect(0, 0, 1024, 64);
      ctx.fillStyle = "#f4d2a4";
      ctx.font = "500 30px sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(text, 512, 33, 960);
    }
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.anisotropy = 4;
    return result;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position}>
    <planeGeometry args={[width, width / 16]} />
    <meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>;
}

function PitPavilion({ radius }: { readonly radius: number }) {
  const parts = useMemo(() => {
    const list: Part[] = [
      { surface: "concrete", size: [67, 0.5, 23], position: [0, 0, 1.5] },
      { surface: "concrete", size: [60, 0.5, 14], position: [0, 4.9, 0] },
      { surface: "concrete", size: [60, 4.7, 0.5], position: [0, 2.5, -6.8] },
      { surface: "metal", size: [65, 0.35, 17], position: [0, 9.1, 0] },
      { surface: "glass", size: [59, 3.5, 0.16], position: [0, 7, 5.7] },
      { surface: "glass", size: [0.16, 3.5, 12], position: [-29.6, 7, 0] },
      { surface: "glass", size: [0.16, 3.5, 12], position: [29.6, 7, 0] },
      { surface: "light", size: [63, 0.09, 0.14], position: [0, 8.85, 8.35] },
      { surface: "light", size: [59, 0.09, 0.13], position: [0, 5.22, 5.86] },
      { surface: "metal", size: [61, 0.15, 0.15], position: [0, 6.1, 7.3] },
    ];
    for (let bay = 0; bay < 6; bay++) {
      const x = -25 + bay * 10;
      list.push({ surface: "metal", size: [8.6, 4.1, 0.24], position: [x, 2.3, 5.65] });
      list.push({ surface: "light", size: [7.7, 0.1, 0.12], position: [x, 4.5, 5.85] });
      for (let slat = 0; slat < 9; slat++) {
        list.push({ surface: "concrete", size: [8.3, 0.045, 0.06], position: [x, 0.6 + slat * 0.4, 5.82] });
      }
      list.push({ surface: "concrete", size: [0.35, 8.5, 0.5], position: [x - 4.8, 4.5, 5.7] });
    }
    for (let x = -30; x <= 30; x += 3) {
      list.push({ surface: "metal", size: [0.1, 3.8, 0.2], position: [x, 7, 5.85] });
      list.push({ surface: "metal", size: [0.08, 1.1, 0.08], position: [x, 5.6, 7.3] });
      list.push({ surface: "metal", size: [0.14, 0.24, 16], position: [x, 9.35, 0] });
    }
    return list;
  }, []);
  return <group position={[-radius - 21, 0, -10]} rotation={[0, Math.PI / 2, 0]}>
    <Architecture parts={parts} />
    <Sign text="PADDOCK  /  RACE CONTROL" position={[0, 9.65, 8.51]} width={28} />
  </group>;
}

function Grandstand({ radius }: { readonly radius: number }) {
  const parts = useMemo(() => {
    const list: Part[] = [
      { surface: "concrete", size: [87, 0.5, 23], position: [0, 0, -5] },
      { surface: "metal", size: [87, 0.32, 21], position: [0, 12, -5.5] },
      { surface: "light", size: [85, 0.09, 0.13], position: [0, 11.82, 4.9] },
      { surface: "metal", size: [85, 0.1, 0.1], position: [0, 2, 3.9] },
    ];
    for (let row = 0; row < 8; row++) {
      const z = 2 - row * 1.9;
      const y = 0.65 + row * 0.82;
      list.push({ surface: "concrete", size: [83, 0.6, 1.9], position: [0, y, z] });
      for (let seat = 0; seat < 40; seat++) {
        const x = -39.5 + seat * 2;
        if (seat % 10 === 0) continue;
        list.push({ surface: "seat", size: [1.35, 0.17, 0.95], position: [x, y + 0.62, z] });
        list.push({ surface: "seat", size: [1.35, 0.95, 0.14], position: [x, y + 1.07, z - 0.44] });
      }
    }
    for (let x = -42; x <= 42; x += 7) {
      list.push({ surface: "metal", size: [0.25, 11.8, 0.35], position: [x, 6, -13] });
      list.push({ surface: "metal", size: [0.19, 0.45, 21], position: [x, 11.6, -5] });
      list.push({ surface: "metal", size: [0.09, 1.8, 0.09], position: [x, 1.1, 3.9] });
    }
    for (let z = -15; z < 5; z += 1.3) {
      list.push({ surface: "metal", size: [87, 0.09, 0.12], position: [0, 12.25, z] });
    }
    return list;
  }, []);
  return <group position={[0, 0, -radius - 14]}>
    <Architecture parts={parts} />
    <Sign text="THE NIGHT SHIFT  /  GRANDSTAND 01" position={[0, 12.55, 5.06]} width={38} />
  </group>;
}

function StartGantry() {
  const pose = useMemo(() => {
    const p = pointAt(0);
    const next = pointAt(0.001);
    return { p, yaw: Math.atan2(next.x - p.x, next.z - p.z) };
  }, []);
  const parts = useMemo<Part[]>(() => [
    { surface: "metal", size: [0.22, 6.2, 0.4], position: [-4.7, 3.1, 0] },
    { surface: "metal", size: [0.22, 6.2, 0.4], position: [4.7, 3.1, 0] },
    { surface: "metal", size: [9.6, 0.35, 0.5], position: [0, 6.2, 0] },
    { surface: "light", size: [9, 0.055, 0.07], position: [0, 5.98, 0.26] },
  ], []);
  return <group position={[pose.p.x, 0, pose.p.z]} rotation={[0, pose.yaw, 0]}>
    <Architecture parts={parts} />
    <Sign text="START / 01" position={[0, 6.55, 0.26]} width={4.5} />
  </group>;
}

export default function Trackside({ maxDistance }: { readonly maxDistance: number }) {
  const radius = spiralRadius(maxDistance);
  return <group>
    <StartGantry />
    <PitPavilion radius={radius} />
    <Grandstand radius={radius} />
  </group>;
}
