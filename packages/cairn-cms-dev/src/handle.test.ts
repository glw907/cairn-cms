import { expect, test } from 'vitest';
import { devBackendHandle } from './handle.js';

// devBackendHandle now mutates no global: it constructs a conforming Backend over the in-memory
// store and sets event.locals.backend per request, so no fetch snapshot/restore is needed.

test('the handle sets the dev backend, an owner editor, and the AUTH_DB and APP_DB bindings on an /admin request', async () => {
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

  expect(event.locals.editor).toEqual({
    email: expect.any(String),
    displayName: expect.any(String),
    role: 'owner',
    capability: 'owner',
  });
  expect(event.platform.env.AUTH_DB).toBeTruthy();
  // APP_DB is the developer-binding example: the custom Signups screen reads and writes its own D1.
  expect(event.platform.env.APP_DB).toBeTruthy();
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
  expect(event.locals.editor).toBeUndefined();
  expect(event.platform).toBeUndefined();
});
