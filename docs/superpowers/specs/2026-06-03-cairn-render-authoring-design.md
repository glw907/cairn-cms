# Render and component authoring (DX pass P3) Design

**Status:** approved 2026-06-03.

**Goal:** Close five render and component-authoring findings from the ecnordic `0.21` migration DX
backlog (items 7, 8, 9, 11, 15). Each is a small, well-scoped fix in the render module. Together they
let a site author component builds against one correct icon path, a shared head helper, a configurable
anchor `rel` policy, and a clean empty-label form.

**Backlog source:** `docs/dx-backlog-ecnordic-migration.md`. The per-finding evidence lives in the site
repo at `ecnordic-ski/docs/cairn-dx-findings.md`.

## Background

The render engine compiles author markdown to HTML through a remark and rehype pipeline in
`src/lib/render/`. A remark step (`remarkDirectiveStamp` in `remark-directives.ts`) stamps each
component directive with marker properties. A rehype step (`rehypeDispatch` in `rehype-dispatch.ts`)
reads those markers, builds a `ComponentContext`, and calls the component's `build(ctx)` to produce the
final hast. `createRenderer(registry, options)` in `pipeline.ts` assembles the chain. The reference
consumer is the showcase; the richest real consumer was ecnordic, whose component builds surfaced these
findings.

## The unifying thread: one icon path

The pass reads cleanest as one architectural correction plus four independent fixes. The stamper today
writes two icon markers. `dataIcon` carries the resolved icon, including a `defaultIconByRole` default,
but no current build reads it (only the removed `splitHead` did). The declared path `dataAttr<key>`
carries only the author's literal value, so a role default never reaches the `ctx.attributes` a build
actually reads. ecnordic compensated with a hardcoded `caution` to `warning` fallback in its own build.

Item 9 collapses these to one path: the role default flows into the declared attribute, and `dataIcon`
goes away. That correction is what lets the new head helper (item 7) read a correct icon from
`ctx.attributes`. The remaining items (7's helper shape, 11's rel option, 15's label drop, 8's docs) are
independent.

## The five changes

### Item 9: route the role default through the declared icon attribute

`remarkDirectiveStamp` resolves the effective icon for a container directive as the author's `icon=`
value, falling back to `registry.defaultIcon(name, role)`. Today it writes that resolved value to the
fixed `dataIcon` marker and writes the declared `dataAttr<key>` markers only from the raw author
attributes, so the default is lost on the path builds read.

The fix folds the resolved icon into the declared attribute. When the component declares an attribute of
`type: 'icon'` and the author supplied no value for it, the stamper writes the resolved default into that
attribute's `dataAttr<key>` slot. The build then reads it through `ctx.attributes` by that field's key.
`defineFields` plus `defaultIconByRole` is the single source.

The `dataIcon` write is removed, along with its entry in `FIXED_MARKERS` in `sanitize-schema.ts`. Nothing
in the current engine reads `dataIcon`, so this removes dead weight rather than a live path.

Contract, stated in the docs: a component that declares `defaultIconByRole` must also declare a
`type: 'icon'` attribute for the default to reach its build. A component with a role default but no icon
attribute has no declared slot to carry the value, so the default does not apply; this is the same
limitation the declared-attribute-read contract (item 8) describes.

### Item 7: a shared head helper

A titled component build rebuilds the icon-plus-heading head by hand since `splitHead` was removed. The
new `headRow` helper factors that shape, matching the idiom of the existing `cardShell` and `iconSpan`
helpers in `rehype-dispatch.ts`: it takes already-built primitives and returns one `Element`, with no
tree-walking and no `ctx` coupling.

```ts
headRow(title: ElementContent[], icon?: Element): Element
```

It returns `<div class="ec-head">[icon]<h2 class="card-title">{title}</h2></div>`, the markup
`splitHead` produced and the class family the engine helpers already use (`iconSpan` emits `ec-icon`,
`cardShell` emits `card-body`). A build calls `headRow(ctx.slot('title'), iconEl)`, where it builds
`iconEl` from `ctx.attributes.icon` through its own `makeIcon`, the way `cardShell` takes already-built
body content. The helper is exported from the package root beside `cardShell` and `iconSpan`.

The heading stays an `<h2>`, matching `splitHead` and the current site builds. A configurable heading
level is a future knob, not part of this pass.

### Item 11: a configurable anchor rel policy

`rehypeAnchorRel` in `sanitize-schema.ts` forces `rel="noopener noreferrer"` on every `target="_blank"`
anchor. It runs last in the rehype chain, after the sanitize floor and after the dispatch, so it also
hardens component-built anchors. A site adopting the engine render inherits this with no way to opt out,
since the one extension point it has (`sanitizeSchema`) controls the allowlist, not forced injection.

The fix adds an `anchorRel` member to `RendererOptions`:

```ts
anchorRel?: string | false;
```

The default is `'noopener noreferrer'`, which preserves today's behavior. A string sets the `rel` value
the plugin injects on `target="_blank"` anchors. `false` disables the injection. `rehypeAnchorRel` is
parameterized to take the policy, and `createRenderer` threads the option through in `pipeline.ts`. The
sanitize allowlist already admits `rel` on anchors, so no schema change is needed.

### Item 15: drop an unclaimed directive label

A directive label (`[...]` in `:::panel[Title]{...}`) arrives as a paragraph flagged with
`data.directiveLabel`. `remarkDirectiveStamp` marks it as the `title` slot only when the component
declares a `title` slot. A component without a `title` slot leaves the label paragraph unclaimed, so it
falls through as ordinary body content. An empty `[]` against a title-less component renders as a stray
`<p></p>` ahead of the component.

The fix removes the unclaimed label paragraph from the children in that branch, so it never renders. The
target is precise through the `data.directiveLabel` flag, so only the directive label is affected, not a
genuine first body paragraph. An unclaimed label is removed whether empty or not, since a title-less
component has nowhere to render it. A build-validation warning on a non-empty unclaimed label is a
possible later refinement, recorded as a follow-up.

The docs gain a note that a title-less component's `insertTemplate` should omit the `[]`. The
serialization path (`serializeComponent`) already never emits a bare `[]`, so the guided insert form is
already correct.

### Item 8: state the declared-attribute contract

A build can read `ctx.attributes.X` for an attribute the component never declared and get `undefined` at
runtime with no signal. The resolution is documentation. The authoring guide states the contract: a
build reads only the attributes the component declares, and reading an undeclared key yields `undefined`.

The item 9 fix removes the concrete footgun that motivated this finding (the role default now reaches a
declared attribute). A component build is site-developer code with immediate visual feedback during
development, so a render-path runtime warning would add machinery disproportionate to the risk. No engine
code changes for this item.

## End-to-end proof

The showcase proves the two behavior changes through a real build. It gains a component build that calls
`headRow` (proving item 7) and a role-default alert with no explicit icon (proving item 9, the glyph now
reaching the build through the declared path). The showcase production build stays green, and the
prerendered output carries the expected head markup and the default glyph.

## Testing

The unit suite covers each change at its layer.

- Item 9: `render-remark-directives.test.ts` asserts the resolved role default lands on the declared
  attribute that a build reads, and that `dataIcon` is no longer stamped.
- Item 7: `render-rehype-dispatch.test.ts` asserts the `headRow` output shape (wrapper class, the
  optional icon placement, the `<h2 class="card-title">` carrying the title content).
- Item 11: `render-sanitize.test.ts` asserts the default `rel`, a custom string, and `false` disabling
  the injection.
- Item 15: `render-remark-directives.test.ts` asserts an unclaimed label paragraph is dropped and no
  stray `<p>` reaches the output.
- Item 8: no test (docs only).
- Any pipeline snapshot that captured `data-icon` is updated, since the marker is removed.

## Version

A minor bump to `0.24.0`. The surface additions (`headRow`, `anchorRel`) are additive, and the two
behavior changes (items 9 and 15) are output bugfixes. The `anchorRel` default preserves current
behavior. Nothing in the consumer surface reads `dataIcon`, so its removal is not a consumer break.

## Out of scope

- A configurable heading level on `headRow`.
- A runtime dev warning for an undeclared attribute read (item 8 resolved by docs).
- A build-validation warning for a non-empty unclaimed label (recorded as a follow-up).
- The other DX backlog items, which belong to P4 (the scaffolder) or are already done (P1, P2).
