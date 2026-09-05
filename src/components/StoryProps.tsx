"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pointAt } from "@/lib/spiral";

const BANNER_LINES = [
  "VELOCITY IS VIRTUE",
  "MERGED PRS = MEANING",
  "SHIP OR VANISH",
  "REST IS RUST",
  "THE WHEEL LOVES YOU",
  "ZERO STILL COUNTS",
];

function makeBannerTexture(line: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.fillStyle = "#101019";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#ffd84d";
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.fillStyle = "#f2f0e9";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(line, 256, 66, 470);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Banners({ maxDistance }: { readonly maxDistance: number }) {
  const textures = useMemo(
    () => BANNER_LINES.map((line) => makeBannerTexture(line)),
    [],
  );

  useEffect(() => {
    return () => {
      for (const t of textures) {
        t.dispose();
      }
    };
  }, [textures]);

  const placements = useMemo(() => {
    const step = maxDistance / BANNER_LINES.length;
    return BANNER_LINES.map((_, i) => {
      const s = step * (i + 0.5);
      const p = pointAt(s);
      const ahead = pointAt(Math.min(s + 2, maxDistance));
      const yaw = Math.atan2(ahead.x - p.x, ahead.z - p.z);
      return { x: p.x, z: p.z, yaw, tex: i % textures.length };
    });
  }, [maxDistance, textures.length]);

  return (
    <group>
      {placements.map((b, i) => {
        const tex = textures[b.tex % textures.length];
        if (tex === undefined) {
          return null;
        }
        return (
          <group key={i} position={[b.x, 9, b.z]} rotation={[0, b.yaw, 0]}>
            <mesh position={[8, 0, 0]}>
              <boxGeometry args={[0.5, 12, 0.5]} />
              <meshStandardMaterial color="#2c2c3a" roughness={0.9} />
            </mesh>
            <mesh position={[0, 2, 0]}>
              <planeGeometry args={[16, 4]} />
              <meshBasicMaterial map={tex} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function drawJumbotron(
  canvas: HTMLCanvasElement,
  total: number,
): void {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return;
  }
  ctx.fillStyle = "#05050a";
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "#ffd84d";
  ctx.font = "bold 30px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TOTAL DISTANCE RUN", 256, 60);
  ctx.fillStyle = "#f2f0e9";
  ctx.font = "bold 64px monospace";
  ctx.fillText(`${total * 137}m`, 256, 140);
  ctx.fillStyle = "#555566";
  ctx.font = "24px sans-serif";
  ctx.fillText("DISTANCE FROM START: 0m", 256, 200);
}

function Jumbotron() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    drawJumbotron(canvas, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
  const total = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    total.current += 1;
    if (t - last.current < 1) {
      return;
    }
    last.current = t;
    const canvas = texture.image as HTMLCanvasElement;
    drawJumbotron(canvas, total.current);
    texture.needsUpdate = true;
  });

  return (
    <group position={[34, 0, 0]}>
      <mesh position={[0, 14, 0]}>
        <boxGeometry args={[1.5, 28, 1.5]} />
        <meshStandardMaterial color="#2c2c3a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 32, 0]}>
        <boxGeometry args={[22, 12, 1]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Crowd() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const placements = useMemo(() => {
    const list: Array<{ x: number; y: number; z: number; yaw: number }> = [];
    const rings = [
      { r: 64, y: 6, n: 60 },
      { r: 86, y: 12, n: 80 },
      { r: 108, y: 18, n: 100 },
    ];
    for (const ring of rings) {
      for (let i = 0; i < ring.n; i += 1) {
        const a = (i / ring.n) * Math.PI * 2;
        // faces point outward, away from the track
        list.push({
          x: Math.cos(a) * ring.r,
          y: ring.y,
          z: Math.sin(a) * ring.r,
          yaw: -a + Math.PI / 2,
        });
      }
    }
    return list;
  }, []);

  useEffect(() => {
    const m = mesh.current;
    if (m === null) {
      return;
    }
    const dummy = new THREE.Object3D();
    placements.forEach((c, i) => {
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(0, c.yaw, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [placements]);

  return (
    <group>
      {[64, 86, 108].map((r, i) => (
        <mesh
          key={r}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, [5, 11, 17][i] ?? 5, 0]}
        >
          <ringGeometry args={[r - 12, r + 12, 48]} />
          <meshStandardMaterial color="#15151f" roughness={1} />
        </mesh>
      ))}
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, Math.max(placements.length, 1)]}
        frustumCulled={false}
      >
        <capsuleGeometry args={[1.1, 1.6, 3, 6]} />
        <meshStandardMaterial
          color="#4d4d63"
          emissive="#14141f"
          emissiveIntensity={1}
          roughness={0.95}
        />
      </instancedMesh>
    </group>
  );
}

export default function StoryProps({
  maxDistance,
}: {
  readonly maxDistance: number;
}) {
  return (
    <group>
      <Banners maxDistance={maxDistance} />
      <Jumbotron />
      <Crowd />
    </group>
  );
}
