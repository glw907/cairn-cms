// Task 11: the save-time reference warning. saveAction classifies each frontmatter reference edge
// against main's manifest (this entry upserted) and surfaces a NON-BLOCKING warning when the target is
// absent or draft. Unlike a body link (where an absent target hard-blocks with fail(400)), a reference
// NEVER blocks the save; absent and draft both only warn. These tests drive saveAction through the
// in-memory GithubDouble so the manifest read, the branch cut, and the entry commit are real, and read
// the warning off the success redirect's query string the way the editor surface does.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from '../unit/_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

const MANIFEST_PATH = 'src/content/.cairn/index.json';
const POST_PATH = 'src/content/posts/my-post.md';

/** A runtime with a posts concept carrying an `author` reference to the pages concept, so a save
 *  posts an author id the warning loop classifies against the committed manifest. */
function runtime(): CairnRuntime {
  const schema = fieldset({
    title: fields.text({ label: 'Title', required: true }),
    author: fields.reference({ concept: 'pages', label: 'Author' }),
  });
  return {
    siteName: 'T',
    concepts: [
      {
        id: 'posts', label: 'Posts', singular: 'Post', dir: 'src/content/posts',
        routing: { routable: true, dated: false, inFeeds: true },
        permalink: '/posts/:slug',
        datePrefix: 'day',
        fields: [
          { type: 'text', name: 'title', label: 'Title', required: true },
          { type: 'reference', name: 'author', concept: 'pages', label: 'Author' },
        ],
        schema,
        summaryFields: [],
        validate: (fm, body) => schema.validate(fm, body),
      },
      {
        id: 'pages', label: 'Pages', singular: 'Page', dir: 'src/content/pages',
        routing: { routable: true, dated: false, inFeeds: false },
        permalink: '/:slug',
        datePrefix: 'day',
        fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
        schema: fieldset({ title: fields.text({ label: 'Title', required: true }) }),
        summaryFields: [],
        validate: () => ({ ok: true, data: {} }),
      },
    ],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: (md) => md,
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
  } as CairnRuntime;
}

const deps = { backend: makeGithubBackend(REPO, () => Promise.resolve('test-token'))};

/** A save POST for posts/my-post setting `title` and an `author` reference id. */
function saveEvent(author: string) {
  const body = new URLSearchParams({ title: 'My Post', author, body: 'Body text.' });
  return {
    url: new URL('https://t.example/admin/posts/my-post'),
    params: { concept: 'posts', id: 'my-post' },
    request: new Request('https://t.example/admin/posts/my-post', { method: 'POST', body }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

/** One manifest entry. */
function entry(concept: string, id: string, draft: boolean) {
  return { id, concept, title: id, permalink: `/${concept}/${id}`, draft, links: [] };
}

/** Capture the success redirect's `refs` query param (the reference-warning channel), driving the
 *  save and reading the thrown redirect's location. Throws if the action did not redirect. */
async function savedRefs(gh: GithubDouble, author: string): Promise<string[]> {
  gh.install();
  const routes = createContentRoutes(runtime(), deps);
  try {
    await routes.saveAction(saveEvent(author) as never);
  } catch (e) {
    const loc = (e as { location?: string }).location;
    if (typeof loc !== 'string') throw e;
    const refs = new URL(loc, 'https://t.example').searchParams.get('refs');
    return refs ? refs.split(',').filter(Boolean) : [];
  }
  throw new Error('saveAction did not redirect');
}

afterEach(() => vi.restoreAllMocks());

describe('saveAction: the reference warning (Task 11)', () => {
  it('warns and still saves when the author references a DRAFT target', async () => {
    const manifest = JSON.stringify({ version: 1, entries: [entry('pages', 'jane-doe', true)] });
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: manifest } });
    const refs = await savedRefs(gh, 'jane-doe');
    expect(refs.length).toBe(1);
    expect(refs[0]).toContain('jane-doe');
    // The save landed on the entry's pending branch (it never blocked).
    expect(gh.read('cairn/posts/my-post', POST_PATH)).toContain('author: jane-doe');
  });

  it('warns and still saves when the author references an ABSENT target', async () => {
    const manifest = JSON.stringify({ version: 1, entries: [] });
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: manifest } });
    const refs = await savedRefs(gh, 'ghost-page');
    expect(refs.length).toBe(1);
    expect(refs[0]).toContain('ghost-page');
    // An absent reference NEVER blocks: the entry committed.
    expect(gh.read('cairn/posts/my-post', POST_PATH)).toContain('author: ghost-page');
  });

  it('warns nothing when the author references a PUBLISHED target', async () => {
    const manifest = JSON.stringify({ version: 1, entries: [entry('pages', 'jane-doe', false)] });
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: manifest } });
    const refs = await savedRefs(gh, 'jane-doe');
    expect(refs).toEqual([]);
    expect(gh.read('cairn/posts/my-post', POST_PATH)).toContain('author: jane-doe');
  });
});
