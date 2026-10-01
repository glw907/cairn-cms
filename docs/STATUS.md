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

- **Draft docs stage 2a: task 7b's resolution pass is next, after the 2026-10-02 23:59 reset (Geoff, 2026-10-01).**
  Branch and worktree `draft-docs-2a` (`.claude/worktrees/draft-docs-2a`, local only, not pushed). Plan:
  `docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md` (ledger rows 7a and 7b, and the "Resolution pass" paragraph
  under task 7b). Task 7a is done: introduction and ending anatomies in the register, Geoff's threat position as the
  owner-tier fact `f:v85shm`, a structural edit seat, a final reader read with one re-test, and a `rework` entry point
  (dotfiles through `5fb8ce2`). Task 7b's rework run left all six pilot pages escalated at round 2 with 26 narrow
  blocking findings; the pages sit in WIP commit `a6885750`, and the findings are in
  `docs/superpowers/research/2026-10-01-draft-docs-2a-rework-record.md`. The final reader read has run on no page yet.
  Geoff's rulings of 2026-10-01: every page needs a real introduction, and structure comes before line editing. After
  the resolution pass, republish the same three pages for his structural read
  (https://claude.ai/artifact/5xEGWkUwrhmY9pjhLTSoKs), then task 8. Budget for the remaining pages 45 to 60M, quality
  first; 7a and 7b ran past their 4 to 5M.
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

### Next action (draft docs stage 2a, task 7b resolution pass)

> **Goal.** Bring the six reworked pilot pages to acceptance, final reader read included, and republish three for
> Geoff's structural read.
>
> **Scope.** The plan's "Resolution pass" under task 7b on `draft-docs-2a`, then the republish. Task 8 waits for
> Geoff's read. Run it only after the 2026-10-02 23:59 weekly reset.
>
> **Settled (do not re-brainstorm):** the spec (S1 to S9), the plan and its ledger, task 7a's mechanisms and rulings
> (ledger row 7a), the conductor rulings in the "Resolution pass" paragraph, `bothReviewers: true`, and the stale-script
> guard in `pass-gate-economy.md` (verify a run's persisted script against the committed runner before relying on it).
>
> **Entry.** Read the rework record, then the plan's "Resolution pass" paragraph.
>
> **Approach.** Invoke `cairn-pass` to resume. Launch directory `~/Projects/cairn-cms`;
> `claude --model claude-opus-5-5` at medium effort.
