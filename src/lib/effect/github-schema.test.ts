import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { decodeHandle } from "./github-schema";

describe("decodeHandle", () => {
  it("accepts valid github handles", () => {
    const handle = Effect.runSync(decodeHandle("steipete"));
    expect(handle).toBe("steipete");
  });

  it("rejects empty and oversized handles", () => {
    expect(() => Effect.runSync(decodeHandle(""))).toThrow();
    expect(() =>
      Effect.runSync(decodeHandle("a".repeat(40)))
    ).toThrow();
  });
});
