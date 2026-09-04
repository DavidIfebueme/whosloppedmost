"use client";

import { useState } from "react";
import { useRace, type RatDatum } from "@/store/race";

const STORAGE_KEY = "whoslop-custom";

function isRatDatum(value: unknown): value is RatDatum {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v["handle"] === "string" &&
    typeof v["mergedPrs"] === "number" &&
    typeof v["distance"] === "number" &&
    typeof v["laps"] === "number" &&
    typeof v["stale"] === "boolean"
  );
}

export function loadCustomRats(): ReadonlyArray<RatDatum> {
  try {
    const raw: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.filter(isRatDatum);
  } catch {
    return [];
  }
}

function saveCustomRats(rats: ReadonlyArray<RatDatum>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rats));
  } catch {
    // storage full or blocked, track still works for the session
  }
}

export function rememberCustomRat(rat: RatDatum): void {
  const current = loadCustomRats();
  if (current.some((r) => r.handle === rat.handle)) {
    return;
  }
  saveCustomRats([...current, rat]);
}

export default function RegisterPanel() {
  const rats = useRace((s) => s.rats);
  const setRats = useRace((s) => s.setRats);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const handle = value.trim().toLowerCase();
    if (handle.length === 0 || busy) {
      return;
    }
    if (rats.some((r) => r.handle === handle)) {
      setError("already on the track");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/rats/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      if (!res.ok) {
        setError("rejected, try another handle");
        return;
      }
      const body = (await res.json()) as { rat: RatDatum };
      if (!isRatDatum(body.rat)) {
        setError("bad response, try again");
        return;
      }
      setRats([...rats, body.rat]);
      rememberCustomRat(body.rat);
      setValue("");
    } catch {
      setError("network hiccup, try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pointer-events-auto">
      <div className="flex gap-2">
        <input
          aria-label="github handle"
          className="w-40 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-sm outline-none placeholder:text-white/30 focus:border-cheese"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void submit();
            }
          }}
          placeholder="github handle"
          value={value}
        />
        <button
          className="rounded-full bg-cheese px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          disabled={busy}
          onClick={() => void submit()}
          type="button"
        >
          {busy ? "…" : "join"}
        </button>
      </div>
      {error !== "" && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
