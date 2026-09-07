"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { spiralRadius } from "@/lib/spiral";
import { useRace, type RatDatum } from "@/store/race";

function drawStandings(canvas: HTMLCanvasElement, rats: readonly RatDatum[], status: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#101e29";
  ctx.fillRect(0, 0, 768, 512);
  ctx.fillStyle = "#f1c99c";
  ctx.font = "600 28px sans-serif";
  ctx.fillText("CIRCUIT 01 / STANDINGS", 36, 51);
  ctx.fillStyle = "#7195a3";
  ctx.fillRect(36, 75, 696, 2);
  ctx.font = "16px monospace";
  ctx.fillText("VERIFIED RUNNERS", 36, 108);
  ctx.textAlign = "right";
  ctx.fillText("MERGED PRS", 730, 108);
  const ranked = rats.filter((rat) => !rat.stale).sort((a, b) => b.mergedPrs - a.mergedPrs).slice(0, 6);
  if (ranked.length === 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#bbc8ce";
    ctx.font = "24px sans-serif";
    ctx.fillText(status === "loading" ? "Fetching the board..." : status === "error" ? "Board unavailable" : "Waiting for the first runner", 384, 265);
  } else {
    ranked.forEach((rat, i) => {
      const y = 158 + i * 49;
      if (i === 0) {
        ctx.fillStyle = "#283734";
        ctx.fillRect(25, y - 30, 718, 43);
      }
      ctx.textAlign = "left";
      ctx.font = "23px monospace";
      ctx.fillStyle = i === 0 ? "#f1c99c" : "#7195a3";
      ctx.fillText(String(i + 1).padStart(2, "0"), 38, y);
      ctx.fillStyle = "#e3e9e9";
      ctx.font = "24px sans-serif";
      ctx.fillText(rat.handle.slice(0, 23), 101, y);
      ctx.textAlign = "right";
      ctx.font = "23px monospace";
      ctx.fillText(rat.mergedPrs.toLocaleString(), 728, y);
    });
  }
  ctx.textAlign = "left";
  ctx.font = "16px monospace";
  ctx.fillStyle = "#7195a3";
  ctx.fillText("THE NIGHT SHIFT", 36, 482);
  ctx.textAlign = "right";
  ctx.fillText("GITHUB MERGES", 731, 482);
}

function Scoreboard({ radius }: { readonly radius: number }) {
  const rats = useRace((state) => state.rats);
  const status = useRace((state) => state.loadStatus);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 512;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  const frame = useMemo(() => {
    const parts = [
      new THREE.BoxGeometry(0.28, 8, 0.5).translate(-7, 4, 0),
      new THREE.BoxGeometry(0.28, 8, 0.5).translate(7, 4, 0),
      new THREE.BoxGeometry(19, 13, 0.5).translate(0, 10, 0),
    ];
    const geometry = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    return geometry ?? new THREE.BufferGeometry();
  }, []);
  useEffect(() => () => { texture.dispose(); frame.dispose(); }, [texture, frame]);
  useEffect(() => {
    drawStandings(texture.image as HTMLCanvasElement, rats, status);
    texture.needsUpdate = true;
  }, [rats, status, texture]);
  return <group position={[radius * 0.72 + 12, 0, -radius * 0.75 - 18]} rotation={[0, -0.3, 0]}>
    <mesh geometry={frame} castShadow><meshStandardMaterial color="#263740" metalness={0.6} roughness={0.4} /></mesh>
    <mesh position={[0, 10, 0.27]}>
      <planeGeometry args={[18, 12]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
    <mesh position={[0, 16.55, 0.1]}>
      <boxGeometry args={[19, 0.07, 0.2]} />
      <meshStandardMaterial color="#ffdfaf" emissive="#ffd09c" emissiveIntensity={1.5} />
    </mesh>
  </group>;
}

function PerimeterSigns({ radius }: { readonly radius: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#182932";
      ctx.fillRect(0, 0, 1024, 128);
      ctx.fillStyle = "#f1c99c";
      ctx.font = "500 40px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("THE NIGHT SHIFT   /   CIRCUIT 01", 512, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  const geometry = useMemo(() => {
    const blocks: THREE.BufferGeometry[] = [];
    const faces: THREE.BufferGeometry[] = [];
    for (const angle of [0.65, 1.9, 3.6]) {
      const yaw = -angle - Math.PI / 2;
      const x = Math.cos(angle) * (radius + 8);
      const z = Math.sin(angle) * (radius + 8);
      const block = new THREE.BoxGeometry(17, 2.1, 0.5);
      block.rotateY(yaw);
      block.translate(x, 1.05, z);
      blocks.push(block);
      const face = new THREE.PlaneGeometry(16, 2);
      face.translate(0, 0, 0.26);
      face.rotateY(yaw);
      face.translate(x, 1.08, z);
      faces.push(face);
    }
    const result = [mergeGeometries(blocks) ?? new THREE.BufferGeometry(), mergeGeometries(faces) ?? new THREE.BufferGeometry()] as const;
    [...blocks, ...faces].forEach((part) => part.dispose());
    return result;
  }, [radius]);
  useEffect(() => () => { texture.dispose(); }, [texture]);
  useEffect(() => () => geometry.forEach((part) => part.dispose()), [geometry]);
  return <group>
    <mesh geometry={geometry[0]} receiveShadow><meshStandardMaterial color="#485457" roughness={0.8} /></mesh>
    <mesh geometry={geometry[1]}><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
  </group>;
}

export default function StoryProps({ maxDistance }: { readonly maxDistance: number }) {
  const radius = spiralRadius(maxDistance);
  return <group>
    <Scoreboard radius={radius} />
    <PerimeterSigns radius={radius} />
  </group>;
}
