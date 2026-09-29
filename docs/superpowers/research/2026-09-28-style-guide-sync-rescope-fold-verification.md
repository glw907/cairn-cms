# Style-guide sync re-scope: fold verification

Date: 2026-09-28. Verifier with no part in the reviews or the fold. Targets at `bf4f5d89`
(pre-fold `e0d5f954`): the spec and plan named in the fold record, read in full with the fold
record, all four reviews' majors, and both diffs `e0d5f954..bf4f5d89`.

**Verdict.** The fold is sound except for one ordering defect it introduced. Every blocker and
major from the four lenses closed at its cited location. Every mechanism I could probe works as
written. The fold adds no unsourced machinery, and no fork remains open for Geoff.

**Counts:** 0 blocker, 1 major, 4 minor.

## 1. Did each major close?

| Major | Fold's disposition | Where it closed | Verified |
|---|---|---|---|
| C-M1 (the ruling-16 grade passes by omission and runs late) | Decision 7 | spec 139-143, criterion 2 (275-278); plan R1t acceptance 121-124, review focus 1 | Yes. The runner hands the reviewer the plan's task section (`pass-execute-chains.js:369`), so the instruction reaches it. The `docs` class reviewer is `claude-opus-5-5` (`:182`). |
| C-M2, K-4 (W3r inverts ruling 2) | Decision 8 | spec 218-220; plan 170-171 | Yes. "Or permits one it forbids" matches the register's own test (`docs-register.md:797-800`), so the fold invented nothing. |
| C-M3 (warnings invisible to the gate) | Folded | spec 163-166, R5 177, criterion 6; plan J1 237-238, W1r 150-151 | Yes |
| C-M4, X-M2 (dead sections and headings after the revert) | Folded | spec 197-220; plan W1r to W3r, review focus 3 | Yes, except for the ordering defect in finding M1 below |
| C-M5 (seed rows, Evidence column) | Folded | criterion 1 (270-274); plan R1t 118-119 | Yes. The four rows match `docs-register.md:821-824`. |
| X-M1, K-1, L-M1 (`vale test`) | Decision 1 | spec Sources 90-94, R2 161-167, criterion 3; plan R2 | Yes. Probed below. |
| X-M3 (heading-rule tokens) | Decision 2 | spec 150-153; plan 132 | Yes |
| X-M4 (J2 cannot launch) | Folded, option (b) | plan J2 242-250; spec W1r 203-204 | Yes. Args checked against the workflow below. |
| K-2, L-M3 (byte-identical versus the trim) | Folded | spec 132-135, criterion 2 | Yes |
| K-3 (word cap) | Decision 4 | spec 117-123 | Yes |
| K-5 (Microsoft Learn license) | Decision 9 | spec 103-105, 186-191; plan R9 | Yes |
| L-M2 (markdownlint) | Decision 3 | spec R3 169-171, close step 3 | Yes |
| L-M4 (J2's zero bar) | Decision 10 | criterion 7 | Yes |
| L-M5 (J4 folded into R1t's read) | Decision 7 | as for C-M1 | Yes |
| L-M6 (replace J5 with a grep) | Refused, decision 5 | unchanged | The refusal is recorded. The record gives no reason beyond "stays as a read", which is the conductor's call to make. |

## 2. Contradictions and build order

### M1. Major: W1r's heading check races R1t across the parallel chains

- **Location:** plan 155-156 (W1r acceptance), with plan 95 and 141 (chain order); spec 197-201.
- **Defect:** W1r's acceptance requires that "each named heading exists verbatim in the register
  at `style-guide-sync`'s HEAD." One of those headings, `## Deviations from the base guides`,
  exists only after R1t. In segment A, W1r is chain W's first task, and R1t is chain R's second,
  after R9. The runner runs the two chains in parallel (`pass-execute-chains.js:2`), so W1r's
  implementer and `diff-reviewer` will usually check against a register that still carries
  `## The tightening test` and the two `## Recorded exceptions` sections (`docs-register.md:794,
  814, 827`). The check then fails, or passes only by timing. Nothing in the spec fixes the brief
  headings through the trim either. The fold introduced this line: at `e0d5f954`, W1r had no
  heading check.
- **Related gap:** the fold record says W1r "names every section by exact heading." The spec
  still says only "the track's own section," while the real headings are `### The editor track
  (`docs/editors/`)`, `### The admin track (...)`, `### The extend track (...)`, `## The reference
  (...)`, and `## The front door (...)`, which the `readme` and `front-door` tracks share. The
  verbatim check would catch a wrong heading, which is why this belongs here and not as a
  separate finding.
- **Proposed fold (no new machinery):** move the check to where the register is written.
  1. R1t's acceptance: every heading the spec's W1r names exists verbatim in the trimmed register.
  2. W1r's acceptance: its prompts use the spec's list, and the task makes no claim about the
     register's HEAD.
  3. Segment B boundary step 1: one grep confirms that each heading `docs-page-chain.js` names
     exists in the register at `style-guide-sync`'s HEAD, before J2 runs the workflow.

  Optionally, the spec names the five track-section headings.

### Minor

- **m1.** Plan 116 (R1t): "every verbatim guide quotation goes" has no scope. Criterion 1 and
  spec 121 scope that rule to the briefs. The deviation rows quote Google in their base-rule
  column (`docs-register.md:821-824`), and the Names table's Google text must stay byte-identical
  (plan 119-120). An implementer who reads plan 116 literally could strip the row quotations.
  **Fold:** add "in the briefs."
- **m2.** Plan 123: the R1t report still asks for `wc -w` per brief, a leftover of the word cap
  that decision 4 dropped. It does no harm. **Fold:** cut it, or keep it as information only.
- **m3.** Plan 238 (J1): "the register editor's voice verdict on the diff is in the report." J1
  runs `cairn-implementer`, which has no Agent tool, so it cannot get that verdict. This predates
  the fold. **Fold:** the conductor dispatches one `cairn-register-editor` read of J1's diff.
- **m4.** Spec 70 (ruling 16) still reads "the "Killed:" specimen" in the singular, while R1t
  (133-134) and criterion 2 say "every." Since R1t and the criterion govern, the ruling's
  singular is optional to fix.

Beyond these, I found no contradiction:

- The spec's criterion numbering (1 to 8) matches every plan acceptance reference.
- The Owner time line (plan 51) matches the join (spec 245-246) and ruling 14.
- J2 branches after J1 (plan 242), and a rejected J1 voids J2 (plan 253-254), as the spec says at
  250-252.
- J2 runs the workflow by name only after the segment B boundary merges chain W into dotfiles
  `main`, so it picks up W1r's version.
- Close step 4's "no facts bullet" does not conflict with J2's fact cherry-pick, since a
  container fix is not a public behavior change.

## 3. Mechanisms: quoted or proven

- **`vale test`** (Vale 3.23.0, local): `vale test --help` prints "Run the test cases kept beside
  a configuration's rules. Usage: vale test [path...]". I ran it in the scratchpad on a copy of
  `.vale/`, with a merged `Headings.yml` (`-ing` and `?` tokens) and a `Headings.test.yml`
  holding one `contains` case and one `absent` case:
  - With the plan's exact form, `vale --config=.vale/tests/vale.ini test
    .vale/styles/Cairn/Headings.test.yml`, and a fixture of `StylesPath = ../styles`, `[*]`, and
    `BasedOnStyles = Cairn`, it printed `SUCCESS 1 file — 2 passed` and exited 0. The directory
    form behaved the same.
  - Under the repo config, the fail case raised no alert and the run exited 1, which confirms
    that the fixture config is needed.
  - With the fail case edited clean, the run exited 1, as R2's acceptance expects.
  - Plain `vale` over a heading page showed the rule's `warning`, so the test file beside the
    rule does not disturb normal linting.
- **The warning-visibility claim:** `.vale.ini:2` sets `MinAlertLevel = suggestion`, so plain
  `vale <path>` shows warnings.
- **J2's args against `docs-page-chain.js`** (dotfiles `main` at `c9fdfd5`):
  - `worktree`, `gate`, and `pages` are required (`:151`).
  - `gateLane: "light"` is read at `:139`.
  - `{page}` and `{brief}` are substituted at `:191`.
  - `job`, `track`, `inputs`, and `exemplarSources` are per-page fields (`:214, 235, 239`),
    which matches the plan's "one page ... with" phrasing. The page also needs `path` and `id`,
    which "one page, `docs/extend/enable-tidy.md`" implies.
  - The two-and-trim step (`:232-242`) and the draft prompt's `exemplarExcerpts` are what W1r
    removes, and both are inside W1r's Files.
- **R2's narrowed gate:** `src/tests/unit/docs-gate.test.ts` exists, and the vitest `unit`
  project includes `src/tests/unit/**/*.test.ts`. `resolveGate` honors `t.gate` when `gateTier`
  is set, and `gateLane` is read per task.
- **Nothing consumes the `q:` and `x:` markers.** `check:provenance` validates page briefs
  against facts, not register markers (`check-provenance.mjs:1-30`), so removing the markers
  breaks no gate.
- **The fold's own quoted facts:** the infra audit routes DC-28 and AW-24 to W4 (audit lines 123
  and 243-245). The drafter's "trimmed", "role", and "dispatch extracted" lines sit at
  `cairn-docs-drafter.md:10, 17-18, 28`. Both claims check out.

## 4. Machinery added without a source

None. Each addition answers a measured defect, carries a source, or both:

| Addition | Measured defect or source |
|---|---|
| The fixture config | Vale's own test mechanics, probed above |
| The `docs-links.mjs` skip set | The mechanics probe's exit 1 on a capture |
| The structure checklist | The checklist-critique sources, and K-3's measurement that the cap would strip the rules |
| The facts cherry-pick | Answers K-10 |
| The J2 reopen bound | Answers L-m4 |

The fold also removed three mechanisms.

## 5. Open forks

None, which confirms the fold record. X-M3's and L-M2's forks were settled by decisions 2 and 3.
The two leanness-record errata are corrections owed to a ratified record, not questions for
Geoff. The spec's ruling 16 already reads "which the stock Vale packages and the guide itself
already carry," so the changed boundary the errata name is already consistent with the governing
text. M1 above is a mechanical ordering fix and needs no product ruling.
