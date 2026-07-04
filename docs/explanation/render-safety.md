# The render sanitize floor

Cairn runs every entry's author-written markdown through one cleaning step before it reaches a
visitor's browser, whether it came from an editor's draft, a pasted raw `<div>`, or a directive's
attribute value. [The security model](./security-model.md) states the guarantee it gives your site
and the trade-off it leaves you. This page is the pipeline behind that: where the sanitize step
sits, what it keeps and removes, and where your own component code stands relative to it.

## Two passes over one tree

`createRenderer` builds a single remark-then-rehype pipeline, and the sanitize step runs at a
specific point in it: after `rehype-raw` has turned an author's raw HTML into real nodes, and
before your registered components render. That ordering is deliberate. `rehype-raw` has to parse
the raw HTML into nodes before the floor can clean it, so the floor waits for `rehype-raw` to run
first. A component's `build()` function is your code, not the author's, so the floor runs before
dispatch, and it never sanitizes a component's output against the same allowlist an author's
markdown gets.

That leaves your own component code without a safety net between the floor and delivery, so a
second guard runs last, over the entire built tree, after every component has rendered. It strips
any `on*` handler or inline `style` attribute it finds, and neutralizes an unsafe URL scheme in any
URL-bearing attribute (`href`, `src`, `srcset`, and the rest). The guard strips it regardless of
which plugin or component emitted the node.

The pipeline also rewrites one thing outright: every anchor with `target="_blank"` gets `rel`
forced to `noopener noreferrer`, closing the reverse-tabnabbing hole a plain `target="_blank"`
opens. A site can change the value or turn the rewrite off entirely. It runs after component
dispatch, so it also covers an anchor your own component built, not just one an author wrote.

## What the floor keeps and strips

The floor is `rehype-sanitize` running `hast-util-sanitize`'s `defaultSchema`, the same
GitHub-lineage allowlist GitHub itself sanitizes user content against: no `<script>`, no inline
event handler, no `javascript:` or `data:` URL. Cairn starts from a schema other projects have
already hardened and extends it only where the engine's own output needs room.

The extensions are narrow and named:

- The directive markers (`data-primitive`, `data-slot`, `data-role`, `data-rise`, and one
  `data-attr-<key>` per declared component attribute) are inert `data-*` strings the dispatch step
  reads back after the floor runs. They carry no behavior of their own; stripping them would just
  break the dispatch, not close a hole.
- A handful of benign tags an author's content legitimately uses: `nav`, `details`, `summary`,
  plus `figure` and `figcaption` for the engine's built-in figure handling.
- A free-form `className` on every element and `target`/`rel` on anchors, so author-applied classes
  and link attributes survive.
- The `cairn:` URL scheme. A `cairn:` reference link resolves to a live permalink before the floor
  ever runs, so the normal case leaves nothing to admit. The scheme stays on the allowlist for the
  case where a caller passes no resolver at all (the admin's standalone component-insert preview,
  which renders one directive with neither `resolve` nor `resolveMedia` set): an unresolved token
  then survives to the output as inert text in an `href`, a visible broken-link signal, never as a
  scheme a browser acts on.

A site can extend this schema (`sanitizeSchema` on `RendererOptions`, covered in
[Configure rendering](../guides/configure-rendering.md#extend-the-sanitize-allowlist)) to admit
more of its own content's benign HTML. The function receives cairn's schema and returns the one to
use, so an extension adds to the allowlist rather than replacing it outright. `unsafeDisableSanitize`
removes the floor and the closing guard entirely. It exists for a site whose content is fully
developer-controlled, and it reopens the exact XSS vector the floor closes, so disabling it is a
code-level adapter decision; an editor's role can't reach it.

## Your components run trusted code from a closed vocabulary

An author writing markdown never gets to hand-write hast. A directive can only name a component
your registry actually declared, and the registry fixes its shape at declaration, not at parse
time: each attribute is one of a closed set of scalar types (`text`, `textarea`, `number`,
`select`, `url`, `email`, `date`, `datetime`, `boolean`, `icon`), validated the same way a
concept's own fields are, and an attribute key the component didn't declare is a validation error,
not a value that reaches `build()`. An empty required slot fails the same way. An author controls
which declared attributes and slots to fill in. The registry fixes the tags around them.

That closed vocabulary is why the floor doesn't need to sanitize `build()`'s output the way it
sanitizes raw author HTML: there's no path from an author's markdown into your component's
implementation except through typed, validated fields your own code declared the shape of.

## Islands widen the reach, so they carry one more rule

A `hydrate` component's static output ships as usual, but its declared attributes also travel to
the browser as a JSON string in a `data-cairn-props` attribute, escaped on emit and `JSON.parse`-d
on the client inside a try/catch. Turning that string into a script would need `JSON.parse` itself
to fail its own escaping, which doesn't happen. The engine's guarantee stops at "the prop arrives
as escaped data," not at what your island component does with it afterward. The props are
still author-controlled, so an island must never route one into `{@html}`, an `href` or `src` that
could carry a scheme, or an inline `style`. [Islands](../reference/islands.md#props-are-untrusted)
covers the exact contract. It's the one place safety is the component author's job rather than the
engine's.
