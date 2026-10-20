# Docs-code sync spec: fold verification

**Target:** `docs/superpowers/specs/2026-09-30-docs-code-sync-design.md` at `5dc06e95` (278
lines), read against the fold record, the four reviews (CC, MF, DI, CO), the parent spec, the
sweep record, the prior-art record, the 2a plan (untracked), `docs-page-chain.js`, and
`scripts/checks/`. **Reader:** a fresh context with no part in the reviews or the fold.

**Counts:** 0 blockers, 5 majors, 6 minors.

**Most important:** FV-1. Ruling 2 asks Geoff to approve a 21M ceiling that breaks the parent's
80 percent rule on the spec's own arithmetic (16.9M planned against a 16.8M flag). With measured
spend, the gap is wider still.

## 1. Did each blocker and major close?

| Id | Severity | Status | Where in the revised spec |
| --- | --- | --- | --- |
| CC-1 | blocker | Closed | `:109-117` committed map; `:93-96` text matching dropped |
| CC-3 | blocker | Closed | `:192` deferred with a trigger; Brief `:33-35` no longer claims drift |
| CC-2 | major | Closed | `:103-114` declaring-type keys, stop at a listed type, counts at creation, removed-path and empty-reason rows fail |
| CC-4, CC-5, CC-6 | major | Closed by deferral | `:192` |
| CC-7 | major | Closed, one wording slip (FV-7) | `:169-179`, `:267-270` |
| CC-8 | major (fork) | Partial | Ruling 1 `:243-248`. The fold drops CC-8(a)'s retire rule, and ruling 1 contradicts the Filing bullet (FV-3) |
| MF-1 | blocker | Closed | `:192` |
| MF-2 | blocker | Closed | `:93-96`, `:111-117`. MF-2 asked for a fixture showing the gate would have failed at `86fd134c^`. That fixture cannot hold, since pending rows pass. The catch is page inputs' disposal, which the spec states at `:118-122`. |
| MF-3 | major | Closed | `:98-108` |
| MF-4, MF-6 | major | Closed by deferral | `:192` |
| MF-5 | major | Closed | `:136-149`; the cap goes to ruling 1 |
| DI1 | major (fork) | Closed | `:192` |
| DI2 to DI6 | blocker, major (if built) | Closed by deferral | `:192` |
| DI7 | major | Closed | `:169-179`; the direct log write persists entries |
| DI8 | major | Partial | `:114-117`, `:261-262`. The no-new-pending rule lives only in the 2a plan, and `exclude` with any reason stays open (FV-4) |
| CO-1 | major (fork) | Closed | `:192` |
| CO-2 | major (fork) | Partial | The sums at `:235-237` are right, but their inputs are wrong and ruling 2 breaks the rule it cites (FV-1, FV-2) |
| CO-3 | major | Closed | `:198-209`; the initiative figure rests on the wrong sweep cost (FV-2) |
| CO-4 | major | Closed, but see FV-3 | `:142-146` |
| CO-5 | major (fork) | Closed | Ruling 1 |
| CO-7 | major | Closed by deferral | Its lesson, that a rule lives where it executes, recurs in FV-4 |

## 2 to 6. Findings

### FV-1 (major): ruling 2's ceiling breaks the parent's 80 percent rule, even on the spec's numbers

**Location:** spec `:235-239`, `:249-253`; parent `:181-182`.

**Defect.** The parent requires a planned total at or below 80 percent of the ceiling. The spec
projects 16.9M planned. Its recommended ceiling of 21M flags at 16.8M, so the plan sits over the
flag before any overrun, which is the state ruling 2 exists to prevent. The sentence "the
parent's rule puts a 16.9M plan under a ceiling of about 21M" is false: 16.9 / 0.8 = 21.1M.

Measured spend makes the gap wider:

- Subagents through the fold spent about 5.2M, against the 4.9M the spec assumes as spent before
  the review and fold.
- The planned projection becomes 5.2 + 1.2 + 7.75 + 3.0 = **17.15M**. At pass A's rate it is
  5.2 + 1.2 + 9.9 + 3.0 = **19.25M**.
- That total still excludes the conductor session to date (unmeasured), this verification, and
  the plan review.

A 17.15M plan needs a ceiling of at least 21.5M. Once the conductor's spend is counted, the
ceiling is likely 22M to 23M.

**Fix.** Recompute from the measured 5.2M plus the conductor's `/cost` (the plan's counting
rule, plan `:116`). Set ruling 2's ceiling to at least planned / 0.8, rounded up, and state the
unmeasured conductor term. Change "about 21M" to the recomputed figure.

### FV-2 (major): the sweep's 4.4M cost is wrong, and the spec calls it measured

**Location:** spec `:80-82`, `:206-208`, `:232-233`.

**Defect.** The measured sweep is 3.31M: finders 1.04M, deep readers 1.29M, verifiers 0.66M,
and the filer 0.32M. That is 0.31M over its 3M share, not 1.4M. Line `:206` calls 4.4M "the
measured" cost. Two figures inherit the error:

- **The initiative consequence.** "Up to about 10M more" across stages 3 to 5 is
  (4.4 − 1) × 3. At the measured cost, it is about 6.9M, and less once each sweep scales to the
  smaller admin and editors surfaces.
- **The spent-figure caveat.** "The sweep alone was estimated at about 4.4M, so the figure is
  likely low" (`:232`) reasons from the wrong number. The measured subagent spend on the
  outline, sweep, prior art, errata, task 1, and defect filing is 4.47M. That is almost exactly
  4.4M, so the conductor likely conflated the whole pre-review total with the sweep.

The 4.9M figure is plausible as subagents plus a little conductor spend, but nothing sources
it.

**Fix.**

- `:80`: "cost about 3.3M (measured) against its 3M share."
- `:206-208`: "near the measured 3.3M: across stages 3 to 5 that is up to about 7M more."
- `:231-233`: "about 5.2M in measured subagent spend through this spec's review and fold (the
  sweep 3.31M), plus the conductor session, which the counting rule adds."
- The fold record's Unresolved list (`:88`) drops the 4.4M as unsourced; it is now sourced and
  corrected.

### FV-3 (major): ruling 1's "never blocking the cut" contradicts the Filing rule

**Location:** spec `:142-146` against `:243-248`.

**Defect.** Filing says that after an arm merges, the page "is fixed under 'Edits after the
chain' before the version is set." Ruling 1 says the sweep never blocks the cut on its yield.
The two cannot both hold: a gap found in a sweep either holds the version until its page is
fixed, or it does not. Neither the 1M cap nor the "reporting the unswept modules" step covers
page-fix spend. As written, Geoff cannot tell which one he is approving.

The fold also silently dropped CC-8(a)'s retire rule (two zero-yield releases move the sweep to
on-demand). The yield bullet (`:150-152`) reads only a steady yield and has no decision for a
falling one.

**Fix.** Pick one reading in ruling 1's option text. For example: "gaps file as facts naming
their page; a page fix that fits before the cut lands then, and any other rides the next engine
pass, with the page listed in the release body." Restore CC-8(a)'s retire rule, or state that
it was refused.

### FV-4 (major): the shrink-only rule does not live where it executes, and `exclude` stays an open escape

**Location:** spec `:114-117`, `:123-124`, `:261-262`.

**Defect.** The only enforcement against parking a new option as `pending` is a diff-reviewer
rule carried in "the plan's Global constraints." That text reaches 2a's reviewers only. The
case the rule guards is later: "an engine pass that adds an option" (`:123`). That pass's
diff-reviewer never reads 2a's plan. This is CO-7's defect, reborn in mechanism 1, and it
breaks the workstation rule that a rule lives where it executes.

The Betterer analogy also overstates the design. Betterer's tool fails the run: "If it gets
worse, your test will fail and Betterer will throw an error" (introduction page, fetched
2026-09-30). The spec relies on a reviewer's judgment instead.

The engine pass also has a second escape: an `exclude` row whose reason is any string. The gate
checks only that a reason is present, which DI8 flagged ("any string satisfied its reason
rule"), and the fold's Measures claim that as measured and closed.

**Fix.** Put the ratchet in the gate, which is the Betterer form and needs no `main` fetch.
`docs-gate.mjs`'s coverage step holds the pending count at creation as a committed constant and
fails when the map's pending count exceeds it. A disposal lowers the constant in the same diff,
where it shows. Land the reviewer rule in `diff-reviewer`'s definition, or print it as the
gate's failure NOTE: "a new `exclude` row in an engine pass needs a reason the reviewer
accepts." Drop "in the plan's Global constraints" from `:261-262`.

### FV-5 (major): pending rows have no end state

**Location:** spec `:109-124`.

**Defect.** Nothing fails a pending row whose slug no longer names a page. Three cases produce
one:

- The extend outline is deleted at the 2b merge (plan `:13-15`).
- Geoff cuts a page on the R10 page (S5).
- An arm's rebuild leaves rows its pages never disposed.

In every case the rows stay legal forever. That brings back CC-2's vacuity: a baseline nobody
reads. The "After an arm merges" bullet (`:123-124`) promises that the map constrains new
options, but it never says the arm's backlog must reach zero.

**Fix.** Add one gate condition: a `pending` row whose slug is not a page in a committed outline
fails. At an arm's merge, every row for that arm is then a fact or an exclusion. Add the
matching fixture to Acceptance (`:257-262`).

### FV-6 (minor): the two new sources sit outside guard condition 1's record, and one URL is wrong

**Location:** spec `:55`, `:115`, `:162-164`; fold record `:78-82`.

**Defect.** Condition 1 names "the prior-art record's methods table." The S7 route (the Rust RFC
template) and the pending ratchet (Betterer) cite sources outside it. The fold lists the
record's erratum as owed, but Acceptance never names it. The plan review's guard lens would
therefore fail both on condition 1 until the erratum lands.

Both sources check out as quoted:

- **Rust RFC template.** It carries "## Guide-level explanation" with "Explain the proposal as
  if it was already included in the language and you were teaching it to another Rust
  programmer" (`0000-template.md:22-25`, fetched). The spec's quote matches.
- **Betterer.** The fold cites the introduction page, which supports "fails when worse" but not
  "commits its results file." The commit claim is on `/betterer/docs/results-file`: "It should
  be commited along with your code."

**Fix.** Add an Acceptance line: the prior-art record gains both rows before the plan review
runs. Cite Betterer's results-file page beside its introduction page.

### FV-7 (minor): "No new agent or field runs" contradicts the new fields

**Location:** spec `:170-175` against `:267`.

**Defect.** The same bullet gives page inputs and the fact read a `frictionFiled` field, then
says no new field runs. The fact read also shares `READ_SCHEMA` with the register editor and the
figure verifier (`docs-page-chain.js:699-705`). Adding the field there offers it to the register
editor too, which the spec says does not report. With three pages in flight, three agents per
page now write the friction log directly. The Edit tool's stale-read check makes a lost write
unlikely, but the spec should name it.

**Fix.** Say "no new agent runs; two existing schemas gain the drafter's `frictionFiled`, and
the fact read takes its own schema, or the runner ignores the field for other readers."

### FV-8 (minor): mechanism 2 names its failure without an id

**Location:** spec `:131-133`; guard condition 2 at `:56`.

**Defect.** Condition 2 requires the failure "named by finding id or fact id." The release
sweep cites "the themed 404, Workers Builds not running migrations" with no id.

**Fix.** Cite the ids, for example `f:ofex2m` for the themed 404 and the sweep's SCF or CLN id
for the migrations trap. The CLN findings (15 post-harvest changelog gaps) are the strongest
release-window evidence.

### FV-9 (minor): the Brief's count list does not add up

**Location:** spec `:17-19`.

**Defect.** The text reads "148 verified gap claims: 131 new facts, 4 corrected facts, 2 new
outline pages, and 12 code defects." Defects are not gap claims, and the list does not sum to
148. Per the sweep record `:37-47`, 148 gap claims became 131 filed facts, 16 merged
duplicates, and 1 claim absorbed into a correction. The 12 defects come from separate verdicts.

**Fix.** Write "which yielded 148 verified gap claims (131 filed as new facts after dedupe) and
12 code defects; 4 existing facts were corrected, and 2 outline pages were added."

### FV-10 (minor): a retag to `[candidate]` turns the container-wide coverage gate red

**Location:** spec `:112-114`; facts README `:79`, `:139`.

**Defect.** Two paths retag a fact `[candidate]`: the fact read, and an edit after the chain.
The gate fails any row naming a non-`[verified]` fact. It runs inside every in-flight drafter's
docs gate, so one page's retag reddens its neighbours' gates. The obvious repair, flipping the
row back to `pending`, is the diff that FV-4's rule marks `fix`.

**Fix.** State that the retagging agent rewrites the row to `pending <slug>` in the same edit,
and exempt that case from the ratchet. The rewrite leaves the pending count at or below the
creation constant.

### FV-11 (minor): the per-page cost of disposing map rows is unpriced

**Location:** spec `:118-122`, `:234-235`.

**Defect.** The 1.2M covers building the mechanisms only. The crude filter left 1,379 paths
(`:102`), so a pilot page's inputs may dispose tens to hundreds of rows. That cost lands in the
pilot's per-page figure with no line for it, which is the lean risk S2 names.

**Fix.** Have the plan record rows per pilot page at the map's creation. The pilot checkpoint
then reports the disposal cost separately, so the 2b rate does not absorb it silently.

## Answers in brief

1. **Closure.** Every blocker closed. The majors closed or retired, except three that are
   partial: CC-8 (FV-3), DI8 (FV-4), and CO-2 (FV-1, FV-2).
2. **Contradictions and build order.**
   - Ruling 1 contradicts Filing (FV-3).
   - "No new field" contradicts the new fields (FV-7).
   - The 2a order is buildable: the walker, map, and gate come before the chain edits, and both
     come before the pilot. Two holes remain: the map's lifecycle past an arm merge (FV-5) and
     the retag interaction (FV-10).
3. **Mechanisms from memory.**
   - The Rust quote is verified verbatim.
   - The Betterer claims hold across two pages, but the spec's reviewer-enforced ratchet is not
     Betterer's automated form (FV-4).
   - The release sweep's failure lacks ids (FV-8).
   - The prior-art row gap is FV-6.
   - The shared-enumeration claim (`:100-101`) holds loosely. `check:surface` imports
     `moduleExports` from `reference-coverage.mjs`, and `surfaceSubpaths` is `check:surface`'s
     own.
4. **Can Geoff rule?**
   - Ruling 1: not cleanly until FV-3 picks one reading.
   - Ruling 2: no. Its numbers break the rule it cites (FV-1), and its inputs use the wrong
     sweep cost (FV-2).
5. **Owner rulings S1 to S7.** They hold in substance.
   - **S1:** the mechanisms land before the pilot.
   - **S2:** the guard is applied honestly. The lockfile is deferred on evidence, and three
     proposed mechanisms were refused. Two things drift toward over-build: the map's unpriced
     per-page disposal (FV-11), and the planning sweep kept at full shape for smaller arms. The
     spec scales the sweep "to the arm's surface," which is adequate.
   - **S7:** it rides the existing friction route, with close-time triage, the rulings-ledger
     check, HISTORY counts, and a zero-entry prompt-failure read. It is light and well carried.
6. **Spend.**
   - The sums at `:235-237` are internally correct.
   - The inputs are wrong. The sweep is 3.31M, not 4.4M. Spend through the fold is 5.2M in
     subagents plus the conductor, against the assumed 4.9M before the review and fold.
   - The initiative figure of about 10M is about 7M at the measured sweep cost.
   - Ruling 2's 21M fails 80 percent even at 16.9M.
   - Corrected projection: about 17.15M planned and 19.25M at pass A's rate, plus the conductor.
