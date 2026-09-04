"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { pointAt, REBASE_THRESHOLD } from "@/lib/spiral";

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

function RatMarkers({ rats }: { readonly rats: ReadonlyArray<RatDatum> }) {
  return (
    <group>
      {rats.map((rat) => {
        const p = pointAt(rat.distance);
        const color = rat.stale ? "#555566" : rat.laps > 0 ? "#ffd84d" : "#7dd3fc";
        return (
          <mesh key={rat.handle} position={[p.x, 3.5, p.z]}>
            <sphereGeometry args={[1.6, 16, 16]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.55}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function OriginRebase({ world }: { readonly world: React.RefObject<THREE.Group | null> }) {
  const { camera, controls } = useThree((s) => ({
    camera: s.camera,
    controls: s.controls as unknown as { target: THREE.Vector3 } | null,
  }));
  useFrame(() => {
    const group = world.current;
    if (group === null || controls === null) {
      return;
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
    <mesh ref={ref} position={[0, 42, 0]}>
      <octahedronGeometry args={[7, 0]} />
      <meshStandardMaterial
        color="#ffd84d"
        emissive="#ffd84d"
        emissiveIntensity={0.9}
        roughness={0.4}
      />
    </mesh>
  );
}

export default function RaceScene() {
  const world = useRef<THREE.Group>(null);
  const [rats, setRats] = useState<ReadonlyArray<RatDatum>>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/rats")
      .then((res) => res.json() as Promise<{ rats: ReadonlyArray<RatDatum> }>)
      .then((body) => {
        if (alive) {
          setRats(body.rats);
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
  }, []);

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
          <TrackRibbon maxDistance={maxDistance} />
          <RatMarkers rats={rats} />
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
      <div className="pointer-events-none absolute left-4 top-4 max-h-[40vh] overflow-hidden text-xs text-white/70">
        <p className="mb-2 uppercase tracking-[0.3em] text-white/40">
          live rats {rats.length}
        </p>
        {rats.slice(0, 8).map((rat) => (
          <p key={rat.handle}>
            {rat.handle} · {rat.mergedPrs}prs · lap{rat.laps}
            {rat.stale ? " · stale" : ""}
          </p>
        ))}
      </div>
    </div>
  );
}
