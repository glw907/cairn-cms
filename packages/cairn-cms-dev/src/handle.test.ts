import { expect, test } from 'vitest';
import { devBackendHandle } from './handle.js';

// devBackendHandle now mutates no global: it constructs a conforming Backend over the in-memory
// store and sets event.locals.backend per request, so no fetch snapshot/restore is needed.

test('the handle sets the dev backend, an owner principal, and the AUTH_DB binding on an /admin request', async () => {
  const handle = devBackendHandle();
  const event = {
    url: new URL('http://localhost/admin'),
    locals: {},
    platform: undefined,
  } as any;

  await handle({ event, resolve: async () => new Response('ok') });

  // The dev Backend rides locals.backend, the channel the engine resolves; it exposes the
  // seven-method interface (defaultBranch + commit prove it is the conforming object).
  expect(event.locals.backend).toBeTruthy();
  expect(event.locals.backend.defaultBranch).toBe('main');
  expect(event.locals.backend.commit).toBeTypeOf('function');

  expect(event.locals.principal).toEqual({
    email: expect.any(String),
    displayName: expect.any(String),
    scopes: ['admin:owner', 'admin:editor'],
    tier: 'admin',
  });
  expect(event.platform.env.AUTH_DB).toBeTruthy();
});

test('the handle does not touch a public (non-admin, non-media) request', async () => {
  const handle = devBackendHandle();
  const event = {
    url: new URL('http://localhost/about'),
    locals: {},
    platform: undefined,
  } as any;

  await handle({ event, resolve: async () => new Response('ok') });

  expect(event.locals.backend).toBeUndefined();
  expect(event.locals.principal).toBeUndefined();
  expect(event.platform).toBeUndefined();
});
