# Pass D Task 9: mining sweep folds

Every finding from the three mining reports
([admin](./2026-08-14-pass-d-mining-admin.md), [editors](./2026-08-14-pass-d-mining-editors.md),
[extend](./2026-08-14-pass-d-mining-extend.md)), with its disposition: folded and where, declined
and why, or filed to `ROADMAP.md`. Every fold was re-verified against the current source tree
before writing, not accepted on the sweeper's citation alone (three findings turned out to need a
correction from what the sweeper described; each is noted below). This document is the evidence
that nothing true was lost when the old corpus is deleted.

## The five required fixes (verified independently, ahead of the sweep)

1. **`docs/extend/build-a-site-by-hand.md`** now carries `ssr: { noExternal: ['@glw907/cairn-cms']
   }`, the `cairnManifest()` Vite plugin wired with the `cairn-manifest` regenerate command, and
   the warning that `__CAIRN_DEV_BUILD__` must be named directly at each call site rather than
   through a shared constant. Confirmed against `examples/showcase/vite.config.ts` and
   `docs/reference/vite.md`. This also satisfies extend finds 1 through 3 (below).
2. **The `SiteRender` two-argument bug** in `docs/extend/wire-the-delivery-surface.md:156` and
   `docs/reference/delivery-data.md:273` is fixed; both now call
   `cairn.rendering.render({ body, resolve })`, matching `src/lib/content/types.ts:215`. Swept the
   whole corpus (`grep -rn "rendering.render("`) for other instances: none found. The other five
   call sites in `examples/showcase/` and the old `docs/guides/` copy were already correct.
3. **Three false claims corrected:**
   - `docs/editors/publish-and-history.md`: history is capped at the 25 most recent publishes and
     restarts at a rename, replacing "every publish is kept." Verified against
     `content-routes-core.ts:1113` (`HISTORY_LIMIT = 25`) and `CairnHistory.svelte:87`.
   - `docs/admin/troubleshooting.md`: rewrote the "nobody can sign in" section. The ordinary "check
     your inbox" send is non-enumerating, but the throttled and send-failure messages both only
     ever show for an address already on the roster; verified against `auth-routes.ts:120-124` and
     `LoginPage.svelte:95-102`.
   - `docs/admin/troubleshooting.md`: named `publish.failed` alongside `commit.failed`, and added
     the Publish site button's disappearance as `github.unreachable`, not a failed publish.
     Verified against `content-routes-core.ts:1505,1600,584` and `CairnAdminShell.svelte:644-648`.
4. **The planned `design-your-site.md` merge.** Folded the missing real-content local-iteration
   loop (seed media once with `cairn-media-seed`, `vite dev`, the make-change/watch/decide loop,
   ship once) into `docs/extend/design-your-site.md`'s "Local iteration" section. Repointed both
   references in `docs/reference/cli-cairn-media-seed.md` from the doomed
   `guides/iterate-your-design-locally.md` to the new section.
5. **Three references outside `docs/` into the doomed arms, repointed:**
   - `examples/cairn-theme/README.md:9` -> `docs/extend/design-your-site.md`.
   - `src/lib/sveltekit/admin-action.ts:202` (a code comment) -> `docs/extend/add-a-custom-admin-
     screen.md`.
   - `src/lib/diagnostics/conditions.ts` -> see below; this one needed more than a comment fix.

   **A bigger finding than the three-file list described.** `conditions.ts:23`'s doc comment was
   only the visible tip: every one of the 20 `docsAnchor` values in that file's condition registry
   is a literal string `'cloudflare-readiness.md#<heading-slug>'`, and `check:readiness`
   (`scripts/checks/check-readiness.mjs`) hardcodes `DOC = 'docs/guides/cloudflare-readiness.md'`.
   Neither is caught by `check:docs`, since one lives in a `.ts` file's string literals and the
   other in a build script, and `check:readiness` isn't in this task's required gate list. Left
   as-is, the cutover would delete the file `check:readiness` reads, and the gate would crash
   (`ENOENT`) or, worse, silently pass against a stale copy if one were kept around. I traced it
   fully rather than patching only the comment: `docs/admin/is-it-working.md` (Pass D's new home
   for this checklist) carries a heading with identical text and slug for every one of the 20
   anchors (verified by diffing `grep '^## '` on both files), and the gate's anchor check only
   ever reads the part of `docsAnchor` after `#`, never the file-name prefix, so retargeting was a
   pure rename with no behavior change today. Migrated `conditions.ts`'s doc comment and all 20
   `docsAnchor` values to `is-it-working.md#...`, and `check-readiness.mjs`'s `DOC` constant to
   `docs/admin/is-it-working.md`. Re-ran `npm run package && node scripts/checks/check-readiness.mjs`
   after: `check-readiness: OK (21 conditions anchored in docs/admin/is-it-working.md)`.

   **A larger set of references this pass did not touch, reported here because the cutover task's
   gate bill needs to know about it.** `grep -rn "docs/guides/\|docs/tutorial/\|docs/explanation/"`
   over `src/` and `examples/` (excluding `docs/` itself) turns up roughly 15 more hits beyond the
   three named in this task, concentrated in `examples/showcase/`:
   - `examples/showcase/src/app.d.ts`, `cairn.config.ts`, and six files under `src/members/` and
     `src/routes/members/` (plus `src/routes/test/last-otp/+server.ts`, `revoke-member-session/
     +server.ts`) carry code comments citing `docs/guides/add-a-login-channel.md` by name and
     section (its "Prove your channel" and "Remove a member" sections), and `examples/showcase/
     e2e/members.spec.ts` cites the same guide.
   - `examples/showcase/README.md:3` links `docs/tutorial/build-your-first-cairn-site.md`.
     Confirmed `check:docs`'s scope (`scripts/checks/docs-links.mjs`'s `filesInScope`) walks
     `docs/` plus five named root files (`README.md`, `SECURITY.md`, `ROADMAP.md`,
     `CHANGELOG.md`, `CONTRIBUTING.md`); `examples/showcase/README.md` is not in that list, so
     this dead link goes uncaught.
   - Three `src/tests/unit/` test files (`check-package-files.test.ts`, `auth-channel-guide-
     ddl.test.ts`, `docs-links.test.ts`) **literally read the contents of old guide files**
     (`docs/guides/add-a-login-channel.md`, `docs/guides/upgrade-cairn.md`, `docs/guides/README.md`,
     `docs/explanation/README.md`, `docs/explanation/why-cairn.md`,
     `docs/tutorial/build-your-first-cairn-site.md`) with `readFileSync`. These will hard-fail
     `npm test` the moment the cutover deletes those files, not just go stale.
   - `src/tests/unit/github-slug-contract.test.ts` carries `source: 'docs/tutorial/...'` provenance
     labels on inline literals (already flagged by the extend sweeper as cosmetic, not a test
     failure).

   None of these were in scope for this task's fold-and-repoint list, and fixing the test files in
   particular is real engineering work (rewrite or delete assertions that depend on file contents
   about to disappear), not a docs repoint. Flagging in full here so the cutover task sizes its
   gate bill correctly instead of discovering this mid-deletion.

## Admin report

| # | Disposition |
| --- | --- |
| 1 | **Folded** into `docs/admin/troubleshooting.md`, "Nobody can sign in" (also required fix 3b). |
| 2 | **Folded** into `docs/admin/troubleshooting.md`, "A save or publish reports a conflict" (also required fix 3c). |
| 3 | **Folded** into `docs/admin/is-it-working.md`, "Probe the deployed admin" (the `--probe`/`--send-test` opt-in note). |
| 4 | **Folded** into `docs/admin/is-it-working.md`'s intro (the skip-means-no-credential note, generalized from the one existing CSRF-check example). |
| 5 | **Folded** into `docs/admin/is-it-working.md`, "Deploy the Worker with its bindings" (the shared `config.bindings-missing` id note). |
| 6 | **Folded**, the `bindings` reason only, into `docs/admin/troubleshooting.md`, "A form gets refused." `dev_backend_in_prod`, cited in the same find's code proof, is not folded: the report's own "Adjacent observations" section states it is not a mining loss (it wasn't in the old corpus either, since there's no page for a bare 503 with no branded response), so it stays out of scope for a deletion-loss fold. |
| Cross-track: `.dev.vars` + `/healthz` | **Partially folded.** The `.dev.vars` fact folded into `docs/extend/rotate-the-github-app-key.md` (shared with extend find 14). The `/healthz`-versus-real-save comparison declined: the new page's step 5 already frames the real save as the stronger proof; adding the `/healthz` self-test as a second, weaker check would be a marginal addition against a page that already teaches the same lesson better. |
| Cross-track: Workers Builds has no D1 migration equivalent | **Folded** into `docs/extend/upgrade-cairn.md` step 3. |
| Adjacent observation: registrable-domain suffix bug (`.co.uk`) | **Declined**, not a mining loss (found while verifying, not from the old corpus). Recorded here for the record; a UK admin hitting a doctor zone-lookup failure with no explanation is a real gap, but it's new information, not something the deletion would lose. |
| Adjacent observation: `dev_backend_in_prod` bare 503 | **Declined**, same reason. |
| "Checked and declined" (~20 items across four categories: survives in reference/extend, said differently but equivalently, out of scope for the admin audience, vendor facts better linked, old-page-is-wrong) | **All declined**, on the sweeper's own reasoning in that section. Each was checked against the admin track's vocabulary contract (no engine-internal names) or against `docs/reference/` and `docs/extend/` already carrying the fact; none needed independent re-verification since the sweeper's own citations were sufficient and none of them proposed a doc change. |

## Editors report

| # | Disposition |
| --- | --- |
| 1 | **Folded** into `docs/editors/add-an-image.md`, new "Setting an entry's lead picture" section, cross-linked from `write-in-the-editor.md`. |
| 2 | **Folded** into `docs/editors/when-something-goes-wrong.md`, "A save or publish is refused" (the fragment-nesting refusal, quoted verbatim). |
| 3 | **Folded** into `docs/editors/publish-and-history.md` (also required fix 3a). |
| 4 | **Folded** into `docs/editors/publish-and-history.md`, "Getting an earlier version back" (the schema-drift revert warning). |
| 5 | **Folded** into `docs/editors/manage-the-media-library.md`, new "Deleting several images at once" section. |
| 6 | **Folded**, twice: the too-long-to-tidy message quoted in `when-something-goes-wrong.md`, and the same limit named (without the exact character count, which is extend-register detail) in `write-in-the-editor.md`'s Tidy paragraph. |
| 7 | **Folded** into `docs/editors/when-something-goes-wrong.md`, "A save or publish is refused" (the unpublished-link save notice, quoted verbatim). |
| 8 | **Folded** into `docs/editors/write-in-the-editor.md`, "Layout blocks" (blocks open folded). |
| 9 | **Folded** into `docs/editors/write-in-the-editor.md`, "The screen" (the preview width control). |
| 10 | **Folded** into `docs/editors/write-in-the-editor.md`, "Images" (decorative marking doesn't persist on a body image). |
| 11 | **Folded** into `docs/editors/write-in-the-editor.md`, "Spelling and style" (the amber underline's three mechanical checks). |
| 12 | **Folded** into `docs/editors/write-in-the-editor.md`, "The screen" (paste keeps formatting). |
| 13 | **Folded** into `docs/editors/write-in-the-editor.md`'s Tidy paragraph, and into `when-something-goes-wrong.md`'s new "Using Tidy" section (the Tidy-button-vanishing message, find 14, rides the same new section). |
| 14 | **Folded** as part of 13's section, since it's the natural sibling to the too-long refusal and costs one short paragraph. This is the one item promoted out of the sweeper's own "marginal" 14-19 range; everything else in that range stayed declined. |
| 15, 16 | **Declined.** Footnotes and escaping are real and undocumented, but the sweeper flagged both as absent from the in-editor cheat sheet too, meaning the fix is arguably an app change (add them to the cheat sheet), not just a docs fold, and the sweeper ranked both below the fold line. Left declined per the sweeper's own ranking; worth a look if an editor asks. |
| 17 | **Declined**, marginal per the sweeper ("both self-explanatory"). |
| 18 | **Declined**, marginal reassurance rather than a control, per the sweeper. |
| 19 | **Declined**, marginal per the sweeper (the unsaved-changes warning and the command palette are both minor, and the palette is already in the in-app shortcuts sheet). |
| "Checked and declined" (wrong-old-page, out-of-register, already-covered, too-small categories) | **All declined**, on the sweeper's own reasoning. Two are worth flagging explicitly: the old page's media-delete-is-recoverable claim and the "your unsaved typing isn't kept" claim are both **code-contradicted**, and the new pages already state the correct behavior; folding the old claims would have reintroduced a defect, not fixed a gap. |

## Extend report

### Tier 1 (the three required fixes)

Folds 1 through 3 all landed as part of required fix 1 above (`build-a-site-by-hand.md`).

### Tier 2

| # | Disposition |
| --- | --- |
| 4 | **Folded** into `docs/extend/add-a-second-audience.md` (the separate `migrations_dir` warning and the exact-copy instruction), and `docs/reference/auth-channel.md:181` repointed away from the doomed guide. |
| 5 | **Folded** into `docs/extend/enable-tidy.md`, new "What Tidy can't do to a document" section (the structural backstop guarantee). |
| 6 | **Folded** into `docs/extend/restrict-admin-access.md` (the media-picker landmine). |
| 7 | **Folded** into `docs/extend/link-content-with-references.md`, new "What blocks and what only warns" section. |
| 8 | **Folded** into `docs/extend/security-model.md`, "Sign-in: magic links, not passwords" (the enumeration posture and the throttled exception). |
| 9 | **Folded** into `docs/extend/auth-channel-security-model.md`, new "The dev transport is not a dev-only risk" section. |
| 10 | **Folded** into `docs/extend/announce-on-publish.md`, new "Deleting and recreating an entry reads as new too" section. Narrowed from the sweeper's framing: I could fully verify the delete-then-recreate case against `stampFirstPublish`'s actual gate condition (`prior?.publishedAt` short-circuits before the draft check ever runs), but not the sweeper's specific "hide-then-republish of a years-old entry" scenario as stated, since an entry that already carries a `publishedAt` stamp keeps that stamp regardless of `draft` on the next publish; only a row with no stamp at all re-stamps. Folded the general, verified rule instead of the more specific, unverified one. |
| 11 | **Folded** into `docs/reference/core.md`'s `defineConcept` section (the default permalink and `datePrefix` values). |
| 12 | **Folded** into `docs/extend/content-model.md`, "An entry's id is its filename" (the date-never-re-derived-from-filename fact). |
| 13 | **Folded** into `docs/reference/cloudflare.md`'s `verifyTurnstile` entry (the parameter-order warning). |
| 14 | **Folded** into `docs/extend/rotate-the-github-app-key.md` (the `.dev.vars` note in step 3, and the pre-deletion rollback in "If something goes wrong"). |
| 15 | **Folded** into `docs/extend/add-a-second-audience.md`, alongside find 4 (the `createChannelDb`/Node 22.13 floor note). Declined the sweeper's proposed link target (`../reference/auth-channel.md`): that page documents `@glw907/cairn-cms`, not `@glw907/cairn-cms-dev`, which the sweeper itself notes has no reference page; linking there would have been a broken anchor. Named the function in code font with no link instead. |
| 16 | **Folded** into `docs/extend/enable-tidy.md`, new "What a run costs and refuses" section (the character cap, the key-health cache TTL, the local dev stub). |
| 17 | **Folded** into `docs/extend/add-cairn-to-a-sveltekit-app.md`, "Install the App on your content repository" (the repository-wide-permission warning). |
| 18 | **Folded** into `docs/extend/migrate-existing-content.md`: the `datePrefix`-mismatch digit leak as a worked example, the id-shape warning under "Choose the filename," and a new "Bringing in media" section. |

### Tier 3 (marginal, declined per the sweeper's own "I would not block cutover on any of them")

| # | Disposition |
| --- | --- |
| 19 | **Declined.** Already documented at `docs/reference/sveltekit.md:991`, which survives; the sweeper flagged it only because `extend/architecture.md`'s prose reads slightly ambiguous, a wording nit rather than a lost fact. |
| 20 | **Declined.** The behavior is already stated in `extend/security-model.md`; only the dynamic-segment rationale is gone, and it's genuinely a low-blast-radius edge case. |
| 21 | **Declined.** Real, but a genuine edge case (pruning a role vocabulary) with no reported friction. |
| 22 | **Declined.** The `parseSiteConfig`-placement practice already survives in `what-the-scaffold-wrote.md`; only the "ships the whole adapter to every visitor" rationale is gone, and the new hand-build page's choice to keep it simple reads as a considered simplification, not an oversight. |
| 23 | **Declined.** A register decision (the new nav page is deliberately mechanics-only, per the extend track's own "does the page state the contract... rather than narrating implementation" counterpart question), not a fact gap. |
| 24 | **Declined.** `reference/core.md` already documents the adjacent container-nesting throws; this is one more sentence in an already-thorough section, and the sweeper ranked it lowest. |

### The "whole new page" candidates

1. **The markdown-versus-WYSIWYG case and the tool-by-tool competitor comparison.** **Filed to
   `ROADMAP.md`** under "Considering," per the task's instruction. Page-shaped, and whether it
   belongs at all is a front-door register question (`why-cairn.md`'s scope), not something this
   pass should decide unilaterally.
2. **The real-content local-iteration loop.** This was not filed to `ROADMAP.md`; it's required
   fix 4 above, fixed directly rather than deferred, since the task named it as one of the five
   things to fix first.
3. **The `make-waymark-your-own.md` worked re-skin example.** Handled minimally: repointed
   `examples/cairn-theme/README.md`'s link (required fix 5) to `docs/extend/design-your-site.md`,
   which already carries the general re-skin recipe and mechanics. Did not restore the specific
   worked example (the Fraunces swap, the `data-flourish` gestures, the leading-`@import`
   ordering rule, the "a serif reads legible one type-scale step lower" lesson): the sweeper
   itself called this "one subsection... not a page," and design-your-site.md's existing
   "re-skin recipe" section already covers the general mechanism this worked example would
   illustrate. Declined as marginal against an already-adequate page.

### Cutover hygiene (not content-loss findings)

- **134 references into the doomed arms inside `docs/`.** These are `check:docs`'s job; not
  re-verified individually here since that gate will catch every markdown-link case at the
  cutover task's own gate run.
- **The three (now expanded to ~18, see above) references outside `docs/`.** Covered in the
  "required fixes" section above.
- **`src/tests/unit/github-slug-contract.test.ts`'s stale provenance labels.** Not fixed (cosmetic,
  doesn't fail); flagged for whoever does the cutover to fix in the same pass, since they'll
  already be touching that test file's neighbors.

### Unverified findings from the sweep (not folded, per the sweeper's own caution)

Three items the extend sweeper could not ground in current source stay unfolded, on the sweeper's
own recommendation: the foreign-key migration-ordering caveat (no `REFERENCES` clause exists in
any shipped migration to apply it to), the kit#12533 `curl` status-200 caveat (couldn't match to
the current streamed pending-count load), and the D1 read-replication caveat for a channel
database (inference from the audit-sink case, not independently verified). None are folded, and
none should be, until someone verifies them against source the way every other fold in this
document was.
