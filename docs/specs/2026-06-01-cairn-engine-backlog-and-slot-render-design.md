# Engine Backlog and the Component Slot Render Path: Design

> **Status:** Design, approved in brainstorming 2026-06-01. Sequences the engine work that
> precedes the site migrations. Extends the component initiative design
> (`2026-05-31-cairn-site-components-design.md`) with the render path that design left
> under-specified.

## Why this exists

The delivery-surface DX pass shipped and published as `0.11.0`. Two sites now wait to migrate:
ecnordic onto the new component model and the published `/delivery` surface, and 907-life on a
larger version catch-up. Before those migrations, the engine carries a backlog of carried
follow-ups and hardening, and one of them is a true prerequisite: the component slot render path
does not exist yet.

The decision is to clear the engine backlog first, as three surface-focused passes, and hold the
larger roadmap initiatives out so the migrations are not gated behind months of new feature work.

## The three passes

Each pass is one distinct verification surface, sized so it can be implemented, tested, and
reviewed as a unit.

1. **Component completion.** The slot render path (the subject of most of this doc), plus the
   render and grammar hardening on the same surface, the Plan 2 admin-form fixes, and the live
   `/admin` guided-insert smoke. This pass unblocks the ecnordic component migration.
2. **Delivery and SEO hardening.** Skip-drafts at build validation, per-entry `image`/`robots`/
   `author` in the catch-all SEO head, the feed/excerpt/permalink edge cases, and typed reads
   (infer the frontmatter type from the concept fields and apply the validator's normalized
   `data` on read). Typed reads is the largest piece and rides this pass.
3. **Auth hardening.** The `__Host-` session-cookie prefix, `/admin` security headers, a
   rate-limit plus `waitUntil` on the request endpoint, and install-token KV caching.

Held out as their own future initiatives, not backlog: the internal-link picker, content
lifecycle (atomic Git move, delete, rename), the settings editor, the CairnExtension dispatch,
the `create-cairn-site` scaffolder, and OpenGraph image generation / redirects / i18n.

## The gap Pass 1 closes

The component initiative's design locked that `build()` stops sniffing headings and reads explicit
named slots. Plans 1 and 2 shipped the grammar machines (`serializeComponent`, `parseComponent`,
`validateComponent`) and the guided-insert form. The render side never caught up.

`remarkDirectiveStamp` stamps only registered component directives (`known.has(node.name)`). A
nested slot directive such as `:::title` or `:::actions` is not a registered name, so it is never
stamped, never gets an `hName`, and is dropped on the way to hast. The guided-insert form can
already produce slot markup that renders to nothing. And `build(node)` runs at the hast stage with
only a raw node, so a site reading slots today would hand-walk the tree, which is the same
fragility class as the current heading-sniffing.

So Pass 1 is the slot render path end to end, not just a reader bolted onto `build()`.

## The slot render path

Three steps, all engine-owned, so insert, validation, and render cannot disagree about the
grammar.

### 1. Stamp slots at remark

Within a registered component, mark each nested slot directive so it survives to hast in a
readable shape. The stamp resolves the `[label]` title shorthand into the `title` slot and marks
repeatable-slot items. A reasonable shape is `data-slot="<name>"` on the slot's wrapper element,
with repeatable items carried as the list the serializer already emits. The exact marker is a plan
detail; the contract is that every slot the grammar can write is recognizable in the hast tree.

### 2. Partition at dispatch

In `rehypeDispatch`, before calling a component's `build()`, split the stamped hast children into
named slots. Unmarked children are the default body. A named slot collects its marked subtree. A
repeatable slot collects an ordered list of item subtrees. The result is structured slots whose
values are rendered hast, which is what `build()` needs to arrange.

### 3. Hand `build()` the structured slots

`build()` changes from `build(node)` to `build(ctx)`, where `ctx` carries the parsed attributes,
the partitioned slots (rendered hast per named slot, arrays for repeatable slots), and the node
for escape hatches. The engine partitions once and `build()` arranges hast. No site `build()`
walks the tree.

This is a breaking change to the `ComponentDef.build` surface, so it bumps the cairn-cms version.
The initiative is already breaking on `ComponentDef`, so this is the natural place to land the
change. It retires `splitHead` and the heading-sniffing fragility for good, and it gives the
scaffolder template one clean `build(ctx)` pattern to copy.

### Why this altitude

The engine owns the one canonical grammar. Making `build()` re-derive slots from the hast tree
would push grammar knowledge back into every site, which is what the redesign exists to prevent. A
`readSlots(node, def)` accessor was the alternative. It is additive and non-breaking, but it leaves
`build()` holding the raw node, so a site can still hand-walk and drift. The `build(ctx)` contract
makes the structured slots the only thing `build()` sees, so agreement with the grammar is
enforced, not merely conventional.

## Folded-in hardening (same surface)

These ride Pass 1 because they live in the render and component-grammar code the pass already
touches.

- `splitHead` dereferencing a missing `<h2>` stops being reachable once `build()` reads slots
  instead of sniffing headings. The crash retires with the heading convention.
- `glyph` serializes `d="undefined"` for an unknown icon. A one-line guard in the same render
  path.
- `validateComponent` parses the markdown twice. Collapse to one parse.
- The Plan 2 form keys repeatable items by index, so a mid-list removal reuses DOM nodes by
  position. A stable per-item id fixes the focus identity. Plus the small a11y polish: the
  redundant `aria-label` on flat fields, the generic per-item input label, and the `IconPicker`
  `aria-pressed` group that could move to radiogroup semantics.
- The live interactive `/admin` guided-insert smoke is the one unverified Plan 2 surface. This
  pass makes the inserted slot markup actually render, so it is the natural place to verify the
  full flow against a real Worker.

## Engine and site responsibilities

- **cairn-cms** ships the slot stamp, the dispatch partitioner, the `build(ctx)` contract and its
  types, the folded hardening, and the tests, including a render-agreement test that serializes a
  component and asserts the rendered HTML through `build(ctx)`.
- **Each site** (ecnordic in the later migration) refactors its `build()` functions to the
  `build(ctx)` shape, reading named slots instead of walking the tree. That migration is a
  separate site-pass after this lands and publishes.

## Testing strategy (Pass 1)

- **Unit (node):** the stamp marks slots and resolves the label shorthand; the partitioner splits
  default body, named slots, and repeatable items; the `glyph` guard; the single-parse
  `validateComponent`.
- **Render agreement:** serialize a component with named and repeatable slots, render through the
  full pipeline and a `build(ctx)`, and assert the HTML. This proves insert and render agree on
  the grammar, the gap that exists today.
- **Component (browser):** the Plan 2 form repeatable-item identity holds across a mid-list
  removal; the a11y fixes.
- **Live smoke:** the `/admin` guided-insert flow against a real Worker.

## Scope and boundaries (Pass 1)

- The slot render path covers flat components, named slots, and one level of repeatable items, the
  same bound the grammar already has. Deeper nesting and nested components stay deferred.
- `build()` stays hand-written per site. It moves to `build(ctx)` and reads slots; it is not
  generated.
- The delivery, SEO, and auth hardening are Passes 2 and 3, not this one.

## Relationship to other work

This completes the render half of the component initiative
(`2026-05-31-cairn-site-components-design.md`), whose Plans 1 and 2 shipped the grammar and the
form. It is the prerequisite for the ecnordic component migration. Passes 2 and 3 are independent
of it and of each other, and they get their own just-in-time design and plans.
