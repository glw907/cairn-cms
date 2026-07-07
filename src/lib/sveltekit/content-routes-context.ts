// cairn-cms: the content routes' shared closure context. createContentRoutesContext builds this
// object once per createContentRoutes call (the backend resolver, the manifest and media-json
// readers, the commit-failure handlers, the tidy client, and the validated adminNav), and every
// per-domain sibling module (content-routes-core.ts, -media.ts, -tidy.ts, -settings.ts,
// -dictionary.ts) closes over it instead of re-deriving these from `runtime`/`deps` itself. This is
// the seam a pure closure-lift produces: the domain modules are unchanged in behavior, only in
// where their shared captures come from.
import type { Backend } from '../github/backend.js';
import type { BackendEnv } from '../github/credentials.js';
import { emptyManifest, parseManifest, type Manifest } from '../content/manifest.js';
import type { CairnRuntime } from '../content/types.js';
import { normalizeAdminNav, type ResolvedNavItem } from './admin-nav.js';
import { logCommitFailed, commitFailure } from './commit-log.js';
import type { CookieJar, EventBase } from './types.js';
import type { Editor } from '../auth/types.js';
// Server-only: the Anthropic SDK ships the API-key path and never reaches a browser bundle. It is
// imported only here (a Worker module no component imports statically), and the server-only-deps test
// guards that boundary. The default export is the Anthropic client class; the structural TidyClient
// type below keeps the action's surface small and the test seam injectable, so the SDK's deep types
// never leak into a public signature.
import Anthropic from '@anthropic-ai/sdk';

/** The structural event the content routes read; a real SvelteKit RequestEvent satisfies it. */
export interface ContentEvent extends EventBase<BackendEnv> {
  params: Record<string, string>;
  /**
   * SvelteKit's cookie jar. The layout load reads the persisted admin theme and issues the CSRF
   *  token. Optional for non-route callers.
   */
  cookies?: CookieJar;
}

/**
 * The minimal Anthropic client surface the tidy action uses, typed structurally so the SDK's deep
 *  generics never reach a public signature and so the integration test can inject a fake whose
 *  `messages.create` it stubs. The real factory builds `new Anthropic({ apiKey })`, which satisfies
 *  this shape. The success path reads only the text blocks, the model, the stop reason, and the usage
 *  counts.
 */
export interface TidyClient {
  messages: {
    create(
      body: {
        model: string;
        max_tokens: number;
        system: string;
        messages: { role: 'user'; content: string }[];
      },
      // The SDK signature is create(body, options). The abort signal belongs in the second argument
      // (RequestOptions), not the body, so the request actually cancels when the deadline fires.
      options?: { signal?: AbortSignal },
    ): Promise<{
      content: { type: string; text?: string }[];
      model: string;
      stop_reason: string | null;
      usage: { input_tokens: number; output_tokens: number };
    }>;
  };
}

export interface ContentRoutesDeps {
  /** The tidy action's injectable dependencies, grouped since both members shape one call. */
  tidy?: {
    /**
     * Build the Anthropic client for the tidy action from the resolved API key. Defaults to the
     *  real SDK client. Injected in tests so `messages.create` is stubbed and no network call (or
     *  real key) is ever needed. The factory runs only after the key is read from the env, so a
     *  disabled or unconfigured site never constructs a client.
     */
    client?: (opts: { apiKey: string }) => TidyClient;
    /**
     * The tidy action's own request deadline in milliseconds, set shorter than the platform limit
     *  so a slow model call becomes a clean retryable fail(502) rather than a platform timeout.
     *  Defaults to {@link DEFAULT_TIDY_TIMEOUT_MS}. Overridable in tests to assert the deadline
     *  path without waiting.
     */
    timeoutMs?: number;
  };
  /**
   * A per-request filter over the site's own custom adminNav entries, run in the shell payload
   *  build after the engine's own role filter (`filterNavByRole`) has already dropped any
   *  `ownerOnly` entry the signed-in editor cannot see. It receives only the custom nav items
   *  (the built-in Core section, Library, Tags, and Settings entries never pass through this
   *  seam) and the signed-in editor, and returns the items to render, section-shaped the same
   *  way. A site whose own gating lives outside cairn (a role stored in its own D1, say) uses
   *  this to hide a section from an editor who fails that check, rather than teasing a link the
   *  route then refuses. Awaited fresh on every request; the engine never caches its result.
   *  Absent, the shell renders exactly the role-filtered set, unchanged from before this seam
   *  existed.
   */
  navFilter?: (
    items: ResolvedNavItem[],
    ctx: { editor: Editor; event: ContentEvent },
  ) => ResolvedNavItem[] | Promise<ResolvedNavItem[]>;
}

/**
 * The Worker-side request deadline for the tidy model call: 30 seconds. A tidy call to Sonnet on a
 * full entry can run many seconds, so the action bounds it with an AbortSignal and maps the overrun to
 * a retryable fail(502). This sits well under Cloudflare's per-request wall-clock ceiling (a Worker
 * invocation can run far longer, but a single subrequest left open near that ceiling would surface as a
 * platform timeout the action could not shape into a clean retry). 30s comfortably covers a proofread
 * of the bounded input (see MAX_TIDY_CHARS in content-routes-tidy.ts) while leaving headroom under the
 * platform limit.
 */
const DEFAULT_TIDY_TIMEOUT_MS = 30_000;

/**
 * The shared captures every content-routes domain module closes over: the resolved runtime and deps,
 *  the validated adminNav, the tidy client and its deadline, and the small set of helpers (backend
 *  resolution, manifest and media-json reads, dictionary path, commit-failure handling) more than one
 *  domain needs. Built once by {@link createContentRoutesContext}; module-local, never exported from
 *  the package.
 */
export interface ContentRoutesContext {
  runtime: CairnRuntime;
  deps: ContentRoutesDeps;
  /** The developer's custom sidebar entries, validated once at construction (server start). */
  adminNav: ResolvedNavItem[];
  /**
   * Build the Anthropic client for the tidy action from the resolved API key. The real SDK client,
   *  or a test's injected fake (`deps.tidy.client`).
   */
  anthropicClient: (opts: { apiKey: string }) => TidyClient;
  /** The tidy action's own request deadline in milliseconds. */
  tidyTimeoutMs: number;
  /**
   * Resolve the live content backend for one request. The dev double's `event.locals.backend`
   *  wins, else the production `runtime.backend.connect(env)`.
   */
  resolveBackend(event: ContentEvent): Backend;
  /**
   * Main's manifest, parsed. A missing file starts empty (a fresh repo before the first commit).
   *  Always read from main: pending branches carry no manifest copy.
   */
  readManifest(backend: Backend): Promise<Manifest>;
  /**
   * Parse a committed media.json body to a plain value, degrading a missing or corrupt file to
   *  null (an empty manifest).
   */
  parseMediaJson(raw: string | null): unknown;
  /** The repo-relative personal-dictionary path, defaulting to the `.cairn/` content root. */
  dictionaryFilePath(): string;
  /**
   * Log a failed commit: a conflict is the expected last-writer-wins outcome, so it warns with a
   *  reason; any other error is unexpected and logs at error with the stringified cause.
   */
  logCommitFailed(
    fields: { concept: string; id: string; editor: string },
    err: unknown,
    event?: 'commit.failed' | 'publish.failed',
  ): void;
  /**
   * The shared commit catch for the entry and media actions: log the failure, bounce a conflict
   *  back to `page` with `message` as the inline error, and rethrow anything else.
   */
  commitFailure(
    fields: { concept: string; id: string; editor: string },
    err: unknown,
    page: string,
    message: string,
    opts?: { event?: 'commit.failed' | 'publish.failed'; query?: string },
  ): never;
}

/**
 * Build the shared closure context for one createContentRoutes call: validate the developer's
 *  custom adminNav, resolve the tidy client and its deadline from the injectable deps, and bind the
 *  backend/manifest/media-json/dictionary/commit-failure helpers over `runtime`. Every per-domain
 *  sibling factory takes the returned object as its one argument.
 */
export function createContentRoutesContext(runtime: CairnRuntime, deps: ContentRoutesDeps = {}): ContentRoutesContext {
  // Validate the developer's custom adminNav once at construction (server start), so a bad icon name
  // or a colliding href throws here rather than per request. The shell payload role-filters this set.
  const adminNav = normalizeAdminNav(runtime.adminNav, runtime.concepts);

  /**
   * Resolve the live content backend for one request. The dev double's `event.locals.backend`
   *  wins, else the production `runtime.backend.connect(env)`. A test rides the same
   *  `locals.backend` seam the dev double uses, so the read and commit paths run with no real
   *  token mint. The GitHub provider mints and caches its installation token lazily behind
   *  `connect`, so a per-request resolve re-signs only on a cache miss.
   */
  function resolveBackend(event: ContentEvent): Backend {
    return event.locals.backend ?? runtime.backend.connect(event.platform?.env ?? {});
  }

  // The default Anthropic factory builds the real SDK client from the resolved key. Tests inject a fake
  // (deps.tidy.client) so messages.create is stubbed and no network call or real key is ever needed. The
  // SDK client satisfies TidyClient structurally; the cast names that to the compiler.
  const anthropicClient =
    deps.tidy?.client ?? ((opts: { apiKey: string }) => new Anthropic({ apiKey: opts.apiKey }) as unknown as TidyClient);
  const tidyTimeoutMs = deps.tidy?.timeoutMs ?? DEFAULT_TIDY_TIMEOUT_MS;

  /**
   * Main's manifest, parsed. A missing file starts empty (a fresh repo before the first commit).
   *  Always read from main: pending branches carry no manifest copy.
   */
  async function readManifest(backend: Backend): Promise<Manifest> {
    const raw = await backend.readFile(runtime.manifestPath, backend.defaultBranch);
    return raw === null ? emptyManifest() : parseManifest(raw);
  }

  /**
   * Parse a committed media.json body to a plain value for parseMediaManifest, degrading a missing
   *  or corrupt file to null (an empty manifest). The committed file is always our own serialization,
   *  so the catch only guards a hand-edited or truncated file rather than a normal path.
   */
  function parseMediaJson(raw: string | null): unknown {
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * The repo-relative personal-dictionary path, defaulting a hand-built runtime that omits it to the
   *  same `.cairn/` content root the manifests use. composeRuntime always fills `dictionaryPath`.
   */
  function dictionaryFilePath(): string {
    return runtime.dictionaryPath ?? 'src/content/.cairn/dictionary.txt';
  }

  return {
    runtime,
    deps,
    adminNav,
    anthropicClient,
    tidyTimeoutMs,
    resolveBackend,
    readManifest,
    parseMediaJson,
    dictionaryFilePath,
    logCommitFailed,
    commitFailure,
  };
}
