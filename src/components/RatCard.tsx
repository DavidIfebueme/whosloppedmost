"use client";

import { useRace } from "@/store/race";

export default function RatCard() {
  const rats = useRace((s) => s.rats);
  const selected = useRace((s) => s.selected);
  const setSelected = useRace((s) => s.setSelected);

  if (selected === null) {
    return null;
  }
  const rat = rats.find((r) => r.handle === selected);
  if (rat === undefined) {
    return null;
  }

  return (
    <div className="pointer-events-auto w-64 rounded-2xl border border-white/10 bg-black/70 p-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-black">{rat.handle}</p>
        <button
          aria-label="close card"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
          onClick={() => setSelected(null)}
          type="button"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 font-mono tabular-nums">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-white/40">prs</p>
          <p className="text-sm text-cheese">{rat.mergedPrs.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-white/40">laps</p>
          <p className="text-sm">{rat.laps}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-white/40">dist</p>
          <p className="text-sm">{Math.round(rat.distance)}m</p>
        </div>
      </div>
      {rat.stale && (
        <p className="mt-2 rounded-lg border border-red-400/30 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-red-300">
          unverified · sitting in quarantine
        </p>
      )}
      <a
        className="mt-3 block rounded-full border border-white/15 py-2 text-center text-xs font-bold uppercase tracking-widest text-white/80 transition-colors hover:border-cheese hover:text-cheese"
        href={`https://github.com/${rat.handle}`}
        rel="noreferrer"
        target="_blank"
      >
        open github →
      </a>
    </div>
  );
}
