# Help shell design (editor-help Pass 2)

The design record for the in-admin Help shell. It carries the research that chose this direction, the
architecture, the rev.2 design (the polished mockup is the visual record), the resolved decisions, and
the scope of the first slice. It supersedes the "Pass 2 (sketch): the point-of-typing coach seam" in
the editor-help foundation plan, which the research below discarded.

## What this is

A standing, labeled **Help** home in the admin office: the calm, always-there place a non-technical
author goes to get oriented and unstuck, without anything ever interrupting their work elsewhere. It
is the pull half of the initiative's help doctrine, sitting on top of the woven half (the per-field
hints) that Pass 1 shipped. The first slice is the Help home itself. The screen-contextual slide-over,
the command-palette help, and the deeper corpus are later slices that the same architecture feeds.

## How we got here (the research: three adversarial passes)

The editor-help foundation pointed at a "point-of-typing coach" as Pass 2's signature. Three
prior-art adversarial passes discarded it and two successors, and landed here. The reasoning is the
research record:

1. **The coach was killed.** A widget that detects markdown as you type and explains it is the Clippy
   shape the whole industry abandoned: prescriptive, pattern-triggered, arriving at the moment of
   focus. Coachmark research adds that instructional popups train banner-blindness, and the coach
   fired on success (the live preview already shows the heading worked), which is the textbook case of
   explaining the obvious. It also contradicted the editor's own iA Writer inspiration ("nothing
   distracts, nothing decorates") and the initiative's pull-not-push doctrine.

2. **The editor-chrome successors were killed.** A selection format bar plus a teaching placeholder
   plus tighter highlighting was the next proposal. A consistent application of the iA Writer standard
   indicted two of the three: a floating bar is decoration the editor rejects, and an instructional
   placeholder is a documented inclusive-design anti-pattern (it vanishes the moment the author starts,
   is low-contrast by convention, and screen readers may skip it). The bar also teaches nothing, it
   removes the need to learn markdown, which is orthogonal to the signature. Only the highlighting
   survived, as a small rider.

3. **The Help shell is what the foundation was built for.** The success cases for non-technical-author
   help converge on pull, summoned, and screen-contextual surfaces: WordPress's contextual Help tab
   (an ever-present, plainly labeled, screen-aware destination, written succinctly in plain language),
   the Cmd+K command palette (the discovery surface for new and infrequent users that teaches shortcuts
   by showing them), and progressive disclosure (details exactly where needed, the principle Pass 1's
   field hints already express). The standing Help home plus the recede-on-desk slide-over is the
   architecture the design pass chose and the seams Pass 1 built. The editor chrome was the detour; the
   shell is the road.

## Architecture

One config-aware **help source** feeds every help surface, which is what prevents the three-surface
drift the design pass flagged. The source is keyed so a surface asks it for "the help for this place."
The first slice formalizes a minimal shared source (the formatting reference content and the
getting-started step definitions, both built-in and universal) that the Help home and the existing
editor Ctrl+/ dialog both read. The full route-and-concept-keyed manifest arrives with the
screen-contextual slide-over, which is the surface that actually needs per-screen keying.

The Help home composes three inputs:

- **Built-in help content**: the markdown formatting reference (today hardcoded in
  `MarkdownHelpDialog.svelte`, extracted to a shared source so the dialog and the home cannot drift)
  and the getting-started step definitions.
- **Runtime config**: the site's concepts (Posts, Pages) and its optional `supportContact` (the
  Pass 1 adapter field, already on `CairnRuntime`).
- **Derived state**: the getting-started progress, computed from observable content and publish state
  at load, so the count is always real and never a stored or impossible value.

## The design (rev.2)

The visual record is `docs/internal/design/2026-06-23-help-shell-mockup-rev2-polished.html`. The three
prototypes, the six-dimension adversarial critique, the pre-polish rev.2, and the polish report sit
beside it.

The synthesis took **variant A** as the base (the only composition that reads as a real, composed
place, and the only one rendering the cheat sheet in the actual iA Writer Mono editor face), but shows
the populated, calm peer card rather than A's empty hero, because three critique dimensions warned a
full-bleed checklist hero becomes a steady-state nag. It grafted variant C's eyebrow-plus-display
peer-region rhythm (minus C's decorative violet chips) and its visible "Done" tag, and variant B's
recede-and-omit behavior and grouped two-column reference desk.

The Help home is one calm column inside the office shell, with **Help** a standing, plainly labeled nav
home pinned at the foot of the sidebar (a real labeled destination, never a bare glyph, per the Pass 1
disclosure recipe). A masthead carries the page's single Bricolage display beat (a real sentence h1,
never "Help" stacked under an eyebrow "Help"). Three co-equal sections follow:

1. **Getting started**: a derived checklist (write your first post, publish it, create a page). The
   count is real text, the bar is a decorative `role="presentation"` echo, and a done step carries a
   filled positive-ink glyph box plus a visible "Done" tag, never color alone. Each step routes to the
   action that completes it.
2. **Formatting**: the markdown reference promoted from the Ctrl+/ dialog, as a real semantic table
   with `th scope="col"`, two grouped columns (Text, Links and lists), the "Type this" samples in the
   iA Writer Mono editor face, the rendered-result column in plain language with the heading example in
   the Bricolage display face. A foot points at the present, working Ctrl+/ sheet beside the editor.
3. **Get help**: the support hand-off, a calm text-plus-action card, rendered with the `supportContact`
   when set and as a plain self-serve line (no control) when unset.

The whole screen is Warm Stone: the pinned token block, Bricolage display only on the h1 and section
heads and the rendered-heading sample, IBM Plex Sans everywhere else, the floating-card recipe applied
straight, violet reserved for the active nav state and the primary action.

A few copy refinements from the main-loop read fold into the build: cut the lede's pull-not-push
narration ("It is always here when you need it"), collapse the getting-started block's stacked intro
layers, and de-duplicate the Get-help heading against its card title.

## Resolved decisions

- **Genuine first-run (0 of 3, empty site)** uses the warmer, mark-presided empty-state composition
  (the design system's empty-state recipe: the cairn mark plus warm, concept-named copy, composed and
  centered), since that "blank site to momentum" moment is the one place A's bolder hero earns its
  weight. The populated state is the calm peer card; the all-done state omits the section entirely.
- **The Get-help unset state is the canonical default.** A site with no `supportContact` (the common
  case at launch) renders a plain self-serve line, never a button to a blank contact; cairn does not
  dead-end a stuck author. The set state renders the contact card.
- **Dismiss does not auto-resurface.** "Hide these steps" is a per-device `localStorage` preference (the
  only thing the Help home stores; progress derives from content). It hides the getting-started section
  until the author un-hides it through a quiet "show getting started" affordance. The recede-and-omit at
  3 of 3 already handles the fluent author, so the manual dismiss is the author's explicit choice and is
  respected, not second-guessed on content regression.
- **The editor Ctrl+/ dialog remains the in-editor help surface.** Dropping the coach resolved the
  earlier open question: the reference foot's pointer at Ctrl+/ stays valid.
- Carried from the foundation: onboarding progress derives from observable content and publish state
  (no D1 row, no store); the woven per-field hints (Pass 1) are the in-context half of the same help.

## Accessibility (designed in, not reviewed at the end)

- The done state reaches sighted, low-vision, and screen-reader users without color: a filled
  glyph-backed box, a visible "Done" word, and an `sr-only` "not done" on every open step, so a screen
  reader hears a real two-state checklist.
- The unchecked checkbox ring is `content` at ~42% (about 3:1 on base-100), meeting the WCAG 1.4.11
  non-text floor for a control that conveys state.
- The progress bar stays inert: `role="presentation"`, no focusable child, the authoritative count in
  adjacent real text. It is never promoted to `role="progressbar"`.
- Focus is the canonical universal `:focus-visible` (2px solid `--color-primary`, offset 2px), solid
  rather than the 70% editor-hairline mix, and applied to the bare selector so the future focusable
  `role="region"` slide-over inherits it.
- The reference is a real `<table>` with `th scope="col"` exposing the Type-this / What-it-makes
  pairing. The Help nav home carries `aria-current="page"`.
- Contrast holds AA on Warm Stone in both inks; reduced motion is respected.

## The developer contract

- **Already shipped (Pass 1):** `FieldBase.description` (the woven per-field hints) and the optional
  `CairnAdapter.supportContact` carried onto `CairnRuntime` (the Get-help hand-off reads it).
- **New in this slice:** a small shared help-content source (the formatting reference rows and the
  getting-started step definitions), and a pure derive-progress function that maps content and publish
  state to the checklist's done states. Both are internal; the public-observable additions are the
  Help admin route and the labeled nav home.

## Scope: the first slice and what is deferred

**First slice (this pass):**

- The shared help-content source (extract the reference from `MarkdownHelpDialog`, define the steps).
- The derive-progress function (content and publish state to checklist state).
- The Help home admin route and load (derive progress, pass the reference and the `supportContact`).
- The Help home component (the three sections, the recipes, the a11y, recede-and-omit, the dismiss, the
  empty/populated/done states, the set/unset Get-help states).
- The labeled Help nav home in the office sidebar.
- A design-system update (the Help home recipe) and the reference and changelog entries.

**Rider (this pass, small):** the `[[page-name]]` wikilink highlight in the editor, the one
editor-feedback fix that survived the adversarial pass. cairn's own wikilink syntax renders as plain
text today, giving the author no signal it is a link. (If it complicates the slice, it splits cleanly
into its own micro-pass.)

**Deferred (later slices):**

- The recede-on-desk, screen-contextual **slide-over** (the WordPress contextual-Help-tab surface),
  with the full route-and-concept-keyed help manifest.
- The **command-palette help** integration (surface help entries and a jump-to-Help-home in the
  existing Cmd+K palette).
- The deeper help **corpus**.
- **Starter content** in the empty state (rides the `create-cairn-site` scaffolder).

## Dependencies and sequencing

This pass builds directly on Pass 1's seams (`supportContact`, the field hints, the help-surface design
recipes), so it runs after the editor-help foundation merges to `main`, or on a worktree branched off
the foundation branch. The implementation is test-first, task by task, on a fresh worktree, following
the cairn-pass method.

## Design record

- `docs/internal/design/2026-06-23-help-shell-mockup-rev2-polished.html` (canonical).
- `docs/internal/design/2026-06-23-help-shell-mockup-rev2.html` (pre-polish synthesis).
- `docs/internal/design/2026-06-23-help-shell-mockup-{a,b,c}.html` (the three prototypes).
- The six-dimension adversarial critique and the synthesis and polish rationales are in the workflow
  record for run `wf_bd16e0c8-6b2`.
