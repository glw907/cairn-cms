// Plan 3, Task 1: the vocabulary admin route pair. vocabularyLoad reads the committed vocabulary
// plus the cross-branch usage overlay and the in-use-but-unlisted seed set; vocabularySave validates
// the posted vocabulary, gates a delete on cross-branch usage (failing closed), and commits the
// `vocabulary` key into the same YAML the nav and settings saves write, head-guarded with the same
// isConflict reload bounce. The save mirrors settingsSave/navSave exactly; the load's usage overlay
// degrades best-effort like mediaLibraryLoad, so a transient read keeps the committed list visible.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { parseSiteConfig, extractVocabulary } from '../../lib/nav/site-config.js';
import { fieldset } from '../../lib/content/fieldset.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';

const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };
const CONFIG_PATH = 'src/lib/site.config.yaml';
const MANIFEST_PATH = 'src/content/.cairn/index.json';

// One concept with a marked taxonomy field, so the branch arm of the usage index can read a draft
// branch's tags. The main arm reads the manifest's per-entry tags, so the manifest is the usage
// source the load and the delete gate both consult.
const POSTS: ConceptDescriptor = {
  id: 'posts',
  label: 'Posts',
  singular: 'Posts',
  dir: 'src/content/posts',
  routing: { routable: true, dated: false, inFeeds: true },
  permalink: '/posts/:slug',
  datePrefix: 'day',
  fields: [
    { type: 'text', name: 'title', label: 'Title', required: true },
    { type: 'multiselect', name: 'topics', label: 'Topics', taxonomy: true },
  ],
  schema: fieldset({}),
  summaryFields: [],
  validate: () => ({ ok: true as const, data: { title: 'Hi' } }),
};

function runtime(over: Partial<CairnRuntime> = {}): CairnRuntime {
  return {
    siteName: 'T',
    concepts: [POSTS],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    vocabulary: [],
    navMenu: { configPath: CONFIG_PATH, menuName: 'primary', label: 'Primary nav', maxDepth: 2 },
    tidy: { enabled: false },
    ...over,
  };
}

const deps = { backend: makeGithubBackend(REPO, () => Promise.resolve('test-token')) };

// The committed config: a siteName plus a two-entry vocabulary (svelte in use, rust unused), with a
// comment so the round-trip-preserves-comments invariant has something to assert.
const SEED_YAML = [
  '# the site config',
  'siteName: S',
  'vocabulary:',
  '  - value: svelte',
  '    label: Svelte',
  '  - value: rust',
  '    label: Rust',
  '',
].join('\n');

// The committed manifest: one post tagged `svelte` and `extra`. `svelte` is in the vocabulary (so it
// reads as in use); `extra` is not (so it is an unlisted seed candidate).
const SEED_MANIFEST = JSON.stringify({
  version: 1,
  entries: [
    {
      id: 'first',
      concept: 'posts',
      title: 'First',
      permalink: '/posts/first',
      draft: false,
      links: [],
      tags: ['svelte', 'extra'],
    },
  ],
});

function seeded(): GithubDouble {
  const gh = new GithubDouble({ main: { [CONFIG_PATH]: SEED_YAML, [MANIFEST_PATH]: SEED_MANIFEST } });
  gh.install();
  return gh;
}

function loadEvent() {
  return {
    url: new URL('https://t.example/admin/vocabulary'),
    params: {},
    request: new Request('https://t.example/admin/vocabulary'),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

function saveEvent(vocabularyJson: string) {
  const body = new URLSearchParams({ vocabulary: vocabularyJson });
  return {
    url: new URL('https://t.example/admin/vocabulary'),
    params: {},
    request: new Request('https://t.example/admin/vocabulary', { method: 'POST', body }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('vocabularyLoad', () => {
  it('returns the committed vocabulary, a per-value usage count, and the unlisted seed set', async () => {
    seeded();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.vocabularyLoad(loadEvent() as never);
    expect(data.vocabulary).toEqual([
      { value: 'svelte', label: 'Svelte' },
      { value: 'rust', label: 'Rust' },
    ]);
    // svelte is carried by the seeded post; rust is in the vocabulary but unused.
    expect(data.usage).toEqual({ svelte: 1, rust: 0 });
    // extra is in use (the seeded post) but absent from the vocabulary: a seed candidate.
    expect(data.unlisted).toEqual([{ value: 'extra', count: 1 }]);
  });

  it('degrades the usage overlay to empty when the cross-branch read throws, keeping the list visible', async () => {
    // The config read succeeds (the raw GET serves the YAML); the branch listing throws, which the
    // non-strict buildTagUsageIndex rethrows (listBranches is outside its per-branch catch). The load
    // must catch that and still return a 200 with the committed vocabulary and an empty overlay.
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      const accept = String((init?.headers as Record<string, string> | undefined)?.Accept ?? '');
      if (method === 'GET' && accept.includes('raw')) {
        if (url.includes(encodeURIComponent(CONFIG_PATH)) || url.includes(CONFIG_PATH)) {
          return new Response(SEED_YAML, { status: 200 });
        }
        return new Response(SEED_MANIFEST, { status: 200 });
      }
      // The branch listing (matching-refs) fails: a transient GitHub error.
      if (method === 'GET' && url.includes('/git/matching-refs/')) return new Response('boom', { status: 500 });
      return new Response('{}', { status: 200 });
    }));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.vocabularyLoad(loadEvent() as never);
    expect(data.vocabulary).toEqual([
      { value: 'svelte', label: 'Svelte' },
      { value: 'rust', label: 'Rust' },
    ]);
    expect(data.usage).toEqual({});
    expect(data.unlisted).toEqual([]);
  });

  it('degrades the vocabulary to empty when the config read fails, not the error page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.vocabularyLoad(loadEvent() as never);
    expect(data.vocabulary).toEqual([]);
    expect(data.usage).toEqual({});
    expect(data.unlisted).toEqual([]);
  });
});

describe('vocabularySave', () => {
  it('commits a renamed label with no value change, head-guarded, with the editor as author', async () => {
    const gh = seeded();
    const routes = createContentRoutes(runtime(), deps);
    // Rename Svelte -> SvelteKit, value unchanged; rust unchanged.
    const posted = JSON.stringify([
      { value: 'svelte', label: 'SvelteKit' },
      { value: 'rust', label: 'Rust' },
    ]);
    try {
      await routes.vocabularySave(saveEvent(posted) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/vocabulary?saved=1');
    }
    const commitPost = gh.calls.find((c) => c.method === 'POST' && c.url.endsWith('/git/commits'))!;
    expect((commitPost.body as { author: unknown }).author).toEqual({ name: 'Ed Editor', email: 'ed@t' });
    const committed = gh.read('main', CONFIG_PATH)!;
    expect(committed).toContain('# the site config');
    const reparsed = extractVocabulary(parseSiteConfig(committed));
    expect(reparsed).toEqual([
      { value: 'svelte', label: 'SvelteKit' },
      { value: 'rust', label: 'Rust' },
    ]);
  });

  it('commits an added entry', async () => {
    const gh = seeded();
    const routes = createContentRoutes(runtime(), deps);
    const posted = JSON.stringify([
      { value: 'svelte', label: 'Svelte' },
      { value: 'rust', label: 'Rust' },
      { value: 'extra', label: 'Extra' },
    ]);
    try {
      await routes.vocabularySave(saveEvent(posted) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/vocabulary?saved=1');
    }
    const reparsed = extractVocabulary(parseSiteConfig(gh.read('main', CONFIG_PATH)!));
    expect(reparsed.map((v) => v.value)).toEqual(['svelte', 'rust', 'extra']);
  });

  it('rejects removing an in-use value, naming it, with no commit', async () => {
    const gh = seeded();
    const routes = createContentRoutes(runtime(), deps);
    // Drop svelte, which the seeded post carries: blocked by the strict cross-branch gate.
    const posted = JSON.stringify([{ value: 'rust', label: 'Rust' }]);
    try {
      await routes.vocabularySave(saveEvent(posted) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toMatch(/\/admin\/vocabulary\?error=/);
      expect(decodeURIComponent((e as { location: string }).location)).toContain('svelte');
    }
    // No commit landed: the committed vocabulary still carries both entries.
    expect(gh.calls.some((c) => c.method === 'POST' && c.url.endsWith('/git/commits'))).toBe(false);
    const reparsed = extractVocabulary(parseSiteConfig(gh.read('main', CONFIG_PATH)!));
    expect(reparsed.map((v) => v.value)).toEqual(['svelte', 'rust']);
  });

  it('commits when an unused value is removed', async () => {
    const gh = seeded();
    const routes = createContentRoutes(runtime(), deps);
    // Drop rust, which no entry carries: allowed.
    const posted = JSON.stringify([{ value: 'svelte', label: 'Svelte' }]);
    try {
      await routes.vocabularySave(saveEvent(posted) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/vocabulary?saved=1');
    }
    const reparsed = extractVocabulary(parseSiteConfig(gh.read('main', CONFIG_PATH)!));
    expect(reparsed.map((v) => v.value)).toEqual(['svelte']);
  });

  it('bounces a malformed posted vocabulary back to the form and never commits', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = createContentRoutes(runtime(), deps);
    // A value that violates SAFE_TAG_VALUE makes validateVocabulary throw.
    try {
      await routes.vocabularySave(saveEvent('[{"value":"Not A Slug","label":"x"}]') as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toMatch(/\/admin\/vocabulary\?error=/);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a head-moved conflict as a reload prompt without overwriting', async () => {
    // Serve the YAML and the manifest on raw reads, an empty branch list, but flip the ref head on the
    // second read so the head-guarded commit raises a conflict the save maps to the reload prompt.
    let refReads = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      const accept = String((init?.headers as Record<string, string> | undefined)?.Accept ?? '');
      if (method === 'GET' && accept.includes('raw')) {
        if (url.includes(CONFIG_PATH)) return new Response(SEED_YAML, { status: 200 });
        return new Response(SEED_MANIFEST, { status: 200 });
      }
      if (method === 'GET' && url.includes('/git/matching-refs/')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (method === 'GET' && url.includes('/git/ref/heads/')) {
        refReads += 1;
        return new Response(JSON.stringify({ object: { sha: refReads === 1 ? 'h1' : 'h2' } }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    }));
    const routes = createContentRoutes(runtime(), deps);
    // A pure label rename (no removed value) reaches the commit, where the head moves under it.
    const posted = JSON.stringify([
      { value: 'svelte', label: 'SvelteKit' },
      { value: 'rust', label: 'Rust' },
    ]);
    try {
      await routes.vocabularySave(saveEvent(posted) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=.*changed%20since/i);
    }
  });
});
