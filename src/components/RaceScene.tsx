"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { pointAt, REBASE_THRESHOLD } from "@/lib/spiral";
import RatSwarm from "@/components/RatSwarm";
import RatCard from "@/components/RatCard";
import Leaderboard from "@/components/Leaderboard";
import RegisterPanel, { loadCustomRats } from "@/components/RegisterPanel";
import StoryProps from "@/components/StoryProps";
import { useRace } from "@/store/race";

interface RatDatum {
  readonly handle: string;
  readonly mergedPrs: number;
  readonly distance: number;
  readonly laps: number;
  readonly stale: boolean;
}

function TrackRibbon({ maxDistance }: { readonly maxDistance: number }) {
  const geometry = useMemo(() => {
    const samples = 600;
    const pts: Array<THREE.Vector3> = [];
    for (let i = 0; i <= samples; i += 1) {
      const s = (i / samples) * maxDistance;
      const p = pointAt(s);
      pts.push(new THREE.Vector3(p.x, p.y, p.z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 600, 3, 8, false);
  }, [maxDistance]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#23232f" roughness={0.9} metalness={0.1} />
    </mesh>
  );
}

function Barriers({ maxDistance }: { readonly maxDistance: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const placements = useMemo(() => {
    const list: Array<{ x: number; z: number; yaw: number }> = [];
    for (let s = 0; s < maxDistance; s += 40) {
      const p = pointAt(s);
      const ahead = pointAt(Math.min(s + 2, maxDistance));
      const dx = ahead.x - p.x;
      const dz = ahead.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;
      const yaw = Math.atan2(dx, dz);
      list.push({ x: p.x + nx * 5.5, z: p.z + nz * 5.5, yaw });
      list.push({ x: p.x - nx * 5.5, z: p.z - nz * 5.5, yaw });
    }
    return list;
  }, [maxDistance]);

  useEffect(() => {
    const m = mesh.current;
    if (m === null) {
      return;
    }
    const dummy = new THREE.Object3D();
    placements.forEach((b, i) => {
      dummy.position.set(b.x, 1.5, b.z);
      dummy.rotation.set(0, b.yaw, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [placements]);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, Math.max(placements.length, 1)]}
      frustumCulled={false}
    >
      <boxGeometry args={[0.6, 3, 8]} />
      <meshStandardMaterial color="#3a3a4d" roughness={0.85} />
    </instancedMesh>
  );
}

function OriginRebase({ world }: { readonly world: React.RefObject<THREE.Group | null> }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) =>
    s.controls as unknown as {
      target: THREE.Vector3;
      update: () => void;
    } | null,
  );
  const rats = useRace((s) => s.rats);
  const selected = useRace((s) => s.selected);
  const resetCounter = useRace((s) => s.resetCounter);
  const seenReset = useRef(resetCounter);
  const focus = useRef(new THREE.Vector3());

  useFrame(() => {
    const group = world.current;
    if (group === null || controls === null) {
      return;
    }
    if (seenReset.current !== resetCounter) {
      seenReset.current = resetCounter;
      camera.position.set(120, 90, 120);
      controls.target.set(0, 0, 0);
      controls.update();
      return;
    }
    if (selected !== null) {
      const rat = rats.find((r) => r.handle === selected);
      if (rat !== undefined) {
        const p = pointAt(rat.distance);
        focus.current.set(p.x, 4, p.z);
        controls.target.lerp(focus.current, 0.08);
      }
    }
    const t = controls.target;
    if (Math.abs(t.x) > REBASE_THRESHOLD || Math.abs(t.z) > REBASE_THRESHOLD) {
      const sx = Math.round(t.x / REBASE_THRESHOLD) * REBASE_THRESHOLD;
      const sz = Math.round(t.z / REBASE_THRESHOLD) * REBASE_THRESHOLD;
      group.position.x -= sx;
      group.position.z -= sz;
      camera.position.x -= sx;
      camera.position.z -= sz;
      t.x -= sx;
      t.z -= sz;
    }
  });
  return null;
}

function Cheese() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current !== null) {
      ref.current.rotation.y += delta * 0.4;
    }
  });
  return (
    <group>
      <mesh ref={ref} position={[0, 42, 0]}>
        <octahedronGeometry args={[7, 0]} />
        <meshStandardMaterial
          color="#ffd84d"
          emissive="#ffd84d"
          emissiveIntensity={0.9}
          roughness={0.4}
        />
      </mesh>
      <pointLight position={[0, 42, 0]} intensity={900} distance={600} color="#ffd84d" />
    </group>
  );
}

export default function RaceScene() {
  const world = useRef<THREE.Group>(null);
  const rats = useRace((s) => s.rats);
  const setRats = useRace((s) => s.setRats);
  const resetView = useRace((s) => s.resetView);

  useEffect(() => {
    let alive = true;
    fetch("/api/rats")
      .then((res) => res.json() as Promise<{ rats: ReadonlyArray<RatDatum> }>)
      .then((body) => {
        if (alive) {
          const customs = loadCustomRats().filter(
            (c) => !body.rats.some((r) => r.handle === c.handle),
          );
          setRats([...body.rats, ...customs]);
        }
      })
      .catch(() => {
        if (alive) {
          setRats([]);
        }
      });
    return () => {
      alive = false;
    };
  }, [setRats]);

  const maxDistance = useMemo(() => {
    let max = 0;
    for (const rat of rats) {
      if (rat.distance > max) {
        max = rat.distance;
      }
    }
    return Math.max(max * 1.15, 1200);
  }, [rats]);

  return (
    <div className="relative h-screen w-screen bg-void">
      <Canvas
        camera={{ position: [120, 90, 120], fov: 55, near: 0.5, far: 20000 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
      >
        <color attach="background" args={["#07070d"]} />
        <fog attach="fog" args={["#07070d", 250, 2600]} />
        <hemisphereLight args={["#8aa0ff", "#0b0b12", 0.55]} />
        <directionalLight position={[80, 140, 40]} intensity={1.4} />
        <group ref={world}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
            <circleGeometry args={[3000, 48]} />
            <meshStandardMaterial color="#0b0b14" roughness={1} />
          </mesh>
          <TrackRibbon maxDistance={maxDistance} />
          <Barriers maxDistance={maxDistance} />
          <StoryProps maxDistance={maxDistance} />
          <RatSwarm loopLength={maxDistance} />
          <Cheese />
        </group>
        <OriginRebase world={world} />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={8}
          maxDistance={4000}
          zoomSpeed={1.1}
        />
      </Canvas>
      <div className="absolute left-4 top-4 max-h-[calc(100vh-2rem)] w-64 overflow-y-auto rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-cheese">
          join the race
        </p>
        <RegisterPanel />
        <div className="my-3 border-t border-white/10" />
        <Leaderboard />
      </div>
      <div className="absolute right-4 top-4 flex gap-2">
        <a
          className="rounded-full border border-white/15 bg-black/60 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/70 backdrop-blur-md transition-colors hover:border-cheese hover:text-cheese"
          href="/"
        >
          ← home
        </a>
        <button
          className="rounded-full border border-white/15 bg-black/60 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/70 backdrop-blur-md transition-colors hover:border-cheese hover:text-cheese"
          onClick={resetView}
          type="button"
        >
          reset view
        </button>
      </div>
      <div className="absolute bottom-4 right-4">
        <RatCard />
      </div>
      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/35">
        drag to orbit · scroll to zoom · click a rat
      </p>
    </div>
  );
}
