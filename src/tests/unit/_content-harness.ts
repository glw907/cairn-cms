// cairn-cms: shared unit-test harness for the content-routes/nav-routes route-factory cluster.
// Every file in the cluster commits against the same fake GitHub App identity and starts a
// CairnRuntime from the same single-posts-concept skeleton; runtime()/postsConcept() merge a
// file's own overrides over that base, and contentEvent() builds the event shape the factories
// expect, so each test file states only what makes it different rather than re-declaring the
// whole skeleton. Modeled on src/tests/integration/_auth-harness.ts.
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { fieldset } from '../../lib/content/fieldset.js';
import type { Backend } from '../../lib/github/backend.js';
import type { CairnRuntime, ConceptDescriptor } from '../../lib/content/types.js';
import type { CookieJar } from '../../lib/sveltekit/types.js';

export { expectRedirect, expectHttpError } from '../_redirect-assertions.js';

/** The GitHub App identity every content-routes/nav-routes unit test commits against. */
export const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

/** The read/commit backend every event's `locals.backend` rides by default. */
export const backend = makeGithubBackend(REPO, () => Promise.resolve('test-token'));

/** A single dated "posts" concept with no fields, the default every runtime() starts from. */
export function postsConcept(overrides: Partial<ConceptDescriptor> = {}): ConceptDescriptor {
  return {
    id: 'posts',
    label: 'Posts',
    singular: 'Posts',
    dir: 'src/content/posts',
    routing: { routable: true, dated: true, inFeeds: true },
    permalink: '/posts/:slug',
    datePrefix: 'day',
    fields: [],
    schema: fieldset({}),
    summaryFields: [],
    validate: () => ({ ok: true, data: {} }),
    ...overrides,
  };
}

/** A CairnRuntime carrying one posts concept and the shared REPO backend; `overrides` spreads over it. */
export function runtime(overrides: Partial<CairnRuntime> = {}): CairnRuntime {
  return {
    siteName: 'T',
    concepts: [postsConcept()],
    backend: githubApp(REPO),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    vocabulary: [],
    ...overrides,
  };
}

/** The editor literal the majority of this cluster's fixtures commit as. */
export const ED_EDITOR = { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const, capability: 'editor' as const };

/** Options for {@link contentEvent}; every field but `url` is optional and defaults to the
 *  cluster's common fixture shape. */
export interface ContentEventOptions {
  /** The full request URL, including any query string. */
  url: string;
  /** Route params, e.g. `{ concept: 'posts', id: '2026-05-hi' }`. */
  params?: Record<string, string>;
  /** GET by default; explicit only when neither `form` nor `body` implies POST. */
  method?: 'GET' | 'POST';
  /** Form-encodes to a POST body; mutually exclusive with `body`. */
  form?: Record<string, string> | URLSearchParams;
  /** A raw POST body (e.g. a JSON string), for the CSRF-header raw-body actions. */
  body?: BodyInit;
  headers?: Record<string, string>;
  editor?: { email: string; displayName: string; role: 'owner' | 'editor'; capability: 'owner' | 'editor' } | null;
  eventBackend?: Backend;
  cookies?: CookieJar;
  env?: Record<string, unknown>;
}

/** Build a route-factory event: GET by default, POST once `method`, `form`, or `body` says so. */
export function contentEvent(opts: ContentEventOptions) {
  const {
    url,
    params = {},
    form,
    body,
    headers,
    eventBackend = backend,
    editor = ED_EDITOR,
    cookies,
    env = { GITHUB_APP_PRIVATE_KEY_B64: 'x' },
  } = opts;
  const method = opts.method ?? (form !== undefined || body !== undefined ? 'POST' : 'GET');
  const init: RequestInit = { method };
  if (form !== undefined) init.body = form instanceof URLSearchParams ? form : new URLSearchParams(form);
  else if (body !== undefined) {
    init.body = body;
    if (headers) init.headers = headers;
  }
  return {
    url: new URL(url),
    params,
    request: new Request(url, init),
    locals: { editor, backend: eventBackend },
    platform: { env },
    ...(cookies ? { cookies } : {}),
  };
}

/** Serialize a JSON Response, the shape a scripted GitHub-API fetch double returns. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}
