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
      <mesh position={[0, 8.2, 0.8]}>
        <boxGeometry args={[6, 1.6, 0.4]} />
        <meshStandardMaterial color="#111114" roughness={0.6} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-2.1 + i * 1.4, 8.2, 1.05]}>
          <circleGeometry args={[0.45, 12]} />
          <meshBasicMaterial color="#ff2c22" toneMapped={false} />
        </mesh>
      ))}
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

function trackFrame(s: number, maxDistance: number): { x: number; z: number; nx: number; nz: number; yaw: number } {
  const p = pointAt(Math.min(Math.max(s, 0), maxDistance));
  const ahead = pointAt(Math.min(Math.max(s + 2, 0), maxDistance));
  const dx = ahead.x - p.x;
  const dz = ahead.z - p.z;
  const len = Math.hypot(dx, dz) || 1;
  return {
    x: p.x,
    z: p.z,
    nx: -dz / len,
    nz: dx / len,
    yaw: Math.atan2(dx, dz),
  };
}

function Grandstand({ maxDistance }: { readonly maxDistance: number }) {
  const data = useMemo(() => {
    const outerR = 20 + 2.5 * Math.sqrt((2 * maxDistance) / 2.5);
    const d = outerR + 52;
    const yaw = -Math.PI / 4;
    const stepGeos: Array<THREE.BufferGeometry> = [];
    const seats: Array<{ x: number; y: number; z: number }> = [];
    const rows = [
      { off: 0, y: 1.6 },
      { off: 7, y: 3.6 },
      { off: 14, y: 5.6 },
    ];
    const toWorld = (lx: number, lz: number): [number, number] => [
      d + lx * Math.cos(yaw) + lz * Math.sin(yaw),
      -d - lx * Math.sin(yaw) + lz * Math.cos(yaw),
    ];
    for (const row of rows) {
      const g = new THREE.BoxGeometry(24, 1.4, 130);
      const [wx, wz] = toWorld(row.off, 0);
      g.rotateY(yaw);
      g.translate(wx, row.y, wz);
      stepGeos.push(g);
    }
    const wall = new THREE.BoxGeometry(1, 2.4, 132);
    const [wallX, wallZ] = toWorld(-5, 0);
    wall.rotateY(yaw);
    wall.translate(wallX, 0.7, wallZ);
    stepGeos.push(wall);
    // roof slab on poles
    const roof = new THREE.BoxGeometry(26, 1, 134);
    roof.rotateY(yaw);
    const [roofX, roofZ] = toWorld(9, 0);
    roof.translate(roofX, 13.5, roofZ);
    stepGeos.push(roof);
    for (const pz of [-60, -20, 20, 60]) {
      const pole = new THREE.CylinderGeometry(0.4, 0.4, 8, 6);
      const [px, pzz] = toWorld(16, pz);
      pole.translate(px, 9.5, pzz);
      stepGeos.push(pole);
    }
    for (let z = -60; z <= 60; z += 3) {
      for (const row of rows) {
        const [wx, wz] = toWorld(row.off, z);
        seats.push({ x: wx, y: row.y + 1.7, z: wz });
      }
    }
    const steps = mergeGeometries(stepGeos) ?? new THREE.BoxGeometry(1, 1, 1);
    return { steps, seats };
  }, [maxDistance]);

  const crowdRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const m = crowdRef.current;
    if (m === null) {
      return;
    }
    const dummy = new THREE.Object3D();
    const base = [
      "#7a8494",
      "#a33b32",
      "#3c5a80",
      "#c9c2b4",
      "#4a5d43",
      "#8a6f55",
      "#5d5468",
    ].map((c) => new THREE.Color(c));
    const rand = mulberry32(99);
    data.seats.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(0, -Math.PI / 4, 0);
      dummy.scale.setScalar(0.85 + rand() * 0.3);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      const c = base[i % base.length];
      if (c !== undefined) {
        m.setColorAt(i, c.clone().multiplyScalar(0.85 + rand() * 0.3));
      }
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor !== null) {
      m.instanceColor.needsUpdate = true;
    }
    return () => {
      data.steps.dispose();
    };
  }, [data]);

  return (
    <group>
      <mesh geometry={data.steps} receiveShadow castShadow>
        <meshStandardMaterial color="#e3ded2" roughness={0.95} />
      </mesh>
      <instancedMesh
        ref={crowdRef}
        args={[undefined, undefined, Math.max(data.seats.length, 1)]}
        frustumCulled={false}
        castShadow
      >
        <capsuleGeometry args={[0.55, 1.0, 3, 6]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
    </group>
  );
}

function PitBuilding({ maxDistance }: { readonly maxDistance: number }) {
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
      ctx.fillStyle = "#f2f0e9";
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = "#111114";
      ctx.font = "bold 40px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PITS", 128, 34);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  const pose = useMemo(() => {
    const f = trackFrame(70, maxDistance);
    return { ...f, x: f.x - f.nx * 26, z: f.z - f.nz * 26 };
  }, [maxDistance]);

  useEffect(() => {
    return () => {
      tex.dispose();
    };
  }, [tex]);

  return (
    <group position={[pose.x, 0, pose.z]} rotation={[0, pose.yaw, 0]}>
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[44, 8, 10]} />
        <meshStandardMaterial color="#dfe3e6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 8.6, 0]} castShadow>
        <boxGeometry args={[46, 1.2, 12]} />
        <meshStandardMaterial color="#d8352c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4, 5.05]}>
        <planeGeometry args={[20, 4]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 4, 4.95]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[20, 4]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[-16 + i * 8, 1.5, 5.4]}>
          <boxGeometry args={[5, 3, 0.3]} />
          <meshStandardMaterial color="#20242a" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Horizon() {
  const treesRef = useRef<THREE.InstancedMesh>(null);

  const spots = useMemo(() => {
    const rand = mulberry32(5);
    const list: Array<{ x: number; z: number; s: number }> = [];
    for (let i = 0; i < 46; i += 1) {
      const a = (i / 46) * Math.PI * 2 + rand() * 0.1;
      const r = 1500 + rand() * 1100;
      list.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, s: 3 + rand() * 4 });
    }
    return list;
  }, []);

  const cloudTex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const blobs: Array<[number, number, number]> = [
        [70, 80, 34],
        [120, 70, 44],
        [175, 78, 36],
        [140, 90, 30],
      ];
      for (const [x, y, r] of blobs) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  const clouds = useMemo(() => {
    const rand = mulberry32(11);
    return [0, 1, 2, 3, 4, 5].map((i) => ({
      x: (rand() - 0.5) * 4000,
      y: 420 + rand() * 220,
      z: (rand() - 0.5) * 4000,
      s: 500 + rand() * 500,
      key: i,
    }));
  }, []);

  useEffect(() => {
    const m = treesRef.current;
    if (m === null) {
      return;
    }
    const dummy = new THREE.Object3D();
    spots.forEach((t, i) => {
      dummy.position.set(t.x, 0, t.z);
      dummy.scale.setScalar(t.s);
      dummy.rotation.set(0, (i * 1.3) % Math.PI, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [spots]);

  useEffect(() => {
    return () => {
      cloudTex.dispose();
    };
  }, [cloudTex]);

  return (
    <group>
      <instancedMesh
        ref={treesRef}
        args={[undefined, undefined, spots.length]}
        frustumCulled={false}
      >
        <coneGeometry args={[26, 90, 6]} />
        <meshStandardMaterial color="#3d6b3a" roughness={1} flatShading />
      </instancedMesh>
      {clouds.map((c) => (
        <sprite key={c.key} position={[c.x, c.y, c.z]} scale={[c.s, c.s / 2.4, 1]}>
          <spriteMaterial map={cloudTex} transparent opacity={0.9} depthWrite={false} />
        </sprite>
      ))}
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
      <Grandstand maxDistance={maxDistance} />
      <PitBuilding maxDistance={maxDistance} />
      <TireStacks maxDistance={maxDistance} />
      <Floodlights />
      <Trees />
      <Horizon />
    </group>
  );
}
