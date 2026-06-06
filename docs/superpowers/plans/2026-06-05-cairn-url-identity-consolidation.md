# URL-identity consolidation Implementation Plan (engine-hardening pass 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (one `cairn-implementer` per task) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Run on `main` directly (Geoff's call for this series, same as passes 1 and 2: an internal refactor plus validation gated by check/test, no worktree).

**Goal:** collapse the two parallel URL-identity derivations into one shared unit each, so the manifest and the content index cannot drift on an entry's permalink and the runtime and delivery cannot drift on a concept's descriptor, and add loud build-time validation of the YAML URL policy.

**Architecture:** a new internal `src/lib/content/identity.ts` owns `entryIdentity(descriptor, path, frontmatter)` plus the shared `asDate`/`asString`/`asTags` coercion; `createContentIndex` and `manifestEntryFromFile` both call it. A new `resolveConcepts(content, siteConfig)` in `src/lib/content/concepts.ts` is the one path `composeRuntime` and `siteDescriptors` take. `normalizeConcepts` gains loud validation of the URL policy. No public export changes.

**Tech Stack:** TypeScript, vitest, the svelte-check and package gates (`npm run check`, `npm test`, `npm run check:reference`, `npm run check:package`).

**Design spec:** `docs/superpowers/specs/2026-06-05-cairn-url-identity-consolidation-design.md`.

---

## Conventions for this plan

**The gate per task.** The code tasks (1 through 5) clear the full gate: `npm run check` 0 errors and 0 warnings, `npm test` exits 0, `npm run check:reference` exits 0, and `npm run check:package` exits 0. The docs task (6) clears `npm run check:package` plus `prose-guard` on the changed prose.

**Test-first.** Each code task writes or extends the failing test, confirms it fails for the right reason, then makes it pass. Do not weaken a test to pass. Tasks 2, 3, and 4 are behavior-preserving refactors: the existing suites are the contract and stay green with the internals swapped, so the "failing test" for those is a quick confirmation the swap compiles and the suite still passes, plus the new parity test in Task 3.

**Behavior-preserving for valid configs.** Tasks 1 through 4 change no behavior. Task 5 adds validation: a malformed URL policy that was silently mis-defaulted now throws. A valid config (the three reference sites) is unaffected.

**`npm test` must exit 0.** A passing assertion count is not enough; an unhandled rejection can leave every test green while the process exits 1. Treat a non-zero exit as failure.

**Prose.** Any changelog or doc prose follows the writing-voice standard (no em dashes, one idea per sentence, no banned openers). `prose-guard` gates the changed `.md` files; the blocking hook is `prose-guard --hook <file>` (exit 0 = clean). Advisory sweep tells are non-blocking; do not chase them.

**Models.** Task 1 (the identity unit, the parity foundation) and Task 5 (the validation edges) carry the judgment, so dispatch them `model: opus`. Tasks 2, 3, 4 (mechanical swaps) and Task 6 (docs and version) fit the Sonnet default.

---

## Task 1: The `entryIdentity` unit and the shared coercion helpers

**Model:** Opus (this unit is the parity foundation; the content index and the manifest both depend on it producing one identity).

**Files:**
- Create: `src/lib/content/identity.ts`
- Create: `src/tests/unit/content-identity.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `src/tests/unit/content-identity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { entryIdentity, asDate, asString, asTags } from '../../lib/content/identity.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';
import { defineFields } from '../../lib/content/schema.js';

// A minimal descriptor for the identity unit. Only id, routing, permalink, and datePrefix matter here.
function descriptor(over: Partial<ConceptDescriptor> = {}): ConceptDescriptor {
  return {
    id: 'posts',
    label: 'Posts',
    dir: 'src/content/posts',
    routing: { routable: true, dated: true, inFeeds: true },
    permalink: '/posts/:slug',
    datePrefix: 'day',
    fields: defineFields([{ type: 'text', name: 'title', label: 'Title' }]).fields,
    summaryFields: [],
    validate: () => ({ ok: true, data: {} }),
    ...over,
  };
}

describe('entryIdentity', () => {
  it('strips the leading date prefix from a dated concept slug', () => {
    const identity = entryIdentity(descriptor(), 'src/content/posts/2026-05-01-hello.md', {
      date: '2026-05-01',
    });
    expect(identity.id).toBe('2026-05-01-hello');
    expect(identity.slug).toBe('hello');
    expect(identity.permalink).toBe('/posts/hello');
    expect(identity.date).toBe('2026-05-01');
  });

  it('keeps the id as the slug for a non-dated concept', () => {
    const pages = descriptor({
      id: 'pages',
      routing: { routable: true, dated: false, inFeeds: false },
      permalink: '/:slug',
      datePrefix: 'day',
    });
    const identity = entryIdentity(pages, 'src/content/pages/about.md', {});
    expect(identity.id).toBe('about');
    expect(identity.slug).toBe('about');
    expect(identity.permalink).toBe('/about');
    expect(identity.date).toBeUndefined();
  });

  it('substitutes date tokens from the frontmatter date', () => {
    const identity = entryIdentity(
      descriptor({ permalink: '/:year/:month/:day/:slug' }),
      'src/content/posts/2026-05-01-hello.md',
      { date: '2026-05-01' },
    );
    expect(identity.permalink).toBe('/2026/05/01/hello');
  });

  it('coerces an unquoted YAML date (a JS Date) to YYYY-MM-DD', () => {
    const identity = entryIdentity(descriptor(), 'src/content/posts/2026-05-01-hello.md', {
      date: new Date('2026-05-01T00:00:00Z'),
    });
    expect(identity.date).toBe('2026-05-01');
  });

  it('strips by the configured datePrefix granularity', () => {
    const monthly = descriptor({ datePrefix: 'month', permalink: '/:year/:month/:slug' });
    const identity = entryIdentity(monthly, 'src/content/posts/2026-05-hello.md', { date: '2026-05-01' });
    expect(identity.slug).toBe('hello');
    expect(identity.permalink).toBe('/2026/05/hello');
  });
});

describe('coercion helpers', () => {
  it('asString returns a non-empty string, else undefined', () => {
    expect(asString('hi')).toBe('hi');
    expect(asString('   ')).toBeUndefined();
    expect(asString(42)).toBeUndefined();
  });

  it('asDate slices a string date and reads a JS Date', () => {
    expect(asDate('2026-05-01')).toBe('2026-05-01');
    expect(asDate('2026-05-01T12:00:00Z')).toBe('2026-05-01');
    expect(asDate(new Date('2026-05-01T00:00:00Z'))).toBe('2026-05-01');
    expect(asDate('nope')).toBeUndefined();
    expect(asDate(undefined)).toBeUndefined();
  });

  it('asTags returns an array, empty when absent', () => {
    expect(asTags(['a', 'b'])).toEqual(['a', 'b']);
    expect(asTags(undefined)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- src/tests/unit/content-identity.test.ts`
Expected: FAIL, because `src/lib/content/identity.ts` does not exist yet (import error).

- [ ] **Step 3: Implement the unit**

Create `src/lib/content/identity.ts`:

```ts
// cairn-cms: a content entry's URL identity in one place (engine-hardening pass 3). The id, the
// slug, the date, and the permalink are computed here, so the content index and the manifest cannot
// drift on what an entry's URL is. A cairn: link resolves through the manifest in the admin preview
// and through the content index in the public build, so the two must agree by construction.
import { idFromFilename, slugFromId } from './ids.js';
import { permalink } from './permalink.js';
import type { ConceptDescriptor } from './types.js';

/** A content entry's resolved URL identity. */
export interface EntryIdentity {
  id: string;
  slug: string;
  date?: string;
  permalink: string;
}

/** The basename of a glob path: the segment after the last slash, or the whole path. */
function basename(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(slash + 1) : path;
}

/** A present, non-empty string, else undefined. The read-model string coercion. */
export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** A YYYY-MM-DD date. An unquoted YAML date parses as a JS Date; a string is sliced to its date head. */
export function asDate(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return undefined;
}

/** Tags as an array, empty when the file declares none. */
export function asTags(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/**
 * Resolve a content entry's URL identity from its concept descriptor, its file path, and its parsed
 * frontmatter. The slug strips the leading date prefix for a dated concept and is the id verbatim for
 * an undated one. The permalink is the one resolver every reader shares. The caller parses the markdown
 * once and passes the frontmatter, so there is no second parse here.
 */
export function entryIdentity(
  descriptor: ConceptDescriptor,
  path: string,
  frontmatter: Record<string, unknown>,
): EntryIdentity {
  const id = idFromFilename(basename(path));
  const slug = slugFromId(id, descriptor.routing.dated ? descriptor.datePrefix : null);
  const date = asDate(frontmatter.date);
  return { id, slug, date, permalink: permalink(descriptor, { id, slug, date }) };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- src/tests/unit/content-identity.test.ts`
Expected: PASS, all cases green.

- [ ] **Step 5: Run the full gate**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
```

Expected: `npm run check` 0/0, `npm test` exit 0, `npm run check:reference` exit 0, `npm run check:package` exit 0. The unit is internal (added to no barrel), so `check:reference` and `check:package` stay green with no reference edit.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content/identity.ts src/tests/unit/content-identity.test.ts
git commit -m "$(cat <<'EOF'
Add entryIdentity: one home for a content entry's URL identity

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Commit only those two files. The repo has an untracked `.claude/` directory; do not touch or add it.

---

## Task 2: Route `createContentIndex` through `entryIdentity`

**Model:** Sonnet (a mechanical swap; the existing content-index suite is the contract).

**Files:**
- Modify: `src/lib/delivery/content-index.ts`

- [ ] **Step 1: Confirm the content-index suite is green before the change**

Run: `npm test -- src/tests/unit/delivery-content-index.test.ts`
Expected: PASS. This is the contract the refactor must preserve. (If the file name differs, find it with `ls src/tests/unit | grep content-index`.)

- [ ] **Step 2: Swap the imports**

In `src/lib/delivery/content-index.ts`, replace the two content imports

```ts
import { idFromFilename, slugFromId } from '../content/ids.js';
import { permalink } from '../content/permalink.js';
```

with one import from the new identity module:

```ts
import { entryIdentity, asDate, asString, asTags } from '../content/identity.js';
```

The local `asString`, `asDate`, and `asTags` helpers (the three small functions defined in this file, currently near the `basename` helper) are now imported, so delete their local definitions. The local `basename` function is now only used inside `entryIdentity`, so delete the local `basename` from this file too. After the edit, `grep -n 'function basename\|function asString\|function asDate\|function asTags' src/lib/delivery/content-index.ts` returns nothing.

- [ ] **Step 3: Use `entryIdentity` in the build loop**

In `createContentIndex`, the per-file loop currently computes `id`, `slug`, parses the markdown, then computes `date` and `permalink` inline. Replace the head of the loop body so the markdown is parsed first, then the identity is derived once. The loop body becomes:

```ts
  for (const file of files) {
    const { frontmatter: raw, body } = parseMarkdown(file.raw);
    const { id, slug, date, permalink } = entryIdentity(descriptor, file.path, raw);
    const draft = raw.draft === true;
    // Validate once at build. A failure is recorded for the site gate and excluded from the typed
    // read, so every readable entry's frontmatter is the validator's normalized output, never raw.
    const result = descriptor.validate(raw, body);
    if (!result.ok) {
      problems.push({ id, draft, errors: result.errors });
      continue;
    }
    const summaryFieldValues: Record<string, unknown> = {};
    for (const key of descriptor.summaryFields) {
      if (key in result.data) summaryFieldValues[key] = result.data[key];
    }
    entries.push({
      concept: descriptor.id,
      id,
      slug,
      permalink,
      title: asString(raw.title) ?? id,
      date,
      updated: asDate(raw.updated),
      tags: asTags(raw.tags),
      excerpt: deriveExcerpt(body, { description: asString(raw.description) }),
      wordCount: wordCount(body),
      draft,
      fields: summaryFieldValues,
      frontmatter: result.data as F,
      body,
    });
  }
```

The `permalink` here is the destructured identity value, so this file no longer references the `permalink` function. The rest of `createContentIndex` (the sort, the returned query methods) is unchanged.

- [ ] **Step 4: Run the content-index suite**

Run: `npm test -- src/tests/unit/delivery-content-index.test.ts`
Expected: PASS, unchanged from Step 1.

- [ ] **Step 5: Run the full gate**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
```

Expected: all green as in Task 1 Step 5.

- [ ] **Step 6: Commit**

```bash
git add src/lib/delivery/content-index.ts
git commit -m "$(cat <<'EOF'
Route createContentIndex through entryIdentity

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Route `manifestEntryFromFile` through `entryIdentity` and lock the parity invariant

**Model:** Sonnet (a mechanical swap plus one new cross-check test).

**Files:**
- Modify: `src/lib/content/manifest.ts`
- Create: `src/tests/unit/content-permalink-parity.test.ts`

- [ ] **Step 1: Write the failing parity test**

Create `src/tests/unit/content-permalink-parity.test.ts`. It proves the content index and the manifest produce the same permalink for the same file, the invariant that was a comment.

```ts
import { describe, it, expect } from 'vitest';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { manifestEntryFromFile } from '../../lib/content/manifest.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { defineFields } from '../../lib/content/schema.js';

describe('permalink parity: content index and manifest agree', () => {
  const [descriptor] = normalizeConcepts(
    { posts: { dir: 'p', schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]) } },
    { posts: { permalink: '/posts/:slug', datePrefix: 'day' } },
  );
  const file = { path: 'p/2026-05-01-hello.md', raw: '---\ntitle: Hello\n---\nbody\n' };

  it('produces one permalink for the same dated entry', () => {
    const [summary] = createContentIndex([file], descriptor).all();
    const entry = manifestEntryFromFile(descriptor, file);
    expect(entry.permalink).toBe(summary.permalink);
    expect(entry.permalink).toBe('/posts/hello');
  });
});
```

- [ ] **Step 2: Run the parity test to confirm it passes against the current code**

Run: `npm test -- src/tests/unit/content-permalink-parity.test.ts`
Expected: PASS. The parity holds today (both copies use the same rule); this test pins it so the refactor and any future change cannot break it silently. (If it does not pass against the current code, stop: the assumption is wrong and the refactor needs rethinking.)

- [ ] **Step 3: Swap the manifest imports and use `entryIdentity`**

In `src/lib/content/manifest.ts`, replace

```ts
import { idFromFilename, slugFromId } from './ids.js';
import { parseMarkdown } from './frontmatter.js';
import { permalink } from './permalink.js';
```

with

```ts
import { parseMarkdown } from './frontmatter.js';
import { entryIdentity, asString } from './identity.js';
```

Delete the local `basename`, `asString`, and `asDate` helper functions from this file (they are now in `identity.ts`; `asString` is imported, the others are no longer used here). After the edit, `grep -n 'function basename\|function asString\|function asDate' src/lib/content/manifest.ts` returns nothing.

Rewrite `manifestEntryFromFile` to derive the identity once:

```ts
/** Build one manifest entry from a content file. Drafts are included and flagged. The id, date, and
 *  permalink come from entryIdentity, the same source content-index uses, so a cairn: link resolves to
 *  one URL whether the admin preview reads the manifest or the public build reads the content index. */
export function manifestEntryFromFile(descriptor: ConceptDescriptor, file: { path: string; raw: string }): ManifestEntry {
  const { frontmatter, body } = parseMarkdown(file.raw);
  const { id, date, permalink } = entryIdentity(descriptor, file.path, frontmatter);
  return {
    id,
    concept: descriptor.id,
    title: asString(frontmatter.title) ?? id,
    date,
    permalink,
    draft: frontmatter.draft === true,
    links: extractCairnLinks(body),
  };
}
```

The `permalink` here is the destructured identity value, so this file no longer references the `permalink` function.

- [ ] **Step 4: Run the manifest suite and the parity test**

Run: `npm test -- src/tests/unit/content-manifest.test.ts src/tests/unit/content-permalink-parity.test.ts`
Expected: PASS. (Find the manifest test filename with `ls src/tests/unit | grep manifest` if it differs; there may be more than one manifest test file, run them all.)

- [ ] **Step 5: Run the full gate**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content/manifest.ts src/tests/unit/content-permalink-parity.test.ts
git commit -m "$(cat <<'EOF'
Route manifest through entryIdentity and lock permalink parity

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: One concept-resolution path for the runtime and the delivery layer

**Model:** Sonnet (a mechanical extract-and-rewire; the compose and site-descriptors suites are the contract).

**Files:**
- Modify: `src/lib/content/concepts.ts`
- Modify: `src/lib/content/compose.ts`
- Modify: `src/lib/delivery/site-descriptors.ts`

- [ ] **Step 1: Confirm the contract suites are green**

Run: `npm test -- src/tests/unit/content-compose.test.ts src/tests/unit/delivery-site-descriptors.test.ts`
Expected: PASS. These prove the runtime and delivery descriptor derivations; the refactor must preserve them.

- [ ] **Step 2: Add `resolveConcepts` to `concepts.ts`**

In `src/lib/content/concepts.ts`, add the site-config import at the top (after the existing `types.js` import):

```ts
import { urlPolicyFrom, type SiteConfig } from '../nav/site-config.js';
```

This edge is safe: `nav/site-config.ts` imports only a type from `content/types.js`, so there is no runtime cycle. Then add `resolveConcepts` after `normalizeConcepts` (and before `findConcept`):

```ts
/**
 * Resolve a site's concept descriptors from its content map and parsed site config. The admin runtime
 * (composeRuntime) and the delivery layer (siteDescriptors) both call this, so the per-concept URL
 * policy is derived once from the YAML and the runtime and delivery permalinks cannot diverge.
 */
export function resolveConcepts(
  content: Record<string, ConceptConfig | undefined>,
  siteConfig: SiteConfig,
): ConceptDescriptor[] {
  return normalizeConcepts(content, urlPolicyFrom(siteConfig));
}
```

`ConceptConfig` and `ConceptDescriptor` are already imported in this file.

- [ ] **Step 3: Use `resolveConcepts` in `composeRuntime`**

In `src/lib/content/compose.ts`, change the imports. Replace

```ts
import { normalizeConcepts } from './concepts.js';
import { urlPolicyFrom, type SiteConfig } from '../nav/site-config.js';
```

with

```ts
import { resolveConcepts } from './concepts.js';
import type { SiteConfig } from '../nav/site-config.js';
```

Then change the `concepts` line in the returned runtime from

```ts
    concepts: normalizeConcepts(content, urlPolicyFrom(siteConfig)),
```

to

```ts
    concepts: resolveConcepts(content, siteConfig),
```

The `siteConfig` guard and the extension-merge of `content` above it are unchanged, so `resolveConcepts` still receives the extension-merged content.

- [ ] **Step 4: Collapse `siteDescriptors` onto `resolveConcepts`**

Replace the body of `src/lib/delivery/site-descriptors.ts` with:

```ts
// cairn-cms: the one-call descriptor helper. A delivery site needs the same per-concept descriptors
// the admin runtime uses; this delegates to the shared resolveConcepts so the pairing is one path, not
// tribal knowledge. The YAML URL policy stays the single source of truth.
import { resolveConcepts } from '../content/concepts.js';
import type { CairnAdapter, ConceptDescriptor } from '../content/types.js';
import type { SiteConfig } from '../nav/site-config.js';

/** Per-concept descriptors for a site, from its adapter content and its parsed site config. */
export function siteDescriptors(adapter: CairnAdapter, siteConfig: SiteConfig): ConceptDescriptor[] {
  return resolveConcepts(adapter.content, siteConfig);
}
```

- [ ] **Step 5: Run the contract suites, then the full gate**

```bash
npm test -- src/tests/unit/content-compose.test.ts src/tests/unit/delivery-site-descriptors.test.ts
npm run check
npm test
npm run check:reference
npm run check:package
```

Expected: the two suites PASS unchanged, then all gates green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content/concepts.ts src/lib/content/compose.ts src/lib/delivery/site-descriptors.ts
git commit -m "$(cat <<'EOF'
Share one concept-resolution path across runtime and delivery

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Loud build-time validation of the YAML URL policy

**Model:** Opus (the validation rules and their edges carry the judgment; this is the one behavior change).

**Files:**
- Modify: `src/lib/content/concepts.ts`
- Modify: `src/tests/unit/content-concepts.test.ts`

- [ ] **Step 1: Write the failing validation tests**

Append to the `describe('normalizeConcepts URL policy', ...)` block in `src/tests/unit/content-concepts.test.ts` (the `cfg` constant `{ dir: 'd', schema: defineFields([]) }` already exists above that block):

```ts
  it('throws when the URL policy names a concept that is not declared', () => {
    expect(() => normalizeConcepts({ posts: cfg }, { events: { permalink: '/:slug' } })).toThrow(
      'cairn: URL policy names concept "events", which is not declared under content',
    );
  });

  it('throws on a permalink without a leading slash', () => {
    expect(() => normalizeConcepts({ posts: cfg }, { posts: { permalink: 'posts/:slug' } })).toThrow(
      'must start with "/"',
    );
  });

  it('throws on an unknown permalink token', () => {
    expect(() => normalizeConcepts({ posts: cfg }, { posts: { permalink: '/:category/:slug' } })).toThrow(
      'unknown token ":category"',
    );
  });

  it('throws on a date token in a non-dated concept', () => {
    expect(() => normalizeConcepts({ pages: cfg }, { pages: { permalink: '/:year/:slug' } })).toThrow(
      'cannot use the date token ":year"',
    );
  });

  it('throws on an out-of-range datePrefix', () => {
    expect(() =>
      // @ts-expect-error the YAML is untyped at runtime, so an invalid datePrefix must be caught
      normalizeConcepts({ posts: cfg }, { posts: { datePrefix: 'weekly' } }),
    ).toThrow('datePrefix "weekly" must be one of year, month, day');
  });

  it('accepts the reference sites\' valid policies', () => {
    expect(() =>
      normalizeConcepts({ posts: cfg }, { posts: { permalink: '/:year/:month/:day/:slug', datePrefix: 'day' } }),
    ).not.toThrow();
    expect(() =>
      normalizeConcepts({ posts: cfg }, { posts: { permalink: '/:year/:month/:slug', datePrefix: 'month' } }),
    ).not.toThrow();
  });
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npm test -- src/tests/unit/content-concepts.test.ts`
Expected: the five new throw-cases FAIL (no validation yet, so the calls return descriptors instead of throwing). The "accepts valid policies" case passes already. The five failing is the signal.

- [ ] **Step 3: Add the validation to `normalizeConcepts`**

In `src/lib/content/concepts.ts`, add the validation constants and helper above `normalizeConcepts` (after `defaultPermalink`):

```ts
/** Permalink tokens the resolver understands. */
const KNOWN_TOKENS = new Set(['slug', 'year', 'month', 'day']);
/** The date-bearing tokens; valid only for a dated concept. */
const DATE_TOKENS = new Set(['year', 'month', 'day']);
/** The valid date-prefix granularities. A runtime check, since the YAML is untyped. */
const DATE_PREFIXES = new Set<string>(['year', 'month', 'day']);

/**
 * Validate one concept's URL policy at build, so a misconfigured permalink or datePrefix fails loudly
 * here rather than emitting a wrong or defaulted URL at render. The permalink must be root-relative and
 * use only known tokens, a date token requires a dated concept, and the datePrefix must be in range.
 */
function validateUrlPolicy(id: string, policy: ConceptUrlPolicy, dated: boolean): void {
  if (policy.permalink !== undefined) {
    const pattern = policy.permalink;
    if (!pattern.startsWith('/')) {
      throw new Error(`cairn: concept "${id}" permalink "${pattern}" must start with "/"`);
    }
    for (const match of pattern.matchAll(/:(\w+)/g)) {
      const token = match[1];
      if (!KNOWN_TOKENS.has(token)) {
        throw new Error(`cairn: concept "${id}" permalink "${pattern}" uses unknown token ":${token}"`);
      }
      if (DATE_TOKENS.has(token) && !dated) {
        throw new Error(
          `cairn: concept "${id}" is not dated, so permalink "${pattern}" cannot use the date token ":${token}"`,
        );
      }
    }
  }
  if (policy.datePrefix !== undefined && !DATE_PREFIXES.has(policy.datePrefix)) {
    throw new Error(
      `cairn: concept "${id}" datePrefix "${policy.datePrefix}" must be one of year, month, day`,
    );
  }
}
```

Then, inside `normalizeConcepts`, add the unknown-concept-key check before the loop and call `validateUrlPolicy` inside it. The unknown-key check goes right after the `descriptors` array is declared:

```ts
  const descriptors: ConceptDescriptor[] = [];
  const declaredConcepts = new Set(Object.keys(content));
  for (const key of Object.keys(urlPolicy)) {
    if (!declaredConcepts.has(key)) {
      throw new Error(`cairn: URL policy names concept "${key}", which is not declared under content`);
    }
  }
```

Inside the loop, hoist the routing rule into a const so the date-token check can read `dated`, and call the validator. The loop body that builds a descriptor becomes:

```ts
  for (const [id, config] of Object.entries(content)) {
    if (!config) continue;
    const summaryFields = config.summaryFields ?? [];
    const declared = new Set(config.schema.fields.map((field) => field.name));
    const undeclared = summaryFields.find((key) => !declared.has(key));
    if (undeclared !== undefined) {
      throw new Error(
        `cairn: concept "${id}" summaryFields key "${undeclared}" is not a declared field`,
      );
    }
    const conceptRouting = routing[id] ?? DEFAULT_ROUTING;
    const policy = urlPolicy[id] ?? {};
    validateUrlPolicy(id, policy, conceptRouting.dated);
    descriptors.push({
      id,
      label: config.label ?? defaultLabel(id),
      dir: config.dir,
      routing: conceptRouting,
      permalink: policy.permalink ?? defaultPermalink(id),
      datePrefix: policy.datePrefix ?? 'day',
      fields: config.schema.fields,
      summaryFields,
      validate: config.schema.validate,
    });
  }
```

`ConceptUrlPolicy` is already imported in this file (it is in the `types.js` import line). Confirm it is in that import; if not, add it.

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npm test -- src/tests/unit/content-concepts.test.ts`
Expected: PASS, all cases green including the six new ones.

- [ ] **Step 5: Run the full gate**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
```

Expected: all green. Watch the `@ts-expect-error` in the test: `npm run check` must stay 0 warnings, so the directive must suppress a real invalid-`datePrefix` type error. If `check` reports the directive is unused, the test's type is wrong; fix the test, not the directive.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content/concepts.ts src/tests/unit/content-concepts.test.ts
git commit -m "$(cat <<'EOF'
Validate the YAML URL policy at build

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Documentation, changelog, and version bump

**Model:** Sonnet (mechanical doc and version changes).

**Files:**
- Modify: `docs/explanation/content-model.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json`

- [ ] **Step 1: Document the URL-policy validation in the explanation**

Read `docs/explanation/content-model.md` first to match its structure and voice. Find the URL identity section (the part covering the permalink pattern, the `datePrefix`, and the YAML URL policy). Add a short paragraph stating that the URL policy is validated at build. Cover these facts in the doc's own prose.

- A permalink pattern must be root-relative (start with `/`) and use only the tokens `:slug`, `:year`, `:month`, and `:day`.
- A date token is valid only on a dated concept.
- A `datePrefix` must be `year`, `month`, or `day`.
- A URL policy keyed to a concept that the site does not declare under `content` fails the build.
- A malformed policy throws a named error at build rather than emitting a wrong or defaulted URL.

Keep the prose clean (no em dashes, one idea per sentence, fold any list in with a word like "including" rather than a setup-colon). If the file has no distinct URL identity section, add the paragraph to the section that discusses URL identity or the site config, wherever the permalink and `datePrefix` are described.

- [ ] **Step 2: Add the changelog entry**

Read the top of `CHANGELOG.md` to match its format and house style, then add a `0.29.0` entry above the current latest (`0.28.0`). This is an internal consolidation plus a stricter build-time validation, so it carries no `Consumers must:` line (a valid config needs no action). Use this content, adapting the formatting to the file's house style:

```markdown
## 0.29.0

Consolidated the URL-identity model. A content entry's id, slug, date, and permalink are now derived in
one place (`entryIdentity`), so the content index and the manifest cannot drift on an entry's URL, and a
site's concept descriptors are resolved through one path shared by the admin runtime and the delivery
layer. No public surface changed.

The YAML URL policy is now validated at build. A permalink pattern must be root-relative and use only the
tokens `:slug`, `:year`, `:month`, and `:day`, a date token is valid only on a dated concept, a
`datePrefix` must be `year`, `month`, or `day`, and a policy keyed to an undeclared concept fails the
build.

Behavior note: a site whose `content:` URL policy was malformed and silently defaulted will now fail the
build with a named error. A valid policy is unaffected.
```

If the changelog's setup-colon list trips the prose guard, fold the token list into the sentence with "including" or split it into separate sentences, keeping every fact.

- [ ] **Step 3: Bump the version**

In `package.json`, change `"version": "0.28.0"` to `"version": "0.29.0"`. Verify it currently reads `0.28.0` before editing; if it reads something else, stop and report.

- [ ] **Step 4: Verify and commit**

```bash
prose-guard --hook docs/explanation/content-model.md
prose-guard --hook CHANGELOG.md
npm run check:package
```

Expected: both `prose-guard --hook` calls exit 0 (no blocking tell; advisory sweep tells from a bare `prose-guard <file>` are non-blocking and do not apply to the hook), and `check:package` exits 0.

```bash
git add docs/explanation/content-model.md CHANGELOG.md package.json
git commit -m "$(cat <<'EOF'
Bump 0.29.0 and document the URL-policy validation

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Commit only those three files. Do not touch the untracked `.claude/` directory.

---

## Task ordering

Sequence: **1, 2, 3, 4, 5, 6.** Task 1 builds the shared identity unit. Tasks 2 and 3 route the two readers through it, with Task 3 locking the parity invariant as a test. Task 4 shares the one concept-resolution path. Task 5 adds the loud validation, the one behavior change. Task 6 records it in the docs, the changelog, and the version. All six run on `main`.

## Phase-end ritual

After all tasks commit, before declaring the pass done:

- [ ] `npm run check` 0/0, `npm test` exit 0, `npm run check:reference` exit 0, `npm run check:package` exit 0 on `main`.
- [ ] Run the code-simplifier over the changed `src/lib/content` and `src/lib/delivery` files before the final review (per the repo git convention).
- [ ] Review gate: a high-effort `/code-review` with attention to the permalink-parity invariant and the validation edges (the token scan, the date-token-on-undated check, the unknown-concept-key check). The Worker, auth, Svelte, and a11y reviewers and the live `/admin` smoke do not apply (no auth, Worker, or admin-UI surface change).
- [ ] Append the post-mortem to this plan and update `docs/STATUS.md`: URL-identity consolidation landed as `0.29.0` (unpublished); the three-pass engine-hardening series is complete; the next action is to publish the held window (`0.27.0` + `0.28.0` + `0.29.0` over the `0.26.0` `latest`), then P4 (the scaffolder).
- [ ] Refresh the `cairn-engine-hardening-release-gate` memory (series complete, pass 3 landed) and the `cairn-url-identity-model` memory (the model is now consolidated behind `entryIdentity` and `resolveConcepts`, with build-time validation).

## Self-review notes (already applied)

- Every spec move maps to a task: the entry-identity unit (Task 1), its two consumers (Tasks 2 and 3), the parity invariant as a test (Task 3), the shared concept-resolution path (Task 4), the loud validation (Task 5), and the docs, changelog, and version (Task 6).
- The two new units are internal (added to no barrel), so `check:reference` and `check:package` stay green with no reference-page edit, matching the design's no-public-surface decision.
- Type and name consistency across tasks: `entryIdentity(descriptor, path, frontmatter)` returns `{ id, slug, date?, permalink }` (Task 1) and is destructured the same way in Task 2 and Task 3; `asString`/`asDate`/`asTags` are defined and exported in Task 1 and imported in Tasks 2 and 3; `resolveConcepts(content, siteConfig)` is defined in Task 4 Step 2 and called identically in Steps 3 and 4; `validateUrlPolicy(id, policy, dated)` and the `KNOWN_TOKENS`/`DATE_TOKENS`/`DATE_PREFIXES` sets are all defined in Task 5 Step 3.
- The refactor tasks (2, 3, 4) are behavior-preserving: each runs its contract suite before and after, and the parity test pins the one invariant that a comment used to hold.
- The `permalink()` resolver keeps its per-entry token and date checks as a backstop; Task 5 adds the declaration-time checks without removing them, so a descriptor built directly in a test (not through `normalizeConcepts`) still fails safe.
- The one behavior change (Task 5 validation) is scoped, tested for both the throw cases and the reference sites' valid policies, and recorded in the changelog with a behavior note and no `Consumers must:` line.

---

## Post-mortem (executed 2026-06-05, landed on `main` as `0.29.0`, unpublished)

The pass ran subagent-driven, one `cairn-implementer` per task on `main` directly (no worktree, same as
passes 1 and 2). Tasks 1 and 5 ran on Opus, Tasks 2, 3, 4, and 6 on the Sonnet default. Six task commits
`6554673..ababec2`, a simplifier commit `8c57c52`, and a review fold-in `b9f025c`.

**What landed.** `entryIdentity` in the new `src/lib/content/identity.ts` is the one home for a content
entry's id, slug, date, and permalink, alongside the shared `asString`/`asDate`/`asTags` coercion and an
`entryId(path)` helper. `createContentIndex` and `manifestEntryFromFile` both derive their identity through
it, so the content index and the manifest cannot drift on an entry's URL. A `content-permalink-parity` test
pins that the two produce one permalink for the same file. `resolveConcepts(content, siteConfig)` in
`concepts.ts` is the one concept-resolution path that `composeRuntime` and `siteDescriptors` both take, so
the per-concept URL policy is derived once from the YAML. `normalizeConcepts` now validates the URL policy
at build: a permalink must be root-relative and use only `:slug`/`:year`/`:month`/`:day`, a date token
requires a dated concept, a `datePrefix` must be `year`/`month`/`day`, and a policy keyed to an undeclared
concept throws a named error. No public surface changed, so `check:reference` and `check:package` stayed
green with no reference edit.

**Gate at the tip `b9f025c`, run first-hand.** `npm run check` 790 files 0/0, `npm test` 117 files / 701
tests exit 0, `npm run check:reference` exit 0, `npm run check:package` exit 0.

**The review gate caught one real regression, folded in as `b9f025c`.** Routing `createContentIndex`
through `entryIdentity` (Task 2) moved the throwing `permalink()` call to the top of the per-file loop,
before the `descriptor.validate` gate. For a dated concept whose schema declares `date` as required and
whose permalink carries a date token (the shape both production sites use), an entry missing its `date`
previously failed validation, was recorded as a `ContentProblem`, and the build continued. The reorder made
that one bad entry throw and abort the whole index build, breaking the pass's own behavior-preserving
invariant and defeating cairn's graceful-degradation path. The regression was confirmed empirically against
the built `dist` before the fix. The fold-in restores the validate-before-permalink ordering: `id` is
derived via the new `entryId` before the gate for the problems path, and `slug`/`date`/`permalink` come from
`entryIdentity` only after the gate passes. A regression test pins that a missing-date entry on a
date-required dated concept degrades to a recorded problem rather than a crash. The same fold-in tightened
the unknown-concept guard to filter `undefined`-valued content keys, so a URL policy keyed to a
declared-but-undefined concept throws the same named error instead of being silently dropped, with its own
test.

**The manifest path was not regressed.** `manifestEntryFromFile` always resolved the permalink with no
validate gate in front of it, so a missing-date entry on a date-token concept threw before this pass too.
That behavior is preserved.

**Two carry-forwards for a later touch (recorded, not fixed here).** (1) `siteDescriptors` calls
`resolveConcepts(adapter.content, siteConfig)` with no extension-content merge, while `composeRuntime` merges
extensions first. With the new unknown-concept guard, an extension concept keyed in the YAML URL policy would
throw in the delivery build while the admin runtime accepts it. The combination is unused today (no shipped
extension adds a concept and keys a URL policy to it), and fixing it means deciding whether the delivery
layer should see extension concepts at all, a design question beyond this pass. (2) The validator and the
`permalink()` resolver each hold their own copy of the token vocabulary (`:slug`/`:year`/`:month`/`:day`),
and the validator and `ids.ts` each restate the date-prefix granularity set. The duplication is small and
the values co-evolve rarely, so the simplifier left the sets separate by intent; a future touch could derive
them from one source.

**Pre-publish check the validation raises.** A site whose committed `site.config.yaml` carries a malformed
URL policy that was silently defaulted will now fail its build on upgrade to `0.29.0`. The two production
sites live in separate repos and are not exercised by this repo's fixtures, so verify ecnordic's and 907's
committed `content:` blocks against the new validation before publishing the held window.

**Series complete.** This was the last of the three-pass engine-hardening series. The next action is to
publish the held window (`0.27.0` + `0.28.0` + `0.29.0` over the `0.26.0` `latest`), then the resequenced
cleanup, then the gallery, then P4.
