"use client";

import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pointAt, spiralRadius } from "@/lib/spiral";
import { useRace, type RatDatum } from "@/store/race";

const LOD_DISTANCE = 900;
const SKINNED_LIMIT = 40;
// Join an already-running race rather than stack similar scores on the grid.
let simulationTime = 240;

function runnerPose(rat: RatDatum, index: number, loopLength: number) {
  if (rat.stale) {
    const x = spiralRadius(loopLength) + 10;
    const z = (index % 12 - 5.5) * 3.5;
    return { x, y: 0, z, tx: 0, tz: 1 };
  }
  const speed = 4 + Math.log10(1 + rat.mergedPrs) * 6;
  const s = (rat.distance + simulationTime * speed) % loopLength;
  const point = pointAt(s);
  const ahead = pointAt(s + 0.5);
  const length = Math.hypot(ahead.x - point.x, ahead.z - point.z) || 1;
  return { ...point, tx: (ahead.x - point.x) / length, tz: (ahead.z - point.z) / length };
}

function SimulationClock() {
  useFrame((_, delta) => {
    if (!useRace.getState().paused) simulationTime += Math.min(delta, 0.05);
  }, -2);
  return null;
}

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
  // This is deliberately one merged, instanced mesh: the economy path can retain
  // a recognisable silhouette without multiplying draw calls for every runner.
  const body = new THREE.CapsuleGeometry(0.88, 2.25, 4, 8);
  body.rotateX(Math.PI / 2);
  body.translate(0, 1.2, 0);
  const shoulders = new THREE.SphereGeometry(0.78, 7, 5);
  shoulders.scale(0.92, 0.84, 1.12);
  shoulders.translate(0, 1.45, 1.48);
  const head = new THREE.ConeGeometry(0.7, 1.35, 6);
  head.rotateX(Math.PI / 2);
  head.translate(0, 1.5, 2.2);
  const snout = new THREE.SphereGeometry(0.28, 6, 4);
  snout.scale(0.9, 0.7, 1.28);
  snout.translate(0, 1.35, 3.0);
  const earL = new THREE.SphereGeometry(0.34, 6, 4);
  earL.scale(0.55, 0.24, 1);
  earL.rotateY(-0.25);
  earL.translate(-0.47, 2.23, 1.94);
  const earR = new THREE.SphereGeometry(0.34, 6, 4);
  earR.scale(0.55, 0.24, 1);
  earR.rotateY(0.25);
  earR.translate(0.47, 2.23, 1.94);
  const parts: THREE.BufferGeometry[] = [body, shoulders, head, snout, earL, earR];
  for (const x of [-0.58, 0.58]) {
    for (const z of [-0.85, 1.08]) {
      const paw = new THREE.CapsuleGeometry(0.18, 0.45, 3, 5);
      paw.rotateX(Math.PI / 2);
      paw.rotateZ(x * 0.18);
      paw.translate(x, 0.45, z);
      parts.push(paw);
    }
  }
  for (const x of [-0.1, 0.1]) {
    const tail = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 1.25, -1.9),
        new THREE.Vector3(x * 3, 1.05, -3.15),
        new THREE.Vector3(x * 5, 0.65, -3.85),
      ]),
      5,
      0.1,
      4,
      false,
    );
    parts.push(tail);
  }
  return (
    mergeGeometries(parts) ??
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
  return new THREE.Color("#9d7659");
}

interface Runner {
  readonly group: THREE.Group;
  readonly mixer: THREE.AnimationMixer | null;
  readonly tag: THREE.Sprite;
  readonly tagTexture: THREE.CanvasTexture;
  readonly groundOffset: number;
  readonly materials: THREE.Material[];
}

function SkinnedRats({ loopLength }: { readonly loopLength: number }) {
  const invalidate = useThree((s) => s.invalidate);
  const rats = useRace((s) => s.rats);
  const gltf = useGLTF("/models/rat.glb");
  const holder = useRef<THREE.Group>(null);

  const runners: ReadonlyArray<Runner> = useMemo(() => {
    const runClip = gltf.animations.find((c) => c.name.endsWith("Rat_Run"));
    return rats.map((rat, i) => {
      const group = cloneSkinned(gltf.scene) as THREE.Group;
      group.scale.setScalar(1.5);
      group.userData.handle = rat.handle;
      group.updateMatrixWorld(true);
      const groundOffset = -new THREE.Box3().setFromObject(group).min.y;
      const materials: THREE.Material[] = [];
      group.traverse((o) => {
        o.frustumCulled = false;
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          const mats = (Array.isArray(o.material) ? o.material : [o.material]).map((material) => material.clone());
          o.material = Array.isArray(o.material) ? mats : mats[0]!;
          materials.push(...mats);
          for (const mat of mats) {
            if (mat instanceof THREE.MeshStandardMaterial) {
              if (mat.name === "Grey") {
                mat.color.set("#8a6f55");
              }
              mat.envMapIntensity = 0.9;
              mat.metalness = 0;
              mat.roughness = mat.name === "Grey" ? 0.87 : 0.66;
            }
          }
        }
      });
      let mixer: THREE.AnimationMixer | null = null;
      if (runClip !== undefined && !rat.stale) {
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
      tag.scale.set(8, 2, 1);
      group.add(tag);
      return { group, mixer, tag, tagTexture, groundOffset, materials };
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
    invalidate();
    return () => {
      for (const r of runners) {
        h.remove(r.group);
        r.mixer?.stopAllAction();
        r.mixer?.uncacheRoot(r.group);
        r.materials.forEach((material) => material.dispose());
        r.tagTexture.dispose();
        (r.tag.material as THREE.SpriteMaterial).dispose();
      }
    };
  }, [runners, invalidate]);

  useFrame(({ camera }, delta) => {
    const h = holder.current;
    if (h !== null) {
      h.visible = camera.position.length() <= LOD_DISTANCE;
    }
    const t = simulationTime;
    rats.forEach((rat, i) => {
      const runner = runners[i];
      if (runner === undefined) {
        return;
      }
      if (h?.visible && !useRace.getState().paused) runner.mixer?.update(Math.min(delta, 0.05));
      const p = runnerPose(rat, i, loopLength);
      const yaw = Math.atan2(p.tx, p.tz);
      const bob = rat.stale ? 0 : Math.sin(t * 9 + i * 1.7) * 0.06;
      runner.group.position.set(p.x, 0.15 + runner.groundOffset + bob, p.z);
      runner.group.rotation.set(0, yaw, 0);
      const camDist = camera.position.distanceTo(runner.group.position);
      const mat = runner.tag.material as THREE.SpriteMaterial;
      const selected = useRace.getState().selected;
      // One broadcast label identifies the pace-setter; selecting any runner
      // transfers that label to its owner without obscuring the whole track.
      runner.tag.visible = (selected === rat.handle || (selected === null && i === 0) || runner.group.userData.hovered === true) && camDist > 14 && camDist < 90 && useRace.getState().viewName !== "rat";
      mat.opacity = 0.95;
      runner.tag.position.set(0, 4.5, 0);
      const spot = liveSpots[i] ?? (liveSpots[i] = { x: 0, y: 0, z: 0, tx: 0, tz: 0 });
      spot.x = p.x;
      spot.y = 2;
      spot.z = p.z;
      spot.tx = p.tx;
      spot.tz = p.tz;
    });
  }, -1);

  return <group ref={holder} onPointerOver={(event) => {
    let object: THREE.Object3D | null = event.object;
    while (object && typeof object.userData.handle !== "string") object = object.parent;
    if (object) { event.stopPropagation(); object.userData.hovered = true; invalidate(); }
  }} onPointerOut={(event) => {
    let object: THREE.Object3D | null = event.object;
    while (object && typeof object.userData.handle !== "string") object = object.parent;
    if (object) { object.userData.hovered = false; invalidate(); }
  }} onClick={(event) => {
    let object: THREE.Object3D | null = event.object;
    while (object && typeof object.userData.handle !== "string") object = object.parent;
    if (object) {
      event.stopPropagation();
      useRace.getState().setSelected(object.userData.handle as string);
    }
  }} />;
}

function InstancedFallback({ loopLength }: { readonly loopLength: number }) {
  const rats = useRace((s) => s.rats);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => buildFallbackGeometry(), []);
  const count = rats.length;

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

  useFrame(({ camera }) => {
    const m = mesh.current;
    if (m === null || rats.length === 0) {
      return;
    }
    m.visible = camera.position.length() <= LOD_DISTANCE;
    const t = simulationTime;
    rats.forEach((rat, i) => {
      const p = runnerPose(rat, i, loopLength);
      const yaw = Math.atan2(p.tx, p.tz);
      const bob = rat.stale ? 0 : Math.sin(t * 10 + i * 1.7) * 0.12;
      dummy.position.set(p.x, 0.15 + bob, p.z);
      dummy.rotation.set(0, yaw, Math.sin(t * 10 + i) * 0.06);
      dummy.scale.setScalar(1.3);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      const spot = liveSpots[i] ?? (liveSpots[i] = { x: 0, y: 0, z: 0, tx: 0, tz: 0 });
      spot.x = p.x;
      spot.y = 2;
      spot.z = p.z;
      spot.tx = p.tx;
      spot.tz = p.tz;
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, count]}
      frustumCulled={false}
      onClick={(event) => {
        const rat = event.instanceId === undefined ? undefined : rats[event.instanceId];
        if (rat) {
          event.stopPropagation();
          useRace.getState().setSelected(rat.handle);
        }
      }}
    >
      <meshStandardMaterial
        roughness={0.88}
        metalness={0.02}
        emissive="#160d08"
        emissiveIntensity={0.08}
      />
    </instancedMesh>
  );
}

function RatDots({ loopLength }: { readonly loopLength: number }) {
  const rats = useRace((s) => s.rats);
  const points = useRef<THREE.Points>(null);
  const count = rats.length;
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
    const overview = camera.position.length() > 165;
    d.visible = overview;
    if (!overview) {
      return;
    }
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    rats.forEach((rat, i) => {
      const p = runnerPose(rat, i, loopLength);
      pos.setXYZ(i, p.x, 3.2, p.z);
    });
    pos.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false} onClick={(event) => {
      const rat = event.index === undefined ? undefined : rats[event.index];
      if (rat) {
        event.stopPropagation();
        useRace.getState().setSelected(rat.handle);
      }
    }}>
      <pointsMaterial size={3.8} vertexColors sizeAttenuation depthWrite={false} transparent opacity={0.9} />
    </points>
  );
}

export default function RatSwarm({
  loopLength,
}: {
  readonly loopLength: number;
}) {
  const rats = useRace((s) => s.rats);
  const quality = useRace((s) => s.quality);
  const economy = useRace((s) => s.economy);
  const useSkinned = rats.length <= SKINNED_LIMIT && quality !== "performance" && !economy;
  return (
    <group>
      <SimulationClock />
      {useSkinned ? (
        <ModelBoundary fallback={<InstancedFallback loopLength={loopLength} />}>
          <Suspense fallback={<InstancedFallback loopLength={loopLength} />}>
            <SkinnedRats loopLength={loopLength} />
          </Suspense>
        </ModelBoundary>
      ) : (
        <InstancedFallback loopLength={loopLength} />
      )}
      <RatDots loopLength={loopLength} />
    </group>
  );
}

class ModelBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
