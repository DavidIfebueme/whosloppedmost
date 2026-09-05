"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pointAt } from "@/lib/spiral";
import { useRace } from "@/store/race";

const LOD_DISTANCE = 900;

function buildRatGeometry(): THREE.BufferGeometry {
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

function ratColor(laps: number, stale: boolean): THREE.Color {
  if (stale) {
    return new THREE.Color("#555566");
  }
  if (laps > 0) {
    return new THREE.Color("#ffd84d");
  }
  return new THREE.Color("#7dd3fc");
}

export default function RatSwarm({
  loopLength,
}: {
  readonly loopLength: number;
}) {
  const rats = useRace((s) => s.rats);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dots = useRef<THREE.Points>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => buildRatGeometry(), []);
  const count = Math.max(rats.length, 1);

  const dotsGeometry = useMemo(() => {
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
      dotsGeometry.dispose();
    };
  }, [geometry, dotsGeometry]);

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
    const pos = dotsGeometry.getAttribute("position");
    const col = dotsGeometry.getAttribute("color");
    if (pos !== undefined && col !== undefined) {
      rats.forEach((rat, i) => {
        const c = ratColor(rat.laps, rat.stale);
        (col as THREE.BufferAttribute).setXYZ(i, c.r, c.g, c.b);
      });
      (col as THREE.BufferAttribute).needsUpdate = true;
    }
  }, [rats, dotsGeometry]);

  useFrame(({ camera, clock }) => {
    const m = mesh.current;
    const d = dots.current;
    if (m === null || d === null || rats.length === 0) {
      return;
    }
    const t = clock.elapsedTime;
    const far = camera.position.length() > LOD_DISTANCE;
    m.visible = !far;
    d.visible = far;

    const posAttr = dotsGeometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
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
      posAttr.setXYZ(i, p.x, 3.2 + bob, p.z);
    });
    m.instanceMatrix.needsUpdate = true;
    if (far) {
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group>
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
      <points ref={dots} geometry={dotsGeometry} frustumCulled={false}>
        <pointsMaterial size={6} vertexColors sizeAttenuation />
      </points>
    </group>
  );
}
