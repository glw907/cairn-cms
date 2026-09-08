# Plan two adversarial review: charter and proportion

Lens: charter (is it cairn's job, in its leanest form) and proportion (is the total sized to a
75-page docs set with one owner). Read-only review of
`docs/superpowers/plans/2026-09-08-docs-toolset-pass.md` REVISION 1, against the repo charter, the
spec's "Where each piece lives" and "Rationale", and the workstation's pass-sizing rule.

Measured baseline: 75 markdown pages under the four track directories, plus three front-door pages.
`package.json` already carries 32 `check:` scripts. The plan proposes 39 tasks, 8.8M tokens, six new
scripts, one new linter, three new Vale rules, twelve templates, twenty-odd corpus entries, four
concurrent worktrees, and at least four attended owner sittings, to produce one rebuilt published
page.

## Verdict

**Accept the spine, cut roughly a quarter to a third of the apparatus.** The plan is well built and
its sequencing is honest: the preflight, the ledger schema, the demonstration chain, and the
`read`-tier re-resolution in `check:ledger` are the right shapes and should not be touched. But the
plan inherits a spec that was never itself proportion-tested, and it adds to it (the preflight, the
demonstration chain, the records chain, a sixth script) rather than pressure-testing it. Three
classes of work fail the charter's premise check or the proportion test: gates whose failure
condition has no demonstrated link to the front-door failure, workstation work that leaked back
across the boundary plan one was created to draw, and a twelve-type registry that is finer than a
75-page set with one owner can sustain.

The single loudest number: the pass delivers **zero reader-visible improvement** except one page,
and it spends 8.8M doing it. That is defensible only if every artifact is load-bearing for plan
three. Several are not.

---

## Ranked findings

### 1. G2-8: the tell-scanner CI step is theater, and the scheduled routine is plan one's. CUT (the step); MOVE (the routine).

G2-8 wires a `test.yml` step that invokes the tell scanner "where it is available", non-blocking,
"its absence never fails a build". The tell scanner is `tellgrader`, a machine-local workstation
binary. On a GitHub Actions runner it is never available. The step is therefore a permanently inert
line in CI whose only function is to look like coverage. This is the purest instance of the theater
test in the review brief.

The link-rot routine is the right mechanism for its trigger (the watch-items rule: an external or
time trigger becomes a scheduled cloud agent), but creating it is a workstation action, not a cairn
`git diff`. The plan moved unit 3c out on exactly this criterion: "cairn's chain grades a task by
`git diff` plus `npm test` and neither reaches `~/.claude/`". The scheduled routine fails the same
test. Its in-repo definition doc can stay; its creation belongs in plan one's lane.

### 2. G2-2: `ParagraphBounds` ships at error level, and its failure condition has no link to the front-door failure. RESHAPE to warning.

The plan's global constraints hold every length rule at warning "with no promotion path" (decision
1), then make paragraph bounds the single exception at error: three to eight sentences, 150 words,
250 hard. The rejected front-door draft failed on invented facts and a 54-percent hinged-pair rate.
It did not fail on paragraph length, and the plan cites no evidence that any paragraph number would
have caught it. Worse, the spec's own compatibility rule states plainly that "a new rule ships at
warning level. It moves to error only after every existing violation in the tracks it covers is
cleared" — and no task in this plan clears paragraph violations across 75 pages. The error level
either fails the build on day one or forces unbudgeted clearing work into G2-2.

Demote to warning. It costs nothing the standard was built to protect and removes a hidden clearing
task.

### 3. `check:fact-coverage` (H2, wired permanently) inverts into ledger padding. RESHAPE to a harvest-time tool, not a standing gate.

The script fails when a page carries a numeral, path, or version string that no ledger entry's
`claim` or `source` field mentions. H3's own acceptance criteria require that "no `claim` value
appears as a substring of the page" — claims are normalized paraphrases under fifteen words. So the
gate matches extracted tokens against text deliberately written not to resemble the page. The
predictable equilibrium is entries written to satisfy the extractor rather than because the
proposition matters, which is Goodhart applied to the one artifact plan three depends on being
honest.

It is a genuinely useful completeness instrument *during* the harvest, where an implementer works
the `--json` uncovered-token list. Keep it there. Do not add it to `npm run check` as a 33rd
standing gate over 75 pages. This also removes the sixth-script exception the plan had to argue for.

### 4. G1-5 and G1-6 rules 5 and 6: a hand-built verb lexicon for two warnings. MERGE G1-5 into G1-6, CUT rules 5 and 6.

Two full tasks (a JSON lexicon, a `heading-grammar.md` doc, fourteen fixtures, a unit test) produce,
for rules 5 and 6, output that warns and never gates and by the plan's own admission has an unknown
warning volume until G1-5 counts it. Rules 1, 4, and 7 (sentence case, no leading `-ing`, question
headings only under editors) are cheap, deterministic, and defensible at error. Rules 5 and 6 are
taste expressed as a word list that a human must maintain forever.

Vale's vendored Google package already carries heading guidance. `heading-grammar.md` is authoring
advice and belongs in `docs-register.md`, not a new file in the templates arm. Merge the two tasks
into one, keep the five deterministic rules, drop the lexicon.

### 5. Twelve page types is finer than 75 pages with one owner can carry. RESHAPE to eight.

The registry drives three tasks' deliverable counts (G1-2 six templates, G1-3 six templates, C3
seven corpus entries) and the whole eleven-to-twelve straddle. At twelve types over 78 pages,
several types have one to three instances.

Two are outright charter failures. `proposal` is an internal planning-document type; the plan states
in the same breath that internal planning docs stay outside the Vale gates and that
`proposal.md` "governs shape rather than prose". Building a template and sourcing a licensed corpus
entry for a type the standard does not grade is work the standard does not need. `symptom-row` and
`condition-entry` are sub-page granularities promoted to page types; C3 even has to negotiate
whether one Cloudflare error table is two rows or one row plus a `structure-only` row, which is the
registry straining against reality.

Collapse to eight (`task-guide`, `tutorial-milestone`, `concept`, `architecture-overview`,
`reference-entry`, `reference-table`, `index`, `front-door`). That shrinks G1-2 and G1-3 from twelve
deliverables to eight, removes C3's hardest entries, simplifies H4, and dissolves finding 6 entirely.

### 6. The eleven-then-twelve straddle is a "next time" note where a constant belongs. CUT the straddle.

Global constraints: "Every artifact this plan writes before G1-3 merges names eleven; every artifact
after names twelve." Nothing detects a violation. Four concurrent chains each have to remember which
side of another chain's merge they sit on, for a split that happens *inside this plan*. There is no
reason the count is ever eleven: fix the final number in the ruled inputs and have every artifact
name it from task one. This is the watch-items rule applied to the plan itself — prose in a plan is
the weakest form of a guard, and here the guard is unnecessary.

### 7. Four concurrent chains buy clock time, which is not a budget, at the cost of seven contended file groups. RESHAPE: merge G1 and G2 into one chain.

The Reconciliation block lists seven file groups written by more than one chain, five of which are
G1-against-G2 (`package.json`, `test.yml`, `docs-standard-scope.json`, plus the register and the
rebuild directory). The plan's own note says "the machine ceiling is two concurrent full gates ...
G1 and G2 hold the two slots", so H and C already run free. Running G1 and G2 as one sequential
chain removes five of seven reconciliation rows, removes the cross-chain edge G2-6 has on H1's
schema staying stable, and costs only wall clock — explicitly a watched metric, never a budget.

H and C stay concurrent; they share nothing and contend for no gate slot.

### 8. G2-7's owner block sits outside P1, contradicting P1's own stated reason to exist. RESHAPE.

P1's note: "do not fold it into a chain's first task, because four chains would then each discover
the block separately." Then G2-7 carries an independent **blocked-on-owner** on the uncommitted
`check:figures` substrate, discovered mid-chain, seven tasks into G2. Move that verification into
P1's step list. It is the same class of precondition and the same argument applies.

### 9. G2-1 vendors a PDF no gate reads. CUT the vendoring, KEEP the register section.

The Federal Plain Language Guidelines PDF is committed so the register can cite it. No script parses
it, nothing tests against it, and the provenance note's own justification is that the live site
re-cut its guides. A citation with a revision date, a fetch date, and the note about the redirect
carries the same information. This is a template where an exemplar excerpt suffices, in the review
brief's own words.

### 10. H9 and H10 harvest at full granularity a track the plan will not rebuild. RESHAPE.

H9's notes concede it: "reference pages are edited in place in plan three rather than rebuilt, so
their ledgers serve `check:provenance` and the coverage diff rather than a fresh draft. Harvest them
at the same granularity anyway." The quarantine and the coverage diff exist because a drafter never
opens the page it replaces. For in-place edits there is no quarantine and no fresh draft, so the
per-proposition ledger buys a coverage diff against a page nobody rebuilt. `docs/reference/` is also
the track most heavily covered by existing gates (`check:reference`, `check:reference:signatures`,
`check:symbols`), meaning most of its claims are already machine-proved.

Harvest reference at reduced granularity: the anchor map, the `kind: block` signature entries, the
docs-sweep corrections, and the keep classes. Skip the exhaustive proposition pass. The harvest chain
is 4.0M of the 8.8M ceiling and this is its cheapest real cut.

### 11. H13's `--plan-lint` mode lints documents the standard exempts. CUT the mode, KEEP the fragment.

`--plan-lint` fails a plan document whose task Files list names a published page under a drafting
step. Plan documents live under `docs/superpowers/`, which the plan states twice is outside every
gate this standard installs, and which the spec's split assigns to the workstation's process half.
The quarantine it enforces is a dispatch discipline; the drafting fragment H13 already writes is
where it belongs. The fragment is genuinely cairn's (it is about cairn's ledgers) and stays.

### 12. G1-7's "clear or scope every existing violation" is unbounded scope inside one step. RESHAPE.

Markdownlint's stock rule set over 75 unlinted pages will produce a large finding list, and step 1
says to clear or scope all of it. That is an unsized task hidden inside a task, and it is the
accretion-by-adjacency pattern: markdownlint arrived because it sits next to `check:headings`, not
because the front-door failure argued for it. Scope markdownlint to `docs-standard-scope.json` on the
same terms as every other new gate, clearing nothing beyond the demonstration page, and let plan
three's track plans widen it. Keep the fence-language-tag rule, which other gates lean on.

### 13. Four attended owner sittings in a plan that ships one page. MERGE C5 into H12.

H12 (the unverified list), C5 (corpus approval), D3's reader test, and D3's demonstration read are
four pulls on the co-equal attended-time budget. H12 and C5 are both batched approval sittings with
no dependency between them and both land mid-pass. Present them as one sitting. H12 is correctly
identified as "the highest-value attended sitting in the initiative"; the corpus list rides along at
near-zero marginal cost.

### 14. G2-5 `check:prose-read` gates a table with one row. DEFER to plan three.

The script fails a published page *in scope* with no receipt row. In this plan exactly one page is
in scope, so the gate's full assertion at pass end is "one row exists, and it names a real file".
Its value is entirely in plan three, where 78 rows accumulate. Create `receipts.md` and its columns
here (D3 needs the shape); build and wire the script in plan three's first track plan.

---

## Deliverable counts over four

| Task | Deliverables | Note |
|---|---|---|
| G1-2 | 6 | Six templates. Drops to ~4 under finding 5. |
| G1-3 | 6 | Six templates plus the registry table. Drops to ~4 under finding 5. |
| R2 | 6 | STATUS, HISTORY, ROADMAP, CHANGELOG, friction log, register, hand-off manifest — seven files, six named deliverables. Split the hand-off manifest into its own task; it is the artifact plan three reads first and it should not compete with five ledger updates for attention. |

At the line: G1-1 (4), G1-4 (4), G2-2 (4), G2-5 (4). All four are script-plus-fixtures-plus-test
shapes where the count is an artifact of counting fixtures separately. No action.

## Watch items: prose where a mechanism belongs

- **The eleven-to-twelve straddle** (global constraints). No detector, cross-chain. See finding 6.
- **"Re-verify at dispatch"** (plan header, on anchors and line counts moved by polish-C). H1 step 1
  re-verifies the polish-C merge but nothing re-verifies the line numbers the ledgers record. The
  right answer already exists in this plan: G2-6's `read`-tier `file:line` re-resolution is exactly
  the conversion of a watch into a failing test. State that `check:ledger` is the mechanism and drop
  the prose note.
- **H3's schema correction** ("H4 through H11 use the corrected schema"). A schema change lands after
  H2's script was written against the schema, and H2 is in the same chain while `check:ledger` is in
  another. G2-6's header-column match catches drift only after G2 merges. Add the column-set
  assertion to `check:fact-coverage` at H2, so the chain that mutates the schema is the chain that
  detects the mutation.
- **G2-7's decision re-verification** ("re-verify spec decisions 5, 5a, and 6 against the merged
  state"). Correctly scoped and recorded in R1's amendment. No change.
- **D2's `no-claim` escape hatch** ("the reviewer, not the script, catches a narrative assertion
  recorded as claiming nothing"). Correctly named as unmachine-checkable, with the human step
  assigned. This is the model the rest of the plan should follow. No change.

## Where to cut a third, named

Ordered by tokens saved against risk to plan three:

1. **H9 and H10 to reduced granularity** (finding 10). ~0.8M.
2. **Twelve types to eight**, cascading through G1-2, G1-3, C3, H4 (finding 5). ~0.4M.
3. **G1-5 merged into G1-6, rules 5 and 6 cut** (finding 4). ~0.3M.
4. **G2-5 deferred to plan three** (finding 14). ~0.25M.
5. **G1-7 markdownlint scoped, not cleared** (finding 12). ~0.2M.
6. **`check:fact-coverage` unwired from `check`; H13's plan-lint cut** (findings 3, 11). ~0.2M.
7. **G2-8's tell-scanner step cut, routine moved to plan one** (finding 1). ~0.1M.
8. **G2-1's PDF vendoring cut** (finding 9). ~0.05M.
9. **G1 and G2 merged into one chain** (finding 7). No token saving; removes five contended file
   groups and one cross-chain edge.
10. **C5 folded into H12's sitting** (finding 13). No token saving; one attended sitting back.

Total: roughly 2.3M of 8.8M, a little over a quarter, with the concurrency and sitting reductions on
top. Nothing on this list touches the preflight, the ledger schema, the harvest of the three tracks
plan three actually rebuilds, the brief parser, `check:anatomy`, `check:provenance`, or the
demonstration chain. Those are the spine and the evidence, and they should survive intact.

## What the plan gets right, and should not lose in a revision

- **P1 as a separate stopping task**, with the reasoning stated. Correct, and finding 8 only asks it
  to do more of its own job.
- **H3 harvesting the demonstration page first, to break the schema before eleven tasks build on
  it.** This is the cheapest risk reduction in the plan.
- **`check:ledger`'s `read`-tier re-resolution**, named in the plan as "what converts 'the harvest
  went stale' from prose into a failing test". That sentence is the watch-items rule stated
  perfectly, and it is the standard the rest of the plan's notes should be held to.
- **Decision 3's receipt shape** (pull-request artifact plus a ledger row, no content hash) and the
  stated consequence that a typo fix does not re-enter the review chain. A lean call, correctly
  reasoned and correctly recorded in the script header.
- **The refusal to build a `check:cadence`**, asserted as a grep in G2-8's acceptance criteria. The
  right way to record a deliberate non-feature.
