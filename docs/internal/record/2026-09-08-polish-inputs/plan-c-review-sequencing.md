# Polish-C plan review, sequencing and risk lens

Adversarial review of `docs/superpowers/plans/2026-09-08-polish-c-pass.md` (uncommitted at review
time) against `docs/superpowers/specs/2026-09-08-polish-passes-design.md` revision 4, the committed
`docs/superpowers/plans/2026-09-08-polish-11a-pass.md`, the in-progress
`docs/superpowers/plans/2026-09-08-polish-11b-pass.md`, and the working tree at `main`
(`0705776e`). Read-only; every claim below was measured in this checkout, not inferred from the
plan's own text. Fifteen findings, ranked by the cost of discovering them at execution rather than
now.

The plan is unusually strong on the axes it was asked about: task order, the 11a module map, the
ledger annotation rule, and the halt ledger are all correct and independently verified below. The
findings cluster in one place, the boundary between what a task's Files block enumerates and what
its own acceptance grep will actually return, and in one structural gap, the gates that read files
the plan's classification rule declares immune.

## Ranked findings

**1. Plan:1486-1583 (Task 10) -- the `OfficeList` acceptance grep is unsatisfiable as written, and
six live reference sites are outside the Files block, one of them a typechecked fence.**
Evidence. `grep -rn "OfficeList" src docs examples templates packages scripts` returns, beyond the
files Task 10 lists: `docs/reference/admin-toolkit.md:191`, a ` ```ts ` fence importing
`OfficeList` from `@glw907/cairn-cms/admin-toolkit` inside the page's barrel-import example, plus
`:8` (the subpath's component list) and `:613` (PageHeader's own prose, "the `OfficeList` shape
generalized"); `src/lib/admin-toolkit/index.ts:6` (the barrel header comment, distinct from the
`:42` export line the plan names); `src/tests/component/PageHeader.test.ts` at `:7`, `:9`, `:42`,
`:43`, `:68`, `:110`, `:112`, including a test title; `src/tests/unit/audit/rules/rendered/rulings.weight-budget.test.ts:6`,
`:71`, `:78`; `src/tests/unit/audit/rules/rendered/browser-regressions.test.ts:512`;
`docs/STATUS.md:50`; and `docs/extend/migration-notes.md:128-131`. None of the seven falls in the
plan's three exempt classes (write-once archive, historical ruling field, changelog or history
entry), so each is a blocking finding under Global constraint 7 that Task 10 has no instruction to
fix. `docs/reference/admin-toolkit.md:191` is the sharp one: `scripts/checks/check-snippets.mjs`
extracts every ` ```ts `, ` ```typescript `, and ` ```svelte ` fence under
`docs/reference`, `docs/extend`, `docs/admin`, `docs/editors` (`check-snippets.mjs:47`) and
typechecks it against the built package, so that fence goes red in the same commit that removes the
export, which is exactly the intermediate state Global constraint 6 exists to prevent. Two of the
seven are structural rather than editorial: `docs/STATUS.md:50` names `OfficeList` and Global
constraint 13 forbids any task to edit `docs/STATUS.md`, so Task 10's acceptance and the plan's own
ledger-ownership rule contradict each other; and `docs/extend/migration-notes.md:128-131` sits
INSIDE the `## Unreleased` section (the section runs `:12` to `## 0.96.0` at `:148`) and instructs a
consumer to rename `OfficeList`'s `subtitle` prop to `meta`, advice about a component the same
unpublished window then deletes.
Correction. Add to Task 10's Files block: `docs/reference/admin-toolkit.md` `:8`, `:191`, `:613`
(named individually, since "the `OfficeList` section" does not reach them);
`src/lib/admin-toolkit/index.ts:6`; `src/tests/component/PageHeader.test.ts`;
`src/tests/unit/audit/rules/rendered/rulings.weight-budget.test.ts`; and
`src/tests/unit/audit/rules/rendered/browser-regressions.test.ts`. Add `docs/STATUS.md` to the
exempt list in Task 10's acceptance grep with the conductor named as its owner at the checkpoint.
Give Task 12 an explicit instruction to retire the `subtitle`-to-`meta` bullet at
`migration-notes.md:128-131` when it reconciles the window, since a bullet teaching a prop rename on
a removed component is the clearest case of the merge-across-passes rule the task already carries.

**2. Plan:497-501 and 1716-1719 -- `check:docs` reads `CHANGELOG.md`, so the historical-entry
immunity the plan grants collides with a gate, in two measured places.**
Evidence. `scripts/checks/docs-links.mjs:15` puts `CHANGELOG.md` in `ROOT_DOCS` and the script
"resolves every relative Markdown link, and confirms the target file exists and any `#anchor`
resolves to a real heading" (`:1-4`). `CHANGELOG.md:3011` links
`docs/reference/sveltekit.md#adminaction` and `:3148` links
`docs/reference/delivery-data.md#diffnewlypublished`. Both targets are real headings today
(`docs/reference/sveltekit.md:493` `### \`adminAction\``,
`docs/reference/delivery-data.md:492` `### \`diffNewlyPublished\``) and both are renamed by this
window (Tasks 6 and 5). Both source lines sit below the `## 0.96.0` boundary at `CHANGELOG.md:1542`,
so they are precisely the "changelog entry describing what was true then" that Global constraint 7
declares an acceptable remaining site and that the annotate-never-rewrite spirit protects. The gate
does not share that view: `check:docs` will fail on Task 5's and Task 6's own commits.
Correction. Rule it in the plan rather than leaving it to an implementer mid-task. The cheapest
resolution is to let the renaming task update the anchor half of a historical changelog link while
leaving its prose verbatim, and to say so in Global constraint 7 as a fourth classified case ("a
dead cross-reference anchor in a historical entry is repaired; its prose is not"). State it once,
name both measured lines, and give Task 12's sweep the job of proving no other historical anchor
points at a renamed heading.

**3. Plan:587-608 -- the pass-wide paint claim is false for Task 7, which edits two
screenshot-baselined components, and no baseline covers the branches it re-keys.**
Evidence. The plan states "Task 1 and Task 10 are the two that touch a rendered component"
(`:604`) and rules every task onto the paint protocol's no-rendered-surface branch (`:587`). Task 7
re-keys `RequestResult` from `status` to `outcome` and changes `send_error` to `send-error`.
`src/lib/components/LoginPage.svelte` branches on exactly those values at `:101`
(`form?.status === 'sent' || form?.sent`), `:139` (`form?.status === 'send_error'`) and `:143`
(`form?.status === 'throttled'`), so the file must change. `examples/showcase/e2e/admin-visual.spec.ts:61-91`
screenshots `/admin/login` and `/admin/auth/confirm` as `auth-login-light/dark` and
`auth-confirm-light/dark`. The baselines render the neutral state, so they will very likely not
move, which is the hazard rather than the reassurance: a mis-mapped value string leaves every
baseline green while the send-error and throttled renders break, and no baseline or e2e covers those
two branches.
Correction. Move Task 7 onto the paint protocol's paint-neutral branch (before and after tiles for
the two auth surfaces, `magick compare` AE = 0 per tile) rather than the no-rendered-surface branch,
and add one acceptance criterion that a component test renders each of the three arms and asserts
the message that arm produces. Amend `:604` to name Tasks 1, 7, and 10.

**4. Plan:103, 117, 163, 165-166 -- every "post-11b" anchor cites a task number 11b does not have.**
Evidence. `docs/superpowers/plans/2026-09-08-polish-11b-pass.md` has sixteen tasks. The plan cites
"11b's task 9 adds an `access` member" to `DevBackendOptions` (`:103`, repeated at `:949-951`); the
dev-handle work is 11b's **Task 11** (`polish-11b-pass.md:1198-1268`, `DevBackendOptions` at
`:1204`). It cites "11b's task 4 rewrites eight `AdminLayout.svelte` references" in
`admin-design-system.md` (`:117`) and "11b's task 4 (the busy recipe, the `CairnAdminShell`
correction)" (`:165`); that is 11b's **Task 1** (`:460`, `:466`, `:508`), while 11b's Task 4 is the
command palette. It cites "11b's task 10 rewrites `examples/showcase/src/routes/admin/signups/+page.server.ts`
onto `createSectionAction`" (`:163`); that is 11b's **Task 12** (`:1289`), and 11b's Tasks 13 and 14
rewrite the same exemplar's form and destructive row, which the plan does not mention at all. The
cause is disclosed rather than hidden (the plan was authored before 11b, against the spec's
instruction at `polish-passes-design.md:504` that "polish-C's plan is therefore authored after 11a
and 11b merge"), but a Reconciliation block whose pointers are wrong is worse than one that says
"locate by prose", because an executor will trust a task number.
Correction. Renumber the four citations, add 11b Tasks 13 and 14 to the signups line, and add one
sentence to the Reconciliation preamble: every 11b task number in this plan is provisional and is
re-read from 11b's committed plan at dispatch.

**5. Plan:151-153 -- the barrel-prune warning names the wrong two literals; the one that holds this
window's names is `KEPT`.**
Evidence. The plan carries 11a's hand-forward verbatim, warning that `RETIRED_CORE_ARMS` and
`RETIRED_TIER1` in `src/tests/unit/sveltekit-barrel-prune.test.ts` carry 11a's new names.
Measured in that file today: `RETIRED_TIER1` (`:32`) holds `MediaDeleteRefusal` and five siblings,
none of which this window renames, and the literal that does name this window's symbols is `KEPT`
(`:36-65`), which lists `'RequestResult'` (`:42`, Task 7), `'NavLoadData'` (`:54`, Task 4), and
`'healthLoad'` (`:60`, Task 6). The test asserts against `dist/sveltekit/index.d.ts`, so a stale
`KEPT` either fails loudly or asserts a name that no longer exists, which is the vacuous-gate hazard
11a raised in the first place.
Correction. Replace the two literal names in `:151-153` with `KEPT`, and add
`src/tests/unit/sveltekit-barrel-prune.test.ts` to the Files block of Tasks 4, 6, and 7 by name
rather than leaving it to `src/tests/**` by grep.

**6. Plan:1164-1166 (Task 6) -- `cookieName` collides with a site-local property name in the
showcase and the template, so the acceptance grep cannot return what the plan says it will.**
Evidence. `grep -rnE "\bcookieName\b"` over `examples/showcase/src` and `templates/waymark/src`
returns `examples/showcase/src/chassis/theme-toggle.ts:15` and `:34`,
`templates/waymark/src/chassis/theme-toggle.ts:15` and `:34`, and
`templates/waymark/src/theme/components/SiteHeader.svelte:63` (`cookieName: 'cairn-site-theme'`).
These are a site's own config member for its theme cookie and have nothing to do with
`src/lib/auth/crypto.ts:48`'s exported function. Task 6's acceptance says the grep "returns only
`src/lib/doctor/checks-github.ts:14`, the write-once archives, historical ruling fields, and
changelog or history entries", which is false, and an implementer reconciling its report against
that sentence has two bad options: rename a site-local property (corrupting the emitted template) or
report an unclassifiable hit.
Correction. Name the collision in Task 6's Decisions block the way the plan already names
`githubApp`'s exempt twin, list the five sites as a fourth exempt class in that task's acceptance,
and say plainly that a site's own `cookieName` config member is not in scope.

**7. Plan:170-176 and constraint 7 -- `docs/internal/history/**` is a third write-once archive tree
the classification rule does not name, and it holds two-argument factory calls.**
Evidence. The plan excludes "the two write-once archive trees", `docs/superpowers/` and
`docs/internal/record/`, from both the 281-file count and the remaining-site classification.
`docs/internal/history/STATUS-archive-2026-05-to-2026-07.md` contains
`createCairnAdmin(runtime, deps)` at `:2607` and `createMediaRoute(runtime)` at `:5131`, so Task 2's
acceptance ("`grep -rnE "createContentRoutes\(|createCairnAdmin\(" src examples templates packages docs`
returns no two-argument call") and Task 3's equivalent both fail on a historical archive. Eight
further files under `docs/internal/history/` name renamed identifiers (`OfficeList`, `adminAction`,
and others), each of which will surface in Tasks 4, 6, 9, 10, and 12 as an unclassified hit.
Correction. Add `docs/internal/history/` to the write-once set in Global constraint 7 and to the
exclusion in the file-reach derivation, and re-state the three counts as derived over three excluded
trees rather than two.

**8. Plan:724, 828, 1097 -- `templates/waymark` is generated, not edited, and three Files blocks
list it as Modify.**
Evidence. `scripts/build/emit-template.mjs:1-2`: "Emit a deployable cairn-starter template from
examples/showcase. The showcase is the single source (Reversal 2)". Tasks 2, 3, and 6 list
`templates/waymark/src/...` paths under Modify. The Steps do say "update the showcase and the
template, re-emit the template", so the outcome is recoverable, but a hand edit to the template that
the re-emit then overwrites wastes a gate cycle, and a hand edit WITHOUT the re-emit fails
`check:template`.
Correction. In all three Files blocks, replace the template paths with one line: "Regenerated, never
hand-edited: `templates/waymark/**` follows from the showcase through `npm run emit:template`;
`check:template` is the proof."

**9. Docs anchors -- twenty-four lowercase anchor fragments name renamed symbols, and a
case-sensitive symbol grep finds none of them.**
Evidence. `grep -rnoE "#(adminaction|previewload|healthload|githubapp|...)"` over the published docs
returns 24 hits across fifteen pages, including `docs/reference/sveltekit.md` (`#previewmint` four
times, `#previewrevoke` twice, `#previewload` twice), `docs/reference/ambient.md` (`#adminaction`
twice), `docs/extend/security-model.md` (twice), `docs/reference/delivery.md`,
`docs/reference/delivery-data.md`, `docs/reference/components.md`, `docs/reference/auth-channel.md`,
`docs/reference/admin-routes.md`, `docs/extend/restrict-admin-access.md`,
`docs/extend/debug-your-site.md`, `docs/extend/announce-on-publish.md`,
`docs/extend/add-cairn-to-a-sveltekit-app.md`, and `docs/extend/add-a-custom-admin-screen.md`. Every
renaming task instructs "update every reference page and extend guide ... by grep", and a grep for
`adminAction` does not match `#adminaction`. `check:docs` catches the miss, so this costs
re-dispatches rather than a silent ship, but `docs/reference/ambient.md` is in no task's Files block
and is not reached by `docs/extend/*.md`.
Correction. Add one line to Global constraint 7: each renaming task also greps the lowercased,
punctuation-stripped anchor form of every name it changes. Add `docs/reference/ambient.md` to Task
6's Files block.

**10. Plan:823-838 (Task 3) -- the Files block omits the in-tree `createNavRoutes` caller.**
Evidence. `src/lib/sveltekit/cairn-admin.ts` calls `createNavRoutes(`. Task 3's Files block lists
`nav-routes.ts`, `media-route.ts`, the barrel, the showcase and template media routes, four doc
pages, the ledger, and the changelog; `cairn-admin.ts` is absent. Task 3 also lists
`docs/reference/media.md` and `docs/reference/admin-routes.md`, neither of which contains a
`createMediaRoute(` or `createNavRoutes(` call today. The compiler finds the real caller, so this is
a Files-block accuracy defect rather than a correctness one, but it is the composition root of the
factory family and deserves naming.
Correction. Add `src/lib/sveltekit/cairn-admin.ts` to Task 3's Files block. Note that Task 2 already
edits the same file, so Tasks 2 and 3 both touch it, which the one-chain sequential execution
handles.

**11. Plan:45-61 -- the ceiling has zero slack for the one re-dispatch the chain allows, and the
checkpoints sit after the three heaviest tasks rather than between them.**
Evidence. The arithmetic is thirteen units at 500K plus 0.5M, which equals the 7M ceiling exactly.
The chain's own rule is one re-dispatch on a `fix` verdict, and a re-dispatch re-runs a gate the
plan prices at 16 to 28 minutes and a task whose diff reaches, for Task 2, about forty test files
(measured: 30 files call `createContentRoutes`, 10 call `createCairnAdmin`, plus the two doctor
strings, the showcase, the template, and eight doc pages). One re-dispatch on Task 2 or Task 7
consumes the entire 0.5M reserve. Separately, checkpoints at 4, 8, and 12 put Tasks 2, 3, and 4, the
arity change and the six-name bag sweep, all before the first STATUS is written.
Correction. Either raise the ceiling to 7.5M with the reserve named as re-dispatch headroom, or move
the checkpoints to 3, 7, 10, and 12, so the first STATUS lands immediately after the arity change,
the second after the outcome re-key, and the third after the removal. Recommend the checkpoint move;
it costs nothing and it puts a written ledger after each of the three tasks most likely to halt.

**12. Plan:1896-1897 -- thirteen gates at 16 to 28 minutes is three and a half to six hours of gate
time in one sequential chain, and no unattended-work guard is armed.**
Evidence. The plan prices the gate and instructs the executor to time its first run, but the pass
runs as one workflow with a single end-to-end slot (Global constraint 4). The workstation rule for
unattended work past roughly thirty minutes is the runaway transcript watcher plus, on battery,
`systemd-inhibit` and the battery watchdog. Neither appears in the Pre-dispatch block.
Correction. Add a fifth pre-dispatch precondition: arm the runaway guard and, on battery, the
inhibitor and watchdog, per `~/.claude/docs/unattended-work-guards.md`.

**13. Plan:1716 and 1734 (Task 12) -- "thirty-two names" double counts.**
Evidence. The plan's own identifier derivation at `:177-184` is "eleven types ... ten functions ...
one component (`OfficeList`) ... and eight event strings", and `EditorRow` is one of the eleven
types while `OfficeList` is the one component. Task 12 then sweeps "all thirty old identifiers plus
`EditorRow` and `OfficeList`" and its acceptance says "all thirty-two names".
Correction. Thirty. Fix both lines so the executor's report count matches the acceptance count.

**14. Plan:1914-1940 -- the halt ledger is complete for the release but silent on chain D.**
Evidence. The Rollback section states the branch state after each of the thirteen commits and rules
that a halt reports landed and outstanding consumer lines with the cut waiting, which is the right
shape. It does not say what a halt means for pass 2a's chain D, whose stated dependency
(`docs-toolset-pass.md:265-271`, `:397`, `:1604`) is that polish-C's Task 1 rewrites
`docs/extend/add-a-custom-admin-screen.md`. A halt after Task 1 that merges leaves chain D's actual
blocker satisfied while the release waits, and a halt before Task 10 leaves the page teaching a
composition whose export still ships.
Correction. Add one sentence to the halt block: chain D unblocks when Task 1 AND Task 10 have both
merged, never on Task 1 alone, because the page's fact ledger is only stable once the export is
gone.

**15. Plan:648-665 (Task 1) -- the taught composition diverges from the repo's own baselined
exemplar.**
Evidence. Task 1 rules that the replacement composition wraps `AdminTable` in a
`card-shell card-shadow` div at the call site (correct against
`docs/internal/admin-design-system.md:353-359`, which the plan measures accurately; note 11b's own
Reconciliation cites `:95` for the same recipe, which is the borders-and-shadows bullet, not the
recipe, so C's anchor is the right one). The repo's live consumer proof,
`examples/showcase/src/routes/admin/signups/+page.svelte`, composes `PageHeader` and `AdminTable`
with NO card wrapper, and it is the surface `admin-visual.spec.ts:226-239` screenshots at three
widths and `custom-screen.spec.ts` drives. After Task 1 the guide teaches one composition and the
in-repo exemplar demonstrates another.
Correction. Not a blocker, and deliberately not a scope addition: name the divergence in Task 1's
report and let the pass-end `daisyui-a11y-reviewer` fan-out grade it. If it should converge, that is
a follow-up line for the site-exemplar owner (11b Tasks 12 to 14 already hold that file), never an
addition to this window.

## Call-site table

Measured with `grep -rn "<factory>(" src examples templates packages docs scripts` at `0705776e`,
excluding `docs/superpowers/` and `docs/internal/record/`. "Covered" means the site is named in the
task's Files block or falls inside a pattern that task's grep step will return AND its acceptance
grep will classify.

| Factory | In-tree call sites found | Covered by task | Uncovered |
|---|---|---|---|
| `createContentRoutes` | 30 test files under `src/tests/{unit,integration}`; `src/lib/sveltekit/content-routes.ts`; `docs/reference/sveltekit.md` | Task 2 (yes) | none |
| `createCairnAdmin` | 6 test files; `src/lib/sveltekit/cairn-admin.ts`; `src/lib/doctor/checks-local.ts:345`; `src/lib/diagnostics/conditions.ts:209`; `examples/showcase/src/chassis/cairn.server.ts`; `templates/waymark/src/chassis/cairn.server.ts`; `docs/reference/sveltekit.md`, `core.md`, `admin-routes.md`; `docs/extend/build-a-site-by-hand.md`; `docs/internal/history/STATUS-archive-2026-05-to-2026-07.md:2607` | Task 2 (yes, except the archive) | 1: the history archive, unclassifiable under constraint 7 (finding 7) |
| `createNavRoutes` | `src/tests/unit/nav-routes-load.test.ts`, `nav-routes-save.test.ts`, `factory-contracts.test.ts`, `env-genericity.test.ts`; `src/lib/sveltekit/nav-routes.ts`; `src/lib/sveltekit/cairn-admin.ts`; `docs/reference/sveltekit.md` | Task 3 (partly) | 1: `src/lib/sveltekit/cairn-admin.ts` absent from the Files block (finding 10) |
| `createMediaRoute` | `src/tests/integration/media-delivery.test.ts`; `src/tests/unit/media-route-plain-opts.test.ts`, `media-route-platform-proxy.test.ts`, `env-genericity.test.ts`; `src/lib/sveltekit/media-route.ts`; `examples/showcase/src/routes/media/[...path]/+server.ts`; `templates/waymark/src/routes/media/[...path]/+server.ts`; `docs/reference/sveltekit.md`; `docs/internal/history/STATUS-archive-2026-05-to-2026-07.md:5131` | Task 3 (yes, except the archive) | 1: the history archive (finding 7) |

**Uncovered: three** (two are the same history-archive file reached by two factories; one is a
missing in-tree caller). No consumer-site call sites are in tree, and no call site exists in
`packages/` for any of the four.

On the two questions the table cannot answer. `check:snippets` DOES cover the docs' fenced blocks
against the BUILT package: `scripts/checks/check-snippets.mjs` walks `docs/reference`, `docs/extend`,
`docs/admin`, `docs/editors` (`:47`), extracts ` ```ts `, ` ```typescript `, and ` ```svelte `
fences, and typechecks each against `dist/` through the compiler API, with a per-block
`snippet-check-skip` opt-out. It does not read `docs/internal/`, so
`docs/internal/api-surface.md` and the design system are proven by other gates. And
`packages/create-cairn-site`'s pinned literals are fully enumerated by Task 6: the placeholder at
`src/github/finalize.mjs:21`, the builder at `:32`, and the three asserting suites
(`github/finalize.test.mjs` at `:24`, `:43`, `:60`, `:96`, `:106`; `github/chapter.test.mjs` at
`:46`, `:60`, `:62`; `cloudflare/config.test.mjs` at `:247`, `:251`) are all named, and the CLI
suite runs in that task's gate. `templates/waymark/src/theme/cairn.config.ts:149` carries the same
literal and re-emits from the showcase, which is finding 8's mechanism point, not a coverage gap.

## 11a/11b collision table

| Subject | 11a or 11b state | Polish-C task that touches it | Verdict |
|---|---|---|---|
| The nine `content-routes-entry-*` / `content-routes-media-*` modules | Created by 11a, replacing `content-routes-entry.ts` and `content-routes-media.ts` | Task 7 only, and it names the post-11a path (`content-routes-entry-revert.ts`, plan `:1196`) | Sound. Verified independently: all thirty renamed identifiers declare in `auth/`, `github/`, `content/`, `delivery/`, `render/`, `log/`, `admin-toolkit/`, `auth-channel/`, or the `sveltekit/` leaf files. No plan task names a retired module path |
| `DeleteFailure`, `MediaDeleteFailure`, `BulkDeleteSkippedAsset` | 11a's settled names | None. The plan's rename table starts from them and renames none of them (`:149-150`) | Sound |
| `KEPT` / `RETIRED_TIER1` in `sveltekit-barrel-prune.test.ts` | 11a re-wrote `RETIRED_*`; `KEPT` holds `RequestResult`, `NavLoadData`, `healthLoad` | Named as `RETIRED_CORE_ARMS`/`RETIRED_TIER1` at `:151-153`; the live literal is `KEPT` | **Finding 5** |
| `docs/internal/admin-design-system.md` | Rewritten by 11b **Task 1** (busy recipe, `CairnAdminShell`, eight `AdminLayout` references) | Tasks 1 (read only, the recipe) and 10 (the office-list clause and the F3 bullet) | Anchors correctly flagged as post-11b and located by prose; the task NUMBER is wrong (**finding 4**) |
| `packages/cairn-cms-dev` `DevBackendOptions` | Gains `access` and `roles` in 11b **Task 11** | Task 4 renames it to `DevBackendConfig` on whatever shape 11b left | Sound in substance, wrong task number (**finding 4**) |
| `examples/showcase/src/routes/admin/signups/**` | Rewritten by 11b **Tasks 12, 13, 14** (server half, form, destructive row) | Task 6 greps it for `adminAction`; no C task edits it | Sound in substance; the plan names only 11b task 10 and misses Tasks 13 and 14 (**finding 4**) |
| `eslint.config.js`'s `.svelte` glob | Widened by 11a Task 10 to `src/lib/components/**/*.svelte`, `tsdoc/syntax` at error | Tasks 1 and 10 write `.svelte` comments outside that glob; Task 7 edits `LoginPage.svelte` and `ConfirmPage.svelte`, which are INSIDE it | Partly unsound: the plan reasons about Tasks 1 and 10 (`:154-159`) and never notices that Task 7's components fall inside the widened glob, so Task 7's comments must be TSDoc-clean under a gate at error. Related to **finding 3** |
| `docs/reference/components.md`, `sveltekit.md` | Edited by 11a's media split | Tasks 4, 5, 6, 7, 8, 9 edit them again | Sound, correctly flagged at `:160-161` |
| `## Unreleased` in `CHANGELOG.md` | 11a and 11b append entries with no `Consumers must:` line | Every C task appends; Task 12 reconciles the whole window | Sound. 11a's hand-forward confirms the window's actionable lines come only from earlier passes and C itself |
| `docs/internal/api-surface.md` | Byte-identical through 11a and 11b | Tasks 2 to 8 and 10 regenerate it | Sound, and the per-task regeneration rule (`:486-490`) is the right call given eight surface-changing tasks |
| `OfficeList` | 11b explicitly does not touch it (`polish-11b-pass.md:301`, `:1583`, `:1793`), and leaves the ROADMAP item open for C | Task 10 | Sound |
| `docs/HISTORY.md` numbering | 11a Task 13 retro-numbers B1 as 9a and the identity seam as 10 | Task 13 writes polish-C as slice 12 and reports rather than fixes a gap | Sound |

## Checked and found sound

- **Task order.** No task depends on a later one. The two load-bearing orderings the plan names
  (Task 1 before Task 10; Tasks 2 to 10 before 11 and 12) are the correct two, and the reasoning for
  the first (a `check:snippets` red on the branch) is exactly right given
  `check-snippets.mjs`'s DOC_DIRS.
- **Task 1's independence.** Verified directly. `src/lib/reproductions/stories/CustomScreen.svelte`
  imports only `OfficeList`, `AdminTable`, `StatusChip` from `../../admin-toolkit/index.js` (`:12`),
  calls no factory, and names no symbol Tasks 2 to 9 rename. Its manifest row, its registration, and
  the pinned id list are all where the plan measures them.
- **The post-11a module map claim.** The plan's "no symbol this window renames declares in any of
  the nine" is true as measured, not merely asserted, and the instruction to re-derive from the tree
  with the hand-forward as a cross-check is the right protocol.
- **Task 9 leaves the surface alone.** Correct: `package.json`'s `exports` has no `./log` subpath, so
  the `CairnLogEvent` union is internal and event renames touch no snapshot. The plan's list of
  surface-changing tasks (2, 3, 4, 5, 6, 7, 8, 10) is right.
- **The `gap-0` reasoning.** `grep -rnE "(^|[\"' ])gap-0([\"' ]|$)"` over `src/lib`,
  `examples/showcase/src`, and `templates` returns nothing outside
  `OfficeList.svelte`'s own `@component` block, which names the class to keep Tailwind emitting it.
  The fixture carries `gap-0` at `src/tests/unit/fixtures/admin-sheet-inventory.txt:236`, distinct
  from `gap-0.5` at `:237`. `scripts/build/update-admin-sheet-inventory.mjs` exists for the
  regeneration Step 4 asks for. The claim that the removal changes the sheet and no pixel holds.
- **`card-shell` and `card-shadow` survive the removal.** Both are used across more than a dozen
  engine components, so the replacement composition the guide teaches still compiles into the
  shipped sheet after `OfficeList` goes.
- **The capture-surface argument.** The six-surface matrix (`home`, `article`, `styleguide`,
  `archive2`, `error404`, `signups`) and the two baseline directories are as the plan describes;
  `custom-screen.spec.ts` takes no screenshot; `admin-office-*` renders `/admin/posts`, not
  `OfficeList`. The paint claim is right for eleven of thirteen tasks and wrong only for Task 7
  (finding 3).
- **The chain D amendment exists.** `docs/superpowers/plans/2026-09-08-docs-toolset-pass.md:265-271`
  orders chain D after polish-C merges with the rebase as its step 0, restated at `:397` and
  `:1604`. The plan's instruction to confirm it before 2a branches is satisfiable today.
- **The release path.** No task bumps `package.json`, tags, or publishes; Task 13 derives and
  records only; the conductor cuts through `cairn-release`, which re-derives. `main` is releasable at
  every commit in the sense that matters: each of the thirteen commits clears the full gate, the pass
  merges as one PR, and no intermediate task leaves a half-renamed public surface at the merge
  boundary. Two caveats, both from findings above rather than from the ordering: Tasks 5 and 6 will
  leave CI red on the branch until the historical changelog anchors are resolved (finding 2), and
  Task 10 will leave it red on `check:snippets` until the barrel-import fence is in its Files block
  (finding 1). Both are branch-local and neither reaches `main`.
- **The ledger annotation rule.** Annotate-never-rewrite, one `- **Note (polish-C, Task N):**` line,
  heading ids never changed, rows located by slug. Task 11's population (seventeen plus nine plus
  eleven plus six conventions rows, thirty-seven in all, plus Task 10's new row) is internally
  consistent with the rename table. No row in the table names a symbol this window kills without an
  annotation instruction, and the historical fields that keep dead names are protected by design,
  which is correct: the only place a dead name causes a gate failure is the anchor case in finding 2,
  which is not a ruling field.
- **Consumer risk for `OfficeList` is handled at the right altitude.** Task 10 rules that the
  `Consumers must:` line and the migration note carry the full replacement composition rather than a
  pointer, precisely because `aksailingclub-org` imports it on sixteen admin screens, and Task 12
  states the four sites, their files, and the upgrade order with that site last. That is sufficient
  for a mechanical sweep: the composition is `PageHeader` beside `AdminTable` inside a
  `card-shell card-shadow` div with no `overflow-x-auto`, which is a find-and-replace at each screen.
  A separate migration-notes snippet is NOT needed, on one condition: `docs/extend/migration-notes.md`
  is inside `check-snippets.mjs`'s DOC_DIRS, so if the bullet carries the composition as a
  ` ```svelte ` fence it is typechecked against the built package, which is strictly better than
  prose. Recommend the fence form, and recommend it carry the `gap-0` sentence in the same bullet.
