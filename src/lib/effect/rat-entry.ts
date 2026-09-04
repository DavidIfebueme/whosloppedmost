import { Effect, Layer, Schema } from "effect";
import { NodeHttpClient } from "@effect/platform-node";
import { GithubClient, GithubClientLive } from "./github-client";
import { decodeHandle } from "./github-schema";
import { distanceToLaps, scoreToDistance } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase/server";

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
  return Effect.catchAll(
    Effect.forEach(handles, fetchRatCached, { concurrency: 3 }),
    () => Effect.succeed(handles.map(staleEntry)),
  );
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const CachedRow = Schema.Struct({
  merged_prs: Schema.Number,
  fetched_at: Schema.String,
});

function readCache(handle: string) {
  return Effect.catchAll(
    Effect.tryPromise({
      try: async () => {
        const db = getSupabaseAdmin();
        const { data, error } = await db
          .from("score_cache")
          .select("merged_prs,fetched_at")
          .eq("handle", handle)
          .maybeSingle();
        if (error !== null || data === null) {
          return null;
        }
        return Schema.decodeUnknownSync(CachedRow)(data);
      },
      catch: () => "cache-miss" as const,
    }),
    () => Effect.succeed(null),
  );
}

function writeCache(handle: string, mergedPrs: number) {
  const attempt = Effect.tryPromise({
    try: async () => {
      const db = getSupabaseAdmin();
      await db
        .from("handles")
        .upsert({ handle, source: "auto" }, { onConflict: "handle" });
      await db.from("score_cache").upsert(
        {
          handle,
          merged_prs: mergedPrs,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "handle" },
      );
    },
    catch: (cause) => cause,
  });
  return Effect.catchAll(attempt, () => Effect.succeed(undefined));
}

export function fetchRatCached(handle: string) {
  return Effect.flatMap(readCache(handle), (cached) => {
    if (
      cached !== null &&
      Date.now() - Date.parse(cached.fetched_at) < CACHE_TTL_MS
    ) {
      return Effect.succeed(liveEntry(handle, cached.merged_prs));
    }
    const miss = Effect.flatMap(fetchRat(handle), (entry) => {
      if (entry.stale) {
        return Effect.succeed(entry);
      }
      return Effect.as(writeCache(handle, entry.mergedPrs), entry);
    }).pipe(
      Effect.provide(RatsLayer),
      Effect.catchAll(() => Effect.succeed(staleEntry(handle))),
    );
    return miss;
  });
}
