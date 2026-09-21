# cairn-cms status

Where the work is now, what is next, and the open decisions; `cairn-pass` rewrites it at each
pass-end. Durable orientation is `CLAUDE.md`; everything past tense is [`docs/HISTORY.md`](HISTORY.md).

## HALTED: pre-cut pass, 2026-09-21

Tasks 1 to 4 of `docs/superpowers/plans/2026-09-21-pre-cut-pass.md` are accepted through the
review chain; Task 5's fold pushed as PR #69; Task 6 (the `0.97.0` cut) has NOT started. Nothing
is published; `package.json` and `packages/cairn-cms-dev/package.json` still read `0.96.0`. PR
#69's CI is green on test, create-site, scaffold, design, and norms, but e2e failed on 33
`admin-visual` snapshots. A CI regen (`b4bd3a5f`) rewrote those 33 baselines, and a fresh-context
`visual-verifier` read then FAILED that regen: the daisyUI 5.7.20 to 5.7.42 bump in Task 1's
dependency sweep causes four regressions against `docs/internal/admin-design-system.md`:

- STRUCTURAL: the edit-page and delete-dialog top-strip breadcrumb shifts about 40 px left, loses
  its inset, truncates "Posts" to "Pos…" with free space beside it, and clips the entry id, across
  ten snapshot files.
- The `⌘K` hint box narrows from 31 px to 27 px and its glyph shrinks to a smudge.
- The active nav item gains a bottom shadow because daisyUI 5.7.38 styles `[aria-current]` menu
  items natively, against the design system's flat nav (`docs/internal/admin-design-system.md:364`).
- The media view-toggle's active button gains a ring or shadow. (Text anti-aliasing also moved,
  cosmetic only.)

So `b4bd3a5f`'s baselines encode wrong states and must be regenerated on CI again after a fix,
then re-read by a fresh `visual-verifier`, before PR #69 can merge. A do-not-merge comment is on
the PR. Crops: `~/.cache/cairn-pre-cut/crops/` (`edit-strip-a/b.png`, `cmdk-light-a/b.png`,
`nav-light-a/b.png`).

**Open decision for the owner** (recommended: a): (a) authorize one bounded fix round (scoped
overrides in `cairn-admin.css`'s `@layer components` or the affected components, restoring the
breadcrumb inset and truncation, the `⌘K` hint, the flat active nav item, and the view toggle;
test-first where a component test can pin it; then a CI regen, a fresh visual read, merge, and the
cut); (b) pin `daisyui` back to `5.7.20` for this cut and file the upgrade as its own pass; (c)
something else.

**Lessons.** The investigator classified all 33 diffs as explained by the renderer from diff
bounding boxes and called the breadcrumb shift "the top strip only"; only the fresh-context visual
gate and a direct read of the crops caught it. The earlier local full e2e that "passed" all admin
snapshots ran against a stale preview server. `e2e.yml` uploads no Playwright report artifact, so
CI diffs cannot be viewed without a local reproduction.

**Resume prompt:** Resume the pre-cut pass at its halt: read `docs/STATUS.md`'s HALTED section and
`docs/superpowers/plans/2026-09-21-pre-cut-pass.md`, take Geoff's ruling on the daisyUI
regressions, then fix or pin, regenerate the admin baselines on CI, gate on a fresh
visual-verifier read, merge PR #69, and run Task 6.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries eleven
engine passes plus chassis-A/B1/B2, polish-11a/11b-i/11b-ii/C, the admin motion pass,
docs-to-facts, extend-1 (PR #66), extend-2 (PR #67, the guidance layer), and the pre-cut pass
(PR #69, the dependency sweep, two `cairn-guidance` hardening fixes, the site upgrade
brief's tools section, and the Blueprint admin audit), unpublished under `## Unreleased`. The
window holds for one cut. Held majors: TypeScript 7, Vitest 5, `@types/node` 26, and now
`devalue` 6 (new this sweep, no direct call site to migrate). Two `npm audit` findings (the
`cookie` transitive under `@sveltejs/kit` and a `@cloudflare/vitest-pool-workers` transitive)
are held, needing `--force` or a downgrade to clear. CI on `main` is green.

## Immediate next action

The pre-cut pass is HALTED before merge; see the HALTED section above. PR #69 must clear a
daisyUI-regression fix round, a CI baseline regen, and a fresh visual-verifier read before it can
merge. Only after that does the one cut run (`cairn-release`, Task 6 of
`docs/superpowers/plans/2026-09-21-pre-cut-pass.md`). The pending version is `0.97.0`, verified
free against the registry with `npm view @glw907/cairn-cms versions --json` at the cut. extend-1's
two advisory audit rules (`log-event-grammar`, `log-secret-field`) promote to error tier at
`0.98.0`.

Then, in order: **the docs-infra currency pass**
(`~/.dotfiles/docs/superpowers/plans/2026-09-19-docs-infra-currency-pass.md`, APPROVED
2026-09-19), after the cut and before the site round; **the site round**, aksailingclub-org,
ecxc-ski, and 907-life upgraded as model cairn sites, each filing container bullets via
`site-docs/<site>-<pass>`, then one improvement release; then **the docs rebuild** from the facts
container, then beta.

## Parallel tracks

- **Go `cairn` tool, 1.0: Pass A and B1 are MERGED (PR #60, `efc75093`, 2026-09-20); `main`
  carries `tool/`. Pass B2 is next and runs OVERNIGHT 2026-09-20 to 21 in a fresh session.**
  **Ledger (conductor, 2026-09-20 23:45):** steps (1) and (2) are DONE on the branch: amendment
  `84b919ee`, three-lens fold `f7b8e051`, PR #68 MERGED and the gate tier unpinned `4577d558`,
  segment 1 pre-flight rulings `ee40a93c`. The overnight list is thirteen tasks in four
  segments: 19c-i, 18, 19a-i | 19a-ii, 19b, 19c-ii | 20a, 20b-i, 20b-ii | 20c, 21, 22a, 24a.
  Tasks 22b, 23, 24b, 25 are OWNER-GATED. Segment 1 is DONE (19c-i `5a04ae69`, 18 `b536d4bf`,
  19a-i `de94c682`; Task 18's three plan deviations ratified in `d54c3b04` with segment 2's
  rulings). Segment 2 is IN FLIGHT as workflow run `wf_b1a29993-73f` (01:40, 2026-09-21). Each
  later segment gets both pre-flights and a rulings commit before launch. Spend at segment 2
  launch: about 4.4M of 14M; the 80 percent flag is 11.2M and the named pass-split cut is after
  20b-ii. Owner questions collect in the plan's "Outside the amendment, for the owner" list
  (seven items). A resuming session
  checks `git log main..cairn-tool-b2` for landed task commits before relaunching anything.
  Worktree `.claude/worktrees/cairn-tool-b2`, branch `cairn-tool-b2` off `main`. Check it for a
  live executor first (`pgrep -f cairn-tool-b2`, `git status`, `git log`). Order of work:
  (1) the B2 plan amendment, pre-approved by Geoff within the bounds in
  `~/.cache/cairn-tool-b2/b2-amendment-prompt.md` (the verbatim dispatch prompt). If
  `git log main..cairn-tool-b2` already shows a `docs(plans)` amendment commit, an earlier
  session's agent finished it: skip to (2). Otherwise dispatch one `general-purpose` agent,
  `model: opus`, with that file's text as the prompt. (2) The three-lens plan review in
  parallel (`model: opus`), one fold. (3) Per segment: a factual pre-flight AND a
  decision pre-flight (one `opus` read listing every decision the segment's tasks leave open;
  the conductor rules before dispatch, which is what B1's escalations cost 0.5M each to learn).
  (4) Execute through `pass-execute.js` (copy to the scratchpad), `gate: "make -C tool check"`,
  `gateLane: "light"`, per-task `model: "opus"` on the cobra tree, the render bodies, the JSON
  contract, and the exit codes; Sonnet elsewhere. Arm `claude-wf-guard` (its idle alarm after
  a clean finish is a false positive), hour-long `/loop` heartbeats, no note per notification.
  **Hard stops: never push the `tool/v1.0.0` tag, never cut release artifacts, never merge
  B2's PR. Those are OWNER-GATED: Geoff runs the release candidate in his own terminal first.**
  Stop at the 80 percent flag of the 14M ceiling (11.2M) with one combined question. Machine:
  on AC, inhibitors `cairn-tool-b2` held to 09:00, battery watchdog armed by the closing
  session (re-arm in the new one; stand down at 10 percent). Captures never open one kitty
  window per frame (memory `terminal-captures-no-popover`). Geoff's rulings for B2 (2026-09-20):
  best-quality CLI UI is a top priority, with agent usability and production-grade language
  part of it; mockup picks are no rail, glyph-only rows in the colour tier, the labelled strip
  with the table as narrow fallback, two fail severities; multi-site `health` enters 1.0; the
  fix's `actor` lives in the Go tool's own messages table, never `conditions.ts`; `cairn help
  agents` yes, a shipped skill later, MCP never, `fang` declined; the check id stays `engine`,
  the command stays `adopt`, the plain body's key is `fix:`. Inputs, all under
  `~/.cache/cairn-tool-b2/`: `reviews/` (seven), `mockups-3/` (the chosen design),
  `iteration-2-brief.md`, `arch/` (eight reads); the amendment lands them under
  `tool/docs/design/`. PR #68 (`gate-tier` tool tier) is approved by Geoff to merge once its
  re-run is green (`gh pr checks 68`, then `gh pr merge 68 --merge`); after it merges, B2 tasks
  run unpinned and ROADMAP's gate-tier entry is removed. Credentials are stored
  (`CAIRN_CF_READ_TOKEN`, `CAIRN_CF_ACCOUNT_ID`, `CAIRN_GH_READ_TOKEN`; the GitHub token
  expires 2026-10-19). Pass B1's record: [`docs/HISTORY.md`](HISTORY.md).
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

**One cut:** the pre-cut pass is HALTED before merge (see the HALTED section above). Resolve the
daisyUI-regression fix round, regenerate CI baselines, get a fresh visual-verifier read, and merge
PR #69, then run Task 6 of `docs/superpowers/plans/2026-09-21-pre-cut-pass.md` (the `cairn-release`
skill) to cut `0.97.0`.

**Go tool Pass B2** (launch inside `cairn-cms`): Conduct Go tool Pass B2 overnight per
`docs/STATUS.md`'s Go tool entry: amendment, three-lens review, fold, pre-flights, execute,
stop before the tag.
