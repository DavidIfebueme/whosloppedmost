import { Effect, Schema } from "effect";
import type { ParseError } from "effect/ParseResult";

export const Handle = Schema.NonEmptyString.pipe(
  Schema.maxLength(39),
  Schema.pattern(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/),
  Schema.brand("GithubHandle"),
);

export type GithubHandle = typeof Handle.Type;

export const SearchIssueCount = Schema.Struct({
  data: Schema.Struct({
    search: Schema.Struct({
      issueCount: Schema.Number,
    }),
  }),
});

export function decodeHandle(
  input: string,
): Effect.Effect<GithubHandle, ParseError> {
  return Schema.decodeUnknown(Handle)(input);
}
