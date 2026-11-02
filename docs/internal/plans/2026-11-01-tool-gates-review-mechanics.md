# tool-gates plan: mechanics and feasibility review

Reviewer: `standards:plan-reviewer`, Opus medium. Target: the plan and design note at `5b3cce32b`.

**Verdict:** approve after folds. No blockers, and six major findings. None changes the design's
shape. The worktree guard refused the reviewer's heredoc probes, so the Go half of the regexp
comparison is quoted from `go doc regexp/syntax`, not run; the JS half ran.

## Major

- **M1, `correctness`.** T3 breaks `src/tests/unit/guidance/bin.test.ts:121-126`, which asserts
  `check --strict` exits 0 in an empty directory after `install`. Add it to T3, assert exit 1 and a
  `PASS` on the tree line, and spawn from `templates/waymark` for exit 0.
- **M2, `correctness`.** T3's positive proofs pass vacuously if the entry match misses a real entry,
  since "no entries" passes. All four sites write `@import 'tailwindcss';` with single quotes, and
  `templates/waymark/src/admin.css:3` has `layer(utilities)` before `source(none)`. Add the failing
  single-quote case, the `layer(...)` form, and a negative acceptance on a template copy.
- **M3, `correctness`.** The baseline's dedupe leaves a hole. `  Consumers must: nothing.` is on grammar
  at `:636,:844` and off at `:802,:812` (jammed against the next bullet), so a new jammed line passes,
  and deleting one of them raises no stale entry. Compare as a multiset, add a `cases.json` row, and
  name a unique legacy line such as `:129` in acceptance.
- **M4, `correctness`.** The standing answer covers siblings merging first, not after. `--update`
  launders anything. Make it print additions and removals, make the failure text steer to the grammar,
  and name both orders in the conductor prompt.
- **M5, `correctness`.** `claude/CLAUDE.md:34-35` ("`--strict` exits 1 when the tree is stale") and
  `bin.ts:5-6` go false, and neither is in T3. T7's docs search would find the first, but T7 runs no
  emit. Add both to T3, and rerun `emit:template` if T7 edits `skills/` or `claude/`.
- **M6.** T6's 10-of-23 evidence is all CI, while its probe is local, so a local no-change could set
  the item aside on a false negative. T6's acceptance needs five post-T6 CI runs, and T7 may produce
  two or three. (13/23)^5 is about 5.8 percent, not 7. Verified: `--retry=0` overrides `retry: 2`, and
  the family string matches the compiled `@font-face`. Add one pushed probe, treat a load rejection as
  evidence, and state the count and odds.

## Minor

- **m1, `correctness`.** `pass-gate-tiers.md:200` enumerates `check:rulings-format`; add it to T1.
- **m2, `optional`.** `gate-tier.test.ts:164-166,:741` derive from the table, `close-prebuilt.mjs`, and
  `test.yml`, so no row is needed.
- **m3, `correctness`.** T1's test needs a third pure export; name `compareBaseline`.
- **m4, `correctness`.** An absent `## Unreleased` is legitimate at a cut. Reuse `check-version.mjs`'s
  `unreleasedWindow`, and name the absent, empty, and missing-baseline states.
- **m5, `correctness`.** `cases.json` gaps: `nothingness`, a code span holding the whole line, a tab
  indent. Engines differ on CRLF and on NBSP after `\S`; `CHANGELOG.md` has neither.
- **m6, `optional`.** `["docs"]` misses a commit touching only the script or baseline; use
  `["docs", "scripts"]`.
- **m7, `correctness`.** "Open the draft PR" sits in T7 though T1 needs it, and no line makes a report
  name the CI verdict.
- **m8, `correctness`.** T7 never reruns `check:docs-gate`.
- **m9, `correctness`.** T6 names no lock wrapper. T3 never names `npm run package`. Use `env -C` over a
  `cd` prefix.
- **m10, `optional`.** T4's table used shorthand ids; `git diff --stat` can't show which lines moved;
  repointing `fixtures.go:6` to the tag would fail the grep.
- **m11, `correctness`.** T5's test passes vacuously if its collector finds nothing.
- **m12, `optional`.** T4's `git rm` and T5's `rm -rf` have no pre-flight row.
- **m13, `optional`.** 1a touches `cairn-running-passes/SKILL.md`, `durable-gotchas.md`,
  `pass-gate-tiers.md`, `check_referrer.go`, `one-warning-failure.txt`, `tool/CHANGELOG.md`, and
  `gate-table.json`. Rerun the goldens after that merge.

## Facts confirmed

Baseline survives sibling merges and the R1 reset with M3 and M4 folded. All T1 rows behave the same in
JS and Go. `readdir` recursive holds on Node 26, `engines` `>=24`. The bin runs from `templates/waymark`
with no `node_modules`, seven good lines, exit 0, today only through `admin.css`'s `source(none)`.
`runGuidanceCheck`, `isStaleUnderStrict`, and `SOURCE_EXCLUSION_LINE` have callers only in `bin.ts` and
`check.test.ts`, and none is in `api-surface.md`. Eleven checks in eleven files, seven can skip,
`render-reference` holds 66 files. Pairs are disjoint; T1 and T5 don't reach the emit, which reads
`skills/` and `claude/`. T5's citations hold. `evals-docs-process.md` matches nothing T1 or T5 touches.

No over-ceremony beyond m2. No owner forks.
