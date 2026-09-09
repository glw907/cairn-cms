# Polish-C plan review, executor and plannability lens

Adversarial review of `docs/superpowers/plans/2026-09-08-polish-c-pass.md` (uncommitted) and its
dispatch args at `~/.cache/cairn-polish-c/args.json` and `run1-args.json`, against the executor
that will run them: `cairn-implementer` (Sonnet, zero conversation context) reviewed per task by
`diff-reviewer` (Opus), driven by `~/.claude/workflows/pass-execute-chains.js` as one sequential
chain of thirteen tasks.

Read for this review: the whole plan, both args files, the chains script, both agent definitions,
`~/.claude/skills/cairn-release/SKILL.md`, and the repository at `main` head `0705776e`. Every
measurement below was taken against that head. Fourteen findings, ranked by what stops or
corrupts an execution.

Baseline confirmations, before the findings. The two args files are byte-identical. The `gate`
string in args is byte-identical to the plan's `## Gate` fence. Every npm script and every
`scripts/checks/*.mjs` entry point the gate names exists. All fifty-five ruling slugs the plan
names resolve to a `##` heading in `docs/internal/engine-rulings.md`. Args carries no
`paintProtocol` key, so the chains script appends nothing, and the protocol rides inside each
`criteria` string exactly as the plan's constraint 15 says, with no double copy.

## Ranked findings

**1. Tasks 2, 3, 4, 5, 6, 7, 8, 10, 12 / Plan:429, 630, 1075 and every "Regenerate the surface"
step -- the surface regeneration command the plan orders eight times does not regenerate the
surface.** Evidence: `package.json:40` reads `"check:surface": "npm run package && node
scripts/checks/check-surface.mjs && node scripts/checks/check-surface-leaks.mjs"`. npm appends
run arguments to the END of the script string, so `npm run check:surface -- --update` passes
`--update` to `check-surface-leaks.mjs`, not to `check-surface.mjs`, which is the only script
that reads it (`check-surface.mjs:425`, `const update = process.argv.includes('--update')`).
Proven in a scratch package: a two-command `&&` script run with `-- --update` printed `A []` for
the first command and `node: bad option: --update` for the second. On a surface-changing task
`check-surface.mjs` therefore runs in plain mode, exits 1 on drift, the `&&` chain halts, and
nothing is written. The chained form landed in commit `2c123121` ("Add the F-1 leak-class rider
on check:surface"); the repo's own banner text (`check-surface.mjs:22`) and
`docs/internal/README.md:31` still print the pre-rider form, and the 2026-09-04 chassis plan
review ratified it as correct, so the plan inherited a stale instruction rather than inventing
one. Correction: every regeneration step and the notes block read `npm run package && node
scripts/checks/check-surface.mjs --update`, and the pass files a one-line fix to the
`check:surface` script (or splits it into `check:surface` and `check:surface:leaks`) so the
banner stops lying.

**2. Tasks 4, 7, 8 / Plan:919, 1199, 1290 -- `check-surface-leaks.json` carries none of the
symbols the plan tells three tasks to update in it.** Evidence: `grep -ciE
"requestresult|editorrow|channelrequest|channelconfirm|previewLoad|adminAction"
scripts/checks/check-surface-leaks.json` returns 0; the file's entries are `AdvisoryAction`,
`AdvisoryNotice`, `Change` and their siblings. The names are in the other two records:
`check-self-use-allowlist.json` carries `RequestResult`, `ChannelRequestResult`,
`ChannelConfirmResult`, `EditorRow` (three hits), `AuthGuardOptions`, `FieldsetOptions`,
`RendererOptions`, `diffNewlyPublished`, `previewLoad` and `adminAction` (two hits);
`check-surface-reexports.json` carries `AuthGuardOptions` (two), `NavLoadData`,
`VocabularyLoadData`, `parseManifest` and `previewLoad`. Task 4's acceptance ("the three gate
record JSON files carry the new names and no old one") is unsatisfiable as written for
`check-surface-leaks.json`, which will carry neither. A zero-context implementer greps, finds
nothing, and must either guess or report BLOCKED, and the reviewer has a criterion it cannot
verify. Correction: name the file that actually holds each symbol per task, restate the
acceptance as "no old name survives in any of the three records, and every record that named a
renamed symbol before names its new one", and drop `check-surface-leaks.json` from Tasks 7 and
8's Files. Task 4's args `files` array also lists only `check-surface-reexports.json` while its
`criteria` names all three; align them.

**3. Tasks 4, 5, 6, 7, 8, 9, 10, 12 / Plan:433 (global constraint 7) and Plan:1710 (Task 12 Step
1) -- the remaining-hit taxonomy has four classes and the tree has sixteen live files outside all
four, one of which no task may edit.** Evidence: greping the thirty renamed identifiers plus
`OfficeList` over `docs/`, excluding `docs/superpowers/`, `docs/internal/record/`,
`docs/HISTORY.md`, `CHANGELOG.md` and `docs/internal/engine-rulings.md`, returns sixteen files:
`docs/STATUS.md`, `docs/internal/pre-beta-harvest.md`, `docs/internal/engine-harvest-candidates.md`,
`docs/internal/docs-friction-log.md`, `docs/internal/admin-design-system.md`,
`docs/internal/design/2026-06-29-vocabulary-admin-design-reference.md`, two files under
`docs/internal/feedback/`, and eight under `docs/internal/history/`. `docs/STATUS.md:50` names
`OfficeList` and `:95` names `guard.rejected`. Constraint 7 makes each of these "a blocking
finding"; Task 12 Step 1 orders every defect fixed in the same commit; constraint 13 and the args
notes forbid any task from editing `docs/STATUS.md`. That is a direct contradiction that will
surface as an escalate on Task 12 at the earliest and on Task 4 at the latest. Source comments in
`src/tests/` are a second uncovered class (finding 6). Correction: extend the taxonomy to name
`docs/internal/history/`, `docs/internal/feedback/` and `docs/internal/design/` as write-once
archives; assign `docs/internal/pre-beta-harvest.md`,
`docs/internal/engine-harvest-candidates.md` and `docs/internal/docs-friction-log.md` to a named
task (12 is the natural home) as live docs to update; and state that `docs/STATUS.md` hits are the
conductor's to repair at merge, reported by Task 12 rather than fixed.

**4. Task 13 / Plan:1822 (Step 5) -- the last task asks a zero-context Sonnet subagent for
numbers only the conductor holds, and the workflow cannot upshift it.** Evidence: Step 5 and the
matching acceptance line require "the task ledger with each task's spend, the spend against the 7M
ceiling, the planning-miss count, the execution-sitting count". Per-task token spend, planning
misses and execution sittings exist only in the conductor's session; the implementer sees one
task. Separately, `pass-execute-chains.js` calls the implementer as `agent(implementPrompt(...),
{ label, phase, agentType: a.implementer, schema })` with no `model` key, while the reviewer call
passes `model: "claude-opus-5"` explicitly. There is no per-task model field in the args schema,
so `cairn-implementer`'s frontmatter Sonnet pin governs all thirteen dispatches and the
CLAUDE.md-sanctioned single-task upshift is not reachable from this workflow. Correction: cut the
budget numbers from Task 13's deliverables and have it write the ledger skeleton with the
per-task evidence it can see (commits, gate results, unspecified decisions), leaving the two
budget counts for the conductor at the pass close; and if Task 13 is to run on Opus, dispatch it
outside the workflow with the Agent tool, or add a per-task `model` to the script and pass it
through to the implementer `agent()` call.

**5. Task 13 / Plan:1810 (Step 3) -- "one summary per held section" names a structure the
changelog does not have.** Evidence: `CHANGELOG.md` lines 1 to 1541 contain exactly one `##`
heading (`## Unreleased` at `:1`, with `## 0.96.0` at `:1542`) and five `###` subsections
(`Added`, `Changed`, `Documentation`, `Fixed`, `Removed`). There are no per-pass sections in the
window. The `cairn-release` skill's sentence the plan is transposing ("summarizes EACH held
section") assumes several held `## x.y.z` sections, which is not this window's shape. The
criteria then hand the implementer a pass list ("eleven merged passes plus chassis-A,
chassis-B1, chassis-B2, the identity seam, polish-11a, polish-11b, and polish-C") with no way to
map a changelog bullet onto a pass and no statement of whether the seven named passes are inside
or beside the eleven. Correction: name `docs/HISTORY.md`'s entries since the `0.96.0` cut as the
authority for the held-pass list, and say plainly that the draft carries one paragraph per
HISTORY entry plus every `Consumers must:` line from the window, gathered from the five `###`
subsections.

**6. Task 10 / Plan:1497 (Files) -- the OfficeList removal's file list misses seven live sites,
one of which fails `check:snippets` on its own.** Evidence: `grep -rln OfficeList` outside the
write-once trees returns, beyond the plan's list,
`docs/reference/admin-toolkit.md:8` (the page's opening component list), `:191` (an `import`
line inside a ```ts fence publishing `OfficeList` from `@glw907/cairn-cms/admin-toolkit`) and
`:613` (the `PageHeader` description, "the `OfficeList` shape generalized");
`src/lib/admin-toolkit/index.ts:6` (the barrel's own component list comment, where the plan names
only `:42`); `src/tests/component/PageHeader.test.ts` (six references, one in a test title);
`src/tests/unit/audit/rules/rendered/rulings.weight-budget.test.ts` (three, one in a test title);
and `src/tests/unit/audit/rules/rendered/browser-regressions.test.ts:512`. The plan names only
the section at about `:655-670` and its fence at about `:667`, so the `:191` fence survives the
task and `check:snippets` goes red against the built package inside the task's own gate.
Correction: add the three `admin-toolkit.md` sites, `index.ts:6`, and the three test files to Task
10's Files, and say for the test files that the correction is a comment and a test title, never an
assertion.

**7. Every task / Plan:429 (global constraints), args `criteria` -- the plan never says what the
failing assertion is, and the executor's own contract demands one.** Evidence:
`cairn-implementer.md:24` makes "write it first, watch it fail, then make it green" step one of
its definition of done, and its workflow step 2 repeats it. Eleven of thirteen tasks have no
runtime assertion that can fail: a pure rename changes no behavior; the factory arity change
(decision 11) fails `svelte-check`, not a test; Task 10's only test motion is the DELETION of
`src/tests/component/OfficeList.test.ts`; Tasks 11, 12 and 13 touch no code at all. Only Task 7
names a new assertion (the unknown-contact `outcome: 'sent'` case). A zero-context Sonnet meeting
this gap will either invent a throwaway test to satisfy its own contract or report NEEDS_CONTEXT.
Correction: give each task a one-line "the failing gate" clause naming what goes red first and
what turns it green: `npm run check` for the two arity tasks (Tasks 2 and 3), `check:surface`
drift plus the compiler for the rename tasks, `check:snippets` for the doc fences,
`src/tests/unit/admin-sheet-inventory.test.ts` for Task 10's `gap-0` departure (fixture line 236,
with `gap-0.5` at 237 to leave alone), and `check:rulings-format` plus the Task 11 grep for the
ledger tasks; then state that the TDD clause is discharged by that gate rather than by a new test.

**8. Tasks 4, 6, 7, 9, 10 / Plan:32 (the pass's own sizing rationale) -- five tasks are past the
four-deliverable rule the plan invokes to justify its three splits.** Evidence, counting Task 6
as the worst: seven renames in `src/lib`, the scaffolder's pinned literal plus its builder, three
CLI test files, the showcase, the template with a re-emit, three gate record JSON files, four
reference pages plus extend guides by grep, the regenerated surface, eight ledger rows including
one disposition and one progress note, the changelog entry and the migration bullet. That is
eleven units, and the grep reach is the pass's widest: the seven names hit about 140 tracked
files today. Task 9 carries eight event renames plus a header grammar rewrite plus three doc
pages plus ten ledger rows; Task 4 carries six renames across two published packages plus three
record files plus five rows plus a conventions clause. Correction: split Task 6 at the
propagation boundary (the `src/lib` renames and barrels in one task; the scaffolder, template,
showcase, docs and records in the next), and split Task 9 at the vocabulary boundary (the six
`refused` renames in one, the two area moves plus the header grammar in the next). Both splits
keep one commit per task and add two gates, which finding 9 already budgets for.

**9. Plan:52 (token ceiling) -- the ceiling arithmetic prices thirteen dispatches and the
workflow can run twenty-six.** Evidence: args sets `maxFix: 1`, and `runTask` re-dispatches the
implementer and the reviewer once on a `fix` verdict, each fix round running the full gate again.
The plan's derivation is "thirteen gate-bearing units at 500K each is 6.5M, plus about 0.5M",
which leaves 0 headroom for a single fix round anywhere. Given the acceptance criteria's
precision (three counts per name, per-hit classification, verbatim ledger note formats), a fix
round on a third of the tasks is the likely case, not the bad case. Correction: state the ceiling
as thirteen tasks plus an assumed four fix rounds, or raise the ceiling and say what the 80
percent line then is.

**10. Plan:1955 (expected wall clock) -- thirteen sequential gates at 16 to 28 minutes is a long
unattended run and the plan arms no guard.** Evidence: the plan's own figure gives 3.5 to 6 hours
of gate time before any implementer or reviewer work, before fix rounds, and before the pass-end
ritual's second full gate in npm-script form. One chain, strictly sequential, single e2e slot.
The workstation rule is that past about thirty minutes the runaway guard is mandatory, and on
battery the sleep inhibitor and battery watchdog with it. Correction: add a pre-dispatch step
arming both, next to the existing four preconditions, with the procedure reference.

**11. Task 11 / Plan:1626 -- "Thirty-seven rows in all" against a list of forty-three.**
Evidence: the enumerated groups are seventeen charter-review rows, nine event rows, eleven
further rows and six conventions rows. Seventeen plus nine plus eleven is thirty-seven; the six
conventions rows are introduced by "Plus" in the same sentence and then counted in the acceptance
criterion ("The seventeen charter-review rows, the nine event rows, the eleven further rows, and
the six conventions rows named above are each confirmed present"). An implementer that trusts the
total stops six rows short. Correction: write forty-three, or say "thirty-seven audit rows plus
six conventions rows".

**12. Task 13 / Plan:1780 -- the release readiness follows the `cairn-release` skill on its four
load-bearing points and drops two of its smaller ones.** Evidence: the skill's free-number check
(`npm view @glw907/cairn-cms versions --json`), its bump rule quoted verbatim, its notes file, its
"package.json untouched", and its "derive the size HERE, at the cut" sentence are all present and
correctly attributed, and the plan leaves the cut itself as a separate conductor step (Ruled
inputs, Plan:14, and constraint 14). `npm view` reaches the registry from this machine (verified:
it returns `0.96.0`, so the highest published number the plan states is current). Two skill items
are missing. The skill's section 4 orders a per-version entry in `docs/guides/upgrade-cairn.md`,
which does not exist in this repo; a sentence in the draft saying `docs/extend/migration-notes.md`
supersedes it saves the conductor a hunt at the cut. The skill's Tailwind gotcha grep
(`grep -rnE '[a-z-]+-\[[^]]*(\||\*|\.\.\.)[^]]*\]' docs/ CHANGELOG.md ROADMAP.md`) is worth one
line in Step 1, since this pass writes thirteen changelog entries carrying admin class names and
the failure mode is a broken `npm run package`. Also worth a line: the skill's admin-surface
re-read of reproduction stories and their captions, which Tasks 1 and 10 both trigger.

**13. Task 1 / Plan:706 (Step 4) and Task 10 / Plan:1546 -- one OfficeList reference sits between
the two tasks with no owner.** Evidence: `src/tests/component/reproductions-stories.test.ts:990`
carries the comment "OfficeList alone supplies the page's one h1 (via its own composed
PageHeader, Task 9)". Task 1 edits that file and its criteria say nothing about the comment; Task
10's grep will then find it, but Task 10's Files does not carry the file and its acceptance
implies Task 1 settled the reproduction. Correction: name the comment in Task 1 Step 4, which
also discharges global constraint 2 (the comment cites a pass and a task number).

**14. Task 12 / Plan:1714, Task 13 / Plan:1804 -- the `Consumers must:` count is 67 at the
current head, not 68.** Evidence: `sed -n '1,1542p' CHANGELOG.md | grep -c "Consumers must:"`
returns 67 at `0705776e`. The plan already rules the number "evidence for the release-notes draft,
never an acceptance number" and orders a re-derivation, so nothing breaks; the number is drifting
between plan authoring, chassis-B2's in-flight commits, and dispatch, and the criteria hand it to
two tasks as "measured at plan authoring". Correction: keep the re-derivation order and drop the
figure from the criteria strings, or mark it "expect drift".

## Rename method verdict

The method is grep, then compiler, then grep, with three counts reported per name and every
residual classified, and the plan contains no codemod, `sed` recipe, or per-identifier file
enumeration (zero hits for `codemod`, `jscodeshift`, `ts-morph` or a `sed` invocation; four
instances of "let the compiler find the call sites"). That is adequate for the compiled half of
the sweep and inadequate for the rest: TypeScript and Svelte call sites are found by
`svelte-check` under NodeNext and cannot be missed, but the same thirty identifiers reach 279
tracked files outside the two write-once archives today (the plan measured 281 at `f273274e`, so
its number is honest), and the uncompiled residue is exactly where a rename rots. Markdown
reference pages and extend guides, the three gate record JSON files, the scaffolder's `.mjs`
literal and its three `.test.mjs` assertions, SQL migrations, and comments and test titles inside
`src/tests/` are all grep-only surfaces, and three of the pass's gates (`check:snippets`,
`check:symbols`, `check:template`) only catch the subset that is a fenced snippet, a named event,
or an emitted template. The plan compensates well in places (Task 6 pins `finalize.mjs:21`
character for character and makes the CLI suite the proof) and badly in others (findings 2, 3 and
6). The fix is not a codemod; it is a per-task enumeration of the non-compiled hit list, produced
by the task's own Step 1 grep and pasted into the report before any edit, plus a complete residual
taxonomy so the classification step has a name for every path the grep can return.

On the surface snapshot: the plan does spell out `check:surface --update` with the regenerated
`docs/internal/api-surface.md` committed in the same commit, for every surface-changing task, in
three places (global constraint 5, the Gate section's addition 1, and each task's own Steps and
acceptance), and it correctly names Tasks 2, 3, 4, 5, 6, 7, 8 and 10 as the surface-changing set
and Tasks 1, 9, 11, 12 and 13 as the set whose acceptance is that the file stays out of the diff.
The rule is spelled out; the command is wrong (finding 1).

## Gate and sizing

The gate string is byte-identical between the plan and args, every one of its thirty-nine
commands resolves to an existing npm script or `scripts/checks/*.mjs` file, and the package-once
rule is stated in the plan and repeated in the args notes, so the twelve dependent checks run at
their node entry points against one build. That part is executable as written.

Cost. Thirteen gate-bearing units at 500K is the plan's 6.5M, and the band it cites (370K to 530K
over four comparable passes) is defensible for tasks 1, 3, 5, 8, 11 and 12. Tasks 4, 6, 7, 9, 10
and 13 sit above it: Task 6 alone touches seventeen named files plus two package trees plus three
JSON records plus eight ledger rows and reads a grep surface of about 140 files, and Task 13 reads
a 1,541-line changelog window and writes four documents. Split Task 6 at the `src/lib`-versus-
propagation boundary and Task 9 at the `refused`-versus-area-move boundary (finding 8); that is
fifteen tasks, which at the same per-task figure is 7.5M and pushes the ceiling, so raise the
ceiling to 9M rather than pretending fifteen tasks and up to fifteen fix rounds fit in 7M
(finding 9).

Wall clock. The plan's 16 to 28 minutes per gate, times thirteen, is 3.5 to 6 hours of gate alone;
with implementer and reviewer turns and a realistic four fix rounds the run is an 8 to 14 hour
single-threaded night. Nothing in the plan can be parallelized away, and the plan is right that it
cannot: the single 4173 e2e slot, `CHANGELOG.md`, `docs/internal/api-surface.md` and
`docs/internal/engine-rulings.md` are contended by nearly every task. The correct response is not
a second chain but the unattended-work guards (finding 10) and a checkpoint discipline the plan
already carries.

Task 13 on Sonnet. It is the one task in the pass whose deliverable is synthesis rather than
mechanical change: reconciling a 1,541-line window, summarizing every held pass, deriving a bump
size against a quoted rule and reporting a disagreement with the existing marker, closing a
ROADMAP initiative while distinguishing sub-bullets that shipped from ones that did not, and
writing the HISTORY entry a later pass reads instead of rediscovering. It is also the artifact the
conductor's release cut inherits. Sonnet can execute the mechanical half; the size derivation and
the ROADMAP close are where a weak answer is expensive and invisible. Upshift it, which as
finding 4 shows means dispatching Task 13 outside the chains workflow with the Agent tool and
`model: opus`, or teaching the script a per-task model. Task 12 is the next candidate and can stay
on Sonnet if its taxonomy gap is closed first.

## Checked and found executable

- Both args files are byte-identical, so a re-run from `run1-args.json` reproduces the same
  thirteen dispatches.
- The `gate` string in args matches the plan's `## Gate` fence exactly, and every command in it
  resolves: eighteen npm scripts and fourteen `scripts/checks/*.mjs` entry points all present.
- The `notes` string is identical across all thirteen tasks and carries the global constraints an
  implementer needs before its Files block: the surface rule, the snippets rule, the three record
  files, the rename method with its three counts, the ledger annotation rule, the em-dash and
  process-citation bans, TSDoc, the changelog and migration pairing, the STATUS and version
  prohibitions, the commit footer verbatim, and the package-once and e2e-slot gate hygiene.
- The paint protocol is embedded verbatim in every `criteria` string, each task states its branch
  ("no-rendered-surface") with the reasoning inline, and args carries no `paintProtocol` key, so
  `pass-execute-chains.js` appends nothing and the protocol appears exactly once per dispatch. The
  no-capture branch is the right one: the capture matrix is `home`, `article`, `styleguide`,
  `archive2`, `error404`, `signups`, and no task in the pass changes code any of the six renders.
- Every ruling slug the plan names exists as a heading in `docs/internal/engine-rulings.md`, all
  fifty-five of them, so no ledger step points at an unreachable row.
- The header's stale allowlist claim is real and correctly measured:
  `docs/internal/engine-rulings.md:26` says forty and
  `scripts/checks/check-rulings-format-allowlist.json` holds one slug.
- The scaffolder anchor is exact: `packages/create-cairn-site/src/github/finalize.mjs:20-21`
  declares `TEMPLATE_GITHUB_APP_LITERAL` with the literal the plan quotes character for character,
  `buildRealLiteral` re-emits it at `:32`, and the three named test files assert it.
- Every other path the plan names exists, including
  `src/tests/unit/fixtures/admin-sheet-inventory.txt` (with `gap-0` at line 236 and `gap-0.5` at
  237, so the "only change is the gap-0 departure" acceptance is checkable),
  `examples/showcase/scripts/capture-surfaces.mjs`,
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`, both templates'
  chassis and media routes, and `src/tests/component/OfficeList.test.ts`.
- The criteria strings condense their plan tasks without dropping a step: each carries every
  numbered Step, every acceptance bullet, the task's own decisions where an implementer would
  otherwise have to judge (Task 6's "the implementer never picks between the candidates", Task 3's
  "do NOT rename createMediaRoute", Task 4's "do NOT reshape 11b's bag"), and the stop-and-report
  conditions (Task 10's Task-1-must-have-landed check). The `files` arrays match the plan's Modify
  lists minus its read-only entries, which the criteria name in prose instead.
- Ordering is sound and stated twice: Task 1 before Task 10, and Tasks 2 through 10 before Tasks
  11 and 12, with a per-halt state list. The chain script halts the whole chain on any non-accept
  verdict, which matches the plan's rollback semantics.
- `npm view @glw907/cairn-cms version` reaches the registry from this machine and returns
  `0.96.0`, so Task 13 Step 2 is executable and the plan's stated highest published version is
  current.
