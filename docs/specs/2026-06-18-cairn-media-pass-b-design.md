# Media Pass B: replace-in-place and alt propagation

Status: design approved 2026-06-18. The next step is the implementation plan.

## Summary

Pass B gives the admin Media Library two cross-content operations that the gallery spec named but no
pass has built: **replace-in-place** and **alt propagation**. Both rewrite published content for every
placement of one asset, in a single atomic commit to `main`, behind a preview the author confirms.

- **Replace** lets an author upload a corrected version of an asset. cairn is content-addressed, so the
  new file has a new hash and every reference in published content is repointed to it. The author's
  placements stay where they are; the engine repoints their target.
- **Alt propagation** pushes an asset's default alt text to placements that have no alt (fill the gaps),
  with an explicit opt-in to also overwrite placements that already carry custom alt.

Both are the same underlying operation with a different per-placement transform: find every main
placement of a hash, compute an edit at each, preview the impact, then commit all edits atomically and
report which open edit branches still reference the old asset.

This builds directly on the shipped media stack (`0.57.x`): the content-addressed `media:` reference,
the cross-branch `buildUsageIndex`, the content manifest's `mediaRefs`, the `commitFiles` atomic commit,
and the Media Library slide-over from Phase 3c.

## Decisions (settled with Geoff)

These were the open forks; they are locked for this pass.

1. **Alt propagation fills gaps, with an opt-in overwrite.** Propagation fills placements whose alt is
   empty. It offers one explicit bucket-level opt-in to also overwrite placements that already have
   custom alt, with a count and a sample. It never touches a frontmatter hero marked `decorative`
   (Pass A's persisted flag).
2. **The rewrite is a direct atomic commit to `main`, gated by a preview-and-confirm.** One commit
   repoints or rewrites every affected main entry. This matches the universal "updates everywhere"
   expectation and cairn's own precedent (3c rename and safe-delete commit media maintenance straight
   to `main`). The preview is the review gate; git history is the undo. The one honest difference from
   3c is that replace rewrites entry *body* markdown, not only the manifest, so the preview does real
   safety work.
3. **Replace is upload-new-only.** Replace means "upload a better version." Repoint-to-an-existing
   library asset (a merge model) defers to a later pass.
4. **The old asset is kept.** After repointing main, the old hash may still be referenced on an open
   branch, so Pass B keeps the old R2 object and its manifest row. Orphan collection is Pass C.
5. **Branches are reported, never rewritten.** Rewriting an author's open `cairn/*` edit branch is too
   dangerous, so the preview names the open branches still on the old asset (the branch-delta) and
   leaves them; they keep the old asset until the author re-saves.
6. **Both fail closed.** If usage cannot be fully verified across `main` and every open branch, the
   operation refuses rather than half-rewrite, exactly like 3c safe-delete.

## The UI (rev.2, approved)

The approved design is a hybrid: the dedicated-review modal shell, the correctness discipline of the
transparency-first direction, and the calm resting entry points of the in-context direction. The rev.2
mockup is `docs/internal/design/2026-06-18-media-pass-b-rev2-mockup.html` (the three source mockups and
the two adversarial critiques produced it).

**Resting slide-over.** The Media Library detail slide-over gains two quiet text-weight entry points,
**Replace** and **Push alt**, sitting with the existing Delete in one calm actions block. They do not
shout; the weight lives in the review step.

**One dedicated review modal per operation.** A native `<dialog>` (`showModal()`), single column, about
38rem wide, capped at `min(content, 85vh)` with the modal-box as the scroll container (head and footer
hold, body scrolls), a full-width bottom sheet below the narrow breakpoint. Built in the shipped
safe-delete alertdialog grammar.

**Replace modal** is `role="alertdialog"` in the danger register. It leads with an asset-named headline
("Replace first-light in 7 published entries"), a from/to strip (old hash struck, new hash in accent)
carrying the corrected content-addressed copy ("The name first-light stays the same. Only the content
hash changes, so every published entry is repointed to the new file in one commit."), the affected-entry
list (entry title plus where used: hero / body x2) in a scroll-capped well expanded by default, the
report-only branch-delta in its calm dashed treatment, a plain recoverability line, and a typed-slug
confirm gate matching safe-delete.

**Alt-propagation modal** is `role="dialog"` in the primary register, no typed gate (the deliberate
severity distinction: replace repoints a hash and can break a draft; alt fill is reversible and
frequent). It carries a work-tuned headline ("Fill alt on 5 placements"), then the three buckets:

- **will-fill** (empty alt): every row shows `(no alt) -> default-alt`, always applied.
- **customized** (existing custom alt): one bucket-level opt-in checkbox plus a count. Each row shows
  its existing alt plain and "kept" before the opt-in is checked, flipping to `was -> default` (struck)
  when checked, so the author reads what is at risk before opting in. The opt-in band and its checked
  checkbox use the shipped `--cairn-error-*` danger family (overwriting an editor's words is the
  destructive choice).
- **decorative-hero** (skipped): listed and skipped, per the persisted flag.

The body-vs-hero decorative caveat sits beside the will-fill bucket, where a surprised author looks.

**Fail-closed surface** has a quiet "Check usage again" and no apply button present, and names the
unreadable branch (or a generic-but-honest variant when the gap is the index itself).

**Accessibility contract** (from the adversarial critiques, load-bearing for the build):

- Every opt-in and bulk control is a real native `<input type="checkbox" class="checkbox checkbox-sm">`
  inside its label, keyboard-operable and in the a11y tree. No styled `aria-hidden` spans.
- `role="alertdialog"` for Replace and for the fail-closed state; `role="dialog"` for the everyday alt
  fill. A modal traps focus, restores focus to the originating slide-over control on close, and is
  Escape-dismissible. Cancel is the initial focus for the destructive Replace confirm.
- An `sr-only` `role="status"` `aria-live="polite"` region announces the moving committed total when the
  opt-in toggles ("Now writing alt to 4 placements").
- Every "show all N" control carries `aria-expanded` + `aria-controls` and reveals rows in the same
  scroll container.
- Text contrast stays at or above 4.5:1 on the shipped token pairs; no invented tokens.

## Architecture

The pass is one shared rewrite core plus two thin transforms, surfaced through new admin actions and the
extended slide-over. Nothing here changes a public render or delivery signature; the new surface is
admin-side.

### The pure transforms (node-safe, unit-tested)

A new `src/lib/content/media-rewrite.ts` holds the per-entry, framework-free transforms. Each takes one
entry's raw markdown and returns the rewritten markdown plus a structured per-placement diff, and never
touches bytes outside the targeted reference.

- `repointMediaRef(markdown, oldHash, newToken)` rewrites every reference to `oldHash` (the bare
  `media:<oldHash>` form and the `media:<slug>.<oldHash>` form, in a body image, a figure-wrapped image,
  and the frontmatter hero `src`) to the new asset's canonical token, and returns the placements it
  changed (kind: body / figure / hero, the before and after token). The hash is the identity, so the
  match keys on the hash; the new token carries the new asset's slug.
- `fillAltForHash(markdown, hash, defaultAlt, { overwrite })` sets the alt at each placement of `hash`:
  it fills an empty alt always, and overwrites a non-empty alt only when `overwrite` is true. It returns
  each placement classified as will-fill / customized / decorative-skipped, with the before and after
  alt. A frontmatter hero with `decorative: true` is classified decorative-skipped and never changed. A
  body image (no decorative slot) with empty alt is will-fill.

These transforms are the heart of the pass and the bulk of the test surface. They preserve the `media:`
token bytes exactly (repoint only changes the hash and slug; alt-fill only changes the alt text), and a
malformed reference is left untouched.

### The planner (server, reuses the usage index)

A planner computes the impact for an operation without writing. It mints a token, runs
`buildUsageIndex(..., { strict: true })` (the same fail-closed gate 3c safe-delete uses), takes the
`main`-origin rows for the hash to get the affected entry ids, reads each entry with `readRaw`, applies
the relevant transform to compute the per-entry placements, and collects the `cairn/*`-branch rows into
the branch-delta. It returns a plan: the affected entries with their per-placement before/after, the
bucket counts, and the branch-delta. A `strict`-mode failure surfaces as the fail-closed refusal.

The planner backs both the **preview** (display only) and the **apply** (which re-derives the plan from
a fresh read at apply time and then commits, so a stale client-submitted plan is never trusted).

### The actions (admin, the 2a transport for preview)

New actions on `createContentRoutes`, mirroring the existing media actions (fresh token mint, parse the
manifest, fail closed, resolve the R2 binding before any write, `commitFiles` atomically, redirect with
a flash):

- **Replace.** The author first uploads the new file through the existing `uploadAction` ingest (put-
  first dedup, HEIC normalize), which returns the new server-owned record and commits nothing. A
  **preview** fetch action (the 2a transport: a `text/plain` body, the `X-Cairn-CSRF` header, the result
  in a 200 JSON envelope) returns the plan for `(oldHash -> newHash)`. The **apply** action re-derives
  the plan, repoints every affected main entry, and commits the rewritten entries plus the new asset's
  `media.json` row in one `commitFiles` call, gated by the typed-slug confirm. It redirects to
  `/admin/media?replaced=1`. The old asset's row and bytes stay.
- **Alt propagation.** The default alt is edited through the existing `mediaUpdateAction` (a manifest
  row commit). A **preview** fetch action returns the three buckets for the asset's current default alt.
  The **apply** action re-derives, applies fill (plus overwrite when opted in), and commits the
  rewritten entries in one `commitFiles` call. It redirects to `/admin/media?altPropagated=1`.

Two new fail payloads, `MediaReplaceFailure` and `MediaAltPropagateFailure`, join the
`ContentFormFailure` union, each carrying `error` plus the structured plan an in-use or unverifiable
state needs. The new flash flags (`replaced`, `altPropagated`) join `mediaLibraryLoad`'s flash reading
from Pass A, and the conflict error rides the existing `flashError` slot.

### The component

`CairnMediaLibrary.svelte` gains the two resting entry points and the two review modals (native
`<dialog>` per the rev.2 design), the preview fetch wiring (the 2a envelope-and-`text/plain` transport),
and the live-region and focus choreography the a11y contract requires. The preview plan renders the
affected list, the buckets, and the branch-delta; the apply posts the confirmed action.

### Data flow

```
Replace:   upload new file (uploadAction) -> new record (hash B)
           preview(hashA -> B): buildUsageIndex strict -> main rows -> readRaw each
                                -> repointMediaRef per entry -> plan + branch-delta
           apply: re-derive plan -> commitFiles([rewritten entries..., media.json + new row]) -> ?replaced=1

Alt prop:  edit default alt (mediaUpdateAction) -> manifest default updated
           preview(hash): buildUsageIndex strict -> main rows -> readRaw each
                          -> fillAltForHash per entry -> buckets (will-fill / customized / decorative)
           apply: re-derive plan -> commitFiles([rewritten entries...]) -> ?altPropagated=1
```

## Safety and correctness

- **Atomic.** Each apply is one `commitFiles` call: all rewritten entries (and, for replace, the new
  manifest row) land together or not at all.
- **Fail closed.** The planner runs `buildUsageIndex` in `strict` mode; a branch-read failure refuses
  the operation rather than rewriting an incomplete set.
- **No stale plan.** Apply re-derives the plan from a fresh read; it never commits a client-submitted
  plan. If `main` moved since the preview, apply acts on the fresh state (or the commit conflicts and
  surfaces the existing reload-and-retry flash).
- **Branches untouched.** Only `main` entries are rewritten. Open branches are reported, never written.
- **Bytes preserved.** Repoint changes only the hash and slug inside a `media:` token; alt-fill changes
  only alt text. The transforms are byte-exact otherwise, proven by the unit suite.
- **Recoverability.** The old asset stays; git history holds every prior version. There is no per-row
  UI undo, consistent with the rest of the initiative.

## Testing

- **Unit (the bulk):** `repointMediaRef` and `fillAltForHash` over every placement kind (body, figure,
  hero), the decorative-hero skip, the empty-vs-custom alt classification, the bare-hash and
  slug-qualified reference forms, the byte-intact guarantee, and a malformed reference left untouched.
- **Unit:** the planner's plan shape and the branch-delta from a fixture usage index; the fail-closed
  path when `buildUsageIndex` throws.
- **Integration (workerd + miniflare):** the apply actions commit the right multi-file change atomically
  through a fake backend; the typed-slug gate; the fresh-read re-derive; the flash redirects.
- **Component (real browser):** the two review modals (roles, focus trap and restore, Escape, the native
  opt-in checkbox moving the live total, the show-all expander, the three buckets, the fail-closed
  surface), and the preview fetch wiring.
- **Showcase E2E:** a full replace round-trip (upload a new file, preview, confirm, the published entries
  repoint) and an alt-propagation round-trip.

## Scope and carry-forwards

In scope: replace-in-place (upload-new), alt propagation (fill plus opt-in overwrite), the preview-and-
confirm review modals, the branch-delta report, fail-closed, the atomic main commit.

Deferred (Pass C or later), each with its reason:

- **Repoint-to-an-existing asset** (a merge/dedupe model). A second mental model; YAGNI for Pass B.
- **Orphan collection of the superseded asset.** Pass C owns the destructive `reconcileMedia` sweep.
- **Bulk multi-asset replace.** Pass C owns multi-select bulk operations.
- **Branch rewriting.** Out of scope by design; branches are report-only.

Open risks carried into the build (from the synthesis), to watch but not solve now:

- Very-large-N (40+ references on one asset) still asks for real scrolling in one capped well; no
  virtualization or collapse-by-concept is specified. A later density pass may be needed if real corpora
  hit this.
- The decorative-skip depends on the persisted hero flag a body image cannot carry; the caveat beside
  will-fill is a copy-only mitigation, unverified until live use.
- The live-region and focus choreography is specified but only provable in the built Svelte component;
  the a11y reviewer verifies it at the gate.
- Replace gates on a typed slug while alt fill does not. The shared grammar is kept visually identical so
  only the gate differs; if review reads it as inconsistent, revisit.
- The fail-closed copy names a single branch; the implementer must also handle the index-level-gap
  wording.

## Documentation impact

- `docs/guides/manage-the-media-library.md`: add the Replace and Push-alt flows.
- `docs/reference/sveltekit.md`: the new actions on `createContentRoutes` and their fail payloads.
- `docs/explanation/media-storage.md`: replace repoints rather than mutates in place (why a new hash),
  and the alt-propagation model (fill, opt-in overwrite, decorative-respect).
- `CHANGELOG.md` and `docs/guides/upgrade-cairn.md`: a per-version entry. Additive admin surface, so no
  consumer action.
- `docs/reference/log-events.md`: any new `media.*` events (a replace and an alt-propagate event).
