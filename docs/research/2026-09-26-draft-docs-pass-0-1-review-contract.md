# Draft docs pass 0+1 plan review: contract and criteria lens

**Target:** `docs/superpowers/plans/2026-09-26-draft-docs-pass-0-1.md` at `ad30f1ec`, against
`docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md`. **Lens:** is each acceptance
testable, with a named fixture that would fail; can any criterion pass vacuously; does every spec
"Stage 0 acceptance" and "Stage 1" item map to a task without shrinking; the four planning-miss
items. Findings are ranked by consequence. Counts: 0 blockers, 7 major, 6 minor, 0 owner forks.

## Spec coverage

Every "Stage 0 acceptance" bullet and the "Stage 1" section map to a task: freeze lift (1, 2),
site-pass rule (2), owner facts (9), the missing memory citation (1), ROADMAP (1), flag pairing (3),
brief coverage (4), shipped anchors (5), the editor-quotes floor and the docs gate (6), chain and
agents plus scoped re-review (7, proved in 9), rule 2 scope (2), the review page (8, 9), and
stage 1 (10). Two small shrinkages are listed as minor 6. The gaps below are in how acceptance
proves the mapped outcome, not in the mapping.

Facts verified against the tree while reviewing: `docs/reference/` holds 29 pages besides its
README (31 entries less `README.md` and the `schema/` directory); `tool/v1.1.0`'s
`tool/internal/spine/conditions.json` carries 20 unique anchors, equal to today's
`conditions.ts` set, and `check_referrer.go`'s anchor is already among them; the `fixes.go`
anchors at `tool/v1.0.0` and `tool/v1.0.1` (three) are a subset of the same 20.

## Major

### M1. The chain's redraft branch has no fixture, and the pilot decision rests on it

**Where:** plan lines 218-235 (task 7), 267-270 (task 9 item 2).

**Defect.** Task 7 ships the lean re-read, the `args.bothReviewers` switch, the second-`fix`
escalation, and the cross-regression flag derived from `record.rounds[].reads`. Its acceptance
checks only the header comment and a `profile` grep, and defers the live proof to task 9. Task 9
runs one scratch page and requires only "the brief path, the page-inputs output with its claim
inventory, both reviews, and no grader read." If that page is accepted in round 1, which the spec
prices as a real path, no redraft runs, and every branch above ships unexercised. The first real
run is the stage 2a pilot, whose cross-regression rate and qualifying-page count decide the
ceiling and scope question to Geoff (spec, "Pilot checkpoint"). A flag that records `false` on a
page where only one reviewer re-read, or that miscounts qualifying pages, corrupts that question
silently.

**Fold.** Task 7's acceptance adds a deterministic check of the record derivation over synthetic
round records, each state naming its expected output: both accept in round 1 (no round 2, flag
absent); one `fix` in round 1 with both re-reading and the other flipping to `fix` (flag set,
page qualifies); the same with lean mode (flag recorded as not measured, never `false`); a second
`fix` from a re-reading reviewer (escalation to the conductor, no third round). If the workflow
script cannot be unit-tested, the derivation moves to a helper the dotfiles gate can run. Task 9's
record states which branch the live run took, and the report says which branches only the
synthetic check covers.

### M2. The docs gate cannot be scoped the way tasks 7 and 9 use it

**Where:** plan lines 197-209 (task 6), 222-223 (task 7), spec line 336.

**Defect.** Task 6 defines `check:docs-gate` as one `package.json` script chaining 15 checks, with
no parameters. Task 7 says the conductor passes `check:docs-gate` "with Vale and provenance scoped
to the page." npm does not route arguments into the middle of a chained script. The npm
`run-script` docs say arguments after `--` are passed "to the script", and they are appended to
the end of the script's command string, so with `a && b && c` only `c` receives them. The plan
never quotes that behavior or states how the scoping reaches `check:vale` and
`check:provenance`. As written, the chain gate either runs both whole-tree, or the task 7
implementer invents an interface task 6 never built. Task 9's proof then runs against an
unspecified gate.

**Fold.** Task 6's outcome names the scoping interface (for example, environment variables or a
small runner script that reads a page path and a brief path) and quotes the npm behavior that rules
out plain `--` arguments. Its acceptance adds one run scoped to a single page and brief, showing
that Vale and provenance read only those files and every other check reads the whole tree. Task 7
consumes that interface by name.

### M3. The rule-sweep greps pass vacuously and prove no new text is present

**Where:** plan lines 104-109 (task 1), 128-131 (task 2).

**Defect.** The three grep phrases ("frozen against rewrites", "never edits the cairn-cms
checkout", "after the site round") miss carriers the spec names. `docs/internal/docs-register.md:225`
reads "the three frozen narrative arms ... are swept at the docs rebuild, never before" and matches
none of them. `docs/internal/facts/README.md:86` ("the arms are frozen prose") and `ROADMAP.md:889`
and `:1095` also miss. In the dotfiles, `skills/site-pass/SKILL.md` and
`skills/engine-consult/SKILL.md` match none of the three phrases today, so task 2's grep over them
is green before any edit. A grep for absent old text also never proves the new text exists: the
site-pass clauses (follow the pages exactly, fix or file, the `site-docs/<site>-<pass>` branch,
in-flight arms filed only, "Edits after the chain"), the rule 2 scope lines in `writing-voice` and
the global `CLAUDE.md`, the `docs-is-a-pass-dimension` citation removal, and the
`docs-reset-initiative` memory dropping "the six-audience ruling" carry no check at all.

**Fold.** Widen the absence grep to `frozen|freeze` and the three phrases, and require the report
to list every remaining hit with a keep reason (for example, the unrelated "frozen contract" hits
in ROADMAP). Add presence checks per carrier: each freeze carrier states the per-arm lift and the
`site-docs/` write path; `site-pass` carries each of the five clauses; `writing-voice:74-75` and
the global `CLAUDE.md` Writing voice line name the front-door scope; `docs-is-a-pass-dimension`
and "six-audience" return nothing in their files.

### M4. "A `cairn` line" is undefined, and the root and lazy-command cases would fail real usage

**Where:** plan lines 139-155 (task 3), spec lines 203-210.

**Defect.** Neither the plan nor the spec says how a line is recognized as a `cairn` invocation.
Shell fences in today's docs carry sibling binaries that share the prefix: `npx cairn-audit
--rendered`, `npx cairn-guidance check --strict`, `npx cairn-media-seed --from`, `npx
cairn-manifest`, `npm run cairn:manifest`, and `my-cairn-site`. A word-boundary match (`\bcairn\b`)
treats `cairn-audit` as `cairn`. `SHELL_LANGS` includes `console`, whose lines carry `$ ` prompts,
and `cli-cairn-media-seed.md:30` already uses a `\` continuation that would carry flags onto a
line the check never pairs. The failure rule "first word is not a command, with or without flags"
fails `cairn --version`, `cairn --help`, and a bare `cairn`, all valid root invocations. It also
fails `cairn help agents` (a shipped help topic, `docs/HISTORY.md:583`) and `cairn completion
bash`, because cobra adds its `help` and `completion` commands only when the command executes, and
`treeFlags` walks an unexecuted tree (it already works around the same laziness for the help flag
with `InitDefaultHelpFlag`, `tool/cmd/cairn/flags_test.go:47-49`). Today's docs hold three
`cairn doctor` lines and no `cairn` line with a flag, so "green over today's docs" is nearly
vacuous, and the unit tests carry the whole proof.

**Fold.** Task 3's outcome defines the recognized line: first token exactly `cairn`, after an
optional `$ ` prompt and leading `VAR=value` assignments, with `\` continuations joined. It states
that root-flag lines resolve to the root path, and that the map includes cobra's lazily added
`help` and `completion` commands, citing cobra's `InitDefaultHelpCmd` and
`InitDefaultCompletionCmd` (or it records that the tree disables them). Planted tests add
negatives (`npx cairn-audit --rendered` and `npm run cairn:manifest` are not read), root cases
(`cairn --version` passes), an inherited flag on a subcommand (passes), and a continuation line
carrying a wrong flag (fails).

### M5. The Go test never fails on a stale per-command map

**Where:** plan lines 139-152 (task 3); `tool/cmd/cairn/flags_test.go:67-110`.

**Defect.** Today's non-update branch compares only `Flags`. The plan says the map is "checked by
it against the cobra tree", but acceptance asks only that `make -C tool flags` regenerate the file
byte-identically. That proves the write is deterministic, not that a drifted map fails. An
implementer who extends the `-update` write but not the compare ships a map that goes stale
silently, and `check:symbols` then rejects real flags or accepts dropped ones. The global
constraint "fails loud on its own planted defect" covers this in principle, but the task names no
fixture.

**Fold.** Acceptance adds a planted drift: the committed map with one flag removed from one path,
and one path renamed, each making `make -C tool check` fail with a message naming the path and the
`make -C tool flags` fix.

### M6. The two committed lists have no absent or malformed state, and README coverage can match the wrong brief

**Where:** plan lines 162-172 (task 4), 180-191 (task 5).

**Defect.** Neither task says what `check:provenance` or `check:readiness` reports when its list
file is absent, is not valid JSON, is not an array, or holds a path outside `docs/`. The easy code
path reads a missing list as empty, and then task 4 passes, printing "nothing is rebuilt yet," and
task 5 checks no shipped anchor. That is the same vacuous pass the spec is closing
(`check-provenance.mjs:458` already treats a missing briefs directory as holding none). Task 5's
acceptance is also all pure-function: the existing tests inject conditions into `checkReadiness`
(`src/tests/unit/check-readiness.test.ts:2-76`), so a new test injecting a fixture list proves the
logic but never that `main()` loads the committed file. Task 4 also leaves open how a listed page
maps to a brief. Briefs carry a `page` field (`check-provenance.mjs:531-538`), but the basename
rule (`:547`) makes every arm README's brief `README.json`. Coverage matched by file name would
let `briefs/front-door/README.json` (page `docs/README.md`) cover a listed `docs/admin/README.md`,
the collision the spec calls out.

**Fold.** Each task names the report for absent, malformed, and (for task 5) empty lists, and all
three fail. Task 5 adds a test that the committed list loads with its 20 entries, stated in the
plan as the expected count. Task 4 states that coverage matches a listed path against briefs'
`page` fields, and plants the README cross-match as a failing case.

### M7. The review page's read-only and conflict behavior contradicts the capability contract, and the round-trip fixture misses the likely break

**Where:** plan lines 239-256 (task 8), Review focus 5 (lines 82-84).

**Defect.** The plan says "a viewer who cannot write sees a read-only view," as if writability were
known on load. The `artifact` capability's type file says otherwise (`artifact.d.ts`, the
artifact-capabilities skill 0.2.60): "Member presence does NOT signal writability ... treat its
first `not_writer` or `not_granted` rejection as the read-only signal." On `conflict`, "the shell
is already reloading every open view," and unsent input survives only if the page stashes it in
`sessionStorage` before calling `publish`. Without that stash, a conflicting save discards Geoff's
edits. Neither behavior has a test. The round-trip fixture (a code fence, a table, a backtick span)
also omits the content that most likely breaks an HTML embed: a `svelte` fence carrying
`<script>...</script>`, which extend pages hold, and non-ASCII such as curly quotes. The test
covers Node embed then extract, while the real path is embed, browser regenerate on save, then
conductor extract.

**Fold.** Task 8 quotes those `artifact.d.ts` lines as the contract. It adds a test with the
capability stubbed to reject with `not_writer` (write controls disable, copy says read-only) and
with `conflict` (edits restored from `sessionStorage` after reload). The fixture adds a `svelte`
fence with `</script>`, an HTML comment, and non-ASCII text. The round trip also runs through the
page's own regenerate function, not only the Node script.

## Minor

1. **Task 6, lines 205-208: CI placement is asserted by a report, not a run.** In `test.yml`, Vale
   installs at line ~108, after the check steps the gate replaces (lines 75-87). A gate step left at
   the old position fails in CI, but the task's green run is local, so the break first surfaces at
   task 11's PR. Fold: acceptance requires a CI run on the pushed branch (or places the step after
   the Vale install and says so).
2. **Task 10, lines 298-303: the stage record can pass with empty rows.** "Lists all 29 pages" is
   met by rows reading "0 claims checked," and nothing diffs the record against the directory.
   Also, six parallel agents file facts into one file (`docs/internal/facts/reference.md`), and
   `check:facts` validates format, not that every filed fact survived. Fold: each row carries a
   nonzero claim count or a stated reason; the conductor diffs the page list against
   `docs/reference/*.md` less the README; agents return fact edits in their records and one agent
   applies them, or the Edit tool's stale-file refusal is named as the guard.
3. **Task 9, lines 271-286: the proof's fixture state is unnamed.** The round trip proves the brief
   fold only if Geoff's edit changes a sentence the brief lists as a claim, and the saved diff is
   non-empty. The throwaway branch also needs its own worktree, since the owner-fact edits land on
   `draft-docs-0` in the same sitting. `f:75hawi`'s check should quote Cloudflare's limit text with
   its URL. Fold: name those three conditions in the acceptance; a no-op or no-claim edit fails the
   proof.
4. **Lines 26-29: the `/cost` pre-flight is assigned to task 1,** whose implementer runs inside
   `pass-execute` and cannot see the conductor session's `/cost`. Fold: the conductor does it before
   segment A and records the result in the ledger.
5. **Task 5, lines 186-190: state the expected count (20) in the plan** so the report is checked
   against a number, and record that the `fixes.go` anchors at `tool/v1.0.0` and `tool/v1.0.1` are a
   subset of the list (verified above), since those binaries print them too.
6. **Two small shrinkages against the spec.** Task 1 and 2's site-pass rule drops "and feeds that
   stage's page inputs" (spec line 192). Task 7's acceptance grep looks for a `profile` arg and a
   grader stage but not the "Profile" section in the editor prompt (spec line 238). Fold: add both.
