import { create } from "zustand";

export interface RatDatum {
  readonly handle: string;
  readonly mergedPrs: number;
  readonly distance: number;
  readonly laps: number;
  readonly stale: boolean;
}

interface RaceState {
  readonly rats: ReadonlyArray<RatDatum>;
  readonly setRats: (rats: ReadonlyArray<RatDatum>) => void;
}

export const useRace = create<RaceState>()((set) => ({
  rats: [],
  setRats: (rats) => set({ rats }),
}));
