# Roadmap

cairn-cms runs two production sites today, [ecxc.ski](https://ecxc.ski) (formerly ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions; the latest published
release is `0.78.0`. The author is still working through the core-feature roadmap, and the project stays
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
  data-only `adminNav`), the route factories (`createContentRoutes`, `createPublicRoutes`), the admin design
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
- [x] **The admin reads as an idiomatic exemplar**: the admin idiomatic re-expression initiative is done
  (the admin sweep, the starter-template fold, and the docs phase), so the surface a developer copies is
  native, not bespoke, and the developer-facing design vocabulary is a documented, versioned seam.
- [ ] **`create-cairn-site` ships**, so a new consumer starts from a scaffold rather than hand-copying the
  showcase. (Weigh whether this gates 1.0 or rides the first 1.x.)
- [ ] **The core-feature roadmap has landed** to the point the author opens the project up: the intro's
  "closely held until the core lands" condition is the same condition as 1.0.

When these hold, cut `1.0` deliberately, retire the `0.x` "minor = new subsystem / patch = everything else"
scale heuristic, and switch the numbers to their compatibility meaning (patch = fix, minor = additive,
major = breaking). The scheme and cadence live in `CLAUDE.md` ("Releases") and the
`cairn-release-process-and-versioning` memory.

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

- **A `getPlatformProxy` media-delivery smoke (born from the 0.84.x local-dev bounce,
  2026-07-08).** Two miniflare serialization bugs shipped past a green suite because no gate
  drives the media route through the dev platform proxy: the vitest workers pool binds native
  R2 (no RPC boundary) and `vite preview` carries no bindings at all. Add a small test that
  runs the composed route against a `getPlatformProxy` env (seeded local R2, one GET asserting
  200 + Content-Type), so the serialization class fails in CI rather than on a consumer's
  first `vite dev`.

- **Harden the fold-on-mount e2e against load flake (from the design-review bug pass,
  2026-07-04).** The test fails under system load and passes quiet (verified pre-existing on
  main); fix its waiting discipline (poll the fold state, not a timing assumption) before it
  starts costing CI reruns.

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
4. **The Waymark design review** (five lenses; the fixture harness and retheme-lab evidence
   are already banked; findings to Geoff).
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

- **Reusable content/components pass (Geoff, 2026-07-15; promoted from Considering's Fragments
  seed).** Give cairn a way to author a piece of content once and reuse it across entries: the
  ASC site is starting to need shared pieces (the production-site trigger the Considering entry
  was waiting for), and Geoff had planned this direction earlier. The design question is the
  pass's first deliverable, brainstorm-first: whether the lean shape is a third content concept
  (Fragments: author-once markdown included into Posts/Pages via a directive), reusable
  configured components (site-declared directive presets a volunteer can insert without
  re-entering attributes), or both, and where the charter's fixed-concepts boundary draws the
  line. Premise check before scope: this is cairn's job only insofar as it is managing markdown
  content; anything domain-shaped stays the site's. Grounding to collect at brainstorm: the
  concrete ASC reuse cases, and whether the existing component registry + `libraryFields`
  already carry part of the need.
- **Admin invisible-craft polish pass (phase 2; Geoff, 2026-07-15).** The "correct vs resolved"
  finisher: docs/internal/2026-07-15-admin-resolved-polish-brief.md carries the full rubric
  (spacing/rhythm, depth, motion, feedback, forms, micro-details) plus final look-preserving
  color and typography refinements (Geoff's calibration: small changes there are high-leverage;
  the constraint bounds direction, not importance). Runs AFTER the design-refinement arc settles
  the material system; mechanical rubric items become standing gates where the trigger is
  machine-detectable.
- **A small shipped admin component kit (Geoff, 2026-07-15: "probably helpful").** The
  extension idiom currently rests on docs and recipes; a developer re-derives the page header,
  card, table shell, form rows, and empty state from `admin-design-system.md` each time, and the
  built-in-from-the-get-go goal (the design charter) holds only by diligence. A small kit of
  composable admin components would enforce it structurally. Real new public surface with a
  stability promise, so it is a deliberate design effort, not a fold-in: scope it against the
  charter's leanness boundary (the fewest components that cover a custom section's skeleton),
  and design it after the admin UI/UX audit reports, so the kit encodes the audited idiom rather
  than freezing today's. Weigh whether it gates 1.0 (the extending-developer seam story is
  stronger with it). THE AUDIT HAS REPORTED (2026-07-15,
  docs/internal/2026-07-15-admin-ux-audit.md, finding 11): the engine's own screens carry the
  page-header idiom five ways, counts three ways, and search placement two ways, so the kit's
  first deliverable is convergence (pick the canonical recipes, re-express the engine screens in
  them), then ship the components; the audit carries the full inventory. The showcase Signups
  screen still needs a render for the bolted-on-vs-native judgment.
- **Widen the nine-icon `adminNav`/`navLayout` allowlist.** ASC's declared sidebar comments show
  real saturation against the bundled nine Lucide names (spec: 2026-07-14 admin-nav-layout
  design, §6 out-of-scope). Ruled out of the `navLayout` window on purpose, since a bigger
  allowlist is an independent, low-risk addition (more icon names, same validation shape) that
  doesn't need the whole-sidebar contract to land first. Candidate: survey the icon names ASC and
  907 actually reach for past the nine, then extend `ADMIN_NAV_ICON_NAMES` and
  `ADMIN_NAV_ICONS` together, a non-breaking additive change.
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
- **Entry history and revert (editor-facing revisions).** Surface the version history cairn already
  writes: a per-entry history view over the backend's commit log (the commit author is already the
  editor, so attribution is free), and revert implemented as a new commit through the existing
  save/publish pipeline, so the per-entry branch and the deliberate Publish gate hold unchanged. No
  new storage and no new actor. The strongest unbuilt in-charter feature from the 2026-07-01 mission
  review: every competitor CMS has "revisions," cairn has something better underneath, and the editor
  persona currently sees none of it.
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
  (`locals.editor` + `requireSession`/`requireOwner`) and the magic-link transport override
  ship as documented seams, and full replacement lives in an internal design doc. The item:
  document (and where needed, harden) the hand-off that lets a site bring its own login and
  issue cairn sessions — the seam only, not built-in auth options. The claim must be true
  before the repo goes public.
- **Components fold by default in the editor (pre-beta; Geoff, 2026-07-03).** Directive
  blocks open folded so long drafts read clean; the shipped safety invariant (a folded range
  auto-unfolds when a change or the cursor touches it) already covers editing, so this is a
  small change to the fold module's initial state. Editor-welcome's folding sentence updates
  to "folded by default" when it ships.
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
- **Waymark final design review (adversarial, Fable-conducted, before Waymark goes live).**
  Geoff's brief, verbatim as the rubric: the template must be "visually and structurally neutral
  enough that a developer or designer could take it many different directions," and simultaneously
  "professional and current-but-not-trendy enough to be compelling on its own" — a deliberately
  delicate balance, and the review's job is to attack both failure directions: too neutral (reads as
  unfinished scaffolding, compels no one) and too designed (reads as a look to undo before you can
  make it yours). A third named lens, contemporary-but-not-trendy (Geoff, 2026-07-02): contemporary
  means current fundamentals — type scale, spacing rhythm, contrast handling, the craft that reads as
  made-now without announcing a year — while trendy means identifiable-era effects (the glow, glass,
  gradient, or layout gimmick of the season) that let a viewer date the template from styling alone.
  The test per element: could you name the year from this choice? If yes, it fails, however good it
  looks today. (The "strong CTA with DaisyUI Aura glow" item under Considering is exactly the kind of
  call this lens adjudicates.) A fourth lens, structural extensibility (Geoff, 2026-07-02): the
  developer must not be locked into the look-and-feel. Where the first three lenses judge how the
  design reads, this one judges how it is built: look-and-feel decisions must concentrate in the
  swappable layer (the Tailwind 4 `@theme` design-scale tokens and named utilities the
  starter-template pass established), never scattered through component markup. The test: pick three
  deliberately different redirections (say, an editorial serif look, a dense corporate look, a
  playful rounded one) and price each — if any requires broad markup surgery rather than token and
  theme edits, the design is structurally locked regardless of how neutral it reads. This lens also
  owns accessibility-under-retheming: the contrast floors must be encoded in the token
  relationships so a redirect inherits them, not achieved accidentally by the default palette. A
  fifth lens, content robustness (2026-07-02): the template must survive its actual users'
  content, not the showcase's curated demos — the review renders a hostile-but-realistic fixture
  set (a 140-character title, a post with no hero image, two entries and two hundred, unbroken
  text walls, deep list nesting, a directive component mid-prose, an over-wide table) and judges
  what breaks. The review's method also carries one measured floor, not a lens: default page
  weight and a Lighthouse-class check on the rendered pages, since compelling-by-default must not
  mean heavy-by-default. Conducted by
  the main loop as design critic over the live rendered output (both color modes, the stress
  fixtures, the component set) plus the template's token and utility architecture, with findings
  ranked by which lens they fall under. Runs after the Waymark starter component set lands and
  before the cairn.pub intro site or the beta ships the template.
- **The go-public pass (gates the repo flipping public at beta).** A real pass, not a settings
  toggle: a full git-history secrets scan (gitleaks/trufflehog — the loose `.pem` was shredded from
  disk but history was never audited); an exposure review of `docs/internal/` beyond staleness
  (machine paths, account and database identifiers, infrastructure detail — each gets a deliberate
  public/redact/archive ruling); fork-PR CI hardening (Actions permissions, `pull_request` vs
  `pull_request_target`, protecting the OIDC publish path from drive-by PRs); branch protection on
  `main`; the private-vulnerability-reporting toggle plus the SECURITY.md trim (the standing timed
  item); and the issues-on decision with a minimal triage posture.
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
  Waymark as it stands, before beta; the docs stay in the repo until the rewrite finishes and Topo
  hosts them. Domain procurement: cairn.pub (see above).
- **The `create-cairn-site` scaffolder.** Sequenced after Contract v2 phases 1-2 so it bakes the template
  against v2. The pre-B3 engine/DX slot lands first (remove the calendar route, the GitHub-App "appId is
  config, not secret" trap, the doctor that greens while the deploy fails, and the other first-hour DX
  warts a dogfood found), then Part B3 (defaults) and B4 (options plus first-run), then the Part C
  generator. Plans under `docs/superpowers/plans/2026-06-2*-cairn-scaffolder-*`.
## Later

- **Wire `AuthBranding.replyTo` into `buildMagicLinkMessage`.** The branding config carries it
  (threaded from `SenderConfig`) but the built-in magic-link send never sets the message field —
  surfaced by the 2026-07-08 EMAIL type widening, which added `MagicLinkMessage.replyTo` as a
  real-but-unset field for the built-in flow. One-line wire plus a test.


- **`AssetConfig.transformations` doctor corroboration check.** `transformations` is a self-declared
  flag on `AssetConfig` (default `false`); nothing in the engine verifies it matches whether
  Cloudflare Image Transformations are actually enabled on the zone, so a site that flips the flag
  without enabling the feature (or vice versa) gets silently wrong image URLs instead of a build-time
  or doctor-time signal. `cairn-doctor` could corroborate the declared flag against a live probe.
- **Test the `commitFiles` retry-loop 422 branch.** The fetch-level `GithubDouble` always fast-forwards,
  so the head-merge retry path (a concurrent commit moving the branch under an atomic commit, no
  `expectedHead`) is never exercised. Give the double a concurrency-injection hook and a fast-forward
  check so a test can drive the non-fast-forward retry. The fail-closed `expectedHead` path the backend
  seam added is tested; this is the older retry branch, a pre-existing gap surfaced by the seam's review.
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
- **Split `CairnMediaLibrary.svelte`.** The code-polish pass's measurement (`docs/superpowers/plans/
  2026-07-01-code-polish-measurements.md`) converged three signals on this one file: it is the
  largest component in the tree (3,141 lines), the largest jscpd self-duplication cluster (25
  `html`-format clone pairs, unchanged across the pass), and internally organized as six
  near-identical inline dialog controllers (open/close/apply per feature, each with its own
  `$state` cluster and origin-refocus lifecycle) followed by six near-identical `<dialog>` markup
  blocks. The pass's S3 idiom convergence (the code-idioms.md charter) already extracted the
  *script*-level repetition into shared helpers (the check-and-tint class helper, the typed-confirm
  gate, the fetch/deserialize/stale-guard round-trip, the origin-refocus lifecycle), closing several
  hundred lines; the *markup* duplication is untouched on purpose, since splitting a component
  couples its template, state, and focus behavior (the phase-3a lesson) and risks the same
  multi-instance-focus hazard the form-renderer rider guarded against. A dedicated pass should
  design the split (most likely one child component or snippet per feature dialog: replace, alt-
  propagate, bulk-delete, orphan-scan, upload, delete), verified against the `admin-visual` baseline
  and the e2e media suite.
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
  contact, so a self-serve hand-off reads personally.
- **Date-vs-publish field redesign.** A product look at the date field's label and affordance, since it
  reads as if it might schedule publishing.
- **Starter content and onboarding progress.** Concept-differentiated seed content for the strongest
  first-run activation, and a per-editor getting-started progress record.
- **Remaining media work.** Media Pass D, plus the owed live bulk-delete admin smoke. Passes 1-3c
  and A-C shipped across `0.57.0`-`0.59.0`; the Library direct upload landed after.
- **Small DX debt.** Give the component picker dialog a `sm:`-breakpoint bottom-sheet so it is not an
  unconditional `85vh` on a short viewport, and resolve the worktree dual vite/kit install collision
  (the showcase typecheck throws ~12 dependency-`.d.ts` errors under a symlinked-`node_modules` worktree,
  so the local consumer-build proof currently leans on the e2e build; CI's real checkout is clean). The
  bottom-sheet item is in `docs/internal/docs-friction-log.md`.
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

## Considering

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
