import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isRedirect } from '@sveltejs/kit';
import { makeCookies, seedEditor } from './_auth-harness.js';
import { createAuthGuard } from '../../lib/sveltekit/guard.js';
import { createSession } from '../../lib/auth/store.js';
import { sessionCookieName } from '../../lib/auth/crypto.js';
import type { CairnEvent } from '../../lib/sveltekit/types.js';

const db = env.AUTH_DB;

type GuardInput = { event: CairnEvent; resolve: (event: CairnEvent) => Promise<Response> };

// createAuthGuard is typed as kit's Handle; its runtime parameter is the lighter CairnEvent.
const handle = createAuthGuard({ runtime: {} }) as unknown as (input: GuardInput) => Promise<Response>;

function event(pathname: string): CairnEvent {
  const url = `https://test.dev${pathname}`;
  return {
    url: new URL(url),
    request: new Request(url),
    params: {},
    route: { id: '/admin/[...path]' },
    cookies: makeCookies(),
    locals: {},
    setHeaders: () => {},
  };
}

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM editor')]);
});

// Ruling `admin-headers-scope` (engine-rulings.md): the 303 to the login and public routes carry
// no admin headers. The guard throws the redirect before `resolve` runs, so applySecurityHeaders
// never sees it. Returning a headered Response instead would break this.
describe('admin-headers-scope', () => {
  it('throws a bare 303 to the login for an anonymous /admin, before resolve runs', async () => {
    const resolve = vi.fn(async () => new Response('ok'));
    let thrown: unknown;
    try {
      await handle({ event: event('/admin'), resolve });
    } catch (e) {
      thrown = e;
    }
    expect(isRedirect(thrown)).toBe(true);
    expect(thrown).not.toBeInstanceOf(Response);
    const r = thrown as { status: number; location: string };
    expect(r.status).toBe(303);
    expect(r.location).toBe('/admin/login');
    expect(resolve).not.toHaveBeenCalled();
  });

  it('marks a resolved gated response noindex, nofollow', async () => {
    await seedEditor('own@x.dev', 'Ed', 'owner');
    await createSession(db, 'sid-ok', 'own@x.dev', Date.now() + 10_000, Date.now());
    const ev = { ...event('/admin'), cookies: makeCookies({ [sessionCookieName(true)]: 'sid-ok' }) };
    const res = await handle({ event: ev, resolve: async () => new Response('ok') });
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('marks /admin/login responses noindex, nofollow', async () => {
    const res = await handle({ event: event('/admin/login'), resolve: async () => new Response('ok') });
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('leaves a public route without the header', async () => {
    const res = await handle({ event: event('/about'), resolve: async () => new Response('ok') });
    expect(res.headers.get('X-Robots-Tag')).toBeNull();
  });
});
