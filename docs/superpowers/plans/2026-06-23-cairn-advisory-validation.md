# Advisory validation and address collisions (editor-help Pass 3) Implementation Plan

> **For agentic workers:** Execute with the cairn model: dispatch each task to `cairn-implementer`
> (pinned Sonnet), test-first, and clear the full gate before the next dispatch; the main loop reviews
> each diff and verifies the gate. Steps use checkbox (`- [ ]`) syntax. Upshift a dispatch
> (`model: opus`) only for a task the plan does not fully specify.

**Goal:** Add an internal advisory-notices channel in the entry editor and the first notice that rides
it, a cross-branch address-uniqueness warning, both warn-and-allow and never a publish gate.

**Architecture:** A new pure-ish module (`content/advisories.ts`) defines the serializable notice shape
and a cross-branch address index modeled on `media/usage.ts`. `editLoad` builds the index and returns an
`address-collision` notice on `EditData`; `publishAction` re-checks and emits a `publish.address_collision`
log event without gating. `EditPage` grows one shared advisory region, through which both the server
address-collision notice and the existing client-derived needs-alt notice render.

**Tech Stack:** TypeScript, Svelte 5 runes, SvelteKit 2, DaisyUI v5 and Tailwind v4, Cloudflare Workers
with D1 and R2, vitest (unit, integration, component). Design record:
`docs/superpowers/specs/2026-06-23-cairn-advisory-validation-design.md`.

## Global Constraints

- Test-first. The full gate per task: `npm run check` 0 errors and 0 warnings, `npm test` exits 0 (the
  process exits 0, not merely a passing assertion count). Run on a fresh worktree branched off `main`,
  and run `npm run package` before `npm test` (the dist-not-built worktree gotcha,
  `cairn-worktree-needs-dist-build`).
- Warn-and-allow, last-write-wins. The address collision never gates Publish. The check fails open: any
  cross-branch read failure degrades to no notice, never a thrown editor or a blocked publish.
- The advisory channel is internal (no public adapter API). `AdvisoryNotice`/`AdvisoryAction` are
  serializable (they ride `EditData` across the SSR boundary), so they carry data only, never a callback.
- Svelte 5 runes, DaisyUI v5, Tailwind v4. Match `docs/internal/admin-design-system.md`. The needs-alt
  accessibility behavior (the `role="status"`/`aria-live` region present-and-empty at load, the live
  count, the per-row jump/focus actions) must survive the unification; regression tests pin it.
- TSDoc comment standard on every export (one-line doc, no `{type}` tags, no paraphrase).
- Code comments follow the surrounding file's idiom; no em dash in comments.

## Background seams (orientation)

- **The cross-branch union pattern is `buildUsageIndex`** (`src/lib/media/usage.ts:86-140`): a main arm
  that reads `manifest.entries` (no per-file read; the manifest carries each field) and a branch arm that
  lists `cairn/*` branches, resolves each with `parsePendingBranch` + `findConcept`, builds the path
  `${concept.dir}/${filenameFromId(ref.id)}`, reads it with `readRaw({ ...repo, branch }, path, token)`,
  and `parseMarkdown`s it. Mirror this exactly for addresses.
- **The address identity** is `entryIdentity(descriptor, path, frontmatter)` →
  `{ id, slug, date, permalink }` (`src/lib/content/identity.ts:51`). `main`'s `manifest.entries` already
  carry a resolved `permalink`.
- **`editLoad`** (`src/lib/sveltekit/content-routes.ts:1012`) already has `concept`, `id`, `token`, the
  entry `path` (`${concept.dir}/${filenameFromId(id)}`, line 1031), the parsed `frontmatter`/`body`, and
  the parsed manifest (from `manifestRaw`). It returns `EditData`.
- **`publishAction`** (`src/lib/sveltekit/content-routes.ts:1317`) commits the entry to `main` and logs
  `log.info('entry.published', …)` (line 1343).
- **The needs-alt notice** is client-derived in `EditPage.svelte`: `needsAltCount`, `needsAlt` (body rows,
  each `{ ref, from, to }`, action `selectRange(item.from, item.to)`), and `heroRows` (each `{ name,
  label }`, action `heroFieldRefs[name]?.focusAlt()`), rendered in the `role="status"` block at
  `EditPage.svelte:1416-1448`. The `draftWarning` alert below it is a guard banner, not an advisory; it
  stays.
- **The log vocabulary** is the `CairnLogEvent` union (`src/lib/log/events.ts:4`); emit with
  `log.warn(event, fields)` (`src/lib/log/index.js`). The reference table is `docs/reference/log-events.md`.

---

## Task 1: the advisory-notice types and the cross-branch address index

A new module holds the serializable notice shape and the address-index builder plus the pure collision
predicate. The predicate is the new logic and gets the thorough unit coverage; the builder mirrors
`buildUsageIndex` and gets a fake-backend smoke test.

**Files:**
- Create: `src/lib/content/advisories.ts`
- Test: `src/tests/unit/advisories.test.ts` (new)

**Interfaces produced:**
```ts
export interface AdvisoryAction { label: string; href?: string; }
export interface AdvisoryNotice {
  kind: string;            // 'address-collision' today
  severity: 'warn';
  message: string;
  count?: number;          // an aggregating notice's running count (needs-alt, client-side)
  actions?: AdvisoryAction[];
}
export interface AddressEntry { concept: string; id: string; title: string; source: 'main' | 'branch'; }
export type AddressIndex = Map<string, AddressEntry[]>; // permalink -> entries resolving to it
export async function buildAddressIndex(
  repo: RepoRef, token: string, concepts: ConceptDescriptor[], manifest: Manifest,
): Promise<AddressIndex>;
export function addressCollision(
  index: AddressIndex, self: { concept: string; id: string }, address: string,
): AddressEntry | null;
```

- [ ] **Step 1: Write the failing unit test for `addressCollision`**

`src/tests/unit/advisories.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { addressCollision, type AddressIndex } from '../../lib/content/advisories.js';

const idx: AddressIndex = new Map([
  ['/news/hello', [{ concept: 'posts', id: '2026-01-01-hello', title: 'Hello', source: 'main' }]],
  ['/about', [
    { concept: 'pages', id: 'about', title: 'About', source: 'main' },
    { concept: 'pages', id: 'about-copy', title: 'About copy', source: 'branch' },
  ]],
]);

describe('addressCollision', () => {
  it('flags a different entry sharing the address', () => {
    expect(addressCollision(idx, { concept: 'pages', id: 'about-copy' }, '/about')).toEqual({
      concept: 'pages', id: 'about', title: 'About', source: 'main',
    });
  });
  it('does not flag the entry against itself', () => {
    expect(addressCollision(idx, { concept: 'posts', id: '2026-01-01-hello' }, '/news/hello')).toBeNull();
  });
  it('returns null when the address is free', () => {
    expect(addressCollision(idx, { concept: 'posts', id: 'new' }, '/news/unused')).toBeNull();
  });
  it('returns the first other entry when several share the address', () => {
    const hit = addressCollision(idx, { concept: 'pages', id: 'third' }, '/about');
    expect(hit?.id).toBe('about');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- --project unit advisories`
Expected: FAIL (the module does not exist).

- [ ] **Step 3: Implement `advisories.ts`**

Create `src/lib/content/advisories.ts`. Define the interfaces above. `addressCollision` looks up
`index.get(address) ?? []` and returns the first entry whose `concept !== self.concept || id !== self.id`,
else `null`. `buildAddressIndex` mirrors `buildUsageIndex` (`src/lib/media/usage.ts:86-140`): the main arm
pushes `{ concept, id, title, permalink, source: 'main' }` from each `manifest.entries` keyed by
`entry.permalink` (no read); the branch arm lists `listBranches(repo, PENDING_PREFIX, token)`, and for each
name resolves `parsePendingBranch` + `isValidId` + `findConcept` (skip on miss), builds the path
`${concept.dir}/${filenameFromId(ref.id)}`, reads it with `readRaw({ ...repo, branch: name }, path, token)`
inside a `try` (a failed branch read is caught and skipped, fail open), `parseMarkdown`s it, resolves
`entryIdentity(concept, path, frontmatter).permalink` inside the same `try` (a `permalink` throw on a
dated entry with no date is caught and skipped), and pushes `source: 'branch'`. Read the branches in one
`Promise.all` as `buildUsageIndex` does. Import `RepoRef`/`readRaw` from the github module,
`PENDING_PREFIX`/`parsePendingBranch` from `../content/pending.js`, `findConcept` from
`../content/concepts.js`, `isValidId` from `../content/ids.js`, `filenameFromId` from its current home (the
same import `content-routes.ts` uses), `parseMarkdown` from the markdown module, `entryIdentity` from
`./identity.js`, and `Manifest`/`ConceptDescriptor` types. TSDoc one-liner on each export.

- [ ] **Step 4: Add a `buildAddressIndex` fake-backend test**

Add to the same file a `describe('buildAddressIndex')` that models its fake backend on the existing media
usage-index test (find it: `grep -rl buildUsageIndex src/tests`). Assert: given a manifest with one
published entry at `/news/hello` and one open `cairn/posts/2026-02-02-hello` branch whose entry resolves
to the same `/news/hello`, the index has both entries under `/news/hello` (one `source: 'main'`, one
`source: 'branch'`), and a branch whose read throws is skipped (the index still builds).

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- --project unit advisories`
Expected: PASS.

- [ ] **Step 6: Gate and commit**

`npm run check` (0/0), `npm test` (exits 0).
```bash
git add src/lib/content/advisories.ts src/tests/unit/advisories.test.ts
git commit -m "feat: add the advisory-notice shape and the cross-branch address index"
```

---

## Task 2: `EditData.advisories` and the edit-load address-collision notice

Wire the server notice: `editLoad` builds the index, resolves the edited entry's address, and returns an
`address-collision` notice when a different entry shares it. Export the public types.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (the `EditData` interface, `editLoad`, a re-export of the
  notice types)
- Modify: `src/lib/sveltekit/index.ts` (re-export `AdvisoryNotice`, `AdvisoryAction`)
- Modify: `docs/reference/sveltekit.md` (a row for each new type)
- Test: `src/tests/unit/content-routes-edit.test.ts` (extend)

**Interfaces:**
- Consumes: `buildAddressIndex`, `addressCollision`, `AdvisoryNotice`, `AddressEntry` (Task 1);
  `entryIdentity` (identity); the parsed `manifest`, `concept`, `id`, `path`, `token` already in `editLoad`.
- Produces: `EditData.advisories: AdvisoryNotice[]`; the `/sveltekit` exports `AdvisoryNotice`,
  `AdvisoryAction`.

- [ ] **Step 1: Write the failing edit-load test**

Extend `src/tests/unit/content-routes-edit.test.ts` (model the fake backend on its existing `editLoad`
cases). Given a backend whose `main` manifest holds a published `pages` entry `about` at permalink
`/about`, and a NEW entry being edited at `pages/about-copy` whose frontmatter resolves to the same
`/about`, assert `editLoad(...)` returns `advisories` with exactly one notice: `kind ===
'address-collision'`, `severity === 'warn'`, `message` contains `/about`, and an action whose `href ===
'/admin/pages/about'`. Add a second case: an entry with no collision returns `advisories: []`.

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --project unit content-routes-edit`
Expected: FAIL (`advisories` undefined).

- [ ] **Step 3: Add `advisories` to `EditData` and build the notice in `editLoad`**

In `content-routes.ts`: add `advisories: AdvisoryNotice[]` to `EditData` with a TSDoc line ("Non-blocking
editor advisories built server-side; today the cross-branch address collision."). Import
`buildAddressIndex`, `addressCollision`, `type AdvisoryNotice`, `type AddressEntry` from
`../content/advisories.js`, and `entryIdentity` from `../content/identity.js`. Re-export the public types
near the top: `export type { AdvisoryNotice, AdvisoryAction } from '../content/advisories.js';`.

In `editLoad`, after `parsed` and the manifest are available, build the notice inside a `try` that
degrades to `[]`:
```ts
let advisories: AdvisoryNotice[] = [];
try {
  const identity = entryIdentity(concept, path, parsed.frontmatter);
  const addressIndex = await buildAddressIndex(runtime.backend, token, runtime.concepts, manifest);
  const other = addressCollision(addressIndex, { concept: concept.id, id }, identity.permalink);
  if (other) {
    const otherConcept = findConcept(runtime.concepts, other.concept);
    const label = otherConcept ? otherConcept.label : other.concept;
    advisories = [{
      kind: 'address-collision',
      severity: 'warn',
      message: `Another ${label} already uses the address ${identity.permalink}. Publishing this one will replace it as the page visitors see.`,
      actions: [{ label: `Open ${other.title}`, href: `/admin/${other.concept}/${other.id}` }],
    }];
  }
} catch (err) {
  log.warn('github.unreachable', { scope: 'edit-advisories', error: String(err) });
}
```
Use the same `manifest` value `editLoad` already parses from `manifestRaw` (do not re-read it). Return
`advisories` on the `EditData` object.

- [ ] **Step 4: Re-export the types and document them**

In `src/lib/sveltekit/index.ts`, add `AdvisoryNotice` and `AdvisoryAction` to the `export type { … } from
'./content-routes.js'` block (beside `EditData`). In `docs/reference/sveltekit.md`, add a type-table row
for each: `AdvisoryNotice` (a non-blocking editor advisory: kind, severity, message, optional count and
actions) and `AdvisoryAction` (an advisory's action: a label and an optional href). Run `npm run
check:reference` and confirm `/sveltekit` is `OK` (the export-coverage gate now sees both types).

- [ ] **Step 5: Run the tests**

Run: `npm test -- --project unit content-routes-edit` (PASS), then `npm run check:reference` (exit 0).

- [ ] **Step 6: Gate and commit**

`npm run check` (0/0), `npm test` (exits 0).
```bash
git add src/lib/sveltekit/content-routes.ts src/lib/sveltekit/index.ts docs/reference/sveltekit.md src/tests/unit/content-routes-edit.test.ts
git commit -m "feat: return an address-collision advisory from the edit load"
```

---

## Task 3: the publish-time re-check and the `publish.address_collision` log event

`publishAction` re-checks the address and emits a diagnostic event when a publish proceeds past a
collision. It never gates.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (`publishAction`)
- Modify: `src/lib/log/events.ts` (add the event name)
- Modify: `docs/reference/log-events.md` (the event row)
- Test: `src/tests/unit/content-routes-publish.test.ts` (extend)

**Interfaces:**
- Consumes: `buildAddressIndex`, `addressCollision` (Task 1); the `CairnLogEvent` union.
- Produces: the `publish.address_collision` event (level `warn`, fields `editor`, `address`,
  `displacedConcept`, `displacedId`).

- [ ] **Step 1: Write the failing publish test**

Extend `src/tests/unit/content-routes-publish.test.ts` (model on its existing publish cases, which already
capture log records). Given a backend whose `main` manifest holds a published `pages` entry `about` at
`/about`, publishing a pending `pages/about-copy` that resolves to `/about`: assert the publish still
commits (the existing `entry.published` log fires and the commit happens) AND a `publish.address_collision`
record is captured with `address === '/about'`, `displacedConcept === 'pages'`, `displacedId === 'about'`,
and an `editor` field. Add a no-collision case: no `publish.address_collision` record is emitted.

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --project unit content-routes-publish`
Expected: FAIL (`publish.address_collision` is not an allowed event / not emitted).

- [ ] **Step 3: Add the event and emit it**

In `src/lib/log/events.ts`, add `| 'publish.address_collision'` to the `CairnLogEvent` union (beside the
other `publish.*` events). In `publishAction`, before the commit mutation, compute the collision inside a
`try` that degrades to `null` (reuse `buildAddressIndex`/`addressCollision`, resolving the published
entry's address via `entryIdentity` exactly as `editLoad` does). After the successful publish (right after
the existing `log.info('entry.published', …)` at line ~1343), emit when a collision was found:
```ts
if (collision) {
  log.warn('publish.address_collision', {
    editor: editor.email,
    address,
    displacedConcept: collision.concept,
    displacedId: collision.id,
  });
}
```
The collision read must never block or fail the publish: a thrown index build is caught and the publish
proceeds with no event.

- [ ] **Step 4: Document the event**

In `docs/reference/log-events.md`, add the `publish.address_collision` row: level `warn`; trigger "a
publish proceeds while another entry already resolves to the same address (last-write-wins, now visible)";
fields `editor`, `address`, `displacedConcept`, `displacedId`. No token or session id. Run `npm run
check:docs` (the link gate) and confirm OK.

- [ ] **Step 5: Run the tests**

Run: `npm test -- --project unit content-routes-publish`
Expected: PASS.

- [ ] **Step 6: Gate and commit**

`npm run check` (0/0), `npm test` (exits 0).
```bash
git add src/lib/sveltekit/content-routes.ts src/lib/log/events.ts docs/reference/log-events.md src/tests/unit/content-routes-publish.test.ts
git commit -m "feat: log publish.address_collision when a publish overrides an address"
```

---

## Task 4: the EditPage advisory region and the needs-alt unification

One shared advisory region renders both the server address-collision notice and the client-derived
needs-alt notice. needs-alt keeps its live computation and its interactivity; the unification is a
presentation refactor pinned by regression tests.

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Test: `src/tests/component/edit-page-advisories.test.ts` (new), plus the existing needs-alt component
  tests stay green.

**Interfaces:**
- Consumes: `EditData.advisories` (Task 2); the existing `needsAltCount`/`needsAlt`/`heroRows` derivations
  and the `selectRange`/`heroFieldRefs[].focusAlt` actions.
- Produces: a `{#snippet advisoryNotices}` region; no new exported symbol.

The server `AdvisoryNotice` is data-only (its action carries an `href`). The needs-alt rows carry
callbacks, so `EditPage` maps both into one local render type and the snippet renders an `href` row as a
link and an `onAct` row as a button:
```ts
type AdvisoryRow = { label: string; href?: string; onAct?: () => void };
type RenderNotice = { kind: string; message: string; count?: number; rows: AdvisoryRow[] };
```

- [ ] **Step 1: Write the failing component test**

Find the existing needs-alt component test first: `grep -rl "needs\|Add alt text" src/tests/component`.
Create `src/tests/component/edit-page-advisories.test.ts`, mounting `EditPage` the way the nearest
existing `EditPage` test mounts it (its `data` fixture now needs `advisories`). Assert, given
`data.advisories = [{ kind: 'address-collision', severity: 'warn', message: 'Another page already uses the address /about. Publishing this one will replace it as the page visitors see.', actions: [{ label: 'Open About', href: '/admin/pages/about' }] }]`:
```ts
await expect.element(page.getByText('Another page already uses the address /about', { exact: false })).toBeInTheDocument();
const link = page.getByRole('link', { name: 'Open About' });
await expect.element(link).toHaveAttribute('href', '/admin/pages/about');
```
Add a needs-alt assertion in the same file to prove the shared region carries it: render `data` with a
body image lacking alt and assert the "images need alt text" count text and an "Add alt text" button are
present (this is the regression anchor; the fuller needs-alt suite stays in its existing file).

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --project component edit-page-advisories`
Expected: FAIL (no address-collision rendering yet).

- [ ] **Step 3: Build the shared region and route both notices through it**

In `EditPage.svelte`:
- Add the `AdvisoryRow`/`RenderNotice` local types and a `{#snippet advisoryNotices(notices: RenderNotice[])}`
  that renders each notice as the existing `alert alert-warning` row (the markup currently at
  `:1416-1448`): the message line with the caution glyph and the optional `count`, then a `<ul>` of rows
  where a row with `href` renders an `<a class="btn btn-xs">` and a row with `onAct` renders a
  `<button type="button" class="btn btn-xs" onclick={row.onAct}>`. Keep the whole thing inside the
  unconditional `<div role="status">` so the live-region behavior is unchanged.
- Build `const renderNotices = $derived<RenderNotice[]>(...)`: map `data.advisories` (server) to
  `{ kind, message, count, rows: (n.actions ?? []).map(a => ({ label: a.label, href: a.href })) }`, then
  append the needs-alt notice when `needsAltCount > 0`:
  `{ kind: 'needs-alt', message: \`${needsAltCount} ${needsAltCount === 1 ? 'image needs' : 'images need'} alt text\`, count: needsAltCount, rows: [...needsAlt.map(i => ({ label: 'Add alt text', onAct: () => selectRange(i.from, i.to) })), ...heroRows.map(h => ({ label: 'Add alt text', onAct: () => heroFieldRefs[h.name]?.focusAlt() }))] }`.
  Keep the needs-alt explanatory sentence ("Alt text describes an image…") as the needs-alt notice's own
  second line if the snippet supports a secondary line, or fold it into the notice; do not drop it.
- Replace the existing `role="status"` needs-alt block (`:1416-1448`) with `{@render
  advisoryNotices(renderNotices)}` inside the same `<div role="status">`. Leave the `draftWarning` alert
  below it untouched (it is a guard banner, not an advisory).

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- --project component edit-page-advisories` (PASS). Then run the existing needs-alt
component test file found in Step 1 and confirm it still passes unchanged (the count, the fill-drops-count,
the body-row `selectRange`, and the hero-row `focusAlt` behaviors). If a fixture there now needs
`advisories: []`, add it; do not weaken an assertion.

- [ ] **Step 5: Voice gate**

Run `npm run check:prose` (it scans `EditPage.svelte`); exit 0. The address-collision message is owned
copy: plain, one idea per sentence, no AI tells.

- [ ] **Step 6: Gate and commit**

`npm run check` (0/0), `npm test` (exits 0).
```bash
git add src/lib/components/EditPage.svelte src/tests/component/edit-page-advisories.test.ts
git commit -m "feat: unify needs-alt and the address advisory in one editor region"
```

---

## Pass 3 exit criteria

`npm run check` 0/0, `npm test` exits 0, `check:prose`, `check:docs`, `check:reference`, and
`check:package` pass, and the consumer build is green (`npm run package` then the showcase e2e, or push
for CI). Run the code-simplifier over the changed code. Fan out the reviewers: `cloudflare-workers-reviewer`
(the cross-branch read and the publish-path branch reads), `web-auth-security-reviewer` (the publish
path), `svelte-reviewer` (the EditPage refactor and the runes), and `daisyui-a11y-reviewer` (the advisory
region's `aria-live`, the action rows, and that needs-alt's accessibility is unchanged). The live admin
smoke (a real Worker with a colliding entry on a sibling branch, `/admin/<concept>/<id>` showing the
advisory) rides the first site cutover, since the showcase has no D1 Worker; note it as a carry-forward.

Documentation: the `publish.address_collision` row is in `log-events.md` (Task 3) and the new types in
`sveltekit.md` (Task 2). Add the `CHANGELOG.md` entry and bump the version (a patch: this refines the
existing `EditData` editor surface and adds one advisory; no new subsystem, no consumer action). Append
the resolved advisory-channel and now-visible-last-write-wins entries to
`docs/internal/docs-friction-log.md`.

## Deferred (not in this slice)

- A general per-field advisory adapter seam (a public contract for adapter-declared warn validators).
- Live client-side recomputation of the address collision as the author retypes the slug (the notice is
  load-time; a save refreshes it).
- The later editor-help slices (the recede-on-desk slide-over, the command-palette help, the corpus, the
  starter-content seed) per the initiative spec.

## Self-review

- **Spec coverage.** Unit 1 (the notice shape + the cross-branch index) maps to Task 1; Unit 2 (the
  edit-load notice + the exported types) to Task 2; Unit 2's publish re-check + log event to Task 3; Unit 3
  (the EditPage region + the needs-alt unification) to Task 4. The fail-open degradation, the
  warn-and-allow no-gate rule, the regression-pinned needs-alt behavior, the patch bump, and the reviewer
  set are in the constraints and the exit criteria.
- **No placeholders.** Each task names the exact files and seams with line numbers, the interface types and
  signatures, the test code or the harness to model on, and the exact log fields. The address-index builder
  references `buildUsageIndex` as its template rather than restating its body.
- **Type consistency.** `AdvisoryNotice`/`AdvisoryAction`/`AddressEntry`/`AddressIndex` (Task 1) are
  consumed by `editLoad` (Task 2) and `publishAction` (Task 3); `EditData.advisories: AdvisoryNotice[]`
  (Task 2) is read by `EditPage` (Task 4), which maps it to the local `RenderNotice`. The collision result
  `AddressEntry` carries `concept`/`id`/`title`/`source`, the fields every consumer reads. The event name
  `publish.address_collision` matches across the union, the emit, and the reference table.
