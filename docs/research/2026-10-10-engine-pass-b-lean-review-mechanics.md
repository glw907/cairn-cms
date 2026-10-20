# Engine pass B lean plan: mechanics and feasibility review

Lens: mechanics and feasibility. Target: `docs/plans/2026-10-10-engine-pass-b-lean.md`
and its prompt at `18cd15db`, with the old plan binding by reference. Every claim below comes from a
quoted source or a probe. The probes were read-only and ran under `~/.cache/plan-review-mechanics/`
or as `git merge-tree`, `git show`, and `gh api` reads.

Counts: 1 blocker, 4 major, 14 minor, 1 owner fork.

## Findings, ranked by consequence

### B1. The WIP is merged in PB-T0, so PB-T1's single commit, fast lane, and task review cannot cover old Task 2 (blocker)

- **Location.** Plan `:113-115` (PB-T0 merges `engine-pre-2b-b`, bringing WIP `dbdc4556`),
  `:136-141` (PB-T1 "landing as one commit", "Start from WIP `dbdc4556`"), `:59-60` (fast lane
  `--range <base>..HEAD`, `<base>` never defined), and `:65-66` ("`diff-reviewer` ... reads the
  commit").
- **Defect.** PB-T0's merge makes `dbdc4556` an existing commit on the pass branch. PB-T1's commit
  then holds only the session's delta on top of the WIP. It cannot hold "old Tasks 1 and 2 as one
  commit" unless the session squashes. Two consequences follow:
  - If `<base>` is the commit before the task, the natural reading, then `<base>..HEAD` leaves out
    the WIP's 35 files, and the fast lane never gates them.
  - `diff-reviewer` "reads the commit", so it never reads most of old Task 2's `auth-data` change.

  The spec requires both: "Its WIP for Tasks 1 and 2 ... is re-gated through the fast lane; Task 2
  gets the `auth-data` read" (lean spec, Rollout step 5).
- **Evidence.** `git diff --name-only 21ec86a9 engine-pre-2b-b` lists 35 WIP paths, among them
  `packages/create-cairn-site/src/cloudflare/{deploy,chapter,config}.mjs`,
  `examples/showcase/wrangler.jsonc`, and `templates/waymark/src/routes/admin/signups/*`. That set
  is `auth-data` by `cairn-pass`'s path map (`packages/create-cairn-site/src/{github,cloudflare}/**`,
  `wrangler.*`, `**/admin/signups/**`). gate-tier's `diffEntries(range)` sees only the range's paths
  (`gate-tier.mjs` main, step 2 branch). `cairn-pass` and `cairn-implementer.md` also leave
  `<base>` undefined.
- **Fold.**
  1. Define `<base>` once in Conventions: the commit before the task starts, recorded as a fourth
     line `base=<sha>` in the clock file. The hook reads only the first three keys, so a fourth
     line is safe. For a pair, the base is the commit before dispatch.
  2. Make PB-T1 the exception, with base `$(git merge-base origin/main HEAD)` (`21ec86a9`'s
     descendant on `main`), so the range covers `dbdc4556` plus PB-T1's delta.
  3. Point PB-T1's `diff-reviewer` at the same range (`git diff <merge-base>..HEAD -- <old Task 1 and
     2 Files>`), not "the commit".
  4. Restate the Outcome as "lands as `dbdc4556` plus one `PB-T1:` commit", or require a squash
     that keeps `dbdc4556` out of the history (squash is the worse choice, since PB-T0 already
     merged it).

### M1. The pair seams break on the facts files and the friction log, both written by the subagents (major)

- **Location.** Plan `:32-34` (friction "goes to the branch's
  `docs/internal/docs-friction-log.md`"), `:69-74` (the Pairs convention), and `:96-107` (the seam
  claim "share no path").
- **Defect.** Two writers can append to the same two files from different worktrees, and a
  conflicting append "stops the line".
  - The friction log. The plan sends mid-task friction to the branch's log, and each pair prompt
    carries that amendment with the Global constraints, so both pair agents can append under
    "Open findings".
  - The facts files. The natural `subagent_type`, `cairn-implementer`, files a facts bullet on every
    public-behavior change. PB-T7 (composition throws) and PB-T8 (sanitize floor, two warnings)
    both qualify, and there are only six facts files, so both are likely to land in the same arm
    file. Filing facts there also contradicts the old plan, where Task 11 owns the facts.
- **Evidence.** `~/.claude/agents/cairn-implementer.md`: "A task that changes a public behavior
  files its bullet in `docs/internal/facts/<arm>.md` in the same task and runs `npm run
  check:facts`." `ls docs/internal/facts/` prints `admin.md editors.md extend.md front-door.md
  README.md reference.md`.
- **Fold.** In Pairs, name `subagent_type: "cairn-implementer"` with its model and effort (the
  global CLAUDE.md: "Every dispatch names a model and an effort"). Add one override line to each
  pair prompt: "Write no facts bullet, friction-log entry, `CHANGELOG.md` line, or
  `docs/internal/api-surface.md`. Report each in your final report, and the session files it after
  the merge." The session then runs `check:surface -- --update` and `check:facts` once on the
  merge, before the fast lane.

### M2. D6's natural home crosses a public entry, which can collide on `api-surface.md` and trip "No new public surface" (major)

- **Location.** Plan `:102-105` ("Its D6 warning lives in `src/lib/content/manifest.ts` or the
  `internal.ts` virtual-module path").
- **Defect.** The build-time manifest has three pieces:
  - `virtualSource()` in `src/lib/vite/internal.ts:67`.
  - The build itself, `buildSiteManifest` in `src/lib/delivery/manifest.ts:18`, which the plan
    does not name.
  - The per-entry builder `manifestEntryFromFile` in `src/lib/content/manifest.ts:85`.

  The virtual module imports only public package entries and exports one `result`. A per-concept
  warning must therefore either:
  - leave the nested module through a new public helper, most naturally in `/delivery/data`, which
    `api-surface.md` documents at `:308`; or
  - print from inside `buildSiteManifest` with no export.

  The first changes `docs/internal/api-surface.md`, which PB-T7 also regenerates, so the pair
  conflicts. It also adds public surface old Task 8 does not name, which is a stop. Neither file
  belongs to PB-T7, so the plan's "stops if D6's home is a PB-T7 file" guard never fires on this
  case.
- **Evidence.** `git show origin/main:src/lib/vite/internal.ts`, lines 92-101: `import {
  buildSiteManifest } from '@glw907/cairn-cms/delivery/data'; ... const built =
  buildSiteManifest(cairn, siteConfig, globs); export const result = ${resultExpr};`.
  `src/lib/delivery/manifest.ts:18` is `export function buildSiteManifest(...)`.
- **Fold.** Name `src/lib/delivery/manifest.ts` as the third candidate. State the channel: compute
  the undeclared keys in `buildSiteManifest` and surface them with no new export, or else stop.
  Widen the PB-T8 stop line to "or D6 needs a new export or an `api-surface.md` change". M1's fold,
  where the session regenerates surface after the merge, is the backstop.

### M3. A relaunch or resume breaks: `EnterWorktree` `name` collides, and the prompt's plan paths are relative to the wrong directory (major)

- **Location.** Prompt `:3-8`, plan `:57-58` (Resume).
- **Defect.** There are three problems:
  1. The prompt always calls `EnterWorktree` with `name: engine-pass-b`. On the relaunch the plan's
     Resume rule assumes, `.claude/worktrees/engine-pass-b` and branch `worktree-engine-pass-b`
     already exist. The tool's contract covers only an existing worktree "via `path`".
  2. The prompt has the session read
     `.claude/worktrees/engine-pre-2b-b/docs/plans/...` after `EnterWorktree` moved its
     cwd into `.claude/worktrees/engine-pass-b`, where that relative path does not exist.
  3. Before PB-T0's merge, the old plan read by its relative path is `main`'s copy, which lacks
     the Task 0 Ledger the plan cites (`git diff --stat origin/main engine-pre-2b-b -- <old plan>`:
     347 insertions, the Ledger among them).
- **Evidence.** EnterWorktree's schema: "Pass `path` instead of `name` to switch the session into
  a worktree that already exists"; "In a git repository: creates a new git worktree ... on a new
  branch". Branch naming follows step 2's run: `worktree-lean-cutover`.
- **Fold.** Rewrite prompt line 3 as: "If `~/Projects/cairn-cms/.claude/worktrees/engine-pass-b`
  exists, call EnterWorktree with that `path` and resume per the plan's Resume rule. Otherwise call
  it with `name: engine-pass-b`." Give both plan paths as absolute paths under
  `~/Projects/cairn-cms/.claude/worktrees/engine-pre-2b-b/`.

### M4. Old acceptance lines that name retired machinery are not mapped, and one suite that holds PB-T1's tests is not in the fast lane (major)

- **Location.** Plan `:59-63` (only "the computed gate green" is mapped) and `:205-206` (Task 7's
  F is mapped).
- **Defect.** These still-binding lines name F, segments, boundaries, or a local full check, with
  no lean meaning:
  - Old Task 1: "The showcase e2e ... stays green as part of F".
  - Old Task 2: "CI `create-site` on the segment push green".
  - Old Task 4: "confirm on CI at the boundary".
  - Old Task 10: "The showcase e2e suite stays green on `'fixtures'`, admin-visual baselines
    unchanged".
  - Old Task 11: "`check:close` green". Run locally, that is a full build-once run.

  Separately, the fast lane never runs `create-cairn-site`'s own suite. PB-T1's three test-first
  tests live there, and PB-T4 and PB-T9 touch that package's inputs. The old per-task Gate lines
  that ran it are retired (plan `:27`).
- **Evidence.** `decideFastGate` (step 2 `gate-tier.mjs`): its unit leg is `npx vitest related
  --run --project unit` over `^(?:src|scripts)/` paths only. The `extraCommands` hold `test:emit`
  and `showcase:test:unit`, never `npm --prefix packages/create-cairn-site test`, which runs only in
  CI (`test.yml:88`). `cairn-pass`: "a Node-only workspace suite such as `npm test -w
  packages/create-cairn-site` is light".
- **Fold.** Add one Conventions line: "An old line naming F, a segment push, a boundary, or a CI
  e2e or `check:close` result means the PR's CI green on the head that carries the task. It is
  read from the next `ci-green`, never run locally." Add another: "A task whose range touches
  `packages/create-cairn-site/**`, `examples/showcase/**`, or `scripts/build/emit-template.mjs` also
  runs `CAIRN_GATE_LANE=light cairn-run-gate 'npm --prefix packages/create-cairn-site test'`
  beside the fast lane."

### m1. The launch guard fails open when `claude agents --json` errors (minor)

- **Location.** Plan `:311`.
- **Evidence.** A probe of `jq -e 'any(.[]; .name == "engine-pass-b")'` exited 4 on empty input,
  5 on malformed input, 1 on `[]`, and 0 on a match. A failed listing therefore falls through
  `||` into the launch. The output shape is confirmed (an array of objects with `name`, `kind`,
  `status`, and `state`), and the docs say it "prints active sessions ... plus background sessions
  that are still working or blocked".
- **Fold.** `out=$(claude agents --json) || exit 1; jq -e '...' <<<"$out" >/dev/null || ( ... )`.

### m2. The launch's redundant count misses a local `main` that is ahead, and nothing checks that step 2 merged (minor)

- **Location.** Plan `:314-315`, `:308`.
- **Defect.** After `git merge --ff-only origin/main` succeeds, `HEAD..origin/main` is always 0,
  so line `:315` is over-ceremony. It never catches the real hazard: unpushed local commits on
  `main`, where ff-only reports "Already up to date" and `baseRef: head` branches from them. "Once
  step 2's PR has merged" is prose only. An early launch passes PB-T0, since `origin/main` is still
  an ancestor, and then fails at PB-T1's `--fast`, which exits 2 as an unknown flag.
- **Evidence.** `~/.claude/settings.json` `worktree.baseRef` is `"head"`. PR #112 is `OPEN`,
  `MERGEABLE`.
- **Fold.** Replace `:315` with `[ "$(git rev-list --count origin/main..HEAD)" = 0 ]` and add `[
  "$(gh pr view 112 --json state -q .state)" = MERGED ]`. That check survives a squash, where an
  ancestor test would not.

### m3. The launch's brace group runs `cd` in the caller's shell (minor)

- **Location.** Plan `:311-318`.
- **Fold.** Use a subshell, `( cd ... && ... )`. The rest of the block was verified:
  - `git check-ignore -q .claude/worktrees/x` exits 0 in the main checkout, through
    `.git/info/exclude:11:**/.claude/worktrees/`.
  - The prompt file exists at the relative path after `cd`.
  - `claude --bg`, `--model`, `--effort` (low to max), and `-n/--name` all exist in `claude
    --help` (2.1.296).
  - The `lean-step2` process was launched with this exact flag set.
  - `auto` is the default mode (`settings.json` `.permissions.defaultMode`).

### m4. PB-T0's merge commit subject and its amendments are unspecified (minor)

- **Location.** Plan `:114`, `:128-129`.
- **Defect.** `git merge --no-ff` commits at once with the subject "Merge branch
  'engine-pre-2b-b'". That defeats Resume's task-id scan (`:57`) and cannot "carry the merge and any
  amendment" in one commit.
- **Fold.** `git merge --no-ff --no-commit engine-pre-2b-b`, then amend the plan, then `git commit
  -m "PB-T0: Merge the pass B branch and re-check plan claims"`.
- **Verified.**
  - The local branch resolves from a sibling worktree, since refs are shared.
  - `git merge-tree --write-tree` of `engine-pre-2b-b` against `origin/main` and against
    `origin/worktree-lean-cutover` both exit 0 with no conflicts.
  - The pass B side and step 2 share no path, so the "`docs/STATUS.md` takes main's side" clause
    never fires. The pass B branch does not touch STATUS. It can stay as a guard.

### m5. A hung pair never trips the clock stop (minor)

- **Location.** Plan `:75-78`.
- **Defect.** This matches `pass-core` ("Pair worktrees hold no clock file, so the stop cannot fire
  while the session waits on a pair"), but nothing wakes the session if a pair agent stalls. The
  hook runs only after the session's own tool calls, and while it waits it makes none.
- **Evidence.** `claude-clock-stop` resolves `git -C "$cwd" rev-parse --absolute-git-dir` from the
  hook input's `cwd`, and prints nothing when the file is absent.
- **Fold.** At dispatch, start a background Bash `sleep $((2*<longer estimate>*60))`. Its exit
  re-invokes the session, which then checks the pair and treats an unreturned pair as a fired
  stop.

### m6. The clock hook goes blind while the session's cwd sits in a scratch clone (minor)

- **Defect.** Old Tasks 1, 4, and the Close build "a clean clone" and fresh bakes under
  `$HOME/.cache/engine-pre-2b-b/`. A clone is its own git repo, so a persistent `cd` there makes the
  hook read that clone's git dir. It finds no file and stays silent.
- **Fold.** Run scratch work in a subshell or with `-C`/`--prefix`, and keep the session's cwd at
  the worktree root.

### m7. The marker replays write under `/tmp`, and their line numbers moved (minor)

- **Location.** Plan `:119-120`, `:170-171`.
- **Evidence.** The plan's claim is true on step 2's branch. The sharded `e2e.yml` keeps both steps
  in every shard leg, the default build at `:79-97` with `--outdir=/tmp/dev-fold-default` and the
  flagged build at `:132-146`, up from `:68`/`:121` on `main`. `scaffold.yml` is unchanged
  (`:45-61`, `:62-76`). A verbatim replay writes `/tmp`, which the old Global constraints forbid
  ("never `/tmp`").
- **Fold.** Replay with `--outdir="$HOME/.cache/engine-pre-2b-b/dev-fold-{default,flagged}"`, and
  record the step-2 line numbers in PB-T0's amendment.

### m8. `ci-green` does not check the run's base, and `main` can move before the merge (minor)

- **Location.** Plan `:260-261`, `:286-287`, `:292`.
- **Evidence.** `ci-green-lib.mjs:434` uses `merge-base origin/main <sha>` only to size the
  expected set. Nothing checks that the PR run tested the current `main`. The repo allows merge
  commits (`allow_merge_commit: true`), and `main` is unprotected (branch protection returns 404),
  so `gh pr merge <n> --merge` succeeds even when `main` moved after the CI read.
- **Fold.** Make the base check a command: `git fetch origin && git merge-base --is-ancestor
  origin/main HEAD`. Run it at item 1 and again immediately before `gh pr merge`. On a failure,
  merge `main`, push, and read CI again. `gh pr close 111 --comment` and `gh pr merge --merge` were
  confirmed in `gh` help.

### m9. The score under-counts pair gate time and mislabels the off-path CI time (minor)

- **Location.** Plan `:281-285`.
- **Evidence.** `cairn-run-gate --records <toplevel> <branch>` sums only the records whose
  `toplevel` and `branch` match. Pair agents gate in `.claude/worktrees/agent-*` on
  `worktree-agent-*` branches, and the session waits on them. It sums concurrent legs and every CI
  wait, most of which run off the path in the background.
- **Fold.** Sum each pair worktree's `--records` before cleanup and add it to "Gates on the
  critical path". Label the CI sum as total, and count only the CI waits that blocked a task as on
  the path.

### m10. Pair worktrees are never cleaned up (minor)

- **Evidence.** Step 2's three pair worktrees (`agent-a271c89...`, `agent-aa3c880...`,
  `agent-ab02776...`) are still listed in `git worktree list` after their merge. The empirical
  base check passed: `worktree-agent-a271c89de7070a682` forked from `ff6e9e3a`, a session-branch
  commit, which confirms `baseRef: head` forks pair agents from the session worktree's HEAD.
- **Fold.** After each pair merge, `git worktree remove` both pair worktrees and delete their
  branches, after the m9 records read.

### m11. PB-T3's test-first e2e and its capture need a local e2e run that the plan does not specify (minor)

- **Location.** Plan `:156-159`.
- **Defect.** The fast lane "runs no ... e2e". Old Task 3's A5 spec is "Fails today", and its
  capture must land in `$HOME/.cache/...`, which only a local run can produce.
- **Fold.** Name the one-spec command (`npm --prefix examples/showcase run test:e2e --
  e2e/<spec>`) through `cairn-run-gate` on the heavy lane, with the port convention from
  `examples/showcase/playwright.config.ts` and `durable-gotchas.md`, run before and after the
  change.

### m12. The lid-switch hold has no duration (minor)

- **Location.** Prompt `:9`.
- **Evidence.** The guard is `systemd-inhibit --what=handle-lid-switch --who=<initiative> sleep NNN`
  (`unattended-work-guards.md`).
- **Fold.** "`--who=engine-pass-b sleep 43200`", which covers the 510-minute path plus stops.

### m13. The clock estimates are tight at the edges, and the 9-hour margin is 30 minutes (minor)

- **Location.** Plan `:132`, `:242`, `:299-304`.
- **Evidence.**
  - The arithmetic holds: 565 total, 510 on the critical path.
  - 510 sits near the top of the spec's lean range (5.2 to 8.8 h) and leaves 30 minutes under
    the success test.
  - PB-T0's 20 minutes covers two `npm ci`, `npm run package`, the bake, `svelte-kit sync`, the
    merge, and a re-check of every line claim in old Task 0 item 7 and in PB-T1 to PB-T11.
  - PB-T10's 70 minutes covers the overlay, the notice, the workerd guard, a mutation proof, a
    fresh-emission capture under `npm run dev`, every ruling-5 record, and an `auth-data` read.
  - Each pair also adds two subagent setups and one merge plus fast lane, which no estimate
    carries.
- **Fold.** Raise PB-T0 to 30 and PB-T10 to 90 so that a clock stop means an overrun, not a
  mis-estimate, and restate the margin.

### m14. STATUS never records the session's name and id (minor)

- **Location.** PB-T0 `:111-132`.
- **Evidence.** `pass-core` "Execute": "STATUS records the session's name and id."
- **Fold.** In PB-T0, write the name `engine-pass-b` and the id from `claude agents --json` into
  the branch's STATUS.

### OF1. Stop notifications at normal urgency under Do Not Disturb (OWNER FORK, minor)

- **Location.** Plan `:80`, `:287`.
- **The fork.** A stop "waits" for Geoff, but `notify-send -u normal` under the calm-desktop
  setting (Do Not Disturb on) only lands in the tray. The global CLAUDE.md says "normal urgency
  unless Geoff must act now."
- **Options.**
  - (a) Keep normal urgency, and accept that stops wait until Geoff looks.
  - (b) Use `-u critical` for stops only, keeping normal for "merged".
- **Recommendation.** (b), since a stop blocks the 9-hour success test and is by definition an
  action Geoff owes.

## Verified true (no finding)

- **Line numbers at `origin/main`.** Each of these matches the named symbol, and none moved on step
  2's branch:
  - `publish-actions.ts:38` (`normalizePublishActions`)
  - `concepts.ts:135` (`normalizeConcepts`)
  - `admin-dispatch.ts:33` (`RESERVED_SEGMENTS`)
  - `fieldset.ts:21` (doc line) and `:28` (`itemLabel?`)
  - `internal.ts:577` (`checkSiteFacts`) and `:254`
  - `manifest.ts:402`
  - `sanitize-schema.ts:62`
- **The PB-T4 and PB-T6 seam.**
  - `api-surface.md` has no section for `cairn-cms-dev` or guidance.
  - The root `.gitignore` `dist/` already ignores `packages/cairn-cms-dev/dist`.
  - Neither task runs `emit:template`.
  - The showcase's `itemLabel` uses are `ArrayField`'s, so PB-T7 needs no re-emit.
- **Old Task 0 item 3's preparation steps** still match step 2's `test.yml`: `npm run package` at
  `:56`, and the bake command verbatim at `:84-87`.
- **`EnterWorktree` with `baseRef: head`** branches from local HEAD (user `settings.json`). Step
  2's session used the same `--bg` plus `EnterWorktree` pattern, with a working `notify-send`
  environment (`DBUS_SESSION_BUS_ADDRESS` present in its process).
- **The step-2 `--fast` interface** is `--range <base>..HEAD [--fast]`. `--fast` with `--pin`
  exits 2, and an empty range fails closed.
- **The risk classes** fit `cairn-pass`'s path map. PB-T1, PB-T10, and PB-T4 are classed by their
  paths, and PB-T5 and PB-T8 are raised as floors. `pass-core` lists "skills" under `runner`, but
  `cairn-pass`'s map, which wins, does not, so PB-T1's and PB-T11's `skills/**` edits stay as
  classed.
- **`main`'s CI** is green on `dea73f7d`, all five expected workflows, so no inherited red is
  expected at PB-T0's first push.
