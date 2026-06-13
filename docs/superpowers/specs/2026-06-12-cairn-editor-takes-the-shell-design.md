# The editor takes the shell (design)

**Date 2026-06-12. Direction approved by Geoff in the editor-as-home design session; spec awaits
his read before the plan.**

## Why

After the 0.52.x/0.53.0 refinements the editor surface itself is right, but the page around it
still treats managing content and writing a document as one context: an open entry shows three
horizontal bands (the admin topbar, the edit page's sticky header, the feedback strip) plus two
flanking sidebars before the manuscript gets a pixel, and the breadcrumb renders twice. Geoff's
read: the admin feels busy, with the actual editing interface secondary to the surrounding
chrome.

The fix is a context model, not more polish. **List pages are the office; the editor is the
desk.** Each context gets the chrome that serves it, and an open document takes the shell.

Precedent (surveyed 2026-06-12): the document school hides the office. WordPress's block editor
opens fullscreen by default (wp-admin chrome gone, a logo button exits, one top bar, settings as
a toggleable panel); Ghost's editor is a chrome-free page with a "Posts" breadcrumb back and a
settings slide-out; Notion collapses to a full-page document; Linear and GitHub recede navigation
inside an item. The record school (Contentful, Sanity, Craft) keeps persistent chrome because its
sessions are short structured-field visits. cairn's content is markdown documents and its editor
is the declared home, so it belongs to the document school; today it wears record-school chrome.
One rule both WordPress and Ghost obey even at their most minimal, which this design keeps: the
way back and the save/publish actions stay permanently visible.

## The shape (four rungs, one idea)

**1. One header band.** On an edit route, the edit page's sticky glass header dissolves into the
single 64px topbar: the breadcrumb (already there) is the way back, then the status badges and
the save-state indicator, with Save, Publish, and the overflow (Discard/Delete) rightmost, and
the Details trigger (rung 3) beside them. The feedback strip stays directly under the band, the
duplicate breadcrumb dies, and the manuscript starts roughly 80px higher. List pages keep the
topbar as is.

The band reads as three clusters, not a uniform row (mocked and approved 2026-06-12): the way
back (drawer toggle, then the breadcrumb trail with the entry title in content ink), the
document status behind a hairline (the status badge plus the save-state with a small warning-dot
indicator), and the actions split by a second hairline into the quiet pair (Details with its
panel icon, the overflow) and the lifecycle pair (Publish, Save).

The footer strip's controls dress as what they are (same mockup round): the posture pair is one
bordered segmented control with the check glyph in the active segment, the writing modes are
standalone check-and-tint toggles, and Markdown help is a plain underlined link rather than a
button. Group labels were considered and declined; the segmented border carries the
pick-one semantics without furniture.

The format strip also breathes (Geoff, 2026-06-12): the icon conversion of the insert actions
freed real width, so the most commonly used items promote out of the More overflow into the
strip, ordered by everyday frequency: inline code first, then strikethrough, then table, with
the tail (code block and the rest) staying behind the ellipsis. The exact promoted set is
whatever holds the single row at the prose card cap in both postures; verify the fit at plan
time the way the 47rem/48rem wrap threshold was verified, and keep every promoted button to the
strip's icon grammar.

Mechanics: the topbar's edit-route contents come from the edit page rather than a parallel
header. Two shapes are plausible at plan time: `AdminLayout` exposes a header-actions snippet
that `EditPage` fills, or the layout reads typed page data; pick whichever survives contact with
`CairnAdmin`'s view switching more cleanly. Save and Publish already tie to the form by
`form="cairn-edit-form"`, so they can render outside it; the sticky-header component and its
`scroll-margin-top` compensation go.

**2. The nav sidebar recedes inside a document.** Edit routes open with the drawer closed; the
breadcrumb is the way out, and the existing drawer toggle reopens the nav without leaving. List
and settings routes keep the persistent sidebar. The chrome-free state must not flash: the
closed-on-edit default resolves at SSR (the route is known server-side), not in an effect.

**3. Details on demand.** The details column unmounts as a persistent flank and becomes a
slide-over panel from the right, opened by the header's Details trigger. The fields inside keep
their groups (Details, Visibility, Address) and stay part of the one edit form (the panel stays
mounted, hidden, exactly as Preview hides the sidebar today, so uncontrolled edits survive).
Two integrations carry over: the capture-phase `invalid` handler that flips Preview back to
Write must also open the panel when the invalid control lives there, and the dirty-tracking
`onFormInput` keeps working unchanged since the panel never unmounts. The editor column then
centers truly in the freed width, both postures.

**4. Zen.** With rungs 1 to 3 landed, one control (and a keyboard shortcut) fades the remaining
chrome: the topbar slides away, the manuscript alone on the recessed ground, save-state shown
minimally (the WordPress/Ghost rule: an exit affordance and the save state never disappear, so a
slim floating indicator carrying both stays). Escape restores. Zen composes with the postures
and modes; it is the completion of Prose, not a separate system.

## Editor ergonomics (added 2026-06-12 from the mockup crit)

- **The rail pitch widens one step.** The caret-active bar is 3px, so the shipped 4px gap falls
  under the two-bar-weights separation floor and the pair muddies at a glance (Geoff caught it
  on the mockup; the pixel scan confirmed the geometry was to spec and the spec was wrong).
  New geometry: 2px bars on an 8px pitch (bars at 0-2, 8-10, 16-18; 6px gaps; the active bar
  keeps 2x clearance), with the directive gutter stepping to 1.75rem so depth-3 text keeps its
  air. The `rails()` helper's edge formula and the component tests update together.
- **Intelligent indentation.** Wrapped quote and list lines continue under their content, not
  under the marker: a hanging indent (`padding-left` plus negative `text-indent`) applied per
  line from the measured marker prefix (`> `, `- `, `1. `), the Obsidian/HyperMD wrap idiom. It
  rides the existing decoration pass; ordered-list markers measure wider than 2ch, so the
  decoration computes the prefix rather than assuming it.
- **Keyboard ergonomics and discoverability.** The format vocabulary completes (inline code,
  quote, both lists, both headings join Bold/Italic/Web link), and the page-level actions get
  keys (Publish, the Details panel, Write/Preview, Focus mode, Zen). Discoverability is three
  layered surfaces: the tooltips already on every strip button, a shortcuts sheet on `Ctrl+/`
  (mocked as screen 5), and a shortcuts section in the Markdown help dialog. Exact bindings
  settle at plan time against browser and OS conflicts; the principle stays that typing markdown
  always works and keys are conveniences, never requirements.
- **Containers fold.** A directive container folds from its opener to its closer through
  CodeMirror's fold system, driven by the same cached `fenceScan` ranges the rails use. The
  affordance is a chevron in the existing gutter on the opener row (visible on hover or while
  the caret is inside; the folded state shows it always, plus a quiet "N lines" pill after the
  label). Folding is visual only (the document and saves are untouched), state is session-local
  and never persisted, and a fold opens automatically when a search hit, the caret, or a
  validation report lands inside it.
- **No H4 button.** The document title is the page's visible H1, so in-document structure runs
  H2/H3 at this content scale, and the strip stays lean. `####` still types, gains a real size
  step in the highlight (about 1.05em, between H3 and body) so a hand-typed H4 reads as a
  heading, and the help sheet documents it. Revisit only if a real site asks.

## Constraints and cautions

- **Focus and a11y carry the risk.** Chrome that hides needs focus management: the Details
  panel is a labeled region (focus moves in on open, returns to the trigger on close, Escape
  closes); zen's chrome fade must not strand focus or trap it; the receding nav keeps its
  toggle reachable. The a11y reviewer adjudicates the panel pattern (dialog vs region) at the
  plan's review gate.
- **No load/action contract change.** This is presentation: the same one form, the same actions,
  the same loads. `CairnAdmin`'s view switching is untouched; consumer sites see only the new
  layout. Additive, minor bump.
- **The smoke surfaces.** The showcase E2E golden path must survive unchanged in substance
  (open from list, edit, save, publish round trip); selectors will need updating where the
  header moved. The capture loop verifies both contexts (office and desk) in both themes.
- **Persistence vocabulary.** Zen and the drawer state follow the established idioms (the
  drawer already persists via the `cairn-admin-nav-collapsed` cookie family; zen is a
  localStorage editor preference like the postures).
- **The design-system doc gains the context model** (office/desk, the one-band rule, the
  permanent-affordances rule) as load-bearing language for future admin work.

## Out of scope

The list pages' own design (the office is fine); the preview pane; the render pipeline; any
mobile-specific rework beyond keeping the existing drawer behavior sane; in-place directive
affordances (still the later pass recorded in the editor-experience spec).

## Testing

Component: the merged header renders the edit controls in the topbar on edit routes and not on
list routes; the Details panel opens, closes, restores focus, and submits its fields through the
edit form; the invalid-field handler opens the panel; the drawer default differs by route at
SSR; zen hides and restores chrome with focus intact. E2E: the golden path updated for the new
header; one zen round trip. The frontend-design loop runs office and desk critiques separately,
both themes, with the measured-critique method.

## Versioning

Additive for consumers: a minor bump, `0.54.0`.
