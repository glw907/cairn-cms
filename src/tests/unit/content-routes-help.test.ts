// editor-help Pass 2 Task 3: the Help home load. helpLoad derives getting-started progress from the
// committed manifest and the open pending branches (the same GitHub fail-safe the shell uses), returns the
// markdown reference verbatim, and passes the runtime's support contact through. A GitHub failure
// degrades to an empty corpus (0 of 3) rather than failing the screen.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { markdownReference } from '../../lib/components/markdown-reference.js';
import { serializeManifest, type Manifest } from '../../lib/content/manifest.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import { fieldset } from '../../lib/content/fieldset.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

const MANIFEST_PATH = 'src/content/.cairn/index.json';

function runtime(over: Partial<CairnRuntime> = {}): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'Test Site',
    concepts: [
      { id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, permalink: '/posts/:slug', datePrefix: 'day', fields: [], schema: fieldset({}), summaryFields: [], validate: ok },
      { id: 'pages', label: 'Pages', singular: 'Pages', dir: 'src/content/pages', routing: { routable: true, dated: false, inFeeds: false }, permalink: '/:slug', datePrefix: 'day', fields: [], schema: fieldset({}), summaryFields: [], validate: ok },
    ],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    vocabulary: [],
    supportContact: 'help@test.example',
    ...over,
  };
}

// One published post, no page: the manifest that drives publishedPost true and createdPage false.
const ONE_PUBLISHED_POST: Manifest = {
  version: 1,
  entries: [
    {
      id: '2026-05-hello',
      concept: 'posts',
      title: 'Hello',
      date: '2026-05-01',
      permalink: '/posts/hello',
      draft: false,
      links: [],
    },
  ],
};

function event() {
  return {
    url: new URL('https://test.example/admin/help'),
    params: {},
    request: new Request('https://test.example/admin/help'),
    locals: { editor: { email: 'e@test', displayName: 'Ed', role: 'editor' as const } },
    platform: { env: {} },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('helpLoad', () => {
  it('derives progress from the committed manifest, returns the reference, and passes the support contact through', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest(ONE_PUBLISHED_POST) } });
    gh.install();
    const routes = createContentRoutes(runtime(), { backend: makeGithubBackend(REPO, async () => 'tok')});
    const result = await routes.helpLoad(event() as never);

    // One published post completes the write and publish steps; no page leaves the third open.
    expect(result.gettingStarted.wrotePost).toBe(true);
    expect(result.gettingStarted.publishedPost).toBe(true);
    expect(result.gettingStarted.createdPage).toBe(false);
    expect(result.gettingStarted.doneCount).toBe(2);

    // The reference is the single source array, untouched.
    expect(result.reference).toBe(markdownReference);
    expect(result.reference.length).toBeGreaterThanOrEqual(14);

    // The support contact comes straight from the runtime.
    expect(result.supportContact).toBe('help@test.example');
  });

  it('degrades to an empty corpus (0 of 3) when GitHub is unreachable, never throwing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const routes = createContentRoutes(runtime(), {
      backend: makeGithubBackend(REPO, async () => {
        throw new Error('GITHUB_APP_PRIVATE_KEY_B64 is not configured');
      }),
    });
    const result = await routes.helpLoad(event() as never);

    expect(result.gettingStarted).toEqual({
      wrotePost: false,
      publishedPost: false,
      createdPage: false,
      doneCount: 0,
      total: 3,
    });
    expect(result.reference).toBe(markdownReference);
    expect(result.supportContact).toBe('help@test.example');

    const records = warnSpy.mock.calls
      .map((c) => c[0] as { event?: string; scope?: string })
      .filter((r) => r.event === 'github.unreachable');
    expect(records).toHaveLength(1);
    expect(records[0].scope).toBe('help');
  });
});
