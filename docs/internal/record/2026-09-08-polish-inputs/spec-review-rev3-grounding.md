# Polish spec review, grounding lens

Adversarial review of `docs/superpowers/specs/2026-09-08-polish-passes-design.md` revision 3, read as it stands in the working tree (Opus, fresh context, 2026-09-08). Every `file:line`, symbol, path, count, gate name, ruling-row name, and sequencing claim was checked against `main` at `e726f1cb` and against the uncommitted working tree where the spec depends on it. Revision 2's grounding findings mostly folded correctly, so most of what follows is new ground the amendment opened: the docs-pass dissolution, the front-door substrate, the ledger-annotation task, and the collision surface of the chassis-B2 pass that is executing right now. Twenty findings, ranked by how far each would send a plan author wrong.

---

## Ranked findings

**1. Spec:361-363 (polish-C Task 9) -- "seventeen rows the charter review enumerates" undercounts the ledger by roughly nine rows, and it undercounts in exactly the class the task exists to protect.**
Claim: "Every ruling row whose subject this window renames annotated with the new name and 'verdict unchanged' (seventeen rows the charter review enumerates)."
Evidence: the charter review's finding 4 (`spec-review-charter-polish-passes.md`) does enumerate seventeen, and they are all real rows, but its list covers only renamed **types and functions**. Consumer line 9 renames log event **strings**, and the ledger carries one row per event: `audit-log-preview-rejected` (`engine-rulings.md:4658`), `audit-log-guard-rejected` (`:4651`), `audit-log-admin-action-csrf-rejected` (`:4445`), `audit-log-auth-access-denied` (`:4569`), `audit-log-media-delete-blocked` (`:4299`), `audit-log-media-replace-blocked` (`:4292`), `audit-log-admin-action-sink-threw` (`:4516`), `audit-log-audit-sink-write-failed` (`:4599`), and `audit-log-auth-channel-session-created` (`:4120`, the four-segment name the header clause is written for). None is in the seventeen. `audit-log-taxonomy-unmarked-field` (`:4322`) is handled separately at Task 6, which proves the class was visible.
Correction: state the population as "every ruling row whose subject this window renames, types, functions, and log event names alike", and let the gated grep derive the count rather than pinning seventeen. A plan author who annotates seventeen rows ships a ledger with about nine rows naming dead event names, which is the failure Task 9 exists to prevent.

**2. Spec:143-147 (polish-A Task 1) -- the "Reload" sweep breaks `check:editor-quotes`, and the spec routes the only fix that keeps it green to the rewrite.**
Claim: the two entry refusals lose "Reload" "with the ten sibling `Reload and` strings ... swept in the same commit and their three test files updated"; separately, "every prose fix the docs sweep found" defers to the rewrite (`:254`).
Evidence: `scripts/checks/check-editor-quotes.mjs` extracts every bolded double-quoted sentence from `docs/editors/when-something-goes-wrong.md` and fails unless every literal segment is grounded in a shipped `src/lib` string. That page quotes the swept strings verbatim at `:34` ("This file changed since you opened it. Reload and reapply your edits."), `:39` ("Your edits are saved. Reload and publish again."), `:105` (`refusal-codes.ts:23`), and `:119` (`CairnHistory.svelte:56`). `check:editor-quotes` is in polish-A's per-task gate (`:219`). Task 1 therefore cannot go green without editing that editors page, and the spec never routes the edit; D11's docs half is banked for the rewrite (`:256`).
Correction: name the editors-page edit as part of Task 1 and carve it out of the defer-to-the-rewrite rule (it is a gate dependency, not a prose improvement), or drop the string sweep from polish-A entirely. This is a hard stop on the pass's first task, not a review nit.

**3. Spec:194 (polish-A Task 12) vs the chassis-B2 plan -- B2, executing now, deliberately preserves the shape polish-A Task 12 removes, and anchor re-verification cannot detect it.**
Claim: Task 12 adopts `createSectionAction` on the showcase signups route; sequencing says every `file:line` is "re-verified against post-merge `main`" (`:399-401`).
Evidence: `docs/superpowers/plans/2026-09-07-chassis-b2-pass.md:258-268`, Task 6, modifies `src/routes/admin/signups/+page.server.ts` and states the constraint in its own Files block: "the raw `requireOwner` shape and its comment kept". The comment it preserves, `examples/showcase/src/routes/admin/signups/+page.server.ts:26-28`, reads "The raw requireOwner/formData/fail shape is kept **deliberately**: this route has no audit requirement." Its acceptance also pins "the two custom-screen tests (five assertions) green unchanged" and "`signups-*` baselines unchanged".
Correction: anchor reconciliation moves line numbers; it does not detect a decision landed against you. Polish-A Task 12 must name and overrule B2's kept-deliberately comment, and the plan's Reconciliation block needs a semantic column (which B2 rulings this pass overturns), not only a `file:line` column. Same class applies to Task 5's `segmentTintClass` work if B2 Task 5's "CSS conformance" reaches `cairn-admin.css` (its plan cites the file at `:268`).

**4. Spec:22-23 (Inputs) and :209-210 (Task 16) -- "the friction log (one open entry, owned by the identity seam)" is false; the log has zero open entries, and B2 triages it again first.**
Evidence: `docs/internal/docs-friction-log.md` "Live findings" reads "None open." and "Open findings" reads "None open." The 2026-09-07 `extender` entry revision 2 inherited was cleared. Independently, `2026-09-07-chassis-b2-pass.md:311` lists `docs/internal/docs-friction-log.md` (whole-log triage) in Task 8's Modify set, so B2 triages it before polish-A branches.
Correction: drop the "one open entry" input line, and reduce Task 16's "the friction log triaged whole" to "re-read and confirmed empty, or triage whatever B2 filed". As written the spec funds a task with no work and claims an input that does not exist.

**5. Spec:401-404 (Sequencing) -- "Polish-A owns every shared ledger file in this window ... It contends with no other pass" is not true of the pass in flight.**
Evidence: `2026-09-07-chassis-b2-pass.md:303-313`, Task 8, modifies `ROADMAP.md` ("the chassis improvement round leaves the tier; **polish's inputs by name**"), `CHANGELOG.md` (`## Unreleased`), `docs/STATUS.md`, `docs/internal/docs-friction-log.md`, `docs/extend/migration-notes.md`, and `docs/internal/engine-rulings.md` "only if a task produced a ruling".
Correction: the ownership claim is true only after B2 merges, which the spec does say elsewhere; but the ROADMAP edit specifically rewrites "polish's inputs by name", which is the source the spec's own eighteen-row dispositions table (`:99-118`) derives from. Add a reconciliation step for the dispositions table against post-B2 `ROADMAP.md`, not only for `file:line` anchors.

**6. Spec:207-208 (Task 16) vs :403 (Sequencing) -- the spec tells the same pass both to write STATUS in a task and never to write it in a task.**
Claim (Task 16): "the CHANGELOG bullet appended; the HISTORY entry; **STATUS present tense**."
Claim (Sequencing): "the conductor edits `docs/STATUS.md` at merge, **never a task**."
Correction: pick one. The Sequencing form is the one that matches the conductor rule; strike STATUS from Task 16's deliverable list.

**7. Spec:144-146 (Task 1) -- "the ten sibling `Reload and` strings" across the five named files is eight, and the two it misses are in the file the sentence excludes.**
Evidence: `CairnHistory.svelte:56`, `refusal-codes.ts:23`, `nav-routes.ts:128` and `:155`, `content-routes-settings.ts:156` and `:403`, `content-routes-media.ts:372` and `:378` = eight. The remaining two "Reload and try again" strings are `content-routes-entry.ts:1266` and `:1481`, both inside the destructive cluster this same task moves, and neither is one of the two conflict refusals the spec names at `:922`/`:1013`.
Correction: eight siblings across the five files, plus two more in `content-routes-entry.ts` itself. As written a plan author sweeps eight, believes the count is ten, and leaves two live.

**8. Spec:258-260 -- the cross-reference to the docs standard spec attributes a mechanism that spec does not carry, and the docs spec on disk still assumes polish-B runs.**
Claim: "The toolset pass 2a's preflight re-resolves every number and records which of them the docs pass had already applied as an edit."
Evidence: `docs/superpowers/specs/2026-09-08-docs-standard-design.md` mentions a preflight three times (`:773`, `:872`, `:1153`), none of them about the D/F numbers. The re-resolution mechanism it does carry is `check:ledger` (`:966`), which re-resolves `read` entries' `file:line`, not sweep findings. Worse, `:1099-1102` reads, unamended and committed: "**Polish-B folds here except its code half.** Tasks 2, 8, and 9 and the `check:reference` change in task 5 stay in polish-B, which merges before the harvest branches." Revision 3 dissolves polish-B. `:1094-1096` likewise still speaks of "Polish-D's substrate commit and its figure and form tasks stay where they are", i.e. inside a pass.
Correction: the two specs are now out of sync, and only the polish spec was amended. Either amend the docs spec's `:1094-1102` in the same act, or state in the polish spec that the docs spec's polish-B and polish-D paragraphs are superseded by this revision and name the lines. The A29 half is also unilateral: the docs spec's banked set is "D1 through D30 and F7 through F10", with no A number.

**9. Spec:153-154 (Task 2) -- "`VocabularyAdmin.svelte`'s three 'posts' strings" is about ten, and the three the sweep named are not the ones D12 calls the defect.**
Evidence: `src/lib/components/VocabularyAdmin.svelte` carries user-facing "post"/"posts" at `:162`, `:220`, `:223`, `:244`, `:278`, `:286`, `:300`, `:301`, `:330`, and `:347`. D12's stated harm is "a count that disagrees with the word"; the count labels are `:278`, `:286`, `:300`, `:301`, and `:347`, none of which is in the sweep's `:162,220,244`.
Correction: enumerate by grep at plan authoring. Fixing three of ten leaves the exact defect D12 describes.

**10. Spec:413-415 and Risks:432 -- "365 in-tree files" is uncited and reproduces from nothing in the repo.**
Evidence: the number appears in this spec and in `docs-standard-design.md:863`, each citing the other's initiative, with no measurement behind either. Measured here over `git ls-files` for the twenty-five identifiers the window renames or removes: **464** tracked files match; **267** excluding `docs/superpowers/` and `docs/internal/record/`, which are write-once archives no rename sweep should touch. 365 matches neither.
Correction: either state the measurement that produced 365 or replace it with the two real numbers. A plan author sizing Task 10's grep sweep against 365 is sizing against a figure with no source.

**11. Spec:132-138 (Task 1) -- the four line ranges cover 424 to 1616 of a 1630-line file, and five of the named helpers sit outside every range given.**
Evidence: `content-routes-entry.ts` is 1630 lines. `DeleteRefusal` is at `:222`, `BUILTIN_FRONTMATTER_KEYS` at `:279`, `revertSchemaDrift` at `:287`, `draftFromBranchHead` at `:357`, `saveRefusal` at `:416` -- all in an unallocated module-level prelude (1 to 423) that the spec's four ranges never mention. Line 1488 also falls between "1170 to 1487" and "1489 to 1616".
Correction: say plainly that the ranges are the cluster **bodies** and that a module-level prelude at 1 to 423 is partitioned by the named helpers, or the implementer will cut on line numbers and strand the prelude. (The cluster memberships themselves are right: `revertSchemaDrift`'s only call is `:1555`, `BUILTIN_FRONTMATTER_KEYS`'s only use is `:293` inside it, and `draftFromBranchHead` is genuinely shared at `:739` and `:1501`.)

**12. Spec:332 (polish-C Task 1) -- "This task runs the component suite" adds nothing the gate does not already run.**
Evidence: `package.json` `test` = `vitest run --project unit --project unit-dist-spawn --project integration && npm run test:component`. The component suite is unconditionally part of `npm test`.
Correction: either the sentence is redundant, or polish-C's gate paragraph (`:373-375`) means something narrower than "the full engine gate" and should say what it omits. As written a plan author cannot tell whether polish-C's other nine tasks run the component suite. The same ambiguity hides Task 7's real dependency, which is `src/tests/unit/admin-sheet-inventory.test.ts` (a **unit** test, not a component one, despite the spec's Task 1 framing).

**13. Spec:216-220 -- polish-A's per-task gate omits `check:rulings-format`, and Task 16 writes two ruling rows.**
Evidence: `check:rulings-format` exists (`package.json`), and the charter review already established that a non-keep row needs the full `Verdict`/`Reopens on`/`Shape`/`Record`/`Verified` block that the gate enforces. Task 16 writes the busy-idiom and `formatTimestamp` rows; Task 15 supersedes a closed row. Polish-C's Task 9 has the same exposure under "the full engine gate".
Correction: add `check:rulings-format` to polish-A's enumerated gate.

**14. Spec:186-190 (Task 11) and :192 (Task 12) -- "the same `access` and roles declaration the site hands `createAuthGuard`" and "the shared access map" describe showcase surface that does not exist.**
Evidence: `AuthGuardOptions` does carry `access?: AccessMap` and `roles?: RolesDeclaration` (`src/lib/sveltekit/guard.ts:39,48`) and the guard does attach `event.locals.cairnAccess = access ?? {}` (`:348`, `:368`), so the engine half is right. But `examples/showcase/src/hooks.server.ts:33` calls `createAuthGuard()` with no arguments, and `defineAccess` appears nowhere under `examples/showcase/src`. There is no declaration to share.
Correction: state that Task 11 also authors the showcase's first `access` declaration. That is new exemplar surface a scaffolded site copies, which is a different-sized task from wiring an existing one through.

**15. Spec:252-253 -- "The doctor-transcript re-record (D5, D6, D10, D27)" mis-groups two of the four.**
Evidence: D5 (`is-it-working.md:42`, the stale `FAIL Zone HSTS` line) and D27 (`:53-58`, the staleness apology) are transcript work. D6 is `troubleshooting.md:14` naming a condition id the doctor never prints, a prose fix in a different file. D10 is `is-it-working.md:353` versus `:149-152`, a missing router jump-list row, which is why the docs sweep flagged `check:readiness` as the gate that does not catch it.
Correction: name D5 and D27 as the re-record and D6 and D10 as separate deferred items, or the rewrite's admin stage will treat two independent defects as fixed by re-running a fixture.

**16. Spec:255-257 vs :381-390 -- the blanket "findings 1 through 30" double-routes four D numbers the spec disposes elsewhere.**
Evidence: D11 and D12's engine halves are polish-A Tasks 1 and 2 (`:249-250`); D16's placement is done at the substrate commit (`:388`); D21 goes to stage five (`:389-390`); D1 becomes a ledger entry corrected in the rewrite's admin stage (`:85-86`). All four are nonetheless inside "docs-sweep.md's findings 1 through 30".
Correction: bank "findings 1 through 30 except D16, whose page moves rather than changing", and say for D11, D12, D21, and D1 that only the docs half is banked. As written the carry list cannot be checked empty, because four numbers appear in two places with different fates.

**17. Spec:212-214 -- Tasks 6 and 7 are both inside the independent block while the spec states 6 must precede 7.**
Claim: "the plan marks 3 through 10 and 13 through 15 independent of the splits"; Task 6 is "A doc-only task, **ahead of the convergence**, so the rule exists before the code matches it" (`:170`), and the convergence is Task 7.
Correction: the independence marking is against the splits, but `pass-execute`'s parallel mode reads the marked block as internally parallel. Exclude Task 6 to 7 from the parallel set explicitly, or say the block is independent of the splits and internally ordered.

**18. Spec:323 (consumer line 9) -- "the four outliers renamed" is not a determinate set.**
Evidence: F11 names six event strings outside the two-verb vocabulary: `preview.rejected`, `guard.rejected`, `admin.action.csrf_rejected` (three `rejected`), `auth.access.denied` (one `denied`), `media.delete_blocked` and `media.replace_blocked` (two `blocked`). The sweep's own prose says "rename the four outliers" while enumerating six. The spec inherits the number without resolving it.
Correction: enumerate the renames in the spec's own table, since this is the `Consumers must:` list and the count is the promise.

**19. Spec:151-152 (Task 2) -- "the two reference pages naming `MediaDeleteRefusal`" misses a third in-tree naming site the rename must sweep.**
Evidence: `docs/reference/components.md:233` and `docs/reference/sveltekit.md:213` are the two pages, correctly. `src/lib/components/CairnMediaLibrary.svelte:29` also names `MediaDeleteRefusal` in its `@component` doc block, which no reference-page count reaches.
Correction: two reference pages plus one component doc block.

**20. Spec:15-19 (Numbering) -- "the identity seam is 10" has no basis in either ledger, and STATUS does not treat it as an audit-remediation slice at all.**
Evidence: "STATUS stops at slice 7" is true (`docs/STATUS.md`, Parallel tracks: "Slices 1, 2a, 2b, 3, 4a, 4b, 5, 6, 7 ... chassis-A, and chassis-B1 MERGED"), and "HISTORY numbers chassis-A as 8" is true (`docs/HISTORY.md:88`, "Chassis-A (audit remediation slice 8, structural)"). But STATUS lists the identity seam under "Immediate next action" as one of three independent live tracks, never inside the audit-remediation slice sequence, and nothing numbers it. Slotting it as slice 10 folds a separate initiative into the audit ledger by fiat.
Correction: say the spec is proposing the number and that it also proposes reclassifying the identity seam as an audit-remediation slice, or leave it unnumbered and make polish-A 10 and polish-C 11.

---

## Checked and found true

The fold can rely on these; each was resolved against the repo, not against a prior review.

- **The identity seam is merged as PR #53.** `ac0d4d52`, "Merge pull request #53 from glw907/identity-seam", on `main`. `docs/STATUS.md` says so in the same words.
- **The sweep anchor `f3f24b9f` is a real commit and an ancestor of `HEAD`.** "docs(record): bank the identity extend page's two reviews". All three sweep records name it in their own headers.
- **The three sweeps' finding counts.** `exports-sweep.md` F1 to F21, `docs-sweep.md` 1 to 30, `admin-sweep.md` 1 to 30, all present and correctly numbered.
- **Every A number is routed exactly once.** A1, A2, A14, A24, A25 (Task 3); A4 (Task 4); A3, A6, A16 (Task 5); A5, A7, A19, A26, A27 (Task 7); A8, A15 (Task 8); A17, A18, A20 (Task 9); A21, A22, A28, A30 (Task 10); A9 to A13 (Task 12); A23 not taken; A29 banked. Twenty-eight plus two equals thirty, no duplicates.
- **Every F number is routed exactly once.** F1 (Tasks 1, 2), F2 (Shape and Task 14), F4 to F6 (Task 14), F7 to F10 banked, F3/F11/F13/F14/F15/F17/F18/F19/F20/F21 across polish-C lines 2 to 9 and Task 8, F12 and F16 in "Findings not taken". Twenty-one accounted.
- **Eighteen dispositions rows.** The table at `:99-118` carries exactly eighteen, matching the Inputs line (revision 1's seventeen-versus-eighteen mismatch is fixed).
- **Every gate name in polish-A's list exists in `package.json`:** `check`, `check:comments`, `check:reference`, `check:reference:signatures`, `check:surface`, `check:custom-surface`, `check:dev-package`, `check:package`, `check:docs`, `check:snippets`, `check:transcripts`, `check:symbols`, `check:editor-quotes`, `check:template`, `check:consumers`, plus `test`. `check:surface -- --update` is real.
- **`docs/extend` is in `package.json`'s `files` array**, so the substrate commit does change the published-page set, exactly as `:275-277` argues. `check:figures` is present only in the uncommitted working tree, which is why the substrate commit has to land first.
- **The docs standard spec says what revision 3 says about stage five.** Stage 5 is the front door, seven pages, last, "under the strictest register ruling, with every claim traced to the owner brief", meeting the system "after four stages of tuning"; each stage closes with a tuning checkpoint that amends the schemas and thresholds (`docs-standard-design.md:793`, `:777-798`, `:817`).
- **The harvest sequencing claim is exact.** "Polish-C must land entirely before the first stage's harvest branches. It does not gate pass 2a" (`docs-standard-design.md:864-866`).
- **`audit-admin-officelist` and `audit-admin-formattimestamp` are both "Reopens on: closed"**, so decision 8's and Task 15's "against the closed row" framing is right (`engine-rulings.md:2665`, `:2673`).
- **`f1-return-position-leak-sanction` is genuinely stale-open.** Its reopen line is "open until the leak-class `check:surface` rider lands in the internals pass" (`:125`); the rider landed and has its own row, `check-surface-leaks` (accept, 2026-09-02, internals pass), at `:5104`.
- **The ledger header's allowlist count is wrong and worth Task 9's line.** The header says "The remaining 40 stay truncated and allowlisted" (`:26-27`); `scripts/checks/check-rulings-format-allowlist.json` holds one entry.
- **The seventeen rows the charter review enumerates all exist and are all renamed by the window** (`audit-adapter-serializemanifest`, `-fieldsetoptions`, `-rendereroptions`, `-githubapp`, `-deriveexcerpt`, `audit-sveltekit-authguardoptions`, `-navloaddata`, `-vocabularyloaddata`, `-requestresult`, `-adminaction`, `-previewload`, `-healthload`, `-revertfailure`, `audit-auth-cookiename`, `-editorrow`, `-channelrequestresult`, `-channelconfirmresult`). Finding 1 is that the set is incomplete, not that it is wrong.
- **The "both stay" sentence exists in both places Task 7 names:** `docs/reference/admin-toolkit.md:659` and `src/lib/admin-toolkit/OfficeList.svelte:9`. The `gap-0` consequence is real (`OfficeList.svelte:17` states it) and `src/tests/unit/admin-sheet-inventory.test.ts` exists.
- **Eleven engine-internal importers is exact.** `FragmentPicker.svelte:13`, `media-library-helpers.ts:8`, `MediaBulkDeleteDialog.svelte:20`, `MediaOrphanTools.svelte:20`, `MediaReplaceDialog.svelte:25`, `media-upload-outcome.ts:13`, `MediaAltFillDialog.svelte:19`, `reproductions/stories/media.ts:19`, `stories/publish.ts:16`, `stories/support.ts:8`, `reproductions/fixtures.ts:23`. Thirteen test files import the same types.
- **The two conflict refusals are at `content-routes-entry.ts:922` and `:1013`**, exactly as cited.
- **The key-order claim is now correctly stated.** `:139-140` says "no gate pins order; the acceptance is the literal unchanged", which is the correction revision 1's review asked for.
- **The lint-wiring numbers are the risk review's own.** `spec-review-risk.md:25` measures zero to three gate-blocking errors and 317 doc comments across 48 files. `eslint.config.js`'s `.svelte` block is scoped to `examples/showcase/src/**/*.svelte` today, so Task 13's described change is the right one.
- **`segmentTintClass` returns `ring-1 ring-inset ring-base-content/20`** (`src/lib/components/segmented-control.ts:18`), and the only `scroll-margin` in `src/lib` is `scroll-margin-top: 5.5rem` at `cairn-admin.css:632`, so A3 and A6 are live.
- **`templates/waymark` does carry the signups route** (`templates/waymark/src/routes/admin/signups/+page.svelte` and `+page.server.ts`), so Task 12's re-emit and `check:template` are correctly required.
- **ROADMAP's tiers back three claims:** the Pagination gap is filed in the "Next" tier (`ROADMAP.md:1290`, tier starts `:909`); the "pre-beta polish" bullets are also in Next (`:1680` onward), so "a different track" is accurate; and ROADMAP does route the entry split as a two-way `-mutations.ts` cut (`:312-315`), which the spec correctly flags as the line it departs from.
- **The `cairnAccess` engine surface exists as decision 5 describes it** (`guard.ts:39`, `:48`, `:348`, `:368`), and `devBackendHandle` is a real dev-package export (`packages/cairn-cms-dev/src/handle.ts`, tested in `handle.test.ts`).
- **The release framing matches the repo's own rule.** The cut is conditional on the window still warranting one (`:32-33`, `:369-370`), the free number is verified with `npm view` before promising it, and `CHANGELOG.md` stays under `## Unreleased`.
