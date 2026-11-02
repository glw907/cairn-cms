# tool-fixes plan

- **Slice:** the gate and flake items cut forward from run sheet pass 8, class `ordinary` plus `runner`.
  Design: `2026-11-01-tool-fixes-design.md`, which carries the traces and the decisions.
- **Base:** `main` at `094fcf003`. **Branch:** `worktree-tool-fixes`, pushed to `glw907/cairn-cms`.
- **Estimate:** design 130, ceiling 260, plan path **115**. No cut is planned.
- **Review:** mechanics lens, `2026-11-01-tool-fixes-review-mechanics.md`; folded in
  `2026-11-01-tool-fixes-fold-record.md`.
- **Merge:** conductor (`cairn-cms-9b`) under Geoff's merge word, record packet first. The executor
  stops at PR-ready, finalizes its `## Unreleased` entry, never bumps or publishes, and merges `main`
  only when told.
- **Executor:** Sonnet medium, `cairn-cms-tool-fixes`. Pair tasks go to `cairn-implementer`.

## Sweep verdicts

Scoped sweep at `094fcf003`, by a read-only agent. Three verdicts override the agent, on transcript
evidence it did not have; the design note quotes it. The rewords and the done land in this branch's
first commit. A full sweep isn't due here: the sheet's full sweep is pass 8's close.

| Item | Verdict | Reason |
|---|---|---|
| #241 | fold, T1 | `gate-tier.mjs:571` selects the tool gate by a `tool/` prefix only. |
| #258 | fold, T1 | `gate-tier.mjs:671` admits only `src` and `scripts` code paths to the unit leg. |
| #166 | fold, T1 | `.claude/` selects only `check` and `test:emit`; `check-skill-form.test.ts:84` holds the real tree, so a whole unit leg covers it. The agent proposed a new `extraCommands` entry, which the unit rule makes needless. |
| #252 | reword, fold, T1 and T3 | Agent read it as a `package.json` miss. The T1 commit's paths do select `close-prebuilt.test.ts` (ran it), and the implementer's lane stopped red at `check:close` before the unit leg, behind `\| tail -4`. |
| #244 | reword, fold, T3 | Agent said keep, no fix shape. Traced: two implementers wrote `/tmp/lane.log`. |
| #208 | fold, T5 | Agent said keep, since no cause is known. The prompt puts the trace in this slice; T5 carries it, and it may be set aside. |
| #253 | fold, T2 | Both gaps hold at `check-consumers-must.mjs:17`, `check_engine.go:35`, `check.ts:66`. |
| #251 | fold, T4 | Same stale claim at `test.yml:80` and `create-site.yml:55`. Comment only: the agent's swap to `prepack` changes a step the item doesn't ask to change. |
| #86 | fold, T4 | The step stays at `e2e.yml:68`, `design.yml:62`, `test.yml:47`; the retry at `action.yml:41` comes at once. |
| #217 | done | `cairn-implementer.md` "Report" requires "the files changed as `git show --name-only --format= <sha>` lists them", 8f23f7643. The item's start-time half stays unrecorded, and no run needed it. |
| #235 | reword, keep | T1's unit rule closes its selection half, since `skills/` is not selectable. The `npm` prefix half is in `skill-references-compile.test.ts:91`, outside this pass's files. Pass 8 keeps it. T6 rewords it. |

No drop. No other open item names a file this pass changes.

## Pre-flight

No owner step, no credential, no sitting. Each task was read for owner steps and auto-mode gaps.

| Item | Tasks | Check |
|---|---|---|
| `.claude/agents/cairn-implementer.md` edit | T1, T3 | Outside the sheet's named `autoMode` line. Write probed here on 2026-11-01 and undone. A refusal is a stop. |
| `.claude/skills/cairn-running-passes/SKILL.md`, `references/pass-gate-tiers.md`, `.claude/skills/cairn-writing-engine-code/references/durable-gotchas.md` hand edits | T1, T3, T5 | Covered by the `autoMode` line for `.claude/skills/`. A refusal is a stop. |
| `CLAUDE.md`, `.claude/rules/` | none | Not edited. |
| `.github/actions/bounded-install/action.yml`, `.github/workflows/{test,create-site}.yml` | T4 | Ordinary worktree edits, action file probed and undone. Workflow paths print `ciWait`. |
| `gh workflow run e2e.yml --ref <branch>` | T5 | `e2e.yml:9` carries `workflow_dispatch`. Not probed, since a probe spends a run. If auto mode refuses it, use pushes alone: once the PR is open each push fires `e2e` on `pull_request`, unless it touches only `tool/**` (`e2e.yml:8`). The refusal itself is no stop. |
| `gh run view <id> --log` reads | T5 | Read-only. |
| Local browser run | none planned | The heavy lane is shared. CI carries the trace. |
| Push and draft PR | T1 on | `glw907/cairn-cms`, named in the prompt. |

No task reads a credential, and none touches a live account. A refused credential or write is a stop,
never a thing to route around.

## Standing answers

The sheet's "Standing answers for every pass" all apply. For this slice:

- **May set aside:** #208 if T5's probe can't name a cause, with the evidence filed on the item; #86.
  **May not:** #252 and #258. **Cut order if over the ceiling:** #86, then #253's guidance half.
- **A cause that returns after one structural fix:** set aside what the line above allows, list it in
  `## Decisions`, go on. #252 and #258 may not be escalated away; a returning cause there stops with one
  question in `docs/STATUS.md` and a `SendMessage` to `cairn-cms-9b`.
- **Clock:** `.pass-task-clock` at the worktree root. Past twice a task's estimate, stop for
  `cairn-cms-9b`, except T5, whose answer is to set #208 aside.
- **A test pins old behavior:** change the test and list it. T1 expects to change
  `gate-tier.test.ts:960-961`.
- **A retried test:** list it as flake evidence. T5's baseline is the only place the count decides.
- **A real dependency found:** set the item aside for its home pass, list it in `## Decisions`, go on.
- **A conflicting PR fires no `pull_request` CI.** At the first conflict, tell `cairn-cms-9b`, and merge
  `main` on its word. Keep both `## Unreleased` entries, run `npm run emit:template` and
  `npm run check:surface -- --update`.
- **After `main` merges in:** PR #183 adds a `freshPost` helper to `container-fields.spec.ts` with a
  fifteenth create-dialog site. Swap it to `openCreateDialog`, and grep as T5's acceptance says.
- **A count of retries:** a loop guard, never a stop on its own while each retry fixes a traced cause.
- **New BACKLOG item:** the next free number on `main` at merge. Name a placeholder in the PR.
- **Gates:** `RUN_GATE_IF_BUSY=defer` is allowed on every task. No task is `auth-data`.
- **Workers:** git runs as a plain single command from the worktree. The worktree guard refuses a
  compound or `cd`-prefixed form, which is no stop; rerun it plainly and record it under `## Tooling`.

## Tasks

### Pair A: T1 and T2, path 40

**T1. The fast lane: every leg runs, and run-time readers are seen (#252, #258, #166, #241).** 40 min,
`runner`.

- **Files:** `scripts/checks/gate-tier.mjs`, `scripts/checks/gate-table.json`,
  `src/tests/unit/gate-tier.test.ts`, `.claude/skills/cairn-running-passes/references/pass-gate-tiers.md`,
  `.claude/skills/cairn-running-passes/SKILL.md`.
- **Outcome, three changes.**
  1. Line 1's chain runs every leg and fails at the end, so a static red can no longer hide a unit red.
     Today, `gate-tier.mjs:717`:
     `const body = concurrently([...(chain.length > 0 ? [chain.join(' && ')] : []), ...parallel]);`
     Add an exported `sequentially(commands)` beside `concurrently`, in the same style: each command
     runs in order, the group remembers a failure, and it exits non-zero at the end. Legs still run one
     at a time, because the comment at `:655` holds: "a build beside a reader races". One command
     returns unchanged.
  2. A new table key `unitSelectable` lists the paths that stay on `vitest related`: `src/`, `docs/`,
     `BACKLOG.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `MIGRATION-NOTES.md`, `README.md`, `ROADMAP.md`,
     `.vale/`, `.vale.ini`, `.tellgrader.json`. In `decideFastGate`, a live npm path that matches none
     of them runs `npx vitest run --project unit` with a note naming the path, beside today's branch:
     `if (deleted.some((path) => /^(?:src|scripts)\//.test(path))) {`
     `unit = 'npx vitest run --project unit';`
     Filter from `live` (`:669`, `const live = npmPaths.filter((path) => !isNoCheck(path, context));`), so
     `noCheck` paths don't count. `CLAUDE.md` stays off the list on purpose, because
     `check-skill-budget.mjs:118` holds it to 200 lines. Add the key to `allPatterns` and the typedef.
  3. A new table key `toolInputs` lists what the Go tests read outside `tool/`, each read from the test
     named: `src/lib/log/events.ts` (`events_test.go:43`),
     `scripts/checks/fixtures/consumers-must/cases.json` (`check_engine_test.go:197`), `docs/admin/`
     (`fixes_test.go:157` walks the whole arm; `permissions_test.go:14` and `usage_test.go:555` read
     pages in it), `schema/` (`json_schema_test.go:29`),
     `examples/showcase/src/theme/site.config.yaml` (`siteconfig_test.go:19`),
     `packages/create-cairn-site/src/` (`park_test.go:49`, `step_test.go:86`),
     `packages/create-cairn-site/fixtures/` (`corpus.go:73`). `decideFastGate` pushes `TOOL_GATE` on any
     such path, as `:714` does: `if (toolPaths.length > 0) parallel.push(TOOL_GATE);`. `decideGate` does
     the same at its `tier: 'targeted+tool'` return. Keep `tool/`-only diffs as they are. Add the key to
     `allPatterns` and the `GateTable` typedef at `:185`.
- **Docs:** update the classifier header's fast lane paragraph, the "Line 1" bullets of
  `pass-gate-tiers.md` ("A serial chain"; "the whole `unit` project when the diff deletes or renames a
  path"; "`make -C tool check` when the diff holds a `tool/**` path"), and leg 7 of the targeted gate.
  In `cairn-running-passes/SKILL.md:24`, "fails on the first red leg" becomes accurate wording: a line's
  legs all run, then it fails.
- **Acceptance, each able to fail:**
  - `sequentially(['false', 'touch <tmp>'])` run through `bash -c` exits non-zero and the file exists;
    `sequentially(['true', 'true'])` exits 0.
  - `decideFastGate` line 1 for a `src/lib` path holds `vitest related` and no `npx vitest run`. For each
    of `package.json`, `scripts/checks/gate-table.json`, `examples/showcase/e2e/a.spec.ts`,
    `.claude/skills/cairn-running-passes/SKILL.md`, `CLAUDE.md`, `.github/workflows/test.yml`, and
    `skills/cairn-extending-a-site/SKILL.md`, it holds `npx vitest run --project unit`.
  - A `docs/` path and `CHANGELOG.md` print no `vitest`, as the docs-only test at `:907` pins.
  - `src/lib/log/events.ts` and `docs/admin/tripwire.md` put `make -C tool check` on line 1, and
    `src/lib/log/index.ts` and `docs/editors/index.md` don't.
    `decideGate(['src/lib/log/events.ts'])` returns tier `targeted+tool`.
  - A loop over `toolInputs` and `unitSelectable` asserts each exact path or prefix exists on disk.
- **Test:** `src/tests/unit/gate-tier.test.ts`. The regex at `:961`,
  `expect(line1, path).toMatch(/npm run check:close -- [^;]+ && npm run check(?: &&|;)/);`, and its
  comment at `:960` ("inside one `&&` chain") pin the old join: change both, keeping the order they
  protect, and list the change. A red build now reaches the later legs, which may print knock-on reds
  against a stale `dist`; the first failure still prints, and the lane still fails.

**T2. The two reader gaps (#253).** 25 min, `ordinary`.

- **Files:** `scripts/checks/check-consumers-must.mjs`, `scripts/checks/fixtures/consumers-must/cases.json`,
  `src/tests/unit/check-consumers-must.test.ts`, `tool/internal/health/check_engine.go`,
  `src/lib/guidance/check.ts`, `src/tests/unit/guidance/check.test.ts`, `CHANGELOG.md`, `tool/CHANGELOG.md`.
  Load `standards:go-conventions` first.
- **Outcome, readers:** both read a CRLF line as its LF twin, and both take a NBSP-led body as a body.
  JS today, `check-consumers-must.mjs:17`: `export const LINE = /^(?:  )?Consumers must: (\S.*)$/;`, and
  `isActionable` at `:29` splits on `\n` and strips nothing, though `findOffGrammarLines` strips with
  `const line = raw.replace(/\r$/, '');`. Go today, `check_engine.go:35`:
  ``var consumersMustLine = regexp.MustCompile(`(?m)^(?:  )?Consumers must: (\S.*)$`)``. RE2's `\S` is
  `[^\t\n\f\r ]`, so JS's body class spells that set, and JS's `.` gains the `s` flag so a U+2028 in a
  body behaves as Go's does. Go strips the carriage return before matching.
- **Outcome, guidance:** `judgeSourceExclusion` stops treating an import as an entry when its
  `source("<base>")` resolves, against that stylesheet, to a directory other than the repo root or an
  ancestor, because `.claude` then sits outside the scan. Tailwind's detecting-classes page sets that
  base with `@import "tailwindcss" source("../src");`, relative to the stylesheet. Today, `check.ts:65`:
  `return [...css.matchAll(ENTRY_IMPORT)].some((m) => !(m[2] ?? '').includes('source(none)'));`. `isEntry`
  needs the stylesheet's path, which the caller at `:104` has: `files.find((f) => isEntry(f.css))`. The
  regex group `m[2]` already captures the modifiers.
- **Changelog:** one `CHANGELOG.md` entry under `### Fixed` (the guidance verdict, and the shared line
  reader), ending `Consumers must: nothing.`, and one line in `tool/CHANGELOG.md`.
- **Docs:** `skills/cairn-extending-a-site/references/preflight.md:43` is the one hit for
  `cairn-guidance check`; read it and change it only if it states the verdict.
- **Acceptance, each able to fail:**
  - `cases.json` gains a CRLF `Consumers must: nothing.` (actionable false), a CRLF action (true), and a
    NBSP-led body (true). `check_engine_test.go:197` reads the same corpus, so `make -C tool check` and
    the JS test both run them. Each case fails on the base readers: confirm by running it before the fix.
  - A stylesheet at `src/app.css` with `@import "tailwindcss" source("../src");` judges `excluded`, and
    `source("..")` (the repo root) with no `@source not` judges `not-excluded`. A second entry with no
    `source()` still judges `not-excluded`.
- **Test:** the two test files above; the Go corpus test needs no edit.

### Pair B: T3 and T4, path 10

**T3. Lane discipline for implementers (#244, #252's report half).** 10 min, `runner`. The session runs
it. Files disjoint from T4.

- **Files:** `.claude/agents/cairn-implementer.md`,
  `.claude/skills/cairn-writing-engine-code/references/durable-gotchas.md`.
- **Outcome:** in the agent's "Definition of done", after "fails on the first red leg", state that a
  lane's result is its exit code. An implementer runs one lane at a time in a worktree, bare or with the
  log inside the worktree (`node_modules/.lane.log`), never into `tail` and never to a fixed `/tmp` name,
  because sibling implementers share `/tmp`. A red lane is never green, whatever caused it. Today, line
  24: `--fast --range <base>..HEAD` selects and fails on the first red leg. A passing targeted test is`.
  In "Report", `the fast lane's evidence` becomes the lane's range and exit code. Update that first-red
  clause to match T1. In `durable-gotchas.md`'s "`/tmp` is a size-limited tmpfs" entry, add that it is
  also shared, and one sentence of what `/tmp/lane.log` cost.
- **Acceptance:** `git grep -n '/tmp/' -- .claude/agents/cairn-implementer.md` shows only the warning.
  `agent-skill-names.test.ts` and `check-skill-form.test.ts` pass on the lane, now whole by T1.
- **Test:** none new; a markdown instruction.

**T4. CI install backoff and the stale comment (#86, #251).** 10 min, `runner`. An implementer or the
session.

- **Files:** `.github/actions/bounded-install/action.yml`, `.github/workflows/test.yml`,
  `.github/workflows/create-site.yml`.
- **Outcome:** a 60-second wait before the second attempt, in the retry branch at `action.yml:41`:
  `echo "::warning::install attempt 1 failed or timed out; retrying: $INSTALL_CMD"`. Apt failures here
  were exit 100 that passed on rerun, so the retry needs the mirror to settle. 10 + 1 + 10 minutes stay
  under the step's `timeout-minutes: 22`; state the wait in the header comment. The two comments drop
  the unrunnable claim: `test.yml:80-81`,
  `` # `file:` spec and a 0.0.0 version, so `prepack`'s default path is unrunnable until `` and
  `# @glw907/cairn-cms-dev publishes.`, and `create-site.yml:54-55`,
  `` # arrival. That makes `prepack`'s own default path unrunnable until @glw907/cairn-cms-dev `` and
  `# publishes, so bake here with the engine's real version standing in for both specs and pack`.
  `bake-template.mjs` defaults to the repo's versions, so `prepack` runs today. Read each step, then
  state the reason it really names its specs, or say only what it does. No step changes.
- **Acceptance:** run the retry block in `bash` with `INSTALL_CMD=false` and the `sleep` shortened through
  a stub `sleep` on `PATH`: the stub is called with `60`, and the block exits non-zero.
  `npm --prefix packages/create-cairn-site run prepack` runs clean, so the new comment is true.
  `gate-tier.test.ts`'s pin of `test.yml` steps still passes, since no step moved.
- **Test:** none committed; CI on the push reads the workflows. Prints `ciWait`.

### T5. The createDialog flake (#208). 45 min, `ordinary`

Runs after T3 and T4, since it shares `durable-gotchas.md` with T3. The session runs it; an implementer
may do the site swap.

- **Files:** `examples/showcase/e2e/editor-helpers.ts`, the eight specs with a site
  (`git grep -n 'cairn-create-dialog-title' -- examples/showcase/e2e` prints 14 lines today),
  `durable-gotchas.md`.
- **Stage 1, trace on CI, 25 min with waits off the path.**
  1. Add `openCreateDialog(page, name = 'New post')` to `editor-helpers.ts`, beside
     `fillTitleWhenHydrated`, returning the dialog locator. It replaces the three lines every site
     repeats, as at `golden-path.spec.ts:183-185`:
     `await page.locator('header').getByRole('button', { name: 'New post' }).click();`
     `const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');`
     `await expect(createDialog).toBeVisible();`
     Swap every site. The first version clicks once and logs, on every call,
     `[create-dialog-trace] handler=<bool> opened=<bool>`. `handler` reads the button before the click:
     `Object.getOwnPropertySymbols(el).length > 0`, because Svelte stores a delegated handler under a
     symbol (`node_modules/svelte/src/internal/client/dom/elements/events.js:287`,
     `current_target[event_symbol]?.[event_name]`).
  2. Commit it marked as a trace, push, and dispatch `gh workflow run e2e.yml --ref <branch>` twice more,
     so three runs go at once. `e2e.yml` has no `concurrency` key. Wait in the background. Read each with
     `gh run view <id> --log > <job tmp>/run-<id>.log`, then grep `create-dialog-trace`. A passing line
     prints `handler=true`, which proves the probe reads the real thing.
  3. **Verdict.** Every `opened=false` line carries `handler=false`: hydration is the cause, go to stage
     2. Any `opened=false` with `handler=true`: another cause, add one more field (`open` attribute after
     100 ms, to catch a remount closing it) and take one more round. No `opened=false` in three runs:
     dispatch three more, once. Still none, or still unexplained: set #208 aside, revert the swap, and
     file the lines on the item. That also clears the T5 clock.
- **Stage 2, the fix, 20 min.** The helper re-clicks until the dialog opens: an `expect(...).toPass()`
  around a click with a short timeout and a short visibility check, because a click after hydration opens
  the dialog synchronously, and one before it does nothing. Drop the logging. Every line after the helper
  then runs on a hydrated page. Doc comment in the shape of `fillTitleWhenHydrated`'s, saying why. In
  `durable-gotchas.md`, widen "An e2e key press waits for hydration" to a click, with this run's figures.
- **Acceptance, able to fail:**
  - `git grep -n 'cairn-create-dialog-title' -- examples/showcase/e2e` prints only the helper.
  - Five e2e runs on the fixed head (pushes count, dispatches fill the rest), each with
    `grep -c 'cairn-create-dialog-title'` at 0 on `gh run view --log`. The base rate is 7 of 13, so five
    clean runs by chance is about 2 percent. One hit is a red for this task.
  - The helper still fails a dialog that never opens: `toPass` keeps its own timeout, so state that
    timeout in the doc comment. No separate test proves it, and no local browser run is planned.
- **Test:** the e2e specs themselves.

### T6. Close. 20 min, `ordinary`

- **Files:** `BACKLOG.md`, `CHANGELOG.md` if T1's lane change needs a line (it is internal, so no),
  the plan files.
- **Outcome:** `standards:diff-reviewer` at whole-branch scope, `standards:go-conventions` for `tool/**`,
  `standards:svelte-reviewer` not needed, folded with no open finding, then green CI on the head. Move
  the closed items to `## Done` with proof (#241, #252, #258, #253, #244, #166, #86, #251, and #208 if
  fixed). Reword #235 to its prefix half. Delete the plan files in a final commit. List every retried
  test from CI.
- **PR body:** `## Brief`, what landed, `## Decisions`, `## Planning misses`, `## Tooling`, found items,
  the score with plan path 115. Ends with the session's attribution line.
- **Acceptance:** `git diff origin/main...HEAD --name-only` touches no `auth-data` path, and CI is
  green on the head.

## Path

| Step | Minutes |
|---|---|
| Pair A: T1 (40), T2 (25) | 40 |
| Pair B: T3 (10), T4 (10) | 10 |
| T5 | 45 |
| T6 | 20 |
| **Path** | **115** |

## `## Tooling` seeds

The executor adds what it meets. Already known:

- **`cairn-implementer` and the fast lane misled (#252).** A static red hid a unit red. Fixed in T1 and T3.
- **`claude-tail-guard` missed and misled.** It doesn't match `npm run lane:fast | tail`, and its message
  suggests `cmd > /tmp/out.log`, the fixed name behind #244. Dotfiles, so listed for the conductor.
- **`gate-tier` missed run-time readers (#258, #166, #241).** Fixed in T1.
- **`cairn-writing-engine-code` carried the cause of #244 and the race of #208 before either was filed:**
  the "Do not rebuild `dist`" and "An e2e key press" entries. Nobody searched them at filing. Noted.
- **`ci-green` already names a conflicting PR** (`ci-green-lib.mjs:169-170`). Dotfiles, no cairn-cms file,
  no change. Left out, as the prompt allowed.
- **The worktree guard** refuses compound git commands; #250 is filed.
