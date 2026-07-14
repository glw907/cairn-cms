// cairn-cms: the tidy (LLM copy-edit) action. createTidyActions closes over the shared
// ContentRoutesContext (content-routes-context.ts) built once by createContentRoutes, reusing its
// resolved Anthropic client and request deadline.
import { fail } from '@sveltejs/kit';
import { DEFAULT_TIDY_MODEL, resolveTidyConventions } from '../nav/site-config.js';
import { log } from '../log/index.js';
import { requireSession } from './guard.js';
import { validateCsrfHeader } from './csrf.js';
import { buildTidyPrompt } from './tidy-prompt.js';
import { tidyClientErrorStatus } from './content-routes-context.js';
import type { ContentRoutesContext, ContentEvent, TidyClient } from './content-routes-context.js';

/**
 * The successful tidy outcome (spec 2.1): the corrected markdown, the model that produced it, and the
 * token usage. The diff is computed on the client (Task 12), so the server returns the plain text and
 * commits nothing. Admin-internal: consumed by the editor's review surface, not on the package's
 * sveltekit subpath, so it carries no reference page.
 */
export interface TidyResult {
  corrected: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * A refused tidy: `fail(403)` on a failed CSRF check, `fail(503)` when tidy is disabled, the API
 * key is missing, or Anthropic rejects the key outright (401/403, a non-retryable auth failure,
 * distinct from the retryable model errors below), `fail(413)` for an over-long body, `fail(502)`
 * for a deadline overrun, an abort, or a model error (rate limit, overload, 5xx, network; all
 * retryable), `fail(422)` for a model refusal, `fail(400)` for a malformed body. Just the one-line
 * summary; the action commits nothing, so a refusal can never corrupt the entry.
 */
export interface TidyFailure {
  error: string;
}

/**
 * The input cap for a single tidy request: 24000 characters (~6k input tokens). A proofread runs at
 * roughly input length, so this stays comfortably inside the 30s deadline; a longer entry refuses with
 * fail(413) and the author tidies a selection instead. The cap is enforced BEFORE the model call, so an
 * over-long body never spends a token or risks the deadline.
 */
const MAX_TIDY_CHARS = 24_000;

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
   *    2. requireSession (an expired session throws the manual-redirect 303 the client reads as status-0).
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
   *  A model-call failure classifies into one of two voices (save-500-honest-errors, Task 4): an
   *  auth/permission failure (401/403) is not retryable, since the key itself is the problem, so it
   *  returns the calm non-retry copy naming the site developer rather than the retryable "Try
   *  again." copy. The log's `reason` field (`auth`/`timeout`/`abort`/`model`) names which one
   *  fired, so an operator can tell an auth failure from a transient one at a glance.
   */
  async function tidyAction(event: ContentEvent): Promise<ReturnType<typeof fail> | TidyResult> {
    // CSRF first: a raw-body (JSON) POST, so the header witness is the authority. A failed check refuses
    // before the session read and before any model call.
    if (!event.cookies || !validateCsrfHeader({ url: event.url, request: event.request, cookies: event.cookies })) {
      return fail(403, { error: 'csrf' } satisfies TidyFailure);
    }
    const editor = requireSession(event);

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
    // max_tokens sized to comfortably exceed the input token count: a proofread runs at roughly input
    // length, never lowballed. The character cap is ~6k input tokens, so this leaves generous headroom.
    const maxTokens = 16_000;

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
    let message: Awaited<ReturnType<TidyClient['messages']['create']>>;
    try {
      const client = ctx.anthropicClient({ apiKey });
      message = await client.messages.create(
        {
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: text }],
        },
        // The signal rides the request options, so the deadline timer above actually cancels the call.
        { signal: controller.signal },
      );
    } catch (err) {
      const status = tidyClientErrorStatus(err);
      if (status === 401 || status === 403) {
        // An auth/permission failure is not retryable: the key itself is the problem, not a transient
        // model hiccup, so "Try again." would be a false promise.
        log.warn('tidy.error', { editor: editor.email, model, reason: 'auth' });
        return fail(503, {
          error: "Tidy isn't available right now. Your site's AI access needs attention; let your site developer know.",
        } satisfies TidyFailure);
      }
      // Everything else stays retryable: a deadline overrun, an abort from elsewhere, or a model error
      // (rate limit, overload, 5xx, network). The error string is not surfaced to the client (it may
      // carry internal detail); the log line carries the editor, the model, and which of the three it
      // was, never the key or the content.
      const reason: 'timeout' | 'abort' | 'model' = deadlineHit
        ? 'timeout'
        : err instanceof Error && err.name === 'AbortError'
          ? 'abort'
          : 'model';
      log.warn('tidy.error', { editor: editor.email, model, reason });
      return fail(502, { error: 'Tidy could not finish. Try again.' } satisfies TidyFailure);
    } finally {
      clearTimeout(timer);
    }

    // A model refusal (the streaming-classifier intervention) is a clean fail(422): the author's text is
    // untouched, so the editor can leave it as-is.
    if (message.stop_reason === 'refusal') {
      log.warn('tidy.refused', { editor: editor.email, model });
      return fail(422, { error: 'Tidy declined to edit this text.' } satisfies TidyFailure);
    }

    // Read the output as plain text: concatenate the text blocks (a normal response is one). An empty
    // result is treated as a model error rather than silently returning an empty document.
    const corrected = message.content
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text ?? '')
      .join('');
    if (corrected.length === 0) {
      log.warn('tidy.empty', { editor: editor.email, model });
      return fail(502, { error: 'Tidy returned nothing. Try again.' } satisfies TidyFailure);
    }

    log.info('tidy.done', { editor: editor.email, model: message.model, usage: message.usage });
    return { corrected, model: message.model, usage: message.usage };
  }

  return { tidyAction };
}
