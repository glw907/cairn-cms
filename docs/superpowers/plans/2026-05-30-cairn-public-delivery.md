# Public content delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the engine a public read-and-deliver layer (content query index, feeds, sitemap, robots, tag and archive loaders, pagination, SEO head, and one permalink resolver) so sites stop hand-rolling it.

**Architecture:** Pure builders and a concept-generic content index live in the engine and take plain data; thin SvelteKit loaders wire a site's index, renderer, and origin into them. The template owns the glob line, the page markup, and the route shims. id, date, and URL are decoupled, and one permalink resolver drives every URL.

**Tech Stack:** TypeScript 6, SvelteKit 2, Vitest 4 (unit project, node env), gray-matter (already a dependency), no new runtime dependencies.

This plan implements `docs/superpowers/specs/2026-05-30-cairn-public-delivery-design.md`. Read that spec first. The engine is `@glw907/cairn-cms`; tests run with `npm run test:unit` (node) and the full gate is `npm run check` (0 errors, 0 warnings) plus `npm test` (exit 0).

---

## Execution notes

Run this with subagent-driven-development, one `cairn-implementer` per task, in a fresh worktree off `main` rather than the `feat/rise-data-attr` worktree. Create it with `git worktree add ../cairn-public-delivery -b feat/public-delivery main`, so the checkout starts at the committed spec and plan.

Each task is one module plus its test, which is the right size for a fresh subagent, so the Sonnet default fits most of them. Task 9 is the exception. It is a mechanical rename spread across the contract types, the runtime, a Svelte component, eight unit tests, a component test, and the showcase, so dispatch it with `model: opus` and confirm that `grep -rn renderPreview src examples` is empty and the full suite is green before moving on. It stays one task because a partial rename leaves the build red, so it cannot be split across commits.

Order matters from Task 4 onward, because every later task reads the content index, and Task 10 needs the renamed `render` from Task 9.

---

## File structure

New engine files:

- `src/lib/content/permalink.ts` holds the permalink resolver and pattern validation. It lives in `content/` because the pattern is part of the concept contract.
- `src/lib/delivery/content-index.ts` defines `RawFile`, `ContentSummary`, `ContentEntry`, `ContentIndex`, `createContentIndex`, and `fromGlob`.
- `src/lib/delivery/excerpt.ts` defines `deriveExcerpt` and `wordCount`.
- `src/lib/delivery/feeds.ts` defines `FeedChannel`, `FeedItem`, `buildRssFeed`, and `buildJsonFeed`.
- `src/lib/delivery/sitemap.ts` defines `SitemapUrl` and `buildSitemap`.
- `src/lib/delivery/robots.ts` defines `buildRobots`.
- `src/lib/delivery/seo.ts` defines `SeoInput`, `SeoMeta`, and `buildSeoMeta`.
- `src/lib/delivery/paginate.ts` defines `Page` and `paginate`.
- `src/lib/sveltekit/public-routes.ts` defines `createPublicRoutes` and the `entries()` helpers.

Modified engine files:

- `src/lib/content/types.ts` adds `permalink` to `ConceptConfig` and `ConceptDescriptor`, and renames `renderPreview` to `render` on `CairnAdapter` and `CairnRuntime`.
- `src/lib/content/concepts.ts` fills the per-concept permalink default in `normalizeConcepts`.
- `src/lib/content/compose.ts` carries `render` through.
- `src/lib/components/EditPage.svelte` renames the `renderPreview` prop to `render`.
- `src/lib/index.ts` re-exports the delivery surface and the permalink resolver.
- `src/lib/sveltekit/index.ts` re-exports `createPublicRoutes`.

Test files (unit project, node env):

- `src/tests/unit/content-permalink.test.ts`
- `src/tests/unit/delivery-excerpt.test.ts`
- `src/tests/unit/delivery-content-index.test.ts`
- `src/tests/unit/delivery-feeds.test.ts`
- `src/tests/unit/delivery-sitemap.test.ts`
- `src/tests/unit/delivery-seo.test.ts`
- `src/tests/unit/delivery-paginate.test.ts`
- `src/tests/unit/public-routes.test.ts`
- `src/tests/unit/delivery-exports.test.ts`
- `src/tests/unit/delivery-concept-generic.test.ts`

The rename task (Task 9) also updates the shared `_content-fixture.ts` and the route, compose, and health tests that build an inline adapter.

---

## Task 1: Add the permalink pattern to the content contract

The pattern is a per-concept field. `normalizeConcepts` fills a default of `/:slug` for Pages and `/<conceptId>/:slug` for any other routable concept. Pages is a curated concept the engine already special-cases in `CONCEPT_ROUTING`, so keying the root default off its id is consistent.

**Files:**
- Modify: `src/lib/content/types.ts` (the `ConceptConfig` and `ConceptDescriptor` interfaces)
- Modify: `src/lib/content/concepts.ts` (`normalizeConcepts`)
- Test: `src/tests/unit/content-concepts.test.ts` (extend the existing file)

- [ ] **Step 1: Write the failing test**

Append to `src/tests/unit/content-concepts.test.ts`:

```ts
describe('permalink defaults', () => {
  it('defaults pages to the root slug and other concepts to a prefixed slug', () => {
    const concepts = normalizeConcepts({
      posts: { dir: 'd', fields: [], validate: () => ({ ok: true, data: {} }) },
      pages: { dir: 'd', fields: [], validate: () => ({ ok: true, data: {} }) },
    });
    expect(concepts.find((c) => c.id === 'posts')!.permalink).toBe('/posts/:slug');
    expect(concepts.find((c) => c.id === 'pages')!.permalink).toBe('/:slug');
  });

  it('uses an explicit permalink when the config provides one', () => {
    const [concept] = normalizeConcepts({
      posts: { dir: 'd', fields: [], validate: () => ({ ok: true, data: {} }), permalink: '/:year/:month/:slug' },
    });
    expect(concept.permalink).toBe('/:year/:month/:slug');
  });
});
```

Confirm the existing file already imports `normalizeConcepts` and `describe/it/expect`; reuse those imports.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- content-concepts`
Expected: FAIL, `permalink` is `undefined` on the descriptor.

- [ ] **Step 3: Add `permalink` to the contract types**

In `src/lib/content/types.ts`, add to `ConceptConfig` (after `validate`):

```ts
  /**
   * Public URL pattern for this concept, a `/`-prefixed string of literal segments and the
   * tokens `:slug`, `:year`, `:month`, `:day`. `normalizeConcepts` fills a per-concept
   * default when omitted (`/:slug` for Pages, `/<conceptId>/:slug` otherwise). The pattern
   * must agree with the site's filesystem route directory.
   */
  permalink?: string;
```

Add to `ConceptDescriptor` (after `routing`):

```ts
  /** The resolved permalink pattern, defaulted by `normalizeConcepts`. */
  permalink: string;
```

- [ ] **Step 4: Fill the default in `normalizeConcepts`**

In `src/lib/content/concepts.ts`, add the helper and the descriptor field:

```ts
/** The default permalink pattern: Pages live at the root, other concepts under their id. */
function defaultPermalink(id: string): string {
  return id === 'pages' ? '/:slug' : `/${id}/:slug`;
}
```

In the `descriptors.push({ ... })` call, add:

```ts
      permalink: config.permalink ?? defaultPermalink(id),
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:unit -- content-concepts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content/types.ts src/lib/content/concepts.ts src/tests/unit/content-concepts.test.ts
git commit -m "feat(content): add a per-concept permalink pattern with defaults"
```

---

## Task 2: The permalink resolver

One function turns a descriptor and an entry into a path. It parses the date from the entry's `YYYY-MM-DD` string directly, so there is no timezone shift, and it throws on an unknown token or a date token without a date.

**Files:**
- Create: `src/lib/content/permalink.ts`
- Test: `src/tests/unit/content-permalink.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { permalink } from '../../lib/content/permalink.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';

function descriptor(pattern: string, dated = true): ConceptDescriptor {
  return {
    id: 'posts',
    label: 'Posts',
    dir: 'd',
    routing: { routable: true, dated, inFeeds: dated },
    permalink: pattern,
    fields: [],
    validate: () => ({ ok: true, data: {} }),
  };
}

describe('permalink', () => {
  it('substitutes the slug token from the id', () => {
    expect(permalink(descriptor('/blog/:slug'), { id: 'first' })).toBe('/blog/first');
  });

  it('substitutes zero-padded date tokens from the frontmatter date', () => {
    expect(permalink(descriptor('/:year/:month/:slug'), { id: 'first', date: '2026-05-09' })).toBe(
      '/2026/05/first',
    );
  });

  it('supports a day token', () => {
    expect(permalink(descriptor('/:year/:month/:day/:slug'), { id: 'x', date: '2026-01-02' })).toBe(
      '/2026/01/02/x',
    );
  });

  it('resolves a flat root pattern', () => {
    expect(permalink(descriptor('/:slug', false), { id: 'about' })).toBe('/about');
  });

  it('throws when a date token has no date', () => {
    expect(() => permalink(descriptor('/:year/:slug'), { id: 'x' })).toThrow(/date/);
  });

  it('throws on an unknown token', () => {
    expect(() => permalink(descriptor('/:nope/:slug'), { id: 'x' })).toThrow(/unknown token/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- content-permalink`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the resolver**

```ts
// cairn-cms: the one permalink resolver (public-delivery design, decision 3). Feeds, the
// sitemap, canonical links, list links, and the prerender entries() all call this, so an
// entry has exactly one canonical URL. The date is read straight from the YYYY-MM-DD string,
// so a permalink never shifts across a timezone.
import type { ConceptDescriptor } from './types.js';

const pad = (n: number): string => String(n).padStart(2, '0');

function dateParts(date?: string): { year: string; month: string; day: string } | null {
  const match = date?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? { year: match[1], month: match[2], day: match[3] } : null;
}

/**
 * Resolve an entry's canonical path from its concept's permalink pattern. Throws when the
 * pattern uses a date token and the entry has no valid date, or when a token is unknown, so
 * a misconfiguration fails at build rather than emitting a broken path.
 */
export function permalink(descriptor: ConceptDescriptor, entry: { id: string; date?: string }): string {
  return descriptor.permalink.replace(/:(\w+)/g, (_match, token: string) => {
    if (token === 'slug') return entry.id;
    if (token === 'year' || token === 'month' || token === 'day') {
      const parts = dateParts(entry.date);
      if (!parts) {
        throw new Error(
          `permalink: concept "${descriptor.id}" pattern uses :${token}, but entry "${entry.id}" has no valid date`,
        );
      }
      return token === 'year' ? parts.year : token === 'month' ? pad(Number(parts.month)) : pad(Number(parts.day));
    }
    throw new Error(`permalink: unknown token :${token} in pattern "${descriptor.permalink}"`);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- content-permalink`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/permalink.ts src/tests/unit/content-permalink.test.ts
git commit -m "feat(content): add the canonical permalink resolver"
```

---

## Task 3: Excerpt and word count

A light markdown strip backs both, so summaries stay cheap with no full render. `deriveExcerpt` prefers a frontmatter `description` and otherwise cuts the body at a word boundary.

**Files:**
- Create: `src/lib/delivery/excerpt.ts`
- Test: `src/tests/unit/delivery-excerpt.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { deriveExcerpt, wordCount } from '../../lib/delivery/excerpt.js';

describe('deriveExcerpt', () => {
  it('prefers a frontmatter description', () => {
    expect(deriveExcerpt('# Heading\n\nBody text.', { description: 'The summary.' })).toBe('The summary.');
  });

  it('strips markdown from the body when there is no description', () => {
    expect(deriveExcerpt('## Title\n\nA [link](/x) and `code`.')).toBe('Title A link and code.');
  });

  it('cuts a long body at a word boundary with an ellipsis', () => {
    const body = 'one two three four five';
    expect(deriveExcerpt(body, { maxChars: 12 })).toBe('one two…');
  });

  it('returns an empty string for an empty body', () => {
    expect(deriveExcerpt('')).toBe('');
  });
});

describe('wordCount', () => {
  it('counts words in the stripped body', () => {
    expect(wordCount('# Title\n\nThree more words.')).toBe(4);
  });
  it('returns zero for an empty body', () => {
    expect(wordCount('')).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- delivery-excerpt`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the module**

```ts
// cairn-cms: excerpt and word count for content summaries (public-delivery design, decision
// 5). A light markdown strip keeps summaries cheap, so a list card, an og:description, and a
// summary-mode feed read one derived excerpt without a full render.

/** Reduce markdown to readable plain text: drop code, images, and markup; collapse whitespace. */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}[#>]+\s*/gm, ' ')
    .replace(/^\s{0,3}[-*+]\s+/gm, ' ')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A plain-text excerpt. Returns a trimmed frontmatter `description` when present, else the
 * stripped body cut at a word boundary near `maxChars` (default 200) with an ellipsis.
 */
export function deriveExcerpt(body: string, opts: { description?: string; maxChars?: number } = {}): string {
  const description = opts.description?.trim();
  if (description) return description;

  const max = opts.maxChars ?? 200;
  const text = toPlainText(body);
  if (text.length <= max) return text;

  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Count words in the stripped body. */
export function wordCount(body: string): number {
  const text = toPlainText(body);
  return text ? text.split(/\s+/).length : 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- delivery-excerpt`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/delivery/excerpt.ts src/tests/unit/delivery-excerpt.test.ts
git commit -m "feat(delivery): add excerpt and word-count derivation"
```

---

## Task 4: The content index

`createContentIndex` parses raw files with the engine's own `parseMarkdown`, resolves each permalink, and returns plain-data summaries plus an on-demand detail lookup. The `adjacent` fields are named `newer` and `older` rather than the spec's loose `prev`/`next`, so chronological direction is unambiguous.

**Files:**
- Create: `src/lib/delivery/content-index.ts`
- Test: `src/tests/unit/delivery-content-index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import type { RawFile } from '../../lib/delivery/content-index.js';

const [posts] = normalizeConcepts({
  posts: { dir: 'd', fields: [], validate: () => ({ ok: true, data: {} }) },
});

function post(id: string, date: string, extra = ''): RawFile {
  return { path: `/src/content/posts/${id}.md`, raw: `---\ntitle: ${id}\ndate: ${date}\ntags: [a]\n${extra}---\n\nBody of ${id}.` };
}

describe('createContentIndex', () => {
  const files = [post('older', '2026-01-01'), post('newer', '2026-03-01'), post('draft', '2026-02-01', 'draft: true\n')];
  const index = createContentIndex(files, posts);

  it('lists newest-first and excludes drafts by default', () => {
    expect(index.all().map((e) => e.id)).toEqual(['newer', 'older']);
  });

  it('includes drafts when asked', () => {
    expect(index.all({ includeDrafts: true }).map((e) => e.id)).toEqual(['newer', 'draft', 'older']);
  });

  it('resolves the permalink and a derived excerpt on each summary', () => {
    const summary = index.all()[0];
    expect(summary.permalink).toBe('/posts/newer');
    expect(summary.excerpt).toBe('Body of newer.');
    expect(summary.wordCount).toBe(3);
  });

  it('returns a detail entry with its body by id', () => {
    expect(index.byId('older')?.body.trim()).toBe('Body of older.');
    expect(index.byId('missing')).toBeUndefined();
  });

  it('filters by tag and aggregates tag counts over non-drafts', () => {
    expect(index.byTag('a').map((e) => e.id)).toEqual(['newer', 'older']);
    expect(index.allTags()).toEqual([{ tag: 'a', count: 2 }]);
  });

  it('finds the newer and older neighbours', () => {
    expect(index.adjacent('older')).toEqual({ newer: expect.objectContaining({ id: 'newer' }), older: undefined });
    expect(index.adjacent('newer').older).toEqual(expect.objectContaining({ id: 'older' }));
  });
});

describe('fromGlob', () => {
  it('maps a Vite eager raw glob record to RawFile[]', () => {
    expect(fromGlob({ '/a/x.md': 'raw-x' })).toEqual([{ path: '/a/x.md', raw: 'raw-x' }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- delivery-content-index`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the module**

```ts
// cairn-cms: the per-concept content index (public-delivery design, decisions 1 and 5). It
// takes raw files from a site's glob, parses them with the engine's own parseMarkdown, and
// returns cheap plain-data summaries plus an on-demand detail lookup. It is concept-generic:
// every operation reads the descriptor and its routing rule, never a hardcoded concept id.
import { parseMarkdown } from '../content/frontmatter.js';
import { idFromFilename } from '../content/ids.js';
import { permalink } from '../content/permalink.js';
import { deriveExcerpt, wordCount } from './excerpt.js';
import type { ConceptDescriptor } from '../content/types.js';

/** A raw content file before parsing: the glob key and the file's full markdown text. */
export interface RawFile {
  path: string;
  raw: string;
}

/** The cheap, plain-data view of one entry, for lists, feeds, and the sitemap. */
export interface ContentSummary {
  id: string;
  permalink: string;
  title: string;
  date?: string;
  updated?: string;
  tags: string[];
  excerpt: string;
  wordCount: number;
  draft: boolean;
}

/** The detail view: a summary plus the frontmatter and the body to render. */
export interface ContentEntry extends ContentSummary {
  frontmatter: Record<string, unknown>;
  body: string;
}

/** The per-concept query surface. */
export interface ContentIndex {
  all(opts?: { includeDrafts?: boolean }): ContentSummary[];
  byId(id: string): ContentEntry | undefined;
  byTag(tag: string, opts?: { includeDrafts?: boolean }): ContentSummary[];
  allTags(): { tag: string; count: number }[];
  adjacent(id: string): { newer?: ContentSummary; older?: ContentSummary };
}

/** Map a Vite eager `?raw` glob record (`{ path: raw }`) to `RawFile[]`. */
export function fromGlob(record: Record<string, string>): RawFile[] {
  return Object.entries(record).map(([path, raw]) => ({ path, raw }));
}

function basename(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(slash + 1) : path;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function asDate(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return undefined;
}

function asTags(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/** Build a concept's index from its raw files and normalized descriptor. */
export function createContentIndex(files: RawFile[], descriptor: ConceptDescriptor): ContentIndex {
  const entries: ContentEntry[] = files.map((file) => {
    const id = idFromFilename(basename(file.path));
    const { frontmatter, body } = parseMarkdown(file.raw);
    const date = asDate(frontmatter.date);
    return {
      id,
      permalink: permalink(descriptor, { id, date }),
      title: asString(frontmatter.title) ?? id,
      date,
      updated: asDate(frontmatter.updated),
      tags: asTags(frontmatter.tags),
      excerpt: deriveExcerpt(body, { description: asString(frontmatter.description) }),
      wordCount: wordCount(body),
      draft: frontmatter.draft === true,
      frontmatter,
      body,
    };
  });

  // Dated concepts sort newest-first; undated concepts (Pages) sort by title.
  const sorted = [...entries].sort((a, b) =>
    descriptor.routing.dated ? (b.date ?? '').localeCompare(a.date ?? '') : a.title.localeCompare(b.title),
  );

  const summarize = (entry: ContentEntry): ContentSummary => {
    const { frontmatter: _frontmatter, body: _body, ...summary } = entry;
    return summary;
  };
  const visible = (list: ContentEntry[], includeDrafts?: boolean): ContentEntry[] =>
    includeDrafts ? list : list.filter((entry) => !entry.draft);

  return {
    all: (opts = {}) => visible(sorted, opts.includeDrafts).map(summarize),
    byId: (id) => entries.find((entry) => entry.id === id),
    byTag: (tag, opts = {}) =>
      visible(sorted, opts.includeDrafts)
        .filter((entry) => entry.tags.includes(tag))
        .map(summarize),
    allTags: () => {
      const counts = new Map<string, number>();
      for (const entry of sorted) {
        if (entry.draft) continue;
        for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
      return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => a.tag.localeCompare(b.tag));
    },
    adjacent: (id) => {
      const list = visible(sorted, false);
      const i = list.findIndex((entry) => entry.id === id);
      if (i < 0) return {};
      return {
        newer: i > 0 ? summarize(list[i - 1]) : undefined,
        older: i < list.length - 1 ? summarize(list[i + 1]) : undefined,
      };
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- delivery-content-index`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/delivery/content-index.ts src/tests/unit/delivery-content-index.test.ts
git commit -m "feat(delivery): add the concept-generic content index"
```

---

## Task 5: RSS and JSON feeds

Pure string builders over a channel and a list of items. XML is escaped by hand (no new dependency), RSS dates are RFC-822 in UTC, and JSON Feed dates are ISO-8601.

**Files:**
- Create: `src/lib/delivery/feeds.ts`
- Test: `src/tests/unit/delivery-feeds.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildRssFeed, buildJsonFeed } from '../../lib/delivery/feeds.js';
import type { FeedChannel, FeedItem } from '../../lib/delivery/feeds.js';

const channel: FeedChannel = {
  title: 'Site & Co',
  description: 'Posts',
  siteUrl: 'https://example.com',
  feedUrl: 'https://example.com/feed.xml',
};
const items: FeedItem[] = [
  {
    title: 'Hello <world>',
    url: 'https://example.com/posts/hello',
    date: '2026-05-09',
    summary: 'A & B',
    contentHtml: '<p>Body</p>',
  },
];

describe('buildRssFeed', () => {
  const xml = buildRssFeed(channel, items);
  it('emits a channel with an escaped title and a self link', () => {
    expect(xml).toContain('<title>Site &amp; Co</title>');
    expect(xml).toContain('https://example.com/feed.xml');
  });
  it('emits an item with an escaped title, a link, and an RFC-822 pubDate in UTC', () => {
    expect(xml).toContain('<title>Hello &lt;world&gt;</title>');
    expect(xml).toContain('<link>https://example.com/posts/hello</link>');
    expect(xml).toContain('<pubDate>Sat, 09 May 2026 00:00:00 GMT</pubDate>');
  });
});

describe('buildJsonFeed', () => {
  const feed = JSON.parse(buildJsonFeed(channel, items));
  it('emits JSON Feed 1.1 with the channel and a feed_url', () => {
    expect(feed.version).toBe('https://jsonfeed.org/version/1.1');
    expect(feed.title).toBe('Site & Co');
    expect(feed.feed_url).toBe('https://example.com/feed.xml');
  });
  it('emits an item with an id, a url, an ISO date, and html content', () => {
    expect(feed.items[0]).toMatchObject({
      id: 'https://example.com/posts/hello',
      url: 'https://example.com/posts/hello',
      title: 'Hello <world>',
      date_published: '2026-05-09T00:00:00.000Z',
      content_html: '<p>Body</p>',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- delivery-feeds`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the module**

```ts
// cairn-cms: RSS and JSON Feed builders (public-delivery design). Pure functions over a
// channel and a list of items, so they unit-test without a render or a network. The caller
// (a template +server.ts shim) assembles items from the content index and passes absolute
// URLs built from PUBLIC_ORIGIN.

/** Feed channel metadata. URLs are absolute. */
export interface FeedChannel {
  title: string;
  description: string;
  siteUrl: string;
  feedUrl: string;
  language?: string;
  author?: { name: string; email?: string };
}

/** One feed entry. `contentHtml` carries the rendered body for a full-content feed. */
export interface FeedItem {
  title: string;
  url: string;
  date: string;
  updated?: string;
  summary: string;
  contentHtml?: string;
  tags?: string[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Format a YYYY-MM-DD (or ISO) string as an RFC-822 date in UTC, as RSS wants. */
function rfc822(date: string): string {
  return new Date(`${date.slice(0, 10)}T00:00:00.000Z`).toUTCString();
}

/** Format a YYYY-MM-DD (or ISO) string as an ISO-8601 instant in UTC. */
function iso(date: string): string {
  return new Date(`${date.slice(0, 10)}T00:00:00.000Z`).toISOString();
}

/** Build an RSS 2.0 document. */
export function buildRssFeed(channel: FeedChannel, items: FeedItem[]): string {
  const entries = items
    .map((item) => {
      const content = item.contentHtml ?? item.summary;
      return [
        '    <item>',
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(item.url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(item.url)}</guid>`,
        `      <pubDate>${rfc822(item.date)}</pubDate>`,
        `      <description>${escapeXml(item.summary)}</description>`,
        `      <content:encoded><![CDATA[${content}]]></content:encoded>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(channel.siteUrl)}</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    channel.language ? `    <language>${escapeXml(channel.language)}</language>` : '',
    `    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml" />`,
    entries,
    '  </channel>',
    '</rss>',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/** Build a JSON Feed 1.1 document. */
export function buildJsonFeed(channel: FeedChannel, items: FeedItem[]): string {
  return JSON.stringify(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title: channel.title,
      description: channel.description,
      home_page_url: channel.siteUrl,
      feed_url: channel.feedUrl,
      ...(channel.language ? { language: channel.language } : {}),
      ...(channel.author ? { authors: [channel.author] } : {}),
      items: items.map((item) => ({
        id: item.url,
        url: item.url,
        title: item.title,
        summary: item.summary,
        date_published: iso(item.date),
        ...(item.updated ? { date_modified: iso(item.updated) } : {}),
        ...(item.contentHtml ? { content_html: item.contentHtml } : { content_text: item.summary }),
        ...(item.tags && item.tags.length ? { tags: item.tags } : {}),
      })),
    },
    null,
    2,
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- delivery-feeds`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/delivery/feeds.ts src/tests/unit/delivery-feeds.test.ts
git commit -m "feat(delivery): add RSS and JSON feed builders"
```

---

## Task 6: Sitemap and robots

Two small pure builders. The sitemap takes a URL list with optional `lastmod`; robots points at the sitemap and lists any disallow rules.

**Files:**
- Create: `src/lib/delivery/sitemap.ts`
- Create: `src/lib/delivery/robots.ts`
- Test: `src/tests/unit/delivery-sitemap.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildSitemap } from '../../lib/delivery/sitemap.js';
import { buildRobots } from '../../lib/delivery/robots.js';

describe('buildSitemap', () => {
  const xml = buildSitemap([
    { loc: 'https://example.com/posts/a', lastmod: '2026-05-09' },
    { loc: 'https://example.com/about' },
  ]);
  it('emits a urlset with a loc and an optional lastmod', () => {
    expect(xml).toContain('<loc>https://example.com/posts/a</loc>');
    expect(xml).toContain('<lastmod>2026-05-09</lastmod>');
    expect(xml).toContain('<loc>https://example.com/about</loc>');
  });
  it('omits lastmod when absent', () => {
    const about = xml.slice(xml.indexOf('/about'));
    expect(about).not.toContain('<lastmod>');
  });
});

describe('buildRobots', () => {
  it('allows all and points at the sitemap', () => {
    const txt = buildRobots({ sitemapUrl: 'https://example.com/sitemap.xml' });
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Allow: /');
    expect(txt).toContain('Sitemap: https://example.com/sitemap.xml');
  });
  it('lists disallow rules when given', () => {
    const txt = buildRobots({ sitemapUrl: 'https://example.com/sitemap.xml', disallow: ['/admin'] });
    expect(txt).toContain('Disallow: /admin');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- delivery-sitemap`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write `sitemap.ts`**

```ts
// cairn-cms: sitemap builder (public-delivery design). Pure over a URL list; the caller
// derives the list from the content index and the routable concepts.

/** One sitemap URL. `lastmod` is a YYYY-MM-DD date. */
export interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Build a sitemap XML document from a list of URLs. */
export function buildSitemap(urls: SitemapUrl[]): string {
  const entries = urls
    .map((url) => {
      const lastmod = url.lastmod ? `\n    <lastmod>${escapeXml(url.lastmod)}</lastmod>` : '';
      return `  <url>\n    <loc>${escapeXml(url.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n');
}
```

- [ ] **Step 4: Write `robots.ts`**

```ts
// cairn-cms: robots.txt builder (public-delivery design). A permissive default that points
// at the sitemap, with optional disallow rules.

/** Build a robots.txt body. */
export function buildRobots(opts: { sitemapUrl: string; disallow?: string[] }): string {
  const lines = ['User-agent: *', 'Allow: /'];
  for (const path of opts.disallow ?? []) lines.push(`Disallow: ${path}`);
  lines.push('', `Sitemap: ${opts.sitemapUrl}`, '');
  return lines.join('\n');
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:unit -- delivery-sitemap`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/delivery/sitemap.ts src/lib/delivery/robots.ts src/tests/unit/delivery-sitemap.test.ts
git commit -m "feat(delivery): add sitemap and robots builders"
```

---

## Task 7: The SEO head builder

It returns plain data the template renders inside `<svelte:head>`, covering the title, the meta description, the canonical link, the feed-autodiscovery links, and `WebSite` or `Article` JSON-LD.

**Files:**
- Create: `src/lib/delivery/seo.ts`
- Test: `src/tests/unit/delivery-seo.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildSeoMeta } from '../../lib/delivery/seo.js';

describe('buildSeoMeta', () => {
  it('builds website meta with canonical, description, and og tags', () => {
    const meta = buildSeoMeta({
      title: 'Home',
      description: 'A site.',
      canonicalUrl: 'https://example.com/',
      siteName: 'Example',
      feeds: { rss: 'https://example.com/feed.xml' },
    });
    expect(meta.title).toBe('Home');
    expect(meta.links).toContainEqual({ rel: 'canonical', href: 'https://example.com/' });
    expect(meta.links).toContainEqual({
      rel: 'alternate',
      type: 'application/rss+xml',
      href: 'https://example.com/feed.xml',
      title: 'Example',
    });
    expect(meta.meta).toContainEqual({ name: 'description', content: 'A site.' });
    expect(meta.meta).toContainEqual({ property: 'og:title', content: 'Home' });
    expect(meta.jsonLd['@type']).toBe('WebSite');
  });

  it('builds Article JSON-LD with published and modified dates', () => {
    const meta = buildSeoMeta({
      title: 'Post',
      description: 'A post.',
      canonicalUrl: 'https://example.com/posts/p',
      siteName: 'Example',
      type: 'article',
      published: '2026-05-09',
      modified: '2026-05-10',
    });
    expect(meta.jsonLd['@type']).toBe('Article');
    expect(meta.jsonLd).toMatchObject({ datePublished: '2026-05-09', dateModified: '2026-05-10' });
    expect(meta.meta).toContainEqual({ property: 'og:type', content: 'article' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- delivery-seo`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the module**

```ts
// cairn-cms: the SEO head builder (public-delivery design, decision 6). Returns plain data so
// the template renders it inside <svelte:head>. It covers the universal, mechanical tags;
// og:image art and richer JSON-LD types stay a template or plugin concern.

/** Inputs for the head. All URLs are absolute (built from PUBLIC_ORIGIN). */
export interface SeoInput {
  title: string;
  description: string;
  canonicalUrl: string;
  siteName: string;
  type?: 'website' | 'article';
  published?: string;
  modified?: string;
  feeds?: { rss?: string; json?: string };
  image?: string;
}

/** Plain-data head: a title, meta tags, link tags, and one JSON-LD object. */
export interface SeoMeta {
  title: string;
  meta: { name?: string; property?: string; content: string }[];
  links: { rel: string; type?: string; href: string; title?: string }[];
  jsonLd: Record<string, unknown>;
}

/** Build the head data for a page. */
export function buildSeoMeta(input: SeoInput): SeoMeta {
  const type = input.type ?? 'website';
  const meta: SeoMeta['meta'] = [
    { name: 'description', content: input.description },
    { property: 'og:title', content: input.title },
    { property: 'og:description', content: input.description },
    { property: 'og:type', content: type },
    { property: 'og:url', content: input.canonicalUrl },
    { property: 'og:site_name', content: input.siteName },
    { name: 'twitter:card', content: input.image ? 'summary_large_image' : 'summary' },
  ];
  if (input.image) {
    meta.push({ property: 'og:image', content: input.image });
    meta.push({ name: 'twitter:image', content: input.image });
  }

  const links: SeoMeta['links'] = [{ rel: 'canonical', href: input.canonicalUrl }];
  if (input.feeds?.rss) {
    links.push({ rel: 'alternate', type: 'application/rss+xml', href: input.feeds.rss, title: input.siteName });
  }
  if (input.feeds?.json) {
    links.push({ rel: 'alternate', type: 'application/feed+json', href: input.feeds.json, title: input.siteName });
  }

  const jsonLd: Record<string, unknown> =
    type === 'article'
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: input.title,
          description: input.description,
          url: input.canonicalUrl,
          ...(input.published ? { datePublished: input.published } : {}),
          ...(input.modified ? { dateModified: input.modified } : {}),
          ...(input.image ? { image: input.image } : {}),
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: input.siteName,
          description: input.description,
          url: input.canonicalUrl,
        };

  return { title: input.title, meta, links, jsonLd };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- delivery-seo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/delivery/seo.ts src/tests/unit/delivery-seo.test.ts
git commit -m "feat(delivery): add the SEO head builder"
```

---

## Task 8: Pagination

A generic pure helper. It clamps an out-of-range page into bounds so a bad `?page=` never returns an empty slice.

**Files:**
- Create: `src/lib/delivery/paginate.ts`
- Test: `src/tests/unit/delivery-paginate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { paginate } from '../../lib/delivery/paginate.js';

const items = [1, 2, 3, 4, 5];

describe('paginate', () => {
  it('slices the requested page and reports the totals', () => {
    const page = paginate(items, 1, 2);
    expect(page).toMatchObject({ items: [1, 2], page: 1, perPage: 2, total: 5, totalPages: 3, hasPrev: false, hasNext: true });
  });
  it('reports the last page with no next', () => {
    expect(paginate(items, 3, 2)).toMatchObject({ items: [5], page: 3, hasPrev: true, hasNext: false });
  });
  it('clamps an out-of-range page into bounds', () => {
    expect(paginate(items, 99, 2).page).toBe(3);
    expect(paginate(items, 0, 2).page).toBe(1);
  });
  it('handles an empty list', () => {
    expect(paginate([], 1, 2)).toMatchObject({ items: [], total: 0, totalPages: 1, hasPrev: false, hasNext: false });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- delivery-paginate`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the module**

```ts
// cairn-cms: pagination helper (public-delivery design). Pure slice math; the template renders
// the controls. An out-of-range page clamps into bounds.

/** A page of items plus its navigation state. */
export interface Page<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

/** Slice `items` into the 1-based `page` of size `perPage`, clamping the page into bounds. */
export function paginate<T>(items: T[], page: number, perPage: number): Page<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: current,
    perPage,
    total,
    totalPages,
    hasPrev: current > 1,
    hasNext: current < totalPages,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- delivery-paginate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/delivery/paginate.ts src/tests/unit/delivery-paginate.test.ts
git commit -m "feat(delivery): add the pagination helper"
```

---

## Task 9: Rename the adapter renderer `renderPreview` to `render`

One renderer serves the editor preview and the public page (design decision 4). This is a mechanical rename across the contract types, the runtime, the editor component, the fixtures, and the showcase. No new behavior, so the existing suite staying green is the test.

**Files:**
- Modify: `src/lib/content/types.ts` (lines ~6, ~139, ~227)
- Modify: `src/lib/content/compose.ts:32`
- Modify: `src/lib/components/EditPage.svelte` (the `renderPreview` prop and its uses)
- Modify: `src/tests/unit/_content-fixture.ts:36`
- Modify: `src/tests/unit/compose.test.ts`, `content-compose.test.ts`, `content-routes-list.test.ts`, `content-routes-edit.test.ts`, `content-routes-save.test.ts`, `content-routes-layout.test.ts`, `nav-routes-load.test.ts`, `nav-routes-save.test.ts`, `health.test.ts` (each builds an adapter with `renderPreview: (md) => md`)
- Modify: `src/tests/component/EditPage.test.ts` (the `renderPreview` prop in props)
- Modify: `examples/showcase/src/lib/cairn.config.ts:25` and `examples/showcase/src/routes/admin/(app)/[concept]/[id]/+page.svelte:20`

- [ ] **Step 1: Rename the contract field and signature**

In `src/lib/content/types.ts`, in `CairnAdapter` and `CairnRuntime`, change:

```ts
  renderPreview(md: string): string | Promise<string>;
```

to:

```ts
  /** The site's one renderer: the editor preview and every public page call it (design decision 4). */
  render(md: string, opts?: { stagger?: boolean }): string | Promise<string>;
```

Update the file-header comment on line ~6 that mentions `renderPreview` so it says `render`.

- [ ] **Step 2: Carry it through `composeRuntime`**

In `src/lib/content/compose.ts`, change `renderPreview: adapter.renderPreview,` to:

```ts
    render: adapter.render,
```

- [ ] **Step 3: Rename the editor component prop**

In `src/lib/components/EditPage.svelte`, rename the `renderPreview` prop to `render` in the `Props` interface, the `$props()` destructure, and the two call sites (the guard `if (!showPreview || !render) return;` and `const html = await render(md);`). Keep the surrounding debounce and stale-result logic unchanged.

- [ ] **Step 4: Update every adapter-building test and the showcase**

Replace `renderPreview: (md) => md` with `render: (md) => md` in `_content-fixture.ts` and each listed unit test. In `content-compose.test.ts`, change the assertion `runtime.renderPreview('x')` to `runtime.render('x')`. In `EditPage.test.ts`, rename the `renderPreview` prop to `render` in both props objects. In the showcase, rename `renderPreview` to `render` in `cairn.config.ts` and change the shim attribute to `render={cairn.render}`.

- [ ] **Step 5: Run the full suite and check**

Run: `npm test` and `npm run check`
Expected: `npm test` exits 0; `npm run check` reports 0 errors and 0 warnings.

Run: `grep -rn "renderPreview" src examples`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content/types.ts src/lib/content/compose.ts src/lib/components/EditPage.svelte src/tests examples/showcase
git commit -m "refactor(content): rename the adapter renderPreview to render"
```

---

## Task 10: Public route loaders

A factory closes over one concept's index, the runtime `render`, and the origin, and returns the public load functions plus `entries()` for prerender. It follows the `*-routes.ts` factory pattern with a structural event, so it unit-tests without a real SvelteKit event.

**Files:**
- Create: `src/lib/sveltekit/public-routes.ts`
- Test: `src/tests/unit/public-routes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createPublicRoutes } from '../../lib/sveltekit/public-routes.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import type { RawFile } from '../../lib/delivery/content-index.js';

const [posts] = normalizeConcepts({ posts: { dir: 'd', fields: [], validate: () => ({ ok: true, data: {} }) } });
const files: RawFile[] = [
  { path: '/c/a.md', raw: '---\ntitle: A\ndate: 2026-02-01\ntags: [x]\n---\n\nBody A.' },
  { path: '/c/b.md', raw: '---\ntitle: B\ndate: 2026-01-01\ntags: [y]\n---\n\nBody B.' },
];
const routes = createPublicRoutes({
  index: createContentIndex(files, posts),
  render: (md) => `<rendered>${md.trim()}</rendered>`,
  origin: 'https://example.com',
});

describe('createPublicRoutes', () => {
  it('archiveLoad returns newest-first summaries', () => {
    expect(routes.archiveLoad().entries.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('entryLoad renders the body through the injected renderer', async () => {
    const data = await routes.entryLoad({ params: { slug: 'a' } });
    expect(data.entry.id).toBe('a');
    expect(data.html).toBe('<rendered>Body A.</rendered>');
    expect(data.canonicalUrl).toBe('https://example.com/posts/a');
  });

  it('entryLoad throws a 404 for an unknown slug', async () => {
    await expect(routes.entryLoad({ params: { slug: 'missing' } })).rejects.toMatchObject({ status: 404 });
  });

  it('tagLoad filters by tag and tagIndexLoad lists tag counts', () => {
    expect(routes.tagLoad({ params: { tag: 'x' } }).entries.map((e) => e.id)).toEqual(['a']);
    expect(routes.tagIndexLoad().tags).toEqual([{ tag: 'x', count: 1 }, { tag: 'y', count: 1 }]);
  });

  it('entries enumerates slugs for prerender', () => {
    expect(routes.entries().map((e) => e.slug).sort()).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- public-routes`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the factory**

```ts
// cairn-cms: public route loaders (public-delivery design, decision 6). A factory closes over
// a concept's index, the runtime render, and the origin, and returns thin load functions plus
// entries() for prerender. A site route file stays a one-line shim. The index is built in site
// code from a glob, so it stays in the prerender graph and out of the runtime Worker.
import { error } from '@sveltejs/kit';
import type { ContentIndex, ContentSummary, ContentEntry } from '../delivery/content-index.js';

/** Injected dependencies for the public loaders. */
export interface PublicRoutesDeps {
  index: ContentIndex;
  render: (md: string, opts?: { stagger?: boolean }) => string | Promise<string>;
  origin: string;
}

/** The archive and tag list data: summaries the template renders. */
export interface ListData {
  entries: ContentSummary[];
}

/** A single tag's data plus the tag it filtered on. */
export interface TagData extends ListData {
  tag: string;
}

/** The tag-index data: every tag with its count. */
export interface TagIndexData {
  tags: { tag: string; count: number }[];
}

/** One entry's data: the detail entry, its rendered html, and its canonical URL. */
export interface EntryData {
  entry: ContentEntry;
  html: string;
  canonicalUrl: string;
  newer?: ContentSummary;
  older?: ContentSummary;
}

/** Build the public loaders for one concept's index. */
export function createPublicRoutes(deps: PublicRoutesDeps) {
  const { index, render, origin } = deps;

  /** The chronological archive: every non-draft summary, newest-first. */
  function archiveLoad(): ListData {
    return { entries: index.all() };
  }

  /** All tags with counts, for a tag index page. */
  function tagIndexLoad(): TagIndexData {
    return { tags: index.allTags() };
  }

  /** One tag's entries, or a 404 when the tag has none. */
  function tagLoad(event: { params: { tag: string } }): TagData {
    const tag = event.params.tag;
    const entries = index.byTag(tag);
    if (entries.length === 0) throw error(404, `No entries tagged "${tag}"`);
    return { tag, entries };
  }

  /** One entry by slug, rendered through the site renderer, or a 404. */
  async function entryLoad(event: { params: { slug: string } }): Promise<EntryData> {
    const entry = index.byId(event.params.slug);
    if (!entry) throw error(404, `Not found: ${event.params.slug}`);
    const { newer, older } = index.adjacent(entry.id);
    return {
      entry,
      html: await render(entry.body, { stagger: true }),
      canonicalUrl: origin + entry.permalink,
      newer,
      older,
    };
  }

  /** Prerender enumeration: one `{ slug }` per non-draft entry. */
  function entries(): { slug: string }[] {
    return index.all().map((entry) => ({ slug: entry.id }));
  }

  return { archiveLoad, tagIndexLoad, tagLoad, entryLoad, entries };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- public-routes`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/public-routes.ts src/tests/unit/public-routes.test.ts
git commit -m "feat(sveltekit): add the public route loaders"
```

**Consumption reference (not engine code).** A site builds the index in a prerender-only module and wires the shims:

```ts
// src/lib/content.ts (template)
import { createContentIndex, fromGlob, composeRuntime } from '@glw907/cairn-cms';
import { adapter } from './cairn.config';
const runtime = composeRuntime(adapter);
const postsDescriptor = runtime.concepts.find((c) => c.id === 'posts')!;
export const posts = createContentIndex(
  fromGlob(import.meta.glob('/src/content/posts/*.md', { eager: true, query: '?raw', import: 'default' })),
  postsDescriptor,
);
export { runtime };
```

```ts
// src/routes/posts/[slug]/+page.server.ts (template)
import { createPublicRoutes } from '@glw907/cairn-cms/sveltekit';
import { PUBLIC_ORIGIN } from '$env/static/public';
import { posts, runtime } from '$lib/content';
export const prerender = true;
const routes = createPublicRoutes({ index: posts, render: runtime.render, origin: PUBLIC_ORIGIN });
export const load = ({ params }) => routes.entryLoad({ params });
export const entries = routes.entries;
```

---

## Task 11: Barrel exports and the export contract test

The delivery surface and the permalink resolver join the root entry; `createPublicRoutes` joins the `/sveltekit` barrel. The exports map in `package.json` does not change, since everything is additive to the three existing subpaths.

**Files:**
- Modify: `src/lib/index.ts`
- Modify: `src/lib/sveltekit/index.ts`
- Test: `src/tests/unit/delivery-exports.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import * as root from '../../lib/index.js';
import * as sveltekit from '../../lib/sveltekit/index.js';

describe('delivery exports', () => {
  it('re-exports the delivery builders and the permalink resolver from the root entry', () => {
    for (const name of [
      'permalink',
      'createContentIndex',
      'fromGlob',
      'deriveExcerpt',
      'wordCount',
      'buildRssFeed',
      'buildJsonFeed',
      'buildSitemap',
      'buildRobots',
      'buildSeoMeta',
      'paginate',
    ]) {
      expect(typeof (root as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('re-exports the public route factory from the sveltekit entry', () => {
    expect(typeof sveltekit.createPublicRoutes).toBe('function');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- delivery-exports`
Expected: FAIL, exports are undefined.

- [ ] **Step 3: Add the root barrel exports**

Append to `src/lib/index.ts`:

```ts
// Public content delivery (public-delivery design): the query index, syndication, and
// discovery surface that sites read. Pure builders plus the one permalink resolver; the
// SvelteKit loaders live under the /sveltekit subpath.
export { permalink } from './content/permalink.js';
export { createContentIndex, fromGlob } from './delivery/content-index.js';
export type { RawFile, ContentSummary, ContentEntry, ContentIndex } from './delivery/content-index.js';
export { deriveExcerpt, wordCount } from './delivery/excerpt.js';
export { buildRssFeed, buildJsonFeed } from './delivery/feeds.js';
export type { FeedChannel, FeedItem } from './delivery/feeds.js';
export { buildSitemap } from './delivery/sitemap.js';
export type { SitemapUrl } from './delivery/sitemap.js';
export { buildRobots } from './delivery/robots.js';
export { buildSeoMeta } from './delivery/seo.js';
export type { SeoInput, SeoMeta } from './delivery/seo.js';
export { paginate } from './delivery/paginate.js';
export type { Page } from './delivery/paginate.js';
```

- [ ] **Step 4: Add the sveltekit barrel export**

Append to `src/lib/sveltekit/index.ts`:

```ts
export { createPublicRoutes } from './public-routes.js';
export type {
  PublicRoutesDeps,
  ListData as PublicListData,
  TagData,
  TagIndexData,
  EntryData,
} from './public-routes.js';
```

`ListData` is aliased to `PublicListData` so it does not collide with the content-routes `ListData` already exported from this barrel.

- [ ] **Step 5: Run the test, the check, and the package check**

Run: `npm run test:unit -- delivery-exports`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors, 0 warnings (confirms the `ListData` alias avoids an export collision).

Run: `npm run check:package`
Expected: `publint` and `attw` pass across the three subpaths, confirming the additions resolve in the published shape.

- [ ] **Step 6: Commit**

```bash
git add src/lib/index.ts src/lib/sveltekit/index.ts src/tests/unit/delivery-exports.test.ts
git commit -m "feat(delivery): export the public delivery surface"
```

---

## Task 12: The concept-generic contract test

A guard that proves no delivery module hardcodes "posts". It builds the index, a feed, and a sitemap for a synthetic `news` concept and asserts they work.

**Files:**
- Test: `src/tests/unit/delivery-concept-generic.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { buildRssFeed, type FeedItem } from '../../lib/delivery/feeds.js';
import { buildSitemap } from '../../lib/delivery/sitemap.js';

// A synthetic third concept the engine has never heard of, with a custom dated pattern. A
// routing table is injected so the concept is dated and ordered newest-first.
const [news] = normalizeConcepts(
  {
    news: {
      dir: 'src/content/news',
      fields: [],
      validate: () => ({ ok: true, data: {} }),
      permalink: '/news/:year/:month/:slug',
    },
  },
  { news: { routable: true, dated: true, inFeeds: true } },
);

describe('delivery is concept-generic', () => {
  const index = createContentIndex(
    [
      { path: '/c/late.md', raw: '---\ntitle: Late\ndate: 2026-04-02\ntags: [field]\n---\n\nLate body.' },
      { path: '/c/early.md', raw: '---\ntitle: Early\ndate: 2026-03-01\ntags: [field]\n---\n\nEarly body.' },
    ],
    news,
  );

  it('builds an index, orders by date, and resolves the custom pattern for a non-posts concept', () => {
    expect(index.all().map((e) => e.id)).toEqual(['late', 'early']);
    expect(index.all()[0].permalink).toBe('/news/2026/04/late');
  });

  it('feeds and sitemap accept the concepts summaries unchanged', () => {
    const origin = 'https://example.com';
    const items: FeedItem[] = index.all().map((e) => ({
      title: e.title,
      url: origin + e.permalink,
      date: e.date!,
      summary: e.excerpt,
    }));
    const rss = buildRssFeed({ title: 'News', description: '', siteUrl: origin, feedUrl: `${origin}/news/feed.xml` }, items);
    expect(rss).toContain('/news/2026/04/late');
    const sitemap = buildSitemap(index.all().map((e) => ({ loc: origin + e.permalink, lastmod: e.date })));
    expect(sitemap).toContain('/news/2026/04/late');
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npm run test:unit -- delivery-concept-generic`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tests/unit/delivery-concept-generic.test.ts
git commit -m "test(delivery): prove the delivery layer is concept-generic"
```

---

## Task 13: Full gate

Confirm the whole suite, the type check, and the package check are green together before handing off.

**Files:** none (verification only)

- [ ] **Step 1: Run the full gate**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

Run: `npm test`
Expected: exit 0, every project (unit, integration, component) green.

Run: `npm run check:package`
Expected: `publint --strict` and `attw` pass.

- [ ] **Step 2: Confirm no stray renderPreview**

Run: `grep -rn "renderPreview" src examples`
Expected: no matches.

- [ ] **Step 3: Final commit if anything was touched**

If a gate step surfaced a fix, commit it; otherwise the gate is green and the plan is complete.

```bash
git status --porcelain
```

---

## Self-review notes

- **Spec coverage.** The content query API is Task 4, RSS and JSON feeds Task 5, sitemap and robots Task 6, tag and archive loaders with pagination Tasks 8 and 10, the SEO head Task 7, excerpt and word count Task 3, the permalink resolver Tasks 1 and 2, the renderer unification Task 9, concept-generic delivery Task 12, and the additive exports with the package check Task 11. The 404 page, favicon, search, and the settings panel are out of scope per the spec.
- **Type consistency.** `ContentSummary`, `ContentEntry`, `ContentIndex`, `RawFile`, `FeedChannel`, `FeedItem`, `SitemapUrl`, `SeoInput`, `SeoMeta`, and `Page` are defined once (Tasks 4 through 8) and reused by name in Tasks 10 through 12. `adjacent` returns `newer` and `older` everywhere. The public-routes `ListData` is exported as `PublicListData` to avoid colliding with the content-routes `ListData`.
- **Prerender and bundle safety.** The index is built in a site module the public routes import, kept out of the runtime adapter, so the Worker bundle guard is unaffected. The plan does not add the index to `composeRuntime` for that reason.
- **Sequencing.** Pure modules (Tasks 1 through 8) land before the rename (Task 9) and the loaders that depend on `render` (Task 10). This plan's number relative to the extension and scaffolder work is a roadmap decision, per the spec.
