// cairn-cms: the content routes' shared closure context. createContentRoutesContext builds this
// object once per createContentRoutesInternal call (the backend resolver, the manifest and media-json
// readers, the commit-failure handlers, the tidy client), and every per-domain sibling module
// (content-routes-shell.ts, -list.ts, -entry.ts, -preview.ts, -media.ts, -tidy.ts, -settings.ts,
// -dictionary.ts) closes over it instead of re-deriving these from `runtime`/`deps` itself. This
// is the seam a pure closure-lift produces: the domain modules are unchanged in behavior, only in
// where their shared captures come from.
import type { ActionFailure } from '@sveltejs/kit';
import type { Backend } from '../github/backend.js';
import { emptyManifest, parseManifest, type Manifest } from '../content/manifest.js';
import type { CairnRuntime } from '../content/types.js';
import { validateNavLayout, validateAccessComposition, type ResolvedLayoutNode } from './admin-nav.js';
import { DEFAULT_ROLES } from '../auth/roles.js';
import { normalizePublishActions, type PublishActionEntry } from './publish-actions.js';
import { logCommitFailed, commitFailure, type CommitLogFields } from './commit-log.js';
import type { CairnEvent } from './types.js';
import type { Editor } from '../auth/types.js';
import type { PreviewTokenConfig } from './preview.js';
// Deliberately absent from the imports above: @anthropic-ai/sdk. It is server-only (it carries the
// API-key path and must never reach a browser bundle), and it is an OPTIONAL peer dependency, so a
// static import here would be a build-time resolution every consumer had to satisfy whether or not
// their site ever tidies. The one permitted reach is the dynamic import inside lazyAnthropicClient
// below, and the server-only-deps test guards both halves of that boundary.

/**
 * The effort tier for a model that runs adaptive thinking by default (Sonnet 5 and later), so a
 *  short proofread does not reason at length. Sent only for a model with effort tiers
 *  (content-routes-tidy.ts's `supportsEffort`), never for one without.
 */
export type TidyEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/**
 * The narrow, engine-owned client contract the tidy action calls: correct a text under a system
 *  prompt, and probe a key's health. No `@anthropic-ai/sdk` type reaches this interface (a vendor
 *  field rename stops being a cairn break), and a test injects a fake implementing this shape
 *  directly, with no SDK-mimicking wire body to construct. The real factory
 *  ({@link lazyAnthropicClient}) adapts this contract onto the actual SDK client internally.
 */
export interface TidyClient {
  /**
   * Correct `text` under `system` for `model`, returning the corrected text and a coarse
   *  engine-owned token record. `effort` rides the request only when the resolved model supports
   *  it. The abort signal rides the second argument, mirroring `models.list`'s options shape, so
   *  the request actually cancels when the deadline fires.
   */
  tidy(
    request: { model: string; system: string; text: string; effort?: TidyEffort },
    options?: { signal?: AbortSignal },
  ): Promise<{
    /** The corrected text. Empty when the model returned no text. */
    corrected: string;
    /** Whether the model declined to edit the text (the streaming-classifier intervention). */
    refused: boolean;
    /** The coarse token counts the call spent. */
    tokens: { input: number; output: number };
  }>;
  /**
   * The zero-token key-health probe (save-500-honest-errors): list available models to
   *  confirm the key without spending output tokens. Optional so an existing fake client stubbing
   *  only `tidy` still satisfies this type; `probeTidyKey` (tidy-key-probe.ts) degrades to
   *  'unknown' when a client omits it rather than throwing. The signal rides the second argument,
   *  mirroring `tidy`'s options shape (save-500-hardening), so the probe is bounded by the same
   *  deadline as a tidy call instead of the SDK's own multi-minute default.
   */
  models?: {
    list(params?: { limit?: number }, options?: { signal?: AbortSignal }): Promise<unknown>;
  };
}

/**
 * The Anthropic SDK's own wire shape for a Messages create call, kept internal to
 *  {@link lazyAnthropicClient} so a vendor field rename or a parameter reshape stays contained to
 *  this adapter rather than becoming a cairn break. Never exported.
 */
interface AnthropicWireClient {
  messages: {
    create(
      body: {
        model: string;
        max_tokens: number;
        system: string;
        messages: { role: 'user'; content: string }[];
        output_config?: { effort?: TidyEffort };
      },
      options?: { signal?: AbortSignal },
    ): Promise<{
      content: { type: string; text?: string }[];
      model: string;
      stop_reason: string | null;
      usage: { input_tokens: number; output_tokens: number };
    }>;
  };
  models: {
    list(params?: { limit?: number }, options?: { signal?: AbortSignal }): Promise<unknown>;
  };
}

/**
 * The `max_tokens` ceiling the adapter sends on every tidy call: comfortably exceeds the input
 *  token count so a proofread is never capped mid-response. A proofread runs at roughly input
 *  length, and the tidy action's own request cap (content-routes-tidy.ts's `MAX_TIDY_CHARS`,
 *  24,000 characters) is at most about 8,000 input tokens even at Sonnet 5's higher-density
 *  tokenizer, so this ceiling stays generous. Internal: the public {@link TidyClient} contract
 *  carries no vendor-shaped `max_tokens` field.
 */
const MAX_OUTPUT_TOKENS = 16_000;

/**
 * Thrown by the default tidy client when `@anthropic-ai/sdk` cannot be imported, which on a real
 *  site means the optional peer is not installed. It stays distinct from every other tidy failure
 *  because the remedy differs: an auth or model error is the site's key or Anthropic's problem,
 *  while this one is a missing install the developer fixes with one command, so the tidy action
 *  answers it with its own refusal rather than the retryable "try again" voice. Engine-internal
 *  (no package subpath re-exports it), so the action's `instanceof` test is sound: only this
 *  module ever constructs one.
 */
export class TidySdkMissingError extends Error {
  constructor(cause: unknown) {
    super('@anthropic-ai/sdk is not installed.', { cause });
    this.name = 'TidySdkMissingError';
  }
}

/**
 * The default tidy client: the real SDK client, reached lazily so an uninstalled optional peer
 *  surfaces as a refusal at call time instead of a module-resolution failure at build time. The
 *  returned object satisfies {@link TidyClient} synchronously, which is what keeps
 *  `ContentRoutesContext.anthropicClient` a plain synchronous factory and an injected fake
 *  interchangeable with this default. Each method awaits the import and builds a client from the
 *  key, so nothing is constructed until a call actually arrives. A failed import becomes
 *  {@link TidySdkMissingError}, which the tidy action maps to its install-instruction refusal and
 *  `probeTidyKey` degrades to an 'unknown' key verdict.
 */
function lazyAnthropicClient(opts: { apiKey: string }): TidyClient {
  async function connect(): Promise<AnthropicWireClient> {
    // The rejection handler wraps the import expression alone, never the construction below, so it
    // cannot be widened by accident: a constructor failure from a real, installed SDK is not a
    // missing install and must keep its own error for tidyClientErrorStatus to classify.
    const { default: Anthropic } = await import('@anthropic-ai/sdk').catch((err: unknown) => {
      throw new TidySdkMissingError(err);
    });
    // The SDK client satisfies AnthropicWireClient structurally; the cast names that to the compiler.
    return new Anthropic({ apiKey: opts.apiKey }) as unknown as AnthropicWireClient;
  }
  return {
    // The adapter: translate the narrow engine-owned request into the SDK's wire body, and its wire
    // response back into the narrow engine-owned result. Every vendor-shaped field (max_tokens,
    // output_config, stop_reason, usage.*) stays contained to this function.
    tidy: async (request, options) => {
      const message = await (await connect()).messages.create(
        {
          model: request.model,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: request.system,
          messages: [{ role: 'user', content: request.text }],
          ...(request.effort ? { output_config: { effort: request.effort } } : {}),
        },
        options,
      );
      const corrected = message.content
        .filter((block) => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text ?? '')
        .join('');
      return {
        corrected,
        refused: message.stop_reason === 'refusal',
        tokens: { input: message.usage.input_tokens, output: message.usage.output_tokens },
      };
    },
    models: {
      list: async (params, options) => (await connect()).models.list(params, options),
    },
  };
}

/**
 * Read an HTTP status off a thrown tidy-client error, structurally: the Anthropic SDK's
 *  `APIError` (and its subclasses, `AuthenticationError`/`PermissionDeniedError`) carry a numeric
 *  `status`, and a test's injected error can shape the same field without importing the SDK's
 *  class. Returns undefined for anything else (a network failure, a plain `Error`, an abort),
 *  which the caller treats as a retryable, non-auth failure.
 */
export function tidyClientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const status = (err as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

export interface ContentRoutesConfig {
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
   * A per-request filter over the site's whole arranged sidebar, run in the shell payload build
   *  after every built-in gate (engine capability, `ownerOnly`, declarative `roles`) has already
   *  applied. It receives the resolved `navLayout`'s top-level `items` (sections and loose
   *  entries, engine references included; a declared layout's arrangement or, absent one, today's
   *  default) and the signed-in editor, and returns the items to render, same shape. `fallback`,
   *  the trailing group of engine screens the layout never referenced, never passes through this
   *  seam: it is engine-only and already gated, and a site hides one of its own doors with
   *  `hidden: true` inside its own `navLayout` instead. A site whose own gating lives outside
   *  cairn (a role stored in its own D1, say) uses this to hide a section or an item from an
   *  editor who fails that check, rather than teasing a link the route then refuses. Awaited fresh
   *  on every request; the engine never caches its result. Absent, the shell renders exactly the
   *  arranged, gated tree, unchanged from before this seam existed.
   */
  navFilter?: (
    items: ResolvedLayoutNode[],
    ctx: { editor: Editor; event: CairnEvent },
  ) => ResolvedLayoutNode[] | Promise<ResolvedLayoutNode[]>;
  /**
   * Per-session pending-work counts for the shell's nav badges (a queue of unread asset
   *  requests, say), awaited fresh every request and never cached by the engine, exactly once,
   *  after nav resolution and `navFilter` have both already run. The site computes items from its
   *  own domain queues; the engine then drops anything the session cannot act on before any
   *  rendering or summing, so a count never leaks to a role that cannot see its nav entry (counts
   *  are information; CWE-200). An item is dropped when its `count` is non-positive, when its
   *  `href` matches no visible nav entry (an engine door or a site entry, resolved-and-filtered
   *  set), or when it duplicates an earlier item's `href` (first wins, silently). Absent, the
   *  shell payload serializes an empty record and renders exactly as before this seam existed. A
   *  dep that throws fails the shell load loudly; the site owns its own callback's errors.
   */
  attention?: (ctx: {
    editor: Editor;
    event: CairnEvent;
  }) => AttentionItem[] | Promise<AttentionItem[]>;
  /**
   * The preview-link lifetime `previewMintAction` mints against. Absent resolves to
   *  {@link PreviewTokenConfig}'s own default (seven days).
   */
  preview?: PreviewTokenConfig;
}

/**
 * One pending-work badge a site's `attention` dep contributes for one nav entry. The engine drops
 *  an item whose `count` is non-positive, whose `href` matches no visible nav entry, or that
 *  duplicates an earlier item's `href`; a surviving item's `label` defaults to `'pending items'`.
 */
export interface AttentionItem {
  /** The admin route whose nav entry carries the pill; also the click-through target. */
  href: string;
  /** Pending actionable count. Zero or negative items are dropped. */
  count: number;
  /** Accessible noun for the count ("pending requests"); defaults to `'pending items'`. */
  label?: string;
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
 *  the tidy client and its deadline, and the small set of helpers (backend resolution, manifest and
 *  media-json reads, dictionary path, commit-failure handling) more than one domain needs. Built
 *  once by {@link createContentRoutesContext}; module-local, never exported from the package.
 */
export interface ContentRoutesContext {
  runtime: CairnRuntime;
  deps: ContentRoutesConfig;
  /** The developer's publish-actions config, validated once at construction (server start). */
  publishActions: PublishActionEntry[];
  /**
   * Build the Anthropic client for the tidy action from the resolved API key. The real SDK client,
   *  or a test's injected fake (`deps.tidy.client`).
   */
  anthropicClient: (opts: { apiKey: string }) => TidyClient;
  /** The tidy action's own request deadline in milliseconds. */
  tidyTimeoutMs: number;
  /**
   * Resolve the live content backend for one request. The dev double's `event.locals.cairnBackend`
   *  wins, else the production `runtime.backend.connect(env)`.
   */
  resolveBackend(event: CairnEvent): Backend;
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
    fields: CommitLogFields,
    err: unknown,
    event?: 'commit.failed' | 'publish.failed',
  ): void;
  /**
   * The shared commit catch for the entry and media actions: log the failure, then answer a
   *  conflict in place with `fail(409, payload)` carrying the caller's own screen failure shape,
   *  and rethrow anything else.
   */
  commitFailure<T>(
    fields: CommitLogFields,
    err: unknown,
    payload: T,
    opts?: { event?: 'commit.failed' | 'publish.failed' },
  ): ActionFailure<T>;
}

/**
 * Build the shared closure context for one createContentRoutesInternal call (the public
 *  createContentRoutes is a thin wrapper around it, so this runs once per createContentRoutes
 *  call too): validate a declared navLayout, resolve the tidy client and its deadline from the
 *  injectable deps, and bind the backend/manifest/media-json/dictionary/commit-failure helpers
 *  over `runtime`. Every per-domain sibling factory takes the returned object as its one
 *  argument.
 */
export function createContentRoutesContext(runtime: CairnRuntime, config: ContentRoutesConfig = {}): ContentRoutesContext {
  // Validate a declared navLayout the fail-loud-at-startup way, so a bad screen reference or an
  // unresolvable role throws here rather than at request time. Undeclared (the common case) skips
  // validation entirely; the resolver synthesizes the default arrangement for that case.
  if (runtime.navLayout) {
    validateNavLayout(runtime.navLayout, {
      conceptIds: runtime.concepts.map((concept) => concept.id),
      navMenuConfigured: runtime.navMenu !== undefined,
      roleNames: Object.keys(runtime.roles ?? DEFAULT_ROLES),
    });
  }
  // Validate a declared access map the same fail-loud-at-startup way: a screen-id key that names
  // neither a real concept nor a fixed engine screen, or an href key that collides with a built-in
  // route, throws here rather than silently never gating (or never being reachable) at request
  // time. Undeclared (the common case) skips validation entirely, the same as navLayout.
  if (runtime.access) {
    validateAccessComposition(runtime.access, { conceptIds: runtime.concepts.map((concept) => concept.id) });
  }
  // Validate the developer's publishActions once at construction, the same fail-loud posture: a
  // blank field or an unknown concept throws here rather than silently rendering no link (or the
  // wrong one) after a publish. editLoad resolves this per request into the templated links for the
  // one entry that just went live.
  const publishActions = normalizePublishActions(runtime.publishActions, runtime.concepts);

  /**
   * Resolve the live content backend for one request. The dev double's `event.locals.cairnBackend`
   *  wins, else the production `runtime.backend.connect(env)`. A test rides the same
   *  `locals.cairnBackend` seam the dev double uses, so the read and commit paths run with no real
   *  token mint. The GitHub provider mints and caches its installation token lazily behind
   *  `connect`, so a per-request resolve re-signs only on a cache miss.
   */
  function resolveBackend(event: CairnEvent): Backend {
    return event.locals.cairnBackend ?? runtime.backend.connect(event.platform?.env ?? {});
  }

  // Tests (and the packaged dev backend's deterministic stub) inject a fake through
  // config.tidy.client, so messages.create is stubbed and no network call or real key is ever needed.
  // Absent one, the default above resolves the SDK lazily, on the first call rather than at import.
  const anthropicClient = config.tidy?.client ?? lazyAnthropicClient;
  const tidyTimeoutMs = config.tidy?.timeoutMs ?? DEFAULT_TIDY_TIMEOUT_MS;

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
    deps: config,
    publishActions,
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
