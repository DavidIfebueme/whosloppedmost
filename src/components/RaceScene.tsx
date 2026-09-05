"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, Sky } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pointAt, REBASE_THRESHOLD } from "@/lib/spiral";
import RatSwarm, { liveSpots } from "@/components/RatSwarm";
import RatCard from "@/components/RatCard";
import Leaderboard from "@/components/Leaderboard";
import RegisterPanel, { loadCustomRats } from "@/components/RegisterPanel";
import StoryProps from "@/components/StoryProps";
import Trackside from "@/components/Trackside";
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
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        color="#33373c"
        roughness={0.95}
        metalness={0}
      />
    </mesh>
  );
}

function curbTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "#d8352c" : "#f2f0e9";
      ctx.fillRect(i * 16, 0, 16, 16);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(160, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Curbs({ maxDistance }: { readonly maxDistance: number }) {
  const tex = useMemo(() => curbTexture(), []);
  const geos = useMemo(() => {
    const samples = 500;
    const left: Array<THREE.Vector3> = [];
    const right: Array<THREE.Vector3> = [];
    for (let i = 0; i <= samples; i += 1) {
      const s = (i / samples) * maxDistance;
      const p = pointAt(s);
      const ahead = pointAt(Math.min(s + 2, maxDistance));
      const dx = ahead.x - p.x;
      const dz = ahead.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      const nx = (-dz / len) * 3.6;
      const nz = (dx / len) * 3.6;
      left.push(new THREE.Vector3(p.x + nx, 0.35, p.z + nz));
      right.push(new THREE.Vector3(p.x - nx, 0.35, p.z - nz));
    }
    return [
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(left), 500, 0.55, 6, false),
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(right), 500, 0.55, 6, false),
    ];
  }, [maxDistance]);

  useEffect(() => {
    return () => {
      tex.dispose();
      for (const g of geos) {
        g.dispose();
      }
    };
  }, [tex, geos]);

  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow castShadow>
          <meshStandardMaterial map={tex} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function EdgeLines({ maxDistance }: { readonly maxDistance: number }) {
  const geos = useMemo(() => {
    const samples = 400;
    const mk = (off: number) => {
      const pts: Array<THREE.Vector3> = [];
      for (let i = 0; i <= samples; i += 1) {
        const s = (i / samples) * maxDistance;
        const p = pointAt(s);
        const ahead = pointAt(Math.min(s + 2, maxDistance));
        const dx = ahead.x - p.x;
        const dz = ahead.z - p.z;
        const len = Math.hypot(dx, dz) || 1;
        pts.push(
          new THREE.Vector3(
            p.x + (-dz / len) * off,
            3.06,
            p.z + (dx / len) * off,
          ),
        );
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.14, 5, false);
    };
    return [mk(2.55), mk(-2.55)];
  }, [maxDistance]);

  useEffect(() => {
    return () => {
      for (const g of geos) {
        g.dispose();
      }
    };
  }, [geos]);

  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color="#f5f5f0" />
        </mesh>
      ))}
    </group>
  );
}

function GuideLight({ maxDistance }: { readonly maxDistance: number }) {
  const geometry = useMemo(() => {
    const samples = 400;
    const pts: Array<THREE.Vector3> = [];
    for (let i = 0; i <= samples; i += 1) {
      const s = (i / samples) * maxDistance;
      const p = pointAt(s);
      pts.push(new THREE.Vector3(p.x, p.y + 3.4, p.z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 400, 0.28, 6, false);
  }, [maxDistance]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
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
    const red = new THREE.Color("#d8352c");
    const white = new THREE.Color("#f2f0e9");
    placements.forEach((b, i) => {
      dummy.position.set(b.x, 1.5, b.z);
      dummy.rotation.set(0, b.yaw, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, i % 2 === 0 ? red : white);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor !== null) {
      m.instanceColor.needsUpdate = true;
    }
  }, [placements]);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, Math.max(placements.length, 1)]}
      frustumCulled={false}
    >
      <boxGeometry args={[0.6, 3, 8]} />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}

function OriginRebase({
  world,
}: {
  readonly world: React.RefObject<THREE.Group | null>;
}) {
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
  const viewTick = useRace((s) => s.viewTick);
  const viewName = useRace((s) => s.viewName);
  const seenReset = useRef(-1);
  const seenView = useRef(-1);
  const focus = useRef(new THREE.Vector3());

  function applyView(controls: {
    target: THREE.Vector3;
    update: () => void;
  }): void {
    if (viewName === "pits") {
      camera.position.set(95, 45, 95);
      controls.target.set(0, 2, 0);
    } else if (viewName === "rat") {
      let best = 0;
      for (const r of rats) {
        if (r.distance > best) {
          best = r.distance;
        }
      }
      const p = pointAt(Math.max(best, 1));
      camera.position.set(p.x + 30, 22, p.z + 30);
      controls.target.set(p.x, 3, p.z);
    } else {
      camera.position.set(120, 90, 120);
      controls.target.set(0, 0, 0);
    }
    controls.update();
  }

  useFrame(() => {
    const group = world.current;
    if (group === null || controls === null) {
      return;
    }
    if (seenReset.current !== resetCounter || seenView.current !== viewTick) {
      seenReset.current = resetCounter;
      seenView.current = viewTick;
      applyView(controls);
      return;
    }
    if (selected !== null) {
      const idx = rats.findIndex((r) => r.handle === selected);
      const spot = idx >= 0 ? liveSpots[idx] : undefined;
      if (spot !== undefined) {
        focus.current.set(spot.x, spot.y, spot.z);
        controls.target.lerp(focus.current, 0.08);
      } else if (idx >= 0) {
        const rat = rats[idx];
        if (rat !== undefined) {
          const p = pointAt(rat.distance);
          focus.current.set(p.x, 4, p.z);
          controls.target.lerp(focus.current, 0.08);
        }
      }
    } else if (viewName === "rat") {
      let bestIdx = 0;
      let best = -1;
      rats.forEach((r, i) => {
        if (r.distance > best) {
          best = r.distance;
          bestIdx = i;
        }
      });
      const spot = liveSpots[bestIdx];
      if (spot !== undefined && rats.length > 0) {
        focus.current.set(spot.x + spot.tx * 6, spot.y, spot.z + spot.tz * 6);
        controls.target.lerp(focus.current, 0.25);
        const want = new THREE.Vector3(
          spot.x - spot.tx * 18,
          spot.y + 10,
          spot.z - spot.tz * 18,
        );
        camera.position.lerp(want, 0.15);
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

function SunRig() {
  const light = useRef<THREE.DirectionalLight>(null);
  const { controls } = useThree((s) => ({
    controls: s.controls as unknown as { target: THREE.Vector3 } | null,
  }));
  useFrame(() => {
    const l = light.current;
    if (l === null || controls === null) {
      return;
    }
    const t = controls.target;
    l.position.set(t.x + 120, 180, t.z + 60);
    l.target.position.copy(t);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={light}
      castShadow
      color="#fff2dd"
      intensity={2.4}
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-170}
      shadow-camera-right={170}
      shadow-camera-top={170}
      shadow-camera-bottom={-170}
      shadow-camera-near={10}
      shadow-camera-far={600}
      shadow-bias={-0.0004}
    />
  );
}

function Cheese() {
  const ref = useRef<THREE.Group>(null);
  const trophy = useMemo(() => {
    const parts: Array<THREE.BufferGeometry> = [];
    const cup = new THREE.CylinderGeometry(4.2, 2.2, 5, 12);
    cup.translate(0, 6.5, 0);
    parts.push(cup);
    const stem = new THREE.CylinderGeometry(0.9, 1.4, 3.4, 8);
    stem.translate(0, 2.2, 0);
    parts.push(stem);
    const base = new THREE.CylinderGeometry(2.6, 3.0, 1.2, 12);
    base.translate(0, 0, 0);
    parts.push(base);
    for (const side of [-1, 1]) {
      const handle = new THREE.TorusGeometry(2.2, 0.45, 6, 12, Math.PI);
      handle.rotateZ(side > 0 ? -Math.PI / 2 : Math.PI / 2);
      handle.translate(side * 4.4, 6.2, 0);
      parts.push(handle);
    }
    return mergeGeometries(parts) ?? new THREE.BoxGeometry(1, 1, 1);
  }, []);

  useEffect(() => {
    return () => {
      trophy.dispose();
    };
  }, [trophy]);

  useFrame((_, delta) => {
    if (ref.current !== null) {
      ref.current.rotation.y += delta * 0.4;
    }
  });
  return (
    <group>
      <group ref={ref} position={[0, 38, 0]}>
        <mesh geometry={trophy}>
          <meshStandardMaterial
            color="#ffd84d"
            emissive="#8a6a00"
            emissiveIntensity={0.55}
            roughness={0.25}
            metalness={0.85}
          />
        </mesh>
      </group>
      <pointLight position={[0, 44, 0]} intensity={900} distance={600} color="#ffd84d" />
    </group>
  );
}

function Ground() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
      // mowed outfield stripes
      for (let ring = 0; ring < 8; ring += 1) {
        ctx.fillStyle = ring % 2 === 0 ? "#5d8a48" : "#548040";
        ctx.beginPath();
        ctx.arc(256, 256, 256 - ring * 32, 0, Math.PI * 2);
        ctx.fill();
      }
      // grass noise
      for (let i = 0; i < 2600; i += 1) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle =
          Math.random() > 0.5
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,40,0,0.09)";
        ctx.fillRect(x, y, 2, 2);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 0]}
      receiveShadow
    >
      <circleGeometry args={[6000, 48]} />
      <meshStandardMaterial map={texture} roughness={1} metalness={0} />
    </mesh>
  );
}

export default function RaceScene() {
  const world = useRef<THREE.Group>(null);
  const rats = useRace((s) => s.rats);
  const setRats = useRace((s) => s.setRats);
  const requestView = useRace((s) => s.requestView);
  const viewName = useRace((s) => s.viewName);
  const selected = useRace((s) => s.selected);
  const followActive = selected !== null || viewName === "rat";

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
        shadows
        camera={{ position: [120, 90, 120], fov: 55, near: 0.5, far: 20000 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.0;
        }}
      >
        <color attach="background" args={["#87b5e0"]} />
        <fog attach="fog" args={["#cfe0f0", 500, 6000]} />
        <Sky
          distance={45000}
          sunPosition={[120, 60, -80]}
          turbidity={6}
          rayleigh={1.8}
        />
        <hemisphereLight args={["#bcd8ff", "#5a7a4a", 0.7]} />
        <SunRig />
        <Environment resolution={256}>
          <group rotation={[-Math.PI / 3, 0, 0]}>
            <Lightformer
              form="circle"
              intensity={4}
              position={[0, 5, -9]}
              scale={2}
            />
            <Lightformer
              color="#8aa0ff"
              intensity={1.5}
              position={[-5, 1, -1]}
              scale={[20, 0.5, 1]}
            />
            <Lightformer
              color="#ffd84d"
              intensity={2}
              position={[5, -1, 0]}
              scale={[20, 1, 1]}
            />
          </group>
        </Environment>
        <group ref={world}>
          <Ground />
          <TrackRibbon maxDistance={maxDistance} />
          <Curbs maxDistance={maxDistance} />
          <EdgeLines maxDistance={maxDistance} />
          <GuideLight maxDistance={maxDistance} />
          <Barriers maxDistance={maxDistance} />
          <StoryProps maxDistance={maxDistance} />
          <Trackside maxDistance={maxDistance} />
          <RatSwarm loopLength={maxDistance} />
          <Cheese />
        </group>
        <OriginRebase world={world} />
        <OrbitControls
          makeDefault
          enabled={!followActive}
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
        {(
          [
            ["galaxy", "galaxy"],
            ["pits", "pits"],
            ["rat", "rat cam"],
          ] as const
        ).map(([name, label]) => (
          <button
            key={name}
            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest backdrop-blur-md transition-colors ${
              viewName === name
                ? "border-cheese bg-cheese/15 text-cheese"
                : "border-white/15 bg-black/60 text-white/70 hover:border-cheese hover:text-cheese"
            }`}
            onClick={() => requestView(name)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="absolute bottom-4 right-4">
        <RatCard />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 60%, rgba(10,20,40,0.28) 100%)",
        }}
      />
      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/35">
        drag to orbit · scroll to zoom · click a rat
      </p>
    </div>
  );
}
