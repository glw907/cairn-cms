# Style-guide sync spec: contract-and-criteria review

**Lens:** contract and criteria (testability, vacuous passes, pass class, ceremony).
**Target:** `docs/superpowers/specs/2026-09-28-style-guide-sync-design.md` at `99535b08`.
**Verified against:** `draft-docs-0` (`140e8208`) for the register, `docs-gate.mjs`, `gate-tier.mjs`,
and the trigger pages; this worktree's `.vale.ini` and `.vale/styles/`; `~/.claude/workflows/docs-page-chain.js`;
`~/.dotfiles/scripts/check.sh` and `tests/`; `~/.claude/skills/pass-core/SKILL.md`.

**Counts:** 1 blocker, 6 major, 9 minor, 3 over-ceremony, 2 owner forks.

The design is sound in direction. The gaps cluster in three places: the rollout mechanism
(R4) has no implementation under the repo's single Vale config, the proof run (criterion 5)
has no entry point in the chain, and the "tone kept" half of the goal has no criterion that
can fail.

## Correctness gaps, by consequence

### B1. R4's "error on chain pages, warning elsewhere" has no mechanism (blocker)

**Location:** spec:122-126, criterion 6 (spec:188).

A Vale rule's level lives in its YAML or in a `.vale.ini` section keyed by glob. `docs-gate.mjs`
`--page` narrows only the *paths* Vale reads (`docs-gate.mjs` `buildSteps`, `check:vale` args);
the same `.vale.ini` governs both the scoped run and the unscoped tree run in CI
(`test.yml:115`, `npm run check:vale`) and in `check:close`. So a rule at error fails the tree run
on every frozen page it fires on: `Google.Headings` alone has 18 findings in `docs/` today
(measured, Vale 3.23.0, `--minAlertLevel=warning`). A per-glob demotion (`[docs/extend/**]
Cairn.LinkText = warning`) also demotes `choose-an-ai-posture.md`, which lives in that glob, so
criterion 6 passes vacuously. Either way one of R4's two promises breaks. The register's "Names
sweep policy" cited as precedent is an editing policy, not a level mechanism: `Cairn.Names` is
error everywhere.

The same question applies to R3: markdownlint-cli2's run over the tree in CI needs either a
warning severity (verify the pinned version supports one) or an exclusion list.

**Fold:** name the mechanism in R4. Options that work: (a) a per-page error overlay, a
`.vale.ini` section listing chain-accepted pages by exact path that sets the new rules to error
while the arm globs keep them at warning, grown as pages pass; or (b) `docs-gate.mjs --page`
runs Vale with a second config (`--config`) that raises the new rules to error, while the tree
run keeps the base config. Add to criterion 6: "and the unscoped `npm run check:vale` and
`check:markdown` still exit 0 on the tree."

### M1. The proof run (criterion 5) cannot plant a defect

**Location:** spec:186-187.

`docs-page-chain.js` drafts every page from its inputs (header, `args.pages[]`: `job`,
`exemplarSources`, `inputs`); it has no entry point that takes a pre-written draft. A defect
planted in the source page is discarded by the drafter. A defect planted in an exemplar trips
W1's own pre-check, which stops the run, so the criterion "passes" without the register
editor ever reading anything. The "or a gate failure" disjunct also lets the -ing heading pass
entirely on `Cairn.HeadingForm` without testing the guide lens at all. And one run with no
negative control cannot distinguish a working lens from an editor that marks everything
`source: guide`.

**Fold:** restate the proof at the stage level. (1) Hand a fixed planted page (a prose
procedure and an -ing heading, named in the plan) directly to the register-editor prompt the
chain renders, and require a blocking `source: guide` finding on the prose procedure
specifically. (2) Run the docs gate on the same page and require the `Cairn.HeadingForm`
failure. (3) Negative control: the same editor prompt on a conforming page (the rebuilt
`choose-an-ai-posture.md`) returns no blocking `source: guide` finding. Alternatively, add a
`draftPath` entry point to the chain; that is more surface than the proof needs.

### M2. The fixture harness is unnamed, so criterion 2 has no runner

**Location:** spec:101, 125-126, criterion 2 (spec:181-182).

This repo has no Vale fixture harness (none on `draft-docs-0`; the dotfiles harness at
`~/.dotfiles/tests/vale/run-fixtures.sh` runs the workstation Vale, 3.23.0, against the Microsoft
package only). The spec does not say where fixtures live, what runs them, or how "under the CI
pin" is proven when the workstation cannot run 3.15.1. Three vacuity traps follow:

- A fixture outside the `.vale.ini` globs matches no section, gets no styles, and every
  must-not-fire fixture passes silently.
- A fixture under `docs/` makes the tree `check:vale` fail on the must-fire half.
- `Cairn.HeadingForm`'s question check is path-dependent (allowed under `docs/editors/**`), so a
  fixture outside an editors-shaped path cannot prove the must-not-fire state.

**Fold:** R2 names a harness script (for example `scripts/checks/check-vale-fixtures.mjs`) that
runs Vale with an explicit config on a fixtures tree excluded from the docs globs, asserts each
must-fire fixture raises *that rule id* and each must-not-fire fixture raises *no finding from
that rule*, runs every pair in the same config invocation, and places path-dependent fixtures
under mirrored paths. Wire it into `test.yml` after the 3.15.1 install step, and add it to the
docs gate or `check:close`. The same harness covers R3's two custom markdownlint rules.

### M3. Cross-chain dependencies contradict "disjoint files, parallel chains"

**Location:** spec:71-72, 131, 151-152, 203, criteria 5 and 8.

The file sets are disjoint; the *runtime* dependencies are not:

- R5 "clears the register chain with the new guide lens," which is W1 and W3.
- W1's exemplar pre-check runs R2's rules and R3, which must exist in the checkout it reads.
- Criterion 8 reviews R1's register with W3's lens.
- Criterion 5 needs R2's `Cairn.HeadingForm` plus W1 and W3.

Under `pass-execute-chains`, R5 can run while W3 is mid-flight.

**Fold:** declare a join: chain R runs R1 to R4 and R6; chain W runs W1 to W4; R5, the proof run,
and criterion 8's review run after both chains merge. Mark the join in the plan's chain map.

### M4. The "tone kept" half of the goal has no criterion that can fail

**Location:** spec:18-19 (goal), criteria 1-9.

Every criterion tests the guide half (structure, gates, `source: guide`) or bookkeeping. Nothing
fails if the guide-first lens flattens R5 or a chain page into Google's conversational default,
which is the regression the owner named ("keep the register"). Criterion 8 grades only the
register document, and the voice-delta sections R1 adds (spec:84-86) have no criterion.

**Fold:** add a criterion: the register editor's read of the rebuilt `choose-an-ai-posture.md`
carries no blocking voice-delta finding (measured, qualified claims whole, imperatives only in
steps), and extend criterion 1 to "each Voice section quotes its guide's tone rules and lists
each delta with the guide rule it changes." Whether Geoff also reads R5 is OWNER FORK F1.

### M5. Ruling 2's invariant is untested, and criterion 8 can pass vacuously

**Location:** spec:44-47 (ruling 2), criteria 1 and 8.

Ruling 2 is the core of "the guide is not sacrificed": no register rule overrides a guide rule
without a row. Criterion 1 checks only that the self-serve clause is gone. Criterion 8 asks the
register editor, whose definition W3 rewrites to defer to the register, to grade the register;
the editor's track contract does not cover `docs/internal/`, and a lenient read returns "no
blocking finding" by default.

**Fold:** give criterion 8 a positive control and the invariant. Run the same editor prompt on
the pre-rewrite register first and require blocking findings at the audit 4f passages; then the
rewritten register returns none. In the same prompt, a register rule that loosens a guide rule
without a Recorded-exceptions row is a blocking `source: guide` finding.

### M6. Warning-level rules on the trigger page are never gated

**Location:** spec:107-113, R5 (spec:128-131), criterion 6.

R5's own failure mode is a prose procedure, and `Cairn.ProseProcedure` sits at warning, as does
`Cairn.CodeFont`. The docs gate runs `--minAlertLevel=error`, so criterion 6 passes with the
original prose procedure still in the page. "Passes R2 and R3 at error" (spec:130) has the same
hole.

**Fold:** criterion 6 adds "and raises zero `Cairn.ProseProcedure` and `Cairn.CodeFont`
findings" (a `--minAlertLevel=warning` run filtered to those ids, or the harness from M2 run on
the page).

## Minor gaps

1. **`source` is optional but criterion 4 requires it** (spec:147-148 vs 184-185). The chain's
   `FINDING` schema (`docs-page-chain.js:115-123`) requires `location`, `finding`, `blocking`. An
   optional field lets criterion 4 pass on a run with one tagged finding. Make `source` required
   in the schema, and have the runner force `blocking: true` on `source: guide`, so "a guide
   violation is blocking" is code, not prompt.
2. **The list-item capitalization rule has no level, name, or scope** (spec:114), so its
   must-fire state is undefined. Name it and set its level; the audit gives the regex (S4,
   `list` scope, `^[a-z]`). Its must-not-fire set needs a list item that opens with a code span
   or a lowercase product name (cairn, `create-cairn-site`), which the Names rule requires.
3. **`Cairn.HeadingForm` bundles a path-dependent check.** The question check must be off under
   `docs/editors/**` while the -ing and teaser checks stay on. Vale disables rules, not branches
   of a rule, per section, so the question check is a separate rule id. State the split in R2.
4. **`Cairn.ProseProcedure`'s must-not-fire set is unstated.** It needs at minimum a numbered
   list of imperatives (the conforming form) and a concept paragraph using "then" as an adverb.
   Record the tree-wide finding count at landing, since "promotion on measured noise"
   (spec:110-111) needs a baseline. Its must-fire fixtures must be verbatim copies of the two
   passages, because R5 deletes the `choose-an-ai-posture.md` one; criterion 3 then stays
   checkable after R5. The `rotate-the-github-app-key.md:99-102` imperatives are clause-initial
   after a conditional ("If step 4 doesn't ..., check"), not sentence-initial, so only the
   connector arm catches that passage; say so, so the fixture is not satisfied by overfitting.
5. **S8 (links in headings) is dropped silently.** The audit lists it as writable (audit:115).
   It is absent from R2 and from Out of scope (spec:206-212). See OWNER FORK F2.
6. **"Floor becomes base throughout" (spec:79) would rename the front door's "Legibility
   floor"** (register:438), a different sense. Scope the rename to the style-guide sense.
7. **The digest's quote verification (spec:145-146) has no criterion.** The guide half rests on
   the digest being the guide's actual words. Add to criterion 4: each digest rule carries its
   guide URL, and the task report lists each quote as fetched and matched.
8. **Tasks with no checkable outcome in the spec:** R4 (see B1), R6, W2, W4's `SKILL.md` line
   and its `editor.md` reader-list change. The plan can carry these, but the spec's criteria
   list reads as complete. Add one line each (for example, R6: both voice passages name
   Microsoft and no longer contain "slightly academic"; W2: the digest section sits above the
   five rules). Also: the chain's `valeErrorRules` argument (`docs-page-chain.js:33`) must gain
   the new error-tier rules, or the drafter is never told about them.
9. **W1's test home is unnamed.** `~/.dotfiles/tests/docs-page-chain-derivation.test.mjs`
   already extracts pure functions from the runner and runs in `scripts/check.sh`. Name it as
   the home for the track-to-guide derivation (every track value: editors gives Microsoft; admin,
   extend, reference, and the front door give Google) and a static guard that the preamble names
   the guide before the register. Then criterion 4 is a test, not a read.

**Informational.** The concurrent-executor risk (spec:230-231) has cleared: `140e8208`, "close
draft docs pass 0+1," is on `draft-docs-0`, and `docs-register.md` is unchanged since the pinned
`b8bfd30f`. Re-pin the plan to `140e8208`.

## Over-ceremony, by cost

1. **R2 and R3 would run the full browser gate per task (highest cost).** `gate-tier.mjs`
   `classifyPath` recognizes neither `.vale/**`, `.vale.ini`, a markdownlint config, nor
   `package.json` and `package-lock.json`, and an unclassified path defaults to `full`, which
   includes both showcase e2e suites. That is not needed to prove Vale YAML or a lint script.
   **Fold:** pin these tasks with `--pin scripts` (docs gate plus `npm test`) plus the fixture
   harness. The class stays `engine-logic` for its test-first mandate; the tier is the cost.
2. **The `docs` class's "register chain" review on agent-facing files.** R6, W2, W3, and W4 are
   agent definitions and internal design docs, not published pages. Running the register chain
   over each costs a chain run per file for no reader benefit. **Fold:** those four take
   `diff-reviewer` against their stated outcomes, plus one `register-check` over R1 (criterion
   8 already covers it).
3. **R2 is one task carrying six rules, two promotions, and a harness.** This is sizing, not
   ceremony, but it is the task most likely to split mid-flight. **Fold:** split it now into R2a
   (harness plus the heading rules) and R2b (ProseProcedure, LinkText, CodeFont, list
   capitalization), keeping the pass near ten tasks by folding R4 into R2a, since R4 is config.

## Pass class

The assignment is right in kind. R2 and R3 are behavior with must-fire and must-not-fire states,
so a test-first mandate fits; W1 has a real test home (minor 9). Two corrections: pin R2 and R3's
gate tier (over-ceremony 1), and read the `docs` class's review bar as `diff-reviewer` for
agent-facing files (over-ceremony 2). The mixed pass's close runs the union, per pass-core,
which the spec's "Close" line (spec:204) matches.

## Owner forks

**F1. Is tone gated by Geoff's read, or by the agent read alone?**
- (a) The register editor's voice-delta read of R5 only (zero attended time; an agent grades
  its own register).
- (b) (a) plus one Geoff read of R5 before and after (one short sitting).
- *Recommendation: (b).* Tone is taste, the goal is Geoff's, and R5 is the one page this pass
  rebuilds.

**F2. Does S8 (no link in a heading) join R2?**
- (a) Add it: one `raw`-scope existence rule at error with a two-line fixture pair.
- (b) Leave it to the guide lens and list it in Out of scope.
- *Recommendation: (a).* It costs one rule, it is a Google structural rule, and the goal is not
  to sacrifice the guide where a gate is cheap.
