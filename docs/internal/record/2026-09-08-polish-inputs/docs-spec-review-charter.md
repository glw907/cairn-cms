# Docs-standard spec review, charter, scope, and failure-mode lens

Adversarial review of `docs/superpowers/specs/2026-09-08-docs-standard-design.md` revision 1
(fresh context, read-only, 2026-09-08). Inputs read in full: the spec, `CLAUDE.md`
("What cairn is", "Documentation is a pass dimension", "Authoring", "Watch items"),
`docs/internal/docs-register.md`, `docs/internal/what-cairn-is-and-is-not.md`, the proposal's
Drawbacks and Unresolved questions, and `front-door-net-failure.md`. Grounding checks run against
`.vale.ini`, `package.json`, `scripts/checks/`, and `ROADMAP.md`.

**Filename collision, flagged for the conductor.** This path was already occupied by the charter-lens
review of `2026-09-08-polish-passes-design.md` revision 1 (same date directory, different spec). That
file is preserved verbatim at `spec-review-charter-polish-passes.md`; `spec-review-grounding.md` and
`spec-review-risk.md` in this directory belong to that earlier spec too and are untouched. Rename this
review's siblings before they land, or the same collision repeats twice more.

---

## Verdict

**Revise before planning.** The spec is well built as a document, and three of its controls (the fact
ledger, destination-path drafting, the exemplar-per-page-type rule) are load-bearing and should
survive any cut. But as written it fails its own premise check in four places, and the charter test in
one.

1. The control that exists to stop invented facts, `check:provenance`, cannot detect the defect it
   was written for. A missing footnote id is invisible to it. The rejected front-door draft would
   pass it (finding 1).
2. The spec's stated non-goal ("a readability gate... rewriting to a sentence-length number does not
   improve comprehension") is contradicted two sections later by decision 3, which gates a
   sentence-length number and buys 196 forced rewrites to do it (finding 4).
3. Unit 1 is the ratified 1.0 claims-verification audit under a new name, run against its own
   recorded sequencing constraint, and the spec never cites the roadmap row (finding 3).
4. `check:prose-read` makes a one-word docs fix unmergeable by anyone who is not the owner, and the
   spec is silent on contributors (finding 2).

On the charter: cairn's own docs are cairn's job, and nobody disputes the front door needed fixing.
The apparatus around them is mostly not cairn's job, and the spec never says which half lives where
(finding 5). The leanest form that closes the three measured holes is roughly one unit, not five.

---

## Ranked findings

### 1. `check:provenance` cannot fire on the failure it exists to prevent (blocking)

**Spec:** Abstract rule 1 (:42-44), review chain step 6 (:396-399), script table (:479).

The script "fails on an id that does not resolve to a line in the author brief." It never fails on a
sentence that carries no id. Deciding which sentences "state a fact about the owner or about cairn's
stance" is exactly the judgment a script cannot make, so the population the gate checks is the set of
sentences the drafter chose to annotate. A drafter that invents an anecdote and does not footnote it
is unmeasured, which is the rejected draft's defect precisely: the editors-emailing-the-owner story
was written as narrative, not as a cited claim.

Run the counterfactual the spec owes and does not give. Of the six tells named in
`front-door-net-failure.md`, `check:provenance` catches none as specified; the two-headed heading was
already gated before this spec; destination-path drafting would have surfaced fourteen
`WordListCase` warnings and one `Google.Quotes` error, "no finding touch[ing] cadence" by the
record's own measurement; and the cadence class is reported and explicitly never gated. **The only
new control that would have rejected this draft is a human or agent reading it against an exemplar,
and a fresh-context register editor already read it and returned B+.**

**Fix:** make the check deny-by-default on the front door and on any page a brief marks
provenance-bearing: every sentence outside code, tables, and link text carries an id, with a
literal `no-claim` id for the ones that assert nothing. That is checkable, and it forces the drafter
to classify each sentence rather than to self-select. Then state in the spec, plainly, that the
motivating cadence defect remains under human control and name what changed about that control
(corpus entry plus measurement table beside the verdict) as an unproven mitigation.

**Question for the owner:** is a per-sentence id burden acceptable on the front door? If not, the
honest version of rule 1 is "the front door's claims are checked by the owner against the author
brief," and `check:provenance` should be dropped rather than shipped as a gate that measures
compliance with its own annotation convention.

### 2. `check:prose-read` locks the docs against every contributor who is not the owner (blocking)

**Spec:** review chain step 9 (:404-406), script table (:480), unit 5 criteria (:656).

The receipt carries the page's content hash, the reviewer's verdict, and the reader's result, and the
gate fails when a published page's hash has no matching receipt. Three consequences the spec does not
address.

- A drive-by fix from an outside contributor (a typo, a broken link, a stale command flag) changes
  the hash, invalidates the receipt, and fails CI. The contributor cannot regenerate a receipt: it
  requires a fresh reviewer dispatch and a reader-test sitting they cannot run. `CONTRIBUTING.md`'s
  own success criterion is "a first PR clears the gates without a maintainer explaining an unwritten
  rule" (docs-register.md, contributor zone). This gate makes a docs PR unmergeable by design.
- `CLAUDE.md` requires every pass to update the docs for what it changed and forbids calling a
  public-API change done until its reference page matches. Under this gate, every such pass now also
  owes a reviewer dispatch and a receipt refresh per touched page. That is a standing tax on all
  future engine work, and the spec never counts it.
- Receipt placement is unspecified ("a file beside the page"). `package.json`'s `files` allowlist
  ships `docs/admin`, `docs/editors`, `docs/extend`, `docs/reference` wholesale, so a receipt written
  beside a published page ships in the npm tarball and renders through cairn.pub's arm indexes.

**Fix:** three changes. Put receipts under `docs/internal/receipts/<track>/<page>.md`, keyed by path
rather than by adjacency. Hash the prose only, or record a receipt as valid until the reviewer-visible
content changes materially, so a link fix does not invalidate a reader test. And state the contributor
path explicitly: either the gate skips PRs from outside the maintainer set (with a maintainer-refresh
step before merge), or receipts are advisory and the gate reports rather than fails.

### 3. Unit 1 re-files a ratified 1.0 gate under a new name and inverts its sequencing (blocking)

**Spec:** unit 1 (:528-557); risks (:665-672).

`ROADMAP.md` "Toward 1.0" already carries: *"The docs claims-verification audit has run (Geoff,
2026-08-02): an adversarial sweep of the whole docs corpus tracing every factual claim a page makes
about engine behavior to the code... Workflow-shaped: extract claims per page, verify each against
source, fold what fails. Runs AFTER `beta.1` so its inputs exist (stranger issues, the friction log,
Topo's docs-effectiveness signal) and BEFORE `1.0.0` ships; it is a blocking gate on the final
release."* Unit 1 is that sweep, with a ledger file format attached. The spec cites neither the row
nor Geoff's recorded sequencing, and unit 1 runs first, before `beta.1`, so the three inputs the
ruling exists to wait for are absent.

`CLAUDE.md` makes `ROADMAP.md` a pass dimension: a pass that ships a roadmap item marks it done and
removes it. A spec that plans a roadmap item without naming it produces either duplicated work or an
unrecorded overrule of a dated ruling.

**Fix:** cite the row in unit 1, state whether unit 1 discharges it, and either honor the
after-`beta.1` constraint or record the overrule with its reason and Geoff's approval, in the shape
`engine-rulings.md` uses for a reopened row. Add "the roadmap row is marked done and removed" to unit
1's acceptance criteria.

### 4. Decision 3 gates a sentence-length number the spec's own non-goals reject (blocking)

**Spec:** goals and non-goals (:79-81) against the numbers table (:131-136) and decision 3 (:491).

Non-goal: *"A readability gate. Controlled studies since the 1960s found that rewriting to a
sentence-length number does not improve comprehension. Every number in this spec locates a passage
for a person to judge."* Decision 3 then gates 25 words on the admin and editors tracks and buys
"medium" to clear 135 admin and 61 editors sentences first. Those 196 rewrites are, by the spec's own
finding, rewriting to a sentence-length number, and nothing in the spec claims a reader outcome for
them. The provenance is thin too: ASD-STE100 is a controlled-language standard for aircraft
maintenance procedures read by non-native speakers, and the spec transfers its number to a
Cloudflare-setup track and an editor-help track without evidence for the transfer, in a document whose
own register standard demands that a deviation be evidenced.

The 40-word ceiling is defensible on different grounds (an outlier locator, one violation in the
reference track at 151 words), and I would keep it.

**Fix:** demote decision 3 to a reported measurement under the same reasoning as decision 2, or
supply the evidence that a 25-word ceiling improves the admin and editors readers' outcomes. If it
stays, the spec must reconcile the contradiction in text rather than leave the two sections adjacent.

### 5. The charter test: the spec never says which half is cairn's and which is the workstation's (blocking)

**Spec:** "The Claude setup" (:448-470); unit 3 criteria (:588-605).

Applying the charter's premise check, "is this cairn's job, and is it the leanest form?", the spec
divides cleanly and does not draw the line:

- **Cairn's job.** Its own published pages, the per-track Vale rules under `.vale/styles/Cairn/`,
  the page-type templates for cairn's own page set, the fact ledger, and any gate wired into this
  repo's `package.json`.
- **Not cairn's job.** The Federal Plain Language adoption, the corpus method, the measurement
  instrument, the review-chain protocol, the page-brief convention, the voice files under
  `~/.claude/docs/voice/`, the `writing-voice` output style, and the `tellgrader` scanner. Every one
  of those is workstation writing infrastructure that ecxc-ski, 907-life, aksailingclub-org,
  cairn-pub, and Topo would want on identical terms. The authoring charter at
  `~/.claude/docs/authoring-charter.md` is already the umbrella for exactly this.

Two concrete consequences. Unit 3's acceptance criterion "both `CLAUDE.md` files net-neutral in line
count" (:605) has a cairn-cms pass plan editing the workstation's global `CLAUDE.md`; the global
instructions state that no agent message authorizes changing configuration, so that criterion cannot
be met by a dispatched implementer and must be an owner action. And adding the hinged-pair and
short-sentence measures to the shared `tellgrader` (:463) lands cairn's docs-register bands on every
repo the scanner runs in, including site content, which `CLAUDE.md` explicitly exempts from the house
voice ("Site content is the one personal voice, in the site repo's own content guide"). That is the
over-reach into the site-content register the brief asked about, and it arrives through shared
tooling rather than through a rule.

**Fix:** add a short "where each piece lives" section splitting the deliverables between this repo and
the workstation, mark the workstation items as owner actions rather than unit-3 tasks, and gate the
new scanner measures behind an audience or path profile that is off by default outside docs paths.

### 6. The front-door template contradicts the register's ratified front-door rules (should-fix)

**Spec:** page types table (:185), front-door section order (:268-277), "no page may name its own
type" (:293-295).

`docs-register.md` treats three pages as the front door: `docs/README.md`, `docs/why-cairn.md`, and
the root `README.md`. It requires of that surface "five routes, not four, in the first screenful",
one copyable `create-cairn-site` command above the routes, and the editor's routing line "prominent
and early". The spec's single front-door order opens with the owner's account of where cairn came
from and carries no routes section at all. One template cannot hold both an index of routes
(`docs/README.md`) and an argument (`docs/why-cairn.md`), and the root `README.md` sits outside
`docs/` where `check:anatomy`'s path scoping is unstated.

The register also carries Geoff's 2026-09-08 voice ruling for this surface: *"longer sentences than
a blog, fewer of them, each carrying one qualified claim... staccato runs of short sentences are out
of register even when every word is true."* The spec's "one idea per sentence" rule, its 15-to-20
average, and its hinged-pair report all push against that ruling; the spec grants a narrow exemption
("a qualification may ride inside the sentence") but the instrument still counts those sentences as
hinges and the reviewer still grades the table.

**Fix:** split the front-door type into an evaluator page type and a routing-index type, state which
covers the root `README.md` and how `check:anatomy` reaches it, and record in the spec that the
register's front-door voice ruling outranks the cadence report on that surface.

### 7. The never-read-the-old-page rule loses more than claims, and the ledger schema does not catch it (should-fix)

**Spec:** unit 1 (:534-546), unit 5 (:622-639), risks (:665-672).

The ledger carries an id, the claim, the old file and line, and a proving source. Claims are only one
of the things a published page holds. A fresh draft that never opens the page it replaces loses, and
no listed gate recovers:

- **Anchor slugs.** `admin/is-it-working.md`'s condition anchors are gated by `check:readiness`
  against the built condition registry, and the register says the slug "must survive a page edit".
  A fresh rewrite is the single most likely way to break them, along with every inbound link from the
  admin's Help link, from cairn.pub, and from four consuming sites.
- **Vale suppressions and their reasons.** The register's two worked examples (`NIST SP 800-63B`
  under a scoped `Google.Units` suppression, and the `` `Cairn` ``/`` `Caim` `` code-span markup) are
  deliberate markup carrying a comment. A drafter with no sight of them re-triggers the findings and,
  under gate pressure, "fixes" the content, which is the exact failure the register's "When a Vale
  finding is wrong" section forbids.
- **Recorded deviations.** The register requires a deviation be recorded "where the next writer will
  meet it," including in the page's own contract. A fresh draft loses local ones.
- **Ratified specimens.** The why-cairn opener is a ratified-good specimen in the register, quoted
  verbatim and re-ratified on 2026-09-08. A from-scratch draft that must not read the page cannot
  carry the sentence Geoff approved unless something hands it over.
- **Deliberate omissions.** The vendor-link rule means the useful signal on many pages is what was
  *not* restated. Absence leaves no ledger entry, so the rebuild's default is to restate it.
- **Reader-tested editor phrasing.** The editors track's banned-vocabulary glosses ("markdown" as
  "the plain-text formatting the editor previews for you") were chosen against a profile and are
  reusable; the ledger records them as claims at best.

**Fix:** extend the harvest schema with four fields beyond the claim, harvested per page: anchors and
slugs that must survive, active suppressions with their comments, recorded deviations, and
owner-ratified sentences carried verbatim. Add an anchor-stability gate to unit 5's criteria
(`check:readiness` plus a diff of heading slugs old-to-new). And make the harvest's completeness
criterion machine-checkable rather than asserted: every sentence of the old page maps to a ledger id
or to an explicit non-claim mark, which is the only version of "completeness per page" a later
reviewer can verify.

### 8. Goodhart, and the spec is already writing to the number (should-fix)

**Spec:** review chain step 5 (:393-395), the numbers table (:131-136), the receipt (:715-728).

The hinged-pair definition is published in the spec and in the proposal: a comma plus coordinator,
subordinator, or relative word; a colon or semicolon; a spaced dash; a comma plus "and" or "or" when
no earlier comma sits in the sentence. Every one of those is evadable without changing the rhythm a
reader hears. Parentheses carry the same qualification and count as nothing. Dropping the comma
before "and" removes the hinge from the count and not from the prose. Splitting the pair into two
sentences lowers the hinge share and raises the short-sentence share, producing the staccato the
register's front-door ruling bans. The measure is a proxy for a cadence a person hears, and it is
published, which is the definition of a gameable proxy.

The evidence that this is live, not hypothetical, is the spec's own receipt. Average sentence length
is declared "measured and reported, never gated," and the receipt nonetheless grades it: *"miss, 0.4
words below the floor on prose."* A number the spec says is not a target is scored as a miss by the
spec's author, four hundred lines after the rule that says it never gates. The proposal's own
Alternatives section reports the same effect on itself ("writing to it produces amputated
sentences, which revision 2 of the proposal demonstrated on itself").

**Fix:** drop the status column for the non-gating measures in every receipt, reporting the number and
the exemplar's number with no verdict word; forbid a reviewer from returning a fix verdict whose sole
support is a non-gating measurement; and record the hinge definition's evasions in the risks section
so a later reader knows the count is a locator and not a score.

### 9. The standard reaches into zones the register and `.vale.ini` deliberately exempt (should-fix)

**Spec:** page type 11, "Proposal (internal)" (:186); templates for "one template per page type in
the registry" (:590); the spec's own preamble deviation note (:20-28).

`.vale.ini` zeroes `BasedOnStyles` for `docs/superpowers/**` and `docs/internal/**` with a stated
reason: internal planning docs are write-once, and grading them spends tokens on findings that do not
matter. The register says the contributor zone has no style floor. The spec pulls internal proposals
back under a template and `check:anatomy`, then exempts design specs on the grounds that "a design
spec is not one of the eleven page types," which is a line drawn by the registry's contents rather
than by a reason. Two write-once internal genres, one governed and one not.

**Fix:** either drop type 11 and keep the internal zone ungraded, or state the reason internal
proposals are governed and specs are not, and confirm `check:anatomy` and `check:headings` are scoped
to published paths only.

### 10. Which controls are theater (should-fix, informational)

Ranked by demonstrated link to a reader outcome.

**Load-bearing.** The fact ledger with proving sources; drafting at the destination path (it closed a
real, measured hole); the exemplar-per-page-type rule with the corpus behind it; outline reviewed
before prose; the must-fire fixture for every Vale rule (the only control on a rule that silently
enforces nothing); the severity contract; the existing block gates (`check:snippets`,
`check:reference:signatures`, `check:transcripts`) that unit 5 leans on.

**Theater as specified.** `check:prose-read` measures the existence of a file whose hash matches a
page; it cannot tell a receipt from a reviewed page, and its failure mode is contributor lockout
(finding 2). `check:provenance` measures compliance with an annotation convention, not truth
(finding 1). `check:cadence` reports numbers the spec's own non-goals say do not predict
comprehension, in a document that then grades itself against them (finding 8). The 25-word ceiling
buys 196 rewrites for an unclaimed outcome (finding 4).

**Cheap hygiene, neither.** `check:headings`'s sentence case, single H1, no skipped levels, no
leading -ing form. No reader-outcome evidence, but near-zero cost and a real consistency payoff.
Sibling parallelism is the one rule in that list likely to produce false positives worth budgeting
for.

### 11. Owner-availability and registry-extension have no degraded mode (should-fix)

**Spec:** open items (:690-704); corpus constraints (:361-370); "a page whose type has no approved
exemplar must not be written" (:167-168); the reader test (:438-446).

Three single points of failure, each stated as an owner action with no fallback. If the second
editors corpus entry is never chosen by hand, the editors track has no draft. If forty sittings do not
happen, unit 5 stalls at its last acceptance criterion, which the risks section says plainly and does
not answer. And when a page needs a type the registry lacks (a glossary, a migration guide, a release
notes page, an FAQ, `CONTRIBUTING.md` itself), the spec's rule forbids writing it and states no
amendment procedure.

**Fix:** define three degraded modes. A sampled reader test (every task guide in one track, plus the
front door, with the rest deferred) that lets unit 5 close. A time-boxed corpus approval that
defaults to accept after a stated window, since an unapproved entry blocks work rather than
protecting anything. And a registry-extension procedure: who proposes a type, what evidence a new
exemplar needs, and a brief-recorded deviation as the escape hatch while approval is pending.

### 12. Repo-rule compliance gaps (nit, mechanical)

- **The friction log.** `CLAUDE.md` makes `docs/internal/docs-friction-log.md` a staging area
  "measured by what leaves it," and this standard resolves or supersedes entries in it. No unit's
  acceptance criteria mention triaging it.
- **`ROADMAP.md` and `docs/STATUS.md`.** Beyond finding 3, no unit files the standard into a roadmap
  tier or states what STATUS carries during a multi-unit initiative. STATUS is present tense and
  capped at 60 lines; a five-unit initiative with owner actions outstanding will push against that,
  and the spec should say what lives in STATUS and what lives in the roadmap entry.
- **The reference template and `check:reference`.** Unit 3 writes a reference-entry template with a
  fixed ten-section order while `check:reference`, `check:reference:signatures`, and `check:readiness`
  already fix parts of that shape. The spec names template-and-gate drift as a risk for
  `check:anatomy` and does not apply the same reasoning here. State that the reference template is
  derived from the existing gated shape, not a second copy of it.
- **Watch items.** `CLAUDE.md` says a machine-detectable trigger becomes a gate or a hook, never
  prose. The spec's Vale-version disagreement is exactly that, and the must-fire fixture is verified
  once ("verified on the pinned CI version") rather than run on every CI run. Make the fixture suite a
  standing CI job so a future pin bump fails loudly.
- **Em dashes.** Clean; the spec carries none.

---

## Questions for the owner

1. Is a per-sentence provenance id on the front door acceptable? If not, `check:provenance` should be
   dropped rather than shipped in a shape that cannot see the defect (finding 1).
2. Does unit 1 discharge the ratified claims-verification roadmap row, and does the after-`beta.1`
   sequencing still stand (finding 3)?
3. What should an outside contributor's docs PR cost (finding 2)?
4. Which parts of this standard do you want portable to the other repos, and which are cairn's alone
   (finding 5)?
5. Is the whole apparatus the leanest form? The three measured holes were a draft graded at the wrong
   path, no fact check against you, and no reader but the author. Destination-path drafting, an author
   brief with a real provenance check, and a fresh reviewer holding a corpus entry close all three,
   and that is roughly one unit. Units 2 through 5 buy consistency and a rebuild, which are real goods,
   at six to nine million tokens and forty sittings. The charter's premise check would ask that
   question of any code spec of this size, and this spec does not ask it of itself.
