import { describe, expect, it } from "vitest";
import { circuitStrip } from "./CircuitGeometry";

describe("circuit surface", () => {
  it("keeps the road flat, full width and facing the camera from above", () => {
    const geometry = circuitStrip(1200, -3.8, 3.8, 0.08);
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    for (let i = 0; i < position.count; i += 2) {
      expect(position.getY(i)).toBeCloseTo(0.08, 6);
      expect(normal.getY(i)).toBeGreaterThan(0.99);
      expect(Math.hypot(position.getX(i) - position.getX(i + 1), position.getZ(i) - position.getZ(i + 1))).toBeCloseTo(7.6, 4);
    }
    geometry.dispose();
  });

  it("samples the start bend finely enough to avoid a straight shortcut", () => {
    const geometry = circuitStrip(1200, -3.8, 3.8, 0.08);
    const position = geometry.getAttribute("position");
    expect(Math.hypot(position.getX(0) - position.getX(2), position.getZ(0) - position.getZ(2))).toBeLessThan(2);
    geometry.dispose();
  });
});
