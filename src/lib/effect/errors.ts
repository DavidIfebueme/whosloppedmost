import { Data } from "effect";

export class GithubRateLimited extends Data.TaggedError("GithubRateLimited")<{
  readonly retryAfterSeconds: number;
}> {}

export class GithubAuthError extends Data.TaggedError("GithubAuthError")<{
  readonly reason: string;
}> {}

export class GithubNetworkError extends Data.TaggedError("GithubNetworkError")<{
  readonly reason: string;
}> {}

export class HandleNotFound extends Data.TaggedError("HandleNotFound")<{
  readonly handle: string;
}> {}

export class HandlePrivate extends Data.TaggedError("HandlePrivate")<{
  readonly handle: string;
}> {}

export type DataError =
  | GithubRateLimited
  | GithubAuthError
  | GithubNetworkError
  | HandleNotFound
  | HandlePrivate;
