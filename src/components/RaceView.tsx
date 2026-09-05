"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRace, type CameraView } from "@/store/race";

const RaceScene = dynamic(() => import("@/components/RaceScene"), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-void">
      <p className="text-sm text-white/60">warming up the wheel…</p>
    </main>
  ),
});

function isCameraView(value: string): value is CameraView {
  return value === "galaxy" || value === "pits" || value === "rat";
}

export default function RaceView() {
  const requestView = useRace((s) => s.requestView);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view") ?? "";
    if (isCameraView(view)) {
      requestView(view);
    }
  }, [requestView]);

  return <RaceScene />;
}
