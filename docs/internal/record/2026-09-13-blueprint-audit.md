# daisyUI Blueprint audit of the cairn-cms admin

Driven the licensed Blueprint MCP server (v1.6.3) over stdio JSON-RPC from a Python probe
(no MCP client available in this session). One workflow, `cairn-admin-audit-1`, bound to
`/var/home/glw907/Projects/cairn-cms`. Raw responses for every call are saved under
`/tmp/claude-1000/-var-home-glw907-Projects-cairn-cms/4b322bf8-216b-4c56-93da-cc9520102d95/scratchpad/blueprint/`
(`01_setup_expert.json` through `07_page_architect.json`, plus `rules_readable.txt` and
`findings_components.txt`).

## Answer to "are we using all the capabilities"

- **`daisyui_rules_enforcer` and `daisyui_quality_inspector`** are the two tools with standing
  value for cairn's own workflow. Neither requires a browser or a build; both run headless
  against source files, so the main loop can invoke them directly at a pre-release gate. Neither
  can run inside `cairn-implementer` (implementers cannot reach MCP), so this has to be a main-loop
  or a dedicated review-gate step, not a per-task check.
- **`daisyui_setup_expert`** is a one-time-per-workflow prerequisite call, not a repo scanner: it
  returned two generic guidance cards (semantic colors, icon-library setup) regardless of the
  actual repo content, with no evidence it read `cairn-admin.css`, `package.json`, or the Tailwind
  version. It does not do the "wrong config, missing plugin options, version drift" detection the
  brief hoped for. Treat it as a required handshake before the other tools, not a diagnostic in
  its own right.
- **`daisyui_component_syntax_expert`** has one-off value: useful when hand-authoring new markup
  for a component cairn does not yet use, to get the canonical class skeleton. For an *audit* of
  existing markup it is weaker than `quality_inspector`, since it only hands back a class
  catalogue and generic rules ("use `btn btn-sm` by default"), not a diff against real code; the
  agent still has to do the comparison by hand. It is also artificially bounded (6 of 25 requested
  components per call, paginated via a `next step`), so a full-catalogue pull is multiple calls.
- **`daisyui_creative_director` and `daisyui_page_architect`** are irrelevant to cairn's admin as
  it exists today. `creative_director` refused to run without a trend/tag/use-case selection (it
  errored: "Choose one trend, or select at least one visual tag or use case"), confirming it is a
  greenfield aesthetic-direction tool, not an auditor. `page_architect`'s `pages/admin-dashboard`
  brief describes a generic SaaS analytics/governance dashboard (KPI tiles, tenant/billing
  widgets, saved views) that has nothing to do with cairn's actual admin, a content-editing CMS
  built around the office/desk model, zen mode, and a document editor. Running either against
  cairn's admin would mean grading a content CMS against a dashboard template. Skip both for this
  audit; keep `page_architect` in mind only if cairn ever ships a genuinely new page type with no
  existing design (it never has one to date; every admin screen follows `admin-design-system.md`).
- **`convert_*` tools** (Figma, Bootstrap, screenshot, Tailwind, picture-to-theme) are irrelevant
  to cairn: nothing in the pipeline originates from Figma, Bootstrap, or a screenshot.
- The "168 rules" figure in the license description does not match what `rules_enforcer` itself
  returns: it surfaced 6 categories (accessibility, component-code, media, project-quality,
  responsive, theme-usage) totaling roughly 65 individual rule bullets. The larger count likely
  includes the full component-syntax catalogue counted per-class; nothing to act on here, just a
  note that the two numbers describe different things.

## DEFECTS TO FIX BEFORE THE RELEASE

1. **`transition-all` in `src/lib/components/EditPage.svelte:1643`.** The flash-message strip
   uses `class="cairn-feedback alert alert-success mb-4 type-body transition-all
   duration-[250ms] starting:-translate-y-2 starting:opacity-0"`. Only `transform` and `opacity`
   animate here; `transition-all` is exactly the anti-pattern `rules/project-quality` bans ("Do
   not add `transition-all` or extreme z-index values"), and cairn's own admin-design-system doc
   states no exception for it. Small, mechanical fix: `transition-[transform,opacity]`.

## IMPROVEMENTS FOR A LATER PASS

1. **Inline hand-rolled SVG icons in `EditPage.svelte`** (15 occurrences flagged, lines 1495-1497,
   1706, 1744, 1928-1930, 2128, 2137, 2152, 2161, 2174, 2186, 2221; `icons.inline-path-collection`).
   cairn already standardizes on Lucide (`src/lib/components/admin-icons.ts` is a curated
   per-icon-import barrel, and most components import `@lucide/svelte/icons/*` directly), but
   `EditPage.svelte` hand-rolls several small icon SVGs (for example the three-dot "more actions"
   glyph at 1494-1498) instead of importing the existing Lucide equivalent. Cosmetic and low-risk
   cleanup, not a defect: swap for Lucide icons at a convenient future pass, not urgent for
   release.
2. **`MarkdownHelpDialog.svelte:29`'s two-column `<table class="table table-sm">`** has no
   `overflow-x-auto` wrapper (`responsive.table-overflow`). In practice both columns hold short
   text (a markdown syntax token and a short description) so real horizontal overflow is unlikely
   at any viewport, but there is no defensive wrapper if a future row grows a long value. Cheap to
   add (`<div class="overflow-x-auto">` around the table) whenever the file is next touched; not
   worth a dedicated pass on its own.
3. **`daisyui.dynamic-class` on `CairnAdminShell.svelte:985`**
   (`` class={`menu menu-sm w-full gap-0.5 p-0 ${extraClass}`} ``). The dynamic part is a
   caller-supplied `extraClass` string appended to an otherwise static class list, not a
   conditionally-built daisyUI variant, and the admin's own `@source` scan already covers whatever
   literal classes call sites pass in. Not a functional bug today, but worth a comment noting why
   the dynamic interpolation is safe here, so a future Blueprint or lint pass does not re-flag it
   without context.

## EXPLAINED-KEEP (a cairn ruling already covers this Blueprint finding)

1. **`blueprint.unapproved-custom-css`, 43 occurrences across `src/lib/components/cairn-admin.css`
   (theme-root blocks at lines 81, 255, plus the `@layer components` overrides throughout).**
   Blueprint's `rules/component-code` says "Do not author CSS selectors for components, controls,
   navigation, cards, buttons, forms, layout, interaction, or animation" and "Limit authored CSS to
   imports, plugin and theme directives, `@theme` tokens, font declarations, and necessary custom
   properties." cairn's own admin-design-system.md documents exactly this budget under a different,
   more precise mechanism: the Tier-2 "essential custom surface" is capped and gated by
   `check:custom-surface` and the ledger at
   `docs/internal/design/2026-06-29-custom-surface-ledger.md`, which classifies every custom
   property and caps the `@layer components` rule count and the unlayered-rule set. This is
   **a documented cairn ruling that conflicts with the generic Blueprint rule; cairn's ruling wins**
   because cairn ships its own scoped, embeddable stylesheet (the "admin is self-styled" model), a
   use case Blueprint's rule is not written for (it targets an app consuming daisyUI directly, not
   a library shipping a compiled component stylesheet under a `data-theme` scope). Record the
   exception rather than remove the CSS.
2. **`theme.arbitrary-variable-colors`, 30 occurrences of `border-[var(--cairn-card-border)]`
   style utilities** (for example `CairnAdminShell.svelte:710,775,782,824`,
   `CairnMediaLibrary.svelte:633` and others). Blueprint's `rules/theme-usage` says "Do not use
   arbitrary color utilities for theme-aware UI... Use daisyUI semantic colors." cairn's own
   design system explicitly mandates the opposite for borders and shadows: "Borders and shadows
   are theme-adaptive vars. Use `var(--cairn-card-border)` and `var(--cairn-shadow)`, never a fixed
   `base-300` border" (admin-design-system.md, "Load-bearing rules"), because daisyUI's semantic
   border tokens cannot express the light/dark hairline-vs-shadow tradeoff cairn's ink story
   requires. Conflict noted; cairn's ruling wins.
3. **No `@plugin "daisyui"` directive visible in the audited file** (`setup.daisyui-missing`,
   see BLUEPRINT WRONG below for why the finding itself is misleading) is really the same
   architecture point: the directive lives in `scripts/build/admin-css.input.css`, deliberately
   separate from the shipped `cairn-admin.css` partial (the input file is "Not shipped"; the build
   script compiles it and appends `@font-face` afterward). Not a gap, a build-pipeline split that
   Blueprint's single-file view cannot see.
4. **`daisyui.color-treatment` warnings across ~20 files** (ConceptList, EditPage, LoginPage,
   MediaAltFillDialog, etc.), flagging "unrequested" semantic color use. cairn's design charter
   explicitly assigns meaning to color (the primary-violet accent reservation, the warning/positive
   ink tokens, the chip-register tone system) and even names color density as a standing self-graded
   concern ("the color reads a little too aggressive... too many popping colors on one screen" , 
   admin-design-system.md, "Calibration"). The finding direction (color is worth watching) is
   already tracked by cairn's own charter; the specific counts Blueprint reports are not
   independently actionable without a rendered/visual pass, which is out of scope for a
   `report_only` static audit.
5. **Popover-driven "dropdown" markup** (`EditorToolbar.svelte:382,463`, `EditPage.svelte:1510`,
   `ToolbarDisclosure.svelte:282`) reuses daisyUI's `.dropdown`/`.dropdown-content`/`.dropdown-open`
   classes purely for their compiled visual shape while the actual open/close behavior runs through
   the native Popover API (`popover="auto"`, `popovertarget`, `anchor-name`/`position-anchor`,
   `ontoggle`) plus a scoped rule in `ToolbarDisclosure.svelte` that explicitly neutralizes
   daisyUI's own `:focus-within` disclosure path. This matches admin-design-system.md's "Popover
   menu" ruling ("never the focus-driven `.dropdown` wrapper, which opens on focus-in-transit and
   ignores Escape") to the letter; no syntax-expert catalogue entry for `components/dropdown` was
   pulled against this markup in this run (batch-capped, see Method notes), but no
   `quality_inspector` finding flagged it either, so there is nothing here to reconcile beyond
   noting the deliberate divergence for the record.

## BLUEPRINT WRONG (the tool misreads cairn)

1. **`accessibility.form-control-name`, all six occurrences (`ExpandableRow.svelte:154`,
   `ListToolbar.svelte:42,44,95,470`, `cairn-admin.css:1030`).** Every one of these line numbers
   falls inside a prose doc-comment that merely *mentions* `<select>` or `<input type="radio">` in
   running text (for example `ListToolbar.svelte:42`, "...still renders as a `<select>`, since a
   button group...": a sentence in a `@component` doc block, not markup). The scanner is pattern-
   matching tag names inside comments, not parsing real DOM structure. None of these are actual
   unlabeled controls; a live grep of the real `<select>`/`<input>` elements in these files finds
   labels or `aria-label`s throughout. Not a real accessibility problem, and worth reporting back
   to daisyUI/Blueprint as a scanner bug (comment text should not count as markup).
2. **`daisyui.unknown-class`, "82 classes look like unsupported daisyUI variants."** The sampled
   occurrence list mixes three unrelated categories, none of them actually broken: (a) plain
   Tailwind utilities that are not daisyUI classes at all and were never meant to be recognized as
   such (`select-none`, `table-cell`, `list-none`); (b) cairn's own documented custom utility/role
   classes (`card-shell`, `card-shadow`, `status-chip*`, both explicitly named and versioned in
   admin-design-system.md's "Component recipes" and `admin-grammar-tokens.md`); and (c) at least
   one genuinely official daisyUI class, `dropdown-content`, which is part of the real `.dropdown`
   component vocabulary the tool's own `component_syntax_expert` catalogue would confirm. The
   finding's premise (an unrecognized class is necessarily wrong) does not hold for a library that
   ships its own compiled, versioned utility set alongside daisyUI's.
3. **`setup.daisyui-missing`, "No daisyUI dependency, CSS plugin directive, or supported CDN setup
   was found."** False: `package.json` pins `"daisyui": "^5.6.6"`, and
   `scripts/build/admin-css.input.css` (the actual Tailwind/PostCSS entry point,
   `@plugin "daisyui" { themes: false; }`) declares the plugin directive correctly. The finding is
   only "true" in the narrow sense that the one file the audit was pointed at
   (`src/lib/components/cairn-admin.css`) does not itself contain the directive, because cairn's
   build deliberately splits the compile-time input file (not shipped) from the compiled partial
   (shipped, imported by consumers). A single-file scanner cannot see a multi-file build pipeline;
   scope this to "the audited path lacks the directive," not "the project lacks daisyUI."
4. **`responsive.table-overflow` on `AdminTable.svelte:60`.** False: the `<table>` is wrapped in
   `<div class="toolkit-admin-table-wrap">` (line 59), and that wrapper's own scoped `<style>`
   block (lines 77-79) sets `overflow-x: auto`. The overflow strategy exists, one line above the
   table the tool flagged; the static scan did not connect the wrapper's scoped CSS to the child
   element.
5. **`responsive.table-overflow` on `OfficeList.svelte:7` and `:38`.** False for the same
   comment-as-markup reason as finding 1: line 7 is inside the component's `@component` doc block
   ("...typically renders inside" mentioning `<table>` descriptively) and line 38 is a JSDoc prop
   comment ("The screen's own content (typically a `<table>`)..."). `OfficeList.svelte` renders no
   `<table>` itself; it is a header-plus-card shell that takes the table as a caller-supplied
   snippet.

## Rules enforcer: coverage against cairn's own conventions

Full rule text saved in `rules_readable.txt`. Summary:

- **(a) Rules cairn violates or has no convention for:** none found beyond the single
  `transition-all` defect above (a genuine, isolated miss, not a systemic gap). No missing
  accessible-name convention, no missing responsive convention, no theme-usage gap: cairn's own
  doc already states stricter versions of nearly every Blueprint rule in this list (contrast
  floors measured to the decimal, not just "readable"; a documented single-custom-theme policy
  matching "use one custom theme, add another only when the user requests it").
- **(b) Rules that conflict with a cairn ruling (cairn wins):** the two documented above
  (no-authored-CSS vs. the custom-surface budget; no-arbitrary-color-vars vs. the
  `--cairn-card-border`/`--cairn-shadow` vars). Both are architecture-level exceptions specific to
  cairn shipping its own compiled admin stylesheet, not something a typical daisyUI consumer app
  would need.
- **(c) Rules cairn already meets:** accessibility (semantic HTML, visible labels, keyboard focus,
  no color-only signaling: cairn's chip-register and check-glyph work is more rigorous than the
  rule asks for), theme-usage's single-custom-theme and semantic-token rules (cairn's Warm Stone
  tokens are exactly this), responsive collapse/stack rules (the office/desk model and the
  five-viewport bar exceed the bar), and the media rules (project assets only, no invented remote
  URLs; cairn's media library is entirely asset-driven).

## Method notes / limitations of this run

- `daisyui_component_syntax_expert` returned only 6 of the 25 requested `SnippetIDs` in one call
  (button, input, select, textarea, checkbox, toggle) and named 19 remaining
  (modal, dropdown, menu, drawer, table, badge, alert, card, fieldset, label, loading, pagination,
  join, kbd, status, radio, range, steps, avatar) for a follow-up call. Given the six returned
  carried only generic size-default rules with no structural divergence against cairn's markup,
  and `quality_inspector`'s file-level scan already covered the same components' actual usage
  with no further findings, the second batch was not pulled; nothing in this report depends on it.
  A future re-run of this audit that wants the full syntax catalogue should budget for the
  follow-up call.
- `daisyui_quality_inspector` accepts a directory path under `report_only`, which let one call
  cover all of `src/lib/components` and `src/lib/admin-toolkit` (71 files audited) rather than
  300 individual file entries.
- The rendered/visual-review half of `quality_inspector` was declared `unavailable` up front
  (`reportedBy: "client_capability"`), since this probe has no browser tool. Anything that needs
  an actual render (the "color reads too aggressive" self-graded concern, real overflow behavior
  at narrow widths) is out of this audit's reach; the family's own showcase e2e visual suite is
  the existing mechanism for that, not Blueprint.
