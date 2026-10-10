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

### Resume prompt (finish pass A's close; battery stand-down 2026-10-09 ~12:30)

> **Goal.** Finish engine pass pre-2b, pass A's close and merge PR #108.
>
> **State.** Branch `engine-pre-2b-a` at `8e2b7d29` (pushed), worktree `.claude/worktrees/engine-pre-2b-a`,
> clean. All 12 tasks, the simplifier, four reviewers, the live smoke and key probe, and both close fix
> chains are accepted (Ledger in the plan; smoke evidence `~/.cache/engine-pre-2b-a/close-smoke-evidence.md`).
> Friction triage is done on `main`. The final gates were interrupted by the battery stand-down.
>
> **Do, in a fresh session, cheaply (Haiku gates, one Sonnet ledger agent):** (1) the final gates on the
> head: the local full gate (the string in `~/.cache/engine-pre-2b-a/F-local.txt`), `npm run check:close`,
> `CAIRN_GATE_LANE=light make -C tool check`, and CI green on the PR; (2) the consumer proof (fresh
> showcase install and build, restore its lockfile); (3) ledgers: the plan's post-mortem with the first
> clock score (`~/.claude/docs/model-economy.md`, "The pass-end score"; no estimate to compare), the
> HISTORY entry, and this STATUS pointed at the gate economy pass's brainstorm
> (`docs/superpowers/research/2026-10-09-gate-economy-pass-inputs.md`), then pass B; (4) merge PR #108
> (Geoff pre-approved; leave draft, merge, no version bump). Before merge, show Geoff the new admin copy
> for a read: Task 8's notice "That did not go through. Your text is still here; please try again.", the session
> notice "Your session ended. Please sign in again in a new tab, then save. Your text is still here.", and the
> gallery copy "In a gallery or card" / "Alt for these images is set where each one sits in the entry.
> They are left as they are."
