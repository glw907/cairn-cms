<!-- LEGACY TEXT, UNRELIABLE: this page predates the from-zero rewrite and must never be cited as fact. Facts come from src/ and the four ratified pages only. It will be deleted and rewritten. -->

# The render sanitize floor

cairn's render path runs author markdown through a unified pipeline and emits HTML that your site
delivers with `{@html}`. Author content can carry raw HTML, so the pipeline cleans it before
delivery. This page states what the floor keeps, what it strips, and what it rewrites, so you know
the guarantee your site inherits and what is safe to extend.

Three pieces make up the floor. `buildSanitizeSchema` in `src/lib/render/sanitize-schema.ts`
builds the allowlist that `rehype-sanitize` enforces. `rehypeAnchorRel` in the same file forces a
`rel` on `target="_blank"` anchors. `rehypeSinkGuard` is a post-dispatch guard that inspects the
fully-built tree last. All three wire into the pipeline through `createRenderer` in
`src/lib/render/pipeline.ts`.

## Where the floor runs

`rehype-sanitize` runs after `rehype-raw` and before the registry dispatch. `rehype-raw` parses
the author's raw HTML into real hast nodes first, then the floor cleans that parsed tree. Running
before the dispatch deliberately leaves the dispatch's `build()` output unsanitized at that point,
so the inline SVG icons a component emits stay intact rather than being stripped as unknown tags.
Anchor-rel runs last in the rehype chain, after the dispatch and after `rehype-slug`, so it also
covers anchors a component builds rather than only anchors from author markdown.

## The post-dispatch sink guard

`rehypeSinkGuard` runs last in the pipeline and inspects the fully-built tree, so it covers the
attribute values a component `build()` produces as well as the values that survive the floor. It
neutralizes the unsafe URL schemes `javascript:`, `data:`, and `vbscript:` in the URL-bearing
attributes, including `href`, `src`, `srcset`, `xlink:href`, `poster`, `formaction`, `action`,
`object`'s `data`, and `background`. It removes inline `on*` event handlers. It strips inline
`style` wholesale. Safe schemes, relative URLs, anchors, and the `cairn:` token are preserved.

The guard's boundary is the URL scheme check plus the `on*` and `style` strip. It does not remove
a `build()`-emitted raw `<script>`, `<style>`, or `<iframe srcdoc>` element node. A `build()` that
emits those is running site-developer code (your code), and the pre-dispatch floor has already
cleaned the author markdown.

You no longer need to coerce an attribute value by hand inside a `build()` for safety, since the
guard catches an unsafe value wherever it lands. Routing untrusted input into a sink is still
discouraged. A `build()` that needs dynamic styling should use a class or an inert `data-*`
attribute (the guard strips inline `style`).

When `unsafeDisableSanitize` is set, the floor plugin and the sink guard are both dropped from the
chain and no sanitize runs at all. The anchor-rel transform still runs unless `anchorRel` is
`false`.

## What the floor keeps

The allowlist starts from `hast-util-sanitize`'s `defaultSchema`, the GitHub-lineage allowlist.
On top of that base the engine admits exactly what its render needs.

- The directive markers. `FIXED_MARKERS` (`dataPrimitive`, `dataSlot`, `dataRole`, `dataRise`)
  plus the `dataAttr<Key>` markers derived from the component registry survive the floor as inert
  data attributes, so the dispatch can read its stamps after the floor has run.
- Benign author tags real content uses: `nav`, `details`, `summary`, and the figure pair `figure`
  and `figcaption`. These join the base, not a renderer option a consumer can replace, so a captioned
  figure survives the floor on every site, including one that supplies its own `sanitizeSchema`.
- A free-form `className` on every element. The engine drops `defaultSchema`'s per-tag `className`
  tuple on the `a` entry first (that tuple would otherwise restrict a link's class to a single
  footnote value and strip an author's link class).
- `target` and `rel` on anchors.
- The inert `cairn:` href scheme on top of the default protocol allowlist. The resolver rewrites a
  `cairn:` link to a live permalink before delivery. An unresolved one survives as its inert token
  text, a visible signal of a broken link, never an executable vector.

## The content presentation charter

The free-form `className` the floor keeps raises a question the figure makes concrete: may content
carry presentation? The charter is bounded. Content may carry a closed, theme-owned set of layout
role classes, and nothing more. A figure's placement is the live example: `:::figure{.wide}` stamps
`<figure class="cairn-place-wide">`, and the `remarkFigure` step validates the class against the
closed set `center`, `wide`, `full` before the floor ever sees it, so the directive can never carry a
freeform value. The theme owns every pixel of what `wide` means; the content owns only the choice of a
named role from the set.

This is a deliberate, owned exception to "no presentation in content," not a loophole. `wide` and
`full` are layout, and calling them semantic intent would not change that. The boundedness is the
invariant that holds. Content never carries a freeform presentation value: no pixel size, no color, no
margin, no float, no literal `align=` or `width=`. A directive carries identity, decorative wrapping,
and a bounded role from a closed set, and the editor controls only ever write one of those.

## What the floor strips

The strip is the `defaultSchema` behavior, which the engine extends but never weakens. It removes
`<script>`, inline event-handler attributes (`onclick` and the rest), and dangerous link protocols
such as `javascript:` and `data:` on an `href`. One default is worth knowing about: an image `src`
still admits a `data:` URI under `defaultSchema`, so an inline data image renders. Any tag or
attribute outside the allowlist is dropped. While the `cairn:` admission widens the href protocol
list, the dangerous-protocol strip is preserved alongside it.

## What the floor rewrites

`rehypeAnchorRel` forces a `rel` on every `target="_blank"` anchor to prevent reverse-tabnabbing.
The default value is `noopener noreferrer`. The transform is scoped to `target="_blank"` anchors,
not to every external link, so an ordinary same-tab link keeps the `rel` the author wrote.

The value comes from the renderer's `anchorRel` option. Pass a string to set a different `rel`, or
pass `false` to disable the injection entirely, for a site that owns its own anchor hardening.

## Extending the allowlist

The `sanitizeSchema` option receives the engine's default schema and returns the schema to use.
Add the benign tags or attributes your content needs by extending the argument you receive.
Because the extension starts from the safe base, you can only add to the allowlist, never remove
the dangerous strip. This is the supported way to widen what the floor keeps.

`unsafeDisableSanitize` is the developer-only escape that turns the floor off. It reintroduces the
XSS vector the floor closes, so it suits only a site whose content is fully developer-controlled.
It is a code-level adapter decision and never an editor-facing setting.
