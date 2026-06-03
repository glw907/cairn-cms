# Cairn content graph Plan 5: content rename and the atomic inbound rewrite (design)

This plan adds content rename, the highest-blast-radius operation in the content-graph initiative
(`2026-06-02-cairn-content-graph-design.md`, approved). It follows Plan 4 (delete and the integrity
guards, executed and review-remediated). The initiative's single "content lifecycle" plan was split:
Plan 4 took delete plus the guards, and rename plus the multi-file inbound rewrite land here, isolated
so the pass verifies against a single, well-understood operation.

## What rename is, and why it is the hard one

Cairn's `id` is the filename stem, and the `cairn:<concept>/<id>` token keys on it. The id is permanent
today, so a link survives any change to the target's slug, date, or permalink pattern. Rename is the one
operation that changes the id, which is exactly what breaks every inbound token unless they are rewritten
in the same commit. A cairn save is a commit to `main` that auto-deploys, and the build fails closed on a
dangling token, so the rewrite has to land atomically with the move or the author's change silently never
goes live.

**Rename is slug-only (the locked scope).** An author changes the URL slug. For a page the id equals the
slug, so the id changes directly. For a dated post the date prefix stays fixed and only the date-stripped
slug changes. Changing a post's date is out of scope: the date is already an editable frontmatter field,
and editing it changes the permalink safely without breaking any internal link, since the token keys on the
id and resolves to the current URL on every build. Only the slug change needs the rewrite machinery, so
slug-only rename is both the everyday author need ("I named it badly, let me fix the URL") and the smallest
isolated change.

**No cascade-unwrap-on-delete.** Plan 4's block-until-clean already makes delete safe, and auto-editing
other authors' pages on a delete is the wrong default for a non-technical author. Rename covers the common
"move without breaking links" need, so cascade is dropped from the initiative rather than deferred.

## The approach: a request-time atomic rewrite

`renameAction` reads the manifest, finds the inbound linkers, reads each linker's file, rewrites the token
in each body, and commits the move plus every rewrite plus the manifest in one `commitFiles` (the Plan 1
primitive). Two alternatives were rejected. A manifest-only alias (keep old tokens pointing via an
old-id-to-new-id alias) leaves stale tokens in the prose and accumulates cruft, defeating the rot-proof
goal. A two-commit "move now, rewrite later" opens a window where the build fails and the author's change
never deploys. The request-time atomic rewrite is the only fit, and it reuses every primitive the
initiative already built.

## What renameAction does

1. **Validate and compute the new id.** The new slug is validated like `createAction` (lowercase letters,
   numbers, hyphens). The new id keeps the entry's existing date prefix and swaps the slug: a small
   `renameId(oldId, newSlug, datePrefix)` derives `oldSlug = slugFromId(oldId, datePrefix)` and returns the
   id with its slug suffix replaced, so a page (no date prefix) renames its whole id and a dated post keeps
   its prefix. A no-op (new slug equals the current slug) is rejected.
2. **Guard a collision.** If a file already exists at the new path, refuse with a clear message. This
   mirrors `createAction`'s existing-file check and the dated-slug collision rule.
3. **Find the inbound linkers.** `inboundLinks(manifest, concept, oldId)` (Plan 4) names every entry whose
   edge list points at the renamed target. The renamed entry's own body is handled separately, since
   `inboundLinks` excludes a self-link, so a self-token in the renamed entry is rewritten too.
4. **Rewrite the token.** A pure `rewriteCairnLink(body, oldHref, newHref)` rewrites every `cairn:` link
   whose url is exactly `oldHref` to `newHref`, preserving the display text, any link title, and the rest of
   the document exactly. It is mdast-located like the remediated `unwrapCairnLink`, so it never touches a
   token inside a code span and agrees with the detector on what a link is.
5. **Commit atomically.** One `commitFiles` carries: the old path deleted (`content: null`), the moved file
   written at the new path (its content unchanged except a self-token rewrite), each inbound linker written
   with its rewritten body, and the updated manifest. The renamed row and each touched linker row are
   re-derived from their new file contents via `manifestEntryFromFile`, so the manifest matches the corpus
   by construction (the renamed row carries the new id and permalink, each linker row carries the rewritten
   outbound edge).
6. **Redirect and inform.** Redirect to the entry at its new edit URL. The success notice names the old and
   new public URL, so the author can add an external redirect if they want; the redirect map itself stays
   deferred, since cairn does not own inbound links from outside the site.

A commit-time recompute of the collision check and the inbound links is the authoritative gate, the same
pattern `deleteAction` uses, closing the load-to-rename race against the manifest snapshot it reads.

## The pieces

- **`renameId(oldId, newSlug, datePrefix)`** in `src/lib/content/ids.ts`, beside `composeDatedId` and
  `slugFromId`. Pure, unit-tested for a page and a dated post.
- **`rewriteCairnLink(body, oldHref, newHref)`** in `src/lib/components/markdown-format.ts` (or
  `src/lib/content/links.ts`), the sibling of the mdast-based `unwrapCairnLink`. It parses with the same
  pipeline as `extractCairnLinks`, finds each link node whose url is `oldHref`, and splices its source span
  so only the href changes (the label and title source stay byte-for-byte). Pure, unit-tested.
- **`renameAction`** in `src/lib/sveltekit/content-routes.ts`, beside `deleteAction`, reusing
  `inboundLinks`, `renameId`/`slugFromId`, `rewriteCairnLink`, `manifestEntryFromFile`/`removeEntry`/
  `upsertEntry`, and `commitFiles`. `editLoad` ships the current slug (and the routing the dialog needs to
  preview the new URL) on `EditData`.
- **`RenameDialog.svelte`** beside `DeleteDialog.svelte`, the "Change URL" control: a slug input prefilled
  with the current slug, a live preview of the resulting URL, a note that links from other pages update
  automatically, and a submit posting to `?/rename`. Same native-`<dialog>` a11y baseline as `DeleteDialog`
  and `LinkPicker`.
- **`EditPage`** wires the control and surfaces the collision or refusal result, consistent with how it
  surfaces the delete 409 and the broken-links banner.

## Fold-in: the commitFiles absent-path delete hardening

Rename deletes the old path, so the Plan 4 workers-review carried item folds in here. The GitHub Git Trees
API returns 422 when a `sha: null` delete names a path absent from the base tree. In `commitFiles` the 422
special-casing lives only on the ref PATCH step, so a tree-create 422 on a redundant delete surfaces as a
raw 500 rather than the friendly "changed since you opened it" conflict redirect. The reachable case is two
editors renaming or deleting the same entry concurrently. `commitFiles`/`treeChanges` is hardened so a
delete of an already-absent path is treated as a conflict (or tolerated as already-reached), surfaced the
same way `deleteAction` and `renameAction` surface a conflict. Test-first against the existing
`github-atomic-commit` harness.

## Known limitation: manifest concurrency

Rename reads the committed manifest non-transactionally, like save and delete. A concurrent write can
interleave (last-writer-wins on the git-committed manifest, with no compare-and-swap), and the build's
fail-closed `verifyManifest` and `cairn:` resolver are the designed backstop, which suits cairn's tiny write
volume of a few allowlisted editors. This pass does not add a compare-and-swap; it documents the race
alongside the matching save and delete races recorded in Plan 4.

## Wiring the action into the showcase (a Plan 4 lesson)

`RenameDialog` posts to `?/rename`, so the showcase admin edit route must register
`rename: routes.renameAction` beside `save` and `delete`. Plan 4 shipped `deleteAction` but missed the
showcase registration, so the delete 404'd in the reference consumer until the remediation. This plan wires
the rename action in the same task that adds the dialog, and the showcase production build is the end-to-end
gate.

## Where it lives in code

- `src/lib/content/ids.ts`: `renameId`.
- `src/lib/components/markdown-format.ts` (or `src/lib/content/links.ts`): `rewriteCairnLink`.
- `src/lib/github/repo.ts`: the `commitFiles` absent-path delete hardening.
- `src/lib/sveltekit/content-routes.ts`: `renameAction`, the `editLoad` slug/preview field.
- `src/lib/components/RenameDialog.svelte`, `src/lib/components/EditPage.svelte`: the Change URL control and
  its dialog.
- `examples/showcase/src/routes/admin/(app)/[concept]/[id]/+page.server.ts`: register the rename action.
- The package and component index exports, and a minor version bump.

## Testing

- `renameId` and `rewriteCairnLink` are pure, so they unit-test directly: a page id, a dated post id keeping
  its prefix; a plain link, an escaped-bracket label preserved, a titled link, a code-span occurrence left
  untouched, a self-link, multiple occurrences, and a no-match left unchanged.
- `renameAction` tests as a unit against the `fetch` double, matching `content-routes-delete.test.ts`: a
  rename with no inbound links commits the move and the manifest only; a rename with inbound links rewrites
  every linker, asserted by the `commitFiles` tree shape (the old path as `sha: null`, the new path with the
  content, each linker with its rewritten body, the manifest updated); a collision is refused with no commit;
  a self-token in the renamed body is rewritten in the moved file; a no-op slug is rejected.
- The `commitFiles` absent-path hardening tests against the `github-atomic-commit` harness: a delete of a
  path absent from the base tree surfaces as a conflict, not a raw error.
- `RenameDialog` and the `EditPage` wiring test as components: the slug input prefills, the URL preview
  updates, the form posts to `?/rename`, and the collision or refusal result is surfaced. The dialog mirrors
  the `DeleteDialog` a11y baseline (native `<dialog>` focus trap and Escape, the input label).
- The showcase production build is the end-to-end gate for the action wiring.

## Out of scope (deferred)

Date-rename, cascade-unwrap-on-delete, the external redirect map (the WordPress old-slug pattern into a
site-read redirect map), deep links to a heading, create-on-link, the admin link-health view, the backlinks
panel (which reuses `inboundLinks`), and external-link checking. Each stays recorded on the initiative
roadmap for a later pass.
