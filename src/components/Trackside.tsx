"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pointAt } from "@/lib/spiral";

function checkerTexture(cols: number, rows: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = cols * 16;
  canvas.height = rows * 16;
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    for (let x = 0; x < cols; x += 1) {
      for (let y = 0; y < rows; y += 1) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#111111" : "#f5f5f0";
        ctx.fillRect(x * 16, y * 16, 16, 16);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function StartGantry() {
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
      ctx.fillStyle = "#111114";
      ctx.fillRect(0, 0, 1024, 128);
      for (let x = 0; x < 64; x += 1) {
        ctx.fillStyle = x % 2 === 0 ? "#f5f5f0" : "#111114";
        ctx.fillRect(x * 16, 0, 16, 16);
        ctx.fillStyle = x % 2 === 0 ? "#111114" : "#f5f5f0";
        ctx.fillRect(x * 16, 112, 16, 16);
      }
      ctx.fillStyle = "#ffd84d";
      ctx.font = "bold 56px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("WHO SLOPPED MOST", 512, 66, 900);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);

  const placé = useMemo(() => {
    const p = pointAt(0);
    const ahead = pointAt(2);
    return { p, yaw: Math.atan2(ahead.x - p.x, ahead.z - p.z) };
  }, []);

  useEffect(() => {
    return () => {
      tex.dispose();
    };
  }, [tex]);

  return (
    <group position={[placé.p.x, 0, placé.p.z]} rotation={[0, placé.yaw, 0]}>
      {[-7.5, 7.5].map((x) => (
        <mesh key={x} position={[x, 7, 0]} castShadow>
          <boxGeometry args={[1.2, 14, 1.2]} />
          <meshStandardMaterial color="#3a3f45" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 14.5, 0]} castShadow>
        <boxGeometry args={[17, 1.2, 1.2]} />
        <meshStandardMaterial color="#3a3f45" roughness={0.8} />
      </mesh>
      <mesh position={[0, 11.5, 0]}>
        <planeGeometry args={[15, 4.5]} />
        <meshBasicMaterial map={tex} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 3.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.6, 2.2]} />
        <meshBasicMaterial map={checkerTexture(7, 3)} toneMapped={false} />
      </mesh>
    </group>
  );
}

function TireStacks({ maxDistance }: { readonly maxDistance: number }) {
  const geos = useMemo(() => {
    const one = mergeGeometries(
      [0.5, 1.35, 2.2].map((y) => {
        const t = new THREE.TorusGeometry(1.05, 0.42, 6, 14);
        t.rotateX(Math.PI / 2);
        t.translate(0, y, 0);
        return t;
      }),
    );
    return one ?? new THREE.BoxGeometry(1, 1, 1);
  }, []);

  const placements = useMemo(() => {
    const list: Array<{ x: number; z: number; c: string }> = [];
    const cols = ["#d8352c", "#f2f0e9", "#2c7dd3"];
    let k = 0;
    for (let s = 60; s < maxDistance; s += 120) {
      const p = pointAt(s);
      const ahead = pointAt(Math.min(s + 2, maxDistance));
      const dx = ahead.x - p.x;
      const dz = ahead.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      const side = k % 2 === 0 ? 1 : -1;
      const col = cols[k % cols.length] ?? "#d8352c";
      list.push({
        x: p.x + (-dz / len) * 7.5 * side,
        z: p.z + (dx / len) * 7.5 * side,
        c: col,
      });
      k += 1;
    }
    return list;
  }, [maxDistance]);

  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const m = meshRef.current;
    if (m === null) {
      return;
    }
    const dummy = new THREE.Object3D();
    placements.forEach((t, i) => {
      dummy.position.set(t.x, 0, t.z);
      dummy.rotation.set(0, (i * 0.7) % Math.PI, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, new THREE.Color(t.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor !== null) {
      m.instanceColor.needsUpdate = true;
    }
  }, [placements]);

  useEffect(() => {
    return () => {
      geos.dispose();
    };
  }, [geos]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geos, undefined, Math.max(placements.length, 1)]}
      frustumCulled={false}
      castShadow
    >
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}

function Floodlights() {
  const merged = useMemo(() => {
    const parts: Array<THREE.BufferGeometry> = [];
    const rand = mulberry32(7);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const r = 280 + rand() * 120;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const pole = new THREE.CylinderGeometry(0.5, 0.7, 42, 6);
      pole.translate(x, 21, z);
      parts.push(pole);
      const head = new THREE.BoxGeometry(10, 4, 1);
      head.rotateY(-a + Math.PI / 2);
      head.translate(x, 43, z);
      parts.push(head);
    }
    return mergeGeometries(parts) ?? new THREE.BoxGeometry(1, 1, 1);
  }, []);

  useEffect(() => {
    return () => {
      merged.dispose();
    };
  }, [merged]);

  return (
    <mesh geometry={merged} castShadow>
      <meshStandardMaterial color="#9aa0a8" roughness={0.7} metalness={0.4} />
    </mesh>
  );
}

function Trees() {
  const data = useMemo(() => {
    const rand = mulberry32(42);
    const spots: Array<{ x: number; z: number; s: number }> = [];
    for (let i = 0; i < 90; i += 1) {
      const a = rand() * Math.PI * 2;
      const r = 260 + rand() * 900;
      spots.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        s: 0.8 + rand() * 0.9,
      });
    }
    const trunk = new THREE.CylinderGeometry(0.5, 0.8, 5, 5);
    trunk.translate(0, 2.5, 0);
    const canopy = new THREE.IcosahedronGeometry(3.4, 0);
    canopy.translate(0, 7, 0);
    return { spots, trunk, canopy };
  }, []);

  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    const greens = ["#3f7038", "#4c8143", "#356130"].map(
      (c) => new THREE.Color(c),
    );
    data.spots.forEach((t, i) => {
      dummy.position.set(t.x, 0, t.z);
      dummy.scale.setScalar(t.s);
      dummy.rotation.set(0, (i * 2.3) % Math.PI, 0);
      dummy.updateMatrix();
      trunkRef.current?.setMatrixAt(i, dummy.matrix);
      canopyRef.current?.setMatrixAt(i, dummy.matrix);
      const g = greens[i % greens.length];
      if (g !== undefined) {
        canopyRef.current?.setColorAt(i, g);
      }
    });
    if (trunkRef.current !== null) {
      trunkRef.current.instanceMatrix.needsUpdate = true;
    }
    if (canopyRef.current !== null) {
      canopyRef.current.instanceMatrix.needsUpdate = true;
      if (canopyRef.current.instanceColor !== null) {
        canopyRef.current.instanceColor.needsUpdate = true;
      }
    }
    return () => {
      data.trunk.dispose();
      data.canopy.dispose();
    };
  }, [data]);

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[data.trunk, undefined, data.spots.length]}
        frustumCulled={false}
        castShadow
      >
        <meshStandardMaterial color="#6b4a33" roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={canopyRef}
        args={[data.canopy, undefined, data.spots.length]}
        frustumCulled={false}
        castShadow
      >
        <meshStandardMaterial roughness={1} flatShading />
      </instancedMesh>
    </group>
  );
}

export default function Trackside({
  maxDistance,
}: {
  readonly maxDistance: number;
}) {
  return (
    <group>
      <StartGantry />
      <TireStacks maxDistance={maxDistance} />
      <Floodlights />
      <Trees />
    </group>
  );
}
