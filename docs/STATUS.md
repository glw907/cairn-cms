# cairn-cms status

Where the work is now, what is next, and the open decisions; `cairn-pass` rewrites it at each
pass-end. Durable orientation is `CLAUDE.md`; everything past tense is [`docs/HISTORY.md`](HISTORY.md).

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries eleven
engine passes plus chassis-A/B1/B2, polish-11a/11b-i/11b-ii/C, the admin motion pass,
docs-to-facts, extend-1 (PR #66), and extend-2 (PR #67, the guidance layer), both merged
2026-09-20, unpublished under `## Unreleased`. The window holds for one cut. CI on `main` is
green.

## Immediate next action

The one cut is next (`cairn-release`), with the dependency sweep (the `dependency-upgrade`
skill) and the site upgrade brief's tools section landing in the pre-cut pass. The pending
version is `0.97.0`, verified free against the registry with `npm view @glw907/cairn-cms
versions --json` at the cut. extend-1's two advisory audit rules (`log-event-grammar`,
`log-secret-field`) promote to error tier at `0.98.0`.

Then, in order: **the docs-infra currency pass**
(`~/.dotfiles/docs/superpowers/plans/2026-09-19-docs-infra-currency-pass.md`, APPROVED
2026-09-19), after the cut and before the site round; **the site round**, aksailingclub-org,
ecxc-ski, and 907-life upgraded as model cairn sites, each filing container bullets via
`site-docs/<site>-<pass>`, then one improvement release; then **the docs rebuild** from the facts
container, then beta.

## Parallel tracks

- **Go `cairn` tool, 1.0: Pass B1 is IN FLIGHT (launched 2026-09-20 15:30), one executor in
  `.claude/worktrees/cairn-tool-a`; check it is idle before touching it.** The re-cut is done
  (`7d06e29c`), the three-lens review folded (`2bb2cb3f`), segment 1's pre-flight applied
  (`35b6f97d`), all on the branch, unpushed. B1 is nine tasks: segment 1 (11b-i, 11b-ii, 12, 13)
  ran as `pass-execute` run `wf_9deb92f1-2d5`; segment 2 is 14 to 17; segment 3 is 17b, the
  close and the PR #60 merge. **Checkpoint (2026-09-20 17:30):** 11b-i and 11b-ii ACCEPTED (one
  fix round each). **12 and 13 ESCALATED and ruled**, fixed by direct `cairn-implementer`
  dispatches, 12 first, then 13, each with a `diff-reviewer` read. Rulings on 12: an expired
  matching ack leaves `Acknowledged` false and sets `CheckResult.AckExpires`; a zero GitHub
  `TokenExpiry` is OK with a Detail line, never Unknown, and the provider doc comment is
  corrected; the non-verbose render is a key allowlist over `Fields`, never a regex over
  `Detail`. Ruling on 13: `providers` gains an authoritative per-nameserver address lookup and
  the unreachable diagnosis ports `hostname.mjs`'s apex read, defaulting to records-absent.
  Then segment 2's pre-flight and launch. Runner args: `gate: "make -C tool check"`,
  `gateLane: "light"`, `gateTier: "docs"` pinned on every task (an unpinned task makes the
  runner run `gate-tier.mjs`, which has no `tool/**` rule). Ceilings accepted by Geoff
  2026-09-20: B1 8M, B2 10M. Spend: about 3.1M of 8M after four of nine tasks (1.1M plan work,
  2.03M segment 1), so the 6.4M flag will likely trip inside segment 2. Owner item filed in the plan: an `edge.hsts-off` engine condition id. Branch
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
- A monthly Claude Code guidance-schema routine (`trig_01UyjoYo9hbGqm7qTeb7HGVH`) reads
  Anthropic's docs for the `CLAUDE.md` import syntax, agent and skill frontmatter, and the `Stop`
  hook shape, and emails only on a mismatch. A syntax change moves the bake's written line,
  `cairn-guidance check`'s reported line, the agent frontmatter, and
  `docs/reference/guidance.md` together in one patch, with a `Consumers must:` line telling
  existing sites to re-run the install.
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

**One cut:** Cut the one release (`cairn-release` skill), starting with the dependency sweep.

**Go tool Pass B1** (launch inside `cairn-cms`; work in `.claude/worktrees/cairn-tool-a`): Start Go tool
Pass B1: re-cut Pass B from `docs/superpowers/plans/2026-09-20-cairn-tool-pass-b-recut-brief.md`,
review it, then execute B1 on branch `cairn-tool-a`.
