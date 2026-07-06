# The pre-beta harvest ledger

Every engine and Waymark improvement or affordance surfaced by the rebuild and port efforts,
in one place. The strategic frame (Geoff, 2026-07-05): beta is close, and this window is the
last chance to make BREAKING changes without troubling users — so each entry answers
"does the right version of this break the surface?" and prefers the breaking answer now
over a compatible shim forever. Every rebuild/port workflow's findings consolidate here;
the harvest engine pass executes the queue.

Status: LANDED / QUEUED (harvest pass) / CANDIDATE (needs triage) / PROCESS (method, not code).

## The ontology restructure (Geoff, 2026-07-05, ratified — executes at the ports harvest)

**Status: IN-PROGRESS-LANDED.** The chassis/theme split itself has landed on all three trees
this pass proves against; the template->theme vocabulary sweep, the scaffolder's "which
theme?" prompt, and the theme-building tutorial remain queued behind the ports (hence
in-progress, not landed outright). Commits: cairn-cms showcase Task 1 (cut the boundary)
`76ff939`, Task 2 (Waymark expressed as a theme) `404f8c5`; 907-life Task 3 `2ff4250`;
ecxc-ski Task 4 `8b68aed`. Task 5's verification: `npm run check` (0/0) and `npm test`
(288 files, 3075 tests, exit 0) on cairn-cms; the showcase's full visual suite (25/25) green
locally; both owned sites' `npm run check` (0/0), `npm test` (18/18 and 19/19), and
`npm run build` green against this pass's unpublished cairn-cms build, with an exact
permalink crawl (every URL on the live sitemap, plus feed/robots/healthz routes, serving the
identical status at the identical path with no redirect) against each site's live production
sitemap. The subtractability amendment verified twice in a scratch copy of the showcase
(`composition.css`, the zero-current-dependents case; `theme-toggle.ts`, the used-but-optional
case): each removal note in `src/chassis/README.md` followed verbatim, the showcase still
builds green, no other edit needed.

ONE CHASSIS, N THEMES (naming final, Geoff 2026-07-05: "core" too generic; "chassis" per
the software chassis pattern — the shared plumbing themes mount onto; lowercase,
developer-facing, directory chassis/). Waymark restructures into the genre-free core (adapter/routes/tokens/
prose/grammar wiring) plus the flagship blog THEME; a theme = structure + skin (the ecxc
lesson); the ports, the cairn theme, the ecxc chrome, and Topo become peer themes; the
scaffolder asks "which theme?" with core-only as the escape hatch. The THEME-BUILDING
TUTORIAL (build Waymark from the core) is the restructure's acceptance test and the
tutorial arm's second entry. One pass: reorganization + the template->theme vocabulary
sweep together, cut against the ports' evidence.

**The kept-vs-replaced boundary map (evidence base for the tutorial).** Proven identical
across all three restructured trees (the showcase, 907-life, ecxc-ski):

KEPT, in `src/chassis/` (verbatim or shape-matched, a theme reaches these only through the
documented seams):
- `content.ts` / `feed.ts` — the delivery content-index builder and the `FeedItem` mapping
  the feed routes share.
- `cairn.server.ts` — the one server-side runtime composition point (`composeRuntime`,
  `createCairnAdmin`).
- `dev-gate.ts` — the build-foldable dev-backend flag (showcase only; 907 and ecxc omit it,
  since a deployed owned site carries no dev backend).
- `render.ts`'s `makeIconRenderer` — the component-grammar icon wiring (showcase and ecxc,
  which register directive components; 907 omits it, since it registers none).
- `theme-toggle.ts` — the light/dark toggle mechanism (`resolveTheme`/`applyTheme`/
  `toggleTheme`, cookie-persisted), called from each site's own chrome with its own config.
- `tokens.css` — the token SYSTEM (Tailwind and DaisyUI plugin activation, generic
  design-scale keys, semantic ink/shadow/CTA bindings that read a DaisyUI role by default).
- `prose.css` — the reading-surface foundation (every prose element bound to tokens), with
  the signature flourish gestures behind an opt-in `[data-flourish]` attribute.
- `composition.css` — the card/band/section/hero/sidebar-layout composition primitives.
- The SvelteKit route files that touch delivery plumbing (`feed.xml`, `feed.json`,
  `sitemap.xml`, `robots.txt`, `media/[...path]`, `healthz`, the `/admin` mount), which import
  chassis logic through the `$chassis` alias instead of duplicating it.

REPLACED, in each site's own `src/theme/` (a theme's content, never chassis's):
- The adapter config (`cairn.config.ts`): concepts, fields, registered components, backend,
  icon set.
- The chrome components (header, footer, nav), the home and article composition, and any
  bespoke routes beyond the fixed Posts/Pages concepts (907's `/archives`, `/tags`,
  `/tags/[tag]`; ecxc's same three plus `/contact`, `/waiver`, and its own directive
  registry).
- `theme.css`'s real color and type values, light and dark, and the named DaisyUI themes
  themselves; each site's own unlayered prose overrides (907's link underline, blockquote
  rule, inline-code chip; ecxc's link color, callout-points grid) that sit on top of
  `chassis/prose.css`'s `@layer components` defaults rather than editing that file.

The override seam pattern this proves three times over: a theme `@import`s
`chassis/tokens.css` first, then redeclares the same custom-property keys in its own later
`@theme` block; cascade order does the rest, with zero edits inside the chassis file itself.

## The site contract (Geoff, 2026-07-05: explicitly open to improve/break/extend)

The adapter and seam contract itself — defineConcept, fieldset, the component grammar, the
render seam, the delivery exports — is open for breaking improvement in this window. The
discipline: every contract break traces to REBUILD/PORT EVIDENCE (a schema that fought, a
seam that forced a workaround), never speculation, and the charter's leanness bar still
governs what gets added. Migration cost carries ZERO weight for the two owned sites
(Geoff, 2026-07-05: not worried about reworking ecxc/907 to follow) — the only consumers
are ours until beta, which is the whole point of the window. Known contract questions awaiting evidence-driven answers:

- **The composed-page seam** — CANDIDATE, one evidence source now in. The Foxi port's
  every marketing route (home, features, pricing, FAQ, contact, changelog) is a hard-coded
  Svelte page built from the theme's own composition components, expressed entirely through
  the chassis's `.cairn-card`/`.cairn-band`/`.cairn-section`/`.cairn-hero` primitives and
  DaisyUI's own `collapse`/`input`/`textarea`, with **zero engine changes**; the blog and the
  Terms page stayed ordinary cairn-managed markdown. This is evidence against a first-class
  composed-page content type, at least for this port's shape of marketing composition: a
  pricing table or a testimonial wall reads as squarely the developer's own domain, not a
  gap in Posts/Pages. Still CANDIDATE, not closed: ecxc's panel/split/section directives are
  a different angle (directive-driven composition inside a markdown document, not a
  hand-built route) and its own verdict has not landed; the two evidence sources have not
  yet converged on one answer.
- **The album/collection question** — CANDIDATE, its evidence now in (the sharpest of the
  three ports' capability findings). hugo-theme-gallery's entire album tree, a plain prose
  page, an interior node with children, and a leaf album with photos, three genuinely
  different shapes, was modeled through cairn's one `pages` concept and one shared fieldset:
  `parent` (a self-`reference`) gives an interior node its children, `categories` (a taxonomy
  `multiselect`) feeds a cross-index (the exact mechanism Foxi's post tags already proved,
  zero new engine surface), `photos` (`fields.array(fields.object({...}))`) carries a leaf's
  pictures, and every field but `title` stays optional so any one page can be any of the three
  shapes. It works end to end with **zero engine changes**, the one-fieldset-polymorphism
  finding: cairn's fixed one-fieldset-per-concept model CAN express this content tree. The
  cost is real and visible in the schema itself, not hypothetical: every page's admin form
  shows the full field list regardless of which kind of page it is (an editor opening About
  sees an unused `parent` picker, an unused `categories` field, and an unused `photos` array;
  opening a photo album shows no explicit "this is a gallery" toggle at all), since nothing in
  the schema marks which shape a given page takes; the theme infers it purely from which
  optional fields are populated. A related, narrower gap: cairn's flat single-segment
  `permalink: '/:slug'` has no nested-URL equivalent for the upstream's own directory-based
  routing (`/animals/cats/`); the port did not build custom nested routing to replicate it (one
  port's evidence is not grounds for an engine change per the harvest discipline), so every
  album here is a flat top-level route instead. Pairs with the deferred gallery enabler
  (image/array component attributes, below) and the ecxc redo's own component-grammar
  findings; still CANDIDATE, not a verdict this one port settles alone.
- **`ImageValue` cannot carry a justified grid's own layout input** — CANDIDATE. The engine's
  leaf image type (`ImageValue`) carries only `src`/`alt`/`caption`, no intrinsic width or
  height, but a justified photo grid needs each photo's aspect ratio before any image has
  loaded. Worked around with plain sibling `width`/`height`/`color` leaves next to the `image`
  field inside the same array-item object (`fieldset()`'s `checkContainerNesting` already
  permits this, an `image` field is a leaf like any other, so no engine change was needed to
  express it), but the editing cost is real: a photographer authoring one photo row sets four
  separate fields to describe one picture, where a native photo-gallery tool would infer three
  of them from the file itself. One theme's ask so far; hold as a candidate `ImageValue`
  extension (stored intrinsic dimensions, populated at upload time) until a second theme also
  wants a layout-aware image, then promote with both proof points.
- **The component grammar's limits** — CANDIDATE. The ecxc redo's verdict arrives with the
  schemas the v2 grammar fought; each is a fieldset/defineComponent break candidate.
- **The render seam's shape** — QUEUED-adjacent. The rehype-plugins parameter (below) is
  the minimal form; the evidence may justify the fuller break (a composable pipeline
  contract instead of one closed factory).

## Chassis

Per-port harvest at the chassis layer (theme-ports-1-3, step 5), evidence-based against
`examples/showcase/src/chassis` and mirrored into each theme's own verbatim copy.

- **`.cairn-site-shell` / `.cairn-site-main` (composition.css)** — LANDED. AstroPaper's own
  sticky-footer flex column hit a flex-item cross-axis auto-width bug (a wide descendant
  anywhere inside the growing `<main>` shrinks the item to that descendant's content width
  instead of stretching it, and the growth bubbles up through every auto-sized ancestor,
  breaking the layout at narrow viewports; `min-width: 0` alone does not fix it, only an
  explicit `width` does). The fix is now a chassis recipe (`examples/showcase/src/chassis/README.md`),
  mirrored verbatim into `examples/astropaper-theme/src/chassis/composition.css`, and the
  AstroPaper theme itself migrated onto it (its own `site.css` no longer hand-rolls the fix).
  Verified: `npm run check` (0/0) and `npm test` (288 files, 3075 tests, exit 0) on cairn-cms;
  `examples/astropaper-theme`'s own `check` and `build` green; Playwright confirmed
  `body.scrollWidth` never exceeds the viewport at 320/390/2560 on the home and a post
  template, and side-by-side screenshots at 320 and 390 match the pre-refactor renders.
- **The code-card device (filename tab + Copy button)** — QUEUED (not promoted). AstroPaper's
  own raw-HTML code-card (a `<div class="code-card" data-filename="...">` wrapper plus a small
  progressive-enhancement script) works entirely through existing seams (the `sanitizeSchema`
  extension point, `rehype-raw`, the sanitize-floor `data-*` allowance) with zero engine
  change, and needed no chassis promotion for this one port. It is a one-theme device so far,
  not a demonstrated-twice pattern the way `theme-toggle.ts` was before it moved to chassis;
  hold as a candidate chassis recipe until a second port (Foxi or the gallery) also wants a
  code-card, then promote with both proof points, not speculatively.
- **The `sanitizeSchema` extension point and the raw-HTML-device pattern generally** — CONFIRMED
  WORKING, no landing needed. AstroPaper rendered its code-card, its warning admonition (the
  chassis's existing `.callout`/`.callout-warning` classes, already in `prose.css` from prior
  work), and its table of contents (a plain regex over `rehype-slug`'s existing heading ids)
  entirely through seams the chassis already exposed, with an **empty** component registry.
  This is the strongest form of the "zero new content components" capability verdict the port
  set out to prove; nothing here needed a chassis or engine change.
- **`CairnAdapter.backend`'s field access, corrected** — the first AstroPaper implementer's
  agent-memory note claimed `GithubAppProvider.owner`/`.repo`/`.branch` are not reachable off
  `CairnAdapter.backend` in site code because it is typed as the generic `BackendProvider` and
  `isGithubApp` is not barrel-exported, so the port re-exported a literal `REPO` constant next
  to `githubApp({...})` as a workaround. Verified false for the actual friction site
  (`svelte-check`, 0/0, both via a raw `tsc --noEmit` probe and the theme's own `npm run
  check`): `defineAdapter<const A extends CairnAdapter>(adapter: A): A`'s const-generic capture
  preserves `githubApp()`'s concrete `GithubAppProvider` return type, so `cairn.backend.owner`
  reads with no cast from the same module that calls `defineAdapter`, or from any module that
  imports that export. `isGithubApp` would only be needed to narrow a field genuinely widened
  to `BackendProvider` (for example `CairnRuntime.backend`, which `composeRuntime` returns and
  which stays server-internal, never reaching theme/page code today), so no engine export was
  added; the `REPO` workaround is unnecessary but harmless and was left in place rather than
  churning an already-shipped port for a documentation-only correction. The corrected claim is
  recorded in `.claude/agent-memory/cairn-implementer/theme-port-astropaper-task1.md` so the
  next port does not repeat the workaround.
- **Public tag-page routing stays out of scope** — not a new finding. AstroPaper hand-built its
  own `/tags` and `/tags/[tag]` routes over the `taxonomy: true` field, the same shape 907.life
  and ecxc-ski already hand-build; this is the tag-management initiative's own deliberate,
  ratified decision (public tag pages removed from cairn's scope, tags kept as data only), not
  an open contract question.
- **The `--spacing-xs`/`--spacing-xl`/`--spacing-2xl` / `max-w-*` Tailwind v4 collision** —
  LANDED, documentation only. `tokens.css` declares three design-scale keys that share a
  suffix with three of Tailwind's own built-in `max-w-*` scale keys, and Tailwind resolves
  `max-w-<key>` against a same-named `--spacing-<key>` variable when one exists, silently
  shadowing the built-in container width (`max-w-2xl` compiled to `max-width:
  var(--spacing-2xl)`, 4rem, not Tailwind's 42rem default; a same-named `--container-<key>`
  override does not win it back). The Foxi port hit this composing a marketing page and
  worked around it with `max-w-measure`/`max-w-measure-wide` or an arbitrary value. Verified
  directly against `@tailwindcss/node`'s own compiler (Tailwind 4.3.2, not the port's own
  account) before landing; the guidance is now in `examples/showcase/src/chassis/README.md`'s
  `tokens.css` entry, since every theme built on this chassis's spacing scale carries the
  same three-key exposure. No rename: the existing key names are already load-bearing across
  three themes and two owned sites' own copied chassis trees, and the fix is "avoid these
  three `max-w-*` utilities," not a chassis code change.
- **`.cairn-sidebar-layout`'s fixed column order** — QUEUED (not promoted). The primitive
  always renders main-then-aside (wide-first, narrow-second) below its 48rem breakpoint; the
  Foxi FAQ page wanted the reverse (a narrow lead-in column, then a wide accordion) and
  substituted a plain Tailwind grid, noted in that route's own comment
  (`examples/foxi-theme/src/routes/(site)/faq/+page.svelte`). One theme's ask so far, the
  same bar the AstroPaper port's code-card device was held to; hold as a candidate reversed-
  order modifier (for example a `.cairn-sidebar-layout--reverse` variant) until a second
  theme also wants the narrow-first order, then promote with both proof points.
- **The SPA-fallback themed-404 recipe** — QUEUED (not promoted). Every Foxi route
  prerenders, so an unmatched path has no static file of its own; `svelte.config.js`'s
  `fallback: 'spa'` paired with `wrangler.jsonc`'s `assets.not_found_handling: "404-page"` is
  what makes Cloudflare serve the built `404.html` shell for that request, which then boots
  the theme's own `+error.svelte` inside its chrome instead of a blank platform 404 (edge-only
  behavior; neither `vite preview` nor local `wrangler dev` can demonstrate it). AstroPaper
  already has its own themed `+error.svelte` but not this SPA-fallback pairing, so it only
  catches an in-route error, not a wholly unmatched path. One theme's ask so far; hold as a
  candidate chassis-documented recipe until a second fully-prerendered theme also wants a
  themed 404 for unmatched paths, then promote (as a documented `svelte.config.js`/
  `wrangler.jsonc` pairing, since neither file lives inside `src/chassis/` itself).
- **Cascade layers: an unlayered site rule always beats a layered Tailwind utility** — LANDED
  (documentation, plus a real cross-theme fix). The gallery port's own verifier found this
  first: a theme's `site.css` typically declares plain, unlayered container classes
  (`.site-main`, `.site-wide`), and a `margin: 0 auto` shorthand on one of them zeroes the
  block (top/bottom) margins too, which silently wins over a sibling's own Tailwind
  `mt-*`/`mb-*` utility class regardless of source order, since an unlayered rule always beats
  a layered one. Not a one-port curiosity: the Foxi port's own home page carries the identical
  pattern (`<div class="site-wide mt-l">`), and measuring it directly with Playwright
  `getComputedStyle` confirmed the same bug live on an already-shipped theme,
  `margin-top: 0px` where `mt-l` should have produced 32px, collapsing the gap between the
  hero and the app-mockup image to nothing. Fixed by switching every theme's
  `.site-main`/`.site-wide` from the `margin: 0 auto` shorthand to `margin-inline: auto`
  (`examples/foxi-theme`, `examples/astropaper-theme`, `examples/showcase`;
  `examples/gallery-theme` had already made this exact fix during its own verifier pass),
  re-verified with the same Playwright probe (32px after the fix). Documented as a general
  authoring rule in `examples/showcase/src/chassis/README.md`, since it is a Tailwind v4
  cascade-layers fact any theme's own CSS can hit, not a chassis code change: reach for the
  single-axis longhand (`margin-inline`, `padding-inline`) on an unlayered container or layout
  class whenever it might combine with a Tailwind spacing utility on the same element.
- **The media-stress capability test (justified grid + lightbox)** — CONFIRMED WORKING, no
  engine or chassis change needed. The gallery port's justified photo grid
  (`src/theme/justified-layout.ts`, wrapping the real `justified-layout` npm package once the
  verifier corrected the first pass's own reimplemented heuristic) and its PhotoSwipe v5
  lightbox (using the official `photoswipe-dynamic-caption-plugin`) both work end to end
  through the same client-only dynamic-`import()` pattern the engine's own carta-md boundary
  already establishes (a browser-only library imported inside `onMount`, never a static
  top-level import); the one friction point is the `ImageValue` content-model gap recorded
  above, not a rendering or component-grammar limitation.

## Engine

- **The rehype seam on createRenderer** — LANDED (`43f9967`). `RendererOptions` gained
  `remarkPlugins`/`rehypePlugins`, additive lists appended after cairn's own markdown- and
  hast-stage steps. Additive, not breaking; 907.life's hand-rolled second unified pipeline
  migrated onto it (`67b8f0d`). ecxc-ski's migration is CANDIDATE, not moot: its `main` is no
  longer reverted (the chrome repair and the chassis restructure both landed there, `8b68aed`,
  on `^0.80.0`), but it still carries its own local table-scroll wiring rather than this seam.
- **Table-scroll as a built-in default** — LANDED (`71c131d`). `RendererOptions.tableScroll`
  (default `true`) wraps every rendered table by default, opt-out via `tableScroll: false`.
  907.life deleted its local wiring (`b56a241`); ecxc-ski's migration is CANDIDATE (see above).
- **Sitemap extra-routes** — LANDED (`278035e`). `sitemapView` gained an `extraRoutes` argument and a new
  `unlistedRoutes` helper flags a site's static page routes missing from that list. 907.life
  migrated its hand-list onto both (`9b89745`, with a follow-up route-export fix in `56e46cb`);
  ecxc-ski's migration is CANDIDATE: its `main` (`8b68aed`) hand-builds `sitemap.xml` directly
  rather than calling `sitemapView`'s new argument or `unlistedRoutes`.
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
  (`aea6625`): a specificity bug zeroing every paragraph's flow margin on every Waymark site;
  found by a reader's eye on one dense section, root-caused by computed-style dump. The
  ledger lesson (the template's flow system needs a computed-margin assertion in its tests)
  is also LANDED (`46be1ef`): `examples/showcase/e2e/prose-flow-rhythm.spec.ts` asserts the
  owl selector's computed `margin-top` (not the stylesheet text) across the three DOM shapes
  the specificity bug hit, so the class of bug is now un-shippable.
- **Blockquote scale** — CANDIDATE: the template's step-up italic treatment read as a
  pull-quote collision on a real technical post; consider a quieter default.

- **CairnHead never appends the site-name title suffix** — LANDED (`86f4f83`, ecxc redo
  finding): `CairnHead` gained an optional `titleTemplate`, a `(title: string) => string`
  callback applied to `seo.title` only when `title` is left `undefined`. 907.life's entry
  page migrated its inline title-suffix string onto it (`bb69cc9`); ecxc-ski's migration is
  CANDIDATE, same as the sitemap/render-seam migrations above.
- **The theme-layer flexibility claim: CORRECTED after the ecxc production failure.** The
  seams transfer color, faces, and dark mode (proven: cairn theme, 907). They do NOT
  transfer STRUCTURE: ecxc's card-based, photo-forward club landing page cannot be reached
  from the blog-shaped scaffold by tokens, and the "zero chrome edits" result was the
  failure signature misread as success. The honest finding: a non-blog site needs its own
  chrome built on the scaffold; whether Waymark should offer composable structural variants
  (hero+card home, sidebar layouts) is now a REAL harvest question for the ports.

## Component library

- **ecxc's 18-to-13 rationalization findings** — CANDIDATE, arriving with the redo's
  verdict: every schema the v2 grammar fought, the composed-page seam question (Foxi has
  answered its half; see above), the gallery/album concept question (the port slate re-asks
  it with evidence).

## Process (the method improvements, binding already)

- **Device-catalogue fidelity audit BEFORE building** any port/rebuild theme (the 907
  lesson; now the first task of every port).
- **CI is the canonical baseline renderer**; the regen dispatch is the mechanism.
- **Side-by-side crops per typographic device** before a deploy is called done.
- **Architecture statements go in locked-calls lists**; unattended workflows get
  conformance gates between tasks.
- **Exit codes verified bare, never through pipes**; gates re-run after the edit they bless.
- **A verification that echoes its input can never fail.** The regen dispatch ran one spec
  but uploaded both snapshot dirs, so the artifact's site-visual images were the checkout's
  own committed files and "byte-identical" was committed-vs-committed — twice. Before
  trusting a pipeline's confirmation, trace where the confirmed bytes actually came from.
- **Reveal-on-scroll references need real wheel-scroll capture, not `scrollTo`.** A site with
  scroll-triggered reveal animations (Foxi's home and highlight rows) leaves large blank gaps
  in a `fullPage` screenshot captured via `scrollTo`, since the animation never fires; drive
  `page.mouse.wheel` incrementally instead, the same trigger a real reader's scroll fires.
- **A theme rendering a taxonomy tag for display should read the engine's own vocabulary
  seam, not hand-roll a capitalization helper.** `extractVocabulary(siteConfig)` (public,
  documented in `docs/guides/wire-the-delivery-surface.md`) already reads a `{value, label}`
  list for exactly this purpose, and needs no admin mount to use, a theme can commit a static
  `vocabulary:` list in `site.config.yaml` purely for display labels. Both the AstroPaper port
  (`tags/[tag]/+page.svelte`) and the gallery port (`albums.ts`'s `capitalizeTag`) independently
  reimplemented a one-word capitalize transform instead, since neither mounts the tag-vocabulary
  admin and neither noticed the read-only seam did not require it. Not an engine gap (nothing to
  land), and not worth reworking two already-shipped, cosmetic, single-word cases for; the finding
  is for the theme-building tutorial, which should show the documented seam as the first way to
  read a tag's display label, so a new theme does not rediscover the same workaround.
