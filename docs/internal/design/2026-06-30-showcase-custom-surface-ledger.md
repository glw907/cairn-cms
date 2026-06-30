# The showcase custom-surface ledger (Tier 1/2/3)

> The committed audit artifact for the starter-template track of the admin idiomatic re-expression
> initiative (`docs/superpowers/specs/2026-06-29-admin-idiomatic-re-expression-design.md`, the
> "## The starter template" section; Phase 1 plan
> `docs/superpowers/plans/2026-06-30-starter-template-1-foundation.md`). It classifies the custom
> surface of `examples/showcase` into the three tiers the five de-customization rules define, censuses
> the retired-token call sites, records the Phase-2 fold targets, and seeds the `check:custom-surface`
> showcase retired-token budget. It is the companion to the admin ledger
> (`2026-06-29-custom-surface-ledger.md`); read that first for the shared model. The tier assignment is
> the human judgment this track makes. Measured 2026-06-30 against DaisyUI 5.6.6 and Tailwind 4.3.2.

## How to read the tiers

The same five de-customization rules govern the showcase, with two charter differences from the admin
(the spec's "## The starter template"):

- **Tier 1 is the template's own theme, not Warm Stone.** The showcase ships its own DaisyUI 5 theme.
  Setting the theme variables is the idiomatic way to theme DaisyUI, so the two theme blocks are kept
  verbatim. This track does not impose Warm Stone on the public site; the public output is
  design-agnostic by charter.
- **Tier 2 includes the content and brand design the site legitimately owns.** The rendered-markdown
  typography, the figure-placement contract, the on-surface inks, and the brand styling are not
  excessive custom. They are the design a scaffolded site owns and will restyle. The track keeps them
  clean, walls and documents them, and does not try to delete them.
- **Tier 3 is the same target as the admin's:** bespoke patterns in the chrome and route markup where a
  Tailwind 4 or DaisyUI 5.6 primitive provably exists. The track folds these in Phase 2 (template
  chrome), not Phase 1.

The five rules are in the admin ledger and the spec; this document does not restate them.

## Tier 1: the showcase DaisyUI theme (keep verbatim)

`examples/showcase/src/lib/theme.css` holds two `@plugin "daisyui/theme"` blocks, `cairn` (light,
default) and `cairn-dark` (under `prefers-color-scheme: dark`). They set the DaisyUI 5 role and
geometry variables:

- the color roles `--color-base-100/200/300`, `--color-base-content`, and the `primary`, `secondary`,
  `accent`, `neutral`, `info`, `success`, `warning`, `error` pairs (each with its `-content`);
- the geometry `--radius-selector/field/box`, `--size-selector/field`, `--border`, `--depth`, `--noise`.

These are Tier 1 by Rule 1: they are the theme, set where DaisyUI 5 reads them at point of use, so every
`bg-base-100` / `text-primary` utility and every component tracks them. The palette is a warm stone
light-and-dark pairing, the showcase's own brand, distinct from the admin's Warm Stone. The status
lightnesses are pinned at the AA floor the dual-gamut gate (`check:public-tokens`) measures for their
near-white `-content`. The `@plugin "daisyui" { themes: false }` line drops DaisyUI's built-in themes so
these two are the only ones, the same discipline the admin sheet runs.

## Tier 2: owned design (the documented floor)

This tier is owned on purpose. It carries the re-skin recipe at the top of `theme.css` and the contrast
floors, and it is kept clean and documented, not deleted.

### The reading surface (`prose.css`)

The whole of `examples/showcase/src/lib/prose.css` is the hand-authored article typography, the
signature B2 deliverable. Every element (heading, lead, blockquote, pull-quote, code, list, table,
figure, hr) is a crafted, tokenized treatment, scoped to a `.prose` container, every rule inside
`@layer components`. It is not `@tailwindcss/typography`; it reads the theme roles and the cairn token
layer, so one token edit re-skins the article in lockstep with the chrome. It also styles the engine's
directive render output (`.callout`, `.alert` and their parts) under `.prose` so those beat DaisyUI's
own `.alert`/`.card` on specificity. Owned design; not foldable.

### The figure-placement contract and the reading column (`site.css`)

- `.site-main` — the centered reading column at the measure, the container the editor preview frame
  reproduces.
- `.cairn-place-center`, `.cairn-place-wide`, `.cairn-place-full` (and the base `.site-main figure`
  rules) — the figure-placement contract for the `:::figure` role classes (media 3a). cairn defines the
  class contract; the site owns the pixels by styling them. This is Tier-2 frame-and-design (see the
  audience split below).
- The `html { scroll-padding-top }` rule — the sticky-header focus offset (WCAG 2.4.11), sized from the
  type and space tokens so it re-skins.

### The on-surface inks (no native primitive supplies these)

A status fill tone fails as small text (the admin's lesson), so the muted text and each status word read
a darker ink than the matching `-content` fill pair. Each ink holds its fill's hue so the directive
titles and the code colors track the fills under a re-skin (the re-skin recipe step 6 names this seam).
Defined on `:root` (light) and under the `prefers-color-scheme: dark` query (dark), in lockstep with the
DaisyUI roles.

| Token | Reason |
| --- | --- |
| `--cairn-muted` | secondary-text ink; the captions, meta, and the code comment/punct ramp read it |
| `--cairn-success-ink` | on-surface status ink (code string; callout-tip) |
| `--cairn-warning-ink` | on-surface status ink (code number; callout/alert caution) |
| `--cairn-error-ink` | on-surface status ink |
| `--cairn-info-ink` | on-surface status ink (code function; callout-note; the default alert) |

### The elevation pair

| Token | Reason |
| --- | --- |
| `--cairn-card-border` | the faint hairline that carries card definition, theme-adaptive (9% light, 16% dark) |
| `--cairn-shadow` | the soft floating-card shadow, warm-tinted light, near-absent dark |

### The CTA panel pair

`--cairn-cta-bg`, `--cairn-cta-content`, `--cairn-cta-border`, `--cairn-cta-btn-bg`,
`--cairn-cta-btn-content`. The house-ad CTA never reads `--color-neutral` directly (it inverts to a light
value in dark mode); the pair deliberately flips from a warm near-black slab in light to a recessed
bordered panel in dark, so the CTA never becomes the brightest slab on a dark page. Owned brand design.

### The code-highlight binding (`pre.shiki` + `.cairn-tok-*`)

The `@layer components` block at the foot of `theme.css` binds `pre.shiki` (background, ink, border) and
each `.cairn-tok-keyword/string/comment/function/number/punct` class to a `--cairn-code-*` role variable.
The engine's build-time highlighter owns the `.cairn-tok-*` class contract (the engine names the classes;
the site colors them). The ramp reads the theme roles and the inks, so the syntax palette re-skins with
the rest. Tier-2 frame-and-design: the class contract is cairn's frame, the colors are the site's.

## The internal frame versus the owned design (the audience split)

Mirroring the admin ledger's "your API versus cairn's frame" split, the showcase Tier 2 divides by who
owns what:

- **cairn's frame (the engine names it; the site styles it; do not rename the class contract):** the
  `.cairn-tok-*` syntax classes, the `.cairn-place-*` figure classes, the `.callout`/`.alert` directive
  render classes, and `pre.shiki`. A developer restyles these but does not invent the names; the engine
  emits them.
- **the developer's own design (theirs to change freely):** the palette (the two theme blocks), the type
  and space scales, the reading surface in `prose.css`, the brand styling, the CTA pair. The re-skin
  recipe at the top of `theme.css` is the documented entry point.

## Tier 3: the Phase-2 fold target

A candidate is Tier 3 only where a native Tailwind 4 or DaisyUI 5.6 primitive provably replaces it
without losing an accessibility cue or a design intent. Phase 1 records these; Phase 2 (template chrome)
folds them.

- **The arbitrary-value bracket utilities and inline `var(--…)` styles in the chrome and route markup.**
  `SiteHeader.svelte`, `SiteFooter.svelte`, `(site)/+layout.svelte`, and `(site)/+page.svelte` reach for
  the cairn token layer through arbitrary-value utilities (`text-[length:var(--cairn-step-1)]`,
  `gap-[var(--cairn-space-m)]`, `font-[family-name:var(--font-display)]`, `text-[color:var(--cairn-muted)]`,
  `tracking-[var(--cairn-tracking-tight)]`, `max-w-[var(--cairn-measure-wide)]`,
  `border-[color:var(--cairn-card-border)]`, `rounded-[var(--radius-field)]`) because no named utility
  exists yet. This is the showcase's analog of the admin's retired `text-[var(--color-muted)]`. Rule 2
  retires them to named utilities.
- **The design-scale token home.** The type scale (`--cairn-step-*`), the space scale
  (`--cairn-space-*`), the faces (`--font-display/body/mono`), and the
  `--cairn-tracking-*`/`--cairn-leading-*`/`--cairn-measure*` values are declared on `:root`. Phase 2
  moves them into Tailwind 4's `@theme` block, where Tailwind generates the named utilities
  (`font-display`, `text-step-1`, the spacing scale, `tracking-*`, `leading-*`) that the markup above will
  consume. The scale *values* are owned design that stays; only the home and the markup references change.
  This is the enabling fold: the bracket utilities cannot retire to named utilities until the tokens live
  where Tailwind reads them.
- **The island-converter demo CSS** (`site.css`, the `.island-converter*` block). Minimal bespoke
  styling for the styleguide's island demo, with magic numbers (`font-size: 1.125rem`, `gap: 0.25rem`,
  `opacity: 0.6`) and one bug: line 113 reads `border: 1px solid var(--cairn-rule, #b8b0a4)`, but
  `--cairn-rule` is defined nowhere, so it always renders the hardcoded `#b8b0a4` fallback (a dead token
  and a magic hex). Phase 2 folds the demo onto theme tokens and removes the dead token. **Not fixed in
  Phase 1** (it would change a pixel).

## Call-site census (the retired-token surface)

The retired-token signal (below) matches **20 lines across 4 files**, measured 2026-06-30:

| File | Lines |
| --- | --- |
| `examples/showcase/src/lib/components/SiteHeader.svelte` | 8 |
| `examples/showcase/src/lib/components/SiteFooter.svelte` | 8 |
| `examples/showcase/src/routes/(site)/+page.svelte` | 5 (some lines carry the same token twice) |
| `examples/showcase/src/routes/(site)/+layout.svelte` | 2 |

The tokens wrapped: `--cairn-step-*` (type scale), `--cairn-space-*` (space scale), `--font-display`/
`--font-body` (faces), `--cairn-tracking-*`, `--cairn-leading-*`, `--cairn-measure`/`--cairn-measure-wide`,
`--cairn-muted` (ink), `--cairn-card-border` (elevation), `--radius-field` (geometry). No other showcase
file carries a retired-token line: the `(site)` content pages, the calendar, the admin mount routes, the
spike, and the islands component are clean under the signal.

## The check:custom-surface gate (showcase tree)

The gate is per-tree (`scripts/check-custom-surface.mjs`, `scripts/custom-surface-budget.json`). The
showcase tree sets `adminCss: null`, so `evaluate` skips the unlayered-rule and `@layer components`
signals for it (those guard the admin's embed-anywhere sheet; the showcase's `@layer components` blocks in
`prose.css` and `theme.css` are Tier-2 owned design and are not capped). Only the retired-token budget
applies to the showcase.

**The retired-token signal.** The admin counts only `var(--color-muted|subtle)` because its earlier work
had already folded every other bracket reference and its AA inks are deliberately sanctioned and
uncounted. The showcase starts with the full bespoke set, so its signal is the generalization: any
arbitrary-value bracket utility (`…-[…var(--…)…]`) or inline `style="…var(--…)…"` wrapping a literal CSS
variable in `.svelte` markup. Phase 1 makes the gate's retired-token pattern per-tree (a
`retiredTokenPattern` string on each tree in the budget JSON); the admin keeps its pattern byte-for-byte
(stays at 0), the showcase gets the generalized one, seeded at the measured count (20) so it passes day
one and blocks nothing. Phase 2 ratchets it down as the chrome folds.

**The sanctioned design-reference tool.** The styleguide (`(site)/styleguide/+page.svelte`) renders token
swatches with dynamic inline styles (`style="background: var({s.token})"`, `style="color: var({s.token})"`,
`style="font-size: var({step.token})"`, `style="font-family: var({face.token})"`). These are the template's
analog of the admin's live-components bar, the one surface that must read tokens dynamically to demonstrate
them. They use `var({…})` (a Svelte interpolation), not a literal `var(--…)`, so the signal does not match
them. They are sanctioned and stay.

**The escape hatch.** A per-tree `sanctionedTokens` allowlist is empty now. If Phase 2 finds a token with
no sensible named utility (an AA ink that lands in markup), it is added there with a one-line charter note,
mirroring the admin's ink sanctioning, rather than forcing a bad fold.

## Phase 1 sign-off

Phase 1 (template foundation) is recorded here:

- **Tier 1** (the two showcase theme blocks) is frozen verbatim; no Warm Stone imposed.
- **Tier 2** (the reading surface, the figure contract, the inks, the elevation and CTA pairs, the
  code-highlight binding) is walled and documented as the owned floor, with the frame-versus-owned split
  marked.
- **The gate** is extended to the showcase tree with the per-tree retired-token pattern, seeded at 20.
- **The visual baseline** (`examples/showcase/e2e/site-visual.spec.ts`, the home and the styleguide in
  light and dark) is committed as the zero-pixel floor for Phase 2.

Phase 1 made **no pixel change**. The fold (the markup migration to named utilities, the token-home move
to `@theme`, the island-converter and `--cairn-rule` fix) is Phase 2 (template chrome).
