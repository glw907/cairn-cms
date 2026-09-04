// cairn-cms: Task 9 of the internals pass (ruling 4 as letter-amended). `createAuthChannel`'s own
// dev-backend leak tripwire: refuse when CAIRN_DEV_BACKEND is set AND the request reaches a
// deployed runtime, diverging from guard.ts's flag-alone predicate because CAIRN_DEV_BACKEND='1'
// is the dev transport's own enable contract (a factory instance serves both dev and prod). No D1
// binding is needed: the tripwire fires before any store, print, or network call, so `resolveDb`
// can answer undefined throughout and the action still either throws (the tripwire) or falls
// through to its own `{ error: 'unavailable' }` no-binding branch.
//
// Three axes are pinned here, each a converged review finding from fix round A: the cache latches
// only a definite observation (the fail-OPEN direction, beside the sticky-true case that was
// already covered), the flag is read from both env sources, and the deployment witness prefers the
// configured PUBLIC_ORIGIN over the client-controlled Host header.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import type { AuthChannelConfig } from '../../lib/auth-channel/index.js';
import { CAIRN_DEV_BACKEND_MESSAGE } from '../../lib/dev-flag.js';

type TestEnv = { CAIRN_DEV_BACKEND?: string | boolean; PUBLIC_ORIGIN?: string };

const NONLOCAL_URL = 'https://member.example.test/login';
const LOCAL_URL = 'https://localhost/login';

/** A minimal event satisfying every channel action's structural constraint, with no D1 binding. */
function makeEvent(url: string, env: TestEnv, contact?: string) {
  return withPlatform(url, { env }, contact);
}

/**
 * The same event with the platform slot supplied directly, so a test can build the two shapes
 * `makeEvent` cannot: a runtime that carries no platform at all (adapter-node, or a warm-up call
 * before the adapter attaches one) and a platform whose `env` is itself absent.
 */
function withPlatform(url: string, platform: { env?: TestEnv } | undefined, contact?: string) {
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
    platform,
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
  // Both process.env names the tripwire reads are cleared for every case and restored after, so a
  // developer's own shell (or another suite) cannot decide this file's verdicts.
  const savedEnv: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const name of ['CAIRN_DEV_BACKEND', 'PUBLIC_ORIGIN']) {
      savedEnv[name] = process.env[name];
      delete process.env[name];
    }
  });
  afterEach(() => {
    for (const [name, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
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

  it('does not latch on a request that carried no platform env, so an early env-less call cannot disarm it', async () => {
    // The fail-OPEN direction, the opposite of the sticky-true case above. One request arriving
    // with no platform at all (a warm-up call before the adapter attaches one) used to latch
    // `set: false` for the isolate's whole life, silently retiring the tripwire.
    const channel = createAuthChannel<TestEnv>(validConfig());
    expect(await thrownBy(() => channel.actions.logout(withPlatform(NONLOCAL_URL, undefined)))).toBeUndefined();
    // A platform object whose `env` is absent is the same non-observation and must not latch either.
    expect(await thrownBy(() => channel.actions.logout(withPlatform(NONLOCAL_URL, {})))).toBeUndefined();

    const caught = await thrownBy(() =>
      channel.actions.logout(makeEvent(NONLOCAL_URL, { CAIRN_DEV_BACKEND: '1' })),
    );
    expect(isHttpError(caught)).toBe(true);
  });

  it('reads the flag from process.env too, the adapter-node shape where platform.env never carries it', async () => {
    const channel = createAuthChannel<TestEnv>(validConfig());
    process.env.CAIRN_DEV_BACKEND = '1';
    // The platform env is present and empty, so the cache latches `set: false` on it; the
    // process.env read is what must still trip the refusal.
    const caught = await thrownBy(() => channel.actions.logout(makeEvent(NONLOCAL_URL, {})));
    expect(isHttpError(caught)).toBe(true);

    // And on a runtime with no platform at all, the true adapter-node deploy shape.
    const nodeChannel = createAuthChannel<TestEnv>(validConfig());
    const nodeCaught = await thrownBy(() =>
      nodeChannel.actions.logout(withPlatform(NONLOCAL_URL, undefined)),
    );
    expect(isHttpError(nodeCaught)).toBe(true);
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

    // Same witness from the adapter-node source, where both names live in process.env.
    const nodeChannel = createAuthChannel<TestEnv>(validConfig());
    process.env.CAIRN_DEV_BACKEND = '1';
    process.env.PUBLIC_ORIGIN = 'https://member.example.test';
    const nodeCaught = await thrownBy(() =>
      nodeChannel.actions.logout(withPlatform(LOCAL_URL, undefined)),
    );
    expect(isHttpError(nodeCaught)).toBe(true);
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
        error: 'unavailable',
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
