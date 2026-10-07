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

Draft docs stage 2a, planned in a fresh brainstorm session, then run unattended for 10+ hours (Geoff,
2026-10-07; `pass-core`: a pass meant to run unattended plans out every stop). After 2a: the release
(Kit 3 and the rebuilt extend docs together), then cairn.pub's migration as a site pass.

- Worktree `draft-docs-2a` (local, HEAD `9ca04531`): merge `main` in, never rebase, per
  `docs/superpowers/research/2026-10-06-draft-docs-2a-kit3-merge-map.md`; re-run the conflict listing first.
- The six pilot pages carry Kit 3 drift (the add-cairn tutorial's SvelteKit 2 pin, `f:skeche`, `f:ghzx9c`,
  `facts/extend.md:144`'s `^2.70`). Then task 8's five pages, task 9, and the close.
- Geoff signed off the 2a intros (2026-10-05). The docs chain has the framing stage; `cmp` the persisted
  script against the committed file on first run.
- Prerequisite: fix `pass-execute`'s gate-string check (a superset command, or `E2E_PORT` set outside the
  string, must count as a match; it raised three false escalations last pass).
- Side lanes to weigh: the dependency sweep (wrangler 4.147, vite 8.3, other minors); an engineering lane
  (the Go doctor cleanup, the filed e2e timing flakes). Settle a hard token ceiling: 2a's run 2 measured
  about 2.4M a page before the narrowed round 2.

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
> **Goal.** Plan draft docs stage 2a as a 10+ hour unattended run on the SvelteKit 3 `main`, ending with
> the pages drafted, gated, and read, ready for the release.
> **Scope.** In: merging `main` into `draft-docs-2a`, the pilot pages' Kit 3 drift, task 8, task 9, the
> close, the `pass-execute` fix, and the side lanes to weigh. Out: the release, cairn.pub's migration, 2b.
> **Settled:** the 2a intros; the framing stage and narrowed round 2; merge, not rebase.
> **Still open:** the hard token ceiling; which side lanes ride along; the unattended stops and guards.
> **Approach.** Fresh session, `claude --model claude-opus-5-5` at high effort, from `~/Projects/cairn-cms`.
> Read `docs/superpowers/research/2026-10-03-draft-docs-2a-targeted-close-record.md`, the merge map, and the
> 2a plan; re-run the conflict listing first. Pre-flight the plan so no stop remains, commit it, and point
> this STATUS at it.
