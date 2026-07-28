# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting and
building cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog file.
A finding here does not block the doc that found it.

Record each finding with its perspective and a short note. The perspective is `developer` (the
integrator building and deploying a site), `editor` (the non-technical author working in `/admin`),
`maintainer`, or `operator`.

This log holds only live findings and the tombstones below. Resolved findings are pruned here once
shipped; their detail lives in the per-plan post-mortems and `docs/STATUS.md`, the homes for shipped
history. The append-only prose that accumulated through 2026-06-26 was pruned on 2026-06-28
(extensibility Plan 1), and the full backlog was cleared on 2026-07-16 by the friction-triage pass:
every open finding was verified against the code and then either shipped, filed into `ROADMAP.md`
with its trigger, or found already resolved and pruned. Git history holds the full record of both
clearings.

## Tombstones (decided, do not resurface)

- **Point-of-typing writing coach.** KILLED 2026-06-26. The help-shell adversarial review discarded it
  as the Clippy pattern. Do not re-propose a per-keystroke formatting coach.
- **`runtime.publicMediaResolver`.** DROPPED 2026-06-24. An adversarial review, verified first-hand,
  found it inverts the prerender/Worker boundary and that the "three wire-points" was a miscount of two,
  both prerender-side and already sharing one `cairn.config` export. The real wart (silently broken
  public images) is fixed instead by the `media.resolver_absent` warn event at `createPublicRoutes`
  construction. Do not re-propose the runtime member.
- **`CairnMediaLibrary`'s dormant "type facet" (a hidden Images/Documents filter).** RESOLVED
  2026-07-20, admin-toolkit review-fixes round. The pass's T8 drift-hunt had filed this as a live
  open finding, attributing the facet's absence to T6's `ListToolbar` re-expression; `git log`/`git
  show` on `CairnMediaLibrary.svelte` instead confirm the facet was removed three weeks earlier, in
  the 2026-06-28 charter-adherence pass (`23abe438`, "the speculative Media Library type-facet is
  removed"), as inert scaffolding for a second stored asset type that has never existed. T6 never
  carried it forward because it was already gone at the branch point. The delivery route is still
  image-only today, so the charter's "we don't accommodate that universe" stands: do not re-add it
  speculatively. `ListToolbarFilter`'s `promoted: false` seam covers the same hidden-until-needed
  shape if a real second asset type ever ships.

## Open findings

The log was cleared 2026-07-16 and again 2026-07-19 (the dev-backend pass): every open finding
was verified against the code and then either shipped, filed into `ROADMAP.md` with its trigger,
or found already resolved and pruned. Git history holds the full record of both clearings. New
findings start fresh below this line.

- **(developer, 2026-07-19, chassis-nav pass)** `guides/add-an-island.md` teaches importing
  `{ cairn }` from `$lib/cairn.config` inside the root layout's client script to reach
  `cairn.rendering.islands`, which ships the whole adapter (renderer, icon set, media manifest)
  to every public page. The showcase itself avoids this with a lean islands-registry module plus
  a `hasIslands` server-load flag (`examples/showcase/src/routes/+layout.server.ts`), and the
  chassis-nav pass just rewrote the tutorial's Milestone 7 off the same client-import pattern
  for nav. The guide should teach the registry-split shape the showcase models. Filed into
  ROADMAP (Next).
- **(maintainer, 2026-07-28, design infrastructure Pass 2, Task 11)** Documenting the card-shell
  container role surfaced that the safelist mechanism (`@source inline(...)` in
  `scripts/admin-css.input.css`) has no test guarding its own comment against drift: the "eleven
  grammar role utilities" count in that file's comment, and the matching count in
  `docs/reference/admin-grammar-tokens.md`, are both prose a human has to remember to bump by hand
  every time a role utility is added, the same class of failure `grammar-tokens.test.ts` already
  catches for the safelisted CLASSES themselves but not for the two comments that state the count.
  A low-cost fix: a unit assertion that parses the `@source inline(...)` line's own token count and
  compares it against `GRAMMAR_TOKENS.length` plus a hard-coded container-role count, so a future
  addition fails a test instead of leaving a stale number in two places. Left as a candidate rather
  than shipped here, since Task 11 is scoped to the two new utilities, not a new test substrate.
- **(maintainer, 2026-07-28, design infrastructure Pass 2, Task 12)** Writing the form-row/label
  register surfaced a one-step weight delta from ASC's own two-level label ruling: ASC's individual
  field label is weight 600, and every individual-field label already in cairn's admin (a dozen-plus
  call sites, predating this ruling) is `font-medium` (500). The register documented here keeps 500
  as cairn's own value, since reweighting every field label to 600 sitewide would move pixels well
  beyond this task's ratified header-line changes. Whether cairn's field labels should bump to match
  ASC's literal number is an open question for a future ruling, not shipped here.
- **(maintainer, 2026-07-28, design infrastructure Pass 2, Task 13)** The norms manifest is
  committed and freshness-checked, but the check needs a browser and a running showcase preview, so
  it is publish-gated rather than a per-push gate (spec 6.4 explicitly keeps it out of the `check:*`
  hot path). The consequence is a staleness window: a change to the admin's rendered appearance
  leaves the shipped manifest wrong until someone runs `npm run norms:generate`, and nothing says so
  until a release. The cheap tightening, if the window ever bites, is to run `norms:check` in the
  existing `e2e` workflow, which already builds and serves the showcase, so the marginal cost is one
  step rather than a second browser job. Left unshipped here because the plan scopes the gate to
  CI/publish and a per-PR norms failure would block work on an advisory-tier artifact.
- **(maintainer, 2026-07-28, design infrastructure Pass 2, Task 14)** The rendered harness's
  `'menu-open'` interaction state is a first pass, not a proven one: `applyState` clicks the first
  `[aria-haspopup="menu"]`/`[aria-haspopup="true"]` element it finds, a guess at "the conventional
  menu trigger" that has never run against the showcase's real dropdown or command-palette markup
  (co-located as a `WATCH:` comment in `src/lib/audit/rendered.ts`). Tasks 15 and 16 are the first
  real consumers of the state; whichever of their rules needs it first should confirm the selector
  against real markup or correct it, rather than the mechanism shipping unverified indefinitely.
  Also worth a future ruling: `cairn-audit --rendered`'s CLI flag still declines to run (the
  placeholder message from the skeleton commit), deliberately left that way since the shipped rule
  registry is empty; whichever of Tasks 15/16 first registers a real rule should also decide whether
  wiring the flag happens then or waits for the full eleven.
