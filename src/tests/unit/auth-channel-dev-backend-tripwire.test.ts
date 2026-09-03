// cairn-cms: Task 9 of the internals pass (ruling 4 as letter-amended). `createAuthChannel`'s own
// dev-backend leak tripwire: refuse when CAIRN_DEV_BACKEND is set AND the request is non-local,
// diverging from guard.ts's flag-alone predicate because CAIRN_DEV_BACKEND='1' is the dev
// transport's own enable contract (a factory instance serves both dev and prod). No D1 binding is
// needed: the tripwire fires before any store, print, or network call, so `resolveDb` can answer
// undefined throughout and the action still either throws (the tripwire) or falls through to its
// own `{ error: 'unavailable' }` no-binding branch.
import { describe, it, expect } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import type { AuthChannelConfig } from '../../lib/auth-channel/index.js';
import { CAIRN_DEV_BACKEND_MESSAGE } from '../../lib/auth-channel/dev-flag.js';

type TestEnv = { CAIRN_DEV_BACKEND?: string | boolean };

const NONLOCAL_URL = 'https://member.example.test/login';
const LOCAL_URL = 'https://localhost/login';

/** A minimal event satisfying every channel action's structural constraint, with no D1 binding. */
function makeEvent(url: string, env: TestEnv, contact?: string) {
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
    platform: { env },
  };
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
    expect(result).toEqual({ error: 'unavailable' });
  });

  it('changes nothing when the flag is absent, on a non-local host', async () => {
    const channel = createAuthChannel<TestEnv>(validConfig());
    const result = await channel.actions.request(makeEvent(NONLOCAL_URL, {}, 'member@x.test'));
    expect(result).toEqual({ error: 'unavailable' });
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
});
