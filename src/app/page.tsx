"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isRatDatum } from "@/components/RegisterPanel";

interface BoardRat { handle: string; mergedPrs: number; laps: number; stale: boolean }

export default function HomePage() {
  const [rats, setRats] = useState<BoardRat[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetch("/api/rats", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Board unavailable");
        const body = await res.json();
        if (!Array.isArray(body.rats) || !body.rats.every(isRatDatum)) throw new Error("Invalid board");
        setRats([...body.rats].sort((a: BoardRat, b: BoardRat) => b.mergedPrs - a.mergedPrs));
        setStatus("ready");
      })
      .catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [attempt]);
  const live = rats.filter((r) => !r.stale);
  const total = live.reduce((sum, r) => sum + r.mergedPrs, 0);

  return (
    <main className="home-shell">
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="Who slopped most home"><span className="brand-icon">w<span>↗</span></span><span>who slopped<span className="wordmark-light">most.</span></span></Link>
        <nav aria-label="Main navigation"><a href="#standings">Standings</a><a href="#method">The rules</a><Link href="/race" className="nav-enter">Enter the race <span>↗</span></Link></nav>
      </header>
      <section className="race-hero">
        <div className="hero-image" role="img" aria-label="The spiral race circuit under evening floodlights" />
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="eyebrow"><span className="status-dot" /> THE INTERNET'S RAT RACE</p>
          <h1>All that shipping.<br />Still <em>nowhere.</em></h1>
          <p className="hero-description">Real developers. Real merged PRs. An endless race for a piece of cheese. Welcome to the productivity industrial complex.</p>
          <div className="hero-actions"><Link href="/race" className="primary-action">Watch the race <span>↗</span></Link><Link href="/race?join=1" className="text-action">Put your rat on the track <span>→</span></Link></div>
          <div className="hero-proof"><span className="tiny-track">◎</span><span>Powered by public GitHub data.<br /><strong>Absolutely no finish line.</strong></span></div>
        </div>
        <div className="circuit-caption"><span className="crosshair">+</span><div>THE INFINITE CIRCUIT<span>Spiral layout · open season</span></div><span className="caption-coordinate">NO FINISH LINE ↗</span></div>
      </section>
      <section className="race-strip" aria-label="Race statistics"><div><span className="status-dot" /><span>THE RACE GOES ON</span></div><p><strong>{status === "ready" ? live.length : "—"}</strong> runners on track</p><p><strong>{status === "ready" ? total.toLocaleString() : "—"}</strong> merged PRs</p><p><strong>0</strong> destinations reached</p><Link href="/race">Trackside view ↗</Link></section>
      <section className="standings-section" id="standings">
        <div className="section-heading"><div><p className="eyebrow">A VERY SERIOUS LEADERBOARD</p><h2>The usual <em>suspects.</em></h2></div><p>More merged PRs. More track.<br />Same existential outcome.</p></div>
        <div className="standings-layout"><div className="standings-board">
          <div className="board-heading"><span>THE RUNNING ORDER</span><span>MERGED PRS · LAST 12 MONTHS</span></div>
          {status === "loading" && <div className="board-state" role="status">Fetching the running order…</div>}
          {status === "error" && <div className="board-state" role="alert">The board is unavailable. <button onClick={() => setAttempt((n) => n + 1)}>Try again ↗</button></div>}
          {status === "ready" && live.length === 0 && <div className="board-state">No verified runners yet. <Link href="/race?join=1">Be the first to join ↗</Link></div>}
          <ol>{live.slice(0, 8).map((rat, index) => <li key={rat.handle}><Link href={`/race?select=${encodeURIComponent(rat.handle)}`} className="standing-row"><span className="standing-rank">{String(index + 1).padStart(2, "0")}</span><span className={`runner-avatar avatar-${index % 4}`}>{rat.handle.slice(0, 2).toUpperCase()}</span><span className="runner-name">{rat.handle}<span>{index === 0 ? "Setting the pace" : rat.laps > 0 ? `${rat.laps} laps. Still here.` : "On the wheel"}</span></span><span className="runner-count">{rat.mergedPrs.toLocaleString()}<span>MERGED PRS</span></span><span className="runner-arrow">↗</span></Link></li>)}</ol>
          <Link href="/race" className="board-footer">Meet everyone on the track <span>→</span></Link>
        </div><aside className="join-card"><div className="cheese-symbol" aria-hidden="true">◒</div><p className="eyebrow">YOUR NEXT QUESTIONABLE DECISION</p><h3>Got commits?<br />Get in.</h3><p>Your public GitHub handle is your entry ticket. We'll count the merged PRs and give you a rat. The ambition is on you.</p><Link href="/race?join=1" className="primary-action">Join the race <span>↗</span></Link><span className="join-note">No account. No wallet. Just a handle.</span></aside></div>
      </section>
      <section className="method-section" id="method"><div className="section-heading"><div><p className="eyebrow">THE RULES OF THE RAT RACE</p><h2>Output goes up.<br /><em>Meaning sold separately.</em></h2></div></div><div className="method-grid"><article><span className="method-symbol">↗</span><h3>Ship something.</h3><p>We count merged pull requests from your public GitHub activity over the last 12 months. Real numbers, pulled from the source.</p></article><article><span className="method-symbol">◎</span><h3>Run in circles.</h3><p>Your PR count sets your distance on a logarithmic spiral. Big numbers get room to run. Nobody gets an exit.</p></article><article><span className="method-symbol">⚑</span><h3>Keep it honest.</h3><p>Suspicious patterns get flagged for everyone to see. Unverified runners sit in quarantine. The numbers stay on the board.</p></article></div></section>
      <footer className="site-footer"><Link href="/" className="wordmark">who slopped most.</Link><p>A monument to motion without progress.</p><Link href="/race">See you on the wheel ↗</Link></footer>
    </main>
  );
}
