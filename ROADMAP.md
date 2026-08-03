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
event, not an everyday one." Cut it when the surface stops moving, not on a date. Readiness checklist:

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
  showcase. (Weigh whether this gates 1.0 or rides the first 1.x.)
- [ ] **The core-feature roadmap has landed** to the point the author opens the project up: the intro's
  "closely held until the core lands" condition is the same condition as 1.0. Named contents (Geoff,
  2026-08-01): entry history, revert, and public preview for a non-editor, all three ratified as
  landing BEFORE the public beta; their entries live in Now. Release intent (Geoff, 2026-08-01):
  the three bundle into one release, the next cut after the ASC-seams window publishes, however
  many passes they take to land.

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
- **Phase C, settle the contract:** C1 the seam-shape pass is done and holds unpublished (the
  `check-reference-signatures.mjs` `| undefined` fix, the env-genericity sweep, the function-color
  and refusal-channel rulings, and the toolchain matrix); C2 the naming pass (a Fable sitting over
  `api-surface.md` settled the rename set and the `locals` policy, then one execution pass landed
  every rename in one diff, one `Consumers must:` list — the only genuinely breaking pass in the
  series) is done and holds unpublished, its one behavioral task (the refusal-channel convergence,
  R10) split out as **C2b** on its own worktree, in the same unpublished window.
- **Phase F, the core features:** F1 the history/revert design sitting; F2 the history view
  pass; F3 the revert pass (the sitting may merge F2/F3); F4 the preview design sitting; F5 the
  preview pass.
- **RELEASE ONE cuts here**, the last substantial `0.x`: contract, renames, and the three core
  features in one window. The standing pipeline consumes it (the Waymark rebuilds, ASC's
  retrofit) — the one round of breaking changes.
- **Phase P, polish and docs (non-breaking; internal order flexible):** P1 mechanical hardening
  (ci-parity, the `commitFiles` test, the surface machine artifact, the error-message sweep, and a
  small showcase route exercising `adminAction` and its converged refusal paths end to end, since
  the showcase exercises neither today and a kit-version drift in action-thrown redirect/error
  rendering would go uncaught); P2
  the zero-state pass; P3 viewport extremes; P4 sign-in touchpoints, with the keyboard/SR
  walkthrough as the attended session at phase end plus a fixes rider; P5 the
  `CairnMediaLibrary` split; P6 front-door docs (cold-reader, diagnostic-pair); P7 the
  zero-credential quickstart. The standing template track (cairn.pub voice, starter set, Topo
  with the docs-effectiveness infra, the scaffolder with its agent brief) runs parallel and
  feeds the rebuilds.
- **The AI-posture pass runs BEFORE the migrations, not in phase P** (Geoff, 2026-08-03): C2b, then
  the AI-posture pass, then the RC cut, then the migrations. It was briefly filed as P8; it moved
  because a site should adopt its posture in the same session that migrates it. See Now.
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

- **The ambient-defaults audit: what does a deployed cairn site do that nobody decided? APPROVED
  (Geoff, 2026-08-03), runs after C2b and BEFORE the AI-posture pass.**

  **Why it exists.** Every gap-detection mechanism this project has is driven by someone bumping
  into something: the consumer briefs report what ASC and xcathletes hit while building, the
  friction log reports what writing a doc exposed, the review gates catch defects in code just
  written, and the 2026-07-01 mission review asked what cairn does not do that a developer wants.
  All of them are blind to the same class, **ambient behavior a deployed site inherits without
  anyone choosing it**, because that class fails silently and so generates no report. The AI-crawler
  finding is one instance: two of four sites were declining AI crawlers and nobody picked that.

  **Why now, rather than in phase P.** Release one is the last cheap breaking round. A finding that
  surfaces in phase P becomes its own breaking round against four sites; the same finding now joins
  a `Consumers must:` list the migrations already absorb. And the AI-posture pass is its first
  consumer: if several ambient defaults share a shape, they want one policy surface rather than a
  bespoke `ai:` field plus a later refactor.

  **The method, which is what makes this an audit and not a worry.** Enumerate the surfaces a
  deployed cairn site presents to the world, and for each ask who chose the current behavior:

  - HTTP response headers on public output (the admin has `applySecurityHeaders`; public is the
    site's)
  - robots.txt and sitemap, including the managed-layer interaction
    ([[cloudflare-blocks-ai-crawlers-by-default]])
  - cookies and privacy signals
  - outbound email and its DNS authentication (SPF, DKIM, DMARC). Same shape as the crawler finding:
    infrastructure-determined, invisible to the operator, total to the editor who never got the
    magic link
  - cache and CDN behavior
  - error and redirect responses
  - TLS and canonical host

  For each, the answer is "the developer, explicitly", "cairn, deliberately, and it is documented",
  or "nobody". **Only the third is a finding.** That terminates, which is the point.

  **What owning the whole chain unlocks (Geoff, 2026-08-03).** cairn is Cloudflare-specific, and the
  comparables survey makes clear that this is a capability rather than a limitation. Every other
  tool in that survey hands off at some boundary and cannot reason past it. cairn owns the entire
  publish chain: content, git, the GitHub App commit, the Worker, the bindings, the edge, and the
  DNS. Nothing else surveyed can verify a link it does not own, which is the actual explanation for
  the survey's near-universal silence.

  Directions this opens, recorded as direction and not yet commitment, each an instance of "verify
  what is actually true rather than what config claims":

  - **Publish-chain verification end to end.** A publish commits to git, which deploys, which serves.
    cairn could confirm the published entry is genuinely live at its permalink rather than assuming
    the chain worked. No surveyed CMS controls enough of that path to try.
  - **Magic-link deliverability.** cairn sends through Cloudflare Email and the site's DNS is in the
    same account, so SPF, DKIM, DMARC, and sender-domain onboarding are all readable. This is the
    same silent-failure shape as the crawler finding, and worse in consequence: an editor who never
    receives the link has no way to report a failure they cannot see.
  - **Binding and readiness truth.** `doctor/` and `check:readiness` already do a version of this
    locally. The unlock is checking the deployed Worker rather than the local config.

  These belong to later passes. They are recorded here because the audit will surface them and they
  should land in a tier rather than in conversation.

  **A comparables study runs alongside it** (Geoff, 2026-08-03; dispatched the same day so the
  findings are on the shelf when the audit opens). **Consolidated results, 22 tools:**
  `scratchpad/ambient-defaults-comparables.md`, to move into `docs/internal/` when C2b closes.
  Read its coverage table first: three of four sub-agents misbehaved during the sweep, and the
  Starlight, VitePress, and Kirby rows are thin. It asks how git-backed CMSs, site frameworks,
  opinionated CMSs, and hosting layers each treat these same surfaces, classifying every tool and
  surface pair as a silent default, a documented default, a forced decision, or absent. **The
  forced-decision column is the point**: it tells us which mechanisms for making a developer choose
  actually exist in the wild (required config key, failing build, init prompt, preflight check) and
  which ones developers tolerate, which is exactly the evidence the no-default AI-posture ruling
  needs. It also collects dated harm from silent defaults, and, bounded to this same
  hygiene-and-operational space rather than a general feature survey, notes capabilities comparable
  tools ship that cairn lacks.

  **Bounded two ways.** The audit **reports and does not fix**. Findings triage into: rides this
  window because it is breaking, defers to phase P because it is not, or is not cairn's job. Only
  the first bucket touches the release. If run with breadth, one independent lens per surface is the
  shape that fits, since a single reviewer's attention is exactly what this class slides past.

- **The site's AI posture: its own dedicated pass, running after the audit. REQUESTED, PASS GRANTED, and
  SEQUENCED AHEAD OF THE SITE MIGRATIONS (Geoff, 2026-08-03).** One config expressing a site
  author's stance in either direction, from which cairn emits whatever artifacts that stance
  implies, documented and present in **every cairn site's setup path**. The goal is the outcome,
  never a particular file. Research is done
  ([`docs/internal/2026-08-03-ai-crawler-posture-research.md`](docs/internal/2026-08-03-ai-crawler-posture-research.md)),
  including a measured audit of all four consumer sites, so the pass starts from evidence rather
  than a survey.

  **Order: C2b → the ambient-defaults audit → this pass → cut `0.94.0-rc.1` → the migrations.** Geoff
  moved it ahead of the site migrations on 2026-08-03, and the audit ahead of it, so this pass can
  absorb the audit's findings into one policy surface instead of a bespoke field. The reasoning is the one that already folded the cairn.pub voice sitting
  into the cairn.pub migration: a site being opened and redeployed anyway should adopt its posture in
  that same session rather than earn a second visit. It rides the same unpublished window as C2 and
  C2b, which it can do cheaply because the work is additive and adds almost nothing to the
  `Consumers must:` list the migration already absorbs.

  The cost, stated plainly: the RC slips by one pass, so the reshaped surface reaches real consumers
  later. Worth it, because the alternative is touching four sites twice.

  **Scope note: the grant is for a dedicated pass, not for folding this into C2b.** It runs on its
  own worktree after C2b merges.

  **One deliverable is partly deferred by dependency.** The setup path names the tutorial, the
  getting-started scaffold, and the scaffolder, but the scaffolder is not built yet and stays last
  in the queue. This pass covers the tutorial and the getting-started scaffold, and leaves the
  scaffolder half as a standing input the scaffolder pass consumes, rather than pretending to
  deliver it now.

  Two co-equal directions, not a feature and its off switch:

  1. **Invite.** A site that wants to be trained on is as effectively ingestible as cairn can make
     it, by whatever method the evidence says actually works.
  2. **Decline.** A site author who does not want their work consumed can ask LLMs not to, and that
     request is made as effective as it can honestly be made.

  **The two directions are probably not equally achievable, and the docs must not pretend otherwise.**
  A site can decline credibly, but no site can make crawlers arrive. Declining also has a real
  enforcement layer available that inviting does not, since every cairn site runs on Cloudflare and
  its AI crawler controls sit below the polite-request layer. The research pass is confirming or
  correcting that asymmetry; whichever way it lands, the reference page states plainly which
  direction is a request and which is enforcement, because a site author choosing to decline
  deserves an honest account of what the setting buys.

  **Research is in and it inverted the feature**
  ([`docs/internal/2026-08-03-ai-crawler-posture-research.md`](docs/internal/2026-08-03-ai-crawler-posture-research.md)).
  Two findings outrank the question that was asked:

  - **A cairn site that wants to be trained on is probably blocked right now, by platform default.**
    Cloudflare has blocked GPTBot, ClaudeBot, and PerplexityBot by default on every new domain since
    2025-07-01, at the edge, before the request reaches the origin. Every cairn site runs on
    Cloudflare. No file a site publishes can undo an edge block, so the highest-leverage invite
    action is not publishing anything.
  - **`llms.txt` does not serve this goal.** Google states outright that Search ignores it
    (2026-06-15, first-party); Ahrefs found 97% of published files receive zero requests across
    137,210 domains; a second study found 1.1% of requests came from verifiable AI models with zero
    referrer trails. It ships as a cheap nicety at most, never the headline. This hardens the
    2026-06-29 finding rather than overturning it.

  **The shape that follows.** Invite: diagnose the Cloudflare default rather than fight it, then
  serve raw markdown at `.md` or on `Accept: text/markdown`, which is near-free for cairn precisely
  because it stores markdown natively where an HTML-first CMS must reconstruct it. Decline: emit
  per-token `Disallow` lines from a maintained crawler table (training tokens only, deliberately not
  Googlebot or OAI-SearchBot, which are search), plus `Content-Signal: ai-train=no`.

  **The estate audit, and the finding that shapes the engine work.** Measured 2026-08-03 with
  per-crawler user agents against each origin: 907.life and aksailingclub.org **403 at Cloudflare's
  edge** for GPTBot, ClaudeBot, and PerplexityBot and carry a managed `Content-Signal:
  ai-train=no`; cairn.pub and ecxc.ski block and signal nothing. Two and two, and nobody chose it.

  Underneath that: **Cloudflare's managed robots.txt prepends to the origin's rather than replacing
  it.** 907.life's robots.txt tail is byte-identical to ecxc.ski's whole file, because that tail is
  cairn's own `robots.ts` output surviving beneath the injection, leaving two `User-agent: *` groups
  in one file. So **cairn cannot assume the robots.txt it emits is the robots.txt that ships**, and
  a pass that only emits a file would be confidently wrong on half the estate.

  **No silent default, and the goal is informed consideration rather than forced compliance. RULED
  (Geoff, 2026-08-03, revising an earlier over-strict draft.)** A developer should not be bitten by
  a site configured in a way they do not expect. That is the target. Making life difficult is not,
  and the two are easy to confuse.

  **The argument that settles the mechanism.** An earlier draft of this ruling made the posture a
  required config field so a site could not typecheck without one. That would not have caught the
  incident that prompted all of this: the developer would have set `invite` on 907.life, felt
  informed, and Cloudflare would still have been returning 403 at the edge. **The failure was never
  an unset value; it was a gap between the stated posture and the effective one.** A required field
  guarantees a keystroke, not consideration, and it buys friction without buying awareness.

  So the mechanism is **report the effective state, do not obstruct the developer**:

  - **The `doctor/` probe is primary, not supporting.** It reads the deployed site and reports its
    *actual* posture, flagging three cases: no stance stated, a stance stated that the live site
    contradicts, and a managed layer overriding what cairn emitted. Only a probe can catch the
    third, which is the one that happened.

    *Comparables evidence, six tools in (Astro, Eleventy, Nuxt, Docusaurus, Starlight, VitePress):*
    **no comparable tool reports effective state.** Read that with its limit in mind: all six are
    static-site or docs frameworks, and the categories where a positive answer would actually live,
    a CMS with a server runtime (Ghost, WordPress, Statamic, Kirby) and the hosting layers (Vercel,
    Netlify, Cloudflare), have not reported. Six negative results from one category are not a
    finished survey, and the audit should close that gap before the differentiation claim is leaned
    on. `astro check` is TypeScript and template
    diagnostics only; Eleventy ships no diagnostic command at all; neither fetches its own deployed
    URL. Docusaurus is the closest miss and the most instructive: `onBrokenLinks` defaults to
    `'throw'` and genuinely fails a production build, but it checks **local build output on disk and
    never a live URL**, so it cannot see a CDN-layer override either. A tool can be strict and still
    blind to this class.

    For the static generators the absence is category rather than judgment, since they have no
    runtime and often do not know their deployed origin. Neither constraint binds cairn, whose sites
    are Workers with a known origin and which already has `doctor/` and `check:readiness`. Confirm
    against the remaining comparables (Ghost, WordPress, Statamic, Kirby, and the hosting layers)
    before leaning hard on the differentiation claim, since a CMS with a server runtime is where a
    positive answer would actually live.

    **The honest reason nobody else does this: they cannot, and cairn can (Geoff, 2026-08-03).** A
    host-agnostic framework does not know what sits in front of it, so it cannot reason about an
    edge layer it cannot identify. cairn is Cloudflare-specific by design, which converts a scope
    restriction into a capability: it knows the edge is Cloudflare, it knows Cloudflare's managed
    robots.txt prepends rather than replaces, and it can encode that knowledge. The differentiation
    is real but it is **narrowness paying off, not insight**, and the docs should say so rather than
    implying cairn solved a problem the field failed at.

    **The two-tier probe loses its second tier, on evidence.** The plan was a black-box fetch plus a
    Cloudflare API read of the zone's crawler settings, so the report could say *why* and not just
    *what*. Research found **no API endpoint or dashboard field exposing AI Crawl Control's
    per-crawler bucket state**; it is dashboard-only. So the black-box fetch of the live origin is
    not the floor, it is the whole mechanism, and the probe reports observed behavior while naming
    the dashboard as the place to look for cause. Confirm before building, since an unannounced API
    could appear, but design for the fetch alone.

    **Correction to this entry's earlier framing, in fairness to Cloudflare.** The prepend is
    *documented* first-party ("Cloudflare will prepend our managed robots.txt before your existing
    robots.txt"), so the mechanism was never hidden. What nobody surfaced was that the feature was
    **enabled** on two of our zones. The failure was disclosure of state, not of behavior, which is
    exactly the distinction this whole initiative turns on and is worth stating precisely rather
    than blaming the platform for a documented design.

    **A dated risk this pass must absorb: 2026-09-15.** Cloudflare's mixed-purpose-crawler default
    change lands then and **reaches backward into existing "Block AI bots" configurations**, with no
    in-dashboard notice found, only a changelog post. That is a behavior change arriving on live
    consumer sites without anyone being told, the same species as the original finding. This pass
    runs well before that date, so it owns both encoding the change and standing up a scheduled
    routine to watch it, per the doctrine that a time trigger becomes a routine rather than a
    backlog line someone has to remember to reread.
  - **The config field is optional, with no silent default.** Unset means cairn emits nothing and
    guesses nothing. Absence is honest; a fabricated default is what created this mess.

    *The precedent set, across six tools.* Two shapes recur and both are tolerated. **Requirement
    without a stance-gate**: Astro's `@astrojs/sitemap` needs a `site` URL once opted into,
    Docusaurus requires `url` and `baseUrl` outright (where Next.js's equivalent silently resolves
    to localhost), and Starlight makes `title` a schema-required field that throws at dev start.
    Each demands a value the feature genuinely needs rather than a stance, which is why none of them
    reads as obstruction. **Fail-by-default on a checkable defect**: Docusaurus `onBrokenLinks:
    'throw'` and VitePress `ignoreDeadLinks: false` both fail a build on dead internal links.

    The second shape is the cautionary one. Both are strict, both are well liked, and **both check
    only the local build graph and never a deployed URL**, so neither could catch what happened to
    us. Strictness is not the same property as looking at reality.

  - **A consistency rule worth copying outright.** Docusaurus's sitemap plugin auto-filters
    `noindex`-flagged pages out of the sitemap, so two related surfaces cannot disagree. cairn's
    posture must stay consistent with per-entry unlisted state the same way, rather than letting a
    sitewide stance and a per-entry flag drift apart.

  - **Prior art to read before designing the emitter:** Nuxt's official `@nuxtjs/robots` module
    already implements `Content-Signal` and `Content-Usage` directives. Someone has shipped this
    vocabulary; read their shape before inventing one.
  - **The setup path raises the question once**, with the options and their real consequences
    present, at the moment a developer is already making decisions.
  - **No build error and no boot failure.** cairn fails closed on authorization because guessing
    costs a security hole. Guessing wrong here costs a wrong robots.txt, so a dark production site
    would be the worse outcome.

  This also lowers the consumer cost: an optional field is additive rather than breaking, so the
  four existing sites adopt a stance because the probe tells them what they currently have, not
  because a compiler blocked them.

  **The pass therefore carries four things, not one:**

  1. **The config and its emitters.** A site-level posture that drives cairn's own robots output and,
     on the invite side, serving raw markdown at `.md` or on `Accept: text/markdown`. That second
     one is near-free for cairn specifically, since it re-serves a file it already stores where an
     HTML-first CMS must reconstruct markdown it threw away.
  2. **A deployed-site probe in `doctor/`**, since emitting is not enough when a layer above can
     override. It fetches the live robots.txt, compares it to what cairn emits, and reports the
     site's *actual* posture including any managed-layer disagreement. This is the standing doctrine
     of turning a watch into a gate rather than a note someone has to remember to re-read.
  3. **The setup path, for every cairn site.** The tutorial, the getting-started scaffold, and the
     scaffolder's output all surface the posture as a deliberate choice at setup rather than a
     default nobody picked. This is the half Geoff called out: it is not enough that the capability
     exists, it has to be met during setup.
  4. **A guide** covering the posture, the Cloudflare interaction, and an honest account of what
     each direction actually buys.

  **The honesty constraint is a design requirement, not a docs nicety.** Declining is a request that
  named crawlers say they honor, not enforcement: OpenAI's `ChatGPT-User` and Perplexity's
  `Perplexity-User` are exempted from robots.txt by first-party design, Bytespider publishes no
  commitment, and Cloudflare credibly accused Perplexity of stealth crawling in 2025-08. The config
  copy must never read as "blocks AI training". `noai` meta tags are unsupported folklore and get no
  claim attached. The only layer with teeth is Cloudflare AI Crawl Control, which is the developer's
  infrastructure and not the engine's to configure, though `doctor/` is exactly where cairn already
  diagnoses this class of thing.

  **Accept the maintenance cost deliberately:** a crawler token table goes stale as bots appear and
  rename. Whatever ships needs a refresh trigger, or it decays into confidently wrong output. A
  scheduled routine watching the provider docs is the mechanism that matches the trigger.

  **The posture is a site policy, never an engine default.** cairn ships the seam and the site
  chooses. That is the charter line and it is why this is a config rather than a behavior, and it
  means the shipped default has to be defensible on its own rather than inherited from whichever
  direction got built first.

  In charter because `delivery/` already owns this family: `sitemap.ts`, `robots.ts`, `feeds.ts`, and
  `manifest.ts` are derived machine-readable artifacts over content cairn already models. Whatever
  mechanism wins is their sibling, not a new subsystem. `robots.ts` in particular already exists,
  which matters if the research says AI user-agent policy is the real lever. cairn's genuine
  differentiator is that it stores markdown natively, so serving markdown costs a read where an
  HTML-first CMS has to reconstruct what it threw away.

  **The hazard to design against whatever mechanism wins:** anything that inlines body content must
  serve published `main` content only, never a `cairn/*` pending branch. A pending edit reaching a
  public file is a disclosure bug, not a formatting bug. Both this and the per-entry description
  source (a frontmatter field, or the concept's existing `summaryFields`) are open at planning.

- **Entry history and revert (editor-facing revisions). PROMOTED (Geoff, 2026-08-01).** Surface the
  version history cairn already writes: a per-entry history view over the backend's commit log (the
  commit author is already the editor, so attribution is free), and revert implemented as a new
  commit through the existing save/publish pipeline, so the per-entry branch and the deliberate
  Publish gate hold unchanged. No new storage and no new actor. The strongest unbuilt in-charter
  feature from the 2026-07-01 mission review: every competitor CMS has "revisions," cairn has
  something better underneath, and the editor persona currently sees none of it. Promoted from Next
  at the ASC-seams pass-one sitting as a named content of the "core-feature roadmap has landed" beta
  checklist item; needs its own design sitting before a plan (the history view's shape, how far back
  the list reads, what a revert of a published entry means for the draft branch). Gates the public
  beta (Geoff, 2026-08-01): the beta does not cut until this ships. **Vocabulary reserved (C2
  breaking-window pass, R11, 2026-08-02):** history is `historyLoad` as the route-factory member
  and `history` as the facade view (`HistoryData`, `HistoryEntry`); revert is `revertAction` as
  the member and `revert` as the facade key (`RevertFailure`, used as
  `ActionFailure<RevertFailure>`), logging `commit.reverted` with `concept`, `id`, `editor`, and
  the reverted-to ref. Every name derives from this pass's ratified grammars (R1 for members,
  facade keys, and the closed suffix set; R6 for the log-event shape), reserved now precisely so
  the feature arrives under rules made with it rather than inventing its own.

- **Public preview for a non-editor (FILED at promotion, Geoff, 2026-08-01).** Let an editor hand a
  draft to someone who is not an editor: the per-entry `cairn/<concept>/<id>` branch already holds
  the draft, so the artifact exists and only the surface is missing, the same signature as entry
  history above. The shape to design, not yet decided: a time-limited signed preview URL rendering
  that branch's entry through the site's own `render`, issued from the editor's screen, readable
  without a session. Open questions for the sitting: where the render runs (the public route
  factories know `render`; the admin knows the branch), the token's issue and expiry discipline
  (`./auth-crypto` now exports the primitives), and whether a preview of a draft that references
  unpublished media resolves. Gates the public beta alongside entry history and revert (Geoff,
  2026-08-01): the beta does not cut until this ships. **Vocabulary reserved (C2 breaking-window
  pass, R11, 2026-08-02):** `createPreviewRoute(runtime): RequestHandler`, following the ratified
  `createMediaRoute` exception as its precedent (a kit `RequestHandler` return, not the engine's
  own factory-return convention); `mintPreviewToken` and its `PreviewTokenConfig` bag; logging
  `preview.token.minted` and `preview.rejected`, the latter with a snake_case `reason`. Every name
  derives from R1's grammar and R6's log-event shape, reserved now for the same reason as history
  and revert above.

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
   reviewed template.
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
## Later

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
- **`llms.txt` delivery view.** The positioning carries "feeds AIs easily," and the delivery surface
  builds robots, sitemaps, and feeds but not the convention file for exactly that promise. A
  `buildLlmsTxt` plus `llmsTxtResponse` beside `buildRobots`, additive, shaped like the existing
  response builders.
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
