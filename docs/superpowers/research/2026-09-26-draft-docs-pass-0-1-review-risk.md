# Draft docs pass 0+1 plan review: domain risk

Target: `docs/superpowers/plans/2026-09-26-draft-docs-pass-0-1.md` at `ad30f1ec`. Lens: what could
break a consumer, CI, the released tool's contract, or another session's work, or leave `main`
unreleasable. Findings are ranked by consequence. Counts: 1 high, 5 medium, 4 low. No owner forks.

## High

### H1. Task 10's parallel fact reads share one worktree's `dist/`, gates, facts file, and git index

Plan: lines 290-301. Six Opus agents at a time run in `draft-docs-0`, each checking claims against
"the export surface (`npm run package` output)". Each agent also fixes pages, files facts, and
gates its fixes.

Evidence: `npm run package` is `svelte-package && ...` (`package.json:36`). It rebuilds `dist/`
from scratch, and `check:reference`, `check:reference:signatures`, `check:readiness`,
`check:tool-conditions`, `check:visuals`, and `check:snippets` each call it again
(`package.json:38-57`). Six concurrent agents in one tree will read `dist/` while another agent
is deleting and rewriting it. The likely result is a false "export missing" or "signature
differs" discrepancy. The plan tells the agent to fix a discrepancy in place, so a correct
reference page can get a wrong edit. That edit ships in the npm tarball and reaches cairn.pub at
the next pin bump. Three more collisions follow from the same setup:
- Every reference fact lands in the single file `docs/internal/facts/reference.md`, which
  concurrent Edit calls can clobber.
- Concurrent commits race on `.git/index.lock`, and one agent can sweep up another agent's
  half-finished edits.
- Concurrent `make -C tool check` and docs-gate runs exceed the one-full-gate memory rule
  (`gate-memory-cap-one-full-gate` memory).

Fold (outcome only):
- The conductor builds `dist/` once before the fan-out, and fact-read agents treat it as
  read-only. They never run `npm run package`, a gate, or `git commit`.
- Each agent edits only its own page. It returns fact changes in its record instead of writing
  `facts/reference.md`.
- One step per batch applies the facts, runs `check:docs-gate` plus `make -C tool check` once,
  and commits.
- Acceptance adds: "no fact-read agent ran `npm run package` or committed."

## Medium

### M1. The docs gate step in `test.yml` needs Vale, which CI installs near the end of the job

Plan: task 6, lines 198-208. `check:docs-gate` includes `check:vale`. In `test.yml`, the separate
`check:*` steps it replaces sit before `check:template` and the showcase steps. Vale is installed
only after those steps (`test.yml`, "Install Vale 3.15.1", just before `check:vale`). If the new
step takes the place of the old `check:readiness` through `check:snippets` block, it fails with
`vale: command not found`. The local gate stays green because Vale is installed on the
workstation. That means PR CI catches the failure, not the task gate, and the fix costs a
round-trip at close. The acceptance line "every check still runs in CI" is judged from a step
list, not from a CI run.

Fold: task 6's outcome says the `check:docs-gate` step runs after the Vale install, or the Vale
install moves ahead of it, and after the explicit `npm run package` step. Acceptance adds a green
`test` workflow run on the pushed branch. A local run does not count. Keep the note in
`tool-conditions.yml:3` true: `test.yml` still runs `check:tool-conditions`.

### M2. `pass-execute` replaces the plan's gate strings with `gate-tier.mjs`'s computed tier, which keeps a third docs-gate list

Plan: lines 53-56 ("Once task 6 lands, `npm run check:docs-gate` joins every docs-touching
task"). The runner runs `scripts/checks/gate-tier.mjs` and executes the string that script prints
in place of the plan's gate (`pass-execute.js:189-202`, `:286-304`). This silent override is
already on record as a defect (`docs/HISTORY.md:318-320`). The classifier's `DOCS_GATE`
(`gate-tier.mjs:50`) is its own five-check list. It includes no `check:symbols`,
`check:provenance`, `check:arm-indexes`, `check:editor-quotes`, or `check:readiness`. Three
consequences follow:
- In segment B, the docs-gate intent silently does not run. After this pass, three lists exist
  (CI, `check:docs-gate`, and `DOCS_GATE`), which breaks the spec's "the chain gate and CI read
  one list".
- Task 6 touches `package.json` and `.github/`, so it classifies to `full`, which runs the showcase
  e2e browser suite. That is heavy against the 8G cap.
- Tasks 3 and 5 are mixed `tool/` plus npm diffs. If `commonNotes` sets `CAIRN_GATE_LANE=light`
  for "tool tasks", the npm leg's browser suite (`npm test`) runs under the light lane's 3G cap.
  `gate-tier.mjs:34-37` warns against exactly this.

Fold:
- Task 6 also points `gate-tier.mjs`'s docs tier at `npm run check:docs-gate`. That adds
  `scripts/checks/gate-tier.mjs` and its unit test to task 6's Files, so there is one list.
- The plan states that the light lane applies only to the `make -C tool check` leg, never to a
  mixed diff's npm leg.
- Where a task needs a specific gate, it passes `gateTier` as a pin.

### M3. Task 9's throwaway branch has no worktree of its own, so the proof draft can leak into `draft-docs-0`

Plan: lines 267-286. The proof drafts an extend page "to its real path" on a throwaway branch off
`draft-docs-0`. In the same sitting, step 1 applies owner-fact edits "on `draft-docs-0`". The
chain runner writes and commits inside `args.worktree`. If that path is the `draft-docs-0`
worktree, which is the only one the plan names, the draft, its brief, and any `rebuilt.json`
entry land on the pass branch. That breaks the arm freeze (lines 60-61) and would ship an
unreviewed extend page on merge. The two edits also collide by file: `f:75hawi` is an owner-fact
item in `docs/internal/facts/extend.md:104`. That is the same file the proof run's page-inputs
agent files new `[verified]` extend facts into. A branch switch in one tree with those edits
uncommitted carries them across.

Fold:
- The throwaway branch gets its own worktree.
- Step 1's owner-fact edits are committed on `draft-docs-0` before the chain starts.
- Acceptance adds: "`git diff main...draft-docs-0` touches no `docs/extend/` page, no
  `docs/internal/briefs/extend/`, and no `rebuilt.json` entry, and `facts/extend.md` changes only
  at `f:75hawi`."

### M4. The token ceiling omits task 9's chain run, and stage 1 is priced at a flat 0.1M per page

Plan: line 26 (6M, flag at 4.8M). The spec's stage 0 share (spec line 136) prices "the review
page and its round-trip proof about 0.2M". The chain proof in task 9 step 2, however, is a full
page-chain run. The spec's own per-page table prices that at 0.45M to 0.75M (spec, "Per page"),
and the stage 0 derivation does not include it.

Stage 1 is priced at 29 × 0.1M. The pages are uneven: `sveltekit.md` is 21,454 words, while
`core.md`, `admin-toolkit.md`, `cairn-audit.md`, and `components.md` run 7K to 10K words each
(94K words across all 29). Checking every prose claim against code on a 21K-word page will not
fit in 0.1M, and may not fit in one agent's context. The likely outcome is that the 4.8M flag
trips during task 10. That forces an unplanned combined question, which is an execution sitting
the score counts.

Fold:
- The ledger prices task 9's chain run explicitly, and the conductor picks a short extend page
  for it.
- Task 10 splits the five largest pages by section, one agent per section.
- The conductor measures the first batch of six and projects stage 1 before dispatching the
  rest. If the projection passes the share, that is the checkpoint question.

### M5. Task 5 must not read a git tag at check or test time

Plan: lines 180-191. The anchor list is snapshotted "from `git show`" of `tool/v1.1.0`, and
acceptance says the list's entries "equal the set extracted from the tag". The implementer could
reasonably encode that equality as a committed unit test or a runtime check. It would pass
locally, where the tag exists. It would fail in CI, because `actions/checkout@v7` in `test.yml`
fetches depth 1 with no tags, so the pass could not merge.

Fold: acceptance says no committed check or test reads a git ref. The tag equality is a one-time
comparison stated in the task report.

## Low

### L1. The flag-pairing tree walk misses cobra's implicit `help` and `completion` commands, and the root path

Evidence: `flags_test.go` already registers the default help flag by hand, because "cobra adds
it while executing" (`treeFlags`). The `help` and `completion` commands are added the same way,
at execute time. `cairn help agents` is a documented surface (`tool/cmd/cairn/help_agents.go:5`).
A `cairn help agents` line or a root-only `cairn --version` line in a shell fence would then fail
as "first word is not a command". No such line appears in today's arms, where the only
shell-fence `cairn` lines are three instances of `cairn doctor`. Stage 2 pages will add them.

Fold: task 3's planted tests include `cairn help agents` and `cairn --version` as passing lines.

### L2. Task 3 acceptance allows a red `check:symbols` to merge

Line 153 lets narrative-arm failures be "filed as facts `[docs-drift]`" instead of fixed. Filing
does not turn the check green, so the docs gate and CI would stay red. Today the three `cairn
doctor` lines resolve, so this is latent. `CLAUDE.md` already permits an agent-facing
deficiency fix on a frozen page.

Fold: any failure is fixed where it lives, or the check does not land.

### L3. Task 10's contract pages: the `cli-cairn-*` glob and the schema directory

The glob matches five pages, not the three the text says. Go tests read
`cli-cairn-doctor.md`, `cli-cairn-exit-codes.md`, `cli-cairn-json-output.md`, and
`docs/reference/schema/**`: `tool/cmd/cairn/contract_pages_test.go`,
`tool/internal/render/json_schema_test.go`, and the `tool.yml` path list. Those pages and the
schema directory publish the released tool's exit codes, payloads, and check ids. `main` carries
no `tool/` commits since `tool/v1.1.0`, so code and release agree today. Even so, a fact-read
agent that "fixes" a schema file or an exit-code table edits a released contract.

Fold:
- Name the three pages explicitly.
- Task 10 never edits `docs/reference/schema/`.
- A contract-page discrepancy against tool code is reported for the close, not fixed.

### L4. Stale descriptions of the chain outside task 7's file list, and live edits

Two workstation docs still describe the profile grader and the v2 chain:
`~/.dotfiles/claude/.claude/docs/claude-tooling.md:54-59` and `model-economy.md:323-324`. So does
the runner's own `description` meta (`docs-page-chain.js:44`, which the skill listing shows).
Under "a rule lives where it executes", a later conductor reads these and passes
`args.profile`. Separately, `~/.claude/CLAUDE.md` and the skills are stow symlinks into
`~/.dotfiles`. The edits in tasks 2 and 7 therefore reach every live session on the workstation
the moment they are written, before `diff-reviewer` reads them. Several Claude processes are
running.

Fold:
- Add the two docs to task 7's Files.
- Tasks 2 and 7 write each file in one pass, not incrementally.

## Checked and clear

- **`flags.json` readers.** The only readers are `scripts/checks/check-symbols.mjs:343-347`,
  which destructures `flags`, and `flags_test.go`, whose `json.Unmarshal` ignores unknown fields.
  An added map field is additive. The command tree has no OS-conditional commands, so the
  Windows and macOS `tool.yml` legs see the same map.
- **Warm `~/.dotfiles` state.** `git -C ~/.dotfiles status` matches the plan header: `spec-plan-review/SKILL.md`
  modified and `skills/synced/` untracked. With those files present, `scripts/check.sh` and
  `claude-tooling-sync verify` are both green today, so neither blocks task 2's or task 7's
  acceptance. None of the targeted files is warm.
- **Owner facts.** No check or test pins the "28 registered rules" count, the free-tier sentence,
  or the `0.96.0` version string. `why-cairn.md` reaches readers only through the tarball at the
  next release.
- **CI path filters.** `test.yml` ignores `tool/**`, but the pass PR touches files outside it, so
  `test.yml` runs. `tool.yml` runs because `tool/testdata/flags.json` changes.
