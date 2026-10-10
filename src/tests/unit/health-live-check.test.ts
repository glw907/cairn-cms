import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { createGithubApp } from '../../lib/index.js';
import { cachedInstallationToken } from '../../lib/github/signing.js';
import { createLiveTokenCheck, loadHealth } from '../../lib/sveltekit/health.js';
import type { CheckClock } from '../../lib/sveltekit/health.js';
import { testEvent } from '../helpers/test-event.js';
import { setFakeEnv } from '../helpers/cloudflare-workers-fake.js';
import type { CairnRuntime } from '../../lib/content/types.js';

// A key pair generated for this file, never a real App key. The PEM label is assembled at run
// time; the signer reads any label other than the PKCS#1 one as PKCS#8.
let keyB64 = '';

beforeAll(async () => {
  const pair = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const pkcs8 = new Uint8Array((await crypto.subtle.exportKey('pkcs8', pair.privateKey)) as ArrayBuffer);
  const label = ['PRIVATE', 'KEY'].join(' ');
  keyB64 = btoa(`-----BEGIN ${label}-----${btoa(String.fromCharCode(...pkcs8))}-----END ${label}-----`);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Each test that reaches the module's own live check uses its own installation id, so the
// per-isolate verdict one test leaves behind never answers another.
let installationSeq = 0;
function nextInstallation(): string {
  installationSeq += 1;
  return `inst-${installationSeq}`;
}

function runtime(installationId: string): CairnRuntime {
  return {
    siteName: 'T',
    concepts: [],
    backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '123', installationId }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    vocabulary: [],
  };
}

function healthEvent(env: Record<string, unknown>, live: boolean) {
  setFakeEnv(env);
  return testEvent({ url: live ? 'https://t.example/healthz?live=1' : 'https://t.example/healthz' });
}

function tokenResponse(): Response {
  return new Response(JSON.stringify({ token: 'ghs_livecheckminted' }), { status: 201 });
}

/** A clock the test drives: `now` moves only when set, and each timer fires only when told. */
function manualClock(): CheckClock & { set(ms: number): void; fire(index: number): void; count(): number } {
  let t = 0;
  const fires: Array<() => void> = [];
  return {
    now: () => t,
    timer() {
      let fire = (): void => {};
      const fired = new Promise<void>((resolve) => {
        fire = resolve;
      });
      fires.push(fire);
      return { fired, clear: () => {} };
    },
    set(ms) {
      t = ms;
    },
    fire(index) {
      fires[index]();
    },
    count: () => fires.length,
  };
}

const creds = (installationId = 'i') => ({ appId: '123', installationId, privateKeyB64: keyB64 });

/** Settle every pending microtask and macrotask once, so a chain that can advance has. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Resolve to `'hung'` when `p` has not settled within `ms` of real time. */
function within<T>(p: Promise<T>, ms = 1000): Promise<T | 'hung'> {
  return Promise.race([p, new Promise<'hung'>((resolve) => setTimeout(() => resolve('hung'), ms))]);
}

describe('the live token check classifies each mint outcome', () => {
  it.each([
    [401, 'key_refused'],
    [404, 'installation_not_found'],
    [403, 'installation_suspended'],
    [500, 'unreachable'],
  ])('a %i from GitHub reads %s', async (status, reason) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status }));
    const check = createLiveTokenCheck(manualClock(), () => {});
    expect(await check(creds())).toEqual({ ok: false, detail: reason });
  });

  it('a thrown network error reads unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
    const check = createLiveTokenCheck(manualClock(), () => {});
    expect(await check(creds())).toEqual({ ok: false, detail: 'unreachable' });
  });

  it('a hung request reads unreachable once the caller timeout fires, and carries an abort signal', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(() => {}));
    const clock = manualClock();
    const check = createLiveTokenCheck(clock, () => {});
    let settled = false;
    const pending = check(creds()).then((r) => {
      settled = true;
      return r;
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await tick();
    expect(settled).toBe(false);
    clock.fire(0);
    expect(await pending).toEqual({ ok: false, detail: 'unreachable' });
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('a minted token reads ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => tokenResponse());
    const check = createLiveTokenCheck(manualClock(), () => {});
    expect(await check(creds())).toEqual({ ok: true });
  });
});

describe('the live token check is bounded per isolate', () => {
  it('coalesces parallel live calls on a cold slot into one fetch', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => tokenResponse());
    const rt = runtime(nextInstallation());
    const results = await Promise.all(
      Array.from({ length: 5 }, () => loadHealth(healthEvent({ GITHUB_APP_PRIVATE_KEY_B64: keyB64 }, true), rt)),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const data of results) expect(data.checks.githubAppToken).toEqual({ ok: true });
  });

  it('serves a settled verdict for 60 seconds, then mints again', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => tokenResponse());
    const clock = manualClock();
    const check = createLiveTokenCheck(clock, () => {});
    await check(creds());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    clock.set(59_999);
    expect(await check(creds())).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    clock.set(60_001);
    expect(await check(creds())).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('hands the in-flight mint to the runtime to keep alive, once per mint', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => tokenResponse());
    const keepAlive = vi.fn();
    const check = createLiveTokenCheck(manualClock(), keepAlive);
    await Promise.all([check(creds()), check(creds())]);
    expect(keepAlive).toHaveBeenCalledTimes(1);
    expect(keepAlive.mock.calls[0][0]).toBeInstanceOf(Promise);
  });

  it('keeps the slot after the starter times out, so a joiner inside the timeout shares the mint', async () => {
    // The starter's own timer fires while the mint is still in flight; a second caller, with the
    // clock still inside the timeout, joins that mint rather than starting another.
    let resolveFetch = (_r: Response): void => {};
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const clock = manualClock();
    const check = createLiveTokenCheck(clock, () => {});
    const starter = check(creds());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    clock.fire(0);
    expect(await starter).toEqual({ ok: false, detail: 'unreachable' });
    clock.set(1_000);
    const joiner = check(creds());
    await tick();
    resolveFetch(tokenResponse());
    expect(await joiner).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never wedges the isolate on a mint that never settles', async () => {
    // A canceled subrequest leaves a promise that never settles. The starter is never awaited and
    // its timer never fires; a later caller still answers within its own timeout, and a call past
    // the stale point starts a fresh mint instead of riding the dead one.
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(new Promise<Response>(() => {}))
      .mockImplementation(async () => tokenResponse());
    const clock = manualClock();
    const check = createLiveTokenCheck(clock, () => {});
    void check(creds());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    clock.set(2_000);
    const later = check(creds());
    await tick();
    clock.fire(clock.count() - 1);
    expect(await within(later)).toEqual({ ok: false, detail: 'unreachable' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    clock.set(5_000);
    expect(await within(check(creds()))).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

/**
 * A clock that runs on a scheduled timeline: `advance(ms)` fires every timer due at or before `ms`
 * first, then runs every action queued for that moment, so a caller timer and a mint landing at
 * the same instant settle in a fixed order.
 */
function scheduledClock(): CheckClock & { advance(ms: number): Promise<void>; at(ms: number, action: () => void): void } {
  let t = 0;
  const timers: Array<{ due: number; fire: () => void }> = [];
  const actions: Array<{ due: number; run: () => void }> = [];
  return {
    now: () => t,
    timer(ms) {
      let fire = (): void => {};
      const fired = new Promise<void>((resolve) => {
        fire = resolve;
      });
      timers.push({ due: t + ms, fire });
      return { fired, clear: () => {} };
    },
    at(ms, run) {
      actions.push({ due: ms, run });
    },
    async advance(ms) {
      t = ms;
      for (const timer of timers.filter((x) => x.due <= ms)) timer.fire();
      await tick();
      for (const action of actions.filter((x) => x.due <= ms)) action.run();
    },
  };
}

describe('the live token check under a late or simultaneous settlement', () => {
  it('lets a mint landing at its own deadline answer the caller, since the caller waits a grace beyond it', async () => {
    // GitHub refuses the key at the very moment the mint's own 5 s abort would fire. The caller's
    // timer must not win that tie with a guessed unreachable.
    let resolveFetch = (_r: Response): void => {};
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const clock = scheduledClock();
    const check = createLiveTokenCheck(clock, () => {});
    clock.at(5_000, () => resolveFetch(new Response('{}', { status: 401 })));
    const pending = check(creds());
    await tick();
    await clock.advance(5_000);
    expect(await within(pending)).toEqual({ ok: false, detail: 'key_refused' });
  });

  it('never lets a timed-out mint that settles late overwrite the newer verdict', async () => {
    // Mint A times out and goes stale; mint B starts later and passes. A then lands with a refusal,
    // which must not replace B's newer verdict.
    const resolvers: Array<(r: Response) => void> = [];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const clock = manualClock();
    const check = createLiveTokenCheck(clock, () => {});
    const first = check(creds());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    clock.fire(0);
    expect(await first).toEqual({ ok: false, detail: 'unreachable' });

    clock.set(5_000);
    const second = check(creds());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    resolvers[1](tokenResponse());
    expect(await second).toEqual({ ok: true });

    clock.set(5_100);
    resolvers[0](new Response('{}', { status: 401 }));
    await tick();
    expect(await check(creds())).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('the plain signing check is memoized per isolate', () => {
  async function freshKey(): Promise<string> {
    const pair = (await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair;
    const pkcs8 = new Uint8Array((await crypto.subtle.exportKey('pkcs8', pair.privateKey)) as ArrayBuffer);
    const label = ['PRIVATE', 'KEY'].join(' ');
    return btoa(`-----BEGIN ${label}-----${btoa(String.fromCharCode(...pkcs8))}-----END ${label}-----`);
  }

  it('does no RSA work on a second plain call with the same key, and re-tests a changed key', async () => {
    const first = await freshKey();
    const second = await freshKey();
    const sign = vi.spyOn(crypto.subtle, 'sign');
    const rt = runtime(nextInstallation());

    const a = await loadHealth(healthEvent({ GITHUB_APP_PRIVATE_KEY_B64: first }, false), rt);
    expect(sign).toHaveBeenCalledTimes(1);
    const b = await loadHealth(healthEvent({ GITHUB_APP_PRIVATE_KEY_B64: first }, false), rt);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(b.checks.githubAppSigning).toEqual(a.checks.githubAppSigning);

    await loadHealth(healthEvent({ GITHUB_APP_PRIVATE_KEY_B64: second }, false), rt);
    expect(sign).toHaveBeenCalledTimes(2);
  });
});

describe('the live token check never touches the shared token cache', () => {
  it('leaves no entry in cachedInstallationToken after a live mint', async () => {
    const installationId = nextInstallation();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(async () => tokenResponse())
      .mockImplementation(async () => new Response(JSON.stringify({ token: 'ghs_publishpath' }), { status: 201 }));
    const data = await loadHealth(healthEvent({ GITHUB_APP_PRIVATE_KEY_B64: keyB64 }, true), runtime(installationId));
    expect(data.checks.githubAppToken).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // A cache hit would answer the live check's token with no fetch; a miss mints anew.
    expect(await cachedInstallationToken(creds(installationId))).toBe('ghs_publishpath');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('the live token check logging', () => {
  it('logs a failed live mint as github.unreachable with the health scope and the class', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await createLiveTokenCheck(manualClock(), () => {})(creds());
    expect(warn).toHaveBeenCalledTimes(1);
    const { timestamp, ...record } = warn.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof timestamp).toBe('string');
    expect(record).toEqual({ level: 'warn', event: 'github.unreachable', scope: 'health', reason: 'key_refused' });
  });

  it('logs nothing for a minted token, so no record carries any part of it', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => tokenResponse());
    const spies = [
      vi.spyOn(console, 'log').mockImplementation(() => {}),
      vi.spyOn(console, 'info').mockImplementation(() => {}),
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
      vi.spyOn(console, 'error').mockImplementation(() => {}),
    ];
    const result = await createLiveTokenCheck(manualClock(), () => {})(creds());
    expect(result).toEqual({ ok: true });
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

describe('loadHealth with ?live=1', () => {
  it('reports the token check and folds it into ok: a refused key fails the payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = await loadHealth(healthEvent({ GITHUB_APP_PRIVATE_KEY_B64: keyB64 }, true), runtime(nextInstallation()));
    expect(data.checks.githubAppSigning.ok).toBe(true);
    expect(data.checks.githubAppToken).toEqual({ ok: false, detail: 'key_refused' });
    expect(data.ok).toBe(false);
  });

  it('passes with both checks passing, and reports the signing fingerprint', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => tokenResponse());
    const data = await loadHealth(healthEvent({ GITHUB_APP_PRIVATE_KEY_B64: keyB64 }, true), runtime(nextInstallation()));
    expect(data.ok).toBe(true);
    expect(data.checks.githubAppToken).toEqual({ ok: true });
    expect(data.checks.githubAppSigning.fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]{43}=$/);
  });

  it('makes no fetch and reports no token check with no key, so ok is the signing check', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const data = await loadHealth(healthEvent({}, true), runtime(nextInstallation()));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(data.checks).not.toHaveProperty('githubAppToken');
    expect(data.ok).toBe(data.checks.githubAppSigning.ok);
    expect(data.ok).toBe(false);
  });

  it('makes no fetch and reports no token check for a provider that is not a GitHub App', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const rt = { ...runtime(nextInstallation()), backend: { kind: 'other' } } as unknown as CairnRuntime;
    const data = await loadHealth(healthEvent({ GITHUB_APP_PRIVATE_KEY_B64: keyB64 }, true), rt);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(data.checks).not.toHaveProperty('githubAppToken');
    expect(data.ok).toBe(data.checks.githubAppSigning.ok);
    expect(data.ok).toBe(true);
  });

  it('makes no fetch and reports no token check for a key that fails the signing check', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const unusable = btoa('not a key');
    const data = await loadHealth(healthEvent({ GITHUB_APP_PRIVATE_KEY_B64: unusable }, true), runtime(nextInstallation()));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(data.checks).not.toHaveProperty('githubAppToken');
    expect(data.checks.githubAppSigning.ok).toBe(false);
    expect(data.ok).toBe(data.checks.githubAppSigning.ok);
  });

  it('never serializes any part of the key', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => tokenResponse());
    const data = await loadHealth(healthEvent({ GITHUB_APP_PRIVATE_KEY_B64: keyB64 }, true), runtime(nextInstallation()));
    const serialized = JSON.stringify(data);
    const inner = atob(keyB64).replace(/-----[^-]+-----/g, '');
    const leaked: string[] = [];
    for (const source of [keyB64, inner]) {
      for (let i = 0; i + 16 <= source.length; i++) {
        if (serialized.includes(source.slice(i, i + 16))) leaked.push(source.slice(i, i + 16));
      }
    }
    expect(leaked).toEqual([]);
  });

  it('makes no fetch on the plain call', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const data = await loadHealth(healthEvent({ GITHUB_APP_PRIVATE_KEY_B64: keyB64 }, false), runtime(nextInstallation()));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(data.checks).not.toHaveProperty('githubAppToken');
  });
});
