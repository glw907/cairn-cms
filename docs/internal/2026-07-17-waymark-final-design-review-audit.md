# Waymark final design review: the two-track opening audit (2026-07-17)

This is step 4 of the pre-beta ladder, run at the invisible-craft rigor calibration. Below: the
method, the template's state, the findings by cluster, the taste forks held for Geoff, and the
standing-gate candidates. The fix list and verdicts come after Geoff's sitting; nothing here has
been applied.

## Method

Review branch `waymark-final-design-review` (off `main` at 0.87.1) carries the content-robustness
fixture corpus from the standing `wayfinder-review-fixtures` branch: 206 generated archive posts
plus the hostile set (140-character title, no-hero post, unbroken text wall, deep list nesting,
over-wide table, long code blocks), 220 posts total, manifest regenerated. Fresh worktree installs,
clean production build (no dev flags), `vite preview` serving live.

Evidence base, gathered before the workflow:

- 130 full-page renders: 13 page keys x five viewports (320/390/768/1440/2560) x both schemes,
  with readable crops for the four tall pages. `scratchpad/renders/` (session-local).
- Numeric probes over seven pages in both schemes: composited WCAG contrast per text element,
  interactive color-vs-background equality (the ecxc CTA lesson as a standard check), touch-target
  boxes at 390, keyboard-tab focus-ring presence. `probes.json`.
- Page-weight profile of the clean build (decoded bytes by type, largest resources per page).
  `weights-clean.json`.
- The standing `design:probe` band gate: passed, one non-fatal warning.

The workflow: ten mechanical scan agents (Sonnet) over the template tree (chassis + theme +
routes + `examples/cairn-theme/cairn.css`) re-running the polish rubric's universal dimensions
plus the extensibility-seam pricing and the measured floor; five optical lens agents (Fable, the
ROADMAP's five lenses) over the labeled renders; adversarial verification per finding (Sonnet
re-derived mechanical evidence; Fable refuted optical majors). 85 agents, ~5.9M subagent tokens.
Before this record was written, the main loop read the load-bearing PLAUSIBLE-verdict majors with
its own eyes (the mobile header, the unpinned footer, the calendar stub, the flush caption, the
icon smudge, the title rag, and the missing hero); each was confirmed.

Tally: 90 findings, 8 refuted in verification, 82 surviving (27 major, 40 minor, 15 polish),
against ~110 confirmed-right claims. One verifier died on an API server error
(measured-floor's DaisyUI-share finding stays PLAUSIBLE with numeric evidence).

## The state of the template

The foundation is resolved. The confirmed-right column is long and consistent across
all fifteen agents: the chassis spacing scale is a coherent 4/8 ladder and composition.css draws
every value from it; the fluid type and space scales interpolate real clamps; contrast passes the
WCAG floor everywhere in both schemes with zero invisible interactive elements; focus rings exist
on every tab stop; the reading surface's core typography (measure, leading ramp, heading
hierarchy) holds at all five viewports; the token seam carries a re-skin (the cairn
theme and the three retheme-lab redirections all price token-only); the component set renders
composed in both schemes.

The failures cluster in four structural places, and the review's five lenses agree with the
mechanical track about where they are.

## Cluster A: unfinished-scaffolding pockets (the too-neutral lens's real hits)

The too-neutral findings all point at surfaces where design is absent, not at quiet design.
Four independent lenses converged on the same list:

1. **The mobile header is uncomposed.** At 320/390 the chrome wraps into four sparse rows
   (brand, nav, orphaned "Admin", lone theme toggle), ~230px before content. Confirmed by four
   lenses and my own read. `theme/components/SiteHeader.svelte`.
2. **The calendar page is an unstyled stub** in the primary nav: body-face "Calendar" plus two
   plain text lines, no heading treatment, no spacing rhythm. `routes/(site)/calendar/`.
3. **The footer is not pinned.** Every short page (About, calendar, 404, short posts) ends the
   gray footer band mid-viewport with page background resuming beneath it, both schemes.
   `routes/(site)/+layout.svelte` (no min-height column).
4. **The 220-post archive renders as one unsegmented scroll** (40,955 CSS px at 320; 26,633 at
   1440): no pagination, no year grouping, no terminal composition. Also the largest single
   page-weight contributor (195KB document HTML). `routes/(site)/+page.server.ts` +
   `+page.svelte`.
5. **Article pages carry no date** and no metadata beyond an optional byline, in a template
   whose archive is date-led; on a multi-year archive a reader landing from search cannot
   date what they are reading. (The tabular-numerals scan independently flagged the two date
   vocabularies that do exist as unshared.) `routes/(site)/[...path]/+page.svelte`.
6. **The flagship manual post opens with two visible oddities**: its frontmatter hero
   (a raw Unsplash URL, so not a preview-environment artifact; in-body Unsplash figures render)
   never renders, and the author reference renders as the nonsense byline "By About" (the About
   page's title as an author name).
7. The 404 page is the one surface whose voice drops to stock copy.

## Cluster B: the measured floor fails

Against a defensible static-blog budget (~150-250KB decoded for a text page), every Waymark page
ships ~1MB decoded. The root causes are each mechanical and none look-changing:

1. **The root layout imports the whole site adapter client-side to read one flag**, pulling the
   full engine + hastscript + the committed media manifest into a 745KB client chunk served on
   every public page. `routes/+layout.svelte`. This is the template-side face of the ROADMAP's
   "dev wiring must be strippable" scaffolder note, and the leanest fix is structural (a
   server-only read or a split module), not a build tweak.
2. **No responsive image delivery anywhere**: nothing emits `srcset`/`sizes`, so every image
   ships one fixed raster regardless of viewport (the article page pulls 839KB of images at
   fixed query widths). `resolve-media` + the figure pipeline.
3. **No image carries intrinsic dimensions or reserved `aspect-ratio`**, so every image load
   shifts layout (the CLS half of the same defect).
4. The archive's everything-inline home document (195KB) — same fix as cluster A item 4.
5. ~28% of the compiled theme CSS (~31KB of 111KB) is DaisyUI component classes no
   reader-facing page uses (PLAUSIBLE tier: its verifier died mid-run; the numbers are from the
   scan's own build analysis).

## Cluster C: interaction-state craft (the invisible-but-felt gaps)

The states/motion/touch scans converged with the invisible-craft lens on a consistent picture:
the template's static composition is far ahead of its interaction craft.

- **In-prose body links have no identity at rest and no hover change** — indistinguishable from
  surrounding text until focused. `chassis/prose.css`.
- **Post-list title links fall back to the browser-default focus ring** (home lead + every
  archive entry); the skip link, styleguide CTA, tabs, and accordion share the same fallback.
- **No custom interactive element in the whole template defines an `:active` pressed state**
  (only DaisyUI's `.btn` gets one for free).
- **Home hover states change instantly** (title color, lead underline, tag pills): no
  transitions inside the 150-250ms band the family standard sets.
- **The FAQ chevron rotates ungated by `prefers-reduced-motion`** (and the styleguide's comment
  claims a gate that is not there).
- **The theme toggle renders the arrow cursor**, and the header/footer brand links have no
  hover state while every adjacent nav link does.
- **Touch targets at 390**: footer nav links, both brand links, the tag-filter pills (29px),
  the `:::cta` directive (40px), the styleguide accordion summary (25px) and tabs all fall
  under the 44px floor (numeric probe evidence, source locations confirmed).
- **Blockquotes render faux italic**: `font-style: italic` on a body face whose italic
  @font-face rules are never imported. The fluid fonts also declare `font-display: swap` with
  no metric-compatible fallbacks (`size-adjust`/overrides), so the swap shifts layout.

## Cluster D: token-seam leaks (the extensibility lens, mechanical arm)

The seam holds overall (the three redirections price token-only), but the audit found the
leaks that would erode it:

- The flagship home route hardcodes a cluster of spacing/typography literals in its scoped
  style block that no theme token reaches; the banner island hardcodes `border-radius: 0.25rem`
  off the radius vocabulary; the skip link uses three arbitrary-value brackets.
- `gap-[0.55rem]` in both header and footer contradicts theme.css's own re-skin recipe text,
  which claims the chrome uses named utilities only.
- The focus-ring radius (2px) and caption tracking (0.01em) are each authored as identical raw
  literals in three separate files.
- Off-grid decimal-rem values cluster in prose.css (0.3/0.4/0.55/0.6/0.7rem) amid otherwise
  token-perfect rules, plus one duplicated into site.css.
- **The CI dual-gamut contrast gate reads only theme.css**, so the documented full-identity
  override path (`examples/cairn-theme/cairn.css`) ships outside the floor the gate enforces —
  the exact a11y-under-retheming hole the lens names.

### The `check:invisible-craft` family-wide extension (the design-DNA rider's question)

Verdict from the scan: extend it, with two amendments. (1) The transition-duration regex only
recognizes `ms`-suffixed literals; every template transition uses `s`-suffixed values, so the
rule silently misses the whole tree until the regex admits seconds. (2) The achromatic rule
would flag 12 deliberate hue-free ladder values in theme.css — those need allowlist entries (or
a scoped exemption for the base ladder), and the spacing rule as written catches 5 of the 8
real brackets. With the regex fix and a small budget file, the gate can extend to the template
tree.

## Refuted in verification (working as intended)

Eight findings died in adversarial verify — among them three color-system claims (the
verifiers re-derived the token math and the claims overstated), one depth claim, one
type-characters claim, and three touch/fonts claims.

## Held for Geoff: the taste forks

None of these get fixes before the sitting; each is a direction choice, and probe pages follow
the verdicts where a fork needs seen-not-described candidates.

1. **Whose brand does the template wear?** Waymark ships with cairn's stacked-stones logo and
   "Cairn Showcase" identity inlined verbatim in header and footer (the too-designed lens's
   only substantive hit; everything else priced as strong-default-dissolved-by-tokens). Fork:
   a neutral placeholder wordmark slot the scaffolder fills, versus keeping cairn's identity
   as the living demo. The remaining signature gestures (display-face ordered-list counters,
   the pull-quote treatment) ride the same verdict: the one flourish Waymark keeps, or moved
   into the theme's flourish layer.
2. **The archive's shape at scale.** The 220-post fixture demands an answer: pagination,
   year-grouped segmentation, or both. This is Waymark's flagship-blog-theme answer, not a
   repair.
3. **The article meta line.** Where the date lives on an article page, and the one date
   vocabulary both surfaces share (the archive currently says "9 Jul 2026", the calendar stub
   says "2026-06-01", the article says nothing).
4. **The calendar surface.** Compose it as a real template page, or cut it from the template
   nav (it exists to prove the custom-route seam; today it undercuts every page that links it).
5. **The mobile header composition.** Pick the pattern (compact single row, two-row lockup, a
   disclosure) — probe candidates at 320/390 after the direction call.
6. **Typographic characters in rendered content.** The template's own copy fixes are
   mechanical (the 404's straight apostrophes), but body prose typed outside cairn's editor
   (migrated content, this fixture corpus) renders typewriter punctuation because tidy runs at
   editor save, not at render. Whether the render pipeline should smarten punctuation is an
   engine-level product question — filed here as a fork, not assumed.
7. **The theme-toggle flip.** Instant today. The admin's ruling was "calm is right"; whether
   the public template gets a ~200ms cross-fade on scheme change or inherits the same calm is
   a one-line verdict.

## Standing-gate candidates

- Extend `check:invisible-craft` to the template tree with the seconds-regex fix and the
  allowlist (above).
- Add `examples/cairn-theme/cairn.css` (and any future full-identity theme) to the dual-gamut
  contrast gate's scan set.
- The computed color-vs-background equality probe and the 390 touch-target probe ran as
  scripts this audit; both are `check:*`-idiom candidates against the live preview.
- A footer-pinned/min-height assertion and a "no browser-default focus ring" computed check
  are cheap Playwright additions to the existing visual suite.

## Environment caveats recorded

- `vite preview` carries no media bindings, so managed-media tiles cannot render in this
  harness (the standing dev-backend carry-forward); the flagship post's missing hero is NOT
  this (raw external URL, confirmed live).
- The fixture corpus was committed directly to git, bypassing the editor's tidy pass — the
  typewriter-punctuation observations in body prose are an accurate portrait of migrated
  content, and fork 6 above is the product question they raise.
