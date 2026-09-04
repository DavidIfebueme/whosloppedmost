export const WORLD_SCALE = 100;
export const SPIRAL_LENGTH = 1000;

export function scoreToDistance(mergedPrs: number): number {
  if (mergedPrs <= 0) {
    return 0;
  }
  return Math.log10(1 + mergedPrs) * WORLD_SCALE;
}

export function distanceToLaps(distance: number): number {
  if (distance < 0) {
    return 0;
  }
  return Math.floor(distance / SPIRAL_LENGTH);
}
