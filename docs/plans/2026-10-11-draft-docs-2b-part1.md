# Draft docs stage 2b, part 1: the extend arm's 14 new pages

**Goal.** Draft the 14 extend pages the outline marks `"batch": "2b"` through `docs-page-chain`, using the fixed pre-2b tools. Close every escalation the way 2a did. Run the framing A/B on the first page. Hand the result to Geoff as a draft PR stacked on the tooling branch, and he reads it in the morning.

**Design.** `docs/superpowers/specs/2026-10-11-overnight-2b-design.md`, item 2. Approved by Geoff on 2026-10-11. No separate spec, since the design fits on a page.

**Governing precedent.** Several 2a sections hold unless this plan says otherwise:
- From `docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md`: "Global constraints" (the map rule included), "After each run", "Scoped reviews", and task 9's consistency-read method.
- From `docs/superpowers/plans/2026-10-07-2a-unattended-finish.md`: the unattended contract, R5's settings, and R5's escalation handling.
- From `docs/superpowers/research/2026-10-03-draft-docs-2a-targeted-close-record.md`: the targeted-close method.
- From `docs/superpowers/research/2026-10-07-draft-docs-2a-r5-task8-record.md`: R5's conductor rulings 1 to 3. Ruling 1 is hand-run seats for a plan-read escalation. Ruling 2 is the 26-word cap's scope. Ruling 3 is a reader re-test rewrite applied without a further round.

Where this plan and those disagree, this plan governs. Line numbers in the dotfiles chain were probed at dotfiles `main` `2912c95`. The tooling branch may move them, so every agent finds cited text by searching for it.

**Pass class.** `ordinary`: every expected path is under `docs/`. An entry the chain adds to `scripts/checks/check-symbols-allowlist.mjs` is `runner` by cairn-pass's path map (R5 added seven). If one lands, its task and the pass become `runner`. Under pass-core "Close" an `ordinary` pass would merge its own PR, but this PR waits for Geoff for three reasons:
- Its "Found, not done" list is not empty. At the least it holds the friction the chain files, any steps left "unexercised: unreleased engine", and the A/B verdict, which is his call.
- Geoff ruled an owner read of the pages.
- The branch sits on the `runner`-class tooling branch, which merges only on his read.

## Owner rulings (Geoff, 2026-10-11)

- Part 1 = the 14 new pages only, drafted through docs-page-chain and closed per 2a's precedent (targeted close for round-cap escalations; seats hand-run for a plan-read escalation, as R5 did). Out of scope (part 2, the next run): the 10 fact re-arms of drafted pages, the 32 link restorations and LEGACY_PATH_MAP repoints in docs/internal/record/harvest/relink.json, reference-arm corrections, the final arm index, the outline deletion, the boundary test, 2b's close, any merge or release, the claude-code arm.
- It runs after, and stacked on, a pre-2b tooling pass with two branches: cairn-cms branch `worktree-pre2b-tooling` (fixed scripts/checks and docs-register.md) and a dotfiles branch `worktree-pre2b-tooling` in worktree /var/home/glw907/.dotfiles/.claude/worktrees/pre2b-tooling (fixed chain prompts). The 2b branch `draft-docs-2b-part1` branches from the cairn tooling branch's green head (plus a merge of overnight-2b-plan), and the chain runs via the Workflow tool's scriptPath pointing at the dotfiles tooling worktree's claude/.claude/workflows/docs-page-chain.js, with a cmp check recorded. Launch precondition: both tooling PRs' CI green (ci-green exit 0) on their heads. If either tooling branch is not green, 2b does not launch.
- Framing A/B on the FIRST page only: run two intros (framingEffort xhigh and high), keep both in the stage record, proceed on xhigh; Geoff judges at the morning read.
- Token ceiling: the whole night is 45M, tooling's stop is at 10M; 2b's ceiling is whatever remains, stop at the 80 percent mark of 45M overall (36M) measured by /cost. A stop WIP-commits and writes STATUS with resume lines (resumeFromRunId).
- No merge overnight. The executor pushes `draft-docs-2b-part1`, opens a DRAFT PR to glw907/cairn-cms, runs ci-green, and hands over via review-desk per pass-core "Close"; Geoff reads the pages in the morning. The PR body carries the per-page records, the A/B, the score, and Found-not-done with dispositions.
- Constraints carried: D7 caveat on build-the-public-routes (deriveHeroImage reads frontmatter.image only, src/lib/... public-routes.ts:99) and D8b caveat on run-cairn-audit-on-your-site (no --json, no stable finding codes, report.ts:49) per ROADMAP ~1108-1135; arrange-the-admin-sidebar's figure is a live reproduction never a screenshot (cairn-figure skill; figure-verifier seat); human pages never assume Claude or a coding agent; reader re-test findings caused only by the unreleased engine missing from npm are disposed "unexercised: unreleased engine"; the ROADMAP "add-cairn page names src/lib/cairn.config.ts while the scaffold uses src/theme/" note (~1062) feeds page inputs; the docs gate `npm run check:docs-gate -- --page {page} --brief {brief}` on the light lane.
- Executor: one session, `claude --bg --model sonnet --effort medium --name draft-docs-2b-part1 "$(cat <file>)"` from ~/Projects/cairn-cms, launched by the conductor (this planning session). It is thin: reads reports, records, and verdicts. Guards: /loop wake-up, claude-wf-guard at tier writer on every chain run, TMPDIR under $HOME/.cache, /tmp quota watch, NODE_OPTIONS=--max-old-space-size=6144, npm ci root and showcase plus svelte-kit sync. Laptop on AC, lid open.

**Verified against the tree (2026-10-11, cairn `b63b185f`, dotfiles `2912c95`).**
- D7's file is `src/lib/delivery/public-routes.ts`. `deriveHeroImage` starts at :93, and :99 reads `const value = frontmatter.image;`.
- D8b's file is `src/lib/audit/report.ts`. Its header (:1-4) states a plain-text report, and :49 prints the summary line.
- The add-cairn path note is `ROADMAP.md:1062-1065`. Fact `f:q07rd5` (`docs/internal/facts/extend.md:169`) already states both adapter paths.
- The sidebar figure's story is `nav/worked-navlayout` (`src/lib/reproductions/stories/site.ts:76-86`), over `fixtureNavLayout` (`src/lib/reproductions/fixtures.ts:262-275`).
- The "never assume Claude" rule is `docs/internal/docs-register.md:150-155`, which every seat reads.

Two findings on the runner and the CI shape change how the rulings are carried out:
- **`extraChecks` is dead.** It is documented at `docs-page-chain.js:63`, but no line of the runner reads it, so the caveat checks 2a's R5 passed never reached the fact read. This plan carries the caveats in each page's `inputs` instead. `pageInputsPrompt` renders those (:942-944), and page inputs files them as facts that the plan places and the fact read holds the page to. The post-run record then checks that each caveat landed on its page.
- **The dotfiles repo has no PR CI.** dotfiles-pass says "CI watch: None", and the repo has no `.github/`. So `ci-green` on the dotfiles tooling PR exits 3 (unavailable), never 0. That precondition is read as the dotfiles gate passing on the branch head instead (task L0).

## Owner rulings after planning (Geoff, 2026-10-11)

- Launch tonight, though the plan's 1,110 executor minutes run past twice the design's 360. The token projection makes the cut, and pages it leaves carry to a resume. Unattended planning and launch are approved: the conductor launches this executor without Geoff's read of the plan.
- The tooling pass stays `runner` (its `src/lib` comment edits moved to Later), so nothing in this run waits on an auth read.

**Conductor rulings (2026-10-11).**
- The dotfiles precondition is its gate passing on the branch head, since the workstation repo has no PR CI (finding 3).
- The tooling pass puts the brief's `local` field in the chain's `draftPrompt`, never in the agent file, so T0's check (e) holds.
- The `/cost` proxy, parking, and the token stop's hand-over stand as written (finding 5).
- Until the dotfiles PR merges and `make install` rebuilds `~/.local/bin/tellgrader`, `check:tellgrader` still reads the bare noun "showcase" as `slop-hard`. The executor rules alone that such a finding on the example site's name is a known tool artifact. It records the finding and never rewrites the name. (Since the plan-review fold, L0 builds the tooling branch's `tellgrader` onto the executor's PATH, so this ruling is only a fallback.)

**Plan-review fold (2026-10-12).** The fold record is `docs/superpowers/research/2026-10-11-draft-docs-2b-part1-fold.md`. These changes carry out the rulings above by mechanisms that work:
- **The chain script is a pinned copy inside the 2b worktree.** The Workflow tool refuses a `scriptPath` outside the session's readable directories. L0 writes `git show <dotfiles_tooling_head>:claude/.claude/workflows/docs-page-chain.js` to `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1/.superpowers/draft-docs-2b-part1/docs-page-chain.js`. Git ignores `.superpowers/`. Every run uses that copy, and every `cmp` compares against it. This is still the tooling branch's script, now held fixed at the head T0 verified.
- **One token unit:** input + output + cache-creation tokens, excluding cache reads (see "Counting"). It replaces "measured by /cost".
- **Resume stays in this session.** A Workflow run's saved results live under the session that ran it. So a relaunch reattaches this session (`claude attach <session id>`), and a fresh session re-runs uncommitted pages as a new run.
- **Merge condition 3 (the `merge-base` ancestor check) is dropped** (conductor ruling, review finding M10). pass-core asks only that a PR be safe under a plain merge followed by a pull. The PR is retargeted to `main` after the tooling PR merges.

## The unattended contract

**The executor rules alone on:**
- A gate-matcher or runner artifact: re-verify it, then accept.
- A flake under the rerun rule in `docs/internal/durable-gotchas.md`.
- An ENOSPC or quota failure inside a gate: clear its own scratch and rerun.
- One re-dispatch of a non-chain task after a `fix` verdict. A second `fix` gets one upshifted round (`model: opus`).
- A register, fact-read, or reader re-test finding resolved by applying the reviewer's own proposed rewrite (R5 ruling 3).
- The 26-word cap's scope. Every scoped-review dispatch quotes the cap sentence from `docs/internal/docs-register.md` exactly as the tooling branch leaves it (R5 ruling 2).
- A reader re-test finding caused only by the unreleased engine missing from npm (the registry serves 0.98.0). It is disposed "unexercised: unreleased engine" in the record and the PR body, and is never redrafted.
- How each escalation is closed, under "Escalations" below.
- Shrinking a run to the pages that fit the token projection.
- Parking a blocked page.

**Escalations.**
- **Round cap**: a second `fix` or a red gate, with the findings in `record.findings`. It takes the targeted close:
  1. One `cairn-docs-drafter` (Opus) fixes only the final-round blocking findings, quoted verbatim, keeping the brief in step.
  2. One `cairn-register-editor` read and one fact read run in parallel, scoped to the changed sentences (`git diff <WIP commit> -- <page>`).
  3. The final reader read comes last. A `fix` from it gets one scoped redraft, scoped reads, and one re-test.
- **Plan read**: a second `fix` on the plan. It takes hand-run seats (R5 ruling 1):
  1. The plan is revised from the plan read's own rewrites.
  2. Then come the framing step, the round-1 draft, and the round-1 reads: structural, register, and fact, plus the figure verifier on `arrange-the-admin-sidebar`.
  3. One redraft, then round-2 reads over the changed sentences.
  4. The final reader read and its re-test.
- **A seat that returned nothing, a framing record missing on disk, or a thrown page error.** It takes hand-run seats from that seat on. A resume would replay the cached empty result.
- **A usage limit.** A Workflow run in a background session does not pause at a usage limit. Its affected agents fail instead (Workflow docs, "When a run hits your usage limit"). An agent error whose journal entry or transcript names a usage limit is therefore a pause, not an escalation. Run no hand-run seat for it. Record it in the ledger, and let the `/loop` ticks wait out the reset. Then relaunch the same run in this session with its `resumeFromRunId`, the same `scriptPath`, and the same `args`. The failed agents run again, and so does every agent that started after them.
- **How a hand-run seat is dispatched.** The dispatch names the runner function whose prompt the seat follows (`planPrompt`, `framingPrompt`, `draftPrompt`, `structurePrompt`, `editorPrompt`, `factPrompt`, `figurePrompt`, or `readerPrompt`, in the pinned script `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1/.superpowers/draft-docs-2b-part1/docs-page-chain.js`). It passes the `model`, `effort`, and `agentType` that the runner's `agent()` call for that seat names. Find that call by searching for the seat's `label:` in the pinned script. It tells the agent to read that function and follow the prompt it renders. It states the page's values: worktree, page path, track `extend`, slug, the brief, plan, and framing paths under `docs/internal/briefs/extend/`, the outline path, the option-map path, and the gate string with `{page}` and `{brief}` filled in. It uses the agent type and model the runner gives that seat: Opus 5.5, with `cairn-register-editor`, `figure-verifier`, or `cairn-docs-drafter` where the runner names one, and `general-purpose` otherwise.
- **Parking.** A page still blocked after its targeted round, or after its hand-run last read, is parked. Its record and the PR body list the blocking findings.
  - If the parked page's own gate is red, the post-run commit reverts the page, its brief, and its index row, and keeps its plan, framing record, and facts, so the branch stays green.
  - If its gate passes, the page stays with its findings listed.
  - Parking departs from 2a's finish, where a blocked page stopped the track. That stop protected an unattended merge, and nothing merges here, so stopping would only idle the remaining pages until morning.

**Stops.** These stop the line:
- **The token stop** (see "Counting").
- **A fired clock stop** (pass-core "Clock stop").
- **A CI red on the branch head** that two fix attempts do not clear.
- **A whole-tree docs-gate red** that the post-run fix rounds do not clear.
- **A run-level chain failure** (outline probe, checksum, or script error) or a `cmp` mismatch.
- **An unexpected path in a run's output.** Any path in `git status --porcelain` outside `docs/`, other than `scripts/checks/check-symbols-allowlist.mjs`.
- **A runtime-loaded file on the dotfiles tooling branch** (task T0's check (e)).
- **`/tmp` still above 4.5G** after the executor clears its own scratch.
- **Battery at 11 percent** off mains.
- **A finding that would change the approved design.**

**How a stop runs.**
1. WIP-commit the completed files: specific paths, never `-A`.
2. Write `/var/home/glw907/Projects/cairn-cms/.git/worktrees/draft-docs-2b-part1/pass-stop` with the task, what failed, and one question. Use this literal path with the Write tool, never `$(git rev-parse ...)`: the worktree-isolation guard refuses a runtime-computed git path.
3. Put the same facts in the branch's `docs/STATUS.md`, with the resume lines. The relaunch line is `claude attach <session id>`, with the id from the stage record. For a halted chain run, add its `scriptPath`, `args`, and `resumeFromRunId`, which work only in this same session.
4. Commit and push as `Record a stop in STATUS (<task>)`.
5. Run `notify-send -u normal "cairn 2b part 1 stopped at <task>: PR #<n>; resume: claude attach <session id>"`.
6. End the turn. Every wake-up tick first runs `ls /var/home/glw907/Projects/cairn-cms/.git/worktrees/draft-docs-2b-part1/` and ends the turn if the listing shows `pass-stop`.

The token stop is not a failure, so it is the one exception. It starts no new chain run, close, or consistency read, but it still runs T11's hand-over (the record commit, the PR body, `ci-green`, and review-desk) with the stop stated. That costs about 0.3M, inside the 9M between the stop and the 45M ceiling.

**Counting.**
- **The unit** (conductor ruling, 2026-10-12). Every figure is input + output + cache-creation tokens, excluding cache reads. That is the unit of a completion notification's `<usage><subagent_tokens>`. On R5's run it matched the transcripts' input + output + cache write and left out 171M of cache reads. The runner's own `spent` figure is a different unit, so it never counts.
- **Where the count starts.** The conductor computes the night so far (the tooling sessions plus planning) in that unit from the transcripts' `usage` fields with its meter. It writes the figure at launch as `night_tokens_at_launch` in the launch-facts file. A `--bg` executor cannot run `/cost`.
- **The executor's count.** It is the sum of:
  - `night_tokens_at_launch`;
  - each Workflow run's `<subagent_tokens>` from its completion notification, for chain runs and inline runs alike;
  - each Agent dispatch's `<subagent_tokens>` from its completion notification;
  - the executor's own loop. That is the drop in its `<total_tokens>N tokens left` reminder since the last ledger row (T0 records the first reading).

  The stage record's ledger table holds every figure, so a relaunch recomputes the count.
- **Projection before each chain run.** Count + (pages × per-page figure) + 1.3M reserve (consistency read 1.0M, hand-over 0.3M) must be at or under 36M. The per-page figure is 2.0M until run 1's closes end, then the measured mean (chain plus closes) of the closed pages. A run that does not fit launches its queue's first pages that do. If none fit, that is the token stop.
- **Before each close or hand-run.** Count + 0.9M + 1.3M must be at or under 36M. Otherwise the page is left as its WIP state with its escalation recorded, and the token stop follows.
- **Before T10.** Count + 1.3M must be at or under 36M. Otherwise T10 is skipped and listed in "Found, not done".

**Guards.**
- The `/loop` wake-up with no interval, armed first.
- `claude-wf-guard <transcript-dir> writer <run-id>` as a background Bash task on every chain run, killed when the run's completion notification arrives.
- `TMPDIR=/var/home/glw907/.cache/draft-docs-2b-part1/tmp` and `NODE_OPTIONS=--max-old-space-size=6144` ride the launch line's `--settings` as `env` values. The agent-view docs promise a background session only the dispatching shell's `PATH` and provider variables, and they list `--settings` among the flags that carry into the background session. Every dispatch puts scratch under `/var/home/glw907/.cache/draft-docs-2b-part1/`.
- The launch line puts `/var/home/glw907/.cache/draft-docs-2b-part1/bin` first on `PATH`. The tooling branch's `tellgrader` lives there (L0), so `check:tellgrader` (`spawnSync("tellgrader", ...)`) and the `cairn-register-editor` seat ("`tellgrader --register docs <file>` (on PATH)") both run the showcase fix.
- `quota -s`'s `/tmp` row read at each task boundary.
- The battery check at each task boundary.
- No lid-switch hold: the lid stays open and the laptop on AC, per the ruling.

**Command forms** (from the alignment plan's probe of 2026-10-11):
- One plain command per Bash call, with literal absolute paths.
- The worktree's git dir is `/var/home/glw907/Projects/cairn-cms/.git/worktrees/draft-docs-2b-part1`. Its `pass-stop` and `pass-task-clock` files are always named by that literal path, never by `$(git rev-parse --absolute-git-dir)`, which the guard refuses. To reset the clock's start, run `date +%s` in one call, then `sed -i 's/^start=.*/start=<that number>/' /var/home/glw907/Projects/cairn-cms/.git/worktrees/draft-docs-2b-part1/pass-task-clock` in another.
- Never `git -C` into a sibling cairn-cms worktree. `git -C /var/home/glw907/.dotfiles/.claude/worktrees/pre2b-tooling ...` is allowed and read-only here.
- Intermediate output goes to a scratch file, never piped into a substitution.
- `ci-green` and `cairn-run-gate` output is redirected to a file and never piped.

**Skip agent-memory maintenance.** Every dispatch prompt the executor writes carries the line: "Skip agent-memory maintenance; do not read or write agent memory."

## Global constraints (beyond 2a's)

- **No edits beyond the part 1 files.** No task edits `docs/internal/record/harvest/relink.json`, `LEGACY_PATH_MAP` (`scripts/checks/docs-links.mjs`), the outline, any `docs/reference/` page, `choose-an-ai-posture.md`, `migration-notes.md`, `upgrade-cairn.md`, or `docs/internal/briefs-rebuilt.json`. A defect found there goes to the friction log or "Found, not done".
- **Links into the arm.** A link from a 2b page to an outline page not yet drafted passes as pending (`c498b6fa`), and the index link-in is the chain's own (the helper's `link` command).
- **The friction log** gains the chain's entries and is not triaged here. Triage is 2b's close, in part 2.
- **Commits** use subjects prefixed `2b1-T<n>:`, in the imperative mood, with specific paths. Each commit body ends with `Pass-Clock: task=<id> start=<epoch> end=<epoch> estimate=<min> fixes=<n>`, read from the clock file, which also carries `base=<sha>` per the alignment plan's convention.
- **Pushes.** Push `draft-docs-2b-part1` to `glw907/cairn-cms` after every commit, then start `ci-green <sha> --pr <n> --wait > /var/home/glw907/.cache/draft-docs-2b-part1/ci-<sha>.log 2>&1` as a background task, re-issued on 75. Exit 1 is a red. Exit 2 is a red unless one re-push clears it. Exit 3 is re-read at the next push. (These follow the tooling plan's rule.) No task waits for CI.
- **Gates.** Each commit's fast lane is what `node scripts/checks/gate-tier.mjs --fast --range <base>..HEAD` prints, each leg run through `cairn-run-gate` on its printed lane.
- **Resume.** A relaunch reattaches this same session: `claude attach <session id>`, with the id T0 recorded. In a reattached session, a chain-run task whose `runId` sits in the stage record's ledger with no WIP commit resumes with that `resumeFromRunId` and the same `scriptPath` and `args`. A run resumes in the order its agents started. With three pages in flight, a failure can re-run most of a fan-out, so budget a resume as a re-run.
  - **A fresh session** (the session row is gone) runs the launch prompt again. Saved run results live only under the session that ran them, and a fresh session's relaunch fails with `nothing to resume` (Workflow docs, "Resume after you leave the session"). So it launches that run's uncommitted pages as a new run, with the projection recomputed.
  - Either way, it finds the PR with `gh pr list --head draft-docs-2b-part1 --state all`, and never opens a second one. A task is done when a commit subject starts with its id (subjects starting `Record a stop` don't count).

## The runs

The ruling sets `inFlight: 3`, and the runner's pool has no barrier, so pages 4 to 6 of a run start as slots free. Run boundaries are where a page's dependencies are committed on disk (the framing step reads sibling pages and their framing records), and where a token stop falls cleanly.

The ordering rule: a page runs after the pages it rests on. The concept page goes before the task guides built on it, and the page owning a seam goes before the pages that apply it, in the outline's group order. A page whose 2b links all point out of the batch, or only forward, goes early. Forward links pass the gate.

| Run | Queue order | Why here |
| --- | --- | --- |
| 1 (6) | `act-on-newly-published-entries` (the A/B page), `content-model`, `arrange-the-admin-sidebar`, `share-a-draft-preview`, `run-cairn-audit-on-your-site`, `configure-media` | `content-model` is the concept the model-content guides rest on. The other five rest on no 2b page: their outbound links go to 2a pages or the reference, or forward. |
| 2 (4) | `define-an-adapter-and-schema`, `link-content-with-references`, `reuse-content-across-entries`, `add-an-island` | Each rests on `content-model`. `define` links on to `arrange` (run 1). `add-an-island` is a target of `configure-rendering`. |
| 3 (3) | `configure-rendering`, `build-the-public-routes`, `turn-on-tidy` | `configure-rendering` rests on `define` and links to `add-an-island` and `configure-media`. `build-the-public-routes` rests on `define` and links to `share` and `act-on` (run 1). `turn-on-tidy` rests on `define`. `build` and `tidy` link to each other, so they share a run. |
| 4 (1) | `migrate-existing-content` | It links to `content-model`, `configure-rendering`, and `build-the-public-routes`, all on disk by then. |

**A/B page: `act-on-newly-published-entries`.** It is the simplest task guide in the batch: 14 fact ids (the fewest), 6 covers, 4 pending map rows, no figure, no caveat, and one outbound link to a page already on disk (`add-a-custom-admin-screen`). It still has two readers with different reasons: a post-deploy job diffing manifests, and the in-admin `editor.publishActions` link. So the framing step has a real decision to make while effort stays the only variable. If its chain escalates before its framing step runs, the A/B moves to the first run-1 page, in queue order, whose framing ran, and the record says why.

**Why the A/B is not a second chain invocation.** `framingEffort` is one value for the whole run (`docs-page-chain.js:526`), and the script has no framing-only mode. A resume replays only the longest unchanged prefix of `agent()` calls (the Workflow runtime's Resume rule). So a second one-page invocation with `framingEffort: "high"` and `resumeFromRunId` would replay page inputs and the plan, then run the framing and every later seat live. It would redraft the page over the xhigh one. Its framing agent would also read the xhigh record, because the prompt reads an existing record at its own path (:1251). Instead, the A/B re-runs only the framing agent: on the exact prompt the run rendered, with the options the runner passes (:1321: `claude-opus-5-5`, `general-purpose`), and with effort set to `high` (task T2).

**Arguments for every run.** These go in the `args` of the Workflow call. `scriptPath` is the pinned copy `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1/.superpowers/draft-docs-2b-part1/docs-page-chain.js`, never the dotfiles worktree file. The Workflow tool starts only "from a script file the session is already allowed to read", which means the working directory or an added directory (Workflow docs, "How a workflow runs"). An earlier session's refusal of the dotfiles path reads the same.

```
worktree: "/var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1"
gate: "npm run check:docs-gate -- --page {page} --brief {brief}"
gateLane: "light"
inFlight: 3
bothReviewers: true            (2a's R5 setting; the cross-regression rate held it)
outline: "docs/internal/outlines/extend.json"
framingEffort: "xhigh"
pages: [{ id: "<slug>", path: "docs/extend/<slug>.md", track: "extend", inputs: [...] }]
```

Each page's `inputs` carries the ADAPTER line. Three pages add one more line.
- **ADAPTER** (every page): "ROADMAP.md:1062-1065 and f:q07rd5 (docs/internal/facts/extend.md:169): the adapter module is src/theme/cairn.config.ts (#theme) on a scaffolded site and src/lib/cairn.config.ts (#lib) on the add-cairn tutorial's site. A page that names the adapter's file says which site it means."
- **D7** (`build-the-public-routes`): "ROADMAP.md:1128-1130 (D7) and src/lib/delivery/public-routes.ts:93-112: deriveHeroImage reads frontmatter.image only (:99), whatever field a concept marks for SEO. The page claims nothing this contradicts and states the limitation as a filed [verified] fact."
- **D8b** (`run-cairn-audit-on-your-site`): "ROADMAP.md:1131-1133 (D8b), src/lib/audit/report.ts:1-4,12,40-52, and src/lib/audit/config.ts:403: cairn-audit prints a plain-text report, one line per finding with file:line, tier, rule id, and message (report.ts:12), then a summary (:40-52). Its flags are config.ts:403's; there is no --json or other machine-readable output. ROADMAP D8b records that the report shape is not yet a designed contract, so the line format may change. The page claims nothing this contradicts and states the limitation as a filed [verified] fact." (The owner ruling's "no stable finding codes" is carried by "not yet a designed contract": every finding line does print its rule id, and `--rule <id>` selects by it, so the bare phrase would file a false fact.)
- **FIGURE** (`arrange-the-admin-sidebar`): "src/lib/reproductions/stories/site.ts:76-86 (story nav/worked-navlayout) and src/lib/reproductions/fixtures.ts:262-275 (fixtureNavLayout): the figure is a live reproduction in a repro fence naming this story, never a screenshot (cairn-figure skill, 'Interface figures: live first')."

If T0 finds that the pinned script reads `p.extraChecks` on a line that is not a comment, the D7 and D8b sentences also ride as `extraChecks`.

**Map rows pending at plan time** (`docs/internal/option-map.json`, `pendingCount` 104, while the map holds 102 `pending` rows; `check:options` fails only above the count, so post-run row arithmetic counts rows, not `pendingCount`): `content-model` 27, `turn-on-tidy` 16, `define-an-adapter-and-schema` 15, `arrange-the-admin-sidebar` 15, `build-the-public-routes` 8, `configure-rendering` 7, `configure-media` 6, `act-on-newly-published-entries` 4, `share-a-draft-preview` 3, `link-content-with-references` 1. Each run's `rowsReceived` baseline is `git show <run base>:docs/internal/option-map.json`, where the run base is the commit just before the run launches.

## Budget

The per-page unit comes from 2a's R5 record: chain 7.20M / 5 = 1.44M, closes 4.2M / 5 = 0.84M, post-run 0.33M / 5 = 0.07M. That makes 2.35M a page, with every page escalated. The tooling assumption is that half the pages escalate (0.42M a page for closes). The chain share rises to 1.5M, because accepted pages run the final reader read. That gives about 2.0M a page.

| Share | Estimate | Basis |
| --- | --- | --- |
| Night before 2b's launch (tooling pass, planning, conductor) | 10.0M | tooling's 8M design estimate under its 10M stop, plus about 2M; the conductor writes the measured figure |
| Run 1, 6 pages | 12.0M | 2.0M a page |
| T2 framing A/B | 0.6M | one framing agent at `high`, two intro-only drafts |
| Run 2, 4 pages | 8.0M | |
| Run 3, 3 pages | 6.0M | |
| Run 4, 1 page | 2.0M | |
| T10 consistency read and fold | 1.0M | R6 was 1.5M with the relink, which part 1 leaves out |
| T11 close, PR, CI, hand-over | 0.3M | |
| Executor loop | 1.8M | 0.15M across 12 tasks, as an estimate; the count uses the measured `<total_tokens>` drop |
| **2b total** | **31.7M** | |
| **Night total** | **41.7M** | against the 36M stop and the 45M ceiling |

**Range.**
- With no escalations: 14 × 1.57M = 22.0M, plus 3.7M of fixed shares, is 25.7M for 2b and 35.7M for the night. Only this case fits under the stop.
- At 2a's rate: 14 × 2.35M = 32.9M, plus 3.7M, is 36.6M for 2b and 46.6M for the night, past the ceiling.

**Forecast at 2.0M a page.**
- After run 1 and the A/B, the count is about 23.2M. After run 2, about 31.5M.
- Run 3's projection is 31.5 + 6.0 + 1.3 = 38.8M, so run 3 launches with `configure-rendering` alone (floor of (36 − 31.5 − 1.3) / 2.0 = 1).
- Run 4's projection then crosses 36M, so the token stop falls there. Eleven pages close; `build-the-public-routes`, `turn-on-tidy`, and `migrate-existing-content` carry to the resume.
- Nothing is cut to fit in advance. The projection makes the cut.

## Tasks

The clock estimates total **1,110 minutes** for all 14 pages, against the design's 360. Under the forecast token stop the path is about 900 minutes (see the note at the end).

### L0 (conductor, before launch): the launch preconditions

**Outcome:** both tooling branches proven green, the 2b worktree created, the launch facts written, and the executor launched.

**Files:**
- Creates `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1`.
- Writes `/var/home/glw907/.cache/draft-docs-2b-part1/launch-facts.txt` with the lines `cairn_tooling_head`, `cairn_tooling_pr`, `dotfiles_tooling_head`, `dotfiles_tooling_pr`, `dotfiles_gate`, `script_sha256`, and `night_tokens_at_launch` (in the "Counting" unit).
- Creates `/var/home/glw907/.cache/draft-docs-2b-part1/tmp/` and `/var/home/glw907/.cache/draft-docs-2b-part1/bin/`.
- Writes the pinned chain script `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1/.superpowers/draft-docs-2b-part1/docs-page-chain.js`. It is untracked; git ignores `.superpowers/` (`.gitignore:12`).
- Builds `/var/home/glw907/.cache/draft-docs-2b-part1/bin/tellgrader`.

**Risk:** `ordinary`.

**Acceptance:**
1. `ci-green <cairn head> --pr <n> --wait`, run from the cairn tooling worktree, exits 0.
2. The dotfiles gate passes on the dotfiles head. The tree has no CI, so this uses `bash scripts/gate.sh` run from the dotfiles tooling worktree, exiting 0. (`gate.sh` sets `CAIRN_GATE_LANE=light`, and the lane is part of the receipt fingerprint, so a bare `cairn-run-gate --receipt 'bash scripts/check.sh'` would miss its receipt.)
3. pass-core's pre-launch checks: `git -C /var/home/glw907/Projects/cairn-cms fetch origin`, the main checkout on `main`, and `rev-list --count HEAD..origin/main` printing 0. `.claude/worktrees/` is already ignored.
4. `quota -s` shows `/tmp` under 4.5G. At plan time it reads 5.9G of the 6.1G quota, 4.2G of it under `/tmp/claude-1000/-var-home-glw907-Projects-dubplate`, another project's data. The conductor clears only its own scratch. If `/tmp` is still at or above 4.5G, 2b does not launch, and the conductor asks Geoff about the dubplate data.
5. Create the worktree with `git -C /var/home/glw907/Projects/cairn-cms worktree add -b draft-docs-2b-part1 /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1 <cairn head>`, then `git merge --no-edit origin/overnight-2b-plan` inside it. Merge no STATUS edit to `main` while the executor runs (pass-core "Conductor").
6. `git -C /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1 rev-parse --absolute-git-dir` prints exactly `/var/home/glw907/Projects/cairn-cms/.git/worktrees/draft-docs-2b-part1`. Git names a worktree's admin directory after the worktree's basename (the plan worktree's is `.git/worktrees/overnight-2b-plan`). The plan and the prompt use that literal path. If it differs, fix both before launch.
7. Pin the chain script. Run `mkdir -p` on the worktree's `.superpowers/draft-docs-2b-part1/`, then `git -C /var/home/glw907/.dotfiles/.claude/worktrees/pre2b-tooling show <dotfiles_tooling_head>:claude/.claude/workflows/docs-page-chain.js > /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1/.superpowers/draft-docs-2b-part1/docs-page-chain.js`. Then `git -C <the 2b worktree> check-ignore` must name that path, and its `sha256sum` goes into `script_sha256`.
8. Build the tooling branch's `tellgrader` with `go -C /var/home/glw907/.dotfiles/.claude/worktrees/pre2b-tooling/claude/.claude/skills/writing-voice/evals/tellgrader build -o /var/home/glw907/.cache/draft-docs-2b-part1/bin/tellgrader ./cmd/tellgrader`. This is the Makefile's `build` recipe with the output moved off the tree; `make install` stays for after the merge. On a scratch file reading "the showcase", the built binary's `tellgrader --register docs <file>` prints no `slop-hard`.
9. Launch with the launch line at the end of this plan.

If check 1, 2, 4, 6, 7, or 8 fails, 2b does not launch.

**Test:** the checks above. **Clock:** 20.

### T0: pre-flight and the open draft PR

**Outcome:** the executor in its worktree with setup run, every launch fact re-verified and recorded, the stage record started, and the draft PR open.

**Files:** creates `docs/superpowers/research/2026-10-11-draft-docs-2b-part1-record.md`, the stage record. It has sections for launch facts, a ledger table (task, run id, commits, tokens, count after), per-run page tables, the A/B, the consistency read, and rulings for Geoff.

**Risk:** `ordinary`.

**Acceptance:**
- (a) The branch is `draft-docs-2b-part1`, and `git merge-base --is-ancestor` passes for the cairn tooling head and for `origin/overnight-2b-plan`.
- (b) `ci-green <cairn head> --pr <cairn tooling pr>` exits 0.
- (c) `git -C /var/home/glw907/.dotfiles/.claude/worktrees/pre2b-tooling rev-parse HEAD` equals `dotfiles_tooling_head`. Then write `git -C /var/home/glw907/.dotfiles/.claude/worktrees/pre2b-tooling show <dotfiles_tooling_head>:claude/.claude/workflows/docs-page-chain.js` to `/var/home/glw907/.cache/draft-docs-2b-part1/chain-at-head.js`. `cmp` it against the pinned script, whose `sha256sum` must equal `script_sha256`. A mismatch is a stop.
- (d) `printenv TMPDIR` and `printenv NODE_OPTIONS` print the values above, `command -v tellgrader` prints `/var/home/glw907/.cache/draft-docs-2b-part1/bin/tellgrader`, and `/tmp` is under 4.5G. Any failure is a stop: the first three mean the launch line's `--settings` or `PATH` did not reach the session.
- (e) `git -C <dotfiles worktree> diff --name-only origin/main...HEAD` lists no path under `claude/.claude/agents/` other than `claude/.claude/agents/cairn-register-editor.md`, no path under `claude/.claude/skills/cairn-figure/`, and not `bin/.local/bin/cairn-docs-outline`. The chain loads those from the stowed `~/.dotfiles` main checkout, so a fix there would not be live. `cairn-register-editor.md` is the one allowed path (conductor ruling, 2026-10-12): its whole-item 26-word cap line changes there, and the same fix reaches 2b through `editorPrompt`, which carries S1 with "S1 governs over your definition's cap line". `claude/.claude/agents/cairn-docs-drafter.md` stays a stop. Any other listed path is a stop with one question.
- (f) Grep the pinned script for `p.extraChecks` and record whether any match is on a line that is not a comment. (The `:63` match is the header comment, which does not count as a use.)
- (g) Setup ran: `npm ci && npm ci --prefix examples/showcase && (cd examples/showcase && npx svelte-kit sync)`.
- (h) The record is committed and pushed, and a draft PR is open against base `worktree-pre2b-tooling` in `glw907/cairn-cms`, with `ci-green` watching.
- (i) Before (h)'s commit, record the session id in the stage record: the basename of `printenv CLAUDE_JOB_DIR`, which the agent-view docs set to `~/.claude/jobs/<id>` in a background session. Record the first `<total_tokens>` reading too.

**Test:** the fast lane on the commit. **Clock:** 25.

### T1: run 1, six pages

**Outcome:** the chain output for run 1's pages, WIP-committed.

**Files:**
- Each page and its brief, plan, and framing record under `docs/extend/` and `docs/internal/briefs/extend/`.
- `docs/internal/facts/*.md`, `docs/internal/option-map.json`, `docs/internal/docs-friction-log.md`, and `docs/extend/README.md`.
- Possibly `scripts/checks/check-symbols-allowlist.mjs`, which is `runner`.

**Risk:** `ordinary`, or `runner` if the allowlist changes.

**Steps:**
1. Run the token projection.
2. Launch the Workflow with the `scriptPath` and `args` above.
3. Write the `runId` into the ledger, commit only the record, and push.
4. `cmp` the Workflow-persisted script (the path its result returns) against the pinned script, and record it. Never compare against the dotfiles worktree's current file: fix-forward commits can move it while the night runs.
5. Arm `claude-wf-guard ... writer <run-id>`.
6. On completion, kill the guard. The notification carries only the start of the result, then "(truncated N chars, full result in <path>)". Copy that `<path>` to `/var/home/glw907/.cache/draft-docs-2b-part1/run-1/result.json`, and never Read it whole. It is a JSON object whose `.result` is the runner's return value. Write each page record with `jq -c '.result.pages[] | select(.id=="<slug>")' /var/home/glw907/.cache/draft-docs-2b-part1/run-1/result.json > /var/home/glw907/.cache/draft-docs-2b-part1/run-1/<slug>.record.json`, one call per page. Then check the paths in `git status --porcelain`, and WIP-commit every listed path by name as `2b1-T1: WIP chain run <runId> output (<accepted>/<n> accepted)`.

**Acceptance:** six records returned, `cmp` identical, the WIP commit holds only permitted paths, and the commit is pushed. **Test:** each page's own gate status from its record. **Clock:** 220.

### T2: the framing A/B (runs beside T3's closes; disjoint files)

**Outcome:** two framing records and two introductions for `act-on-newly-published-entries`, kept in the A/B directory. The page proceeds on xhigh.

**Files:** creates `docs/superpowers/research/2026-10-11-draft-docs-2b-part1-ab/` (the A/B directory) holding `README.md` (the A/B section), `framing-xhigh.md`, `framing-high.md`, `intro-xhigh.md`, and `intro-high.md`. It never edits the stage record, which T3 writes at the same time; T11 links the README from the record. Scratch goes in `/var/home/glw907/.cache/draft-docs-2b-part1/ab/`. The generated script goes in `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1/.superpowers/draft-docs-2b-part1/`, which the session can read and git ignores.

**Risk:** `ordinary`. **Clock:** none of its own. T2 runs under T3's clock file, and it never writes, resets, or removes `pass-task-clock`.

**Method:**
1. Copy the chain's framing record first: `git show <run-1 WIP commit>:docs/internal/briefs/extend/act-on-newly-published-entries.framing.md > <A/B directory>/framing-xhigh.md`. Take it from the commit, because a T3 close may rewrite the file on disk.
2. Find the `framing:act-on-newly-published-entries` agent's id in run 1's `journal.jsonl` (its `started` line has that `label`). Extract its prompt with `jq -r 'select(.type=="user") | .message.content | select(type=="string")' <run dir>/agent-<id>.jsonl > <scratch>/raw.txt`. Then run `sed '1d; s/^  //' <scratch>/raw.txt > <scratch>/prompt-xhigh.txt`. The harness adds one header line (`[Workflow harness — computed task] ...`) and indents every prompt line by two spaces, as R5's run `wf_27395374-42e` shows. The `sed` removes both, so no hand-copying is needed.
3. `cp` that file to `<scratch>/prompt-high.txt`, then make two edits with `sed -i`:
   - Every occurrence of `docs/internal/briefs/extend/act-on-newly-published-entries.framing.md` becomes `docs/superpowers/research/2026-10-11-draft-docs-2b-part1-ab/framing-high.md`.
   - Append one paragraph (with `>>` from a scratch file): "A/B variant: do not open docs/internal/briefs/extend/act-on-newly-published-entries.framing.md or docs/extend/act-on-newly-published-entries.md. File no fact and no friction entry; list each fact you would file, with its Source, under a final heading 'Facts this record would file'."
4. Build the one-agent script `<script dir>/ab-framing.js`, never typing the prompt:
   - `sed -n '/^const FRAMING_SCHEMA = {/,/^};/p' <pinned script> > <script dir>/ab-framing.js`.
   - `jq -Rsr '"const P = " + tojson + ";"' <scratch>/prompt-high.txt >> <script dir>/ab-framing.js`.
   - Append the line `return await agent(P, { label: "framing-ab:act-on-newly-published-entries", phase: "Framing", schema: FRAMING_SCHEMA, model: "claude-opus-5-5", effort: "high", agentType: "general-purpose" });` from a scratch file. These are the runner's options at its framing call (search the pinned script for `label: \`framing:`), with `effort` the one change.
   - Run it with the Workflow tool's `scriptPath`.
5. Run one inline Workflow with two parallel `cairn-docs-drafter` calls (`claude-opus-5-5`). They get identical prompts except for the record path and output path. Each writes only the introduction of the page (H1 "Act on newly published entries") from its framing record, following the register's `### The introduction` section and the page plan's three introduction parts. It writes the introduction alone to its A/B file, edits no other file, files no fact, runs no gate, and skips agent-memory maintenance.
6. Write `README.md`, then commit the A/B directory by path as `2b1-T2: Record the framing A/B` and push.

**Acceptance:**
- The first line of `prompt-xhigh.txt` begins `Frame the introduction of docs/extend/act-on-newly-published-entries.md`.
- `diff <scratch>/prompt-xhigh.txt <scratch>/prompt-high.txt` shows only the path change and the appended paragraph.
- All four files are non-empty, and each `intro-*.md` starts with the H1 line `# Act on newly published entries`.
- The README names the asymmetries. The variant files no fact. And if a plan-read escalation re-framed the page on a revised plan, the xhigh record and the variant rest on different plans.
- If the prompt cannot be recovered verbatim, the A/B is recorded as not run, with the reason, in "Found, not done". It is never improvised.

**Test:** none beyond those.

### T3: run 1's closes, post-run record, and file-set read

**Outcome:** every run-1 page accepted, closed, or parked. The run's record is committed and the file set accepted.

**Files:** run 1's pages and their briefs, plans, and framing records; the shared containers; and the stage record.

**Risk:** `ordinary`, or `runner` with the allowlist.

**Steps:**
1. The executor closes each escalation per the contract, up to three pages in flight, after its budget check.
2. One `cairn-implementer` (Sonnet, `medium`) runs the fast lane and the whole-tree docs gate (`CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs-gate'`). It writes the run's section of the stage record, per page:
   - status, plan read, and round 1 and 2 gate and S, R, F (and Fig) verdicts;
   - `crossRegression`, the final read and re-test, and the escalation and how it was closed, with scoped verdicts;
   - `rowsReceived` against the run base and `rowsDisposed`;
   - `frictionFiled`, facts filed, and unexercised steps;
   - the caveat check: D7 or D8b stated as a cited `[verified]` fact on its page, any adapter path naming its site, and the sidebar figure a `repro` fence on `nav/worked-navlayout`. On a parked or reverted page the check reads "not checked: parked", never a pass;
   - the rulings.

   It then commits by path and pushes.
3. One `diff-reviewer` reads the file set only. It checks that every changed path belongs to a run page or a shared container, every allowlist entry is justified, no page outside the run changed, each brief matches its page, and each caveat is present. A `fix` takes one implementer re-dispatch, quoting the findings verbatim. A second `fix` takes one round with `model: opus`. A third is a stop.

**Acceptance:** every page is in a recorded end state, the whole-tree gate passes, and the reviewer accepts. **Test:** the docs gate, plus `check:facts`, `check:provenance`, and `check:options` inside it. **Clock:** 130 (100 for T3, plus T2's 30, since T2 runs under T3's clock).

### T4: run 2, four pages

As T1, with run 2's pages and its own projection and `rowsReceived` base. **Clock:** 210.

### T5: run 2's closes and post-run

As T3. **Clock:** 80.

### T6: run 3, three pages

As T1. **Clock:** 110.

### T7: run 3's closes and post-run

As T3. **Clock:** 70.

### T8: run 4, `migrate-existing-content`

As T1. **Clock:** 100.

### T9: run 4's close and post-run

As T3. **Clock:** 45.

### T10: the part 1 consistency read

**Outcome:** the drafted 2b pages are consistent with each other and with the outline.

**Files:** the drafted 2b pages and their briefs, the facts containers, and the stage record's consistency section.

**Risk:** `ordinary`.

**Steps:**
1. One Opus 5.5 agent (`general-purpose`, `medium`) reads only the 2b pages drafted. It checks them against:
   - the outline's `terms` and its `crossLinks` from and to these slugs;
   - overlap and uneven depth;
   - the register's rule that no page assumes Claude or a coding agent (`docs-register.md:150-155`);
   - each caveat's presence and the adapter-path consistency;
   - alt text, figure labels, and nav-label strings, for the register's tells.

   It returns 2a task 9's record shape: each finding with `file:line`, class, and the proposed edit.
2. One `cairn-implementer` applies the batch under the "Edits after the chain" rule, with the brief in the same commit. Any change beyond a pure term or link substitution gets one scoped `cairn-register-editor` read and one scoped fact read; their verdicts are recorded and any `fix` applied. It runs the whole-tree docs gate and commits.
3. One `diff-reviewer` reads the change.

This task covers no relink, `LEGACY_PATH_MAP`, or reference-arm fix (part 2).

**Acceptance:** each finding applied or refused with a reason, the scoped verdicts recorded, the gate green, and the reviewer's accept. **Test:** the whole-tree docs gate. **Clock:** 75.

### T11: close and hand-over

**Outcome:** a green, reviewed draft PR on Geoff's desk, with its triage.

**Files:** the stage record, and `docs/STATUS.md` on this branch. STATUS is rewritten in the present tense: part 1's state, any pages left for the resume with their resume lines, and part 2 as the next action.

**Risk:** `ordinary`.

**Steps:**
1. One whole-branch `diff-reviewer` runs (pass-core "Close": checklist globs, each task's class re-derived), then one batched fix chain if needed, then the gate again.
2. `ci-green` exit 0 on the head is the full-suite home.
3. The PR body is written to `/var/home/glw907/.cache/draft-docs-2b-part1/pr-body.md` and published with `gh pr edit <n> --body-file`. Its sections, in order:
   - `What landed`: per page, the end state (chain accept, targeted close, hand-run, or parked) and its commit.
   - `Framing A/B`: the four files, for Geoff's judgment.
   - `Per-page records`: a summary table and the record's path.
   - `Review`.
   - `End-to-end check`: the docs gate per page and whole tree, and `ci-green`.
   - `Retried tests`, listing every retry from `ci-green`.
   - `Token count`: S0, the ledger sum, and the count at the close.
   - `Before merge`: the cairn tooling PR merges first. The check is that `gh pr view <tooling pr> --json state` reads MERGED and this PR's base reads `main`.
   - `Found, not done`: each item with now, defer, or drop and a one-line reason.
   - `Score`: pass-core's rows (gates on the critical path, work and review, CI waits on the path, fix rounds and reds, close, total), from `cairn-run-gate --records /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1 draft-docs-2b-part1` and the commit clocks.
4. Run `review-desk pr glw907/cairn-cms "Draft docs stage 2b part 1" <n>` as a background Bash task. Hand over the "Found, not done" items as one `review-desk triage glw907/cairn-cms "2b part 1 found items" <file>`, where the file is a JSON array of `{item, disposition, reason}`.
5. Stay open until both commands exit, then act on each decision.

**Merge on approve.** Geoff's approve authorizes merging part 1 to `main` when every condition below holds; it does not wait for part 2. Part 1 is self-consistent under the forward-link rule, and part 2 should not stack on an unmerged branch.
1. The cairn tooling PR is MERGED. If it is not, the executor records "approved, waits on tooling PR #<n>" on the PR, notifies at normal urgency, and ends. The conductor merges after the tooling PR lands, under these same conditions.
2. The PR's base reads `main`. If GitHub has not retargeted it, the executor runs `gh pr edit <n> --base main`.
3. The whole-tree docs gate passes on the head (a receipt counts), and `ci-green <head> --pr <n>` exits 0.
4. `gh pr ready <n>`, then `PREMERGE_DONE=<n> gh pr merge <n> --merge --match-head-commit <head>`, with `<head>` taken from the decision. The executor does not pull the main checkout: the worktree guard refuses a `git -C` into it. Its notification says the checkout is stale, and the conductor pulls it.

There is no ancestor check against `origin/main` (conductor ruling, 2026-10-12, review finding M10). The tooling PR merges with `--merge`, so `main` gains a merge commit this head lacks, and that check could never pass without a new commit. pass-core asks only that a PR be safe under a plain merge followed by a pull.

If any condition needs a new commit (a merge of `main`, a fix), the approval does not cover the new head. The executor pushes, waits for green, and runs `review-desk pr` again for a fresh decision.

On reject, it fixes forward from the note, within part 1's scope, and hands over again. It acts on each triage row per pass-core: a "now" item becomes a follow-up task, a "defer" item is filed in ROADMAP with its line cited back in the PR, and a "drop" item stays in the PR. Then it ends.

**Acceptance:** the reviewer accepts, CI is green on the head, and the desk decisions are acted on. **Test:** `ci-green`. **Clock:** 45.

**Clock total:** 20 (L0, conductor) + 25 + 220 + 130 + 210 + 80 + 110 + 70 + 100 + 45 + 75 + 45 = 1,130 minutes. That is 1,110 for the executor, with T2's 30 inside T3's 130.

## Launch prompt

The conductor commits this text as `docs/superpowers/plans/2026-10-11-draft-docs-2b-part1-prompt.txt` on `overnight-2b-plan`, with this plan at `docs/superpowers/plans/2026-10-11-draft-docs-2b-part1.md`. After L0, it launches with:

`cd /var/home/glw907/Projects/cairn-cms && PATH=/var/home/glw907/.cache/draft-docs-2b-part1/bin:$PATH claude --bg --model sonnet --effort medium --name draft-docs-2b-part1 --settings '{"env":{"TMPDIR":"/var/home/glw907/.cache/draft-docs-2b-part1/tmp","NODE_OPTIONS":"--max-old-space-size=6144"}}' "$(cat /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1/docs/superpowers/plans/2026-10-11-draft-docs-2b-part1-prompt.txt)"`

Why each flag reaches the session:
- `PATH`: "A background session also runs with the `PATH` of the shell you dispatched it from" (agent-view docs, "Settings and provider").
- `--settings`: the agent-view docs list it among the "Configuration flags from the original launch [that] carry through to the backgrounded session", and `--bg`'s entry in `claude --help` (v2.1.296) names `--settings` too. Its `env` values apply to the session and the processes it starts. T0(d) checks all three values and stops on a miss.
- No `--add-dir` is needed. The chain script is pinned inside the worktree (L0 check 7), which the Workflow tool can already read.

