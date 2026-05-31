# Dated-slug identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give dated content concepts a split id/slug identity with a per-concept date-prefix granularity, move URL policy into the YAML site-config, and unify public delivery behind a site-level `byPermalink` resolver one catch-all route serves.

**Architecture:** The id stays the filename stem. A new `slug` is the id with its leading date prefix stripped, at a granularity (`year`/`month`/`day`) the YAML config sets per concept. `permalink()` writes the slug into `:slug`, and a new site-level index unions every concept's per-concept index into one `byPermalink` map so a single `[...path]` route resolves any URL. Admin create composes a dated filename from the date and the granularity.

**Tech Stack:** TypeScript (NodeNext, `.js` import specifiers), Svelte 5 runes, Vitest (the `unit` project for pure logic, the `component` project for the create form), the `yaml` package for the site-config.

**Source of truth:** `docs/superpowers/specs/2026-05-31-cairn-dated-slug-design.md`.

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `src/lib/content/ids.ts` | id helpers | Add `DatePrefix`, `slugFromId`, `composeDatedId` |
| `src/lib/content/types.ts` | adapter and engine types | Add `DatePrefix`, `ConceptUrlPolicy`; add `datePrefix` to `ConceptDescriptor`; drop `permalink` from `ConceptConfig` |
| `src/lib/content/concepts.ts` | concept normalization | `normalizeConcepts` takes URL policy, resolves `permalink` and `datePrefix` |
| `src/lib/content/compose.ts` | runtime aggregation | `composeRuntime` threads URL policy into normalization |
| `src/lib/nav/site-config.ts` | YAML site-config | Add `content` URL-policy section to `SiteConfig`; add `urlPolicyFrom` |
| `src/lib/content/permalink.ts` | the one URL resolver | `:slug` resolves the derived slug, not the id |
| `src/lib/delivery/content-index.ts` | per-concept index | Compute `slug`, expose it on summaries, pass it to `permalink()` |
| `src/lib/delivery/site-index.ts` | site-level resolver (new) | Union per-concept indexes; `byPermalink`, `entries`, `concept`, `all`; collision throw |
| `src/lib/sveltekit/public-routes.ts` | public loaders | Site-level `entryLoad`/`entries`; per-concept archive/tag loaders keyed by concept |
| `src/lib/sveltekit/content-routes.ts` | admin loaders | `createAction` composes the dated filename and seeds the date |
| `src/lib/components/ConceptList.svelte` | create form | Date defaults to today; date-free slug placeholder |
| `src/lib/index.ts`, `src/lib/sveltekit/index.ts` | barrels | Export the new surface |

The per-concept `createContentIndex` stays the building block. The site-level index aggregates it. The 0.7.0 per-concept `createPublicRoutes` shape is replaced; only tests consume it.

---

### Task 1: Slug derivation and dated-id composition

**Files:**
- Modify: `src/lib/content/ids.ts`
- Test: `src/tests/unit/content-ids.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/tests/unit/content-ids.test.ts`:

```ts
import { slugFromId, composeDatedId } from '../../lib/content/ids.js';

describe('slugFromId', () => {
  it('strips a full-date prefix for a day concept', () => {
    expect(slugFromId('2026-05-31-snowball-race-report', 'day')).toBe('snowball-race-report');
  });
  it('strips a year-month prefix for a month concept', () => {
    expect(slugFromId('2026-05-welcome', 'month')).toBe('welcome');
  });
  it('strips a year prefix for a year concept', () => {
    expect(slugFromId('2026-recap', 'year')).toBe('recap');
  });
  it('leaves an id with no prefix unchanged', () => {
    expect(slugFromId('about-us', 'day')).toBe('about-us');
  });
  it('returns the id verbatim when the concept is not dated (null)', () => {
    expect(slugFromId('2026-05-31-x', null)).toBe('2026-05-31-x');
  });
  it('strips only the leading prefix, keeping a year-like tail in the slug', () => {
    expect(slugFromId('2026-05-31-2024-recap', 'day')).toBe('2024-recap');
  });
});

describe('composeDatedId', () => {
  it('prepends a full date for a day concept', () => {
    expect(composeDatedId('2026-06-15', 'summer', 'day')).toBe('2026-06-15-summer');
  });
  it('prepends a year-month for a month concept', () => {
    expect(composeDatedId('2026-06-15', 'summer-camp', 'month')).toBe('2026-06-summer-camp');
  });
  it('prepends a year for a year concept', () => {
    expect(composeDatedId('2026-06-15', 'recap', 'year')).toBe('2026-recap');
  });
  it('throws on a malformed date', () => {
    expect(() => composeDatedId('nope', 'x', 'day')).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project unit src/tests/unit/content-ids.test.ts`
Expected: FAIL, `slugFromId is not a function`.

- [ ] **Step 3: Implement**

Append to `src/lib/content/ids.ts`:

```ts
/** Filename date-prefix granularity for a dated concept: the leading `YYYY[-MM[-DD]]-` on the stem. */
export type DatePrefix = 'year' | 'month' | 'day';

/** The leading date-prefix shape for each granularity. */
const DATE_PREFIX_RE: Record<DatePrefix, RegExp> = {
  year: /^\d{4}-/,
  month: /^\d{4}-\d{2}-/,
  day: /^\d{4}-\d{2}-\d{2}-/,
};

/**
 * The URL slug for an id. A dated concept passes its `datePrefix` and the leading date prefix is
 * stripped when present; a non-dated concept passes `null` and the id is returned verbatim. Only
 * the leading prefix is removed, so a year-like tail (a post titled "2024 Recap") stays in the slug.
 */
export function slugFromId(id: string, datePrefix: DatePrefix | null): string {
  if (!datePrefix) return id;
  const re = DATE_PREFIX_RE[datePrefix];
  return re.test(id) ? id.replace(re, '') : id;
}

/**
 * Compose a dated entry's id from a `YYYY-MM-DD` date, a date-free slug, and the concept's
 * granularity: the date truncated to the granularity, a hyphen, then the slug. Throws on a
 * malformed date so a bad create fails before touching git.
 */
export function composeDatedId(date: string, slug: string, datePrefix: DatePrefix): string {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) throw new Error(`composeDatedId: malformed date "${date}"`);
  const prefix = datePrefix === 'year' ? m[1] : datePrefix === 'month' ? `${m[1]}-${m[2]}` : `${m[1]}-${m[2]}-${m[3]}`;
  return `${prefix}-${slug}`;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project unit src/tests/unit/content-ids.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/ids.ts src/tests/unit/content-ids.test.ts
git commit -m "Add slug derivation and dated-id composition"
```

---

### Task 2: Types for date-prefix granularity and URL policy

**Files:**
- Modify: `src/lib/content/types.ts`
- Test: `src/tests/unit/content-concepts.test.ts` (compile-time; the runtime assertions land in Task 3)

This task is type-only. It defines the contract the later tasks fill. There is no isolated test; `npm run check` is the gate.

- [ ] **Step 1: Add the URL-policy types and the descriptor field**

In `src/lib/content/types.ts`, add `import type { DatePrefix } from './ids.js';` at the top of the imports, then add near `ConceptConfig`:

```ts
/**
 * A concept's URL policy, set per concept in the YAML site-config (not the adapter). `permalink` is
 * a `/`-prefixed pattern of literal segments and the tokens `:slug`, `:year`, `:month`, `:day`.
 * `datePrefix` is the filename date-prefix granularity for a dated concept. Both default in
 * `normalizeConcepts` when omitted.
 */
export interface ConceptUrlPolicy {
  permalink?: string;
  datePrefix?: DatePrefix;
}
```

- [ ] **Step 2: Drop `permalink` from `ConceptConfig`**

Delete the `permalink?` member and its doc comment from `ConceptConfig` (the block at lines ~87-93). URL policy now lives in the YAML, so the adapter no longer carries it.

- [ ] **Step 3: Add `datePrefix` to `ConceptDescriptor`**

In `ConceptDescriptor`, after the `permalink: string;` member, add:

```ts
  /** Filename date-prefix granularity for a dated concept; resolved by `normalizeConcepts`. */
  datePrefix: DatePrefix;
```

Re-export `DatePrefix` and `ConceptUrlPolicy` from the type surface as needed (the barrel update is Task 12).

- [ ] **Step 4: Verify it type-checks against the consumers it breaks**

Run: `npm run check 2>&1 | head -40`
Expected: errors only in the files Tasks 3-7 modify (`concepts.ts` missing `datePrefix`, `permalink.ts` and `content-index.ts` signatures, any fixture setting `permalink:` in a `ConceptConfig`). This confirms the type change reached its call sites. Do not fix them here.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/types.ts
git commit -m "Add URL-policy types; move permalink off the adapter concept config"
```

---

### Task 3: normalizeConcepts resolves URL policy and datePrefix

**Files:**
- Modify: `src/lib/content/concepts.ts`
- Test: `src/tests/unit/content-concepts.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the permalink-related assertions in `src/tests/unit/content-concepts.test.ts` (any that pass `permalink` inside a `ConceptConfig`) and add:

```ts
import { normalizeConcepts } from '../../lib/content/concepts.js';

const cfg = { dir: 'd', fields: [], validate: () => ({ ok: true as const, data: {} }) };

describe('normalizeConcepts URL policy', () => {
  it('defaults permalink and datePrefix when no policy is given', () => {
    const [posts] = normalizeConcepts({ posts: cfg });
    expect(posts.permalink).toBe('/posts/:slug');
    expect(posts.datePrefix).toBe('day');
  });

  it('defaults pages to a root permalink', () => {
    const [pages] = normalizeConcepts({ pages: cfg });
    expect(pages.permalink).toBe('/:slug');
  });

  it('takes permalink and datePrefix from the URL policy', () => {
    const [posts] = normalizeConcepts(
      { posts: cfg },
      { posts: { permalink: '/:year/:month/:slug', datePrefix: 'month' } },
    );
    expect(posts.permalink).toBe('/:year/:month/:slug');
    expect(posts.datePrefix).toBe('month');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project unit src/tests/unit/content-concepts.test.ts`
Expected: FAIL (`datePrefix` undefined; or arity error on the second `normalizeConcepts` arg).

- [ ] **Step 3: Implement**

In `src/lib/content/concepts.ts`, add the import `import type { ConceptConfig, ConceptDescriptor, ConceptUrlPolicy, RoutingRule } from './types.js';` and change `normalizeConcepts`:

```ts
/**
 * Normalize an adapter's declared concepts into uniform descriptors (seam 1). URL policy
 * (`permalink`, `datePrefix`) comes from the YAML site-config, passed here as `urlPolicy` keyed by
 * concept id; each value defaults when the YAML omits it (`/:slug` for Pages, `/<id>/:slug`
 * otherwise; `datePrefix` defaults to `day`). `routing` is injectable so a contract test can prove
 * a new concept attaches additively; production passes the default `CONCEPT_ROUTING`.
 */
export function normalizeConcepts(
  content: Record<string, ConceptConfig | undefined>,
  urlPolicy: Record<string, ConceptUrlPolicy | undefined> = {},
  routing: Readonly<Record<string, RoutingRule>> = CONCEPT_ROUTING,
): ConceptDescriptor[] {
  const descriptors: ConceptDescriptor[] = [];
  for (const [id, config] of Object.entries(content)) {
    if (!config) continue;
    const policy = urlPolicy[id] ?? {};
    descriptors.push({
      id,
      label: config.label ?? defaultLabel(id),
      dir: config.dir,
      routing: routing[id] ?? DEFAULT_ROUTING,
      permalink: policy.permalink ?? defaultPermalink(id),
      datePrefix: policy.datePrefix ?? 'day',
      fields: config.fields,
      validate: config.validate,
    });
  }
  return descriptors;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project unit src/tests/unit/content-concepts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/concepts.ts src/tests/unit/content-concepts.test.ts
git commit -m "Resolve permalink and datePrefix from URL policy in normalizeConcepts"
```

---

### Task 4: composeRuntime threads URL policy

**Files:**
- Modify: `src/lib/content/compose.ts`
- Test: `src/tests/unit/content-compose.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/tests/unit/content-compose.test.ts` (create the file if absent, importing the existing adapter fixture pattern):

```ts
import { describe, it, expect } from 'vitest';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter } from '../../lib/content/types.js';

const adapter: CairnAdapter = {
  siteName: 'T',
  content: { posts: { dir: 'd', fields: [], validate: () => ({ ok: true, data: {} }) } },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'a@b.c' },
  render: (md) => md,
};

describe('composeRuntime URL policy', () => {
  it('applies the URL policy to the concept descriptors', () => {
    const runtime = composeRuntime(adapter, [], { posts: { permalink: '/:year/:slug', datePrefix: 'year' } });
    const posts = runtime.concepts.find((c) => c.id === 'posts')!;
    expect(posts.permalink).toBe('/:year/:slug');
    expect(posts.datePrefix).toBe('year');
  });

  it('defaults when no policy is passed', () => {
    const posts = composeRuntime(adapter).concepts.find((c) => c.id === 'posts')!;
    expect(posts.permalink).toBe('/posts/:slug');
    expect(posts.datePrefix).toBe('day');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project unit src/tests/unit/content-compose.test.ts`
Expected: FAIL (arity error on the third arg).

- [ ] **Step 3: Implement**

In `src/lib/content/compose.ts`, add `ConceptUrlPolicy` to the type import and change the signature and the `normalizeConcepts` call:

```ts
export function composeRuntime(
  adapter: CairnAdapter,
  extensions: CairnExtension[] = [],
  urlPolicy: Record<string, ConceptUrlPolicy | undefined> = {},
): CairnRuntime {
```

and

```ts
    concepts: normalizeConcepts(content, urlPolicy),
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project unit src/tests/unit/content-compose.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/compose.ts src/tests/unit/content-compose.test.ts
git commit -m "Thread URL policy through composeRuntime"
```

---

### Task 5: SiteConfig carries the content URL policy

**Files:**
- Modify: `src/lib/nav/site-config.ts`
- Test: `src/tests/unit/nav-site-config.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/tests/unit/nav-site-config.test.ts`:

```ts
import { parseSiteConfig, urlPolicyFrom } from '../../lib/nav/site-config.js';

describe('urlPolicyFrom', () => {
  it('reads a per-concept content section', () => {
    const cfg = parseSiteConfig('siteName: T\ncontent:\n  posts:\n    permalink: /:year/:month/:slug\n    datePrefix: month\n');
    expect(urlPolicyFrom(cfg)).toEqual({ posts: { permalink: '/:year/:month/:slug', datePrefix: 'month' } });
  });

  it('returns an empty policy when content is absent', () => {
    expect(urlPolicyFrom(parseSiteConfig('siteName: T\n'))).toEqual({});
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project unit src/tests/unit/nav-site-config.test.ts`
Expected: FAIL (`urlPolicyFrom is not a function`).

- [ ] **Step 3: Implement**

In `src/lib/nav/site-config.ts`, add `import type { ConceptUrlPolicy } from '../content/types.js';`, add the field to `SiteConfig` after `menus`:

```ts
  /** Per-concept URL policy: the permalink pattern and date-prefix granularity, keyed by concept id. */
  content?: Record<string, ConceptUrlPolicy>;
```

and add the extractor:

```ts
/** The per-concept URL policy from a parsed config, or an empty policy when the `content` key is absent. */
export function urlPolicyFrom(config: SiteConfig): Record<string, ConceptUrlPolicy> {
  return config.content ?? {};
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project unit src/tests/unit/nav-site-config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav/site-config.ts src/tests/unit/nav-site-config.test.ts
git commit -m "Carry per-concept URL policy in the YAML site-config"
```

---

### Task 6: permalink() resolves the derived slug

**Files:**
- Modify: `src/lib/content/permalink.ts`
- Test: `src/tests/unit/content-permalink.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the body of `src/tests/unit/content-permalink.test.ts` so each call passes a `slug` distinct from the `id`:

```ts
import { describe, it, expect } from 'vitest';
import { permalink } from '../../lib/content/permalink.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';

const base: Omit<ConceptDescriptor, 'permalink'> = {
  id: 'posts', label: 'Posts', dir: 'd', datePrefix: 'day',
  routing: { routable: true, dated: true, inFeeds: true },
  fields: [], validate: () => ({ ok: true, data: {} }),
};
const desc = (permalink: string): ConceptDescriptor => ({ ...base, permalink });

describe('permalink', () => {
  it('resolves :slug to the derived slug, not the id', () => {
    const url = permalink(desc('/:year/:month/:day/:slug'), {
      id: '2026-05-31-snowball', slug: 'snowball', date: '2026-05-31',
    });
    expect(url).toBe('/2026/05/31/snowball');
  });

  it('resolves a flat pattern to the slug', () => {
    expect(permalink(desc('/:slug'), { id: 'about', slug: 'about' })).toBe('/about');
  });

  it('throws when a date token has no date', () => {
    expect(() => permalink(desc('/:year/:slug'), { id: 'x', slug: 'x' })).toThrow();
  });

  it('throws on an unknown token', () => {
    expect(() => permalink(desc('/:nope'), { id: 'x', slug: 'x' })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project unit src/tests/unit/content-permalink.test.ts`
Expected: FAIL (`:slug` still returns the id).

- [ ] **Step 3: Implement**

In `src/lib/content/permalink.ts`, change the signature and the `:slug` arm:

```ts
export function permalink(
  descriptor: ConceptDescriptor,
  entry: { id: string; slug: string; date?: string },
): string {
  return descriptor.permalink.replace(/:(\w+)/g, (_match, token: string) => {
    if (token === 'slug') return entry.slug;
    if (token === 'year' || token === 'month' || token === 'day') {
```

Leave the date-token and unknown-token arms unchanged; the error messages already reference `entry.id`, which is still in the arg.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project unit src/tests/unit/content-permalink.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/permalink.ts src/tests/unit/content-permalink.test.ts
git commit -m "Resolve :slug to the derived slug in permalink()"
```

---

### Task 7: content-index computes and exposes the slug

**Files:**
- Modify: `src/lib/delivery/content-index.ts`
- Test: `src/tests/unit/delivery-content-index.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/tests/unit/delivery-content-index.test.ts`:

```ts
import { normalizeConcepts } from '../../lib/content/concepts.js';

describe('content index slug', () => {
  it('derives a date-stripped slug and a non-doubled permalink for a dated concept', () => {
    const [posts] = normalizeConcepts(
      { posts: { dir: 'd', fields: [], validate: () => ({ ok: true as const, data: {} }) } },
      { posts: { permalink: '/:year/:month/:day/:slug', datePrefix: 'day' } },
    );
    const index = createContentIndex(
      [{ path: '/d/2026-05-31-snowball.md', raw: '---\ntitle: S\ndate: 2026-05-31\n---\n\nBody.' }],
      posts,
    );
    const entry = index.all()[0];
    expect(entry.slug).toBe('snowball');
    expect(entry.permalink).toBe('/2026/05/31/snowball');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project unit src/tests/unit/delivery-content-index.test.ts`
Expected: FAIL (`slug` undefined; permalink doubles the date).

- [ ] **Step 3: Implement**

In `src/lib/delivery/content-index.ts`:

Add `slug: string;` to `ContentSummary` (after `id`). Add the import `import { idFromFilename, slugFromId } from '../content/ids.js';` (replace the existing `idFromFilename` import line). Then inside the `files.map` callback, compute the slug and pass it to `permalink`:

```ts
  const entries: ContentEntry[] = files.map((file) => {
    const id = idFromFilename(basename(file.path));
    const slug = slugFromId(id, descriptor.routing.dated ? descriptor.datePrefix : null);
    const { frontmatter, body } = parseMarkdown(file.raw);
    const date = asDate(frontmatter.date);
    return {
      id,
      slug,
      permalink: permalink(descriptor, { id, slug, date }),
      title: asString(frontmatter.title) ?? id,
```

(the rest of the object is unchanged).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project unit src/tests/unit/delivery-content-index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/delivery/content-index.ts src/tests/unit/delivery-content-index.test.ts
git commit -m "Compute and expose the date-stripped slug on the content index"
```

---

### Task 8: The site-level index

**Files:**
- Create: `src/lib/delivery/site-index.ts`
- Test: `src/tests/unit/delivery-site-index.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/unit/delivery-site-index.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createSiteIndex } from '../../lib/delivery/site-index.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';

const [posts] = normalizeConcepts(
  { posts: { dir: 'p', fields: [], validate: () => ({ ok: true as const, data: {} }) } },
  { posts: { permalink: '/:year/:month/:day/:slug', datePrefix: 'day' } },
);
const [pages] = normalizeConcepts({ pages: { dir: 'g', fields: [], validate: () => ({ ok: true as const, data: {} }) } });

function site() {
  return createSiteIndex([
    { descriptor: posts, index: createContentIndex([{ path: '/p/2026-05-31-snowball.md', raw: '---\ntitle: S\ndate: 2026-05-31\n---\n\nPost body.' }], posts) },
    { descriptor: pages, index: createContentIndex([{ path: '/g/about.md', raw: '---\ntitle: About\n---\n\nPage body.' }], pages) },
  ]);
}

describe('createSiteIndex', () => {
  it('resolves a dated Posts URL and a flat Pages URL through one byPermalink', () => {
    const s = site();
    expect(s.byPermalink('/2026/05/31/snowball')?.body).toBe('Post body.');
    expect(s.byPermalink('/about')?.body).toBe('Page body.');
  });

  it('normalizes a trailing slash', () => {
    expect(site().byPermalink('/about/')?.id).toBe('about');
  });

  it('returns undefined for an unmatched path', () => {
    expect(site().byPermalink('/nope')).toBeUndefined();
  });

  it('enumerates every entry path across concepts for prerender, without a leading slash', () => {
    expect(site().entries().map((e) => e.path).sort()).toEqual(['2026/05/31/snowball', 'about']);
  });

  it('exposes a concept index for per-concept loaders', () => {
    expect(site().concept('posts')?.all()[0].id).toBe('2026-05-31-snowball');
  });

  it('returns adjacency within the entry own concept', () => {
    const s = site();
    const about = s.byPermalink('/about')!;
    expect(s.adjacent(about)).toEqual({});
  });

  it('throws on a permalink collision across concepts, naming both ids', () => {
    const [p2] = normalizeConcepts(
      { pages: { dir: 'g', fields: [], validate: () => ({ ok: true as const, data: {} }) } },
      { pages: { permalink: '/dup' } },
    );
    const [q2] = normalizeConcepts(
      { posts: { dir: 'p', fields: [], validate: () => ({ ok: true as const, data: {} }) } },
      { posts: { permalink: '/dup' } },
    );
    expect(() =>
      createSiteIndex([
        { descriptor: p2, index: createContentIndex([{ path: '/g/a.md', raw: '---\ntitle: A\n---\n' }], p2) },
        { descriptor: q2, index: createContentIndex([{ path: '/p/b.md', raw: '---\ntitle: B\ndate: 2026-01-01\n---\n' }], q2) },
      ]),
    ).toThrow(/dup/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project unit src/tests/unit/delivery-site-index.test.ts`
Expected: FAIL (`createSiteIndex is not a function`).

- [ ] **Step 3: Implement**

Create `src/lib/delivery/site-index.ts`:

```ts
// cairn-cms: the site-level content index (dated-slug design). It unions every concept's
// per-concept index into one cross-concept resolver: a single byPermalink map a catch-all route
// matches a request path against, one entries() list the prerenderer walks, and the per-concept
// indexes for concept-scoped archive, tag, and feed loaders. A duplicate permalink throws at build.
import type { ConceptDescriptor } from '../content/types.js';
import type { ContentEntry, ContentIndex, ContentSummary } from './content-index.js';

/** One concept's descriptor paired with its built index. */
export interface ConceptIndex {
  descriptor: ConceptDescriptor;
  index: ContentIndex;
}

/** The cross-concept query surface a catch-all route and the sitemap read. */
export interface SiteIndex {
  /** Resolve a request path (with or without a trailing slash) to its entry, or undefined. */
  byPermalink(path: string): ContentEntry | undefined;
  /** Newer/older neighbors within the entry's own concept, for prev/next links. */
  adjacent(entry: ContentSummary): { newer?: ContentSummary; older?: ContentSummary };
  /** Every entry's path across concepts, leading slash stripped, for SvelteKit `[...path]` prerender. */
  entries(): { path: string }[];
  /** One concept's index, for its archive, tag, and feed loaders. */
  concept(id: string): ContentIndex | undefined;
  /** Every non-draft summary across concepts, for the site-wide sitemap. */
  all(): ContentSummary[];
}

/** Strip a trailing slash from a path, keeping the root "/" intact. */
function normalizePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/** Union per-concept indexes into a site-level resolver; throw on a duplicate permalink. */
export function createSiteIndex(concepts: ConceptIndex[]): SiteIndex {
  const byPath = new Map<string, { index: ContentIndex; id: string }>();
  const byId = new Map<string, ContentIndex>();
  for (const { descriptor, index } of concepts) {
    byId.set(descriptor.id, index);
    for (const summary of index.all()) {
      const existing = byPath.get(summary.permalink);
      if (existing) {
        throw new Error(
          `site index: "${existing.id}" and "${summary.id}" both resolve to "${summary.permalink}"`,
        );
      }
      byPath.set(summary.permalink, { index, id: summary.id });
    }
  }
  return {
    byPermalink(path) {
      const hit = byPath.get(normalizePath(path));
      return hit ? hit.index.byId(hit.id) : undefined;
    },
    adjacent(entry) {
      const hit = byPath.get(entry.permalink);
      return hit ? hit.index.adjacent(entry.id) : {};
    },
    entries() {
      return [...byPath.keys()].map((p) => ({ path: p.replace(/^\//, '') }));
    },
    concept(id) {
      return byId.get(id);
    },
    all() {
      return concepts.flatMap(({ index }) => index.all());
    },
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project unit src/tests/unit/delivery-site-index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/delivery/site-index.ts src/tests/unit/delivery-site-index.test.ts
git commit -m "Add the site-level byPermalink index with collision detection"
```

---

### Task 9: Public routes move to the site level

**Files:**
- Modify: `src/lib/sveltekit/public-routes.ts`
- Test: `src/tests/unit/public-routes.test.ts`

- [ ] **Step 1: Rewrite the failing test**

Replace `src/tests/unit/public-routes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createPublicRoutes } from '../../lib/sveltekit/public-routes.js';
import { createSiteIndex } from '../../lib/delivery/site-index.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';

const [posts] = normalizeConcepts(
  { posts: { dir: 'p', fields: [], validate: () => ({ ok: true as const, data: {} }) } },
  { posts: { permalink: '/:year/:month/:day/:slug', datePrefix: 'day' } },
);
const [pages] = normalizeConcepts({ pages: { dir: 'g', fields: [], validate: () => ({ ok: true as const, data: {} }) } });

const site = createSiteIndex([
  { descriptor: posts, index: createContentIndex([
    { path: '/p/2026-02-01-a.md', raw: '---\ntitle: A\ndate: 2026-02-01\ntags: [x]\n---\n\nBody A.' },
    { path: '/p/2026-01-01-b.md', raw: '---\ntitle: B\ndate: 2026-01-01\ntags: [y]\n---\n\nBody B.' },
  ], posts) },
  { descriptor: pages, index: createContentIndex([{ path: '/g/about.md', raw: '---\ntitle: About\n---\n\nAbout body.' }], pages) },
]);

const routes = createPublicRoutes({ site, render: (md) => `<r>${md.trim()}</r>`, origin: 'https://example.com' });

describe('createPublicRoutes', () => {
  it('entryLoad resolves a dated Posts URL by pathname', async () => {
    const data = await routes.entryLoad({ url: new URL('https://example.com/2026/02/01/a') });
    expect(data.entry.id).toBe('2026-02-01-a');
    expect(data.html).toBe('<r>Body A.</r>');
    expect(data.canonicalUrl).toBe('https://example.com/2026/02/01/a');
  });

  it('entryLoad resolves a flat Pages URL through the same route', async () => {
    const data = await routes.entryLoad({ url: new URL('https://example.com/about') });
    expect(data.entry.id).toBe('about');
  });

  it('entryLoad throws a 404 for an unknown path', async () => {
    await expect(routes.entryLoad({ url: new URL('https://example.com/missing') })).rejects.toMatchObject({ status: 404 });
  });

  it('entries enumerates every path across concepts', () => {
    expect(routes.entries().map((e) => e.path).sort()).toEqual(['2026/01/01/b', '2026/02/01/a', 'about']);
  });

  it('archiveLoad and tagLoad stay per-concept', () => {
    expect(routes.archiveLoad('posts').entries.map((e) => e.id)).toEqual(['2026-02-01-a', '2026-01-01-b']);
    expect(routes.tagLoad('posts', { params: { tag: 'x' } }).entries.map((e) => e.id)).toEqual(['2026-02-01-a']);
    expect(routes.tagIndexLoad('posts').tags).toEqual([{ tag: 'x', count: 1 }, { tag: 'y', count: 1 }]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project unit src/tests/unit/public-routes.test.ts`
Expected: FAIL (the factory still takes `index`, and `entryLoad` reads `params.slug`).

- [ ] **Step 3: Implement**

Replace `src/lib/sveltekit/public-routes.ts`:

```ts
// cairn-cms: public route loaders (dated-slug design). The factory closes over the site-level
// index, the runtime render, and the origin. entryLoad and entries are site-wide: one catch-all
// `[...path]` route resolves any concept by request path through `byPermalink`. The archive, tag,
// and tag-index loaders stay concept-scoped, keyed by concept id. The index is built in site code
// from globs, so it stays in the prerender graph and out of the runtime Worker.
import { error } from '@sveltejs/kit';
import type { ContentSummary, ContentEntry } from '../delivery/content-index.js';
import type { SiteIndex } from '../delivery/site-index.js';

/** Injected dependencies for the public loaders. */
export interface PublicRoutesDeps {
  site: SiteIndex;
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

/** Build the public loaders for a site's unified index. */
export function createPublicRoutes(deps: PublicRoutesDeps) {
  const { site, render, origin } = deps;

  /** Resolve one concept's index by id, or a 404 (the route names an unconfigured concept). */
  function indexOf(conceptId: string) {
    const index = site.concept(conceptId);
    if (!index) throw error(404, `Unknown content type: ${conceptId}`);
    return index;
  }

  /** One entry by request path, rendered through the site renderer, or a 404. */
  async function entryLoad(event: { url: URL }): Promise<EntryData> {
    const entry = site.byPermalink(event.url.pathname);
    if (!entry) throw error(404, `Not found: ${event.url.pathname}`);
    const { newer, older } = site.adjacent(entry);
    return { entry, html: await render(entry.body, { stagger: true }), canonicalUrl: origin + entry.permalink, newer, older };
  }

  /** The chronological archive for one concept: every non-draft summary, newest-first. */
  function archiveLoad(conceptId: string): ListData {
    return { entries: indexOf(conceptId).all() };
  }

  /** All tags with counts for one concept, for a tag index page. */
  function tagIndexLoad(conceptId: string): TagIndexData {
    return { tags: indexOf(conceptId).allTags() };
  }

  /** One tag's entries for one concept, or a 404 when the tag has none. */
  function tagLoad(conceptId: string, event: { params: { tag: string } }): TagData {
    const entries = indexOf(conceptId).byTag(event.params.tag);
    if (entries.length === 0) throw error(404, `No entries tagged "${event.params.tag}"`);
    return { tag: event.params.tag, entries };
  }

  /** Prerender enumeration: one `{ path }` per entry across every concept. */
  function entries(): { path: string }[] {
    return site.entries();
  }

  return { entryLoad, archiveLoad, tagIndexLoad, tagLoad, entries };
}
```

The `ContentEntry` import in `public-routes.ts` is used only by the `EntryData` type; keep it. The `ContentSummary` import stays for the list-data types.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project unit src/tests/unit/public-routes.test.ts src/tests/unit/delivery-site-index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/public-routes.ts src/tests/unit/public-routes.test.ts
git commit -m "Move public entry resolution to the site-level catch-all"
```

---

### Task 10: Admin create composes the dated filename

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts`
- Test: `src/tests/unit/content-routes-create.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/tests/unit/content-routes-create.test.ts` (follow the file's existing runtime fixture and `mintToken` stub; the assertions below describe the redirect target the action throws):

```ts
// A day-granularity posts concept composes YYYY-MM-DD-slug and redirects to it.
it('composes a full-date filename for a day concept and seeds nothing extra', async () => {
  const event = makeEvent({ form: { title: 'Snowball', slug: 'snowball', date: '2026-06-15' }, concept: 'posts' });
  const redirectTo = await captureRedirect(() => routes.createAction(event));
  expect(redirectTo).toBe('/admin/posts/2026-06-15-snowball?new=1');
});

// A month-granularity concept composes YYYY-MM-slug.
it('composes a year-month filename for a month concept', async () => {
  const event = makeEvent({ form: { title: 'Welcome', slug: 'welcome', date: '2026-05-20' }, concept: 'posts' });
  const redirectTo = await captureRedirect(() => routes.createActionMonth(event)); // routes built with datePrefix 'month'
  expect(redirectTo).toBe('/admin/posts/2026-05-welcome?new=1');
});

// A dated concept with no date bounces.
it('bounces a dated create with no date', async () => {
  const event = makeEvent({ form: { title: 'X', slug: 'x' }, concept: 'posts' });
  const redirectTo = await captureRedirect(() => routes.createAction(event));
  expect(redirectTo).toMatch(/error=/);
});

// A slug that carries its own date prefix bounces.
it('bounces a slug that carries its own date prefix', async () => {
  const event = makeEvent({ form: { title: 'X', slug: '2026-05-31-x', date: '2026-06-15' }, concept: 'posts' });
  const redirectTo = await captureRedirect(() => routes.createAction(event));
  expect(redirectTo).toMatch(/error=/);
});

// A non-dated concept is unchanged: the slug is the id.
it('keeps the slug as the id for a non-dated concept', async () => {
  const event = makeEvent({ form: { title: 'About', slug: 'about' }, concept: 'pages' });
  const redirectTo = await captureRedirect(() => routes.createAction(event));
  expect(redirectTo).toBe('/admin/pages/about?new=1');
});
```

If the test file lacks `makeEvent`/`captureRedirect` helpers, add them: `makeEvent` builds a `ContentEvent` whose `request.formData()` resolves the given fields and whose `params.concept` is set; `captureRedirect` runs the action and returns the `location` from the thrown `redirect`. Build `routes` from a runtime whose `posts` descriptor has `datePrefix: 'day'`, and a second `routesMonth` with `datePrefix: 'month'` for the month case (drop the inline `createActionMonth` alias and call `routesMonth.createAction`).

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project unit src/tests/unit/content-routes-create.test.ts`
Expected: FAIL (create ignores the date and the granularity).

- [ ] **Step 3: Implement**

In `src/lib/sveltekit/content-routes.ts`, add `composeDatedId` and the date-prefix regex import: change the ids import to `import { isValidId, slugify, filenameFromId, composeDatedId } from '../content/ids.js';`. Replace `createAction`:

```ts
  /** Create a new entry: validate the slug, compose a dated id when the concept is dated, refuse to clobber. */
  async function createAction(event: ContentEvent): Promise<never> {
    sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const form = await event.request.formData();
    const slug = String(form.get('slug') ?? '').trim() || slugify(String(form.get('title') ?? ''));
    const date = String(form.get('date') ?? '').trim();
    const bounce = (msg: string): never => {
      throw redirect(303, `/admin/${concept.id}?error=${encodeURIComponent(msg)}`);
    };
    if (!isValidId(slug)) bounce('Enter a valid slug: lowercase letters, numbers, and hyphens.');

    let id = slug;
    if (concept.routing.dated) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) bounce('Pick a date for this entry.');
      if (/^\d{4}-\d{2}-\d{2}-|^\d{4}-\d{2}-|^\d{4}-/.test(slug)) {
        bounce('Leave the date out of the slug; set it in the date field.');
      }
      id = composeDatedId(date, slug, concept.datePrefix);
    }

    const token = await mintToken(event.platform?.env ?? {});
    const existing = await readRaw(runtime.backend, `${concept.dir}/${filenameFromId(id)}`, token);
    if (existing !== null) bounce('An entry with that slug already exists.');

    throw redirect(303, `/admin/${concept.id}/${id}?new=1`);
  }
```

The created entry's `date` reaches frontmatter when the editor first saves; the editor opens the date field pre-filled from the create form is out of scope here (the date is in the composed id, and the editor's date field defaults empty until first save). The frontmatter `date` is authored on save, which is the existing flow.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project unit src/tests/unit/content-routes-create.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-create.test.ts
git commit -m "Compose the dated filename from date and granularity on create"
```

---

### Task 11: Create form defaults the date to today

**Files:**
- Modify: `src/lib/components/ConceptList.svelte`
- Test: `src/tests/component/concept-list.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the component test for `ConceptList` (create it at `src/tests/component/concept-list.test.ts` if absent, mirroring the project's `vitest-browser-svelte` render pattern):

```ts
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ConceptList from '../../lib/components/ConceptList.svelte';

const base = { conceptId: 'posts', label: 'Posts', entries: [], error: null, formError: null };

describe('ConceptList create form', () => {
  it('shows a date input defaulted to today for a dated concept', async () => {
    const { getByLabelText } = render(ConceptList, { data: { ...base, dated: true } });
    const date = getByLabelText('Date') as HTMLInputElement;
    await expect.element(date).toBeVisible();
    expect(date.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('omits the date input for a non-dated concept', () => {
    const { container } = render(ConceptList, { data: { ...base, conceptId: 'pages', label: 'Pages', dated: false } });
    expect(container.querySelector('input[name="date"]')).toBeNull();
  });

  it('uses a date-free slug placeholder', () => {
    const { getByLabelText } = render(ConceptList, { data: { ...base, dated: true } });
    expect((getByLabelText('Slug') as HTMLInputElement).placeholder).toBe('my-entry');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project component src/tests/component/concept-list.test.ts`
Expected: FAIL (date input has no default; placeholder is `2026-05-my-entry`).

- [ ] **Step 3: Implement**

In `src/lib/components/ConceptList.svelte`, default the date in the script and fix the placeholder:

```svelte
  let title = $state('');
  let slug = $state('');
  let slugEdited = $state(false);
  const today = new Date().toISOString().slice(0, 10);

  const derivedSlug = $derived(slugEdited ? slug : slugify(title));
  const slugPlaceholder = $derived(data.dated ? 'my-entry' : 'about-us');
```

and set the date input's default value:

```svelte
      <input class="input" type="date" name="date" aria-label="Date" value={today} />
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project component src/tests/component/concept-list.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ConceptList.svelte src/tests/component/concept-list.test.ts
git commit -m "Default the create date to today and drop the date from the slug placeholder"
```

---

### Task 12: Export the new surface and clear the gate

**Files:**
- Modify: `src/lib/index.ts`, `src/lib/sveltekit/index.ts`
- Test: `src/tests/unit/delivery-exports.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/tests/unit/delivery-exports.test.ts`, add `createSiteIndex` to the engine-export assertions and confirm `createPublicRoutes` is still exported from `/sveltekit`:

```ts
expect(engine.createSiteIndex).toBeTypeOf('function');
```

(add `'createSiteIndex'` to the expected export-name list the test iterates).

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project unit src/tests/unit/delivery-exports.test.ts`
Expected: FAIL (`createSiteIndex` not exported).

- [ ] **Step 3: Implement**

In `src/lib/index.ts`, beside the existing delivery export, add:

```ts
export { createSiteIndex } from './delivery/site-index.js';
export type { SiteIndex, ConceptIndex } from './delivery/site-index.js';
```

Confirm `DatePrefix`, `ConceptUrlPolicy`, and `ContentSummary['slug']` are reachable through the existing type re-exports; add `export type { DatePrefix, ConceptUrlPolicy } from './content/types.js';` if the barrel does not already spread them. Confirm `urlPolicyFrom` is exported wherever `parseSiteConfig` is (`src/lib/index.ts` or the nav barrel).

- [ ] **Step 4: Run to verify pass and clear the full gate**

Run: `npx vitest run --project unit src/tests/unit/delivery-exports.test.ts`
Expected: PASS.

Then the full project gate:

Run: `npm run check`
Expected: 0 errors, 0 warnings (the showcase `svelte.config.js` caveat aside; see STATUS.md).

Run: `npm test`
Expected: exit 0 across the unit, integration, and component projects.

Fix every failure before the final commit. The likely cross-file breakages: any remaining fixture that set `permalink` inside a `ConceptConfig` (move it to the `normalizeConcepts` URL-policy arg), and any test that called the old per-concept `createPublicRoutes({ index })` or `entryLoad({ params: { slug } })`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/index.ts src/lib/sveltekit/index.ts src/tests/unit/delivery-exports.test.ts
git commit -m "Export the site index and the dated-slug type surface"
```

---

## Self-review checklist (run before handing off to execution)

- [ ] **Spec coverage.** id/slug/date model (Tasks 1, 7), `datePrefix` knob (Tasks 1-3), URL policy in YAML (Tasks 2, 4, 5), `byPermalink` unified resolver (Tasks 8, 9), catch-all `entries()` (Tasks 8, 9), site-wide collision (Task 8), admin create composition (Tasks 10, 11), `slug` exposed (Task 7). No-auto-rename needs no task; it is the absence of a rename path.
- [ ] **Placeholder scan.** No `TODO`/`TBD` in steps. Every code step shows final code; no "fix it later" scaffolding.
- [ ] **Type consistency.** `slugFromId(id, DatePrefix | null)`, `composeDatedId(date, slug, DatePrefix)`, `permalink(descriptor, { id, slug, date })`, `createSiteIndex(ConceptIndex[])`, `createPublicRoutes({ site, render, origin })`, `ConceptDescriptor.datePrefix`. These names match across Tasks 1-12.
- [ ] **Out of scope confirmed absent.** No rename/delete, no redirect handling, no settings web editor, no per-token route folders.
