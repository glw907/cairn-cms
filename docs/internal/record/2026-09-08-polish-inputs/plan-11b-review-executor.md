# Polish-11b plan review, executor and plannability lens

Adversarial read of `docs/superpowers/plans/2026-09-08-polish-11b-pass.md` (uncommitted, 1838 lines)
and its dispatch args `~/.cache/cairn-polish-11b/{args,run1-args,run2-args,run3-args}.json`, against
the executor that will actually run them: `cairn-implementer` (Sonnet, zero conversation context,
tools Read/Write/Edit/Bash/Grep/Glob), reviewed per task by `diff-reviewer` (Opus, read-only),
driven by `~/.claude/workflows/pass-execute-chains.js`. Fresh context, read-only except this file.
Every claim below was measured against `main` at `f944ca4e` in the main checkout.

The lens is narrow on purpose: can a zero-context Sonnet execute each task from the plan section
plus its args strings alone, is every acceptance criterion checkable, does the paint protocol
survive an end-to-end walk, and is the pass sized honestly. Design quality, charter fit, and
whether the findings are worth fixing at all are somebody else's lens.

Twenty findings. Three are hard blockers that will halt or corrupt a chain as written; six are
guaranteed fix rounds (an acceptance criterion the task cannot satisfy without an edit the task
does not name); the rest are ambiguity and sizing.

**What is sound, stated once so the findings read as exceptions.** The gate string is byte-identical
across the plan and all four args files and faithfully unwraps every committed `test.yml` gate: the
twelve npm scripts absent from the string in npm-run form are exactly the twelve invoked at their
node entry points, and `check:surface`'s second script (`check-surface-leaks.mjs`) is carried too.
The run split is exactly 1 to 5, 6 to 10, 11 to 16; every args file is jq-valid; each run file's
task objects are byte-identical to `args.json`'s. No `paintProtocol` field exists in any args file,
so the runner's `a.paintProtocol` append is inert and the protocol rides once, inline, in each
`criteria` string: there is no duplication. The line anchors I spot-checked are accurate or
accurate to the drift the Reconciliation block already declares (`guard.ts:348` and `:368`,
`index.ts:20` and `:25`, `ambient.ts:48`, the eight `AdminLayout` references, `hooks.server.ts:20`
and `:32`, the signups route's `:15`/`:17`/`:19`/`:36-40`, `cairn-admin.css:566`, `:628-633`,
`:1111-1113`, `admin-visual.spec.ts:9-13`/`:16-21`/`:222-228`). The twenty-eight admin baselines are
named correctly, file for file. And the ordering premise Task 11 to Task 12 rests on holds:
`access.ts`'s `canReach` reads an unmapped target permissively, so the showcase's first access
declaration cannot lock the engine's own screens out from under the e2e suite.

## Ranked findings

**1. Task 11 / Plan:1261-1263, :1281 -- the implementer is ordered to dispatch a subagent it has no
tool to dispatch, and the acceptance requires that agent's report.** Step 5 reads "dispatch
`web-auth-security-reviewer` over this task's diff ... Fold its findings before the commit", and the
acceptance line is "The `web-auth-security-reviewer` report is in the task summary with its findings
and their disposition". `~/.claude/agents/cairn-implementer.md:4` declares `tools: Read, Write, Edit,
Bash, Grep, Glob`. There is no Agent tool and no Task tool. The three outcomes are all bad: the
implementer reports BLOCKED and the chain halts (`runChain` defers Tasks 12 to 16, which is every
remaining task in run three), or it silently skips the step and `diff-reviewer` blocks on the missing
report, or it writes a "security review" of its own diff and labels it as the agent's, which is
fabricated evidence inside an auth change. Correction: move the security review out of the task. Run
`web-auth-security-reviewer` as a conductor dispatch between Task 11's accept and Task 12's launch
(the plan already has a natural pause there, and Task 12 is the task whose e2e depends on 11), and
strike the acceptance line. If it must stay in-chain, the runner is the only thing that can do it,
and it has no hook for a third agent.

**2. Task 5 / Plan:770, :778-782, :805 vs Plan:385-394, :449-456 -- the task orders a before and
after capture pair and a six-surface TILE DIFF, and its own paint branch orders it to capture
nothing.** Step 1 is "the task before capture set, per the paint protocol, at this task's parent
commit"; Step 6 is "the after capture set ... Report `TILE DIFF:` for every captured surface, which
must be AE 0 on all six"; the acceptance repeats "Every captured surface reports `TILE DIFF:` AE 0".
The same string then ends with "THIS TASK'S PAINT BRANCH: full protocol, no capture pair ... capture
nothing and report `CAPTURES: none (capture matrix reaches no admin screen this task moves)`", which
is what Global constraint 13 and the branch ruling at :449-456 rule for every non-`signups` task.
Both halves are inside the one `criteria` string the implementer and the reviewer read
(`args.json`, task 5), so this is not a plan-versus-args drift the implementer can resolve by
reading the plan: the plan contradicts itself the same way. The capture is not free either, since
`capture-surfaces.mjs` starts its own `VITE_CAIRN_E2E=1 npm run build && npm run preview` on port
4173 (`examples/showcase/scripts/capture-surfaces.mjs:299-312`), so a pair is two extra showcase
builds. Correction: pick one. The defensible reading is that Task 5 captures the six matrix surfaces
purely as a leak proof (none renders a segmented control, hence "AE 0 on all six"), so keep Steps 1
and 6 and rewrite the branch paragraph to "full protocol WITH a capture pair, captured as a
paint-neutrality proof on the public matrix"; otherwise strike Steps 1 and 6's capture sentences and
the AE-0 acceptance.

**3. Tasks 13 and 14 / Plan:1370, :1395-1397, :1440, :1468-1470 -- the test-first step has no harness
in the repo it names.** Both tasks name "the showcase's own unit suite" as their test home and then
demand DOM-level assertions: visible labels read through the accessible name, announced text from a
failed create, "two different accessible names from two rows", and "the destructive POST does not
fire without the confirm". `examples/showcase/package.json` has `test:unit: vitest run` with no
`test` block in `vite.config.ts` at all, so vitest runs in the default node environment; the
devDependencies carry no jsdom, no `@vitest/browser`, no testing-library, and no
`vitest-browser-svelte`. Every one of the five existing showcase unit tests is a pure module test
(`src/chassis/date.test.ts`, `src/theme/components/admin-link.test.ts`, and so on); nothing in the
showcase has ever rendered a component. The engine's own component project is a chromium browser
project scoped to `src/tests/component/**` (`vitest.config.ts:108-152`) and cannot mount an
example's route module. So the implementer's choices are to add a browser test stack to the showcase
(new tooling surface no task authorizes, and a change to `examples/showcase/package.json` neither
task lists), to write the assertions into `examples/showcase/e2e/custom-screen.spec.ts` (which both
tasks list as read-only), or to skip TDD and report it. Correction: name the harness. Either
authorize the e2e spec as the home for these four assertions and drop "not in the diff" for Task 13
and 14 (Task 12's copy of that constraint can stay), or add a task ahead of 13 that installs the
showcase's component-test harness and state that its cost belongs to the pass.

**4. Task 9 / Plan:1080-1084, :1094 -- "capture that state by hand in both schemes" names no
mechanism, no output path, and no way to reach the state, and contradicts the same string's capture
branch.** The confirmation block is genuinely unbaselined: `admin-visual.spec.ts:58-73` screenshots
`/admin/login` in its form state only, and `auth-confirm-*` is the separate
`/admin/auth/confirm?token=preview-token` page (`:76-91`). Reaching LoginPage's post-submit state
therefore means starting the showcase preview with the dev backend, submitting the sign-in form once,
and screenshotting in both schemes with the `cairn-admin-theme` cookie set. That recipe exists in the
plan, at :1748-1764, inside the pass-end verifier section, which the implementer is never told to
read (the runner's prompt orders "Global constraints", "Ruled inputs", and "Task 9" only). Task 9's
own branch paragraph meanwhile says capture nothing. Net: an acceptance criterion ("the `READ ME:`
line names a rendered confirmation-state capture in BOTH schemes") that the implementer has no
stated way to satisfy. Correction: inline the four-line recipe (cookie on `baseURL`,
`emulateMedia`, submit the form, `fullPage` screenshot to `~/.cache/cairn-polish-11b/task-9/`) into
Task 9's criteria, and say plainly that this hand capture is the one exception to its no-capture
branch.

**5. Task 10 / Plan:1155-1156 -- the stop condition is defined on a unit that measurement makes
ambiguous, and the honest re-grep returns 28, not 26.** Step 1: "re-grep the glyph population with a
three-line lookahead and report the count. A count other than 26 is a stop-and-report." I ran exactly
that method. By line, the population is 26 and the plan's per-file line list is exact, file for file
(I diffed all nine files' line sets against the Files block: every one matches). By hit, it is 28,
because two lines carry two glyph tags each: `CairnAdminShell.svelte:705`
(`{#if theme === 'cairn-admin'}<MoonIcon .../>{:else}<SunIcon .../>{/if}`) and
`MediaReplaceDialog.svelte:365` (`<TriangleAlertIcon>`/`<RefreshCwIcon>` in one `{#if}`). Step 2
("mark all 26 `aria-hidden="true"`") is therefore 28 attribute insertions. A literal implementer that
counts grep hits trips the stop condition on its first step and halts run two's last task; one that
counts lines marks 26 tags and leaves two glyphs bare, and the acceptance's own re-grep ("returns no
bare decorative glyph") then fails. Correction: state "26 sites, 28 tags, two lines carrying an
`{#if}`/`{:else}` glyph pair (`CairnAdminShell.svelte:705`, `MediaReplaceDialog.svelte:365`)", and
define the stop condition on the line count.

**6. Task 9 / Plan:1087 -- the acceptance grep is unsatisfiable inside the task's own scope.**
`grep -nE "\[var\(--|style=" src/lib/components/LoginPage.svelte` must return nothing. Measured, the
file has three hits: `:107` (`text-[var(--color-success)]`, in scope), `:108` (the inline `style=`,
in scope), and `:116` (`rounded-[var(--radius-field)]`), which is a radius token on the help panel
that no step touches and that the task's own Decisions block does not mention. The Decisions block
states the constraint correctly and narrowly ("the diff adds no `style=` attribute and no
`[var(--...)]` bracket to this component"); the acceptance then states it globally. As written the
implementer must either fail the criterion or make an out-of-scope edit to `:116`, and
`diff-reviewer` has no basis to accept either. Correction: scope the grep to the fill tone, for
example `grep -nE "style=|\[var\(--color-" src/lib/components/LoginPage.svelte`, or add `:116` to the
task with a stated reason.

**7. Task 7 / Plan:957 -- the acceptance grep forces a comment edit no step names.**
`grep -nE "badge-(warning|info|neutral)" src/lib/components/EditPage.svelte` must return nothing.
Measured, there are four hits: `:837`, `:838`, and `:1425` (the three the steps remove) and `:832`, a
comment that reads "Edited and New are attention states and stay on the stock daisyUI
badge-warning/badge-info". That comment is precisely the rationale Task 7 overturns, so rewriting it
is right, but no step orders it and the Decisions block does not mention it. Correction: add a step
"rewrite the rationale comment at `:832` to state the quiet register and the label-as-signal reason",
which also keeps the task inside Global constraint 2's rewrite-never-delete habit.

**8. Task 6 / Plan:891 -- same shape, one line lower confidence.**
`grep -n "aria-disabled" src/lib/components/ShareLinkPanel.svelte` must return nothing. Measured,
three hits: `:184` and `:193` (the bindings the task drops) and `:176`, the comment the task is told
to rewrite ("aria-disabled, not the native attribute (the repo's guarded-control pattern ..."). The
natural rewrite of a comment about converging off `aria-disabled` onto native `disabled` names both
attributes, and then the grep fails. Correction: say so in the step, for example "the rewritten
comment states the busy rule without naming the retired attribute", or scope the grep to
`aria-disabled=`.

**9. Plan:41-54 vs :1705-1788 -- the token ceiling is derived over sixteen task chains and omits the
pass-end ritual, the fix rounds, and the verifier fan-out.** The arithmetic is explicit: sixteen
units at the band's middle of 450K is 7.2M, plus 0.3M for "the two mid-chain conductor CI regen waits
and the two render-and-tile-read proofs", against a 7.5M ceiling. Not counted: `maxFix: 1`
(`args.json`), so a `fix` verdict buys a second full implementer dispatch plus a second Opus review,
roughly 0.6 of a unit; the plan's own six guaranteed-fix-round criteria above make several of those
near certain, and one fix round on a third of the tasks is about 1.5M. Also uncounted: the pass-end
`code-simplifier` over sixteen commits of component work, three reviewer fan-outs
(`daisyui-a11y-reviewer` over seventeen files, `svelte-reviewer` over the same, a second
`web-auth-security-reviewer`), the third CI regen, and the `visual-verifier` (finding 12: ninety
full-page captures). Honest total is nearer 9M to 10M than 7.5M, which matters because the plan's own
80-percent rule then fires around Task 11 and forces a stop question mid run three. Correction:
either raise the ceiling to about 9.5M with the fan-out and fix rounds named as line items, or move
the pass-end ritual out of the ceiling explicitly and say the ceiling covers task chains only.

**10. Task 11 / Plan:1219-1249, :1268-1276 -- the seam's signature is specified, the exemplar it
depends on is not.** The engine side is precise and correct: `access?: AccessMap` and
`roles?: RolesDeclaration` on `DevBackendOptions`, both exported (`src/lib/index.ts:20`, `:25`),
mirroring `guard.ts:348` and `:368` (both real, both on admin paths), attaching
`event.locals.cairnAccess` where the handle mints `cairnEditor` (`handle.ts:127-138`), and
`createAuthGuard` already takes `access` (`guard.ts:34-48`, `:164-166`), so the showcase wiring adds
no engine surface. Three things are left open that the next task depends on. (a) The declaration's
module path is "the implementer's", so Task 12 and the template mirror inherit an unnamed file. (b)
The rule's role list is unstated. `defineAccess` refuses an empty list and refuses a role outside the
vocabulary (`access.ts:75-84`), and the dev backend mints `role: 'owner'` while the guard branch
resolves a real roster row, so the wrong list turns Task 12's e2e red for a reason Task 12's steps
attribute to something else. (c) `roles` is added and, by the task's own text, wired to nothing;
whether `devBackendHandle` should resolve capability from it or leave it inert is left unsaid, and an
inert public option is exactly the kind of thing `diff-reviewer` flags as unspecified. Correction:
name the path (`examples/showcase/src/access.ts` reads as the exemplar), write the rule literally
(`{ '/admin/signups': ['owner'] }` or with the editor role, whichever Task 12 needs), and state in
one line that `roles` stays inert in this pass and why.

**11. Plan:1741-1767 -- the pass-end verifier recipe is mechanically executable but names no
reference set, so it cannot do the job the `visual-verifier` agent exists to do.** Everything
procedural is there and correct: the cookie on `baseURL`, `emulateMedia`, `setViewportSize`,
`fullPage`, the settling locator, the nine routes, both schemes, the five widths, the two unbaselined
states, the output path. The anchors it cites are real (`admin-visual.spec.ts:16-21`, `:222-228`,
`:9-13`), with one drift: the recipe says `height: 900` where the spec uses `height: 800`, which is
harmless under `fullPage` but contradicts "this is exactly" the cited lines. What is missing is the
comparison: no before set captured at the pass's parent commit, no reference directory, nothing the
verifier is told to compare against, where chassis-B1 and B2 both gave it one. The agent's own
contract is "compares rendered UI against reference images (separate labeled blocks, never
composited)"; handed one set, it degrades to a subjective "does this look right", which is precisely
the read the fresh-context gate exists to replace. Correction: add a step 0 to item 8, capture the
same nine routes and two states at the pass's parent commit into
`~/.cache/cairn-polish-11b/verify/before/`, and hand the verifier both sets.

**12. Plan:1765-1767 -- the verifier is told to read ninety full-page PNGs "as tiles the way the
paint protocol requires", and nothing tiles them.** Nine routes plus two states, times two schemes,
times five widths, is one hundred and ten captures; the plan's own output template
(`verify/<route>-<scheme>-<width>.png`) writes full-page files. The only tiler in the repo is
`capture-surfaces.mjs`, whose matrix reaches six surfaces, one of them admin, so it cannot tile these
routes; and the paint protocol's own cap is twelve tiles per read. Correction: either cut the matrix
(the family five-viewport bar on the three routes this pass actually recomposes, both schemes, is
thirty captures), or add the tiling step and name the command, or say plainly that the verifier reads
full-page renders here and drop "as tiles".

**13. Task 5 / Plan:784-789 vs :424 -- the render proof asks a grader to judge a 3.5:1 ring on a
downscaled full-page screenshot, which the same criteria string forbids two paragraphs later.** The
`READ ME:` line names `admin-media-light-linux.png`, `admin-media-dark-linux.png`,
`admin-edit-page-{light,dark}-linux.png` and the two `admin-media-detail` files, and the reviewer is
to state "whether the pressed segment is now distinguishable in both schemes". Those are the
regenerated baselines, which are full-page files; the protocol in the same string says "a grader
reads tiles, never a full-page file". The subject is a one-pixel inset ring at 55 percent
`base-content` on a 24px icon-only button inside a full-page media-library render. Correction: crop.
Name a `magick` crop of the density toggle's region out of the two media baselines as the artifact
the reviewer reads, or have the task capture the toggle at its own scale and name those files.
Task 13's render proof has no such problem: it reads the before-set tiles for `signups` at 320 and
390 in both schemes, which the capture pair actually produces, and its retire-or-fix branch is
stated cleanly.

**14. Plan:76-84, :815-819, :1190-1194 -- the protocol regenerates baselines locally, the repo's
standing rule is that CI is the canonical renderer, and no task says what happens when the two
disagree.** Every paint task regenerates moved baselines locally by file path and must then pass a
local `CI=1 npm --prefix examples/showcase run test:e2e` inside the same gate. Between runs the
conductor regenerates on CI and pulls the result. From that point every remaining task's "run the
visual suite unmodified to PRODUCE `MOVED BASELINES:`" runs local renders against CI-generated
baselines, and the gate demands it exit 0. The workstation rule and this repo's own history are
explicit that baselines regenerate on CI as the canonical renderer (`docs/HISTORY.md:493-494`), which
is a statement that local and CI renders are not assumed identical. If they differ at all, run two's
first paint task produces a moved list full of surfaces it never touched and its gate cannot go
green. Correction: state the assumption and its fallback in one line, for example "local and CI
renders have matched on this machine through chassis-B; if a pulled baseline fails locally on an
untouched surface, that is a renderer difference, not a finding: report it and let the CI regen
settle it".

**15. Task 8 / Plan:1007-1010 -- an SSR assertion with no SSR harness anywhere in the repo.** Step 1
ends with "Assert the SSR markup for a 390px request contains both branches". `grep -rn "svelte/server"
src/tests src/lib` returns nothing; the component project is chromium browser mode
(`vitest.config.ts:145-151`), and nothing in the suite has ever rendered a component on the server.
The width half is fine and reachable (`page.viewport(w, h)` is used at
`src/tests/component/reproductions-containment.test.ts:55`, though no task names it). The SSR half is
not, and because the acceptance criteria omit it while the step demands it, the likely outcome is a
client-render assertion labeled as SSR, which proves nothing about the first-paint claim the whole
task rests on. Correction: drop the SSR assertion and let the responsive-class argument stand on the
markup, or name the harness (a `render` from `svelte/server` in the unit project, with the
`$app/*` aliases the component project already declares) and accept that it is new test
infrastructure.

**16. args (all four) -- no task carries a `model`, so all sixteen run Sonnet, including the two the
workstation rule would upshift.** `pass-execute-chains.js:127` and `:156` now spread
`...(t.model ? { model: t.model } : {})` into the implementer dispatch, so the mechanism exists; no
task object in any args file has the key. Against the rule ("opus for novel correctness-critical
logic the plan does not specify"), Task 11 qualifies on both halves: it is the pass's only
authorization-seam change, and finding 10 shows the plan leaves three load-bearing decisions to the
implementer. Task 12 does change the auth path, but the plan specifies it tightly (`ownerOnly` stays
on remove, the load keeps `requireOwner`, fail-closed reasoning given, verbs reported not chosen) and
its failure mode is a red e2e the per-task gate catches, so Sonnet plus the gate is adequate.
Correction: add `"model": "opus"` to Task 11 in `run3-args.json` (and `args.json`, kept in step).

**17. Files blocks (Tasks 2, 4, 6, 7, 8, 9, 10, 13, 14) -- the test files the tasks create are in no
Files block, and the implementer is told to commit only the files the task lists.**
`cairn-implementer.md:41` says "Commit only the files the task lists (never `git add -A`)". Task 11 is
the one task whose Files block names its test (`packages/cairn-cms-dev/src/handle.test.ts`); the other
eight test-bearing tasks name a suite in prose ("the shell's own component suite", "the edit page's
component suite") and never a path. The implementer must invent the path and then commit a file its
instructions say not to commit. Correction: name the file per task (`src/tests/component/<Name>.test.ts`
is unambiguous for seven of them once the harness question in finding 3 is settled).

**18. Task 1 and Task 15 / Plan:500-502, :1541-1542 -- the ruling rows are specified by slug alone,
and the ledger's heading convention carries more than a slug.** Both tasks say to write
`## polish-busy-idiom` and `## polish-formattimestamp-domain`. Every existing row reads
`## <slug>: <title>  (<verdict>, <date>, <source>)`, for example
`docs/internal/engine-rulings.md:2670`, and `check-rulings-format.mjs:23` parses headings as
`/^## ([a-z0-9-]+):/`, so a bare-slug heading is not even seen by the gate: the row can be malformed
and `check:rulings-format` still passes, which means the acceptance criterion "`npm run
check:rulings-format` passes" proves nothing about the new rows. Correction: give the heading form in
the criteria, and add an acceptance that the new heading matches `^## <slug>: `.

**19. Task 5 / args task 5 acceptance -- the read-but-unchanged list is miscounted and mislabeled,
and the `MediaHeroField` edit is underspecified.** The args string reads "the five read-but-unchanged
caller files (CairnTidySettings.svelte, TidyReview.svelte, CairnMediaLibrary.svelte, EditPage.svelte,
and scripts/checks/custom-surface-budget.json)". There are four caller files (holding six call sites,
which is the number the plan is thinking of), and the budget JSON is not a caller. Separately, Step 5
drops `focus-visible:ring-1` from `MediaHeroField.svelte:450`, and the acceptance checks for
`outline-none` and `focus-visible:ring-1`; measured, the same class attribute also carries
`focus-visible:ring-[color-mix(in_oklab,var(--color-primary)_70%,transparent)]`, which no criterion
names. Dropping the width but keeping the color leaves a ring at the default width and the acceptance
passes anyway. Correction: fix the count, and say "no `focus-visible:ring-*` utility remains on the
dropzone trigger".

**20. Plan:1650-1659 -- the "package once" claim is true of the head of the string and false of its
tail.** The rewrite is a real saving and the reasoning is right, but the string ends with
`CI=1 npm --prefix examples/showcase run test:e2e`, and that script's `pretest:e2e` is
`npm --prefix ../.. run package` (`examples/showcase/package.json`). So the gate builds the package
twice per task, not once. Harmless (the second build is what makes the e2e prove the current tree),
but the plan states it as once and a later pass will inherit the wrong number. Correction: one
sentence, "twice: once at the head, and once more inside `pretest:e2e`, which is what makes the e2e
prove this tree".

## Paint walk

Walked end to end as the args state it, per task: the before set or the no-capture branch, the
declared `INTENDED MOVES:`, the produced `MOVED BASELINES:` from the unmodified suite, local
regeneration by file path, the manifest row under `## Polish-11b`, and `READ ME:`, then whether the
full gate can still exit 0 afterward. Nine paint tasks (2, 5, 6, 7, 8, 9, 10, 13, 14).

- **Task 2 (drawer toggle): passes as written.** No-capture branch, produced list, local regen, rows,
  `READ ME:` names the regenerated PNGs. The one soft spot is that the toggle's box change may move
  nothing at all (the baselines render at Playwright's default viewport, where the drawer is open),
  in which case `INTENDED MOVES:` names a mover and `MOVED BASELINES:` is empty and the two lists do
  not match name for name. The task should be told that an empty produced list means `INTENDED
  MOVES: none`, not a defect.
- **Task 5 (pressed cue): does not pass as written.** Finding 2: capture and do-not-capture in one
  string. Finding 13: the render proof reads full-page files against the protocol's own tile rule.
  The rest of the walk is sound and the expected movers are named with real baseline filenames.
- **Task 6 (live regions): passes as written.** Expects an empty moved list with a stated fallback,
  which is the right shape for a hoist that renders nothing when empty.
- **Task 7 (chip vocabulary): passes as written on paint.** Four real edit-page baselines named, rows
  in the same commit, `READ ME:` names the four regenerated PNGs. Its blocker is finding 7, not paint.
- **Task 8 (SSR composition): passes as written on paint,** and the extra instruction to state
  explicitly whether `admin-edit-page-768` shows the same composition is exactly the right question
  for this change.
- **Task 9 (login tokens): does not pass as written.** Finding 4: the by-hand confirmation capture has
  no recipe and contradicts the task's own branch.
- **Task 10 (small conformance): passes as written on paint.** The body-margin rescope is correctly
  named as the paint risk and the produced list settles it. Its blocker is finding 5.
- **Task 13 (signups form): passes as written on paint,** and it is the best-specified paint task in
  the pass: a real capture pair, tiles that exist, a render proof with a named retire-or-fix branch,
  all ten `admin-signups-*` baselines named correctly. Its blocker is finding 3.
- **Task 14 (destructive row): passes as written on paint,** with the same capture-pair shape. One
  gap: its before set is captured at its parent commit, which is Task 13's commit, so the two tasks'
  before sets differ and the write-once directories will not collide. Worth one line so an
  implementer does not try to symlink Task 13's set and hit the non-empty refusal
  (`capture-surfaces.mjs:338-344`).

Verdict: **seven of nine walk clean; Tasks 5 and 9 cannot be executed as written.** Both are capture
contradictions, both are one paragraph's fix.

## Gate and sizing

**The gate string is honest and expensive.** It unwraps every committed `test.yml` gate faithfully
(verified set against set), and it is not a shortened list. Per task it runs: `svelte-package` plus
the admin-CSS build plus the dist-Svelte transpile; `svelte-check`; three vitest projects (302 unit
specs, the integration project under workerd, and 78 chromium component specs with `retry: 2`); about
thirty node checks; the showcase's `check`, `test:unit`, and `format:check`; and the full showcase
e2e, which is 33 spec files and rebuilds the package again through `pretest:e2e`. Add, on a paint
task, one unmodified visual-suite run and one regeneration run, each a `CI=1` build-and-preview cycle
because `reuseExistingServer` is false under CI, and on Tasks 13 and 14 two more full showcase builds
for the capture pair. A single task's gate is a tens-of-minutes proposition and a paint task's is
multiples of that; sixteen sequential tasks plus fix rounds is most of a day of wall clock, before
the three CI regen waits (`e2e.yml` installs both lockfiles, installs chromium, and runs a default
build plus a flagged build before the specs) and before the pass-end ritual. Clock time is a watched
metric rather than a budget, so this is a scheduling note, not an objection: it does mean the run
should be armed with the unattended-work guards, and that "one end-to-end slot per machine" forbids
anything else running on this workstation for the duration.

**Which tasks exceed the 450K band.** Task 13 and Task 14 carry a capture pair, tile diffs per tile,
a template re-emit, and a render proof, and Task 13 additionally has to invent a test harness
(finding 3): both are over. Task 10 has four deliverables spread over eleven files, 28 attribute
insertions, a budget-file edit, and its own stop condition: over. Task 11 adds a package option, a
new exemplar module, a template question, and an in-chain security review it cannot run (finding 1):
over. Task 5 and Task 6 each touch several files with a render or a five-file hoist: at the top of
the band. Tasks 1, 3, 12, 15, 16 sit at or under the middle. That is roughly five tasks over the
band's middle, which is what makes finding 9's arithmetic optimistic even before fix rounds.

**Upshifts.** Task 11 warrants `model: "opus"` on both limbs of the workstation test; Task 12 does
not (the plan specifies it, and the e2e catches the failure mode). See finding 16 for the mechanism,
which now exists in the runner and is simply unused.

## Checked and found executable

Stated per task so the findings above read against a baseline rather than as the whole verdict. "Executable"
means a zero-context Sonnet can act on the section plus its args strings without inventing a
requirement.

- **Task 1 (design system, ruling row, eight renames): executable,** except the ruling heading form
  (finding 18). The eight `AdminLayout` references are real and exactly eight, the grep-based
  acceptance is clean, and "no file under `src/` or `examples/`" is a checkable diff assertion.
- **Task 2 (keyboard blockers): executable.** The two conditions on the shell handler are stated with
  the reason (CodeMirror's `contenteditable`), the checkbox's kept attributes are named, and the Close
  menu shape is an explicit report-what-you-chose rather than a hidden judgment call. The two
  `editor-shortcuts.ts` rows leave wording to the implementer inside a stated constraint, which is the
  right amount of latitude. Missing: the test file path (finding 17).
- **Task 3 (palette trigger, keying, names): executable,** and the cleanest task in the pass. Every
  criterion is a grep or a component assertion, and the duplicate-label case is ruled as a stop
  condition rather than left to a silent fallback.
- **Task 4 (combobox): executable, with one gap.** The shape is pinned to `MediaPicker`'s by line
  number, the file is in the repo and readable, the keyboard model is fully stated (arrow wrapping,
  Enter on the active option, Enter with no active option keeping today's first-result behavior,
  Escape unchanged), the always-rendered listbox has its WCAG reason, and `submitPalette` is named as
  changing shape. The gap: no id scheme for the options that `aria-activedescendant` must point at,
  and no statement of how the listbox is labeled. `MediaPicker` will answer both if the implementer
  reads it, which the criteria do order.
- **Task 5:** see findings 2, 13, 19. The non-paint half (the 55 percent mix, the pre-measured
  contrast numbers, the wash explicitly not raised, `scroll-margin-bottom` joining the existing pinned
  selector rather than a new rule) is well specified, and I verified `ring-base-content/20` occurs
  exactly once in `src/lib`, so that acceptance is satisfiable.
- **Task 6 (live regions, busy convergence): executable,** except finding 8. The hoist recipe is
  pinned to an in-repo example, the duplicate-announcer risk at `MediaReplaceDialog:355` is named in
  advance, the Clipboard fix is ruled as a guard rather than a `.catch`, and the `LoginPage` role
  removal carries its reason.
- **Task 7:** see finding 7. Otherwise executable: the register choices are ruled with their sources,
  the wrapper-keeps-the-role decision is explained against the no-new-prop constraint, and
  `statusBadge` has exactly the two callers the task expects.
- **Task 8:** see finding 15. The rest is executable and unusually well reasoned: the pre-hydration
  duplicate is analyzed rather than guarded, and the two overturned comments are ordered rewritten
  rather than deleted.
- **Task 9:** see findings 4 and 6. The token substitutions themselves are precise, with two in-repo
  adopters named for `cairn-text-success`.
- **Task 10:** see finding 5. The rest is executable, and the two false positives are named in advance
  with their reasons, which is the right way to hand a grep-derived population to an implementer.
- **Task 11:** see findings 1, 10, 16. The engine-side facts all check out.
- **Task 12 (signups server half): executable.** The overturned chassis-B2 keep is named, the
  fail-closed dependency on Task 11 is explained, the load is explicitly left alone, and the verb
  grammar is a propose-and-report rather than a silent choice. One unstated mechanism: the test's home
  and shape (a module-level invocation of the route's actions with a fake event) is feasible in the
  showcase's node vitest, unlike Tasks 13 and 14's DOM assertions, but no task says so.
- **Task 13, Task 14:** see finding 3, and the Task 14 before-set note in the paint walk. Everything
  else, including the reasoning that `DeleteDialog` cannot serve the row and the one-dialog-per-table
  shape, is specified to the level an implementer can act on.
- **Task 15 (`formatTimestamp`): executable,** except the ruling heading form (finding 18). The three
  new accepted forms are enumerated, the pass-through behavior is preserved with its hydration
  reason, the superseded sentence is quoted, and the annotate-do-not-rewrite rule for the closed row
  is stated with the slug-lookup method.
- **Task 16 (records): executable, with two soft criteria.** "`## Unreleased` carries an entry from
  each of Tasks 1 through 15" is not mechanically checkable, since changelog lines carry no task
  numbers (Global constraint 2 forbids the citation), so the reviewer must map fifteen prose lines to
  fifteen tasks by inference; and "no release exists" is not a command. Both are fine as reviewer
  prompts and should not be written as acceptance. The `Consumers must:` absence check and the
  `git tag --points-at HEAD` check are clean.

**Args fidelity, per question 4.** All four files are jq-valid. The gate string is byte-identical
across the plan's `## Gate` block and all four args files (md5 `44315eb2...`). Run splits are exactly
1 to 5, 6 to 10, 11 to 16, and every run file's task object is byte-identical to `args.json`'s.
`files` arrays match the plan's Modify and Create lists (with the intended-moves manifest correctly
added to every paint task and omitted from the rest), except that test files are missing from eight
tasks (finding 17). `notes` carries the global constraints in full on every task: anchors and their
re-verification, `check:surface` byte-identity, the public site surface, the template mirror, the em
dash, no process citations, TSDoc and the 11a ESLint widening, the ledger slug-lookup and
write-versus-annotate rule, the changelog and the `Consumers must:` absence, the STATUS and
migration-notes prohibitions, the `OfficeList` prohibition, the commit footer verbatim, and the gate
hygiene. Condensation drops I found are minor: Task 11's criteria never mention
`packages/cairn-cms-dev/src/index.ts` though the Files block carries it, Task 15's criteria never
mention the conditional `docs/reference/admin-toolkit.md` edit though the Files block carries it, and
Task 5's read-but-unchanged list is miscounted (finding 19). No `paintProtocol` field exists in any
args file, so the runner's append is inert and the protocol appears exactly once per criteria string,
in both the implement and the review prompt.
