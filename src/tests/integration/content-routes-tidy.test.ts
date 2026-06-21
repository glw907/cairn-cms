// Task 11: the tidy Worker action, the first remote model call in the library and the highest blast
// radius on the server side (untrusted content, the API key). These tests drive tidyAction directly
// through createContentRoutes against the workerd pool, with the Anthropic client INJECTED so no
// network call ever happens and no real key is needed. The injection seam is ContentRoutesDeps.anthropic:
// a factory the action calls with the resolved key, returning a structural client whose messages.create
// the test stubs. The default factory (unset here) builds the real SDK client.
import { describe, it, expect, vi } from 'vitest';
import { createContentRoutes, type ContentEvent, type TidyClient } from '../../lib/sveltekit/content-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { CookieJar } from '../../lib/sveltekit/types.js';
import type { Editor } from '../../lib/auth/types.js';

const editor: Editor = { email: 'a@b.test', displayName: 'A Tester', role: 'owner' };
const CSRF = 'csrf-token-value-0123456789abcdef';

/** A minimal runtime with tidy enabled. Only the tidy config and backend the action reads are
 *  load-bearing; the rest satisfy the CairnRuntime contract. */
function runtime(overrides: Partial<CairnRuntime> = {}): CairnRuntime {
  return {
    siteName: 'Test Site',
    sender: { from: 'noreply@test', replyTo: 'noreply@test' },
    concepts: [],
    backend: { owner: 'o', repo: 'r', branch: 'main', apiBase: 'https://api.github.com' },
    manifestPath: 'src/content/.cairn/manifest.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    tidy: { enabled: true, model: 'claude-sonnet-4-6', conventions: {} },
    ...overrides,
  } as CairnRuntime;
}

/** A fake cookie jar returning the csrf cookie under the https `__Host-` name. */
function cookieJar(csrf: string | undefined): CookieJar {
  return {
    get: (name) => (name === '__Host-cairn_csrf' ? csrf : undefined),
    set: () => {},
    delete: () => {},
  };
}

interface TidyOpts {
  text?: string;
  scope?: string;
  csrf?: string | undefined;
  cookieCsrf?: string | undefined;
  hasEditor?: boolean;
  platformEnv?: Record<string, unknown>;
  rawBody?: string;
}

/** Build the ContentEvent for a tidy POST: the JSON `{ text, scope }` rides the raw `text/plain` body,
 *  the CSRF token in the X-Cairn-CSRF header. */
function tidyEvent(opts: TidyOpts = {}): ContentEvent {
  const headers = new Headers();
  headers.set('content-type', 'text/plain');
  if ('csrf' in opts ? opts.csrf !== undefined : true) headers.set('x-cairn-csrf', opts.csrf ?? CSRF);
  const body = opts.rawBody ?? JSON.stringify({ text: opts.text ?? 'teh cat', scope: opts.scope ?? 'document' });
  const url = new URL('https://site.example/admin/posts/my-entry');
  return {
    url,
    params: { concept: 'posts', id: 'my-entry' },
    request: new Request(url, { method: 'POST', body, headers }),
    locals: { editor: opts.hasEditor === false ? null : editor },
    platform: { env: opts.platformEnv ?? { ANTHROPIC_API_KEY: 'sk-test-key' } },
    cookies: cookieJar(opts.cookieCsrf === undefined ? CSRF : opts.cookieCsrf),
  };
}

/** A fake Anthropic client whose messages.create runs the supplied stub. The action calls the injected
 *  factory with the resolved key; the factory returns this, so create() never touches the network. */
function fakeAnthropic(create: TidyClient['messages']['create']): (opts: { apiKey: string }) => TidyClient {
  return () => ({ messages: { create } });
}

/** A canned successful Message: one text block, an end_turn stop, and a usage record. */
function cannedMessage(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
    model: 'claude-sonnet-4-6',
    stop_reason: 'end_turn' as const,
    usage: { input_tokens: 12, output_tokens: 8 },
  };
}

/** Read a fail (fail returns { status, data }) or a success object off the action result. */
type TidyResult = { status?: number; data?: { error?: string } } & {
  corrected?: string;
  model?: string;
  usage?: { input_tokens: number; output_tokens: number };
};

describe('tidy action: the remote model-call boundary (Task 11)', () => {
  it('returns { corrected, model, usage } on a stubbed success and commits nothing', async () => {
    const create = vi.fn<TidyClient['messages']['create']>(async () => cannedMessage('the cat'));
    const routes = createContentRoutes(runtime(), { anthropic: fakeAnthropic(create) });
    const res = (await routes.tidyAction(tidyEvent({ text: 'teh cat' }))) as TidyResult;

    expect(res.corrected).toBe('the cat');
    expect(res.model).toBe('claude-sonnet-4-6');
    expect(res.usage).toEqual({ input_tokens: 12, output_tokens: 8 });
    expect(create).toHaveBeenCalledTimes(1);
    // The user text rides as the user message, never interpolated into the system prompt.
    const call = create.mock.calls[0]![0];
    expect(call.messages[0]).toEqual({ role: 'user', content: 'teh cat' });
    expect(call.system).not.toContain('teh cat');
  });

  it('refuses fail(403) on a bad CSRF header, before the session read and any model call', async () => {
    const create = vi.fn(async () => cannedMessage('x'));
    const routes = createContentRoutes(runtime(), { anthropic: fakeAnthropic(create) });
    const res = (await routes.tidyAction(tidyEvent({ csrf: 'wrong' }))) as TidyResult;

    expect(res.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it('surfaces a missing session as the guard redirect (no model call)', async () => {
    const create = vi.fn(async () => cannedMessage('x'));
    const routes = createContentRoutes(runtime(), { anthropic: fakeAnthropic(create) });
    // requireSession throws a redirect; the action does not catch it (the manual-redirect 303 the
    // client reads as status-0). Assert it throws and the model was never called.
    await expect(routes.tidyAction(tidyEvent({ hasEditor: false }))).rejects.toMatchObject({ status: 303 });
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses fail(503) when tidy is disabled, before any model call', async () => {
    const create = vi.fn(async () => cannedMessage('x'));
    const routes = createContentRoutes(runtime({ tidy: { enabled: false } }), { anthropic: fakeAnthropic(create) });
    const res = (await routes.tidyAction(tidyEvent())) as TidyResult;

    expect(res.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses fail(503) when the API key is missing, before any model call', async () => {
    const create = vi.fn(async () => cannedMessage('x'));
    const routes = createContentRoutes(runtime(), { anthropic: fakeAnthropic(create) });
    const res = (await routes.tidyAction(tidyEvent({ platformEnv: {} }))) as TidyResult;

    expect(res.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses fail(413) when the text is too large, before the model call', async () => {
    const create = vi.fn(async () => cannedMessage('x'));
    const routes = createContentRoutes(runtime(), { anthropic: fakeAnthropic(create) });
    const huge = 'a '.repeat(20000); // well past the cap
    const res = (await routes.tidyAction(tidyEvent({ text: huge }))) as TidyResult;

    expect(res.status).toBe(413);
    expect(create).not.toHaveBeenCalled();
  });

  it('maps a deadline overrun (the abort) to the retryable fail(502)', async () => {
    // The SDK signature is create(body, options): the abort signal rides the SECOND argument
    // (RequestOptions), never the body. Honor it the way the SDK surfaces a request timeout: reject
    // with an AbortError when it fires. The action's own deadline is what aborts here.
    let sawSignal: AbortSignal | undefined;
    const create = vi.fn((_body: unknown, options?: { signal?: AbortSignal }) => {
      sawSignal = options?.signal;
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          const err = new Error('Request was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    }) as unknown as TidyClient['messages']['create'];
    // A short deadline so the test does not wait the real 30s.
    const routes = createContentRoutes(runtime(), { anthropic: fakeAnthropic(create), tidyTimeoutMs: 20 });
    const res = (await routes.tidyAction(tidyEvent())) as TidyResult;

    // The action reached the call with a real signal in the options argument, and the deadline mapped
    // the abort to the retryable failure rather than hanging.
    expect(sawSignal).toBeInstanceOf(AbortSignal);
    expect(res.status).toBe(502);
  });

  it('maps a stubbed API error to fail(502)', async () => {
    const create = vi.fn(async () => {
      throw new Error('overloaded');
    }) as unknown as TidyClient['messages']['create'];
    const routes = createContentRoutes(runtime(), { anthropic: fakeAnthropic(create) });
    const res = (await routes.tidyAction(tidyEvent())) as TidyResult;

    expect(res.status).toBe(502);
  });

  it('maps a model refusal to fail(422)', async () => {
    const create = vi.fn(async () => ({
      content: [],
      model: 'claude-sonnet-4-6',
      stop_reason: 'refusal' as const,
      usage: { input_tokens: 5, output_tokens: 0 },
    })) as unknown as TidyClient['messages']['create'];
    const routes = createContentRoutes(runtime(), { anthropic: fakeAnthropic(create) });
    const res = (await routes.tidyAction(tidyEvent())) as TidyResult;

    expect(res.status).toBe(422);
  });

  it('refuses fail(400) on a malformed body, before the model call', async () => {
    const create = vi.fn(async () => cannedMessage('x'));
    const routes = createContentRoutes(runtime(), { anthropic: fakeAnthropic(create) });
    const res = (await routes.tidyAction(tidyEvent({ rawBody: 'not json' }))) as TidyResult;

    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
