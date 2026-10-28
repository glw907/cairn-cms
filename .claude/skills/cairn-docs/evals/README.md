# cairn-docs evals

The cases and runner that measure the docs process: the `cairn-docs` skill, the `docs-fact-checker`
agent, the docs path rules, and `CLAUDE.md`. Only `SKILL.md` loads into a session, so this directory
costs no context.

Run a suite as a background command, since it takes far longer than ten minutes:

```bash
node .claude/skills/cairn-docs/evals/run.mjs <ref> [<ref>] [--suite regression|capability|all] [--case <id>] [--trials n] [--max] [--keep] [--control]
```

Two refs give an A/B comparison over identical fixtures. `--control` makes the first ref the control
arm (label `control`), which has the skill deleted; the run is a harness fault if that arm lists or
launches `cairn-docs`, so pass `main main --control` to compare `main` against itself without the
skill. Fixtures live in `~/.cache/cairn-docs-evals/fixtures/`, outside every repository, and the run
refuses to start under any `CLAUDE.md` or `.claude/` other than `~/.claude/`. A run over 120 case
sessions needs `--max`.
Transcripts and raw results land under `~/.local/state/cairn-docs-evals/<run>/`. `evals.json` holds
the cases, `setups/` the fixture seeds, `sources.md` the guidance the cycle rereads, `history.md`
the monthly record, and `cycle-prompt.txt` the monthly session's prompt.
