// cairn-cms: Task 9 of the internals pass (ruling 4 as letter-amended). `createAuthChannel`'s own
// dev-backend leak tripwire: refuse when CAIRN_DEV_BACKEND is set AND the request reaches a
// deployed runtime, diverging from guard.ts's flag-alone predicate because CAIRN_DEV_BACKEND='1'
// is the dev transport's own enable contract (a factory instance serves both dev and prod). No D1
// binding is needed: the tripwire fires before any store, print, or network call, so `resolveDb`
// can answer undefined throughout and the action still either throws (the tripwire) or falls
// through to its own `{ outcome: 'unavailable' }` no-binding branch.
//
// Three axes are pinned here: the flag is read once per channel instance (the sticky-true case),
// the flag and PUBLIC_ORIGIN are read from the Worker env (`cloudflare:workers`, the unit
// project's settable fake) alone, and the deployment witness prefers the configured PUBLIC_ORIGIN
// over the client-controlled Host header.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import type { AuthChannelConfig } from '../../lib/auth-channel/index.js';
import { CAIRN_DEV_BACKEND_MESSAGE } from '../../lib/dev-flag.js';
import { setFakeEnv } from '../helpers/cloudflare-workers-fake.js';

type TestEnv = { CAIRN_DEV_BACKEND?: string | boolean; PUBLIC_ORIGIN?: string };

const NONLOCAL_URL = 'https://member.example.test/login';
const LOCAL_URL = 'https://localhost/login';

/**
 * A minimal event satisfying every channel action's structural constraint, with no D1 binding.
 * `env` becomes the Worker env the action reads; the fake keeps the object itself, so a test that
 * mutates it later changes what a later read sees.
 */
function makeEvent(url: string, env: TestEnv, contact?: string) {
  setFakeEnv(env);
  const u = new URL(url);
  const body = new URLSearchParams();
  if (contact !== undefined) body.set('contact', contact);
  return {
    url: u,
    request: new Request(u, { method: 'POST', body, headers: { origin: u.origin } }),
    params: {},
    route: { id: '/members/login' },
    cookies: { get: () => undefined, set: () => {}, delete: () => {} },
    setHeaders: () => {},
    locals: {},
    getClientAddress: () => '203.0.113.1',
  };
}

/** Await a call and return whatever it threw, or undefined when it returned normally. */
async function thrownBy(call: () => Promise<unknown>): Promise<unknown> {
  try {
    await call();
    return undefined;
  } catch (err) {
    return err;
  }
}

function validConfig(overrides: Partial<AuthChannelConfig<TestEnv>> = {}): AuthChannelConfig<TestEnv> {
  return {
    resolveDb: () => undefined,
    deliver: async () => {},
    lookup: async () => null,
    normalize: (raw) => raw,
    challenge: async () => true,
    cookie: { name: 'member_session' },
    ...overrides,
  };
}

describe('createAuthChannel dev-backend leak tripwire', () => {
  // Both names are stubbed empty for every case, so a developer's own shell (or another suite)
  // cannot decide this file's verdicts; a case that sets one in process.env restores through
  // vi.unstubAllEnvs.
  beforeEach(() => {
    vi.stubEnv('CAIRN_DEV_BACKEND', '');
    vi.stubEnv('PUBLIC_ORIGIN', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuses request, confirm, and logout with a hard throw when the flag is set on a non-local host', async () => {
    const channel = createAuthChannel<TestEnv>(validConfig());
    const env: TestEnv = { CAIRN_DEV_BACKEND: '1' };
    const calls: (() => Promise<unknown>)[] = [
      () => channel.actions.request(makeEvent(NONLOCAL_URL, env)),
      () => channel.actions.confirm(makeEvent(NONLOCAL_URL, env)),
      () => channel.actions.logout(makeEvent(NONLOCAL_URL, env)),
    ];
    for (const call of calls) {
      let caught: unknown;
      try {
        await call();
      } catch (e) {
        caught = e;
      }
      expect(isHttpError(caught)).toBe(true);
      if (isHttpError(caught)) {
        // The same message and status guard.ts's own flag-alone refusal uses, so the two
        // refusals never drift onto different wording (Task 9's shared dev-flag.ts module).
        expect(caught.status).toBe(503);
        expect((caught.body as { message: string }).message).toBe(CAIRN_DEV_BACKEND_MESSAGE);
      }
    }
  });

  it('trips on the boolean true form of the flag too', async () => {
    const channel = createAuthChannel<TestEnv>(validConfig());
    let caught: unknown;
    try {
      await channel.actions.logout(makeEvent(NONLOCAL_URL, { CAIRN_DEV_BACKEND: true }));
    } catch (e) {
      caught = e;
    }
    expect(isHttpError(caught)).toBe(true);
  });

  it('is untouched on a local host even with the flag set, so the dev flow runs', async () => {
    const channel = createAuthChannel<TestEnv>(validConfig());
    const env: TestEnv = { CAIRN_DEV_BACKEND: '1' };
    // request falls through the tripwire and reaches the ordinary no-db branch, never throwing.
    const result = await channel.actions.request(makeEvent(LOCAL_URL, env, 'member@x.test'));
    expect(result).toEqual({ outcome: 'unavailable' });
  });

  it('changes nothing when the flag is absent, on a non-local host', async () => {
    const channel = createAuthChannel<TestEnv>(validConfig());
    const result = await channel.actions.request(makeEvent(NONLOCAL_URL, {}, 'member@x.test'));
    expect(result).toEqual({ outcome: 'unavailable' });
  });

  it('caches the env observation across requests within one channel instance, never re-reading it', async () => {
    // Construct once, mutate the env object on the second call: the cached true from the first
    // request must still govern, proving the env half is read once per instance, not per call.
    const channel = createAuthChannel<TestEnv>(validConfig());
    const env: TestEnv = { CAIRN_DEV_BACKEND: '1' };
    let firstCaught: unknown;
    try {
      await channel.actions.logout(makeEvent(NONLOCAL_URL, env));
    } catch (e) {
      firstCaught = e;
    }
    expect(isHttpError(firstCaught)).toBe(true);

    env.CAIRN_DEV_BACKEND = undefined;
    let secondCaught: unknown;
    try {
      await channel.actions.logout(makeEvent(NONLOCAL_URL, env));
    } catch (e) {
      secondCaught = e;
    }
    // The cached `true` from the first call still governs: unsetting the env value on a live
    // object does not un-trip the tripwire, since the isolate-stable half is read only once.
    expect(isHttpError(secondCaught)).toBe(true);
  });

  it('ignores a flag set only in process.env', async () => {
    vi.stubEnv('CAIRN_DEV_BACKEND', '1');
    const channel = createAuthChannel<TestEnv>(validConfig());
    expect(await thrownBy(() => channel.actions.logout(makeEvent(NONLOCAL_URL, {})))).toBeUndefined();
  });

  it('refuses when the same flag is carried by the Worker env, on a fresh channel', async () => {
    vi.stubEnv('CAIRN_DEV_BACKEND', '');
    const channel = createAuthChannel<TestEnv>(validConfig());
    const caught = await thrownBy(() =>
      channel.actions.logout(makeEvent(NONLOCAL_URL, { CAIRN_DEV_BACKEND: '1' })),
    );
    expect(isHttpError(caught)).toBe(true);
  });

  it('accepts only the documented flag forms, so a near-miss value never counts as set', async () => {
    for (const raw of ['true', 'yes', '0', ''] as const) {
      const channel = createAuthChannel<TestEnv>(validConfig());
      const caught = await thrownBy(() =>
        channel.actions.logout(makeEvent(NONLOCAL_URL, { CAIRN_DEV_BACKEND: raw })),
      );
      expect(caught, `${JSON.stringify(raw)} must not count as set`).toBeUndefined();
    }
  });

  it('refuses a spoofed Host: localhost when PUBLIC_ORIGIN names a deployed host', async () => {
    // event.url derives from the client Host header off Cloudflare, so the request's own hostname
    // is not a trustworthy deployment witness. The site's configured PUBLIC_ORIGIN is.
    const channel = createAuthChannel<TestEnv>(validConfig());
    const caught = await thrownBy(() =>
      channel.actions.logout(
        makeEvent(LOCAL_URL, { CAIRN_DEV_BACKEND: '1', PUBLIC_ORIGIN: 'https://member.example.test' }),
      ),
    );
    expect(isHttpError(caught)).toBe(true);
  });

  it('does not take a deployed verdict from a PUBLIC_ORIGIN set only in process.env', async () => {
    vi.stubEnv('PUBLIC_ORIGIN', 'https://member.example.test');
    const channel = createAuthChannel<TestEnv>(validConfig());
    const result = await channel.actions.request(
      makeEvent(LOCAL_URL, { CAIRN_DEV_BACKEND: '1' }, 'member@x.test'),
    );
    expect(result).toEqual({ outcome: 'unavailable' });
  });

  it('still runs the local dev flow when PUBLIC_ORIGIN names a local host, or does not parse', async () => {
    // The rule is monotonic toward refusing: a configured origin can force a deployed verdict, but
    // a local or unusable one only hands the question back to the request's own hostname.
    for (const origin of ['http://localhost:4173', 'not a url', undefined]) {
      const channel = createAuthChannel<TestEnv>(validConfig());
      const result = await channel.actions.request(
        makeEvent(LOCAL_URL, { CAIRN_DEV_BACKEND: '1', PUBLIC_ORIGIN: origin }, 'member@x.test'),
      );
      expect(result, `PUBLIC_ORIGIN ${String(origin)} must leave the local flow alone`).toEqual({
        outcome: 'unavailable',
      });
    }
  });

  it('still refuses a non-local request when PUBLIC_ORIGIN names a local host', async () => {
    // The hostname fallback is only reached because PUBLIC_ORIGIN did not force a verdict; it must
    // still be able to supply one of its own.
    const channel = createAuthChannel<TestEnv>(validConfig());
    const caught = await thrownBy(() =>
      channel.actions.logout(
        makeEvent(NONLOCAL_URL, { CAIRN_DEV_BACKEND: '1', PUBLIC_ORIGIN: 'http://localhost:4173' }),
      ),
    );
    expect(isHttpError(caught)).toBe(true);
  });
});
