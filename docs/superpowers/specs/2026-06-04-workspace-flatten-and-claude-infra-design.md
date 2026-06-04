# Workspace flatten and Claude infrastructure Design

## Summary

The cairn meta-workspace at `~/Projects/cairn/` exists to symlink `cairn-cms` into its two consumer
sites for zero-publish local development. The sites have since become idiomatic cairn consumers that
pin the published package by version range, so the symlink coupling no longer earns the wrapper
directory. This work flattens the three repos into standalone siblings under `~/Projects/`, points the
sites at the npm registry like any external consumer, migrates the per-project Claude memory to the new
working-directory keys, and gives each repo a self-sufficient `CLAUDE.md`. A research pass against
Anthropic's current Claude Code guidance confirmed the existing configuration already matches best
practice, so the infrastructure work is a light touch rather than an overhaul.

## Goals

- Move `ecnordic-ski`, `907-life`, and `cairn-cms` out of `~/Projects/cairn/` to standalone siblings
  under `~/Projects/`, and delete the wrapper directory.
- Have each site resolve `@glw907/cairn-cms` from the registry, with no workspace symlink.
- Preserve each repo's git history, remotes, and local Claude configuration.
- Migrate and consolidate the per-project Claude memory so each repo's new path key holds exactly its
  relevant memories.
- Give `cairn-cms` its own `CLAUDE.md`, which it currently lacks, and keep every `CLAUDE.md`
  self-sufficient for standalone development.
- Capture the current Opus 4.8 facts the research surfaced, so the configuration stays informed.

## Non-goals

- Publishing `cairn-cms`. The held `0.25.0`/`0.26.0` window is unaffected by this work.
- Committing or ignoring 907's font assets beyond removing the unused ones named below.
- A deeper refactor of any site's application code or its `.claude` rules.
- Restructuring the global `~/.claude` configuration, which the research confirmed is already sound.

## End state

```
~/Projects/
  cairn-cms/        (was ~/Projects/cairn/cairn-cms)
  ecnordic-ski/     (was ~/Projects/cairn/ecnordic-ski)
  907-life/         (was ~/Projects/cairn/907-life)
  poplar/  jrnl-md/  ...other existing repos
```

`~/Projects/cairn/` is gone. Each repo is a standalone git checkout. The two sites install
`@glw907/cairn-cms` from the registry through their existing ranges (`ecnordic-ski` `^0.21.0`,
`907-life` `^0.24.0`). `cairn-cms` continues its own development against its in-repo
`examples/showcase`, which already imports the package through a relative `file:../..` path that the
move does not touch.

## Workstream 1: repo move and decouple

Each repo is a self-contained git checkout, so a plain `mv` of the directory carries the `.git`, the
`.claude/`, and any untracked files, and preserves all history. The procedure per repo:

1. Move the directory to `~/Projects/<repo>`.
2. Run a clean standalone `npm install` so each repo builds its own `node_modules` with no workspace
   hoisting. The sites resolve `cairn-cms` from the registry at this step.
3. Run the repo's own gate (`npm run check` and `npm run build`, plus `npm test` where the repo has
   one) to prove it stands alone.

The meta `package.json`, `node_modules`, and `package-lock.json` are discarded with the wrapper
directory. The workspace `workspaces` array and the root symlink go away with it.

**907 font removal.** `907-life` carries seventeen untracked `.woff2` files under `static/fonts/`
(the `AlegreyaSans`, `CormorantGaramond`, `ETBook`, `Iosevka`, and `iAWriter` families). The site's
own `@font-face` rules in `src/app.css` use `Karla`, `Spectral`, and `MonaspaceNeon`, so the seventeen
are unreferenced strays that never deploy (they are untracked, and the deploy builds from git). They
are deleted as part of this work. The plan re-confirms they are still unreferenced at execution time
before deleting, since deleting a referenced font would break the site.

## Workstream 2: per-project memory migration and consolidation

Claude Code keys per-project memory by the working-directory path. Moving a repo changes its key, so
the memory must move with it or it is orphaned. The current cairn memory is fragmented across keys,
which the move is a good moment to consolidate.

Current keys holding cairn-related memory:

- `-home-glw907-Projects-cairn` (37 files): the meta-workspace key where most sessions ran. Mostly
  `cairn-cms` engine memory, plus a few site-specific and cross-cutting entries.
- `-home-glw907-Projects-cairn-cairn-cms` (14 files): sessions run directly in `cairn-cms`.
- `-home-glw907-Projects-cairn-907-life` (2 files): sessions run in 907 under the workspace.
- `-home-glw907-Projects-907-life` (9 files): 907's original pre-workspace location.
- `-home-glw907-Projects-ecnordic-ski` (13 files): ecnordic's original pre-workspace location.

Destination keys after the flatten:

- `cairn-cms` → `-home-glw907-Projects-cairn-cms` (new, created during this work).
- `ecnordic-ski` → `-home-glw907-Projects-ecnordic-ski` (exists, reunites with its 13 files).
- `907-life` → `-home-glw907-Projects-907-life` (exists, reunites with its 9 files).

The sorting rule: each memory lands in the key of the repo it is about. The `cairn-cms` engine
memories and the cross-cutting cairn-development memories consolidate into the `cairn-cms` key. The
site-specific memories (for example the ecnordic 0.21 migration record) merge into the matching site
key. The two entries under the workspace 907 key merge into the 907 key. The plan inventories each
file, routes it by this rule, deduplicates against any existing entry at the destination, and rewrites
each `MEMORY.md` index plus any `[[link]]` that points at a moved entry. The drained workspace keys
(`-home-glw907-Projects-cairn` and `-home-glw907-Projects-cairn-cairn-cms`) are emptied once their
content has moved, so no stale duplicate loads.

This step touches files under `~/.claude/projects/`, outside any git repo. It is reversible, since the
operation is a file move that can be moved back.

## Workstream 3: Claude configuration, self-sufficiency and best-practice alignment

The research pass (full findings in the appendix) confirmed the existing setup already matches current
Anthropic guidance: every `CLAUDE.md` is under the 200-line target, the `prose-guard` hook is not
duplicated, `CLAUDE_CODE_SUBAGENT_MODEL=inherit` is single-sourced in `.bashrc`, the Claude Code
version (2.1.162) runs Opus 4.8 with effort already set to `high` (the 4.8 default), and the
model strategy (inherit plus frontmatter pins, read-only Opus reviewers, a Sonnet implementer) is
sound. So this workstream is small.

- **`cairn-cms` gets its own `CLAUDE.md`.** It has none today and relies on the meta-workspace file
  loading as a parent directory. The new file derives from the meta `CLAUDE.md`, drops the
  workspace and symlink-dev framing, and keeps the `cairn-cms` description, the run instructions, the
  credentials block, and the durable gotchas. It stays under the 200-line target.
- **Site `CLAUDE.md` self-sufficiency.** Each site file is confirmed to read correctly standalone, and
  the cross-repo framing is trimmed (for example ecnordic's line pointing at `cairn-pass` for cairn-cms
  work). The site `.claude/` directories travel intact in the directory move and need no change.
- **Meta content relocation.** The `cairn-dx-feedback-2026-06-04.md` doc at the workspace root moves
  into `cairn-cms` (it is cairn-cms feedback). The now-obsolete `docs/runbooks/symlink-dev.md` runbook
  is rewritten to describe registry-consumer development, or retired, and `cairn-cms` STATUS and memory
  are updated for the new path and the dropped symlink-dev workflow.
- **Optional enhancements, verified before adoption.** The research suggested `memory: project` on the
  recurring reviewer and implementer agents for cross-session review knowledge, and `.claude/rules/`
  with `paths:` frontmatter as the lever if any `CLAUDE.md` later grows past the target. The report was
  wrong on several config specifics, so the plan verifies each feature against the live tool before
  committing to it, and treats both as optional. The Opus 4.8 tools the research surfaced (`/fast`,
  `ultracode` with `/workflows`, the effort levels) are recorded in the appendix as informational.

## Verification

- Each repo runs a standalone `npm install` and its own gate green from its new location.
- `907-life` builds with the seventeen unused fonts removed, and its `@font-face` fonts still resolve.
- Each repo's `CLAUDE.md` and memory load at the new working-directory key (confirmed by `/memory` and
  by the files existing at the right key).
- `~/Projects/cairn/` no longer exists.
- Deploys are unaffected, since each site ships through GitHub to Cloudflare with no dependency on the
  local directory location.

## Sequencing and execution caveats

The session that executes this work has its working directory inside `~/Projects/cairn/`, so the
teardown is sequenced to avoid removing the ground under the running shell. The order: move the two
sites first, then `cairn-cms`, then run the memory and configuration steps, then delete the drained
`~/Projects/cairn/` from a working directory of `~/Projects` or the home directory. The moves are
reversible by moving the directory back, and all three repos are pushed to their remotes, so a botched
step loses nothing. The destructive deletion of `~/Projects/cairn/` runs only after a dry-run listing
confirms the directory holds nothing but the drained wrapper files.

## Rollback

Every step is reversible. A repo move reverses with a move back. The memory migration reverses by
moving the memory directories back to their original keys. The configuration edits are git-tracked
inside each repo. The only irreversible step is the final deletion of `~/Projects/cairn/`, which runs
last and only after verification, and even then the repos themselves are safe at their new locations
with their history and remotes intact.

## Out of scope

- Publishing `cairn-cms`.
- Committing or ignoring the font families the site actually uses.
- Any site application-code refactor.
- Restructuring the global `~/.claude` configuration.

## Appendix: research findings (Claude Code best practices, current 2026-06-04)

A research pass against Anthropic's official Claude Code documentation and the Opus 4.8 announcement
produced the guidance below. The configuration audit in the report named several deviations that did
not hold once checked against the real files, so the verified state is recorded first.

**Verified state of this setup.** Claude Code 2.1.162 runs Opus 4.8. `effortLevel` is `high`, the
4.8 default. The `prose-guard` `PreToolUse` hook has a single entry. `CLAUDE_CODE_SUBAGENT_MODEL` is
`inherit`, set only in `.bashrc`, with no `env` block in `settings.json`, so there is no double-set.
Every `CLAUDE.md` is under the 200-line target (global 108, meta 108, ecnordic 62, 907 115). The model
strategy uses `inherit` plus frontmatter pins, with read-only Opus reviewers and a Sonnet implementer.

**Opus 4.8 facts worth knowing.** On the API, `opus` resolves to `claude-opus-4-8`, and Opus 4.8
needs Claude Code 2.1.154 or later. Effort levels are `low`, `medium`, `high`, `xhigh`, and `max`,
with `high` the 4.8 default (it was `xhigh` on 4.7); `xhigh` suits long asynchronous workflows and
`max` is session-only and prone to overthinking. Switching to 4.8 the first time forces its default
effort, so re-run `/effort` to restore a preferred level. Fast mode (`/fast`) runs Opus 4.8 at roughly
2.5 times speed for about twice the standard rate, for latency-sensitive interactive work.
`CLAUDE_CODE_SUBAGENT_MODEL` overrides both the per-invocation model and the agent frontmatter, so
`inherit` is the value that keeps frontmatter authoritative; a concrete model there would silently
override every pinned agent. `ultracode` (set via `/effort ultracode`) sends `xhigh` and has Claude
orchestrate dynamic workflows of many parallel subagents, the native primitive for codebase-scale
migrations.

**Mechanisms the report recommended, to verify before use.** `.claude/rules/*.md` with `paths:`
frontmatter loads instructions only when matching files are touched, the lever for shedding `CLAUDE.md`
weight if a file grows. Agent frontmatter accepts `memory: project` for cross-session agent knowledge.
Custom commands are merged into skills, with skills the forward path. These claims came from a report
that was wrong on the config specifics, so each is verified against the live tool before the plan
relies on it.

Sources: `code.claude.com/docs` (memory, settings, hooks, skills, sub-agents, model-config, changelog)
and `anthropic.com/news/claude-opus-4-8`.
