# Polish-C plan, verification read

Fresh-context verification of `docs/superpowers/plans/2026-09-08-polish-c-pass.md` (uncommitted,
folded, fifteen tasks) and `~/.cache/cairn-polish-c/{args,run1-args}.json`, against
`docs/internal/record/2026-09-08-polish-inputs/plan-c-review-fold.md` (46 findings, 44 taken whole,
2 in part) and `docs/superpowers/specs/2026-09-08-polish-passes-design.md` (working tree).
Read 2026-09-08 against `main` at `0705776e`, read-only. Six failures, ranked. Everything else the
brief asked for is verified and listed under Held.

## Failures

### 1. Constraint 7's residual taxonomy is not complete, and five live classes halt the chain

**Plan line 619-633** (constraint 7, "The residual taxonomy, complete, so the classification step
has a name for every path a grep can return"), with the last row "Anything else | A blocking
finding". The fold records this as taken whole under coverage 6, executor 3, and sequencing 7
(R3, R5): "Constraint 7 now carries a complete residual taxonomy as a table".

**Measured at HEAD**, grepping the tracked tree for the thirty renamed or removed identifiers plus
the four factories, excluding only the three write-once archive trees the constraint names, five
live paths fall outside every row:

| Path | Hits |
|---|---|
| `skills/cairn-admin-screens/references/exemplar-list.md` | `OfficeList` at `:19`, `:24`, `:29`, `:32`, `:34`, `:39`, `:89`, `:111`, including a live `<OfficeList eyebrow=… >` composition fence at `:24-29` |
| `skills/cairn-admin-screens/references/exemplar-detail.md` | `OfficeList` at `:16`, `:67` |
| `ROADMAP.md` | `OfficeList` at `:347`, `:348`, `:697`, `:1026`, `:1028`, `:1033`, `:1511` |
| `vitest.config.ts` | `previewLoad` at `:29`, `:96`; `previewMint` at `:122` (alias comments) |
| `.github/workflows/e2e.yml` | `previewLoad` at `:70` |
| `migrations/0003_preview.sql` | `previewMint` at `:2` |

Constraint 7's Step 1 grep runs "over the tracked tree excluding the three write-once archive
trees", so Task 7's and Task 14's own greps return all of these, and the taxonomy's last row turns
each into a blocking finding. Task 12's args string is worse than the plan: it tells the
implementer its `OfficeList` classification list "is exhaustive as measured", and it is not.
Task 14 owns "the live internal docs" but the constraint's live-docs row enumerates only five
`docs/internal/*.md` files, none of these.

The acceptance greps themselves stay satisfiable, because every one of them scopes to
`src docs examples templates packages scripts` (Task 12) or `src packages examples templates docs
scripts` (Tasks 4, 6, 7) and reaches none of the six paths. That is the shape of the defect: the
greps pass while the tree keeps teaching a deleted component in a skill reference.

**Fix.** Add three rows to constraint 7's table: `skills/**` (a live authored reference, updated
where a rename makes its text false), `ROADMAP.md` (live entries updated by the renaming task; the
audit-remediation entry closed by Task 15), and repo-root and CI and migration comments
(`vitest.config.ts`, `.github/workflows/**`, `migrations/*.sql`, updated by the renaming task).
Name `skills/cairn-admin-screens/references/exemplar-list.md` and `exemplar-detail.md` in Task 12's
Files block and in its args Step 1 list, name `vitest.config.ts`, `.github/workflows/e2e.yml`, and
`migrations/0003_preview.sql` in Task 7's, and widen those tasks' acceptance greps to include
`skills` and the three root paths.

### 2. Constraint 8 calls prose mentions "entries"; five of the thirteen names are in no gate-read field

**Plan lines 230-240 and 635-649**, and Tasks 4, 6, 7, 8, 9's Files blocks and acceptance. The
fold records this as taken whole (coverage 3, executor 2, R2), "measured".

The file routing is right. The characterisation is not. Measured at HEAD by reading the `name`
fields the gates actually assert on:

- `scripts/checks/check-self-use-allowlist.json` carries a `"name"` entry for eight of the window's
  symbols: `RequestResult`, `ChannelRequestResult`, `ChannelConfirmResult`, `EditorRow`,
  `AuthGuardOptions`, `FieldsetOptions`, `RendererOptions`, `diffNewlyPublished`.
- It carries **no entry named `adminAction`**. The two hits the plan calls "two entries" are prose
  inside other symbols' `reason` fields: `AdminActionAudit` (`:4`) and `AdminActionOptions` (`:5`).
- It carries **no entry named `previewLoad`**. The one hit is prose in a `reason`.
- `EditorRow` is **one** entry, not "three entries": `:28` is the entry and names the symbol twice,
  and `:53` is prose inside `RateLimitOutcome`'s reason.
- `scripts/checks/check-surface-reexports.json` carries **no `name` entry for any of the five
  names the plan routes to it**. `AuthGuardOptions` (`:333`, `:615`), `parseManifest` (`:201`),
  `NavLoadData` (`:567`), and `VocabularyLoadData` (`:693`) are all inside `reason` strings of the
  form "R4 closure: `X`, `Y` name it on this subpath".

Constraint 8's stated hazard, "a stale entry leaves a gate asserting something about a name that no
longer exists", therefore holds for eight names in one file and for none in the other. Task 5's own
claim is the exception and is correct: re-homing `parseManifest` needs a NEW `name` entry, and
`check-surface.mjs` fails the home rule before the snapshot diff without it.

**Fix.** Split constraint 8 by kind. One list of the eight gate-read `name` entries, with the
vacuous-gate reasoning attached to them, and one list of the `reason`-prose mentions
(`adminAction` twice and `previewLoad` once in the self-use file, five in the reexports file) that
a task edits for accuracy but that no gate asserts. Correct "EditorRow (three entries)" to one,
"`adminAction`, two entries" and "`previewLoad` in each" accordingly.

### 3. Task 13's enumeration and its verification grep both miss three rows Tasks 2 and 3 write

**Plan lines 2182-2208** (the four groups, 17 + 9 + 13 + 7 = forty-six) and line 2222 (Step 1's
grep, "For each of the thirty renamed or removed identifiers").

Task 2 Step 6 (line 997-1001) appends a Note to `audit-sveltekit-contentroutesoptions` and
`audit-sveltekit-cairnadminoptions`. Task 3 Step 5 (line 1099-1101) appends one to
`audit-sveltekit-navroutes`. All three resolve as real headings (`:2085`, `:2133`, `:2058`). None
of the three appears in any of Task 13's four groups, and none can be reached by Step 1's grep,
because `ContentRoutesOptions`, `CairnAdminOptions`, and `NavRoutes` are not among the thirty
renamed identifiers. Task 13's acceptance ("report any row the grep reaches that the enumeration
does not name") therefore cannot catch them either, so three rows this pass writes go unverified by
the task that exists to verify the ledger.

**Fix.** Make the third group sixteen rows and the total forty-nine, and add a clause to Step 1
reconciling the four factory-bag and route-type rows Tasks 2 and 3 annotate, which the
thirty-identifier grep does not reach.

### 4. Three reference pages carrying a renamed anchor fragment are outside their task's Files block

**Plan lines 255-259** (the twenty-four fragments) and sequencing 9's fold, which was taken
specifically so that a page carrying a fragment is "named in Tasks 6 and 7's Files blocks rather
than left to a glob that never reaches it".

Measured at HEAD, twenty-four fragments over thirteen pages. Three of them sit on pages no task
names, and the only glob either task carries is `docs/extend/*.md`, which does not reach
`docs/reference/`:

- `docs/reference/auth-channel.md` carries `#cookiename`. Task 6's Files block names
  `docs/reference/core.md`, `sveltekit.md`, `auth-crypto.md`, `admin-routes.md`, and `ambient.md`.
- `docs/reference/delivery.md` carries `#previewload` twice and `docs/reference/components.md`
  carries it once. Task 7's Files block names `sveltekit.md`, `admin-routes.md`, and `ambient.md`.

`check:docs` fails on a fragment that no longer resolves, so both tasks' gates catch this, but as a
red gate mid-task rather than as a named file. Same paragraph: the plan says the fragments "run
across fifteen published pages"; the measured figure is thirteen.

**Fix.** Add `docs/reference/auth-channel.md` to Task 6's Files block and to its args string, add
`docs/reference/delivery.md` and `docs/reference/components.md` to Task 7's, and correct fifteen to
thirteen.

### 5. The plan's supersession arithmetic misstates the spec on both halves

**Plan lines 61-73.** Two errors, one authored and one caused by a concurrent fold.

- Line 62 says the 9M supersedes "the spec's 7M for a **thirteen**-task shape". The spec's
  Polish-C section listed **ten** tasks, which the plan's own line 27 states ("The spec lists
  ten"), and the spec's amended Sequencing line reads "superseding the 7M this section set for a
  ten-task shape". Thirteen is wrong.
- Lines 72-73 say the spec's total goes "from 19M to 21M". The spec's Sequencing line now reads
  **27.5M**, because a concurrent fold split 11b in the same paragraph into 11b-i at 7.0M and
  11b-ii at 5.0M. Both spec edits are present, mutually consistent, and correctly arithmetic
  (6.5 + 7.0 + 5.0 + 9 = 27.5); only the plan's restatement of the total is stale.

**Fix.** Read "ten-task shape", and either drop the total from the plan or restate it as 27.5M.

### 6. Pre-dispatch precondition 1 names a pass the spec no longer has

**Plan lines 96-97, 117-125, and every "post-11b" anchor.** The spec now records 11b split by Geoff
into 11b-i (eleven tasks) and 11b-ii (six tasks). Precondition 1 as written ("Confirm polish-11a
and polish-11b have both merged to `main`") cannot be discharged against a pass that no longer
exists under that name, and the Reconciliation block's 11b Task 1, Task 11, and Tasks 12 to 14
citations now point into two plans rather than one.

The damage is contained: the plan already rules every 11b task number provisional and orders the
executor to locate each anchor by prose from 11b's committed plan. The repair is naming.

**Fix.** Restate precondition 1 as both halves of 11b merged, and change the Reconciliation
preamble to say the 11b anchors are re-read from the committed 11b-i and 11b-ii plans.

## Names table check

**Verified sound.** Thirty-three rows (plan lines 454-486), matching the plan's own count at line
488. Every citation resolves: all thirty-three distinct slugs are a real `## <slug>:` heading in
`docs/internal/engine-rulings.md`, and every quoted verdict, closure state, and line number matches
the file at HEAD, including the four `*Options` rows' F17-and-decision-6 lead with
`convention-parameter-bags` widened by Task 4's clause (the row's ruled text does scope its
population to four `*Config` rows, `:130-137`), `audit-sveltekit-adminactionoptions` as retire and
still open (`:2370`, blocker unchanged), `audit-sveltekit-mintpreviewtoken` naming a symbol that no
longer exists in `src/lib` (zero hits), and the three transposed or drifted anchors the fold
corrected (`media-replace-blocked` `:4292` above `media-delete-blocked` `:4299`,
`convention-failure-suffix` `:214`, `check-surface-leaks` `:5104`). The `audit-log-entry-published`
keep (`:4314`) is honored: it is quoted verbatim in Ruled inputs, F12's publish-area merge is
recorded as not taken, and no row in the table touches it. `RevertOutcome`'s supersession clause
exists in Task 8 (plan lines 1621-1635, Step 6 at `:1673-1674`, acceptance at `:1699-1702`, and the
args string), cites `docs/superpowers/specs/2026-09-08-polish-passes-design.md` by path and
2026-09-08 by date, states the surviving scope, and names `RevertOutcome` as the ruled exception.

## Held

Everything below was checked and is correct; no action.

- **Fold fidelity.** All 46 findings read against the plan: coverage 1 to 17, executor 1 to 14,
  sequencing 1 to 15. Forty are visibly corrected in substance, including both declines with their
  stated reasons and the two partials. The six failures above are the incomplete corrections
  (coverage 3 and 6, executor 2 and 6, sequencing 1, 7, and 9).
- **Anchors.** Every `file:line` sampled across Tasks 1 to 12 is exact at HEAD: `crypto.ts:48`,
  `auth-crypto/index.ts:11`, `backend.ts:162`, `index.ts:94/127`, `admin-action.ts:206/269`,
  `preview.ts:128/197/431`, `health.ts:28`, `sveltekit/index.ts:27-29/35/55/93`,
  `content-routes.ts:48/59/165`, `cairn-admin.ts:99/116/412`, `nav-routes.ts:25/42`,
  `media-route.ts:78`, `guard.ts:34/164`, `pipeline.ts:41`, `fieldset.ts:39/425`,
  `manifest.ts:136/165`, `excerpt.ts:46`, `delivery/manifest.ts:56`, `delivery/data.ts:58/71/72`,
  `auth-routes.ts:52`, `types.ts:163`, `store.ts:45/52`, `auth-channel/factory.ts:242/247`, all
  eight `events.ts` outlier lines plus `:73-74` and `:83-84` (the one-line correction is real and
  correctly attributed to the identity-seam pass), `LoginPage.svelte:31/101/139/143`, `KEPT`'s
  `:42/:54/:60` with `RETIRED_*` holding none of the window, `admin-toolkit/index.ts:6/42`,
  `PageHeader.svelte:6/63`, the two `cairn-audit` rule comments, `browser-regressions.test.ts:512`,
  the fixture's `gap-0` at `:236` with `gap-0.5` at `:237`,
  `reproductions-stories.test.ts:986/987/990`, `admin-design-system.md:451/459/477/353-359`,
  `CHANGELOG.md:1/3/1542/3011/3148`, `migration-notes.md:12/129-134/148`, `package.json:40`,
  `check-surface.mjs:22/425`, `docs-links.mjs:15`, `finalize.mjs:21/32`, `handle.ts:26/46`.
- **Counts.** 67 `Consumers must:` over `CHANGELOG.md:1-1541`; 24 lowercase anchor fragments; eleven
  `OfficeList` sites in `docs/reference/admin-toolkit.md`; the capture tool's six surfaces; the
  four auth baselines at `admin-visual.spec.ts:61-91`; the allowlist holding one slug against the
  header's claim of forty. File reach re-derived at 500 / 279 / 271 / 212 against the plan's
  505 / 281 / 273 / 214, inside the drift the plan tells the executor to re-derive.
- **Task 12's `OfficeList` site list** matches a fresh `git ls-files | xargs grep -l OfficeList`
  over the tracked tree minus the three archives exactly, for the paths its acceptance grep scopes
  to. The only misses are the two `skills/` files and `ROADMAP.md`, which are failure 1.
- **Executability of Tasks 2, 3, 6, 7, 8, 12, 15.** Every file, script, and npm script named in the
  gate string, the Steps, and the args strings exists (`update-admin-sheet-inventory.mjs`,
  `check-custom-surface.mjs`, `check-admin-css-classes.mjs`, `check-symbols.mjs`,
  `capture-surfaces.mjs`, and all thirteen node entry points plus every `npm run` name in the fence,
  the showcase's four and the CLI's two included). The surface regeneration reads
  `npm run package && node scripts/checks/check-surface.mjs --update` in constraint 5, the
  Corrections block, the Gate's addition 1, and each of Tasks 2, 3, 4, 5, 6, 7, 8, 9, and 12's
  Steps; the five remaining occurrences of `npm run check:surface -- --update` are all the
  prohibition or Task 15's filed follow-up. Every acceptance grep is satisfiable given the archive
  classification and the STATUS exclusion.
- **Args fidelity.** Both files are jq-valid and byte-identical to each other, one chain (`c`) of
  fifteen tasks with ids 1 to 15, `gate` byte-identical to the plan's fence at line 2514, one
  top-level `paintProtocol` with no criteria repeating its text, `"model": "opus"` on task 15 only,
  and one identical `notes` block on all fifteen carrying the constraints. Task 2, 3, 6, 7, 8, 12,
  and 15 criteria were read in full against their plan sections: the ruling, the failing gate, every
  Step, every acceptance line, and the paint branch are all carried, with the plan's decisions
  inlined as instructions rather than dropped.
- **`files` arrays are a curated subset** of each task's Files block (reference pages and test files
  appear in `criteria` instead). `pass-execute-chains.js` uses `t.files` for a single advisory
  prompt line, so this is a shape choice rather than a defect.
- **Consistency.** Fifteen `## Task N` headings, 1 to 15 in order; checkpoints after Tasks 3, 7, 12,
  and 14, matching the spec's amended line; the ceiling stated as 9M in the plan and 9M in the spec,
  with the 80 percent line at 7.2M; no task reference above 15 anywhere; no placeholder; the set
  stated as thirty throughout with no "thirty-two" or "thirty-seven" residue; `grep -c "—"` returns
  0 on the plan, the spec, the fold record, and both args files.
- **Two imprecisions not worth a fix.** `f1-return-position-leak-sanction`'s `Reopens on:` measures
  at `:125-126` and the plan says "about `:124-126`". The fold record's coverage 1 says the header's
  Inputs line drops the charter review; the header still lists it, which is right, since Task 13
  disowns only the slug attribution and Task 8 cites the review's finding 3.
