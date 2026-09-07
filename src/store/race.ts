import { create } from "zustand";

export interface RatDatum {
  readonly handle: string;
  readonly mergedPrs: number;
  readonly distance: number;
  readonly laps: number;
  readonly stale: boolean;
}

export type CameraView = "galaxy" | "pits" | "rat";

interface RaceState {
  readonly quality: "auto" | "performance" | "cinematic";
  readonly setQuality: (quality: "auto" | "performance" | "cinematic") => void;
  readonly economy: boolean;
  readonly setEconomy: (economy: boolean) => void;
  readonly loadStatus: "loading" | "ready" | "error";
  readonly setLoadStatus: (status: "loading" | "ready" | "error") => void;
  readonly paused: boolean;
  readonly setPaused: (paused: boolean) => void;
  readonly rats: ReadonlyArray<RatDatum>;
  readonly setRats: (rats: ReadonlyArray<RatDatum>) => void;
  readonly selected: string | null;
  readonly setSelected: (handle: string | null) => void;
  readonly resetCounter: number;
  readonly resetView: () => void;
  readonly viewTick: number;
  readonly viewName: CameraView;
  readonly requestView: (view: CameraView) => void;
}

export const useRace = create<RaceState>()((set) => ({
  quality: "auto",
  // A manual quality choice must override an earlier automatic downgrade.
  setQuality: (quality) => set({ quality, economy: quality === "auto" ? false : quality === "performance" }),
  economy: false,
  setEconomy: (economy) => set({ economy }),
  loadStatus: "loading",
  setLoadStatus: (loadStatus) => set({ loadStatus }),
  paused: false,
  setPaused: (paused) => set({ paused }),
  rats: [],
  setRats: (rats) => set({ rats }),
  selected: null,
  setSelected: (selected) => set({ selected }),
  resetCounter: 0,
  resetView: () =>
    set((s) => ({ selected: null, viewName: "galaxy", resetCounter: s.resetCounter + 1 })),
  viewTick: 0,
  viewName: "galaxy",
  requestView: (view) =>
    set((s) => ({ viewName: view, viewTick: s.viewTick + 1 })),
}));
