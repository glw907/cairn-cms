# tool-gates plan

- **Slice:** `tool-gates`, class `ordinary` plus `runner`. Design: `2026-11-01-tool-gates-design.md`.
- **Base:** `main` at `23f70fb40`. **Branch:** `worktree-tool-gates`, pushed to `glw907/cairn-cms`.
- **Estimate:** design 150, ceiling 300, plan path **215**.
- **Merge:** conductor (`cairn-cms-9b`) under the merge word, record packet first. The executor stops
  at PR-ready, finalizes its `## Unreleased` entry, never bumps or publishes, and merges `main` only
  when told.
- **Executor:** Sonnet medium, `cairn-cms-tool-gates`. Go work loads `standards:go-conventions`.

## Sweep verdicts

Scoped sweep at `23f70fb40`. Landed in this branch's first commit, and #166 overrides the sweep
agent's verdict.

| Item | Verdict | Reason |
|---|---|---|
| #75 | fold | T3, the slice names it. `src/lib/guidance/check.ts:76-91`. |
| #178 | fold | T4. `tool/internal/doctor/check.go:125-131`. |
| #212 | fold | T6, may set aside. |
| #213 | fold | T5. The three skills are all the path-gated ones. |
| #166 | keep | The sweep agent proposed a fold. The sheet places it in pass 8, and this slice's prompt doesn't name it. Already stamped. |
| #86 | keep | `e2e.yml:76` reworded to `:68`. The fix lives in `bounded-install`, which this slice doesn't touch. Already stamped. |
| #24 | keep | Wording on `check_roles.go`, which T4 touches in one line only. Stamped. |
| #32 | reword | `types.ts:329` to `:398`. Its removal stays in its home pass, and its line follows the new grammar. |

No drop or duplicate. A full sweep is not due (15 unstamped; the bar is more than 15).

## Pre-flight

No owner step, no credential, no sitting. Every item below was read from the task list and checked.

| Item | Tasks | Check |
|---|---|---|
| `autoMode` line, workstation#192: edits and commits in this worktree under `.claude/skills/` | T1, T5 | Edit plus `claude -p` probe on `cairn-following-admin-design/SKILL.md` passed on 2026-11-01, reverted. |
| `.claude/agents/cairn-implementer.md` edit and commit. The `autoMode` line names `CLAUDE.md`, `.claude/skills/`, and `.claude/rules/`, not `.claude/agents/`, and the sheet's grant never named it | T5 | Edit and a local commit both passed on 2026-11-01 and were undone before any push. Geoff's prompt for this slice requires the fix. A refusal is a stop: T5 writes STATUS and waits for the conductor. |
| `.github/workflows/{test,tool}.yml` edits and push | T1, T2 | Pass 1b pushed workflow edits and merged in #175. Each such task prints `ciWait`. |
| `claude -p` from the worktree | T5 | Ran three times here with `--model haiku --max-turns 3`. It spends a few cents and takes no secret. |
| Heavy lane for the component project | T6 | Shared. `RUN_GATE_IF_BUSY=defer` is allowed on this pass, but T6's trace runs need the local run, so T6 waits for the lock. |

`CLAUDE.md` is deliberately untouched: `.claude/rules/evals-docs-process.md` would make it run both
eval suites. The `.claude/rules/` files are untouched too. A refusal of any write in this table is a
stop. It is never routed around, and no credential is read by another path.

## Standing answers

The sheet's "Standing answers for every pass" all apply. For this slice:

- **`#212` may set aside** if its cause isn't traced inside T6, with the evidence filed on the item.
- **May not set aside:** #213, the implementer fix, P9's grammar, the gate, the Go reader. The prompt
  and the sheet name these.
- **Cut order if over the ceiling:** #212, nothing else. Path is 215, so no cut is planned.
- **A real dependency found:** set the item aside for its home pass, list it in `## Decisions`, go on.
- **A retried test:** list it as flake evidence. T6's own test counts.
- **`Stale transcript block`:** `docs/admin/is-it-working.md:30` and
  `packages/create-cairn-site/test/fixtures/transcripts/04*.txt` quote the old SKIP title. Leave both
  and list them for the recapture.
- **After `main` merges in:** sibling entries that landed off grammar are legacy. Run
  `npm run check:consumers-must -- --update` and commit the baseline. Don't rewrite their text.
- **New BACKLOG item:** next free number on `main` at merge. BACKLOG numbers collide across branches.
- **Run git as a plain single command** from the worktree. The worktree guard refuses a compound or
  `cd`-prefixed form, and that refusal is not a stop.

## Order

| Step | Tasks | Path minutes |
|---|---|---|
| 1 | T1 | 50 |
| 2 | Pair: T2, T3 | 60 |
| 3 | Pair: T4, T5 | 30 |
| 4 | T6 | 45 |
| 5 | T7 | 30 |
| | **Path** | **215** |

Each pair's files are disjoint. Dispatches name `cairn-implementer`, whose setup line is still the old
one until T5 merges, so each dispatch adds `npm --prefix packages/create-cairn-site run prepack`, and
any task that reads an admin file names
`.claude/skills/cairn-following-admin-design/references/admin-design-system.md` to read by path.

## Tasks

### T1: the consumer-line grammar and its gate (50, `runner`)

**Outcome.** The grammar is written down once, and `check:consumers-must` fails a new off-grammar line
under `## Unreleased`.

**Files.** New: `scripts/checks/check-consumers-must.mjs`, `scripts/checks/consumers-must-baseline.json`,
`scripts/checks/fixtures/consumers-must/cases.json`, `src/tests/unit/check-consumers-must.test.ts`.
Edit: `package.json` (beside `"check:rulings-format": "node scripts/checks/check-rulings-format.mjs",`),
`scripts/checks/gate-table.json` (`"check:consumers-must": ["docs"]`, beside
`"check:rulings-format": ["docs"],`), `scripts/checks/gate-tier.mjs` and
`scripts/checks/close-prebuilt.mjs` (each beside `'npm run check:rulings-format',`),
`.github/workflows/test.yml` (beside `- run: npm run check:rulings-format`), `CONTRIBUTING.md`,
`.claude/skills/cairn-running-passes/SKILL.md`, `ROADMAP.md`.

**Mechanism.** Design "P9: the grammar" is the spec. Model the script on `check-rulings-format.mjs`:
pure exports and a main guarded on `import.meta.url`. Export `findOffGrammarLines(text)` returning
`{ line, text, reason }[]` for one section's text, and `isActionable(text)` for the reader's rule, so
the fixture test exercises both. Main reads `CHANGELOG.md`, cuts `## Unreleased` to the next
`## <version>` heading, compares against the baseline, and with `--update` rewrites the baseline
sorted and deduplicated. A failure prints `CHANGELOG.md:<n>: <reason>` and the line.

`cases.json` is an array of `{ "name", "section", "valid", "actionable" }`. Cover at least: bare
`nothing.`; an action; a two-space-indented action; `  Consumers must: rebuild the site from a fresh
scaffold.`; hedged `nothing, unless a script matches.` (invalid, actionable); `Nothing.` (invalid,
actionable); bold lead (invalid, not actionable); mid-paragraph lead (invalid, not actionable); a
clause wrapped onto a second line (invalid, actionable); no terminal period (invalid, actionable); a
code-span mention in prose (valid, not actionable); two lines where the second is actionable (valid,
actionable).

Rewrite `CONTRIBUTING.md`'s line that reads "with a `Consumers must:` line when upgrading requires
action" to state the grammar in one sentence. In `cairn-running-passes`, "A breaking change carries
one `Consumers must:` line per consumer action." gains a pointer to that sentence. At `ROADMAP.md:208`,
mark P9's contract landed and record the ruling (contract only, forward-only, no verb), leaving the
`migrate` wording to pass 8's R9.

**Acceptance.** `npm run check:consumers-must` passes on the branch. Adding an off-grammar line under
`## Unreleased` makes it exit 1 naming `CHANGELOG.md:<n>`. Deleting one legacy line makes it exit 1
naming the stale baseline entry. `--update` then passes. Print each of those three runs in the report,
then restore `CHANGELOG.md`.

**Test.** `check-consumers-must.test.ts` drives every `cases.json` row through both exports, and covers
the baseline comparison with an in-memory section (new line fails, stale entry fails, equal passes).
Add a gate-tier row beside the existing `check:rulings-format` expectations if the table test
enumerates them.

### T2: the Go reader on the grammar (25, `ordinary`, plus `runner` for `tool.yml`)

**Outcome.** `cairn health` reads only grammar lines, and a shared fixture proves JS and Go agree.

**Files.** `tool/internal/health/check_engine.go`, `tool/internal/health/check_engine_test.go`,
`.github/workflows/tool.yml`.

**Mechanism.** Load `standards:go-conventions`. In `check_engine.go`, replace
`var consumersMustLead = regexp.MustCompile("(`)?\\*{0,2}Consumers must:\\*{0,2}(`)?")` and
`var blankLine = regexp.MustCompile(`\n\s*\n`)` with one `consumersMustLine` regexp on the design's
pattern with `(?m)`. `sectionHasActionableConsumersMust` becomes the reader's rule: any match whose
group is not `nothing.`. `clauseIsNonActionableNothing` goes. Update the doc comments it leaves false,
including the `ConsumersMust` field's "whose text does not read "nothing"".

Replace `TestSectionHasActionableConsumersMust`'s table with a test that reads
`../../../scripts/checks/fixtures/consumers-must/cases.json` and asserts `actionable` for every row. The
sheet's standing answer covers the pinned old behavior; list it in `## Decisions`. Add
`- 'scripts/checks/fixtures/consumers-must/**'` to both `paths:` lists in `tool.yml`, beside
`- 'scripts/checks/shipped-anchors.json'`.

**Acceptance.** `make -C tool check` passes. Flipping one row's `actionable` in `cases.json` fails the Go
test and the Vitest suite. Restore it. `git grep consumersMustLead tool` prints nothing.

**Test.** The corpus test above. `TestEngineCheckBehindWithConsumersMustIsFailing` and
`TestEngineCheckBehindWithNoConsumersMustIsOK` stay as they are and must pass.

### T3: #75 and ergonomics 22 (60, `ordinary`)

**Outcome.** `cairn-guidance check` judges the exclusion by resolved path and prints `PASS`/`FIX` lines
with a count. `--strict` fails on any `FIX`.

**Files.** `src/lib/guidance/check.ts`, `src/lib/guidance/bin.ts`, `src/tests/unit/guidance/check.test.ts`,
`skills/cairn-extending-a-site/references/preflight.md`, regenerated `templates/waymark`.

**Mechanism.** Design "#75 and ergonomics 22" is the spec. In `check.ts`:

- `judgeSourceExclusion(readFile, cssPaths)` replaces `judgeSourceExclusion(readFile)`, and
  `runGuidanceCheck(readFile, packaged, cssPaths)` passes the list through. `node:path`'s `posix` does
  the resolving; `bin.ts` is Node only.
- `SOURCE_EXCLUSION_LINE`, `SOURCE_CSS_CANDIDATES`, and the `'unknown'` member of
  `SourceExclusionStatus` go. Keep `gitignoreExcludesClaude`.
- `ReportLine` gains `ok: boolean`. `isStaleUnderStrict` becomes `hasFixes(report)`.
- `formatCheckReport` prefixes each line, and its last line is the count. Keep `formatRecommendations`
  ungated, before the count.

In `bin.ts`, list with `readdir(join(cwd, 'src'), { recursive: true })`, treating `ENOENT` as `[]`, keep
the `.css` paths as `src/<rel>`, and read each through `readFileUnderCwd`. Update `USAGE`: `--strict`
now reads "exit 1 when any line reports FIX", and "check reports seven lines, none of which fails the
run except the tree freshness under --strict" changes to match. `check.ts`'s header comment and the
`TreeStatus` comment go with it.

Add one sentence to `preflight.md` after "it prints the snippet to add when one is missing": each line
reads `PASS` or `FIX`, and the last line counts them. Then run `npm run emit:template`, and commit the
regenerated `templates/waymark` hunks with this task.

**Acceptance.**

1. In a temp directory with `src/admin.css` carrying `@import "tailwindcss";` and
   `@source not "./.claude";`, `node <worktree>/dist/guidance/bin.js check --strict` prints a `FIX` line
   holding `@source not "../.claude";` and exits 1.
2. The same directory with that line changed to `@source not "../.claude";` prints `PASS` on the Tailwind
   line.
3. From `templates/waymark`, the built bin prints `PASS` on the Tailwind line, proving the
   `src/chassis/tokens.css` path resolves.
4. `grep -c '^FIX' ` over the output equals the `to fix` count in the last line.

**Test.** Rewrite the `judgeSourceExclusion`, `isStaleUnderStrict`, and format cases. Add: `./.claude` in
`src/admin.css` fails; `../.claude` in `src/admin.css` passes; `../../.claude` in
`src/chassis/tokens.css` passes; an exclusion in `src/theme/theme.css` covers an entry in
`src/chassis/tokens.css`; `source(none)` needs no exclusion; `tailwindcss/theme.css` alone is not an
entry; a `@source not` inside a CSS comment doesn't count; no entries passes; a `.orig` makes `hasFixes`
true.

### T4: #178 and slim R3 (30, `ordinary`)

**Outcome.** SKIP lines carry neutral titles, and the render reference keeps only `measurements.txt`.

**Files.** `tool/internal/doctor/check.go`, `check_labels_test.go`, the eleven `check_*.go` that declare a
`Check`, `tool/internal/doctor/testdata/golden/*.txt`, `tool/docs/design/README.md`,
`tool/internal/render/fixtures/fixtures.go`, deletions under `tool/docs/design/render-reference/`.

**Mechanism.** Load `standards:go-conventions`. Add `SkipTitle string` to `Check` with a doc comment.
`lineTitle` returns it on `StatusSkip`. Declare it on every check beside `PassTitle`. Titles name the
subject, with no verdict:

| Check | `SkipTitle` |
|---|---|
| `config.bindings` | `Wrangler bindings` |
| `config.media-bucket` | `Media bucket binding` |
| `config.observability` | `Workers Logs sink` |
| `config.public-origin` | `PUBLIC_ORIGIN` |
| floors | `Framework dependency floors` |
| roles | `Guard role vocabulary` |
| referrer | `Site-wide Referrer-Policy` |
| the other four | same form, a noun phrase with no verdict |

Regenerate with `go test ./internal/doctor -run TestGolden -update`, run in `tool/`, and read the diff:
only SKIP titles move.

For R3, delete every tracked file under `tool/docs/design/render-reference/` except `measurements.txt`,
65 files. In `tool/docs/design/README.md`, the bullet that opens "[`render-reference/`](render-reference/)
is iteration 3 of the mockups" and the section `## The render reference` shrink to what remains: the
frames live at the `pre-agent-first` tag, `measurements.txt` stays because `glyph.go`, `glyph_test.go`,
and `width.go` cite it, and the goldens in `tool/internal/render/testdata` are the acceptance record.
Repoint `fixtures.go:6`, whose comment names "tool/docs/design/render-reference's frames", to the tag
or drop the clause.

**Acceptance.** `make -C tool check` passes. `all-clean.txt` reads `SKIP  Media bucket binding: no media
assets configured`. No golden line outside a SKIP title changes in `git diff --stat`'s reading.
`git ls-files tool/docs/design/render-reference` prints one path. `git grep -n 'render-reference' tool`
prints only `measurements.txt` citations and the README.

**Test.** Add `TestEveryCheckDeclaresASkipTitle` beside `TestEveryCheckDeclaresAPassTitle`, asserting
`SkipTitle` is non-empty and `lineTitle(StatusSkip)` returns it. It fails on any check left out, and it
keeps the existing `lineTitle(StatusFail)` assertion as it is.

### T5: #213 and the implementer fix (25, `ordinary`; `.claude/` paths)

**Outcome.** A dispatch can load all three cairn skills before touching a file, and the implementer's setup
matches the fast lane's needs and its report comes from the commit.

**Files.** `.claude/skills/cairn-following-admin-design/SKILL.md`,
`.claude/skills/cairn-following-public-design/SKILL.md`, `.claude/skills/cairn-writing-engine-code/SKILL.md`,
`.claude/skills/cairn-writing-engine-code/references/durable-gotchas.md`,
`.claude/skills/cairn-running-passes/SKILL.md`, `.claude/agents/cairn-implementer.md`, new
`src/tests/unit/agent-skill-names.test.ts`.

**Mechanism.** Delete the `paths:` block from the three `SKILL.md` frontmatters. Do not touch
`.claude/rules/` or `CLAUDE.md`.

In `cairn-implementer.md` and `cairn-running-passes/SKILL.md`, the setup line becomes:

```sh
npm ci && npm ci --prefix examples/showcase && (cd examples/showcase && npx svelte-kit sync) && npm --prefix packages/create-cairn-site run prepack
```

In the implementer's `## Report`, replace "the files changed and the commit SHA" with the commit SHA and
"the files changed as `git show --name-only --format= <sha>` lists them". In
`cairn-running-passes`, the paragraph after the setup block gains that the prepack bakes the gitignored
template most `packages/create-cairn-site` tests read.

In `durable-gotchas.md`, the bullet that ends "`node scripts/bake-template.mjs --to template --engine-spec
"^$V" --dev-spec "^$V"`." now says `npm --prefix packages/create-cairn-site run prepack` from the root,
and that `test.yml` passes explicit specs because a `0.0.0` version or `file:` spec makes the bake refuse.
Leave `test.yml:76-81`'s comment alone unless T1 is already on that hunk; list it under `## Tooling`.

**Acceptance.** From the worktree, for each of the three skills, with no file read first:

```sh
claude -p --model haiku --max-turns 3 --tools Skill --output-format text 'Call the Skill tool with skill "<name>" and no args as your first and only action. Then print the first heading it returned, on one line, and stop.'
```

prints that skill's `# ` heading, not `Unknown skill`. The same call with `--agent cairn-implementer`
prints the heading for `cairn-following-admin-design`. In a fresh `git worktree`-free check, removing
`packages/create-cairn-site/template` and running the new setup's last clause recreates it.

**Test.** `agent-skill-names.test.ts` collects every `cairn-*` skill name in backticks in
`.claude/agents/*.md` and `.claude/rules/*.md` that has a directory under `.claude/skills/`, and asserts
its `SKILL.md` frontmatter has no `paths:` key. Restoring one `paths:` block fails it. A skill name with
no directory is ignored, since packaged skills live under `skills/`.

### T6: #212, the tab sizing retry (45, `ordinary`, may set aside)

**Outcome.** The cause is traced and the test no longer retries, or the item carries the evidence.

**Files.** `src/tests/component/EditorToolbar.test.ts`. `src/lib/admin/EditorToolbar.svelte` only if the
trace convicts the component, in which case read
`.claude/skills/cairn-following-admin-design/references/admin-design-system.md` first.

**Mechanism.** Hypothesis, unproved: the first measurement lands on the fallback face and the second on
IBM Plex, under `font-display:swap` (design "#212").

1. Probe on a throwaway edit: in the test, after `writeWidthSelected`, record
   `document.fonts.check('14px "IBM Plex Sans Variable"')`, then
   `await document.fonts.load('14px "IBM Plex Sans Variable"')`, then measure again, and print both widths.
2. Run the file alone, with no retry, on the heavy lane:
   `npx vitest run --project component --retry=0 src/tests/component/EditorToolbar.test.ts`, three times
   from a cold browser. If the widths differ by more than 0.5px before and after the load, the cause is
   proved.
3. Proved: in that describe's `beforeAll`, `await document.fonts.load(...)` for the face before any
   measurement, with a comment stating why `document.fonts.ready` isn't enough. Remove the probe.
4. Not proved: try the next traced lead once (the `rerender` flush, a transition on the box). If the
   cause is still open, remove the probe, reword #212 in `BACKLOG.md` with what the runs showed, leave
   its `Placement` for the conductor, and list it under `## Decisions` as set aside. That ends the task.

**Acceptance.** Proved path: the three `--retry=0` runs pass, and the PR's last five CI runs carry no
`EditorToolbar` entry in their `retries` notice. At 10 of 23 unfixed, five clean runs would happen by
chance about 7 percent of the time, and the PR says so. Set-aside path: the evidence is on the item.

**Test.** The existing test with its `beforeAll`. No new test.

### T7: close (30, `ordinary`)

**Outcome.** Ledgers, changelogs, review, PR-ready.

**Files.** `CHANGELOG.md`, `MIGRATION-NOTES.md`, `tool/CHANGELOG.md`, `BACKLOG.md`.

**Mechanism.**

- `CHANGELOG.md` `## Unreleased`: entries for the guidance check and for the consumer-line grammar. Each
  `Consumers must:` line is on grammar, which is this slice's first live use. `--strict` gets
  `Consumers must: fix every FIX line before running cairn-guidance check --strict in CI.`
- `tool/CHANGELOG.md` under `## Unreleased`: the SKIP titles and the health reader, in that file's own
  form.
- `MIGRATION-NOTES.md`: the per-version note, if a consumer action exists.
- `BACKLOG.md`: #75, #178, #213, and #212 if proved, move to `## Done`. File, through
  `standards:log-issue` at the next free number on `main`: the worktree guard refusing compound git
  commands, the stale `test.yml:76-81` comment if T5 left it, and anything `## Tooling` turns up.
- `docs`: run the `.claude/rules/docs-with-code.md` search for `cairn-guidance check` and the doctor's
  SKIP lines across `docs/`, `skills/`, and `claude/`. Show the command. Stale transcript blocks follow the
  standing answer.
- Open the draft PR on first push (T1), run `ci-green <sha> --pr <n> --wait` as a background task after each
  push. A red stops the line.
- `standards:diff-reviewer` at whole-branch scope, with `standards:go-conventions` for `tool/**` and
  `standards:svelte-reviewer` only if T6 touched the component. Fold it, then delete the plan files in a
  final commit.
- PR body: `## Brief`, what landed, `## Decisions` (R3's reading, the baseline over a git range, the
  dropped `unknown` state, every check declaring `SkipTitle`, the pinned tests changed), `## Planning
  misses`, `## Tooling`, retried tests, the score, the `cairn-run-gate --records` figures. Say which
  BACKLOG numbers are placeholders until merge.

**`## Tooling` must carry at least:** the `Unknown skill` reproduction and T5's fix; the prepack gap; the
report-from-memory fix; the worktree guard; the `cases.json` shared corpus as the new gate's proof; and each
skill, agent, gate, or hook that failed, misled, or was missing during the run, with its fix or backlog number.

**Acceptance.** CI green on the head, review accepted with no open finding, `## Unreleased` finalized,
`npm run check:consumers-must` green. Report PR-ready to `cairn-cms-9b` and stop.

**Test.** CI.
