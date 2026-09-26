# Draft docs pass 0+1 plan review: mechanics and feasibility

Target: `docs/superpowers/plans/2026-09-26-draft-docs-pass-0-1.md` at `ad30f1ec`. Lens: whether
each task can be executed as written with the tools, runners, scripts, and CI that exist today.
Every finding below cites what was read or run. Ranked by consequence.

Counts: 2 high, 5 medium, 6 low. No owner forks.

## High

### H1. Segment A's `parallel: true` runs four implementers in one working tree

- **Where:** plan:16-18, plan:31-33 ("Segment A: tasks 1, 3, 4, and 5 (independent;
  `parallel: true`, disjoint files)").
- **Defect:** `pass-execute` has no worktree isolation. `repo` is "prompt text only: the runner
  never reads or writes that path itself" (`pass-execute.js:32-33`), and the parallel branch just
  runs `runTask(t, args)` for every task against the same `args.repo` (`pass-execute.js:412-421`).
  Four Sonnet implementers therefore edit, stage, and commit in `.claude/worktrees/draft-docs-0`
  at once. Concrete consequences, all from the code:
  - Each task's gate runs over a tree holding its siblings' uncommitted edits, so a green or red
    result is not about that task.
  - `cairn-run-gate` keys a run by `$PWD` plus the gate string (`cairn-run-gate:5-6`, `key=$(printf
    '%s\n%s' "$PWD" "$gate" | sha256sum ...)`), and "a finished gate's result is printed once and
    then cleared". Two tasks whose classifier picks the same string in the same directory (tasks 4
    and 5 are both `scripts` tier) attach to one run, and one of them consumes the other's result.
  - `recordBaseSha` captures HEAD before each task, and the classifier and the reviewer read
    `base..HEAD` (`pass-execute.js:188`, `:275-280`). In a shared tree that range includes sibling
    commits, so task 3's `tool/` commit turns every sibling's gate into `<tier>+tool`
    (`gate-tier.mjs` `decideGate`), and each `diff-reviewer` reads a range holding other tasks'
    diffs.
  - Concurrent `git commit` in one tree races on `index.lock`, and a path-limited commit can still
    sweep a sibling's staged file.
  - The parallelism buys little anyway: every heavy gate queues on one machine-wide lock
    (`cairn-run-gate` header: "gates queue on one machine-wide lock per lane").
- **Fold:** run segment A sequentially (`parallel: false`, the default). If parallelism is wanted,
  use `pass-execute-chains` (one worktree per chain, `pass-execute-chains.js:1-3`) and merge the
  chain branches into `draft-docs-0` at the boundary. Drop "`parallel: true`" from the header either
  way.

### H2. The chain's scoped gate cannot be expressed through `check:docs-gate`

- **Where:** Task 6 (plan:198-203) defines one fixed script; Task 7 (plan:222-223) says "the
  conductor passes `check:docs-gate` with Vale and provenance scoped to the page".
- **Defect:** the spec's gate step is "the docs gate, with Vale on the page path and
  `check:provenance` on the page's brief" (spec, "The page chain", step 3). Task 6's script chains
  `check:vale` (whose script is `vale --minAlertLevel=error docs README.md
  examples/showcase/README.md`, whole tree) and `check:provenance` (no args, so every brief). An
  npm composite does not forward `-- <args>` to its inner scripts, so neither can be scoped by
  passing `check:docs-gate`. Whole-tree provenance is exactly what per-brief mode exists to avoid
  ("so one page's gate never fails on another page's draft", `docs/internal/briefs/README.md`).
  With three pages in flight, the chain's gate would go red on siblings' in-flight briefs every
  round.
- **Fold:** Task 6's outcome names the scoping mechanism. Two lean options: the script reads an
  environment variable (for example a page path and a brief path) that narrows Vale and provenance
  when set, or Task 6 also emits the component list so Task 7's runner composes the scoped string
  from the same list. Acceptance adds one run of the scoped form on a single brief.

## Medium

### M1. The example list path collides with brief discovery

- **Where:** Task 4, plan:159-160 ("for example `docs/internal/briefs/rebuilt.json`").
- **Defect:** `findBriefs` walks the whole briefs directory and collects every `.json`
  (`check-provenance.mjs:457-470`); `checkBrief` then fails a file with no `page` string ("missing
  a \"page\" path", `:546-548`). A list at that path is read as a malformed brief and fails
  `check:provenance` on today's tree. The planted "empty list with no briefs passes" test would
  also fail.
- **Fold:** put the list outside `docs/internal/briefs/` (for example
  `docs/internal/briefs-rebuilt.json`), or state that discovery skips it by name. Also state that
  the coverage check runs before the `briefs.length === 0` early return (`:590-591`), or the empty
  case can never report a listed path with no brief.

### M2. The light lane on task 3 would run a browser gate under the 3G cap

- **Where:** plan:53-54 ("`make -C tool check` with `CAIRN_GATE_LANE=light` for tasks touching
  `tool/`").
- **Defect:** `gate-tier.mjs` exists in this repo, so the implementer runs the classifier's
  string instead of the plan's (`pass-execute.js:196`). Task 3 touches `tool/` and
  `scripts/`/`src/tests/`, which classifies as `scripts+tool`:
  `<DOCS_GATE> && npm run check && npm test && make -C tool check`. `npm test` includes
  `test:component`, which runs in real Chromium (`test.yml:37`). The runner applies `gateLane` to
  the whole call (`pass-execute.js:189-191`), and the light lane caps at 2G high and 3G max. The
  classifier's own header warns against this: "A plan that pins the light lane for a Go-only pass
  must not carry that pin onto a mixed diff whose npm half launches a browser suite."
- **Fold:** no `gateLane` on task 3 (heavy lane). Light lane only for a gate that is `make -C tool
  check` alone. State in the Gates paragraph that the classifier picks the string for every
  cairn-cms task, so the plan's gate strings are the fallback, not the gate.

### M3. "`check:docs-gate` joins every docs-touching task" has no path into the runner

- **Where:** plan:54-55.
- **Defect:** for the same reason as M2, `pass-execute` runs the classifier's tier string. The
  `docs` tier is a fixed literal in `gate-tier.mjs` (`DOCS_GATE = 'npm run check:docs && npm run
  check:vale && npm run check:reference && npm run check:reference:signatures && npm run
  check:facts'`). Nothing in the plan changes it, and Task 6's Files list does not include
  `gate-tier.mjs`. Task 10's gate is conductor-run, so it can use the script directly, but Task 11
  and any later `pass-execute` docs task get the old five-check string.
- **Fold:** either add `scripts/checks/gate-tier.mjs` (and its test) to Task 6's Files with
  `DOCS_GATE` becoming `npm run check:docs-gate`, or drop the "joins every docs-touching task"
  sentence and name where the script is run by hand.

### M4. The CI step must sit after the Vale install

- **Where:** Task 6, plan:201-202 ("`test.yml` calls it in place of those separate steps").
- **Defect:** 14 of the 15 checks run at `test.yml:65-87`, but Vale is installed only at
  `test.yml:107-111`, just before `check:vale` at `:115`. A `check:docs-gate` step placed where the
  other checks were fails on a missing `vale` binary.
- **Fold:** acceptance says the new step runs after the "Install Vale" step. Verified otherwise:
  all 15 named scripts exist in `package.json`; none launches a browser; six of them
  (`check:reference`, `check:reference:signatures`, `check:readiness`, `check:tool-conditions`,
  `check:visuals`, `check:snippets`) each run `npm run package` first, so the script works on a
  clean tree but rebuilds `dist` six times. Running `package` once and calling the node scripts
  directly is an optional speedup, not a correctness fix.

### M5. Task 10's parallel fact-read agents share one tree and one `dist`

- **Where:** Task 10, plan:290-296.
- **Defect:** up to six agents per batch, all in `draft-docs-0`. The plan names "`npm run
  package` output" as the export-surface source; `package` runs `svelte-package`, which rebuilds
  `dist` in full, so two agents running it together read a half-written `dist`. The agents also
  "file or retag facts" in the same `docs/internal/facts/*.md` files at once, and any agent that
  runs a gate reads its siblings' in-progress fixes. The readable surface snapshot
  `docs/internal/api-surface.md` exists (header: "GENERATED — run `npm run check:surface --
  --update`").
- **Fold:** the conductor runs `npm run package` once before the fan-out. Agents read `dist` and
  `docs/internal/api-surface.md` and never run `package` or a gate. Each agent returns proposed
  fact edits in its record rather than editing the facts files, and one implementer applies them
  after each batch, followed by one gate run. Page edits stay per agent, since each agent owns one
  page.

## Low

### L1. Task 7 does not reconcile the drafter's "Do not run the page gate"

`cairn-docs-drafter.md` ends: "Do not run the page gate ... File a new fact only as
`[candidate]`." The runner's `draftPrompt` tells the drafter to run the gate, and `DRAFT_SCHEMA`
requires `gate` (`docs-page-chain.js:65`, `:171`). The spec makes the gate its own step 3. Task 7's
outcome should say which agent runs the gate, then drop the contradicting line from whichever
side loses. Task 7 also omits the spec's `figure-verifier` read for a page with a figure (spec,
"The page chain", step 4). The runner's header also still says "copy this file to the session
scratchpad first; the Workflow tool refuses a `~/.claude/workflows` scriptPath" (`:8-9`), while
Task 9 runs it by name. The header rewrite in Task 7's acceptance should cover that line. The rest
of the change is feasible in the runtime: page inputs, scoped re-read, and a cross-regression flag
derived from `record.rounds[].reads` are pure JavaScript over the returned schemas, and fact
filing is an agent's Edit, not runner file access.

### L2. The freeze-lift grep misses live wordings and two memories

Task 1's grep phrases do not match `docs/internal/docs-register.md:225-226` ("Existing pages on
the three frozen narrative arms ... are swept at the docs rebuild, never before"), so that file
passes the acceptance with the old rule intact. Two memories outside Task 2's list carry the
freeze: `docs-to-facts-reshape.md:29` ("The narrative arms are frozen against rewrites") and
`one-release-then-model-sites.md:34` ("the repo CLAUDE.md's narrative-arm freeze"). The memory
directory is not in any git repo, so `diff-reviewer` cannot see those edits. Fold: add "frozen
narrative arms", "narrative-arm freeze", and "never before" to the grep, add the two memories to
Task 2, and have Task 2's report quote the before and after lines of each memory edit.

### L3. Task 9's chain proof needs its own worktree

`docs-page-chain` takes one `args.worktree` and tells every agent to work only there
(`docs-page-chain.js:126`). A throwaway branch off `draft-docs-0` cannot be checked out in the
`draft-docs-0` worktree while the owner-fact edits land on `draft-docs-0` in the same task. Fold:
Task 9 names a second worktree for the throwaway branch and removes it with the branch.

### L4. Task 9's owner-fact checker lacks web access as named

`cairn-implementer`'s tools are Read, Write, Edit, Bash, Grep, Glob; checking `f:75hawi` "against
Cloudflare's published free-tier limits" needs WebFetch. Fold: dispatch that check as
`general-purpose` at Sonnet, or have the conductor pass the vendor URL for a `curl` read. The four
anchors exist as cited (`what-cairn-is-and-is-not.md:49` says "all 28 registered rules",
`f:ab9kzr` says `0.96.0`, `why-cairn.md:41` and `:84` conflict on the free tier). Editing
`why-cairn.md:41` also touches a narrative arm; the global constraint (plan:60-61) should name it
as a sanctioned fact fix.

### L5. Task 8 and 9 details the pre-extract must carry

Both capabilities are on this user's roster (the skill lists `artifact` and `comments`), and
`comments: {"composer_only": true}` grants only `openComposer` and `anchorFor`, keeping the page
shareable (`comments.d.ts:12-19`). Three details matter for the notes. First, a self-publish must
match the tool's skeleton exactly (the skill: "`<!doctype html><html><head><meta
charset=utf8>...`, no whitespace between those tags"). Otherwise the conductor's next publish
nests it. Second, writability is learned only from the first `not_writer` or `not_granted`
rejection: "Member presence does NOT signal writability" (`artifact.d.ts:34-38`). So the
read-only view is reactive, and edits should be stashed in `sessionStorage` before publish.
Third, comments are write-only from the page, so the conductor reads Geoff's comment with the
`ArtifactComments` tool; Task 9's record should list it. The `.d.ts` paths sit under a versioned
`/tmp/claude-1000/bundled-skills/2.1.283/<hash>/` directory. The conductor should copy the two
files into the task notes or the scratchpad at dispatch, not cite a path that a Claude Code update
moves.

### L6. Smaller mechanical notes

- Task 3 is feasible. `treeFlags` already walks `LocalFlags()` plus `InheritedFlags()` per command
  (`flags_test.go:47-61`), so a per-`CommandPath()` map comes from the same walk, and
  `json.MarshalIndent` sorts map keys, so `make -C tool flags` stays byte-stable. `help` and
  `completion` are added by cobra only at execute time, so the map omits them. `cairn help agents`
  is the documented topic form (`help_agents.go:6`). Today no scoped shell fence carries either,
  but a stage 3 admin page would fail "first word is not a command". Fold: call
  `InitDefaultHelpCmd` and `InitDefaultCompletionCmd` before the walk. Coverage is thin today: the
  scoped docs carry three shell-tagged `cairn` lines, all `cairn doctor`. The CLI contract
  examples sit in untagged fences (`cli-cairn-doctor.md:16`, `:24`), which by spec are not read.
- Task 5 is feasible as written. `git show tool/v1.1.0:tool/internal/spine/conditions.json`
  yields 20 unique anchors, equal to today's `conditions.ts` set, plus `check_referrer.go:36`'s
  `docs/admin/is-it-working.md#scope-a-site-wide-no-referrer-policy`. That one is already in the
  20, so the list holds 20 unique anchors, not 21. Its prefix also differs (full path versus
  `is-it-working.md#`), so the list should normalize to one form. `tool/v1.0.0` and `v1.0.1` print
  no anchors. `checkReadiness` already has `headingAnchors` (`check-readiness.mjs:10,35`) to
  resolve against. The "Models" line (plan:50-51) says task 5 touches Go; it only reads Go.
- Task 10: 29 non-README pages confirmed. `cli-cairn-*.md` matches five pages, not three
  (`doctor`, `exit-codes`, `json-output`, `manifest`, `media-seed`). The three that `tool.yml`
  gates are `doctor`, `exit-codes`, and `json-output` (`tool.yml:20-22` and the pull-request list).
  Name them.
- `args.gate` is the bare string; the runner wraps it in `cairn-run-gate` itself
  (`pass-execute.js:197`). The plan's `cairn-run-gate '...'` phrasing should not be passed through
  as `gate`. `implementer`, `reviewer`, `commonNotes`, and per-task `gate` and `gateLane` all exist
  (`pass-execute.js:12-26`, `:189`, `:194`).
- Running Task 2's Agent-tool chain in `~/.dotfiles` alongside segment A is sound: separate repo
  and a separate gate (`scripts/check.sh`). The warm paths the header names match `git status`
  in `~/.dotfiles` (`M claude/.claude/skills/spec-plan-review/SKILL.md`, `??
  claude/.claude/skills/synced/`).
