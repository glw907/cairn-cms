# tool-gates: design note

Just-in-time design for one slice of the approved run sheet. Geoff's approval is the sheet and the
ledger rulings; this note settles only method calls, so it carries no `### Decide:` block. Sheet:
`~/.local/state/cairn-agent-first/design-audit/run-sheet.md`. Initiative: none (run-sheet work).

## Outcome

- The changelog's consumer line has one grammar, a gate fails a new entry off it, and `cairn health`
  reads that grammar and no other (P9, contract only, no backfill, no verb).
- `cairn-guidance check` judges the `.claude/` exclusion correctly and reports `PASS` or `FIX` with a
  count, and `--strict` fails on any `FIX` (#75, ergonomics 22).
- `cairn doctor` SKIP lines carry their own titles (#178).
- `tool/docs/design/render-reference` keeps only `measurements.txt` (slim R3).
- The tooling defects this run found are closed: `cairn-implementer` setup and report, path-gated
  skills (#213), and the `EditorToolbar` retry (#212, or filed evidence).

## P9: the grammar

One physical line, a paragraph of its own, at column 0 or two spaces:

```text
Consumers must: nothing.
Consumers must: <action>.
```

Shared regexp: `^(?:  )?Consumers must: (\S.*)$`. A line is on grammar when all four hold:

1. It matches the regexp, so the lead is bare: no bold, no backticks, not mid-paragraph.
2. The line before it and the line after it are blank (or the file's edge). A wrapped clause fails.
3. Its body is exactly `nothing.`, or it does not open with the word `nothing` and ends in `.`. The
   hedged forms in Unreleased today (`nothing, unless ...`) are the fuzz the reader carried a
   special case for, so a hedge states its action instead.
4. Any other `consumers must:` in a section, in any case, is off grammar. A mention in a code span
   (`` `Consumers must:` ``) is prose and is skipped.

The reader's rule is one line: a section is actionable when any line matching the regexp has a body
other than `nothing.`. It needs no paragraph split, no mention skip, and no word-boundary test,
because a mention can't match at column 0 or 2.

**Forward-only.** Unreleased holds 43 lines, 37 of them off grammar [ran on `23f70fb40`], and the
ruling says no backfill. `check:consumers-must` reads `## Unreleased` and compares its off-grammar
lines against `scripts/checks/consumers-must-baseline.json`, a snapshot of today's lines. A new
off-grammar line fails, naming `CHANGELOG.md:<n>`. A baseline entry no longer in Unreleased also
fails, so pass 8's R1 reset can't leave the file stale: `--update` rewrites it, and after the reset
it is `[]`. The comparison is a multiset, since the same text can be legacy twice and still be new a
third time. That is the sheet's "starting at the reset" as a ratchet that already bites. The
repository's own form for this is `custom-surface-budget.json` and
`check-self-use-allowlist.json`. `--update` can launder a new line, so it prints what it changed and
the conductor reads the baseline diff before each merge.

A git-range check was the alternative. It needs a base ref in every caller, and CI's depth-1
checkout has none. A marker line can't work, because Unreleased is split by `###` subsections and a
new entry lands above or below any marker.

**Same grammar in both languages.** `scripts/checks/fixtures/consumers-must/cases.json` is one case
list read by the Vitest suite and the Go test, so a drift fails one of them. Precedent for a Go test
reading outside its module: `tool/cmd/cairn/permissions_test.go:14`. `tool.yml`'s `paths:` gains the
fixture directory, or a fixture edit wouldn't run the Go half.

Old sections stay as they are. `cairn health` reads a wrapped line by its first physical line, and
misses a bold or mid-paragraph one. That stands: the reset removes them before the tool is tagged,
and every site rebuilds. The rebuild line itself is pass 8's R1.

## #75 and ergonomics 22

Tailwind's page: "Use `@source not` to ignore specific paths, relative to the stylesheet". The
scaffold's entries are `src/chassis/tokens.css` (`@import "tailwindcss";`, then
`@source not "../../.claude";` at `:55`) and `src/admin.css` (`tailwindcss/utilities.css` with
`source(none)`). All four sites carry `@import "tailwindcss"` in `src/chassis/tokens.css`, and the
sailing club's exclusion sits in a different file, `src/theme/theme.css:46`.

- `bin.ts` lists `src/**/*.css` and hands the paths to `runGuidanceCheck` beside `readFile`. The fixed
  `SOURCE_CSS_CANDIDATES` list and `SOURCE_EXCLUSION_LINE` go.
- An entry is a file that imports `tailwindcss` or `tailwindcss/utilities[.css]`, in either quote form,
  with no `source(none)`, after CSS comments are stripped.
- `.claude/` counts as excluded when `.gitignore` ignores it, when there is no such entry, or when any
  listed file carries a `@source not` that resolves against that file to the root `.claude`.
- Otherwise the line is a `FIX` naming the first entry and the exact line for it, computed from the
  entry's depth (`@source not "../../.claude";` for `src/chassis/tokens.css`).

The `unknown` status goes. Under the new `--strict` it would fail a site with no way to pass, and
with the walk it can only mean no entry exists, in which case nothing scans `.claude/`. The check
doesn't follow `@import`, so one file's exclusion counts for every entry. That matches the sailing
club's layout, and it can only pass a site that excludes `.claude/` in one of two entries.

The report prefixes each of the seven lines `PASS  ` or `FIX   `, keeps a snippet body under its
line, and ends with `<n> passed, <m> to fix` after the recommendations. `--strict` exits 1 on any
`FIX`. A leftover `.orig` is a `FIX`, since `cairn-guidance install` already says to read and delete
those. The snippet workflow runs the check without `--strict`, so no scaffolded site's CI changes.

## #178

`Check` gains `SkipTitle`, and `lineTitle` returns it on `StatusSkip`. The title names the subject
with no verdict: `SKIP  Media bucket binding: no media assets configured`. Seven of the eleven checks
can skip today. Every check declares one, and the test sits beside
`TestEveryCheckDeclaresAPassTitle`. Finding "can skip" statically takes an AST walk, and four unused
strings cost less than that walk and catch a future skip.

## #213

Reproduced on `23f70fb40`: `claude -p --model haiku --max-turns 3 --tools Skill` calling
`cairn-following-admin-design` as its first action prints `Unknown skill`. With `paths:` removed, the
same call prints the skill's heading, both bare and under `--agent cairn-implementer` [ran]. Claude
Code's skills page: "When set, Claude loads the skill automatically only when working with files
matching the patterns." It also says "Description always in context, full skill loads when invoked"
for the default, so removing `paths:` adds the three descriptions to each session's listing and no
skill body.

All three path-gated skills are named by a dispatch (`cairn-implementer.md:53,81,93`), so all three
lose `paths:`. The rules in `.claude/rules/` keep their path triggers. A unit test fails when a skill
named in `.claude/agents/` or `.claude/rules/` declares `paths:`, so the fault can't return unseen.

## `cairn-implementer`

The setup line already has `svelte-kit sync`. It gains the prepack.
`npm --prefix packages/create-cairn-site run prepack` ran clean at `0.98.0` in 1 second [ran]: the
comment at `test.yml:76-81` calling it unrunnable predates the dev package's publish. The same line
lands in `cairn-running-passes` and in `durable-gotchas.md`'s setup list. The report takes its file
list from `git show --name-only --format= <sha>`.

## #212

Read, not run: the tab test measures width straight after `render`, then again after `rerender`.
The compiled sheet's faces use `font-display:swap` (`build-admin-css.mjs:93-96`), the sheet applies
only under `data-theme`, and this describe is the second themed one in the file, so the first
measurement can land on the fallback face and the second on IBM Plex. A retry then passes on a cached
font, which fits 10 of 23 runs passing on retry. This is a hypothesis, and T6 proves it or sets the
item aside with its evidence. `document.fonts.ready` alone is not enough, since it resolves at once
when no load has started.

## Out of scope

W3 and the rest of pass 3 stay home. Nothing here adds a `cairn` command, a `MIGRATION-NOTES.md`
format, or a rewrite of any legacy line. #166 stays in pass 8, where the sheet puts it.

## End-to-end check

`npm run check:close` scope on the branch through CI, plus: a built `cairn-guidance check --strict`
exits 1 on a site with `@source not "./.claude";` in `src/admin.css` and 0 on the emitted template;
`make -C tool check` passes with the shared fixture; and the fresh-session `Skill` probe prints a
heading for all three skills.

## Risk class

`ordinary` plus `runner` (`scripts/checks/**`, `.github/workflows/**`). Conductor merges under the
merge word, with a record packet first. No `auth-data` path, no `live-account`.

## Sweep verdicts

Full list in the plan's head. A full sweep isn't due: 15 unstamped items, and the bar is more than 15.
