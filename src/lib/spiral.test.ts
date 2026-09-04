import { describe, expect, it } from "vitest";
import { pointAt, rebaseOffset, spiralRadius } from "./spiral";

describe("spiralRadius", () => {
  it("grows monotonically with distance", () => {
    const radii = [0, 50, 200, 1000, 5000].map(spiralRadius);
    for (let i = 1; i < radii.length; i += 1) {
      const prev = radii[i - 1];
      const curr = radii[i];
      if (prev !== undefined && curr !== undefined) {
        expect(curr).toBeGreaterThan(prev);
      }
    }
  });
});

describe("pointAt", () => {
  it("starts on the inner ring", () => {
    const p = pointAt(0);
    expect(p.y).toBe(0);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(20, 5);
  });

  it("returns distinct finite points for distinct distances", () => {
    const a = pointAt(100);
    const b = pointAt(5000);
    expect(Number.isFinite(a.x + a.z + b.x + b.z)).toBe(true);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(1);
  });
});

describe("rebaseOffset", () => {
  it("snaps the origin shift to whole steps past threshold", () => {
    expect(rebaseOffset(4999)).toEqual({ x: 0, z: 0 });
    expect(rebaseOffset(5001).x % 1000).toBe(0);
  });
});
