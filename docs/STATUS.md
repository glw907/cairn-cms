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

- **Draft docs stage 2a: the six pilot pages are accepted from plans; task 8 waits for Geoff's read (2026-10-03).**
  Branch and worktree `draft-docs-2a` (local only, not pushed), HEAD `04a73a86`. Plan:
  `docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md` (ledger rows 7c and "7b resolution"). Two chain runs
  from plans ended 0 of 6 at the round cap; Geoff chose a targeted close, and every page then passed its scoped reads
  and the final reader read (record `docs/superpowers/research/2026-10-03-draft-docs-2a-targeted-close-record.md`,
  commit `7675dd82`). The owner pages are republished with their plans:
  https://claude.ai/artifact/5xEGWkUwrhmY9pjhLTSoKs (version 2). Next: Geoff's read, then task 8.
- Before task 8 (conductor's method call, from run 2's "Convergence" section): round-2 reads check the round-1 fixes
  and the changed sentences, and a new catch on untouched text is advisory, so the round cap stops forcing
  escalations. Run 2 measured about 2.4M a page; the remaining budget assumed 1.3M.
- Open for Geoff: SvelteKit 3.0.0 is npm `latest` since 2026-10-01 and the engine's `^2.70` peer range rejects it, so
  a fresh `sv create` project cannot install cairn (friction log; the tutorial pins Kit 2 meanwhile). Taking the
  major is an engine pass and needs his go; Kit 3 also removes `csrf.checkOrigin`.
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

### Next action (draft docs stage 2a, task 8)

> **Goal.** After Geoff's read of the republished pilot pages, land the round-2 convergence change in the page chain,
> then draft task 8's five pages from plans.
>
> **Scope.** Fold Geoff's read into the three owner pages (scoped reviews per "Edits after the chain"); the runner
> change (round-2 reads check round-1 fixes and changed sentences; new catches on untouched text are advisory);
> task 8 on `draft-docs-2a`. The SvelteKit 3 major is a separate engine pass on Geoff's go.
>
> **Settled (do not re-brainstorm):** the spec (S1 to S9), tasks 7a and 7c, the targeted-close rulings in its record,
> `bothReviewers: true`, the stale-script guard and its scratchpad fallback in `pass-gate-economy.md`.
>
> **Approach.** Invoke `cairn-pass` to resume. Launch directory `~/Projects/cairn-cms`;
> `claude --model claude-opus-5-5` at medium effort. Put scratch projects under `$HOME/.cache`, since `/tmp` has a
> 6.1G per-user quota that reader runs filled on 2026-10-03.
