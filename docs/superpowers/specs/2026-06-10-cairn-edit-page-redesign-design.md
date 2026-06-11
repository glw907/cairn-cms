# cairn edit page redesign: zones, toolbar, and editor ergonomics

The edit page is the room a cairn editor lives in, and it has had less design attention than the
sidebar and list views around it. This spec reorganizes the page into four functional zones and
gives the markdown editor the ergonomics its audience expects. The brainstorm that produced it ran
2026-06-10; the decisions below are settled with Geoff.

## Audience and posture

The core user is the non-technical editor: comfortable in Google Docs, new to Markdown, has never
used GitHub. Cairn stays lean and focused on ergonomic, productive editing. The benchmarks are the
focused prose editors (Ghost's editor, iA Writer, Bear, Typora) rather than the git-CMS field,
which tilts technical, and explicitly not feature-accumulating dashboards like WordPress.

The guiding principles are the standard research-backed set: visibility of system status (the
editor always knows saved/unsaved/published), recognition over recall (formatting is buttons and
highlights, never memorized syntax), error prevention (destructive actions are separated and
confirmed), proximity grouping (controls live with the thing they control), and stable
high-frequency targets (the primary actions never scroll away).

## Decisions locked at brainstorm

| Fork | Decision |
|---|---|
| Editing surface | Monospace markdown source with code-editor-grade syntax highlighting, theme-harmonized. No proportional styling, no hybrid live render, no WYSIWYG. |
| Preview | Write / Preview tabs over the editor column (Ghost/GitHub model). The stacked-below preview and the header toggle go away. |
| Unsaved work | Dirty tracking with a leave warning. Save stays explicit; no autosave to the branch; no localStorage draft layer. |
| Images | The toolbar ships an Image button now, disabled with a "coming soon" hint, so the layout is settled before the gallery initiative lands. |
| Spell check | Native browser spellcheck, on for prose surfaces, off for structured fields. |
| Markdown coverage | The full GFM set the render pipeline supports, with the high-frequency subset in the primary row and the rest behind a More menu. |
| Directive syntax | Explicitly highlighted as machinery, distinct from prose. The insert dialog remains the creation path. |

## The four zones

### Zone 1: the sticky action header

A header fixed to the top of the edit page, never scrolling away. This resolves the standing
complaint that Change URL, Delete, and the preview toggle scroll off screen and go unnoticed.

Identity and status sit on the left. A back-to-list breadcrumb comes first, then the entry
title with the concept label, then the status cluster: the New/Edited/Published badge, the Hidden
badge when set, and a live save-state indicator. That indicator shows "Unsaved changes" the moment
the editor or any sidebar field diverges from the last save, and "Saved" after a save lands. It
replaces the standing pending banner, which spent permanent vertical space on a message editors
learn to ignore.

Lifecycle actions sit on the right, in order: an overflow menu (the "..." button) holding
Discard changes and Delete entry, then Publish as the outline primary, then Save as the solid
primary in the rightmost position. Save and Publish keep their current engine semantics
(publish-what-you-see, both ride the edit form). The destructive pair sits behind one deliberate
extra click and keeps its existing confirm dialogs.

### Zone 2: the editor column

The dominant area of the page. Three pieces, top to bottom.

The title input, when the adapter defines a `title` field, renders as a large borderless input at
the top of the column rather than as a sidebar field. Writers treat the title as part of the
document, and hoisting it makes the page read as a document with details rather than a form with
a text box. Adapters without a `title` field simply have no hoisted input.

The editor card carries a formatting toolbar fixed to its top edge, the editing surface, and a
slim footer. The toolbar groups, left to right with separators:

| Group | Controls |
|---|---|
| Text | Bold, Italic |
| Structure | Heading (H2/H3 only; the page title owns H1), Bulleted list, Numbered list, Quote, More menu |
| More menu | Strikethrough, Inline code, Code block, Table, Horizontal rule, Task list |
| Insert | Link to page (the internal picker), External link, Image (disabled placeholder), Insert component |
| Mode (right end) | Write / Preview segmented tabs |

Every control wraps or unwraps the current selection and follows the ARIA toolbar pattern (one tab
stop, arrow-key traversal). Keyboard shortcuts cover the high-frequency set: Ctrl/Cmd+B bold,
Ctrl/Cmd+I italic, Ctrl/Cmd+K external link, Ctrl/Cmd+S save. The Table control inserts a starter
grid (header row plus two body rows) with the cursor in the first cell, since a raw markdown table
is the single most hostile syntax for this audience. The toolbar offers only what the floored
render pipeline renders; the set is pinned to pipeline capability, never to markdown-the-language.

Switching to the Preview tab swaps the editing surface for the design-accurate preview (the
site's own render, already sanitized by the floored pipeline), full column width. Returning to
Write restores scroll and caret position. The per-user preview preference key is retired; Write
is always the landing tab.

In the card footer sit a word count and a "Markdown help" link opening a one-screen cheat sheet
dialog covering the toolbar's syntax.

### Zone 3: the details sidebar

The frontmatter form stays in the right rail, sticky, but loses its action buttons (moved to the
header) and gains named groups. Details holds the adapter's remaining fields (date, summary,
tags). Visibility holds the Hidden toggle with its one-line explanation, separated because it
changes site behavior rather than describing content. Address shows the entry's current URL
read-only with a Change URL button beside it; the rename flow and its dialog are unchanged,
relocated from the header because a labeled field in a metadata rail is more discoverable than a
header icon. On narrow screens the sidebar drops below the editor behind a Details disclosure,
and the sticky header keeps Save and Publish reachable.

### Zone 4: feedback

Transient confirmations (Saved, Published, Discarded, URL changed) render as a single dismissing
strip directly under the sticky header instead of a stack of alerts pushing the editor down. The
two persistent screen-reader live regions stay exactly as they are. Blocking errors keep their
inline alert treatment because they demand action: the broken-link list with its per-row Remove
link button, the delete-refused list of inbound linkers, and the rename collision message.

## Syntax highlighting

The editing surface stays monospace and gains a full highlight theme, in colors derived from the
Warm Stone tokens so light and dark both harmonize. Styled tokens cover heading lines, bold and
italic spans with their visible markers, links and `[[` internal links, blockquotes, list markers,
code spans and fences, and table pipes. Every token color clears WCAG AA contrast against the
editor background in both themes.

Directive syntax gets explicit, first-class treatment. The stock CodeMirror markdown parser does
not tokenize remark directives, so the editor adds a directive extension covering the container
(`:::name ... :::`), leaf (`::name`), and inline (`:name[...]{...}`) forms plus their attribute
braces. Fence lines, directive names, and attributes render in a distinct machinery color; the
prose inside a container styles as normal text; an opening fence and its closing fence read as a
visual pair. The goal is that an editor immediately distinguishes component scaffolding from their
own words and can edit inside a block without breaking it. The Insert component dialog remains
the creation path for this syntax.

Native browser spellcheck turns on for the editing surface (CodeMirror content attributes) and
for prose-bearing sidebar fields (title, summary, textareas), and stays off for structured inputs
(slug, date, tags). The squiggle must stay legible against the highlight theme in both themes.

## The save model

The page tracks dirtiness: the editor body and every sidebar field compare against their
last-saved values, and the header indicator reflects it. Navigating away with unsaved changes
triggers both the browser `beforeunload` warning and the SvelteKit navigation guard with a
confirm. Ctrl/Cmd+S submits the save form. Save and Publish keep their cross-disabled busy
states. Nothing changes in the engine: saves still commit to the pending branch, publish still
validates and holds the posted form before copying to main.

## What moves where

| Today | In this design |
|---|---|
| Save, Publish, Discard buttons in the sidebar | Header right (Save solid, Publish outline, Discard in overflow) |
| Rename (Change URL) dialog trigger in the page header | Address group in the sidebar |
| Delete dialog trigger in the page header | Header overflow menu |
| Preview toggle in the page header, preview stacked below | Write / Preview tabs in the editor toolbar |
| LinkPicker in the page header | Insert group in the editor toolbar |
| ComponentInsertDialog in the page header | Insert group in the editor toolbar |
| Pending banner above the form | Status badge plus save-state indicator in the header |
| Flash alert stack above the form | One transient strip under the header (blocking errors stay inline) |
| Title field in the sidebar form | Hoisted document-title input atop the editor column |

The existing dialogs (delete, rename, discard, component insert, link picker) keep their internal
behavior; only their triggers move. The `[[` autocomplete and the manifest-backed link resolution
are untouched.

## Out of scope

Image storage and insertion behavior (the gallery initiative owns it; this design only reserves
the toolbar slot). Autosave in any form. WYSIWYG or hybrid rendering. Editorial workflow beyond
the existing publish model. Revision history and rollback. Changes to the engine's actions,
loads, or commit semantics: this is an admin-surface redesign over the existing contracts.

## Testing notes

Component tests cover the toolbar's wrap/unwrap behavior per control, the More menu, the tab
switch preserving editor state, the dirty indicator's transitions, the navigation guard, the
hoisted title binding, the sidebar groups, and the relocated triggers. The directive highlighter
gets unit tests over the three directive forms and their edge cases (unclosed fences, nested
containers). The a11y bar applies: the ARIA toolbar pattern, token contrast in both themes, and
`check:prose` over all new copy. The showcase E2E extends to one toolbar-driven formatting action
and the tab switch.

## Open items

Toolbar undo/redo buttons are omitted on the bet that this audience knows Ctrl+Z; revisit if
editor feedback shows otherwise. The cheat-sheet dialog's exact content is a writing task at
implementation time. Scroll-position syncing between Write and Preview tabs is best-effort, not a
contract.
