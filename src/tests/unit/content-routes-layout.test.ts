import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { runtime as baseRuntime, postsConcept, REPO, backend, contentEvent } from './_content-harness.js';
import { defineRoles } from '../../lib/auth/roles.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { Backend } from '../../lib/github/backend.js';
import type { AdminNavConfig } from '../../lib/sveltekit/admin-nav.js';

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
    expect(shell.user).toEqual({ displayName: 'Ed', email: 'e@test', role: 'owner' });
    expect(shell.concepts).toEqual([
      { id: 'posts', label: 'Posts' },
      { id: 'pages', label: 'Pages' },
    ]);
    expect(shell.pathname).toBe('/admin/posts');
    expect(shell.canManageEditors).toBe(true);
    expect(shell.navLabel).toBeNull();
    // Task 3 fills customNav; until then it is always empty.
    expect(shell.customNav).toEqual([]);
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
    expect(shell.canManageEditors).toBe(false);
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
    // Task 6: a none-capability session carries no engine concept nav (every route it links to
    // refuses a none session with 403) and no manage-editors capability.
    expect(shell.concepts).toEqual([]);
    expect(shell.canManageEditors).toBe(false);
    await shell.pendingEntries;
  });

  it('grants manage-editors capability to an owner-capability role that is not literally named owner', async () => {
    const rt = runtimeWithRoles();
    const routes = createContentRoutes(rt);
    const { shell } = await routes.shellPayload(
      customRoleEvent('/admin/posts', 'club-admin', 'owner', quickFailBackend()) as never,
    );
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.canManageEditors).toBe(true);
    expect(shell.concepts).not.toEqual([]);
    await shell.pendingEntries;
  });

  it('exposes the nav label when a navMenu is configured', async () => {
    const rt = runtime();
    rt.navMenu = { configPath: 'x.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 };
    const { shell } = await createContentRoutes(rt).shellPayload(event('/admin/nav', 'editor', quickFailBackend()) as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.navLabel).toBe('Primary nav');
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

/** NAV_WITH_SECTION resolved, the shape filterNavByRole and navFilter both see. */
const RESOLVED_NAV_WITH_SECTION = [
  { label: 'Standalone', iconName: 'wrench', href: '/admin/tools', ownerOnly: false },
  {
    label: 'Club',
    children: [
      { label: 'Members', iconName: 'users', href: '/admin/club/members', ownerOnly: false },
      { label: 'Events', iconName: 'calendar', href: '/admin/club/events', ownerOnly: false },
    ],
  },
];

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

  it('leaves customNav at exactly the role-filtered set when no navFilter is configured', async () => {
    const rt = runtime();
    rt.adminNav = NAV_WITH_SECTION;
    const routes = createContentRoutes(rt);
    const { shell } = await routes.shellPayload(event('/admin/posts', 'editor', quickFailBackend()) as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.customNav).toEqual(RESOLVED_NAV_WITH_SECTION);
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
    expect(shell.customNav).toEqual([RESOLVED_NAV_WITH_SECTION[0]]);
    await shell.pendingEntries;
  });

  it('awaits an async navFilter and uses its resolved result', async () => {
    const rt = runtime();
    rt.adminNav = NAV_WITH_SECTION;
    const routes = createContentRoutes(rt, {
      navFilter: async (items) => {
        await Promise.resolve();
        return items.filter((item) => item.label === 'Standalone');
      },
    });
    const { shell } = await routes.shellPayload(event('/admin/posts', 'editor', quickFailBackend()) as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.customNav).toEqual([RESOLVED_NAV_WITH_SECTION[0]]);
    await shell.pendingEntries;
  });

  it('hands navFilter only the role-filtered custom items and the signed-in editor, never a built-in entry', async () => {
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
    // Exact equality proves navFilter saw only the two custom items above, resolved and
    // role-filtered, and nothing from the built-in concepts/Library/Tags/Settings entries.
    expect(received).toEqual(RESOLVED_NAV_WITH_SECTION);
    expect(receivedEditor).toEqual({ displayName: 'Ed', email: 'e@test', role: 'owner', capability: 'owner' });
    if (!shell.public) await shell.pendingEntries;
  });

  it('yields an empty customNav, with the rest of the payload intact, when navFilter returns []', async () => {
    const rt = runtime();
    rt.adminNav = NAV_WITH_SECTION;
    const routes = createContentRoutes(rt, { navFilter: () => [] });
    const { shell } = await routes.shellPayload(event('/admin/posts', 'owner', quickFailBackend()) as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.customNav).toEqual([]);
    expect(shell.siteName).toBe('Test Site');
    expect(shell.user).toEqual({ displayName: 'Ed', email: 'e@test', role: 'owner' });
    expect(shell.canManageEditors).toBe(true);
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
