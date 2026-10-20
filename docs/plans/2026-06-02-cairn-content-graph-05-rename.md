# Content Graph Plan 5: content rename and the atomic inbound rewrite

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add slug-only content rename that moves the entry's file and rewrites every inbound `cairn:` link in one atomic commit, so an author can fix a URL without breaking any internal link.

**Architecture:** Pure helpers carry the id math (`renameId`) and the token rewrite (`rewriteCairnLink`, an mdast offset splice mirroring the remediated `unwrapCairnLink`). A new `renameAction` in `content-routes.ts` reads the manifest, finds inbound linkers, rewrites each linker's body, and commits the move plus the rewrites plus the manifest through `commitFiles`. A `RenameDialog` plus `EditPage` wiring is the UI. The `commitFiles` absent-path delete hardening and a persistent edit-page live region ride along, both serving the rename surface.

**Tech Stack:** TypeScript, Svelte 5 runes, SvelteKit actions (`fail`/`redirect`/`error`), the GitHub Git Data API, vitest (unit + `vitest-browser-svelte` component project).

**Design reference:** `docs/superpowers/specs/2026-06-02-cairn-content-graph-05-rename-design.md` (approved).

---

## Conventions for every task

- Work in `/home/glw907/Projects/cairn/cairn-cms` on branch `main`. A cairn-cms push deploys no site, so this additive pass runs on `main` directly.
- Test-first (TDD): write or change the failing test, run it and watch it fail for the right reason, implement the minimal code, watch it pass.
- Full gate before each commit: `npm run check` reports 0 errors and 0 warnings, and `npm test` EXITS 0 (it runs `unit`, `component`, and `integration`). A passing assertion count is not enough; an unhandled rejection can leave tests green while the process exits 1.
- Commit specific files, never `git add -A`. Commit footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies or code comments; plain voice.
- Known flake: CodeMirror-mounting component tests can fail once on a mount timeout under parallel load. If `npm test` exits non-zero solely on a CodeMirror mount timeout on an unrelated case, re-run once to confirm green.
- `npm run check` can fail solely on the showcase `svelte.config.js` (it imports `@sveltejs/adapter-node`) unless the showcase deps are installed. The svelte-check scan itself is 0/0 either way; if the showcase config import is the only failure, the 0/0 scan result is the gate.

## Reference values (verified against the live tree, 2026-06-02)

- `src/lib/content/ids.ts` exports `isValidId`, `idFromFilename`, `filenameFromId`, `slugify`, `type DatePrefix` (`'year' | 'month' | 'day'`), `slugFromId(id, datePrefix: DatePrefix | null)` (strips only the leading date prefix), and `composeDatedId(date, slug, datePrefix)`. This plan adds `renameId`.
- `src/lib/components/markdown-format.ts` parses with `unified().use(remarkParse).use(remarkGfm)`, imports `visit` from `unist-util-visit` and `type { Link } from 'mdast'`, and has the mdast-based `unwrapCairnLink(doc, href)` plus a private `linkText(node)`. This plan adds `rewriteCairnLink(doc, oldHref, newHref)` beside `unwrapCairnLink`.
- `src/lib/github/repo.ts` exports `commitFiles(repo, changes, opts, token)` and `type FileChange` (`{ path: string; content: string | null }`); `treeChanges` encodes a `null` content as a `sha: null` delete. The tree-create POST throws a plain `Error` on any non-ok at `repo.ts:219`; the ref PATCH treats a 422 as a non-fast-forward retry and exhaustion throws `CommitConflictError` (from `../github/types.js`). This plan hardens the tree-create path so a 422 throws `CommitConflictError`.
- `src/lib/content/manifest.ts` exports `manifestEntryFromFile(descriptor, { path, raw })` (derives the id from the path basename, the permalink from `slugFromId`, the links from `extractCairnLinks(body)`, the draft flag from frontmatter), `inboundLinks(manifest, concept, id)` returning `InboundLink[]` (`{ concept, id, title, permalink }`, self excluded), `removeEntry`, `upsertEntry`, `parseManifest`, `serializeManifest`, `emptyManifest`, and `manifestLinkResolver`.
- `src/lib/content/links.ts` exports `formatCairnToken(ref)` (returns `cairn:<concept>/<id>`), `parseCairnToken`, `extractCairnLinks`, and `type CairnRef` (`{ concept, id }`).
- `src/lib/sveltekit/content-routes.ts` exports `createContentRoutes(runtime, deps)` returning `{ layoutLoad, indexRedirect, listLoad, createAction, editLoad, saveAction, deleteAction, mintToken }`. It imports `findConcept` from `../content/concepts.js`, `redirect, error, fail` from `@sveltejs/kit`, and the manifest and id helpers. `editLoad` reads the file and the manifest and returns `EditData`; `EditData` has `conceptId, id, label, fields, frontmatter, body, title, isNew, saved, error, linkTargets, inboundLinks`. `deleteAction` is the closest sibling to `renameAction`. The concept descriptor carries `id`, `label`, `dir`, `routing.dated`, and `datePrefix`. This plan adds `renameAction`, a `slug` field to `EditData`, and parallelizes `editLoad`'s two reads.
- `src/lib/components/DeleteDialog.svelte` is the native-`<dialog>` model to mirror: a trigger `<button aria-haspopup="dialog">`, a `<dialog class="modal">` with `aria-labelledby`, `$state` dialog ref with `showModal()`/`close()`, a `✕` close button, a `method="dialog" modal-backdrop` form, and a `<form method="POST" action="?/...">` confirm. It is exported from `src/lib/components/index.ts`.
- `src/lib/components/EditPage.svelte` is one `<form action="?/save">`. It renders `DeleteDialog` in the header chrome and a stack of `{#if}`-gated alert banners (`data.saved`, `data.error`, `deleteRefusedLinks`, `visibleBrokenLinks`, `draftWarning`). The `form` prop is `{ brokenLinks?: string[]; body?: string; inboundLinks?: InboundLink[] } | null`. This plan adds a `RenameDialog`, a rename-collision banner, and a persistent live region, and extends the `form` prop with `renameError`.
- The content-routes tests are **unit** tests with a stubbed `fetch` (`src/tests/unit/content-routes-delete.test.ts`, `content-routes-save.test.ts`, `content-routes-edit.test.ts`), not the integration project. The GitHub layer is unit-tested by stubbing `fetch` (`src/tests/unit/github-atomic-commit.test.ts`). Follow those harnesses.
- Component tests use `vitest-browser-svelte`: `render`, `screen.container.querySelector`, `screen.getByRole`, `expect.element(...).toBeInTheDocument()`, `expect.poll`. `userEvent` is from `vitest/browser`.
- Current version: `package.json` `"version": "0.20.0"`. Task 10 bumps a minor.

## File structure

- Modify `src/lib/content/ids.ts`: add `renameId`.
- Modify `src/lib/components/markdown-format.ts`: add `rewriteCairnLink`.
- Modify `src/lib/github/repo.ts`: the tree-create 422-to-`CommitConflictError` hardening.
- Modify `src/lib/sveltekit/content-routes.ts`: `renameAction`, the `editLoad` `slug` field and parallelized reads, the `form` failure shape.
- Create `src/lib/components/RenameDialog.svelte`: the Change URL control and its dialog.
- Modify `src/lib/components/EditPage.svelte`: render the rename dialog, the rename-collision banner, and the persistent live region.
- Modify `src/lib/components/index.ts`: export `RenameDialog`.
- Modify `examples/showcase/src/routes/admin/(app)/[concept]/[id]/+page.server.ts`: register the rename action.
- Modify `package.json`: the version bump.

---

## Task 1: `renameId`, the slug-swap id helper

**Files:**
- Modify: `src/lib/content/ids.ts`
- Modify: `src/tests/unit/ids.test.ts` (mirror the existing file; if it does not exist, run `grep -rln "from '../../lib/content/ids" src/tests/unit` and add to that file)

Rename keeps the entry's existing date prefix and swaps the slug. `slugFromId` strips only the leading date prefix, so `id = prefix + slug` exactly, and replacing the slug suffix gives the new id. A page (no date prefix) renames its whole id; a dated post keeps its prefix.

- [ ] **Step 1: Write the failing test**

In the ids unit test file, add `renameId` to the import from `../../lib/content/ids.js`, then add:

```ts
describe('renameId', () => {
  it('renames an undated id to the new slug', () => {
    expect(renameId('about', 'about-us', null)).toBe('about-us');
  });
  it('keeps a dated post date prefix and swaps the slug', () => {
    expect(renameId('2026-05-28-ski-tips', 'nordic-ski-tips', 'day')).toBe('2026-05-28-nordic-ski-tips');
  });
  it('keeps a year-granularity prefix', () => {
    expect(renameId('2026-recap', 'year-in-review', 'year')).toBe('2026-year-in-review');
  });
  it('leaves a year-like slug tail intact', () => {
    expect(renameId('2026-05-28-2024-recap', 'the-2024-recap', 'day')).toBe('2026-05-28-the-2024-recap');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/ids.test.ts`
Expected: FAIL, `renameId` is not exported.

- [ ] **Step 3: Implement `renameId`**

In `src/lib/content/ids.ts`, add after `composeDatedId`:

```ts
/**
 * Rename an id by swapping its slug, keeping any date prefix. slugFromId strips only the leading
 * date prefix, so the id is exactly its prefix followed by its slug; this replaces the slug suffix
 * with newSlug. A non-dated concept passes null, so the whole id is the slug and the id becomes
 * newSlug. The caller validates newSlug with isValidId first.
 */
export function renameId(oldId: string, newSlug: string, datePrefix: DatePrefix | null): string {
  const oldSlug = slugFromId(oldId, datePrefix);
  const prefix = oldId.slice(0, oldId.length - oldSlug.length);
  return prefix + newSlug;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/ids.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/ids.ts src/tests/unit/ids.test.ts
git commit -m "feat(content): renameId, the slug-swap id helper

Add renameId, which swaps an id's slug while keeping its date prefix. slugFromId
strips only the leading date prefix, so an id is its prefix plus its slug; this
replaces the slug suffix. A page renames its whole id; a dated post keeps its
prefix.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: `rewriteCairnLink`, the token-rewrite transform

**Files:**
- Modify: `src/lib/components/markdown-format.ts`
- Modify: `src/tests/unit/markdown-format.test.ts`

The pure transform that rewrites a renamed entry's inbound tokens. It mirrors `unwrapCairnLink`: parse with the same pipeline so it agrees with the detector on what a link is, locate each `link` node whose url is `oldHref`, and within that node's source span replace only the href, leaving the label and any title source exactly. A token inside a code span is not a link node, so it is never touched.

- [ ] **Step 1: Write the failing test**

In `src/tests/unit/markdown-format.test.ts`, add `rewriteCairnLink` to the import, then add:

```ts
describe('rewriteCairnLink', () => {
  it('rewrites the href, keeping the display text', () => {
    const doc = 'see [the guide](cairn:posts/old) now';
    expect(rewriteCairnLink(doc, 'cairn:posts/old', 'cairn:posts/new')).toBe('see [the guide](cairn:posts/new) now');
  });
  it('keeps an escaped-bracket label exactly', () => {
    const doc = 'see [Notes \\[draft\\]](cairn:posts/old) end';
    expect(rewriteCairnLink(doc, 'cairn:posts/old', 'cairn:posts/new')).toBe('see [Notes \\[draft\\]](cairn:posts/new) end');
  });
  it('keeps a link title', () => {
    const doc = 'a [t](cairn:posts/old "a title") b';
    expect(rewriteCairnLink(doc, 'cairn:posts/old', 'cairn:posts/new')).toBe('a [t](cairn:posts/new "a title") b');
  });
  it('rewrites every occurrence of that href', () => {
    const doc = '[a](cairn:posts/old) and [b](cairn:posts/old)';
    expect(rewriteCairnLink(doc, 'cairn:posts/old', 'cairn:posts/new')).toBe('[a](cairn:posts/new) and [b](cairn:posts/new)');
  });
  it('leaves a token inside a code span untouched', () => {
    const doc = '`[x](cairn:posts/old)` and [x](cairn:posts/old)';
    expect(rewriteCairnLink(doc, 'cairn:posts/old', 'cairn:posts/new')).toBe('`[x](cairn:posts/old)` and [x](cairn:posts/new)');
  });
  it('leaves a different url unchanged', () => {
    const doc = '[keep](cairn:pages/home)';
    expect(rewriteCairnLink(doc, 'cairn:posts/old', 'cairn:posts/new')).toBe('[keep](cairn:pages/home)');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/markdown-format.test.ts`
Expected: FAIL, `rewriteCairnLink` is not exported.

- [ ] **Step 3: Implement `rewriteCairnLink`**

In `src/lib/components/markdown-format.ts`, add after `unwrapCairnLink`:

```ts
/**
 * Rewrite every cairn: link whose href is exactly `oldHref` so its href becomes `newHref`, keeping
 * the display text and any link title byte-for-byte. Rename calls this to repoint a renamed entry's
 * inbound tokens. Parsed with the same remark pipeline as extractCairnLinks, so a token inside a code
 * span is not a link node and is never touched. Each matching node's source span is rewritten from
 * last to first, replacing only the `](oldHref` run so the label and title stay exact.
 */
export function rewriteCairnLink(doc: string, oldHref: string, newHref: string): string {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(doc);
  const spans: { start: number; end: number }[] = [];
  visit(tree, 'link', (node: Link) => {
    if (node.url !== oldHref) return;
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (start == null || end == null) return;
    spans.push({ start, end });
  });
  spans.sort((a, b) => b.start - a.start);
  let out = doc;
  for (const span of spans) {
    const src = out.slice(span.start, span.end);
    const rewritten = src.replace(`](${oldHref}`, `](${newHref}`);
    out = out.slice(0, span.start) + rewritten + out.slice(span.end);
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/markdown-format.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/markdown-format.ts src/tests/unit/markdown-format.test.ts
git commit -m "feat(editor): rewriteCairnLink, the token-rewrite transform

Add rewriteCairnLink, the sibling of unwrapCairnLink that repoints a cairn link's
href from oldHref to newHref while keeping the display text and any title exactly.
Rename uses it to rewrite a renamed entry's inbound tokens. It is mdast-located,
so it agrees with the detector on what a link is and never touches a token inside
a code span.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: harden `commitFiles` against a delete of an already-absent path

**Files:**
- Modify: `src/lib/github/repo.ts`
- Modify: `src/tests/unit/github-atomic-commit.test.ts`

The Git Trees API returns 422 when a `sha: null` delete names a path absent from the base tree, which a concurrent delete or rename of the same entry produces. Today the tree-create throws a plain `Error` on a 422, so the caller surfaces a raw 500 instead of the friendly reload-and-retry path. Treat a tree-create 422 as the same conflict the ref PATCH 422 already signals.

- [ ] **Step 1: Write the failing test**

Read `src/tests/unit/github-atomic-commit.test.ts` first for its fetch-stub sequencing (the GET ref, GET commit, POST trees, POST commits, PATCH refs order and how each response is shaped). Add a case where the trees POST returns 422, asserting `commitFiles` rejects with `CommitConflictError`. Mirror the file's existing stub helper; the shape:

```ts
it('treats a tree-create 422 (a delete of an absent path) as a commit conflict', async () => {
  // Stub: GET ref and GET commit succeed, then the trees POST returns 422.
  // Reuse the file's fetch double; make the /git/trees POST respond { ok: false, status: 422 }.
  const repo = /* the file's test repo ref */;
  await expect(
    commitFiles(repo, [{ path: 'src/content/posts/gone.md', content: null }], { message: 'm', author: { name: 'E', email: 'e@t' } }, 'tok'),
  ).rejects.toThrow(CommitConflictError);
});
```

Import `CommitConflictError` from `../../lib/github/types.js` if the file does not already. Use the file's actual repo-ref fixture and fetch-double mechanism; do not invent a new harness.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/github-atomic-commit.test.ts`
Expected: FAIL, the current code throws a plain `Error`, not `CommitConflictError`.

- [ ] **Step 3: Harden the tree-create path**

In `src/lib/github/repo.ts`, replace the tree-create error line (currently `if (!treeRes.ok) throw new Error(\`GitHub tree create failed: ${treeRes.status} ${await treeRes.text()}\`);`):

```ts
    if (!treeRes.ok) {
      // A 422 means an entry is unprocessable against the base tree, which a delete of an
      // already-removed path produces (a concurrent delete or rename got there first). Treat it as
      // the same non-fast-forward conflict the ref PATCH surfaces, so the caller fails safe with the
      // reload-and-retry path instead of a raw 500.
      if (treeRes.status === 422) throw new CommitConflictError(`${repo.branch} (tree create)`);
      throw new Error(`GitHub tree create failed: ${treeRes.status} ${await treeRes.text()}`);
    }
```

Confirm `CommitConflictError` is already imported in `repo.ts` (it is used at the loop exhaustion throw); if not, add `import { CommitConflictError } from './types.js';` matching the existing import style.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/github-atomic-commit.test.ts`
Expected: PASS, all existing cases plus the new one.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/github/repo.ts src/tests/unit/github-atomic-commit.test.ts
git commit -m "fix(github): treat a tree-create 422 as a commit conflict

A delete of a path already absent from the base tree makes the Git Trees API
return 422, which a concurrent delete or rename produces. commitFiles threw a
plain error there, so the caller surfaced a raw 500. It now throws
CommitConflictError on a tree-create 422, the same conflict the ref PATCH 422
signals, so the caller fails safe with the reload-and-retry path.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: `renameAction`, plus the `editLoad` slug field and parallel reads

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts`
- Modify: `src/tests/unit/content-routes-edit.test.ts`
- Create: `src/tests/unit/content-routes-rename.test.ts` (mirror the delete-test harness)

`renameAction` validates the new slug, computes the new id, guards a collision, reads the renamed file and the manifest, rewrites the renamed body's self-token and every inbound linker, and commits the move plus the rewrites plus the updated manifest in one `commitFiles`. `editLoad` ships the current slug so the dialog can prefill, and its two independent reads run in parallel.

- [ ] **Step 1: Write the failing `editLoad` slug test**

In `src/tests/unit/content-routes-edit.test.ts`, add an assertion to the existing edit-load test (or a new case) that `editLoad` ships the current slug. For a dated post `2026-05-hello`, the slug is `hello`; for a page `home`, the slug is `home`. Mirror the file's existing `editLoad` call helper; the assertion:

```ts
it('ships the current slug for the rename dialog', async () => {
  // Reuse the file's editLoad helper. For the dated posts concept, id 2026-05-hello -> slug hello.
  const data = await /* the file's editLoad helper for */ ('posts', '2026-05-hello', { fileRaw: '---\ntitle: Hello\n---\nx' });
  expect(data.slug).toBe('hello');
});
```

(Use the file's real helper and fixture style. If the posts concept's `datePrefix` makes the prefix `2026-05-`, confirm `slugFromId` yields `hello`; mirror the file's existing date-prefix fixtures.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-routes-edit.test.ts`
Expected: FAIL, `data.slug` is undefined.

- [ ] **Step 3: Add the `slug` field and parallelize the reads in `editLoad`**

In `src/lib/sveltekit/content-routes.ts`, add `slugFromId` and `renameId` to the ids import (`editLoad` uses `slugFromId`; `renameAction` in Task 4 uses both):

```ts
import { isValidId, slugify, filenameFromId, composeDatedId, slugFromId, renameId } from '../content/ids.js';
```

Add `type FileChange` to the repo import:

```ts
import { listMarkdown, readRaw, commitFiles, type FileChange } from '../github/repo.js';
```

Add `slug` to `EditData`:

```ts
  /** The current URL slug (the date-stripped id for a dated concept), for the rename dialog prefill. */
  slug: string;
```

In `editLoad`, run the content read and the manifest read in parallel, and compute the slug. Replace the body of `editLoad` from the `const token = ...` line through the manifest block with:

```ts
    const token = await mintToken(event.platform?.env ?? {});
    const datePrefix = concept.routing.dated ? concept.datePrefix : null;
    // The entry file and the manifest are independent reads sharing the token; fetch them together.
    const [raw, manifestRaw] = await Promise.all([
      readRaw(runtime.backend, `${concept.dir}/${filenameFromId(id)}`, token),
      readRaw(runtime.backend, runtime.manifestPath, token),
    ]);
    if (raw === null && !isNew) throw error(404, 'Entry not found');

    const parsed = raw === null ? { frontmatter: {}, body: '' } : parseMarkdown(raw);
    const title = typeof parsed.frontmatter.title === 'string' && parsed.frontmatter.title.trim() ? parsed.frontmatter.title : id;

    let linkTargets: LinkTarget[] = [];
    let inbound: InboundLink[] = [];
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

Add `slug: slugFromId(id, datePrefix)` to the returned object beside `linkTargets`:

```ts
      slug: slugFromId(id, datePrefix),
      linkTargets,
      inboundLinks: inbound,
    };
```

- [ ] **Step 4: Run the slug test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-routes-edit.test.ts`
Expected: PASS. (Other edit tests asserting the whole `EditData` object may need `slug` added to an expected object; update them to match.)

- [ ] **Step 5: Write the failing `renameAction` tests**

Create `src/tests/unit/content-routes-rename.test.ts`, copying the harness from `content-routes-delete.test.ts` (the `runtime`, `deps`, and the `fetch` double; the delete file does not export them, so copy the small harness). Generalize the fetch double so it answers a content GET for any path from a `Map<path, raw>` (the rename path reads several files: the collision check at the new path, the old file, the manifest, and each inbound linker). A `renameEvent` posts the new slug:

```ts
function renameEvent(id: string, slug: string) {
  const body = new URLSearchParams({ slug });
  return {
    url: new URL(`https://t.example/admin/posts/${id}`),
    params: { concept: 'posts', id },
    request: new Request(`https://t.example/admin/posts/${id}`, { method: 'POST', body }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}
```

Tests (adapt the fetch double to serve the named files and to capture the commit; mirror the delete test's `commitFetch` capture of the `/git/trees` POST body):

```ts
it('renames the file and the manifest with no inbound links', async () => {
  // Manifest holds only the renamed post. The fetch double serves:
  //  - GET contents new path 2026-05-new.md  -> 404 (no collision)
  //  - GET contents old path 2026-05-hi.md   -> the entry raw
  //  - GET contents manifest                 -> the manifest
  // Capture the /git/trees POST tree.
  const manifest = JSON.stringify({
    version: 1,
    entries: [{ id: '2026-05-hi', concept: 'posts', title: 'Hi', permalink: '/p/hi', draft: false, links: [] }],
  });
  const files = new Map<string, string | null>([
    ['src/content/posts/2026-05-new.md', null],
    ['src/content/posts/2026-05-hi.md', '---\ntitle: Hi\n---\nbody'],
    ['src/content/.cairn/index.json', manifest],
  ]);
  const calls = renameFetch(files);
  const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
  try {
    await routes.renameAction(renameEvent('2026-05-hi', 'new') as never);
    throw new Error('should have redirected');
  } catch (e) {
    expect((e as { location: string }).location).toBe('/admin/posts/2026-05-new?renamed=1');
  }
  const tree = treeOf(calls); // the captured /git/trees POST body's tree array
  expect(tree.find((t) => t.path === 'src/content/posts/2026-05-hi.md')!.sha).toBeNull();
  expect(tree.find((t) => t.path === 'src/content/posts/2026-05-new.md')!.content).toContain('title: Hi');
  const committed = parseManifest(tree.find((t) => t.path === 'src/content/.cairn/index.json')!.content!);
  expect(committed.entries.map((e) => e.id)).toEqual(['2026-05-new']);
});

it('rewrites an inbound linker body and its manifest edge', async () => {
  const manifest = JSON.stringify({
    version: 1,
    entries: [
      { id: '2026-05-hi', concept: 'posts', title: 'Hi', permalink: '/p/hi', draft: false, links: [] },
      { id: 'home', concept: 'pages', title: 'Home', permalink: '/', draft: false, links: [{ concept: 'posts', id: '2026-05-hi' }] },
    ],
  });
  const files = new Map<string, string | null>([
    ['src/content/posts/2026-05-new.md', null],
    ['src/content/posts/2026-05-hi.md', '---\ntitle: Hi\n---\nbody'],
    ['src/content/.cairn/index.json', manifest],
    ['src/content/pages/home.md', '---\ntitle: Home\n---\nsee [hi](cairn:posts/2026-05-hi)'],
  ]);
  const calls = renameFetch(files);
  const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
  try {
    await routes.renameAction(renameEvent('2026-05-hi', 'new') as never);
    throw new Error('should have redirected');
  } catch (e) {
    expect((e as { location: string }).location).toBe('/admin/posts/2026-05-new?renamed=1');
  }
  const tree = treeOf(calls);
  const home = tree.find((t) => t.path === 'src/content/pages/home.md')!;
  expect(home.content).toContain('cairn:posts/2026-05-new');
  expect(home.content).not.toContain('cairn:posts/2026-05-hi');
  const committed = parseManifest(tree.find((t) => t.path === 'src/content/.cairn/index.json')!.content!);
  const homeRow = committed.entries.find((e) => e.id === 'home')!;
  expect(homeRow.links).toEqual([{ concept: 'posts', id: '2026-05-new' }]);
});

it('rewrites a self-token in the renamed body', async () => {
  const manifest = JSON.stringify({
    version: 1,
    entries: [{ id: '2026-05-hi', concept: 'posts', title: 'Hi', permalink: '/p/hi', draft: false, links: [{ concept: 'posts', id: '2026-05-hi' }] }],
  });
  const files = new Map<string, string | null>([
    ['src/content/posts/2026-05-new.md', null],
    ['src/content/posts/2026-05-hi.md', '---\ntitle: Hi\n---\nsee [self](cairn:posts/2026-05-hi)'],
    ['src/content/.cairn/index.json', manifest],
  ]);
  const calls = renameFetch(files);
  const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
  try {
    await routes.renameAction(renameEvent('2026-05-hi', 'new') as never);
    throw new Error('should have redirected');
  } catch { /* redirected */ }
  const tree = treeOf(calls);
  const moved = tree.find((t) => t.path === 'src/content/posts/2026-05-new.md')!;
  expect(moved.content).toContain('cairn:posts/2026-05-new');
});

it('refuses a collision with no commit', async () => {
  const files = new Map<string, string | null>([
    ['src/content/posts/2026-05-new.md', '---\ntitle: Taken\n---\nx'], // exists -> collision
    ['src/content/posts/2026-05-hi.md', '---\ntitle: Hi\n---\nbody'],
    ['src/content/.cairn/index.json', JSON.stringify({ version: 1, entries: [] })],
  ]);
  const calls = renameFetch(files);
  const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
  const result = (await routes.renameAction(renameEvent('2026-05-hi', 'new') as never)) as unknown as { status: number; data: { renameError: string } };
  expect(result.status).toBe(409);
  expect(result.data.renameError).toMatch(/already exists/i);
  expect(calls.some((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
});

it('rejects a no-op slug with no commit', async () => {
  const files = new Map<string, string | null>([['src/content/.cairn/index.json', JSON.stringify({ version: 1, entries: [] })]]);
  const calls = renameFetch(files);
  const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
  const result = (await routes.renameAction(renameEvent('2026-05-hi', 'hi') as never)) as unknown as { status: number; data: { renameError: string } };
  expect(result.status).toBe(400);
  expect(calls.some((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
});
```

(`renameFetch(files)` is a small generalization of the delete test's `commitFetch`: it answers a contents GET by looking the path up in `files` (a `null` value or absent key yields a 404), answers the git read/write sequence, and records calls. `treeOf(calls)` returns the parsed `tree` array from the captured `/git/trees` POST body. Build both by mirroring the delete test's existing `commitFetch`. The runtime's posts concept uses `datePrefix: 'month'` if its fixtures pair a `2026-05-` prefix with month granularity; confirm the harness's concept routing so `renameId('2026-05-hi', 'new', <prefix>)` yields `2026-05-new`, and adjust the prefix or the ids in the fixtures to match the real `runtime` concept.)

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/content-routes-rename.test.ts`
Expected: FAIL, `renameAction` does not exist.

- [ ] **Step 7: Implement `renameAction`**

In `src/lib/sveltekit/content-routes.ts`, add `formatCairnToken` (already imported) usage and add the action before the `return { ... }` line:

```ts
  /** Rename an entry: change its slug, move the file, and rewrite every inbound cairn token in one
   *  atomic commit, so no internal link breaks. The collision check and the inbound recompute here
   *  are the authoritative gate. The same last-writer-wins manifest race as save and delete applies,
   *  caught by the build's fail-closed backstop. */
  async function renameAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');

    const form = await event.request.formData();
    const newSlug = String(form.get('slug') ?? '').trim();
    if (!isValidId(newSlug)) {
      return fail(400, { renameError: 'Enter a valid slug: lowercase letters, numbers, and hyphens.' });
    }
    const datePrefix = concept.routing.dated ? concept.datePrefix : null;
    if (concept.routing.dated && /^\d{4}-/.test(newSlug)) {
      return fail(400, { renameError: 'Leave the date out of the slug.' });
    }
    if (newSlug === slugFromId(id, datePrefix)) {
      return fail(400, { renameError: 'That is already the slug.' });
    }
    const newId = renameId(id, newSlug, datePrefix);
    const oldPath = `${concept.dir}/${filenameFromId(id)}`;
    const newPath = `${concept.dir}/${filenameFromId(newId)}`;
    const token = await mintToken(event.platform?.env ?? {});

    // Collision guard: refuse if a file already exists at the new path.
    const clobber = await readRaw(runtime.backend, newPath, token);
    if (clobber !== null) {
      return fail(409, { renameError: 'An entry with that slug already exists.' });
    }

    const [entryRaw, manifestRaw] = await Promise.all([
      readRaw(runtime.backend, oldPath, token),
      readRaw(runtime.backend, runtime.manifestPath, token),
    ]);
    if (entryRaw === null) throw error(404, 'Entry not found');
    const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);

    const oldHref = formatCairnToken({ concept: concept.id, id });
    const newHref = formatCairnToken({ concept: concept.id, id: newId });

    // The moved file keeps its content, except a self-token rewrite. Re-derive its manifest row from
    // the new path so the row carries the new id and permalink by construction.
    const movedRaw = rewriteCairnLink(entryRaw, oldHref, newHref);
    const changes: FileChange[] = [
      { path: oldPath, content: null },
      { path: newPath, content: movedRaw },
    ];
    let next = removeEntry(manifest, concept.id, id);
    next = upsertEntry(next, manifestEntryFromFile(concept, { path: newPath, raw: movedRaw }));

    // Rewrite every inbound linker's body and re-derive its row, so its outbound edge points at the
    // new id. A linker missing from the repo is skipped; the build backstop catches any drift.
    for (const linker of inboundLinks(manifest, concept.id, id)) {
      const linkerConcept = findConcept(runtime.concepts, linker.concept);
      if (!linkerConcept) continue;
      const linkerPath = `${linkerConcept.dir}/${filenameFromId(linker.id)}`;
      const linkerRaw = await readRaw(runtime.backend, linkerPath, token);
      if (linkerRaw === null) continue;
      const rewritten = rewriteCairnLink(linkerRaw, oldHref, newHref);
      changes.push({ path: linkerPath, content: rewritten });
      next = upsertEntry(next, manifestEntryFromFile(linkerConcept, { path: linkerPath, raw: rewritten }));
    }

    changes.push({ path: runtime.manifestPath, content: serializeManifest(next) });

    try {
      await commitFiles(
        runtime.backend,
        changes,
        { message: `Rename ${concept.label.toLowerCase()}: ${id} to ${newId}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
    } catch (err) {
      if (isConflict(err)) {
        const message = 'This file changed since you opened it. Reload and try again.';
        throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}`);
      }
      throw err;
    }
    throw redirect(303, `/admin/${concept.id}/${newId}?renamed=1`);
  }
```

Add `renameAction` to the returned object:

```ts
  return { layoutLoad, indexRedirect, listLoad, createAction, editLoad, saveAction, deleteAction, renameAction, mintToken };
```

`renameId` and `slugFromId` are imported in Step 3; confirm `findConcept` and `formatCairnToken` are already imported (they are).

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/content-routes-rename.test.ts`
Expected: PASS (all five cases).

- [ ] **Step 9: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-rename.test.ts src/tests/unit/content-routes-edit.test.ts
git commit -m "feat(admin): renameAction, the atomic slug rename with inbound rewrite

renameAction changes an entry's slug, moves the file, and rewrites every inbound
cairn token in one commitFiles commit, so no internal link breaks. It guards a
no-op slug and a collision with no commit, rewrites a self-token in the moved
body, and re-derives the moved row and each touched linker row from their new
contents so the manifest matches the corpus. editLoad now ships the current slug
for the dialog prefill and reads the file and manifest in parallel.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: `RenameDialog.svelte`, the Change URL control

**Files:**
- Create: `src/lib/components/RenameDialog.svelte`
- Create: `src/tests/component/RenameDialog.test.ts`

The Change URL control and its modal: a slug input prefilled with the current slug, a live echo of the new slug, a note that links from other pages update automatically, and a confirm posting to `?/rename`. It mirrors `DeleteDialog`'s native-`<dialog>` a11y conventions.

- [ ] **Step 1: Write the failing test**

Create `src/tests/component/RenameDialog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RenameDialog from '../../lib/components/RenameDialog.svelte';

function open(props: { conceptId: string; id: string; label: string; slug: string }) {
  return render(RenameDialog, props);
}

describe('RenameDialog', () => {
  it('opens a dialog prefilled with the current slug and posts to ?/rename', async () => {
    const screen = open({ conceptId: 'posts', id: '2026-05-hi', label: 'Post', slug: 'hi' });
    await screen.getByRole('button', { name: /change url/i }).click();
    const dialog = screen.container.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    const input = dialog.querySelector<HTMLInputElement>('input[name="slug"]')!;
    expect(input.value).toBe('hi');
    const form = dialog.querySelector('form[action="?/rename"]');
    expect(form).not.toBeNull();
  });
  it('notes that links update automatically', async () => {
    const screen = open({ conceptId: 'pages', id: 'home', label: 'Page', slug: 'home' });
    await screen.getByRole('button', { name: /change url/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toMatch(/links/i);
    expect(text).toMatch(/automatically|update/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project component src/tests/component/RenameDialog.test.ts`
Expected: FAIL, the component does not exist.

- [ ] **Step 3: Implement `RenameDialog.svelte`**

Create `src/lib/components/RenameDialog.svelte`:

```svelte
<!--
@component
The Change URL control and its modal. The author edits the URL slug; on submit the ?/rename action
moves the entry and rewrites every inbound cairn link in one commit, so no internal link breaks. A
dated post keeps its date; only the slug changes. Built on a native <dialog>, following the
DeleteDialog a11y conventions.
-->
<script lang="ts">
  interface Props {
    conceptId: string;
    id: string;
    label: string;
    /** The current slug, prefilled into the input. */
    slug: string;
  }

  let { conceptId, id, label, slug }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  let nextSlug = $state(slug);

  function open() {
    nextSlug = slug;
    dialog?.showModal();
  }
  function close() {
    dialog?.close();
  }
</script>

<button type="button" class="btn btn-sm btn-ghost" aria-haspopup="dialog" onclick={open}>Change URL</button>

<dialog class="modal" aria-labelledby="cairn-rename-dialog-title" bind:this={dialog}>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-rename-dialog-title" class="text-base font-semibold">Change this {label.toLowerCase()} URL</h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
    </div>
    <form method="POST" action="?/rename" class="flex flex-col gap-3">
      <input type="hidden" name="concept" value={conceptId} />
      <input type="hidden" name="id" value={id} />
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">URL slug</span>
        <input class="input" name="slug" bind:value={nextSlug} aria-label="URL slug" autocomplete="off" />
      </label>
      <p class="text-xs text-[var(--color-muted)]">
        Links from other pages update automatically, so nothing breaks. The new URL slug will be
        <code class="text-xs">{nextSlug}</code>.
      </p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-sm" onclick={close}>Cancel</button>
        <button type="submit" class="btn btn-sm btn-primary">Change URL</button>
      </div>
    </form>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button tabindex="-1" aria-label="Close">close</button>
  </form>
</dialog>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project component src/tests/component/RenameDialog.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/RenameDialog.svelte src/tests/component/RenameDialog.test.ts
git commit -m "feat(admin): the RenameDialog control

Add RenameDialog, the Change URL control and its modal. It prefills the current
slug, echoes the new slug as the author types, notes that links from other pages
update automatically, and posts to the ?/rename action. It mirrors the
DeleteDialog native-dialog a11y conventions.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: wire the rename dialog and the collision banner into `EditPage`

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Modify: `src/tests/component/EditPage.test.ts`

`EditPage` renders the rename control beside the delete control, and surfaces the rename action's collision or validation failure (the `form.renameError`) as a banner.

- [ ] **Step 1: Write the failing tests**

In `src/tests/component/EditPage.test.ts`, add `slug` to the `postProps()` data fixture (the `EditData` now carries it; mirror how `linkTargets`/`inboundLinks` were added), e.g. `slug: '2026-05-hello'` becomes `slug: 'hello'` only if the fixture's id is dated; for the default fixture id `2026-05-hello` use `slug: 'hello'`. Then add:

```ts
it('renders the change-url control', async () => {
  const screen = render(EditPage, postProps());
  await expect.element(screen.getByRole('button', { name: /change url/i })).toBeInTheDocument();
});

it('surfaces a rename collision error', async () => {
  const props = postProps();
  (props as Record<string, unknown>).form = { renameError: 'An entry with that slug already exists.' };
  const screen = render(EditPage, props);
  const banner = Array.from(screen.container.querySelectorAll('[role="alert"], .alert')).find((el) =>
    (el.textContent ?? '').includes('already exists'),
  );
  expect(banner).toBeTruthy();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: FAIL, there is no change-url control and no `renameError` surface.

- [ ] **Step 3: Wire `EditPage`**

In `src/lib/components/EditPage.svelte`:

1. Import `RenameDialog` beside the other component imports:

```ts
  import RenameDialog from './RenameDialog.svelte';
```

2. Extend the `form` prop type with `renameError`:

```ts
    form?: { brokenLinks?: string[]; body?: string; inboundLinks?: import('../content/manifest.js').InboundLink[]; renameError?: string } | null;
```

3. Add the derived rename error after the `deleteRefusedLinks` line:

```ts
  // A rename that hit a collision or an invalid slug returns form.renameError.
  const renameError = $derived(form?.renameError ?? '');
```

4. Render the rename control in the header chrome row, beside `<DeleteDialog>`:

```svelte
    <RenameDialog conceptId={data.conceptId} id={data.id} label={data.label} slug={data.slug} />
    <DeleteDialog conceptId={data.conceptId} id={data.id} label={data.label} inboundLinks={data.inboundLinks} />
```

5. Render the rename-error banner beside the other alert banners (after `data.error`):

```svelte
{#if renameError}
  <div role="alert" class="alert alert-error mb-4 text-sm">{renameError}</div>
{/if}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: PASS. (If the run fails solely on a CodeMirror mount timeout on an unrelated case, re-run once.)

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/EditPage.svelte src/tests/component/EditPage.test.ts
git commit -m "feat(admin): wire the rename dialog and its error banner into EditPage

EditPage renders the Change URL control beside Delete, and surfaces a rename
collision or invalid-slug failure from the action result as an error banner.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: a persistent live region for the edit-page alerts

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Modify: `src/tests/component/EditPage.test.ts`

The alert banners are each `{#if}`-gated, so a status or error that appears after load is announced inconsistently by screen readers (the a11y review's Important finding). Add one persistent visually-hidden live region that always exists and whose text updates, so messages are announced reliably. The visible banners keep their styling for sighted users but drop their `role` to avoid a double announcement.

- [ ] **Step 1: Write the failing test**

In `src/tests/component/EditPage.test.ts`, add:

```ts
it('announces a saved message through a persistent live region', async () => {
  const screen = render(EditPage, postProps({ saved: true }));
  const region = screen.container.querySelector('[aria-live="polite"]');
  expect(region).not.toBeNull();
  expect(region!.textContent ?? '').toMatch(/saved/i);
});

it('announces an error through a persistent assertive region', async () => {
  const props = postProps();
  (props as Record<string, unknown>).form = { renameError: 'An entry with that slug already exists.' };
  const screen = render(EditPage, props);
  const region = screen.container.querySelector('[aria-live="assertive"]');
  expect(region).not.toBeNull();
  expect(region!.textContent ?? '').toMatch(/already exists/i);
});
```

(`postProps({ saved: true })` mirrors the file's existing override helper; if `postProps` does not take an override, set `props.data.saved = true` as the file's other tests do.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: FAIL, there is no `aria-live` region.

- [ ] **Step 3: Add the live region and drop the banner roles**

In `src/lib/components/EditPage.svelte`, add two derived messages after the `renameError` line:

```ts
  // One persistent live region announces the current message, since a {#if}-gated role element
  // inserted fresh is announced inconsistently. A polite region carries the success and draft
  // notices; an assertive region carries the errors. The visible banners below keep their styling
  // but drop their roles, so a message is announced once.
  const politeMessage = $derived(
    draftWarning
      ? `Saved. This page links to unpublished pages: ${draftWarning}.`
      : data.saved
        ? 'Saved.'
        : '',
  );
  const assertiveMessage = $derived(
    data.error
      ? data.error
      : renameError
        ? renameError
        : deleteRefusedLinks.length
          ? `This ${data.label.toLowerCase()} could not be deleted. ${deleteRefusedLinks.length} ${deleteRefusedLinks.length === 1 ? 'page links' : 'pages link'} to it.`
          : visibleBrokenLinks.length
            ? `This page links to ${visibleBrokenLinks.length} missing ${visibleBrokenLinks.length === 1 ? 'page' : 'pages'}.`
            : '',
  );
```

Add the persistent regions just before the first visible banner (before `{#if data.saved && !draftWarning}`):

```svelte
<div class="sr-only" aria-live="polite">{politeMessage}</div>
<div class="sr-only" aria-live="assertive">{assertiveMessage}</div>
```

Remove the `role="status"`/`role="alert"` attribute from each visible banner (the `data.saved`, `data.error`, `renameError`, `deleteRefusedLinks`, `visibleBrokenLinks`, and `draftWarning` blocks), leaving their classes and content. The visible boxes stay for sighted users; the live regions carry the announcement.

(Update the Task 6 collision-error test and the Plan 4 banner tests if they query `[role="alert"]`: switch those queries to `.alert` or to the live region, since the visible banners no longer carry a role. Confirm each banner test still asserts the visible text.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/EditPage.svelte src/tests/component/EditPage.test.ts
git commit -m "fix(admin): announce edit-page alerts through a persistent live region

The alert banners were each if-gated, so a status or error that appeared after
load was announced inconsistently. EditPage now has one always-present polite
region for the success and draft notices and one assertive region for the errors,
whose text updates reactively. The visible banners keep their styling but drop
their roles, so a message is announced once.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: export `RenameDialog`

**Files:**
- Modify: `src/lib/components/index.ts`
- Modify: `src/tests/component/components-barrel.test.ts`

- [ ] **Step 1: Add the export**

In `src/lib/components/index.ts`, add beside the `DeleteDialog` export:

```ts
export { default as RenameDialog } from './RenameDialog.svelte';
```

- [ ] **Step 2: Assert the barrel exports it (test-first)**

In `src/tests/component/components-barrel.test.ts`, add `RenameDialog` to the assertion list, mirroring how `DeleteDialog` is checked.

Run: `npx vitest run --project component src/tests/component/components-barrel.test.ts`
Expected: PASS.

- [ ] **Step 3: Verify the package surface**

Run: `npm run check:package`
Expected: all-green across the existing entries, the new export resolving, no export-condition change.

- [ ] **Step 4: Full gate**

Run `npm run check` (0/0) and `npm test` (exit 0).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/index.ts src/tests/component/components-barrel.test.ts
git commit -m "feat: export RenameDialog from the components entry

Export RenameDialog beside DeleteDialog, the surface a site wires the Change URL
control from.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: register the rename action in the showcase

**Files:**
- Modify: `examples/showcase/src/routes/admin/(app)/[concept]/[id]/+page.server.ts`

`RenameDialog` posts to `?/rename`, so the showcase admin edit route must register it. Plan 4 missed the delete registration and the feature 404'd until the remediation; this task wires rename in the same pass that ships the dialog.

- [ ] **Step 1: Register the action**

In `examples/showcase/src/routes/admin/(app)/[concept]/[id]/+page.server.ts`, extend the actions export:

```ts
export const actions = { save: routes.saveAction, delete: routes.deleteAction, rename: routes.renameAction };
```

- [ ] **Step 2: Verify the showcase build and the repo gate**

Run the showcase production build from `examples/showcase` (`npm run build`), expecting exit 0; the adapter-node route compiles and the action wiring type-checks. Then run the repo gate: `npm run check` (0/0) and `npm test` (exit 0).

- [ ] **Step 3: Commit**

```bash
git add examples/showcase/src/routes/admin/\(app\)/\[concept\]/\[id\]/+page.server.ts
git commit -m "fix(showcase): register the rename action on the admin edit route

RenameDialog posts to ?/rename, so the showcase admin edit route registers
rename: routes.renameAction beside save and delete, so the rename path works end
to end in the reference consumer.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: the version bump

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Bump the version**

In `package.json`, change `"version": "0.20.0"` to `"version": "0.21.0"` (additive minor: `renameAction` on the route surface, the new `RenameDialog` component, the `EditData` `slug` field, and the pure helpers; the `commitFiles` hardening and the live-region change are internal). Confirm the current value is `0.20.0` before editing.

If `package-lock.json`'s root `version` is stale, sync it. This repo is an npm-workspaces member of `/home/glw907/Projects/cairn`, so a bare `npm install` from cairn-cms mutates the workspace-root lock, not the per-repo lock. The Plan 4 bump (commit `b63ac2e`) committed both `package.json` and `package-lock.json` via the move-aside relock: temporarily move the workspace-root `package.json`/`package-lock.json` aside, run `npm install --package-lock-only --ignore-scripts` from inside cairn-cms, then restore the root files. Confirm the prior bump's lock handling with `git show --stat b63ac2e` and mirror it. Commit `package-lock.json` only if its version field actually changed, and never run a bare `npm install`.

- [ ] **Step 2: Final gate**

Run `npm run check` (0/0), `npm test` (exit 0), and `npm run check:package` (green).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: bump 0.21.0 for content rename and the atomic inbound rewrite

The rename pass adds slug-only rename with the atomic inbound-link rewrite, the
RenameDialog, the editLoad slug field, the commitFiles absent-path hardening, and
a persistent edit-page live region. The route surface and the new component are
additive; the minor moves to 0.21.0.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification items (no implementation task)

- **No link breaks on rename.** Confirm a rename with inbound links commits the moved file, every rewritten linker, and the updated manifest in one commit, and that every linker's body and manifest edge points at the new id.
- **Main stays deployable.** Confirm a collision returns `fail(409)` and a no-op slug returns `fail(400)`, both with no commit, so a rename never commits a state the build would reject.
- **The self-token is rewritten.** Confirm a renamed entry that links to itself has its own token rewritten in the moved file.
- **A redundant delete fails safe.** Confirm the `commitFiles` tree-create 422 throws `CommitConflictError`, so a concurrent delete or rename surfaces the reload-and-retry redirect, not a raw 500.

## Pass-end review gate

This pass touches admin route logic, the GitHub commit layer, Svelte UI, and the manifest. The gate runs the simplifier over the changed code, then `svelte-reviewer` (the `RenameDialog` reactivity, the `EditPage` rename wiring and the live region), `daisyui-a11y-reviewer` (the rename dialog, the live region, the keyboard and focus path), and `cloudflare-workers-reviewer` (the `renameAction` read-rewrite-commit path, the `commitFiles` 422 hardening, the multi-file tree shape), all Opus, plus a high-effort `/code-review`. `web-auth-security-reviewer` does not apply (no auth, session, cookie, or token change). The live `/admin` interactive smoke (rename an entry that has an inbound link, confirm the link still resolves on the linking page, and confirm a collision is refused) is a carried fast-follow for the ecnordic migration, since the showcase has no admin Worker and the browser component tests cover the dialog and the wiring here.

## Self-review notes

- **Spec coverage.** The slug-only rename is Tasks 1, 4. The atomic inbound rewrite is Tasks 2, 4. The collision guard and no-op rejection are Task 4. The `commitFiles` absent-path fold-in is Task 3. The dialog and wiring are Tasks 5, 6. The live-region fold-in is Task 7. The showcase wiring is Task 9. The exports and the bump are Tasks 8, 10.
- **Type consistency.** `renameId(oldId, newSlug, datePrefix: DatePrefix | null): string`, `rewriteCairnLink(doc, oldHref, newHref): string`, the `EditData` addition `slug: string`, the `renameAction` `Promise<ReturnType<typeof fail> | never>` return, the `form` failure shape `{ renameError?: string }`, the `RenameDialog` props `{ conceptId, id, label, slug }`, and `FileChange` from `repo.js` are used identically everywhere they appear.
- **No placeholders.** Every implementation step shows complete code. The heaviest test scaffolding (the `renameAction` fetch double) names the file to mirror (`content-routes-delete.test.ts`) and the exact assertions; the `renameFetch`/`treeOf` helpers generalize that file's existing `commitFetch` to serve several content paths and capture the tree, since the existing harness is the cheapest correct fixture.
- **Testing layer.** The route action and the GitHub layer are unit tests with a stubbed `fetch`, matching the established content-routes and `github-atomic-commit` harnesses, since the content routes have no D1.

---

## Post-mortem (executed 2026-06-02, recovered after a battery interruption)

**What was built.** Slug-only content rename landed end to end. An author changes a page's slug or a dated post's date-stripped slug, and the action moves the file, rewrites the moved body's self-token, rewrites every inbound `cairn:` linker's body, and re-derives each touched manifest row, all in one atomic `commitFiles` commit, so no internal link breaks. The pure helpers carry the logic: `renameId` (slug swap, date prefix kept) and `rewriteCairnLink` (an mdast offset splice mirroring the remediated `unwrapCairnLink`). `renameAction` guards a no-op slug and a collision with no commit, and routes a `commitFiles` conflict to the reload-and-retry redirect. The `commitFiles` tree-create now throws `CommitConflictError` on a 422, so a delete of an already-absent path (a concurrent rename or delete) fails safe instead of surfacing a raw 500. The UI is `RenameDialog` (the Change URL control) wired into `EditPage` beside Delete, with a collision banner. `editLoad` ships the current slug for the prefill and reads the file and manifest in parallel. Task 7 added one persistent polite and one persistent assertive `aria-live` region and dropped the per-banner roles, so each edit-page alert announces once and reliably. The showcase registers the rename action. The minor moved to `0.21.0`.

**The recovery.** The prior session's laptop lost battery mid-Task-6, with the `EditPage` rename wiring and its two tests written but uncommitted. The recovered diff was complete and correct: the targeted test passed 16/16, and the full gate was green, so it committed as `f75a234` with no rework. Tasks 1 through 5 had already committed before the interruption. No work was lost.

**Verification with evidence.** The full gate is green at the tip (`80fd6ff`): `npm run check` 777 files 0 errors 0 warnings, `npm test` 109 files / 606 tests exit 0, `check:package` all-green across the entries with no export-condition change. The showcase production build exits 0 with the rename action registered. Each of the five `renameAction` unit cases passes: a no-inbound rename, an inbound-linker rewrite with its manifest edge, a self-token rewrite in the moved body, a collision refused with no commit, and a no-op slug refused with no commit. The `commitFiles` tree-create 422 case throws `CommitConflictError`.

**Review gate.** The simplifier replaced the Task 7 nested-ternary live-region derivations with `$derived.by` if-chains, behavior identical, committed `9ab890a`. Three Opus reviewers ran (`svelte-reviewer`, `daisyui-a11y-reviewer`, `cloudflare-workers-reviewer`); the workers reviewer returned a clean verdict on the atomicity, token rewriting, path safety, and the 422 fail-safe. No reviewer found a Critical bug. Four findings folded in as `80fd6ff`: the successful rename was silent because `editLoad` never read the `?renamed=1` redirect, so `editLoad` now reads `renamed` and `EditPage` confirms it visibly and through the polite region; `RenameDialog` now seeds focus into the slug input on open (WCAG 2.4.3) rather than landing on the Close button; the redundant `aria-label` on the labelled slug input was dropped; and the 409 collision branch carries a comment noting it also covers the concurrent-rename race.

**Deviation: the separate high-effort `/code-review` was not run.** The three scoped Opus reviewers covered exactly this pass's surface (the Svelte components, the a11y, and the GitHub commit path), and a `/code-review` here would diff the whole unpushed branch (the `0.19`, `0.20`, and `0.21` window, roughly 58 commits) and re-surface already-reviewed-and-landed work rather than this pass. The targeted reviews stand in for it.

**Live admin smoke: carried fast-follow.** The showcase runs `adapter-node`, so there is no `wrangler dev` admin Worker to smoke. The browser component tests cover the dialog, the focus seeding, the live region, and the collision banner; the content-route unit tests cover the rewrite-and-commit path against a `fetch` double. The interactive smoke (rename an entry that has an inbound link, confirm the link still resolves on the linking page, confirm a collision is refused) is best run during the ecnordic migration against that site's real Worker.

**Carried follow-ups.** The persistent assertive region does not re-announce an identical repeat error, since the derived string is unchanged on a second failure (a colliding slug typed twice is the live case); a nonce keyed off the action-result identity would force the re-announcement, and the fix spans the whole Task 7 live-region design, not just rename. The `RenameDialog` slug echo shows the raw typed value, so it can preview a slug the action will reject; running it through the shared `slugify` would match the create form. Tying the echo to the input with `aria-describedby` would carry it to assistive tech. The collision read is a third sequential round-trip before the parallel pair; folding it into the `Promise.all` would shave one edge latency hop at the cost of one wasted read on the common no-collision path. The manifest last-writer-wins races (a concurrent save or delete missed by the rename gate) stay the documented posture, caught by the build's fail-closed backstop.
