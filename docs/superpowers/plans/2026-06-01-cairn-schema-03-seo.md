# cairn Schema Source of Truth (Plan 3): The Per-Entry SEO Head Consumer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the per-entry `image`, `robots`, and `author` frontmatter fields into the public SEO head, resolving a relative image to an absolute URL and falling back to one site-wide default OG image, so a schema field declaration drives the head tag end to end.

**Architecture:** A new pure `seo-fields.ts` holds a cross-concept boundary reader (`readSeoFields`) and an image resolver (`resolveImageUrl`). `entryLoad` calls the reader, applies the description and default-image fallback chains, resolves the image, and hands the three fields to the unchanged `buildSeoMeta`. The catch-all route is cross-concept, so the read coerces by name off the normalized `.frontmatter`; the typed payoff is the full schema-to-head loop, proven by the showcase production prerender.

**Tech Stack:** TypeScript, vitest (`unit` project, node), the `WHATWG URL` constructor for resolution, Vite `import.meta.glob` and SvelteKit prerender for the showcase end-to-end gate.

**Design reference:** `docs/superpowers/specs/2026-06-01-cairn-schema-03-seo-design.md` (approved). Plan 2 (the contract cutover) landed at `0.13.0`.

---

## Conventions for every task

- Work in `/home/glw907/Projects/cairn/cairn-cms` on branch `main`. This plan is additive across the package surface, and a cairn-cms push deploys no site, so it runs on `main` directly.
- Test-first (TDD): write or change the failing test, run it and watch it fail for the right reason, implement, watch it pass.
- Full gate before each commit: `npm run check` reports 0 errors and 0 warnings, and `npm test` EXITS 0 (it runs `unit`, `component`, and `integration`; it must exit 0, not merely show green assertions).
- Targeted test command: `npx vitest run --project unit src/tests/unit/<file>.test.ts`.
- Commit specific files, never `git add -A`. Commit footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies; plain voice.
- Do NOT run `npm install` from inside the workspace member; it drifts the root lock. The showcase's own `npm install` in `examples/showcase` (Task 4) is allowed, since it is the example's install, not a package-member install.
- Known flake: `src/tests/component/MarkdownEditor.test.ts` can fail once on a CodeMirror mount-timeout under parallel load. If `npm test` exits non-zero solely on that, re-run once to confirm green before committing.
- `npm run check` exits non-zero locally on the showcase `svelte.config.js` unless the showcase deps are installed. The svelte-check scan itself is 0/0 either way; CI checks out cairn-cms standalone and stays green. If the showcase config import is the only failure, the scan result (0 errors 0 warnings) is the gate.

## Reference values (verified against the live tree)

- `src/lib/delivery/seo.ts`: `buildSeoMeta(input: SeoInput): SeoMeta` already accepts `image`, `robots`, and `author` and emits `og:image`/`twitter:image` (for any type), `robots`, and `article:author` (article type only). It is UNCHANGED by this plan. Its doc says all URLs are absolute.
- `src/lib/sveltekit/public-routes.ts`: `PublicRoutesDeps` is `{ site, render, origin, siteName, description, feeds? }` at lines 12-23. `entryLoad` is at lines 62-79; line 70 reads `(entry.frontmatter.description as string) || entry.excerpt || description`. `entry` comes from `site.byPermalink(...)`, a `ContentEntry` whose `.frontmatter` is the normalized validator output (`result.data`), typed `Record<string, unknown>`.
- After Plan 2, `createContentIndex` stores the normalized `result.data` on `.frontmatter`, which carries ONLY declared schema fields. So a field the reader reads must be declared in the concept's schema. The tests and the showcase declare the SEO fields for this reason.
- `src/lib/delivery/index.ts`: the SEO exports are at lines 19-20 (`buildSeoMeta`, `SeoInput`, `SeoMeta`). `createPublicRoutes`/`PublicRoutesDeps` are exported at lines 26-33.
- `src/lib/index.ts`: the SEO exports are at lines 135-136.
- `src/tests/unit/public-routes-seo.test.ts`: the existing `entryLoad SEO` test, built on a `normalizeConcepts` + `createContentIndex` + `createSiteIndex` + `createPublicRoutes` fixture. This plan replaces that file.
- `examples/showcase/src/lib/cairn.config.ts`: the `defineAdapter` adapter; `posts` schema declares `title`/`date`/`description`, `pages` declares `title`.
- `examples/showcase/src/routes/[...path]/+page.server.ts`: `createPublicRoutes({ site, render, origin: ORIGIN, siteName, description: SITE_DESCRIPTION, feeds })` at lines 8-15. `ORIGIN` is `https://showcase.test`.
- `examples/showcase/src/content/`: posts `2026-01-15-hello.md`, `2026-02-20-second.md`, `2026-03-10-callout.md`; page `about.md`.
- `package.json`: `"version": "0.13.0"`.

---

## Task 1: The SEO fields reader and the image resolver

**Files:**
- Create: `src/lib/delivery/seo-fields.ts`
- Create: `src/tests/unit/delivery-seo-fields.test.ts`
- Modify: `src/lib/delivery/index.ts`
- Modify: `src/lib/index.ts`

A pure module that reads the four known head fields off an entry's normalized frontmatter and resolves an author-supplied image path to an absolute URL. Both functions are pure and node-testable, kept apart from the head builder in `seo.ts` so that reading frontmatter and building the head stay distinct concerns.

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/delivery-seo-fields.test.ts`:

```ts
import { describe, it, expect, expectTypeOf } from 'vitest';
import { readSeoFields, resolveImageUrl } from '../../lib/delivery/seo-fields.js';
import { defineFields, type Infer } from '../../lib/content/schema.js';

describe('readSeoFields', () => {
  it('keeps present string head fields', () => {
    expect(
      readSeoFields({ description: 'D', image: '/og/a.png', robots: 'noindex', author: 'Ada' }),
    ).toEqual({ description: 'D', image: '/og/a.png', robots: 'noindex', author: 'Ada' });
  });

  it('omits absent, empty, and non-string values, and ignores unknown keys', () => {
    expect(readSeoFields({ description: '', image: 42, author: 'Ada', title: 'T' })).toEqual({
      author: 'Ada',
    });
    expect(readSeoFields({})).toEqual({});
  });
});

describe('resolveImageUrl', () => {
  const origin = 'https://x.test';
  it('passes an absolute or protocol-relative URL through', () => {
    expect(resolveImageUrl('https://cdn.test/a.png', origin)).toBe('https://cdn.test/a.png');
    expect(resolveImageUrl('//cdn.test/a.png', origin)).toBe('https://cdn.test/a.png');
  });
  it('anchors a root-relative or bare path to the origin', () => {
    expect(resolveImageUrl('/og/a.png', origin)).toBe('https://x.test/og/a.png');
    expect(resolveImageUrl('og/a.png', origin)).toBe('https://x.test/og/a.png');
  });
  it('returns undefined for a malformed image string', () => {
    expect(resolveImageUrl('http://[invalid', origin)).toBeUndefined();
  });
});

describe('a declared SEO field reaches the inferred type', () => {
  it('infers image as an optional string', () => {
    const schema = defineFields([
      { type: 'text', name: 'title', label: 'Title', required: true },
      { type: 'text', name: 'image', label: 'Social image' },
    ]);
    expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<{ title: string; image?: string }>();
    expect(schema.fields.map((f) => f.name)).toEqual(['title', 'image']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-seo-fields.test.ts`
Expected: FAIL. `../../lib/delivery/seo-fields.js` does not exist.

- [ ] **Step 3: Implement the reader and resolver**

Create `src/lib/delivery/seo-fields.ts`:

```ts
// cairn-cms: the SEO head fields read at the cross-concept boundary (schema-source-of-truth design,
// Plan 3). The catch-all route resolves any concept by request path, so the entry's frontmatter is
// typed Record<string, unknown>; this reads the known head fields by name and coerces. Kept apart
// from seo.ts (the head builder) so reading frontmatter and building the head stay distinct concerns.

/** The head fields a concept can carry in frontmatter. Each is optional and omitted when absent. */
export interface SeoFields {
  description?: string;
  image?: string;
  robots?: string;
  author?: string;
}

const KEYS = ['description', 'image', 'robots', 'author'] as const;

/** Read the known SEO head fields off an entry's normalized frontmatter. Keeps a non-empty string and
 *  omits an absent, empty, or non-string value. The field must be declared in the concept's schema to
 *  survive the validate-once read; an undeclared key is not on the normalized frontmatter. */
export function readSeoFields(frontmatter: Record<string, unknown>): SeoFields {
  const fields: SeoFields = {};
  for (const key of KEYS) {
    const value = frontmatter[key];
    if (typeof value === 'string' && value.trim() !== '') fields[key] = value;
  }
  return fields;
}

/** Resolve an author-supplied image path to an absolute URL against the site origin. An absolute or
 *  protocol-relative URL passes through; a root-relative or bare path anchors to the origin; a
 *  malformed string returns undefined rather than throwing at build. */
export function resolveImageUrl(image: string, origin: string): string | undefined {
  try {
    return new URL(image, origin).href;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-seo-fields.test.ts`
Expected: PASS, all four describe blocks green. The `expectTypeOf` assertion is also compile-checked by `npm run check`.

- [ ] **Step 5: Export the reader and resolver**

In `src/lib/delivery/index.ts`, add after the SEO export at line 20:

```ts
export { readSeoFields, resolveImageUrl } from './seo-fields.js';
export type { SeoFields } from './seo-fields.js';
```

In `src/lib/index.ts`, add after the SEO export at line 136:

```ts
export { readSeoFields, resolveImageUrl } from './delivery/seo-fields.js';
export type { SeoFields } from './delivery/seo-fields.js';
```

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/delivery/seo-fields.ts src/tests/unit/delivery-seo-fields.test.ts src/lib/delivery/index.ts src/lib/index.ts
git commit -m "feat(delivery): add the SEO fields reader and image resolver

readSeoFields reads the known head fields (description, image, robots, author)
off an entry's normalized frontmatter at the cross-concept boundary, keeping a
non-empty string and omitting anything absent, empty, or non-string.
resolveImageUrl turns an author-supplied path absolute against the origin: an
absolute or protocol-relative URL passes through, a relative path anchors to
the origin, and a malformed string returns undefined rather than throwing at
build. Both are pure and exported from the delivery and root entries.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Wire the reader into entryLoad with the default-image fallback

**Files:**
- Modify: `src/lib/sveltekit/public-routes.ts`
- Modify: `src/tests/unit/public-routes-seo.test.ts`

`entryLoad` calls `readSeoFields` once, applies the fallback chains (all policy lives here), resolves the image, and passes `image`/`robots`/`author` to `buildSeoMeta`. `PublicRoutesDeps` gains an optional `defaultImage` used when an entry declares no image.

- [ ] **Step 1: Add the failing tests**

The existing fixture uses an empty schema (`defineFields([])`), so no SEO field survives the normalized read. Replace the whole `src/tests/unit/public-routes-seo.test.ts` with a fixture that declares the SEO fields, keeps the existing assertion, and adds the new ones:

```ts
import { describe, it, expect } from 'vitest';
import { createPublicRoutes } from '../../lib/sveltekit/public-routes.js';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { createSiteIndex } from '../../lib/delivery/site-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { defineFields } from '../../lib/content/schema.js';

const [posts] = normalizeConcepts({
  posts: {
    dir: 'src/content/posts',
    schema: defineFields([
      { type: 'text', name: 'title', label: 'Title', required: true },
      { type: 'date', name: 'date', label: 'Date' },
      { type: 'textarea', name: 'description', label: 'Description' },
      { type: 'text', name: 'image', label: 'Social image' },
      { type: 'text', name: 'robots', label: 'Robots' },
      { type: 'text', name: 'author', label: 'Author' },
    ]),
  },
});
const [pages] = normalizeConcepts({
  pages: {
    dir: 'src/content/pages',
    schema: defineFields([
      { type: 'text', name: 'title', label: 'Title', required: true },
      { type: 'text', name: 'robots', label: 'Robots' },
    ]),
  },
});

const index = createContentIndex(
  fromGlob({
    '/src/content/posts/2026-05-14-welcome.md':
      '---\ntitle: Welcome\ndate: 2026-05-14\ndescription: Hello world\nimage: /og/welcome.png\nauthor: Ada\n---\nBody.',
    '/src/content/posts/2026-05-20-plain.md': '---\ntitle: Plain\ndate: 2026-05-20\n---\nBody.',
  }),
  posts,
);
const pageIndex = createContentIndex(
  fromGlob({ '/src/content/pages/secret.md': '---\ntitle: Secret\nrobots: noindex\n---\nHidden.' }),
  pages,
);
const site = createSiteIndex([
  { descriptor: posts, index },
  { descriptor: pages, index: pageIndex },
]);

const routes = createPublicRoutes({
  site,
  render: (md) => `<p>${md}</p>`,
  origin: 'https://x.test',
  siteName: 'X Site',
  description: 'Site default description.',
  defaultImage: '/og/default.png',
  feeds: { rss: 'https://x.test/feed.xml', json: 'https://x.test/feed.json' },
});

describe('entryLoad SEO', () => {
  it('builds a seo head with canonical, og:title, and the article type for a dated entry', async () => {
    const data = await routes.entryLoad({ url: new URL('https://x.test/2026/05/14/welcome') });
    expect(data.seo.title).toBe('Welcome');
    expect(data.seo.links).toContainEqual({ rel: 'canonical', href: data.canonicalUrl });
    expect(data.seo.meta).toContainEqual({ property: 'og:title', content: 'Welcome' });
    expect(data.seo.meta).toContainEqual({ property: 'og:type', content: 'article' });
    expect(data.seo.meta).toContainEqual({ property: 'article:published_time', content: '2026-05-14' });
  });

  it('reads a per-entry image (resolved absolute) and author into the head', async () => {
    const data = await routes.entryLoad({ url: new URL('https://x.test/2026/05/14/welcome') });
    expect(data.seo.meta).toContainEqual({ property: 'og:image', content: 'https://x.test/og/welcome.png' });
    expect(data.seo.meta).toContainEqual({ property: 'article:author', content: 'Ada' });
    expect(data.seo.meta).toContainEqual({ name: 'description', content: 'Hello world' });
  });

  it('falls back to the site default image when an entry declares none', async () => {
    const data = await routes.entryLoad({ url: new URL('https://x.test/2026/05/20/plain') });
    expect(data.seo.meta).toContainEqual({ property: 'og:image', content: 'https://x.test/og/default.png' });
  });

  it('reads a per-entry robots directive into the head', async () => {
    const data = await routes.entryLoad({ url: new URL('https://x.test/secret') });
    expect(data.seo.meta).toContainEqual({ name: 'robots', content: 'noindex' });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/public-routes-seo.test.ts`
Expected: FAIL. `defaultImage` is not on `PublicRoutesDeps` (a type error the check catches), and `entryLoad` does not yet read image/robots/author, so the new `og:image`/`article:author`/`robots` assertions fail.

- [ ] **Step 3: Add the `defaultImage` dependency**

In `src/lib/sveltekit/public-routes.ts`, add to `PublicRoutesDeps` after the `feeds` field (after line 22):

```ts
  /** A site-wide default OG image, used when an entry declares none. Resolved to absolute like the
   *  canonical URL, so a relative path such as "/og/default.png" works. */
  defaultImage?: string;
```

- [ ] **Step 4: Read the SEO fields in entryLoad**

In `src/lib/sveltekit/public-routes.ts`, add the import at the top, beside the existing `buildSeoMeta` import (after line 10):

```ts
import { readSeoFields, resolveImageUrl } from '../delivery/seo-fields.js';
```

Destructure `defaultImage` in the factory body. Change line 52 from:

```ts
  const { site, render, origin, siteName, description, feeds } = deps;
```

to:

```ts
  const { site, render, origin, siteName, description, feeds, defaultImage } = deps;
```

Replace the `entryLoad` body (lines 62-79) with the reader-driven form:

```ts
  async function entryLoad(event: { url: URL }): Promise<EntryData> {
    const entry = site.byPermalink(event.url.pathname);
    if (!entry) throw error(404, `Not found: ${event.url.pathname}`);
    const { newer, older } = site.adjacent(entry);
    const canonicalUrl = origin + entry.permalink;
    const fields = readSeoFields(entry.frontmatter);
    const rawImage = fields.image ?? defaultImage;
    const image = rawImage ? resolveImageUrl(rawImage, origin) : undefined;
    // A dated entry is an article; an undated one (a page) is a website.
    const seo = buildSeoMeta({
      title: entry.title,
      description: fields.description || entry.excerpt || description,
      canonicalUrl,
      siteName,
      type: entry.date ? 'article' : 'website',
      ...(entry.date ? { published: entry.date } : {}),
      ...(entry.updated ? { modified: entry.updated } : {}),
      ...(image ? { image } : {}),
      ...(fields.robots ? { robots: fields.robots } : {}),
      ...(fields.author ? { author: fields.author } : {}),
      feeds,
    });
    return { entry, html: await render(entry.body, { stagger: true }), canonicalUrl, seo, newer, older };
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/public-routes-seo.test.ts`
Expected: PASS, all four tests green.

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0). The `public-routes.test.ts` fixture uses an empty schema and asserts no SEO fields, so it stays green. Then:

```bash
git add src/lib/sveltekit/public-routes.ts src/tests/unit/public-routes-seo.test.ts
git commit -m "feat(delivery): read per-entry image, robots, and author into the head

entryLoad reads the SEO head fields off the entry's normalized frontmatter
through readSeoFields, applies the description and default-image fallback
chains, resolves a relative image to absolute against the origin, and passes
image, robots, and author to the head builder. PublicRoutesDeps gains an
optional defaultImage, the one site-wide OG image used when an entry declares
none. The reader replaces the ad-hoc description cast.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Declare the SEO fields and entry values in the showcase

**Files:**
- Modify: `examples/showcase/src/lib/cairn.config.ts`
- Modify: `examples/showcase/src/content/posts/2026-01-15-hello.md`
- Modify: `examples/showcase/src/content/pages/about.md`
- Modify: `examples/showcase/src/routes/[...path]/+page.server.ts`

The showcase declares `image`, `robots`, and `author` as optional schema fields, sets values on one post and one page, and passes a `defaultImage`. A field must be declared in the schema to survive the normalized read, which is the rule each site migration follows.

- [ ] **Step 1: Declare the SEO fields in the showcase schema**

In `examples/showcase/src/lib/cairn.config.ts`, change the `posts` schema (the `defineFields` for posts) to add `image` and `author`:

```ts
      schema: defineFields([
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
        // The post files carry a description the SEO head reads; declare it so it survives the
        // validate-once read. Every frontmatter key a site reads must be in its schema.
        { type: 'textarea', name: 'description', label: 'Description' },
        { type: 'text', name: 'image', label: 'Social image' },
        { type: 'text', name: 'author', label: 'Author' },
      ]),
```

Change the `pages` schema to add `robots`:

```ts
      schema: defineFields([
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'text', name: 'robots', label: 'Robots' },
      ]),
```

- [ ] **Step 2: Set an image and author on the hello post**

Replace the frontmatter of `examples/showcase/src/content/posts/2026-01-15-hello.md` (keep the body) so it reads:

```md
---
title: Hello, cairn
date: 2026-01-15
description: The first showcase post.
image: /og/hello.png
author: Showcase Author
---
This is the first post in the cairn showcase.
```

- [ ] **Step 3: Set a robots directive on the about page**

Replace the frontmatter of `examples/showcase/src/content/pages/about.md` (keep the body) so it reads:

```md
---
title: About
robots: noindex
---
The cairn showcase is a minimal site proving the engine surfaces.
```

- [ ] **Step 4: Pass the default image in the route deps**

In `examples/showcase/src/routes/[...path]/+page.server.ts`, add `defaultImage` to the `createPublicRoutes` call (after the `description` line, line 13):

```ts
const routes = createPublicRoutes({
  site,
  render: cairn.render,
  origin: ORIGIN,
  siteName: cairn.siteName,
  description: SITE_DESCRIPTION,
  defaultImage: ORIGIN + '/og/default.png',
  feeds: { rss: ORIGIN + '/feed.xml', json: ORIGIN + '/feed.json' },
});
```

- [ ] **Step 5: Gate and commit**

This task changes only the showcase and adds no engine test, so the gate is `npm run check` (0/0; the showcase config import caveat may apply, in which case the 0/0 scan is the gate) and `npm test` (exit 0). The showcase production prerender is Task 4's gate. Commit:

```bash
git add examples/showcase/src/lib/cairn.config.ts examples/showcase/src/content/posts/2026-01-15-hello.md examples/showcase/src/content/pages/about.md "examples/showcase/src/routes/[...path]/+page.server.ts"
git commit -m "feat(showcase): declare and set the per-entry SEO head fields

The showcase posts schema declares image and author, the pages schema declares
robots, the hello post sets an image and author, the about page sets robots
noindex, and the catch-all route passes a site-wide defaultImage. This is the
reference wiring each site migration copies: every frontmatter key a site reads
is declared in its schema.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Prove the head end to end in the showcase prerender and bump the version

**Files:**
- Modify: `package.json`

The showcase production prerender is the end-to-end gate: a post's own absolute `og:image`, the default `og:image` on a post without one, the `robots` meta on the about page, and `article:author` on the hello post. The additive surface bumps the version to `0.14.0`.

- [ ] **Step 1: Build the showcase and confirm the head tags**

Run:

```bash
cd examples/showcase && npm install && npm run build
```

Expected: the build exits 0 and prerenders without error. Confirm the four head tags in the prerendered HTML:

```bash
grep -o 'property="og:image" content="[^"]*"' build/prerendered/posts/hello.html
grep -o 'property="article:author" content="[^"]*"' build/prerendered/posts/hello.html
grep -o 'property="og:image" content="[^"]*"' build/prerendered/posts/second.html
grep -o 'name="robots" content="[^"]*"' build/prerendered/about.html
```

Expected output, in order:
- `property="og:image" content="https://showcase.test/og/hello.png"`
- `property="article:author" content="Showcase Author"`
- `property="og:image" content="https://showcase.test/og/default.png"`
- `name="robots" content="noindex"`

The exact attribute order inside a tag can vary by Svelte version, so match on the property/name and the content value together. If the `og:` attributes render as `content="..." property="..."`, adjust the grep order; the content value is the assertion. Then return to the repo root: `cd ../..`.

- [ ] **Step 2: Bump the version**

In `package.json`, change `"version": "0.13.0"` to `"version": "0.14.0"`.

- [ ] **Step 3: Validate the package shape**

Run: `npm run check:package`
Expected: green. No export-condition change; `readSeoFields`/`resolveImageUrl`/`SeoFields` ride the existing main and delivery entries.

- [ ] **Step 4: Full gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add package.json
git commit -m "feat(delivery): per-entry SEO head consumer, bump to 0.14.0

The showcase production prerender proves the head end to end: a post's own
absolute og:image, the site default og:image on a post without one, the robots
meta on a noindex page, and article:author on a post. The additive surface (the
optional defaultImage dep and the new reader exports) bumps the minor to 0.14.0,
rolling on the unpublished window over 0.13.0.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage.** The plan implements every section of the spec. The reader and resolver (`readSeoFields`, `resolveImageUrl`) are Task 1; the `entryLoad` wiring with the description and default-image fallback chains and the `defaultImage` dependency are Task 2; the showcase schema fields, entry values, and `defaultImage` dep are Task 3; the prerender end-to-end gate and the version bump are Task 4. The one `expectTypeOf` "ties the bow" assertion (a declared SEO field reaches the inferred type) is in Task 1's test file. The site-default decision (image only) is realized by the single `defaultImage` dep, with `robots` and `author` strictly per-entry.
- **The boundary read.** The catch-all is cross-concept, so `entryLoad` reads by name off the normalized `.frontmatter` through `readSeoFields`. A field must be declared in the schema to survive the validate-once read, which is why the tests and the showcase declare the SEO fields. This is the same lesson Plan 2 recorded for the site migrations.
- **No behavior regression for description.** `entryLoad`'s description becomes `fields.description || entry.excerpt || description`. `readSeoFields` omits an empty string, so an empty description falls to the excerpt exactly as the old `'' || excerpt` did. The existing first assertion in `public-routes-seo.test.ts` still holds.
- **Type consistency.** `SeoFields` is `{ description?, image?, robots?, author? }`. `readSeoFields(frontmatter: Record<string, unknown>): SeoFields`. `resolveImageUrl(image: string, origin: string): string | undefined`. `PublicRoutesDeps` gains `defaultImage?: string`. `buildSeoMeta`, `SeoInput`, and `SeoMeta` are unchanged; the head tags asserted (`og:image`, `twitter:image`, `robots`, `article:author`) are the ones it already emits.
- **Ordering and green builds.** Task 1 is additive and self-contained. Task 2 depends on Task 1's exports and is green on its own. Task 3 changes only the showcase and stays green against the engine. Task 4 is the prerender proof plus the version bump. Each task ends with the full gate (`npm run check` 0/0, `npm test` exit 0), and Task 4 adds the showcase production build as the end-to-end proof.
- **Out of scope, as the spec says.** A site-default author or robots, OG-image generation, external redirects, and the feed and excerpt robustness guards are all deferred. None is touched here.
```
