// The advisory-notice channel's pure core: the cross-branch address index and the collision
// predicate. addressCollision is the new logic, so it carries the thorough table; buildAddressIndex
// mirrors buildUsageIndex (it unions main's manifest with every open cairn/* branch) and gets a
// fake-backend smoke test, including the fail-open skip of a branch whose read throws.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import {
  addressCollision,
  buildAddressIndex,
  type AddressIndex,
} from '../../lib/content/advisories.js';
import { serializeMarkdown } from '../../lib/content/frontmatter.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';
import type { RepoRef } from '../../lib/github/types.js';
import type { Manifest, ManifestEntry } from '../../lib/content/manifest.js';

const idx: AddressIndex = new Map([
  ['/news/hello', [{ concept: 'posts', id: '2026-01-01-hello', title: 'Hello', source: 'main' }]],
  ['/about', [
    { concept: 'pages', id: 'about', title: 'About', source: 'main' },
    { concept: 'pages', id: 'about-copy', title: 'About copy', source: 'branch' },
  ]],
]);

describe('addressCollision', () => {
  it('flags a different entry sharing the address', () => {
    expect(addressCollision(idx, { concept: 'pages', id: 'about-copy' }, '/about')).toEqual({
      concept: 'pages', id: 'about', title: 'About', source: 'main',
    });
  });
  it('does not flag the entry against itself', () => {
    expect(addressCollision(idx, { concept: 'posts', id: '2026-01-01-hello' }, '/news/hello')).toBeNull();
  });
  it('returns null when the address is free', () => {
    expect(addressCollision(idx, { concept: 'posts', id: 'new' }, '/news/unused')).toBeNull();
  });
  it('returns the first other entry when several share the address', () => {
    const hit = addressCollision(idx, { concept: 'pages', id: 'third' }, '/about');
    expect(hit?.id).toBe('about');
  });
});

const repo: RepoRef = { owner: 'o', repo: 'r', branch: 'main' };
const token = 'test-token';

function postsConcept(): ConceptDescriptor {
  return {
    id: 'posts',
    label: 'Posts',
    singular: 'Posts',
    dir: 'src/content/posts',
    routing: { routable: true, dated: true, inFeeds: true },
    permalink: '/news/:slug',
    datePrefix: 'day',
    fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
    summaryFields: [],
    validate: () => ({ ok: true as const, data: { title: 'Hi' } }),
  };
}

function manifestEntry(over: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    id: '2026-01-01-hello',
    concept: 'posts',
    title: 'Hello',
    permalink: '/news/hello',
    draft: false,
    links: [],
    ...over,
  };
}

function manifest(entries: ManifestEntry[]): Manifest {
  return { version: 1, entries };
}

afterEach(() => vi.restoreAllMocks());

describe('buildAddressIndex', () => {
  it('unions a published entry and a branch entry that resolve to the same address', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/2026-02-02-hello': {
        'src/content/posts/2026-02-02-hello.md': serializeMarkdown({ title: 'Hello copy' }, 'body'),
      },
    });
    gh.install();

    const index = await buildAddressIndex(
      repo,
      token,
      [postsConcept()],
      manifest([manifestEntry()]),
    );

    const rows = index.get('/news/hello');
    expect(rows).toHaveLength(2);
    expect(rows?.map((r) => r.source).sort()).toEqual(['branch', 'main']);
    expect(rows?.find((r) => r.source === 'main')).toMatchObject({ concept: 'posts', id: '2026-01-01-hello' });
    expect(rows?.find((r) => r.source === 'branch')).toMatchObject({ concept: 'posts', id: '2026-02-02-hello' });
  });

  it('skips a branch whose read throws and still builds', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/2026-02-02-ok': {
        'src/content/posts/2026-02-02-ok.md': serializeMarkdown({ title: 'OK' }, 'body'),
      },
      // The bad branch is in the listing, but its content read rejects below.
      'cairn/posts/2026-02-02-bad': {
        'src/content/posts/2026-02-02-bad.md': serializeMarkdown({ title: 'Bad' }, 'body'),
      },
    });
    gh.install();
    const realFetch = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('2026-02-02-bad')) return Promise.reject(new Error('boom'));
      return realFetch(input, init);
    }));

    const index = await buildAddressIndex(repo, token, [postsConcept()], manifest([]));

    // The good branch resolved; the failed read degraded rather than sinking the build.
    expect(index.get('/news/ok')).toHaveLength(1);
  });
});
