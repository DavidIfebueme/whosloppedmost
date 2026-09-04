import { NextResponse } from "next/server";
import { Effect, Schema } from "effect";
import { fetchRat, RatsLayer, staleEntry, type RatEntry } from "@/lib/effect/rat-entry";

export const dynamic = "force-dynamic";

const RegisterBody = Schema.Struct({
  handle: Schema.String,
});

export async function POST(request: Request) {
  const raw: unknown = await request.json().catch(() => null);
  const body = await Effect.runPromise(
    Schema.decodeUnknown(RegisterBody)(raw).pipe(
      Effect.mapError(() => null),
      Effect.catchAll(() => Effect.succeed(null)),
    ),
  );
  if (body === null || body.handle.trim().length === 0) {
    return NextResponse.json({ error: "handle required" }, { status: 400 });
  }
  const handle = body.handle.trim().toLowerCase();
  const rat: RatEntry = await Effect.runPromise(
    fetchRat(handle).pipe(
      Effect.provide(RatsLayer),
      Effect.catchAll(() => Effect.succeed(staleEntry(handle))),
    ),
  );
  return NextResponse.json({ rat });
}
