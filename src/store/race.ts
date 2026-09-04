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
  readonly selected: string | null;
  readonly setSelected: (handle: string | null) => void;
  readonly resetCounter: number;
  readonly resetView: () => void;
}

export const useRace = create<RaceState>()((set) => ({
  rats: [],
  setRats: (rats) => set({ rats }),
  selected: null,
  setSelected: (selected) => set({ selected }),
  resetCounter: 0,
  resetView: () =>
    set((s) => ({ selected: null, resetCounter: s.resetCounter + 1 })),
}));
