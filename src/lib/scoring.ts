export const WORLD_SCALE = 100;
import { CIRCUIT_LENGTH } from "./spiral";

export const CIRCUIT_LAP_LENGTH = CIRCUIT_LENGTH;

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
  return Math.floor(distance / CIRCUIT_LAP_LENGTH);
}
