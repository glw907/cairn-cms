// Task 13: delete refuses across branches when the target is referenced. deleteEntry builds a STRICT
// cross-branch reference index (fail-closed) beside the existing main-only body-link gate. A non-empty
// reference bucket refuses (409) listing the referencing entries; a branch read that throws refuses
// (503) WITHOUT running the commit or the branch removal (the fail-closed proof), never proceeding to
// strand a still-referenced target. These tests drive deleteEntry through the in-memory GithubDouble so
// the manifest read, the branch listing, the cross-branch reads, and the commit are real. The runtime
// carries an `author` reference and a `related` array(reference), so a linker on main or a branch
// declares real reference edges.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from '../unit/_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { CairnRuntime, ConceptDescriptor } from '../../lib/content/types.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

const MANIFEST_PATH = 'src/content/.cairn/index.json';

/** A runtime with a posts concept carrying an `author` reference (to pages) and a `related`
 *  array(reference) (to posts), plus a pages concept. A linker can reference a post via either field. */
function runtime(): CairnRuntime {
  const postSchema = fieldset({
    title: fields.text({ label: 'Title', required: true }),
    author: fields.reference({ concept: 'pages', label: 'Author' }),
    related: fields.array(fields.reference({ concept: 'posts', label: 'Related post' }), { label: 'Related' }),
  });
  const posts: ConceptDescriptor = {
    id: 'posts', label: 'Posts', singular: 'Post', dir: 'src/content/posts',
    routing: { routable: true, dated: false, inFeeds: true },
    permalink: '/posts/:slug',
    datePrefix: 'day',
    fields: [
      { type: 'text', name: 'title', label: 'Title', required: true },
      { type: 'reference', name: 'author', concept: 'pages', label: 'Author' },
      { type: 'array', name: 'related', item: { type: 'reference', concept: 'posts', label: '' }, label: 'Related' },
    ],
    schema: postSchema,
    summaryFields: [],
    validate: (fm, body) => postSchema.validate(fm, body),
  };
  const pages: ConceptDescriptor = {
    id: 'pages', label: 'Pages', singular: 'Page', dir: 'src/content/pages',
    routing: { routable: true, dated: false, inFeeds: false },
    permalink: '/:slug',
    datePrefix: 'day',
    fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
    schema: fieldset({ title: fields.text({ label: 'Title', required: true }) }),
    summaryFields: [],
    validate: () => ({ ok: true, data: {} }),
  };
  return {
    siteName: 'T',
    concepts: [posts, pages],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
  } as CairnRuntime;
}

const deps = { backend: makeGithubBackend(REPO, () => Promise.resolve('test-token'))};

/** A delete POST for posts/<id> (the route-param delete action). */
function deleteEvent(id: string) {
  return {
    url: new URL(`https://t.example/admin/posts/${id}`),
    params: { concept: 'posts', id },
    request: new Request(`https://t.example/admin/posts/${id}`, { method: 'POST' }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

/** One manifest entry, optionally carrying reference edges. */
function entry(
  concept: string,
  id: string,
  references?: { field: string; concept: string; id: string }[],
) {
  return {
    id, concept, title: id, permalink: `/${concept}/${id}`, draft: false, links: [],
    ...(references ? { references } : {}),
  };
}

/** Delete the target and either return the thrown redirect location or the fail() result. */
async function del(id: string): Promise<{ location?: string; status?: number; data?: { error: string; inboundLinks?: { id: string }[] } }> {
  const routes = createContentRoutes(runtime(), deps);
  try {
    const result = (await routes.deleteAction(deleteEvent(id) as never)) as unknown as {
      status: number; data: { error: string; inboundLinks?: { id: string }[] };
    };
    // A fail() returns rather than throws.
    return { status: result.status, data: result.data };
  } catch (e) {
    const loc = (e as { location?: string }).location;
    if (typeof loc === 'string') return { location: loc };
    throw e;
  }
}

afterEach(() => vi.restoreAllMocks());

describe('deleteEntry: cross-branch reference refusal (Task 13)', () => {
  const TARGET_PATH = 'src/content/posts/target.md';

  it('refuses (409) when a MAIN entry references the target', async () => {
    // The linker references the target post via `related` (which points at the posts concept), so the
    // edge pair is (posts, target), which the delete of posts/target matches.
    const manifest = JSON.stringify({
      version: 1,
      entries: [
        entry('posts', 'target'),
        entry('posts', 'linker', [{ field: 'related', concept: 'posts', id: 'target' }]),
      ],
    });
    const gh = new GithubDouble({
      main: {
        [MANIFEST_PATH]: manifest,
        [TARGET_PATH]: '---\ntitle: Target\n---\nbody',
        'src/content/posts/linker.md': '---\ntitle: Linker\nrelated:\n  - target\n---\nbody',
      },
    });
    gh.install();
    const out = await del('target');
    expect(out.status).toBe(409);
    expect(out.data?.error).toContain('target');
    expect(out.data?.inboundLinks?.some((l) => l.id === 'linker')).toBe(true);
    // No commit landed: the target file still exists.
    expect(gh.read('main', TARGET_PATH)).toContain('title: Target');
    expect(gh.calls.some((c) => c.method === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
  });

  it('refuses (409) when an OPEN-BRANCH entry references the target', async () => {
    const manifest = JSON.stringify({ version: 1, entries: [entry('posts', 'target')] });
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: manifest, [TARGET_PATH]: '---\ntitle: Target\n---\nbody' },
    });
    // A different entry, edited on its own pending branch, authors `related: [target]`.
    gh.createBranch('cairn/posts/other-post', 'main');
    gh.commit('cairn/posts/other-post', 'src/content/posts/other-post.md', '---\ntitle: Other\nrelated:\n  - target\n---\nbody');
    gh.install();
    const out = await del('target');
    expect(out.status).toBe(409);
    expect(out.data?.inboundLinks?.some((l) => l.id === 'other-post')).toBe(true);
    // No commit landed: the target still exists.
    expect(gh.read('main', TARGET_PATH)).toContain('title: Target');
    expect(gh.calls.some((c) => c.method === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
  });

  it('refuses (503) and runs NEITHER commit NOR removeEntry when a branch read throws (fail-closed)', async () => {
    const manifest = JSON.stringify({ version: 1, entries: [entry('posts', 'target')] });
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: manifest, [TARGET_PATH]: '---\ntitle: Target\n---\nbody' },
    });
    // An open branch exists; its content read will throw, so the strict index build rethrows.
    gh.createBranch('cairn/posts/bad-branch', 'main');
    gh.commit('cairn/posts/bad-branch', 'src/content/posts/bad-branch.md', '---\ntitle: Bad\n---\nbody');
    gh.install();
    // Re-stub fetch so the branch's content read rejects (a transient network error), while listBranches
    // and the main reads still resolve through the double.
    const realFetch = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('bad-branch.md')) return Promise.reject(new Error('boom'));
      return realFetch(input, init);
    }));

    const out = await del('target');
    expect(out.status).toBe(503);
    expect(out.data?.error).toMatch(/could not verify/i);
    // The fail-closed proof: the target file is untouched and NO tree commit ran.
    expect(gh.read('main', TARGET_PATH)).toContain('title: Target');
    expect(gh.calls.some((c) => c.method === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
    // No manifest rewrite committed either: the manifest still carries the target row.
    expect(gh.read('main', MANIFEST_PATH)).toContain('"target"');
  });

  it('proceeds normally when nothing references the target', async () => {
    const manifest = JSON.stringify({ version: 1, entries: [entry('posts', 'target')] });
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: manifest, [TARGET_PATH]: '---\ntitle: Target\n---\nbody' },
    });
    gh.install();
    const out = await del('target');
    expect(out.location).toBe('/admin/posts');
    // The target file is gone from main.
    expect(gh.read('main', TARGET_PATH)).toBeNull();
  });
});
