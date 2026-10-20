# Style-guide sync plan review: contract and criteria lens

**Reviewer:** one adversarial reader, contract-and-criteria lens, `claude-opus-5-5` at `high`.
**Target:** `docs/superpowers/plans/2026-09-28-style-guide-sync.md` at `44e20e61`, against the spec
`docs/superpowers/specs/2026-09-28-style-guide-sync-design.md` (criteria 1-13, rulings 1-11) and
the `pass-core` class table.
**Counts:** 1 blocker, 7 major, 8 minor. One owner fork (finding M5).

## Coverage map (spec criterion to plan task)

Every criterion maps to a task: 1 R1; 2 R1 plus J4; 3 R2a, R2b, R3; 4 R2b; 5 R2a; 6 W1; 7 J2; 8
J4; 9 J1 plus close step 5; 10 W4; 11 R7; 12 R6, W2, W3, W5, R9, R2a; 13 W6 plus close. The
outcome-only rule holds: the plan carries no implementation code. The gaps below are about whether
an acceptance can fail, and about the fixture state each proof needs.

Items the spec left "open for the plan" that the plan leaves open: the exact R7 marker form
(delegated to R1, acceptable given the sequential order, see M3), and `debug-your-site.md:36`
(not mentioned; see m8).

## Blocker

### B1. R8 and W6 cannot pass "clean on the tree" as scoped: known hits exist today

- **Where:** plan:157-161 (R8), plan:179-183 (W6), plan:205-210 (J5).
- **Defect:** the seed list already hits files inside each check's scope, and neither task may fix
  them.
  - Repo: `CLAUDE.md:309` carries "On top of the Google floor". R8 scopes `CLAUDE.md`, and its
    acceptance says "passes on the tree; any current hit is reported, not fixed (J5 fixes)".
    Those two clauses contradict each other. Chain R goes red from R8 through J5, and the Segment
    B boundary requires "chain R is green" (plan:185-186).
  - Dotfiles: `claude/.claude/docs/record/2026-09-19-docs-infra-audit.md` carries "a floor is
    not a ceiling". The spec excludes dated records (spec:340-341). W6's plan scope (`docs/`) does
    not exclude them, so W6 fails on the tree.
  - The other current hits (`docs-register.md`, `admin-design-system.md`,
    `cairn-register-editor.md`, `writing-voice/SKILL.md`) are removed by R1, R6, W3, and W4 ahead
    of R8 and W6 only if the chain order holds. The plan lists R6 before R8, but does not state
    the order within Segment B's chain R.
- **Fold:**
  - R8 lands the one-line `CLAUDE.md` erratum itself. J5 keeps only the erratum's "name the
    drafting briefs" wording, if J5's reader still wants it.
  - W6's scope excludes `docs/record/` and dated files, mirroring R8.
  - State the chain-R order in Segment B as R6 before R8.
  - Each check fails, never passes, on a missing or empty phrase list, with a fixture for each
    case. Without that, an empty list makes the tripwire vacuous.
  - Two seed entries are descriptions, not phrases: "the 25-40-word baseline" and "'admin
    walkthroughs' routed to Microsoft". Each needs the literal pattern the check keys on.

## Major

### M1. The brief extraction can "succeed" with a paraphrase or an empty string; the W1 tests can pass as source greps

- **Where:** plan:126-132 (W1), plan:58-59 (Review focus 2), spec:286-301.
- **Defect:** the page-inputs agent (an LLM) extracts the brief and returns it in its schema. "A
  missing heading fails the step" is then the agent's own compliance, not a runner check. An agent
  can also summarize the brief instead of copying it, which silently reintroduces the drift R7
  exists to prevent. Today's test file extracts only marker-delimited pure blocks
  (`tests/docs-page-chain-derivation.test.mjs:18-19`). The prompts are built inline, for example
  the `common` template at `docs-page-chain.js:154`. So "the rendered drafter prompt contains the
  brief and no exceptions table" can only be tested once prompt rendering becomes a
  marker-extractable pure function. Without that, the test degrades to a grep of the source, which
  passes vacuously.
- **Fold:** state these as W1 outcomes.
  - The runner validates the returned brief: it starts with the exact heading, meets a non-trivial
    minimum length, and carries at least one provenance marker. Any failure fails the step.
  - Prompt rendering, `source` coercion, and brief validation live in marker-delimited pure
    functions that the test executes.
  - Name the fixture states the test must cover: brief present; heading absent; returned text
    empty; `source` missing; `source` holding an unknown value; `source: guide` with
    `blocking: false`.
  - Pick the coercion for a missing or unknown `source`. The recommendation is to treat it as
    `guide`, which fails safe.

### M2. The provenance and exceptions headings are a cross-chain contract the plan leaves unnamed

- **Where:** plan:87-94 (R1), plan:128-129 (W1).
- **Defect:** R1 and W1 run in parallel chains. The plan fixes the two brief headings exactly, but
  W1 also extracts the "provenance and exceptions sections by exact heading", and R1 is told only
  that they "sit in their own sections". A mismatch shows up first at J2, during the join, where it
  costs a cross-repo fix round. Nothing runs W1's extraction against the real landed register
  before J2.
- **Fold:** fix the exact headings in the plan (for example, `## Provenance`,
  `## Recorded exceptions: Google`, `## Recorded exceptions: Microsoft`). Add a Segment B boundary
  step that runs the extraction against the landed register and asserts that all five sections
  come back non-empty.

### M3. R7's exception-row check has no marker contract, and the dormant README row may have no brief passage

- **Where:** plan:87-94 (R1 constraints), plan:150-152 (R7), spec:247-253, spec:146-148.
- **Defect:** R7 fails when "an exception row names no brief passage". R1's constraints give
  markers to guide quotes only, never to exception rows or voice passages. The seed rows include
  the README exclamation-headings sanction, which is dormant. The developer brief plausibly says
  nothing about it, so either criterion 11's "passes on the landed register" fails, or R7 quietly
  exempts rows and the check weakens. R7 also misses the drift that matters most for the owner's
  goal: a brief that drops a guide rule. A provenance entry whose id has no marker left in the
  brief passes all three stated failure states.
- **Fold:**
  - R1 gives every exception row a brief-passage id. The dormant README row either names its
    passage or carries an explicit dormant flag that R7 recognizes.
  - R7 adds a fourth failure: an orphan provenance entry, meaning a quote removed from the brief.
  - R7 reports every failure in one run, not only the first.
  - Name the fixtures: edited quote, unrecorded quote, row with no passage, orphan provenance
    entry, missing brief heading, malformed or duplicate marker.

### M4. The promoted-rule list can fail open: a renamed page, a mistyped rule, or an unreadable file each silently drops enforcement

- **Where:** plan:102-114 (R2a), spec:204-213.
- **Defect:** the ratchet is the tree-mode pass over `promoted-docs.json` pages, filtered to its
  rules. Three states each pass vacuously:
  - A page renamed in a stage rebuild drops out of the ratchet.
  - A rule id that does not exist makes `--filter` match nothing.
  - A missing or malformed JSON file lets the pass skip.

  The plan also never says which rules R2a promotes. Criterion 7(b) requires the gate to fail on
  `Cairn.HeadingIng`, which it can do only if HeadingIng is promoted, since every new rule ships at
  `warning`. Criterion 5's harness case needs a fixture promoted list; the real list has no pages
  until J1.
- **Fold:**
  - State R2a's promoted rules explicitly. The recommendation is the three heading rules plus the
    two vendored Headings rules once vocab is clear.
  - The gate fails on a missing or malformed list, a listed page that does not exist, and a listed
    rule id not defined in the loaded styles. Each case gets a harness fixture.
  - Criterion 5's case runs against a fixture promoted list and page, never the live list.

### M5. OWNER FORK: Geoff's tone read sits after R1b copies its specimen from R5's page

- **Where:** plan:37-38, plan:190-198 (J1, J3), plan:220 (close step 5).
- **Defect:** ruling 7 places Geoff's read on the R5 diff. The plan runs it as close step 5, after:
  - J3 copies R5's accepted page into the register as the ratified structure-plus-voice specimen;
  - J2(c) proves against that page;
  - J4 reviews the register that contains it;
  - the ledgers are written.

  A tone rejection at the close therefore re-opens J1, J2(c), J3, J4, and the ledgers. The owner
  read is placed after everything that depends on it.
- **Options:**
  - (a) Geoff reads the R5 diff right after J1, before J3. The read can be async: J2 runs while it
    is pending, and J3 waits for it.
  - (b) Keep the read at the close and accept the re-open risk.
  - (c) J3 takes its specimen from a passage outside the restructured ranges, which are
    byte-identical to the already-approved page, so the specimen does not depend on the read.
- **Recommendation:** (a). It spends the same one read, and it gates the only task that depends on
  it.

### M6. J2's proof can be vacuous: "the chain's rendered prompt" has no rendering mechanism, and the read-only agent must plant a page

- **Where:** plan:194-195 (J2), spec:386-390.
- **Defect:** a read-only Opus agent cannot run the workflow. Workflows outside a named mode need
  Geoff's opt-in. If the agent composes the register-editor prompt itself, (a) and (c) prove the
  agent's prompt, not the chain's. Part (b) needs a planted page inside the Google-arm globs, since
  HeadingIng is path-dependent. That is a write, and J2 is read-only. "Stop on any failure" gives
  no path to tell a one-off LLM variance from a real defect.
- **Fold:**
  - J2 renders the register-editor prompt through M1's pure render function, using a script
    against the landed register. It then dispatches `cairn-register-editor` with that exact text.
  - Name the planted fixture: a scratch page under `docs/extend/`, removed afterwards, or R2a's
    existing harness fixture reused for (b).
  - On a failure, re-run once. A repeat failure folds through W3.

### M7. The positive controls and the "restructured passages" are unnamed, so criteria 8 and 9 can pass by construction

- **Where:** plan:190-192 (J1), plan:200-203 (J4), spec:391-399.
- **Defect:** criterion 9's byte-identical proof exempts "the restructured passages". If the
  implementer names those passages after editing, every change it made is exempt by definition,
  and G3's one protection is gone. Criterion 8's positive control needs two fixtures, and neither
  is pinned:
  - a pre-rewrite register at a fixed commit;
  - a planted unrecorded loosening in the new register.
- **Fold:**
  - Pin the restructured ranges now, against `8bbe78f5`:
    - the bold precondition at lines 6-9;
    - `## Verify the served file` at 78-96;
    - `## Resolve a posture warning` at 97-108.

    Headings already take bare infinitives, so no heading changes.
  - Pin the positive control's pre-rewrite register at `feca3348`.
  - Name the planted loosening: one register rule that forbids a Google-prescribed form and has no
    row.
  - J4's fold re-runs `check:register-briefs` and the docs gate before the re-read.

## Minor

- **m1. The quote-fetch acceptance is self-reported** (plan:97, spec:370-372). "The report lists
  each quote as fetched and matched" can be satisfied by assertion alone. Fold: R1's
  `diff-reviewer` (Opus) re-fetches every quoted URL and matches the text. The cost is small, and
  the owner's "never sacrifice the base guides" rests on these quotes.
- **m2. A second Vale pin is missed** (plan:106). `.github/workflows/tool.yml:46` sets
  `VALE_VERSION: '3.15.1'`. The spec's "one version" holds only if R2a bumps it too, or records
  why the Go tool's pin differs. The workstation already runs 3.23.0, so Review focus 5's "run the
  existing gate under 3.23.0 first" proves nothing locally. The real proof is CI green on the pin
  commit; make that the acceptance.
- **m3. The harness does not self-check coverage** (criterion 3). The harness should enumerate
  every Cairn rule and custom markdownlint rule, and fail when one lacks a must-fire and
  must-not-fire pair. That way criterion 3 is enforced, not reviewed.
- **m4. The structure-only config R9 runs against has no owning task** (plan:163-167,
  spec:362-365). Name the file in R2a's or R9's Files list. Say that the Microsoft Learn capture
  runs without the Google-arm-only rules.
- **m5. W4's acceptance checks only exemplars** (plan:171-174). The routing change (the cairn-docs
  route reads the track's brief) and the editor-copy qualifier have no check before J5. "States
  whether evals re-ran" passes on "no". Fold: add both routing clauses to W4's acceptance. Re-run
  `writing-voice/evals` if the suite exists, since W4 changes files every repo loads.
- **m6. Close step 2 omits `claude-tooling-sync verify` after J5's dotfiles edits** (plan:215).
  Criterion 13 is last proven at W6, before J5 changes dotfiles again.
- **m7. The register itself sits in R8's scope** (plan:159-160). If R1's rationale quotes a
  retired phrase ("the 'a floor is not a ceiling' clause goes"), R8 fires. Fold: R1 constraint
  "no seed phrase in the register", or a `Killed:`-tag exemption with a fixture.
- **m8. The spec's open item on `debug-your-site.md:36` is unaddressed.** One line recording it as
  deferred to that page's promotion is enough.

## Over-ceremony, ranked by cost

1. **Fixture pairs for stock and vendored rules** (criterion 3 read literally). R3's nine stock
   markdownlint rules and the two vendored Headings rules each need a must-fire and must-not-fire
   pair. That is about 22 fixtures that test vendor code. Proposal: one wiring fixture per config
   proves the stock set loads, with full pairs for the Cairn rules and the two custom markdownlint
   rules. This amends criterion 3's wording, which is the conductor's method call. It is not a
   fork.
2. **P2's hooks probe** (plan:76-78). "No task depends on it." It is cheap on `haiku`, but it
   produces a record nobody reads. Either tie it to a decision, since the drafter's `vale-hook`
   feedback affects W1's `valeErrorRules` framing, or drop it and log the question as open.
3. **"Plus the fixture harness"** (plan:22). The harness already runs inside `check:docs-gate`,
   which `--pin scripts` includes (`gate-tier.mjs:59`). The phrase is redundant, costs nothing to
   execute, and may confuse the implementer's gate string. Delete it.

Pass classes otherwise fit the risk. The engine-logic tasks take fixture-first work and the
scripts gate. The agent-facing docs take `diff-reviewer`. W3's behavioral effect is proven at J2
and J4 by the positive controls, once M6 and M7 are folded.
