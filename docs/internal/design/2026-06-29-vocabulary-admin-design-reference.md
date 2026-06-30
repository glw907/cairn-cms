# Vocabulary admin screen: frozen design reference

> The frozen design for the tag-vocabulary admin screen (`VocabularyAdmin.svelte`), the proving pilot
> of the admin idiomatic re-expression initiative
> (`docs/superpowers/plans/2026-06-29-admin-re-expression-1-vocab-pilot.md`, Task 1). The visual record
> is `2026-06-29-vocabulary-admin-ledger.html` ("variant A, the ledger"), authored in the real
> DaisyUI 5.6 / Tailwind 4 utility classes the component carries, validated by screenshot in both themes.
> Task 2 ports this verbatim. The interaction rules live with the tag-management spec
> (`docs/superpowers/specs/2026-06-29-cairn-tag-management-design.md`, Component 2).

## What the screen is

One screen, "Tags", reached from the admin sidebar's Manage group. It curates the site's shared tag
vocabulary, the labels editors pick from when they write. It does three jobs: add a tag, rename a tag's
label, and remove a tag nothing uses; plus a fourth, calmer affordance, seeding the list from tags
already on posts. It is a near-twin of `CairnTidySettings.svelte` and reuses that screen's form idiom: an
`untrack`-seeded `$state` working copy, a hidden-JSON field posted with `<CsrfField />` to
`?/saveVocabulary`, and a `role="status"` live region.

## The carried-forward design and the scope of this pass

Variant A ("the ledger") was carried forward from a prior session's mockup and refined to the frozen
Phase 0 idiom. The refinement migrated every secondary-text reference from the retired
`text-[var(--color-muted)]` / `text-[var(--color-subtle)]` bracket forms to the frozen named utilities
`text-muted` / `text-subtle`, and added the two pieces the plan review found missing: the always-present
mutation announcement and the add-validation error state. The design space is narrow (the screen is a
near-twin of a shipped settings screen and the data shape is fixed by the landed route), and variant A
clears the design-system and accessibility bar, so a second throwaway variant was not pursued. The
decision is recorded here rather than left implicit.

## Layout

A single centered column (`max-w-3xl`) inside the office shell, top to bottom:

1. **Heading and intro.** An `h1` "Tags" in the display face, a one-paragraph `text-muted` intro that
   names what a tag is and that the list is shared across the site.
2. **The mutation announcement.** An always-present `role="status" aria-live="polite"` line directly under
   the intro. Empty at rest; after an add, remove, or seed it reads the change ("Added Snow report.",
   "Removed Gear.", "Seeded 2 tags."). A small check glyph precedes the text. This is the a11y spine of the
   screen (see below).
3. **The add card.** A rounded card (`border-[var(--cairn-card-border)]`, `shadow-[var(--cairn-shadow)]`)
   holding the "Add a tag" label, a text input for the human label, a live slug preview, and the primary
   "Add tag" button. The preview reads "Stored as `<slug>` · editors see the name, posts keep the slug".
   On an invalid or colliding label the preview line is replaced by a validation message in the AA error
   ink (`text-[var(--cairn-error-ink)]`), and nothing is appended.
4. **The list ("Your tags").** A bordered card with a count chip and a three-column ledger: Name (an
   inline-editable input for rename), Stored as (the immutable slug in the editor font), In use (the
   cross-branch count or "Unused"), and a trailing delete control.
5. **The seed section ("Already on your posts").** A dashed-border card listing each unlisted tag with its
   usage count and an "Add to list" button. Rendered only when the `unlisted` set is non-empty. (The pilot
   ships per-candidate seeding only; a bulk "Add all" shortcut is a deferred nicety, not built.)
6. **The save footer.** A hairline-topped row with a one-line reassurance ("Saving commits your tag list to
   the site config, so every editor shares it.") and the primary "Save changes" submit.

## Recipes and role utilities used

- **Cards:** `rounded-2xl border border-[var(--cairn-card-border)] bg-base-100 shadow-[var(--cairn-shadow)]`,
  the admin card recipe. The seed card uses a dashed border to read as a reconcile, not a primary surface.
- **Secondary text:** the frozen `text-muted` (intro, helper, column headers, slugs) and `text-subtle`
  (the in-use count) named utilities only. No retired bracket form appears.
- **Error / validation text:** the sanctioned Tier-2 AA ink `text-[var(--cairn-error-ink)]` (the ledger
  locks it at roughly 5:1 light and 7:1 dark). This is the established idiom for on-surface error text and
  is not a retired role; the custom-surface gate does not count it.
- **Count chips:** `rounded-full bg-base-content/[0.06] px-2 py-0.5 ... tabular-nums text-muted`, the
  design-system count-chip pattern (a sanctioned surface tint, not a retired token).
- **Buttons:** `btn btn-primary btn-sm` for Add and Save; `btn btn-xs btn-ghost` for "Add to list"; a bare
  icon button for delete.
- **Code / slug:** the editor font with the code-chip tint `bg-[var(--cairn-code-chip)]` for the slug
  preview; the per-row slug is the editor font in `text-muted`.

## Interaction

- **Add.** Typing a label derives a slug live (lowercase, separators collapsed, matching
  `SAFE_TAG_VALUE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`). A label that derives to an empty or invalid slug, or to
  a slug that collides with an existing value, is rejected with the error-ink message and is not appended.
  On a valid add the new `{ value, label }` joins the working copy and the mutation region announces it.
- **Rename.** The Name input edits `label` only; the slug `value` is immutable once created, so renaming
  never rewrites a post. The Stored-as column shows the frozen slug.
- **Delete.** The delete control is active only for an entry with zero usage. An in-use entry's delete is
  **guarded with `aria-disabled="true"`** (never native `disabled`), faint, and carries a stateful
  accessible name and title naming the count ("Used on 8 posts. Remove it from those posts first."). The
  count column ("8 posts" vs "Unused") is the non-color signal that pairs with the guard. This mirrors the
  route's strict cross-branch delete gate, so the screen never offers a delete the route would reject.
- **Seed.** Each unlisted tag's "Add to list" button appends its `{ value, label }` to the working copy and
  announces it; the row leaves the seed section. Seeding is a UX
  affordance, not a safety gate (Plan 2's per-entry union already prevents any build delist).
- **Save.** The working copy posts as a hidden `vocabulary` JSON field with `<CsrfField />` to
  `?/saveVocabulary`, which commits to `site.config.yaml` through the head-guarded GitHub-App pipeline.

## Count-only delete presentation (a recorded Component-2 deviation)

The tag-management spec's Component 2 asks the screen to surface the usage count and the blocking entries.
The landed `VocabularyLoadData` carries `usage` as a per-value count only, with no entry identities. This
design presents **count-only**: the in-use count plus the guarded delete, the lean charter-correct surface.
An in-use tag cannot be deleted at all, so the editor needs to know that and by how much, not necessarily
where; the seed section already surfaces unlisted identities by value. Naming the blocking posts would
reopen the route contract for a heavier load, which is out of scope for the pilot. This is a deliberate
deviation, not an oversight.

## Accessibility notes (the three load-bearing pins)

1. **The delete guard is `aria-disabled="true"`, never native `disabled`.** Native `disabled` drops the
   control from the tab order and (on a DaisyUI `.btn`) kills the explanatory tooltip via
   `pointer-events: none`, so a keyboard or screen-reader editor would never learn the tag is in use. The
   guarded delete here is a bare icon button (not a `.btn`), so it carries `aria-disabled` plus a stateful
   `aria-label` and `title`; if it were ever a `.btn` it would also need the `cairn-btn-guarded` marker (the
   Tier-2 unlayered pointer-events restore). The active (unused) delete uses `text-error` for its icon, an
   icon at the 3:1 non-text floor, with a destructive hover tint.
2. **The mutation announcement region is always present.** A `role="status" aria-live="polite"` line is
   rendered unconditionally (empty at rest) so assistive tech re-announces every add, remove, and seed. The
   tidy twin's count region announces a toggle of a fixed row set; this screen adds and removes rows, a
   larger mutation the count alone does not voice, so the announcement narrates the specific change.
3. **The non-color signal pairs with the delete state.** The In-use column ("N posts" vs "Unused") and the
   `aria-disabled` state, not color alone, distinguish a guarded delete from an active one (WCAG 1.4.1).
4. **The add-field error is announced and programmatically tied to the field** (WCAG 3.3.1 / 4.1.3). The
   add input sets `aria-invalid="true"` while a label is invalid or colliding, and the error text carries
   `role="alert"` so a screen-reader editor hears it as they type, not only sighted users. The input keeps
   its `aria-describedby` help association at rest.
5. **The rename input's accessible name is stable.** It is named from the immutable slug
   (`aria-label="Tag name (<slug>)"`), not the live label, so the name does not churn character by
   character as the editor types a new label.

## Empty state

When the vocabulary is empty and nothing is unlisted, the list card shows a brief empty state ("No tags
yet. Add your first one above, or seed from tags already on your posts.") and the seed section is absent.
When the vocabulary is empty but posts already carry tags, the seed section leads, inviting the editor to
populate the list from what is already in use.
