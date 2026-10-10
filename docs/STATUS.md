# cairn-cms status

Present tense only; the past lives in [`docs/HISTORY.md`](HISTORY.md), orientation in `CLAUDE.md`.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`, with `@glw907/cairn-cms-dev`
`0.98.0`); the Go tool is `tool/v1.1.0`. Unreleased on `main`: SvelteKit 3 (with an untagged tool
major), the harvest's page removal, draft docs stage 2a, the October dependency sweep, the doctor
cleanup, and engine pass A (PR #108). CI is green. cairn.pub pins `0.94.0-rc.1`, its ceiling `0.98.0`
until the one release below ([handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md)).

**The sequence (Geoff, 2026-10-07).** Docs stages 2b to 5, then one release, then each site
migrates (cairn.pub included, none before). Engine passes land on `main` and never release; each
sits in its slot on `ROADMAP.md`'s boundary-test path.

## Immediate next action

Pass A is merged and unreleased
([plan and post-mortem](superpowers/plans/2026-10-08-engine-pass-pre-2b-a.md)). The release holds
until the docs are complete.
The gate economy pass is next, brainstormed in a fresh session. Pass A spent about 17 hours of
executing clock, mostly on repeated broad gates. Inputs:
[`superpowers/research/2026-10-09-gate-economy-pass-inputs.md`](superpowers/research/2026-10-09-gate-economy-pass-inputs.md),
with a draft build on branch `gate-related` (not merged). Engine pass B waits on it: plan
[`superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md`](superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md),
ceiling 14.0M, its gate section to take the new rules.

Pass B carries the relink re-arm list (the 2a pages and fact ids pass A falsified, in the plan's
Ledger and the Task 12 carry files) and a `Consumers must:` line for `replyTo` inheritance.

## Open decisions and watches
- Routines: sveltejs/kit#17368 (`trig_01KPzLTU7rzLMQUp2y6bjZtm`, delete once the PR closes); held
  majors (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`); the monthly drift sample (`trig_015UPQostYVisXuExTHTH2vu`),
  which widens at stage 4's merge.
- Dotfiles: simplify `cairn-docs-outline`'s lock; fix `gateMatches`' stale doc comment. Moving a
  per-version record updates `cairn-pass`, `CLAUDE.md`, and the facts README.
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; `radius-scale` and the retired
  patch arms promote at the next version commit; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries). `CAIRN_GATE_READ_TOKEN` expires 2026-10-19.

### Next action (gate economy pass, brainstorm)

> **Goal.** Brainstorm and plan the gate economy pass: targeted, evidence-based gating.
>
> **Scope.** In: one package build per gate (`check:close` builds about 17 times); `vitest related`
> for the component project only; CI hardening (timeouts, visible retries, one all-workflows-green
> check); machine-readable `cairn-run-gate` run records; the measured suite audit; the rules carried
> into `pass-core`, `pass-gate-economy.md`, both runners, and pass B's plan. Out: deleting a test
> before Geoff reads the audit, and pass B's tasks.
>
> **Settled (do not re-brainstorm):** Geoff (2026-10-09): "avoid the brute-force approach, unless it's
> best-practice"; a small pass before pass B. `related` never replaces the full node projects, and
> `auth-data` keeps them per task. Measure before and after, and replay pass A's task ranges.
>
> **Still open, brainstorm these:** whether the close drops the local full gate for CI green on the
> final commit (recommended, local gate as the CI-down fallback); the pass ceiling; what to keep from
> `gate-related` (the empty-selection wrapper, the narrower helper trigger, per-check timing).
>
> **Approach.** Read the inputs file, then `gate-related`'s report. Brainstorm at effort `high`, then
> plan with a clock estimate. Invoke `cairn-pass`. Launch directory: `/var/home/glw907/Projects/cairn-cms`.
> Model: `claude --model claude-opus-5-5`.
