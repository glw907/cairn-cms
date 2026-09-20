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

**extend-2 is IN FLIGHT (launched 2026-09-20)**, one `pass-execute-chains` workflow over two
worktrees: chain A (`.claude/worktrees/extend-2`, tasks 1a, 1b, 2, 3a, 3b, 3c, 4) and chain B
(`.claude/worktrees/extend-2-skills`, tasks 5, 6, 7). **Checkpoint (2026-09-20 12:10):** chain B
is DONE, 5 (one comment-only fix round), 6, and 7 ACCEPTED. Chain A halted at 1a on a second `fix`
whose one blocking finding was a false MANIFEST sentence in `docs/reference/guidance.md`, marked
comment-only; the conductor ruled accept-after-fix, a direct `cairn-implementer` dispatch is
landing it, and chain A then relaunches from 1b (1b, 2, 3a, 3b, 3c, 4) as a second workflow run.
First run `wf_0d3513c9-bdb` spent 1.87M subagent tokens over four tasks, and Geoff raised the
ceiling to 6.5M (2026-09-20; same scope, the 80 percent flag now 5.2M). Rulings taken: the
gate per task is `gate-tier.mjs`'s computed string plus the checks the task's criteria name; a
`package.json` touch computes the `full` tier, whose local e2e is green when its only failures
are the 20 CI-canonical baseline files from `4de378ec`; the unknown-exclusion case prints the
`@source not` line from a constant, with no sixth packaged snippet. **Owed at the ritual, one
chain-B fold task:** `skills/cairn-consult/references/the-standard.md` carries a dated spec
citation inside shipped markdown (the byte-identical copy criterion conflicts with the
no-process-citations constraint; strip the HTML comment and relax the diff to the body);
`cairn-consult` names workstation-only `engine-consult` and `engine-triage`; `cairn-extend` cites
`docs/internal/` paths that do not ship in the tarball, and `preflight.md` names siblings that
exist only after chain A merges; `daisyui-first.md` misses the `polish-busy-idiom` slug and
rounds 1.14:1 to "under 1.5:1". A cold session checks both worktrees for a live executor before
touching either.

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

- **Go `cairn` tool, 1.0: pass A is CLOSED (2026-09-20), unmerged; Pass B1 is next.** Branch
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
