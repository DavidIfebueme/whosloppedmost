import { describe, expect, it } from "vitest";
import { CIRCUIT_LENGTH, pointAt, rebaseOffset, spiralRadius } from "./spiral";

describe("closed circuit", () => {
  it("uses a stable arena radius", () => {
    expect(spiralRadius(0)).toBe(108);
    expect(spiralRadius(5000)).toBe(108);
  });

  it("joins position and tangent continuously", () => {
    const p = pointAt(0);
    const end = pointAt(CIRCUIT_LENGTH);
    const a = pointAt(0.1);
    const b = pointAt(CIRCUIT_LENGTH + 0.1);
    expect(end.x).toBeCloseTo(p.x, 8);
    expect(end.z).toBeCloseTo(p.z, 8);
    expect(b.x).toBeCloseTo(a.x, 8);
    expect(b.z).toBeCloseTo(a.z, 8);
  });

  it("has finite, varied points inside one lap", () => {
    const a = pointAt(100);
    const b = pointAt(500);
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
