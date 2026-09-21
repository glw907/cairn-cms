# cairn-cms status

Where the work is now, what is next, and the open decisions; `cairn-pass` rewrites it at each
pass-end. Durable orientation is `CLAUDE.md`; everything past tense is [`docs/HISTORY.md`](HISTORY.md).

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries eleven
engine passes plus chassis-A/B1/B2, polish-11a/11b-i/11b-ii/C, the admin motion pass,
docs-to-facts, extend-1 (PR #66), extend-2 (PR #67, the guidance layer, merged 2026-09-20), and
the pre-cut pass (PR #69, MERGED: the dependency sweep, two `cairn-guidance` hardening fixes,
the site upgrade brief's tools section, the Blueprint admin audit, and the daisyUI breadcrumb
fix), unpublished under `## Unreleased`. The window holds for one cut. Held majors now include
`devalue` 6 (new this sweep, no direct call site to migrate), alongside TypeScript 7 and Vitest
5. Two `npm audit` findings (the `cookie` transitive under `@sveltejs/kit` and a
`@cloudflare/vitest-pool-workers` transitive) are held, needing `--force` or a downgrade to
clear. CI on `main` is green.

## Immediate next action

**The `0.97.0` cut HOLDS on five steps, in order (Geoff, 2026-09-21):** the Go tool's 1.0 (B2); the
doctor retirement's Go half (pass retire-1), merged WITHOUT a tool tag; draft docs pass A
(`docs/superpowers/plans/2026-09-21-draft-docs-pass-a.md`), which moves the tool's contract pages
and schemas under `docs/reference/`; one `tool/v1.1.0`, tagged and released from a commit carrying
both; the retirement's engine half (pass retire-2), which removes the `cairn-doctor` bin only once
that release exists. B2's close writes that 1.0 is released; retire-1's close writes that `cairn
doctor` is merged; pass A's close writes that the pages are merged; ONLY retire-2's close writes
"the `0.97.0` cut is unblocked", since it lands last. A cut session that finds no such line does
not cut, and every mechanical gate in Task 6 must pass whatever any line says. Who conducts the
`tool/v1.1.0` tag is unruled; ask Geoff. The retirement's spec is
`docs/superpowers/specs/2026-09-21-doctor-retirement-design.md`, on branch `doctor-retirement`
until its PR merges. No publish,
no pin bump, and no site round before the `tool/v1.0.0` tag and its release land. Geoff gave the B2
conductor the go for the tag, the release, his timer, and B2's close and merge, on the
conditions in the Go tool entry below. **The engine cut includes the tool's
1.0 (Geoff, 2026-09-21):** B2 merges to `main` before the cut, so `0.97.0`'s window carries
`tool/`, and the release announces the CLI. Read as: the changelog window, the release body, the
docs that name the tool, and the site upgrade brief's tools section all present `cairn` 1.0 and
its install line. The binary still ships by `go install` and the tag's release artifacts, never
inside the npm tarball (the Pass A tarball guard); confirm that reading with Geoff at the cut if
he meant bundling (confirmed 2026-09-21: not bundled). **When B2's merge to `main` completes, whoever conducts Task 25 writes here that the tool's 1.0 is
merged, tagged, and released, naming the tag and the merge SHA, and tells any live session. That
line never says the cut is unblocked; the last-landing pass's close writes that (see above).** After that, the one cut
(`cairn-release`), with the dependency sweep (the `dependency-upgrade`
skill) and the site upgrade brief's tools section landing in the pre-cut pass. The pending
version is `0.97.0`, verified free against the registry with `npm view @glw907/cairn-cms
versions --json` at the cut. extend-1's two advisory audit rules (`log-event-grammar`,
`log-secret-field`) promote to error tier at `0.98.0`.

The cut itself is Task 6 of `docs/superpowers/plans/2026-09-21-pre-cut-pass.md`
(`cairn-release`), with the lockstep bump of `package.json` and
`packages/cairn-cms-dev/package.json`, the SHA-pinned tag, and the `tool` workflow in the green
CI set; its precondition is the Go tool session's own close line on `origin/main` naming the
`tool/v1.0.0` tag and the merge SHA, not the tag alone, and a `CHANGELOG.md` entry for the tool's
1.0.

Then, in order: a small docs chore updates the execution-path homes of two overturned rules (the
repo `CLAUDE.md`'s narrative-arm freeze and its "a site-pass agent never edits the cairn-cms
checkout" rule), touching the `site-pass` and `engine-consult` skills and giving `site-pass` a
new "Tool friction" section; then **the docs-infra currency pass**
(`~/.dotfiles/docs/superpowers/plans/2026-09-19-docs-infra-currency-pass.md`, APPROVED
2026-09-19), after the cut and before the site round; then **the draft docs** (order against the
docs-infra pass is unruled); then **the site round**, aksailingclub-org, ecxc-ski, and 907-life
upgraded as model cairn sites, which tests and edits the draft docs, site-upgrade agents allowed
to change the docs when they find an issue, each filing container bullets via
`site-docs/<site>-<pass>`, then one improvement release; then **the docs rebuild** from the facts
container, then beta.

## Parallel tracks

- **Go `cairn` tool, 1.0: Pass B2 is in its last segment (conductor ledger, 2026-09-21 12:45).**
  Worktree `.claude/worktrees/cairn-tool-b2`, branch `cairn-tool-b2`; check it for a live
  executor first (`pgrep -f cairn-tool-b2`, `git status`, `git log`). The plan
  (`docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md` ON THAT BRANCH, B2 header) holds
  the run records, every ruling, and the task table. Segments 1 to 4 are done and independently
  reviewed. Segment 5 is running as `wf_80aca97c-86b` (22a-ii the editorial fixes and fixture
  truth, 21b the fifth result word `unknown` with `--theme` and the quiet sweep, 21c a visible
  `cairn auth check` and the rebuilt release candidate); the runner script is in session
  `aa9eb162`'s scratchpad, the gate is `make -C <abs worktree>/tool check` on the light lane. A
  cold resume reads the worktree's `git log` for which of the three committed and relaunches
  the rest. **Geoff gave the go (2026-09-21) for Tasks 22b the tag, 23 the release, 24b his
  timer, and 25 the close and merge, and ruled that release candidate verification is the
  conductor's work.** The conductor's conditions before the tag: segment 5 accepted with the
  gate green; the `tool` workflow green on the pushed head; a real-terminal run against his
  four sites graded clean by a fresh-context verifier. Any failure or taste call stops the tag
  and goes to him. Ceiling 20M, spend about 16.3M. Task 25 carries the release handshake for
  `0.97.0` (the `CHANGELOG.md` entry, the site upgrade brief's tools text, the `tool` workflow
  green on the merge SHA, the released line here (never an unblocked line), the tool's facts harvested into
  `docs/internal/facts/admin.md`). Geoff's rulings of the day, the handshake, and the ledgers:
  `~/.cache/cairn-tool-b2/owner-rulings-2026-09-21.md`. What follows the tag:
  `docs/superpowers/specs/2026-09-21-cairn-tool-after-1-0-framing.md`. **The cairn CLI is an
  assumed part of the system, and all docs are single-source on cairn.pub (Geoff,
  2026-09-21):** `tool/docs/` is the interim copy for 1.0; the draft-docs pass moves its four
  public pages under `docs/` and `tool/v1.1.0` repoints the links. A docs conductor session
  plans that pass in parallel. Credentials are stored (`CAIRN_CF_READ_TOKEN`,
  `CAIRN_CF_ACCOUNT_ID`, `CAIRN_GH_READ_TOKEN`; the GitHub token expires 2026-10-19).
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

Three tracks, one session each.

**Doctor retirement:** In a fresh session, conduct the doctor retirement from
`docs/superpowers/specs/2026-09-21-doctor-retirement-design.md` and the `doctor-retirement-pass`
memory. Geoff approved the spec and three plans on 2026-09-21: `2026-09-21-doctor-pretask.md`,
`2026-09-21-doctor-retire-2-engine.md` (retire-2a, the removal), and
`2026-09-21-doctor-retire-2b-records.md` (retire-2b, whose close writes the cut's unblocked line),
all under `docs/superpowers/plans/`. Nothing executes before B2 merges; check STATUS for B2's close
line and `git ls-remote --tags origin 'tool/v1.0.0'`. Then, in order: run the pre-task; draft
retire-1's plan (the Go half, `cairn doctor`) against the merged `tool/`, with three review lenses,
and bring it to Geoff; at the same time write the pass A inventory file under
`docs/internal/record/` (the `cairn doctor` page path, the seventh schema's file name, every test
naming either), since pass A's pre-flight stops without it; execute retire-1 and merge it WITHOUT a
tag. Pass A and the `tool/v1.1.0` tag follow (who conducts the tag is unruled; ask Geoff), then
retire-2a, then retire-2b. Read the hold paragraph under "Immediate next action" for the order.

**One cut:** Cut `0.97.0` (Task 6 of `docs/superpowers/plans/2026-09-21-pre-cut-pass.md`) once the
Go tool's 1.0 is released AND `cairn-doctor` is retired on `main`; verify both first.

**Go tool Pass B2, to the close** (launch inside `cairn-cms`): Continue Go tool Pass B2 per
`docs/STATUS.md`'s Go tool entry and `~/.cache/cairn-tool-b2/owner-rulings-2026-09-21.md`: check
the worktree for a live executor, finish segment 5 if any of its three tasks has not committed,
then the conductor's real-terminal release candidate verification, then Tasks 22b, 23, 24b, and
25 under Geoff's recorded go and the conductor's conditions. The close never writes that the cut
is unblocked.
