# cairn delivery-surface DX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn cairn's existing-but-undiscoverable public delivery into the complete, backend-free, canonical path a SvelteKit site wires in a few lines, and prove it end to end in the showcase.

**Architecture:** A new `@glw907/cairn-cms/delivery` package entry exposes the delivery toolkit with no auth or github in its module graph. The blessed path validates content at build (safe-by-default), the catch-all loader yields a ready SEO head, feeds/sitemap/robots become one-line endpoint helpers, a `<CairnHead>` component renders the head with escaped JSON-LD, and `siteDescriptors` collapses the descriptor incantation. The content reads are made generic-ready so a later typed-reads pass drops in without a signature break.

**Tech Stack:** TypeScript, Svelte 5 (runes), SvelteKit 2, `svelte-package`, vitest (projects `unit` node, `component` playwright, `integration` workerd).

**Design reference:** `docs/superpowers/specs/2026-06-01-cairn-delivery-dx-design.md`.

---

## Conventions for every task

- Work in `/home/glw907/Projects/cairn/cairn-cms` on branch `main`. This is the canonical 0.10.0 checkout. Commit locally; nobody publishes a version bump in this plan (release is a separate step after the pass).
- Test-first (TDD): write the failing test, run it and watch it fail for the right reason, implement, watch it pass.
- Full gate before each commit: `npm run check` reports 0 errors and 0 warnings, and `npm test` EXITS 0 (it runs the `unit`, `component`, and `integration` projects; it must exit 0, not merely show green assertions).
- Targeted test commands use the project flag, e.g. `npx vitest run --project unit src/tests/unit/<file>.test.ts` or `--project component src/tests/component/<file>.test.ts`.
- Commit specific files, never `git add -A`. Commit footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies; plain voice.
- `prose-guard` runs as a write hook on `docs/**`. Task 10 writes prose; keep it plain (no em dashes, no AI-tell words).

## Reference values (verified against the live tree)

- `src/lib/delivery/content-index.ts` exports `createContentIndex(files, descriptor)`, `fromGlob(record)`, and the types `RawFile`, `ContentSummary`, `ContentEntry` (`extends ContentSummary` with `frontmatter: Record<string, unknown>` and `body: string`), `ContentIndex` (`all`/`byId`/`byTag`/`allTags`/`adjacent`). `all`/`byTag` take `{ includeDrafts?: boolean }` and exclude drafts by default.
- `src/lib/delivery/site-index.ts` exports `createSiteIndex(concepts: ConceptIndex[])`, `ConceptIndex` (`{ descriptor: ConceptDescriptor; index: ContentIndex }`), `SiteIndex` (`byPermalink`/`adjacent`/`entries`/`concept`/`all`). It builds `byPath` from `index.all()` (drafts already excluded).
- `ConceptDescriptor` (`src/lib/content/types.ts`) carries `id, label, dir, routing, permalink, datePrefix, fields, validate(frontmatter, body): ValidationResult`. `ValidationResult` is `{ ok: true; data } | { ok: false; errors: Record<string, string> }`.
- `src/lib/delivery/seo.ts` exports `buildSeoMeta(input: SeoInput): SeoMeta`. `SeoInput`: `title, description, canonicalUrl, siteName, type?, published?, modified?, feeds?, image?`. `SeoMeta`: `title, meta[], links[], jsonLd`. It already emits og, twitter:card, canonical, and feed autodiscovery.
- `src/lib/delivery/feeds.ts`: `buildRssFeed(channel, items)`, `buildJsonFeed(channel, items)`, types `FeedChannel`, `FeedItem`. `src/lib/delivery/sitemap.ts`: `buildSitemap(urls: SitemapUrl[])`. `src/lib/delivery/robots.ts`: `buildRobots(opts: { sitemapUrl: string; disallow?: string[] })`.
- `src/lib/sveltekit/public-routes.ts` exports `createPublicRoutes(deps: PublicRoutesDeps)` returning `{ entryLoad, archiveLoad, tagIndexLoad, tagLoad, entries }`. `PublicRoutesDeps`: `{ site, render, origin }`. `EntryData`: `{ entry, html, canonicalUrl, newer?, older? }`. It imports only `@sveltejs/kit` and delivery types (it is itself backend-free; only the `/sveltekit` barrel that re-exports it is not).
- `src/lib/index.ts` is the root `.` barrel; `src/lib/sveltekit/index.ts` is the `/sveltekit` barrel (it re-exports github/auth/email-bound factories). `package.json` `exports` has `.`, `./sveltekit`, `./components`, `./package.json`.
- `parseSiteConfig`, `urlPolicyFrom`, `normalizeConcepts` are exported from root `.`. The showcase adapter is `examples/showcase/src/lib/cairn.config.ts`; it has one `posts` concept and a `render`. The showcase is `@sveltejs/adapter-node`, build = `vite build`.

---

## Task 1: Make the content reads generic-ready

**Files:**
- Modify: `src/lib/delivery/content-index.ts`
- Test: `src/tests/unit/delivery-generic-frontmatter.test.ts`

The typed-reads pass is a follow-on, but this pass must leave the signatures generic so it drops in without a break. Add a frontmatter type parameter defaulting to `Record<string, unknown>`, so every current call site compiles unchanged and a caller can already write `createContentIndex<MyFrontmatter>(...)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/delivery-generic-frontmatter.test.ts
import { describe, it, expect } from 'vitest';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';

interface PostFm {
  title: string;
  description: string;
}

const descriptor = normalizeConcepts({
  posts: {
    dir: 'src/content/posts',
    fields: [],
    validate: (fm) => ({ ok: true, data: fm }),
  },
})[0];

describe('generic-ready content reads', () => {
  it('defaults to Record<string, unknown> and keeps runtime behavior', () => {
    const index = createContentIndex(
      fromGlob({ '/src/content/posts/2026-01-15-hello.md': '---\ntitle: Hello\ndescription: Hi there\n---\nBody.' }),
      descriptor,
    );
    const entry = index.byId('2026-01-15-hello');
    expect(entry?.frontmatter.description).toBe('Hi there');
  });

  it('accepts a frontmatter type parameter and types the read', () => {
    const index = createContentIndex<PostFm>(
      fromGlob({ '/src/content/posts/2026-01-15-hello.md': '---\ntitle: Hello\ndescription: Hi there\n---\nBody.' }),
      descriptor,
    );
    const entry = index.byId('2026-01-15-hello');
    // Typed read: `description` is `string`, not `unknown`. `npm run check` enforces the type;
    // this asserts the runtime value flows through unchanged.
    const description: string = entry!.frontmatter.description;
    expect(description).toBe('Hi there');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-generic-frontmatter.test.ts`
Expected: the second test fails to type-check / the generic call `createContentIndex<PostFm>` is rejected, or `entry!.frontmatter.description` is `unknown` and the `const description: string` assignment errors under `npm run check`. (At minimum the typed call site does not compile.)

- [ ] **Step 3: Add the generic parameter**

In `src/lib/delivery/content-index.ts`, change the two interfaces and the function signature. Replace:

```ts
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
```

with:

```ts
/** The detail view: a summary plus the frontmatter and the body to render. The frontmatter
 *  type defaults to `Record<string, unknown>`; the typed-reads pass infers it from the concept
 *  fields. Generic now so that change does not break this signature. */
export interface ContentEntry<F = Record<string, unknown>> extends ContentSummary {
  frontmatter: F;
  body: string;
}

/** The per-concept query surface. */
export interface ContentIndex<F = Record<string, unknown>> {
  all(opts?: { includeDrafts?: boolean }): ContentSummary[];
  byId(id: string): ContentEntry<F> | undefined;
  byTag(tag: string, opts?: { includeDrafts?: boolean }): ContentSummary[];
  allTags(): { tag: string; count: number }[];
  adjacent(id: string): { newer?: ContentSummary; older?: ContentSummary };
}
```

Change the function signature and the parsed-frontmatter cast. Replace:

```ts
export function createContentIndex(files: RawFile[], descriptor: ConceptDescriptor): ContentIndex {
  const entries: ContentEntry[] = files.map((file) => {
```

with:

```ts
export function createContentIndex<F = Record<string, unknown>>(
  files: RawFile[],
  descriptor: ConceptDescriptor,
): ContentIndex<F> {
  const entries: ContentEntry<F>[] = files.map((file) => {
```

In that same `map` callback, the object literal already builds `frontmatter` from `parseMarkdown`. Change its `frontmatter` property to cast at the boundary:

```ts
      frontmatter: frontmatter as F,
```

(`parseMarkdown` returns `Record<string, unknown>`; the cast is the single boundary where the caller's type is asserted. The follow-on pass replaces the cast with an inferred, validated type.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-generic-frontmatter.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/delivery/content-index.ts src/tests/unit/delivery-generic-frontmatter.test.ts
git commit -m "feat(delivery): make content reads generic over frontmatter type

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Validate content at build, safe-by-default in createSiteIndex

**Files:**
- Modify: `src/lib/delivery/site-index.ts`
- Test: `src/tests/unit/delivery-site-index-validation.test.ts`

`createSiteIndex` is the blessed path's entry. Validate every entry (including drafts, which publish later) through the concept's own `validate`, and throw one aggregated, file-named error on any failure. Add an opt-out for callers that deliberately want to skip it.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/delivery-site-index-validation.test.ts
import { describe, it, expect } from 'vitest';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { createSiteIndex } from '../../lib/delivery/site-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';

const descriptor = normalizeConcepts({
  posts: {
    dir: 'src/content/posts',
    fields: [],
    validate: (fm) => {
      const title = typeof fm.title === 'string' && fm.title.trim() ? fm.title : '';
      return title ? { ok: true, data: fm } : { ok: false, errors: { title: 'Title is required' } };
    },
  },
})[0];

function conceptIndex(files: Record<string, string>) {
  return { descriptor, index: createContentIndex(fromGlob(files), descriptor) };
}

describe('createSiteIndex validation', () => {
  it('throws one aggregated, file-named error when an entry is invalid', () => {
    const ci = conceptIndex({
      '/src/content/posts/2026-01-15-ok.md': '---\ntitle: Good\n---\nBody.',
      '/src/content/posts/2026-02-20-bad.md': '---\ndescription: no title\n---\nBody.',
    });
    expect(() => createSiteIndex([ci])).toThrowError(/2026-02-20-bad/);
    expect(() => createSiteIndex([ci])).toThrowError(/title: Title is required/);
  });

  it('validates drafts too', () => {
    const ci = conceptIndex({
      '/src/content/posts/2026-03-10-draft.md': '---\ndraft: true\n---\nBody.',
    });
    expect(() => createSiteIndex([ci])).toThrowError(/2026-03-10-draft/);
  });

  it('does not throw when every entry is valid', () => {
    const ci = conceptIndex({ '/src/content/posts/2026-01-15-ok.md': '---\ntitle: Good\n---\nBody.' });
    expect(() => createSiteIndex([ci])).not.toThrow();
  });

  it('skips validation when opted out', () => {
    const ci = conceptIndex({ '/src/content/posts/2026-02-20-bad.md': '---\ndescription: no title\n---\nBody.' });
    expect(() => createSiteIndex([ci], { validate: false })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-site-index-validation.test.ts`
Expected: FAIL. `createSiteIndex` does not validate today, so the first two cases do not throw and the `.toThrowError` assertions fail.

- [ ] **Step 3: Add validation to `createSiteIndex`**

In `src/lib/delivery/site-index.ts`, change the function signature and prepend a validation pass. Replace:

```ts
/** Union per-concept indexes into a site-level resolver; throw on a duplicate permalink. */
export function createSiteIndex(concepts: ConceptIndex[]): SiteIndex {
  const byPath = new Map<string, { index: ContentIndex; id: string }>();
```

with:

```ts
/** Validate every entry (drafts included) against its concept, aggregating failures. */
function validateAll(concepts: ConceptIndex[]): void {
  const problems: string[] = [];
  for (const { descriptor, index } of concepts) {
    for (const summary of index.all({ includeDrafts: true })) {
      const entry = index.byId(summary.id);
      if (!entry) continue;
      const result = descriptor.validate(entry.frontmatter, entry.body);
      if (!result.ok) {
        for (const [field, message] of Object.entries(result.errors)) {
          problems.push(`${descriptor.dir}/${summary.id}: ${field}: ${message}`);
        }
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(`site index: ${problems.length} invalid frontmatter field(s):\n  ${problems.join('\n  ')}`);
  }
}

/**
 * Union per-concept indexes into a site-level resolver. Throws on a duplicate permalink and,
 * unless `validate` is `false`, on any entry whose frontmatter fails its concept's validator,
 * so malformed content fails the build instead of shipping.
 */
export function createSiteIndex(concepts: ConceptIndex[], opts: { validate?: boolean } = {}): SiteIndex {
  if (opts.validate !== false) validateAll(concepts);
  const byPath = new Map<string, { index: ContentIndex; id: string }>();
```

(The rest of the function body is unchanged.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-site-index-validation.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Check the existing site-index test still passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-site-index.test.ts`
Expected: PASS. If a fixture there uses content that does not satisfy its descriptor's `validate`, pass `{ validate: false }` to that test's `createSiteIndex` call, or give the fixture valid frontmatter. Do not weaken the new default.

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/delivery/site-index.ts src/tests/unit/delivery-site-index-validation.test.ts
git commit -m "feat(delivery): validate content at build in createSiteIndex

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: `siteDescriptors` one-liner

**Files:**
- Create: `src/lib/delivery/site-descriptors.ts`
- Test: `src/tests/unit/delivery-site-descriptors.test.ts`

Collapse `normalizeConcepts(adapter.content, urlPolicyFrom(siteConfig))` into one obvious call.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/delivery-site-descriptors.test.ts
import { describe, it, expect } from 'vitest';
import { siteDescriptors } from '../../lib/delivery/site-descriptors.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { urlPolicyFrom, parseSiteConfig } from '../../lib/nav/site-config.js';
import type { CairnAdapter } from '../../lib/content/types.js';

const adapter = {
  siteName: 'Test',
  content: {
    posts: { dir: 'src/content/posts', fields: [], validate: (fm) => ({ ok: true, data: fm }) },
    pages: { dir: 'src/content/pages', fields: [], validate: (fm) => ({ ok: true, data: fm }) },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'a@b.test' },
  render: (md: string) => md,
} as unknown as CairnAdapter;

const config = parseSiteConfig('siteName: Test\n');

describe('siteDescriptors', () => {
  it('equals normalizeConcepts over the adapter content and the config URL policy', () => {
    expect(siteDescriptors(adapter, config)).toEqual(
      normalizeConcepts(adapter.content, urlPolicyFrom(config)),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-site-descriptors.test.ts`
Expected: FAIL, cannot resolve `../../lib/delivery/site-descriptors.js`.

- [ ] **Step 3: Write `src/lib/delivery/site-descriptors.ts`**

```ts
// cairn-cms: the one-call descriptor helper. A delivery site needs the same per-concept
// descriptors the admin runtime uses; this wraps the two calls that derive them so the
// pairing is not tribal knowledge. The YAML URL policy stays the single source of truth.
import { normalizeConcepts } from '../content/concepts.js';
import { urlPolicyFrom } from '../nav/site-config.js';
import type { CairnAdapter, ConceptDescriptor } from '../content/types.js';
import type { SiteConfig } from '../nav/site-config.js';

/** Per-concept descriptors for a site, from its adapter content and its parsed site config. */
export function siteDescriptors(adapter: CairnAdapter, siteConfig: SiteConfig): ConceptDescriptor[] {
  return normalizeConcepts(adapter.content, urlPolicyFrom(siteConfig));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-site-descriptors.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/delivery/site-descriptors.ts src/tests/unit/delivery-site-descriptors.test.ts
git commit -m "feat(delivery): add the siteDescriptors one-liner

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: `buildSeoMeta` robots and article tags

**Files:**
- Modify: `src/lib/delivery/seo.ts`
- Test: `src/tests/unit/delivery-seo-extra.test.ts`

`buildSeoMeta` already emits og, twitter:card, canonical, and feed autodiscovery. Add the two small things a Next-grade head has and it lacks: an optional `robots` directive, and `article:published_time` / `article:author` for the article type. Both are additive.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/delivery-seo-extra.test.ts
import { describe, it, expect } from 'vitest';
import { buildSeoMeta } from '../../lib/delivery/seo.js';

describe('buildSeoMeta robots and article tags', () => {
  it('emits a robots directive when given one', () => {
    const seo = buildSeoMeta({
      title: 'T', description: 'D', canonicalUrl: 'https://x.test/p', siteName: 'S', robots: 'noindex, nofollow',
    });
    expect(seo.meta).toContainEqual({ name: 'robots', content: 'noindex, nofollow' });
  });

  it('omits robots when not given', () => {
    const seo = buildSeoMeta({ title: 'T', description: 'D', canonicalUrl: 'https://x.test/p', siteName: 'S' });
    expect(seo.meta.some((m) => m.name === 'robots')).toBe(false);
  });

  it('emits article:published_time and author for an article', () => {
    const seo = buildSeoMeta({
      title: 'T', description: 'D', canonicalUrl: 'https://x.test/p', siteName: 'S',
      type: 'article', published: '2026-05-14', author: 'Jane Doe',
    });
    expect(seo.meta).toContainEqual({ property: 'article:published_time', content: '2026-05-14' });
    expect(seo.meta).toContainEqual({ property: 'article:author', content: 'Jane Doe' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-seo-extra.test.ts`
Expected: FAIL. `robots` and `author` are not on `SeoInput`, and the tags are not emitted.

- [ ] **Step 3: Extend `SeoInput` and the emitted meta**

In `src/lib/delivery/seo.ts`, add the two fields to `SeoInput`. Replace:

```ts
  feeds?: { rss?: string; json?: string };
  image?: string;
}
```

with:

```ts
  feeds?: { rss?: string; json?: string };
  image?: string;
  /** A robots meta directive, e.g. "noindex, nofollow". Omitted from the head when absent. */
  robots?: string;
  /** Author name, emitted as article:author for the article type. */
  author?: string;
}
```

After the `if (input.image) { ... }` block (which pushes og:image and twitter:image), add the robots and article tags. Insert immediately before the `const links: SeoMeta['links'] = ...` line:

```ts
  if (input.robots) {
    meta.push({ name: 'robots', content: input.robots });
  }
  if (type === 'article') {
    if (input.published) meta.push({ property: 'article:published_time', content: input.published });
    if (input.modified) meta.push({ property: 'article:modified_time', content: input.modified });
    if (input.author) meta.push({ property: 'article:author', content: input.author });
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-seo-extra.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/delivery/seo.ts src/tests/unit/delivery-seo-extra.test.ts
git commit -m "feat(delivery): add robots and article tags to buildSeoMeta

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: The catch-all loader yields a ready SEO head

**Files:**
- Modify: `src/lib/sveltekit/public-routes.ts`
- Test: `src/tests/unit/public-routes-seo.test.ts`

`entryLoad` currently returns the entry, its html, and the canonical URL. Add a built `seo`, so the catch-all stops hand-calling `buildSeoMeta`. The loader needs the site name, a default description, and the feed URLs, which the deps gain.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/public-routes-seo.test.ts
import { describe, it, expect } from 'vitest';
import { createPublicRoutes } from '../../lib/sveltekit/public-routes.js';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { createSiteIndex } from '../../lib/delivery/site-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';

const descriptor = normalizeConcepts({
  posts: { dir: 'src/content/posts', fields: [], validate: (fm) => ({ ok: true, data: fm }) },
})[0];

const index = createContentIndex(
  fromGlob({ '/src/content/posts/2026-05-14-welcome.md': '---\ntitle: Welcome\ndate: 2026-05-14\ndescription: Hello world\n---\nBody.' }),
  descriptor,
);
const site = createSiteIndex([{ descriptor, index }]);

const routes = createPublicRoutes({
  site,
  render: (md) => `<p>${md}</p>`,
  origin: 'https://x.test',
  siteName: 'X Site',
  description: 'Site default description.',
  feeds: { rss: 'https://x.test/feed.xml', json: 'https://x.test/feed.json' },
});

describe('entryLoad SEO', () => {
  it('builds a seo head with canonical, og:title, and the article type for a dated entry', async () => {
    const url = new URL(site.entries()[0].path, 'https://x.test/');
    const data = await routes.entryLoad({ url });
    expect(data.seo.title).toBe('Welcome');
    expect(data.seo.links).toContainEqual({ rel: 'canonical', href: data.canonicalUrl });
    expect(data.seo.meta).toContainEqual({ property: 'og:title', content: 'Welcome' });
    expect(data.seo.meta).toContainEqual({ property: 'og:type', content: 'article' });
    expect(data.seo.meta).toContainEqual({ property: 'article:published_time', content: '2026-05-14' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/public-routes-seo.test.ts`
Expected: FAIL. `PublicRoutesDeps` has no `siteName`/`description`/`feeds`, and `EntryData` has no `seo`.

- [ ] **Step 3: Extend the deps, the return type, and `entryLoad`**

In `src/lib/sveltekit/public-routes.ts`, add the `buildSeoMeta` import and a `SeoMeta` type import at the top, after the existing imports:

```ts
import { buildSeoMeta } from '../delivery/seo.js';
import type { SeoMeta } from '../delivery/seo.js';
```

Extend `PublicRoutesDeps`. Replace:

```ts
export interface PublicRoutesDeps {
  site: SiteIndex;
  render: (md: string, opts?: { stagger?: boolean }) => string | Promise<string>;
  origin: string;
}
```

with:

```ts
export interface PublicRoutesDeps {
  site: SiteIndex;
  render: (md: string, opts?: { stagger?: boolean }) => string | Promise<string>;
  origin: string;
  /** Site name for og:site_name and the SEO head. */
  siteName: string;
  /** Default description used when an entry has none. */
  description: string;
  /** Absolute feed URLs for the head's autodiscovery links. */
  feeds?: { rss?: string; json?: string };
}
```

Add `seo` to `EntryData`. Replace:

```ts
export interface EntryData {
  entry: ContentEntry;
  html: string;
  canonicalUrl: string;
  newer?: ContentSummary;
  older?: ContentSummary;
}
```

with:

```ts
export interface EntryData {
  entry: ContentEntry;
  html: string;
  canonicalUrl: string;
  seo: SeoMeta;
  newer?: ContentSummary;
  older?: ContentSummary;
}
```

Update the destructure and `entryLoad`. Replace:

```ts
  const { site, render, origin } = deps;
```

with:

```ts
  const { site, render, origin, siteName, description, feeds } = deps;
```

Replace the whole `entryLoad` function:

```ts
  async function entryLoad(event: { url: URL }): Promise<EntryData> {
    const entry = site.byPermalink(event.url.pathname);
    if (!entry) throw error(404, `Not found: ${event.url.pathname}`);
    const { newer, older } = site.adjacent(entry);
    return { entry, html: await render(entry.body, { stagger: true }), canonicalUrl: origin + entry.permalink, newer, older };
  }
```

with:

```ts
  async function entryLoad(event: { url: URL }): Promise<EntryData> {
    const entry = site.byPermalink(event.url.pathname);
    if (!entry) throw error(404, `Not found: ${event.url.pathname}`);
    const { newer, older } = site.adjacent(entry);
    const canonicalUrl = origin + entry.permalink;
    // A dated entry is an article; an undated one (a page) is a website.
    const seo = buildSeoMeta({
      title: entry.title,
      description: (entry.frontmatter.description as string) || entry.excerpt || description,
      canonicalUrl,
      siteName,
      type: entry.date ? 'article' : 'website',
      ...(entry.date ? { published: entry.date } : {}),
      ...(entry.updated ? { modified: entry.updated } : {}),
      feeds,
    });
    return { entry, html: await render(entry.body, { stagger: true }), canonicalUrl, seo, newer, older };
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/public-routes-seo.test.ts`
Expected: PASS.

- [ ] **Step 5: Check the existing public-routes test still passes**

Run: `npx vitest run --project unit src/tests/unit/public-routes.test.ts`
Expected: PASS. If its `createPublicRoutes` call omits the new required `siteName`/`description`, add them to that test's deps (e.g. `siteName: 'Test', description: 'Test description.'`).

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/sveltekit/public-routes.ts src/tests/unit/public-routes-seo.test.ts
git commit -m "feat(delivery): build the SEO head in the catch-all loader

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Feed, sitemap, and robots response helpers

**Files:**
- Create: `src/lib/delivery/responses.ts`
- Test: `src/tests/unit/delivery-responses.test.ts`

Turn the existing builders into ready `Response`s with the correct content type, so a site's `+server.ts` is one line.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/delivery-responses.test.ts
import { describe, it, expect } from 'vitest';
import { rssResponse, jsonFeedResponse, sitemapResponse, robotsResponse } from '../../lib/delivery/responses.js';

const channel = { title: 'T', description: 'D', siteUrl: 'https://x.test', feedUrl: 'https://x.test/feed.xml' };
const items = [{ title: 'Post', url: 'https://x.test/p', date: '2026-05-14', summary: 'S' }];

describe('delivery response helpers', () => {
  it('rssResponse is RSS with the right content type', async () => {
    const res = rssResponse(channel, items);
    expect(res.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8');
    expect(await res.text()).toContain('<rss');
  });

  it('jsonFeedResponse is JSON Feed with the right content type', async () => {
    const res = jsonFeedResponse(channel, items);
    expect(res.headers.get('Content-Type')).toBe('application/feed+json; charset=utf-8');
    expect(JSON.parse(await res.text()).items).toHaveLength(1);
  });

  it('sitemapResponse is XML with the urlset', async () => {
    const res = sitemapResponse([{ loc: 'https://x.test/' }]);
    expect(res.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    expect(await res.text()).toContain('<urlset');
  });

  it('robotsResponse is text with the sitemap and disallow', async () => {
    const res = robotsResponse({ sitemapUrl: 'https://x.test/sitemap.xml', disallow: ['/admin'] });
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    const body = await res.text();
    expect(body).toContain('Sitemap:');
    expect(body).toContain('Disallow: /admin');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-responses.test.ts`
Expected: FAIL, cannot resolve `../../lib/delivery/responses.js`.

- [ ] **Step 3: Write `src/lib/delivery/responses.ts`**

```ts
// cairn-cms: response helpers for the public delivery endpoints. Each wraps a builder in a
// Response with the correct Content-Type, so a site's +server.ts GET is a single call. The
// content type is the one detail every site otherwise copies and occasionally gets wrong.
import { buildRssFeed, buildJsonFeed, type FeedChannel, type FeedItem } from './feeds.js';
import { buildSitemap, type SitemapUrl } from './sitemap.js';
import { buildRobots } from './robots.js';

/** An RSS 2.0 feed response. */
export function rssResponse(channel: FeedChannel, items: FeedItem[]): Response {
  return new Response(buildRssFeed(channel, items), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}

/** A JSON Feed 1.1 response. */
export function jsonFeedResponse(channel: FeedChannel, items: FeedItem[]): Response {
  return new Response(buildJsonFeed(channel, items), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
}

/** A sitemap response. */
export function sitemapResponse(urls: SitemapUrl[]): Response {
  return new Response(buildSitemap(urls), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

/** A robots.txt response. */
export function robotsResponse(opts: { sitemapUrl: string; disallow?: string[] }): Response {
  return new Response(buildRobots(opts), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-responses.test.ts`
Expected: PASS (4 tests). (`Response` is a global in the node test environment via undici.)

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/delivery/responses.ts src/tests/unit/delivery-responses.test.ts
git commit -m "feat(delivery): add feed, sitemap, and robots response helpers

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: `jsonLdScript` and the `<CairnHead>` component

**Files:**
- Create: `src/lib/delivery/json-ld.ts`
- Create: `src/lib/delivery/CairnHead.svelte`
- Test: `src/tests/unit/delivery-json-ld.test.ts`
- Test: `src/tests/component/CairnHead.test.ts`

Ship the head component so no site re-hand-rolls the `<svelte:head>` mapping, and own the JSON-LD escaping so no site re-trips the script-element breakout.

- [ ] **Step 1: Write the failing unit test for `jsonLdScript`**

```ts
// src/tests/unit/delivery-json-ld.test.ts
import { describe, it, expect } from 'vitest';
import { jsonLdScript } from '../../lib/delivery/json-ld.js';

describe('jsonLdScript', () => {
  it('wraps the data in a typed script tag', () => {
    const out = jsonLdScript({ '@type': 'WebSite', name: 'X' });
    expect(out.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(out.endsWith('</script>')).toBe(true);
  });

  it('escapes a script-element breakout in a value', () => {
    const out = jsonLdScript({ name: '</script><img src=x onerror=alert(1)>' });
    // The raw breakout must not appear; the < > & are escaped to their JSON unicode forms.
    expect(out).not.toContain('</script><img');
    expect(out).toContain('\\u003c/script\\u003e');
  });

  it('escaped output parses back to the same object', () => {
    const data = { name: 'a < b & c > d', '</script>': 'x' };
    const out = jsonLdScript(data);
    const inner = out.slice('<script type="application/ld+json">'.length, -'</script>'.length);
    const unescaped = inner.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&');
    expect(JSON.parse(unescaped)).toEqual(data);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-json-ld.test.ts`
Expected: FAIL, cannot resolve `../../lib/delivery/json-ld.js`.

- [ ] **Step 3: Write `src/lib/delivery/json-ld.ts`**

```ts
// cairn-cms: serialize a JSON-LD object into a safe inline script string. JSON.stringify does
// not escape <, >, or &, so a value containing "</script>" would close the element and inject
// markup. Escaping the three characters to their JSON unicode forms keeps the structured data
// identical for a parser while making the bytes unable to break out of the script element.
export function jsonLdScript(data: Record<string, unknown>): string {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return `<script type="application/ld+json">${json}</script>`;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-json-ld.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write `src/lib/delivery/CairnHead.svelte`**

The component renders the meta tags, the link tags, and the JSON-LD into `<svelte:head>`. The `<title>` is rendered from `seo.title` by default; pass `title={false}` to let the site own the `<title>` (so a site can keep its own "Page, Site" format), or pass a string to override. It carries no CSS, so it pulls in no admin styles.

```svelte
<script lang="ts">
  import type { SeoMeta } from './seo.js';
  import { jsonLdScript } from './json-ld.js';

  let { seo, title }: { seo: SeoMeta; title?: string | false } = $props();
  const titleText = $derived(title === undefined ? seo.title : title);
</script>

<svelte:head>
  {#if titleText !== false}
    <title>{titleText}</title>
  {/if}
  {#each seo.meta as m}
    {#if m.name}
      <meta name={m.name} content={m.content} />
    {:else if m.property}
      <meta property={m.property} content={m.content} />
    {/if}
  {/each}
  {#each seo.links as l}
    <link rel={l.rel} type={l.type} href={l.href} title={l.title} />
  {/each}
  {@html jsonLdScript(seo.jsonLd)}
</svelte:head>
```

- [ ] **Step 6: Write the component test**

```ts
// src/tests/component/CairnHead.test.ts
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CairnHead from '../../lib/delivery/CairnHead.svelte';

const seo = {
  title: 'Welcome',
  meta: [
    { name: 'description', content: 'Hello world' },
    { property: 'og:title', content: 'Welcome' },
  ],
  links: [{ rel: 'canonical', href: 'https://x.test/p' }],
  jsonLd: { '@type': 'Article', headline: '</script><img>' },
};

describe('CairnHead', () => {
  it('renders the title, meta, link, and an escaped JSON-LD script in the head', async () => {
    render(CairnHead, { seo });
    expect(document.title).toBe('Welcome');
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Welcome');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://x.test/p');
    const ld = document.head.querySelector('script[type="application/ld+json"]');
    expect(ld).not.toBeNull();
    expect(ld!.textContent).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(ld!.textContent!.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&')))
      .toEqual(seo.jsonLd);
  });

  it('omits the title when title is false', async () => {
    document.title = 'site-owned';
    render(CairnHead, { seo, title: false });
    expect(document.title).toBe('site-owned');
  });
});
```

- [ ] **Step 7: Run the component test to verify it fails, then passes**

Run: `npx vitest run --project component src/tests/component/CairnHead.test.ts`
Expected: first run FAILS to resolve the component (before Step 5) or fails its assertions; after Steps 5 and 6 it PASSES (2 tests). If the very first run is after Step 5, expect PASS. The `{@html}` JSON-LD writes into `document.head`; the browser parses it as a script element, so `textContent` carries the escaped JSON.

- [ ] **Step 8: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/delivery/json-ld.ts src/lib/delivery/CairnHead.svelte src/tests/unit/delivery-json-ld.test.ts src/tests/component/CairnHead.test.ts
git commit -m "feat(delivery): add jsonLdScript and the CairnHead component

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: The `/delivery` package entry and its backend-free boundary

**Files:**
- Create: `src/lib/delivery/index.ts`
- Modify: `package.json` (the `exports` map)
- Test: `src/tests/unit/delivery-entry-boundary.test.ts`

Add the fourth package entry that exposes the whole delivery toolkit and imports no auth, github, or email. `/sveltekit` keeps re-exporting `createPublicRoutes` for back-compat, but `/delivery` becomes the documented import.

- [ ] **Step 1: Write the failing boundary test**

```ts
// src/tests/unit/delivery-entry-boundary.test.ts
// The /delivery entry must not pull the server backend into a public bundle. The delivery
// modules and the public-routes loader they re-export must import nothing from github, auth,
// or email. This reads the source statically rather than introspecting a built graph.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const files = [
  ...readdirSync('src/lib/delivery').filter((f) => f.endsWith('.ts')).map((f) => `src/lib/delivery/${f}`),
  'src/lib/sveltekit/public-routes.ts',
];
const forbidden = [/from '\.\.\/github/, /from '\.\.\/auth/, /from '\.\.\/email/, /from '\.\.\/\.\.\/lib\/(github|auth|email)/];

describe('/delivery backend-free boundary', () => {
  it('exposes a barrel', () => {
    const barrel = readFileSync('src/lib/delivery/index.ts', 'utf8');
    expect(barrel).toContain('createSiteIndex');
    expect(barrel).toContain('CairnHead');
  });

  it('imports no github, auth, or email module', () => {
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const pattern of forbidden) {
        expect(src, `${file} must not import a backend module`).not.toMatch(pattern);
      }
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-entry-boundary.test.ts`
Expected: FAIL, cannot read `src/lib/delivery/index.ts` (it does not exist yet).

- [ ] **Step 3: Write `src/lib/delivery/index.ts`**

```ts
// cairn-cms: the public delivery entry (@glw907/cairn-cms/delivery). The complete, canonical,
// backend-free toolkit a SvelteKit site wires its public pages with: the content index and the
// site resolver, the descriptor helper, the syndication and SEO builders, the endpoint response
// helpers, the catch-all route loaders, and the head component. It imports nothing from auth,
// github, or email, so importing it does not pull the server backend into a public bundle.
export { createContentIndex, fromGlob } from './content-index.js';
export type { RawFile, ContentSummary, ContentEntry, ContentIndex } from './content-index.js';
export { createSiteIndex } from './site-index.js';
export type { SiteIndex, ConceptIndex } from './site-index.js';
export { siteDescriptors } from './site-descriptors.js';
export { deriveExcerpt, wordCount } from './excerpt.js';
export { buildRssFeed, buildJsonFeed } from './feeds.js';
export type { FeedChannel, FeedItem } from './feeds.js';
export { buildSitemap } from './sitemap.js';
export type { SitemapUrl } from './sitemap.js';
export { buildRobots } from './robots.js';
export { buildSeoMeta } from './seo.js';
export type { SeoInput, SeoMeta } from './seo.js';
export { paginate } from './paginate.js';
export type { Page } from './paginate.js';
export { rssResponse, jsonFeedResponse, sitemapResponse, robotsResponse } from './responses.js';
export { jsonLdScript } from './json-ld.js';
export { permalink } from '../content/permalink.js';
export { createPublicRoutes } from '../sveltekit/public-routes.js';
export type {
  PublicRoutesDeps,
  ListData,
  TagData,
  TagIndexData,
  EntryData,
} from '../sveltekit/public-routes.js';
export { default as CairnHead } from './CairnHead.svelte';
```

- [ ] **Step 4: Add the `./delivery` export to `package.json`**

In `package.json`, in the `exports` object, add the `./delivery` key after `./components` (keep `./package.json` last):

```json
    "./delivery": {
      "types": "./dist/delivery/index.d.ts",
      "svelte": "./dist/delivery/index.js",
      "default": "./dist/delivery/index.js"
    },
```

- [ ] **Step 5: Run the boundary test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-entry-boundary.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Build the package and confirm the entry emits**

Run: `npm run package`
Expected: `svelte-package` succeeds and writes `dist/delivery/index.js` and `dist/delivery/index.d.ts` (plus `dist/delivery/CairnHead.svelte`).

Run: `node -e "const fs=require('node:fs'); for (const p of ['dist/delivery/index.js','dist/delivery/index.d.ts']) { if(!fs.existsSync(p)) throw new Error('missing '+p); } console.log('delivery entry built');"`
Expected: prints `delivery entry built`.

- [ ] **Step 7: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/delivery/index.ts package.json src/tests/unit/delivery-entry-boundary.test.ts
git commit -m "feat(delivery): add the backend-free /delivery package entry

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Wire the showcase to prove the blessed path end to end

**Files:**
- Modify: `examples/showcase/src/lib/cairn.config.ts` (add a `pages` concept)
- Create: `examples/showcase/src/content/posts/2026-01-15-hello.md`
- Create: `examples/showcase/src/content/posts/2026-02-20-second.md`
- Create: `examples/showcase/src/content/pages/about.md`
- Create: `examples/showcase/src/lib/content.ts`
- Create: `examples/showcase/src/routes/[...path]/+page.server.ts`
- Create: `examples/showcase/src/routes/[...path]/+page.svelte`
- Create: `examples/showcase/src/routes/feed.xml/+server.ts`
- Create: `examples/showcase/src/routes/sitemap.xml/+server.ts`
- Create: `examples/showcase/src/routes/robots.txt/+server.ts`

The showcase proves only the admin surface today. Wire the public delivery so the build exercises every new piece: `siteDescriptors`, `createSiteIndex` (with validation), `createPublicRoutes` with the SEO head, `<CairnHead>`, and the three response helpers. The build prerendering all of it is the end-to-end gate.

- [ ] **Step 1: Add a `pages` concept to the showcase adapter**

In `examples/showcase/src/lib/cairn.config.ts`, add a `pages` concept inside `content`, after the `posts` block:

```ts
    pages: {
      dir: 'src/content/pages',
      label: 'Pages',
      fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
      validate(frontmatter, _body) {
        const title = typeof frontmatter.title === 'string' ? frontmatter.title.trim() : '';
        if (!title) return { ok: false, errors: { title: 'Title is required' } };
        return { ok: true, data: { ...frontmatter, title } };
      },
    },
```

- [ ] **Step 2: Add the content files**

`examples/showcase/src/content/posts/2026-01-15-hello.md`:

```markdown
---
title: Hello, cairn
date: 2026-01-15
description: The first showcase post.
---
This is the first post in the cairn showcase.
```

`examples/showcase/src/content/posts/2026-02-20-second.md`:

```markdown
---
title: A second post
date: 2026-02-20
description: Proving the archive and feed list more than one entry.
---
A second post so the feed and sitemap list more than one item.
```

`examples/showcase/src/content/pages/about.md`:

```markdown
---
title: About
---
The cairn showcase is a minimal site proving the engine surfaces.
```

- [ ] **Step 3: Create the showcase content layer**

`examples/showcase/src/lib/content.ts`:

```ts
// The showcase's one delivery content layer: it globs the markdown, derives the descriptors
// with siteDescriptors, builds a validated per-concept index, and unions them into the site
// index every public route reads.
import {
  createContentIndex,
  createSiteIndex,
  fromGlob,
  siteDescriptors,
  type SiteIndex,
} from '@glw907/cairn-cms/delivery';
import { parseSiteConfig } from '@glw907/cairn-cms';
import { cairn } from './cairn.config.js';
import siteYaml from './site.config.yaml?raw';

const descriptors = siteDescriptors(cairn, parseSiteConfig(siteYaml));
const byId = Object.fromEntries(descriptors.map((d) => [d.id, d]));

const postsRaw = import.meta.glob('/src/content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const pagesRaw = import.meta.glob('/src/content/pages/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const site: SiteIndex = createSiteIndex([
  { descriptor: byId.posts, index: createContentIndex(fromGlob(postsRaw), byId.posts) },
  { descriptor: byId.pages, index: createContentIndex(fromGlob(pagesRaw), byId.pages) },
]);

export const ORIGIN = 'https://showcase.test';
export const SITE_DESCRIPTION = 'The cairn showcase site.';
```

- [ ] **Step 4: Create the catch-all route**

`examples/showcase/src/routes/[...path]/+page.server.ts`:

```ts
import type { PageServerLoad, EntryGenerator } from './$types';
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn } from '$lib/cairn.config';

export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.render,
  origin: ORIGIN,
  siteName: cairn.siteName,
  description: SITE_DESCRIPTION,
  feeds: { rss: ORIGIN + '/feed.xml', json: ORIGIN + '/feed.json' },
});

export const entries: EntryGenerator = () => routes.entries();

export const load: PageServerLoad = ({ url }) => routes.entryLoad({ url });
```

`examples/showcase/src/routes/[...path]/+page.svelte`:

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { CairnHead } from '@glw907/cairn-cms/delivery';

  let { data }: { data: PageData } = $props();
</script>

<CairnHead seo={data.seo} />

<article>
  <h1>{data.entry.title}</h1>
  {@html data.html}
</article>
```

- [ ] **Step 5: Create the three endpoint routes**

`examples/showcase/src/routes/feed.xml/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { rssResponse, type FeedItem } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn } from '$lib/cairn.config';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const posts = site.concept('posts')?.all() ?? [];
  const items: FeedItem[] = await Promise.all(
    posts.map(async (p) => ({
      title: p.title,
      url: ORIGIN + p.permalink,
      date: p.date ?? '',
      summary: p.excerpt,
      contentHtml: await cairn.render(site.concept('posts')!.byId(p.id)!.body),
      tags: p.tags,
    })),
  );
  return rssResponse(
    { title: cairn.siteName, description: SITE_DESCRIPTION, siteUrl: ORIGIN, feedUrl: ORIGIN + '/feed.xml' },
    items,
  );
};
```

`examples/showcase/src/routes/sitemap.xml/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { sitemapResponse, type SitemapUrl } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN } from '$lib/content';

export const prerender = true;

export const GET: RequestHandler = () => {
  const urls: SitemapUrl[] = [
    { loc: ORIGIN + '/' },
    ...site.all().map((s) => (s.date ? { loc: ORIGIN + s.permalink, lastmod: s.date } : { loc: ORIGIN + s.permalink })),
  ];
  return sitemapResponse(urls);
};
```

`examples/showcase/src/routes/robots.txt/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import { ORIGIN } from '$lib/content';

export const prerender = true;

export const GET: RequestHandler = () => {
  return robotsResponse({ sitemapUrl: ORIGIN + '/sitemap.xml', disallow: ['/admin'] });
};
```

- [ ] **Step 6: Build the engine, then build the showcase**

The showcase imports `@glw907/cairn-cms/delivery`, so the engine `dist` must carry that entry first.

Run: `npm run package`
Expected: succeeds; `dist/delivery/index.js` exists (from Task 8).

Run: `npm --prefix examples/showcase run build`
Expected: the showcase builds and prerenders the catch-all entries, the home, and the three endpoint routes. If the build cannot resolve `@glw907/cairn-cms/delivery`, the showcase's installed copy of the package is stale; run `npm --prefix examples/showcase install` (or re-link the workspace package) and rebuild. The build failing on invalid content would mean a content fixture does not satisfy its concept's `validate`; fix the fixture, do not disable validation.

- [ ] **Step 7: Confirm the delivery output prerendered**

Run: `node -e "const {execSync}=require('node:child_process'); const out=execSync('find examples/showcase/.svelte-kit -name feed.xml -o -name sitemap.xml -o -name robots.txt',{encoding:'utf8'}); for (const f of ['feed.xml','sitemap.xml','robots.txt']) { if(!out.includes(f)) throw new Error('missing prerendered '+f); } console.log('showcase delivery prerendered');"`
Expected: prints `showcase delivery prerendered`.

- [ ] **Step 8: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add examples/showcase/src/lib/cairn.config.ts examples/showcase/src/content examples/showcase/src/lib/content.ts "examples/showcase/src/routes/[...path]" examples/showcase/src/routes/feed.xml examples/showcase/src/routes/sitemap.xml examples/showcase/src/routes/robots.txt
git commit -m "feat(showcase): wire the public delivery path end to end

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Refresh the integration guide with a delivery section

**Files:**
- Modify: `docs/creating-a-cairn-site.md`

Fold the delivery material into the integration guide as a new "Public delivery" section, structured as one copy-paste recipe per surface, and refresh the stale status tags and missing models. No code change, so no test; the `prose-guard` write hook gates the prose.

- [ ] **Step 1: Add the "Public delivery" section**

Append a new top-level section to `docs/creating-a-cairn-site.md`, after the existing numbered sections. Write it as recipes a developer copies, each pointing at the showcase as the working reference. Cover, with a fenced code block per recipe:

1. The content layer: `siteDescriptors(cairn, parseSiteConfig(yaml))`, `createContentIndex`/`fromGlob` per concept, and `createSiteIndex` from `@glw907/cairn-cms/delivery` (note the validation that fails the build on bad frontmatter, and that the import is backend-free).
2. The catch-all route: `[...path]/+page.server.ts` with `createPublicRoutes`, `prerender = true`, `entries`, and `load`; `[...path]/+page.svelte` with `<CairnHead seo={data.seo} />` and the site-owned body.
3. The feeds: `feed.xml/+server.ts` and `feed.json/+server.ts` with `rssResponse`/`jsonFeedResponse`.
4. The sitemap and robots: `sitemap.xml/+server.ts` with `sitemapResponse` over `site.all()`, and `robots.txt/+server.ts` with `robotsResponse`.
5. A one-line pointer that `examples/showcase` is the complete working reference for all of the above.

Use the exact code from the showcase files written in Task 9 as the recipe bodies, so the guide and the working example cannot drift. Keep prose plain: no em dashes, no banned filler words (the `prose-guard` hook rejects the write otherwise).

- [ ] **Step 2: Refresh the stale parts**

In the same file:
- Remove the `[Shipped]` / `[Planned: Pass I/J/K]` / `[Planned: R9]` / `[R8]` status tags from the section headings; the surfaces they marked have shipped in 0.10.
- In the adapter-contract section, confirm the `CairnAdapter` shape matches the current `src/lib/content/types.ts` (concepts with `fields` + `validate`, `backend`, `sender`, `render`, `registry`, `icons`, `navMenu`). Correct anything that drifted.
- Add a short "URLs and the dated-slug model" note: the YAML URL policy drives each concept's permalink, posts carry a date prefix, and `siteDescriptors` is the single call that derives the descriptors the index and the admin share.

- [ ] **Step 3: Verify the prose passes the guard and reads cleanly**

Run: `prose-guard docs/creating-a-cairn-site.md`
Expected: no violations reported. (If it flags a line, rewrite that sentence for plain human cadence rather than swapping one banned token for another.)

- [ ] **Step 4: Commit**

```bash
git add docs/creating-a-cairn-site.md
git commit -m "docs: add a public delivery section and refresh the integration guide

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage.** Packaging `/delivery` decoupled from the backend is Task 8 (with the boundary test). Validation safe-by-default is Task 2. SEO in the loader is Task 5; the `buildSeoMeta` breadth additions are Task 4. The endpoint helpers are Task 6. `<CairnHead>` and `jsonLdScript` with escaping are Task 7. `siteDescriptors` is Task 3. The generic-ready requirement is Task 1. The showcase example (the end-to-end gate) is Task 9. The integration-guide refresh with per-surface recipes is Task 10. The typed-reads pass, OpenGraph image generation, and the other conscious non-goals stay out of scope per the spec.
- **Ordering and green builds.** Each task leaves the engine compiling and tested. The new units (Tasks 1 through 7) land before the `/delivery` barrel (Task 8) that re-exports them, which lands before the showcase (Task 9) that imports the barrel, which lands before the guide (Task 10) that documents the showcase wiring.
- **Type consistency.** `createPublicRoutes` deps gain `siteName`, `description`, and `feeds`; `EntryData` gains `seo: SeoMeta`; the showcase and the guide use exactly those names. `ContentEntry<F>` and `ContentIndex<F>` default to `Record<string, unknown>`, so Tasks 2 through 9 read `entry.frontmatter.description as string` exactly as today. The validation reads `descriptor.validate(entry.frontmatter, entry.body)` against the real `ValidationResult` union.
- **Refinement to record for the user.** The spec said `<CairnHead>` renders the title. The component renders the title by default but accepts `title={false}` so a site can keep its own "Page, Site" title format without a double `<title>`. This is a small superset of the spec, not a deviation from it.
- **Release.** Publishing a version bump so the sites can consume `/delivery` is a separate release step after this pass, per the cairn release process. ecnordic Pass 1c and the 907 migration adopt the blessed path after publish.

---

## Post-mortem (executed 2026-06-01)

All ten tasks landed test-first on `main`, plus three review-gate commits. Commits `d606676..27deb16` (thirteen total). The tree is clean and unpushed.

**What was built.** The delivery layer became the blessed, backend-free public path. `createContentIndex` is now generic over the frontmatter type (`<F = Record<string, unknown>>`) so the later typed-reads pass drops in without a signature break. `createSiteIndex` validates every entry against its concept's `validate` at build, safe-by-default, with a `{ validate: false }` opt-out, so malformed frontmatter fails the build instead of shipping. `buildSeoMeta` gained a `robots` directive and the `article:*` tags. The catch-all `entryLoad` now returns a ready `seo: SeoMeta` built from the entry, so a site stops hand-calling `buildSeoMeta`. New `responses.ts` wraps the feed, sitemap, and robots builders in `Response`s with the right content type. New `json-ld.ts` serializes JSON-LD with escaping that survives a `</script>` breakout and the U+2028/U+2029 separators. New `CairnHead.svelte` renders the head from a `SeoMeta`, with `title={false}` to let a site own its `<title>`. `siteDescriptors(adapter, config)` collapses the `normalizeConcepts(content, urlPolicyFrom(config))` incantation. The fourth package entry `@glw907/cairn-cms/delivery` exposes the whole toolkit and imports no auth, github, or email (a static boundary test enforces it). The showcase wires all of it (`content.ts`, the `[...path]` route with `<CairnHead>`, and feed.xml, feed.json, sitemap.xml, robots.txt), so the build prerenders every surface as the end-to-end gate. The integration guide gained a "Public delivery" recipe section copied verbatim from the showcase, and its stale status tags and drifted adapter contract were corrected.

**Verified.** Final gate on `main`: `npm run check` 739 files 0 errors 0 warnings; `npm test` 88 files / 398 tests exit 0; `npm run check:package` green including attw all-green for the new `/delivery` entry; the showcase production build prerenders `feed.xml`, `feed.json`, `sitemap.xml`, `robots.txt`, and the catch-all entries. The showcase resolves `/delivery` through the workspace symlink with no install refresh and no lock drift. A simplifier pass plus a `svelte-reviewer` and a `daisyui-a11y-reviewer` (both Opus) and a two-angle `/code-review` ran at the gate.

**Review findings folded in.** The simplifier hoisted a repeated `site.concept('posts')` lookup in `feed.xml` and folded the sitemap branch (`25ddcea`). The `svelte-reviewer` caught that `jsonLdScript` escaped the angle brackets but not U+2028/U+2029, which author frontmatter can carry through `{@html}`; fixed test-first (`6b00400`). The code review caught that the catch-all advertised a `/feed.json` autodiscovery link the showcase never served; the missing route was added, which also gave the build its only end-to-end coverage of `jsonFeedResponse` (`27deb16`).

**Execution deviations locked in.** Task 1 had to thread `ContentEntry<F>` through two inner helpers (`summarize`, `visible`) the plan did not mention, to keep the check green. Several task test drafts needed an explicit `(fm: Record<string, unknown>)` or `ok: true as const` annotation to satisfy svelte-check's no-implicit-any. The U+2028/U+2029 fix could not embed the raw separators in source (they are JS line terminators), so the implementation matches them with `/ /g` regexes. The real `SeoMeta['meta']` is a single optional-field object type, not a discriminated union, so `CairnHead` needed no narrowing. Task 10 found and corrected real drift in the integration guide: the adapter contract still described the retired `collections[]`/`renderPreview` model and a better-auth store.

**No live admin smoke.** This pass touches the public delivery surface only, not `/admin`, so the live-Worker smoke does not apply.

**Open decisions surfaced by the review (carried, not bugs).**
- Build validation runs over drafts too (`includeDrafts: true`), by the plan's design (Task 2 asserts it). A draft saved with an unfilled required field would fail the production build. In practice the admin save path validates before it commits, so an invalid draft does not normally reach the repo; the build gate is the backstop for content edited directly in git. Revisit if draft-time build failures become a real friction.
- `createSiteIndex` validation checks `result.ok` and discards the validator's normalized `result.data`. The admin save path applies that normalization; the delivery read does not, so a validator that trims or defaults a field passes the build yet serves the raw frontmatter. The delivery path treats `validate` as a gate, not a transform. Folding normalization into the read belongs with the typed-reads pass.
- Build validation sees `parseMarkdown` frontmatter, where gray-matter turns an unquoted YAML `date:` into a JS `Date`. The library `validateFields` helper already coerces it (`validate.ts`), so a standard adapter is safe; a site that hand-rolls a `validate` which string-checks `date` without coercing would reject valid posts at build. This matters for the site migrations: their validators must route dates through `validateFields` or coerce. Recorded for the migration step.
- Minor, left as-is: `entryLoad` attaches feed autodiscovery links to every entry including undated Pages (common practice, site-wide discovery), and the showcase `feed.xml` passes `date: p.date ?? ''` which would render an `Invalid Date` pubDate for an undated item (unreachable while posts are always dated).

**Follow-on, unchanged from the plan.** Typed reads, OpenGraph image generation, redirects, and i18n stay out of scope. After this publishes, ecnordic Pass 1c and the 907 migration adopt the blessed path.
