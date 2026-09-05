import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { createNavRoutes } from '../../lib/sveltekit/nav-routes.js';
import { runtime as baseRuntime, contentEvent, expectRedirect } from './_content-harness.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  return baseRuntime({
    concepts: [],
    navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 },
  });
}

function saveEvent(treeJson: string) {
  return contentEvent({ url: 'https://t.example/admin/nav', form: { tree: treeJson } });
}

afterEach(() => vi.restoreAllMocks());

describe('navSaveAction', () => {
  it('commits the menu with the session editor as author, then redirects to saved', async () => {
    // The nav save is a head-guarded atomic commit (Git Data API), so the stateful double seeds
    // main with the YAML and answers the ref read, the head-guarded commit sequence, and the write.
    const gh = new GithubDouble({ main: { 'src/lib/site.config.yaml': 'siteName: S\nmenus:\n  primary:\n    - label: Old\n' } });
    gh.install();
    const routes = createNavRoutes(runtime());
    const { location } = await expectRedirect(() => routes.navSaveAction(saveEvent(JSON.stringify([{ label: 'Home', url: '/' }]))));
    expect(location).toBe('/admin/nav?saved=1');
    // The new YAML landed on main, carrying the new menu.
    expect(gh.read('main', 'src/lib/site.config.yaml')).toContain('label: Home');
    // The commit names the session editor as author, never a committer.
    const commitPost = gh.calls.find((c) => c.method === 'POST' && c.url.endsWith('/git/commits'))!;
    expect((commitPost.body as { author: unknown }).author).toEqual({ name: 'Ed Editor', email: 'ed@t' });
    expect(commitPost.body).not.toHaveProperty('committer');
  });

  it('logs commit.succeeded under scope, never a concept a site could also declare', async () => {
    const gh = new GithubDouble({ main: { 'src/lib/site.config.yaml': 'siteName: S\nmenus:\n  primary:\n    - label: Old\n' } });
    gh.install();
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const routes = createNavRoutes(runtime());
    await expectRedirect(() => routes.navSaveAction(saveEvent(JSON.stringify([{ label: 'Home', url: '/' }]))));
    const committed = infoSpy.mock.calls
      .map((c) => c[0] as Record<string, unknown>)
      .filter((r) => r.event === 'commit.succeeded');
    expect(committed).toHaveLength(1);
    expect(committed[0].scope).toBe('nav');
    expect(committed[0]).not.toHaveProperty('concept');
  });

  it('refuses an invalid tree in place and never commits', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = createNavRoutes(runtime());
    const result = (await routes.navSaveAction(
      saveEvent(JSON.stringify([{ url: '/no-label' }])),
    )) as unknown as { status: number; data: { error: string } };
    expect(result.status).toBe(400);
    expect(result.data.error).toMatch(/label/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses malformed JSON with generic copy, never reflecting the posted body into the alert', async () => {
    // JSON.parse's own SyntaxError embeds a snippet of the posted string in its message; that must
    // never reach the response, only fixed copy (the LOW7 review finding this pins).
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = createNavRoutes(runtime());
    const result = (await routes.navSaveAction(
      saveEvent('<script>not json</script>'),
    )) as unknown as { status: number; data: { error: string } };
    expect(result.status).toBe(400);
    expect(result.data.error).not.toContain('<script>');
    expect(result.data.error).toMatch(/could not be read/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('404s when the config file is gone at save time', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createNavRoutes(runtime());
    await expect(routes.navSaveAction(saveEvent(JSON.stringify([{ label: 'Home' }])))).rejects.toMatchObject({ status: 404 });
  });

  it('reports a head-moved conflict as a reload prompt without overwriting', async () => {
    // The save is now head-guarded: navSaveAction reads the head, then commit(expectedHead) re-reads it.
    // Return a different head on the second ref read so the fail-closed commit raises
    // CommitConflictError, which navSaveAction maps to the reload prompt. The raw read serves the YAML.
    let refReads = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      const accept = String((init?.headers as Record<string, string> | undefined)?.Accept ?? '');
      if (method === 'GET' && accept.includes('raw')) {
        return new Response('siteName: S\nmenus:\n  primary:\n    - label: Old\n', { status: 200 });
      }
      if (method === 'GET' && url.includes('/git/ref/heads/')) {
        refReads += 1;
        return new Response(JSON.stringify({ object: { sha: refReads === 1 ? 'h1' : 'h2' } }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    }));
    const routes = createNavRoutes(runtime());
    const result = (await routes.navSaveAction(
      saveEvent(JSON.stringify([{ label: 'Home', url: '/' }])),
    )) as unknown as { status: number; data: { error: string } };
    expect(result.status).toBe(409);
    expect(result.data.error).toMatch(/changed since/i);
  });
});
