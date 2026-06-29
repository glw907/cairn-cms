// The cross-branch tag usage index against the stateful GitHub double. The main arm reverse-maps each
// entry's manifest tags onto the bare tag value (a value is corpus-global, like a media hash, so the
// key is the value alone, never a concept/id pair); the branch arm lists open cairn/* branches,
// reconstructs each edited entry's path, parses it, coerces its marked taxonomy field, and keys each
// value with a branch origin. The load-bearing case: a tag present ONLY on an open branch reads in-use.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { GithubDouble } from './_github-double.js';
import { buildTagUsageIndex } from '../../lib/content/tag-usage-index.js';
import { serializeMarkdown } from '../../lib/content/frontmatter.js';
import { fieldset } from '../../lib/content/fieldset.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';
import type { Manifest, ManifestEntry } from '../../lib/content/manifest.js';

const repo = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };
const token = 'test-token';
const backend = makeGithubBackend(repo, () => token);

/** A posts concept whose `topics` multiselect is the marked taxonomy field. */
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
      { type: 'multiselect', name: 'topics', label: 'Topics', taxonomy: true },
    ],
    schema: fieldset({}),
    summaryFields: [],
    validate: () => ({ ok: true as const, data: { title: 'Hi' } }),
  };
}

/** A pages concept with no taxonomy field, so its branches never contribute a tag. */
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

/** A post markdown file seeding a branch, with an optional topics taxonomy value. */
function postMarkdown(opts: { title?: string; topics?: string[] }): string {
  const frontmatter: Record<string, unknown> = { title: opts.title ?? 'Hi' };
  if (opts.topics) frontmatter.topics = opts.topics;
  return serializeMarkdown(frontmatter, '');
}

afterEach(() => vi.restoreAllMocks());

describe('buildTagUsageIndex main arm', () => {
  it('reverse-maps a published entry onto each bare tag value with the published origin', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();

    const index = await buildTagUsageIndex(
      backend,
      [postsConcept(), pagesConcept()],
      manifest([manifestEntry({ id: 'hello', tags: ['svelte', 'web-design'] })]),
    );

    expect(index.get('svelte')).toEqual([
      { concept: 'posts', id: 'hello', origin: { kind: 'published' } },
    ]);
    expect(index.get('web-design')).toEqual([
      { concept: 'posts', id: 'hello', origin: { kind: 'published' } },
    ]);
  });

  it('yields nothing for a value no published entry carries', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();

    const index = await buildTagUsageIndex(backend, [postsConcept(), pagesConcept()], manifest([]));

    expect(index.get('svelte')).toBeUndefined();
  });
});

describe('buildTagUsageIndex branch arm', () => {
  it('keys a tag present only on an open branch as in-use with the branch origin', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/draft': {
        'src/content/posts/draft.md': postMarkdown({ title: 'A draft', topics: ['draft-only-tag'] }),
      },
    });
    gh.install();

    // No main entry carries 'draft-only-tag'; only the open branch does.
    const index = await buildTagUsageIndex(backend, [postsConcept(), pagesConcept()], manifest([]));

    expect(index.get('draft-only-tag')).toEqual([
      { concept: 'posts', id: 'draft', origin: { kind: 'branch', branch: 'cairn/posts/draft' } },
    ]);
  });

  it('honors an explicit opts.branches list over its own listing', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/seen': {
        'src/content/posts/seen.md': postMarkdown({ title: 'Seen', topics: ['seen-tag'] }),
      },
      'cairn/posts/hidden': {
        'src/content/posts/hidden.md': postMarkdown({ title: 'Hidden', topics: ['hidden-tag'] }),
      },
    });
    gh.install();

    const index = await buildTagUsageIndex(backend, [postsConcept(), pagesConcept()], manifest([]), {
      branches: ['cairn/posts/seen'],
    });

    expect(index.get('seen-tag')).toHaveLength(1);
    expect(index.get('hidden-tag')).toBeUndefined();
  });

  it('rethrows a branch read failure in strict mode so a delete gate can fail closed', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/ok': {
        'src/content/posts/ok.md': postMarkdown({ title: 'OK', topics: ['ok-tag'] }),
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
      buildTagUsageIndex(backend, [postsConcept(), pagesConcept()], manifest([]), {
        branches: ['cairn/posts/ok', 'cairn/posts/bad'],
        strict: true,
      }),
    ).rejects.toThrow();
  });

  it('degrades one failed branch read in the default best-effort mode', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/ok': {
        'src/content/posts/ok.md': postMarkdown({ title: 'OK', topics: ['ok-tag'] }),
      },
    });
    gh.install();
    const realFetch = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('bad')) return Promise.reject(new Error('boom'));
      return realFetch(input, init);
    }));

    const index = await buildTagUsageIndex(backend, [postsConcept(), pagesConcept()], manifest([]), {
      branches: ['cairn/posts/ok', 'cairn/posts/bad'],
    });

    // The good branch still resolved; the failed one was skipped, not thrown.
    expect(index.get('ok-tag')).toHaveLength(1);
  });

  it('skips a branch whose concept has no taxonomy field', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/pages/about': {
        'src/content/pages/about.md': serializeMarkdown({ title: 'About', topics: ['stray'] }, ''),
      },
    });
    gh.install();

    const index = await buildTagUsageIndex(backend, [postsConcept(), pagesConcept()], manifest([]));

    expect(index.get('stray')).toBeUndefined();
  });
});
