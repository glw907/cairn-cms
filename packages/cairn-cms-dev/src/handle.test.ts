import { afterEach, beforeEach, expect, test } from 'vitest';
import { devBackendHandle } from './handle.js';

// devBackendHandle calls installFakeGitHub, which patches globalThis.fetch in place and never
// restores it (by design: it runs once per server lifetime in real use). Snapshot the real fetch
// and restore it after each test so the intercept does not leak into the sibling unit files that
// share this worker.
let realFetch: typeof globalThis.fetch;

beforeEach(() => {
  realFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('the handle sets an owner editor and the AUTH_DB binding on an /admin request', async () => {
  const handle = devBackendHandle();
  const event = {
    url: new URL('http://localhost/admin'),
    locals: {},
    platform: undefined,
  } as any;

  await handle({ event, resolve: async () => new Response('ok') });

  expect(event.locals.editor).toEqual({
    email: expect.any(String),
    displayName: expect.any(String),
    role: 'owner',
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

  expect(event.locals.editor).toBeUndefined();
  expect(event.platform).toBeUndefined();
});
