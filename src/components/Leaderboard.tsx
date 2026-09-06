"use client";

import { useMemo } from "react";
import { useRace } from "@/store/race";

function barWidth(prs: number, max: number): number {
  if (max <= 0 || prs <= 0) {
    return 2;
  }
  return Math.max(
    2,
    Math.round((Math.log10(1 + prs) / Math.log10(1 + max)) * 100),
  );
}

export default function Leaderboard() {
  const rats = useRace((s) => s.rats);
  const status = useRace((s) => s.loadStatus);
  const selected = useRace((s) => s.selected);
  const setSelected = useRace((s) => s.setSelected);

  const live = useMemo(
    () => [...rats].filter((r) => !r.stale).sort((a, b) => b.mergedPrs - a.mergedPrs),
    [rats],
  );
  const stale = useMemo(() => rats.filter((r) => r.stale), [rats]);
  const max = live.length > 0 ? (live[0]?.mergedPrs ?? 0) : 0;

  return (
    <div className="flex flex-col gap-4">
      {status === "loading" && <p role="status" className="text-xs text-slate-300">Fetching the running order…</p>}
      {status === "error" && <p role="alert" className="text-xs text-orange-200">The board is unavailable. <button className="underline" onClick={() => window.location.reload()}>Reload to retry</button></p>}
      {status === "ready" && rats.length === 0 && <p className="text-xs text-slate-300">No runners yet. Choose Get a rat to join.</p>}
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
          verified · {live.length}
        </p>
        <ol className="flex flex-col gap-1">
          {live.slice(0, 10).map((rat, i) => {
            const active = selected === rat.handle;
            return (
              <li key={rat.handle}>
                <button
                  className={`grid w-full grid-cols-[1.5rem_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    active ? "bg-cheese/15" : "hover:bg-white/5"
                  }`}
                  onClick={() =>
                    setSelected(active ? null : rat.handle)
                  }
                  type="button"
                >
                  <span className="font-mono text-[11px] tabular-nums text-white/35">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block truncate text-xs font-bold ${active ? "text-cheese" : ""}`}
                    >
                      {rat.handle}
                    </span>
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="block h-full rounded-full bg-cheese"
                        style={{ width: `${barWidth(rat.mergedPrs, max)}%` }}
                      />
                    </span>
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-white/70">
                    {rat.mergedPrs.toLocaleString()}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      {stale.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
            quarantine · {stale.length}
          </p>
          <ul className="flex flex-col gap-1">
            {stale.slice(0, 6).map((rat) => (
              <li
                key={rat.handle}
                className="flex items-center justify-between rounded-lg px-2 py-1 text-white/40"
              >
                <span className="truncate text-xs">{rat.handle}</span>
                <span className="ml-2 shrink-0 rounded-full border border-red-400/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-red-300">
                  farmed?
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
