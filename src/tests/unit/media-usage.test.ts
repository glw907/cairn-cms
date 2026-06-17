// The cross-branch media usage index against the stateful GitHub double. The main arm reads the
// content manifest's per-entry mediaRefs (Task 1's field) without a per-file crawl; the branch arm
// lists open cairn/* branches, reconstructs each edited entry's path, parses it, and extracts its
// media refs. The map is keyed by content hash, so a renamed slug still resolves the same asset,
// and each entry contributes at most one row per origin.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { buildUsageIndex } from '../../lib/media/usage.js';
import { serializeMarkdown } from '../../lib/content/frontmatter.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';
import type { RepoRef } from '../../lib/github/types.js';
import type { Manifest, ManifestEntry } from '../../lib/content/manifest.js';

const repo: RepoRef = { owner: 'o', repo: 'r', branch: 'main' };
const token = 'test-token';

function postsConcept(): ConceptDescriptor {
  return {
    id: 'posts',
    label: 'Posts',
    singular: 'Posts',
    dir: 'src/content/posts',
    routing: { routable: true, dated: true, inFeeds: true },
    permalink: '/posts/:slug',
    datePrefix: 'day',
    fields: [
      { type: 'text', name: 'title', label: 'Title', required: true },
      { type: 'image', name: 'image', label: 'Hero', seo: true },
    ],
    summaryFields: [],
    validate: () => ({ ok: true as const, data: { title: 'Hi' } }),
  };
}

function manifestEntry(over: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    id: '2026-05-hi',
    concept: 'posts',
    title: 'Hi',
    permalink: '/posts/hi',
    draft: false,
    links: [],
    ...over,
  };
}

function manifest(entries: ManifestEntry[]): Manifest {
  return { version: 1, entries };
}

/** A markdown file with an optional hero image and an optional body, for seeding a branch. */
function entryMarkdown(opts: { title?: string; heroSrc?: string; body?: string }): string {
  const frontmatter: Record<string, unknown> = { title: opts.title ?? 'Hi' };
  if (opts.heroSrc) frontmatter.image = { src: opts.heroSrc, alt: 'a hero' };
  return serializeMarkdown(frontmatter, opts.body ?? '');
}

afterEach(() => vi.restoreAllMocks());

// Content hashes are 16 lowercase hex chars; parseMediaToken enforces this on the branch arm.
const PUB_HASH = '0000000000000abc';
const BRANCH_HASH = '00000000beef0000';
const HERO_HASH = '00000000face0000';
const DUP_HASH = '000000000dad0000';
const SHARED_HASH = '0000000feed0000a';

describe('buildUsageIndex main arm', () => {
  it('maps a published entry by each hash in its mediaRefs', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();

    const index = await buildUsageIndex(
      repo,
      token,
      [postsConcept()],
      manifest([manifestEntry({ mediaRefs: [PUB_HASH] })]),
    );

    const rows = index.get(PUB_HASH);
    expect(rows).toHaveLength(1);
    expect(rows?.[0]).toEqual({
      concept: 'posts',
      id: '2026-05-hi',
      title: 'Hi',
      permalink: '/posts/hi',
      origin: { kind: 'published' },
    });
  });

  it('yields nothing for a hash no published entry references', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();

    const index = await buildUsageIndex(
      repo,
      token,
      [postsConcept()],
      manifest([manifestEntry({ mediaRefs: [PUB_HASH] })]),
    );

    expect(index.get('0000000000unused')).toBeUndefined();
  });
});

describe('buildUsageIndex branch arm', () => {
  it('unions a branch-only reference absent from main with the branch origin', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/2026-05-draft': {
        'src/content/posts/2026-05-draft.md': entryMarkdown({
          title: 'A draft',
          body: `see ![](media:photo.${BRANCH_HASH})`,
        }),
      },
    });
    gh.install();

    const index = await buildUsageIndex(repo, token, [postsConcept()], manifest([]));

    const rows = index.get(BRANCH_HASH);
    expect(rows).toHaveLength(1);
    expect(rows?.[0]).toEqual({
      concept: 'posts',
      id: '2026-05-draft',
      title: 'A draft',
      origin: { kind: 'branch', branch: 'cairn/posts/2026-05-draft' },
    });
  });

  it('finds a frontmatter-hero reference on a branch', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/2026-05-hero': {
        'src/content/posts/2026-05-hero.md': entryMarkdown({
          title: 'Hero post',
          heroSrc: `media:cover.${HERO_HASH}`,
        }),
      },
    });
    gh.install();

    const index = await buildUsageIndex(repo, token, [postsConcept()], manifest([]));

    expect(index.get(HERO_HASH)?.[0]).toMatchObject({
      id: '2026-05-hero',
      origin: { kind: 'branch', branch: 'cairn/posts/2026-05-hero' },
    });
  });

  it('counts an asset referenced twice in one branch entry once', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/2026-05-twice': {
        'src/content/posts/2026-05-twice.md': entryMarkdown({
          title: 'Twice',
          body: `![](media:a.${DUP_HASH}) and again ![](media:b.${DUP_HASH})`,
        }),
      },
    });
    gh.install();

    const index = await buildUsageIndex(repo, token, [postsConcept()], manifest([]));

    expect(index.get(DUP_HASH)).toHaveLength(1);
  });

  it('keys by hash so a renamed slug resolves the same asset as a published bare-hash use', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/2026-05-renamed': {
        'src/content/posts/2026-05-renamed.md': entryMarkdown({
          title: 'Renamed',
          body: `![](media:newname.${SHARED_HASH})`,
        }),
      },
    });
    gh.install();

    const index = await buildUsageIndex(
      repo,
      token,
      [postsConcept()],
      // A published entry references the same bytes by the bare-hash form.
      manifest([manifestEntry({ id: '2026-05-pub', mediaRefs: [SHARED_HASH] })]),
    );

    const rows = index.get(SHARED_HASH);
    expect(rows).toHaveLength(2);
    expect(rows?.map((r) => r.origin.kind).sort()).toEqual(['branch', 'published']);
  });

  it('ignores a stray or unconfigured cairn/* ref without a row or a throw', async () => {
    const gh = new GithubDouble({
      main: {},
      // An unconfigured concept (this site has no "widgets") and a malformed ref.
      'cairn/widgets/2026-05-x': {
        'src/content/widgets/2026-05-x.md': entryMarkdown({ body: `![](media:a.${SHARED_HASH})` }),
      },
      'cairn/malformed': {},
    });
    gh.install();

    const index = await buildUsageIndex(repo, token, [postsConcept()], manifest([]));

    expect(index.get(SHARED_HASH)).toBeUndefined();
    // No read was attempted for the unconfigured branch path.
    expect(gh.calls.some((c) => c.url.includes('widgets'))).toBe(false);
  });
});
