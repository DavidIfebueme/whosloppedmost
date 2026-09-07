import { describe, expect, it } from "vitest";
import { distanceToLaps, scoreToDistance } from "./scoring";

describe("scoreToDistance", () => {
  it("maps zeroprs to zero distance", () => {
    expect(scoreToDistance(0)).toBe(0);
  });

  it("compresses 100x output gaps via log scale", () => {
    const small = scoreToDistance(10);
    const huge = scoreToDistance(1000);
    expect(huge).toBeGreaterThan(small);
    expect(huge / small).toBeLessThan(5);
  });

  it("is monotonic across realistic pr counts", () => {
    const counts = [0, 1, 9, 10, 99, 100, 500, 2000];
    const distances = counts.map(scoreToDistance);
    for (let i = 1; i < distances.length; i += 1) {
      const prev = distances[i - 1];
      const curr = distances[i];
      if (prev !== undefined && curr !== undefined) {
        expect(curr).toBeGreaterThan(prev);
      }
    }
  });
});

describe("distanceToLaps", () => {
  it("counts complete circuit laps", () => {
    expect(distanceToLaps(0)).toBe(0);
    expect(distanceToLaps(1199)).toBe(0);
    expect(distanceToLaps(1200)).toBe(1);
    expect(distanceToLaps(2500)).toBe(2);
  });
});
