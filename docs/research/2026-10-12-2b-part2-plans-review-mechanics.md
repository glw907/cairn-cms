# Mechanics review: 2b part 2 page plans

The `plan-reviewer` agent reviewed the plan at commit `0ba1d02c5` on 2026-10-12. Its verdict:
fix one blocker and fold several majors before launch, with no design change. The findings below
are condensed from its reply. Each one has its disposition.

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 1 | blocker | The plan and prompts aren't on `main`, so the executor's worktree wouldn't hold them. | Folded: they land on `main` as a hand-over before launch ("Launch state"). |
| 2 | major | An ESM bare `import 'yaml'` from the scratch directory fails, and `$SCRATCH` is undefined. | Folded: `SCRATCH=$HOME/.cache/cairn-2b-part2`, and `yaml` loads through `createRequire` on the session worktree. |
| 3 | major | T0's acceptance fails on the sheet's example links, and no fixture tests the fact check. | Folded: link check stubbed for the example, and seeded `[rejected]` and made-up fact faults added. |
| 4 | major | A link to the unwritten Claude Code page hard-fails the stand-in check. | Folded: a target listed in any outline gets a warning, per the sheet. |
| 5 | major | `planPrompt` and `structurePrompt` are templates holding chain-only instructions that contradict this pass. | Folded: T0 renders `method.md`, which lists the instructions to ignore. |
| 6 | major | The register has no reader profile for the claude-code arm. | Folded: the extend track is the baseline, the outline `job` names the difference, and the gap is a `friction` entry. |
| 7 | major | Hand-parsing fact tags is a trap, since tags wrap and nest brackets. | Folded: the check uses `loadFactIndex` from `check-provenance.mjs`. |
| 8 | minor | A raw-text plain-scalar check misses list items, and an empty file parses as null. | Folded: AST checks plus a null refusal. |
| 9 | minor | T1 doesn't name `arm` or `track`. | Folded. |
| 10 | minor | `page.type` has no rule. | Folded: written verbatim from the outline. Sent to drafter-conductor, which folded it as A2 (free text). |
| 11 | minor | `check:leaks` scans `briefs/` and `outlines/` late. | Folded: each page task runs it. |
| 12 | minor | The outline's own `rearms` field isn't the re-arm input. | Folded. |
| 13 | minor | Pair dispatches name no model, and background nested agents aren't waited on. | Folded: `sonnet`/`medium`, nested dispatches in the foreground. |
| 14 | minor | A mid-run sheet change can't reach plans still in flight. | Folded: re-sync after each pair returns, with a fallback path at T13. |
| 15 | minor, optional | Workload of 686 dispositions across the ten extend pages. | Noted in the plan. No change. |
| 16 | minor, optional | The "no Claude Code" wording contradicts the one-link exception. | Folded: the register's exception is cited. |
| 17 | minor, optional | The friction-log triage isn't mentioned. | Folded: deferred to 2b's close. |
| 18 | minor, optional | The single push differs from pass-core "Pairs". | Folded as a stated deviation. |
| O1 | optional | Pair worktree setup runs 11 times. | Folded: pairs skip setup. |
| O2 | optional | T1 and T14 are single-deliverable tasks. | Folded: T1 moves into lane F, and T14 into T15. |
| O3 | optional | Format findings are handled three times. | Folded: one batch per returned pair, plus an immediate send for anything that affects a plan in flight. |
