import { expect, test } from 'vitest';
import { devBackendHandle } from './handle.js';

// devBackendHandle now mutates no global: it constructs a conforming Backend over the in-memory
// store and sets event.locals.cairnBackend per request, so no fetch snapshot/restore is needed.

test('the handle sets the dev backend, an owner editor, and the AUTH_DB and APP_DB bindings on an /admin request', async () => {
  const handle = devBackendHandle();
  const event = {
    url: new URL('http://localhost/admin'),
    locals: {},
    platform: undefined,
  } as any;

  await handle({ event, resolve: async () => new Response('ok') });

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

  expect(event.locals.cairnBackend).toBeUndefined();
  expect(event.locals.cairnEditor).toBeUndefined();
  expect(event.platform).toBeUndefined();
});

test('the handle wires the dev backend and AUTH_DB onto /preview/[token], but never the owner-editor bypass', async () => {
  const handle = devBackendHandle();
  const event = {
    url: new URL('http://localhost/preview/some-token'),
    locals: {},
    platform: undefined,
  } as any;

  await handle({ event, resolve: async () => new Response('ok') });

  // loadPreview reads the same cairnBackend and AUTH_DB an admin request does, so a token
  // previewMintAction wrote resolves; it never reads cairnEditor, so the bypass must stay off.
  expect(event.locals.cairnBackend).toBeTruthy();
  expect(event.platform.env.AUTH_DB).toBeTruthy();
  expect(event.locals.cairnEditor).toBeUndefined();
  // /preview needs no admin-only binding: neither the tidy stub nor the developer's own binding.
  expect(event.platform.env.APP_DB).toBeUndefined();
  expect(event.platform.env.ANTHROPIC_API_KEY).toBeUndefined();
});

test('the same fakeAuthDb instance serves both /admin and /preview, so a minted row is visible to both', async () => {
  const handle = devBackendHandle();
  const adminEvent = { url: new URL('http://localhost/admin'), locals: {}, platform: undefined } as any;
  const previewEvent = { url: new URL('http://localhost/preview/x'), locals: {}, platform: undefined } as any;

  await handle({ event: adminEvent, resolve: async () => new Response('ok') });
  await handle({ event: previewEvent, resolve: async () => new Response('ok') });

  expect(previewEvent.platform.env.AUTH_DB).toBe(adminEvent.platform.env.AUTH_DB);
});

test('a plain var already on the platform proxy (PUBLIC_ORIGIN) survives onto an /admin request', async () => {
  const handle = devBackendHandle();
  const event = {
    url: new URL('http://localhost/admin'),
    locals: {},
    platform: { env: { PUBLIC_ORIGIN: 'http://localhost:4173' } },
  } as any;

  await handle({ event, resolve: async () => new Response('ok') });

  expect(event.platform.env.PUBLIC_ORIGIN).toBe('http://localhost:4173');
  // The fakes still win: this is not a passthrough that could shadow AUTH_DB with a real proxy value.
  expect(event.platform.env.AUTH_DB).toBeTruthy();
});

test('the handle attaches the supplied access map to locals.cairnAccess on an /admin request', async () => {
  const access = { '/admin/signups': ['owner'] };
  const handle = devBackendHandle({ access });
  const event = {
    url: new URL('http://localhost/admin/signups'),
    locals: {},
    platform: undefined,
  } as any;

  await handle({ event, resolve: async () => new Response('ok') });

  // The site's own declaration reaches locals verbatim, the same object, never a copy derived
  // from the minted owner session.
  expect(event.locals.cairnAccess).toBe(access);
});

test('a handle given no access map leaves locals.cairnAccess undefined rather than an empty map', async () => {
  const handle = devBackendHandle();
  const event = {
    url: new URL('http://localhost/admin/signups'),
    locals: {},
    platform: undefined,
  } as any;

  await handle({ event, resolve: async () => new Response('ok') });

  // Undefined, not {}: createSectionAction reads an absent map as a misconfigured wiring and
  // fails 500, which is the signal a developer needs under the dev backend.
  expect(event.locals.cairnAccess).toBeUndefined();
  expect('cairnAccess' in event.locals).toBe(false);
});

test('neither handle attaches an access map on a non-/admin path', async () => {
  const access = { '/admin/signups': ['owner'] };
  const withMap = devBackendHandle({ access });
  const withoutMap = devBackendHandle();
  const withMapEvent = { url: new URL('http://localhost/about'), locals: {}, platform: undefined } as any;
  const withoutMapEvent = { url: new URL('http://localhost/about'), locals: {}, platform: undefined } as any;

  await withMap({ event: withMapEvent, resolve: async () => new Response('ok') });
  await withoutMap({ event: withoutMapEvent, resolve: async () => new Response('ok') });

  expect(withMapEvent.locals.cairnAccess).toBeUndefined();
  expect(withoutMapEvent.locals.cairnAccess).toBeUndefined();
});
