# cairn-cms status

Present tense only; the past lives in [`docs/HISTORY.md`](HISTORY.md), orientation in `CLAUDE.md`.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`; `@glw907/cairn-cms-dev` `0.98.0`
beside it); the Go tool is `tool/v1.1.0`. Unreleased on `main`: the SvelteKit 3 upgrade (Kit 3.0.0,
adapter-cloudflare 8.0.0; `04116a3b`, PR #103; tool major under `tool/CHANGELOG.md` `## Unreleased`,
untagged) and the harvest's page removal. The release holds until draft docs stage 2a lands. Held
majors: `devalue` 6, TypeScript 7, Vitest 5, `@types/node` 26. CI is green on all seven workflows.
cairn.pub pins `0.94.0-rc.1` (un-pinnable since `0.95.0`); its ceiling is `0.98.0` until the narrative
arms are rebuilt ([handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md)), and it is the only
site that migrates to Kit 3, as a site pass after the cut. Live contracts:
`tool/internal/{spine/conditions,doctor/site-config-path}.json` and `.cairn/site-facts.json`.

## Immediate next action

Execute the planned, reviewed unattended run:
[`docs/superpowers/plans/2026-10-07-2a-unattended-finish.md`](superpowers/plans/2026-10-07-2a-unattended-finish.md)
(review, fold, verification, and second fold committed through `159693c0`). It finishes draft docs stage 2a
(R1 matcher fix, R2 merge `main` into `draft-docs-2a`, R3 infra drift, R4 pilot pages on Kit 3, R5 task 8,
R6 task 9, R7 close and merge) with two side lanes (L1 dependency sweep, L2 engineering cleanup). Owner
rulings (Geoff, 2026-10-07): 2a ceiling 25M, stop at 20M; lanes 5M shared, stop at 4M; run cap 30M; targeted
close unattended; merge on a green close; no release. After the run: Geoff reads the five task 8 pages, then
the release (Kit 3 and the rebuilt extend docs), then cairn.pub's migration as a site pass.

**Run in flight (checkpoint 3, 2026-10-07):** R1 to R6 accepted on `draft-docs-2a` (pushed). R5 closed the five task 8
pages (record `docs/superpowers/research/2026-10-07-draft-docs-2a-r5-task8-record.md`, five conductor rulings for
Geoff); R6 applied the consistency read and restored all 71 stage-2a relinks (`c00cd0b4`, `78df0ef0`; record
`...-r6-consistency-record.md`). Lanes: L2b merged (#104), L1 merged (#106; held-majors tripwire routine
`trig_01UCoKqxRXVwAfMdnF913E4v`), L2a in its fix round (#105, ruling: the doctor's loopback set follows the engine's
`requireOrigin`, so no `::1`). 2a spend is about 18.8M against the 20M stop. Next: L2a's merge, then R7 (close).
Open carry: `gateMatches`' doc comment in dotfiles still says a placeholder "matches any non-empty text".

## Open decisions and watches
- Watch: sveltejs/kit#17368 (adapter-cloudflare 8's shared platform proxy, closes #17344). Routine
  `trig_01KPzLTU7rzLMQUp2y6bjZtm` emails on activity, CI failure, merge, or close; delete it once the PR
  closes. cairn does not depend on it.
- The monthly drift routine (`trig_015UPQostYVisXuExTHTH2vu`) samples `docs/reference` and extend pages
  only; widen it to all four tracks at stage 4's merge.
- Watch: `cairn-docs-outline`'s lock (dotfiles) was built past need; simplify it separately.
- Watch: the per-version records' paths are hardcoded in `cairn-pass`, `CLAUDE.md`, and
  `docs/internal/facts/README.md`; a pass that moves a record updates all three.
- The remote-functions routine (`trig_0193pPNoyxsTGeUhF1xx7woa`) opens an issue when they reach stable.
  Node 26 is the beta floor only if Active LTS by then; TypeScript 7 waits on `tsgo.yml`. `radius-scale`
  and the retired-patch arms promote at `0.99.0`.
- `cairn-release` gap: the `0.98.0` prep ran no `check:dev-package`. `CAIRN_GATE_READ_TOKEN` expires
  2026-10-19. `npm pkg fix` is owed for the four `./` `bin` entries.

## Resume prompt
> **Goal.** Run the 2a unattended finish to its merged close, with both side lanes merged.
> **Scope.** In: everything in `docs/superpowers/plans/2026-10-07-2a-unattended-finish.md`. Out: the release,
> cairn.pub's migration, stage 2b.
> **Settled:** every ruling in the plan's Owner rulings section; no open forks.
> **Approach.** Fresh session, `TMPDIR=$HOME/.cache/claude-tmp claude --model claude-opus-5-5` at medium
> effort, from `~/Projects/cairn-cms`. Invoke `cairn-pass`, read the plan and its governing 2a plan, arm the
> guards the plan names, and start at R1.
