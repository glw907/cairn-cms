# Cairn rebuild: internal links in the editor (design)

Status: approved design, pre-plan. Authored 2026-05-31.

This design lets authors link from one post or page to another from inside the admin
editor, and keeps those links working when a target's URL changes. It supplements the
functional spec at `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`,
which holds the locked architecture, and builds on the dated-slug identity design at
`docs/superpowers/specs/2026-05-31-cairn-dated-slug-design.md`, which gives every entry a
permanent id and a derived URL. The numbered plan derived from this design lands under
`docs/superpowers/plans/`; its number is settled at planning time.

## Why this design exists

The editor has no way to link to another page. Carta's toolbar offers a generic link
button that emits `[text](url)`, so an author types a raw URL by hand and the editor has no
idea what pages exist. A hand-typed URL bakes the target's current permalink into the prose.
When that target's slug or date later changes, every link to it rots, and nothing surfaces
the breakage until a reader hits a dead page.

Cairn holds the whole content corpus in git and resolves URLs at build time, so it can do
better than baked URLs. It knows every page that exists, it knows each page's permanent id,
and it controls the render pipeline that turns markdown into HTML. An internal link can
store a stable identity and resolve to the live URL on every build. A rename then needs no
edit to the linking prose.

## The link token

An internal link is a standard CommonMark link whose href uses a `cairn:` scheme keyed to
the target's concept and id.

```
Try our [waxing guide](cairn:posts/2026-01-04-waxing-guide) before the first snow.
```

The href has three parts. A `cairn:` scheme marks the link for resolution. Its first path
segment is the concept, such as `posts` or `pages`. What follows is the target's id, the
full filename stem from the dated-slug model. Because the id is permanent, the token survives
any change to the target's slug, date, or permalink pattern.

The display text defaults to the target's current title and stays editable. An author can
write `[our guide to waxing](cairn:posts/...)` and the link reads naturally in the sentence.

This form stays valid markdown. Any renderer parses it as a link. A tool that does not know
cairn shows an inert link rather than a wrong URL, so the file degrades safely outside the
pipeline. The WordPress editor takes the opposite approach, bakes the permalink, and has
carried an open link-rot issue since 2021.

## Resolution at build time

A remark step in the render pipeline (`render/pipeline.ts`) visits every link node. When an
href starts with `cairn:`, the step parses the concept and id, looks the pair up in the
content index, and rewrites the href to the target's live permalink. Links without the
`cairn:` scheme pass through untouched, so external links and ordinary relative links are
unaffected.

Resolution reads the same content index the delivery layer already builds
(`delivery/content-index.ts`, `delivery/site-index.ts`). No new index is needed. The index
maps a concept and id to the entry's current permalink, which is exactly what the resolver
looks up.

## The picker

Authors reach the picker two ways, and both insert the same token.

- A **"Link to page" toolbar button** sits beside the existing Insert palette in the editor
  header (`EditPage.svelte`). It opens a searchable list of the site's posts and pages. This
  is the discoverable path for an author who does not know markdown.
- A **`[[` autocomplete** inside Carta opens the same list inline as the author types. This
  is the fast path for a fluent author. It is a CodeMirror completion source passed through
  the `plugins` prop the `MarkdownEditor` seam already exposes.

The candidate list is the site's posts and pages from the content index, searched by title.
The set is finite and known at editor load, so the picker filters in the browser with no
network round-trip. Picking a target inserts the token through the `registerInsert` callback
already wired on `MarkdownEditor`. With text already selected, the toolbar button wraps the
selection as the display text instead of inserting a fresh title.

CodeMirror's autocomplete carries a keyboard contract already, covering open, arrow
navigation, select, and dismiss. The `[[` path inherits it, which serves the accessibility
bar the functional spec sets for the admin.

## Integrity: fail closed, surfaced kindly

A link keyed on the id cannot break when a slug or date changes, because resolution always
produces the target's current URL. A link breaks only when its target is deleted. Changing
an id is a rename, which the lifecycle pass owns and which carries its own corpus-wide
rewrite. So the design guards the two moments where a human can orphan a link, and keeps a
hard build backstop behind them.

**The picker offers only targets that exist.** A freshly made link cannot dangle.

**The preview flags a broken link as it appears.** The live preview resolves through the
same remark step. A `cairn:` link whose id is missing from the index renders in a distinct
broken-link style with a plain-language note. It borrows the Obsidian unresolved-link cue
and tells the author the moment a target goes missing.

**Deleting a linked-to page warns first.** When an author deletes or unpublishes a page that
other pages link to, the admin names the inbound links before proceeding, for example "3
pages link here", and asks for confirmation. Sanity enforces the same referential integrity,
and the warning stops silent orphaning at the source.

**A save that would orphan a link is blocked with a fix.** If a save would commit a body
that links to a now-missing target, the admin blocks the commit, states which link is broken
in plain language, and offers a one-click fix to remove the link or pick a new target. This
is the friendly face of failing the build.

**The build is the final backstop.** A dangling `cairn:` token fails the build, so a broken
internal link never reaches production. This guarantee should almost never fire, because the
picker, the preview, the delete guard, and the save guard catch the problem in human
language first. The build failure exists to guarantee correctness; the author meets any
problem earlier and in plain words.

## Where it lives in code

- The **resolver** is a remark/rehype step in `render/pipeline.ts` plus a small function
  that turns a concept and id into a permalink over the existing content index.
- The **picker UI** is a `LinkPicker.svelte` beside `ComponentPalette.svelte`, both calling
  the `registerInsert` seam on `MarkdownEditor`. The `[[` autocomplete is a CodeMirror
  extension passed through the `plugins` prop.
- The **candidate and integrity data** come from `delivery/content-index.ts` and
  `delivery/site-index.ts`, already built for delivery.
- The **save guard** lives in the content save action and the **delete guard** lives in the
  content delete path. Both read the content index to find inbound links.

## Scope and sequencing

This capability layers on the admin editor (Plan 05) and the render engine (Plan 04). It
lands as its own numbered plan once the editor is in place. It shares id-resolution and
corpus-rewrite machinery with the deferred lifecycle and rename pass, so planning the two
near each other keeps the related work together.

The v1 cut is the token, the build-time resolver, the two picker entry points, the preview
flag, the delete guard, the save guard, and the build backstop.

## Deferred to future passes

These extensions are out of v1 and worth keeping on the roadmap. Each is recorded here so
the later pass starts from a written intent rather than a cold start.

### Deep links to a heading

Let a link target a specific section of a page, in the form `cairn:posts/<id>#section`. The
resolver would append the heading's anchor, the slug `rehype-slug` already assigns, to the
resolved permalink. The picker would offer a second step that lists a target page's headings
once it is chosen. This depends on reading a target's heading structure at edit time, which
the content index does not carry yet.

### Create-on-link

Let an author link to a page that does not exist yet, the way Obsidian creates a note from an
unresolved link. Selecting "create new page" from the picker would scaffold a draft of the
right concept, insert a link to its id, and drop the author into the new page. This needs the
content model to support a draft state cleanly, so it waits on that work.

### Admin link-health view

A "Links" page in the admin that lists every broken internal link across the corpus, so an
author repairs links on their own schedule without a blocked deploy. The view is the richer
form of the save guard. It turns the build backstop from a hard stop into a dashboard the
author drives. It depends on a corpus-wide link scan, which the lifecycle pass also wants, so the
two share that scan.

### External-link checking

Verify that outbound links to other sites still resolve, and flag ones that return a 404.
Outbound links are a different problem from internal ones, because cairn does not own the
targets and cannot resolve them at build. It would run as a scheduled check, a Cron-triggered fetch,
rather than a build step, and report into the same link-health view.

### Backlinks

Show, on a page's edit screen, which other pages link to it. The data is the same
inbound-link index the delete guard already computes. Surfacing it as a panel gives an author
the reverse view of their content graph. The work is small once the inbound-link index
exists, so it pairs naturally with the link-health view.

## Testing notes

- The resolver is a pure transform over markdown and an index, so it tests as a unit. A valid
  `cairn:` link rewrites to the permalink, a missing id renders the broken-link form, a
  non-`cairn:` link stays untouched, and an external link stays untouched.
- The save and delete guards test against a real miniflare D1 and content index in the
  integration project, since they read committed content.
- The picker tests as a component. The candidate list filters by title, a selection inserts
  the token, and the keyboard path opens and dismisses the list.
