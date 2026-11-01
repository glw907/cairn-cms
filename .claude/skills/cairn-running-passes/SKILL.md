---
name: cairn-running-passes
description: Runs a pass of work on the cairn-cms engine from a clone: worktree setup, the committed fast lane, the full-suite home, the risk-class path map, review checklists by path, and the close checklist. Use when planning, executing, or closing a change to the engine or its Go tool, or when picking a risk class.
---

# Running a cairn-cms pass

The `standards:running-passes` skill holds the lifecycle (design, plan, execute, close). This skill fills in what is specific to this repository. Where the two disagree, this one wins.

State lives in `docs/STATUS.md` (the rolling now, with the next action), `BACKLOG.md` (open items), and `ROADMAP.md` (what comes next). A plan is deleted when its pass closes. Cross-repo specs and plans live with their initiative, not here, and a cairn-only plan lives on its pass branch. The planning record up to 2026-10-31 is at the `pre-agent-first` tag.

## Set up a worktree

Cut a worktree off `main` for the pass, then run:

```sh
npm ci && npm ci --prefix examples/showcase && (cd examples/showcase && npx svelte-kit sync)
```

The second install keeps the worktree's showcase off the main checkout's engine. The sync writes the `$app/tsconfig` that `check:public-skill` needs. `references/durable-gotchas.md` under `cairn-writing-engine-code` explains why.

## Gates

**Fast lane.** After each task commits, run `npm run lane:fast -- --range <base>..HEAD`. It runs the legs `node scripts/checks/gate-tier.mjs --fast --range <base>..HEAD` prints and fails on the first red leg, or on an empty classifier output. The `tool` class gate is `make -C tool check`. A workspace suite such as `npm test -w packages/create-cairn-site` is Node-only; the root `npm test` drives Chromium. A lone unrelated test failure, or `Cannot connect to the server in 60 seconds`, is a known trap: `cairn-writing-engine-code`'s `durable-gotchas.md` carries the rerun rule.

**Full suite.** Continuous integration on the draft pull request runs the whole suites. The first push opens a draft PR, since the workflows fire on `pull_request` and on push only to `main` and `rebuild`. Run `npm test`, then `npm run check:close`, locally only when CI is unavailable. Pass the end-to-end step `--grep-invert "site home|archive page 2"` locally. A docs-only change skips `npm test` and runs `check:close`. List every retried test from CI output in the pull request body: a retry that passed is flake evidence, not green.

## Risk classes

- `auth-data`: `src/lib/{auth,auth-channel,auth-crypto,auth-store,github}/**`, `src/lib/sveltekit/{csrf*,auth-*,commit-log}.ts`, `src/lib/admin/{csrf-context.ts,CsrfField.svelte}`, `migrations*/**`, `examples/showcase/migrations*/**`, `templates/*/migrations*/**`, `**/hooks.server.ts`, `**/preview/\[token\]/**` (escaped, because `[token]` is a character class in a pathspec), `**/members/login/**`, `**/admin/signups/**`, `tool/internal/secrets/**`, `packages/create-cairn-site/src/{github,cloudflare}/**`, `wrangler.*`.
- `runner`: `scripts/checks/**`, `.github/workflows/**`, `.github/ci-green.json`.
- `ordinary`: everything else.

A chassis task (`examples/showcase/src/chassis/`, `templates/waymark/`) takes the class an engine change of its kind would take, and the engine's quality bar, since a developer copies that code.

## Review checklists by path

The close review loads `standards:svelte-reviewer` for `**/*.svelte` and load, action, or hook code; `standards:cloudflare-workers-reviewer` for Worker, D1, and `wrangler.*`; `standards:web-auth-security-reviewer` for every `auth-data` path; `standards:daisyui-a11y-reviewer` for markup, styles, and theme config; and the `go-conventions` skill for `tool/**`.

## Close checklist

- **Live admin smoke** on `auth-data`, against a real Worker (`wrangler dev`) with a session minted by inserting a D1 row, then the magic-link round trip in headless Chromium, reading the link from wrangler's local `send_email` output. Follow `references/admin-smoke-test.md`.
- **Documentation is a pass dimension.** Fix every doc the change touched, inbound references included. A change to documented behavior fixes its page in the same commit (the `cairn-writing-docs` skill). Grep a removed or renamed symbol across `docs/` and `README.md` and repoint every hit.
- **Changelog and version records.** A behavior change updates `CHANGELOG.md` under `## Unreleased` and the per-version record (`docs/extend/migration-notes.md`, with `docs/extend/upgrade-cairn.md`). A breaking change carries one `Consumers must:` line per consumer action.
- **Public surface.** An intended change runs `npm run check:surface -- --update` and commits `scripts/checks/api-surface.md`.
- **Rulings.** A ruling on a consultation item updates `docs/internal/engine-rulings.md`.
- **Friction.** A finding goes to `BACKLOG.md` through `/log-issue`, with a `Placement` line, or is fixed in the pass that meets it. An engine change reads `engine-rulings.md` and runs the charter's premise test (`cairn-judging-scope`) first.
- **Docs-stage close.** Run the engine-pass boundary test over the open engine friction (BACKLOG items tagged for the engine batch), and state in `docs/STATUS.md` whether an engine pass is warranted before the next stage (Geoff, 2026-10-07). The test: fix before the next stage any item whose fix would change what a written or outlined page tells the reader (a workaround, caveat, or step the page carries only because of the defect); fix promptly any item that blocks a page or a migration step; batch every other item into the final engine batch, tagging a batched item with the page that carries its caveat so that pass revises the page.
- **No release.** A pass never bumps the version or publishes. It finalizes its `CHANGELOG.md` entry and stops. The `cairn-releasing` skill cuts a release when one is warranted. Never write cairn state into a site's STATUS.

## References

- `references/admin-smoke-test.md`: the per-pass local smoke test for a site's embedded `/admin`.
- `references/pass-gate-tiers.md`: the per-task gate tiers `scripts/checks/gate-tier.mjs` chooses from a diff, with the trigger globs per tier.
