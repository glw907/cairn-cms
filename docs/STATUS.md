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

- **Next pass: the SvelteKit 3 upgrade (Geoff's go on the major, 2026-10-04).** SvelteKit 3.0.0 and
  `@sveltejs/adapter-cloudflare` 8.0.0 have been npm `latest` since 2026-10-01; the engine's `@sveltejs/kit` peer range
  `^2.70` rejects them, so a fresh `sv create` project cannot install cairn (friction log, `f:skeche`, `f:ghzx9c`).
  Kit 3 removes `csrf.checkOrigin`, which the admin's CSRF handoff sets, so this pass absorbs the `checkOrigin` to
  `csrf.trustedOrigins` watch (kit#15992) and touches the auth path. Not yet planned: a fresh brainstorm session
  plans it through the `dependency-upgrade` skill.
- **Draft docs stage 2a is paused** at Geoff's read of the six accepted pilot pages (worktree `draft-docs-2a`, local
  only, HEAD `04a73a86`; record `docs/superpowers/research/2026-10-03-draft-docs-2a-targeted-close-record.md`; pages at
  https://claude.ai/artifact/5xEGWkUwrhmY9pjhLTSoKs, version 2). Before task 8, the chain's round-2 reads change to
  check round-1 fixes and changed sentences only (run 2 measured about 2.4M a page against the 1.3M budgeted). The
  add-cairn tutorial's SvelteKit 2 pin is a stopgap the upgrade pass rewrites.
- The gap sweep's 12 code defects sit in the friction log (`bd8ab1fe`, on `main`, not pushed).

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

### Next action (SvelteKit 3 upgrade, planning)

> **Goal.** Plan the pass that moves the engine, the showcase, the Waymark template, and `create-cairn-site` to
> SvelteKit 3 and `@sveltejs/adapter-cloudflare` 8, so a fresh `sv create` project installs cairn.
>
> **Scope.** In: the peer range, the `csrf.checkOrigin` removal and its replacement in the admin's CSRF handoff, every
> Kit 3 breaking change the engine or its consumers hit, the docs and reference pages that name Kit 2 (the
> add-cairn tutorial's pin included), and a `Consumers must:` list. Out: draft docs task 8, which resumes after.
>
> **Settled (do not re-brainstorm):** Geoff approved taking the major (2026-10-04).
>
> **Still open, brainstorm these:** whether the engine supports Kit 2 and 3 side by side or moves to 3 only, and the
> release this lands in. Both affect the four production sites' upgrade path.
>
> **Approach.** Invoke `superpowers:brainstorming`, then `dependency-upgrade` for the changelog survey and the
> refactor decisions, then `superpowers:writing-plans`. The pass class is likely `auth-data` (CSRF handoff). Launch
> directory `~/Projects/cairn-cms`; `claude --model claude-opus-5-5` at high effort. Put scratch projects under
> `$HOME/.cache`, since `/tmp` has a 6.1G per-user quota.
