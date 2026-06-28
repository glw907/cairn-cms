// The server-side media rewrite planner against the stateful GitHub double. The planner unions the
// cross-branch usage index (Task 3a) with a per-entry transform (Task 1/2), to produce a preview
// plan: the affected main entries with their rewritten markdown and per-placement diff, plus a
// report-only cross-branch delta. It is fail-closed: an unverifiable branch read (strict mode)
// rejects rather than treating the branch as referencing nothing. Mirrors media-usage.test.ts: the
// same GithubDouble seed, concept, and manifest helpers, and the same forced strict-throw via a
// fetch that rejects on one branch's read.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { planMediaRewrite } from '../../lib/media/rewrite-plan.js';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { repointMediaRef, type RepointResult } from '../../lib/content/media-rewrite.js';
import { serializeMarkdown } from '../../lib/content/frontmatter.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';
import type { Manifest, ManifestEntry } from '../../lib/content/manifest.js';
import { fieldset } from '../../lib/content/fieldset.js';

const repo = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };
const token = 'test-token';
// The planner now takes a live Backend; the GithubDouble still intercepts the same fetch URLs below.
const backend = makeGithubBackend(repo, () => token);

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
    schema: fieldset({}),
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

/** A body-image markdown file for seeding a main entry or a branch. */
function entryMarkdown(opts: { title?: string; body?: string }): string {
  return serializeMarkdown({ title: opts.title ?? 'Hi' }, opts.body ?? '');
}

afterEach(() => vi.restoreAllMocks());

// Content hashes are 16 lowercase hex chars.
const OLD_HASH = 'aaaa1111aaaa1111';
const OTHER_HASH = 'cccc3333cccc3333';
const NEW_TOKEN = 'media:harbor.bbbb2222bbbb2222';

/** The real replace-in-place transform bound to a hash and a new token, the shape Tasks 5/6 pass. */
function repoint(hash: string, newToken: string): (markdown: string) => RepointResult {
  return (markdown) => repointMediaRef(markdown, hash, newToken);
}

describe('planMediaRewrite main entries', () => {
  it('plans both published entries that reference the hash, with rewritten markdown and placements', async () => {
    const a = entryMarkdown({ title: 'Alpha', body: `![A cairn](media:summit.${OLD_HASH})\n` });
    const b = entryMarkdown({ title: 'Bravo', body: `![A waymark](media:${OLD_HASH})\n` });
    const gh = new GithubDouble({
      main: {
        'src/content/posts/2026-05-alpha.md': a,
        'src/content/posts/2026-05-bravo.md': b,
      },
    });
    gh.install();

    const plan = await planMediaRewrite({
      backend,
      concepts: [postsConcept()],
      contentManifest: manifest([
        manifestEntry({ id: '2026-05-alpha', title: 'Alpha', mediaRefs: [OLD_HASH] }),
        manifestEntry({ id: '2026-05-bravo', title: 'Bravo', mediaRefs: [OLD_HASH] }),
      ]),
      hash: OLD_HASH,
      transform: repoint(OLD_HASH, NEW_TOKEN),
    });

    expect(plan.affectedCount).toBe(2);
    expect(plan.entries).toHaveLength(2);

    const alpha = plan.entries.find((e) => e.id === '2026-05-alpha');
    expect(alpha).toBeDefined();
    expect(alpha?.concept).toBe('posts');
    expect(alpha?.path).toBe('src/content/posts/2026-05-alpha.md');
    expect(alpha?.newMarkdown).toBe(a.replace(`media:summit.${OLD_HASH}`, NEW_TOKEN));
    expect(alpha?.placements).toEqual([
      { kind: 'body', before: `media:summit.${OLD_HASH}`, after: NEW_TOKEN },
    ]);

    const bravo = plan.entries.find((e) => e.id === '2026-05-bravo');
    expect(bravo?.newMarkdown).toBe(b.replace(`media:${OLD_HASH}`, NEW_TOKEN));
    expect(bravo?.placements).toEqual([
      { kind: 'body', before: `media:${OLD_HASH}`, after: NEW_TOKEN },
    ]);
  });

  it('excludes a published entry that references a different hash', async () => {
    const gh = new GithubDouble({
      main: {
        'src/content/posts/2026-05-alpha.md': entryMarkdown({
          title: 'Alpha',
          body: `![A cairn](media:summit.${OLD_HASH})\n`,
        }),
        'src/content/posts/2026-05-other.md': entryMarkdown({
          title: 'Other',
          body: `![Elsewhere](media:elsewhere.${OTHER_HASH})\n`,
        }),
      },
    });
    gh.install();

    const plan = await planMediaRewrite({
      backend,
      concepts: [postsConcept()],
      contentManifest: manifest([
        manifestEntry({ id: '2026-05-alpha', title: 'Alpha', mediaRefs: [OLD_HASH] }),
        // The OTHER entry's row is keyed under a different hash, so the index never returns it here.
        manifestEntry({ id: '2026-05-other', title: 'Other', mediaRefs: [OTHER_HASH] }),
      ]),
      hash: OLD_HASH,
      transform: repoint(OLD_HASH, NEW_TOKEN),
    });

    expect(plan.affectedCount).toBe(1);
    expect(plan.entries.map((e) => e.id)).toEqual(['2026-05-alpha']);
  });

  it('excludes an entry the transform does not change (zero placements) and does not count it', async () => {
    // The manifest claims both reference OLD_HASH, but the unchanged entry's body holds the token
    // inside an inline code span, so the figure-aware transform finds no image and reports zero
    // placements. It must drop out of entries and out of affectedCount.
    const changed = entryMarkdown({ title: 'Changed', body: `![A cairn](media:summit.${OLD_HASH})\n` });
    const inert = entryMarkdown({ title: 'Inert', body: `the literal \`media:${OLD_HASH}\` in code\n` });
    const gh = new GithubDouble({
      main: {
        'src/content/posts/2026-05-changed.md': changed,
        'src/content/posts/2026-05-inert.md': inert,
      },
    });
    gh.install();

    const plan = await planMediaRewrite({
      backend,
      concepts: [postsConcept()],
      contentManifest: manifest([
        manifestEntry({ id: '2026-05-changed', title: 'Changed', mediaRefs: [OLD_HASH] }),
        manifestEntry({ id: '2026-05-inert', title: 'Inert', mediaRefs: [OLD_HASH] }),
      ]),
      hash: OLD_HASH,
      transform: repoint(OLD_HASH, NEW_TOKEN),
    });

    expect(plan.affectedCount).toBe(1);
    expect(plan.entries.map((e) => e.id)).toEqual(['2026-05-changed']);
  });

  it('skips a published row whose read returns null', async () => {
    // The manifest names an entry whose file is absent on main (a stale manifest row): the read is
    // null, so the planner skips it rather than crashing or planning empty markdown.
    const alpha = entryMarkdown({ title: 'Alpha', body: `![A cairn](media:summit.${OLD_HASH})\n` });
    const gh = new GithubDouble({
      main: { 'src/content/posts/2026-05-alpha.md': alpha },
    });
    gh.install();

    const plan = await planMediaRewrite({
      backend,
      concepts: [postsConcept()],
      contentManifest: manifest([
        manifestEntry({ id: '2026-05-alpha', title: 'Alpha', mediaRefs: [OLD_HASH] }),
        manifestEntry({ id: '2026-05-gone', title: 'Gone', mediaRefs: [OLD_HASH] }),
      ]),
      hash: OLD_HASH,
      transform: repoint(OLD_HASH, NEW_TOKEN),
    });

    expect(plan.affectedCount).toBe(1);
    expect(plan.entries.map((e) => e.id)).toEqual(['2026-05-alpha']);
  });
});

describe('planMediaRewrite branch delta', () => {
  it('lists the open branches that reference the hash, grouped by branch, and excludes main', async () => {
    const gh = new GithubDouble({
      main: {
        'src/content/posts/2026-05-alpha.md': entryMarkdown({
          title: 'Alpha',
          body: `![A cairn](media:summit.${OLD_HASH})\n`,
        }),
      },
      'cairn/posts/2026-05-draft': {
        'src/content/posts/2026-05-draft.md': entryMarkdown({
          title: 'A draft',
          body: `see ![](media:photo.${OLD_HASH})`,
        }),
      },
      'cairn/posts/2026-05-other': {
        'src/content/posts/2026-05-other.md': entryMarkdown({
          title: 'Another draft',
          body: `also ![](media:photo.${OLD_HASH})`,
        }),
      },
    });
    gh.install();

    const plan = await planMediaRewrite({
      backend,
      concepts: [postsConcept()],
      contentManifest: manifest([manifestEntry({ id: '2026-05-alpha', title: 'Alpha', mediaRefs: [OLD_HASH] })]),
      hash: OLD_HASH,
      transform: repoint(OLD_HASH, NEW_TOKEN),
    });

    // The published entry is the planned (main) work; the open branches are the report-only delta.
    expect(plan.entries.map((e) => e.id)).toEqual(['2026-05-alpha']);
    expect(plan.branchDelta).toEqual([
      { branch: 'cairn/posts/2026-05-draft', entries: [{ concept: 'posts', id: '2026-05-draft' }] },
      { branch: 'cairn/posts/2026-05-other', entries: [{ concept: 'posts', id: '2026-05-other' }] },
    ]);
  });

  it('omits the branch delta when no open branch references the hash', async () => {
    const gh = new GithubDouble({
      main: {
        'src/content/posts/2026-05-alpha.md': entryMarkdown({
          title: 'Alpha',
          body: `![A cairn](media:summit.${OLD_HASH})\n`,
        }),
      },
    });
    gh.install();

    const plan = await planMediaRewrite({
      backend,
      concepts: [postsConcept()],
      contentManifest: manifest([manifestEntry({ id: '2026-05-alpha', title: 'Alpha', mediaRefs: [OLD_HASH] })]),
      hash: OLD_HASH,
      transform: repoint(OLD_HASH, NEW_TOKEN),
    });

    expect(plan.branchDelta).toEqual([]);
  });
});

describe('planMediaRewrite fail-closed', () => {
  it('rejects when a strict branch read fails, so the caller cannot apply against a partial usage view', async () => {
    const gh = new GithubDouble({
      main: {
        'src/content/posts/2026-05-alpha.md': entryMarkdown({
          title: 'Alpha',
          body: `![A cairn](media:summit.${OLD_HASH})\n`,
        }),
      },
      'cairn/posts/2026-05-ok': {
        'src/content/posts/2026-05-ok.md': entryMarkdown({ title: 'OK', body: `![](media:a.${OLD_HASH})` }),
      },
      'cairn/posts/2026-05-bad': {
        'src/content/posts/2026-05-bad.md': entryMarkdown({ title: 'Bad', body: `![](media:b.${OLD_HASH})` }),
      },
    });
    gh.install();
    // The contents read for the bad branch throws (a transient network error). buildUsageIndex runs
    // strict here, so the throw must propagate out of planMediaRewrite, never be swallowed.
    const realFetch = globalThis.fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request, init?: RequestInit) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url.includes('2026-05-bad')) return Promise.reject(new Error('boom'));
        return realFetch(input, init);
      }),
    );

    await expect(
      planMediaRewrite({
        backend,
        concepts: [postsConcept()],
        contentManifest: manifest([manifestEntry({ id: '2026-05-alpha', title: 'Alpha', mediaRefs: [OLD_HASH] })]),
        hash: OLD_HASH,
        transform: repoint(OLD_HASH, NEW_TOKEN),
      }),
    ).rejects.toThrow();
  });
});
