// Task 3 (admin access map): the driven-request proof that a declared access map gates the
// engine's own routes, not just the sidebar: a restricted concept and a restricted fixed screen
// each 403 a role the map does not name, admit the named role and owner, and an unrestricted
// concept keeps today's any-editor-capability behavior. Mirrors nav-layout-composition.test.ts's
// style: a real createContentRoutes over a custom role vocabulary, driven with a token provider
// that throws synchronously, so every backend touch is a caught rejection (a real network call
// never happens) and the load functions degrade gracefully past the gate under test.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { defineRoles } from '../../lib/auth/roles.js';
import { defineAccess } from '../../lib/auth/access.js';
import { githubApp } from '../../lib/index.js';
import { fieldset } from '../../lib/content/fieldset.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { AccessMap } from '../../lib/auth/access.js';

const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

// No GET/POST here ever reaches a real fetch: every backend call rejects at the token step, the
// same technique nav-layout-composition.test.ts uses, so every load degrades to its own
// graceful empty/error state rather than making a network call.
const backend = makeGithubBackend(REPO, async () => {
  throw new Error('GITHUB_APP_PRIVATE_KEY_B64 is not configured');
});

const ROLES = defineRoles({
  owner: 'owner',
  webmaster: 'editor',
  publisher: 'editor',
});

// pages is restricted to webmaster; posts carries no rule and keeps today's any-editor behavior;
// the four fixed screens this pass enforces are all restricted to webmaster too. The double cast
// mirrors auth-access.test.ts's `r()` helper: 'webmaster' is outside the unaugmented owner/editor
// Role union this test file sees, the same shape a real site's CairnRolesRegister widens away.
const ACCESS = defineAccess(ROLES, {
  pages: ['webmaster'],
  media: ['webmaster'],
  vocabulary: ['webmaster'],
  settings: ['webmaster'],
} as unknown as AccessMap);

function concept(id: string) {
  return {
    id,
    label: id,
    singular: id,
    dir: `src/content/${id}`,
    routing: { routable: true, dated: false, inFeeds: false },
    permalink: `/${id}/:slug`,
    datePrefix: 'day' as const,
    fields: [],
    schema: fieldset({}),
    summaryFields: [],
    validate: () => ({ ok: true as const, data: {} }),
  };
}

function runtime(): CairnRuntime {
  return {
    siteName: 'Access Site',
    concepts: [concept('posts'), concept('pages')],
    backend: githubApp(REPO),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    vocabulary: [],
    roles: ROLES,
    access: ACCESS,
  };
}

/** A driven request for one signed-in role/capability pair. GET by default; a `form` posts. */
function event(
  role: string,
  capability: 'owner' | 'editor',
  params: Record<string, string> = {},
  form?: Record<string, string>,
) {
  const url = 'https://test.example/admin/x';
  const init: RequestInit = form ? { method: 'POST', body: new URLSearchParams(form) } : {};
  return {
    url: new URL(url),
    params,
    request: new Request(url, init),
    locals: { editor: { email: `${role}@test`, displayName: role, role, capability }, backend },
    platform: { env: {} },
    cookies: { get: () => undefined, set: () => {}, delete: () => {} },
  };
}

/** The HTTP status of a rejected call, or null when it did not reject. Robust to whatever happens
 *  past the access gate (a redirect, a degraded return, a later unrelated failure): this suite
 *  only asserts on the gate's own 403, never on the rest of the action completing. */
async function statusOf(promise: Promise<unknown>): Promise<number | null> {
  try {
    await promise;
    return null;
  } catch (err) {
    return (err as { status?: number }).status ?? null;
  }
}

describe('access map: engine route enforcement', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('403s a non-listed role on a restricted concept, on list load and save action', async () => {
    const routes = createContentRoutes(runtime());
    expect(await statusOf(routes.listLoad(event('publisher', 'editor', { concept: 'pages' }) as never))).toBe(403);
    expect(
      await statusOf(
        routes.saveAction(event('publisher', 'editor', { concept: 'pages', id: 'p1' }, { title: 'x' }) as never),
      ),
    ).toBe(403);
  });

  it('admits the mapped role and owner on the restricted concept', async () => {
    const routes = createContentRoutes(runtime());
    expect(await statusOf(routes.listLoad(event('webmaster', 'editor', { concept: 'pages' }) as never))).not.toBe(403);
    expect(await statusOf(routes.listLoad(event('owner', 'owner', { concept: 'pages' }) as never))).not.toBe(403);
  });

  it('keeps today\'s any-editor-capability behavior for an unrestricted concept', async () => {
    const routes = createContentRoutes(runtime());
    expect(await statusOf(routes.listLoad(event('publisher', 'editor', { concept: 'posts' }) as never))).not.toBe(403);
  });

  it('403s a non-listed role on each mapped fixed screen', async () => {
    const routes = createContentRoutes(runtime());
    expect(await statusOf(routes.mediaLibraryLoad(event('publisher', 'editor') as never))).toBe(403);
    expect(await statusOf(routes.vocabularyLoad(event('publisher', 'editor') as never))).toBe(403);
    expect(await statusOf(routes.settingsLoad(event('publisher', 'editor') as never))).toBe(403);
  });

  it('owner passes every mapped fixed screen', async () => {
    const routes = createContentRoutes(runtime());
    expect(await statusOf(routes.mediaLibraryLoad(event('owner', 'owner') as never))).not.toBe(403);
    expect(await statusOf(routes.vocabularyLoad(event('owner', 'owner') as never))).not.toBe(403);
    expect(await statusOf(routes.settingsLoad(event('owner', 'owner') as never))).not.toBe(403);
  });
});
