# Fold record: tool-fixes plan

Findings from `2026-11-01-tool-fixes-review-mechanics.md`, each verified against the worktree before
acting. Plan path moves from 115 to 105: T1 +5, T2 +5 (Pair A goes 40 to 45), T5 -15. Ceiling 260; no cut.

| # | Disposition | Where, or why |
|---|---|---|
| 1 | folded | T1 change 3 adds `shipped-anchors.json` and an acceptance path. `package.json` stays off, with the reason: only `name` is read, and every bump would run the gate. |
| 2 | folded, not a fork | Planning ruling, a method call. T1 change 2: option (a), named gap, found item, CSS acceptance. The reviewer's `src/lib/admin/fonts.css` doesn't exist, so acceptance uses `src/lib/admin/cairn-admin.css`. |
| 3 | folded | T1 change 2: one line, no table key, adds the slug test to `unitInputs`; `vitest related` on a test file selects it (ran, 3.9 s). Pins `:907`, `:911` change. The reviewer's `packaging-guidance.test.ts` lead is false: the file never names `MIGRATION-NOTES.md`. The dead `scripts` half is in T1's text. |
| 4 | folded | Pre-flight row and Standing answers "Gates": line 2 may defer on a range with no `src/` path. `lane:fast` runs every line, so the deferral runs line 1 as printed. `componentPlan` is a found item. |
| 5 | folded | T5 "The helper": the check-first shape and `timeout: 15_000`; `toPass` default 0 read at `types/test.d.ts:8920`. Added a short evaluate timeout (`types.d.ts:14365`). |
| 6 | folded | T1 Test. The plan's `:960-961` was off by one; the real lines are `:950`, `:959-960`. |
| 7 | folded | T2: probed tailwindcss 4.3.3 `compile`; `root.base` is the stylesheet's directory. |
| 8 | folded | T2 outcome and acceptance: the `.` or repeated `..` test, `../../x`, the single-quote case, the doc comment at `:87`. |
| 9 | folded | T2 acceptance table, with `valid`, red-on-reader, and the no-newline case. Go's `(\S.*?)\r?$` probed. |
| 10 | folded | T2 is `runner`, T3 `ordinary`. Confirmed at `SKILL.md`'s risk classes. |
| 11 | folded | T3 acceptance. |
| 12 | folded | T1 header: draft PR first, CI wait off the path. |
| 13 | folded | T1 Docs and Files; T3 for line 24. |
| 14 | folded | T4 comment, stub, and extraction. Stub probed on a copy: `570`, `570`, `60`, exit 1. Extraction uses the root `yaml` dependency (`package.json:261`). |
| 15 | folded | T5 "The helper": `opened` read directly after the click. |
| 16 | folded | Standing answers, "Task reports". |
| 17 | folded | Found items; T6 files it. |
| 18 | folded | T1 Docs: one line in `pass-gate-tiers.md`, and `fast-lane.mjs:2`. |
| 19 | refused | Optional. The `cairn-running-passes` setup command already installs the showcase in a pass worktree. |
| 20 | folded | Pre-flight row: T3 only. One token. |
| 21 | folded | Standing answers, "Clock". The stage merge reshaped this rule anyway, so it costs a clause. |
| 22 | folded | T5 merges the stages. Cause and fix keep separate verdicts: "proven" needs a logged `attempt=1 handler=false opened=false`, "didn't fire" stays a set-aside, and title-failure counts never decide the cause. The set-aside branch stays, and an acceptance grep requires no logging at PR-ready. |

**Counts:** 21 folded, 1 refused, 0 owner forks.

## Checked and left

- Other unit pins in `gate-tier.test.ts` read for T1: `:127`, `:139`, `:917-933`, `:973`, `:981` survive.
- Plan citations corrected beyond the findings: `check.ts:66` in the sweep table becomes `:69`, and the
  fixture path is `providers/corpus.go:73`.
