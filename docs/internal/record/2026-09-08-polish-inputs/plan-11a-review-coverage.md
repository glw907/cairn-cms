# Polish-11a plan review, coverage and grounding lens

Adversarial read of `docs/superpowers/plans/2026-09-08-polish-11a-pass.md` (uncommitted, on disk) against
`docs/superpowers/specs/2026-09-08-polish-passes-design.md` revision 4 and the two sweeps it executes,
with every anchor re-measured on `main` at `ac911ec3`. Fresh context, read-only, nothing built or edited
outside this file. Coverage is close to complete: every spec task, every Dispositions row routed to 11a,
and every sweep finding the spec assigns to 11a has a plan task and an acceptance criterion, and the plan
carries nothing the spec does not route to it, so the "polish takes nothing the sweeps did not find" bound
holds. Grounding is strong on the line anchors: all forty-plus `file:line` claims sampled across Tasks 1
to 12 resolve to what the plan says they hold, and four of the plan's five stated corrections to the spec
reproduce exactly. The defects are concentrated in the media split, where the plan repeats a cluster
assignment from the exports sweep that measurement contradicts, and in three acceptance criteria that
cannot pass as written.

## Ranked findings

**1. Plan:489 (Task 4 Interfaces) -- the library module's declared population is wrong for three of its
five members, and the error propagates into Task 5.** The plan gives
`content-routes-media-library.ts` `MediaLibraryData`, `MediaUsageInfo`, `originRank`, `branchKey`, and
`distinctEntryCount`. Measured on `ac911ec3`, `originRank` is called only at
`src/lib/sveltekit/content-routes-media.ts:745` and `branchKey` only at `:745`, both inside
`mediaDeleteAction` (`:695-805`), which is Task 5's delete cluster, not Task 4's library read;
`distinctEntryCount` is called at `:473` (library) and `:735` (delete), so it is cross-cluster.
`mediaLibraryLoad` (`:412-496`) calls only `distinctEntryCount` (`:473`) and `MediaUsageInfo` (`:465`).
Correction: `originRank` and `branchKey` move to `content-routes-media-delete.ts` and
`distinctEntryCount` to `content-routes-media-shared.ts`. As written, Task 4 lands two delete-cluster
helpers in the library module and Task 5's delete module then imports from a sibling cluster module,
which is exactly the cross-module dependency the plan's own partition rule (Plan:499-503) forbids.

**2. Plan:534, :577-581 (Task 5 deliverable four) -- the `logCommitFailed` direct import is routed to the
wrong task.** The plan says "both new media modules import `logCommitFailed` directly ... replacing the
single `ctx.logCommitFailed(commitFields, err)` bound-method call at the old
`content-routes-media.ts:668`". Measured: that call sits at `src/lib/sveltekit/content-routes-media.ts:668`,
inside `mediaLibraryUploadAction` (`:644-694`), which is the INGEST cluster Task 4 creates
(`content-routes-media-ingest.ts`), and it is the only `ctx.logCommitFailed` call in `src/lib`
(`grep -rn "logCommitFailed" src/lib`). Neither of Task 5's two modules contains it. Correction: the
deliverable belongs to Task 4 with `content-routes-media-ingest.ts` named as the importer; Task 5's
acceptance `grep -rn "ctx.logCommitFailed" src/lib` returns nothing would otherwise pass on work Task 4
did silently, with Task 4 carrying no acceptance for it. The `ContentRoutesContext` half of the claim is
accurate: `content-routes-context.ts:420` publishes `logCommitFailed`.

**3. Plan:447 (Task 3 acceptance) -- `grep -rn "DeleteRefusal" src` cannot return nothing at the end of
Task 3.** `MediaDeleteRefusal` contains the substring and is renamed only in Task 5. At Task 3's second
commit the grep still returns `src/lib/sveltekit/content-routes-media.ts:88,118,714,732,751`,
`src/lib/components/CairnMediaLibrary.svelte:29`, `src/tests/component/CairnAdmin.test.ts:293`,
`src/tests/component/CairnMediaLibrary.test.ts:656`, and
`src/tests/unit/sveltekit-barrel-prune.test.ts:31`. Correction: anchor the grep,
`grep -rnE "(^|[^a-zA-Z])DeleteRefusal" src`, or scope it to the entry modules.

**4. Plan:397-399, :551-552 -- the split leaves about twenty-four closed ruling rows naming a module home
that no longer exists, and the plan routes three.** `grep -n "content-routes-media\.ts\|content-routes-entry\.ts"
docs/internal/engine-rulings.md` returns 26 hits across roughly 24 distinct rows, most of them
`audit-sveltekit-*` retire rows whose `Reopens on` field states that the interface "keeps its module-level
`export` in `content-routes-media.ts`" (for example `audit-sveltekit-mediauploadfailure` at `:1625`,
`audit-sveltekit-repointplacement` at `:1499`, `audit-sveltekit-altplacement` at `:1506`,
`audit-sveltekit-mediausageinfo` at `:1788`, `audit-sveltekit-uploadresult` at `:1802`,
`audit-sveltekit-fragmenttarget` at `:1751`). The plan touches only `:1615`, `:1681`, `:1780`, and
`convention-failure-suffix`. Polish-C's task 9 does not catch the remainder either: the spec scopes it to
"every ruling row whose subject this window RENAMES", and these rows' subjects are not renamed, only
re-homed. Correction: either add a Task 3 and Task 5 deliverable annotating every row whose module-home
sentence the split falsifies, or state the deferral explicitly with the row count.

**5. Plan:603-604 (Task 5 Step 4) and Plan:619 (acceptance) -- `audit-sveltekit-bulkdeleteskip` is
unrouted while the acceptance grep forbids the name in `docs/internal`.** The row is at
`docs/internal/engine-rulings.md:1489`, headed ``## audit-sveltekit-bulkdeleteskip: `BulkDeleteSkip``.
Task 5's Files block lists `engine-rulings.md` only for `:1615`, `:1780`, and the
`convention-failure-suffix` progress note, so the row is never edited, yet the acceptance
`grep -rn "MediaDeleteRefusal\|BulkDeleteSkip\b" src docs` returns nothing outside
`docs/superpowers/`, `docs/internal/record/`, `docs/HISTORY.md`, and `CHANGELOG.md` would fail on
`:1489`. Correction: add `:1489` to the Files block with the "verdict unchanged" annotation, and change
"the two renamed-type ledger rows" in the acceptance to three.

**6. Plan:603-604 -- "its four use sites" understates `BulkDeleteSkip`'s reach.** Measured:
`src/lib/media/bulk-delete-plan.ts:15` (declaration), `:27`, `:44`;
`src/lib/components/MediaBulkDeleteDialog.svelte:21`, `:87`;
`src/lib/sveltekit/content-routes-media.ts:27`, `:44` (a comment), `:176`; plus
`docs/internal/engine-rulings.md:1489`. That is six code use sites beyond the declaration, one comment,
and one ledger row. The Files block does name `bulk-delete-plan.ts` and `MediaBulkDeleteDialog.svelte`, so
the coverage is right and only the count is wrong, but `content-routes-media.ts:27` is an import that has
to follow the type into `content-routes-media-delete.ts` in the same commit. Correction: seven, not four.

**7. Plan:664-670 against Plan:691 and :705-706 -- Task 6's editors-page step contradicts its own
verification-sweep decision.** The plan decides that the ten sibling strings are "kept unchanged unless
[they fail] the test", with "the expected outcome measured at plan authoring ... that the ten stay", and
then Step 4 rewrites "the four editors-page quotes and their surrounding sentences". Measured, the four
bolded quotes ground against four different shipped strings:
`docs/editors/when-something-goes-wrong.md:34` quotes `content-routes-entry.ts:922` and `:39` quotes
`:1013` (the two D11 refusals, which do change), but `:105` quotes
`src/lib/sveltekit/refusal-codes.ts:23` and `:119` quotes `src/lib/components/CairnHistory.svelte:56`,
both of which the plan expects to stay. If they stay, `check:editor-quotes` is already green on `:105`
and `:119` and rewriting them is docs investment the spec's "gate-driven mechanical text" carve-out does
not cover. Correction: make the doc edit conditional on the string verdict, and say so in the acceptance.

**8. Plan:702 (Task 6 acceptance) -- the `VocabularyAdmin.svelte` grep acceptance cannot pass.**
"`grep -n "posts\?" src/lib/components/VocabularyAdmin.svelte` returns only verb-sense lines, each named
in the report." Measured, the file's `post` hits are `:5`, `:11`, `:16`, `:46`, `:55`, `:60`, `:162`,
`:220`, `:223`, `:244`, `:278`, `:286`, `:299`, `:300`, `:301`, `:330`, `:347`, `:365`. The plan names
`:5`, `:55`, `:60`, `:365` as verb sense and eleven lines as user-facing copy, leaving `:11` ("a rename
never rewrites a post"), `:16` ("tags already on posts"), and `:46` ("a rejected posted list"), all
noun-sense comment lines inside the `@component` block, unaccounted for. Correction: either add the three
comment lines to the change set (they read as the same drift) or restate the acceptance as "returns only
verb-sense lines and the enumerated comment lines".

**9. Plan:25-29 -- the token ceiling is carried over from a ten-task derivation and applied to twelve
tasks.** The spec derives 4.5M as "Ten tasks at the band's low-to-middle is 3.7M to 4.5M"
(spec:234-239), a strictly per-task arithmetic. The plan keeps 4.5M for twelve on the reasoning that
"splitting a task moves a boundary and adds no work". That is true of the implementation work and false
of the per-task overhead the plan itself mandates: Global constraint 3 and the Gate block require the
full thirty-plus-gate string, including `CI=1 npm --prefix examples/showcase run test:e2e`, at the end of
every task, so two extra tasks buy two extra full gate runs plus two extra `diff-reviewer` passes.
Twelve at the same band is 4.4M to 6.4M. Correction: restate the ceiling at the band, or state the
per-task overhead as the reason it is held flat.

**10. Plan:1080-1083 (Task 12 decisions) -- the ROADMAP Later filing rests on warnings that do not
exist.** The plan files the register sweep as "the `jsdoc/informative-docs` warnings the wiring exposes".
Measured by widening the `eslint.config.js` `.svelte` block's `files` glob to
`['examples/showcase/src/**/*.svelte', 'src/lib/components/**/*.svelte']` and running
`npx eslint 'src/lib/components/**/*.svelte'`: **11 problems, 11 errors, 0 warnings**. The wiring exposes
no `informative-docs` warning at all. Correction: state the filing's trigger as the unparsed comment
population rather than as exposed warnings, or drop the clause.

**11. Plan:454-456 and :627-628 -- the "full five-field block" acceptance cannot be met on the rows being
annotated.** Both tasks require that each `DeleteRefusal` / `MediaDeleteRefusal` ledger row "carries the
full `Verdict`, `Reopens on`, `Shape`, `Record`, `Verified` block". Measured,
`audit-sveltekit-deleterefusal` (`:1681-1692`) and `audit-sveltekit-mediadeleterefusal` (`:1615-1621`)
carry `Verdict`, `Reopens on`, `Record`, `Verified` and no `Shape` field, and
`convention-failure-suffix` (`:214-225`) carries `Verdict`, `Reopens on`, `Record` only. Global
constraint 9 (Plan:207-209) states the rule correctly, scoped to "a ruling row this pass WRITES". The two
task acceptances apply it to rows the pass only annotates. Correction: scope both acceptances to new
rows, and require only that `check:rulings-format` stays green on the annotated ones.

**12. Plan:479-485 -- `MediaBulkFailure` is assigned to no module, and the `MediaLibraryEntry` re-export
has no stated new home.** `content-routes-media.ts:152` declares `MediaBulkFailure`, used at `:805`,
`:835`, `:846`, `:869`, `:908`, `:917`, `:933`, `:966`, `:975`, `:987`, `:1001`, all inside the delete
cluster; it appears in neither Task 4's shared-module list nor Task 5's delete-module declaration list.
Separately, `content-routes-media.ts:47` is
`export type { MediaLibraryEntry } from '../media/library-entry.js';`, which `content-routes.ts:44-46`
re-exports; when Task 5 deletes the file that line needs a named destination. The Task 4 Interfaces
sentence "MediaLibraryEntry keeps its current re-export from `../media/library-entry.js`" names the source
and not the new host module. Correction: name `MediaBulkFailure` in the delete module's declaration list
and name the module that carries the `MediaLibraryEntry` re-export line.

**13. Plan:471-476 -- Task 4's Files block omits two importers of a type Task 4 moves.**
`src/lib/components/media-library-helpers.ts:8` and `src/lib/components/MediaBulkDeleteDialog.svelte:20`
both import `MediaUsageInfo` from `../sveltekit/content-routes-media.js`, and `MediaUsageInfo` moves in
Task 4 (library module). Both files appear only in Task 5's Files block (Plan:547, :544). Task 4's Step 5
("repoint every importer the grep finds") covers the work, so this is a Files-block and diff-review
mismatch rather than a gap in the work. Correction: move both into Task 4's Files block.

**14. Plan:1015-1016 -- F6's member counts are one off on `EntryData`.** The plan says "`EntryData`'s
seven members" (repeating the sweep). Measured at `src/lib/delivery/public-routes.ts:54-70`: `concept`,
`entry`, `html`, `canonicalUrl`, `seo`, `newer?`, `older?`, `heroImage?`, which is **eight**.
`MediaEntry`'s twelve is correct (`src/lib/media/manifest.ts:14-25`, including `sha256` at `:15`).
Correction: eight, and the acceptance "Every member of `EntryData` ... carries a doc comment" is the
operative test either way.

**15. Plan:145-146, :499-503 -- Task 4 states two incompatible rules for the media shared module.** The
Ruled-inputs block fixes the shared population as the sweep's fifteen "module-level primitives", and the
Decisions block states the general partition rule "a primitive one cluster uses moves to that cluster's
module". Measured, only six of the fifteen are genuinely multi-cluster: `MEDIA_HASH_RE` (delete and
metadata), `MAX_ALT`, `MAX_DISPLAY_NAME`, `sanitizeField` (ingest and metadata),
`MEDIA_DISABLED_MESSAGE` (delete and metadata), `MANIFEST_CONFLICT_MESSAGE` (three clusters). The other
nine are single-cluster: `MEDIA_SLUG_RE` and `replacementToken` (metadata only, `:1058`, `:1121`,
`:1224`), `MAX_ORIGINAL_FILENAME`, `MAX_DIMENSION`, `safeDecode`, `basename`, `clampDimension` (ingest
only), `resolveMediaBucket` (delete only, `:756`, `:833`, `:915`, `:973`), `CONTENT_CONFLICT_MESSAGE`
(metadata only, `:1271`, `:1427`). Correction: say which rule wins. The spec's population is defensible
as a stability choice, but then the partition rule should not be restated as governing the prelude, and
Task 6's Files block (Plan:647-648) should not assume `CONTENT_CONFLICT_MESSAGE` lands in the shared
module.

**16. Plan:97-103 -- "seven" `MediaDeleteRefusal` naming sites, and the plan's own list holds eight.**
The Reconciliation block enumerates `docs/reference/components.md:233`, `docs/reference/sveltekit.md:213`,
`src/lib/components/CairnMediaLibrary.svelte:29` (the three the spec names), plus
`sveltekit-barrel-prune.test.ts:31`, `CairnMediaLibrary.test.ts:656`, `CairnAdmin.test.ts:293`, and two
ledger rows, which is eight, and then says "Task 5 carries all seven". Measured across `src docs packages
examples scripts`, excluding the write-once archives: exactly those eight. Correction: eight. Coverage is
complete; only the number is wrong.

**17. Plan:673-675 -- "twelve candidate lines" followed by eleven.** The Decisions block says the grep
enumerates twelve and lists `:162`, `:220`, `:223`, `:244`, `:278`, `:286`, `:299`, `:300`, `:301`,
`:330`, `:347`. Measured, those eleven are exactly the user-facing set. Correction: eleven.

**18. Plan:395-396, :548-549 -- stale references in two files no task lists.**
`scripts/checks/check-surface-leaks.json:127` and `:259` each carry a `sanctioned-by` string reading "the
interface keeps its module-level export in content-routes-media.ts", for `MediaUploadFailure` and
`UploadResult`, both of which move to `content-routes-media-ingest.ts` in Task 4. The file is read by
`scripts/checks/check-surface-leaks.mjs` inside `check:surface`; the entries key on `name` and `subpath`,
so the gate does not break and `check:surface` stays byte-identical, but the sanction prose goes false.
`docs/internal/admin-smoke-test.md:128` names `src/lib/sveltekit/content-routes-media.ts` as the home of
`mediaOrphanScanAction` and `mediaOrphanPurgeAction` and is in no task's Files block. Correction: add both
to Task 4's and Task 5's Files blocks.

**19. Plan:261-272 -- Task 1's cross-cluster decision is filed as "the spec leaves these open" when the
spec states the opposite.** Spec task 1 says "`draftFromBranchHead` (`:357`) is the one cross-cluster
helper and goes to the shared module". The plan's four-member set overrules that. The plan does disclose
the overrule in its own text ("not the one the spec names"), and the measurement backs it: `invalidIdMessage`
at `:436` (read) and `:1325` (destructive), `HISTORY_LIMIT` at `:721`, `:733`, `:734` (read) and `:1535`,
`:1536` (revert), `commitEditorName` at `:366` (inside `draftFromBranchHead`) and `:736` (read).
Correction: relabel the item as a measured correction to the spec rather than a gap the spec left open,
so the spec's task 1 sentence is knowingly superseded.

**20. Plan:585-592 -- the `BulkDeleteSkip` target name reads the spec more loosely than the spec reads.**
The plan says the spec leaves the target open, "saying only '`BulkDeleteSkip` to a field'". The spec's own
source, `exports-sweep.md` F1, gives the fix as "rename to `DeleteFailure` / `MediaDeleteFailure` /
`BulkDeleteSkipped`-as-a-field", which reads as eliminating the type in favour of the `skipped` field
rather than renaming it. The plan's `convention-failure-suffix` citation is accurate: the row at
`docs/internal/engine-rulings.md:214-219` quotes Geoff verbatim, "`Failure` is the family suffix;
`Refusal` and `Skip` retire as TYPE-NAME suffixes (a discriminant VALUE like `'last-owner'` or a field
name is not a suffix and is unaffected)", so `BulkDeleteSkippedAsset` complies and no closed ruling is
reopened. Correction: state the reading explicitly as choosing rename over inline, with the reason
(`MediaBulkDeleteDialog.svelte:87` types a parameter on it, so the type has to exist), rather than as the
spec being silent.

**21. Plan:1073-1076 -- Task 12 writes `docs/extend/migration-notes.md`, which the spec assigns to
polish-C.** Spec task 10 of polish-C reconciles the whole `## Unreleased` migration-notes section, and no
11a spec task names the file. With 11a non-breaking and no `Consumers must:` line anywhere in its window,
the entry the task writes has no actionable content. Correction: drop it, or state why a no-action window
entry is worth the file's churn.

**22. Plan:1122-1123 (eslint anchors) and Plan:77 (initiative-design anchors) -- two anchors off by one.**
`eslint.config.js`'s `.svelte` block comment runs `:74-78`, with `:79` the opening brace and the `files`
glob at `:80` (the glob line is correct). In
`docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`, the CI-derived gate clause is
at `:138-140` and the changelog-and-ledger clause at `:141-143`; the plan records `:137-139` and
`:140-143` as "Both confirmed. No move."

## Measurements verified

| Claim | Plan's number | Measured at `ac911ec3` |
|---|---|---|
| Modules the two monoliths become | nine, not ten | Nine, and reachable only with `content-routes-shared.ts` as the entry split's shared home, as the plan reads it |
| ESLint errors once the `.svelte` glob reaches `src/lib/components` | 11 errors across 6 files, all `tsdoc/syntax`, zero warnings | 11 errors, 6 files, 0 warnings, at exactly the lines named (`ComponentForm:154,155`; `ComponentInsertDialog:206` twice; `DeleteDialog:56` twice; `MarkdownEditor:129`; `RenameDialog:49` twice; `ShareLinkPanel:51,52`) |
| `MediaDeleteRefusal` in-tree naming sites | seven | **Eight** (the plan's own Files block lists all eight) |
| `money.mjs:32-34` already conforms to decision 10 | already conforms | Confirmed: "from the day you deploy it" at `:34`; the other three sites contradict it |
| Non-test source sites importing `content-routes-entry` | five | Five (`stories/support.ts:8`, `stories/publish.ts:16`, `content-routes.ts:26` and `:41`, `FragmentPicker.svelte:13`), plus two test importers and four comment-only source files, exactly as stated |
| `BulkDeleteSkip` use sites (Task 5 Step 4) | four | **Seven** code references beyond the declaration, plus one ledger row |
| `EntryData` members (F6) | seven | **Eight** |
| `MediaEntry` members (F6) | twelve | Twelve |
| `VocabularyAdmin.svelte` user-facing candidate lines | "twelve", eleven listed | **Eleven** |
| CI `npm run` gates in the committed `test.yml` | thirty-one | Thirty-one distinct, and `check:figures` appears only in the uncommitted working-tree diff, as the plan states |
| Cross-cluster helpers in `content-routes-entry.ts` | four, not the spec's one | Four, confirmed by use-site measurement |

## Checked and found true

- **Every spec 11a task has a plan task.** Spec tasks 1 to 10 map to plan tasks 1 to 12 with the two
  declared splits (spec 4 into plan 4 and 5, spec 5 into plan 6 and 7), and no work is dropped in either
  split. The task-count arithmetic in the header is right.
- **Every Dispositions row routed to 11a lands.** The engine Svelte lint wiring (Task 9), the
  `logCommitFailed` call-style split (Task 5, but see finding 2 for which task should hold it), the two
  monoliths (Tasks 1 to 5), and the state-reset regex gap (Task 11).
- **Every sweep finding the spec assigns to 11a is carried.** F1 (Tasks 3 and 5), F2 and F4 to F6
  (Task 10), D5, D10 and D27 (Task 8), D11 and D12's engine halves (Task 6), the four Workers Paid CLI
  strings (Task 7). F3 and F11 to F21 are polish-C's, F7 to F10 bank to the rewrite, D6 is banked, and the
  plan says so in its Ruled-inputs block.
- **No scope leak.** Nothing in the twelve tasks reaches outside what the spec routes to 11a. The one
  arguable exception is finding 21.
- **The entry split's partition is complete and non-overlapping.** All eighteen top-level declarations in
  `content-routes-entry.ts` and all fourteen inner functions are assigned exactly once across Tasks 1, 2,
  and 3, with `createEntryActions` dissolving. Use-site measurement confirms every single-cluster claim:
  `resolvePreview` (`:684`), `retiredContentAdvisory` (`:627`), `commaListParam` (`:628`, `:629`),
  `CreateFailure`, `EditData`, `FragmentTarget` all read-only; `saveRefusal`, `SaveHold`, `SaveFailure`,
  `saveToBranch` all write-only; `deleteEntry`, `RenameFailure`, `DeleteRefusal` all destructive-only;
  `draftExistsFailure`, `revertSchemaDrift`, `BUILTIN_FRONTMATTER_KEYS` all revert-only.
- **The barrel's export set is stable and the byte-identical claim is achievable.**
  `content-routes.ts:32-50` re-exports exactly sixteen names: `ContentRoutesConfig`, `TidyClient`,
  `TidyEffort`, `AttentionItem`, `AdminShellData`, `HelpData`, `WelcomeData`, `EntrySummary`, `ListData`,
  `ContentFormFailure`, `EditData`, `MediaLibraryData`, `MediaLibraryEntry`, `SettingsData`,
  `VocabularyLoadData`, `DictionaryAddFailure`, which is the plan's list verbatim.
  `docs/internal/api-surface.md` records names and structural types only and contains zero
  `content-routes` module references, so a declaration move cannot change it;
  `check-surface-leaks.json` keys on `name` plus `subpath`, not on path. None of the three renamed types
  appears in `api-surface.md`.
- **The merge literal claim is exact.** `content-routes.ts:70-105` lists thirty-five keys, and
  `content-routes.ts:117` carries the sentence the plan quotes about `check:surface` pinning the key
  order.
- **The media split's cluster ranges and the six media suites hold.** None of
  `content-routes-media{,-bulk,-alt,-replace,-orphan,-merge}.test.ts` imports a type Task 4 moves, so
  Task 4's "six media suites are not in the diff" is achievable; all five that do import from the monolith
  name Task 5 types.
- **Task 3's file-path grep acceptance is achievable on the docs side.** The only non-archive `docs`
  files naming `content-routes-entry.ts` are `docs/HISTORY.md`, `docs/internal/src-lib-map.md` (which
  Task 3 modifies), and `docs/internal/engine-rulings.md`, where the hits are `content-routes-core.ts`
  substrings, not the entry file.
- **Every line anchor sampled in the Reconciliation block resolves.** `content-routes-entry.ts` at
  `:222`, `:279`, `:287`, `:357`, `:416`, `:424`, `:751`, `:922`, `:1013`, `:1170`, `:1266`, `:1481`,
  `:1488`, `:1500`, `:1524`, `:1617`, and the 1,630-line count; `content-routes-media.ts:372` and `:378`;
  `nav-routes.ts:128` and `:155`; `content-routes-settings.ts:156` and `:403`; `refusal-codes.ts:23` and
  `:13`; `CairnHistory.svelte:56`; `VocabularyAdmin.svelte:162`, `:220`, `:244`; `scaffold.mjs:248-250`;
  `chapter2.mjs:680`; `catalogue.mjs:541-551`; `money.mjs:32-34`;
  `when-something-goes-wrong.md:34`, `:39`, `:105`, `:119`; `is-it-working.md:24`, `:26`, `:50`, `:53`,
  `:62`, `:150-153`, and D10's measured `:372` and `:386`; `responses.ts:9`, `:16`, `:23`, with the
  `:30` and `:38` house-pattern siblings; `feeds.ts:7` and `:100`; `content-routes-list.ts:34`;
  `public-routes.ts:54` and `:116`; `manifest.ts:13`; `library-entry.ts:22`;
  `components.md:233`; `sveltekit.md:213`; `CairnMediaLibrary.svelte:29`;
  `bulk-delete-plan.ts:15`; `sveltekit-barrel-prune.test.ts:31`; `CairnMediaLibrary.test.ts:656`;
  `CairnAdmin.test.ts:293`; `cairn-admin-actions.test.ts:411`; `content-routes-shared.ts:9`;
  `guard.ts:117`; `check-editor-quotes.test.ts:126` and `:132`; `HISTORY.md:10`, `:54`, `:594-596`;
  `edit-page-state-reset-coverage.test.ts:39-46` and the pattern at `:47`, with the
  `widened declaration shapes` describe block at `:146`; `src-lib-map.md:148-149`.
- **Two drift corrections the plan claims are real.** `src/lib/sveltekit/index.ts` holds the barrel
  invariant sentence at `:114`, not the spec's `:104` (`:104` is `export type { CairnEnv }`), and
  `site-indexes.ts`'s `createSiteResolver` sentence is at `:34-35` with the doc block opening at `:31`.
- **The twelve "Reload" strings are the complete population.** `grep -rn "Reload" src/lib` returns
  exactly the ten siblings and the two D11 refusals the plan enumerates, nothing more.
- **The Task 11 premise is accurate.** `edit-page-state-reset-coverage.test.ts:47`'s pattern is
  `/(?:\blet\s+|,\s*)([A-Za-z_][A-Za-z0-9_]*)\s*(?::[^=,]+)?=\s*\$state\b/g`, the `[^=,]` run does exclude
  every comma, and the doc block at `:39-45` does claim the exclusion is what keeps the pattern from
  crossing a generic comma, which is the claim the task rewrites.
- **The Task 6 paint rule is grounded.** `examples/showcase/e2e/admin-visual.spec.ts:40` and `:49`
  baseline `vocabulary-light.png` and `vocabulary-dark.png`, and both `-linux.png` files exist in the
  snapshots directory. `src/tests/component/vocabulary-admin.test.ts:37` asserts "A tag groups related
  posts." and `:46` asserts "8 posts", as stated.
- **The Task 8 premises hold.** `02-doctor-bare.txt:15` carries `SKIP  Zone HSTS` and `:23` carries
  `8 passed, 0 failed, 11 skipped`, matching `is-it-working.md:26`; the fixtures README records the
  2026-08-17 run with the 100-by-40 pty and `ptycapture.py` kept outside the repo; the placeholder
  from-address `cms@showcase.test` is real (`packages/create-cairn-site/src/cloudflare/config.mjs:158`).
- **The ROADMAP and friction-log dependencies are real.** `ROADMAP.md:353-355` carries the
  `content-routes-media.ts:668` `ctx.logCommitFailed` sub-bullet and `:358` the engine Svelte lint wiring
  sub-bullet, both closable by name; both friction-log sections read "None open."
- **The gate string is CI-derived and correct.** All thirty-one committed `npm run` gates plus the four
  `npm --prefix` gates in `test.yml` appear in the plan's string, and `check:figures` is correctly
  excluded as uncommitted working-tree state under decision 13.
- **No closed ruling is reopened or bypassed.** `convention-failure-suffix` is quoted accurately and its
  field clause genuinely exempts `skipped`; the `DeleteRefusal` and `MediaDeleteRefusal` retire rows are
  annotated rather than re-argued; the plan explicitly declines to overturn chassis-B2's deliberate keep
  at `examples/showcase/src/routes/admin/signups/+page.server.ts:26-28`, leaving it to 11b's task 10 as
  the spec's Sequencing block directs.
