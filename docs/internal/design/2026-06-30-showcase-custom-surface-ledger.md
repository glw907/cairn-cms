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
| `--color-muted` | secondary-text ink; the captions, meta, and the code comment/punct ramp read it. Renamed from `--cairn-muted` in Phase 2 and moved to `@theme` so the `text-muted` utility generates; keeps its Tier-2 role |
| `--cairn-success-ink` | on-surface status ink (code string; callout-tip) |
| `--cairn-warning-ink` | on-surface status ink (code number; callout/alert caution) |
| `--cairn-error-ink` | on-surface status ink |
| `--cairn-info-ink` | on-surface status ink (code function; callout-note; the default alert) |

### The elevation pair

| Token | Reason |
| --- | --- |
| `--color-card-border` | the faint hairline that carries card definition, theme-adaptive (9% light, 16% dark). Renamed from `--cairn-card-border` in Phase 2 and moved to `@theme` so the `border-card-border` utility generates; keeps its Tier-2 role |
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

## Tier 3: folded (Phase 2, template chrome — DONE)

A candidate was Tier 3 only where a native Tailwind 4 or DaisyUI 5.6 primitive provably replaced it
without losing an accessibility cue or a design intent. Phase 1 recorded these; Phase 2 (template chrome,
Tasks 1 through 6) folded them. **Final showcase `retiredTokenBudget`: 0 (the floor).** The record:

- **The arbitrary-value bracket utilities and inline `var(--…)` styles in the chrome and route markup
  (FOLDED).** `SiteHeader.svelte`, `SiteFooter.svelte`, `(site)/+layout.svelte`, and `(site)/+page.svelte`
  reached for the cairn token layer through arbitrary-value utilities
  (`text-[length:var(--cairn-step-1)]`, `gap-[var(--cairn-space-m)]`,
  `font-[family-name:var(--font-display)]`, `text-[color:var(--cairn-muted)]`,
  `tracking-[var(--cairn-tracking-tight)]`, `max-w-[var(--cairn-measure-wide)]`,
  `border-[color:var(--cairn-card-border)]`, `rounded-[var(--radius-field)]`). Tasks 1 through 4 folded
  each onto its named utility (`font-display`, `text-step-1`, `gap-m`, `tracking-tight`,
  `max-w-measure-wide`, `text-muted`, `border-card-border`, `rounded-field`). The retired-token count went
  20 → 16 (Task 1) → 1 (Tasks 2 and 3) → 0 (Task 4). Pixel-neutral: each rename resolves to the same value,
  guarded by the `site-visual` baseline.
- **The design-scale token home (MOVED + RENAMED).** The type scale, the space scale, the faces, and the
  tracking/leading/measure values moved from `:root` into Tailwind 4's `@theme` block and were RENAMED to
  Tailwind's utility namespaces (`--cairn-step-N` → `--text-step-N`, `--cairn-space-X` → `--spacing-X`,
  `--cairn-tracking-*` → `--tracking-*`, `--cairn-leading-*` → `--leading-*`, `--cairn-measure*` →
  `--container-measure*`, `--cairn-muted` → `--color-muted`, `--cairn-card-border` → `--color-card-border`;
  the `--font-*` faces kept their names). Tailwind now generates the named utilities the chrome consumes,
  and re-emits each token at `:root` so the `var()` consumers in `theme.css`, `prose.css`, and `site.css`
  keep resolving. The scale *values* are owned design that stayed; only the home and the names changed.
  This was the enabling fold. The rename is now the template's documented re-skin surface (the recipe at
  the top of `theme.css`, rewritten in Task 6 to name the `@theme` tokens and note they drive utilities).
- **The island-converter demo CSS (FIXED, Task 5).** `site.css`'s `.island-converter*` block carried a
  dead token: `border: 1px solid var(--cairn-rule, #b8b0a4)`, where `--cairn-rule` was defined nowhere, so
  it always rendered the hardcoded `#b8b0a4` fallback (a dead token and a magic hex). Task 5 replaced it
  with `var(--color-base-300)` (the theme's light `-300` step, the closest stone gray). This is the one
  **deliberate, reviewed pixel change** in the phase: the dark `styleguide-dark` snapshot shifted by the
  now-visible hairline and was regenerated in the same commit. The demo's remaining magic numbers (the
  `0.25rem` gap, the `1.125rem` font-size, the `0.25rem` padding) do not map cleanly to the scale tokens
  (`--spacing-3xs` is ~0.31rem, `--text-step-0` is a clamp, not 1.125rem), so they stay as genuine
  demo-specific values, not a forced fold.

### The styleguide `.sg-*` chrome (Task 6)

The styleguide route (`(site)/styleguide/+page.svelte`) carries its own scoped `.sg-*` layout chrome in a
`<style>` block. These are CSS-consumed rules, not markup brackets, so they never counted against the
retired-token budget. Task 6 folded the one class that maps provably and pixel-neutrally to native
utilities, `.sg-row` (`flex flex-wrap items-center gap-s`), onto those utilities at its three call sites
and removed the rule. The remaining `.sg-*` classes (the swatch and step grids with `minmax()` columns,
the masthead and section typography, the card, tabs, accordion, CTA, and stat treatments) are bespoke
layout with no clean one-to-one primitive; folding them would risk a cascade or pixel change on the
design-reference surface, so they stay as scoped, tokenized design (Tier 2 in spirit: the page reads the
theme tokens, so it re-skins with the rest).

**Sanctioned residual (stays, by design).** The styleguide swatch styles paint each token dynamically:
`style="background: var({s.token})"`, `style="color: var({s.token})"`, `style="font-size: var({step.token})"`,
`style="font-family: var({face.token})"`. These use a Svelte interpolation (`var({…})`), not a literal
`var(--…)`, so the retired-token signal does not match them. They are the template's analog of the admin's
live-components bar, the one surface that must read tokens dynamically to demonstrate them. They are
sanctioned and stay; the `sanctionedTokens` allowlist remains empty (nothing forced a bad fold).

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

## Phase 2 sign-off (template chrome — DONE)

Phase 2 (Tasks 1 through 6) is recorded in "Tier 3: folded" above. In summary:

- The design-scale tokens moved into `@theme` and were renamed to Tailwind's utility namespaces, so the
  named utilities generate; the chrome markup folded its arbitrary-value brackets onto them.
- The retired-token budget ratcheted **20 → 0 (the floor)** and the showcase `check:custom-surface` tree
  passes at 0.
- Tasks 1 through 4 were pixel-neutral (renames to identical values). Task 5 made the one deliberate,
  reviewed pixel change (the `--cairn-rule` fix), recorded in the `styleguide-dark` baseline. Task 6 folded
  `.sg-row` and rewrote the re-skin recipe and this ledger; it is pixel-neutral.
- The re-skin recipe at the top of `theme.css` now documents the `@theme` token names and notes they drive
  named utilities, so the rename is the template's documented re-skin surface.
