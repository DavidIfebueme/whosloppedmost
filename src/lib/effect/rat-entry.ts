import { Effect, Layer } from "effect";
import { NodeHttpClient } from "@effect/platform-node";
import { GithubClient, GithubClientLive } from "./github-client";
import { decodeHandle } from "./github-schema";
import { distanceToLaps, scoreToDistance } from "@/lib/scoring";

export interface RatEntry {
  readonly handle: string;
  readonly mergedPrs: number;
  readonly distance: number;
  readonly laps: number;
  readonly stale: boolean;
}

export function staleEntry(handle: string): RatEntry {
  return { handle, mergedPrs: 0, distance: 0, laps: 0, stale: true };
}

export function liveEntry(handle: string, mergedPrs: number): RatEntry {
  const distance = scoreToDistance(mergedPrs);
  return {
    handle,
    mergedPrs,
    distance,
    laps: distanceToLaps(distance),
    stale: false,
  };
}

export function fetchRat(handle: string) {
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

export const RatsLayer = Layer.provide(
  GithubClientLive,
  NodeHttpClient.layer,
);

export function fetchRats(handles: ReadonlyArray<string>) {
  return Effect.forEach(handles, fetchRat, { concurrency: 3 }).pipe(
    Effect.provide(RatsLayer),
    Effect.catchAll(() => Effect.succeed(handles.map(staleEntry))),
  );
}
