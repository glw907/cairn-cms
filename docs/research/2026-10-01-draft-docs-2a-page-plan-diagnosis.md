# Why the pilot pages read as atoms, and the page plan that fixes it (2026-10-01)

Agent-facing record for draft docs stage 2a. Written after Geoff's read of the task 7b rework pages
(`a6885750`): the pages carried correct facts, explained well, and still read as a loosely connected
collection of related atoms rather than a structured page. This record holds the diagnosis, Geoff's
rulings, and the shape task 7c lands. The plan task is the executable form; this record is the why.

## Evidence read

The rework record (`2026-10-01-draft-docs-2a-rework-record.md`), the pilot job read
(`2026-09-30-draft-docs-2a-pilot-job-read.md`), `docs/extend/security-model.md` and
`docs/extend/add-cairn-to-a-sveltekit-app.md` at `a6885750`, the outline entry for `security-model`,
the runner's `pageInputsPrompt`, `draftPrompt`, `structurePrompt`, and fact-read coverage rule
(dotfiles `5fb8ce2`), `cairn-docs-drafter.md`, the register's drafting brief and page anatomies, and
`docs/internal/facts/README.md`.

The security page at `a6885750`:

| Measure | Value |
| --- | --- |
| Outline fact ids handed to the drafter | 87 |
| Cover bullets | 13 |
| Sentences in the brief | 237 |
| Distinct fact ids cited | 88 |
| No-claim sentences | 23 |

## Diagnosis

The chain carries no artifact that holds a page's argument. Everything upstream of the drafter is
atomic, and everything downstream grades atoms.

1. **The inputs are atoms.** The outline hands the drafter fact ids, cover bullets, and one job
   sentence. The facts container is built judgment-free, one bullet per claim, with no relation
   between claims (the harvest dropped judgment calls as unfalsifiable). The cover bullets are the
   old pages' headings in the old order. The one organizing idea in the entry, the exemplar take
   ("organize around the questions reviewers ask, each with threat, defense layers, and what
   remains"), is a one-line hint with no mechanism behind it, so the outline's inventory order wins.
2. **The output contract is atoms.** The brief maps each sentence to one fact id, and
   `check:provenance` fails a no-claim sentence that holds an extractable fact. The drafter's removal
   rule defines a sentence's worth as the fact or step it carries, so synthesis, ranking, consequence
   for the reader, and "which of these matters to someone deciding" carry no id and are licensed
   cuts. Task 7a exempted introductions, hand-offs, and endings from the rule, which is why the
   rework pages have openers and still no body argument.
3. **The reviewers grade atoms.** The fact read checks that every carried fact appears. The register
   editor checks sentence tells. The structural seat checks anatomy parts and order against the
   outline's cover list. In round 2 on `security-model`, the drafter tightened the auth-channel
   section to the reader's depth and the fact read forced the three dropped facts back (rework
   record, "Drafter notes"). Coverage blocks and depth only advises, so coverage wins every round.
4. **The drafter does three jobs in one call.** It decides the structure, writes the prose, and
   encodes the brief, over 87 inputs, in one pass, and under that load a model serializes its inputs
   in the order given. The round-2 redraft is bound to "fix the cited spots, do not widen", so no
   later round can reorganize.

The sentence-level quality Geoff saw is real and expected: every sentence was traced, edited, and
verified on its own. Nothing asked what the page argues, which facts carry the argument, and which
are detail the reference already holds.

## Geoff's rulings (2026-10-01)

- **The page plan is a committed artifact.** It sits beside the brief so a later pass, the
  consistency read, and a tuning session can see why a page is shaped as it is.
- **Geoff reads finished pages, not plans, by default.** The plan is available on the review page
  for tuning a page that needs help; it is not a gate he attends.
- **A plan may push facts off a page.** The pilot pages had, in places, too many facts, presented
  with no sense of priority or relationship. A fact the page does not need for its job is
  subordinated to the reference arm (linked) or cut with a reason, and that disposition is not a
  dropped fact.
- **Spend on the plan seat (2026-10-02).** If a higher-level agent at more effort writing the plans would
  significantly benefit the outcome, Geoff spends the tokens. The plan step defaults to Opus 5.5 at
  `xhigh`, and the pilot's six plans run on Fable under this grant.

## The fix, as adopted from published method

A page plan step runs between page inputs and the draft. The structural seat grades the plan
before any prose exists, the drafter drafts from the plan, and the fact read's coverage rule
reads the plan's dispositions. Sources, all already cited in
`2026-09-30-page-level-review-prior-art.md`: Google Technical Writing Two, "Organizing large
documents" ("use the outline as the narrative for your document"; "structure your outline so that
your document introduces information when it's most relevant to your reader"; the three-part
introduction), the Good Docs templates for each page type's sections, and the EFA's developmental
edit (content and organization before the line edit, which the structural seat already quotes).
Nothing new is designed: the plan is the outline Google's lesson asks the writer to make first,
written down and graded.

The cost direction is down. The pilot and rework spent most of their tokens on round-2 redrafts and
whole-page re-reviews. A plan is around a tenth of a page, so a `fix` on it costs a plan revision,
never a 500-line redraft. Task 7c in `2026-09-30-draft-docs-stage-2a.md` carries the outcomes and
acceptance; the task 7b resolution pass runs after it, from plans.
