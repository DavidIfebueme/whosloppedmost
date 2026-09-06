import * as THREE from "three";
import { pointAt } from "../lib/spiral";

/** An upward-facing strip measured along the spiral, with distance-based UVs. */
export function circuitStrip(distance: number, inner: number, outer: number, height: number) {
  const segments = Math.min(2200, Math.max(700, Math.ceil(distance / 3)));
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let travelled = 0;
  let previous = pointAt(0);
  for (let i = 0; i <= segments; i++) {
    // The spiral angle grows with sqrt(distance), so sample angle uniformly.
    // Uniform distance sampling leaves a visible polygon at the starting grid.
    const s = distance * (i / segments) ** 2;
    const p = pointAt(s);
    const ahead = pointAt(s + 0.001);
    const dx = ahead.x - p.x;
    const dz = ahead.z - p.z;
    const length = Math.hypot(dx, dz) || 1;
    travelled += Math.hypot(p.x - previous.x, p.z - previous.z);
    for (const offset of [inner, outer]) {
      positions.push(p.x - dz / length * offset, height, p.z + dx / length * offset);
      uvs.push(travelled / 4, offset === inner ? 0 : 1);
    }
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    previous = p;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
