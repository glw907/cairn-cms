# Cairn admin design system (agent reference)

The approved reference for the admin's polish grade is
`docs/internal/design/2026-06-12-editor-shell-gold-standard.html` (see the README beside it);
when a judgment call here feels ambiguous, match that artifact. Read this before any work on the
`/admin` interface (`src/lib/components/*.svelte` and
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
  `cairn-admin.css`. One deliberate exception: the `.menu` focus override is unlayered on purpose,
  because DaisyUI's own utilities-layer rule quiets `:focus-visible` on menu items and only an
  unlayered rule outranks it. Do not add another unlayered rule without the same forcing reason.
- **The build flattens CSS nesting before scoping.** `build-admin-css.mjs` runs lightningcss with
  `Features.Nesting` between the Tailwind compile and `postcss-prefix-selector`, because the prefixer
  prepends the scope to the front of every rule and would sever a nested combinator selector
  (`> .drawer-toggle ~ .drawer-side` becoming `:where(scope) > .x`). Do not author nested combinator CSS
  expecting the scoper to handle it; the flatten step is what makes it work, and a test pins it.
- **`@font-face` is added after compile, not in the partial.** The `@import` inlining rebases a `url()`
  against the source tree, so the woff2 url would 404 for a consumer. The `@font-face` rules (the two
  brand faces plus the four iA Writer Mono editor faces) are appended in `build-admin-css.mjs` with an
  output-relative `./fonts/` url; the woff2 files ship in `dist/components/fonts/`. A build test pins
  the urls.
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

Three self-hosted fonts (SIL OFL, in `src/lib/components/fonts/`), wired through vars on the
theme roots, with font-smoothing on. The brand pair is variable; the editor face is four static files.

- Display: `var(--font-display)` = Bricolage Grotesque. Brand wordmark and page `h1` only, so it stays
  an accent and never overbears. Apply as `font-[family-name:var(--font-display)]`.
- Body and UI: `var(--font-body)` = IBM Plex Sans. The default everywhere else, chosen to
  harmonize with the editor face (iA Writer Mono descends from IBM Plex Mono, so chrome and
  manuscript share one superfamily skeleton; Geoff's direction, 2026-06-12).
- Editor writing surface: `var(--font-editor)` = iA Writer Mono, on the CodeMirror `.cm-content` only.
  Chosen 2026-06-12 by the editor-experience pass's font trial over the Monaspace, Courier Prime,
  JetBrains Mono, Intel One Mono, and Atkinson Hyperlegible Mono candidates.

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
  button, and the `method="dialog"` backdrop. `showModal()` gives focus trap and Escape for free. A
  dialog that holds its own `<form>` must mount outside any page-level form: nested forms are invalid
  HTML the parser repairs by dropping the outer tag, which breaks SSR and hydration. `EditPage` mounts
  all its dialogs headless at the bottom and renders plain triggers where they belong.
- **Popover menu:** the small action menus (the edit header's overflow, the toolbar's More formatting)
  are DaisyUI v5 popover dropdowns, never the focus-driven `.dropdown` wrapper, which opens on
  focus-in-transit and ignores Escape. The trigger is a `<button popovertarget="<id>">` with an
  `anchor-name`, carrying `aria-expanded` mirrored from the popover's `toggle` event; the panel is a
  `<ul class="dropdown menu" popover id="<id>">` with the matching `position-anchor`. Escape and light
  dismiss come from the Popover API. A pick runs its action, then `hidePopover()` if still open.
- **Command palette:** `<dialog>` opened by the topbar trigger or Cmd/Ctrl+K; commands are the nav
  destinations plus View-site and theme, filtered as you type. Built in `AdminLayout.svelte`.
- **Sticky edit header (the glass ruler):** `sticky top-16 z-10 bg-base-200/90 backdrop-blur` with an
  always-on `border-b border-[var(--cairn-card-border)]` hairline, bled to the content edges with
  negative margins that mirror the main padding (`-mx-4 lg:-mx-8` against `p-4 lg:p-8`). It is a
  translucent veil the page scrolls beneath, never a second opaque topbar. Left: breadcrumb, an
  `sr-only` h1, the status badges, and the save-state indicator (a small `bg-warning` dot plus
  muted text, fading via `transition-opacity`). Right: the overflow popover menu, then the outline
  Publish, then solid Save, both tied to the form by `form="cairn-edit-form"`. An `sr-only` default
  submit button precedes the header (first form-owned submit in tree order), so Enter in a
  single-line field saves rather than firing the Publish formaction.
- **Editor instrument strip:** one card frame holds the toolbar, the editing surface, and a slim
  footer (word count left, Markdown help right). Ghost `btn-sm btn-square` glyph buttons in groups
  divided by `w-px self-stretch bg-[var(--cairn-card-border)]` hairlines, a More popover menu for the
  low-frequency formats, the host's insert controls through a snippet, and the Write/Preview capsule
  pinned right. The `role="tablist"` wrapper holds only the two tabs (ARIA required children), and
  the capsule is drawn with manual corner rounding (`rounded-r-none`, `rounded-l-none -ml-px`)
  rather than daisyUI's `.join`, so the device trigger can sit beside the tablist instead of inside
  it. Roving tabindex carries keyboard traversal. Formatting and insert controls disable while
  Preview shows.
- **Preview frame:** the Preview tabpanel is a recessed ground (`bg-base-200 px-4 py-6 lg:px-8`)
  holding a centered frame column whose width follows the picked device, eased with
  `transition-[width]` under the reduced-motion guard. Inside the column, the standard floating
  card wraps the sandboxed iframe, and a right-aligned eyebrow caption names the device and its
  width for any non-desktop pick. A device trigger reads as the capsule's third segment but sits
  after the tablist wrapper (a plain button, never a tab). It opens the standard popover list of
  widths: plain buttons carrying `aria-pressed` and the check glyph, each naming its width
  ("Tablet · 768 px"), never the ARIA menu pattern. The pick persists under
  `cairn-editor-preview-device`. While Preview shows, the sidebar hides so the document proofs at
  the full content width.
- **Document title input:** when the adapter defines a `title` field it renders above the editor
  card as `cairn-doc-title`: `text-3xl font-bold tracking-tight` in the display face, borderless on
  the recessed background. This input is the page's visible h1 (the header h1 is `sr-only`), which
  is why the toolbar offers only H2/H3.
- **Editor: the quiet writing surface (0.52.0).** The manuscript carries the page; everything
  else recedes. The face is self-hosted iA Writer Mono via `--font-editor` at 1rem on a centered
  `70ch` measure. Heading sizes step by level (`tags.heading1/2/3` at 1.5/1.3/1.17em) in
  `base-content`, never primary. Every syntax marker (`##`, `**`, `>`, list marks, link brackets,
  URLs) drops to `--color-muted`; quote and struck *text* keep full content ink (muted means
  machinery, never content). Inline code sits on a `--cairn-code-chip` background in content ink.
  Links keep the page's one accent. The `HighlightStyle` rule ORDER in `editor-highlight.ts` is
  load-bearing: later rules win ties on mark spans, so `processingInstruction` stays last.
- **Editor: the directive grammar (rails, never bands).** Identity lives in a left rail plus a
  labeled head, never painted rows. A directive line at depth N stacks all rails 1..N as inset
  bars at 2/6/10px offsets (with `base-100` spacer layers), so a container reads as one bracketed
  region and nesting reads as nested brackets. Fence machinery (colon runs, `[` `]`, `{attrs}`)
  is marker-muted; the name and label carry depth-stepped accent inks
  (`--cairn-directive-ink-2/3`). The caret's innermost container steps up one notch
  (`--cairn-directive-rail-active`/`--cairn-directive-ink-active`, plus a 1px rail-width step);
  rails step alpha through `--cairn-directive-rail-1/2/3` with every bar holding 3:1 non-text on
  `base-100` (the locked floors sit beside the vars in `cairn-admin.css`). Directive lines carry
  a plain-language `title` tooltip and a constant left gutter. Depth and roles come from one
  cached scan in `markdown-directives.ts` (`fenceScan`), which pairs a bare closer with the most
  recent named opener and disowns fence-shaped lines inside code blocks.
- **Editor: the surface postures and the footer strip.** The editor card's footer is the
  writing-environment strip (the top toolbar acts on the text; the bottom carries how you are
  writing): word count left, then the posture pair, the writing-mode toggles, a hairline, and
  Markdown help, all ghost `btn-xs` with `aria-pressed` and the `bg-primary/10 text-primary`
  pressed pair. The postures: Prose (default) is the writing instrument, a 72ch measure centered
  in a 49rem card at a 1.0625rem type step and 1.9 leading; Markup is the working surface, a
  56rem card the text fills at 1rem/1.8 for tables, attributed directives, and long URLs. The
  posture persists as `cairn-editor-surface`; the card cap and the title wrapper follow it.
- **Editor: the writing modes.** Focus mode dims non-caret paragraphs to `--cairn-focus-dim-ink`,
  a DELIBERATE sub-AA transient-state call (~3:1 floor, user-toggled, one activation from full
  contrast; G174 is the conformance shape) that also flattens chip backgrounds on dimmed lines
  AND eases the rails and the document title back with the field. Typewriter scroll recenters
  via an instant `scrollIntoView`, so no reduced-motion gate is owed. Both persist per browser
  (`cairn-editor-focus-mode`, `cairn-editor-typewriter`) as visible `aria-pressed` toggles in
  the footer strip (never `menuitemcheckbox` in the More popover; that list is deliberately not
  an ARIA menu).
- Light `--color-accent` is a locked margin at `oklch(54% 0.16 300)`: it must hold AA both on
  `base-100` and on its own 8% tint (the leaf/inline directive chips). The editor's focus indicator is a deliberate 1px 70%-alpha primary hairline, never a 2px
  ring: a focused text surface sits in keyboard modality, so `:focus-visible` cannot quiet it. That
  70% mix is a locked floor: it clears the 3:1 non-text contrast minimum on both themes, where 45%
  measured near 2:1. A scoped `.cairn-doc-title:focus` rule in `cairn-admin.css` gives the document
  title input the same hairline.

## Chrome and spacing

- The sidebar and topbar form one flat header strip: both `h-16` (the topbar PINNED with
  `h-16 min-h-16 py-0`, since a content-driven navbar drifts with font metrics and the two
  border-bottoms stop meeting at the seam), `bg-base-100`, the same hairline border-bottom, no
  shadow, so they read as one band across the sidebar seam. The nav sidebar is `w-56`; the
  chrome cedes width to the editor (the edit page's details column is `17rem` behind a `gap-10`
  gutter, its card hairline-only with no shadow, so the editor is the page's one floating
  object). The content area is
  `bg-base-200`; panels are `bg-base-100`.
- Align the brand mark, the group eyebrows, and the nav-item icons on one left edge. Keep consistent
  vertical rhythm between groups. The list table drops its Date column below `sm` and stacks its header.

## Icons

Lucide via `@lucide/svelte` (per-icon imports). `admin-icons.ts` is the chrome glyph set; import nav and
content glyphs directly. Conventions in use: signpost = the nav-menu editor (kept distinct from the
Settings gear), gear = Settings, users = Editors, file-text = a content concept, puzzle/blocks =
developer extensions.

## Voice

The copy is part of the brand, held to the same bar as the visuals. Editors read these strings on
every screen, so a single AI-flavored line cheapens the whole admin. Treat every user-facing string as
brand prose, not filler.

The standard is the repo's `writing-voice` standard, applied to UI copy:

- Plain and friendly-but-professional. No marketing gloss.
- One idea per sentence. Short sentences are good. A two-sentence hint beats one clause-stacked line.
- No AI tells: no em dashes, no "not X, but Y" frame, no tacked-on closer ("No password to remember."),
  no reflexive three-item lists.
- Name the concept, not a generic noun ("No posts yet", not "No entries").
- Lean on the cairn/stacking metaphor where it fits naturally, never forced.

This covers button labels, headings, empty states, hints, confirmations, and the standalone pages the
engine serves outside the components (the guard's HTTPS-required page in `https-required-page.ts`).

The component copy ships compiled inside the published package, so a consuming site's `prose-guard` hook
never sees it. It is guarded here instead by `npm run check:prose` (`scripts/check-admin-prose.mjs`),
which extracts the user-facing strings from `src/lib/components/*.svelte` and runs the blocking tells
from the `writing-voice` standard over them. It runs in CI alongside the other `check:*` gates. The
mechanical rules catch the lexical and structural class (marketing words, banned phrases, the
antithesis frame, and the like); they cannot catch a judgment-level tell such as a tacked-on closer, so
run `node scripts/check-admin-prose.mjs --list` for a release-time read of all admin copy at once. The
non-component surfaces (the standalone pages) sit outside that gate, so read them by hand against this
same bar.

## Adding a new admin surface

Wrap it in a `data-theme` wrapper (or render it inside `AdminLayout`, which already provides one), import
`./cairn-admin.css`, build it from the recipes above (the card, the eyebrow, the type vars, the
theme-adaptive border and shadow), and preview on the showcase. Add component or unit tests for new
behavior and keep `npm run check` 0/0 and `npm test` exit 0.
