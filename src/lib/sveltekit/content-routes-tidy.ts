// cairn-cms: the tidy (LLM copy-edit) action. createTidyActions closes over the shared
// ContentRoutesContext (content-routes-context.ts), built once per call by
// createContentRoutesInternal (the public createContentRoutes is a thin wrapper around it),
// reusing the context's resolved Anthropic client and request deadline.
import { fail, type ActionFailure } from '@sveltejs/kit';
import { DEFAULT_TIDY_MODEL, resolveTidyConventions } from '../nav/site-config.js';
import { log } from '../log/index.js';
import { requireEditor, requireEngineAccess, requireCookieJar } from './guard.js';
import { validateCsrfHeader } from './csrf.js';
import { buildTidyPrompt } from './tidy-prompt.js';
import { tidyClientErrorStatus, TidySdkMissingError } from './content-routes-context.js';
import { markKeyHealthy, markKeyUnhealthy } from './tidy-key-health.js';
import type { ContentRoutesContext, TidyClient } from './content-routes-context.js';
import type { CairnEvent } from './types.js';

/**
 * The successful tidy outcome (spec 2.1): the corrected markdown, the model that produced it, and the
 * token usage. The diff is computed on the client (Task 12), so the server returns the plain text and
 * commits nothing. Retired from the public surface (4b, Task 1); the module-level export stays,
 * since `tidyAction`'s return type composes into `createContentRoutesInternal`
 * (`content-routes.ts`, a different module), which the `.d.ts` emitter must be able to name.
 */
export interface TidyResult {
  corrected: string;
  model: string;
  tokens: { input: number; output: number };
}

/**
 * A refused tidy: `fail(403)` on a failed CSRF check, `fail(503)` when tidy is disabled, the API
 * key is missing, the optional `@anthropic-ai/sdk` peer is not installed, Anthropic rejects the key
 * outright (401/403, a non-retryable auth failure, distinct from the retryable model errors below),
 * or Anthropic rejects the request itself (400 `invalid_request_error`, typically an unsupported
 * `tidy.model` setting, also non-retryable), `fail(413)` for an over-long body, `fail(502)` for a
 * deadline overrun, an abort, or a model error (rate limit, overload, 5xx, network; all retryable),
 * `fail(422)` for a model refusal, `fail(400)` for a malformed body. Just the one-line summary; the
 * action commits nothing, so a refusal can never corrupt the entry.
 */
export interface TidyFailure {
  error: string;
}

/**
 * The input cap for a single tidy request: 24000 characters (at most about 8,000 under Sonnet 5's
 * tokenizer). A proofread runs at roughly input length, so this stays comfortably inside the 30s
 * deadline; a longer entry refuses with fail(413) and the author tidies a selection instead. The
 * cap is enforced BEFORE the model call, so an over-long body never spends a token or risks the
 * deadline.
 */
const MAX_TIDY_CHARS = 24_000;

/**
 * Model families that reject `output_config.effort` outright (a 400 `invalid_request_error`): only
 * a model with adaptive-thinking effort tiers accepts it. Kept as the one list `supportsEffort`
 * consults, so a newly offered model needs one edit here rather than a scattered check.
 */
const EFFORT_TIER_PREFIXES = ['claude-sonnet-5', 'claude-opus-5', 'claude-sonnet-4-6'];

/** Matches `claude-opus-4-<n>`, capturing the minor version so `supportsEffort` can floor it at 4.6. */
const OPUS_4_MODEL = /^claude-opus-4-(\d+)/;

/**
 * Whether `model` supports the effort tier the tidy call sends as `output_config: { effort: 'low' }`.
 * Sonnet 5, Opus 5, Sonnet 4.6, and Opus 4.6 or later run adaptive thinking by default and accept the
 * parameter; `claude-haiku-4-5` and any other model (including an unrecognized or future id) do not,
 * and the Messages API answers `output_config` on one of those with a 400. Matching by prefix keeps a
 * dated snapshot id (for example `claude-sonnet-5-20260115`) resolving the same as its family name.
 */
export function supportsEffort(model: string): boolean {
  if (EFFORT_TIER_PREFIXES.some((prefix) => model.startsWith(prefix))) return true;
  const opus4 = OPUS_4_MODEL.exec(model);
  return opus4 !== null && Number(opus4[1]) >= 6;
}

/** Build the tidy action, closed over the shared content-routes context. */
export function createTidyActions(ctx: ContentRoutesContext) {
  /**
   * Tidy: a light LLM copy-edit of the author's markdown (spec 2.1). The first remote model call in
   *  the library, so this is the highest-blast-radius server action: untrusted content and the Anthropic
   *  API key. The transport mirrors the media raw-body actions (a `text/plain` POST carrying JSON
   *  `{ text, scope }`, the CSRF token in `X-Cairn-CSRF`, the response deserialized by the client), with
   *  abort/timeout/deadline the media calls did not need: a tidy call to Sonnet on a full entry can run
   *  many seconds.
   *
   *  Gate order (every refusal happens before the next step, so a refused request spends nothing):
   *    1. validateCsrfHeader FIRST (the header witness is the authority for a raw-body POST).
   *    2. requireEditor (an expired session throws the manual-redirect 303 the client reads as
   *       status-0; a none-capability session throws a real 403 instead).
   *    3. Read the key and config; refuse fail(503) if tidy is disabled or the key is missing.
   *    4. Parse and bound the body; refuse fail(400) on malformed JSON, fail(413) on an over-long text.
   *    5. Only then build the prompt and call the model, bounded by the Worker deadline.
   *
   *  The untrusted text rides as the user message, never interpolated into the system prompt; the
   *  prompt's injection framing (Task 10) treats it as data. The API key never leaves the action: it is
   *  not returned and not logged, and the log line carries no content. The action commits NOTHING, so a
   *  failed, aborted, or refused tidy can never corrupt the entry; the diff is computed on the client
   *  (Task 12), so the server stays a thin model-call boundary.
   *
   *  A throw out of the client call classifies into one of two voices (save-500-honest-errors,
   *  Task 4). Not retryable, and so answered without the "Try again." copy: an auth/permission
   *  failure (401/403), where the key itself is the problem, which returns the calm copy naming
   *  the site developer and marks the shared key-health cache unhealthy (Task 5) so the next edit
   *  load hides the Tidy button rather than offering a control that will fail again; a missing
   *  `@anthropic-ai/sdk`, where the optional peer was never installed, which returns the install
   *  command and leaves the cache alone; and a 400 `invalid_request_error`, where Anthropic
   *  rejected the request itself (typically an unsupported `tidy.model` setting), which names the
   *  model in the message and also leaves the key-health cache alone. Everything else (a deadline
   *  overrun, another abort, a model error) stays the retryable "Try again." copy, with the log's
   *  `reason` field (`timeout`/`abort`/`model`) naming which.
   */
  async function tidyAction(event: CairnEvent): Promise<ActionFailure<TidyFailure> | TidyResult> {
    // CSRF first: a raw-body (JSON) POST, so the header witness is the authority. A failed check refuses
    // before the session read and before any model call. An untyped caller with no cookie jar at
    // all throws loudly instead (convention-auth-loud-postures).
    const cookies = requireCookieJar(event);
    if (!validateCsrfHeader({ url: event.url, request: event.request, cookies, platform: event.platform })) {
      return fail(403, { error: 'csrf' } satisfies TidyFailure);
    }
    const editor = requireEditor(event);
    // The edit view always carries the concept in its params (cairn-admin.ts's contentEvent), so
    // this gates the same as editLoad/saveAction on the entry's own concept, closing the deny-at-
    // the-route gap a mapped-away concept would otherwise leave in this edit-screen action.
    if (event.params.concept) requireEngineAccess(ctx.runtime.access, editor, event.params.concept);

    // Fail-fast: refuse before any model call if tidy is off or the key is missing. The model is read
    // from config (a stated fact in this tier); a missing key is the "not enabled" refusal. No secret is
    // ever returned or logged.
    const tidy = ctx.runtime.tidy;
    if (!tidy?.enabled) {
      return fail(503, { error: 'Tidy is not enabled for this site.' } satisfies TidyFailure);
    }
    const env = (event.platform?.env ?? {}) as Record<string, unknown>;
    const apiKey = typeof env.ANTHROPIC_API_KEY === 'string' ? env.ANTHROPIC_API_KEY : '';
    if (!apiKey) {
      return fail(503, { error: 'Tidy is not configured: the Anthropic API key is missing.' } satisfies TidyFailure);
    }

    // Parse and bound the body before the call. A malformed body refuses 400; an over-long text refuses
    // 413 (tidy a selection instead), so no over-long input ever spends a token or risks the deadline.
    let payload: { text?: unknown; scope?: unknown };
    try {
      payload = JSON.parse(await event.request.text());
    } catch {
      return fail(400, { error: 'Could not read the tidy request.' } satisfies TidyFailure);
    }
    const text = typeof payload.text === 'string' ? payload.text : '';
    if (text.length === 0) {
      return fail(400, { error: 'No text to tidy.' } satisfies TidyFailure);
    }
    if (text.length > MAX_TIDY_CHARS) {
      return fail(413, { error: 'This is too long to tidy at once. Select a passage and tidy that instead.' } satisfies TidyFailure);
    }

    // Build the system prompt from the resolved conventions (Task 10). The prompt is built from config,
    // never from the author's text, so the untrusted text cannot reshape the instructions.
    const system = buildTidyPrompt(resolveTidyConventions(tidy.conventions));
    const model = tidy.model || DEFAULT_TIDY_MODEL;

    // Bound the model call with the Worker's own deadline (shorter than the platform limit), so a slow
    // call becomes a retryable fail(502) rather than a platform timeout. The client also drives its own
    // AbortController (Cancel + a bounded timeout, Task 14); this action accepts an aborted request
    // cleanly by mapping any abort to the same fail(502). `deadlineHit` distinguishes the deadline
    // timer's own abort from some other abort reaching the same signal (a client disconnect cancelling
    // the underlying subrequest), so the log's `reason` names which one actually happened.
    const controller = new AbortController();
    let deadlineHit = false;
    const timer = setTimeout(() => {
      deadlineHit = true;
      controller.abort();
    }, ctx.tidyTimeoutMs);
    let result: Awaited<ReturnType<TidyClient['tidy']>>;
    try {
      const client = ctx.anthropicClient({ apiKey });
      result = await client.tidy(
        {
          model,
          system,
          text,
          // A short proofread does not need extended reasoning; a model with effort tiers runs
          // adaptive thinking by default, so this caps it at the low tier rather than sending a
          // thinking parameter (budget_tokens 400s on Sonnet 5). Sent only when the configured model
          // actually has effort tiers: the API answers an effort tier on one that does not (Haiku
          // 4.5, say) with a 400, so omitting it there is the request the model actually accepts.
          ...(supportsEffort(model) ? { effort: 'low' as const } : {}),
        },
        // The signal rides the request options, so the deadline timer above actually cancels the call.
        { signal: controller.signal },
      );
    } catch (err) {
      if (err instanceof TidySdkMissingError) {
        // First, because this error carries no `status`: the branches below would read it as a
        // transient model failure and hand the editor "Try again.", which reinstalling is the only
        // thing that fixes. No key was ever tried either, so the key-health cache stays untouched
        // and the answer is the one command that resolves it.
        log.warn('tidy.failed', { editor: editor.email, model, reason: 'sdk_missing' });
        return fail(503, {
          error: 'Tidy is not configured: this site does not have @anthropic-ai/sdk installed. Run npm install @anthropic-ai/sdk.',
        } satisfies TidyFailure);
      }
      const status = tidyClientErrorStatus(err);
      if (status === 401 || status === 403) {
        // An auth/permission failure is not retryable: the key itself is the problem, not a transient
        // model hiccup, so "Try again." would be a false promise. Mark the shared key-health cache
        // unhealthy (Task 5) so editLoad's tidy projection hides the button for the TTL rather than
        // offering a control that will fail the same way on the next click.
        markKeyUnhealthy();
        log.warn('tidy.failed', { editor: editor.email, model, reason: 'auth' });
        return fail(503, {
          error: "Tidy isn't available right now. Your site's AI access needs attention; let your site developer know.",
        } satisfies TidyFailure);
      }
      if (status === 400) {
        // A 400 means Anthropic rejected the request shape itself, not the key: an identical retry
        // fails the same way, so this is not retryable either. In practice this means the site's
        // `tidy.model` setting names something the Messages API does not accept as configured, so the
        // message names it directly rather than the generic "Try again." The key is not the problem,
        // so the health cache stays untouched.
        log.warn('tidy.failed', { editor: editor.email, model, reason: 'invalid_request' });
        return fail(503, {
          error: `Tidy isn't available right now. The configured model ("${model}") isn't supported; check your site's tidy.model setting.`,
        } satisfies TidyFailure);
      }
      // Everything else stays retryable: a deadline overrun, an abort from elsewhere, or a model error
      // (rate limit, overload, 5xx, network). The error string is not surfaced to the client (it may
      // carry internal detail); the log line carries the editor, the model, and which of the three it
      // was, never the key or the content.
      let reason: 'timeout' | 'abort' | 'model' = 'model';
      if (deadlineHit) reason = 'timeout';
      else if (err instanceof Error && err.name === 'AbortError') reason = 'abort';
      log.warn('tidy.failed', { editor: editor.email, model, reason });
      return fail(502, { error: 'Tidy could not finish. Try again.' } satisfies TidyFailure);
    } finally {
      clearTimeout(timer);
    }
    // The call reached Anthropic and it accepted the key: clear any prior unhealthy mark so the Tidy
    // button (and the settings screen) reflect a recovered key immediately, without waiting out the TTL.
    markKeyHealthy();

    // A model refusal (the streaming-classifier intervention) is a clean fail(422): the author's text is
    // untouched, so the editor can leave it as-is.
    if (result.refused) {
      log.warn('tidy.refused', { editor: editor.email, model });
      return fail(422, { error: 'Tidy declined to edit this text.' } satisfies TidyFailure);
    }

    // An empty result is treated as a model error rather than silently returning an empty document.
    if (result.corrected.length === 0) {
      log.warn('tidy.empty', { editor: editor.email, model });
      return fail(502, { error: 'Tidy returned nothing. Try again.' } satisfies TidyFailure);
    }

    log.info('tidy.succeeded', { editor: editor.email, model, tokens: result.tokens });
    return { corrected: result.corrected, model, tokens: result.tokens };
  }

  return { tidyAction };
}
