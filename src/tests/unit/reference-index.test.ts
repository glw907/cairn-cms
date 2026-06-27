// The strict cross-branch reference index against the stateful GitHub double. The main arm reverse-
// maps each entry's manifest references (Task 6) onto the TARGET (concept, id) pair without a per-file
// crawl; the branch arm lists open cairn/* branches, reconstructs each edited entry's path, parses it,
// and extracts its reference edges. The map keys the TARGET pair `${concept}/${id}`, never an id alone,
// since ids are unique only within a concept.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { buildReferenceIndex } from '../../lib/content/reference-index.js';
import { serializeMarkdown } from '../../lib/content/frontmatter.js';
import { fieldset } from '../../lib/content/fieldset.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';
import type { RepoRef } from '../../lib/github/types.js';
import type { Manifest, ManifestEntry } from '../../lib/content/manifest.js';

const repo: RepoRef = { owner: 'o', repo: 'r', branch: 'main' };
const token = 'test-token';

/** A posts concept whose `author` references a pages target and `related` references other posts. */
function postsConcept(): ConceptDescriptor {
  return {
    id: 'posts',
    label: 'Posts',
    singular: 'Posts',
    dir: 'src/content/posts',
    routing: { routable: true, dated: false, inFeeds: true },
    permalink: '/posts/:slug',
    datePrefix: 'day',
    fields: [
      { type: 'text', name: 'title', label: 'Title', required: true },
      { type: 'reference', name: 'author', concept: 'pages', label: 'Author' },
      {
        type: 'array',
        name: 'related',
        item: { type: 'reference', concept: 'posts', label: '' },
        label: 'Related',
      },
    ],
    schema: fieldset({}),
    summaryFields: [],
    validate: () => ({ ok: true as const, data: { title: 'Hi' } }),
  };
}

/** A pages concept, the reference target of a post's `author`. */
function pagesConcept(): ConceptDescriptor {
  return {
    id: 'pages',
    label: 'Pages',
    singular: 'Pages',
    dir: 'src/content/pages',
    routing: { routable: true, dated: false, inFeeds: false },
    permalink: '/:slug',
    datePrefix: 'day',
    fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
    schema: fieldset({}),
    summaryFields: [],
    validate: () => ({ ok: true as const, data: { title: 'Hi' } }),
  };
}

function manifestEntry(over: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    id: 'hello',
    concept: 'posts',
    title: 'Hello',
    permalink: '/posts/hello',
    draft: false,
    links: [],
    ...over,
  };
}

function manifest(entries: ManifestEntry[]): Manifest {
  return { version: 1, entries };
}

/** A post markdown file seeding a branch, with optional reference fields. */
function postMarkdown(opts: { title?: string; author?: string; related?: string[] }): string {
  const frontmatter: Record<string, unknown> = { title: opts.title ?? 'Hi' };
  if (opts.author) frontmatter.author = opts.author;
  if (opts.related) frontmatter.related = opts.related;
  return serializeMarkdown(frontmatter, '');
}

afterEach(() => vi.restoreAllMocks());

describe('buildReferenceIndex main arm', () => {
  it('reverse-maps a published entry onto each edge target (concept, id) pair', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();

    const index = await buildReferenceIndex(
      repo,
      token,
      [postsConcept(), pagesConcept()],
      manifest([
        manifestEntry({
          id: 'hello',
          references: [{ field: 'author', concept: 'pages', id: 'jane-doe' }],
        }),
      ]),
    );

    const rows = index.get('pages/jane-doe');
    expect(rows).toHaveLength(1);
    expect(rows?.[0]).toEqual({
      concept: 'posts',
      id: 'hello',
      title: 'Hello',
      permalink: '/posts/hello',
      field: 'author',
      origin: { kind: 'published' },
    });
  });

  it('yields nothing for a target no published entry references', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();

    const index = await buildReferenceIndex(repo, token, [postsConcept(), pagesConcept()], manifest([]));

    expect(index.get('pages/jane-doe')).toBeUndefined();
  });
});

describe('buildReferenceIndex branch arm', () => {
  it('reads an open branch file and reverse-maps its edges with the branch origin', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/draft': {
        'src/content/posts/draft.md': postMarkdown({ title: 'A draft', author: 'jane-doe' }),
      },
    });
    gh.install();

    const index = await buildReferenceIndex(
      repo,
      token,
      [postsConcept(), pagesConcept()],
      manifest([]),
    );

    const rows = index.get('pages/jane-doe');
    expect(rows).toHaveLength(1);
    expect(rows?.[0]).toEqual({
      concept: 'posts',
      id: 'draft',
      title: 'A draft',
      field: 'author',
      origin: { kind: 'branch', branch: 'cairn/posts/draft' },
    });
  });

  it('rethrows a branch read failure in strict mode so a delete gate can fail closed', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/ok': {
        'src/content/posts/ok.md': postMarkdown({ title: 'OK', author: 'jane-doe' }),
      },
    });
    gh.install();
    const realFetch = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('bad')) return Promise.reject(new Error('boom'));
      return realFetch(input, init);
    }));

    await expect(
      buildReferenceIndex(repo, token, [postsConcept(), pagesConcept()], manifest([]), {
        branches: ['cairn/posts/ok', 'cairn/posts/bad'],
        strict: true,
      }),
    ).rejects.toThrow();
  });

  it('degrades one failed branch read in the default best-effort mode', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/ok': {
        'src/content/posts/ok.md': postMarkdown({ title: 'OK', author: 'jane-doe' }),
      },
    });
    gh.install();
    const realFetch = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('bad')) return Promise.reject(new Error('boom'));
      return realFetch(input, init);
    }));

    const index = await buildReferenceIndex(
      repo,
      token,
      [postsConcept(), pagesConcept()],
      manifest([]),
      { branches: ['cairn/posts/ok', 'cairn/posts/bad'] },
    );

    // The good branch still resolved; the failed one was skipped, not thrown.
    expect(index.get('pages/jane-doe')).toHaveLength(1);
  });
});

describe('buildReferenceIndex pair disambiguation', () => {
  it('keys on the (concept, id) pair so pages/about and posts/about never collide', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();

    // A post references posts/about (not pages/about). Both ids are "about".
    const index = await buildReferenceIndex(
      repo,
      token,
      [postsConcept(), pagesConcept()],
      manifest([
        manifestEntry({ id: 'about', concept: 'pages', title: 'About page', permalink: '/about' }),
        manifestEntry({ id: 'about', concept: 'posts', title: 'About post', permalink: '/posts/about' }),
        manifestEntry({
          id: 'hello',
          references: [{ field: 'related', concept: 'posts', id: 'about' }],
        }),
      ]),
    );

    // The post target bucket is non-empty; the page target bucket is empty (no reverse-map by id alone).
    expect(index.get('posts/about')).toHaveLength(1);
    expect(index.get('posts/about')?.[0].field).toBe('related');
    expect(index.get('pages/about')).toBeUndefined();
  });
});
