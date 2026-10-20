# Style-guide sync spec review: goal fidelity

Reviewer lens: goal fidelity. Target: `docs/superpowers/specs/2026-09-28-style-guide-sync-design.md`
at `99535b08`. Register read on `draft-docs-0` (`git show draft-docs-0:docs/internal/docs-register.md`,
cited as REG). Guide quotes were fetched live on 2026-09-28 from developers.google.com/style (tone,
headings, procedures, link-text) and learn.microsoft.com/style-guide (top-10-tips).

The goal: keep the register's tone, never let the register supplant the base guide, and record every
override as a deliberate, ruled exception.

**Verdict.** The structural half is mostly delivered. Procedures, headings, link text, and tables
reach a gate or a blocking finding. The spec falls short in three ways:

- The central voice override is misclassified as a "tightening", so it gets no row.
- The voice's positive definition has no feedforward and no acceptance check, so the half of the
  goal that already worked is the half left unprotected.
- Several guide-contradicting rules survive in files the spec leaves untouched, mainly the register
  editor's editors-arm tell families and the register's reviewer section.

Counts: 0 blocker, 8 major, 5 minor. One owner fork (finding 8).

---

## Major

### 1. The "tightening" test is undefined, and two live deltas fail it

- **Location:** spec:44-47 (ruling 2), spec:49-50 ("Measured, not casual ... this is a tightening"),
  spec:56 ("Imperatives only in steps and task headings. A tightening."). Also REG:71-72.
- **Defect.** Google's tone page prescribes the register the delta forbids:
  - "Use a voice that's casual, natural, and approachable, not pedantic or pushy."
  - "aim for a conversational tone rather than a formal one"
  - "don't aim for super-dry"

  "Measured, not casual" bans a form the guide prescribes. That makes it an override, not a narrowing.
  The technical-report voice is the largest departure from Google in the whole register, yet under
  this spec its only recorded row is sentence length. REG:71-72 ("It is not a blog post and it is not
  graded against general written norms") is the old self-licensing clause in miniature, and the spec
  never says it goes.

  "Imperatives only in steps and task headings" read literally bans Google's own prescribed
  cross-reference form, "For more information, see ..." (link-text page). It also bans the
  imperative inside a notice. A reviewer applying the register as written would flag
  guide-mandated text.

  The loophole is structural. Nothing states who classifies a delta as a tightening, or by what
  test. Any future register rule can be labelled a tightening and skip the row.
- **Fold.**
  1. Define the test in ruling 2: "A rule that forbids a form the base guide prescribes or
     recommends is an override and needs a row. A tightening forbids only what the guide permits
     or is silent on."
  2. Record the tone as a Google exception row: G-tone's casual, conversational-rather-than-formal
     voice becomes the measured technical-report voice in explanatory prose. The row keeps Google's
     "friendly, respectful, no slang" and cites Geoff's 2026-09-08 ruling and the 2026-09-28 proof.
  3. Scope the imperatives delta to exempt cross-reference "see" and notices.
  4. Drop REG:71-72's "not graded against general written norms".
  5. Have the register editor treat a delta missing from the delta list as a finding.

### 2. The voice's positive definition and its feedforward are not preserved

- **Location:** spec:84-86 (R1 voice sections), spec:139-145 (W1 digest), spec:154-155 (W2),
  spec:168-175 (exemplars).
- **Defect.** R1 rebuilds the voice as "the guide's own tone rules quoted, then its deltas". The
  three deltas are two prohibitions plus a length allowance. The spec never says what happens to
  the parts of REG:65-78 that define the voice positively:
  - the comparison set (SQLite's "Appropriate uses", a systems paper's introduction, a standards
    overview)
  - the "technical report" identity
  - "qualification carried inside the sentence"
  - the restrained first person

  It also never mentions the one ratified-good specimen (REG:503-510). "Anti-pattern specimens stay"
  is the only specimen commitment. On the feedforward side, the chain gains a structural digest in
  two places, but the voice gains nothing. Anatomy exemplars move to external guide-house pages,
  which model Google's plain voice, and the register exemplar shrinks to one page. The charter says
  imitation outweighs rules (WV:12-14). So the spec strengthens the structural attractor and weakens
  the voice attractor, which is the flattening risk the goal warns against.

  The theme-identity analogy the spec invokes gave agents "the model ... in one sentence, everywhere
  cairn ships guidance" (theme spec:33-36). No voice equivalent exists here.
- **Fold.**
  - R1 states that the comparison set, the four positive traits, and the ratified-good specimen
    carry into the Google Voice section.
  - R1 adds one "structure plus voice" specimen showing the voice inside guide structure: a task
    section's lead-in sentence plus a numbered step, taken from the rebuilt R5 page after it is read.
  - W1 puts a one-sentence voice model beside the structural digest in `common`. For example:
    "Structure to Google; sound like a careful technical report: measured, precise, each sentence
    carrying one qualified claim."

### 3. The register editor still grades the editors arm against a non-Microsoft voice

- **Location:** `~/.claude/agents/cairn-register-editor.md:17-23`, `:73`, `:93-99`. Spec:157-160
  (W3) changes only `:70-72` and the 25-40-word baseline.
- **Defect.** Ruling 4 says Microsoft unmodified plus tightenings. Four surviving parts of the
  editor definition contradict Microsoft on `docs/editors/**`:
  - **Noir overcorrection** flags "consecutive short sentences" (`:96-97`). Microsoft's top-10 tips
    say "Shorter is always better" and model "Ready to buy? Contact us."
  - **Consumer-help posture** flags "micro-instructed actions" (`:93`). M-steps says "Use a separate
    step for each instruction". Its "hand-holding" item also collides with the Microsoft reassurance
    the editor track itself asks for (REG:299; editor.md:24 and its "Don't worry" exemplar).
  - **Genre exemplars** (`:17-23`): editor docs answer to a cairn-ratified exemplar and the Sveltia
    club-handbook passages, not to Microsoft. The corpus directory (`:32`) does not exist on this
    machine.
  - **Shortform compression** (`:73`): "Both audiences hate ... shortform-video compression" pulls
    against Microsoft's "Be brief".

  Under this spec the editors arm is graded by rules that override its base guide with no row.
- **Fold.** W3 does three things:
  - It scopes Noir overcorrection and the micro-instructed-actions item to the Google arms.
  - It keeps only the consumer-help items Microsoft itself bans (just, simply, folksy softeners).
  - It names editor.md's Microsoft exemplars as the editors genre exemplar.

  This has one clearly correct answer given ruling 4, so it is not a fork.

### 4. The register's reviewer section still puts the profile first, and the register outranks the editor

- **Location:** REG:512-517 ("Grade a page against its own track's profile first"). Spec:76-99 (R1)
  leaves this section untouched. Spec:157-158 (W3) keeps "the register as the overlay that outranks
  this file".
- **Defect.** W3 makes guide conformance the editor's first lens. The document that outranks the
  editor definition still says grade the profile first. When two ordering rules conflict, the one
  from the higher-precedence file wins. That undoes "the first order of business is to confirm
  that docs adhere to the appropriate style guide."
- **Fold.** R1 amends the first reviewer bullet: "Grade structure against the base guide first; a
  guide violation is blocking. Then grade against the track's profile." It costs one sentence.

### 5. The one loosening has no fence

- **Location:** spec:51-55 (steps, list items, and task sections stay under 26 words) and spec:211
  (S14 gating out of scope).
- **Defect.** The recorded exception is safe only because steps keep Google's accessibility limit.
  Nothing checks that limit, though:
  - No Vale rule covers it.
  - The digest list (spec:143-144) does not name it.
  - The register editor is not told it is blocking.

  The drafter's pull is toward long sentences, since that is the voice. The one place the spec
  loosens Google is therefore the place most likely to drift, and it drifts where the reader acts.
- **Fold.** Add "a step or list item stays under 26 words" to the digest as a blocking guide
  finding. Optionally add a `list`-scope `Cairn.StepLength` at warning, modelled on
  `Microsoft.SentenceLength`'s occurrence form. S14's out-of-scope line should say it excludes
  explanatory prose only.

### 6. The named external exemplar source does not exist in the corpus

- **Location:** spec:171-174 ("a guide-conformant external page in the existing capture corpus
  (Google Cloud or Microsoft Learn)").
- **Defect.** `~/.local/share/cairn/exemplars/` holds 68 captures and none is Google Cloud or
  Microsoft Learn. The only Google or Microsoft pages are `support.google.com` (two) and
  `support.microsoft.com` (one). All three are end-user help in the editors folder, and none is
  written to the developer guide. W1's pre-check rejects the two in-repo extend exemplars. Executed
  as written, stage 2a has no conforming anatomy exemplar, so the chain either stops or falls back to
  "(none named; follow the register's anatomy)". The structural feedforward the pass exists to fix
  then has no source.
- **Fold.** Add a chain-R task that captures three or four guide-house pages into the corpus: a
  developers.google.com or cloud.google.com task page with a numbered procedure, a concept page, and
  a Microsoft Learn procedure. The plan names them per page type.

### 7. Writers outside the page chain get neither the lens nor the gate

- **Location:** spec:122-126 (R4: error only on chain-scoped `--page`), spec:137-166 (chain W names
  only the chain's agents). `~/.claude/agents/cairn-implementer.md:72-74` ("Write in a plain voice").
- **Defect.** G1 covers "a writer" and G2 "a drafting ... agent". The highest-frequency docs writer
  is `cairn-implementer`. It maintains the reference arm every pass, along with `migration-notes.md`
  and `upgrade-cairn.md`, and it applies the batched engine-docs fixes. It gets no base-guide
  instruction, and its pages gate only at warning under R4. Most reference pages are not frozen,
  so R4's "until each frozen arm reaches its own draft stage" does not even say when they reach
  error.
- **Fold.**
  - R4 gates the new rules at error on doc files a diff touches (a changed-files scope in
    `docs-gate.mjs`), not only on chain `--page`.
  - R4 names the reference arm's level explicitly.
  - Add one line to `cairn-implementer.md`: "docs prose: structure to the base guide first (register
    header), then the register".

### 8. Acceptance tests only the structural half of the goal (OWNER FORK)

- **Location:** spec:177-193. Spec:128-131 (R5 "clears the register chain").
- **Defect.** Criteria 1-7 and 9 are structural or tooling checks. Criterion 8 grades the register
  document itself. No criterion checks that the voice survives, although "keep the register" is
  half the goal and the proven tone is the asset at risk. Running R5 through the register chain
  can also redraft the approved page whole, replacing Geoff-approved sentences.
- **Fold (not a fork).** R5 becomes a scoped structural edit: the passages become lists and the
  headings change, while sentences outside those passages stay byte-identical, checked by diff.
- **Fork: who confirms the tone survived?**
  - (a) Geoff reads the R5 diff once for tone, costing one attended read.
  - (b) The register editor returns an explicit voice verdict against the pre-pass page. This costs
    zero attended time but is a self-graded check.
  - (c) Both.

  Recommendation: (a). Geoff alone ratified the tone, and one short diff read is the cheapest proof
  that the half of the goal that worked still works.

---

## Minor

### 9. Leftover floor-era wording in the register

- **Location:** REG:390, REG:164, and spec:79.
- **Defect.** Two register lines conflict with the spec's intent:
  - REG:390, "Dry contract prose", against Google's "don't aim for super-dry".
  - REG:164, "Vale is a floor, not an authority", sits inside the procedure spec:99 keeps "as it
    is", while spec:79 says "floor" becomes "base" throughout.
- **Fold.** Reword REG:390 to "spare contract prose". Carve the Vale procedure out of the rename,
  since that sentence is about Vale, not the guide.

### 10. The digest has several homes and no single source

- **Location:** spec:141-145, spec:154-155, spec:158-159.
- **Defect.** The same roughly ten quotes live in the chain preamble and in the drafter definition.
  The editor's "first lens" presumably needs them too, but `editorPrompt` does not receive `common`
  today (docs-page-chain.js:283-288). Three copies drift apart.
- **Fold.** Keep one copy, in the register's header, which every chain agent already reads first.
  Have `editorPrompt` quote it, or have the two agent definitions point to it. Otherwise add a
  `check.sh` diff between the copies.

### 11. The exemplar pre-check sits in a runtime that cannot run it

- **Location:** spec:151-152.
- **Defect.** The workflow runtime "has no filesystem access" (docs-page-chain.js:350-352 comment).
  Running Vale and markdownlint there needs an extra agent dispatch per exemplar.
- **Fold.** Make it a conductor step at plan time. It runs the gate on each `exemplarSources` entry
  and records the result in the per-type list the plan already keeps (spec:174-175). That costs
  seconds and zero tokens.

### 12. Audit rules dropped without a note

- **Location:** spec:101-114 (R2) and spec:143-144 (the digest).
- **Defect.**
  - S8 (Google headings: "Don't put links in headings") was a one-regex rule in the audit, and R2
    drops it without a note.
  - The digest covers no accessibility rule beyond link text.
- **Fold.** Add the S8 `raw`-scope rule to R2. Add an accessibility line to the digest ("no
  directional-only references; introduce subsections with 'the following sections'").

### 13. The workstation Google voice doc still coaches short sentences

- **Location:** `~/.claude/docs/voice/technical-doc-web.md:24` and its exemplars. Spec:162-166 (W4).
- **Defect.** "One idea per sentence, short sentences" is preloaded into the register editor through
  `writing-voice`. It pulls the editor's ear against the recorded length delta. W4 swaps only the
  procedure exemplar.
- **Fold.** Add one line: "A repo's register may record voice deltas against this standard; within
  that repo they outrank this file."

---

## Over-ceremony check

Little over-ceremony turned up. `Cairn.CodeFont` and the list-capitalization rule are low-value but
cheap. The exemplar pre-check (finding 11) and the triple digest (finding 10) are the only places
where tokens or upkeep exceed the value. The markdownlint revival is justified by S7 and S10.
