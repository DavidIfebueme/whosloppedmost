"use client";

import dynamic from "next/dynamic";

const RaceScene = dynamic(() => import("@/components/RaceScene"), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-void">
      <p className="text-sm text-white/60">warming up the wheel…</p>
    </main>
  ),
});

export default function RaceView() {
  return <RaceScene />;
}
