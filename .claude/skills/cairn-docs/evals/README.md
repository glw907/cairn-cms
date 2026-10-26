# cairn-docs evals

The cases and runner that measure the docs process: the `cairn-docs` skill, the `docs-fact-checker`
agent, the docs path rules, and `CLAUDE.md`. Only `SKILL.md` loads into a session, so this directory
costs no context.

Run a suite as a background command, since it takes far longer than ten minutes:

```bash
node .claude/skills/cairn-docs/evals/run.mjs main [<branch>] [--suite regression|capability|all] [--case <id>] [--trials n] [--max]
```

Two refs give an A/B comparison over identical fixtures. A run over 120 case sessions needs `--max`.
Transcripts and raw results land under `~/.local/state/cairn-docs-evals/<run>/`. `evals.json` holds
the cases, `setups/` the fixture seeds, `sources.md` the guidance the cycle rereads, `history.md`
the monthly record, and `cycle-prompt.txt` the monthly session's prompt.
