# Content Graph Plan 2: the committed manifest and internal-link resolution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the committed, build-verified content manifest and the `cairn:` link resolver, so an author can write `[guide](cairn:posts/<id>)`, it renders as the live permalink on the public page, a dangling target fails the build, and the editor preview flags a broken target kindly.

**Architecture:** A pure manifest builder turns the corpus into one canonical JSON file (`src/content/.cairn/index.json` by default), reused by the build (regenerate and verify, failing on drift) and the admin save path (patch one entry, commit content and manifest atomically through `commitFiles`). A `cairn:` token parser and an mdast link extractor populate each entry's outbound edge list. A `remarkResolveCairnLinks` step reads a per-call resolver threaded through the render pipeline: at build it is backed by the site index and throws on a miss (the build backstop), in the preview it is backed by the manifest shipped to the client and marks a miss with a broken-link class.

**Tech Stack:** TypeScript, unified/remark (`remark-parse`, `unist-util-visit`, `vfile`), the GitHub Git Data API via the Plan 1 `commitFiles`, vitest (unit, component, integration), SvelteKit on Cloudflare.

**Design reference:** `docs/superpowers/specs/2026-06-02-cairn-content-graph-design.md` (approved). This plan merges the design's Plan 2 (the committed manifest) and Plan 3 (the token, resolver, and build backstop) into one pass, since they share the token parser and together form the first end-to-end capability. The picker and the lifecycle guards stay separate, later plans.

---

## Conventions for every task

- Work in `/home/glw907/Projects/cairn/cairn-cms` on branch `main`. The first parts are additive (new pure modules and exports); a cairn-cms push deploys no site, so it runs on `main` directly.
- Test-first (TDD): write or change the failing test, run it and watch it fail for the right reason, implement the minimal code, watch it pass.
- Full gate before each commit: `npm run check` reports 0 errors and 0 warnings, and `npm test` EXITS 0 (it runs `unit`, `component`, and `integration`). A passing assertion count is not enough; an unhandled rejection can leave tests green while the process exits 1.
- Commit specific files, never `git add -A`. Commit footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies or code comments; plain voice.
- No dependency changes; `vfile`, `unified`, `remark-parse`, and `unist-util-visit` are already installed. Do not run `npm install`.
- Known flake: `src/tests/component/MarkdownEditor.test.ts` can fail once on a CodeMirror mount-timeout under parallel load. If `npm test` exits non-zero solely on that, re-run once to confirm green.
- `npm run check` exits non-zero locally on the showcase `svelte.config.js` (it imports `@sveltejs/adapter-node`) unless the showcase deps are installed (`cd examples/showcase && npm install`). The svelte-check scan itself is 0/0 either way; if the showcase config import is the only failure, the 0/0 scan result is the gate.

## Reference values (verified against the live tree, 2026-06-02)

- `src/lib/content/ids.ts` exports `isValidId(id)`, `idFromFilename(filename)`, `filenameFromId(id)`, `slugify(title)`, `slugFromId(id, datePrefix | null)`, `composeDatedId(date, slug, datePrefix)`. `isValidId` accepts a full dated stem like `2026-01-04-waxing-guide` (the create path validates the bare slug, the edit path validates the full id).
- `src/lib/content/frontmatter.ts` exports `parseMarkdown(source): { frontmatter: Record<string, unknown>; body: string }`, `serializeMarkdown(frontmatter, body)`, `dateInputValue(value)`, `frontmatterFromForm(fields, form)`.
- `src/lib/content/permalink.ts` exports `permalink(descriptor, { id, slug, date? }): string`. It throws if a dated pattern token has no valid date.
- `src/lib/content/types.ts`: `ConceptDescriptor` has `id`, `label`, `dir`, `routing` (`{ routable, dated, inFeeds }`), `permalink`, `datePrefix`, `fields`, `validate`. `CairnAdapter` has `siteName`, `content`, `backend`, `sender`, `render(md, opts?)`, `registry?`, `icons?`, `navMenu?`, `assets?`. `CairnRuntime` mirrors it after `composeRuntime`. The adapter's `render` is the single renderer used by both the public build and the admin preview.
- `src/lib/content/compose.ts` `composeRuntime(adapter, extensions, urlPolicy)` builds `CairnRuntime`; it copies `render`, `backend`, etc. straight off the adapter.
- `src/lib/delivery/content-index.ts` exports `createContentIndex`, `fromGlob(record): RawFile[]`, and the types `RawFile` (`{ path, raw }`), `ContentSummary`, `ContentEntry`, `ContentIndex`. Module-private `asString`/`asDate` coerce frontmatter; this plan does not reuse them (it inlines equivalents in `manifest.ts` to avoid a delivery-to-content back import).
- `src/lib/delivery/site-index.ts` `SiteIndex` exposes `byPermalink(path)`, `concept(id): ContentIndex | undefined`, `all()`, `entries()`, `adjacent()`. `ContentIndex.byId(id): ContentEntry | undefined` and `ContentEntry.permalink` give a `(concept, id) -> permalink` lookup.
- `src/lib/delivery/site-indexes.ts` `createSiteIndexes(adapter, config, globs)` maps `siteDescriptors(adapter, config): ConceptDescriptor[]` over the per-concept globs; `SiteGlobs<A>` is `{ [K in keyof A['content']]?: Record<string, string> }`. `buildSiteManifest` mirrors this shape.
- `src/lib/render/pipeline.ts` `createRenderer(registry, options)` returns `{ remarkPlugins, rehypePlugins, renderMarkdown }`. `remarkPlugins` is `[remarkDirective, [remarkDirectiveStamp, registry]]`. `renderMarkdown(content)` does `String(await processor.process(content))`.
- `src/lib/sveltekit/public-routes.ts` `entryLoad` (line ~66) resolves an entry by path and renders `render(entry.body, { stagger: true })`. `PublicRoutesDeps` carries `site: SiteIndex` and `render`.
- `src/lib/sveltekit/content-routes.ts` `createContentRoutes(runtime, deps)` returns `editLoad`, `saveAction`, etc. `saveAction` (line ~230) validates, serializes, and commits via `commitFile`. `editLoad` (line ~198) reads the file and returns `EditData`. `commitFiles` from Plan 1 lives in `src/lib/github/repo.ts`.
- `src/lib/github/repo.ts` `commitFiles(repo, changes, opts, token)` from Plan 1: `changes` is `FileChange[]` (`{ path, content: string | null }`), `opts` is `{ message, author }`. `readRaw(repo, path, token)` returns the file text or null (404). `commitFile` stays for `nav-routes`.
- The showcase: `examples/showcase/src/lib/content.ts` calls `createSiteIndexes(cairn, parseSiteConfig(siteYaml), { posts, pages })` and exports `site`. `examples/showcase/src/lib/cairn.config.ts` builds `const { renderMarkdown } = createRenderer(registry)` and sets `render: (md) => renderMarkdown(md)`. The admin edit page is `examples/showcase/src/routes/admin/(app)/[concept]/[id]/+page.svelte` (renders `<EditPage render={cairn.render} ...>`) with the server shim `+page.server.ts` (`load = routes.editLoad`, `actions.save = routes.saveAction`).
- Current version: `package.json` `"version": "0.17.0"`. This plan bumps a minor at the end (additive surface).

---

## File structure

- Create `src/lib/content/links.ts`: the `cairn:` token grammar (`CairnRef`, `LinkResolve`, `parseCairnToken`, `extractCairnLinks`). Pure, content-layer. The resolver reuses `parseCairnToken`.
- Create `src/lib/content/manifest.ts`: the manifest types and pure operations (`ManifestEntry`, `Manifest`, `LinkTarget`, `manifestEntryFromFile`, `serializeManifest`, `parseManifest`, `emptyManifest`, `verifyManifest`, `upsertEntry`, `removeEntry`, `manifestLinkResolver`).
- Create `src/lib/delivery/manifest.ts`: `buildSiteManifest(adapter, config, globs)` over the corpus, plus `buildLinkResolver(site)`. Re-exported from `src/lib/delivery/index.ts`.
- Create `src/lib/render/resolve-links.ts`: the `remarkResolveCairnLinks` mdast step that reads the per-call resolver off the VFile.
- Modify `src/lib/render/pipeline.ts`: add the resolve step to `remarkPlugins`; thread a per-call `resolve` through `renderMarkdown` via a VFile.
- Modify `src/lib/content/types.ts`: add `manifestPath?` to `CairnAdapter`, `manifestPath` to `CairnRuntime`, and `resolve?` to the `render` opts.
- Modify `src/lib/content/compose.ts`: default `manifestPath`.
- Modify `src/lib/sveltekit/public-routes.ts`: `entryLoad` builds the build resolver from `site` and passes it.
- Modify `src/lib/sveltekit/content-routes.ts`: `editLoad` ships `linkTargets`; `saveAction` commits content and manifest atomically via `commitFiles`.
- Modify `src/lib/components/EditPage.svelte`: build the preview resolver from `data.linkTargets` and pass it to `render`; the broken-link cue is a CSS class the site styles.
- Modify the main and delivery package entries (`src/lib/index.ts`, `src/lib/delivery/index.ts`) for the new public exports.
- Modify the showcase: wire `verifyManifest`, commit the manifest file, add a regenerate script, forward `render` opts, and add a real `cairn:` link.

---

## Task 1: the `cairn:` token grammar

**Files:**
- Create: `src/lib/content/links.ts`
- Create: `src/tests/unit/links.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/links.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseCairnToken, extractCairnLinks } from '../../lib/content/links.js';

describe('parseCairnToken', () => {
  it('parses a concept and a dated id', () => {
    expect(parseCairnToken('cairn:posts/2026-01-04-waxing-guide')).toEqual({
      concept: 'posts',
      id: '2026-01-04-waxing-guide',
    });
  });
  it('parses an undated id', () => {
    expect(parseCairnToken('cairn:pages/about')).toEqual({ concept: 'pages', id: 'about' });
  });
  it('returns null for a non-cairn href', () => {
    expect(parseCairnToken('https://example.com')).toBeNull();
    expect(parseCairnToken('/posts/x')).toBeNull();
    expect(parseCairnToken('#anchor')).toBeNull();
  });
  it('returns null for a malformed token', () => {
    expect(parseCairnToken('cairn:posts')).toBeNull(); // no id
    expect(parseCairnToken('cairn:/about')).toBeNull(); // no concept
    expect(parseCairnToken('cairn:posts/Bad Id')).toBeNull(); // invalid id
  });
});

describe('extractCairnLinks', () => {
  it('collects cairn links in document order, deduped', () => {
    const body = [
      'See [the guide](cairn:posts/2026-01-04-waxing-guide) and [about](cairn:pages/about).',
      'Again [the guide](cairn:posts/2026-01-04-waxing-guide).',
      'And an [external](https://example.com).',
    ].join('\n\n');
    expect(extractCairnLinks(body)).toEqual([
      { concept: 'posts', id: '2026-01-04-waxing-guide' },
      { concept: 'pages', id: 'about' },
    ]);
  });
  it('ignores a cairn token inside a code span or fence', () => {
    const body = 'Inline `cairn:posts/x` and\n\n```\ncairn:posts/y\n```\n';
    expect(extractCairnLinks(body)).toEqual([]);
  });
  it('returns an empty array for a body with no links', () => {
    expect(extractCairnLinks('Just prose.')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/links.test.ts`
Expected: FAIL, the module does not exist yet.

- [ ] **Step 3: Implement the token grammar**

Create `src/lib/content/links.ts`:

```ts
// cairn-cms: the cairn: internal-link token. An internal link is a standard CommonMark link
// whose href is `cairn:<concept>/<id>`, keyed to the target's permanent filename stem so it
// survives a slug, date, or permalink change (content-graph design). This module owns the
// grammar; the render resolver (resolve-links.ts) reuses parseCairnToken.
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { isValidId } from './ids.js';

/** A resolved reference to a content entry by its concept and permanent id. */
export interface CairnRef {
  concept: string;
  id: string;
}

/** Resolve a reference to its live permalink. Returns undefined when the target is missing (the
 *  preview marks it); the build resolver throws instead, so a dangling token fails the build. */
export type LinkResolve = (ref: CairnRef) => string | undefined;

/** Parse a `cairn:<concept>/<id>` href, or null for any other href or a malformed token. */
export function parseCairnToken(href: string): CairnRef | null {
  if (!href.startsWith('cairn:')) return null;
  const rest = href.slice('cairn:'.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const concept = rest.slice(0, slash);
  const id = rest.slice(slash + 1);
  if (!concept || !isValidId(id)) return null;
  return { concept, id };
}

/** The cairn links a markdown body points at, in first-occurrence order, deduped by concept/id.
 *  Parses the body as mdast, so a token inside a code span or fence is never matched. */
export function extractCairnLinks(body: string): CairnRef[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(body);
  const seen = new Set<string>();
  const refs: CairnRef[] = [];
  visit(tree, 'link', (node: { url?: string }) => {
    const ref = node.url ? parseCairnToken(node.url) : null;
    if (!ref) return;
    const key = `${ref.concept}/${ref.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push(ref);
  });
  return refs;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/links.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/links.ts src/tests/unit/links.test.ts
git commit -m "feat(content): the cairn: link token grammar

Add parseCairnToken and extractCairnLinks. A cairn: link is a standard
CommonMark link keyed to the target's permanent id, so it survives a slug or
date change. extractCairnLinks parses the body as mdast, so a token in a code
span or fence is not matched. The render resolver reuses parseCairnToken.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: the manifest types and the row builder

**Files:**
- Create: `src/lib/content/manifest.ts`
- Create: `src/tests/unit/manifest.test.ts`

Build the manifest shape, the single-entry row builder (reused by the build and the save path), and the canonical serialize/parse.

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/manifest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { manifestEntryFromFile, serializeManifest, parseManifest, emptyManifest } from '../../lib/content/manifest.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';

const posts: ConceptDescriptor = {
  id: 'posts',
  label: 'Posts',
  dir: 'src/content/posts',
  routing: { routable: true, dated: true, inFeeds: true },
  permalink: '/:year/:month/:slug',
  datePrefix: 'month',
  fields: [],
  validate: () => ({ ok: true, data: {} }),
};

const file = {
  path: 'src/content/posts/2026-01-04-waxing-guide.md',
  raw: '---\ntitle: Waxing Guide\ndate: 2026-01-04\n---\n\nSee [about](cairn:pages/about).\n',
};

describe('manifestEntryFromFile', () => {
  it('derives the row including outbound links', () => {
    expect(manifestEntryFromFile(posts, file)).toEqual({
      id: '2026-01-04-waxing-guide',
      concept: 'posts',
      title: 'Waxing Guide',
      date: '2026-01-04',
      permalink: '/2026/01/waxing-guide',
      draft: false,
      links: [{ concept: 'pages', id: 'about' }],
    });
  });
  it('falls back to the id for a missing title and flags a draft', () => {
    const row = manifestEntryFromFile(posts, {
      path: 'src/content/posts/2026-02-02-untitled.md',
      raw: '---\ndate: 2026-02-02\ndraft: true\n---\n\nBody.\n',
    });
    expect(row.title).toBe('2026-02-02-untitled');
    expect(row.draft).toBe(true);
    expect(row.links).toEqual([]);
  });
});

describe('serializeManifest / parseManifest', () => {
  it('serializes canonically: entries and links sorted, pretty, trailing newline', () => {
    const manifest = {
      version: 1 as const,
      entries: [
        { id: 'b', concept: 'posts', title: 'B', date: '2026-01-02', permalink: '/b', draft: false, links: [{ concept: 'pages', id: 'z' }, { concept: 'pages', id: 'a' }] },
        { id: 'a', concept: 'pages', title: 'A', permalink: '/a', draft: false, links: [] },
      ],
    };
    const out = serializeManifest(manifest);
    expect(out.endsWith('\n')).toBe(true);
    const reparsed = parseManifest(out);
    // pages/a sorts before posts/b; the date-less entry omits the date key.
    expect(reparsed.entries.map((e) => `${e.concept}/${e.id}`)).toEqual(['pages/a', 'posts/b']);
    expect(reparsed.entries[0].date).toBeUndefined();
    // the second entry's links are sorted by concept then id.
    expect(reparsed.entries[1].links).toEqual([{ concept: 'pages', id: 'a' }, { concept: 'pages', id: 'z' }]);
    // serialize is idempotent on a parsed manifest.
    expect(serializeManifest(reparsed)).toBe(out);
  });
  it('emptyManifest round-trips', () => {
    expect(parseManifest(serializeManifest(emptyManifest()))).toEqual({ version: 1, entries: [] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/manifest.test.ts`
Expected: FAIL, the module does not exist yet.

- [ ] **Step 3: Implement the types and the row builder**

Create `src/lib/content/manifest.ts`:

```ts
// cairn-cms: the content manifest, a committed JSON projection of the corpus (content-graph
// design). The files in git stay the source of truth; the manifest exists so request-time admin
// code reads the content graph without an N+1 GitHub crawl. The build regenerates and verifies
// it; the save path patches one entry and commits it with the content in one commit. Each entry
// carries its identity and its outbound cairn: edges, so the manifest is the link graph.
import { idFromFilename, slugFromId } from './ids.js';
import { parseMarkdown } from './frontmatter.js';
import { permalink } from './permalink.js';
import { extractCairnLinks, type CairnRef, type LinkResolve } from './links.js';
import type { ConceptDescriptor } from './types.js';

/** One entry's projection: its identity, routing, draft flag, and outbound cairn: edges. */
export interface ManifestEntry {
  id: string;
  concept: string;
  title: string;
  date?: string;
  permalink: string;
  draft: boolean;
  links: CairnRef[];
}

/** The whole corpus as one committed file. `version` guards a future shape migration. */
export interface Manifest {
  version: 1;
  entries: ManifestEntry[];
}

/** The minimal entry view the preview resolver and (later) the picker read. */
export interface LinkTarget {
  concept: string;
  id: string;
  permalink: string;
  title: string;
  date?: string;
  draft: boolean;
}

function basename(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(slash + 1) : path;
}

/** Mirror content-index's frontmatter coercion: a present non-empty string, else undefined. */
function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** Mirror content-index's date coercion: an unquoted YAML date is a JS Date, a string is sliced. */
function asDate(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return undefined;
}

/** Build one manifest entry from a content file. Drafts are included and flagged. */
export function manifestEntryFromFile(descriptor: ConceptDescriptor, file: { path: string; raw: string }): ManifestEntry {
  const id = idFromFilename(basename(file.path));
  const slug = slugFromId(id, descriptor.routing.dated ? descriptor.datePrefix : null);
  const { frontmatter, body } = parseMarkdown(file.raw);
  const date = asDate(frontmatter.date);
  return {
    id,
    concept: descriptor.id,
    title: asString(frontmatter.title) ?? id,
    date,
    permalink: permalink(descriptor, { id, slug, date }),
    draft: frontmatter.draft === true,
    links: extractCairnLinks(body),
  };
}

/** An empty manifest, the starting point when no committed file exists yet. */
export function emptyManifest(): Manifest {
  return { version: 1, entries: [] };
}

function compareRef(a: CairnRef, b: CairnRef): number {
  return a.concept.localeCompare(b.concept) || a.id.localeCompare(b.id);
}

/** Serialize canonically: entries sorted by concept then id, links sorted and deduped, a fixed key
 *  order, two-space pretty, and a trailing newline, so the committed file diffs cleanly in a PR. */
export function serializeManifest(manifest: Manifest): string {
  const entries = [...manifest.entries].sort(compareRef).map((e) => ({
    id: e.id,
    concept: e.concept,
    title: e.title,
    ...(e.date ? { date: e.date } : {}),
    permalink: e.permalink,
    draft: e.draft,
    links: [...e.links].sort(compareRef).map((r) => ({ concept: r.concept, id: r.id })),
  }));
  return `${JSON.stringify({ version: 1, entries }, null, 2)}\n`;
}

/** Parse a committed manifest. Throws on malformed JSON or the wrong shape. */
export function parseManifest(raw: string): Manifest {
  const data = JSON.parse(raw) as unknown;
  if (!data || typeof data !== 'object' || !Array.isArray((data as { entries?: unknown }).entries)) {
    throw new Error('content manifest: malformed file, expected { version, entries: [] }');
  }
  return { version: 1, entries: (data as Manifest).entries };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/manifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/manifest.ts src/tests/unit/manifest.test.ts
git commit -m "feat(content): the manifest types and the row builder

Add the ManifestEntry/Manifest/LinkTarget types, manifestEntryFromFile (one
row from one content file, including its outbound cairn: edges, drafts flagged),
and the canonical serialize/parse. The canonical form sorts entries and links,
fixes the key order, and ends with a newline, so the committed manifest diffs
cleanly in a pull request.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: verify, upsert, remove, and the preview resolver

**Files:**
- Modify: `src/lib/content/manifest.ts`
- Modify: `src/tests/unit/manifest.test.ts`

Add the drift verifier (the build backstop), the incremental patch helpers (the save path), and the manifest-backed resolver (the preview).

- [ ] **Step 1: Write the failing tests**

In `src/tests/unit/manifest.test.ts`, add to the imports:

```ts
import { verifyManifest, upsertEntry, removeEntry, manifestLinkResolver } from '../../lib/content/manifest.js';
import type { ManifestEntry } from '../../lib/content/manifest.js';
```

Then append these tests:

```ts
const entryA: ManifestEntry = { id: 'a', concept: 'pages', title: 'A', permalink: '/a', draft: false, links: [] };
const entryB: ManifestEntry = { id: 'b', concept: 'posts', title: 'B', date: '2026-01-02', permalink: '/b', draft: false, links: [] };

describe('verifyManifest', () => {
  it('passes when the committed file matches the built manifest', () => {
    const built = { version: 1 as const, entries: [entryA, entryB] };
    expect(() => verifyManifest(built, serializeManifest(built))).not.toThrow();
  });
  it('throws an actionable error on drift', () => {
    const built = { version: 1 as const, entries: [entryA, entryB] };
    const stale = serializeManifest({ version: 1, entries: [entryA] });
    expect(() => verifyManifest(built, stale)).toThrow(/stale|regenerate/i);
  });
});

describe('upsertEntry / removeEntry', () => {
  it('replaces an entry with the same concept and id', () => {
    const start = { version: 1 as const, entries: [entryA, entryB] };
    const updated = upsertEntry(start, { ...entryB, title: 'B2' });
    expect(updated.entries.filter((e) => e.concept === 'posts' && e.id === 'b')).toHaveLength(1);
    expect(updated.entries.find((e) => e.id === 'b')?.title).toBe('B2');
  });
  it('adds a new entry', () => {
    const updated = upsertEntry({ version: 1, entries: [entryA] }, entryB);
    expect(updated.entries).toHaveLength(2);
  });
  it('removes by concept and id', () => {
    const updated = removeEntry({ version: 1, entries: [entryA, entryB] }, 'posts', 'b');
    expect(updated.entries.map((e) => e.id)).toEqual(['a']);
  });
});

describe('manifestLinkResolver', () => {
  it('resolves a known target and returns undefined for a miss', () => {
    const resolve = manifestLinkResolver([
      { concept: 'pages', id: 'a', permalink: '/a' },
      { concept: 'posts', id: 'b', permalink: '/b' },
    ]);
    expect(resolve({ concept: 'pages', id: 'a' })).toBe('/a');
    expect(resolve({ concept: 'posts', id: 'missing' })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/manifest.test.ts`
Expected: FAIL, the four functions are not exported yet.

- [ ] **Step 3: Implement verify, the patch helpers, and the resolver**

Append to `src/lib/content/manifest.ts`:

```ts
/** Throw if the committed manifest drifts from what the corpus says. Both sides are compared in the
 *  canonical serialized form, so semantic equality never spuriously fails. The build calls this so a
 *  raw-git content edit, which leaves the committed manifest stale, fails the build loudly. */
export function verifyManifest(built: Manifest, committedRaw: string): void {
  if (committedRaw !== serializeManifest(built)) {
    throw new Error(
      'content manifest is stale: the committed file does not match the corpus. Regenerate it (npm run cairn:manifest) and commit the result.',
    );
  }
}

/** Replace the entry with the same concept and id, or add it. Order does not matter, since
 *  serializeManifest sorts. This is the save path's incremental patch. */
export function upsertEntry(manifest: Manifest, entry: ManifestEntry): Manifest {
  const entries = manifest.entries.filter((e) => !(e.concept === entry.concept && e.id === entry.id));
  entries.push(entry);
  return { version: 1, entries };
}

/** Drop the entry with the given concept and id, if present. The delete path's patch. */
export function removeEntry(manifest: Manifest, concept: string, id: string): Manifest {
  return { version: 1, entries: manifest.entries.filter((e) => !(e.concept === concept && e.id === id)) };
}

/** A resolver backed by manifest targets, for the admin preview. A miss returns undefined, so the
 *  render step marks the link broken rather than throwing. The build resolver throws instead. */
export function manifestLinkResolver(targets: { concept: string; id: string; permalink: string }[]): LinkResolve {
  const byKey = new Map(targets.map((t) => [`${t.concept}/${t.id}`, t.permalink]));
  return (ref) => byKey.get(`${ref.concept}/${ref.id}`);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/manifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/manifest.ts src/tests/unit/manifest.test.ts
git commit -m "feat(content): manifest verify, patch, and the preview resolver

Add verifyManifest (the build backstop: a canonical-form comparison that fails
the build on drift), upsertEntry/removeEntry (the save and delete incremental
patch), and manifestLinkResolver (the preview's lookup, undefined on a miss so
the render step marks the link rather than throwing).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: the corpus manifest builder and the build resolver

**Files:**
- Create: `src/lib/delivery/manifest.ts`
- Modify: `src/lib/delivery/index.ts`
- Create: `src/tests/unit/delivery-manifest.test.ts`

Build the whole-corpus manifest from a site's globs (the build reuse), and the site-index-backed resolver that throws on a miss (the build backstop).

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/delivery-manifest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSiteManifest, buildLinkResolver } from '../../lib/delivery/manifest.js';
import { createSiteIndexes } from '../../lib/delivery/site-indexes.js';
import { defineAdapter } from '../../lib/content/adapter.js';
import { defineFields } from '../../lib/content/schema.js';
import type { SiteConfig } from '../../lib/nav/site-config.js';

const adapter = defineAdapter({
  siteName: 'T',
  content: {
    posts: { dir: 'src/content/posts', label: 'Posts', schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }, { type: 'date', name: 'date', label: 'Date' }]) },
    pages: { dir: 'src/content/pages', label: 'Pages', schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]) },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'a@b.c' },
  render: (md) => md,
});

const config: SiteConfig = {
  siteName: 'T',
  url: { posts: { permalink: '/:year/:month/:slug', datePrefix: 'month' }, pages: { permalink: '/:slug' } },
};

const globs = {
  posts: { '/src/content/posts/2026-01-04-guide.md': '---\ntitle: Guide\ndate: 2026-01-04\n---\n\n[about](cairn:pages/about)\n' },
  pages: { '/src/content/pages/about.md': '---\ntitle: About\n---\n\nHi.\n' },
};

describe('buildSiteManifest', () => {
  it('builds one entry per file across concepts with edges', () => {
    const manifest = buildSiteManifest(adapter, config, globs);
    const keys = manifest.entries.map((e) => `${e.concept}/${e.id}`).sort();
    expect(keys).toEqual(['pages/about', 'posts/2026-01-04-guide']);
    const guide = manifest.entries.find((e) => e.id === '2026-01-04-guide');
    expect(guide?.permalink).toBe('/2026/01/guide');
    expect(guide?.links).toEqual([{ concept: 'pages', id: 'about' }]);
  });
});

describe('buildLinkResolver', () => {
  it('resolves a known target and throws on a miss', () => {
    const { site } = createSiteIndexes(adapter, config, globs);
    const resolve = buildLinkResolver(site);
    expect(resolve({ concept: 'pages', id: 'about' })).toBe('/about');
    expect(() => resolve({ concept: 'posts', id: 'missing' })).toThrow(/cairn:posts\/missing/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-manifest.test.ts`
Expected: FAIL, the module does not exist yet.

> Note: confirm `defineAdapter` is imported from `../../lib/content/adapter.js` and `defineFields` from `../../lib/content/schema.js` (check the existing `src/tests/unit/site-indexes.test.ts` for the exact import paths and the `SiteConfig` shape, and mirror them; adjust the test imports if they differ).

- [ ] **Step 3: Implement the corpus builder and the build resolver**

Create `src/lib/delivery/manifest.ts`:

```ts
// cairn-cms: the build-side manifest builder and the build link resolver (content-graph design).
// buildSiteManifest mirrors createSiteIndexes: it maps the site descriptors over the per-concept
// globs and projects each file to a manifest row. buildLinkResolver reads the site index, which is
// fresh from the files at build, and throws on a missing target so a dangling cairn: token fails
// the build (the backstop). The admin preview uses manifestLinkResolver instead.
import { siteDescriptors } from './site-descriptors.js';
import { fromGlob } from './content-index.js';
import { emptyManifest, manifestEntryFromFile } from '../content/manifest.js';
import type { Manifest } from '../content/manifest.js';
import type { LinkResolve } from '../content/links.js';
import type { SiteIndex } from './site-index.js';
import type { SiteConfig } from '../nav/site-config.js';
import type { CairnAdapter } from '../content/types.js';
import type { SiteGlobs } from './site-indexes.js';

/** Build the whole-corpus manifest from a site's adapter, config, and per-concept globs. Drafts are
 *  included and flagged, so the admin picker and the guards see the full graph. */
export function buildSiteManifest<A extends CairnAdapter>(adapter: A, config: SiteConfig, globs: SiteGlobs<A>): Manifest {
  const globRecord = globs as Record<string, Record<string, string> | undefined>;
  const manifest = emptyManifest();
  for (const descriptor of siteDescriptors(adapter, config)) {
    const record = globRecord[descriptor.id] ?? {};
    for (const file of fromGlob(record)) {
      manifest.entries.push(manifestEntryFromFile(descriptor, file));
    }
  }
  return manifest;
}

/** A resolver backed by the site index, for the build. A miss throws, so a dangling cairn: token
 *  fails the prerender (the build backstop). The preview uses manifestLinkResolver, which marks. */
export function buildLinkResolver(site: SiteIndex): LinkResolve {
  return (ref) => {
    const url = site.concept(ref.concept)?.byId(ref.id)?.permalink;
    if (!url) throw new Error(`cairn link target not found: cairn:${ref.concept}/${ref.id}`);
    return url;
  };
}
```

In `src/lib/delivery/index.ts`, add after the existing `permalink` re-export (line ~27):

```ts
export { buildSiteManifest, buildLinkResolver } from './manifest.js';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-manifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/delivery/manifest.ts src/lib/delivery/index.ts src/tests/unit/delivery-manifest.test.ts
git commit -m "feat(delivery): the corpus manifest builder and the build resolver

Add buildSiteManifest (the whole-corpus projection, mirroring createSiteIndexes'
inputs) and buildLinkResolver (a site-index-backed resolver that throws on a
missing target, so a dangling cairn: token fails the build). Re-export both from
the delivery entry.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: the settable manifest path

**Files:**
- Modify: `src/lib/content/types.ts`
- Modify: `src/lib/content/compose.ts`
- Modify: `src/tests/unit/compose.test.ts` (or create if absent; see Step 1)

Add the `manifestPath` knob, defaulted in `composeRuntime`, and the `resolve` render option, so the save path and the render pipeline have what they need.

- [ ] **Step 1: Write the failing test**

Confirm the compose test file: `ls src/tests/unit/compose.test.ts`. If it exists, add the test below to it; if not, create it importing `composeRuntime` and a minimal adapter (mirror `src/tests/unit/delivery-manifest.test.ts`'s adapter, or an existing compose/normalize test's adapter).

Add this test:

```ts
import { composeRuntime } from '../../lib/content/compose.js';
// ... reuse or construct a minimal adapter `adapter` as in the sibling tests ...

describe('composeRuntime manifestPath', () => {
  it('defaults the manifest path', () => {
    expect(composeRuntime(adapter).manifestPath).toBe('src/content/.cairn/index.json');
  });
  it('honors an adapter override', () => {
    expect(composeRuntime({ ...adapter, manifestPath: 'content/.cairn/idx.json' }).manifestPath).toBe('content/.cairn/idx.json');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/compose.test.ts`
Expected: FAIL, `manifestPath` is neither on the adapter type nor set by `composeRuntime`.

- [ ] **Step 3: Implement the manifest path and the render option**

In `src/lib/content/types.ts`:

1. Add the import at the top, beside the other type imports:

```ts
import type { LinkResolve } from './links.js';
```

2. Change the `CairnAdapter.render` signature and add `manifestPath`. Replace the existing `render` line and add the field:

```ts
  /** The site's one renderer: the editor preview and every public page call it (design decision 4).
   *  `resolve` rewrites cairn: links to live permalinks; the build passes a site-index resolver, the
   *  preview a manifest one. */
  render(md: string, opts?: { stagger?: boolean; resolve?: LinkResolve }): string | Promise<string>;
  /** Repo-relative path to the committed content manifest. Defaults to src/content/.cairn/index.json
   *  in composeRuntime. It sits outside any concept directory, so content enumeration never globs it. */
  manifestPath?: string;
```

3. In `CairnRuntime`, change its `render` to the same signature and add `manifestPath: string` (a resolved, non-optional value). Find the `render` member and the field list in `CairnRuntime` (around line 264) and update:

```ts
  render(md: string, opts?: { stagger?: boolean; resolve?: LinkResolve }): string | Promise<string>;
  manifestPath: string;
```

In `src/lib/content/compose.ts`, add the default. Find the returned object in `composeRuntime` and add the field beside `render`:

```ts
    manifestPath: adapter.manifestPath ?? 'src/content/.cairn/index.json',
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/compose.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/types.ts src/lib/content/compose.ts src/tests/unit/compose.test.ts
git commit -m "feat(content): the settable manifest path and the resolve render option

Add an optional manifestPath to the adapter, defaulted in composeRuntime to
src/content/.cairn/index.json, and a resolve option on the render signature so
the build and the preview can inject their link resolvers. Both are additive:
an existing site adapter compiles unchanged.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: the resolve step in the render pipeline

**Files:**
- Create: `src/lib/render/resolve-links.ts`
- Modify: `src/lib/render/pipeline.ts`
- Create: `src/tests/unit/resolve-links.test.ts`

Add the mdast step that resolves cairn: link nodes, and thread a per-call resolver through `renderMarkdown` via a VFile.

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/resolve-links.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import type { LinkResolve } from '../../lib/content/links.js';

const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));

describe('cairn link resolution', () => {
  it('rewrites a cairn link to the resolved permalink', async () => {
    const resolve: LinkResolve = (ref) => (ref.id === 'about' ? '/about' : undefined);
    const html = await renderMarkdown('See [about](cairn:pages/about).', { resolve });
    expect(html).toContain('href="/about"');
    expect(html).not.toContain('cairn:');
  });
  it('marks a missing target with the broken-link class and keeps the text', async () => {
    const resolve: LinkResolve = () => undefined;
    const html = await renderMarkdown('See [gone](cairn:pages/gone).', { resolve });
    expect(html).toContain('cairn-broken-link');
    expect(html).toContain('gone');
  });
  it('leaves a non-cairn link untouched', async () => {
    const resolve: LinkResolve = () => '/x';
    const html = await renderMarkdown('[ext](https://example.com)', { resolve });
    expect(html).toContain('href="https://example.com"');
  });
  it('propagates a throwing resolver, so the build fails on a dangling token', async () => {
    const resolve: LinkResolve = () => {
      throw new Error('cairn link target not found: cairn:pages/gone');
    };
    await expect(renderMarkdown('[gone](cairn:pages/gone)', { resolve })).rejects.toThrow(/not found/);
  });
  it('leaves a cairn link inert when no resolver is provided', async () => {
    const html = await renderMarkdown('[x](cairn:pages/about)');
    expect(html).toContain('cairn:pages/about');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/resolve-links.test.ts`
Expected: FAIL, `renderMarkdown` ignores `resolve` and the step does not exist.

- [ ] **Step 3: Implement the resolve step and thread the resolver**

Create `src/lib/render/resolve-links.ts`:

```ts
// cairn-cms: the cairn: link resolver, an mdast step in the render pipeline (content-graph design).
// It runs before remark-rehype, so the rewritten href passes through the sanitize floor exactly as
// any other anchor. The per-call resolver is read off the VFile (set by renderMarkdown), so the
// processor is still built once. A miss either marks the link broken (preview) or throws (build),
// decided by the injected resolver.
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';
import { parseCairnToken, type LinkResolve } from '../content/links.js';

/** The VFile data key the renderer sets the per-call resolver under. */
export const CAIRN_RESOLVE = 'cairnResolve';

interface LinkNode {
  url: string;
  data?: { hProperties?: Record<string, unknown> };
}

/** Resolve cairn: link nodes against the VFile's resolver. A non-cairn href and a malformed token
 *  pass through. A missing target is marked with the cairn-broken-link class (the resolver returns
 *  undefined) or, when the resolver throws, the error propagates and fails the build. */
export function remarkResolveCairnLinks() {
  return (tree: unknown, file: VFile): void => {
    const resolve = file.data[CAIRN_RESOLVE] as LinkResolve | undefined;
    if (!resolve) return;
    visit(tree as Parameters<typeof visit>[0], 'link', (node: LinkNode) => {
      const ref = parseCairnToken(node.url);
      if (!ref) return;
      const url = resolve(ref); // may throw (build backstop); propagates out of render
      if (url) {
        node.url = url;
        return;
      }
      // Missing target in the preview: mark it broken and neutralize the href, keeping the text.
      node.url = '#';
      node.data = node.data ?? {};
      const props = (node.data.hProperties = node.data.hProperties ?? {});
      const existing = Array.isArray(props.className) ? (props.className as string[]) : [];
      props.className = [...existing, 'cairn-broken-link'];
    });
  };
}
```

In `src/lib/render/pipeline.ts`:

1. Add the imports at the top:

```ts
import { VFile } from 'vfile';
import { remarkResolveCairnLinks, CAIRN_RESOLVE } from './resolve-links.js';
import type { LinkResolve } from '../content/links.js';
```

2. Add the step to `remarkPlugins`:

```ts
  const remarkPlugins: PluggableList = [remarkDirective, [remarkDirectiveStamp, registry], remarkResolveCairnLinks];
```

3. Change `renderMarkdown` to accept the per-call resolver and run it through a VFile:

```ts
    renderMarkdown: async (content: string, opts: { resolve?: LinkResolve } = {}): Promise<string> => {
      const file = new VFile({ value: content, data: { [CAIRN_RESOLVE]: opts.resolve } });
      return String(await processor.process(file));
    },
```

> The `cairn-broken-link` class must survive the sanitize floor. The render-safety pass already allows a free-form `className` on anchors (`src/lib/render/sanitize-schema.ts`), so no schema change is needed. Confirm by running the second test (the marked-link case) and checking the class is present in the output.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/resolve-links.test.ts`
Expected: PASS, all five cases.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/render/resolve-links.ts src/lib/render/pipeline.ts src/tests/unit/resolve-links.test.ts
git commit -m "feat(render): resolve cairn: links in the pipeline

Add remarkResolveCairnLinks, an mdast step before remark-rehype that rewrites a
cairn: link to its resolved permalink, so the href passes through the sanitize
floor like any anchor. The per-call resolver threads through renderMarkdown on a
VFile, so the processor is still built once. A miss marks the link with the
cairn-broken-link class (preview) or propagates a throw (the build backstop). A
render with no resolver leaves a cairn: link inert.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: wire the build resolver into the public route

**Files:**
- Modify: `src/lib/sveltekit/public-routes.ts`
- Modify: `src/tests/unit/public-routes.test.ts` (mirror the existing entryLoad test setup)

`entryLoad` builds the site-index resolver and passes it to `render`, so public pages resolve cairn links and a dangling token fails the prerender.

- [ ] **Step 1: Write the failing test**

Open `src/tests/unit/public-routes.test.ts` and study how it constructs `createPublicRoutes` deps and calls `entryLoad` (the `site` double and the `render` spy). Add a test mirroring that setup:

```ts
it('resolves a cairn link in the body through the build resolver', async () => {
  // Build deps where `site` has a concept('pages').byId('about') with permalink '/about',
  // and a `render` that is the real createRenderer renderMarkdown (so resolution is exercised),
  // or a render spy that asserts it received an opts.resolve and calls it.
  // Then assert entryLoad's returned html contains href="/about" for a body linking cairn:pages/about,
  // and that a body linking cairn:pages/missing rejects (the build backstop).
});
```

Implement the test concretely against the file's existing `site` and `render` doubles: give the `site` double a `concept(id)` returning a `ContentIndex`-shaped object whose `byId` returns `{ permalink: '/about', ... }`, set the route's `render` to a real `createRenderer(defineRegistry({ components: [] })).renderMarkdown`, and assert both the resolved-href case and the throwing missing-target case.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/public-routes.test.ts`
Expected: FAIL, `entryLoad` does not pass a resolver, so `cairn:` links stay inert.

- [ ] **Step 3: Pass the build resolver from entryLoad**

In `src/lib/sveltekit/public-routes.ts`:

1. Add the import:

```ts
import { buildLinkResolver } from '../delivery/manifest.js';
```

2. In `entryLoad` (the line rendering the body, ~line 88), pass the resolver built from `site`:

```ts
    return { entry, html: await render(entry.body, { stagger: true, resolve: buildLinkResolver(site) }), canonicalUrl, seo, newer, older };
```

(`site` is already destructured from `deps` at the top of `createPublicRoutes`.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/public-routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/sveltekit/public-routes.ts src/tests/unit/public-routes.test.ts
git commit -m "feat(delivery): resolve cairn links when rendering a public page

entryLoad builds the site-index-backed resolver and passes it to render, so a
cairn: link in a body resolves to its live permalink in the prerendered page and
a dangling token throws, failing the build. The resolver reads the site index,
which is fresh from the files, so the build never reads the manifest.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: ship the manifest targets to the editor

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts`
- Modify: `src/tests/integration/` or `src/tests/unit/` content-routes test (mirror the existing `editLoad` test)

`editLoad` reads the committed manifest and ships its `linkTargets` to the client, so the preview resolver (and later the picker) can read them. A missing manifest ships an empty list.

- [ ] **Step 1: Write the failing test**

Find the existing `editLoad` test (search `editLoad` under `src/tests/`). Mirror its setup (a `readRaw`/fetch double and an injected token). Add a test:

```ts
it('ships the manifest link targets, and an empty list when the manifest is missing', async () => {
  // Case A: the manifest read returns a serialized manifest with one pages/about entry.
  //   Assert editLoad's returned data.linkTargets contains { concept: 'pages', id: 'about', permalink: ... }.
  // Case B: the manifest read returns null (404).
  //   Assert data.linkTargets === [].
});
```

Implement it against the test file's existing double for `readRaw` (the content-routes tests stub `globalThis.fetch` per call; the manifest read is one more `readRaw` call at `runtime.manifestPath`).

- [ ] **Step 2: Run the test to verify it fails**

Run the targeted content-routes test. Expected: FAIL, `EditData` has no `linkTargets` and `editLoad` does not read the manifest.

- [ ] **Step 3: Implement the manifest read in editLoad**

In `src/lib/sveltekit/content-routes.ts`:

1. Add imports:

```ts
import { parseManifest, type LinkTarget } from '../content/manifest.js';
```

2. Add `linkTargets` to the `EditData` interface:

```ts
  /** The site's link targets, for the preview resolver and the link picker; from the committed manifest. */
  linkTargets: LinkTarget[];
```

3. In `editLoad`, after reading the entry `raw` and before the `return`, read the manifest and map it. The manifest read reuses the same `token`:

```ts
    let linkTargets: LinkTarget[] = [];
    const manifestRaw = await readRaw(runtime.backend, runtime.manifestPath, token);
    if (manifestRaw !== null) {
      linkTargets = parseManifest(manifestRaw).entries.map((e) => ({
        concept: e.concept,
        id: e.id,
        permalink: e.permalink,
        title: e.title,
        date: e.date,
        draft: e.draft,
      }));
    }
```

4. Add `linkTargets` to the returned object in `editLoad`:

```ts
      linkTargets,
```

- [ ] **Step 4: Run the test to verify it passes**

Run the targeted content-routes test. Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/
git commit -m "feat(admin): ship the manifest link targets to the editor

editLoad reads the committed manifest and ships its link targets in EditData, so
the preview resolver and the later link picker read a finite, in-browser list. A
missing manifest ships an empty list rather than failing the load.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: resolve cairn links in the editor preview

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Modify: `src/tests/component/EditPage.test.ts` (mirror the existing preview test)

`EditPage` builds the manifest-backed resolver from `data.linkTargets` and passes it to `render`, so the preview shows resolved links and marks a missing target.

- [ ] **Step 1: Write the failing test**

Open `src/tests/component/EditPage.test.ts`. Mirror the existing preview-render test (it sets `render` and toggles the preview). Add a test that passes `data.linkTargets` with one `pages/about` target and a `render` that is the real `createRenderer` `renderMarkdown`, sets the body to `[about](cairn:pages/about)` and `[gone](cairn:pages/gone)`, shows the preview, and asserts the preview HTML contains `href="/about"` for the first and `cairn-broken-link` for the second.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: FAIL, `EditPage` calls `render(md)` with no resolver, so cairn links stay inert.

- [ ] **Step 3: Build the preview resolver and pass it**

In `src/lib/components/EditPage.svelte`:

1. Add the import in the `<script>` block:

```ts
  import { manifestLinkResolver } from '../content/manifest.js';
```

2. Build the resolver from `data.linkTargets` (a `$derived`, recomputed if the targets change):

```ts
  const resolveLink = $derived(manifestLinkResolver(data.linkTargets));
```

3. In the debounced preview effect, pass the resolver to `render`. Change the `render(md)` call (around line 59) to:

```ts
        const html = await render(md, { resolve: resolveLink });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/EditPage.svelte src/tests/component/EditPage.test.ts
git commit -m "feat(admin): resolve cairn links in the editor preview

EditPage builds the manifest-backed resolver from data.linkTargets and passes it
to the site render, so the preview shows a cairn: link as its live permalink and
marks a missing target with the cairn-broken-link class. The author meets a
broken link in the editor, before the build backstop.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: commit the content and the manifest atomically

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts`
- Modify: the content-routes save test (mirror the existing `saveAction` test)

`saveAction` moves off the single-file `commitFile` onto `commitFiles`: it reads the manifest, upserts the saved entry's row, and commits the content file and the refreshed manifest in one commit.

- [ ] **Step 1: Write the failing test**

In the content-routes save test, mirror the existing `saveAction` happy-path test (it stubs `fetch` for the commit and asserts the redirect). Add or adapt a test that asserts the commit goes through `commitFiles` with two paths:

```ts
it('commits the content file and the refreshed manifest in one commit', async () => {
  // Stub the GitHub calls saveAction makes in order:
  //   readRaw(manifestPath) -> a serialized manifest (or 404 for the empty case),
  //   then the commitFiles sequence (GET ref, GET commit, POST trees, POST commits, PATCH ref).
  // Drive saveAction with a form whose body links cairn:pages/about.
  // Assert the POST trees body's `tree` includes BOTH the content path and runtime.manifestPath,
  // and that the manifest blob content parses to a manifest containing the saved entry with its
  // links: [{ concept: 'pages', id: 'about' }].
});
```

Also keep a test for the conflict path: `commitFiles` throwing `CommitConflictError` still redirects with the reapply message.

- [ ] **Step 2: Run the test to verify it fails**

Run the targeted save test. Expected: FAIL, `saveAction` still calls `commitFile` (one path, no manifest).

- [ ] **Step 3: Migrate saveAction to commitFiles**

In `src/lib/sveltekit/content-routes.ts`:

1. Change the repo import to bring in `commitFiles` (keep `readRaw`, drop `commitFile` from this file if it is now unused here; `nav-routes.ts` keeps its own `commitFile` import):

```ts
import { listMarkdown, readRaw, commitFiles } from '../github/repo.js';
```

2. Add the manifest imports (if not already added in Task 8):

```ts
import { emptyManifest, manifestEntryFromFile, parseManifest, serializeManifest, upsertEntry } from '../content/manifest.js';
```

3. Replace the commit block in `saveAction` (the `try { await commitFile(...) } catch ...`) with the atomic content-plus-manifest commit:

```ts
    const markdown = serializeMarkdown(result.data, body);
    const token = await mintToken(event.platform?.env ?? {});

    // Read the committed manifest, upsert this entry's row, and commit content and manifest in one
    // commit. A missing manifest starts empty (first save on a fresh repo). The build regenerates
    // and verifies the manifest, so this incremental patch is the cheap request-time path.
    const manifestRaw = await readRaw(runtime.backend, runtime.manifestPath, token);
    const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
    const row = manifestEntryFromFile(concept, { path, raw: markdown });
    const nextManifest = serializeManifest(upsertEntry(manifest, row));

    try {
      await commitFiles(
        runtime.backend,
        [
          { path, content: markdown },
          { path: runtime.manifestPath, content: nextManifest },
        ],
        { message: `Update ${concept.label.toLowerCase()}: ${id}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
    } catch (err) {
      if (isConflict(err)) {
        const message = 'This file changed since you opened it. Reload and reapply your edits.';
        throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}${suffix}`);
      }
      throw err;
    }
    throw redirect(303, `/admin/${concept.id}/${id}?saved=1`);
```

- [ ] **Step 4: Run the test to verify it passes**

Run the targeted save test. Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/
git commit -m "feat(admin): commit content and the manifest atomically on save

saveAction moves off commitFile onto the Plan 1 commitFiles: it reads the
committed manifest, upserts the saved entry's row (its identity and its outbound
cairn: edges), and commits the content file and the refreshed manifest in one
commit. There is no two-commit drift window and no double deploy. A missing
manifest starts empty. commitFile stays for the nav config path.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: wire the showcase end to end

**Files:**
- Modify: `examples/showcase/src/lib/content.ts`
- Modify: `examples/showcase/src/lib/cairn.config.ts`
- Create: `examples/showcase/scripts/build-manifest.mjs`
- Modify: `examples/showcase/package.json`
- Create: `examples/showcase/src/content/.cairn/index.json` (generated by the script)
- Modify: a showcase post body to add a real `cairn:` link

This is the end-to-end gate: the production build resolves a real cairn link, verifies the manifest, and would fail on a dangling token.

- [ ] **Step 1: Add a real cairn link and the render forwarding**

In a showcase post (for example `examples/showcase/src/content/posts/<the hello post>.md`), add a link to the about page in the body:

```markdown
See the [about page](cairn:pages/about) for more.
```

In `examples/showcase/src/lib/cairn.config.ts`, forward the render opts so the resolver threads through:

```ts
  render: (md, opts) => renderMarkdown(md, opts),
```

- [ ] **Step 2: Add the regenerate script and the npm task**

Create `examples/showcase/scripts/build-manifest.mjs`:

```js
// Regenerate the committed content manifest from the corpus on disk. Run with `npm run cairn:manifest`.
// It reads the markdown files with fs (the Vite glob is not available outside the build), builds the
// manifest with the engine's builder, and writes the canonical file the build verifies against.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSiteManifest } from '@glw907/cairn-cms/delivery';
import { serializeManifest, parseManifest } from '@glw907/cairn-cms';
import { parseSiteConfig } from '@glw907/cairn-cms';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function load() {
  const { cairn } = await import(join(root, 'src/lib/cairn.config.js'));
  const siteYaml = readFileSync(join(root, 'src/lib/site.config.yaml'), 'utf8');
  return { cairn, config: parseSiteConfig(siteYaml) };
}

function globOf(dir, prefix) {
  const out = {};
  for (const name of readdirSync(join(root, dir)).filter((n) => n.endsWith('.md'))) {
    out[`${prefix}/${name}`] = readFileSync(join(root, dir, name), 'utf8');
  }
  return out;
}

const { cairn, config } = await load();
const globs = {
  posts: globOf('src/content/posts', '/src/content/posts'),
  pages: globOf('src/content/pages', '/src/content/pages'),
};
const manifest = buildSiteManifest(cairn, config, globs);
const out = join(root, 'src/content/.cairn/index.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, serializeManifest(manifest));
parseManifest(readFileSync(out, 'utf8')); // sanity: the file round-trips
console.log(`wrote ${out} with ${manifest.entries.length} entries`);
```

> `cairn.config.ts` imports must resolve from compiled `.js` at script run time. If the showcase has no build step that emits `cairn.config.js`, run the script with a TS loader (for example `node --import tsx scripts/build-manifest.mjs`) and import `cairn.config.ts`. Match whatever the showcase already uses to run TS scripts; check `examples/showcase/package.json` scripts for a `tsx`/`tsm` precedent and mirror it.

In `examples/showcase/package.json`, add the script:

```json
    "cairn:manifest": "node --import tsx scripts/build-manifest.mjs"
```

(Adjust the loader to the showcase's TS-running convention.)

- [ ] **Step 3: Wire verify into the content layer and regenerate the file**

In `examples/showcase/src/lib/content.ts`, after `const indexes = createSiteIndexes(...)`, add the build verify:

```ts
import { buildSiteManifest } from '@glw907/cairn-cms/delivery';
import { verifyManifest } from '@glw907/cairn-cms';
import manifestRaw from '/src/content/.cairn/index.json?raw';

// The build regenerates the manifest from the corpus and fails if the committed file drifted, so a
// raw-git content edit cannot ship a stale manifest. Regenerate with `npm run cairn:manifest`.
verifyManifest(buildSiteManifest(cairn, parseSiteConfig(siteYaml), { posts: postsRaw, pages: pagesRaw }), manifestRaw);
```

Confirm `serializeManifest`, `parseManifest`, and `verifyManifest` are exported from the main package entry (Task added them in `src/lib/index.ts`; see Task 12's export step, which must land before this showcase wiring compiles). Then generate the committed file:

```bash
cd examples/showcase && npm run cairn:manifest
```

- [ ] **Step 4: Build the showcase as the end-to-end gate**

Run the showcase production build:

```bash
cd examples/showcase && npm run build
```

Expected: the build succeeds; the prerendered hello post contains `href="/about"` (the resolved cairn link), and the committed manifest matched the corpus (no drift throw). Then prove the backstop by temporarily editing the post link to `cairn:pages/does-not-exist` and rebuilding: the build must FAIL with the not-found error. Revert the edit and rebuild green. Record both outcomes as evidence.

- [ ] **Step 5: Gate and commit**

Run the root `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add examples/showcase/src/lib/content.ts examples/showcase/src/lib/cairn.config.ts examples/showcase/scripts/build-manifest.mjs examples/showcase/package.json examples/showcase/src/content/.cairn/index.json examples/showcase/src/content/posts/
git commit -m "feat(showcase): wire the content manifest and link resolution

The showcase content layer regenerates and verifies the committed manifest at
build (failing on drift), a post links to the about page with a cairn: token
that resolves to its live permalink in the prerendered page, and a regenerate
script writes the canonical manifest. This is the end-to-end gate for the
content graph and the resolver.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 12: public exports and the version bump

**Files:**
- Modify: `src/lib/index.ts`
- Modify: `package.json`

Export the manifest surface a site needs, and bump the minor for the additive release.

> Sequencing note: the main-entry exports below are needed by the showcase wiring in Task 11 Step 3. If you executed Task 11 before this task, the showcase import of `serializeManifest`/`verifyManifest` from the main entry will not resolve. Land this task's export step before Task 11 Step 3, or move the export step earlier. The plan lists the version bump last so the release surface is final.

- [ ] **Step 1: Add the main-entry exports**

In `src/lib/index.ts`, add (near the other content re-exports):

```ts
export { parseCairnToken, extractCairnLinks } from './content/links.js';
export type { CairnRef, LinkResolve } from './content/links.js';
export {
  serializeManifest,
  parseManifest,
  emptyManifest,
  verifyManifest,
  upsertEntry,
  removeEntry,
  manifestEntryFromFile,
  manifestLinkResolver,
} from './content/manifest.js';
export type { Manifest, ManifestEntry, LinkTarget } from './content/manifest.js';
```

(`buildSiteManifest` and `buildLinkResolver` are exported from the delivery entry, added in Task 4.)

- [ ] **Step 2: Verify the package surface**

Run: `npm run check:package`
Expected: all-green across the existing entries, with the new exports resolving and no export-condition change.

- [ ] **Step 3: Bump the version**

In `package.json`, change `"version": "0.17.0"` to `"version": "0.18.0"` (additive minor: new exports, the optional `manifestPath` adapter field, the optional `resolve` render option, and the internal `EditData.linkTargets`; nothing a consuming site already wires breaks).

- [ ] **Step 4: Final gate**

Run `npm run check` (0/0), `npm test` (exit 0), and `npm run check:package` (green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/index.ts package.json
git commit -m "feat: export the content manifest surface, bump 0.18.0

Export the cairn: token helpers and the manifest operations from the main entry
(buildSiteManifest and buildLinkResolver ship from the delivery entry). The
surface is additive (new exports, an optional manifestPath, an optional resolve
render option), so the minor moves to 0.18.0.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification items (no implementation task)

- **The build never reads the manifest.** Confirm `buildLinkResolver` reads only the `SiteIndex`, and `entryLoad` passes it; the manifest is read only at request time (`editLoad`, `saveAction`) and regenerated at build (`buildSiteManifest`). So the build has no manifest dependency beyond the drift comparison.
- **`commitFile` still serves nav.** Confirm `src/lib/sveltekit/nav-routes.ts` still imports and uses `commitFile`, and only `content-routes.ts` moved to `commitFiles`.
- **The resolve step is upstream of the sanitize floor.** Confirm `remarkResolveCairnLinks` is in `remarkPlugins` (before `remarkRehype`), so the rewritten `href` is sanitized like any anchor.

## Pass-end review gate

This pass touches the GitHub commit path (the save now writes two files to `main`), the render pipeline (a new remark step on every page), and the admin editor. The gate runs: the simplifier over the changed code; `cloudflare-workers-reviewer` (Opus) for the `saveAction` atomic commit and the manifest read/patch; `svelte-reviewer` (Opus) for the `EditPage` resolver `$derived` and the preview effect; a high-effort `/code-review` focused on the resolver miss/throw policy, the canonical serialize/verify (a false-negative drift would let a stale manifest ship; a false-positive would block a valid build), and the save-path manifest patch under the `commitFiles` retry (the manifest blob is re-sent stale on a 422, last-writer-wins, accepted because the build reconciles). `daisyui-a11y-reviewer` applies lightly to the broken-link cue (it is a class the site styles, with the link text intact). The live `/admin` smoke (mint a D1 session, save an entry, confirm the commit carries both files) is best run during the ecnordic migration against a real Worker; record it as a carried fast-follow, since the showcase runs `adapter-node`, not a Worker.

## Self-review notes

- **Spec coverage.** This plan implements the design's Plan 2 (the committed manifest: builder, canonical serialize, drift verify, atomic save patch, settable path) in Tasks 2 through 5, 8, 10, and 11, and Plan 3 (the token, the resolver, the build backstop, the preview broken-link cue) in Tasks 1, 6, 7, and 9. The picker and the lifecycle guards stay separate later plans, as agreed when merging.
- **Decisions baked in.** The edge list is populated now (Task 2's `extractCairnLinks` in the row builder). Drafts are included and flagged (Task 2). The build reads the site index and the preview reads the manifest, one render with an injected resolver (Tasks 6, 7, 9). Drift fails the build with a regenerate command (Tasks 3, 11). The 422 retry re-sends the manifest blob last-writer-wins, accepted because the build reconciles (recorded in the save commit and the review gate).
- **No placeholders.** Every code step shows complete code. The three tests that must mirror an existing test harness (Task 7 public-routes, Task 8/10 content-routes, Task 9 EditPage) name the file to mirror and the exact assertions, since the existing double setup is the cheapest correct fixture and copying its shape avoids inventing a parallel one.
- **Type consistency.** `CairnRef`/`LinkResolve` live in `content/links.ts`; `ManifestEntry`/`Manifest`/`LinkTarget` and the operations in `content/manifest.ts`; `buildSiteManifest`/`buildLinkResolver` in `delivery/manifest.ts`. `renderMarkdown(content, { resolve })`, the adapter/runtime `render(md, { stagger?, resolve? })`, and `EditData.linkTargets` all use these same types. `manifestLinkResolver` and `buildLinkResolver` both return `LinkResolve`.
- **Versioning.** Additive surface (new exports, an optional adapter field, an optional render option, an internal `EditData` field), so the minor moves to `0.18.0`. A consuming site adopts the manifest at migration; nothing it already wires breaks.

---

## Post-mortem (executed 2026-06-02)

Executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet for the mechanical tasks, Opus for the atomic-save Task 10 and the showcase end-to-end Task 11). Fifteen commits, `cdabeef..c50fc47`, local only, not pushed, not published. The pass builds the committed content manifest and the `cairn:` link resolver end to end: an author writes `[guide](cairn:posts/<id>)`, it renders as the live permalink on the public page, a dangling target fails the build, and the editor preview marks a broken target.

### What landed

The thirteen plan tasks plus two review-gate commits. New pure modules: `src/lib/content/links.ts` (the `cairn:` token grammar, `parseCairnToken`/`extractCairnLinks`), `src/lib/content/manifest.ts` (the manifest types, the row builder, canonical serialize/parse, the drift verifier, the upsert/remove patch helpers, the preview resolver), `src/lib/delivery/manifest.ts` (`buildSiteManifest` over the corpus, `buildLinkResolver` backed by the site index), and `src/lib/render/resolve-links.ts` (the `remarkResolveCairnLinks` mdast step). The render pipeline threads a per-call resolver through `renderMarkdown` on a VFile, so the processor is still built once. `entryLoad` resolves cairn links at build against the site index and throws on a miss (the build backstop). `saveAction` moved off `commitFile` onto the Plan 1 `commitFiles`, reading the manifest, upserting the saved entry's row, and committing content and manifest in one commit. `editLoad` ships the manifest's `linkTargets` to the client, and `EditPage` builds a manifest-backed resolver from them so the preview resolves links and marks a missing target with the `cairn-broken-link` class. The showcase wires the whole path: a regenerate script, a build-time `verifyManifest`, a real `cairn:pages/about` link in the hello post, and the feeds resolving links to absolute URLs.

### Final gate

At the tip (`c50fc47`): `npm run check` 762 files 0/0, `npm test` 103 files / 519 tests exit 0, `npm run check:package` all-green across all five entries with no export-condition change. The end-to-end gate is the showcase production build: the prerendered hello post renders `<a href="/about">about page</a>` with no unresolved token, the feeds render `href="https://showcase.test/about"`, and the committed manifest matched the corpus (no drift throw). The backstop was proven by pointing the link at `cairn:pages/does-not-exist`, regenerating, and rebuilding: the build failed with `cairn link target not found: cairn:pages/does-not-exist` (exit 1). The link was reverted and the build went green.

### Decisions and corrections locked in

- **The slug rule matches content-index exactly.** Task 2 first hardcoded a `'day'` granularity to make a malformed fixture pass; that diverges from `content-index.ts` for any non-`day` concept and would resolve a cairn link to a different URL in the preview than the page is served at. Corrected to `slugFromId(id, descriptor.routing.dated ? descriptor.datePrefix : null)`, identical to the canonical rule, and the fixtures in Tasks 2 and 4 were fixed to pair a day-prefixed filename with `datePrefix: 'day'`. The manifest permalink now equals the content-index permalink by construction, so the preview resolver and the build resolver always agree.
- **The sanitize floor admits the inert `cairn:` href scheme.** Task 6 found the floor stripped an unresolved `cairn:` href, so the plan's "leaves a cairn link inert when no resolver is provided" case failed. Adding `cairn` to the href protocol allowlist (extend-only, the `javascript:`/`data:` strip preserved) lets an unresolved token survive as a visible inert signal. This admits-the-scheme choice has a consequence (see the feed regression below).
- **The build reads the site index, not the manifest.** `buildLinkResolver` reads the `SiteIndex`, fresh from the files at build, so the build has no manifest dependency beyond the drift comparison. The manifest is read only at request time (`editLoad`, `saveAction`).
- **TS-runner and dist facts (Task 11).** Node is v24, so the regenerate script runs TypeScript natively with no `tsx` loader. The showcase resolves `@glw907/cairn-cms` from the built `dist/` (gitignored), which `check:package` rebuilds, so the new exports were visible without a manual build. The script could not import the `@glw907/cairn-cms/delivery` barrel under plain Node (it re-exports a `.svelte` component Node cannot load), so it dynamically imports the svelte-free `delivery/manifest.js`; the Vite build path still imports the barrel.

### Review gate

The simplifier found nothing to change. Three Opus reviewers ran: `cloudflare-workers-reviewer` returned ship-it on the atomic save (no Critical, one Important that was comment-only), `svelte-reviewer` confirmed the `EditPage` resolver `$derived` and the preview effect are correct and sanitize-safe (one Minor hardening), and `daisyui-a11y-reviewer` flagged the broken-link cue as conveyed by class alone. Three findings folded in test-first as `81ec429`: the misleading "the build reconciles" comment corrected to state the build fails closed on a stale manifest, `resolveLink` hoisted into the synchronous preview-effect body so Svelte tracks it, and a `title="Broken internal link"` added to a broken cairn link so the cue is a text-bearing signal, not a class a site might style by color alone. A high-effort `/code-review` (four finder angles, recall-biased) surfaced one real regression folded in as `c50fc47`: the sanitize floor now admits `cairn:`, and the showcase feeds rendered post bodies without a resolver, so they shipped dead `cairn:pages/about` links; the feeds now thread an absolute-URL resolver. The live `/admin` smoke is a carried fast-follow (the showcase runs `adapter-node`, not a Worker; the integration project exercises the save path in workerd).

### Carried follow-ups

- **Render-without-resolver leaks a `cairn:` href.** The feed fix is the concrete instance; the general rule is that a site must pass a resolver wherever it renders a body to HTML (feeds, any rendered excerpt). Worth a documented contract caveat in the delivery/render docs, and a migration gotcha for the site passes.
- **A cairn link to a draft target resolves to a 404 permalink.** Both resolvers read entries by id, which includes drafts, but the public routes exclude drafts, so a published post linking a draft renders a live-looking link that 404s. A natural Plan 4 lifecycle-guard warning.
- **The manifest includes validation-failing entries; the site index excludes them.** Under `validate: false`, a cairn link to a malformed-frontmatter target resolves in the preview but throws "target not found" at build, blaming the link rather than the bad frontmatter. Reconcile or improve the message in Plan 4.
- **`parseManifest` validates only that `entries` is an array, not each entry's shape, and hardcodes `version: 1`.** A hand-edited or future-schema manifest could pass parse and then crash `serializeManifest` (a missing `links` array) outside the conflict catch, or be silently coerced to v1. The committed file is engine-generated, so this needs tampering or a future v2; add a per-entry guard and a version check when it matters.
- **`editLoad` reads the entry and the manifest sequentially.** Two independent GitHub reads on the admin edit-page load that could run with `Promise.all`. A small latency win, easy to fold into a later admin pass.
- **The concurrent-save manifest race fails closed.** On a `commitFiles` 422 retry the manifest blob is re-sent last-writer-wins, so two near-simultaneous saves can leave the committed manifest stale, which the next build rejects via `verifyManifest` (recoverable with `npm run cairn:manifest`). Near-impossible at cairn's single-digit write volume; closing it fully means recomputing the manifest blob inside the retry loop, over-engineering for now.
