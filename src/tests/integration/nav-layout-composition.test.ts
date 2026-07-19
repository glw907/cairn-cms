// Task 3 (admin nav-layout plan): the driven-request proof that a declared navLayout, the roles
// vocabulary, the engine's own capability gates, and a site's navFilter compose in the one order
// spec section 7 promises: resolve arrangement -> engine capability -> ownerOnly -> declarative
// roles -> navFilter. Every other stage is unit-tested in isolation (nav-layout-validate.test.ts,
// nav-layout-resolve.test.ts, cairn-admin-shell-load.test.ts); this test drives the real
// shellPayload through createContentRoutes so the composition itself, not just each stage alone,
// is proven against a real request.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { defineRoles } from '../../lib/auth/roles.js';
import { defineAccess } from '../../lib/auth/access.js';
import { githubApp } from '../../lib/index.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { NavLayout } from '../../lib/sveltekit/admin-nav.js';
import type { AccessMap } from '../../lib/auth/access.js';
import { fieldset } from '../../lib/content/fieldset.js';

const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

// This suite never installs a GitHub double: shellPayload's nav resolution never touches the
// backend, only the fire-and-forget pendingEntries probe does. A token provider that throws
// synchronously (the missing-secret shape the rest of the cluster uses) becomes a caught
// rejection that degrades pendingEntries to null on the same microtask, so no request ever
// reaches a real fetch and no promise is left dangling past the test's own return.
const backend = makeGithubBackend(REPO, async () => {
  throw new Error('GITHUB_APP_PRIVATE_KEY_B64 is not configured');
});

/** An ASC-shaped vocabulary: an owner, a club-admin editor role, a plain editor, and a
 *  none-capability volunteer, so every capability tier the composition order gates on is
 *  represented by a real signed-in role. */
const ROLES = defineRoles({
  owner: 'owner',
  'club-admin': 'editor',
  editor: 'editor',
  volunteer: 'none' as const,
});

/** A single top-level engine door (posts), a roles-gated Club section (owner and club-admin
 *  only), and an ungated Marker section the site's own navFilter drops for every session. The
 *  Club section proves the declarative `roles` gate; Marker proves navFilter runs as its own
 *  stage, after every built-in gate, for every role alike. 'club-admin' is not in the default
 *  owner/editor Role union; a real site's own augmented vocabulary is what makes a name like
 *  this assignable, so the cast exercises the same custom-role shape the validate suite casts. */
const NAV_LAYOUT = [
  { screen: 'posts' },
  {
    label: 'Club',
    roles: ['owner', 'club-admin'],
    children: [{ label: 'Roster', icon: 'users', href: '/admin/roster' }],
  },
  {
    label: 'Marker',
    children: [{ label: 'Marker item', icon: 'inbox', href: '/admin/marker' }],
  },
] as unknown as NavLayout;

function runtime(): CairnRuntime {
  return {
    siteName: 'Club Site',
    concepts: [
      {
        id: 'posts', label: 'Posts', singular: 'Post', dir: 'src/content/posts',
        routing: { routable: true, dated: false, inFeeds: true },
        permalink: '/posts/:slug', datePrefix: 'day', fields: [], schema: fieldset({}), summaryFields: [],
        validate: () => ({ ok: true as const, data: {} }),
      },
    ],
    backend: githubApp(REPO),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    vocabulary: [],
    roles: ROLES,
    navLayout: NAV_LAYOUT,
  };
}

/** A driven request for one signed-in role/capability pair. */
function event(role: string, capability: 'owner' | 'editor' | 'none') {
  return {
    url: new URL('https://test.example/admin/posts'),
    params: {},
    request: new Request('https://test.example/admin/posts'),
    locals: { editor: { email: `${role}@test`, displayName: role, role, capability }, backend },
    platform: { env: {} },
    cookies: { get: () => undefined, set: () => {}, delete: () => {} },
  };
}

/** Every top-level section/entry label in a resolved nav's `items`. */
function topLabels(items: { label: string }[]): string[] {
  return items.map((item) => item.label);
}

describe('navLayout composition: capability, declarative roles, and navFilter over a driven request', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('composes every gate in order for an owner, a club-admin, a plain editor, and a none session', async () => {
    const rt = runtime();
    const routes = createContentRoutes(rt, {
      // The site's own dynamic filter runs last, over the already-gated items, dropping the
      // ungated Marker section for every session alike.
      navFilter: (items) => items.filter((item) => item.label !== 'Marker'),
    });

    const owner = await routes.shellPayload(event('owner', 'owner') as never);
    if (owner.shell.public) throw new Error('expected authed shell');
    // The owner sees the engine door, the roles-gated Club section (owner is listed), and never
    // the Marker section navFilter drops for every session.
    expect(topLabels(owner.shell.nav.items)).toEqual(['Posts', 'Club']);
    await owner.shell.pendingEntries;

    const clubAdmin = await routes.shellPayload(event('club-admin', 'editor') as never);
    if (clubAdmin.shell.public) throw new Error('expected authed shell');
    // club-admin is an editor-capability role, but its name is in the Club section's roles list,
    // so it sees Club even though it is not owner-capability.
    expect(topLabels(clubAdmin.shell.nav.items)).toEqual(['Posts', 'Club']);
    await clubAdmin.shell.pendingEntries;

    const plainEditor = await routes.shellPayload(event('editor', 'editor') as never);
    if (plainEditor.shell.public) throw new Error('expected authed shell');
    // A plain editor has the same capability as club-admin, but its role name is absent from the
    // Club section's roles list, so the declarative roles gate (not capability) hides it.
    expect(topLabels(plainEditor.shell.nav.items)).toEqual(['Posts']);
    await plainEditor.shell.pendingEntries;

    const none = await routes.shellPayload(event('volunteer', 'none') as never);
    if (none.shell.public) throw new Error('expected authed shell');
    // A none-capability session loses the engine door (row 4's capability gate strips every
    // engine screen, wherever it is placed) and the Club section (volunteer is also absent from
    // its roles list); the composition never widens access at any stage.
    expect(topLabels(none.shell.nav.items)).toEqual([]);
    expect(none.shell.nav.fallback).toEqual([]);
    await none.shell.pendingEntries;
  });
});

// Task 4 (admin access/attention plan): the shell-payload proof that the sidebar derives from the
// same runtime.access declaration the engine routes enforce (Task 3), so a mapped-away screen
// disappears from the sidebar exactly where its route also refuses. A Publisher-shaped session
// (mapped to posts only) is the consumer acceptance shape (spec item 4).
const ACCESS_ROLES = defineRoles({
  owner: 'owner',
  webmaster: 'editor',
  publisher: 'editor',
});

const ACCESS_MAP = defineAccess(ACCESS_ROLES, {
  pages: ['webmaster'],
  '/admin/money': ['webmaster'],
} as unknown as AccessMap);

function accessRuntime(): CairnRuntime {
  return {
    siteName: 'Access Site',
    concepts: [
      {
        id: 'posts', label: 'Posts', singular: 'Post', dir: 'src/content/posts',
        routing: { routable: true, dated: false, inFeeds: true },
        permalink: '/posts/:slug', datePrefix: 'day', fields: [], schema: fieldset({}), summaryFields: [],
        validate: () => ({ ok: true as const, data: {} }),
      },
      {
        id: 'pages', label: 'Pages', singular: 'Page', dir: 'src/content/pages',
        routing: { routable: true, dated: false, inFeeds: false },
        permalink: '/:slug', datePrefix: 'day', fields: [], schema: fieldset({}), summaryFields: [],
        validate: () => ({ ok: true as const, data: {} }),
      },
    ],
    backend: githubApp(REPO),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    vocabulary: [],
    roles: ACCESS_ROLES,
    access: ACCESS_MAP,
    navLayout: [
      { screen: 'posts' },
      { screen: 'pages' },
      { label: 'Money', icon: 'wrench', href: '/admin/money' },
    ] as unknown as NavLayout,
  };
}

function accessEvent(role: string, capability: 'owner' | 'editor') {
  const url = 'https://test.example/admin/posts';
  return {
    url: new URL(url),
    params: {},
    request: new Request(url),
    locals: { editor: { email: `${role}@test`, displayName: role, role, capability }, backend },
    platform: { env: {} },
    cookies: { get: () => undefined, set: () => {}, delete: () => {} },
  };
}

describe('navLayout composition: the sidebar derives from the runtime.access authority', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('hides the mapped-away concept door and site entry for a publisher, keeps them for webmaster and owner', async () => {
    const routes = createContentRoutes(accessRuntime());

    const publisher = await routes.shellPayload(accessEvent('publisher', 'editor') as never);
    if (publisher.shell.public) throw new Error('expected authed shell');
    expect(topLabels(publisher.shell.nav.items)).toEqual(['Posts']);
    await publisher.shell.pendingEntries;

    const webmaster = await routes.shellPayload(accessEvent('webmaster', 'editor') as never);
    if (webmaster.shell.public) throw new Error('expected authed shell');
    expect(topLabels(webmaster.shell.nav.items)).toEqual(['Posts', 'Pages', 'Money']);
    await webmaster.shell.pendingEntries;

    const owner = await routes.shellPayload(accessEvent('owner', 'owner') as never);
    if (owner.shell.public) throw new Error('expected authed shell');
    expect(topLabels(owner.shell.nav.items)).toEqual(['Posts', 'Pages', 'Money']);
    await owner.shell.pendingEntries;
  });
});

// Task 7 (admin access/attention plan): the shell-payload proof that the `attention` dep is called
// exactly once per request, filtered against the same visibility the nav derivation just computed
// (a mapped-away entry's item vanishes for the excluded role even though the dep itself does not
// know about roles), dropped at zero/negative, defaulted to the standard label, and matched
// against an engine-door href (a concept's list route), never a second, separate lookup.
describe('shellPayload: the attention dep filters, drops, defaults, and calls once per request', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('drops a mapped-away href for the excluded role and keeps it for the included one', async () => {
    const attention = vi.fn(() => [
      { href: '/admin/posts', count: 3 },
      { href: '/admin/pages', count: 5, label: 'pending reviews' },
    ]);
    const routes = createContentRoutes(accessRuntime(), { attention });

    const publisher = await routes.shellPayload(accessEvent('publisher', 'editor') as never);
    if (publisher.shell.public) throw new Error('expected authed shell');
    // 'pages' is mapped away from publisher (accessEvent's nav test above), so its item vanishes
    // even though the dep itself returned it unconditionally.
    expect(publisher.shell.attention).toEqual({ '/admin/posts': { count: 3, label: 'pending items' } });
    expect(attention).toHaveBeenCalledTimes(1);
    await publisher.shell.pendingEntries;

    const webmaster = await routes.shellPayload(accessEvent('webmaster', 'editor') as never);
    if (webmaster.shell.public) throw new Error('expected authed shell');
    expect(webmaster.shell.attention).toEqual({
      '/admin/posts': { count: 3, label: 'pending items' },
      '/admin/pages': { count: 5, label: 'pending reviews' },
    });
    expect(attention).toHaveBeenCalledTimes(2);
    await webmaster.shell.pendingEntries;
  });

  it('drops a zero and a negative count, and drops an href matching no visible nav entry', async () => {
    const attention = vi.fn(() => [
      { href: '/admin/money', count: 0 },
      { href: '/admin/posts', count: -1 },
      { href: '/admin/nowhere', count: 4 },
    ]);
    const routes = createContentRoutes(accessRuntime(), { attention });

    const webmaster = await routes.shellPayload(accessEvent('webmaster', 'editor') as never);
    if (webmaster.shell.public) throw new Error('expected authed shell');
    expect(webmaster.shell.attention).toEqual({});
    expect(attention).toHaveBeenCalledTimes(1);
    await webmaster.shell.pendingEntries;
  });

  it('keeps the first item when the dep returns a duplicate href', async () => {
    const attention = vi.fn(() => [
      { href: '/admin/posts', count: 3, label: 'first' },
      { href: '/admin/posts', count: 9, label: 'second' },
    ]);
    const routes = createContentRoutes(accessRuntime(), { attention });

    const webmaster = await routes.shellPayload(accessEvent('webmaster', 'editor') as never);
    if (webmaster.shell.public) throw new Error('expected authed shell');
    expect(webmaster.shell.attention).toEqual({ '/admin/posts': { count: 3, label: 'first' } });
  });

  it('defaults an empty or whitespace-only label to "pending items" rather than passing it through', async () => {
    const attention = vi.fn(() => [
      { href: '/admin/posts', count: 3, label: '' },
      { href: '/admin/pages', count: 2, label: '   ' },
    ]);
    const routes = createContentRoutes(accessRuntime(), { attention });

    const webmaster = await routes.shellPayload(accessEvent('webmaster', 'editor') as never);
    if (webmaster.shell.public) throw new Error('expected authed shell');
    expect(webmaster.shell.attention).toEqual({
      '/admin/posts': { count: 3, label: 'pending items' },
      '/admin/pages': { count: 2, label: 'pending items' },
    });
  });

  it('serializes an empty record when no attention dep is configured', async () => {
    const routes = createContentRoutes(accessRuntime());

    const webmaster = await routes.shellPayload(accessEvent('webmaster', 'editor') as never);
    if (webmaster.shell.public) throw new Error('expected authed shell');
    expect(webmaster.shell.attention).toEqual({});
  });
});
