# Polish-C Pass Implementation Plan (audit remediation, slice 12: the breaking window and the release cut)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with ONE chain (sequential), launched as ONE
> workflow run; see Execution. Steps use checkbox syntax for tracking. Every anchor is
> re-verified at dispatch against the `main` head after polish-11a and polish-11b merge, per the
> Reconciliation block below.

**Goal:** every rename and removal the family read found lands in one branch, with one
`Consumers must:` list, the scaffolder and the migration notes updated in the same pass, the
custom-screen example rebuilt before the `OfficeList` export leaves, every ruling row whose
subject the window renames annotated, and the release readiness derived and recorded so the
conductor can cut through `cairn-release` after the merge.

**Spec:** `docs/superpowers/specs/2026-09-08-polish-passes-design.md`, revision 4, section
"Polish-C", with the Decisions block (6, 8, 11 in particular), the Dispositions table, "Findings
not taken", "Sequencing and budgets", and "Risks".

**Inputs beyond the spec:** `docs/internal/record/2026-09-08-polish-inputs/exports-sweep.md`
(F1 through F21), `docs/internal/engine-rulings.md`, and the charter review at
`docs/internal/record/2026-09-08-polish-inputs/spec-review-rev3-charter.md`. The three-lens
adversarial review of this plan (`plan-c-review-coverage.md`, `plan-c-review-executor.md`,
`plan-c-review-sequencing.md`, 46 findings) is folded into this revision, with the disposition of
every finding recorded in `plan-c-review-fold.md` beside them.

**Task count:** fifteen. The spec lists ten. Five spec tasks exceed the four-deliverable sizing
rule and are split here, with no work added or removed:

- The spec's task 2 (the bag, all four factories) becomes plan tasks 2 and 3. The split follows a
  semantic boundary as well as a size boundary. `createContentRoutes` and `createCairnAdmin`
  already take a config bag, so `runtime` moves INTO an existing bag; `createNavRoutes` and
  `createMediaRoute` take a bare positional runtime and gain a bag that does not exist yet.
  Measured at plan authoring, forty-two in-tree files call one of the four, so one task would
  carry a diff no reviewer can read against acceptance criteria.
- The spec's task 4 (the manifest codec, the two one-off verbs, and the seven noun-first names)
  becomes plan tasks 5, 6, and 7. Task 5 is the codec and the two verbs. Tasks 6 and 7 split the
  seven noun-first names by name group, and it is tasks 6 and 7 that Geoff reads names for.
- The spec's task 5 (lines 7 and 8 together) becomes plan tasks 8 and 9. The spec carries the four
  discriminated results and `EditorRow` in one task; this plan moves line 8 out of it and folds it
  with the spec's task 8 (the `createMediaRoute` record), because both are one-sentence
  disclosures on the same barrel. No work is added or removed.
- The spec's task 6 (the log vocabulary) becomes plan tasks 10 and 11, split at the vocabulary
  boundary: the six refusal outliers with the two-verb table, then the two area moves with the
  dotted-subject clause.
- The spec's task 10 (the consumer list and the cut) becomes plan tasks 14 and 15. Task 14
  reconciles the window's consumer-facing record; task 15 is the records and release-readiness
  task the pass ends on.

**Why the seven-name split is by name group and not by propagation.** The executor review proposed
cutting the seven noun-first renames at the `src/lib`-versus-propagation boundary. That cut is not
available: constraint 3 requires the full gate green at every commit, and the gate runs
`check:template`, `check:snippets`, the CLI suite, and `npm --prefix examples/showcase run check`,
each of which goes red the moment `src/lib` renames without its propagation. The cut is therefore
by name group, with each group propagated whole inside its own task: Task 6 takes the three
factory-shaped names that reach the scaffolder and the showcase config
(`cookieName`, `githubApp`, `adminAction`), Task 7 takes the four preview and health names on the
`/sveltekit` route surface. The same reasoning governs the log split: Tasks 10 and 11 each rename a
complete group of event strings.

**Token ceiling:** 9M, re-derived here for the folded fifteen-task shape and superseding the
spec's 7M for a ten-task shape. The arithmetic: fifteen gate-bearing units at 500K each is
7.5M, plus about 0.5M for the four-reviewer pass-end fan-out and Task 15's whole-window reads,
plus a named 1M reserve for two re-dispatch fix rounds, since the chain allows one re-dispatch per
task and this plan's acceptance criteria are precise enough that a fix round on a few tasks is the
likely case rather than the bad case. The 500K figure is the upper half of the risk lens's measured
band for this repo (370K to 530K per task over the comparable passes: conventions 4a about 530K,
conformance 4b about 430K, internals about 400K, chassis-A about 367K), taken above the middle 11a
used because polish-C's per-task work is wider than 11a's: each rename task sweeps a name group
across 273 tracked files outside the three write-once archives, the `check:surface` snapshot
regenerates on most tasks, and Task 15 reads a 1,541-line changelog window. **The spec's Sequencing
ceiling line is amended for C in the same revision as this plan**, from 7M to 9M with this
derivation, and its total to 27.5M. The spec's Sequencing line now reads "11a 6.5M ..., 11b
split by Geoff on 2026-09-08 into 11b-i at 7.0M ... and 11b-ii at 5.0M ..., C 9M ..., so 27.5M is
the total on the table". The repo's recorded overrun history is four for four on
the last comparable passes (`docs/HISTORY.md`), so at 80 percent of the ceiling (7.2M) the
conductor finishes the task, writes STATUS, and asks one combined question.

**Checkpoints:** four, after Tasks 3, 7, 12, and 14, each writing STATUS (task ledger, decisions
taken, spend against the ceiling, next task). Checkpoint 3 lands immediately after the arity change,
the pass's first breaking move. Checkpoint 7 lands after the seven-name sweep, the widest grep reach
in the pass. Checkpoint 12 lands after the `OfficeList` removal, the one task that deletes a
shipped export. Checkpoint 14 lands immediately before the release-readiness task. The span from 7
to 12 is the longest at five tasks, and it is deliberate: Tasks 8 through 11 are single-subject
tasks over disjoint file sets, and each ends with the full gate green.

**Execution:** sequential, one chain, in one worktree: `.claude/worktrees/polish-c` on branch
`polish-c`, branched from `main` after polish-11b merges. No parallel chains: the single
end-to-end slot, `CHANGELOG.md`, `docs/internal/api-surface.md`, and
`docs/internal/engine-rulings.md` are all contended, and every task after task 1 renames a symbol
a later task's file set also names. Open the PR after Task 1's commit.

**The chain runs as ONE workflow run.** Run one is Tasks 1 to 15.

**Pre-dispatch, before the run.** All five are preconditions, not task steps, and none is true at
plan authoring:

1. Confirm polish-11a and both halves of polish-11b, `polish-11b-i` and `polish-11b-ii`, have
   merged to `main`. Geoff split 11b into two passes after this plan was authored, so polish-C
   branches after 11b-ii, per the spec's Sequencing block.
2. Commit this plan onto `polish-c`. The workflow's implement prompt names the plan as committed
   in the repo and orders a first read of its Global constraints, Ruled inputs, and Task section;
   an untracked plan means fifteen dispatches that cannot follow instruction one.
3. Create the worktree `.claude/worktrees/polish-c` on `polish-c` off post-11b `main`.
4. Run a from-scratch `npm install` in that worktree's `examples/showcase`. A worktree's
   `examples/showcase/node_modules` symlinks back to the main checkout and resolves both `file:`
   deps to `main`'s build, so without the reinstall the e2e proves `main`'s engine rather than the
   renamed surface.
5. **Arm the unattended-work guards.** Fifteen sequential gates at 16 to 28 minutes each is three
   and a half to seven hours of gate time before any implementer or reviewer turn, so the run is
   long unattended work by the workstation rule. Arm the runaway transcript watcher and, on
   battery, `systemd-inhibit --what=sleep` plus the battery watchdog, per
   `~/.claude/docs/unattended-work-guards.md`, which is read before either is armed.

---

## Reconciliation at dispatch

Every `file:line` below is quoted as the spec or the exports sweep states it, with the value
measured on `main` at `0705776e` beside it. **Polish-11a and polish-11b both merge between this
plan's authoring and this pass's branch, so the executor re-verifies every anchor against post-11b
`main` before its task runs.** Anchors those two passes are known to move are marked "post-11a" or
"post-11b" and carry the path their plans' Produces blocks name.

**Every polish-11b task number in this plan is provisional.** This plan was authored before 11b
merged, against a draft of one 11b plan that Geoff has since split into `polish-11b-i` and
`polish-11b-ii`; the numbers below are that draft's. The executor re-reads BOTH committed plans,
`2026-09-08-polish-11b-i-pass.md` and `2026-09-08-polish-11b-ii-pass.md`, at dispatch and locates
every 11b-produced anchor by prose, never by the task number quoted here.

### Line anchors

| Spec or sweep anchor | Measured at `0705776e` | Note |
|---|---|---|
| `AuthGuardOptions` `src/lib/sveltekit/guard.ts:73` (F17) | `:34`, with `createAuthGuard(opts: AuthGuardOptions = {})` at `:164` | Drifted by 39 lines. The sweep's `:73` is stale |
| `RendererOptions` `src/lib/render/pipeline.ts:93` (F17) | `:41`, re-exported at `src/lib/index.ts:110` | Drifted by 52 lines |
| `FieldsetOptions` `src/lib/content/fieldset.ts:423` (F17) | Declared at `:39`; the `options: FieldsetOptions = {}` parameter is at `:425` | The sweep cited the parameter, not the declaration. Both are in the file set |
| `DevBackendOptions` (decision 6) | `packages/cairn-cms-dev/src/handle.ts:26`, with `devBackendHandle(options?: DevBackendOptions)` at `:46` and the type re-exported at `packages/cairn-cms-dev/src/index.ts` | New measurement. **Post-11b:** 11b's Task 11 (the dev handle's `cairnAccess` parity) adds an `access` member and a roles declaration to this bag, so the rename lands on 11b's shape |
| `NavLoadData` `src/lib/sveltekit/nav-routes.ts:25` (F14) | Confirmed at `:25`; re-exported `src/lib/sveltekit/index.ts:55` | No move |
| `VocabularyLoadData` `src/lib/sveltekit/content-routes-settings.ts:86` (F14) | Confirmed; re-exported `src/lib/sveltekit/content-routes.ts:48` and used at `src/lib/reproductions/fixtures.ts:252` | No move |
| `serializeManifest` `src/lib/index.ts:94` (F3) | Confirmed at `:94`; declared `src/lib/content/manifest.ts:136` | No move |
| `parseManifest` `src/lib/delivery/data.ts:72` (F3) | Confirmed; declared `src/lib/content/manifest.ts:165` | No move |
| `deriveExcerpt` `src/lib/content/excerpt.ts:46` (F21) | Confirmed; re-exported `src/lib/delivery/data.ts:58` | No move |
| `diffNewlyPublished` `src/lib/delivery/manifest.ts:56` (F21) | Confirmed; re-exported `src/lib/delivery/data.ts:71` | No move |
| The seven noun-first functions (F20) | `cookieName` `src/lib/auth/crypto.ts:48`; `githubApp` `src/lib/github/backend.ts:162`; `adminAction` `src/lib/sveltekit/admin-action.ts:206`; `previewMint` `src/lib/sveltekit/preview.ts:128`; `previewRevoke` `:197`; `previewLoad` `:431`; `healthLoad` `src/lib/sveltekit/health.ts:28` | All seven confirmed at the sweep's lines |
| `RequestResult` `src/lib/sveltekit/auth-routes.ts:50` (F18) | `:52`, three arms discriminating on `status` | Drifted by 2 lines |
| `ChannelRequestResult` `src/lib/auth-channel/factory.ts:242`, `ChannelConfirmResult` `:247` (F18) | Both confirmed | No move |
| `RevertFailure` `src/lib/sveltekit/types.ts:160` (F18) | `:163`, three arms discriminating on `reason` | Drifted by 3 lines |
| `EditorRow` `src/lib/auth/store.ts:45` (F19), `Editor` `src/lib/auth/types.ts:13` | `EditorRow` confirmed at `:45`; `findEditor` returns it at `:52` | No move |
| `OfficeList` export `src/lib/admin-toolkit/index.ts:42`, component `src/lib/admin-toolkit/OfficeList.svelte` | Both confirmed. The barrel ALSO names it in its component roll-call comment at `:6`. The both-stay sentence is `OfficeList.svelte:8-9`; the `gap-0` paragraph is `:17-22`; the card frame is `:47` | The spec and the charter review both cite `OfficeList.svelte` without a path; it is under `src/lib/admin-toolkit/`, not `src/lib/components/` |
| `docs/reference/admin-toolkit.md:669` (the ```svelte fence) | The page names `OfficeList` at `:8` (the subpath's component list), `:191` (an `import` line inside a ```ts fence), `:613` (`PageHeader`'s own description, "the `OfficeList` shape generalized"), `:635` (the section heading), the both-stay prose at `:657-661`, the `subtitle`-to-`meta` note at `:663-665`, and the ```svelte fence opening at `:667` | Eleven sites, not one section. `:191` is the sharp one: `check:snippets` typechecks that fence against the built package |
| `docs/internal/admin-design-system.md:451` and `:476-480` | **`:451` is NOT about this component.** It reads "(the office list with no entries), the state drops the list card", inside the empty-state recipe, and `:459` fixes the term: "**Office list (the concept list view):** `ConceptList` is built on the admin toolkit". The file's one `OfficeList` occurrence is the F3-rhythm bullet at `:477-480` | **Post-11b:** 11b's Task 1 rewrites eight `AdminLayout.svelte` references in this file and adds the busy recipe, so the bullet moves. Locate by prose, never by line. Task 12 edits the `:477-480` bullet and leaves `:451`, `:158-159`, and `:896` alone: all three describe the concept-list view, not the retired component |
| `docs/internal/admin-design-system.md:1215-1216` (the floating-card recipe named) | Confirmed at `:1215-1216`. The recipe itself is at `:353-359`, `card-shell card-shadow` | New anchor. Task 1 composes against `:353-359`, the recipe's own text |
| `src/tests/unit/reproductions-manifest.test.ts:41` (the pinned id list) | Confirmed: `'toolkit/custom-screen'` at `:41` | No move |
| The `toolkit/custom-screen` subject | `src/lib/reproductions/stories/CustomScreen.svelte`, registered `src/lib/reproductions/stories/site.ts:96-101`, manifest row `src/lib/reproductions/manifest.ts:298-304`, component assertions `src/tests/component/reproductions-stories.test.ts:986-1000`, whose `it(...)` title at `:987` and comment at `:990` both name the office list | New anchors. The spec names the reproduction without its files |
| `docs/extend/add-a-custom-admin-screen.md` OfficeList prose and snippet | `:92-97` (the choose-a-primitive prose), `:104` (the import line), `:109` and `:124` (the `OfficeList` wrapper) | New anchors |
| The eight event outliers (F11, F13) | `src/lib/log/events.ts`: `taxonomy.field_unmarked` `:24`, `preview.rejected` `:30`, `guard.rejected` `:34`, `media.delete_blocked` `:44`, `media.replace_blocked` `:48`, `auth.access.denied` `:56`, `admin.action.csrf_rejected` `:66`, `admin.action.sink_threw` `:72` | **Five of these correct the plan's first measurement by one line.** The identity-seam pass added `auth.identity.unknown` (`:55`) and `config.access_unmapped` (`:22`) to the union and the shift was not propagated. Neither new event is in this window. Locate by string |
| `audit.sink.write_failed` `events.ts:73`, `auth.channel.session.created` `:83` | `:74` and `:84` | Both off by one for the same reason |
| The events header grammar sentence | `src/lib/log/events.ts:5-7`, `area[.subject].verb_phrase` | Confirmed |
| `f1-return-position-leak-sanction` `docs/internal/engine-rulings.md:94` | Confirmed; `Reopens on:` still reads open at `:124-126`, and the rider's own row `check-surface-leaks` is at `:5104` | The rider landed. The row is stale-open |
| The ledger header's allowlist claim | `docs/internal/engine-rulings.md:26`, "The remaining 40 stay truncated and allowlisted" | `scripts/checks/check-rulings-format-allowlist.json` holds ONE slug today. The count is wrong by 39 |
| `audit-log-media-delete-blocked` and `audit-log-media-replace-blocked` | `audit-log-media-replace-blocked` is `:4292` and `audit-log-media-delete-blocked` is `:4299` | The plan's first measurement transposed the pair. Corrected here; locate both by slug |
| `2026-08-27-audit-remediation-initiative-design.md` standing constraints | The heading is at `:136`; the CI-derived gate clause runs `:138-140` and the changelog-and-ledger clause `:141-144` | Matches 11a's measured correction, not the spec's `:137-139` / `:140-143` |
| The initiative's publish ruling | `2026-08-27-audit-remediation-initiative-design.md:122-124` | The spec quotes it; re-verify after chassis-B2's Task 8, which amends that file's publish paragraph |
| `CHANGELOG.md`'s window | `## Unreleased` at `:1`, `<!-- release-size: minor -->` at `:3`, `## 0.96.0` at `:1542` | The window is 1,541 lines and carries **67** `Consumers must:` occurrences at this head. The spec's 69 and this plan's first correction to 68 are both wrong; 67 reproduces at `f273274e` and at `0705776e` |
| `docs/extend/migration-notes.md` `## Unreleased` | `:12`, running to `## 0.96.0` at `:148` | Confirmed. The section carries a LIVE bullet at about `:129-134` instructing a consumer to rename `OfficeList`'s `subtitle` prop to `meta`, advice about a component this same unpublished window deletes. Task 14 retires it |
| `docs/internal/docs-friction-log.md` | Both sections read "None open." at `:25` and `:60`; the Clearings table below them is a historical record and names `previewLoad` at `:87` | Task 15 re-reads rather than assuming, and leaves the Clearings table alone |
| `ROADMAP.md` audit-remediation entry | Opens `:284`; the polish sub-bullet runs about `:340-365` | **Post-11a and post-11b:** both passes' records tasks close sub-bullets by name and chassis-B2's Task 8 rewrote the bullet. Task 15 reconciles against the head it finds |
| `docs/HISTORY.md` headings | Chassis-B1 `:10`, identity seam `:54`, chassis-A `:88` | **Post-11a:** 11a's records task retro-numbers B1 as 9a and the identity seam as 10 |

### Post-11a and post-11b anchors, named from their plans' Produces blocks

- **The nine modules 11a produces**, from `2026-09-08-polish-11a-pass.md`'s "What this pass hands
  forward": `src/lib/sveltekit/content-routes-entry-read.ts`, `-entry-write.ts`,
  `-entry-destructive.ts`, `-entry-revert.ts`, `content-routes-media-shared.ts`,
  `-media-library.ts`, `-media-ingest.ts`, `-media-delete.ts`, `-media-metadata.ts`, plus four
  helpers added to the existing `content-routes-shared.ts`. `content-routes-entry.ts` and
  `content-routes-media.ts` do not exist after 11a. **No symbol this window renames declares in any
  of the nine**, which is measured, not assumed: all thirty are in `auth/`, `github/`,
  `content/`, `delivery/`, `render/`, `log/`, `admin-toolkit/`, `auth-channel/`, or the
  `sveltekit/` leaf files (`guard.ts`, `admin-action.ts`, `preview.ts`, `health.ts`,
  `auth-routes.ts`, `nav-routes.ts`, `content-routes-settings.ts`, `types.ts`,
  `media-route.ts`). **Polish-C therefore re-derives the module map from the tree** and uses the
  hand-forward as a cross-check, exactly as 11a's own Rollback block instructs.
- **`DeleteFailure`, `MediaDeleteFailure`, and `BulkDeleteSkippedAsset`** are settled names from
  11a. No task in this pass renames them again.
- **The barrel-prune literal this window touches is `KEPT`, not the `RETIRED_*` pair.** In
  `src/tests/unit/sveltekit-barrel-prune.test.ts`, `RETIRED_CORE_ARMS` (`:22`) and `RETIRED_TIER1`
  (`:32`) hold 11a's retired names and none of this window's. `KEPT` (`:36-65`) holds
  `'RequestResult'` (`:42`, Task 8), `'NavLoadData'` (`:54`, Task 4), and `'healthLoad'` (`:60`,
  Task 7). The test asserts against `dist/sveltekit/index.d.ts`, so a stale `KEPT` either fails
  loudly or asserts a name that no longer exists, which is the vacuous-gate hazard 11a raised.
  The file is named in Tasks 4, 7, and 8's Files blocks rather than left to `src/tests/**` by grep.
- **`eslint.config.js`'s `.svelte` glob** reaches `src/lib/components/**/*.svelte` after 11a's
  Svelte lint wiring task, with `tsdoc/syntax` at error. Three tasks write `.svelte` comments.
  Task 1's subject (`src/lib/reproductions/stories/CustomScreen.svelte`) and Task 12's
  (`src/lib/admin-toolkit/OfficeList.svelte`, `PageHeader.svelte`) sit OUTSIDE that glob; **Task 8's
  subjects (`src/lib/components/LoginPage.svelte` and `ConfirmPage.svelte`) sit INSIDE it**, so
  Task 8's comments face a gate at error. Every one of the three writes TSDoc-clean comments
  regardless, and the executor confirms which glob 11a actually landed rather than assuming.
- **`docs/reference/components.md` and `docs/reference/sveltekit.md`** are edited by 11a's media
  split for the `MediaDeleteRefusal` rename. Tasks 4, 5, 6, 7, 8, 9, and 10 all edit them again.
- **`examples/showcase/src/routes/admin/signups/**`** is rewritten by 11b's Tasks 12, 13, and 14
  (the server half onto `createSectionAction`, the form's labels and composition, the destructive
  row). No polish-C task edits any of them, but Task 6's `adminAction` rename greps the server
  file, so the executor re-reads it rather than the pre-11b shape.
- **`docs/internal/admin-design-system.md`** is rewritten by 11b's Task 1 (the busy recipe, the
  `CairnAdminShell` correction). Tasks 1 and 12 open it after that rewrite.

### Counts the spec states that measurement corrects

- **The window's file reach, over three excluded trees rather than two.** The spec's risk block
  states 464 tracked files and 267 excluding `docs/superpowers/` and `docs/internal/record/`, for
  twenty-five identifiers at `f3f24b9f`. Re-derived by the same method at `0705776e` over this
  plan's set of thirty renamed or removed identifiers plus the four factories whose signature
  changes: **505 tracked files match; 281 excluding the two archive trees the spec names; 273 also
  excluding `docs/internal/history/`, which is a write-once archive on the same reasoning; and 214
  under `src/`, `examples/`, `templates/`, and `packages/` alone.** The executor re-derives once
  more against post-11b `main` and reports the four numbers.
- **The identifier count is thirty, not twenty-five.** Eleven types (`AuthGuardOptions`,
  `RendererOptions`, `FieldsetOptions`, `DevBackendOptions`, `NavLoadData`, `VocabularyLoadData`,
  `RequestResult`, `ChannelRequestResult`, `ChannelConfirmResult`, `RevertFailure`, `EditorRow`),
  ten functions (`serializeManifest`, `deriveExcerpt`, `diffNewlyPublished`, `cookieName`,
  `githubApp`, `adminAction`, `previewMint`, `previewRevoke`, `previewLoad`, `healthLoad`), one
  component (`OfficeList`), and eight event strings (`preview.rejected`, `guard.rejected`,
  `admin.action.csrf_rejected`, `auth.access.denied`, `media.delete_blocked`,
  `media.replace_blocked`, `taxonomy.field_unmarked`, `admin.action.sink_threw`). `EditorRow` is
  one of the eleven types and `OfficeList` is the one component, so **thirty is the whole set** and
  no task sweeps "thirty plus two".
- **The `Consumers must:` window is 67 occurrences.** Measured over `CHANGELOG.md:1-1541` at
  `f273274e` and again at `0705776e`. Tasks 14 and 15 re-derive; the count is evidence for the
  release-notes draft, never an acceptance number, and it drifts with every merge, so a task
  reports what it measures rather than matching this figure.
- **Two gate record files name symbols this window renames, and the third names none. A `name`
  entry and a `reason` mention are different things.**
  `scripts/checks/check-self-use-allowlist.json` carries a `name` entry for eight of the window's
  symbols: `RequestResult`, `ChannelRequestResult`, `ChannelConfirmResult`, `EditorRow` (ONE entry),
  `AuthGuardOptions`, `FieldsetOptions`, `RendererOptions`, and `diffNewlyPublished`. It has NO
  entry named `adminAction` and none named `previewLoad`: those hits, and a second `EditorRow` hit,
  are prose inside other entries' `reason` strings (`AdminActionAudit` and `AdminActionOptions` for
  `adminAction`, `EntryDataOverrides` for `previewLoad`, `RateLimitOutcome` for `EditorRow`).
  `scripts/checks/check-surface-reexports.json` carries **no `name` entry for any name in this
  window**; `AuthGuardOptions` (twice), `NavLoadData`, `VocabularyLoadData`, `parseManifest`, and
  `previewLoad` all sit inside R4-closure `reason` strings.
  **`scripts/checks/check-surface-leaks.json` carries none of them**; its entries run
  `AdvisoryAction` through `VocabularySaveFailure`. Eight `name` entries and ten `reason` mentions
  across two files. A renamed name left in a `name` field makes the gate assert the absence or
  presence of a name that no longer exists; one left in a `reason` string makes the record's own
  explanation false. Each renaming task therefore names the record its own names actually sit in
  and says which kind, and Task 14 verifies the whole set. No task is told to edit a record that
  does not name its symbols.
- **The scaffolder pins `githubApp` character for character.**
  `packages/create-cairn-site/src/github/finalize.mjs:21` holds the literal
  `"githubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' })"`,
  the builder at `:32` re-emits it, and `finalize.test.mjs`, `github/chapter.test.mjs`, and
  `cloudflare/config.test.mjs` assert it. Task 6 carries all of them; the CLI suite is the proof.
- **Two doctor strings pin `createCairnAdmin(runtime)` in prose.** `src/lib/doctor/checks-local.ts:345`
  and `src/lib/diagnostics/conditions.ts:209` both spell the call with a bare positional runtime.
  The arity change falsifies both. Task 2 carries them, and `check:transcripts` plus the CLI suite
  are the proof.
- **`log-events.md` has no generator.** The spec's task 6 says "`log-events.md` regenerated";
  there is no `emit:log-events` script and `scripts/build/` has no log-events emitter. The page is
  hand-maintained, and `scripts/checks/check-symbols.mjs` resolves every log event name a doc page
  names against the source union. Tasks 10 and 11 edit the table by hand and the gate proves it.
- **Twenty-four lowercase anchor fragments name renamed symbols.** `grep` for `adminAction` does not
  match `#adminaction`. The fragments run across thirteen published pages, `docs/reference/ambient.md`
  and `docs/reference/sveltekit.md` heaviest among them, and `check:docs` fails on a fragment that
  no longer resolves. Global constraint 7 therefore requires the lowercased anchor grep of every
  renamed name, and `docs/reference/ambient.md` is named in Tasks 6 and 7's Files blocks rather
  than left to a `docs/extend/*.md` glob that never reaches it.

### Corrections this plan makes to the spec and the sweep, knowingly

These are not gaps the inputs left open. Each supersedes a sentence an input states, on
measurement.

- **The surface regeneration command is `node scripts/checks/check-surface.mjs --update`, not
  `npm run check:surface -- --update`.** `package.json:40` reads
  `"check:surface": "npm run package && node scripts/checks/check-surface.mjs && node scripts/checks/check-surface-leaks.mjs"`.
  npm appends run arguments to the END of the script string, so `-- --update` reaches
  `check-surface-leaks.mjs`, which does not read the flag, while `check-surface.mjs`, the only
  script that does (`check-surface.mjs:425`), runs in plain mode, exits 1 on drift, and halts the
  chain with nothing written. Every regeneration step in this plan therefore reads
  `npm run package && node scripts/checks/check-surface.mjs --update`. The script's own banner
  (`check-surface.mjs:22`) and `docs/internal/README.md:31` still print the pre-rider form, which is
  where the wrong instruction came from; **repairing the script or its banner is a non-breaking fix
  and does not join this window** (the spec's Polish-C shape forbids it), so Task 15 files it as a
  follow-up line instead.
- **`parseManifest`'s canonical home moves to `.`, which goes past the spec's wording.** The spec's
  consumer line 4 reads "`parseManifest` also published on `.`" and the sweep's F3 fix reads
  "publish `parseManifest` on `.` beside its siblings now". Both read as a second publication with
  `/delivery/data` keeping the home. This plan moves the home and makes `/delivery/data` a recorded
  re-export, because F3's charge is the split codec pair and leaving the home split answers half of
  it. It is a departure, recorded here rather than buried in Task 5's decisions, and a consumer
  feels nothing either way: the `/delivery/data` import keeps working.
- **`mintPreviewToken` is free.** `audit-sveltekit-mintpreviewtoken` (`engine-rulings.md:2266`)
  names a symbol that no longer exists in `src/lib`; the function is `previewMint` today. The name
  is therefore available as a rename target, which the names table below records rather than
  assumes.
- **`githubApp` names two exported symbols, and only one is renamed.**
  `src/lib/github/backend.ts:162` is the public factory F20 charges.
  `src/lib/doctor/checks-github.ts:14` is `export const githubApp: DoctorCheck`, an exported
  VALUE, and `convention-bare-noun-functions` rules explicitly that "an exported value's [name]
  does not [begin with a verb]". Renaming it would break the rule this pass is executing. Task 6
  leaves it alone and says so in its report.
- **`cookieName` collides with a site-local property name.** `examples/showcase/src/chassis/theme-toggle.ts:15`
  and `:34`, `templates/waymark/src/chassis/theme-toggle.ts:15` and `:34`, and
  `templates/waymark/src/theme/components/SiteHeader.svelte:63` all carry a `cookieName` member on a
  site's own theme-cookie config. It has nothing to do with `src/lib/auth/crypto.ts:48`'s exported
  function. Task 6 excludes those paths by name; renaming one would corrupt the emitted template.
- **`OfficeList` lives under `src/lib/admin-toolkit/`.** Both the spec and the charter review
  write `OfficeList.svelte` with no directory, and the sibling components they discuss are under
  `src/lib/components/`. The file is `src/lib/admin-toolkit/OfficeList.svelte`.
- **`admin-design-system.md:451` is about `ConceptList`, not `OfficeList`.** The spec's task 7 lists
  `:451` and `:476-480` as passages describing the removed component. `:451` is inside the
  empty-state recipe and its subject is the concept-list view, which `:459` names as `ConceptList`.
  Task 12 leaves it alone. The file's one `OfficeList` passage is the F3-rhythm bullet at
  `:477-480`.
- **The floating-card recipe the spec cites is at `admin-design-system.md:353-359`.** The spec
  cites `:1215-1216`, which is the token bullet that NAMES the recipe rather than the recipe
  itself. Task 1 composes against `:353-359` and the spec's anchor stays true as the pointer.
- **The kebab discriminant grammar is uniform, not ruled.** `convention-outcome-idiom`
  (`engine-rulings.md:196`) rules the discriminant KEY only ("the discriminant key is `outcome`, a
  string literal union"); no ledger row rules value casing, and the sweep's "kebab-case values
  throughout" is observed uniformity across the six existing `*Outcome` types. Task 8 therefore
  records the uniformity AS the rule in its own dated clause rather than citing a ruling that does
  not exist. The one casing rule that IS ruled sits elsewhere and is untouched:
  `src/lib/log/events.ts:5-7` requires snake_case for a record's `reason` and `scope` values, which
  is a different surface from a type's discriminant.
- **`gap-0` has one live consumer.** The spec calls its departure "a deliberate CHANGELOG-carried
  removal", which holds, but `OfficeList.svelte:17-22` states the class compiles into the sheet
  "with no current component reference", so its removal changes the shipped stylesheet's class
  inventory and changes no rendered pixel in this repo. A consumer site writing `gap-0` in its own
  admin markup does lose the rule, which is why it takes its own `Consumers must:` clause.
- **`createNavRoutes` and `createContentRoutes` have no production call site in any of the four
  consumer sites.** Measured read-only across the four sibling repos at plan authoring. Every site
  composes through one `createCairnAdmin(runtime, config)` in `src/chassis/cairn.server.ts` plus one
  `createMediaRoute(runtime)` in `src/routes/media/[...path]/+server.ts`. Only
  `aksailingclub-org/src/tests/adapter.test.ts` calls `createContentRoutes` directly. The
  `Consumers must:` line still names all four factories, because the engine's own docs teach the
  hand-mount path and a site can adopt it at any time.
- **`aksailingclub-org` imports `OfficeList` on eighteen admin screens, not sixteen.** Measured
  read-only: `git ls-files | xargs grep -l OfficeList` returns eighteen files under
  `src/routes/admin/club/` plus `src/tests/announce-list-order.test.ts`. The first count missed three
  screens that reach the import through a multi-line `import { ... }` block
  (`classes/+page.svelte`, `classes/[id]/+page.svelte`, `members/+page.svelte`).
- **`xcathletes-org` does not name `DevBackendOptions` today.** `src/hooks.server.ts:62-63` reads
  `const { devBackendHandle } = await import('@glw907/cairn-cms-dev'); handle = devBackendHandle();`
  with no argument and no type annotation, and no site in the four names the type. The rename
  reaches that site only if it starts annotating. The `Consumers must:` line still names it, because
  the type is published surface.

### The semantic column: 11a and 11b decisions this pass depends on or overturns

- **Overturns one, by design: `OfficeList`'s own both-stay sentence.**
  `src/lib/admin-toolkit/OfficeList.svelte:8-9` reads "`PageHeader` and this component cover
  different shapes, a header primitive versus a full list-screen scaffold, and both stay: never a
  duplicate", and `docs/reference/admin-toolkit.md:657-661` states the same in the reference. Both
  were written at the 4b conformance pass's execution of `audit-admin-officelist`. Decision 8
  overrules them. Task 12's new ruling row quotes and overrules the sentence in text rather than
  deleting it silently, and the file goes with it.
- **Overturns nothing of 11b's.** No polish-C task rewrites the busy recipe, the combobox, the
  live regions, the signups exemplar, or `formatTimestamp`. Task 12 edits
  `docs/internal/admin-design-system.md` only where it describes `OfficeList` as a live recipe.
- **Depends on 11a's ledger annotations.** 11a's split tasks appended
  `- **Note (polish-11a, Task N):**` lines to about twenty-four rows and 11a's records task verified
  the set. Polish-C appends its own `- **Note (polish-C, Task N):**` lines beneath them and never
  rewrites an existing field, so a row can carry two Notes. Locate every row by slug with
  `grep -n "^## <slug>" docs/internal/engine-rulings.md`, never by a line number from this plan.
- **Depends on 11b having appended to `## Unreleased`.** This pass appends beneath whatever 11b
  left. Unlike 11a and 11b, **this pass's entries DO carry `Consumers must:` lines**, and Task 14
  reconciles the whole window rather than only this pass's additions.
- **Depends on `check:surface` being byte-identical through 11a and 11b.** Both passes state it as
  a Ruled input, so `docs/internal/api-surface.md` at polish-C's branch point is `main`'s. This
  pass is the first since `0.96.0` to change it, which is why the regeneration rule below is a
  per-task gate requirement rather than a pass-end step.
- **Depends on 11a's `docs/HISTORY.md` retro-numbering.** Task 15 writes the polish-C entry as
  slice 12 and does not renumber anything; if 11a's numbering did not land, Task 15 reports the
  gap rather than fixing it inside the breaking window.
- **`docs/STATUS.md` is never a task deliverable.** The conductor owns it in all three passes and
  writes it at each checkpoint and at merge.

### The gate, re-derived

Derived at plan authoring from the committed `.github/workflows/` at `0705776e`, per the
initiative design's standing constraint at
`2026-08-27-audit-remediation-initiative-design.md:138-140`. CI runs `test.yml` (thirty-four
`npm run` invocations across thirty-three lines), `e2e.yml`, `design.yml`, `norms.yml`,
`scaffold.yml`, `create-site.yml`, `tsgo.yml`, and `publish.yml`. The exact per-task string is
under "## Gate" below, with the CI-only remainder named there and the two polish-C additions
(`node scripts/checks/check-surface.mjs --update` on a surface-changing task, and `check:snippets`
against the built package) stated as per-task rules. `check:figures` is NOT in the committed
`test.yml` or in the committed `package.json`; it exists only in Geoff's uncommitted working
tree, which decision 13 leaves unowned, so it is in no gate this pass runs. The executor
re-derives the list against post-11b `main` before the first commit and records any change here.

---

## Ruled inputs (recorded; no task re-derives them)

- **The breaking window takes the whole family set** (decision 6, Geoff on "the best long-term
  architecture": no grandfathered exceptions on a surface heading for a 1.0 promise, in the one
  window where every rename is free). The set covers both published packages,
  `@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, which ship as one release unit.
- **One exception, argued on semantics by the ledger and kept.** `audit-log-entry-published`
  (keep, `engine-rulings.md:4314`) rules that "`entry.*` names entry outcomes
  (published/discarded); `publish.*` names publish-machinery faults (failed, address_collision)".
  F12's publish-area merge is NOT taken and the keep row stands, per the spec's "Findings not
  taken".
- **`OfficeList` retires** (decision 8). `AdminTable` is the sole scroll owner. The extend track's
  custom screen composes `PageHeader` beside `AdminTable` inside the admin design system's
  floating-card recipe, over `--cairn-shadow` and `--cairn-card-border`, so the dropped card frame
  has a named replacement in the admin's own design system.
- **Factory arity, ruled on architecture** (decision 11). One shape for every route factory: a
  single config bag, with `runtime` a required member of the bag where the factory needs one.
  Positional runtimes go. This makes the ruled "`*Config` is the primary bag" the whole rule with
  no arity clause, and no factory takes a parameter it ignores.
- **F16's positional shape is superseded by decision 11.** The sweep's own fix ("one shape,
  `(runtime, config = {})`") is not the ruled shape. Do not implement the sweep's version.
- **F12 is not taken.** The publish-area merge's keep row stands.
- **`createMediaRoute` is recorded, not renamed** (F15). `convention-interop-carve-out`
  (`engine-rulings.md:142`) names its kit `RequestHandler` return explicitly; the singular `Route`
  name is recorded in the barrel under the `convention-internal-sibling-comment` shape rather than
  changed. Task 3 does give it a config bag, which closes the other half of F15.
- **F7's `## Types` assertion is deferred**, on its own stated reason. No task changes
  `check:reference`'s section grammar.
- **The docs rewrite owns every prose fix the docs sweep found.** This pass edits a published page
  only where a rename or a removal makes its text false, or where a gate forces it. It writes no
  new prose investment.
- **The conductor writes `docs/STATUS.md`, never a task** (spec, "Ledger ownership").
- **The cut is the default, not a judgment call.** The initiative's publish ruling
  (`2026-08-27-audit-remediation-initiative-design.md:122-124`) is unconditional: "**One cut,
  after the polish slice.** Geoff's call: the whole remediation ships in a single release with one
  `Consumers must:` list." A no-cut outcome needs Geoff's ruling at this plan's review or at the
  pass close, never a task's own reading. **The cut itself is a separate conductor step through
  the `cairn-release` skill after polish-C merges.** No task in this pass bumps `package.json`,
  tags, or publishes. Task 15 derives the number and the bump size and records the derivation; the
  conductor re-derives at the cut, which is `cairn-release`'s own instruction.
- **A ruling row this pass WRITES carries the full `Verdict`, `Reopens on`, `Shape`, `Record`,
  `Verified` block**, since `check:rulings-format` ratchets only the truncated parentheticals. A
  row this pass only ANNOTATES keeps whatever fields it has; the acceptance on an annotated row is
  that `check:rulings-format` stays green, never that a field it never carried appears. Task 12
  writes the pass's one new row.
- **Every amendment cites this pass's source.** Per the spec's Decisions preamble: an amendment a
  task writes into `docs/internal/engine-rulings.md` or a conventions row cites the spec by path
  and date and quotes the decision text. Geoff's own words are quoted as his where they exist
  (decision 6); where they do not, the clause names the spec as the ruling's record rather than
  inventing a sitting quotation, and says so in the clause.

---

## Verb-first names for Geoff's read

**Approved by Geoff, 2026-09-08 23:45, as recommended:** every row in the table, the seven
verb-first names as argued, the short `mintPreview`/`revokePreview` pair, and `loadPreview` and
`loadHealth` taken despite the asymmetry with the route objects' `*Load` members. Polish-C
executes and the cut fires without a further read.

**Every proposed rename in the window, in one table, so the list is read before polish-C
executes.** The seven verb-first function names are the one taste call; they are argued
individually below the table against the ruled vocabulary. A row's "argues from" column names the
ruled row or the spec Decision the rename rests on; "supersedes" names a ledger row whose recorded
verdict this window's rename touches. A superseded row keeps its verdict and gains a Note; none of
these renames reopens a verdict.

### The renames

| Current name | Proposed name | Argues from | Ledger row it touches |
|---|---|---|---|
| `AuthGuardOptions` | `AuthGuardConfig` | F17; decision 6; `convention-parameter-bags` widened by Task 4's own clause | `audit-sveltekit-authguardoptions` (keep, `:2494`), annotated |
| `RendererOptions` | `RendererConfig` | F17; decision 6; `convention-parameter-bags` widened by Task 4's own clause | `audit-adapter-rendereroptions` (keep, `:1377`), annotated |
| `FieldsetOptions` | `FieldsetConfig` | F17; decision 6; `convention-parameter-bags` widened by Task 4's own clause | `audit-adapter-fieldsetoptions` (keep, `:894`), annotated |
| `DevBackendOptions` | `DevBackendConfig` | decision 6; `convention-parameter-bags` widened by Task 4's own clause | none; the dev package has no audit row |
| `NavLoadData` | `NavData` | F14; decision 6 | `audit-sveltekit-navloaddata` (keep, `:1937`), annotated |
| `VocabularyLoadData` | `VocabularyData` | F14; decision 6 | `audit-sveltekit-vocabularyloaddata` (keep, `:1923`), annotated |
| `serializeManifest` | `formatManifest` | `convention-verb-rules` (`parse*` is "reserved for string-to-structure codecs (paired with `format*`)"); F3 | `audit-adapter-serializemanifest` (keep, `:1021`), annotated |
| `parseManifest` (re-homed, not renamed) | `parseManifest`, canonical home moves to `.` | `canonical-home-rule`'s recorded-re-export mechanism; F3 | `audit-delivery-parsemanifest` (keep, `:3629`), annotated |
| `deriveExcerpt` | `buildExcerpt` | `convention-verb-rules` ("`build*` = derives pure data"); F21 | `audit-delivery-deriveexcerpt` (keep, `:3636`), annotated |
| `diffNewlyPublished` | `buildNewlyPublished` | `convention-verb-rules`; F21 | `audit-delivery-newlypublishedentries` (keep, `:3723`), whose conventions-pass annotation already records `newlyPublishedEntries` to `diffNewlyPublished`; a second Note records the second rename |
| `cookieName` | `buildCookieName` | `convention-bare-noun-functions`; `convention-verb-rules`; F20 | `audit-auth-cookiename` (keep, `:3272`), annotated |
| `githubApp` | `createGithubApp` | `convention-bare-noun-functions`; `convention-verb-rules` ("function factories belong to `create*`"); F20 | `audit-adapter-githubapp` (keep, `:1208`), annotated |
| `adminAction` | `createAdminAction` | as above; the `createSectionAction` sibling; F20 | `audit-sveltekit-adminaction` (keep, `:2479`), annotated; `audit-sveltekit-adminactionoptions` (retire, open, `:2370`) dispositioned |
| `previewMint` | `mintPreview` | `convention-bare-noun-functions`; F20 | none directly; `audit-sveltekit-mintpreviewtoken` (`:2266`) names a symbol that no longer exists |
| `previewRevoke` | `revokePreview` | `convention-bare-noun-functions`; F20 | none directly |
| `previewLoad` | `loadPreview` | `convention-bare-noun-functions`; F20 | `audit-sveltekit-previewload` (keep, `:2294`), annotated |
| `healthLoad` | `loadHealth` | `convention-bare-noun-functions`; F20 | `audit-sveltekit-healthload` (keep, `:1986`), annotated |
| `RequestResult` | `RequestOutcome`, re-keyed on `outcome` | `convention-outcome-idiom`, widened by decision 6; F18 | `audit-sveltekit-requestresult` (keep, `:1993`), annotated with the new discriminant so its any-site case reads true |
| `ChannelRequestResult` | `ChannelRequestOutcome`, re-keyed | as above | `audit-auth-channelrequestresult` (reshape, closed, `:3065`), superseded explicitly with the no-roster-leak encoding named |
| `ChannelConfirmResult` | `ChannelConfirmOutcome`, re-keyed | as above | `audit-auth-channelconfirmresult` (reshape, closed, `:3079`), superseded explicitly with the challenge-required-is-a-retry ruling named |
| `RevertFailure` | `RevertOutcome`, re-keyed | as above; the spec's line 7 names the `*Outcome` target | `audit-sveltekit-revertfailure` (reshape, closed, `:1722`), annotated; **`convention-failure-suffix` (accept, closed, `:214`) cited and superseded by a dated clause in Task 8** |
| `EditorRow` | `UnresolvedEditor`, defined `Omit<Editor, 'capability'>` | F19; `canonical-home-rule`; `check-surface-leaks` (the result of `listEditors` stays nameable) | `audit-auth-editorrow` (keep, `:3288`), annotated; `audit-auth-listeditors` (keep, `:3310`), annotated |
| `preview.rejected` | `preview.refused` | F11's two-verb vocabulary; decision 6 | `audit-log-preview-rejected` (keep, `:4658`), annotated |
| `guard.rejected` | `guard.refused` | as above | `audit-log-guard-rejected` (keep, `:4651`), annotated |
| `admin.action.csrf_rejected` | `admin.action.csrf_refused` | as above | `audit-log-admin-action-csrf-rejected` (keep, `:4445`), annotated |
| `auth.access.denied` | `auth.access.refused` | as above | `audit-log-auth-access-denied` (keep, `:4569`), annotated |
| `media.delete_blocked` | `media.delete_refused` | as above | `audit-log-media-delete-blocked` (keep, `:4299`), annotated |
| `media.replace_blocked` | `media.replace_refused` | as above | `audit-log-media-replace-blocked` (keep, `:4292`), annotated |
| `taxonomy.field_unmarked` | `content.field_unmarked` | F13; the sibling `content.field_behavior_failed`; decision 6 | `audit-log-taxonomy-unmarked-field` (reshape, closed, `:4322`), superseded with the reason |
| `admin.action.sink_threw` | `audit.sink.call_failed` | F13 (one area and one verb for the sink); decision 6 | `audit-log-admin-action-sink-threw` (keep, `:4516`), annotated |
| `audit.sink.write_failed` | unchanged | F13; it is already the area and verb the pair converges on | `audit-log-audit-sink-write-failed` (keep, `:4599`), annotated with the pair's new shape |
| `auth.channel.session.created` | unchanged | F13's widen-the-grammar option, ruled by the spec's line 9 ("the events header admits a dotted subject so `auth.channel.session.*` stays") | `audit-log-auth-channel-session-created` (keep, `:4120`), annotated with the header clause |
| `OfficeList` | removed from `/admin-toolkit` | decision 8 | `audit-admin-officelist` (reshape, closed, `:2662`), superseded by a new full-format row |

Thirty-three rows. No name in this table changed when the three-lens review was folded; two rows
changed their citation. The four `*Options` rows now lead with F17 and decision 6, which are what
actually reach them, because `convention-parameter-bags`'s ruled text scoped its population to four
`*Config` rows and, as F17 itself states, "did not reach these three"; the row is widened by Task 4's
own dated clause rather than already covering them. The `RevertFailure` row now names
`convention-failure-suffix` as the closed row this rename contradicts, superseded in text by Task 8
rather than left as a Note on an audit row (see the argument under Task 8).

Four factories change signature without changing name (`createContentRoutes`, `createCairnAdmin`,
`createNavRoutes`, `createMediaRoute`). They are not renames and are not in the table; decision 11
governs them, and Tasks 2 and 3 execute them.

### The seven verb-first names, argued individually

The ruled vocabulary is `convention-verb-rules` (`engine-rulings.md:170`), Geoff's own words:
*"`verify*` = engine-owned integrity check that throws; `validate*` = check returning issues;
`check*` retires as a verb (its members fall to the outcome idiom). `read*` = read a committed
artifact or declaration into typed shape, retiring `extract*`; `parse*` reserved for
string-to-structure codecs (paired with `format*`). `build*` = derives pure data; function
factories belong to `create*`, so the resolver trio renames."*

`convention-bare-noun-functions` (`:185`) is the rule these seven break, in Geoff's own words:
*"An exported function's name begins with a verb; an exported value's does not; bin names and
host-ecosystem plugin factories are out of scope."* Read together, the two rules do not require
that every exported function take one of the six verbs. The six reserve six MEANINGS; the bare-noun
rule requires only a verb. The rule's own executed population proves it: `renderGlyph`,
`defineFieldset`, `resolveOwnerLevelRoles`, and `renderJsonLdScript` use three verbs outside the
six. Where the six fit, this plan uses them. Where they do not, the plan names the verb and says
why the six do not fit, rather than forcing a ruled verb onto a meaning it is reserved against.

1. **`cookieName(base, secure): string`** (`src/lib/auth/crypto.ts:48`). Derives a cookie name from
   two inputs with no I/O, which is exactly `build*`'s ruled meaning ("derives pure data").
   **Recommend `buildCookieName`.** The defensible alternative is `formatCookieName`, and it is
   declined: `format*` is reserved as `parse*`'s codec partner and there is no
   `parseCookieName`, so the pairing would advertise a codec that does not exist.
2. **`githubApp(config): BackendProvider`** (`src/lib/github/backend.ts:162`). Constructs the
   adapter's backend provider, which is the ruled "function factories belong to `create*`".
   **Recommend `createGithubApp`.** The alternative is `buildGithubApp`, declined because the
   result is a provider object a site holds, not derived data. Note the exempt twin: the exported
   VALUE `githubApp` at `src/lib/doctor/checks-github.ts:14` is a `DoctorCheck` and stays bare, per
   the same ruling's second clause.
3. **`adminAction<T>(...)`** (`src/lib/sveltekit/admin-action.ts:206`). A wrapper factory returning
   a kit action, whose exact sibling is `createSectionAction` doing the same job under the same
   authorization sequence. **Recommend `createAdminAction`.** The alternative is
   `wrapAdminAction`, declined: it names the implementation (wrapping) rather than the contract,
   and it would leave the two sibling wrappers on two verbs the day after this pass unifies
   everything else.
4. **`previewMint(...)`** (`src/lib/sveltekit/preview.ts:128`). Mints and persists a preview token,
   a state-changing operation. None of the six fits: it is not a factory, not a pure derivation,
   not a codec, and not a read. **Recommend `mintPreview`**, on the engine's own vocabulary: the
   record it writes is `preview.token.minted`, so `mint` is already this operation's public name.
   The defensible alternative is `mintPreviewToken`, which is free (the ledger row naming it
   describes a symbol that no longer exists) and reads more precisely; it is declined for length
   and because the paired revoke would then also lengthen, but a preference for the longer pair is
   a legitimate call and both are listed here for that reason.
5. **`previewRevoke(...)`** (`preview.ts:197`). **Recommend `revokePreview`**, paired with the
   above and matching `preview.token.revoked`. Alternative `revokePreviewToken`, taken only if the
   longer form is chosen for 4.
6. **`previewLoad(runtime, config, event): Promise<PreviewData>`** (`preview.ts:431`). A kit
   `load` implementation a site assigns to `export const load`. **Recommend `loadPreview`.** The
   defensible alternative is `readPreview`, using the ruled `read*` ("read a committed artifact or
   declaration into typed shape"), and it is declined on two grounds. The function resolves a
   draft off a pending branch and composes entry data, which is more than a typed read. And `load`
   is SvelteKit's own word for the thing the site assigns it to, so `loadPreview` is the name that
   survives contact with the route file. `convention-interop-carve-out` does not shield the
   noun-first form, as the charter review states, but the host's vocabulary is a sound argument
   for which VERB to pick once the form is fixed.
7. **`healthLoad(event, runtime): Promise<HealthData>`** (`src/lib/sveltekit/health.ts:28`). Same
   shape, same argument. **Recommend `loadHealth`**, alternative `readHealth`, declined for the
   same two reasons.

**Consistency note Geoff should see before ruling.** The engine's route objects carry many
noun-first load members: `editLoad`, `historyLoad`, `navLoad`, `settingsLoad`, `shellLoad`,
`mediaLibraryLoad`. None of them is an exported function, so none is in
`convention-bare-noun-functions`'s scope and none is renamed here. After this pass a site reading
the surface sees `loadPreview` and `loadHealth` as free functions beside `editLoad` and
`navLoad` as object members. That asymmetry is the cost of the rule as ruled, and it is the one
place where accepting the seven renames makes the surface look less even rather than more. The
alternative is to grandfather items 6 and 7 with a recorded reason on
`convention-bare-noun-functions`'s row, which the sweep names as F20's second honest option.
**This plan recommends taking all seven**, because decision 6 forecloses grandfathered exceptions
on a surface heading for a 1.0 promise, and because the members are reachable only through an
object a site already holds, where the containing name supplies the verb.

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
5. **`check:surface` CHANGES in this pass, and every change is disclosed in the same commit.** A
   task that changes the public surface runs
   **`npm run package && node scripts/checks/check-surface.mjs --update`** and commits the
   regenerated `docs/internal/api-surface.md` in the same commit as the code change. **Never
   `npm run check:surface -- --update`:** npm appends the argument to the end of that script's
   two-command chain, where `check-surface-leaks.mjs` receives it and `check-surface.mjs`, the only
   reader of the flag, never does. A task that does not change the surface leaves the file out of
   its diff, and the plain `check:surface` run in the gate proves it. No task defers a regeneration
   to a later task.
6. **`check:snippets` runs against the BUILT package, every task.** The gate string runs
   `npm run package` once at its head and invokes `node scripts/checks/check-snippets.mjs` against
   that build. It extracts every ```ts, ```typescript, and ```svelte fence under `docs/reference`,
   `docs/extend`, `docs/admin`, and `docs/editors` and typechecks each against `dist/`, so a doc
   fence naming a renamed symbol fails here. A task that deletes a documented export deletes its
   fence in the SAME commit as the export, so `check:snippets` never sees the intermediate state.
7. **Rename by grep, then by compiler, then by grep again, and classify every residual.** Each
   renaming task reports three counts for each name it changes: sites found before, sites changed,
   and sites remaining. **Step 1 of a renaming task pastes its per-identifier hit list into its
   report before any edit** (`grep -rn` over the tracked tree excluding the three write-once archive
   trees), broken out by class, so the uncompiled residue is enumerated rather than hoped for:
   compiled TypeScript and Svelte, documentation fenced code, documentation prose, lowercase
   documentation anchor fragments, gate record JSON, the `.mjs` scaffolder and its `.test.mjs`
   suites, SQL, and comments and test titles inside `src/tests/`. **Each renaming task also greps
   the lowercased, punctuation-stripped anchor form of every name it changes** (`#adminaction` for
   `adminAction`), because a case-sensitive symbol grep never returns one and `check:docs` fails on
   a fragment that no longer resolves. The acceptance is that every class is either changed or named
   immune. The residual taxonomy, complete, so the classification step has a name for every path a
   grep can return:

   | Class | Treatment |
   |---|---|
   | `docs/superpowers/**`, `docs/internal/record/**`, `docs/internal/history/**` | Write-once archives. Left verbatim, classified, never edited |
   | `docs/internal/design/**`, `docs/internal/feedback/**` | Dated point-in-time records. Same treatment as the archives |
   | A historical field in a ruling row (`Shape:`, `Record:`, `Verified:`) | Left verbatim; the annotation rule forbids rewriting it. Only the appended Note names the new name |
   | A `docs/HISTORY.md` or `CHANGELOG.md` entry describing what was true then | Prose left verbatim. **One exception, constraint 16: a link anchor a gate resolves is repaired** |
   | A versioned section of `docs/extend/migration-notes.md` (below `## Unreleased`) | Left verbatim. A LIVE `## Unreleased` bullet is not immune and Task 14 reconciles it |
   | The Clearings table of `docs/internal/docs-friction-log.md` | A historical record of past clearings. Left verbatim |
   | `docs/STATUS.md` | The conductor's file. **Reported by the task that finds a hit, never edited by any task**, and the conductor repairs it at the checkpoint or at merge (constraint 13) |
   | `docs/internal/api-surface.md` | Regenerated, never hand-edited (constraint 5) |
   | Live internal docs: `docs/internal/pre-beta-harvest.md`, `docs/internal/engine-harvest-candidates.md`, `docs/internal/code-idioms.md`, `docs/internal/src-lib-map.md`, `docs/internal/admin-design-system.md` | Updated where a rename makes their text false. Named in Task 14's Files block, which owns the sweep |
   | The live code and docs the pass sweeps: `src/**`, `packages/**`, `examples/**`, `templates/**`, `scripts/checks/*.json`, and the published `docs/reference`, `docs/extend`, `docs/admin`, `docs/editors` arms | Not residual. The renaming task changes them, by the classes Step 1 breaks out |
   | `skills/**` reference pages, `skills/cairn-admin-screens/references/exemplar-list.md` and `exemplar-detail.md` | Live agent-facing exemplars, not archives. Updated by the task that renames or removes what they name, and named in that task's Files block. Task 12 owns their `OfficeList` prose and the `svelte` composition fence |
   | `ROADMAP.md` | A live tier line follows the rename; a struck-through or historical line stays verbatim. **Task 15, the records task, owns the file**, so an earlier task reports its hits rather than editing them |
   | Repo-root and CI comments naming a renamed symbol: `vitest.config.ts`, `.github/workflows/**` | Comments an alias or a step explains itself with, which go false on a rename. Updated by the renaming task; Task 7 owns the three `previewLoad` and `previewMint` comments |
   | `migrations/*.sql` and its two emitted copies under `examples/showcase/` and `templates/waymark/` | **Immune.** A migration is immutable once shipped. No table or column name in this window changes, so no rename reaches SQL; the one hit is a comment naming a TypeScript symbol, classified and left |
   | `scripts/lab/**` | **Immune.** A lab tool's own local symbol that collides with an engine name (`serializeManifest` in `generate-norms-manifest.mjs`), on the same reasoning as the doctor's `githubApp` value |
   | `packages/create-cairn-site/test/fixtures/transcripts/**` | **Immune.** Recorded stdout under the directory's own rule that a fixture is never edited and a run needing different bytes is re-captured, which `check:transcripts` asserts byte for byte |
   | Anything else | A blocking finding |

8. **The gate record files are part of a rename, routed to the file that holds the name, and a
   gate-read `name` entry is not the same thing as a `reason` mention.**
   `scripts/checks/check-surface-reexports.json` and `scripts/checks/check-self-use-allowlist.json`
   name symbols by string; `scripts/checks/check-surface-leaks.json` names none of this window's
   symbols today and no task is told to edit it. Measured at plan authoring, the routing splits by
   kind:

   **Gate-read `name` entries, eight, every one of them in `check-self-use-allowlist.json`:**
   `AuthGuardOptions`, `RendererOptions`, and `FieldsetOptions` (Task 4); `diffNewlyPublished`
   (Task 5); `RequestResult`, `ChannelRequestResult`, and `ChannelConfirmResult` (Task 8); and
   `EditorRow`, ONE entry (Task 9). These carry the vacuous-gate hazard 11a named: a stale entry
   leaves a gate asserting something about a name that no longer exists.

   **`reason` prose, which no gate asserts on but which a rename makes false.** In
   `check-self-use-allowlist.json`: `adminAction` inside `AdminActionAudit`'s and
   `AdminActionOptions`' reasons (Task 6, and the file has NO `adminAction` entry), `previewLoad`
   inside `EntryDataOverrides`' reason (Task 7, likewise no entry), and `EditorRow` inside
   `RateLimitOutcome`'s reason beside its own entry (Task 9). In
   `check-surface-reexports.json`, which carries no `name` entry for any name in this window: six
   R4-closure reason strings naming `AuthGuardOptions` twice, `NavLoadData` and `VocabularyLoadData`
   once each (Task 4), `parseManifest` (Task 5), and `previewLoad` (Task 7).

   **One new entry rather than an edit.** Task 5's re-homing of `parseManifest` ADDS a `name` entry
   to `check-surface-reexports.json`; `check-surface.mjs` fails the canonical-home rule before the
   snapshot diff without it.

   A task's own Step 1 grep confirms the routing before it edits, since a record's contents move as
   other passes land. The standing acceptance, stated once so no task asserts something a record
   cannot satisfy: **no entry's `name` names a symbol this window renamed away, and every `reason`
   string naming a renamed symbol is updated in the same task as the rename.**
9. **TSDoc governs every comment.** Document the contract and the reason, never the type the
   signature already states, and never a paraphrase of the symbol name. An exported symbol keeps
   its minimal one-line doc even when self-evident, because `check:reference` and
   `jsdoc/require-jsdoc` want one; the write-only-when-it-helps judgment applies to internal
   symbols. Svelte `<script>` comments follow the same standard, with the `@component` convention
   for the component block.
10. **Commits.** Imperative mood, Conventional Commits, specific files rather than `git add -A`.
    The footer is exactly these two lines, and no other:

    ```
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_016oR8pMpc33qKYZtuMAeHfz
    ```

    One commit per Commit boundary named in a task; a task's boundaries are listed in its own
    Commit block.
11. **Each task appends its own `CHANGELOG.md` entry under `## Unreleased`**, and every entry that
    needs consumer action carries a `Consumers must:` line, per the initiative design's standing
    constraint at `2026-08-27-audit-remediation-initiative-design.md:141-144`. **This pass is the
    breaking window, so most entries DO carry one.** The same task adds the matching bullet to
    `docs/extend/migration-notes.md`'s `## Unreleased` section. Task 14 reconciles the whole
    section against the whole window; a task's own bullet is not optional because task 14 exists.
12. **The ledger annotation rule.** A ruling row whose subject this window renames gains a single
    `- **Note (polish-C, Task N):**` line, appended in the same commit as the rename, naming the
    new name and stating "verdict unchanged". The heading id is never changed, so existing
    `#`-anchors survive. A row's existing fields are never rewritten, so the old name survives in
    the historical fields of every row that already named it. A row this pass SUPERSEDES rather
    than annotates says so in its own words and cites the spec by path and date; Task 13 verifies
    the whole set with a grep.
13. **The conductor writes `docs/STATUS.md`.** No task edits it, no task lists it in Files, and
    **no acceptance grep in this plan takes `docs/STATUS.md` in scope**. STATUS names `OfficeList`
    at `:50` and `guard.rejected` at `:95` today; a task that finds a hit there reports it and moves
    on. The conductor's merge agent rewrites STATUS at merge and removes the dead names then.
14. **No version bump, no tag, no publish.** No task edits `package.json`'s `version`, runs
    `npm version`, creates a tag, or fires `publish.yml`. Task 15 derives and records the number;
    the conductor cuts through `cairn-release` after the merge.
15. **The paint protocol.** Adopted verbatim from chassis-B2 by way of polish-11a, with this pass's
    cache path. It rides in every task's `criteria` string. The text is under "## The paint
    protocol" below.
16. **The historical-link repair.** A historical `CHANGELOG.md` entry's PROSE is immune, and its
    LINK TARGET is not, because a gate resolves it. `scripts/checks/docs-links.mjs:15` puts
    `CHANGELOG.md` in `ROOT_DOCS` and confirms that every relative Markdown link resolves and that
    every `#anchor` resolves to a real heading, so `check:docs` fails on an anchor pointing at a
    heading this window renames. Two are measured below the `0.96.0` boundary:
    `CHANGELOG.md:3011` links `docs/reference/sveltekit.md#adminaction` (Task 6) and `:3148` links
    `docs/reference/delivery-data.md#diffnewlypublished` (Task 5). **The task that renames the
    heading repoints the anchor, in the same commit, as a mechanical link edit, and changes not one
    word of the entry's prose.** Each such task's own grep finds any further case; Task 14 proves no
    historical anchor is left pointing at a renamed heading.
17. **The failing gate comes first.** `cairn-implementer`'s contract is write-it-first,
    watch-it-fail, then make it green, and eleven of the fifteen tasks change no behavior, so there
    is no new runtime assertion to write. Each task's Steps therefore name the assertion or the gate
    that goes RED first and what turns it green, and the TDD clause is discharged by that gate
    rather than by an invented throwaway test. An implementer that reaches its Files block without
    having watched something fail has skipped a step.
18. **`templates/waymark` is generated, never hand-edited.** `scripts/build/emit-template.mjs` emits
    it from `examples/showcase`, which is the single source. A task that changes a call the template
    carries changes the SHOWCASE and re-emits with `npm run emit:template`; `check:template` is the
    proof. No Files block lists a `templates/waymark` path as a hand edit.

---

## The paint protocol

Verbatim from polish-11a's Global constraints, with 11a's cache path replaced by this pass's. It is
the whole paint contract; the reviewer reads only the copy inside the task's `criteria` string.

> Capture directories are pinned: the PASS before set at `~/.cache/cairn-polish-c/pass/before/`
> (it exists only if some task captured one, and on this pass no task does); this task's before set
> at `~/.cache/cairn-polish-c/task-<N>/before/` captured at the START of the task on the clean
> worktree at the task's parent commit with
> `node examples/showcase/scripts/capture-surfaces.mjs --out <dir>` (symlink the pass set if no
> predecessor moved paint, and say so) and its after set at
> `~/.cache/cairn-polish-c/task-<N>/after/`; every directory is write-once (the tool refuses a
> non-empty target; report a collision). Images are TILES: the capture tool writes
> `full/<surface>-<scheme>-<width>.png` and `tiles/<surface>-<scheme>-<width>-<nn>.png` (bands of
> at most 1400 CSS px with a 60 px overlap) plus `manifest.json`; a grader reads tiles, never a
> full-page file. The intended-moves manifest is the committed file
> `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`: append this task's
> rows under the `## Polish-C` heading in the same commit as its change (surface, width, scheme,
> what moves, why, the baseline names it moves); a task that moves a baseline without appending its
> row is a blocking finding. The moved-baseline list is PRODUCED, not asserted: before any
> regeneration run the visual suites unmodified
> (`CI=1 npx playwright test e2e/admin-visual.spec.ts e2e/site-visual.spec.ts`, inside
> `examples/showcase`) and paste the exact FAILING snapshot names under `MOVED BASELINES:`; for
> surfaces not yet baselined use `magick compare -metric AE before.png after.png null:` per tile as
> `TILE DIFF:`. Regenerate moved baselines locally with the mode pinned,
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

**Fourteen of the fifteen tasks take the no-rendered-surface branch. Task 8 takes the
paint-neutral branch.** The proof for the fourteen is `git status` showing no file changed under
`examples/showcase/e2e/admin-visual.spec.ts-snapshots/` or
`examples/showcase/e2e/site-visual.spec.ts-snapshots/`, reported as
`CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`, with the gate's own
`CI=1 npm --prefix examples/showcase run test:e2e` as the confirming run. The reasoning, ruled here
so no implementer judges it:

- **The capture tool's surface matrix** is `home`, `article`, `styleguide`, `archive2`, `error404`,
  and `signups` (`examples/showcase/scripts/capture-surfaces.mjs:59-109`). No polish-C task changes
  code any of the six renders.
- **The two committed baseline directories** cover `admin-office-*` (which renders `/admin/posts`,
  the engine's own concept-list screen, not `OfficeList`), `admin-edit-page-*`, `admin-media-*`,
  `admin-editors-*`, `admin-signups-*`, `auth-login-*`, `auth-confirm-*`, `vocabulary-*`, and the
  `site-visual` set. Almost every rename in this window is a symbol name, a type name, or an event
  string that never reaches rendered markup or a class.
- **Task 8 is the exception, and it is the one the pass-wide claim got wrong.** Task 8 re-keys
  `RequestResult` from `status` to `outcome` and changes `send_error` to `send-error`.
  `src/lib/components/LoginPage.svelte` branches on exactly those values at `:101`
  (`form?.status === 'sent' || form?.sent`), `:139` (`send_error`) and `:143` (`throttled`), so the
  component changes, and `examples/showcase/e2e/admin-visual.spec.ts:61-91` screenshots
  `/admin/login` and `/admin/auth/confirm` as `auth-login-light`, `auth-login-dark`,
  `auth-confirm-light`, and `auth-confirm-dark`. Those four baselines render the NEUTRAL state, so
  they will very likely not move, and that is the hazard rather than the reassurance: a mis-mapped
  value string leaves every baseline green while the send-error and throttled renders break, and no
  baseline or e2e covers those two branches. Task 8 therefore proves paint neutrality on the four
  baselines AND adds a component test that renders each of the three arms. The capture tool's matrix
  does not include the admin auth surfaces, so the committed Playwright baselines are the before set
  and the unmodified suite run is the after; Task 8 reports the four baseline names under
  `MOVED BASELINES: none` rather than a `TILE DIFF:` line, and says so.
- **Task 1 and Task 12 touch a rendered component and still take the no-rendered-surface branch.**
  Task 1 rewrites `src/lib/reproductions/stories/CustomScreen.svelte`, whose only render is the
  reproduction seam, which no visual baseline covers
  (`examples/showcase/e2e/custom-screen.spec.ts` asserts behavior and takes no screenshot). Task 12
  deletes `src/lib/admin-toolkit/OfficeList.svelte`, whose only in-tree consumer after Task 1 is
  nothing at all, and whose `gap-0` class carries no component reference by the component's own
  recorded statement.
- **Task 12 changes the shipped admin stylesheet's class inventory** without changing a pixel.
  `src/tests/unit/admin-sheet-inventory.test.ts` is the gate that catches it, and the task updates
  the committed inventory fixture in the same commit as the deletion. That is a sheet change, not a
  paint move, and it is disclosed as a `Consumers must:` clause rather than a baseline row.

If any task's gate produces a moved baseline, that is a STOP-AND-REPORT, not a regeneration.

---

## Task 1: The custom-screen example, ahead of the removal

**Deliverables: four.** The rewritten worked example in the extend guide, the recomposed
`CustomScreen` reproduction, the reproduction test assertions and comments that follow it, and the
changelog entry.

**The failing gate first:** `src/tests/component/reproductions-stories.test.ts`'s
`toolkit/custom-screen` block goes red the moment the story stops rendering `OfficeList`'s frame.
That red is this task's failing assertion; following the assertions onto the new structure is what
turns it green.

**Files:**
- Modify: `docs/extend/add-a-custom-admin-screen.md` (the choose-a-primitive prose at about
  `:92-97`, the import line at about `:104`, and the worked snippet at about `:109-124`),
  `src/lib/reproductions/stories/CustomScreen.svelte`, `CHANGELOG.md`
- Test: `src/tests/component/reproductions-stories.test.ts` (the
  `describe('toolkit/custom-screen')` block at about `:986`, including the `it(...)` title at `:987`
  that names "the office list" and the comment at `:990` that names `OfficeList` and cites a pass
  and a task number)
- Read only, for the recipe: `docs/internal/admin-design-system.md` (the floating-card recipe at
  about `:353-359`), `src/lib/admin-toolkit/PageHeader.svelte`,
  `src/lib/admin-toolkit/AdminTable.svelte`

**Interfaces:**
- Produces: `src/lib/reproductions/stories/CustomScreen.svelte` composes `PageHeader` and
  `AdminTable` as siblings inside one element carrying the floating-card recipe's two container
  utilities, `card-shell card-shadow`, and imports no `OfficeList`. Its props contract is
  unchanged: `{ data: { events: { id: string; name: string; status: string }[] } }`.
- Unchanged: the reproduction id `toolkit/custom-screen`, its manifest row
  (`src/lib/reproductions/manifest.ts:298-304`, `heights: { column: 640 }`, `host: 'shell'`,
  `ownThemeRoot: true`), its registration in `src/lib/reproductions/stories/site.ts:96-101`, and
  the pinned id list at `src/tests/unit/reproductions-manifest.test.ts:41`. The story is rewritten
  and never deleted.
- Unchanged: `check:surface`. No export changes in this task, so
  `docs/internal/api-surface.md` is not in the diff.

**Decisions the plan makes:**
- **The card frame goes around `AdminTable` alone, not around the header.** `OfficeList` today
  renders `PageHeader` above a `<div class="card-shell overflow-x-auto card-shadow">` wrapping its
  children (`OfficeList.svelte:45-49`). The replacement composition keeps that exact structure with
  the wrapper written at the call site. `AdminTable` already sets `overflow-x: auto` on its own
  wrapper (`AdminTable.svelte:78`), which is decision 8's whole point, so **the replacement's card
  div carries `card-shell card-shadow` and NOT `overflow-x-auto`.** That is the double-container
  defect the ruling names, and the example must not reproduce it.
- **The doc keeps teaching one composition, not two.** The prose at about `:92-97` presently
  routes a reader between `OfficeList` and a bare `AdminTable`. It becomes one instruction:
  `PageHeader` for the title band, `AdminTable` inside a `card-shell card-shadow` div for the
  table, with a sentence naming the floating-card recipe as the source of the frame.
- **The snippet matches the story's MARKUP, not the whole file.** The two import lines differ by
  construction and must: the story imports from `'../../admin-toolkit/index.js'` and the doc from
  `'@glw907/cairn-cms/admin-toolkit'`. The lockstep rule is over the markup below the `<script>`
  block, which is what the story's own comment means and what `check:snippets` proves.
- **The doc's ExpandableRow example at about `:310-389` is untouched.** It already composes
  `AdminTable` with no `OfficeList` and is correct as written.
- **This task does not remove the export.** `OfficeList` still exists and still ships after Task 1.
  Task 12 removes it. Ordering the example first is what keeps a docs-gate failure off the release
  path, per the spec's Risks block.
- **The divergence from the repo's own exemplar is reported, not resolved here.**
  `examples/showcase/src/routes/admin/signups/+page.svelte` composes `PageHeader` and `AdminTable`
  with NO card wrapper, and it is the surface `admin-visual.spec.ts` screenshots at three widths.
  After this task the guide teaches one composition and that in-repo exemplar demonstrates another.
  The task NAMES the divergence in its report and changes nothing in the showcase; the pass-end
  `daisyui-a11y-reviewer` grades it, and a convergence, if it is wanted, is a follow-up line for the
  file 11b's Tasks 12 to 14 own, never an addition to this window.

**Steps:**
- [ ] **Step 1:** read the floating-card recipe in `docs/internal/admin-design-system.md` and
  record its exact utility pair and its stated rule about nested surfaces. Read
  `AdminTable.svelte`'s own wrapper to confirm which overflow the table already owns. Report both
  verbatim, since the composition is argued from them.
- [ ] **Step 2:** rewrite `src/lib/reproductions/stories/CustomScreen.svelte` to compose
  `PageHeader` beside `AdminTable` inside the recipe's card, with no `OfficeList` import. Rewrite
  the `@component` block: what the story reproduces, why the frame is written at the call site, and
  the lockstep rule with the doc snippet. No em dash, TSDoc-clean.
- [ ] **Step 3:** rewrite the doc's worked example and its surrounding prose so the snippet's
  markup matches the story's markup character for character below the `<script>` block, since
  `check:snippets` and the story's own comment both bind them together.
- [ ] **Step 4:** follow the assertions in
  `src/tests/component/reproductions-stories.test.ts`'s `toolkit/custom-screen` block onto the new
  structure. An assertion that reached for `OfficeList`'s frame now names the composed card; an
  assertion about the heading, the table, and the chips holds unchanged. **The `it(...)` title at
  `:987` and the comment at `:990` both name the office list, and the comment additionally cites a
  pass and a task number, which constraint 2 forbids; rewrite both so no `OfficeList` reference is
  left for Task 12 to find.** Report which assertions changed and which did not.
- [ ] **Step 5:** append the `CHANGELOG.md` entry (the extend guide's custom-screen example now
  composes `PageHeader` beside `AdminTable`) with no `Consumers must:` line, since nothing about
  the shipped surface changed yet, and add no `docs/extend/migration-notes.md` bullet: Task 12's own
  `Consumers must:` line is the one a consumer acts on. Say so in the report. The full gate. Commit.

**Acceptance criteria:**
- `src/lib/reproductions/stories/CustomScreen.svelte` imports `PageHeader`, `AdminTable`, and
  `StatusChip` from `../../admin-toolkit/index.js` and does not import `OfficeList`.
- The story's card element carries `card-shell` and `card-shadow` and does NOT carry
  `overflow-x-auto`.
- `docs/extend/add-a-custom-admin-screen.md` contains no occurrence of `OfficeList`, and its
  worked snippet's markup matches the story file's markup below the `<script>` block.
- `src/tests/component/reproductions-stories.test.ts` contains no occurrence of `OfficeList`,
  including in its test titles and comments, and carries no pass or task citation.
- `src/tests/unit/reproductions-manifest.test.ts` is not in the diff and passes, and
  `'toolkit/custom-screen'` is still in its pinned id list.
- The `toolkit/custom-screen` block passes, and the report names every assertion it changed with
  the reason.
- `docs/internal/api-surface.md` is not in the diff and `check:surface` is byte-identical.
- `check:snippets` passes against the built package.
- `src/lib/admin-toolkit/OfficeList.svelte` and `src/lib/admin-toolkit/index.ts` are not in the
  diff. The export still exists after this task.
- The report names the signups-exemplar divergence and confirms no showcase file is in the diff.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`, with `git status`
  clean under both snapshot directories.

**Commit:** one, `docs(extend): compose the custom-screen example from PageHeader and AdminTable`.

---

## Task 2: The bag, `createContentRoutes` and `createCairnAdmin`

**Deliverables: four.** The two factory signatures on one bag, the in-tree call sites and tests,
the two doctor strings that pin the old call shape, and the `convention-parameter-bags` amendment
with the changelog and migration entries.

**The failing gate first:** moving `runtime` into the bag turns `npm run check` red at every call
site the compiler reaches, about forty test files plus the showcase and the doctor strings. That
red is this task's failing assertion; there is no new runtime behavior to test, and the arity
change is proven by the compiler and by `check:transcripts`, not by a new suite.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (`createContentRoutes` at `:165` and
  `createContentRoutesInternal` at `:59`), `src/lib/sveltekit/cairn-admin.ts`
  (`createCairnAdmin` at `:412` and `createCairnAdminInternal` at `:99`),
  `src/lib/sveltekit/content-routes-context.ts` (if its own factory takes the runtime positionally),
  `src/lib/doctor/checks-local.ts:345`, `src/lib/diagnostics/conditions.ts:209`,
  `examples/showcase/src/chassis/cairn.server.ts`, `docs/reference/sveltekit.md`,
  `docs/reference/admin-routes.md`, `docs/reference/components.md`, `docs/reference/core.md`,
  `docs/reference/README.md`, `docs/extend/build-a-site-by-hand.md`,
  `docs/extend/security-model.md`, `docs/internal/api-surface.md` (regenerated),
  `docs/internal/engine-rulings.md` (`convention-parameter-bags`,
  `audit-sveltekit-createcontentroutes`, `audit-sveltekit-createcairnadmin`,
  `audit-sveltekit-contentroutesoptions`, `audit-sveltekit-cairnadminoptions`), `CHANGELOG.md`,
  `docs/extend/migration-notes.md`
- Regenerated, never hand-edited: `templates/waymark/**` follows from the showcase through
  `npm run emit:template`; `check:template` is the proof (constraint 18)
- Test: the suites that call either factory, enumerated by grep at dispatch. Measured at plan
  authoring: thirty files call `createContentRoutes` and six call `createCairnAdmin` under
  `src/tests/{unit,integration}`, plus `src/tests/component/CairnAdmin.test.ts` and
  `src/tests/unit/factory-contracts.test.ts`
- Classified and left: `docs/internal/history/STATUS-archive-2026-05-to-2026-07.md:2607` spells
  `createCairnAdmin(runtime, deps)` and `:5131` spells `createMediaRoute(runtime)`. Both are
  write-once archive prose (constraint 7) and neither is a defect

**Interfaces:**
- Produces: `createContentRoutes(config: ContentRoutesConfig): ContentRoutes`, where
  `ContentRoutesConfig` gains a required `runtime: CairnRuntime` member. Every other member keeps
  its name, its optionality, and its documented meaning.
- Produces: `createCairnAdmin(config: CairnAdminConfig): CairnAdminRoutes`, where
  `CairnAdminConfig` gains a required `runtime: CairnRuntime` member on the same terms.
- Produces: the two internal factories (`createContentRoutesInternal`,
  `createCairnAdminInternal`) take the same one-bag shape, so the composition root and the public
  factory do not diverge. Neither is exported from a barrel, so neither reaches `check:surface`.
- Unchanged: the returned `ContentRoutes` and `CairnAdminRoutes` shapes, their member names, and
  the merge literal's key order.
- Changed and disclosed: `docs/internal/api-surface.md` records the two new signatures and the two
  bags' new member.

**Decisions the plan makes:**
- **`runtime` is required, not optional with a default.** Decision 11's words: "`runtime` a
  required member of the bag where the factory needs one". Both factories need one, so a missing
  `runtime` is a type error at the call site rather than a runtime failure.
- **The bag stays the single positional parameter and loses its `= {}` default.** Both bags now
  carry a required member, so the default is removed from both signatures. A default on a bag with
  a required member is a lie the compiler cannot catch at the declaration.
- **The parameter identifier is `config` on both**, which `convention-parameter-bags` already
  ratifies and the conventions pass already executed for these two bags.
- **`runtime` sits first in each bag's declaration**, so the type reads in the order the old
  positional signature did.
- **The `convention-parameter-bags` amendment is written in this task, not deferred.** It is a
  dated clause appended to the row, quoting decision 11's text and citing
  `docs/superpowers/specs/2026-09-08-polish-passes-design.md`, dated 2026-09-08. The clause states
  that the source of the ruling is that spec's Decisions block rather than a sitting quotation,
  per the spec's own preamble. Task 3 adds nothing to the row; one amendment covers all four
  factories.

**Steps:**
- [ ] **Step 1:** grep and count every call site of both factories across `src`, `examples`,
  `templates`, `packages`, and `docs`, and paste the per-identifier hit list broken out by class
  (compiled, docs fenced, docs prose, lowercase anchors, archives). Report the count per factory
  before changing anything.
- [ ] **Step 2:** move `runtime` into `ContentRoutesConfig` and `CairnAdminConfig`, change the four
  signatures (two public, two internal), and let the compiler find the call sites. Update each
  member's doc comment where the bag's shape sentence is now wrong.
- [ ] **Step 3:** update the showcase, then re-emit the template with `npm run emit:template`.
  `check:template` is in the gate for this reason.
- [ ] **Step 4:** update the two doctor strings that spell `createCairnAdmin(runtime).shellLoad`
  in prose (`checks-local.ts:345`, `conditions.ts:209`). Both are user-facing remediation text a
  reader copies, so the new spelling must be the one that compiles. Run the CLI suite and
  `check:transcripts`.
- [ ] **Step 5:** update every reference page and extend guide that spells either call, then run
  `check:snippets` against the built package. Regenerate the surface with
  `npm run package && node scripts/checks/check-surface.mjs --update` and commit
  `docs/internal/api-surface.md` in this commit.
- [ ] **Step 6:** amend `convention-parameter-bags` with the dated arity clause, and append a
  `- **Note (polish-C, Task 2):**` line to `audit-sveltekit-createcontentroutes`,
  `audit-sveltekit-createcairnadmin`, `audit-sveltekit-contentroutesoptions`, and
  `audit-sveltekit-cairnadminoptions`, each naming the new signature and stating "verdict
  unchanged". Locate all five by slug.
- [ ] **Step 7:** append the `CHANGELOG.md` entry with its `Consumers must:` line and the matching
  `docs/extend/migration-notes.md` bullet, both naming the exact before and after call for each
  factory. The full gate. Commit.

**Acceptance criteria:**
- `createContentRoutes` and `createCairnAdmin` each take exactly one parameter, and neither
  parameter carries a default.
- `ContentRoutesConfig` and `CairnAdminConfig` each declare `runtime: CairnRuntime` as a required
  member with a doc comment stating what it supplies.
- `grep -rnE "createContentRoutes\(|createCairnAdmin\(" src examples templates packages docs`
  returns no two-argument call outside `docs/internal/history/`, and the report names the three
  counts (found, changed, remaining) with each remaining site classified against constraint 7's
  table.
- `src/lib/doctor/checks-local.ts` and `src/lib/diagnostics/conditions.ts` spell the one-bag call,
  and the CLI suite plus `check:transcripts` pass.
- `docs/internal/api-surface.md` is in the diff and records both new signatures, and the plain
  `check:surface` run in the gate is green against it.
- `check:snippets` and `check:template` pass, and no `templates/waymark` file is hand-edited.
- `convention-parameter-bags` carries a dated clause quoting decision 11 and citing the spec by
  path and date, and `check:rulings-format` passes.
- Four ruling rows carry a `- **Note (polish-C, Task 2):**` line with their heading ids unchanged.
- `CHANGELOG.md` and `docs/extend/migration-notes.md` each carry an entry naming the before and
  after call for both factories.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one,
`refactor(sveltekit)!: take one config bag on createContentRoutes and createCairnAdmin`.

---

## Task 3: The bag, `createNavRoutes` and `createMediaRoute`

**Deliverables: four.** The two new config bags, the two factory signatures, the in-tree call
sites and tests, and the changelog and migration entries.

**The failing gate first:** changing both signatures turns `npm run check` red at
`src/lib/sveltekit/cairn-admin.ts:116`, the engine's own `createNavRoutes` caller, and at every
media-route test and the showcase's media route. That red is this task's failing assertion.

**Files:**
- Modify: `src/lib/sveltekit/nav-routes.ts` (`createNavRoutes` at `:42`),
  `src/lib/sveltekit/media-route.ts` (`createMediaRoute` at `:78`),
  **`src/lib/sveltekit/cairn-admin.ts:116`** (the composition root's own `createNavRoutes(runtime)`
  call, which Task 2 also edits and which the compiler finds either way),
  `src/lib/sveltekit/index.ts` (the barrel's exported type list gains the two bags),
  `examples/showcase/src/routes/media/[...path]/+server.ts`, `docs/reference/sveltekit.md`,
  `docs/extend/build-a-site-by-hand.md`, `docs/internal/api-surface.md` (regenerated),
  `docs/internal/engine-rulings.md` (`audit-sveltekit-createnavroutes`,
  `audit-sveltekit-createmediaroute`, `audit-sveltekit-navroutes`), `CHANGELOG.md`,
  `docs/extend/migration-notes.md`
- Regenerated, never hand-edited: `templates/waymark/**` through `npm run emit:template`
- Not in the file list, on measurement: `docs/reference/media.md` and
  `docs/reference/admin-routes.md` carry no `createMediaRoute(` or `createNavRoutes(` call today.
  Step 1's grep decides; a page the grep does not return is not edited
- Test: `src/tests/unit/nav-routes-load.test.ts`, `nav-routes-save.test.ts`,
  `media-route-platform-proxy.test.ts`, `media-route-plain-opts.test.ts`, `env-genericity.test.ts`,
  `nav-layout-validate.test.ts`, `src/tests/integration/media-delivery.test.ts`,
  `media-upload.test.ts`, `src/tests/unit/factory-contracts.test.ts`, plus whatever the grep at
  dispatch adds

**Interfaces:**
- Produces: `NavRoutesConfig` in `src/lib/sveltekit/nav-routes.ts`, exported from `/sveltekit`,
  declaring exactly `runtime: CairnRuntime` today, with a doc comment saying it exists so the
  factory family has one shape and so a later member has a home.
- Produces: `MediaRouteConfig` in `src/lib/sveltekit/media-route.ts`, exported from `/sveltekit`,
  on the same terms.
- Produces: `createNavRoutes(config: NavRoutesConfig): NavRoutes` and
  `createMediaRoute(config: MediaRouteConfig): RequestHandler`.
- Unchanged: `createMediaRoute`'s kit `RequestHandler` return, exempt under
  `convention-interop-carve-out`, and its singular name, which Task 9 records rather than changes.
- Changed and disclosed: `docs/internal/api-surface.md` gains two type names and records the two
  new signatures.

**Decisions the plan makes:**
- **A one-member bag is the right shape here, not an over-abstraction.** Decision 11 rules one
  shape for every route factory, and the sweep's F15 charges `createMediaRoute` specifically with
  "no `MediaRouteConfig` where every sibling has one". The bag is the ruled shape, and its cost is
  one type name each.
- **Both bags are public.** Every sibling factory's bag is on `/sveltekit`, and a site annotating
  its own wrapper needs to name the parameter type. Exporting them is what
  `convention-contract-first-returns`'s sibling reasoning asks for on the input side, and it is
  what keeps `check-surface-leaks` from finding an unnameable parameter type.
- **`convention-parameter-bags` is not amended twice.** Task 2 wrote the arity clause; this task
  cites it and adds Notes to its own rows.

**Steps:**
- [ ] **Step 1:** grep and count every call site of both factories and paste the per-class hit
  list. Report the counts.
- [ ] **Step 2:** declare `NavRoutesConfig` and `MediaRouteConfig`, change both signatures, export
  both types from `/sveltekit`, and let the compiler find the call sites, `cairn-admin.ts:116`
  included.
- [ ] **Step 3:** update the showcase media route, then re-emit the template and run
  `check:template`.
- [ ] **Step 4:** update the reference pages and the hand-mount guide the Step 1 grep returned,
  then `check:snippets` against the built package. Regenerate the surface with
  `npm run package && node scripts/checks/check-surface.mjs --update` and commit
  `docs/internal/api-surface.md` in this commit.
- [ ] **Step 5:** append a `- **Note (polish-C, Task 3):**` line to
  `audit-sveltekit-createnavroutes`, `audit-sveltekit-createmediaroute`, and
  `audit-sveltekit-navroutes`, each naming the new signature and stating "verdict unchanged".
- [ ] **Step 6:** append the `CHANGELOG.md` entry with its `Consumers must:` line and the
  migration-notes bullet, naming the exact before and after call for each. The full gate. Commit.

**Acceptance criteria:**
- `NavRoutesConfig` and `MediaRouteConfig` exist, are exported from `/sveltekit`, and each declares
  `runtime: CairnRuntime` with a doc comment.
- `createNavRoutes` and `createMediaRoute` each take exactly one parameter and neither carries a
  default.
- `grep -rnE "createNavRoutes\(|createMediaRoute\(" src examples templates packages docs` returns
  no bare-runtime call outside `docs/internal/history/`, with the three counts reported and each
  remaining site classified.
- `docs/internal/api-surface.md` is in the diff, names both new types under `/sveltekit`, and the
  plain `check:surface` run is green against it.
- `check:snippets` and `check:template` pass, and no `templates/waymark` file is hand-edited.
- Three ruling rows carry a `- **Note (polish-C, Task 3):**` line, heading ids unchanged, and
  `check:rulings-format` passes.
- `CHANGELOG.md` and `docs/extend/migration-notes.md` each carry the before and after call for both
  factories.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `refactor(sveltekit)!: take one config bag on createNavRoutes and createMediaRoute`.

**Checkpoint after this task.** The conductor writes STATUS: task ledger, decisions taken, spend
against the 9M ceiling, next task.

---

## Task 4: Bags and load data

**Deliverables: four.** The three engine `*Config` renames with their parameter identifiers plus
the dev package's `DevBackendConfig`, the two load-data renames, the two gate record files and the
barrel-prune literal, and the parameter-bags row's factory-versus-per-call clause with the
changelog and migration entries.

**The failing gate first:** renaming the declarations turns `npm run check` red at the first
importer in each package, and `src/tests/unit/sveltekit-barrel-prune.test.ts` goes red on
`KEPT`'s `'NavLoadData'` entry, which asserts against `dist/sveltekit/index.d.ts`. Those two reds
are this task's failing assertions.

**Files:**
- Modify: `src/lib/sveltekit/guard.ts` (`AuthGuardOptions` at `:34`, `createAuthGuard(opts...)` at
  `:164`), `src/lib/render/pipeline.ts` (`RendererOptions` at `:41`),
  `src/lib/content/fieldset.ts` (`FieldsetOptions` at `:39`, the parameter at `:425`),
  `src/lib/index.ts` (the two re-export lines and the `FieldsetOptions.behavior` comment at
  `:82-83`), `packages/cairn-cms-dev/src/handle.ts` and
  `packages/cairn-cms-dev/src/index.ts` (`DevBackendOptions`),
  `src/lib/sveltekit/nav-routes.ts:25` (`NavLoadData`),
  `src/lib/sveltekit/content-routes-settings.ts:86` (`VocabularyLoadData`),
  `src/lib/sveltekit/index.ts:55`, `src/lib/sveltekit/content-routes.ts:48`,
  `src/lib/reproductions/fixtures.ts:252`, the components that type either load-data prop
  (enumerated by grep at dispatch), **`src/tests/unit/sveltekit-barrel-prune.test.ts`** (the
  `KEPT` literal's `'NavLoadData'` entry at `:54`),
  `scripts/checks/check-surface-reexports.json` (`AuthGuardOptions` in two `reason` strings,
  `NavLoadData` and `VocabularyLoadData` in one each; the file has no `name` entry for any of them),
  `scripts/checks/check-self-use-allowlist.json` (three `name` entries: `AuthGuardOptions`,
  `RendererOptions`, `FieldsetOptions`), `docs/reference/sveltekit.md`,
  `docs/reference/core.md`, `docs/reference/render.md`, `docs/reference/components.md`,
  `docs/extend/*.md` (by grep), `docs/internal/api-surface.md` (regenerated),
  `docs/internal/engine-rulings.md` (`convention-parameter-bags`,
  `audit-sveltekit-authguardoptions`, `audit-adapter-rendereroptions`,
  `audit-adapter-fieldsetoptions`, `audit-sveltekit-navloaddata`,
  `audit-sveltekit-vocabularyloaddata`), `CHANGELOG.md`, `docs/extend/migration-notes.md`
- Not modified: `scripts/checks/check-surface-leaks.json` names none of these six
- Test: `src/tests/**` by grep, plus `packages/cairn-cms-dev`'s own suite and `check:dev-package`

**Interfaces:**
- Produces: `AuthGuardConfig`, `RendererConfig`, `FieldsetConfig`, `DevBackendConfig`, `NavData`,
  `VocabularyData`. Every member of every renamed type keeps its name, optionality, and doc.
- Produces: `createAuthGuard(config: AuthGuardConfig = {})`, `fieldset(..., config: FieldsetConfig = {})`,
  and `devBackendHandle(config?: DevBackendConfig)`. The parameter identifier becomes `config` on
  each, which is `convention-parameter-bags`'s ruled identifier for a primary bag.
- Unchanged: the seven per-call `*Options` types on the surface. The rename set is the four
  factory-level bags only, which is the distinction this task writes into the ledger.
- Changed and disclosed: `docs/internal/api-surface.md` on both packages.

**Decisions the plan makes:**
- **The factory-`Config` versus per-call-`Options` split is written into
  `convention-parameter-bags`'s own row**, per F17's fix and the spec's task 3. The clause states
  the rule (a bag a factory takes at construction is `*Config`; a bag a single call takes is
  `*Options`) and names `SectionActionConfig` and `SectionActionOptions` as the pair the engine
  already drew it on. It is dated 2026-09-08 and cites the spec by path. **The clause is what
  reaches these three types**: the row's ruled text scoped its population to four `*Config` rows
  and, as F17 states, "did not reach these three", so the renames argue from F17 and decision 6 and
  the row is widened here rather than cited as already covering them.
- **`CairnManifestOptions` is exempt** under `convention-interop-carve-out`, as the sweep states.
  It is not renamed and the clause says so, so a later family read does not re-file it.
- **`NavData` and `VocabularyData` join the eleven load-data types that already omit `Load`.** The
  keep verdicts on both rows are about the types' existence, never their names, so a rename
  satisfies both any-site cases verbatim.
- **This task lands after 11b's dev-package work.** `devBackendHandle`'s bag gains an `access`
  member in 11b's Task 11; the rename here takes whatever shape 11b left and does not reshape it.

**Steps:**
- [ ] **Step 1:** grep and count all six names across the tree, including the two live gate record
  JSON files, the barrel-prune literal, and the lowercase anchor form of each. Paste the per-class
  hit list. Report the counts.
- [ ] **Step 2:** rename the four bags and their parameter identifiers, then the two load-data
  types. Let the compiler find the call sites in both packages.
- [ ] **Step 3:** update `scripts/checks/check-surface-reexports.json` and
  `scripts/checks/check-self-use-allowlist.json` for exactly these six names, update `KEPT` in
  `src/tests/unit/sveltekit-barrel-prune.test.ts`, and confirm no other entry in any of the three
  gate record files names a symbol this task changed.
- [ ] **Step 4:** update every reference page, extend guide, and component doc that names one of
  the six, anchors included, then run `check:snippets` and `check:dev-package`. Regenerate the
  surface with `npm run package && node scripts/checks/check-surface.mjs --update` and commit
  `docs/internal/api-surface.md`.
- [ ] **Step 5:** add the factory-versus-per-call clause to `convention-parameter-bags`, and append
  a `- **Note (polish-C, Task 4):**` line to the five audit rows, each naming the new name and
  stating "verdict unchanged".
- [ ] **Step 6:** append the `CHANGELOG.md` entry with its `Consumers must:` line (six type-import
  renames, listed old to new, across both packages) and the matching migration-notes bullet. The
  full gate. Commit.

**Acceptance criteria:**
- `grep -rnE "\b(AuthGuardOptions|RendererOptions|FieldsetOptions|DevBackendOptions|NavLoadData|VocabularyLoadData)\b" src packages examples templates docs scripts`
  returns only sites classified against constraint 7's table, each named in the report.
- `createAuthGuard`, `fieldset`, and `devBackendHandle` name their parameter `config`.
- `scripts/checks/check-surface-reexports.json` and `scripts/checks/check-self-use-allowlist.json`
  carry the new names and no old one, and `scripts/checks/check-surface-leaks.json` is not in the
  diff.
- `KEPT` in `src/tests/unit/sveltekit-barrel-prune.test.ts` names `NavData` and the test passes.
- `docs/internal/api-surface.md` is in the diff for both packages and the plain `check:surface`
  run is green.
- `check:dev-package`, `check:snippets`, and `check:docs` pass, the last proving no anchor fragment
  is left dangling.
- `convention-parameter-bags` carries the factory-versus-per-call clause, dated and citing the spec
  by path, naming `SectionActionConfig`/`SectionActionOptions` as the precedent and
  `CairnManifestOptions` as the carve-out exemption; `check:rulings-format` passes.
- Five ruling rows carry a `- **Note (polish-C, Task 4):**` line, heading ids unchanged.
- `CHANGELOG.md` and `docs/extend/migration-notes.md` list all six renames old to new.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `refactor!: rename the four factory bags to Config and drop Load from two data types`.

---

## Task 5: Verbs and codecs

**Deliverables: four.** The manifest codec renamed and re-homed, the two one-off verbs, the ledger
annotations, and the changelog and migration entries.

**The failing gate first:** re-homing `parseManifest` without its
`scripts/checks/check-surface-reexports.json` entry turns `check:surface` red on the canonical-home
rule BEFORE the snapshot diff, and renaming the three functions turns `npm run check` red at the
engine's own callers. Those are this task's failing assertions.

**Files:**
- Modify: `src/lib/content/manifest.ts` (`serializeManifest` at `:136`),
  `src/lib/index.ts:94` (the root barrel's manifest line, which gains `parseManifest`),
  `src/lib/delivery/data.ts:72` (the `parseManifest` re-export, which becomes a recorded
  re-export naming its new home), `src/lib/content/excerpt.ts:46` (`deriveExcerpt`),
  `src/lib/delivery/data.ts:58` and `:71`, `src/lib/delivery/manifest.ts:56`
  (`diffNewlyPublished`), the engine's own callers of all four (by grep; the sweep names
  `src/lib/vite/` as `serializeManifest`'s structural consumer),
  `scripts/checks/check-surface-reexports.json` (the `parseManifest` entry),
  `scripts/checks/check-self-use-allowlist.json` (the `diffNewlyPublished` entry),
  `docs/reference/core.md`, `docs/reference/delivery.md`,
  `docs/reference/delivery-data.md`, `docs/reference/vite.md`, `docs/extend/*.md` (by grep),
  **`CHANGELOG.md:3148`** (the historical entry's link
  `docs/reference/delivery-data.md#diffnewlypublished`, whose anchor is repointed under constraint
  16 while its prose stays verbatim), `docs/internal/api-surface.md` (regenerated),
  `docs/internal/engine-rulings.md` (`audit-adapter-serializemanifest`,
  `audit-delivery-parsemanifest`, `audit-delivery-deriveexcerpt`,
  `audit-delivery-newlypublishedentries`, `convention-verb-rules`), `CHANGELOG.md`,
  `docs/extend/migration-notes.md`
- Test: `src/tests/**` by grep, plus `examples/showcase` if it names a renamed function

**Interfaces:**
- Produces: `formatManifest(manifest: Manifest): string` on `.`, the codec partner of
  `parseManifest`, with the signature unchanged.
- Produces: `parseManifest` published on `.` beside `formatManifest`, `verifyManifest`, and
  `verifyReferences`, with its canonical home moving to `.` and its `/delivery/data` publication
  becoming a recorded re-export naming that home and the signature that requires it, per
  `canonical-home-rule`'s own mechanism. `check:surface` fails an unrecorded duplicate, so the
  record entry is part of the change, not a follow-up.
- Produces: `buildExcerpt` and `buildNewlyPublished`, signatures unchanged.
- Unchanged: every behavior. All four are pure renames plus one publication.
- Changed and disclosed: `docs/internal/api-surface.md`.

**Decisions the plan makes:**
- **`parseManifest`'s canonical home becomes `.`, not `/delivery/data`.** F3's whole charge is that
  the codec pair is split across two subpaths; publishing `parseManifest` on `.` without moving its
  home would leave the pair split and add a second publication. The `/delivery/data` availability
  survives as a recorded re-export, which is what `canonical-home-rule` calls "a re-export from the
  stated canonical home is not a second home". A site importing `parseManifest` from
  `/delivery/data` keeps working, so this half carries no `Consumers must:` line. **This goes past
  the spec's "also published on `.`" wording and is recorded as a knowing correction in the
  Reconciliation block, where Geoff reads them.**
- **`buildNewlyPublished` is the second rename of one function inside one unpublished window.**
  `audit-delivery-newlypublishedentries` already carries a conventions-pass annotation recording
  `newlyPublishedEntries` to `diffNewlyPublished`. The second Note says so plainly and states that
  both renames sit under the same `## Unreleased` heading, so a consumer crosses one rename, not
  two. That is the same reasoning `audit-log-taxonomy-unmarked-field` used, and Task 11 reuses it.
- **`convention-verb-rules` is progress-noted, not amended.** Its ruled text already covers all
  three renames (`format*` as `parse*`'s partner, `build*` for pure-data derivations). The Note
  records that the three residuals executed, with the spec's date and path.

**Steps:**
- [ ] **Step 1:** grep and count all four names plus every `parseManifest` import specifier and the
  lowercase anchor form of each. Paste the per-class hit list, and separately report every subpath
  each name is currently importable from.
- [ ] **Step 2:** rename `serializeManifest` to `formatManifest` and publish `parseManifest` on `.`,
  re-homing it and converting the `/delivery/data` line into a recorded re-export with its per-name
  reason comment.
- [ ] **Step 3:** rename `deriveExcerpt` to `buildExcerpt` and `diffNewlyPublished` to
  `buildNewlyPublished`, and follow the engine's own callers.
- [ ] **Step 4:** update `scripts/checks/check-surface-reexports.json` for the re-homing and
  `scripts/checks/check-self-use-allowlist.json` for `diffNewlyPublished`, then regenerate the
  surface with `npm run package && node scripts/checks/check-surface.mjs --update` and commit
  `docs/internal/api-surface.md`. Confirm the plain `check:surface` run passes the home rule as
  well as the snapshot diff.
- [ ] **Step 5:** update every reference page and extend guide, anchors included, then
  `check:snippets` against the built package. **Repoint the historical changelog anchor at
  `CHANGELOG.md:3148` to the renamed heading, leaving its prose verbatim**, and confirm
  `check:docs` is green.
- [ ] **Step 6:** append a `- **Note (polish-C, Task 5):**` line to the four audit rows and a
  progress Note to `convention-verb-rules`, each naming the new name and stating "verdict
  unchanged". Append the `CHANGELOG.md` entry with its `Consumers must:` line (three call renames;
  the `parseManifest` publication needs no action) and the migration-notes bullet. The full gate.
  Commit.

**Acceptance criteria:**
- `formatManifest`, `buildExcerpt`, and `buildNewlyPublished` exist; `serializeManifest`,
  `deriveExcerpt`, and `diffNewlyPublished` appear nowhere outside the classified remaining set.
- `parseManifest` is exported from `.` and remains importable from `/delivery/data`, with a
  recorded re-export entry in `scripts/checks/check-surface-reexports.json` naming `.` as its home.
- `scripts/checks/check-self-use-allowlist.json` names `buildNewlyPublished` and not
  `diffNewlyPublished`.
- `CHANGELOG.md:3148`'s link resolves to the renamed heading and the entry's prose is byte-identical
  in the diff; `check:docs` passes.
- `docs/internal/api-surface.md` is in the diff and the plain `check:surface` run passes, home rule
  included.
- `check:snippets` passes against the built package.
- Four audit rows carry a `- **Note (polish-C, Task 5):**` line and `convention-verb-rules` carries
  a progress Note; heading ids unchanged; `check:rulings-format` passes.
- The `audit-delivery-newlypublishedentries` Note states that this is the second rename inside the
  same unpublished window and names the first.
- `CHANGELOG.md`'s entry names three renames and says explicitly that the `parseManifest`
  publication requires no consumer action.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `refactor!: format the manifest codec and put the two one-off verbs on build`.

---

## Task 6: The three factory names, `buildCookieName`, `createGithubApp`, `createAdminAction`

**Deliverables: four.** The three renames with every engine caller and barrel line, the
scaffolder's pinned literal with its three asserting suites and the showcase config, the ledger
annotations with `AdminActionOptions` dispositioned, and the changelog and migration entries.

**The names are fixed by the plan's table.** The implementer never picks between the candidates. If
Geoff chose a listed alternative at plan review, the table was amended before this task dispatched
and this task takes the amended names.

**The failing gate first:** renaming the three declarations turns `npm run check` red at the engine
callers and the showcase, and `npm --prefix packages/create-cairn-site test` goes red on the pinned
`githubApp` literal the moment the showcase's call changes. That CLI red is the sharp one and is
this task's failing assertion: it is exactly the failure a silent scaffolder regression would hide.

**Files:**
- Modify: `src/lib/auth/crypto.ts:48` and `src/lib/auth-crypto/index.ts:11` (`cookieName`),
  `src/lib/github/backend.ts:162` and `src/lib/index.ts:127` (`githubApp`),
  `src/lib/sveltekit/admin-action.ts:206` and the `/sveltekit` barrel's export line
  (`adminAction`), every engine caller by grep,
  `packages/create-cairn-site/src/github/finalize.mjs:20-32` (the
  `TEMPLATE_GITHUB_APP_LITERAL` declaration and the `buildRealLiteral` re-emit),
  `packages/create-cairn-site/src/github/finalize.test.mjs` (`:24`, `:43`, `:60`, `:96`, `:106`),
  `packages/create-cairn-site/src/github/chapter.test.mjs` (`:46`, `:60`, `:62`),
  `packages/create-cairn-site/src/cloudflare/config.test.mjs` (`:247`, `:251`),
  `packages/create-cairn-site/src/scaffold.mjs` (if the grep returns it),
  `examples/showcase/src/theme/cairn.config.ts` and its route files by grep,
  `scripts/checks/check-self-use-allowlist.json` (`adminAction` inside `AdminActionAudit`'s and
  `AdminActionOptions`' `reason` strings; the file has no `adminAction` entry),
  `docs/reference/core.md`, `docs/reference/sveltekit.md`, `docs/reference/auth-crypto.md`,
  **`docs/reference/auth-channel.md`** (which links `#cookiename` at `:106` and is reached by no
  glob either), `docs/reference/admin-routes.md`, **`docs/reference/ambient.md`** (which carries two
  `#adminaction` anchor fragments and is reached by no `docs/extend/*.md` glob),
  `docs/extend/*.md` (by grep, `security-model.md` included for its two anchor fragments),
  **`CHANGELOG.md:3011`** (the historical entry's link `docs/reference/sveltekit.md#adminaction`,
  whose anchor is repointed under constraint 16 while its prose stays verbatim),
  `docs/internal/api-surface.md` (regenerated), `docs/internal/engine-rulings.md`
  (`audit-auth-cookiename`, `audit-adapter-githubapp`, `audit-sveltekit-adminaction`,
  `audit-sveltekit-adminactionoptions`), `CHANGELOG.md`, `docs/extend/migration-notes.md`
- Regenerated, never hand-edited: `templates/waymark/**` through `npm run emit:template`, which is
  what carries the renamed `githubApp` call and the same pinned literal at
  `templates/waymark/src/theme/cairn.config.ts:149`
- Do NOT modify: `src/lib/doctor/checks-github.ts:14`, whose `githubApp` is an exported value
- Do NOT modify, and exclude from the acceptance grep by path:
  `examples/showcase/src/chassis/theme-toggle.ts:15` and `:34`,
  `templates/waymark/src/chassis/theme-toggle.ts:15` and `:34`, and
  `templates/waymark/src/theme/components/SiteHeader.svelte:63`, five sites where `cookieName` is a
  SITE's own theme-cookie config member with no relation to the engine's exported function
- Test: `src/tests/**` by grep, plus the CLI suite

**Interfaces:**
- Produces: `buildCookieName`, `createGithubApp`, `createAdminAction`. Every signature, return
  type, and thrown error is unchanged.
- Unchanged: `AdminActionOptions`, `AdminActionContext`, and every other type these three name.
  Types are nouns and stay noun-first.
- Unchanged: `src/lib/doctor/checks-github.ts`'s `githubApp` value.
- Changed and disclosed: `docs/internal/api-surface.md`.

**Decisions the plan makes:**
- **`audit-sveltekit-adminactionoptions` is dispositioned, not closed.** It is a retire verdict,
  still open, blocked on `adminAction`'s own declared signature naming `AdminActionOptions`. This
  rename changes the function's NAME and not its signature, so the block is untouched. The Note
  says exactly that: the retire stays open, its blocker is unchanged, and the row now names
  `createAdminAction`.
- **`convention-bare-noun-functions` is progress-noted in Task 7, not here.** The population is
  seven names across two tasks, and a progress note naming three of seven would be wrong the day
  it landed. Task 7 completes the set and writes the note.
- **The scaffolder's pinned literal is a same-task change.**
  `packages/create-cairn-site/src/github/finalize.mjs:21` matches the showcase's
  `githubApp(...)` call character for character; if the showcase renames and the literal does not,
  the scaffolder silently stops rewriting a real site's backend identity. The CLI suite is the
  proof and it runs in this task's gate.
- **The site-local `cookieName` collision is named, not swept.** Five sites in the showcase and the
  emitted template carry a `cookieName` member on a theme-cookie config. Renaming one would corrupt
  the emitted template. They are a fourth exempt class in this task's acceptance grep, listed by
  path, exactly as the doctor's `githubApp` twin is.

**Steps:**
- [ ] **Step 1:** grep and count the three names plus their lowercase anchor forms
  (`#cookiename`, `#githubapp`, `#adminaction`), reporting `githubApp`'s TWO declarations
  separately and naming which one is exempt, and listing the five site-local `cookieName` sites
  separately. Paste the per-class hit list.
- [ ] **Step 2:** rename the three in `src/lib` and follow every engine caller and barrel line.
- [ ] **Step 3:** update the scaffolder's pinned literal, its builder, and its three test files;
  run `npm --prefix packages/create-cairn-site test` before going further and report the result.
- [ ] **Step 4:** update the showcase, then re-emit the template and run `check:template`.
- [ ] **Step 5:** update `scripts/checks/check-self-use-allowlist.json` for the two `reason`
  strings that name `adminAction`. Update every reference page and extend guide, `docs/reference/ambient.md` and every
  lowercase anchor fragment included, then `check:snippets` and `check:docs`. Repoint the
  historical changelog anchor at `CHANGELOG.md:3011`, leaving its prose verbatim. Regenerate the
  surface with `npm run package && node scripts/checks/check-surface.mjs --update` and commit
  `docs/internal/api-surface.md`.
- [ ] **Step 6:** append a `- **Note (polish-C, Task 6):**` line to `audit-auth-cookiename`,
  `audit-adapter-githubapp`, and `audit-sveltekit-adminaction`; write the disposition Note on
  `audit-sveltekit-adminactionoptions`.
- [ ] **Step 7:** append the `CHANGELOG.md` entry with its `Consumers must:` line (three call
  renames, old to new, naming `src/theme/cairn.config.ts` as the site file a consumer meets for
  `createGithubApp`, which is all four sites) and the migration-notes bullet. The full gate.
  Commit.

**Acceptance criteria:**
- `buildCookieName`, `createGithubApp`, and `createAdminAction` exist with unchanged signatures, and
  `grep -rnE "\b(cookieName|githubApp|adminAction)\b" src packages examples templates docs scripts`
  returns only `src/lib/doctor/checks-github.ts:14`, the five site-local `cookieName` sites listed
  above, and sites classified against constraint 7's table, each named in the report.
- `src/lib/doctor/checks-github.ts` is not in the diff, and the report states why.
- `packages/create-cairn-site/src/github/finalize.mjs`'s pinned literal spells the new name, and
  `npm --prefix packages/create-cairn-site test` passes.
- `check:template` passes and the re-emitted template carries the new name at
  `templates/waymark/src/theme/cairn.config.ts`.
- `scripts/checks/check-self-use-allowlist.json` carries `createAdminAction` and not `adminAction`.
- `CHANGELOG.md:3011`'s link resolves to the renamed heading with its prose byte-identical, and
  `check:docs` passes with no dangling anchor fragment anywhere.
- `docs/internal/api-surface.md` is in the diff and the plain `check:surface` run is green.
- `check:snippets` passes against the built package.
- `audit-sveltekit-adminactionoptions` keeps its retire verdict and its open reopen state, and its
  Note states that the blocker is unchanged.
- `check:rulings-format` passes and three further ruling rows carry the Note.
- `CHANGELOG.md` and `docs/extend/migration-notes.md` list all three renames old to new and name
  `cairn.config.ts`.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `refactor!: put the three noun-first factory functions on a verb`.

---

## Task 7: The four preview and health names

**Deliverables: four.** The four renames with the `/sveltekit` barrel lines and the barrel-prune
literal, the two gate record files and the documentation anchors, the ledger annotations with
`convention-bare-noun-functions` progress-noted for all seven, and the changelog and migration
entries.

**The names are fixed by the plan's table**, as in Task 6.

**The failing gate first:** renaming `healthLoad` turns
`src/tests/unit/sveltekit-barrel-prune.test.ts` red on `KEPT`'s `'healthLoad'` entry at `:60`,
which asserts against `dist/sveltekit/index.d.ts`, and the three preview renames turn
`npm run check` red at every engine caller. Those are this task's failing assertions.

**Files:**
- Modify: `src/lib/sveltekit/preview.ts:128` (`previewMint`), `:197` (`previewRevoke`), `:431`
  (`previewLoad`), `src/lib/sveltekit/health.ts:28` (`healthLoad`),
  `src/lib/sveltekit/index.ts:27-29` (the three preview names) and `:93` (`healthLoad`), every
  engine caller by grep, **`src/tests/unit/sveltekit-barrel-prune.test.ts`** (the `KEPT` literal's
  `'healthLoad'` entry at `:60`), `examples/showcase/src/**` by grep (the preview and health routes
  if it mounts them), `scripts/checks/check-surface-reexports.json` (the R4-closure `reason`
  string naming `previewLoad`; the file has no `previewLoad` entry),
  `scripts/checks/check-self-use-allowlist.json` (`previewLoad` inside `EntryDataOverrides`'
  `reason`; likewise no entry),
  `docs/reference/sveltekit.md` (which carries `#previewmint` four times, `#previewrevoke` twice,
  and `#previewload` twice), `docs/reference/admin-routes.md`, **`docs/reference/ambient.md`**,
  **`docs/reference/delivery.md`** (two `#previewload` fragments, `:75` and `:185`) and
  **`docs/reference/components.md`** (one, `:835`), neither reached by any glob this task carries,
  `docs/extend/share-a-draft-preview.md`, `docs/extend/debug-your-site.md`, `docs/extend/*.md` (by
  grep), **`vitest.config.ts`** (three alias comments naming `previewLoad` at `:29` and `:96` and
  `previewMint` at `:122`) and **`.github/workflows/e2e.yml:70`** (a step comment naming
  `previewLoad`), both live comments a rename makes false under constraint 7's table,
  `docs/internal/api-surface.md` (regenerated), `docs/internal/engine-rulings.md`
  (`audit-sveltekit-previewload`, `audit-sveltekit-healthload`,
  `audit-sveltekit-mintpreviewtoken`, `convention-bare-noun-functions`), `CHANGELOG.md`,
  `docs/extend/migration-notes.md`
- Regenerated, never hand-edited: `templates/waymark/**` through `npm run emit:template`
- Not modified, with the reason: `migrations/0003_preview.sql:2` and its emitted copies under
  `examples/showcase/migrations/` and `templates/waymark/migrations/`, whose comment names
  `previewMint`. A shipped migration is immutable, and the rename reaches no table or column name,
  so the hit is classified and left (constraint 7's table)
- Test: `src/tests/**` by grep

**Interfaces:**
- Produces: `mintPreview`, `revokePreview`, `loadPreview`, `loadHealth`. Every signature, return
  type, and thrown error is unchanged.
- Unchanged: `PreviewMintOutcome`, `PreviewRevokeOutcome`, `PreviewData`, and `HealthData`. Types
  are nouns and stay noun-first.
- Changed and disclosed: `docs/internal/api-surface.md`.

**Decisions the plan makes:**
- **`audit-sveltekit-mintpreviewtoken` is annotated as historical.** It names `mintPreviewToken`,
  which no longer exists in `src/lib`; the Note records that the symbol is `mintPreview` after this
  pass and that the row's reshape verdict refers to the same operation.
- **`convention-bare-noun-functions` is progress-noted here, with all seven names**, recording that
  the ruling's population is now executed across the public surface and naming the two exemptions
  argued rather than assumed: the doctor's `githubApp` value and `cairnManifest` as a
  host-ecosystem plugin factory. The note names Tasks 6 and 7 as the two that executed it.
- **`loadPreview` reaches two consumer sites of four and `loadHealth` reaches all four.** The
  changelog's `Consumers must:` line says so, naming `src/routes/healthz/+server.ts` and the
  preview route by path, because the spec's line 6 phrasing ("`githubApp` and `previewLoad` are the
  two consumers meet") is measurably wrong: `healthLoad` is imported in all four sites' `healthz`
  route and `previewLoad` in only two.

**Steps:**
- [ ] **Step 1:** grep and count the four names plus their lowercase anchor forms
  (`#previewmint`, `#previewrevoke`, `#previewload`, `#healthload`). Paste the per-class hit list.
- [ ] **Step 2:** rename the four in `src/lib` and follow every engine caller and barrel line;
  update `KEPT`.
- [ ] **Step 3:** update the showcase where the grep returns it, then re-emit the template and run
  `check:template`.
- [ ] **Step 4:** update both gate record files for the `reason` strings that name `previewLoad`. Update every
  reference page and extend guide, `docs/reference/ambient.md` and every anchor fragment included,
  then `check:snippets` and `check:docs`. Regenerate the surface with
  `npm run package && node scripts/checks/check-surface.mjs --update` and commit
  `docs/internal/api-surface.md`.
- [ ] **Step 5:** append a `- **Note (polish-C, Task 7):**` line to `audit-sveltekit-previewload`,
  `audit-sveltekit-healthload`, and `audit-sveltekit-mintpreviewtoken`; progress-note
  `convention-bare-noun-functions` with all seven names and the two exemptions.
- [ ] **Step 6:** append the `CHANGELOG.md` entry with its `Consumers must:` line (four call
  renames, old to new, naming `src/routes/healthz/+server.ts` for `loadHealth` in all four sites and
  the preview route for `loadPreview` in two of four) and the migration-notes bullet. The full
  gate. Commit.

**Acceptance criteria:**
- `mintPreview`, `revokePreview`, `loadPreview`, and `loadHealth` exist with unchanged signatures,
  and
  `grep -rnE "\b(previewMint|previewRevoke|previewLoad|healthLoad)\b" src packages examples templates docs scripts skills vitest.config.ts .github/workflows migrations`
  returns only sites classified against constraint 7's table, each named in the report.
- `KEPT` in `src/tests/unit/sveltekit-barrel-prune.test.ts` names `loadHealth` and the test passes.
- Both gate record files name `loadPreview` in the `reason` strings that named `previewLoad`, and
  neither names `previewLoad` anywhere.
- `docs/internal/api-surface.md` is in the diff and the plain `check:surface` run is green.
- `check:snippets`, `check:docs`, and `check:template` pass, with no dangling anchor fragment.
- `convention-bare-noun-functions` carries a progress Note naming all seven renames and the two
  exemptions; three audit rows carry the Note; heading ids unchanged; `check:rulings-format` passes.
- `CHANGELOG.md` and `docs/extend/migration-notes.md` list all four renames old to new and name the
  `healthz` route and the preview route with their site reach.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `refactor(sveltekit)!: put the preview and health functions on a verb`.

**Checkpoint after this task.** The conductor writes STATUS. All seven verb-first renames have
landed, which is the pass's widest grep reach.

---

## Task 8: Outcomes

**Deliverables: four.** The four discriminated results re-keyed and renamed with the login page's
three arms, the `convention-outcome-idiom` widening clause and the `convention-failure-suffix`
supersession, the two closed auth-channel rows superseded with their encodings named, and the
changelog and migration entries.

**The failing gate first:** the new component test is this task's genuine failing assertion. Write
it first, against the NEW discriminant, and watch all three arms fail before the type changes:
it renders `LoginPage` for `outcome: 'sent'`, `'send-error'`, and `'throttled'` and asserts the
message each arm produces. No baseline covers the send-error or throttled render, so this test is
the only thing standing between a mis-mapped value string and a silently broken login page.

**Files:**
- Modify: `src/lib/sveltekit/auth-routes.ts:52` (`RequestResult`) and its `requestAction`
  producers, `src/lib/auth-channel/factory.ts:242` and `:247` and every producer inside the
  factory, `src/lib/sveltekit/types.ts:163` (`RevertFailure`) and its consumers (the revert action
  in 11a's `content-routes-entry-revert.ts`, plus `CairnHistory.svelte` or whichever component
  branches on it, by grep), **`src/lib/components/LoginPage.svelte`** (`:31` the prop type, `:101`,
  `:139`, `:143` the three branches) and `src/lib/components/ConfirmPage.svelte` if the grep
  returns it, `src/lib/sveltekit/index.ts` and `src/lib/index.ts` barrels,
  `src/lib/auth-channel/index.ts`, **`src/tests/unit/sveltekit-barrel-prune.test.ts`** (the `KEPT`
  literal's `'RequestResult'` entry at `:42`), the showcase's login route by grep,
  `scripts/checks/check-self-use-allowlist.json` (the `RequestResult`, `ChannelRequestResult`, and
  `ChannelConfirmResult` entries), `docs/reference/sveltekit.md`, `docs/reference/auth-channel.md`,
  `docs/reference/components.md`, `docs/extend/*.md` (by grep),
  `docs/internal/api-surface.md` (regenerated), `docs/internal/engine-rulings.md`
  (`convention-outcome-idiom`, `convention-failure-suffix`, `audit-sveltekit-requestresult`,
  `audit-auth-channelrequestresult`, `audit-auth-channelconfirmresult`,
  `audit-sveltekit-revertfailure`), `CHANGELOG.md`, `docs/extend/migration-notes.md`
- Not modified: `scripts/checks/check-surface-leaks.json` names none of the four
- Test: a new component test over `LoginPage`'s three arms; `src/tests/**` by grep, plus
  `examples/showcase/e2e/golden-path.spec.ts` if it branches on a login form result
- **`src/lib/components/*.svelte` sits inside `eslint.config.js`'s widened `.svelte` glob after
  11a**, with `tsdoc/syntax` at error, so every comment this task writes in `LoginPage.svelte` and
  `ConfirmPage.svelte` faces a gate rather than a review

**Interfaces:**
- Produces: `RequestOutcome = { outcome: 'sent'; sent: true } | { outcome: 'send-error'; sent: false } | { outcome: 'throttled'; sent: false }`.
  The discriminant key becomes `outcome`, the `send_error` value becomes kebab `send-error`, and
  the `sent` boolean field survives verbatim, because the row's own doc records it as kept for a
  site rendering against `form.sent` and because the neutral and send-ok paths must stay
  byte-identical so the common case never leaks allowlist membership.
- Produces: `ChannelRequestOutcome = { outcome: 'sent' | 'invalid' | 'throttled' | 'challenge-required' | 'unavailable' }`.
  The no-roster-leak encoding survives verbatim: an unknown contact still returns `sent`.
- Produces: `ChannelConfirmOutcome = { outcome: 'confirmed' | 'bad-code' | 'expired' | 'locked' | 'throttled' | 'challenge-required' | 'no-pending-request' | 'unavailable' }`.
  The `ok: true` arm becomes `outcome: 'confirmed'`. `challenge-required` stays a retry invitation
  rather than a hard failure, which the type's doc comment continues to state.
- Produces: `RevertOutcome`, three arms discriminating on `outcome` with kebab values
  `'draft-exists'`, `'history-stale'`, `'ref-unknown'`. Every member field keeps its name,
  including `draftEditor` and `draftLastSavedAt`, which the 4b conformance pass settled.
  `revertAction` still returns `ActionFailure<RevertOutcome>` and still answers 409 for the first
  two and 404 for the third.
- Changed and disclosed: `docs/internal/api-surface.md`.

**Decisions the plan makes:**
- **`RevertOutcome` is the name, per the spec's line 7, and `convention-failure-suffix` is
  superseded in text rather than left contradicted.** That row (accept, closed,
  `engine-rulings.md:214`) rules that "`Failure` is the family suffix; `Refusal` and `Skip` retire
  as TYPE-NAME suffixes". Every arm of `RevertFailure` is a refusal and the type is only ever the
  payload of `ActionFailure<RevertFailure>`, so it is the row's own case rather than an edge of it,
  and F18's own fix sentence ("rename `*Result` to `*Outcome`") does not reach a `*Failure` name;
  the spec's line 7 extended the set. **This task therefore appends a dated supersession clause to
  `convention-failure-suffix` itself**, citing the spec by path and date, stating the surviving
  scope (`*Failure` remains the family suffix for a payload whose arms are all refusals) and naming
  `RevertOutcome` as the ruled exception, on the ground that the outcome idiom governs the
  discriminated SHAPE and the four types should look alike. Without that clause the ledger's
  family-suffix row reads closed while the public surface breaks it, which inverts the promise Task
  13 exists to keep. The audit row `audit-sveltekit-revertfailure` records both readings as before.
  If Geoff prefers `RevertFailure` re-keyed onto `outcome` without a rename, that is a plan-review
  amendment, not an implementer's call.
- **Discriminant values follow the kebab grammar the six existing `*Outcome` types already share,
  and this task records that uniformity AS the rule.** No ledger row rules value casing today;
  `convention-outcome-idiom` rules the KEY. The widening clause therefore states the value grammar
  as well as the scope, so the next reader finds a rule rather than a habit. `send_error` to
  `send-error` and `draft_exists`/`history_stale`/`ref_unknown` to their kebab forms are part of the
  break, and the changelog names each old and new value, because a site switching on a string value
  feels a value change exactly as much as a key change. The snake_case rule at
  `src/lib/log/events.ts:5-7` governs a record's `reason` and `scope` fields, a different surface,
  and is untouched.
- **`convention-outcome-idiom` is widened by a dated clause**, quoting decision 6 in Geoff's own
  words ("no grandfathered exceptions on a surface heading for a 1.0 promise, in the one window
  where every rename is free") and citing the spec by path and date. The clause supersedes the
  row's own scoping phrase, "every discriminated result this pass introduces", with the whole
  public surface, and names the four types read into scope.
- **The two closed auth-channel rows are superseded, not silently re-executed.** Each gets a
  supersession Note that quotes its own closure text ("the type keeps with the factory, unchanged")
  and states what changed and what did not: the name and the discriminant key change; the
  no-roster-leak encoding and the challenge-required-is-a-retry ruling survive verbatim.
- **`audit-sveltekit-requestresult` is annotated with the new discriminant** so its any-site case
  ("branches on form.status") reads true after the change, which is the charter review's finding 3
  correction.

**Steps:**
- [ ] **Step 1:** grep and count the four type names and every literal discriminant value they
  carry (`status`, `sent`, `ok`, `error`, `reason`, and every value string). Paste the per-class
  hit list and report the counts.
- [ ] **Step 2:** write the failing component test over `LoginPage`'s three arms against the new
  discriminant, and watch all three fail.
- [ ] **Step 3:** re-key and rename the four, following every producer and every consumer the
  compiler finds, `LoginPage.svelte`'s three branches and its prop type included, and update
  `KEPT`. Confirm by test that the neutral and send-ok login paths still return the identical
  object and that an unknown contact still yields `outcome: 'sent'`.
- [ ] **Step 4:** update `scripts/checks/check-self-use-allowlist.json`, regenerate the surface
  with `npm run package && node scripts/checks/check-surface.mjs --update`, and commit
  `docs/internal/api-surface.md`.
- [ ] **Step 5:** update the reference pages and extend guides, anchors included, then
  `check:snippets` and `check:docs`.
- [ ] **Step 6:** add the widening clause to `convention-outcome-idiom` and the supersession clause
  to `convention-failure-suffix`; write the supersession Notes on the two auth-channel rows;
  annotate `audit-sveltekit-requestresult` and `audit-sveltekit-revertfailure`.
- [ ] **Step 7:** append the `CHANGELOG.md` entry with its `Consumers must:` line, naming each type
  old to new, the discriminant key change, and every value string that changed, plus the
  migration-notes bullet with the login-form branch spelled out. The full gate, with the paint
  proof below. Commit.

**Acceptance criteria:**
- `RequestOutcome`, `ChannelRequestOutcome`, `ChannelConfirmOutcome`, and `RevertOutcome` exist,
  each discriminating on `outcome` with kebab-case string values, and none of the four old names
  survives outside the classified remaining set.
- **A component test renders `LoginPage` for each of `sent`, `send-error`, and `throttled` and
  asserts the message that arm produces**, and it is named in the report.
- A test asserts that an unknown contact still yields `outcome: 'sent'` on the channel request
  path, and that the login neutral and send-ok paths return identical objects.
- `RequestOutcome` still carries the `sent` boolean field.
- `revertAction`'s HTTP statuses are unchanged, proven by the existing revert suites passing.
- `KEPT` in `src/tests/unit/sveltekit-barrel-prune.test.ts` names `RequestOutcome` and the test
  passes.
- `scripts/checks/check-self-use-allowlist.json` carries the three new names and no old one;
  `scripts/checks/check-surface-leaks.json` is not in the diff.
- `docs/internal/api-surface.md` is in the diff, the plain `check:surface` run is green, and
  `check-surface-leaks` finds no unrecorded leak.
- `check:comments` passes over the two components this task edits, which sit inside the widened
  `.svelte` glob.
- `convention-outcome-idiom` carries a dated clause quoting decision 6 and citing the spec by path
  and date, naming the four types read into scope and stating the kebab value grammar;
  `convention-failure-suffix` carries a dated supersession clause naming its surviving scope and
  `RevertOutcome` as the ruled exception; `check:rulings-format` passes.
- `audit-auth-channelrequestresult` and `audit-auth-channelconfirmresult` each carry a supersession
  Note quoting their own closure text and naming the surviving encoding.
- `audit-sveltekit-requestresult` names `outcome` as the discriminant its any-site case branches
  on.
- `CHANGELOG.md` names every changed key and every changed value string.
- **PAINT: this task takes the paint-neutral branch.** The four committed baselines
  `auth-login-light`, `auth-login-dark`, `auth-confirm-light`, and `auth-confirm-dark` are the
  before set; the unmodified visual suite run is the after; all four must be unchanged, reported by
  name under `MOVED BASELINES: none`, with `git status` clean under both snapshot directories. The
  capture tool's matrix does not include the admin auth surfaces, so there is no `TILE DIFF:` line
  and the report says so. A moved baseline is a STOP-AND-REPORT.

**Commit:** one, `refactor!: put the four discriminated results on the outcome grammar`.

---

## Task 9: `EditorRow` and the `createMediaRoute` record

**Deliverables: three.** The `EditorRow` rename onto an `Omit`, the `createMediaRoute` barrel
sentence, and the ledger annotations with the changelog and migration entries.

**The failing gate first:** replacing the declaration turns `npm run check` red at `findEditor`,
`listEditors`, and every caller, and a fold that left `listEditors`'s result unnameable would turn
`check-surface-leaks` red instead. Those are this task's failing assertions.

**Files:**
- Modify: `src/lib/auth/store.ts:45` (the declaration) and `:52` (`findEditor`'s return), every
  engine caller by grep including `listEditors`, `src/lib/auth-store/index.ts`,
  `src/lib/sveltekit/index.ts:35` (the `createMediaRoute` export line, above which the barrel
  sentence goes; the sweep's F15 cites `:25`, which measures at `:35` today),
  `scripts/checks/check-self-use-allowlist.json` (ONE `EditorRow` entry plus the `RateLimitOutcome`
  entry whose `reason` names it),
  `docs/reference/auth-store.md`, `docs/reference/sveltekit.md`, `docs/reference/media.md`,
  `docs/extend/*.md` (by grep), `docs/internal/api-surface.md` (regenerated),
  `docs/internal/engine-rulings.md` (`audit-auth-editorrow`, `audit-auth-listeditors`,
  `audit-sveltekit-createmediaroute`, `convention-internal-sibling-comment`), `CHANGELOG.md`,
  `docs/extend/migration-notes.md`
- Not modified: `scripts/checks/check-surface-leaks.json` and
  `scripts/checks/check-surface-reexports.json`, neither of which names `EditorRow`
- Test: `src/tests/**` by grep

**Interfaces:**
- Produces: `export type UnresolvedEditor = Omit<Editor, 'capability'>` in `src/lib/auth/store.ts`,
  published on `/auth-store` as `EditorRow` is today. The `Omit` form is what makes the two types
  unable to drift, which F19 names as worth doing on its own.
- Unchanged: `listEditors`'s result stays nameable, which is the condition
  `audit-auth-editorrow`'s keep verdict rests on ("Without the type a consumer cannot declare a
  kept function's result"). `findEditor` still returns `UnresolvedEditor | null`.
- Produces: one sentence in `src/lib/sveltekit/index.ts` recording that `createMediaRoute` is
  singular because it mounts one kit handler and returns a kit `RequestHandler` under the interop
  carve-out. The sentence records the name and the return only; Task 3 already gave the factory a
  config bag, so F15's missing-bag half is closed rather than recorded.
- Changed and disclosed: `docs/internal/api-surface.md`.

**Decisions the plan makes:**
- **`UnresolvedEditor` over `EditorRecord` or `StoredEditor`.** The two types differ on exactly one
  fact, whether the capability has been resolved, and the name that states that fact is the one a
  reader can act on. `StoredEditor` is the defensible alternative and is listed in the names table;
  it is declined because "stored" describes where the value came from rather than what is missing
  from it, and a site holding the value does not care where it came from.
- **`Omit` rather than a hand-written mirror.** The declaration becomes derived, so a member added
  to `Editor` cannot silently miss the store type.
- **The barrel sentence follows `convention-internal-sibling-comment`'s shape** applied to a public
  asymmetry, which is exactly what F15 asked for. The row is progress-noted rather than amended,
  since the ruled shape already covers the case.

**Steps:**
- [ ] **Step 1:** grep and count `EditorRow`, including
  `scripts/checks/check-self-use-allowlist.json` and its lowercase anchor form. Paste the
  per-class hit list. Report the counts.
- [ ] **Step 2:** replace the declaration with `export type UnresolvedEditor = Omit<Editor, 'capability'>`,
  import `Editor` where the file does not already, and follow every caller. Write the type's doc
  comment: what it is, and why the capability is absent.
- [ ] **Step 3:** write the `createMediaRoute` barrel sentence.
- [ ] **Step 4:** update `scripts/checks/check-self-use-allowlist.json`, regenerate the surface
  with `npm run package && node scripts/checks/check-surface.mjs --update`, and commit
  `docs/internal/api-surface.md`. Confirm `check-surface-leaks` finds no unrecorded leak from
  `listEditors`'s result.
- [ ] **Step 5:** update the reference pages and extend guides, anchors included, then
  `check:snippets` and `check:docs`.
- [ ] **Step 6:** append a `- **Note (polish-C, Task 9):**` line to `audit-auth-editorrow`,
  `audit-auth-listeditors`, and `audit-sveltekit-createmediaroute`, and a progress Note to
  `convention-internal-sibling-comment`. Append the `CHANGELOG.md` entry with its `Consumers must:`
  line (one type-import rename) and the migration-notes bullet. The full gate. Commit.

**Acceptance criteria:**
- `UnresolvedEditor` is declared as `Omit<Editor, 'capability'>` and published on `/auth-store`.
- `listEditors`'s and `findEditor`'s results are nameable by an exported type, and
  `check-surface-leaks` reports no unrecorded leak.
- `EditorRow` appears nowhere outside the classified remaining set,
  `scripts/checks/check-self-use-allowlist.json` included.
- `src/lib/sveltekit/index.ts` carries one sentence naming why `createMediaRoute` is singular and
  returns a kit `RequestHandler`.
- `docs/internal/api-surface.md` is in the diff and the plain `check:surface` run is green.
- `check:snippets` and `check:docs` pass.
- Three audit rows carry a `- **Note (polish-C, Task 9):**` line and
  `convention-internal-sibling-comment` carries a progress Note; heading ids unchanged;
  `check:rulings-format` passes.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `refactor!: derive the store editor type from Editor and record createMediaRoute`.

---

## Task 10: Log vocabulary, the six refusal outliers

**Deliverables: three.** The six event renames with every emit site, the events header's two-verb
table, and the six ledger annotations with the changelog and migration entries.

**The failing gate first:** renaming a union member turns `npm run check` red at every emit site
the compiler reaches, and any suite asserting an emitted string goes red with it; `check:symbols`
goes red on `docs/reference/log-events.md`'s rows, which resolve every event name a doc page names
against the source union. Those are this task's failing assertions.

**Files:**
- Modify: `src/lib/log/events.ts` (the header at `:5-7` and six union members), every emitter by
  grep, `docs/reference/log-events.md` (the six rows), `docs/extend/debug-your-site.md`,
  `docs/admin/troubleshooting.md` (only where it names a renamed event),
  `scripts/checks/check-symbols-allowlist.mjs` (only if a renamed event is allowlisted there),
  `docs/internal/engine-rulings.md` (`audit-log-preview-rejected`, `audit-log-guard-rejected`,
  `audit-log-admin-action-csrf-rejected`, `audit-log-auth-access-denied`,
  `audit-log-media-delete-blocked`, `audit-log-media-replace-blocked`), `CHANGELOG.md`,
  `docs/extend/migration-notes.md`
- Test: `src/tests/**` by grep, including any suite asserting an emitted event name
- Not modified: `docs/internal/api-surface.md`. `package.json`'s `exports` has no `./log` subpath,
  so the `CairnLogEvent` union is internal and event names are not exports; the plain
  `check:surface` run proves it
- Reported, never edited: `docs/STATUS.md:95` names `guard.rejected` (constraint 13)

**Interfaces:**
- Produces: six renamed members of `CairnLogEvent`. `preview.rejected` to `preview.refused`
  (`events.ts:30`), `guard.rejected` to `guard.refused` (`:34`), `media.delete_blocked` to
  `media.delete_refused` (`:44`), `media.replace_blocked` to `media.replace_refused` (`:48`),
  `auth.access.denied` to `auth.access.refused` (`:56`), and `admin.action.csrf_rejected` to
  `admin.action.csrf_refused` (`:66`). **Every one of those six line numbers corrects this plan's
  first measurement by one, since the identity-seam pass added two members to the union; locate by
  string.**
- Produces: an events-header verb table stating that `refused` names a policy decision and `failed`
  names a fault, with the test for each.
- Unchanged: every record's field set. This task renames event strings and touches no payload.

**Decisions the plan makes:**
- **The two verbs are the whole vocabulary, and the table states the test rather than the list.**
  F11 charges six strings with sitting outside it. The sweep's prose said "the four outliers" while
  enumerating six; six is the number, and the spec's line 9 says so.
- **The dotted-subject clause is Task 11's, not this task's.** The header gains its verb table
  here and its grammar clause there, so each task writes the half its own renames need.

**Steps:**
- [ ] **Step 1:** grep and count all six old event strings across `src`, `docs`, `examples`,
  `templates`, and `scripts`. Paste the per-class hit list. Report the counts.
- [ ] **Step 2:** rename the six union members and every emit site, then run the unit and
  integration suites to confirm no assertion still names an old string.
- [ ] **Step 3:** write the header's verb table. The table names the two verbs and gives the test
  for each: `refused` for a decision the engine made on policy, `failed` for a fault the engine did
  not choose.
- [ ] **Step 4:** update `docs/reference/log-events.md`'s six rows,
  `docs/extend/debug-your-site.md`, and any `docs/admin/troubleshooting.md` sentence naming a
  renamed event. Run `check:symbols`, `check:docs`, and `check:snippets`.
- [ ] **Step 5:** append a `- **Note (polish-C, Task 10):**` line to the six event rows, each
  naming the new string and stating "verdict unchanged". Locate every row by slug; note that
  `audit-log-media-replace-blocked` sits ABOVE `audit-log-media-delete-blocked` in the file, which
  is the reverse of the order this plan's first measurement recorded.
- [ ] **Step 6:** append the `CHANGELOG.md` entry with its `Consumers must:` line (six event
  strings, old to new, with the note that no in-tree subscriber exists and a site's own subscriber
  switches on the string) and the migration-notes bullet. The full gate. Commit.

**Acceptance criteria:**
- `CairnLogEvent` carries the six new members and none of the six old strings.
- `grep -rnE "preview\.rejected|guard\.rejected|csrf_rejected|auth\.access\.denied|media\.delete_blocked|media\.replace_blocked" src docs examples templates scripts`
  returns only sites classified against constraint 7's table, `docs/STATUS.md` reported and not
  edited.
- `src/lib/log/events.ts`'s header carries a two-verb table giving the test for each verb.
- `docs/reference/log-events.md` has one row per renamed event under its new name.
- `check:symbols`, `check:docs`, and `check:snippets` pass.
- `docs/internal/api-surface.md` is NOT in the diff, and the plain `check:surface` run is green.
- Six event rows carry a `- **Note (polish-C, Task 10):**` line, heading ids unchanged;
  `check:rulings-format` passes.
- `CHANGELOG.md` lists all six event renames old to new.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `refactor(log)!: put the six refusal events on the refused verb`.

---

## Task 11: Log vocabulary, the two area moves and the header grammar

**Deliverables: four.** The taxonomy-to-content move, the audit sink's convergence on one area and
one verb, the header's dotted-subject clause, and the ledger work with the changelog and migration
entries.

**The failing gate first:** the same two reds as Task 10, `npm run check` at the emit sites and
`check:symbols` over `log-events.md`, this time for two strings rather than six.

**Files:**
- Modify: `src/lib/log/events.ts` (the header at `:5-7` and two union members,
  `taxonomy.field_unmarked` at `:24` and `admin.action.sink_threw` at `:72`),
  `src/lib/sveltekit/admin-action.ts:269` (the `sink_threw` emit site), the
  `taxonomy.field_unmarked` emit site by grep, `docs/reference/log-events.md` (the two rows, the
  `audit.sink.write_failed` mention at `:7`, and every cross-reference between the two sink rows at
  `:74` and `:82`), `docs/extend/debug-your-site.md`, `docs/admin/troubleshooting.md` (only where
  it names a renamed event), `docs/internal/engine-rulings.md`
  (`audit-log-taxonomy-unmarked-field` superseded, plus Notes on
  `audit-log-admin-action-sink-threw`, `audit-log-audit-sink-write-failed`,
  `audit-log-auth-channel-session-created`, and a progress Note on
  `convention-identifier-grammar`), `CHANGELOG.md`, `docs/extend/migration-notes.md`
- Not modified: `src/lib/sveltekit/audit-sink.ts`, whose `audit.sink.write_failed` emit at `:122`
  is unchanged; and `docs/internal/api-surface.md`, since event names are not exports
- Test: `src/tests/**` by grep

**Interfaces:**
- Produces: `taxonomy.field_unmarked` becomes `content.field_unmarked`, and
  `admin.action.sink_threw` becomes `audit.sink.call_failed`.
- Unchanged: `audit.sink.write_failed` (`events.ts:74`), which is already the area and the verb the
  sink pair converges on. Unchanged: `auth.channel.session.created` (`:84`) and every other
  four-segment `auth.channel.session.*` name, which the widened header clause admits.
- Produces: a clause in the events header admitting a dotted subject inside
  `area[.subject].verb_phrase`, naming `auth.channel.session.created` as its live case.

**Decisions the plan makes:**
- **The audit sink converges on one area and one verb with two subjects.** F13 charges the pair
  with "the same audit sink under two areas with two verbs", and `threw` appears once in the whole
  union. The area becomes `audit.sink` for both and the verb becomes `failed` for both;
  `admin.action.sink_threw` becomes `audit.sink.call_failed` (the site's own sink threw when
  `ctx.audit` invoked it) and `audit.sink.write_failed` stays (the packaged D1 sink failed to
  persist). The two events describe genuinely different faults, which `log-events.md:74` and `:82`
  already spell out at length, so folding them into one name would destroy a distinction the docs
  work hard to draw. The defensible alternative, renaming `admin.action.sink_threw` to
  `audit.sink.failed` and leaving the write event alone, is declined because it puts the pair on
  two verb phrases where one of them is the generic case of the other.
- **`taxonomy` is the union's only use of that area**, and the sibling event
  `content.field_behavior_failed` already names the right one for the same subsystem.
- **The header grammar is widened, not the name flattened.** F13 offered both;
  `convention-identifier-grammar`'s own 2026-09-01 amendment already declined an analogous tidy on
  the same reasoning ("`rendered` is the area; the clause namespaces by area, not by
  sub-mechanism"). The header sentence becomes explicit that the subject may itself be dotted, so
  `auth.channel.session.*` conforms as written. `convention-identifier-grammar` is progress-noted
  with the widening.
- **`audit-log-taxonomy-unmarked-field` is superseded with its reason.** Its closure text records
  that "an event name is public-observable contract, so both renames ride the one unpublished
  breaking window with a `Consumers must:` line naming them". The supersession Note states that
  this is the second rename of the same identifier inside that same window (the `0.96.0` boundary
  is `CHANGELOG.md:1542`, and both renames sit above it under `## Unreleased`), so a consumer
  crosses one rename, and that the area moves to `content` because the sibling event
  `content.field_behavior_failed` already names that area for the same subsystem.
- **The two unchanged rows are annotated anyway.** `audit-log-audit-sink-write-failed` and
  `audit-log-auth-channel-session-created` keep their strings, but the sink pair's shape and the
  four-segment name's standing both change, so each gains a Note recording what changed around it.
- **`log-events.md` is edited by hand.** There is no generator. `check:symbols` resolves every
  event name a doc page names against the source union, so a missed row fails the gate.

**Steps:**
- [ ] **Step 1:** grep and count both old event strings across `src`, `docs`, `examples`,
  `templates`, and `scripts`. Paste the per-class hit list.
- [ ] **Step 2:** rename the two union members and their emit sites, then run the unit and
  integration suites to confirm no assertion still names an old string.
- [ ] **Step 3:** write the header's dotted-subject clause, stating that the subject segment may
  itself be dotted and naming `auth.channel.session.created` as the live case.
- [ ] **Step 4:** update `docs/reference/log-events.md`'s two rows, its `:7` mention, and every
  cross-reference between the two sink rows so each points at the other under its current name;
  update `docs/extend/debug-your-site.md` and `docs/admin/troubleshooting.md` where either names a
  renamed event. Run `check:symbols`, `check:docs`, and `check:snippets`.
- [ ] **Step 5:** supersede `audit-log-taxonomy-unmarked-field` with its reason; append a
  `- **Note (polish-C, Task 11):**` line to `audit-log-admin-action-sink-threw`,
  `audit-log-audit-sink-write-failed`, and `audit-log-auth-channel-session-created`;
  progress-note `convention-identifier-grammar` with the widening.
- [ ] **Step 6:** append the `CHANGELOG.md` entry with its `Consumers must:` line (two event
  strings, old to new) and the migration-notes bullet. The full gate. Commit.

**Acceptance criteria:**
- `CairnLogEvent` carries `content.field_unmarked` and `audit.sink.call_failed` and neither old
  string.
- `grep -rnE "taxonomy\.field_unmarked|sink_threw" src docs examples templates scripts` returns
  only sites classified against constraint 7's table.
- `src/lib/log/events.ts`'s header carries a sentence admitting a dotted subject, with
  `auth.channel.session.created` named as the clause's live case.
- `docs/reference/log-events.md`'s two audit-sink rows cross-reference each other correctly under
  their current names.
- `check:symbols`, `check:docs`, and `check:snippets` pass.
- `docs/internal/api-surface.md` is NOT in the diff, and the plain `check:surface` run is green.
- `audit-log-taxonomy-unmarked-field` carries a supersession Note naming the same-window reasoning
  and the `content` area's sibling; three further event rows carry a
  `- **Note (polish-C, Task 11):**` line; `convention-identifier-grammar` carries a progress Note;
  `check:rulings-format` passes.
- `CHANGELOG.md` lists both event renames old to new.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `refactor(log)!: move the taxonomy and sink events onto their true areas`.

---

## Task 12: `OfficeList` removed

**Deliverables: four.** The export and the component gone with their test and every in-tree
reference, the reference page and design-system text, the new full-format ruling row superseding
the closed one, and the sheet inventory with the changelog and migration entries.

**Task 1 must have landed first.** If `docs/extend/add-a-custom-admin-screen.md` still names
`OfficeList`, STOP AND REPORT rather than proceeding.

**The failing gate first:** removing the export turns `check:snippets` red on
`docs/reference/admin-toolkit.md:191`, a ```ts fence that imports `OfficeList` from
`@glw907/cairn-cms/admin-toolkit` and is typechecked against the built package, and
`src/tests/unit/admin-sheet-inventory.test.ts` red on the `gap-0` departure. Those two reds are
this task's failing assertions, and both are fixed inside the same commit as the removal so the
gate never observes an intermediate state.

**Files:**
- Delete: `src/lib/admin-toolkit/OfficeList.svelte` and `src/tests/component/OfficeList.test.ts`
  (which exists; the earlier "if one exists" hedge is resolved)
- Modify, the in-tree reference set enumerated rather than described:
  - `src/lib/admin-toolkit/index.ts:42` (the export line) **and `:6`** (the barrel's own component
    roll-call comment, which names `OfficeList` beside `PageHeader` and `AdminTable`)
  - `src/lib/admin-toolkit/PageHeader.svelte:6` and `:63` (two comments naming `OfficeList` as a
    live sibling)
  - `src/lib/audit/rules/rendered/viewport-overflow.ts:20` and
    `src/lib/audit/rules/rendered/weight-budget.ts:58` (two rule comments naming it)
  - **`src/tests/component/PageHeader.test.ts`** at `:7`, `:9`, `:42`, `:43`, `:68`, `:110`, and
    `:112`, one of them the `it(...)` title "zeroes the h1/p UA margins and sets the meta role,
    matching OfficeList". Comments and a test title only, never an assertion
  - **`src/tests/unit/audit/rules/rendered/rulings.weight-budget.test.ts`** at `:6`, `:71`, and
    `:78`, the last an `it(...)` title. Comments and a title only
  - **`src/tests/unit/audit/rules/rendered/browser-regressions.test.ts:512`**, a comment
  - `src/tests/unit/fixtures/admin-sheet-inventory.txt` (**delete the exact line `gap-0` at
    `:236`, leaving `gap-0.5` at `:237`, which is live in `PageHeader`'s own rhythm**), proven by
    `src/tests/unit/admin-sheet-inventory.test.ts`
  - **`docs/reference/admin-toolkit.md`** at `:8` (the subpath's component list), **`:191`** (the
    ```ts barrel-import fence `check:snippets` typechecks), `:613` (`PageHeader`'s own prose, "the
    `OfficeList` shape generalized"), `:635` (the section heading), `:657-661` (the both-stay
    prose), `:663-665` (the `subtitle`-to-`meta` note), and `:667` onward (the ```svelte fence).
    The section and both fences go in this commit
  - **`skills/cairn-admin-screens/references/exemplar-list.md`** (`OfficeList` at `:19`, `:24`,
    `:29`, `:32`, `:34`, `:39`, `:89`, and `:111`, including a live `<OfficeList eyebrow=...>`
    composition fence at `:24-29`) and **`skills/cairn-admin-screens/references/exemplar-detail.md`**
    (`:16` and `:67`). Live agent-facing exemplars under constraint 7's table: a skill that teaches
    a deleted component is the defect the acceptance grep exists to catch. Recompose both on
    `PageHeader` beside `AdminTable`
  - `docs/internal/admin-design-system.md`, **the F3-rhythm bullet at about `:477-480` only**.
    `:451`, `:158-159`, and `:896` describe the concept-list view (`ConceptList`), not this
    component, and are not in the diff
  - `docs/internal/api-surface.md` (regenerated)
  - `docs/internal/engine-rulings.md` (the new row, plus `audit-admin-officelist` superseded and
    `audit-admin-pageheader` and `audit-admin-admintable` annotated)
  - `CHANGELOG.md`
- Not modified, with the reason:
  - `docs/extend/add-a-custom-admin-screen.md` and
    `src/lib/reproductions/stories/CustomScreen.svelte`. Task 1 settled both, and this task's
    acceptance is that neither is in the diff
  - `src/tests/component/reproductions-stories.test.ts`. Task 1 settled its title and its comment
  - `docs/extend/migration-notes.md`'s LIVE `## Unreleased` bullet at about `:129-134`, which
    teaches a consumer to rename `OfficeList`'s `subtitle` prop to `meta`, advice about a component
    this same window deletes. **Task 14 retires it** when it reconciles the whole section, since a
    bullet whose subject two entries later disappears is exactly the merge-across-passes case that
    task owns. This task's own migration bullet carries the replacement composition
  - `docs/STATUS.md:50`, reported and left (constraint 13)
  - `ROADMAP.md`, whose live and historical entries name `OfficeList` at `:347-348`, `:697`,
    `:1026-1033`, and `:1511`. **Task 15 owns the file** under constraint 7's table; this task
    reports the hits
  - `docs/internal/history/**` and `docs/HISTORY.md`, write-once archive and historical entry

**Interfaces:**
- Produces: `/admin-toolkit` no longer exports `OfficeList`. Every other export on the subpath is
  unchanged.
- Produces: a new ruling row in the full format (`Verdict`, `Reopens on`, `Shape`, `Record`,
  `Verified`) superseding the closed `audit-admin-officelist`, with a slug distinct from it so both
  headings survive and both `#`-anchors keep resolving.
- Unchanged: `AdminTable`'s wrapper is the one scroll owner, which it already is
  (`AdminTable.svelte:78` sets `overflow-x: auto` on its own wrapper). This task removes the second
  container rather than adding a first.
- Changed and disclosed: `docs/internal/api-surface.md` loses one `/admin-toolkit` entry, and the
  shipped admin stylesheet loses the `gap-0` rule.

**Decisions the plan makes:**
- **The new row's slug is `officelist-retired-for-one-scroll-owner`**, a new proposal against a
  closed row rather than a reopen, which is the shape `ROADMAP.md` instructed ruling-first and
  which `audit-sveltekit-authroutes`'s annotation model already precedents.
- **The row overrules two sentences in text, by quotation.**
  `src/lib/admin-toolkit/OfficeList.svelte:8-9`'s "both stay: never a duplicate" and
  `docs/reference/admin-toolkit.md`'s "`PageHeader` and `OfficeList` both stay." Both are quoted in
  the row's `Verdict` and overruled with the reason: the component's own card frame and
  `AdminTable`'s wrapper are two scroll containers over one table, which the ratified
  `read-from-the-source-rule` makes a shape defect until argued otherwise, and the replacement is a
  named recipe in the admin's own design system rather than nothing.
- **`gap-0`'s departure is a deliberate, CHANGELOG-carried class removal**, exactly as the
  component's own comment demands. The committed sheet inventory fixture is updated in the same
  commit, by deleting one exact line, and the `Consumers must:` line names the class so a site
  writing `gap-0` in its own admin markup learns it before the upgrade rather than after.
- **The comments and test titles are corrected, not deleted.** Each cites `OfficeList` as an
  example of a shape its rule or its test reasons about; each becomes a citation of the surviving
  example (`AdminTable`'s wrapper, `PageHeader`'s recipe) so the reasoning stays readable. No
  assertion changes in any of the three test files.
- **Consumer reach is named, not estimated.** Measured read-only at plan authoring,
  `aksailingclub-org` imports `OfficeList` from `@glw907/cairn-cms/admin-toolkit` on **eighteen**
  admin screens under `src/routes/admin/club/`, plus `src/tests/announce-list-order.test.ts`. The
  `Consumers must:` line and the migration note therefore carry the full replacement composition,
  not a pointer, so a site's sweep is mechanical.
- **The migration bullet carries the composition as a ```svelte fence.**
  `docs/extend/migration-notes.md` is inside `check-snippets.mjs`'s DOC_DIRS, so a fenced
  composition is typechecked against the built package, which is strictly better than prose. The
  same bullet carries the `gap-0` sentence.

**Steps:**
- [ ] **Step 1:** grep every in-tree reference to `OfficeList` and classify each against the Files
  block above and constraint 7's table. The Files block is measured at plan time; **this grep is
  the authority**, and a path it returns that the block does not name is classified against the
  table or reported as a blocking finding. Report the list and confirm Task 1's three files are not
  on it.
- [ ] **Step 2:** delete the component and its test, remove the export line, and correct the
  barrel comment, the two `PageHeader` comments, the two `cairn-audit` rule comments, and the
  comments and titles in the three test files.
- [ ] **Step 3:** delete the reference section including both its fences and correct `:8` and
  `:613`, in this same commit, so `check:snippets` never sees an intermediate state. Correct the
  design-system F3-rhythm bullet to describe the replacement composition.
- [ ] **Step 4:** run the admin sheet build (`scripts/build/update-admin-sheet-inventory.mjs`) and
  update the committed inventory fixture for the `gap-0` departure. Report the exact diff, which
  must be the single line `gap-0` at `:236` and nothing else.
- [ ] **Step 5:** regenerate the surface with
  `npm run package && node scripts/checks/check-surface.mjs --update` and commit
  `docs/internal/api-surface.md`. Run `check:snippets`, `check:admin-css-classes`, and
  `check:custom-surface`.
- [ ] **Step 6:** write the new full-format ruling row; append a supersession Note to
  `audit-admin-officelist` pointing at it; annotate `audit-admin-pageheader` and
  `audit-admin-admintable` with the scroll-ownership settlement.
- [ ] **Step 7:** append the `CHANGELOG.md` entry with its `Consumers must:` line, carrying the
  full replacement composition and naming the `gap-0` removal, plus the matching migration-notes
  bullet with the composition as a ```svelte fence. The full gate. Commit.

**Acceptance criteria:**
- `src/lib/admin-toolkit/OfficeList.svelte` and `src/tests/component/OfficeList.test.ts` do not
  exist, and `src/lib/admin-toolkit/index.ts` neither exports nor names `OfficeList`.
- `grep -rn "OfficeList" src docs examples templates packages scripts skills ROADMAP.md` returns
  only `docs/internal/history/**`, `docs/HISTORY.md`, `CHANGELOG.md`, historical ruling fields,
  `docs/STATUS.md` (reported, not edited), `ROADMAP.md` (reported, Task 15's), and
  `docs/extend/migration-notes.md`'s live bullet (Task 14's), each classified in the report.
- `docs/extend/add-a-custom-admin-screen.md`, `src/lib/reproductions/stories/CustomScreen.svelte`,
  and `src/tests/component/reproductions-stories.test.ts` are NOT in the diff.
- `docs/reference/admin-toolkit.md` has no `OfficeList` section, no `OfficeList` fence, and no
  `OfficeList` occurrence at `:8` or `:613`, all deleted or corrected in the same commit as the
  export removal.
- The three test files change comments and test titles only; the report names every assertion it
  did NOT change.
- `src/tests/unit/admin-sheet-inventory.test.ts` passes against an updated fixture whose only
  change is the deletion of the exact line `gap-0`, with `gap-0.5` still present, and the report
  names that diff exactly.
- `check:admin-css-classes`, `check:custom-surface`, and `check:snippets` pass.
- `docs/internal/api-surface.md` is in the diff, loses exactly one `/admin-toolkit` entry, and the
  plain `check:surface` run is green.
- A new ruling row exists in the full format with all five labeled lines, quoting and overruling
  both both-stay sentences; `audit-admin-officelist` keeps its heading id and gains a supersession
  Note; `audit-admin-pageheader` and `audit-admin-admintable` carry annotations;
  `check:rulings-format` passes.
- `CHANGELOG.md`'s `Consumers must:` line carries the replacement composition verbatim and names
  the `gap-0` class removal, and the migration-notes bullet carries the composition as a typechecked
  ```svelte fence.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`, with `git status`
  clean under both snapshot directories.

**Commit:** one, `refactor(admin-toolkit)!: retire OfficeList and leave AdminTable the one scroll owner`.

**Checkpoint after this task.** The conductor writes STATUS. The window is complete in code.

---

## Task 13: The ledger

**Deliverables: four.** Every row this window renames verified annotated, any row a previous task
missed annotated here, `f1-return-position-leak-sanction` closed and the header's allowlist count
corrected, and the changelog entry.

**The failing gate first:** Step 1's verification grep IS this task's failing assertion. It is run
before anything is written and it fails the moment it returns a row with no polish-C Note, which is
what the task exists to fix. `check:rulings-format` is the gate that proves the repairs.

**Files:**
- Modify: `docs/internal/engine-rulings.md` (the header's allowlist sentence at `:26`,
  `f1-return-position-leak-sanction`'s `Reopens on:` at about `:124-126`, and any row a previous
  task missed), `CHANGELOG.md`

**Interfaces:** none. This task changes no code and no public surface.

**Decisions the plan makes:**
- **The population is DERIVED by the gated grep, not pinned to a number.** The enumeration below
  exists so the grep can be checked complete, and a disagreement between the two is resolved in the
  grep's favor and reported. This is the spec's own instruction for the ledger task ("the
  population is enumerated at plan time by the gated grep rather than pinned to a number").
- **The enumeration is this plan's own derivation.** The charter review at
  `spec-review-rev3-charter.md` does not carry a slug list; its finding 19 is about the cut being
  made conditional, and no slug appears anywhere in that file. The seventeen-row list below is
  derived here, by reading the ledger for every row whose subject this window renames, and each of
  the seventeen resolves as a `## <slug>:` heading. The spec's rule the derivation answers to is
  "every row naming a renamed symbol or event, enumerated at plan time".
- **Forty-nine rows, plus the one new row Task 12 wrote.** Four groups:
  - **Seventeen type-and-function rows**: `audit-adapter-serializemanifest`,
    `audit-adapter-fieldsetoptions`, `audit-adapter-rendereroptions`, `audit-adapter-githubapp`,
    `audit-delivery-deriveexcerpt`, `audit-sveltekit-authguardoptions`,
    `audit-sveltekit-navloaddata`, `audit-sveltekit-vocabularyloaddata`,
    `audit-sveltekit-requestresult`, `audit-sveltekit-adminaction`, `audit-sveltekit-previewload`,
    `audit-sveltekit-healthload`, `audit-sveltekit-revertfailure`, `audit-auth-cookiename`,
    `audit-auth-editorrow`, `audit-auth-channelrequestresult`, and
    `audit-auth-channelconfirmresult`. Tasks 4 through 9 annotate them.
  - **Nine event rows**, which no type-and-function list reaches, named by the spec:
    `audit-log-preview-rejected`, `audit-log-guard-rejected`,
    `audit-log-admin-action-csrf-rejected`, `audit-log-auth-access-denied`,
    `audit-log-media-delete-blocked`, `audit-log-media-replace-blocked`,
    `audit-log-admin-action-sink-threw`, `audit-log-audit-sink-write-failed`, and
    `audit-log-auth-channel-session-created`. Tasks 10 and 11 annotate them.
  - **Sixteen further audit rows** neither list reaches:
    `audit-delivery-newlypublishedentries`, `audit-delivery-parsemanifest`,
    `audit-auth-listeditors`, `audit-sveltekit-adminactionoptions`,
    `audit-sveltekit-mintpreviewtoken`, `audit-sveltekit-createcontentroutes`,
    `audit-sveltekit-createcairnadmin`, `audit-sveltekit-createnavroutes`,
    `audit-sveltekit-createmediaroute`, `audit-sveltekit-contentroutesoptions`,
    `audit-sveltekit-cairnadminoptions`, `audit-sveltekit-navroutes`,
    `audit-log-taxonomy-unmarked-field`, `audit-admin-officelist`, `audit-admin-pageheader`, and
    `audit-admin-admintable`. The last two are Task 12's scroll-ownership annotations, which the
    first three groups miss. `audit-sveltekit-contentroutesoptions` and
    `audit-sveltekit-cairnadminoptions` are Task 2's Step 6 Notes and `audit-sveltekit-navroutes`
    is Task 3's Step 5 Note; their subjects (`ContentRoutesOptions`, `CairnAdminOptions`,
    `NavRoutes`) are route types the arity change reshapes, not renamed identifiers, so **no grep
    over the thirty reaches them**.
  - **Seven conventions rows** the pass amends or progress-notes: `convention-parameter-bags`
    (Tasks 2 and 4), `convention-verb-rules` (Task 5), `convention-bare-noun-functions` (Task 7),
    `convention-outcome-idiom` and `convention-failure-suffix` (Task 8),
    `convention-internal-sibling-comment` (Task 9), and `convention-identifier-grammar` (Task 11).
- **`f1-return-position-leak-sanction` closes against the rider's row.** Its `Reopens on:` reads
  "open until the leak-class `check:surface` rider lands in the internals pass". The rider landed
  and has its own accept row, `check-surface-leaks` (`engine-rulings.md:5104`), wired into
  `check:surface` through `package.json`. The line becomes closed, naming the rider's slug and the
  wiring, and stating that the rider supersedes the retires pass's manual move record as the leak
  ledger, which the sanction's own `Shape:` line already anticipates.
- **The header's allowlist count is corrected against the file, not from memory.**
  `engine-rulings.md:26` claims "The remaining 40 stay truncated and allowlisted"; the allowlist
  holds one slug today. The sentence is rewritten to name the current count and to say that later
  slices removed the rest as they executed, so a reader is not sent to a list of forty that does
  not exist.

**Steps:**
- [ ] **Step 1:** run the verification grep, in two halves. For each of the thirty renamed or
  removed identifiers, `grep -n "<old name>" docs/internal/engine-rulings.md` and confirm every row
  a hit sits under carries a `- **Note (polish-C, Task N):**` line, a supersession Note, or a
  progress Note. Then, because the identifier grep reaches no row named for a factory or a route
  type, run `grep -n "^## <slug>" docs/internal/engine-rulings.md` for **every slug the four groups
  below name and for Task 12's new row**, and confirm the same Note on each: the seven
  `create*`-factory and route-type rows the arity change touches
  (`audit-sveltekit-createcontentroutes`, `audit-sveltekit-createcairnadmin`,
  `audit-sveltekit-createnavroutes`, `audit-sveltekit-createmediaroute`,
  `audit-sveltekit-contentroutesoptions`, `audit-sveltekit-cairnadminoptions`, and
  `audit-sveltekit-navroutes`) are reachable no other way. Report the row heading for every hit,
  and report any row the enumeration above names that neither grep reaches, and any row either grep
  reaches that the enumeration does not name.
- [ ] **Step 2:** annotate, in this commit and in the same format, any row a previous task missed.
  Report which task should have carried each.
- [ ] **Step 3:** close `f1-return-position-leak-sanction` against `check-surface-leaks`.
- [ ] **Step 4:** correct the header's allowlist sentence against
  `scripts/checks/check-rulings-format-allowlist.json`.
- [ ] **Step 5:** append the `CHANGELOG.md` entry (the ledger annotated across the window; no
  `Consumers must:` line, since nothing shipped changes). The full gate, with
  `check:rulings-format` green. Commit.

**Acceptance criteria:**
- Every one of the thirty old identifiers, greped across `docs/internal/engine-rulings.md`,
  resolves to rows that each carry a polish-C Note, and the report lists every hit with its row
  heading.
- The forty-nine rows the four groups name are each confirmed present with a Note, by heading, in
  the report, including the three rows Tasks 2 and 3 annotate that the identifier grep cannot
  reach, and the report reconciles both greps against the enumeration in both directions.
- Task 12's new row exists and is counted separately from the forty-nine.
- `f1-return-position-leak-sanction`'s `Reopens on:` reads closed and names `check-surface-leaks`
  and the `package.json` wiring.
- `docs/internal/engine-rulings.md:26`'s allowlist sentence matches
  `scripts/checks/check-rulings-format-allowlist.json`'s actual contents.
- `check:rulings-format` passes and no heading id changed anywhere in the diff.
- No file outside `docs/internal/engine-rulings.md` and `CHANGELOG.md` is in the diff.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `docs(rulings): annotate every row this window renames and close the leak sanction`.

---

## Task 14: The consumer list reconciled

**Deliverables: four.** The window-wide old-name sweep with the live internal docs it owns, the
migration-notes `## Unreleased` section reconciled against the whole changelog window, the four
consumer sites' upgrade order stated, and the final surface and snippet proof.

**The failing gate first:** Step 1's tree-wide sweep IS this task's failing assertion, on the same
model as Task 13: it is run before anything is written and it fails on the first unclassified hit.
`check:docs` and `check:snippets` are the gates that prove the repairs.

**Files:**
- Modify: `docs/extend/migration-notes.md` (the whole `## Unreleased` section from `:12` to the
  `## 0.96.0` heading), the live internal docs the sweep returns, which are measured at plan
  authoring as `docs/internal/pre-beta-harvest.md` (`createCairnAdmin`, `githubApp` twice,
  `RendererOptions` twice), `docs/internal/engine-harvest-candidates.md` (`adminAction` twice),
  `docs/internal/code-idioms.md` (`createNavRoutes`, `createContentRoutes`), and
  `docs/internal/src-lib-map.md` (`createCairnAdmin`), plus whatever else its own grep returns;
  `docs/internal/api-surface.md` (only if the sweep finds a residual); `CHANGELOG.md`
- Read: `CHANGELOG.md:1` through the `## 0.96.0` heading, every `Consumers must:` line in it
- Reported, never edited: `docs/STATUS.md` (constraint 13). Its `OfficeList` and `guard.rejected`
  hits are the conductor's to repair at merge, and the report names them so the conductor knows

**Interfaces:** none. This task changes no code.

**Decisions the plan makes:**
- **The sweep set is the thirty identifiers, not "thirty plus two".** `EditorRow` is one of the
  eleven types and `OfficeList` is the one component, both already inside the thirty.
- **The live internal docs are this task's, and the archives are nobody's.** Constraint 7's table
  splits them: `docs/internal/history/`, `docs/internal/design/`, and `docs/internal/feedback/` are
  write-once and are classified and left; the four live internal docs above describe the engine as
  it is and are corrected here, where one task can see the whole set rather than each renaming task
  guessing at its share.
- **The `OfficeList` `subtitle`-to-`meta` bullet is retired, not carried.**
  `docs/extend/migration-notes.md`'s live `## Unreleased` section teaches a consumer to rename a
  prop on a component this same unpublished window deletes. It is the clearest case of the
  merge-across-passes rule this task already carries: a consumer upgrading from `0.96.0` never sees
  the component, so the bullet is removed and Task 12's replacement-composition bullet stands in
  its place.
- **The migration-notes section is reconciled against the WHOLE window, not this pass's entries.**
  A site upgrading from `0.96.0` reads every `Consumers must:` line since that tag, measured at 67
  occurrences over 1,541 lines at plan authoring and expected to drift with every merge. The
  section is rewritten so that every actionable line in the window has a bullet, and so that
  bullets from different passes describing one consumer action are merged into one bullet rather
  than repeated.
- **The four sites are named with their files and their order.** Measured read-only at plan
  authoring against the sibling repos, so the plan states them and the executor re-verifies nothing
  in those repos (polish-C edits no site):

  | Site | Files the window touches | Notes |
  |---|---|---|
  | `ecxc-ski` (`^0.95.0`) | `src/chassis/cairn.server.ts` (`createCairnAdmin`), `src/routes/media/[...path]/+server.ts` (`createMediaRoute`), `src/routes/healthz/+server.ts` (`healthLoad`), `src/theme/cairn.config.ts` (`githubApp`) | Four files. No `OfficeList`, no renamed type import |
  | `907-life` (`^0.84.4`) | `src/chassis/cairn.server.ts`, `src/routes/media/[...path]/+server.ts`, `src/routes/healthz/+server.ts`, `src/theme/cairn.config.ts` | Four files, the same four calls. It crosses the widest version gap, so it reads more of the window than the others |
  | `aksailingclub-org` (`^0.96.0`) | `src/chassis/cairn.server.ts`, `src/routes/media/[...path]/+server.ts`, `src/tests/adapter.test.ts` (`createContentRoutes`), `src/routes/healthz/+server.ts`, `src/theme/cairn.config.ts`, `src/routes/(site)/preview/[token]/+page.server.ts` (`previewLoad`), `src/member-auth/lib/crypto.ts` (`cookieName`), `src/admin-club/lib/announcements.ts` and `src/routes/(site)/events/[id]/+page.server.ts` (`deriveExcerpt`), and **eighteen** `src/routes/admin/club/**/+page.svelte` files importing `OfficeList`, plus `src/tests/announce-list-order.test.ts` | The heaviest by far, and the only site the `OfficeList` removal reaches. It upgrades last |
  | `xcathletes-org` (`^0.96.0`, plus `@glw907/cairn-cms-dev` `^0.96.0`) | `src/chassis/cairn.server.ts`, `src/routes/media/[...path]/+server.ts`, `src/routes/healthz/+server.ts`, `src/theme/cairn.config.ts`, `src/routes/(site)/preview/[token]/+page.server.ts` | Five files. It is the one site on the dev package, and it calls `devBackendHandle()` bare today with no type annotation, so `DevBackendConfig` reaches it only if it starts annotating |

- **The stated order is `ecxc-ski`, `907-life`, `xcathletes-org`, `aksailingclub-org`.** The first
  three are four or five mechanical call-site edits each; the fourth carries the `OfficeList`
  sweep across eighteen screens and is the only one needing a composition change rather than a
  rename. Ordering it last means three sites prove the rename set before the one site with real
  work starts.
- **This pass edits no site.** The `Consumers must:` lines and the migration notes are the
  deliverable; each site's upgrade is its own pass. The conductor names the four sites' upgrade in
  STATUS at merge.

**Steps:**
- [ ] **Step 1:** sweep the whole tree for all thirty old identifiers, plus the lowercase anchor
  form of each, excluding the three write-once archive trees. Classify every remaining hit against
  constraint 7's table and fix every defect in this commit, the live internal docs included. Report
  the classification per hit, and report `docs/STATUS.md`'s hits for the conductor without editing
  the file.
- [ ] **Step 2:** prove no historical `CHANGELOG.md` anchor still points at a heading this window
  renamed, which is constraint 16's standing check, and repair any the renaming tasks missed.
- [ ] **Step 3:** read every `Consumers must:` line in `CHANGELOG.md` from `## Unreleased` down to
  the `## 0.96.0` heading. Report the count you measure and, for each line, whether
  `docs/extend/migration-notes.md`'s `## Unreleased` section already carries a bullet for it.
- [ ] **Step 4:** rewrite the migration-notes `## Unreleased` section so every actionable line has
  exactly one bullet, merging duplicates across passes, retiring the `OfficeList`
  `subtitle`-to-`meta` bullet, and adding the site order and the per-site file lists as a closing
  subsection.
- [ ] **Step 5:** regenerate the surface with
  `npm run package && node scripts/checks/check-surface.mjs --update` if and only if Step 1 found a
  residual, and run `check:snippets` against the built package as the final proof that no doc fence
  names a dead symbol.
- [ ] **Step 6:** append the `CHANGELOG.md` entry (the migration notes reconciled for the whole
  window). The full gate, with `check:docs`, `check:vale`, `check:symbols`, and `check:snippets`
  green. Commit.

**Acceptance criteria:**
- The sweep report classifies every remaining hit for all thirty names, and no hit is
  unclassified.
- The four live internal docs named above carry no dead name, and each edit is named in the report.
- `docs/STATUS.md` is not in the diff, and its hits are reported for the conductor.
- No historical `CHANGELOG.md` anchor points at a heading this window renamed, and `check:docs`
  passes.
- `docs/extend/migration-notes.md`'s `## Unreleased` section carries one bullet per actionable
  `Consumers must:` line in the whole window since `0.96.0`, with the count reported and matched,
  and no longer carries the `OfficeList` `subtitle`-to-`meta` bullet.
- The section names the four sites, their files, and the upgrade order.
- `check:snippets` passes against the built package and `check:symbols` passes.
- `docs/internal/api-surface.md` is either absent from the diff or in it with the residual named in
  the report.
- No file under `src/` changes in this task unless the sweep found a defect, and each such change
  is named in the report.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `docs(extend): reconcile the migration notes against the whole unreleased window`.

**Checkpoint after this task.** The conductor writes STATUS immediately before the
release-readiness task.

---

## Task 15: Records and the release readiness (last)

**Deliverables: four.** The finalized `## Unreleased` changelog entry for the whole window, the
release-notes draft with the version derivation, the HISTORY entry with the ROADMAP close and the
friction-log triage, and the post-mortem inputs the task can see.

**This task runs on Opus.** Its deliverable is synthesis rather than mechanical change: a
1,541-line window reconciled, a bump size derived against a quoted rule with a disagreement
reported, a ROADMAP initiative closed while distinguishing sub-bullets that shipped from ones that
did not, and the HISTORY entry a later pass reads instead of rediscovering. Its args entry carries
`"model": "opus"`, which `pass-execute-chains.js` passes through to the implementer dispatch.

**The failing gate first:** `check:version` is the gate that reads `CHANGELOG.md:3`'s
`<!-- release-size: minor -->` marker against the `## Unreleased` block, and `check:docs` and
`check:vale` are the gates over everything this task writes. Nothing here changes behavior, so
those gates discharge the clause.

**Files:**
- Create: `docs/internal/record/2026-09-08-polish-inputs/release-notes-draft.md`
- Modify: `CHANGELOG.md` (a final read and any repair of the `## Unreleased` block; the heading
  itself is NOT renamed and `package.json` is NOT touched), `docs/HISTORY.md` (the polish-C entry,
  newest first, as slice 12), `ROADMAP.md` (the audit-remediation entry closed and removed from the
  live tier, plus one new follow-up line, below, plus the live tier lines that name a symbol this
  window renamed, which earlier tasks report and this task repairs under constraint 7's table; a
  struck-through or historical line stays verbatim), `docs/internal/docs-friction-log.md` (verified
  still empty, or triaged), `docs/superpowers/plans/2026-09-08-polish-c-pass.md` (the Post-mortem
  heading)
- Not modified: `package.json`, `docs/STATUS.md`

**Interfaces:** none.

**Decisions the plan makes:**
- **The budget numbers are the conductor's, not this task's.** Per-task token spend, the planning-
  miss count, and the execution-sitting count exist only in the conductor's session; an implementer
  sees one task. This task writes the post-mortem ledger with the per-task evidence it CAN see
  (commits, gate results, decisions no plan section specified) and leaves the two budget counts and
  the spend against the 9M ceiling to the conductor's close-out records agent, saying so in the
  file it writes.
- **The held-pass list comes from `docs/HISTORY.md`, not from the changelog's shape.** The window
  `CHANGELOG.md:1-1541` contains exactly one `##` heading and five `###` subsections (`Added`,
  `Changed`, `Documentation`, `Fixed`, `Removed`); there are no per-pass sections in it, so the
  `cairn-release` skill's "summarizes EACH held section" cannot be read literally here. The draft
  carries one paragraph per `docs/HISTORY.md` entry since the `0.96.0` cut, plus every
  `Consumers must:` line in the window, gathered from the five `###` subsections.
- **The release-notes draft is a draft, and the conductor re-derives at the cut.**
  `~/.claude/skills/cairn-release/SKILL.md` is explicit: *"Derive the size HERE, at the cut,
  against this rule and the actual `## Unreleased` window, never inherit it from the
  conversation."* This task's derivation is an input to that step, recorded so the conductor is not
  starting from nothing, and the draft says so in its own first paragraph.
- **The bump rule, quoted from the skill:** *"In `0.x` a minor (`0.X.0`) is reserved for a NEW
  SUBSYSTEM OR PUBLIC SURFACE that did not exist before; everything else (refinement, fix, DX,
  internal, even new optional exports on an existing surface) is a patch."* The derivation this
  task records tests the window against exactly that sentence and names the evidence for its
  answer. `CHANGELOG.md:3` already carries `<!-- release-size: minor -->`, which `check:version`
  requires of a minor, so the task's derivation either confirms that marker or reports that the
  marker and the derived size disagree. It does not change the marker on its own reading; a
  disagreement is a conductor decision at the cut.
- **The free number is verified, not assumed.** `npm view @glw907/cairn-cms versions --json`
  returns the full list; every number through `0.96.0` is taken and every sub-`0.68` number is
  burned by the pre-rebuild history. The task records the command's output tail and the first free
  number it implies. Measured at plan authoring, the highest published version is `0.96.0`.
- **Two smaller `cairn-release` items the draft carries.** The skill's section 4 orders a
  per-version entry in `docs/guides/upgrade-cairn.md`, which does not exist in this repo; one
  sentence in the draft saying `docs/extend/migration-notes.md` supersedes it saves the conductor a
  hunt at the cut. And the skill's Tailwind gotcha grep
  (`grep -rnE '[a-z-]+-\[[^]]*(\||\*|\.\.\.)[^]]*\]' docs/ CHANGELOG.md ROADMAP.md`) runs in Step 1,
  since this pass writes fifteen changelog entries carrying admin class names and the failure mode
  is a broken `npm run package`.
- **One follow-up line is filed, not fixed.** `package.json`'s `check:surface` script chains two
  commands, so `npm run check:surface -- --update` sends the flag to the wrong one, and the
  script's own banner (`check-surface.mjs:22`) and `docs/internal/README.md:31` still print the
  pre-rider single-command form. That is a non-breaking fix, and the spec's Polish-C shape rules
  that "a non-breaking fix found during C goes to a follow-up line, never into the window", so this
  task files it to `ROADMAP.md` with the evidence rather than repairing it here.
- **The ROADMAP audit-remediation entry closes here.** It opens at about `:284` and its polish
  sub-bullet runs about `:340-365`; both 11a's and 11b's records tasks closed the sub-bullets their
  passes shipped, so this task closes what polish-C shipped and then closes the initiative entry
  itself, removing it from the live tier. Any sub-bullet neither pass shipped is reported rather
  than closed, and the report names it.
- **The friction log is triaged whole, complete-or-move, not appended to.** Both live sections read
  "None open." at plan authoring; this task re-reads them and triages anything a polish-C task
  filed, in this commit. The Clearings table below them is a historical record and is left alone.
- **STATUS is the conductor's.** This task does not write `docs/STATUS.md`, and its acceptance
  includes that the file is absent from the diff.

**Steps:**
- [ ] **Step 1:** read the whole `## Unreleased` block from `CHANGELOG.md:1` to the `## 0.96.0`
  heading. Confirm every polish-C task's entry is present and that every breaking one carries a
  `Consumers must:` line. Report the total `Consumers must:` count you measure for the window and
  the count polish-C itself contributed. Run the Tailwind gotcha grep over `docs/`, `CHANGELOG.md`,
  and `ROADMAP.md`. Repair a missing or malformed entry in this commit; do NOT rename the
  `## Unreleased` heading and do NOT touch `package.json`.
- [ ] **Step 2:** run `npm view @glw907/cairn-cms versions --json` and record its tail. Derive the
  bump size against the skill's rule, quoted in the draft, naming the evidence: what in the window
  is a new subsystem or public surface that did not exist before, and what is refinement. Record
  whether the derived size agrees with `CHANGELOG.md:3`'s existing marker.
- [ ] **Step 3:** write
  `docs/internal/record/2026-09-08-polish-inputs/release-notes-draft.md`: the rolled window since
  `0.96.0` with one paragraph per `docs/HISTORY.md` entry in it, every `Consumers must:` line from
  the breaking sections, the free number, the derived size with its derivation, the
  `upgrade-cairn.md` supersession sentence, and a first paragraph stating that the conductor
  re-derives at the cut through `cairn-release`. Re-read the reproduction stories and their
  captions that Tasks 1 and 12 touched, which the skill's admin-surface step asks for, and record
  that read.
- [ ] **Step 4:** write the `docs/HISTORY.md` entry for polish-C as slice 12: what landed, what the
  gate caught, and what a later pass would be wrong to rediscover from scratch. Close ROADMAP's
  audit-remediation entry and remove it from the live tier, reporting any sub-bullet no pass
  shipped, and file the `check:surface` script follow-up line. Re-read both live friction-log
  sections and record them empty or triage what is there.
- [ ] **Step 5:** the post-mortem inputs: the task ledger with each task's commits, gate results,
  and any decision a task made that this plan did not specify, written under the Post-mortem
  heading of this plan file so the `cairn-pass` ritual has them. State in the file that the token
  spend, the spend against the 9M ceiling, the planning-miss count, and the execution-sitting count
  are the conductor's to fill at the close.
- [ ] **Step 6:** the full gate, with `check:docs`, `check:vale`, `check:version`,
  `check:rulings-format`, and `check:snippets` green. Commit.

**Acceptance criteria:**
- `CHANGELOG.md`'s `## Unreleased` block carries an entry from each of Tasks 1 through 14, every
  breaking one carries a `Consumers must:` line, and the report states the window's total count as
  measured.
- `CHANGELOG.md`'s heading still reads `## Unreleased`, `package.json` is not in the diff,
  `git tag --points-at HEAD` is empty, and no release exists.
- `docs/internal/record/2026-09-08-polish-inputs/release-notes-draft.md` exists, quotes the
  skill's bump rule, carries one paragraph per HISTORY entry in the window, names the verified free
  number with the command output that proves it, states the derived size with its evidence, records
  whether it agrees with the existing `<!-- release-size: minor -->` marker, carries the
  `upgrade-cairn.md` supersession sentence, and opens by saying the conductor re-derives at the cut.
- The Tailwind gotcha grep returns nothing, or every hit is named and repaired.
- `docs/HISTORY.md` carries a polish-C entry naming slice 12.
- `ROADMAP.md` no longer lists the any-site audit remediation in a live tier, the report names any
  sub-bullet closed without a pass having shipped it, and the `check:surface` script follow-up line
  is filed with its evidence.
- `docs/internal/docs-friction-log.md` has no untriaged entry in either live section.
- The Post-mortem heading of this plan carries the task ledger and the decisions taken outside the
  plan, and states that the budget numbers are the conductor's.
- `docs/STATUS.md` is not in the diff.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `docs: close polish-C's records and draft the release readiness`.

---

## Gate

Run this exact string at the end of every task, in the worktree, with nothing else bound to port
4173.

```
npm run package && npm run check && npm test && publint --strict && attw --pack . --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error && node scripts/checks/check-package-files.mjs && node scripts/checks/check-skill-budget.mjs && node scripts/checks/reference-coverage.mjs && node scripts/checks/check-reference-signatures.mjs && node scripts/checks/check-surface.mjs && node scripts/checks/check-surface-leaks.mjs && node scripts/checks/check-self-use.mjs && node scripts/checks/check-custom-surface.mjs && npm run check:chassis-boundary && npm run check:cm-internals && npm run check:idioms && node scripts/checks/check-invisible-craft.mjs && node scripts/checks/check-admin-css-classes.mjs && node scripts/checks/check-readiness.mjs && npm run check:docs && npm run check:rulings-format && npm run check:target-stack && npm run check:arm-indexes && npm run check:editor-quotes && node scripts/checks/check-visuals.mjs && npm run check:transcripts && npm run check:symbols && node scripts/checks/check-snippets.mjs && npm run check:prose && npm run check:version && npm run check:dev-package && npm run check:template && node scripts/checks/check-consumers.mjs && npm run test:emit && npm --prefix packages/create-cairn-site run prepack && npm --prefix packages/create-cairn-site test && npm --prefix examples/showcase run check && npm --prefix examples/showcase run test:unit && npm --prefix examples/showcase run format:check && npm run check:vale && npm run check:comments && CI=1 npm --prefix examples/showcase run test:e2e
```

**It is the CI-derived list, not a shorter one.** The list is derived from the committed
`.github/workflows/` at `0705776e` and includes the six CI-only gates a local ritual skips
(`check:comments`, `check:surface`, `check:snippets`, `check:transcripts`, `check:symbols`,
`check:reference:signatures`), plus `check:rulings-format`, which the spec names explicitly because
it is in neither `npm run check` nor `npm test` and is the only gate over `engine-rulings.md`. No
check is dropped for cost; the spec forecloses that.

Per the spec's 2026-09-09 amendment ("The gate, all three passes"), the per-task gate for a
paint-neutral task is the fence's string with the trailing
`&& CI=1 npm --prefix examples/showcase run test:e2e` removed. Task 8, this plan's one paint task
(it carries the capture pair proving the AE-0 floor-free result), runs the full fence string
unchanged. Every other task (1-7, 9-15) is paint-neutral and drops the e2e clause. The pass-end
ritual runs the full string regardless.

**Package once, at the head.** Twelve of the npm scripts in the derived list chain
`npm run package` as a prerequisite (`check:package`, `check:reference`,
`check:reference:signatures`, `check:surface`, `check:self-use`, `check:custom-surface`,
`check:invisible-craft`, `check:admin-css-classes`, `check:readiness`, `check:visuals`,
`check:snippets`, `check:consumers`), so calling them through their wrappers would build the
package thirteen times per run. The string above runs `npm run package` ONCE at the head and
invokes each dependent check at its node entry point, in the derived order, against the same
artifact. Every check still runs, and `check:snippets` therefore runs against the built package,
which is a per-task requirement of this pass rather than an incidental property.

**Two additions on top of the derived list, both specific to polish-C.**

1. **`npm run package && node scripts/checks/check-surface.mjs --update` on every task that changes
   the public surface**, with the regenerated `docs/internal/api-surface.md` committed in the SAME
   commit as the code change. **Not `npm run check:surface -- --update`**, which sends the flag to
   `check-surface-leaks.mjs` and leaves `check-surface.mjs` in plain mode; see constraint 5 and the
   Corrections block. Tasks 2, 3, 4, 5, 6, 7, 8, 9, and 12 all change the surface; Tasks 1, 10, 11,
   13, 14, and 15 do not, and their acceptance is that `api-surface.md` stays out of the diff. After
   the regeneration the plain `node scripts/checks/check-surface.mjs` in the string above must pass,
   which is what proves the snapshot matches the build rather than the author's intent.
   `check-surface.mjs` also enforces the canonical-home rule before the snapshot diff, so a
   re-homing (Task 5's `parseManifest`) needs its `scripts/checks/check-surface-reexports.json`
   entry in the same commit or the gate fails on the home rule rather than the diff.
2. **`node scripts/checks/check-snippets.mjs` against the built package, every task.** It is
   already in the string. A task that removes or renames a documented export must delete or update
   its doc fence in the same commit, so the gate never observes an intermediate state.

`npm run check` must report 0 errors and 0 warnings, and `npm test` must exit 0; both are the floor
rather than the whole gate. `npm test` already runs the component suite, so no task claims to add
it. The CLI suite and `check:template` run per task, because a rename can carry pinned text
(chassis-A's lesson, and Task 6's `finalize.mjs` literal is this pass's live case).

**Expected wall clock per gate: 16 to 28 minutes**, on 11a's derivation of the same string. Fifteen
of them is three and a half to seven hours of gate time alone, before implementer and reviewer
turns and before any fix round, which is why pre-dispatch precondition 5 arms the unattended-work
guards. The executor times its own first gate and reports the actual figure.

**Left to CI, deliberately.** `design.yml` (`check:public-tokens`, `test:reskin`, the styleguide
e2e), `norms.yml` (`norms:check`), `scaffold.yml` and `create-site.yml` (the packed-tarball
scaffold proofs), `tsgo.yml` (`svelte-check --tsgo`), and `publish.yml`. None of them is skipped as
unimportant; each needs a clean checkout, a browser matrix, or a full pack that a per-task local
loop cannot afford, and the PR's own CI run is the gate that clears them. **The scaffold proof
against the packed tarballs matters more in this pass than in any other**, because Task 6 rewrites
the scaffolder's pinned `githubApp` literal and Tasks 2 and 3 change the factory calls the emitted
template makes. Nothing merges on a red CI.

**The pass-end run uses the npm-script form**, the original string with `npm run check:package` and
its eleven siblings called through their wrappers, so the wrappers themselves are proven at least
once before merge.

---

## Rollback and halt semantics

Every task ends with the full gate green, so the branch is mergeable at each of the fifteen
commits. That is a real property of this plan, and it matters more here than in 11a because the
release cut sits behind the merge: a halt at task N leaves a shippable branch carrying N of the ten
consumer lines rather than an unshippable one.

What a halt does break is the ONE-`Consumers must:`-list promise. The initiative's publish ruling
is that the whole remediation ships in a single release with one list. A halt that merges a partial
window means either holding the cut until the rest lands, which is the default, or cutting a
release whose list is incomplete against the spec's ten lines, which needs Geoff's ruling. **A halt
is therefore reported to the conductor with the list of consumer lines landed and the list
outstanding**, and the cut waits.

Two orderings are load-bearing and a resume must respect them:

- **Task 1 before Task 12.** The custom-screen example is the replacement the `OfficeList`
  removal's `Consumers must:` line points at. Task 12 dispatched before Task 1 lands would remove
  an export the extend guide still teaches, and `check:snippets` would go red on the branch.
- **Tasks 2 through 12 before Task 13 and Task 14.** Both are verification tasks over what the
  rename tasks did. Running either early proves nothing.

**Chain D of pass 2a unblocks when Tasks 1 AND 12 have both merged, never on Task 1 alone.** Chain
D rebuilds `docs/extend/add-a-custom-admin-screen.md` from a fact ledger, and that page's facts are
stable only once the export is gone: a halt after Task 1 that merges would let chain D harvest a
page whose taught composition is right while the export it replaced still ships, and the ledger
would record a half-true world.

State at each halt point, so a resuming session knows what it has: after Task 1 the example is
composed and `OfficeList` still ships; after Task 3 the four factories are on one bag; after Task 7
every function rename has landed; after Task 9 every type rename has landed; after Task 11 every
event rename has landed; after Task 12 the window is complete in code; after Task 14 the consumer
record is complete; after Task 15 the branch is ready for the conductor's cut.

---

## Pass-end ritual

1. **`code-simplifier`** over the code this pass changed, before the final commits. Apply its
   refinements, then re-run the gate.
2. **The full gate** above, green, in one uninterrupted run, in the npm-script form so the wrappers
   are proven.
3. **The six CI-only gates** confirmed green inside that run: `check:comments`, `check:surface`,
   `check:snippets`, `check:transcripts`, `check:symbols`, `check:reference:signatures`.
   `check:surface` must be green against the REGENERATED `docs/internal/api-surface.md`, which is
   this pass's one departure from 11a and 11b.
4. **The from-scratch consumer build.** A fresh `npm install` in the worktree's
   `examples/showcase`, then `npm --prefix examples/showcase run build` and the e2e suite, so the
   proof is against this branch's engine and not `main`'s symlinked build.
5. **The scaffold proof.** Confirm `scaffold.yml` and `create-site.yml` are green on the PR's own
   CI run, against the packed tarballs. Task 6's pinned literal and Tasks 2 and 3's emitted
   template calls are what those two workflows exist to catch.
6. **The reviewer fan-out, all four**, per the spec's Sequencing block:
   `web-auth-security-reviewer` on the auth renames and the outcome re-key
   (`RequestOutcome`, `ChannelRequestOutcome`, `ChannelConfirmOutcome`, `buildCookieName`,
   `UnresolvedEditor`, `createAdminAction`, `mintPreview`, `revokePreview`, and the
   `auth.access.refused` and `admin.action.csrf_refused` renames), with the no-roster-leak encoding
   and the challenge-required-is-a-retry ruling named as the two invariants to check;
   `cloudflare-workers-reviewer` on the route-factory signature changes and the audit-sink event
   rename; `svelte-reviewer` on `CustomScreen.svelte`, `LoginPage.svelte`'s three re-keyed branches,
   and the `OfficeList` removal's remaining composition; `daisyui-a11y-reviewer` on the replacement
   custom-screen composition, since the card frame moved from a component to a call site, and on
   the divergence Task 1 reported between the taught composition and the signups exemplar.
7. **Docs the spec assigns to this pass**, confirmed present: `docs/extend/add-a-custom-admin-screen.md`
   (Task 1), `docs/extend/migration-notes.md` (Tasks 2 through 12 and Task 14),
   `docs/reference/*` for every renamed export, `docs/reference/log-events.md` (Tasks 10 and 11),
   `docs/internal/admin-design-system.md` (Task 12), and no other published page.
8. **`CHANGELOG.md` under `## Unreleased`**, finalized, carrying every `Consumers must:` line for
   the ten spec lines. The heading is NOT renamed; the cut does that.
9. **`docs/extend/migration-notes.md`'s `## Unreleased` section** reconciled against the whole
   window, with the four sites and their order (Task 14).
10. **`docs/internal/engine-rulings.md`** carries a polish-C Note on every row this window renames,
    verified by Task 13's grep, plus one new full-format row and the closed leak sanction.
11. **`docs/HISTORY.md`** carries the polish-C entry as slice 12 (Task 15).
12. **`ROADMAP.md`**'s audit-remediation entry closed and removed from the live tier, with the
    `check:surface` script follow-up line filed (Task 15).
13. **The friction log** triaged whole in Task 15, complete-or-move, not appended to.
14. **`docs/internal/record/2026-09-08-polish-inputs/release-notes-draft.md`** written, with the
    verified free number and the derived bump size (Task 15).
15. **The conductor writes `docs/STATUS.md`** at merge, never a task, naming the four consumer
    sites' upgrade as the next action and removing the dead names STATUS still carries at `:50` and
    `:95`. The conductor's close-out records agent also fills the Post-mortem's two budget numbers.
16. **No version bump, no tag, no publish inside this pass. Geoff merges.** The conductor then
    invokes the `cairn-release` skill as a separate step, re-derives the number and the size at the
    cut against the skill's own rule, and cuts.

---

## What this pass hands forward

- **To the conductor, the cut.** A `main` whose `## Unreleased` block carries the whole window with
  every `Consumers must:` line, a migration-notes section reconciled against that window, a
  release-notes draft, and a verified free number with a recorded size derivation. The cut runs
  through `cairn-release`, which re-derives the size at the cut on its own instruction. **This is
  the one cut the initiative's publish ruling promised.**
- **To the four consumer sites, a mechanical upgrade.** `ecxc-ski` and `907-life` take four
  call-site edits each; `xcathletes-org` takes five, with `DevBackendConfig` reaching it only if it
  starts annotating a call it makes bare today; `aksailingclub-org` takes eight call-site edits plus
  the `OfficeList` composition sweep across eighteen admin screens and one test file, which is why
  it goes last. Every one of them is named in `docs/extend/migration-notes.md` with its files.
- **To pass 2a's chain D, the page it rebuilds.** Chain D rebuilds
  `docs/extend/add-a-custom-admin-screen.md`, the page Task 1 rewrites, so **chain D is ordered
  after polish-C merges**, and specifically after both Task 1 and Task 12 have merged. The spec's
  Sequencing block gives the reason: otherwise the two branches conflict on one file, or 2a's
  rebuild re-teaches `OfficeList` from a pre-removal fact ledger and turns `check:snippets` red on
  `main` after the release is cut. The amendment naming this is already written into
  `docs/superpowers/plans/2026-09-08-docs-toolset-pass.md`; the executor confirms it is there before
  2a branches.
- **To the docs rewrite's stage one, a stable vocabulary.** Every rename in this window invalidates
  a fact-ledger entry in exactly the class the ledger exists to guarantee, which is why polish-C
  lands entirely before the docs harvest branches. After this pass the public names are settled
  through 1.0 unless a new ruling moves one.
- **To the docs rewrite's stage five, the front-door set.** Decisions 4, 12, and 13 leave the front
  door, the README's site count, and Geoff's uncommitted figure files to that stage. No polish pass
  touched any of them, and this pass's close does not change that.
- **To the ledger's next reader, a ledger with no dead names.** Every row whose subject this window
  renamed carries a Note naming the new name and stating the verdict is unchanged, and Task 13's
  grep is the standing proof. `f1-return-position-leak-sanction` is closed against the rider that
  landed, and the header's allowlist sentence matches the allowlist.
- **To ROADMAP, an empty carry list plus one filed line.** The any-site audit remediation initiative
  closes with this pass. What remains under "pre-beta polish" in the Next tier is a different track
  and was never part of it. The one line this pass adds is the `check:surface` script's two-command
  chain and its stale banner, filed rather than fixed because a non-breaking fix does not join the
  breaking window.
- **The one thing a later pass would be wrong to rediscover:** `OfficeList` was retired on the
  double-scroll-container argument against a CLOSED reshape row, as a new proposal rather than a
  reopen, and the component's own "both stay" sentence was quoted and overruled in the new row's
  text. A later reader finding that sentence in the git history should read the new row before
  concluding the removal was an oversight. The second is smaller and costs a gate cycle every time
  it is forgotten: `npm run check:surface -- --update` does not regenerate the surface, because npm
  appends the flag to the end of a two-command script and only the first command reads it.

---

## Post-mortem
