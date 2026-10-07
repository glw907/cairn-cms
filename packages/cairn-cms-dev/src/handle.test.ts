import { afterEach, expect, test, vi } from 'vitest';
import type { Handle } from '@sveltejs/kit/hooks';
import { env, withEnv } from 'cloudflare:workers';
import { devBackendHandle } from './handle.js';
import { env as engineEnv } from '../../../src/lib/sveltekit/workers-env.js';
import { setFakeEnv, setFakeEnvThrowing } from '../../../src/tests/helpers/cloudflare-workers-fake.js';
import { __setBuilding } from '../../../src/tests/_app-env.js';

// devBackendHandle mutates no global: it constructs a conforming Backend over the in-memory store,
// sets event.locals.cairnBackend per request, and layers its binding doubles over the Worker env
// with withEnv. The unit project resolves `cloudflare:workers` to a settable fake, reset before
// every test, so each test reads the env the route itself would see from inside `resolve`.

afterEach(() => {
  __setBuilding(false);
});

/** Run one request through `handle`, returning a copy of the env the route saw. */
async function envSeenByRoute(handle: Handle, event: object): Promise<Record<string, unknown>> {
  let seen: Record<string, unknown> = {};
  await handle({
    event: event as Parameters<Handle>[0]['event'],
    resolve: async () => {
      seen = { ...(env as unknown as Record<string, unknown>) };
      return new Response('ok');
    },
  });
  return seen;
}

function eventFor(path: string): { url: URL; locals: Record<string, unknown> } {
  return { url: new URL(`http://localhost${path}`), locals: {} };
}

test('the handle sets the dev backend, an owner editor, and the AUTH_DB and APP_DB bindings on an /admin request', async () => {
  const handle = devBackendHandle();
  const event = eventFor('/admin') as any;

  const seen = await envSeenByRoute(handle, event);

  // The dev Backend rides locals.cairnBackend, the channel the engine resolves; it exposes the
  // seven-method interface (defaultBranch + commit prove it is the conforming object).
  expect(event.locals.cairnBackend).toBeTruthy();
  expect(event.locals.cairnBackend.defaultBranch).toBe('main');
  expect(event.locals.cairnBackend.commit).toBeTypeOf('function');

  expect(event.locals.cairnEditor).toEqual({
    email: expect.any(String),
    displayName: expect.any(String),
    role: 'owner',
    capability: 'owner',
  });
  expect(seen.AUTH_DB).toBeTruthy();
  // APP_DB is the developer-binding example: the custom Signups screen reads and writes its own D1.
  expect(seen.APP_DB).toBeTruthy();
});

test('the doubles last only for the request: the env after the handle returns is the one before it', async () => {
  setFakeEnv({ PUBLIC_ORIGIN: 'http://localhost:4173' });
  const handle = devBackendHandle();

  await envSeenByRoute(handle, eventFor('/admin'));

  expect(Object.keys(env)).toEqual(['PUBLIC_ORIGIN']);
});

test('the handle does not touch a public (non-admin, non-media) request', async () => {
  const handle = devBackendHandle();
  const event = eventFor('/about') as any;

  const seen = await envSeenByRoute(handle, event);

  expect(event.locals.cairnBackend).toBeUndefined();
  expect(event.locals.cairnEditor).toBeUndefined();
  expect(seen).toEqual({});
});

test('the handle wires the dev backend and AUTH_DB onto /preview/[token], but never the owner-editor bypass', async () => {
  const handle = devBackendHandle();
  const event = eventFor('/preview/some-token') as any;

  const seen = await envSeenByRoute(handle, event);

  // loadPreview reads the same cairnBackend and AUTH_DB an admin request does, so a token
  // previewMintAction wrote resolves; it never reads cairnEditor, so the bypass must stay off.
  expect(event.locals.cairnBackend).toBeTruthy();
  expect(seen.AUTH_DB).toBeTruthy();
  expect(event.locals.cairnEditor).toBeUndefined();
  // /preview needs no admin-only binding: neither the tidy stub nor the developer's own binding.
  expect(seen.APP_DB).toBeUndefined();
  expect(seen.ANTHROPIC_API_KEY).toBeUndefined();
});

test('the same fakeAuthDb instance serves both /admin and /preview, so a minted row is visible to both', async () => {
  const handle = devBackendHandle();

  const admin = await envSeenByRoute(handle, eventFor('/admin'));
  const preview = await envSeenByRoute(handle, eventFor('/preview/x'));

  expect(preview.AUTH_DB).toBe(admin.AUTH_DB);
});

test('a plain var already on the Worker env (PUBLIC_ORIGIN) survives onto an /admin request', async () => {
  setFakeEnv({ PUBLIC_ORIGIN: 'http://localhost:4173' });
  const handle = devBackendHandle();

  const seen = await envSeenByRoute(handle, eventFor('/admin'));

  expect(seen.PUBLIC_ORIGIN).toBe('http://localhost:4173');
  // The fakes still win: this is not a passthrough that could shadow AUTH_DB with a real proxy value.
  expect(seen.AUTH_DB).toBeTruthy();
});

test('a handle sequenced before it keeps its own double, and the route and the engine read both', async () => {
  // A site's own handle, ahead of the dev handle, layering one double of its own the same way.
  const siteHandle: Handle = ({ event, resolve }) =>
    withEnv({ ...env, SITE_DB: 'site-double' }, () => resolve(event)) as ReturnType<typeof resolve>;
  const devHandle = devBackendHandle();
  // The order `sequence(siteHandle, devHandle)` runs them in, composed by hand: kit's own
  // `sequence` needs the request store a running server provides.
  const handle: Handle = ({ event, resolve }) =>
    siteHandle({ event, resolve: async (inner) => devHandle({ event: inner, resolve }) });
  let route: Record<string, unknown> = {};
  let engine: Record<string, unknown> = {};

  await handle({
    event: eventFor('/admin') as unknown as Parameters<Handle>[0]['event'],
    resolve: async () => {
      // Read across an await, the way a load reads after its first fetch.
      await Promise.resolve();
      const read = env as unknown as Record<string, unknown>;
      route = { SITE_DB: read.SITE_DB, AUTH_DB: read.AUTH_DB };
      engine = { SITE_DB: engineEnv.SITE_DB, AUTH_DB: engineEnv.AUTH_DB };
      return new Response('ok');
    },
  });

  expect(route.SITE_DB).toBe('site-double');
  expect(route.AUTH_DB).toBeTruthy();
  expect(engine.SITE_DB).toBe('site-double');
  expect(engine.AUTH_DB).toBe(route.AUTH_DB);
});

test('while the build prerenders, the handle passes the request through without touching the Worker env', async () => {
  __setBuilding(true);
  setFakeEnvThrowing();
  const handle = devBackendHandle();
  const event = eventFor('/admin') as any;

  const response = await handle({ event, resolve: async () => new Response('prerendered') });

  expect(await response.text()).toBe('prerendered');
  expect(event.locals.cairnEditor).toBeUndefined();
});

test('the handle attaches the supplied access map to locals.cairnAccess on an /admin request', async () => {
  const access = { '/admin/signups': ['owner'] };
  const handle = devBackendHandle({ access });
  const event = eventFor('/admin/signups') as any;

  await envSeenByRoute(handle, event);

  // The site's own declaration reaches locals verbatim, the same object, never a copy derived
  // from the minted owner session.
  expect(event.locals.cairnAccess).toBe(access);
});

test('a handle given no access map leaves locals.cairnAccess undefined rather than an empty map', async () => {
  const handle = devBackendHandle();
  const event = eventFor('/admin/signups') as any;

  await envSeenByRoute(handle, event);

  // Undefined, not {}: createSectionAction reads an absent map as a misconfigured wiring and
  // fails 500, which is the signal a developer needs under the dev backend.
  expect(event.locals.cairnAccess).toBeUndefined();
  expect('cairnAccess' in event.locals).toBe(false);
});

test('neither handle attaches an access map on a non-/admin path', async () => {
  const access = { '/admin/signups': ['owner'] };
  const withMap = devBackendHandle({ access });
  const withoutMap = devBackendHandle();
  const withMapEvent = eventFor('/about') as any;
  const withoutMapEvent = eventFor('/about') as any;

  await envSeenByRoute(withMap, withMapEvent);
  await envSeenByRoute(withoutMap, withoutMapEvent);

  expect(withMapEvent.locals.cairnAccess).toBeUndefined();
  expect(withoutMapEvent.locals.cairnAccess).toBeUndefined();
});

test('with the dev flag set on a non-local host, the handle refuses with a 503 and never resolves', async () => {
  setFakeEnv({ CAIRN_DEV_BACKEND: '1' });
  const handle = devBackendHandle();
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    for (const path of ['/admin', '/media/x.jpg', '/about']) {
      const event = { url: new URL(`https://club.example${path}`), locals: {} } as any;
      let resolved = false;
      const res = await handle({
        event,
        resolve: async () => {
          resolved = true;
          return new Response('ok');
        },
      });
      expect(resolved).toBe(false);
      expect(res.status).toBe(503);
      expect(event.locals.cairnEditor).toBeUndefined();
    }
    const records = errorSpy.mock.calls.map((c) => c[0] as { event?: string; reason?: string });
    expect(records.some((r) => r.event === 'guard.refused' && r.reason === 'dev_backend_in_prod')).toBe(true);
  } finally {
    errorSpy.mockRestore();
  }
});

test('the boolean true form of the flag trips the same refusal', async () => {
  setFakeEnv({ CAIRN_DEV_BACKEND: true });
  const handle = devBackendHandle();
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const res = await handle({
      event: { url: new URL('https://club.example/admin'), locals: {} } as any,
      resolve: async () => new Response('ok'),
    });
    expect(res.status).toBe(503);
  } finally {
    errorSpy.mockRestore();
  }
});

test('with the dev flag set on localhost, the handle still mounts the dev backend', async () => {
  setFakeEnv({ CAIRN_DEV_BACKEND: '1' });
  const handle = devBackendHandle();
  const event = eventFor('/admin') as any;

  const seen = await envSeenByRoute(handle, event);

  expect(event.locals.cairnEditor?.capability).toBe('owner');
  expect(seen.AUTH_DB).toBeTruthy();
});
