# Pass 1b plan fold verification

**Date:** 2026-09-24. **Reader:** `claude-opus-5-5`, fresh context, over HEAD `a621e597`
(plan `docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md`, spec
`docs/superpowers/specs/2026-09-24-docs-reset-pass-1b-validation-design.md`, fold record
`2026-09-24-pass-1b-plan-fold.md`). Rulings O1 to O8 and P1 to P11 were taken as settled.

**Counts:** 0 blockers, 2 majors, 6 minors. Verdict: approvable once the two majors take their
one-line fixes.

## 1. Closure of the review blockers and majors

Every blocker and major in the three plan reviews (CT-B1 to B3, CT-M1 to M13, CT-OF1; MX-B1 to
B4, MX-M1 to M7; RK-B1 to B3, RK-M1 to M7) and SP-B1 to SP-B3 closes at its cited location or
lapses legitimately under O7 (MX-M6, MX-M7 served only the transfer set; RK-M3's filtered-mirror
half served only the miner). Spot checks that hold: development mode (plan:384-388), the
rerun and batch stops (plan:256-260), the authors and the held-out criteria before round 0
(plan:426-433, spec:79-83), the chain and stamp (plan:251-255, 328-330), judge classes and
packets (plan:346-358), thresholds file and capacity (plan:286-295, 501-502), the close's
frozen-path check and dry regression (plan:554-557), SP-B1 (spec:238-241), SP-B2
(spec:177-179, 316-317), SP-B3 (spec:12-13, 437-438; parent amendment lines 54-56).

One cited location does not carry its fold: MX-m10 (minor) cites plan Task 9 for the pass 1
absent lists, and Task 9 does not mention them (minor m1 below).

## 2. Leftovers of cut items

None. Every remaining mention of transfer, Sonnet, or mining in either file is the O7 statement
itself, a pass 1 fact (spec:40, 389), the pass 2a Opus-only line (spec:465), or the Defects4J
citation labeled as a later pass's option (spec:508-509). No round 2, tuner, keep rule, miner,
read-pages, or cut list remains.

## 3. Sequence and freeze

### Majors

- **M1. A gated report stamped before the chain exists has no defined `chainHead`, and no
  fixture proves the scorer accepts it.** plan:253-254 ("the sha256 of the chain file (Task 5)
  when it exists"); plan:386-388; plan:484-485. The chain's first entries are the maps, written
  after the mapping batch runs, so every mapping and held-out report is stamped with no chain
  head. Task 1's stamp type is `{ tag, manifestHash, chainHead }`, and an implementer can make
  the field required; the scorer then rejects the whole precision pool at Task 15. The scorer is
  frozen, so the fix there is a burn (about 3M) or the loss of every precision bar. **Fix:**
  Task 11 writes the chain file's genesis entry (the manifest) at the freeze, so every gated
  report carries a head; or Task 7 adds a fixture: a gated report stamped before the first entry
  scores.
- **M2. Held-out catch packets are first built after the freeze.** plan:351-358, 370-379,
  523-524. Round 0 and round 1 exercise catch packets only for planted runs; the held-out runs
  judge a pre-fix page at `29a03eff` or `3453668f` against a held-out criterion, a shape no Task 6
  fixture covers. A packet-builder defect found at Task 15 is a frozen-script change: a burn, or
  the held-out report is lost. **Fix:** Task 6 acceptance adds one held-out packet fixture (a
  pre-fix page at its pin, a held-out criterion, no plant record), and Task 10 or Task 11 builds
  the three held-out packets dry.

### Minors

- **m1.** plan:442-446: round 0 scores pass 1 jobs that have no absent list, and Task 4
  (plan:313-314) stops scoring on such a job. Fix: Task 9 names the pass 1 absent lists, derived
  by Task 2 over pass 1's builders, `.git` included (MX-m10).
- **m2.** plan:438: Task 8's audit acceptance needs Task 6's `audit-transcripts.ts`, which lands
  later in lane B. Fix: say the audit runs when lane B merges, before Task 9.
- **m3.** plan:253-254, 357-358: the chain file's path (Task 3 and Task 5, parallel lanes) and
  the agreement sample file's format (Task 6 before Task 7) are cross-task contracts. Fix: Task 0
  pins both in its open-choice list.
- **m4.** plan:482-483, 524: the held-out runs share the mapping batch. Fix: make them a distinct
  job id that `path-map.ts`, the precision pool, and the adjudicator skip (the budget's 36
  adjudications already assume this).
- **m5.** spec:276-277 says the plant check sees "the development-set item list"; plan:92 says
  "subjects only". Fix: align on `dev-items.json` (id, subject, page).
- **m6.** plan:158-159: `/tmp/claude-1000/fold2/` is tmpfs and can vanish before Task 0. Fix:
  commit the sims now.

## 4. Budget arithmetic

Holds. Column sums: low 3.9 + 0.3 + 1.2 + 0.3 + 0.3 + 1.5 + 2.1 + 1.0 = 10.6M; mid
5.9 + 0.45 + 1.7 + 0.4 + 0.5 + 2.05 + 2.3 + 1.35 = 14.65M, stated 14.7M; high
8.5 + 0.6 + 2.2 + 0.45 + 0.75 + 2.6 + 2.7 + 2.0 = 19.8M. Line items reconcile: 51 reader runs
(12 + 18 mapping + 3 held-out + 18 planted) at 45k is 2.3M; 39 catch-judge runs (12 pass 1 Opus
planted, 6 round 1, 18 planted, 3 held-out) and 36 adjudications (12 + 6 + 18) at 12k and 20k are
about 1.2M plus the agreement read; six chains at 0.6M to 1.3M plus a half-size gives 3.9M and
8.45M; pass 1's 2.32 + 13.64 + 2.7 is 18.66M. The ceiling (lower of 15M and 20M) and flag (12M)
follow O8. The trip points hold: about 9.6M to 9.9M at the freeze at mid, the flag near the end
of the planted runs; at high the flag trips around round 0 or 1 and the ceiling around mapping or
planting.
