# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is the workspace `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`.

## Where the work is (2026-06-02, content-graph Plan 5 / slug-only rename executed and review-remediated; the content-graph initiative is COMPLETE)

Content-graph Plan 5 (slug-only rename plus the atomic inbound-link rewrite) executed subagent-driven on `main`, one
`cairn-implementer` per task (Sonnet for the mechanical tasks, Opus for the judgment-heavy `renameAction` and the
review fold-ins), commits `7b31e2c..eda6340` (the ten plan tasks), then a simplifier commit `9ab890a` and a review-gate
fold-in `80fd6ff`. **`main` is pushed and the window is PUBLISHED as `0.21.0`, now `latest` on npm** (OIDC
trusted-publishing workflow off the `v0.21.0` GitHub Release, build provenance attached), rolling the `0.19.0` (picker),
`0.20.0` (delete and the guards), and `0.21.0` (rename) window over the registry's prior `0.18.0`. It bumps the minor to
`0.21.0` (additive route surface, a new `RenameDialog`, the `EditData` `slug`/`renamed` fields, the pure helpers).
**Plan 5 is the last plan of the
content-graph initiative, so the initiative is now complete:** the atomic commit primitive, the committed manifest and
the `cairn:` resolver, the editor link picker, content delete with the integrity guards, and now content rename all
landed.

**Recovered after a battery interruption.** The prior session lost battery mid-Task-6, with the `EditPage` rename wiring
and its two tests written but uncommitted. The recovered diff was complete and correct (targeted test 16/16, full gate
green), so it committed as `f75a234` with no rework; Tasks 1 through 5 had already committed. No work was lost. The
remaining Tasks 7 through 10 and the full review gate then ran this session.

The pass delivers: slug-only rename (a page renames its whole id; a dated post keeps its date prefix and swaps the
date-stripped slug), the file move plus the self-token rewrite plus every inbound linker's body rewrite plus each touched
manifest row, all in one atomic `commitFiles` commit, so no internal link breaks. New code: `renameId` (`ids.ts`),
`rewriteCairnLink` (`markdown-format.ts`), `renameAction` plus the `editLoad` `slug` field, the `renamed` field, and the
parallel reads (`content-routes.ts`), the `commitFiles` tree-create 422-to-`CommitConflictError` hardening (`repo.ts`),
`RenameDialog.svelte`, the `EditPage` rename wiring, and the persistent polite/assertive `aria-live` regions that replace
the per-banner roles so each alert announces once.

Gate at the tip (`80fd6ff`): `npm run check` 777 files 0/0, `npm test` 109 files / 606 tests exit 0, `check:package`
all-green with no export-condition change. The showcase production build exits 0 with the rename action registered. The
five `renameAction` unit cases pass (no-inbound rename, inbound-linker rewrite with its manifest edge, self-token rewrite,
collision refused with no commit, no-op slug refused with no commit), and the `commitFiles` tree-create 422 throws
`CommitConflictError`.

**Review gate.** The simplifier replaced the Task 7 nested-ternary live-region derivations with `$derived.by` if-chains
(`9ab890a`, behavior identical). Three Opus reviewers ran (`svelte-reviewer`, `daisyui-a11y-reviewer`,
`cloudflare-workers-reviewer`); the workers reviewer returned clean on the atomicity, token rewriting, path safety, and
the 422 fail-safe, and no reviewer found a Critical bug. Four findings folded in as `80fd6ff`: the successful rename was
silent because `editLoad` never read the `?renamed=1` redirect (now read and confirmed visibly and through the polite
region); `RenameDialog` now seeds focus into the slug input on open (WCAG 2.4.3) instead of the Close button; the
redundant `aria-label` on the labelled slug input was dropped; and the 409 collision branch carries a comment that it also
covers the concurrent-rename race. The separate high-effort `/code-review` was not run this pass: the three scoped Opus
reviewers covered exactly this pass's surface, and a `/code-review` would diff the whole unpushed branch (the
`0.19`/`0.20`/`0.21` window) and re-surface landed work. `web-auth-security-reviewer` did not apply.

**Live admin smoke: carried fast-follow.** The showcase runs `adapter-node`, so there is no `wrangler dev` admin Worker.
The browser component tests cover the dialog, the focus seeding, the live region, and the collision banner; the
content-route unit tests cover the rewrite-and-commit path. The interactive smoke (rename an entry with an inbound link,
confirm the link still resolves on the linking page, confirm a collision is refused) is best run during the ecnordic
migration.

**Carried follow-ups (from the review gate).** The persistent assertive region does not re-announce an identical repeat
error (a colliding slug typed twice), since the derived string is unchanged; a nonce keyed off the action-result identity
would force it, and the fix spans the whole Task 7 live-region design. The `RenameDialog` slug echo shows the raw typed
value, so it can preview a slug the action rejects; running it through the shared `slugify` would match the create form,
and tying it with `aria-describedby` would carry it to assistive tech. The collision read is a third sequential
round-trip before the parallel pair; folding it into the `Promise.all` shaves one edge latency hop at the cost of one
wasted read on the no-collision path. The manifest last-writer-wins races stay the documented posture, caught by the
build's fail-closed backstop.

**Immediate next action: the content-graph initiative is complete and `0.21.0` is published, so the next work is the
site migrations.** Publishing is DONE: the registry's `latest` is `0.21.0` (the `v0.21.0` GitHub Release published via the
OIDC workflow, build provenance attached), rolling the `0.19.0`/`0.20.0`/`0.21.0` window over the prior `0.18.0`, and
`main` is pushed. The site migrations run per-site (`site-pass`, ecnordic then 907, from each site's own repo), pinning
`^0.21.0`, where each site
wires its complete content layer (delivery, resolver, manifest, the editor link surface) in one site-pass and the
scaffolder template captures the full picture. The migration gotchas in the entries below still apply (pass every
declared concept's glob, declare every read frontmatter key, coerce an unquoted YAML date, resolve `cairn:` links
wherever a body renders to HTML). There is no new cairn-cms engine plan to draft: the initiative roadmap is exhausted, so
the next plan is a site's own migration pass, authored in that site's repo.

**DX backlog from the first site migration.** The ecnordic `^0.10` to `^0.21` migration (the first full-surface
consumer migration) ran as a DX audit. The ranked engine backlog it produced is `docs/dx-backlog-ecnordic-migration.md`
(evidence in `ecnordic-ski/docs/cairn-dx-findings.md`). The high-cost items, ranked by what they cost a SvelteKit
developer new to cairn: the delivery root-versus-`/delivery` import split (and the `/delivery` barrel pulling
`CairnHead.svelte` into a node test), `EntryData` carrying no resolved concept, `ContentSummary` omitting the authored
summary field, and two build-time guarantees that lean on scaffold defaults a real SvelteKit site overrides (a `cairn:`
token resolves content concepts only, not routes; the dangling-token backstop goes silent under an inherited
`handleHttpError: 'warn'`). The file also carries the `create-cairn-site` scaffolder checklist. Fold these into the
scaffolder pass and the next engine touch-ups.

## Where the work is (2026-06-02, content-graph Plan 4 / content delete and the integrity guards executed and review-remediated)

Content-graph Plan 4 (content delete, the delete and save integrity guards, and four carried link-integrity
fixes) executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet, Opus for the
judgment-heavy save guard, `deleteAction`, and `EditPage` wiring), commits `19e8c0b..b63ac2e` (the fifteen
plan tasks), then a simplifier commit `30d363d` and a review-gate fold-in `afbf08b`. **Local only, not pushed,
not published.** It bumps the minor to `0.20.0` (additive route surface, a new `DeleteDialog`, the pure
helpers). The pass delivers: a Delete control that blocks until clean and names the inbound links, a save guard
that hard-blocks a dangling `cairn:` link with a one-click unwrap-to-text fix and warns a draft target, and the
four fold-ins (`escapeLinkText`, the hardened `parseManifest`, the manifest/site-index validation-exclusion
reconciliation in `buildSiteManifest`, and the three Plan 3 editor nits: the `insertLink` pre-mount fallback,
the `[[` code-block skip, the `LinkPicker` heading tiebreak).

New code: `escapeLinkText` (`links.ts`), `unwrapCairnLink` (`markdown-format.ts`), `inboundLinks`/`InboundLink`
(`manifest.ts`), `deleteAction` plus the `saveAction` guard and `editLoad` inbound field
(`content-routes.ts`), and `DeleteDialog.svelte`. Gate at the fold-in tip (`afbf08b`): `npm run check` 774
files 0/0, `npm test` 570 tests exit 0, `check:package` all-green.

**The review gate found real bugs, all now fixed (commits `2cf82ee`, `5bd8718`, `64ffdc4`, `2640e71`).** Three
Opus reviewers ran (`svelte-reviewer`, `daisyui-a11y-reviewer`, `cloudflare-workers-reviewer`; the workers one
returned ship-it). The svelte and a11y reviewers converged on a broken post-action feedback flow, folded in as
`afbf08b` (surface the `deleteAction` 409, clear a fixed broken-link row, kill the double "Saved" banner). A
high-effort seven-angle `/code-review` then surfaced a cluster of CONFIRMED bugs that meant the save-guard
recovery flow, the pass's headline feature, did not actually work. The remediation batch:

- `2cf82ee` the keystone. A blocked save re-seeded the editor from the committed body and discarded the
  author's edits (and the broken link to fix); `EditPage` now seeds from the returned `form.body`.
  `unwrapCairnLink` was a raw regex that no-opped on the escaped-bracket and titled links the picker produces
  and could rewrite a link inside a code span; it is now an mdast-located offset splice that unescapes the
  display text and leaves code and the rest of the document exact. The banner row hides only on a real change,
  and the refused-delete banner names the linkers itself instead of pointing at a stale dialog.
- `5bd8718` `parseManifest` validated entry scalars but only that `links` was an array; a malformed link
  element (a missing id, a string, or null) passed and `inboundLinks` silently dropped a real inbound linker,
  letting the delete guard strand a link. It now validates each link element as a `{ concept, id }` string pair
  and type-checks an optional `date`.
- `64ffdc4` the save guard draft-warned a self-link on a draft entry; it now skips the entry being saved before
  classifying, mirroring `inboundLinks`.
- `2640e71` the showcase admin edit route registered only the `save` action, so the shipped delete 404'd in the
  reference consumer and any site scaffolded from it; it now registers `delete: routes.deleteAction`. Showcase
  production build exits 0.

Gate at the remediation tip (`2640e71`): `npm run check` 774 files 0/0, `npm test` 579 tests exit 0, showcase
build exit 0.

**Live admin smoke: carried fast-follow.** The showcase runs `adapter-node`, so there is no `wrangler dev`
admin Worker to smoke. The browser component tests cover the dialogs, the banner, and the unwrap fix; the
interactive smoke (block a delete on a linked-to page, delete an unlinked page, recover a blocked save via the
unwrap fix) is best run during the ecnordic migration against that site's real Worker.

**Carried follow-ups (from the review gate, for Plan 5 or a later pass).** Folded into the Plan 5 design where
noted: the `commitFiles` 422-on-absent-path delete edge (a delete of a path already absent from the tree
surfaces as a raw 500, not the friendly conflict redirect; rename deletes the old path, so it folds into Plan
5). Recorded as known limitations: the manifest concurrency races (a concurrent save adding an inbound link can
be missed by a delete gate, and a concurrent delete of a target can be missed by a save guard; both are
last-writer-wins on the git-committed manifest with no compare-and-swap, caught by the build's fail-closed
`verifyManifest`/resolver backstop, which is the designed safety net for cairn's tiny write volume; rename
shares the race). Smaller follow-ups: `buildSiteManifest` silently drops an invalid draft (a linked-to invalid
draft reds the build far from root cause, since the site gate skips drafts but the manifest validate has no
draft exception), a persistent always-present live region for the page alerts (the success/error/broken/draft
banners are `{#if}`-gated and announced inconsistently), and a perf-and-reuse cleanup (double `extractCairnLinks`
per save, double `parseMarkdown` per file at build, sequential `editLoad` reads, the `byKey`/resolver
key-shape duplication).

**Immediate next action: execute content-graph Plan 5,
`docs/superpowers/plans/2026-06-02-cairn-content-graph-05-rename.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default), from the cairn-cms
directory on `main`. Start at Task 1.** The design is settled and approved (spec
`docs/superpowers/specs/2026-06-02-cairn-content-graph-05-rename-design.md`), so skip brainstorming. It runs on
`main` directly (additive, no site deploys) and bumps `0.21.0`. The pass is slug-only rename (a page renames its
id=slug; a dated post renames the date-stripped slug, keeping its date prefix) with the atomic inbound-link
rewrite through `commitFiles`, and no cascade-unwrap-on-delete. Ten test-first tasks: `renameId` and the mdast
`rewriteCairnLink` helpers, the `commitFiles` tree-create 422 hardening, `renameAction` plus the `editLoad` slug
field and parallel reads, the `RenameDialog` and `EditPage` wiring, a persistent edit-page live region, the
showcase rename action, and the version bump. Two Plan 4 review carries fold in (the absent-path delete edge in
Task 3, the alert live region in Task 7), and Task 9 wires the action into the showcase, the Plan 4 lesson. The
pass-end review gate is the simplifier plus `svelte-reviewer` (the dialog and the live region),
`daisyui-a11y-reviewer` (the dialog, the live region, the keyboard path), and `cloudflare-workers-reviewer` (the
`renameAction` read-rewrite-commit path and the `commitFiles` hardening), all Opus, plus a high-effort
`/code-review`; the live `/admin` smoke is a carried fast-follow for the ecnordic migration.

**Deferred (user's call 2026-06-02): publishing is held.** The registry's `latest` is `0.18.0`; `main` carries
the unpublished `0.19.0` (picker) and `0.20.0` (this lifecycle pass with its remediation). Publish the rolled
window before the site migrations, since a site pins a range only after the publish. The whole content-graph
initiative still precedes the site migrations.

## Where the work is (2026-06-02, content-graph Plan 3 / the editor link picker executed)

Content-graph Plan 3 (the editor link picker) executed subagent-driven on `main`, one `cairn-implementer` per
task (Sonnet), commits `9614b0a..d6aad7e` (the ten plan tasks), plus a simplifier commit `0c43fb0` and a
test-hardening commit `6485e37`, then the post-mortem `ac31a32`. **Local only, not pushed, not published.** It bumps
the minor to `0.19.0` (additive). The pass delivers the editor link picker end to end: an author inserts a `cairn:`
internal link two ways, a "Link to page" dialog and a `[[` autocomplete, both reading the `linkTargets` Plan 2 ships
to the editor and both writing `[Display](cairn:<concept>/<id>)`.

New code: `formatCairnToken(ref)` in `src/lib/content/links.ts` (the inverse of `parseCairnToken`).
`insertInlineLink(doc, from, to, href, title)` in `src/lib/components/markdown-format.ts` (a pure inline transform,
selection-wrap or title-insert, no block padding). `src/lib/components/link-completion.ts` holds the pure
`matchCairnTrigger` (the `[[query` matcher) and `linkCompletions` (title substring filter, grouped by concept,
drafts marked, the full link as the apply text), plus `cairnLinkCompletionSource(targets)`, a thin CodeMirror
`CompletionSource` adapter. `MarkdownEditor` gained two seams, `registerInsertLink` (an inline, selection-aware
insert) and a generic `completionSources` prop wired through `autocompletion({ override, interactionDelay: 0 })`.
`src/lib/components/LinkPicker.svelte` is the "Link to page" dialog, mirroring `ComponentInsertDialog`'s
native-`<dialog>` a11y. `EditPage` registers the completion source and the inline insert and renders the picker
beside the component dialog. `formatCairnToken` and `LinkPicker` are exported from the package.

Final gate at the tip (`6485e37`): `npm run check` 771 files 0/0, `npm test` 105 files / 537 tests exit 0 (green
across three consecutive full-suite runs after the flake fix), `check:package` all-green across all five entries with
no export-condition change. The simplifier made one cosmetic fix (`0c43fb0`) and reasoned against extracting the
concept-section logic shared across two layers. `svelte-reviewer` (Opus) and `daisyui-a11y-reviewer` (Opus) both
returned ship-it, no Critical or Important: the runes seams are correct, and the dialog plus the autocomplete popup
match or extend the `ComponentInsertDialog` a11y baseline (native `<dialog>` focus trap and Escape, the searchbox
label, the draft conveyed as text, CodeMirror's built-in combobox ARIA). A high-effort seven-angle `/code-review`
surfaced no Critical or Important; its two convergent findings are the carried bracket-escaping and pre-mount items
below. `cloudflare-workers-reviewer` and `web-auth-security-reviewer` did not apply.

**Flake fixed at the gate.** The Task 6 autocomplete end-to-end test accepted the completion with Enter, which under
full parallel browser load races CodeMirror's accept handler and falls through to a newline (green in isolation, red
under load, about half the time). The fix (`6485e37`) accepts by clicking the option, which drives CodeMirror's
mousedown-apply deterministically and proves the same seam without the keystroke race; the Enter contract is
CodeMirror's own built-in. Three consecutive full-suite runs are green after the change.

**Live admin smoke: carried fast-follow.** The showcase runs `adapter-node`, so there is no `wrangler dev` admin
Worker to smoke. The browser component tests cover the dialog and the autocomplete; the interactive smoke (open the
dialog, pick a target, type `[[` and accept, confirm the inserted link in a real browser) is best run during the
ecnordic migration.

**Carried follow-ups for Plan 4 (recorded in the Plan 3 post-mortem):** unescaped brackets in an author title flowing
into the link display text (CommonMark tolerates balanced brackets, so only an unbalanced `[`/`]` breaks it, and it
self-corrects in the preview; the fix escapes title-derived text but not a live selection, so it wants its own
test-first task); `insertLink` no-ops before the editor mounts (matches `applyFormat`, only the block-insert path has
a raw-value fallback); `matchCairnTrigger` has no syntax-tree awareness, so `[[` triggers inside a code block; and the
section-order tiebreak uses the raw concept id, cosmetic past the two built-in concepts.

**Content-graph Plan 4 is WRITTEN (brainstormed and authored 2026-06-02): content delete and the integrity guards,**
`docs/superpowers/plans/2026-06-02-cairn-content-graph-04-lifecycle.md` (design spec
`docs/superpowers/specs/2026-06-02-cairn-content-graph-04-lifecycle-design.md`, approved). The brainstorm split the
spec's single lifecycle plan: **Plan 4 takes delete plus the two guards, and rename plus the multi-file inbound rewrite
move to Plan 5** (the highest-blast-radius op, isolated). Decisions locked, each grounded against the field (Sanity,
Contentful, Hugo, Docusaurus, WordPress, Notion): the delete guard is block-until-clean (refuse while inbound links
exist, name them), and the save guard hard-blocks a dangling link (one-click unwrap-to-text fix) and warns a draft
target. The posture is "keep `main` always deployable", since a cairn save is a deploy and a non-technical author will
not see a failed build. Cascade-unwrap-on-delete defers to Plan 5 with rename. Four carried follow-ups fold in
(bracket-escaping in link text, the `parseManifest` guard, validation-failing-entry consistency, the three minor Plan 3
editor nits). Fifteen test-first tasks, additive, bumps `0.20.0`. The plan corrects the spec's test-layer note: the
content-route guards are unit-tested against a `fetch` double, since the routes have no D1.

**Plan 4 is DONE (executed and review-remediated 2026-06-02).** See the top entry for the landing detail, the
review remediation, and the authoritative next action (write Plan 5). The description below stays as the pass's
design record.

**Deferred (user's call 2026-06-02): publishing `0.19.0` is held.** The user chose to brainstorm Plan 4 rather than
publish the picker pass. The registry's `latest` is `0.18.0`; `main` carries the unpublished `0.19.0` (picker) and will
carry `0.20.0` (this lifecycle pass) on top. Publish the rolled window (`0.20.0`) before the site migrations, since a
site pins a range only after the publish. Plan 5 is rename plus the multi-file inbound rewrite (and cascade-unwrap-on-
delete), where the remaining content-graph follow-ups land. The whole content-graph initiative still precedes the site
migrations.

## Where the work is (2026-06-02, content-graph Plan 2 / the committed manifest and link resolution executed)

Content-graph Plan 2 (the committed manifest plus the `cairn:` link resolver) executed subagent-driven on
`main`, one `cairn-implementer` per task (Sonnet for the mechanical tasks, Opus for the atomic-save Task 10 and
the showcase end-to-end Task 11), commits `cdabeef..c50fc47` (fifteen: thirteen plan tasks plus two review-gate
commits). **`main` is pushed and the window is PUBLISHED as `0.18.0`, now `latest` on npm** (OIDC trusted-publishing
workflow off the `v0.18.0` GitHub Release, build provenance attached), rolling the content-graph manifest work over the
registry's prior `0.17.0`. It bumps the minor to `0.18.0` (additive surface). The pass
delivers internal links end to end: an author writes `[guide](cairn:posts/<id>)`, it renders as the live
permalink on the public page, a dangling target fails the build, and the editor preview marks a broken target.

New pure modules carry the work. `src/lib/content/links.ts` owns the `cairn:<concept>/<id>` token grammar
(`parseCairnToken`, `extractCairnLinks`, the latter parsing the body as mdast so a token in a code span is never
matched). `src/lib/content/manifest.ts` holds the manifest types, `manifestEntryFromFile` (one row per file,
identity plus outbound cairn edges, drafts flagged), the canonical serialize/parse (sorted, fixed key order,
trailing newline so the committed file diffs cleanly), `verifyManifest` (the build backstop, a canonical-form
comparison that throws on drift), the `upsertEntry`/`removeEntry` patch helpers, and `manifestLinkResolver` (the
preview lookup, undefined on a miss). `src/lib/delivery/manifest.ts` adds `buildSiteManifest` (the whole-corpus
projection mirroring `createSiteIndexes`) and `buildLinkResolver` (site-index-backed, throws on a miss).
`src/lib/render/resolve-links.ts` is the `remarkResolveCairnLinks` mdast step, before remark-rehype, so a rewritten
href passes the sanitize floor like any anchor; the per-call resolver rides on a VFile so the processor is still
built once. `entryLoad` resolves cairn links at build against the site index (the throw-on-miss backstop).
`saveAction` moved off `commitFile` onto the Plan 1 `commitFiles`: it reads the manifest, upserts the saved row,
and commits content and manifest in one commit. `editLoad` ships the manifest `linkTargets` to the client, and
`EditPage` builds a manifest resolver from them to resolve and mark links in the preview. The sanitize floor now
admits the inert `cairn:` href scheme (extend-only, the `javascript:`/`data:` strip preserved). The showcase wires
the whole path: a regenerate script (`npm run cairn:manifest`), a build-time `verifyManifest`, a real
`cairn:pages/about` link in the hello post, and both feeds resolving links to absolute URLs.

Final gate at the tip (`c50fc47`): `npm run check` 762 files 0/0, `npm test` 103 files / 519 tests exit 0,
`check:package` all-green across all five entries with no export-condition change. The end-to-end gate is the
showcase production build: the prerendered hello post renders `<a href="/about">about page</a>` with no
unresolved token, the feeds render `href="https://showcase.test/about"`, and the committed manifest matched the
corpus. The backstop was proven: pointing the link at `cairn:pages/does-not-exist` and rebuilding failed with
`cairn link target not found` (exit 1); reverting went green. The simplifier found nothing. Three Opus reviewers
ran (`cloudflare-workers-reviewer` ship-it on the atomic save, `svelte-reviewer` clean on the preview resolver,
`daisyui-a11y-reviewer` on the broken-link cue); three findings folded in as `81ec429` (the corrected stale-manifest
comment, the tracked `resolveLink` effect read, the `title="Broken internal link"` text cue). A high-effort
`/code-review` surfaced one real regression folded in as `c50fc47`: the floor now admits `cairn:`, so the showcase
feeds shipped dead `cairn:` links until threaded a resolver. Plan and full post-mortem (with the carried
follow-ups): `docs/superpowers/plans/2026-06-02-cairn-content-graph-02-manifest-and-resolution.md`.

- Design: `docs/superpowers/specs/2026-06-02-cairn-content-graph-design.md` (approved). This plan implemented its
  Plan 2 (the committed manifest) and Plan 3 (the token, resolver, build backstop, preview cue) together.

**One key correction locked in: the manifest slug rule matches `content-index.ts` exactly**
(`slugFromId(id, descriptor.routing.dated ? descriptor.datePrefix : null)`), so the manifest permalink equals the
content-index permalink by construction and the preview resolver and the build resolver never disagree. An early
hardcoded `'day'` granularity (to pass a malformed fixture) was reverted; the Task 2 and Task 4 fixtures were fixed
to pair a day-prefixed filename with `datePrefix: 'day'`.

**Live admin smoke: carried fast-follow.** The showcase runs `adapter-node`, not a Worker, so there is no
`wrangler dev` admin Worker to smoke. The `integration` project exercises the save path in workerd against a real
miniflare D1. The browser smoke (an editor saving an entry, confirming the commit carries both files) is best run
during the ecnordic migration against that site's real Worker.

**Content-graph Plan 3 is WRITTEN (brainstormed and authored 2026-06-02): the editor link picker,**
`docs/superpowers/plans/2026-06-02-cairn-content-graph-03-picker.md` (design spec
`docs/superpowers/specs/2026-06-02-cairn-content-graph-03-picker-design.md`, approved). It builds the "Link to page"
dialog and the `[[` autocomplete, both writing the `cairn:` token through two new `MarkdownEditor` seams (a generic
`completionSources` prop wired through `@codemirror/autocomplete`, and a `registerInsertLink` inline insert), reading
the `linkTargets` Plan 2 ships. Brainstorm decisions locked: drafts shown flagged, the completion seam is generic, and
substring (not fuzzy) search. Ten test-first tasks, additive, bumps `0.19.0`.

**Immediate next action: execute content-graph Plan 3,
`docs/superpowers/plans/2026-06-02-cairn-content-graph-03-picker.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default), from the cairn-cms
directory on `main`. Start at Task 1.** The design is settled (skip brainstorming). It runs on `main` directly
(additive, no site deploys). Task 1 adds the `@codemirror/autocomplete` dependency (this plan does change a
dependency, unlike Plan 2). The pass-end review gate is the simplifier plus `svelte-reviewer` (the completion-source
`$derived` and the picker reactivity) and `daisyui-a11y-reviewer` (the dialog, the search box, the keyboard and focus
path, the autocomplete popup), both Opus, plus a high-effort `/code-review`; the live `/admin` interactive smoke is a
carried fast-follow for the ecnordic migration (the showcase runs `adapter-node`).

After the picker, Plan 4 is the lifecycle guards (delete/rename with inbound-link rewriting), which is where several
Plan 2 carried follow-ups land (a link to a draft or invalid target, the resolver-vs-index divergence). The other
carried follow-ups, in the Plan 2 post-mortem, include a render-without-resolver contract caveat for the site
migrations (resolve cairn links wherever a body renders to HTML), a `parseManifest` per-entry/version guard, and an
`editLoad` two-read parallelize. The whole content-graph initiative still precedes the site migrations.

## Where the work is (2026-06-02, content-graph Plan 1 / the atomic commit primitive executed)

Content-graph Plan 1 (the atomic multi-file commit primitive) executed subagent-driven on `main`, one
`cairn-implementer` per task (Sonnet), commits `51f36de..2e4cfde`, plus one review-gate fold-in `3ba73af`. Local
only, not pushed. No version bump (additive and internal, `commitFiles` is unexported from the package entry). It
is the foundation of the content-graph initiative and the highest-stakes code in it (it writes to `main` and a
later caller will trigger site deploys), so it landed and was verified in isolation before anything builds on it.

`commitFiles(repo, changes, opts, token)` lives in `src/lib/github/repo.ts` beside the single-file `commitFile`.
It commits several path changes in one commit over the Git Data API: read the branch head, read its base tree,
POST a new tree on `base_tree` (so an unnamed path is preserved, including a concurrent commit's on a retry), POST
one commit parented on the head with the editor as author and the committer omitted, then PATCH the ref with
`force: false`. The exported `FileChange` is `{ path, content: string | null }`, where a null content encodes a
delete as a `sha: null` tree entry, so one commit mixes writes and deletes (what a rename needs). A `422`
non-fast-forward retries the whole sequence on the re-read head up to three times, rebuilding the tree on the new
base, and exhaustion throws the existing `CommitConflictError` so the caller fails safe. A non-422 ref failure
throws immediately. An empty change set is rejected before any network call (the review-gate fold-in).

Final gate at the tip (`3ba73af`): `npm run check` 754 files 0/0, `npm test` 99 files / 489 tests exit 0. The
eight-case `github-atomic-commit.test.ts` pins the URL sequence (GET singular `ref/`, PATCH plural `refs/`), the
`base_tree`/parent wiring, the write and delete tree shapes, the retry-then-succeed, the
exhaustion-to-`CommitConflictError`, the non-422 immediate throw, and the empty-set guard. The simplifier found
nothing to change. `cloudflare-workers-reviewer` (Opus) returned a ship-it verdict, no Critical or Important. A
high-effort seven-angle `/code-review` confirmed the diff is cleanly additive with no caller, collision, or barrel
leak; its one folded finding is the empty-set guard. The `svelte-reviewer`, `web-auth-security-reviewer`,
`daisyui-a11y-reviewer`, and the live admin smoke did not apply (no Svelte, auth, session, cookie, or DaisyUI code,
and no route calls `commitFiles` yet). Plan and full post-mortem (with the locked decisions and the latent
follow-ups): `docs/superpowers/plans/2026-06-02-cairn-content-graph-01-atomic-commit.md`.

**Content-graph Plan 2 is WRITTEN (brainstormed and authored 2026-06-02), merging the design's old Plan 2 and Plan
3 into one pass:** `docs/superpowers/plans/2026-06-02-cairn-content-graph-02-manifest-and-resolution.md`. The
manifest (build-verified projection, committed) and the `cairn:` link resolver land together, since they share the
token parser and a manifest-only pass would ship infrastructure nothing reads yet; together they resolve internal
links end to end (build resolves against the site index and fails closed on a dangling token, the preview marks a
broken target). Thirteen test-first tasks. Brainstorm decisions locked into the plan: the outbound edge list is
populated now (the shared `extractCairnLinks`), drafts are included and flagged, the build reads the site index
while the preview reads the manifest shipped to the client (one render with an injected resolver), drift fails the
build with a `npm run cairn:manifest` regenerate command, and the `commitFiles` 422 retry re-sends the manifest
blob last-writer-wins (accepted: the build reconciles). The picker is now Plan 3, the lifecycle guards Plan 4 (the
design spec's plan list is annotated with the resequence). The pass is additive and bumps `0.18.0`.

**Plan 2 is DONE (executed 2026-06-02).** See the top entry for the landing detail and the authoritative next
action (brainstorm then write Plan 3, the picker). The description below remains as the pass's design record: it ran
`subagent-driven` on `main` (additive, no site deploys), and its review gate was the simplifier plus
`cloudflare-workers-reviewer`, `svelte-reviewer`, `daisyui-a11y-reviewer`, and a high-effort `/code-review`.

**Latent follow-ups carried from Plan 1** (unreachable under current conventions, recorded in the post-mortem): the
file-wide `encodeURIComponent(repo.branch)` in a ref path position would break a slashed branch name (cairn commits
only to `main`); the retry treats every ref-PATCH `422` as a non-fast-forward; the GET helpers throw with the
status alone and do not read the error body.

### The content-graph initiative (design)

The content-graph initiative is the active engine work, sequenced **before** the site migrations (decided this
session, migration is unhurried so the slot ahead of it is the accepted trade). It gives cairn a committed,
build-verified manifest projection of the corpus that request-time admin code reads without an N+1 GitHub crawl,
and it powers rot-proof internal links between posts and pages, a link-aware editor picker, and safe
delete/rename with inbound-link rewriting. It absorbs and supersedes the retired internal-links design and the
dated-slug deferred lifecycle items.

The spec is written and approved: `docs/superpowers/specs/2026-06-02-cairn-content-graph-design.md`. The spine is
"files are truth, the manifest is a build-verified projection, every content mutation commits content and manifest
atomically." Two rationales are recorded in it so they are not re-litigated: why a stable-id `cairn:<concept>/<id>`
token rather than the Obsidian `[[wikilink]]` format (grounded in a verified 2026 competitive survey: not a
portable standard, name-based rot, literal-text degradation; the `[[` trigger is kept only as an insert gesture
that writes the id token), and why the link graph is a git-committed manifest rather than D1 (the resolver and
build-fail backstop run at build, where a runtime D1 binding is unreachable). The git-versus-D1 placement rule is
now its own canonical reference, `docs/data-architecture.md` (the build-versus-runtime test plus the three worked
precedents: config/nav to git, the manifest to git, the editor allowlist staying in D1).

The initiative is five foundation-first plans, each written just-in-time after the prior lands: (1) the atomic
multi-file commit primitive, (2) the committed manifest, (3) the token + build-time resolver + build backstop +
preview broken-link flag, (4) the picker (toolbar dialog + `[[` autocomplete), (5) content delete/rename + the
save and delete integrity guards. **Plan 1 is written and committed:**
`docs/superpowers/plans/2026-06-02-cairn-content-graph-01-atomic-commit.md` (three test-first tasks adding
`commitFiles` to `src/lib/github/repo.ts`: the write-only Git Data API sequence, delete encoding, and the
non-fast-forward retry with a `CommitConflictError` backstop). It is the highest-stakes code in the initiative
(it writes to `main` and triggers site deploys), so it lands and is verified in isolation before anything builds
on it. Plan 1 is internal and additive (no package export, no version bump). One spec correction baked into the
plan: the GitHub layer is unit-tested by stubbing `fetch` (the `github-commit.test.ts` pattern), not in the
integration project, which has no GitHub double.

**Plan 1 is DONE (executed 2026-06-02).** See the top entry for the landing detail and the authoritative next
action (brainstorm then write Plan 2, the committed manifest). The plan series detail below remains as the
initiative's roadmap.

The site migrations (ecnordic then 907, `^0.17.0`) follow the whole initiative, so each site wires its complete
content layer (delivery, resolver, manifest) in one site-pass and the scaffolder template captures the full
picture. The migration gotchas in the entries below still apply.

## Where the work is (2026-06-02, render-safety pass executed, PUBLISHED 0.17.0)

The render-safety pass executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet), commits
`ae69a50..d86788a`. **`main` is pushed (`dbbef00..5074476`) and the window is PUBLISHED as `0.17.0`, now `latest`
on npm** (OIDC trusted-publishing workflow off the `v0.17.0` GitHub Release, build provenance attached). The single
publish rolled the unpublished `0.15.0` (delivery robustness), `0.16.0` (auth hardening), and `0.17.0`
(render safety) window into one release over the registry's prior `0.14.0`. That is the five plan-task commits, one review-gate doc fold-in (`8aee8a7`), and the
post-mortem (`d86788a`). Local only, not pushed, not published. It closes the escalated render-safety gap: the
engine render pipeline now sanitizes author content by default. `createRenderer` inserts `rehype-sanitize` after
`rehype-raw` and before the component dispatch, so author markdown (raw HTML, link URLs, slot bodies) is cleaned
while the site's trusted `build()` output and its inline SVG icons run after the floor untouched. The new
`src/lib/render/sanitize-schema.ts` builds the schema from `hast-util-sanitize`'s `defaultSchema` plus the
directive markers (so the dispatch still reads its stamps), the benign tags real content uses (`nav`, `details`,
`summary`), and free-form `className`/`target`/`rel` on anchors; `rehypeAnchorRel` forces `rel="noopener
noreferrer"` on every `target="_blank"` anchor. Two `RendererOptions` members carry the posture: `sanitizeSchema`
extends the allowlist from the safe base (extend-only, cannot weaken the core strip), and `unsafeDisableSanitize`
is the developer-only off switch. The admin preview collapsed onto the one floor, dropping the redundant DOMPurify
pass and the `dompurify` dependency, so the preview mirrors the published page. The additive surface bumps the
minor to `0.17.0`.

Final gate at the tip (`d86788a`): `npm run check` 753 files 0/0, `npm test` 98 files / 482 tests exit 0,
`check:package` all-green with no export-condition change. The new `render-sanitize.test.ts` (ten cases) proves
the strip and the preserve behavior, and the showcase production build (exit 0) prerenders the `callout` to
`<aside class="callout callout-warning">` through the floor with no `onerror`/`<script>` in the output, the proof
the before-dispatch placement preserves the directive markers. A `code-simplifier` pass found nothing to change.
`svelte-reviewer` (Opus) returned clean on the `EditPage` change (the `$effect` debounce and `previewRun`
latest-wins guard correct, no new race, `{@html}` safe under the single-floor model). A high-effort `/code-review`
with a security angle surfaced one Important finding, folded in as `8aee8a7`: the floor runs before the dispatch,
so a component `build()` that routes a directive **attribute value** (raw author input) into an `href`, `src`,
`style`, or event-handler position re-opens the `javascript:` vector. The build code is trusted, its inputs are
not. Not a regression (delivery had no sanitization before this pass), and the planned sites route attribute
values into class positions, so the fix is a documented `build()` contract caveat in the render-safety section,
not engine code. A possible URL-coercing build helper is a carried follow-up. Plan and full post-mortem:
`docs/superpowers/plans/2026-06-02-cairn-render-sanitize.md`.

- Spec: `docs/superpowers/specs/2026-06-02-cairn-render-sanitize-design.md` (approved).

**Live admin smoke:** no `/admin` server surface changed, so it does not apply. The editor preview is covered by
the browser component tests, and the showcase prerender covers the delivery path.

**Superseded next action (see the top entry):** the site migrations now follow the content-graph initiative, which
was sequenced ahead of them this session. The migration detail below stays accurate for when that time comes.

The site migrations (per-site `site-pass`, ecnordic then 907, from each site's own
repo), pinning `^0.17.0`. Publishing is DONE (`0.17.0` is `latest`), so a site can pin the range now. Each site
imports from `@glw907/cairn-cms/delivery`, applies the `renderPreview`-to-`render` rename, builds its content layer
with `siteDescriptors` + `createSiteIndexes`, adopts the `responses.ts` feed/sitemap/robots helpers and the
`<CairnHead>` head, wires the catch-all `[...path]` route, and sets its per-concept URL policy in the YAML. The
migration gotchas apply: every declared concept must pass its `import.meta.glob` to `createSiteIndexes` (an empty
`{}` for an intentionally empty concept), every frontmatter key a site reads must be declared in its concept
schema, and a hand-rolled `validate` must coerce an unquoted YAML `date` (a JS `Date`). A site that needs a benign
tag the default sanitize allowlist omits extends it through `createRenderer(registry, { sanitizeSchema })`. The
render-safety gap is closed, so the delivery surface is now safe for a site to adopt. Breaking notes a consuming
site honors at the bump: the `MarkdownEditor` `preview` prop is gone (since `0.9.0`), `ComponentDef.build` is
`build(ctx)` (since `0.12.0`), and the adapter takes one `schema` member via `defineFields`/`defineAdapter` (since
`0.13.0`).

## Where the work is (2026-06-02, auth-hardening pass executed, unpublished 0.16.0)

The auth-hardening pass executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet for the seven
mechanical tasks, Opus for Task 7's prose-and-memory rewrite), commits `ad19f0e..443ab01`. That is the eight
plan-task commits, one simplifier refinement (`9f9d5f5`), and one review-gate fold-in (`443ab01`). Local only, not
pushed, not published. Six units landed: the `__Host-` session cookie name derived from the request protocol
(`__Host-cairn_session` with `Secure` on https, plain `cairn_session` on local http, derived identically at set,
read, and clear); six baseline security headers on every admin response through `resolve()` (`nosniff`,
`X-Frame-Options: DENY`, a matching `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy: no-referrer`,
HSTS, a conservative `Permissions-Policy`), with non-admin responses untouched; a per-isolate `Map` memo of the GitHub
installation token (55-minute TTL under the one-hour lifetime, keyed by `installationId`, injected mint and clock);
a per-email magic-link cooldown (60 seconds, response unchanged so non-enumeration holds) plus a `platform.ctx.waitUntil`
background send with an inline fallback; lazy expired-row sweeps folded into `issueToken` and `createSession`; and an
https `requireOrigin` guard that allows http only for an exact `localhost` or `127.0.0.1` hostname. The smoke doc was
rewritten for the self-owned D1 model. The additive surface bumps the minor to `0.16.0`.

Final gate at the tip (`443ab01`): `npm run check` 753 files 0/0, `npm test` 98 files / 477 tests exit 0,
`check:package` all-green with no export-condition change. A simplifier pass made one cosmetic doc-comment fix
(`9f9d5f5`). Both applicable Opus reviewers ran: `web-auth-security-reviewer` (no Critical, no in-scope Important;
CSRF verification item PASS) and `cloudflare-workers-reviewer` (no Critical or Important; confirmed `db.batch`
atomicity, the per-isolate memo, the TTL margin, the `waitUntil` keep-alive). Two minor findings in this pass's own new
code folded in as `443ab01`: prefer the supported `platform.ctx` over the deprecated `platform.context` alias, and
match the localhost origin hostname exactly so `localhost.evil.com` cannot skip the https requirement. Plan and full
post-mortem: `docs/superpowers/plans/2026-06-02-cairn-auth-hardening.md`.

- Spec: `docs/superpowers/specs/2026-06-02-cairn-auth-hardening-design.md` (approved).

**Render-safety verification item: FAIL, escalated to its own pass (the plan's intended handling, not a blocker for
this pass).** The auth reviewer confirmed the reference delivery render path in `src/lib/render/pipeline.ts` composes
`remarkRehype({ allowDangerousHtml: true })` with `rehypeRaw` and no `rehype-sanitize`, and the showcase delivers its
output through `{@html}`, so author markdown carrying a `<script>`, an `onerror`, or a `javascript:` URI reaches the
published page verbatim. The deferred-CSP decision rested on render safety being the real XSS control, and that control
is absent on the reference path. Cairn's trusted-editor model lowers the likelihood (an owner-curated allowlist
committing through the GitHub App with history), so this is a malicious-or-compromised-editor and paste-mistake
exposure, not anonymous input. See the `cairn-render-sanitize-gap` memory.

**Live admin smoke:** the showcase runs on `@sveltejs/adapter-node`, not a Worker with a `wrangler` config, so there is
no `wrangler dev` admin Worker to smoke here. Real-Worker coverage for every changed behavior is the `integration` test
project (workerd against a real miniflare D1), green across `auth-guard`, `auth-confirm`, `auth-request`, and
`auth-cleanup`. The deployed-https browser smoke (a real browser round-tripping the `__Host-` cookie, an editor clicking
a real magic link) stays a human fast-follow, consistent with this project's precedent.

The render-safety pass was brainstormed and planned on 2026-06-02. The brainstorm settled the design forks, grounded in
a competitive survey (WordPress, GitHub, Hugo, Decap, Astro, and others): cairn belongs to the authors-but-filtered
camp, where the dominant override posture is an extend-only allowlist. Locked: the floor is `rehype-sanitize` inside
`createRenderer`, on by default, placed after `rehype-raw` and before the component dispatch so it cleans the untrusted
author content while the site's trusted `build()` output and its inline SVG icons are never sanitized; the schema is
`hast-util-sanitize`'s `defaultSchema` extended with the registry-derived directive markers and the benign tags real
content uses; the posture is extend-only with a developer-only `unsafeDisableSanitize` hatch; the admin preview collapses
onto the one floor, dropping the redundant DOMPurify pass and the `dompurify` dependency; and CSP stays a documented
site-level recommendation, not engine code.

**The render-safety pass is DONE (executed 2026-06-02).** See the top entry for the landing detail and the
authoritative next action (publish the `0.16.0`/`0.17.0` window, then the site migrations). The summary below
remains as the pass's design record.

## Where the work is (2026-06-02, delivery-robustness pass executed, unpublished 0.15.0)

The delivery-robustness pass executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet),
commits `aefabc6..40eb4d1` (the five plan-task commits, one simplifier refinement, one review fold-in). Local
only, not pushed, not published. It hardens the delivery surface against the misconfigurations and edge inputs
a migrating site can trip: `createContentIndex` excludes a validation-failed entry from the typed read (records
it in `problems()`, serves only `result.data`, the `raw as F` cast gone); `createSiteIndexes` throws at build
on an absent glob key for a declared concept and on a concept named `site`; `FeedItem.date` is optional and
the feed builders omit the date rather than emit `Invalid Date` (RSS) or throw a `RangeError` (JSON); and
`entryLoad` passes `feeds` to the head builder only for a dated entry, so an undated Page stops advertising the
post feed. The additive surface bumps the minor to `0.15.0`.

Final gate at the tip (`40eb4d1`): `npm run check` 751 files 0/0, `npm test` 96 files / 461 tests exit 0,
`check:package` all-green across the existing entries with no export-condition change. The end-to-end gate is
the showcase production prerender: the dated `hello` post carries both feed `rel="alternate"` links, the
`about` page carries none, and the feeds still render dated items (3 `<pubDate>`, 3 `date_published`). A
`code-simplifier` pass extracted a shared `parseFeedDate` (`022a0e1`). A `svelte-reviewer` (Opus) confirmed the
`entryLoad` spread is prerender-safe and the invalid-entry exclusion cannot serve raw frontmatter or break the
catch-all, no Critical or Important findings; the other three reviewers did not apply. A high-effort
`/code-review` (four angles) surfaced no confirmed bug: its two most-cited findings (the `validate:false`
exclusion and the `entry.date` feed gate) are both the plan's locked design, and `problems()` still records
every dropped entry. One review finding folded in as `40eb4d1`: the showcase feed routes now pass `p.date`
directly instead of the stale `?? ''` empty-string fallback, so the reference teaches the optional-date
contract a migrating site copies. No `/admin` surface changed, so the live admin smoke does not apply. Plan and
full post-mortem: `docs/superpowers/plans/2026-06-01-cairn-delivery-robustness.md`.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-delivery-robustness-design.md` (approved).

**Migration gotcha to honor (Task 2's intended behavior):** `createSiteIndexes` now hard-fails when a declared
concept has no glob key. The ecnordic and 907 migrations must pass every declared concept's `import.meta.glob`
(an empty `{}` for an intentionally empty concept). A conditionally-omitted glob that used to default to an
empty index now throws at build. This is the loud-failure the guard exists for, a migration step to honor.

**Decision (2026-06-02): hold the `0.15.0` publish, and do the auth-hardening pass next.** The user chose to
keep `0.15.0` local and unpushed for now (engine work needs no publish; a publish can batch with the
auth-hardening landing later), and to sequence auth-hardening ahead of the site migrations.

The auth-hardening pass was brainstormed and planned on 2026-06-02. The brainstorm settled the design forks,
each grounded rather than defaulted. Install-token caching is an in-isolate memo, mirroring the
`@octokit/auth-app` default, with no new binding and no pluggable seam, since cross-isolate stores (KV, D1)
solve a sharing problem cairn's tiny write volume does not have. CSP is deferred: a correct admin CSP would
thread a SvelteKit nonce into CodeMirror's runtime styles and spans the library/site boundary, and the threat
it mitigates on `/admin` is weak, so the pass ships the five zero-cost enforcing headers and records the
render-path sanitization invariant as the real XSS control. The magic-link rate limit is a per-email cooldown
on the existing `magic_token` row, zero-migration, since the endpoint only sends to allowlisted editors. The
pass grew one unit during brainstorming, a lazy expired-row sweep, the single auth-adjacent backlog item.

**Immediate next action: execute the auth-hardening plan,
`docs/superpowers/plans/2026-06-02-cairn-auth-hardening.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default), from the
cairn-cms directory on `main`. Start at Task 1.** The plan is fully written (eight test-first tasks) and the
design is settled (spec `docs/superpowers/specs/2026-06-02-cairn-auth-hardening-design.md`, approved), so skip
brainstorming. It runs on `main` directly (additive or internal, no site deploys on a cairn-cms push) and bumps
`0.16.0`. The eight tasks: the `__Host-` cookie prefix (protocol-derived name), the five `/admin` security
headers in the guard, the in-isolate install-token memo, the magic-link per-email cooldown plus `waitUntil`
send, the lazy expired-row sweep, the https `PUBLIC_ORIGIN` guard, the admin smoke-doc rewrite, and the version
bump. The pass touches auth, session, cookie, and Worker code, so the pass-end review gate adds
`web-auth-security-reviewer` and `cloudflare-workers-reviewer` (both Opus), and the live admin smoke runs
against the rewritten doc (mint a D1 session row, send `Cookie: __Host-cairn_session=<id>`). Two verification
items run at the gate rather than as tasks: the SvelteKit CSRF origin check stays on, and the showcase
reference `render(md)` is confirmed not to emit raw author HTML.

After auth-hardening lands, the site migrations follow (per-site `site-pass`, ecnordic then 907, from each
site's own repo), which need `0.16.0` published first so a site can pin the range. The migration gotcha above
(pass every declared concept's glob) applies there.

## Where the work is (2026-06-02, schema Plan 3 / the SEO head consumer executed, PUBLISHED 0.14.0)

Schema-source-of-truth Plan 3 (the per-entry SEO head consumer) executed subagent-driven on `main`,
one `cairn-implementer` per task (Sonnet), commits `60e2d0c..bfeca52` (four plan-task commits plus one
review-gate hardening commit). **Pushed to origin and PUBLISHED as `0.14.0` (`latest` on npm via the OIDC
release `v0.14.0`, 2026-06-02), covering the whole unpublished `0.12.0`/`0.13.0`/`0.14.0` window in one
release.** **The schema-source-of-truth
initiative is now complete:** one `defineFields` declaration drives the editor form, the validator, the
inferred frontmatter type, and now the SEO head end to end. The additive surface bumped the version to
`0.14.0`, rolling on the unpublished window over `0.13.0`.

A new pure `src/lib/delivery/seo-fields.ts` holds `readSeoFields` (reads the four known head fields,
`description`/`image`/`robots`/`author`, off an entry's normalized frontmatter, keeping a present string
trimmed and omitting an absent, empty, or non-string value) and `resolveImageUrl` (turns an
author-supplied path absolute against the origin, returning `undefined` for a malformed string rather
than throwing at build), both re-exported from the delivery and root entries. `entryLoad` reads the SEO
fields once, applies the description fallback (`fields.description || entry.excerpt || description`) and
the default-image fallback (`fields.image ?? defaultImage`), resolves the chosen image absolute, and
spreads `image`/`robots`/`author` into the unchanged `buildSeoMeta`. `PublicRoutesDeps` gained an
optional `defaultImage`, the one site-wide OG image. The showcase declares the SEO fields, sets values on
the hello post and the about page, and passes a `defaultImage`.

Final gate at the tip (`bfeca52`): `npm run check` 751 files 0/0, `npm test` 96 files / 450 tests exit 0,
`check:package` all-green across the existing entries with no export-condition change. The end-to-end gate
is the showcase production prerender: the hello post carries its own `og:image`
`https://showcase.test/og/hello.png` and `article:author` `Showcase Author`, the second post (no declared
image) carries the default `og:image` `https://showcase.test/og/default.png`, and the about page carries
`robots` `noindex`. A code-simplifier pass found nothing to change. A `svelte-reviewer` (Opus) confirmed
the load is prerender-safe with correct fallback precedence and non-throwing error handling, no Critical or
Important findings; the other three reviewers did not apply (no Worker, D1, auth, session, cookie, or
DaisyUI code). Three reviewer findings folded in as `bfeca52`: `readSeoFields` now stores the trimmed
value (a stray `robots: "  noindex  "` had reached the head with surrounding whitespace), and two
docstrings now state the scope (`author` renders only for a dated entry's `article:author`, and the
bare-path image anchoring holds for the sites' bare-domain origin). No `/admin` surface changed, so the
live admin smoke does not apply. Plan and full post-mortem:
`docs/superpowers/plans/2026-06-01-cairn-schema-03-seo.md`.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md` (initiative), design
  reference `docs/superpowers/specs/2026-06-01-cairn-schema-03-seo-design.md` (this plan).

**Immediate next action: execute the delivery-robustness plan,
`docs/superpowers/plans/2026-06-01-cairn-delivery-robustness.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default), from the
cairn-cms directory on `main`.** The plan is fully written (five test-first tasks) and the design is settled
(spec `docs/superpowers/specs/2026-06-01-cairn-delivery-robustness-design.md`, approved), so skip
brainstorming and start at Task 1. It runs on `main` directly (additive, no site deploys on a cairn-cms
push). The five tasks: keep invalid entries out of the typed read (`content-index.ts`, the Astro/Velite
model, delete the `raw as F` cast), guard a missing or reserved-`site`-key glob at build
(`site-indexes.ts`), omit a feed date rather than throw on a bad one (`feeds.ts`), scope feed autodiscovery
to dated entries (`public-routes.ts`), then bump to `0.15.0` with the showcase production prerender as the
end-to-end gate. Two items are deferred to the backlog (the permalink impossible-date and the excerpt CJK
counting), near-unreachable for the English sites.

After this pass lands, the remaining engine-backlog item is the auth-hardening pass (`__Host-` cookie
prefix, `/admin` security headers, rate-limit + `waitUntil` on the request endpoint, install-token KV
caching), independent and schedulable anytime. Then the site migrations onto the delivery surface, unblocked
on the registry side (the `0.13.0`/`0.14.0` window is published as `0.14.0`, `latest`, so a site pins
`^0.15.0` once this pass publishes).

## Where the work is (2026-06-01, schema Plan 2 / the contract cutover executed, unpublished)

Schema-source-of-truth Plan 2 (the adapter-contract cutover) executed and landed on `main`, commits
`a49c928..526b5b0` (six: five plan-task commits plus one review-gate hardening commit), local only and
not yet pushed or published. It is breaking on the adapter contract, so the version bumped to `0.13.0`,
rolling together with the unpublished `0.12.0` slot-render bump. One `defineFields` declaration is now the
single source of truth end to end: `ConceptConfig` dropped `fields`/`validate` for one generic `schema: S`
member, `defineAdapter<const A>` preserves each concept's concrete schema type, and `normalizeConcepts`
unpacks the schema onto the unchanged `ConceptDescriptor`, so the admin form, the save path, and
`siteDescriptors` needed no change. `validateFields` now omits empty optional values from a successful
result, so committed frontmatter stays minimal and the inferred optional-key type reads back accurate.
`createContentIndex` validates each entry once at build, keeps the cheap summary raw-derived, stores the
normalized `result.data` on the typed `frontmatter` detail field, and records a `ContentProblem` verdict via
`problems()` instead of throwing. `createSiteIndex` reads those verdicts, skips drafts, and throws one
combined report, so a half-finished draft no longer fails the build. The new `createSiteIndexes(adapter,
config, globs)` maps over a `defineAdapter`-typed adapter for one typed index per concept (`frontmatter`
typed as the concept's inferred schema) plus a `site` resolver; the showcase content layer migrated to it.
`validateFields` is no longer re-exported from the package entry.

Final gate at the tip: `npm run check` 749 files 0/0, `npm test` 95 files / 440 tests exit 0, `check:package`
all-green across all five entries (no export-condition change), and the showcase production build prerenders
the catch-all, feeds, sitemap, and robots. The `defineAdapter` type proof held with no constraint relaxation,
and Task 4's `expectTypeOf` (compile-checked by the 0/0 check) confirms the concrete schema type survives into
typed reads. A simplifier pass (no changes) and a high-effort seven-angle `/code-review` ran at the gate; none
of the four specialized reviewers applied (no Svelte, Worker, D1, auth, session, cookie, or DaisyUI code). The
review found one confirmed regression, folded in as `526b5b0`: the migrated showcase `posts` schema declared
only `title`/`date`, but the post files carry a `description` the SEO head reads, so validate-once dropped it
and the prerendered meta description silently fell back to the excerpt. Declaring the field restored it
(verified in the prerendered HTML). Plan and full post-mortem (with the carried follow-ups and the type-proof
detail): `docs/superpowers/plans/2026-06-01-cairn-schema-02-cutover.md`.

**The lesson for the site migrations: every frontmatter key a site reads must be declared in its concept
schema.** Validate-once serves only declared fields on `.frontmatter`, so a migrating site reading an
undeclared key gets `undefined` and a silent degrade, not an error. The ecnordic and 907 migrations each audit
their content for every read key before declaring the schema.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md`.

**Plan 3 is DONE (executed 2026-06-01).** See the top entry for the landing detail and the authoritative
next action (a sequencing fork: the residual delivery follow-up, auth hardening, or the site migrations,
each design-bearing). The design record below remains as the initiative's history.

Design settled (2026-06-01 brainstorm): the site-level default is the OG image only (`deps.defaultImage`), per
the absence-is-meaningful test and the convention across comparable tools; `robots` and `author` stay strictly
per-entry, with a `defaultAuthor` knob as a cheap symmetric addition later only if a real site asks. The
cross-concept catch-all reads the SEO fields by name off the normalized `.frontmatter` through a small typed
reader; the typed payoff is the full schema-to-head loop, not a statically typed catch-all.

After Plan 3 lands, the schema initiative is complete. The residual delivery items (the feed/excerpt/permalink
guards, the failure-path `frontmatter` typing, the reserved-`site`-key guard, the silent-empty-glob warning) stay
a small separate follow-up pass, after the schema initiative and before the site migrations. Publishing the
`0.13.0`/`0.14.0` window stays a separate release step, not urgent until the backlog clears.

## Where the work is (2026-06-01, schema Plan 1 / the schema primitive executed, unpublished)

Schema-source-of-truth Plan 1 (the additive `defineFields` primitive) executed and landed on `main`,
commits `80d2b84..c5ab533` (seven: five plan-task commits, one simplifier pass, one review-gate
hardening commit), local only and not yet pushed. It is additive and zero-blast, so it bumps no version;
the breaking `ConceptConfig` cutover is Plan 2. The new `src/lib/content/schema.ts` turns one `const`
field tuple into three faces from a single declaration: a plain `fields` array for the editor form, a
generated `validate` that delegates to the existing `validateFields` baseline and then layers the
declarative per-field rules (`min`/`max`/`length`/`pattern` on text and textarea, `min`/`max` on date)
and an optional validation-only `refine(data, body)` cross-field hook, and an inferred frontmatter type
via `InferFields`/`Infer`. A `~standard` Standard Schema v1 property gives ecosystem interop as a thin
adapter over `validate`, with a local types-only copy of the interface and no runtime dependency. The
primitive is re-exported from the package main entry; no consumer wires it yet (that is Plan 2).

Final gate at the tip: `npm run check` 745 files 0/0, `npm test` 93 files / 430 tests exit 0,
`check:package` all-green for the existing main entry (no new export condition). A simplifier pass (which
dropped the redundant field-variant casts in `applyRules`, since the discriminated union narrows on the
type guard) and a high-effort `/code-review` ran at the gate. None of the four specialized reviewers
applied, since the pass touched no Svelte, Worker, D1, auth, session, cookie, or DaisyUI code. Two
correctness findings were folded in test-first as the hardening commit: a malformed `pattern` now compiles
once in `defineFields` and fails fast there with a config error naming the field, instead of throwing an
uncaught `SyntaxError` from inside `validate()`; and `~standard.validate` coerces a null frontmatter or body
to the empty form, so it returns issues rather than dereferencing null. Plan and full post-mortem:
`docs/superpowers/plans/2026-06-01-cairn-schema-01-primitive.md`.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md`.

**Plan 2 is DONE (executed 2026-06-01).** See the top entry for the landing detail and the authoritative next
action (brainstorm then write Plan 3, the SEO head consumer). The brainstorm record below remains as the
initiative's design history.

Brainstorm settled (2026-06-01): keep `Infer`'s optional-key shape, and change the absorbed validator to omit
empty optional values (empty string, `false`, empty array), so committed frontmatter stays minimal and the
optional-key type reads back accurate. The SEO consumer stays a separate Plan 3. Drafts are skipped at the
build gate. The emission decision is recorded in the spec's "The schema primitive" section. Plan 3 (the
per-entry SEO head consumer) is written just-in-time after Plan 2 lands.

## Where the work is (2026-06-01, component-completion Pass 1 / slot render executed, unpublished)

Component-completion Pass 1 (the slot render path) executed and landed on `main`, commits `2bca500..d0c3e0a`
(eleven: nine plan-task commits, one simplifier pass, one review-gate hardening commit), local only and not
yet published. It builds the component named-slot render path end to end. `remarkDirectiveStamp` now stamps a
registered component's declared attributes, marks its `[label]` title paragraph, and stamps each nested slot
directive so they survive to hast. The rehype dispatch partitions those into named slots and hands `build` a
`ComponentContext` (`attributes`, `slot(name)`, `items(name)`, `node`), replacing the old `build(node)`
signature. That is the breaking change, so the version bumped to `0.12.0`. The showcase `callout` proves the
path, and the production build prerenders it to `<aside class="callout callout-warning">` with title, body, and
points. The folded hardening all landed: the `glyph` unknown-icon guard, the `validateComponent` single-parse
seam, the `splitHead` retirement, the repeatable-form stable identity, and the form a11y polish.

Final gate at the tip: `npm run check` 742 files 0/0, `npm test` 91 files / 410 tests exit 0, `check:package`
all-green for `0.12.0`. A simplifier pass (which extracted a shared `dataAttrProp` so the stamp/read casing
contract is one source of truth), plus `svelte-reviewer` and `daisyui-a11y-reviewer` (both Opus), ran at the
gate. The `cloudflare-workers-reviewer` and `web-auth-security-reviewer` did not apply, since the pass touched
no Worker, D1, auth, session, or cookie code. Both reviewers converged on one Important finding, the `IconPicker`
roving-tabindex pattern not moving DOM focus on arrow keys; it was folded in test-first (focus follows selection
via `tick()` then the live tab stop, the arrow origin derives from the tab stop, and the group label threads from
the field). Plan and full post-mortem: `docs/superpowers/plans/2026-06-01-cairn-components-03-slot-render.md`.

- Design: `docs/superpowers/specs/2026-06-01-cairn-engine-backlog-and-slot-render-design.md`.

**Carried fast-follow: the live `/admin` guided-insert smoke (Task 10) is unrun.** It needs a human clicking
through the insert dialog in a browser against a real Worker. The render path is proven by the showcase
production build and the form-to-editor flow by the browser component tests, so it is a fast-follow, best run
during the ecnordic component migration against that site's real Worker.

**Pass 2 was reframed (2026-06-01).** Brainstorming the typed-reads item escalated it into a foundational
**schema-source-of-truth** initiative, run before the site migrations while the adapter contract is still
pre-scaffolder and pre-adoption. One per-concept declaration (`defineFields`) becomes the single source of
truth, yielding a plain-data field projection for the editor form, a generated validator, and an inferred
frontmatter type. The design was pressure-tested against nine comparable systems (Keystatic, Tina, Astro,
Velite, Contentlayer, Nuxt Content, Sanity, Payload, Decap), which confirmed the single-declaration unification
and the no-codegen runtime inference, and drove four revisions: a corrected anti-Zod rationale, declarative
per-field rules (`min`/`max`/`length`/`pattern`), Standard Schema (`~standard`) conformance, and the
load-bearing invariants. Decision locked: **own the primitive** (not Zod/Valibot), conform to Standard Schema
for interop. Spec: `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md`. The initiative is
three plans: Plan 1 the additive primitive, Plan 2 the contract cutover (`ConceptConfig` to a `schema` member,
`defineAdapter`, `createSiteIndexes`, validate-once normalized reads, skip-drafts), Plan 3 the per-entry SEO
head consumer. The residual delivery items (feed/excerpt/permalink guards) become a small follow-up; Pass 3
(auth hardening) and the site migrations follow.

**Schema Plan 1 is DONE (executed 2026-06-01).** See the top entry for the landing detail and the
authoritative next action (brainstorm then write Plan 2, the contract cutover). Publishing `0.12.0` stays a
separate release step, not urgent until the backlog clears.

## Where the work is (2026-06-01, delivery-surface DX executed, unpublished)

The delivery-surface developer-experience pass executed and landed on `main`, commits `d606676..27deb16`
(thirteen: ten plan tasks plus three review-gate fixes), local only and not yet published. The delivery
layer is now the blessed, backend-free public path a SvelteKit site wires in a few lines. It adds the
fourth package entry `@glw907/cairn-cms/delivery` (imports no auth, github, or email, enforced by a
boundary test), build-time validation safe-by-default in `createSiteIndex` (`{ validate: false }` opt-out),
a ready `seo: SeoMeta` from the catch-all `entryLoad`, the `responses.ts` feed/sitemap/robots `Response`
helpers, `json-ld.ts` with breakout-safe escaping, the `<CairnHead>` head component (`title={false}` to let
a site own its `<title>`), the `siteDescriptors(adapter, config)` one-liner, `buildSeoMeta` `robots` and
`article:*` tags, and generic-over-frontmatter content reads (`createContentIndex<F>`) for a later
typed-reads pass. The showcase wires every surface (`content.ts`, the `[...path]` route, feed.xml,
feed.json, sitemap.xml, robots.txt) and the production build prerenders them as the end-to-end gate.

Final gate on `main`: `npm run check` 739 files 0/0, `npm test` 88 files / 398 tests exit 0,
`check:package` green (attw all-green for `/delivery`), showcase build prerenders all feeds and the
catch-all. A simplifier pass, a `svelte-reviewer`, a `daisyui-a11y-reviewer` (both Opus), and a
two-angle `/code-review` ran at the gate; three findings were folded in (the U+2028/U+2029 JSON-LD
escape gap, the missing showcase `feed.json` route the head advertised, a repeated concept lookup).
Plan and full post-mortem with the carried open decisions: `docs/superpowers/plans/2026-06-01-cairn-delivery-dx.md`.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-delivery-dx-design.md`.

**Published as `0.11.0` (`latest` on npm, OIDC release `v0.11.0`, 2026-06-01); `main` pushed (commits
`d522dfd..41b7a42`).** The delivery surface is now consumable as `@glw907/cairn-cms/delivery`.

**Decision (2026-06-01): clear the engine backlog before any site migration, as three
surface-focused passes; hold the roadmap initiatives out.** Brainstormed and scoped with the user.
The sites (ecnordic component migration + delivery Pass 1c, 907 catch-up) wait until these land. The
three passes:
1. **Component completion** (next, design written). The component slot render path end to end plus the
   render/grammar hardening, the Plan 2 form fixes, and the live `/admin` smoke. Design:
   `docs/superpowers/specs/2026-06-01-cairn-engine-backlog-and-slot-render-design.md`. The render half
   of the component initiative was never built: `remarkDirectiveStamp` only stamps registered component
   directives, so nested `:::title`/`:::actions` slots are dropped on the way to hast and the Plan 2 form
   can insert markup that renders to nothing. Pass 1 stamps slots at remark, partitions them at dispatch,
   and changes `ComponentDef.build` from `build(node)` to `build(ctx)` (`{ attributes, slots, node }`,
   rendered hast per slot) so a site `build()` arranges hast and never walks the tree. Breaking on
   `ComponentDef.build`, so it bumps the version. Folded hardening: `splitHead` heading-sniffing retires
   (its crash with it), the `glyph` unknown-icon guard, the `validateComponent` double-parse, the form
   repeatable-id + a11y fixes.
2. **Delivery/SEO hardening.** Skip-drafts-at-build, per-entry `image`/`robots`/`author` in the SEO head,
   the feed/excerpt/permalink edge cases, and typed reads (infer `F` from concept fields, apply the
   validator's normalized `data` on read).
3. **Auth hardening.** `__Host-` cookie prefix, `/admin` security headers, rate-limit + `waitUntil` on the
   request endpoint, install-token KV caching.

**Pass 1 status: DONE (executed 2026-06-01).** See the top entry for the landing detail; the authoritative
next action now lives there. The summary below remains as the pass's scope record. It bumped to `0.12.0`
(Task 9) for the breaking `build` change; publishing stays a separate release step after the pass. After Pass 1
lands and publishes, the ecnordic
component migration becomes a site-pass that refactors ecnordic's `build()` to `build(ctx)`. 907-life has
no directive components (plain remark-html, still on `0.6.0`), so it is out of the component initiative;
its only pending work is the version catch-up. Carried for the later delivery migration: the
build-validation date gotcha (an unquoted YAML `date` arrives as a JS `Date`, so a site's hand-rolled
`validate` must route it through `validateFields` or coerce).

Carried out-of-scope follow-ons: typed reads, OpenGraph image generation, redirects, i18n, and the two
delivery-validation refinements in the post-mortem (skip-drafts-at-build and apply-normalized-`data`-on-read).

## Where the work is (2026-05-31, post-component-form)

- Component registry Plan 2 of 3 (admin guided-insert form) executed, landed on `main`, pushed, and
  published as `0.10.0` (`latest` on npm via the OIDC release `v0.10.0`; commits `a3b38a3..008fc33`
  plus the docs and release-bump commits). `0.10.0` is additive over `0.9.0`: it bundles both
  component plans (Plan 1 grammar and Plan 2 form), and `ComponentPalette` was born and removed inside
  the unpublished window so no published export was dropped. It builds the guided-insert flow on
  Plan 1's grammar: `buildComponentInsert(def, values)` (the one pure serialize-then-validate step,
  exported from the main entry), `ComponentForm.svelte` (schema-driven fields, a repeatable
  add-and-remove list, inline validation errors), `ComponentInsertDialog.svelte` (the Insert trigger
  and a native `<dialog>` picker with the schema-vs-template dual path), and `IconPicker.svelte` over
  a site `IconSet` that now threads from the adapter through `composeRuntime` to `EditPage` to the
  form. `ComponentPalette` is removed; the dialog's dual path closes the Plan 1 no-op-def finding.
  The render `build()` path is untouched (that is Plan 3). Green at close: `npm run check` scan 0/0
  over 725 files, `npm test` 375 tests exit 0, `check:package` green, showcase builds. Execution
  deviations locked in: the unions are narrowed with typed accessors (no `any`) and `slotItems`
  returns the live `$state` proxy; `ComponentForm` is `{#key picked}`-wrapped so its `untrack` seed
  cannot go stale; the Insert trigger gets `aria-label="Insert component"` to avoid colliding with the
  form's submit. A review gate (simplifier plus svelte and daisyui-a11y reviewers, both Opus) ran;
  its findings were folded in test-first as the `008fc33` hardening commit (dropped the
  listbox/option roles for a plain button list, named the dialog, `role="alert"` plus `aria-invalid`/
  `aria-describedby` on the validation errors, the `{#key}` guard, the 24px remove-button floor).
  Plan and full post-mortem: `docs/superpowers/plans/2026-05-31-cairn-components-02-form.md`.
  **Queued (sequence against the delivery-surface DX pass above): brainstorm then write Plan 3
  (per-site migration: each site declares its UI components and `build()` reads named slots instead of
  the old heading convention, ecnordic then 907). It is the last of the three-plan component initiative. This is a design-bearing pass, so run
  `superpowers:brainstorming` with the user on the open decisions before `superpowers:writing-plans`;
  do not auto-write it. Parent design: `docs/superpowers/specs/2026-05-31-cairn-site-components-design.md`.
  Before Plan 3 ships, the live interactive `/admin` smoke for the guided-insert flow is the one
  unverified Plan 2 surface (see the carried follow-up).** Plan 3 is where the sites pin `^0.10.0` and
  the symlink dev link can engage.

## Earlier state (2026-05-31, post-component-grammar)

- Component registry Plan 1 of 3 (engine grammar and schema) executed and landed on `main`
  (commits `dbc1b69..174e02c`, not pushed, not published). It extends `ComponentDef` with a
  typed schema (`attributes` + named `slots`, plus `use`), adds the three grammar machines
  (`serializeComponent`, `parseComponent`, `validateComponent`) over one canonical
  `remark-directive` grammar, and `generateComponentReference` for the llms-full author/AI
  reference. Pure node `unit` code; `build()`, the render dispatch, and `insertTemplate` are
  untouched (`insertTemplate` only moved to optional). Green at close: `npm run check` scan 0/0
  over `src/`, `npm test` 360 tests exit 0, `check:package` green. Three corrections locked in
  during execution: `insertTemplate` became optional with a one-line palette guard;
  `remark-stringify` was an undeclared dependency (added and the committed lock relocked);
  and the plan's backslash-escaping premise was wrong (the directive grammar decodes HTML
  entities, so attribute quotes entity-encode instead). A svelte review plus a correctness
  review ran at the gate; the correctness findings were folded in test-first as a Task 9
  hardening pass (entity-encode quotes, escape title brackets, quote-aware unknown-attribute
  detection, repeatable-slot array guard, pinned `bullet: '-'`). Plan and full post-mortem:
  `docs/superpowers/plans/2026-05-31-cairn-components-01-grammar.md`. **Immediate next action:
  execute Plan 2 (the admin guided-insert form),
  `docs/superpowers/plans/2026-05-31-cairn-components-02-form.md`, via `cairn-pass` +
  `subagent-driven-development`, dispatching the `cairn-implementer` per task (Sonnet default fits
  these well-specified tasks). Ten tasks, test-first, building on Plan 1's `serializeComponent`/
  `validateComponent`/`emptyValues` and the editor's `registerInsert` seam. It is engine + admin-UI,
  no site migration; run it on `main` directly (additive, no site deploys on a cairn-cms push) or a
  worktree off `main`. Design: `docs/superpowers/specs/2026-05-31-cairn-components-02-form-design.md`.
  The brainstorm settled a modal dialog that folds in the palette, a visual icon picker fed by a site
  `IconSet` threaded through the adapter (with a None choice when the icon field is optional), reuse
  of `validateComponent` as the form validator, a schema-vs-template dual path (which also resolves
  the Plan 1 no-op-def finding), and body validation deferred.**

## Earlier state (2026-06-01, post-editor-swap-publish)

- The editor foundation swap (Carta to CodeMirror 6) MERGED to `main`, pushed to origin, and PUBLISHED
  as `0.9.0` (now `latest` on npm via the OIDC release `v0.9.0`). It replaces Carta with a
  client-only CodeMirror 6 edit surface behind the unchanged `MarkdownEditor` seam
  (`value`/`name`/`registerInsert`), gives cairn its own house-icon `EditorToolbar.svelte` and a pure
  node-testable `markdown-format.ts`, drops the dead Carta `preview` adapter prop from `EditPage`, and is
  breaking (the `preview` prop and the carta-md peer both left). Green on `main` after the merge: `npm run
  check` 0/0 over 707 files, `npm test` 331 passed exit 0. The showcase production build code-splits
  CodeMirror to client chunks with no `@codemirror/view` in the server bundle. Two review subagents
  (svelte, daisyui-a11y) plus a simplifier pass were folded in (the `$bindable` seam reconciles an external
  value change into the mounted view, a focus ring was restored, toolbar targets reach the 24px floor, and
  the toolbar uses the admin's stroke SVG icon set). Plan and post-mortem:
  `docs/superpowers/plans/2026-05-31-cairn-editor-codemirror-swap.md`. The `feat/editor-codemirror-swap`
  worktree and branch were removed after the merge. Carried follow-up: the interactive browser smoke (live
  typing, the focus ring, toolbar formatting) is the one unverified surface; the automated gate and the prod
  build cover the rest.
- The site UI component registry is designed; Plan 1 of 3 (engine grammar and schema) is now executed
  and landed (see the top entry). Each site will declare its UI components once (typed attributes, named
  slots, description, intended-use, render). One canonical directive grammar drives a guided insert form
  for non-technical editors, save+build validation, and a generated `llms-full`-shaped reference file an
  author points claude.ai at. Research grounded three choices: explicit named slots over an implicit
  heading, a parse-ready grammar for later round-trip editing, and schema validation. Insert-only in v1.
  Design: `docs/superpowers/specs/2026-05-31-cairn-site-components-design.md`; Plan 1 (engine grammar and
  schema, no UI): `docs/superpowers/plans/2026-05-31-cairn-components-01-grammar.md`. Plans 2 (admin guided
  form) and 3 (per-site migration, ecnordic then 907) are written just-in-time after each lands. Builds on
  the editor swap's `registerInsert` seam, now published.
- The dated-slug identity pass landed on `main` (commits `dd2a265..77d9bf2`), bumping the local
  version to `0.8.0` (published to npm). It gives dated concepts a split id/slug identity (id is the
  filename stem, slug is the date-stripped id), adds a per-concept `datePrefix` granularity knob,
  moves per-concept URL policy (`permalink`, `datePrefix`) into the admin-editable YAML site-config
  under an SSG model, and unifies public delivery behind a site-level `byPermalink` resolver one
  catch-all `[...path]` route serves. Green at close: `npm run check` 0/0 over `src/`, 315 tests exit
  0, `npm run check:package` clean. Three review subagents returned no blockers; four small findings
  were folded in. Design: `docs/superpowers/specs/2026-05-31-cairn-dated-slug-design.md`; plan and
  post-mortem: `docs/superpowers/plans/2026-05-31-cairn-dated-slug.md`. The pass ran directly on
  `main` (user-authorized), not a worktree. Not yet published to npm and not yet smoke-tested against
  a live Worker.
- Rebuild plans 00 through 08 landed earlier. The public content delivery layer landed too. It merged
  to `main` (merge `6080496`) and published as `0.7.0`, the `latest` tag on npm. The delivery layer is
  additive over the 0.6.0 admin and auth surfaces, so it shipped as a minor. Green at that merge:
  `npm run check` 0/0, 285 tests exit 0, `npm run check:package` passing. The publish ran through the
  OIDC trusted-publishing workflow off the `v0.7.0` GitHub Release.
- Both consumer sites (907-life, ecnordic-ski) still run `0.6.0`. They cut over to it, merged to
  their mains, deploy via CI, and passed a full live magic-link smoke. The dormant better-auth
  tables and AUTH_KV are deleted. Neither site has migrated onto the delivery surface yet.

## Worktree topology

- `~/Projects/cairn/cairn-cms` is the `main` checkout, canonical, and the only worktree. STATUS.md
  is canonical here.
- The two merged feature worktrees are gone. `cairn-public-delivery` (`feat/public-delivery`) was
  pruned at the 0.7.0 landing; `cairn-cms-rebuild` (`feat/rise-data-attr`) was removed and its branch
  deleted in the teardown pass (2026-05-30).
- Structural decision (settled): keep the `~/Projects/cairn` meta-workspace through the site
  co-evolution phase. The sites are about to migrate onto the `0.7.0` delivery surface, which is the
  strongest case for zero-publish symlink dev. Dissolving the workspace to standalone top-level
  repos is deferred until cairn-cms stabilizes after the scaffolder (Plan 10).
- Symlink dev is documented and proven, currently off. The runbook is
  `docs/runbooks/symlink-dev.md`. npm links a member only when its version satisfies the consumer's
  range, so the link engages per-site at first migration, when a site moves to `^0.7.0` (which also
  forces the `renderPreview`-to-`render` adapter rename and a deploy). The teardown pass proved the
  end-to-end link against 907-life and found two conditions the original plan missed, both now in the
  runbook: the local cairn-cms version must run a proper patch *ahead* of the published one (an exact
  `0.7.0 == registry 0.7.0` makes npm prefer the tarball; a prerelease like `0.7.1-dev` fails to
  satisfy `^0.7.0`), and the root `package-lock.json` must be deleted after the bump so npm
  re-resolves instead of honoring the stale registry pin. A member-local `node_modules` copy also
  shadows the link and must be removed. A root-level `npm install` was verified not to drift either
  site's committed lock, and standalone `npm ci` stayed green for both. See
  [[workspace-symlink-and-next-pass]].

## Open decisions and next steps

Do these in order.

0. Editor swap is merged, pushed, and published as `0.9.0` (`latest` on npm), `0.8.0` published earlier
   (done). The interactive browser smoke remains a fast-follow: live keyboard behavior in the showcase admin
   editor (typing, the focus ring, toolbar formatting, the palette insert, the preview toggle). Pushing
   cairn-cms `main` does not deploy a site (only the site repos deploy on push).
0a. Publishing: the registry carries `0.17.0` (`latest`, published 2026-06-02), which rolled the `0.15.0`
   (delivery robustness), `0.16.0` (auth hardening), and `0.17.0` (render safety) window into one release
   over the prior `0.14.0`. A migrating site can import `@glw907/cairn-cms/delivery` and pin `^0.17.0`.
   Breaking notes a consuming site must honor at the bump: the `MarkdownEditor` `preview` prop is gone
   (since `0.9.0`), `ComponentDef.build` is now `build(ctx)` (since `0.12.0`), and the adapter contract
   takes one `schema` member via `defineFields`/`defineAdapter` (since `0.13.0`).
1. Migrate each site onto the published delivery surface (`^0.17.0`), one per-site
   `site-pass`, from that site's own directory. Each imports from `@glw907/cairn-cms/delivery`, applies
   the `renderPreview`-to-`render` rename, builds the content layer with `siteDescriptors` +
   `createSiteIndex` (which now validates frontmatter at build), adopts the `responses.ts` feed/sitemap/
   robots helpers and the `<CairnHead>` SEO head, wires the catch-all `[...path]` route, sets its
   per-concept URL policy in the YAML (`907`: `datePrefix: day`, `/:year/:month/:day/:slug`; `ecnordic`:
   `datePrefix: month`, `/:year/:month/:slug`), and drops its hand-rolled `posts.ts`/`feed.ts`.
   `examples/showcase` is the complete working reference. **Gotcha to honor (from the delivery DX review):
   the build-time validation feeds `parseMarkdown` frontmatter to the site's `validate`, where an unquoted
   YAML `date:` is a JS `Date`, not a string. A hand-rolled `validate` that string-checks `date` must route
   it through `validateFields` or coerce it, or the build rejects valid dated posts.** Existing filenames and
   URLs are preserved with zero redirects. This is where the symlink engages
   (`docs/runbooks/symlink-dev.md`) and where the production deploys happen. The live `/admin` smoke
   for the dated create flow is best run here, against the real Worker.
2. The internal-link picker is the next editor pass (post-to-post linking via a `cairn:<concept>/<id>`
   token resolved at build). It builds directly on the new CodeMirror surface and the `registerInsert`
   seam, which is why the seam's two-way `value` flow was made correct in this pass.
3. Next cairn engine passes, each its own brainstorm-then-plan: a content-lifecycle pass (atomic
   Git Data API move primitive, delete, rename, internal-link rewriting; external redirects stay the
   site's job) and a settings-editor pass (the admin web UI to edit the YAML URL policy and other
   settings). Then the still-pending CairnExtension dispatch and the `create-cairn-site` scaffolder.
   Both deferred passes are scoped in the dated-slug design doc's future-work section.

Launch directory: start Claude inside the repo a pass targets (cairn-cms or a site), so that repo's
own `.claude/` hooks and per-project memory stay active. The workspace `CLAUDE.md` still loads as a
parent. Reserve `~/Projects/cairn` for cross-repo or workspace-config chores. The launch-directory
table also lives in `docs/runbooks/symlink-dev.md`.

The teardown pass settled the carried loose ends: the content-concepts design doc is committed as
history (`5c10058`), and the stale in-progress breadcrumb in `docs/PLAN.md` was discarded (its
outcome is in the functional spec).

## Carried follow-ups (latent, not bugs under current conventions)

- Delivery DX (mostly RESOLVED across schema Plan 2 and the delivery-robustness pass): the schema Plan 2
  cutover added skip-drafts at the `createSiteIndex` gate and validate-once storing `result.data` on the typed
  read, so the build-over-drafts and serve-raw-frontmatter items are closed. The delivery-robustness pass closed
  the rest: a validation-failed entry is excluded from the typed read (Task 1), `entryLoad` no longer attaches
  feed autodiscovery to undated Pages (Task 4), and the feed builders omit an absent or `Invalid Date` pubDate
  rather than emit it (Task 3). The remaining note is the build-validation date-shape gotcha (an unquoted YAML
  `date` arrives as a JS `Date`), recorded in the site-migration step above, since that is where a hand-rolled
  validator would meet it.
- Component registry (Plan 1, RESOLVED by Plan 2): the old palette rendered a no-op item for a def
  lacking `insertTemplate`. The Plan 2 dialog replaces the palette with a dual path (schema def opens
  the form, template-only inserts directly, a def with neither is omitted), so the no-op is gone.
- Component form (Plan 2): the live interactive `/admin` smoke against a real Worker (open the
  dialog, fill the form, insert into the editor) is unverified; the browser-layer component tests and
  the untouched auth/save flow make it a fast-follow, not a blocker. Repeatable items are bare strings
  keyed by index, so a mid-list removal reuses DOM nodes by position (values stay correct, focus
  identity does not follow an item); a stable per-item id is the fix once multi-field repeatable items
  arrive. Minor a11y polish left: the flat fields carry a redundant `aria-label` alongside their
  visible `<label>`, the per-item input label is generic rather than indexed, and `IconPicker` is an
  `aria-pressed` toggle group that could move to radiogroup semantics.
- Component grammar (latent, low likelihood for the planned sites): an attribute value with a literal
  newline is unsupported (single-line form fields make it unreachable); `validateComponent` parses the
  markdown twice (fine, validation is not hot). Multi-field repeatable items stay deferred by design, and
  `build()` reads the old heading convention until Plan 3 refactors each site to read slots.
- Dated slug: the admin create date-in-slug guard rejects any slug opening with `^\d{4}-` on a dated
  concept, broader than the `datePrefix` strip (a `day` concept strips only a full `YYYY-MM-DD-`). A
  post deliberately slugged `2026-recap` is refused with the "leave the date out" hint. Acceptable
  since the date is captured separately; revisit if a real title trips it.
- Public delivery: the feed date throw is RESOLVED (the robustness pass made `rfc822`/`iso` total, omitting an
  absent or unparseable date). Still latent: a dateless entry sorts last in a dated concept; `deriveExcerpt`/
  `wordCount` assume whitespace-delimited words (the deferred excerpt-CJK item); the permalink date parse
  accepts a shape-valid but impossible date (the other deferred item).
- Render hardening: `splitHead` dereferences a missing `<h2>`; `glyph` serializes `d="undefined"`
  for an unknown icon. Both inherited from legacy, unreachable under the sites' content.
- Auth hardening: RESOLVED by the 2026-06-02 pass (the `__Host-` cookie prefix, `/admin` security headers, the
  install-token in-isolate memo, the magic-link cooldown plus `waitUntil`, the lazy expired-row sweep, the https
  `requireOrigin` guard). Two latent items remain. The guard's own 303 login-redirect skips the security headers,
  since `throw redirect(...)` unwinds before the post-resolve header step (low impact: a bare redirect with a
  `Location` and `Set-Cookie`, and the `/admin/login` page itself does get the headers). The render-safety FAIL is the
  escalated security item, now the immediate next pass (see the top entry and `cairn-render-sanitize-gap`).

## Durable operational traps

- Both sites deploy on push to `main`. An editor SAVE commits content to `main` and triggers a
  redeploy, so a cutover must merge to `main` rather than run from an unmerged branch.
- The npm workspace root makes `npm install` from a member update the root lock, leaving the
  member's committed lock stale and failing CI `npm ci`. Relock standalone: temp-move the root
  `package.json` and lock, `rm -rf node_modules package-lock.json`, `npm install`, restore the
  root, commit the lock.
- npm 11 does not apply `publishConfig.exports` on pack, so `exports` point at `dist/` always with
  a `prepare` build.
- `npm run check` exits non-zero locally on the showcase `svelte.config.js` (it imports
  `@sveltejs/adapter-node`) unless the showcase deps are installed (`cd examples/showcase &&
  npm install`). CI checks out cairn-cms standalone and stays green. The svelte-check scan itself
  is 0 errors 0 warnings either way.
- Durable cross-cutting gotchas are the focused `cairn-*` memories (email send vs routing, the
  GitHub App PKCS#1 to PKCS#8 wrap, DaisyUI v5 form classes, carta-md NodeNext typing, the
  subagent model assignment, prose-guard tiers, dispatch discipline, the code-simplifier rule).
