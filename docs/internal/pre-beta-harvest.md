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
- **A verification that echoes its input can never fail.** The regen dispatch ran one spec
  but uploaded both snapshot dirs, so the artifact's site-visual images were the checkout's
  own committed files and "byte-identical" was committed-vs-committed — twice. Before
  trusting a pipeline's confirmation, trace where the confirmed bytes actually came from.
