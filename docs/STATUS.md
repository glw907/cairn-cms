# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`, release `v0.98.0`;
`@glw907/cairn-cms-dev` `0.98.0` beside it); the Go tool is `tool/v1.1.0`. `0.98.0` carries theme
identity passes A, B, and C, draft docs pass 0+1, the `viewport-overflow` fix (#100), the audit
promotions, and the dependency sweeps. Unreleased: the harvest's page removal. Held majors:
`devalue` 6, TypeScript 7, Vitest 5, `@types/node` 26. CI is green. cairn.pub pins `0.94.0-rc.1`
(un-pinnable since `0.95.0`); its ceiling is `0.98.0` until the narrative arms are rebuilt
([handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md)). Live contracts:
`tool/internal/{spine/conditions,doctor/site-config-path}.json` and `.cairn/site-facts.json`.

## Immediate next action

- **Draft docs stage 2a: the pilot is done; tasks 7a and 7b are next (2026-09-30).** Branch and worktree
  `draft-docs-2a` (`.claude/worktrees/draft-docs-2a`, local only, not pushed). Plan:
  `docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md` (its ledger is the task record). Tasks 1 to 6 are done;
  the six pilot pages are committed (`297c0282`, `a0213cc3`, `0d8b55be`), stage record
  `docs/superpowers/research/2026-09-30-draft-docs-2a-pilot-record.md`. Geoff's read found the pages lack page-level
  structure (openings, order, hand-offs, endings); a job read of all six confirmed it
  (`docs/superpowers/research/2026-09-30-draft-docs-2a-pilot-job-read.md`, which also holds his two introductions).
  Geoff's rulings: fix the chain (task 7a, grounded in prior art first), rework the pilot (task 7b), republish the same
  three pages for his second read (https://claude.ai/artifact/5xEGWkUwrhmY9pjhLTSoKs), then task 8. Budget for the
  remaining pages 45 to 60M, quality first; `bothReviewers` stays on. Weekly limit about 93%, reset 2026-10-02 23:59;
  task 8 may wait for it.
- The planning phase ran a code-first gap sweep (131 facts filed, 4 wrong facts corrected; record
  `docs/superpowers/research/2026-09-30-extend-gap-sweep.md`) and filed its 12 code defects in the
  friction log (`bd8ab1fe`, on `main`, not pushed).
- Theme identity is done; cairn-pub's pin bump takes its migration and link checks first.

## Open decisions and watches

- The monthly drift routine (`trig_015UPQostYVisXuExTHTH2vu`) samples only `docs/reference` and
  existing extend pages until the admin and editors arms are rebuilt (re-scoped 2026-09-30, Geoff's
  go); widen it back to all four tracks at stage 4's merge.
- Watch: `cairn-docs-outline`'s lock (dotfiles) was built past need; simplify it in a separate
  dotfiles change with a `diff-reviewer` read (the spec records it as an instance of S2).
- Watch: the kept per-version records' paths are hardcoded in `cairn-pass`, `CLAUDE.md`, and
  `docs/internal/facts/README.md`; a pass that moves either record updates all three.
- `checkOrigin` to `csrf.trustedOrigins` is a small `auth-data` pass, run when Geoff can make the
  magic-link click. Node 26 is the beta floor only if Active LTS by then; TypeScript 7 waits on
  `tsgo.yml`. `radius-scale` and the retired-patch arms promote at `0.99.0`.
- `cairn-release` gap: the `0.98.0` prep ran no `check:dev-package`; the skill's pre-commit gate
  names it next. Monthly routines email only on a mismatch. `CAIRN_GH_READ_TOKEN` expires
  2026-10-19 (`cairn-tripwire` warns daily). `npm pkg fix` is owed for the four `./` `bin` entries.

## Resume prompt

### Next action (draft docs stage 2a, tasks 7a and 7b)

> **Goal.** Make the page chain own the page as a whole, then rework the six pilot pages at the page level.
>
> **Scope.** The plan's tasks 7a and 7b on `draft-docs-2a`, then Geoff's second read. Task 8 waits for it.
>
> **Settled (do not re-brainstorm):** the spec (S1 to S9), the plan and its ledger, the forward-link rule
> (`c498b6fa`), the 45 to 60M budget, `bothReviewers: true`, Geoff's threat position and his two introductions (in the
> job-read record), and that 7a adopts published systems and existing mechanisms only (no new tags, fields, or checklists), starting with a prior-art sweep whose sources set the review seat and the anatomy
> wording.
>
> **Entry.** Read the job-read record, then Artifact `read` the review page in case Geoff saved edits there.
>
> **Approach.** Invoke `cairn-pass` to resume; the plan's Execution mode governs. Launch directory
> `~/Projects/cairn-cms`; `claude --model claude-opus-5-5` at medium effort.
