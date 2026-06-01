# Site UI Component Registry and Guided Authoring: Design

> **Status:** Design, approved in brainstorming 2026-05-31. Not yet planned or implemented.
> Supersedes nothing. Builds on the CodeMirror editor swap (`feat/editor-codemirror-swap`).

## Goal

Give each cairn site one place to define all of its UI components (cards, CTAs, grids, and the
rest) and declare how each is called from markdown. The single definition drives three surfaces at
once: the build-time render, a guided insert form for non-technical editors, and a generated
reference file that an author can point an LLM (claude.ai) at to help write content.

The optimization target is the non-technical editor. The site author should add a card by filling a
small form, instead of hand-writing `:::card{icon="snowflake"}` and getting the structure right.

## Background

cairn already has half of this. A site declares directive components through `defineRegistry({
components: ComponentDef[] })` and wires the registry into its `cairn.config.ts`. The remark calling
convention is the container directive (`:::card`). ecnordic-ski is the proving ground, with a
`src/lib/markdown/components.ts` that hand-writes a hast `build()` per component.

Two things are missing. The authoring model is low-level: defining a component means manipulating a
syntax tree with `hastscript`'s `h()`, and the editor still types raw directive markup. And there is
no schema, so nothing validates a directive, drives a form, or documents the catalog.

The CodeMirror editor swap shipped a `registerInsert(text)` seam and a design-accurate preview pane.
That seam is what a guided insert writes through, so this work builds directly on it.

## Prior art and where cairn sits

Research across the field (May 2026) placed cairn's approach and corrected three early decisions.

- **Markdoc** (Stripe) is the closest analog: a typed schema declares each tag's attributes with
  validation, content stays plain text with no code execution, and one document renders to React or
  HTML. cairn's plan is a Markdoc-style schema layer on top of `remark-directive`.
- **MDX** compiles content to JavaScript and runs arbitrary code, which is unsafe for magic-link
  authors. cairn's generic-directive grammar avoids that and degrades gracefully in plain markdown.
- **TinaCMS** and **Decap** are the git-backed editor analogs. Both insert components into the
  markdown body through guided forms, and both do full round-trip editing. Neither is insert-only.
- **Nuxt Content MDC** uses explicit named slots (`#title`, `#default`). Every system that started
  with an implicit "first heading is the title" heuristic moved to explicit slots, because the
  heuristic captures legitimate body headings, ceilings out at two regions, and leaves a stray `##`
  in any fallback render.
- **Gutenberg** and **Storyblok** surface a per-block description in their inserters; the git-backed
  tools (Tina, Decap) show only a label. Showing a description in the picker is a real gap cairn fills.
- **llms.txt** has weak autonomous-crawler adoption, but its sweet spot is the deliberate
  "point a model at one curated file" path, which is exactly cairn's reference-file use.

Sources are listed at the end.

## Locked decisions

1. Optimize for the non-technical editor.
2. Guided insert form, written through the editor's `registerInsert` seam, with a live preview.
3. Insert-only in v1, but the grammar and a `parseComponent` reader are designed now so round-trip
   editing is a later addition, not a rewrite. Round-trip is the git-backed market standard, so this
   keeps v1 small without painting the design into a corner.
4. v1 covers flat components and one level of repeatable or nested items (grids, lists of cards).
5. One canonical, cairn-owned directive grammar. Every component is called the same way.
6. Explicit named slots, not an implicit heading. A default body plus optional named slots, added
   only when a component needs more than one region.
7. Description and intended-use are first-class on every component.
8. The component schema drives insert, validation, and docs. The hast `build()` stays hand-written
   per site, refactored to read the named slots.
9. Validation runs at save and at build, checking each directive against its component's schema.
10. The reference file follows the `llms-full.txt` shape: one self-contained markdown document with
    the content inlined, headed by the conventional llms.txt H1 and blockquote.

## The model: a component is attributes, slots, and render

A registered component declares four things.

- **`attributes`** are the `{key="value"}` data on the directive, such as `icon` and `role`. Each is
  a typed field with validation, modeled on Markdoc's attribute schema: a type, an optional default,
  an optional enum allowlist, and a required flag. v1 field types are `text`, `select` (enum),
  `icon` (constrained to the site's icon-set keys), and `boolean`.
- **`slots`** are named content regions. There is always a default body slot. A component declares
  additional named slots (for example `title` or `actions`) only when it needs more than one region.
  Each slot's kind is `markdown`, `inline`, or `repeatable`. The repeatable kind holds a list of
  items, each item a small group of sub-fields (for grids and lists of cards), bounded to one level
  of nesting in v1.
- **`description` and `use`** are one line of what the component is and one line of when to reach for
  it. They feed the picker, the validator's error hints, and the reference file.
- **`build(node)`** is the hast render, reading the attributes and named slots. It stays hand-written
  per site and is refactored away from heading-sniffing to reading the declared slots.

The attributes and slots together are the formal calling convention. The same declaration produces
the form, the validation, the serialized markup, and the documented syntax.

## The canonical grammar

cairn owns exactly one directive shape, and every component follows it.

```
:::cta{icon="snowflake"}
Group and private lessons all season long.

:::title
Book your winter lesson
:::

:::actions
- Beginner-friendly
- Equipment included
:::
:::
```

The default body is the unmarked content. Named slots are nested directives (`:::title`,
`:::actions`). They stay valid directive syntax, so an unknown one degrades to plain text rather than
to a stray `##` heading, and the parser reads them unambiguously. For the common title-plus-body
case, the directive label shorthand `:::cta[Book your winter lesson]` fills the `title` slot, so
simple components stay terse.

A repeatable slot serializes its items as a markdown list inside the slot, one entry per item, which
is the shape ecnordic's `grid` already renders. Each item's sub-fields compose into the entry.

Because cairn owns this grammar end to end, the serializer writes it, the validator checks it, and
`build()` consumes it. Insert, validation, and render cannot disagree about how a component is
called.

## Three machines over one grammar

- **`serializeComponent(def, values)`** turns guided-form values into the directive markdown above.
  This is the insert path.
- **`validateComponent(node, def)`** checks a directive against its schema: a known name, allowed and
  well-typed attributes, enum values in range, and required slots present. It runs at save and at
  build, so a hand-edit that drifts from the contract is caught instead of silently mis-rendering.
- **`parseComponent(node)`** reads a directive back into `{ attributes, slots }`. It is not surfaced
  in v1. It exists so that round-trip editing (select a block, reopen the form, save) is a later
  addition rather than a grammar rewrite. One unit test holds `serialize` then `parse` to identity.

All three share the grammar with `build()`, which is what keeps the four representations aligned.

## The guided insert form

The admin palette's insert control becomes pick-then-fill.

- The picker lists each component by label with its description and intended-use, so a non-technical
  author can choose without knowing directive syntax. This is the affordance git-backed tools omit.
- Picking a component renders a form from its schema. Attributes reuse cairn's existing frontmatter
  field inputs. Named slots render as labeled markdown areas. A repeatable slot renders as an
  add-and-remove list of item sub-forms.
- Submit runs `validateComponent`, then `serializeComponent`, then inserts the markup at the cursor
  through the editor's `registerInsert` seam. The preview pane renders it immediately.

After insert, the directive markdown is visible and editable in the CodeMirror source, which is how
an editor changes a component in v1. The `parseComponent` reader is the seam for turning that into a
guided round-trip edit later.

## The component reference file

`generateComponentReference(registry)` emits one self-contained markdown document in the
`llms-full.txt` shape. It opens with an H1 naming the site's component library and a blockquote
summary, the recognizable llms.txt header. Then one section per component carries its label,
description, intended use, the canonical directive syntax derived from its attributes and slots, and
a worked example.

The site writes the output to a committed path, recommended as `docs/cairn-components.md`, and points
claude.ai at that one file. Because the document is generated from the registry, it cannot drift from
the real components. Either a small site script or a build hook regenerates it.

## Engine and site responsibilities

- **cairn-cms (the engine)** ships the extended `ComponentDef` and schema types, the new field types
  (`select`, `icon`, `repeatable`), the `serializeComponent` / `validateComponent` / `parseComponent`
  trio, `generateComponentReference`, and the admin guided-form component. It runs validation in the
  save action and exposes a build-time check.
- **Each site** supplies its component definitions in the new shape (attributes, slots, description,
  use), its `build()` functions refactored to read named slots, and a script that writes the
  reference file.

## Scope and boundaries (v1)

- Insert-only. Round-trip editing is designed-for through `parseComponent` but not shipped.
- Repeatable slots are bounded to one level of nesting. An item is a flat group of sub-fields. Deeper
  recursion is deferred.
- `build()` stays hand-written. It moves from heading-sniffing to reading slots, which also removes
  the existing fragility where a missing `<h2>` crashes `splitHead`.
- Validation covers names, attribute types and enums, and required slots. Cross-field or content-body
  validation beyond that is out of scope.

## Testing strategy

- **Unit (node):** `serializeComponent` table cases (attributes, default body, named slots, the
  label shorthand, repeatable items, escaping); `validateComponent` cases (unknown name, wrong
  attribute type, out-of-enum value, missing required slot); `parseComponent` round-trip to identity;
  `generateComponentReference` snapshot per component shape.
- **Component (browser):** the picker lists components with descriptions; the form renders attributes,
  named slots, and the repeatable add-and-remove list; submit validates and inserts the correct
  markdown; the preview updates.
- **Render agreement:** serialize a component, render the result through `build()`, and assert the
  expected HTML. This proves insert and render agree on the grammar.

## Phasing

The work is too large for one plan, so it decomposes into three.

1. **Engine grammar and schema.** The types, the field-type additions, the serialize/validate/parse
   trio, the reference generator, and their tests. No UI.
2. **Admin guided form.** The pick-then-fill form, the repeatable item editor, and the wire-up to
   `registerInsert` and the save-time validator.
3. **Per-site migration.** ecnordic first as the proving ground, then 907-life. Each site moves its
   `ComponentDef` array to the new shape, refactors `build()` to read slots, and adds the
   reference-file script.

This is a breaking change to the `ComponentDef` surface, so it bumps the cairn-cms version.

## Relationship to other initiatives

This builds on the CodeMirror editor swap (the `registerInsert` seam and the preview pane). The
guided insert form is a sibling of the internal-link picker from the editor-internal-links
initiative; both are insert affordances on the new editor surface, and they should share a
picker-dialog pattern.

## Open questions and deferrals

- The exact spelling of the nested-slot directive and the colon-nesting the serializer emits is a
  spec-for-the-plan detail. The recommended form is a nested container directive per named slot, with
  the `[label]` shorthand reserved for the `title` slot.
- Round-trip editing, deeper repeatable nesting, and nested-component items (a true `:::card` inside a
  `:::grid`) are deferred past v1.
- Whether the reference file also lives at a site's web root as a literal `/llms.txt` companion is a
  per-site call, not an engine concern.

## References

- Markdoc tags and attributes: https://markdoc.dev/docs/tags , https://markdoc.dev/docs/attributes
- Nuxt Content MDC slots: https://content.nuxt.com/docs/components/slot
- MDX, on running arbitrary code: https://mdxjs.com/docs/using-mdx/
- remark-directive (syntax only, no registry): https://github.com/remarkjs/remark-directive
- TinaCMS embedded MDX components: https://tina.io/docs/mdx/
- Decap editor components (git-backed, round-trip): https://decapcms.org/docs/custom-widgets/
- Gutenberg block metadata and inserter description: https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/
- llms.txt: https://llmstxt.org/
