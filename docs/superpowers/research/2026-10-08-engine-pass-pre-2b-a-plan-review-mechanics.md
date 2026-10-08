# Plan review, mechanics and feasibility: engine pass before 2b, pass A

Target: `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-a.md` at `504b82f0` (identical at
`main` HEAD `57baf01b`; the only later commit adds pass B's plan). Lens: will each task build and
gate as written. Every finding below was checked against the tree at `main` HEAD, the runner
source (`~/.claude/workflows/pass-execute.js`), the classifier (`scripts/checks/gate-tier.mjs`,
run in a scratch probe), and the agent definitions. Only correctness gaps and over-ceremony are
listed. Findings that would only polish the plan were dropped.

**Counts:** 1 blocker, 6 major, 10 minor, 1 over-ceremony.

## What holds

- The segment order and its dependencies hold. Task 1 precedes Tasks 2 and 3. Task 7 precedes
  Task 6 (Decision 1). Tasks 8 and 9 precede Task 10. Task 12 comes last.
- The args shape is accepted by `validateArgs`. `classifier: true` skips the probe. `gateTier`
  and `gateLane` are per-task fields the runner reads. `stopOnEscalate: true` stops a sequential
  run on any task that is not accepted. That stop is what the plan's stop rules need.
- A pinned `gateTier: "full"` task resolves to `t.gate || a.gate`. The implementer runs
  `gate-tier.mjs --pin full`, which prints `TIER_GATES.full`. If `args.gate` is Task 0's printed
  F string, the two match exactly.
- Task 0 handles the worktree trap. The showcase's `file:` links are relative
  (`../../../..`), so a from-scratch `npm ci --prefix examples/showcase` in the worktree resolves
  both packages into the worktree. The `realpath` check proves it. Root `npm ci` runs `prepare`,
  which runs `npm run package`, and `pretest:e2e` repackages before every e2e. The dev package
  ships source only (`exports` point at `src/index.ts`), so it needs no build.
- The S1 pre-flight claims hold at HEAD within a line or two. Two have drifted slightly. At
  `check-tool-heuristics.mjs`, line 50 is the heuristic name and the regex is at `:52`. The
  owner mint in `handle.ts` is at `:166-171`. Neither changes an outcome, and the planned haiku
  pre-flight absorbs both. Several claims were confirmed exactly: the five `auth.access.refused`
  emitters, the hooks byte-identity, `isPublicAdminPath`, both C7 tests, `RESERVED_SEGMENTS`, and
  the form posts.
- The live key probe's three secret names exist in `~/.local/secrets` (checked by name only).
  Decision 14's mail read is feasible: Miniflare 5's `send_email` worker logs the sent message's
  file path (`send_email.worker.js:3517-3519`).

## Blocker

### B1. The Outcome blocks and the cited Decisions never reach the implementer or the reviewer

- **Where:** `plan:90-93`, with every task's **Outcome** section.
- **Defect:** The args mapping gives the runner only three fields per task. `criteria` is the
  Acceptance block verbatim, `files` is the Files line, and `notes` is Notes plus mutations.
  `implementPrompt` renders exactly Acceptance criteria, Files, Notes, `commonNotes`, the class
  mandate, and the gate. The agents never read the plan.
  `~/.claude/agents/cairn-implementer.md:11-12` says "you do not read the plan file yourself".
  `diff-reviewer.md:11` says "You do not read the plan file". Whatever lives only in an Outcome
  block, or only in "Decisions this plan takes", is therefore invisible to both agents. Examples:
  - Task 1: delete `src/access.ts`, declare the map inline on the adapter (Decision 2), keep the
    hooks byte-identical, fix the `guard.ts:364-367` and `section-action.ts:129-130` comments, and
    remove the cycle from the reference snippets. Acceptance carries none of these.
  - Task 7: the rotation URL (Decision 5). Acceptance says only "names the rotation page URL".
  - Task 6: the `{ promise, startedAt }` slot, the `waitUntil` hand-off, and the rule that the
    timeout reaches only the check's mint (Decision 4).
  - Task 8: the `applyAction`, `location.assign`, and dirty-baseline mechanics.
  - Task 4: the condition message wording.
  - Task 11: the residual comment.
  - Task 9: the delete docstring.

  The reviewer then reviews against an Acceptance list that omits these outcomes. A miss passes,
  or it surfaces only at the close fan-out.
- **Fold:** Change the mapping so `criteria` is **Outcome followed by Acceptance**, both
  verbatim. Then inline into each task's `notes` the text of every "Decision N" the task cites:
  Task 1 cites 2 and 7, Task 4 cites 3, Task 6 cites 4 and 15, Task 7 cites 1, 5, and 6, and
  Task 12 cites 8 through 13. A bare "(Decision 5)" reference resolves to nothing for an agent
  that cannot open the plan.

## Major

### M1. Task 1's own gate goes red on three docs-gate legs that its Files and the global constraints never name

- **Where:** `plan:411-421` (Files), `plan:143-146` (the global constraint naming only
  reference, signatures, and surface).
- **Defect:** F includes `check:docs-gate`, which runs `check:facts`, `check:options`, and
  `check:snippets` (`scripts/checks/docs-gate.mjs:84-100`). Task 1 turns all three red:
  1. **`check:facts`.** Facts `f:3z1uxv` and one other bullet cite
     `templates/waymark/src/access.ts:16-24` and `:1-25`, a file Task 1 deletes. A pointer that
     names a directory gets no basename fallback (`check-facts.mjs` header, the pointer-resolution
     paragraph), so the deleted path fails.
  2. **`check:options`.** `docs/internal/option-map.json:45,48,125` holds
     `AuthGuardConfig.access`, `AuthGuardConfig.roles`, and `EditorRoutesConfig.roles`. The walk
     regenerates option paths from `dist` and fails on drift in either direction. Task 1 removes
     those three options and adds `AuthGuardConfig.runtime` and `EditorRoutesConfig.runtime`. Each
     new row needs a fact id. The existing `CairnAdminConfig.runtime` row shows the shape.
  3. **`check:snippets`.** The block at `docs/reference/admin-routes.md:218` has no skip marker
     and calls `createAuthGuard()` with no argument. Once `runtime` is required, that block fails
     to compile. A scan of every typechecked fence confirms it is the only uncovered one. The
     extend pages' hook snippets all carry `snippet-check-skip`. `sveltekit.md:127,1043` are
     already in Task 1's Files. The task's grep post-condition matches only
     `createAuthGuard({ access|roles`, so it misses the bare call.

  Each of these is a predictable red on an `auth-data` task, and that class gets only one fix
  round.
- **Fold:**
  - Add `docs/internal/option-map.json` and `docs/reference/admin-routes.md` to Task 1's Files.
    Also add pointer-only repairs to `docs/internal/facts/extend.md`; Task 12 still writes the
    claim corrections.
  - Widen the global constraint at `:143` to read "check:reference, check:reference:signatures,
    check:surface, check:options, check:facts (pointer grammar), and check:snippets stay green at
    every commit".
  - Add to the S1 pre-flight list: "facts whose Source cites `src/access.ts`; option-map rows for
    the three factories; unskipped reference snippets calling them".

### M2. Task 4's new condition id breaks the Go mirror test, and its Files omit the Go constant

- **Where:** `plan:580-585`.
- **Defect:** `tool/internal/spine/conditions_test.go` (`TestConditionsMatchEmbeddedMirror`)
  asserts that the typed `Conditions()` constants in `tool/internal/spine/condition.go:18-75`
  equal the id set in the embedded `conditions.json`. Task 4 adds `auth.store-roles-unmigrated`
  to `conditions.ts` and regenerates the mirror, so the mirror gains an id with no constant.
  Task 4's computed tier is `full+tool`: the probe classifies
  `examples/showcase/migrations/0001_roles.sql` as full and `tool/internal/spine/conditions.json`
  as tool. Its gate therefore runs `make -C tool check`, and that test fails. Three things are
  missing from the task:
  - `tool/internal/spine/condition.go` is not in Files.
  - `go-conventions` is not named, although the task now edits Go.
  - No `tool/CHANGELOG.md` line is planned for a new public condition id. The test's own comment
    says the ids are published in `cli-cairn-json-output.md`.
- **Fold:** Add `tool/internal/spine/condition.go` (the constant plus its slice entry) and
  `tool/CHANGELOG.md` `## Unreleased` to Task 4's Files. Add "`go-conventions` governs the Go
  edit" to its Notes. Add "T green" to its acceptance; the computed gate already runs it.

### M3. Task 2's computed gate launches Chromium on the light lane

- **Where:** `plan:126-130` and `:514` (the plan says "heavy lane").
- **Defect:** The runner's `tool` class carries `gateLane: "light"` (`pass-execute.js`,
  `PASS_CLASSES.tool`). `implementPrompt` and `runGateIndependently` both prefix
  `CAIRN_GATE_LANE=light` when `(t.gateLane || a.gateLane || cls.gateLane) === "light"`. Task 2's
  diff resolves to `engine+tool` (verified with `decideGate`). That gate runs `SCRIPTS_GATE`,
  which includes `npm run test:component` in real Chromium, followed by `make -C tool check`. The
  plan never sets a lane on Task 2, so this browser gate runs on the light lane under its 3G cap.
  The pass-gate-economy rule forbids that, and so does `gate-tier.mjs`'s own header ("a plan that
  pins the light lane ... must not carry that pin onto a mixed diff").
- **Fold:** Set `gateLane: "heavy"` on Task 2's args. Any value other than `"light"` wins over
  the class default, because the task's field is read first.

### M4. Task 3's showcase e2e criterion is never proven, and "F green (computed)" contradicts what runs

- **Where:** `plan:555-556`, `:567`. The same wording appears at `:601`, `:641`, `:762`,
  `:842`, and `:907`.
- **Defect:** Task 3 is not pinned. Its diff computes to `engine` (`SCRIPTS_GATE`, verified),
  which runs no showcase e2e. Its acceptance still says "The showcase e2e sign-in specs stay
  green" and "F green". C7 narrows `isPublicAdminPath`, which is exactly the change that could
  break sign-in. The plan's own rule at `:127` pins every task whose acceptance carries a showcase
  e2e, and Task 3 is missed. Elsewhere, "F green (computed)" on Tasks 4, 5, 9, 11, and 6 names a
  gate that does not run: Tasks 5, 9, 11, and 6 compute to `engine`, and Task 4 to `full+tool`.
  The reviewer receives these criteria verbatim. It can therefore block on "F not run", which
  costs a fix round, or the conductor can read a gap as a pass. On `auth-data`, a standing block
  after one round stops the pass.
- **Fold:** Pin `gateTier: "full"` on Task 3. That also lets the S1 boundary reuse Task 3's F,
  since HEAD will not have moved. On the other five tasks, change "F green (computed)" to "the
  computed gate green".

### M5. The Task 6 and Task 8 upshift rule cannot fire inside the runner

- **Where:** `plan:95-100`, `:254`, `:265-266`.
- **Defect:** The plan says the conductor re-dispatches the fix on `model: opus` "without
  stopping" when the first verdict is `fix` in that mechanism. The runner has no mid-run
  conductor hook. With `maxFix: 1`, it runs the fix round itself on the task's own `t.model`, and
  for both tasks that is Sonnet. The conductor sees the task only afterward. For Task 6
  (`auth-data`), a mechanism defect still standing after that Sonnet round meets the stop rule at
  `:265`. The pass therefore stops before the Opus upshift can ever run.
- **Fold:** Pick one:
  - (a) Set `model: "opus"` on Task 6 in args, which the runner supports through `t.model`.
  - (b) Add a carve-out to the stop rule. A Task 6 or Task 8 mechanism defect standing after the
    runner's round gets one hand-dispatched Opus chain, naming the task's base SHA, before the
    stop applies.

  Option (a) is the cheapest and matches the plan's own risk call.

### M6. The close runs stock `npm test`, which the durable gotcha says hangs on this workstation while holding the heavy lock

- **Where:** `plan:1013`.
- **Defect:** `docs/internal/durable-gotchas.md` ("The component project stalls under file
  parallelism") is still in force. It says "do not retry the stock gate", and stock `npm test`
  "hangs while holding the heavy gate lock". `cairn-run-gate` still has no silence watchdog
  (`ROADMAP.md:1402-1407`). This is the unattended close, so a hang there holds the lock with no
  one watching. `gate-tier.mjs` serializes the component project for exactly this reason.
- **Fold:** Replace `cairn-run-gate 'npm test'` with the serialized legs F already uses:
  `npm run test:node-projects && npm run test:component -- --no-file-parallelism`. Better, rerun
  F after the simplifier and drop the separate `npm test`.

## Minor

1. **Task 0's gate-string step prints nothing** (`plan:113-114`, `:327-328`). Verified:
   `node scripts/checks/gate-tier.mjs --range HEAD..HEAD --pin full` exits 1 with "carries no
   changed paths". At Task 0 the range `<base>..HEAD` is empty. **Fold:** print F and E with
   `--range HEAD~1..HEAD --pin full|engine`. Under a pin, the range only needs to be non-empty.
2. **Task 0's draft PR would be refused** (`plan:332-333`). Step 6 comes before any commit on
   the branch, and GitHub refuses a pull request with no commits between the branches. **Fold:**
   open the draft PR after the first commit, either Task 0's Ledger commit or the item 7/8
   amendment.
3. **The spec commit the plan cites is not on `main`** (`plan:21`, `:322`). `0c476887` is not an
   ancestor of `main`. No branch contains it, and its spec file is byte-identical to `27df5088`.
   A literal "at or after `0c476887`" check therefore fails. In addition, `docs/STATUS.md:21-30`
   does not yet point at this plan; it says execution waits for Geoff's spec read. **Fold:** cite
   `27df5088`. Make the STATUS repoint a named pre-execution step, as the pre-bake rule requires.
4. **Task 12 runs neither D nor its lane** (`plan:122-124`, `:999`). With the classifier on and
   no pin, Task 12's diff computes to `docs`, which is `check:docs-gate` alone. The implementer
   is told to run that string in place of `gate`. D's `check:surface` and
   `check:rulings-format`, which Task 12's ledger and `api-surface.md` edits need, therefore
   never run in the chain. No `gateLane: "light"` is set either. D also repeats three legs that
   `check:docs-gate` already runs: `check:reference`, `check:reference:signatures`, and
   `check:facts`, each with its own `npm run package`. **Fold:** set `gateLane: "light"` on
   Task 12. Tell its implementer in Notes to append `&& npm run check:surface && npm run
   check:rulings-format` to the classifier's string; `gateMatches` accepts trailing steps. Trim
   D to `check:docs-gate && check:surface && check:rulings-format`.
5. **The E2E_PORT rule reaches no agent** (`plan:117-119`). The rule lives under "Gates", not
   "Global constraints", so `commonNotes` omits it. The independent haiku gate runner runs the
   bare resolved string, so its e2e uses port 4173 with `reuseExistingServer`
   (`playwright.config.ts`). Neither port had a listener at review time, so this is latent.
   **Fold:** move the rule into "Global constraints". Pass `args.gate` as
   `export E2E_PORT=4392 && <F>`; the allowlist and `stripGateAssignments` keep the match.
6. **Decision 6 misdescribes the template's env file** (`plan:197-200`). The template's
   `worker-configuration.d.ts` line 2 reads `--env-file=.dev.vars.example`, not the template-repo
   path. `npm run emit:template` regenerates the file itself (`emit-template.mjs:165-182`,
   `regenerateWorkerTypes`), so hand-running wrangler in `templates/waymark` is redundant.
   **Fold:** "the showcase's file by its line-2 command; the template's through `npm run
   emit:template`".
7. **Two "disjoint" pairs share a file** (`plan:53-56`). Tasks 5 and 7 both edit
   `docs/reference/sveltekit.md`. Tasks 11 and 6 both edit `docs/internal/api-surface.md`. This
   is harmless while everything runs sequentially. **Fold:** correct the sentence so a later
   relaunch cannot mark those pairs `parallel`.
8. **A conductor-granted extra fix round has no mechanism** (`plan:251-253`). The runner stops
   on `needs-decision`. A relaunch re-records `baseSha` at the new HEAD, so the classifier and the
   reviewer see only the fix commits, never the whole task. **Fold:** run the extra round as a
   hand-dispatched chain per `pass-core`, giving the task's original base SHA and the standing
   findings.
9. **The close smoke needs a custom role the showcase does not declare** (`plan:1028-1033`).
   The showcase calls `defineAccess(undefined, ...)` and has no `defineRoles` anywhere in
   `examples/showcase/src`. A "custom-role editor" therefore resolves as an unknown role, and the
   roster offers no custom role to add. **Fold:** name an uncommitted scratch declaration for the
   smoke. One option is a temporary `roles` member on the showcase adapter, reverted and checked
   by `git status`. Another is a scratch site.
10. **Two small feasibility gaps.**
    - Close step 3 (`plan:1016-1018`) deletes the committed `examples/showcase/package-lock.json`,
      which would leave step 11's tree dirty. **Fold:** restore it with `git checkout --` after
      the build.
    - Task 1's build-fail evidence (`plan:465-466`) asks for a showcase copy under `$HOME/.cache`,
      where the relative `file:../..` dependencies resolve to nothing. **Fold:** say how. Either
      rewrite both dependencies to the worktree's absolute path in the copy, or allow a reverted
      in-tree throw.

## Over-ceremony

### O1. The S4 boundary reruns F after a docs-only task, then the close reruns it

- **Where:** `plan:51`, `:1001-1002`, `:1011-1015`.
- **Cost:** Task 12 changes docs only. Its diff computes to `docs`. Even so, the S4 boundary runs
  F, T, D, and `check:close`. The close then runs the simplifier, F again if code changed (it
  usually does), `npm test`, `check:close`, and T. That is one redundant F and one redundant
  `check:close` back to back. F is the longest gate, with the whole showcase e2e, and the
  machine's heavy lock queues behind it.
- **Fold:** make the S4 boundary D only, after Task 6's F. Let close step 2, rewritten per M6,
  serve as the pass's one final full gate.
