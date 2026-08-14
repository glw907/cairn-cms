# The beta-readiness review (Fable, 2026-07-06)

An adversarial pass over the runway to beta against everything actually shipped through
tonight. Beta precedes 1.0 (the beta gate's four rulings stand, 2026-07-02); this review
asks what genuinely blocks the beta cut, what's honestly pending but not blocking, and
the one scope question only Geoff can answer.

## What the arc actually proved (the credentials)

- **The seams held under fire.** Three consecutive release windows — the harvest, the
  chassis restructure + three ports, the ASC build — landed with ZERO Consumers-must
  lines. The phase-2 design suite's four contract changes are additive too. The 1.0
  checklist's first two items are effectively met ahead of schedule; the contract froze
  itself by being right.
- **Seven consumers exercised the stack**: the showcase, three verified theme ports, two
  production sites live on 0.81.0, the ASC build. The "surface stops moving" condition is
  observably true.
- **The enforced boundary is green end to end** (the consolidation's eight-gate sweep),
  the admin exemplar item was already checked, and the docs' reference tier covers every
  export by gate.

## The honest gaps — beta-blocking

1. **cairn.pub is not live.** A beta with no front door isn't one. The Phase-1 plan
   exists (routes, content with the register machinery, deploy); the homepage themes
   section now has four real entries waiting (Waymark + three ports). This is the
   longest remaining pole and it's mostly execution, not judgment.
2. **The theme-building tutorial is owed twice over**: it's the chassis restructure's
   own acceptance test (unexecuted) and the extending-developer story's front door. The
   ontology (one chassis, N themes) isn't real for outsiders until someone can follow it.
3. **The docs' chassis-vocabulary sweep.** The Diátaxis arms still speak the pre-ontology
   vocabulary in places (Waymark-as-template, no chassis concept page). The consolidating
   release that carries the chassis MUST carry its documentation; an undocumented
   ontology at beta poisons the first impression the docs earned.
4. **The ASC completion** — Geoff ruled ASC the final pre-beta proof, and dev is a
   "raw... starting point" tonight: the completion pass (home sections, news images, the
   walkthrough's findings) plus the production cutover are on the critical path.
5. **The consolidating release** (0.82.0-class): the chassis ontology + the tutorial +
   the Part-C admin seams, published as one coherent window before beta's announcement
   references any of it.

## Pending but NOT beta-blocking (decide-and-defer, on the record)

- **create-cairn-site**: recommend it rides post-beta 1.x — the tutorial substitutes for
  the scaffold short-term, and the ports/rebuilds have now generated the evidence the
  scaffolder was waiting for. Building it pre-beta trades weeks for polish beta doesn't
  need.
- **The checkOrigin (kit#15992) decision**: the watch routine holds it; decide at the
  1.0 cut, not beta.
- **Topo + the handbook**: consumers of the beta, not gates of it (cairn.pub's docs door
  can launch on the existing rendering; Topo upgrades it when ready).
- **The small carried items**: the live admin smokes, the CrewLAB sentence, SECURITY.md's
  go-public trim — days-of items, none structural.

## THE scope question (Geoff's, and it's the schedule)

**Does beta wait for phase 2?** Geoff's ruling ("the ASC site as the final before the
beta... building out the admin interface will yield interesting results") reads two ways:
- **Phase-1-gates reading**: beta cuts when the ASC public site completes and cuts over
  — weeks away, with phase 2's seam lessons landing as post-beta releases.
- **Phase-2-gates reading**: beta waits for the admin build-out's "interesting results"
  — a month-plus away, but beta ships with the extending-developer seam production-proven.
The suite's Part-C changes are additive either way, so the CONTRACT risk is identical;
the difference is purely what "final proof" means. Recommend the phase-1-gates reading
(beta is a statement about the public contract, which is already proven; the seam's
production proof is a great 1.x story) — but this is precisely the product call the
review exists to surface, not make.

## The recommended order (post-Fable, Opus-conducted)

ASC completion pass → the ASC cutover (Geoff's go) → the tutorial + docs chassis sweep →
the consolidating release → cairn.pub Phase 1 → the beta gate mechanics (already decided)
→ beta. Phase 2 proceeds in parallel after the cutover, per the coexistence strategy,
landing as 1.x releases unless Geoff takes the phase-2-gates reading.
