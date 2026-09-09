# Polish-C plan review, coverage and grounding lens

Read-only adversarial review, fresh context (Opus, high effort), 2026-09-08. Target:
`docs/superpowers/plans/2026-09-08-polish-c-pass.md` (uncommitted, 2,034 lines) and its
workflow args at `~/.cache/cairn-polish-c/args.json`. Spec:
`docs/superpowers/specs/2026-09-08-polish-passes-design.md` revision 4. Inputs read:
`exports-sweep.md`, `spec-review-rev3-charter.md`, `spec-review-rev3-grounding.md`,
`docs/internal/engine-rulings.md`.

Measured against `main` at `f944ca4e` (HEAD, one `docs/STATUS.md`-only commit past the
plan's stated measurement point `f273274e`; every count below was re-run at both and agrees).
The four consumer sites were read read-only in `~/Projects/`. No file in any repo was edited
except this report.

**Seventeen findings.** The plan's grounding is unusually strong: 38 of 40 ledger row anchors
are exact to the line, every factory and symbol anchor in Tasks 1 through 8 is exact, the
505/281/214 file-reach derivation reproduces exactly, and the thirteen-name gate-record claim
is exactly right. The failures cluster in three places: a cited source that does not carry
what is attributed to it, per-task routing of the gate record files, and one anchor whose
line number is right and whose subject is wrong.

Coverage is complete. Every spec task, every Dispositions row routed to C, and every sweep
finding the spec routes to C has a plan task with a checkable acceptance criterion, and
nothing in the plan falls outside the spec's bound. Note for the brief: F2 is not a polish-C
item. The spec assigns it to polish-11a (spec:156 and 11a task 8), and the plan correctly
excludes it.

`args.json` agrees with the plan: one chain, thirteen tasks in plan order, `cairn-implementer`
plus `diff-reviewer`, `maxFix: 1`, and a `gate` string byte-identical to the plan's `## Gate`
block. Every node entry point in that string exists on disk.

## Ranked findings

**1. Plan:21-23 and 1604-1612 -- the seventeen-row population is attributed to a source that does not contain it.**
Evidence: `docs/internal/record/2026-09-08-polish-inputs/spec-review-rev3-charter.md:346`,
whose finding 19 reads "The cut made conditional and the free number verified. HELD, and
over-held against the initiative's own publish ruling. See finding 6." The file's numbered
findings run 1 to 17 (`:17` through `:290`) and its HELD list runs 1 to 20; no slug list
appears anywhere in it (`grep -c audit-adapter-serializemanifest` returns 0), and its only
use of "seventeen" for rows is at `:310`, quoting the spec's own phrase back at it. The plan
states twice that this file's finding 19 "enumerates the seventeen type-and-function rows this
pass annotates" and then prints a seventeen-slug list as that enumeration.
Correction: the list is the plan's own derivation and is correct on the merits (all seventeen
slugs resolve). Say so, and drop the finding-19 attribution. Under the spec's Decisions
preamble ("every amendment ... cites this spec by path and date and quotes the decision text",
spec:60-63) an invented citation is the one failure mode the preamble exists to prevent.

**2. Plan:1629 and 1661-1662 -- "Thirty-seven rows in all" contradicts the task's own acceptance criterion, which counts forty-three.**
Evidence: Task 11 enumerates 17 charter rows, 9 event rows, 11 further rows (37), then "Plus
the conventions rows the pass amends or progress-notes" naming six more, then asserts
thirty-seven. The acceptance criterion at `:1661-1662` requires "The seventeen charter-review
rows, the nine event rows, the eleven further rows, and the six conventions rows named above
... each confirmed present with a Note", which is 43. All 43 slugs and the six conventions
slugs resolve in `engine-rulings.md`, so the population is real; only the total is wrong.
Separately, `audit-admin-pageheader` and `audit-admin-admintable` are annotated by Task 10
(`:1557-1558`) and appear in none of Task 11's four groups, so the claim at `:1619-1620` that
"the grep is complete" is false by two more.
Correction: 43 named rows plus one new row (44 headings touched), or better, follow
`spec-review-rev3-grounding.md:12` and state the population as derived by the gated grep
rather than pinned to any number. Pinning is the exact failure that review told the spec to
stop doing.

**3. Plan:1002, 1200 and 1303-1304 -- three tasks name the wrong gate record file for the names they must update.**
Evidence: `scripts/checks/check-surface-leaks.json` contains none of the thirteen names (its
44 entries are `AdvisoryAction` through `VocabularySaveFailure`). Measured by grep across the
three records: `RequestResult`, `ChannelRequestResult`, `ChannelConfirmResult`, `EditorRow`,
`adminAction`, `RendererOptions`, `FieldsetOptions` and `diffNewlyPublished` live only in
`scripts/checks/check-self-use-allowlist.json`; `NavLoadData`, `VocabularyLoadData` and
`parseManifest` only in `check-surface-reexports.json`; `AuthGuardOptions` and `previewLoad`
in both. Task 7's Files block names `check-surface-leaks.json` "(the `RequestResult`,
`ChannelRequestResult`, `ChannelConfirmResult` entries)" and omits `check-self-use-allowlist.json`
entirely. Task 8's names `check-surface-reexports.json` and `check-surface-leaks.json` "(the
`EditorRow` entries)"; neither holds it. Task 5's names only `check-surface-reexports.json`
for both `parseManifest` and `diffNewlyPublished`, but `diffNewlyPublished` is in the self-use
allowlist.
Correction: the aggregate claim at `:188-195` is exactly right and the thirteen names are
exactly the set. Fix the per-task routing to the file each name actually sits in, or drop the
per-task parentheticals and let constraint 8 (`:502-507`) carry it with a grep. As written,
Tasks 5, 7 and 8 will leave stale strings in the one record file none of them opens, which is
precisely the vacuous-gate hazard constraint 8 cites.

**4. Plan:117 and 1497-1498 -- `admin-design-system.md:451` is not about the `OfficeList` component, and Task 10 is told to rewrite it.**
Evidence: `docs/internal/admin-design-system.md:451` reads "(the office list with no entries),
the state drops the list card and centers on the content area", inside the empty-state recipe.
`:459` fixes the term: "**Office list (the concept list view):** `ConceptList` is built on the
admin toolkit". The file's one `OfficeList` occurrence is `:477` (the F3-rhythm bullet, running
to `:480`). The plan's Reconciliation row says "`:451` confirmed (the office-list empty-state
clause)" and Task 10's Files block orders both passages "correct[ed] ... to describe the
replacement composition".
Correction: drop `:451` from Task 10 and keep only the `:477-480` bullet. The plan re-measured
the line number and inherited the spec's reading of what the line says, which is the failure
the spec's own semantic-column instruction (spec:509-517) exists to catch.

**5. Plan:1486-1494 -- Task 10's file list misses four live in-tree `OfficeList` sites and carries no Test block.**
Evidence, measured by `grep -rn OfficeList src docs examples templates packages scripts`:
`src/tests/component/PageHeader.test.ts` (six sites, one of them a test title at `:42`,
"zeroes the h1/p UA margins and sets the meta role, matching OfficeList"),
`src/tests/unit/audit/rules/rendered/rulings.weight-budget.test.ts` (`:6`, `:71`, and an
`it(...)` name at `:78`), `src/tests/unit/audit/rules/rendered/browser-regressions.test.ts:512`,
and `src/lib/admin-toolkit/index.ts:6`, the barrel's own export roll-call, which names
`OfficeList` beside `PageHeader` and `AdminTable`. Task 10 names only `index.ts:42`, and it is
the one task in the plan with no `- Test:` line at all.
Correction: add the three test files and `index.ts:6` to the Files block. Under constraint 7
(`:496-501`) each is a blocking finding at Step 1, so the task either stalls or makes four
unplanned edits inside the release-path pass. (`src/tests/component/OfficeList.test.ts` does
exist; the plan's "if one exists" hedge at `:1487` can be resolved now.)

**6. Plan:496-501 and 1716-1719 -- the remaining-site taxonomy has no bucket for three real classes, so the sweep manufactures false blocking findings.**
Evidence: constraint 7 admits only a `docs/superpowers/` or `docs/internal/record/` archive, a
historical field in a ruling row, or a `docs/HISTORY.md` or `CHANGELOG.md` entry; "Any other
remaining site is a blocking finding." Measured hits outside all four:
`docs/extend/migration-notes.md:128-131` (the shipped `0.94.0` entry recording `OfficeList`'s
`subtitle` to `meta` rename, correctly historical and correctly untouchable),
`docs/STATUS.md`, and `docs/internal/history/STATUS-archive-2026-07-02-to-2026-07-16.md` and
`-2026-07-21-to-2026-07-28.md`. Task 12's Step 1 repeats the same taxonomy verbatim.
Correction: add "a versioned section of `docs/extend/migration-notes.md`", "`docs/STATUS.md`",
and "`docs/internal/history/`" as classified-and-left classes in both places.

**7. Plan:185-187 and 1692 -- the `Consumers must:` window is 67 occurrences, not 68.**
Evidence: `awk 'NR<=1541' CHANGELOG.md | grep -o "Consumers must:" | wc -l` returns 67 at
`f273274e` and at HEAD; `git show f273274e:CHANGELOG.md | awk '/^## 0\.96\.0/{exit} {print}'`
gives the same 67. The spec's 69 and the plan's correction to 68 are both wrong. Everything
else in the block is exact: `## Unreleased` at `:1`, `<!-- release-size: minor -->` at `:3`,
`## 0.96.0` at `:1542`, window 1,541 lines.
Correction: 67. The plan is right that the number is evidence and never an acceptance number,
so this costs nothing at execution, but Task 12 Step 2 reports it and Task 13 Step 1 restates
it, and a plan that corrects a spec's count should land on the true one.

**8. Plan:1536-1539 and 2002-2003 -- `aksailingclub-org`'s `OfficeList` reach is eighteen admin route files, not sixteen.**
Evidence, read-only in `~/Projects/aksailingclub-org`: `git ls-files | xargs grep -l OfficeList`
returns 18 files under `src/routes/admin/club/`, plus `src/tests/announce-list-order.test.ts`.
The three the plan's count appears to have missed reach the import through a multi-line
`import { ... }` block: `classes/+page.svelte`, `classes/[id]/+page.svelte`, and
`members/+page.svelte`. The plan states "Consumer reach is named, not estimated. Measured
read-only at plan authoring", and repeats sixteen in "What this pass hands forward".
Correction: eighteen screens plus one test file. The rest of the site table is exact and
verifies cleanly (see Measurements).

**9. Plan:1229-1235 and the names table row for `RevertFailure` -- the rename bypasses a closed conventions row instead of superseding it.**
Evidence: `docs/internal/engine-rulings.md:214`, `convention-failure-suffix` (accept, closed):
*"`Failure` is the family suffix; `Refusal` and `Skip` retire as TYPE-NAME suffixes."* Every
arm of `RevertFailure` (`src/lib/sveltekit/types.ts:163`, discriminating `draft_exists`,
`history_stale`, `ref_unknown`) is a refusal, and the type is only ever the payload of
`ActionFailure<RevertFailure>`, so it is the row's own case, not an edge of it. The plan
records the tension on `audit-sveltekit-revertfailure` (an audit row) and states both readings
there, which is honest; but `convention-failure-suffix` appears in no task's Files block, in
none of Task 11's four groups, and in no acceptance criterion. Note also that F18's own fix
sentence (`exports-sweep.md:100`) reads "rename `*Result` to `*Outcome`", which does not reach
a `*Failure` name; the spec's line 7 extended the set.
Correction: Task 7 adds a dated supersession clause to `convention-failure-suffix` itself,
citing the spec by path and date per constraint 12 and decision 6's preamble, stating the
surviving scope (`*Failure` for a payload whose arms are all refusals) and naming
`RevertOutcome` as the ruled exception. Otherwise the ledger's family-suffix row reads closed
while the public surface breaks it, which is the "no dead names in the ledger" promise Task 11
exists to keep, inverted. This is the plan's Note papering over a real contradiction, not an
imagined one; the correction is one clause, not a name change.

**10. Plan:1236-1240 and 1271-1272 -- "the ruled kebab grammar" is not ruled anywhere.**
Evidence: `convention-outcome-idiom` (`engine-rulings.md:196`) rules the discriminant KEY only:
*"the discriminant key is `outcome`, a string literal union"*. No ledger row rules value
casing. The sweep's kebab statement (`exports-sweep.md:124`, "kebab-case values throughout") is
observed uniformity across six types. Meanwhile `src/lib/log/events.ts:5-7` does carry a real
casing rule, *"Every `reason`/`scope` value a record carries is snake_case"*, which Task 9
leaves standing while Task 7 kebab-cases `send_error`, `draft_exists`, `history_stale` and
`ref_unknown`.
Correction: say "uniform across the six existing `*Outcome` types, recorded here as the rule
by the same dated clause that widens the row" rather than "ruled". The two surfaces are
genuinely different (a type's discriminant value against a log record's `reason` field) and
the plan's choice is right; the citation is what overstates.

**11. Plan:122-124 -- five of ten event line anchors are off by one and marked "Confirmed" and "No move".**
Evidence, measured in `src/lib/log/events.ts`: `admin.action.csrf_rejected` at `:66` (plan
`:65`), `auth.access.denied` at `:56` (plan `:55`), `admin.action.sink_threw` at `:72` (plan
`:71`), `audit.sink.write_failed` at `:74` (plan `:73`), `auth.channel.session.created` at
`:84` (plan `:83`). The other five are exact. The plan names the cause in the same table row
("The identity-seam pass added `auth.identity.unknown` and `config.access_unmapped` to the
union"; measured at `:55` and `:22`) and did not propagate the shift.
Correction: locate by string, which Task 9's steps already do. Low execution risk, but a row
that says "Confirmed" for a value it did not re-measure weakens every other row in the table.

**12. Plan:1158-1160 and 1178-1179 -- Task 6's `Consumers must:` line names the wrong two consumer-facing sites.**
Evidence, measured across the four repos: `healthLoad` is imported in
`src/routes/healthz/+server.ts` in all four sites (`ecxc-ski:8`, `907-life:3`,
`aksailingclub-org:7`, `xcathletes-org:8`); `previewLoad` in two only
(`aksailingclub-org/src/routes/(site)/preview/[token]/+page.server.ts:10`,
`xcathletes-org/…:9`); `githubApp` in all four `src/theme/cairn.config.ts`. The plan inherits
the spec's line 6 phrasing ("`githubApp` and `previewLoad` are the two consumers meet") and
locks it into an acceptance criterion: the changelog and migration notes must "name
`cairn.config.ts` and the preview route as the two sites a consumer meets."
Correction: name three, `cairn.config.ts`, `healthz/+server.ts`, and the preview route, with
the preview route flagged as reaching two of four sites. The plan's own Task 12 table two
pages later already lists `healthz` for every site, so the plan contradicts itself here.

**13. Plan:1025-1030 and 1043-1044 -- re-homing `parseManifest` to `.` goes past the spec's "also published on `.`" and is not listed in the Corrections block.**
Evidence: spec:394 (consumer line 4) reads "`serializeManifest` to `formatManifest`;
`parseManifest` also published on `.` (F3)"; the sweep's F3 fix (`exports-sweep.md:32`) reads
"publish `parseManifest` on `.` beside its siblings now". Both read as a second publication
with `/delivery/data` keeping the canonical home, which `canonical-home-rule`
(`engine-rulings.md:55`) and `check-surface-reexports.json`'s recorded-reexport mechanism
satisfy equally well. The plan moves the home to `.` and converts `/delivery/data` into the
recorded re-export.
Correction: the plan's reasoning (F3's charge is the split pair, so leaving the home split
answers half of it) is sound and I would take it. But it is a knowing departure from a spec
sentence and belongs among the six entries under "Corrections this plan makes to the spec and
the sweep, knowingly" (`:210-242`), where Geoff reads them, not inside Task 5's decisions.

**14. Plan:41-43 -- the header mis-describes the spec's own task split.**
Evidence: the spec's polish-C task 5 (spec:423) is "**Outcomes (lines 7, 8).**", carrying both
the four results and `EditorRow`; its task 8 (spec:442) is the `createMediaRoute` record alone.
The plan says "Plan tasks 7 and 8 follow the spec's own split of lines 7 and 8 across its tasks
5 and 8", describing a split the spec does not make.
Correction: "The spec's task 5 carries lines 7 and 8 together; this plan moves line 8 out of it
and folds it with the spec's task 8, so no work is added or removed." The mapping itself is
complete: all ten spec tasks land, and the plan's own three-split accounting at `:25-39` is
otherwise accurate.

**15. Plan:675-677 and 694-695 -- Task 1's "character for character" criterion cannot hold across the import line.**
Evidence: `src/lib/reproductions/stories/CustomScreen.svelte:12` imports from
`'../../admin-toolkit/index.js'`; `docs/extend/add-a-custom-admin-screen.md:104` imports from
`'@glw907/cairn-cms/admin-toolkit'`. They differ today by construction and must. Step 3 orders
the doc rewritten "to match the story character for character on the snippet" and the
acceptance says "its worked snippet matches the story file's markup".
Correction: scope both to the markup below the `<script>` block, which is what the story's own
lockstep comment means and what `check:snippets` actually proves. The rest of Task 1's
interface block is exact: the props contract
`{ data: { events: { id: string; name: string; status: string }[] } }` matches
`CustomScreen.svelte:14` verbatim.

**16. Plan:1551-1552 and 1572-1573 -- the sheet-inventory fixture holds `gap-0` and `gap-0.5` on adjacent lines.**
Evidence: `src/tests/unit/fixtures/admin-sheet-inventory.txt:236` is `gap-0`, `:237` is
`gap-0.5`, and `gap-0.5` is live (`PageHeader`'s own rhythm, cited at
`admin-design-system.md:479`). A line-oriented removal keyed on the string `gap-0` takes both.
Correction: say "delete the exact line `gap-0` at `:236`, leaving `gap-0.5` at `:237`". The
task's "report the exact diff to the inventory" step would catch it; naming it removes the
chance.

**17. Plan:1704 -- `xcathletes-org` does not name `DevBackendOptions`, so `DevBackendConfig` is not an upgrade action for it.**
Evidence: `xcathletes-org/src/hooks.server.ts:62-63` reads
`const { devBackendHandle } = await import('@glw907/cairn-cms-dev'); handle = devBackendHandle();`
with no argument and no type annotation. No site in the four names the type.
Correction: the site table's note should read "the one site on the dev package; it calls
`devBackendHandle()` bare today, so the rename reaches it only if it starts annotating." The
`Consumers must:` line still names the rename correctly, since the type is published surface.

## Measurements verified

| Claim | Plan's number | My number |
|---|---|---|
| Identifiers renamed or removed | 30 (11 types, 10 functions, 1 component, 8 events) | 30, arithmetic and membership both exact |
| Tracked files matching the 30 plus the 4 factories | 505 | **505** |
| Same, excluding `docs/superpowers/` and `docs/internal/record/` | 281 | **281** |
| Same, under `src/`, `examples/`, `templates/`, `packages/` | 214 | **214** |
| `Consumers must:` in `CHANGELOG.md:1-1541` | 68 (spec said 69) | **67** |
| Changelog window length; `## 0.96.0` heading | 1,541 lines; `:1542` | 1,541; `:1542` (marker `:3`) |
| `migration-notes.md` `## Unreleased` window | `:12` to `## 0.96.0` at `:148` | `:12` to `:148` |
| Ledger rows the pass annotates | 37 plus one new | **43 named plus one new** (37 audit + 6 conventions), and 2 more (`audit-admin-pageheader`, `audit-admin-admintable`) annotated by Task 10 outside all four groups |
| Ledger row line anchors quoted | 40 rows | 38 exact; `audit-log-media-delete-blocked` is `:4299` and `-replace-blocked` is `:4292` (the plan transposes the pair) |
| Ledger slugs cited anywhere in the plan | 48 | all 48 resolve as `## <slug>:` headings; the plan's `grep -n "^## <slug>"` locator works |
| Header allowlist claim vs the allowlist file | header says 40, file holds 1 | header `:26` says 40; `check-rulings-format-allowlist.json` holds exactly 1 slug |
| Names in the three gate record JSONs | 13, listed | **13, exactly that set** (routing per task is wrong, finding 3) |
| `ecxc-ski` files the window touches | 4 | 4, exact (`cairn.server.ts`, media route, `healthz`, `cairn.config.ts`) |
| `907-life` files | 4 | 4, exact, same four calls |
| `xcathletes-org` files | 5 | 5, exact; dev package dep confirmed `^0.96.0` |
| `aksailingclub-org` `OfficeList` screens | 16 | **18** under `src/routes/admin/club/`, plus `src/tests/announce-list-order.test.ts` |
| `aksailingclub-org` other call sites | 8 named | all 8 verified; `createContentRoutes` is `src/tests/adapter.test.ts` only, and no site calls `createNavRoutes` or `createContentRoutes` in production, exactly as the plan states |
| Highest published version | `0.96.0` | `0.96.0` (`npm view` tail) |
| `check:figures` in the committed gate | absent | absent from `HEAD:.github/workflows/test.yml` and from `HEAD:package.json`; present only in the working tree |
| npm scripts chaining `npm run package` | 12, listed | 12 in the gate list, exact (5 more exist outside it) |
| `npm run` gates in committed `test.yml` | 31 | 34 `npm run X` invocations across 33 lines; "thirty-one" is imprecise, though the plan's derived string covers every one of them |
| Line anchors sampled in Tasks 1-6 | all | all exact: `guard.ts:34`/`:164`, `pipeline.ts:41`, `fieldset.ts:39`/`:425`, `handle.ts:26`/`:46`, `nav-routes.ts:25`/`:42`, `content-routes-settings.ts:86`, `index.ts:94`, `manifest.ts:136`/`:165`, `data.ts:58`/`:71`/`:72`, `excerpt.ts:46`, `delivery/manifest.ts:56`, `crypto.ts:48`, `backend.ts:162`, `admin-action.ts:206`, `preview.ts:128`/`:197`/`:431`, `health.ts:28`, `sveltekit/index.ts:27-29`/`:35`/`:55`/`:93`, `index.ts:127`, `auth-crypto/index.ts:11`, `content-routes.ts:59`/`:165`, `cairn-admin.ts:99`/`:412`, `media-route.ts:78`, `finalize.mjs:21`/`:32`, `checks-local.ts:345`, `conditions.ts:209` |
| Line anchors sampled in Tasks 7-13 | at least 12 | 24 sampled: exact except the five event lines (finding 11) and `admin-design-system.md:451` (finding 4). Verified exact: `auth-routes.ts:52`, `factory.ts:242`/`:247`, `types.ts:163`, `store.ts:45`/`:52`, `auth/types.ts:13`, `events.ts:5-7`, `admin-action.ts:269`, `audit-sink.ts:75`/`:122`, `log-events.md:7`/`:74`/`:82`, `engine-rulings.md:26`/`:94`/`:5104`, `admin-toolkit/index.ts:42`, `reference/admin-toolkit.md:657-661`/`:663-665`/`:667` (the spec's `:669` is corrected right), `admin-design-system.md:353-359`/`:477-482`/`:1215-1216`, `admin-sheet-inventory.txt:236`, friction log `:25`/`:60`, `HISTORY.md:10`/`:54`/`:88`, `ROADMAP.md:284`, initiative design `:122-124`, `capture-surfaces.mjs:59`, `playwright.config.ts:31-32`, `AdminTable.svelte:78`, `reproductions/manifest.ts:298-304`, `stories/site.ts:96-101`, `reproductions-manifest.test.ts:41`, `reproductions-stories.test.ts:986`, both `cairn-release` skill quotes |

## Names table check

**33 rows. 31 hold as cited. Two carry a citation problem, one of them load-bearing.**

Rows that hold. All five convention quotes the plan reproduces are verbatim against the
ledger: `convention-verb-rules` (`:170`), `convention-bare-noun-functions` (`:185`),
`convention-parameter-bags` (`:130`), `convention-outcome-idiom` (`:196`), and
`convention-interop-carve-out` (`:142`). Every "Ledger row it touches" cell resolves to a real
heading with the verdict the cell states (spot-verified on `audit-sveltekit-requestresult`,
keep, whose any-site case does read "branches on form.status", confirming the charter review's
finding 3 correction; on `audit-sveltekit-revertfailure`, reshape closed; on
`audit-admin-officelist`, reshape closed; and on `audit-sveltekit-authroutes`, whose
`- **Annotation (conventions pass, Task 2):**` line is a real precedent for the annotate-not-
reopen model Task 10 cites). The `mintPreviewToken` correction is right:
`audit-sveltekit-mintpreviewtoken` (`:2266`) names a symbol absent from `src/lib`, and the name
is free. The `githubApp` two-symbol correction is right: `src/lib/doctor/checks-github.ts:14`
is `export const githubApp: DoctorCheck`, an exported value, exempt under the same ruling's
second clause. The seven verb-first arguments are argued individually against the ruled
vocabulary with declined alternatives named, which is what the spec asked of them, and the
consistency note about `editLoad`/`navLoad` staying noun-first is correct: none of them is an
exported function.

**Row 21, `RevertFailure` to `RevertOutcome`: citation problem, load-bearing.** See finding 9.
The rename contradicts `convention-failure-suffix` (`:214`, accept/closed), the row is not in
any task's Files block, and the plan's Note records the tension on an audit row instead of
superseding the conventions row that states the rule. This is the one rename that bypasses a
closed row rather than citing and superseding it in text with the source and date decision 6
requires. The fix is one dated clause in Task 7, not a different name.

**Rows 1 to 4, the four `*Options` to `*Config` renames: citation problem, cosmetic.** The
"Argues from" cells lead with `convention-parameter-bags`, whose ruled text
(*"`*Config` is the primary bag, the primary parameter identifier is `config`"*) scoped its
population to four `*Config` rows and, as F17 itself states (`exports-sweep.md:93`), "did not
reach these three". The renames rest on F17 plus decision 6, with the row widened by Task 4's
own dated clause. The cells do name F17 and decision 6 alongside, so nothing is hidden; the
order just reads as though the closed row already covers the population.

**The `audit-log-entry-published` keep exception is honored.** The Ruled inputs block
(`:295-299`) quotes the row (`:4314`) verbatim, F12 is listed in the spec's "Findings not
taken" and in the plan's Ruled inputs, and no task in the plan renames any `entry.*` or
`publish.*` member: the eight event renames are the six refusal outliers plus
`taxonomy.field_unmarked` and `admin.action.sink_threw`, verified against
`src/lib/log/events.ts`.

## Checked and found true

- **Coverage is complete.** All ten spec polish-C tasks map onto the thirteen plan tasks with
  no work added or removed (spec 2 to plan 2+3, spec 3 to plan 4, spec 4 to plan 5+6, spec 5
  to plan 7+8, spec 6 to plan 9, spec 7 to plan 10, spec 8 folded into plan 8, spec 9 to plan
  11, spec 10 to plan 12+13). Both Dispositions rows routed to C are carried. Every sweep
  finding the spec routes to C has a task: F3 (Task 5), F11 and F13 (Task 9), F14 (Task 4),
  F15 (Tasks 3 and 8), F17 (Task 4), F18 (Task 7), F19 (Task 8), F20 (Task 6), F21 (Task 5),
  decision 6's whole family set including `DevBackendOptions` in the dev package (Task 4),
  decision 8 (Tasks 1 and 10), decision 11 (Tasks 2 and 3). F12 and F16's positional shape are
  correctly not taken. F7 is correctly deferred.
- **Nothing in the plan exceeds the spec's bound.** Every task traces to a sweep finding, a
  Decision, or a Dispositions row. The two consequential additions Task 10 makes (the two
  `cairn-audit` rule comments at `viewport-overflow.ts:20` and `weight-budget.ts:58`) are
  stale-reference repairs caused by the removal, not new scope.
- **Every acceptance criterion in the plan is checkable by a command or a file read.** I found
  no criterion resting on a reviewer's judgment alone.
- **The paint-neutral claim is sound.** `examples/showcase/e2e/custom-screen.spec.ts` takes no
  screenshot; the capture tool's six surfaces (`capture-surfaces.mjs:59` onward) render none of
  the changed code; `AdminTable.svelte:78` sets `overflow-x: auto` on its own wrapper, so
  Task 1's decision to write `card-shell card-shadow` without `overflow-x-auto` is exactly what
  the floating-card recipe at `admin-design-system.md:353-359` requires ("A component composes
  its own `overflow-*` and padding; neither role sets them").
- **The gate string is executable.** Every `node scripts/checks/*.mjs` path in it exists, and
  the twelve package-chaining scripts the plan names are exactly the twelve that chain
  `npm run package` inside the gate list.
- **The pre-dispatch block is right on the worktree trap.** The showcase symlink hazard and the
  single port-4173 e2e slot both verify (`playwright.config.ts:30-32`).
- **`RETIRED_CORE_ARMS` and `RETIRED_TIER1`** exist at `sveltekit-barrel-prune.test.ts:22` and
  `:31` and contain no name this window renames, so the plan's warning is defensive rather than
  live. Worth saying so in the plan.
- **Both `cairn-release` quotes in Task 13 are verbatim** against
  `~/.claude/skills/cairn-release/SKILL.md:67` and `:73`.
- **`log-events.md` has no generator**, as the plan states: no `emit:log-events` script exists
  and `package.json`'s only figure-or-events script is the uncommitted `check:figures`.
