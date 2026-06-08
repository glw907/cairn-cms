# Cairn admin design system (agent reference)

Read this before any work on the `/admin` interface (`src/lib/components/*.svelte` and
`src/lib/components/cairn-admin.css`). It is the convention set that keeps the admin consistent. It is
written for an implementing agent, so it leads with the rules that are easy to break and not visible in
the markup, then the tokens, the type system, and the component recipes. Match these; do not reinvent
them per component.

The admin is self-styled: the engine ships a scoped stylesheet (`dist/components/cairn-admin.css`,
compiled from `cairn-admin.css` plus DaisyUI/Tailwind by `scripts/build-admin-css.mjs`) so the admin
looks identical on any host with no host CSS. DaisyUI v5, Tailwind v4, Svelte 5 runes.

## Load-bearing rules (break these and the admin renders wrong)

- **`data-theme` goes on a bare wrapper, never on an element that also carries styled classes.** Every
  scoped rule is a descendant selector (`:where([data-theme]) .foo`), so a class on the theme element
  itself never matches. Put `data-theme` on an outer `<div>` and the styled layout one level in. This
  broke the drawer (it stayed `display:block`) and both auth pages (they would not center); both were
  real shipped bugs.
- **Scoped overrides go in `@layer components`.** The compiled sheet layers as
  `properties < theme < components < utilities`, so a rule must sit in `components` to lose to Tailwind
  utilities. An unlayered rule beats every utility (cascade layers resolve before specificity), which
  silently kills hover and link utilities. The anchor reset, the `<summary>`/caret rules, `::selection`,
  `:focus-visible`, and the `.btn-primary` lift all live in the `@layer components` block in
  `cairn-admin.css`.
- **The build flattens CSS nesting before scoping.** `build-admin-css.mjs` runs lightningcss with
  `Features.Nesting` between the Tailwind compile and `postcss-prefix-selector`, because the prefixer
  prepends the scope to the front of every rule and would sever a nested combinator selector
  (`> .drawer-toggle ~ .drawer-side` becoming `:where(scope) > .x`). Do not author nested combinator CSS
  expecting the scoper to handle it; the flatten step is what makes it work, and a test pins it.
- **`@font-face` is added after compile, not in the partial.** The `@import` inlining rebases a `url()`
  against the source tree, so the woff2 url would 404 for a consumer. The two `@font-face` rules are
  appended in `build-admin-css.mjs` with an output-relative `./fonts/` url; the woff2 files ship in
  `dist/components/fonts/`. A build test pins the url.
- **Borders and shadows are theme-adaptive vars.** Use `var(--cairn-card-border)` and
  `var(--cairn-shadow)`, never a fixed `base-300` border on a floating card. In light the border is a
  near-invisible hairline and the soft shadow carries the lift; in dark the border is defined because a
  shadow barely shows. Structural chrome borders use the same var.
- **Classes ship automatically.** `build-admin-css.mjs` scans the `.svelte` sources with `@source`, so
  any DaisyUI or Tailwind class a component adds is compiled into the sheet with no build change. Run
  `npm run package` after a component or `cairn-admin.css` change, then rebuild the showcase to preview.
- **Verify visuals on the showcase, not in component tests.** The browser component tests import the
  source `cairn-admin.css` (the variables-only partial), not the compiled dist sheet, so DaisyUI
  component styling is absent there. Preview with `examples/showcase` (`npm run package` then the
  showcase build/preview). The showcase mounts the authed shell at `/admin/posts`.

## Tokens (Warm Stone)

Defined per theme root in `cairn-admin.css`: `[data-theme='cairn-admin']` (light) and
`[data-theme='cairn-admin-dark']` (dark). Same hues across both (warm 75, violet 293 primary).

- Surfaces: `base-100` is the panel surface (sidebar, topbar, cards); `base-200` is the app background
  (the content area, recessed); `base-300` is for incidental borders and chips. `base-content` is text.
- Accent: `primary` is the violet (light `oklch(52% 0.2 293)`, dark `oklch(68% 0.18 293)`). Use it for
  the active state, the primary action, links-on-hover, the brand. `primary-content` reverses out on it.
- Secondary text: `--color-muted` (labels, dates, hints) and `--color-subtle` (nav item text). Subtle is
  the stronger of the two. Reference them as `text-[var(--color-muted)]` / `text-[var(--color-subtle)]`.
- Radii: `--radius-field: 0.625rem` (inputs, buttons, badges), `--radius-box: 1rem` (cards, modals).
- Elevation: `--cairn-shadow` (soft layered shadow) and `--cairn-card-border` (the theme-adaptive
  hairline). Both are set per theme root.
- The dark active-nav pair (`text-primary` on `bg-primary/10`) sits at ~4.5:1, near the floor. Do not
  lower dark `--color-primary` lightness or the `/10` opacity without re-checking contrast.

## Type

Two self-hosted variable fonts (SIL OFL, in `src/lib/components/fonts/`), wired through vars on the
theme roots, with font-smoothing on.

- Display: `var(--font-display)` = Bricolage Grotesque. Brand wordmark and page `h1` only, so it stays
  an accent and never overbears. Apply as `font-[family-name:var(--font-display)]`.
- Body and UI: `var(--font-body)` = Figtree. The default everywhere else.

Recipes:

- Page heading: `text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]`.
- Eyebrow (sidebar group headers and table column labels):
  `text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]`.
- Nav item: `text-sm` (the lists use `menu-sm`), `font-medium` inactive, `font-semibold` active.
- Brand wordmark: `text-xl font-bold tracking-[-0.01em] font-[family-name:var(--font-display)]`.

## Component recipes

- **Floating card:** `rounded-box border border-[var(--cairn-card-border)] bg-base-100 shadow-[var(--cairn-shadow)]`.
  Use for the list table, the editor panes, the auth card. Do not use a flat `base-300` border.
- **Active nav item:** `bg-primary/10 font-semibold text-primary` plus `aria-current="page"`; inactive is
  `font-medium text-[var(--color-subtle)]`.
- **Collapsible group:** a native `<details>` per group with `bind:open` seeded from `data.collapsedNav`
  (persisted via the `cairn-admin-nav-collapsed` cookie, read at SSR for no flash). The `<summary>` is
  the eyebrow plus a gentle band (`bg-base-content/[0.04] hover:bg-base-content/[0.08]`) and a
  `.cairn-caret` chevron that the scoped rule rotates when open. Items align with the group label and the
  brand mark on one left edge.
- **Brand mark:** the cairn glyph in a filled app-icon tile:
  `h-8 w-8 rounded-xl bg-primary text-primary-content shadow-sm` wrapping `<CairnLogo class="h-5 w-5" />`,
  then the wordmark. It links to `/admin`. The mark is `CairnLogo.svelte` (the public-domain Temaki
  cairn); the favicon is `cairn-favicon.ts`.
- **Primary action:** `btn btn-primary`. It gets a soft violet lift from a scoped rule, so do not add an
  ad-hoc shadow. Long-running submits (save, create) flip a local `$state` on `onsubmit` to show a
  `loading loading-spinner` and a working label.
- **Empty state:** the cairn mark plus warm, concept-named copy ("No posts yet", "Stack your first one
  and it will show up here") and the create CTA. Not a bare line of text.
- **Dialog:** a native `<dialog class="modal">` with a `modal-box`, an `aria-labelledby` title, a close
  button, and the `method="dialog"` backdrop. `showModal()` gives focus trap and Escape for free.
- **Command palette:** `<dialog>` opened by the topbar trigger or Cmd/Ctrl+K; commands are the nav
  destinations plus View-site and theme, filtered as you type. Built in `AdminLayout.svelte`.

## Chrome and spacing

- The sidebar and topbar form one flat header strip: both `h-16`, `bg-base-100`, the same hairline
  border-bottom, no shadow, so they read as one band across the sidebar seam. The content area is
  `bg-base-200`; panels are `bg-base-100`.
- Align the brand mark, the group eyebrows, and the nav-item icons on one left edge. Keep consistent
  vertical rhythm between groups. The list table drops its Date column below `sm` and stacks its header.

## Icons

Lucide via `@lucide/svelte` (per-icon imports). `admin-icons.ts` is the chrome glyph set; import nav and
content glyphs directly. Conventions in use: signpost = the nav-menu editor (kept distinct from the
Settings gear), gear = Settings, users = Editors, file-text = a content concept, puzzle/blocks =
developer extensions.

## Voice

Friendly-but-professional and plain, following the repo's `writing-voice` standard (no AI tells, no em
dashes, one idea per sentence). Name the concept rather than a generic noun ("No posts yet", not "No
entries"). Lean on the cairn/stacking metaphor where it fits naturally. This applies to button labels,
empty states, hints, and confirmations.

## Adding a new admin surface

Wrap it in a `data-theme` wrapper (or render it inside `AdminLayout`, which already provides one), import
`./cairn-admin.css`, build it from the recipes above (the card, the eyebrow, the type vars, the
theme-adaptive border and shadow), and preview on the showcase. Add component or unit tests for new
behavior and keep `npm run check` 0/0 and `npm test` exit 0.
