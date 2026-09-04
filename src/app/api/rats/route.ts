import { NextResponse } from "next/server";
import { Effect } from "effect";
import { fetchRats, type RatEntry } from "@/lib/effect/rat-entry";
import { SEED_HANDLES } from "@/lib/seeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const rats: ReadonlyArray<RatEntry> = await Effect.runPromise(
    fetchRats(SEED_HANDLES),
  );
  return NextResponse.json({ rats });
}
