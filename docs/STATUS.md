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
  close and the PR #60 merge. **Checkpoint (2026-09-20 20:00):** segment 1 done (11b-i, 11b-ii, 12 ACCEPTED;
  13 fixed twice, one test-only finding owed). **Segment 2 ran (`wf_afcd830b-427`, 1.54M): 14,
  15, 16, 17 all gate-green and all ESCALATED; the conductor ruled and fixes run as direct
  `cairn-implementer` dispatches, in this order, one at a time, each followed by a
  `diff-reviewer` read by SHA.** (A, in flight, `model: opus`) the cross-cutting contract fix:
  the condition moves from the check to the verdict, `https-forced` and `hsts` merge back into
  one check, no `time.Now` inside a check (the sweep's clock is threaded), and `Fields` keys
  are named (`releasesBehind`, not `count`). (B) Task 14: DMARC and SPF matching is
  case-insensitive; a DNS transport error is Unknown, never Failing; a `_dmarc` record with no
  `p=` gets its own Detail; Email needs no credential for its DNS half (the spec's "none, then
  Cloudflare read") and a missing Cloudflare credential after a clean DNS half is Unknown
  `cred-missing`; plus Task 13's owed test fix (a nameserver-keyed fake, the discovery-errors
  path, a 100 ms budget). (C) Task 15: `buildId` is an eleventh, verbose-only key; a failed
  build is Failing before the GitHub read; a providers test for `Build`'s JSON shape. Task 16:
  a `Consumers must:` line whose text is "nothing" does not count. (D) Task 17: a classified
  `APIError` keeps its reason and only the unclassified or not-found case is
  observability-off; entries are filtered by level in Go; two comment-only fixes. Ratified as
  landed: DKIM passes on any one selector, SPF is read at the apex, a not-yet-enabled sending
  subdomain parks, a Failing outcome carries no ReasonCode, the engine repo is hardcoded,
  releases-behind counts from the declared range. **Owed to the plan at the boundary:** Task
  17's stderr notice and the shared `--since` parser test move to Task 19a (add the criterion,
  naming `logs.ParseSince`); Task 15's Produces becomes eleven keys; the two B2 decisions; the
  `gate-tier` instruction once PR #68 merges. **For the close:** Go's resolver reads
  `/etc/hosts` before the authoritative dial; `tool/docs/*.md` cites task numbers;
  releases-behind could read the lockfile. **UI priority (Geoff, 2026-09-20): best-quality CLI
  UI is a top priority.** The Charm v2 survey is at `~/.cache/cairn-tool-b2/charm-v2-capabilities.md`
  (lands under `tool/docs/` at the boundary); three render directions are being mocked up in
  `~/.cache/cairn-tool-b2/mockups/`; his pick becomes a Task 20 amendment needing his
  approval (it adds `lipgloss/v2`, `colorprofile`, `x/ansi`, a palette, five width rungs).
  Runner args: `gate: "make -C tool check"`,
  `gateLane: "light"`, `gateTier: "docs"` pinned on every task (an unpinned task makes the
  runner run `gate-tier.mjs`, which has no `tool/**` rule). Ceilings (Geoff, 2026-09-20): **B1 raised to 10M** (the flag is
  now 8M), B2 10M. **B2 decisions taken (Geoff, 2026-09-20), owed to the plan at the segment
  boundary:** Task 20's glyph tier is Unicode by default and ASCII when output is not a TTY,
  `TERM=dumb` is set, or the Windows console refuses virtual-terminal mode; Task 22 generates a
  man page with cobra's doc generator and ships it in the release archives. **Chore in flight:**
  a `tool/**` rule for `gate-tier.mjs` on `chore/gate-tier-tool-rule`
  (`.claude/worktrees/gate-tier-tool`, off `origin/main`), so B2 drops the `gateTier` pin. Spend: about 5.5M of 10M after eight of nine tasks built (1.1M plan work, 2.03M segment 1,
  0.8M its fixes, 1.54M segment 2); side work (survey, mockups, PR #68) is about 0.7M outside
  B1. Owner item filed in the plan: an `edge.hsts-off` engine condition id. Branch
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
