"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pointAt, REBASE_THRESHOLD } from "@/lib/spiral";
import RatSwarm, { liveSpots } from "@/components/RatSwarm";
import RaceHud from "@/components/RaceHud";
import { isRatDatum, loadCustomRats } from "@/components/RegisterPanel";
import StoryProps from "@/components/StoryProps";
import Trackside from "@/components/Trackside";
import { useRace } from "@/store/race";
import { circuitStrip } from "@/components/CircuitGeometry";
import DuskArena from "@/components/DuskArena";

interface RatDatum {
  readonly handle: string;
  readonly mergedPrs: number;
  readonly distance: number;
  readonly laps: number;
  readonly stale: boolean;
}

function TrackRibbon({ maxDistance }: { readonly maxDistance: number }) {
  const asphalt = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      const pixels = context.createImageData(128, 128);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const grain = 125 + ((Math.imul(i + 11, 16807) >>> 9) % 48);
        pixels.data[i] = grain;
        pixels.data[i + 1] = grain;
        pixels.data[i + 2] = grain;
        pixels.data[i + 3] = 255;
      }
      context.putImageData(pixels, 0, 0);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    return texture;
  }, []);
  const geometry = useMemo(() => {
    return circuitStrip(maxDistance, -3.8, 3.8, 0.08);
  }, [maxDistance]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);
  useEffect(() => () => asphalt.dispose(), [asphalt]);

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        color="#18262e"
        roughness={0.62}
        metalness={0.15}
        bumpMap={asphalt}
        bumpScale={0.035}
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
  tex.repeat.set(0.25, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Curbs({ maxDistance }: { readonly maxDistance: number }) {
  const tex = useMemo(() => curbTexture(), []);
  const geos = useMemo(() => {
    return [
      circuitStrip(maxDistance, -4.25, -3.8, 0.1),
      circuitStrip(maxDistance, 3.8, 4.25, 0.1),
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
    const mk = (off: number) => {
      return circuitStrip(maxDistance, off - 0.065, off + 0.065, 0.11);
    };
    return [mk(3.4), mk(-3.4)];
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
    return circuitStrip(maxDistance, -4.38, -4.31, 0.12);
  }, [maxDistance]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#f4c078" toneMapped={false} />
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
  const invalidate = useThree((s) => s.invalidate);
  const paused = useRace((s) => s.paused);
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
  const desiredPosition = useRef(new THREE.Vector3());
  useEffect(() => invalidate(), [invalidate, selected, viewTick, resetCounter, paused, rats]);

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
        if (!r.stale && r.distance > best) {
          best = r.distance;
        }
      }
      const p = pointAt(Math.max(best, 1));
      camera.position.set(p.x + 30, 22, p.z + 30);
      controls.target.set(p.x, 3, p.z);
    } else {
      camera.position.set(142, 112, 154);
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
        controls.target.lerp(focus.current, paused ? 1 : 0.08);
      } else if (idx >= 0) {
        const rat = rats[idx];
        if (rat !== undefined) {
          const p = pointAt(rat.distance);
          focus.current.set(p.x, 4, p.z);
          controls.target.lerp(focus.current, paused ? 1 : 0.08);
        }
      }
    } else if (viewName === "rat") {
      let bestIdx = -1;
      let best = -1;
      rats.forEach((r, i) => {
        if (!r.stale && r.distance > best) {
          best = r.distance;
          bestIdx = i;
        }
      });
      const spot = liveSpots[bestIdx];
      if (spot !== undefined && rats.length > 0) {
        focus.current.set(spot.x + spot.tx * 6, spot.y, spot.z + spot.tz * 6);
        controls.target.lerp(focus.current, paused ? 1 : 0.25);
        const want = desiredPosition.current.set(
          spot.x - spot.tx * 18,
          spot.y + 10,
          spot.z - spot.tz * 18,
        );
        camera.position.lerp(want, paused ? 1 : 0.15);
      }
    }
    if (selected !== null || viewName === "rat") camera.lookAt(controls.target);
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
      color="#ffbf8a"
      intensity={2.8}
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
    if (ref.current !== null && !useRace.getState().paused) {
      ref.current.rotation.y += delta * 0.4;
    }
  });
  return (
    <group>
      <group ref={ref} position={[0, 21, 0]}>
        <mesh position={[0, -6, 0]}>
          <cylinderGeometry args={[7, 9, 2, 16]} />
          <meshStandardMaterial color="#e8e4d8" roughness={0.9} />
        </mesh>
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
      <pointLight position={[0, 26, 0]} intensity={450} distance={70} color="#ffd19b" />
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
        ctx.fillStyle = ring % 2 === 0 ? "#203835" : "#1c302e";
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
      // large tonal patches
      for (let i = 0; i < 26; i += 1) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = 30 + Math.random() * 70;
        const g = ctx.createRadialGradient(x, y, 4, x, y, r);
        const dark = Math.random() > 0.5;
        g.addColorStop(0, dark ? "rgba(30,70,30,0.16)" : "rgba(220,255,200,0.10)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
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
  const paused = useRace((s) => s.paused);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      useRace.getState().setPaused(true);
    }
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const world = useRef<THREE.Group>(null);
  const rats = useRace((s) => s.rats);
  const setRats = useRace((s) => s.setRats);
  const viewName = useRace((s) => s.viewName);
  const selected = useRace((s) => s.selected);
  const loadStatus = useRace((s) => s.loadStatus);
  const followActive = rats.some((r) => r.handle === selected) || (viewName === "rat" && rats.some((r) => !r.stale));
  useEffect(() => {
    if (loadStatus !== "loading" && selected !== null && !rats.some((r) => r.handle === selected)) {
      useRace.getState().setSelected(null);
    }
  }, [loadStatus, selected, rats]);

  useEffect(() => {
    let alive = true;
    useRace.getState().setLoadStatus("loading");
    fetch("/api/rats")
      .then(async (res) => {
        if (!res.ok) throw new Error("Board unavailable");
        const body = await res.json() as { rats: ReadonlyArray<RatDatum> };
        if (!Array.isArray(body.rats) || !body.rats.every(isRatDatum)) throw new Error("Invalid board");
        return body;
      })
      .then((body) => {
        if (alive) {
          const customs = loadCustomRats().filter(
            (c) => !body.rats.some((r) => r.handle === c.handle),
          );
          setRats([...body.rats, ...customs]);
          useRace.getState().setLoadStatus("ready");
        }
      })
      .catch(() => {
        if (alive) {
          setRats(loadCustomRats());
          useRace.getState().setLoadStatus("error");
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
        frameloop={visible ? paused ? "demand" : "always" : "never"}
        fallback={<div className="p-8 text-white">Your browser cannot display the 3D circuit. Try a browser with WebGL enabled.</div>}
        camera={{ position: [142, 112, 154], fov: 48, near: 0.5, far: 4000 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.15;
        }}
      >
        <color attach="background" args={["#101e2c"]} />
        <fog attach="fog" args={["#263c4b", 200, 850]} />
        <hemisphereLight args={["#a9cbe6", "#24342d", 1.4]} />
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
          <DuskArena maxDistance={maxDistance} />
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
          maxDistance={900}
          maxPolarAngle={Math.PI / 2.12}
          zoomSpeed={1.1}
        />
      </Canvas>
      <RaceHud />
    </div>
  );
}
