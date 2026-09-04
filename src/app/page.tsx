"use client";

import { useEffect, useState } from "react";

interface BoardRat {
  readonly handle: string;
  readonly mergedPrs: number;
  readonly laps: number;
  readonly stale: boolean;
}

const MARQUEE = [
  "VELOCITY IS VIRTUE",
  "MERGED PRS = MEANING",
  "SHIP OR VANISH",
  "REST IS RUST",
  "THE WHEEL LOVES YOU",
  "ZERO STILL COUNTS",
];

function barWidth(prs: number, max: number): number {
  if (max <= 0 || prs <= 0) {
    return 2;
  }
  const w = (Math.log10(1 + prs) / Math.log10(1 + max)) * 100;
  return Math.max(2, Math.round(w));
}

export default function HomePage() {
  const [rats, setRats] = useState<ReadonlyArray<BoardRat>>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/rats")
      .then((res) => res.json() as Promise<{ rats: ReadonlyArray<BoardRat> }>)
      .then((body) => {
        if (alive) {
          setRats(
            [...body.rats].sort((a, b) => b.mergedPrs - a.mergedPrs),
          );
        }
      })
      .catch(() => {
        if (alive) {
          setFailed(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const live = rats.filter((r) => !r.stale);
  const first: BoardRat | undefined = live[0];
  const max = first?.mergedPrs ?? 0;
  const leader: BoardRat | null = first ?? null;

  return (
    <main className="min-h-screen bg-void text-[#f2f0e9] antialiased">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em]">
          who slopped the most
        </p>
        <div className="flex items-center gap-3">
          <p className="font-mono text-[11px] tabular-nums text-white/50">
            {failed
              ? "board offline"
              : live.length > 0
                ? `${live.length} rats tracked`
                : "counting rats…"}
          </p>
          <a
            className="rounded-full bg-cheese px-4 py-2 text-xs font-bold uppercase tracking-widest text-black transition-transform active:scale-95"
            href="/race"
          >
            enter
          </a>
        </div>
      </header>

      <section className="grid gap-10 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:pt-20">
        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-cheese">
            an extremely serious productivity leaderboard
          </p>
          <h1
            className="max-w-xl text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl"
            style={{ textWrap: "balance" }}
          >
            everyone is sprinting. nobody is moving.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60">
            Real merged PR counts from public GitHub profiles, converted into
            distance along an endless spiral track. The running is real. The
            progress is not.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              className="rounded-full bg-cheese px-6 py-3 text-sm font-bold uppercase tracking-widest text-black transition-transform active:scale-95"
              href="/race"
            >
              watch the race
            </a>
            <a
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-widest text-white/80 transition-colors hover:border-cheese hover:text-cheese"
              href="#method"
            >
              how it works
            </a>
          </div>
        </div>

        <div className="flex flex-col justify-end border-l-2 border-cheese/70 pl-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
            distance from start
          </p>
          <p
            className="font-mono font-bold tabular-nums leading-none text-cheese"
            style={{ fontSize: "clamp(6rem, 18vw, 13rem)" }}
          >
            0m
          </p>
          <p className="mt-2 max-w-xs text-sm text-white/50">
            {leader !== null
              ? `${leader.handle} has run ${leader.mergedPrs.toLocaleString()} merged PRs and arrived exactly here.`
              : "The leader has lapped the spiral and arrived exactly here."}
          </p>
        </div>
      </section>

      <div className="overflow-hidden border-y border-cheese/30 bg-cheese py-2">
        <div className="flex w-max animate-[marquee_28s_linear_infinite] gap-10 whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE].map((line, i) => (
            <span
              key={i}
              className="text-xs font-black uppercase tracking-[0.25em] text-black"
            >
              {line} ·
            </span>
          ))}
        </div>
      </div>

      <section className="px-5 py-14 sm:px-8">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-black uppercase tracking-tight">
            current runners
          </h2>
          <a
            className="font-mono text-xs uppercase tracking-widest text-cheese hover:underline"
            href="/race"
          >
            see them run →
          </a>
        </div>
        {live.length === 0 ? (
          <p className="font-mono text-sm text-white/40">
            {failed
              ? "the board fell off the wheel. reload to try again."
              : "counting rats…"}
          </p>
        ) : (
          <ol className="divide-y divide-white/10 border-y border-white/10">
            {live.slice(0, 8).map((rat, i) => (
              <li
                key={rat.handle}
                className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-3"
              >
                <span className="font-mono text-sm tabular-nums text-white/35">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-sm font-bold">
                    {rat.handle}
                    {rat.laps > 0 && (
                      <span className="ml-2 rounded-full bg-cheese/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cheese">
                        lap {rat.laps}
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-cheese"
                      style={{ width: `${barWidth(rat.mergedPrs, max)}%` }}
                    />
                  </span>
                </span>
                <span className="font-mono text-sm tabular-nums text-white/70">
                  {rat.mergedPrs.toLocaleString()}
                  <span className="ml-1 text-[10px] uppercase text-white/35">
                    prs
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section id="method" className="border-t border-white/10 px-5 py-14 sm:px-8">
        <h2 className="mb-8 text-xl font-black uppercase tracking-tight">
          how it works
        </h2>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
          {[
            {
              t: "real output",
              d: "Merged PRs from the last 12 months, pulled from public GitHub data. No self reported numbers.",
            },
            {
              t: "log scaled",
              d: "Counts are compressed logarithmically into track distance, so a 100x gap looks dramatic without breaking the layout.",
            },
            {
              t: "farmed, not erased",
              d: "Suspicious patterns get a public farmed badge and a seat in quarantine. Deleting numbers would ruin the joke.",
            },
          ].map((c) => (
            <div key={c.t} className="bg-void p-6">
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-cheese">
                {c.t}
              </p>
              <p className="text-sm leading-relaxed text-white/60">{c.d}</p>
            </div>
          ))}
        </div>
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/35">
            who slopped the most · a monument to velocity
          </p>
          <a
            className="font-mono text-[11px] uppercase tracking-widest text-white/35 hover:text-cheese"
            href="/race"
          >
            back to the track →
          </a>
        </footer>
      </section>
    </main>
  );
}
