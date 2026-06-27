// Task 12: rename repoints frontmatter references on main and refuses a third-party open-branch
// inbound. renameAction builds a STRICT cross-branch reference index (fail-closed), refuses (409) when
// a DIFFERENT entry's open cairn/* branch references the target, repoints every published (main)
// inbound reference, and repoints the moved file's own self-references before re-deriving its row.
// These tests drive renameAction through the in-memory GithubDouble so the manifest read, the branch
// listing, the cross-branch reads, and the commit are real. The runtime carries an `author` reference
// and a `related` array(reference), so a linker on main or a branch declares real reference edges.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { GithubDouble } from '../unit/_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { parseManifest, verifyReferences, manifestEntryFromFile } from '../../lib/content/manifest.js';
import type { CairnRuntime, ConceptDescriptor } from '../../lib/content/types.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';

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
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    render: (md) => md,
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
  } as CairnRuntime;
}

const deps = { mintToken: () => Promise.resolve('test-token') };

/** A rename POST for posts/<id> to <slug>. */
function renameEvent(id: string, slug: string) {
  const body = new URLSearchParams({ slug });
  return {
    url: new URL(`https://t.example/admin/posts/${id}`),
    params: { concept: 'posts', id },
    request: new Request(`https://t.example/admin/posts/${id}`, { method: 'POST', body }),
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

/** Rename the target and either return the thrown redirect location or the fail() result. */
async function rename(gh: GithubDouble, id: string, slug: string): Promise<{ location?: string; status?: number; error?: string }> {
  gh.install();
  const routes = createContentRoutes(runtime(), deps);
  try {
    const result = (await routes.renameAction(renameEvent(id, slug) as never)) as unknown as {
      status: number; data: { error: string };
    };
    // A fail() returns rather than throws.
    return { status: result.status, error: result.data.error };
  } catch (e) {
    const loc = (e as { location?: string }).location;
    if (typeof loc === 'string') return { location: loc };
    throw e;
  }
}

afterEach(() => vi.restoreAllMocks());

describe('renameAction: reference repoint and cross-branch refusal (Task 12)', () => {
  const TARGET_PATH = 'src/content/posts/target.md';

  it('(a) repoints a MAIN inbound reference and re-derives its manifest references', async () => {
    // The linker references the target post via `related` (which points at the posts concept), so the
    // edge pair is (posts, target), which the rename of posts/target matches.
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
    const out = await rename(gh, 'target', 'renamed');
    expect(out.location).toBe('/admin/posts/renamed?renamed=1');
    // The linker's file repointed to the new id.
    expect(gh.read('main', 'src/content/posts/linker.md')).toContain('- renamed');
    expect(gh.read('main', 'src/content/posts/linker.md')).not.toContain('- target');
    // The committed manifest's linker row carries the re-derived edge at the new id.
    const committed = parseManifest(gh.read('main', MANIFEST_PATH)!);
    const linkerRow = committed.entries.find((e) => e.id === 'linker')!;
    expect(linkerRow.references).toEqual([{ field: 'related', concept: 'posts', id: 'renamed' }]);
  });

  it('(b) refuses (409) naming the branch when a THIRD-PARTY open branch references the target', async () => {
    const manifest = JSON.stringify({ version: 1, entries: [entry('posts', 'target')] });
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: manifest, [TARGET_PATH]: '---\ntitle: Target\n---\nbody' },
    });
    // A different entry, edited on its own pending branch, authors `related: [target]`.
    gh.createBranch('cairn/posts/other-post', 'main');
    gh.commit('cairn/posts/other-post', 'src/content/posts/other-post.md', '---\ntitle: Other\nrelated:\n  - target\n---\nbody');
    const out = await rename(gh, 'target', 'renamed');
    expect(out.status).toBe(409);
    expect(out.error).toContain('posts/other-post');
    // No commit landed: target still exists, no renamed file.
    expect(gh.read('main', TARGET_PATH)).toContain('title: Target');
    expect(gh.read('main', 'src/content/posts/renamed.md')).toBeNull();
    expect(gh.calls.some((c) => c.method === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
  });

  it('(c) a MAIN inbound does NOT trip the branch refusal (the published row has no .branch)', async () => {
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
    const out = await rename(gh, 'target', 'renamed');
    // The main inbound is repointed, not refused: the rename succeeds.
    expect(out.location).toBe('/admin/posts/renamed?renamed=1');
  });

  it('(d) repoints the moved file own SELF-reference so verifyReferences does not throw', async () => {
    // target authors itself via `related` (an old id self-reference).
    const manifest = JSON.stringify({
      version: 1,
      entries: [entry('posts', 'target', [{ field: 'related', concept: 'posts', id: 'target' }])],
    });
    const gh = new GithubDouble({
      main: {
        [MANIFEST_PATH]: manifest,
        [TARGET_PATH]: '---\ntitle: Target\nrelated:\n  - target\n---\nbody',
      },
    });
    const out = await rename(gh, 'target', 'renamed');
    expect(out.location).toBe('/admin/posts/renamed?renamed=1');
    // The moved file repointed its own self-reference to the new id.
    expect(gh.read('main', 'src/content/posts/renamed.md')).toContain('- renamed');
    expect(gh.read('main', 'src/content/posts/renamed.md')).not.toContain('- target');
    // The committed manifest's moved row carries the NEW id edge, and verifyReferences is satisfied.
    const committed = parseManifest(gh.read('main', MANIFEST_PATH)!);
    const movedRow = committed.entries.find((e) => e.id === 'renamed')!;
    expect(movedRow.references).toEqual([{ field: 'related', concept: 'posts', id: 'renamed' }]);
    expect(() => verifyReferences(committed)).not.toThrow();
  });

  it('(e) a stale committed manifest OMITTING a real main inbound is left to verifyReferences', async () => {
    // The committed manifest omits the linker's reference edge (a last-writer-wins stale row), but the
    // linker's file on disk really does reference target via `author`. The rename does not see the edge
    // in the manifest, so it does not repoint the file; the dangling edge survives into the built
    // manifest, where verifyReferences (the deploy gate) catches it.
    const committed = JSON.stringify({
      version: 1,
      entries: [
        entry('posts', 'target'),
        entry('posts', 'linker'), // omits the references edge (stale)
      ],
    });
    const gh = new GithubDouble({
      main: {
        [MANIFEST_PATH]: committed,
        [TARGET_PATH]: '---\ntitle: Target\n---\nbody',
        'src/content/posts/linker.md': '---\ntitle: Linker\nauthor: target\n---\nbody',
      },
    });
    const out = await rename(gh, 'target', 'renamed');
    expect(out.location).toBe('/admin/posts/renamed?renamed=1');
    // The linker file was NOT repointed (the stale manifest hid the edge), so it still says target.
    expect(gh.read('main', 'src/content/posts/linker.md')).toContain('author: target');
    // Reconstruct what the build would derive from disk: the linker still points at the gone target.
    const rt = runtime();
    const postsConcept = rt.concepts.find((c) => c.id === 'posts')!;
    const builtManifest = parseManifest(gh.read('main', MANIFEST_PATH)!);
    const linkerRaw = gh.read('main', 'src/content/posts/linker.md')!;
    builtManifest.entries = builtManifest.entries.map((e) =>
      e.id === 'linker'
        ? manifestEntryFromFile(postsConcept, { path: 'src/content/posts/linker.md', raw: linkerRaw })
        : e,
    );
    expect(() => verifyReferences(builtManifest)).toThrow(/linker/);
    expect(() => verifyReferences(builtManifest)).toThrow(/author/);
  });
});
