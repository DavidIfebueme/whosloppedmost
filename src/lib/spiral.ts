export const INNER_RADIUS = 20;
export const SPIRAL_GROWTH = 2.5;
/** A closed course means runners never teleport from a visible finish back to a start. */
export const CIRCUIT_LENGTH = 1200;
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
  void distance;
  return 108;
}

export function pointAt(distance: number): TrackPoint {
  const theta = ((distance % CIRCUIT_LENGTH) + CIRCUIT_LENGTH) % CIRCUIT_LENGTH / CIRCUIT_LENGTH * Math.PI * 2;
  // An asymmetric, gently undulating closed circuit. The shared path function
  // drives both track mesh and runners, so there is no visible reset point.
  const r = 77 + Math.sin(theta * 3 - 0.4) * 12 + Math.sin(theta * 5 + 1.2) * 5;
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
