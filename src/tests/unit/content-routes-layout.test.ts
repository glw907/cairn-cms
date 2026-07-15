import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { runtime as baseRuntime, postsConcept, REPO, backend, contentEvent } from './_content-harness.js';
import { defineRoles } from '../../lib/auth/roles.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { Backend } from '../../lib/github/backend.js';
import {
  resolveNavLayout,
  type AdminNavConfig,
  type ResolvedLayoutNode,
  type ResolvedNavItem,
} from '../../lib/sveltekit/admin-nav.js';

function runtime(): CairnRuntime {
  return baseRuntime({
    siteName: 'Test Site',
    concepts: [
      postsConcept(),
      {
        id: 'pages', label: 'Pages', singular: 'Pages', dir: 'src/content/pages',
        routing: { routable: true, dated: false, inFeeds: false },
        permalink: '/:slug', datePrefix: 'day', fields: [], schema: postsConcept().schema, summaryFields: [],
        validate: () => ({ ok: true as const, data: {} }),
      },
    ],
  });
}

/** ASC-shaped vocabulary: an instructor lands on its own declared home, at none capability. */
const CLUB_ROLES = defineRoles({
  owner: 'owner',
  'club-admin': 'editor',
  instructor: { capability: 'none' as const, home: '/admin/classes' },
});

/** The same posts/pages runtime, but declaring CLUB_ROLES instead of the implicit default. */
function runtimeWithRoles(): CairnRuntime {
  return { ...runtime(), roles: CLUB_ROLES };
}

function event(pathname: string, role: 'owner' | 'editor' | null, eventBackend: Backend = backend) {
  return contentEvent({
    url: `https://test.example${pathname}`,
    editor: role === null ? null : { email: 'e@test', displayName: 'Ed', role, capability: role },
    eventBackend,
    env: {},
    cookies: { get: () => undefined, set: () => {}, delete: () => {} },
  });
}

/**
 * Build the structural event a route factory reads for an editor carrying a role outside the
 *  `'owner' | 'editor'` harness literal (a custom vocabulary's own name), the same inline shape the
 *  none-contract shellPayload test above already uses.
 */
function customRoleEvent(
  pathname: string,
  role: string,
  capability: 'owner' | 'editor' | 'none',
  eventBackend: Backend = backend,
) {
  return {
    url: new URL(`https://test.example${pathname}`),
    params: {},
    request: new Request(`https://test.example${pathname}`),
    locals: {
      editor: { email: 'inst@test', displayName: 'Inst', role, capability },
      backend: eventBackend,
    },
    platform: { env: {} },
    cookies: { get: () => undefined, set: () => {}, delete: () => {} },
  };
}

afterEach(() => vi.restoreAllMocks());

/** Every engine `screen` id present anywhere in a resolved nav (a section's children recursed). */
function screenIds(nodes: ResolvedLayoutNode[]): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    if ('children' in node) out.push(...screenIds(node.children));
    else if ('screen' in node) out.push(node.screen);
  }
  return out;
}

/** The resolved engine door for one screen id, wherever it sits in the tree; undefined if absent. */
function findScreen(nodes: ResolvedLayoutNode[], screen: string): { label: string; href: string } | undefined {
  for (const node of nodes) {
    if ('children' in node) {
      const found = findScreen(node.children, screen);
      if (found) return found;
    } else if ('screen' in node && node.screen === screen) {
      return node;
    }
  }
  return undefined;
}

// A sync-throwing backend for a shellPayload test that never installs a GitHub double. The
// shell's `pendingEntries` probe (content-routes-core.ts) is intentionally fire-and-forget, so a
// test that resolves it against the real `backend` (a real fetch, a fake token) leaves that
// fetch running past the test's own return; on a loaded CI worker the eventual 401 and its
// `console.warn` land after the test file's teardown and can crash the run with a pending
// onUserConsoleLog RPC despite every assertion having passed. Settling the probe on the same
// microtask (a sync token-mint throw, never a real round-trip) and awaiting it removes the
// straggling promise.
const quickFailBackend = () =>
  makeGithubBackend(REPO, async () => {
    throw new Error('GITHUB_APP_PRIVATE_KEY_B64 is not configured');
  });

describe('shellPayload', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('returns nav concepts, the user, the active path, and owner capability for an authed path', async () => {
    const routes = createContentRoutes(runtime());
    const { shell } = await routes.shellPayload(event('/admin/posts', 'owner', quickFailBackend()) as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.siteName).toBe('Test Site');
    expect(shell.user).toEqual({ displayName: 'Ed', email: 'e@test', role: 'owner', capability: 'owner' });
    expect(shell.concepts).toEqual([
      { id: 'posts', label: 'Posts' },
      { id: 'pages', label: 'Pages' },
    ]);
    expect(shell.pathname).toBe('/admin/posts');
    // The default arrangement: one Core section (the concepts, then the engine screens; no `nav`
    // door since no navMenu is configured), Help left unreferenced into fallback.
    expect(shell.nav.items).toEqual([
      {
        label: 'Core',
        children: [
          { screen: 'posts', label: 'Posts', href: '/admin/posts' },
          { screen: 'pages', label: 'Pages', href: '/admin/pages' },
          { screen: 'media', label: 'Library', href: '/admin/media' },
          { screen: 'vocabulary', label: 'Tags', href: '/admin/vocabulary' },
          { screen: 'settings', label: 'Settings', href: '/admin/settings' },
          { screen: 'editors', label: 'Editors', href: '/admin/editors' },
        ],
      },
    ]);
    expect(shell.nav.fallback).toEqual([{ screen: 'help', label: 'Help', href: '/admin/help' }]);
    await shell.pendingEntries;
  });

  it('issues a CSRF token in the shell data', async () => {
    const routes = createContentRoutes(runtime());
    const { shell } = await routes.shellPayload(event('/admin/posts', 'owner', quickFailBackend()) as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.csrf).toMatch(/^[A-Za-z0-9_-]+$/);
    await shell.pendingEntries;
  });

  it('denies the manage-editors capability to an editor', async () => {
    const routes = createContentRoutes(runtime());
    const { shell } = await routes.shellPayload(event('/admin/pages', 'editor', quickFailBackend()) as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(screenIds(shell.nav.items)).not.toContain('editors');
    await shell.pendingEntries;
  });

  it('admits a none-capability session (the none contract): the shell stays reachable so a shell-mounted custom route is admitted, unlike the engine content and roster surfaces', async () => {
    const routes = createContentRoutes(runtime());
    const noneEvent = {
      url: new URL('https://test.example/admin/posts'),
      params: {},
      request: new Request('https://test.example/admin/posts'),
      locals: {
        editor: { email: 'inst@test', displayName: 'Inst', role: 'instructor', capability: 'none' },
        backend: quickFailBackend(),
      },
      platform: { env: {} },
      cookies: { get: () => undefined, set: () => {}, delete: () => {} },
    };
    const { shell } = await routes.shellPayload(noneEvent as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.user.email).toBe('inst@test');
    // A none-capability session carries no engine concept nav (every route it links to refuses a
    // none session with 403) and no engine door anywhere in the resolved tree, items or fallback.
    expect(shell.concepts).toEqual([]);
    expect(screenIds(shell.nav.items)).toEqual([]);
    expect(screenIds(shell.nav.fallback)).toEqual([]);
    // Pinned so the shell payload carries the capability the CairnAdminShell component gates its
    // engine nav items on.
    expect(shell.user.capability).toBe('none');
    await shell.pendingEntries;
  });

  it('resolves pendingEntries to [] for a none-capability session and never calls the backend', async () => {
    // A none-capability session sees no publish surface (the topbar's "Publish site (N)" action is
    // dead for it), so the count is not theirs to read: shellPayload must skip the backend listing
    // entirely rather than streaming a real pending count into that dead button. A backend whose
    // listBranches throws proves the skip: if shellPayload called it, the promise would degrade to
    // null (the existing github.unreachable fail-safe), not resolve to [].
    const listBranches = vi.fn(() => {
      throw new Error('listBranches should not be called for a none-capability session');
    });
    const routes = createContentRoutes(runtime());
    const noneEvent = {
      url: new URL('https://test.example/admin/posts'),
      params: {},
      request: new Request('https://test.example/admin/posts'),
      locals: {
        editor: { email: 'inst@test', displayName: 'Inst', role: 'instructor', capability: 'none' },
        backend: { listBranches },
      },
      platform: { env: {} },
      cookies: { get: () => undefined, set: () => {}, delete: () => {} },
    };
    const { shell } = await routes.shellPayload(noneEvent as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(await shell.pendingEntries).toEqual([]);
    expect(listBranches).not.toHaveBeenCalled();
  });

  it('grants manage-editors capability to an owner-capability role that is not literally named owner', async () => {
    const rt = runtimeWithRoles();
    const routes = createContentRoutes(rt);
    const { shell } = await routes.shellPayload(
      customRoleEvent('/admin/posts', 'club-admin', 'owner', quickFailBackend()) as never,
    );
    if (shell.public) throw new Error('expected authed shell');
    expect(screenIds(shell.nav.items)).toContain('editors');
    expect(shell.concepts).not.toEqual([]);
    await shell.pendingEntries;
  });

  it('exposes the nav label when a navMenu is configured', async () => {
    const rt = runtime();
    rt.navMenu = { configPath: 'x.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 };
    const { shell } = await createContentRoutes(rt).shellPayload(event('/admin/nav', 'editor', quickFailBackend()) as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(findScreen(shell.nav.items, 'nav')?.label).toBe('Primary nav');
    await shell.pendingEntries;
  });

  it('returns a bare public payload for a login path and never resolves the backend', async () => {
    const spy = vi.spyOn(backend, 'listBranches');
    const routes = createContentRoutes(runtime());
    const { shell } = await routes.shellPayload(event('/admin/login', null) as never);
    expect(shell.public).toBe(true);
    if (!shell.public) throw new Error('expected public shell');
    expect(shell.siteName).toBe('Test Site');
    // The login page pays no GitHub round-trip.
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
  });

  it('streams the pending entries parsed from the cairn refs (not awaited up front)', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.createBranch('cairn/posts/2026-05-hello', 'main');
    gh.createBranch('cairn/pages/about', 'main');
    gh.createBranch('cairn/oops', 'main'); // malformed: no entry id, dropped by the parser
    gh.install();
    const routes = createContentRoutes(runtime());
    const { shell } = await routes.shellPayload(event('/admin/posts', 'owner') as never);
    if (shell.public) throw new Error('expected authed shell');
    // pendingEntries is a streamed promise, resolved here for the assertion.
    expect(typeof shell.pendingEntries.then).toBe('function');
    expect(await shell.pendingEntries).toEqual([
      { concept: 'pages', id: 'about' },
      { concept: 'posts', id: '2026-05-hello' },
    ]);
  });

  it('filters refs with an invalid id or an unconfigured concept out of pendingEntries', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.createBranch('cairn/posts/2026-05-hello', 'main');
    gh.createBranch('cairn/widgets/x', 'main'); // concept this site does not configure
    gh.createBranch('cairn/posts/a%2fb', 'main'); // percent-escaped id fails the slug rule
    gh.install();
    const routes = createContentRoutes(runtime());
    const { shell } = await routes.shellPayload(event('/admin/posts', 'owner') as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(await shell.pendingEntries).toEqual([{ concept: 'posts', id: '2026-05-hello' }]);
  });

  it('degrades pendingEntries to null and logs github.unreachable when the token mint throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const routes = createContentRoutes(runtime());
    const failingBackend = makeGithubBackend(REPO, async () => {
      // The real missing-secret failure from appCredentials; the message names the env var
      // and never carries PEM material, which the redaction assertion below pins.
      throw new Error('GITHUB_APP_PRIVATE_KEY_B64 is not configured');
    });
    const { shell } = await routes.shellPayload(event('/admin/posts', 'owner', failingBackend) as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.siteName).toBe('Test Site');
    expect(shell.user.email).toBe('e@test');
    expect(shell.concepts).toHaveLength(2);
    // A sync token-mint throw becomes a caught rejection that degrades to null.
    expect(await shell.pendingEntries).toBeNull();

    const records = warnSpy.mock.calls
      .map((c) => c[0] as { event?: string; scope?: string; error?: string })
      .filter((r) => r.event === 'github.unreachable');
    expect(records).toHaveLength(1);
    expect(records[0].scope).toBe('shell');
    expect(records[0].error).toContain('GITHUB_APP_PRIVATE_KEY_B64 is not configured');
    expect(records[0].error).not.toContain('BEGIN');
    expect(records[0].error).not.toContain('PRIVATE KEY');
  });
});

/** A custom nav config with one flat entry and one section, for the navFilter tests below. */
const NAV_WITH_SECTION: AdminNavConfig = [
  { label: 'Standalone', icon: 'wrench', href: '/admin/tools' },
  {
    label: 'Club',
    children: [
      { label: 'Members', icon: 'users', href: '/admin/club/members' },
      { label: 'Events', icon: 'calendar', href: '/admin/club/events' },
    ],
  },
];

/** NAV_WITH_SECTION resolved, the shape resolveNavLayout folds into the default arrangement. */
const RESOLVED_NAV_WITH_SECTION: ResolvedNavItem[] = [
  { label: 'Standalone', iconName: 'wrench', href: '/admin/tools', ownerOnly: false },
  {
    label: 'Club',
    children: [
      { label: 'Members', iconName: 'users', href: '/admin/club/members', ownerOnly: false },
      { label: 'Events', iconName: 'calendar', href: '/admin/club/events', ownerOnly: false },
    ],
  },
];

const NAV_WITH_SECTION_CONCEPTS = [{ id: 'posts', label: 'Posts' }, { id: 'pages', label: 'Pages' }];

/** The default arrangement resolveNavLayout produces for NAV_WITH_SECTION at one capability: the
 *  flat 'Standalone' entry folds into Core (beside the concepts and engine screens), and the
 *  legacy 'Club' section rides alongside Core as its own top-level node. Every navFilter test
 *  below compares shellPayload's real output against this directly-computed baseline, so the
 *  wiring assertion never has to hand-trace the resolver's own shape. */
function defaultNav(capability: 'owner' | 'editor' | 'none') {
  return resolveNavLayout({
    layout: undefined,
    adminNav: RESOLVED_NAV_WITH_SECTION,
    concepts: NAV_WITH_SECTION_CONCEPTS,
    navMenuLabel: null,
    capability,
    role: capability,
  });
}

describe('shellPayload: navFilter', () => {
  // These tests never install a GitHub double, so the shell's fire-and-forget pendingEntries
  // probe would hit the network and settle (logging github.unreachable) after the test ends; see
  // the module-scoped quickFailBackend above. Each test silences the expected warn and awaits
  // the settled probe before returning.
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('leaves nav.items at exactly the resolved arrangement when no navFilter is configured', async () => {
    const rt = runtime();
    rt.adminNav = NAV_WITH_SECTION;
    const routes = createContentRoutes(rt);
    const { shell } = await routes.shellPayload(event('/admin/posts', 'editor', quickFailBackend()) as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.nav).toEqual(defaultNav('editor'));
    await shell.pendingEntries;
  });

  it('hides a whole section from the payload when navFilter drops it', async () => {
    const rt = runtime();
    rt.adminNav = NAV_WITH_SECTION;
    const routes = createContentRoutes(rt, {
      navFilter: (items) => items.filter((item) => item.label !== 'Club'),
    });
    const { shell } = await routes.shellPayload(event('/admin/posts', 'editor', quickFailBackend()) as never);
    if (shell.public) throw new Error('expected authed shell');
    const expected = defaultNav('editor');
    expect(shell.nav).toEqual({
      ...expected,
      items: expected.items.filter((item) => item.label !== 'Club'),
    });
    await shell.pendingEntries;
  });

  it('awaits an async navFilter and uses its resolved result', async () => {
    const rt = runtime();
    rt.adminNav = NAV_WITH_SECTION;
    const routes = createContentRoutes(rt, {
      navFilter: async (items) => {
        await Promise.resolve();
        return items.filter((item) => item.label === 'Core');
      },
    });
    const { shell } = await routes.shellPayload(event('/admin/posts', 'editor', quickFailBackend()) as never);
    if (shell.public) throw new Error('expected authed shell');
    const expected = defaultNav('editor');
    expect(shell.nav).toEqual({
      ...expected,
      items: expected.items.filter((item) => item.label === 'Core'),
    });
    await shell.pendingEntries;
  });

  it('hands navFilter the whole arranged top-level items, engine nodes included, plus the signed-in editor', async () => {
    const rt = runtime();
    rt.adminNav = NAV_WITH_SECTION;
    let received: unknown;
    let receivedEditor: unknown;
    const routes = createContentRoutes(rt, {
      navFilter: (items, ctx) => {
        received = items;
        receivedEditor = ctx.editor;
        return items;
      },
    });
    const { shell } = await routes.shellPayload(event('/admin/posts', 'owner', quickFailBackend()) as never);
    // Exact equality proves navFilter saw the whole resolved arrangement (the Core section with
    // its engine screens and the folded-in Standalone entry, plus the Club section), not just the
    // site's own custom items the legacy adminNav-only seam used to hand it.
    expect(received).toEqual(defaultNav('owner').items);
    expect(receivedEditor).toEqual({ displayName: 'Ed', email: 'e@test', role: 'owner', capability: 'owner' });
    if (!shell.public) await shell.pendingEntries;
  });

  it('yields an empty nav.items, fallback and the rest of the payload intact, when navFilter returns []', async () => {
    const rt = runtime();
    rt.adminNav = NAV_WITH_SECTION;
    const routes = createContentRoutes(rt, { navFilter: () => [] });
    const { shell } = await routes.shellPayload(event('/admin/posts', 'owner', quickFailBackend()) as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.nav.items).toEqual([]);
    // fallback never passes through navFilter: it is engine-only and already gated.
    expect(shell.nav.fallback).toEqual(defaultNav('owner').fallback);
    expect(shell.siteName).toBe('Test Site');
    expect(shell.user).toEqual({ displayName: 'Ed', email: 'e@test', role: 'owner', capability: 'owner' });
    await shell.pendingEntries;
  });
});

describe('indexRedirect', () => {
  it('redirects /admin to the first concept', () => {
    const routes = createContentRoutes(runtime());
    const e = event('/admin', 'owner');
    expect(() => routes.indexRedirect(e)).toThrow();
    try {
      routes.indexRedirect(e);
    } catch (err) {
      expect((err as { status: number; location: string }).status).toBe(307);
      expect((err as { location: string }).location).toBe('/admin/posts');
    }
  });

  it('carries a bounced ?error= through to the first concept, rather than dropping it', () => {
    const routes = createContentRoutes(runtime());
    const e = event('/admin?error=Something%20went%20wrong', 'owner');
    try {
      routes.indexRedirect(e);
      throw new Error('expected a redirect');
    } catch (err) {
      expect((err as { status: number; location: string }).status).toBe(307);
      expect((err as { location: string }).location).toBe('/admin/posts?error=Something%20went%20wrong');
    }
  });

  it('lands an editor-capability role on the first concept, unchanged by the role-aware landing', () => {
    const routes = createContentRoutes(runtime());
    const e = event('/admin', 'editor');
    try {
      routes.indexRedirect(e);
      throw new Error('expected a redirect');
    } catch (err) {
      expect((err as { status: number; location: string }).status).toBe(307);
      expect((err as { location: string }).location).toBe('/admin/posts');
    }
  });

  it('redirects a role with a declared home there, with a 303, over the default list landing', () => {
    const routes = createContentRoutes(runtimeWithRoles());
    const e = customRoleEvent('/admin', 'instructor', 'none');
    try {
      routes.indexRedirect(e as never);
      throw new Error('expected a redirect');
    } catch (err) {
      expect((err as { status: number; location: string }).status).toBe(303);
      expect((err as { location: string }).location).toBe('/admin/classes');
    }
  });

  it('lands a none-capability role with no declared home on the welcome view, not a redirect', () => {
    const routes = createContentRoutes(runtimeWithRoles());
    const e = customRoleEvent('/admin', 'volunteer', 'none');
    expect(routes.indexRedirect(e as never)).toEqual({
      view: 'welcome',
      page: { displayName: 'Inst', siteName: 'Test Site' },
    });
  });
});
