# Style-guide sync spec: fold record

Fold of the four-lens review into `docs/superpowers/specs/2026-09-28-style-guide-sync-design.md`
(branch `style-guide-sync`, reviews at `36f50347`). One disposition per finding; duplicates across
lenses fold once and list every id.

Lens prefixes: **G** goal fidelity (`-review-goal.md`, findings 1-13), **K** contract and criteria
(`-review-contract.md`: B1, M1-M6, m1-m9, OC1-OC3, F1-F2, informational), **X** mechanics
(`-review-mechanics.md`: probes, B1, M1-M5, m1-m8, OC1), **C** consistency
(`-review-consistency.md`: M1-M8, m1-m8).

Yardstick: Geoff's goal, "keep the register and not sacrafice the best practices of the
established standard."

## Verification done before folding

- `git show draft-docs-0` / `origin/draft-docs-0`: both at `bd935c9d`; PR #91 open at that head,
  mergeable, waiting on Geoff's word (`draft-docs-0` STATUS). The register and
  `choose-an-ai-posture.md` are unchanged in committed state from `b8bfd30f` to `bd935c9d`.
- The `draft-docs-0` session is **still active**, contrary to K-informational: its worktree holds
  uncommitted edits to `choose-an-ai-posture.md`, its brief, STATUS, HISTORY, ROADMAP, and the pass
  0+1 plan, and `pgrep` shows its `check:docs-gate` running. Not read (global rule: never read a
  file another agent is editing).
- Google tone page fetched live: "casual, natural, and approachable", "a conversational tone
  rather than a formal one", "Avoid figurative language, which includes metaphors".
- Register lines verified on `draft-docs-0`: metaphor allowance (:49-51), voice scope and "not
  graded against general written norms" and "plainer Microsoft floor inside this voice" (:65-78),
  "Dry contract prose" (:390), "Legibility floor" (:438), reviewer section profile-first
  (:512-517), keystone capper (:40-42).
- `b8bfd30f` scoped the `f:1ij5h5` step to older scaffolds; the step was kept.
- `cairn-register-editor.md` Noir, Consumer-help, genre-exemplar, and shortform lines present as
  cited; `cairn-implementer.md:74` says "Write in a plain voice"; `writing-voice/SKILL.md` routes
  "admin walkthroughs" to Microsoft.
- The exemplar corpus has no Google Cloud or Microsoft Learn capture (three consumer-help pages
  only).
- `docs-page-chain.js`: `FINDING` requires only `location`, `finding`, `blocking`; `common` is a
  module constant; the runtime has no filesystem access (comment at :352).
- `gate-tier.mjs` defaults an unclassified path to `full`; CI installs Vale at `test.yml:94`, after
  `npm test` at :48; `.vale.ini` arbiter note makes CI's pin govern.

## Dispositions

### Folded

| Ids | Finding | Where in the revision |
|---|---|---|
| G1, C-M1 | "Measured, not casual" negates Google's tone page; no tightening test; imperatives delta bans "see" cross-references and notices; "not graded against general written norms" survives | Ruling 2 (the test, unrecorded loosening is blocking); ruling 3 (tone is an override with a row; imperatives delta exempts cross-references and notices); R1 seed rows and clause removal; W3 (missing delta is a finding). C-M1's fork was not raised: Geoff's intent to keep the academic tone is recorded, and a row is the architectural form his ruling 2 requires |
| G2 | Voice's positive definition and feedforward not preserved | R1 Google Voice section carries identity, four traits, comparison set, ratified-good specimen, plus a structure-plus-voice specimen from R5; W1 one-sentence voice model |
| G3 | Register editor grades editors against non-Microsoft tells | W3 editors-arm scoping (Noir, micro-instructed actions, Consumer-help, shortform, genre exemplar); ruling 4 annotation |
| G4 | Reviewer section still profile-first, and register outranks editor | R1 "For reviewers" bullet |
| G5 | The one loosening has no fence | Ruling 3 fence (step or list item over 26 words is a blocking guide finding); digest in R1; Out of scope S14 line scoped. The optional `Cairn.StepLength` Vale rule is not added: a warning-level rule gates nothing, and the blocking guide finding is the fence |
| G6, X-M3 | No Google Cloud or Microsoft Learn exemplar in the corpus; external exemplars pass the pre-check vacuously | Exemplars section: capture three pages; structure-only config on a scratch copy. X-M3's fork is not raised: option (a) is the only one consistent with the spec's premise, and it is cheap |
| G7, X-m8 | Writers outside the chain (implementer) get no lens; reference arm has no level; no ratchet | W5; R2a rollout (promoted pages ratchet, reference and README on the per-page ratchet). G7's changed-files error scope is replaced by the ratchet: gating every touched frozen page at error would force unrelated sweeps into each reference-maintenance pass |
| G8, K-M4 | No criterion protects tone; R5 through the chain can redraft the approved page | G3 goal; R5 scoped edit with byte-identical sentences outside the passages; criterion 9 voice verdict. The "who confirms" half is owner ruling 1 |
| G9, K-m6 | Floor-era wording: "Dry contract prose"; rename would hit "Legibility floor" and the Vale procedure | R1 first bullet (rename scoped to the style-guide sense) and the "spare contract prose" bullet |
| G10 | Digest has three homes | R1 holds the one copy in the register header; W1 and W2 point at it |
| G11, X-M4, X-OC1 | Exemplar pre-check cannot run in the workflow runtime | Exemplars section: plan-time conductor step; Out of scope: in-chain pre-check deferred |
| G12, K-m5, K-F2 | S8 (links in headings) dropped; no accessibility line in the digest | R2b `Cairn.LinkInHeading` (promoted); digest adds no-links-in-headings and no directional-only references. K-F2 not raised as a fork: it is a cheap Google structural rule and the goal says not to sacrifice the guide |
| G13 | `technical-doc-web.md` coaches short sentences against the recorded delta | W4 line: a repo register's deltas outrank this file within the repo |
| K-B1, X-B1, C-M6 | R4's two-level rollout has no mechanism; Names analogy wrong; markdownlint has no warning tier | R2a rollout mechanism (warning in `.vale.ini`, filtered promoted-rule pass in `--page` mode and over promoted pages in tree mode, one list read by gate and chain); Names analogy dropped; R3 runs on `--page` and promoted pages only; criterion 5 |
| K-M1 | Proof run cannot plant a defect; no negative control | Criterion 7 restated at the stage level with a negative control |
| K-M2, C-m2, X-M2 | Fixture harness unnamed; CI vs workstation Vale drift; fixtures cannot run in `npm test` | R2a harness (explicit config, mirrored paths, CI after Vale install, docs gate); CI pin bumped to 3.23.0 via `dependency-upgrade`, a minor taken by default under the dependency policy, so not a fork; criterion 3 |
| K-M3 | Cross-chain runtime dependencies | Design intro: join after both chains; pass shape lists the join |
| K-M5 | Ruling 2 invariant untested; criterion 8 can pass vacuously | Criterion 8 positive control and unrecorded-loosening check |
| K-M6 | Warning-level rules on the trigger page never gated | Criterion 9: zero `ProseProcedure` and `CodeFont` findings |
| K-m1, X-m5 | `source` optional; "guide is blocking" is prompt-only; `common` is a constant; non-arm track default | W1: `source` required, runner forces blocking, `common` a function, non-arm defaults to Google |
| K-m2, X-m3 | List-capitalization rule unnamed; needs `cairn` and code-span exceptions and a nested fixture | R2b `Cairn.ListItemCase` |
| K-m3, X-M5 | `Cairn.HeadingForm` bundles path-dependent checks; question heading undefined; -ing scope on editors | R2a: three rule ids with scopes. X-M5's fork is not raised: the register already kills wh-clause headings on Geoff's 2026-09-28 specimens ("What each posture emits"), so the rule catches wh-openers; ruling 4 already puts editors on Microsoft unmodified, so the -ing ban stays off editors |
| K-m4, X-m1 | `ProseProcedure` wording misses the triggers; overfit; no must-not-fire set; no baseline | R2b clause-boundary definition, verbatim and held-out fixtures, must-not-fire set, recorded baseline; criterion 4 |
| K-m7 | Digest quote verification has no criterion | Criterion 1 |
| K-m8 | Tasks with no checkable outcome; `valeErrorRules` | Criterion 11; W1 `valeErrorRules` bullet |
| K-m9 | W1's test home unnamed | W1 tests bullet; criterion 6 |
| K-OC1 | R2 and R3 would run the full browser gate | R2a gate-tier bullet; pass shape |
| K-OC2 | Register chain on agent-facing files | Pass shape: `diff-reviewer` for R6 and W2-W5, `register-check` for R1 |
| K-OC3 | R2 too large for one task | Split into R2a (harness, pin, heading rules, rollout; absorbs R4) and R2b |
| X-probes | Vocab suppresses `Google.Headings`; `--filter` works in both pins | R2a Headings bullet; "Open for the plan" vocab item closed, the one surviving false positive kept as an open item |
| X-M1, C-M5 (fold half) | Branch trigger already fired but session still active; branch from `main` needs rebase; stale pass-B rationale | Pass shape branch preconditions; pass-B rationale dropped; Risks updated with the verified live edits on R5's page. The base choice is owner ruling 3 |
| X-m2 | One `Google.Headings` false positive survives vocab | Open for the plan item; R2a "vendored style files are never edited" |
| X-m4 | `docs-gate` unit test pins the step list; markdownlint must not gate tree-wide | R3 |
| X-m6, C-m3 | `writing-voice` routes admin walkthroughs to Microsoft; `editor.md` lists setup walkthroughs; evals | W4 |
| X-m7 | Guide lens reaches artifacts with no track | W3 last sentence |
| C-M3 | `f:1ij5h5` step removal is stale | R5: the `b8bfd30f` scoping stays |
| C-M4 | R5 skips "Edits after the chain" | R5 (brief, fact read, `--brief`); criterion 9 `check:provenance` |
| C-M7 | No promotion trigger for reference and README; HeadingForm collides with pinned anchors | R2a pinned-heading exemption and per-page ratchet for reference and README; open item on the source format |
| C-M8 | No meaning-preservation check on the register rewrite; ratified passages to handle | R1 voice-scope bullet and the rewrite bullet's keep-list (items 1-6); ruling 1 adds changelog and cairn.pub; criterion 2 meaning ledger |
| C-m1 | R3 also crosses APP's "No new check is built" | R3 supersession sentence; erratum owed (below) |
| C-m4 | Ruling 6 skips the charter's agent-facing row | Ruling 6 |
| C-m5 | Criterion 7 over-tightens Microsoft's same-place combine allowance | Criterion 10; W4 labeled same-place exemplar |
| C-m6 | Admin copy exceptions have no home; `:1236` pointer | Ruling 4 and R1 (Microsoft table serves admin copy); R6 |
| C-m7 | R5 should cite its freeze warrant | R5 first sentences |
| C-m8 (second half) | README exclamation seed row records a dormant sanction | R1 seed rows |

### Refused

| Ids | Finding | Reason |
|---|---|---|
| C-m8 (first half) | Audit's `.vale.ini` line citations are off by a few lines | The audit is a dated research record and the spec cites none of those line numbers; correcting it costs more than the drift risks |
| K-informational | "Concurrent-executor risk has cleared; re-pin to `140e8208`" | Superseded by verification: the session is still active, local and origin are now at `bd935c9d`, and it holds live edits on R5's page. The spec pins `bd935c9d` and keeps the risk |

Two refusals, both on cost or staleness. Partial refusals inside folded rows (G5's optional
`Cairn.StepLength`, G7's changed-files error scope) are noted in their rows.

### Owner forks

| Ids | Became |
|---|---|
| G8 (fork half), K-F1 | Owner ruling 1: Geoff reads R5's diff once for tone (recommend yes) |
| C-M2 | Owner ruling 2: adopt Google's metaphor ban (recommend yes) |
| C-M5 (fork half) | Owner ruling 3: PR #91 merges first and the pass branches off `main` (recommend yes) |

Candidates judged settled, not forks: the tone row (C-M1; Geoff's ruling and ruling 2 decide
it), exemplar capture (X-M3), S8 (K-F2), the question-heading scope and -ing on editors (X-M5),
and the CI Vale pin bump (X-M2; a minor under the dependency policy).

## Rulings section annotations

The fold edited the Rulings section's text without adding a ruling: ruling 2 gains the
tightening-versus-override test Geoff's intent implies; ruling 3 reclassifies "measured" as an
override with a row and scopes the imperatives delta; ruling 1 lists the changelog and cairn.pub
per the charter; ruling 4 applies ruling 2's test to the tell catalogue; ruling 6 cites the
charter row. Geoff reviews these with the owner rulings.

## Errata owed (ratified documents not edited here)

1. **`docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md`** (on `draft-docs-0`):
   line 17 "No new check is built" and the retirement row at line 88 (`check:headings`,
   markdownlint as a gate) are superseded for structural checks by R2 and R3. If owner ruling 3 is
   no, line 160's "merges to `main` before the next starts" also takes an erratum for this pass.
2. **`docs/internal/record/2026-08-15-docs-outlines-with-visuals.md:58`** records "They are a
   floor, not a ceiling ... where the two part company the standard yields" and points to the
   register for "the full rule". R1 deletes that rule (C1); the record's pointer now describes a
   rule that no longer exists. The erratum notes that deviation from a base guide now requires a
   recorded exception row by Geoff's ruling (2026-09-28).

## Second fold (2026-09-28)

Narrow fold of Geoff's owner answers, his new design ruling, and the fold verification
(`2026-09-28-style-guide-sync-fold-verification.md`: 2 major, 8 minor) into the spec. Branch
`style-guide-sync`, rebased onto `main` at `feca3348`; PR #91 merged as `8bbe78f5`. Nothing wider
was reopened.

### Verification done before folding

- `feca3348` is an ancestor of the branch head; the worktree was clean and no other process named
  it.
- `docs/STATUS.md` on this tree: draft docs pass 0+1 merged (`8bbe78f5`); "the stage 2a plan is
  next", and the style-guide sync "must land before stage 2a drafts its first page". Stage 2a has
  not started.
- `docs/extend/choose-an-ai-posture.md` last changed at `5aa40faa`, merged by `8bbe78f5`; its brief
  exists at `docs/internal/briefs/extend/choose-an-ai-posture.json`.
- The freeze rule as it now reads on `main`: CLAUDE.md "Documentation is a pass dimension" and
  `docs/internal/facts/README.md` "How this container grows" (quoted under R5 below).
- `~/.claude/workflows/docs-page-chain.js:352` still documents that the runtime has no filesystem
  access, so the brief and the promoted list must be passed in.
- `docs/internal/docs-register.md:49` holds the metaphor allowance ruling 8 removes.

### Dispositions

| Item | Disposition | Where in the spec |
|---|---|---|
| A, owner ruling 1 | Folded as ruling 7 (yes) | Rulings; criterion 9 |
| A, owner ruling 2 | Folded as ruling 8 (yes); the "if no" seed row is gone | Rulings; R1 metaphor bullet |
| A, owner ruling 3 | Folded as ruling 9 (resolved by events); stacking alternative, branch-wait preconditions, and the approach-spec erratum for line 160 removed | Rulings; Pass shape "Branch" |
| A, fold-edit confirmation (verification major 2) | Folded as ruling 10, naming each edited clause; a line above ruling 1 says the rulings text stands on Geoff's word | Rulings |
| A, "Owner rulings" section | Deleted | |
| B, named voice, flattened for the drafter | Folded as ruling 11. The Google-arm tone is "the cairn docs voice", defined positively. R1 replaces the header digest with two drafting briefs (developer docs, editor docs), each flat in one order (structural rules quoted, voice with specimen, tells). The layering (provenance table, exceptions tables, rationale) is reviewer-only. W1 hands the drafter only its brief plus conforming exemplars, extracted by heading by the page-inputs agent or the conductor (the runtime cannot read files), and hands the register editor the brief plus provenance and exceptions. W2 carries no digest of its own. New task R7, `check:register-briefs`, specifies outcome and failure states only. G1 and G2, the analogy, and criteria 1, 6, 11, 12 updated | Goals; Rulings 11; R1; R7; W1; W2; W3; W5; criteria |
| C, major 1 (build-order loop) | Folded. R1 lands without the specimen; R1b adds it at the join. Join order: R5, proof run (criterion 7), R1b, register review (criterion 8) | Design intro; R1; R1b; criterion 8; Pass shape |
| C, m1 (pinned-anchor exemption from memory) | Folded. `shipped-anchors.json` sourcing dropped; a pinned heading gets a static YAML exemption before its page is promoted, first needed at the admin stage; open item dropped | R2a; Open for the plan |
| C, m2 (chain cannot read the list) | Folded. The page-inputs agent or conductor passes the list into `valeErrorRules`; the `--page` gate enforces | R2a rollout; W1 |
| C, m3 (harness has two homes) | Folded. Tree mode only | R2a; criterion 3 |
| C, m4 (R1 reviewed twice) | Folded. Chain-R `register-check` dropped; criterion 8 is R1's one review | Pass shape; criterion 8 |
| C, m5 (stale pins, concurrent executor) | Folded. Pinned to `main` at `feca3348`; the risk entry and branch preconditions removed | Header; Pass shape; Risks |
| C, m6 (W1's gate) | Folded. W1 gates on the dotfiles `scripts/check.sh` | Pass shape |
| C, m7 (reference arm has no path) | Folded as a recorded deferral: R2a measures the promoted-rule count for the reference arm and root README and files a ROADMAP entry with that trigger | R2a; criterion 12; Out of scope |
| C, m8 (byte-identical baseline) | Folded. Base: the page as merged at `8bbe78f5`. Method: sentence-level diff, identical outside the named passages | R5; criterion 9 |
| C, trims | Folded. "Concurrent executor" and "Tone flattening" risks dropped; the 26-word fence stated once, in ruling 3 (removed from R1's digest list and Out of scope) | Rulings 3; Out of scope; Risks |

Net length: 384 to 429 lines. The trims recovered about 15 lines. Ruling 11, R1b, R7, and the
brief mechanics added about 60; the deleted Owner rulings section offset part of rulings 7 to 10.

### Refused

None. One reading choice: the verification's m2 fold said "the plan's chain header copies the
list". The conductor's instruction named the page-inputs agent or the conductor; the spec uses
that wording and leaves the pick to the plan, one home, the same as the brief extraction.

### R5 against the freeze rule on `main`

CLAUDE.md, "Documentation is a pass dimension": the narrative arms are "frozen against rewrites
until each arm's own stage merges (extend's lifts at the 2b merge)", and "A deficiency a pass
discovers on a page ... is fixed on the page in the same pass, gated by that page's own gates, per
the facts container's fix rule (`docs/internal/facts/README.md`, 'How this container grows'),
except a site edit to an arm whose stage is in flight". R5 qualifies as a deficiency fix:

- It is a scoped structural fix (a prose procedure made a numbered list, a run-in precondition, a
  heading form), not a rewrite of the arm's narrative; sentences outside the named passages stay
  identical against `8bbe78f5`.
- The exception does not apply twice over: this is an engine pass, not a site edit, and extend's
  stage 2a has not started (STATUS names its plan as next, after this sync lands).
- The page has a brief, and the facts README routes a fix on "a rebuilt page with a brief" through
  the approach spec's "Edits after the chain" rule, which R5 already follows.

One timing condition follows from the same rule: if stage 2a started before R5 lands, extend's
stage would be in flight. STATUS already orders the sync ahead of stage 2a's first page, so no
spec change is needed.

### Errata owed (ratified documents not edited here)

1. **Repo `CLAUDE.md`, "Authoring" section:** "On top of the Google floor, every published docs
   page follows the register standard" becomes "base" (the style-guide sense of ruling 2 and R1).
   The same sentence should name the drafting briefs once R1 lands.
2. **`docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md`:** line 17 "No new check is
   built" and the retirement row (`check:headings`, markdownlint as a gate) are superseded for
   structural checks by R2 and R3. The first fold's conditional erratum on line 160
   (merge-before-next) is withdrawn: ruling 9 keeps the rule as written.
3. **`docs/internal/record/2026-08-15-docs-outlines-with-visuals.md:58`:** "They are a floor, not a
   ceiling ... the standard yields" points to a register rule R1 deletes. The erratum notes that
   deviation from a base guide now requires a recorded exception row by Geoff's ruling
   (2026-09-28).
