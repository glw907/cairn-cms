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
  **Task 18 rider:** the job had also never RUN, on any CI, since `publish.yml` was its only home
  and dispatching that workflow attempts a real npm publish, so the first proof of it would have
  arrived at a release. Task 18 extracted it to `.github/workflows/norms.yml` as a reusable
  workflow carrying both `workflow_call` and `workflow_dispatch`; `publish.yml` calls it and still
  gates on it, so there is one definition and the render is now rehearsable against any branch.
  The staleness window this entry names is unchanged, and so is the e2e-workflow tightening it
  proposes.
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
- **(maintainer, 2026-07-28, design infrastructure Pass 2, Task 15)** Both Task 14 carry-forwards
  above are closed here, so they need no further tracking: `applyState`'s `'menu-open'` selector was
  confirmed against the admin's real markup and corrected (every dialog trigger in the admin declares
  `aria-haspopup="dialog"`, which the menu-only selector could not reach, so the entire dialog surface
  was structurally outside every rendered rule while the run reported those pages clean), and the
  `--rendered` flag is wired now that the registry carries six real rules.
- **(maintainer, 2026-07-28, design infrastructure Pass 2, Task 15)** The rendered allowlist entry
  shape (`{page, selector, reason}`, ratified at Task 14) carries no rule id, so an entry written to
  exempt one rule silences every rule that reports the same selector on the same page. The two
  graduated gates make this concrete: `check-touch-targets`'s five rows name button selectors that
  `interactive-contrast` and `chip-ground-collision` could equally report. Nothing has collided yet,
  and adding an optional `rule` field is cheap, but it is a consumer-visible shape change and belongs
  to Task 17's evidence rather than a guess here.
- **(maintainer, 2026-07-28, design infrastructure Pass 2, Task 15)** A real 44px miss on the
  showcase theme, carried rather than ruled: the tag-filter chips on `/` render 43.78px wide against
  the floor, a padding-math shortfall the touch-targets graduation surfaced. It is suppressed with
  that reason in `scripts/check-touch-targets.mjs`'s allowlist so the finding stays counted and
  printed. Closing it moves the `site-visual` baselines, so it belongs to a theme pass.
- **(maintainer, 2026-07-28, design infrastructure Pass 2, Task 18)** `check:version` cannot see the
  `## Unreleased` window at all, which is not what the pass assumed when it asked for the
  `<!-- release-size: minor -->` marker to be confirmed. `checkVersion` matches only
  `^## (\d+\.\d+\.\d+)` headings, so the top entry it sizes is the last PUBLISHED one, and the body
  it scans for a marker runs from that heading to the previous one. A marker in the Unreleased
  window is therefore inert: the gate reported `OK (patch)` for `0.90.1` both before and after the
  marker landed. The marker is still right, and it now sits in the window, but it is a
  forward-declaration nothing checks until the cut renames the heading, which is exactly the moment
  the release doctrine wants to be cheap and mechanical. Verified by simulating the cut against the
  exported `checkVersion`: with the marker `{ok: true, bump: 'minor'}`, without it the miss.
  A cheap tightening, unshipped here because it changes a gate outside this pass's scope: have
  `check-version.mjs` also read the `## Unreleased` window, assert it carries at most one marker,
  and run the same size rule against a simulated cut so a missing marker fails on the pass that
  earned it rather than on the release that trips over it.
- **(developer, 2026-07-28, design infrastructure Pass 2, Task 18)** The upgrade guide keys its
  entries by version, so an unreleased window is written under a `## Unreleased: <summary>` heading
  that a human renames at the cut. Nothing checks the rename. A published guide could ship with an
  `## Unreleased` heading above a section describing a version that has a number, and the failure
  is silent and consumer-facing. The trigger is machine-detectable, so it wants a gate rather than a
  note: assert that `docs/guides/upgrade-cairn.md` carries an `## Unreleased` heading if and only if
  `CHANGELOG.md` does. `check:docs` is the natural home.
- **(developer, 2026-07-28, design infrastructure Pass 2, Task 18)** The `cairn-audit` reference
  page had grown task by task through rendered mode and the norms query while STATIC mode, which is
  what the bare `npx cairn-audit` invocation runs, went undocumented: no rule list, no config file,
  no suppression idiom. The page's own opening code block advertised the command with nothing behind
  it. Closed here, so it needs no further tracking, but the shape is worth naming: a reference page
  written incrementally alongside the tasks that add surface documents whatever the current task
  touched, and the default path is the one no task ever touches.
- **(developer, 2026-07-28, design infrastructure Pass 2, Task 18)** Documenting the rule-declared
  exemption surfaced that the mechanism, as shipped, is reachable only by cairn. `border-contrast`'s
  exemption keys on the literal custom-property name `--cairn-card-border`, so a consumer with an
  equally ratified hairline of its own has no way to declare one; the only consumer-side authority
  is the page+selector allowlist, entry by entry. The reference page now describes the exemption
  honestly as a rule-owned mechanism, but the asymmetry is real, and it is the same shape the
  calibration found from the measurement side (`docs/internal/2026-07-design-infrastructure-audit-calibration.md`,
  section 5.1). Filed into ROADMAP (Next) with the other rule-repair follow-ups.
- **(maintainer, 2026-07-28, design infrastructure Pass 2, Task 15)** The rendered audit's first
  honest own-tree run reports 160 errors across the six admin routes in both themes, and 138 of them
  are `touch-targets`: the admin is built on `btn-sm` (32px), `btn-xs` (24px), and 30px toolbar
  controls, essentially none of which clear 44x44 at a 390px viewport. That is a real design question
  the audit surfaced rather than a rule defect (spot-checked against the rendered admin), and it is
  too large to answer inside the task that found it. It wants a ruling: either the admin's compact
  control scale grows at small viewports, or `touch-targets` is scoped to something narrower than
  every control on the page. Task 17's calibration is where the evidence for that choice lands.
