# Content Graph Plan 3: the editor link picker

**Status:** approved (2026-06-02).

**Parent design:** `docs/superpowers/specs/2026-06-02-cairn-content-graph-design.md` (the content-graph
initiative). That spec's plan list calls this "Plan 4: the picker"; the numbered plan files renumber it to
Plan 3 after Plan 2 merged the old Plan 2 and Plan 3 into one pass. This document is the per-plan design.

## Goal

Give an author two ways to insert an internal link, both writing the same standard CommonMark link
`[Display](cairn:<concept>/<id>)`. A "Link to page" dialog is the discoverable path for an author who does
not write markdown. A `[[` autocomplete is the fast path for a fluent typist. Both read the `linkTargets`
the editor already receives from the committed manifest (Plan 2's `editLoad`), so the candidate list is
finite and known at editor load and filtering happens in the browser with no network round-trip. Picking a
target that exists means a freshly made link cannot dangle.

This plan is insert-only. Deep links to a heading, create-on-link, backlinks, the link-health view, and the
delete and rename guards stay later passes (Plan 4 and the deferred list in the parent design).

## Decisions locked in brainstorming

- **Drafts appear, flagged.** The manifest flags drafts, and an author often links to a post they are about
  to publish. Both the dialog and the autocomplete show a draft target with a clear marker. A published page
  linking to a still-draft target resolves at build (the resolver reads entries by id, which includes drafts)
  but 404s publicly until the target publishes. Plan 4's save guard and the preview's broken-link cue catch a
  stuck-draft link before it ships, so showing drafts trusts the author without losing the backstop.
- **The completion seam is generic.** The `[[` autocomplete lands as a reusable CodeMirror completion seam on
  `MarkdownEditor`, not a one-off. The link feature is its first client; a later deep-link picker or other
  completion reuses the same seam. This matches the parent design's stated intent.
- **Substring search, not fuzzy.** The dialog search box matches a case-insensitive substring of the title, so
  the result order is predictable.
- **The internal-link picker is distinct from the plain link button.** The editor toolbar keeps its existing
  `link` format button for an arbitrary URL. "Link to page" is a separate affordance for an internal target.
  The two are different actions. A unified link dialog that offers both a page and a URL is a possible later
  polish, out of scope here.

## Architecture

### Two new seams on `MarkdownEditor`

Both are optional props, additive, so an existing embedder compiles unchanged.

1. **`registerCompletion(source)`** is the generic completion seam. It hands the editor a CodeMirror
   `CompletionSource`, which `MarkdownEditor` wires through `@codemirror/autocomplete`'s
   `autocompletion({ override: [source] })` in its extension list. `@codemirror/autocomplete` becomes a
   declared dependency rather than a transitive pull. The seam knows nothing about links; the link source is
   supplied by the consumer.

2. **`registerInsertLink(insert)`** is the inline link insert. The editor owns selection handling: the
   callback takes `(href, title)`, and with a non-empty selection it wraps the selection as
   `[selected](href)`, with no selection it inserts `[title](href)` inline at the cursor. It does not add the
   `\n\n` block padding the component `insertAtCursor` uses, since a link is inline. The picker stays
   selection-agnostic and passes only the chosen target.

`registerInsert` (the existing block insert the component dialog uses) is unchanged.

### Shared pure code

Browser-free so it unit-tests without a DOM.

- **`formatCairnToken({ concept, id })` in `src/lib/content/links.ts`** returns `cairn:<concept>/<id>`, the
  inverse of the existing `parseCairnToken`. Every place that writes a token uses it, so the token format has
  one owner.
- **`insertInlineLink(doc, from, to, href, title)` in `src/lib/components/markdown-format.ts`** is the
  wrap-or-insert transform, beside the existing `link` format. It returns a `FormatResult` (the new document
  and the new selection), so `MarkdownEditor` dispatches it the same way it dispatches a format. With
  `from < to` it wraps the selected range; with `from === to` it inserts `[title](href)` and places the cursor
  after the link.
- **`src/lib/components/link-completion.ts`** holds the link-specific completion logic as pure functions:
  `matchCairnTrigger(textBeforeCursor)` returns `{ query, from } | null` when the text before the cursor ends
  in `[[` followed by an in-progress query, and `linkCompletions(linkTargets, query)` returns the CodeMirror
  `Completion[]` (a case-insensitive substring match on title, grouped by concept through the completion
  `section`, the date and a draft marker in `detail`, and an `apply` that replaces the matched `[[query` range
  with the full `[Title](cairn:concept/id)` link via `formatCairnToken`). The CodeMirror `CompletionSource`
  the consumer registers is a thin adapter over these two functions plus the `CompletionContext`.

### `LinkPicker.svelte`

A new component beside `ComponentInsertDialog.svelte`, following the same native-`<dialog>` modal pattern (the
DaisyUI `modal`, focus trap, Escape, a labelled title, a backdrop close). It renders:

- a "Link to page" trigger button in the EditPage chrome beside the component **Insert** button, with an
  `aria-label` and an icon in the admin's stroke-SVG house style;
- a single search `<input>` that filters by a case-insensitive substring of the title;
- a grouped list, Pages first, then Posts, then any other concept in a stable order, each group under a small
  heading, each post showing its date to tell recurring titles apart, each draft showing a "Draft" badge.

Picking an item calls the `registerInsertLink` callback with the target's `href` (from `formatCairnToken`) and
`title`, then closes. The list items are buttons, and the dialog follows the keyboard and focus conventions the
admin accessibility bar already uses elsewhere (the component dialog and the icon picker).

The props are `linkTargets: LinkTarget[]` and `insert: (href: string, title: string) => void`. It reads no
network and holds no state beyond the search query and the open flag.

### EditPage wiring

`EditPage` already holds the registered block `insert` and builds `resolveLink` from `data.linkTargets`. This
plan adds: a second registered callback for `registerInsertLink`, a link-completion `CompletionSource` built
from `data.linkTargets` and registered through `registerCompletion`, and a `<LinkPicker>` beside the existing
`<ComponentInsertDialog>` fed `data.linkTargets` and the inline-insert callback. The `MarkdownEditor` element
gains the two new `register*` props.

## Data flow

1. At editor load, `editLoad` already ships `data.linkTargets` (Plan 2).
2. The dialog path: the author opens "Link to page", filters, and picks a target. `LinkPicker` calls
   `insert(href, title)`. The editor wraps the selection or inserts the titled link inline.
3. The autocomplete path: the author types `[[`, and `matchCairnTrigger` fires the source, which offers the
   filtered targets. Selecting one replaces the `[[query` with the full link.
4. Either way the body now carries a `cairn:` link, which the preview resolves through the manifest resolver
   (Plan 2) and the public build resolves through the site index (Plan 2).

## Error and edge handling

- An empty `linkTargets` (a fresh repo with no committed manifest) yields a dialog that shows an empty-state
  message and a `[[` source that offers nothing, neither throwing.
- A search with no match shows an empty result, not an error.
- The autocomplete only fires inside a `[[` trigger, so it never interferes with ordinary typing, and an
  author can dismiss it with Escape and keep a literal `[[` if they want.
- The picker offers only targets in the manifest, so it cannot insert a link to a non-existent target. A
  target deleted after the link is written is a Plan 4 concern (the guards) and the build backstop behind it.

## Testing

- Pure units: `formatCairnToken` (round-trips with `parseCairnToken`), `insertInlineLink` (wrap a selection,
  insert at a cursor, cursor placement), and the `link-completion` matcher and builder (the `[[` detection
  boundaries, the substring filter, the concept grouping, the draft marker, the `apply` range and output).
- Browser component tests for `LinkPicker`: the search filters by title, the list groups by concept with Pages
  first, a draft shows its badge, a post shows its date, picking inserts the token through the callback, a pick
  with text selected wraps it as the display text, and the dialog opens and dismisses by keyboard.
- A browser test for the `[[` flow through `MarkdownEditor` and the registered source: typing `[[` plus a query
  shows the filtered options, and selecting one inserts the resolved link.

## Versioning

Additive surface: two new optional `MarkdownEditor` props, a new component, a new `formatCairnToken` export, and
the pure helpers. Nothing an embedder already wires breaks, so the minor moves to `0.19.0`.

## Where it lives in code

- `src/lib/content/links.ts`: add `formatCairnToken`.
- `src/lib/components/markdown-format.ts`: add `insertInlineLink`.
- `src/lib/components/link-completion.ts`: new, the pure `[[` matcher and the completion builder.
- `src/lib/components/MarkdownEditor.svelte`: add `registerCompletion` and `registerInsertLink`, wire
  `@codemirror/autocomplete`.
- `src/lib/components/LinkPicker.svelte`: new, the dialog.
- `src/lib/components/EditPage.svelte`: register the source and the inline insert, render `LinkPicker`.
- The package entries re-export `formatCairnToken` and `LinkPicker` as the surface a site uses.
