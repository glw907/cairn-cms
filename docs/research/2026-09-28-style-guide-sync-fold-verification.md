# Style-guide sync spec: fold verification

Fresh read of the fold at `1de21f9e` (spec), against the pre-fold spec at `36f50347`, the fold
record, and the four reviews. Spot-checked against `draft-docs-0` (now `5aa40faa`, PR #91 head),
`scripts/checks/docs-gate.mjs`, `scripts/checks/shipped-anchors.json`, `.github/workflows/test.yml`,
`~/.claude/workflows/docs-page-chain.js`, and `pass-execute-chains.js`.

**Counts:** 0 blocker, 2 major, 8 minor.

**Verdict.** The fold is sound. Every blocker and major in the four reviews closes at the cited
location except one partial (C-M7's promotion trigger, minor m7). The two majors are one build-order
loop and one consent gap on the rulings text. Both have two-line folds. The spec grew from 231 to
384 lines. Most of the growth carries real fixes (the rollout mechanism, the controls, the W3
scoping), and the fixes are findable. The trims are in the minors.

## Q1. Did each blocker and major close?

| Review item | Closed at | Status |
|---|---|---|
| K-B1, X-B1, C-M6 rollout | spec:188-196, criterion 5 (:312-313) | Closed. The `--filter` pass is probe-proven (X "What the probes settled") |
| K-M1 proof run | criterion 7 (:316-320) | Closed, with a negative control |
| K-M2, X-M2, C-m2 harness and pin | :172-179, criterion 3 | Closed. CI order verified: Vale at `test.yml:94`, docs gate at `:108` |
| K-M3 cross-chain | :113-115, :342-343 | Closed, but see major 1 (join order inside) |
| K-M4, G8 tone criterion | G3 (:30-31), criterion 9, owner ruling 1 | Closed |
| K-M5 ruling 2 invariant | criterion 8 (:321-323) | Closed |
| K-M6 warning rules on R5 | criterion 9 (:324-325) | Closed |
| G1, C-M1 tone as override | :52-62, :131-132, :141-142, :264-265 | Closed. Raises major 2 |
| G2 positive voice | :135-142, :246-248 | Closed, but the specimen causes major 1 |
| G3 editors-arm grading | :265-271 | Closed |
| G4 reviewer order | :158-159 | Closed |
| G5 fence | :66-67, :128, :357-358 | Closed |
| G6, X-M3 exemplars | :289-297 | Closed |
| G7 writers outside chain | W5 :283-285 | Lens closed. Gate path for the reference arm open (m7) |
| X-M1 branch base | :346-349 | Closed. The evidence has moved since (m5) |
| X-M4 pre-check runtime | :294-297, :360 | Closed |
| X-M5 heading split | :180-187 | Closed. The settled wh-opener call is backed: the register kills "What each posture emits" (register :82-84) |
| C-M2 metaphor | owner ruling 2 | Raised as a fork, correctly |
| C-M3 `f:1ij5h5` | :228-229 | Closed |
| C-M4 edits after the chain | :229-231, criterion 9 | Closed |
| C-M5 branch stacking | owner ruling 3 | Raised as a fork, correctly |
| C-M7 pinned anchors, promotion trigger | :183-185, :194-195 | Exemption stated (m1). Promotion trigger deferred, not closed (m7) |
| C-M8 meaning preservation | :160-167, criterion 2 | Closed |

## Findings

### Major 1. R1 needs a specimen from R5, and R5 needs R1

- **Where:** spec:140-141 ("It adds one 'structure plus voice' specimen taken from R5's rebuilt
  page") against :344 ("R1 first (R2's rules and R5's page cite it)") and :113-115 (R5 runs after
  the join).
- **Defect:** R1 opens chain R. R5 runs only after both chains merge, and its headings "meet R1's
  rule" (:227). R1 cannot quote a page that does not exist yet. Executed as written, the R1 task
  either stalls or invents the specimen. An invented specimen is the very thing G3 guards against.
  Criterion 1 and criterion 8 also read the register before the specimen can exist.
- **Fold:** R1 lands without the specimen. Add a join step, R1b, that adds the specimen from R5's
  accepted page. Order the join R5, criterion 7, R1b, criterion 8, so the register review reads the
  final register.

### Major 2. The fold rewrote Geoff's ruling text without asking him to confirm it

- **Where:** spec:44-81, under "Rulings (Geoff, 2026-09-28)" and "approved design". Also
  :83-85, which lists only three questions. Fold record :115-121.
- **Defect:** the fold added ruling 2's tightening test. It moved "Measured, not casual" from
  tightening to override and gave it a row with Geoff's evidence. It added the changelog and
  cairn.pub to ruling 1, and it reworded rulings 4 and 6. The fold record says "Geoff reviews these
  with the owner rulings". The spec never says so, and it still attributes the text to Geoff. The
  new rule it writes says an exception exists "only by Geoff's recorded ruling". A tone row recorded
  without his read would be the self-licensing the goal forbids, on the rule's first use. The
  substance is settled (he wants the academic tone kept), so this is a confirmation, not a fork.
- **Fold:** add one line under Owner rulings: "The fold edited rulings 1 to 4 and 6 (list). Your
  answers also confirm those edits, including the tone and sentence-length exception rows." Mark
  the fold-edited clauses in the Rulings section.

### Minor m1. The pinned-heading exemption is stated from memory and not needed this pass

- **Where:** spec:183-185 and :367-368.
- **Defect:** `shipped-anchors.json` holds anchor slugs (`"is-it-working.md#youre-not-on-this-sites-editor-roster"`),
  not heading text. Vale's `exceptions` field is static YAML. An exemption "sourced from" the JSON
  therefore needs either a YAML generator with a drift check, or a post-filter in the gate. No
  review probed either. The only page this pass promotes is R5's, and it carries no pinned heading.
- **Fold:** replace the sentence with "a pinned heading gets an exemption before its page is
  promoted (first needed at the admin stage, for `is-it-working.md`)". Drop the open item.

### Minor m2. The chain cannot "read" the promoted list

- **Where:** spec:189-190, :254.
- **Defect:** the workflow runtime has no filesystem access (`docs-page-chain.js:352`), and
  `valeErrorRules` is a verbatim string in the chain header (`:33`, `:162`). The conductor pastes
  the list. That copy only feeds the drafter forward. The `--page` gate enforces the list.
- **Fold:** "the plan's chain header copies the list into `valeErrorRules`, and the `--page` gate
  enforces it".

### Minor m3. The harness has two homes, and one runs on every chain round

- **Where:** spec:178.
- **Defect:** CI already runs the docs gate after the Vale install (`test.yml:94-108`), so "in CI
  after the Vale install step and in the docs gate" names one run twice. In `--page` mode, the
  harness would also rerun every fixture for every chain page, every round, in every later stage.
- **Fold:** run the harness in the docs gate's tree mode only (CI and close).

### Minor m4. R1 is reviewed twice, and the first review uses the old lens

- **Where:** spec:339-341 (R1 takes one `register-check` in chain R) and criterion 8.
- **Defect:** the chain-R `register-check` runs before W3 lands, so the old editor lens grades the
  new register. Criterion 8 reads it again at the join, under the new lens. That spends one full
  three-gate review for a verdict that criterion 8 supersedes.
- **Fold:** drop the chain-R `register-check`. Criterion 8 is R1's review.

### Minor m5. The pin and the concurrent-executor risk are stale

- **Where:** spec:10-12, :378-381. Fold record :17-21.
- **Defect:** `draft-docs-0` and its origin now sit at `5aa40faa` (PR #91's head, open and
  mergeable). That commit changed `choose-an-ai-posture.md:49-52`, R5's page, so "unchanged in
  committed state since `b8bfd30f`" is false for that page. The `draft-docs-0` worktree is now
  clean, and no process names it. The R2b line citations (`:99-103`) still hold; the edit is net
  zero lines.
- **Fold:** re-pin to `5aa40faa` and correct the page sentence. Rewrite the risk as a precondition
  check (the STATUS line still needs confirming at branch time).

### Minor m6. W1 names the wrong gate

- **Where:** spec:338-339.
- **Defect:** "`--pin scripts` plus the harness" is a cairn gate. W1 lives in `~/.dotfiles` and
  gates on `scripts/check.sh` (criterion 12).
- **Fold:** name the dotfiles gate for W1.

### Minor m7. The reference arm still has no path to the promoted rules

- **Where:** spec:193-195. The fold record (:84) marks C-M7 folded.
- **Defect:** a reference page joins the promoted list only when it is chain-accepted under the
  new lens. The implementer writes reference pages every pass outside the chain (W5), and no stage
  schedules a reference rerun, so the most-edited arm never gates structurally. That is a deferral,
  not a closure. It cuts into the goal's "not sacrifice" half, on the lens alone.
- **Fold:** record the deferral explicitly. File a ROADMAP entry whose trigger is the reference
  arm's promoted-rule count, measured when R2a lands. If the count is small, a one-task sweep at a
  named stage promotes the arm wholesale.

### Minor m8. The byte-identical check for R5 has no baseline

- **Where:** spec:228, criterion 9.
- **Defect:** the page changed at `5aa40faa`, so "byte-identical" needs a named base commit and a
  method (a sentence-level diff against that commit, limited to sentences outside the listed
  passages).
- **Fold:** name both in R5.

## Q2. Contradictions and build order

- Build order: major 1 is the one loop. With R1b added, the join is ordered, and the chains are
  otherwise buildable. `pass-execute-chains.js` takes a `repo` per chain (`:212-222`), so a chain in
  `~/.dotfiles` is supported. W's changes reach the live `~/.claude` only after they merge to the
  dotfiles checkout, which the "after both chains merge" join already requires.
- The branch preconditions (:346-349) are consistent with both answers to owner ruling 3.
- The sections contradict each other in one place only: W1's gate (m6).

## Q3. Mechanisms stated from memory

| Mechanism | Evidence | Verdict |
|---|---|---|
| Promoted list read by the gate | trivial JSON read in `docs-gate.mjs` | Fine |
| Promoted list read by `valeErrorRules` | contradicted by the runtime (no filesystem access) | m2 |
| `--filter` second pass | X probe, both pins; Vale exits 0 on warnings, so the gate must parse the JSON output, which X-B1's fold names | Proven |
| markdownlint scoping to page and promoted pages | a file-list argument; X probe on the version | Proven enough |
| Harness in CI after the Vale install | `test.yml:94` and `:108` | Proven. Redundant home (m3) |
| HeadingForm split, `= NO` under editors | X-M5 probe, both pins | Proven |
| Pinned-anchor exemption from `shipped-anchors.json` | the file holds slugs; no probe | m1 |
| R5 byte-identical | no method named | m8 |
| Positive and negative controls | criteria 7 and 8. `editorPrompt` is extractable by the existing marker pattern in `docs-page-chain-derivation.test.mjs` | Buildable |

## Q4. Can Geoff rule the owner forks?

- **Ruling 1 (read R5's diff):** yes. The cost (one attended read) and the alternative (an agent
  grading its own prompt) are both stated. It is a genuine attended-time call.
- **Ruling 2 (metaphor):** yes. It quotes Google and notes that no evidence is on record. One gap:
  it does not say which live pages lean on the allowance. No sweep follows either answer, so this
  does not block the ruling.
- **Ruling 3 (PR #91):** yes. The evidence is now stronger than the spec states, since PR #91 is
  open and mergeable at `5aa40faa` and the worktree is idle (m5).
- **Settled calls:** the X-M5 wh-opener call, the pin bump, S8, and the exemplar capture are
  correctly settled. The tone row is settled in substance but needs Geoff's confirmation (major 2).
  No fork is actually settled.

## Q5. Does it meet both halves of the goal? Over-ceremony, ranked by cost

The structural half is met: the digest, the guide-first lens with forced `blocking`, the promoted
ratchet, and structural gates on R5 and on each page later accepted. The reference arm stays
lens-only (m7). The tone half is met: G3, the positive voice definition, the voice model in
`common`, R5's scoped edit, and criterion 9, with major 1 fixing the specimen's source. The spec
keeps the register and records its departures, which is the goal as stated.

Over-ceremony, highest cost first:

1. The harness in `--page` mode (m3) is a recurring cost on every later chain round.
2. The duplicate R1 review (m4) is one full three-gate review.
3. The pinned exemption mechanism (m1) is built a stage early.
4. Text bloat. The Risks entries "Concurrent executor" (stale) and "Tone flattening" (a restatement
   of G3) can go. The 26-word fence appears three times (:66-67, :128, :357-358) and needs one
   home. These trims recover about 15 lines. Nothing else is buried.

The meaning ledger (criterion 2) and the two controls are proportionate. Keep them.
