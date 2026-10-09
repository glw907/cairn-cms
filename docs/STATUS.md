# cairn-cms status

Present tense only; the past lives in [`docs/HISTORY.md`](HISTORY.md), orientation in `CLAUDE.md`.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`, with `@glw907/cairn-cms-dev`
`0.98.0`); the Go tool is `tool/v1.1.0`. Unreleased on `main`: SvelteKit 3 (with an untagged tool
major), the harvest's page removal, draft docs stage 2a (11 extend pages and the interim index), the
October dependency sweep, and the doctor cleanup. CI is green. cairn.pub pins `0.94.0-rc.1`, its
ceiling `0.98.0` until the one release below
([handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md), with the extend redirect rows).

**The sequence (Geoff, 2026-10-07).** Docs stages 2b to 5, then one release, then each site
migrates (cairn.pub included, none before). Engine passes land on `main` and never release; each
sits in its slot on the path in `ROADMAP.md`'s boundary-test entry, which every stage close re-tests.

## Immediate next action

Stage 2a is closed and merged (PR #107; post-mortem in
[`superpowers/plans/2026-10-07-2a-close-finish.md`](superpowers/plans/2026-10-07-2a-close-finish.md)). The
release holds until the docs are complete, per `ROADMAP.md`'s boundary-test entry.

The engine pass before stage 2b is next, warranted by the boundary test; its scope is the spec
[`superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md`](superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md), rulings at
[`superpowers/specs/2026-10-07-engine-pass-pre-2b-rulings.md`](superpowers/specs/2026-10-07-engine-pass-pre-2b-rulings.md).
The spec and both plans are reviewed, folded, and verified: pass A
[`superpowers/plans/2026-10-08-engine-pass-pre-2b-a.md`](superpowers/plans/2026-10-08-engine-pass-pre-2b-a.md)
(11.1M), then pass B (`...-pre-2b-b.md`). The three forks are ruled (forks 1 and 2 take the
recommendations, and pass B's ceiling is 14.0M), and Geoff approved the spec on 2026-10-08. Pass A
runs unattended on worktree `.claude/worktrees/engine-pre-2b-a` (branch `engine-pre-2b-a`, draft PR
#108): S1 to S3 are closed (Tasks 1 to 5 and 7 to 10 accepted, each boundary green), and S4 runs next
(Tasks 11 and 6, then Task 12 alone).
The plan's Ledger on that branch carries the state and the Task 12 carry. Pass B waits on pass A's
merge; its gate rule is amended to match (`ee62f982`). Geoff gave the go to merge PR #108 at pass A's
close (2026-10-08), once its close gates and CI are green. The charter phrase is ruled (Geoff,
2026-10-08): Task 12 writes `what-cairn-is-and-is-not.md:107` as "An anonymous visitor reaches nothing
behind `/admin` except the two pages of the sign-in flow: the form and the confirm page."

## Open decisions and watches
- Routines: sveltejs/kit#17368 (`trig_01KPzLTU7rzLMQUp2y6bjZtm`, delete once the PR closes); held
  majors (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`); the monthly drift sample (`trig_015UPQostYVisXuExTHTH2vu`), which
  widens to all four tracks at stage 4's merge.
- Dotfiles: simplify `cairn-docs-outline`'s lock; fix `gateMatches`' stale doc comment. A move of a
  per-version record updates `cairn-pass`, `CLAUDE.md`, and `docs/internal/facts/README.md`.
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; `radius-scale` and the retired
  patch arms promote at the next version commit; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries). `CAIRN_GATE_READ_TOKEN` expires 2026-10-19.

### Resume prompt (engine pass before stage 2b, pass A from S1's Task 3)

> **Goal.** Finish pass A of the engine pass before stage 2b (access, auth, and the commit path),
> then run pass B.
>
> **Scope.** In: pass A's Tasks 3 through 12 and its close, on `engine-pre-2b-a`; then pass B. Out:
> stage 2b's pages, any release or tag, any site migration.
>
> **Settled (do not re-brainstorm):** the spec and its rulings file (spec approved 2026-10-08); the
> fork rulings (fork 1 in-memory dev saves with a notice, fork 2 anonymous `/healthz?live=1` yes,
> fork 3 pass B ceiling 14.0M); Geoff's 2026-10-08 infra rulings: the per-task gate is the change's
> blast radius with the full gate at boundaries and before merge, clock time is an efficiency target,
> gate receipts and validated reduced rounds in the runners, CI shadowing by pushing after each
> accepted task; and the friction-log restructure folded into pass A's close step 8.
>
> **Approach.** Fresh `claude --model claude-opus-5-5` session at medium effort from
> `~/Projects/cairn-cms`. Invoke `cairn-pass`, then read pass A's plan on the `engine-pre-2b-a` branch,
> including its amended "Per-task gate" section and the "S1 checkpoint" Ledger entry. First, file
> the owed S1 items from `docs/superpowers/research/2026-10-08-pass-a-s1-reports.json` (verify, then
> file on `main`). Then relaunch Task 3 alone on `pass-execute` with its own `gate` (E plus the
> sign-in specs, with `export E2E_PORT=4392`) and a pinned `gateTier`, then the S1 boundary, then S2.
> Arm the guards and the `/loop` fallback at each launch. The worktree already holds CI's preparation
> steps; the local full gate excludes the 20 known site-visual drift tests. Keep
> `tool/internal/{spine/conditions,doctor/site-config-path}.json` and `.cairn/site-facts.json`.
