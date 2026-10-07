# Plan review, domain-risk lens: 2a's unattended finish

Target: `docs/superpowers/plans/2026-10-07-2a-unattended-finish.md` at `e2fc3815`. Governing plan:
`2026-09-30-draft-docs-stage-2a.md` on `draft-docs-2a` (`9ca04531`). Lens: data integrity, concurrency,
and unattended-failure risk. Scope held to gaps that lose work, fail silently, or stop the run on a
false signal. Line numbers below are the target plan's unless a path says otherwise.

Facts checked live on 2026-10-07: `main` has no branch protection (`gh api .../branches/main/protection`
returns 404), so `gh pr merge` enforces nothing. `/tmp` holds 2.6G of the 6,275M per-user quota before
the run starts, 1.9G of it under `/tmp/claude-1000`. `check-facts.mjs` verifies an anchored token
within a 10-line window of each cited line. The facts container cites `tool/internal/doctor` 78 times
(`admin.md` 40, `reference.md` 28, `extend.md` 10).

Counts: 0 blocker, 8 major, 6 minor, 1 owner fork.

## Major

### M1. Local `main` and `origin/main` diverge, and nothing says which `main` each step uses

**Where:** L157-158 (checkpoint 1 on `main`), L176, L180, L184, L199, L218, L222; governing plan
"checkpoint writes go to `main`'s".

**Defect:** the conductor commits STATUS checkpoints to the local `main` checkout. The lanes merge
through GitHub PRs, which move `origin/main` only. Three silent failures follow. First, L1 and L2 branch
"off `main`" after checkpoint 2. If that means local `main`, each lane PR carries unpushed STATUS
commits. Second, R7 "merges `main` in after both lanes have merged" (L222). If it merges local `main`,
the close gate never sees the lanes, and the plan's stated reason for that order fails without any
red. Third, after 2a's PR merges, local `main` holds unpushed commits that diverge from `origin`. The
next push is non-fast-forward, and an unattended agent's likely fix is a rebase or a force.

**Fold:** add one rule under "The unattended contract". Every checkpoint does `git fetch` and `git
merge --ff-only origin/main` before its STATUS commit, then pushes `main` straight away. A push that is
not a fast-forward stops the run. Each lane branches from `origin/main` after a fetch. R7 fetches,
fast-forwards local `main`, and merges `origin/main`.

### M2. "Merge on green" has no mechanism, and `main` is unprotected

**Where:** L28-29, L194, L218, L226.

**Defect:** `main` has no branch protection, so `gh pr merge` succeeds whatever state CI is in. "Green"
is only whatever the conductor checks. Two PRs can merge in close succession: L1's dependency bumps,
then L2b's timing fixes, or a lane and then 2a. The second PR's CI then ran against a base that has
since moved. The merge commit on `main` is a combination nobody tested. The plan also has no step that
watches `main`'s own CI after a merge. A red `main` caused by a lane then reaches R7. R7 merges it,
and the close gate fails on the 2a branch. The fix rounds there would chase a defect that 2a did not
introduce.

**Fold:** one merge procedure for all three merges. (1) `gh pr checks <n> --watch --required`, or all
seven workflows when nothing is marked required, must be green. (2) `gh pr view <n> --json
baseRefOid` must equal the current `origin/main`. If it does not, merge `origin/main` into the branch,
push, and wait for green again. (3) After the merge, watch `main`'s push CI to green before the next
merge or before R7 starts. A red `main` after a merge stops the run. The release hold (L29-30) keeps
the four production sites safe, so a stop costs nothing irreversible.

### M3. A stop leaves accepted work uncommitted in a shared worktree

**Where:** L26-27 and L39-42 (stop conditions), L171-176 (the commit comes only after the run).

**Defect:** the run stops when one task 8 page is still blocked after its targeted round. R5's commit
comes only "after the run". The other four accepted pages, their briefs, facts, and map rows are
therefore left uncommitted in `draft-docs-2a` until a person returns. The 16M stop has the same gap
when it lands inside R5's targeted closes, R6's batch, or R7. Uncommitted work in a long-lived
worktree is lost to any later `git checkout`, stash, or cleanup. The governing plan had to recover
this way before (the 7b WIP commits `a6885750`, `2aacb280`, `bf156175`).

**Fold:** add "every stop first WIP-commits the task's completed files on its feature branch (specific
paths, never `-A`), then writes STATUS with that commit and any `resumeFromRunId`" to the stop clause.
This matches the battery stand-down procedure in `unattended-work-guards.md`.

### M4. R7's merge of `main` has no resolution rules, so it stops on routine hunks

**Where:** L41 ("a merge hunk R2's rules do not cover" stops the run), L222.

**Defect:** R2's rules cover R2's five files only. By R7, `main` carries L1 and L2, and both write the
same ledgers as 2a. L2 deletes friction entries (`docs-friction-log.md:58-67`, `:86-91`) while R3 and
R5 append to that file. L1's held-major tripwires may touch `ROADMAP.md`, which R7 also edits. Any
lane facts bullet lands in a container that 2a rewrote heavily, and `package.json` gets L1's version
edits beside R2's combined scripts. A conflict in any of these is routine. Under L41, every one of them
stops the run at the last task, after most of the budget is spent.

**Fold:** give R7 its own rules, with the gate-economy doc's rule as the base. STATUS takes `main`'s.
HISTORY, CHANGELOG `## Unreleased`, the friction log, and fact bullets with distinct ids keep both
sides. `package.json` takes `main`'s versions and 2a's scripts. Any other hunk stops the run. Rewrite
L41 to read "a merge hunk not covered by the rules of the task doing the merge".

### M5. L2a moves code that 78 facts cite, and its gate never runs `check:facts`

**Where:** L202-210.

**Defect:** L2a's gate is `make -C tool check` alone. Its edits move and unexport code in
`tool/internal/doctor`, which the facts container cites 78 times with line-windowed anchors. They also
change doctor behavior on `::1`. Two failures follow. First, `check:facts` on `main` goes red after a
lane gate that called itself green. This is caught only when CI runs it, and L2a's acceptance never
names CI. Second, it can fail silently. `debug-your-site` is drafted in R5, before L2 starts, and its
subject is doctor. A claim about loopback handling can keep its anchor token in the window and still
state the old behavior. R7 then merges that drift with no red.

**Fold:** L2a's acceptance adds `npm run check:facts` and CI green on all workflows. Any moved
citation is re-pointed under the facts README, and any changed behavior is retagged in `main`'s
container. R7 adds one deterministic step after its merge. List the files the lanes changed (`git
diff --name-only <R2 merge>..origin/main`). Then send one scoped fact read over every 2a-branch fact
whose `Source:` names one of those files, and over the page sentences that cite it. See also OF1.

### M6. R4 runs three drafters in one worktree with no commit owner

**Where:** L133-138, L156-158.

**Defect:** R4 runs "up to three in flight" through direct Agent dispatches, not through the page
chain. "Each page's brief changes in the same commit" makes every drafter, or every page, a committer
in one shared worktree. Concurrent commits race on `.git/index.lock`. A `git add` followed by `git
commit` can also sweep a sibling's staged files into the wrong page's commit. Then the whole-tree docs
gate and the scoped reads, which work from the uncommitted diff, see a sibling's half-edited page and
brief. That yields false reds and fix rounds on the wrong page.

**Fold:** drafters and scoped readers never commit. Each scoped read takes its page's paths
explicitly. Per-page gates use `--page {page} --brief {brief}`. One `cairn-implementer` commits after
all pages finish, one commit per page with explicit paths, in series, and runs the whole-tree gate once
at the end. That is the governing plan's post-run pattern.

### M7. The add-cairn re-test reaches real accounts unattended

**Where:** L137-138.

**Defect:** milestones 1 to 3 of `add-cairn-to-a-sveltekit-app` include `npx wrangler login`, an
interactive OAuth flow, and `npx wrangler deploy` (page L138-203). They also include "Push the site to
GitHub" (L818). An unattended reader cannot finish the login, and `CLOUDFLARE_API_TOKEN` is sourced
only in interactive shells. So the re-test does one of three things. It fails and blocks the page,
which stops the run on a false signal. It skips the deploy quietly and reports accept. Or it finds a
token and creates a real Worker and repository under Geoff's accounts, which no stop clause covers.

**Fold:** name the re-test's scope in R4. Build the site and run `npx wrangler deploy --dry-run`. Run
the dev-backend sign-in and the local content build. Skip `login`, `deploy`, and the push, and record
the skipped steps in the stage record. Use the same scope for R5's reader re-tests.

### M8. The `/tmp` quota runs short again, and the lanes make it worse

**Where:** the guard list at L44-47 (no disk guard); the close record
`2026-10-03-draft-docs-2a-targeted-close-record.md:60`.

**Defect:** the last close hit the 6.1G per-user `/tmp` quota mid-close, and 2.6G is already in use.
This run adds two lane worktrees doing `npm ci`, Vite builds, and Playwright `--repeat-each=10`. It
also adds the workflow transcripts under `/tmp/claude-1000` and R7's full gate. ENOSPC inside a gate
reads as a red gate. A red gate costs a fix round, and the reviewer then grades a gate log that does
not point at the change. A truncated scratch file can also pass unnoticed.

**Fold:** at launch and at each checkpoint, the conductor reads `quota -s`. Above 4.5G it clears its
own session scratch and Node's compile cache, as the close record did. Every dispatch prompt and both
lane briefs say to put scratch and `TMPDIR` under `$HOME/.cache`. An ENOSPC in any gate is classed as
an environment artifact under the contract (L34), never as a code finding.

## Minor

### m1. The plan does not say whether the lanes run when 2a stops

**Where:** L23, L39, L69-70.

The plan expects 2a's 16M stop "during R6 or R7" (L69). L23 says a lane halts alone, but it never
states the converse. Under L39 the session "waits". The lanes start at R5's post-run commit, which is
the most likely place for the 16M stop to land. Their launch is therefore undefined on the expected
path. **Fold:** one sentence. A 2a stop lets lanes already in flight run to their own merges, and no new
lane starts after a stop. Severity minor only because both readings lose no work.

### m2. Budget R5 at the measured escalation rate

**Where:** L61, L26-27.

Every pilot page escalated at the round cap three times out of three. The targeted close cost about 4M
across six pages, roughly 0.7M a page (governing plan ledger, the 7b resolution row). R5's 9.0M assumes
no targeted closes. At 1.8M plus 0.7M a page, R5 runs about 12.5M, so the 16M stop lands inside R6, not
R6 or R7. **Fold:** restate the R5 line with the targeted close included, so the STATUS resume point is
the predicted one.

### m3. Nothing enforces the hard ceiling inside R5's single workflow

**Where:** L21-23.

"Finish the task in flight" at 80 percent cannot hold the 20M hard ceiling when the task in flight is
one 9M to 12M workflow. **Fold:** launch R5's workflow with a turn-level token target equal to the
headroom left to 20M, which `unattended-work-guards.md` names for expensive sweeps.

### m4. Lane attribution moves 2a's stop line

**Where:** L49-51.

`/cost` is the only total, and lane usage is an estimate, so 2a's 16M stop is "global `/cost` minus a
lane estimate". **Fold:** a lane's spend is the sum of its own agents' usage blocks, recorded at each
lane boundary. 2a's position is `/cost` minus that sum. An over-attribution then errs toward stopping
2a early, which is the safe direction.

### m5. R1 edits a runner other sessions may be executing

**Where:** L74-87.

`pass-execute.js` and `pass-execute-chains.js` are workstation-wide, and a dubplate session shares the
machine. **Fold:** before R1, run `pgrep -f pass-execute` and `ListAgents`. If a live run uses the
runner, R1 waits for it to finish.

### m6. Mark targeted-close pages on Geoff's review page

**Where:** L28-29, L223-224.

On the expected path most task 8 pages close by conductor ruling and then merge before Geoff reads
them. The release hold contains the risk. **Fold:** the review page marks each page "targeted close"
or "chain accept" and lists its rulings, so his read starts at the weakest pages.

## Owner fork

### OF1. L2a's `::1` reconciliation is a behavior choice made with no one attending

**Where:** L204-205.

Reconciling `isLocal` and `isLocalOrigin` on `::1` changes doctor output, and `debug-your-site`
documents that output. The test then pins whichever behavior the implementer picks.

- **(a) Pre-decide it now (recommended).** Treat `::1` as local in both functions, as with `127.0.0.1`,
  since both are loopback addresses. The plan states the decision, and M5's fold covers the docs.
- **(b) Defer the `::1` item** to the next tool pass, and take only L2a's non-behavioral items (a, c,
  d, e, f, g) in this run.
- **(c) Leave it as written.** The implementer picks, and R7's scoped fact read is the only check.

## Proportionality

The ceremony is mostly sized right for an unattended run. Two items cost clock time on the shared heavy
lock with little return. L2b's `--repeat-each=10` should run on the touched specs only, which L215
already implies. State it, so no agent repeats the whole suite. The four STATUS checkpoints on `main`
are the root of M1. If M1's fold is too much ceremony, write checkpoints 1 to 3 to the branch's stage
records and write `main`'s STATUS only at a stop and at checkpoint 4. That leaves one push to sequence
instead of four.
