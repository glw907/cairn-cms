// cairn-cms: a shared builder for the one event shape every route-factory, guard, and action test
// drives (internals-C, Task 5). Kept under helpers/, not unit/ or integration/, since it is
// imported by files in both projects plus component tests, rather than owned by one directory.
import type { CairnEvent, CookieJar } from '../../lib/sveltekit/types.js';

/** A cookie jar that reads nothing and discards every write, the default when a test does not
 *  care about cookies. */
function noopCookies(): CookieJar {
  return { get: () => undefined, set: () => {}, delete: () => {} };
}

/** The fields {@link testEvent} varies per call; every member is optional and defaults to a
 *  working fixture value, so a test states only what makes it different. */
export interface TestEventOverrides {
  /** The full request URL. Defaults to a stable fixture origin. */
  url?: string;
  /** The HTTP method. Defaults to `POST` when `body` is given, `GET` otherwise. */
  method?: string;
  /** Route params, e.g. `{ concept: 'posts', id: '2026-05-hi' }`. Defaults to none. */
  params?: Record<string, string>;
  /** The matched route id, or `null` for an unmatched request (kit's own default). */
  route?: string | null;
  /** A request body (form-encoded or raw); builds the `Request` unless `request` is given. */
  body?: BodyInit;
  /** Extra request headers, meaningful only alongside `body`. */
  headers?: Record<string, string>;
  /** A prebuilt `Request`, bypassing the method/body/headers construction above entirely. */
  request?: Request;
  /** The cookie jar the event carries. Defaults to a no-op jar. */
  cookies?: CookieJar;
  /** `event.setHeaders`. Defaults to a no-op. */
  setHeaders?: (headers: Record<string, string>) => void;
  /** `event.locals`, typed exactly as {@link CairnEvent} declares it. Defaults to empty. */
  locals?: CairnEvent['locals'];
  /**
   * The Worker env bindings under `event.platform.env`. A bag, not `CairnEnv` itself, since a
   * real site's env is `CairnEnv` intersected with its own bindings (media, tidy's Anthropic
   * key), and a test fixture routinely carries one of those extra keys.
   */
  env?: Record<string, unknown>;
}

/**
 * Builds a real, structurally valid {@link CairnEvent} for a test, with typed partial overrides
 * for the members a test usually varies (`params`, `locals`, `platform.env`, `request`,
 * `cookies`).
 *
 * It replaces the bottom-type casts route-factory and action tests reached for previously: a
 * hand-built event literal that omits a required member (`params`, `route`) or narrows a field's
 * type (a bare `Record<string, unknown>` env bag, say) fails the structural check against
 * `CairnEvent`, and casting the whole literal through TypeScript's `never` erased that failure,
 * since `never` is assignable to and from anything. A test built that way can drift out of sync
 * with `CairnEvent`'s real shape with no compiler signal at all. `testEvent` fills every required
 * member with a working default, so a test names only the fields it varies and the compiler still
 * proves the result satisfies `CairnEvent`.
 */
export function testEvent(overrides: TestEventOverrides = {}): CairnEvent {
  const url = overrides.url ?? 'https://t.example/';
  const method = overrides.method ?? (overrides.body !== undefined ? 'POST' : 'GET');
  let request = overrides.request;
  if (!request) {
    const init: RequestInit = { method };
    if (overrides.body !== undefined) {
      init.body = overrides.body;
      if (overrides.headers) init.headers = overrides.headers;
    }
    request = new Request(url, init);
  }
  return {
    url: new URL(url),
    request,
    params: overrides.params ?? {},
    route: { id: overrides.route ?? null },
    cookies: overrides.cookies ?? noopCookies(),
    setHeaders: overrides.setHeaders ?? (() => {}),
    locals: overrides.locals ?? {},
    platform: { env: overrides.env ?? {} },
  };
}
