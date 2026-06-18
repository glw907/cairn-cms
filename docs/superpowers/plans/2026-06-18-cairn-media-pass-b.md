# Media Pass B Implementation Plan: replace-in-place and alt propagation

> **For agentic workers:** Execute task-by-task by dispatching each task to `cairn-implementer`
> (pinned Sonnet), test-first against the suite. The main loop reviews each diff and clears the full
> gate before the next dispatch. Tasks 1 through 3 are pure and independent; Tasks 5 and 6 carry the
> high-stakes content-rewrite logic and get the closest review (consider `model: opus` for them). Honor
> the cairn conventions and the `cairn-pass` ritual. Steps are tracked with checkboxes (`- [ ]`).

**Goal:** Let an author replace an asset with a corrected upload (repointing every published reference)
and propagate an asset's default alt across its placements, both in one atomic, preview-confirmed commit
to `main`.

**Architecture:** One shared rewrite core. Two pure per-entry transforms (repoint, alt-fill) feed a
server planner that reuses the fail-closed cross-branch `buildUsageIndex`, reads each affected `main`
entry, computes a preview plan plus a report-only branch-delta, and commits all edits atomically with
`commitFiles`. New admin actions (a `text/plain` preview fetch in the 2a envelope, a form-action apply)
and two review modals on the Media Library slide-over surface it.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, the cairn admin dispatch (`createContentRoutes`), the
content-addressed `media:` codec, `buildUsageIndex` (`media/usage.ts`), the content manifest `mediaRefs`
(`content/media-refs.ts`), `commitFiles` (`github/repo.ts`), DaisyUI v5, Vitest (unit + workerd
integration + real-browser component), Playwright (showcase E2E).

**Spec:** `docs/superpowers/specs/2026-06-18-cairn-media-pass-b-design.md`.
**Design target (approved rev.2 mockup):** `docs/internal/design/2026-06-18-media-pass-b-rev2-mockup.html`.

**Version:** a minor, `0.58.0` (a new admin subsystem surface: replace and alt-propagation actions plus
their UI). Additive, so no consumer action; the changelog entry carries the `<!-- release-size: minor -->`
marker and states no action is required.

---

## Execution

Standard loop: one `cairn-implementer` per task, test-first, on a worktree off `main`, the main loop
reviewing each diff and clearing the full gate (`npm run check` 0/0, `npm test` exit 0, plus the
reference, signature, package, docs, readiness, prose, and version gates) between dispatches. Tasks 1
through 6 are engine and unit/integration; Tasks 7 and 8 are component (real browser); Task 9 is the
showcase E2E; Task 10 is docs plus the version bump; the pass-end ritual closes it.

The tasks are mostly independent, so this pass is a good `Workflow` candidate on Geoff's opt-in. Review
Tasks 5 and 6 most closely: they rewrite published body content atomically and carry the typed-slug gate,
the fail-closed gate, the overwrite semantics, and the decorative skip.

---

## Task 1: the repoint transform

The pure, framework-free per-entry transform that rewrites every reference to an old hash into the new
asset's canonical token. The heart of replace; fully unit-tested.

**Files:**
- Create: `src/lib/content/media-rewrite.ts`
- Test: `src/tests/unit/content-media-rewrite.test.ts`

**Behavior.** Export:

```ts
export interface RepointPlacement {
  kind: 'body' | 'figure' | 'hero';
  before: string; // the old media: token as written
  after: string;  // the new asset's canonical token
}
export interface RepointResult { markdown: string; placements: RepointPlacement[]; }

// Rewrite every reference to `oldHash` in one entry's raw markdown to `newToken`. Matches both the
// bare `media:<oldHash>` form and the `media:<slug>.<oldHash>` form, in a body image
// `![alt](media:...)`, a figure-wrapped image, and the frontmatter hero `image.src`. Keys on the hash
// (the identity); the slug is cosmetic. Leaves a malformed or non-matching reference untouched and
// returns the markdown byte-for-byte unchanged when nothing matches.
export function repointMediaRef(markdown: string, oldHash: string, newToken: string): RepointResult;
```

Reuse the existing `media:` parsing grammar (the `MEDIA_HASH_RE` / `parseMediaToken` shapes in
`media/reference.ts` and `media/naming.ts`); do not invent a second regex dialect. The frontmatter hero
lives under the `image.src` (and any `seo:true` image field) key in the YAML front matter; rewrite the
token there as a string value without disturbing the rest of the frontmatter. A figure-wrapped image is
a normal markdown image inside a `:::figure` container, so the body-image rewrite covers it; assert it.

**Tests (write first, watch fail, then implement):**
- A body image `![A cairn](media:summit.aaaa1111)` repoints to the new token; the alt and surrounding
  prose are byte-identical otherwise.
- A bare `media:aaaa1111` body reference repoints.
- A figure-wrapped image repoints (the `:::figure` wrapper is untouched).
- A frontmatter hero `image: { src: media:summit.aaaa1111, alt: ... }` repoints `src` only; `alt` and
  other frontmatter keys are unchanged.
- An entry with two placements of the same hash repoints both and reports two placements.
- A non-matching hash leaves the markdown byte-for-byte unchanged and reports zero placements.
- A malformed `media:` reference is left untouched.

**Gate:** full gate green.

---

## Task 2: the alt-fill transform

The pure per-entry transform for alt propagation: fill empty alts, optionally overwrite custom alts,
skip a decorative hero. The heart of alt propagation; fully unit-tested.

**Files:**
- Modify: `src/lib/content/media-rewrite.ts`
- Test: `src/tests/unit/content-media-rewrite.test.ts` (extend)

**Behavior.** Export:

```ts
export type AltBucket = 'will-fill' | 'customized' | 'decorative-skipped';
export interface AltPlacement {
  kind: 'body' | 'figure' | 'hero';
  bucket: AltBucket;
  before: string; // the existing alt ('' when empty)
  after: string;  // the alt after the transform (unchanged for customized-not-overwritten and decorative)
}
export interface AltFillResult { markdown: string; placements: AltPlacement[]; }

// Set the alt at each placement of `hash` in one entry's raw markdown. An empty alt is filled with
// `defaultAlt` (bucket will-fill). A non-empty alt is overwritten with `defaultAlt` only when
// `overwrite` is true (bucket customized; otherwise left unchanged but still reported as customized so
// the preview can show and opt-in). A frontmatter hero with `decorative: true` is bucket
// decorative-skipped and never changed. A body or figure image has no decorative slot, so an empty alt
// is always will-fill. Byte-exact outside the alt text it changes.
export function fillAltForHash(
  markdown: string,
  hash: string,
  defaultAlt: string,
  opts: { overwrite: boolean },
): AltFillResult;
```

The frontmatter hero's `decorative` flag is the persisted `image.decorative === true` from Pass A. A
body/figure image's alt is the markdown alt text. Escaping: alt text is not markdown, so write it
verbatim as the image alt (mirror how `frontmatterFromForm` stores alt). Do not alter a placement of a
different hash.

**Tests (write first):**
- A body image with empty alt fills to the default (bucket will-fill); a body image with custom alt is
  reported customized and is unchanged when `overwrite:false`, and overwritten when `overwrite:true`.
- A frontmatter hero with `decorative:true` is reported decorative-skipped and unchanged under both
  `overwrite` values.
- A frontmatter hero with empty alt and no decorative flag fills (will-fill).
- A figure-wrapped image with empty alt fills.
- Mixed entry (one empty body, one custom body, one decorative hero) reports the three buckets correctly
  and, with `overwrite:false`, changes only the empty one.
- A non-matching hash leaves the markdown byte-for-byte unchanged.

**Gate:** full gate green.

---

## Task 3: the rewrite planner

The server planner that turns an asset hash plus a transform into a preview plan (affected main entries,
per-placement before/after, counts) and a report-only branch-delta, fail-closed on an unverifiable usage
read. Backs both the preview and the apply.

**Files:**
- Create: `src/lib/media/rewrite-plan.ts`
- Test: `src/tests/unit/media-rewrite-plan.test.ts`

**Behavior.** Export a planner that takes the backend, token, concepts, the parsed content manifest, the
media manifest, the target hash, and a per-entry transform, and returns:

```ts
export interface PlannedEntry { concept: string; id: string; path: string; placements: unknown[]; newMarkdown: string; }
export interface BranchRef { branch: string; entries: { concept: string; id: string }[]; }
export interface RewritePlan { entries: PlannedEntry[]; branchDelta: BranchRef[]; affectedCount: number; }

export async function planMediaRewrite(args: {
  backend; token; concepts; contentManifest; mediaManifest; hash;
  transform: (markdown: string) => { markdown: string; placements: unknown[] };
}): Promise<RewritePlan>;
```

It runs `buildUsageIndex(backend, token, concepts, contentManifest, { strict: true })` (the same gate
3c safe-delete uses; a `strict` failure rethrows so the caller fails closed). It takes the `main`-origin
rows for the hash, reads each entry with `readRaw`, applies `transform`, and includes only entries the
transform actually changed (`placements.length > 0`). It collects the `cairn/*`-branch rows for the hash
into `branchDelta` grouped by branch. `affectedCount` is the distinct main-entry count.

**Tests (write first; use a fake backend like the existing media-route/usage tests):**
- A fixture where two main entries reference the hash yields two planned entries with their rewritten
  markdown; an entry that references a different hash is excluded.
- The branch-delta lists the open branches that reference the hash, grouped, and excludes `main`.
- When `buildUsageIndex` throws (a strict branch-read failure), `planMediaRewrite` rejects (so the action
  fails closed).
- An entry whose transform makes no change (zero placements) is excluded from `entries`.

**Gate:** full gate green.

---

## Task 4: flash flags, fail payloads, and the load

Wire the new flash flags and fail-payload types so Tasks 5 and 6 have their surfaces. Small and
enabling.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (`MediaLibraryData` flash union; `MediaReplaceFailure`
  and `MediaAltPropagateFailure` interfaces; the `ContentFormFailure` union; `mediaLibraryLoad` reads the
  two new flags)
- Test: `src/tests/unit/content-routes-media.test.ts` (extend)

**Behavior.**
- Extend the Pass A flash reading in `mediaLibraryLoad`: it already maps `?deleted=1`/`?updated=1` to
  `flash`. Add `?replaced=1` and `?altPropagated=1` to the `flash` union
  (`'deleted' | 'updated' | 'replaced' | 'altPropagated' | null`). The conflict error keeps riding the
  existing `flashError` slot.
- Add `MediaReplaceFailure` (carries `error`, plus `hash`, `usage`, `foundIn` for the in-use/unverifiable
  surfaces, mirroring `MediaDeleteRefusal`) and `MediaAltPropagateFailure` (carries `error` plus the
  bucket counts the preview needs). Add both to the `ContentFormFailure` union so the one `form` prop
  carries them.

**Tests:**
- `mediaLibraryLoad` returns `flash: 'replaced'` for `?replaced=1` and `flash: 'altPropagated'` for
  `?altPropagated=1`, and `null` otherwise.
- A type-level assertion (extend the existing `content-schema`/types test if present) that
  `ContentFormFailure` includes the two new shapes.

**Gate:** full gate green.

---

## Task 5 (review closely): the replace actions

The preview fetch action and the apply form action for replace, atomic and fail-closed, gated by the
typed-slug confirm. Reuses `uploadAction` for ingest and `planMediaRewrite` for the plan.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (`mediaReplacePreview`, `mediaReplaceApply`; register
  both on the returned actions record)
- Test: `src/tests/integration/*media-replace*` (workerd + miniflare, the existing media integration
  harness)

**Behavior.**
- The author uploads the new file through the existing `uploadAction` first (no change there); the client
  holds the returned record (the new hash and slug).
- `mediaReplacePreview` is a fetch action in the 2a transport (a `text/plain` body, the `X-Cairn-CSRF`
  header cleared by the guard, the result in a 200 JSON envelope via `fail`/a JSON return, never an HTTP
  status). It reads `oldHash` and `newHash` from the body, builds the new asset's canonical token from
  the new media row, calls `planMediaRewrite` with a `repointMediaRef(_, oldHash, newToken)` transform,
  and returns the plan (entries with their placements, `affectedCount`, `branchDelta`). On a strict
  failure it returns the fail-closed `MediaReplaceFailure` ("Could not verify where this asset is used.").
- `mediaReplaceApply` is a form action mirroring `mediaDeleteAction`: mint a token, parse the media
  manifest, resolve the R2 binding before any write, re-derive the plan from a fresh read (never trust a
  client plan), require the typed-slug confirm against the OLD asset's `row.slug` (an empty stored slug
  is never satisfiable, like delete), then `commitFiles` in ONE call: every rewritten entry's
  `{ path, content: newMarkdown }` plus the new asset's `media.json` row
  (`upsertMediaEntry(manifest, newRecord)` serialized). The old row stays. Emit a `media.replaced` log
  event. Redirect to `/admin/media?replaced=1`. A commit conflict surfaces the existing
  reload-and-retry flash via the `flashError` slot.

**Tests:**
- Preview returns the plan for a two-entry fixture, and the branch-delta, in the JSON envelope.
- Apply commits one multi-file change (the two rewritten entries plus the upserted new media row) and
  redirects `?replaced=1`; the old media row is still present.
- Apply refuses without the typed slug (the in-use confirm) and refuses on a strict usage failure
  (fail-closed), committing nothing.
- Apply re-derives from a fresh read: a plan computed against stale state does not change what apply
  writes (apply reads fresh).

**Gate:** full gate green.

---

## Task 6 (review closely): the alt-propagation actions

The preview fetch action and the apply form action for alt propagation, atomic and fail-closed, with the
opt-in overwrite and the decorative skip.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (`mediaAltPreview`, `mediaAltApply`; register both)
- Test: `src/tests/integration/*media-alt*` (workerd + miniflare)

**Behavior.**
- The default alt is edited through the existing `mediaUpdateAction` (no change); propagation reads the
  asset's current default alt from the media manifest row.
- `mediaAltPreview` is a 2a-transport fetch action: it reads `hash`, calls `planMediaRewrite` with a
  `fillAltForHash(_, hash, defaultAlt, { overwrite: false })` transform, and returns the plan with the
  three buckets (will-fill, customized, decorative-skipped) and their counts. Fail-closed on a strict
  failure (`MediaAltPropagateFailure`).
- `mediaAltApply` is a form action: mint a token, re-derive from a fresh read with `overwrite` taken from
  the posted opt-in flag, `commitFiles` the rewritten entries in one call (no manifest change; the
  default alt is already committed), emit `media.alt_propagated`, redirect `/admin/media?altPropagated=1`.
  No typed-slug gate (the deliberate severity distinction). A decorative hero is never written regardless
  of `overwrite`.

**Tests:**
- Preview returns the three buckets and counts for a fixture (one empty body, one custom body, one
  decorative hero).
- Apply with `overwrite:false` fills only the empty placements and commits one multi-file change;
  the custom and decorative placements are byte-unchanged.
- Apply with `overwrite:true` also overwrites the custom placement, but still never touches the
  decorative hero.
- Apply fails closed on a strict usage failure, committing nothing.

**Gate:** full gate green.

---

## Task 7 (review closely): the component, resting entry points and the Replace modal

The slide-over's two quiet entry points and the Replace review modal, per the rev.2 design and the a11y
contract.

**Files:**
- Modify: `src/lib/components/CairnMediaLibrary.svelte`
- Test: `src/tests/component/CairnMediaLibrary.test.ts` (extend)

**Behavior (follow `docs/internal/design/2026-06-18-media-pass-b-rev2-mockup.html` exactly).**
- Add the two resting text-weight entry points (Replace, Push alt) in the slide-over actions block beside
  Delete (the `button:not(.btn)` levelled control weight, not the bordered heavy rows).
- The Replace flow: a file chooser/upload (reuse the 2b ingest/capture wiring already in the file), then
  the Replace review modal, a native `<dialog>` opened with `showModal()`, `role="alertdialog"`, the
  danger register. It posts `mediaReplacePreview` (the 2a `text/plain` + `X-Cairn-CSRF` transport,
  parsing the JSON envelope) and renders: the asset-named headline ("Replace {slug} in {N} published
  entries"), the from/to strip with the corrected content-addressed copy (never "the reference is
  unchanged"; say "The name {slug} stays the same. Only the content hash changes, so every published
  entry is repointed to the new file in one commit."), the affected-entry list (title plus where-used) in
  a scroll-capped well expanded by default, the dashed report-only branch-delta, the plain recoverability
  line, and the typed-slug confirm gate. Apply posts `mediaReplaceApply`.
- Fail-closed surface: a quiet "Check usage again" and NO apply button; name the unreadable branch (or a
  generic variant when the gap is the index).
- A11y: the dialog traps focus, restores focus to the Replace entry point on close, Escape-dismisses,
  Cancel is the initial focus. Every "show all N" carries `aria-expanded` + `aria-controls`.

**Tests:**
- The Replace entry point opens the modal with `role="alertdialog"`; the apply button is disabled until
  the typed slug matches; closing restores focus to the entry point.
- The from/to copy renders the content-hash wording and never the "reference unchanged" string.
- The fail-closed surface shows no apply button and names the branch.

**Gate:** full gate green.

---

## Task 8 (review closely): the component, the Alt-propagation modal

The Alt-propagation review modal with the three buckets, the real native opt-in checkbox, the moving live
total, and the decorative caveat.

**Files:**
- Modify: `src/lib/components/CairnMediaLibrary.svelte`
- Test: `src/tests/component/CairnMediaLibrary.test.ts` (extend)

**Behavior (follow the rev.2 mockup).**
- The Push-alt entry point opens a native `<dialog>`, `role="dialog"`, the primary register, posting
  `mediaAltPreview`. It renders the work-tuned headline ("Fill alt on {N} placements") and the three
  buckets: will-fill (each row `(no alt) -> default`, always applied), customized (one bucket-level real
  `<input type="checkbox" class="checkbox checkbox-sm">` opt-in with a count; each row shows its existing
  alt plain and "kept", flipping to `was -> default` struck when checked; the opt-in band and checked box
  use the `--cairn-error-*` family), and decorative-hero (listed, skipped). The body-vs-hero decorative
  caveat sits beside the will-fill bucket.
- A `role="status" aria-live="polite"` `sr-only` region announces the moving committed total when the
  opt-in toggles ("Now writing alt to {N} placements").
- Apply posts `mediaAltApply` with the opt-in flag. No typed gate.

**Tests:**
- The opt-in is a real `<input type="checkbox">` in the a11y tree; toggling it updates the visible count
  and the `role="status"` live region text.
- The customized rows show the existing alt before opt-in and the struck `was -> default` after.
- The decorative-hero bucket renders as skipped.

**Gate:** full gate green.

---

## Task 9: the showcase E2E

Prove both round-trips in a real browser against the showcase.

**Files:**
- Modify: the showcase seed (`examples/showcase/src/lib/fake-github.ts` / `fake-r2.ts`) so an asset is
  referenced by two seeded entries on `main` (and optionally one on an open branch for the branch-delta).
- Create: `examples/showcase/e2e/media-pass-b.spec.ts`

**Behavior.**
- Replace round-trip: open the Library, open an asset, Replace with a new file, see the preview count and
  the affected entries, type the slug, apply, and assert the seeded entries now resolve the new hash.
- Alt-propagation round-trip: edit the default alt, Push alt, see the will-fill bucket, apply, and assert
  the empty-alt placement now carries the default alt while a custom one is unchanged.

**Tests:** the two specs pass in the real browser; the existing media E2E specs stay green.

**Gate:** full gate green, showcase E2E green.

---

## Task 10: docs, the version bump, and the pass-end ritual

**Files:**
- Modify: `docs/guides/manage-the-media-library.md` (the Replace and Push-alt flows), `docs/reference/sveltekit.md`
  (the four new actions and the two fail payloads), `docs/explanation/media-storage.md` (replace repoints
  rather than mutates; the alt-propagation model), `docs/reference/log-events.md` (`media.replaced`,
  `media.alt_propagated`), `CHANGELOG.md` and `docs/guides/upgrade-cairn.md` (a `0.58.0` entry with the
  `<!-- release-size: minor -->` marker, no consumer action), `package.json` (version `0.58.0`).

Then the pass-end ritual: simplify (code-simplifier over the changed code), the review gate (suggest the
adversarial review-gate Workflow on Geoff's opt-in; otherwise a parallel fan-out of `svelte-reviewer`,
`daisyui-a11y-reviewer`, and a focused correctness reviewer on the rewrite/commit/fail-closed logic; the
`cloudflare-workers` reviewer for the R2/commit touch and `web-auth-security` if any guard code changes),
the docs gates (`check:reference`, `check:package`, `check:docs`), and the tracking (the post-mortem in
this plan, STATUS on `main`, the gallery memory).

A live admin smoke is owed this pass: replace and alt-propagation rewrite published content through a real
commit, so run the local admin smoke against `wrangler dev` (mint a session via a D1 row per
`docs/internal/admin-smoke-test.md`) and verify one real replace commit and one alt-propagation commit,
recorded as evidence. This is the first media pass whose action rewrites entry content rather than only
the manifest, so the real-commit proof matters.

**Gate:** full gate green; the three doc gates green; the live admin smoke recorded.

---

## Self-review (plan vs spec)

- Spec coverage: replace (Tasks 1, 3, 5, 7), alt propagation (Tasks 2, 3, 6, 8), the planner and
  fail-closed (Task 3), the flash/types (Task 4), the rev.2 UI and a11y contract (Tasks 7, 8), the
  atomic commit and branch-delta (Tasks 3, 5, 6), testing (every task plus Task 9), docs and version
  (Task 10). The decorative skip is in Tasks 2, 6, 8. Covered.
- Type consistency: `repointMediaRef`/`fillAltForHash` (Tasks 1, 2) are consumed by `planMediaRewrite`
  (Task 3) and the actions (Tasks 5, 6); `MediaReplaceFailure`/`MediaAltPropagateFailure` (Task 4) are
  used in Tasks 5, 6; the flash union (Task 4) is read in `mediaLibraryLoad` and rendered in Tasks 7, 8.
- Scope: a single coherent plan; no decomposition needed.

## Carry-forwards (beyond Pass B)

- Repoint-to-an-existing asset (a merge model); orphan collection of the superseded asset; bulk
  multi-asset replace, all Pass C.
- Very-large-N preview density (virtualization or collapse-by-concept) if real corpora hit 40+ refs.
- The `runtime.publicMediaResolver` ergonomic (carried from Pass A, needs its own brainstorm).
