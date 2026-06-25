# cairn public design bar (B2 foundation)

The criteria the public theme is built and judged against. This is the public-side counterpart to
[`admin-design-system.md`](../../internal/admin-design-system.md): that reference governs the editor's
Warm Stone surface; this governs the reader's surface and the token layer a site owner re-skins. The B2
`frontend-design` loop optimizes against this bar, and the B2 token-layer review gates against it. The
strategic decisions sit in the scaffolder spec
([`2026-06-24-cairn-scaffolder-design.md`](2026-06-24-cairn-scaffolder-design.md), Part B); this is the
design intelligence and the acceptance criteria.

## Provenance

Distilled from a 13-reference competitive teardown (Ghost Casper, Astro and Starlight, shadcn's
Taxonomy, Tailwind Plus, Next's blog-starter, SvelteKit and DaisyUI templates, Hugo PaperMod, AstroPaper,
Eleventy, Nuxt Content, design-award editorial exemplars, and the DaisyUI 5 theme gallery). Each was
assessed on technical design and visual quality, then synthesized into a bar and stress-tested by an
adversarial critic. The full teardowns live in the workflow transcript (run `wf_4951ca92-3b0`).

The critic's verdict: the thesis genuinely leads in two places, but most of what reads like "the bar"
(turnkey SEO with per-post OG images, build-time highlighting, self-hosted preloaded fonts,
reduced-motion gating, skip-links and landmarks) is 2025 table stakes the strong field already ships.
Reaching those is the price of admission. The win is the prose-to-token binding and the oklch theme.

## Settled direction

- **Type:** a distinct editorial display face for headings and pull-quotes over a legibility-grade
  humanist sans body, mono reserved for code. Published character with contemporary reading comfort,
  deliberately distinct from the admin's Bricolage Grotesque. The exact faces are the frontend-design
  loop's call against the typography criterion below.
- **Palette:** a warm-tinted oklch paper base and a warm near-black ink, kin to the admin's warm hue,
  with one restrained brand accent the owner changes. Crafted but neutral, a clean re-skin canvas. The
  exact values are the frontend-design loop's call against the color criterion below.

## Design principles (non-negotiable)

These bind the whole pass and are tested by the visual-design critique (GATE 1), not only the token review.

- **The shipped default is the product.** Most users keep the template default, so the default must stand
  on its own as an excellent, finished site, never a neutral placeholder awaiting a brand. "Restrained"
  means tasteful and not over-branded; it never means bland or unfinished. The re-skin canvas and the
  great-out-of-the-box default are the same artifact: excellent if unchanged, easy to change.
- **2026 modern, not trendy.** Aim for durable contemporary design that will not date in a year. Favor
  strong typography, generous whitespace, clear hierarchy, and restraint. Avoid the trend of the moment
  (heavy gradients, glassmorphism, oversized brutalist type, decorative motion) that reads fashionable now
  and dated soon.
- **Evidence-grounded, not only tasteful.** Every decision traces to a defensible UI/UX principle:
  - Reading: a measure of roughly 45-75 characters with generous leading is the readability-research
    consensus (the bar's 65-72ch and 1.6-1.75 body leading), on a legibility-grade body face at 18-20px.
  - Hierarchy: size, weight, and spacing contrast guide the eye; the design passes a squint test.
  - Gestalt and cognitive load: whitespace and proximity group content (whitespace separates, not rules or
    boxes); a quiet chrome limits choices (Hick's law) so the manuscript leads.
  - Aesthetic-usability effect: a coherent, polished surface is perceived as more usable, so the default's
    polish is a usability decision, not only a visual one.
  - Targets and contrast: adequate interactive target sizing (Fitts's law) and contrast beyond the AA
    floor for sustained reading comfort.
  - Safety: reduced-motion correctness and dark mode for low-light reading.
- **The prose is the documentation, and it shows every markdown element.** The starter's sample content
  does double duty: it demonstrates the full markdown element set (headings, emphasis, lists and task
  lists, links, blockquotes, inline and fenced code, tables, images and figures, horizontal rules,
  footnotes, and the directive components) and it documents the starter itself, so the default site,
  unchanged, teaches a new author how to write, use the components, and re-skin. Reading the default site
  is the quickstart.

## The five differentiators (must exceed, not match)

These justify the pass. Everything else is table stakes the build must simply meet.

1. **One token set re-skins the chrome and the reading surface together.** The field's universal gap:
   DaisyUI delegates long-form to an untethered `@tailwindcss/typography`, AstroPaper hand-overrides
   `prose` element by element, shadcn reimplements ad hoc, so a brand change desyncs article from chrome.
   Cairn binds the bespoke prose surface and the code highlighter to the same DaisyUI roles, so one token
   edit re-skins both in lockstep. Demonstrated on `/styleguide` and gated in CI.
2. **A full-oklch editorial theme with contrast-stable recolor**, on the spine the admin already runs in
   production. Recolor the brand by rotating the hue term with lightness and chroma held, and AA holds on
   every `-content` pair automatically. Beats every sRGB or HSL reusable starter on recolor math.
3. **A committed, tokenized editorial type pairing as the real first paint.** The reusable field defaults
   to Inter-everywhere, system-only, or site-wide mono; only un-copyable bespoke sites commit. Cairn
   ships the pairing preloaded (CLS-safe) and tokenizes the whole scale, so it looks un-templated on first
   run yet re-typefaces from one file.
4. **One design language across the authenticated admin and the public site.** No reference unifies both
   surfaces. The admin (Warm Stone) and the public theme run the same DaisyUI 5 token grammar with
   deliberately separate palettes. Hold the grammar identical; vary only the palette.
5. **An honest, complete, gated re-skin recipe.** The field's recipes omit the prose seam and ship
   ungated. Cairn publishes a committed N ("re-skin in roughly 14 values, prose included at no extra
   cost") enforced by the token review, a CI contrast floor, and the `/styleguide` re-skin fixture.

## The bar, by dimension

Each dimension carries its criterion and its gate. Gates are split into **CI-mechanical** (an agent runs
it unattended) and **review-gated** (a B2 acceptance question for the visual critique or the token
review), so a soft judgment never passes as a mechanical test.

### Typography

A committed editorial pairing: a display face for headings and pull-quotes over a legibility-grade
humanist sans body, mono only for code (never site-wide mono, the AstroPaper reading-comfort cost). The
scale is tokenized as named steps on a fixed ratio (roughly 1.2 small, 1.25 large, the Utopia range),
authored with `clamp()` so the display scales fluidly while the body stays readable. Body 18-20px, body
leading 1.6-1.75, heading leading 1.1-1.2, h1 around `clamp(2.5rem, 5vw, 3.5rem)`. The heading-rhythm
rule binds a heading to the text it introduces (large space above, tight below).

- CI-mechanical: no raw font-size in component markup (a violation is a literal `text-[Npx]`,
  `text-[Nrem]`, or a `font-size:` in a `<style>` block; the named type-step tokens or the type-driven
  Tailwind scale are allowed). Mono never sets body copy.
- Review-gated: the pairing reads as intentional editorial design on first paint, not a component demo.

### Color

The public theme is a DaisyUI 5 `@plugin "daisyui/theme"` block in oklch: the `base-100/200/300` plus
`base-content` ladder, the `primary/secondary/accent` plus `-content` pairs, `neutral`, and the status
hues with their `-content` pairs. A warm paper base (not pure white), a warm near-black ink, one
disciplined brand accent, quiet status hues. Light and dark are sibling blocks keyed to `color-scheme`
and `prefersdark`, wired to `prefers-color-scheme`. Every surface uses `bg-{role}` with
`text-{role}-content` so contrast travels with the surface. Carry the admin's lesson that a fill tone is
not a text ink: define on-surface ink tokens for status words rather than drawing small text in a fill
tone.

- CI-mechanical: zero literal colors in component markup or the prose CSS (a violation is a `#hex`,
  `rgb()`, `hsl()`, or `oklch()` literal; DaisyUI semantic utilities like `bg-base-200` and
  `text-primary` are the token layer and are allowed). Light and dark pairs are symmetric.
- Review-gated: the warm editorial ground reads crafted, and the single accent is restrained.

### Spacing and rhythm

A tokenized fluid space scale (the Utopia 3XS-3XL approach) rather than ad-hoc margins, plus the three
DaisyUI radius tokens (`--radius-box` for cards and figures, `--radius-field` for inputs and buttons,
`--radius-selector` for chips), `--size-field`, and `--border`. All vertical rhythm on the reading
surface flows from a single `--flow-space` owl-selector variable that headings, figures, and `pre`
override locally, anchored to the body line-height. Whitespace separates, not rules or boxes.

- CI-mechanical: prose vertical rhythm derives from `--flow-space` and the space scale (no one-off margins
  on prose blocks); radius and density read from the three DaisyUI radius tokens.

### Reading surface

The signature deliverable. Do not ship stock `prose`: author a bespoke reading surface whose every
element derives from the DaisyUI oklch roles, so chrome and article re-skin from one edit. The measure is
pinned at roughly 65-72ch (42-48rem) at the layout level, not left to the page wrapper. Each element is
crafted and tokenized: headings on the display face with the binding rhythm; a borderless or
accent-bordered blockquote plus a hanging pull-quote in the display face; inline code as a tinted bordered
chip (`base-200` ground, `base-300` border); build-time syntax-highlighted code blocks (Shiki, a
CSS-variable theme that tracks light and dark, a copy button); figures on cairn's existing
`center`/`wide`/`full` placement contract with muted-sans captions and full-bleed breakout beyond the
measure; refined list markers, bordered or zebra tables, `hr`, and a lead-paragraph option.

- CI-mechanical: no bare `prose` class as the surface; every prose color resolves to a role token; the
  measure is capped structurally; the article-route client bundle contains no syntax highlighter (Shiki,
  Prism, hljs); switching the theme token block recolors fenced code with no markup edit.
- Review-gated: blockquote, pull-quote, figure, caption, table, inline-code, and code-block all read as
  authored treatments, and the column reads like a publication.

### Layout and chrome

A single centered reading column at the tokenized measure inside a wider shell, with figures and quotes
able to break into the margin. Expressive composition is reserved for the index and landing pages. The
chrome (header nav, footer) is built from DaisyUI components as owned, copy-in files. Carry the admin's
context discipline: a quiet public chrome that never competes with the manuscript. B3 layers home, the
paginated archive, tag pages, search, and the 404 on this foundation.

- CI-mechanical: the article measure is a structural cap; figure breakout works from inside the centered
  column with no horizontal scroll (the existing `overflow-x: clip`).
- Review-gated: the chrome is quiet and the composition serves reading.

### Token architecture

Two tiers on the DaisyUI 5 spine, the public analog of the admin system but structurally separate: (1)
the `@plugin "daisyui/theme"` role block (color pairs, the base ladder, radius, size, border, the
off-by-default depth and noise knobs) as the externally documented color and geometry spine; (2) a small
set of cairn-authored custom properties for what DaisyUI does not cover and the field leaves generic, the
type scale steps and line-heights, the fluid space scale and `--flow-space`, the measure, and the prose
bindings, all of which read the DaisyUI roles. The prose surface consumes the same role tokens, never a
parallel palette. Light and dark are sibling blocks. Tokens are documented inline at the definition site,
the admin convention.

- CI-mechanical: no token named by appearance; no value hard-coded in a component that should read a
  token; no dark variant that drifts from its light pair.
- Review-gated (the token review's decisive test): a developer who never saw the theme re-skins to a new
  brand by editing only the documented set, and no AA pair breaks.

### Re-skin recipe

A documented "change your brand in these N lines" path that is honest and complete where the field is not.
One labeled file owns the public theme. The committed N: edit the role colors in the `@plugin` block
(target roughly 14 values; the brand accent by rotating hue with lightness and chroma fixed for
contrast-stable recolor), optionally swap the two font tokens, optionally retune the one type ratio and
the one space-scale step, and the entire surface, chrome and article, re-skins. The headline claim is the
field's only complete one: the prose surface is included at zero extra edits because it reads the same
roles. An off-by-default depth and noise richness knob is available. A guided generator that emits the
oklch block and validates AA is deferred to the Part C scaffolder; B2 ships the hand-edit recipe and the
`/styleguide` proof.

- CI-mechanical: a fixture re-skin script edits only the documented N, then the contrast gate passes; a
  grep proves no second color source exists for the prose surface.
- Review-gated: the recipe has no missing step, and the published N includes the prose cost.

### Component model

shadcn's "you own it": the public components are tasteful, documented, site-owned `.svelte` files built on
cairn primitives and DaisyUI that a developer extends or replaces, with no version lock on the look.
DaisyUI stays the token-driven primitive layer; the page-level compositions and the reading-surface
styling ship as owned source. The directive registry (callout and friends) is shown cleanly so the
render-component pattern is legible end to end. The template is a working showcase of useful cairn
components a user adopts or extends in place: the directive registry (callout and a few genuinely useful
siblings) and the own-it public components, demonstrated in real sample content and catalogued on
`/styleguide`, each with a documented adopt-or-extend seam. Because most users keep defaults, the shipped
component set must be useful and complete on its own. The ownership seam: the site owns the prose CSS surface
and the page-composition components; the engine owns the prose HTML structure (the rehype pipeline output)
and the build-time highlighter. A developer re-skins or restructures the visual reading surface without
forking the engine; changing the emitted HTML shape is an engine concern.

- CI-mechanical: every public component is an editable file in the scaffolded repo (nothing essential
  hidden in `node_modules`).
- Review-gated: a developer can replace the reading-surface styling without fighting the engine.

### Accessibility

Bake the floor in, then exceed the field's baseline-only norm: skip link, semantic landmarks, a real
heading hierarchy with anchors, focus management, dark-ready markup. A consistent visible `:focus-visible`
language across every interactive element (AstroPaper's signature). A legibility-grade body face. A
contrast floor gated in CI on cairn's own theme, dual-gamut: convert each oklch role pair through culori
(or equivalent) and assert AA in both sRGB and P3, failing if either drops, which is strictly more than
DaisyUI's sRGB-only checking and more than the admin's hand-locked comment floors. The floors stay as
defense in depth. All motion is gated behind `prefers-reduced-motion`.

- CI-mechanical: every role and `-content` pair plus each on-surface-ink token records a passing AA ratio
  in both gamuts; a deliberately broken accent fails the gate; axe or pa11y passes on the default design;
  the skip link is present; no ungated animation exists.
- Review-gated: a manual a11y pass on the rendered pages.

### Performance

Cheap Cloudflare hosting makes this load-bearing. Meet or beat the Astro, Hugo, and Eleventy CWV bar by
construction: SvelteKit on adapter-cloudflare (wired in B1), minimal client JS on the reading route,
build-time highlighting (no client highlighter), the editorial fonts self-hosted, subset, and preloaded
with `font-display: swap` and a metrics-matched system fallback (`size-adjust`, `ascent-override`) so CLS
stays near zero across the swap, responsive images with reserved dimensions, and CSS-only
`@view-transition` page navigation at zero JS cost. The committed editorial pair is the default first
paint, not a system-font default, because the un-templated-on-first-run lead requires the real faces.

- CI-mechanical: green Core Web Vitals on the article and home routes; no render-blocking third-party font
  origin; CLS near zero with the webfonts active; near-zero client JS on the reading surface.

### Motion

Restrained, tasteful, reduced-motion-correct, CSS-first (Svelte and CSS over a Framer-heavy approach).
The reading body is calm; expressive motion is reserved for index and landing pages. Subtle link and
hover transitions, smooth anchor scroll, an optional reading-progress and TOC active-section tracking, a
polished theme-toggle transition, and CSS-only cross-page `@view-transition`. The DaisyUI depth and noise
knobs are off-by-default theme-level richness, not per-component animation. Reduced-motion gating is a
floor, not a differentiator.

- CI-mechanical: every motion respects `prefers-reduced-motion`; no scroll-jacking on the reading surface.

## Component inventory and the demo

The starter anticipates the common UI components a site builder needs and demos every one on
`/styleguide`, so the template is a working component library, not a blog skeleton. The inventory below is
the target the styleguide fills, and `/styleguide` is the single growing demo surface that shows
everything shipped so far. Most primitives are DaisyUI components the token layer styles (button, card,
badge, alert, tabs, accordion, menu, drawer, input, select, checkbox, table), so the work is styling them
well on the tokens and demoing them, not reinventing them. The directive components are markdown-authored
(the render-component pattern); the own-it components are the site-owned compositions.

- **Navigation:** header, primary nav, mobile menu/drawer, footer, breadcrumbs, skip link, table of
  contents, pagination, back-to-top.
- **Editorial and content:** hero, section, post card and generic card, callout/admonition
  (note/tip/warning/danger), blockquote, hanging pull-quote, figure with caption, image gallery, accordion
  (details), tabs, badge/tag/chip, button and button group, CTA banner, stat/metric, lead paragraph,
  divider, table, lists including task lists, code block, inline code, footnotes, embed (video/iframe),
  avatar, icon set.
- **Forms and interaction:** text input, textarea, select, checkbox and radio, search box, contact form,
  newsletter signup, the dark-mode toggle, copy-to-clipboard.
- **Feedback and status:** alert, empty state, loading and skeleton, the 404 content.
- **Layout:** container, responsive grid, the prose reading container, a two-column or sidebar option.

**Sequencing.** B2 ships the component system (the tokens, the own-it model, the directive-registry
pattern) and the foundation and core set (the chrome and reading-surface components, callout and its
directive siblings, and the token-styled primitives a page needs: button, card, badge and tag, accordion,
tabs, alert, hero, CTA, divider), all demoed on `/styleguide`. B3 adds the feature components (search,
pagination, archive and tag cards, the 404 and empty state) and B4 the option components (contact form,
newsletter, analytics, media hero and figure, the dark-mode toggle), each added to the same `/styleguide`
demo. By the end of B4 the styleguide demos the whole inventory. Enumerate it in Phase A so the system is
designed for the full set, not retrofitted.

## Architecture calls (locked)

- **Build-time syntax highlighting is engine-fat:** a Shiki or rehype transformer in the engine render
  pipeline (`src/lib/render/`), so every site gets it and the editor preview matches the public page. It
  emits CSS-variable tokens bound to the DaisyUI `base-200`, `base-300`, and `base-content` roles plus a
  tokenized syntax ramp, with light and dark resolving through the same variables and zero client JS.
- **Bespoke token-bound reading surface, not stock `prose`.** The showcase has no
  `@tailwindcss/typography` dependency today, so this is unconflicted.
- **The editorial pairing ships preloaded as the default first paint**, CLS-safe via a metrics-matched
  fallback.
- **A `/styleguide` route is a first-class deliverable** and the CI fixture that screenshots a re-skin
  before and after to prove the one-token-set claim.
- **Commit a real N** for the recipe (target roughly 14 color values plus the two font tokens, the one
  type ratio, and the one space-scale step), prose included at zero extra.
- **The contrast gate is dual-gamut** (sRGB and P3). If dual-gamut proves too costly for v1, downgrade to
  automated sRGB with the floors and document the caveat, and drop the dual-gamut claim from the
  differentiators rather than overstating it.
- **The public side adopts Tailwind and DaisyUI for the first time.** The showcase trades its
  plain-CSS-public property (which proved the admin self-styles independently) for the DaisyUI token spine
  the spec calls for. The admin's independence is still provable, since it ships its own scoped sheet
  regardless of what the public side uses.

## Carry-forwards

- The exact faces and oklch values are the frontend-design loop's output, chosen against the typography
  and color criteria above.
- The guided "pick your brand" generator (a slider or preview that emits the oklch block and validates AA)
  is a Part C scaffolder deliverable, not B2.
- Home is mocked in B2 to stress the tokens on a composed page and implemented in B3. The defaults surface
  (archive, tags, search, 404, sample content) is B3; the options and first-run are B4.

---

# Settled design (B2 output)

The frontend-design loop (Phase A) and GATE 1 settled the concrete design. Tasks 2 through 6 read their
values here. The working mockup that produced these values, with a live light/dark and four-variant
switcher, is [`docs/internal/design/2026-06-25-b2-public-theme-mockups.html`](../../internal/design/2026-06-25-b2-public-theme-mockups.html);
it is the public counterpart to the admin's `editor-shell-gold-standard.html`.

## The decision and its provenance

The chosen direction is **"the Marker": a manuscript on warm stone.** Four neutral-leaning directions
(Quarry, Newsprint, Slate, Patina) were rendered as one markup in four token sets and judged by two
independent adversarial critics (a visual critique and an a11y/contrast review with real WCAG math).
They converged: Slate's warm-ochre accent failed the AA floor (4.51 on paper, 3.63 on its button), and
Newsprint's zero-brand-color default read as a placeholder the bar prohibits. The winner is **Quarry
warmed**: the universal ink-blue accent re-grounded onto warm-stone paper, with the editorial display
face the critique judged the only one to clear the "excellent finished product" bar. The accent was
confirmed by the user (deep ink-blue over the teal alternate) on 2026-06-25.

## Faces (self-hosted, OFL, subsettable)

| Role | Face | Use | Notes |
| --- | --- | --- | --- |
| `--font-display` | **Fraunces** (variable, opsz + wght + ital) | h1/h2/h3, the masthead, entry titles, pull-quotes, the brand wordmark, the CTA heading, stat numbers | Weight ~600 at a display optical size; never the 900 "chonky" weight that became the cliché. Distinct from the admin's Bricolage Grotesque. |
| `--font-body` | **Source Sans 3** (variable wght + ital) | body, UI, lead, captions, nav, footer | Legibility-grade humanist sans; warmer and more compact at the 66ch measure than Work Sans. Distinct from the admin's IBM Plex Sans. `strong` at weight 650. |
| `--font-mono` | **Source Code Pro** | inline code, code blocks | One Source superfamily carries reading and code; Fraunces is the editorial voice. Distinct from the editor's iA Writer Mono. |

The pairing ships preloaded as the default first paint (CLS-safe via a metrics-matched fallback, the
performance dimension). Fraunces + ink-blue reads as deliberate editorial; the named AI-default cluster
is Fraunces + **terracotta**, which the chosen blue avoids.

## Color: the oklch role tokens

DaisyUI 5 `@plugin "daisyui/theme"` role names, light and a dark sibling (`prefersdark: true`, wired to
`color-scheme`). Role names only, never appearance names. Light and dark are symmetric (both warm).

### Brand and base (per-theme)

| Token | Light | Dark |
| --- | --- | --- |
| `--color-base-100` (paper) | `oklch(98.4% 0.0035 80)` | `oklch(24% 0.01 78)` |
| `--color-base-200` (recessed, code panel) | `oklch(96.4% 0.005 80)` | `oklch(20% 0.01 78)` |
| `--color-base-300` (borders, chips) | `oklch(90.8% 0.006 78)` | `oklch(32% 0.012 78)` |
| `--color-base-content` (ink) | `oklch(25% 0.014 70)` | `oklch(92% 0.007 80)` |
| `--cairn-muted` (meta, captions, nav, excerpts) | `oklch(46% 0.013 72)` | `oklch(70% 0.012 76)` |
| `--color-primary` (the one accent) | `oklch(45% 0.1 248)` | `oklch(74% 0.1 248)` |
| `--color-primary-content` | `oklch(99% 0.01 248)` | `oklch(22% 0.03 248)` |
| `--color-secondary` | `oklch(50% 0.02 75)` | `oklch(72% 0.02 75)` |
| `--color-secondary-content` | `oklch(99% 0.005 75)` | `oklch(22% 0.01 75)` |
| `--color-accent` | `oklch(52% 0.07 235)` | `oklch(76% 0.08 235)` |
| `--color-accent-content` | `oklch(99% 0.01 235)` | `oklch(22% 0.03 235)` |
| `--color-neutral` | `oklch(27% 0.013 72)` | `oklch(86% 0.006 75)` |
| `--color-neutral-content` | `oklch(97% 0.003 75)` | `oklch(22% 0.01 75)` |

### Status (shared across the theme, light / dark)

Each status hue carries a fill `-content` and a separate on-surface `-ink` token, the admin's lesson
that a fill tone fails as small text.

| Token | Light | Dark |
| --- | --- | --- |
| `--color-success` / `-content` / `-ink` | `oklch(60% 0.12 150)` / `oklch(99% 0.01 150)` / `oklch(45% 0.1 150)` | `oklch(66% 0.12 150)` / same / `oklch(78% 0.11 150)` |
| `--color-warning` / `-content` / `-ink` | `oklch(80% 0.13 78)` / `oklch(28% 0.05 78)` / `oklch(52% 0.11 70)` | `oklch(82% 0.13 78)` / same / `oklch(82% 0.12 76)` |
| `--color-error` / `-content` / `-ink` | `oklch(58% 0.19 27)` / `oklch(99% 0.01 27)` / `oklch(50% 0.17 27)` | `oklch(66% 0.17 27)` / same / `oklch(76% 0.14 27)` |
| `--color-info` / `-content` / `-ink` | `oklch(62% 0.1 235)` / `oklch(99% 0.01 235)` / `oklch(48% 0.1 235)` | `oklch(70% 0.1 235)` / same / `oklch(80% 0.1 235)` |

### Elevation and the CTA pair (the load-bearing rules)

- `--cairn-card-border`: `color-mix(in oklab, var(--color-base-content) 9%, transparent)` light,
  `16%` dark. `--cairn-shadow`: a soft two-layer shadow (base-content at 6%/12% light; black at 40%/55%
  dark). A floating card uses both, never a flat `base-300` border (the admin convention).
- **The CTA panel uses its own token pair, never `--color-neutral` directly.** `--color-neutral`
  inverts to a light value in dark mode, which turned the CTA into a bright slab (the GATE-1 bug). The
  pair: light `--cairn-cta-bg: var(--color-neutral)` (the warm near-black house-ad) with a
  `base-100` button; dark `--cairn-cta-bg: var(--color-base-200)` with a `base-300` border and a solid
  `primary` button. This rule is load-bearing for Task 4/5; do not paint a CTA from `neutral`.

## The cairn-authored tokens (constant across any re-skin)

```css
/* Fluid type scale, Utopia-style; ~1.24 ratio, clamp() */
--cairn-step--1: clamp(0.84rem, 0.81rem + 0.14vw, 0.92rem);   /* caption, meta */
--cairn-step-0:  clamp(1.06rem, 1.01rem + 0.27vw, 1.22rem);   /* body 17–19.5px */
--cairn-step-1:  clamp(1.27rem, 1.19rem + 0.43vw, 1.53rem);   /* lead, h4 */
--cairn-step-2:  clamp(1.52rem, 1.39rem + 0.66vw, 1.91rem);   /* h3, index title */
--cairn-step-3:  clamp(1.83rem, 1.63rem + 1.0vw, 2.39rem);    /* h2 */
--cairn-step-4:  clamp(2.19rem, 1.9rem + 1.45vw, 2.98rem);    /* section display, stat */
--cairn-step-5:  clamp(2.3rem, 1.82rem + 2.1vw, 3.6rem);      /* h1, masthead (floor pulled for mobile) */
--cairn-leading-body: 1.65;   --cairn-leading-snug: 1.4;   --cairn-leading-tight: 1.12;
--cairn-tracking-tight: -0.011em;   --cairn-tracking-eyebrow: 0.12em;

/* Measure: the reading column cap (~66ch), structural. Figures and pull-quotes break past it. */
--cairn-measure: 44rem;   --cairn-measure-wide: 58rem;

/* Fluid space scale (Utopia 3xs–2xl) */
--cairn-space-3xs: clamp(0.31rem, 0.3rem + 0.05vw, 0.34rem);
--cairn-space-2xs: clamp(0.5rem, 0.48rem + 0.11vw, 0.56rem);
--cairn-space-xs:  clamp(0.75rem, 0.72rem + 0.16vw, 0.84rem);
--cairn-space-s:   clamp(1rem, 0.96rem + 0.22vw, 1.13rem);
--cairn-space-m:   clamp(1.5rem, 1.43rem + 0.33vw, 1.69rem);
--cairn-space-l:   clamp(2rem, 1.91rem + 0.43vw, 2.25rem);
--cairn-space-xl:  clamp(3rem, 2.83rem + 0.87vw, 3.5rem);
--cairn-space-2xl: clamp(4rem, 3.74rem + 1.3vw, 4.75rem);
--flow-space: 1.35em;   /* the single owl-selector rhythm var; headings/figures/pre override locally */

/* Geometry: modest, stone-grade radii (not zero broadsheet, not bubbly) */
--radius-box: 0.625rem;   --radius-field: 0.4rem;   --radius-selector: 0.28rem;   --border: 1px;

/* Code-block ramp: every token reads a role, so a re-skin recolors code with no edit.
   Task 3's Shiki theme emits these CSS-variable names. */
--cairn-code-bg: var(--color-base-200);       --cairn-code-border: var(--color-base-300);
--cairn-code-ink: var(--color-base-content);  --cairn-code-comment: var(--cairn-muted);
--cairn-code-keyword: var(--color-primary);   --cairn-code-string: var(--color-success-ink);
--cairn-code-function: var(--color-info-ink); --cairn-code-number: var(--color-warning-ink);
--cairn-code-punct: var(--cairn-muted);
```

## Layouts

- **Chrome (Task 4).** Sticky header on a translucent `base-100` (`color-mix … 88%` + `backdrop-filter`)
  with a `--cairn-card-border` hairline bottom: the cairn brand mark (primary) plus the Fraunces
  wordmark left, the primary nav right (`--cairn-muted`, hover to `base-content`, `aria-current` to
  `primary` plus weight 600). Footer on `base-200`: the brand, a footer nav, and a fine-print line over a
  hairline. Skip link, `header`/`nav`/`main`/`footer` landmarks, a consistent `:focus-visible` (2px
  primary, 2px offset).
- **Reading surface (Task 5).** A centred column at `--cairn-measure` inside the `--cairn-measure-wide`
  shell. Vertical rhythm from `--flow-space` via the owl selector; headings bind to the text they
  introduce (large space above, tight below). Elements: lead paragraph (step-1, 86% ink); h2 (Fraunces
  step-3) / h3 (Fraunces step-2); blockquote with a 3px `primary` left rule, italic; a hanging pull-quote
  (Fraunces step-3) that outdents 4.5rem into the left margin past `64rem`; inline code as a `base-200`
  chip with a `base-300` border; the code block on `--cairn-code-*`; figures on the existing
  `center`/`wide`/`full` contract with `--cairn-muted` captions and full-bleed breakout (`overflow-x:
  clip` keeps no scrollbar); diamond `ul` markers and Fraunces numbered `ol` markers; bordered, zebra
  (`base-200`) tables; the `hr` as a centred cairn mark in `base-300`; the end-of-article colophon mark.
- **Home (Task 6).** A masthead (eyebrow, Fraunces step-5 title, step-1 muted lead) over an "archival
  index": a `base-300` top rule, an eyebrow plus a tabular entry count, then dated rows (a 7.5rem date
  column, a Fraunces step-2 title, a muted excerpt, tag chips), each over a hairline. Collapses to one
  column below 34rem.
- **Components (Task 5/7 catalog).** Buttons (`btn-primary` solid, `btn-outline`, `btn-ghost`), tags and
  a `badge-primary` tint, a floating card, a native `<details>` accordion (`+`/`−` marker), a tab bar,
  the CTA (per the token-pair rule above), and a stat (Fraunces number + muted label).

## Carry-forward punch-list (Tasks 2, 5, 7)

These are the GATE-1 findings the build must honour; the dual-gamut culori gate (Task 7) is the final
authority on AA, and the values above are GATE-1-clean by hand math but must pass that gate.

- **Contrast guardrails.** Keep `--color-accent` and `--color-secondary` off small text (they are
  large-text-only in some hues). The culori gate must check every role/`-content` pair plus the
  on-surface `-ink` tokens, in sRGB and P3.
- **Harmonise the info status with the brand blue.** The note callout should read as the brand's own
  note; nudge `--color-info`/`-ink` toward the brand hue (248) so it does not read as an "almost the
  same" second blue (Task 2 tuning).
- **Confirm the code panel reads on warm paper.** Warm `base-200` against warm `base-100` is a smaller
  delta than the cool version; nudge `base-200` if `pre` stops reading as a panel.
- **Real semantics in the build.** GFM task lists render real `<input type="checkbox" disabled>`; style
  the real control and keep the check glyph (non-colour cue). The tabs are either the full APG pattern
  (`aria-controls` → `tabpanel`, roving tabindex, arrow keys) or plain links; do not ship half-roled
  tabs. Callout titles keep a mandatory text label, and the decorative SVG is `aria-hidden`.
- **Sticky-header offsets.** Add `scroll-padding-top` equal to the header height so a focused in-page
  anchor is not obscured. Verify the focus ring at 3:1 against `base-200` and the callout tints, not only
  `base-100`.
- **Motion.** Gate every transition behind `prefers-reduced-motion`, including any future `<details>`
  open transition, JS scroll, and the CSS `@view-transition`.
