# Polish-11a plan, verification read

Fresh-context verification of `docs/superpowers/plans/2026-09-08-polish-11a-pass.md` (uncommitted,
folded 2026-09-08) and the three workflow args files under `~/.cache/cairn-polish-11a/`, against the
three adversarial reviews, the fold record, and the measured tree.

- **Read at:** `main` head `4453f540`. The plan measures at `ac911ec3`, its parent; no source file
  changed between the two, so every measured anchor in the plan reproduces exactly.
- **Spec diff:** one hunk, `docs/superpowers/specs/2026-09-08-polish-passes-design.md:549-555`, the
  Sequencing ceiling line. That is the only change, as R8 requires.
- **Scope covered:** fold fidelity for all 51 findings (coverage 1 to 22, executor 1 to 17,
  sequencing 1 to 12); the media partition re-derived from the file; the entry split's shared
  additions re-derived; executability of Tasks 3, 4, 5, 6, 7, 9; args fidelity; consistency.
- **Result:** nine failures, two of them gate-blocking. The partition is sound.

## Failures

### 1. The ledger dead-path greps cannot be satisfied, and Global constraint 11 contradicts itself

**Plan lines:** `:329-336` (Global constraint 11), `:692-694` (Task 3 acceptance), `:1017-1020`
(Task 6 acceptance), `:1508-1509` (Task 13 acceptance), `:1491-1495` (Task 13 Step 4). Mirrored in
the `criteria` strings of tasks 3, 6, and 13 in all three args files.

**What was asked.** Sequencing 7 asked the plan to reconcile `docs/internal/engine-rulings.md`
across the two passes and to say what happens to the rows the renames and retirements invalidate.
The fold answers with R5: split tasks ANNOTATE, appending one
`- **Note (polish-11a, Task N):**` line, and never rewrite a row's existing fields. Global
constraint 10 restates it: an annotated row "keeps whatever fields it has."

**What the plan says.** Global constraint 11 closes with "Task 13 verifies with a grep that no row
names either dead path." Task 3's acceptance requires `grep -rn "content-routes-entry\.ts" src docs`
to return only history files under `docs/superpowers/`, `docs/internal/record/`, `docs/HISTORY.md`,
`ROADMAP.md`, and `CHANGELOG.md`. Task 6's requires the same shape for `content-routes-media\.ts`
over `src docs scripts`. Task 13's requires that no ruling row names either path except inside a
polish-11a Note line.

**Measured.** `docs/internal/engine-rulings.md` names `content-routes-entry.ts` on 2 lines (`:726`
and `:1751`, both inside internals-B Note lines) and `content-routes-media.ts` on 24 lines
(`:237`, `:1492`, `:1499`, `:1506`, `:1513`, `:1520`, `:1527`, `:1534`, `:1541`, `:1548`, `:1555`,
`:1562`, `:1590`, `:1597`, `:1604`, `:1611` and the rest), spread across `Reopens on` and body
fields. Zero of the 26 sits in a Note line. Under the annotate-never-rewrite rule every one of them
survives the pass, so the ledger file is a permanent hit in Task 3's and Task 6's greps and a
permanent violation of Task 13's criterion. Task 13 Step 4 tells the implementer to "annotate any
row a split task missed," which does not make any of the 26 go away: the mention lives in a
historical field the pass is forbidden to touch.

This is the defect class executor 2 and executor 6 caught elsewhere, a grep criterion no honest
execution can meet, reintroduced by the fold's own ledger rule. Three tasks will hit it, and each
will either stop, return a `fix`, or be tempted to rewrite ledger history to get green.

**Fix.** Add `docs/internal/engine-rulings.md` to the allowed set in Tasks 3 and 6, qualified: a
surviving mention must sit in a historical field of a row that carries a polish-11a Note. Restate
Global constraint 11's closing sentence and Task 13's criterion as "every ruling row naming
`content-routes-entry.ts` or `content-routes-media.ts` carries a `- **Note (polish-11a, Task N):**`
line naming the new module," which is what the annotation rule actually promises. Mirror the change
into the three `criteria` strings.

### 2. Three importer files sit in the wrong task's Files block, so Tasks 4, 5, and 6 each edit a file they are not authorized to touch

**Plan lines:** Task 4 Files `:713-730`, Task 5 Files `:846-860`, Task 6 Files `:932-951`, and the
mis-measurement at `:720`. Same gaps in the `files` arrays of the args.

**What was asked.** Sequencing 5 and coverage 13 asked that every importer a task's move breaks sit
in that task's Files block, since a task editing a file its block does not name is a diff-reviewer
finding. The fold moved `media-library-helpers.ts` and `MediaBulkDeleteDialog.svelte` into Task 4
and out of Task 5, which is real. The reasoning was not swept across the rest of the importer set.

**Measured on `4453f540`:**

- `src/tests/component/CairnMediaLibrary.test.ts:19` imports `MediaUsageInfo`, which Task 4 moves to
  `-media-library.ts`. Lines `:20-23` import `MediaReplacePreviewPlan`, `MediaReplaceFailure`,
  `MediaAltPreviewPlan`, and `MediaAltPropagateFailure`, all of which Task 6 moves to
  `-media-metadata.ts`. The file appears only in Task 5's Test block (`:855`, for the test title at
  `:656`). Task 4 and Task 6 cannot compile without editing it.
- `src/lib/components/MediaBulkDeleteDialog.svelte:20` reads
  `import type { MediaUsageInfo, MediaBulkDeleteResult, MediaBulkFailure } from '../sveltekit/content-routes-media.js';`.
  `MediaBulkDeleteResult` and `MediaBulkFailure` move in Task 5. The file is in Task 4's Files
  (`:720`) and Task 6's (`:939`), never Task 5's.
- `:720` itself mis-measures the line: it says "`:20` imports `MediaUsageInfo`; its `BulkDeleteSkip`
  import at `:21` is Task 6's," naming one of the three symbols on `:20`.

**Fix.** Add `src/tests/component/CairnMediaLibrary.test.ts` to Task 4's and Task 6's Test blocks
(import paths only). Add `src/lib/components/MediaBulkDeleteDialog.svelte` to Task 5's Modify list.
Rewrite `:720` to name all three symbols on `:20` and say which task owns each. Mirror all four into
the args `files` arrays.

### 3. `BulkDeleteSkip`'s import is routed to the metadata module; measured, it follows `MediaBulkDeleteResult` into the delete module

**Plan lines:** `:147` (Reconciliation counts block) and `:992-993` (Task 6 Step 4).

**What was asked.** Coverage 6 asked for the corrected reach count and, as the reason the count
matters, that `content-routes-media.ts:27`'s `import type { BulkDeleteSkip }` follow the type into
the module that actually names it, in the same commit.

**What the plan says.** Both lines send the import into the metadata module.

**Measured.** `BulkDeleteSkip` has exactly one in-file use in `content-routes-media.ts`: `:176`,
`skipped: BulkDeleteSkip[]`, inside `export interface MediaBulkDeleteResult` opening at `:174`.
This plan assigns `MediaBulkDeleteResult` to `-media-delete.ts` in Task 5 (`:863-870`). No
metadata-cluster symbol names `BulkDeleteSkip` at all. After Task 5 the import lives in
`content-routes-media-delete.ts`, so Task 6's rename must edit that file, and Task 6's Files block
does not name it. Task 6's acceptance at `:1013-1014` then demands
`grep -rn "BulkDeleteSkip\b" src docs packages examples scripts` return nothing, which cannot be met
without touching an unauthorized file.

**Fix.** Change "metadata module" to "delete module" at `:147` and `:992-993`, and add
`src/lib/sveltekit/content-routes-media-delete.ts` to Task 6's Files block, noting it holds the
`BulkDeleteSkip` import after Task 5. Mirror into task 6's args `files` and `criteria`.

### 4. The spec states the 11a ceiling twice, and the unamended statement is the one in the Polish-11a section

**Spec lines:** `:234-238` (unamended, "4.5M tokens") and `:552-555` (amended, 6.5M).

**What was asked.** The verification brief asks the ceiling be stated once and match the spec's
amended line. R8 limits the spec edit to one line, and the edit landed on the Sequencing paragraph.

**What the spec says.** `:234` still opens "**Ceiling.** 4.5M tokens, checkpoint every three tasks,"
inside the Polish-11a section itself, and `:236` still carries the "internals about 400K" citation
that sequencing 9 debunked. The plan cites the spec's Polish-11a section as its source (`:19-21`),
so a conductor or reviewer reading that section gets 4.5M against a plan running to 6.5M.

The plan's own statement is correct and self-justifying at `:33-45`, so the executor is safe; the
exposure is the conductor's budget read and any later pass mining the spec.

**Fix.** Either amend `:234` to point at the Sequencing figure, or add one clause to the plan's
"Corrections this plan makes to the spec, knowingly" block naming `:234` as the second superseded
site, the way that block already handles the disjointness premise.

### 5. `cairn-admin-actions.test.ts:411` does not name the retired file

**Plan lines:** `:948` (Task 6 Files) and `:988` (Task 6 Step 3).

Both list the line as "a comment" naming `content-routes-media.ts`. Measured, `:411` reads
`// narrowing used for its own media-only suites, e.g. content-routes-media-bulk.test.ts).`, which
names a test file. It matches neither Task 6's `content-routes-media\.ts` grep nor its `-media\.ts`
shorthand grep, and it is the file's only `content-routes-media` hit.

**Fix.** Drop the entry from Task 6's Files block and Step 3, and from the args `files`.

### 6. Two acceptance greps allow paths their own grep roots cannot reach

**Plan lines:** `:692-694` (Task 3) and `:1017-1020` (Task 6).

Task 3 greps `src docs` and Task 6 greps `src docs scripts` and `src docs`, yet both allow
`ROADMAP.md` and `CHANGELOG.md` in the result, which live at the repo root. The criteria are
satisfiable, but the allowance is dead text that will make an implementer widen the root or doubt
the reading.

**Fix.** Drop `ROADMAP.md` and `CHANGELOG.md` from both allowed sets, or add the repo root to the
grep and keep them.

### 7. Task 5's Consumes list names a symbol the delete cluster never uses

**Plan line:** `:872-874`.

Task 5 states it consumes `MEDIA_DISABLED_MESSAGE` from `content-routes-media-shared.js`. Measured,
`MEDIA_DISABLED_MESSAGE` is referenced at `:370` (declaration), `:385` and `:391` (both inside
`resolveMediaBucket`, which moves to the shared module), and `:1216` and `:1392` (metadata). The
destructive range 695 to 1039 never names it. The compiler settles the real list and the acceptance
does not grep this, so it costs nothing at the gate, but it is a measurement error in a block the
implementer is told to report against.

**Fix.** Remove `MEDIA_DISABLED_MESSAGE` from Task 5's Consumes list.

### 8. Every task's `criteria` carries a PASS before set that no task ever produces

**Plan lines:** `:341-344` (the protocol's first sentence) against `:398-403` (the paint-branch
ruling). Present in all thirteen args `criteria` strings.

The protocol pins "the PASS before set at `~/.cache/cairn-polish-11a/pass/before/` (Task 1, the
reference)" and offers "symlink the pass set if no predecessor moved paint." The branch ruling then
puts Tasks 1 to 6 and 8 to 13 on the no-rendered-surface branch, so Task 1 captures nothing and the
pass set is never created. Task 7 is therefore forced to capture its own before set, which it does
say (`:1101`), but the symlink option is dead and Task 1's dispatch string tells the implementer both
to be the reference capture and to capture nothing.

**Fix.** In the protocol text as it rides in the `criteria`, replace "(Task 1, the reference)" with a
clause saying the pass set exists only if a task captured one, and that on this pass Task 7 captures
its own before set at its parent commit.

### 9. Task 9's new fixtures README section is unnamed

**Plan lines:** `:1249-1250` (Files) and `:1301-1302` (Step 6, acceptance at `:1319-1321`).

The plan asks for "a new dated run section beside the 2026-08-17 one" with "the same fields as the
2026-08-17 section." Measured, that section's heading is `## The run`
(`packages/create-cairn-site/test/fixtures/transcripts/README.md:11`), so a second one cannot reuse
the name and the plan does not say what to call it or whether the existing heading is renamed.

**Fix.** Name both headings in the plan, for example `## The 2026-08-17 run` and
`## The 2026-09-08 run`, and say the older heading is renamed in the same edit.

## Partition check

**Sound. No symbol unassigned, none doubled, and no cross-cluster import required beyond the two
shared modules.** Re-derived independently from the files, not from the plan.

**Media.** `src/lib/sveltekit/content-routes-media.ts` carries 18 module-level const and function
declarations (`:278` to `:387`), 15 interfaces (`:53` to `:270`), one type re-export (`:47`), and
`createMediaActions` at `:401` holding 13 inner functions, of which 12 reach the return literal at
`:1432`. Every one is assigned:

- The 18 primitives split 15 to the spec's fixed shared population, plus `distinctEntryCount` to
  shared by the two-or-more rule (`:473` library, `:735` delete), plus `originRank` and `branchKey`
  to the delete module (`:745` only; the `:326` hit is a doc-comment cross-reference inside
  `branchKey`).
- The 15 interfaces split 2 library, 2 ingest, 4 delete, 7 metadata, matching Task 4's, Task 5's,
  and Task 6's declared lists exactly. The `MediaLibraryEntry` re-export goes to library, which is
  right: `:66-67` name it inside `MediaLibraryData`.
- The 13 inner functions split 1 library, 3 ingest (`ingestAndStore` internal), 4 delete, 5
  metadata, and the four factories return 1 + 2 + 4 + 5 = 12, matching the current literal's twelve
  keys.

Every use-site cell in the plan's table at `:754-770` reproduces on measurement. Three cells are
imprecise without being wrong: `originRank`'s "`:745` only" omits the `:326` comment;
`MAX_DIMENSION`'s "the ingest range only" is really "inside `clampDimension` only," which the ingest
range then calls; and `MEDIA_SLUG_RE`'s `:366` is inside `replacementToken` rather than a metadata
call site. None changes a home.

No cluster module needs a sibling. `MediaOrphanScanResult`, which Task 5's return type names but its
declared list omits, is correctly absent: it is imported from `../media/orphan-scan.js`, a leaf.

**Entry, spot-check of the shared additions.** The plan's correction to the spec holds. Measured on
`src/lib/sveltekit/content-routes-entry.ts`, exactly four prelude symbols cross a cluster boundary:
`draftFromBranchHead` (`:357`; used `:739` read, `:1495` and `:1501` revert), `commitEditorName`
(`:344`; `:366` inside `draftFromBranchHead`, `:736` read), `HISTORY_LIMIT` (`:337`; `:721`, `:733`,
`:734` read, `:1535`, `:1536` revert), and `invalidIdMessage` (`:267`; `:436` read, `:1325`
destructive). Every other prelude symbol is single-cluster and lands where the plan puts it:
`FragmentTarget`, `EditData`, `CreateFailure`, `resolvePreview`, `retiredContentAdvisory`, and
`commaListParam` read; `SaveFailure`, `SaveHold`, `saveRefusal`, `saveToBranch` write;
`DeleteRefusal`, `RenameFailure`, `deleteEntry` destructive; `BUILTIN_FRONTMATTER_KEYS`,
`revertSchemaDrift`, `draftExistsFailure` revert. `content-routes-shared.ts` imports no
`content-routes-*` sibling today, so it stays a leaf after the four arrive.

## Held

Verified clean, or judged not worth a fix:

- **Args fidelity, otherwise clean.** All three files are `jq`-valid. Ids and titles match the plan's
  thirteen task headings. Run one is tasks 1 to 7 and run two is 8 to 13, matching the cut the plan
  and the fold record name. The `gate` string is byte-identical across the plan's `## Gate` block and
  all three files (`sha256 fd069a7d…`). The paint protocol is present in all thirteen `criteria`
  strings and is identical to the plan's blockquote once markdown backticks and apostrophes are
  normalized. The `notes` carry the global constraints, including the two commit footer lines
  verbatim, the ledger-annotation rule, the no-sibling-imports rule, the byte-identical
  `check:surface` rule, the STATUS and migration-notes prohibitions, and the run-`package`-once gate
  instruction, and they correctly state the from-scratch showcase install as a completed
  pre-dispatch step. Each `criteria` condenses its task's steps and acceptance without dropping a
  criterion; the only gaps are the three Files-block gaps in failure 2, which the args inherit.
- **Consistency, otherwise clean.** Zero em dashes in the plan, the spec, and the fold record. No
  placeholder strings. Numbering is consistent everywhere: thirteen tasks, fourteen gate-bearing
  units and fourteen commits, checkpoints at 3, 6, 9, and 12, the run cut after Task 7, Task 8 as run
  two's re-anchoring task, the spec-to-plan task mapping (spec 4 to plan 4-6, spec 5 to plan 7-8,
  spec 6-10 to plan 9-13). The conductor-writes-STATUS rule is stated at `:196`, `:266`, `:337`,
  `:1513`, and `:1637` and is contradicted nowhere. Every file path in Tasks 1 to 6 exists at HEAD,
  and every quoted anchor reproduces: `src-lib-map.md:145` and `:148-149`, `content-routes.ts:8`,
  `content-routes-context.ts:4`, `content-routes-shared.ts:5-9`, `guard.ts:117`,
  `sveltekit-barrel-prune.test.ts:17-22` and `:26-28` and `:31`, `admin-smoke-test.md:128`,
  `check-editor-quotes.test.ts:126` and `:132`, `check-surface-leaks.json:127` and `:259`,
  `publish.ts:16` and `:99`, `CairnMediaLibrary.svelte:29`, `components.md:233`,
  `sveltekit.md:213`, `CairnMediaLibrary.test.ts:656`, `CairnAdmin.test.ts:293`.
- **Task 7's measurements are exact and its acceptance is satisfiable.** `grep -rn "Reload" src/lib`
  returns twelve strings, splitting two-change and ten-keep exactly as the verdict table rules, so the
  post-change count of eight is right. `grep -n "posts\?" VocabularyAdmin.svelte` returns eighteen
  lines splitting 11 copy, 2 comment, 5 verb exactly as `:1084-1092` states, so the five-verb-line
  criterion is arithmetically reachable. The two D11 refusals sit at `:922` and `:1013`, both inside
  the write cluster, so `content-routes-entry-write.ts` is the right post-split home; `:1266` and
  `:1481` sit in the destructive cluster, matching the read-but-unchanged list.
  `admin-visual.spec.ts:40` and `:49` are the two vocabulary screenshots as stated, `magick` is
  installed, and the intended-moves manifest exists with no `## Polish-11a` heading yet, so Step 6's
  "new heading" reading is right.
- **Task 9's resources are all reachable.** `~/Projects/cairn-scratch/2026-08-16-capture/` holds
  `capture.sh`, `drive.py`, `ptycapture.py`, the `cairn-capture-scratch/` tree, and both existing
  fixtures. `capture.sh`'s usage header declares exactly the two modes the plan names, and its
  `doctor-cred` branch requires both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` exported, as
  the plan's Decisions block states. `link:consumer` exists in `package.json:85`. `Zone HSTS` is
  absent from `src/lib/doctor/` and present in both fixtures, so the acceptance is a genuine
  proof-of-re-record. Every `docs/admin/is-it-working.md` anchor reproduces: `:22`, `:24`, `:26`,
  `:50`, `:53-58`, `:62`, `:150-153`, `:372`, `:386`.
- **The local baseline regeneration in Task 7 Step 6 is a risk, not a fault.** CI runs Playwright on
  a bare ubuntu runner with no pinned container, so a local regeneration can produce different bytes
  than the CI regeneration the conductor runs afterward. `maxDiffPixels: 120` absorbs small drift,
  the protocol is adopted verbatim from chassis-B2 where it worked, and the conductor's CI regen and
  diff read at Step 7 is the reconciliation. Worth watching, not worth changing.
- **`check-surface-leaks.json`'s `MediaUsageInfo` entry is already wrong** and this pass leaves it
  wrong. It says the interface keeps its export in `content-routes-tidy.ts`; measured, it is declared
  in `content-routes-media.ts:53` and moves to `-media-library.ts` in Task 4. Task 4's acceptance
  only requires the two `content-routes-media.ts` strings go, so this does not block. It belongs in
  the friction log or polish-C, not in an in-flight task.
- **The twenty-four-row figure in Global constraint 11 is right.** Grouping the 26 ledger hits by
  their `## ` heading gives 24 distinct rows.
- **Coverage finding 22's second anchor.** The finding measured the changelog-and-ledger clause at
  `:141-143`; the plan records `:141-144`. Measured, the clause runs from mid-`:141` through
  mid-`:144`, so the plan is right and the review was one line short. No fix.
