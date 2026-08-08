# Roadmap

cairn-cms runs two production sites today, [ecxc.ski](https://ecxc.ski) (formerly ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions; the latest published
release is `0.90.1`. The author is still working through the core-feature roadmap, and the project stays
closely held until that core lands.

This roadmap is a direction, not a commitment. Priorities shift as the production sites surface needs,
and items move up from lower tiers as the core fills in.

**This file is a pass dimension.** A pass that ships a roadmap item marks it done and removes it from the
live tiers, and a pass that surfaces a new direction files it into the right tier, the same way a pass
updates its reference docs. Shipped history lives in `docs/STATUS.md` and the per-plan post-mortems, not
here, so this file stays a forward view.

## Toward 1.0

cairn is `0.x` on purpose: it still breaks public seams between minors while the core lands, and SemVer
reserves `0.x` for exactly that. `1.0` is not a maturity badge; it is the commitment that breaking a public
seam becomes a major-version (`2.0`) event, which the charter already calls "a deliberate major-version
event, not an everyday one." Cut it when the surface stops moving, not on a date.

**Release mechanics per phase (Geoff, 2026-08-05, the harvest sitting).** The `0.94.0-rc.1`
candidate **published 2026-08-05** to the `next` dist-tag, a one-time guard for the current window,
which is the largest breaking window to date and is proven only against the self-authored showcase;
it is not a pattern, and later pre-beta cuts go straight to the final number with patches as the
correction channel. The publish workflow now derives its dist-tag from the version, so any
prerelease lands on `next` and `latest` keeps serving the last stable, and `check:version` sizes a
prerelease against the nearest earlier heading whose numeric core differs. At beta the scheme
switches to `1.0.0-beta.N` prereleases under that same `next` tag: breaking changes stay allowed
between
betas, each carrying migration notes, while the seam surface hardens against its first outside
consumers. From `1.0.0` on the number carries compatibility under strict SemVer: breaking changes
batch into majors with one migration guide, minors are additive, patches are fixes, `Consumers
must:` lines appear only in majors, and a release candidate exists only ahead of a major.

Readiness checklist:

- [ ] **The public seams have held across an initiative or two with no breaking change**: the adapter and
  field schema, `render`, the admin mount (`createCairnAdmin`, the `CairnAdminShell` custom-route seam, the
  `navLayout` seam), the route factories (`createContentRoutes`, `createPublicRoutes`), the admin design
  vocabulary (the `text-muted` / `text-subtle` role layer), and the log event names.
- [ ] **No known breaking change is pending** on the public surface, or each is consciously deferred to the
  first post-1.0 major. The SvelteKit `checkOrigin` removal (kit#15992) is the standing example: decide
  whether its fallback lands before 1.0 or becomes the first 2.0 driver.
- [ ] **Both production sites run the latest published cairn on the v2 adapter**, with their URL policies
  transcribed onto `defineConcept` (the per-site cutover watch items), so the real surface is exercised and
  needs no engine break to serve them.
- [ ] **The enforced boundary is green and complete**: `check:surface`, `check:reference` (including
  its every-export tier requirement and its reverse stale-name check), `check:reference:signatures`,
  `check:package`, and the packaging boundary test (`src/tests/unit/packaging-boundary.test.ts`, the
  deep-import lock) pass, and the surface they enumerate is the whole intended public API with
  nothing accidental.
- [ ] **The reference docs cover every export**, the guides and the upgrade guide are current, and the
  extending-developer seams (the thin seams plus the admin design vocabulary) are documented as the versioned
  contract a developer builds on.
- [ ] **The docs claims-verification audit has run** (Geoff, 2026-08-02): an adversarial sweep of the
  whole docs corpus tracing every factual claim a page makes about engine behavior to the code, the
  defect class no mechanical gate catches (the five-channels model, the `handleError` requirement that
  never worked, and the falsified `csrf_rejected` log row all passed every gate). Workflow-shaped:
  extract claims per page, verify each against source, fold what fails. Runs AFTER `beta.1` so its
  inputs exist (stranger issues, the friction log, Topo's docs-effectiveness signal) and BEFORE
  `1.0.0` ships; it is a blocking gate on the final release, not a someday sweep.
- [x] **The admin reads as an idiomatic exemplar**: the admin idiomatic re-expression initiative is done
  (the admin sweep, the starter-template fold, and the docs phase), so the surface a developer copies is
  native, not bespoke, and the developer-facing design vocabulary is a documented, versioned seam.
- [ ] **`create-cairn-site` ships**, so a new consumer starts from a scaffold rather than hand-copying the
  showcase. (Weigh whether this gates 1.0 or rides the first 1.x.) The pass opens by measuring the
  un-agented path: walk the tutorial's `wrangler`-plus-dashboard setup cold, no agent, and record
  where it drags, since every site so far was provisioned by an agent holding account-wide access
  and that path has never been measured (Geoff, 2026-08-05, the harvest sitting).
- [ ] **The core-feature roadmap has landed** to the point the author opens the project up: the intro's
  "closely held until the core lands" condition is the same condition as 1.0. Named contents (Geoff,
  2026-08-01): entry history, revert, and public preview for a non-editor, all three ratified as
  landing BEFORE the public beta, and all three implemented (the design sitting's
  `createPreviewRoute(runtime): RequestHandler` reservation is superseded by the shipped
  `previewLoad`, a site-mounted `Load` under R1's grammar; see
  `docs/superpowers/specs/2026-08-06-history-revert-preview-design.md`, "Part 3"), holding
  unpublished for release one. Release intent (Geoff, 2026-08-01): the three bundle into one
  release, the next cut after the ASC-seams window publishes, however many passes they take to
  land.

**Churn stays free until the public beta (Geoff, 2026-07-30).** The design-ratchet pass broke two
public seams outright (the admin-fields `register` default flip, the tightened
`one-filled-action` partition) in service of the better long-term engine design, and that is
correct at this stage, not a lapse against the first checklist item above. `0.x` exists
precisely so a public seam can move when it demonstrably improves the engine; the "no known
breaking change is pending" bullet starts mattering once cairn approaches the beta cut, and the
"public seams have held across an initiative or two" bullet measures the stretch of stability
leading into beta, not the whole history before it. Treat any further pre-beta seam break the
same way: ship it, batch its `Consumers must:` line, and let this note stand as the ruling
rather than re-litigating it pass by pass.

When these hold, cut `1.0` deliberately, retire the `0.x` "minor = new subsystem / patch = everything else"
scale heuristic, and switch the numbers to their compatibility meaning (patch = fix, minor = additive,
major = breaking). The scheme and cadence live in `CLAUDE.md` ("Releases") and the
`cairn-release-process-and-versioning` memory.

### The pre-beta pass series and the two-release shape (organized 2026-08-01)

The Now and Next tiers' pre-beta entries execute as this series. The release shape is
RECOMMENDED, not yet ratified: two releases, where release one carries everything that impacts a
current consumer site and release two is `1.0.0-beta.1` itself. The alternative Geoff weighed
(bundle everything into `beta.1`) costs the same number of breaking rounds, since the sites absorb
release one through the ratified Waymark rebuilds and ASC retrofits once either way; two releases
additionally give the frozen contract production miles before strangers see it (the "seams have
held" checklist bullet needs runway), give the dress rehearsal and rebuild dogfood a published
surface to run against, and land `beta.1` already stable. Flipping to single-beta moves only the
release-one boundary; the passes are invariant.

- **In flight:** both ASC seams passes have landed. Pass one shipped as `0.93.0`; pass two (the
  `./cloudflare` subpath and the packaged D1 audit sink, additive) is done and holds unpublished.
- **Phase C, settle the contract: done, holds unpublished.** C1 the seam-shape pass (the
  `check-reference-signatures.mjs` `| undefined` fix, the env-genericity sweep, the function-color
  and refusal-channel rulings, and the toolchain matrix); C2 the naming pass (a Fable sitting over
  `api-surface.md` settled the rename set and the `locals` policy, then one execution pass landed
  every rename in one diff, one `Consumers must:` list — the only genuinely breaking pass in the
  series); **C2b**, cut out of C2 mid-execution under its pre-approved contingency split, converged
  every content-action refusal onto `fail()` with a precise `ActionFailure<T>` (R10) and closed the
  `requireAccess`/`createSectionAction` target-derivation asymmetry C2's post-mortem flagged. All
  three land in the same unpublished window.
- **Phase F, the core features:** F1 the history/revert design sitting; F2 the history view
  pass; F3 the revert pass (the sitting may merge F2/F3); F4 the preview design sitting; F5 the
  preview pass.
- **RELEASE ONE cuts here**, the last substantial `0.x`: contract, renames, and the three core
  features in one window. The standing pipeline consumes it (the Waymark rebuilds, ASC's
  retrofit) — the one round of breaking changes. **Phase F runs before this cut and phase P after
  it** (Geoff confirmed the order 2026-08-04, against a STATUS draft that had put P first), which
  is what keeps P8's ambient-defaults remediation out of the release the consumer sites absorb.
  One wrinkle the RC introduced: `0.94.0` now carries the contract and the renames ahead of this
  cut so the migrations can happen, so what release one adds on top is the core features.
- **Phase P, polish and docs (non-breaking; internal order flexible):** P1 mechanical hardening
  (ci-parity, the `commitFiles` test, the surface machine artifact, the error-message sweep, and a
  small showcase route exercising `adminAction` and its converged refusal paths end to end, since
  the showcase exercises neither today and a kit-version drift in action-thrown redirect/error
  rendering would go uncaught); P2
  the zero-state pass; P3 viewport extremes; P4 sign-in touchpoints, with the keyboard/SR
  walkthrough as the attended session at phase end plus a fixes rider; P5 the
  `CairnMediaLibrary` split; P6 front-door docs (cold-reader, diagnostic-pair); P7 the
  zero-credential quickstart; **P8 the ambient-defaults remediation**, the phase-P bucket of the
  2026-08-03 audit, enumerated in
  [its report](docs/internal/2026-08-03-ambient-defaults-audit.md) rather than restated here.
  Thirteen items, all additive, ordered by consequence in the report: the undetected managed-robots
  prepend, the silent post-handoff mail path, the absent DNS-authentication check, the missing
  `Cache-Control` on every admin response, the unverified `prerender` flag, the 307/308
  trailing-slash divergence across the family, and the stripped `charset` on cairn's one deliberate
  public-output header, among others. P7 and P8 overlap heavily and should be planned together, since
  the quickstart's credential story and the audit's effective-state checks answer the same question
  from opposite ends. The standing template track (cairn.pub voice, starter set, Topo with the
  docs-effectiveness infra, the scaffolder with its agent brief, now carrying Cloudflare
  provisioning in the same tool) runs parallel and feeds the rebuilds.
- **The pre-RC block, ordered (Geoff, 2026-08-03).** C2b merged, and three items now sit between it
  and the RC cut, all additive and all riding the same unpublished window:

  1. ~~**The ambient-defaults audit.**~~ **RUN 2026-08-03**, report at
     [`docs/internal/2026-08-03-ambient-defaults-audit.md`](docs/internal/2026-08-03-ambient-defaults-audit.md).
     It does not gate the RC: one finding is recommended for this window (the engine's unconditional
     two-year `includeSubDomains` admin HSTS, which overrides a zone owner's own HSTS decision), and
     it is a judgment call rather than a forced hand. Everything else went to phase P or to the
     operator.
  2. **The auth seam** (ASC seam 1 as `createAuthChannel`): spec v3.1, eight-task plan, three
     adversarial review rounds. **The factory pass shipped 2026-08-04** (`./auth-channel`, the D1
     schema and store, request/confirm/logout, the rate limit, the docs arm); **pass 2, the
     consumer proof (showcase fixture, scaffolder exclusion, e2e), is still open** and files as its
     own Now-tier entry. Its window closes the session xcathletes runs Task 4, still open as of
     2026-08-04.
  3. **The AI-posture pass.** Consumes the audit, and lands before the migrations so each site adopts
     a posture during the session that migrates it rather than earning a second visit.

  Then the RC cut, the migrations, phase P, phase F. The AI-posture pass was briefly filed as P8 and
  moved out for the adopt-during-migration reason. See Now for both remaining items.
- Then the widened **go-public pass**, the **dress rehearsal**, and **RELEASE TWO:
  `1.0.0-beta.1`**.

### The beta gate — DECIDED (Geoff, 2026-07-02; step 10 is now mechanics)

All four rulings, ratified in advance: **(1) Versioning** — compatibility-meaning SemVer from
beta day; the pre-beta cut is the last `0.x`; beta ships `1.0.0-beta.1` under an npm `beta`
dist-tag, iterating `-beta.N` with `Consumers must:` on breaking bumps; `1.0.0` when the
checklist holds; the `0.x` scale heuristic retires at beta. **(2) Posture** — public at beta:
repo public, issues on with minimal triage, docs live on cairn.pub; the go-public pass is the
gate. **(3) Support** — latest beta only; fixes land in the next `-beta.N`, no backports;
SECURITY.md's wording updates to match at its go-public trim. **(4) Naming** — the package goes
UNSCOPED `cairn-cms` at beta day (reserve the free npm name with a placeholder publish before
then — an interactive act for Geoff, npm auth is passkey-bound); the repo stays
`glw907/cairn-cms` (GitHub redirects keep a future org move cheap; the npm name does not have
that luxury, hence deciding it now).

The original decision framing, for the record:

- [x] **Define the beta release as an event, and adopt the long-term numbering scheme at it**
  (Geoff, 2026-07-02: from beta on, version numbers carry durable, useful meaning). Standing
  recommendation: strict SemVer with compatibility meaning from beta day — beta ships as
  `1.0.0-beta.1` and iterates as `-beta.N` under an npm `beta` dist-tag (`latest` stays on `0.x`
  until `1.0.0`), a pre-release bump that breaks a consumer carries its `Consumers must:` line, and
  `1.0.0` lands when this checklist holds. The test the scheme must pass: a consumer reads the
  number correctly with zero cairn-specific documentation, which only compatibility-meaning SemVer
  does (the `0.x` scale heuristic was scaffolding; CalVer says when, never whether it breaks you).
  Adopting at beta rather than `1.0` is deliberate: beta users are exactly who needs the number to
  mean something. Also in this decision: what the accumulated `## Unreleased` window rolls into the
  beta cut, whether beta flips the "closely held until the core lands" posture, and the support
  promise to beta users (SECURITY.md's latest-minor line becomes real once strangers depend on it).
- [x] **Close the naming window deliberately.** The package (`@glw907/cairn-cms` vs an unscoped name)
  and the repo home (personal account vs a `cairn` org) are cheapest to change before any external
  user pins them and maximally painful after. Staying with the current names is fine, but as a
  decision, not a default; check name availability first.

## Now

- **A cleanup pass: split the repo along engine-development versus consumer-facing, and stop
  shipping the sausage-making. AUTHORIZED as its own pass (Geoff, 2026-08-07).** The ruling that
  governs it: complexity is welcome locally to help build the engine, and contributors should keep
  every tool they need in the repo, but a developer who just wants to USE cairn should receive none
  of it. The repo should be organized along that line, and the packed surface should reflect it.

  Baseline measured 2026-08-07, before any cleanup: **2.5 MB packed, 7.0 MB unpacked, 739 files.**
  Confirmed findings to start from, each verified against `dist`, not inferred:
  - `dist/audit/rules/rendered/vertical-metrics.{js,d.ts}` ships today and is pure lab apparatus,
    the measurement module for a probe that no shipped rule consumes. **THIS PASS RELOCATES IT**,
    together with `scripts/probe-vertical-alignment.mjs` and the module's tests, which travel as
    one unit. The vertical-alignment pass deliberately left it in place with a co-located `// WATCH:`
    comment rather than move it twice, since the lab-versus-shipped boundary is this pass's
    organizing principle and not one file's problem. It is the worked example: nothing named it in
    `files` or the exports map, and it shipped anyway, because svelte-package emits everything
    reachable under `src/lib`.
  - `dist/audit` is 792 KB across 41 files, the second-largest shipped tree after `components`.
    Whether `cairn-audit` is consumer product or engine apparatus is a POSITIONING question this
    pass should settle rather than assume. Evidence both ways: the shipped `cairn-admin-screens`
    skill points a consumer's agent at cairn-audit's checks, which reads as product; several rules
    audit cairn's own design-system conformance and need a generated norms manifest, which reads
    as apparatus. A split (consumer rules ship, engine-conformance rules do not) is the likely
    answer and should be decided on evidence.
  - `@anthropic-ai/sdk` is a RUNTIME dependency, statically imported at the top of
    `src/lib/sveltekit/content-routes-context.ts`, so every consumer installs the whole SDK
    whether or not they use the tidy action. This is product rather than sausage-making, so it
    does not belong in the same bucket, but it is the single heaviest thing an install pulls for
    one optional feature and a lazy import is worth costing.

  Method note: `npm pack --dry-run` is the honest instrument. `files` in `package.json` and the
  exports map both under-report, since a module ships whenever anything reachable imports it.
  Success is measured as the packed baseline above moving down, with no export subpath lost.

- **Vertical alignment's declared follow-up, filed off the cairn-wide pass (2026-08-07).** A
  cairn-wide inventory measured both the admin and the public surface for vertical-alignment
  defects and closed the two entries this replaces: the optical-centring engine default Geoff asked
  for on 2026-07-30, and the both-axes field-row defect found by ASC's `rc.2` verification. The
  admin toolkit's new `FieldRow` (`items-end`) ships the named composition for a stacked field
  beside a bare control; the new `cairn-icon-label`/`cairn-line-slot` recipes and the
  `icon-baseline-synthesis` static rule close the one confirmed icon-label mechanic; `text-box-trim`
  was measured and explicitly declined (see `docs/internal/admin-design-system.md`, "Vertical
  alignment mechanics"). The measured defect surface came in far smaller than either closed entry
  assumed; two things carry forward rather than a broader repair:
  - **The sub-bar `ConceptList` family:** fifteen rows reading exactly 1.55px, the same shape as the
    three confirmed defects but under the pass's 2px reporting bar. A firing threshold anywhere in
    that window either adopts all fifteen in one step or leaves a visible family untouched, so this
    is a decision to take deliberately, not a number to pick when a future rule graduates.
  - **A precomputed icon-ink table, filed as the pre-beta pass's first target.** An icon's ink offset
    inside its own viewBox is a property of the icon FILE, computable offline from path data with no
    rendering, so a static rule built on it reaches ASC's `/join` icon-card defect class the same way
    the dropped rendered `cairn-audit` rule would have, with no browser. ASC already fixed its own
    instance by hand, so this closes future recurrence rather than a live defect.
  Full measurement: `docs/internal/2026-08-07-vertical-alignment-harvest-findings.md`.

- **Exercise a server-only subpath under real Wrangler in cairn's own CI.** The `0.94.0-rc.1`
  Workers blocker (a `browser` condition with no `worker` ahead of it, so the server bundle got the
  client stub and the Worker never started) shipped past every gate this repo runs, and the two
  gates added with its fix are both Node `--conditions` proxies for Wrangler's esbuild. If Wrangler
  changes its condition set, both stay green while every consumer breaks the same way. Nothing in
  `examples/showcase/src` imports `/auth-crypto` or `/cloudflare`, and the showcase e2e serves
  through `vite preview` rather than Wrangler, so closing this needs a real workerd start, not one
  more import. The cheapest shape is a small fixture Worker that imports one subpath, built and
  started with `wrangler dev --local`, asserting it answers rather than refusing the connection.
  Filed 2026-08-06 from the fix's own review; the defect filing is
  [`docs/internal/feedback/2026-08-05-rc1-worker-condition-defect.md`](docs/internal/feedback/2026-08-05-rc1-worker-condition-defect.md).

- **Decide whether the chassis safelists the classes the engine's rendered markdown emits.**
  Surfaced 2026-08-04 by the auth-channel consumer proof; evidence and the measurement in
  [`docs/internal/2026-08-04-auth-channel-consumer-proof-harvest.md`](docs/internal/2026-08-04-auth-channel-consumer-proof-harvest.md),
  finding 1. `src/lib/render/rehype-dispatch.ts` writes `card-body` and `card-title` into runtime
  HTML, and the alert directive writes `alert` and its variants. Tailwind scans source files and
  never runtime output, so DaisyUI ships those base rules only when some source file happens to
  name the same class. The showcase chassis keeps the `card` and `alert` families expecting those
  declarations to be there; they are not. A fixture page in pass 2 named `card-title` once and every
  callout on the site restyled, wrapping a heading and shifting 26px down every page below it.
  Deciding this changes the approved visual baseline, so it runs through the `visual-fidelity` gate
  with Geoff's before/after, not as a side effect of another pass. The mechanically detectable
  half, that every class the engine emits is either safelisted or independently styled, belongs in
  `cairn-audit`.

- **The ambient-defaults audit: RUN 2026-08-03.** Report:
  [`docs/internal/2026-08-03-ambient-defaults-audit.md`](docs/internal/2026-08-03-ambient-defaults-audit.md).
  Fourteen agents, one lens per surface plus an adversarial verifier per surface. It reported and
  fixed nothing, per its own boundary, and the method terminated as designed.

  **The audit's answer to the AI-posture pass's question: the ambient defaults do NOT share one
  shape.** They split into behavior the engine emits (headers, cache directives, cookie attributes)
  and behavior the engine can only observe (Cloudflare's managed robots layer, zone TLS settings, DNS
  mail authentication). A posture config belongs to the first group and should not try to absorb the
  second. The second wants a check, which is the same conclusion the setup work reaches independently.

  **What owning the whole chain unlocks (Geoff, 2026-08-03), now with evidence behind it.** cairn is
  Cloudflare-specific, and the comparables survey makes that a capability rather than a limitation:
  nothing among 22 tools fetches its own live deployed site and reports what it is actually serving,
  with WordPress Site Health the cautionary case, since two of its three checks read configuration
  back to itself while looking like live probes. cairn's `doctor/` currently sits on the same side of
  that line for its three Cloudflare checks. The audit established the cost is low: every finding that
  needed measuring rather than reading was reachable with `curl` and `dig` and **no credential at
  all**, including HSTS presence, the http-to-https redirect, the TLS floor, the served robots.txt,
  the trailing-slash status, and the full DKIM and return-path SPF picture. Directions, still
  direction rather than commitment:

  - **Effective-state checks in `doctor/`, credential-optional.** Run everything reachable without a
    token, and do more when one is present, so a developer is never blocked waiting on access. This
    replaces config readback with behavior probing and is strictly more truthful, since a Cloudflare
    toggle reading one way while the edge behaves another is documented in the comparables research.
  - **Publish-chain verification end to end.** Confirm the published entry is genuinely live at its
    permalink rather than assuming the chain worked. No surveyed CMS controls enough of the path to try.
  - **Magic-link deliverability.** The audit found the concrete gap: cairn's docs promise Cloudflare
    "adds the SPF, DKIM, and DMARC records for you", which holds on a fresh domain and does not when
    a `_dmarc` record already exists. Two of four sites kept pre-cairn `p=none` policies through
    onboarding.

- **Help screen first-steps card overlap (pre-existing, found 2026-07-21).** The getting-started
  steps card on `/admin/help` renders its three step columns overlapping at desktop widths (the
  step text collides with the checkbox rail and the step CTAs). Reproduced identically on the
  pre-toolkit engine, so it predates the admin-toolkit pass; the section is hand-written scoped
  CSS in `HelpHome.svelte`, untouched by the sweep. Needs a design-bearing fix against the
  intended card layout, plus a visual-suite baseline for `/admin/help` so the screen stops being
  the one admin surface with no render coverage.

- **Docs-effectiveness infrastructure from the Superforms study (2026-07-03), Topo-era:**
  Pagefind-class Ctrl+K search on the docs site (the single biggest perceived-quality lever
  at zero infra), a FAQ/help top-nav page, a task-tagged examples gallery, an /llms
  machine-consumption page, and the CHANGELOG's Consumers-must lines compiled into a durable
  upgrade page. Timed to Topo carrying the docs; the drafting-level practices are already in
  the craft references.

- **Shortcut-table drift gate (from the 2026-07-03 docs benchmark).** The editor guide's
  keyboard tables and the in-product sheet (`editor-shortcuts.ts`) share content that nothing
  machine-checks; a small `check:*`-idiom script diffing the doc tables against the keymap
  source closes the classic docs-drift hole before it opens. Rider: the in-product sheet
  omits undo/redo; add the rows when touching it.

**The pre-beta sequence (Geoff, 2026-07-02; the order is the plan, executed continuously with
the named human gates only):**

1. ~~Polish pass close + merge~~ — DONE, merged 2026-07-02.
2. ~~The pre-beta cut~~ — DONE: `v0.79.0` published 2026-07-02, the last `0.x`.
3. **In parallel: the docs rewrite Stage 2** (its plan is written; human gate: Geoff reads the
   front-door drafts) **and the Waymark starter component set** (human gate: one batched
   taste question settles the final component list at its plan's start; no file contention
   between the two).
4. ~~The Waymark design review~~ — DONE 2026-07-17: the two-track audit (90 findings, 82
   surviving adversarial verify), seven ratified verdicts, and the full fix plan executed on
   the `waymark-final-design-review` branch. Record:
   `docs/internal/2026-07-17-waymark-final-design-review-audit.md`.
5. **Deploy the finished Waymark example to cairn.pub** — the intro site IS the reviewed
   example, live (Geoff, 2026-07-02), with its positioning content drawn from the docs pass's
   front-door work; the template's permanent living demo. Audience-per-surface (Geoff,
   2026-07-02): the repo and npm page are dev-first surfaces and read that way; **cairn.pub is
   the broad-audience front door** — its first reader is the less-technical manager or editor
   deciding whether to trust this thing, with the developer pitch one click deep; and
   docs.cairn.pub (Topo, later) is the shared source both audiences get linked into, which is
   what makes the editor-class pages publicly reachable rather than buried in a GitHub tree.
6. **The scaffolder** (the pre-B3 DX slot, B3/B4, then the Part C generator), baking the
   reviewed template, **and Cloudflare provisioning with its token preflight in the same tool**
   (Geoff, 2026-08-04: pre-beta, and one create-a-site experience rather than two tools splitting
   the job; the Next-tier entry carries the reasoning).
7. **Rebuild ecxc.ski and 907.life from Waymark, via the scaffolder where possible** — one
   effort dogfoods the template's redirection story AND `create-cairn-site`; permalinks exact,
   live admin smokes ride here, build-alongside-then-swap.
8. **The go-public pass** (secrets-history scan, exposure rulings, fork-PR CI hardening,
   SECURITY toggle).
9. **The dress rehearsal** (fresh-eyes first-hour chain; short attended session for the
   account steps).
10. **The beta gate** (Geoff's two decisions) → **beta**: `1.0.0-beta.1`, repo public, on
    cairn.pub.

- **Cut the pre-beta release after the polish pass merges (Geoff, 2026-07-02), then REBUILD both
  production sites from Waymark as the dogfood test (Geoff, 2026-07-02 — supersedes the
  upgrade-style cutovers).** One deliberate cut rolls the pruning + polish window (verify the next
  number free via `npm view`; the `cairn-release` skill owns the mechanics). Then, instead of
  upgrading in place, ecxc.ski and 907-life are rebuilt fresh from Waymark on that cut: the end
  result need not be pixel-identical to each site's current look, but it should be close — and
  since the two sites look very different from each other, one template re-expressed into both is
  the strongest real-world test of the token-layer redirection story (the design review's
  extensibility lens, production-priced twice). Hard requirements per rebuild: live permalinks
  preserved exactly (the URL policies transcribe onto `defineConcept` — ecxc posts
  `/:year/:month/:slug` with `datePrefix: month`, 907 posts `/:year/:month/:day/:slug` with
  `datePrefix: day`; the phase-3b hard error catches a miss), content migrates as-is (markdown in
  git; frontmatter mapped to the v2 fieldsets), the owed **live admin smoke** runs against each
  rebuilt site's real Worker, and the swap is build-alongside-verify-then-cut, never in-place (real
  editors use these admins). Each rebuild runs as a `site-pass` in its own repo; every friction
  point feeds the docs friction log and the scaffolder's work-list — the rebuilds are the expert
  half of the dogfood, with the fresh-eyes dress rehearsal (below in Next) remaining the
  zero-context half. Beta-prerequisite framing unchanged: the rebuilt sites ARE the production
  miles on the frozen contract. Sequenced after the Waymark starter component set (rebuilding
  from a template whose components are still landing would test the wrong artifact); the design
  review can interleave, with the two re-expressions as its field evidence.

## Next

- **A Cloudflare provisioning script, and its token preflight (Geoff, 2026-08-03).** One script that
  creates what a cairn site needs on Cloudflare, instead of a developer assembling it by hand.

  **It ships before the beta (Geoff, 2026-08-04).** Every cairn site provisioned so far was set up by
  an operator holding account-wide Cloudflare access, so the setup path has only ever been measured
  on its easiest possible run, and an agent driving the Cloudflare API with an account-wide token is
  not how most developers configure Cloudflare. A developer without that setup reaches for `wrangler`
  where it covers the resource, and the dashboard everywhere else. The cost concentrates in the
  everywhere else, which this entry already enumerates as the non-provisionable list: minting a
  correctly scoped API token, Email Sending onboarding, GitHub App creation and installation, and
  nameserver delegation. Working with an agent does not skip that wall, since an agent holding a
  wrongly scoped token gets the same opaque `Authentication error` the preflight exists to name.
  Waiting until after `1.0.0-beta.1` means the first stranger to install cairn is the first person to
  walk the real path.
  Sequencing follows the pairing already stated below: it lands with the scaffolder in sequence item
  6, ahead of the Waymark rebuilds that dogfood the create-a-site path in item 7, and ahead of the
  dress rehearsal in item 9, which is where a fresh-eyes first hour would otherwise discover it.
  The fork below is settled, so the scaffolder's plan can absorb this rather than wait on it.

  **It completes an arc rather than starting one**, and the sequencing follows from that: the
  ambient-defaults audit defines what a correct deployed site looks like, the scaffolder emits the
  code, this provisions the infrastructure, and the AI-posture pass's `doctor/` probe verifies the
  result. The audit is the input to the other three, so this runs after it and pairs with the
  scaffolder. P7, the zero-credential quickstart, is the same story from the developer's side.

  **The charter line that makes it legal.** The AI-posture ruling says cairn reports infrastructure
  and never configures it. That governs **the library at runtime** and it stands. Setup **tooling** a
  developer deliberately runs once is a different artifact and may provision, which is what
  `wrangler` already is. Keep them separate; the runtime library must never reach for provisioning
  credentials.

  **The valuable half is the preflight, not the provisioning.** The stated pain is getting the access
  right, not making the API calls. A script cannot mint its own token, but it can verify a supplied
  one and name exactly what is missing. Worked example from the day this was filed: `GET
  /zones/{id}/bot_management` returned a bare `Authentication error` with an account-wide token and
  no indication of which scope was absent, which cost a detour. That is the doctor pattern applied at
  setup.

  **The design fork is SETTLED (Geoff, 2026-08-04): the same tool as the scaffolder, one
  create-a-site experience.** The scaffolder emits the code and the same run creates the remote
  resources. Two tools each doing half the job, with an unclear boundary over who writes
  `wrangler.jsonc`, would have been worse than one. The merge also removes the placeholder step it
  would otherwise force: a scaffolder that cannot provision has to emit a `wrangler.jsonc` with
  blank D1 and R2 identifiers for the developer to fill in by hand, while one tool writes the real
  ids it just created. `create-cairn-site` is the name the pre-beta sequence already uses for it.

  Two things follow, one settled and one still open:

  - **It ships as a published `create-*` package**, since the ruling's whole point is a single
    experience for someone who has not cloned this repo. A repo script only a cloner can run cannot
    be that.
  - **Prompts versus a declarative config stays open**, since the merge does not decide it.
    Recommendation, for the plan to accept or reject: prompt on the first run and write the answers
    to a reviewable config the same tool re-reads, which serves the friendlier first run and the two
    hard requirements below at once, because re-running against a partly-provisioned account then
    reads state rather than re-asking.

  **The charter boundary survives the merge unchanged.** `create-cairn-site` is setup tooling a
  developer runs deliberately, so it may provision. The runtime library still must never reach for
  provisioning credentials, and folding the two tools together must not fold that line.

  **Both preconditions are now met, so this is plan-ready.** It never wanted a Fable sitting, for a
  structural reason: the ambient-defaults audit is its specification, since the audit enumerates what
  a deployed cairn site presents and who chose each piece, which is exactly this tool's resource
  checklist. Planning ahead of it would have produced a list the audit then revised. The audit ran
  2026-08-03 and the fork closed 2026-08-04, so what remains is specification rather than design. The
  plan is written with the scaffolder's, since they are now one tool.

  Provisionable: D1 (`AUTH_DB`) plus schema, the R2 media bucket, Worker bindings and routes,
  observability, DNS, rate limits. **Not provisionable, and it must say so with links rather than
  papering over it:** creating the API token, Email Sending onboarding (Workers Paid plus dashboard),
  GitHub App creation and installation, nameserver delegation. Two hard requirements: idempotent
  against a partly-provisioned account, and dry-run before it acts.

- **`COLLATE NOCASE` on `editor.email`, to ride along with the next auth migration.** The column is a
  BINARY-collated `TEXT PRIMARY KEY` (`migrations/0000_auth.sql:3`), so two case variants of one address
  are two rows. The 2026-08-01 xcathletes seams pass closed this at the store: every email argument in
  `src/lib/auth/store.ts` is trimmed and lowercased before it matches or writes, so no path through the
  engine or the public `/auth-store` subpath can create a shadow row. The residual is a site writing the
  `editor` table with raw `wrangler d1 execute`, which is why this is filed rather than urgent. Closing it
  at the database is a schema change against two production sites, so it wants batching with the next
  migration rather than a migration of its own. Found by the pass's review gate while confirming the
  lockout defect the store fix closed. `migrations/0002_audit.sql` (the ASC engine-seams pass two audit
  sink) claimed `0002`, so this migration takes the next free number, `0003`, whenever it lands.

- **Cairn's own admin's error tier is clean (design infrastructure Pass 3, 2026-07-29).** The four
  error-tier defect groups Pass 2 calibration found against six admin routes in both themes
  (measurements in `docs/internal/2026-07-design-infrastructure-audit-calibration.md`) are resolved:
  `touch-targets` and `viewport-overflow` were fixed at the code (`fix(admin): clear the audit's
  own-tree error tier`, `8d3e532f`: an outward `::before` hit-area expansion on ConceptList's sort
  buttons, real padding on the row-title link, the default `.checkbox` size on Media's selection
  boxes, and a shrinkable `flex: 0 1 auto` on ListToolbar's segmented filter group);
  `one-filled-action`/`screen-anatomy`'s VocabularyAdmin pair was fixed in the same commit (outlining
  the card-local "Add tag" so only "Save changes" reads as the page's filled action); and
  `chip-ground-collision` demoted to advisory rather than being repaired (see the calibration
  follow-ups entry below). `npx cairn-audit --rendered` over the default route list, both themes,
  now reports zero error-tier findings with no new suppressions. The `badge-ghost` design call
  (`stock-default-hazards` at `EditPage.svelte:989`, formerly held open for Geoff) is also resolved:
  StatusChip's two ratified chip registers replace it across cairn's own tree. The advisory-tier
  debt this pass did not touch stands unchanged:
  - **Advisory, `border-contrast` (132 of the 210 in three classes).** Form control boundaries
    across the admin (`input.input`, `select.select`, the toolbar search field, the vocabulary
    new-label input) read 1.49 light and 1.77 dark against WCAG 1.4.11's 3:1, 26 findings; this is
    the criterion's core case and the most defensible accessibility finding in the corpus. The
    segmented filter buttons carry daisyUI's stock `--btn-border`, a 5% darkening of the button's
    own fill that reads 1.01 in dark, so adjacent segments have no visible division, 36 findings;
    the right fix is probably removing the inert stroke rather than darkening it. Table row
    dividers are `base-content` at 5% alpha, reading 1.10 light and 1.14 dark, 70 findings and the
    largest single class in the corpus: a rule whose whole job is separating rows, doing almost
    none of it.
  - **Advisory, `weight-budget` (2, both true positives and the only two in the corpus).**
    `/admin/login` renders no `<main>` landmark at all, a real landmark gap rather than an audit
    inconvenience. `/admin/media`'s content region renders three font weights against the two-weight
    budget, all three genuine card content: filename 500, reference badge 600, status-chip label
    400. **Sequencing hazard, do not lose:** fixing the login landmark immediately creates two new
    `screen-anatomy` false positives, because that rule's only working exemption today is an
    accidental `if (!mainEl) return null`. Give `screen-anatomy` a positive scope predicate first.

- **The rendered rules' own calibration follow-ups** (design infrastructure Pass 2, 2026-07-28;
  evidence in the calibration doc above). All six advisory rules stay advisory (`chip-ground-collision`
  joined the group this pass, demoted in from error tier; see below), and the evidence for promotion
  is not close, so what remains is repair rather than promotion.
  `interactive-contrast` is a demotion candidate and the only one that gates: 3 findings on a
  consumer home page, all false positives, and 0 on cairn's own tree. `border-contrast` is the most
  repairable of the advisory five, but its exemption keys on the literal string
  `--cairn-card-border`, which no consumer can reach structurally. `screen-anatomy` judges every
  drawer-less page an office screen, so every consumer page in existence. `relational-spacing`'s
  `--cairn-gap-*` tokens exist in no published build, so it can answer nothing against any released
  engine, and no true positive has been demonstrated for it anywhere. `touch-targets` omits WCAG
  2.5.8's spacing exception, which would exempt the 62x16 sort button at its measured 47px nearest
  neighbour. `focus-renders` reported zero on both corpora and is unclassified rather than verified
  clean; it needs a deliberate positive-control fixture.

- **The rule repairs Task 18's review gate confirmed but deferred** (design infrastructure Pass 2,
  2026-07-28). Six defects the gate found were fixed with fixtures; these six were confirmed and
  left, each because closing it is a scope expansion or loosens a gating rule and deserves its own
  adversarial pass rather than a gate-stage edit. Each is documented at the code, so a reader meets
  it in context.
  - `touch-targets` samples one 390px viewport, and SC 2.5.8 carries no viewport qualifier. Borrow
    `viewport-overflow`'s width list; the cost of leaving it is a control that passes at 390 and
    fails at 320 going unmeasured.
  - `touch-targets` and `interactive-contrast` hold different definitions of a control. The first
    misses `textarea`, `<area>`, the widget roles, and a `tabindex`-plus-handler custom control; the
    second carries a wider list plus a `cursor: pointer` fallback. One shared selector in the page
    helpers is the repair. Widening a gating rule's net changes the measured baseline, which is why
    it is not taken here.
  - `touch-targets` collapses findings per selector signature, so a count is a count of shapes.
    `interactive-contrast` deliberately refuses the same idiom. Two error-tier rules disagreeing on
    this means a developer cannot read either count as a remediation estimate.
  - `chip-ground-collision`'s overlapping-painter test is a bounding-box intersection with no
    paint-order reading, and daisyUI paints a background-image on every `.btn`, so any chip
    overlapping a button or an icon downgrades from a gating error to an advisory. Narrowing it
    loosens the downgrade path on a gating rule.
  - `border-contrast`'s `RATIFIED_HAIRLINE_FLOOR` is a literal 1.15 sitting 0.04 under the pairing
    its own doc calls invariant, so a consumer re-tune that softens the hairline more than roughly
    4% re-reports every `.card-shell` on every page. Derive the floor from the page's own resolved
    token pairing instead of pinning cairn's number, which also closes the consumer-reachability
    asymmetry the friction log records.
  - `resolveColors` returns `null` for both an empty string and a color the browser refused, so
    `resolveGround` composites a refused color away as if the layer painted nothing. The repair is
    separate sentinels at that boundary, the way `probeSelectors` already separates "nothing
    matched" from "the browser refused this selector". Fixing it inside `resolveGround` is wrong and
    two pinned fixtures in `color.test.ts` demonstrate it.
  - `weight-budget`'s title-band clause exempts `PageHeader`'s whole caller-authored action slot,
    and its heading test matches a heading anywhere in the header's subtree. Narrow the clause to
    the heading's own flow.
  - `derivedSides` forces two style recalcs plus a scroll per bordered element, run twice per page.
    Batching the sentinel probe onto `documentElement` costs one recalc instead of N. Wall-clock
    only, on a consumer's CI.

- **The design ratchet's own reviewer-triage rule repairs (D2, 2026-07-31)**, filed as promotion
  prerequisites rather than fixed at the gate.
  `field-edge-alignment`'s clustering compares each control's left edge only to the PREVIOUS
  member in the sorted sequence, not to a fixed column anchor, so a chain of sub-`CLUSTER_GAP_PX`
  gaps can drift a whole run into one merged column (a false positive on a legitimate
  multi-column stagger) while a single gap over 80px splits what was really one staggered column
  into two (a silent miss). Its finding message also always recommends `register="stacked"`,
  a real remedy only for a control composed inside `FieldLabel`, and a wrong one for a control
  the rule matches (`.input`/`.select`/`.textarea`) that was never wrapped that way.
  `container-inset-asymmetry` reads a raw inset with no floor, so an absolutely positioned or
  negative-margin child can drive the computed inset negative and the asymmetry math with it;
  clamp with `Math.max(0, inset)` on each side. `one-filled-action` reimplements its own
  unescaped `selectorFor` instead of the shared `helpers.signature` the other rendered rules
  install, so its surface key is not reliably a parseable CSS selector, and it keys a surface as
  `` `${selector}#${landmarks.indexOf(landmark)}` ``, which prints the sentinel `#-1` whenever the
  topmost open layer is itself a `nav`/`aside` landmark (`landmarks` is queried from the layer
  root's descendants only, so the layer's own root element is never in the list its own index is
  read against). `form-font-parity` (already advisory, `docs/reference/cairn-audit.md`) walks
  only the first `[data-theme='cairn-admin']`/`[data-theme='cairn-admin-dark']` wrapper on the
  page, so a page mounting more than one is only partly checked, and its explicit-face exemption
  net misses variant-prefixed forms (`md:font-mono`, `dark:font-mono`), `font-serif`/`font-sans`,
  and Tailwind 4's `font-(family-name:--x)` shorthand.

- **Three design-system gaps found in the same triage.** `Pagination`'s selected page
  (`src/lib/admin-toolkit/Pagination.svelte`) conveys its state by fill alone: `btn-active` swaps
  color and carries `aria-current="page"` for assistive technology, but a sighted user who
  cannot distinguish the fill has no visual cue at all, the same WCAG 1.4.1 shape
  `one-filled-action`'s own dark-theme hairline fix (CHANGELOG `## Unreleased`) already solved
  for the segmented control; give the selected page the same non-color cue. The legend padding
  reset (`cairn-admin.css`'s `base` layer, design ratchet Task 1) is repaired per call site
  rather than structurally: `ComponentForm.svelte` carries its own `px-1` on the one legend that
  needed it, so the next fieldset that needs the same visual balance has to rediscover the fix
  rather than inherit it. A variant-selected control (`btn-primary btn-active`) carries the same
  border-cue gap `Pagination` carries by fill: daisyUI's own hairline resolves to exactly the
  unselected sibling's own fill, measured 1.11:1 dark / 1.17:1 light, well under WCAG 1.4.11's
  3:1 floor (D3 review triage, 2026-07-31; `cairn-admin.css`'s dark selected-state comment). This
  is stock daisyUI, not cairn's own composition, and cairn renders no variant segmented control
  today, so it is a documented gap rather than a live defect; a consumer who builds one on the
  stock composition inherits it silently until this is fixed.

- **The engine debt and rule repairs corpus C confirmed** (ASC authenticated-admin calibration,
  2026-07-28; evidence and per-item mechanisms in
  `docs/internal/2026-07-design-infrastructure-audit-calibration.md` section 12). Same discipline
  as the entry above: each is confirmed, classified, and adversarially verified, and each waits
  for its own pass rather than a gate-stage patch. Engine defects the audit caught in cairn
  itself: LoginPage renders no `<main>`/`<header>` landmark (already tracked above; corpus C
  re-confirmed it as the rule's only cairn-origin weight-budget error); the daisyUI stock table,
  input, and button hairlines cairn's bundle ships produce 864 true `border-contrast` advisories
  on one consumer (re-tune the stock borders or extend token-derived exemptions to them; this is
  the named blocker on `border-contrast` promotion). (ConceptList's sort targets, ListToolbar's
  320/390 overflow, the CMS pill's raw border, and StatusChip's own contrast floor are all fixed;
  see the error-tier entry and the CHANGELOG's `## Unreleased` window.) Rule and harness repairs:
  `chip-ground-collision`'s contrast has no chroma term, so hue-distinct chips flag (24 false
  errors on ASC; **resolved 2026-07-29: demoted to advisory**; the chroma-aware repair (a distance
  formula that can see hue, plus a recalibrated floor) stays filed here, unbuilt). Until it
  re-promotes, the quiet chip register is unguarded against its own fifth ground: quiet's
  14%-tint mix over `--color-base-300` (e.g. daisyUI's `.table-zebra` row-hover) measures
  ~1.34/1.41, under the 1.5 floor the register otherwise clears everywhere else, documented rather
  than retuned in `docs/reference/admin-toolkit.md` and `skills/cairn-admin-screens/SKILL.md`
  (design infrastructure Pass 3, 2026-07-29 review triage);
  `norms-bands` measures inside closed `dialog.modal` boxes (scale .95 artifact) and trips on UA
  button-vs-anchor default padding; the norms manifest generator passes `size='xs'` to StatusChip
  so the bands never saw the component's `sm` default; rendered mode's missing post-hydration
  page-identity guard (the ASC edit desks were measured silently after hydrating into other
  chrome) is shipped (`fix(audit): rendered mode refuses pages that lose their identity after
  hydration`, `6fcb405d`); RULING 2's exemption floor strands the light-theme kbd chip at 1.143
  against its 1.15 floor. (design infrastructure Pass 2, 2026-07-28). Two files in `src/lib`
  carried a raw NUL as a composite-key separator, which made
  them binary to `grep` and to `file`, so every grep-based gate over `src/lib` skipped them
  silently while reporting success. Both were rewritten to a unicode escape in `40cb6d77` and
  nothing stops a third. The trigger is machine-detectable, so this is a test or a `check:*` script
  rather than a note: scan the tracked source tree for a control byte outside tab, newline, and
  carriage return, and fail naming the file and offset.

- ~~**The static audit's sheet parser desyncs on a backslash-escaped quote in a selector**~~
  FIXED (design infrastructure Pass 3, 2026-07-29 review triage). `src/lib/audit/sheet.ts`'s
  scanning loops (`collectRules`, `stripComments`, `scanBlock`, `propertyBoundary`,
  `parseDeclarations`, `skipParens`, `selectorClassNames`, `negatedClassNames`,
  `ownDeclarationText`) now skip a backslash-escaped character as a two-character unit before
  testing for a quote, so a compiled `before:content-['']` selector no longer reads its escaped
  quote as a string opener. `src/tests/unit/audit/sheet.test.ts` carries the fixture (a rule with an
  escaped-quote selector between two plain ones, asserting both survive the parse). The Task 5
  workaround on `ConceptList` (omitting the redundant `before:content-['']` utility) stays, since
  `before:` already emits `content: var(--tw-content)` for free either way.
- **DX: a `type-scale` finding could name the matching grammar role, closing the loop toward a
  rename codemod** (design infrastructure Pass 3, 2026-07-29). The upgrade guide's rename recipe
  (`docs/guides/upgrade-cairn.md`) has an editor look up the reported class's size in [Admin grammar
  tokens](./docs/reference/admin-grammar-tokens.md) by hand; if the `type-scale` rule instead named
  the role whose size the reported class resolves to, step 2 of that recipe becomes automatic, and a
  codemod that rewrites the class in place becomes buildable on top. **Flag for Geoff:** decide
  whether the codemod ships before the release that makes the rename recipe live, or after.
- **DX decisions for Geoff, pre-release** (design infrastructure Pass 3, 2026-07-29). Two open calls
  on the packaged skill's delivery mechanism, neither a defect: (1) `cairn-doctor --fix` overwrites a
  consumer's local edits to the installed skill silently (`installSkill` always copies the packaged
  tree over `.claude/skills/cairn-admin-screens/` with no diff or confirmation); decide whether that
  is the right default before the mechanism has real consumers. (2) `--fix` is a generic flag name
  now carrying a second, unrelated responsibility (installing/refreshing the skill, alongside its
  original doctor-check auto-fix meaning); consider a rename while the surface is still unpublished.
- **Small durability notes on the packaged skill, from the Task 6/7 review gates** (design
  infrastructure Pass 3, 2026-07-29), each cheap to carry forward rather than fix now: skill
  freshness (`src/lib/doctor/check-skill.ts`) compares the consumer's installed tree only at the
  packaged tree's own current relative paths, so a future engine version that drops a reference file
  cannot see (and cannot prune) a stale file still sitting in a consumer's `.claude/skills/`
  directory; `skills/**/*.md` prose sits outside both `.vale.ini`'s scope (`docs/**/*.md` and
  `README.md` only) and `check:docs`'s dead-link and arm-index gates, so its prose and its links are
  unchecked by any repo gate; and `SKILL.md`'s cross-references into the reference docs resolve
  through `node_modules/@glw907/cairn-cms/`, which is correct once installed but means the links are
  necessarily relative to an install, not to this repo's own tree.

- **From the ASC Assets-trial harvest (2026-07-29, ten findings across two batches, folded at
  the 0.91.1 hotfix pass; full detail in the ASC repo's trial log).** Finding 1, the 0.91.0
  shipped-sheet regression, shipped as the 0.91.1 hotfix itself (the nineteen-class compatibility
  safelist plus the sheet-inventory snapshot gate). The status-flattening finding folded into the
  standing kit#12987 entry below, with the upstream issue repointed and the severity raised. The
  rest were verified against the code (or against ASC's own adversarially-verified evidence) at
  the fold:
  - **The rendered audit's identity guard and its non-2xx precondition leave a hole between
    them, and the status flattening opens it (harness, high).** The 0.91.0 post-hydration
    identity guard catches a swap (SSR identity vs settled identity); a configured path that was
    never a route SSRs the consumer's 404 and hydrates the same 404, so the identities agree and
    the guard passes it. The only check that would catch it is the non-2xx precondition
    (`rendered.ts`), which the admin-shell status flattening (kit#12987 entry below) defeats:
    ASC's twelve-page run would have measured a 404 as a real screen had a configured path been
    wrong. Remedy candidates from the filing: read the page's own embedded status, or compare
    settled identity against the requested route rather than only against what the server sent.
  - **The rendered summary's two totals are computed differently (DX, low).** The advisories
    total counts printed lines while the suppressed total is `(xN)`-weighted, so a reader
    hand-reconciling ASC's 393 advisories against 217 suppressed finds a discrepancy that has no
    meaning. Pick one convention for both.
  - **A CodeMirror decoration throw on a consumer edit desk (defect, medium).** ASC's
    `/admin/bulletins/2026-03-membership-open` throws `Ranges must be added sorted by 'from'
    position and 'startSide'` at 1440 in both themes; the editor still mounts and stays reactive,
    and the post and page desks are clean, so a decoration set is being built out of order
    somewhere in the editing surface for that content shape. A separate rider from the same desk:
    a `source-code-pro-latin-wght-normal.*.woff2` request fails there, which is its own question
    about whether that face ships.
  - **The reachable class vocabulary is an undocumented contract (design gap, medium).** A
    consumer's admin markup can use only the utilities cairn's own compiled sheet happens to
    carry. After its type sweep, ASC still held 94 dead classes across 17 admin screens (`w-fit`,
    the `print:*` family, most responsive variants), each reading as live markup and compiling to
    nothing. The 0.91.1 committed sheet-inventory snapshot
    (`src/tests/unit/fixtures/admin-sheet-inventory.txt`) is now a machine-readable statement of
    that surface; the open call is the remedy: publish the inventory as a documented list, give
    consumers a supported seam to run their own Tailwind pass over the admin, or state the
    constraint so `<style>`-block scoping reads as the expected idiom rather than an escape hatch
    (ASC has hand-taken that route four times).
  - **`cairn-audit` cannot scope to a path, but its done-gate asks a builder to (DX, low).** The
    CLI takes `--rendered`, `--config`, and the `norms` subcommand only (verified in
    `src/lib/audit/bin.ts`), so narrowing a run to "the routes you touched" means authoring a
    config file naming `static.scope`. A positional path argument closes it.
  - **The static scan cannot see a class string a plain `.ts` module exports (coverage gap,
    medium).** The substrate is `svelte/compiler` over markup, so a consumer who centralizes
    admin class vocabulary in TypeScript modules gets zero coverage there while the run reports
    clean: 7 of ASC's 21 `badge-ghost` sites lived in such modules, and its most-used label
    recipe (118 uses across 18 screens) carried a never-compiled `text-[0.6875rem]` for its
    entire life under a green gate. Either extend the static substrate to string literals in
    `.ts` files under scope, or state the blind spot in the cairn-audit reference so a consumer
    knows the gate's coverage rather than inferring it.
  - **The closed type scale has no 12px role (design ruling; still open).** The scale steps from
    13px (`meta`) to 11px (`label`), so Tailwind's 12px `text-xs` has no mechanical target; cairn
    resolved its own 120 twelve-pixel sites "by the relationship each site expresses" and ASC
    resolved its 24 the same way, but the upgrade guide's "match that size to a grammar role" step
    has no answer for 12px. Either document the 12px case in the adoption recipe or reconsider
    where the scale closes. This item routed to "the rule-repair pass, with the trial's ratchet
    evidence"; that pass ran as the design-ratchet initiative (2026-07-30) and deliberately left
    the type-role scale untouched (its global constraints rule out changes to type roles), so the
    12px ruling stays unresolved. The ratchet evidence it fed now lives in
    `docs/explanation/enforced-design.md`'s grammar-ladder section.
  - **`cairn-doctor`'s zone checks report a bare 403 on read (DX, low; repair named).**
    `readZoneSetting` (`src/lib/doctor/checks-cloudflare.ts`) fails with "`<setting>` read
    returned 403" and prints a fix that assumes the setting is off, while the email check in the
    same file already routes the same status through `permissionFail`, which names the missing
    token scope. Route the zone-settings read through `permissionFail` so the failure
    distinguishes "the setting is wrong" from "this token cannot read zone settings".

- **daisyUI pins every `.list-row` child to `grid-row-start: 1`, so overriding the container's
  grid alone does nothing (from the 2026-07-30 Assets-trial-build harvest, finding 5; the design
  ratchet pass verified it and deliberately did not repair it).** At 390 a long action label
  squeezed a `.list-row` grid's content column toward zero width, wrapping an asset-type name one
  character per line, measured on `/admin/club/asset-requests`. The repair needs two overrides
  rather than one: daisyUI pins every `.list-row` child to `grid-row-start: 1` in a rule separate
  from the container's own `grid-template-columns`, so the child pin has to be released and
  re-pinned per breakpoint alongside the container override. Engine-level because it recurs in any
  consumer using `.list-row` with a variable-width trailing action, the common admin row shape.
  Site-side overrides exist today; the engine-side fix needs its own design rather than riding the
  design-ratchet pass's cap of three new rendered rules.

- **`add-an-island.md` teaches a client-side adapter import** (from the friction log, chassis-nav
  pass, 2026-07-19). The guide's root-layout snippet imports `{ cairn }` from `$lib/cairn.config`
  in a client script to reach `cairn.rendering.islands`, shipping the whole adapter to every
  public page. The showcase models the right shape (a lean islands-registry module plus a
  `hasIslands` server-load flag), and the tutorial's Milestone 7 was rewritten off the same
  pattern for nav in the chassis-nav pass. Rewrite the guide to the registry-split shape.
- **Deferred from the folded-chip verdict (invisible-craft pass, 2026-07-17):** body-snippet
  previews on the folded chip and a phone-reachable what-it's-for affordance. The chip itself
  shipped (label, title, count; includes show their fragment's human title); these two riders
  were explicitly cut from that verdict and wait for a real editor asking.
- **Raw-URL parity for media-adjacent surfaces** (from the friction log, Waymark final review
  T1/T3, 2026-07-17). Two engine surfaces serve `media:` tokens only: `remark-figure` promotes a
  caption to a real `<figcaption>` only when the figure wraps a `media:` token (a figure over a
  raw external URL renders its trailing text as a plain sibling `<p>`, so caption styling
  silently forks by source type), and the `heroImage` projection resolves `media:` tokens only
  (a frontmatter hero with a raw external `image.src` renders nothing without a template-level
  fallback). Whether raw external URLs get parity with `media:` tokens on either surface is one
  product call; take it when either surface next opens.
- **The admin toolkit's harvest wave 1 shipped (2026-07-20).** `@glw907/cairn-cms/admin-toolkit`
  is real: `PageHeader`, `ListToolbar`, `AdminTable`, `StatusChip`, `Pagination`, `EmptyState`, and
  the `format.ts` formatters, each graduated from aksailingclub-org's own admin build and
  documented on [the admin-toolkit reference page](docs/reference/admin-toolkit.md). Cairn
  dogfoods it: every top-level built-in admin screen now renders its header through `PageHeader`
  (closing the 2026-07-15 audit's finding 11, "page-header idiom five ways"), and `ConceptList`
  and `CairnMediaLibrary` additionally converge their search, filter, count, table, and pager
  markup onto `ListToolbar`/`AdminTable`/`Pagination`/`StatusChip`. `OfficeList` keeps its own
  contract unchanged this wave (see the entry below). Whether the toolkit belongs on the `1.0`
  readiness checklist as a versioned seam (the extending-developer story is stronger with it) is
  still an open call. The next wave holds:
  - **ASC's own import swap.** aksailingclub-org's admin still imports its first-party
    `src/admin-club/toolkit/` copies; its own next screen pass swaps those imports to the packaged
    `@glw907/cairn-cms/admin-toolkit` subpath, in its own sessions.
  - **`ExpandableRow`'s Classes-pass shakedown.** No engine screen renders expand-in-place rows
    (ruling 1 of the pass's adoption map), so `ExpandableRow` stayed ASC-local this wave; graduate
    it once ASC's Classes pass has shaken it out against a second real consumer.
  - **A toggle-device candidate (ruling 7 of the pass's adoption map).** A bare daisy `badge` for
    an identity label and a single-use on/off pill (`CairnTidySettings`'s tidy-convention toggle)
    both stayed bespoke this wave, correctly: neither has a second consumer yet. Mint a shared
    toggle device once a third one demonstrates the repetition, not before.
- **OfficeList's PageHeader convergence, filed at the T7 adoption sweep (2026-07-20).**
  `OfficeList`'s own header is the exact shape `PageHeader` generalized from, but its rhythm
  differs (`mb-6` versus `PageHeader`'s `mb-10`); re-expressing OfficeList's internals on
  PageHeader would visibly change the vertical rhythm of every custom `/admin/` screen a site
  already built on it, so it is not behavior-preserving (ruling 8 of the pass's adoption map).
  OfficeList stays hand-rolled with its exported contract unchanged this wave. Whether to
  converge its spacing onto PageHeader (a breaking visual change for an existing consumer) is
  a question for a later major.
- **Scaffolder finding (cairn-pub deploy, 2026-07-02): the dev wiring must be strippable.**
  A standalone scaffold without `@glw907/cairn-cms-dev` fails the BUILD: Rolldown cannot
  resolve the absent specifier even behind the dev gate (resolution precedes dead-code
  elimination). The scaffolder must strip the dev-gated blocks (`hooks.server.ts`,
  `cairn.server.ts`), and the template should isolate all dev wiring behind one deletable
  module so the strip is a file deletion, not an edit.
- **Scaffold content is self-documenting placeholder (Geoff, 2026-07-02).** The scaffold's
  placeholder content orients whoever looks at it: the About page says what the site is and
  that the content is deliberate placeholder, the masthead names Waymark, and demo posts
  say which component they demonstrate. First installment shipped with the vanilla cairn.pub
  deploy; the full treatment rides the step-5 finalization.


- **The `checkOrigin` pre-beta mitigation.** Adopt-now guidance rather than waiting on the upstream
  removal: document the edge Transform Rule that injects `Origin` on `/admin` POSTs in the deploy
  guide, and add a `cairn-doctor --probe` assertion that an `Origin` header actually reaches
  `/admin` on the live deployment, so a site that never applied the rule fails loud before an editor
  hits it. The scheduled kit#15992 watch stays the tripwire for the eventual `checkOrigin` removal;
  this item is the mitigation a site can adopt now, scoped pre-beta, not a 2.0 driver. See the Later
  tracking item below for the removal itself.
- **Admin error statuses flatten to 200 under the streamed pending count (upstream kit#12987;
  severity raised at the ASC rendered baseline, 2026-07-29).** A page-load `error(403)`/`error(404)`
  inside `/admin` renders the right error page and emits its log event, but the HTTP status reads
  200 because the shell layout load streams `pendingEntries` and SvelteKit's streaming branch
  builds its `Response` with no `status` (the non-streamed branch passes it through). ASC proved
  the mechanism on the shipped artifact, not just `node_modules`: `.svelte-kit/output/server/index.js`
  carries the single status-passing site, and ETag presence tracks the lost status exactly. The
  blast radius is not only bad paths: `/admin/posts/<deleted-or-mistyped-slug>` reports success to
  crawlers, uptime monitors, and any caller trusting a status code, and the flattening also defeats
  the rendered audit's non-2xx precondition (see the guard-hole entry in the ASC harvest block
  above). Enforcement is intact (no restricted data crosses; the access-map guide documents the
  caveat). The upstream tracking issue is sveltejs/kit#12987 (open); the previously tracked
  kit#12533 CLOSED without the behavior changing on the shipped bundle, and the scheduled
  kit-watch routine was repointed at #12987 on 2026-08-01. Since cairn chooses the streaming that triggers the
  upstream bug, a cairn-side mitigation (passing the status through another channel, or refusing
  to stream on an error path) is worth weighing rather than waiting on upstream. Surfaced by the
  access-and-attention pass's live smoke, 2026-07-19; mechanism, shipped-bundle proof, and blast
  radius from the ASC Assets-trial rendered baseline, 2026-07-29.
- **Body-link cross-branch delete protection.** Lift the body-link delete guard from its current main-only
  posture to the strict, fail-closed cross-branch reference index that the reference delete and rename gates
  now use, so deleting a body-linked target refuses across every open branch the same way a referenced
  target does. The reference pass left this asymmetry deliberate (locked decision 9); this closes it.
- **Nested references inside a container.** Lift the reference field into an `object` or `array(object)` leaf;
  phase 3a deferred containers to scalars and image only. Needs the frontmatter-edge extractor to descend into
  object leaves, the byte-preserving rename rewriter to address a nested YAML path (the corruption-prone part
  the references fan-out caught bugs in), and the cross-branch index plus rename and delete gates to cover the
  nested edges.
- **Starter component set for the Waymark template (before beta).** The starter template ships a
  curated set of content components common across the sites cairn is likely to manage (clubs and
  small orgs, personal and small-business sites) — reasonable, deliberately not exhaustive. Today the
  showcase defines `callout`, `alert`, and the `converter` island demo; the demo is showcase-ware,
  not a template component, so the real set is two. The list is DECIDED (Geoff, 2026-07-02, survey-informed:
  `docs/superpowers/plans/2026-07-02-wayfinder-component-survey.md`): figure, gallery, video
  embed, pull quote, CTA/button, FAQ/details, and inline icon (the survey's one
  frequency-justified addition — 99 uses on the next migration target), joining the existing
  callout and alert; the converter island demo is replaced by an expiring-announcement banner
  (frontmatter-date-driven, auto-hides after expiry — teaches the countdown's date mechanics
  while replacing a real feature of the aksailingclub migration). Plan:
  `docs/superpowers/plans/2026-07-02-wayfinder-component-set.md`. **BUILT and merged
  2026-07-02:** icon, video, pull-quote, cta, faq, and the expiring-banner island (converter
  retired); gallery waits on the filed image-attribute enabler; figure needs no component
  (engine-native). The design review (step 4) receives the set with the fixtures branch. Each ships as a worked `defineComponent` — schema-driven form, icon, and a
  render implementation in the template's design — so the set doubles as the reference example of
  the component-authoring seam. Rides the scaffolder/template work below and pairs with the docs
  rewrite's authoring guidance.
- **Auth-replacement seam, documented and hardened (pre-beta; Geoff, 2026-07-02).** The
  README claims a developer can replace the auth outright; today only identity read-through
  (`locals.cairnEditor` + `requireSession`/`requireOwner`) and the magic-link transport override
  ship as documented seams, and full replacement lives in an internal design doc. The item:
  document (and where needed, harden) the hand-off that lets a site bring its own login and
  issue cairn sessions — the seam only, not built-in auth options. The claim must be true
  before the repo goes public.
- **Component-system gaps surfaced by the starter set (2026-07-02, batch A evidence).**
  **DEFERRED PAST LAUNCH (Geoff, 2026-07-03): the gallery** — complex, highly taste-related,
  and gated on a real engine enabler (component attributes reject `image`/`array` types;
  repeatable slots render bare text inputs regardless of `itemFields`; the fix is an
  image-typed repeatable-slot widget in `ComponentForm` or an `image` carve-in for component
  attributes, an additive contract change and its own designed task given the phase-3a focus
  hazard). The launch component set is complete without it; the aksailingclub migration's
  photo debt revisits this after launch.
  (2) **Inline icons** — the directive vocabulary is container-only by design, so the shipped icon
  component is block-level; the aksailingclub migration's 99x inline usage needs either a site-level
  render plugin (charter-clean, the default answer) or a deliberate engine decision to admit text
  directives (a design question, not a task). Figure needs no component at all: the engine owns
  `:::figure` natively, and the name is reserved — the docs pass records this.
  (3) **Glyph rendering is fill-only** (from the friction log, Waymark final review T1,
  2026-07-17) — a line-shaped subpath (the flag glyph's pole) paints nothing under a fill-only
  renderer, reading as an ~14x8px smudge at standalone size. Close the subpath in the engine icon
  set or paint stroke+fill. Deferred because a stroke change sweeps all 27 icons just after the
  icon vocabulary shipped.
- **Mechanical hardening: gate the `sideEffects` coverage of the server-only browser stubs (from the
  seams pass-two review, 2026-08-01).** `package.json`'s `sideEffects` now lists `dist/*/browser.js`, so
  a bundler cannot tree-shake away the module-level throw that makes `./auth-crypto` and `./cloudflare`
  server-only in practice. Nothing tests it, and the glob is depth-fixed, so the next server-only subpath
  at a different depth silently reopens the hole while its reference page still promises the throw. Add
  an assertion to `scripts/check-package-files.mjs` (already run by `check:package`) that every
  `dist/**/browser.js` the package emits is matched by at least one `sideEffects` glob, failing with the
  offending path. This is a watch converted into a gate, which is the form that cannot be forgotten.
- **Extend `cairn-doctor`'s `config.dependency-floors` check beyond svelte and kit (filed by the
  pre-beta C1 toolchain-matrix task, 2026-08-01).** `src/lib/doctor/check-floors.ts` reads a
  consumer's `package-lock.json` and compares resolved versions against the engine's own
  `peerDependencies`, but the loop only ever iterates `svelte` and `@sveltejs/kit`, the package's
  only two peer entries. It is the only floor enforcement that reaches a real consumer site (CI
  only proves the engine's own repo), and it currently covers two of the
  [supported-toolchain matrix](docs/reference/supported-toolchain.md)'s rows. Extending it needs a
  source for each additional floor: `typescript`'s 5.0 floor has no `peerDependencies` entry to
  read (it would need a hardcoded constant, since the engine's own devDependency range does not
  describe the consumer floor), and `vite`/`wrangler`/`@cloudflare/workers-types` carry no engine
  floor at all today, only a proven-against version. Scope the check to what the matrix actually
  promises rather than inventing floors the matrix does not assert.
- **Ambient-block drift gate (filed by C2, R2, 2026-08-02).** The `/ambient` reference page states
  `docs/reference/ambient.md`'s whole `App.Locals` block by hand off `src/lib/ambient.ts`; R2's
  execution found the page had drifted already (`cairnAccess` was missing from it entirely). A
  gate that diffs the published block against the source declaration, failing on any field the two
  sides disagree on, closes the class the rewrite just fixed by hand.
- **Log-events field and value parity gate (filed by C2, R6, 2026-08-02).** `docs/reference/log-events.md`
  enumerates each event's fields and every literal value its `reason`/`scope` columns can carry in
  prose; R6's execution found two rows had drifted from their emit sites (`media.uploaded`'s
  documented `ext` field is never written, and `github.unreachable`'s documented `layout` scope
  never fires). `src/tests/unit/log-events-table.test.ts`, written test-first against Task 11's
  parity claim, is the seed to extend into a general field/value-column-versus-emit-site gate
  rather than a fresh script.
- **Export-rule closure gate (filed by C2, R4, 2026-08-02).** The standing doctrine: every type
  named in a public signature is exported from a subpath the consumer already imports. Task 9's
  execution found the rule transitively closed, not merely a check of each export's own top-level
  signature identifiers: a re-exported type pulls its whole structural closure, so the gate has to
  walk each exported type's own body too. `CairnAdapter` stays the one documented exception,
  exempted at `/delivery` and `/delivery/data` because its body reaches auth- and github-shaped
  types `delivery-entry-boundary.test.ts` forbids that subpath from importing; a gate encoding the
  rule needs the same named exception, not a wider one.
- **Empty-doc-block tripwire (filed by C2, RN, 2026-08-02).** A literal-empty `/** */` block over an
  exported symbol in `src/lib` should fail a gate outright instead of waiting for a docs sweep to
  notice by hand. Task 14a found and filled ten of them, including on `createCairnAdmin` and
  `createAuthRoutes`, the package's two headline factories. A lint rule (an `eslint-plugin-jsdoc`
  empty-tag check, or a small `check:*` script scanning `src/lib` for a bare `/**\s*/`) closes the
  class.
- **Facade action-key vocabulary gate (filed by C2's close-out verification, 2026-08-03).** Nothing
  pins the `createCairnAdmin` `actions` record's key list. Two defects this pass fixed by hand share
  that root: the action tables in `docs/reference/admin-routes.md` and `docs/reference/sveltekit.md`
  had drifted to 12 and 11 rows against a 29-key record, and seven facade keys renamed in Task 5 with
  no test asserting the resulting wire names. A posted `?/` key is a runtime string with no
  compile-time check, so a stale one 404s at submit. The showcase e2e does not close this: its
  UI-driven specs click the engine's own components, which rename in lockstep with the keys, so only
  a spec hardcoding `?/name` pins a wire name, and those cover one of the seven renames. A test
  asserting `Object.keys(admin.actions)` against a committed list, cross-checked against both
  reference tables, closes the table drift and the wire-name drift together.
- **Gate gap: `check:reference:signatures` cannot see a table-only signature (filed by the
  pre-beta C1 seam-shape pass's review fold, 2026-08-01).** The gate reads only fenced `ts` code
  blocks; a callback's signature stated solely in a reference table's own Signature or Meaning
  column is invisible to it. `docs/reference/core.md`'s Extension API table already carries both
  conventions side by side (the resolver family states its signature in the Signature column,
  `SiteRender`/`SendMagicLink` state theirs in the Meaning column instead), so the gate cannot
  catch a drift in either form today. Worth closing before C2's naming pass adds more table-only
  entries the gate can't check.
- **Pre-beta polish: fold the four CI-only gates into one named script (Geoff, 2026-08-01).**
  `check:comments`, `check:reference:signatures`, `check:surface`, and `check:snippets` run on CI
  but not under `npm run check`/`npm test`, so the pass ritual recites them by name and two passes
  still shipped red on one of them. A `check:ci-parity` script (and a one-line ritual update) ends
  the recitation; a repeated local workaround is the wrong-altitude signal this repo's own
  conventions name.
- **Pre-beta polish: test the `commitFiles` retry-loop 422 branch (promoted from Later, Geoff,
  2026-08-01).** The fetch-level `GithubDouble` always fast-forwards, so the head-merge retry path
  (a concurrent commit moving the branch under an atomic commit, no `expectedHead`) is never
  exercised. Give the double a concurrency-injection hook and a fast-forward check so a test can
  drive the non-fast-forward retry. Promoted because it is the one untested branch in the publish
  pipeline, the engine's most consequential path, and it should not still be unproven when
  strangers start filing bugs.
- **Pre-beta polish: the cold-reader front-door pass, with a visual first impression (Geoff,
  2026-08-01).** README to tutorial to first deploy, read by fresh context with no family
  knowledge, hunting assumed context the register rules cannot catch (they govern tone, not what a
  stranger already knows). And the README currently shows the product nowhere: strangers evaluate a
  CMS with their eyes before their editor, so it needs admin screenshots or a hosted showcase link.
  Distinct from the filed docs-effectiveness infrastructure (search, `/llms`, the upgrade page),
  which adds surfaces; this audits the ones that exist.
- **Pre-beta polish: the error-message actionability sweep (Geoff, 2026-08-01).** One pass over
  every engine `throw` and `fail(...)` string against the standard the conventions already state:
  can a stranger act on this without us. Most comply; the sweep catches the stragglers, and it
  pairs naturally with the dress rehearsal, which is where stragglers bite a zero-context user.
- **Pre-beta polish: split `CairnMediaLibrary.svelte` (promoted from Later, Geoff, 2026-08-01:
  the code goes public as clean as it can be).** It is the file a code-reading stranger will judge
  the repo by. The code-polish pass's measurement
  (`docs/superpowers/plans/2026-07-01-code-polish-measurements.md`) converged three signals on this
  one file: the largest component in the tree (3,141 lines), the largest jscpd self-duplication
  cluster (25 `html`-format clone pairs, unchanged across the pass), and an internal organization of
  six near-identical inline dialog controllers (open/close/apply per feature, each with its own
  `$state` cluster and origin-refocus lifecycle) followed by six near-identical `<dialog>` markup
  blocks. The pass's S3 idiom convergence already extracted the *script*-level repetition into
  shared helpers; the *markup* duplication is untouched on purpose, since splitting a component
  couples its template, state, and focus behavior (the phase-3a lesson) and risks the same
  multi-instance-focus hazard the form-renderer rider guarded against. The split therefore needs
  its own designed pass, not a rider: most likely one child component or snippet per feature dialog
  (replace, alt-propagate, bulk-delete, orphan-scan, upload, delete), verified against the
  `admin-visual` baseline and the e2e media suite.
- **Pre-beta design: the zero-state audit (Geoff, 2026-08-01).** Every beta user starts in the
  exact state the passes never look at: a fresh site with no content, no media, no second editor.
  One deliberate pass proves every admin screen renders a designed zero state rather than a blank
  table, and that the first-run path (empty dashboard, first entry, first publish) reads as a
  guided arc. The highest-leverage design item in the pre-beta set because it is every stranger's
  first five minutes.
- **Pre-beta design: the admin at the viewport extremes (Geoff, 2026-08-01).** The five-viewport
  composed standard is enforced for the public artifacts through the showcase's CI matrix; the
  admin has visual baselines but has never been held to composed-at-320-and-2560, never merely
  unbroken, screen by screen. Editors open admins on phones constantly.
- **Pre-beta design: the sign-in touchpoints (Geoff, 2026-08-01).** The login screen, the
  magic-link email itself, and the confirm page are the first impression for every editor a
  developer invites, and the email has never had a design pass; it is the one piece of cairn UI
  that renders in an inbox next to professionally designed mail.
- **Pre-beta design: a keyboard-and-screen-reader walkthrough of the three core flows (Geoff,
  2026-08-01).** Sign in, edit-and-save, publish, run end-to-end the way an assistive-tech user
  experiences them. The per-pass a11y reviewer catches component-level issues; nobody has run the
  flows whole. One attended session with findings filed; the public beta is the forcing function.
- **Pre-beta DX: the scaffolder ships an agent brief (Geoff, 2026-08-01).** A scaffolded consumer
  site includes a `CLAUDE.md`/`AGENTS.md` written by the engine: the seams, the gates, the
  conventions, what belongs to the site versus the engine, where the reference docs live. Every
  consumer repo will have an AI assistant in it from day one, and today that assistant starts
  blind and guesses at the boundary. Cheap, distinctive, and compounding; the consumer-side mirror
  of the repo discipline that already works here. Rides the scaffolder work; the brief's content
  is its own small authoring task against the docs register.
- **Pre-beta DX: the zero-credential quickstart (Geoff, 2026-08-01).** The dev backend already
  lets the engine run without the GitHub App; verify the whole first-contact path (scaffold, local
  admin, edit, preview) closes with zero accounts, no GitHub App, no Cloudflare, no email sender,
  then make "try cairn in five minutes" the tutorial's first chapter with provisioning deferred to
  deploy time. Needs verification before documentation; nothing lowers adoption friction more.
- **Pre-beta DX: publish the surface snapshot as a machine artifact (Geoff, 2026-08-01).**
  `docs/internal/api-surface.md` is already an exact, gate-enforced rendering of the whole public
  contract, precisely what an AI agent wants and cannot get from rendered docs. Ship it (or a JSON
  sibling) in the package or on the docs site; nearly free, and pairs with the filed `/llms` page.
- **Pre-beta DX: make the diagnostic pair consumer-complete (Geoff, 2026-08-01).** `cairn-doctor`
  covers config and `cairn-audit` covers the design layer; verify both run cleanly from a consumer
  site (not only this repo), document them as the first two commands to run when something is
  wrong, and have the scaffolder's agent brief tell the AI assistant to reach for them before
  guessing.
- **The go-public pass (gates the repo flipping public at beta).** A real pass, not a settings
  toggle: a full git-history secrets scan (gitleaks/trufflehog — the loose `.pem` was shredded from
  disk but history was never audited); an exposure review of `docs/internal/` beyond staleness
  (machine paths, account and database identifiers, infrastructure detail — each gets a deliberate
  public/redact/archive ruling); fork-PR CI hardening (Actions permissions, `pull_request` vs
  `pull_request_target`, protecting the OIDC publish path from drive-by PRs); branch protection on
  `main`; the private-vulnerability-reporting toggle plus the SECURITY.md trim (the standing timed
  item); and the issues-on decision with a minimal triage posture. Widened (Geoff, 2026-08-01): the
  exposure review covers everything the flip publishes, not `docs/internal/` alone — the
  `docs/superpowers/` plans, specs, and post-mortems (written candid, for an audience of us), the
  STATUS archives, and the repo `CLAUDE.md` — and one rule changes meaning at the flip: the docs
  register's never-name-the-ASC-site line currently binds only the published arms, a boundary that
  stops existing when the whole tree is public, so the internal arms' pervasive ASC naming needs
  its own deliberate ruling (scrub, prune, or keep), per arm.
- **The beta dress rehearsal (after the docs rewrite and scaffolder land).** One fresh-environment
  first-hour run: a clean machine or account, only the public docs and scaffolder, zero context,
  through to a deployed site with a working admin. Every artifact will have been individually gated
  by then; this tests the chain the way a beta user experiences it. A cloud agent runs the mechanical
  path and reports friction; the steps needing real accounts (Cloudflare, GitHub App) are a short
  attended session.
- **Third site migration: aksailingclub.org onto cairn/Waymark (Geoff, 2026-07-02: "the next
  major site I'll move").** Follows the ecxc/907 rebuilds and rides their playbook (scaffolder
  path, permalinks preserved, build-alongside swap). Its content patterns are surveyed as input to
  the Waymark starter-component set, so the set serves the known-next migration, not just the
  existing two.
- **A second template: Topo, the documentation template.** Derived from Waymark and optimized for
  documentation sites: the sidebar concept tree, in-page table of contents, code-first typography,
  prev/next flow — the docs-site table stakes, curated with Waymark's restraint rather than
  exhaustively. Once Topo exists, cairn's own documentation moves onto it, so the engine publishes
  its own manual (the strongest dogfood available, and the standing proof that the docs-site use
  case is first-class). Inherits Waymark's component set and adds only what documentation demands.
  Sequenced after the Waymark starter component set and the frozen-contract docs rewrite (which
  produces the content Topo hosts); gives the scaffolder its first real template choice.
- **The project sites: cairn.pub on Waymark, docs.cairn.pub on Topo (domain DECIDED 2026-07-02: cairn.pub, standard tier, registered via the dashboard since the Registrar API does not yet carry .pub; every single-word alternative was taken and the .pub TLD reads "publish", cairn's signature verb; the cairn.dev acquisition inquiry remains the optional endgame, yielding via redirect if it ever lands).** Two sites, not one, because
  a cairn site carries one design (one adapter, one `render`), so a combined site would compromise
  either the landing pages or the docs chrome. Each site is the living exemplar and standing dogfood
  of its template: the intro site is the Pages-plus-Posts shape cairn targets, and the click-through
  proof a prospective user sees before running the scaffolder; the docs site is the engine
  publishing its own manual. Subdomain-joined with shared header cross-links; Topo's Waymark
  derivation keeps the two reading as one property. Sequencing: the intro site can go up early, on
  Waymark as it stands, before beta. The docs now render on cairn.pub itself (`/docs` and `/help`,
  shipped 2026-07-18 from the `0.87.4` in-package docs tree with TOCs and the anchor-compatibility
  gate); the remaining step is the docs.cairn.pub split when Topo exists, a migration of the
  already-portable pipeline, not a rebuild. Domain procurement: cairn.pub (see above).
- **The `create-cairn-site` scaffolder.** Sequenced after Contract v2 phases 1-2 so it bakes the template
  against v2. The pre-B3 engine/DX slot lands first (remove the calendar route, the GitHub-App "appId is
  config, not secret" trap, the doctor that greens while the deploy fails, and the other first-hour DX
  warts a dogfood found), then Part B3 (defaults) and B4 (options plus first-run), then the Part C
  generator. Plans under `docs/superpowers/plans/2026-06-2*-cairn-scaffolder-*`. Carried from the
  friction log at its 2026-07-16 clearing, each re-verified at plan time: (1) starter/seed content —
  the strongest empty-state activator is an editable, labeled starter post, but the engine has no
  mechanism to commit labeled starter `.md` entries on a fresh site or distinguish them from authored
  content; the scaffolder seeds concept-differentiated starters (a Post and a Page) and the
  empty-state recipe gains a starter slot. (2) Project-setup emission — a fresh site needs
  `@types/node` declared, the skeleton's default `static/robots.txt` removed (it silently collides
  with the engine's robots route; the engine should detect and warn), and the
  `prerender.handleHttpError: 'warn'` policy for the uncrawled feed and robots routes; Part B (the
  showcase as the deployable template) fixes most of this by construction. (3) The docs on-ramp gap —
  an "after scaffolding: what you got and what to change" orientation page, gated on the scaffolder
  landing so it describes real generated output.

- **`/healthz` needs a check that reaches the repository, not only the signing key.** Surfaced
  2026-08-05 by the `cairn-pub` `0.94.0-rc.1` migration (see [that
  report](docs/internal/feedback/2026-08-05-cairn-pub-migration.md)). `healthLoad` runs
  `signingSelfTest` against the App id and the key secret and stops there, which is a deliberate,
  documented scope: it catches a broken PKCS#1-to-PKCS#8 conversion, and that is the failure it was
  built for. The gap is that the endpoint is named `healthz`, its top-level field is `ok`, and a
  site whose App installation has never carried its own repository answers `{"ok":true}` while
  every save and publish 404s. `cairn-doctor` catches that case and `/healthz` does not, so the
  cheap always-on check disagrees with the expensive occasional one. Candidate: a second check that
  mints an installation token and reads the configured repository, reported beside
  `githubAppSigning` rather than folded into it, since the two fail for unrelated reasons and an
  operator wants to know which. Weigh the added latency and the GitHub rate-limit cost against
  making `/healthz` honest about the backend, and consider caching a success. This is the same wall
  the provisioning-script entry above names as non-provisionable (App creation and installation);
  the difference is that this one is about telling an operator the wall is still up.

- **`cairn-audit`'s rendered page-identity guard passes a route that renders an error page.**
  Surfaced 2026-08-05 by the `cairn-pub` migration, the same report. The guard compares a page's
  settled DOM against the identity its server-rendered response carried, which catches a route that
  hydrates into different chrome. It cannot catch a route that renders the same error page in both
  captures: on that run `/admin/signups` was returning the site's public error page under a valid
  session, the two captures agreed, every rule ran against the error page under the screen's name,
  and the run reported zero errors across all seven pages. The findings read as wrong only to a
  human scanning them (`header.site-header`, an accent-filled "Return to homepage"), which is the
  reading a gate exists to spare. Candidate: assert a 2xx response status on the no-JavaScript
  baseline capture the harness already takes, and report a non-2xx as a harness finding at error
  tier the way a stale allowlist entry is. The config docs already promise the run fails on "any
  configured page rendering outside 2xx", so this is closer to a defect than a feature; the case
  that escapes is a page whose framework answers 200 and renders an error boundary, which is
  exactly what SvelteKit did here.

- **A narrowed, manifest-backed resolver for `previewLoad` (filed 2026-08-06, preview pass).** The
  shipped v1 hands `previewLoad` the site's own `PublicRoutesConfig`, globbed build-time corpus
  included, so the never-prerendered preview route pulls that whole corpus into the deployed
  Worker bundle (roughly 1-2 MB at club scale against Cloudflare's 10 MB paid ceiling), a
  deliberate, stated v1 cost (Geoff, 2026-08-06). This would replace the bundled corpus with a
  request-time manifest read, restoring the corpus-stays-out-of-the-Worker invariant the rest of
  the delivery surface holds. **Trigger:** a real site approaching the bundle-size limit; the
  showcase's own bundle-size assertion (`examples/showcase`'s e2e build step) is the tripwire that
  should surface it.

- **A `cairn-doctor` check that the preview route is not prerenderable (filed 2026-08-06, preview
  pass).** `previewLoad` itself throws a build-time error when a site lets `/preview/[token]`
  prerender, but that only fires on a build the developer actually runs locally or in CI; a
  doctor check would catch the same misconfiguration as a deploy-time preflight, the same
  proactive shape as the doctor's other route-shape checks, rather than relying solely on the
  in-engine backstop.

- **An engine-level rate-limit seam for `previewLoad` (filed 2026-08-06, preview pass).**
  `previewLoad` currently calls no rate limit of its own; the guide's WAF-rule recommendation on
  `/preview/*` is the whole story until this lands. A seam accepting the existing
  [`RateLimitLike`](docs/reference/sveltekit.md#ratelimitlike) (the same structural interface
  `createSectionAction` already takes, degrade-to-open on an absent binding) would let a site wire
  a Workers `RateLimit` binding directly to the load, matching the engine's own idiom rather than
  leaning on the zone's edge rules alone. **Trigger:** real-world spray traffic against a deployed
  `/preview/[token]` route.

## Later

- **Undelete a recently-deleted entry (filed 2026-08-06, history/revert design sitting).** History
  and revert both deliberately leave a deleted entry out of scope: `historyLoad` answers a 404 for
  one exactly as `editLoad` does, so nothing in the admin can name a deleted id to restore it, and
  the escape hatch today is a developer reading git directly. Undelete needs a surface this repo
  doesn't have yet before it can exist at all: some way for an editor to see, and choose from, a
  concept's recently-deleted entries, since a delete's commit removes both the manifest row and the
  file, leaving nothing in the live corpus a screen could list. That recently-deleted surface, its
  retention window, and how it's populated (a bounded read over the manifest's own git history, a
  soft-delete flag, or something else) is itself a design question, deliberately left open rather
  than answered here; it wants its own sitting once a real request for undelete lands, the way entry
  history's own promotion did.

- **A passkey layer on the auth-channel session model, post-1.0 (Geoff, 2026-08-04).** Returning
  members authenticate with a passkey instead of a fresh code, layered on top of
  `createAuthChannel`'s existing session model rather than replacing it: passkeys cannot replace
  the code channel outright, since enrollment and account recovery both still need the
  roster-contact bootstrap the code flow already provides. The `cairn_channel_code` table's `kind`
  column (currently always `'code'`, and `AuthChannelConfig.kind` already rejects any value but
  `'code'` at construction) is the seam this layers through: a `'passkey'` kind on the same tables,
  the same session issuance, the same revocation. Not before 1.0, and not without its own design
  sitting and adversarial review rounds first, the same discipline the code-channel design went
  through (three rounds, v1 through v3.1) before its first implementer dispatch.

- **A packaged component-authoring skill, once the template track supplies the evidence (Geoff,
  2026-08-01; no hurry).** cairn ships one skill, `cairn-admin-screens`, scoped to `/admin`. Nothing
  covers the other authoring task a consuming site repeats: defining a content component with
  `defineComponent`, its directive syntax, and the `hydrate`-plus-`rendering.islands` pairing for the
  interactive kind. The docs already carry the mechanism (`configure-rendering.md` builds one from
  nothing, `add-an-island.md` wires a hydrated one, `defineComponent` in the core reference), so a
  skill written today would mostly restate three pages, and a skill that restates docs is a second
  copy of one contract that drifts. **The trigger, not a date:** the Waymark rebuilds, Topo, and the
  scaffolder each define components next. Harvest the friction from those, and if the same judgment
  calls recur across them (static versus hydrated as the default, directive naming and attribute
  conventions, how a component behaves in the editor preview under the one-renderer rule, the design
  tokens a component is expected to reach for), that recurrence is both the skill's content and its
  justification, the same way `cairn-admin-screens` was born from measured admin-screen drift rather
  than from anticipation. Write it against the same constraints: the always-loaded core stays inside
  the `check:package` token budget, and it points at the docs and `cairn-audit`'s mechanical checks
  rather than restating them. If the harvest shows no recurring judgment call, that is a real answer
  and the entry closes unbuilt.
- **Field-label weight: cairn's 500 vs the consumer ruling's 600 (a design ruling, from the
  friction log 2026-07-29).** The form-anatomy contract keeps `font-medium` (500) as cairn's
  individual-field-label weight, matching the dozen-plus existing call sites, while the consumer
  site's own ratified two-level label ruling uses 600. Whether cairn's field labels bump to match
  is a rendered-probe-plus-eyes-on ruling for whichever admin design pass next opens; reweighting
  moves pixels sitewide, so it never rides another pass's baseline regeneration silently.
- **An engine-side design dev loop (`design:dev` or an optimizeDeps exclusion).** Engine admin
  work breaks the 0.84.0 minutes-per-turn design loop: after `npm run package`, vite's client dep
  optimizer serves a stale pre-bundled shell (SSR reloads fire, the client bundle does not), so
  every component-edit iteration needs a `--force` dev-server restart (~10 rounds of it during the
  2026-07-15 design arc). Candidates: the showcase's vite config excludes the linked package from
  optimizeDeps, or a documented `design:dev` script that watches `src/lib` and repackages +
  restarts. The consumer-site loop is unaffected (site source HMRs directly).

- **`sizes` breakpoints are generic constants** (from the friction log, Waymark final review T4b,
  2026-07-17). The engine's srcset `sizes` emits 800px/1200px, matching the built-in preset
  magnitudes rather than any theme's actual measure; a mismatch costs only srcset-candidate
  efficiency, but a theme with a very different measure may eventually want a seam.
- **`AssetConfig.transformations` doctor corroboration check.** `transformations` is a self-declared
  flag on `AssetConfig` (default `false`); nothing in the engine verifies it matches whether
  Cloudflare Image Transformations are actually enabled on the zone, so a site that flips the flag
  without enabling the feature (or vice versa) gets silently wrong image URLs instead of a build-time
  or doctor-time signal. `cairn-doctor` could corroborate the declared flag against a live probe.
- **Frontmatter field `description` channel.** Schema-authored per-field help rendered under the input,
  so the Details panel stops showing fields with no hint. Dovetails with the Contract v2 field work.
- **Nested-image delivery: seo and needs-alt.** Allow `seo: true` on an image inside a top-level `object`
  (phase 3a forbids it because `seo-fields.ts` reads a hardcoded key list, not the schema), and surface a
  nested image's missing alt in the editor's needs-alt advisory (3a's notice enumerates top-level images
  only). Both unlock when delivery seo resolution walks the concept schema, a fit for the 3b concept work.
- **Details panel default-open heaviness.** The Details slide-over defaults closed and buries every non-title
  field as the vocabulary grows; phase 3a's repeatable rows collapse per row, but the panel itself is
  unrevisited. Look at its default and grouping now that containers add fields.
- **`itemLabel` as a function (concept-array editor with a live-row snapshot).** Phase 3c shipped the cheap
  half of the data-versus-behavior split: the per-field `behavior.validate` runs server-side through the
  unified `fieldset` validator for concepts and component attributes alike. The function-valued `itemLabel`
  was cut (3c plan A14): it must run client-side in `RepeatableField` as the author types, but the rows are
  intentionally uncontrolled (`row.value` is stale between edits by design, to avoid edit loss), so feeding a
  live `itemLabel(item, index)` the row's current values needs a per-keystroke row-input snapshot plus a new
  client behavior channel (a `CairnAdmin` prop and scaffolder wiring). A focused concept-array-editor pass can
  design that live-row snapshot properly. The string `itemLabel` (a sub-field key) still covers the common case.
- **Dedupe the leaf-field family's shared pass-through props, not the renderers themselves.** The
  code-polish pass's guarded rider (`docs/superpowers/plans/2026-07-01-code-polish-pass.md`, Task 7)
  wrote guard tests first
  (`src/tests/component/form-renderer-family-guard.test.ts`) covering both leaf-field dispatchers,
  then found the merge architecturally wrong on four separate walls the guards now pin: the binding
  model (`FieldInput` does native, name-carrying, uncontrolled form participation; `ComponentForm`
  does controlled state with inline touched-tracking), the field-type semantics each switch encodes
  differently for the same nominal type, the validation display (`FieldInput`'s native `required`
  plus an `aria-describedby` hint versus `ComponentForm`'s asterisk, `aria-invalid`, and a
  `role="alert"` error span with live values bound out for the dialog preview), and the phase-3a
  multi-instance focus model (`RepeatableField`'s uncontrolled rows must survive a sibling structural
  mutation without re-seeding, which a shared controlled renderer cannot preserve). A homogenizing
  merge fails the guard suite by design; per the rider's escape hatch, no merge landed. The
  duplication the original entry named is real but narrower than a full merge: `FieldInput.svelte`,
  `ObjectGroupField.svelte`, and `RepeatableField.svelte` pass roughly nine identical props straight
  through to their children (`mediaLibrary`, `heroFieldRefs`, `conceptId`, `id`, `targets`,
  `markFieldsDirty`, `onuploaded`, `onheroneedsalt`, and the field). Folding those into one shared
  field-context object (a prop or a context, not a merged component) is the accurate remaining
  refactor; the guard suite is the standing regression net for it.
- **Build-time icon-name validation against the set.** An icon value is a glyph name from the adapter's
  `rendering.icons`, but the `fieldset` validator only enforces required and non-empty (3c decision 1); it does
  not check the name against the set (the directive icon is not set-validated today either). A build-time check
  that a frontmatter or attribute icon name resolves in the declared set would catch a typo before delivery.
- **Empty-icon-set is a doctor-detectable config error.** A required `fields.icon()` field declared while the
  adapter ships no `rendering.icons` renders an unsavable picker with zero choices (3c A7). `cairn-doctor`
  could detect this configuration mismatch and report it rather than leaving the editor stuck at runtime.
- **Editor-help later slices.** The screen-contextual slide-over, a route- and concept-keyed help-content
  registry, and a standing Help home with a labeled launcher. The foundation shipped in `0.61.0`-`0.62.1`.
- **Per-field advisory seam plus live slug recompute.** An editor-side advisory-validation surface, and a
  slug preview that recomputes as the author retypes.
- **`supportContact` personalization.** A richer shape than the current bare string, a name plus a
  contact, so a self-serve hand-off reads personally. (The bare-string default shipped in `0.87.4`:
  unset now resolves to cairn's hosted editor help at cairn.pub/help.)
- **Date-vs-publish field redesign.** A product look at the date field's label and affordance, since it
  reads as if it might schedule publishing.
- **Starter content and onboarding progress.** Concept-differentiated seed content for the strongest
  first-run activation, and a per-editor getting-started progress record.
- **Remaining media work.** Media Pass D, plus the owed live bulk-delete admin smoke. Passes 1-3c
  and A-C shipped across `0.57.0`-`0.59.0`; the Library direct upload landed after.
- **Small DX debt.** Give the component picker dialog a `sm:`-breakpoint bottom-sheet so it is not an
  unconditional `85vh` on a short viewport, and resolve the worktree dual vite/kit install collision
  (the showcase typecheck throws ~12 dependency-`.d.ts` errors under a symlinked-`node_modules` worktree,
  so the local consumer-build proof currently leans on the e2e build; CI's real checkout is clean).
- **Engine-provided `inFeeds`/`routable` feed and sitemap views.** Phase 3b makes `routing.inFeeds`,
  `routable`, and `dated` concept-declared but keeps `inFeeds` a consumer-read hint: no engine code filters
  on it, so a site's feed and sitemap routes still hand-pick their concepts. Lands in the render/delivery
  phase, where the delivery surface exposes a feed view (the `inFeeds` concepts) and a sitemap view (the
  `routable` concepts) so a consumer stops re-deriving membership.
- **Watch: transcribe the site URL policies into `defineConcept` at each v2 cutover.** When ecxc-ski and
  907-life cut over to the v2 adapter, move each site's YAML `content:` URL policy onto its concepts via
  `defineConcept` (ecxc-ski: posts `/:year/:month/:slug`, `datePrefix: month`; 907-life: posts
  `/:year/:month/:day/:slug`, `datePrefix: day`), delete the YAML `content:` block and the dead `url:` key,
  and verify the live permalinks. The phase 3b hard-error in `parseSiteConfig` makes a missed transcription
  fail loud rather than silently default `datePrefix` to `day` and shift every post URL. Tied to each site's
  v2 cutover pass.
- **Shareable draft preview (pattern before engine).** An editor who wants "look at this before I
  publish" today has only the in-editor preview. The per-entry `cairn/<concept>/<id>` branches mean a
  Workers Builds preview deployment per branch can give a shareable draft URL with zero engine code;
  document that pattern at a site cutover, and consider an engine-rendered signed preview URL only if
  the pattern proves clumsy on a real site.
- **Migrate cairn's CSRF-disable before SvelteKit removes `checkOrigin`.** cairn's admin CSRF ownership
  depends on `csrf: { checkOrigin: false }`, deprecated in SvelteKit 2.61. `trustedOrigins` cannot replace
  it: a missing-`Origin` POST is always forbidden, and the check runs before the `handle` hook. The
  planned fallback is an edge Transform Rule that injects `Origin` for `/admin` POSTs; the higher-leverage
  path is the upstream issue (sveltejs/kit#15992). Track the removal and act before a major lands.
  Reasoning in `docs/cairn-dx-feedback-2026-06-09-907-0.36-retrofit.md`.
- **A collapsed sidebar section holding the active route's link does not auto-expand.** Landing on a
  route whose nav entry sits inside a section the editor previously collapsed leaves that section
  closed, so the active link is present but hidden. Consider forcing the section open when one of its
  children `isActive`, without overriding a deliberate manual collapse of an inactive section. Review
  finding, 2026-07-14 nav-layout pass.
- **Preserve the editor's draft on a save conflict.** The conflict refusal itself is right (never
  merge by guesswork), but recovery today is a manual copy-reload-reapply the editor guide has to
  teach: copy your whole draft somewhere safe, reload for your colleague's version, re-apply by
  hand. The editor's own text could be preserved for them instead — shown side by side, or held in
  a recoverable buffer. A docs section that procedural is a UX gap wearing a hat. From the friction
  log, 2026-07-03; triaged here at the 2026-07-16 clearing.
- **Make required image and reference fields visible to constraint validation.** Both arms submit
  through hidden inputs, which the browser's constraint API ignores regardless of `required`, so a
  required hero image or author reference never trips the capture-phase invalid handler that
  reveals the Details panel; the failure surfaces only server-side. Needs an aria-invalid plus
  focus-target pattern threaded into `MediaHeroField`/`ReferenceField`, not a native attribute.
  (The closed multiselect's honest at-least-one signal, the sibling gap, shipped 2026-07-16.)
- **Give URL identity a single home.** One public URL is assembled from the frontmatter date, the
  per-concept `datePrefix`, and the URL policy the catch-all `byPermalink` route reads; the
  content-model explanation documents it, but the concept cannot be stated without pointing at
  three places, which is a complexity signal. Candidate: a consolidating helper so a reader and a
  developer have one home for slug shaping. From the friction log, triaged 2026-07-16.
- **Remove the e2e suite's cross-spec pagination coupling.** The 2026-07-16 pass converted the
  seed-post convenience clicks to direct navigation, but the underlying class remains: specs
  accumulate entries against a paginated newest-first list, so any future list-click assumption
  re-inherits the fragility. A per-spec content reset, or a seed post dated in the future so it
  stays on page one, removes the whole class.

## Considering

- **Migrate the engine's own editor default from magic-link to codes.** The auth-channel factory
  design (`docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md`, decision 6) named
  this out of scope on purpose: `magic_token` and the editor magic-link flow are untouched by
  `createAuthChannel`, which serves a second audience only. The open question this entry tracks is
  whether the engine's own zero-config editor auth should someday move from a magic-link URL to an
  OTP code, either on the same `createAuthChannel` session model or its own. No trigger yet:
  magic-link's disciplines (hashed-at-rest tokens, a per-address cooldown, one live token per
  address) already hold in production on two sites, and a code brings its own guessing-bound
  trade-offs the design spec's residual risks catalogue names for the second-audience case. Take
  this up only if a concrete reason to prefer codes for editors surfaces, not speculatively; email
  magic-link stays the documented, zero-config editor default until then.
- **Inline includes.** Fragments (shipped) resolve block-only: an `::include` stands on its own line
  and splices the fragment's blocks in place, so a fragment cannot supply a phrase mid-sentence. The
  promote trigger is a real production case. Watch ASC's Discord vocabulary, where a recurring inline
  noun (a channel name, a season label) gets retyped by volunteers and drifts. Take
  it up when that case is concrete, not before; the block shape covers every reuse case the design
  brainstorm actually found, and an inline directive is a second grammar to teach and maintain.
- **Narrow `EngineScreenId` so a misspelled built-in screen squiggles in the editor.** The type
  widens to `(string & {})` so a dynamic concept id stays assignable, which means
  `{ screen: 'setings' }` shows no red squiggle and surfaces only when `validateNavLayout` throws
  at server start. The construction throw is loud and names the bad value, so the miss costs a dev
  restart, not a wrong render; a tighter net (a template-literal union over the adapter's own
  concept ids) needs type-level access to the adapter this module does not have today. Take it up
  if that access ever falls out of other type work. From the friction log, triaged 2026-07-16.
- **Admit editor-tooling keys to the site-config allowlist when a real tool asks.** The
  unknown-top-level-key parse error means a YAML-LSP `$schema:` key would fail the parse. Conscious
  strictness, per the loud-boundary posture; add a key to `KNOWN_TOP_LEVEL_KEYS` only when a real
  tool wants it, not preemptively. From the friction log, triaged 2026-07-16.
- **What `draft` means on a non-routable concept.** `draft` is a routing idea: a draft entry's page
  404s and stays out of feeds. A fragment has no page, so the flag has nothing to withhold, and today
  nothing filters it. A site that declares a `draft` field on its fragments concept and sets it would
  find the fragment still listed in the picker and still spliced into every published page that
  includes it. No production case has asked for it, and inventing the semantics without one is how a
  lean concept grows a second meaning. The trigger is a site that declares the field and expects it to
  bite; the answer is then either filtering drafts out of `fragmentTargets` and refusing them in
  `buildFragmentResolver`, or rejecting the field on the concept at declaration. Surfaced by two
  reviewers on the fragments pass, 2026-07-16.
- **Fragment bodies on the manifest row.** `editLoad` reads every published fragment's body on every
  edit-page open, one `readFile` per fragment, so the picker can list them and the preview can resolve
  an include the author inserts without a round trip. That is fine at the handful of fragments a small
  site keeps and is the reason the live preview needs no server call. The cost grows with the fragment
  count, one read each, against the installation's GitHub rate limit. The trigger is a real site
  carrying dozens of fragments;
  the fix is a body column on the manifest's fragments rows, which collapses it to zero extra reads at
  the cost of a fatter manifest. Surfaced by the fragments pass's own review, 2026-07-16.
- **Scheduled publishing ("publish at").** Editors expect scheduling from a CMS, and the
  date-vs-publish field redesign note in Later exists precisely because the date field already reads
  as if it schedules. The lean shape, if it lands: a publish-at timestamp on the held per-entry
  branch, a documented Cron Trigger the site adds, and the existing publish action fired at the
  time; no queues and no recurring schedules. It cuts against the deliberate-Publish philosophy, so
  this is a product decision to make explicitly, not an engineering default.
- **Editor find/replace.** A recipe-built find/replace panel on `@codemirror/search`'s `createPanel`,
  keeping CodeMirror's search state and commands but rendering cairn DOM. Bind only the search subset of
  `searchKeymap` (not the stock un-themed `gotoLine` panel or the multi-cursor bindings it also carries),
  and honor the full panel a11y contract (no focus trap, labeled stateful toggles with `aria-pressed`, a
  polite match-count live region reading "3 of 12"). Cut from the CM integration pass as new capability,
  not chrome alignment: cairn edits short Posts and Pages and the browser already finds visible text, so
  scope it only if find/replace is genuinely wanted, on its own merit.
- **Autocomplete dropdown look (conditional).** The link-completion dropdown stays a plain CodeMirror
  default. The CM integration pass deliberately did not align it: CodeMirror offers no public replacement
  for the dropdown container, so skinning it would add internal-class coupling (`.cm-completionLabel`,
  `.cm-completionMatchedText`) on a rarely-seen surface, against the pass's shrink-the-fragility goal.
  Revisit only if the default reads as jarring in practice, and only through the public
  `tooltipClass`/`optionClass` tint (font and surface on the container), never reaching into the internal
  completion classes; hold the selected state to a non-color cue and the contrast floors.
- **A strong/gentle CTA pair in the starter template (DaisyUI Aura).** The template could offer a
  developer two call-to-action treatments to choose from: a strong one using DaisyUI's Aura animated glow
  and a gentle one without. Template only. The admin interface stays restrained and never uses Aura.
- **Export `applySecurityHeaders` for a second audience.** `createAuthGuard` applies cairn's hardened
  admin response-header set only under `/admin`; a site's second authenticated audience built on
  `./auth-crypto` (a member portal, an offer-token flow) has no exported way to apply the same set to
  its own responses and reimplements it by hand. Filed by the 2026-08-01 ASC engine-seams adversarial
  review as a promotion candidate rather than adopted in that pass; take it up when a second audience
  actually needs it.
