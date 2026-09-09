# Polish-11a Pass Implementation Plan (audit remediation, slice 11a: engine and CLI code, non-breaking)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with ONE chain (sequential), launched as TWO
> workflow runs; see Execution. Steps use checkbox syntax for tracking. Every anchor is
> re-verified at dispatch against the `main` head, per the Reconciliation block below.

**Goal:** both route monoliths split into named domain modules with the public surface
byte-identical, the shipped product copy that a ruling or a gate already binds corrected, both
doctor fixtures re-recorded against the current tool, the engine's own Svelte components under the
comment gate, the JSDoc residuals of ratified rulings closed, and the state-reset coverage regex
closed on its generic-comma gap.

**Spec:** `docs/superpowers/specs/2026-09-08-polish-passes-design.md`, revision 4, section
"Polish-11a", with the Decisions block, the Dispositions table, "Docs work defers to the rewrite",
"Sequencing and budgets", and "Risks".

**Folded 2026-09-08** from the three-lens adversarial plan review (records under
`docs/internal/record/2026-09-08-polish-inputs/`: `plan-11a-review-coverage.md`,
`plan-11a-review-executor.md`, `plan-11a-review-sequencing.md`; disposition per finding in
`plan-11a-review-fold.md`).

**Task count:** thirteen. The spec lists ten. Three spec tasks exceed the four-deliverable sizing
rule and are split here, with no work added or removed: the spec's task 4 (the media split) becomes
plan tasks 4, 5, and 6, and the spec's task 5 (the product-copy sweep) becomes plan tasks 7 and 8.
The second split follows a gate boundary as well as a size boundary: plan task 8 is the only task
whose subject is `packages/create-cairn-site`, whose gate is the CLI suite. The media split is
three tasks rather than two because the delete cluster and the metadata cluster each carry a type
rename, a ledger annotation batch, and a component sweep, which is two dispatch units in one budget
slot.

**Token ceiling:** 6.5M, re-derived here and superseding the spec's 4.5M, which was set for a
ten-task shape. The arithmetic: fourteen gate-bearing units (thirteen tasks, with Task 3 gating
twice for its two commits) at the measured band's middle of about 450K is 6.3M, plus about 0.2M for
the two conductor CI regen waits. The band is the risk lens's measurement for this repo, 370K to
530K per task over four comparable passes (conventions 4a about 530K, conformance 4b about 430K,
chassis-A about 367K, internals-B ceiling 8M over fourteen tasks with the spend unrecorded because
the session running its final gate sweep was killed mid-ritual). Internals-B is the closest analogue
on the record, since it was itself a monolith split, and its spend is the weakest input in the set,
which is why the ceiling is set at the band's middle rather than its floor. The spec's Sequencing
paragraph is amended by one line in this pass's first commit to carry the 6.5M figure and this
basis. The repo's recorded overrun history is four for four on the last comparable passes
(`docs/HISTORY.md:343-344`, `:386`, `:448-449`, `:547`), so at 80 percent of the ceiling the
conductor finishes the task, writes STATUS, and asks one combined question.

**Checkpoint interval:** every three tasks, at 3, 6, 9, and 12, each writing STATUS (task ledger,
decisions taken, spend against the ceiling, next task). Checkpoint 6 lands immediately after the
media monolith's retirement, the riskiest task in the pass, and immediately before the paint task.
The run-one to run-two cut after Task 7 is a fifth de facto STATUS write.

**Execution:** sequential, one chain, in one worktree: `.claude/worktrees/polish-11a` on branch
`polish-11a`, branched from `main` after chassis-B2 merges. No parallel chains: the single
end-to-end slot, `CHANGELOG.md`, and `docs/internal/engine-rulings.md` are all contended. Open the
PR after Task 1's commit.

**The chain runs as TWO workflow runs.** `pass-execute-chains.js` has no mid-run pause hook, and
Task 7 hands its baselines to a conductor CI regen. Run one is Tasks 1 to 7. Between the runs the
conductor runs `gh workflow run e2e.yml --ref polish-11a -f update_snapshots=true`, waits for it,
pulls the regenerated baselines into the worktree, and reads the CI diff against Task 7's
`INTENDED MOVES:` declaration. Run two is Tasks 8 to 13, and its first act is to re-verify Task 8's
anchors against the pulled head.

**Pre-dispatch, before run one.** All four are preconditions, not task steps, and none is true at
plan authoring:

1. Commit this plan onto `polish-11a`. The workflow's implement prompt names the plan as committed
   in the repo and orders a first read of its Global constraints, Ruled inputs, and Task section;
   an untracked plan means thirteen dispatches that cannot follow instruction one.
2. Create the worktree `.claude/worktrees/polish-11a` on `polish-11a` off post-B2 `main`.
3. Run a from-scratch `npm install` in that worktree's `examples/showcase`. A worktree's
   `examples/showcase/node_modules` symlinks back to the main checkout and resolves both `file:`
   deps to `main`'s build, so without the reinstall the e2e proves `main`'s engine rather than the
   split modules.
4. Amend the spec's Sequencing ceiling line (the 11a ceiling and its basis, nothing else) in the
   same commit as the plan.

---

## Reconciliation at dispatch

Every `file:line` below is quoted as the spec states it, with the value measured on `main` at
`ac911ec3` beside it. The executor re-verifies each against post-B2 `main` before its task runs,
because chassis-B2 merges between this plan's authoring and this pass's branch.

### Line anchors

| Spec anchor | Measured at `ac911ec3` | Note |
|---|---|---|
| `content-routes-entry.ts` prelude 1 to 423, `DeleteRefusal` `:222`, `BUILTIN_FRONTMATTER_KEYS` `:279`, `revertSchemaDrift` `:287`, `draftFromBranchHead` `:357`, `saveRefusal` `:416` | All five confirmed at the stated lines; the file is 1,630 lines | No move |
| Entry clusters: read 424 to 750, write 751 to 1169, destructive 1170 to 1488, revert 1489 to end | Confirmed: `createEntryActions` opens at `:424`, `saveToBranch` at `:751`, `deleteEntry` at `:1170`, `renameAction`'s body ends at `:1488`, `draftExistsFailure` at `:1500`, `revertAction` at `:1524`, the return literal at `:1617` | No move. The spec's ranges supersede the sweep's table, whose destructive range (1170 to 1311) stops before `renameAction` |
| Media clusters, measured here because the spec states none: library `mediaLibraryLoad` 412 to 496, ingest 497 to 694 (`ingestAndStore`, `uploadAction`, `mediaLibraryUploadAction`), destructive 695 to 1039 (`mediaDeleteAction`, `mediaBulkDeleteAction`, `mediaOrphanScanAction`, `mediaOrphanPurgeAction`), metadata 1040 to 1431 (`mediaUpdateAction`, `mediaReplacePreviewAction`, `mediaReplaceAction`, `mediaAltPreviewAction`, `mediaAltPropagateAction`) | Measured from the file's own function openings; `createMediaActions` opens at `:401` and the return literal at `:1432`; the file is 1,447 lines | New measurement, used by Tasks 4, 5, and 6 |
| `content-routes-media.ts:372` and `:378` (`Reload and` siblings) | Confirmed | No move |
| `nav-routes.ts:128` and `:155`, `content-routes-settings.ts:156` and `:403`, `refusal-codes.ts:23`, `CairnHistory.svelte:56` | All six confirmed | No move |
| `content-routes-entry.ts:922`, `:1013`, `:1266`, `:1481` (the four in-file `Reload` strings) | All four confirmed | No move. These four move file in Tasks 2 and 3, so Task 7 re-greps rather than re-using the line numbers |
| `VocabularyAdmin.svelte:162,220,244` (D12's three anchors) | Confirmed, and the grep finds more; see the enumeration in Task 7 | The spec directs the plan to enumerate by grep, which Task 7 carries |
| `scaffold.mjs:248-250` | Confirmed at `:248-250` | No move |
| `cloudflare/chapter2.mjs:680` | Confirmed | No move |
| `cloudflare/catalogue.mjs:541-551` | Confirmed | No move |
| `money.mjs:32-34` | Confirmed as text, but see the semantic column below | Already agrees with decision 10 |
| `docs/editors/when-something-goes-wrong.md:34`, `:39`, `:105`, `:119` | All four confirmed | No move |
| `docs/admin/is-it-working.md:53-58` (the staleness apology) | Confirmed, the paragraph opens at `:53` | No move |
| `docs/admin/is-it-working.md:22` (the site name in prose) | Confirmed: "against a site named `cairn-capture-scratch`" | New anchor. Task 9 reuses that site, so the sentence stays true |
| D5's "three zone-derived checks" prose | `:24` and `:62` | The spec names the prose without a line; both sites recorded here |
| D5's quoted totals | `:26` (`8 passed, 0 failed, 11 skipped`, the bare run) and `:50` (`8 passed, 3 failed, 8 skipped`, inside the quoted fence) | The `:50` total is inside the fenced block and changes only by re-recording the fixture |
| D10's fifth router row: `:353` vs `:149-152` | "Five related conditions" is now `:372`, `auth.store-unmigrated` is `:386`, the four-row auth entry in the jump list is `:150-153` | Drifted by about 19 lines. Use the measured values |
| `src/lib/sveltekit/index.ts:104` (F2's barrel sentence) | `:114` | Drifted by 10 lines |
| `src/lib/delivery/site-indexes.ts:33` (F4) | The doc block opens at `:31`; the `createSiteResolver` sentence is at `:34-35` | Drifted by 1 to 2 lines |
| F5's six anchors: `responses.ts:9,16,23`, `feeds.ts:7,100`, `content-routes-list.ts:34` | All six confirmed | No move |
| F6: `public-routes.ts:54` (`EntryData`), `:116` (`EntryDataOverrides`), `media/manifest.ts:13` (`MediaEntry`), `library-entry.ts:22` (`MediaLibraryEntry`) | All four confirmed | No move |
| `docs/reference/components.md:233` and `docs/reference/sveltekit.md:213` (`MediaDeleteRefusal` naming sites) | Both confirmed | No move |
| `src/lib/components/CairnMediaLibrary.svelte:29` (`@component` block) | Confirmed | No move |
| `src/tests/unit/edit-page-state-reset-coverage.test.ts` regex | `:47`, inside `parseDeclaredStateNames` opening at `:46`, with the doc block at `:39-45` | The spec cites the file, not a line |
| `eslint.config.js`'s `.svelte` block | The block comment runs `:74-78`, `:79` is the opening brace, and the `files` glob is at `:80` | The spec's and the earlier draft's `:74-79` for the comment is off by one; the glob line is right |
| `docs/HISTORY.md` chassis-B1 and identity-seam headings | `:10` and `:54` | Both carry no slice number, as the spec states |
| `2026-08-27-audit-remediation-initiative-design.md` standing constraints | The heading is at `:136`; the CI-derived gate clause runs `:138-140` and the changelog-and-ledger clause `:141-144` | The earlier draft's `:137-139` and `:140-143` are each off by one |

### Counts the spec states that measurement corrects

- **"the eleven engine-internal importers and the thirteen test files"** (spec task 1). Measured on
  `ac911ec3`: five non-test source sites name `content-routes-entry` in an import
  (`src/lib/reproductions/stories/support.ts:8`, `src/lib/reproductions/stories/publish.ts:16`,
  `src/lib/sveltekit/content-routes.ts:26` and `:41`, `src/lib/components/FragmentPicker.svelte:13`),
  two test files do (`src/tests/component/FragmentPicker.test.ts:4`,
  `src/tests/unit/retires-task2-sanctioned-leak-replacements.test.ts:13`), and four more source
  files name it only in a comment (`src/lib/github/repo.ts:121`,
  `src/lib/components/EditPage.svelte:667`, `src/lib/sveltekit/preview.ts:292`,
  `src/lib/sveltekit/refusal-codes.ts:13`). The twenty-one `content-routes-*.test.ts` suites import
  `content-routes.js`, not the monolith, so they do not move. Task 1 repoints only the read-cluster
  sites and names what it defers to Task 3; see Task 1 Step 5.
- **"the zero-to-three errors the risk review measured"** (spec task 7). Measured by running
  ESLint with the glob widened to `src/lib/components/**/*.svelte`: **11 errors across 6 files**,
  all `tsdoc/syntax` (`ComponentForm.svelte:154,155`, `ComponentInsertDialog.svelte:206` twice,
  `DeleteDialog.svelte:56` twice, `MarkdownEditor.svelte:129`, `RenameDialog.svelte:49` twice,
  `ShareLinkPanel.svelte:51,52`), zero warnings. Task 10 clears eleven, not three.
- **`MediaDeleteRefusal`'s naming sites are eight, not three and not seven.** The three the spec
  names (`docs/reference/components.md:233`, `docs/reference/sveltekit.md:213`,
  `src/lib/components/CairnMediaLibrary.svelte:29`), plus
  `src/tests/unit/sveltekit-barrel-prune.test.ts:31` (a literal name in `RETIRED_TIER1`, which goes
  vacuous if the type is renamed and the list is not),
  `src/tests/component/CairnMediaLibrary.test.ts:656` (a test title),
  `src/tests/component/CairnAdmin.test.ts:293` (a comment), and two ledger sites
  (`docs/internal/engine-rulings.md:1615` heading, `:1780` body). Task 5 carries all eight.
- **`BulkDeleteSkip`'s reach is seven code references beyond the declaration, not four.**
  Declaration `src/lib/media/bulk-delete-plan.ts:15`; uses `bulk-delete-plan.ts:27` and `:44`,
  `src/lib/components/MediaBulkDeleteDialog.svelte:21` and `:87`,
  `src/lib/sveltekit/content-routes-media.ts:27` (an import that follows the type into the delete
  module, since `:176` names it inside `MediaBulkDeleteResult`), `:44` (a comment), and `:176`.
  Plus the ledger row at
  `docs/internal/engine-rulings.md:1489` with its body at `:1492`. Task 6 carries all of them.
- **`EntryData` has eight members, not seven** (F6). Measured at
  `src/lib/delivery/public-routes.ts:54-70`: `concept`, `entry`, `html`, `canonicalUrl`, `seo`,
  `newer?`, `older?`, `heroImage?`. `MediaEntry`'s twelve is correct
  (`src/lib/media/manifest.ts:14-25`).
- **`VocabularyAdmin.svelte` has eleven user-facing candidate lines, not twelve**, plus two
  noun-sense comment lines and five verb-sense lines; the full split is in Task 7's Decisions.
- **The module count.** Decision 3 says four modules from the entry file and four plus a shared
  module from the media file, and Sequencing says the two files become "nine modules". Nine is
  reachable only if the entry split's shared home is the EXISTING
  `src/lib/sveltekit/content-routes-shared.ts` rather than a tenth new file, which is also the
  first of the two options the exports sweep offered. This plan takes that reading; see Task 1's
  Decisions line.

### Corrections this plan makes to the spec, knowingly

These are not gaps the spec left open. Each supersedes a sentence the spec states, on measurement.

- **The entry split's cross-cluster set is four members, not one.** Spec task 1 says
  "`draftFromBranchHead` (`:357`) is the one cross-cluster helper and goes to the shared module".
  Measured: `draftFromBranchHead` (read `:739`, revert `:1495` and `:1501`), `commitEditorName`
  (inside `draftFromBranchHead` at `:366`, read `:736`), `HISTORY_LIMIT` (read `:721`, `:733`,
  `:734`; revert `:1535`, `:1536`), and `invalidIdMessage` (read `:436`, destructive `:1325`). All
  four go to `content-routes-shared.ts` under the partition rule.
- **`BulkDeleteSkip` is renamed, not inlined.** The exports sweep's F1 gives the fix as
  "`BulkDeleteSkipped`-as-a-field", which reads as eliminating the type in favour of the `skipped`
  field. The type cannot be eliminated: `src/lib/components/MediaBulkDeleteDialog.svelte:87` types
  a function parameter on it (`function bulkSkipReason(skip: BulkDeleteSkip)`), so a named type has
  to exist. This plan renames it `BulkDeleteSkippedAsset` and keeps the `skipped` field name; see
  Task 6's Decisions.
- **The spec's disjointness premise for 11a and 11b is false**
  (`polish-passes-design.md:325-328`, "the two halves touch disjoint file sets ... against
  `src/lib/components/*`"). 11a touches about fifteen files under `src/lib/components/`. The
  passes are sequential, so this is not a merge conflict, and the hand-forward block below names
  the reopened files instead. The spec text is left as it stands: the conductor's ruling amends the
  spec by exactly one line, the ceiling, and nothing else.

### The semantic column: chassis-B2 decisions this pass depends on or overturns

- **Overturns none.** No 11a task writes `examples/showcase/src/routes/admin/signups/+page.server.ts`,
  the file B2's Task 6 pins with a deliberate-keep comment at `:26-28`. That overrule belongs to
  11b's task 10, per the spec's Sequencing block, and this pass must not take it.
- **`docs/internal/engine-rulings.md` is written by both passes.** B2's Task 8 modifies it "only if
  a task produced a ruling", so a row inserted before 11a branches shifts every anchor below it.
  Tasks 1, 3, 4, 5, 6, and 13 therefore locate their rows by slug with
  `grep -n "^## <slug>" docs/internal/engine-rulings.md` and by symbol name, never by reusing a line
  number from this plan. The executor re-anchors after B2's merge.
- **`docs/STATUS.md` is never a task deliverable.** The conductor owns it in both passes and writes
  it at each checkpoint and at merge. No 11a task edits it, which is why the file needs no
  reconciliation beyond this line.
- **The initiative design spec is B2's to rewrite.** B2's Task 8 item 6 amends its publish
  paragraph. This plan cites its standing constraints at `:138-140` (the CI-derived gate) and
  `:141-144` (the changelog and ledger constraint); the executor re-verifies both anchors after
  B2's merge rather than trusting these numbers.
- **Depends on B2's Task 8 rewriting `ROADMAP.md`'s polish sub-bullet by name.** That bullet is the
  source of the spec's Dispositions table, so Task 13 reconciles the table against post-B2
  `ROADMAP.md` before closing anything, and closes only the sub-bullets this pass actually shipped.
- **Depends on B2's Task 8 triaging `docs/internal/docs-friction-log.md` whole.** Both sections
  read "None open." at `ac911ec3` (`:25` and `:60`). Task 13 re-reads them rather than assuming.
- **Depends on B2's Task 8 having appended to `## Unreleased`.** This pass appends beneath whatever
  B2 left and reconciles nothing above its own entries.
- **Depends on B2's `docs/HISTORY.md` heading.** Task 13 retro-numbers chassis-B1 as 9a and the
  identity seam as 10. If B2's own heading carries no slice number, Task 13 numbers it 9b in the
  same edit, since the file would otherwise ratify an inconsistent numbering in the same commit.
- **The baseline directories do not collide.** B2's Tasks 1 and 2 move `site-home-*` and `archive2`
  under `e2e/site-visual.spec.ts-snapshots/`; 11a's Task 7 moves `vocabulary-*` under
  `e2e/admin-visual.spec.ts-snapshots/`. Different spec directories, and B2's actual diff at
  `3c6fcd2d` touches ten `site-home-*` files only.
- **`money.mjs:32-34` is not drift.** It reads "from the day you deploy it", which is what decision
  10 ratifies. The spec lists it among "the four strings that contradict decision 10"; measurement
  says three contradict it and the fourth states it. Task 8's acceptance is therefore that all four
  sites read one story, not that all four change.

### The gate, re-derived

Derived at plan authoring from the committed `.github/workflows/` at `ac911ec3`, per the initiative
design's standing constraint at `2026-08-27-audit-remediation-initiative-design.md:138-140`. CI runs
`test.yml` (thirty-one `npm run` gates), `e2e.yml`, `design.yml`, `norms.yml`, `scaffold.yml`,
`create-site.yml`, `tsgo.yml`, and `publish.yml`. The exact per-task string is under "## Gate"
below, with the CI-only remainder named there. `check:figures` is NOT in the committed `test.yml`;
it exists only in Geoff's uncommitted working tree, which decision 13 leaves unowned, so it is in
no gate this pass runs.

---

## Ruled inputs (recorded; no task re-derives them)

- **Both monoliths split** (decision 3). Four cluster modules from `content-routes-entry.ts`, and
  four cluster modules plus `content-routes-media-shared.ts` from `content-routes-media.ts`.
- **The media shared module's population is the spec's fifteen module-level primitives, and the
  two-or-more rule governs only what the spec does not enumerate.** The two rules would otherwise
  contradict each other: measured, only six of the fifteen are genuinely multi-cluster
  (`MEDIA_HASH_RE`, `MAX_ALT`, `MAX_DISPLAY_NAME`, `sanitizeField`, `MEDIA_DISABLED_MESSAGE`,
  `MANIFEST_CONFLICT_MESSAGE`) and nine are single-cluster. The spec's population wins, as a
  stability choice: these fifteen are the file's declared primitive vocabulary, several of them
  compose into each other, and splitting them across four cluster modules would put a two-line
  helper in a module named for an action it does not serve. The two-or-more rule then partitions
  the helpers and failure types the spec does not name, which is where `distinctEntryCount` lands.
- **`check:surface` stays byte-identical** (spec, "Polish-11a: Shape"). No task runs
  `check:surface -- --update`. F2 is resolved by amending the barrel sentence, never by adding a
  re-export.
- **The merge literal's key order is unchanged.** `content-routes.ts`'s
  `createContentRoutesInternal` returns an object whose key order `check:surface` pins as the
  public contract (`content-routes.ts:117` states this in the file itself). Splitting the factories
  changes which sibling supplies a member and never the order the literal lists them in.
- **Workers Paid stays "from first deploy"** (decision 10, reaffirming the 2026-08-19 ruling as
  recorded at `docs/HISTORY.md:594-596`). The CLI strings that contradict it are the drift.
- **The published-page half of D1 is not this pass's.** `docs/admin/own-your-domain.md` is
  corrected in the rewrite's admin stage. This pass changes exactly two published pages, each
  because a gate forces it: `docs/editors/when-something-goes-wrong.md` under `check:editor-quotes`
  and `docs/admin/is-it-working.md` under `check:transcripts` and `check:readiness`.
- **The 317-comment register sweep is not this pass's.** Task 10 wires the parser and clears the
  gate errors. The register sweep the wiring does not gate is a ROADMAP Later line, filed by Task 13.
- **D6 is banked, not fixed.** It is a prose fix in `docs/admin/troubleshooting.md`, a file no gate
  in this pass touches, and it defers to the rewrite with every other prose finding.
- **F7's `## Types` assertion is deferred**, on its own stated reason. No task changes
  `check:reference`'s section grammar.
- **The conductor writes `docs/STATUS.md`, never a task** (spec, "Ledger ownership").
- **Release:** ONE cut, after polish-C. This pass does not bump `package.json`, does not tag, and
  does not publish. It appends to `## Unreleased` and stops. `docs/extend/migration-notes.md` is
  NOT written by this pass: 11a is non-breaking, its window carries no `Consumers must:` line, and
  polish-C's task 10 reconciles the whole `## Unreleased` migration-notes section against the
  window. A no-action entry would be churn in a file another pass rewrites.

---

## Global constraints

These bind every task. An implementer reads them before its Files block.

1. **The em dash is banned** in every code comment and every doc this pass writes.
   `house/no-em-dash-in-comments` enforces it on `src/lib` and the showcase under `check:comments`;
   in prose it is a review finding.
2. **No process citations in shipped comments.** A comment states the contract and the reason. It
   does not name a pass, a plan, a ruling id, or a task number. Ledger rows and changelog entries
   carry that record instead, and the ledger's own `- **Note (<pass>, Task N):**` amendment line is
   the one place a pass name belongs.
3. **The gate is CI-derived, not remembered.** The exact string is under "## Gate". A task is not
   done until that string exits 0 in this worktree.
4. **One end-to-end slot per machine.** `examples/showcase/playwright.config.ts` pins port 4173
   with `reuseExistingServer: !process.env.CI`, so two `CI=1` runs cannot coexist and two non-`CI`
   runs silently share one preview server. Run the e2e suite alone in this worktree, and never
   beside another pass's. The from-scratch qualifier: the e2e proves this worktree's engine only
   after a from-scratch `npm install` in `examples/showcase` inside the worktree, which is a
   pre-dispatch step, not a task step.
5. **`check:surface` output is byte-identical for both splits.** `docs/internal/api-surface.md` is
   not regenerated and not committed by any task in this pass.
6. **The merge literal in `content-routes.ts` keeps its exact key order.** No gate pins the order
   of the `export type {...}` re-export statements above it; the acceptance for those is that the
   set of re-exported names is unchanged.
7. **No sibling cluster imports.** Each new module imports only `content-routes-shared.js`,
   `content-routes-media-shared.js`, `content-routes-context.js`, and leaf modules under
   `../content/`, `../media/`, `../github/`, `../auth/`, and `../log/`. A
   `content-routes-entry-*.ts` or `content-routes-media-*.ts` module importing another module of
   the same family is a blocking finding, and it is the shape that says a symbol sits in the wrong
   partition.
8. **TSDoc governs every comment.** Document the contract and the reason, never the type the
   signature already states, and never a paraphrase of the symbol name. An exported symbol keeps
   its minimal one-line doc even when self-evident, because `check:reference` and
   `jsdoc/require-jsdoc` want one; the write-only-when-it-helps judgment applies to internal
   symbols. Svelte `<script>` comments follow the same standard, with the `@component` convention
   for the component block.
9. **Commits.** Imperative mood, Conventional Commits, specific files rather than `git add -A`.
   The footer is exactly these two lines, and no other:

   ```
   Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
   Claude-Session: https://claude.ai/code/session_016oR8pMpc33qKYZtuMAeHfz
   ```

   One commit per Commit boundary named in a task; a task's boundaries are listed in its own
   Commit block.
10. **Each task appends its own `CHANGELOG.md` line under `## Unreleased`** and closes or
    progress-notes any ledger entry it executes, per the initiative design's standing constraint at
    `2026-08-27-audit-remediation-initiative-design.md:141-144`. 11a is non-breaking, so no entry
    carries a `Consumers must:` line. A ruling row this pass WRITES carries the full `Verdict`,
    `Reopens on`, `Shape`, `Record`, `Verified` block, since `check:rulings-format` ratchets only
    the truncated parentheticals. A row this pass only ANNOTATES keeps whatever fields it has; the
    acceptance on an annotated row is that `check:rulings-format` stays green, never that a field
    it never carried appears. No task in this pass writes a new row.
11. **The ledger annotation rule.** The split retires two module paths that twenty-four ruling rows
    name. Each split task annotates, in the same commit as its move, every row whose text names
    `content-routes-entry.ts` or `content-routes-media.ts` for a thing that task moves, using the
    ledger's existing amendment format, the one internals-B established at
    `docs/internal/engine-rulings.md:726` and `:1751`: a single
    `- **Note (polish-11a, Task N):**` line appended to the row, naming the new module and dating
    the move. The heading id is never changed, so existing `#`-anchors survive. A row's existing
    fields are never rewritten, so a dead path survives in the historical fields of every row that
    already named it; Task 13 verifies with a grep that every row naming either dead path carries
    such a Note line.
12. **The conductor writes `docs/STATUS.md`.** No task edits it.
13. **The paint protocol.** Adopted verbatim from chassis-B2, whose Global constraints it carries,
    and it rides in every task's `criteria` string. The text is under "## The paint protocol"
    below.

---

## The paint protocol

Verbatim from chassis-B2's Global constraints, with B2's cache path and manifest heading replaced
by this pass's and B2's site-visual spec dropped, since 11a reaches no public surface. It is the
whole paint contract; the reviewer reads only the copy inside the task's `criteria` string.

> Capture directories are pinned: the PASS before set at `~/.cache/cairn-polish-11a/pass/before/`
> (it exists only if some task captured one, and on this pass no task does, so Task 7 captures its
> own before set at its parent commit); this task's before set at
> `~/.cache/cairn-polish-11a/task-<N>/before/` captured at the START of the task on the clean
> worktree at the task's parent commit with
> `node examples/showcase/scripts/capture-surfaces.mjs --out <dir>` (symlink the pass set if no
> predecessor moved paint, and say so) and its after set at
> `~/.cache/cairn-polish-11a/task-<N>/after/`; every directory is write-once (the tool refuses a
> non-empty target; report a collision). Images are TILES: the capture tool writes
> `full/<surface>-<scheme>-<width>.png` and `tiles/<surface>-<scheme>-<width>-<nn>.png` (bands of
> at most 1400 CSS px with a 60 px overlap) plus `manifest.json`; a grader reads tiles, never a
> full-page file. The intended-moves manifest is the committed file
> `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`: append this task's
> rows under the `## Polish-11a` heading in the same commit as its change (surface, width, scheme,
> what moves, why, the baseline names it moves); a task that moves a baseline without appending its
> row is a blocking finding. The moved-baseline list is PRODUCED, not asserted: before any
> regeneration run the visual suites unmodified
> (`CI=1 npx playwright test e2e/admin-visual.spec.ts`, inside `examples/showcase`) and paste the
> exact FAILING snapshot names under `MOVED BASELINES:`; for surfaces not yet baselined use
> `magick compare -metric AE before.png after.png null:` per tile as `TILE DIFF:`. Regenerate moved
> baselines locally with the mode pinned,
> `CI=1 npx playwright test e2e/admin-visual.spec.ts --update-snapshots=changed`, by FILE PATH. The
> implementer summary carries verbatim and in order: `CAPTURES:` / `INTENDED MOVES:` (one
> `surface width scheme: what moves` per line) / `MOVED BASELINES:` / `TILE DIFF:` / `READ ME:` (at
> most twelve tile paths). REVIEWER: read the tiles named in the report's `READ ME:` line (at most
> twelve) and verify the report's `INTENDED MOVES:` list equals its `MOVED BASELINES:` list name
> for name; a name in one and not the other is blocking; a baseline moved with no manifest row is
> blocking; name each tile you read. A paint-neutral task that touches a rendered surface proves it
> at the floor-free level: every baseline unchanged AND `magick compare` AE = 0 for every
> before/after tile of every touched surface, reported per tile. A task that touches NO rendered
> surface captures nothing and requires no capture: its proof is that `git status` shows no file
> changed under `examples/showcase/e2e/*.spec.ts-snapshots/`, reported as
> `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`, and the gate's own
> `CI=1 npm --prefix examples/showcase run test:e2e` is the confirming run.
> STOP-AND-REPORT: a baseline that moves for a change the report does not enumerate.

**Which branch each task takes, ruled here so no implementer judges it.** The capture tool's
surface matrix is `home`, `article`, `styleguide`, `archive2`, `error404`, and `signups`
(`examples/showcase/scripts/capture-surfaces.mjs:59-109`). No 11a task changes code any of those
six renders: the public five are the showcase's own chassis theme, and `signups` composes
`CairnAdminShell` and the showcase's own screen, neither of which this pass touches. **Tasks 1 to
6 and 8 to 13 therefore take the no-rendered-surface branch: no capture, `MOVED BASELINES: none`,
and the gate's e2e run as the proof.** Task 7 is the exception and takes the full protocol,
including a before and after capture pair, whose purpose is to prove the six captured surfaces stay
at AE 0 while the vocabulary tiles move, bounding the change.

**The vocabulary screen is not in the capture matrix.** It is baselined only by
`examples/showcase/e2e/admin-visual.spec.ts:40` and `:49` as `vocabulary-light.png` and
`vocabulary-dark.png`. Task 7's evidence for those two tiles is therefore the visual suite's
PRODUCED `MOVED BASELINES:` list plus the two regenerated `-linux.png` files themselves, which the
`READ ME:` line names for the reviewer, rather than a capture-tool tile. Task 7 says so in its own
report.

---

## Task 1: The entry split, the shared additions and the read cluster

**Deliverables: four.** The read module, the cross-cluster helpers moved into
`content-routes-shared.ts`, the re-sourced type re-exports in `content-routes.ts`, and the
repointed read-cluster importers with the two ledger rows the move falsifies.

**Files:**
- Create: `src/lib/sveltekit/content-routes-entry-read.ts`
- Modify: `src/lib/sveltekit/content-routes-entry.ts` (the read cluster and its helpers leave),
  `src/lib/sveltekit/content-routes-shared.ts` (the cross-cluster helpers arrive),
  `src/lib/sveltekit/content-routes.ts` (the `createEntryActions` import becomes a
  `createEntryReadActions` import beside the surviving one; the `EditData` re-export is re-sourced),
  `src/lib/reproductions/stories/support.ts`, `src/lib/components/FragmentPicker.svelte`,
  `docs/internal/engine-rulings.md` (`audit-sveltekit-fragmenttarget`, whose internals-B Note at
  `:1751` says the export "moved to `content-routes-entry.ts`"; `audit-adapter-rolehome`, whose
  internals-B Note at `:726` says the `/admin` landing policy caller moved there),
  `docs/internal/src-lib-map.md` (the domain-factory list, the `-entry.ts` shorthand at `:145`, and
  the "well over a thousand lines each" sentence at `:148-149`), `CHANGELOG.md`
- Test: `src/tests/component/FragmentPicker.test.ts`,
  `src/tests/unit/retires-task2-sanctioned-leak-replacements.test.ts` (import paths only)

**Interfaces:**
- Produces: `src/lib/sveltekit/content-routes-entry-read.ts` exporting
  `createEntryReadActions(ctx: ContentRoutesContext)`, whose return object carries exactly
  `createAction`, `editLoad`, and `historyLoad` with their current signatures
  (`(event: CairnEvent) => Promise<ActionFailure<ContentFormFailure>>`,
  `(event: CairnEvent) => Promise<EditData>`,
  `(event: CairnEvent) => Promise<HistoryData>`). The module also becomes the declaring home of
  `EditData` (exported), `FragmentTarget` (exported), `CreateFailure`, `resolvePreview`,
  `retiredContentAdvisory`, and `commaListParam`.
- Produces: `src/lib/sveltekit/content-routes-shared.ts` gains four cross-cluster members,
  `draftFromBranchHead`, `commitEditorName`, `HISTORY_LIMIT`, and `invalidIdMessage`, each with
  the signature it has today and each exported. The file stays a leaf: it imports no
  `content-routes-*` sibling today and gains none, and `draftFromBranchHead` takes
  `(backend, path, branch, headSha)` explicitly rather than closing over `ctx`, which satisfies the
  file's own header rule at `content-routes-shared.ts:5-7`.
- Consumes: `ContentRoutesContext` from `./content-routes-context.js`, unchanged.
- Unchanged for every later task and for 11b: `content-routes.ts`'s re-exported type names
  (`ContentRoutesConfig`, `TidyClient`, `TidyEffort`, `AttentionItem`, `AdminShellData`, `HelpData`,
  `WelcomeData`, `EntrySummary`, `ListData`, `ContentFormFailure`, `EditData`, `MediaLibraryData`,
  `MediaLibraryEntry`, `SettingsData`, `VocabularyLoadData`, `DictionaryAddFailure`), the
  `createContentRoutesInternal` literal's key order, the `ContentRoutes` `Pick` list, and therefore
  `check:surface`'s output byte for byte.

**Decisions the plan makes:**
- The entry split's shared home is the existing `src/lib/sveltekit/content-routes-shared.ts`, not a
  new `content-routes-entry-shared.ts`. This is the reading that reconciles decision 3's "four
  modules from `content-routes-entry.ts`" with Sequencing's "nine modules", and it is the first of
  the two options the exports sweep offered. `content-routes-shared.ts` already exists for exactly
  this population, "the primitives several of them import".
- The partition rule for the prelude, stated once here and applied by Tasks 1, 2, and 3: a symbol
  used by one cluster moves to that cluster's module; a symbol used by two or more moves to
  `content-routes-shared.ts`. The measured cross-cluster set is the four named above, which
  supersedes the spec's one; see "Corrections this plan makes to the spec".
- The module naming scheme, applied by Tasks 1 through 6: `content-routes-entry-read.ts`,
  `content-routes-entry-write.ts`, `content-routes-entry-destructive.ts`,
  `content-routes-entry-revert.ts`, `content-routes-media-shared.ts`,
  `content-routes-media-library.ts`, `content-routes-media-ingest.ts`,
  `content-routes-media-delete.ts`, `content-routes-media-metadata.ts`. Each keeps the
  shared-prefix-instead-of-directory pattern `docs/internal/src-lib-map.md` records for this
  directory.

**Steps:**
- [ ] **Step 1:** record the before state as the move's own evidence. Capture
  `npm run check:surface` output and `grep -rn "content-routes-entry" src` to a scratch file, and
  confirm `src/tests/unit/content-routes-edit.test.ts` and
  `src/tests/unit/content-routes-history.test.ts` pass unchanged. These are the assertions the move
  must not disturb; they exercise the read cluster through `content-routes.js`, so they must pass
  before and after with no edit to either file.
- [ ] **Step 2:** move `draftFromBranchHead`, `commitEditorName`, `HISTORY_LIMIT`, and
  `invalidIdMessage` into `content-routes-shared.ts`, exported, each keeping its doc comment with
  any now-stale "this file" phrasing corrected. `content-routes-entry.ts` imports them back for the
  clusters Tasks 2 and 3 have yet to move.
- [ ] **Step 3:** create `content-routes-entry-read.ts` and move `createAction`, `editLoad`, and
  `historyLoad` into `createEntryReadActions(ctx)`, taking `EditData`, `FragmentTarget`,
  `CreateFailure`, `resolvePreview`, `retiredContentAdvisory`, and `commaListParam` with them.
  Write the module header comment: what the cluster is and why these three sit together.
- [ ] **Step 4:** re-source `content-routes.ts`. Import `createEntryReadActions` beside
  `createEntryActions`, call it, and read `createAction`, `editLoad`, and `historyLoad` from the new
  factory in the merge literal at their existing positions. Re-source the `EditData` re-export to
  the new module. The literal's key order and the re-exported name set are unchanged.
- [ ] **Step 5:** repoint the READ-CLUSTER importers only:
  `src/lib/reproductions/stories/support.ts:8`, `src/lib/components/FragmentPicker.svelte:13`,
  `src/tests/component/FragmentPicker.test.ts:4`, and
  `src/tests/unit/retires-task2-sanctioned-leak-replacements.test.ts:13`. The grep also finds
  `src/lib/reproductions/stories/publish.ts:16` (a `DeleteRefusal` type import) and four
  comment-only sites (`src/lib/github/repo.ts:121`, `src/lib/components/EditPage.svelte:667`,
  `src/lib/sveltekit/preview.ts:292`, `src/lib/sveltekit/refusal-codes.ts:13`). All five belong to
  Task 3, which retires the file, and Task 1 leaves them alone. Report three counts: found, changed,
  and deferred to Task 3 with the deferred list named.
- [ ] **Step 6:** annotate the two ledger rows whose internals-B Note names `content-routes-entry.ts`
  as the home of something this task moves. `audit-sveltekit-fragmenttarget` gains a
  `- **Note (polish-11a, Task 1):**` line saying `FragmentTarget` moved to
  `content-routes-entry-read.ts`, still imported directly by `FragmentPicker.svelte`.
  `audit-adapter-rolehome` gains one saying the `/admin` landing policy caller moved to the entry
  read module. Locate both by slug, never by the line numbers in this plan.
- [ ] **Step 7:** update `docs/internal/src-lib-map.md`'s domain-factory list, its `-entry.ts`
  shorthand, and its line-count sentence to describe the new shape. Append the `CHANGELOG.md` line
  under `## Unreleased` (internal module split, no consumer action).
- [ ] **Step 8:** the full gate. `check:surface` must be byte-identical to Step 1's capture; the two
  read-cluster suites must pass with no edit; `check:rulings-format` green. Commit.

**Acceptance criteria:**
- `src/lib/sveltekit/content-routes-entry-read.ts` exists and exports exactly
  `createEntryReadActions`, `EditData`, and `FragmentTarget`.
- `createEntryReadActions(ctx)` returns exactly three members: `createAction`, `editLoad`,
  `historyLoad`.
- `content-routes-shared.ts` exports `draftFromBranchHead`, `commitEditorName`, `HISTORY_LIMIT`,
  and `invalidIdMessage`, and imports no `content-routes-*` sibling.
- `content-routes-entry-read.ts` imports no other `content-routes-entry-*` or
  `content-routes-media-*` module.
- `content-routes-entry.ts` no longer declares `createAction`, `editLoad`, `historyLoad`,
  `EditData`, `FragmentTarget`, `CreateFailure`, `resolvePreview`, `retiredContentAdvisory`, or
  `commaListParam`.
- The `createContentRoutesInternal` return literal lists the same keys in the same order as before
  the diff, verifiable by reading the diff's context lines.
- The `export type {...}` block in `content-routes.ts` re-exports the same sixteen names as before.
- `npm run check:surface` output is byte-identical to the pre-change capture, and
  `docs/internal/api-surface.md` is not in the diff.
- `src/tests/unit/content-routes-edit.test.ts` and `src/tests/unit/content-routes-history.test.ts`
  are not in the diff and pass.
- `audit-sveltekit-fragmenttarget` and `audit-adapter-rolehome` each carry a new
  `- **Note (polish-11a, Task 1):**` line naming the new module, their heading ids are unchanged,
  and `check:rulings-format` passes.
- No file outside the named set is in the diff.
- The report names the importer count found, the count changed, and the deferred list.

**Commit:** one, `refactor(sveltekit): split the entry read cluster out of content-routes-entry`.

---

## Task 2: The entry split, the write cluster

**Deliverables: two.** The write module and its re-sourcing in `content-routes.ts`.

**Files:**
- Create: `src/lib/sveltekit/content-routes-entry-write.ts`
- Modify: `src/lib/sveltekit/content-routes-entry.ts`, `src/lib/sveltekit/content-routes.ts`,
  `CHANGELOG.md`
- Test: none moves. `src/tests/unit/content-routes-save.test.ts`,
  `content-routes-publish.test.ts`, and `content-routes-pending.test.ts` exercise this cluster
  through `content-routes.js` and must pass unedited.

**Interfaces:**
- Produces: `src/lib/sveltekit/content-routes-entry-write.ts` exporting
  `createEntryWriteActions(ctx: ContentRoutesContext)`, whose return object carries exactly
  `saveAction`, `publishAction`, `publishAllAction`, and `discardAction` with their current
  signatures (`saveAction` and `publishAction` return
  `Promise<ActionFailure<ContentFormFailure>>`; `publishAllAction` and `discardAction` return
  `Promise<never>`). The module becomes the declaring home of `saveToBranch`, `saveRefusal`,
  `SaveHold`, and `SaveFailure`.
- Consumes: from `./content-routes-shared.js`, the members the compiler proves the cluster names.
  Measured at plan authoring, the write range 751 to 1169 names none of Task 1's four
  cross-cluster helpers, so the expected consumed set is empty and the module's only sibling import
  is `content-routes-context.js`. The compiler settles it; the report names what it imported and
  flags any disagreement with this measurement.
- Unchanged: the merge literal's key order, the re-exported type-name set, `check:surface`.

**Steps:**
- [ ] **Step 1:** confirm the three write-cluster suites pass unchanged, and capture
  `npm run check:surface` output as Task 1 did.
- [ ] **Step 2:** create `content-routes-entry-write.ts` and move `saveAction`, `publishAction`,
  `publishAllAction`, and `discardAction` into `createEntryWriteActions(ctx)`, taking
  `saveToBranch`, `saveRefusal`, `SaveHold`, and `SaveFailure` with them. Write the module header:
  what the cluster is and why these four sit together.
- [ ] **Step 3:** re-source `content-routes.ts`, reading the four members from the new factory at
  their existing literal positions.
- [ ] **Step 4:** append the `CHANGELOG.md` line. The full gate, with `check:surface` byte-identical
  and the three suites unedited and green. Commit.

**Acceptance criteria:**
- `createEntryWriteActions(ctx)` returns exactly four members: `saveAction`, `publishAction`,
  `publishAllAction`, `discardAction`.
- `content-routes-entry.ts` no longer declares any of those four, nor `saveToBranch`,
  `saveRefusal`, `SaveHold`, or `SaveFailure`.
- `content-routes-entry-write.ts` imports no other `content-routes-entry-*` or
  `content-routes-media-*` module, and the report names its actual import list from
  `content-routes-shared.js`.
- `src/tests/unit/content-routes-save.test.ts`, `content-routes-publish.test.ts`, and
  `content-routes-pending.test.ts` are not in the diff and pass.
- The merge literal's key order is unchanged and `check:surface` output is byte-identical.
- The diff touches no file outside the four named above.

**Commit:** one, `refactor(sveltekit): split the entry write cluster out of content-routes-entry`.

---

## Task 3: The entry split, the destructive and revert clusters

**Deliverables: four.** The destructive module with the `DeleteRefusal` rename, the revert module,
the retirement of `content-routes-entry.ts` with every comment that names it by path, and the
ledger annotations.

**Files:**
- Create: `src/lib/sveltekit/content-routes-entry-destructive.ts`,
  `src/lib/sveltekit/content-routes-entry-revert.ts`
- Delete: `src/lib/sveltekit/content-routes-entry.ts`
- Modify: `src/lib/sveltekit/content-routes.ts` (including the sibling-factory shorthand list in its
  header comment at `:8`, which names `-entry.ts`),
  `src/lib/sveltekit/content-routes-context.ts:4` (the same shorthand list; no other task opens this
  file), `src/lib/reproductions/stories/publish.ts` (`:16` the `DeleteRefusal` type import, `:99`
  its use), `src/lib/github/repo.ts:121`, `src/lib/components/EditPage.svelte:667`,
  `src/lib/sveltekit/preview.ts:292`, `src/lib/sveltekit/refusal-codes.ts:13` (four comments that
  name the retired file by path), `docs/internal/engine-rulings.md` (the rows enumerated in Step 5),
  `docs/internal/src-lib-map.md`, `CHANGELOG.md`
- Test: `src/tests/unit/check-editor-quotes.test.ts` (its two comments at `:126` and `:132` name
  the retired file), `src/tests/unit/sveltekit-barrel-prune.test.ts` (the `RETIRED_CORE_ARMS`
  literal at `:22` and its explanatory comment at `:17-21`)

**Interfaces:**
- Produces: `src/lib/sveltekit/content-routes-entry-destructive.ts` exporting
  `createEntryDestructiveActions(ctx: ContentRoutesContext)`, returning exactly `deleteAction`,
  `listDeleteAction`, and `renameAction`, each
  `(event: CairnEvent) => Promise<ActionFailure<ContentFormFailure>>`. The module becomes the
  declaring home of `deleteEntry`, `RenameFailure`, and `DeleteFailure`, the latter being
  `DeleteRefusal` renamed (F1).
- Produces: `src/lib/sveltekit/content-routes-entry-revert.ts` exporting
  `createEntryRevertActions(ctx: ContentRoutesContext)`, returning exactly `revertAction`
  (`(event: CairnEvent) => Promise<ActionFailure<RevertFailure>>`). The module becomes the
  declaring home of `draftExistsFailure`, `revertSchemaDrift`, and `BUILTIN_FRONTMATTER_KEYS`.
- Consumes: `invalidIdMessage`, `HISTORY_LIMIT`, and `draftFromBranchHead` from
  `./content-routes-shared.js`.
- Unchanged: the merge literal's key order, the re-exported type-name set, `check:surface`.
  `DeleteFailure` reaches no package subpath, so the rename is non-breaking, which the exports
  sweep verified against `docs/internal/api-surface.md`.

**Decisions the plan makes:**
- The rename target `DeleteFailure` is the name F1 states and `convention-failure-suffix` ratifies,
  and no symbol of that name exists in `src/lib` today.
- **`RETIRED_CORE_ARMS` follows the rename.** `src/tests/unit/sveltekit-barrel-prune.test.ts:22`
  reads `const RETIRED_CORE_ARMS = ['SaveFailure', 'DeleteRefusal', 'RenameFailure',
  'CreateFailure', 'PreviewMintFailure']`, a list asserting each name is absent from the barrel. If
  the type becomes `DeleteFailure` and the literal does not, the entry asserts the absence of a
  name that no longer exists and the gate stops biting on the live type. This is the same
  vacuous-gate hazard the plan names for `RETIRED_TIER1` in Task 6, and it takes the same
  treatment: the literal entry becomes `DeleteFailure` and the comment at `:17-21` follows.
- **Four test comments quoting the retired name are deliberately left unchanged**, and the
  acceptance grep is written so they are not a failure. They are
  `src/tests/unit/sveltekit-barrel-prune.test.ts:20`,
  `src/tests/unit/content-form-failure-flattened.test.ts:9`,
  `src/tests/unit/content-routes-list.test.ts:604`, and
  `src/tests/unit/content-routes-delete.test.ts:66`. Each is a past-tense sentence about the barrel
  arm that was retired under the name `DeleteRefusal`, which stays historically true after the type
  is renamed. `content-routes-delete.test.ts` is additionally the suite this task must leave out of
  the diff to prove the move is behavior-neutral, so editing a comment in it would spend the one
  piece of evidence the task has. The gate stays honest because the live assertion, the
  `RETIRED_CORE_ARMS` literal, does change.

**Steps:**
- [ ] **Step 1:** confirm `src/tests/unit/content-routes-delete.test.ts` and
  `content-routes-rename.test.ts` pass unchanged, and capture `check:surface`.
- [ ] **Step 2:** create `content-routes-entry-destructive.ts` and move the three actions with
  `deleteEntry`, `RenameFailure`, and `DeleteRefusal`, renaming the last to `DeleteFailure` in the
  same commit as the move. Re-source `content-routes.ts`. Repoint
  `src/lib/reproductions/stories/publish.ts` to the new module and the new name. Update
  `RETIRED_CORE_ARMS` and its comment. The full gate. Commit.
- [ ] **Step 3:** create `content-routes-entry-revert.ts` and move `revertAction` with
  `draftExistsFailure`, `revertSchemaDrift`, and `BUILTIN_FRONTMATTER_KEYS`. Re-source
  `content-routes.ts`. `content-routes-entry.ts` is now empty of declarations and is deleted.
- [ ] **Step 4:** repoint every comment naming the retired file to the module that now holds the
  thing it describes: the four source comments, the two in
  `src/tests/unit/check-editor-quotes.test.ts`, and the sibling-factory shorthand lists in
  `content-routes.ts:8` and `content-routes-context.ts:4`, which name `-entry.ts` rather than the
  full path and so escape a path grep.
- [ ] **Step 5:** annotate every ruling row whose text names `content-routes-entry.ts` for a thing
  this task moves. Located by slug at plan authoring: `audit-sveltekit-deleterefusal` (the
  `DeleteRefusal` row, annotated with the new name, the new module, and "verdict unchanged"), the
  `DeleteRefusal` prose in `audit-sveltekit-deleterefusal`'s own body naming the five core
  carriers, and `convention-failure-suffix` (progress-noted with the entry-half rename executed).
  Re-grep with `grep -n "DeleteRefusal\|content-routes-entry" docs/internal/engine-rulings.md` and
  annotate whatever that finds, since B2 may have shifted the file. Update
  `docs/internal/src-lib-map.md`. Append the `CHANGELOG.md` line. The full gate, with
  `check:rulings-format` green and `check:surface` byte-identical. Commit.

**Acceptance criteria:**
- Two commits, one per cluster, so the reviewer diffs the destructive move separately from the
  revert move.
- `createEntryDestructiveActions(ctx)` returns exactly three members and
  `createEntryRevertActions(ctx)` exactly one.
- Neither new module imports another `content-routes-entry-*` or `content-routes-media-*` module.
- `src/lib/sveltekit/content-routes-entry.ts` does not exist after the second commit.
- `grep -rnE "(^|[^A-Za-z])DeleteRefusal" src` returns exactly these four lines and nothing else:
  `src/tests/unit/sveltekit-barrel-prune.test.ts:20`,
  `src/tests/unit/content-form-failure-flattened.test.ts:9`,
  `src/tests/unit/content-routes-list.test.ts:604`,
  `src/tests/unit/content-routes-delete.test.ts:66`. Each is a past-tense comment about the retired
  barrel arm, named in the report with the reason it stays.
- `RETIRED_CORE_ARMS` names `DeleteFailure`, and `sveltekit-barrel-prune.test.ts` passes.
- `grep -rn "content-routes-entry\.ts" src docs` and `grep -rn -- "-entry\.ts" src docs` together
  return only history files under `docs/superpowers/`, `docs/internal/record/`, `docs/HISTORY.md`,
  and `docs/internal/engine-rulings.md`, whose hits the annotation rule preserves. The report
  enumerates every `engine-rulings.md` hit line with the row heading it sits under, and each of
  those rows carries a `- **Note (polish-11a, Task 3):**` line naming the new module.
- `src/tests/unit/content-routes-delete.test.ts` and `content-routes-rename.test.ts` are not in the
  diff and pass.
- The merge literal's key order is unchanged and `check:surface` output is byte-identical to the
  pre-change capture.
- Every ruling row the re-grep found carries a `- **Note (polish-11a, Task 3):**` line naming the
  new name and module and saying the verdict is unchanged, no heading id changed, and
  `check:rulings-format` passes. No row gains or loses a field it did not already carry.

**Commit:** two, `refactor(sveltekit): split the entry destructive cluster and rename DeleteRefusal`
and `refactor(sveltekit): split the entry revert cluster and retire content-routes-entry`.

---

## Task 4: The media split, the shared module, library read, and ingest

**Deliverables: four.** The shared module, the library-read module, the ingest module with the
direct `logCommitFailed` import, and the ledger annotations for the symbols these three take.

**Files:**
- Create: `src/lib/sveltekit/content-routes-media-shared.ts`,
  `src/lib/sveltekit/content-routes-media-library.ts`,
  `src/lib/sveltekit/content-routes-media-ingest.ts`
- Modify: `src/lib/sveltekit/content-routes-media.ts`, `src/lib/sveltekit/content-routes.ts`,
  `src/lib/components/media-upload-outcome.ts`,
  `src/lib/components/media-library-helpers.ts` (`:8` imports `MediaUsageInfo`, which moves here),
  `src/lib/components/MediaBulkDeleteDialog.svelte` (`:20` imports three symbols:
  `MediaUsageInfo`, which moves here, and `MediaBulkDeleteResult` and `MediaBulkFailure`, which are
  Task 5's; the `BulkDeleteSkip` import at `:21` is Task 6's),
  `src/lib/reproductions/fixtures.ts`, `src/lib/reproductions/stories/media.ts`,
  `scripts/checks/check-surface-leaks.json` (`:127` and `:259`, whose `sanctioned-by` prose says
  `MediaUploadFailure` and `UploadResult` keep their export "in content-routes-media.ts"; the
  entries key on `name` and `subpath`, so `check:surface` stays byte-identical and only the prose
  goes false), `docs/internal/engine-rulings.md` (the rows in Step 6),
  `docs/internal/src-lib-map.md`, `CHANGELOG.md`
- Test (import paths only): `src/tests/component/MediaInsertPopover.test.ts`,
  `src/tests/unit/media-upload-outcome.test.ts`,
  `src/tests/unit/retires-task2-sanctioned-leak-replacements.test.ts`,
  `src/tests/component/CairnMediaLibrary.test.ts` (`:19` imports `MediaUsageInfo`, which moves
  here; the four metadata types on `:20-23` are Task 6's)

**Interfaces:**
- Produces: `src/lib/sveltekit/content-routes-media-shared.ts`, exporting the fifteen module-level
  primitives with their current signatures, the population the spec fixes: `MEDIA_SLUG_RE`,
  `MEDIA_HASH_RE`, `MAX_ALT`, `MAX_DISPLAY_NAME`, `MAX_ORIGINAL_FILENAME`, `MAX_DIMENSION`,
  `safeDecode`, `basename`, `sanitizeField`, `clampDimension`, `replacementToken`,
  `resolveMediaBucket`, `MEDIA_DISABLED_MESSAGE`, `MANIFEST_CONFLICT_MESSAGE`, and
  `CONTENT_CONFLICT_MESSAGE`. It also takes `distinctEntryCount`, which the two-or-more rule sends
  here because it is called from two clusters.
- Produces: `src/lib/sveltekit/content-routes-media-library.ts` exporting
  `createMediaLibraryActions(ctx: ContentRoutesContext)`, returning exactly `mediaLibraryLoad`
  (`(event: CairnEvent) => Promise<MediaLibraryData>`), and declaring `MediaLibraryData` and
  `MediaUsageInfo` and nothing else. It also carries the
  `export type { MediaLibraryEntry } from '../media/library-entry.js';` line that sits at
  `content-routes-media.ts:47` today, because `MediaLibraryData.assets` is what names the type; the
  implementer verifies that `content-routes.ts`'s re-export resolves to the new host and reports it.
- Produces: `src/lib/sveltekit/content-routes-media-ingest.ts` exporting
  `createMediaIngestActions(ctx: ContentRoutesContext)`, returning exactly `uploadAction` and
  `mediaLibraryUploadAction`, each
  `(event: CairnEvent) => Promise<ActionFailure<MediaUploadFailure> | UploadResult>`, and declaring
  `ingestAndStore`, `UploadResult`, and `MediaUploadFailure`.
- Produces: `content-routes-media-ingest.ts` imports `logCommitFailed` directly from
  `./commit-log.js` and calls it as a module function, replacing the single
  `ctx.logCommitFailed(commitFields, err)` bound-method call at the old
  `content-routes-media.ts:668`, which sits inside `mediaLibraryUploadAction` (`:644-694`) and is
  the only `ctx.logCommitFailed` call in `src/lib`. `ContentRoutesContext` keeps its
  `logCommitFailed` member, since `content-routes-context.ts:420` publishes it and other siblings
  may call it.
- Unchanged: `content-routes.ts` re-exports `MediaLibraryData` and `MediaLibraryEntry` under the
  same names from their new sources, the merge literal's key order holds, and `check:surface` is
  byte-identical.

**The measured media partition** (whole-word use sites in `content-routes-media.ts` at `ac911ec3`,
with the cluster ranges from the Reconciliation block; the implementer re-verifies each by grep
before writing a module and reports any disagreement):

| Symbol | Declared | Used at | Cluster | Home |
|---|---|---|---|---|
| `MediaLibraryData` | `:65` | `:412`, `:418` | library | `-media-library.ts` |
| `MediaUsageInfo` | `:53` | `:68`, `:465`, plus `media-library-helpers.ts:8` and `MediaBulkDeleteDialog.svelte:20` | library | `-media-library.ts` |
| `distinctEntryCount` | `:336` | `:473` (library), `:735` (delete) | two | `-media-shared.ts` |
| `originRank` | `:320` | `:745` only | delete | `-media-delete.ts` (Task 5) |
| `branchKey` | `:328` | `:745` only | delete | `-media-delete.ts` (Task 5) |
| `MediaBulkFailure` | `:152` | `:805`, `:835`, `:846`, `:869`, `:908`, `:917`, `:933`, `:966`, `:975`, `:987`, `:1001` | delete | `-media-delete.ts` (Task 5) |
| `MediaUploadFailure`, `UploadResult`, `ingestAndStore` | `:497` and the prelude | the ingest range 497 to 694 only | ingest | `-media-ingest.ts` |
| `MEDIA_HASH_RE` | `:280` | `:702`, `:826` (delete), `:1047`, `:1115`, `:1184`, `:1311`, `:1380` (metadata) | two | `-media-shared.ts` |
| `MAX_ALT`, `MAX_DISPLAY_NAME`, `sanitizeField` | `:286`, `:288`, `:344` | `:560-562` (ingest) and `:1055`, `:1057` (metadata) | two | `-media-shared.ts` |
| `MEDIA_DISABLED_MESSAGE` | `:370` | `:385`, `:391` (inside `resolveMediaBucket`, delete), `:1216`, `:1392` (metadata) | two | `-media-shared.ts` |
| `MANIFEST_CONFLICT_MESSAGE` | `:372` | `:670` (ingest), `:776`, `:869` (delete), `:1073` (metadata) | three | `-media-shared.ts` |
| `MEDIA_SLUG_RE`, `replacementToken`, `CONTENT_CONFLICT_MESSAGE` | `:278`, `:365`, `:378` | `:366`/`:1058`, `:1121`/`:1224`, `:1271`/`:1427` | metadata only | `-media-shared.ts`, by the spec's fixed population |
| `MAX_ORIGINAL_FILENAME`, `MAX_DIMENSION`, `safeDecode`, `basename`, `clampDimension` | `:290`, `:292`, `:298`, `:311`, `:353` | the ingest range only | ingest only | `-media-shared.ts`, by the spec's fixed population |
| `resolveMediaBucket` | `:387` | `:756`, `:833`, `:915`, `:973` | delete only | `-media-shared.ts`, by the spec's fixed population |

The nine single-cluster primitives sit in the shared module because the Ruled inputs block fixes
that population; the two-or-more rule governs `distinctEntryCount`, `originRank`, `branchKey`, and
the failure types, which the spec does not enumerate.

**Steps:**
- [ ] **Step 1:** confirm the six media suites (`content-routes-media.test.ts`, `-bulk`, `-alt`,
  `-replace`, `-orphan`, `-merge`) pass unchanged, and capture `check:surface`. Re-verify the
  partition table above by grep and report any disagreement before writing a module.
- [ ] **Step 2:** create `content-routes-media-shared.ts` and move the fifteen primitives plus
  `distinctEntryCount` into it, each keeping its doc comment with any now-stale "this file" phrasing
  corrected. `content-routes-media.ts` imports them back for the clusters Tasks 5 and 6 have yet to
  move. The name-collision note at `content-routes-shared.ts:9` names `content-routes-media.ts` and
  its block-scoped `manifestRow`; that note is still true while the file exists, so Task 4 leaves it
  alone and Task 6 owns it as part of the retirement.
- [ ] **Step 3:** create `content-routes-media-library.ts` with `createMediaLibraryActions`, its two
  declarations, and the `MediaLibraryEntry` re-export line.
- [ ] **Step 4:** create `content-routes-media-ingest.ts` with `createMediaIngestActions`, its three
  declarations, and the direct `logCommitFailed` import replacing the bound-method call.
- [ ] **Step 5:** re-source `content-routes.ts` for the three moved members at their existing
  literal positions, and re-source the `MediaLibraryData` and `MediaLibraryEntry` re-exports.
  Repoint every importer the grep finds, including the two `MediaUsageInfo` importers under
  `src/lib/components/` and `src/tests/component/CairnMediaLibrary.test.ts:19`, whose four other
  imported types on `:20-23` are Task 6's.
- [ ] **Step 6:** annotate the ruling rows whose module-home sentence this task's moves falsify,
  located by slug: `audit-sveltekit-mediauploadfailure`, `audit-sveltekit-uploadresult`,
  `audit-sveltekit-mediausageinfo`, and `audit-log-media-upload-failed` (a keep row whose
  `Verdict` and `Any-site case` both cite `content-routes-media.ts:508` and `:475` as the emission
  sites, which move into the ingest module). Correct the two `sanctioned-by` strings in
  `scripts/checks/check-surface-leaks.json`.
- [ ] **Step 7:** update `docs/internal/src-lib-map.md`. Append the `CHANGELOG.md` line. The full
  gate, with `check:surface` byte-identical, `check:rulings-format` green, and the six suites
  unedited and green. Commit.

**Acceptance criteria:**
- The three new modules exist with the exported factory names above, and each factory returns
  exactly the members listed.
- None of the three imports another `content-routes-media-*` or `content-routes-entry-*` cluster
  module; `-media-library.ts` and `-media-ingest.ts` import `content-routes-media-shared.js` and
  leaf modules only.
- `content-routes-media.ts` still exists after this task and no longer declares the sixteen moved
  primitives, `MediaLibraryData`, `MediaUsageInfo`, `mediaLibraryLoad`, `uploadAction`,
  `mediaLibraryUploadAction`, `ingestAndStore`, `UploadResult`, or `MediaUploadFailure`.
- `grep -rn "ctx\.logCommitFailed" src/lib` returns nothing, and
  `content-routes-media-ingest.ts` imports `logCommitFailed` from `./commit-log.js`.
- `ContentRoutesContext` still declares `logCommitFailed`.
- The six media suites are not in the diff and pass.
- The merge literal's key order is unchanged and `check:surface` output is byte-identical.
- `scripts/checks/check-surface-leaks.json` no longer says either interface keeps its export in
  `content-routes-media.ts`.
- Each annotated ruling row carries a `- **Note (polish-11a, Task 4):**` line, no heading id
  changed, and `check:rulings-format` passes.
- The report carries the re-verified partition table and names any square where measurement
  disagreed with the plan.

**Commit:** one, `refactor(sveltekit): split the media shared, library, and ingest clusters`.

---

## Task 5: The media split, delete and orphans

**Deliverables: three.** The delete-and-orphans module, the `MediaDeleteRefusal` rename with its
eight naming sites, and the ledger annotations.

**Files:**
- Create: `src/lib/sveltekit/content-routes-media-delete.ts`
- Modify: `src/lib/sveltekit/content-routes-media.ts`, `src/lib/sveltekit/content-routes.ts`,
  `src/lib/components/MediaOrphanTools.svelte`,
  `src/lib/components/CairnMediaLibrary.svelte` (the `@component` block at `:29` names
  `MediaDeleteRefusal`),
  `src/lib/components/MediaBulkDeleteDialog.svelte` (`:20` imports `MediaBulkDeleteResult` and
  `MediaBulkFailure`, both of which move here),
  `docs/reference/components.md:233`, `docs/reference/sveltekit.md:213`,
  `docs/internal/engine-rulings.md` (the rows in Step 4), `docs/internal/src-lib-map.md`,
  `CHANGELOG.md`
- Test: `src/tests/unit/sveltekit-barrel-prune.test.ts:31` (the `RETIRED_TIER1` literal),
  `src/tests/component/CairnMediaLibrary.test.ts:656` (the test title),
  `src/tests/component/CairnAdmin.test.ts:293` (a comment),
  `src/tests/unit/content-routes-media.test.ts`, `content-routes-media-bulk.test.ts`,
  `content-routes-media-orphan.test.ts` (import paths for `MediaBulkFailure`,
  `MediaBulkDeleteResult`, and `MediaOrphanPurgeResult`; the "still exported at its declaring
  module" comments above those imports name no path and stay true unchanged)

**Interfaces:**
- Produces: `src/lib/sveltekit/content-routes-media-delete.ts` exporting
  `createMediaDeleteActions(ctx: ContentRoutesContext)`, returning exactly `mediaDeleteAction`
  (`Promise<ActionFailure<MediaDeleteFailure>>`), `mediaBulkDeleteAction`
  (`Promise<ActionFailure<MediaBulkFailure> | MediaBulkDeleteResult>`), `mediaOrphanScanAction`
  (`Promise<ActionFailure<MediaBulkFailure> | MediaOrphanScanResult>`), and
  `mediaOrphanPurgeAction` (`Promise<ActionFailure<MediaBulkFailure> | MediaOrphanPurgeResult>`).
  It declares `MediaDeleteFailure` (`MediaDeleteRefusal` renamed), `MediaBulkFailure`,
  `MediaBulkDeleteResult`, `MediaOrphanPurgeResult`, `originRank`, and `branchKey`.
- Consumes: `content-routes-media-shared.js` for `distinctEntryCount`, `resolveMediaBucket`,
  `MEDIA_HASH_RE`, and `MANIFEST_CONFLICT_MESSAGE`, plus
  `content-routes-context.js` and leaf modules under `../media/` and `../github/`. It imports no
  other cluster module.
- Produces: the delete module imports `logCommitFailed` directly from `./commit-log.js` if the
  cluster logs a commit failure; measured, the delete range's failure path calls
  `ctx.commitFailure`, not `ctx.logCommitFailed`, so the expected import count is zero and the
  report says which it found.
- Unchanged: `content-routes.ts` re-exports the same names, the merge literal's key order holds,
  and `check:surface` is byte-identical. The renamed type reaches no package subpath.

**Steps:**
- [ ] **Step 1:** confirm the six media suites and the two component suites pass unchanged, and
  capture `check:surface`.
- [ ] **Step 2:** create `content-routes-media-delete.ts` with `createMediaDeleteActions`, taking
  `originRank`, `branchKey`, `MediaBulkFailure`, `MediaBulkDeleteResult`, `MediaOrphanPurgeResult`,
  and `MediaDeleteRefusal`, renaming the last to `MediaDeleteFailure` in the same commit as the
  move. Re-source `content-routes.ts`. Repoint `MediaBulkDeleteDialog.svelte:20`, which imports
  `MediaBulkDeleteResult` and `MediaBulkFailure`; the `MediaUsageInfo` on that same line is Task
  4's and the `BulkDeleteSkip` import at `:21` is Task 6's.
- [ ] **Step 3:** follow the rename through its eight naming sites: `docs/reference/components.md:233`,
  `docs/reference/sveltekit.md:213`, `CairnMediaLibrary.svelte:29`,
  `sveltekit-barrel-prune.test.ts:31` (`RETIRED_TIER1`, which goes vacuous if the literal does not
  follow), `CairnMediaLibrary.test.ts:656`, `CairnAdmin.test.ts:293`, and the two ledger sites at
  the `audit-sveltekit-mediadeleterefusal` heading and in `audit-sveltekit-usageentry`'s body,
  located by slug.
- [ ] **Step 4:** annotate the ruling rows whose module-home sentence this task's moves falsify,
  located by slug: `audit-sveltekit-mediadeleterefusal` (also the rename), `audit-sveltekit-mediabulkfailure`,
  `audit-sveltekit-mediabulkdeleteresult`, `audit-sveltekit-mediaorphanpurgeresult`, and
  `audit-sveltekit-mediaorphanscanresult` and `audit-sveltekit-branchref` where the row names
  `content-routes-media.ts` as the direct importer of a type this cluster carries. Progress-note
  `convention-failure-suffix` with the media-delete half of the rename executed.
- [ ] **Step 5:** update `docs/internal/src-lib-map.md`. Append the `CHANGELOG.md` line. The full
  gate, with `check:rulings-format`, `check:reference`, `check:reference:signatures`, and
  `check:snippets` green and `check:surface` byte-identical. Commit.

**Acceptance criteria:**
- `createMediaDeleteActions(ctx)` returns exactly four members.
- `content-routes-media-delete.ts` imports no other `content-routes-media-*` or
  `content-routes-entry-*` cluster module, and declares `originRank` and `branchKey` itself.
- `content-routes-media.ts` still exists after this task and no longer declares the four delete
  actions, `MediaDeleteRefusal`, `MediaBulkFailure`, `MediaBulkDeleteResult`,
  `MediaOrphanPurgeResult`, `originRank`, or `branchKey`.
- `grep -rn "MediaDeleteRefusal" src docs packages examples scripts` returns nothing outside
  `docs/superpowers/`, `docs/internal/record/`, `docs/HISTORY.md`, and `CHANGELOG.md`.
- `RETIRED_TIER1` in `sveltekit-barrel-prune.test.ts` names `MediaDeleteFailure`, and the suite
  passes.
- The three media suites in the diff changed only their import path and the renamed type name;
  `-alt`, `-replace`, and `-merge` are not in the diff and pass.
- The merge literal's key order is unchanged and `check:surface` output is byte-identical.
- Each annotated ruling row carries a `- **Note (polish-11a, Task 5):**` line naming the new name
  and module and saying the verdict is unchanged, no heading id changed, no field added that the
  row did not carry, and `check:rulings-format` passes.

**Commit:** one, `refactor(sveltekit): split the media delete cluster and rename MediaDeleteRefusal`.

---

## Task 6: The media split, the metadata rewrite and the BulkDeleteSkip rename

**Deliverables: four.** The metadata module, the retirement of `content-routes-media.ts` with every
comment that names it by path, the `BulkDeleteSkip` rename, and the ledger annotations.

**Files:**
- Create: `src/lib/sveltekit/content-routes-media-metadata.ts`
- Delete: `src/lib/sveltekit/content-routes-media.ts`
- Modify: `src/lib/sveltekit/content-routes.ts` (including the sibling-factory shorthand at `:8`,
  which names `-media.ts`), `src/lib/sveltekit/content-routes-context.ts:4` (the same shorthand),
  `src/lib/media/bulk-delete-plan.ts` (`:15` the declaration, `:27` and `:44` its uses),
  `src/lib/sveltekit/content-routes-media-delete.ts` (it holds the `BulkDeleteSkip` import after
  Task 5 moves `MediaBulkDeleteResult` there, so the rename edits it here),
  `src/lib/components/MediaAltFillDialog.svelte`, `src/lib/components/MediaReplaceDialog.svelte`,
  `src/lib/components/MediaBulkDeleteDialog.svelte` (`:21` and `:87`, the `BulkDeleteSkip` import
  and the `bulkSkipReason` parameter), `src/lib/sveltekit/content-routes-shared.ts:9` and
  `src/lib/sveltekit/guard.ts:117` (two comments naming the retired file),
  `docs/internal/admin-smoke-test.md:128` (names `src/lib/sveltekit/content-routes-media.ts` as the
  home of `mediaOrphanScanAction` and `mediaOrphanPurgeAction`),
  `docs/internal/engine-rulings.md` (the rows in Step 5), `docs/internal/src-lib-map.md`,
  `CHANGELOG.md`
- Test: `src/tests/unit/sveltekit-barrel-prune.test.ts:26-28` (a comment naming
  `content-routes-media.ts` as the declaring module by path),
  `src/tests/component/CairnMediaLibrary.test.ts` (`:20-23` import the four metadata types, which
  move here; `:19`'s `MediaUsageInfo` is Task 4's),
  `src/tests/unit/content-routes-media-alt.test.ts`, `content-routes-media-replace.test.ts`
  (import paths for the four metadata types; the "still exported at their declaring module"
  comments above those imports name no path and stay true unchanged)

**Interfaces:**
- Produces: `src/lib/sveltekit/content-routes-media-metadata.ts` exporting
  `createMediaMetadataActions(ctx: ContentRoutesContext)`, returning exactly `mediaUpdateAction`,
  `mediaReplacePreviewAction`, `mediaReplaceAction`, `mediaAltPreviewAction`, and
  `mediaAltPropagateAction` with their current signatures. It declares `MediaUpdateFailure`,
  `MediaReplaceFailure`, `MediaAltPropagateFailure`, `MediaReplacePreviewEntry`,
  `MediaReplacePreviewPlan`, `MediaAltPreviewEntry`, and `MediaAltPreviewPlan`.
- Consumes: `content-routes-media-shared.js`, `content-routes-context.js`, and leaf modules under
  `../content/` and `../media/`. It imports no other cluster module.
- Produces: `src/lib/media/bulk-delete-plan.ts` exports `BulkDeleteSkippedAsset` in place of
  `BulkDeleteSkip`, with the same member shape (`hash`, `reason`, `usage`) and the field name
  `skipped` on `BulkDeletePlan` and `MediaBulkDeleteResult` unchanged.
- Unchanged: `content-routes.ts` re-exports the same names, the merge literal's key order holds,
  and `check:surface` is byte-identical. Neither renamed type reaches a package subpath.

**Decisions the plan makes:**
- The type is renamed `BulkDeleteSkippedAsset` rather than inlined. The sweep's F1 phrasing,
  "`BulkDeleteSkipped`-as-a-field", reads as eliminating the type, which is not available:
  `MediaBulkDeleteDialog.svelte:87` declares `function bulkSkipReason(skip: BulkDeleteSkip)`, so a
  named type has to exist. `BulkDeleteSkippedAsset` ends in a noun naming what the value is and
  carries "skipped" as an adjective rather than as the banned suffix.
  `convention-failure-suffix` bans `Refusal` and `Skip` as TYPE-NAME suffixes and states in its own
  text that "a discriminant VALUE like `'last-owner'` or a field name is not a suffix and is
  unaffected", so the `skipped` field keeps the concept and the type name stops carrying the suffix.
  The `BulkDelete` prefix is kept because the type's only consumers are the bulk-delete plan and its
  dialog.

**Steps:**
- [ ] **Step 1:** confirm the remaining media suites and the component suites pass unchanged, and
  capture `check:surface`.
- [ ] **Step 2:** create `content-routes-media-metadata.ts` with `createMediaMetadataActions` and
  its seven declarations. Re-source `content-routes.ts` and repoint
  `src/tests/component/CairnMediaLibrary.test.ts:20-23`, which imports the four metadata types; the
  `MediaUsageInfo` at `:19` is Task 4's. `content-routes-media.ts` is now empty of declarations and
  is deleted.
- [ ] **Step 3:** repoint every comment naming the retired file: `content-routes-shared.ts:9` (the
  `manifestRow` name-collision note, now naming the module that holds the block-scoped const),
  `guard.ts:117`, `sveltekit-barrel-prune.test.ts:26-28`,
  `docs/internal/admin-smoke-test.md:128`, and the shorthand lists in `content-routes.ts:8` and
  `content-routes-context.ts:4`.
- [ ] **Step 4:** rename `BulkDeleteSkip` to `BulkDeleteSkippedAsset` across its declaration and its
  seven use sites, including the import at `content-routes-media.ts:27`, which Task 5 already moved
  into `content-routes-media-delete.ts` beside `MediaBulkDeleteResult`, the only symbol that names
  the type; this task renames it there.
- [ ] **Step 5:** annotate the ruling rows whose module-home sentence this task's moves falsify,
  located by slug: `audit-sveltekit-bulkdeleteskip` (add a `- **Note (polish-11a, Task 6):**` line
  naming the rename to `BulkDeleteSkippedAsset`; the heading id, the row body, and the
  `Reopens on` line stay unchanged so `#`-anchors and the historical record both survive),
  `audit-sveltekit-mediaupdatefailure`, `audit-sveltekit-mediareplacefailure`,
  `audit-sveltekit-mediaaltpropagatefailure`, `audit-sveltekit-mediaaltpreviewentry`,
  `audit-sveltekit-mediaaltpreviewplan`, `audit-sveltekit-mediareplacepreviewentry`,
  `audit-sveltekit-mediareplacepreviewplan`, `audit-sveltekit-repointplacement`,
  `audit-sveltekit-altplacement`, `audit-sveltekit-usageentry`, and
  `convention-auth-loud-postures` (whose `content-routes-media.ts:494`, `:1065`, `:1265` anchors go
  dead). Re-grep with `grep -n "content-routes-media" docs/internal/engine-rulings.md` and annotate
  whatever survives. Progress-note `convention-failure-suffix` with the whole F1 rename set
  executed.
- [ ] **Step 6:** update `docs/internal/src-lib-map.md`. Append the `CHANGELOG.md` line. The full
  gate, with `check:rulings-format`, `check:reference`, `check:reference:signatures`, and
  `check:snippets` green and `check:surface` byte-identical. Commit.

**Acceptance criteria:**
- `createMediaMetadataActions(ctx)` returns exactly five members.
- `src/lib/sveltekit/content-routes-media.ts` does not exist after this commit.
- `content-routes-media-metadata.ts` imports no other cluster module.
- `grep -rn "BulkDeleteSkip\b" src docs packages examples scripts` returns nothing outside
  `docs/superpowers/`, `docs/internal/record/`, `docs/HISTORY.md`, and
  `docs/internal/engine-rulings.md`, whose hits survive in historical fields the annotation rule
  forbids rewriting, and whose `audit-sveltekit-bulkdeleteskip` row carries a
  `- **Note (polish-11a, Task 6):**` line naming the new type name. `grep -rn
  "BulkDeleteSkippedAsset" src` returns the declaration and its seven use sites.
- `grep -rn "content-routes-media\.ts" src docs scripts` and `grep -rn -- "-media\.ts" src docs`
  together return only history files under `docs/superpowers/`, `docs/internal/record/`,
  `docs/HISTORY.md`, and `docs/internal/engine-rulings.md`, whose hits the annotation rule
  preserves, plus the unrelated `editor-media.ts`, `resolve-media.ts` matches, which the report
  names. The report enumerates every `engine-rulings.md` hit line with the row heading it sits
  under, and each of those rows carries a `- **Note (polish-11a, Task 6):**` line naming the new
  module.
- The two media suites in the diff changed only their import path; every other media suite is not
  in the diff and passes.
- The merge literal's key order is unchanged and `check:surface` output is byte-identical.
- Each annotated ruling row carries a `- **Note (polish-11a, Task 6):**` line, no heading id
  changed, no field added that the row did not carry, and `check:rulings-format` passes.

**Commit:** one, `refactor(sveltekit): split the media metadata cluster and retire content-routes-media`.

---

## Task 7: The engine product copy

**Deliverables: four.** The two entry conflict refusals, the ten-string sibling sweep with its two
ruled changes, the `VocabularyAdmin.svelte` entry-vocabulary strings, and the two editors-page
quotes that `check:editor-quotes` grounds against the changed refusals.

**Files:**
- Modify: `src/lib/sveltekit/content-routes-entry-write.ts` (the two conflict refusals that were at
  the old `content-routes-entry.ts:922` and `:1013`),
  `src/lib/sveltekit/nav-routes.ts:155`, `src/lib/sveltekit/content-routes-settings.ts:156`,
  `src/lib/components/VocabularyAdmin.svelte`,
  `docs/editors/when-something-goes-wrong.md` (`:34` and `:39` with their surrounding sentences),
  `CHANGELOG.md`
- Read but expected unchanged, and named so the reviewer can check the sweep ran:
  `src/lib/sveltekit/content-routes-entry-destructive.ts` (the two `Reload and try again` strings
  that were at the old `:1266` and `:1481`), `src/lib/sveltekit/refusal-codes.ts:23`,
  `src/lib/sveltekit/content-routes-media-shared.ts` (the two message constants that were at the
  old `content-routes-media.ts:372` and `:378`), `src/lib/sveltekit/nav-routes.ts:128`,
  `src/lib/sveltekit/content-routes-settings.ts:403`, `src/lib/components/CairnHistory.svelte:56`,
  `docs/editors/when-something-goes-wrong.md:105` and `:119`
- Test: `src/tests/component/vocabulary-admin.test.ts` (`:37` asserts "A tag groups related
  posts." and `:46` asserts "8 posts"), plus any suite the grep finds asserting a changed string
- Baselines: `examples/showcase/e2e/admin-visual.spec.ts-snapshots/vocabulary-light-linux.png` and
  `vocabulary-dark-linux.png` move; see the paint protocol

**Interfaces:** none new. Every changed string is user-facing copy, not an exported symbol.

**Decisions the plan makes.** The spec names the four string sets and does not state the verdict
for each sibling, so the verdicts are settled here rather than at dispatch. The implementer applies
this table and does not re-derive it; the reviewer checks the report's verdicts against it.

- **The test:** "Reload" leaves a message only where reloading the screen would discard editor text
  the screen is holding. D11 names exactly that defect and names two strings.
- **The two D11 refusals change.** The file-changed refusal asks the editor to re-read the draft and
  save again; the edits-are-saved refusal asks them to publish again. Neither keeps the word
  "Reload".
- **The ten siblings, ruled:**

| Site | String | Verdict | Reason |
|---|---|---|---|
| `nav-routes.ts:155` | "The site config changed since you opened it. Reload and reapply your edits." | **change** | The nav menu editor holds an unsaved working copy, and "reapply your edits" is the message admitting the reload discards it. Same shape and same defect as the D11 file-changed refusal. |
| `content-routes-settings.ts:156` (`CONFIG_CONFLICT_MESSAGE`) | the same string | **change** | The settings form holds an unsaved working copy, for the same reason. |
| `CairnHistory.svelte:56` | "The history changed since this page loaded. Reload and try again." | keep | A read-only version list. The screen holds nothing the editor typed. |
| `content-routes-settings.ts:403` | "That vocabulary could not be read. Reload and try again." | keep | A read failure raised before an edit exists. |
| `nav-routes.ts:128` | "That navigation could not be read. Reload and try again." | keep | Same, a read failure before an edit exists. |
| `refusal-codes.ts:23` (`publish_conflict`) | "The site changed while publishing. Reload and try again." | keep | It is the copy for a NAVIGATING refusal: `content-routes-entry.ts:1112` throws `redirect(303, '?error=publish_conflict')`, so the editor screen is already gone when the message renders. |
| the old `content-routes-media.ts:372` (`MANIFEST_CONFLICT_MESSAGE`) | "The media manifest changed since you opened it. Reload and try again." | keep | The media library screen holds selections the server restores, not typed text. |
| the old `content-routes-media.ts:378` (`CONTENT_CONFLICT_MESSAGE`) | "The site changed since you opened it. Reload and try again." | keep | Its two call sites are `mediaReplaceAction` and `mediaAltPropagateAction`. The alt dialog types nothing: `MediaAltFillDialog.svelte:130` derives the pushed alt from the asset's stored alt (`altAsset?.alt`), so a reload restores exactly what the dialog had. |
| the old `content-routes-entry.ts:1266` | "This file changed since you opened it. Reload and try again." | keep | The delete confirmation holds no draft text. |
| the old `content-routes-entry.ts:1481` | the same string | keep | The rename dialog holds a slug field the server restores. |

  Two change and eight keep. The task re-greps `grep -rn "Reload" src/lib` to confirm the
  population is still exactly twelve strings and reports any twelfth-plus site as a stop condition.
- **`VocabularyAdmin.svelte`'s noun-sense "post" and "posts" become "entry" and "entries".**
  Measured, `grep -n "posts\?"` returns eighteen lines in three categories:
  - **Eleven user-facing copy lines, all changing:** `:162`, `:220`, `:223`, `:244`, `:278`,
    `:286`, `:299`, `:300`, `:301`, `:330`, `:347`.
  - **Two noun-sense comment lines, also changing**, because they carry the same drift and sit in a
    file the task already opens: `:11` ("a rename never rewrites a post") and `:16` ("tags already
    on posts").
  - **Five verb-sense lines, unchanged:** `:5`, `:46` ("a rejected posted list"), `:55`, `:60`,
    `:365`, where "post" or "posted" means submitting a form.
- **The editors page changes exactly two quotes.** `:34` quotes the D11 file-changed refusal and
  `:39` quotes the edits-are-saved refusal, and both change, so both quotes and the surrounding
  "Despite what this says, don't reload the page" sentence go with them. `:105` quotes
  `refusal-codes.ts:23` and `:119` quotes `CairnHistory.svelte:56`, both of which keep, so
  `check:editor-quotes` is already green on those two and they are NOT rewritten. Rewriting a quote
  whose string did not change is docs investment the spec's "gate-driven mechanical text" carve-out
  does not cover.

**Steps:**
- [ ] **Step 1:** the task before capture set, per the paint protocol, at this task's parent commit.
- [ ] **Step 2:** the failing test first. Change `src/tests/component/vocabulary-admin.test.ts:37`
  and `:46` to the entry wording and watch them fail. This is the whole test-first step; the
  editors-page half is not a test, because `check:editor-quotes` cannot fail until a source string
  has already changed, so the page edit is gate-driven follow-up in Step 5 rather than a failing
  test here.
- [ ] **Step 3:** the two entry conflict refusals and the two ruled sibling changes. Then read the
  remaining eight against the test and report the verdict for each; the expected outcome is the
  table above, and a disagreement is a stop-and-report, not a silent edit.
- [ ] **Step 4:** the `VocabularyAdmin.svelte` copy, with the eleven copy lines and the two
  noun-sense comment lines changed and the five verb-sense lines left alone. `check:prose` green.
- [ ] **Step 5:** the two editors-page quotes at `:34` and `:39` and their surrounding sentences.
  `check:editor-quotes` green.
- [ ] **Step 6:** the after capture set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, declare `INTENDED MOVES:` naming `vocabulary-light` and `vocabulary-dark` and
  the copy change that moves them and nothing else, regenerate those two baselines locally by file
  path with `CI=1 npx playwright test e2e/admin-visual.spec.ts --update-snapshots=changed`, and
  append the manifest rows under a new `## Polish-11a` heading in
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md` in this same commit.
  Report `TILE DIFF:` AE 0 for every captured surface and a `READ ME:` list naming the two
  regenerated baseline files plus at most ten capture tiles. Append the `CHANGELOG.md` line
  (product copy, no consumer action). The full gate. Commit.
- [ ] **Step 7:** hand to the conductor, which runs the CI baseline regen, waits, pulls, and reads
  the CI diff before run two launches.

**Acceptance criteria:**
- Neither of the two entry conflict refusals contains the word "Reload", and neither does
  `nav-routes.ts:155` or `content-routes-settings.ts:156`.
- The report carries a one-line verdict for each of the ten siblings and it matches the plan's
  table name for name; a disagreement is reported, not acted on.
- `grep -rn "Reload" src/lib` returns exactly eight strings after the change, all in the table's
  keep rows.
- `grep -n "posts\?" src/lib/components/VocabularyAdmin.svelte` returns exactly the five verb-sense
  lines, each named in the report.
- `src/tests/component/vocabulary-admin.test.ts` asserts the new strings and passes.
- `npm run check:editor-quotes` passes; `docs/editors/when-something-goes-wrong.md:34` and `:39`
  are in the diff and `:105` and `:119` are not.
- `npm run check:prose` passes.
- The only baselines in the diff are `vocabulary-light-linux.png` and `vocabulary-dark-linux.png`,
  the `INTENDED MOVES:` and `MOVED BASELINES:` lists match name for name, and the manifest carries
  their rows under `## Polish-11a` in the same commit.
- Every capture tile reports AE 0.
- No file under `packages/create-cairn-site` is in the diff.

**Commit:** one, `fix(copy): drop the misleading reload instruction and name entries, not posts`.

---

## Task 8: The CLI cost copy

**Deliverables: two.** The three drifted CLI strings and the confirmation that all four cost sites
read one story.

**Files:**
- Modify: `packages/create-cairn-site/src/scaffold.mjs:248-250`,
  `packages/create-cairn-site/src/cloudflare/chapter2.mjs:680`,
  `packages/create-cairn-site/src/cloudflare/catalogue.mjs:541-551`,
  `packages/create-cairn-site/src/money.mjs:32-34` only if the sweep finds it inconsistent,
  `CHANGELOG.md`
- Test: `packages/create-cairn-site/src/*.test.mjs` and
  `packages/create-cairn-site/src/cloudflare/*.test.mjs`, whichever pin the changed strings, found
  by grep

**Interfaces:** none new.

**Decisions the plan makes:** `money.mjs:32-34` already states decision 10 ("from the day you
deploy it") and is the reference the other three are brought to, rather than a fourth site to
change. If the sweep finds a real inconsistency in it, the task changes it and says why.

**Steps:**
- [ ] **Step 1:** re-verify the three anchors against the pulled post-regen head, since this is run
  two's first task. Grep the CLI test suites for each of the three strings and record which tests
  pin them. Change a pinned test to the new wording first and watch it fail.
- [ ] **Step 2:** rewrite the three strings so each says Workers Paid is needed from the first
  deploy, one plain instruction with no conditional. `scaffold.mjs`'s closing paragraph, the
  `chapter2.mjs` prompt, and the `catalogue.mjs` declined-branch message all follow decision 10.
- [ ] **Step 3:** read all four sites together and confirm they tell one story. Append the
  `CHANGELOG.md` line. The full gate, with `npm --prefix packages/create-cairn-site test` green.
  Commit.

**Acceptance criteria:**
- None of the three changed strings offers Workers Paid as a later or optional step.
- No CLI string says a site works, or a scaffold completes, without Workers Paid.
- All four cost sites, including `money.mjs`, are quoted in the report and agree.
- `npm --prefix packages/create-cairn-site test` passes, and any test pinning a changed string was
  changed first and is in the diff.
- No file outside `packages/create-cairn-site` and `CHANGELOG.md` is in the diff.

**Commit:** one, `fix(cli): state Workers Paid as a first-deploy cost in all three drifted strings`.

---

## Task 9: The doctor transcripts re-recorded

**Deliverables: four.** The two re-recorded fixtures, the fixtures README's second run record, the
`docs/admin/is-it-working.md` prose that quotes them, and D10's missing fifth router row.

**Files:**
- Modify: `packages/create-cairn-site/test/fixtures/transcripts/02-doctor-bare.txt`,
  `packages/create-cairn-site/test/fixtures/transcripts/03-doctor-credentialed.txt`,
  `packages/create-cairn-site/test/fixtures/transcripts/README.md` (rename its `## The run` heading
  at `:11` to `## The 2026-08-17 run` and add a `## The 2026-09-08 run` section beside it),
  `docs/admin/is-it-working.md` (`:24` and `:62` "three zone-derived checks",
  `:26` the quoted bare-run totals, `:53-58` the staleness apology, and the auth jump-list rows at
  `:150-153`), `CHANGELOG.md`

**Interfaces:** none new. `check:transcripts` resolves the page's
`<!-- transcript: ... -->` marker against the named fixture; the marker path is unchanged.

**Decisions the plan makes.** The spec names the outcome and not the method, and the method is
ruled here rather than left to the implementer.

- **Reuse the existing capture harness. Do not scaffold a fresh site.** The harness is
  `~/Projects/cairn-scratch/2026-08-16-capture/`: `ptycapture.py` (the 100-by-40 pty recorder),
  `drive.py` (the prompt-matched driver), `capture.sh` (whose modes are exactly
  `doctor-bare <site-dir>` and `doctor-cred <site-dir>`, with `env -u` strip lists for the no-fake
  preflight variables and the production `GITHUB_APP_*` credentials the fixtures README warns
  about), and the captured site tree `cairn-capture-scratch/`. The invocations are
  `./capture.sh 02-doctor-bare.txt doctor-bare cairn-capture-scratch` and
  `./capture.sh 03-doctor-credentialed.txt doctor-cred cairn-capture-scratch`.
- **Repoint that tree's engine dependency at this branch's build, which is the whole of "against
  the current tool".** Use `npm run link:consumer -- <site-dir>` from this worktree so the pack is
  content-hashed and verified. That is also what moves the dependency-floor line the page already
  forewarns about.
- **A fresh scaffold would produce different bytes, not fresher ones.** Both fixtures' last PASS
  line is the AI-posture check, and `src/lib/doctor/check-posture.ts` fetches `/robots.txt` off the
  deployed origin and skips when there is no origin, so an undeployed local scaffold yields a SKIP
  where both fixtures show a PASS, changing both totals lines, the counts quoted at
  `docs/admin/is-it-working.md:26`, and the page's narrative. The deployed site is still up
  (`GET https://cairn-capture-scratch.glw907.workers.dev/robots.txt` returned 200 on 2026-09-08),
  and reusing it also keeps `is-it-working.md:22`'s "a site named `cairn-capture-scratch`" true.
- **Credentials.** `capture.sh`'s `doctor-cred` mode requires both `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID` already exported. `CLOUDFLARE_API_TOKEN` is in `~/.local/secrets`, which
  is sourced for interactive shells only, so the task runs `source ~/.local/secrets` itself.
  `CLOUDFLARE_ACCOUNT_ID` is NOT in that file: it is `120c269ad6d3dfbe6d63a0bb53758ca0`, recorded
  in this repo's `CLAUDE.md`, and the task exports it directly. Both exports happen in an uncaptured
  step so no token reaches a captured command line. Never print either value.
- **The stop condition.** If the harness no longer runs, if the site tree or its deployment is
  gone, or if the credentialed mode fails for want of a credential the executor does not have, the
  task STOPS and reports what it found. It never edits a fixture to make the gate pass, never
  falls back to a fresh interactive scaffold (the recorded first capture needed a browser-approved
  GitHub App install, a `wrangler` OAuth sign-in, and a real deploy, none of which is available
  unattended), and never writes a substitute capture script. The never-edit rule is the fixtures
  directory's first rule and it outranks this task's completion.
- The staleness apology at `:53-58` is rewritten to describe what the new run actually predates,
  or removed if the new run predates nothing. The task states which and why.

**Steps:**
- [ ] **Step 1:** run `npm run check:transcripts` and `npm run check:readiness` and record them
  green against the current fixtures, so a later failure is attributable to this task.
- [ ] **Step 2:** confirm the harness runs and the site tree is present, then repoint
  `cairn-capture-scratch`'s `@glw907/cairn-cms` dependency at this branch's build with
  `npm run link:consumer`. Stop and report if either check fails.
- [ ] **Step 3:** `source ~/.local/secrets` and export `CLOUDFLARE_ACCOUNT_ID` in an uncaptured
  step, then run both capture modes. Run the README's secret sweep over both outputs before copying
  either in, and record the sha256 of each new fixture.
- [ ] **Step 4:** copy both fixtures in unedited. Update `docs/admin/is-it-working.md`'s quoted
  fence to the new credentialed transcript, its quoted bare-run totals at `:26` to the new bare
  run's totals, its "three zone-derived checks" prose at `:24` and `:62` to whatever the new run
  shows, and its staleness paragraphs at `:53-58`.
- [ ] **Step 5:** add the fifth auth row to the router jump list at `:150-153`, naming
  `auth.store-unmigrated` beside the four already there (D10).
- [ ] **Step 6:** rename the README's `## The run` heading to `## The 2026-08-17 run` in the same
  edit, then write the new `## The 2026-09-08 run` section: date, tool commit, site, the harness
  path and its two modes, invocation table, the two environments, and the secret sweep result.
  Append the
  `CHANGELOG.md` line. The full gate, with `check:transcripts`, `check:readiness`, `check:symbols`,
  and `check:vale` green. Commit.

**Acceptance criteria:**
- Neither fixture contains `Zone HSTS`. The string is gone from `src/lib/doctor/` entirely, so a
  real re-record satisfies this and a fabricated one cannot.
- The report names the exact capture command for each fixture, the working directory it ran in, and
  the sha256 of each committed fixture, and states that no byte was edited after capture.
- `docs/admin/is-it-working.md`'s quoted fence matches the new `03-doctor-credentialed.txt` under
  `check:transcripts`, and its quoted bare-run totals at `:26` match the new
  `02-doctor-bare.txt`'s last totals line.
- The page's zone-check count in prose equals the number of zone-derived checks the new
  transcript shows.
- The auth jump list names five condition ids including `auth.store-unmigrated`, and
  `check:readiness` passes.
- The fixtures README carries `## The 2026-08-17 run` and `## The 2026-09-08 run`, the older
  heading renamed from `## The run` in the same edit, and the new section carries the same fields
  as the older one plus the harness path and the two mode names.
- No secret value appears in either fixture or in the report, and the report names the sweep
  patterns run.

**Commit:** one, `fix(docs): re-record both doctor transcripts against the current tool`.

---

## Task 10: Engine Svelte lint wiring

**Deliverables: two.** The widened ESLint glob with its corrected comment, and the eleven gate
errors cleared.

**Files:**
- Modify: `eslint.config.js` (the `.svelte` block's `files` glob at `:80` and the block comment
  at `:74-78`, which says today that the glob "would otherwise reach src/lib/components too"),
  `src/lib/components/ComponentForm.svelte`, `src/lib/components/ComponentInsertDialog.svelte`,
  `src/lib/components/DeleteDialog.svelte`, `src/lib/components/MarkdownEditor.svelte`,
  `src/lib/components/RenameDialog.svelte`, `src/lib/components/ShareLinkPanel.svelte`,
  `CHANGELOG.md`

**Interfaces:** none new. `check:comments` runs
`eslint src/lib examples/showcase/src examples/showcase/e2e`, so widening the block's `files` glob
is sufficient; the command line does not change.

**Decisions the plan makes:** the widened glob is
`['examples/showcase/src/**/*.svelte', 'src/lib/components/**/*.svelte']`, keeping the same four
rules the block carries today (`house/no-em-dash-in-comments`, `jsdoc/no-types`, `tsdoc/syntax`,
`jsdoc/informative-docs` at `warn`). No rule is added, promoted, or demoted. `informative-docs`
stays a warning, which is why the 317-comment register sweep is not gated and is not this task.

**Steps:**
- [ ] **Step 1:** widen the glob and run `npm run check:comments`, recording the failure. The
  measurement at plan authoring is eleven `tsdoc/syntax` errors across six files
  (`ComponentForm.svelte:154,155`, `ComponentInsertDialog.svelte:206` twice,
  `DeleteDialog.svelte:56` twice, `MarkdownEditor.svelte:129`, `RenameDialog.svelte:49` twice,
  `ShareLinkPanel.svelte:51,52`) and zero warnings. Report the count the run actually produces.
- [ ] **Step 2:** clear each error by fixing the comment's TSDoc syntax, never by relaxing a rule,
  never by an inline disable, and never by deleting the sentence the comment carries. A code span
  gains its closing backtick, a brace or angle bracket is escaped, and the comment keeps saying
  what it said.
- [ ] **Step 3:** rewrite the block comment so it states the new scope and the reason the engine's
  components are in it. Append the `CHANGELOG.md` line. The full gate, with `check:comments` green.
  Commit.

**Acceptance criteria:**
- `eslint.config.js`'s `.svelte` block globs both `examples/showcase/src/**/*.svelte` and
  `src/lib/components/**/*.svelte`, and its comment no longer says the glob avoids the engine's
  components.
- `npm run check:comments` passes.
- The diff contains no `eslint-disable` comment and no rule severity change.
- Every changed comment still carries the same content it did before, verifiable line by line in
  the diff.
- The report names the error count the widened glob produced and confirms it matches the files
  changed.

**Commit:** one, `chore(lint): bring the engine's Svelte components under the comment gate`.

---

## Task 11: JSDoc residuals

**Deliverables: four.** F4's cross-reference, F5's six paraphrases, F6's two undocumented member
lists, and F2's barrel sentence.

**Files:**
- Modify: `src/lib/delivery/site-indexes.ts` (the `createSiteIndexes` doc block, whose
  `createSiteResolver` sentence sits at `:34-35`), `src/lib/delivery/responses.ts` (`:9`, `:16`,
  `:23`), `src/lib/delivery/feeds.ts` (`:7`, `:100`),
  `src/lib/sveltekit/content-routes-list.ts` (`:34`),
  `src/lib/delivery/public-routes.ts` (`EntryData` at `:54`, its eight members),
  `src/lib/media/manifest.ts` (`MediaEntry` at `:13`, its twelve members),
  `src/lib/sveltekit/index.ts` (the barrel sentence at `:114`), `CHANGELOG.md`

**Interfaces:** no signature changes, and **no reference page is touched.**
`scripts/checks/check-reference-signatures.mjs` renders each export's real signature through the
TypeScript compiler API and compares it against the page's fenced declaration; it does not read doc
prose. Task 11 changes doc comments only, so no `docs/reference/*.md` edit is implied and a
reference page in this diff is a finding.

**Decisions the plan makes:**
- F2 is resolved by amending the barrel sentence, per the spec's Shape paragraph, never by a
  re-export. The amended sentence names the two documented exceptions by name:
  `PublicRoutesConfig`, which `previewLoad`'s second parameter names
  (`src/lib/sveltekit/preview.ts:431`), and `EntryData`, which `PreviewData` extends
  (`preview.ts:221`). Both live on `/delivery`, and `docs/reference/sveltekit.md:1310` already
  cross-links them.
- F5's six one-liners state what the helper fixes that a caller otherwise gets wrong: for the three
  response helpers, the exact `Content-Type` with its charset and the fact that no cache header is
  set; for `FeedChannel`, what the caller must supply absolutely; for `buildJsonFeed`, what it
  returns and what it does not do; for `ListData`, what the list view reads from it. The two
  siblings that already do this, `robotsResponse` at `:30` and `markdownResponse` at `:38`, are the
  house pattern to match.
- F6's `MediaEntry` member docs say what it carries that `MediaLibraryEntry` drops, `sha256` and
  `originalFilename`, and why a caller reaches for each. `EntryData` has eight members, not the
  sweep's seven: `concept`, `entry`, `html`, `canonicalUrl`, `seo`, `newer?`, `older?`, and
  `heroImage?`, the last already documented.

**Steps:**
- [ ] **Step 1:** F4. Replace the `createSiteResolver` cross-reference with the behavior it
  describes, so a consumer reading the shipped `.d.ts` is not sent to a name they cannot import.
- [ ] **Step 2:** F5. Rewrite the six one-liners to state the contract, matching the two siblings
  that already do. Run `npm run check:comments` and confirm `jsdoc/informative-docs` no longer
  flags them.
- [ ] **Step 3:** F6. Document `EntryData`'s eight members and `MediaEntry`'s twelve, each saying
  the reason the projection exists rather than restating its type.
- [ ] **Step 4:** F2. Amend the barrel sentence at `src/lib/sveltekit/index.ts:114` to name the two
  documented cross-subpath exceptions. Add no export.
- [ ] **Step 5:** append the `CHANGELOG.md` line. The full gate, with `check:comments`,
  `check:reference`, `check:reference:signatures`, and `check:surface` green and `check:surface`
  byte-identical. Commit.

**Acceptance criteria:**
- `createSiteIndexes`'s doc block does not contain the string `createSiteResolver`.
- None of the six F5 doc comments restates its symbol's name, and each names the behavior the
  caller would otherwise get wrong.
- Every member of `EntryData` and of `MediaEntry` carries a doc comment, and `MediaEntry`'s block
  names `sha256` and `originalFilename` as what `MediaLibraryEntry` drops.
- The `/sveltekit` barrel sentence names `PublicRoutesConfig` and `EntryData` as its two
  exceptions, and `src/lib/sveltekit/index.ts` gains no `export` statement.
- No file under `docs/reference/` is in the diff.
- `check:surface` output is byte-identical and `docs/internal/api-surface.md` is not in the diff.
- `npm run check:comments`, `check:reference`, and `check:reference:signatures` pass.

**Commit:** one, `docs(jsdoc): close the four export-doc residuals the family read found`.

---

## Task 12: The state-reset coverage regex

**Deliverables: one.** The generic-comma gap closed, proven by a failing test first.

**Files:**
- Test: `src/tests/unit/edit-page-state-reset-coverage.test.ts` (the `parseDeclaredStateNames`
  pattern at `:47`, its doc comment at `:39-45`, and the
  `parseDeclaredStateNames widened declaration shapes` describe block at `:146-166`)
- Modify: `CHANGELOG.md`

**Interfaces:** `parseDeclaredStateNames(source: string): string[]` keeps its exported signature.

**Decisions the plan makes:** the fix widens the optional type-annotation run so it may contain a
comma inside balanced angle brackets, and keeps refusing a comma at depth zero, which is what
separates one declarator from the next on a multi-declarator `let`. The current pattern's
`(?::[^=,]+)?` excludes every comma, so a declaration such as
`let picked: Map<string, number> = $state(new Map())` is invisible to the gate, which is the gap.
The doc comment above the function currently claims the exclusion is what keeps the pattern from
crossing a generic comma; the comment is rewritten to state the real rule.

**Steps:**
- [ ] **Step 1:** add a failing case to the `widened declaration shapes` describe block asserting
  that `parseDeclaredStateNames('let picked: Map<string, number> = $state(new Map());\n')` returns
  `['picked']`. Run it and record the failure.
- [ ] **Step 2:** widen the pattern so the case passes, and confirm the four existing cases in that
  describe block still pass unchanged, in particular the multi-declarator case
  `let a = $state(1), b: number = $state(2)` returning `['a', 'b']`.
- [ ] **Step 3:** rewrite the function's doc comment to state the rule the pattern now implements.
  Append the `CHANGELOG.md` line. The full gate, with the whole suite green against the three real
  source files it walks. Commit.

**Acceptance criteria:**
- The new case is in the diff and the diff shows it added before the pattern change.
- The four pre-existing cases in the describe block are unchanged and pass.
- The suite's real-source assertions over `EditPage.svelte`, `tidy-controller.svelte.ts`, and
  `figure-editor.svelte.ts` pass with no change to those three files.
- The function's doc comment no longer claims the pattern excludes commas to avoid a generic
  comma.
- No file outside the test file and `CHANGELOG.md` is in the diff.

**Commit:** one, `test(coverage): match a generic comma in the state-reset declaration regex`.

---

## Task 13: Records (last)

**Deliverables: four.** The HISTORY entry with the retro-numbering, the ROADMAP sub-bullets this
pass shipped, the friction-log triage with the register sweep filed, and the ledger dead-path
verification plus a final read of the `## Unreleased` block.

**Files:**
- Modify: `docs/HISTORY.md` (the 11a entry, newest first; the chassis-B1 heading at `:10`
  retro-numbered 9a; the identity-seam heading at `:54` retro-numbered 10; chassis-B2's heading
  numbered 9b if it carries no number), `ROADMAP.md` (the polish sub-bullets this pass shipped,
  closed by name; the component-comment register sweep filed to the Later tier),
  `docs/internal/docs-friction-log.md` (verified still empty, or triaged if a task filed
  something), `docs/internal/engine-rulings.md` (only if the verification grep finds a row a split
  task missed), `CHANGELOG.md` (a final read, no new entry)

**Interfaces:** none.

**Decisions the plan makes:**
- The two ROADMAP sub-bullets this pass closes by name are the `logCommitFailed` call-style
  contradiction (`ROADMAP.md:353-355`; Task 4 gave the ingest module the direct import) and the
  engine Svelte lint wiring (`:358`; Task 10). No other polish sub-bullet is closed here, because
  11b and polish-C ship the rest.
- The register sweep filed to ROADMAP Later is stated as a count and a trigger, not a promise, and
  the trigger is the UNPARSED comment population now brought under the parser, not a set of exposed
  warnings. Measured, widening the glob produces eleven errors and **zero**
  `jsdoc/informative-docs` warnings, so a filing that cited exposed warnings would cite nothing.
- If a task filed a friction entry, this task triages it complete-or-move rather than leaving it,
  which is the log's own rule.
- `docs/extend/migration-notes.md` is not written. See the Ruled inputs block.

**Steps:**
- [ ] **Step 1:** write the `docs/HISTORY.md` entry for 11a: what landed, what the gate caught, and
  what a later pass would be wrong to rediscover from scratch. Retro-number the chassis-B1 and
  identity-seam headings, and chassis-B2's if it carries no number.
- [ ] **Step 2:** close the two ROADMAP sub-bullets by name and remove them from the live tier;
  file the register sweep to Later.
- [ ] **Step 3:** re-read both sections of the friction log and record them empty, or triage what
  is there.
- [ ] **Step 4:** the ledger dead-path verification. Run
  `grep -n "content-routes-entry\.ts\|content-routes-media\.ts" docs/internal/engine-rulings.md`
  and confirm every row a hit sits under carries a `- **Note (polish-11a, Task N):**` line naming
  the new module. The hits themselves survive in the rows' historical fields, which the annotation
  rule forbids rewriting. Annotate any row a split task missed, in this commit, using the same
  format.
- [ ] **Step 5:** read the whole `## Unreleased` block and confirm every one of the twelve task
  entries is present and that none carries a `Consumers must:` line. Do not touch `package.json`.
  The full gate, with `check:docs`, `check:vale`, `check:version`, and `check:rulings-format` green.
  Commit.

**Acceptance criteria:**
- `docs/HISTORY.md` carries an 11a entry naming slice 11a, and the chassis-B1 and identity-seam
  headings carry 9a and 10.
- `ROADMAP.md` no longer lists the `logCommitFailed` call-style contradiction or the engine Svelte
  lint wiring in any live tier, and carries the register sweep in Later with the unparsed-population
  trigger rather than a warning count.
- `docs/internal/docs-friction-log.md` has no untriaged entry.
- Every ruling row naming `content-routes-entry.ts` or `content-routes-media.ts` carries a
  `- **Note (polish-11a, Task N):**` line naming the new module, and `check:rulings-format` passes.
- `CHANGELOG.md`'s `## Unreleased` block carries an entry from each of Tasks 1 through 12, and the
  string `Consumers must:` appears nowhere in this pass's additions.
- `package.json` is not in the diff, `git tag --points-at HEAD` is empty, and no release exists.
- `docs/STATUS.md` and `docs/extend/migration-notes.md` are not in the diff.

**Commit:** one, `docs: close polish-11a's records and retro-number the chassis and seam slices`.

---

## Gate

Run this exact string at the end of every task, in the worktree, with nothing else bound to port
4173.

```
npm run package && npm run check && npm test && publint --strict && attw --pack . --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error && node scripts/checks/check-package-files.mjs && node scripts/checks/check-skill-budget.mjs && node scripts/checks/reference-coverage.mjs && node scripts/checks/check-reference-signatures.mjs && node scripts/checks/check-surface.mjs && node scripts/checks/check-surface-leaks.mjs && node scripts/checks/check-self-use.mjs && node scripts/checks/check-custom-surface.mjs && npm run check:chassis-boundary && npm run check:cm-internals && npm run check:idioms && node scripts/checks/check-invisible-craft.mjs && node scripts/checks/check-admin-css-classes.mjs && node scripts/checks/check-readiness.mjs && npm run check:docs && npm run check:rulings-format && npm run check:target-stack && npm run check:arm-indexes && npm run check:editor-quotes && node scripts/checks/check-visuals.mjs && npm run check:transcripts && npm run check:symbols && node scripts/checks/check-snippets.mjs && npm run check:prose && npm run check:version && npm run check:dev-package && npm run check:template && node scripts/checks/check-consumers.mjs && npm run test:emit && npm --prefix packages/create-cairn-site run prepack && npm --prefix packages/create-cairn-site test && npm --prefix examples/showcase run check && npm --prefix examples/showcase run test:unit && npm --prefix examples/showcase run format:check && npm run check:vale && npm run check:comments && CI=1 npm --prefix examples/showcase run test:e2e
```

**It is the CI-derived list, not a shorter one.** The list is derived from the committed
`.github/workflows/` at `ac911ec3` and includes the six CI-only gates a local ritual skips
(`check:comments`, `check:surface`, `check:snippets`, `check:transcripts`, `check:symbols`,
`check:reference:signatures`), plus `check:rulings-format`, which the spec names explicitly because
it is in neither `npm run check` nor `npm test` and is the only gate over `engine-rulings.md`. No
check is dropped for cost; the spec forecloses that.

**What changed is the wrapper, not the list.** Twelve of the npm scripts in the derived list chain
`npm run package` as a prerequisite (`check:package`, `check:reference`,
`check:reference:signatures`, `check:surface`, `check:self-use`, `check:custom-surface`,
`check:invisible-craft`, `check:admin-css-classes`, `check:readiness`, `check:visuals`,
`check:snippets`, `check:consumers`), so the original string built the package thirteen times per
run. Each of the twelve is `npm run package && node scripts/checks/<name>.mjs`, except
`check:package`, which is `npm run package && publint && attw && check-package-files &&
check-skill-budget`. None of the underlying scripts rebuilds: `check-package-files.mjs` shells out
only to `execFileSync` for its own listing and `check-consumers.mjs` spawns the showcase's
`npm run check` and `npm run check:dev-package`, neither of which packages. The string above
therefore runs `npm run package` ONCE at the head and invokes each dependent check at its node
entry point, in the derived order, against the same artifact. Every check still runs.

**Expected wall clock per gate: 16 to 28 minutes.** The basis is the executor lens's measurement of
the original string, 25 to 40 minutes, of which 9 to 13 was the repeated packaging (40 to 60 seconds
per build, twelve redundant builds). Removing twelve builds removes 8 to 12 minutes. The figure is
derived rather than re-timed on this checkout, because a `npm run package` in the main checkout
writes the `dist/` that a live chassis-B2 worktree's showcase resolves through, and building it
while B2's gate runs would corrupt B2's proof. The executor times its own first gate and reports
the actual figure.

`npm run check` must report 0 errors and 0 warnings, and `npm test` must exit 0; both are the floor
rather than the whole gate. `npm test` already runs the component suite, so no task claims to add
it. The CLI suite and `check:template` run per task, because a file move can carry pinned text.

**Left to CI, deliberately.** `design.yml` (`check:public-tokens`, `test:reskin`, the styleguide
e2e), `norms.yml` (`norms:check`), `scaffold.yml` and `create-site.yml` (the packed-tarball scaffold
proofs), `tsgo.yml` (`svelte-check --tsgo`), and `publish.yml`. None of them is skipped as
unimportant; each needs a clean checkout, a browser matrix, or a full pack that a per-task local
loop cannot afford, and the PR's own CI run is the gate that clears them. Nothing merges on a red
CI.

**The pass-end run uses the npm-script form**, the original string with `npm run check:package` and
its eleven siblings called through their wrappers, so the wrappers themselves are proven at least
once before merge.

---

## Rollback and halt semantics

Every task and every commit boundary ends with the full gate green and `check:surface`
byte-identical, so the branch is mergeable at each of the fourteen commits, including the
intermediate one inside Task 3 (the destructive split landed, `content-routes-entry.ts` still
holding revert) and at each media boundary (Task 4 landed, `content-routes-media.ts` still holding
delete and metadata; Task 5 landed, still holding metadata). That is a real property of this plan
and it is the reason the splits are ordered first.

A halt inside Tasks 1 to 6 does not block 11b, whose file set is `src/lib/components/*` plus
`examples/showcase/src/routes/admin/*` and which depends on nothing 11a produces in code. What a
halt does break is the hand-forward: a merged half-split gives polish-C a module map that does not
match the nine names below, and polish-C's plan is authored from that block. **Polish-C therefore
re-derives the module map from the tree rather than quoting the hand-forward**, and the hand-forward
is its cross-check, not its source.

The split-boundary state at each halt point, so a resuming session knows what it has:

- After Task 1: `content-routes-entry.ts` holds write, destructive, revert; four helpers live in
  `content-routes-shared.ts`.
- After Task 2: it holds destructive and revert.
- After Task 3 commit one: it holds revert only. After commit two it does not exist.
- After Task 4: `content-routes-media.ts` holds delete, orphans, and metadata; the primitives live
  in `content-routes-media-shared.ts`.
- After Task 5: it holds metadata only. After Task 6 it does not exist.

---

## Pass-end ritual

1. **`code-simplifier`** over the code this pass changed, before the final commits. Apply its
   refinements, then re-run the gate.
2. **The full gate** above, green, in one uninterrupted run, in the npm-script form so the wrappers
   are proven.
3. **The six CI-only gates** confirmed green inside that run: `check:comments`, `check:surface`,
   `check:snippets`, `check:transcripts`, `check:symbols`, `check:reference:signatures`.
   `check:surface` must still be byte-identical to `main`'s, since no task updates it.
4. **The from-scratch consumer build.** A fresh `npm install` in the worktree's
   `examples/showcase`, then `npm --prefix examples/showcase run build` and the e2e suite, so the
   proof is against this branch's engine and not `main`'s symlinked build.
5. **The second CI regen**, at pass end, and its diff read.
6. **The reviewer fan-out**, named per what this pass touches:
   `cloudflare-workers-reviewer` on the nine new route modules, since every one of them is Worker
   code reading D1, R2, and the GitHub backend; `web-auth-security-reviewer` on the same nine,
   since the content routes carry the CSRF and editor guards and the split moves every one of them;
   and `svelte-reviewer` on the `.svelte` files this pass changed
   (`VocabularyAdmin.svelte`, `CairnMediaLibrary.svelte`, the four media dialogs and
   `MediaOrphanTools.svelte`, `FragmentPicker.svelte`, and the six components Task 10 edits).
   `daisyui-a11y-reviewer` does not run: no task changes markup, classes, or ARIA, and 11b owns the
   admin surface.
7. **Docs the spec assigns to this pass**, confirmed present:
   `docs/editors/when-something-goes-wrong.md` (Task 7, gate-forced, exactly two quotes),
   `docs/admin/is-it-working.md` (Task 9, gate-forced), `docs/reference/components.md` and
   `docs/reference/sveltekit.md` (Task 5, the renamed internal type in generated text),
   `docs/internal/src-lib-map.md` (Tasks 1, 3, 4, 5, 6), and no other published page.
8. **`CHANGELOG.md` under `## Unreleased`**, finalized. **11a is non-breaking, so no entry carries a
   `Consumers must:` line**, and the absence is itself a checked acceptance in Task 13.
9. **`docs/extend/migration-notes.md` is untouched.** The window carries no consumer action and
   polish-C's task 10 reconciles the whole section.
10. **`docs/HISTORY.md`** carries the 11a entry with the retro-numbering (Task 13).
11. **`ROADMAP.md`** has the two shipped sub-bullets closed and removed from their live tier, and
    the register sweep filed to Later (Task 13).
12. **The friction log** triaged whole in Task 13, complete-or-move, not appended to.
13. **The ledger** carries no row naming a dead module path (Task 13's verification grep).
14. **The conductor writes `docs/STATUS.md`** at merge, never a task.
15. **No version bump, no tag, no publish.** The window holds for polish-C's single cut.
    **Geoff merges.**

---

## What this pass hands forward

- **To polish-11b:** a stable `src/lib/sveltekit/*` file set, so 11b's admin work never collides
  with a moving module; `content-routes-shared.ts` as the established home for a cross-cluster
  helper; and the showcase's `admin/signups` exemplar untouched, with B2's deliberate-keep comment
  at `:26-28` still in place for 11b's task 10 to name and overrule.
- **To polish-11b, a new gate on its own work.** Task 10 widens `eslint.config.js`'s `.svelte` glob
  to `src/lib/components/**/*.svelte` with `tsdoc/syntax` at error. From 11a on, every 11b task
  that writes a comment in an admin component fails `check:comments` unless it is TSDoc-clean. 11b
  is twelve tasks of admin-component work, so this is the constraint most likely to surprise it.
- **To polish-11b, the files 11a reopens.** 11a touches about fifteen files under
  `src/lib/components/`: `FragmentPicker.svelte` (Task 1), `CairnMediaLibrary.svelte`,
  `MediaOrphanTools.svelte`, `media-library-helpers.ts`, `MediaBulkDeleteDialog.svelte`,
  `MediaAltFillDialog.svelte`, `MediaReplaceDialog.svelte`, `media-upload-outcome.ts` (Tasks 4 to
  6), `VocabularyAdmin.svelte` (Task 7), and the six Task 10 edits. Two of those six,
  `ShareLinkPanel.svelte` and `MarkdownEditor.svelte`, are the same files 11b's tasks 5 and 1
  rewrite. The spec's disjointness premise (`polish-passes-design.md:325-328`) is false on this
  point; the passes are sequential, so it is a re-read, not a conflict.
- **To polish-11b:** the two design-system items 11a does not touch, `ShareLinkPanel`'s busy idiom
  and `formatTimestamp`'s accept set, both still open in the ledger.
- **To polish-C, the module map with its export lists.** Polish-C renames symbols that live in these
  modules, so filenames alone are not enough. The nine modules are
  `content-routes-entry-read.ts` (`createEntryReadActions`, `EditData`, `FragmentTarget`,
  `CreateFailure`, `resolvePreview`, `retiredContentAdvisory`, `commaListParam`),
  `-entry-write.ts` (`createEntryWriteActions`, `saveToBranch`, `saveRefusal`, `SaveHold`,
  `SaveFailure`), `-entry-destructive.ts` (`createEntryDestructiveActions`, `deleteEntry`,
  `RenameFailure`, `DeleteFailure`), `-entry-revert.ts` (`createEntryRevertActions`,
  `draftExistsFailure`, `revertSchemaDrift`, `BUILTIN_FRONTMATTER_KEYS`),
  `content-routes-media-shared.ts` (the fifteen primitives plus `distinctEntryCount`),
  `-media-library.ts` (`createMediaLibraryActions`, `MediaLibraryData`, `MediaUsageInfo`, the
  `MediaLibraryEntry` re-export), `-media-ingest.ts` (`createMediaIngestActions`, `ingestAndStore`,
  `UploadResult`, `MediaUploadFailure`), `-media-delete.ts` (`createMediaDeleteActions`,
  `MediaDeleteFailure`, `MediaBulkFailure`, `MediaBulkDeleteResult`, `MediaOrphanPurgeResult`,
  `originRank`, `branchKey`), and `-media-metadata.ts` (`createMediaMetadataActions` and its seven
  types), with four helpers added to `content-routes-shared.ts` (`draftFromBranchHead`,
  `commitEditorName`, `HISTORY_LIMIT`, `invalidIdMessage`). Polish-C re-derives this from the tree
  and uses the list as a cross-check.
- **To polish-C, two gate literals that now carry the new names.** `RETIRED_CORE_ARMS` and
  `RETIRED_TIER1` in `src/tests/unit/sveltekit-barrel-prune.test.ts` name `DeleteFailure` and
  `MediaDeleteFailure` after this pass, so polish-C's own renames update them a second time. A
  stale literal there leaves the gate asserting nothing.
- **To polish-C:** `DeleteFailure`, `MediaDeleteFailure`, and `BulkDeleteSkippedAsset` as settled
  names, so the breaking window does not rename them again.
- **To polish-C:** an `## Unreleased` block whose entries carry no `Consumers must:` line, which is
  what lets polish-C's task 10 reconcile the whole migration-notes section against a window whose
  actionable lines all come from earlier passes and from C itself.
- **To the docs rewrite:** two published pages already true, `when-something-goes-wrong.md` and
  `is-it-working.md`, and two re-recorded doctor fixtures, so the harvest's verbatim fence read
  does not re-emit a stale transcript.
- **Release:** the window holds. ONE cut, after polish-C.

---

## Post-mortem

The `cairn-pass` ritual appends the post-mortem here at pass close, scoring both budgets against
the ceiling and the interaction counts.
