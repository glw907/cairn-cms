# The pre-beta harvest ledger

Every engine and Waymark improvement or affordance surfaced by the rebuild and port efforts,
in one place. The strategic frame (Geoff, 2026-07-05): beta is close, and this window is the
last chance to make BREAKING changes without troubling users — so each entry answers
"does the right version of this break the surface?" and prefers the breaking answer now
over a compatible shim forever. Every rebuild/port workflow's findings consolidate here;
the harvest engine pass executes the queue.

Status: LANDED / QUEUED (harvest pass) / CANDIDATE (needs triage) / PROCESS (method, not code).

## The site contract (Geoff, 2026-07-05: explicitly open to improve/break/extend)

The adapter and seam contract itself — defineConcept, fieldset, the component grammar, the
render seam, the delivery exports — is open for breaking improvement in this window. The
discipline: every contract break traces to REBUILD/PORT EVIDENCE (a schema that fought, a
seam that forced a workaround), never speculation, and the charter's leanness bar still
governs what gets added. Migration cost carries ZERO weight for the two owned sites
(Geoff, 2026-07-05: not worried about reworking ecxc/907 to follow) — the only consumers
are ours until beta, which is the whole point of the window. Known contract questions awaiting evidence-driven answers:

- **The composed-page seam** — CANDIDATE. ecxc's panel/split/section directives and Foxi's
  pricing/testimonial blocks both ask whether a one-off composed page fits Posts/Pages or
  wants a first-class answer. Two evidence sources converging; the ports will settle it.
- **The album/collection question** — CANDIDATE. hugo-theme-gallery's port asks whether
  "album" lives in Page frontmatter or demands the content model grow; pairs with the
  deferred gallery enabler (image/array component attributes).
- **The component grammar's limits** — CANDIDATE. The ecxc redo's verdict arrives with the
  schemas the v2 grammar fought; each is a fieldset/defineComponent break candidate.
- **The render seam's shape** — QUEUED-adjacent. The rehype-plugins parameter (below) is
  the minimal form; the evidence may justify the fuller break (a composable pipeline
  contract instead of one closed factory).

## Engine

- **The rehype seam on createRenderer** — QUEUED. Two independent friction hits (the
  table-scroll wiring, both directions). The right shape may be BREAKING: a plugins
  parameter on the pipeline factory's options, worth restructuring the factory signature
  now rather than bolting on.
- **Table-scroll as a built-in default** — QUEUED-CONFIRMED (second independent miss: the ecxc redo repeated 907's exact wiring gap). Default-on with opt-out
  kills the silent two-part contract. Behavior change to rendered output: breaking-adjacent;
  do it pre-beta.
- **Sitemap extra-routes** — QUEUED. The helper's signature grows an extra-routes list +
  the unlisted-route build check. Additive, but if the helper's shape is wrong, fix it
  breakingly now.
- **The fluid-clamp compounding class** — LANDED (the retune). Engine lesson: two fluid
  mechanisms must never share an axis range; the design doc carries the posture.
- **check:readiness docsAnchor coupling** — CANDIDATE. Code anchors into doc headings drift
  when docs rename; consider generating the anchor map or gating bidirectionally.

## Waymark

- **The theme toggle** — LANDED (unpublished window). The extensible-lens gap, closed.
- **The theme-layer pattern** — PROVEN twice (the cairn theme, 907), third proof owed by
  the ecxc redo's flexibility test; the port slate stresses it four more ways.
- **The stacked-masthead side effect** — CANDIDATE, Geoff's eyes (flagged with screenshot).
- **The flourish-gate default question** — CANDIDATE: [data-flourish] ships dark; nothing
  in-template demonstrates enabling it (907's audit found it unset anywhere). Decide the
  demonstrated path.
- **Prose flow-spacing: `.prose p { margin-block: 0 }` beat the owl selector** — LANDED
  (aea6625): a specificity bug zeroing every paragraph's flow margin on every Waymark site;
  found by a reader's eye on one dense section, root-caused by computed-style dump. Ledger
  lesson: the template's flow system needs a computed-margin assertion in its tests.
  (Formerly: CANDIDATE pending the 907 polish diagnosis (the
  epoll section's missing paragraph gaps may be a template prose.css bug, not site-local).
- **Blockquote scale** — CANDIDATE: the template's step-up italic treatment read as a
  pull-quote collision on a real technical post; consider a quieter default.

- **CairnHead never appends the site-name title suffix** — CANDIDATE (ecxc redo): every
  site hand-builds its title convention; an optional titleTemplate on the head component
  may be the affordance.
- **The theme-layer flexibility claim: PROVEN** — three themes (cairn, 907, ecxc), the
  hardest a full club rebrand with ZERO chrome edits and no template findings.

## Component library

- **ecxc's 18-to-13 rationalization findings** — CANDIDATE, arriving with the redo's
  verdict: every schema the v2 grammar fought, the composed-page seam question (Foxi will
  re-ask it), the gallery/album concept question (the port slate re-asks it with evidence).

## Process (the method improvements, binding already)

- **Device-catalogue fidelity audit BEFORE building** any port/rebuild theme (the 907
  lesson; now the first task of every port).
- **CI is the canonical baseline renderer**; the regen dispatch is the mechanism.
- **Side-by-side crops per typographic device** before a deploy is called done.
- **Architecture statements go in locked-calls lists**; unattended workflows get
  conformance gates between tasks.
- **Exit codes verified bare, never through pipes**; gates re-run after the edit they bless.
