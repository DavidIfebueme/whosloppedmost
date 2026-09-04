import { Config, Context, Effect, Layer, Redacted, Schedule } from "effect";
import { HttpBody, HttpClient, HttpClientRequest } from "@effect/platform";
import { Schema } from "effect";
import {
  GithubAuthError,
  GithubNetworkError,
  GithubRateLimited,
} from "./errors";
import { SearchIssueCount, type GithubHandle } from "./github-schema";

export interface GithubClientShape {
  readonly mergedPrCount: (
    handle: GithubHandle,
  ) => Effect.Effect<number, GithubAuthError | GithubNetworkError | GithubRateLimited>;
}

export const GithubClient = Context.GenericTag<GithubClientShape>(
  "GithubClient",
);

const SEARCH_QUERY = `
  query MergedPrCount($q: String!) {
    search(query: $q, type: ISSUE, first: 1) {
      issueCount
    }
  }
`;

function twelveMonthsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

const retryPolicy = Schedule.exponential("500 millis").pipe(
  Schedule.intersect(Schedule.recurs(3)),
);

export const GithubClientLive = Layer.effect(
  GithubClient,
  Effect.gen(function* () {
    const token = yield* Config.redacted("GH_TOKEN");
    const client = yield* HttpClient.HttpClient;

    const mergedPrCount: GithubClientShape["mergedPrCount"] = (handle) =>
      Effect.gen(function* () {
        const q = `type:pr author:${handle} merged:>${twelveMonthsAgo()}`;
        const body = yield* HttpBody.json({
          query: SEARCH_QUERY,
          variables: { q },
        }).pipe(
          Effect.mapError(
            (cause) =>
              new GithubNetworkError({ reason: `bad body: ${String(cause)}` }),
          ),
        );
        const request = HttpClientRequest.post(
          "https://api.github.com/graphql",
        ).pipe(
          HttpClientRequest.setHeaders({
            authorization: `bearer ${Redacted.value(token)}`,
            "content-type": "application/json",
            "user-agent": "whosloppedmost",
          }),
          HttpClientRequest.setBody(body),
        );

        const response = yield* client.execute(request).pipe(
          Effect.mapError(
            (cause) =>
              new GithubNetworkError({ reason: String(cause) }),
          ),
          Effect.retry(retryPolicy),
        );

        if (response.status === 401) {
          return yield* new GithubAuthError({ reason: "bad token" });
        }
        if (response.status === 403 || response.status === 429) {
          return yield* new GithubRateLimited({ retryAfterSeconds: 60 });
        }
        if (response.status >= 400) {
          return yield* new GithubNetworkError({
            reason: `github status ${response.status}`,
          });
        }

        const json: unknown = yield* response.json.pipe(
          Effect.mapError(
            (cause) =>
              new GithubNetworkError({ reason: `bad json: ${String(cause)}` }),
          ),
        );
        const decoded = yield* Schema.decodeUnknown(SearchIssueCount)(
          json,
        ).pipe(
          Effect.mapError(
            (cause) =>
              new GithubNetworkError({
                reason: `bad shape: ${String(cause)}`,
              }),
          ),
        );
        return decoded.data.search.issueCount;
      });

    return GithubClient.of({ mergedPrCount });
  }),
);
