"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pointAt } from "@/lib/spiral";
import { useRace } from "@/store/race";

const LOD_DISTANCE = 900;
const SKINNED_LIMIT = 40;

export interface LiveSpot {
  x: number;
  y: number;
  z: number;
  tx: number;
  tz: number;
}

// mutable per-frame positions, written by the swarm, read by the camera
// rig. plain data, never react state, so no re-renders.
export const liveSpots: Array<LiveSpot> = [];

function buildFallbackGeometry(): THREE.BufferGeometry {
  const body = new THREE.CapsuleGeometry(0.9, 2.2, 4, 8);
  body.rotateX(Math.PI / 2);
  body.translate(0, 1.2, 0);
  const head = new THREE.ConeGeometry(0.7, 1.4, 6);
  head.rotateX(Math.PI / 2);
  head.translate(0, 1.5, 2.2);
  const earL = new THREE.ConeGeometry(0.25, 0.6, 4);
  earL.translate(-0.4, 2.4, 1.8);
  const earR = new THREE.ConeGeometry(0.25, 0.6, 4);
  earR.translate(0.4, 2.4, 1.8);
  const tail = new THREE.CylinderGeometry(0.08, 0.16, 2.8, 5);
  tail.rotateX(-1.15);
  tail.translate(0, 1.7, -2.5);
  return (
    mergeGeometries([body, head, earL, earR, tail]) ??
    new THREE.BoxGeometry(1, 1, 1)
  );
}

function makeTagTexture(handle: string, gold: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.fillStyle = "rgba(5,8,5,0.62)";
    ctx.beginPath();
    ctx.roundRect(0, 0, 256, 64, 18);
    ctx.fill();
    ctx.fillStyle = gold ? "#ffd84d" : "#ffffff";
    ctx.font = "bold 30px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(handle.slice(0, 14), 128, 34, 230);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ratColor(laps: number, stale: boolean): THREE.Color {
  if (stale) {
    return new THREE.Color("#555566");
  }
  if (laps > 0) {
    return new THREE.Color("#ffd84d");
  }
  return new THREE.Color("#7dd3fc");
}

interface Runner {
  readonly group: THREE.Group;
  readonly mixer: THREE.AnimationMixer | null;
  readonly tag: THREE.Sprite;
  readonly tagTexture: THREE.CanvasTexture;
}

function SkinnedRats({ loopLength }: { readonly loopLength: number }) {
  const rats = useRace((s) => s.rats);
  const gltf = useGLTF("/models/rat.glb");
  const holder = useRef<THREE.Group>(null);

  const runners: ReadonlyArray<Runner> = useMemo(() => {
    const runClip = gltf.animations.find((c) => c.name.endsWith("Rat_Run"));
    return rats.map((rat, i) => {
      const group = cloneSkinned(gltf.scene) as THREE.Group;
      group.scale.setScalar(1.35);
      group.traverse((o) => {
        o.frustumCulled = false;
        if (o instanceof THREE.Mesh) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const mat of mats) {
            if (mat instanceof THREE.MeshStandardMaterial) {
              if (mat.name === "Grey") {
                mat.color.set("#8a6f55");
              }
              mat.envMapIntensity = 0.9;
            }
          }
        }
      });
      let mixer: THREE.AnimationMixer | null = null;
      if (runClip !== undefined) {
        mixer = new THREE.AnimationMixer(group);
        const action = mixer.clipAction(runClip);
        action.timeScale = 0.7 + Math.log10(1 + rat.mergedPrs) * 0.25 + (i % 5) * 0.05;
        action.play();
      }
      group.traverse((o) => {
        o.frustumCulled = false;
      });
      const tagTexture = makeTagTexture(rat.handle, rat.laps > 0);
      const tag = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: tagTexture,
          transparent: true,
          depthWrite: false,
        }),
      );
      tag.scale.set(11, 2.75, 1);
      group.add(tag);
      return { group, mixer, tag, tagTexture };
    });
  }, [gltf, rats]);

  useEffect(() => {
    const h = holder.current;
    if (h === null) {
      return;
    }
    for (const r of runners) {
      h.add(r.group);
    }
    return () => {
      for (const r of runners) {
        h.remove(r.group);
        r.mixer?.stopAllAction();
        r.tagTexture.dispose();
        (r.tag.material as THREE.SpriteMaterial).dispose();
      }
    };
  }, [runners]);

  useFrame(({ camera }, delta) => {
    const h = holder.current;
    if (h !== null) {
      h.visible = camera.position.length() <= LOD_DISTANCE;
    }
    const t = performance.now() / 1000;
    rats.forEach((rat, i) => {
      const runner = runners[i];
      if (runner === undefined) {
        return;
      }
      runner.mixer?.update(Math.min(delta, 0.05));
      const speed = 4 + Math.log10(1 + rat.mergedPrs) * 6;
      const s = (rat.distance + t * speed) % loopLength;
      const p = pointAt(s);
      const ahead = pointAt((s + 2) % loopLength);
      const yaw = Math.atan2(ahead.x - p.x, ahead.z - p.z);
      const bob = Math.sin(t * 9 + i * 1.7) * 0.2;
      runner.group.position.set(p.x, 3.0 + bob, p.z);
      runner.group.rotation.set(0, yaw, 0);
      runner.tag.position.set(0, 7.5, 0);
      const alen = Math.hypot(ahead.x - p.x, ahead.z - p.z) || 1;
      liveSpots[i] = {
        x: p.x,
        y: 3.0 + bob,
        z: p.z,
        tx: (ahead.x - p.x) / alen,
        tz: (ahead.z - p.z) / alen,
      };
    });
  });

  return <group ref={holder} />;
}

function LeaderRing() {
  const ref = useRef<THREE.Mesh>(null);
  const rats = useRace((s) => s.rats);
  useFrame(() => {
    const m = ref.current;
    if (m === null) {
      return;
    }
    let bestIdx = 0;
    let best = -1;
    rats.forEach((r, i) => {
      if (r.distance > best) {
        best = r.distance;
        bestIdx = i;
      }
    });
    const spot = liveSpots[bestIdx];
    if (spot === undefined) {
      m.visible = false;
      return;
    }
    m.visible = true;
    m.position.set(spot.x, 3.15, spot.z);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[3.2, 4.2, 32]} />
      <meshBasicMaterial color="#ffd84d" toneMapped={false} transparent opacity={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}

function InstancedFallback({ loopLength }: { readonly loopLength: number }) {
  const rats = useRace((s) => s.rats);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => buildFallbackGeometry(), []);
  const count = Math.max(rats.length, 1);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    const m = mesh.current;
    if (m === null) {
      return;
    }
    rats.forEach((rat, i) => {
      m.setColorAt(i, ratColor(rat.laps, rat.stale));
    });
    if (m.instanceColor !== null) {
      m.instanceColor.needsUpdate = true;
    }
  }, [rats]);

  useFrame(() => {
    const m = mesh.current;
    if (m === null || rats.length === 0) {
      return;
    }
    const t = performance.now() / 1000;
    rats.forEach((rat, i) => {
      const speed = 4 + Math.log10(1 + rat.mergedPrs) * 6;
      const s = (rat.distance + t * speed) % loopLength;
      const p = pointAt(s);
      const ahead = pointAt((s + 2) % loopLength);
      const yaw = Math.atan2(ahead.x - p.x, ahead.z - p.z);
      const bob = Math.sin(t * 10 + i * 1.7) * 0.25;
      dummy.position.set(p.x, 3.2 + bob, p.z);
      dummy.rotation.set(0, yaw, Math.sin(t * 10 + i) * 0.06);
      dummy.scale.setScalar(1.3);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      const alen = Math.hypot(ahead.x - p.x, ahead.z - p.z) || 1;
      liveSpots[i] = {
        x: p.x,
        y: 3.2 + bob,
        z: p.z,
        tx: (ahead.x - p.x) / alen,
        tz: (ahead.z - p.z) / alen,
      };
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, count]}
      frustumCulled={false}
    >
      <meshStandardMaterial
        flatShading
        roughness={0.7}
        metalness={0.15}
        emissive="#23232e"
        emissiveIntensity={1}
      />
    </instancedMesh>
  );
}

function RatDots({ loopLength }: { readonly loopLength: number }) {
  const rats = useRace((s) => s.rats);
  const points = useRef<THREE.Points>(null);
  const count = Math.max(rats.length, 1);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    g.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    return g;
  }, [count]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const col = geometry.getAttribute("color") as THREE.BufferAttribute;
    rats.forEach((rat, i) => {
      const c = ratColor(rat.laps, rat.stale);
      col.setXYZ(i, c.r, c.g, c.b);
    });
    col.needsUpdate = true;
    void pos;
  }, [rats, geometry]);

  useFrame(({ camera }) => {
    const d = points.current;
    if (d === null || rats.length === 0) {
      return;
    }
    const far = camera.position.length() > LOD_DISTANCE;
    d.visible = far;
    if (!far) {
      return;
    }
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const t = performance.now() / 1000;
    rats.forEach((rat, i) => {
      const speed = 4 + Math.log10(1 + rat.mergedPrs) * 6;
      const s = (rat.distance + t * speed) % loopLength;
      const p = pointAt(s);
      pos.setXYZ(i, p.x, 3.2, p.z);
    });
    pos.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={6} vertexColors sizeAttenuation />
    </points>
  );
}

export default function RatSwarm({
  loopLength,
}: {
  readonly loopLength: number;
}) {
  const rats = useRace((s) => s.rats);
  const useSkinned = rats.length <= SKINNED_LIMIT;
  return (
    <group>
      {useSkinned ? (
        <Suspense fallback={null}>
          <SkinnedRats loopLength={loopLength} />
        </Suspense>
      ) : (
        <InstancedFallback loopLength={loopLength} />
      )}
      <LeaderRing />
      <RatDots loopLength={loopLength} />
    </group>
  );
}

useGLTF.preload("/models/rat.glb");
