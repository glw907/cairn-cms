// Task 1 of the identity-seam pass: the seam is declared and threaded, with no branch behavior
// yet inside the guard's guarded-path block. This proves construction-time logoutUrl validation
// and that locals.cairnIdentity is published on every admin path, public ones included, with
// zero calls to identity.resolve on a public path.
import { describe, it, expect, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { createAuthGuard } from '../../lib/sveltekit/guard.js';
import type { CairnEvent } from '../../lib/sveltekit/types.js';
import type { IdentityResolver } from '../../lib/sveltekit/guard.js';

// createAuthGuard is annotated `: Handle`, kit's own ambient type (the interop carve-out); the
// cast below bridges it to the lighter CairnEvent shape this file's fakes build, mirroring
// auth-guard.test.ts's own note.
function asHandle(guard: ReturnType<typeof createAuthGuard>): (input: {
  event: CairnEvent;
  resolve: (event: CairnEvent) => Promise<Response>;
}) => Promise<Response> {
  return guard as unknown as (input: {
    event: CairnEvent;
    resolve: (event: CairnEvent) => Promise<Response>;
  }) => Promise<Response>;
}

const OK = new Response('ok');

function event(pathname: string): CairnEvent {
  const url = `https://test.dev${pathname}`;
  return {
    url: new URL(url),
    request: new Request(url),
    params: {},
    route: { id: '/admin/[...path]' },
    cookies: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
    },
    locals: {},
    // A truthy stand-in clears the guard's bindings check without a real D1Database; this file
    // never calls resolveSession or findEditor, so the stub's shape is never read.
    platform: { env: { AUTH_DB: {} as unknown as D1Database } },
    setHeaders: () => {},
  };
}

const ACCEPTED_LOGOUT_URLS = ['/goodbye', 'https://team.cloudflareaccess.com/cdn-cgi/access/logout'];

const REJECTED_LOGOUT_URLS = [
  '//evil.example',
  '/\\evil.example',
  '/\\/evil.example',
  '\\\\evil.example',
  '/%2f%2fevil.example',
  'http://x/',
  'javascript:alert(1)',
  'data:text/html,x',
  '/path\r\nX-Injected: 1',
  '',
];

describe('createAuthGuard: identity option, construction-time validation', () => {
  for (const logoutUrl of ACCEPTED_LOGOUT_URLS) {
    it(`accepts logoutUrl ${JSON.stringify(logoutUrl)}`, () => {
      expect(() =>
        createAuthGuard({ identity: { resolve: async () => ({ ok: false, reason: 'missing' }), logoutUrl } }),
      ).not.toThrow();
    });
  }

  for (const logoutUrl of REJECTED_LOGOUT_URLS) {
    it(`rejects logoutUrl ${JSON.stringify(logoutUrl)}`, () => {
      expect(() =>
        createAuthGuard({ identity: { resolve: async () => ({ ok: false, reason: 'missing' }), logoutUrl } }),
      ).toThrow();
    });
  }
});

describe('createAuthGuard: identity refusal reason coercion', () => {
  it('coerces a malformed (non-string) resolver reason to a string rather than throwing or crashing the Set lookup', async () => {
    // A resolver outside the type system (plain JS, a mistyped ambient) can hand back a reason
    // that is not a string at all; the cast simulates exactly that runtime shape.
    const resolve = (async () => ({ ok: false, reason: null })) as unknown as IdentityResolver['resolve'];
    const handle = asHandle(createAuthGuard({ identity: { resolve, logoutUrl: '/goodbye' } }));
    const ev = event('/admin');
    const res = await handle({ event: ev, resolve: async () => OK });
    expect(res.status).toBe(403);
  });
});

describe('createAuthGuard: locals.cairnIdentity', () => {
  it('sets no locals.cairnIdentity when no identity option is configured', async () => {
    const handle = asHandle(createAuthGuard());
    const ev = event('/admin/login');
    await handle({ event: ev, resolve: async () => OK });
    expect(ev.locals.cairnIdentity).toBeUndefined();
  });

  it('sets locals.cairnIdentity on a public admin path and calls resolve zero times', async () => {
    const resolve = vi.fn<IdentityResolver['resolve']>(async () => ({ ok: false, reason: 'missing' }));
    const handle = asHandle(
      createAuthGuard({ identity: { resolve, logoutUrl: '/goodbye', label: 'Acme SSO' } }),
    );
    const ev = event('/admin/login');
    await handle({ event: ev, resolve: async () => OK });
    expect(ev.locals.cairnIdentity).toEqual({ label: 'Acme SSO', logoutUrl: '/goodbye' });
    expect(resolve).not.toHaveBeenCalled();
  });

  it('publishes a frozen locals.cairnIdentity, so a downstream write throws rather than poisoning the shared snapshot', async () => {
    const handle = asHandle(
      createAuthGuard({
        identity: { resolve: async () => ({ ok: false, reason: 'missing' }), logoutUrl: '/goodbye', label: 'Acme SSO' },
      }),
    );
    const ev = event('/admin/login');
    await handle({ event: ev, resolve: async () => OK });
    expect(Object.isFrozen(ev.locals.cairnIdentity)).toBe(true);
    expect(() => {
      ev.locals.cairnIdentity!.label = 'tampered';
    }).toThrow();
  });
});
