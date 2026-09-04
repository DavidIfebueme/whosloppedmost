export const INNER_RADIUS = 20;
export const SPIRAL_GROWTH = 2.5;
export const REBASE_THRESHOLD = 5000;
export const REBASE_STEP = 1000;

export interface TrackPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

function thetaFor(distance: number): number {
  if (distance <= 0) {
    return 0;
  }
  return Math.sqrt((2 * distance) / SPIRAL_GROWTH);
}

export function spiralRadius(distance: number): number {
  return INNER_RADIUS + SPIRAL_GROWTH * thetaFor(distance);
}

export function pointAt(distance: number): TrackPoint {
  const theta = thetaFor(distance);
  const r = INNER_RADIUS + SPIRAL_GROWTH * theta;
  return {
    x: r * Math.cos(theta),
    y: 0,
    z: r * Math.sin(theta),
  };
}

export function rebaseOffset(coord: number): { x: number; z: number } {
  if (Math.abs(coord) < REBASE_THRESHOLD) {
    return { x: 0, z: 0 };
  }
  const snapped =
    Math.sign(coord) *
    Math.floor(Math.abs(coord) / REBASE_STEP) *
    REBASE_STEP;
  return { x: snapped, z: 0 };
}
