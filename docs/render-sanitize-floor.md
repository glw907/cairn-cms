# The render sanitize floor

cairn's render path runs author markdown through a unified pipeline and emits HTML that a site
delivers with `{@html}`. Author content can carry raw HTML, so the pipeline cleans it before
delivery. This document states what the floor keeps, what it strips, and what it rewrites, so a
site knows the guarantee it inherits and what is safe to extend.

Two pieces make up the floor. `buildSanitizeSchema` in `src/lib/render/sanitize-schema.ts`
builds the allowlist that `rehype-sanitize` enforces. `rehypeAnchorRel` in the same file forces a
`rel` on `target="_blank"` anchors. Both wire into the pipeline through `createRenderer` in
`src/lib/render/pipeline.ts`.

## Where the floor runs

`rehype-sanitize` runs after `rehype-raw` and before the registry dispatch. `rehype-raw` parses
the author's raw HTML into real hast nodes first, then the floor cleans that parsed tree. Running
before the dispatch means the dispatch's `build()` output is never sanitized. A site author writes
that build code, so its output is trusted, and the inline SVG icons a component emits stay intact
rather than being stripped as unknown tags. Anchor-rel runs last in the rehype chain, after the
dispatch and after `rehype-slug`, so it also covers anchors a component builds rather than only
anchors from author markdown.

When `unsafeDisableSanitize` is set, the floor plugin is dropped from the chain and no sanitize
runs at all. The anchor-rel transform still runs unless `anchorRel` is `false`.

## What the floor keeps

The allowlist starts from `hast-util-sanitize`'s `defaultSchema`, the GitHub-lineage allowlist.
On top of that base the engine admits exactly what its render needs.

- The directive markers. `FIXED_MARKERS` (`dataPrimitive`, `dataSlot`, `dataRole`, `dataRise`)
  plus the `dataAttr<Key>` markers derived from the component registry survive the floor as inert
  data attributes, so the dispatch can read its stamps after the floor has run.
- Three benign author tags real content uses: `nav`, `details`, and `summary`.
- A free-form `className` on every element. The engine drops `defaultSchema`'s per-tag `className`
  tuple on the `a` entry first, because that tuple would otherwise restrict a link's class to a
  single footnote value and strip an author's link class.
- `target` and `rel` on anchors.
- The inert `cairn:` href scheme on top of the default protocol allowlist. The resolver rewrites a
  `cairn:` link to a live permalink before delivery. An unresolved one survives as its inert token
  text, a visible signal of a broken link, never an executable vector.

## What the floor strips

The strip is the `defaultSchema` behavior, which the engine extends but never weakens. It removes
`<script>`, inline event-handler attributes (`onclick` and the rest), and dangerous link protocols
such as `javascript:` and `data:` on an `href`. An image `src` still admits a `data:` URI under
`defaultSchema`, so an inline data image renders. Any tag or attribute outside the allowlist is
dropped. While the `cairn:` admission widens the href protocol list, the dangerous-protocol strip
is preserved alongside it.

## What the floor rewrites

`rehypeAnchorRel` forces a `rel` on every `target="_blank"` anchor to prevent reverse-tabnabbing.
The default value is `noopener noreferrer`. The transform is scoped to `target="_blank"` anchors,
not to every external link, so an ordinary same-tab link keeps the `rel` the author wrote.

This value comes from the renderer's `anchorRel` option. Pass a string to set a different `rel`.
Pass `false` to disable the injection entirely, for a site that owns its own anchor hardening.

## Extending the allowlist

A `sanitizeSchema` option receives the engine's default schema and returns the schema to use.
A site adds the benign tags or attributes its content needs by extending the argument it receives.
Because the extension starts from the safe base, a site can only add to the allowlist, never remove
the dangerous strip. This is the supported way to widen what the floor keeps.

`unsafeDisableSanitize` is the developer-only escape that turns the floor off. It reintroduces the
XSS vector the floor closes, so it suits only a site whose content is fully developer-controlled.
It is a code-level adapter decision and never an editor-facing setting.
