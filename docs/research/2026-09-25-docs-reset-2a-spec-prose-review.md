# Pass 2a spec: prose review

Reviewer: `prose-voice-reviewer` (`claude-opus-5-5`), 2026-09-25, on
`docs/superpowers/specs/2026-09-25-docs-reset-pass-2a-design.md` and the parent's pass 2a
amendment section at `73e09d7b`. Saved by the conductor from the agent's report. Specs are not
register-graded; the review checked fidelity and cross-section consistency first.

Fidelity: every checked figure and code reference matches the source (1b unit costs and budget
arithmetic, the Wilson and Clopper-Pearson intervals, the tuning figures, the eight on-map plants,
the round 1 rule-candidate quotes, `REPORT_REQUEST`, `runner.ts:731-734`, `class-schema.ts:68-69`,
`score-assemble.ts:418`, and the chain's line references).

## High

- **H1 (:429-431).** The recommendation for option (b) claims the chain build benefits from "a real
  drafted page" supplying the fixture and from known gating classes. The body contradicts both:
  3a's fixture comes from the smoke run's shape, and CR5 makes `gatingClasses` an argument. Rewrite
  the rationale as a plain deferral of 2.2M to the pass that first uses the chain.
- **H2 (:19-24, :28-29, parent :86-87).** O12 is quoted without its 6M ceiling and 0.6M pilot, and
  B3 never says it replaced them; STATUS and ROADMAP still carry 6M. State that B3 replaced O12's
  figures, explain the pilot's 1.2M against O12's 0.6M, and have §8 update STATUS and ROADMAP to
  the ceiling ruled under owner ruling 1.
- **H3 (:223).** "pass A's 14 defects" is stale; the parent corrected it to 19.

## Medium

- **M1 (:56-60, :255-256 vs :247-249).** A failed decline escalates "in every class" while an
  unapplied advisory item passes, so ignoring beats declining. Either record a failed advisory
  decline like an unapplied advisory item, or record unapplied advisory items as unresolved too;
  add an advisory-class acceptance case either way.
- **M2 (:261-262).** "The pilot's precision bar bounds" false chain items fails on a no-go, and five
  development control runs bound nothing about production pages. Restate: on a go the bar is the
  only estimate; on a no-go the decline path is the only per-item check.
- **M3 (:414-427).** Owner ruling 1 leaves unclear where (b)'s moved 2.7M is charged and what each
  option costs in pages ("about 10" is about 11 at 0.7M). Define the flag once.
- **M4 (§3, §6, §2 Record, :369-372, budget).** Nothing says what happens to §3 and the gap fills
  under (b). Add a line at §3's head and in §6 that they move whole to the first drafting pass and
  pass 2b, and that the pilot record hands over the gating classes.
- **M5.** No order or independence across §3 to §6. State the order; 4a is independent of §1 to §3.

## Low

- **L1 (:31-32 vs :143-144).** CR1's cap arithmetic: a `wrong[]`-only change caps at 10 of 16, or 12
  if P05's reading carries.
- **L2 (:287-288).** Exemplar ids should be `<dir>/<slug>` using the store's plural audience
  directories and the manifest's Local path.
- **L3 (:158).** "Every run gets the runner's one rerun" reads as every run happening twice.
- **L4 (:37 vs :185).** CR3 and §2 disagree on what the recall bar is; the bar is the count, chosen
  from the Wilson interval.
- **L5 (:95-106).** The two-deliverable rule is met by count, not size; say so, or move 1a's comment
  carries into 1b.
- **L6.** The opening paragraph should say why the pass exists and that owner ruling 1 decides
  whether §3 stays; replace "the honest estimate" with "the recomputed estimate"; split 1c
  deliverable (2).

## Parent amendment

- **P1 (parent :78).** The precedence clause is self-referential and does not settle conflicts with
  the pass 1b amendments. Rewrite: "Where this section and any other line of this spec disagree,
  the amendment sections above included, this section wins."
