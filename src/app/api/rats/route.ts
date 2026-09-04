import { NextResponse } from "next/server";
import { Effect, Layer } from "effect";
import { NodeHttpClient } from "@effect/platform-node";
import { GithubClient, GithubClientLive } from "@/lib/effect/github-client";
import { decodeHandle } from "@/lib/effect/github-schema";
import { distanceToLaps, scoreToDistance } from "@/lib/scoring";
import { SEED_HANDLES } from "@/lib/seeds";

export const dynamic = "force-dynamic";

interface RatEntry {
  readonly handle: string;
  readonly mergedPrs: number;
  readonly distance: number;
  readonly laps: number;
  readonly stale: boolean;
}

function staleEntry(handle: string): RatEntry {
  return { handle, mergedPrs: 0, distance: 0, laps: 0, stale: true };
}

function liveEntry(handle: string, mergedPrs: number): RatEntry {
  const distance = scoreToDistance(mergedPrs);
  return {
    handle,
    mergedPrs,
    distance,
    laps: distanceToLaps(distance),
    stale: false,
  };
}

function fetchRat(handle: string) {
  return decodeHandle(handle).pipe(
    Effect.flatMap((decoded) =>
      Effect.flatMap(GithubClient, (client) =>
        Effect.match(client.mergedPrCount(decoded), {
          onFailure: () => staleEntry(handle),
          onSuccess: (mergedPrs) => liveEntry(handle, mergedPrs),
        }),
      ),
    ),
    Effect.catchAll(() => Effect.succeed(staleEntry(handle))),
  );
}

const RatsLayer = Layer.provide(GithubClientLive, NodeHttpClient.layer);

const program = Effect.forEach(SEED_HANDLES, fetchRat, {
  concurrency: 3,
}).pipe(
  Effect.provide(RatsLayer),
  Effect.catchAll(() =>
    Effect.succeed(SEED_HANDLES.map(staleEntry)),
  ),
);

export async function GET() {
  const rats = await Effect.runPromise(program);
  return NextResponse.json({ rats });
}
