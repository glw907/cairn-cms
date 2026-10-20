# Content Graph Plan 4: content lifecycle (delete) and the integrity guards

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the content delete path, the delete guard (block-until-clean, naming inbound links), and the save guard (hard-block a dangling `cairn:` link with a one-click unwrap-to-text fix, warn a draft target), plus four carried link-integrity follow-ups.

**Architecture:** Pure helpers carry the logic (`escapeLinkText`, `unwrapCairnLink`, `inboundLinks`, the hardened `parseManifest`) so they unit-test without a backend. The save guard and the delete path live in `content-routes.ts` and test against the same `fetch` double as the existing save tests. The delete UI is a `DeleteDialog` plus `EditPage` wiring. Rename and the multi-file inbound rewrite are out of scope (Plan 5).

**Tech Stack:** TypeScript, Svelte 5 runes, SvelteKit actions (`fail`/`redirect`), CodeMirror 6, vitest (unit + `vitest-browser-svelte` component project).

**Design reference:** `docs/superpowers/specs/2026-06-02-cairn-content-graph-04-lifecycle-design.md` (approved).

---

## Conventions for every task

- Work in `/home/glw907/Projects/cairn/cairn-cms` on branch `main`. A cairn-cms push deploys no site, so this additive pass runs on `main` directly.
- Test-first (TDD): write or change the failing test, run it and watch it fail for the right reason, implement the minimal code, watch it pass.
- Full gate before each commit: `npm run check` reports 0 errors and 0 warnings, and `npm test` EXITS 0 (it runs `unit`, `component`, and `integration`). A passing assertion count is not enough; an unhandled rejection can leave tests green while the process exits 1.
- Commit specific files, never `git add -A`. Commit footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies or code comments; plain voice.
- Known flake: CodeMirror-mounting component tests can fail once on a mount timeout under parallel load. If `npm test` exits non-zero solely on a CodeMirror mount timeout on an unrelated case, re-run once to confirm green.
- `npm run check` can fail solely on the showcase `svelte.config.js` (it imports `@sveltejs/adapter-node`) unless the showcase deps are installed. The svelte-check scan itself is 0/0 either way; if the showcase config import is the only failure, the 0/0 scan result is the gate.

## Reference values (verified against the live tree, 2026-06-02)

- `src/lib/content/manifest.ts` exports `interface ManifestEntry { id; concept; title; date?; permalink; draft; links: CairnRef[] }`, `interface Manifest { version: 1; entries: ManifestEntry[] }`, `interface LinkTarget`, `manifestEntryFromFile`, `emptyManifest`, `serializeManifest`, `parseManifest`, `verifyManifest`, `upsertEntry`, `removeEntry(manifest, concept, id)`, and `manifestLinkResolver`. This plan adds `inboundLinks` and hardens `parseManifest`.
- `src/lib/content/links.ts` exports `parseCairnToken`, `formatCairnToken`, `extractCairnLinks`, and the types `CairnRef` (`{ concept; id }`) and `LinkResolve`. This plan adds `escapeLinkText`.
- `src/lib/components/markdown-format.ts` exports `type FormatKind`, `interface FormatResult { doc; from; to }`, `applyMarkdownFormat`, and `insertInlineLink(doc, from, to, href, title)`. This plan adds `unwrapCairnLink` and escapes the `insertInlineLink` title branch.
- `src/lib/components/link-completion.ts` exports `matchCairnTrigger`, `linkCompletions(targets, query)`, and `cairnLinkCompletionSource(targets)`. This plan escapes the `apply` string and adds a code-block skip to the source.
- `src/lib/components/MarkdownEditor.svelte` has `insertLink(href, title)` (Plan 3, around line 111), which returns early when `!view`. `insertAtCursor` (around line 99) has a pre-mount fallback that appends to `value`. This plan gives `insertLink` the same fallback.
- `src/lib/components/LinkPicker.svelte`'s `groups` `$derived.by` sorts by `rank(a) - rank(b) || a.localeCompare(b)`, comparing the raw concept id on a tie. This plan sorts by the display heading on a tie.
- `src/lib/sveltekit/content-routes.ts` exports `createContentRoutes(runtime, deps)` returning `{ layoutLoad, indexRedirect, listLoad, createAction, editLoad, saveAction, mintToken }`. `EditData` carries `linkTargets`. `saveAction` reads the manifest, builds the row, upserts, and commits content and manifest via `commitFiles`. This plan adds the save guard to `saveAction`, the inbound field to `editLoad`, and a new `deleteAction`.
- `src/lib/delivery/manifest.ts` exports `buildSiteManifest(adapter, config, globs)`, which pushes `manifestEntryFromFile(descriptor, file)` for every file with no validation. `src/lib/delivery/content-index.ts`'s `createContentIndex` validates each file via `descriptor.validate(frontmatter, body)` and `continue`s on a failure (excluding it). This plan makes `buildSiteManifest` exclude the same validation failures.
- `src/lib/components/EditPage.svelte` is one `<form method="POST" action="?/save">`; it renders `<LinkPicker>` and `<MarkdownEditor bind:value={body} ... />` and surfaces `data.saved`/`data.error`. This plan adds a delete control, a broken-links banner, and a draft-warning notice.
- The content-routes tests are **unit** tests with a stubbed `fetch` (see `src/tests/unit/content-routes-save.test.ts`), not the integration project. There is no D1 in the content routes. Follow that harness.
- Component tests use `vitest-browser-svelte`: `render`, `screen.container.querySelector`, `screen.getByRole`, `expect.poll`. `userEvent` is imported from `vitest/browser`.
- Current version: `package.json` `"version": "0.19.0"`. Task 15 bumps a minor.

## File structure

- Modify `src/lib/content/links.ts`: add `escapeLinkText`.
- Modify `src/lib/components/markdown-format.ts`: escape the `insertInlineLink` title branch, add `unwrapCairnLink`.
- Modify `src/lib/components/link-completion.ts`: escape the `apply` string, skip the trigger inside a code block.
- Modify `src/lib/components/MarkdownEditor.svelte`: the `insertLink` pre-mount fallback.
- Modify `src/lib/components/LinkPicker.svelte`: the heading-based section tiebreak.
- Modify `src/lib/content/manifest.ts`: `inboundLinks`, the `parseManifest` guard.
- Modify `src/lib/delivery/manifest.ts`: `buildSiteManifest` validation exclusion.
- Modify `src/lib/sveltekit/content-routes.ts`: the save guard, the `editLoad` inbound field, `deleteAction`.
- Create `src/lib/components/DeleteDialog.svelte`: the delete control and its blocking dialog.
- Modify `src/lib/components/EditPage.svelte`: render the delete dialog, the broken-links banner, the draft-warning notice.
- Modify `src/lib/index.ts`, `src/lib/components/index.ts`: the new public exports.
- Modify `package.json`: the version bump.

---

## Task 1: `escapeLinkText`, and escape the title-derived display text

**Files:**
- Modify: `src/lib/content/links.ts`
- Modify: `src/lib/components/markdown-format.ts`
- Modify: `src/lib/components/link-completion.ts`
- Modify: `src/tests/unit/links.test.ts`
- Modify: `src/tests/unit/markdown-format.test.ts`
- Modify: `src/tests/unit/link-completion.test.ts`

A title with an unbalanced `[` or `]` breaks the generated markdown link's display text. Escape `\`, `[`, `]` where a title becomes display text: the autocomplete `apply` string and the empty-selection branch of `insertInlineLink`. A live selection stays untouched, since that is the author's own text.

- [ ] **Step 1: Write the failing `escapeLinkText` test**

In `src/tests/unit/links.test.ts`, add `escapeLinkText` to the existing import from `../../lib/content/links.js`, then append:

```ts
describe('escapeLinkText', () => {
  it('escapes a backslash and square brackets', () => {
    expect(escapeLinkText('a [b] c')).toBe('a \\[b\\] c');
    expect(escapeLinkText('back\\slash')).toBe('back\\\\slash');
  });
  it('leaves text without metacharacters unchanged', () => {
    expect(escapeLinkText('About Us (2026)')).toBe('About Us (2026)');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/links.test.ts`
Expected: FAIL, `escapeLinkText` is not exported.

- [ ] **Step 3: Implement `escapeLinkText`**

In `src/lib/content/links.ts`, add after `formatCairnToken`:

```ts
/** Escape the characters that would break a markdown link's display text: a backslash and the
 *  square brackets that delimit the text. Used where a content title becomes link display text,
 *  so an unbalanced bracket in a title cannot truncate the generated link. */
export function escapeLinkText(text: string): string {
  return text.replace(/[\\[\]]/g, (ch) => `\\${ch}`);
}
```

- [ ] **Step 4: Escape the autocomplete apply string (failing test first)**

In `src/tests/unit/link-completion.test.ts`, add a case inside the `linkCompletions` describe:

```ts
it('escapes square brackets in the title for the apply text', () => {
  const t = [{ concept: 'pages', id: 'about', permalink: '/about', title: 'A [B] C', draft: false }];
  expect(linkCompletions(t, 'a')[0].apply).toBe('[A \\[B\\] C](cairn:pages/about)');
});
```

Run: `npx vitest run --project unit src/tests/unit/link-completion.test.ts`
Expected: FAIL, the apply text is unescaped.

In `src/lib/components/link-completion.ts`, import the helper and use it in the `apply`:

```ts
import { formatCairnToken, escapeLinkText } from '../content/links.js';
```

```ts
    apply: `[${escapeLinkText(t.title)}](${formatCairnToken(t)})`,
```

Run the same command. Expected: PASS.

- [ ] **Step 5: Escape the `insertInlineLink` title branch (failing test first)**

In `src/tests/unit/markdown-format.test.ts`, add inside the `insertInlineLink` describe:

```ts
it('escapes brackets in the title when there is no selection', () => {
  const res = insertInlineLink('see  here', 4, 4, 'cairn:pages/x', 'A [B] C');
  expect(res.doc).toBe('see [A \\[B\\] C](cairn:pages/x) here');
});
it('does not escape a live selection (the author owns that text)', () => {
  const res = insertInlineLink('see [keep] this', 4, 10, 'cairn:pages/x', 'Title');
  expect(res.doc).toBe('see [[keep]](cairn:pages/x) this');
});
```

Run: `npx vitest run --project unit src/tests/unit/markdown-format.test.ts`
Expected: FAIL, the title is not escaped.

In `src/lib/components/markdown-format.ts`, import the helper at the top and escape only the title branch:

```ts
import { escapeLinkText } from '../content/links.js';
```

```ts
export function insertInlineLink(doc: string, from: number, to: number, href: string, title: string): FormatResult {
  const text = from < to ? doc.slice(from, to) : escapeLinkText(title);
  const inserted = `[${text}](${href})`;
  const end = from + inserted.length;
  return { doc: doc.slice(0, from) + inserted + doc.slice(to), from: end, to: end };
}
```

Run the same command. Expected: PASS. (The second case confirms a selection is wrapped verbatim, even when it contains brackets.)

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/links.ts src/lib/components/markdown-format.ts src/lib/components/link-completion.ts src/tests/unit/links.test.ts src/tests/unit/markdown-format.test.ts src/tests/unit/link-completion.test.ts
git commit -m "fix(editor): escape brackets in title-derived link text

A content title with an unbalanced [ or ] broke the generated markdown link's
display text. escapeLinkText escapes a backslash and the brackets where a title
becomes display text: the [[ autocomplete apply string and insertInlineLink's
empty-selection branch. A live selection stays verbatim, since it is the author's
own text.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: `unwrapCairnLink`, the save-guard one-click fix

**Files:**
- Modify: `src/lib/components/markdown-format.ts`
- Modify: `src/tests/unit/markdown-format.test.ts`

The pure transform behind the broken-link banner's "Remove link" button: it strips a `[text](cairn:<concept>/<id>)` link back to its plain `text`, leaving the words and removing only the broken link. It targets a specific token, so it never touches a different link.

- [ ] **Step 1: Write the failing test**

In `src/tests/unit/markdown-format.test.ts`, add `unwrapCairnLink` to the import, then add:

```ts
describe('unwrapCairnLink', () => {
  it('unwraps the link with the given href to its display text', () => {
    const doc = 'see [the guide](cairn:posts/gone) and [home](cairn:pages/home) now';
    expect(unwrapCairnLink(doc, 'cairn:posts/gone')).toBe('see the guide and [home](cairn:pages/home) now');
  });
  it('unwraps every occurrence of that href', () => {
    const doc = '[a](cairn:posts/x) and [b](cairn:posts/x)';
    expect(unwrapCairnLink(doc, 'cairn:posts/x')).toBe('a and b');
  });
  it('leaves the document unchanged when the href is absent', () => {
    expect(unwrapCairnLink('plain [keep](cairn:pages/home)', 'cairn:posts/gone')).toBe('plain [keep](cairn:pages/home)');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/markdown-format.test.ts`
Expected: FAIL, `unwrapCairnLink` is not exported.

- [ ] **Step 3: Implement `unwrapCairnLink`**

In `src/lib/components/markdown-format.ts`, add after `unwrapCairnLink`'s neighbors (after `insertInlineLink`):

```ts
/**
 * Unwrap every `[text](href)` link whose href is exactly `href`, replacing it with its display
 * text. The save guard's one-click fix calls this to remove a broken cairn: link while keeping the
 * words. The href is matched literally (escaped for the regex), so an unrelated link is untouched.
 * The link text matches a run without a closing bracket, the same shape the editor inserts.
 */
export function unwrapCairnLink(doc: string, href: string): string {
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return doc.replace(new RegExp(`\\[([^\\]]*)\\]\\(${escaped}\\)`, 'g'), '$1');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/markdown-format.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/markdown-format.ts src/tests/unit/markdown-format.test.ts
git commit -m "feat(editor): unwrapCairnLink, the broken-link fix transform

Add unwrapCairnLink, a pure transform that strips a [text](href) link with a
given href back to its plain text. The save guard's one-click fix calls it to
remove a broken cairn: link while keeping the words. The href is matched
literally, so an unrelated link is never touched.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: `inboundLinks`, the shared edge-list query

**Files:**
- Modify: `src/lib/content/manifest.ts`
- Modify: `src/tests/unit/manifest.test.ts` (mirror the existing file; if it does not exist, run `grep -rln "from '../../lib/content/manifest" src/tests/unit` and add to that file)

The pure "what links here" computation over the manifest, the one source of truth for the delete guard now and the backlinks panel later. It scans every entry whose `links` edge list points at the target and returns the linkers, excluding a self-link.

- [ ] **Step 1: Write the failing test**

In the manifest unit test file, add `inboundLinks` to the import from `../../lib/content/manifest.js`, then add:

```ts
describe('inboundLinks', () => {
  const manifest = {
    version: 1 as const,
    entries: [
      { id: 'a', concept: 'posts', title: 'Post A', permalink: '/a', draft: false, links: [{ concept: 'pages', id: 'home' }] },
      { id: 'b', concept: 'posts', title: 'Post B', permalink: '/b', draft: false, links: [{ concept: 'pages', id: 'home' }, { concept: 'posts', id: 'a' }] },
      { id: 'home', concept: 'pages', title: 'Home', permalink: '/', draft: false, links: [{ concept: 'pages', id: 'home' }] },
    ],
  };
  it('returns the entries that link to the target', () => {
    expect(inboundLinks(manifest, 'pages', 'home').map((e) => e.id).sort()).toEqual(['a', 'b']);
  });
  it('carries each linker concept, id, title, and permalink', () => {
    expect(inboundLinks(manifest, 'posts', 'a')).toEqual([
      { concept: 'posts', id: 'b', title: 'Post B', permalink: '/b' },
    ]);
  });
  it('excludes a self-link', () => {
    expect(inboundLinks(manifest, 'pages', 'home').some((e) => e.id === 'home')).toBe(false);
  });
  it('returns an empty list when nothing links to the target', () => {
    expect(inboundLinks(manifest, 'posts', 'b')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/manifest.test.ts`
Expected: FAIL, `inboundLinks` is not exported.

- [ ] **Step 3: Implement `inboundLinks`**

In `src/lib/content/manifest.ts`, add after `removeEntry`:

```ts
/** One inbound linker: enough to name it and link to its edit page in the delete guard. */
export interface InboundLink {
  concept: string;
  id: string;
  title: string;
  permalink: string;
}

/** Every entry whose outbound edges point at the target, excluding the target itself. The delete
 *  guard reads this to name "what links here"; the backlinks panel will reuse it. Pure over the
 *  manifest, so the request-time delete path and a unit test call it the same way. */
export function inboundLinks(manifest: Manifest, concept: string, id: string): InboundLink[] {
  return manifest.entries
    .filter((e) => !(e.concept === concept && e.id === id))
    .filter((e) => e.links.some((l) => l.concept === concept && l.id === id))
    .map((e) => ({ concept: e.concept, id: e.id, title: e.title, permalink: e.permalink }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/manifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/manifest.ts src/tests/unit/manifest.test.ts
git commit -m "feat(content): inboundLinks, the shared edge-list query

Add inboundLinks, the pure 'what links here' computation over the manifest: it
returns every entry whose outbound edges point at the target, excluding a
self-link. The delete guard reads it to name the inbound links; the backlinks
panel will reuse it.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: harden `parseManifest` with a per-entry and version guard

**Files:**
- Modify: `src/lib/content/manifest.ts`
- Modify: `src/tests/unit/manifest.test.ts`

The guards and the delete path all read the manifest, so the parse should reject a malformed file instead of casting an array through. Validate the `version` and each entry's required shape.

- [ ] **Step 1: Write the failing test**

In the manifest unit test file, add to the import `parseManifest` (if not already imported), then add:

```ts
describe('parseManifest hardening', () => {
  it('rejects a wrong version', () => {
    expect(() => parseManifest(JSON.stringify({ version: 2, entries: [] }))).toThrow(/version/i);
  });
  it('rejects an entry missing a required field', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ id: 'a', concept: 'posts' }] });
    expect(() => parseManifest(raw)).toThrow(/entry/i);
  });
  it('rejects an entry whose links are not an array', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: 'no' }] });
    expect(() => parseManifest(raw)).toThrow(/entry/i);
  });
  it('accepts a well-formed manifest', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [{ concept: 'pages', id: 'home' }] }] });
    expect(parseManifest(raw).entries).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/manifest.test.ts`
Expected: FAIL, the current `parseManifest` accepts a wrong version and a malformed entry.

- [ ] **Step 3: Harden `parseManifest`**

In `src/lib/content/manifest.ts`, replace the body of `parseManifest`:

```ts
/** Parse a committed manifest. Throws on malformed JSON, a wrong version, or a malformed entry, so
 *  every reader (the save guard, the delete path, the preview) sees a well-formed graph or a clear
 *  error. The build regenerates the manifest, so a real file is always canonical; this guards a
 *  hand-edited or truncated one. */
export function parseManifest(raw: string): Manifest {
  const data = JSON.parse(raw) as unknown;
  if (!data || typeof data !== 'object') {
    throw new Error('content manifest: malformed file, expected { version, entries: [] }');
  }
  const obj = data as { version?: unknown; entries?: unknown };
  if (obj.version !== 1) {
    throw new Error(`content manifest: unsupported version ${String(obj.version)}, expected 1`);
  }
  if (!Array.isArray(obj.entries)) {
    throw new Error('content manifest: malformed file, expected { version, entries: [] }');
  }
  for (const entry of obj.entries) {
    const e = entry as Record<string, unknown>;
    const ok =
      e &&
      typeof e.id === 'string' &&
      typeof e.concept === 'string' &&
      typeof e.title === 'string' &&
      typeof e.permalink === 'string' &&
      typeof e.draft === 'boolean' &&
      Array.isArray(e.links);
    if (!ok) {
      throw new Error(`content manifest: malformed entry ${JSON.stringify(e)}`);
    }
  }
  return { version: 1, entries: obj.entries as ManifestEntry[] };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/manifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/manifest.ts src/tests/unit/manifest.test.ts
git commit -m "fix(content): guard parseManifest version and entry shape

parseManifest checked only that entries was an array and cast it through. The
guards and the delete path all read the manifest, so it now rejects a wrong
version and a malformed entry with a clear error, instead of letting a bad row
reach a reader.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: exclude validation-failing entries from the built manifest

**Files:**
- Modify: `src/lib/delivery/manifest.ts`
- Modify: `src/tests/unit/delivery-manifest.test.ts` (mirror the existing file; if it does not exist, run `grep -rln "buildSiteManifest" src/tests` and add to that file)

The manifest and the site index disagree today: `buildSiteManifest` projects every file, but `createContentIndex` validates each file and excludes a failure. So the preview can resolve a link the build then rejects as missing. Make the build manifest exclude the same validation failures, so both agree on which entries exist.

- [ ] **Step 1: Write the failing test**

Read the existing `buildSiteManifest` test setup first (the adapter, config, and glob fixtures). Add a test that a validation-failing file is excluded. The shape, adapting the file's existing fixtures:

```ts
it('excludes a file whose frontmatter fails validation', () => {
  // A posts concept whose validate rejects an empty title. One valid file and one invalid.
  const manifest = buildSiteManifest(adapter, config, {
    posts: {
      'src/content/posts/2026-01-01-good.md': '---\ntitle: Good\n---\nbody',
      'src/content/posts/2026-01-02-bad.md': '---\ntitle: ""\n---\nbody',
    },
    pages: {},
  });
  const ids = manifest.entries.map((e) => e.id);
  expect(ids).toContain('2026-01-01-good');
  expect(ids).not.toContain('2026-01-02-bad');
});
```

If the existing test's `adapter`/`config` do not already reject an empty title, define the posts concept with a `validate` (or `schema` via `defineFields`) that requires a non-empty `title`, mirroring how the file's other fixtures are built. The point is one file that passes and one that fails.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-manifest.test.ts`
Expected: FAIL, the invalid file is included.

- [ ] **Step 3: Exclude validation failures in `buildSiteManifest`**

In `src/lib/delivery/manifest.ts`, import `parseMarkdown` and project each file through validation, mirroring `createContentIndex`:

```ts
import { parseMarkdown } from '../content/frontmatter.js';
```

Replace the inner loop in `buildSiteManifest`:

```ts
    for (const file of fromGlob(record)) {
      // Validate the same way createContentIndex does, so the manifest and the site index agree on
      // which entries exist. A validation failure is excluded from both; otherwise the preview would
      // resolve a link the build then rejects as a missing target.
      const { frontmatter, body } = parseMarkdown(file.raw);
      if (!descriptor.validate(frontmatter, body).ok) continue;
      manifest.entries.push(manifestEntryFromFile(descriptor, file));
    }
```

(The `descriptor` is the loop variable from `siteDescriptors(adapter, config)`; confirm the name against the current code and reuse it.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-manifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/delivery/manifest.ts src/tests/unit/delivery-manifest.test.ts
git commit -m "fix(delivery): exclude validation failures from the built manifest

buildSiteManifest projected every file, but createContentIndex validates and
excludes a failure, so the preview could resolve a link the build rejects as
missing. The build manifest now validates each file the same way and excludes the
same failures, so the manifest and the site index agree on which entries exist.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: the `insertLink` pre-mount fallback

**Files:**
- Modify: `src/lib/components/MarkdownEditor.svelte`
- Modify: `src/tests/component/MarkdownEditor.test.ts`

`insertLink` returns early when CodeMirror has not mounted, so a link picked in that sub-second window is dropped. `insertAtCursor` already appends to the raw `value` in that case. Give `insertLink` the same fallback.

- [ ] **Step 1: Write the test**

`registerInsertLink` fires only after the view mounts, so the `!view` branch cannot be driven through the live component on a reliable timing. Cover the fallback as a pure-logic unit test instead, asserting the exact value-append shape the branch produces. In `src/tests/unit/markdown-format.test.ts`, the `insertInlineLink` transform the fallback reuses is already covered; add one assertion that pins the fallback's composed result so the editor change has a guard:

```ts
it('composes a pre-mount fallback link as inline markdown', () => {
  // The MarkdownEditor pre-mount fallback appends insertInlineLink('', 0, 0, href, title).doc.
  expect(insertInlineLink('', 0, 0, 'cairn:pages/about', 'About').doc).toBe('[About](cairn:pages/about)');
});
```

Run: `npx vitest run --project unit src/tests/unit/markdown-format.test.ts`
Expected: PASS (the transform already exists). This pins the shape the editor fallback relies on.

- [ ] **Step 2: Confirm the mounted path still inserts a link**

The existing `registerInsertLink` component test already proves the mounted path inserts `[About](cairn:pages/about)` into the value, so no new component test is needed. The change below only adds the `!view` branch, which the unit assertion above pins. Run the component file to confirm it stays green after the edit:

Run: `npx vitest run --project component src/tests/component/MarkdownEditor.test.ts`
Expected: PASS (unchanged by this edit; the early-return branch is the only addition).

- [ ] **Step 3: Add the fallback**

In `src/lib/components/MarkdownEditor.svelte`, change the early return in `insertLink` to mirror `insertAtCursor`. Replace:

```ts
  function insertLink(href: string, title: string) {
    if (!view) return;
```

with:

```ts
  function insertLink(href: string, title: string) {
    if (!view) {
      // The editor has not mounted yet; append the link to the raw value so a pick is never lost,
      // mirroring insertAtCursor's pre-mount fallback.
      const link = insertInlineLink('', 0, 0, href, title).doc;
      value = value ? `${value} ${link}` : link;
      return;
    }
```

(Leave the rest of `insertLink` unchanged.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project component src/tests/component/MarkdownEditor.test.ts`
Expected: PASS. (If the run fails solely on a CodeMirror mount timeout on an unrelated case, re-run once.)

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/MarkdownEditor.svelte src/tests/unit/markdown-format.test.ts
git commit -m "fix(editor): insertLink pre-mount fallback

insertLink returned early before CodeMirror mounted, dropping a link picked in
that window. It now appends the link to the raw value when the view is not ready,
mirroring insertAtCursor, so a pick is never lost.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: skip the `[[` trigger inside a code block

**Files:**
- Modify: `src/lib/components/link-completion.ts`
- Modify: `src/tests/unit/link-completion.test.ts`

The `[[` autocomplete fires anywhere on a line, including inside a fenced code block, where a cairn link is not wanted. Skip the trigger when the cursor sits in a code node, reading CodeMirror's syntax tree at the cursor. `matchCairnTrigger` stays pure; the skip lives in `cairnLinkCompletionSource`.

- [ ] **Step 1: Write the failing test**

In `src/tests/unit/link-completion.test.ts`, add an import and a test that builds a real `EditorState` with the markdown language and asserts the source returns null inside a code block:

```ts
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { cairnLinkCompletionSource } from '../../lib/components/link-completion.js';

function contextAt(doc: string, pos: number) {
  const state = EditorState.create({ doc, extensions: [markdown()] });
  return { state, pos, explicit: false } as unknown as import('@codemirror/autocomplete').CompletionContext;
}

describe('cairnLinkCompletionSource code-block skip', () => {
  const targets = [{ concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false }];
  it('offers completions for a [[ in prose', () => {
    const doc = 'see [[Ab';
    const res = cairnLinkCompletionSource(targets)(contextAt(doc, doc.length));
    expect(res).not.toBeNull();
  });
  it('does not offer completions for a [[ inside a fenced code block', () => {
    const doc = '```\nlet x = arr[[Ab';
    const res = cairnLinkCompletionSource(targets)(contextAt(doc, doc.length));
    expect(res).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/link-completion.test.ts`
Expected: FAIL, the source offers completions inside the code block.

- [ ] **Step 3: Add the code-block skip**

In `src/lib/components/link-completion.ts`, import the syntax tree helper and check the node at the cursor:

```ts
import { syntaxTree } from '@codemirror/language';
```

In `cairnLinkCompletionSource`, after computing `trigger` and before returning, skip a code context:

```ts
export function cairnLinkCompletionSource(targets: LinkTarget[]): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    const line = context.state.doc.lineAt(context.pos);
    const before = context.state.sliceDoc(line.from, context.pos);
    const trigger = matchCairnTrigger(before);
    if (!trigger) return null;
    // Skip a [[ inside a fenced or inline code node: a cairn link there would be literal text, and
    // the build resolver does not look inside code. The node name carries "Code" for both forms.
    const node = syntaxTree(context.state).resolveInner(context.pos, -1);
    for (let n: typeof node | null = node; n; n = n.parent) {
      if (/Code/.test(n.name)) return null;
    }
    return { from: line.from + trigger.from, options: linkCompletions(targets, trigger.query), filter: false };
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/link-completion.test.ts`
Expected: PASS. (If the markdown grammar names the fenced node differently, log `syntaxTree(state).resolveInner(pos, -1).name` and its parents to confirm the `Code` substring; the CodeMirror markdown grammar uses `FencedCode`/`CodeText`/`InlineCode`, all carrying `Code`.)

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/link-completion.ts src/tests/unit/link-completion.test.ts
git commit -m "fix(editor): skip the [[ trigger inside a code block

The [[ autocomplete fired anywhere on a line, including inside a fenced code
block, where a cairn link is literal text the build resolver ignores. The source
now reads the syntax tree at the cursor and returns null inside a code node.
matchCairnTrigger stays pure.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: sort the `LinkPicker` section tiebreak by heading

**Files:**
- Modify: `src/lib/components/LinkPicker.svelte`
- Modify: `src/tests/component/LinkPicker.test.ts`

Two unlisted concepts both rank after pages and posts; the tiebreak compares the raw concept id, which can disagree with the displayed heading. Sort the tie by the heading instead.

- [ ] **Step 1: Write the test**

This tiebreak is cosmetic: a lowercase concept id and its capitalized heading sort the same way, so the change makes the contract explicit rather than fixing a visible bug. Pin the intended contract directly: two unlisted concepts render in heading order. In `src/tests/component/LinkPicker.test.ts`, add:

```ts
it('orders unlisted concepts by heading', async () => {
  const targets = [
    { concept: 'zebra', id: 'z1', permalink: '/z1', title: 'Zebra One', draft: false },
    { concept: 'apple', id: 'a1', permalink: '/a1', title: 'Apple One', draft: false },
  ];
  const screen = render(LinkPicker, { linkTargets: targets, insert: () => {} });
  await screen.getByRole('button', { name: /link to page/i }).click();
  const text = screen.container.querySelector('dialog')!.textContent ?? '';
  // Headings are 'Apple' and 'Zebra'; Apple sorts first.
  expect(text.indexOf('Apple')).toBeLessThan(text.indexOf('Zebra'));
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run --project component src/tests/component/LinkPicker.test.ts`
Expected: PASS (the current raw-id sort already yields this order for these inputs). The implementation change below makes the heading-based contract explicit, so a future concept whose id and heading diverge stays correct. Keep this test; it documents the contract.

- [ ] **Step 3: Sort the tie by heading**

In `src/lib/components/LinkPicker.svelte`, change the `groups` sort comparator to break the tie on the heading:

```ts
    return [...byConcept.entries()]
      .map(([concept, items]) => ({ concept, heading: heading(concept), items }))
      .sort((a, b) => rank(a.concept) - rank(b.concept) || a.heading.localeCompare(b.heading));
```

(The map now precedes the sort so the comparator reads `heading`. Confirm the surrounding `$derived.by` still returns the `{ concept, heading, items }` shape the markup iterates.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project component src/tests/component/LinkPicker.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/LinkPicker.svelte src/tests/component/LinkPicker.test.ts
git commit -m "fix(admin): sort the LinkPicker section tiebreak by heading

Two unlisted concepts both rank after pages and posts, and the tie compared the
raw concept id, which can disagree with the displayed heading. The tie now sorts
by the heading, so the section order always matches what the author reads.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: the save guard

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts`
- Modify: `src/tests/unit/content-routes-save.test.ts`

Before the commit, resolve the body's `cairn:` links against the manifest (with this entry's row upserted, so a self-link or a link to the entry itself resolves). A link to an **absent** target hard-blocks the save by returning `fail(400, { brokenLinks })` with no commit. A link to a **draft** target commits and redirects with a draft warning.

- [ ] **Step 1: Write the failing tests**

In `src/tests/unit/content-routes-save.test.ts`, add `fail` handling. The existing `saveAction` throws a redirect on success; a block now returns an `ActionFailure`. Add:

```ts
it('blocks a save that links to an absent target, with no commit', async () => {
  const calls = commitFetch(null); // empty manifest: nothing to resolve against
  const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })), deps);
  const result = (await routes.saveAction(
    saveEvent('2026-05-hi', { title: 'Hi', body: 'see [gone](cairn:pages/gone)' }) as never,
  )) as unknown as { status: number; data: { brokenLinks: string[] } };
  expect(result.status).toBe(400);
  expect(result.data.brokenLinks).toContain('cairn:pages/gone');
  // No commit: the only fetch is the manifest read, no POST to /git/trees.
  expect(calls.some((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
});

it('allows a save that links to a draft target, with a warning', async () => {
  // A manifest holding one draft page 'wip'. The saved post links to it.
  const concept = runtime(() => ({ ok: true, data: {} })).concepts[0];
  const draftRow = manifestEntryFromFile(concept, { path: 'src/content/posts/wip.md', raw: '---\ntitle: WIP\ndraft: true\n---\nx' });
  // Force the draft row's concept/id to a pages target the body links to.
  const manifest = serializeManifest({ version: 1, entries: [{ ...draftRow, concept: 'pages', id: 'wip', draft: true }] });
  commitFetch(manifest);
  const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })), deps);
  try {
    await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'see [wip](cairn:pages/wip)' }) as never);
    throw new Error('should have redirected');
  } catch (e) {
    const loc = (e as { location: string }).location;
    expect(loc).toMatch(/saved=1/);
    expect(loc).toMatch(/draft/i);
  }
});

it('commits cleanly when every link resolves to a published target', async () => {
  const concept = runtime(() => ({ ok: true, data: {} })).concepts[0];
  const liveRow = manifestEntryFromFile(concept, { path: 'src/content/pages/home.md', raw: '---\ntitle: Home\n---\nx' });
  const manifest = serializeManifest({ version: 1, entries: [{ ...liveRow, concept: 'pages', id: 'home', draft: false }] });
  const calls = commitFetch(manifest);
  const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })), deps);
  try {
    await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'see [home](cairn:pages/home)' }) as never);
    throw new Error('should have redirected');
  } catch (e) {
    expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hi?saved=1');
  }
  expect(calls.some((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))).toBe(true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/content-routes-save.test.ts`
Expected: FAIL, there is no guard: the absent-link case commits instead of returning a 400.

- [ ] **Step 3: Add the guard to `saveAction`**

In `src/lib/sveltekit/content-routes.ts`, import `fail` and `extractCairnLinks`/`formatCairnToken`:

```ts
import { redirect, error, fail } from '@sveltejs/kit';
```

```ts
import { extractCairnLinks, formatCairnToken } from '../content/links.js';
```

In `saveAction`, after `const nextManifest = serializeManifest(upsertEntry(manifest, row));`, compute the guard against the upserted manifest and act on it before the commit. Build a lookup from the upserted entries (so the entry being saved, and any other existing target, resolves), then partition the body's links:

```ts
    // Save guard: resolve the body's cairn links against the manifest with this entry upserted, so a
    // self-link and a link to any existing target resolves. A link to an absent target hard-blocks
    // the save (it would red the deploy build and the author would not see it); a link to a draft
    // target commits with a warning, since it is valid and resolves once the target is published.
    const upserted = upsertEntry(manifest, row);
    const byKey = new Map(upserted.entries.map((e) => [`${e.concept}/${e.id}`, e]));
    const absent: string[] = [];
    const draft: string[] = [];
    for (const ref of extractCairnLinks(body)) {
      const target = byKey.get(`${ref.concept}/${ref.id}`);
      if (!target) absent.push(formatCairnToken(ref));
      else if (target.draft) draft.push(formatCairnToken(ref));
    }
    if (absent.length) {
      return fail(400, { brokenLinks: absent, body });
    }
```

Then change the success redirect to carry the draft warning. Replace the final `throw redirect(303, `/admin/${concept.id}/${id}?saved=1`);` with:

```ts
    const savedQuery = draft.length ? `saved=1&drafts=${encodeURIComponent(draft.join(','))}` : 'saved=1';
    throw redirect(303, `/admin/${concept.id}/${id}?${savedQuery}`);
```

Change the `saveAction` return type from `Promise<never>` to allow the failure:

```ts
  async function saveAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
```

(The `nextManifest` variable feeds `commitFiles` unchanged; the `upserted` value the guard reads is the same object pre-serialize.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/content-routes-save.test.ts`
Expected: PASS (all three new cases plus the existing ones).

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-save.test.ts
git commit -m "feat(admin): the save guard for dangling cairn links

Before the commit, saveAction resolves the body's cairn links against the
manifest with this entry upserted. A link to an absent target hard-blocks the
save with fail(400, { brokenLinks }) and no commit, so a broken link never reds
the deploy an author would not see. A link to a draft target commits with a
warning, since it resolves once the target is published.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: ship the entry's inbound links from `editLoad`

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts`
- Modify: `src/tests/unit/content-routes-edit.test.ts`

The edit page needs this entry's inbound links to render the delete guard. `editLoad` already reads the manifest for `linkTargets`; compute `inboundLinks` from the same parse and ship them.

- [ ] **Step 1: Write the failing test**

Read `src/tests/unit/content-routes-edit.test.ts` for its harness (how it stubs the manifest read and calls `editLoad`). Add a test that an entry with inbound links ships them. Mirror the file's existing manifest fixture; the assertion:

```ts
it('ships the entry inbound links for the delete guard', async () => {
  // A manifest where post 'b' links to the page 'home' being edited.
  const manifest = JSON.stringify({
    version: 1,
    entries: [
      { id: 'home', concept: 'pages', title: 'Home', permalink: '/', draft: false, links: [] },
      { id: 'b', concept: 'posts', title: 'Post B', permalink: '/b', draft: false, links: [{ concept: 'pages', id: 'home' }] },
    ],
  });
  // Stub the file read (the entry) and the manifest read; see the file's existing fetch double.
  const data = await editLoadFor('pages', 'home', { fileRaw: '---\ntitle: Home\n---\nx', manifestRaw: manifest });
  expect(data.inboundLinks).toEqual([{ concept: 'posts', id: 'b', title: 'Post B', permalink: '/b' }]);
});
```

(Use the file's actual helper for building the event and stubbing the two reads. If the file stubs `fetch` directly, return `fileRaw` for the entry's `/contents/` GET and `manifestRaw` for the manifest's `/contents/` GET, matching the path. Mirror the existing edit test exactly.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-routes-edit.test.ts`
Expected: FAIL, `data.inboundLinks` is undefined.

- [ ] **Step 3: Compute and ship inbound links**

In `src/lib/sveltekit/content-routes.ts`, add `inboundLinks` and `parseManifest` (already imported) usage to `editLoad`. Import the type and function:

```ts
import { emptyManifest, manifestEntryFromFile, parseManifest, serializeManifest, upsertEntry, inboundLinks, type LinkTarget, type InboundLink } from '../content/manifest.js';
```

Add `inboundLinks` to `EditData`:

```ts
  /** The site's link targets, for the preview resolver and the link picker; from the committed manifest. */
  linkTargets: LinkTarget[];
  /** The entries that link to this one, for the delete guard. Empty when nothing links here. */
  inboundLinks: InboundLink[];
```

In `editLoad`, where the manifest is read for `linkTargets`, compute the inbound links from the same parse. Replace the manifest block:

```ts
    let linkTargets: LinkTarget[] = [];
    let inbound: InboundLink[] = [];
    const manifestRaw = await readRaw(runtime.backend, runtime.manifestPath, token);
    if (manifestRaw !== null) {
      const manifest = parseManifest(manifestRaw);
      linkTargets = manifest.entries.map((e) => ({
        concept: e.concept,
        id: e.id,
        permalink: e.permalink,
        title: e.title,
        date: e.date,
        draft: e.draft,
      }));
      inbound = inboundLinks(manifest, concept.id, id);
    }
```

Add `inboundLinks: inbound` to the returned object:

```ts
      linkTargets,
      inboundLinks: inbound,
    };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-routes-edit.test.ts`
Expected: PASS. (Other edit tests that build `EditData` may now need `inboundLinks` in an expected object; add `inboundLinks: []` where an existing assertion compares the whole object. Update them to match.)

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-edit.test.ts
git commit -m "feat(admin): ship the entry inbound links from editLoad

editLoad already reads the manifest for linkTargets; it now computes this entry's
inbound links from the same parse and ships them on EditData, so the edit page can
render the delete guard without another read.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: `deleteAction`, the block-until-clean delete

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts`
- Modify: `src/tests/unit/content-routes-save.test.ts` (or a new `content-routes-delete.test.ts`; mirror the save harness)

The delete path re-reads the manifest, recomputes inbound links at commit time (the authoritative gate), refuses with the list if any exist, and otherwise commits the file removal plus `removeEntry` in one commit.

- [ ] **Step 1: Write the failing tests**

Create `src/tests/unit/content-routes-delete.test.ts`, reusing the save test's `runtime`, `deps`, `commitFetch`, and `json` helpers (copy the harness from `content-routes-save.test.ts`, or import them if the file exports them; the save file does not export, so copy the small harness). Add a `deleteEvent`:

```ts
function deleteEvent(id: string) {
  return {
    url: new URL(`https://t.example/admin/posts/${id}`),
    params: { concept: 'posts', id },
    request: new Request(`https://t.example/admin/posts/${id}`, { method: 'POST' }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}
```

Tests:

```ts
it('refuses to delete an entry that has inbound links, with no commit', async () => {
  const manifest = JSON.stringify({
    version: 1,
    entries: [
      { id: '2026-05-hi', concept: 'posts', title: 'Hi', permalink: '/p/hi', draft: false, links: [] },
      { id: 'b', concept: 'posts', title: 'B', permalink: '/p/b', draft: false, links: [{ concept: 'posts', id: '2026-05-hi' }] },
    ],
  });
  const calls = commitFetch(manifest);
  const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
  const result = (await routes.deleteAction(deleteEvent('2026-05-hi') as never)) as unknown as {
    status: number; data: { inboundLinks: { id: string }[] };
  };
  expect(result.status).toBe(409);
  expect(result.data.inboundLinks.map((l) => l.id)).toEqual(['b']);
  expect(calls.some((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
});

it('deletes the file and removes the manifest entry in one commit', async () => {
  const manifest = JSON.stringify({
    version: 1,
    entries: [{ id: '2026-05-hi', concept: 'posts', title: 'Hi', permalink: '/p/hi', draft: false, links: [] }],
  });
  const calls = commitFetch(manifest);
  const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
  try {
    await routes.deleteAction(deleteEvent('2026-05-hi') as never);
    throw new Error('should have redirected');
  } catch (e) {
    expect((e as { location: string }).location).toBe('/admin/posts');
  }
  const treeReq = calls.find((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))!;
  const treeBody = JSON.parse(String(treeReq.init!.body)) as { tree: { path: string; sha: string | null; content?: string }[] };
  const fileEntry = treeBody.tree.find((t) => t.path === 'src/content/posts/2026-05-hi.md')!;
  expect(fileEntry.sha).toBeNull(); // a delete is encoded as sha:null
  const manifestEntry = treeBody.tree.find((t) => t.path === 'src/content/.cairn/index.json')!;
  const committed = parseManifest(manifestEntry.content!);
  expect(committed.entries.find((e) => e.id === '2026-05-hi')).toBeUndefined();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/content-routes-delete.test.ts`
Expected: FAIL, `deleteAction` does not exist.

- [ ] **Step 3: Implement `deleteAction`**

In `src/lib/sveltekit/content-routes.ts`, add `removeEntry` to the manifest import:

```ts
import { emptyManifest, manifestEntryFromFile, parseManifest, serializeManifest, upsertEntry, removeEntry, inboundLinks, type LinkTarget, type InboundLink } from '../content/manifest.js';
```

Add the action before the `return { ... }` line:

```ts
  /** Delete an entry. Block-until-clean: refuse while inbound links exist (naming them), else commit
   *  the file removal and the manifest patch in one commit. The inbound recheck here is the
   *  authoritative gate, closing the load-to-delete race. */
  async function deleteAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const path = `${concept.dir}/${filenameFromId(id)}`;
    const token = await mintToken(event.platform?.env ?? {});

    const manifestRaw = await readRaw(runtime.backend, runtime.manifestPath, token);
    const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
    const inbound = inboundLinks(manifest, concept.id, id);
    if (inbound.length) {
      return fail(409, { inboundLinks: inbound });
    }

    const nextManifest = serializeManifest(removeEntry(manifest, concept.id, id));
    try {
      await commitFiles(
        runtime.backend,
        [
          { path, content: null },
          { path: runtime.manifestPath, content: nextManifest },
        ],
        { message: `Delete ${concept.label.toLowerCase()}: ${id}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
    } catch (err) {
      if (isConflict(err)) {
        const message = 'This file changed since you opened it. Reload and try again.';
        throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}`);
      }
      throw err;
    }
    throw redirect(303, `/admin/${concept.id}`);
  }
```

Add `deleteAction` to the returned object:

```ts
  return { layoutLoad, indexRedirect, listLoad, createAction, editLoad, saveAction, deleteAction, mintToken };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/content-routes-delete.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-delete.test.ts
git commit -m "feat(admin): deleteAction, the block-until-clean delete

deleteAction re-reads the manifest and recomputes inbound links at commit time,
the authoritative gate that closes the load-to-delete race. It refuses with the
list while inbound links exist, and otherwise commits the file removal plus the
manifest patch in one commit.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 12: `DeleteDialog.svelte`, the delete control and its dialog

**Files:**
- Create: `src/lib/components/DeleteDialog.svelte`
- Create: `src/tests/component/DeleteDialog.test.ts`

The Delete control and its modal. With inbound links present, it lists them (each linking to its edit page) and blocks the confirm. With none, it is a plain confirm that posts to the `?/delete` action. It mirrors `LinkPicker`'s native-`<dialog>` a11y conventions.

- [ ] **Step 1: Write the failing test**

Create `src/tests/component/DeleteDialog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DeleteDialog from '../../lib/components/DeleteDialog.svelte';
import type { InboundLink } from '../../lib/content/manifest.js';

function open(props: { conceptId: string; id: string; label: string; inboundLinks: InboundLink[] }) {
  return render(DeleteDialog, props);
}

describe('DeleteDialog', () => {
  it('confirms a delete when nothing links here', async () => {
    const screen = open({ conceptId: 'posts', id: '2026-05-hi', label: 'Post', inboundLinks: [] });
    await screen.getByRole('button', { name: /delete/i }).click();
    const dialog = screen.container.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    // A delete form posts to ?/delete.
    const form = dialog.querySelector('form[action="?/delete"]');
    expect(form).not.toBeNull();
    // The confirm button is enabled.
    const confirm = screen.getByRole('button', { name: /^delete this/i });
    expect((confirm.element() as HTMLButtonElement).disabled).toBe(false);
  });

  it('blocks the delete and names inbound links', async () => {
    const screen = open({
      conceptId: 'pages', id: 'home', label: 'Page',
      inboundLinks: [{ concept: 'posts', id: 'b', title: 'Post B', permalink: '/b' }],
    });
    await screen.getByRole('button', { name: /delete/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toMatch(/1 page/i); // names the count
    expect(text).toContain('Post B');
    // No confirm form when blocked.
    expect(screen.container.querySelector('dialog form[action="?/delete"]')).toBeNull();
    // The link to the referrer's edit page is present.
    const link = screen.container.querySelector('dialog a[href="/admin/posts/b"]');
    expect(link).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project component src/tests/component/DeleteDialog.test.ts`
Expected: FAIL, the component does not exist.

- [ ] **Step 3: Implement `DeleteDialog.svelte`**

Create `src/lib/components/DeleteDialog.svelte`:

```svelte
<!--
@component
The Delete control and its modal. With no inbound links it is a plain confirm that posts to the
?/delete action. With inbound links it blocks: it names how many entries link here and lists them,
each linking to its edit page, so the author repoints or removes those links first. Built on a native
<dialog>, following the LinkPicker a11y conventions.
-->
<script lang="ts">
  import type { InboundLink } from '../content/manifest.js';

  interface Props {
    conceptId: string;
    id: string;
    label: string;
    /** The entries that link to this one; non-empty blocks the delete. */
    inboundLinks: InboundLink[];
  }

  let { conceptId, id, label, inboundLinks }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  const blocked = $derived(inboundLinks.length > 0);
  const noun = $derived(inboundLinks.length === 1 ? 'entry links' : 'entries link');

  function open() {
    dialog?.showModal();
  }
  function close() {
    dialog?.close();
  }
</script>

<button type="button" class="btn btn-sm btn-ghost text-error" aria-haspopup="dialog" onclick={open}>
  Delete
</button>

<dialog class="modal" aria-labelledby="cairn-delete-dialog-title" bind:this={dialog}>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-delete-dialog-title" class="text-base font-semibold">Delete this {label.toLowerCase()}?</h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
    </div>

    {#if blocked}
      <p class="mb-2 text-sm">
        {inboundLinks.length} {noun} here. Remove or repoint {inboundLinks.length === 1 ? 'it' : 'them'} before deleting,
        so no link is left broken.
      </p>
      <ul class="menu w-full">
        {#each inboundLinks as link (link.concept + '/' + link.id)}
          <li>
            <a href={`/admin/${link.concept}/${link.id}`}>{link.title}</a>
          </li>
        {/each}
      </ul>
      <div class="mt-3 flex justify-end">
        <button type="button" class="btn btn-sm" onclick={close}>Close</button>
      </div>
    {:else}
      <p class="mb-3 text-sm">This cannot be undone.</p>
      <form method="POST" action="?/delete" class="flex justify-end gap-2">
        <button type="button" class="btn btn-sm" onclick={close}>Cancel</button>
        <button type="submit" class="btn btn-sm btn-error">Delete this {label.toLowerCase()}</button>
      </form>
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button tabindex="-1" aria-label="Close">close</button>
  </form>
</dialog>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project component src/tests/component/DeleteDialog.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/DeleteDialog.svelte src/tests/component/DeleteDialog.test.ts
git commit -m "feat(admin): the DeleteDialog control

Add DeleteDialog, the Delete control and its modal. With no inbound links it is a
plain confirm that posts to the ?/delete action. With inbound links it blocks,
names how many entries link here, and lists each with a link to its edit page, so
the author clears them first. It mirrors the LinkPicker a11y conventions.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 13: wire the delete dialog, the broken-links banner, and the draft notice into `EditPage`

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Modify: `src/tests/component/EditPage.test.ts`

`EditPage` renders the delete dialog, surfaces the save guard's broken-links banner (with the one-click unwrap fix), and shows the draft-warning notice. The banner and the notice read the action result and the URL.

- [ ] **Step 1: Write the failing tests**

In `src/tests/component/EditPage.test.ts`, add tests. The existing helpers build props; `data.inboundLinks` is now required (Task 10), so add `inboundLinks: []` to the helper defaults if the file constructs `data` literally (mirror how it sets `linkTargets`). Add:

```ts
it('renders the delete control', async () => {
  const screen = render(EditPage, postProps());
  expect(screen.getByRole('button', { name: /^delete$/i })).toBeTruthy();
});

it('shows the broken-links banner and unwraps a link with the fix', async () => {
  const props = postProps();
  props.data.body = 'see [gone](cairn:pages/gone) here';
  // The action result the page receives after a blocked save.
  props.form = { brokenLinks: ['cairn:pages/gone'], body: props.data.body };
  const screen = render(EditPage, props);
  const banner = screen.container.querySelector('[role="alert"]');
  expect(banner?.textContent ?? '').toContain('cairn:pages/gone');
  await screen.getByRole('button', { name: /remove link/i }).click();
  await expect
    .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
    .toBe('see gone here');
});
```

(If `postProps()` returns a shared object, clone it as the file's other tests do. The `form` prop is new; pass it as a sibling of `data` in the render props. If the file builds `data` with an explicit object, add `inboundLinks: []` there.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: FAIL, there is no delete control and no `form` prop.

- [ ] **Step 3: Wire `EditPage`**

In `src/lib/components/EditPage.svelte`:

1. Add the imports beside the existing component imports:

```ts
  import DeleteDialog from './DeleteDialog.svelte';
  import { unwrapCairnLink } from './markdown-format.js';
```

2. Add a `form` prop to `Props` (the SvelteKit action result) and read the draft warning from the URL. Add to the `Props` interface:

```ts
    /** The `?/save` action result. Carries the save guard's broken links when a save was blocked. */
    form?: { brokenLinks?: string[]; body?: string } | null;
```

3. Destructure it:

```ts
  let { data, registry, render, icons, form }: Props = $props();
```

4. Add the broken-links state and the fix. After the existing `let insertLink = ...` line:

```ts
  // The save guard's broken links, from the blocked action result. The fix unwraps a link in the
  // local body, which the bound editor reconciles, so the author re-saves clean.
  const brokenLinks = $derived(form?.brokenLinks ?? []);
  function removeBrokenLink(href: string) {
    body = unwrapCairnLink(body, href);
  }
```

5. Read the draft warning from the URL search params. Add near the other `$derived`/state:

```ts
  // After a save that links to a draft target, the redirect carries ?drafts=<tokens>.
  let draftWarning = $state('');
  $effect(() => {
    const drafts = new URLSearchParams(location.search).get('drafts');
    draftWarning = drafts ? drafts.split(',').filter(Boolean).join(', ') : '';
  });
```

6. Render the delete control in the header chrome row, beside `<LinkPicker>` (around the existing buttons):

```svelte
    <LinkPicker linkTargets={data.linkTargets} insert={insertLink} />
    <DeleteDialog conceptId={data.conceptId} id={data.id} label={data.label} inboundLinks={data.inboundLinks} />
```

7. Render the broken-links banner and the draft notice, beside the existing `data.saved`/`data.error` alerts (after them):

```svelte
{#if brokenLinks.length}
  <div role="alert" class="alert alert-error mb-4 flex-col items-start text-sm">
    <p>This page links to {brokenLinks.length === 1 ? 'a page' : 'pages'} that no longer {brokenLinks.length === 1 ? 'exists' : 'exist'}. Remove the broken {brokenLinks.length === 1 ? 'link' : 'links'} and save again.</p>
    <ul class="mt-1 w-full">
      {#each brokenLinks as href (href)}
        <li class="flex items-center justify-between gap-2">
          <code class="text-xs">{href}</code>
          <button type="button" class="btn btn-xs" onclick={() => removeBrokenLink(href)}>Remove link</button>
        </li>
      {/each}
    </ul>
  </div>
{/if}
{#if draftWarning}
  <div role="status" class="alert alert-warning mb-4 text-sm">
    Saved. Note: this page links to unpublished {draftWarning.includes(',') ? 'pages' : 'a page'} ({draftWarning}), which will 404 until published.
  </div>
{/if}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: PASS. (If the run fails solely on a CodeMirror mount timeout on an unrelated case, re-run once.)

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/EditPage.svelte src/tests/component/EditPage.test.ts
git commit -m "feat(admin): wire delete, the broken-links banner, and the draft notice

EditPage renders the delete dialog, surfaces the save guard's broken links from
the action result with a one-click unwrap fix on the local body, and shows a
draft-link warning after a save. An author meets a broken or draft link in plain
words and fixes it without leaving the editor.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 14: the public exports

**Files:**
- Modify: `src/lib/index.ts`
- Modify: `src/lib/components/index.ts`
- Modify: `src/tests/component/components-barrel.test.ts`

- [ ] **Step 1: Add the exports**

In `src/lib/index.ts`, add `escapeLinkText` to the links re-export and `inboundLinks`/`InboundLink` to the manifest re-export. Find the existing lines and extend them:

```ts
export { parseCairnToken, extractCairnLinks, formatCairnToken, escapeLinkText } from './content/links.js';
```

For the manifest, add `inboundLinks` and the `InboundLink` type to whatever manifest re-export the entry already has (search `from './content/manifest.js'` in `src/lib/index.ts`; if the manifest helpers are re-exported there, extend that line; if only types are, add `inboundLinks` to the value re-export and `InboundLink` to the type re-export). If no manifest re-export exists, add:

```ts
export { inboundLinks, type InboundLink } from './content/manifest.js';
```

In `src/lib/components/index.ts`, add:

```ts
export { default as DeleteDialog } from './DeleteDialog.svelte';
```

- [ ] **Step 2: Assert the barrel exports it (test-first)**

Open `src/tests/component/components-barrel.test.ts` and add `DeleteDialog` to its list or assertion, mirroring the existing entries (the same way `LinkPicker` was added in Plan 3).

Run: `npx vitest run --project component src/tests/component/components-barrel.test.ts`
Expected: PASS.

- [ ] **Step 3: Verify the package surface**

Run: `npm run check:package`
Expected: all-green across the existing entries, the new exports resolving, no export-condition change.

- [ ] **Step 4: Full gate**

Run `npm run check` (0/0) and `npm test` (exit 0).

- [ ] **Step 5: Commit**

```bash
git add src/lib/index.ts src/lib/components/index.ts src/tests/component/components-barrel.test.ts
git commit -m "feat: export escapeLinkText, inboundLinks, and DeleteDialog

Export escapeLinkText and inboundLinks (with InboundLink) from the main entry,
and DeleteDialog from the components entry, the surface a site uses for the
delete guard and the backlinks panel later.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 15: the version bump

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Bump the version**

In `package.json`, change `"version": "0.19.0"` to `"version": "0.20.0"` (additive minor: the delete and guard route functions, a new `DeleteDialog` component, the new `EditPage` `form` prop and delete control, and the pure helpers; nothing a consuming site already wires breaks, though a site that wires `/admin` adopts the new `?/delete` action and the `form` prop to surface the guards). Confirm the current value is `0.19.0` before editing.

If `package-lock.json`'s root `version` is stale, sync it with `npm install --package-lock-only`, handling the workspace-hoist gotcha: this repo is an npm-workspaces member of `/home/glw907/Projects/cairn`, so a bare `npm install` from cairn-cms updates the workspace-root lock, not the per-repo lock; to relock the per-repo lock, temporarily move the workspace-root `package.json`/`package-lock.json` aside, run the install, then restore them. Commit `package-lock.json` only if its version field actually changed.

- [ ] **Step 2: Final gate**

Run `npm run check` (0/0), `npm test` (exit 0), and `npm run check:package` (green).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: bump 0.20.0 for content delete and the integrity guards

The lifecycle pass adds the content delete path, the delete guard, and the save
guard, plus four link-integrity fixes. The route surface and the new DeleteDialog
are additive; the minor moves to 0.20.0.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification items (no implementation task)

- **Main stays deployable.** Confirm the save guard returns `fail(400, ...)` with no commit on an absent target, and the delete guard returns `fail(409, ...)` with no commit on an inbound link, so neither path can commit a state the build would reject.
- **The build resolver is unchanged.** Confirm `buildLinkResolver` still throws on a miss (the backstop), and the manifest reconciliation only narrows what the manifest includes to match the index.
- **The picker still inserts valid links.** Confirm the escape change to `linkCompletions` and `insertInlineLink` leaves a normal title's link byte-identical (no escape when there is no metacharacter), so the Plan 3 tests still pass unchanged.
- **A live selection is verbatim.** Confirm `insertInlineLink` escapes only the title branch, so wrapping a selection that contains brackets keeps the author's text exactly.

## Pass-end review gate

This pass touches admin route logic, Svelte UI, and the manifest. The gate runs the simplifier over the changed code, then `svelte-reviewer` (the `EditPage` `form` reactivity, the delete dialog, the broken-links banner and the unwrap fix on the bound body), `daisyui-a11y-reviewer` (the delete dialog, the broken-links and draft alerts, the keyboard and focus path), and `cloudflare-workers-reviewer` (the `deleteAction` and the save guard's commit and fail paths, the `commitFiles` delete encoding), all Opus, plus a high-effort `/code-review`. `web-auth-security-reviewer` does not apply (no auth, session, cookie, or token change). The live `/admin` interactive smoke (open the delete dialog on a linked-to page and confirm it blocks; delete an unlinked page; save a body with a dangling link and confirm the block and the unwrap fix) is a carried fast-follow for the ecnordic migration, since the showcase has no admin routes and the browser component tests cover the dialogs and the banner here.

## Self-review notes

- **Spec coverage.** The delete path is Tasks 10, 11, 12, 13. The delete guard (block-until-clean, name inbound links) is Tasks 3, 10, 11, 12. The save guard (hard-block absent, warn draft, unwrap fix) is Tasks 2, 9, 13. The four fold-ins are Tasks 1 (bracket escaping), 4 (parseManifest guard), 5 (validation-failing consistency), and 6, 7, 8 (the editor nits). The exports and the bump are Tasks 14 and 15.
- **Type consistency.** `escapeLinkText(text): string`, `unwrapCairnLink(doc, href): string`, `inboundLinks(manifest, concept, id): InboundLink[]` with `InboundLink = { concept; id; title; permalink }`, the `EditData` additions `inboundLinks: InboundLink[]`, the `saveAction`/`deleteAction` `Promise<ReturnType<typeof fail> | never>` returns, the `DeleteDialog` props `{ conceptId; id; label; inboundLinks }`, and the `EditPage` `form?: { brokenLinks?; body? }` prop are used identically everywhere they appear.
- **No placeholders.** Every code step shows complete code. The tests that mirror an existing harness (Tasks 5, 8, 10, 11, 13) name the file to mirror and the exact assertions, since the existing setup is the cheapest correct fixture; where a fixture detail depends on the file's current shape (the edit-test fetch double, the delivery-manifest adapter), the task says to read it first and mirror it.
- **Testing layer.** The content-routes guards and delete are unit tests with a stubbed `fetch`, matching `content-routes-save.test.ts`, since the content routes have no D1. The design spec's "integration project" note was imprecise; this plan corrects it to the real harness.

---

## Post-mortem (executed and review-remediated 2026-06-02)

**What was built.** All fifteen tasks landed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet for the mechanical tasks, Opus for the save guard, `deleteAction`, and the `EditPage` wiring), commits `19e8c0b..b63ac2e`, then a simplifier commit `30d363d` and a review-gate fold-in `afbf08b`. Version bumped to `0.20.0` (additive). The delete path, both integrity guards, and the four carried fold-ins all shipped as specified. A few task-level adaptations: Task 5 added a date to the validation-failure fixtures so the permalink derivation does not throw and used a dedicated `requiredTitleAdapter` rather than mutating the shared fixture; Task 9 seeded a published `pages/about` row into two pre-existing commit-path tests so the new save guard does not block them; Task 12 reworded the blocked-delete count to lead with the label so the test's `/1 page/i` match holds and wired the otherwise-unused `conceptId`/`id` props into hidden form inputs; Tasks 10 and 13 added `inboundLinks: []` to sibling test fixtures the new non-optional `EditData` field required.

**Verification.** Gate at the fold-in tip (`afbf08b`): `npm run check` 774 files 0/0, `npm test` 570 exit 0, `check:package` all-green. The simplifier consolidated `DeleteDialog`'s pluralization (`30d363d`). Three Opus reviewers ran: `cloudflare-workers-reviewer` returned ship-it on `deleteAction` and the save guard; `svelte-reviewer` and `daisyui-a11y-reviewer` converged on a broken post-action feedback flow, folded in as `afbf08b` (surface the `deleteAction` 409 result, clear a fixed broken-link row, suppress the double "Saved" banner).

**The review gate's `/code-review` found real bugs; remediation followed (commits `2cf82ee`, `5bd8718`, `64ffdc4`, `2640e71`).** A high-effort seven-angle `/code-review` surfaced a cluster of CONFIRMED bugs that meant the save-guard recovery flow, the pass's headline feature, did not work end to end:

- `2cf82ee` (keystone). A blocked save re-seeded the editor from the committed body via `editLoad`, discarding the author's unsaved edits and the broken link they were told to fix (and wiping the whole document for a new entry); the returned `form.body` was never read. `EditPage` now seeds from `form?.body ?? data.body`. `unwrapCairnLink` was a raw regex `\[([^\]]*)\]\(href\)` that could not span the escaped-bracket display text the picker produces (so "Remove link" silently no-opped on exactly those titles), missed titled links, never unescaped on a match, and could rewrite a same-href occurrence inside a code span the mdast detector ignored; it is now an mdast-located offset splice (parse with the same pipeline as `extractCairnLinks`, visit `link` nodes by url, splice the unescaped text from last offset to first), which preserves the rest of the document exactly. The banner row hides only when the unwrap changed the body, and the refused-delete banner names the linkers itself instead of directing the user to a stale dialog.
- `5bd8718`. The hardened `parseManifest` validated entry scalars but only that `links` was an array; a malformed link element (missing id, a string, or null) passed and `inboundLinks` silently dropped a real inbound linker, letting the delete guard strand a link. It now validates each link element as a `{ concept, id }` string pair and type-checks an optional `date`.
- `64ffdc4`. The save guard pushed a self-link into the draft partition for a draft entry, so saving a draft that links to itself carried a spurious "links to an unpublished page" warning about itself. The guard now skips the entry being saved before classifying, mirroring `inboundLinks`.
- `2640e71`. `DeleteDialog` posts to `?/delete`, but the showcase admin edit route registered only the `save` action, so the shipped delete 404'd in the reference consumer and any site scaffolded from it. The route now registers `delete: routes.deleteAction`; the showcase production build exits 0.

Gate at the remediation tip (`2640e71`): `npm run check` 774 files 0/0, `npm test` 579 exit 0, showcase build exit 0.

**Decisions locked.** The delete guard is block-until-clean (the request-time inbound recompute in `deleteAction` is the authoritative gate). The save guard hard-blocks an absent target and warns a draft target, with the one-click unwrap fix on the local body. `unwrapCairnLink` is mdast-located, not a regex, so it agrees with the mdast detector on what a link is and never touches code. `parseManifest` validates the link-element shape the graph depends on, not just the array.

**Carried follow-ups.** Into the Plan 5 design: the `commitFiles` 422-on-absent-path delete edge (a delete of a path already gone from the tree surfaces as a raw 500 rather than the friendly conflict redirect; rename deletes the old path, so it folds in there). Recorded as known limitations: the manifest concurrency races (last-writer-wins on the git-committed manifest with no compare-and-swap, caught by the build's fail-closed backstop; rename shares the race). Smaller follow-ups: `buildSiteManifest` silently drops an invalid draft (the site gate skips drafts but the manifest validate has no draft exception, so a linked-to invalid draft reds the build far from root cause); a persistent always-present live region for the page alerts (the banners are `{#if}`-gated and announced inconsistently); and a perf-and-reuse cleanup (double `extractCairnLinks` per save, double `parseMarkdown` per file at build, sequential `editLoad` reads, the `byKey`/resolver key-shape duplication).
