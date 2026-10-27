---
paths: [".claude/skills/cairn-docs/**", ".claude/agents/docs-fact-checker.md", ".claude/rules/docs*.md", "CLAUDE.md"]
---

A change to the docs process runs both eval suites on `main` and on the branch, with `node .claude/skills/cairn-docs/evals/run.mjs main <branch>`, and puts the table in the PR. Start the run as a background command, since a suite takes far longer than ten minutes. The PR merges when the regression suite does not drop, its target capability case improves, and you read every failing trial's transcript; a drop is a regression case whose pass rate on the branch is below `main`'s in the same run and stays below after both arms rerun that case for three more trials (`--case <id> --trials 3`).
