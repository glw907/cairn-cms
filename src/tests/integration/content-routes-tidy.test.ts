// Task 11: the tidy Worker action, the first remote model call in the library and the highest blast
// radius on the server side (untrusted content, the API key). These tests drive tidyAction directly
// through createContentRoutes against the workerd pool, with the Anthropic client INJECTED so no
// network call ever happens and no real key is needed. The injection seam is ContentRoutesDeps.tidy.client:
// a factory the action calls with the resolved key, returning a structural client whose messages.create
// the test stubs. The default factory (unset here) builds the real SDK client.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { githubApp } from '../../lib/index.js';
import { createContentRoutes, type ContentEvent, type TidyClient } from '../../lib/sveltekit/content-routes.js';
import { keyKnownUnhealthy, resetKeyHealthForTest } from '../../lib/sveltekit/tidy-key-health.js';
import { log } from '../../lib/log/index.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { CookieJar } from '../../lib/sveltekit/types.js';
import type { Editor } from '../../lib/auth/types.js';

afterEach(() => resetKeyHealthForTest());

const editor: Editor = { email: 'a@b.test', displayName: 'A Tester', role: 'owner' };
const CSRF = 'csrf-token-value-0123456789abcdef';

/** A minimal runtime with tidy enabled. Only the tidy config and backend the action reads are
 *  load-bearing; the rest satisfy the CairnRuntime contract. */
function runtime(overrides: Partial<CairnRuntime> = {}): CairnRuntime {
  return {
    siteName: 'Test Site',
    sender: { from: 'noreply@test', replyTo: 'noreply@test' },
    concepts: [],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
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
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
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
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
    const res = (await routes.tidyAction(tidyEvent({ csrf: 'wrong' }))) as TidyResult;

    expect(res.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it('surfaces a missing session as the guard redirect (no model call)', async () => {
    const create = vi.fn(async () => cannedMessage('x'));
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
    // requireSession throws a redirect; the action does not catch it (the manual-redirect 303 the
    // client reads as status-0). Assert it throws and the model was never called.
    await expect(routes.tidyAction(tidyEvent({ hasEditor: false }))).rejects.toMatchObject({ status: 303 });
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses fail(503) when tidy is disabled, before any model call', async () => {
    const create = vi.fn(async () => cannedMessage('x'));
    const routes = createContentRoutes(runtime({ tidy: { enabled: false } }), { tidy: { client: fakeAnthropic(create) } });
    const res = (await routes.tidyAction(tidyEvent())) as TidyResult;

    expect(res.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses fail(503) when the API key is missing, before any model call', async () => {
    const create = vi.fn(async () => cannedMessage('x'));
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
    const res = (await routes.tidyAction(tidyEvent({ platformEnv: {} }))) as TidyResult;

    expect(res.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses fail(413) when the text is too large, before the model call', async () => {
    const create = vi.fn(async () => cannedMessage('x'));
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
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
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create), timeoutMs: 20 } });
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
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
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
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
    const res = (await routes.tidyAction(tidyEvent())) as TidyResult;

    expect(res.status).toBe(422);
  });

  it('refuses fail(400) on a malformed body, before the model call', async () => {
    const create = vi.fn(async () => cannedMessage('x'));
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
    const res = (await routes.tidyAction(tidyEvent({ rawBody: 'not json' }))) as TidyResult;

    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('tidy action: error voice (save-500-honest-errors, Task 4)', () => {
  it('maps a 401 to the calm non-retry fail(503) and logs reason auth', async () => {
    const create = vi.fn(async () => {
      throw Object.assign(new Error('invalid x-api-key'), { status: 401 });
    }) as unknown as TidyClient['messages']['create'];
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
    const warn = vi.spyOn(log, 'warn');
    const res = (await routes.tidyAction(tidyEvent())) as TidyResult;

    expect(res.status).toBe(503);
    expect(res.data?.error).toBe(
      "Tidy isn't available right now. Your site's AI access needs attention; let your site developer know.",
    );
    expect(res.data?.error).not.toMatch(/try again/i);
    expect(warn).toHaveBeenCalledWith('tidy.error', expect.objectContaining({ reason: 'auth' }));
  });

  it('maps a 403 the same way as a 401 (both are auth failures)', async () => {
    const create = vi.fn(async () => {
      throw Object.assign(new Error('forbidden'), { status: 403 });
    }) as unknown as TidyClient['messages']['create'];
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
    const res = (await routes.tidyAction(tidyEvent())) as TidyResult;

    expect(res.status).toBe(503);
  });

  it('a deadline overrun logs reason timeout (retryable)', async () => {
    const create = vi.fn((_body: unknown, options?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          const err = new Error('Request was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    }) as unknown as TidyClient['messages']['create'];
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create), timeoutMs: 20 } });
    const warn = vi.spyOn(log, 'warn');
    const res = (await routes.tidyAction(tidyEvent())) as TidyResult;

    expect(res.status).toBe(502);
    expect(warn).toHaveBeenCalledWith('tidy.error', expect.objectContaining({ reason: 'timeout' }));
  });

  it('a plain model error logs reason model (retryable)', async () => {
    const create = vi.fn(async () => {
      throw new Error('overloaded');
    }) as unknown as TidyClient['messages']['create'];
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
    const warn = vi.spyOn(log, 'warn');
    const res = (await routes.tidyAction(tidyEvent())) as TidyResult;

    expect(res.status).toBe(502);
    expect(warn).toHaveBeenCalledWith('tidy.error', expect.objectContaining({ reason: 'model' }));
  });
});

describe('tidy action: key health cache (save-500-honest-errors, Task 5)', () => {
  it('marks the key unhealthy on a 401', async () => {
    const create = vi.fn(async () => {
      throw Object.assign(new Error('invalid x-api-key'), { status: 401 });
    }) as unknown as TidyClient['messages']['create'];
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
    await routes.tidyAction(tidyEvent());
    expect(keyKnownUnhealthy()).toBe(true);
  });

  it('marks the key unhealthy on a 403 too', async () => {
    const create = vi.fn(async () => {
      throw Object.assign(new Error('forbidden'), { status: 403 });
    }) as unknown as TidyClient['messages']['create'];
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
    await routes.tidyAction(tidyEvent());
    expect(keyKnownUnhealthy()).toBe(true);
  });

  it('never marks the key unhealthy on a retryable failure (timeout or plain model error)', async () => {
    const create = vi.fn(async () => {
      throw new Error('overloaded');
    }) as unknown as TidyClient['messages']['create'];
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(create) } });
    await routes.tidyAction(tidyEvent());
    expect(keyKnownUnhealthy()).toBe(false);
  });

  it('a successful call clears a prior unhealthy mark', async () => {
    const failing = vi.fn(async () => {
      throw Object.assign(new Error('invalid x-api-key'), { status: 401 });
    }) as unknown as TidyClient['messages']['create'];
    let routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(failing) } });
    await routes.tidyAction(tidyEvent());
    expect(keyKnownUnhealthy()).toBe(true);

    const succeeding = vi.fn(async () => cannedMessage('fixed'));
    routes = createContentRoutes(runtime(), { tidy: { client: fakeAnthropic(succeeding) } });
    await routes.tidyAction(tidyEvent());
    expect(keyKnownUnhealthy()).toBe(false);
  });
});
