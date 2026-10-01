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

- **Draft docs stage 2a is at the pilot checkpoint (task 7, 2026-09-30).** Branch and worktree
  `draft-docs-2a` (`.claude/worktrees/draft-docs-2a`, local only, not pushed). Plan:
  `docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md` (ledger is the task record); spec:
  `docs/superpowers/specs/2026-09-30-docs-code-sync-design.md`. Tasks 1 to 6 are done: the six
  pilot pages are committed (`297c0282`, carry fixes `a0213cc3`), stage record
  `docs/superpowers/research/2026-09-30-draft-docs-2a-pilot-record.md`. Every pilot page escalated
  after round 2 (forward links to undrafted pages, fixed by `c498b6fa`) and was resolved by one
  resolution pass with accepted scoped reviews. Measured cost about 1.3M a page (about 8.0M for the
  pilot). Geoff accepted 45 to 60M for the remaining pages, quality first; `bothReviewers` stays on.
  **Waiting on Geoff:** his read of the three owner pages at
  https://claude.ai/artifact/5xEGWkUwrhmY9pjhLTSoKs, then task 7's fold (read back his saved
  version, apply it with the briefs, scoped reviews), and his answer on pre-authorizing task 10's
  merge. Weekly limit 93% at the pilot's end; the reset is 2026-10-02 23:59.
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

### Next action (draft docs stage 2a, task 7 fold, then tasks 8 to 10)

> **Goal.** Fold Geoff's pilot read, then run the rest of 2a and close.
>
> **Scope.** The plan's task 7 fold and tasks 8 to 10 on `draft-docs-2a`. Stage 2b is out.
>
> **Settled (do not re-brainstorm):** the spec (S1 to S9), the plan and its ledger, the forward-link
> rule (`c498b6fa`), the 45 to 60M budget for the remaining pages, `bothReviewers: true` for task 8.
>
> **Entry condition.** Geoff has read the three pages at
> https://claude.ai/artifact/5xEGWkUwrhmY9pjhLTSoKs. Read back his saved version (Artifact `read`),
> diff it against the committed pages, and run task 7's fold per the plan.
>
> **Approach.** Invoke `cairn-pass` to resume; the plan's Execution mode governs. Launch directory
> `~/Projects/cairn-cms`; `claude --model claude-opus-5-5` at medium effort.
