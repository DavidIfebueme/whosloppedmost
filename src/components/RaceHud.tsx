"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRace } from "@/store/race";
import Leaderboard from "./Leaderboard";
import RegisterPanel from "./RegisterPanel";
import RatCard from "./RatCard";

export default function RaceHud() {
  const rats = useRace((s) => s.rats);
  const view = useRace((s) => s.viewName);
  const selected = useRace((s) => s.selected);
  const requestView = useRace((s) => s.requestView);
  const resetView = useRace((s) => s.resetView);
  const paused = useRace((s) => s.paused);
  const setPaused = useRace((s) => s.setPaused);
  const [panel, setPanel] = useState<"standings" | "join" | null>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("join") === "1") setPanel("join");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setPanel(null); useRace.getState().setSelected(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return <div className="race-hud">
    <header className="race-header"><Link href="/" className="wordmark"><span className="brand-icon">w<span>↗</span></span><span>who slopped most.</span></Link><div className="broadcast-status"><span className="status-dot" /> ON THE WHEEL <span className="broadcast-count">{rats.length} RUNNERS</span></div><button className="hud-join" onClick={() => setPanel(panel === "join" ? null : "join")} aria-expanded={panel === "join"}>Join the race <span>↗</span></button></header>
    <div className="race-title"><p className="eyebrow">OPEN SEASON / NO FINISH LINE</p><h1>The infinite circuit.</h1><p>Every merge moves the needle. Nobody leaves.</p></div>
    <aside className={`race-panel ${panel ? "is-open" : ""}`} aria-label="Race information">
      <div className="race-panel-tabs"><button onClick={() => setPanel("standings")} aria-pressed={panel !== "join"}>Running order</button><button onClick={() => setPanel("join")} aria-pressed={panel === "join"}>Get a rat</button><button className="panel-close" aria-label="Close panel" onClick={() => setPanel(null)}>×</button></div>
      <div className="race-panel-content">{panel === "join" ? <><p className="panel-intro">Your GitHub handle is your entry ticket.</p><RegisterPanel /><p className="panel-footnote">Public merged PRs from the last 12 months. No account required.</p></> : <Leaderboard />}</div>
      <div className="panel-caption">MERGED PRS · LAST 12 MONTHS</div>
    </aside>
    <button className="mobile-standings" onClick={() => setPanel(panel === "standings" ? null : "standings")} aria-expanded={panel === "standings"}>☷ Running order <span>{rats.length}</span></button>
    <div className="camera-dock"><span className="camera-label">CAMERA</span>{([["galaxy","Overview"],["pits","Trackside"],["rat","Rat cam"]] as const).map(([name,label]) => <button key={name} aria-pressed={view === name && selected === null} onClick={() => { useRace.getState().setSelected(null); requestView(name); }}>{label}</button>)}<button className="camera-reset" aria-label="Reset camera" onClick={resetView}>↺</button></div>
    <button className="pause-control" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "▶ Resume" : "Ⅱ Pause"}</button>
    <div className="race-rat-card"><RatCard /></div>
    <div className="race-bottomline"><span className="status-dot" /><span>{selected ? `FOLLOWING ${selected}` : view === "rat" ? "FOLLOWING THE LEADER" : "DRAG TO ORBIT · SCROLL TO ZOOM"}</span><span>THE RUNNING IS REAL. THE PROGRESS IS NOT.</span></div>
  </div>;
}
