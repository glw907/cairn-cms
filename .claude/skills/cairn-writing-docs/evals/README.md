# cairn-writing-docs evals

The cases and runner that measure the docs process: the `cairn-writing-docs` skill, the `docs-fact-checker`
agent, the docs path rules, and `CLAUDE.md`. Only `SKILL.md` loads into a session, so this directory
costs no context.

Run a suite as a background command, since it takes far longer than ten minutes:

```bash
node .claude/skills/cairn-writing-docs/evals/run.mjs <ref> [<ref>] [--suite regression|capability|all] [--case <id>] [--trials n] [--max] [--keep] [--control]
```

Two refs give an A/B comparison over identical fixtures. `--control` makes the first ref the control
arm (label `control`), which has the skill deleted; the run is a harness fault if that arm lists or
launches `cairn-writing-docs`, so pass `main main --control` to compare `main` against itself without the
skill. Fixtures live in `~/.cache/cairn-docs-evals/fixtures/`, outside every repository, and the run
refuses to start under any `CLAUDE.md` or `.claude/` other than `~/.claude/`. A run over 120 case
sessions needs `--max`.
Transcripts and raw results land under `~/.local/state/cairn-docs-evals/<run>/`. `evals.json` holds
the cases, `setups/` the fixture seeds, `sources.md` the guidance the cycle rereads, `history.md`
the monthly record, and `cycle-prompt.txt` the monthly session's prompt.

## The site suite

`--suite site` reads `evals-site.json` beside `evals.json`. Its cases name a `fixture`: `site` builds
an emitted site from the arm's ref (pack the engine and `cairn-cms-dev`, emit with `file:` specs,
install, `cairn-guidance install`, cached under `~/.cache/cairn-docs-evals/sites/`), and `tree` takes
the arm's whole tree without `.claude/settings.json`. Both run with `--setting-sources project`, so
no user skill or plugin reaches a session. `--fixture site|tree|pin` filters by kind.

| Flag | Effect |
|---|---|
| `--strip <file>` | Remove the listed package paths from the engine tarball before the site is emitted (the ablation). |
| `--plugin-dir <dir>` | Load that plugin directory in every case. |
| `--tree-plugin-dir <dir>` | Load it in tree cases only; the session must list exactly one `standards`. |
| `--concurrency <n>` | Sessions in flight (default 4). |
| `--baseline-first` | Run the first ref's arm before the second, skip a treatment case whose baseline cannot reach four of five, and stop an arm at the failure that decides it. |
| `--reuse-baseline <runId>` | Take that run's graded baseline trials as this run's. |
| `--resume <runId>` | Continue a run. Finished trials stay; an errored trial runs again. A usage-limit result pauses the run (exit 4) without a row. |

Each finished trial appends a row to `results.jsonl` in the run's state directory. The table closes
with per-case medians over passing trials (input plus cache creation plus output tokens, seconds),
their sums, the all-trial sums beside them, and cache reads in their own column.
