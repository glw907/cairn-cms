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
- Until the dotfiles PR merges and `make install` rebuilds `~/.local/bin/tellgrader`, `check:tellgrader` still reads the bare noun "showcase" as `slop-hard`. The executor rules alone that such a finding on the example site's name is a known tool artifact. It records the finding and never rewrites the name.

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
- **How a hand-run seat is dispatched.** The dispatch names the runner function whose prompt the seat follows (`planPrompt`, `framingPrompt`, `draftPrompt`, `structurePrompt`, `editorPrompt`, `factPrompt`, `figurePrompt`, or `readerPrompt`, in the run's script file). It tells the agent to read that function and follow the prompt it renders. It states the page's values: worktree, page path, track `extend`, slug, the brief, plan, and framing paths under `docs/internal/briefs/extend/`, the outline path, the option-map path, and the gate string with `{page}` and `{brief}` filled in. It uses the agent type and model the runner gives that seat: Opus 5.5, with `cairn-register-editor`, `figure-verifier`, or `cairn-docs-drafter` where the runner names one, and `general-purpose` otherwise.
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
2. Write `$(git rev-parse --absolute-git-dir)/pass-stop` with the task, what failed, and one question.
3. Put the same facts in the branch's `docs/STATUS.md`, with the resume lines: the relaunch command and, for a halted chain run, its `scriptPath`, `args`, and `resumeFromRunId`.
4. Commit and push as `Record a stop in STATUS (<task>)`.
5. Run `notify-send -u normal "cairn 2b part 1 stopped at <task>: PR #<n>; resume: claude attach draft-docs-2b-part1"`.
6. End the turn. Every wake-up tick first runs `test -e "$(git rev-parse --absolute-git-dir)/pass-stop"` and ends the turn if the file exists.

The token stop is not a failure, so it is the one exception. It starts no new chain run, close, or consistency read, but it still runs T11's hand-over (the record commit, the PR body, `ci-green`, and review-desk) with the stop stated. That costs about 0.3M, inside the 9M between the stop and the 45M ceiling.

**Counting.**
- **Where the count starts.** The ruling's measure is `/cost`. The conductor reads it for the night so far (the tooling session plus planning) and writes it at launch as `night_tokens_at_launch` in the launch-facts file. A `--bg` executor cannot run a slash command: 2a's finish ledger reads "the conductor could not read `/cost`".
- **The executor's count.** `night_tokens_at_launch`, plus each Workflow run's reported token total, plus each Agent or inline-Workflow dispatch's usage total, plus 0.15M for every task the executor completes, which stands in for its own loop. The stage record's ledger table holds every figure, so a relaunch recomputes the count.
- **Projection before each chain run.** Count + (pages × per-page figure) + 1.3M reserve (consistency read 1.0M, hand-over 0.3M) must be at or under 36M. The per-page figure is 2.0M until run 1's closes end, then the measured mean (chain plus closes) of the closed pages. A run that does not fit launches its queue's first pages that do. If none fit, that is the token stop.
- **Before each close or hand-run.** Count + 0.9M + 1.3M must be at or under 36M. Otherwise the page is left as its WIP state with its escalation recorded, and the token stop follows.
- **Before T10.** Count + 1.3M must be at or under 36M. Otherwise T10 is skipped and listed in "Found, not done".

**Guards.**
- The `/loop` wake-up with no interval, armed first.
- `claude-wf-guard <transcript-dir> writer <run-id>` as a background Bash task on every chain run, killed when the run's completion notification arrives.
- `TMPDIR=/var/home/glw907/.cache/draft-docs-2b-part1/tmp` and `NODE_OPTIONS=--max-old-space-size=6144`, set on the launch line so workflow agents inherit them. Every dispatch puts scratch under `/var/home/glw907/.cache/draft-docs-2b-part1/`.
- `quota -s`'s `/tmp` row read at each task boundary.
- The battery check at each task boundary.
- No lid-switch hold: the lid stays open and the laptop on AC, per the ruling.

**Command forms** (from the alignment plan's probe of 2026-10-11):
- One plain command per Bash call, with literal absolute paths.
- Never `git -C` into a sibling cairn-cms worktree. `git -C /var/home/glw907/.dotfiles/.claude/worktrees/pre2b-tooling ...` is allowed and read-only here.
- Intermediate output goes to a scratch file, never piped into a substitution.
- `ci-green` and `cairn-run-gate` output is redirected to a file and never piped.

**Skip agent-memory maintenance.** Every dispatch prompt the executor writes carries the line: "Skip agent-memory maintenance; do not read or write agent memory."

## Global constraints (beyond 2a's)

- **No edits beyond the part 1 files.** No task edits `docs/internal/record/harvest/relink.json`, `LEGACY_PATH_MAP` (`scripts/checks/docs-links.mjs`), the outline, any `docs/reference/` page, `choose-an-ai-posture.md`, `migration-notes.md`, `upgrade-cairn.md`, or `docs/internal/briefs-rebuilt.json`. A defect found there goes to the friction log or "Found, not done".
- **Links into the arm.** A link from a 2b page to an outline page not yet drafted passes as pending (`c498b6fa`), and the index link-in is the chain's own (the helper's `link` command).
- **The friction log** gains the chain's entries and is not triaged here. Triage is 2b's close, in part 2.
- **Commits** use subjects prefixed `2b1-T<n>:`, in the imperative mood, with specific paths. Each commit body ends with `Pass-Clock: task=<id> start=<epoch> end=<epoch> estimate=<min> fixes=<n>`, read from the clock file, which also carries `base=<sha>` per the alignment plan's convention.
- **Pushes.** Push `draft-docs-2b-part1` to `glw907/cairn-cms` after every commit, then start `ci-green <sha> --pr <n> --wait > /var/home/glw907/.cache/draft-docs-2b-part1/ci-<sha>.log 2>&1` as a background task, re-issued on 75. No task waits for CI.
- **Gates.** Each commit's fast lane is what `node scripts/checks/gate-tier.mjs --fast --range <base>..HEAD` prints, each leg run through `cairn-run-gate` on its printed lane.
- **Resume.** A relaunch runs the launch prompt again. It finds the PR with `gh pr list --head draft-docs-2b-part1 --state all`, and never opens a second one. A task is done when a commit subject starts with its id (subjects starting `Record a stop` don't count). A chain-run task whose `runId` sits in the stage record's ledger with no WIP commit resumes with that `resumeFromRunId` and the same `scriptPath` and `args`.

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

**Arguments for every run.** These go in the `args` of the Workflow call. `scriptPath` is `/var/home/glw907/.dotfiles/.claude/worktrees/pre2b-tooling/claude/.claude/workflows/docs-page-chain.js`.

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
- **D8b** (`run-cairn-audit-on-your-site`): "ROADMAP.md:1131-1133 (D8b) and src/lib/audit/report.ts:1-4,40-52: cairn-audit prints a plain-text report, with no --json output and no stable finding codes. The page claims nothing this contradicts and states the limitation as a filed [verified] fact."
- **FIGURE** (`arrange-the-admin-sidebar`): "src/lib/reproductions/stories/site.ts:76-86 (story nav/worked-navlayout) and src/lib/reproductions/fixtures.ts:262-275 (fixtureNavLayout): the figure is a live reproduction in a repro fence naming this story, never a screenshot (cairn-figure skill, 'Interface figures: live first')."

If T0 finds that the tooling script reads `p.extraChecks`, the D7 and D8b sentences also ride as `extraChecks`.

**Map rows pending at plan time** (`docs/internal/option-map.json`, `pendingCount` 104): `content-model` 27, `turn-on-tidy` 16, `define-an-adapter-and-schema` 15, `arrange-the-admin-sidebar` 15, `build-the-public-routes` 8, `configure-rendering` 7, `configure-media` 6, `act-on-newly-published-entries` 4, `share-a-draft-preview` 3, `link-content-with-references` 1. Each run's `rowsReceived` baseline is `git show <run base>:docs/internal/option-map.json`, where the run base is the commit just before the run launches.

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
| Executor loop | 1.8M | 0.15M across 12 tasks |
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
- Writes `/var/home/glw907/.cache/draft-docs-2b-part1/launch-facts.txt` with the lines `cairn_tooling_head`, `cairn_tooling_pr`, `dotfiles_tooling_head`, `dotfiles_tooling_pr`, `dotfiles_gate`, and `night_tokens_at_launch`.
- Creates `/var/home/glw907/.cache/draft-docs-2b-part1/tmp/`.

**Risk:** `ordinary`.

**Acceptance:**
1. `ci-green <cairn head> --pr <n> --wait`, run from the cairn tooling worktree, exits 0.
2. The dotfiles gate passes on the dotfiles head. The tree has no CI, so this uses `cairn-run-gate --receipt 'bash scripts/check.sh'` from the dotfiles tooling worktree, or `bash scripts/gate.sh` exiting 0 there.
3. pass-core's pre-launch checks: `git -C /var/home/glw907/Projects/cairn-cms fetch origin`, the main checkout on `main`, and `rev-list --count HEAD..origin/main` printing 0. `.claude/worktrees/` is already ignored.
4. `quota -s` shows `/tmp` under 4.5G. At plan time it reads 5.9G of the 6.1G quota, 4.2G of it under `/tmp/claude-1000/-var-home-glw907-Projects-dubplate`, another project's data.
5. Create the worktree with `git -C /var/home/glw907/Projects/cairn-cms worktree add -b draft-docs-2b-part1 /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1 <cairn head>`, then `git merge --no-edit origin/overnight-2b-plan` inside it. Merge no STATUS edit to `main` while the executor runs (pass-core "Conductor").
6. Launch with the launch block at the end of this plan.

If either check 1 or check 2 fails, 2b does not launch.

**Test:** the checks above. **Clock:** 20.

### T0: pre-flight and the open draft PR

**Outcome:** the executor in its worktree with setup run, every launch fact re-verified and recorded, the stage record started, and the draft PR open.

**Files:** creates `docs/superpowers/research/2026-10-11-draft-docs-2b-part1-record.md`, the stage record. It has sections for launch facts, a ledger table (task, run id, commits, tokens, count after), per-run page tables, the A/B, the consistency read, and rulings for Geoff.

**Risk:** `ordinary`.

**Acceptance:**
- (a) The branch is `draft-docs-2b-part1`, and `git merge-base --is-ancestor` passes for the cairn tooling head and for `origin/overnight-2b-plan`.
- (b) `ci-green <cairn head> --pr <cairn tooling pr>` exits 0.
- (c) `git -C /var/home/glw907/.dotfiles/.claude/worktrees/pre2b-tooling rev-parse HEAD` equals `dotfiles_tooling_head`, and that worktree's `status --porcelain -- claude/.claude/workflows/docs-page-chain.js` is empty.
- (d) `TMPDIR` and `NODE_OPTIONS` are set as above, and `/tmp` is under 4.5G.
- (e) `git -C <dotfiles worktree> diff --name-only origin/main...HEAD` lists no path under `claude/.claude/agents/` or `claude/.claude/skills/cairn-figure/`, and not `bin/.local/bin/cairn-docs-outline`. The chain loads those from the stowed `~/.dotfiles` main checkout, so a fix there would not be live. A listed path is a stop with one question.
- (f) Grep the tooling script for a use of `extraChecks` and record the result.
- (g) Setup ran: `npm ci && npm ci --prefix examples/showcase && (cd examples/showcase && npx svelte-kit sync)`.
- (h) The record is committed and pushed, and a draft PR is open against base `worktree-pre2b-tooling` in `glw907/cairn-cms`, with `ci-green` watching.

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
4. `cmp` the Workflow-persisted script (the path its result returns) against the dotfiles worktree file, and record it.
5. Arm `claude-wf-guard ... writer <run-id>`.
6. On completion, kill the guard, write each page record to `/var/home/glw907/.cache/draft-docs-2b-part1/run-1/<slug>.record.json`, check the paths in `git status --porcelain`, and WIP-commit every listed path by name as `2b1-T1: WIP chain run <runId> output (<accepted>/<n> accepted)`.

**Acceptance:** six records returned, `cmp` identical, the WIP commit holds only permitted paths, and the commit is pushed. **Test:** each page's own gate status from its record. **Clock:** 220.

### T2: the framing A/B (runs beside T3's closes; disjoint files)

**Outcome:** two framing records and two introductions for `act-on-newly-published-entries`, kept in the stage record. The page proceeds on xhigh.

**Files:** creates `docs/superpowers/research/2026-10-11-draft-docs-2b-part1-ab/` holding `framing-xhigh.md` (a copy of the chain's record), `framing-high.md`, `intro-xhigh.md`, and `intro-high.md`, and adds the stage record's A/B section.

**Risk:** `ordinary`.

**Method:**
1. Find the `framing:act-on-newly-published-entries` agent in run 1's `journal.jsonl`, and extract its first user message from its `agent-<id>.jsonl` into a scratch file with `jq`, never by hand-copying.
2. Make two edits in a copy:
   - Every occurrence of `docs/internal/briefs/extend/act-on-newly-published-entries.framing.md` becomes the A/B path `.../framing-high.md`.
   - One paragraph is appended: "A/B variant: do not open docs/internal/briefs/extend/act-on-newly-published-entries.framing.md or docs/extend/act-on-newly-published-entries.md. File no fact and no friction entry; list each fact you would file, with its Source, under a final heading 'Facts this record would file'."
3. Run one inline Workflow whose single `agent()` call takes that prompt from `args`, with `model: "claude-opus-5-5"`, `effort: "high"`, and `agentType: "general-purpose"`.
4. Run one inline Workflow with two parallel `cairn-docs-drafter` calls (`claude-opus-5-5`). They get identical prompts except for the record path and output path. Each writes only the introduction of the page (H1 "Act on newly published entries") from its framing record, following the register's `### The introduction` section and the page plan's three introduction parts. It writes the introduction alone to its A/B file, edits no other file, files no fact, runs no gate, and skips agent-memory maintenance.

**Acceptance:**
- The extracted prompt's first line begins `Frame the introduction of docs/extend/act-on-newly-published-entries.md`.
- `diff` of the two prompts shows only the path change and the appended paragraph.
- All four files exist.
- The stage record names the one asymmetry: the variant files no fact.
- If the prompt cannot be recovered verbatim, the A/B is recorded as not run, with the reason, in "Found, not done". It is never improvised.

**Test:** none beyond those. **Clock:** 30.

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
   - the caveat check: D7 or D8b stated as a cited `[verified]` fact on its page, any adapter path naming its site, and the sidebar figure a `repro` fence on `nav/worked-navlayout`;
   - the rulings.

   It then commits by path and pushes.
3. One `diff-reviewer` reads the file set only. It checks that every changed path belongs to a run page or a shared container, every allowlist entry is justified, no page outside the run changed, each brief matches its page, and each caveat is present. A `fix` takes one implementer re-dispatch, quoting the findings verbatim. A second `fix` takes one round with `model: opus`. A third is a stop.

**Acceptance:** every page is in a recorded end state, the whole-tree gate passes, and the reviewer accepts. **Test:** the docs gate, plus `check:facts`, `check:provenance`, and `check:options` inside it. **Clock:** 100.

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
3. `git merge-base --is-ancestor origin/main <head>` passes.
4. The whole-tree docs gate passes on the head (a receipt counts), and `ci-green <head> --pr <n>` exits 0.
5. `gh pr ready <n>`, then `PREMERGE_DONE=<n> gh pr merge <n> --merge --match-head-commit <head>`, with `<head>` taken from the decision. Then the checkout pull as pass-core "Close" says.

If any condition needs a new commit (a merge of `main`, a fix), the approval does not cover the new head. The executor pushes, waits for green, and runs `review-desk pr` again for a fresh decision.

On reject, it fixes forward from the note, within part 1's scope, and hands over again. It acts on each triage row per pass-core: a "now" item becomes a follow-up task, a "defer" item is filed in ROADMAP with its line cited back in the PR, and a "drop" item stays in the PR. Then it ends.

**Acceptance:** the reviewer accepts, CI is green on the head, and the desk decisions are acted on. **Test:** `ci-green`. **Clock:** 45.

**Clock total:** 20 (L0, conductor) + 25 + 220 + 30 + 100 + 210 + 80 + 110 + 70 + 100 + 45 + 75 + 45 = 1,130 minutes. That is 1,110 for the executor, with T2 running beside T3.

## Launch prompt

The conductor commits this text as `docs/superpowers/plans/2026-10-11-draft-docs-2b-part1-prompt.txt` on `overnight-2b-plan`, with this plan at `docs/superpowers/plans/2026-10-11-draft-docs-2b-part1.md`. After L0, it launches with:

`cd /var/home/glw907/Projects/cairn-cms && TMPDIR=/var/home/glw907/.cache/draft-docs-2b-part1/tmp NODE_OPTIONS=--max-old-space-size=6144 claude --bg --model sonnet --effort medium --name draft-docs-2b-part1 "$(cat /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2b-part1/docs/superpowers/plans/2026-10-11-draft-docs-2b-part1-prompt.txt)"`

