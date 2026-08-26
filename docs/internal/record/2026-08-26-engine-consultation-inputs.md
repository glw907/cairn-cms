# Pre-pass engine consultation: design inputs (2026-08-26)

A point-in-time inputs brief for a future brainstorm, not a protocol. Geoff filed the direction
mid-session on 2026-08-26 and ruled it big enough for its own well-planned pass, likely
including new skills and other Claude infrastructure (agents, hooks, memory). Nothing here is
designed yet; the brainstorm consumes this brief. The ROADMAP Now tier carries the initiative.

## The problem, in Geoff's framing

Site development currently harvests engine friction *reactively*: a site pass builds against
whatever the engine ships, hand-rolls around gaps, files a staging doc of findings, and the
engine absorbs them later, after the site has already paid for the workaround and the engine
pays again to replace it. The 2026-08-26 triage of four ASC staging docs
(`docs/internal/record/2026-08-26-asc-harvest-triage.md`) is the pattern at its most expensive:
weeks of accumulated findings, site-side overrides now slated for deletion, and two engine
passes of catch-up.

The direction: look at the engine changes a site pass needs *before* that pass runs. That
should cost fewer tokens overall (the site never builds the workaround; the engine never
re-derives from a staging doc) and produce better design on both sides.

## Geoff's rulings, the design constraints

1. **A conversation, not a pipeline.** There must be a deliberate exchange between the site
   effort and the engine effort, because engine-change suggestions are not accepted by
   default. Each proposed change is carefully considered; decline-with-reason is a normal,
   recorded outcome.
2. **The standard is any-site, never this-family.** The engine must not evolve into a
   specialty tool for Geoff's collection of sites. It remains a lean, thoughtfully designed
   starting point for *any* site. Family recurrence ("three of my sites need it") is evidence
   toward generality, never sufficient by itself; the test is whether an anonymous cairn
   consumer with no knowledge of these sites plausibly hits the same edge.
3. **Shape, not just membership.** Accepted functionality must be implemented in the form
   easiest for any site to work with, even when that leaves one of Geoff's sites doing a
   little more hand-rolling. The engine re-derives rather than transplants a site's
   implementation; the requesting site adapts to the engine's shape. Worked example: the
   StatusChip register absorption (toolkit-seams pass, Task 2) takes ASC's ratified grammar
   but re-tunes every measured value against the engine's own themes.
4. **The standard applies retroactively.** The existing feature-set gets audited against the
   same any-site test, hunting family-specialty creep already inside the engine. The prime
   suspects are the seams that landed ahead of their consumers from the 2026-08-01 family
   briefs (`createAuthChannel`, `createSectionAction`, `createD1AuditSink`, `/auth-store`,
   `/cloudflare`, `publishedAt`/`newlyPublishedEntries`);
   `docs/internal/engine-harvest-candidates.md` itself flagged the risk of "a seam shaped
   from an unbuilt requirement." Timing matters: reshaping or retiring a seam is a cheap 0.x
   event now and an expensive one after beta, so the audit belongs before the beta line. An
   adversarial per-export sweep is workflow-shaped (an agent per subsystem arguing the
   anonymous-consumer case, a verifier per verdict); the pass plan decides.

## What already exists to build on

- **The consumer-brief precedent.** The 2026-08-01 ASC and xcathletes consumer briefs were a
  one-off version of exactly this exchange: sites filed planned needs, the engine triaged and
  landed seams ahead of their consumers (`/auth-store`, `createAuthChannel`, `/cloudflare`;
  see `docs/internal/engine-harvest-candidates.md` for the assessment method it used).
- **The adversarial test from the 2026-08-26 triage**: an item reaches the engine when the
  site cannot legally reach or patch the surface, or a ratified grammar has diverged; it
  stays site-side when the hand-roll is small, domain-shaped, or a discoverability problem.
  A candidate starting point for the consultation's accept/decline standard, extended by
  rulings 2 and 3 above.
- **The reactive harvest duty** (workstation `CLAUDE.md`, "Engine-level UI mechanics") stays
  as the fallback for mid-pass discoveries; consultation cannot foresee everything. The
  brainstorm should decide how the two interact and what the staging-doc protocol becomes.

## Open questions for the brainstorm

- Where does the exchange live: a brief file per site pass, a standing skill step in
  `site-pass` and `cairn-pass`, a dedicated skill, or some combination? (Prose in a backlog
  is the weakest trigger; the mechanism must fire at pass-planning time on its own.)
- What does the site file (per item: what the pass builds, the engine edge it presses,
  evidence, the site's fallback if declined), and what does the engine answer (accept as a
  queued task with sequencing; decline with recorded reason; defer pending second-consumer
  evidence)?
- How do accepted changes sequence: engine lands first via `link:consumer` or a release
  before the dependent site task, and who owns that ordering?
- Which sessions hold which side of the conversation, given initiative-scoped sessions and
  the one-executor rule; and does the same conductor wear both hats with a fresh-context
  reviewer as the adversarial engine voice?
- What Claude infrastructure changes: new or edited skills, an agent for the adversarial
  triage role, memory entries, hooks?
