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

## Now

- **Land the surface-pruning pass (the pre-beta contract freeze).** Engine work complete on
  `surface-pruning-1`, gates green; plan at
  `docs/superpowers/plans/2026-07-01-surface-pruning-pass.md`, evidence beside it. It demotes the
  ~106 audited-internal exports, fixes the shape warts (the open `routing` union, the deps
  grab-bags, `createMediaRoute`'s argument, the hand-declared `Platform.env`), and lands the
  gate-enforced three-tier stability vocabulary, so the contract the cutovers exercise is the frozen
  one. Pending: merge to `main` and the pass-end ritual. Runs before the cutovers below.
- **Code polish pass (idiom charter, then the sweep).** After the surface-pruning pass merges and
  before the docs rewrite, since polish is the last cheap-break window and the docs snippets should
  imitate the polished idiom. First derive the codebase idiom charter (`docs/internal/code-idioms.md`,
  agent-facing: one way per pattern family — errors and result shapes, validation, factory anatomy,
  module layout, test structure, Svelte component anatomy, naming — picked from what the code already
  does best). Then measure bloat deterministically (dead internal code, unused dependencies,
  duplication) and run a behavior-preserving module-by-module sweep against the charter, with the
  frozen surface as a machine-checked invariant (`check:surface` plus the signatures gate) and the
  full test suite as the behavior contract. Anything that wants a public-surface change gets filed
  for one batched decision, never done in the sweep. Riders: the form-renderer merge (Later) and the
  queued admin-build content-scope plan. Goal: consistent, boring, maximally clean code before beta.
- **Cross both production sites onto `0.78.2`.** The developer-extensibility seam and the editor tag
  vocabulary shipped in `0.78.0` (which rolled the held `0.77.0`), and `0.78.2` rolled the four held
  passes after it (editor popover and a11y, Library upload, the native starter template). The remaining
  work is the site cutovers:
  mount the shared `/admin/+layout` on ecxc-ski and 907-life, read the shell from `page.data.shell`, and run
  the deferred live admin smoke against a real Worker. Tied to each site's v2-adapter cutover.

## Next

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
- **Docs rewrite to the frozen contract.** After the surface-pruning pass merges, rewrite the
  published doc arms against the pruned surface. Carries: the two tutorial blockers the audit found
  (the retired `mintToken` dep in Milestone 8, and the admin mount taught as "three files in all"
  without the shell layout pair); a migration guide (bring existing Hugo/Jekyll-style markdown into
  cairn concepts; the engine needs nothing, concepts are directories of markdown); an "add authors to
  your site" guide teaching the declare-your-own-concept plus `fields.reference` pattern (the intended
  answer to a whole class of "does cairn support X?" questions; authors stay content with reference
  integrity, never a built-in identity, per the reverted identity-substrate lesson); and the
  extending-developer-lens baseline refresh (its "baseline" section still describes the pre-redesign
  state). The doc-snippet extract-and-typecheck gate lands with this rewrite so the docs cannot rot
  against the frozen surface again.
- **Body-link cross-branch delete protection.** Lift the body-link delete guard from its current main-only
  posture to the strict, fail-closed cross-branch reference index that the reference delete and rename gates
  now use, so deleting a body-linked target refuses across every open branch the same way a referenced
  target does. The reference pass left this asymmetry deliberate (locked decision 9); this closes it.
- **Nested references inside a container.** Lift the reference field into an `object` or `array(object)` leaf;
  phase 3a deferred containers to scalars and image only. Needs the frontmatter-edge extractor to descend into
  object leaves, the byte-preserving rename rewriter to address a nested YAML path (the corruption-prone part
  the references fan-out caught bugs in), and the cross-branch index plus rename and delete gates to cover the
  nested edges.
- **Starter component set for the Wayfinder template (before beta).** The starter template ships a
  curated set of content components common across the sites cairn is likely to manage (clubs and
  small orgs, personal and small-business sites) — reasonable, deliberately not exhaustive. Today the
  showcase defines `callout`, `alert`, and the `converter` island demo; the demo is showcase-ware,
  not a template component, so the real set is two. Candidates to curate at plan time (a taste pass,
  brainstorm the final list): figure/gallery, the callout family, a CTA/button, video embed, pull
  quote, FAQ/details. Each ships as a worked `defineComponent` — schema-driven form, icon, and a
  render implementation in the template's design — so the set doubles as the reference example of
  the component-authoring seam. Rides the scaffolder/template work below and pairs with the docs
  rewrite's authoring guidance.
- **A second template: Topo, the documentation template.** Derived from Wayfinder and optimized for
  documentation sites: the sidebar concept tree, in-page table of contents, code-first typography,
  prev/next flow — the docs-site table stakes, curated with Wayfinder's restraint rather than
  exhaustively. Once Topo exists, cairn's own documentation moves onto it, so the engine publishes
  its own manual (the strongest dogfood available, and the standing proof that the docs-site use
  case is first-class). Inherits Wayfinder's component set and adds only what documentation demands.
  Sequenced after the Wayfinder starter component set and the frozen-contract docs rewrite (which
  produces the content Topo hosts); gives the scaffolder its first real template choice.
- **The project sites: cairn.org on Wayfinder, docs.cairn.org on Topo.** Two sites, not one, because
  a cairn site carries one design (one adapter, one `render`), so a combined site would compromise
  either the landing pages or the docs chrome. Each site is the living exemplar and standing dogfood
  of its template: the intro site is the Pages-plus-Posts shape cairn targets, and the click-through
  proof a prospective user sees before running the scaffolder; the docs site is the engine
  publishing its own manual. Subdomain-joined with shared header cross-links; Topo's Wayfinder
  derivation keeps the two reading as one property. Sequencing: the intro site can go up early, on
  Wayfinder as it stands, before beta; the docs stay in the repo until the rewrite finishes and Topo
  hosts them. Domain procurement is its own small first step.
- **The `create-cairn-site` scaffolder.** Sequenced after Contract v2 phases 1-2 so it bakes the template
  against v2. The pre-B3 engine/DX slot lands first (remove the calendar route, the GitHub-App "appId is
  config, not secret" trap, the doctor that greens while the deploy fails, and the other first-hour DX
  warts a dogfood found), then Part B3 (defaults) and B4 (options plus first-run), then the Part C
  generator. Plans under `docs/superpowers/plans/2026-06-2*-cairn-scaffolder-*`.
- **Scope the admin CSS build's content detection (the shipped sheet carries foreign rules).** Surfaced
  during the starter-template Phase 1 audit: `scripts/build-admin-css.mjs` runs `@tailwindcss/postcss` with
  no explicit content config, so its automatic source detection walks up from `scripts/admin-css.input.css`
  to the repo root and scans the **whole tree** (`examples/showcase/src`, `docs/`, `scripts/`) on top of the
  explicit `@source "../src/lib/components/**"`. The shipped `dist/components/cairn-admin.css` therefore
  compiles stray utility candidates it finds anywhere, including `text-[var(--color-muted)]` forms that the
  admin sweep retired from source (so their only remaining origin is the docs that discuss them) and the
  showcase's `--cairn-step/space/measure` tokens. The rules are valid no-op CSS (they reference vars
  undefined in the admin theme), so this is bloat, not breakage, but it undercuts the de-customization
  North Star and is the mechanism behind the `tailwind-scans-docs-bad-candidate` build breaks. Fix: restrict
  the admin build's content to the components glob (Tailwind v4 `source(none)` plus the explicit `@source`,
  or a content config on the postcss plugin), and add a test asserting the compiled sheet contains no
  foreign token (`--cairn-step`, `--cairn-measure`, a bracket muted/subtle form). This also retires the
  "write bare token forms in docs" workaround once the scan no longer reaches docs. **Plan written and
  queued:** `docs/superpowers/plans/2026-06-30-admin-build-content-scope.md` (test-first, one task, the
  `admin-visual` baseline as the no-utility-dropped proof).

## Later

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
- **Merge the two form renderers.** Phase 3c unified the field vocabulary and the validation core, but
  `ComponentForm.svelte` and `FieldInput.svelte` still keep separate per-type switches and each wires the
  IconPicker itself (3c decision 9). Merging them onto one leaf-field renderer removes that duplication. The
  3a multi-instance focus risk is the hazard to design around, so it is a deliberate later refactor, not a
  drive-by.
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

## Considering

- **Scheduled publishing ("publish at").** Editors expect scheduling from a CMS, and the
  date-vs-publish field redesign note in Later exists precisely because the date field already reads
  as if it schedules. The lean shape, if it lands: a publish-at timestamp on the held per-entry
  branch, a documented Cron Trigger the site adds, and the existing publish action fired at the
  time; no queues and no recurring schedules. It cuts against the deliberate-Publish philosophy, so
  this is a product decision to make explicitly, not an engineering default.
- **A third content concept (Fragments).** The fixed-concepts model leaves room for a Fragments concept
  beyond Posts and Pages, scoped when a production site needs it.
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
