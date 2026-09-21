# cairn-cms status

Where the work is now, what is next, and the open decisions; `cairn-pass` rewrites it at each
pass-end. Durable orientation is `CLAUDE.md`; everything past tense is [`docs/HISTORY.md`](HISTORY.md).

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries eleven
engine passes plus chassis-A/B1/B2, polish-11a/11b-i/11b-ii/C, the admin motion pass, and
docs-to-facts, and extend-1 (PR #66, merged 2026-09-20) unpublished under `## Unreleased`. The
window holds for one cut, after extend-2. CI on `main` is green.

## Immediate next action

**extend-2 is IN ITS CLOSE (2026-09-20 17:30), PR #67** (`extend-2`, head `703b411d`; worktree
`.claude/worktrees/extend-2`; `extend-2-skills` is merged into it). All ten tasks ACCEPTED (1a,
1b, 2, 3a, 3b, 3c, 4, 5, 6, 7). Close commits on top: the skills merge `da3d24e5`, fold 1
`c0980e59`, fold 2 `722ee35c`, the prose fold `d176a95d`, the security fix `9aa7765a`,
`code-simplifier` `703b411d`. The blocking security read found write containment was lexical only
(a symlinked `.claude`, a dangling `.orig` link); fixed on Opus, re-read, PASS. **In flight:** a
gate-runner agent on the from-scratch consumer build, the plan's FULL string, and the local e2e;
CI on PR #67. **Left, in order:** read both gate results; the monthly Claude Code schema routine
(`schedule` skill, id into Active watches); one close fold on the branch (HISTORY entry, the
plan's post-mortem, ROADMAP entry for the six security-hardening items M1 to M6 from the re-read:
non-recursive `mkdir` against a planted symlink, refuse `nlink > 1`, carry `err.code` out of the
write catch, `EACCES` outside the try, the lstat walk on `check`'s read side, a refused
destination missing from the report lists; facts bullet home for the symlink rule); merge on green
CI; STATUS pruned to 60 lines on `main`; memory refreshed; inhibitors released. Spend about 5.6M of
the 6.5M ceiling Geoff set 2026-09-20, past the 5.2M flag with only the close left, so no question
was raised. Rulings taken: the per-task gate is `gate-tier.mjs`'s computed string plus the checks
the criteria name; 3c's `dist` criterion binds the `@source` line only (plan carries it), the
`sheet` entry filed to ROADMAP; shipped guidance names engine docs as
`node_modules/@glw907/cairn-cms/docs/...` paths from the site root, never relative links; the
fragment's `cairn docs <query>` line was cut because the subcommand has not shipped (the docs
rebuild restores it); Blueprint stays as the ruled paid option, with its URL. A cold session
checks the worktree for a live executor before touching it.

The pass: plan `docs/superpowers/plans/2026-09-14-extend-2-pass.md`, in a
worktree off `main`, workflow mode through `pass-execute-chains.js`. Its 2026-09-19 amendment adds
one task, an engine-owned Tailwind sources file, so a site's own `admin.css` never names the
engine's `dist` path to hold the utilities-layer superset extend-1's seam needs. Its docs
deliverables file container bullets in `docs/internal/facts/extend.md` rather than editing the frozen
`docs/extend/` pages; reference pages still update per task. The pending cut is `0.97.0`, which
extend-1's "Available since" lines name; its two advisory audit rules promote to error at `0.98.0`.

Then, in order: **one cut**, with the dependency sweep before it and the site upgrade brief's tools
section in the pre-cut pass (no release before this); **the docs-infra currency pass**
(`~/.dotfiles/docs/superpowers/plans/2026-09-19-docs-infra-currency-pass.md`, APPROVED 2026-09-19),
after the cut and before the site round; **the site round**, aksailingclub-org, ecxc-ski, and 907-life
upgraded as model cairn sites, each filing container bullets via `site-docs/<site>-<pass>`, then one
improvement release; then **the docs rebuild** from the facts container, then beta.

## Parallel tracks

- **Go `cairn` tool, 1.0: Pass B1 is IN FLIGHT (launched 2026-09-20 15:30), one executor in
  `.claude/worktrees/cairn-tool-a`; check it is idle before touching it.** The re-cut is done
  (`7d06e29c`), the three-lens review folded (`2bb2cb3f`), segment 1's pre-flight applied
  (`35b6f97d`), all on the branch, unpushed. B1 is nine tasks: segment 1 (11b-i, 11b-ii, 12, 13)
  runs as `pass-execute` run `wf_9deb92f1-2d5`; segment 2 is 14 to 17; segment 3 is 17b, the
  close and the PR #60 merge. Each segment gets a factual pre-flight first. Runner args: `gate:
  "make -C tool check"`, `gateLane: "light"`, `gateTier: "docs"` pinned on every task (an
  unpinned task makes the runner run `gate-tier.mjs`, which has no `tool/**` rule). Ceilings
  accepted by Geoff 2026-09-20: B1 8M, B2 10M; the mechanics review prices B1 at 9 to 9.5M, so
  the 6.4M flag is the expected question. Spend so far: about 1.1M (authorship, reviews, fold,
  pre-flight). Owner item filed in the plan: an `edge.hsts-off` engine condition id. Branch
  `cairn-tool-a`, worktree `.claude/worktrees/cairn-tool-a`, draft PR #60, green on all three
  `make check` legs. `main` carries NO `tool/` tree until the merge, and the merge rides B1's
  close (Geoff, 2026-09-20), so **B1 runs in that existing worktree on that branch, never on a
  new worktree off `main`**. B1's first step is plan authorship: re-cut Pass B into B1 and B2
  from `docs/superpowers/plans/2026-09-20-cairn-tool-pass-b-recut-brief.md` (on `main`;
  pre-approved by Geoff within the brief's bounds), then the three-lens plan review, one fold, a
  factual pre-flight per segment, then execute. The brief carries Geoff's three rulings (one TTY
  predicate for color only; the B1/B2 split; the full grammar cleanup), the B1 opening refactor
  task, every task amendment, what was declined, and the 2.0 spec addendum. Gate:
  `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'` (`gateLane: "light"` in the
  runner's args); skip `gate-tier.mjs` for `tool/`-only diffs until it gains a `tool/**` rule
  (filed in ROADMAP on the branch). Arm `/loop` at launch. Credentials are minted and stored
  (`CAIRN_CF_READ_TOKEN`, `CAIRN_CF_ACCOUNT_ID`, `CAIRN_GH_READ_TOKEN`; the GitHub token expires
  2026-10-19). Plan, with pass A's post-mortem: `-cairn-tool-1-0-pass.md` ON THE BRANCH (the copy
  on `main` predates the pass). Pass A's record: [`docs/HISTORY.md`](HISTORY.md).
  **Open decision for Geoff:** none blocking; the re-cut is pre-approved.
- **The cairn case (front-door argument): DEAD (Geoff, 2026-09-12).** Frozen record only,
  `docs/internal/record/2026-09-04-cairn-case/`; nothing from it lands.
- **`cairn-pub`, branch `pass-d-docs-tracks`.** Un-pinnable against the registry since `0.95.0`.

## Open decisions

- Node 26 becomes the floor at beta only if it is Active LTS by then (Current until Oct 2026).
- TypeScript 7 stays held until `svelte-check --tsgo` runs green (`tsgo.yml` checks weekly).

## Active watches

- A monthly Cloudflare capability-review routine (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) reads
  `ROADMAP.md`'s "Platform watch: Cloudflare" section and emails a ranked report.
- `install.test.mjs`'s concurrent-poll test flaked once in a 30x local loop (2026-08-29); its
  next CI failure gets the same mock-timer deflake as the grace-window tests.
- A consumer `guard.rejected` record with `detail: 'mismatch'`, `witness: 'field'` can be the
  known double-mint residual, not a new mechanism; the discriminator names any genuinely new one.
- Three ASC staging harvest docs are folded into cairn, slated for deletion in the ASC repo once
  the ASC `email-announce` branch settles.
- `cairn-audit --rendered` over the engine's admin screens reports a different count on identical
  runs (133 then 116, all `border-contrast`/`viewport-overflow`); stabilize before it gates.

## Resume prompt

Two tracks, one session each.

**extend-2:** Execute the extend-2 plan (`docs/superpowers/plans/2026-09-14-extend-2-pass.md`).

**Go tool Pass B1** (launch inside `cairn-cms`; work in `.claude/worktrees/cairn-tool-a`): Start Go tool
Pass B1: re-cut Pass B from `docs/superpowers/plans/2026-09-20-cairn-tool-pass-b-recut-brief.md`,
review it, then execute B1 on branch `cairn-tool-a`.
