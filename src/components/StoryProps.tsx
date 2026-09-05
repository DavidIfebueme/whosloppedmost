"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pointAt } from "@/lib/spiral";
import { useRace } from "@/store/race";

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

interface TowerRow {
  readonly handle: string;
  readonly mergedPrs: number;
}

function drawTower(canvas: HTMLCanvasElement, rows: ReadonlyArray<TowerRow>): void {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return;
  }
  ctx.fillStyle = "#0a0e1a";
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = "#d8352c";
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("WHO SLOPPED MOST", 20, 42);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffd84d";
  ctx.fillText("LIVE", 492, 42);
  const sorted = [...rows].sort((a, b) => b.mergedPrs - a.mergedPrs);
  const leader = sorted[0]?.mergedPrs ?? 0;
  sorted.slice(0, 12).forEach((r, i) => {
    const y = 100 + i * 33;
    const leaderRow = i === 0;
    ctx.fillStyle = leaderRow ? "rgba(255,216,77,0.16)" : "transparent";
    ctx.fillRect(0, y - 24, 512, 31);
    ctx.textAlign = "left";
    ctx.fillStyle = leaderRow ? "#ffd84d" : "#8a93a8";
    ctx.font = "bold 22px monospace";
    ctx.fillText(`P${i + 1}`, 20, y);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(r.handle.slice(0, 14), 80, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#c7cede";
    ctx.font = "22px monospace";
    const gap = leader - r.mergedPrs;
    ctx.fillText(gap === 0 ? "LEADER" : `+${gap.toLocaleString()}`, 492, y);
  });
  ctx.textAlign = "center";
  ctx.fillStyle = "#5a6378";
  ctx.font = "20px sans-serif";
  ctx.fillText("DISTANCE FROM START: 0m", 256, 496);
}

function Jumbotron() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    drawTower(canvas, []);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
  const last = useRef(0);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (t - last.current < 1) {
      return;
    }
    last.current = t;
    const canvas = texture.image as HTMLCanvasElement;
    drawTower(canvas, useRace.getState().rats);
    texture.needsUpdate = true;
  });

  return (
    <group position={[34, 0, 0]}>
      <mesh position={[0, 20, 0]} castShadow>
        <boxGeometry args={[2, 40, 2]} />
        <meshStandardMaterial color="#3a3f45" roughness={0.9} />
      </mesh>
      <mesh position={[0, 52, 0]} castShadow>
        <boxGeometry args={[30, 30, 1.5]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Crowd() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const palette = useMemo(
    () =>
      ["#d8352c", "#ffd84d", "#2c7dd3", "#f2f0e9", "#37b36b", "#ff7ab8", "#ff8c2c"].map(
        (c) => new THREE.Color(c),
      ),
    [],
  );
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
      const col = palette[i % palette.length];
      if (col !== undefined) {
        m.setColorAt(i, col);
      }
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor !== null) {
      m.instanceColor.needsUpdate = true;
    }
  }, [placements, palette]);

  return (
    <group>
      {[64, 86, 108].map((r, i) => {
        const topY = [5, 11, 17][i] ?? 5;
        return (
          <group key={r}>
            <mesh position={[0, topY / 2 - 0.5, 0]}>
              <cylinderGeometry args={[r + 12, r + 12, topY, 48, 1, true]} />
              <meshStandardMaterial
                color="#e8e4d8"
                roughness={0.95}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, topY, 0]}
              receiveShadow
            >
              <ringGeometry args={[r - 12, r + 12, 48]} />
              <meshStandardMaterial
                color={["#679c4e", "#5d8a48", "#679c4e"][i] ?? "#5d8a48"}
                roughness={1}
              />
            </mesh>
          </group>
        );
      })}
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, Math.max(placements.length, 1)]}
        frustumCulled={false}
        castShadow
      >
        <capsuleGeometry args={[1.1, 1.6, 3, 6]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

const GRAFFITI = [
  { line: "steve was here. lap 4001.", s: 300 },
  { line: "i peaked at 12 prs", s: 700 },
  { line: "the cheese is a lie", s: 1050 },
];

function makeGraffitiTexture(line: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = "rgba(200,200,220,0.5)";
    ctx.font = "italic 44px cursive, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(line, 256, 66, 480);
    // scrubbed streaks
    ctx.fillStyle = "rgba(7,7,13,0.55)";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(40 + i * 95, 20 + (i % 3) * 22, 70, 12);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Graffiti({ maxDistance }: { readonly maxDistance: number }) {
  const textures = useMemo(() => GRAFFITI.map((g) => makeGraffitiTexture(g.line)), []);

  useEffect(() => {
    return () => {
      for (const t of textures) {
        t.dispose();
      }
    };
  }, [textures]);

  return (
    <group>
      {GRAFFITI.map((g, i) => {
        const s = Math.min(g.s, maxDistance - 10);
        const p = pointAt(s);
        const ahead = pointAt(Math.min(s + 2, maxDistance));
        const yaw = Math.atan2(ahead.x - p.x, ahead.z - p.z);
        const tex = textures[i % textures.length];
        if (tex === undefined) {
          return null;
        }
        return (
          <mesh key={g.line} position={[p.x, 1.6, p.z]} rotation={[0, yaw, 0]}>
            <planeGeometry args={[10, 2.5]} />
            <meshBasicMaterial map={tex} transparent opacity={0.85} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
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
      <Graffiti maxDistance={maxDistance} />
      <Jumbotron />
      <Crowd />
    </group>
  );
}
