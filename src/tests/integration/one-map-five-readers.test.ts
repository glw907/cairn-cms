// One declaration on the adapter, read by every reader. A fixture adapter declares a custom role
// and an access map, composeRuntime folds them onto the runtime, and every reader that needs the
// roles or the map takes that runtime: the guard attaches `runtime.access` and resolves
// capability from `runtime.roles`; the editors routes list the same vocabulary; the three
// `locals` readers (`requireAccess`, `createSectionAction`, `createAdminAction`), the nav
// resolver, and `requireEngineAccess` then refuse or admit against that one map.
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { isActionFailure } from '@sveltejs/kit';
import { makeCookies, expectHttpError } from './_auth-harness.js';
import { createAuthGuard, requireAccess, requireEngineAccess } from '../../lib/sveltekit/guard.js';
import { createEditorRoutes } from '../../lib/sveltekit/editors-routes.js';
import { createSectionAction } from '../../lib/sveltekit/section-action.js';
import { createAdminAction } from '../../lib/sveltekit/admin-action.js';
import { resolveNavLayout } from '../../lib/sveltekit/admin-nav.js';
import { sessionCookieName, csrfCookieName } from '../../lib/auth/crypto.js';
import { defineRoles } from '../../lib/auth/roles.js';
import { defineAccess } from '../../lib/auth/access.js';
import { composeRuntime } from '../../lib/content/compose.js';
import { createGithubApp } from '../../lib/index.js';
import { defineFieldset } from '../../lib/content/fieldset.js';
import { testSiteConfig } from '../unit/_content-fixture.js';
import type { CairnAdapter } from '../../lib/content/types.js';
import type { CairnEvent } from '../../lib/sveltekit/types.js';

const db = env.AUTH_DB;

const roles = defineRoles({ owner: 'owner', steward: 'editor' });
const access = defineAccess(roles, {
  media: ['owner'],
  '/admin/x': ['owner'],
  '/admin/y': ['steward'],
});
const adapter: CairnAdapter = {
  content: { pages: { dir: 'src/content/pages', routing: 'page', fields: defineFieldset({}) } },
  backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'cms@test' },
  rendering: { render: ({ body }) => Promise.resolve(body) },
  roles,
  access,
};
const runtime = composeRuntime({ adapter, siteConfig: testSiteConfig });
const guard = createAuthGuard({ runtime }) as unknown as (input: {
  event: CairnEvent;
  resolve: (event: CairnEvent) => Promise<Response>;
}) => Promise<Response>;
const OK = new Response('ok');

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM editor')]);
});

/**
 * Seed one editor with a session (once per role) and return an event for `routeId` the guard has
 * already run over. A `post` event carries a matching CSRF pair, which the wrapped actions read.
 */
async function guardedEvent(role: 'owner' | 'steward', routeId: string, post = false): Promise<CairnEvent> {
  const email = `${role}@x.dev`;
  await db
    .prepare('INSERT OR IGNORE INTO editor (email, display_name, role, created_at) VALUES (?, ?, ?, ?)')
    .bind(email, role, role, Date.now())
    .run();
  await db
    .prepare('INSERT OR IGNORE INTO session (id, email, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(`sid-${role}`, email, Date.now() + 10_000, Date.now())
    .run();
  const jar = makeCookies({ [sessionCookieName(true)]: `sid-${role}`, ...(post ? { [csrfCookieName(true)]: 'MATCH' } : {}) });
  const url = `https://test.dev${routeId}`;
  const request = post
    ? new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrf: 'MATCH' }).toString(),
      })
    : new Request(url);
  const ev: CairnEvent = {
    url: new URL(url),
    request,
    params: {},
    route: { id: routeId },
    cookies: jar,
    locals: {},
    setHeaders: () => {},
  };
  // The guard clones nothing for a GET; for the POST it checks the CSRF pair, which matches.
  await guard({ event: ev, resolve: async () => OK });
  return ev;
}

const audited = async ({ ctx }: { ctx: { audit: (r: { action: string; entity: string }) => void } }) => {
  ctx.audit({ action: 'probe', entity: 'x' });
  return { ok: true } as const;
};
const sectionAction = createSectionAction<{ AUTH_DB?: unknown }, unknown>({ resolveDb: (e) => e?.AUTH_DB })(audited, {
  action: 'probe',
  entity: 'x',
});
const adminAction = createAdminAction(audited, { access: { target: '/admin/x' } });

describe('one map, five readers', () => {
  it('attaches runtime.access to locals.cairnAccess by identity', async () => {
    const ev = await guardedEvent('owner', '/admin/x');
    expect(ev.locals.cairnAccess).toBe(runtime.access);
  });

  it('resolves the adapter-declared role to its capability, in the guard and the roster screen', async () => {
    const steward = await guardedEvent('steward', '/admin/x');
    expect(steward.locals.cairnEditor?.capability).toBe('editor');
    const ownerEv = await guardedEvent('owner', '/admin');
    const data = await createEditorRoutes({ runtime }).editorsLoad(ownerEv);
    expect(data.vocabulary).toContainEqual({ role: 'steward', capability: 'editor' });
  });

  describe('refuses a steward session', () => {
    it('on the media screen', async () => {
      const ev = await guardedEvent('steward', '/admin/x');
      const status = await expectHttpError(async () =>
        requireEngineAccess(ev.locals.cairnAccess, ev.locals.cairnEditor!, 'media'),
      );
      expect(status).toEqual({ status: 403 });
    });

    it('in the nav resolver', async () => {
      const ev = await guardedEvent('steward', '/admin/x');
      const layout = resolveNavLayout({
        layout: [
          { screen: 'media' },
          { label: 'X', icon: 'inbox', href: '/admin/x' },
          { label: 'Y', icon: 'inbox', href: '/admin/y' },
        ],
        concepts: [{ id: 'pages', label: 'Pages' }],
        navMenuLabel: null,
        access: ev.locals.cairnAccess,
        editor: ev.locals.cairnEditor!,
      });
      const flat = JSON.stringify(layout);
      expect(flat).not.toContain('/admin/media');
      expect(flat).not.toContain('/admin/x');
      expect(flat).toContain('/admin/y');
    });

    it('on /admin/x through requireAccess, createSectionAction, and createAdminAction', async () => {
      const ev = await guardedEvent('steward', '/admin/x');
      expect(await expectHttpError(async () => requireAccess(ev))).toEqual({ status: 403 });
      const refused = await sectionAction(await guardedEvent('steward', '/admin/x', true));
      expect(isActionFailure(refused) && refused.status).toBe(403);
      const adminPost = await guardedEvent('steward', '/admin/x', true);
      expect(await expectHttpError(() => adminAction(adminPost))).toEqual({ status: 403 });
    });
  });

  describe('admits', () => {
    it('an owner on /admin/x through all three readers', async () => {
      const ev = await guardedEvent('owner', '/admin/x');
      expect(requireAccess(ev).email).toBe('owner@x.dev');
      expect(await sectionAction(await guardedEvent('owner', '/admin/x', true))).toEqual({ ok: true });
      expect(await adminAction(await guardedEvent('owner', '/admin/x', true))).toEqual({ ok: true });
    });

    it('a steward on /admin/y through requireAccess and createSectionAction', async () => {
      const ev = await guardedEvent('steward', '/admin/y');
      expect(requireAccess(ev).email).toBe('steward@x.dev');
      expect(await sectionAction(await guardedEvent('steward', '/admin/y', true))).toEqual({ ok: true });
    });
  });
});
