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

- **Next pass: the SvelteKit 3 upgrade, planned and reviewed, ready to execute.** Spec
  `docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md`, plan
  `docs/superpowers/plans/2026-10-03-sveltekit-3-upgrade.md` (14 tasks, six segments S0 to S5, `auth-data`,
  12.4M ceiling). Both took the full `spec-plan-review` sequence (reviews, fold, and verification under
  `docs/superpowers/research/2026-10-03-sveltekit-3-*`). The pass closes unreleased: Kit 3 publishes with draft docs
  stage 2a (Geoff, 2026-10-03). cairn.pub is the only site that migrates; the other four are rebuilt on the new docs.
  Geoff's rulings: the live smoke runs on the showcase under local `wrangler dev`, `@sveltejs/package` 3 is taken, and
  `/media` gets no engine-side Cache API caching (a ROADMAP watch instead). Port 4173 is held by a week-old dubplate
  `sirv` server, which fails eight `preview.spec.ts` tests on this machine.
- **Draft docs stage 2a is paused** at Geoff's read of the six accepted pilot pages (worktree `draft-docs-2a`, local
  only, HEAD `04a73a86`; record `docs/superpowers/research/2026-10-03-draft-docs-2a-targeted-close-record.md`; pages at
  https://claude.ai/artifact/5xEGWkUwrhmY9pjhLTSoKs, version 2). Before task 8, the chain's round-2 reads change to
  check round-1 fixes and changed sentences only (run 2 measured about 2.4M a page against the 1.3M budgeted).
  Carry-forward: the SvelteKit 3 pass lands on `main` first and never edits this worktree; 2a rebases onto it and
  rewrites the add-cairn tutorial's SvelteKit 2 pin against Kit 3.
- The gap sweep's 12 code defects sit in the friction log (`bd8ab1fe`, on `main`, not pushed).

## Open decisions and watches

- The monthly drift routine (`trig_015UPQostYVisXuExTHTH2vu`) samples only `docs/reference` and
  existing extend pages until the admin and editors arms are rebuilt (re-scoped 2026-09-30, Geoff's
  go); widen it back to all four tracks at stage 4's merge.
- Watch: `cairn-docs-outline`'s lock (dotfiles) was built past need; simplify it in a separate
  dotfiles change with a `diff-reviewer` read (the spec records it as an instance of S2).
- Watch: the kept per-version records' paths are hardcoded in `cairn-pass`, `CLAUDE.md`, and
  `docs/internal/facts/README.md`; a pass that moves either record updates all three.
- The kit#15992 routine (`trig_0193pPNoyxsTGeUhF1xx7woa`) now watches for SvelteKit remote functions
  reaching stable, opening a GitHub issue to evaluate them (Geoff, 2026-10-03). Node 26 is the beta floor only if Active LTS by then; TypeScript 7 waits on
  `tsgo.yml`. `radius-scale` and the retired-patch arms promote at `0.99.0`.
- `cairn-release` gap: the `0.98.0` prep ran no `check:dev-package`; the skill's pre-commit gate
  names it next. Monthly routines email only on a mismatch. `CAIRN_GH_READ_TOKEN` expires
  2026-10-19 (`cairn-tripwire` warns daily). `npm pkg fix` is owed for the four `./` `bin` entries.

## Resume prompt

### Next action (SvelteKit 3 upgrade, execution)

> **Goal.** Execute the plan that moves the engine, the showcase, Waymark, `create-cairn-site`,
> `@glw907/cairn-cms-dev`, and the Go doctor to SvelteKit 3 and adapter-cloudflare 8, so a fresh `sv create` project
> installs cairn.
>
> **Scope.** The plan's 14 tasks (S0 spike through S5 docs), then the close. Out: the release (it holds until draft
> docs stage 2a lands), cairn.pub's migration (its own site pass after the cut), and draft docs task 8.
>
> **Settled (do not re-brainstorm):** everything in the spec's "Settled decisions" and "Rulings" and the plan's
> "Decisions". The split rule: if the pass splits, the cut falls after S2, never after S3, so `main` stays
> releasable. An S0 spike stop, including FA1 (no prerender-safe `building` form that keeps the `./sveltekit` barrel
> free of `$app/*`), halts the pass for Geoff.
>
> **Approach.** Invoke `cairn-pass` to start. Create the worktree `.claude/worktrees/sveltekit-3` (branch
> `sveltekit-3`) off `main` and run the chain per the plan: `pass-execute` by name, one invocation per segment,
> implementer `cairn-implementer`, Task 11b upshifted to Opus. Pre-flight each segment's factual claims at HEAD.
> Every dependency bump (Tasks 4 and 11b) carries the `dependency-upgrade` changelog survey. Ask Geoff before the
> first e2e gate whether the dubplate `sirv` server on port 4173 can be stopped. The close's live smoke needs
> Geoff's magic-link click. Launch directory `~/Projects/cairn-cms`; `claude --model claude-opus-5-5` at medium
> effort. Put scratch projects under `$HOME/.cache`.
