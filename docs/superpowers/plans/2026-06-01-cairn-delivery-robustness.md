# cairn Delivery Robustness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the delivery surface against the misconfigurations and edge inputs a migrating site can trip: keep invalid content out of the typed read, throw at build on a missing or reserved-key glob, omit a feed date rather than throw on a bad one, and scope feed autodiscovery to entries that belong to a feed.

**Architecture:** Five small units across the delivery layer. `createContentIndex` excludes a validation-failed entry from the typed accessors and serves only the validator's normalized output. `createSiteIndexes` throws on an absent glob key and on a concept named `site`. The feed builders treat the date as optional and omit it when absent or unparseable. `entryLoad` passes `feeds` only for a dated entry. Each unit is pure node code, proven by the `unit` project, with the showcase production prerender as the end-to-end gate.

**Tech Stack:** TypeScript, vitest (`unit` project, node), Vite `import.meta.glob` and SvelteKit prerender for the showcase end-to-end check.

**Design reference:** `docs/superpowers/specs/2026-06-01-cairn-delivery-robustness-design.md` (approved). The schema initiative landed at `0.14.0`.

---

## Conventions for every task

- Work in `/home/glw907/Projects/cairn/cairn-cms` on branch `main`. This pass is additive across the package surface, and a cairn-cms push deploys no site, so it runs on `main` directly.
- Test-first (TDD): write or change the failing test, run it and watch it fail for the right reason, implement, watch it pass.
- Full gate before each commit: `npm run check` reports 0 errors and 0 warnings, and `npm test` EXITS 0 (it runs `unit`, `component`, and `integration`; it must exit 0, not merely show green assertions).
- Targeted test command: `npx vitest run --project unit src/tests/unit/<file>.test.ts`.
- Commit specific files, never `git add -A`. Commit footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies; plain voice.
- Do NOT run `npm install` from inside the workspace member; it drifts the root lock. The showcase's own `npm install` in `examples/showcase` (Task 5) is allowed, since it is the example's install, not a package-member install.
- Known flake: `src/tests/component/MarkdownEditor.test.ts` can fail once on a CodeMirror mount-timeout under parallel load. If `npm test` exits non-zero solely on that, re-run once to confirm green before committing.
- `npm run check` exits non-zero locally on the showcase `svelte.config.js` unless the showcase deps are installed. The svelte-check scan itself is 0/0 either way; CI checks out cairn-cms standalone and stays green. If the showcase config import is the only failure, the scan result (0 errors 0 warnings) is the gate.

## Reference values (verified against the live tree)

- `src/lib/delivery/content-index.ts`: `createContentIndex` builds `entries` with `files.map` at lines 87-112; line 96 runs `descriptor.validate(raw, body)`; line 97 pushes a `ContentProblem` on failure; line 109 sets `frontmatter: (result.ok ? result.data : raw) as F`. The accessors at lines 126-151 read `entries` (byId) and `sorted` (all/byTag/adjacent); `problems()` returns the recorded failures. `validateFields` trims a string and omits an empty optional, so a valid entry's normalized frontmatter differs from raw.
- `src/lib/delivery/site-indexes.ts`: `createSiteIndexes` loops descriptors at lines 44-49, reads each glob as `(globs)[descriptor.id] ?? {}` at line 45, and returns `{ ...byConcept, site }` at line 51.
- `src/lib/delivery/feeds.ts`: `FeedItem.date` is a required string (line 19); `rfc822` (lines 41-43) and `iso` (lines 45-48) wrap the date in `new Date(...)`; the RSS item template emits `<pubDate>` at line 60; the JSON item map sets `date_published: iso(item.date)` at line 103.
- `src/lib/sveltekit/public-routes.ts`: `entryLoad` is at lines 66-89; line 86 passes `feeds,` to `buildSeoMeta` for every entry.
- `src/lib/delivery/seo.ts`: `buildSeoMeta` turns `feeds.rss`/`feeds.json` into `links` entries with `rel: 'alternate'` (lines 56-62). It is UNCHANGED by this plan.
- `package.json`: `"version": "0.14.0"`.
- Existing tests that must stay green: `src/tests/unit/delivery-content-index.test.ts` (its "records a verdict" test still holds, since `problems()` is unchanged), `src/tests/unit/delivery-site-index-validation.test.ts` (gate behavior unchanged), `src/tests/unit/delivery-feeds.test.ts` (dated items unchanged), `src/tests/unit/public-routes-seo.test.ts` (the dated-entry assertions hold).

---

## Task 1: Keep invalid entries out of the typed read

**Files:**
- Modify: `src/lib/delivery/content-index.ts`
- Modify: `src/tests/unit/delivery-content-index.test.ts`

A validation-failed entry is recorded in `problems()` (unchanged) and excluded from the entries the read accessors serve, so every readable `ContentEntry<F>` carries the validator's normalized output and the `raw as F` cast is gone.

- [ ] **Step 1: Write the failing tests**

Append this describe block to `src/tests/unit/delivery-content-index.test.ts`:

```ts
describe('createContentIndex excludes invalid entries from the typed read', () => {
  const [posts] = normalizeConcepts({
    posts: { dir: 'd', schema: defineFields([{ type: 'text', name: 'title', label: 'Title', required: true }]) },
  });

  it('keeps an invalid non-draft entry out of every read but records it', () => {
    const index = createContentIndex(
      fromGlob({
        '/d/2026-01-01-good.md': '---\ntitle: Good\n---\nBody.',
        '/d/2026-01-02-bad.md': '---\ndescription: no title\n---\nBody.',
      }),
      posts,
    );
    expect(index.all().map((e) => e.id)).toEqual(['2026-01-01-good']);
    expect(index.byId('2026-01-02-bad')).toBeUndefined();
    expect(index.problems()).toEqual([
      { id: '2026-01-02-bad', draft: false, errors: { title: 'Title is required' } },
    ]);
  });

  it('keeps an invalid draft out of byId and includeDrafts reads but records it', () => {
    const index = createContentIndex(
      fromGlob({ '/d/2026-01-03-draft.md': '---\ndraft: true\ndescription: no title\n---\nBody.' }),
      posts,
    );
    expect(index.all({ includeDrafts: true })).toEqual([]);
    expect(index.byId('2026-01-03-draft')).toBeUndefined();
    expect(index.problems()).toEqual([
      { id: '2026-01-03-draft', draft: true, errors: { title: 'Title is required' } },
    ]);
  });

  it('keeps a valid draft readable', () => {
    const index = createContentIndex(
      fromGlob({ '/d/2026-01-04-wip.md': '---\ntitle: WIP\ndraft: true\n---\nBody.' }),
      posts,
    );
    expect(index.byId('2026-01-04-wip')?.title).toBe('WIP');
    expect(index.all({ includeDrafts: true }).map((e) => e.id)).toEqual(['2026-01-04-wip']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/delivery-content-index.test.ts`
Expected: FAIL. The invalid entries are still readable today (`byId` finds them and `all()` includes the non-draft one), so the exclusion assertions fail.

- [ ] **Step 3: Exclude failed entries when building the index**

In `src/lib/delivery/content-index.ts`, replace the `problems`/`entries` construction (lines 86-112, from `const problems` through the closing `});` of the `files.map`) with a for-loop that skips a failed entry:

```ts
  const problems: ContentProblem[] = [];
  const entries: ContentEntry<F>[] = [];
  for (const file of files) {
    const id = idFromFilename(basename(file.path));
    const slug = slugFromId(id, descriptor.routing.dated ? descriptor.datePrefix : null);
    const { frontmatter: raw, body } = parseMarkdown(file.raw);
    const date = asDate(raw.date);
    const draft = raw.draft === true;
    // Validate once at build. A failure is recorded for the site gate and excluded from the typed
    // read, so every readable entry's frontmatter is the validator's normalized output, never raw.
    const result = descriptor.validate(raw, body);
    if (!result.ok) {
      problems.push({ id, draft, errors: result.errors });
      continue;
    }
    entries.push({
      id,
      slug,
      permalink: permalink(descriptor, { id, slug, date }),
      title: asString(raw.title) ?? id,
      date,
      updated: asDate(raw.updated),
      tags: asTags(raw.tags),
      excerpt: deriveExcerpt(body, { description: asString(raw.description) }),
      wordCount: wordCount(body),
      draft,
      frontmatter: result.data as F,
      body,
    });
  }
```

The code below this block (`sorted`, `summarize`, `visible`, the returned accessors, `problems()`) is unchanged: it already reads `entries` and `sorted`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/delivery-content-index.test.ts`
Expected: PASS, the new block and every existing test green (the "records a verdict" and "stores the normalized data" tests still hold).

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0). The `delivery-site-index-validation.test.ts` gate tests stay green, since `problems()` is unchanged. Then:

```bash
git add src/lib/delivery/content-index.ts src/tests/unit/delivery-content-index.test.ts
git commit -m "fix(delivery): keep invalid entries out of the typed read

A validation-failed entry is recorded in problems() for the build gate and
excluded from the entries the read accessors serve, so every readable
ContentEntry carries the validator's normalized output and the raw-as-F cast is
gone. A non-draft failure still halts at the createSiteIndex gate; a valid draft
stays readable; an invalid draft drops from byId, where it was already out of
all() and the permalink map. validate:false skips the halt but still excludes
invalid entries, so the typed surface is pure by construction.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Build-time guards in createSiteIndexes

**Files:**
- Modify: `src/lib/delivery/site-indexes.ts`
- Modify: `src/tests/unit/delivery-site-indexes.test.ts`

An absent glob key for a declared concept throws (a present-but-empty record is allowed), and a concept named `site` throws, so a misconfigured site fails loudly at build instead of silently dropping a content type or clobbering the resolver.

- [ ] **Step 1: Write the failing tests**

Append this describe block to `src/tests/unit/delivery-site-indexes.test.ts` (the file's existing `adapter` and `config` fixtures are reused):

```ts
describe('createSiteIndexes build-time guards', () => {
  it('throws naming the concept when its glob key is absent', () => {
    expect(() =>
      createSiteIndexes(adapter, config, {
        posts: { '/src/content/posts/2026-01-05-hello.md': '---\ntitle: Hello\ndate: 2026-01-05\n---\nBody.' },
      }),
    ).toThrowError(/pages/);
  });

  it('allows a present-but-empty glob record as an empty concept', () => {
    const indexes = createSiteIndexes(adapter, config, {
      posts: { '/src/content/posts/2026-01-05-hello.md': '---\ntitle: Hello\ndate: 2026-01-05\n---\nBody.' },
      pages: {},
    });
    expect(indexes.pages.all()).toEqual([]);
    expect(indexes.posts.all().map((p) => p.id)).toEqual(['2026-01-05-hello']);
  });

  it('throws when a concept is named site, the reserved resolver key', () => {
    const siteAdapter = defineAdapter({
      siteName: 'Test',
      content: {
        site: {
          dir: 'src/content/site',
          schema: defineFields([{ name: 'title', type: 'text', label: 'Title', required: true }]),
        },
      },
      backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
      sender: { from: 'noreply@test.example' },
      render: (md) => md,
    });
    expect(() => createSiteIndexes(siteAdapter, config, { site: {} })).toThrowError(/reserved/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/delivery-site-indexes.test.ts`
Expected: FAIL. An absent `pages` key falls through to `{}` today (no throw), a `site` concept is spread without a guard (no throw), so the two `toThrowError` assertions fail. The present-but-empty case passes already.

- [ ] **Step 3: Add the guards in the descriptor loop**

In `src/lib/delivery/site-indexes.ts`, replace lines 41-49 (from `const descriptors = siteDescriptors(...)` through the loop's closing brace `}`, leaving the `const site = createSiteIndex(...)` line below untouched) with the guarded form:

```ts
  const descriptors = siteDescriptors(adapter, config);
  const globRecord = globs as Record<string, Record<string, string> | undefined>;
  const byConcept: Record<string, ContentIndex> = {};
  const conceptIndexes: ConceptIndex[] = [];
  for (const descriptor of descriptors) {
    if (descriptor.id === 'site') {
      throw new Error(
        'createSiteIndexes: a concept cannot be named "site", which is the reserved cross-concept resolver key',
      );
    }
    if (!Object.prototype.hasOwnProperty.call(globRecord, descriptor.id)) {
      const passed = Object.keys(globRecord);
      throw new Error(
        `createSiteIndexes: no glob passed for concept "${descriptor.id}"; pass its import.meta.glob (an empty {} for an intentionally empty concept). Globs passed: ${passed.length ? passed.join(', ') : '(none)'}`,
      );
    }
    const record = globRecord[descriptor.id] ?? {};
    const index = createContentIndex(fromGlob(record), descriptor);
    byConcept[descriptor.id] = index;
    conceptIndexes.push({ descriptor, index });
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/delivery-site-indexes.test.ts`
Expected: PASS, all three new tests and the existing `createSiteIndexes` tests green.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/delivery/site-indexes.ts src/tests/unit/delivery-site-indexes.test.ts
git commit -m "feat(delivery): guard a missing or reserved-key glob at build

createSiteIndexes throws when a declared concept has no glob key, so a typo'd or
omitted glob fails the build instead of silently dropping a content type; a
present-but-empty record stays allowed as the opt-in to an empty concept. A
concept named site throws, since site is the reserved cross-concept resolver
key the return object uses.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: The feed date guard

**Files:**
- Modify: `src/lib/delivery/feeds.ts`
- Modify: `src/tests/unit/delivery-feeds.test.ts`

`FeedItem.date` becomes optional, and the formatters omit the date rather than emit `Invalid Date` (RSS) or throw a `RangeError` (JSON) on an absent or unparseable input.

- [ ] **Step 1: Write the failing tests**

Append this describe block to `src/tests/unit/delivery-feeds.test.ts` (it reuses the file's `channel` fixture):

```ts
describe('feed date guard', () => {
  const undated: FeedItem = { title: 'No date', url: 'https://example.com/posts/x', summary: 's' };

  it('omits the RSS pubDate for an item with no date and does not throw', () => {
    const xml = buildRssFeed(channel, [undated]);
    expect(xml).not.toContain('<pubDate>');
    expect(xml).toContain('<link>https://example.com/posts/x</link>');
  });

  it('omits the JSON date_published for an item with no date and does not throw', () => {
    const feed = JSON.parse(buildJsonFeed(channel, [undated]));
    expect(feed.items[0].date_published).toBeUndefined();
    expect(feed.items[0].url).toBe('https://example.com/posts/x');
  });

  it('omits the date for a malformed date string rather than throwing', () => {
    const bad: FeedItem = { title: 'Bad', url: 'https://example.com/posts/y', date: 'not-a-date', summary: 's' };
    expect(() => buildJsonFeed(channel, [bad])).not.toThrow();
    expect(JSON.parse(buildJsonFeed(channel, [bad])).items[0].date_published).toBeUndefined();
    expect(buildRssFeed(channel, [bad])).not.toContain('<pubDate>');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/delivery-feeds.test.ts`
Expected: FAIL. `undated` omits `date`, which is a type error today (the check catches it), and the malformed-date case throws a `RangeError` from `iso`'s `toISOString`.

- [ ] **Step 3: Make the date optional and the formatters total**

In `src/lib/delivery/feeds.ts`, change the `date` field on `FeedItem` (line 19) to optional:

```ts
  date?: string;
```

Replace `rfc822` and `iso` (lines 40-48) with guarded forms that return `undefined` for an absent or unparseable date:

```ts
/** Format a YYYY-MM-DD (or ISO) string as an RFC-822 date in UTC, as RSS wants. Returns undefined
 *  for an absent or unparseable date, so the item omits its pubDate rather than emit Invalid Date. */
function rfc822(date?: string): string | undefined {
  if (!date) return undefined;
  const at = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(at.getTime()) ? undefined : at.toUTCString();
}

/** Format a YYYY-MM-DD (or ISO) string as an ISO-8601 instant in UTC. Returns undefined for an
 *  absent or unparseable date, so the item omits its date_published rather than throw at build. */
function iso(date?: string): string | undefined {
  if (!date) return undefined;
  const at = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(at.getTime()) ? undefined : at.toISOString();
}
```

In `buildRssFeed`, replace the item template (lines 52-66, the `.map` callback body) so the `<pubDate>` line drops when the date is absent:

```ts
    .map((item) => {
      const content = item.contentHtml ?? item.summary;
      const pubDate = rfc822(item.date);
      return [
        '    <item>',
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(item.url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(item.url)}</guid>`,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : '',
        `      <description>${escapeXml(item.summary)}</description>`,
        // CDATA cannot contain `]]>`, so split that one sequence rather than escape the body.
        `      <content:encoded><![CDATA[${cdataSafe(content)}]]></content:encoded>`,
        '    </item>',
      ]
        .filter((line) => line !== '')
        .join('\n');
    })
```

In `buildJsonFeed`, replace the item map (lines 98-107) so an absent or unparseable date omits `date_published` and `date_modified`:

```ts
      items: items.map((item) => {
        const datePublished = iso(item.date);
        const dateModified = iso(item.updated);
        return {
          id: item.url,
          url: item.url,
          title: item.title,
          summary: item.summary,
          ...(datePublished ? { date_published: datePublished } : {}),
          ...(dateModified ? { date_modified: dateModified } : {}),
          ...(item.contentHtml ? { content_html: item.contentHtml } : { content_text: item.summary }),
          ...(item.tags && item.tags.length ? { tags: item.tags } : {}),
        };
      }),
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/delivery-feeds.test.ts`
Expected: PASS, the new block plus every existing feeds test (the dated item still renders its RFC-822 pubDate and ISO `date_published`).

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/delivery/feeds.ts src/tests/unit/delivery-feeds.test.ts
git commit -m "fix(delivery): omit a feed date rather than throw on a bad one

FeedItem.date is now optional, and rfc822/iso return undefined for an absent or
unparseable date, so the RSS pubDate and the JSON date_published are omitted
rather than emitting Invalid Date or throwing a RangeError at build. Both
elements are optional in RSS 2.0 and JSON Feed 1.1, so the output stays valid.
This guards the public feed builders a site calls with hand-built items.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Scope feed autodiscovery to feed entries

**Files:**
- Modify: `src/lib/sveltekit/public-routes.ts`
- Modify: `src/tests/unit/public-routes-seo.test.ts`

`entryLoad` passes `feeds` to `buildSeoMeta` only for a dated entry, so an undated Page stops advertising the post feed in its head.

- [ ] **Step 1: Add the failing tests**

Append this describe block to `src/tests/unit/public-routes-seo.test.ts` (it reuses the file's `routes` fixture, whose deps pass `feeds` and `siteName: 'X Site'`, with a dated post at `/2026/05/14/welcome` and an undated page at `/secret`):

```ts
describe('entryLoad feed autodiscovery', () => {
  it('attaches feed alternate links to a dated entry', async () => {
    const data = await routes.entryLoad({ url: new URL('https://x.test/2026/05/14/welcome') });
    expect(data.seo.links).toContainEqual({
      rel: 'alternate',
      type: 'application/rss+xml',
      href: 'https://x.test/feed.xml',
      title: 'X Site',
    });
    expect(data.seo.links).toContainEqual({
      rel: 'alternate',
      type: 'application/feed+json',
      href: 'https://x.test/feed.json',
      title: 'X Site',
    });
  });

  it('attaches no feed alternate links to an undated page', async () => {
    const data = await routes.entryLoad({ url: new URL('https://x.test/secret') });
    expect(data.seo.links.some((link) => link.rel === 'alternate')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/public-routes-seo.test.ts`
Expected: FAIL on the undated-page test. `feeds` is passed for every entry today, so the Page's head carries the two `alternate` links and `.some((link) => link.rel === 'alternate')` is `true`. The dated-entry test passes already.

- [ ] **Step 3: Pass feeds only for a dated entry**

In `src/lib/sveltekit/public-routes.ts`, change the `feeds,` line in the `buildSeoMeta` call (line 86) to a conditional spread:

```ts
      ...(entry.date ? { feeds } : {}),
```

The surrounding `buildSeoMeta` call is otherwise unchanged. A dated entry (an article in the post stream) keeps its autodiscovery links; an undated Page passes no `feeds`, consistent with the article-versus-website `type` split two lines above.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/public-routes-seo.test.ts`
Expected: PASS, both new tests and every existing SEO test green.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/sveltekit/public-routes.ts src/tests/unit/public-routes-seo.test.ts
git commit -m "fix(delivery): scope feed autodiscovery to dated entries

entryLoad passes feeds to the head builder only for a dated entry, so an undated
Page stops advertising the post feed through a rel=alternate link. The feed is
the post stream, and a Page is not part of it. This matches the article-versus-
website type split already in entryLoad.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Prove the surface end to end and bump the version

**Files:**
- Modify: `package.json`

The showcase production prerender is the end-to-end gate: it still prerenders, a post keeps its feed autodiscovery links, and the about page no longer carries them. The additive surface bumps the version to `0.15.0`.

- [ ] **Step 1: Build the showcase and confirm the head**

Run:

```bash
cd examples/showcase && npm install && npm run build
```

Expected: the build exits 0 and prerenders without error (the catch-all, feeds, sitemap, and robots all build as before).

Confirm a dated post still advertises the feed and the about page no longer does:

```bash
grep -c 'rel="alternate"' build/prerendered/posts/hello.html
grep -c 'rel="alternate"' build/prerendered/about.html
```

Expected: a non-zero count for `hello.html` (its RSS and JSON `alternate` links), and `0` for `about.html`. The exact attribute order can vary by Svelte version, so if the count is unexpected, inspect the file and match on `rel="alternate"` together with the feed `href`. Then return to the repo root: `cd ../..`.

- [ ] **Step 2: Bump the version**

In `package.json`, change `"version": "0.14.0"` to `"version": "0.15.0"`.

- [ ] **Step 3: Validate the package shape**

Run: `npm run check:package`
Expected: green. No export-condition change; this pass adds no export.

- [ ] **Step 4: Full gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add package.json
git commit -m "chore(delivery): bump to 0.15.0 for the robustness pass

The delivery-robustness pass hardens the typed read, the glob guard, the feed
date handling, and the feed-link scope. The showcase production prerender proves
the surface end to end: a post keeps its feed autodiscovery links and the about
page no longer carries them. The additive surface bumps the minor to 0.15.0,
rolling on the unpublished window over 0.14.0.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage.** Unit 1 (pure typed read) is Task 1; Units 2 and 3 (the glob guard and the reserved-`site`-key guard, both in `site-indexes.ts`) are Task 2; Unit 4 (the feed date guard) is Task 3; Unit 5 (feed autodiscovery scope) is Task 4; the version bump and the end-to-end prerender are Task 5. The two deferred items (the permalink impossible-date and the excerpt CJK counting) are out of scope per the spec and untouched here.
- **No regression.** `problems()` is unchanged, so the `delivery-site-index-validation.test.ts` gate tests hold. The dated-feed-item assertions in `delivery-feeds.test.ts` hold, since a valid date still formats. The dated-entry assertions in `public-routes-seo.test.ts` hold, since a dated entry still passes `feeds`. The "records a verdict" and "stores the normalized data" tests in `delivery-content-index.test.ts` hold, since a failure is still recorded and a valid entry still serves `result.data`.
- **Type consistency.** `FeedItem.date` is `string | undefined` after Task 3, and `rfc822`/`iso` are `(date?: string) => string | undefined`; the builders guard on the formatter result before emitting. `createSiteIndexes` keeps its signature; the guards throw inside the existing loop. `createContentIndex` keeps its signature; the for-loop replaces the `.map` and the failure branch no longer produces a readable entry.
- **Ordering and green builds.** Task 1 is self-contained in `content-index.ts`. Task 2 is self-contained in `site-indexes.ts`. Task 3 is self-contained in `feeds.ts`. Task 4 is self-contained in `public-routes.ts`. Task 5 is the prerender proof plus the version bump. Each task ends with the full gate (`npm run check` 0/0, `npm test` exit 0), and Task 5 adds the showcase production build as the end-to-end proof.
- **Versioning.** Additive to the package surface (an optional widening on `FeedItem.date`, two new build-time throws, a purer typed read, a scoped feed-link emission). No export-condition change. Bumps a minor to `0.15.0`, unpublished until the next release step.
