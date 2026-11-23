---
name: cairn-build
description: The facts a session needs to build a task in the cairn-cms engine: worktree setup, the gate, the full-suite home, the risk classes, review checklists by path, the close checklist, and the builder's conventions. Use when building, resuming, or reviewing a task in cairn-cms, or when picking a risk class.
---

# Building a task in cairn-cms

`building-from-specs` owns the process: the spec, the task session, the review, the pull request, and the merge. This skill holds only what is specific to this repository.

State lives in `docs/STATUS.md` (the rolling now, with the next action), `BACKLOG.md` (open items), and `ROADMAP.md` (what comes next). Cross-repo specs live with their initiative, not here. The planning record up to 2026-10-31 is at the `pre-agent-first` tag.

## Set up a worktree

Cut a worktree off `main` for the task, then run from its root:

```sh
npm ci && npm ci --prefix examples/showcase && (cd examples/showcase && npx svelte-kit sync)
```

The second install keeps the worktree's showcase off the main checkout's engine. The sync writes the `$app/tsconfig` that `check:public-skill` needs. `references/durable-gotchas.md` under `cairn-writing-engine-code` explains why.

Run git as plain, separate calls from the worktree path. Claude Code's worktree isolation refuses a Bash line whose git use it can't verify stays inside the worktree: `git` inside a command substitution, `git -C` on another checkout, and a long compound line were all refused. Split the line and rerun it. A refusal is not a hook or a permission problem.

## The gate

After each commit, run the committed fast lane from the worktree root: `npm run lane:fast -- --range <base>..HEAD`. It runs the legs that `node scripts/checks/gate-tier.mjs --fast --range <base>..HEAD` prints. A line runs all its legs and fails at its end, a red line stops the lines after it, and an empty classifier output fails. `references/gate-tiers.md` holds the tier rules and the trigger globs.

On the workstation, run it as `cairn-run-gate 'npm run lane:fast -- --range <base>..HEAD'`. The wrapper outlasts the shell tool's ten-minute cap. It exits 75 when the run isn't done: re-issue the same command until a `gate exit:` line prints. Never pipe the lane into `tail`, which drops the exit code.

A lane's result is its exit code, and a red lane is never green. A passing targeted test is necessary and never sufficient: a browser component test can pass while `svelte-check` fails. A lone unrelated test failure, or `Cannot connect to the server in 60 seconds`, is a known trap: `durable-gotchas.md` carries the rerun rule.

Continuous integration on the draft pull request runs the whole suites. The first push opens the draft, since the workflows fire on `pull_request` and on push only to `main` and `rebuild`. Run `npm test`, then `npm run check:close`, locally only when CI is unavailable, and pass the end-to-end step `--grep-invert "site home|archive page 2"`. A docs-only change skips `npm test` and runs `check:close`. List every retried test from CI output in the pull request body: a retry that passed is flake evidence, not green. Without network, `src/tests/unit/workflow-yaml.test.ts` fails because it fetches `actionlint` (#489). Name that leg as the cause and rerun once the network is back. Never skip the test.

## Conventions

- NodeNext modules: intra-package imports carry a `.js` extension on the `.ts` or component path (`import { x } from '../content/ids.js'`). Tests import the same way.
- Svelte 5 runes throughout (`$props`, `$state`, `$derived`, `$effect`, `$bindable`). Each component opens with a `<!-- @component -->` comment and carries JSDoc on its `Props` members.
- Tests live in `src/tests/{unit,integration,component}/<name>.test.ts`. Write the test at the lowest layer that can see the behavior, and extend an existing test before adding a file. An `auth-data` task writes the failing test first and confirms it fails for the right reason.
- A built-in public component under `src/lib/public/` carries no literal, uses no daisyUI component class, and follows `cairn-following-public-design`. Admin markup loads `standards:daisyui` first and prefers the stock component. `cairn-following-admin-design` and `docs/internal/engine-rulings.md` win on a conflict.
- No comment claims more than its assertion proves, and no shipped comment cites a process artifact (a spec, a ruling id, or a task number).
- Re-emit any generated tree before the gate and commit it in the same commit.
- A blanket `as never` or `as any` that hides a real type problem is a finding. A targeted, explained cast is fine.
- A plan's stated mechanism (a packaging, build, or module-resolution claim such as `publishConfig.exports` or an `attw` expectation) is a starting point. Confirm it against the real toolchain.
- A change that adds, renames, or removes a member of a public option-bearing type also runs `npm run check:options`. An `exclude` row is only for a path a developer never sets, and a new option is never parked `pending`.
- Read the `durable-gotchas.md` entries for the area the task touches before starting. A new gotcha goes there, never task state.

## Risk classes

- `auth-data`: `src/lib/{auth,auth-crypto,github}/**`, `src/lib/sveltekit/{csrf*,auth-*,commit-log,guard,preview}.ts`, `src/lib/admin/{csrf-context.ts,CsrfField.svelte}`, `migrations*/**`, `examples/showcase/migrations*/**`, `templates/*/migrations*/**`, `**/hooks.server.ts`, `**/preview/\[token\]/**` (escaped, because `[token]` is a character class in a pathspec), `**/admin/signups/**`, `wrangler.*`.
- `runner`: `scripts/checks/**`, `scripts/gate/**`, `scripts/release/**`, `.github/workflows/**`, `.github/ci-green.json`.
- `ordinary`: everything else.

**Carve-out for `scripts/gate/` (Geoff, 2026-11-03).** A change that only follows a third-party page, such as a renamed GitHub button, lands as a direct change after the fast lane and a dry run, provided the grader, the sweep's name matcher, and the verdict rule are untouched. Any other `scripts/gate/` change is a `runner` task and ends with one gate run (`cairn-releasing`, "Gate the candidate").

**A harness-only fix after the final candidate** writes no `CHANGELOG.md` line, because `check-stable-source` refuses any changelog line that is not a version field or heading. It records itself in its pull request or commit body instead.

A chassis task (`examples/showcase/src/chassis/`, `templates/waymark/`) takes the class an engine change of its kind would take, and the engine's quality bar, since a developer copies that code.

## Review checklists by path

`standards:diff-reviewer` reads every task. Add `standards:svelte-reviewer` for `**/*.svelte` and load, action, or hook code; `standards:cloudflare-workers-reviewer` for Worker, D1, and `wrangler.*`; `standards:web-auth-security-reviewer` for every `auth-data` path; and `standards:daisyui-a11y-reviewer` for markup, styles, and theme config.

## Close checklist

- **Live admin smoke** on `auth-data`, against a real Worker (`wrangler dev`) with a session minted by inserting a D1 row, then the magic-link round trip in headless Chromium, reading the link from wrangler's local `send_email` output. Follow `references/admin-smoke-test.md`.
- **Docs.** Fix every doc the change touched, inbound references included. A change to documented behavior fixes its page in the same commit (the `cairn-writing-docs` skill). Grep a removed or renamed symbol across `docs/`, `skills/`, `claude/`, and `README.md` and repoint every hit.
- **Changelog and version records.** A behavior change updates `CHANGELOG.md` under `## Unreleased` and the per-version record in `MIGRATION-NOTES.md`. A breaking change carries one `Consumers must:` line per consumer action, in the shape `CONTRIBUTING.md` states and `npm run check:consumers-must` enforces.
- **Public surface.** An intended change runs `npm run check:surface -- --update` and commits `scripts/checks/api-surface.md`.
- **Rulings.** A ruling on a consultation item updates `docs/internal/engine-rulings.md`. An engine change reads that file and runs the charter's premise test (`cairn-judging-scope`) first.
- **Findings.** A finding goes to `BACKLOG.md` through `/standards:log-issue`, with a `Placement` line, or is fixed in the task that meets it.
- **Docs-stage close.** Run the engine-task boundary test over the open engine backlog items (those tagged for the engine batch), and state in the pull request whether an engine task is warranted before the next stage (Geoff, 2026-10-07). The test: fix before the next stage any item whose fix would change what a written or outlined page tells the reader (a workaround, caveat, or step the page carries only because of the defect); fix promptly any item that blocks a page or a migration step; batch every other item into the final engine batch, tagging a batched item with the page that carries its caveat so that task revises the page.
- **No release.** A task never bumps the version or publishes. It finalizes its `CHANGELOG.md` entry and stops. The `cairn-releasing` skill cuts a release when one is warranted. Never write cairn state into a site's STATUS.

## References

- `references/admin-smoke-test.md`: the local smoke test for a site's embedded `/admin`.
- `references/gate-tiers.md`: the per-task gate tiers `scripts/checks/gate-tier.mjs` chooses from a diff, with the trigger globs per tier.
