# Cairn admin design system (agent reference)

The polish bar is the live admin components rendered on the showcase, not a static file: they are the
most-recent version by construction and authored in the real DaisyUI/Tailwind utility classes, so a hand
twin can never represent them faithfully (the old `2026-06-12-editor-shell-gold-standard.html` is a
superseded historical record). When a judgment call here feels ambiguous, match the live components and
the recipes below. The design README beside that file has the capture recipe for the bar and the rule for
mockups (a new screen with no component yet gets a utility-class HTML mockup, built with
`npm run design:mockup-css`, never hand-rolled token CSS). Read this before any work on the
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
- **A bare button needs the scoped reset, or it shows UA chrome.** The admin omits global Preflight
  (it would reset the host site's elements), so a `<button>` styled with utilities instead of DaisyUI's
  `.btn` keeps the native outset border and gray fill. One scoped rule in `cairn-admin.css`
  (`:where([data-theme...]) button:not(.btn)`) levels every bare admin button to a flat baseline;
  a utility (a `bg-*`, a `border-l` divider) still opts a control back into a fill or border. Use
  `.btn` for a real button, or rely on the reset and add only the utilities the control needs. This
  was a real shipped blemish on the footer toggles and the list's sort headers.

## The context model: office and desk

The admin runs two contexts, and each gets the chrome that serves it. **List and settings pages are
the office**: the persistent sidebar and the full topbar, for moving between content and managing it.
**An open document is the desk**: the editor takes the shell, and the surrounding chrome recedes so
the manuscript is the page. A route is a desk route when its path has three segments
(`/admin/<concept>/<id>`); `AdminLayout` derives this as `isDeskRoute`.

Three rules carry the model:

- **One header band on a desk route.** A desk route renders exactly one header band, the 64px topbar.
  The edit page owns no header of its own; it feeds its controls (status, save-state, Details,
  overflow, Publish, Save) up into the topbar through a context portal (`topbar-context.ts`:
  `AdminLayout` holds a `$state` holder, `EditPage` registers a `desk` snippet into it in an `$effect`
  and clears it on teardown). The band reads as three clusters, not a uniform row: the way back (drawer
  toggle, breadcrumb), the document status behind a hairline, and the actions split by a second
  hairline into the quiet pair (Details, overflow) and the lifecycle pair (Publish, Save).
- **The chrome recedes, the way out stays.** On a desk route the nav drawer opens closed (the
  `lg:drawer-open` class is conditional on `!isDeskRoute`, resolved at SSR so it never flashes), the
  details fields move behind a slide-over panel, and zen fades the band entirely. Through all of it the
  way back and the save state never disappear: the breadcrumb is the exit, and zen keeps a floating
  chip carrying the save state and an Exit control. This is the one rule WordPress and Ghost both hold
  even at their most minimal.
- **Presentation only.** The context model is layout. The same one form, the same actions, the same
  loads; `CairnAdmin`'s view switching is untouched. A consumer site sees only the new chrome.

## Tokens (Warm Stone)

Defined per theme root in `cairn-admin.css`: `[data-theme='cairn-admin']` (light) and
`[data-theme='cairn-admin-dark']` (dark). Same hues across both (warm 75, violet 293 primary).

- Surfaces: `base-100` is the panel surface (sidebar, topbar, cards); `base-200` is the app background
  (the content area, recessed); `base-300` is for incidental borders and chips. `base-content` is text.
- Accent: `primary` is the violet (light `oklch(52% 0.2 293)`, dark `oklch(68% 0.18 293)`). Use it for
  the active state, the primary action, links-on-hover, the brand. `primary-content` reverses out on it.
- Secondary text: `--color-muted` (labels, dates, hints) and `--color-subtle` (nav item text). Subtle is
  the stronger of the two. Reference them through the named role utilities `text-muted` / `text-subtle`,
  never an arbitrary bracket wrapper. The utilities are defined in `scripts/admin-css.input.css` and are
  the frozen role interface; they resolve to the two vars. A standing test (`admin-css-build.test.ts`)
  keeps them compiled and pointing at their vars, so the admin markup writes the utility, not the token.
- Radii: `--radius-field: 0.625rem` (inputs, buttons, badges), `--radius-box: 1rem` (cards, modals).
- Elevation: `--cairn-shadow` (soft layered shadow) and `--cairn-card-border` (the theme-adaptive
  hairline). Both are set per theme root.
- The dark active-nav pair (`text-primary` on `bg-primary/10`) sits at ~4.5:1, near the floor. Do not
  lower dark `--color-primary` lightness or the `/10` opacity without re-checking contrast.
- `--cairn-warning-ink` is the on-surface warning TEXT ink, distinct from `--color-warning`, which is
  a FILL tone. The fill tone fails 4.5:1 as small text on a light surface (about 2.2:1), so a warning
  word or glyph drawn on `base-100` uses this token instead. Light is `oklch(50% 0.13 70)` (5.98:1 on
  base-100, 5.59:1 on the 8% accent chip tint); dark is `oklch(80% 0.14 70)` (8.61:1 and 6.20:1). The
  needs-alt markers use it: the picker's needs-alt label and the `.cm-cairn-media-needs-alt` rule in
  the editor's media chip. Reference it as `text-[var(--cairn-warning-ink)]`.
- `--color-positive-ink` is the green counterpart, the on-surface confirming TEXT ink for a positive
  status word on `base-100`. Light is `oklch(48% 0.12 150)` (~4.9:1 on base-100); dark is
  `oklch(78% 0.12 150)` (~7:1). The hero field's "Described" alt-status chip uses it. Reference it as
  `text-[var(--color-positive-ink)]`. It is a defined token, not a mockup-only color; a chip that
  references an undefined custom property falls back to body ink with no gate to catch it.

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
  `text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted`.
- Nav item: `text-sm` (the lists use `menu-sm`), `font-medium` inactive, `font-semibold` active.
- Brand wordmark: `text-xl font-bold tracking-[-0.01em] font-[family-name:var(--font-display)]`.

## Component recipes

- **Floating card:** `rounded-box border border-[var(--cairn-card-border)] bg-base-100 shadow-[var(--cairn-shadow)]`.
  Use for the list table, the editor panes, the auth card. Do not use a flat `base-300` border.
- **Active nav item:** `bg-primary/10 font-semibold text-primary` plus `aria-current="page"`; inactive is
  `font-medium text-subtle`.
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
  and it will show up here") and the create CTA. Not a bare line of text. When a whole concept is empty
  (the office list with no entries), the state drops the list card and centers on the content area so a
  first-run office reads as composed, not as a small box hugging the top of a tall page.
- **Office list (the concept list view):** `ConceptList` extends the desk's grade. Above the table a
  triage bar filters by publish state in the segmented check-and-tint grammar (see that recipe below):
  a pick-one partition (All, Pending edits, Published) and a separate orthogonal Hidden toggle, each
  carrying a live count from the loaded set. The axes are independent, so a published-but-hidden entry
  counts in both Published and Hidden, and the Hidden toggle composes with whichever partition is
  active. Filtering, counts, and search all run client-side over the already-loaded entries. The rows
  are an enriched sortable `<table>` (the title with a muted summary line beneath it, then the date,
  the status badge, and the always-visible delete), so each row describes itself instead of being a
  bare title. The summary line is `EntrySummary.summary` (from `deriveExcerpt`: the frontmatter
  description, else a body excerpt), truncated at the column edge and omitted when null. The Edited
  badge tints primary (`bg-primary/10 text-primary`) as the one state to act on, rhyming with the
  topbar's "Publish site (N)"; New stays `badge-info`, Published `badge-ghost`. Hidden is a row
  treatment, not a fourth badge: the row de-emphasizes (~0.62 opacity on title and summary) and carries
  an eye-off "Hidden" tag by the title, leaving the status cell to one publish-state badge. A quiet
  trailing "New {concept}" row at the foot of the card opens the create dialog, so a short list always
  shows its next step. A filter or search that matches nothing keeps the card and offers a Clear action;
  a concept with no entries at all uses the page-owning empty state above.
- **Dialog:** a native `<dialog class="modal">` with a `modal-box`, an `aria-labelledby` title, a close
  button, and the `method="dialog"` backdrop. `showModal()` gives focus trap and Escape for free. A
  dialog that holds its own `<form>` must mount outside any page-level form: nested forms are invalid
  HTML the parser repairs by dropping the outer tag, which breaks SSR and hydration. `EditPage` mounts
  all its dialogs headless at the bottom and renders plain triggers where they belong.
- **Dialog sizing (governs every modal, the picker and palette included):** a modal never fills the
  viewport on a normal screen. The `modal-box` sizes to its content under a cap
  (`max-height: min(content, 85vh)`, with a `max-width` on the content scale) so the backdrop frames it
  above and below and the surface reads as an overlay over the author's work, not a page takeover. The
  box is the scroll container: its own header and footer hold while the body scrolls, never the page
  behind it. Filling the height is correct in exactly one place, the small viewport: below the narrow
  breakpoint a dialog may become a full-height or bottom sheet. Light dismiss on the backdrop is for a
  non-destructive dialog; a destructive `alertdialog` keeps an explicit confirm and does not
  light-dismiss.
- **Component insert picker:** `ComponentInsertDialog` is a two-step dialog. Step one is the catalog:
  a single-column list grouped under eyebrow headings by the component's `group`, in declaration
  order, each row a glyph (the component's `icon`), the label, the description, and the intended-use
  line. A search input appears above the list only past eight components, with focus on open, an
  `aria-live` count, and a no-match state in the office voice. Step two is the configure form. It
  opens two panes, the form left and a live preview right, only when the picked component declares a
  `preview` and the host passes a `render`; otherwise it stays one column. The preview renders the
  serialized directive through the adapter `render` into a sandboxed `<iframe srcdoc>` from
  `buildPreviewDoc`, the same path the edit-page preview uses, debounced with a latest-wins counter so
  it settles rather than re-rendering each keystroke. It carries three honest states and never
  fabricates a finished block: a settle cue (a visual chip, never a live region, so it does not
  announce on every edit), an incomplete skeleton that calls out each empty required region while
  Insert stays disabled, and a render-failed surface that keeps the form. Required fields carry an
  asterisk and `aria-required` and gate Insert with an inline `role="alert"` message; repeatable rows
  take their label from the slot's `itemLabel`, falling back to `${label} ${i + 1}`. Back lives in the
  dialog header beside the eyebrow breadcrumb, one step to the catalog; the modal collapses to one
  column on a narrow screen. The toolbar also carries an **Edit block** control beside Insert block:
  it opens a component already placed in the document back into the same form (the header reads
  "Edit", the button "Update"), enabled only when the caret sits in a component whose guided edit is
  provably lossless (the `componentRoundTripSafety` gate); a block the form cannot round-trip is left
  for hand-editing, never silently rewritten. Edit mode skips the catalog and has no Back; Update
  replaces the block's source range in place.
- **Popover menu:** the small action menus (the edit header's overflow, the toolbar's More formatting)
  are DaisyUI v5 popover dropdowns, never the focus-driven `.dropdown` wrapper, which opens on
  focus-in-transit and ignores Escape. The trigger is a `<button popovertarget="<id>">` with an
  `anchor-name`, carrying `aria-expanded` mirrored from the popover's `toggle` event; the panel is a
  `<ul class="dropdown menu" popover id="<id>">` with the matching `position-anchor`. Escape and light
  dismiss come from the Popover API. A pick runs its action, then `hidePopover()` if still open.
- **Command palette:** `<dialog>` opened by the topbar trigger or Cmd/Ctrl+K; commands are the nav
  destinations plus View-site and theme, filtered as you type. Built in `AdminLayout.svelte`.
- **The desk band (the edit route's one header):** the edit page has no header of its own; it fills the
  topbar through the context portal (see the context model above). The `desk` snippet supplies the
  status cluster (the status badge, a `Hidden` badge when `draft`, the save-state with a `bg-warning`
  dot fading via `transition-opacity`) and the actions cluster (an `sr-only` default submit button
  FIRST, then Details, the overflow popover, a hairline, outline Publish, solid Save), all tied to the
  form by `form="cairn-edit-form"`. The `sr-only` default submit must stay first in the actions cluster:
  the band precedes the form, so it is the first form-owned submit in tree order, which keeps Enter in a
  single-line field saving rather than firing the Publish formaction. On a desk route `AdminLayout`
  drops its own palette trigger and the site-wide Publish, so the band has one job.
- **The details slide-over panel:** the frontmatter fields live in a right slide-over (`role="region"`,
  `aria-label="Entry details"`), opened by the band's Details trigger and `Ctrl+.`. It stays physically
  inside the edit form and toggles with the `hidden` attribute, so a closed panel is out of the a11y
  tree and tab order while its `display:none` fields still submit (the uncontrolled-field guarantee).
  Focus moves to the close button on open and returns to the trigger on close; Escape closes it. The
  panel header carries the `Details` eyebrow; the first fieldset's legend is `sr-only` so the eyebrow
  shows once. The capture-phase `invalid` handler opens the panel when an invalid control lives in it.
- **Zen:** a footer toggle (and `Ctrl+Shift+.`) fades the chrome to leave the manuscript alone on the
  recessed ground. It is a `localStorage` preference (`cairn-editor-zen`), and it composes with focus
  mode and the postures. The band disappears through the context holder's `zen` flag (`AdminLayout`
  drops the whole topbar), and a floating `.cairn-zen-chip` keeps the two things that never vanish: the
  live save state and an Exit control with the `Esc` hint. Escape exits zen, after closing the details
  panel if it is open. Entering zen moves focus into the editor if the focused control hid.
- **Segmented control and check-and-tint toggle:** a pick-one control is one bordered group (the shared
  border carries the semantics) whose segments are borderless and whose active segment tints
  (`bg-primary/10 text-primary`) and shows a check glyph; the check is the non-color state cue (WCAG
  1.4.1). A standalone on/off toggle (focus mode, typewriter, zen) is borderless and transparent until
  hover, tinting and check-marking when `aria-pressed`. A reference link (Markdown help) is a borderless
  underlined button, not a control. The editor footer uses all three; no group labels (the segmented
  border carries pick-one).
- **Container fold affordance:** a directive container folds from the rail band. One chevron replaces
  the container's innermost rail bar on the opener row (down while the caret is inside, right while
  folded, fading in on rail-band hover), and the whole 28px gutter band on that row is the click target;
  the opener text never folds. A folded row carries a square full-row accent wash (~7%) and a focusable
  `N lines` pill (`aria-label="Show N hidden lines"`). Ranges come only from `fenceScan`'s paired
  containers, so a half-typed fence never folds; any edit or selection touching a folded range unfolds
  it in the same transaction. Fold state is session-local, never persisted. Driven by
  `@codemirror/language` folding in `editor-folding.ts`.
- **Editor instrument strip:** one card frame holds the toolbar, the editing surface, and the footer
  environment strip (word count left; the posture segmented control, the focus/typewriter/zen toggles,
  and the Markdown help link right). Ghost `btn-sm btn-square` glyph buttons in groups
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
- **Media: the at-caret insert popover (`MediaInsertPopover`).** This is the one sanctioned exception
  to the Dialog recipe. Where every other modal is a centered `<dialog>`, the image insert surface is
  an anchored popover positioned at the CodeMirror caret, so an editor names and describes an image
  without leaving the line they are on. It is still a real modal in the a11y sense: a
  `role="dialog" aria-modal="true"` container with a manual Tab focus trap (no native `<dialog>` to
  give it for free), Escape and a backdrop click that dismiss it and restore focus to the editor, and
  `var(--cairn-shadow)` for the lift. The modal-sizing rule still binds it, so below the narrow
  breakpoint it drops the caret anchor and becomes a full-height bottom sheet. It routes by the signal
  that opened it: a paste or a drag opens straight on the capture card with the dropped file, while
  the toolbar button opens the chooser (upload first, the picker below it).
- **Media: the source chip and the optimistic placeholder (editor decorations).** Like the directive
  rails and the fold gutter, these live in the `MarkdownEditor` `EditorView.theme`, not in the
  document text. A resolved `media:` reference token renders as an atomic accent chip carrying the
  thumbnail, the display name, and a needs-alt marker (the `.cm-cairn-media-needs-alt` rule, in
  `--cairn-warning-ink`) when the alt text is still missing. An upload still in flight shows a
  widget-only placeholder, a thumbnail beside a determinate `<progress>`, that never writes any text
  into the document until the upload resolves. The doc only ever holds the final `media:` token, so a
  failed or abandoned upload leaves no orphaned text behind.
- **Media: the combobox picker (`MediaPicker`).** The reuse surface is a WAI-ARIA combobox over a
  listbox. Focus stays in the text input and `aria-activedescendant` tracks the highlighted option;
  the listbox is always rendered (never built on first keystroke) so the relationship is stable for
  AT. Two separate live regions carry the result count and the selection announcement, since one
  region cannot voice both without clobbering itself. A type-facet seam filters by media type but
  stays hidden while a site has only one type, so it does not show an empty control. The needs-alt
  label on a result uses `text-[var(--cairn-warning-ink)]`.
- **Media: the capture card (`MediaCaptureCard`).** The card where an editor names and describes a
  newly added image. Its submit is never disabled: alt text is treated as debt, not a gate, so an
  editor can insert now and add the description later (the needs-alt notice tracks the gap). The alt
  choice is a radiogroup (describe it, or mark it decorative), and the name pre-fills from the
  filename. Because an async insert can unmount the focused submit and drop focus to `<body>`, focus
  moves deliberately to the next state's primary control through an `$effect` keyed on the status
  discriminant plus `tick()`.
- **Media: the needs-alt publish notice (EditPage).** A non-blocking notice that surfaces images
  inserted without alt text. It is an always-present `role="status"` region (rendered unconditionally
  so it can announce when it fills, the live-region rule), holding a warning glyph, a count, and a
  jump-to-each control. It is modeled on the broken-link banner but is a warning, never a block: it
  never stops a save or a Publish. It tells the editor about the gap and helps them close it, and
  leaves the decision with them.
- **Media: the figure control (`MediaFigureControl`).** The form that gives an inline image a caption
  and a placement. It is the persistent Edit-block pattern: a toolbar Figure button, always rendered,
  enabled only when the caret sits on a media image (bare or already in a `:::figure`), opening a
  headless dialog over a caret snapshot so a later caret move never re-targets it. The unavailable
  button uses `aria-disabled` (not the native `disabled`) with a stateful `aria-label`, dimmed with
  `opacity`/`cursor` utilities rather than `.btn-disabled` (which sets `pointer-events: none` and would
  kill the title tooltip). DaisyUI 5.6 added `[aria-disabled="true"]` to the `.btn` disabled selector
  with the same `pointer-events: none`, so a guarded button that must keep its tooltip carries the
  `cairn-btn-guarded` marker; an unlayered rule in `cairn-admin.css` restores `pointer-events` for it
  (the click handler already guards inertness). The form carries a caption field (with the hint that the caption is shown to
  everyone and is not the alt text), an alt-status row that names the image's alt state distinct from
  the caption, and the placement as the segmented check-and-tint recipe rendered as a roving-tabindex
  radiogroup (Measure, Center, Wide, Full; Measure is the null role). The decorative-plus-caption
  warning sits in an always-present `role="status"` live region in `--cairn-warning-ink`, so it
  announces when an author makes the contradiction. The control writes markdown source only; the
  preview stays read-only.
- **Media: the figure role pill on the source chip.** When a `media:` token sits inside a `:::figure`,
  the source chip carries a small role pill (the role name, or `figure` for the measure default) in the
  directive accent language (the accent ink, a `color-mix` accent border, the body font at `0.625rem`),
  so the visible decoration agrees with the source (the no-hidden-state rule). A bare token shows no
  pill. The pill is `aria-hidden` like the rest of the chip; the `{.wide}` in the source is the
  AT-readable truth. The accent ink holds AA as small text on `base-100` in both themes (5.28:1 light,
  5.86:1 dark).
- **Media: the placement default CSS (`.cairn-place-*`).** cairn defines the figure placement class
  contract; a site owns the pixels. The reference values live in the showcase
  (`examples/showcase/src/lib/site.css`): the bare `figure` at the text measure, `.cairn-place-center`
  a below-measure centered image, `.cairn-place-wide` a viewport-centered breakout past the measure,
  and `.cairn-place-full` a full-bleed image with its `figcaption` returned to the measure. A site
  copies and restyles those classes. This is content CSS, not admin chrome, so it lives with the site's
  rendered-content stylesheet, not in `cairn-admin.css`.
- **Media: the hero field (`MediaHeroField`).** The persistent details-panel field that sets a
  concept's frontmatter hero. At rest, when a hero is set, it is one row at sibling weight: the
  resolved thumbnail, the display name, an alt-status chip, and an Edit control, with the caption
  shown beneath as a read-only italic preview. The alt-status chip is glyph-plus-label, never hue
  alone: Described in `--color-positive-ink`, Needs alt in `--cairn-warning-ink`, Decorative in
  `--color-muted`. Empty, the field is a slim labeled dropzone (hover and focus-visible states, real
  drag-and-drop) plus one plain unify line stating the image is also the social card. Edit or Add
  opens a native `<dialog class="modal">` (the Dialog recipe) holding the chooser (an upload button
  and the `MediaPicker` combobox) and, after a pick or upload, the placement view: a 16:9 crop
  preview, the describe-or-decorative alt radiogroup, the caption field, and Replace/Remove as quiet
  text controls beneath the preview. Two load-bearing constraints, both from the field rendering
  inside the edit `<form>`: it carries no `<form>` of its own (the dialog's working inputs are
  name-less and never submit; the committed value rides three named hidden inputs the decode arm
  reads), and the alt radios share a component-unique `name` so native arrow-key navigation works
  while staying out of the three decoded sub-fields. It reuses `MediaPicker` directly and replicates
  `MediaCaptureCard`'s alt model rather than mounting it (that card holds its own `<form>`, illegal
  nested here, and a Name field a hero does not use). Alt is debt: confirm is never disabled for a
  missing alt, and the needs-alt notice counts a hero with an empty alt and focuses its alt input.
- **Media: the Library screen (`CairnMediaLibrary`).** The admin Media Library, a first-class office
  view at `/admin/media`, a peer of Posts and Pages. It composes from the established office parts: the
  office header recipe up top (the Media eyebrow, the display-face "Media library" heading, a live
  count, the Upload primary action), one toolbar row (search left, the triage segmented control, a
  hidden type facet, the grid/list density toggle), then the asset surface. The resting surface is a
  contact-sheet grid (`role="listbox"`) of image tiles; the density toggle flips it to the enriched
  sortable table the office list uses. Activating a tile or row opens the detail in a non-modal
  slide-over (the details-slide-over recipe), which carries the preview, the name and `media:`
  reference, the alt editor, the grouped where-used list, the metadata, and the actions. Delete opens a
  two-faced safe-delete `alertdialog`. The screen and the 2b picker share the row vocabulary but keep
  different ARIA models on purpose (the picker is a combobox, this grid is a roving listbox).
  Load-bearing a11y patterns:
  - **Roving tabindex on the grid.** One tabstop for the whole listbox: the active tile carries
    `tabindex="0"` and every other carries `-1`; arrows move the active index, Home/End jump, Space or
    Enter opens the detail, and `aria-selected` tracks the open asset. Filtering preserves a valid
    active index.
  - **The triage is a true radiogroup, not a toggle group.** `role="radiogroup"` over `role="radio"`
    segments with `aria-checked` (never `aria-pressed`), the same roving-tabindex keyboard model the
    ARIA radio pattern owes (the selected radio is the only tabstop, arrows move and select). The
    selected segment shows a check glyph so hue is not the only state cue (WCAG 1.4.1).
  - **The list sorts through real header buttons.** The Added column header is a `<button>` inside a
    `<th>` carrying `aria-sort`, never a div with a click handler.
  - **The slide-over is a non-modal region.** `role="region"` with an `aria-label`, no scrim, so the
    grid stays in the a11y tree and the tab order. Focus moves into the panel on open and returns to the
    originating tile or row on close, and a window Escape listener closes it (the EditPage
    details-panel recipe). It never traps focus or inerts the list.
  - **The safe-delete is a modal alertdialog with no light dismiss.** A native `<dialog>` opened with
    `showModal()` (native focus trap and Escape), `role="alertdialog"`, and no `method="dialog"`
    backdrop, so a stray backdrop click cannot dismiss a destructive surface. The in-use face names the
    breaking entries (grouped published-then-branch) and gates Delete behind a type-the-slug
    confirmation (`confirmMatches`), the one legitimate disabled submit, a visible typed confirmation
    rather than a hidden requirement. The orphan face is a calm confirm. A server refusal forces the
    dialog back to the in-use face with the fresh list.

  Alt-status ink tokens (each glyph-plus-label, never hue alone): Described is `--color-positive-ink`,
  Needs alt is `--cairn-warning-ink`, and the safe-delete danger surface uses the `--cairn-error-*`
  family (`--cairn-error-ink` for the "these would break" label and the danger Delete text,
  `--cairn-error-tint` for the break-list surface, `--cairn-error-border` for the tint hairline and the
  type-to-confirm input). The error ink is the readable small-text counterpart to `--color-error`,
  which is tuned as a button fill and fails AA as small text; the locked contrast floors sit beside the
  token in `cairn-admin.css`.
- **Tidy: the review-mode step-in diff (`TidyReview`).** The tidy copy-edit's review surface, a native
  `<dialog class="modal">` opened with `showModal()`, so the focus trap, Escape, and inert background
  come from the platform (the Dialog recipe). It opens only when tidy returns changes: a no-op shows a
  quiet "Nothing to fix" and never opens an empty review, and a validation rejection shows the honest
  message and opens nothing. While it is open the editor underneath is read-only, and the author's
  original buffer text is never touched until Apply.
  - **The diff run vocabulary.** Each change is one hunk in a unified-diff idiom: a deletion row gutter
    `&minus;` over the struck original text, an insertion row gutter `+` over the proposed text, and one
    unchanged context row above and below. Color rides a glyph, never hue alone: a deletion is
    `--cairn-error-ink` (reserved exclusively for tidy deletions) struck through with `line-through`, and
    an insertion is `--color-positive-ink` (the locked insertion-and-addition token, note it is
    `--color-positive-ink`, NOT the nonexistent `--cairn-positive-ink`). The two tokens are a locked
    pair, so a tidy deletion and a spellcheck underline (amber `--cairn-warning-ink`) are never the same
    color.
  - **The safety-ranked hunk treatment (decision 9).** Objective hunks (Spelling, Doubled word,
    Whitespace, Punctuation) read quiet, open pre-kept, and are swept by Accept fixes. A judgment hunk
    (a declared style normalization, a grammar reword) carries the review-this treatment: a
    `--cairn-warning-ink` left edge (an inset shadow rail) and a faint warm wash on the head
    (`color-mix` of the warning ink), opens undecided, and is NOT swept by Accept fixes until confirmed.
    The category is inferred locally from the diff, never a model claim, and a normalization carries a
    mandatory because-line computed from the convention config alone (a hunk with no computable rationale
    is not offered). The same in-buffer decorations render through the `editor-tidy.ts` apply seam:
    insertions as content-bearing mark decorations in `--color-positive-ink`, deletions as
    strike-through over the original run in `--cairn-error-ink`.
  - **The two live regions (the MediaPicker discipline).** One `role="status"` region carries the bulk
    tally (kept / to review / skipping), updated only on a bulk action and debounced; a second
    `aria-live="polite"` region narrates the single last per-hunk action. Keyboard step-through is
    `j`/`k` (or `n`/`p`) to move and `a`/`r` to accept or reject the focused hunk.
  - **Apply is one batched transaction.** Per-hunk Accept/Reject and the bulk Accept fixes / Reject all
    only set disposition in the component's own state; nothing writes until Apply, which collects the
    kept indexes into one `acceptMany`, a single undoable step (the session "Undo tidy"). An undecided
    judgment hunk is never in the kept set. Cancel closes and writes nothing.
- **The tidy settings screen reuses the shipped primitives, no new control.** The two-tier convention
  screen (`CairnTidySettings`) renders each on/off convention as the shipped check-and-tint
  `aria-pressed` button (the Segmented control and check-and-tint recipe), and each variant chooser as
  the shipped pick-one (`role="radiogroup"` over `role="radio"` with `aria-checked`, roving tabindex,
  the check glyph as the non-color cue, the same handler the Media Library triage uses). It adds no
  DaisyUI `.toggle` and no new primitive. The truthful visibility gate is the load-bearing rule: when
  tidy is not enabled (or the key is absent), the editor-tier convention section is ABSENT, not shown
  disabled, replaced by a `role="region"` gate note with a read-only "what your developer needs to do"
  checklist; no convention control sits in the tab order. The developer tier (the master switch, the
  key presence, the model) is read-only, and the API key value never leaves the server.

### Help surfaces

- **A help or reference panel is a non-modal `role="region"` with an `aria-label`, no scrim.** It
  reuses the details-slide-over geometry (`top:64px; right:0; bottom:0`, `19rem`, hairline-plus-shadow,
  on `base-200`). Focus moves in on open and back to the trigger on close; a window Escape closes it;
  it leaves the a11y tree and the tab order via the `hidden` attribute when closed. Only a destructive
  or commit surface is a modal `<dialog>`. A help cheat sheet is not destructive, so it is non-modal.
- **The right slide-over region holds one panel at a time.** Help and the Details panel claim the same
  slot, so opening one closes the other. State this so two right panels never stack.
- **The disclosure button for a slide-over** mirrors `aria-expanded` from open state and carries a
  visible text label at its primary home. The two surface types take different attributes: a trigger
  that opens a modal `<dialog>` carries `aria-haspopup="dialog"`; a trigger for the non-modal
  `role="region"` panel carries `aria-controls` pointing at the region and no `aria-haspopup`, because
  `aria-haspopup="dialog"` would promise a dialog the region is not. A bare glyph is allowed only for a
  secondary, contextual instance, never as the sole standing trigger.
- **The getting-started progress recipe** borrows the check-and-tint look and the
  `--color-positive-ink` token for a short checklist, each item glyph-backed when done (never color
  alone, WCAG 1.4.1). The authoritative count lives in real adjacent text ("2 of 4 done"); the visual
  bar is a decorative, non-focusable, non-interactive element marked `role="presentation"`. A focusable
  or interactive node drops `role="presentation"` under the ARIA conflict rules, so echo the segmented
  control's look on an inert element rather than reusing the interactive control as the bar. Steps
  derive from observable content and publish state, so the recipe shows a real count, never a stored
  one.
- **The empty-state recipe gains an optional starter-content slot:** beside the create CTA, a site may
  surface labeled, openable starter entries. The label marks them as starters so they read as
  removable, not as the author's own work.
- **The Help home recipe** (`HelpHome.svelte`) is one calm column inside `AdminLayout`: a masthead (a
  plain eyebrow over a real-sentence h1, the page's single Bricolage display beat), then three co-equal
  eyebrow-plus-display sections, getting started, formatting, and get help. The cadence carries the
  equality (one section icon per section would break it), not a per-section accent. Because it mounts
  inside `AdminLayout`, it roots on a bare `<div>`, never a second `<main>` (a nested `main` is a
  duplicate landmark), and it carries no `data-theme` wrapper and imports no CSS; it consumes the Warm
  Stone tokens through its scoped `<style>`. Getting started follows the preceding progress recipe
  and recedes-and-omits: at 0 of 3 the cairn mark presides in the warmer empty-state shape with a faint
  seed bar, at 1 or 2 a calm peer card, and at 3 of 3 the whole section is gone (never a done checklist
  greeting a fluent author). The done cue reaches assistive tech three ways and never by color: a
  filled glyph-backed box (decorative, `aria-hidden`), a visible "Done" tag, and an `sr-only` "not
  done" on every open step. The unchecked step-box ring is `color-mix(in oklab,
  var(--color-base-content) 55%, transparent)` (about 3:1 on base-100, the WCAG 1.4.11 floor for a
  control conveying state, kept a thin ring so it never reads as filled). The formatting reference is a
  real `<table>` with `th scope="col"` and `th scope="row"`, the syntax cells in `var(--font-editor)`,
  rendered from the shared `markdown-reference.ts` source the editor's Ctrl+/ dialog also renders. The
  get-help hand-off renders only when the adapter sets `supportContact`, shaped to the contact (an
  email opens a `mailto`, a URL opens an external link with `rel="noopener"`, anything else shows as a
  note); the unset state is the canonical default, a self-serve line with no control, never a button to
  a blank contact.

## Chrome and spacing

- The sidebar and topbar form one flat header strip: both `h-16` (the topbar PINNED with
  `h-16 min-h-16 py-0`, since a content-driven navbar drifts with font metrics and the two
  border-bottoms stop meeting at the seam), `bg-base-100`, the same hairline border-bottom, no
  shadow, so they read as one band across the sidebar seam. The nav sidebar is `w-56` on office
  routes and recedes on desk routes. On the desk the chrome cedes all width to the editor: the
  details fields move to a ~19rem right slide-over, so the editor card (hairline-only, no shadow)
  centers as the page's one floating object in both postures. The content area is
  `bg-base-200`; panels are `bg-base-100`.
- Align the brand mark, the group eyebrows, and the nav-item icons on one left edge. Keep consistent
  vertical rhythm between groups. The list table drops its Date column below `sm` and stacks its header.
- The editor's fold gutter is a sanctioned exception to the otherwise gutter-free prose surface. The
  markdown editor folds directive containers, and the fold control lives in a real CodeMirror
  `gutter()` column (fixed-x, ~22px), not floating in the text. It stays quiet because it is empty at
  rest and the chevron reveals only on gutter hover (the Obsidian precedent: a calm prose surface
  keeps its fold gutter empty-until-hover). Do not move the chevron back into the text to "reclaim"
  the column; the in-text band was the version this replaced. The gutter rules live in the
  `EditorView.theme` in `MarkdownEditor.svelte`, with `.cm-gutters` neutralized to blend in. Design
  detail and rationale: `docs/internal/design/2026-06-14-fold-gutter-mockup.html` and the spec
  `docs/superpowers/specs/2026-06-14-fold-gutter-design.md`.

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

Mock it first, in component-idiomatic utility classes. A surface worth designing gets an HTML mockup
under `docs/internal/design/` authored in the same DaisyUI/Tailwind utility classes the component will
carry (never hand-rolled token CSS), built and served with `npm run design:mockup-css` (the design
README has the recipe). That keeps the screenshot honest to what ships and the Svelte port a
transcription. Ground the mockup in the closest live component, since the live components are the bar.

Then build the component: wrap it in a `data-theme` wrapper (or render it inside `AdminLayout`, which
already provides one), import `./cairn-admin.css`, build it from the recipes above (the card, the eyebrow,
the type vars, the theme-adaptive border and shadow), and preview on the showcase. Add component or unit
tests for new behavior and keep `npm run check` 0/0 and `npm test` exit 0.

## The developer-facing vocabulary (the versioned seam)

An extending developer builds a custom admin screen in the same idiom as the built-in admin. The parts
they build on are a stable, versioned contract. A breaking change to any of them is a major-version event,
not an everyday one, so a developer's screen survives an engine update.

The contract is three things:

- **The Warm Stone theme tokens.** The DaisyUI 5 role variables in the two `[data-theme]` blocks: the
  `base-*` surfaces, `base-content`, `primary` and its `-content`, the status pairs, and the geometry
  (`--radius-field`, `--radius-box`). A screen reads them the DaisyUI way, through `bg-base-100`,
  `text-primary`, and the rest, so it recolors with the theme.
- **The `text-muted` / `text-subtle` role utilities.** The two named secondary-text roles, defined in
  `scripts/admin-css.input.css` and frozen as the role interface. Use them for labels, dates, hints
  (`text-muted`) and nav-item text (`text-subtle`). A standing test keeps them compiled and pointing at
  their vars.
- **The documented component recipes.** The card, the eyebrow, the active nav item, the empty state, the
  dialog, the segmented check-and-tint control, and the rest of the recipes above. Match them, so a custom
  screen reads as part of the admin, not a bolt-on.

Not everything in `cairn-admin.css` is the contract. Some of it is cairn's own internal frame, which the
engine may change between versions without a major bump. A screen should not build on these:

- **The accessibility text inks** (`--cairn-warning-ink`, `--color-positive-ink`, the `--cairn-error-*`
  family). These are on-surface ink counterparts to the DaisyUI fill tones, at locked, measured contrast.
  The admin uses them for its own status words and markers; they are frame, not a public palette.
- **The theme-adaptive elevation pair** (`--cairn-shadow`, `--cairn-card-border`). A custom card gets the
  same lift through the floating-card recipe, which names them; the tokens themselves are cairn's.
- **The embed-anywhere infrastructure** (the box-sizing reset, the bare-button Preflight replacement, the
  anchor and `summary` resets, the focus-ring rule). These exist because the admin self-styles on any host
  with no host Preflight. They are the frame that makes the sheet portable, not an API.
- **The editor (CodeMirror) system** (the directive rails, the fold gutter, the syntax highlight, the
  `--cairn-directive-*` and `--cairn-focus-dim-*` tokens). This is a settled design in the editor's
  `EditorView.theme` territory, walled out of the sweep on purpose.
- **The two unlayered forced workarounds** (the `.menu` focus-visible restore and the
  `.cairn-btn-guarded` pointer-events restore). Both fix real shipped bugs and are pinned by exact
  selector.

The split is recorded token by token in the admin custom-surface ledger
(`docs/internal/design/2026-06-29-custom-surface-ledger.md`), which classifies every custom property into
Tier 1 (the theme), Tier 2 (the documented floor), and Tier 3 (the folded remainder, now at zero). The
`check:custom-surface` gate holds the line: it caps the `@layer components` rules, pins the unlayered set
by whole-selector equality, and keeps the retired-token budget at zero, so a new arbitrary
`text-[var(--color-muted)]` bracket in the admin markup fails the build.

## The starter template's design

The showcase (`examples/showcase`) is the starter template a scaffolded site copies. Its design is the
site's own, not the admin's, so its tokens live with the site and a developer restyles them freely. The
showcase custom-surface ledger (`docs/internal/design/2026-06-30-showcase-custom-surface-ledger.md`)
records the tiers.

- **Tier 1 is the template's own DaisyUI theme, not Warm Stone.** `examples/showcase/src/lib/theme.css`
  holds two `@plugin "daisyui/theme"` blocks, `cairn` (light) and `cairn-dark` (under
  `prefers-color-scheme: dark`), a warm stone pairing that is the showcase's brand and distinct from the
  admin's Warm Stone. The public output stays design-agnostic by charter, so the template does not impose
  the admin theme.
- **The design-scale tokens live in Tailwind 4 `@theme`, so the named utilities generate.** The type scale,
  the space scale, the faces, the rhythm, the reading measure, the muted ink, and the card hairline sit in
  the `@theme` block. Tailwind emits a named utility for each, so the chrome markup writes `text-step-*`,
  the spacing utilities (`gap-m`, `px-m`, `mt-2xl`), `font-display`, `tracking-*`, `leading-*`,
  `max-w-measure` / `max-w-measure-wide`, `text-muted`, and `border-card-border`, never an arbitrary-value
  bracket. `@theme` re-emits each token at `:root`, so the `var()` consumers in `theme.css`, `prose.css`,
  and `site.css` keep resolving. Editing one token re-tunes both the `var()` reference and the utility.
- **The owned Tier 2 is the site's design, walled and documented.** The reading surface (`prose.css`, the
  hand-authored article typography), the `.cairn-place-*` figure-placement contract in `site.css`, the
  on-surface status inks (`--cairn-<status>-ink`), the elevation pair, the CTA pair, and the code-highlight
  binding (`pre.shiki` plus the engine-owned `.cairn-tok-*` class contract). cairn names the class
  contracts (`.cairn-place-*`, `.cairn-tok-*`); the site colors them.
- **The re-skin recipe sits at the top of `theme.css`.** It names the two theme blocks to edit for a new
  accent and paper-and-ink, the `@theme` tokens to retune the scale, and the status-ink seam to keep in
  step with the fills. About fourteen role values cover the brand-and-base headline change most owners
  make. The `check:public-tokens` gate proves the re-skinned theme still clears AA in both sRGB and P3.

## Rehearsing a DaisyUI or Tailwind upgrade

A DaisyUI or Tailwind major can shift a value or drop a class the admin sheet and the template both
compile against. A maintainer rehearses the bump against the visual baselines and the gates before taking
it, so an upstream change surfaces as a reviewed screenshot diff, never a silent regression. The scheduled
watcher (a `schedule` routine) pings when a new major publishes; it points here.

The runbook:

1. Bump the dependency (`daisyui` or `tailwindcss`) to the new major.
2. Recompile the admin sheet: `npm run package`. This rebuilds `dist/components/cairn-admin.css` from the
   partial plus the new DaisyUI/Tailwind, and it also runs the doc-tree scan, so a bad doc candidate shows
   up here.
3. Run the visual baselines in `examples/showcase`: `CI=1 npx playwright test admin-visual site-visual`.
   These render the admin chrome and the public site in light and dark against the committed screenshots.
4. Run the vocabulary and contrast gates: `npm run check:custom-surface` (both trees, so the retired-token
   budget and the layer cap still hold) and `npm run check:public-tokens` (the theme still clears AA in
   both gamuts).
5. Confirm the role utilities still resolve. The `admin-css-build.test.ts` unit test asserts `text-muted`
   and `text-subtle` compile into the sheet and keep pointing at their vars, so a Tailwind change that
   tree-shakes or renames a `@utility` fails here.
6. Read the screenshot diff. A pixel change is either an upstream regression to work around or an intended
   shift to accept. When it is intended, update the committed baselines
   (`npx playwright test --update-snapshots` for the affected specs) so the new screenshots are the
   reviewed record of the drift, and note the reason in the commit.

A clean run across all six steps is the evidence the bump is safe. A red gate or an unexplained diff is the
signal to hold the upgrade and investigate.
